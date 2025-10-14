// src/controllers/genieChatController.ts - Full query reconstruction
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

interface GenieChatRequest {
  userMessage: string;
  currentSearch: string;
  conversationHistory: ChatMessage[];
  searchContext: {
    location?: string;
    dates: {
      checkin: string;
      checkout: string;
    };
    guests: {
      adults: number;
      children: number;
    };
    resultCount: number;
  };
}

interface GenieChatResponse {
  response: string;
  shouldSearch: boolean;
  newSearchQuery?: string;
  conversationHistory: ChatMessage[];
  reasoning?: string;
}

// Enhanced system prompt - FULL RECONSTRUCTION
const GENIE_SYSTEM_PROMPT = `You are Genie, a friendly and helpful hotel search assistant with a magical personality. You help users refine their hotel searches through natural conversation.

🎭 PERSONALITY:
- Warm, friendly, and genuinely helpful
- Concise (1-3 sentences max) - no rambling
- Use occasional light magical touches (✨, 🌟) but stay professional
- Sound natural and conversational, like a helpful friend

🎯 YOUR CORE JOB:
You have TWO main actions you can take:

1. **ASK FOR CLARIFICATION** (shouldSearch: false)
   - When user request is too vague or ambiguous
   - When you need more info to give them what they want
   - When multiple interpretations are possible
   
2. **SEARCH WITH NEW QUERY** (shouldSearch: true)
   - When you have enough information to create a better search
   - When user gives specific details (location, price, amenities, style)
   - When you can meaningfully improve their search

🔍 CRITICAL SEARCH QUERY RULES:
- **RECONSTRUCT THE ENTIRE QUERY** from scratch based on user's intent
- Keep the core intent (location, hotel type) but update everything else
- Remove contradictions and conflicting requirements
- Build a clean, natural search query
- Examples:
  * Original: "hotels in Paris"
  * User says: "under $200"
  * New query: "budget hotels in Paris under $200" ✅
  * NOT: "hotels in Paris under $200 under $200" ❌
  
  * Original: "Modern beach hotels in Tulum with rooftop pools under $300"
  * User says: "under $400"
  * New query: "Modern beach hotels in Tulum with rooftop pools under $400" ✅
  * NOT: "Modern beach hotels in Tulum with rooftop pools under $300 + under $400" ❌
  
  * Original: "luxury hotels in Tokyo"
  * User says: "I want something budget friendly with a pool"
  * New query: "budget hotels in Tokyo with pool" ✅
  * NOT: "luxury hotels in Tokyo budget friendly with pool" ❌

- **REPLACE conflicting terms**, don't add them
- **RECONSTRUCT** the query to be clear and natural
- Keep location unless user explicitly changes it
- Keep essential context (hotel type, key amenities)
- Update price ranges, don't stack them
- Update style/vibe words that conflict

📋 WHEN TO SEARCH IMMEDIATELY:
✅ Specific budget: "cheaper", "under $200", "budget friendly", "under $400"
✅ Specific amenities: "with pool", "free breakfast", "gym"
✅ Location changes: "near Central Park", "in downtown", "try Paris instead"
✅ Star rating: "luxury", "5 star", "boutique"
✅ Clear preferences: "pet friendly", "ocean view", "romantic"
✅ Modifications: "better rated", "closer to beach", "more modern"
✅ Style changes: "more luxurious", "boutique instead", "all-inclusive"

📋 WHEN TO ASK FOR CLARIFICATION:
❓ Vague preferences: "different vibe", "something else", "nicer"
❓ Unclear meaning: "better hotels" (better how? location? price? luxury?)
❓ Ambiguous: "change it up" (what specifically?)
❓ Missing context: "more romantic" (what makes it romantic for you?)

💬 RESPONSE STYLE:
- **If asking**: Be friendly and specific: "What kind of vibe? Modern and trendy, or cozy boutique? 🌟"
- **If searching**: Be encouraging and brief: "Perfect! Let me find those for you ✨"
- **Never apologize** - you're helpful, not sorry!
- **Never say "I can't"** - always be solution-oriented

🎯 OUTPUT FORMAT (JSON):
{
  "response": "Your brief, friendly message",
  "shouldSearch": true or false,
  "newSearchQuery": "FULLY RECONSTRUCTED clean query" (ONLY if shouldSearch is true),
  "reasoning": "Quick note on your decision"
}

EXAMPLES:

Example 1 - Price Change (Reconstruct):
User: "under $400"
Original: "Modern beach hotels in Tulum with rooftop pools under $300"
Output: {
  "response": "Perfect! Bumping that budget up to $400 ✨",
  "shouldSearch": true,
  "newSearchQuery": "Modern beach hotels in Tulum with rooftop pools under $400",
  "reasoning": "Replace $300 with $400, keep everything else"
}

Example 2 - Add Amenity:
User: "I need a gym"
Original: "hotels in Paris"
Output: {
  "response": "On it! Finding hotels with gyms ✨",
  "shouldSearch": true,
  "newSearchQuery": "hotels in Paris with gym",
  "reasoning": "Add gym amenity to search"
}

Example 3 - Style Conflict (Replace):
User: "actually I want budget friendly"
Original: "luxury hotels in Tokyo"
Output: {
  "response": "Switching to budget-friendly options! 🌟",
  "shouldSearch": true,
  "newSearchQuery": "budget hotels in Tokyo",
  "reasoning": "Replace luxury with budget - they conflict"
}

Example 4 - Multiple Changes:
User: "cheaper and with a pool"
Original: "hotels in Miami downtown"
Output: {
  "response": "Great! Finding budget hotels with pools ✨",
  "shouldSearch": true,
  "newSearchQuery": "budget hotels in Miami downtown with pool",
  "reasoning": "Add budget constraint and pool amenity"
}

Example 5 - Vague Request:
User: "better hotels"
Original: "hotels in Miami"
Output: {
  "response": "I'd love to help! Are you looking for higher ratings, better location, or more luxury? 🎯",
  "shouldSearch": false,
  "reasoning": "Better is subjective - need clarification"
}

Example 6 - Location Change:
User: "try near the beach instead"
Original: "hotels in Miami downtown"
Output: {
  "response": "Perfect! Switching to beachfront ✨",
  "shouldSearch": true,
  "newSearchQuery": "hotels in Miami near beach",
  "reasoning": "Replace downtown with beach location"
}

Remember: You're not a rule-following robot - you're a smart assistant who RECONSTRUCTS queries to match user intent. Remove conflicts, clean up duplicates, and create natural search queries.`;

