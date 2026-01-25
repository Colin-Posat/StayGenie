import { Request, Response } from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiY29saW5wb3NhdCIsImEiOiJjbWN3bzN2azEwMnQxMmxwdmloZ2tjbHJlIn0.F9z35Dybj12dAsSpBnMZJA';

// --- Helpers for future-proofing dates ---
const addYears = (d: Date, years: number) => {
  const nd = new Date(d);
  nd.setFullYear(d.getFullYear() + years);
  return nd;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Ensures parsed.checkin / parsed.checkout are in the future.
 * If checkin < tomorrow, roll both forward by exactly one year,
 * preserving the original length-of-stay.
 */
const ensureFutureDates = (parsed: any) => {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  let checkinDate = new Date(parsed.checkin);
  let checkoutDate = new Date(parsed.checkout);

  // If checkin is before tomorrow, roll the pair forward one year
  if (checkinDate < tomorrow) {
    const stayNights = Math.max(
      1,
      Math.ceil((startOfDay(checkoutDate).getTime() - startOfDay(checkinDate).getTime()) / 86400000)
    );
    checkinDate = addYears(checkinDate, 1);
    checkoutDate = new Date(checkinDate);
    checkoutDate.setDate(checkinDate.getDate() + stayNights);
  }

  // Always enforce checkout > checkin
  if (checkoutDate <= checkinDate) {
    checkoutDate = new Date(checkinDate);
    checkoutDate.setDate(checkinDate.getDate() + 1);
  }

  // Max stay 30 nights
  const maxCheckout = new Date(checkinDate);
  maxCheckout.setDate(checkinDate.getDate() + 30);
  if (checkoutDate > maxCheckout) checkoutDate = maxCheckout;

  parsed.checkin = checkinDate.toISOString().split('T')[0];
  parsed.checkout = checkoutDate.toISOString().split('T')[0];
  return parsed;
};

const validateParsedData = (parsed: any) => {
  // Parse to dates
  let checkinDate = new Date(parsed.checkin);
  let checkoutDate = new Date(parsed.checkout);

  // Basic defaults if parsing failed
  if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
    const today = new Date();
    const fallbackIn = new Date(today);
    fallbackIn.setMonth(today.getMonth() + 1);
    const fallbackOut = new Date(fallbackIn);
    fallbackOut.setDate(fallbackIn.getDate() + 3);
    parsed.checkin = fallbackIn.toISOString().split('T')[0];
    parsed.checkout = fallbackOut.toISOString().split('T')[0];
  }

  // Force dates into the future while preserving trip length
  parsed = ensureFutureDates(parsed);

  // Re-parse after adjustments
  checkinDate = new Date(parsed.checkin);
  checkoutDate = new Date(parsed.checkout);

  // Guest count clamps
  if (parsed.adults < 1) parsed.adults = 1;
  if (parsed.children < 0) parsed.children = 0;
  if (parsed.adults > 10) parsed.adults = 10;
  if (parsed.children > 8) parsed.children = 8;

  // Price range clamps
  if (parsed.minCost !== null && parsed.minCost < 0) parsed.minCost = null;
  if (parsed.maxCost !== null && parsed.maxCost < 0) parsed.maxCost = null;
  if (parsed.minCost !== null && parsed.maxCost !== null && parsed.minCost > parsed.maxCost) {
    [parsed.minCost, parsed.maxCost] = [parsed.maxCost, parsed.minCost];
  }

  // Validate new rating fields
  if (typeof parsed.highlyRated !== 'boolean') {
    parsed.highlyRated = false;
  }
  if (parsed.starRating !== null && (typeof parsed.starRating !== 'number' || parsed.starRating < 1 || parsed.starRating > 5)) {
    parsed.starRating = null;
  }

  return parsed;
};

const LOCATIONIQ_KEY = 'pk.79c544ae745ee83f91a7523c99939210';


const isMiamiBeachIntent = (text: string) => {
  const t = text.toLowerCase();
  return (
    t.includes('miami beach') ||
    t.includes('south beach') ||
    t.includes('sobé') ||
    t.includes('sobe') ||
    t.includes('ocean drive') ||
    t.includes('south of fifth')
  );
};


