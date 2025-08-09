// src/controllers/hotelSearchAndMatch.ts
import { Request, Response } from 'express';
import axios from 'axios';
import OpenAI from 'openai';
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
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
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
const SMART_HOTEL_LIMIT = parseInt(process.env.SMART_HOTEL_LIMIT || '100'); // More hotels to choose from
const TARGET_HOTEL_COUNT = 15;

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
    refundableTag: refundableTags.length > 0 ? refundableTags[0] : null,
    refundableInfo
  };
};

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

// Optimized function to extract images from hotel data
const extractHotelImages = (hotelInfo: any): string[] => {
  const images: string[] = [];
  
  // Use main_photo and thumbnail from initial API call
  if (hotelInfo?.main_photo) {
    images.push(hotelInfo.main_photo);
  }
  
  if (hotelInfo?.thumbnail && hotelInfo.thumbnail !== hotelInfo?.main_photo) {
    images.push(hotelInfo.thumbnail);
  }
  
  // If we have hotelImages array (from detailed data), use it
  if (hotelInfo?.hotelImages && Array.isArray(hotelInfo.hotelImages)) {
    const imageUrls = hotelInfo.hotelImages
      .slice(0, 6) // Take up to 6 additional images
      .map((imageObj: any) => {
        if (typeof imageObj === 'string') {
          return imageObj;
        }
        return imageObj.urlHd || imageObj.url;
      })
      .filter(Boolean);
        
    images.push(...imageUrls);
  }
  
  // Remove duplicates and limit to 8 total images
  return [...new Set(images)].slice(0, 8);
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

// OPTIMIZED: Create hotel summary using data from initial API call
const createOptimizedHotelSummaryForAI = (hotel: HotelWithRates, hotelMetadata: any, index: number, nights: number): HotelSummaryForAI => {
  // Use the metadata from the initial /data/hotels call - it has all we need!
  const hotelInfo = hotelMetadata || hotel.hotelInfo || {};
  
  if (!hotelInfo && !hotelMetadata) {
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
      isRefundable: false,
      refundableTag: null,
      refundableInfo: 'No rate information available'
    };
  }

  const { pricePerNightInfo, suggestedPrice, priceProvider } = calculatePriceInfo(hotel, nights);
  const refundablePolicy = extractRefundablePolicy(hotel);
  
  // Get data directly from initial API response
  const city = hotelInfo.city || 'Unknown City';
  const country = hotelInfo.country || 'Unknown Country';
  const latitude = hotelInfo.latitude || null;
  const longitude = hotelInfo.longitude || null;
  const address = hotelInfo.address || 'Location not available';
  const name = hotelInfo.name || 'Unknown Hotel';
  const starRating = hotelInfo.stars || hotelInfo.starRating || hotelInfo.rating || 0;
  
  const topAmenities = getTop3Amenities(hotelInfo);
  
  // Generate fake review count since we're not fetching real reviews
  const fakeReviewCount = Math.floor(Math.random() * (1100 - 700 + 1)) + 700;

  // Use hotelDescription from initial API call and truncate for faster processing
  const shortDescription = hotelInfo.hotelDescription || hotelInfo.description || 'No description available';


  let displayPrice = pricePerNightInfo;
  if (suggestedPrice && priceProvider) {
    displayPrice = `${pricePerNightInfo} (${priceProvider})`;
  }

  return {
    index: index + 1,
    hotelId: hotel.hotelId,
    name: name,
    location: address,
    description: shortDescription,
    pricePerNight: displayPrice,
    city: city,
    country: country,
    latitude: latitude,
    longitude: longitude,
    topAmenities: topAmenities,
    starRating: starRating,
    reviewCount: fakeReviewCount,
    isRefundable: refundablePolicy.isRefundable,
    refundableTag: refundablePolicy.refundableTag,
    refundableInfo: refundablePolicy.refundableInfo
  };
};

