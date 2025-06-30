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
  "city": "3-letter IATA city code (e.g., PAR for Paris, LON for London, NYC for New York)",
  "country": "Country Name (if available)",
  "price": "Optional price range or budget",
  "adults": Number of adult guests (default to 2 if not specified),
  "children": Number of children (default to 0),
  "extra": ["All other descriptive or preference-related info that doesn't fit above"]
}

Rules:
- If the user doesn't provide check-in/check-out dates, default to:
  "checkin": "${formattedCheckin}"
  "checkout": "${formattedCheckout}"
- IMPORTANT: Always return the 3-letter IATA city code in the "city" field, not the city name
- Common city codes: PAR (Paris), LON (London), NYC (New York), TYO (Tokyo), MAD (Madrid), ROM (Rome), BCN (Barcelona), AMS (Amsterdam), BER (Berlin), VIE (Vienna), PRG (Prague), DUB (Dublin), LIS (Lisbon), MIL (Milan), VCE (Venice), FLR (Florence), ATH (Athens), IST (Istanbul), MOW (Moscow), STO (Stockholm), CPH (Copenhagen), OSL (Oslo), HEL (Helsinki), WAW (Warsaw), BUD (Budapest), ZUR (Zurich), GVA (Geneva), BRU (Brussels), BOM (Mumbai), DEL (Delhi), BLR (Bangalore), SYD (Sydney), MEL (Melbourne), PER (Perth), LAX (Los Angeles), SFO (San Francisco), CHI (Chicago), MIA (Miami), LAS (Las Vegas), BOS (Boston), WAS (Washington), SEA (Seattle), DEN (Denver), ATL (Atlanta), YTO (Toronto), YVR (Vancouver), YMQ (Montreal)
- If they provide only a country, choose a major city code in that country based on their vibe/criteria
- If no location is provided, infer one from their preferences (e.g., 'igloo' → 'TRD' for Trondheim, Norway)
- Only return the JSON. No explanation or extra formatting.
- If number of people is not specified, default to 2 adults and 0 children.

User input: "${userInput}"
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = completion.choices[0]?.message?.content || '{}';

    // Parse the returned JSON
    const parsed = JSON.parse(content);
    res.json(parsed);

  } catch (error) {
    console.error('Error parsing user input:', error);
    res.status(500).json({ error: 'Failed to parse input into structured query.' });
  }
};