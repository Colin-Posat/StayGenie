// hotelController.ts - Basic hotel search (metadata only)
import { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

interface ParsedSearchQuery {
  checkin: string;
  checkout: string;
  countryCode: string;
  cityName: string;
  language: string;
  adults: number;
  children: number;
  aiSearch: string;
}

export const searchHotels = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsedQuery: ParsedSearchQuery = req.body;

    // Validate required fields
    if (!parsedQuery.countryCode || !parsedQuery.cityName) {
      res.status(400).json({ 
        error: 'Missing required fields: countryCode and cityName are required' 
      });
      return;
    }

    // Build query parameters for LiteAPI
    const queryParams = {
      countryCode: parsedQuery.countryCode,
      cityName: parsedQuery.cityName,
      language: parsedQuery.language || 'en',
      aiSearch: parsedQuery.aiSearch,
      limit: 50,
      timeout: 30
    };

    // Remove undefined values
    const cleanParams = Object.fromEntries(
      Object.entries(queryParams).filter(([_, value]) => value !== undefined)
    );

    // Make request to LiteAPI
    const response = await axios.get('https://api.liteapi.travel/v3.0/data/hotels', {
      params: cleanParams,
      headers: {
        'X-API-Key': process.env.LITEAPI_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Return the hotel results along with the original search parameters
    res.json({
      searchParams: {
        checkin: parsedQuery.checkin,
        checkout: parsedQuery.checkout,
        adults: parsedQuery.adults,
        children: parsedQuery.children,
        countryCode: parsedQuery.countryCode,
        cityName: parsedQuery.cityName,
        language: parsedQuery.language,
        aiSearch: parsedQuery.aiSearch
      },
      hotels: response.data?.data || response.data,
      totalResults: response.data?.data?.length || response.data?.length || 0
    });

  } catch (error) {
    console.error('Error searching hotels:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        res.status(error.response.status).json({
          error: 'LiteAPI error',
          message: error.response.data?.message || 'Unknown API error',
          details: error.response.data
        });
        return;
      } else if (error.request) {
        res.status(408).json({
          error: 'Request timeout',
          message: 'No response received from LiteAPI'
        });
        return;
      }
    }

    res.status(500).json({ 
      error: 'Failed to search hotels',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Combined endpoint that parses input AND searches hotels in one call
export const parseAndSearchHotels = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userInput } = req.body;

    if (!userInput) {
      res.status(400).json({ error: 'userInput is required' });
      return;
    }

    // First, parse the user input
    const parseResponse = await axios.post(
      `${process.env.BASE_URL || 'http://localhost:3003'}/api/query/parse`,
      { userInput },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    const parsedQuery = parseResponse.data;

    // Then search hotels with the parsed data
    const searchResponse = await axios.post(
      `${process.env.BASE_URL || 'http://localhost:3003'}/api/hotels/search`,
      parsedQuery,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    res.json(searchResponse.data);

  } catch (error) {
    console.error('Error in combined parse and search:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).json({
        error: 'Combined search failed',
        message: error.response.data?.message || error.message,
        step: error.config?.url?.includes('/parse') ? 'parsing' : 'searching'
      });
      return;
    }

    res.status(500).json({ 
      error: 'Failed to parse and search hotels',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};