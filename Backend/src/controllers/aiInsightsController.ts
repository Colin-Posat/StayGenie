// src/controllers/aiInsightsController.ts
import { Request, Response } from 'express';
import axios, { all } from 'axios';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import pLimit from 'p-limit';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { searchCostTracker, extractTokens } from '../utils/searchCostTracker';

export interface AIRecommendation {
  hotelId: string;
  hotelName: string;
  aiMatchPercent: number;
  whyItMatches: string;
  funFacts: string[];
  nearbyAttractions: string[];
  locationHighlight: string;
  guestInsights: string;
  sentimentData: any;
  thirdImageHd: string | null; // ADD THIS
  allHotelInfo: string;
}

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
const AI_INSIGHTS_CONCURRENCY = 5;

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
  timeout: 30000,
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
    latitude: number | null;  // ADD THIS
    longitude: number | null; // ADD THIS
  };
}
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
  } catch (error: any) {
    // Handle rate limiting specifically
    if (error.response?.status === 429) {
      console.warn(`⏰ Rate limited for hotel ${hotelId} - waiting and retrying...`);
      
      // Wait 2 seconds and retry once
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const retryResponse = await liteApiInstance.get('/data/hotel', {
          params: { hotelId: hotelId },
          timeout: SENTIMENT_FETCH_TIMEOUT
        });
        
        console.log(`✅ Retry successful for hotel ${hotelId}`);
        return retryResponse.data;
      } catch (retryError) {
        console.warn(`❌ Retry also failed for hotel ${hotelId}`);
        return null;
      }
    }
    
    console.warn(`Failed to get hotel details for ${hotelId}:`, error.response?.status || error.message);
    return null;
  }
};

const getThirdHotelImageHd = (hotelDetailsData: HotelSentimentData | null): string | null => {
  try {
    if (!hotelDetailsData?.data?.hotelImages || !Array.isArray(hotelDetailsData.data.hotelImages)) {
      return null;
    }
    
    const images = hotelDetailsData.data.hotelImages;
    
    // Check if there's a 3rd image (index 2)
    if (images.length >= 3 && images[2]) {
      return images[2].urlHd || images[2].url || null;
    }
    
    return null;
  } catch (error) {
    console.warn('Error extracting third hotel image:', error);
    return null;
  }
};
import fs from 'fs';

const writeHotelInfoToFile = (hotelName: string, hotelId: string, allHotelInfo: string): void => {
  try {
    // Create a logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../../logs/hotel-info');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Clean hotel name for filename
    const cleanHotelName = hotelName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `${cleanHotelName}_${hotelId}_${timestamp}.txt`;
    const filepath = path.join(logsDir, filename);

    // Write the consolidated info to file
    fs.writeFileSync(filepath, allHotelInfo, 'utf8');
    
    console.log(`📁 Hotel info written to: ${filepath}`);
    console.log(`📊 File size: ${allHotelInfo.length} characters`);
    
  } catch (error) {
    console.error(`❌ Failed to write hotel info to file for ${hotelName}:`, error);
  }
};

