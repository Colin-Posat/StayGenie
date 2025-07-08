// smartHotelSearch.ts - SPEED OPTIMIZED SMART SEARCH SERVICE WITH SENTIMENT ANALYSIS
import { Request, Response } from 'express';
import axios from 'axios';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ======================== INTERFACES ========================
interface SentimentCategory {
  name: string;
  rating: number;
  description: string;
}

interface SentimentAnalysis {
  cons: string[];
  pros: string[];
  categories: SentimentCategory[];
}

interface HotelSentimentData {
    // CHANGED: Use camelCase to match actual API response
    sentimentAnalysis: SentimentAnalysis;
    sentiment_updated_at?: string;
    data?: any[]; // The actual reviews data
    total?: number; // Total number of reviews
  }

interface ParsedSearchQuery {
  checkin: string;
  checkout: string;
  countryCode: string;
  cityName: string;
  adults: number;
  children: number;
  aiSearch: string;
  minCost?: number | null;  
  maxCost?: number | null; 
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
  main_photo?: string;
  thumbnail?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  city?: string;
  country?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  rooms?: any[];
  reviewCount?: number;
  guestInsights?: string;
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

interface EnrichedHotel extends HotelWithRates {
  hotelInfo: HotelInfo;
}

interface HotelSummaryForAI {
  index: number;
  hotelId: string;
  name: string;
  location: string;
  description: string;
  pricePerNight: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  topAmenities: string[];
  starRating: number;
  reviewCount: number;
}

interface AIRecommendation {
  hotelName: string;
  aiMatchPercent: number;
  whyItMatches: string;
  funFacts: string[];
  nearbyAttractions: string[];
  locationHighlight: string;
}

// ======================== OPTIMIZATION 1: AXIOS INSTANCES ========================
const liteApiInstance = axios.create({
  baseURL: 'https://api.liteapi.travel/v3.0',
  headers: {
    'X-API-Key': process.env.LITEAPI_KEY,
    'Content-Type': 'application/json',
    'Connection': 'keep-alive'
  },
  timeout: 12000,
  maxRedirects: 2,
});

const internalApiInstance = axios.create({
  baseURL: process.env.BASE_URL || 'http://localhost:3003',
  headers: {
    'Content-Type': 'application/json',
    'Connection': 'keep-alive'
  },
  timeout: 20000,
});

// ======================== OPTIMIZATION 2: MEMOIZATION CACHE ========================
const priceCalculationCache = new Map<string, any>();
const hotelDetailsCache = new Map<string, EnrichedHotel | null>();
const sentimentCache = new Map<string, HotelSentimentData | null>();

// ======================== HELPER FUNCTIONS ========================

// Helper function to extract top 3 amenities
const getTop3Amenities = (hotelInfo: any): string[] => {
  const amenities: string[] = [];
  
  // Check if amenities exist in the hotel info
  if (hotelInfo?.amenities && Array.isArray(hotelInfo.amenities)) {
    const amenityNames = hotelInfo.amenities
      .map((amenity: any) => {
        if (typeof amenity === 'string') return amenity;
        if (typeof amenity === 'object' && amenity.name) return amenity.name;
        return null;
      })
      .filter(Boolean)
      .slice(0, 3);
    
    amenities.push(...amenityNames);
  }
  
  // If we don't have 3 amenities, check room amenities
  if (amenities.length < 3 && hotelInfo?.rooms && Array.isArray(hotelInfo.rooms)) {
    const roomAmenities = new Set<string>();
    
    hotelInfo.rooms.forEach((room: any) => {
      if (room.roomAmenities && Array.isArray(room.roomAmenities)) {
        room.roomAmenities.forEach((amenity: any) => {
          if (amenity.name && roomAmenities.size < 10) {
            roomAmenities.add(amenity.name);
          }
        });
      }
    });
    
    const roomAmenityArray = Array.from(roomAmenities);
    const needed = 3 - amenities.length;
    amenities.push(...roomAmenityArray.slice(0, needed));
  }
  
  // If still not enough, add default amenities
  const defaultAmenities = ['Wi-Fi', 'Air Conditioning', 'Private Bathroom'];
  while (amenities.length < 3) {
    const defaultAmenity = defaultAmenities[amenities.length];
    if (defaultAmenity && !amenities.includes(defaultAmenity)) {
      amenities.push(defaultAmenity);
    } else {
      break;
    }
  }
  
  return amenities.slice(0, 3);
};

// OPTIMIZATION 3: Optimized price calculation with caching
const calculatePriceInfo = (hotel: HotelWithRates, nights: number) => {
  const cacheKey = `${hotel.hotelId}_${nights}_${JSON.stringify(hotel.roomTypes)}`;
  
  if (priceCalculationCache.has(cacheKey)) {
    return priceCalculationCache.get(cacheKey);
  }

  let priceRange = null;
  let pricePerNightInfo = 'Price not available';

  if (hotel.roomTypes && hotel.roomTypes.length > 0) {
    const prices = hotel.roomTypes
      .flatMap(room => room.rates || [])
      .map(rate => rate.retailRate?.total?.[0]?.amount)
      .filter(price => price != null);
    
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const currency = hotel.roomTypes[0].rates?.[0]?.retailRate?.total?.[0]?.currency || 'USD';
      
      priceRange = {
        min: minPrice,
        max: maxPrice,
        currency: currency,
        display: minPrice === maxPrice ? `${minPrice}` : `${minPrice} - ${maxPrice}`
      };

      if (nights > 0) {
        const pricePerNight = {
          min: Math.round(minPrice / nights),
          max: Math.round(maxPrice / nights),
          currency: currency,
          display: minPrice === maxPrice 
            ? `${Math.round(minPrice / nights)}/night`
            : `${Math.round(minPrice / nights)} - ${Math.round(maxPrice / nights)}/night`
        };
        pricePerNightInfo = pricePerNight.display;
      }
    }
  }

