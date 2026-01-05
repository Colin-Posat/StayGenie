import { Request, Response } from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// City validation and correction mapping

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

const validateAndCorrectCity = (parsed: any) => {
  const cityCorrections: { [key: string]: { city: string, country?: string } } = {
    // National Parks → Gateway Cities
    "Yosemite": { city: "Oakhurst", country: "US" },
    "Yosemite National Park": { city: "Mariposa", country: "US" }, 
    "Grand Canyon": { city: "Flagstaff", country: "US" },
    "Yellowstone": { city: "West Yellowstone", country: "US" },
    "Zion": { city: "Springdale", country: "US" },
    "Bryce Canyon": { city: "Bryce", country: "US" },
    "Joshua Tree": { city: "Palm Springs", country: "US" },
    "Death Valley": { city: "Las Vegas", country: "US" },
    "Glacier National Park": { city: "Kalispell", country: "US" },
    "Arches": { city: "Moab", country: "US" },
    "Sequoia": { city: "Visalia", country: "US" },
    
    // Regions → Major Cities
    "Swiss Alps": { city: "Zermatt", country: "CH" },
    "French Alps": { city: "Chamonix", country: "FR" },
    "Austrian Alps": { city: "Innsbruck", country: "AT" },
    "French Riviera": { city: "Nice", country: "FR" },
    "Tuscany": { city: "Florence", country: "IT" },
    "Napa Valley": { city: "Napa", country: "US" },
    "Scottish Highlands": { city: "Inverness", country: "GB" },
    "Cotswolds": { city: "Bath", country: "GB" },
    "Provence": { city: "Avignon", country: "FR" },
    "Andalusia": { city: "Seville", country: "ES" },
    "Catalonia": { city: "Barcelona", country: "ES" },
    
    // Fix common city name issues
    "New York City": { city: "New York" },
    "NYC": { city: "New York", country: "US" },
    "LA": { city: "Los Angeles", country: "US" },
    "SF": { city: "San Francisco", country: "US" },
    "Vegas": { city: "Las Vegas", country: "US" },
    "Miami Beach": { city: "Miami", country: "US" },
    "South Beach": { city: "Miami", country: "US" },
    
    // Ski destinations
    "Alps": { city: "Chamonix", country: "FR" },
    "Japanese Alps": { city: "Takayama", country: "JP" },
    "Rocky Mountains": { city: "Denver", country: "US" },
    "Rockies": { city: "Denver", country: "US" },
    "Andes": { city: "Cusco", country: "PE" },
    
    // Beach regions
    "Hawaiian Islands": { city: "Honolulu", country: "US" },
    "Greek Islands": { city: "Santorini", country: "GR" },
    "Caribbean": { city: "Nassau", country: "BS" },
    "Maldives": { city: "Male", country: "MV" },
    "Seychelles": { city: "Victoria", country: "SC" },
    
    // Desert regions
    "Sahara": { city: "Marrakech", country: "MA" },
    "Atacama": { city: "San Pedro de Atacama", country: "CL" },
    "Gobi": { city: "Ulaanbaatar", country: "MN" },
    
    // Wine regions
    "Bordeaux Region": { city: "Bordeaux", country: "FR" },
    "Champagne Region": { city: "Reims", country: "FR" },
    "Rioja": { city: "Logroño", country: "ES" },
    "Douro Valley": { city: "Porto", country: "PT" }
  };
  
  // Check if city needs correction
  const correction = cityCorrections[parsed.cityName];
  if (correction) {
    console.log(`🔄 Correcting city: ${parsed.cityName} → ${correction.city}`);
    parsed.cityName = correction.city;
    
    // Update country code if provided in correction
    if (correction.country) {
      parsed.countryCode = correction.country;
    }
  }
  
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
  "countryCode": "ISO-2 country code",
  "cityName": "Full city name",
  "language": "ISO 639-1 code, default 'en'",
  "adults": number (default 2),
  "children": number (default 0),
  "minCost": number or null (USD/night),
  "maxCost": number or null (USD/night),
  "cheap": boolean (true if user wants budget/cheap options, false otherwise),
  "findCheapestOnes": boolean (true ONLY if query is purely about finding cheapest options with no other criteria),
  "facilityCategories": ["CATEGORY_NAME"] (array of detected facility categories from list below, empty array if none mentioned),

  "starRating": number or null (specific star rating 1-5 if mentioned),
  "aiSearch": "All other preferences, descriptors, trip purpose, vibe, hotel style, etc."
}

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
- "Easter" → 2025-04-20 (calculate based on year)
- "Thanksgiving" → 2025-11-27 (4th Thursday of November)
- "Memorial Day weekend" → 2025-05-24
- "Labor Day weekend" → 2025-09-01
- "4th of July" → 2025-07-04

