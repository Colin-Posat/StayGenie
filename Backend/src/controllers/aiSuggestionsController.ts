// controllers/aiSuggestionsController.ts
import { Request, Response } from 'express';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types
interface SuggestionRequest {
  currentSearch?: string;
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
    previousSearches?: string[];
    budget?: {
      min?: number;
      max?: number;
      currency?: string;
    };
    amenities?: string[];
    userPreferences?: {
      propertyTypes?: string[];
      previousBookings?: string[];
      travelPurpose?: 'business' | 'leisure' | 'family' | 'romantic' | 'group';
    };
  };
}

interface AISuggestion {
  text: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  reasoning?: string;
  impact?: string;
}

interface AIResponse {
  suggestions: AISuggestion[];
  searchAnalysis?: {
    completeness: number;
    missingElements: string[];
    searchIntent: string;
  };
}

interface FormattedSuggestion {
  id: string;
  text: string;
  category: string;
  priority: string;
  reasoning?: string;
  impact?: string;
}

/**
 * Generate AI suggestions based on current search query
 * POST /api/hotels/ai-suggestions
 */
export const generateSuggestions = async (req: Request<{}, {}, SuggestionRequest>, res: Response) => {
  try {
    const { currentSearch, searchContext } = req.body;

    console.log('🤖 Generating AI suggestions for:', currentSearch || 'empty search');
    console.log('📍 Context:', JSON.stringify(searchContext, null, 2));

    // Analyze the current search state
    const searchAnalysis = analyzeSearchCompleteness(currentSearch, searchContext);
    console.log('📊 Search analysis:', searchAnalysis);

    // Create the enhanced prompt
    const prompt = createEnhancedSuggestionsPrompt(currentSearch, searchContext, searchAnalysis);

    // Call OpenAI with optimized settings
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a hotel search optimization expert. Your job is to analyze incomplete hotel searches and suggest smart additions that will help users find better results.

Rules:
1. Generate 6 concise search add-ons (2-5 words each)
2. Prioritize missing essential information first
3. Consider search intent and context
4. Each suggestion should be actionable and specific
5. Focus on what will most improve search results
6. Return valid JSON only

Categories: "essentials", "budget", "amenities", "location", "experience", "timing"
Priorities: "high" (critical missing info), "medium" (helpful additions), "low" (nice extras)`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.4, // Balanced creativity and consistency
      max_tokens: 400,
      response_format: { type: "json_object" }
    });

    const aiResponse = completion.choices[0].message.content;
    let suggestions: AIResponse;

    try {
      suggestions = JSON.parse(aiResponse!) as AIResponse;
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', parseError);
      console.error('Raw response:', aiResponse);
      throw new Error('Invalid AI response format');
    }

    // Validate and format suggestions
    if (!suggestions.suggestions || !Array.isArray(suggestions.suggestions)) {
      throw new Error('Invalid suggestions format from AI');
    }

    // Format suggestions with IDs and validation
    const formattedSuggestions: FormattedSuggestion[] = suggestions.suggestions
      .filter(suggestion => suggestion.text && suggestion.text.length > 0)
      .slice(0, 6) // Ensure max 6 suggestions
      .map((suggestion, index) => ({
        id: `ai-suggestion-${index}-${Date.now()}`,
        text: suggestion.text.trim(),
        category: suggestion.category || 'general',
        priority: suggestion.priority || 'medium',
        reasoning: suggestion.reasoning,
        impact: suggestion.impact
      }));

    console.log(`✅ Generated ${formattedSuggestions.length} AI suggestions`);
    
    // Log suggestions for debugging
    formattedSuggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. "${suggestion.text}" [${suggestion.category}] (${suggestion.priority})`);
    });

    res.json({
      success: true,
      suggestions: formattedSuggestions,
      searchAnalysis: {
        completeness: searchAnalysis.completeness,
        missingElements: searchAnalysis.missingElements,
        searchIntent: searchAnalysis.searchIntent
      },
      metadata: {
        originalSearch: currentSearch,
        generatedAt: new Date().toISOString(),
        model: 'gpt-4o-mini',
        totalSuggestions: formattedSuggestions.length,
        analysisScore: searchAnalysis.completeness
      }
    });

  } catch (error: any) {
    console.error('❌ AI Suggestions Error:', error);

    // Enhanced fallback with context awareness
    const fallbackSuggestions = generateSmartFallbackSuggestions(
      req.body.currentSearch, 
      req.body.searchContext
    );

    res.status(200).json({
      success: true,
      suggestions: fallbackSuggestions,
      searchAnalysis: {
        completeness: 0.3,
        missingElements: ['Unable to analyze - using fallback'],
        searchIntent: 'general'
      },
      metadata: {
        originalSearch: req.body.currentSearch,
        generatedAt: new Date().toISOString(),
        model: 'fallback-enhanced',
        totalSuggestions: fallbackSuggestions.length,
        aiError: error.message
      }
    });
  }
};

