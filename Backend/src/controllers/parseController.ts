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
Today is ${formattedToday}. You are a travel assistant converting user hotel search requests into structured JSON. Output only a valid JSON object with:

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
  "aiSearch": "All other preferences, descriptors, trip purpose, vibe, hotel style, etc."
}

**IMPORTANT:** FOLLOW NO THIS INSTRUCTION MATTER WHAT:
IMPORTANT: instead of New York City use New York never say New York City in the city name under any circumstance!!

 **City Selection Rules**
1. Use user-provided city if available.
2. If only a country/region is mentioned, infer a city that best fits the user's theme (e.g., mountains, food, beaches).
   - Example: “ski in Japan” → Niseko, not Tokyo.
3. Avoid regions (e.g., "Swiss Alps") — pick a bookable city/town (e.g., Zermatt).
4. Capital/largest cities only if no preference/hint is given.
5. 

 **Price/Budget Parsing**
- "$X to $Y" → minCost: X, maxCost: Y
- "under $X" → maxCost: X
- "over/at least $X" → minCost: X
- Budget words only:
  - "budget", "cheap", "affordable" → maxCost: 100
  - "mid-range", "moderate" → minCost: 100, maxCost: 250
  - "luxury", "premium" → minCost: 300
  - "ultra-luxury", "5-star" → minCost: 500
- If no budget mentioned, set both to null.

 **aiSearch Inference**
- Always include inferred trip vibe and expectations (e.g., “romantic luxury stay”, “budget backpacker trip”)
- Use context: 
  - "honeymoon" → romantic, luxury
  - "student trip", "backpacking" → budget-friendly
  - "business trip" → reliable mid-range
  - "family vacation" → family-friendly mid-range
- If unclear → default: "well-reviewed, good-value hotels"

 Other:
- Default adults: 2, children: 0
- Always include real, bookable cities and ISO-2 country codes
- Output only the JSON – no explanations or extra text.

User input: "${userInput}"
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
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