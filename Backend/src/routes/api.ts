// src/routes/api.ts - Updated with AI Search Chat endpoint
import express from 'express';
import { hotelSearchAndMatchController } from '../controllers/hotelSearchAndMatch';
import { aiInsightsController } from '../controllers/aiInsightsController';
import { parseSearchQuery } from '../controllers/parseController';
import { generateSuggestions } from '../controllers/aiSuggestionsController';
import { hotelBudgetRelevanceController } from '../controllers/hotelBudgetRelevanceController';
import { conversationalRefineController } from '../controllers/conversationalRefineController';
import { hotelChatController, fetchHotelDetailsForChatController } from '../controllers/hotelChatController';
import { fetchHotelReviewsController } from '../controllers/hotelReviewsController';
import { generateArticleController, generateBatchArticlesController } from '../controllers/articleGeneratorController';
import { pushArticleController } from '../controllers/articlePushController';
import { aiSearchChatController } from '../controllers/aiSearchChatController';

const router = express.Router();

// Hotel routes
router.post('/hotels/search-and-match', hotelSearchAndMatchController); // Stage 1 - Search + Llama matching
router.get('/hotels/search-and-match/stream', hotelSearchAndMatchController); // SSE (mobile)
router.post('/hotels/ai-insights', aiInsightsController); // Stage 2 - GPT content + sentiment insights
router.post('/hotels/budget-relevance', hotelBudgetRelevanceController); // Budget-aware relevance search

// AI features routes
router.post('/hotels/ai-suggestions', generateSuggestions); // AI search suggestions
router.post('/hotels/conversational-refine', conversationalRefineController); // Conversational search refinement

// NEW: AI Search Chat route - Conversational search interface with hotel context
router.post('/ai-search-chat', aiSearchChatController); // POST for full chat
router.get('/ai-search-chat/stream', aiSearchChatController); // SSE for streaming responses

// Hotel chat routes - fetch details first, then chat
router.post('/hotels/fetch-details-for-chat', fetchHotelDetailsForChatController); // Fetch hotel details for chat context
router.post('/hotels/chat', hotelChatController); // Hotel-specific AI chat

// Hotel reviews route
router.post('/hotels/reviews', fetchHotelReviewsController); // Fetch hotel reviews with sentiment analysis

// Query parsing route  
router.post('/query/parse', parseSearchQuery);

// Article generation routes
router.post('/articles/generate', generateArticleController); // Generate single article
router.post('/articles/generate-batch', generateBatchArticlesController); // Generate multiple articles
router.post('/articles/push', pushArticleController); // Receive and save generated articles

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
      'POST /api/ai-search-chat - Conversational AI search assistant (NEW)',
      'GET /api/ai-search-chat/stream - Streaming AI search chat (NEW)',
      'POST /api/hotels/fetch-details-for-chat - Fetch comprehensive hotel details for chat context',
      'POST /api/hotels/chat - Hotel-specific AI chat assistant',
      'POST /api/hotels/reviews - Fetch hotel reviews with sentiment analysis',
      'POST /api/query/parse - Parse natural language hotel search queries',
      'POST /api/articles/generate - Generate single article with AI',
      'POST /api/articles/generate-batch - Generate multiple articles (batch processing)',
      'POST /api/articles/push - Receive and save generated articles',
      'GET /api/health - Health check',
      'GET /api/test - Test endpoint'
    ],
    newFeatures: {
      aiSearchChat: {
        feature: 'Conversational AI Search Assistant',
        endpoints: {
          post: 'POST /api/ai-search-chat',
          stream: 'GET /api/ai-search-chat/stream'
        },
        features: [
          'Real-time streaming AI responses',
          'Hotel context awareness',
          'Search refinement suggestions',
          'Natural language conversation',
          'Automatic search query generation',
          'Hotel recommendations from results',
          'Price, location, and amenity adjustments'
        ],
        requestFormat: {
          message: 'string (required) - User message',
          conversationHistory: 'array (optional) - Previous messages',
          currentSearch: 'string (optional) - Active search query',
          hotelContext: 'array (optional) - Current search results',
          searchParams: 'object (optional) - Active search parameters'
        },
        responseFormat: {
          response: 'string - AI response',
          shouldRefineSearch: 'boolean - If search should be refined',
          refinedQuery: 'string - New search query if refinement needed',
          conversationHistory: 'array - Updated conversation history'
        },
        benefits: 'Natural conversation, context-aware responses, seamless search refinement'
      }
    }
  });
});

export default router;