**4. Month/Season References:**
- "in March" → First reasonable date in March (if current date < March 1, use current year, else next year)
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

**7. Range Parsing:**
- "March 15-18" → checkin: 2025-03-15, checkout: 2025-03-18
- "March 15 to March 20" → checkin: 2025-03-15, checkout: 2025-03-20
- "weekend of March 15" → checkin: 2025-03-15, checkout: 2025-03-17

**8. Special Cases:**
- "ASAP" or "as soon as possible" → tomorrow
- "flexible dates" → use defaults but note flexibility in aiSearch
- "end of month" → last day of current/next month
- "beginning of month" → 1st-3rd of current/next month

**CRITICAL DATE VALIDATION:**
- ALL dates must be in the future (>= tomorrow: ${new Date(today.getTime() + 86400000).toISOString().split('T')[0]})
- Checkout MUST be after checkin
- If parsed dates are invalid/in past, fall back to defaults
- Maximum reasonable stay: 30 days (adjust if longer)

 **City Selection Rules**
1. Use user-provided city if available.
2. If only a country/region is mentioned, infer a city that best fits the user's theme (e.g., mountains, food, beaches).
   - Example: "ski in Japan" → Niseko, not Tokyo.
3. Avoid regions (e.g., "Swiss Alps") — pick a bookable city/town (e.g., Zermatt).
4. Capital/largest cities only if no preference/hint is given.
5. assume san josse california, not costa rica

**CRITICAL CITY SELECTION RULES:**
1. ALWAYS choose cities with established hotel infrastructure - major cities, tourist destinations, or significant towns.
2. NEVER choose: National parks, wilderness areas, small villages, or regions without hotels.
3. For tourist destinations, choose the nearest major gateway city with hotels:
   - Mountain/nature trips → nearest resort town or gateway city
   - Beach destinations → major coastal city
   - Cultural trips → major tourist city
   - Business trips → major business center
4. NEVER use "New York City" - always use "New York"
5. Choose bookable cities that hotel booking sites would recognize

**INTELLIGENT CITY SELECTION BASED ON SEARCH REQUIREMENTS:**

When user mentions only a country/region without a specific city, analyze their aiSearch requirements and choose the city that best matches their needs:

**General Matching Rules:**
1. **Beach/Ocean/Resort/Tropical** keywords → Choose the country's premier beach destination, NOT the capital
2. **Mountain/Ski/Alpine/Hiking** keywords → Choose mountain resort towns over major cities  
3. **Cultural/Historic/Art/Museums** keywords → Choose cultural capitals or historic cities
4. **Business/Conference/Work** keywords → Choose major business centers
5. **Party/Nightlife/Entertainment** keywords → Choose entertainment districts
6. **Budget/Backpacker/Cheap** keywords → Choose budget-friendly tourist hubs
7. **Luxury/Romantic/Honeymoon** keywords → Choose upscale resort destinations
8. **Adventure/Outdoor/Nature** keywords → Choose adventure sports centers

