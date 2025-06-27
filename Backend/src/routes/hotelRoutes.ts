// src/routes/hotelRoutes.ts
import { Router } from 'express';
import { getHotels } from '../controllers/hotelController';

const router = Router();
router.get('/', getHotels); // GET /api/hotels

export default router;
