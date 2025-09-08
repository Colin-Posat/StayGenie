// controllers/hotelChatController.ts - Enhanced with hotel details fetching
import { Request, Response } from 'express';
import axios from 'axios';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Optimized axios instance for LiteAPI (copied from aiInsightsController)
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

// In-memory conversation storage (in production, use Redis or a database)
const conversationStore = new Map<string, any[]>();

interface HotelData {
  id: string;
  name: string;
  location: string;
  city?: string;
  country?: string;
  allHotelInfo?: string;
  rating: number;
  reviews: number;
  price: number;
  pricePerNight?: {
    amount: number;
    totalAmount: number;
    currency: string;
    display: string;
    provider: string | null;
    isSupplierPrice: boolean;
  } | null;
  tags?: string[];
  features?: string[];
  topAmenities?: string[];
  nearbyAttractions?: string[];
  fullDescription?: string;
  fullAddress?: string;
  aiExcerpt?: string;
  whyItMatches?: string;
  funFacts?: string[];
  guestInsights?: string;
  sentimentPros?: string[];
  sentimentCons?: string[];
  locationHighlight?: string;
  isRefundable?: boolean;
  refundableInfo?: string;
  categoryRatings?: {
    cleanliness: number;
    service: number;
    location: number;
    roomQuality: number;
  };
  roomTypes?: any[];
}

