import { Request, Response } from 'express';
import axios from 'axios';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { 
  ParsedSearchQuery, 
  HotelWithRates
} from '../types/hotel';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface HotelRelevanceScore {
  hotelId: string;
  hotelName: string;
  relevanceScore: number;
}

interface EnrichedHotel {
  hotelId: string;
  name: string;
  description: string;
  starRating: number;
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  images: string[];
  pricePerNight: number | null;
  currency: string;
  relevanceScore: number;
  isRefundable: boolean;
  roomTypes: any[];
}

interface BudgetSortedResults {
  inBudget: EnrichedHotel[];
  outOfBudget: EnrichedHotel[];
  totalProcessed: number;
  searchParams: any;
  performance: {
    totalTimeMs: number;
    hotelsInitialFetch: number;
    hotelsWithRates: number;
    relevanceScoring: string;
    parallelProcessing: boolean;
  };
}

// OpenAI instance
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Optimized axios instances
const liteApiInstance = axios.create({
  baseURL: 'https://api.liteapi.travel/v3.0',
  headers: {
    'X-API-Key': process.env.LITEAPI_KEY,
    'Content-Type': 'application/json',
    'Connection': 'keep-alive'
  },
  timeout: 15000,
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

// Helper function to extract hotel images
const extractHotelImages = (hotelInfo: any): string[] => {
  const images: string[] = [];
  
  if (hotelInfo?.main_photo) {
    images.push(hotelInfo.main_photo);
  }
  
  if (hotelInfo?.thumbnail && hotelInfo.thumbnail !== hotelInfo?.main_photo) {
    images.push(hotelInfo.thumbnail);
  }
  
  if (hotelInfo?.hotelImages && Array.isArray(hotelInfo.hotelImages)) {
    const imageUrls = hotelInfo.hotelImages
      .slice(0, 6)
      .map((imageObj: any) => {
        if (typeof imageObj === 'string') {
          return imageObj;
        }
        return imageObj.urlHd || imageObj.url;
      })
      .filter(Boolean);
        
    images.push(...imageUrls);
  }
  
  return [...new Set(images)].slice(0, 8);
};

// Helper function to extract amenities
const extractAmenities = (hotelInfo: any): string[] => {
  const amenities: string[] = [];
  
  if (hotelInfo?.amenities && Array.isArray(hotelInfo.amenities)) {
    const amenityNames = hotelInfo.amenities
      .map((amenity: unknown) => {
        if (typeof amenity === 'string') return amenity;
        if (typeof amenity === 'object' && amenity !== null && 'name' in amenity) return (amenity as any).name;
        return null;
      })
      .filter(Boolean);
    
    amenities.push(...amenityNames);
  }
  
  return amenities.slice(0, 10); // Top 10 amenities
};

// Helper function to calculate price per night from rates
const calculatePricePerNight = (hotelWithRates: HotelWithRates, nights: number): { price: number | null, currency: string } => {
  if (!hotelWithRates.roomTypes || hotelWithRates.roomTypes.length === 0) {
    return { price: null, currency: 'USD' };
  }

  const pricesWithAmounts = hotelWithRates.roomTypes
    .flatMap(room => room.rates || [])
    .map(rate => ({
      amount: rate.retailRate?.total?.[0]?.amount,
      currency: rate.retailRate?.total?.[0]?.currency || 'USD'
    }))
    .filter(data => data.amount != null && data.amount !== undefined) as Array<{amount: number, currency: string}>;

  if (pricesWithAmounts.length === 0) {
    return { price: null, currency: 'USD' };
  }

  const minPrice = Math.min(...pricesWithAmounts.map(p => p.amount));
  const currency = pricesWithAmounts[0].currency;
  
  return {
    price: nights > 0 ? Math.round(minPrice / nights) : minPrice,
    currency
  };
};

// Helper function to check refundable status
const extractRefundableStatus = (hotel: HotelWithRates): boolean => {
  if (!hotel.roomTypes || hotel.roomTypes.length === 0) {
    return false;
  }

  return hotel.roomTypes.some(roomType => 
    roomType.rates?.some(rate => {
      const refundableTag = rate.cancellationPolicies?.refundableTag;
      return refundableTag === 'RFN' || refundableTag?.toLowerCase().includes('refund');
    })
  );
};

// GPT function to score hotel relevance in batches
const scoreHotelsRelevance = async (
  hotels: any[], 
  parsedQuery: ParsedSearchQuery
): Promise<HotelRelevanceScore[]> => {
  
  console.log(`🤖 GPT Scoring ${hotels.length} hotels for relevance in batches...`);
  
      const BATCH_SIZE = 30; // Increased batch size for fewer API calls
  const allScores: HotelRelevanceScore[] = [];
  
  // Split hotels into batches
  for (let i = 0; i < hotels.length; i += BATCH_SIZE) {
    const batch = hotels.slice(i, i + BATCH_SIZE);
    console.log(`🔄 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(hotels.length/BATCH_SIZE)} (${batch.length} hotels)`);
    
    try {
      const batchScores = await scoreBatchOfHotels(batch, parsedQuery, i);
      allScores.push(...batchScores);
      console.log(`✅ Batch ${Math.floor(i/BATCH_SIZE) + 1} completed`);
    } catch (error) {
      console.warn(`⚠️ Batch ${Math.floor(i/BATCH_SIZE) + 1} failed, using fallback scores`);
      // Fallback scoring for this batch
      const fallbackScores = batch.map((hotel) => ({
        hotelId: hotel.id,
        hotelName: hotel.name,
        relevanceScore: Math.min(100, Math.max(40, (hotel.stars || 3) * 12 + Math.random() * 25))
      }));
      allScores.push(...fallbackScores);
    }
  }
  
  console.log(`✅ GPT scored ${allScores.length} total hotels`);
  return allScores;
};

// Helper function to score a single batch of hotels
const scoreBatchOfHotels = async (
  batch: any[],
  parsedQuery: ParsedSearchQuery,
  startIndex: number
): Promise<HotelRelevanceScore[]> => {
  
  // Create hotel summary for this batch
  const hotelSummary = batch.map((hotel, index) => {
    const location = [
      hotel.city || 'Unknown City',
      hotel.country || 'Unknown Country'
    ].filter(Boolean).join(', ');
    
    const coordinates = hotel.latitude && hotel.longitude 
      ? `(${hotel.latitude.toFixed(4)}, ${hotel.longitude.toFixed(4)})` 
      : '';
    
    const description = (hotel.hotelDescription || hotel.description || 'No description')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim()
      .substring(0, 150) + '...'; // Shortened descriptions for faster GPT processing
    
    return `${hotel.id}: ${hotel.name}|${hotel.stars || 0}⭐|📍${location} ${coordinates}|📖${description}`;
  }).join('\n');

  const hasSpecificPreferences = parsedQuery.aiSearch && parsedQuery.aiSearch.trim() !== '';
  
  const prompt = hasSpecificPreferences ? 
    `USER SEARCH: "${parsedQuery.aiSearch}"
DESTINATION: ${parsedQuery.cityName}, ${parsedQuery.countryCode}

🎯 TASK: Score each hotel's RELEVANCE to the user's specific search criteria on a scale of 0-100.

SCORING CRITERIA:
- 90-100: Perfect match for user's specific needs/preferences
- 80-89: Very good match with most criteria met
- 70-79: Good match with some criteria met
- 60-69: Decent match with basic criteria met
- 50-59: Moderate relevance
- 30-49: Low relevance
- 0-29: Poor or no relevance

HOTELS (Batch ${Math.floor(startIndex/50) + 1}):
${hotelSummary}

CRITICAL: Return EXACTLY this JSON format for ALL ${batch.length} hotels using the EXACT hotel IDs from the list:
[{"hotelId":"lp42fec","hotelName":"exact_name","relevanceScore":85}]

Focus on how well each hotel matches the user's SPECIFIC search intent and preferences.` :

    `DESTINATION: ${parsedQuery.cityName}, ${parsedQuery.countryCode}

🎯 TASK: Score each hotel's OVERALL QUALITY and VALUE on a scale of 0-100.

SCORING CRITERIA:
- 90-100: Exceptional luxury/quality hotels
- 80-89: High-quality hotels with excellent amenities
- 70-79: Good quality hotels with solid amenities
- 60-69: Decent hotels with basic amenities
- 50-59: Average hotels
- 30-49: Below average hotels
- 0-29: Poor quality hotels

HOTELS (Batch ${Math.floor(startIndex/50) + 1}):
${hotelSummary}

CRITICAL: Return EXACTLY this JSON format for ALL ${batch.length} hotels:
[{"hotelId":"hotel_id_here","hotelName":"exact_name","relevanceScore":75}]

Focus on overall hotel quality, location, and value for this destination.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a hotel relevance scoring expert. Return ONLY valid JSON array with exact hotel names and relevance scores 0-100. Be concise and fast.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1, // Lower for faster, more consistent responses
    max_tokens: 1500, // Reduced further
  });

  const aiResponse = response.choices[0]?.message?.content || '[]';
  console.log(`🤖 RAW GPT RESPONSE for batch:`, aiResponse);
  
  const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
  console.log(`🧹 CLEANED GPT RESPONSE:`, cleanResponse);
  
  let scores: HotelRelevanceScore[] = [];
  
  try {
    const parsedScores = JSON.parse(cleanResponse);
    console.log(`✅ PARSED JSON successfully:`, parsedScores);
    scores = parsedScores.map((score: any) => ({
      hotelId: score.hotelId || score.id,
      hotelName: score.hotelName || score.name,
      relevanceScore: Math.min(100, Math.max(0, score.relevanceScore || score.score || 50))
    }));
  } catch (jsonError) {
    if (jsonError && typeof jsonError === 'object' && 'message' in jsonError) {
      console.warn('⚠️ JSON parsing failed for batch:', (jsonError as { message: string }).message);
    } else {
      console.warn('⚠️ JSON parsing failed for batch:', jsonError);
    }
    console.warn('⚠️ Failed response was:', cleanResponse);
    // Fallback: assign scores based on star rating
    scores = batch.map((hotel) => ({
      hotelId: hotel.id,
      hotelName: hotel.name,
      relevanceScore: Math.min(100, Math.max(30, (hotel.stars || 3) * 15 + Math.random() * 20))
    }));
  }

  return scores;
};

export const hotelBudgetRelevanceController = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { userInput } = req.body;

    if (!userInput) {
      return res.status(400).json({ error: 'userInput is required' });
    }

    console.log('🚀 Budget & Relevance Hotel Search Starting for:', userInput);
    const searchId = randomUUID();

    // STEP 1: Parse user input
    console.log('🔍 Step 1: Parsing user query...');
    const parseResponse = await internalApiInstance.post('/api/query/parse', { userInput });
    const parsedQuery: ParsedSearchQuery = parseResponse.data;
    
    console.log('📋 PARSED QUERY DETAILS:');
    console.log(`   🏙️  Destination: ${parsedQuery.cityName}, ${parsedQuery.countryCode}`);
    console.log(`   📅 Check-in: ${parsedQuery.checkin}`);
    console.log(`   📅 Check-out: ${parsedQuery.checkout}`);
    console.log(`   👥 Guests: ${parsedQuery.adults || 2} adults, ${parsedQuery.children || 0} children`);
    console.log(`   💰 Budget: min=${parsedQuery.minCost || 'none'}, max=${parsedQuery.maxCost || 'none'}`);
    console.log(`   🔍 AI Search: "${parsedQuery.aiSearch || 'none'}"`);
    console.log(`   📦 Full parsed object:`, JSON.stringify(parsedQuery, null, 2));

    if (!parsedQuery.checkin || !parsedQuery.checkout || !parsedQuery.countryCode || !parsedQuery.cityName) {
      return res.status(400).json({ 
        error: 'Incomplete search parameters',
        message: 'Could not extract all required search parameters from your input',
        parsed: parsedQuery
      });
    }

    const nights = Math.ceil((new Date(parsedQuery.checkout).getTime() - new Date(parsedQuery.checkin).getTime()) / (1000 * 60 * 60 * 24));

    // STEP 2: Fetch 200 hotels with metadata
    console.log('🏨 Step 2: Fetching 200 hotels with metadata...');
    const hotelsSearchResponse = await liteApiInstance.get('/data/hotels', {
      params: {
        countryCode: parsedQuery.countryCode,
        cityName: parsedQuery.cityName,
        language: 'en',
        limit: 50
      },
      timeout: 15000
    });

    const hotels = hotelsSearchResponse.data?.data || hotelsSearchResponse.data;

    if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
      return res.status(404).json({
        error: 'No hotels found',
        message: `No hotels found in ${parsedQuery.cityName}, ${parsedQuery.countryCode}`,
        searchParams: parsedQuery
      });
    }

    console.log(`✅ Fetched ${hotels.length} hotels`);

    // STEP 3 & 4: PARALLEL PROCESSING - GPT Scoring AND Rates Fetching
    console.log('⚡ Step 3-4: Starting parallel processing...');
    
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
      timeout: 4,
      maxRatesPerHotel: 1,
      hotelIds: hotelIds
    };

    // Execute GPT scoring and rates fetching in parallel
    const [gptScores, ratesResponse] = await Promise.all([
      scoreHotelsRelevance(hotels, parsedQuery),
      liteApiInstance.post('/hotels/rates', ratesRequestBody, { timeout: 25000 })
    ]);

    console.log('✅ Parallel processing completed');

    // STEP 5: Process rates data
    let hotelsWithRates = ratesResponse.data?.data || ratesResponse.data || [];
    
    if (!Array.isArray(hotelsWithRates)) {
      if (hotelsWithRates && typeof hotelsWithRates === 'object') {
        if (Array.isArray(hotelsWithRates.hotels)) {
          hotelsWithRates = hotelsWithRates.hotels;
        } else if (Array.isArray(hotelsWithRates.data)) {
          hotelsWithRates = hotelsWithRates.data;
        } else {
          hotelsWithRates = [hotelsWithRates];
        }
      } else {
        hotelsWithRates = [];
      }
    }

    console.log(`📊 Hotels with rates: ${hotelsWithRates.length}`);

    if (hotelsWithRates.length === 0) {
      return res.status(404).json({
        error: 'No available hotels',
        message: 'Hotels found but no availability for your dates',
        searchParams: parsedQuery
      });
    }

    // STEP 6: Create score lookup map
    const scoreMap = new Map<string, number>();
    gptScores.forEach(score => {
      scoreMap.set(score.hotelId, score.relevanceScore);
    });

    // STEP 7: Build enriched hotel data for hotels that have rates
    console.log('🔧 Step 7: Building enriched hotel data...');
    
    const enrichedHotels: EnrichedHotel[] = [];
    const hotelMetadataMap = new Map<string, any>();
    
    // Build metadata map
    hotels.forEach((hotel: any) => {
      const id = hotel.id || hotel.hotelId || hotel.hotel_id || hotel.code;
      if (id) {
        hotelMetadataMap.set(String(id), hotel);
      }
    });

    hotelsWithRates.forEach((rateHotel: any) => {
      const hotelId = rateHotel.hotelId || rateHotel.id || rateHotel.hotel_id;
      if (!hotelId) return;

      const hotelMetadata = hotelMetadataMap.get(String(hotelId));
      if (!hotelMetadata) return;

      const relevanceScore = scoreMap.get(String(hotelId)) || 50;
      const { price, currency } = calculatePricePerNight(rateHotel, nights);
      const isRefundable = extractRefundableStatus(rateHotel);
      const images = extractHotelImages(hotelMetadata);
      const amenities = extractAmenities(hotelMetadata);

      enrichedHotels.push({
        hotelId: String(hotelId),
        name: hotelMetadata.name || 'Unknown Hotel',
        description: hotelMetadata.hotelDescription || hotelMetadata.description || 'No description available',
        starRating: hotelMetadata.stars || hotelMetadata.starRating || 0,
        address: hotelMetadata.address || 'Address not available',
        city: hotelMetadata.city || 'Unknown City',
        country: hotelMetadata.country || 'Unknown Country',
        latitude: hotelMetadata.latitude || null,
        longitude: hotelMetadata.longitude || null,
        amenities: amenities,
        images: images,
        pricePerNight: price,
        currency: currency,
        relevanceScore: relevanceScore,
        isRefundable: isRefundable,
        roomTypes: rateHotel.roomTypes || []
      });
    });

    console.log(`✅ Built ${enrichedHotels.length} enriched hotels`);

    // STEP 8: Sort by budget and relevance
    console.log('📋 Step 8: Sorting by budget and relevance...');
    
    const inBudget: EnrichedHotel[] = [];
    const outOfBudget: EnrichedHotel[] = [];

    console.log(`🔍 Analyzing ${enrichedHotels.length} hotels for budget filtering:`);
    console.log(`💰 Budget constraints: min=${parsedQuery.minCost || 'none'}, max=${parsedQuery.maxCost || 'none'}`);

    enrichedHotels.forEach((hotel, index) => {
      if (!hotel.pricePerNight) {
        console.log(`⚠️ Hotel ${index + 1} (${hotel.name}): No price - SKIPPING`);
        return;
      }

      const withinMin = !parsedQuery.minCost || hotel.pricePerNight >= parsedQuery.minCost;
      const withinMax = !parsedQuery.maxCost || hotel.pricePerNight <= parsedQuery.maxCost;
      const isInBudget = withinMin && withinMax;
      
      console.log(`🏨 Hotel ${index + 1}: ${hotel.name}`);
      console.log(`   💰 Price: ${hotel.pricePerNight}/night`);
      console.log(`   📊 Relevance: ${hotel.relevanceScore}/100`);
      console.log(`   🎯 Budget status: ${isInBudget ? 'IN BUDGET' : 'OUT OF BUDGET'}`);
      
      if (isInBudget) {
        if (hotel.relevanceScore > 70) { // Lowered from 75
          inBudget.push(hotel);
          console.log(`   ✅ ADDED to inBudget (score: ${hotel.relevanceScore} > 70)`);
        } else {
          console.log(`   ❌ Score too low for inBudget (${hotel.relevanceScore} <= 70)`);
        }
      } else {
        if (hotel.relevanceScore > 75) { // Lowered from 80  
          outOfBudget.push(hotel);
          console.log(`   ✅ ADDED to outOfBudget (score: ${hotel.relevanceScore} > 75)`);
        } else {
          console.log(`   ❌ Score too low for outOfBudget (${hotel.relevanceScore} <= 75)`);
        }
      }
    });

    // Sort both arrays by relevance score (highest first)
    inBudget.sort((a, b) => b.relevanceScore - a.relevanceScore);
    outOfBudget.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Limit to 30 each
    const finalInBudget = inBudget.slice(0, 30);
    const finalOutOfBudget = outOfBudget.slice(0, 30);

    console.log(`✅ Final results: ${finalInBudget.length} in budget, ${finalOutOfBudget.length} out of budget`);

    const totalTime = Date.now() - startTime;

    const results: BudgetSortedResults = {
      inBudget: finalInBudget,
      outOfBudget: finalOutOfBudget,
      totalProcessed: enrichedHotels.length,
      searchParams: {
        ...parsedQuery,
        nights: nights,
        currency: 'USD'
      },
      performance: {
        totalTimeMs: totalTime,
        hotelsInitialFetch: hotels.length,
        hotelsWithRates: hotelsWithRates.length,
        relevanceScoring: 'gpt-4o-mini',
        parallelProcessing: true
      }
    };

    console.log(`🚀 Budget & Relevance Search Complete in ${totalTime}ms ✅`);

    return res.status(200).json(results);

  } catch (error) {
    console.error('Error in budget relevance controller:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return res.status(error.response.status).json({
          error: 'API error',
          message: error.response.data?.message || error.response.data?.error?.description || 'Unknown API error',
          details: error.response.data,
          step: error.config?.url?.includes('/parse') ? 'parsing' : 
                error.config?.url?.includes('/data/hotels') ? 'hotel_search' : 
                error.config?.url?.includes('openai') ? 'gpt_scoring' : 'rates_search'
        });
      }
    }

    return res.status(500).json({ 
      error: 'Budget relevance search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};