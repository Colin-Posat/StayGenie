// controllers/aiSuggestionsController.ts
import { Request, Response } from 'express';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache for frequent suggestions to reduce API calls
const suggestionCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Types
interface SuggestionRequest {
  currentSearch?: string;
  searchContext?: SearchContext;
}

interface SearchContext {
  location?: string;
  dates?: { checkin: string; checkout: string };
  guests?: { adults: number; children: number };
  previousSearches?: string[];
  budget?: { min?: number; max?: number; currency?: string };
  amenities?: string[];
  userPreferences?: {
    propertyTypes?: string[];
    previousBookings?: string[];
    travelPurpose?: 'business' | 'leisure' | 'family' | 'romantic' | 'group';
  };
}

interface FormattedSuggestion {
  id: string;
  text: string;
  category: string;
  priority: string;
  impact?: string;
}

// Smart add-on patterns - these should ENHANCE the existing search, not replace it
const SMART_ADDON_PATTERNS = {
  price: {
    // Price filters based on location - Aspen is luxury, rural areas cheaper
    luxury_destinations: ['under $300', 'under $500', 'under $800', '$500-1000'],
    standard_destinations: ['under $150', 'under $250', 'under $400', '$200-500'],
    budget_destinations: ['under $100', 'under $200', 'budget friendly']
  },
  amenities: ['free breakfast', 'pool & spa', 'free parking', 'pet friendly', 'fitness center', 'hot tub', 'ski storage'],
  ratings: ['4+ stars', '5 star only', 'highly rated', 'guest favorite'],
  booking: ['free cancellation', 'book now pay later', 'instant booking', 'flexible dates'],
  room_features: ['mountain view', 'fireplace', 'balcony', 'kitchenette', 'jacuzzi tub'],
  experience: ['romantic getaway', 'family friendly', 'adults only', 'pet welcome']
};

// Location-based pricing intelligence
const LOCATION_PRICE_MAPPING = {
  // Luxury ski destinations
  'aspen': 'luxury_destinations',
  'vail': 'luxury_destinations', 
  'jackson hole': 'luxury_destinations',
  'park city': 'luxury_destinations',
  'whistler': 'luxury_destinations',
  
  // Standard destinations  
  'denver': 'standard_destinations',
  'seattle': 'standard_destinations',
  'portland': 'standard_destinations',
  'austin': 'standard_destinations',
  
  // Default to standard
  'default': 'standard_destinations'
};

/**
 * Generate AI suggestions with caching and fallback optimization
 */