// NEW: Helper function to detect country code from place name
const detectCountryCode = (placeName: string): string | undefined => {
  const place = placeName.toLowerCase();
  
  const countryMap: { [key: string]: string } = {
    'france': 'fr',
    'united kingdom': 'gb',
    'england': 'gb',
    'scotland': 'gb',
    'wales': 'gb',
    'northern ireland': 'gb',
    'spain': 'es',
    'italy': 'it',
    'germany': 'de',
    'netherlands': 'nl',
    'holland': 'nl',
    'belgium': 'be',
    'austria': 'at',
    'switzerland': 'ch',
    'portugal': 'pt',
    'greece': 'gr',
    'denmark': 'dk',
    'sweden': 'se',
    'norway': 'no',
    'finland': 'fi',
    'poland': 'pl',
    'czech republic': 'cz',
    'czechia': 'cz',
    'hungary': 'hu',
    'ireland': 'ie',
    'japan': 'jp',
    'china': 'cn',
    'south korea': 'kr',
    'korea': 'kr',
    'thailand': 'th',
    'vietnam': 'vn',
    'singapore': 'sg',
    'malaysia': 'my',
    'indonesia': 'id',
    'philippines': 'ph',
    'india': 'in',
    'united arab emirates': 'ae',
    'dubai': 'ae',
    'abu dhabi': 'ae',
    'qatar': 'qa',
    'saudi arabia': 'sa',
    'turkey': 'tr',
    'egypt': 'eg',
    'morocco': 'ma',
    'south africa': 'za',
    'united states': 'us',
    'usa': 'us',
    'america': 'us',
    'canada': 'ca',
    'mexico': 'mx',
    'brazil': 'br',
    'argentina': 'ar',
    'chile': 'cl',
    'australia': 'au',
    'new zealand': 'nz',
  };
  
  // Check for exact matches first (longer strings first to avoid partial matches)
  const sortedCountries = Object.keys(countryMap).sort((a, b) => b.length - a.length);
  
  for (const country of sortedCountries) {
    if (place.includes(country)) {
      console.log(`🌍 Detected country: ${country} → ${countryMap[country]}`);
      return countryMap[country];
    }
  }
  
  return undefined;
};

const geocodePlace = async (
  placeName: string
): Promise<{ latitude: number; longitude: number; fullPlaceName: string } | null> => {
  try {
    console.log(`🗺️ LocationIQ geocoding: ${placeName}`);

    // Detect country code from place name to bias geocoding results
    const countrycodes = detectCountryCode(placeName);
    
    if (countrycodes) {
      console.log(`✅ Using country bias: ${countrycodes.toUpperCase()}`);
    } else {
      console.log(`⚠️ No country detected, using default geocoding`);
    }

    const response = await axios.get(
      'https://us1.locationiq.com/v1/search.php',
      {
        params: {
          key: LOCATIONIQ_KEY,
          q: placeName,
          format: 'json',
          limit: 1,
          addressdetails: 1,
          countrycodes: countrycodes, // Bias results to detected country
        },
        timeout: 3000,
      }
    );

    const results = response.data;

    if (!Array.isArray(results) || results.length === 0) {
      console.warn(`⚠️ No LocationIQ results for: ${placeName}`);
      return null;
    }

    const best = results[0];

    const latitude = Number(best.lat);
    const longitude = Number(best.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      console.warn(`⚠️ Invalid coordinates returned for: ${placeName}`);
      return null;
    }

    // display_name is usually excellent (full human-readable place)
    const fullPlaceName =
      best.display_name ||
      `${best.name || placeName}`;

    console.log(`✅ LocationIQ resolved: ${fullPlaceName} (${latitude}, ${longitude})`);

    return {
      latitude,
      longitude,
      fullPlaceName,
    };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error(
        `❌ LocationIQ request failed (${error.response?.status}):`,
        error.response?.data
      );
    } else {
      console.error(`❌ LocationIQ unexpected error:`, error);
    }
    return null;
  }
};


