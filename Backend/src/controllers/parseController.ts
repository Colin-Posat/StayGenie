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

    const countrycodes = detectCountryCode(placeName);

    // ===== STEP 1: Structured city search =====
    if (placeName.includes(',')) {
      const parts = placeName.split(',').map(p => p.trim());
      const city = parts[0];
      const country = parts[parts.length - 1];

      console.log(`🏙️ Structured geocode attempt: city=${city}, country=${country}`);

      const structured = await axios.get(
        'https://us1.locationiq.com/v1/search.php',
        {
          params: {
            key: LOCATIONIQ_KEY,
            city,
            country,
            format: 'json',
            limit: 3,
            addressdetails: 1
          },
          timeout: 3000
        }
      );

      const validCity = structured.data?.find((r: any) =>
        r.address?.city || r.address?.town || r.address?.village
      );

      if (validCity) {
        console.log(`✅ Structured city match: ${validCity.display_name}`);
        return {
          latitude: Number(validCity.lat),
          longitude: Number(validCity.lon),
          fullPlaceName: validCity.display_name
        };
      } else {
        console.warn('⚠️ Structured search failed, falling back to text search');
      }
    }

    // ===== STEP 2: Text search fallback =====
    const response = await axios.get(
      'https://us1.locationiq.com/v1/search.php',
      {
        params: {
          key: LOCATIONIQ_KEY,
          q: placeName,
          format: 'json',
          limit: 5,
          addressdetails: 1,
          countrycodes
        },
        timeout: 3000
      }
    );

    const results = response.data;

    if (!Array.isArray(results) || results.length === 0) {
      console.warn(`⚠️ No LocationIQ results for: ${placeName}`);
      return null;
    }

    // ===== STEP 3: Reject country-level results =====
    const best = results.find((r: any) =>
      r.address?.city || r.address?.town || r.address?.village || r.address?.suburb
    );

    if (!best) {
      console.error(`🚨 Only country-level results returned for: ${placeName}`);
      console.error(results.map((r: any) => r.display_name));
      return null;
    }

    console.log(`✅ LocationIQ resolved: ${best.display_name}`);

    return {
      latitude: Number(best.lat),
      longitude: Number(best.lon),
      fullPlaceName: best.display_name
    };

  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error(`❌ LocationIQ request failed:`, error.response?.data);
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
  "searchOriginName": string | null ,  // NEW - What to show user
  "locationMentioned": boolean,
  "specificPOI": string | null,        // NEW - clean POI name for display
  "searchRadius": number (in meters, minimum 5000, max 15000 (unless national park)),
  "language": "ISO 639-1 code, default 'en'",
  "adults": number (default 2),
  "children": number (default 0),
  "minCost": number | null,   // Minimum nightly price in USD if mentioned
  "maxCost": number | null,   // Maximum nightly price in USD if mentioned
  "aiSearch": "Complete search context string combining price preferences and specific requirements"
}

**CITY NAME EXTRACTION RULES**

- Only generate "cityName" if the user explicitly mentions a city
  OR a landmark/neighborhood that clearly belongs to a well-known city.

Examples where cityName SHOULD be generated:
✅ "hotels in Paris" → cityName: "Paris"
✅ "near Times Square" → cityName: "New York"
✅ "near Eiffel Tower" → cityName: "Paris"
✅ "in Shibuya" → cityName: "Tokyo"

Examples where cityName MUST be null:
❌ "cool beach hotels"
❌ "random hotel"

Rules:
- cityName must be ONLY the city (no state, no country, no region).
- Never guess or infer a city unless it is clearly implied by the user input.
- If uncertain, set cityName = null.

**SEARCH ORIGIN NAME & POI DETECTION:**

Extract:
1. searchOriginName - SHORT display name (2-4 words)
2. locationMentioned - TRUE only for POIs (landmarks/attractions)
3. specificPOI - CLEAN display name if POI mentioned, otherwise null  // NEW

**POI = Famous landmark, attraction, or iconic place**

