import { Router } from 'express';
import { searchHotels } from '../controllers/hotelSearchController'; // The new controller

const router = Router();


// Route to search hotels using Amadeus API
router.post('/search-hotels', searchHotels);

export default router;