// src/controllers/aiSearchChatController.ts - Conversational AI Search Chat
import { Request, Response } from 'express';
import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
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

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface HotelContext {
  id: string;
  name: string;
  city?: string;
  country?: string;
  price: number;
  rating: number;
  aiMatchPercent?: number;
  topAmenities?: string[];
  distanceFromSearch?: {
    formatted: string;
    fromLocation?: string;
  };
}

interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  currentSearch?: string;
  hotelContext?: HotelContext[];
  searchParams?: {
    checkin?: string;
    checkout?: string;
    adults?: number;
    children?: number;
    location?: string;
  };
  isInitialMessage?: boolean; // Flag for initial welcome message
}

/**
 * Detect if user is asking a specific question about a hotel
 */
function detectHotelQuestion(message: string, hotelContext: HotelContext[]): { isQuestion: boolean; hotelId?: string; hotelName?: string } {
  const lowerMessage = message.toLowerCase();
  
  // Question keywords
  const questionKeywords = [
    'what', 'where', 'when', 'how', 'does', 'do', 'is', 'are', 'can', 'will',
    'tell me', 'show me', 'about', 'info', 'details', 'amenities', 'facilities',
    'location', 'nearby', 'check-in', 'checkout', 'parking', 'wifi', 'pool',
    'breakfast', 'pets', 'reviews', 'rating', 'rooms', 'price', 'cost'
  ];
  
  const hasQuestionKeyword = questionKeywords.some(keyword => lowerMessage.includes(keyword));
  
  if (!hasQuestionKeyword) {
    return { isQuestion: false };
  }
  
  // Check if asking about a specific hotel (first, top, #1, hotel name, etc)
  const hotelReferencePatterns = [
    /first|top|#1|number one|1st/i,
    /second|2nd|number two|#2/i,
    /third|3rd|number three|#3/i,
  ];
  
  // Check for hotel position references
  for (let i = 0; i < Math.min(hotelContext.length, 3); i++) {
    if (hotelReferencePatterns[i]?.test(message)) {
      return {
        isQuestion: true,
        hotelId: hotelContext[i].id,
        hotelName: hotelContext[i].name
      };
    }
  }
  
  // Check for hotel name mentions
  for (const hotel of hotelContext) {
    if (lowerMessage.includes(hotel.name.toLowerCase())) {
      return {
        isQuestion: true,
        hotelId: hotel.id,
        hotelName: hotel.name
      };
    }
  }
  
  // If it's a question but no specific hotel mentioned, assume they mean the first/top hotel
  if (hasQuestionKeyword && hotelContext.length > 0) {
    return {
      isQuestion: true,
      hotelId: hotelContext[0].id,
      hotelName: hotelContext[0].name
    };
  }
  
  return { isQuestion: false };
}

/**
 * Fetch hotel details from LiteAPI
 */