interface ChatMessage {
  id: string;
  type: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

interface HotelChatRequest {
  conversationId: string;
  userMessage: string;
  hotelData: HotelData;
  chatHistory?: ChatMessage[];
}

interface HotelDetailsRequest {
  hotelId: string;
  hotelName?: string; // Optional for logging
}

// Updated interface to match the actual LiteAPI response structure (copied from aiInsightsController)
interface HotelSentimentData {
  data: {
    chain: string;
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

const saveHotelInfoToFile = async (hotelId: string, hotelName: string, allHotelInfo: string): Promise<string> => {
  try {
    // Create a safe filename (remove special characters)
    const safeHotelName = hotelName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `hotel_${hotelId}_${safeHotelName}_${timestamp}.txt`;
    
    // Create the directory if it doesn't exist
    const outputDir = path.resolve(__dirname, '../../hotel_data_exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filePath = path.join(outputDir, filename);
    
    // Create the file content with header
    const fileContent = `HOTEL DATA EXPORT
==================
Hotel Name: ${hotelName}
Hotel ID: ${hotelId}
Export Date: ${new Date().toISOString()}
Export Length: ${allHotelInfo.length} characters

==================
COMPLETE HOTEL INFORMATION
==================

${allHotelInfo}

==================
END OF EXPORT
==================`;

    // Write the file
    fs.writeFileSync(filePath, fileContent, 'utf8');
    
    console.log(`📄 Hotel data saved to: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('❌ Error saving hotel data to file:', error);
    throw error;
  }
};

// NEW: Function to fetch hotel details for chat context (adapted from aiInsightsController)
const fetchHotelDetailsForChat = async (hotelId: string): Promise<HotelSentimentData | null> => {
  try {
    console.log(`🏨 Fetching hotel details for chat context - Hotel ID: ${hotelId}`);
    
    const response = await liteApiInstance.get('/data/hotel', {
      params: {
        hotelId: hotelId
      },
      timeout: 8000 // Shorter timeout for chat context
    });

    if (response.status !== 200) {
      throw new Error(`LiteAPI hotel details error: ${response.status}`);
    }

    const hotelData = response.data;
    console.log(`✅ Successfully fetched hotel details for chat - Hotel ID: ${hotelId}`);
    
    return hotelData;
  } catch (error: any) {
    // Handle rate limiting
    if (error.response?.status === 429) {
      console.warn(`⏰ Rate limited for hotel ${hotelId} - waiting and retrying...`);
      
      // Wait 2 seconds and retry once
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const retryResponse = await liteApiInstance.get('/data/hotel', {
          params: { hotelId: hotelId },
          timeout: 8000
        });
        
        console.log(`✅ Retry successful for hotel ${hotelId} chat context`);
        return retryResponse.data;
      } catch (retryError) {
        console.warn(`❌ Retry also failed for hotel ${hotelId} chat context`);
        return null;
      }
    }
    
    console.warn(`Failed to get hotel details for chat context ${hotelId}:`, error.response?.status || error.message);
    return null;
  }
};

const consolidateHotelInfoForChat = (hotelDetailsData: HotelSentimentData | null): string => {
  console.log('🔍 Starting consolidateHotelInfoForChat processing...');
  
  if (!hotelDetailsData?.data) {
    console.log('❌ No hotel details data available for chat consolidation');
    return 'Detailed hotel information not available for chat context';
  }

  const hotel = hotelDetailsData.data;
  console.log(`📝 Consolidating chat info for hotel: ${hotel.name} (ID: ${hotel.id})`);
  
  let allInfo = '';
  let sectionsProcessed = 0;

  // Hotel Description
  if (hotel.hotelDescription) {
    console.log('✅ Processing hotel description for chat...');
    const cleanDescription = hotel.hotelDescription.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    allInfo += 'HOTEL DESCRIPTION:\n';
    allInfo += cleanDescription + '\n\n';
    sectionsProcessed++;
    console.log(`   Description length: ${cleanDescription.length} characters`);
  }

  // Important Information
  if (hotel.hotelImportantInformation) {
    console.log('✅ Processing important information for chat...');
    allInfo += 'IMPORTANT INFORMATION:\n';
    allInfo += hotel.hotelImportantInformation.trim() + '\n\n';
    sectionsProcessed++;
  }

  // Hotel Facilities & Amenities
  if (hotel.hotelFacilities && hotel.hotelFacilities.length > 0) {
    console.log(`✅ Processing ${hotel.hotelFacilities.length} hotel facilities for chat...`);
    allInfo += 'HOTEL FACILITIES & AMENITIES:\n';
    hotel.hotelFacilities.forEach(facility => {
      allInfo += `• ${facility}\n`;
    });
    allInfo += '\n';
    sectionsProcessed++;
  }

  // Additional structured facilities
  if (hotel.facilities && hotel.facilities.length > 0) {
    console.log(`✅ Processing ${hotel.facilities.length} additional facilities for chat...`);
    allInfo += 'ADDITIONAL FACILITIES:\n';
    hotel.facilities.forEach(facility => {
      allInfo += `• ${facility.name}\n`;
    });
    allInfo += '\n';
    sectionsProcessed++;
  }

  // Policies
  if (hotel.policies && hotel.policies.length > 0) {
    console.log(`✅ Processing ${hotel.policies.length} hotel policies for chat...`);
    allInfo += 'HOTEL POLICIES:\n';
    hotel.policies.forEach(policy => {
      allInfo += `${policy.name.toUpperCase()}:\n`;
      allInfo += policy.description.trim() + '\n\n';
    });
    sectionsProcessed++;
  }

  // Sentiment Analysis
  if (hotel.sentiment_analysis) {
    console.log('✅ Processing sentiment analysis for chat...');
    const sentiment = hotel.sentiment_analysis;
    
    allInfo += 'GUEST SENTIMENT ANALYSIS:\n';
    
    if (sentiment.pros && sentiment.pros.length > 0) {
      allInfo += 'What Guests Love:\n';
      sentiment.pros.forEach(pro => {
        allInfo += `• ${pro}\n`;
      });
      allInfo += '\n';
    }
    
    if (sentiment.cons && sentiment.cons.length > 0) {
      allInfo += 'Areas for Improvement:\n';
      sentiment.cons.forEach(con => {
        allInfo += `• ${con}\n`;
      });
      allInfo += '\n';
    }
    
    if (sentiment.categories && sentiment.categories.length > 0) {
      allInfo += 'Category Ratings:\n';
      sentiment.categories.forEach(category => {
        allInfo += `• ${category.name}: ${category.rating}/10 - ${category.description}\n`;
      });
      allInfo += '\n';
    }
    sectionsProcessed++;
  }

  // Basic Information
  console.log('✅ Processing basic information for chat...');
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
  }
  sectionsProcessed++;

  const finalLength = allInfo.trim().length;
  console.log(`🎉 Chat context consolidation complete for ${hotel.name}:`);
  console.log(`   Sections processed: ${sectionsProcessed}`);
  console.log(`   Final text length: ${finalLength} characters`);

  return allInfo.trim();
};


// NEW: Controller to fetch hotel details for chat context
export const fetchHotelDetailsForChatController = async (req: Request, res: Response) => {
  try {
    const { hotelId, hotelName }: HotelDetailsRequest = req.body;

    if (!hotelId) {
      return res.status(400).json({
        success: false,
        error: 'hotelId is required'
      });
    }

    console.log(`🏨 Fetching hotel details for chat context: ${hotelName || 'Unknown'} (ID: ${hotelId})`);

    // Fetch hotel details from LiteAPI
    const hotelDetailsData = await fetchHotelDetailsForChat(hotelId);
    
    if (!hotelDetailsData) {
      console.warn(`⚠️ No hotel details found for ID: ${hotelId}`);
      return res.status(404).json({
        success: false,
        error: 'Hotel details not found',
        hotelId: hotelId
      });
    }

    // Consolidate all hotel information
    const allHotelInfo = consolidateHotelInfoForChat(hotelDetailsData);
    let savedFilePath = null;
    try {
      savedFilePath = await saveHotelInfoToFile(
        hotelId, 
        hotelDetailsData.data.name, 
        allHotelInfo
      );
      console.log(`✅ Hotel data automatically saved to file: ${savedFilePath}`);
    } catch (saveError) {
      console.warn('⚠️ Failed to save hotel data to file, but continuing with API response:', saveError);
    }

    console.log(`✅ Successfully prepared hotel context for chat - ${hotelDetailsData.data.name}`);

    return res.status(200).json({
      success: true,
      hotelId: hotelId,
      hotelName: hotelDetailsData.data.name,
      allHotelInfo: allHotelInfo,
      dataLength: allHotelInfo.length,
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error fetching hotel details for chat:', error);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        return res.status(error.response.status).json({
          success: false,
          error: 'API error while fetching hotel details',
          message: error.response.data?.message || error.response.data?.error?.description || 'Unknown API error',
          details: error.response.data
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch hotel details for chat',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Generate a comprehensive hotel context for the AI
const generateHotelContext = (hotel: HotelData): string => {
  const contexts = [
    `Hotel Name: ${hotel.name}`,
    `Hotel ID: ${hotel.id}`,
  ];

  // Use the comprehensive allHotelInfo if available
  if (hotel.allHotelInfo) {
    contexts.push(`\nDetailed Hotel Information: ${hotel.allHotelInfo}`);
  } else {
    contexts.push('\nNote: Limited hotel information available. Please contact the hotel directly for detailed information.');
  }

  return contexts.join('\n');
};

// Generate fallback response for when OpenAI is unavailable
const generateFallbackResponse = (userMessage: string, hotel: HotelData): string => {
  const message = userMessage.toLowerCase();
  
  // Amenities and facilities
  if (message.includes('amenities') || message.includes('facilities')) {
    const amenities = hotel.topAmenities || hotel.features || [];
    if (amenities.length > 0) {
      return `${hotel.name} offers these amenities: ${amenities.join(', ')}. ${hotel.fullDescription || ''}`.trim();
    }
    return `I'd be happy to help with amenities information for ${hotel.name}. Based on the available information, this hotel offers quality facilities and services.`;
  }

  // Location and attractions
  if (message.includes('location') || message.includes('nearby') || message.includes('attractions') || message.includes('around')) {
    const attractions = hotel.nearbyAttractions || [];
    const locationInfo = hotel.locationHighlight || hotel.fullAddress || hotel.location;
    let response = `${hotel.name} is located at ${locationInfo}.`;
    
    if (attractions.length > 0) {
      response += ` Nearby attractions include: ${attractions.join(', ')}.`;
    }
    
    return response;
  }

  // Rooms and accommodations
  if (message.includes('room') || message.includes('bed') || message.includes('accommodation')) {
    if (hotel.roomTypes && hotel.roomTypes.length > 0) {
      return `${hotel.name} offers various room types. ${hotel.fullDescription || 'Contact the hotel directly for detailed room information.'}`;
    }
    return `${hotel.name} offers comfortable accommodations. For specific room details and availability, I recommend contacting the hotel directly.`;
  }

  // Reviews and ratings
  if (message.includes('review') || message.includes('guest') || message.includes('rating') || message.includes('opinion')) {
    let response = `${hotel.name} has a ${hotel.rating}/10 rating based on ${hotel.reviews} reviews.`;
    
    if (hotel.guestInsights) {
      response += ` ${hotel.guestInsights}`;
    }
    
    if (hotel.sentimentPros && hotel.sentimentPros.length > 0) {
      response += ` Guests particularly appreciate: ${hotel.sentimentPros.join(', ')}.`;
    }
    
    if (hotel.sentimentCons && hotel.sentimentCons.length > 0) {
      response += ` Some areas mentioned for improvement include: ${hotel.sentimentCons.join(', ')}.`;
    }
    
    return response;
  }

  // Pricing
  if (message.includes('price') || message.includes('cost') || message.includes('rate') || message.includes('expensive')) {
    const price = hotel.pricePerNight?.display || `${hotel.price}`;
    let response = `${hotel.name} is priced at ${price} per night.`;
    
    if (hotel.isRefundable) {
      response += ' This rate includes free cancellation.';
    }
    
    if (hotel.refundableInfo) {
      response += ` ${hotel.refundableInfo}`;
    }
    
    return response;
  }

  // Cancellation policy
  if (message.includes('cancel') || message.includes('refund') || message.includes('policy')) {
    if (hotel.isRefundable) {
      return `Yes, ${hotel.name} offers free cancellation. ${hotel.refundableInfo || 'Check the specific terms when booking.'}`;
    }
    return `For cancellation policies at ${hotel.name}, please check the specific booking terms or contact the hotel directly.`;
  }

  // Parking
  if (message.includes('parking') || message.includes('car')) {
    const amenities = hotel.topAmenities || hotel.features || [];
    const hasParking = amenities.some(amenity => 
      amenity.toLowerCase().includes('parking') || amenity.toLowerCase().includes('valet')
    );
    
    if (hasParking) {
      return `Yes, ${hotel.name} offers parking facilities. Check with the hotel for specific details about rates and availability.`;
    }
    return `For parking information at ${hotel.name}, please contact the hotel directly for the most current details.`;
  }

  // WiFi
  if (message.includes('wifi') || message.includes('internet')) {
    const amenities = hotel.topAmenities || hotel.features || [];
    const hasWifi = amenities.some(amenity => 
      amenity.toLowerCase().includes('wifi') || amenity.toLowerCase().includes('internet')
    );
    
    if (hasWifi) {
      return `Yes, ${hotel.name} offers WiFi access. Most modern hotels provide complimentary internet access.`;
    }
    return `For internet access information at ${hotel.name}, please check with the hotel directly.`;
  }

  // Breakfast
  if (message.includes('breakfast') || message.includes('food') || message.includes('dining')) {
    const tags = hotel.tags || [];
    const amenities = hotel.topAmenities || hotel.features || [];
    const hasBreakfast = tags.some(tag => tag.toLowerCase().includes('breakfast')) ||
                        amenities.some(amenity => amenity.toLowerCase().includes('breakfast'));
    
    if (hasBreakfast) {
      return `Yes, ${hotel.name} offers breakfast services. Check your booking for inclusion details.`;
    }
    return `For dining and breakfast information at ${hotel.name}, please contact the hotel directly for current offerings.`;
  }

  // Pool and spa
  if (message.includes('pool') || message.includes('spa') || message.includes('fitness') || message.includes('gym')) {
    const amenities = hotel.topAmenities || hotel.features || [];
    const hasPool = amenities.some(amenity => 
      amenity.toLowerCase().includes('pool') || 
      amenity.toLowerCase().includes('spa') ||
      amenity.toLowerCase().includes('fitness') ||
      amenity.toLowerCase().includes('gym')
    );
    
    if (hasPool) {
      const relevantAmenities = amenities.filter(amenity => 
        amenity.toLowerCase().includes('pool') || 
        amenity.toLowerCase().includes('spa') ||
        amenity.toLowerCase().includes('fitness') ||
        amenity.toLowerCase().includes('gym')
      );
      return `Yes, ${hotel.name} offers: ${relevantAmenities.join(', ')}.`;
    }
    return `For recreation and wellness facilities at ${hotel.name}, please contact the hotel directly for current amenities.`;
  }

  // Check-in/out times
  if (message.includes('check') && (message.includes('in') || message.includes('out')) || message.includes('time')) {
    return `For check-in and check-out times at ${hotel.name}, please contact the hotel directly as these can vary. Standard check-in is typically 3-4 PM and check-out is 11 AM-12 PM.`;
  }

  // Pet policy
  if (message.includes('pet') || message.includes('dog') || message.includes('cat') || message.includes('animal')) {
    const amenities = hotel.topAmenities || hotel.features || [];
    const petFriendly = amenities.some(amenity => 
      amenity.toLowerCase().includes('pet') || amenity.toLowerCase().includes('dog')
    );
    
    if (petFriendly) {
      return `${hotel.name} appears to be pet-friendly. Please contact the hotel directly to confirm their current pet policy and any associated fees.`;
    }
    return `For pet policies at ${hotel.name}, please contact the hotel directly as policies can vary and change.`;
  }

  // Generic fallback
  return `I'd be happy to help you learn more about ${hotel.name}! I have information about their amenities, location, reviews, and pricing. Could you please be more specific about what you'd like to know? For example, you can ask about rooms, amenities, location, reviews, or policies.`;
};

// Main chat controller function
export const hotelChatController = async (req: Request, res: Response) => {
  try {
    const { conversationId, userMessage, hotelData, chatHistory = [] }: HotelChatRequest = req.body;

    // Validation
    if (!conversationId || !userMessage || !hotelData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: conversationId, userMessage, and hotelData are required'
      });
    }

    if (!hotelData.name || !hotelData.id) {
      return res.status(400).json({
        success: false,
        error: 'Hotel data must include at least name and id'
      });
    }

    console.log(`🏨 Hotel chat request for ${hotelData.name} (ID: ${hotelData.id})`);
    console.log(`💬 User message: "${userMessage}"`);

    // Generate hotel context for AI
    const hotelContext = generateHotelContext(hotelData);

    // DEBUG: Log the hotel data and generated context
    console.log('📊 DEBUG - Hotel Data Received:');
    console.log('- Hotel ID:', hotelData.id);
    console.log('- Hotel Name:', hotelData.name);
    console.log('- allHotelInfo type:', typeof hotelData.allHotelInfo);
    console.log('- allHotelInfo value:', hotelData.allHotelInfo);
    console.log('- allHotelInfo length:', hotelData.allHotelInfo?.length || 'undefined/null');
    
    if (hotelData.allHotelInfo) {
      console.log('- allHotelInfo preview:', hotelData.allHotelInfo.substring(0, 300) + '...');
    } else {
      console.log('- allHotelInfo is empty, null, or undefined!');
    }
    
    console.log('\n🤖 DEBUG - Generated Context for GPT:');
    console.log('Context length:', hotelContext.length);
    console.log('Full context:');
    console.log('='.repeat(50));
    console.log(hotelContext);
    console.log('='.repeat(50));

    // Get or initialize conversation history
    let conversation = conversationStore.get(conversationId) || [];

    // Add user message to conversation
    conversation.push({
      role: 'user',
      content: userMessage
    });

    try {
      // Create system message with hotel context
     const systemMessage = {
        role: 'system' as const,
        content: `You are a helpful hotel concierge AI for this specific hotel. Answer questions directly using the provided information.

Hotel Information:
${hotelContext}

Response Guidelines:
- Keep responses short and direct (1-2 sentences max)
- Include all relevant facts but no extra fluff
- Be helpful and friendly but concise
- Use specific details from the hotel data
- If you don't have info, say so briefly and suggest contacting the hotel
- Don't repeat the hotel name unless necessary

Examples:
User: "Does this hotel have a pool?"
You: "Yes! We have [specific pool info from data]."

User: "What's the price?"
You: "[Exact price from data] per night with [any included perks]."

User: "What's nearby?"
You: "You're close to [2-3 top attractions from data]."
`
      };

      // Prepare messages for OpenAI (system + recent conversation)
      const messages = [
        systemMessage,
        ...conversation.slice(-10) // Last 10 messages for context
      ];

      console.log('\n📤 DEBUG - Full GPT Request:');
      console.log('Messages array length:', messages.length);
      console.log('System message length:', systemMessage.content.length);
      console.log('System message preview:');
      console.log(systemMessage.content.substring(0, 500) + '...');
      console.log('Recent conversation messages:', conversation.slice(-10).length);

      console.log(`🤖 Sending request to OpenAI for ${hotelData.name}...`);

      const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: messages,
  max_tokens: 120,          // ↓ from 300
  temperature: 0.3,         // ↓ for tighter wording
  presence_penalty: 0.0,    // keep it focused
  frequency_penalty: 0.2,   // reduce repetition slightly
});


      const aiResponse = completion.choices[0]?.message?.content?.trim();

      console.log('\n📥 DEBUG - GPT Response:');
      console.log('Response length:', aiResponse?.length || 0);
      console.log('Response content:', aiResponse || 'No response');

      if (!aiResponse) {
        throw new Error('Empty response from OpenAI');
      }

      // Add AI response to conversation
      conversation.push({
        role: 'assistant',
        content: aiResponse
      });

      // Store updated conversation (limit to last 20 messages)
      conversationStore.set(conversationId, conversation.slice(-20));

      console.log(`✅ Generated AI response for ${hotelData.name} chat`);

      return res.status(200).json({
        success: true,
        aiResponse: aiResponse,
        conversationId: conversationId,
        hotelName: hotelData.name
      });

    } catch (openaiError: any) {
      console.error('❌ OpenAI API error:', openaiError);

      // Generate fallback response
      const fallbackResponse = generateFallbackResponse(userMessage, hotelData);

      // Add fallback response to conversation
      conversation.push({
        role: 'assistant',
        content: fallbackResponse
      });

      conversationStore.set(conversationId, conversation.slice(-20));

      return res.status(200).json({
        success: true,
        aiResponse: fallbackResponse,
        conversationId: conversationId,
        hotelName: hotelData.name,
        fallback: true
      });
    }

  } catch (error: any) {
    console.error('❌ Hotel chat controller error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to process hotel chat request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};