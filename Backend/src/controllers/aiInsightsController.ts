// src/controllers/aiInsightsController.ts
import { Request, Response } from 'express';
import axios from 'axios';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import pLimit from 'p-limit';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { 
  AIRecommendation, 
  ParsedSearchQuery
} from '../types/hotel';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Verify environment variables
console.log('🔑 AI Insights Environment Variables Check:');
console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('LITEAPI_KEY exists:', !!process.env.LITEAPI_KEY);

// Updated interface to match the actual LiteAPI response structure
interface HotelSentimentData {
  data: {
    id: string;
    name: string;
    hotelDescription: string;
    hotelImportantInformation: string;
    checkinCheckoutTimes: {
      checkout: string;
      checkin: string;
      checkinStart: string;
    };
    hotelImages: Array<{
      url: string;
      urlHd: string;
      caption: string;
      order: number;
      defaultImage: boolean;
    }>;
    main_photo: string;
    thumbnail: string;
    country: string;
    city: string;
    starRating: number;
    location: {
      latitude: number;
      longitude: number;
    };
    address: string;
    hotelFacilities: string[];
    facilities: Array<{
      facilityId: number;
      name: string;
    }>;
    rooms: Array<{
      id: number;
      roomName: string;
      description: string;
      roomSizeSquare: number;
      roomSizeUnit: string;
      hotelId: string;
      maxAdults: number;
      maxChildren: number;
      maxOccupancy: number;
      bedTypes: Array<{
        quantity: number;
        bedType: string;
        bedSize: string;
      }>;
      roomAmenities: Array<{
        amenitiesId: number;
        name: string;
        sort: number;
      }>;
      photos: Array<{
        url: string;
        imageDescription: string;
        imageClass1: string;
        imageClass2: string;
        failoverPhoto: string;
        mainPhoto: boolean;
        score: number;
        classId: number;
        classOrder: number;
        hd_url: string;
      }>;
    }>;
    phone: string;
    fax: string;
    email: string;
    hotelType: string;
    hotelTypeId: number;
    airportCode: string;
    rating: number;
    reviewCount: number;
    parking: string;
    groupRoomMin: number;
    childAllowed: boolean;
    petsAllowed: boolean;
    policies: Array<{
      policy_type: string;
      name: string;
      description: string;
      child_allowed: string;
      pets_allowed: string;
      parking: string;
    }>;
    sentiment_analysis: {
      cons: string[];
      pros: string[];
      categories: Array<{
        name: string;
        rating: number;
        description: string;
      }>;
    };
    sentiment_updated_at: string;
  };
}

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
    
    console.log('📊 AI Insights Performance Report:', JSON.stringify(report, null, 2));
    return report;
  }
}

// Configuration
const SENTIMENT_FETCH_TIMEOUT = 8000;
const AI_INSIGHTS_CONCURRENCY = parseInt(process.env.AI_INSIGHTS_CONCURRENCY || '4');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Optimized axios instance for LiteAPI
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

// Concurrency limiter for sentiment analysis
const sentimentLimit = pLimit(AI_INSIGHTS_CONCURRENCY);

// Interface for hotel summary data coming from the first endpoint
interface HotelSummaryForInsights {
  hotelId: string;
  name: string;
  aiMatchPercent: number;
  summarizedInfo: {
    name: string;
    description: string;
    amenities: string[];
    starRating: number;
    reviewCount: number;
    pricePerNight: string;
    location: string;
    city: string;
    country: string;
  };
}

// Fetch hotel details including sentiment data from LiteAPI
const getHotelSentimentOptimized = async (hotelId: string): Promise<HotelSentimentData | null> => {
  try {
    console.log(`🎭 Fetching hotel details with sentiment analysis for hotel ID: ${hotelId}`);
    
    const response = await sentimentLimit(() => 
      liteApiInstance.get('/data/hotel', {
        params: {
          hotelId: hotelId
        },
        timeout: SENTIMENT_FETCH_TIMEOUT
      })
    );

    if (response.status !== 200) {
      throw new Error(`LiteAPI hotel details error: ${response.status}`);
    }

    const hotelData = response.data;
    console.log(`✅ Got hotel details with sentiment data for hotel ${hotelId}`);
    
    return hotelData;
  } catch (error) {
    console.warn(`Failed to get hotel details for ${hotelId}:`, error);
    return null;
  }
};