// GPT-4o Mini hotel matching and ranking (unchanged)
const gptHotelMatching = async (
  hotelSummaries: HotelSummaryForAI[], 
  parsedQuery: ParsedSearchQuery, 
  nights: number
): Promise<Array<{ hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }>> => {
  
  const hasSpecificPreferences = parsedQuery.aiSearch && parsedQuery.aiSearch.trim() !== '';
  
  // Budget context - only apply if user specified a budget
  let budgetContext = '';
  let budgetGuidance = '';
  
  if (parsedQuery.minCost || parsedQuery.maxCost) {
    const minText = parsedQuery.minCost ? `${parsedQuery.minCost}` : '';
    const maxText = parsedQuery.maxCost ? `${parsedQuery.maxCost}` : '';
    
    if (minText && maxText) {
      budgetContext = `\n💰 BUDGET CONSTRAINT: ${minText} - ${maxText}/night`;
      budgetGuidance = `IMPORTANT: Stay within the specified budget of ${minText}-${maxText}/night. `;
    } else if (minText) {
      budgetContext = `\n💰 MINIMUM BUDGET: ${minText}+ per night`;
      budgetGuidance = `IMPORTANT: Only select hotels ${minText}+ per night. `;
    } else if (maxText) {
      budgetContext = `\n💰 MAXIMUM BUDGET: Under ${maxText} per night`;
      budgetGuidance = `IMPORTANT: Only select hotels under ${maxText} per night. `;
    }
  }

  console.log(`🤖 GPT-4o Mini Matching - Processing ${hotelSummaries.length} hotels`);
  
  // Create enhanced hotel summary for all hotels
  const hotelSummary = hotelSummaries.map((hotel, index) => {
    const priceMatch = hotel.pricePerNight.match(/(\d+)/);
    const numericPrice = priceMatch ? parseInt(priceMatch[1]) : 999999;
    
    const locationInfo = [
      hotel.city !== 'Unknown City' ? hotel.city : '',
      hotel.country !== 'Unknown Country' ? hotel.country : ''
    ].filter(Boolean).join(', ') || 'Location unknown';
    
    const coordinates = hotel.latitude && hotel.longitude 
      ? `(${hotel.latitude.toFixed(4)}, ${hotel.longitude.toFixed(4)})` 
      : '';
    
    const shortAddress = hotel.location && hotel.location !== 'Location not available' 
      ? hotel.location.length > 50 
        ? hotel.location.substring(0, 47) + '...' 
        : hotel.location
      : '';

      const cleanDescription = hotel.description
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&')  // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
    
    const locationDetails = [
      locationInfo,
      shortAddress,
      coordinates
    ].filter(Boolean).join(' | ');
    
     return `${index + 1}: ${hotel.name}|💰${numericPrice}/night|${hotel.starRating}⭐|📍${locationDetails}|🏨${hotel.topAmenities.join(',')}|📝${hotel.reviewCount} reviews|📖${cleanDescription}`;
  }).join('\n');
  
  
  // Create prompts focused on preferences, not price
const prompt = hasSpecificPreferences ? 
  `USER REQUEST: "${parsedQuery.aiSearch}"
STAY: ${nights} nights${budgetContext}

🎯 RANKING PRIORITY ORDER:
1. USER PREFERENCES MATCH (Most Important) - Find hotels that best match what the user is looking for
2. Location convenience and accessibility
3. Star rating and quality
4. Value for money
5. Overall hotel amenities

HOTELS:
${hotelSummary}

CRITICAL REQUIREMENT: You MUST return EXACTLY ${TARGET_HOTEL_COUNT} hotels no matter what! Even if no hotels perfectly match the user's preferences, find the ${TARGET_HOTEL_COUNT} CLOSEST matches available from the list.

TASK: Find hotels that BEST MATCH the user's specific preferences and requirements.
${budgetGuidance}Pay attention to location, amenities, and overall quality that align with user needs.

Return JSON array with EXACTLY ${TARGET_HOTEL_COUNT} hotels:
[{"hotelName":"exact name","aiMatchPercent":30-95}]

REMEMBER: ALWAYS return ${TARGET_HOTEL_COUNT} hotels! Use exact hotel names from list.` :

  `DESTINATION: ${parsedQuery.cityName}, ${parsedQuery.countryCode}
STAY: ${nights} nights${budgetContext}

🎯 RANKING PRIORITY ORDER:
1. OVERALL QUALITY AND VALUE (Most Important) - Best hotels for the destination
2. Location quality and convenience
3. Star rating and amenities
4. Price value proposition
5. Guest satisfaction potential

HOTELS:
${hotelSummary}

CRITICAL REQUIREMENT: You MUST return EXACTLY ${TARGET_HOTEL_COUNT} hotels no matter what!

TASK: Recommend the BEST QUALITY hotels for this destination.
${budgetGuidance}Focus on hotels that consistently deliver great experiences and value.
Return JSON array with EXACTLY ${TARGET_HOTEL_COUNT} hotels:
[{"hotelName":"exact name","aiMatchPercent":60-95}]

REMEMBER: ALWAYS return ${TARGET_HOTEL_COUNT} hotels! Use exact names from list.`;


    `DESTINATION: ${parsedQuery.cityName}, ${parsedQuery.countryCode}
STAY: ${nights} nights${budgetContext}

🎯 RANKING PRIORITY ORDER:
1. OVERALL QUALITY AND VALUE (Most Important) - Best hotels for the destination
2. Location quality and convenience
3. Star rating and amenities
4. Price value proposition
5. Guest satisfaction potential

HOTELS:
${hotelSummary}

CRITICAL REQUIREMENT: You MUST return EXACTLY 5 hotels no matter what!

TASK: Recommend the BEST QUALITY hotels for this destination.
${budgetGuidance}Focus on hotels that consistently deliver great experiences and value.
Return JSON array with EXACTLY 5 hotels:
[{"hotelName":"exact name","aiMatchPercent":60-95}]

REMEMBER: ALWAYS return 5 hotels! Use exact names from list.`;
  
  // Single GPT-4o Mini API call
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert hotel recommendation specialist. Reply ONLY with valid JSON array of 5 items with exact hotel names and match percentages.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 1200,
  });
  
  // Parse response with fallback logic (same as before)
  const parseMatchingResponse = (response: any): Array<{ hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }> => {
    try {
      const aiResponse = response.choices[0]?.message?.content || '[]';
      const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      
      let matches: Array<{ hotelName: string; aiMatchPercent: number }> = [];
      
      try {
        matches = JSON.parse(cleanResponse);
      } catch (jsonError) {
        console.warn('⚠️ JSON parsing failed, using fallback extraction');
        const hotelNameMatches = aiResponse.match(/"([^"]+)"/g);
        const percentMatches = aiResponse.match(/(\d+)/g);
        
        if (hotelNameMatches && percentMatches) {
          matches = hotelNameMatches.slice(0, 5).map((name: string, index: number) => ({
            hotelName: name.replace(/"/g, ''),
            aiMatchPercent: parseInt(percentMatches[index] || '50')
          }));
        }
      }
      
      // Map hotel names back to full hotel data
      const validMatches = matches.slice(0, 5).map(match => {
        const hotelData = hotelSummaries.find(hotel => hotel.name === match.hotelName);
        if (!hotelData) {
          console.warn(`⚠️ Hotel "${match.hotelName}" not found in hotel list`);
          return null;
        }
        return {
          hotelName: match.hotelName,
          aiMatchPercent: match.aiMatchPercent,
          hotelData
        };
      }).filter(Boolean) as Array<{ hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }>;
      
      // FALLBACK: If we don't have 5 valid matches, fill with top hotels
      if (validMatches.length < TARGET_HOTEL_COUNT) {
      const usedHotelIds = new Set(validMatches.map(m => m.hotelData.hotelId));
      const remainingHotels = hotelSummaries.filter(hotel => !usedHotelIds.has(hotel.hotelId));
      
      const topRemainingHotels = remainingHotels
        .sort((a, b) => b.starRating - a.starRating)
        .slice(0, TARGET_HOTEL_COUNT - validMatches.length);
      
      const fallbackMatches = topRemainingHotels.map((hotel, index) => ({
        hotelName: hotel.name,
        aiMatchPercent: hasSpecificPreferences ? 30 + (index * 5) : 60 + (index * 5),
        hotelData: hotel
      }));
      
      validMatches.push(...fallbackMatches);
    }
    
    return validMatches.slice(0, TARGET_HOTEL_COUNT);
    
  } catch (parseError) {
    // ULTIMATE FALLBACK: Just return top TARGET_HOTEL_COUNT hotels by star rating
    const fallbackHotels = hotelSummaries
      .sort((a, b) => b.starRating - a.starRating)
      .slice(0, TARGET_HOTEL_COUNT)
      .map((hotel, index) => ({
        hotelName: hotel.name,
        aiMatchPercent: hasSpecificPreferences ? 25 + (index * 5) : 55 + (index * 5),
        hotelData: hotel
      }));
    
    return fallbackHotels;
  }
};
  
  const matches = parseMatchingResponse(response);
  
  // Ensure exactly 5 matches
  if (matches.length === 0) {
    const emergencyMatches = hotelSummaries
      .sort((a, b) => b.starRating - a.starRating)
      .slice(0, 5)
      .map((hotel, index) => ({
        hotelName: hotel.name,
        aiMatchPercent: hasSpecificPreferences ? 20 + (index * 5) : 50 + (index * 5),
        hotelData: hotel
      }));
    
    return emergencyMatches;
  }
  
  return matches.slice(0, 5);
};

