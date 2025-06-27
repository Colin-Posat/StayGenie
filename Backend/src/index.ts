// src/index.ts
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import hotelRoutes from './routes/hotelRoutes';
import supabase from './lib/supabaseClient';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/hotels', hotelRoutes);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`✅ StayGenie backend running on http://localhost:${PORT}`);
});
