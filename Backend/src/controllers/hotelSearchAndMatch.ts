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
import { searchCostTracker, extractTokens } from '../utils/searchCostTracker';
import { FACILITIES_ID_TO_NAME } from '../utils/facilities-dict';

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
  timeout: 30000,
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

const getTop3Amenities = (hotelInfo: any): string[] => {
  return getCombinedAmenities(hotelInfo);
};

const processHotelWithImmediateInsights = async (
  hotel: any,
  hotelIndex: number,
  userInput: string,
  parsedQuery: ParsedSearchQuery,
  nights: number,
  hotelMetadataMap: Map<string, Record<string, unknown>>,
  sendUpdate: (type: string, data: any) => void,
  searchId?: string
): Promise<void> => {
  try {
    if (!hotel) {
    console.error(`❌ Hotel object is undefined for index ${hotelIndex}`);
    return;
  }
  
  if (!hotel.name) {
    console.error(`❌ Hotel missing name:`, hotel);
    return;
  }
    console.log(`🔥 Processing hotel ${hotelIndex} with immediate AI insights: ${hotel.name}`);
    
    const hotelId = hotel.hotelId || hotel.id || hotel.hotel_id;
    const hotelMetadata = hotelMetadataMap.get(String(hotelId));
    
    if (!hotelMetadata) {
      console.warn(`⚠️ No metadata for hotel ${hotel.name}, skipping insights`);
      return;
    }

    const enrichedHotelSummary = createHotelSummaryForInsights(hotel, hotelMetadata, nights);
    
    // CRITICAL FIX: Send hotel_found IMMEDIATELY with basic data
    const basicHotelData = {
      ...enrichedHotelSummary,
      aiMatchPercent: hotel.aiMatchPercent,
      whyItMatches: "Analyzing perfect match reasons...",
      funFacts: ["Generating interesting facts..."],
      nearbyAttractions: ["Finding nearby attractions..."],
      locationHighlight: "Analyzing location advantages...",
      guestInsights: "Processing guest insights...",
      safetyRating: 0,
      safetyJustification: "Analyzing safety information...",
      topAmenities: []
    };

    // Send basic hotel data FIRST
    sendUpdate('hotel_found', {
      hotelIndex: hotelIndex,
      totalExpected: 15,
      hotel: basicHotelData,
      message: `Found: ${enrichedHotelSummary.name} (${hotel.aiMatchPercent}% match) - Enhancing with AI...`
    });

    // CRITICAL FIX: Add delay to ensure client receives hotel_found first
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now generate AI insights
    const singleHotelForInsights = {
      hotelId: enrichedHotelSummary.hotelId,
      name: enrichedHotelSummary.name,
      aiMatchPercent: hotel.aiMatchPercent,
      summarizedInfo: {
        name: enrichedHotelSummary.name,
        description: (hotelMetadata?.hotelDescription || hotelMetadata?.description || 'Quality accommodation').toString().substring(0, 1000),
        amenities: enrichedHotelSummary.topAmenities,
        amenitiesText: enrichedHotelSummary.topAmenities && enrichedHotelSummary.topAmenities.length > 0 
          ? enrichedHotelSummary.topAmenities.join(', ') 
          : 'Standard hotel amenities',
        starRating: enrichedHotelSummary.starRating,
        reviewCount: enrichedHotelSummary.reviewCount,
        pricePerNight: enrichedHotelSummary.pricePerNight?.display || 'Price not available',
        location: enrichedHotelSummary.address,
        city: enrichedHotelSummary.city,
        country: enrichedHotelSummary.country,
        latitude: enrichedHotelSummary.latitude,
        longitude: enrichedHotelSummary.longitude,
        isRefundable: enrichedHotelSummary.isRefundable,
        refundableInfo: enrichedHotelSummary.refundableInfo
      }
    };

    try {
      const insightsResponse = await axios.post(`${process.env.BASE_URL || 'http://localhost:3003'}/api/hotels/ai-insights`, {
        hotels: [singleHotelForInsights],
        userQuery: userInput,
        nights: nights,
        searchId: searchId
      }, {
        timeout: 20000
      });

      if (insightsResponse.data?.recommendations?.[0]) {
        const aiRecommendation = insightsResponse.data.recommendations[0];
        const enhancedHotelData = {
          ...basicHotelData,
          whyItMatches: aiRecommendation.whyItMatches || "Great choice with excellent amenities",
          funFacts: aiRecommendation.funFacts || ["Modern facilities", "Excellent service"],
          nearbyAttractions: aiRecommendation.nearbyAttractions || [`${enrichedHotelSummary.city} center`, "Local landmarks"],
          locationHighlight: aiRecommendation.locationHighlight || "Prime location",
          guestInsights: aiRecommendation.guestInsights || "Guests appreciate the quality and service",
          firstRoomImage: aiRecommendation.firstRoomImage || null,
          secondRoomImage: aiRecommendation.secondRoomImage || null,
          allHotelInfo: aiRecommendation.allHotelInfo || 'Detailed information not available',
          safetyRating: aiRecommendation.safetyRating || 7,
          safetyJustification: aiRecommendation.safetyJustification || "Generally safe area with standard precautions recommended",
          topAmenities: aiRecommendation.topAmenities || enrichedHotelSummary.topAmenities || ["Wi-Fi", "AC", "Service"]
        };

        // Send enhanced hotel data with small delay to ensure proper order
        await new Promise(resolve => setTimeout(resolve, 200));
        
        sendUpdate('hotel_enhanced', {
          hotelIndex: hotelIndex,
          hotelId: enrichedHotelSummary.hotelId,
          hotel: enhancedHotelData,
          message: `✨ ${enrichedHotelSummary.name} enhanced with AI insights!`
        });

        console.log(`✅ AI insights completed for ${enrichedHotelSummary.name} - Safety: ${enhancedHotelData.safetyRating}/10`);
      } else {
        // Send fallback data
        const fallbackData = {
          ...basicHotelData,
          whyItMatches: "Excellent choice with great amenities and location",
          funFacts: ["Quality accommodations", "Convenient location"],
          topAmenities: enrichedHotelSummary.topAmenities || ["Wi-Fi", "AC", "Service"]
        };

        sendUpdate('hotel_enhanced', {
          hotelIndex: hotelIndex,
          hotelId: enrichedHotelSummary.hotelId,
          hotel: fallbackData,
          message: `${enrichedHotelSummary.name} ready with standard insights`
        });
      }
      
    } catch (insightsError) {
      console.error(`❌ AI insights failed for ${enrichedHotelSummary.name}:`, insightsError);
      // Send error fallback but still ensure the hotel appears
      const errorFallbackData = {
        ...basicHotelData,
        whyItMatches: "Quality choice with excellent facilities",
        topAmenities: enrichedHotelSummary.topAmenities || ["Wi-Fi", "AC", "Service"]
      };

      sendUpdate('hotel_enhanced', {
        hotelIndex: hotelIndex,
        hotelId: enrichedHotelSummary.hotelId,
        hotel: errorFallbackData,
        message: `${enrichedHotelSummary.name} ready (insights unavailable)`
      });
    }

  } catch (error) {
    console.error(`❌ Error processing hotel ${hotelIndex}:`, error);
    sendUpdate('error', {
      message: `Failed to process hotel ${hotelIndex}`,
      hotelIndex: hotelIndex
    });
  }
};

