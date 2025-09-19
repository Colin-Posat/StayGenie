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

/**
 * Forces maxCost to $25 if the query contains "cheapest" keyword
 */
const applyCheapestPricing = (parsed: any, userInput: string) => {
  const lowerInput = userInput.toLowerCase();
  
  // Check if the input contains "cheapest" keyword
  if (lowerInput.includes('cheapest')) {
    console.log('🏷️ "Cheapest" keyword detected - setting maxCost to $25');
    parsed.maxCost = 25;
    
    // If minCost was set higher than 25, adjust it
    if (parsed.minCost !== null && parsed.minCost > 25) {
      parsed.minCost = null;
      console.log('🏷️ Removed minCost as it was higher than $25 limit');
    }
  }
  
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

  // NEW: force dates into the future while preserving trip length
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
  "findCheapestOnes": boolean (true ONLY if query is purely about finding cheapest options with no other criteria),
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

{
  "CityPricing": {
    "UltraExpensive": {
      "budget": { "maxCost": 200 },
      "affordable": { "maxCost": 400 },
      "midRange": { "minCost": 300, "maxCost": 600 },
      "luxury": { "minCost": 600 },
      "ultraLuxury": { "minCost": 1000 }
    },
    "VeryExpensive": {
      "budget": { "maxCost": 150 },
      "affordable": { "maxCost": 350 },
      "midRange": { "minCost": 250, "maxCost": 500 },
      "luxury": { "minCost": 500 },
      "ultraLuxury": { "minCost": 800 }
    },
    "Expensive": {
      "budget": { "maxCost": 120 },
      "affordable": { "maxCost": 300 },
      "midRange": { "minCost": 200, "maxCost": 400 },
      "luxury": { "minCost": 400 },
      "ultraLuxury": { "minCost": 600 }
    },
    "Moderate": {
      "budget": { "maxCost": 80 },
      "affordable": { "maxCost": 250 },
      "midRange": { "minCost": 150, "maxCost": 300 },
      "luxury": { "minCost": 300 },
      "ultraLuxury": { "minCost": 500 }
    },
    "BudgetFriendly": {
      "budget": { "maxCost": 60 },
      "affordable": { "maxCost": 180 },
      "midRange": { "minCost": 100, "maxCost": 220 },
      "luxury": { "minCost": 220 },
      "ultraLuxury": { "minCost": 400 }
    }
  },
  "ExplicitPriceParsing": {
    "range": "$X to $Y → { minCost: X, maxCost: Y }",
    "under": "under $X → { maxCost: X }",
    "over": "over/at least $X → { minCost: X }",
    "around": "around $X → { minCost: X-20, maxCost: X+20 }"
  },
  "SpecialCases": {
    "cheapestPossible": "use lowest maxCost for city tier",
    "moneyNoObject": "minCost = top tier",
    "splurge": "minCost = luxury tier",
    "honeymoon": "minCost = luxury tier"
  },
  "FindCheapestOnes": {
    "rule": "true if query has 'cheapest' + city only (no amenities/features/quality/location extras)"
  },
  "IfNoBudget": { "minCost": null, "maxCost": null },
  "aiSearch": {
    "include": ["purpose", "vibe", "style", "budgetContext"],
    "infer": { "honeymoon": "romantic luxury", "business": "reliable mid-range", "family": "family-friendly" },
    "default": "well-reviewed, good-value hotels"
  },
  "Examples": {
    "Cheapest hotels in Tokyo": { "maxCost": 150 },
    "Cheapest hotels in Bangkok": { "maxCost": 80 },
    "Budget hotels in Monaco": { "maxCost": 200 },
    "Luxury hotels in Prague": { "minCost": 300 },
    "Luxury hotels in New York": { "minCost": 500 },
    "Paris hotels under $200": { "maxCost": 200 }
  }
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

    // Apply city corrections and validation
    parsed = validateAndCorrectCity(parsed);
    parsed = validateParsedData(parsed);
    
    // NEW: Apply cheapest pricing override
    parsed = applyCheapestPricing(parsed, userInput);

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
        aiSearch: "well-reviewed, good-value hotels",
        note: "Fallback response due to parsing error"
      });
    }
    
    res.status(500).json({ error: 'Failed to parse input into structured query.' });
  }
};