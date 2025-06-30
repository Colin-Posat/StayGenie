// src/index.ts
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import hotelRoutes from './routes/hotelRoutes';
import supabase from './lib/supabaseClient';
import parseRoutes from './routes/parseRoutes';
import matchRoutes from './routes/matchRoutes'


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Use different base paths to avoid conflicts
app.use('/api/parse', parseRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/match', matchRoutes);

const PORT = process.env.PORT || 3003;

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`✅ StayGenie backend running on http://localhost:${PORT}`);
});