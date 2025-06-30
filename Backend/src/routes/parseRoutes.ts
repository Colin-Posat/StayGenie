import express from 'express';
import { parseSearchQuery } from '../controllers/parseController';

const router = express.Router();

router.post('/parse', parseSearchQuery);

export default router;