✅ POIs (locationMentioned: TRUE):
- Landmarks: Eiffel Tower, Statue of Liberty, Big Ben
- Parks: Central Park, Hyde Park
- Monuments: Arc de Triomphe, Lincoln Memorial
- Buildings: Burj Khalifa, Empire State Building, Sagrada Familia
- Squares: Times Square, Trafalgar Square
- Bridges: Golden Gate Bridge, Brooklyn Bridge
- Museums: Louvre, British Museum
- Attractions: Disneyland, Colosseum

❌ NOT POIs (locationMentioned: FALSE):
- Cities: Paris, Tokyo, New York
- Neighborhoods: SoHo, Shibuya, Brooklyn
- Districts: Downtown, Midtown
- Generic areas: beach, city center, waterfront

**Examples:**
✅ "hotels near Eiffel Tower" 
   → searchOriginName: "Eiffel Tower"
   → locationMentioned: true
   → specificPOI: "Eiffel Tower"

✅ "near Central Park" 
   → searchOriginName: "Central Park"
   → locationMentioned: true
   → specificPOI: "Central Park"

❌ "hotels in Paris" 
   → searchOriginName: "Paris"
   → locationMentioned: false
   → specificPOI: null

❌ "hotels in Barcelona"
   → searchOriginName: "Barcelona"
   → locationMentioned: false
   → specificPOI: null

❌ "paris city center"
   → searchOriginName: "Paris City Center"
   → locationMentioned: false
   → specificPOI: null

**CRITICAL PLACE EXTRACTION RULES:**

**GEOGRAPHIC DISAMBIGUATION - ALWAYS INCLUDE COUNTRY FOR MAJOR CITIES:**
- "Paris" → "Paris, Île-de-France, France" (NOT "Paris, Texas")
- "London" → "London, Greater London, United Kingdom" (NOT "London, Ontario")
- "Barcelona" → "Barcelona, Catalonia, Spain"
- "Rome" → "Rome, Lazio, Italy"
- "Tokyo" → "Tokyo, Japan"
- "Dubai" → "Dubai, United Arab Emirates"
- "Singapore" → "Singapore"
- "city center" or "downtown" → Use the internationally famous city by default
- Example: "Paris city center" → "Paris City Center, Paris, Île-de-France, France"

**ALWAYS PRIORITIZE THE MOST SPECIFIC LOCATION MENTIONED!**

1. **Specific Landmark/POI (HIGHEST PRIORITY):**
   - "hotels near Eiffel Tower" → specificPlace: "Eiffel Tower, Paris, France"
   - "hotels with Central Park views" → specificPlace: "Central Park, New York, New York, United States"
   - "hotels near Times Square" → specificPlace: "Times Square, New York, New York, United States"
   - "hotels by Sagrada Familia" → specificPlace: "Sagrada Familia, Barcelona, Catalonia, Spain"
   - "hotels near Golden Gate Bridge" → specificPlace: "Golden Gate Bridge, San Francisco, California, United States"
   - "hotels with view of Burj Khalifa" → specificPlace: "Burj Khalifa, Dubai, United Arab Emirates"
   - ALWAYS use the landmark name first, then city/country

2. **Specific Neighborhood/District:**
   - "hotels in South Beach Miami" → specificPlace: "South Beach, Miami, Florida, United States"
   - "hotels in La Rambla Barcelona" → specificPlace: "La Rambla, Barcelona, Catalonia, Spain"
   - "hotels in Shibuya Tokyo" → specificPlace: "Shibuya, Tokyo, Japan"
   - "hotels in SoHo New York" → specificPlace: "SoHo, Manhattan, New York, United States"
   - "hotels in Montmartre" → specificPlace: "Montmartre, Paris, France"

3. **Specific Street/Area:**
   - "hotels on Fifth Avenue" → specificPlace: "Fifth Avenue, New York, New York, United States"
   - "hotels on Las Vegas Strip" → specificPlace: "Las Vegas Strip, Las Vegas, Nevada, United States"
   - "hotels on Ocean Drive Miami" → specificPlace: "Ocean Drive, Miami Beach, Florida, United States"

