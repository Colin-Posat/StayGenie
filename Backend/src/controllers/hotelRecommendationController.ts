// hotelRecommendationController.ts - AI-powered hotel ranking and recommendations (UPDATED)
import { Request, Response } from 'express';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface HotelSummaryForAI {
    index: number;
    hotelId: string;
    name: string;
    location: string;
    description: string;
  }

interface HotelInfo {
  id?: string;
  name?: string;
  address?: string;
  rating?: number;
  starRating?: number;
  description?: string;
  amenities?: string[];
  images?: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface Rate {
  retailRate?: {
    total?: Array<{
      amount: number;
      currency: string;
    }>;
  };
}

interface RoomType {
  rates?: Rate[];
}

interface HotelWithRates {
  hotelId: string;
  roomTypes?: RoomType[];
  hotelInfo?: HotelInfo;
}

interface SearchParams {
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  countryCode: string;
  cityName: string;
  aiSearch: string;
}

interface AIRecommendation {
  hotelName: string;
  aiMatchPercent: number;
  whyItMatches: string;
  funFacts: string[];
}

export const getHotelRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      hotelSummariesForAI, 
      fullHotels, 
      searchParams 
    }: { 
      hotelSummariesForAI: HotelSummaryForAI[], 
      fullHotels: HotelWithRates[], 
      searchParams: SearchParams 
    } = req.body;

    if (!hotelSummariesForAI || !Array.isArray(hotelSummariesForAI) || hotelSummariesForAI.length === 0) {
      res.status(400).json({
        error: 'No hotel summaries provided',
        message: 'hotelSummariesForAI array is required and must contain at least one hotel'
      });
      return;
    }

    if (!fullHotels || !Array.isArray(fullHotels)) {
      res.status(400).json({
        error: 'Full hotel data required',
        message: 'fullHotels array is required for matching AI results'
      });
      return;
    }

    if (!searchParams) {
      res.status(400).json({
        error: 'Search parameters required',
        message: 'searchParams object is required for AI analysis'
      });
      return;
    }

    console.log(`Step 1: Processing ${hotelSummariesForAI.length} ultra-lightweight hotel summaries for AI recommendation...`);

    // Step 1: Create formatted summaries for OpenAI (ULTRA-lightweight now!)
    const hotelSummaries = hotelSummariesForAI.map((hotel) => {
      return `${hotel.index}. ${hotel.name}
Location: ${hotel.location}
Description: ${hotel.description}`;
    }).join('\n\n');

    console.log('Step 2: Sending ultra-lightweight hotel data to OpenAI for ranking...');

    // Step 2: Prepare OpenAI prompt (same as before)
    const destination = `${searchParams.cityName}, ${searchParams.countryCode}`;
    const preferencesString = searchParams.aiSearch || 'General hotel preferences';

    const prompt = `You are a travel expert analyzing hotels for a traveler. Below is a numbered list of available hotels:

${hotelSummaries}

TRAVELER PREFERENCES: ${preferencesString}
DESTINATION: ${destination}
DATES: ${searchParams.checkin} to ${searchParams.checkout}
GUESTS: ${searchParams.adults} adults${searchParams.children > 0 ? `, ${searchParams.children} children` : ''}

CRITICAL INSTRUCTIONS:
- Return ONLY a pure JSON array with no markdown formatting, no code blocks, no backticks, no extra text
- Use the EXACT hotel name as it appears in the numbered list above
- Select exactly 7 hotels (or all available if fewer than 7)
- Rank from best match (first) to worst match (last) for the given preferences
- Assign a realistic match percentage (60-95%, avoid perfect 100%)
- Be honest about matches but present them positively

JSON FORMAT:
[
  {
    "hotelName": "Exact name from the numbered list above",
    "aiMatchPercent": 85,
    "whyItMatches": "Brief 2-sentence explanation of why this hotel matches the preferences",
    "funFacts": ["Interesting fact 1", "Interesting fact 2"]
  }
]

Return ONLY the JSON array, nothing else.`;

    // Step 3: Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    });

    const aiResponse = completion.choices[0]?.message?.content || '[]';
    console.log('Step 3: Received AI recommendations');

    // Step 4: Parse AI response
    let aiRecommendations: AIRecommendation[] = [];
    try {
      const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      aiRecommendations = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      res.status(500).json({
        error: 'AI response parsing failed',
        message: 'Could not parse OpenAI recommendations',
        aiResponse: aiResponse
      });
      return;
    }

    console.log(`Step 4: AI selected ${aiRecommendations.length} hotels`);

    // Step 5: Match AI recommendations with FULL hotel data (not summaries)
    const recommendedHotels = aiRecommendations.map(aiRec => {
      // Find the matching hotel by name in the FULL hotel data
      const matchingHotel = fullHotels.find(hotel => 
        hotel.hotelInfo && hotel.hotelInfo.name === aiRec.hotelName
      );

      if (!matchingHotel) {
        console.warn(`Warning: Could not find hotel "${aiRec.hotelName}" in original data`);
        return null;
      }

      // Calculate price range for display (same logic as before)
      let priceRange = null;
      if (matchingHotel.roomTypes && matchingHotel.roomTypes.length > 0) {
        const prices = matchingHotel.roomTypes
          .flatMap(room => room.rates || [])
          .map(rate => rate.retailRate?.total?.[0]?.amount)
          .filter(price => price != null);
        
        if (prices.length > 0) {
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const currency = matchingHotel.roomTypes[0].rates?.[0]?.retailRate?.total?.[0]?.currency || 'USD';
          priceRange = {
            min: minPrice,
            max: maxPrice,
            currency: currency,
            display: minPrice === maxPrice ? `$${minPrice}` : `$${minPrice} - $${maxPrice}`
          };
        }
      }

      return {
        // Original FULL hotel data
        hotelId: matchingHotel.hotelId,
        hotelInfo: matchingHotel.hotelInfo,
        roomTypes: matchingHotel.roomTypes,
        priceRange,
        
        // AI-generated insights
        aiMatchPercent: aiRec.aiMatchPercent,
        whyItMatches: aiRec.whyItMatches,
        funFacts: aiRec.funFacts,
        
        // Additional calculated fields
        totalRooms: matchingHotel.roomTypes ? matchingHotel.roomTypes.length : 0,
        hasAvailability: matchingHotel.roomTypes && matchingHotel.roomTypes.length > 0
      };
    }).filter(Boolean);

    console.log(`Step 5: Successfully matched ${recommendedHotels.length} hotels with AI data`);

    // Step 6: Return final response
    res.json({
      searchParams,
      totalHotelsAnalyzed: hotelSummariesForAI.length,
      aiRecommendationsCount: recommendedHotels.length,
      recommendations: recommendedHotels,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating hotel recommendations:', error);
    
    if (error instanceof Error && error.message.includes('OpenAI')) {
      res.status(503).json({
        error: 'AI service unavailable',
        message: 'Could not connect to OpenAI for recommendations',
        details: error.message
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to generate recommendations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 🚀 UPDATED: Combined endpoint with lightweight summaries
export const getAvailabilityWithRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userInput } = req.body;

    if (!userInput) {
      res.status(400).json({ error: 'userInput is required' });
      return;
    }

    console.log('Combined search: Getting availability + AI recommendations for:', userInput);

    // Step 1: Get hotel availability (now includes hotelSummariesForAI)
    const availabilityResponse = await fetch(
      `${process.env.BASE_URL || 'http://localhost:3003'}/api/hotels/availability-from-text`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput })
      }
    );

    if (!availabilityResponse.ok) {
      const errorData = await availabilityResponse.json();
      res.status(availabilityResponse.status).json({
        error: 'Availability search failed',
        message: errorData.message || 'Could not get hotel availability',
        details: errorData
      });
      return;
    }

    const availabilityData = await availabilityResponse.json();

    if (!availabilityData.hotels || availabilityData.hotels.length === 0) {
      res.status(404).json({
        error: 'No hotels found',
        message: 'No available hotels found for your search criteria',
        searchParams: availabilityData.searchParams
      });
      return;
    }

    // Step 2: Get AI recommendations using LIGHTWEIGHT summaries
    const recommendationResponse = await fetch(
      `${process.env.BASE_URL || 'http://localhost:3003'}/api/hotels/recommendations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelSummariesForAI: availabilityData.hotelSummariesForAI, // 🚀 Use lightweight summaries
          fullHotels: availabilityData.hotels, // 🚀 Pass full data separately for matching
          searchParams: availabilityData.searchParams
        })
      }
    );

    if (!recommendationResponse.ok) {
      // If recommendations fail, still return availability data
      console.warn('Recommendations failed, returning availability data only');
      res.json({
        ...availabilityData,
        aiRecommendationsAvailable: false,
        message: 'Hotels found but AI recommendations unavailable'
      });
      return;
    }

    const recommendationData = await recommendationResponse.json();

    // Step 3: Combine and return
    res.json({
      searchParams: availabilityData.searchParams,
      totalHotelsFound: availabilityData.totalHotelsFound,
      hotelsWithRates: availabilityData.hotelsWithRates,
      aiRecommendationsCount: recommendationData.aiRecommendationsCount,
      recommendations: recommendationData.recommendations,
      allHotels: availabilityData.hotels, // Include all hotels for fallback
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in combined availability + recommendations:', error);
    
    res.status(500).json({
      error: 'Failed to get availability and recommendations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};