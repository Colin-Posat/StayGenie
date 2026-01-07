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
import { CohereClient } from 'cohere-ai';


// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Verify environment variables
console.log('🔑 Environment Variables Check:');
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('LITEAPI_KEY exists:', !!process.env.LITEAPI_KEY);

// Hotel type IDs for search
const HOTEL_TYPE_IDS = [203,204,205,206,208,209,212,214,216,218,219,221,224,225,226,227,231,233,234,247,251,254,258,264,274,210,268,271,273,277,276];

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
const SMART_HOTEL_LIMIT = parseInt(process.env.SMART_HOTEL_LIMIT || '100');
const TARGET_HOTEL_COUNT = 15;

// OpenAI instance
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY!
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

import fs from 'fs';

// Function to log hotel matching prompts specifically
const logHotelMatchingPrompt = (
  searchId: string,
  prompt: string,
  hotelCount: number,
  userQuery: string,
  destination: string
): void => {
  try {
    const logsDir = path.join(__dirname, '../../logs/hotel-matching');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `hotel_matching_${searchId.slice(0, 8)}_${timestamp}.txt`;
    const filepath = path.join(logsDir, filename);

    const logContent = `
=== HOTEL MATCHING PROMPT LOG ===
Search ID: ${searchId}
Timestamp: ${new Date().toISOString()}
User Query: ${userQuery}
Destination: ${destination}
Hotel Count: ${hotelCount}
Character Count: ${prompt.length}
Estimated Tokens: ~${Math.ceil(prompt.length / 4)}

=== PROMPT CONTENT ===
${prompt}

=== END LOG ===
`;

    fs.writeFileSync(filepath, logContent, 'utf8');
    
    console.log(`📝 Hotel matching prompt logged: ${filepath}`);
    console.log(`📊 Prompt stats: ${prompt.length} chars, ~${Math.ceil(prompt.length / 4)} tokens for ${hotelCount} hotels`);
    
  } catch (error) {
    console.error(`❌ Failed to log hotel matching prompt:`, error);
  }
};

const rerankHotelsWithCohere = async (
  query: string,
  hotels: HotelSummaryForAI[],
  topN: number = 150
): Promise<HotelSummaryForAI[]> => {
  if (!process.env.COHERE_API_KEY) {
    console.warn('⚠️ Cohere key missing — skipping rerank');
    return hotels.slice(0, topN);
  }

  if (hotels.length <= topN) {
    return hotels;
  }

  const documents = hotels.map(h => ({
    text: `
${h.name}
${h.city}, ${h.country}
${h.description}
Amenities: ${h.topAmenities?.join(', ')}
Price: ${h.pricePerNight}
Distance: ${h.distanceFromSearch?.formatted || 'unknown'}
    `.trim()
  }));

  try {
    const response = await cohere.rerank({
      model: 'rerank-english-v3.0',
      query,
      documents,
      topN
    });

    return response.results.map(r => hotels[r.index]);

  } catch (err) {
    console.error('❌ Cohere rerank failed, falling back to first N hotels:', err);
    return hotels.slice(0, topN);
  }
};


const filterRelevantAmenities = (amenitiesText: string): string => {
  if (!amenitiesText || typeof amenitiesText !== 'string') {
    return '';
  }

  const universalBasics = [
    'Non-smoking rooms',
    'A/C',
    'Safe',
    'Non-smoking',
    'Fire extinguishers',
    'First aid',
    'Smoke alarms',
    'Invoice provided',
    'Common TV',
    'Internet',
    'Housekeeping on request'
  ];

  const covidStandards = [
    'Safety protocols',
    'Disinfected rooms',
    'COVID cleaning',
    'Social distancing',
    'Hand sanitizer',
    'Clean tableware',
    'Contactless check',
    'Optional cleaning',
    'No shared items',
    'Sealed rooms',
    'Pro cleaning',
    'Dining distancing',
    'Health checks',
    'Face masks',
    'Safety barriers',
    'Covered food',
    'Healthcare access',
    'Thermometers',
    'Bulk toiletries'
  ];

  const universalSecurity = [
    '24hr security',
    'Security alarm',
    'Keycard access',
    'Cashless payment',
    'Key access'
  ];

  const basicOperations = [
    'Limited front desk',
    'Express checkin',
    'Express check-in/out',
    'Express checkout',
    'Luggage storage',
    'Elevator',
    'Elevator',
    'Fax/copy',
    'Free wired internet',
    'Free WiFi',
    '24hr front desk',
    'Multilingual staff',
    'Porter',
    'Smoke-free'
  ];

  const accessibilityFeatures = [
    'Disabled access',
    'Wheelchair access',
    'Lower sink',
    'Emergency cord',
    'Braille aids',
    'Braille signs',
    'Audio guidance',
    'Assist devices',
    'Meeting assist devices',
    'Visual alarms',
    'Step-free entrance',
    'Well-lit entrance',
    'Wheelchair washroom',
    'Wheelchair fitness'
  ];

  const environmentalStandards = [
    '80%+ LED lighting',
    'LED lights',
    'Water-efficient showers',
    'Thin carpet',
    'Eco toiletries',
    'Recycling',
    'Water dispenser'
  ];

  const amenitiesToRemove = [
    ...universalBasics,
    ...covidStandards,
    ...universalSecurity,
    ...basicOperations,
    ...accessibilityFeatures,
    ...environmentalStandards
  ];

  const amenitiesList = amenitiesText
    .split(/[•,\n]/)
    .map(amenity => amenity.trim())
    .filter(amenity => amenity.length > 0);

  const filteredAmenities = amenitiesList.filter(amenity => {
    return !amenitiesToRemove.some(unwanted => 
      amenity.toLowerCase().includes(unwanted.toLowerCase()) ||
      unwanted.toLowerCase().includes(amenity.toLowerCase())
    );
  });

  const uniqueAmenities = [...new Set(filteredAmenities)];
  return uniqueAmenities.join(', ');
};

