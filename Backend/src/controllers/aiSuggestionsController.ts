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

// Smart fallback patterns for instant suggestions
const SMART_PATTERNS = {
  location: ['near downtown', 'city center', 'beachfront', 'airport area'],
  dates: ['this weekend', 'next weekend', 'next week', 'flexible dates'],
  budget: ['under $100', 'under $200', '$200-400', 'luxury options'],
  guests: ['for 2 adults', 'family friendly', 'solo traveler', 'group booking'],
  amenities: ['free breakfast', 'pool & spa', 'free parking', 'pet friendly', 'fitness center'],
  experience: ['4+ stars', 'boutique hotels', 'business hotels', 'romantic getaway']
};

/**
 * Generate AI suggestions with caching and fallback optimization
 */
export const generateSuggestions = async (req: Request<{}, {}, SuggestionRequest>, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { currentSearch = '', searchContext } = req.body;
    
    // Quick analysis for immediate response
    const analysis = analyzeSearch(currentSearch, searchContext);
    
    // Check cache first
    const cacheKey = createCacheKey(currentSearch, searchContext);
    const cached = getCachedSuggestions(cacheKey);
    
    if (cached) {
      console.log(`⚡ Cache hit for: ${currentSearch} (${Date.now() - startTime}ms)`);
      return res.json({
        ...cached,
        metadata: { ...cached.metadata, responseTime: Date.now() - startTime, cached: true }
      });
    }

    // Generate suggestions with timeout fallback
    const suggestions = await Promise.race([
      generateAISuggestions(currentSearch, searchContext, analysis),
      new Promise<FormattedSuggestion[]>((resolve) => 
        setTimeout(() => resolve(generateSmartFallback(analysis)), 2000) // 2s timeout
      )
    ]);

    const response = {
      success: true,
      suggestions,
      searchAnalysis: {
        completeness: analysis.score,
        missingElements: analysis.missing,
        searchIntent: analysis.intent
      },
      metadata: {
        responseTime: Date.now() - startTime,
        model: 'gpt-4o-mini',
        totalSuggestions: suggestions.length,
        cached: false
      }
    };

    // Cache successful response
    setCachedSuggestions(cacheKey, response);
    
    console.log(`✅ Generated ${suggestions.length} suggestions (${Date.now() - startTime}ms)`);
    res.json(response);

  } catch (error: any) {
    console.error('❌ AI Error (using fallback):', error.message);
    
    const fallback = generateSmartFallback(analyzeSearch(req.body.currentSearch, req.body.searchContext));
    
    res.json({
      success: true,
      suggestions: fallback,
      searchAnalysis: { completeness: 0.3, missingElements: ['AI unavailable'], searchIntent: 'general' },
      metadata: { responseTime: Date.now() - startTime, model: 'fallback', totalSuggestions: fallback.length }
    });
  }
};

/**
 * Optimized search analysis with scoring
 */
function analyzeSearch(search = '', context?: SearchContext) {
  const query = search.toLowerCase();
  const missing: string[] = [];
  let score = 0;

  // Use bitwise flags for faster checking
  const flags = {
    location: !!(context?.location || /\b(in|near|downtown|city|beach|airport)\b/.test(query)),
    dates: !!(context?.dates?.checkin || /\b(next|this|weekend|tonight|tomorrow)\b/.test(query)),
    budget: !!(context?.budget || /\$|budget|cheap|luxury|under|above/.test(query)),
    guests: !!(context?.guests?.adults || /\b(people|guest|adult|family|couple|solo)\b/.test(query)),
    amenities: !!(context?.amenities?.length || /wifi|breakfast|pool|parking|gym|spa/.test(query)),
    experience: !!/romantic|business|luxury|boutique|star|rating/.test(query)
  };

  // Quick scoring
  if (flags.location) score += 25; else missing.push('location');
  if (flags.dates) score += 25; else missing.push('dates');
  if (flags.budget) score += 20; else missing.push('budget');
  if (flags.guests) score += 15; else missing.push('guests');
  if (flags.amenities) score += 10; else missing.push('amenities');
  if (flags.experience) score += 5; else missing.push('experience');

  // Intent detection
  const intent = 
    context?.userPreferences?.travelPurpose ||
    (query.includes('business') ? 'business' :
     query.includes('family') ? 'family' :
     query.includes('romantic') ? 'romantic' : 'leisure');

  return { score, missing, intent, flags };
}