// 2. ADD THIS NEW STREAMING GPT FUNCTION alongside your existing gptHotelMatching function

const gptHotelMatchingSSE = async (
  hotelSummaries: HotelSummaryForAI[], 
  parsedQuery: ParsedSearchQuery, 
  nights: number,
  sendUpdate: (type: string, data: any) => void,
  hotelMetadataMap: Map<string, Record<string, unknown>>,
  hotelsWithRates: any[]
): Promise<Array<{ hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }>> => {
  
  const hasSpecificPreferences = parsedQuery.aiSearch && parsedQuery.aiSearch.trim() !== '';
  
  // Budget context (same as before)
  let budgetContext = '';
  let budgetGuidance = '';
  
  if (parsedQuery.minCost || parsedQuery.maxCost) {
    const minText = parsedQuery.minCost ? `${parsedQuery.minCost}` : '';
    const maxText = parsedQuery.maxCost ? `${parsedQuery.maxCost}` : '';
    
    if (minText && maxText) {
      budgetContext = `\n💰 BUDGET CONSTRAINT: ${minText} - ${maxText}/night`;
      budgetGuidance = `IMPORTANT: Stay within the specified budget of ${minText}-${maxText}/night. `;
    } else if (minText) {
      budgetContext = `\n💰 MINIMUM BUDGET: ${minText}+ per night`;
      budgetGuidance = `IMPORTANT: Only select hotels ${minText}+ per night. `;
    } else if (maxText) {
      budgetContext = `\n💰 MAXIMUM BUDGET: Under ${maxText} per night`;
      budgetGuidance = `IMPORTANT: Only select hotels under ${maxText} per night. `;
    }
  }

  console.log(`🤖 GPT-4o Mini Order-Preserving Stream - Processing ${hotelSummaries.length} hotels`);
  
  // Create hotel summary (same as before)
  const hotelSummary = hotelSummaries.map((hotel, index) => {
    const priceMatch = hotel.pricePerNight.match(/(\d+)/);
    const numericPrice = priceMatch ? parseInt(priceMatch[1]) : 999999;
    
    const locationInfo = [
      hotel.city !== 'Unknown City' ? hotel.city : '',
      hotel.country !== 'Unknown Country' ? hotel.country : ''
    ].filter(Boolean).join(', ') || 'Location unknown';
    
    const shortDescription = hotel.description
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim()
      .substring(0, 100) + (hotel.description.length > 100 ? '...' : '');
    
    return `${index + 1}: ${hotel.name} | $${numericPrice}/night | ${hotel.starRating}⭐ | ${locationInfo} | ${hotel.topAmenities.slice(0,2).join(',')} | ${shortDescription}`;
  }).join('\n');
  
  // ✅ CLEAR PROMPT: Emphasize ranking order for 15 hotels
  const prompt = hasSpecificPreferences ? 
    `USER REQUEST: "${parsedQuery.aiSearch}"
STAY: ${nights} nights${budgetContext}

🎯 RANKING PRIORITY ORDER:
1. USER PREFERENCES MATCH (Most Important)
2. Location convenience
3. Star rating and quality
4. Value for money

HOTELS:
${hotelSummary}

CRITICAL: Return the 15 BEST hotels in RANKING ORDER (best first, worst last).
${budgetGuidance}

Format (exact numbering required):
1. [exact hotel name] | [match percentage]%
2. [exact hotel name] | [match percentage]%
3. [exact hotel name] | [match percentage]%
...continue through...
15. [exact hotel name] | [match percentage]%

Use exact hotel names from the list. Number 1 = BEST match, Number 15 = 15th best.` :

    `DESTINATION: ${parsedQuery.cityName}, ${parsedQuery.countryCode}
STAY: ${nights} nights${budgetContext}

🎯 RANKING PRIORITY ORDER:
1. OVERALL QUALITY AND VALUE (Most Important)
2. Location quality
3. Star rating and amenities
4. Price value proposition

HOTELS:
${hotelSummary}

CRITICAL: Return the 15 BEST hotels in QUALITY RANKING ORDER (best first).
${budgetGuidance}

Format (exact numbering required):
1. [exact hotel name] | [match percentage]%
2. [exact hotel name] | [match percentage]%
3. [exact hotel name] | [match percentage]%
...continue through...
15. [exact hotel name] | [match percentage]%

Use exact hotel names from the list. Number 1 = HIGHEST quality, Number 15 = 15th highest.`;

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert hotel ranker. Return exactly 15 hotels in ranking order (1=best, 15=worst). Use the exact numbering format requested.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 1200, // Increased for 15 hotels
    stream: true,
  });

  // ✅ KEY FIX: Store hotels with their ranking numbers
  let buffer = '';
  const rankedHotels = new Map<number, { hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }>();
  let hotelsStreamed = 0;
  
  try {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      buffer += content;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const parsed = parseRankedHotelLine(line.trim(), hotelSummaries);
        if (parsed && !rankedHotels.has(parsed.rank)) {
          rankedHotels.set(parsed.rank, {
            hotelName: parsed.hotelName,
            aiMatchPercent: parsed.aiMatchPercent,
            hotelData: parsed.hotelData
          });
          
          console.log(`✅ Ranked hotel #${parsed.rank}: ${parsed.hotelName} (${parsed.aiMatchPercent}%)`);
          
          // ✅ STREAM in the ORDER GPT intended (by rank number)
          const success = await sendHotelViaSSE(
            { hotelName: parsed.hotelName, aiMatchPercent: parsed.aiMatchPercent, hotelData: parsed.hotelData }, 
            parsed.rank, // Use GPT's ranking as display position
            hotelsWithRates, 
            hotelMetadataMap, 
            nights, 
            sendUpdate
          );
          if (success) {
            hotelsStreamed++;
          }
        }
      }
    }
    
    // Process remaining buffer
    if (buffer.trim()) {
      const remainingLines = buffer.split('\n');
      for (const line of remainingLines) {
        if (line.trim()) {
          const parsed = parseRankedHotelLine(line.trim(), hotelSummaries);
          if (parsed && !rankedHotels.has(parsed.rank)) {
            rankedHotels.set(parsed.rank, {
              hotelName: parsed.hotelName,
              aiMatchPercent: parsed.aiMatchPercent,
              hotelData: parsed.hotelData
            });
            
            await sendHotelViaSSE(
              { hotelName: parsed.hotelName, aiMatchPercent: parsed.aiMatchPercent, hotelData: parsed.hotelData },
              parsed.rank,
              hotelsWithRates,
              hotelMetadataMap,
              nights,
              sendUpdate
            );
            hotelsStreamed++;
          }
        }
      }
    }
    
  } catch (streamError) {
    console.error('❌ Streaming error:', streamError);
    sendUpdate('error', { message: 'AI matching encountered an error' });
    throw streamError;
  }

  // ✅ CRITICAL: Return hotels in GPT's intended ranking order (1, 2, 3, ..., 15)
  const orderedMatches: Array<{ hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }> = [];
  
  for (let rank = 1; rank <= 15; rank++) {
    if (rankedHotels.has(rank)) {
      orderedMatches.push(rankedHotels.get(rank)!);
    }
  }
  
  console.log(`🏆 Final ranking order: ${orderedMatches.map((h, i) => `${i+1}. ${h.hotelName}`).join(', ')}`);

  // Fill any missing slots with quality fallbacks (in order)
  if (orderedMatches.length < 15) {
    const usedHotelIds = new Set(orderedMatches.map(m => m.hotelData.hotelId));
    const fallbackHotels = hotelSummaries
      .filter(hotel => !usedHotelIds.has(hotel.hotelId))
      .sort((a, b) => b.starRating - a.starRating)
      .slice(0, 15 - orderedMatches.length);
    
    for (const hotel of fallbackHotels) {
      const fallbackMatch = {
        hotelName: hotel.name,
        aiMatchPercent: hasSpecificPreferences ? 65 : 75,
        hotelData: hotel
      };
      
      orderedMatches.push(fallbackMatch);
      // Stream fallback in the next available position
      await sendHotelViaSSE(fallbackMatch, orderedMatches.length, hotelsWithRates, hotelMetadataMap, nights, sendUpdate);
    }
  }

  return orderedMatches.slice(0, 15); // Return in GPT's intended ranking order
};