const consolidateAllHotelInfo = (hotelDetailsData: HotelSentimentData | null): string => {
  console.log('🔍 Starting consolidateAllHotelInfo processing...');
  
  if (!hotelDetailsData?.data) {
    console.log('❌ No hotel details data available for consolidation');
    return 'Detailed hotel information not available';
  }

  const hotel = hotelDetailsData.data;
  console.log(`📝 Consolidating info for hotel: ${hotel.name} (ID: ${hotel.id})`);
  
  let allInfo = '';
  let sectionsProcessed = 0;

  // Hotel Description
  if (hotel.hotelDescription) {
    console.log('✅ Processing hotel description...');
    const cleanDescription = hotel.hotelDescription.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    allInfo += 'HOTEL DESCRIPTION:\n';
    allInfo += cleanDescription + '\n\n';
    sectionsProcessed++;
    console.log(`   Description length: ${cleanDescription.length} characters`);
  } else {
    console.log('⚠️ No hotel description found');
  }

  // Important Information
  if (hotel.hotelImportantInformation) {
    console.log('✅ Processing important information...');
    allInfo += 'IMPORTANT INFORMATION:\n';
    allInfo += hotel.hotelImportantInformation.trim() + '\n\n';
    sectionsProcessed++;
    console.log(`   Important info length: ${hotel.hotelImportantInformation.length} characters`);
  } else {
    console.log('⚠️ No important information found');
  }

  // All Amenities/Facilities
  if (hotel.hotelFacilities && hotel.hotelFacilities.length > 0) {
    console.log(`✅ Processing ${hotel.hotelFacilities.length} hotel facilities...`);
    allInfo += 'HOTEL FACILITIES & AMENITIES:\n';
    hotel.hotelFacilities.forEach(facility => {
      allInfo += `• ${facility}\n`;
    });
    allInfo += '\n';
    sectionsProcessed++;
  } else {
    console.log('⚠️ No hotel facilities found');
  }

  // Additional structured facilities
  if (hotel.facilities && hotel.facilities.length > 0) {
    console.log(`✅ Processing ${hotel.facilities.length} additional facilities...`);
    allInfo += 'ADDITIONAL FACILITIES:\n';
    hotel.facilities.forEach(facility => {
      allInfo += `• ${facility.name}\n`;
    });
    allInfo += '\n';
    sectionsProcessed++;
  } else {
    console.log('⚠️ No additional facilities found');
  }

  // Policies
  if (hotel.policies && hotel.policies.length > 0) {
    console.log(`✅ Processing ${hotel.policies.length} hotel policies...`);
    allInfo += 'HOTEL POLICIES:\n';
    hotel.policies.forEach(policy => {
      allInfo += `${policy.name.toUpperCase()}:\n`;
      allInfo += policy.description.trim() + '\n\n';
      console.log(`   Policy processed: ${policy.name}`);
    });
    sectionsProcessed++;
  } else {
    console.log('⚠️ No hotel policies found');
  }

  // Sentiment Analysis
  if (hotel.sentiment_analysis) {
    console.log('✅ Processing sentiment analysis...');
    const sentiment = hotel.sentiment_analysis;
    
    allInfo += 'GUEST SENTIMENT ANALYSIS:\n';
    
    if (sentiment.pros && sentiment.pros.length > 0) {
      console.log(`   Found ${sentiment.pros.length} positive points`);
      allInfo += 'What Guests Love:\n';
      sentiment.pros.forEach(pro => {
        allInfo += `• ${pro}\n`;
      });
      allInfo += '\n';
    }
    
    if (sentiment.cons && sentiment.cons.length > 0) {
      console.log(`   Found ${sentiment.cons.length} areas for improvement`);
      allInfo += 'Areas for Improvement:\n';
      sentiment.cons.forEach(con => {
        allInfo += `• ${con}\n`;
      });
      allInfo += '\n';
    }
    
    if (sentiment.categories && sentiment.categories.length > 0) {
      console.log(`   Found ${sentiment.categories.length} rating categories`);
      allInfo += 'Category Ratings:\n';
      sentiment.categories.forEach(category => {
        allInfo += `• ${category.name}: ${category.rating}/10 - ${category.description}\n`;
      });
      allInfo += '\n';
    }
    sectionsProcessed++;
  } else {
    console.log('⚠️ No sentiment analysis found');
  }

  // Hotel Contact & Basic Info
  console.log('✅ Processing basic information...');
  allInfo += 'BASIC INFORMATION:\n';
  allInfo += `Name: ${hotel.name}\n`;
  allInfo += `Address: ${hotel.address}\n`;
  allInfo += `City: ${hotel.city}\n`;
  allInfo += `Country: ${hotel.country}\n`;
  allInfo += `Star Rating: ${hotel.starRating} stars\n`;
  allInfo += `Guest Rating: ${hotel.rating}/10 (${hotel.reviewCount} reviews)\n`;
  
  if (hotel.checkinCheckoutTimes) {
    allInfo += `Check-in: ${hotel.checkinCheckoutTimes.checkin}\n`;
    allInfo += `Check-out: ${hotel.checkinCheckoutTimes.checkout}\n`;
    console.log('   Check-in/out times added');
  }
  sectionsProcessed++;

  const finalLength = allInfo.trim().length;
  console.log(`🎉 Consolidation complete for ${hotel.name}:`);
  console.log(`   Sections processed: ${sectionsProcessed}`);
  console.log(`   Final text length: ${finalLength} characters`);
  console.log(`   First 200 chars: ${allInfo.substring(0, 200)}...`);

  const finalInfo = allInfo.trim();
  
  // Write to file for inspection
  writeHotelInfoToFile(hotel.name, hotel.id, finalInfo);

  return allInfo.trim();
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

// Enhanced generateDetailedAIContent function with search-relevant nearby attractions
const generateDetailedAIContent = async (
  hotel: HotelSummaryForInsights,
  userQuery?: string,
  nights?: number,
  searchId?: string
): Promise<{
  whyItMatches: string;
  funFacts: string[];
  nearbyAttractions: string[];
  locationHighlight: string;
}> => {

  
  console.log(`🧠 GPT-4o Mini generating detailed content for ${hotel.name}`);
  
  const hasSpecificPreferences = userQuery && userQuery.trim() !== '';
  const summary = hotel.summarizedInfo;
  
  // Enhanced prompt that focuses on search-relevant attractions
  const prompt = hasSpecificPreferences ? 
    `USER SEARCH REQUEST: "${userQuery}"
HOTEL: ${summary.name}
FULL ADDRESS: ${summary.location}
COORDINATES: ${summary.latitude}, ${summary.longitude}
LOCATION: ${summary.city}, ${summary.country}
FULL DESCRIPTION: ${summary.description}
AMENITIES: ${summary.amenities.join(', ')}
PRICE: ${summary.pricePerNight}
RATING: ${summary.starRating} stars
MATCH PERCENTAGE: ${hotel.aiMatchPercent}%

TASK: Generate engaging content explaining why this hotel matches the user's request.
Use the COORDINATES and FULL ADDRESS to identify real nearby attractions that are RELEVANT to the user's search intent.

SEARCH RELEVANCE INSTRUCTIONS:
- Analyze the user's search "${userQuery}" for interests, activities, or preferences
- If they mention business/work: prioritize business districts, conference centers, airports
- If they mention romance/honeymoon: focus on romantic spots, fine dining, scenic views
- If they mention family/kids: highlight family attractions, parks, kid-friendly activities  
- If they mention culture/history: emphasize museums, historical sites, cultural landmarks
- If they mention shopping: include shopping districts, markets, luxury stores
- If they mention nightlife: feature entertainment districts, bars, clubs
- If they mention beaches/nature: prioritize natural attractions, beaches, outdoor activities
- If they mention specific activities (e.g., "skiing", "diving"): find related facilities nearby

Return JSON:
{
  "whyItMatches": "25 words max - why it fits their specific request and why it's a great choice",
  "funFacts": ["fact1", "fact2"],  
  "nearbyAttractions": [
    "attraction name - brief description relevant to user search - X min by transportation_mode",
    "attraction name - brief description relevant to user search - X min by transportation_mode"
  ],
  "locationHighlight": "key location advantage that relates to user search"
}

CRITICAL REQUIREMENTS:
1. If what the user requested in "${userQuery}" is in the description, mention it in whyItMatches
2. Do not say anything in whyItMatches that is not mentioned in the description unless obvious
3. If something is not mentioned in the description, say "WHAT THE USER REQUESTED is not specifically mentioned"
4. Make it engaging like a fun travel agent (around 20 words)
5. In whyItMatches, start with hotel name UNLESS something is not mentioned, then start with "While"
6. When mentioning the query, put it into words that fit the sentence smoothly

NEARBY ATTRACTIONS FORMAT:
"Attraction Name - brief description that relates to "${userQuery}" - X min by walk/metro/bus/taxi"

Examples based on search intent:
For business search: "Financial District - major business hub with corporate offices - 10 min by metro"
For family search: "Children's Museum - interactive exhibits for kids - 15 min by walk"  
For romantic search: "Sunset Viewpoint - romantic city views perfect for couples - 8 min by taxi"
For cultural search: "National Gallery - world-class art collection - 12 min by bus"

Use coordinates (${summary.latitude}, ${summary.longitude}) to find REAL attractions that match the user's interests.` :

    `HOTEL: ${summary.name}
FULL ADDRESS: ${summary.location}
COORDINATES: ${summary.latitude}, ${summary.longitude}
LOCATION: ${summary.city}, ${summary.country}
FULL DESCRIPTION: ${summary.description}
AMENITIES: ${summary.amenities.join(', ')}
PRICE: ${summary.pricePerNight}
RATING: ${summary.starRating} stars

TASK: Generate engaging content for this hotel recommendation.
Use the COORDINATES and ADDRESS to identify real nearby attractions suitable for general travelers.

Return JSON:
{
  "whyItMatches": "20 words max - why it's a great choice based on location and amenities",
  "funFacts": ["fact1", "fact2"],
  "nearbyAttractions": [
    "attraction name - brief description - X min by transportation_mode",
    "attraction name - brief description - X min by transportation_mode"  
  ],
  "locationHighlight": "key location advantage"
}

REQUIREMENTS:
1. Do not say anything in whyItMatches not mentioned in description unless obvious
2. If something is not mentioned, say "WHAT IS NOT MENTIONED is not specifically mentioned"
3. Keep it engaging like a fun travel agent (around 20 words)
4. Start with hotel name UNLESS something is not mentioned, then start with "While"

NEARBY ATTRACTIONS FORMAT:
"Attraction Name - brief description - X min by walk/metro/bus/taxi"

Examples:
"Louvre Museum - world famous art collection - 10 min by metro"
"Central Park - green oasis perfect for relaxation - 5 min by walk"
"Shopping District - luxury boutiques and local stores - 20 min by bus"

Use coordinates (${summary.latitude}, ${summary.longitude}) for real attractions with accurate travel times.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system', 
          content: `You are a travel content expert who specializes in matching attractions to traveler interests. 
          When a user has specific search preferences, prioritize nearby attractions that align with their interests.
          Generate engaging, accurate hotel descriptions. Reply ONLY with valid JSON. 
          Make nearbyAttractions descriptions 5-8 words maximum and ensure they relate to the user's search when possible.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    if (searchId) {
      const tokens = extractTokens(completion);
      searchCostTracker.addGptUsage(searchId, 'aiInsights', tokens.prompt, tokens.completion);
    }

    const content = completion.choices[0]?.message?.content?.trim() || '{}';
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsedContent = JSON.parse(cleanContent);
    
    console.log(`✅ GPT-4o Mini generated search-relevant content for ${hotel.name}`);
    
    // Enhanced processing to ensure attractions are properly formatted and search-relevant
    const nearbyAttractions = Array.isArray(parsedContent.nearbyAttractions) 
      ? parsedContent.nearbyAttractions.map((attraction: any) => {
          if (typeof attraction === 'string') {
            // Ensure proper format with search relevance
            if (attraction.includes(' - ') && attraction.split(' - ').length >= 3) {
              return attraction; // Already has description and travel time
            } else if (attraction.includes(' - ')) {
              return `${attraction} - 8 min walk`; // Has description, add travel time
            } else {
              // Add search-relevant description based on user query
              const searchRelevantDesc = hasSpecificPreferences ? 
                getSearchRelevantDescription(userQuery!, attraction) : 
                "popular local attraction";
              return `${attraction} - ${searchRelevantDesc} - 12 min walk`;
            }
          }
          return `${attraction.name || "Local attraction"} - ${attraction.description || "worth visiting during stay"} - ${attraction.travelTime || "15 min walk"}`;
        })
      : getDefaultAttractionsBySearch(userQuery, summary.city);
    
    return {
      whyItMatches: parsedContent.whyItMatches || "Great choice for your stay",
      funFacts: parsedContent.funFacts || ["Modern amenities", "Excellent service"],
      nearbyAttractions: nearbyAttractions,
      locationHighlight: parsedContent.locationHighlight || "Convenient location"
    };
    
  } catch (error) {
    console.warn(`⚠️ GPT-4o Mini failed for ${hotel.name}:`, error);
    
    // Enhanced fallback content that considers search relevance
    return {
      whyItMatches: hasSpecificPreferences ? 
        `Perfect match for your ${extractSearchIntent(userQuery!)} requirements` : 
        "Excellent choice with great amenities and location",
      funFacts: ["Modern facilities", "Excellent guest reviews"],
      nearbyAttractions: getDefaultAttractionsBySearch(userQuery, summary.city),
      locationHighlight: "Prime location"
    };
  }
};

