// Hotel search types and interfaces
export interface SentimentCategory {
  name: string;
  rating: number;
  description: string;
}

export interface SentimentAnalysis {
  cons: string[];
  pros: string[];
  categories: SentimentCategory[];
}

export interface HotelSentimentData {
  sentimentAnalysis: SentimentAnalysis;
  sentiment_updated_at?: string;
  data?: Array<Record<string, unknown>>;
  total?: number;
}

export interface ParsedSearchQuery {
  checkin: string;
  checkout: string;
  countryCode: string;
  cityName: string;
  language?: string;
  adults: number;
  children: number;
  aiSearch: string;
  minCost?: number | null;  
  maxCost?: number | null; 
}

export interface HotelInfo {
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
  city?: string;
  country?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  rooms?: Array<Record<string, unknown>>;
  reviewCount?: number;
  guestInsights?: string;
}

export interface Rate {
  retailRate?: {
    total?: Array<{
      amount: number;
      currency: string;
    }>;
    suggestedSellingPrice?: Array<{
      amount: number;
      currency: string;
      source: string;
    }>;
    initialPrice?: Array<{
      amount: number;
      currency: string;
    }>;
    taxesAndFees?: Array<{
      included: boolean;
      description: string;
      amount: number;
      currency: string;
    }>;
  };
}

export interface RoomType {
  rates?: Rate[];
}

export interface HotelWithRates {
  hotelId: string;
  roomTypes?: RoomType[];
  hotelInfo?: HotelInfo;
}

export interface EnrichedHotel extends HotelWithRates {
  hotelInfo: HotelInfo;
}

export interface HotelSummaryForAI {
  index: number;
  hotelId: string;
  name: string;
  location: string;
  description: string;
  pricePerNight: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  topAmenities: string[];
  starRating: number;
  reviewCount: number;
}

export interface AIRecommendation {
  hotelName: string;
  aiMatchPercent: number;
  whyItMatches: string;
  funFacts: string[];
  nearbyAttractions: string[];
  locationHighlight: string;
}

export interface HotelRecommendation {
  hotelId: string;
  name: string;
  aiMatchPercent: number;
  whyItMatches: string;
  starRating: number;
  images: string[];
  pricePerNight: {
    amount: number;
    totalAmount: number;
    currency: string;
    display: string;
    provider: string | null;
    isSupplierPrice: boolean;
  } | null;
  reviewCount: number;
  guestInsights: string;
  funFacts: string[];
  nearbyAttractions: string[];
  locationHighlight: string;
  address: string;
  amenities: Array<string | { name: string; [key: string]: unknown }>;
  description: string;
  coordinates: { latitude: number; longitude: number } | null;
  priceRange: { min: number; max: number; currency: string; display: string } | null;
  totalRooms: number;
  hasAvailability: boolean;
  roomTypes: RoomType[];
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  topAmenities: string[];
  sentimentData: HotelSentimentData | null;
} 