4. **City Only (ONLY if no specific area mentioned) - ALWAYS INCLUDE COUNTRY:**
   - "hotels in Paris" → specificPlace: "Paris, Île-de-France, France"
   - "hotels in New York" → specificPlace: "New York, New York, United States"
   - "hotels in Tokyo" → specificPlace: "Tokyo, Japan"
   - "hotels in London" → specificPlace: "London, Greater London, United Kingdom"
   - "hotels in Barcelona" → specificPlace: "Barcelona, Catalonia, Spain"
   - "hotels in Rome" → specificPlace: "Rome, Lazio, Italy"
   - "hotels in Dubai" → specificPlace: "Dubai, United Arab Emirates"
   
**SPECIAL RULE - Generic "City Center" / "Downtown":**
   - "paris city center" → specificPlace: "Paris, Île-de-France, France" (NOT "Paris City Center")
   - "london city centre" → specificPlace: "London, Greater London, United Kingdom"
   - "downtown tokyo" → specificPlace: "Tokyo, Japan"
   - "barcelona city center" → specificPlace: "Barcelona, Catalonia, Spain"
   - "new york downtown" → specificPlace: "New York, New York, United States"
   - When user says "[city] + city center/downtown", treat it as just the city
   - Do NOT add "City Center" or "Downtown" to specificPlace

5. **Country/Vague (LAST RESORT):**
   - "cool hotels in USA" → specificPlace: "Manhattan, New York, New York, United States" (pick iconic place)
   - "hotels in Japan" → specificPlace: "Shibuya, Tokyo, Japan" (pick popular district)
   - "beach hotels" → specificPlace: "Miami Beach, Florida, United States" (pick popular beach)

**CRITICAL RULES:**
- NEVER default to just city name when a specific landmark is mentioned!
- ALWAYS include country name for international cities to avoid US geocoding errors
- The geocoding API will use country name to bias results correctly
- Format: [Most Specific Place], [City], [State/Region if applicable], [Country]
- If the specific place is truly unknown/random, THEN fall back to next most specific level

**EXAMPLES OF CORRECT BEHAVIOR:**
✅ "Eiffel Tower views" → "Eiffel Tower, Paris, France" (NOT just "Paris, France")
✅ "near Central Park" → "Central Park, New York, New York, United States" (NOT just "New York")
✅ "La Rambla Barcelona" → "La Rambla, Barcelona, Catalonia, Spain" (NOT just "Barcelona")
✅ "Times Square hotels" → "Times Square, New York, New York, United States"
✅ "South Beach" → "South Beach, Miami, Florida, United States"
✅ "Paris city center" → "Paris City Center, Paris, Île-de-France, France"
✅ "downtown London" → "London City Centre, London, Greater London, United Kingdom"

**WRONG BEHAVIOR TO AVOID:**
❌ "Eiffel Tower" → "Paris, France" (TOO GENERIC!)
❌ "Central Park" → "New York, United States" (TOO GENERIC!)
❌ "La Rambla" → "Barcelona, Spain" (TOO GENERIC!)
❌ "Paris" → "Paris, Texas" (WRONG COUNTRY!)

**SEARCH RADIUS RULES (in meters, MINIMUM 5000):**

1. **National Parks & Remote Locations:** 30000 meters (SPECIAL CASE)
   - "Yellowstone National Park" → 30000
   - "Grand Canyon" → 30000
   - "Yosemite" → 30000
   - "Zion National Park" → 30000
   - "Rocky Mountain National Park" → 30000
   - "Banff National Park" → 30000
   - "Joshua Tree" → 30000
   - "Sedona" → 30000
   - "Monument Valley" → 30000
   - Any location clearly without hotels in immediate vicinity

2. **Specific Landmark/POI:** 5000-12000 meters
   - "near Central Park" → 8000
   - "near Eiffel Tower" → 6000
   - "by Times Square" → 8000
   - "near Sagrada Familia" → 6000
   - "by Golden Gate Bridge" → 8000