// Helper function to generate search-relevant description
const getSearchRelevantDescription = (userQuery: string, attractionName: string): string => {
  const query = userQuery.toLowerCase();
  
  if (query.includes('business') || query.includes('work') || query.includes('meeting')) {
    return "convenient for business travelers";
  }
  if (query.includes('romantic') || query.includes('honeymoon') || query.includes('couple')) {
    return "perfect romantic setting";  
  }
  if (query.includes('family') || query.includes('kids') || query.includes('children')) {
    return "great for families with children";
  }
  if (query.includes('culture') || query.includes('history') || query.includes('museum')) {
    return "rich cultural experience";
  }
  if (query.includes('shopping') || query.includes('shop')) {
    return "excellent shopping destination";
  }
  if (query.includes('nightlife') || query.includes('party') || query.includes('bar')) {
    return "vibrant nightlife scene";
  }
  if (query.includes('beach') || query.includes('nature') || query.includes('outdoor')) {
    return "beautiful natural attraction";
  }
  
  return "popular local attraction";
};

// Helper function to extract search intent
const extractSearchIntent = (userQuery: string): string => {
  const query = userQuery.toLowerCase();
  
  if (query.includes('business') || query.includes('work')) return "business travel";
  if (query.includes('romantic') || query.includes('honeymoon')) return "romantic getaway";
  if (query.includes('family') || query.includes('kids')) return "family vacation";
  if (query.includes('culture') || query.includes('history')) return "cultural experience";
  if (query.includes('shopping')) return "shopping trip";
  if (query.includes('nightlife') || query.includes('party')) return "nightlife experience";
  if (query.includes('beach') || query.includes('nature')) return "nature experience";
  
  return "travel";
};

