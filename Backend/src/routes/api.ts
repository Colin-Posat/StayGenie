// src/routes/api.ts - Updated with hotel reviews endpoint
import express from 'express';
import { hotelSearchAndMatchController } from '../controllers/hotelSearchAndMatch';
import { aiInsightsController } from '../controllers/aiInsightsController';
import { parseSearchQuery } from '../controllers/parseController';
import { generateSuggestions } from '../controllers/aiSuggestionsController';
import { hotelBudgetRelevanceController } from '../controllers/hotelBudgetRelevanceController';
import { conversationalRefineController } from '../controllers/conversationalRefineController';
import { hotelChatController, fetchHotelDetailsForChatController } from '../controllers/hotelChatController';
import { fetchHotelReviewsController } from '../controllers/hotelReviewsController'; // NEW IMPORT
import { generateArticleController, generateBatchArticlesController } from '../controllers/articleGeneratorController';

const router = express.Router();

// Hotel routes
router.post('/hotels/search-and-match', hotelSearchAndMatchController); // Stage 1 - Search + Llama matching
router.get('/hotels/search-and-match/stream', hotelSearchAndMatchController); // SSE (mobile)
router.post('/hotels/ai-insights', aiInsightsController); // Stage 2 - GPT content + sentiment insights
router.post('/hotels/budget-relevance', hotelBudgetRelevanceController); // Budget-aware relevance search

// AI features routes
router.post('/hotels/ai-suggestions', generateSuggestions); // AI search suggestions
router.post('/hotels/conversational-refine', conversationalRefineController); // Conversational search refinement

// Hotel chat routes - fetch details first, then chat
router.post('/hotels/fetch-details-for-chat', fetchHotelDetailsForChatController); // Fetch hotel details for chat context
router.post('/hotels/chat', hotelChatController); // Hotel-specific AI chat

// NEW: Hotel reviews route
router.post('/hotels/reviews', fetchHotelReviewsController); // Fetch hotel reviews with sentiment analysis

// Query parsing route  
router.post('/query/parse', parseSearchQuery);

router.post('/articles/generate', generateArticleController);
router.post('/articles/generate-batch', generateBatchArticlesController);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
     status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'StayGenie Backend'
  });
});

// Test route to verify API is working
router.get('/test', (req, res) => {
  res.status(200).json({
     message: 'StayGenie API is working!',
    endpoints: [
      'POST /api/hotels/search-and-match - Hotel search + Llama AI matching (Stage 1)',
      'POST /api/hotels/ai-insights - GPT content generation + sentiment insights (Stage 2)',
      'POST /api/hotels/budget-relevance - Budget-aware relevance search with GPT scoring',
      'POST /api/hotels/ai-suggestions - Generate AI search suggestions',
      'POST /api/hotels/conversational-refine - Conversational search refinement',
      'POST /api/hotels/fetch-details-for-chat - Fetch comprehensive hotel details for chat context',
      'POST /api/hotels/chat - Hotel-specific AI chat assistant',
      'POST /api/hotels/reviews - NEW: Fetch hotel reviews with sentiment analysis',
      'POST /api/query/parse - Parse natural language hotel search queries',
      'GET /api/health - Health check',
      'GET /api/test - Test endpoint'
    ],
    workflows: {
      originalWorkflow: {
        step1: 'Call /api/hotels/search-and-match to get hotels with Llama matching',
        step2: 'Call /api/hotels/ai-insights with hotel data to get GPT content + sentiment analysis',
        benefits: 'Progressive loading, better error handling, parallel processing'
      },
      budgetRelevanceWorkflow: {
        singleStep: 'Call /api/hotels/budget-relevance for budget-aware relevance search',
        features: [
          '200 hotels fetched with full metadata',
          'GPT-4o Mini relevance scoring (0-100)',
          'Parallel processing of rates and scoring',
          'Budget-aware filtering: inBudget (score >75) + outOfBudget (score >80)',
          'Returns up to 30 hotels in each category'
        ],
        benefits: 'Single endpoint, budget awareness, high relevance scoring'
      },
      conversationalRefineWorkflow: {
        feature: 'Call /api/hotels/conversational-refine for chat-based search refinement',
        features: [
          'Real-time conversational search refinement',
          'AI-powered query understanding and modification',
          'Context-aware responses based on search history',
          'Fallback rule-based processing when AI unavailable',
          'Session-based conversation memory',
          'Single source of truth for search query'
        ],
        benefits: 'Natural language search refinement, improved user experience, intelligent query building'
      },
      hotelChatWorkflow: {
        newFeature: 'Enhanced Hotel Chat Pipeline',
        pipeline: [
          'Step 1: Call /api/hotels/fetch-details-for-chat with hotelId to get comprehensive hotel data',
          'Step 2: Call /api/hotels/chat with enriched hotelData (including allHotelInfo) for context-aware chat'
        ],
        features: [
          'Comprehensive hotel data fetching from LiteAPI /data/hotel endpoint',
          'Full hotel description, amenities, policies, and sentiment analysis',
          'Context-aware AI responses using complete hotel information',
          'Conversational AI assistant for hotel-specific questions',
          'Fallback responses when AI is unavailable',
          'Session-based conversation memory',
          'Rate limiting and retry logic for API reliability'
        ],
        benefits: 'Rich hotel context, personalized assistance, comprehensive Q&A, enhanced user experience'
      },
      hotelReviewsWorkflow: {
        newFeature: 'NEW Hotel Reviews with Sentiment Analysis',
        endpoint: 'POST /api/hotels/reviews',
        features: [
          'Real guest reviews from LiteAPI reviews endpoint',
          'AI sentiment analysis of last 1000 reviews',
          'Rating distribution and averages',
          'Pros and cons extraction from review content',
          'Configurable pagination (limit/offset)',
          'Error handling with graceful fallbacks',
          'Formatted dates and traveler type information'
        ],
        requestFormat: {
          hotelId: 'string (required)',
          limit: 'number (optional, default: 8, max: 50)',
          offset: 'number (optional, default: 0)',
          getSentiment: 'boolean (optional, default: true)'
        },
        responseFormat: {
          reviews: 'Array of formatted review objects',
          total: 'Total number of reviews available',
          averageRating: 'Calculated average rating',
          ratingDistribution: 'Breakdown by star rating',
          sentiment: 'AI-generated sentiment analysis'
        },
        benefits: 'Authentic guest feedback, AI insights, enhanced booking confidence'
      }
    }
  });
});

export default router;