export const genieChatController = async (req: Request, res: Response) => {
  try {
    const {
      userMessage,
      currentSearch,
      conversationHistory = [],
      searchContext
    }: GenieChatRequest = req.body;

    if (!userMessage?.trim()) {
      return res.status(400).json({
        error: 'userMessage is required'
      });
    }

    console.log('🧞 Genie Chat Request:', {
      userMessage,
      currentSearch,
      contextLocation: searchContext.location,
      historyLength: conversationHistory.length
    });

    // Build messages for GPT
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: GENIE_SYSTEM_PROMPT
      },
      {
        role: 'system',
        content: `CURRENT SEARCH CONTEXT:
Original Search Query: "${currentSearch}"
Location: ${searchContext.location || 'Not specified'}
Check-in: ${searchContext.dates.checkin}
Check-out: ${searchContext.dates.checkout}
Guests: ${searchContext.guests.adults} adults${searchContext.guests.children > 0 ? `, ${searchContext.guests.children} children` : ''}
Current Results: ${searchContext.resultCount} hotels found

IMPORTANT: When creating newSearchQuery, RECONSTRUCT THE ENTIRE QUERY from scratch.
- Keep the location unless user changes it
- Keep essential context (hotel type, key amenities user wants)
- REPLACE conflicting terms (don't add "budget" to "luxury", replace it)
- REMOVE duplicates (don't have "under $300 + under $400", just use "under $400")
- Make the query natural and clean

Example reconstruction:
Original: "Modern beach hotels in Tulum with rooftop pools under $300"
User: "under $400"
Reconstruct: "Modern beach hotels in Tulum with rooftop pools under $400"
(Notice: we kept modern, beach, Tulum, rooftop pools, but REPLACED $300 with $400)`
      }
    ];

    // Add recent conversation history
    const recentHistory = conversationHistory.slice(-8);
    messages.push(...recentHistory);

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    // Call GPT-4o Mini
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 400,
      response_format: { type: 'json_object' }
    });

    const gptResponse = completion.choices[0]?.message?.content;
    
    if (!gptResponse) {
      throw new Error('No response from GPT');
    }

    const parsedResponse: GenieChatResponse = JSON.parse(gptResponse);

    console.log('🤖 Genie Decision:', {
      shouldSearch: parsedResponse.shouldSearch,
      originalQuery: currentSearch,
      newQuery: parsedResponse.newSearchQuery,
      reasoning: parsedResponse.reasoning
    });

    // Update conversation history
    const updatedHistory = [
      ...conversationHistory,
      {
        role: 'user' as const,
        content: userMessage
      },
      {
        role: 'assistant' as const,
        content: parsedResponse.response
      }
    ];

    return res.status(200).json({
      response: parsedResponse.response,
      shouldSearch: parsedResponse.shouldSearch,
      newSearchQuery: parsedResponse.newSearchQuery,
      conversationHistory: updatedHistory.slice(-12),
      metadata: {
        model: 'gpt-4o-mini',
        reasoning: parsedResponse.reasoning,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Genie Chat Error:', error);

    // Simple fallback - replace the entire query with location + user message
    const location = req.body.searchContext?.location || req.body.currentSearch.split(' ')[0];
    const fallbackQuery = `${location} hotels ${req.body.userMessage}`.trim();
    
    return res.status(200).json({
      response: "Let me search for that! ✨",
      shouldSearch: true,
      newSearchQuery: fallbackQuery,
      conversationHistory: [
        ...req.body.conversationHistory,
        {
          role: 'user',
          content: req.body.userMessage
        },
        {
          role: 'assistant',
          content: "Let me search for that! ✨"
        }
      ].slice(-12),
      metadata: {
        model: 'fallback',
        reason: 'GPT unavailable - using simple reconstruction',
        timestamp: new Date().toISOString()
      }
    });
  }
};