// Helper function to provide default attractions based on search context
const getDefaultAttractionsBySearch = (userQuery?: string, city?: string): string[] => {
  const baseCity = city || "City";
  
  if (!userQuery) {
    return [
      `${baseCity} Center - main city attractions and shopping - 8 min walk`,
      "Local Landmarks - historic sites and cultural spots - 15 min walk"
    ];
  }
  
  const query = userQuery.toLowerCase();
  
  if (query.includes('business') || query.includes('work')) {
    return [
      `${baseCity} Business District - corporate offices and meeting venues - 10 min metro`,
      "Convention Center - conference facilities and business services - 12 min taxi"
    ];
  }
  
  if (query.includes('romantic') || query.includes('honeymoon')) {
    return [
      `${baseCity} Scenic Overlook - romantic city views for couples - 15 min walk`,
      "Fine Dining District - upscale restaurants and wine bars - 8 min taxi"
    ];
  }
  
  if (query.includes('family') || query.includes('kids')) {
    return [
      `${baseCity} Family Park - playgrounds and family activities - 10 min walk`, 
      "Children's Entertainment Center - kid-friendly attractions and games - 20 min metro"
    ];
  }
  
  if (query.includes('culture') || query.includes('history')) {
    return [
      `${baseCity} Museum District - art galleries and cultural exhibits - 12 min bus`,
      "Historic Old Town - traditional architecture and local heritage - 15 min walk"
    ];
  }
  
  if (query.includes('shopping')) {
    return [
      `${baseCity} Shopping Center - major retail stores and boutiques - 5 min walk`,
      "Local Markets - traditional crafts and local specialties - 18 min metro"
    ];
  }
  
  if (query.includes('nightlife') || query.includes('party')) {
    return [
      `${baseCity} Entertainment District - bars clubs and live music - 10 min taxi`,
      "Nightlife Quarter - vibrant evening scene and cocktail lounges - 15 min walk"
    ];
  }
  
  // Default fallback
  return [
    `${baseCity} Center - main city attractions and shopping - 8 min walk`,
    "Popular Landmarks - must-see local attractions - 15 min walk"
  ];
};