async function fetchHotelDetails(hotelId: string): Promise<any | null> {
  try {
    console.log(`🏨 Fetching hotel details for question context - Hotel ID: ${hotelId}`);
    
    const response = await liteApiInstance.get('/data/hotel', {
      params: { hotelId: hotelId },
      timeout: 8000
    });

    if (response.status !== 200) {
      throw new Error(`LiteAPI hotel details error: ${response.status}`);
    }

    console.log(`✅ Successfully fetched hotel details for question - Hotel ID: ${hotelId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.warn(`⏰ Rate limited for hotel ${hotelId} - waiting and retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const retryResponse = await liteApiInstance.get('/data/hotel', {
          params: { hotelId: hotelId },
          timeout: 8000
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
}

/**
 * Consolidate hotel info into text format for AI context
 */
function consolidateHotelInfo(hotelDetailsData: any): string {
  if (!hotelDetailsData?.data) {
    return 'Detailed hotel information not available';
  }

  const hotel = hotelDetailsData.data;
  let allInfo = '';

  // Description
  if (hotel.hotelDescription) {
    const cleanDescription = hotel.hotelDescription.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    allInfo += 'DESCRIPTION:\n' + cleanDescription + '\n\n';
  }

  // Important info
  if (hotel.hotelImportantInformation) {
    allInfo += 'IMPORTANT INFORMATION:\n' + hotel.hotelImportantInformation.trim() + '\n\n';
  }

  // Facilities
  if (hotel.hotelFacilities && hotel.hotelFacilities.length > 0) {
    allInfo += 'FACILITIES & AMENITIES:\n';
    hotel.hotelFacilities.forEach((f: string) => allInfo += `• ${f}\n`);
    allInfo += '\n';
  }

  // Policies
  if (hotel.policies && hotel.policies.length > 0) {
    allInfo += 'POLICIES:\n';
    hotel.policies.forEach((policy: any) => {
      allInfo += `${policy.name.toUpperCase()}:\n${policy.description.trim()}\n\n`;
    });
  }

  // Sentiment analysis
  if (hotel.sentiment_analysis) {
    const sentiment = hotel.sentiment_analysis;
    allInfo += 'GUEST REVIEWS:\n';
    
    if (sentiment.pros && sentiment.pros.length > 0) {
      allInfo += 'What Guests Love:\n';
      sentiment.pros.forEach((pro: string) => allInfo += `• ${pro}\n`);
      allInfo += '\n';
    }
    
    if (sentiment.cons && sentiment.cons.length > 0) {
      allInfo += 'Areas for Improvement:\n';
      sentiment.cons.forEach((con: string) => allInfo += `• ${con}\n`);
      allInfo += '\n';
    }
  }

  // Basic info
  allInfo += 'BASIC INFO:\n';
  allInfo += `Name: ${hotel.name}\n`;
  allInfo += `Address: ${hotel.address}\n`;
  allInfo += `City: ${hotel.city}, ${hotel.country}\n`;
  allInfo += `Star Rating: ${hotel.starRating} stars\n`;
  allInfo += `Guest Rating: ${hotel.rating}/10 (${hotel.reviewCount} reviews)\n`;
  
  if (hotel.checkinCheckoutTimes) {
    allInfo += `Check-in: ${hotel.checkinCheckoutTimes.checkin}\n`;
    allInfo += `Check-out: ${hotel.checkinCheckoutTimes.checkout}\n`;
  }

  return allInfo.trim();
}

/**
 * AI Search Chat Controller
 * Provides conversational search refinement with hotel context awareness
 */
export const aiSearchChatController = async (req: Request, res: Response) => {
  const data: ChatRequest = req.body;

  const {
    message,
    conversationHistory = [],
    currentSearch = '',
    hotelContext = [],
    searchParams = {},
    isInitialMessage = false
  } = data;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Check if user is asking a question about a specific hotel
    const hotelQuestion = detectHotelQuestion(message, hotelContext);
    let detailedHotelInfo = '';
    
    if (hotelQuestion.isQuestion && hotelQuestion.hotelId) {
      console.log(`🔍 Detected hotel question about: ${hotelQuestion.hotelName} (${hotelQuestion.hotelId})`);
      
      // Fetch detailed hotel information
      const hotelDetails = await fetchHotelDetails(hotelQuestion.hotelId);
      if (hotelDetails) {
        detailedHotelInfo = consolidateHotelInfo(hotelDetails);
        console.log(`✅ Loaded ${detailedHotelInfo.length} characters of hotel details for question`);
      }
    }
    
    // Build system prompt with context
    const systemPrompt = isInitialMessage 
      ? buildInitialMessagePrompt(currentSearch, hotelContext, searchParams)
      : buildSystemPrompt(currentSearch, hotelContext, searchParams, detailedHotelInfo);
    
    // Build conversation messages
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      { role: 'user', content: message }
    ];

    console.log('🤖 AI Search Chat Request:', {
      userMessage: message,
      currentSearch,
      hotelCount: hotelContext.length,
      hasSearchParams: Object.keys(searchParams).length > 0,
      isInitialMessage
    });

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: isInitialMessage ? 150 : 300,
    });

    const fullResponse = completion.choices[0]?.message?.content || "I'm here to help! What would you like to know?";
    
    console.log(`💰 AI Search Chat tokens: ${completion.usage?.prompt_tokens} + ${completion.usage?.completion_tokens}`);

    // Parse response for search refinement intent (skip for initial message)
    let shouldRefineSearch = false;
    let refinedQuery = '';
    let cleanedResponse = fullResponse;

    if (!isInitialMessage) {
      const refinementMatch = fullResponse.match(/\[REFINE:(.+?)\]/);
      if (refinementMatch) {
        shouldRefineSearch = true;
        refinedQuery = refinementMatch[1].trim();
        cleanedResponse = fullResponse.replace(/\[REFINE:.+?\]/, '').trim();
      }
    }

    console.log('✅ AI Search Chat Complete:', {
      responseLength: cleanedResponse.length,
      shouldRefineSearch,
      refinedQuery,
      isInitialMessage
    });

    return res.json({
      success: true,
      response: cleanedResponse,
      shouldRefineSearch,
      refinedQuery,
      conversationHistory: [
        ...conversationHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: cleanedResponse }
      ]
    });

  } catch (error) {
    console.error('❌ AI Search Chat Error:', error);
    
    return res.status(500).json({
      error: 'AI chat failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Build initial welcome message prompt
 */
function buildInitialMessagePrompt(
  currentSearch: string,
  hotelContext: HotelContext[],
  searchParams: ChatRequest['searchParams']
): string {
  const hasResults = hotelContext.length > 0;
  const top3Hotels = hotelContext.slice(0, 3);

  let prompt = `You are Genie, a friendly AI hotel search assistant. Generate a BRIEF (2 sentences) personalized welcome message for the user's search results.

**Current Search:** "${currentSearch}"
${searchParams?.location ? `**Location:** ${searchParams.location}` : ''}
${searchParams?.checkin && searchParams?.checkout ? `**Dates:** ${searchParams.checkin} to ${searchParams.checkout}` : ''}
${searchParams?.adults ? `**Guests:** ${searchParams.adults} adults${searchParams.children ? `, ${searchParams.children} children` : ''}` : ''}

**Results Found:** ${hotelContext.length} hotels
`;

  if (hasResults && top3Hotels.length > 0) {
    prompt += `\n**Top Hotels:**\n`;
    top3Hotels.forEach((hotel, idx) => {
      prompt += `${idx + 1}. ${hotel.name} (${hotel.city}, ${hotel.country}) - $${hotel.price}/night\n`;
    });
  }

  prompt += `
**Instructions:**
1. Acknowledge that you found their hotels
2. Add ONE personalized detail based on their search (e.g., "perfect for your family trip to Disney", "great beachfront options", "ideal for business travelers")
3. Let them know they can refine their search in a natural way
4. Keep it to 2 sentences maximum
5. Be warm and friendly but concise
6. Use 1 emoji max

**Examples:**

Search: "family friendly hotels near Disney World Orlando"
Response: "Found your hotels – perfect for your family trip to Disney! 🎢 Feel free to refine your search however you'd like."

Search: "beachfront resorts Maldives with private pools"
Response: "Found some amazing beachfront options in the Maldives! 🌊 Let me know if you want to adjust your search."

Search: "boutique hotels Paris with Eiffel Tower views"
Response: "Found your hotels with stunning Eiffel Tower views! Happy to help refine your search anytime."

Search: "budget hotels downtown Chicago for business trip"
Response: "Found great downtown options for your business trip! 💼 Let me know if you want to adjust anything."

Search: "hotels near airport Miami"
Response: "Found hotels near Miami Airport! Feel free to refine your search however you'd like."

Search: "luxury resorts Bali"
Response: "Found luxury resorts in Bali! Let me know if you want to adjust your search."

Search: "cheap hostels Barcelona city center"
Response: "Found budget options in Barcelona's city center! Happy to help refine your search."

Search: "overwater bungalows Bora Bora"
Response: "Found some stunning hotels with overwater bungalows in Bora Bora! 🏝️ Let me know if you want to adjust your search."

Now generate a similar brief, personalized message for the user's search above.`;

  return prompt;
}

/**
 * Build system prompt with current context
 */
function buildSystemPrompt(
  currentSearch: string,
  hotelContext: HotelContext[],
  searchParams: ChatRequest['searchParams'],
  detailedHotelInfo?: string
): string {
  const hasResults = hotelContext.length > 0;
  const top3Hotels = hotelContext.slice(0, 3);

  let prompt = `You are Genie, a friendly and CONCISE AI hotel search assistant. You help users find their perfect hotel through casual conversation.

**IMPORTANT RULES:**
- Keep responses SHORT (2-3 sentences maximum)
- Be casual and friendly like a helpful travel buddy
- Use emojis sparingly (1-2 max)
- Don't apologize or be overly formal
- Get straight to the point

**Current Context:**
${currentSearch ? `- Current search: "${currentSearch}"` : '- No active search yet'}
${searchParams?.location ? `- Location: ${searchParams.location}` : ''}
${searchParams?.checkin && searchParams?.checkout ? `- Dates: ${searchParams.checkin} to ${searchParams.checkout}` : ''}
${searchParams?.adults ? `- Guests: ${searchParams.adults} adults${searchParams.children ? `, ${searchParams.children} children` : ''}` : ''}
`;

  if (hasResults) {
    prompt += `\n**Current Results (${hotelContext.length} hotels found):**\n`;
    
    top3Hotels.forEach((hotel, idx) => {
      prompt += `${idx + 1}. ${hotel.name}`;
      if (hotel.city && hotel.country) {
        prompt += ` (${hotel.city}, ${hotel.country})`;
      }
      prompt += ` - $${hotel.price}/night`;
      if (hotel.aiMatchPercent) {
        prompt += ` - ${hotel.aiMatchPercent}% match`;
      }
      if (hotel.rating) {
        prompt += ` - ${hotel.rating.toFixed(1)}⭐`;
      }
      if (hotel.distanceFromSearch?.formatted && hotel.distanceFromSearch?.fromLocation) {
        prompt += ` - ${hotel.distanceFromSearch.formatted} from ${hotel.distanceFromSearch.fromLocation}`;
      }
      if (hotel.topAmenities && hotel.topAmenities.length > 0) {
        prompt += `\n   Amenities: ${hotel.topAmenities.slice(0, 3).join(', ')}`;
      }
      prompt += '\n';
    });

    if (hotelContext.length > 3) {
      prompt += `   ...and ${hotelContext.length - 3} more\n`;
    }
  } else {
    prompt += `\n**No results yet** - Ready to help find hotels!\n`;
  }

  // Add detailed hotel info if available (for specific hotel questions)
  if (detailedHotelInfo) {
    prompt += `\n**DETAILED HOTEL INFORMATION (for answering user's question):**\n${detailedHotelInfo}\n\n`;
  }

  prompt += `
**Your Capabilities:**
1. Answer questions about current hotels concisely
2. Suggest search refinements
3. Help adjust criteria (price, location, amenities, dates)
4. Give quick hotel recommendations
5. Trigger new searches when needed

**When to Refine Search:**
If user wants to modify their search, provide a brief confirmation message and end your response with [REFINE:new search query]

**Example Responses:**

User: "Show me cheaper options"
You: "Sounds good, I can find some more budget-friendly options for you! [REFINE:${currentSearch} under $120 per night]"

User: "What about the first hotel?"
You: "${top3Hotels[0]?.name || 'The top match'} looks great! It's $${top3Hotels[0]?.price || '200'}/night${top3Hotels[0]?.aiMatchPercent ? ` and is a ${top3Hotels[0].aiMatchPercent}% match for what you want` : ''}. Want more details about it?"

User: "Any with pools?"
You: "Perfect! Let me search for hotels with swimming pools. [REFINE:${currentSearch} with swimming pool]"

User: "Tell me about ${top3Hotels[0]?.name || 'hotels'}"
You: "${top3Hotels[0]?.name || 'This hotel'} is in ${top3Hotels[0]?.city || 'a great location'} for $${top3Hotels[0]?.price || '200'}/night. ${top3Hotels[0]?.topAmenities ? `Top amenities: ${top3Hotels[0].topAmenities.slice(0, 2).join(', ')}.` : 'Great amenities included!'} It's ${top3Hotels[0]?.aiMatchPercent || '85'}% match for your preferences!"

User: "What's good in the area?"
You: "${top3Hotels[0]?.name || 'The top option'} has a great location${top3Hotels[0]?.distanceFromSearch ? ` - ${top3Hotels[0].distanceFromSearch.formatted} from ${top3Hotels[0].distanceFromSearch.fromLocation}` : ''}! Want to know about nearby attractions?"

User: "I need something closer to downtown"
You: "Got it! I can search for hotels closer to downtown. [REFINE:${currentSearch} near downtown walking distance]"

User: "Can you explain the pricing?"
You: "Prices are per night. ${top3Hotels[0]?.name || 'Top option'} is $${top3Hotels[0]?.price || '200'}/night${searchParams?.checkin && searchParams?.checkout ? `. For your dates, multiply by number of nights` : ''}. Most include taxes and fees!"

User: "Show me luxury options"
You: "I'd love to find some luxury hotels for you! [REFINE:${currentSearch} luxury 4-5 star hotels]"

User: "What about breakfast included?"
You: "Let me look for hotels with complimentary breakfast! [REFINE:${currentSearch} with free breakfast]"

**Key Guidelines:**
- Maximum 2-3 sentences per response
- Be specific when referencing hotels
- Use casual language ("got it", "let me find", "looks great")
- Don't repeat information unnecessarily
- Offer one clear next step
- If user asks about specific hotel features, answer directly from the context

Stay helpful, concise, and friendly! 🌟`;

  return prompt;
}