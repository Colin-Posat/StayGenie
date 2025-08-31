// src/routes/api.ts
import express from 'express';
import { hotelSearchAndMatchController } from '../controllers/hotelSearchAndMatch';
import { aiInsightsController } from '../controllers/aiInsightsController';
import { parseSearchQuery } from '../controllers/parseController';
import { generateSuggestions } from '../controllers/aiSuggestionsController';
import { hotelBudgetRelevanceController } from '../controllers/hotelBudgetRelevanceController';
import { conversationalRefineController } from '../controllers/conversationalRefineController';
import { hotelChatController } from '../controllers/hotelChatController'; // NEW IMPORT

const router = express.Router();

// Hotel routes
router.post('/hotels/search-and-match', hotelSearchAndMatchController); // Stage 1 - Search + Llama matching
router.get('/hotels/search-and-match/stream', hotelSearchAndMatchController); // NEW: SSE (mobile)
router.post('/hotels/ai-insights', aiInsightsController); // Stage 2 - GPT content + sentiment insights
router.post('/hotels/budget-relevance', hotelBudgetRelevanceController); // NEW: Budget-aware relevance search

// AI features routes
router.post('/hotels/ai-suggestions', generateSuggestions); // AI search suggestions
router.post('/hotels/conversational-refine', conversationalRefineController); // Conversational search refinement
router.post('/hotels/chat', hotelChatController); // NEW: Hotel-specific AI chat

// Query parsing route  
router.post('/query/parse', parseSearchQuery);

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
      'POST /api/hotels/chat - NEW: Hotel-specific AI chat assistant',
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
        newFeature: 'Call /api/hotels/chat for hotel-specific AI assistant',
        features: [
          'Hotel-specific knowledge base using allHotelInfo',
          'Conversational AI assistant for hotel questions',
          'Context-aware responses about amenities, location, policies',
          'Fallback responses when AI is unavailable',
          'Session-based conversation memory',
          'Comprehensive hotel data integration'
        ],
        benefits: 'Personalized hotel assistance, detailed Q&A, enhanced user experience'
      }
    }
  });
});

export default router;