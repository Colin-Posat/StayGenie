// src/controllers/conversationalRefineController.ts
import { Request, Response } from 'express';

interface ChatMessage {
  id: string;
  type: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

interface RefineRequest {
  conversationId: string;
  userMessage: string;
  currentSearch: string;
  searchContext?: {
    location?: string;
    dates?: {
      checkin: string;
      checkout: string;
    };
    guests?: {
      adults: number;
      children: number;
    };
    budget?: {
      min?: number | null;
      max?: number | null;
      currency?: string;
    };
    resultCount?: number;
  };
  chatHistory?: ChatMessage[];
}

interface RefineResponse {
  success: boolean;
  aiResponse: string;
  refinedSearch?: string;
  suggestions?: string[];
  conversationId: string;
  error?: string;
}

// In-memory conversation storage (in production, use Redis or database)
const conversationMemory = new Map<string, {
  history: ChatMessage[];
  context: any;
  lastActivity: Date;
}>();

// Cleanup old conversations (older than 1 hour)
const cleanupConversations = () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [id, data] of conversationMemory.entries()) {
    if (data.lastActivity < oneHourAgo) {
      conversationMemory.delete(id);
    }
  }
};

// Run cleanup every 15 minutes
setInterval(cleanupConversations, 15 * 60 * 1000);

export const conversationalRefineController = async (req: Request, res: Response) => {
  try {
    const {
      conversationId,
      userMessage,
      currentSearch,
      searchContext,
      chatHistory = []
    }: RefineRequest = req.body;

    console.log('🤖 Conversational Refine Request:', {
      conversationId,
      userMessage,
      currentSearch: currentSearch?.substring(0, 100),
      resultCount: searchContext?.resultCount
    });

    // Validate required fields
    if (!conversationId || !userMessage || !currentSearch) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: conversationId, userMessage, currentSearch'
      });
    }

    // Store/update conversation context
    conversationMemory.set(conversationId, {
      history: chatHistory,
      context: searchContext,
      lastActivity: new Date()
    });

    // Try to get AI response using OpenAI (if available)
    let aiResponse: string;
    let refinedSearch: string | undefined;
    let suggestions: string[] = [];

    try {
      const aiResult = await getAIRefinementResponse(
        userMessage,
        currentSearch,
        searchContext,
        chatHistory
      );
      
      aiResponse = aiResult.response;
      refinedSearch = aiResult.refinedSearch;
      suggestions = aiResult.suggestions;
      
    } catch (aiError) {
      console.warn('⚠️ AI service unavailable, using fallback logic:', aiError);
      
      // Fallback to rule-based processing
      const fallbackResult = processFallbackRefinement(
        userMessage,
        currentSearch,
        searchContext
      );
      
      aiResponse = fallbackResult.response;
      refinedSearch = fallbackResult.refinedSearch;
      suggestions = fallbackResult.suggestions;
    }

    const response: RefineResponse = {
      success: true,
      aiResponse,
      refinedSearch,
      suggestions,
      conversationId
    };

    console.log('✅ Conversational refine response:', {
      aiResponse: aiResponse.substring(0, 100),
      refinedSearch,
      suggestionsCount: suggestions.length
    });

    res.json(response);

  } catch (error: any) {
    console.error('❌ Conversational refine error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process conversational refinement',
      conversationId: req.body.conversationId
    });
  }
};