**Priority Order for City Selection:**
1. If aiSearch contains specific activity keywords, match to that activity's best city
2. If multiple activities mentioned, prioritize the most specific/unique one
3. If no clear activity, choose the country's main tourist destination (often NOT the capital)
4. Only choose capital cities for business travel or when no tourist context exists

**Examples of Smart Selection:**
- "Maldives + beach/resort/romantic" → "Maafushi" (premier tourist island, NOT Male)
- "Switzerland + ski/mountain" → "Zermatt" (NOT Bern)
- "Japan + cultural/temples" → "Kyoto" (NOT Tokyo for cultural trips)
- "Thailand + beach" → "Phuket" (NOT Bangkok)
- "France + wine" → "Bordeaux" (NOT Paris)
- "Nepal + trekking" → "Pokhara" (NOT Kathmandu)
- "Costa Rica + adventure" → "Manuel Antonio" (NOT San Jose)


**HOTEL-FRIENDLY CITY EXAMPLES:**
- Mountain: Zermatt, Aspen, Banff, Chamonix, Interlaken
- Beach: Miami, Barcelona, Nice, Cancun, Santorini  
- Cultural: Paris, Rome, Kyoto, Istanbul, Florence
- Adventure: Queenstown, Reykjavik, Cusco, Cape Town
- Business: London, Singapore, Dubai, Frankfurt, Tokyo

**SPECIAL CITY ROUTING RULES:**
- "Bali" → Use "Ubud" (cultural/wellness hub with best hotel options)
- "Monaco" → Use "Monte Carlo" (main hotel district)
- Always prefer the specific district/area with the best hotel infrastructure over the general region/country name

**BUDGET/CHEAP DETECTION:**
Set "cheap": true if the user mentions any of these budget-related terms:
- "cheap", "cheapest", "budget", "affordable", "inexpensive", "low cost", "save money", "tight budget", "on a dime", "bargain", "economical", "frugal"

**Star Rating Detection:**
Set "starRating" to the specific number (1-5) if user mentions:
- "5 star hotel", "five star", "5-star"
- "4 star", "four star", "4-star"  
- "3 star", "three star", "3-star"
- "2 star", "two star", "2-star"
- "1 star", "one star", "1-star"
- Written numbers: "five-star luxury" → 5
- If user says "at least 4 star" → set starRating: 4 and add "minimum 4 stars" to aiSearch

**PRICING RULES:**
- Only set explicit minCost/maxCost if user gives specific dollar amounts
- Examples:
  - "under $100" → maxCost: 100
  - "$50 to $150" → minCost: 50, maxCost: 150  
  - "around $200" → minCost: 180, maxCost: 220
  - "cheap hotels" → cheap: true, but leave minCost/maxCost as null

**FindCheapestOnes Rules:**
Set to true ONLY if:
- Query contains "cheapest" AND
- No other specific requirements (amenities, style, location preferences beyond city)
- Pure price-focused search

