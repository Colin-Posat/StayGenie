// routes/hotelRoutes.ts - UPDATED TO USE SEPARATED SMART SEARCH
import express from 'express';
import { 
  smartHotelSearch,           // 🚀 Now imported from separated file
  searchHotelAvailability, 
  getHotelAvailability, 
  parseAndSearchAvailability 
} from '../controllers/hotelMatchController';

const router = express.Router();

// 🚀 Smart search endpoint (now using separated function)
router.post('/smart-search', smartHotelSearch);

// Basic availability search
router.post('/availability', searchHotelAvailability);

// Get specific hotel availability
router.post('/hotel-availability', getHotelAvailability);

// Combined parse and search
router.post('/parse-and-search', parseAndSearchAvailability);

export default router;