// AI-powered refinement using OpenAI
const getAIRefinementResponse = async (
  userMessage: string,
  currentSearch: string,
  searchContext: any,
  chatHistory: ChatMessage[]
): Promise<{
  response: string;
  refinedSearch?: string;
  suggestions: string[];
}> => {
  
  // Check if OpenAI is configured
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI not configured');
  }

  const contextInfo = buildContextString(searchContext);
  const historyContext = chatHistory.slice(-4).map(msg => 
    `${msg.type}: ${msg.text}`
  ).join('\n');

  const systemPrompt = `You are a helpful hotel search assistant. Your job is to help users refine their hotel search queries through conversation.

IMPORTANT RULES:
1. Keep responses SHORT and conversational (1-2 sentences max)
2. If the user's input should modify the search query, provide a "refinedSearch" 
3. Be helpful but concise - don't over-explain
4. Suggest only 1-2 refinements at a time
5. Focus on practical refinements: price, dates, amenities, location specifics
6. Always respond as if the user is directly telling you what they want
7. Use encouraging language like "Got it!", "Perfect!", "Great choice!"

Current search: "${currentSearch}"
${contextInfo}

Recent conversation:
${historyContext}

User's new input: "${userMessage}"

Respond with a JSON object:
{
  "response": "Your conversational response (short!)",
  "refinedSearch": "Updated search query (only if user input should change it, otherwise null)",
  "suggestions": ["suggestion1", "suggestion2"] // max 2 suggestions for next refinements
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse AI response
    const parsed = JSON.parse(aiContent);
    
    return {
      response: parsed.response || "I understand. What else would you like to refine?",
      refinedSearch: parsed.refinedSearch || undefined,
      suggestions: parsed.suggestions || []
    };

  } catch (parseError) {
    console.warn('⚠️ Failed to parse AI response, using fallback');
    throw parseError;
  }
};

// Fallback rule-based processing
const processFallbackRefinement = (
  userMessage: string,
  currentSearch: string,
  searchContext: any
): {
  response: string;
  refinedSearch?: string;
  suggestions: string[];
} => {
  
  const message = userMessage.toLowerCase().trim();
  let refinedSearch: string | undefined;
  let response: string = "I understand. Tell me what else you'd like to refine!"; // Default response
  let suggestions: string[] = ['Add price range', 'Add amenities']; // Default suggestions

  // Price-related refinements
  if (message.includes('$') || message.includes('budget') || message.includes('price')) {
    const priceMatch = message.match(/\$?(\d+)/);
    if (priceMatch) {
      const price = priceMatch[1];
      
      if (message.includes('under') || message.includes('less than') || message.includes('below')) {
        refinedSearch = `${currentSearch} under ${price}`;
        response = `Got it! I've updated your search to include hotels under ${price}. Tell me what else you'd like - maybe dates or amenities?`;
        suggestions = ['Add check-in dates', 'Include free breakfast'];
        
      } else if (message.includes('over') || message.includes('more than') || message.includes('above')) {
        refinedSearch = `${currentSearch} over ${price}`;
        response = `Perfect! Now looking for hotels over ${price}. Tell me what other features you want!`;
        suggestions = ['Add free WiFi', 'Include parking'];
        
      } else if (message.includes('between') || message.includes('-')) {
        const secondPriceMatch = message.match(/\$?(\d+)[\s-]+\$?(\d+)/);
        if (secondPriceMatch) {
          const minPrice = secondPriceMatch[1];
          const maxPrice = secondPriceMatch[2];
          refinedSearch = `${currentSearch} $${minPrice}-$${maxPrice}`;
          response = `Great! Searching for hotels between $${minPrice}-$${maxPrice}. What else can I help with?`;
        } else {
          refinedSearch = `${currentSearch} around $${price}`;
          response = `Noted! Looking for hotels around $${price}. Want to specify dates or add amenities?`;
        }
        suggestions = ['Add check-in dates', 'Include pool access'];
      }
    } else {
      response = "I'd love to help with pricing! Tell me something like 'under $200' or 'between $150-300' and I'll add it to your search.";
      suggestions = ['Under $200', 'Between $150-300'];
    }
  }
  
  // Date-related refinements
  else if (message.includes('date') || message.includes('check') || message.includes('stay')) {
    // Look for date patterns
    const datePatterns = [
      /(\w+\s+\d+)/g, // "March 15", "Dec 25"
      /(\d+\/\d+)/g,  // "3/15", "12/25"
      /(\d+\-\d+)/g   // "15-18"
    ];
    
    let foundDates = false;
    for (const pattern of datePatterns) {
      const matches = message.match(pattern);
      if (matches && matches.length >= 1) {
        if (matches.length >= 2) {
          refinedSearch = `${currentSearch} ${matches[0]} to ${matches[1]}`;
          response = `Perfect! Added dates ${matches[0]} to ${matches[1]}. Want to set a budget or add amenities?`;
        } else {
          refinedSearch = `${currentSearch} starting ${matches[0]}`;
          response = `Got the check-in date! When are you checking out?`;
        }
        foundDates = true;
        break;
      }
    }
    
    if (!foundDates) {
      response = "I can help with dates! Try 'March 15 to March 18' or 'check in 3/15 check out 3/18'.";
      suggestions = ['March 15-18', 'This weekend'];
    } else {
      suggestions = ['Add budget range', 'Include free breakfast'];
    }
  }
  
  // Amenity-related refinements
  else if (message.includes('breakfast')) {
    refinedSearch = `${currentSearch} with free breakfast`;
    response = "Excellent! I've added free breakfast to your search. Want to tell me about other amenities like WiFi or parking?";
    suggestions = ['Add free WiFi', 'Add parking'];
    
  } else if (message.includes('wifi') || message.includes('internet')) {
    refinedSearch = `${currentSearch} with free WiFi`;
    response = "Great! Free WiFi added to your search. Tell me what else you need - breakfast, pool, or something else?";
    suggestions = ['Add breakfast', 'Add pool access'];
    
  } else if (message.includes('pool')) {
    if (message.includes('indoor')) {
      refinedSearch = `${currentSearch} with indoor pool`;
      response = "Indoor pool added! Looking for anything else?";
    } else if (message.includes('outdoor')) {
      refinedSearch = `${currentSearch} with outdoor pool`;
      response = "Outdoor pool added! Want to specify other amenities?";
    } else {
      refinedSearch = `${currentSearch} with pool`;
      response = "Pool access added! Need any other amenities?";
    }
    suggestions = ['Add spa services', 'Add fitness center'];
    
  } else if (message.includes('parking')) {
    refinedSearch = `${currentSearch} with free parking`;
    response = "Perfect! I've added free parking. Tell me what else would make your stay better!";
    suggestions = ['Add breakfast', 'Set price range'];
    
  } else if (message.includes('spa')) {
    refinedSearch = `${currentSearch} with spa`;
    response = "Spa services added! Want to include other luxury amenities?";
    suggestions = ['Add room service', 'Add concierge'];
    
  } else if (message.includes('gym') || message.includes('fitness')) {
    refinedSearch = `${currentSearch} with fitness center`;
    response = "Fitness center added! Any other health and wellness amenities?";
    suggestions = ['Add spa services', 'Add pool access'];
    
  } else if (message.includes('cancel')) {
    refinedSearch = `${currentSearch} with free cancellation`;
    response = "Smart choice! I've added free cancellation for flexibility. What else can I help you refine?";
    suggestions = ['Add breakfast', 'Set budget'];
  }
  
  // Location refinements
  else if (message.includes('downtown') || message.includes('city center')) {
    refinedSearch = `${currentSearch} in city center`;
    response = "City center location added! Want walkable areas or near public transport?";
    suggestions = ['Near metro station', 'Walking distance restaurants'];
    
  } else if (message.includes('beach') || message.includes('ocean')) {
    if (message.includes('view')) {
      refinedSearch = `${currentSearch} with ocean view`;
      response = "Ocean view added! Want beachfront access too?";
    } else {
      refinedSearch = `${currentSearch} near beach`;
      response = "Beach location noted! Want ocean views or beachfront access?";
    }
    suggestions = ['Ocean view rooms', 'Beachfront property'];
    
  } else if (message.includes('quiet') || message.includes('peaceful')) {
    refinedSearch = `${currentSearch} in quiet area`;
    response = "Quiet location added! Looking for any specific amenities for a relaxing stay?";
    suggestions = ['Add spa services', 'Add room service'];
    
  } else if (message.includes('walkable') || message.includes('walking')) {
    refinedSearch = `${currentSearch} in walkable area`;
    response = "Walkable area specified! Want restaurants and shops within walking distance?";
    suggestions = ['Near restaurants', 'Near shopping'];
  }
  
  // Guest-related refinements
  else if (message.includes('family') || message.includes('kids') || message.includes('children')) {
    refinedSearch = `${currentSearch} family-friendly`;
    response = "Family-friendly options added! Want a pool or connecting rooms?";
    suggestions = ['Add pool access', 'Add connecting rooms'];
    
  } else if (message.includes('business') || message.includes('work')) {
    refinedSearch = `${currentSearch} business-friendly`;
    response = "Business amenities noted! Want meeting rooms or business center access?";
    suggestions = ['Add business center', 'Add meeting rooms'];
    
  } else if (message.includes('romantic') || message.includes('couple')) {
    refinedSearch = `${currentSearch} romantic`;
    response = "Perfect for a romantic getaway! Want spa services or room service?";
    suggestions = ['Add spa services', 'Add room service'];
  }
  
  // Rating/quality refinements
  else if (message.includes('star') || message.includes('rating')) {
    const starMatch = message.match(/(\d+)\s*star/);
    if (starMatch) {
      const stars = starMatch[1];
      refinedSearch = `${currentSearch} ${stars}+ star rating`;
      response = `${stars}+ star hotels added! Want luxury amenities to match?`;
      suggestions = ['Add spa services', 'Add concierge'];
    } else {
      refinedSearch = `${currentSearch} highly rated`;
      response = "High ratings specified! Looking for any particular amenities?";
      suggestions = ['Add breakfast', 'Add pool'];
    }
    
  } else if (message.includes('luxury') || message.includes('upscale')) {
    refinedSearch = `${currentSearch} luxury`;
    response = "Luxury accommodations noted! Want spa, concierge, or room service?";
    suggestions = ['Add spa services', 'Add concierge service'];
    
  } else if (message.includes('budget') || message.includes('cheap') || message.includes('affordable')) {
    refinedSearch = `${currentSearch} budget-friendly`;
    response = "Budget-friendly options added! Want to set a specific price range?";
    suggestions = ['Under $100', 'Under $150'];
  }
  
  // Generic additions
  else {
    // Try to add the user input directly if it seems like a valid refinement
    const cleanInput = userMessage.trim();
    if (cleanInput.length > 2 && cleanInput.length < 50) {
      refinedSearch = `${currentSearch} ${cleanInput}`;
      response = "I've added that to your search! Want to refine it further?";
      suggestions = ['Add price range', 'Add amenities'];
    } else {
      response = "I can help you refine your search! Tell me what you want - price ranges (like 'under $200'), dates, or amenities (like 'with pool' or 'free breakfast').";
      suggestions = ['Under $200', 'With free breakfast', 'Add dates'];
    }
  }

  return {
    response,
    refinedSearch,
    suggestions
  };
};

// Helper function to build context string
const buildContextString = (searchContext: any): string => {
  if (!searchContext) return '';
  
  const parts = [];
  
  if (searchContext.resultCount) {
    parts.push(`Found ${searchContext.resultCount} results currently`);
  }
  
  if (searchContext.location) {
    parts.push(`Location: ${searchContext.location}`);
  }
  
  if (searchContext.dates?.checkin && searchContext.dates?.checkout) {
    parts.push(`Dates: ${searchContext.dates.checkin} to ${searchContext.dates.checkout}`);
  }
  
  if (searchContext.guests) {
    const guests = searchContext.guests;
    parts.push(`Guests: ${guests.adults} adults${guests.children ? `, ${guests.children} children` : ''}`);
  }
  
  if (searchContext.budget?.min || searchContext.budget?.max) {
    const budget = searchContext.budget;
    if (budget.min && budget.max) {
      parts.push(`Budget: ${budget.min}-${budget.max}`);
    } else if (budget.min) {
      parts.push(`Budget: over ${budget.min}`);
    } else if (budget.max) {
      parts.push(`Budget: under ${budget.max}`);
    }
  }
  
  return parts.length > 0 ? `Context: ${parts.join(', ')}` : '';
};