// TestModeData.ts - Simple pre-loaded test data for development and testing

// Define types directly in this file since we don't have a separate types file
interface OptimizedSearchResponse {
    searchParams: {
      checkin: string;
      checkout: string;
      countryCode: string;
      cityName: string;
      language: string;
      adults: number;
      children: number;
      aiSearch: string;
      nights: number;
      currency: string;
      minCost?: number | null;
      maxCost?: number | null;
    };
    recommendations: HotelRecommendation[];
    insightsPending: boolean;
    searchId: string;
    performance: {
      totalTimeMs: number;
      optimized: boolean;
    };
    totalHotelsFound: number;
    hotelsWithRates: number;
    aiRecommendationsCount: number;
    aiRecommendationsAvailable: boolean;
    generatedAt: string;
  }
  
  interface HotelRecommendation {
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
    };
    
    funFacts: string[];
    nearbyAttractions: string[];
    locationHighlight: string;
    matchType: string;
    address: string;
    amenities: string[];
    description: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    priceRange?: {
      min: number;
      max: number;
      currency: string;
      display: string;
    };
    totalRooms: number;
    hasAvailability: boolean;
    roomTypes?: any[];
    reviewCount: number;
    guestInsights: string;
    city: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
    topAmenities: string[];
  }
  
  interface AISuggestion {
    id: string;
    text: string;
    category?: string;
    reasoning?: string;
    priority?: string;
  }
  
  // Simple pre-loaded AI suggestions
  export const testAISuggestions: AISuggestion[] = [
    {
      id: 'test-ai-1',
      text: 'under $200 per night',
      category: 'budget',
      reasoning: 'Good mid-range budget',
      priority: 'high'
    },
    {
      id: 'test-ai-2',
      text: 'with free WiFi',
      category: 'amenities',
      reasoning: 'Essential modern amenity',
      priority: 'high'
    },
    {
      id: 'test-ai-3',
      text: 'with pool access',
      category: 'amenities',
      reasoning: 'Recreation and relaxation',
      priority: 'medium'
    },
    {
      id: 'test-ai-4',
      text: 'in city center',
      category: 'location',
      reasoning: 'Convenient location',
      priority: 'medium'
    },
    {
      id: 'test-ai-5',
      text: 'with 4+ star rating',
      category: 'quality',
      reasoning: 'Quality assurance',
      priority: 'medium'
    },
    {
      id: 'test-ai-6',
      text: 'with free breakfast',
      category: 'amenities',
      reasoning: 'Added value',
      priority: 'low'
    }
  ];
  
  // Simple pre-loaded hotel recommendations
  export const testHotelRecommendations: HotelRecommendation[] = [
    {
      hotelId: 'test-hotel-1',
      name: 'Grand Plaza Hotel',
      aiMatchPercent: 92,
      whyItMatches: 'Perfect downtown location with excellent amenities and high ratings',
      starRating: 4.5,
      images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'],
      pricePerNight: {
        amount: 245,
        totalAmount: 490,
        currency: 'USD',
        display: '$245/night',
        provider: 'Booking.com',
        isSupplierPrice: true
      },
      funFacts: ['Historic building from 1920s', 'Award-winning restaurant', 'Rooftop garden terrace'],
      nearbyAttractions: ['Central Park', 'Art Museum', 'Shopping District'],
      locationHighlight: 'Heart of downtown, walking distance to attractions',
      matchType: 'perfect',
      address: '123 Main Street, Downtown',
      amenities: ['Free WiFi', 'Pool', 'Spa', 'Restaurant', 'Business Center'],
      description: 'Luxury downtown hotel with exceptional service and modern amenities',
      coordinates: { latitude: 40.7589, longitude: -73.9851 },
      totalRooms: 156,
      hasAvailability: true,
      reviewCount: 2847,
      guestInsights: 'Guests love the central location and excellent service. The rooftop terrace offers stunning city views.',
      city: 'New York',
      country: 'USA',
      latitude: 40.7589,
      longitude: -73.9851,
      topAmenities: ['City Views', 'Rooftop Terrace', 'Concierge']
    },
    {
      hotelId: 'test-hotel-2',
      name: 'Ocean Breeze Resort',
      aiMatchPercent: 88,
      whyItMatches: 'Beautiful beachfront location with stunning ocean views and resort amenities',
      starRating: 4.3,
      images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'],
      pricePerNight: {
        amount: 185,
        totalAmount: 370,
        currency: 'USD',
        display: '$185/night',
        provider: 'Expedia',
        isSupplierPrice: false
      },
      funFacts: ['Private beach access', 'Award-winning spa', 'Sustainable tourism certified'],
      nearbyAttractions: ['Private Beach', 'Marina', 'Coastal Hiking Trail'],
      locationHighlight: 'Beachfront location with private beach access',
      matchType: 'excellent',
      address: '456 Ocean Drive, Seaside',
      amenities: ['Ocean View', 'Private Beach', 'Spa', 'Pool', 'Water Sports'],
      description: 'Beachfront resort offering relaxation and adventure in a stunning coastal setting',
      coordinates: { latitude: 25.7617, longitude: -80.1918 },
      totalRooms: 89,
      hasAvailability: true,
      reviewCount: 1523,
      guestInsights: 'Perfect for beach lovers. The private beach and spa are exceptional. Great for romantic getaways.',
      city: 'Miami',
      country: 'USA',
      latitude: 25.7617,
      longitude: -80.1918,
      topAmenities: ['Ocean View', 'Private Beach', 'Spa Services']
    },
    {
      hotelId: 'test-hotel-3',
      name: 'Boutique Urban Suites',
      aiMatchPercent: 85,
      whyItMatches: 'Stylish boutique hotel in trendy neighborhood with modern amenities',
      starRating: 4.1,
      images: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80'],
      pricePerNight: {
        amount: 165,
        totalAmount: 330,
        currency: 'USD',
        display: '$165/night',
        provider: 'Direct',
        isSupplierPrice: true
      },
      funFacts: ['Converted historic warehouse', 'Features local artist work', 'Zero-waste initiative'],
      nearbyAttractions: ['Art Galleries', 'Trendy Restaurants', 'Vintage Shopping'],
      locationHighlight: 'Hip neighborhood with great nightlife and dining',
      matchType: 'excellent',
      address: '789 Artisan Lane, Creative District',
      amenities: ['Modern Design', 'Fitness Center', 'Coffee Bar', 'Pet-Friendly', 'Local Art'],
      description: 'Contemporary boutique hotel showcasing local culture and sustainable practices',
      coordinates: { latitude: 34.0522, longitude: -118.2437 },
      totalRooms: 45,
      hasAvailability: true,
      reviewCount: 876,
      guestInsights: 'Unique character and style. Perfect for travelers who appreciate art and culture. Great local neighborhood.',
      city: 'Los Angeles',
      country: 'USA',
      latitude: 34.0522,
      longitude: -118.2437,
      topAmenities: ['Modern Design', 'Local Art', 'Coffee Bar']
    },
    {
      hotelId: 'test-hotel-4',
      name: 'Mountain View Lodge',
      aiMatchPercent: 90,
      whyItMatches: 'Scenic mountain location perfect for nature lovers with outdoor activities',
      starRating: 4.4,
      images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80'],
      pricePerNight: {
        amount: 195,
        totalAmount: 390,
        currency: 'USD',
        display: '$195/night',
        provider: 'Mountain Resorts',
        isSupplierPrice: true
      },
      funFacts: ['Built with sustainable materials', 'Wildlife viewing opportunities', 'Farm-to-table restaurant'],
      nearbyAttractions: ['Hiking Trails', 'Ski Resort', 'National Park'],
      locationHighlight: 'Surrounded by mountains with panoramic views',
      matchType: 'perfect',
      address: '321 Mountain Ridge Road, Alpine Valley',
      amenities: ['Mountain Views', 'Hiking Access', 'Restaurant', 'Fireplace', 'Wildlife Tours'],
      description: 'Mountain lodge offering outdoor adventures and breathtaking natural scenery',
      coordinates: { latitude: 39.6403, longitude: -106.3742 },
      totalRooms: 67,
      hasAvailability: true,
      reviewCount: 1342,
      guestInsights: 'Breathtaking mountain views and excellent outdoor activities. The restaurant serves amazing local cuisine.',
      city: 'Vail',
      country: 'USA',
      latitude: 39.6403,
      longitude: -106.3742,
      topAmenities: ['Mountain Views', 'Hiking Access', 'Farm-to-Table']
    },
    {
      hotelId: 'test-hotel-5',
      name: 'Business Comfort Inn',
      aiMatchPercent: 79,
      whyItMatches: 'Reliable business hotel with essential amenities and convenient location',
      starRating: 3.9,
      images: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80'],
      pricePerNight: {
        amount: 125,
        totalAmount: 250,
        currency: 'USD',
        display: '$125/night',
        provider: 'Choice Hotels',
        isSupplierPrice: false
      },
      funFacts: ['Recently renovated', 'Eco-friendly practices', 'Free breakfast since 1995'],
      nearbyAttractions: ['Business District', 'Convention Center', 'Airport Shuttle'],
      locationHighlight: 'Near business district with airport access',
      matchType: 'good',
      address: '654 Corporate Boulevard, Business Park',
      amenities: ['Free Breakfast', 'Business Center', 'Free WiFi', 'Parking', 'Airport Shuttle'],
      description: 'Comfortable business hotel offering value and convenience for travelers',
      coordinates: { latitude: 41.8781, longitude: -87.6298 },
      totalRooms: 112,
      hasAvailability: true,
      reviewCount: 967,
      guestInsights: 'Great value for business travelers. Clean rooms, reliable service, and convenient location near the airport.',
      city: 'Chicago',
      country: 'USA',
      latitude: 41.8781,
      longitude: -87.6298,
      topAmenities: ['Free Breakfast', 'Business Center', 'Airport Shuttle']
    }
  ];
  
  // Generate test search response
  export const generateTestSearchResponse = (searchQuery: string): OptimizedSearchResponse => {
    return {
      searchParams: {
        checkin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        checkout: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 32 days from now
        countryCode: 'US',
        cityName: 'Test City',
        language: 'en',
        adults: 2,
        children: 0,
        aiSearch: searchQuery,
        nights: 2,
        currency: 'USD',
        minCost: null,
        maxCost: null,
      },
      recommendations: testHotelRecommendations,
      insightsPending: false, // No insights loading in test mode
      searchId: `test-search-${Date.now()}`,
      performance: {
        totalTimeMs: 150, // Simulated fast response
        optimized: true,
      },
      totalHotelsFound: 5,
      hotelsWithRates: 5,
      aiRecommendationsCount: 5,
      aiRecommendationsAvailable: true,
      generatedAt: new Date().toISOString(),
    };
  };