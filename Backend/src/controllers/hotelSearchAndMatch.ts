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

// NEW: Helper function to fetch detailed hotel data
const fetchHotelDetails = async (hotelId: string): Promise<any> => {
  try {
    const response = await liteApiInstance.get(`/data/hotel?hotelId=${hotelId}`, {
      timeout: 8000
    });
    const detailData = response.data?.data || response.data;
    return detailData;
  } catch (error) {
    console.warn(`⚠️ Failed to fetch details for hotel ${hotelId}:`, error);
    return null;
  }
};

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

// FIXED: Helper function to extract images from hotelImages array
const extractHotelImages = (hotelInfo: any): string[] => {
  const images: string[] = [];
  
  // Check if hotelImages is directly available (from detailed endpoint)
  let hotelImagesArray = hotelInfo?.hotelImages;
  
  // Also check nested paths
  if (!hotelImagesArray && hotelInfo?.data?.hotelImages) {
    hotelImagesArray = hotelInfo.data.hotelImages;
  }
  
  if (hotelImagesArray && Array.isArray(hotelImagesArray)) {
    // Get images from hotelImages array (prefer HD, fallback to regular)
    const imageUrls = hotelImagesArray
      .slice(0, 8) // Take up to 8 images
      .map((imageObj: any) => {
        if (typeof imageObj === 'string') {
          return imageObj;
        }
        
        // Prefer HD URL if available, otherwise use regular URL
        return imageObj.urlHd || imageObj.url;
      })
      .filter(Boolean); // Remove any null/undefined URLs
        
    images.push(...imageUrls);
  }
    
  // Fallback: use main_photo and thumbnail if hotelImages not available
  if (images.length === 0) {
    const mainPhoto = hotelInfo?.main_photo || hotelInfo?.data?.main_photo;
    const thumbnail = hotelInfo?.thumbnail || hotelInfo?.data?.thumbnail;
    const oldImages = hotelInfo?.images || hotelInfo?.data?.images;
    
    if (mainPhoto) {
      images.push(mainPhoto);
    }
    if (thumbnail && thumbnail !== mainPhoto) {
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

// Simplified Llama hotel matching and ranking (no batch processing)
const llamaHotelMatching = async (
  hotelSummaries: HotelSummaryForAI[], 
  parsedQuery: ParsedSearchQuery, 
  nights: number
): Promise<Array<{ hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }>> => {
  
  const hasSpecificPreferences = parsedQuery.aiSearch && parsedQuery.aiSearch.trim() !== '';
  
  // Price context for prompts - MAKE PRICE THE TOP PRIORITY
  let priceContext = '';
  let budgetGuidance = '';
  
  if (parsedQuery.minCost || parsedQuery.maxCost) {
    const minText = parsedQuery.minCost ? `${parsedQuery.minCost}` : '';
    const maxText = parsedQuery.maxCost ? `${parsedQuery.maxCost}` : '';
    
    if (minText && maxText) {
      priceContext = `\n🔥 BUDGET REQUIREMENT: ${minText} - ${maxText}/night`;
      budgetGuidance = `CRITICAL: PRICE IS THE #1 PRIORITY! Only select hotels within ${minText}-${maxText}/night range. `;
    } else if (minText) {
      priceContext = `\n🔥 MINIMUM BUDGET: ${minText}+ per night`;
      budgetGuidance = `CRITICAL: PRICE IS THE #1 PRIORITY! Only select hotels ${minText}+ per night. `;
    } else if (maxText) {
      priceContext = `\n🔥 MAXIMUM BUDGET: Under ${maxText} per night`;
      budgetGuidance = `CRITICAL: PRICE IS THE #1 PRIORITY! Only select hotels under ${maxText} per night. `;
    }
  } else {
    budgetGuidance = `PRICE IS THE #1 PRIORITY! Select the best value hotels with lowest prices first. `;
  }

  console.log(`🤖 Llama Matching - Processing ${hotelSummaries.length} hotels`);
  
  // Create single hotel summary for all hotels - EMPHASIZE PRICE
  const hotelSummary = hotelSummaries.map((hotel, index) => {
    // Extract numeric price for sorting emphasis
    const priceMatch = hotel.pricePerNight.match(/(\d+)/);
    const numericPrice = priceMatch ? parseInt(priceMatch[1]) : 999999;
    
    return `${index + 1}: ${hotel.name}|💰${numericPrice}/night|${hotel.starRating}⭐|${hotel.topAmenities.join(',')}`;
  }).join('\n');
  
  // Create single prompt for all hotels - PRICE AS TOP PRIORITY
  const prompt = hasSpecificPreferences ? 
    `USER REQUEST: "${parsedQuery.aiSearch}"
STAY: ${nights} nights${priceContext}

🎯 RANKING PRIORITY ORDER:
1. PRICE (Most Important) - Select cheapest options first
2. User preferences alignment
3. Star rating and amenities

HOTELS:
${hotelSummary}

TASK: Match hotels to user request with PRICE AS THE #1 PRIORITY.
${budgetGuidance}Return JSON array with EXACTLY 5 hotels (no more, no less):
[{"hotelName":"exact name","aiMatchPercent":65-95}]

REMEMBER: Price beats everything else! Choose the cheapest hotels that meet the user's request. Use exact hotel names from list.` :

    `DESTINATION: ${parsedQuery.cityName}, ${parsedQuery.countryCode}
STAY: ${nights} nights${priceContext}

🎯 RANKING PRIORITY ORDER:
1. PRICE (Most Important) - Select cheapest options first
2. Location quality
3. Star rating and amenities

HOTELS:
${hotelSummary}

TASK: Rank hotels with PRICE AS THE #1 PRIORITY.
${budgetGuidance}Return JSON array with EXACTLY 5 hotels (no more, no less):
[{"hotelName":"exact name","aiMatchPercent":70-95}]

REMEMBER: Price beats everything else! Choose the cheapest hotels first. Use exact names from list.`;
  
  // Single Llama API call
  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: 'You are a price-focused hotel expert. PRICE IS THE #1 PRIORITY - always select the cheapest hotels first. Reply ONLY with valid JSON array of 5 items with exact hotel names and match percentages.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 600,
  });
  
  // Parse response
  const parseMatchingResponse = (response: any): Array<{ hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }> => {
    try {
      const aiResponse = response.choices[0]?.message?.content || '[]';
      const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      const matches: Array<{ hotelName: string; aiMatchPercent: number }> = JSON.parse(cleanResponse);
      
      console.log(`🎯 Llama matched ${matches.length} hotels`);
      
      // Map hotel names back to full hotel data
      return matches.slice(0, 5).map(match => {
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
      
    } catch (parseError) {
      console.warn(`⚠️ Failed to parse Llama response:`, parseError);
      return [];
    }
  };
  
  const matches = parseMatchingResponse(response);
  console.log(`Llama found ${matches.length} total matches`);
  
  // Sort by AI match percentage (already should be sorted, but ensure it)
  const rankedMatches = matches.sort((a, b) => b.aiMatchPercent - a.aiMatchPercent);
  
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

const applyHardPriceFilter = (
  hotelSummaries: HotelSummaryForAI[], 
  parsedQuery: ParsedSearchQuery
): HotelSummaryForAI[] => {
  
  // If no price filter, return all hotels
  if (!parsedQuery.minCost && !parsedQuery.maxCost) {
    console.log('💰 No price filter applied - using all hotels');
    return hotelSummaries;
  }

  console.log(`💰 Applying hard price filter: $${parsedQuery.minCost || 'no min'} - $${parsedQuery.maxCost || 'no max'}/night`);

  const withinBudget: HotelSummaryForAI[] = [];
  const outsideBudget: Array<{ hotel: HotelSummaryForAI, price: number, distance: number }> = [];

  hotelSummaries.forEach(hotel => {
    // Extract price from "324/night (providerDirect)" format
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
  const minHotelsForAI = 20;
  
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

    // STEP 4: Fetch detailed hotel data AND build AI summaries
    logger.startStep('4-FetchDetailsAndBuildSummaries', { hotelCount: hotelsWithRates.length });

    // Build basic metadata map from search results (for fallback data)
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
        // Fetch detailed data for each hotel in parallel
        const detailPromises = hotelsWithRates.map(async (rateHotel: any, index: number) => {
          try {
            if (!rateHotel || typeof rateHotel !== 'object') {
              console.warn(`⚠️  Invalid hotel data at index ${index}:`, rateHotel);
              return null;
            }

            const hotelId = rateHotel.hotelId || rateHotel.id || rateHotel.hotel_id;
            if (!hotelId) {
              console.warn(`⚠️  Missing hotel ID at index ${index}`);
              return null;
            }

            // Fetch detailed hotel data (THIS IS THE KEY FIX)
            const detailedData = await fetchHotelDetails(hotelId);
            
            // Combine basic metadata + detailed data
            const basicMetadata = hotelMetadataMap.get(String(hotelId)) || {};
            const combinedHotelInfo = {
              ...basicMetadata,
              ...detailedData // This will include hotelImages array!
            };

            const basicHotel: HotelWithRates = {
              ...rateHotel,
              hotelId: hotelId,
              hotelInfo: combinedHotelInfo // Now includes hotelImages!
            };
            
            const summary = createOptimizedHotelSummaryForAI(basicHotel, index, nights);
            return summary;
          } catch (innerError) {
            console.warn(`⚠️  Error processing hotel at index ${index}:`, innerError);
            return null;
          }
        });

        // Wait for all detail fetches to complete
        const detailResults = await Promise.allSettled(detailPromises);
        
        // Collect successful results
        detailResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            hotelSummariesForAI.push(result.value);
          } else {
            console.warn(`⚠️ Failed to get details for hotel at index ${index}`);
          }
        });
        
        console.log(`✅ Successfully built ${hotelSummariesForAI.length} hotel summaries with detailed data`);
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

    logger.endStep('4-FetchDetailsAndBuildSummaries', { 
      summariesBuilt: hotelSummariesForAI.length,
      detailsFetched: hotelSummariesForAI.length
    });

    // STEP 5: Apply hard price filter BEFORE AI matching
    logger.startStep('5-PriceFilter', { 
      originalCount: hotelSummariesForAI.length,
      minCost: parsedQuery.minCost,
      maxCost: parsedQuery.maxCost
    });

    const priceFilteredHotels = applyHardPriceFilter(hotelSummariesForAI, parsedQuery);

    logger.endStep('5-PriceFilter', { 
      filteredCount: priceFilteredHotels.length,
      removedCount: hotelSummariesForAI.length - priceFilteredHotels.length
    });

    // STEP 6: Llama AI Matching
    logger.startStep('6-LlamaMatching', { hotelCount: priceFilteredHotels.length });
    
    const llamaMatches = await llamaHotelMatching(priceFilteredHotels, parsedQuery, nights);
    
    logger.endStep('6-LlamaMatching', { matches: llamaMatches.length });

    if (llamaMatches.length === 0) {
      throw new Error('Llama failed to find any hotel matches');
    }

    // STEP 7: Build enriched hotel data for matched hotels
    logger.startStep('7-BuildEnrichedData', { selectedHotels: llamaMatches.length });

    const enrichedHotels = llamaMatches.map(match => {
      const matchingHotel = hotelsWithRates.find((hotel: any) => {
        // Find hotel by ID since names might not match exactly
        const hotelId = hotel.hotelId || hotel.id || hotel.hotel_id;
        return hotelId === match.hotelData.hotelId;
      });

      if (!matchingHotel) {
        console.warn(`Warning: Could not find hotel "${match.hotelName}" in original data`);
        return null;
      }

      // Get the detailed data we already fetched
      const detailedData = hotelSummariesForAI.find(summary => summary.hotelId === matchingHotel.hotelId);
      
      if (!detailedData) {
        console.warn(`Warning: Could not find detailed data for hotel "${match.hotelName}"`);
        return null;
      }

      // Re-fetch detailed hotel data for the final enriched response
      const hotelId = matchingHotel.hotelId || matchingHotel.id || matchingHotel.hotel_id;
      const basicMetadata = hotelMetadataMap.get(String(hotelId)) || {};
      
      // For the enriched response, we need to get fresh detailed data again
      // This is because createHotelSummaryForInsights needs the full detailed data structure
      return fetchHotelDetails(hotelId).then(freshDetailedData => {
        const fullHotelInfo = {
          ...basicMetadata,
          ...freshDetailedData
        };

        const enrichedHotelSummary = createHotelSummaryForInsights({
          ...matchingHotel,
          hotelInfo: fullHotelInfo
        }, fullHotelInfo, nights);
        
        return {
          ...enrichedHotelSummary,
          aiMatchPercent: match.aiMatchPercent,
          // Add summarized info for AI insights endpoint
          summarizedInfo: {
            name: enrichedHotelSummary.name,
            description: fullHotelInfo?.description ? 
              fullHotelInfo.description.toString().substring(0, 200) + '...' : 
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
      });
    }).filter(Boolean);

    // Wait for all enriched hotel data to be processed
    const enrichedResults = await Promise.allSettled(enrichedHotels);
    const finalEnrichedHotels = enrichedResults
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(Boolean);

    logger.endStep('7-BuildEnrichedData', { enrichedHotels: finalEnrichedHotels.length });

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
      matchedHotelsCount: finalEnrichedHotels.length,
      hotels: finalEnrichedHotels,
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