const extractRefundablePolicy = (hotel: HotelWithRates): { isRefundable: boolean; refundableTag: string | null; refundableInfo: string } => {
  if (!hotel.roomTypes || hotel.roomTypes.length === 0) {
    return {
      isRefundable: false,
      refundableTag: null,
      refundableInfo: 'No rate information available'
    };
  }

  const refundableTags: string[] = [];
  let hasRefundableRates = false;
  let hasNonRefundableRates = false;

  hotel.roomTypes.forEach(roomType => {
    if (roomType.rates && roomType.rates.length > 0) {
      roomType.rates.forEach(rate => {
        const refundableTag = rate.cancellationPolicies?.refundableTag;
        if (refundableTag) {
          refundableTags.push(refundableTag);
          
          if (refundableTag === 'RFN' || refundableTag.toLowerCase().includes('refund')) {
            hasRefundableRates = true;
          } else if (refundableTag === 'NRF' || refundableTag.toLowerCase().includes('non')) {
            hasNonRefundableRates = true;
          }
        }
      });
    }
  });

  let isRefundable = false;
  let refundableInfo = '';

  if (hasRefundableRates && hasNonRefundableRates) {
    isRefundable = true;
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
    console.log(`🔥 Processing hotel ${hotelIndex} with immediate AI insights: ${hotel.name}`);
    
    const hotelId = hotel.hotelId || hotel.id || hotel.hotel_id;
    const hotelMetadata = hotelMetadataMap.get(String(hotelId));
    
    if (!hotelMetadata) {
      console.warn(`⚠️ No metadata for hotel ${hotel.name}, skipping insights`);
      return;
    }

    const enrichedHotelSummary = createHotelSummaryForInsights(hotel, hotelMetadata, nights);

    console.log('📦 ENRICHED HOTEL SUMMARY:', {
  hotelName: enrichedHotelSummary.name,
  hasDistance: !!enrichedHotelSummary.distanceFromSearch,
  distanceObject: enrichedHotelSummary.distanceFromSearch
});
    
    const basicHotelData = {
      ...enrichedHotelSummary,
      aiMatchPercent: hotel.aiMatchPercent,
      whyItMatches: "Loading AI insights...",
      funFacts: ["Generating interesting facts..."],
      nearbyAttractions: ["Finding nearby attractions..."],
      locationHighlight: "Analyzing location advantages...",
      guestInsights: "Processing guest insights...",
      safetyRating: 0,
      safetyJustification: "Analyzing safety information...",
      topAmenities: [],
      photoGalleryImages: []
    };

    sendUpdate('hotel_found', {
      hotelIndex: hotelIndex,
      totalExpected: 15,
      hotel: basicHotelData,
      message: `Found: ${enrichedHotelSummary.name} (${hotel.aiMatchPercent}% match) - Enhancing with AI...`
    });

    await new Promise(resolve => setTimeout(resolve, 100));

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
          topAmenities: aiRecommendation.topAmenities || enrichedHotelSummary.topAmenities || ["Wi-Fi", "AC", "Service"],
          photoGalleryImages: aiRecommendation.photoGalleryImages || [],
          categoryRatings: aiRecommendation.categoryRatings
        };

        await new Promise(resolve => setTimeout(resolve, 200));
        
        sendUpdate('hotel_enhanced', {
          hotelIndex: hotelIndex,
          hotelId: enrichedHotelSummary.hotelId,
          hotel: enhancedHotelData,
          message: `✨ ${enrichedHotelSummary.name} enhanced with AI insights!`
        });

        console.log(`✅ AI insights completed for ${enrichedHotelSummary.name} - Safety: ${enhancedHotelData.safetyRating}/10, Gallery: ${enhancedHotelData.photoGalleryImages.length} images`);
      } else {
        const fallbackData = {
          ...basicHotelData,
          whyItMatches: "Excellent choice with great amenities and location",
          funFacts: ["Quality accommodations", "Convenient location"],
          topAmenities: enrichedHotelSummary.topAmenities || ["Wi-Fi", "AC", "Service"],
          photoGalleryImages: []
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
      const errorFallbackData = {
        ...basicHotelData,
        whyItMatches: "Quality choice with excellent facilities",
        topAmenities: enrichedHotelSummary.topAmenities || ["Wi-Fi", "AC", "Service"],
        photoGalleryImages: []
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
  searchId: string,
  
): Promise<Array<{ hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }>> => {
  
  const aiSearchContext = parsedQuery.aiSearch || 'hotels';
  
const hotelSummary = hotelSummaries.map((hotel, index) => {
  const priceMatch = hotel.pricePerNight.match(/(\d+)/);
  const numericPrice = priceMatch ? parseInt(priceMatch[1]) : 999999;
  const amenitiesText = hotel.topAmenities && hotel.topAmenities.length > 0
    ? hotel.topAmenities.join(', ')
    : '';

  const shortDescription = optimizeHotelDescription(hotel.description, 1000);
  
    // BUILD LOCATION STRING WITH CITY AND COUNTRY
  const locationParts = [];
  if (hotel.city && hotel.city !== 'Unknown City') {
    locationParts.push(hotel.city);
  }
  if (hotel.country && hotel.country !== 'Unknown Country') {
    locationParts.push(hotel.country);
  }
  const locationInfo = locationParts.length > 0 ? locationParts.join(', ') : 'Location unknown';
  
  // ADD DISTANCE TO THE SUMMARY STRING
  const distanceInfo = hotel.distanceFromSearch 
    ? ` | ${hotel.distanceFromSearch.formatted} from ${parsedQuery.specificPlace}`
    : '';
  
  return `${index + 1}: ${hotel.name} (${locationInfo}) | $${numericPrice}/night${distanceInfo} | ${shortDescription} | ${amenitiesText}`;

}).join('\n');
  
  console.log(`🤖 GPT-4o Mini Real-time Stream - Processing ${hotelSummaries.length} hotels`);
  console.log(`🎯 AI Search Context: "${aiSearchContext}"`);
  
  const prompt = `USER REQUEST: "${userInput}"
STAY: ${nights} nights

🎯 RANKING PRIORITY ORDER:
1. MATCH USER REQUEST: "${userInput}" (Most Important)
2. Distance from ${parsedQuery.specificPlace} (if relevant to search!) MAKE SURE THE HOTEL IS IN THE CITY/PLACE THE USER WANTS
2. Location quality and convenience 
3. Star rating and overall quality
4. Value for money

📋 STEP-BY-STEP MATCHING PROCESS:
1. READ AI SEARCH CONTEXT carefully: "${userInput}"
3. Match specific amenities mentioned (rooftop bar, infinity pool, spa, gym, etc.)
4. Match vibe/style (romantic, family-friendly, business, boutique, modern, etc.)
5. RANK by relevance to the complete AI search context, NOT by list position

🔍 KEYWORD MATCHING EXAMPLES:
- Context: "hotels under $200 per night with rooftop bar" → Price < $200 AND rooftop bar
- Context: "luxury hotels over $400 per night" → Price > $400 AND luxury features
- Context: "romantic hotels with infinity pool" → Romantic amenities AND infinity pool
- Context: "cool boutique hotels" → Boutique style, unique character

⚠️ CRITICAL RULES:
- IGNORE the order hotels appear in the list - analyze content only
- You MUST select exactly 15 hotels using their exact names from the list
- Base rankings on how well each hotel matches "${userInput}"
- If specific amenities mentioned, hotels MUST have those amenities to rank high

📝 REQUIRED OUTPUT FORMAT:
1. [exact hotel name from list] | [match percentage 1-100]%
2. [exact hotel name from list] | [match percentage 1-100]%
3. [exact hotel name from list] | [match percentage 1-100]%
...continue through 15

HOTELS AVAILABLE:
${hotelSummary}

REMEMBER: Always select 15 hotels using exact names from the list above.`;

  logHotelMatchingPrompt(
    searchId,
    prompt,
    hotelSummaries.length,
    userInput,
    parsedQuery.fullPlaceName || 'Unknown location'
  );

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
    stream_options: { include_usage: true }
  });

  let buffer = '';
  const rankedHotels = new Map<number, { hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }>();
  let hotelsStreamed = 0;
  const insightPromises: Promise<void>[] = [];
  
  let totalTokens = { prompt: 0, completion: 0 };
  
  try {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      buffer += content;
      
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
            const insightPromise = processHotelWithImmediateInsights(
              { ...matchingHotel, aiMatchPercent: parsed.aiMatchPercent },
              parsed.rank,
              userInput,
              parsedQuery,
              nights,
              hotelMetadataMap,
              sendUpdate,
              searchId
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
                  safetyRating: 7,
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
    
    if (totalTokens.prompt > 0 || totalTokens.completion > 0) {
      searchCostTracker.addGptUsage(searchId, 'hotelMatching', totalTokens.prompt, totalTokens.completion);
      console.log(`💰 Tracked streaming tokens for hotel matching: ${totalTokens.prompt + totalTokens.completion} tokens`);
    } else {
      const estimatedTokens = Math.ceil(prompt.length / 4);
      console.warn(`⚠️ No token usage from stream, estimating ${estimatedTokens} tokens`);
      searchCostTracker.addGptUsage(searchId, 'hotelMatching', estimatedTokens, 600);
    }
    
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
                sendUpdate,
                searchId
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
    
    if (rankedHotels.size < 10) {
      console.warn(`⚠️ GPT only returned ${rankedHotels.size} hotels, adding fallbacks...`);
      
      const usedHotelIds = new Set(Array.from(rankedHotels.values()).map(h => h.hotelData.hotelId));
      const unusedHotels = hotelSummaries.filter(h => !usedHotelIds.has(h.hotelId));
      
      const fallbackHotels = unusedHotels
        .sort((a, b) => b.starRating - a.starRating)
        .slice(0, 15 - rankedHotels.size);
      
      for (let i = 0; i < fallbackHotels.length; i++) {
        const nextRank = rankedHotels.size + i + 1;
        if (nextRank <= 15) {
          const hotel = fallbackHotels[i];
          rankedHotels.set(nextRank, {
            hotelName: hotel.name,
            aiMatchPercent: 50 + (i * 3),
            hotelData: hotel
          });
          
          console.log(`🔄 Added fallback hotel #${nextRank}: ${hotel.name}`);
          
          const matchingHotel = hotelsWithRates.find((h: any) => {
            const hotelId = h.hotelId || h.id || h.hotel_id;
            return hotelId === hotel.hotelId;
          });

          if (matchingHotel) {
            const insightPromise = processHotelWithImmediateInsights(
              { ...matchingHotel, aiMatchPercent: 50 + (i * 3) },
              nextRank,
              userInput,
              parsedQuery,
              nights,
              hotelMetadataMap,
              sendUpdate,
              searchId
            ).catch(error => {
              console.error(`❌ Fallback insight processing failed for ${hotel.name}:`, error);
            });
            
            insightPromises.push(insightPromise);
          }
        }
      }
    }
    
    console.log(`⏳ Waiting for ${insightPromises.length} AI insight processes to complete...`);
    await Promise.allSettled(insightPromises);
    console.log(`✅ All AI insight processes completed`);
    
  } catch (streamError) {
    console.error('❌ SSE Streaming error:', streamError);
    
    const estimatedTokens = Math.ceil(prompt.length / 4);
    searchCostTracker.addGptUsage(searchId, 'hotelMatching', estimatedTokens, 300);
    
    sendUpdate('error', { 
      message: 'AI matching encountered an error',
      details: streamError instanceof Error ? streamError.message : 'Unknown streaming error'
    });
    throw streamError;
  }

  const orderedMatches: Array<{ hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }> = [];
  
  for (let rank = 1; rank <= 15; rank++) {
    if (rankedHotels.has(rank)) {
      orderedMatches.push(rankedHotels.get(rank)!);
    }
  }
  
  if (orderedMatches.length === 0) {
    console.error('🚨 CRITICAL: No hotels matched at all, using emergency fallback');
    const emergencyMatches = hotelSummaries
      .sort((a, b) => b.starRating - a.starRating)
      .slice(0, 15)
      .map((hotel, index) => ({
        hotelName: hotel.name,
        aiMatchPercent: 45 + (index * 2),
        hotelData: hotel
      }));
    
    return emergencyMatches;
  }
  
  return orderedMatches.slice(0, 15);
};

const filterHotelsByPriceWithFallback = (
  hotels: HotelSummaryForAI[],
  minPrice: number | null | undefined,
  maxPrice: number | null | undefined,
  minPoolSize: number = 100
): HotelSummaryForAI[] => {

  if (
    (minPrice == null || Number.isNaN(minPrice)) &&
    (maxPrice == null || Number.isNaN(maxPrice))
  ) {
    return hotels;
  }

  const extractPrice = (h: HotelSummaryForAI): number | null => {
    const match = h.pricePerNight?.match?.(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const hotelsWithPrice: { hotel: HotelSummaryForAI; price: number }[] = [];
  const hotelsWithoutPrice: HotelSummaryForAI[] = [];

  for (const hotel of hotels) {
    const price = extractPrice(hotel);
    if (price !== null) {
      hotelsWithPrice.push({ hotel, price });
    } else {
      hotelsWithoutPrice.push(hotel);
    }
  }

  // ✅ Apply BOTH min and max constraints
  const inRange = hotelsWithPrice
    .filter(h => {
      if (minPrice != null && h.price < minPrice) return false;
      if (maxPrice != null && h.price > maxPrice) return false;
      return true;
    })
    .sort((a, b) => a.price - b.price)
    .map(h => h.hotel);

  if (inRange.length >= minPoolSize) {
    console.log(
      `💰 Price filter: ${inRange.length} hotels in range ` +
      `[${minPrice ?? '-∞'} – ${maxPrice ?? '∞'}]`
    );
    return inRange;
  }

  // 🔁 Fallback: closest prices outside the range
const outOfRange = hotelsWithPrice
  .filter(h => !inRange.some(i => i.hotelId === h.hotel.hotelId))
  .sort((a, b) => {
    const da =
      minPrice != null && a.price < minPrice ? minPrice - a.price :
      maxPrice != null && a.price > maxPrice ? a.price - maxPrice : 0;

    const db =
      minPrice != null && b.price < minPrice ? minPrice - b.price :
      maxPrice != null && b.price > maxPrice ? b.price - maxPrice : 0;

    return da - db;
  })
  .map(h => h.hotel);

  const needed = minPoolSize - inRange.length;

  const finalPool: HotelSummaryForAI[] = [
    ...inRange,
    ...outOfRange.slice(0, needed),
    ...hotelsWithoutPrice
  ].slice(0, minPoolSize);

  console.log(
    `💰 Price filter: ${inRange.length} in range, ` +
    `${Math.min(outOfRange.length, needed)} fallback, ` +
    `${finalPool.length} total`
  );

  return finalPool;
};




function topRatedCap(hotels: HotelSummaryForAI[], limit = 250): HotelSummaryForAI[] {
  return hotels
    .slice()
    .sort((a, b) => {
      const sa = Number(a.starRating || 0);
      const sb = Number(b.starRating || 0);
      if (sb !== sa) return sb - sa;

      const ra = Number(a.reviewCount || 0);
      const rb = Number(b.reviewCount || 0);
      if (rb !== ra) return rb - ra;

      const pa = parseInt(a.pricePerNight.match(/(\d+)/)?.[1] || '999999', 10);
      const pb = parseInt(b.pricePerNight.match(/(\d+)/)?.[1] || '999999', 10);
      return pa - pb;
    })
    .slice(0, limit);
}

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

const createOptimizedHotelSummaryForAI = (
  hotel: any, 
  hotelMetadata: any, 
  index: number, 
  nights: number, 
  parsedQuery: ParsedSearchQuery
): any => {
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
      refundableInfo: 'No rate information available',
      distanceFromSearch: null // Add this
    };
  }

  const { pricePerNightInfo, suggestedPrice, priceProvider } = calculatePriceInfo(hotel, nights);
  const refundablePolicy = extractRefundablePolicy(hotel);
  
  const city = hotelInfo.city || 'Unknown City';
  const country = hotelInfo.country || 'Unknown Country';
  const latitude = hotelInfo.latitude || null;
  const longitude = hotelInfo.longitude || null;
  const address = hotelInfo.address || 'Location not available';
  const name = hotelInfo.name || 'Unknown Hotel';
  const starRating = 7;
  
  const topAmenities = getCombinedAmenities(hotelInfo, parsedQuery.facilityCategories);
  const fakeReviewCount = Math.floor(Math.random() * (1100 - 700 + 1)) + 700;

  const rawDescription = hotelInfo.hotelDescription || hotelInfo.description || 'No description available';
  const optimizedDescription = optimizeHotelDescription(rawDescription, 300);

  let displayPrice = pricePerNightInfo;
  if (suggestedPrice && priceProvider) {
    displayPrice = `${pricePerNightInfo} (${priceProvider})`;
  }

  // ADD DISTANCE CALCULATION
 let distanceFromSearch = null;
// ALWAYS calculate distance (AI needs it), but flag whether to show on card
if (latitude && longitude && parsedQuery.latitude && parsedQuery.longitude) {
  const distanceKm = calculateDistance(
    parsedQuery.latitude,
    parsedQuery.longitude,
    latitude,
    longitude
  );
  distanceFromSearch = {
    km: distanceKm,
    formatted: formatDistance(distanceKm),
    fromLocation: parsedQuery.locationMentioned 
      ? (parsedQuery.searchOriginName || parsedQuery.specificPlace)
      : undefined,  // ✅ ADD THIS
    showInUI: parsedQuery.locationMentioned || false  // ✅ ADD THIS
  };
  console.log('🎯 DISTANCE OBJECT CREATED:', {
    hotelName: name,
    distance: distanceFromSearch
  });
}

  return {
    index: index + 1,
    hotelId: hotel.hotelId,
    name: name,
    location: address,
    description: optimizedDescription,
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
    refundableInfo: refundablePolicy.refundableInfo,
    distanceFromSearch: distanceFromSearch // Add this field
  };
};
const STOP_WORDS = new Set([
  'a', 'an', 'the',
  'in', 'on', 'at', 'by', 'for', 'with', 'within', 'without', 'through', 'throughout', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
  'and', 'or', 'but', 'so', 'yet', 'nor', 'as', 'while', 'since', 'because', 'although', 'though', 'unless', 'until', 'whether',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
  'that', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why', 'how',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
  'very', 'really', 'quite', 'just', 'also', 'too', 'only', 'even', 'still', 'well'
]);

const HOTEL_ABBREVIATIONS = new Map([
  ['swimming pool', 'pool'],
  ['fitness center', 'gym'],
  ['fitness centre', 'gym'],
  ['business center', 'business ctr'],
  ['business centre', 'business ctr'],
  ['air conditioning', 'AC'],
  ['air conditioned', 'AC'],
  ['private bathroom', 'ensuite'],
  ['complimentary wifi', 'free wifi'],
  ['complimentary breakfast', 'free breakfast'],
  ['parking available', 'parking'],
  ['free parking', 'parking'],
  ['room service', 'room svc'],
  ['concierge service', 'concierge'],
  ['24-hour front desk', '24h desk'],
  ['24 hour front desk', '24h desk'],
  ['located in the heart of', 'central'],
  ['located in the center of', 'central'],
  ['located in the centre of', 'central'],
  ['situated in', 'in'],
  ['positioned in', 'in'],
  ['nestled in', 'in'],
  ['conveniently located', 'located'],
  ['ideally positioned', 'located'],
  ['strategically placed', 'located'],
  ['perfectly situated', 'located'],
  ['within walking distance', 'walkable'],
  ['a short walk from', 'near'],
  ['close proximity to', 'near'],
  ['in close proximity', 'nearby'],
  ['just minutes from', 'near'],
  ['minutes away from', 'near'],
  ['world-class', 'premium'],
  ['state-of-the-art', 'modern'],
  ['cutting-edge', 'modern'],
  ['contemporary design', 'modern'],
  ['luxurious amenities', 'luxury'],
  ['premium facilities', 'premium'],
  ['exceptional service', 'quality service'],
  ['outstanding hospitality', 'quality service'],
  ['unparalleled comfort', 'comfortable'],
  ['ultimate relaxation', 'relaxing'],
  ['unforgettable experience', 'quality stay'],
  ['accommodation', 'rooms'],
  ['accommodations', 'rooms'],
  ['guest rooms', 'rooms'],
  ['spacious rooms', 'large rooms'],
  ['elegantly appointed', 'furnished'],
  ['thoughtfully designed', 'designed'],
  ['beautifully decorated', 'decorated'],
  ['experience', ''],
  ['features', 'has'],
  ['offers', 'has'],
  ['provides', 'has'],
  ['boasts', 'has'],
  ['showcases', 'has'],
  ['presents', 'has'],
]);

export const optimizeHotelDescription = (description: string, maxLength: number = 300): string => {
  if (!description || typeof description !== 'string') {
    return 'Quality accommodation';
  }

  let optimized = description;

  optimized = optimized
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .trim();

  for (const [longForm, shortForm] of HOTEL_ABBREVIATIONS) {
    const regex = new RegExp(longForm, 'gi');
    optimized = optimized.replace(regex, shortForm);
  }

  const marketingPatterns = [
    /\b(experience|enjoy|discover|explore|indulge|immerse|embrace|savor|relish)\s+/gi,
    /\b(luxury|luxurious|premium|exclusive|exceptional|outstanding|unparalleled)\s+/gi,
    /\b(perfectly|ideally|conveniently|strategically|beautifully|elegantly|thoughtfully|carefully)\s+/gi,
    /\bwhether\s+you.*?or\s+.*?,?\s*/gi,
    /\b(our|the)\s+(hotel|property|establishment|resort)\s+(offers|provides|features|boasts)\s*/gi,
  ];

  for (const pattern of marketingPatterns) {
    optimized = optimized.replace(pattern, ' ');
  }

  optimized = optimized
    .split(/\s+/)
    .filter((word, index, words) => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      
      const isFirstWord = index === 0 || words[index - 1].endsWith('.');
      const isLastWord = index === words.length - 1 || word.endsWith('.');
      
      const isImportant = /\d/.test(word) ||
                         word.length > 8 ||
                         cleanWord.endsWith('ed') ||
                         cleanWord.endsWith('ing');
      
      return isFirstWord || isLastWord || isImportant || !STOP_WORDS.has(cleanWord);
    })
    .join(' ');

  optimized = optimized
    .replace(/\s{2,}/g, ' ')
    .replace(/\.\s*\./g, '.')
    .replace(/,\s*,/g, ',')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();

  if (optimized.length > maxLength) {
    const truncated = optimized.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    optimized = lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) : truncated;
  }

  return optimized || 'Quality accommodation';
};

