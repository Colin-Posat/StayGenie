// hotelAvailabilityController.ts - UPDATED WITH SEPARATED SMART SEARCH
import { Request, Response } from 'express';
import axios from 'axios';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

// Import the separated smart search function
import { smartHotelSearch } from './smartHotelSearch';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ======================== INTERFACES (keep the ones still used in this file) ========================
interface ParsedSearchQuery {
  checkin: string;
  checkout: string;
  countryCode: string;
  cityName: string;
  adults: number;
  children: number;
  aiSearch: string;
  minCost?: number | null;  
  maxCost?: number | null; 
}

interface HotelInfo {
  id?: string;
  name?: string;
  address?: string;
  rating?: number;
  starRating?: number;
  description?: string;
  amenities?: string[];
  images?: string[];
  main_photo?: string;
  thumbnail?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  reviewCount?: number;
  guestInsights?: string;
}

interface Rate {
  retailRate?: {
    total?: Array<{
      amount: number;
      currency: string;
    }>;
  };
}

interface RoomType {
  rates?: Rate[];
}

interface HotelWithRates {
  hotelId: string;
  roomTypes?: RoomType[];
  hotelInfo?: HotelInfo;
}

interface HotelSummaryForAI {
  index: number;
  hotelId: string;
  name: string;
  location: string;
  description: string;
  pricePerNight: string; 
}

// ======================== HELPER FUNCTIONS (only the ones still used here) ========================

// Enhanced createHotelSummaryForAI function with price information
const createHotelSummaryForAI = (hotel: HotelWithRates, index: number, nights: number): HotelSummaryForAI => {
  const hotelInfo = hotel.hotelInfo;
  
  if (!hotelInfo) {
    return {
      index: index + 1,
      hotelId: hotel.hotelId,
      name: hotel.hotelId || 'Unknown Hotel',
      location: 'Location not available',
      description: 'No description available',
      pricePerNight: 'Price not available'
    };
  }

  // Calculate price range using your existing logic
  let priceRange = null;
  if (hotel.roomTypes && hotel.roomTypes.length > 0) {
    const prices = hotel.roomTypes
      .flatMap(room => room.rates || [])
      .map(rate => rate.retailRate?.total?.[0]?.amount)
      .filter(price => price != null);
    
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const currency = hotel.roomTypes[0].rates?.[0]?.retailRate?.total?.[0]?.currency || 'USD';
      priceRange = {
        min: minPrice,
        max: maxPrice,
        currency: currency,
        display: minPrice === maxPrice ? `${minPrice}` : `${minPrice} - ${maxPrice}`
      };
    }
  }

  // Calculate price per night using YOUR exact logic
  let pricePerNightInfo = 'Price not available';
  if (priceRange && nights > 0) {
    const pricePerNight = {
      min: Math.round(priceRange.min / nights),
      max: Math.round(priceRange.max / nights),
      currency: priceRange.currency,
      display: priceRange.min === priceRange.max 
        ? `${Math.round(priceRange.min / nights)}/night`
        : `${Math.round(priceRange.min / nights)} - ${Math.round(priceRange.max / nights)}/night`
    };
    pricePerNightInfo = `${pricePerNight.display}`;
  }

  // Keep description short for AI processing (50 chars max)
  const shortDescription = hotelInfo.description 
    ? hotelInfo.description.substring(0, 50).trim() + '...'
    : 'No description available';

  return {
    index: index + 1,
    hotelId: hotel.hotelId,
    name: hotelInfo.name || 'Unknown Hotel',
    location: hotelInfo.address || 'Location not available',
    description: shortDescription,
    pricePerNight: pricePerNightInfo
  };
};

// ======================== EXPORTED FUNCTIONS ========================

// Export the separated smart search function
export { smartHotelSearch };