// Generate guest insights from sentiment data - CLEAN RATINGS FORMAT
const generateInsightsFromSentiment = async (hotelName: string, sentimentData: HotelSentimentData | null): Promise<string> => {
  
  // Check if sentiment data exists and has the correct structure
  if (!sentimentData || !sentimentData.data || !sentimentData.data.sentiment_analysis) {
    console.log(`⚠️ No sentiment analysis data found for ${hotelName}, using fallback`);
    
    // Fallback ratings
    return `Cleanliness: 7.2/10\nService: 7.9/10\nLocation: 8.3/10\nRoom Quality: 7.2/10`;
  }

  try {
    console.log(`✅ Processing real sentiment data for ${hotelName}`);
    
    // Extract the actual sentiment analysis data from the API response
    const { categories } = sentimentData.data.sentiment_analysis;
    
    // Map API category names if needed
    const categoryMapping: { [key: string]: string | null } = {
      "Amenities": "Room Quality",
      "Overall Experience": null
    };
    
    const processedCategories = categories
      .filter(category => {
        const targetCategories = ["Cleanliness", "Service", "Location", "Room Quality"];
        return targetCategories.includes(category.name) || categoryMapping[category.name];
      })
      .map(category => ({
        name: categoryMapping[category.name] || category.name,
        rating: category.rating
      }))
      .filter(category => category.name);
    
    // Create a map for quick lookup
    const categoryMap = new Map(processedCategories.map(cat => [cat.name, cat.rating]));
    
    // Get ratings for the 4 main categories
    const cleanliness = categoryMap.get("Cleanliness") || 6.0;
    const service = categoryMap.get("Service") || 6.0;
    const location = categoryMap.get("Location") || 6.0;
    const roomQuality = categoryMap.get("Room Quality") || 6.0;
    
    // Return clean format
    return `Cleanliness: ${cleanliness}/10\nService: ${service}/10\nLocation: ${location}/10\nRoom Quality: ${roomQuality}/10`;
    
  } catch (error) {
    console.warn(`❌ Failed to process sentiment data for ${hotelName}:`, error);
    
    // Return fallback ratings on error
    return `Cleanliness: 5.9/10\nService: 7.6/10\nLocation: 8.3/10\nRoom Quality: 4.9/10`;
  }
};