/**
 * Optimized AI suggestion generation with structured prompt
 */
async function generateAISuggestions(
  search: string, 
  context?: SearchContext, 
  analysis?: any
): Promise<FormattedSuggestion[]> {
  
  const prompt = `Generate 6 hotel search suggestions for: "${search}"

Missing: ${analysis?.missing?.join(', ') || 'none'}
Intent: ${analysis?.intent || 'general'}
Completeness: ${analysis?.score || 0}%

Return JSON array only:
[{"text": "suggestion text", "category": "essentials|amenities|budget|location", "priority": "high|medium|low"}]

Focus on most impactful missing elements first.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system", 
        content: "Generate concise hotel search suggestions (2-5 words each). Return valid JSON array only."
      },
      { role: "user", content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 200,
    response_format: { type: "json_object" }
  });

  try {
    const response = JSON.parse(completion.choices[0].message.content || '{"suggestions":[]}');
    const suggestions = response.suggestions || response;
    
    if (!Array.isArray(suggestions)) throw new Error('Invalid format');
    
    return suggestions
      .filter(s => s.text && s.text.length > 0)
      .slice(0, 6)
      .map((s, i) => ({
        id: `ai-${i}-${Date.now()}`,
        text: s.text.trim(),
        category: s.category || 'general',
        priority: s.priority || 'medium',
        impact: s.impact
      }));
      
  } catch (error) {
    throw new Error('Failed to parse AI response');
  }
}

/**
 * Lightning-fast smart fallback using patterns
 */
function generateSmartFallback(analysis: any): FormattedSuggestion[] {
  const suggestions: FormattedSuggestion[] = [];
  let id = 0;

  // Add suggestions based on missing elements, prioritized
  const priorities = [
    { missing: 'location', patterns: SMART_PATTERNS.location, category: 'essentials' },
    { missing: 'dates', patterns: SMART_PATTERNS.dates, category: 'essentials' },
    { missing: 'budget', patterns: SMART_PATTERNS.budget, category: 'budget' },
    { missing: 'guests', patterns: SMART_PATTERNS.guests, category: 'essentials' },
    { missing: 'amenities', patterns: SMART_PATTERNS.amenities, category: 'amenities' },
    { missing: 'experience', patterns: SMART_PATTERNS.experience, category: 'experience' }
  ];

  for (const { missing, patterns, category } of priorities) {
    if (analysis.missing?.includes(missing) && suggestions.length < 6) {
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      suggestions.push({
        id: `fallback-${id++}`,
        text: pattern,
        category,
        priority: category === 'essentials' ? 'high' : 'medium'
      });
    }
  }

  // Fill remaining slots with popular suggestions
  const popular = ['free breakfast', '4+ star rating', 'free parking', 'pool access'];
  while (suggestions.length < 6) {
    const suggestion = popular[suggestions.length % popular.length];
    suggestions.push({
      id: `popular-${suggestions.length}`,
      text: suggestion,
      category: 'amenities',
      priority: 'low'
    });
  }

  return suggestions.slice(0, 6);
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
  return Buffer.from(JSON.stringify(key)).toString('base64').slice(0, 20);
}

function getCachedSuggestions(key: string) {
  const cached = suggestionCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  if (cached) suggestionCache.delete(key);
  return null;
}

function setCachedSuggestions(key: string, data: any) {
  // Limit cache size
  if (suggestionCache.size > 100) {
    const firstKey = suggestionCache.keys().next().value;
    if (typeof firstKey === 'string') {
      suggestionCache.delete(firstKey);
    }
  }
  suggestionCache.set(key, { data, timestamp: Date.now() });
}

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of suggestionCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      suggestionCache.delete(key);
    }
  }
}, CACHE_TTL);