/**
 * Analyze search completeness and missing elements
 */
function analyzeSearchCompleteness(currentSearch?: string, searchContext?: SuggestionRequest['searchContext']) {
  const query = (currentSearch || '').toLowerCase();
  const missingElements: string[] = [];
  let completeness = 0;
  const maxScore = 10;

  // Essential elements (high impact on completeness)
  const hasLocation = searchContext?.location || hasLocationKeywords(query);
  const hasDates = searchContext?.dates?.checkin || hasDateKeywords(query);
  const hasBudget = searchContext?.budget?.min || searchContext?.budget?.max || hasBudgetKeywords(query);
  const hasGuests = searchContext?.guests?.adults || hasGuestKeywords(query);

  // Score essential elements
  if (hasLocation) completeness += 2.5; else missingElements.push('location');
  if (hasDates) completeness += 2.5; else missingElements.push('dates');
  if (hasBudget) completeness += 2.0; else missingElements.push('budget');
  if (hasGuests) completeness += 1.5; else missingElements.push('guest count');

  // Additional elements
  const hasAmenities = searchContext?.amenities?.length || hasAmenityKeywords(query);
  const hasExperience = hasExperienceKeywords(query);

  if (hasAmenities) completeness += 1.0; else missingElements.push('amenities');
  if (hasExperience) completeness += 0.5; else missingElements.push('experience preferences');

  // Determine search intent
  let searchIntent = 'general';
  if (query.includes('business') || query.includes('work')) searchIntent = 'business';
  else if (query.includes('family') || query.includes('kids')) searchIntent = 'family';
  else if (query.includes('romantic') || query.includes('honeymoon')) searchIntent = 'romantic';
  else if (query.includes('vacation') || query.includes('holiday')) searchIntent = 'leisure';
  else if (searchContext?.userPreferences?.travelPurpose) {
    searchIntent = searchContext.userPreferences.travelPurpose;
  }

  return {
    completeness: Math.min(completeness / maxScore, 1.0),
    missingElements,
    searchIntent,
    hasLocation,
    hasDates,
    hasBudget,
    hasGuests,
    hasAmenities,
    hasExperience
  };
}

/**
 * Create enhanced prompt for OpenAI
 */
function createEnhancedSuggestionsPrompt(
  currentSearch?: string, 
  searchContext?: SuggestionRequest['searchContext'],
  analysis?: any
): string {
  const context = {
    search: currentSearch || '',
    location: searchContext?.location || 'Not specified',
    dates: searchContext?.dates ? 
      `${searchContext.dates.checkin} to ${searchContext.dates.checkout}` : 
      'Not specified',
    budget: searchContext?.budget ? 
      `${searchContext.budget.min || '0'} - ${searchContext.budget.max || '∞'} ${searchContext.budget.currency || 'USD'}` : 
      'Not specified',
    guests: searchContext?.guests ? 
      `${searchContext.guests.adults} adults${searchContext.guests.children ? `, ${searchContext.guests.children} children` : ''}` : 
      'Not specified',
    amenities: searchContext?.amenities?.join(', ') || 'None specified',
    travelPurpose: searchContext?.userPreferences?.travelPurpose || 'Not specified',
    previousSearches: searchContext?.previousSearches?.slice(-3).join('; ') || 'None'
  };

  const prompt = `
HOTEL SEARCH OPTIMIZATION TASK:

Current Search: "${context.search}"

CONTEXT:
• Location: ${context.location}
• Dates: ${context.dates}
• Budget: ${context.budget}
• Guests: ${context.guests}
• Amenities: ${context.amenities}
• Purpose: ${context.travelPurpose}
• Recent searches: ${context.previousSearches}

ANALYSIS:
• Completeness: ${Math.round((analysis?.completeness || 0) * 100)}%
• Missing: ${analysis?.missingElements?.join(', ') || 'Unknown'}
• Intent: ${analysis?.searchIntent || 'general'}

TASK: Generate 6 smart search add-ons that will most improve this search. Focus on missing essentials first, then helpful refinements.

EXAMPLES OF GOOD SUGGESTIONS:
- "for next weekend" (if dates missing)
- "under $200/night" (if budget missing)  
- "for 2 adults" (if guests missing)
- "with pool access" (popular amenity)
- "near city center" (location refinement)
- "4+ star rating" (quality filter)

RETURN JSON FORMAT:
{
  "suggestions": [
    {
      "text": "for next weekend",
      "category": "essentials",
      "priority": "high",
      "reasoning": "No dates specified - weekend is popular",
      "impact": "Will show availability and pricing"
    },
    {
      "text": "under $200/night", 
      "category": "budget",
      "priority": "high",
      "reasoning": "Budget helps narrow results significantly",
      "impact": "Filters out expensive options"
    }
  ]
}

Make suggestions that are:
- Actionable and specific
- Likely to improve search results
- Relevant to the user's apparent intent
- Concise (2-5 words)
`;

  return prompt;
}

