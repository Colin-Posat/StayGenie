// src/controllers/hotelSearchAndMatch.ts
import { Request, Response } from 'express';
import axios from 'axios';
import Groq from 'groq-sdk';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { 
  ParsedSearchQuery, 
  HotelWithRates, 
  HotelSummaryForAI
} from '../types/hotel';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Verify environment variables
console.log('🔑 Environment Variables Check:');
console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
console.log('LITEAPI_KEY exists:', !!process.env.LITEAPI_KEY);

interface StepTiming {
  step: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'started' | 'completed' | 'failed';
  details?: Record<string, unknown>;
}

class PerformanceLogger {
  private timings: StepTiming[] = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  startStep(step: string, details?: Record<string, unknown>) {
    const timing: StepTiming = {
      step,
      startTime: Date.now(),
      status: 'started',
      details
    };
    this.timings.push(timing);
    console.log(`🚀 Step ${step} Starting...`, details ? `Details: ${JSON.stringify(details)}` : '');
    return timing;
  }

  endStep(step: string, details?: Record<string, unknown>) {
    const timing = this.timings.find(t => t.step === step && t.status === 'started');
    if (timing) {
      timing.endTime = Date.now();
      timing.duration = timing.endTime - timing.startTime;
      timing.status = 'completed';
      timing.details = { ...timing.details, ...details };
      
      const emoji = timing.duration > 3000 ? '🚨' : timing.duration > 1000 ? '⚠️' : '✅';
      console.log(`${emoji} Step ${step} ✅: Completed in ${timing.duration}ms`, details ? `Results: ${JSON.stringify(details)}` : '');
    }
  }

  failStep(step: string, error: Error) {
    const timing = this.timings.find(t => t.step === step && t.status === 'started');
    if (timing) {
      timing.endTime = Date.now();
      timing.duration = timing.endTime - timing.startTime;
      timing.status = 'failed';
      timing.details = { ...timing.details, error: error.message };
      console.log(`❌ Step ${step} Failed in ${timing.duration}ms:`, error.message);
    }
  }

  getTimings() {
    return this.timings;
  }

  getTotalTime() {
    return Date.now() - this.startTime;
  }

  getDetailedReport() {
    const total = this.getTotalTime();
    const report = {
      totalTime: total,
      steps: this.timings.map(t => ({
        step: t.step,
        duration: t.duration,
        status: t.status,
        percentage: t.duration ? ((t.duration / total) * 100).toFixed(1) : 0,
        details: t.details
      })),
      bottlenecks: this.timings
        .filter(t => t.duration && t.duration > 1000)
        .sort((a, b) => (b.duration || 0) - (a.duration || 0))
        .slice(0, 3)
    };
    
    console.log('📊 Performance Report:', JSON.stringify(report, null, 2));
    return report;
  }
}

// Configuration
const SMART_HOTEL_LIMIT = parseInt(process.env.SMART_HOTEL_LIMIT || '50');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});
const extractRefundablePolicy = (hotel: HotelWithRates): { isRefundable: boolean; refundableTag: string | null; refundableInfo: string } => {
  if (!hotel.roomTypes || hotel.roomTypes.length === 0) {
    return {
      isRefundable: false,
      refundableTag: null,
      refundableInfo: 'No rate information available'
    };
  }

  // Check all rates across all room types for refundable policies
  const refundableTags: string[] = [];
  let hasRefundableRates = false;
  let hasNonRefundableRates = false;

  hotel.roomTypes.forEach(roomType => {
    if (roomType.rates && roomType.rates.length > 0) {
      roomType.rates.forEach(rate => {
        const refundableTag = rate.cancellationPolicies?.refundableTag;
        if (refundableTag) {
          refundableTags.push(refundableTag);
          
          // RFN typically means refundable, NRF means non-refundable
          if (refundableTag === 'RFN' || refundableTag.toLowerCase().includes('refund')) {
            hasRefundableRates = true;
          } else if (refundableTag === 'NRF' || refundableTag.toLowerCase().includes('non')) {
            hasNonRefundableRates = true;
          }
        }
      });
    }
  });

  // Determine overall refundable status
  let isRefundable = false;
  let refundableInfo = '';

  if (hasRefundableRates && hasNonRefundableRates) {
    isRefundable = true; // Mixed - some refundable options available
    refundableInfo = 'Mixed refund policies available';
  } else if (hasRefundableRates) {
    isRefundable = true;
    refundableInfo = 'Refundable rates available';
  } else if (hasNonRefundableRates) {
    isRefundable = false;
    refundableInfo = 'Non-refundable rates only';
  } else {
    refundableInfo = 'Refund policy not specified';
  }

  return {
    isRefundable,
    refundableTag: refundableTags.length > 0 ? refundableTags[0] : null, // Return first tag found
    refundableInfo
  };
};

