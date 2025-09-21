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
  firstRoomImage: string | null;  // CHANGE FROM thirdImageHd
  secondRoomImage: string | null;
  allHotelInfo: string;
  safetyRating: number;           // NEW: Safety rating out of 10
  safetyJustification: string; 
  topAmenities: string[];
  photoGalleryImages: string[];
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
    // ADD THIS: Include amenitiesText in the interface
    amenitiesText?: string; // Made optional for backward compatibility
    starRating: number;
    reviewCount: number;
    pricePerNight: string;
    location: string;
    city: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
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

const getPhotoGalleryImages = (hotelDetailsData: HotelSentimentData | null): string[] => {
  try {
    if (!hotelDetailsData?.data?.hotelImages || !Array.isArray(hotelDetailsData.data.hotelImages)) {
      console.warn('⚠️ No hotel images array found for photo gallery');
      return [];
    }
    
    const images = hotelDetailsData.data.hotelImages;
    console.log(`📸 Processing ${images.length} hotel images for photo gallery`);
    
    // Extract up to 10 images, prioritizing HD URLs
    const photoGallery = images
      .slice(0, 10) // Take first 10 images
      .map(image => {
        // Prefer HD URL, fallback to regular URL
        const imageUrl = image.urlHd || image.url;
        console.log(`   Adding image to gallery: ${imageUrl}`);
        return imageUrl;
      })
      .filter(url => url && url.trim() !== ''); // Remove any null/empty URLs
    
    console.log(`✅ Photo gallery created with ${photoGallery.length} images`);
    return photoGallery;
    
  } catch (error) {
    console.warn('❌ Error extracting photo gallery images:', error);
    return [];
  }
};

