// hotelRoutes.ts - Updated routes
import express from 'express';
import { searchHotels, parseAndSearchHotels } from '../controllers/hotelSearchController';
import { 
  searchHotelAvailability,
  getHotelAvailability,
  parseAndSearchAvailability,
  smartHotelSearch // 🚀 NEW: Import the combined function
} from '../controllers/hotelMatchController';


const router = express.Router();

// 🚀 MAIN ENDPOINT: One-stop hotel search with AI recommendations
router.post('/smart-search', smartHotelSearch);

// Hotel search endpoints (metadata only, no pricing)
router.post('/search', searchHotels);
router.post('/search-from-text', parseAndSearchHotels);

// Hotel availability endpoints (with rates and pricing)
router.post('/availability', searchHotelAvailability);
router.post('/availability-from-text', parseAndSearchAvailability);

// Specific hotel availability
router.post('/hotel-availability', getHotelAvailability);

export default router;