// Optimized axios instances
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

// Helper functions
const getTop3Amenities = (hotelInfo: any): string[] => {
  const amenities: string[] = [];
  
  if (hotelInfo?.amenities && Array.isArray(hotelInfo.amenities)) {
    const amenityNames = hotelInfo.amenities
      .map((amenity: unknown) => {
        if (typeof amenity === 'string') return amenity;
        if (typeof amenity === 'object' && amenity !== null && 'name' in amenity) return (amenity as any).name;
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

// Helper function to extract images from hotelImages array
const extractHotelImages = (hotelInfo: any): string[] => {
  const images: string[] = [];
  
  // Check if hotelImages is directly available
  let hotelImagesArray = hotelInfo?.hotelImages;
  
  // If not found, check if it's nested under 'data'
  if (!hotelImagesArray && hotelInfo?.data?.hotelImages) {
    hotelImagesArray = hotelInfo.data.hotelImages;
  }
  
  if (hotelImagesArray && Array.isArray(hotelImagesArray)) {
    // Get first 5 images from hotelImages array
    const imageUrls = hotelImagesArray
      .slice(0, 5) // Take first 5 images
      .map((imageObj: any) => {
        // Prefer HD URL if available, otherwise use regular URL
        return imageObj.urlHd || imageObj.url;
      })
      .filter(Boolean); // Remove any null/undefined URLs
        
    images.push(...imageUrls);
  }
    
  // Fallback: check for old structure (main_photo, thumbnail, images)
  if (images.length === 0) {
    const mainPhoto = hotelInfo?.main_photo || hotelInfo?.data?.main_photo;
    const thumbnail = hotelInfo?.thumbnail || hotelInfo?.data?.thumbnail;
    const oldImages = hotelInfo?.images || hotelInfo?.data?.images;
    
    if (mainPhoto) {
      images.push(mainPhoto);
    }
    if (!mainPhoto && thumbnail) {
      images.push(thumbnail);
    }
    if (oldImages && Array.isArray(oldImages)) {
      const oldImageUrls = oldImages.slice(0, 5);
      images.push(...oldImageUrls);
    }
  }
    
  return images;
};

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
        currency: rate.retailRate?.total?.[0]?.currency || 'USD',
        refundableTag: rate.cancellationPolicies?.refundableTag || null
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
      topAmenities: ['Wi-Fi', 'AC', 'Bathroom'],
      starRating: 0,
      reviewCount: 0,
      // Add refundable policy info
      isRefundable: false,
      refundableTag: null,
      refundableInfo: 'No rate information available'
    };
  }

  const { pricePerNightInfo, suggestedPrice, priceProvider } = calculatePriceInfo(hotel, nights);
  const refundablePolicy = extractRefundablePolicy(hotel);
  
  const city = hotelInfo?.city || 'Unknown City';
  const country = hotelInfo?.country || 'Unknown Country';
  
  // FIX: Check top level first, then nested paths
  const latitude = hotelInfo?.latitude || 
                   hotelInfo?.location?.latitude || 
                   hotelInfo?.coordinates?.latitude || 
                   null;
  const longitude = hotelInfo?.longitude || 
                    hotelInfo?.location?.longitude || 
                    hotelInfo?.coordinates?.longitude || 
                    null;
  
  const topAmenities = getTop3Amenities(hotelInfo);
  const starRating = hotelInfo?.starRating || hotelInfo?.stars || hotelInfo?.rating || 0;
  const reviewCount = hotelInfo?.reviewCount || 0;

  // Truncate description to 100 chars for faster token processing
  const shortDescription = hotelInfo.hotelDescription || hotelInfo.description 
    ? (hotelInfo.hotelDescription || hotelInfo.description)!.substring(0, 100).trim() + '...'
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
    reviewCount: reviewCount,
    // Add refundable policy information
    isRefundable: refundablePolicy.isRefundable,
    refundableTag: refundablePolicy.refundableTag,
    refundableInfo: refundablePolicy.refundableInfo
  };
};