const gptHotelMatchingSSE = async (
  hotelSummaries: HotelSummaryForAI[], 
  parsedQuery: ParsedSearchQuery, 
  nights: number,
  sendUpdate: (type: string, data: any) => void,
  hotelMetadataMap: Map<string, Record<string, unknown>>,
  hotelsWithRates: any[],
  userInput: string,
  searchId: string 
): Promise<Array<{ hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }>> => {
  
  
const hasSpecificPreferences = parsedQuery.aiSearch && 
  typeof parsedQuery.aiSearch === 'string' && 
  parsedQuery.aiSearch.trim() !== '';
  
  
  // Build the hotel summary for GPT with better formatting
  const hotelSummary = hotelSummaries.map((hotel, index) => {
    const priceMatch = hotel.pricePerNight.match(/(\d+)/);
    const numericPrice = priceMatch ? parseInt(priceMatch[1]) : 999999;
    const amenitiesText = hotel.topAmenities && hotel.topAmenities.length > 0
  ? hotel.topAmenities.join(', ')
  : '';
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
    return `${index + 1}: ${hotel.name} | $${numericPrice}/night | ${hotel.starRating}⭐ | ${locationInfo} | ${shortDescription}| ${amenitiesText} `;
  }).join('\n');
  
  // FIXED: Better budget handling in prompts
  let budgetGuidance = '';
  let budgetContext = '';
  
  if (parsedQuery.minCost || parsedQuery.maxCost) {
    const minText = parsedQuery.minCost ? `$${parsedQuery.minCost}` : '';
    const maxText = parsedQuery.maxCost ? `$${parsedQuery.maxCost}` : '';
    
    if (minText && maxText) {
      budgetContext = `\n💰 PREFERRED BUDGET: ${minText} - ${maxText}/night`;
      budgetGuidance = `The user prefers hotels between ${minText}-${maxText}/night, but you can select slightly outside this range if the hotels offer exceptional value or match preferences well. `;
    } else if (minText) {
      budgetContext = `\n💰 PREFERRED MINIMUM: ${minText}+ per night`;
      budgetGuidance = `The user prefers hotels ${minText}+ per night, but you can select slightly below if they offer great value. `;
    } else if (maxText) {
      budgetContext = `\n💰 PREFERRED MAXIMUM: Under ${maxText} per night`;
      budgetGuidance = `The user prefers hotels under ${maxText} per night, but you can select slightly above if they offer exceptional value. `;
    }
  }

  console.log(`🤖 GPT-4o Mini Real-time Stream - Processing ${hotelSummaries.length} hotels`);
  
  // FIXED: More flexible prompts that don't create impossible constraints
  const prompt = hasSpecificPreferences ? 
    `USER REQUEST: "${parsedQuery.aiSearch}"
STAY: ${nights} nights${budgetContext}

🎯 RANKING PRIORITY ORDER:
1. USER PREFERENCES MATCH (Most Important)
2. Location convenience
3. Star rating and quality
4. Value for money

HOTELS AVAILABLE:
${hotelSummary}

CRITICAL INSTRUCTIONS:
- You MUST select exactly 15 hotels from the list above using their exact names
- Number them 1-15 in order of best match to worst match
- ${budgetGuidance}
- Even if no hotels perfectly match, select the 15 BEST AVAILABLE options
- Use the exact hotel names from the numbered list above

Format (exact numbering required):
1. [exact hotel name from list] | [match percentage]%
2. [exact hotel name from list] | [match percentage]%
3. [exact hotel name from list] | [match percentage]%
...continue through...
15. [exact hotel name from list] | [match percentage]%

REMEMBER: Always select 15 hotels using exact names from the list above.` :

    `DESTINATION: ${parsedQuery.cityName}, ${parsedQuery.countryCode}
STAY: ${nights} nights${budgetContext}

🎯 RANKING PRIORITY ORDER:
1. OVERALL QUALITY AND VALUE (Most Important)
2. Location quality
3. Star rating and amenities
4. Price value proposition

HOTELS AVAILABLE:
${hotelSummary}

CRITICAL INSTRUCTIONS:
- You MUST select exactly 15 hotels from the list above using their exact names
- Number them 1-15 in order of best quality to lowest quality
- ${budgetGuidance}
- Select the 15 BEST QUALITY hotels available from the list
- Use the exact hotel names from the numbered list above

Format (exact numbering required):
1. [exact hotel name from list] | [match percentage]%
2. [exact hotel name from list] | [match percentage]%
3. [exact hotel name from list] | [match percentage]%
...continue through...
15. [exact hotel name from list] | [match percentage]%

REMEMBER: Always select 15 hotels using exact names from the list above.`;

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert hotel ranker. You MUST return exactly 15 hotels using the exact names from the provided list. Never respond with messages like "No hotels available" - always select the best available options from the list provided.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 1200,
    stream: true,
    stream_options: { include_usage: true } // This enables usage tracking
  });

  let buffer = '';
  const rankedHotels = new Map<number, { hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }>();
  let hotelsStreamed = 0;
  const insightPromises: Promise<void>[] = [];
  
  // Track tokens as we stream
  let totalTokens = { prompt: 0, completion: 0 };
  
  try {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      buffer += content;
      
      // CAPTURE TOKEN USAGE - this comes at the end of the stream
      if (chunk.usage) {
        totalTokens.prompt = chunk.usage.prompt_tokens || 0;
        totalTokens.completion = chunk.usage.completion_tokens || 0;
        console.log(`📊 Stream usage captured: ${totalTokens.prompt} + ${totalTokens.completion} = ${totalTokens.prompt + totalTokens.completion} tokens`);
      }
      
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
          
          const matchingHotel = hotelsWithRates.find((hotel: any) => {
            const hotelId = hotel.hotelId || hotel.id || hotel.hotel_id;
            return hotelId === parsed.hotelData.hotelId;
          });

          if (matchingHotel) {
            const hotelId = matchingHotel.hotelId || matchingHotel.id || matchingHotel.hotel_id;
  const hotelMetadata = hotelMetadataMap.get(String(hotelId));
  
  const enrichedHotel = {
    ...matchingHotel,
    name: hotelMetadata?.name || `Hotel ${hotelId}`, // ADD NAME
    aiMatchPercent: parsed.aiMatchPercent
  };
            const insightPromise = processHotelWithImmediateInsights(
              
    { ...matchingHotel, aiMatchPercent: parsed.aiMatchPercent },
    
    parsed.rank,
    userInput,
    parsedQuery,
    nights,
    hotelMetadataMap,
    sendUpdate,
    searchId  // ADD THIS
  ).catch(error => {
    console.error(`❌ Insight processing failed for ${parsed.hotelName}:`, error);
    sendUpdate('hotel_enhanced', {
      hotelIndex: parsed.rank,
      hotelId: parsed.hotelData.hotelId,
      hotel: {
        name: parsed.hotelName,
        aiMatchPercent: parsed.aiMatchPercent,
        whyItMatches: "Great choice with excellent amenities",
        funFacts: ["Quality accommodations", "Convenient location"],
        nearbyAttractions: ["City center", "Local attractions"],
        locationHighlight: "Well-located property",
        guestInsights: "Consistently rated well by guests",
        firstRoomImage: null,
        secondRoomImage: null,
        safetyRating: 7, // Default safety rating
        safetyJustification: "Safety assessment unavailable"
      },
      message: `${parsed.hotelName} ready (insights unavailable)`
    });
  });
            
            insightPromises.push(insightPromise);
            hotelsStreamed++;
          }
        }
      }
    }
    
    // IMPORTANT: Track tokens AFTER stream is fully consumed
    if (totalTokens.prompt > 0 || totalTokens.completion > 0) {
      searchCostTracker.addGptUsage(searchId, 'hotelMatching', totalTokens.prompt, totalTokens.completion);
      console.log(`💰 Tracked streaming tokens for hotel matching: ${totalTokens.prompt + totalTokens.completion} tokens`);
    } else {
      // Fallback: estimate tokens if usage not provided
      const estimatedTokens = Math.ceil(prompt.length / 4); // Rough estimate: 4 chars per token
      console.warn(`⚠️ No token usage from stream, estimating ${estimatedTokens} tokens`);
      searchCostTracker.addGptUsage(searchId, 'hotelMatching', estimatedTokens, 600); // Estimate completion tokens
    }
    
    // Process remaining buffer content
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
            
            const matchingHotel = hotelsWithRates.find((hotel: any) => {
              const hotelId = hotel.hotelId || hotel.id || hotel.hotel_id;
              return hotelId === parsed.hotelData.hotelId;
            });

            if (matchingHotel) {
              
              const insightPromise = processHotelWithImmediateInsights(
                { ...matchingHotel, aiMatchPercent: parsed.aiMatchPercent },
                parsed.rank,
                userInput,
                parsedQuery,
                nights,
                hotelMetadataMap,
                sendUpdate
              ).catch(error => {
                console.error(`❌ Insight processing failed for ${parsed.hotelName}:`, error);
                sendUpdate('hotel_enhanced', {
                  hotelIndex: parsed.rank,
                  hotelId: parsed.hotelData.hotelId,
                  hotel: {
                    name: parsed.hotelName,
                    aiMatchPercent: parsed.aiMatchPercent,
                    whyItMatches: "Great choice with excellent amenities",
                    funFacts: ["Quality accommodations", "Convenient location"],
                    nearbyAttractions: ["City center", "Local attractions"],
                    locationHighlight: "Well-located property",
                    guestInsights: "Consistently rated well by guests"
                  },
                  message: `${parsed.hotelName} ready (insights unavailable)`
                });
              });
              
              insightPromises.push(insightPromise);
              hotelsStreamed++;
            }
          }
        }
      }
    }
    searchCostTracker.addGptUsage(searchId, 'hotelMatching', totalTokens.prompt, totalTokens.completion);

    
    
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
            
            const matchingHotel = hotelsWithRates.find((hotel: any) => {
              const hotelId = hotel.hotelId || hotel.id || hotel.hotel_id;
              return hotelId === parsed.hotelData.hotelId;
            });

            if (matchingHotel) {
              const insightPromise = processHotelWithImmediateInsights(
                { ...matchingHotel, aiMatchPercent: parsed.aiMatchPercent },
                parsed.rank,
                userInput,
                parsedQuery,
                nights,
                hotelMetadataMap,
                sendUpdate
              ).catch(error => {
                console.error(`❌ Insight processing failed for ${parsed.hotelName}:`, error);
                sendUpdate('hotel_enhanced', {
                  hotelIndex: parsed.rank,
                  hotelId: parsed.hotelData.hotelId,
                  hotel: {
                    name: parsed.hotelName,
                    aiMatchPercent: parsed.aiMatchPercent,
                    whyItMatches: "Great choice with excellent amenities",
                    funFacts: ["Quality accommodations", "Convenient location"],
                    nearbyAttractions: ["City center", "Local attractions"],
                    locationHighlight: "Well-located property",
                    guestInsights: "Consistently rated well by guests"
                  },
                  message: `${parsed.hotelName} ready (insights unavailable)`
                });
              });
              
              insightPromises.push(insightPromise);
              hotelsStreamed++;
            }
          }
        }
      }
    }
    
    // FALLBACK: If GPT failed to parse correctly, use top hotels by rating
    if (rankedHotels.size < 10) {
      console.warn(`⚠️ GPT only returned ${rankedHotels.size} hotels, adding fallbacks...`);
      
      const usedHotelIds = new Set(Array.from(rankedHotels.values()).map(h => h.hotelData.hotelId));
      const unusedHotels = hotelSummaries.filter(h => !usedHotelIds.has(h.hotelId));
      
      // Sort by star rating and add missing hotels
      const fallbackHotels = unusedHotels
        .sort((a, b) => b.starRating - a.starRating)
        .slice(0, 15 - rankedHotels.size);
      
      for (let i = 0; i < fallbackHotels.length; i++) {
        const nextRank = rankedHotels.size + i + 1;
        if (nextRank <= 15) {
          const hotel = fallbackHotels[i];
          rankedHotels.set(nextRank, {
            hotelName: hotel.name,
            aiMatchPercent: hasSpecificPreferences ? 25 + (i * 3) : 50 + (i * 3),
            hotelData: hotel
          });
          
          console.log(`🔄 Added fallback hotel #${nextRank}: ${hotel.name}`);
          
          // Process fallback hotel too
          const matchingHotel = hotelsWithRates.find((h: any) => {
            const hotelId = h.hotelId || h.id || h.hotel_id;
            return hotelId === hotel.hotelId;
          });

          if (matchingHotel) {
            const insightPromise = processHotelWithImmediateInsights(
    { ...matchingHotel, aiMatchPercent: hasSpecificPreferences ? 25 + (i * 3) : 50 + (i * 3) },
    nextRank,
    userInput,
    parsedQuery,
    nights,
    hotelMetadataMap,
    sendUpdate,
    searchId  // ADD THIS
  ).catch(error => {
    console.error(`❌ Fallback insight processing failed for ${hotel.name}:`, error);
  });
            
            insightPromises.push(insightPromise);
          }
        }
      }
    }
    
    // Wait for all insight processing to complete
    console.log(`⏳ Waiting for ${insightPromises.length} AI insight processes to complete...`);
    await Promise.allSettled(insightPromises);
    console.log(`✅ All AI insight processes completed`);
    
  } catch (streamError) {
    console.error('❌ SSE Streaming error:', streamError);
    
    // Even if streaming fails, try to track some estimated cost
    const estimatedTokens = Math.ceil(prompt.length / 4);
    searchCostTracker.addGptUsage(searchId, 'hotelMatching', estimatedTokens, 300);
    
    sendUpdate('error', { 
      message: 'AI matching encountered an error',
      details: streamError instanceof Error ? streamError.message : 'Unknown streaming error'
    });
    throw streamError;
  }

  // Return hotels in GPT's intended ranking order
  const orderedMatches: Array<{ hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }> = [];
  
  for (let rank = 1; rank <= 15; rank++) {
    if (rankedHotels.has(rank)) {
      orderedMatches.push(rankedHotels.get(rank)!);
    }
  }
  
  // Final safety check - if still no matches, return top hotels
  if (orderedMatches.length === 0) {
    console.error('🚨 CRITICAL: No hotels matched at all, using emergency fallback');
    const emergencyMatches = hotelSummaries
      .sort((a, b) => b.starRating - a.starRating)
      .slice(0, 15)
      .map((hotel, index) => ({
        hotelName: hotel.name,
        aiMatchPercent: hasSpecificPreferences ? 20 + (index * 2) : 45 + (index * 2),
        hotelData: hotel
      }));
    
    return emergencyMatches;
  }
  
  return orderedMatches.slice(0, 15);
};