export const generateSuggestions = async (req: Request<{}, {}, SuggestionRequest>, res: Response) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('\n' + '='.repeat(80));
  console.log(`🤖 [${requestId}] AI SUGGESTIONS REQUEST STARTED`);
  console.log('📥 Raw request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { currentSearch = '', searchContext } = req.body;
    
    console.log(`📝 [${requestId}] Extracted data:`);
    console.log(`  - currentSearch: "${currentSearch}"`);
    console.log(`  - searchContext:`, JSON.stringify(searchContext, null, 2));
    
    // Validate inputs
    if (typeof currentSearch !== 'string') {
      console.error(`❌ [${requestId}] Invalid currentSearch type:`, typeof currentSearch);
      return res.status(400).json({
        success: false,
        error: 'currentSearch must be a string',
        received: typeof currentSearch
      });
    }
    
    // Enhanced analysis for add-on suggestions
    console.log(`🔍 [${requestId}] Starting search analysis...`);
    const analysis = analyzeSearchForAddOns(currentSearch, searchContext);
    console.log(`📊 [${requestId}] Analysis complete:`, JSON.stringify(analysis, null, 2));
    
    // Check cache first
    const cacheKey = createCacheKey(currentSearch, searchContext);
    console.log(`🗃️  [${requestId}] Cache key generated: ${cacheKey}`);
    
    const cached = getCachedSuggestions(cacheKey);
    
    if (cached) {
      const responseTime = Date.now() - startTime;
      console.log(`⚡ [${requestId}] Cache hit! Returning cached suggestions (${responseTime}ms)`);
      
      return res.json({
        ...cached,
        metadata: { ...cached.metadata, responseTime, cached: true, requestId }
      });
    }
    
    console.log(`🔄 [${requestId}] Cache miss, generating new suggestions...`);

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.warn(`⚠️ [${requestId}] OpenAI API key not found, using fallback only`);
      const fallbackSuggestions = generateSmartAddOnFallback(analysis);
      
      const response = {
        success: true,
        suggestions: fallbackSuggestions,
        searchAnalysis: {
          completeness: analysis.score,
          missingElements: analysis.missing,
          searchIntent: analysis.intent,
          detectedLocation: analysis.detectedLocation,
          hasPricing: analysis.hasPricing
        },
        metadata: {
          responseTime: Date.now() - startTime,
          model: 'fallback-no-api-key',
          totalSuggestions: fallbackSuggestions.length,
          cached: false,
          requestId
        }
      };
      
      console.log(`📤 [${requestId}] Fallback response:`, JSON.stringify(response, null, 2));
      return res.json(response);
    }

    // Generate suggestions with proper timeout handling
    console.log(`🧠 [${requestId}] Attempting AI generation...`);
    
    try {
      // Try AI first with a reasonable timeout
      const suggestions = await Promise.race([
        generateAIAddOnSuggestions(currentSearch, searchContext, analysis, requestId),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('AI generation timeout'));
          }, 5000); // 5s timeout
        })
      ]);
      
      console.log(`✅ [${requestId}] AI generation successful`);
      
      const response = {
        success: true,
        suggestions,
        searchAnalysis: {
          completeness: analysis.score,
          missingElements: analysis.missing,
          searchIntent: analysis.intent,
          detectedLocation: analysis.detectedLocation,
          hasPricing: analysis.hasPricing
        },
        metadata: {
          responseTime: Date.now() - startTime,
          model: 'gpt-4o-mini',
          totalSuggestions: suggestions.length,
          cached: false,
          requestId
        }
      };

      // Cache successful response
      console.log(`💾 [${requestId}] Caching response...`);
      setCachedSuggestions(cacheKey, response);
      
      console.log(`📤 [${requestId}] Final response:`, JSON.stringify(response, null, 2));
      console.log(`✅ [${requestId}] Generated ${suggestions.length} suggestions (${Date.now() - startTime}ms)`);
      
      return res.json(response);
      
    } catch (aiError: any) {
      console.warn(`⚠️ [${requestId}] AI generation failed, using smart fallback:`, aiError.message);
      
      // Use smart fallback when AI fails
      const fallbackSuggestions = generateSmartAddOnFallback(analysis);
      
      const response = {
        success: true,
        suggestions: fallbackSuggestions,
        searchAnalysis: {
          completeness: analysis.score,
          missingElements: analysis.missing,
          searchIntent: analysis.intent,
          detectedLocation: analysis.detectedLocation,
          hasPricing: analysis.hasPricing
        },
        metadata: {
          responseTime: Date.now() - startTime,
          model: 'fallback-timeout',
          totalSuggestions: fallbackSuggestions.length,
          cached: false,
          requestId,
          aiError: aiError.message
        }
      };

      console.log(`📤 [${requestId}] Fallback response:`, JSON.stringify(response, null, 2));
      return res.json(response);
    }

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] AI Error (${responseTime}ms):`, error);
    console.error(`🔍 [${requestId}] Error stack:`, error.stack);
    
    try {
      const fallback = generateSmartAddOnFallback(analyzeSearchForAddOns(req.body.currentSearch, req.body.searchContext));
      console.log(`🔄 [${requestId}] Generated fallback suggestions:`, JSON.stringify(fallback, null, 2));
      
      const errorResponse = {
        success: true,
        suggestions: fallback,
        searchAnalysis: { 
          completeness: 0.3, 
          missingElements: ['AI unavailable'], 
          searchIntent: 'general',
          detectedLocation: null,
          hasPricing: false
        },
        metadata: { 
          responseTime, 
          model: 'fallback-error', 
          totalSuggestions: fallback.length,
          error: error.message,
          requestId
        }
      };
      
      console.log(`📤 [${requestId}] Error fallback response:`, JSON.stringify(errorResponse, null, 2));
      res.json(errorResponse);
      
    } catch (fallbackError: any) {
      console.error(`💥 [${requestId}] Fallback generation failed:`, fallbackError);
      res.status(500).json({
        success: false,
        error: 'AI suggestions unavailable',
        details: error.message,
        fallbackError: fallbackError.message,
        requestId
      });
    }
  } finally {
    console.log(`🏁 [${requestId}] AI SUGGESTIONS REQUEST COMPLETED (${Date.now() - startTime}ms)`);
    console.log('='.repeat(80) + '\n');
  }
};

/**
 * Enhanced search analysis specifically for add-on suggestions
 */
function analyzeSearchForAddOns(search = '', context?: SearchContext) {
  console.log(`🔍 Analyzing search for add-ons: "${search}" with context:`, JSON.stringify(context, null, 2));
  
  const query = search.toLowerCase();
  const missing: string[] = [];
  let score = 0;

  // Detect location for pricing intelligence
  const detectedLocation = detectLocation(query, context);
  console.log(`📍 Detected location: ${detectedLocation}`);

  // Check what's already mentioned to avoid redundant suggestions
  const alreadyHas = {
    location: !!(context?.location || detectedLocation || /\b(in|near|downtown|city|beach|airport)\b/.test(query)),
    dates: !!(context?.dates?.checkin || /\b(next|this|weekend|tonight|tomorrow)\b/.test(query)),
    budget: !!(context?.budget || /\$|budget|cheap|luxury|expensive|under|above|price/.test(query)),
    guests: !!(context?.guests?.adults || /\b(people|guest|adult|family|couple|solo)\b/.test(query)),
    amenities: !!(context?.amenities?.length || /wifi|breakfast|pool|parking|gym|spa|hot.?tub/.test(query)),
    rating: !!/star|rating|rated|review/.test(query),
    cancellation: !!/cancel|flexible|refund/.test(query),
    view: !!/view|mountain|ocean|city|garden/.test(query),
    experience: !!/romantic|business|luxury|boutique|family/.test(query)
  };

  console.log(`✅ Already has:`, alreadyHas);

  // Score based on what's missing (what we can suggest as add-ons)
  if (!alreadyHas.budget) { missing.push('pricing'); score += 30; } // Pricing is most important
  if (!alreadyHas.amenities) { missing.push('amenities'); score += 25; }
  if (!alreadyHas.rating) { missing.push('rating'); score += 20; }
  if (!alreadyHas.cancellation) { missing.push('booking_flexibility'); score += 15; }
  if (!alreadyHas.view) { missing.push('room_features'); score += 10; }

  // Intent detection
  const intent = 
    context?.userPreferences?.travelPurpose ||
    (query.includes('business') ? 'business' :
     query.includes('family') ? 'family' :
     query.includes('romantic') ? 'romantic' : 
     query.includes('ski') ? 'ski_vacation' : 'leisure');

  const analysis = { 
    score, 
    missing, 
    intent, 
    alreadyHas, 
    detectedLocation,
    hasPricing: alreadyHas.budget
  };
  console.log(`📊 Add-on analysis result:`, analysis);
  
  return analysis;
}

/**
 * Detect location from search query for pricing intelligence
 */
function detectLocation(query: string, context?: SearchContext): string | null {
  if (context?.location) return context.location.toLowerCase();
  
  // Common location patterns
  const locationPatterns = Object.keys(LOCATION_PRICE_MAPPING);
  for (const location of locationPatterns) {
    if (location !== 'default' && query.includes(location)) {
      return location;
    }
  }
  
  return null;
}

/**
 * Get appropriate price suggestions based on detected location
 */
function getPriceSuggestionsForLocation(location: keyof typeof LOCATION_PRICE_MAPPING | null): string[] {
  const locationKey = location && LOCATION_PRICE_MAPPING[location] 
    ? LOCATION_PRICE_MAPPING[location] 
    : LOCATION_PRICE_MAPPING.default;
    
  return SMART_ADDON_PATTERNS.price[locationKey as keyof typeof SMART_ADDON_PATTERNS.price];
}

/**
 * Optimized AI add-on suggestion generation
 */
async function generateAIAddOnSuggestions(
  search: string, 
  context?: SearchContext, 
  analysis?: any,
  requestId?: string
): Promise<FormattedSuggestion[]> {
  
  console.log(`🧠 [${requestId}] Starting OpenAI add-on generation...`);
  
  const prompt = `You are generating FILTER ADD-ONS for this hotel search: "${search}"

