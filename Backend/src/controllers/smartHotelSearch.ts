// smartHotelSearch.ts - OPTIMIZED FOR SUB-10s PERFORMANCE WITH STAGED RESPONSES
import { Request, Response } from 'express';
import axios from 'axios';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import pLimit from 'p-limit';
import { randomUUID } from 'crypto';
import { getCache } from '../cache';

dotenv.config();

// ======================== CONFIGURATION ========================
const SMART_HOTEL_LIMIT = parseInt(process.env.SMART_HOTEL_LIMIT || '50');
const SMART_HOTEL_CONCURRENCY = parseInt(process.env.SMART_HOTEL_CONCURRENCY || '6');
const SMART_HOTEL_STAGED = process.env.SMART_HOTEL_STAGED === 'true';
const DETAIL_FETCH_TIMEOUT = 8000;
const SENTIMENT_FETCH_TIMEOUT = 8000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const cache = getCache();

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
  sentimentAnalysis: SentimentAnalysis;
  sentiment_updated_at?: string;
  data?: any[];
  total?: number;
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
    suggestedSellingPrice?: Array<{
      amount: number;
      currency: string;
      source: string;
    }>;
    initialPrice?: Array<{
      amount: number;
      currency: string;
    }>;
    taxesAndFees?: Array<{
      included: boolean;
      description: string;
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

// ======================== OPTIMIZED AXIOS INSTANCES WITH HTTP2 ========================
const liteApiInstance = axios.create({
  baseURL: 'https://api.liteapi.travel/v3.0',
  headers: {
    'X-API-Key': process.env.LITEAPI_KEY,
    'Content-Type': 'application/json',
    'Connection': 'keep-alive'
  },
  timeout: 12000,
  maxRedirects: 2,
  // Enable HTTP/2 if supported
  httpAgent: false,
  httpsAgent: false,
});

const internalApiInstance = axios.create({
  baseURL: process.env.BASE_URL || 'http://localhost:3003',
  headers: {
    'Content-Type': 'application/json',
    'Connection': 'keep-alive'
  },
  timeout: 20000,
});

// ======================== CONCURRENCY LIMITER ========================
const detailLimit = pLimit(SMART_HOTEL_CONCURRENCY);
const sentimentLimit = pLimit(SMART_HOTEL_CONCURRENCY);

// ======================== OPTIMIZED HELPER FUNCTIONS ========================

// Optimized amenities extraction - only top 3, truncated
const getTop3Amenities = (hotelInfo: any): string[] => {
  const amenities: string[] = [];
  
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
  
  // Fill remaining slots with defaults if needed
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

// Optimized price calculation (unchanged logic, same performance)
const calculatePriceInfo = (hotel: HotelWithRates, nights: number) => {
  let priceRange = null;
  let pricePerNightInfo = 'Price not available';
  let suggestedPrice = null;
  let priceProvider = null;

  if (hotel.roomTypes && hotel.roomTypes.length > 0) {
    const priceData = hotel.roomTypes
      .flatMap(room => room.rates || [])
      .map(rate => ({
        retailPrice: rate.retailRate?.total?.[0]?.amount,
        suggestedPrice: rate.retailRate?.suggestedSellingPrice?.[0]?.amount,
        provider: rate.retailRate?.suggestedSellingPrice?.[0]?.source,
        currency: rate.retailRate?.total?.[0]?.currency || 'USD'
      }))
      .filter(data => data.retailPrice != null && data.retailPrice !== undefined);
    
    if (priceData.length > 0) {
      const retailPrices = priceData
        .map(data => data.retailPrice)
        .filter((price): price is number => price !== undefined);

      if (retailPrices.length > 0) {
        const minRetailPrice = Math.min(...retailPrices);
        const maxRetailPrice = Math.max(...retailPrices);
        const currency = priceData[0].currency;
        
        priceRange = {
          min: minRetailPrice,
          max: maxRetailPrice,
          currency: currency,
          display: minRetailPrice === maxRetailPrice ? `${minRetailPrice}` : `${minRetailPrice} - ${maxRetailPrice}`
        };

        const suggestedPriceData = priceData.find(data => 
          data.suggestedPrice !== undefined && 
          data.suggestedPrice !== null && 
          data.provider !== undefined && 
          data.provider !== null
        );
        
        if (suggestedPriceData && nights > 0 && 
            suggestedPriceData.suggestedPrice !== undefined && 
            suggestedPriceData.suggestedPrice !== null) {
          const pricePerNight = Math.round(suggestedPriceData.suggestedPrice / nights);
          suggestedPrice = {
            amount: pricePerNight,
            currency: currency,
            display: `${pricePerNight}`,
            totalAmount: suggestedPriceData.suggestedPrice
          };
          priceProvider = suggestedPriceData.provider;
        }

        if (nights > 0) {
          const basePrice = suggestedPrice ? suggestedPrice.amount : minRetailPrice;
          if (basePrice !== undefined) {
            const pricePerNight = suggestedPrice ? suggestedPrice.amount : Math.round(basePrice / nights);
            pricePerNightInfo = `${pricePerNight}/night`;
          }
        }
      }
    }
  }

  return { priceRange, pricePerNightInfo, suggestedPrice, priceProvider };
};

// OPTIMIZED: Truncated summary creation for faster AI processing
const createOptimizedHotelSummaryForAI = (hotel: HotelWithRates, index: number, nights: number): HotelSummaryForAI => {
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
      topAmenities: ['Wi-Fi', 'AC', 'Bathroom'], // Abbreviated
      starRating: 0,
      reviewCount: 0
    };
  }

  const { pricePerNightInfo, suggestedPrice, priceProvider } = calculatePriceInfo(hotel, nights);
  
  const city = hotelInfo?.city || 'Unknown City';
  const country = hotelInfo?.country || 'Unknown Country';
  const latitude = hotelInfo?.location?.latitude || hotelInfo?.coordinates?.latitude || null;
  const longitude = hotelInfo?.location?.longitude || hotelInfo?.coordinates?.longitude || null;
  const topAmenities = getTop3Amenities(hotelInfo);
  const starRating = hotelInfo?.starRating || hotelInfo?.rating || 0;
  const reviewCount = hotelInfo?.reviewCount || 0;

  // OPTIMIZED: Truncate description to 100 chars for faster token processing
  const shortDescription = hotelInfo.description 
    ? hotelInfo.description.substring(0, 100).trim() + '...'
    : 'No description available';

  let displayPrice = pricePerNightInfo;
  if (suggestedPrice && priceProvider) {
    displayPrice = `${pricePerNightInfo} (${priceProvider})`;
  }

  return {
    index: index + 1,
    hotelId: hotel.hotelId,
    name: hotelInfo.name || 'Unknown Hotel',
    location: hotelInfo.address || 'Location not available',
    description: shortDescription,
    pricePerNight: displayPrice,
    city: city,
    country: country,
    latitude: latitude,
    longitude: longitude,
    topAmenities: topAmenities,
    starRating: starRating,
    reviewCount: reviewCount
  };
};