// ✅ NEW: Parser that extracts ranking number
const parseRankedHotelLine = (
  line: string, 
  hotelSummaries: HotelSummaryForAI[]
): { rank: number; hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI } | null => {
  try {
    // Parse format: "1. Hotel Name | 85%"
    const match = line.match(/^(\d+)\.\s*([^|]+)\s*\|\s*(\d+)%/);
    if (!match) {
      return null;
    }
    
    const rank = parseInt(match[1]);
    const hotelName = match[2].trim();
    const aiMatchPercent = parseInt(match[3]);
    
    // Validate rank is 1-15
    if (rank < 1 || rank > 15) {
      console.warn(`⚠️ Invalid rank ${rank} for hotel: ${hotelName}`);
      return null;
    }
    
    // Find exact hotel match
    const hotelData = hotelSummaries.find(hotel => 
      hotel.name.toLowerCase() === hotelName.toLowerCase() ||
      hotel.name.toLowerCase().includes(hotelName.toLowerCase()) ||
      hotelName.toLowerCase().includes(hotel.name.toLowerCase())
    );
    
    if (!hotelData) {
      console.warn(`⚠️ Hotel "${hotelName}" not found in summaries`);
      return null;
    }
    
    return {
      rank,
      hotelName: hotelData.name,
      aiMatchPercent: Math.min(Math.max(aiMatchPercent, 1), 100),
      hotelData
    };
    
  } catch (error) {
    console.warn(`⚠️ Error parsing ranked line "${line}":`, error);
    return null;
  }
};