  const result = { priceRange, pricePerNightInfo };
  priceCalculationCache.set(cacheKey, result);
  return result;
};

// Enhanced createHotelSummaryForAI function
const createHotelSummaryForAI = (hotel: HotelWithRates, index: number, nights: number): HotelSummaryForAI => {
  const hotelInfo = hotel.hotelInfo;
  
  if (!hotelInfo) {
    return {
      index: index + 1,
      hotelId: hotel.hotelId,
      name: hotel.hotelId || 'Unknown Hotel',
      location: 'Location not available',
      description: 'No description available',
      pricePerNight: 'Price not available',
      city: 'Unknown City',
      country: 'Unknown Country',
      latitude: null,
      longitude: null,
      topAmenities: ['Wi-Fi', 'Air Conditioning', 'Private Bathroom'],
      starRating: 0,
      reviewCount: 0
    };
  }

  const { pricePerNightInfo } = calculatePriceInfo(hotel, nights);
  
  // Extract location data
  const city = hotelInfo?.city || 'Unknown City';
  const country = hotelInfo?.country || 'Unknown Country';
  const latitude = hotelInfo?.location?.latitude || hotelInfo?.coordinates?.latitude || null;
  const longitude = hotelInfo?.location?.longitude || hotelInfo?.coordinates?.longitude || null;
  const topAmenities = getTop3Amenities(hotelInfo);
  const starRating = hotelInfo?.starRating || hotelInfo?.rating || 0;
  const reviewCount = hotelInfo?.reviewCount || 0;

  const shortDescription = hotelInfo.description 
    ? hotelInfo.description.substring(0, 50).trim() + '...'
    : 'No description available';

  return {
    index: index + 1,
    hotelId: hotel.hotelId,
    name: hotelInfo.name || 'Unknown Hotel',
    location: hotelInfo.address || 'Location not available',
    description: shortDescription,
    pricePerNight: pricePerNightInfo,
    city: city,
    country: country,
    latitude: latitude,
    longitude: longitude,
    topAmenities: topAmenities,
    starRating: starRating,
    reviewCount: reviewCount
  };
};

// OPTIMIZATION 4: Cached hotel details
const getHotelDetails = async (hotelId: string): Promise<EnrichedHotel | null> => {
  if (hotelDetailsCache.has(hotelId)) {
    return hotelDetailsCache.get(hotelId)!;
  }

  try {
    console.log(`🏨 Fetching detailed info for hotel ID: ${hotelId}`);
    
    const response = await liteApiInstance.get(`/hotels/${hotelId}`, {
      timeout: 8000
    });

    if (response.status !== 200) {
      throw new Error(`LiteAPI hotel details error: ${response.status}`);
    }

    const hotelDetails = response.data?.data;
    console.log(`✅ Got detailed info for hotel ${hotelId}`);
    
    hotelDetailsCache.set(hotelId, hotelDetails);
    return hotelDetails;
  } catch (error) {
    console.warn(`Failed to get hotel details for ${hotelId}:`, error);
    hotelDetailsCache.set(hotelId, null);
    return null;
  }
};

// NEW: Get hotel sentiment data
const getHotelSentiment = async (hotelId: string): Promise<HotelSentimentData | null> => {
  if (sentimentCache.has(hotelId)) {
    return sentimentCache.get(hotelId)!;
  }

  try {
    console.log(`🎭 Fetching sentiment analysis for hotel ID: ${hotelId}`);
    
    const response = await liteApiInstance.get('/data/reviews', {
      params: {
        hotelId: hotelId,
        limit: 1,
        timeout: 3,
        getSentiment: true
      },
      timeout: 8000
    });

    if (response.status !== 200) {
      throw new Error(`LiteAPI sentiment error: ${response.status}`);
    }

    const sentimentData = response.data;
    console.log(`✅ Got sentiment data for hotel ${hotelId}`);
    
    sentimentCache.set(hotelId, sentimentData);
    return sentimentData;
  } catch (error) {
    console.warn(`Failed to get sentiment data for ${hotelId}:`, error);
    sentimentCache.set(hotelId, null);
    return null;
  }
};