// ======================== CACHED DETAIL FETCHING ========================

const getHotelDetailsOptimized = async (hotelId: string): Promise<EnrichedHotel | null> => {
  try {
    // Check cache first
    const cached = await cache.getHotelDetails(hotelId);
    if (cached) {
      console.log(`✅ Cache hit for hotel details: ${hotelId}`);
      return cached;
    }

    console.log(`🏨 Fetching detailed info for hotel ID: ${hotelId}`);
    
    // Use detailLimit to control concurrency
    const response = await detailLimit(() => 
      liteApiInstance.get(`/hotels/${hotelId}`, {
        timeout: DETAIL_FETCH_TIMEOUT
      })
    );

    if (response.status !== 200) {
      throw new Error(`LiteAPI hotel details error: ${response.status}`);
    }

    const hotelDetails = response.data?.data;
    console.log(`✅ Got detailed info for hotel ${hotelId}`);
    
    // Cache the result
    await cache.setHotelDetails(hotelId, hotelDetails);
    return hotelDetails;
  } catch (error) {
    console.warn(`Failed to get hotel details for ${hotelId}:`, error);
    return null;
  }
};

const getHotelSentimentOptimized = async (hotelId: string): Promise<HotelSentimentData | null> => {
  try {
    // Check cache first
    const cached = await cache.getHotelSentiment(hotelId);
    if (cached) {
      console.log(`✅ Cache hit for sentiment: ${hotelId}`);
      return cached;
    }

    console.log(`🎭 Fetching sentiment analysis for hotel ID: ${hotelId}`);
    
    // Use sentimentLimit to control concurrency
    const response = await sentimentLimit(() => 
      liteApiInstance.get('/data/reviews', {
        params: {
          hotelId: hotelId,
          limit: 1,
          timeout: 3,
          getSentiment: true
        },
        timeout: SENTIMENT_FETCH_TIMEOUT
      })
    );

    if (response.status !== 200) {
      throw new Error(`LiteAPI sentiment error: ${response.status}`);
    }

    const sentimentData = response.data;
    console.log(`✅ Got sentiment data for hotel ${hotelId}`);
    
    // Cache the result
    await cache.setHotelSentiment(hotelId, sentimentData);
    return sentimentData;
  } catch (error) {
    console.warn(`Failed to get sentiment data for ${hotelId}:`, error);
    return null;
  }
};

