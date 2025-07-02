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
  "aiSearch": "All other descriptive info including preferences, amenities, budget, hotel type, style, etc."
}

Rules:
- If the user doesn't provide check-in/check-out dates, default to:
  "checkin": "${formattedCheckin}"
  "checkout": "${formattedCheckout}"
- IMPORTANT: Always return the ISO-2 country code in "countryCode" field (e.g., FR, GB, US, DE, IT, ES, etc.)
- IMPORTANT: Always return the full city name in "cityName" field (e.g., Paris, London, New York)
- For language, infer from the location (e.g., FR → "fr", GB → "en", ES → "es", DE → "de", IT → "it") or default to "en"
- Put ALL other search criteria in "aiSearch": price range, hotel preferences, amenities, style, luxury level, business/leisure, etc.
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
    res.json(parsed);

  } catch (error) {
    console.error('Error parsing user input:', error);
    res.status(500).json({ error: 'Failed to parse input into structured query.' });
  }
};