import { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

interface AmadeusAuth {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface ParsedQuery {
  checkin: string;
  checkout: string;
  city: string; // Now expects a 3-letter city code directly
  country?: string;
  price?: string;
  adults: number;
  children: number;
  extra: string[];
}

interface AmadeusHotelOffer {
  type: string;
  hotel: {
    type: string;
    hotelId: string;
    chainCode?: string;
    dupeId: string;
    name: string;
    rating?: string;
    cityCode: string;
    latitude: number;
    longitude: number;
    hotelDistance?: {
      distance: number;
      distanceUnit: string;
    };
    address: {
      lines: string[];
      postalCode: string;
      cityName: string;
      countryCode: string;
    };
    contact?: {
      phone: string;
      fax?: string;
      email?: string;
    };
  };
  available: boolean;
  offers: Array<{
    id: string;
    checkInDate: string;
    checkOutDate: string;
    rateCode?: string;
    rateFamilyEstimated?: {
      code: string;
      type: string;
    };
    category?: string;
    description?: {
      text: string;
      lang: string;
    };
    commission?: {
      percentage: string;
    };
    boardType?: string;
    room: {
      type: string;
      typeEstimated?: {
        category: string;
        beds: number;
        bedType: string;
      };
      description?: {
        text: string;
        lang: string;
      };
    };
    guests: {
      adults: number;
      childAges?: number[];
    };
    price: {
      currency: string;
      base?: string;
      total: string;
      taxes?: Array<{
        amount: string;
        currency: string;
        code: string;
        percentage?: string;
        included: boolean;
        description?: string;
        pricingFrequency?: string;
        pricingMode?: string;
      }>;
      markups?: Array<{
        amount: string;
      }>;
      variations?: {
        average?: {
          base: string;
        };
        changes?: Array<{
          startDate: string;
          endDate: string;
          base: string;
        }>;
      };
    };
    policies?: {
      paymentType?: string;
      guarantee?: {
        acceptedPayments?: {
          creditCards?: string[];
          methods?: string[];
        };
      };
      deposit?: any;
      prepay?: any;
      hold?: any;
      checkInOut?: {
        checkIn?: string;
        checkOut?: string;
      };
      cancellation?: {
        numberOfNights?: number;
        amount?: string;
        deadline?: string;
      };
      refundable?: {
        cancellationRefund?: string;
      };
    };
    self?: string;
  }>;
  self: string;
}

class AmadeusHotelService {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string = 'https://test.api.amadeus.com';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.clientId = process.env.AMADEUS_CLIENT_ID!;
    this.clientSecret = process.env.AMADEUS_CLIENT_SECRET!;
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/security/oauth2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const authData: AmadeusAuth = response.data;
      this.accessToken = authData.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + (authData.expires_in - 300) * 1000;
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting Amadeus access token:', error);
      throw new Error('Failed to authenticate with Amadeus API');
    }
  }

  private validateCityCode(cityCode: string): string {
    // Basic validation for city code format
    const cleanCode = cityCode.toUpperCase().trim();
    
    if (!/^[A-Z]{3}$/.test(cleanCode)) {
      throw new Error(`Invalid city code format: ${cityCode}. City code must be exactly 3 uppercase letters (e.g., PAR, LON, NYC).`);
    }
    
    return cleanCode;
  }

  async searchHotels(query: ParsedQuery): Promise<AmadeusHotelOffer[]> {
    const token = await this.getAccessToken();
    
    try {
      // Validate and use the city code directly
      const cityCode = this.validateCityCode(query.city);
      console.log('Using city code:', cityCode);
      
      const hotelsResponse = await axios.get(
        `${this.baseUrl}/v1/reference-data/locations/hotels/by-city`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            cityCode: cityCode,
          },
        }
      );

      console.log('Hotel List API response status:', hotelsResponse.status);
      console.log('Hotels found:', hotelsResponse.data?.data?.length || 0);

      if (!hotelsResponse.data.data || hotelsResponse.data.data.length === 0) {
        throw new Error(`No hotels found for city code: ${cityCode}. This might be an invalid city code or the city might not have hotels in the Amadeus database.`);
      }

      // Get hotel IDs (limit to 50 for performance)
      const hotelIds = hotelsResponse.data.data
        .slice(0, 50)
        .map((hotel: any) => hotel.hotelId);

      console.log(`Found ${hotelIds.length} hotels, getting availability...`);

      // Step 2: Get hotel offers with availability and pricing using Hotel Offers API
      const offersResponse = await axios.get(
        `${this.baseUrl}/v3/shopping/hotel-offers`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            hotelIds: hotelIds.join(','),
            checkInDate: query.checkin,
            checkOutDate: query.checkout,
            adults: query.adults,
            ...(query.children > 0 && { children: query.children }),
            currency: 'USD',
            includeClosed: false,
            bestRateOnly: true,
          },
        }
      );

      console.log('Hotel Offers API response:', offersResponse.data?.data?.length || 0, 'offers found');

      return offersResponse.data.data || [];
    } catch (error: any) {
      console.error('Error searching hotels:', error.response?.data || error.message);
      throw error;
    }
  }
}