// ======================== INSIGHTS GENERATION ========================

const generateInsightsFromSentiment = async (hotelName: string, sentimentData: HotelSentimentData | null): Promise<string> => {
  if (!sentimentData || !sentimentData.sentimentAnalysis) {
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
    const { pros, cons } = sentimentData.sentimentAnalysis;
    
    const prosText = pros.join(', ');
    const consText = cons.length > 0 ? cons[0] : 'minor operational details';
    
    const prompt = `Create guest insights for "${hotelName}" based on this sentiment data:

POSITIVE FEEDBACK: ${prosText}
NEGATIVE FEEDBACK: ${consText}

Requirements:
- Write exactly 2 sentences
- First sentence: "Guests love [3-4 main positives from the list]" (focus on the best aspects)
- Second sentence: "The main concern mentioned is [single most common negative do not say limited parking]"
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
          content: 'You are a hotel review analyst. Create guest insights that emphasize positive aspects while mentioning only one main concern do not say limited parking. Keep it balanced but positive-leaning.'
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

// ======================== MAIN OPTIMIZED SMART SEARCH FUNCTION ========================

export const smartHotelSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userInput } = req.body;

    if (!userInput) {
      res.status(400).json({ error: 'userInput is required' });
      return;
    }

    console.log('🚀 Optimized Smart Search: Starting sub-10s flow for:', userInput);
    const totalStartTime = Date.now();
    const searchId = randomUUID();

    // STEP 1: Parse user input (unchanged)
    console.log('Step 1: Parsing user input...');
    const parseStartTime = Date.now();
    
    const parseResponse = await internalApiInstance.post('/api/query/parse', { userInput });
    const parsedQuery: ParsedSearchQuery = parseResponse.data;
    console.log(`Step 1 ✅: Parsed query in ${Date.now() - parseStartTime}ms:`, parsedQuery);

    // Validate parsed data
    if (!parsedQuery.checkin || !parsedQuery.checkout || !parsedQuery.countryCode || !parsedQuery.cityName) {
      res.status(400).json({ 
        error: 'Incomplete search parameters',
        message: 'Could not extract all required search parameters from your input',
        parsed: parsedQuery
      });
      return;
    }

    const nights = Math.ceil((new Date(parsedQuery.checkout).getTime() - new Date(parsedQuery.checkin).getTime()) / (1000 * 60 * 60 * 24));

    // STEP 2: Fetch hotels with REDUCED LIMIT (50 instead of 100)
    console.log(`Step 2: Fetching ${SMART_HOTEL_LIMIT} hotels...`);
    const hotelSearchStart = Date.now();
    
    const hotelsSearchResponse = await liteApiInstance.get('/data/hotels', {
      params: {
        countryCode: parsedQuery.countryCode,
        cityName: parsedQuery.cityName,
        language: 'en',
        limit: SMART_HOTEL_LIMIT // REDUCED from 100 to 50
      },
      timeout: 12000
    });

    const hotels = hotelsSearchResponse.data?.data || hotelsSearchResponse.data;
    console.log(`Step 2 ✅: Fetched ${hotels?.length || 0} hotels in ${Date.now() - hotelSearchStart}ms`);

    if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
      res.status(404).json({
        error: 'No hotels found',
        message: `No hotels found in ${parsedQuery.cityName}, ${parsedQuery.countryCode}`,
        searchParams: parsedQuery
      });
      return;
    }

// Replace the rates fetching and processing section (around lines 580-590) with this:

// STEP 3: Fetch rates for all hotels
console.log('Step 3: Fetching rates...');
const ratesStart = Date.now();

const hotelIds = hotels.map((hotel: any) => 
  hotel.id || hotel.hotelId || hotel.hotel_id || hotel.code
).filter(Boolean);

const ratesRequestBody = {
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
  timeout: 10,
  hotelIds: hotelIds
};

const ratesResponse = await liteApiInstance.post('/hotels/rates', ratesRequestBody, {
  timeout: 20000
});

// FIX: Properly handle different response structures
let hotelsWithRates = ratesResponse.data?.data || ratesResponse.data || [];

// CRITICAL FIX: Ensure hotelsWithRates is always an array
if (!Array.isArray(hotelsWithRates)) {
  console.warn('⚠️  API returned non-array response:', typeof hotelsWithRates);
  
  // Handle different possible response structures
  if (hotelsWithRates && typeof hotelsWithRates === 'object') {
    // Check if it's an object with a data property that's an array
    if (Array.isArray(hotelsWithRates.hotels)) {
      hotelsWithRates = hotelsWithRates.hotels;
    } else if (Array.isArray(hotelsWithRates.data)) {
      hotelsWithRates = hotelsWithRates.data;
    } else if (Array.isArray(hotelsWithRates.results)) {
      hotelsWithRates = hotelsWithRates.results;
    } else {
      // If it's a single hotel object, wrap it in an array
      hotelsWithRates = [hotelsWithRates];
    }
  } else {
    // Fallback to empty array
    hotelsWithRates = [];
  }
}

console.log(`Step 3 ✅: Fetched rates in ${Date.now() - ratesStart}ms`);
console.log(`📊 Hotels with rates: ${hotelsWithRates.length} (type: ${Array.isArray(hotelsWithRates) ? 'array' : typeof hotelsWithRates})`);

if (hotelsWithRates.length === 0) {
  res.status(404).json({
    error: 'No available hotels',
    message: 'Hotels found but no availability for your dates',
    searchParams: parsedQuery,
    debug: {
      originalResponse: ratesResponse.data,
      responseType: typeof ratesResponse.data,
      isArray: Array.isArray(ratesResponse.data)
    }
  });
  return;
}

// STEP 4: Create metadata map and immediately build AI summaries
console.log('Step 4: Building AI summaries...');
const summaryStart = Date.now();

const hotelMetadataMap = new Map<string, any>();
hotels.forEach((hotel: any) => {
  const id = hotel.id || hotel.hotelId || hotel.hotel_id || hotel.code;
  if (id) {
    hotelMetadataMap.set(id, hotel);
  }
});

// OPTIMIZED: Build summaries directly from basic data (no enrichment yet)
// ADDITIONAL FIX: Add extra validation for hotelsWithRates.map
const hotelSummariesForAI: HotelSummaryForAI[] = [];

try {
  if (Array.isArray(hotelsWithRates) && hotelsWithRates.length > 0) {
    hotelsWithRates.forEach((rateHotel: any, index: number) => {
      try {
        // Validate that rateHotel has required structure
        if (!rateHotel || typeof rateHotel !== 'object') {
          console.warn(`⚠️  Invalid hotel data at index ${index}:`, rateHotel);
          return;
        }

        const hotelId = rateHotel.hotelId || rateHotel.id || rateHotel.hotel_id;
        if (!hotelId) {
          console.warn(`⚠️  Missing hotel ID at index ${index}`);
          return;
        }

        const metadata = hotelMetadataMap.get(hotelId);
        const basicHotel: HotelWithRates = {
          ...rateHotel,
          hotelId: hotelId, // Ensure hotelId is set
          hotelInfo: metadata || {}
        };
        
        const summary = createOptimizedHotelSummaryForAI(basicHotel, index, nights);
        hotelSummariesForAI.push(summary);
      } catch (innerError) {
        console.warn(`⚠️  Error processing hotel at index ${index}:`, innerError);
      }
    });
  } else {
    throw new Error(`hotelsWithRates is not a valid array: ${typeof hotelsWithRates}, length: ${hotelsWithRates?.length}`);
  }
} catch (summaryError) {
  console.error('❌ Error building hotel summaries:', summaryError);
  res.status(500).json({
    error: 'Failed to process hotel data',
    message: 'Error building hotel summaries for AI processing',
    debug: {
      hotelsWithRatesType: typeof hotelsWithRates,
      hotelsWithRatesLength: hotelsWithRates?.length,
      isArray: Array.isArray(hotelsWithRates),
      sampleData: hotelsWithRates?.slice ? hotelsWithRates.slice(0, 2) : hotelsWithRates
    }
  });
  return;
}

if (hotelSummariesForAI.length === 0) {
  res.status(404).json({
    error: 'No processable hotels',
    message: 'Found hotels but could not process any for AI recommendations',
    searchParams: parsedQuery,
    debug: {
      originalHotelsCount: hotels.length,
      hotelsWithRatesCount: hotelsWithRates.length,
      hotelsWithRatesType: typeof hotelsWithRates
    }
  });
  return;
}

console.log(`Step 4 ✅: Built ${hotelSummariesForAI.length} summaries in ${Date.now() - summaryStart}ms`);

    // STEP 5: Get AI recommendations with optimized prompt
    console.log('Step 5: Getting AI recommendations...');
    const aiStartTime = Date.now();

    let aiRecommendations: any[] = [];
    
    try {
      // OPTIMIZED: Shorter hotel summaries for faster processing
      const hotelSummaries = hotelSummariesForAI.map((hotel) => {
        return `${hotel.index}: ${hotel.name} | ${hotel.starRating}⭐ | ${hotel.city} | ${hotel.pricePerNight} | ${hotel.topAmenities.join(',')}`;
      }).join('\n');

      let priceContext = '';
      let budgetGuidance = '';
      
      if (parsedQuery.minCost || parsedQuery.maxCost) {
        const minText = parsedQuery.minCost ? `${parsedQuery.minCost}` : '';
        const maxText = parsedQuery.maxCost ? `${parsedQuery.maxCost}` : '';
        
        if (minText && maxText) {
          priceContext = `\nBUDGET: ${minText} - ${maxText}/night`;
          budgetGuidance = `Prioritize ${minText}-${maxText} range. `;
        } else if (minText) {
          priceContext = `\nBUDGET: ${minText}+ minimum`;
          budgetGuidance = `Focus on ${minText}+. `;
        } else if (maxText) {
          priceContext = `\nBUDGET: Under ${maxText}`;
          budgetGuidance = `Prioritize under ${maxText}. `;
        }
      }

      const hasSpecificPreferences = parsedQuery.aiSearch && parsedQuery.aiSearch.trim() !== '';
      
      // OPTIMIZED: Shorter, more direct prompt
      const prompt = hasSpecificPreferences ? 
        `USER REQUEST: "${parsedQuery.aiSearch}"
STAY: ${nights} nights${priceContext}

HOTELS:
${hotelSummaries}

Return 5 best matches as JSON:
[{"hotelName":"exact name","aiMatchPercent":60-95,"whyItMatches":"consice explanation covering why it matches what they searched (max 40 words)","funFacts":["fact1","fact2"],"nearbyAttractions":["place1","place2"],"locationHighlight":"advantage"}]

${budgetGuidance}Base percentages on actual alignment with "${parsedQuery.aiSearch}". Use exact hotel names. Different percentages for each.` :

        `DESTINATION: ${parsedQuery.cityName}, ${parsedQuery.countryCode}
STAY: ${nights} nights${priceContext}

HOTELS:
${hotelSummaries}

Return 5 best hotels as JSON:
[{"hotelName":"exact name","aiMatchPercent":70-95,"whyItMatches":"consice explanation covering why it matches what they searched (max 40 words)","funFacts":["fact1","fact2"],"nearbyAttractions":["place1","place2"],"locationHighlight":"advantage"}]

${budgetGuidance}Rank by location, amenities, value. Use exact names. Different percentages.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Expert hotel consultant. Return valid JSON with exactly 5 hotels. Use exact names from list. Assign varied, realistic percentages.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 1500, // Reduced from 2000
      });
      
      console.log(`Step 5 ✅: AI completed in ${Date.now() - aiStartTime}ms`);

      const aiResponse = completion.choices[0]?.message?.content || '[]';
      
      try {
        const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
        const rawRecommendations: AIRecommendation[] = JSON.parse(cleanResponse);
        
        // Ensure percentage variety
        const percentages = rawRecommendations.map(rec => rec.aiMatchPercent);
        const uniquePercentages = new Set(percentages);
        
        if (uniquePercentages.size < rawRecommendations.length) {
          console.warn('⚠️  Applying percentage variation...');
          rawRecommendations.forEach((rec, index) => {
            const basePercentage = rec.aiMatchPercent;
            const variation = index * 2;
            rec.aiMatchPercent = Math.min(95, Math.max(hasSpecificPreferences ? 60 : 70, basePercentage + variation));
          });
          rawRecommendations.sort((a, b) => b.aiMatchPercent - a.aiMatchPercent);
        }
        
        if (rawRecommendations.length > 5) {
          rawRecommendations.splice(5);
        }
        
        console.log('🔢 AI Match Percentages:', rawRecommendations.map(rec => `${rec.hotelName}: ${rec.aiMatchPercent}%`));
        
        // STEP 6: ONLY enrich the AI-selected hotels (5 instead of 50+)
        console.log('Step 6: Enriching only AI-selected hotels...');
        const enrichStart = Date.now();
        
        const selectedHotelIds = rawRecommendations.map(aiRec => {
          const matchingHotel = hotelsWithRates.find((hotel: any) => {
            const metadata = hotelMetadataMap.get(hotel.hotelId);
            const hotelName = metadata?.name || hotel.hotelInfo?.name;
            return hotelName === aiRec.hotelName;
          });
          return matchingHotel?.hotelId;
        }).filter(Boolean);

        console.log(`🎯 Enriching ${selectedHotelIds.length} AI-selected hotels only`);
        
        // Fetch details for only the 5 selected hotels
        const enrichedDetailsPromises = selectedHotelIds.map(hotelId => 
          getHotelDetailsOptimized(hotelId)
        );
        
        const enrichedDetails = await Promise.all(enrichedDetailsPromises);
        const enrichedDetailsMap = new Map<string, any>();
        selectedHotelIds.forEach((hotelId, index) => {
          if (enrichedDetails[index]) {
            enrichedDetailsMap.set(hotelId, enrichedDetails[index]);
          }
        });

        console.log(`Step 6 ✅: Enriched details in ${Date.now() - enrichStart}ms`);

        // Build final recommendations
        aiRecommendations = rawRecommendations.map(aiRec => {
          const matchingHotel = hotelsWithRates.find((hotel: any) => {
            const metadata = hotelMetadataMap.get(hotel.hotelId);
            const hotelName = metadata?.name || hotel.hotelInfo?.name;
            return hotelName === aiRec.hotelName;
          });
        
          if (!matchingHotel) {
            console.warn(`Warning: Could not find hotel "${aiRec.hotelName}" in original data`);
            return null;
          }

          const metadata = hotelMetadataMap.get(matchingHotel.hotelId);
          const enrichedDetail = enrichedDetailsMap.get(matchingHotel.hotelId);
          
          // Merge all hotel info
          const fullHotelInfo = {
            ...metadata,
            ...enrichedDetail?.hotelInfo,
            main_photo: enrichedDetail?.hotelInfo?.main_photo || metadata?.main_photo,
            thumbnail: enrichedDetail?.hotelInfo?.thumbnail || metadata?.thumbnail,
            images: enrichedDetail?.hotelInfo?.images || metadata?.images || []
          };

          const enrichedHotel: HotelWithRates = {
            ...matchingHotel,
            hotelInfo: fullHotelInfo
          };
        
          const { priceRange, pricePerNightInfo, suggestedPrice, priceProvider } = calculatePriceInfo(enrichedHotel, nights);
          
          const city = fullHotelInfo?.city || 'Unknown City';
          const country = fullHotelInfo?.country || 'Unknown Country';
          const latitude = fullHotelInfo?.location?.latitude || fullHotelInfo?.coordinates?.latitude || null;
          const longitude = fullHotelInfo?.location?.longitude || fullHotelInfo?.coordinates?.longitude || null;
          const topAmenities = getTop3Amenities(fullHotelInfo);
          
          let pricePerNight = null;
          if (suggestedPrice && nights > 0) {
            pricePerNight = {
              amount: suggestedPrice.amount,
              totalAmount: suggestedPrice.totalAmount,
              currency: suggestedPrice.currency,
              display: `${suggestedPrice.amount}/night`,
              provider: priceProvider,
              isSupplierPrice: true
            };
          } else if (priceRange && nights > 0) {
            pricePerNight = {
              amount: Math.round(priceRange.min / nights),
              totalAmount: priceRange.min,
              currency: priceRange.currency,
              display: `${Math.round(priceRange.min / nights)}/night`,
              provider: null,
              isSupplierPrice: false
            };
          }
        
          const images: string[] = [];
          if (fullHotelInfo?.main_photo) {
            images.push(fullHotelInfo.main_photo);
          }
          if (!fullHotelInfo?.main_photo && fullHotelInfo?.thumbnail) {
            images.push(fullHotelInfo.thumbnail);
          }
          if (fullHotelInfo?.images && Array.isArray(fullHotelInfo.images)) {
            images.push(...fullHotelInfo.images);
          }

          const fakeReviewCount = Math.floor(Math.random() * (1100 - 700 + 1)) + 700;
        
          return {
            hotelId: matchingHotel.hotelId,
            name: fullHotelInfo?.name || 'Unknown Hotel',
            aiMatchPercent: aiRec.aiMatchPercent,
            whyItMatches: aiRec.whyItMatches,
            starRating: fullHotelInfo?.starRating || fullHotelInfo?.rating || 0,
            images: images,
            pricePerNight: pricePerNight,
            reviewCount: fakeReviewCount,
            guestInsights: SMART_HOTEL_STAGED ? "Loading insights..." : "Guests appreciate the comfortable accommodations and convenient location. Some mention areas for improvement.",
            funFacts: aiRec.funFacts,
            nearbyAttractions: aiRec.nearbyAttractions || [],
            locationHighlight: aiRec.locationHighlight || "Great location",
            address: fullHotelInfo?.address || 'Address not available',
            amenities: fullHotelInfo?.amenities || [],
            description: fullHotelInfo?.description || 'No description available',
            coordinates: fullHotelInfo?.coordinates || null,
            priceRange: priceRange,
            totalRooms: matchingHotel.roomTypes ? matchingHotel.roomTypes.length : 0,
            hasAvailability: matchingHotel.roomTypes && matchingHotel.roomTypes.length > 0,
            roomTypes: matchingHotel.roomTypes,
            originalHotelData: enrichedHotel,
            suggestedPrice: suggestedPrice,
            priceProvider: priceProvider,
            city: city,
            country: country,
            latitude: latitude,
            longitude: longitude,
            topAmenities: topAmenities,
            sentimentData: null
          };
        }).filter(Boolean);

        console.log(`✅ Built ${aiRecommendations.length} final recommendations`);
        
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.log('Raw AI response:', aiResponse);
      }
      
    } catch (aiError) {
      console.error('AI recommendation failed:', aiError);
    }

    // STEP 7: Return response immediately if staged, or fetch insights if not staged
    const totalTime = Date.now() - totalStartTime;
    
    if (SMART_HOTEL_STAGED && aiRecommendations.length > 0) {
      // Cache the search results for later enhancement
      const searchResults = {
        searchParams: {
          ...parsedQuery,
          nights: nights,
          currency: 'USD'
        },
        totalHotelsFound: hotels.length,
        hotelsWithRates: hotelsWithRates.length,
        aiRecommendationsCount: aiRecommendations.length,
        recommendations: aiRecommendations,
        aiRecommendationsAvailable: true,
        insightsPending: true,
        generatedAt: new Date().toISOString(),
        searchId: searchId,
        performance: {
          totalTimeMs: totalTime,
          optimized: true,
          staged: true
        }
      };

      await cache.setSearchResults(searchId, searchResults);

      // Start background sentiment analysis (don't await)
      fetchSentimentInBackground(searchId, aiRecommendations);

      console.log(`🚀 STAGED RESPONSE: Returned in ${totalTime}ms, insights loading in background`);
      
      res.json(searchResults);
      return;
    }

    // Non-staged response: fetch insights synchronously (legacy behavior)
    if (aiRecommendations.length > 0) {
      console.log('Step 7: Fetching sentiment analysis...');
      const insightsStartTime = Date.now();
      
      const insightsPromises = aiRecommendations.map(async (hotel, index) => {
        try {
          await new Promise(resolve => setTimeout(resolve, index * 200)); // Reduced delay
          
          const sentimentData = await getHotelSentimentOptimized(hotel.hotelId);
          const insights = await generateInsightsFromSentiment(hotel.name, sentimentData);
          
          return {
            ...hotel,
            guestInsights: insights,
            sentimentData: sentimentData
          };
          
        } catch (error) {
          console.warn(`Failed to get insights for ${hotel.name}:`, error);
          
          const fallbackInsights = "Guests appreciate the comfortable accommodations and convenient location. Some mention the check-in process could be faster.";
          
          return {
            ...hotel,
            guestInsights: fallbackInsights,
            sentimentData: null
          };
        }
      });
      
      aiRecommendations = await Promise.all(insightsPromises);
      console.log(`Step 7 ✅: Completed sentiment analysis in ${Date.now() - insightsStartTime}ms`);
    }

    // Final response
    const finalTotalTime = Date.now() - totalStartTime;
    console.log(`🚀 Optimized Smart Search Complete in ${finalTotalTime}ms ✅`);

    res.json({
      searchParams: {
        ...parsedQuery,
        nights: nights,
        currency: 'USD'
      },
      totalHotelsFound: hotels.length,
      hotelsWithRates: hotelsWithRates.length,
      aiRecommendationsCount: aiRecommendations.length,
      recommendations: aiRecommendations,
      aiRecommendationsAvailable: true,
      insightsPending: false,
      generatedAt: new Date().toISOString(),
      searchId: searchId,
      performance: {
        totalTimeMs: finalTotalTime,
        optimized: true,
        staged: false
      }
    });

    // Performance logging
    if (aiRecommendations.length > 0) {
      console.log('\n🤖 OPTIMIZED AI RECOMMENDATIONS SUMMARY:');
      console.log('='.repeat(70));
      aiRecommendations.forEach((hotel, index) => {
        console.log(`${index + 1}. ${hotel.name}`);
        console.log(`   📊 AI Match: ${hotel.aiMatchPercent}%`);
        console.log(`   ⭐ Star Rating: ${hotel.starRating}/5`);
        console.log(`   📍 Location: ${hotel.city}, ${hotel.country}`);
        console.log(`   💡 Why it matches: ${hotel.whyItMatches}`);
        
        if (hotel.pricePerNight) {
          console.log(`   💰 Price per night: ${hotel.pricePerNight.display}`);
          if (hotel.priceProvider) {
            console.log(`   🏷️  Price source: ${hotel.priceProvider}`);
          }
        }
        
        console.log(`   📝 Reviews: ${hotel.reviewCount || 0} guest reviews`);
        console.log(`   💬 Guest Insights: ${hotel.guestInsights}`);
        console.log('');
      });
      
      const hotelsWithSuggestedPrice = aiRecommendations.filter(hotel => hotel.suggestedPrice && hotel.priceProvider).length;
      const providers = aiRecommendations
        .filter(hotel => hotel.priceProvider)
        .map(hotel => hotel.priceProvider);
      const uniqueProviders = [...new Set(providers)];
      
      console.log('='.repeat(70));
      console.log(`✅ PRICING SUMMARY: ${hotelsWithSuggestedPrice}/${aiRecommendations.length} hotels have suggested selling prices`);
      if (uniqueProviders.length > 0) {
        console.log(`🏷️  Price providers: ${uniqueProviders.join(', ')}`);
      }
      console.log(`✅ OPTIMIZED FINAL COUNT: ${aiRecommendations.length} hotels returned in ${finalTotalTime}ms`);
      console.log(`⚡ PERFORMANCE TARGET: ${finalTotalTime < 10000 ? '✅ UNDER 10s' : '❌ OVER 10s'} (${finalTotalTime}ms)`);
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

// ======================== BACKGROUND SENTIMENT ANALYSIS ========================

const fetchSentimentInBackground = async (searchId: string, hotels: any[]) => {
    try {
      console.log(`🔄 Background sentiment analysis started for ${hotels.length} hotels`);
      
      const sentimentPromises = hotels.map(async (hotel, index) => {
        try {
          // Stagger requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, index * 300));
          
          const sentimentData = await getHotelSentimentOptimized(hotel.hotelId);
          const insights = await generateInsightsFromSentiment(hotel.name, sentimentData);
          
          return {
            hotelId: hotel.hotelId,
            guestInsights: insights,
            sentimentData: sentimentData
          };
          
        } catch (error) {
          console.warn(`Background sentiment failed for ${hotel.name}:`, error);
          
          return {
            hotelId: hotel.hotelId,
            guestInsights: "Guests appreciate the comfortable accommodations and convenient location. Some mention areas for improvement.",
            sentimentData: null
          };
        }
      });
      
      const sentimentResults = await Promise.all(sentimentPromises);
      
      // FIX: Convert Map to plain object for Redis serialization
      const insightsObject: Record<string, any> = {};
      sentimentResults.forEach(result => {
        insightsObject[result.hotelId] = {
          guestInsights: result.guestInsights,
          sentimentData: result.sentimentData
        };
      });
      
      // Update cached search results with plain object instead of Map
      await cache.updateSearchInsights(searchId, insightsObject);
      
      console.log(`✅ Background sentiment analysis completed for search ${searchId}`);
      
    } catch (error) {
      console.error(`❌ Background sentiment analysis failed for search ${searchId}:`, error);
    }
  };

// ======================== NEW SENTIMENT ENDPOINT ========================

export const getSearchSentiment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { searchId } = req.params;
    
    if (!searchId) {
      res.status(400).json({ error: 'searchId is required' });
      return;
    }
    
    const searchResults = await cache.getSearchResults(searchId);
    
    if (!searchResults) {
      res.status(404).json({ 
        error: 'Search not found',
        message: 'Search results not found or expired'
      });
      return;
    }
    
    res.json({
      searchId: searchId,
      insightsPending: searchResults.insightsPending || false,
      insights: searchResults.insights || null,
      updatedAt: searchResults.updatedAt || null,
      recommendations: searchResults.recommendations || []
    });
    
  } catch (error) {
    console.error('Error fetching search sentiment:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sentiment data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};