// 🔥 EXTRACT AND IMPROVE sendHotelViaSSE function
const sendHotelViaSSE = async (
  parsedHotel: { hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI },
  hotelIndex: number,
  hotelsWithRates: any[],
  hotelMetadataMap: Map<string, Record<string, unknown>>,
  nights: number,
  sendUpdate: (type: string, data: any) => void
): Promise<boolean> => {
  try {
    const matchingHotel = hotelsWithRates.find((hotel: any) => {
      const hotelId = hotel.hotelId || hotel.id || hotel.hotel_id;
      return hotelId === parsedHotel.hotelData.hotelId;
    });

    if (!matchingHotel) {
      console.warn(`⚠️ No matching hotel found for: ${parsedHotel.hotelName}`);
      return false;
    }

    const hotelId = matchingHotel.hotelId || matchingHotel.id || matchingHotel.hotel_id;
    const hotelMetadata = hotelMetadataMap.get(String(hotelId));
    
    if (!hotelMetadata) {
      console.warn(`⚠️ No metadata found for hotel: ${parsedHotel.hotelName} (ID: ${hotelId})`);
      return false;
    }

    const enrichedHotelSummary = createHotelSummaryForInsights(matchingHotel, hotelMetadata, nights);
    
    const enrichedHotel = {
      ...enrichedHotelSummary,
      aiMatchPercent: parsedHotel.aiMatchPercent,
      summarizedInfo: {
        name: enrichedHotelSummary.name,
        description: hotelMetadata?.hotelDescription || hotelMetadata?.description || 'No description available',
        amenities: enrichedHotelSummary.topAmenities,
        starRating: enrichedHotelSummary.starRating,
        reviewCount: enrichedHotelSummary.reviewCount,
        pricePerNight: enrichedHotelSummary.pricePerNight?.display || 'Price not available',
        location: enrichedHotelSummary.address,
        city: enrichedHotelSummary.city,
        country: enrichedHotelSummary.country,
        latitude: enrichedHotelSummary.latitude,
        longitude: enrichedHotelSummary.longitude
      }
    };

    // SEND HOTEL via SSE
    sendUpdate('hotel_found', {
  hotelIndex: hotelIndex,
  totalExpected: TARGET_HOTEL_COUNT, // Changed from: 5
  hotel: enrichedHotel,
  message: `Found perfect match: ${enrichedHotel.name} (${parsedHotel.aiMatchPercent}% match)`
});

    console.log(`📡 Streamed hotel ${hotelIndex}/5: ${enrichedHotel.name} (${parsedHotel.aiMatchPercent}%)`);
    return true;

  } catch (error) {
    console.error(`❌ Error streaming hotel ${parsedHotel.hotelName}:`, error);
    return false;
  }
};

// 3. ADD THIS HELPER FUNCTION (same as before)
const parseHotelLine = (
  line: string, 
  hotelSummaries: HotelSummaryForAI[]
): { hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI } | null => {
  try {
    // Parse format: HOTEL1: Hotel Name|MATCH: 85|REASON: Some reason
    const hotelMatch = line.match(/HOTEL\d+:\s*([^|]+)\|MATCH:\s*(\d+)/i);
    if (!hotelMatch) {
      console.warn(`⚠️ Could not parse line: "${line}"`);
      return null;
    }
    
    const hotelName = hotelMatch[1].trim();
    const aiMatchPercent = parseInt(hotelMatch[2]);
    
    // Find matching hotel data
    const hotelData = hotelSummaries.find(hotel => 
      hotel.name.toLowerCase() === hotelName.toLowerCase() ||
      hotel.name.toLowerCase().includes(hotelName.toLowerCase()) ||
      hotelName.toLowerCase().includes(hotel.name.toLowerCase())
    );
    
    if (!hotelData) {
      console.warn(`⚠️ Hotel "${hotelName}" not found in hotel summaries`);
      return null;
    }
    
    return {
      hotelName: hotelData.name, // Use exact name from data
      aiMatchPercent: Math.min(Math.max(aiMatchPercent, 1), 100), // Clamp between 1-100
      hotelData
    };
    
  } catch (error) {
    console.warn(`⚠️ Error parsing line "${line}":`, error);
    return null;
  }
};

// OPTIMIZED: Create hotel summary using existing data (no additional API calls)
const createHotelSummaryForInsights = (hotel: HotelWithRates, hotelMetadata: any, nights: number) => {
  const { priceRange, suggestedPrice, priceProvider } = calculatePriceInfo(hotel, nights);
  const refundablePolicy = extractRefundablePolicy(hotel);
  const topAmenities = getTop3Amenities(hotelMetadata);
  const images = extractHotelImages(hotelMetadata);
  
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
    name: hotelMetadata?.name || 'Unknown Hotel',
    starRating: hotelMetadata?.rating || (hotelMetadata?.starRating * 2) - (Math.random() * 0.2 + 0.2) || 7.5, 
    images: images.slice(0, 5),
    pricePerNight: pricePerNight,
    reviewCount: fakeReviewCount,
    address: hotelMetadata?.address || 'Address not available',
    amenities: hotelMetadata?.amenities || [],
    description: hotelMetadata?.hotelDescription || hotelMetadata?.description || 'No description available',
    coordinates: {
      latitude: hotelMetadata?.latitude || null,
      longitude: hotelMetadata?.longitude || null
    },
    priceRange: priceRange,
    totalRooms: hotel.roomTypes ? hotel.roomTypes.length : 0,
    hasAvailability: hotel.roomTypes && hotel.roomTypes.length > 0,
    roomTypes: hotel.roomTypes,
    suggestedPrice: suggestedPrice,
    priceProvider: priceProvider,
    city: hotelMetadata?.city || 'Unknown City',
    country: hotelMetadata?.country || 'Unknown Country',
    latitude: hotelMetadata?.latitude || null,
    longitude: hotelMetadata?.longitude || null,
    topAmenities: topAmenities,
    isRefundable: refundablePolicy.isRefundable,
    refundableTag: refundablePolicy.refundableTag,
    refundableInfo: refundablePolicy.refundableInfo,
    cancellationPolicies: hotel.roomTypes?.flatMap(room => 
      room.rates?.map(rate => ({
        refundableTag: rate.cancellationPolicies?.refundableTag,
        cancelPolicyInfos: rate.cancellationPolicies?.cancelPolicyInfos || [],
        hotelRemarks: rate.cancellationPolicies?.hotelRemarks || []
      })) || []
    ) || []
  };
};

