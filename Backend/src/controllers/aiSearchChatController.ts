// src/controllers/aiSearchChatController.ts - Conversational AI Search Chat
import { Request, Response } from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
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
}

/**
 * AI Search Chat Controller
 * Provides conversational search refinement with hotel context awareness
 */
export const aiSearchChatController = async (req: Request, res: Response) => {
  const isSSE = req.method === 'GET';
  
  // Extract parameters based on request method
  const data: ChatRequest = isSSE 
    ? {
        message: String(req.query.message || ''),
        conversationHistory: req.query.history ? JSON.parse(String(req.query.history)) : [],
        currentSearch: String(req.query.search || ''),
        hotelContext: req.query.hotels ? JSON.parse(String(req.query.hotels)) : [],
        searchParams: req.query.params ? JSON.parse(String(req.query.params)) : {}
      }
    : req.body;

  const {
    message,
    conversationHistory = [],
    currentSearch = '',
    hotelContext = [],
    searchParams = {}
  } = data;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Setup SSE if needed
  if (isSSE) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no');
    
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    // Heartbeat
    const heartbeat = setInterval(() => {
      if (!res.destroyed) {
        res.write(': heartbeat\n\n');
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      if (!res.destroyed) {
        try { res.end(); } catch (e) { /* ignore */ }
      }
    });

    res.write('data: {"type":"connected"}\n\n');
  }

  try {
    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(currentSearch, hotelContext, searchParams);
    
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
      hasSearchParams: Object.keys(searchParams).length > 0
    });

    // Stream response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
      stream_options: { include_usage: true }
    });

    let fullResponse = '';
    let shouldRefineSearch = false;
    let refinedQuery = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      
      if (content) {
        fullResponse += content;
        
        // Send SSE update
        if (isSSE && !res.destroyed) {
          res.write(`data: ${JSON.stringify({
            type: 'content',
            content: content
          })}\n\n`);
        }
      }

      // Check for token usage
      if (chunk.usage) {
        console.log(`💰 AI Search Chat tokens: ${chunk.usage.prompt_tokens} + ${chunk.usage.completion_tokens}`);
      }
    }

    // Parse response for search refinement intent
    const refinementMatch = fullResponse.match(/\[REFINE:(.+?)\]/);
    if (refinementMatch) {
      shouldRefineSearch = true;
      refinedQuery = refinementMatch[1].trim();
      fullResponse = fullResponse.replace(/\[REFINE:.+?\]/, '').trim();
    }

    console.log('✅ AI Search Chat Complete:', {
      responseLength: fullResponse.length,
      shouldRefineSearch,
      refinedQuery
    });

    // Send completion
    if (isSSE) {
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        fullResponse,
        shouldRefineSearch,
        refinedQuery
      })}\n\n`);
      res.end();
    } else {
      return res.json({
        success: true,
        response: fullResponse,
        shouldRefineSearch,
        refinedQuery,
        conversationHistory: [
          ...conversationHistory,
          { role: 'user', content: message },
          { role: 'assistant', content: fullResponse }
        ]
      });
    }

  } catch (error) {
    console.error('❌ AI Search Chat Error:', error);
    
    if (isSSE) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })}\n\n`);
      res.end();
    } else {
      return res.status(500).json({
        error: 'AI chat failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

/**
 * Build system prompt with current context
 */
function buildSystemPrompt(
  currentSearch: string,
  hotelContext: HotelContext[],
  searchParams: ChatRequest['searchParams']
): string {
  const hasResults = hotelContext.length > 0;
  const top3Hotels = hotelContext.slice(0, 3);

  let prompt = `You are Genie, a friendly AI hotel search assistant. You help users find and refine their perfect hotel search.

**Current Context:**
${currentSearch ? `- User's search: "${currentSearch}"` : '- No active search yet'}
${searchParams?.location ? `- Location: ${searchParams.location}` : ''}
${searchParams?.checkin && searchParams?.checkout ? `- Dates: ${searchParams.checkin} to ${searchParams.checkout}` : ''}
${searchParams?.adults ? `- Guests: ${searchParams.adults} adults${searchParams.children ? `, ${searchParams.children} children` : ''}` : ''}

`;

  if (hasResults) {
    prompt += `**Current Results (${hotelContext.length} hotels found):**
`;
    
    top3Hotels.forEach((hotel, idx) => {
      prompt += `${idx + 1}. ${hotel.name}`;
      if (hotel.city && hotel.country) {
        prompt += ` in ${hotel.city}, ${hotel.country}`;
      }
      prompt += ` - $${hotel.price}/night`;
      if (hotel.aiMatchPercent) {
        prompt += ` (${hotel.aiMatchPercent}% match)`;
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
      prompt += `   ... and ${hotelContext.length - 3} more hotels\n`;
    }
  } else {
    prompt += `**No results yet** - Ready to help find the perfect hotels!\n`;
  }

  prompt += `
**Your Capabilities:**
1. Answer questions about current search results
2. Suggest refinements to improve results
3. Help adjust search parameters (price, location, dates, amenities)
4. Provide hotel recommendations from current results
5. Trigger new searches when requested

**Instructions:**
- Be conversational, friendly, and concise (2-3 sentences max)
- If user wants to refine search, end your response with [REFINE:new search query] 
- Use emojis sparingly (1-2 max per response)
- Don't apologize for limitations - focus on what you CAN do
- If asked about specific hotels, reference them by name from the results
- Suggest actionable next steps

**Example Responses:**
User: "Show me cheaper options"
You: "I'll find more budget-friendly hotels for you! [REFINE:${currentSearch} under $150 per night]"

User: "What about the Hilton?"
You: "I don't see a Hilton in your current results. The top match is ${top3Hotels[0]?.name || 'a great option'} at $${top3Hotels[0]?.price || 'competitive price'}/night. Want me to search specifically for Hilton hotels?"

User: "Any with pools?"
You: "Let me find hotels with swimming pools for you! [REFINE:${currentSearch} with pool]"

Stay helpful and natural! 🌟`;

  return prompt;
}