const getRoomOrHotelImages = (hotelDetailsData: HotelSentimentData | null): { firstImage: string | null; secondImage: string | null } => {
  try {
    if (!hotelDetailsData?.data) {
      return { firstImage: null, secondImage: null };
    }
    
    // PRIORITY 1: Try to get first TWO photos from first room
    if (hotelDetailsData.data.rooms && Array.isArray(hotelDetailsData.data.rooms) && hotelDetailsData.data.rooms.length > 0) {
      const firstRoom = hotelDetailsData.data.rooms[0];
      
      if (firstRoom.photos && Array.isArray(firstRoom.photos) && firstRoom.photos.length >= 2) {
        const firstPhoto = firstRoom.photos[0];
        const secondPhoto = firstRoom.photos[1];
        
        const firstImageUrl = firstPhoto.hd_url || firstPhoto.url || null;
        const secondImageUrl = secondPhoto.hd_url || secondPhoto.url || null;
        
        if (firstImageUrl && secondImageUrl) {
          console.log(`✅ Using first two room photos: ${firstImageUrl}, ${secondImageUrl}`);
          return { firstImage: firstImageUrl, secondImage: secondImageUrl };
        }
      }
    }
    
    // FALLBACK: Use third and fourth hotel images
    if (hotelDetailsData.data.hotelImages && Array.isArray(hotelDetailsData.data.hotelImages)) {
      const images = hotelDetailsData.data.hotelImages;
      
      let firstImage: string | null = null;
      let secondImage: string | null = null;
      
      // Check if there's a 3rd image (index 2)
      if (images.length >= 3 && images[2]) {
        firstImage = images[2].urlHd || images[2].url || null;
      }
      
      // Check if there's a 4th image (index 3)
      if (images.length >= 4 && images[3]) {
        secondImage = images[3].urlHd || images[3].url || null;
      }
      
      if (firstImage && secondImage) {
        console.log(`✅ Using third and fourth hotel images: ${firstImage}, ${secondImage}`);
        return { firstImage, secondImage };
      }
      
      if (firstImage) {
        console.log(`✅ Using only third hotel image: ${firstImage}`);
        return { firstImage, secondImage: null };
      }
    }
    
    console.warn('⚠️ No suitable images found - no room photos or hotel images available');
    return { firstImage: null, secondImage: null };
    
  } catch (error) {
    console.warn('❌ Error extracting hotel/room images:', error);
    return { firstImage: null, secondImage: null };
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

const getFallbackSafetyRating = (city: string, country: string): number => {
  const cityLower = city.toLowerCase();
  const countryLower = country.toLowerCase();
  
  // High safety countries/cities (8-9 rating)
  const highSafetyCities = ['singapore', 'zurich', 'geneva', 'vienna', 'copenhagen', 'stockholm', 'oslo', 'helsinki', 'reykjavik', 'luxembourg'];
  const highSafetyCountries = ['singapore', 'switzerland', 'denmark', 'norway', 'finland', 'iceland', 'japan', 'canada', 'australia', 'new zealand'];
  
  // Major tourist cities (7-8 rating)
  const majorTouristCities = ['london', 'paris', 'amsterdam', 'berlin', 'munich', 'madrid', 'barcelona', 'rome', 'milan', 'dubai', 'hong kong', 'seoul', 'tokyo', 'sydney', 'melbourne'];
  
  // US cities vary widely (6-8 rating)
  const saferUSCities = ['san francisco', 'seattle', 'boston', 'washington dc', 'chicago', 'denver'];
  
  if (highSafetyCities.includes(cityLower) || highSafetyCountries.includes(countryLower)) {
    return 8;
  } else if (majorTouristCities.includes(cityLower)) {
    return 7;
  } else if (countryLower === 'united states' && saferUSCities.some(city => cityLower.includes(city))) {
    return 7;
  } else if (countryLower === 'united states') {
    return 6; // General US city rating
  } else if (['united kingdom', 'germany', 'france', 'italy', 'spain', 'netherlands', 'austria'].includes(countryLower)) {
    return 7; // General Western Europe
  } else {
    return 6; // Conservative default
  }
};
// Helper function to extract default amenities when AI fails
const getDefaultAmenities = (amenitiesText: string): string[] => {
  if (!amenitiesText || amenitiesText.trim() === '') {
    return ["Free Wi-Fi", "24-hour reception", "Air conditioning"];
  }
  
  // Split amenities and clean them up
  const amenitiesList = amenitiesText.split(',').map(amenity => amenity.trim());
  
  // Priority amenities to look for
  const priorityAmenities = [
    'wifi', 'pool', 'gym', 'spa', 'restaurant', 'bar', 'parking', 
    'breakfast', 'concierge', 'business center', 'meeting room', 
    'air conditioning', 'balcony', 'room service'
  ];
  
  const selectedAmenities: string[] = [];
  
  // First, try to find priority amenities
  for (const priority of priorityAmenities) {
    if (selectedAmenities.length >= 3) break;
    
    const matchingAmenity = amenitiesList.find(amenity => 
      amenity.toLowerCase().includes(priority.toLowerCase())
    );
    
    if (matchingAmenity) {
      selectedAmenities.push(matchingAmenity);
    }
  }
  
  // If we still need more, add the first available ones
  while (selectedAmenities.length < 3 && selectedAmenities.length < amenitiesList.length) {
    const nextAmenity = amenitiesList[selectedAmenities.length];
    if (nextAmenity && !selectedAmenities.includes(nextAmenity)) {
      selectedAmenities.push(nextAmenity);
    } else {
      break;
    }
  }
  
  // Fallback if we still don't have 3
  while (selectedAmenities.length < 3) {
    const fallbacks = ["Free Wi-Fi", "24-hour reception", "Air conditioning"];
    const fallback = fallbacks[selectedAmenities.length];
    if (!selectedAmenities.includes(fallback)) {
      selectedAmenities.push(fallback);
    } else {
      selectedAmenities.push(`Standard amenity ${selectedAmenities.length + 1}`);
    }
  }
  
  return selectedAmenities.slice(0, 3);
};

const generateCombinedAIContent = async (
  hotel: HotelSummaryForInsights,
  userQuery?: string,
  nights?: number,
  searchId?: string
): Promise<{
  whyItMatches: string;
  funFacts: string[];
  nearbyAttractions: string[];
  locationHighlight: string;
  safetyRating: number;
  safetyJustification: string;
  topAmenities: string[]; 
}> => {
  
  console.log(`🧠 Generating ALL content for ${hotel.name} in single call`);
  
  const summary = hotel.summarizedInfo;
  const amenitiesForAI = summary.amenitiesText || 
                         (summary.amenities && summary.amenities.length > 0 
                           ? summary.amenities.join(', ') 
                           : 'Standard hotel amenities');
  
  const hasSpecificPreferences = userQuery && userQuery.trim() !== '';
  
  const prompt = `HOTEL: ${summary.name}
LOCATION: ${summary.city}, ${summary.country}
ADDRESS: ${summary.location}
DESC: ${summary.description}
AMENITIES: ${amenitiesForAI}
PRICE: ${summary.pricePerNight}
RATING: ${summary.starRating} stars
${hasSpecificPreferences ? `USER SEARCH: "${userQuery}"` : ''}

Generate content + safety rating (1-10 for tourist safety in this location).

JSON:
{
  "whyItMatches": "${hasSpecificPreferences ? '25 words - why fits search, mention relevant amenities' : '20 words - why great choice'}",
  "funFacts": ["fact1", "fact2"],
  "nearbyAttractions": ["name - desc - X min transport", "name - desc - X min transport"],
  "locationHighlight": "key location advantage",
  "topAmenities": ["amenity1", "amenity2", "amenity3"],
  "safetyRating": 7,
  "safetyJustification": "15-25 words about location safety"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Generate hotel content + safety rating. Reply only JSON.' },
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
    
    const safetyRating = Math.max(1, Math.min(10, Math.round(parsedContent.safetyRating || 7)));
    
    console.log(`✅ Combined content generated for ${hotel.name}`);
    
    return {
      whyItMatches: parsedContent.whyItMatches || "Great choice for your stay",
      funFacts: parsedContent.funFacts || ["Modern amenities", "Excellent service"],
      nearbyAttractions: parsedContent.nearbyAttractions || getDefaultAttractionsBySearch(userQuery, summary.city),
      locationHighlight: parsedContent.locationHighlight || "Convenient location",
      topAmenities: parsedContent.topAmenities || getDefaultAmenities(amenitiesForAI),
      safetyRating,
      safetyJustification: parsedContent.safetyJustification || "Generally safe area"
    };
    
  } catch (error) {
    console.warn(`⚠️ Combined AI failed for ${hotel.name}:`, error);
    
    return {
      whyItMatches: "Great choice with excellent amenities and location",
      funFacts: ["Modern facilities", "Excellent reviews"],
      nearbyAttractions: getDefaultAttractionsBySearch(userQuery, summary.city),
      locationHighlight: "Prime location",
      topAmenities: getDefaultAmenities(amenitiesForAI),
      safetyRating: getFallbackSafetyRating(summary.city, summary.country),
      safetyJustification: "Generally safe area with standard precautions"
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
  firstRoomImage: string | null;
  secondRoomImage: string | null;
  allHotelInfo: string;
  photoGalleryImages: string[]; // NEW: Add photo gallery to return type
}> => {

  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  try {
    console.log(`🎭 Starting hotel details fetch and insights for ${hotel.name}`);
    
    const hotelDetailsData = await getHotelSentimentOptimized(hotel.hotelId);
    const guestInsights = await generateInsightsFromSentiment(hotel.name, hotelDetailsData);
    const roomImages = getRoomOrHotelImages(hotelDetailsData);
    const allHotelInfo = consolidateAllHotelInfo(hotelDetailsData);
    const photoGalleryImages = getPhotoGalleryImages(hotelDetailsData); // NEW: Extract photo gallery

    console.log(`✅ Completed hotel details and insights for ${hotel.name}`);
    console.log(`🖼️  Images found: first=${!!roomImages.firstImage}, second=${!!roomImages.secondImage}, gallery=${photoGalleryImages.length}`);
    
    return {
      hotelId: hotel.hotelId,
      guestInsights,
      sentimentData: hotelDetailsData,
      firstRoomImage: roomImages.firstImage,
      secondRoomImage: roomImages.secondImage,
      allHotelInfo,
      photoGalleryImages // NEW: Include photo gallery in return
    };
    
  } catch (error) {
    console.warn(`⚠️ Hotel details and insights failed for ${hotel.name}:`, error);
    
    return {
      hotelId: hotel.hotelId,
      guestInsights: "Guests appreciate the comfortable accommodations and convenient location. Some mention the check-in process could be faster.",
      sentimentData: null,
      firstRoomImage: null,
      secondRoomImage: null,
      allHotelInfo: 'Detailed hotel information not available',
      photoGalleryImages: [] // NEW: Empty array as fallback
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
        
        const aiContent = await generateCombinedAIContent(hotel, userQuery, nights, searchId);
        
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
  locationHighlight: "Prime location",
  safetyRating: 7, // Add missing property with default value
  safetyJustification: "Generally safe area with standard city precautions recommended" ,
  topAmenities: getDefaultAmenities(hotel.summarizedInfo.amenitiesText || hotel.summarizedInfo.amenities?.join(', ') || "") // Add missing property
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
    firstRoomImage: hotelDetailsInsights?.firstRoomImage || null,
    secondRoomImage: hotelDetailsInsights?.secondRoomImage || null,
    allHotelInfo: hotelDetailsInsights?.allHotelInfo || 'Detailed information not available',
    safetyRating: aiContent.safetyRating,
    safetyJustification: aiContent.safetyJustification,
    topAmenities: aiContent.topAmenities,
    photoGalleryImages: hotelDetailsInsights?.photoGalleryImages || [] // NEW: Add photo gallery to final response
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