// Llama hotel matching and ranking
const llamaHotelMatching = async (
  hotelSummaries: HotelSummaryForAI[], 
  parsedQuery: ParsedSearchQuery, 
  nights: number
): Promise<Array<{ hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }>> => {
  
  const hasSpecificPreferences = parsedQuery.aiSearch && parsedQuery.aiSearch.trim() !== '';
  
  // Price context for prompts
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

  // Split hotels into 2 batches for parallel processing
  const midpoint = Math.ceil(hotelSummaries.length / 2);
  const batch1 = hotelSummaries.slice(0, midpoint);
  const batch2 = hotelSummaries.slice(midpoint);
  
  console.log(`🤖 Llama Matching - Batch 1: ${batch1.length} hotels, Batch 2: ${batch2.length} hotels`);
  
  const createBatchSummary = (hotels: HotelSummaryForAI[]) => {
    return hotels.map((hotel, index) => {
      return `${index + 1}: ${hotel.name}|${hotel.starRating}⭐|${hotel.pricePerNight}|${hotel.topAmenities.join(',')}`;
    }).join('\n');
  };
  
  const createBatchPrompt = (batchSummary: string, batchNum: number) => {
    const basePrompt = hasSpecificPreferences ? 
      `USER REQUEST: "${parsedQuery.aiSearch}"
STAY: ${nights} nights${priceContext}

BATCH ${batchNum} HOTELS:
${batchSummary}

TASK: Match hotels to user request and return ONLY hotel names with match percentages.
Return JSON array with EXACTLY 3 hotels (no more, no less):
[{"hotelName":"exact name","aiMatchPercent":65-95}]

${budgetGuidance}Base percentages on alignment with "${parsedQuery.aiSearch}". Use exact hotel names from list.` :

      `DESTINATION: ${parsedQuery.cityName}, ${parsedQuery.countryCode}
STAY: ${nights} nights${priceContext}

BATCH ${batchNum} HOTELS:
${batchSummary}

TASK: Rank hotels by overall appeal (location, amenities, value).
Return JSON array with EXACTLY 3 hotels (no more, no less):
[{"hotelName":"exact name","aiMatchPercent":70-95}]

${budgetGuidance}Rank by location, amenities, value. Use exact names from list.`;
    
    return basePrompt;
  };
  
  // Run both Llama calls in parallel for matching only
  const [batch1Response, batch2Response] = await Promise.all([
    groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are a hotel-matching expert. Reply ONLY with valid JSON array of 3 items with exact hotel names and match percentages.'
        },
        { role: 'user', content: createBatchPrompt(createBatchSummary(batch1), 1) }
      ],
      temperature: 0.3,
      max_tokens: 400,
    }),
    
    groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are a hotel-matching expert. Reply ONLY with valid JSON array of 3 items with exact hotel names and match percentages.'
        },
        { role: 'user', content: createBatchPrompt(createBatchSummary(batch2), 2) }
      ],
      temperature: 0.3,
      max_tokens: 400,
    })
  ]);
  
  // Parse and merge results
  const parseMatchingResponse = (response: any, batchNum: number, batchHotels: HotelSummaryForAI[]): Array<{ hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }> => {
    try {
      const aiResponse = response.choices[0]?.message?.content || '[]';
      const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      const matches: Array<{ hotelName: string; aiMatchPercent: number }> = JSON.parse(cleanResponse);
      
      console.log(`🎯 Llama Batch ${batchNum} matched ${matches.length} hotels`);
      
      // Map hotel names back to full hotel data
      return matches.slice(0, 3).map(match => {
        const hotelData = batchHotels.find(hotel => hotel.name === match.hotelName);
        if (!hotelData) {
          console.warn(`⚠️ Hotel "${match.hotelName}" not found in batch ${batchNum}`);
          return null;
        }
        return {
          hotelName: match.hotelName,
          aiMatchPercent: match.aiMatchPercent,
          hotelData
        };
      }).filter(Boolean) as Array<{ hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }>;
      
    } catch (parseError) {
      console.warn(`⚠️ Failed to parse Llama batch ${batchNum} response:`, parseError);
      return [];
    }
  };
  
  const batch1Results = parseMatchingResponse(batch1Response, 1, batch1);
  const batch2Results = parseMatchingResponse(batch2Response, 2, batch2);
  
  // Merge and rank all results
  const allMatches = [...batch1Results, ...batch2Results];
  console.log(`Llama found ${allMatches.length} total matches`);
  
  // Sort by AI match percentage and take top 5
  const rankedMatches = allMatches
    .sort((a, b) => b.aiMatchPercent - a.aiMatchPercent)
    .slice(0, 5);
  
  // Ensure percentage variety in final results
  rankedMatches.forEach((match, index) => {
    const basePercentage = match.aiMatchPercent;
    const variation = index * 2;
    match.aiMatchPercent = Math.min(95, Math.max(hasSpecificPreferences ? 65 : 70, basePercentage - variation));
  });
  
  console.log(`🎯 Llama final rankings: ${rankedMatches.map(r => `${r.hotelName}: ${r.aiMatchPercent}%`).join(', ')}`);
  
  return rankedMatches;
};