const applyHardPriceFilter = (
  hotelSummaries: HotelSummaryForAI[], 
  parsedQuery: ParsedSearchQuery
): HotelSummaryForAI[] => {
  
  if (!parsedQuery.minCost && !parsedQuery.maxCost) {
    console.log('💰 No price filter applied - using all hotels');
    return hotelSummaries;
  }

  console.log(`💰 Applying hard price filter: ${parsedQuery.minCost || 'no min'} - ${parsedQuery.maxCost || 'no max'}/night`);

  const withinBudget: HotelSummaryForAI[] = [];
  const outsideBudget: Array<{ hotel: HotelSummaryForAI, price: number, distance: number }> = [];

  hotelSummaries.forEach(hotel => {
    const priceMatch = hotel.pricePerNight.match(/(\d+)/);
    if (!priceMatch) {
      console.warn(`⚠️ Could not extract price from: "${hotel.pricePerNight}"`);
      return;
    }
    
    const price = parseInt(priceMatch[1]);
    
    // Check if within budget
    const withinMin = !parsedQuery.minCost || price >= parsedQuery.minCost;
    const withinMax = !parsedQuery.maxCost || price <= parsedQuery.maxCost;
    
    if (withinMin && withinMax) {
      withinBudget.push(hotel);
      console.log(`✅ ${hotel.name}: ${price} (WITHIN BUDGET)`);
    } else {
      // Calculate how far outside budget
      let distance = 0;
      if (parsedQuery.minCost && price < parsedQuery.minCost) {
        distance = parsedQuery.minCost - price;
      } else if (parsedQuery.maxCost && price > parsedQuery.maxCost) {
        distance = price - parsedQuery.maxCost;
      }
      outsideBudget.push({ hotel, price, distance });
      console.log(`❌ ${hotel.name}: ${price} (OUTSIDE BUDGET - distance: ${distance})`);
    }
  });

  // Ensure AI gets at least 20 hotels for good selection
  const minHotelsForAI = 30;
  
  // If we have enough hotels within budget, use only those (but at least 20)
  if (withinBudget.length >= minHotelsForAI) {
    console.log(`🎯 Found ${withinBudget.length} hotels within budget - using only these`);
    return withinBudget;
  }

  // If not enough within budget, add closest ones to reach 20 hotels
  const neededHotels = minHotelsForAI - withinBudget.length;
  const sortedOutside = outsideBudget
    .sort((a, b) => a.distance - b.distance)
    .slice(0, neededHotels);

  const finalHotels = [...withinBudget, ...sortedOutside.map(item => item.hotel)];
  
  console.log(`⚠️ Only ${withinBudget.length} within budget, adding ${sortedOutside.length} closest hotels (total: ${finalHotels.length})`);
  sortedOutside.forEach(item => {
    console.log(`  Adding: ${item.hotel.name} (${item.price}, distance: ${item.distance})`);
  });

  return finalHotels;
};

// 1. MODIFY YOUR EXISTING FUNCTION - Add these changes to hotelSearchAndMatchController

