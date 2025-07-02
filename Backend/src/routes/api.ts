// src/routes/api.ts
import { Router } from 'express';
import parseRoutes from './parseRoutes';
import hotelRoutes from './hotelRoutes';


const router = Router();

// Group routes logically
router.use('/query', parseRoutes);  // /api/query/parse
router.use('/hotels', hotelRoutes); // /api/hotels/search-hotels


export default router;