const amadeusService = new AmadeusHotelService();

export const searchHotels = async (req: Request, res: Response): Promise<void> => {
  try {
    const query: ParsedQuery = req.body;

    // Validate required fields
    if (!query.checkin || !query.checkout || !query.city) {
      res.status(400).json({
        error: 'Missing required fields: checkin, checkout, and city are required',
      });
      return;
    }

    // Validate city code format
    if (!/^[A-Z]{3}$/i.test(query.city.trim())) {
      res.status(400).json({
        error: 'Invalid city code format. City must be a 3-letter code (e.g., PAR, LON, NYC, IST).',
      });
      return;
    }

    // Validate date format and logic
    const checkinDate = new Date(query.checkin);
    const checkoutDate = new Date(query.checkout);
    
    if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
      res.status(400).json({
        error: 'Invalid date format. Use YYYY-MM-DD format',
      });
      return;
    }

    if (checkoutDate <= checkinDate) {
      res.status(400).json({
        error: 'Checkout date must be after checkin date',
      });
      return;
    }

    // Validate adults count
    if (query.adults < 1 || query.adults > 9) {
      res.status(400).json({
        error: 'Adults count must be between 1 and 9',
      });
      return;
    }

    console.log('Searching hotels with query:', query);

    const hotels = await amadeusService.searchHotels(query);

    // Format response with essential info only
    const formattedHotels = hotels.map((hotel) => ({
      hotelId: hotel.hotel.hotelId,
      name: hotel.hotel.name,
      chainCode: hotel.hotel.chainCode,
      rating: hotel.hotel.rating,
      latitude: hotel.hotel.latitude,
      longitude: hotel.hotel.longitude,
      address: {
        cityName: hotel.hotel.address?.cityName || 'Unknown',
        countryCode: hotel.hotel.address?.countryCode || 'Unknown',
      },
      available: hotel.available,
      bestOffer: hotel.offers && hotel.offers.length > 0 ? {
        id: hotel.offers[0].id,
        price: {
          currency: hotel.offers[0].price.currency,
          total: hotel.offers[0].price.total,
          base: hotel.offers[0].price.base,
        },
        room: {
          type: hotel.offers[0].room.type,
          category: hotel.offers[0].room.typeEstimated?.category,
          beds: hotel.offers[0].room.typeEstimated?.beds,
          bedType: hotel.offers[0].room.typeEstimated?.bedType,
        },
        cancellation: hotel.offers[0].policies?.refundable?.cancellationRefund || 'UNKNOWN',
        boardType: hotel.offers[0].boardType,
      } : null,
    }));

    // Create simple text list for OpenAI processing
    const hotelSummaryText = formattedHotels.map((hotel, index) => {
      const price = hotel.bestOffer ? `${hotel.bestOffer.price.total} ${hotel.bestOffer.price.currency}` : 'Price not available';
      const chain = hotel.chainCode ? ` (${hotel.chainCode})` : '';
      const rating = hotel.rating ? ` - ${hotel.rating} stars` : '';
      const location = `${hotel.address.cityName}, ${hotel.address.countryCode}`;
      const roomInfo = hotel.bestOffer ? ` - ${hotel.bestOffer.room.category || 'Standard'} room with ${hotel.bestOffer.room.beds || 1} ${hotel.bestOffer.room.bedType || 'bed'}` : '';
      
      return `${index + 1}. ${hotel.name}${chain}${rating} in ${location} - ${price}${roomInfo}`;
    }).join('\n');

    res.json({
      success: true,
      count: formattedHotels.length,
      query: {
        city: query.city.toUpperCase(),
        country: query.country,
        checkin: query.checkin,
        checkout: query.checkout,
        adults: query.adults,
        children: query.children,
      },
      hotels: formattedHotels,
      hotelSummaryText: hotelSummaryText
    });

  } catch (error: any) {
    console.error('Error in searchHotels controller:', error);
    
    if (error.response?.status === 401) {
      res.status(401).json({
        error: 'Amadeus API authentication failed. Check your credentials.',
      });
      return;
    }

    if (error.response?.status === 400) {
      res.status(400).json({
        error: `Amadeus API error: ${error.response.data?.error_description || error.message}`,
      });
      return;
    }

    res.status(500).json({
      error: error.message || 'Failed to search hotels',
    });
  }
};