const fetchHotelDetailsAndGenerateInsights = async (
  hotel: HotelSummaryForInsights,
  delayMs: number = 0
): Promise<{
  hotelId: string;
  guestInsights: string;
  sentimentData: HotelSentimentData | null;
  thirdImageHd: string | null;
  allHotelInfo: string; // ADD THIS
}> => {
  
  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  try {
    console.log(`🎭 Starting hotel details fetch and insights for ${hotel.name}`);
    
    const hotelDetailsData = await getHotelSentimentOptimized(hotel.hotelId);
    const guestInsights = await generateInsightsFromSentiment(hotel.name, hotelDetailsData);
    const thirdImageHd = getThirdHotelImageHd(hotelDetailsData);
    const allHotelInfo = consolidateAllHotelInfo(hotelDetailsData); // ADD THIS

    console.log(`✅ Completed hotel details and insights for ${hotel.name}`);
    
    return {
      hotelId: hotel.hotelId,
      guestInsights,
      sentimentData: hotelDetailsData,
      thirdImageHd,
      allHotelInfo // ADD THIS
    };
    
  } catch (error) {
    console.warn(`⚠️ Hotel details and insights failed for ${hotel.name}:`, error);
    
    return {
      hotelId: hotel.hotelId,
      guestInsights: "Guests appreciate the comfortable accommodations and convenient location. Some mention the check-in process could be faster.",
      sentimentData: null,
      thirdImageHd: null,
      allHotelInfo: 'Detailed hotel information not available' // ADD THIS
    };
  }
};