export const hotelSearchAndMatchController = async (req: Request, res: Response) => {
  const logger = new PerformanceLogger();
  
  const { userInput, enableStreaming = false, includeStage1Data = false } = req.body;

  if (!userInput) {
    return res.status(400).json({ error: 'userInput is required' });
  }

  // SET UP SSE headers if streaming enabled
  if (enableStreaming) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
  }

  // Helper function for sending updates
  const sendUpdate = (type: string, data: any) => {
    if (enableStreaming) {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    }
  };

  // NEW: Store Stage 1 data for insights
  let stage1DataForInsights: any = null;
  
  try {

    console.log('🚀 OPTIMIZED Hotel Search and Match Starting for:', userInput);
    const searchId = randomUUID();

    // STEP 1: Parse user input - ADD streaming update
    sendUpdate('progress', { message: 'Understanding your request...', step: 1, totalSteps: 8 });
    
    logger.startStep('1-ParseQuery', { userInput });
    
    const parseResponse = await internalApiInstance.post('/api/query/parse', { userInput });
    const parsedQuery: ParsedSearchQuery = parseResponse.data;
    logger.endStep('1-ParseQuery', { parsedQuery });

    // Validate parsed data
    if (!parsedQuery.checkin || !parsedQuery.checkout || !parsedQuery.countryCode || !parsedQuery.cityName) {
      if (enableStreaming) {
        sendUpdate('error', { 
          message: 'Could not understand your search request. Please try again with clearer details.',
          parsed: parsedQuery
        });
        res.end();
        return;
      } else {
        return res.status(400).json({ 
          error: 'Incomplete search parameters',
          message: 'Could not extract all required search parameters from your input',
          parsed: parsedQuery
        });
      }
    }

    const nights = Math.ceil((new Date(parsedQuery.checkout).getTime() - new Date(parsedQuery.checkin).getTime()) / (1000 * 60 * 60 * 24));

    // STEP 2: Fetch hotels with ALL metadata - ADD streaming update
    sendUpdate('progress', { 
      message: `Searching for hotels in ${parsedQuery.cityName}...`, 
      step: 2, 
      totalSteps: 8,
      destination: `${parsedQuery.cityName}, ${parsedQuery.countryCode}`
    });
    
    logger.startStep('2-FetchHotelsWithMetadata', { limit: SMART_HOTEL_LIMIT, city: parsedQuery.cityName, country: parsedQuery.countryCode });
    
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

    logger.endStep('2-FetchHotelsWithMetadata', { hotelCount: hotels?.length || 0 });

    if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
      if (enableStreaming) {
        sendUpdate('error', {
          message: `No hotels found in ${parsedQuery.cityName}, ${parsedQuery.countryCode}. Try a different city.`,
          searchParams: parsedQuery
        });
        res.end();
        return;
      } else {
        return res.status(404).json({
          error: 'No hotels found',
          message: `No hotels found in ${parsedQuery.cityName}, ${parsedQuery.countryCode}`,
          searchParams: parsedQuery
        });
      }
    }

    sendUpdate('progress', { 
      message: `Found ${hotels.length} hotels, checking availability...`, 
      step: 3, 
      totalSteps: 8,
      hotelsFound: hotels.length
    });

    // STEP 3: Build metadata map from initial hotel search
    logger.startStep('3-BuildMetadataMap', { hotelCount: hotels.length });
    
    const hotelMetadataMap = new Map<string, Record<string, unknown>>();
    hotels.forEach((hotel: Record<string, unknown>) => {
      const id = hotel.id || hotel.hotelId || hotel.hotel_id || hotel.code;
      if (id) {
        hotelMetadataMap.set(String(id), hotel);
      }
    });
    
    logger.endStep('3-BuildMetadataMap', { metadataEntries: hotelMetadataMap.size });

    // STEP 4: Fetch rates for all hotels - ADD streaming update
    const hotelIds = hotels.map((hotel: any) => 
      hotel.id || hotel.hotelId || hotel.hotel_id || hotel.code
    ).filter(Boolean);

    sendUpdate('progress', { 
      message: 'Checking prices and availability for your dates...', 
      step: 4, 
      totalSteps: 8,
      checkin: parsedQuery.checkin,
      checkout: parsedQuery.checkout
    });

    logger.startStep('4-FetchRates', { hotelCount: hotelIds.length, checkin: parsedQuery.checkin, checkout: parsedQuery.checkout });

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
      timeout: 3,
      maxRatesPerHotel: 1,
      hotelIds: hotelIds
    };

    const ratesResponse = await liteApiInstance.post('/hotels/rates', ratesRequestBody, {
      timeout: 20000
    });

    let hotelsWithRates = ratesResponse.data?.data || ratesResponse.data || [];

    // Ensure hotelsWithRates is always an array
    if (!Array.isArray(hotelsWithRates)) {
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

    logger.endStep('4-FetchRates', { hotelsWithRates: hotelsWithRates.length });

    if (hotelsWithRates.length === 0) {
      if (enableStreaming) {
        sendUpdate('error', {
          message: 'No hotels available for your dates. Try different dates or destination.',
          searchParams: parsedQuery
        });
        res.end();
        return;
      } else {
        logger.failStep('4-FetchRates', new Error('No available hotels'));
        return res.status(404).json({
          error: 'No available hotels',
          message: 'Hotels found but no availability for your dates',
          searchParams: parsedQuery
        });
      }
    }

    sendUpdate('progress', { 
      message: `${hotelsWithRates.length} hotels available, preparing recommendations...`, 
      step: 5, 
      totalSteps: 8,
      availableHotels: hotelsWithRates.length
    });

    // STEP 5: Build AI summaries using existing metadata
    logger.startStep('5-BuildAISummaries', { hotelCount: hotelsWithRates.length });

    const hotelSummariesForAI: HotelSummaryForAI[] = [];
    
    hotelsWithRates.forEach((rateHotel: any, index: number) => {
      try {
        if (!rateHotel || typeof rateHotel !== 'object') {
          return;
        }

        const hotelId = rateHotel.hotelId || rateHotel.id || rateHotel.hotel_id;
        if (!hotelId) {
          return;
        }

        const hotelMetadata = hotelMetadataMap.get(String(hotelId));
        
        if (!hotelMetadata) {
          return;
        }

        const summary = createOptimizedHotelSummaryForAI(rateHotel, hotelMetadata, index, nights);
        hotelSummariesForAI.push(summary);
        
      } catch (error) {
        console.warn(`⚠️  Error processing hotel at index ${index}:`, error);
      }
    });
    
    logger.endStep('5-BuildAISummaries', { summariesBuilt: hotelSummariesForAI.length });

    if (hotelSummariesForAI.length === 0) {
      if (enableStreaming) {
        sendUpdate('error', {
          message: 'Found hotels but could not process any for recommendations.',
          searchParams: parsedQuery
        });
        res.end();
        return;
      } else {
        return res.status(404).json({
          error: 'No processable hotels',
          message: 'Found hotels but could not process any for AI recommendations',
          searchParams: parsedQuery
        });
      }
    }

    // STEP 6: Apply hard price filter BEFORE AI matching
    sendUpdate('progress', { 
      message: 'Filtering hotels by your budget preferences...', 
      step: 6, 
      totalSteps: 8
    });

    logger.startStep('6-PriceFilter', { 
      originalCount: hotelSummariesForAI.length,
      minCost: parsedQuery.minCost,
      maxCost: parsedQuery.maxCost
    });

    const priceFilteredHotels = applyHardPriceFilter(hotelSummariesForAI, parsedQuery);

    logger.endStep('6-PriceFilter', { 
      filteredCount: priceFilteredHotels.length,
      removedCount: hotelSummariesForAI.length - priceFilteredHotels.length
    });

    // STEP 7: GPT AI Matching - CHOOSE streaming or regular based on enableStreaming
    sendUpdate('progress', { 
      message: 'AI is analyzing hotels for your perfect matches...', 
      step: 7, 
      totalSteps: 8
    });

    logger.startStep('7-GPTMatching', { hotelCount: priceFilteredHotels.length });
    
    // MODIFY THIS: Use streaming or regular GPT matching
    let gptMatches;
    if (enableStreaming) {
      gptMatches = await gptHotelMatchingSSE(
        priceFilteredHotels, 
        parsedQuery, 
        nights,
        sendUpdate,
        hotelMetadataMap,
        hotelsWithRates
      );
    } else {
      gptMatches = await gptHotelMatching(priceFilteredHotels, parsedQuery, nights);
    }
    
    logger.endStep('7-GPTMatching', { matches: gptMatches.length });

    if (gptMatches.length === 0) {
      if (enableStreaming) {
        sendUpdate('error', { message: 'AI matching system failed to find suitable hotels' });
        res.end();
        return;
      } else {
        throw new Error('CRITICAL ERROR: GPT matching system completely failed');
      }
    }

    // STEP 8: Build enriched hotel data for matched hotels
    sendUpdate('progress', { 
      message: 'Finalizing your perfect hotel matches...', 
      step: 8, 
      totalSteps: 8
    });

    logger.startStep('8-BuildEnrichedData', { selectedHotels: gptMatches.length });

    const enrichedHotels = gptMatches.map(match => {
      const matchingHotel = hotelsWithRates.find((hotel: any) => {
        const hotelId = hotel.hotelId || hotel.id || hotel.hotel_id;
        return hotelId === match.hotelData.hotelId;
      });

      if (!matchingHotel) {
        console.warn(`Warning: Could not find hotel "${match.hotelName}" in original data`);
        return null;
      }

      const hotelId = matchingHotel.hotelId || matchingHotel.id || matchingHotel.hotel_id;
      const hotelMetadata = hotelMetadataMap.get(String(hotelId));
      
      if (!hotelMetadata) {
        console.warn(`Warning: Could not find metadata for hotel "${match.hotelName}"`);
        return null;
      }

      const enrichedHotelSummary = createHotelSummaryForInsights(matchingHotel, hotelMetadata, nights);
      
      return {
        ...enrichedHotelSummary,
        aiMatchPercent: match.aiMatchPercent,
        summarizedInfo: {
          name: enrichedHotelSummary.name,
          description: hotelMetadata?.hotelDescription || hotelMetadata?.description || 'No description available',
          amenities: enrichedHotelSummary.topAmenities,
          starRating: enrichedHotelSummary.starRating,
          reviewCount: enrichedHotelSummary.reviewCount,
          pricePerNight: enrichedHotelSummary.pricePerNight?.display || 'Price not available',
          location: enrichedHotelSummary.address,
          city: enrichedHotelSummary.city,
          country: enrichedHotelSummary.country,
          latitude: enrichedHotelSummary.latitude,
          longitude: enrichedHotelSummary.longitude,
          // NEW: Add refundable info to summarized data
          isRefundable: enrichedHotelSummary.isRefundable,
          refundableInfo: enrichedHotelSummary.refundableInfo
        }
      };
    }).filter(Boolean);

    logger.endStep('8-BuildEnrichedData', { enrichedHotels: enrichedHotels.length });

    // NEW: Prepare Stage 1 data structure for AI insights
    if (enableStreaming && includeStage1Data) {
      stage1DataForInsights = {
        searchParams: {
          checkin: parsedQuery.checkin,
          checkout: parsedQuery.checkout,
          countryCode: parsedQuery.countryCode,
          cityName: parsedQuery.cityName,
          language: parsedQuery.language || 'en',
          adults: parsedQuery.adults || 2,
          children: parsedQuery.children || 0,
          aiSearch: userInput,
          nights: nights,
          currency: 'USD',
          minCost: parsedQuery.minCost || null,
          maxCost: parsedQuery.maxCost || null
        },
        hotels: enrichedHotels.map(hotel => ({
          hotelId: hotel?.hotelId ?? null,
          name: hotel?.name ?? null,
          aiMatchPercent: hotel?.aiMatchPercent ?? null,
          starRating: hotel?.starRating ?? null,
          images: hotel?.images ?? [],
          pricePerNight: hotel?.pricePerNight ?? null,
          reviewCount: hotel?.reviewCount ?? null,
          address: hotel?.address ?? null,
          amenities: hotel?.amenities ?? hotel?.topAmenities ?? [],
          description: hotel?.description ?? 'Quality accommodation',
          coordinates: {
        latitude: hotel?.latitude ?? hotel?.coordinates?.latitude ?? null,
        longitude: hotel?.longitude ?? hotel?.coordinates?.longitude ?? null
          },
          priceRange: hotel?.priceRange ?? null,
          totalRooms: hotel?.totalRooms ?? 1,
          hasAvailability: hotel?.hasAvailability !== false,
          roomTypes: hotel?.roomTypes ?? [],
          city: hotel?.city ?? 'Unknown City',
          country: hotel?.country ?? 'Unknown Country',
          latitude: hotel?.latitude ?? hotel?.coordinates?.latitude ?? null,
          longitude: hotel?.longitude ?? hotel?.coordinates?.longitude ?? null,
          topAmenities: hotel?.topAmenities ?? [],
          isRefundable: hotel?.isRefundable ?? false,
          refundableTag: hotel?.refundableTag ?? null,
          refundableInfo: hotel?.refundableInfo ?? 'No refund information available',
          summarizedInfo: hotel?.summarizedInfo ?? null
        })),
        matchedHotelsCount: enrichedHotels.length,
        searchId: searchId,
        aiMatchingCompleted: true
      };

      console.log(`📦 Stage 1 data prepared for insights: ${stage1DataForInsights.hotels.length} hotels`);
    }

    // Final response
    const performanceReport = logger.getDetailedReport();
    console.log(`🚀 Hotel Search and Match Complete in ${performanceReport.totalTime}ms ✅`);

    // MODIFIED: Send response based on streaming mode
    if (enableStreaming) {
      sendUpdate('complete', {
        message: `Found ${TARGET_HOTEL_COUNT} perfect hotels for you!`,
        searchId: searchId,
        totalHotels: enrichedHotels.length,
        performance: {
          totalTimeMs: performanceReport.totalTime,
          optimization: 'Streamed results with real-time updates'
        },
        // NEW: Include Stage 1 data if requested
        ...(includeStage1Data && stage1DataForInsights && {
          stage1Data: stage1DataForInsights
        })
      });
      res.end();
    } else {
      // Regular response for non-streaming requests
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
        aiModel: "gpt-4o-mini",
        performance: {
          totalTimeMs: performanceReport.totalTime,
          stepBreakdown: performanceReport.steps,
          bottlenecks: performanceReport.bottlenecks,
          optimization: `Eliminated ${hotelSummariesForAI.length} redundant detail API calls`
        }
      });
    }

  } catch (error) {
    console.error('Error in hotel search and match:', error);
    const errorReport = logger.getDetailedReport();
    
    if (enableStreaming) {
      sendUpdate('error', {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        step: 'unknown'
      });
      res.end();
      return;
    }

    // Regular error handling for non-streaming requests
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return res.status(error.response.status).json({
          error: 'API error',
          message: error.response.data?.message || error.response.data?.error?.description || 'Unknown API error',
          details: error.response.data,
          step: error.config?.url?.includes('/parse') ? 'parsing' : 
                error.config?.url?.includes('/data/hotels') ? 'hotel_search' : 
                error.config?.url?.includes('openai') ? 'gpt_matching' : 'rates_search',
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