3. **Specific Neighborhood/Beach:** 10000-15000 meters
   - "in South Beach" → 12000
   - "in Shibuya" → 12000
   - "La Rambla Barcelona" → 10000
   - "in SoHo" → 10000

4. **City District:** 15000 meters
   - "Manhattan hotels" → 15000
   - "hotels in Brooklyn" → 15000
   - "downtown Miami" → 15000

5. **Entire City:** 15000 meters
   - "hotels in New York" → 15000
   - "hotels in Paris" → 15000
   - "hotels in Tokyo" → 15000
   - "hotels in Barcelona" → 15000

6. **Large Metro Area:** 30000 meters
   - "hotels in Los Angeles area" → 30000
   - "hotels in greater London" → 30000
   - "hotels in Bay Area" → 30000

7. **Vague/Country-level:** 30000-50000 meters (use popular area)
   - "cool hotels in USA" → 30000 (around picked location)
   - "beach hotels" → 25000
   - "hotels in Europe" → 30000

**AI SEARCH STRING CONSTRUCTION:**

Build a single comprehensive string that includes ALL user requirements:

1. **Price Context (if mentioned):**
   - User says "cheap" → Include "cheap hotels"
   - User says "under $200" → Include "hotels under $200 per night"
   - User says "luxury" or "over $400" → Include "luxury hotels over $400 per night"
   - User says "budget" → Include "budget-friendly hotels"

2. **Location Context (ALWAYS INCLUDE if specific location mentioned):**
   - User says "near Central Park" → Include "near Central Park"
   - User says "by Times Square" → Include "by Times Square"
   - User says "in South Beach" → Include "in South Beach"
   - User says "La Rambla Barcelona" → Include "on La Rambla"
   - If only city mentioned, don't add location to aiSearch

3. **Specific Requirements (if mentioned):**
   - Add ANY specific features: "rooftop bar", "infinity pool", "spa", "gym", "ocean view"
   - Add vibes: "romantic", "family-friendly", "business", "party", "quiet"
   - Add styles: "modern", "boutique", "historic", "minimalist", "luxury"

4. **Combine Everything Naturally:**
   - Merge all elements into one natural sentence
   - Keep it concise but include all key requirements
   
**EXAMPLES:**

Input: "cheap hotels near Times Square with rooftop bar"
→ aiSearch: "cheap hotels near Times Square with rooftop bar"

Input: "hotels by central park under 200"
→ aiSearch: "hotels near Central Park under $200 per night"

Input: "luxury hotel in Paris under $500 with spa"
→ aiSearch: "luxury hotels under $500 per night with spa"
(Note: "in Paris" is just the city, so not included since it's already in specificPlace)

Input: "romantic hotels in Santorini with infinity pool"
→ aiSearch: "romantic hotels with infinity pool"
(Note: "in Santorini" is just the city)

Input: "find me hotels near Eiffel Tower"
→ aiSearch: "hotels near Eiffel Tower"

Input: "cool boutique hotel in Tokyo near Shibuya Crossing"
→ aiSearch: "cool boutique hotels near Shibuya Crossing"

Input: "beach hotels with pool"
→ aiSearch: "beach hotels with pool"

Input: "hotels over $300 with gym and business center near Wall Street"
→ aiSearch: "hotels over $300 per night with gym and business center near Wall Street"

**COMPREHENSIVE DATE PARSING RULES:**

**1. Explicit Dates (HIGHEST PRIORITY):**
- "March 15" → 2025-03-15 (assume current year if not specified)
- "March 15, 2025" → 2025-03-15
- "3/15" or "3/15/25" → 2025-03-15
- "15th March" → 2025-03-15
- "Mar 15" → 2025-03-15
- If year not specified, use ${currentYear} if month >= ${currentMonth}, otherwise use ${currentYear + 1}

**2. Relative Date References:**
- "tomorrow" → ${new Date(today.getTime() + 86400000).toISOString().split('T')[0]}
- "next week" → ${new Date(today.getTime() + 7*86400000).toISOString().split('T')[0]}
- "next month" → ${new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()).toISOString().split('T')[0]}
- "in 2 weeks" → ${new Date(today.getTime() + 14*86400000).toISOString().split('T')[0]}
- "in 3 days" → ${new Date(today.getTime() + 3*86400000).toISOString().split('T')[0]}