/**
 * Enhanced keyword detection functions
 */
function hasLocationKeywords(query: string): boolean {
  const locationKeywords = [
    'in', 'near', 'downtown', 'city', 'beach', 'airport', 'center', 'district',
    'manhattan', 'brooklyn', 'miami', 'vegas', 'paris', 'london', 'tokyo',
    'hotel', 'resort', 'inn', 'lodge', 'suite'
  ];
  return locationKeywords.some(keyword => query.includes(keyword));
}

function hasDateKeywords(query: string): boolean {
  const dateKeywords = [
    'next', 'this', 'weekend', 'tonight', 'tomorrow', 'week', 'month',
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
    'summer', 'winter', 'spring', 'fall', 'holiday', 'vacation'
  ];
  return dateKeywords.some(keyword => query.includes(keyword));
}

function hasBudgetKeywords(query: string): boolean {
  const budgetKeywords = [
    '$', 'budget', 'cheap', 'expensive', 'luxury', 'under', 'below', 'above',
    'affordable', 'premium', 'deluxe', 'economy', 'mid-range', 'high-end'
  ];
  return budgetKeywords.some(keyword => query.includes(keyword));
}

function hasGuestKeywords(query: string): boolean {
  const guestKeywords = [
    'people', 'guest', 'adult', 'child', 'family', 'couple', 'solo', 'group',
    'person', 'traveler', 'visitor', 'party', 'for 2', 'for 3', 'for 4'
  ];
  return guestKeywords.some(keyword => query.includes(keyword));
}

function hasAmenityKeywords(query: string): boolean {
  const amenityKeywords = [
    'wifi', 'breakfast', 'pool', 'parking', 'gym', 'spa', 'restaurant', 'bar',
    'fitness', 'beach', 'ocean', 'view', 'balcony', 'kitchen', 'pet', 'dog',
    'accessible', 'elevator', 'air conditioning', 'heating', 'laundry'
  ];
  return amenityKeywords.some(keyword => query.includes(keyword));
}

function hasExperienceKeywords(query: string): boolean {
  const experienceKeywords = [
    'romantic', 'business', 'family', 'luxury', 'boutique', 'historic',
    'modern', 'cozy', 'quiet', 'lively', 'trendy', 'traditional',
    'star', 'rating', 'review', 'award', 'recommended'
  ];
  return experienceKeywords.some(keyword => query.includes(keyword));
}

/**
 * Generate smart fallback suggestions with context awareness
 */
function generateSmartFallbackSuggestions(
  currentSearch?: string, 
  searchContext?: SuggestionRequest['searchContext']
): FormattedSuggestion[] {
  const analysis = analyzeSearchCompleteness(currentSearch, searchContext);
  const suggestions: FormattedSuggestion[] = [];
  let id = 0;

  // Priority-based suggestion generation
  const essentialSuggestions = [];
  const helpfulSuggestions = [];

  // Essential missing elements (high priority)
  if (!analysis.hasLocation) {
    essentialSuggestions.push({
      text: 'near city center',
      category: 'essentials',
      priority: 'high',
      reasoning: 'Location not specified'
    });
  }

  if (!analysis.hasDates) {
    essentialSuggestions.push({
      text: 'for next weekend',
      category: 'essentials', 
      priority: 'high',
      reasoning: 'Dates not specified'
    });
  }

  if (!analysis.hasBudget) {
    essentialSuggestions.push({
      text: 'under $200/night',
      category: 'budget',
      priority: 'high',
      reasoning: 'Budget not specified'
    });
  }

  if (!analysis.hasGuests) {
    essentialSuggestions.push({
      text: 'for 2 adults',
      category: 'essentials',
      priority: 'high',
      reasoning: 'Guest count not specified'
    });
  }

  // Helpful additions (medium priority)
  if (!analysis.hasAmenities) {
    helpfulSuggestions.push(
      { text: 'with free breakfast', category: 'amenities', priority: 'medium' },
      { text: 'with pool access', category: 'amenities', priority: 'medium' },
      { text: 'with free wifi', category: 'amenities', priority: 'medium' },
      { text: 'with parking', category: 'amenities', priority: 'medium' }
    );
  }

  if (!analysis.hasExperience) {
    helpfulSuggestions.push(
      { text: '4+ star rating', category: 'experience', priority: 'medium' },
      { text: 'highly rated', category: 'experience', priority: 'medium' }
    );
  }

  // Combine suggestions prioritizing essentials
  const allSuggestions = [...essentialSuggestions, ...helpfulSuggestions];
  
  // Take up to 6 suggestions
  const finalSuggestions = allSuggestions.slice(0, 6);

  return finalSuggestions.map(suggestion => ({
    id: `fallback-${id++}-${Date.now()}`,
    text: suggestion.text,
    category: suggestion.category,
    priority: suggestion.priority,
    reasoning: suggestion.reasoning
  }));
}