const parseRankedHotelLine = (
  line: string, 
  hotelSummaries: HotelSummaryForAI[]
): { rank: number; hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI } | null => {
  try {
    const match = line.match(/^(\d+)\.\s*([^|]+)\s*\|\s*(\d+)%/);
    if (!match) {
      return null;
    }
    
    const rank = parseInt(match[1]);
    const hotelName = match[2].trim();
    const aiMatchPercent = parseInt(match[3]);
    
    if (rank < 1 || rank > 15) {
      console.warn(`⚠️ Invalid rank ${rank} for hotel: ${hotelName}`);
      return null;
    }
    
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

const getAllAmenitiesForAI = (hotelInfo: any): string[] => {
  const allAmenities: string[] = [];
  
  if (hotelInfo?.facilityIds && Array.isArray(hotelInfo.facilityIds)) {
    hotelInfo.facilityIds.forEach((id: number) => {
      Object.keys(FACILITIES_ID_TO_NAME).forEach(category => {
        if (FACILITIES_ID_TO_NAME[category][id]) {
          const amenityName = FACILITIES_ID_TO_NAME[category][id];
          if (!allAmenities.includes(amenityName)) {
            allAmenities.push(amenityName);
          }
        }
      });
    });
  }
  
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
  
  const allAmenitiesText = allAmenities.join(', ');
  const filteredAmenitiesText = filterRelevantAmenities(allAmenitiesText);
  
  const filteredArray = filteredAmenitiesText ? 
    filteredAmenitiesText.split(', ').filter(Boolean) : [];
  
  if (filteredArray.length === 0) {
    filteredArray.push('Wi-Fi', 'Private Bathroom', 'Room Service');
  }
  
  return filteredArray;
};

// Add this helper function near the top of the file, after the imports
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return Math.round(distance * 100) / 100; // Round to 2 decimals
};

const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
};