{
"categories": {
"ACCESSIBILITY": "wheelchair/handrails/roll-in/visual/braille/single-level, etc.",
"INTERNET_TECH": "WiFi, wired internet, business center, computer station",
"PARKING_TRANSPORT": "parking, garage, shuttles (airport/train/theme/cruise), transfers, EV",
"FOOD_DRINK": "restaurant(s), breakfast, bar(s), coffee shop, snack bar, room breakfast, wine/champagne",
"WELLNESS_SPA": "spa, massage, sauna, hammam, steam room, beauty, salon, yoga/fitness classes",
"POOL_WATER_AREAS": "pools, hot tubs, pool bars, cabanas, slides, infinity/saltwater/rooftop pools",
"BEACH_WATERFRONT": "beachfront, private beach, beach clubs, loungers/umbrellas, snorkeling/diving, beach shuttles",
"GYM_HEALTH_CLUB": "gym/fitness/health club (the room/area; not classes)",
"FAMILY_KIDS": "kids club/buffet/meals/pool, playground, toys, baby gates, childcare",
"PETS": "pets allowed, bowls, baskets, grooming, litter box",
"ADVENTURE_OUTDOOR_SPORTS": "hiking/cycling/horse riding/climbing/rafting/sailing/kayak, zipline, safari, game drives, golf, tennis, squash, basketball, table tennis, bowling, billiards, darts, archery, aerobics (as activities, not classes branding)",
"WINTER_SPORTS": "ski/snowboard/snowmobile/snowshoe/sledding, ski-in/out, passes, storage, lessons, lift access",
"WATER_SPORTS": "scuba, snorkel, windsurf, water ski, paddleboard/boats/marina/parasail, lazy river",
"ENTERTAINMENT_NIGHTLIFE": "nightclub/DJ, live music, comedy, bingo, pub crawls, movie nights, casino/gaming/pachinko/sportsbook",
"MEETINGS_EVENTS": "meeting rooms, conference space/center, banquet hall, ballroom, reception hall, wedding services",
"HOUSE_SERVICES_FRONT_DESK": "24h front desk, concierge, express check-in/out, luggage, housekeeping, laundry, dry cleaning, valet",
"SUSTAINABILITY_ECO": "composting, recycling, no plastic, renewable power, carbon offsets, local food/education, eco toiletries",
"SAFETY_SECURITY": "CCTV, smoke alarms, extinguishers, 24h security, first aid, health/COVID protocols",
"INROOM_PROPERTY_FEATURES": "garden/terrace/grills/fireplace/fire pit, rooms soundproof/allergy-free, heating/AC, room divider, floors (tile/hardwood/cobblestone), ATMs, shops, mini market, libraries, game room, clubhouse",
"TOURS_CULTURE": "guided tours (walking/bike/culture), art galleries, tastings, vineyard, winery, local expert"
},
"detectionExamples": {
"hotel with pool and gym": ["POOL_WATER_AREAS", "GYM_HEALTH_CLUB"],
"spa resort with great restaurants": ["WELLNESS_SPA", "FOOD_DRINK"],
"family hotel with kids activities and rooftop views": ["FAMILY_KIDS", "INROOM_PROPERTY_FEATURES"],
"business hotel with meeting rooms": ["MEETINGS_EVENTS"],
"eco-friendly place with good breakfast": ["SUSTAINABILITY_ECO", "FOOD_DRINK"],
"just need a clean place to sleep": [],
"cheap hotel downtown": [],
"hotel with view of eiffel tower": [],
"wheelchair accessible with parking": ["ACCESSIBILITY", "PARKING_TRANSPORT"]
},
"rules": [
"Only include categories if user specifically mentions related amenities/facilities OR !something that implies the need for them!",
"Don't assume categories from location or trip type alone",
"Use exact category names from the list above",
"Return empty array if only location/price/rating mentioned without amenities"
]
}

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
    
    // Validate that minCost/maxCost are numbers or null
    if (parsed.minCost !== null && typeof parsed.minCost !== 'number') {
      parsed.minCost = null;
    }
    if (parsed.maxCost !== null && typeof parsed.maxCost !== 'number') {
      parsed.maxCost = null;
    }

    // Ensure cheap is boolean
    if (typeof parsed.cheap !== 'boolean') {
      parsed.cheap = false;
    }

    // Apply city corrections and validation
    parsed = validateAndCorrectCity(parsed);
    parsed = validateParsedData(parsed);

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
        countryCode: "US",
        cityName: "New York",
        language: "en",
        adults: 2,
        children: 0,
        minCost: null,
        maxCost: null,
        cheap: false,
        findCheapestOnes: false,
        highlyRated: false,
        starRating: null,
        aiSearch: "well-reviewed, good-value hotels",
        note: "Fallback response due to parsing error"
      });
    }
    
    res.status(500).json({ error: 'Failed to parse input into structured query.' });
  }
};