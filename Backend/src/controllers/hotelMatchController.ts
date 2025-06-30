import { Request, Response } from 'express';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface RecommendationRequest {
  hotelSummaryText: string;
  extra: string[];
  city: string;
  country?: string;
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
}

interface HotelRecommendation {
  hotelName: string;
  whyItMatches: string;
  funFacts: string[];
}

interface RecommendationResponse {
  selectedHotels: HotelRecommendation[];
  searchCriteria: string;
  totalHotelsAnalyzed: number;
}

// Helper function to clean and extract JSON from OpenAI response
function extractJsonFromResponse(content: string): string {
  // Remove markdown code blocks if present
  let cleanContent = content.trim();
  
  // Remove ```json and ``` markers
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\s*/, '');
  }
  if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\s*/, '');
  }
  if (cleanContent.endsWith('```')) {
    cleanContent = cleanContent.replace(/\s*```$/, '');
  }
  
  // Find JSON array start and end
  const jsonStart = cleanContent.indexOf('[');
  const jsonEnd = cleanContent.lastIndexOf(']');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
  }
  
  return cleanContent.trim();
}

export const matchHotels = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      hotelSummaryText,
      extra,
      city,
      country,
      checkin,
      checkout,
      adults,
      children
    }: RecommendationRequest = req.body;

    // Validate required fields
    if (!hotelSummaryText || !extra || !Array.isArray(extra)) {
      res.status(400).json({
        error: 'Missing required fields: hotelSummaryText and extra array are required'
      });
      return;
    }

    if (!hotelSummaryText.trim()) {
      res.status(400).json({
        error: 'No hotels available to analyze'
      });
      return;
    }

    // Count total hotels in the summary
    const totalHotels = (hotelSummaryText.match(/^\d+\./gm) || []).length;

    if (totalHotels === 0) {
      res.status(400).json({
        error: 'Invalid hotel summary format'
      });
      return;
    }

    // Create the criteria string from extra array
    const criteriaString = extra.join(', ');
    const destination = country ? `${city}, ${country}` : city;

    const prompt = `
You are a travel expert. Select EXACTLY 5 hotels from this list, ranked best to worst match for the preferences.

HOTELS:
${hotelSummaryText}

PREFERENCES: ${criteriaString}

CRITICAL: Return ONLY a pure JSON array with no markdown formatting, no code blocks, no backticks, no extra text.

Format:
[
  {
    "hotelName": "Exact name from list",
    "whyItMatches": "Brief honest explanation",
    "funFacts": ["Fact 1", "Fact 2"]
  }
]

Rules:
- Always 5 hotels (or all if fewer available)
- Best match first, worst last
- Be honest about poor matches but sell positively
- Exactly 2 fun facts per hotel
- Return ONLY the JSON array, no markdown, no explanation, no code blocks
`;

    console.log('Sending recommendation request to OpenAI...');
    console.log('Criteria:', criteriaString);
    console.log('Total hotels to analyze:', totalHotels);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Much faster and cheaper than gpt-4
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // Lower temperature for faster, more focused responses
      max_tokens: 1500, // Limit response length for faster processing
    });

    const content = completion.choices[0]?.message?.content || '{}';
    console.log('Raw OpenAI response:', content);

    // Clean the response to extract pure JSON
    const cleanedContent = extractJsonFromResponse(content);
    console.log('Cleaned JSON content:', cleanedContent);

    // Parse the returned JSON - expect direct array now
    let recommendations: HotelRecommendation[];
    try {
      recommendations = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Content that failed to parse:', cleanedContent);
      
      // Try to provide helpful error message
      res.status(500).json({
        error: 'Failed to parse hotel recommendations. AI response format was invalid.',
        debug: {
          rawResponse: content.substring(0, 200) + '...',
          cleanedResponse: cleanedContent.substring(0, 200) + '...'
        }
      });
      return;
    }

    // Validate the response structure
    if (!Array.isArray(recommendations)) {
      console.error('Response is not an array:', typeof recommendations);
      res.status(500).json({
        error: 'Invalid recommendation format received - expected array'
      });
      return;
    }

    // Validate each recommendation object
    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i];
      if (!rec.hotelName || !rec.whyItMatches || !Array.isArray(rec.funFacts)) {
        console.error(`Invalid recommendation structure at index ${i}:`, rec);
        res.status(500).json({
          error: `Invalid recommendation structure at position ${i + 1}`
        });
        return;
      }
    }

    // Always expect 5 results (or total available if less than 5)
    const expectedResults = Math.min(5, totalHotels);
    
    if (recommendations.length === 0) {
      res.status(500).json({
        error: 'AI failed to select any hotels'
      });
      return;
    }

    // Warn if we got fewer than expected (but still return what we have)
    if (recommendations.length < expectedResults) {
      console.warn(`Expected ${expectedResults} hotels but got ${recommendations.length}`);
    }

    console.log(`Successfully processed ${recommendations.length} hotel recommendations`);

    // Return successful response - JUST the hotel array
    res.json(recommendations);

  } catch (error: any) {
    console.error('Error in matchHotels controller:', error);
    
    if (error.response?.status === 401) {
      res.status(401).json({
        error: 'OpenAI API authentication failed. Check your API key.'
      });
      return;
    }

    if (error.response?.status === 429) {
      res.status(429).json({
        error: 'OpenAI API rate limit exceeded. Please try again later.'
      });
      return;
    }

    res.status(500).json({
      error: error.message || 'Failed to generate hotel recommendations'
    });
  }
};