const getCombinedAmenities = (hotelInfo: any, selectedCategories?: string[]): string[] => {
  const allAmenities: string[] = [];
  
  if (hotelInfo?.facilityIds && Array.isArray(hotelInfo.facilityIds)) {
    hotelInfo.facilityIds.forEach((id: number) => {
      if (selectedCategories && selectedCategories.length > 0) {
        selectedCategories.forEach(category => {
          if (FACILITIES_ID_TO_NAME[category] && FACILITIES_ID_TO_NAME[category][id]) {
            const amenityName = FACILITIES_ID_TO_NAME[category][id];
            if (!allAmenities.includes(amenityName)) {
              allAmenities.push(amenityName);
            }
          }
        });
      } else {
        return;
      }
    });
  }
  
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
  
  if (!selectedCategories || selectedCategories.length === 0) {
    return [];
  }
  
  const allAmenitiesText = allAmenities.join(', ');
  const filteredAmenitiesText = filterRelevantAmenities(allAmenitiesText);
  
  return filteredAmenitiesText ? filteredAmenitiesText.split(', ').filter(Boolean) : [];
};


const createHotelSummaryForInsights = (
  hotel: HotelWithRates, 
  hotelMetadata: any, 
  nights: number,
  parsedQuery?: ParsedSearchQuery
) => {
  const { priceRange, suggestedPrice, priceProvider } = calculatePriceInfo(hotel, nights);
  const refundablePolicy = extractRefundablePolicy(hotel);
  
  const topAmenities = getAllAmenitiesForAI(hotelMetadata);
  const images = extractHotelImages(hotelMetadata);
  const photoGalleryImages = extractPhotoGalleryFromMetadata(hotelMetadata);
  
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

  // CALCULATE DISTANCE FROM SEARCH LOCATION
  let distanceFromSearch = null;
  if (parsedQuery && hotelMetadata?.latitude && hotelMetadata?.longitude && 
      parsedQuery.latitude && parsedQuery.longitude) {
    const distanceKm = calculateDistance(
      parsedQuery.latitude,
      parsedQuery.longitude,
      hotelMetadata.latitude,
      hotelMetadata.longitude
    );
    distanceFromSearch = {
  km: distanceKm,
  formatted: formatDistance(distanceKm),
  fromLocation: parsedQuery.locationMentioned 
    ? parsedQuery.searchOriginName 
    : undefined,  // Only add if POI
  showInUI: parsedQuery.locationMentioned || false  // Flag for UI

  
};
  }

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
    photoGalleryImages: photoGalleryImages,
    distanceFromSearch: distanceFromSearch, // NEW FIELD
    cancellationPolicies: hotel.roomTypes?.flatMap(room => 
      room.rates?.map(rate => ({
        refundableTag: rate.cancellationPolicies?.refundableTag,
        cancelPolicyInfos: rate.cancellationPolicies?.cancelPolicyInfos || [],
        hotelRemarks: rate.cancellationPolicies?.hotelRemarks || []
      })) || []
    ) || []
  };
};

