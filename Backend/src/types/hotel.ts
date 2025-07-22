// Hotel search types and interfaces - UPDATED
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

// UPDATED: Extended HotelInfo interface to match actual API response
export interface HotelInfo {
  // Basic hotel identifiers
  id?: string;
  name?: string;
  address?: string;
  
  // Rating fields - API uses different names
  rating?: number;
  starRating?: number;
  stars?: number;  // ← ADDED: API uses "stars": 3
  
  // Description fields - API uses different names
  description?: string;
  hotelDescription?: string;  // ← ADDED: API uses "hotelDescription"
  
  // Location data - API provides coordinates at top level
  latitude?: number;
  longitude?: number;  
  city?: string;
  country?: string;
  zip?: string;        // ← ADDED: API provides zip codes
  
  // Nested coordinate structures (fallback)
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  
  // Images and media
  images?: string[];
  main_photo?: string;   // ← API provides this
  thumbnail?: string;    // ← API provides this
  
  // Amenities and facilities
  amenities?: string[];
  facilityIds?: number[];  // ← ADDED: API provides facility IDs
  
  // Hotel classification
  hotelTypeId?: number;    // ← ADDED: API provides hotel type
  chainId?: number;        // ← ADDED: API provides chain info
  chain?: string;          // ← ADDED: API provides chain name
  
  // Currency and pricing context
  currency?: string;       // ← ADDED: API provides "EUR", "USD", etc.
  
  // Additional fields
  rooms?: Array<Record<string, unknown>>;
  reviewCount?: number;
  guestInsights?: string;
  
  // Detailed descriptions (API provides these)
  HeadLine?: string;       // ← ADDED: API provides headline
  Rooms?: string;          // ← ADDED: API provides room descriptions
  Dining?: string;         // ← ADDED: API provides dining info
  business_amenities?: string;  // ← ADDED: API provides business amenities
  Attractions?: string;    // ← ADDED: API provides attraction info
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