// src/routes/api.ts
import express from 'express';
import { smartHotelSearchController as smartHotelSearch } from '../controllers/smartHotelSearch';
import { hotelSearchAndMatchController } from '../controllers/hotelSearchAndMatch';
import { aiInsightsController } from '../controllers/aiInsightsController';
import { parseSearchQuery } from '../controllers/parseController';
import { generateSuggestions } from '../controllers/aiSuggestionsController';

const router = express.Router();

// Hotel routes
router.post('/hotels/search', smartHotelSearch); // Legacy endpoint (keep for backward compatibility)
router.post('/hotels/search-and-match', hotelSearchAndMatchController); // New: Stage 1 - Search + Llama matching
router.post('/hotels/ai-insights', aiInsightsController); // New: Stage 2 - GPT content + sentiment insights

// AI suggestions route
router.post('/hotels/ai-suggestions', generateSuggestions);

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
      'POST /api/hotels/search - Legacy smart hotel search with AI recommendations',
      'POST /api/hotels/search-and-match - NEW: Hotel search + Llama AI matching (Stage 1)',
      'POST /api/hotels/ai-insights - NEW: GPT content generation + sentiment insights (Stage 2)',
      'POST /api/hotels/ai-suggestions - Generate AI search suggestions',
      'POST /api/query/parse - Parse natural language hotel search queries',
      'GET /api/health - Health check',
      'GET /api/test - Test endpoint'
    ],
    newWorkflow: {
      step1: 'Call /api/hotels/search-and-match to get hotels with Llama matching',
      step2: 'Call /api/hotels/ai-insights with hotel data to get GPT content + sentiment analysis',
      benefits: 'Progressive loading, better error handling, parallel processing'
    }
  });
});

export default router;