**3. Seasonal/Holiday References:**
- "Christmas" → 2025-12-25
- "New Year's" → 2025-12-31 (or 2026-01-01 if after December)
- "Valentine's Day" → 2026-02-14 (if current date is after Feb 14, 2025)
- "Easter" → 2025-04-20
- "Thanksgiving" → 2025-11-27
- "Memorial Day weekend" → 2025-05-24
- "Labor Day weekend" → 2025-09-01
- "4th of July" → 2025-07-04

**4. Month/Season References:**
- "in March" → First reasonable date in March
- "spring" → March 20 of appropriate year
- "summer" → June 21 of appropriate year
- "fall/autumn" → September 22 of appropriate year
- "winter" → December 21 of appropriate year

**5. Day of Week References:**
- "this Friday" → Next upcoming Friday
- "next Tuesday" → Tuesday of next week
- "weekend" → Next upcoming Saturday

**6. Duration Parsing for Checkout:**
- If only check-in specified:
  - "3 nights" → checkout = checkin + 3 days
  - "1 week" → checkout = checkin + 7 days
  - "2 weeks" → checkout = checkin + 14 days
  - "long weekend" → checkout = checkin + 3 days
  - No duration specified → checkout = checkin + 3 days (default)

**CRITICAL DATE VALIDATION:**
- ALL dates must be in the future (>= tomorrow: ${new Date(today.getTime() + 86400000).toISOString().split('T')[0]})
- Checkout MUST be after checkin
- If parsed dates are invalid/in past, fall back to defaults
- Maximum reasonable stay: 30 days

IMPORTANT:
If the user mentions a CITY (explicitly or implicitly via a landmark),
you MUST include the city name in the aiSearch string — even if it already exists in specificPlace.

Examples:
- "hotels near Times Square" → "hotels near Times Square in New York"
- "luxury hotel near Eiffel Tower" → "luxury hotels near Eiffel Tower in Paris"
- "cheap hotels in Tokyo" → "cheap hotels in Tokyo"


**OUTPUT VALIDATION RULES**

- "cityName" must always exist in the JSON output.
- If no city is clearly specified, output: "cityName": null
- Do NOT omit the field.
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

    // --- City normalization rules ---
    if (parsed.cityName?.toLowerCase() === 'miami') {
      console.log('🌴 Normalizing cityName: Miami → Miami Beach');

      parsed.cityName = 'Miami Beach';

      // Optional: also normalize specificPlace if it only says Miami
      if (
        typeof parsed.specificPlace === 'string' &&
        parsed.specificPlace.toLowerCase().includes('miami') &&
        !parsed.specificPlace.toLowerCase().includes('miami beach')
      ) {
        parsed.specificPlace = parsed.specificPlace.replace(/miami/gi, 'Miami Beach');
      }

      // Optional: ensure aiSearch reflects Miami Beach
      if (typeof parsed.aiSearch === 'string' && parsed.aiSearch.toLowerCase().includes('miami')) {
        parsed.aiSearch = parsed.aiSearch.replace(/miami/gi, 'Miami Beach');
      }
    }

    // Ensure price fields always exist
    if (typeof parsed.minCost !== 'number') parsed.minCost = null;
    if (typeof parsed.maxCost !== 'number') parsed.maxCost = null;


    // Geocode the specific place ONLY if we have one
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
    } else {
      // No specific place provided, use defaults
      console.warn('⚠️ No specificPlace provided, using default location');
      parsed.specificPlace = "New York, New York, United States";
      parsed.latitude = 40.7128;
      parsed.longitude = -74.0060;
      parsed.fullPlaceName = "New York, New York, United States";
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
        latitude: 40.7589,
        longitude: -73.9851,
        fullPlaceName: "Manhattan, New York, United States",
        searchRadius: 20000,
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