// Create hotel summary for AI insights endpoint
const createHotelSummaryForInsights = (hotel: HotelWithRates, hotelInfo: any, nights: number) => {
  const { priceRange, suggestedPrice, priceProvider } = calculatePriceInfo(hotel, nights);
  const refundablePolicy = extractRefundablePolicy(hotel);
  const topAmenities = getTop3Amenities(hotelInfo);
  const images = extractHotelImages(hotelInfo);
  
  // Add fallback images if needed
  if (hotelInfo?.main_photo) images.push(hotelInfo.main_photo);
  if (!hotelInfo?.main_photo && hotelInfo?.thumbnail) images.push(hotelInfo.thumbnail);
  if (hotelInfo?.images && Array.isArray(hotelInfo.images)) {
    images.push(...hotelInfo.images.slice(0, 3));
  }
  
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

  const fakeReviewCount = Math.floor(Math.random() * (1100 - 700 + 1)) + 700;

  return {
    hotelId: hotel.hotelId,
    name: hotelInfo?.name || 'Unknown Hotel',
    starRating: hotelInfo?.rating || 7.1,
    images: images.slice(0, 5), // Limit to 5 images
    pricePerNight: pricePerNight,
    reviewCount: fakeReviewCount,
    address: hotelInfo?.address || 'Address not available',
    amenities: hotelInfo?.amenities || [],
    description: hotelInfo?.hotelDescription || hotelInfo?.description || 'No description available',
    coordinates: hotelInfo?.coordinates || null,
    priceRange: priceRange,
    totalRooms: hotel.roomTypes ? hotel.roomTypes.length : 0,
    hasAvailability: hotel.roomTypes && hotel.roomTypes.length > 0,
    roomTypes: hotel.roomTypes,
    suggestedPrice: suggestedPrice,
    priceProvider: priceProvider,
    city: hotelInfo?.city || 'Unknown City',
    country: hotelInfo?.country || 'Unknown Country',
    // FIX: Check top level first, then nested paths
    latitude: hotelInfo?.latitude || 
              hotelInfo?.location?.latitude || 
              hotelInfo?.coordinates?.latitude || 
              null,
    longitude: hotelInfo?.longitude || 
               hotelInfo?.location?.longitude || 
               hotelInfo?.coordinates?.longitude || 
               null,
    topAmenities: topAmenities,
    // Add refundable policy information
    isRefundable: refundablePolicy.isRefundable,
    refundableTag: refundablePolicy.refundableTag,
    refundableInfo: refundablePolicy.refundableInfo,
    // Add detailed cancellation policies for insights
    cancellationPolicies: hotel.roomTypes?.flatMap(room => 
      room.rates?.map(rate => ({
        refundableTag: rate.cancellationPolicies?.refundableTag,
        cancelPolicyInfos: rate.cancellationPolicies?.cancelPolicyInfos || [],
        hotelRemarks: rate.cancellationPolicies?.hotelRemarks || []
      })) || []
    ) || []
  };
};