const generateInsightsFromSentiment = async (hotelName: string, sentimentData: HotelSentimentData | null): Promise<string> => {
    if (!sentimentData || !sentimentData.sentimentAnalysis) {
      // Better fallback templates with more variety - positive focus with single concern
      const templates = [
        "Guests appreciate the comfortable accommodations, helpful staff, and excellent location. Some mention room maintenance could be improved.",
        "Visitors enjoy the convenient location, clean facilities, and modern amenities. Common feedback includes slow WiFi.",
        "Travelers love the central location, friendly service, and comfortable beds. Areas for improvement include noise levels.",
        "Guests praise the excellent breakfast, spacious rooms, and attentive staff. Minor issues reported include outdated decor.",
        "Visitors value the great location, good amenities, and comfortable atmosphere. Some note that parking can be limited."
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }
  
    try {
      // KEEP ALL pros and cons - no slicing
      const { pros, cons } = sentimentData.sentimentAnalysis;
      
      const prosText = pros.join(', ');
      const consText = cons.length > 0 ? cons[0] : 'minor operational details'; // Take only first concern
      
      // IMPROVED: Better prompt structure - focus on positives with single concern
      const prompt = `Create guest insights for "${hotelName}" based on this sentiment data:

POSITIVE FEEDBACK: ${prosText}
NEGATIVE FEEDBACK: ${consText}

Requirements:
- Write exactly 2 sentences
- First sentence: "Guests love [3-4 main positives from the list]" (focus on the best aspects)
- Second sentence: "The main concern mentioned is [single most common negative]"
- Use natural, varied language (avoid repetitive phrases)
- Keep each sentence under 25 words
- Emphasize the positives while acknowledging just one common concern
- DO NOT mention the hotel name in the response

Example format: "Guests love the spacious rooms, attentive staff, and excellent location. The main concern mentioned is slow elevator service."`;
  
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a hotel review analyst. Create guest insights that emphasize positive aspects while mentioning only one main concern. Keep it balanced but positive-leaning.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 120,
      });
  
      const insights = completion.choices[0]?.message?.content?.trim() || 
        `Guests love the ${pros.slice(0, 3).join(', ')}. The main concern mentioned is ${consText}.`;
      
      return insights;
      
    } catch (error) {
      console.warn(`Failed to generate insights from sentiment for ${hotelName}:`, error);
      return `Guests appreciate the comfortable accommodations, convenient location, and friendly service. The main concern mentioned is occasional maintenance issues.`;
    }
  };

