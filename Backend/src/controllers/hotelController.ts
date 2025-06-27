import { Request, Response } from 'express';
import supabase from '../lib/supabaseClient';

export const getHotels = async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase.from('hotels').select('*');

  if (error) {
    console.error('Supabase error:', error);
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json(data);
};