// Generate detailed AI content using GPT-4o Mini
const generateDetailedAIContent = async (
  hotel: HotelSummaryForInsights,
  userQuery?: string,
  nights?: number
): Promise<{
  whyItMatches: string;
  funFacts: string[];
  nearbyAttractions: string[];
  locationHighlight: string;
}> => {
  
  console.log(`🧠 GPT-4o Mini generating detailed content for ${hotel.name}`);
  
  const hasSpecificPreferences = userQuery && userQuery.trim() !== '';
  const summary = hotel.summarizedInfo;
  
  const prompt = hasSpecificPreferences ? 
    `USER REQUEST: "${userQuery}"
HOTEL: ${summary.name}
LOCATION: ${summary.city}, ${summary.country}
AMENITIES: ${summary.amenities.join(', ')}
PRICE: ${summary.pricePerNight}
RATING: ${summary.starRating} stars
DESCRIPTION: ${summary.description}
MATCH PERCENTAGE: ${hotel.aiMatchPercent}%

TASK: Generate engaging content explaining why this hotel matches the user's request.

Return JSON:
{
  "whyItMatches": "20 words max - why it fits their specific request",
  "funFacts": ["fact1", "fact2"],
  "nearbyAttractions": ["attraction1", "attraction2"],
  "locationHighlight": "key location advantage"
}

Make it compelling and specific to their "${userQuery}" request.` :

    `HOTEL: ${summary.name}
LOCATION: ${summary.city}, ${summary.country}  
AMENITIES: ${summary.amenities.join(', ')}
PRICE: ${summary.pricePerNight}
RATING: ${summary.starRating} stars
DESCRIPTION: ${summary.description}

TASK: Generate engaging content for this hotel recommendation.

Return JSON:
{
  "whyItMatches": "20 words max - why it's a great choice",
  "funFacts": ["fact1", "fact2"],
  "nearbyAttractions": ["attraction1", "attraction2"], 
  "locationHighlight": "key location advantage"
}

Focus on value, location, and guest experience.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a travel content expert. Generate engaging, accurate hotel descriptions. Reply ONLY with valid JSON.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    const content = completion.choices[0]?.message?.content?.trim() || '{}';
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsedContent = JSON.parse(cleanContent);
    
    console.log(`✅ GPT-4o Mini generated content for ${hotel.name}`);
    
    return {
      whyItMatches: parsedContent.whyItMatches || "Great choice for your stay",
      funFacts: parsedContent.funFacts || ["Modern amenities", "Excellent service"],
      nearbyAttractions: parsedContent.nearbyAttractions || ["City center", "Local attractions"],
      locationHighlight: parsedContent.locationHighlight || "Convenient location"
    };
    
  } catch (error) {
    console.warn(`⚠️ GPT-4o Mini failed for ${hotel.name}:`, error);
    
    // Fallback content
    return {
      whyItMatches: hasSpecificPreferences ? 
        `Perfect match for your ${userQuery} requirements` : 
        "Excellent choice with great amenities and location",
      funFacts: ["Modern facilities", "Excellent guest reviews"],
      nearbyAttractions: [`${summary.city} center`, "Local landmarks"], 
      locationHighlight: "Prime location"
    };
  }
};

// New combined function that handles hotel details fetching and insight generation in parallel
const fetchHotelDetailsAndGenerateInsights = async (
  hotel: HotelSummaryForInsights,
  delayMs: number = 0
): Promise<{
  hotelId: string;
  guestInsights: string;
  sentimentData: HotelSentimentData | null;
}> => {
  
  // Stagger requests to avoid rate limiting
  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  try {
    console.log(`🎭 Starting hotel details fetch and insights for ${hotel.name}`);
    
    // Fetch hotel details (which includes sentiment data)
    const hotelDetailsData = await getHotelSentimentOptimized(hotel.hotelId);
    
    // Generate insights from sentiment data (this happens immediately after hotel details fetch)
    const guestInsights = await generateInsightsFromSentiment(hotel.name, hotelDetailsData);
    
    console.log(`✅ Completed hotel details and insights for ${hotel.name}`);
    
    return {
      hotelId: hotel.hotelId,
      guestInsights,
      sentimentData: hotelDetailsData
    };
    
  } catch (error) {
    console.warn(`⚠️ Hotel details and insights failed for ${hotel.name}:`, error);
    
    const fallbackInsights = "Guests appreciate the comfortable accommodations and convenient location. Some mention the check-in process could be faster.";
    
    return {
      hotelId: hotel.hotelId,
      guestInsights: fallbackInsights,
      sentimentData: null
    };
  }
};

// Main controller function for AI insights
export const aiInsightsController = async (req: Request, res: Response) => {
  const logger = new PerformanceLogger();
  
  try {
    const { hotels, userQuery, nights } = req.body;

    if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
      return res.status(400).json({ 
        error: 'Hotels array is required',
        message: 'Please provide an array of hotels with their summarized information'
      });
    }

    console.log(`🚀 AI Insights Starting for ${hotels.length} hotels`);
    const insightsId = randomUUID();

    // Validate hotel data structure
    const validHotels: HotelSummaryForInsights[] = hotels.filter((hotel: any) => {
      if (!hotel.hotelId || !hotel.name || !hotel.summarizedInfo) {
        console.warn(`⚠️ Invalid hotel data structure:`, hotel);
        return false;
      }
      return true;
    });

    if (validHotels.length === 0) {
      return res.status(400).json({
        error: 'No valid hotels found',
        message: 'Hotels must include hotelId, name, and summarizedInfo'
      });
    }

    console.log(`📝 Processing ${validHotels.length} valid hotels`);

    // PARALLEL PROCESSING: Start both AI content generation AND sentiment+insights processing simultaneously
    logger.startStep('ParallelProcessing', { hotelCount: validHotels.length });

    // Promise 1: Generate detailed AI content for all hotels
    const aiContentPromises = validHotels.map(async (hotel, index) => {
      try {
        // Stagger requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, index * 300));
        
        const aiContent = await generateDetailedAIContent(hotel, userQuery, nights);
        
        return {
          hotelId: hotel.hotelId,
          name: hotel.name,
          aiMatchPercent: hotel.aiMatchPercent,
          ...aiContent
        };
        
      } catch (error) {
        console.warn(`⚠️ AI content generation failed for ${hotel.name}:`, error);
        
        // Return fallback content
        return {
          hotelId: hotel.hotelId,
          name: hotel.name,
          aiMatchPercent: hotel.aiMatchPercent,
          whyItMatches: "Great choice with excellent amenities and location",
          funFacts: ["Modern facilities", "Excellent guest reviews"],
          nearbyAttractions: [`${hotel.summarizedInfo.city} center`, "Local landmarks"],
          locationHighlight: "Prime location"
        };
      }
    });

    // Promise 2: Fetch hotel details and generate insights for all hotels
    const hotelDetailsInsightsPromises = validHotels.map(async (hotel, index) => {
      // Use shorter delay since we're now combining hotel details fetch + insights generation
      const delayMs = index * 200; 
      return await fetchHotelDetailsAndGenerateInsights(hotel, delayMs);
    });

    // Execute both sets of operations in parallel
    const [aiContentResults, hotelDetailsInsightsResults] = await Promise.all([
      Promise.all(aiContentPromises),
      Promise.all(hotelDetailsInsightsPromises)
    ]);

    logger.endStep('ParallelProcessing', { 
      aiContentGenerated: aiContentResults.length,
      hotelDetailsInsightsGenerated: hotelDetailsInsightsResults.length
    });

    // STEP: Combine all results
    logger.startStep('CombineResults', { hotelCount: validHotels.length });

    // Create maps for quick lookup
    const hotelDetailsInsightsMap = new Map(
      hotelDetailsInsightsResults.map(result => [result.hotelId, result])
    );

    const finalRecommendations: AIRecommendation[] = aiContentResults.map(aiContent => {
      const hotelDetailsInsights = hotelDetailsInsightsMap.get(aiContent.hotelId);
      
      return {
        hotelId: aiContent.hotelId,
        hotelName: aiContent.name,
        aiMatchPercent: aiContent.aiMatchPercent,
        whyItMatches: aiContent.whyItMatches,
        funFacts: aiContent.funFacts,
        nearbyAttractions: aiContent.nearbyAttractions,
        locationHighlight: aiContent.locationHighlight,
        guestInsights: hotelDetailsInsights?.guestInsights || "Loading insights...",
        sentimentData: hotelDetailsInsights?.sentimentData || null
      };
    });

    logger.endStep('CombineResults', { finalRecommendations: finalRecommendations.length });

    // Final response
    const performanceReport = logger.getDetailedReport();
    console.log(`🚀 AI Insights Complete in ${performanceReport.totalTime}ms ✅`);

    return res.status(200).json({
      insightsId: insightsId,
      processedHotels: validHotels.length,
      recommendations: finalRecommendations,
      aiModels: {
        content: "gpt-4o-mini",
        insights: "direct_processing"
      },
      generatedAt: new Date().toISOString(),
      performance: {
        totalTimeMs: performanceReport.totalTime,
        stepBreakdown: performanceReport.steps,
        bottlenecks: performanceReport.bottlenecks,
        optimizations: [
          "Parallel processing of AI content and hotel details analysis",
          "Combined hotel details fetch with insights generation",
          "Reduced API call delays",
          "Direct sentiment processing from hotel details endpoint"
        ]
      }
    });

  } catch (error) {
    console.error('Error in AI insights generation:', error);
    const errorReport = logger.getDetailedReport();
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return res.status(error.response.status).json({
          error: 'API error',
          message: error.response.data?.message || error.response.data?.error?.description || 'Unknown API error',
          details: error.response.data,
          step: error.config?.url?.includes('openai') ? 'gpt_content' :
                error.config?.url?.includes('groq') ? 'insights_generation' :
                error.config?.url?.includes('liteapi') ? 'hotel_details_analysis' : 'unknown',
          performance: errorReport
        });
      }
    }

    return res.status(500).json({ 
      error: 'AI insights generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      performance: errorReport
    });
  }
};