const extractPhotoGalleryFromMetadata = (hotelMetadata: any): string[] => {
  try {
    console.log('📸 Extracting photo gallery from hotel metadata...');
    
    if (!hotelMetadata) {
      console.warn('⚠️ No hotel metadata available for photo gallery');
      return [];
    }

    const photoGallery: string[] = [];

    if (hotelMetadata.hotelImages && Array.isArray(hotelMetadata.hotelImages)) {
      console.log(`📷 Found ${hotelMetadata.hotelImages.length} hotel images in metadata`);
      
      const imageUrls = hotelMetadata.hotelImages
        .slice(0, 10)
        .map((imageObj: any) => {
          if (typeof imageObj === 'string') {
            return imageObj;
          }
          return imageObj.urlHd || imageObj.url;
        })
        .filter((url: string | null | undefined): url is string => Boolean(url));
      
      photoGallery.push(...imageUrls);
    }
    

    if (photoGallery.length < 10) {
      if (hotelMetadata.main_photo && !photoGallery.includes(hotelMetadata.main_photo)) {
        photoGallery.push(hotelMetadata.main_photo);
      }

      if (hotelMetadata.thumbnail && 
          hotelMetadata.thumbnail !== hotelMetadata.main_photo && 
          !photoGallery.includes(hotelMetadata.thumbnail)) {
        photoGallery.push(hotelMetadata.thumbnail);
      }

      if (hotelMetadata.images && Array.isArray(hotelMetadata.images) && photoGallery.length < 10) {
        const additionalImages = hotelMetadata.images
          .slice(0, 10 - photoGallery.length)
          .map((img: any) => typeof img === 'string' ? img : (img.url || img.urlHd))
          .filter((url: string | null | undefined): url is string => Boolean(url))
          .filter((url: string) => !photoGallery.includes(url));
        
        photoGallery.push(...additionalImages);
      }
    }

    const finalGallery = [...new Set(photoGallery)].slice(0, 10);
    
    console.log(`✅ Photo gallery extracted: ${finalGallery.length} images`);
    return finalGallery;
    
  } catch (error) {
    console.warn('❌ Error extracting photo gallery from metadata:', error);
    return [];
  }
};

