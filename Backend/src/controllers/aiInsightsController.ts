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
  HotelSentimentData,
  ParsedSearchQuery
} from '../types/hotel';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Verify environment variables
console.log('🔑 AI Insights Environment Variables Check:');
console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
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

// Fetch sentiment data from LiteAPI
const getHotelSentimentOptimized = async (hotelId: string): Promise<HotelSentimentData | null> => {
  try {
    console.log(`🎭 Fetching sentiment analysis for hotel ID: ${hotelId}`);
    
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
    
    return sentimentData;
  } catch (error) {
    console.warn(`Failed to get sentiment data for ${hotelId}:`, error);
    return null;
  }
};

// Generate guest insights from sentiment data using Groq
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

Write 2 sentences (<25 words each). 1) "Guests love …" → 3-4 positives. 2) "Main concern is …" → top negative (not parking). Don't name hotel.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'Role: hotel-review analyst. Output 2 balanced sentences—highlight positives, mention ONE main concern (never "limited parking").'
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

    // STEP 1: Generate detailed AI content for all hotels in parallel
    logger.startStep('1-GenerateAIContent', { hotelCount: validHotels.length });

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

    const aiContentResults = await Promise.all(aiContentPromises);
    logger.endStep('1-GenerateAIContent', { contentGenerated: aiContentResults.length });

    // STEP 2: Fetch sentiment analysis for all hotels in parallel
    logger.startStep('2-FetchSentiment', { hotelCount: validHotels.length });

    const sentimentPromises = validHotels.map(async (hotel, index) => {
      try {
        // Stagger requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, index * 200));
        
        const sentimentData = await getHotelSentimentOptimized(hotel.hotelId);
        
        return {
          hotelId: hotel.hotelId,
          sentimentData
        };
        
      } catch (error) {
        console.warn(`⚠️ Sentiment fetch failed for ${hotel.name}:`, error);
        return {
          hotelId: hotel.hotelId,
          sentimentData: null
        };
      }
    });

    const sentimentResults = await Promise.all(sentimentPromises);
    const sentimentMap = new Map(sentimentResults.map(result => [result.hotelId, result.sentimentData]));
    
    logger.endStep('2-FetchSentiment', { sentimentFetched: sentimentResults.length });

    // STEP 3: Generate guest insights from sentiment data
    logger.startStep('3-GenerateInsights', { hotelCount: validHotels.length });

    const insightsPromises = validHotels.map(async (hotel, index) => {
      try {
        // Stagger requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, index * 150));
        
        const sentimentData = sentimentMap.get(hotel.hotelId) ?? null;
        const guestInsights = await generateInsightsFromSentiment(hotel.name, sentimentData);
        
        return {
          hotelId: hotel.hotelId,
          guestInsights,
          sentimentData
        };
        
      } catch (error) {
        console.warn(`⚠️ Insights generation failed for ${hotel.name}:`, error);
        
        const fallbackInsights = "Guests appreciate the comfortable accommodations and convenient location. Some mention the check-in process could be faster.";
        
        return {
          hotelId: hotel.hotelId,
          guestInsights: fallbackInsights,
          sentimentData: null
        };
      }
    });

    const insightsResults = await Promise.all(insightsPromises);
    const insightsMap = new Map(insightsResults.map(result => [result.hotelId, {
      guestInsights: result.guestInsights,
      sentimentData: result.sentimentData
    }]));

    logger.endStep('3-GenerateInsights', { insightsGenerated: insightsResults.length });

    // STEP 4: Combine all AI-generated content
    logger.startStep('4-CombineResults', { hotelCount: validHotels.length });

    const finalRecommendations: AIRecommendation[] = aiContentResults.map(aiContent => {
      const insights = insightsMap.get(aiContent.hotelId);
      
      return {
        hotelId: aiContent.hotelId,
        hotelName: aiContent.name,
        aiMatchPercent: aiContent.aiMatchPercent,
        whyItMatches: aiContent.whyItMatches,
        funFacts: aiContent.funFacts,
        nearbyAttractions: aiContent.nearbyAttractions,
        locationHighlight: aiContent.locationHighlight,
        guestInsights: insights?.guestInsights || "Loading insights...",
        sentimentData: insights?.sentimentData || null
      };
    });

    logger.endStep('4-CombineResults', { finalRecommendations: finalRecommendations.length });

    // Final response
    const performanceReport = logger.getDetailedReport();
    console.log(`🚀 AI Insights Complete in ${performanceReport.totalTime}ms ✅`);

    return res.status(200).json({
      insightsId: insightsId,
      processedHotels: validHotels.length,
      recommendations: finalRecommendations,
      aiModels: {
        content: "gpt-4o-mini",
        insights: "llama-3.1-8b-instant"
      },
      generatedAt: new Date().toISOString(),
      performance: {
        totalTimeMs: performanceReport.totalTime,
        stepBreakdown: performanceReport.steps,
        bottlenecks: performanceReport.bottlenecks
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
                error.config?.url?.includes('liteapi') ? 'sentiment_analysis' : 'unknown',
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