// Main availability search with two-step process
export const searchHotelAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsedQuery: ParsedSearchQuery = req.body;
  
      // Validate required fields
      if (!parsedQuery.checkin || !parsedQuery.checkout || !parsedQuery.countryCode || !parsedQuery.cityName) {
        res.status(400).json({ 
          error: 'Missing required fields: checkin, checkout, countryCode, and cityName are required' 
        });
        return;
      }
  
      // Validate dates
      const checkinDate = new Date(parsedQuery.checkin);
      const checkoutDate = new Date(parsedQuery.checkout);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      if (checkinDate < today) {
        res.status(400).json({ 
          error: 'Check-in date cannot be in the past' 
        });
        return;
      }
  
      if (checkoutDate <= checkinDate) {
        res.status(400).json({ 
          error: 'Check-out date must be after check-in date' 
        });
        return;
      }
  
      console.log('Step 1: Getting hotel IDs for', parsedQuery.cityName, parsedQuery.countryCode);
  
      // Step 1: Get hotel IDs from the hotels search endpoint
      const hotelsSearchResponse = await axios.get('https://api.liteapi.travel/v3.0/data/hotels', {
        params: {
          countryCode: parsedQuery.countryCode,
          cityName: parsedQuery.cityName,
          language: 'en',
          limit: 20 // Limit to 100 hotels for faster rates search
        },
        headers: {
          'X-API-Key': process.env.LITEAPI_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
  
      const hotels = hotelsSearchResponse.data?.data || hotelsSearchResponse.data;
      
      if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
        res.status(404).json({
          error: 'No hotels found',
          message: `No hotels found in ${parsedQuery.cityName}, ${parsedQuery.countryCode}`,
          searchParams: {
            countryCode: parsedQuery.countryCode,
            cityName: parsedQuery.cityName
          }
        });
        return;
      }
  
      // Extract hotel IDs - try multiple possible field names
      const hotelIds = hotels.map((hotel: any) => 
        hotel.id || hotel.hotelId || hotel.hotel_id || hotel.code
      ).filter(Boolean);
      
      if (hotelIds.length === 0) {
        res.status(404).json({
          error: 'No valid hotel IDs found',
          message: 'Hotels were found but no valid IDs could be extracted',
          hotelsFound: hotels.length,
          sampleHotel: hotels[0] // Include sample for debugging
        });
        return;
      }
  
      console.log(`Step 2: Found ${hotelIds.length} hotels, searching rates for: ${hotelIds.slice(0, 5).join(', ')}...`);
  
      // Step 2: Search for rates using the hotel IDs
      const ratesRequestBody = {
        checkin: parsedQuery.checkin,
        checkout: parsedQuery.checkout,
        currency: 'USD',
        guestNationality: 'US',
        hotelIds: hotelIds,
        occupancies: [
          {
            adults: parsedQuery.adults || 2,
            children: parsedQuery.children ? Array(parsedQuery.children).fill(10) : []
          }
        ],
        timeout: 12
      };
  
      console.log('Step 3: Searching rates with request:', { 
        ...ratesRequestBody, 
        hotelIds: `Array of ${hotelIds.length} hotels: [${hotelIds.slice(0, 3).join(', ')}...]` 
      });
  
      const ratesResponse = await axios.post('https://api.liteapi.travel/v3.0/hotels/rates', ratesRequestBody, {
        headers: {
          'X-API-Key': process.env.LITEAPI_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 25000
      });
  
      // Calculate number of nights
      const nights = Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
  
      // Combine hotel metadata with rate data
      const hotelsWithRates = ratesResponse.data?.data || ratesResponse.data || [];
      
      // Create a map of hotel metadata for quick lookup
      const hotelMetadataMap = new Map<string, any>();
      hotels.forEach((hotel: any) => {
        const id = hotel.id || hotel.hotelId || hotel.hotel_id || hotel.code;
        if (id) {
          hotelMetadataMap.set(id, hotel);
        }
      });
  
      // Enhance rate data with hotel metadata (FULL DATA for frontend)
      const enrichedHotels: HotelWithRates[] = hotelsWithRates.map((rateHotel: any) => {
        const metadata = hotelMetadataMap.get(rateHotel.hotelId);
        return {
          ...rateHotel,
          hotelInfo: metadata || null
        };
      });
  
      // Create lightweight summaries for AI processing
      const hotelSummariesForAI: HotelSummaryForAI[] = enrichedHotels.map((hotel, index) => 
        createHotelSummaryForAI(hotel, index, nights)
      );
  
      console.log(`Step 4: Successfully found rates for ${enrichedHotels.length} hotels`);
      console.log(`Created ${hotelSummariesForAI.length} lightweight summaries for AI processing`);
  
      res.json({
        searchParams: {
          checkin: parsedQuery.checkin,
          checkout: parsedQuery.checkout,
          nights: nights,
          adults: parsedQuery.adults,
          children: parsedQuery.children,
          countryCode: parsedQuery.countryCode,
          cityName: parsedQuery.cityName,
          language: "en",
          currency: 'USD',
          aiSearch: parsedQuery.aiSearch
        },
        totalHotelsFound: hotels.length,
        hotelsWithRates: enrichedHotels.length,
        hotels: enrichedHotels, // Full data for frontend
        hotelSummariesForAI: hotelSummariesForAI, // Lightweight summaries for AI
        searchId: ratesResponse.data?.searchId || null
      });
  
    } catch (error) {
      console.error('Error searching hotel availability:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('API Error Response:', error.response.data);
          res.status(error.response.status).json({
            error: 'LiteAPI error',
            message: error.response.data?.message || error.response.data?.error?.description || 'Unknown API error',
            details: error.response.data,
            step: error.config?.url?.includes('/data/hotels') ? 'hotel_search' : 'rates_search'
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
        error: 'Failed to search hotel availability',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

// Get specific hotel availability by hotel ID
export const getHotelAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { hotelId, checkin, checkout, adults = 2, children = 0 } = req.body;
  
      if (!hotelId || !checkin || !checkout) {
        res.status(400).json({ 
          error: 'Missing required fields: hotelId, checkin, and checkout are required' 
        });
        return;
      }
  
      const requestBody = {
        checkin,
        checkout,
        currency: 'USD',
        guestNationality: 'US',
        hotelIds: [hotelId],
        occupancies: [
          {
            adults,
            children: children ? Array(children).fill(10) : []
          }
        ],
        timeout: 12
      };
  
      console.log('Getting availability for hotel:', hotelId);
  
      const response = await axios.post('https://api.liteapi.travel/v3.0/hotels/rates', requestBody, {
        headers: {
          'X-API-Key': process.env.LITEAPI_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      });
  
      res.json({
        hotelId,
        searchParams: { checkin, checkout, adults, children },
        availability: response.data
      });
  
    } catch (error) {
      console.error('Error getting hotel availability:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        res.status(error.response.status).json({
          error: 'Failed to get hotel availability',
          message: error.response.data?.message || error.response.data?.error?.description || error.message,
          details: error.response.data
        });
        return;
      }
  
      res.status(500).json({ 
        error: 'Failed to get hotel availability',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

// Combined endpoint: parse user input AND search availability
export const parseAndSearchAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userInput } = req.body;
  
      if (!userInput) {
        res.status(400).json({ error: 'userInput is required' });
        return;
      }
  
      console.log('Combined search: Parsing input:', userInput);
  
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
      console.log('Combined search: Parsed query:', parsedQuery);
  
      // Then search hotel availability with the parsed data
      const availabilityResponse = await axios.post(
        `${process.env.BASE_URL || 'http://localhost:3003'}/api/hotels/availability`,
        parsedQuery,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000
        }
      );
  
      res.json(availabilityResponse.data);
  
    } catch (error) {
      console.error('Error in combined parse and availability search:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        res.status(error.response.status).json({
          error: 'Combined availability search failed',
          message: error.response.data?.message || error.response.data?.error?.description || error.message,
          step: error.config?.url?.includes('/parse') ? 'parsing' : 'availability_search',
          details: error.response.data
        });
        return;
      }
  
      res.status(500).json({ 
        error: 'Failed to parse and search availability',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

export const validateDates = (checkin: string, checkout: string) => {
  const checkinDate = new Date(checkin);
  const checkoutDate = new Date(checkout);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (checkinDate < today) {
    return { valid: false, error: 'Check-in date cannot be in the past' };
  }

  if (checkoutDate <= checkinDate) {
    return { valid: false, error: 'Check-out date must be after check-in date' };
  }

  const nights = Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
  return { valid: true, nights };
};