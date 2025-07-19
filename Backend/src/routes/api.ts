// src/routes/api.ts
import express from 'express';
import { smartHotelSearchController as smartHotelSearch } from '../controllers/smartHotelSearch';
import { parseSearchQuery } from '../controllers/parseController';
import { generateSuggestions } from '../controllers/aiSuggestionsController';

const router = express.Router();

// Hotel routes
router.post('/hotels/search', smartHotelSearch);

// AI suggestions route
router.post('/hotels/ai-suggestions', generateSuggestions);

// Query parsing route  
router.post('/query/parse', parseSearchQuery
);

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
      'POST /api/hotels/smart - Smart hotel search with AI recommendations',
      'POST /api/hotels/ai-suggestions - Generate AI search suggestions',
      'POST /api/query/parse - Parse natural language hotel search queries',
      'GET /api/health - Health check',
      'GET /api/test - Test endpoint'
    ]
  });
});

export default router;