// Main controller function for AI insights
export const aiInsightsController = async (req: Request, res: Response) => {
  const logger = new PerformanceLogger();
  
  try {
    const { hotels, userQuery, nights, searchId } = req.body;

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
        
        const aiContent = await generateDetailedAIContent(hotel, userQuery, nights, searchId);
        
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
// Promise 2: Fetch hotel details and generate insights for all hotels
const hotelDetailsInsightsPromises = validHotels.map(async (hotel, index) => {
  // FIX: Handle single hotel requests differently
  if (validHotels.length === 1) {
    // Single hotel request (like from processHotelWithImmediateInsights)
    console.log(`🔄 Processing single hotel request for: ${hotel.name}`);
    return await fetchHotelDetailsAndGenerateInsights(hotel, 0);
  } else if (index < 3) {
    // First 3 hotels in multi-hotel request
    console.log(`🔄 Processing top hotel ${index + 1} (${hotel.name}) sequentially`);
    return await fetchHotelDetailsAndGenerateInsights(hotel, 0);
  } else {
    // Rest get normal delays
    const delayMs = (index - 3) * 1000;
    console.log(`⏰ Hotel ${index + 1} (${hotel.name}) will be processed after ${delayMs}ms delay`);
    return await fetchHotelDetailsAndGenerateInsights(hotel, delayMs);
  }
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
        sentimentData: hotelDetailsInsights?.sentimentData || null,
        thirdImageHd: hotelDetailsInsights?.thirdImageHd || null,
        allHotelInfo: hotelDetailsInsights?.allHotelInfo || 'Detailed information not available'
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