function topRatedCap(hotels: HotelSummaryForAI[], limit = 250): HotelSummaryForAI[] {
  return hotels
    .slice()
    .sort((a, b) => {
      const sa = Number(a.starRating || 0);
      const sb = Number(b.starRating || 0);
      if (sb !== sa) return sb - sa;               // higher stars first

      const ra = Number(a.reviewCount || 0);
      const rb = Number(b.reviewCount || 0);
      if (rb !== ra) return rb - ra;               // tie-break by reviews

      const pa = parseInt(a.pricePerNight.match(/(\d+)/)?.[1] || '999999', 10);
      const pb = parseInt(b.pricePerNight.match(/(\d+)/)?.[1] || '999999', 10);
      return pa - pb;                              // last tie-break: cheaper first
    })
    .slice(0, limit);
}

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
  nights: number,
  searchId: string 
): Promise<Array<{ hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }>> => {
  
  const hasSpecificPreferences = parsedQuery.aiSearch && 
  typeof parsedQuery.aiSearch === 'string' && 
  parsedQuery.aiSearch.trim() !== '';
  
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
  const tokens = extractTokens(response);
  searchCostTracker.addGptUsage(searchId, 'hotelMatching', tokens.prompt, tokens.completion);
  
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

// NEW: Function to get combined amenities (facilities + amenities)
const getCombinedAmenities = (hotelInfo: any): string[] => {
  const allAmenities: string[] = [];
  
  // Get facilities from facilityIds and convert to names
  if (hotelInfo?.facilityIds && Array.isArray(hotelInfo.facilityIds)) {
    const facilities = hotelInfo.facilityIds
      .map((id: number) => FACILITIES_ID_TO_NAME[id])
      .filter(Boolean); // Remove undefined entries
    allAmenities.push(...facilities);
  }
  
  // Get existing amenities
  if (hotelInfo?.amenities && Array.isArray(hotelInfo.amenities)) {
    const amenities = hotelInfo.amenities
      .map((amenity: unknown) => {
        if (typeof amenity === 'string') return amenity;
        if (typeof amenity === 'object' && amenity !== null && 'name' in amenity) return (amenity as any).name;
        return null;
      })
      .filter(Boolean);
    allAmenities.push(...amenities);
  }
  
  // Add defaults only if nothing found
  if (allAmenities.length === 0) {
    allAmenities.push('Wi-Fi', 'Air Conditioning', 'Private Bathroom');
  }
  
  // Remove duplicates and return
  return [...new Set(allAmenities)];
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

  // Special case: if maxCost is $25 (cheapest filter), use 50 hotels minimum
  // Otherwise use 30 hotels minimum
  const minHotelsForAI = parsedQuery.maxCost === 25 ? 50 : 30;
  
  if (parsedQuery.maxCost === 25) {
    console.log('🏷️ Cheapest filter detected ($25 max) - using 50 hotels minimum for better selection');
  }
    
  // If we have enough hotels within budget, use only those (but at least minHotelsForAI)
  if (withinBudget.length >= minHotelsForAI) {
    console.log(`🎯 Found ${withinBudget.length} hotels within budget - using only these`);
    return withinBudget;
  }

  // If not enough within budget, add closest ones to reach minimum hotels
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

  // NEW: Detect if this is a GET request (SSE) or POST request (legacy)
  const isSSERequest = req.method === 'GET';
  const userInput = isSSERequest
    ? String(req.query.q ?? req.query.userInput ?? '')
    : req.body.userInput;

  if (!userInput?.trim()) {
    return res.status(400).json({ error: 'userInput is required' });
  }

  // NEW: SSE Setup for GET requests
  if (isSSERequest) {
    console.log('🌊 Setting up SSE connection for mobile streaming...');
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // Flush headers immediately
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    // Set up heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      if (!res.destroyed) {
        res.write(': heartbeat\n\n');
      }
    }, 15000);

    // Clean up on client disconnect
    req.on('close', () => {
      console.log('🔌 SSE client disconnected');
      clearInterval(heartbeat);
      if (!res.destroyed) {
        try { res.end(); } catch (e) { /* ignore */ }
      }
    });

    req.on('error', () => {
      console.log('❌ SSE connection error');
      clearInterval(heartbeat);
      if (!res.destroyed) {
        try { res.end(); } catch (e) { /* ignore */ }
      }
    });

    // Send initial connection confirmation
    res.write('data: {"type":"connected","message":"Real-time search connected"}\n\n');
  }

  // Helper function for sending updates
  const sendUpdate = (type: string, data: any) => {
    if (isSSERequest && !res.destroyed) {
      try {
        const message = JSON.stringify({ type, ...data });
        res.write(`data: ${message}\n\n`);
      } catch (error) {
        console.error('❌ Error sending SSE update:', error);
      }
    }
  };

  try {
    console.log(`🚀 ${isSSERequest ? 'SSE' : 'POST'} Hotel Search Starting:`, userInput);
    const searchId = randomUUID();

    // Always use streaming for SSE requests
    const enableStreaming = isSSERequest;

    // STEP 1: Parse user input
    sendUpdate('progress', { message: 'Understanding your request...', step: 1, totalSteps: 8 });
    
    logger.startStep('1-ParseQuery', { userInput });
    
    const parseResponse = await internalApiInstance.post('/api/query/parse', { userInput });
    const parsedQuery: ParsedSearchQuery = parseResponse.data;
    logger.endStep('1-ParseQuery', { parsedQuery });

    // Validate parsed data
    if (!parsedQuery.checkin || !parsedQuery.checkout || !parsedQuery.countryCode || !parsedQuery.cityName) {
      if (isSSERequest) {
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

    // STEP 2: Fetch hotels with ALL metadata
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
        limit: SMART_HOTEL_LIMIT,
        aiSearch: `the hotels shoud be under ${parsedQuery.maxCost}`

      },
      timeout: 30000
    });

    const hotels = hotelsSearchResponse.data?.data || hotelsSearchResponse.data;

    logger.endStep('2-FetchHotelsWithMetadata', { hotelCount: hotels?.length || 0 });

    if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
      if (isSSERequest) {
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

    // STEP 4: Fetch rates for all hotels
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
      timeout: 2,
      maxRatesPerHotel: 1,
      hotelIds: hotelIds,
      limit: 500
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
    searchCostTracker.startSearch(
    searchId, 
    userInput, 
    `${parsedQuery.cityName}, ${parsedQuery.countryCode}`,
    hotelsWithRates.length
  );


    logger.endStep('4-FetchRates', { hotelsWithRates: hotelsWithRates.length });

    if (hotelsWithRates.length === 0) {
      if (isSSERequest) {
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
      if (isSSERequest) {
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

    const cappedForLLM = topRatedCap(priceFilteredHotels, 250);

    logger.endStep('6-PriceFilter', { 
      filteredCount: priceFilteredHotels.length,
      removedCount: hotelSummariesForAI.length - priceFilteredHotels.length
    });

    // STEP 7: GPT AI Matching - Use streaming version for SSE requests
    sendUpdate('progress', { 
      message: '', 
      step: 7, 
      totalSteps: 8
    });

    logger.startStep('7-GPTMatching', { hotelCount: cappedForLLM.length });
    
    let gptMatches;
    if (isSSERequest) {
      // Use streaming GPT matching for SSE
      gptMatches = await gptHotelMatchingSSE(
        cappedForLLM, 
        parsedQuery, 
        nights,
        sendUpdate,
        hotelMetadataMap,
        hotelsWithRates,
        userInput,
        searchId
      );
    } else {
      // Use regular GPT matching for POST requests
      gptMatches = await gptHotelMatching(cappedForLLM, parsedQuery, nights, searchId);
    }
    
    logger.endStep('7-GPTMatching', { matches: gptMatches.length });

    if (gptMatches.length === 0) {
      if (isSSERequest) {
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
      // ADD THIS: Include full amenities text
      amenitiesText: enrichedHotelSummary.topAmenities && enrichedHotelSummary.topAmenities.length > 0 
        ? enrichedHotelSummary.topAmenities.join(', ') 
        : 'Standard hotel amenities',
      starRating: enrichedHotelSummary.starRating,
      reviewCount: enrichedHotelSummary.reviewCount,
      pricePerNight: enrichedHotelSummary.pricePerNight?.display || 'Price not available',
      location: enrichedHotelSummary.address,
      city: enrichedHotelSummary.city,
      country: enrichedHotelSummary.country,
      latitude: enrichedHotelSummary.latitude,
      longitude: enrichedHotelSummary.longitude,
      isRefundable: enrichedHotelSummary.isRefundable,
      refundableInfo: enrichedHotelSummary.refundableInfo
    }
  };
}).filter(Boolean);

    logger.endStep('8-BuildEnrichedData', { enrichedHotels: enrichedHotels.length });

    // Final response
    const totalSearchCost = searchCostTracker.finishSearch(searchId);
    const performanceReport = logger.getDetailedReport();
    console.log(`🚀 ${isSSERequest ? 'SSE' : 'POST'} Hotel Search Complete in ${performanceReport.totalTime}ms ✅`);

    if (isSSERequest) {
  // SSE completion
  sendUpdate('complete', {
    message: `Found ${enrichedHotels.length} perfect hotels for you!`,
    searchId: searchId,
    totalHotels: enrichedHotels.length,
    searchCost: totalSearchCost,
    searchParams: {
      ...parsedQuery,
      nights: nights,
      currency: 'USD'
    },
    performance: {
      totalTimeMs: performanceReport.totalTime,
      optimization: 'Real-time SSE streaming'
    }
  });
      
      // Close SSE connection
      if (!res.destroyed) {
        res.end();
      }
    } else {
      // Regular JSON response for POST requests
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
         searchCost: totalSearchCost,
        performance: {
          totalTimeMs: performanceReport.totalTime,
          stepBreakdown: performanceReport.steps,
          bottlenecks: performanceReport.bottlenecks,
          optimization: `Eliminated ${hotelSummariesForAI.length} redundant detail API calls`
        }
      });
    }

  } catch (error) {
    console.error('❌ Error in hotel search and match:', error);
    const errorReport = logger.getDetailedReport();
    
    if (isSSERequest) {
      sendUpdate('error', {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: error instanceof Error ? error.stack : undefined
      });
      if (!res.destroyed) {
        res.end();
      }
    } else {
      // Regular error handling for POST requests
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
  }
};