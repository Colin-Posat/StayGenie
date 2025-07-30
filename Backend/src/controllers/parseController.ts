import { Request, Response } from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

    const prompt = `
Today is ${formattedToday}. You are a travel assistant that turns user requests into structured hotel search JSON.

Output a JSON object with the following fields:
{
  "checkin": "YYYY-MM-DD",
  "checkout": "YYYY-MM-DD", 
  "countryCode": "ISO-2 country code (e.g., FR for France, GB for UK, US for USA)",
  "cityName": "Full city name (e.g., Paris, London, New York)",
  "language": "ISO-639-1 language code (e.g., en, fr, es, de) - infer from location or default to 'en'",
  "adults": Number of adult guests (default to 2 if not specified),
  "children": Number of children (default to 0),
  "minCost": Minimum price per night in USD (null if not specified),
  "maxCost": Maximum price per night in USD (null if not specified),
  "aiSearch": "All other descriptive info including preferences, amenities, hotel type, style, etc. - INCLUDE budget descriptors like 'luxury', 'budget', 'mid-range', 'affordable', 'premium', etc."
}


### City Selection Rules  (⚠️ NEW – read carefully)
1. **If the user specifies a city → use it.**
2. **If the user names only a country or region, choose a city that best fits their stated preferences.**
   * Examples — *do **NOT** hard‑code these, they’re only guidance*:
     * “best views in Switzerland” → pick **Zermatt, Grindelwald, Lauterbrunnen, Interlaken** … not Zürich.
     * “ski trip in Japan” → pick **Niseko** or **Hakuba** … not Tokyo.
     * “best street food in Japan” → pick **Osaka** or **Fukuoka** … not Tokyo (unless user says “Tokyo”).
     * “beach resorts in Thailand” → pick **Phuket**, **Krabi**, or **Koh Samui** … not Bangkok.
     * “wine tasting in France” → pick **Bordeaux**, **Reims**, **Dijon**, etc. … not Paris (unless no wine context).
3. **Only default to the country’s largest / capital city if the user gives *no* hints** about scenery, activities, cuisine, or vibe.
4. If you infer a city, be sure it truly delivers on the user’s theme (mountains, beaches, food scene, culture, nightlife, etc.). Mention that specialty in **aiSearch**.
5. Never invent non‑existent cities; always return a real, well‑known destination.
6.⚠️ Always return the name of a real, bookable city or town — not a region, coast, or mountain range.
E.g., say "Positano", not "Amalfi Coast"; "Zermatt", not "Swiss Alps"; "Phuket", not "southern Thailand".


Price Extraction Rules:
- Look for specific dollar amounts (e.g., "$100-200", "under $150", "around $75 per night")
- Convert price ranges to minCost/maxCost in USD per night
- For budget descriptors WITHOUT specific amounts:
  * "budget" or "cheap" or "affordable" → maxCost: 100
  * "mid-range" or "moderate" → minCost: 100, maxCost: 250  
  * "luxury" or "high-end" or "premium" → minCost: 300
  * "ultra-luxury" or "5-star" → minCost: 500
- If they say "under $X" → maxCost: X
- If they say "over $X" or "at least $X" → minCost: X
- If they say "$X to $Y" or "$X-$Y" → minCost: X, maxCost: Y
- **IMPORTANT: If NO explicit price or budget terms are mentioned → minCost: null, maxCost: null**
- **INFER budget level from context**: "honeymoon", "anniversary", "luxury destination" (Maldives, Dubai, etc.) → suggest luxury in aiSearch. "backpacking", "student trip", "budget travel" → suggest budget in aiSearch. "business trip", "family vacation" → suggest mid-range in aiSearch.
- ALWAYS include budget descriptors in aiSearch based on context inference

aiSearch Content Rules:
- INFER appropriate hotel level from context and purpose of trip
- "honeymoon", "anniversary", "romantic getaway" → luxury, romantic properties, premium amenities
- Luxury destinations (Maldives, Dubai, Paris, etc.) → upscale accommodations unless budget explicitly mentioned
- "backpacking", "student", "budget travel" → affordable, hostel-style, budget-friendly options
- "business trip", "conference" → business hotels, reliable mid-range properties with good amenities
- "family vacation" → family-friendly mid-range properties with appropriate facilities
- If NO specific context, default to: "interesting and well-reviewed hotels, good value properties"
- Focus on matching the implied expectations from the trip purpose and destination


### Other Rules:
- If the user doesn't provide check‑in/check‑out dates, default to:
  "checkin": "${formattedCheckin}"
  "checkout": "${formattedCheckout}"
- IMPORTANT: Always return the ISO‑2 country code and the full city name.
- Default language = "en".
- Put ALL other search criteria in "aiSearch".
- If number of people is not specified, default to 2 adults / 0 children.
- **Only return the JSON. No explanation or extra formatting.**

User input: "${userInput}"
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    console.log('🤖 OpenAI response:', content);

    // Parse the returned JSON
    const parsed = JSON.parse(content);
    
    // Validate that minCost/maxCost are numbers or null
    if (parsed.minCost !== null && typeof parsed.minCost !== 'number') {
      parsed.minCost = null;
    }
    if (parsed.maxCost !== null && typeof parsed.maxCost !== 'number') {
      parsed.maxCost = null;
    }

    const parseTime = Date.now() - parseStartTime;
    console.log(`✅ Query parsed in ${parseTime}ms:`, parsed);
    
    res.json(parsed);

  } catch (error) {
    console.error('❌ Error parsing user input:', error);
    res.status(500).json({ error: 'Failed to parse input into structured query.' });
  }
};