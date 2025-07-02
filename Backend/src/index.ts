// src/index.ts
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import apiRoutes from './routes/api';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Single API base path - all routes go through /api
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3003;

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`✅ StayGenie backend running on http://localhost:${PORT}`);
});