// Main controller function for hotel search and matching
export const hotelSearchAndMatchController = async (req: Request, res: Response) => {
  const logger = new PerformanceLogger();
  
  try {
    const { userInput } = req.body;

    if (!userInput) {
      return res.status(400).json({ error: 'userInput is required' });
    }

    console.log('🚀 Hotel Search and Match Starting for:', userInput);
    const searchId = randomUUID();

    // STEP 1: Parse user input
    logger.startStep('1-ParseQuery', { userInput });
    
    const parseResponse = await internalApiInstance.post('/api/query/parse', { userInput });
    const parsedQuery: ParsedSearchQuery = parseResponse.data;
    logger.endStep('1-ParseQuery', { parsedQuery });

    // Validate parsed data
    if (!parsedQuery.checkin || !parsedQuery.checkout || !parsedQuery.countryCode || !parsedQuery.cityName) {
      return res.status(400).json({ 
        error: 'Incomplete search parameters',
        message: 'Could not extract all required search parameters from your input',
        parsed: parsedQuery
      });
    }

    const nights = Math.ceil((new Date(parsedQuery.checkout).getTime() - new Date(parsedQuery.checkin).getTime()) / (1000 * 60 * 60 * 24));

    // STEP 2: Fetch hotels
    logger.startStep('2-FetchHotels', { limit: SMART_HOTEL_LIMIT, city: parsedQuery.cityName, country: parsedQuery.countryCode });
    
    const hotelsSearchResponse = await liteApiInstance.get('/data/hotels', {
      params: {
        countryCode: parsedQuery.countryCode,
        cityName: parsedQuery.cityName,
        language: 'en',
        limit: SMART_HOTEL_LIMIT
      },
      timeout: 12000
    });

    const hotels = hotelsSearchResponse.data?.data || hotelsSearchResponse.data;

    
    logger.endStep('2-FetchHotels', { hotelCount: hotels?.length || 0 });

    if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
      return res.status(404).json({
        error: 'No hotels found',
        message: `No hotels found in ${parsedQuery.cityName}, ${parsedQuery.countryCode}`,
        searchParams: parsedQuery
      });
    }

    // STEP 3: Fetch rates for all hotels
    const hotelIds = hotels.map((hotel: any) => 
      hotel.id || hotel.hotelId || hotel.hotel_id || hotel.code
    ).filter(Boolean);

    logger.startStep('3-FetchRates', { hotelCount: hotelIds.length, checkin: parsedQuery.checkin, checkout: parsedQuery.checkout });

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

    let hotelsWithRates = ratesResponse.data?.data || ratesResponse.data || [];

    // Ensure hotelsWithRates is always an array
    if (!Array.isArray(hotelsWithRates)) {
      console.warn('⚠️  API returned non-array response:', typeof hotelsWithRates);
      
      if (hotelsWithRates && typeof hotelsWithRates === 'object') {
        if (Array.isArray(hotelsWithRates.hotels)) {
          hotelsWithRates = hotelsWithRates.hotels;
        } else if (Array.isArray(hotelsWithRates.data)) {
          hotelsWithRates = hotelsWithRates.data;
        } else if (Array.isArray(hotelsWithRates.results)) {
          hotelsWithRates = hotelsWithRates.results;
        } else {
          hotelsWithRates = [hotelsWithRates];
        }
      } else {
        hotelsWithRates = [];
      }
    }

    logger.endStep('3-FetchRates', { hotelsWithRates: hotelsWithRates.length });

    if (hotelsWithRates.length === 0) {
      logger.failStep('3-FetchRates', new Error('No available hotels'));
      return res.status(404).json({
        error: 'No available hotels',
        message: 'Hotels found but no availability for your dates',
        searchParams: parsedQuery
      });
    }

    // STEP 4: Build AI summaries
    logger.startStep('4-BuildSummaries', { hotelCount: hotelsWithRates.length });

    const hotelMetadataMap = new Map<string, Record<string, unknown>>();
    hotels.forEach((hotel: Record<string, unknown>) => {
      const id = hotel.id || hotel.hotelId || hotel.hotel_id || hotel.code;
      if (id) {
        hotelMetadataMap.set(String(id), hotel);
      }
    });

    const hotelSummariesForAI: HotelSummaryForAI[] = [];

    try {
      if (Array.isArray(hotelsWithRates) && hotelsWithRates.length > 0) {
        hotelsWithRates.forEach((rateHotel: any, index: number) => {
          try {
            if (!rateHotel || typeof rateHotel !== 'object') {
              console.warn(`⚠️  Invalid hotel data at index ${index}:`, rateHotel);
              return;
            }

            const hotelId = rateHotel.hotelId || rateHotel.id || rateHotel.hotel_id;
            if (!hotelId) {
              console.warn(`⚠️  Missing hotel ID at index ${index}`);
              return;
            }

            const metadata = hotelMetadataMap.get(String(hotelId));
            const basicHotel: HotelWithRates = {
              ...rateHotel,
              hotelId: hotelId,
              hotelInfo: metadata || {}
            };
            
            const summary = createOptimizedHotelSummaryForAI(basicHotel, index, nights);
            hotelSummariesForAI.push(summary);
          } catch (innerError) {
            console.warn(`⚠️  Error processing hotel at index ${index}:`, innerError);
          }
        });
      }
    } catch (summaryError) {
      console.error('❌ Error building hotel summaries:', summaryError);
      return res.status(500).json({
        error: 'Failed to process hotel data',
        message: 'Error building hotel summaries for AI processing'
      });
    }

    if (hotelSummariesForAI.length === 0) {
      return res.status(404).json({
        error: 'No processable hotels',
        message: 'Found hotels but could not process any for AI recommendations',
        searchParams: parsedQuery
      });
    }

    logger.endStep('4-BuildSummaries', { summariesBuilt: hotelSummariesForAI.length });

    // STEP 5: Llama AI Matching
    logger.startStep('5-LlamaMatching', { hotelCount: hotelSummariesForAI.length });

    const llamaMatches = await llamaHotelMatching(hotelSummariesForAI, parsedQuery, nights);
    
    logger.endStep('5-LlamaMatching', { matches: llamaMatches.length });

    if (llamaMatches.length === 0) {
      throw new Error('Llama failed to find any hotel matches');
    }

    // STEP 6: Build enriched hotel data for matched hotels
    logger.startStep('6-BuildEnrichedData', { selectedHotels: llamaMatches.length });

    const enrichedHotels = llamaMatches.map(match => {
      const matchingHotel = hotelsWithRates.find((hotel: any) => {
        const metadata = hotelMetadataMap.get(String(hotel.hotelId));
        const hotelName = metadata?.name || hotel.hotelInfo?.name;
        return hotelName === match.hotelName;
      });

      if (!matchingHotel) {
        console.warn(`Warning: Could not find hotel "${match.hotelName}" in original data`);
        return null;
      }

      const metadata = hotelMetadataMap.get(String(matchingHotel.hotelId));
      
      // Create enriched hotel summary with all necessary data for AI insights
      const enrichedHotelSummary = createHotelSummaryForInsights(matchingHotel, metadata, nights);
      
      return {
        ...enrichedHotelSummary,
        aiMatchPercent: match.aiMatchPercent,
        // Add summarized info for AI insights endpoint
        summarizedInfo: {
          name: enrichedHotelSummary.name,
          description: metadata?.description ? 
            metadata.description.toString().substring(0, 200) + '...' : 
            'No description available',
          amenities: enrichedHotelSummary.topAmenities,
          starRating: enrichedHotelSummary.starRating,
          reviewCount: enrichedHotelSummary.reviewCount,
          pricePerNight: enrichedHotelSummary.pricePerNight?.display || 'Price not available',
          location: enrichedHotelSummary.address,
          city: enrichedHotelSummary.city,
          country: enrichedHotelSummary.country
        }
      };
    }).filter(Boolean);

    logger.endStep('6-BuildEnrichedData', { enrichedHotels: enrichedHotels.length });

    // Final response
    const performanceReport = logger.getDetailedReport();
    console.log(`🚀 Hotel Search and Match Complete in ${performanceReport.totalTime}ms ✅`);

    return res.status(200).json({
      searchParams: {
        ...parsedQuery,
        nights: nights,
        currency: 'USD'
      },
      totalHotelsFound: hotels.length,
      hotelsWithRates: hotelsWithRates.length,
      matchedHotelsCount: enrichedHotels.length,
      hotels: enrichedHotels,
      aiMatchingCompleted: true,
      generatedAt: new Date().toISOString(),
      searchId: searchId,
      aiModel: "llama-3.1-8b-instant",
      performance: {
        totalTimeMs: performanceReport.totalTime,
        stepBreakdown: performanceReport.steps,
        bottlenecks: performanceReport.bottlenecks
      }
    });

  } catch (error) {
    console.error('Error in hotel search and match:', error);
    const errorReport = logger.getDetailedReport();
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return res.status(error.response.status).json({
          error: 'API error',
          message: error.response.data?.message || error.response.data?.error?.description || 'Unknown API error',
          details: error.response.data,
          step: error.config?.url?.includes('/parse') ? 'parsing' : 
                error.config?.url?.includes('/data/hotels') ? 'hotel_search' : 
                error.config?.url?.includes('groq') ? 'llama_matching' : 'rates_search',
          performance: errorReport
        });
      }
    }

    return res.status(500).json({ 
      error: 'Hotel search and match failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      performance: errorReport
    });
  }
};