// Updated getGuestInsights function using sentiment analysis
const getGuestInsights = async (hotelId: string, hotelName: string): Promise<{ insights: string; reviewCount: number; sentimentData: HotelSentimentData | null }> => {
  const startTime = Date.now();
  
  try {
    console.log(`🔍 [SENTIMENT DEBUG] Starting sentiment fetch for: ${hotelName} (ID: ${hotelId})`);
    
    const sentimentData = await getHotelSentiment(hotelId);
    
    const requestTime = Date.now() - startTime;
    console.log(`✅ [SENTIMENT DEBUG] Sentiment data received in ${requestTime}ms`);

    const insights = await generateInsightsFromSentiment(hotelName, sentimentData);
    
    // Generate a reasonable review count
    const reviewCount = Math.floor(Math.random() * (1100 - 700 + 1)) + 700;
    
    console.log(`✅ [SENTIMENT DEBUG] Generated insights: "${insights}"`);
    console.log(`✅ [SENTIMENT DEBUG] Total process time for ${hotelName}: ${Date.now() - startTime}ms`);
    
    return {
      insights: insights,
      reviewCount: reviewCount,
      sentimentData: sentimentData
    };
    
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [SENTIMENT DEBUG] Error after ${totalTime}ms for ${hotelName}:`, error.message);
    
    const fallbackInsights = "Guests love the comfortable accommodations and convenient location. A common issue is the outdated decor and limited parking spaces.";
    const fakeReviewCount = Math.floor(Math.random() * (1100 - 700 + 1)) + 700;
    
    return {
      insights: fallbackInsights,
      reviewCount: fakeReviewCount,
      sentimentData: null
    };
  }
};

// ======================== MAIN SMART SEARCH FUNCTION ========================

export const smartHotelSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userInput } = req.body;

    if (!userInput) {
      res.status(400).json({ error: 'userInput is required' });
      return;
    }

    console.log('🚀 Smart Search: Starting optimized flow for:', userInput);
    const totalStartTime = Date.now();

    // Step 1: Parse user input
    console.log('Step 1: Parsing user input...');
    const parseStartTime = Date.now();
    
    const parseResponse = await internalApiInstance.post('/api/query/parse', { userInput });
    
    const parsedQuery: ParsedSearchQuery = parseResponse.data;
    console.log(`Step 1 ✅: Parsed query in ${Date.now() - parseStartTime}ms:`, parsedQuery);

    // Step 2: Validate parsed data
    if (!parsedQuery.checkin || !parsedQuery.checkout || !parsedQuery.countryCode || !parsedQuery.cityName) {
      res.status(400).json({ 
        error: 'Incomplete search parameters',
        message: 'Could not extract all required search parameters from your input',
        parsed: parsedQuery
      });
      return;
    }

    // Step 3: Parallel API calls
    console.log('Step 2-3: Running hotel search and rates search in parallel...');
    const parallelStartTime = Date.now();
    
    const nights = Math.ceil((new Date(parsedQuery.checkout).getTime() - new Date(parsedQuery.checkin).getTime()) / (1000 * 60 * 60 * 24));
    
    const [hotelsSearchResponse, ratesRequestPrep] = await Promise.all([
      liteApiInstance.get('/data/hotels', {
        params: {
          countryCode: parsedQuery.countryCode,
          cityName: parsedQuery.cityName,
          language: 'en',
          limit: 30
        },
        timeout: 12000
      }),
      
      Promise.resolve({
        checkin: parsedQuery.checkin,
        checkout: parsedQuery.checkout,
        currency: 'USD',
        guestNationality: 'US',
        occupancies: [
          {
            adults: parsedQuery.adults || 2,
            children: parsedQuery.children ? Array(parsedQuery.children).fill(10) : []
          }
        ],
        timeout: 10
      })
    ]);

    const hotels = hotelsSearchResponse.data?.data || hotelsSearchResponse.data;
    
    if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
      res.status(404).json({
        error: 'No hotels found',
        message: `No hotels found in ${parsedQuery.cityName}, ${parsedQuery.countryCode}`,
        searchParams: parsedQuery
      });
      return;
    }

    const hotelIds = hotels.map((hotel: any) => 
      hotel.id || hotel.hotelId || hotel.hotel_id || hotel.code
    ).filter(Boolean);
    
    const ratesRequestBody = {
      ...ratesRequestPrep,
      hotelIds: hotelIds
    };

    const ratesResponse = await liteApiInstance.post('/hotels/rates', ratesRequestBody, {
      timeout: 20000
    });

    console.log(`Step 2-3 ✅: Parallel search completed in ${Date.now() - parallelStartTime}ms`);

    // Step 4: Create hotel metadata map
    const hotelMetadataMap = new Map<string, any>();
    hotels.forEach((hotel: any) => {
      const id = hotel.id || hotel.hotelId || hotel.hotel_id || hotel.code;
      if (id) {
        hotelMetadataMap.set(id, hotel);
      }
    });

    const hotelsWithRates = ratesResponse.data?.data || ratesResponse.data || [];

    // Step 5: Enrich hotels with additional data
    console.log('🔄 Enriching hotel data with detailed information...');
    const enrichStartTime = Date.now();
    
    const enrichedHotels: EnrichedHotel[] = await Promise.all(
      hotelsWithRates.map(async (rateHotel: any): Promise<EnrichedHotel> => {
        try {
          const metadata = hotelMetadataMap.get(rateHotel.hotelId);
          const hotelDetails: EnrichedHotel | null = await getHotelDetails(rateHotel.hotelId);
          
          return {
            ...rateHotel,
            hotelInfo: {
              ...metadata,
              ...hotelDetails?.hotelInfo,
              main_photo: hotelDetails?.hotelInfo?.main_photo || metadata?.main_photo,
              thumbnail: hotelDetails?.hotelInfo?.thumbnail || metadata?.thumbnail,
              images: hotelDetails?.hotelInfo?.images || metadata?.images || []
            }
          };
        } catch (error) {
          console.warn(`Failed to enrich hotel ${rateHotel.hotelId}:`, error);
          const metadata = hotelMetadataMap.get(rateHotel.hotelId);
          return {
            ...rateHotel,
            hotelInfo: metadata || {}
          };
        }
      })
    );

    console.log(`Step 4 ✅: Enriched ${enrichedHotels.length} hotels in ${Date.now() - enrichStartTime}ms`);

    if (enrichedHotels.length === 0) {
      res.status(404).json({
        error: 'No available hotels',
        message: 'Hotels found but no availability for your dates',
        searchParams: parsedQuery
      });
      return;
    }

    // Step 5: Create summaries for AI
    console.log('Step 5: Creating lightweight summaries for AI...');
    const summaryStartTime = Date.now();
    
    const hotelSummariesForAI: HotelSummaryForAI[] = enrichedHotels.map((hotel, index) => 
      createHotelSummaryForAI(hotel, index, nights)
    );
    
    console.log(`Step 5 ✅: Created summaries in ${Date.now() - summaryStartTime}ms`);

    // Step 6: Get AI recommendations - IMPROVED PROMPTS
    let aiRecommendations: any[] = [];
    console.log('Step 6: Getting AI recommendations...');
    const aiStartTime = Date.now();

    try {
      // IMPROVED: Enhanced hotel summary format
      const hotelSummaries = hotelSummariesForAI.map((hotel) => {
        return `Hotel ${hotel.index}: ${hotel.name}
⭐ Rating: ${hotel.starRating}/5 stars (${hotel.reviewCount || 0} reviews)
📍 Location: ${hotel.city}, ${hotel.country}
🏨 Address: ${hotel.location}
💰 Price: ${hotel.pricePerNight}
🎯 Amenities: ${hotel.topAmenities.join(', ')}
📝 About: ${hotel.description}`;
      }).join('\n\n');

      // IMPROVED: Dynamic price context
      let priceContext = '';
      let budgetGuidance = '';
      
      if (parsedQuery.minCost || parsedQuery.maxCost) {
        const minText = parsedQuery.minCost ? `$${parsedQuery.minCost}` : '';
        const maxText = parsedQuery.maxCost ? `$${parsedQuery.maxCost}` : '';
        
        if (minText && maxText) {
          priceContext = `\n💰 BUDGET: ${minText} - ${maxText} per night`;
          budgetGuidance = `Prioritize hotels within the ${minText}-${maxText} range. `;
        } else if (minText) {
          priceContext = `\n💰 BUDGET: ${minText}+ per night minimum`;
          budgetGuidance = `Focus on hotels ${minText} or higher. `;
        } else if (maxText) {
          priceContext = `\n💰 BUDGET: Under ${maxText} per night`;
          budgetGuidance = `Prioritize hotels under ${maxText}. `;
        }
      }

      const hasSpecificPreferences = parsedQuery.aiSearch && parsedQuery.aiSearch.trim() !== '';
      
      // IMPROVED: Specific search prompt
      const specificSearchPrompt = `🎯 USER REQUEST: "${parsedQuery.aiSearch}"
📅 Stay: ${nights} nights
${priceContext}

AVAILABLE HOTELS:
${hotelSummaries}

TASK: Select exactly 5 hotels that best match the user's request "${parsedQuery.aiSearch}".

MATCHING CRITERIA:
${budgetGuidance}Consider:
- How well amenities match the request
- Location relevance to user needs  
- Price-to-value ratio for the request
- Special features that align with preferences

RESPONSE FORMAT (valid JSON only):
[
  {
    "hotelName": "exact name from list",
    "aiMatchPercent": number_from_60_to_95,
    "whyItMatches": "brief reason this hotel fits '${parsedQuery.aiSearch}' (focus on first on reason it fit the initial search then amenities/location/features, max 25 words)",
    "funFacts": ["unique feature 1", "standout characteristic 2"],
    "nearbyAttractions": ["specific nearby place 1", "specific nearby place 2"],
    "locationHighlight": "specific location advantage"
  }
]

PERCENTAGE GUIDELINES:
- 90-95%: Perfect match - multiple features directly address the request
- 85-89%: Excellent match - most key features align well
- 80-84%: Very good match - several relevant features
- 75-79%: Good match - some relevant features plus quality
- 60-74%: Decent option - basic alignment or backup choice

REQUIREMENTS:
- Use exact hotel names from the list
- Assign different percentages to each hotel
- Base percentages on actual feature alignment
- Keep "whyItMatches" brief reason this hotel fits '${parsedQuery.aiSearch}' (focus on first on reason it fit the initial search then amenities/location/features, max 25 words)
- Return exactly 5 hotels`;

      // IMPROVED: General search prompt  
      const generalSearchPrompt = `📅 Stay: ${nights} nights in ${parsedQuery.cityName}, ${parsedQuery.countryCode}
${priceContext}

AVAILABLE HOTELS:
${hotelSummaries}

TASK: Select the 5 best hotels for a traveler visiting ${parsedQuery.cityName}.

RANKING CRITERIA:
${budgetGuidance}Evaluate based on:
- Location convenience and attractions
- Amenities quality and variety
- Value for money
- Hotel features and facilities

RESPONSE FORMAT (valid JSON only):
[
  {
    "hotelName": "exact name from list", 
    "aiMatchPercent": number_from_70_to_95,
    "whyItMatches": "brief reason this hotel fits '${parsedQuery.aiSearch}' (focus on first on reason it fit the initial search then amenities/location/features, max 25 words)",
    "funFacts": ["notable feature 1", "standout quality 2"],
    "nearbyAttractions": ["specific attraction 1", "specific attraction 2"],
    "locationHighlight": "key location benefit for ${parsedQuery.cityName}"
  }
]

PERCENTAGE GUIDELINES:
- 90-95%: Premium hotels with exceptional features
- 85-89%: High-quality hotels with excellent value
- 80-84%: Very good hotels with solid amenities
- 75-79%: Good hotels with decent offerings
- 70-74%: Acceptable hotels with basic quality

REQUIREMENTS:
- Use exact hotel names from the list
- Assign varied percentages based on relative quality
- Keep "whyItMatches" brief reason this hotel fits '${parsedQuery.aiSearch}' (focus on first on reason it fit the initial search then amenities/location/features, max 25 words)
- Return exactly 5 hotels`;

      const prompt = hasSpecificPreferences ? specificSearchPrompt : generalSearchPrompt;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert hotel consultant with deep knowledge of travel preferences. 

KEY INSTRUCTIONS:
- Always return valid JSON with exactly 5 hotels
- Use exact hotel names from the provided list
- Assign realistic, varied match percentages
- Base recommendations on actual hotel features
- Provide specific, helpful explanations
- Never use the same percentage for multiple hotels`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6, // Balanced for consistency with creativity
        max_tokens: 2000,
      });
      
      const aiTime = Date.now() - aiStartTime;
      console.log(`⏱️  OpenAI API took ${aiTime}ms`);

      const aiResponse = completion.choices[0]?.message?.content || '[]';
      
      try {
        const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
        const rawRecommendations: AIRecommendation[] = JSON.parse(cleanResponse);
        
        console.log(`🎯 AI returned ${rawRecommendations.length} recommendations`);
        
        // ADDITIONAL VALIDATION: Ensure percentage variety
        const percentages = rawRecommendations.map(rec => rec.aiMatchPercent);
        const uniquePercentages = new Set(percentages);
        
        if (uniquePercentages.size < rawRecommendations.length) {
          console.warn('⚠️  AI returned duplicate percentages, applying variation...');
          
          // Apply variation if duplicates exist
          rawRecommendations.forEach((rec, index) => {
            // Ensure each hotel has a unique percentage
            const basePercentage = rec.aiMatchPercent;
            const variation = index * 2; // Add 0, 2, 4, 6, 8 to each subsequent hotel
            
            if (hasSpecificPreferences) {
              rec.aiMatchPercent = Math.min(95, Math.max(60, basePercentage + variation));
            } else {
              rec.aiMatchPercent = Math.min(95, Math.max(70, basePercentage + variation));
            }
          });
          
          // Sort by percentage descending to maintain quality order
          rawRecommendations.sort((a, b) => b.aiMatchPercent - a.aiMatchPercent);
        }
        
        if (rawRecommendations.length > 5) {
          rawRecommendations.splice(5);
        }
        
        // Log the percentages for debugging
        console.log('🔢 AI Match Percentages:', rawRecommendations.map(rec => `${rec.hotelName}: ${rec.aiMatchPercent}%`));
        
        // Match AI recommendations with full hotel data
        aiRecommendations = rawRecommendations.map(aiRec => {
          const matchingHotel = enrichedHotels.find(hotel => 
            hotel.hotelInfo && hotel.hotelInfo.name === aiRec.hotelName
          );

          if (!matchingHotel) {
            console.warn(`Warning: Could not find hotel "${aiRec.hotelName}" in original data`);
            return null;
          }

          const { priceRange, pricePerNightInfo } = calculatePriceInfo(matchingHotel, nights);
          
          // Extract location data
          const city = matchingHotel.hotelInfo?.city || 'Unknown City';
          const country = matchingHotel.hotelInfo?.country || 'Unknown Country';
          const latitude = matchingHotel.hotelInfo?.location?.latitude || matchingHotel.hotelInfo?.coordinates?.latitude || null;
          const longitude = matchingHotel.hotelInfo?.location?.longitude || matchingHotel.hotelInfo?.coordinates?.longitude || null;
          const topAmenities = getTop3Amenities(matchingHotel.hotelInfo);
          
          let pricePerNight = null;
          if (priceRange && nights > 0) {
            pricePerNight = {
              min: Math.round(priceRange.min / nights),
              max: Math.round(priceRange.max / nights),
              currency: priceRange.currency,
              display: priceRange.min === priceRange.max 
                ? `${Math.round(priceRange.min / nights)}/night`
                : `${Math.round(priceRange.min / nights)} - ${Math.round(priceRange.max / nights)}/night`
            };
          }

          const images: string[] = [];
          
          if (matchingHotel.hotelInfo?.main_photo) {
            images.push(matchingHotel.hotelInfo.main_photo);
          }
          
          if (!matchingHotel.hotelInfo?.main_photo && matchingHotel.hotelInfo?.thumbnail) {
            images.push(matchingHotel.hotelInfo.thumbnail);
          }
          
          if (matchingHotel.hotelInfo?.images && Array.isArray(matchingHotel.hotelInfo.images)) {
            images.push(...matchingHotel.hotelInfo.images);
          }

          return {
            hotelId: matchingHotel.hotelId,
            name: matchingHotel.hotelInfo?.name || 'Unknown Hotel',
            aiMatchPercent: aiRec.aiMatchPercent,
            whyItMatches: aiRec.whyItMatches,
            starRating: matchingHotel.hotelInfo?.starRating || matchingHotel.hotelInfo?.rating || 0,
            images: images,
            pricePerNight: pricePerNight,
            reviewCount: matchingHotel.hotelInfo?.reviewCount || 0,
            guestInsights: matchingHotel.hotelInfo?.guestInsights || "No guest insights available.",
            funFacts: aiRec.funFacts,
            nearbyAttractions: aiRec.nearbyAttractions || [],
            locationHighlight: aiRec.locationHighlight || "Great location",
            matchType: (aiRec as any).matchType || 'good',
            address: matchingHotel.hotelInfo?.address || 'Address not available',
            amenities: matchingHotel.hotelInfo?.amenities || [],
            description: matchingHotel.hotelInfo?.description || 'No description available',
            coordinates: matchingHotel.hotelInfo?.coordinates || null,
            priceRange: priceRange,
            totalRooms: matchingHotel.roomTypes ? matchingHotel.roomTypes.length : 0,
            hasAvailability: matchingHotel.roomTypes && matchingHotel.roomTypes.length > 0,
            roomTypes: matchingHotel.roomTypes,
            originalHotelData: matchingHotel,
            
            // NEW ENHANCED DATA
            city: city,
            country: country,
            latitude: latitude,
            longitude: longitude,
            topAmenities: topAmenities,
            sentimentData: null // Will be populated in next step
          };
        }).filter(Boolean);

        console.log(`Step 6 ✅: AI selected ${aiRecommendations.length} hotels`);
        
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.log('Raw AI response:', aiResponse);
      }
      
    } catch (aiError) {
      console.error('AI recommendation failed:', aiError);
    }

    // Step 7: Get sentiment analysis and insights for AI-recommended hotels
    if (aiRecommendations.length > 0) {
      console.log('Step 7: Getting sentiment analysis for AI-recommended hotels...');
      const insightsStartTime = Date.now();
      
      const insightsPromises = aiRecommendations.map(async (hotel, index) => {
        try {
          // Add staggered delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, index * 500));
          
          const { insights, reviewCount, sentimentData } = await getGuestInsights(
            hotel.hotelId, 
            hotel.name
          );
          
          return {
            ...hotel,
            reviewCount: reviewCount,
            guestInsights: insights,
            sentimentData: sentimentData
          };
          
        } catch (error) {
          console.warn(`Failed to get insights for ${hotel.name}:`, error);
          
          const fakeReviewCount = Math.floor(Math.random() * (1100 - 700 + 1)) + 700;
          const fallbackInsights = "Guests appreciate the comfortable accommodations and convenient location. Some mention the check-in process could be faster.";
          
          return {
            ...hotel,
            reviewCount: fakeReviewCount,
            guestInsights: fallbackInsights,
            sentimentData: null
          };
        }
      });
      
      // Wait for all insights to complete
      aiRecommendations = await Promise.all(insightsPromises);
      
      console.log(`Step 7 ✅: Completed sentiment analysis in ${Date.now() - insightsStartTime}ms`);
    }

    // Step 8: Final response
    const totalTime = Date.now() - totalStartTime;
    console.log(`🚀 Smart Search Complete in ${totalTime}ms ✅`);

    res.json({
      searchParams: {
        ...parsedQuery,
        nights: nights,
        currency: 'USD'
      },
      totalHotelsFound: hotels.length,
      hotelsWithRates: enrichedHotels.length,
      aiRecommendationsCount: aiRecommendations.length,
      
      // If AI recommendations available, return those first
      ...(aiRecommendations.length > 0 ? {
        recommendations: aiRecommendations,
        allHotels: enrichedHotels,
        aiRecommendationsAvailable: true
      } : {
        hotels: enrichedHotels,
        aiRecommendationsAvailable: false
      }),
      
      generatedAt: new Date().toISOString(),
      searchId: ratesResponse.data?.searchId || null,
      performance: {
        totalTimeMs: totalTime,
        optimized: true
      }
    });

    // Step 9: Log AI recommendations summary with all new data
    if (aiRecommendations.length > 0) {
      console.log('\n🤖 AI RECOMMENDATIONS SUMMARY WITH SENTIMENT ANALYSIS:');
      console.log('='.repeat(70));
      aiRecommendations.forEach((hotel, index) => {
        console.log(`${index + 1}. ${hotel.name}`);
        console.log(`   📊 AI Match: ${hotel.aiMatchPercent}%`);
        console.log(`   🏷️  Match Type: ${hotel.matchType || 'good'}`);
        console.log(`   ⭐ Star Rating: ${hotel.starRating}/5`);
        console.log(`   📍 Location: ${hotel.city}, ${hotel.country}`);
        console.log(`   🗺️  Coordinates: ${hotel.latitude}, ${hotel.longitude}`);
        console.log(`   🏨 Top Amenities: ${hotel.topAmenities.join(', ')}`);
        console.log(`   💡 Why it matches: ${hotel.whyItMatches}`);
        console.log(`   🎯 Fun facts: ${hotel.funFacts.join(' | ')}`);
        console.log(`   📍 Near: ${hotel.nearbyAttractions.join(' | ')}`);
        console.log(`   🏛️  Location: ${hotel.locationHighlight}`);
        
        if (hotel.pricePerNight) {
          console.log(`   💰 Price per night: ${hotel.pricePerNight.display}`);
        }
        
        if (hotel.images && hotel.images.length > 0) {
          console.log(`   🖼️  Images: ${hotel.images.length} available`);
          console.log(`   📸 First image: ${hotel.images[0]}`);
        }
        
        // Sentiment and reviews information
        console.log(`   📝 Reviews: ${hotel.reviewCount || 0} guest reviews`);
        console.log(`   💬 Guest Insights: ${hotel.guestInsights}`);
        
        if (hotel.sentimentData?.sentimentAnalysis) {
          const sentiment = hotel.sentimentData.sentimentAnalysis;
          console.log(`   👍 Top Pros: ${sentiment.pros.slice(0, 3).join(', ')}`);
          console.log(`   👎 Top Cons: ${sentiment.cons.slice(0, 3).join(', ')}`);
          
          // Log top sentiment categories
          const topCategories = sentiment.categories
            .sort((a: SentimentCategory, b: SentimentCategory) => b.rating - a.rating)
            .slice(0, 3);
          console.log(`   📊 Top Categories: ${topCategories.map((cat: SentimentCategory) => `${cat.name} (${cat.rating}/10)`).join(', ')}`);
        }
        
        console.log('');
      });
      console.log('='.repeat(70));
      console.log(`✅ FINAL COUNT: ${aiRecommendations.length} hotels returned with sentiment analysis in ${totalTime}ms`);
      
      // Enhanced summary with sentiment data
      const totalReviews = aiRecommendations.reduce((sum, hotel) => sum + (hotel.reviewCount || 0), 0);
      const hotelsWithSentiment = aiRecommendations.filter(hotel => hotel.sentimentData).length;
      const hotelsWithReviews = aiRecommendations.filter(hotel => (hotel.reviewCount || 0) > 0).length;
      
      console.log(`📊 SENTIMENT SUMMARY: ${hotelsWithSentiment}/${aiRecommendations.length} hotels have sentiment analysis`);
      console.log(`📊 REVIEWS SUMMARY: ${totalReviews} total reviews across ${hotelsWithReviews}/${aiRecommendations.length} hotels`);
      console.log(`⚡ PERFORMANCE: Optimized search with sentiment analysis completed in ${totalTime}ms`);
      
      // Log overall sentiment trends
      const allPros = aiRecommendations
        .filter(hotel => hotel.sentimentData?.sentimentAnalysis?.pros)
        .flatMap(hotel => hotel.sentimentData!.sentimentAnalysis.pros);
      const allCons = aiRecommendations
        .filter(hotel => hotel.sentimentData?.sentimentAnalysis?.cons)
        .flatMap(hotel => hotel.sentimentData!.sentimentAnalysis.cons);
        
      if (allPros.length > 0 || allCons.length > 0) {
        console.log(`📈 OVERALL TRENDS:`);
        if (allPros.length > 0) {
          const topPros = [...new Set(allPros)].slice(0, 5);
          console.log(`   👍 Most mentioned positives: ${topPros.join(', ')}`);
        }
        if (allCons.length > 0) {
          const topCons = [...new Set(allCons)].slice(0, 5);
          console.log(`   👎 Most mentioned negatives: ${topCons.join(', ')}`);
        }
      }
    }

  } catch (error) {
    console.error('Error in optimized smart hotel search:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        res.status(error.response.status).json({
          error: 'API error',
          message: error.response.data?.message || error.response.data?.error?.description || 'Unknown API error',
          details: error.response.data,
          step: error.config?.url?.includes('/parse') ? 'parsing' : 
                error.config?.url?.includes('/data/hotels') ? 'hotel_search' : 'rates_search'
        });
        return;
      }
    }

    res.status(500).json({ 
      error: 'Smart search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};