Current search already includes: ${Object.entries(analysis?.alreadyHas || {})
  .filter(([_, has]) => has)
  .map(([key, _]) => key)
  .join(', ')}

Generate 6 FILTER suggestions that can be ADDED to enhance this search. Focus on:
${analysis?.missing?.includes('pricing') ? '- Price filters (PRIORITY #1 - user needs pricing!)' : ''}
${analysis?.missing?.includes('amenities') ? '- Helpful amenities' : ''}
${analysis?.missing?.includes('rating') ? '- Quality/rating filters' : ''}
${analysis?.missing?.includes('booking_flexibility') ? '- Booking flexibility' : ''}
${analysis?.missing?.includes('room_features') ? '- Room features/views' : ''}

Location detected: ${analysis?.detectedLocation || 'unknown'}
Intent: ${analysis?.intent || 'general'}

Return JSON: {"suggestions": [{"text": "filter text", "category": "price|amenities|quality|booking|features", "priority": "high|medium|low"}]}

Make suggestions SHORT (2-4 words) and ACTIONABLE as filters.`;

  console.log(`📝 [${requestId}] OpenAI prompt:`, prompt);

  try {
    console.log(`🔄 [${requestId}] Calling OpenAI API...`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system", 
          content: "Generate hotel search filter add-ons. Be concise (2-4 words each). Focus on what's missing. Return valid JSON with 'suggestions' array only."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content;
    console.log(`📝 [${requestId}] OpenAI content:`, responseContent);
    
    if (!responseContent) {
      throw new Error('Empty response from OpenAI');
    }

    const response = JSON.parse(responseContent);
    const suggestions = response.suggestions || response;
    
    if (!Array.isArray(suggestions)) {
      throw new Error('Invalid format - suggestions not an array');
    }
    
    const formattedSuggestions = suggestions
      .filter(s => s && s.text && typeof s.text === 'string' && s.text.length > 0)
      .slice(0, 6)
      .map((s, i) => ({
        id: `ai-addon-${i}-${Date.now()}`,
        text: s.text.trim(),
        category: s.category || 'general',
        priority: s.priority || 'medium',
        impact: s.impact
      }));
      
    console.log(`✅ [${requestId}] Formatted add-on suggestions:`, JSON.stringify(formattedSuggestions, null, 2));
    return formattedSuggestions;
      
  } catch (error: any) {
    console.error(`❌ [${requestId}] OpenAI generation failed:`, error);
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
}

/**
 * Smart fallback for add-on suggestions
 */
function generateSmartAddOnFallback(analysis: any): FormattedSuggestion[] {
  console.log(`🔄 Generating smart add-on fallback for analysis:`, analysis);
  
  const suggestions: FormattedSuggestion[] = [];
  let id = 0;

  // Priority 1: Price filters (if not already mentioned)
  if (analysis.missing?.includes('pricing')) {
    const priceOptions = getPriceSuggestionsForLocation(analysis.detectedLocation);
    const priceFilter = priceOptions[Math.floor(Math.random() * priceOptions.length)];
    suggestions.push({
      id: `addon-price-${id++}`,
      text: priceFilter,
      category: 'price',
      priority: 'high'
    });
    console.log(`💰 Added price filter: ${priceFilter}`);
  }

  // Priority 2: Amenities (if space and not mentioned)
  if (analysis.missing?.includes('amenities') && suggestions.length < 6) {
    const amenity = SMART_ADDON_PATTERNS.amenities[Math.floor(Math.random() * SMART_ADDON_PATTERNS.amenities.length)];
    suggestions.push({
      id: `addon-amenity-${id++}`,
      text: amenity,
      category: 'amenities',
      priority: 'medium'
    });
    console.log(`🏨 Added amenity: ${amenity}`);
  }

  // Priority 3: Quality/Rating
  if (analysis.missing?.includes('rating') && suggestions.length < 6) {
    const rating = SMART_ADDON_PATTERNS.ratings[Math.floor(Math.random() * SMART_ADDON_PATTERNS.ratings.length)];
    suggestions.push({
      id: `addon-rating-${id++}`,
      text: rating,
      category: 'quality',
      priority: 'medium'
    });
    console.log(`⭐ Added rating filter: ${rating}`);
  }

  // Fill remaining slots with diverse options
  const remainingCategories = [
    { items: SMART_ADDON_PATTERNS.booking, category: 'booking', priority: 'medium' },
    { items: SMART_ADDON_PATTERNS.room_features, category: 'features', priority: 'low' },
    { items: SMART_ADDON_PATTERNS.experience, category: 'experience', priority: 'low' }
  ];

  for (const { items, category, priority } of remainingCategories) {
    if (suggestions.length >= 6) break;
    
    const item = items[Math.floor(Math.random() * items.length)];
    suggestions.push({
      id: `addon-${category}-${id++}`,
      text: item,
      category,
      priority
    });
    console.log(`➕ Added ${category}: ${item}`);
  }

  // Ensure we have at least one price filter if none was added
  if (!suggestions.some(s => s.category === 'price')) {
    const priceOptions = getPriceSuggestionsForLocation(analysis.detectedLocation);
    const priceFilter = priceOptions[0]; // Take first option
    
    suggestions.unshift({
      id: `addon-price-fallback-${id++}`,
      text: priceFilter,
      category: 'price', 
      priority: 'high'
    });
    console.log(`💰 Added fallback price filter: ${priceFilter}`);
  }

  const finalSuggestions = suggestions.slice(0, 6);
  console.log(`✅ Generated ${finalSuggestions.length} add-on fallback suggestions:`, finalSuggestions);
  return finalSuggestions;
}

/**
 * Caching utilities
 */
function createCacheKey(search: string, context?: SearchContext): string {
  const key = {
    s: search?.toLowerCase() || '',
    l: context?.location || '',
    d: context?.dates?.checkin || '',
    g: context?.guests?.adults || 0,
    b: context?.budget?.max || 0,
    a: context?.amenities?.length || 0
  };
  const cacheKey = Buffer.from(JSON.stringify(key)).toString('base64').slice(0, 20);
  console.log(`🔑 Cache key created:`, cacheKey, 'from:', key);
  return cacheKey;
}

function getCachedSuggestions(key: string) {
  const cached = suggestionCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`💾 Cache hit for key: ${key}`);
    return cached.data;
  }
  if (cached) {
    console.log(`🗑️ Cache expired for key: ${key}`);
    suggestionCache.delete(key);
  } else {
    console.log(`❌ Cache miss for key: ${key}`);
  }
  return null;
}

function setCachedSuggestions(key: string, data: any) {
  // Limit cache size
  if (suggestionCache.size > 100) {
    const firstKey = suggestionCache.keys().next().value;
    if (typeof firstKey === 'string') {
      suggestionCache.delete(firstKey);
      console.log(`🗑️ Removed oldest cache entry: ${firstKey}`);
    }
  }
  suggestionCache.set(key, { data, timestamp: Date.now() });
  console.log(`💾 Cached suggestions for key: ${key}`);
}

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, value] of suggestionCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      suggestionCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
  }
}, CACHE_TTL);