import { Request, Response } from 'express';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const parseSearchQuery = async (req: Request, res: Response) => {
  try {
    const { userInput } = req.body;

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
- **IMPORTANT: If NO price or budget terms are mentioned → minCost: null, maxCost: null**
- ALWAYS include budget descriptors in aiSearch even if you extract specific prices

Other Rules:
- If the user doesn't provide check-in/check-out dates, default to:
  "checkin": "${formattedCheckin}"
  "checkout": "${formattedCheckout}"
- IMPORTANT: Always return the ISO-2 country code in "countryCode" field (e.g., FR, GB, US, DE, IT, ES, etc.)
- IMPORTANT: Always return the full city name in "cityName" field (e.g., Paris, London, New York)
- For language, infer from the location (e.g., FR → "fr", GB → "en", ES → "es", DE → "de", IT → "it") or default to "en"
- Put ALL other search criteria in "aiSearch": hotel preferences, amenities, style, business/leisure, AND budget descriptors
- If they provide only a country, choose a major city in that country
- If no location is provided, infer one from their preferences
- If number of people is not specified, default to 2 adults and 0 children
- Only return the JSON. No explanation or extra formatting.

User input: "${userInput}"
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = completion.choices[0]?.message?.content || '{}';

    // Parse the returned JSON
    const parsed = JSON.parse(content);
    
    // Validate that minCost/maxCost are numbers or null
    if (parsed.minCost !== null && typeof parsed.minCost !== 'number') {
      parsed.minCost = null;
    }
    if (parsed.maxCost !== null && typeof parsed.maxCost !== 'number') {
      parsed.maxCost = null;
    }
    
    res.json(parsed);

  } catch (error) {
    console.error('Error parsing user input:', error);
    res.status(500).json({ error: 'Failed to parse input into structured query.' });
  }
};