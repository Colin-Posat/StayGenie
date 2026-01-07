// Hotel search types and interfaces - UPDATED WITH COORDINATE-BASED SEARCH
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

// UPDATED: ParsedSearchQuery with coordinate-based search
export interface ParsedSearchQuery {
  // Date fields
  checkin: string;
  checkout: string;
  
  // NEW: Location fields (coordinate-based search)
  specificPlace: string;           // e.g., "Central Park, New York, New York, United States"
  fullPlaceName: string;            // Full geocoded place name from MapBox
  latitude: number;                 // Latitude coordinate
  longitude: number;                // Longitude coordinate
  searchRadius: number;             // Search radius in meters (minimum 10000)
  
  // DEPRECATED: Old location fields (kept for backward compatibility, but not used in search)
  countryCode?: string;             // ISO-2 country code (deprecated)
  cityName?: string;                // City name (deprecated)
  
  // Guest information
  language?: string;                // ISO 639-1 language code, default 'en'
  adults: number;                   // Number of adults, default 2
  children: number;                 // Number of children, default 0
  
  // AI Search context string - combines price preferences + specific requirements
  aiSearch: string;                 // Examples:
                                    // - "cheap hotels with rooftop bar"
                                    // - "luxury hotels over $400 per night with spa"
                                    // - "romantic hotels with infinity pool"
                                    // - "hotels under $200 per night"
  
  // Price fields (optional - now primarily used in aiSearch string)
  minCost?: number | null;          // Minimum cost per night in USD
  maxCost?: number | null;          // Maximum cost per night in USD
  cheap?: boolean;                  // True if user wants budget/cheap options
  findCheapestOnes?: boolean;       // True if purely price-focused search
  
  // Rating fields
  highlyRated?: boolean;            // True if user wants highly rated hotels
  starRating?: number | null;       // Specific star rating 1-5 if mentioned
  
  // Facility/amenity filtering
  facilityCategories?: string[];    // Array of facility category names from parser
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
  
  // NEW: Hotel images from API response
  hotelImages?: Array<{
    url: string;
    urlHd?: string;
    caption?: string;
  }>;
  
  // Amenities and facilities
  amenities?: string[] | Array<{ name: string; [key: string]: unknown }>;
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

// NEW: Cancellation policy interfaces
export interface CancelPolicyInfo {
  cancelTime: string;
  amount: number;
  currency: string;
  type: string;
  timezone: string;
}

export interface CancellationPolicies {
  cancelPolicyInfos?: CancelPolicyInfo[];
  hotelRemarks?: string[];
  refundableTag?: string; // ← KEY FIELD: "RFN", "NRF", etc.
}

// UPDATED: Rate interface with cancellation policies
export interface Rate {
  rateId?: string;
  occupancyNumber?: number;
  name?: string;
  maxOccupancy?: number;
  adultCount?: number;
  childCount?: number;
  boardType?: string;
  boardName?: string;
  remarks?: string;
  priceType?: string;
  commission?: Array<{
    amount: number;
    currency: string;
  }>;
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
  // NEW: Cancellation policies with refundable tag
  cancellationPolicies?: CancellationPolicies;
  paymentTypes?: string[];
}

export interface RoomType {
  roomTypeId?: string;
  offerId?: string;
  supplier?: string;
  supplierId?: number;
  rates?: Rate[];
  offerRetailRate?: {
    amount: number;
    currency: string;
  };
  suggestedSellingPrice?: {
    amount: number;
    currency: string;
    source: string;
  };
  offerInitialPrice?: {
    amount: number;
    currency: string;
  };
  priceType?: string;
  rateType?: string;
}

export interface HotelWithRates {
  hotelId: string;
  roomTypes?: RoomType[];
  hotelInfo?: HotelInfo;
}

export interface EnrichedHotel extends HotelWithRates {
  hotelInfo: HotelInfo;
}

// UPDATED: HotelSummaryForAI with refundable policy
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
  // NEW: Refundable policy fields
  isRefundable: boolean;
  refundableTag: string | null;
  refundableInfo: string;
  distanceFromSearch: any;
}

export interface AIRecommendation {
  hotelId: string;
  hotelName: string;
  aiMatchPercent: number;
  whyItMatches: string;
  funFacts: string[];
  nearbyAttractions: string[];
  locationHighlight: string;
  guestInsights: string;
  sentimentData: any;
  thirdImageHd: string | null;
}

// UPDATED: HotelRecommendation with refundable policy
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
  // NEW: Refundable policy fields
  isRefundable: boolean;
  refundableTag: string | null;
  refundableInfo: string;
  // NEW: Detailed cancellation policies for insights
  cancellationPolicies?: Array<{
    refundableTag?: string;
    cancelPolicyInfos: CancelPolicyInfo[];
    hotelRemarks: string[];
  }>;
}

// NEW: Refundable policy utility type
export interface RefundablePolicy {
  isRefundable: boolean;
  refundableTag: string | null;
  refundableInfo: string;
}

// NEW: Extended price information with refundable context
export interface PriceInfo {
  priceRange: {
    min: number;
    max: number;
    currency: string;
    display: string;
  } | null;
  pricePerNightInfo: string;
  suggestedPrice: {
    amount: number;
    currency: string;
    display: string;
    totalAmount: number;
  } | null;
  priceProvider: string | null;
}

// UPDATED: Hotel search response type
export interface HotelSearchResponse {
  searchParams: ParsedSearchQuery & {
    nights: number;
    currency: string;
  };
  totalHotelsFound: number;
  hotelsWithRates: number;
  matchedHotelsCount: number;
  hotels: Array<HotelRecommendation & {
    summarizedInfo: {
      name: string;
      description: string;
      amenities: string[];
      starRating: number;
      reviewCount: number;
      pricePerNight: string;
      location: string;
      city: string;
      country: string;
      // NEW: Refundable info in summary
      isRefundable: boolean;
      refundableInfo: string;
    };
  }>;
  aiMatchingCompleted: boolean;
  generatedAt: string;
  searchId: string;
  aiModel: string;
  performance: {
    totalTimeMs: number;
    stepBreakdown: Array<{
      step: string;
      duration?: number;
      status: string;
      percentage: string;
      details?: Record<string, unknown>;
    }>;
    bottlenecks: Array<{
      step: string;
      duration?: number;
      status: string;
      percentage: string;
      details?: Record<string, unknown>;
    }>;
  };
}