const generateCohereQuery = async (
  userInput: string,
  parsedQuery: ParsedSearchQuery
): Promise<string> => {
  try {
    const prompt = `
You are generating a compact semantic search query for a hotel ranking system.

Rules:
- Output a single short line (max 20 words).
- Remove filler words and grammar.
- Keep only intent-bearing keywords.
- Include:
  - hotel type / vibe (boutique, luxury, family, budget, etc.)
  - important amenities (rooftop bar, pool, spa, parking, etc.)
  - location (city / landmark)
  - price constraints if present
  - distance intent if present (near, walkable, beachfront, etc.)
- Do NOT output punctuation or quotes.
- Do NOT explain.

User request:
"${userInput}"

Output only the optimized query line.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 40,
      messages: [
        { role: 'system', content: 'You generate search queries only.' },
        { role: 'user', content: prompt }
      ]
    });

    const query = response.choices[0]?.message?.content?.trim();

    if (!query) {
      console.warn('⚠️ Empty Cohere query generated, falling back to userInput');
      return userInput;
    }

    console.log('🧠 Cohere semantic query:', query);
    return query;

  } catch (err) {
    console.error('❌ Failed to generate Cohere query, falling back to userInput:', err);
    return userInput;
  }
};


export const hotelSearchAndMatchController = async (req: Request, res: Response) => {
  const logger = new PerformanceLogger();

  const isSSERequest = req.method === 'GET';
  const userInput = isSSERequest
    ? String(req.query.q ?? req.query.userInput ?? '')
    : req.body.userInput;

  const checkInParam = isSSERequest ? req.query.checkIn : req.body.checkIn;
  const checkOutParam = isSSERequest ? req.query.checkOut : req.body.checkOut;

  if (!userInput?.trim()) {
    return res.status(400).json({ error: 'userInput is required' });
  }

  if (isSSERequest) {
    console.log('🌊 Setting up SSE connection for mobile streaming...');
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.setHeader('X-Accel-Buffering', 'no');
    
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const heartbeat = setInterval(() => {
      if (!res.destroyed) {
        res.write(': heartbeat\n\n');
      }
    }, 15000);

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

    res.write('data: {"type":"connected","message":"Real-time search connected"}\n\n');
  }

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

    sendUpdate('progress', { message: 'Understanding your request...', step: 1, totalSteps: 8 });

    logger.startStep('1-ParseQuery', { userInput });

    const parseResponse = await internalApiInstance.post('/api/query/parse', { userInput });
    const parsedQuery: ParsedSearchQuery = parseResponse.data;
    parsedQuery.minPrice = parsedQuery.minCost ?? null;
parsedQuery.maxPrice = parsedQuery.maxCost ?? null;


    sendUpdate('progress', { 
  message: 'Optimizing search intent...', 
  step: 1, 
  totalSteps: 8
});


const cohereQuery = await generateCohereQuery(userInput, parsedQuery);

console.log('🎯 Using Cohere query:', cohereQuery);



    if (checkInParam && checkOutParam) {
      parsedQuery.checkin = String(checkInParam);
      parsedQuery.checkout = String(checkOutParam);
      console.log(`📅 Using explicit dates: ${parsedQuery.checkin} to ${parsedQuery.checkout}`);
    }

    logger.endStep('1-ParseQuery', { parsedQuery });

    sendUpdate('progress', { 
      message: 'Understanding your request...', 
      step: 1, 
      totalSteps: 8,
      searchParams: {
        checkin: parsedQuery.checkin,
        checkout: parsedQuery.checkout,
        adults: parsedQuery.adults || 2,
        children: parsedQuery.children || 0,
        location: parsedQuery.fullPlaceName || parsedQuery.specificPlace
      }
    });

    if (!parsedQuery.checkin || !parsedQuery.checkout || !parsedQuery.latitude || !parsedQuery.longitude) {
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

    // STEP 2: Fetch hotels using coordinates and radius
    sendUpdate('progress', { 
      message: `Searching for hotels near ${parsedQuery.fullPlaceName || parsedQuery.specificPlace}...`, 
      step: 2, 
      totalSteps: 8,
      location: parsedQuery.fullPlaceName || parsedQuery.specificPlace,
      radius: parsedQuery.searchRadius
    });
    
    logger.startStep('2-FetchHotelsWithCoordinates', {
      latitude: parsedQuery.latitude,
      longitude: parsedQuery.longitude,
      radius: parsedQuery.searchRadius,
      hotelTypeIds: HOTEL_TYPE_IDS
    });
    
   const hotelSearchParams: any = {
  latitude: parsedQuery.latitude,
  longitude: parsedQuery.longitude,
  radius: parsedQuery.searchRadius,
  hotelTypeIds: HOTEL_TYPE_IDS.join(','),
  language: 'en',
  limit: 900
};

// ✅ Inject cityName ONLY if explicitly present (not Paris-only anymore)
const hasExplicitCity =
  typeof parsedQuery.cityName === 'string' &&
  parsedQuery.cityName.trim().length > 0;

if (hasExplicitCity) {
  hotelSearchParams.cityName = parsedQuery.cityName;
  console.log(`🏙️ Injecting cityName into LiteAPI query: ${parsedQuery.cityName}`);
}

// ---- helper ----
const runHotelSearch = async (params: any) => {
  const res = await liteApiInstance.get('/data/hotels', {
    params,
    timeout: 30000
  });
  return res.data?.data || res.data || [];
};

// ---- Primary search ----
let hotels = await runHotelSearch(hotelSearchParams);

console.log(
  `🏨 LiteAPI primary search returned ${hotels.length} hotels` +
  (hasExplicitCity ? ` (city=${parsedQuery.cityName})` : '')
);

// ---- Fallback ONLY if zero ----
if (hasExplicitCity && hotels.length === 0) {
  console.warn(
    `⚠️ Zero hotels returned with city="${parsedQuery.cityName}". Retrying without city filter...`
  );

  const relaxedParams = { ...hotelSearchParams };
  delete relaxedParams.cityName;

  const fallbackHotels = await runHotelSearch(relaxedParams);

  console.log(
    `🔁 LiteAPI fallback search returned ${fallbackHotels.length} hotels (no city filter)`
  );

  hotels = fallbackHotels;
}

 


    logger.endStep('2-FetchHotelsWithCoordinates', { hotelCount: hotels?.length || 0 });

    if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
      if (isSSERequest) {
        sendUpdate('error', {
          message: `No hotels found near ${parsedQuery.fullPlaceName || parsedQuery.specificPlace}. Try a different location or larger radius.`,
          searchParams: parsedQuery
        });
        res.end();
        return;
      } else {
        return res.status(404).json({
          error: 'No hotels found',
          message: `No hotels found near ${parsedQuery.fullPlaceName || parsedQuery.specificPlace}`,
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

    // STEP 4: Fetch rates
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

    logger.startStep('4-FetchRates', { 
      hotelCount: hotelIds.length, 
      checkin: parsedQuery.checkin, 
      checkout: parsedQuery.checkout
    });

    console.log(`📞 Fetching rates for ${hotelIds.length} hotels`);

    const ratesResponse = await liteApiInstance.post('/hotels/rates', {
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
      limit: 600,
      hotelIds: hotelIds
    }, { timeout: 20000 });

    let hotelsWithRates = ratesResponse.data?.data || ratesResponse.data || [];

    if (!Array.isArray(hotelsWithRates)) {
      if (hotelsWithRates && typeof hotelsWithRates === 'object' && hotelsWithRates !== null) {
        const ratesObj = hotelsWithRates as Record<string, unknown>;
        if (Array.isArray((ratesObj as any).hotels)) {
          hotelsWithRates = (ratesObj as any).hotels;
        } else if (Array.isArray((ratesObj as any).data)) {
          hotelsWithRates = (ratesObj as any).data;
        } else if (Array.isArray((ratesObj as any).results)) {
          hotelsWithRates = (ratesObj as any).results;
        } else {
          hotelsWithRates = [hotelsWithRates];
        }
      } else {
        hotelsWithRates = [];
      }
    }

    logger.endStep('4-FetchRates', { 
      hotelsWithRates: hotelsWithRates.length
    });

    console.log(`✅ Received rates for ${hotelsWithRates.length} hotels`);

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

        const summary = createOptimizedHotelSummaryForAI(rateHotel, hotelMetadata, index, nights, parsedQuery);
        hotelSummariesForAI.push(summary);
        
      } catch (error) {
        console.warn(`⚠️  Error processing hotel at index ${index}:`, error);
      }
    });
    
    logger.endStep('5-BuildAISummaries', { summariesBuilt: hotelSummariesForAI.length });

    // STEP 5.5 — Apply price filter with fallback
logger.startStep('5.5-PriceFilter', {
  maxPrice: parsedQuery.maxPrice || null,
  originalCount: hotelSummariesForAI.length
});

const priceFilteredHotels = filterHotelsByPriceWithFallback(
  hotelSummariesForAI,
  parsedQuery.minPrice,
  parsedQuery.maxPrice,
  100
);


logger.endStep('5.5-PriceFilter', {
  filteredCount: priceFilteredHotels.length
});


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

    // STEP 6: Cap hotels for AI
    sendUpdate('progress', { 
      message: 'Analyzing hotel options...', 
      step: 6, 
      totalSteps: 8
    });

    // STEP 6: Cohere Semantic Rerank
sendUpdate('progress', { 
  message: 'Ranking best hotel matches...', 
  step: 6, 
  totalSteps: 8
});

logger.startStep('6-CohereRerank', { 
  originalCount: hotelSummariesForAI.length
});

const cappedForLLM = await rerankHotelsWithCohere(
  cohereQuery,
  priceFilteredHotels,   // ✅ correct
  200
);

logger.endStep('6-CohereRerank', { 
  rerankedCount: cappedForLLM.length
});


    // STEP 7: GPT AI Matching
    sendUpdate('progress', { 
      message: '', 
      step: 7, 
      totalSteps: 8
    });

    logger.startStep('7-GPTMatching', { hotelCount: cappedForLLM.length });
    
    const gptMatches = await gptHotelMatchingSSE(
      cappedForLLM, 
      parsedQuery, 
      nights,
      sendUpdate,
      hotelMetadataMap,
      hotelsWithRates,
      userInput,
      searchId
    );
    
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

    // STEP 8: Build enriched hotel data
    sendUpdate('progress', { 
      message: 'Finalizing your perfect hotel matches...', 
      step: 8, 
      totalSteps: 8
    });

    if (!Array.isArray(gptMatches)) {
      console.error('❌ GPT matches is not an array:', typeof gptMatches, gptMatches);
      
      if (isSSERequest) {
        sendUpdate('error', { 
          message: 'AI matching system returned invalid data',
          details: `Expected array, got ${typeof gptMatches}`
        });
        res.end();
        return;
      } else {
        return res.status(500).json({
          error: 'AI matching failed',
          message: 'Invalid response from AI matching system',
          details: typeof gptMatches
        });
      }
    }

    logger.startStep('8-BuildEnrichedData', { selectedHotels: gptMatches.length });

    const enrichedHotels = gptMatches.map((match: { hotelName: string; aiMatchPercent: number; hotelData: HotelSummaryForAI }) => {
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

      const enrichedHotelSummary = createHotelSummaryForInsights(matchingHotel, hotelMetadata, nights, parsedQuery);
      
      return {
        ...enrichedHotelSummary,
        aiMatchPercent: match.aiMatchPercent,
        photoGalleryImages: enrichedHotelSummary.photoGalleryImages || [],
        summarizedInfo: {
          name: enrichedHotelSummary.name,
          description: hotelMetadata?.hotelDescription || hotelMetadata?.description || 'No description available',
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
          refundableInfo: enrichedHotelSummary.refundableInfo,
          photoGalleryImages: enrichedHotelSummary.photoGalleryImages || []
        }
      };
    }).filter(Boolean);

    logger.endStep('8-BuildEnrichedData', { enrichedHotels: enrichedHotels.length });

    const totalSearchCost = searchCostTracker.finishSearch(searchId);
    const performanceReport = logger.getDetailedReport();
    console.log(`🚀 ${isSSERequest ? 'SSE' : 'POST'} Hotel Search Complete in ${performanceReport.totalTime}ms ✅`);

    if (isSSERequest) {
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
          optimization: 'Real-time SSE streaming with coordinate-based search'
        }
      });
      
      if (!res.destroyed) {
        res.end();
      }
    } else {
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
          optimization: `Coordinate-based search with ${parsedQuery.searchRadius}m radius`
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