export const parseSearchQuery = async (req: Request, res: Response) => {
  try {
    const { userInput } = req.body;

    
    if (!userInput) {
      return res.status(400).json({ error: 'userInput is required' });
    }

    console.log('🔍 Parsing user query:', userInput);
    const parseStartTime = Date.now();

    // Compute default check-in/check-out dates: one month from today, for 3 nights
    const today = new Date();
    const checkin = new Date(today);
    checkin.setMonth(checkin.getMonth() + 1);

    const checkout = new Date(checkin);
    checkout.setDate(checkin.getDate() + 3);

    const formattedToday = today.toISOString().split('T')[0];
    const formattedCheckin = checkin.toISOString().split('T')[0];
    const formattedCheckout = checkout.toISOString().split('T')[0];

    // Get current month and year for better date parsing
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentYear = today.getFullYear();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];

    const prompt = `
Today is ${formattedToday} (${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}). Current month: ${currentMonth}, Year: ${currentYear}.

You are a travel assistant converting user hotel search requests into structured JSON. Output only a valid JSON object with:

{
  "checkin": "YYYY-MM-DD",            // Default: ${formattedCheckin}
  "checkout": "YYYY-MM-DD",           // Default: ${formattedCheckout}
  "specificPlace": "Full specific place name with city and country for geocoding",
  "cityName": string | null,   
 "countryCode": string | null,       // NEW - ISO-2 country code (e.g., "BE", "FR", "US")
  "searchOriginName": string | null,  // What to show user
  "locationMentioned": boolean,
  "specificPOI": string | null,       // clean POI name for display
  "searchRadius": number (in meters, minimum 5000, max 15000 (unless national park)),
  "useCoordinateSearch": boolean,     // NEW - Whether to use coordinate-based search
  "language": "ISO 639-1 code, default 'en'",
  "adults": number (default 2),
  "children": number (default 0),
  "minCost": number | null,   // Minimum nightly price in USD if mentioned
  "maxCost": number | null,   // Maximum nightly price in USD if mentioned
  "aiSearch": "Complete search context string combining price preferences and specific requirements"
}

**COORDINATE SEARCH DECISION (useCoordinateSearch):**

Set "useCoordinateSearch": false when:
- User mentions ONLY a country (e.g., "hotels in France", "Japan hotels", "cool hotels in Spain")
- User mentions ONLY a city (e.g., "hotels in Paris", "Tokyo hotels", "Barcelona hotels")
- User mentions vague locations without specific place (e.g., "beach hotels", "mountain resort", "ski hotels")
- User mentions a country + vague descriptor (e.g., "beach hotels in Thailand", "cool hotels in Italy", "luxury hotels in France")

Set "useCoordinateSearch": true ONLY when:
- User mentions a specific landmark/POI (e.g., "near Eiffel Tower", "by Central Park", "near Sagrada Familia")
- User mentions a specific neighborhood (e.g., "hotels in Shibuya", "South Beach hotels", "hotels in Montmartre")
- User mentions a specific area/street (e.g., "Las Vegas Strip", "Fifth Avenue", "Ocean Drive")

CRITICAL: Just saying a city name like "Paris" or "Tokyo" is NOT specific enough - use city/country search!
ONLY use coordinate search when there's a MORE SPECIFIC location than just the city name.

**CITY SELECTION FOR COUNTRY-LEVEL SEARCHES:**

When useCoordinateSearch is FALSE (country-level, city-only, or vague search), you MUST intelligently choose a city that matches the user's preferences:

Examples of useCoordinateSearch: FALSE:
✅ "hotels in France" → specificPlace: "Paris, Île-de-France, France", cityName: "Paris", countryCode: "FR", useCoordinateSearch: false
✅ "beach hotels in Thailand" → specificPlace: "Phuket, Thailand", cityName: "Phuket", countryCode: "TH", useCoordinateSearch: false
✅ "luxury hotels in Japan" → specificPlace: "Tokyo, Japan", cityName: "Tokyo", countryCode: "JP", useCoordinateSearch: false
✅ "ski resorts in Switzerland" → specificPlace: "Zermatt, Valais, Switzerland", cityName: "Zermatt", countryCode: "CH", useCoordinateSearch: false
✅ "cool hotels in Italy" → specificPlace: "Rome, Lazio, Italy", cityName: "Rome", countryCode: "IT", useCoordinateSearch: false
✅ "beach hotels" → specificPlace: "Miami Beach, Florida, United States", cityName: "Miami Beach", countryCode: "US", useCoordinateSearch: false
✅ "mountain resorts" → specificPlace: "Aspen, Colorado, United States", cityName: "Aspen", countryCode: "US", useCoordinateSearch: false
✅ "hotels in Paris" → specificPlace: "Paris, Île-de-France, France", cityName: "Paris", countryCode: "FR", useCoordinateSearch: false
✅ "hotels in Tokyo" → specificPlace: "Tokyo, Japan", cityName: "Tokyo", countryCode: "JP", useCoordinateSearch: false
✅ "Barcelona hotels" → specificPlace: "Barcelona, Catalonia, Spain", cityName: "Barcelona", countryCode: "ES", useCoordinateSearch: false
City Selection Guidelines by Theme:
- Beach/tropical → Phuket (Thailand), Cancun (Mexico), Miami Beach (USA), Bali/Seminyak (Indonesia), Pattaya (Thailand)
- Luxury/upscale → Tokyo (Japan), Paris (France), Dubai (UAE), London (UK), Singapore (Singapore)
- Ski/mountain → Zermatt (Switzerland), Aspen (USA), Chamonix (France), Whistler (Canada), Innsbruck (Austria)
- Cultural/historic → Rome (Italy), Athens (Greece), Kyoto (Japan), Barcelona (Spain), Cairo (Egypt)
- Budget/backpacker → Bangkok (Thailand), Lisbon (Portugal), Prague (Czech Republic), Hanoi (Vietnam)
- Party/nightlife → Ibiza (Spain), Las Vegas (USA), Bangkok (Thailand), Miami (USA), Amsterdam (Netherlands)
- Family-friendly → Orlando (USA), Tokyo (Japan), Barcelona (Spain), Singapore (Singapore)
- Business/modern → Tokyo (Japan), Singapore (Singapore), Dubai (UAE), Seoul (South Korea)

**WHEN useCoordinateSearch is TRUE (ONLY specific locations MORE SPECIFIC than city):**

Examples of useCoordinateSearch: TRUE (POIs, neighborhoods, specific areas):

1. **Specific Landmark/POI:**
   ✅ "hotels near Eiffel Tower" → specificPlace: "Eiffel Tower, Paris, France", cityName: "Paris", useCoordinateSearch: true
   ✅ "hotels with Central Park views" → specificPlace: "Central Park, New York, New York, United States", cityName: "New York", useCoordinateSearch: true
   ✅ "near Times Square" → specificPlace: "Times Square, New York, New York, United States", cityName: "New York", useCoordinateSearch: true

2. **Specific Neighborhood/District:**
   ✅ "hotels in South Beach Miami" → specificPlace: "South Beach, Miami, Florida, United States", cityName: "Miami", useCoordinateSearch: true
   ✅ "hotels in Shibuya Tokyo" → specificPlace: "Shibuya, Tokyo, Japan", cityName: "Tokyo", useCoordinateSearch: true
   ✅ "hotels in Montmartre" → specificPlace: "Montmartre, Paris, France", cityName: "Paris", useCoordinateSearch: true

3. **Specific Street/Area:**
   ✅ "hotels on Las Vegas Strip" → specificPlace: "Las Vegas Strip, Las Vegas, Nevada, United States", cityName: "Las Vegas", useCoordinateSearch: true
   ✅ "hotels on Fifth Avenue" → specificPlace: "Fifth Avenue, New York, New York, United States", cityName: "New York", useCoordinateSearch: true

CRITICAL DISTINCTION:
❌ "hotels in Paris" → useCoordinateSearch: FALSE (just a city, not specific enough)
✅ "hotels near Eiffel Tower in Paris" → useCoordinateSearch: TRUE (specific POI within the city)

**CITY NAME EXTRACTION RULES**

- Only generate "cityName" if the user explicitly mentions a city
  OR a landmark/neighborhood that clearly belongs to a well-known city
  OR you intelligently selected a city for a country-level search.

Examples where cityName SHOULD be generated:
✅ "hotels in Paris" → cityName: "Paris"
✅ "near Times Square" → cityName: "New York"
✅ "near Eiffel Tower" → cityName: "Paris"
✅ "in Shibuya" → cityName: "Tokyo"
✅ "hotels in France" → cityName: "Paris" (intelligently selected)
✅ "beach hotels in Thailand" → cityName: "Phuket" (intelligently selected)

Examples where cityName MUST be null:
❌ "cool beach hotels" (if you can't confidently select a city)

Rules:
- cityName must be ONLY the city (no state, no country, no region).
- Never guess or infer a city unless it is clearly implied by the user input OR you're making an intelligent selection for country-level search.
- If uncertain, set cityName = null.

**SEARCH ORIGIN NAME & POI DETECTION:**

Extract:
1. searchOriginName - SHORT display name (2-4 words)
2. locationMentioned - TRUE only for POIs (landmarks/attractions)
3. specificPOI - CLEAN display name if POI mentioned, otherwise null

**POI = Famous landmark, attraction, or iconic place**

✅ POIs (locationMentioned: TRUE):
- Landmarks: Eiffel Tower, Statue of Liberty, Big Ben
- Parks: Central Park, Hyde Park
- Monuments: Arc de Triomphe, Lincoln Memorial
- Buildings: Burj Khalifa, Empire State Building, Sagrada Familia
- Squares: Times Square, Trafalgar Square

❌ NOT POIs (locationMentioned: FALSE):
- Cities: Paris, Tokyo, New York
- Countries: France, Thailand, Japan
- Vague locations: beach, mountains, countryside

**SEARCH RADIUS RULES (in meters, MINIMUM 5000):**

When useCoordinateSearch is TRUE:
1. **Specific Landmark/POI:** 5000-12000 meters
2. **Specific Neighborhood:** 10000-15000 meters
3. **City:** 15000 meters
4. **National Parks:** 30000 meters

When useCoordinateSearch is FALSE:
- Set searchRadius to 15000 (default, but it won't be used for actual search)

**AI SEARCH STRING CONSTRUCTION:**

Build a single comprehensive string that includes ALL user requirements:

1. **Price Context (if mentioned):**
   - User says "cheap" → Include "cheap hotels"
   - User says "under $200" → Include "hotels under $200 per night"

2. **Location Context (ALWAYS INCLUDE if specific location mentioned):**
   - User says "near Central Park" → Include "near Central Park"
   - If only city/country mentioned, don't add location to aiSearch

3. **Specific Requirements (if mentioned):**
   - Add ANY specific features: "rooftop bar", "infinity pool", "spa"
   - Add vibes: "romantic", "family-friendly", "business"
   - Add styles: "modern", "boutique", "historic"

**COMPREHENSIVE DATE PARSING RULES:**

**1. Explicit Dates (HIGHEST PRIORITY):**
- "March 15" → 2025-03-15 (assume current year if not specified)
- "March 15, 2025" → 2025-03-15
- If year not specified, use ${currentYear} if month >= ${currentMonth}, otherwise use ${currentYear + 1}

**2. Relative Date References:**
- "tomorrow" → ${new Date(today.getTime() + 86400000).toISOString().split('T')[0]}
- "next week" → ${new Date(today.getTime() + 7*86400000).toISOString().split('T')[0]}
- "next month" → ${new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()).toISOString().split('T')[0]}

**3. Duration Parsing for Checkout:**
- If only check-in specified:
  - "3 nights" → checkout = checkin + 3 days
  - "1 week" → checkout = checkin + 7 days
  - No duration specified → checkout = checkin + 3 days (default)

**OUTPUT VALIDATION RULES**

- "cityName" must always exist in the JSON output.
- "countryCode" must always exist in the JSON output.
- "useCoordinateSearch" must always be a boolean.
- If no city is clearly specified, output: "cityName": null
- If no country specified, output: "countryCode": null
- Do NOT omit these fields.
- Do NOT guess.

Output ONLY the JSON object - no explanations or extra text.

User input: "${userInput}"
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" }, 
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    console.log('🤖 OpenAI response:', content);

    // Parse the returned JSON
    let parsed = JSON.parse(content);
    
    // Validate parsed data
    parsed = validateParsedData(parsed);

    // Add after existing validations:
    if (typeof parsed.specificPOI !== 'string' && parsed.specificPOI !== null) {
      parsed.specificPOI = null;
    }

    // Validate new fields
    if (typeof parsed.useCoordinateSearch !== 'boolean') {
      // Default to true for backward compatibility
      parsed.useCoordinateSearch = true;
      console.log('⚠️ useCoordinateSearch not specified, defaulting to true');
    }

    if (typeof parsed.countryCode !== 'string' && parsed.countryCode !== null) {
      parsed.countryCode = null;
    }

    console.log(`🎯 Search mode: ${parsed.useCoordinateSearch ? 'COORDINATE-BASED' : 'CITY/COUNTRY-BASED'}`);
    if (!parsed.useCoordinateSearch) {
      console.log(`🏙️ Selected city: ${parsed.cityName} in ${parsed.countryCode}`);
    }

    // 🌴 Miami Beach override ONLY if user explicitly requested beach areas
    if (
      parsed.cityName?.toLowerCase() === 'miami' &&
      isMiamiBeachIntent(userInput)
    ) {
      console.log('🌴 Explicit Miami Beach intent detected from user input');

      parsed.cityName = 'Miami Beach';

      // Force specificPlace if not already Miami Beach
      if (
        typeof parsed.specificPlace !== 'string' ||
        !parsed.specificPlace.toLowerCase().includes('miami beach')
      ) {
        parsed.specificPlace = 'Miami Beach, Florida, United States';
      }

      // Ensure AI search reflects beach intent
      if (
        typeof parsed.aiSearch === 'string' &&
        !parsed.aiSearch.toLowerCase().includes('miami beach')
      ) {
        parsed.aiSearch += ' in Miami Beach';
      }
    }

    // Ensure price fields always exist
    if (typeof parsed.minCost !== 'number') parsed.minCost = null;
    if (typeof parsed.maxCost !== 'number') parsed.maxCost = null;

    // Geocode ONLY if using coordinate search
    if (parsed.useCoordinateSearch) {
      if (parsed.specificPlace && typeof parsed.specificPlace === 'string' && parsed.specificPlace.trim()) {
        const geocodeResult = await geocodePlace(parsed.specificPlace);
        
        if (geocodeResult) {
          parsed.latitude = geocodeResult.latitude;
          parsed.longitude = geocodeResult.longitude;
          parsed.fullPlaceName = geocodeResult.fullPlaceName;
        } else {
          console.warn('⚠️ Geocoding failed, falling back to defaults');
          // Fallback to New York City coordinates
          parsed.latitude = 40.7128;
          parsed.longitude = -74.0060;
          parsed.fullPlaceName = parsed.specificPlace || "New York, New York, United States";
        }
        
        // 🇲🇽 Hard override for Mexico City to avoid POI-biased geocoding
        if (parsed.cityName?.toLowerCase() === 'mexico city') {
          console.log('🇲🇽 Overriding coordinates for Mexico City metro centroid');
          parsed.latitude = 19.432608;
          parsed.longitude = -99.133209;
          parsed.fullPlaceName = "Mexico City, CDMX, Mexico";
        }
      } else {
        // No specific place provided, use defaults
        console.warn('⚠️ No specificPlace provided for coordinate search, using default location');
        parsed.specificPlace = "New York, New York, United States";
        parsed.latitude = 40.7128;
        parsed.longitude = -74.0060;
        parsed.fullPlaceName = "New York, New York, United States";
      }
    } else {
      // Country/city-based search - no coordinates needed
      console.log('🌍 Country/city-based search - skipping geocoding');
      parsed.latitude = null;
      parsed.longitude = null;
      parsed.fullPlaceName = parsed.specificPlace;
    }

    // Ensure searchRadius has minimum of 5000 meters
    const MIN_RADIUS = 5000;
    const MAX_RADIUS = 30000;

    // Enforce radius bounds
    if (!parsed.searchRadius || parsed.searchRadius < MIN_RADIUS) {
      parsed.searchRadius = MIN_RADIUS;
      console.log(`⚠️ Search radius below minimum, set to ${MIN_RADIUS} meters`);
    }

    if (parsed.searchRadius > MAX_RADIUS) {
      console.log(
        `⚠️ Search radius ${parsed.searchRadius} exceeds max, clamping to ${MAX_RADIUS} meters`
      );
      parsed.searchRadius = MAX_RADIUS;
    }

    // Ensure aiSearch exists
    if (!parsed.aiSearch || typeof parsed.aiSearch !== 'string') {
      parsed.aiSearch = 'hotels';
    }

    const parseTime = Date.now() - parseStartTime;
    console.log(`✅ Query parsed and validated in ${parseTime}ms:`, parsed);

    res.json(parsed);

  } catch (error) {
    console.error('❌ Error parsing user input:', error);
    
    // Provide fallback response for critical failures
    if (error instanceof SyntaxError) {
      console.error('JSON parsing failed, providing fallback');
      const today = new Date();
      const checkin = new Date(today);
      checkin.setMonth(checkin.getMonth() + 1);
      const checkout = new Date(checkin);
      checkout.setDate(checkin.getDate() + 3);
      
      return res.json({
        checkin: checkin.toISOString().split('T')[0],
        checkout: checkout.toISOString().split('T')[0],
        specificPlace: "Manhattan, New York, New York, United States",
        cityName: "Manhattan",
        countryCode: "US",
        latitude: 40.7589,
        longitude: -73.9851,
        fullPlaceName: "Manhattan, New York, United States",
        searchRadius: 20000,
        useCoordinateSearch: true,
        language: "en",
        adults: 2,
        children: 0,
        aiSearch: "hotels",
        note: "Fallback response due to parsing error"
      });
    }
    
    res.status(500).json({ error: 'Failed to parse input into structured query.' });
  }
};