// routes/hotelRoutes.ts - UPDATED TO INCLUDE AI SUGGESTIONS AND SENTIMENT ROUTES
import express from 'express';
import {
   smartHotelSearch,           // 🚀 Import the optimized version
  searchHotelAvailability,
  getHotelAvailability,
  parseAndSearchAvailability
} from '../controllers/hotelMatchController';

// Import AI suggestions controller
import { generateSuggestions } from '../controllers/aiSuggestionsController';

const router = express.Router();

// 🚀 Smart search endpoint (optimized version)
router.post('/search', smartHotelSearch);

// 🤖 AI suggestions endpoint
router.post('/ai-suggestions', generateSuggestions);

// Basic availability search
router.post('/availability', searchHotelAvailability);

// Get specific hotel availability
router.post('/hotel-availability', getHotelAvailability);

// Combined parse and search
router.post('/parse-and-search', parseAndSearchAvailability);


export default router;