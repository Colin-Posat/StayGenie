import { Router } from 'express';
import { matchHotels } from '../controllers/hotelMatchController';

const router = Router();

/**
 * POST /match
 * 
 * Matches hotels from search results to user preferences using AI
 * Always returns exactly 5 hotels ranked from BEST to LEAST match
 */
router.post('/match', matchHotels);

export default router;