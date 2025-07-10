// HomeScreen.tsx - Updated to handle enhanced pricing with suggested prices and providers
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import SwipeableStoryView from '../components/StoryView/SwipeableStoryView';
import AISearchOverlay from '../components/HomeScreenTop/AiSearchOverlay';
import LoadingScreen from '../components/HomeScreenTop/LoadingScreen';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

interface RouteParams {
  searchQuery?: string;
}

// Navigation types
type FindStackParamList = {
  InitialSearch: undefined;
  Results: {
    searchQuery?: string;
  };
};

type HomeScreenNavigationProp = StackNavigationProp<FindStackParamList>;

// UPDATED: Enhanced interfaces for new pricing structure
interface SmartSearchResponse {
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
  totalHotelsFound: number;
  hotelsWithRates: number;
  aiRecommendationsCount: number;
  recommendations?: HotelRecommendation[];
  allHotels?: HotelWithRates[];
  hotels?: HotelWithRates[];
  aiRecommendationsAvailable: boolean;
  generatedAt: string;
  searchId?: string;
  performance?: {
    totalTimeMs: number;
    optimized: boolean;
  };
}

interface HotelRecommendation {
  hotelId: string;
  name: string;
  aiMatchPercent: number;
  whyItMatches: string;
  starRating: number;
  images: string[];
  
  // UPDATED: Enhanced pricing structure
  pricePerNight?: {
    amount: number;
    totalAmount: number;
    currency: string;
    display: string;
    provider: string | null;
    isSupplierPrice: boolean;
  };
  
  // NEW: Suggested price and provider fields
  suggestedPrice?: {
    amount: number;
    currency: string;
    display: string;
  };
  priceProvider?: string | null;
  
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

interface HotelWithRates {
  hotelId: string;
  roomTypes?: any[];
  hotelInfo?: {
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
    rooms?: any[];
    reviewCount?: number;
    guestInsights?: string;
  };
}

interface Hotel {
  id: number;
  name: string;
  image: string;
  price: number;
  originalPrice: number;
  priceComparison: string;
  rating: number;
  reviews: number;
  safetyRating: number;
  transitDistance: string;
  tags: string[];
  location: string;
  features: string[];
  aiExcerpt?: string;
  whyItMatches?: string;
  funFacts?: string[];
  aiMatchPercent?: number;
  
  // UPDATED: Enhanced pricing structure to match HomeScreen
  pricePerNight?: {
    amount: number;
    totalAmount: number;
    currency: string;
    display: string;
    provider: string | null;
    isSupplierPrice: boolean;
  };
  
  // NEW: Additional pricing fields
  suggestedPrice?: {
    amount: number;
    currency: string;
    display: string;
  };
  priceProvider?: string | null;
  
  roomTypes?: any[];
  guestInsights?: string;
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  topAmenities?: string[];
  nearbyAttractions?: string[];
  locationHighlight?: string;
  matchType?: string;
  hasAvailability?: boolean;
  totalRooms?: number;
  fullDescription?: string;
  fullAddress?: string;
}
// Test mode configuration
const TEST_MODE = false; // Set to true to enable test mode, false for normal operation

// Updated mock hotels data with new pricing structure
const mockHotels: Hotel[] = [
  {
    id: 1,
    name: "Maui Ocean Breeze Resort",
    image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80",
    price: 285,
    originalPrice: 320,
    priceComparison: "11% below average",
    rating: 4.7,
    reviews: 1548,
    safetyRating: 9.3,
    transitDistance: "3 min walk to beach",
    tags: ["Ocean view", "Fine dining", "Spa"],
    location: "Wailea, Maui",
    features: ["Ocean view rooms", "Award-winning restaurant", "Full-service spa"],
    aiExcerpt: "Panoramic ocean views from all rooms plus award-winning seafood restaurant.",
    whyItMatches: "Perfect oceanfront location with luxury amenities you're looking for",
    funFacts: ["Home to endangered Hawaiian monk seals", "Features a rooftop infinity pool"],
    aiMatchPercent: 95,
    guestInsights: "Guests love the stunning ocean views and exceptional spa services.",
    city: "Wailea",
    country: "United States",
    latitude: 20.6916,
    longitude: -156.4422,
    topAmenities: ["Ocean View", "Spa Services", "Fine Dining"],
    nearbyAttractions: ["Wailea Beach", "Shops at Wailea"],
    locationHighlight: "Direct beachfront access with pristine white sand",
    matchType: "perfect",
    hasAvailability: true,
    totalRooms: 24,
    // NEW: Enhanced pricing data
    suggestedPrice: {
      amount: 265,
      currency: "USD",
      display: "265"
    },
    priceProvider: "Booking.com",
    pricePerNight: {
      amount: 265,
      totalAmount: 530,
      currency: "USD",
      display: "265/night",
      provider: "Booking.com",
      isSupplierPrice: true
    }
  },
  {
    id: 2,
    name: "Tokyo Business District Hotel",
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80",
    price: 189,
    originalPrice: 220,
    priceComparison: "15% below average",
    rating: 4.6,
    reviews: 1248,
    safetyRating: 9.2,
    transitDistance: "2 min walk to subway",
    tags: ["Business center", "Free WiFi", "24/7 concierge"],
    location: "Shibuya, Tokyo",
    features: ["High-speed internet", "Meeting rooms", "Executive lounge"],
    aiExcerpt: "Modern business hotel in heart of Tokyo with excellent connectivity.",
    whyItMatches: "Ideal for business travelers with modern amenities and prime location",
    funFacts: ["Located in world's busiest pedestrian crossing", "Offers authentic Japanese breakfast"],
    aiMatchPercent: 88,
    guestInsights: "Guests love the efficient check-in process and proximity to major offices.",
    city: "Tokyo",
    country: "Japan",
    latitude: 35.6586,
    longitude: 139.7003,
    topAmenities: ["High-Speed WiFi", "Business Center", "Executive Lounge"],
    nearbyAttractions: ["Shibuya Crossing", "Meiji Shrine"],
    locationHighlight: "Heart of Tokyo's business and entertainment district",
    matchType: "good",
    hasAvailability: true,
    totalRooms: 18,
    // NEW: Enhanced pricing data
    suggestedPrice: {
      amount: 175,
      currency: "USD",
      display: "175"
    },
    priceProvider: "Expedia",
    pricePerNight: {
      amount: 175,
      totalAmount: 350,
      currency: "USD",
      display: "175/night",
      provider: "Expedia",
      isSupplierPrice: true
    }
  }
];

// Base URL
const BASE_URL = 'http://localhost:3003';

const HomeScreen = () => {
  const route = useRoute();
  const params = route.params as RouteParams;
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SmartSearchResponse | null>(null);
  const [displayHotels, setDisplayHotels] = useState<Hotel[]>(TEST_MODE ? mockHotels : []);
  const [checkInDate, setCheckInDate] = useState<Date>(() => {
    const today = new Date();
    today.setDate(today.getDate() + 30);
    return today;
  });
  const [checkOutDate, setCheckOutDate] = useState<Date>(() => {
    const today = new Date();
    today.setDate(today.getDate() + 32);
    return today;
  });
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [showAiOverlay, setShowAiOverlay] = useState(false);

  // Initialize test mode data on component mount
  useEffect(() => {
    if (TEST_MODE && displayHotels.length === 0) {
      console.log('🧪 TEST MODE: Loading mock hotels');
      setDisplayHotels(mockHotels);
      setSearchQuery("Luxury hotels with amazing amenities");
      
      // Set mock search results
      const mockSearchResults: SmartSearchResponse = {
        searchParams: {
          checkin: checkInDate.toISOString().split('T')[0],
          checkout: checkOutDate.toISOString().split('T')[0],
          countryCode: 'US',
          cityName: 'Various',
          language: 'en',
          adults: adults,
          children: children,
          aiSearch: "Luxury hotels with amazing amenities",
          nights: 2,
          currency: 'USD'
        },
        totalHotelsFound: 3,
        hotelsWithRates: 3,
        aiRecommendationsCount: 3,
        aiRecommendationsAvailable: true,
        generatedAt: new Date().toISOString(),
        searchId: 'test-mode-search'
      };
      setSearchResults(mockSearchResults);
    }
  }, [TEST_MODE, displayHotels.length, checkInDate, checkOutDate, adults, children]);

  // API request helper
  const makeRequest = async (endpoint: string, data: any) => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`❌ API Error: ${error.message}`);
      throw error;
    }
  };

  // UPDATED: Enhanced convert recommendation to display format with new pricing
  const convertRecommendationToDisplayHotel = (recommendation: HotelRecommendation, index: number): Hotel => {
    console.log('🔍 DEBUG - Raw recommendation data for', recommendation.name);
    console.log('   funFacts:', recommendation.funFacts);
    console.log('   nearbyAttractions:', recommendation.nearbyAttractions);
    console.log('   pricePerNight:', recommendation.pricePerNight);
    console.log('   suggestedPrice:', recommendation.suggestedPrice);
    console.log('   priceProvider:', recommendation.priceProvider);
    
    const getHotelImage = (recommendation: HotelRecommendation): string => {
      const defaultImage = "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80";
      
      if (recommendation.images && recommendation.images.length > 0) {
        const firstImage = recommendation.images[0];
        if (firstImage && typeof firstImage === 'string' && firstImage.trim() !== '') {
          if (firstImage.startsWith('http://') || firstImage.startsWith('https://') || firstImage.startsWith('//')) {
            return firstImage;
          }
        }
      }
      
      return defaultImage;
    };

    // UPDATED: Enhanced pricing calculation with provider support
    let price = 200;
    let originalPrice = price * 1.15;
    let priceComparison = "Standard rate";

    // Use suggested price if available, otherwise fall back to pricePerNight
    if (recommendation.suggestedPrice) {
      price = recommendation.suggestedPrice.amount;
      originalPrice = Math.round(price * 1.15);
      
      if (recommendation.priceProvider) {
        priceComparison = `via ${recommendation.priceProvider}`;
      } else {
        priceComparison = "Suggested rate";
      }
    } else if (recommendation.pricePerNight) {
      price = recommendation.pricePerNight.amount;
      originalPrice = Math.round(price * 1.15);
      priceComparison = recommendation.pricePerNight.display;
      
      if (recommendation.pricePerNight.provider) {
        priceComparison += ` (${recommendation.pricePerNight.provider})`;
      }
    } else if (recommendation.priceRange) {
      price = recommendation.priceRange.min;
      originalPrice = Math.round(price * 1.15);
      priceComparison = recommendation.priceRange.display;
    }

    // Generate realistic transit distance
    const generateTransitDistance = (city: string, nearbyAttractions: string[]): string => {
      if (nearbyAttractions.length > 0) {
        const mainAttraction = nearbyAttractions[0].replace('Near ', '');
        const distances = ['2 min walk', '5 min walk', '8 min walk', '3 min drive', '1 min walk'];
        return `${distances[Math.floor(Math.random() * distances.length)]} to ${mainAttraction}`;
      }
      
      const cityDistances: Record<string, string> = {
        'Tokyo': '2 min walk to subway',
        'Paris': '5 min walk to Metro',
        'New York': '3 min walk to subway',
        'London': '4 min walk to tube',
        'Wailea': '3 min walk to beach'
      };
      
      return cityDistances[city] || '5 min walk to main area';
    };

    return {
      id: index + 1,
      name: recommendation.name,
      image: getHotelImage(recommendation),
      price: Math.round(price),
      originalPrice: Math.round(originalPrice),
      priceComparison: priceComparison,
      rating: recommendation.starRating || 4.0,
      reviews: recommendation.reviewCount || Math.floor(Math.random() * 1000) + 100,
      safetyRating: 8.5 + Math.random() * 1.5,
      transitDistance: generateTransitDistance(recommendation.city, recommendation.nearbyAttractions),
      tags: recommendation.topAmenities?.slice(0, 3) || recommendation.amenities?.slice(0, 3) || ["Standard amenities"],
      location: recommendation.address,
      features: recommendation.amenities || ["Standard features"],
      aiExcerpt: recommendation.whyItMatches,
      whyItMatches: recommendation.whyItMatches,
      funFacts: recommendation.funFacts,
      aiMatchPercent: recommendation.aiMatchPercent,
      
      // UPDATED: Pass through enhanced pricing data
      pricePerNight: recommendation.pricePerNight,
      suggestedPrice: recommendation.suggestedPrice,
      priceProvider: recommendation.priceProvider,
      
      roomTypes: recommendation.roomTypes,
      guestInsights: recommendation.guestInsights,
      city: recommendation.city,
      country: recommendation.country,
      latitude: recommendation.latitude,
      longitude: recommendation.longitude,
      topAmenities: recommendation.topAmenities,
      nearbyAttractions: recommendation.nearbyAttractions,
      locationHighlight: recommendation.locationHighlight,
      matchType: recommendation.matchType,
      hasAvailability: recommendation.hasAvailability,
      totalRooms: recommendation.totalRooms,
      fullDescription: recommendation.description,
      fullAddress: recommendation.address
    };
  };

  // Simplified convert regular hotel to display format
  const convertHotelToDisplayHotel = (hotel: HotelWithRates, index: number): Hotel => {
    const getHotelImage = (hotelInfo: any): string => {
      const defaultImage = "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80";
      
      if (!hotelInfo) {
        return defaultImage;
      }

      if (hotelInfo.main_photo) {
        const mainPhoto = hotelInfo.main_photo;
        if (mainPhoto && typeof mainPhoto === 'string' && mainPhoto.trim() !== '') {
          return mainPhoto;
        }
      }
      
      if (hotelInfo.thumbnail) {
        const thumbnail = hotelInfo.thumbnail;
        if (thumbnail && typeof thumbnail === 'string' && thumbnail.trim() !== '') {
          return thumbnail;
        }
      }
      
      if (hotelInfo.images && Array.isArray(hotelInfo.images) && hotelInfo.images.length > 0) {
        const firstImage = hotelInfo.images[0];
        if (firstImage && typeof firstImage === 'string' && firstImage.trim() !== '') {
          if (firstImage.startsWith('http://') || firstImage.startsWith('https://') || firstImage.startsWith('//')) {
            return firstImage;
          }
        }
      }
      
      return defaultImage;
    };

    // Calculate pricing
    let price = 200;
    if (hotel.roomTypes && hotel.roomTypes.length > 0) {
      const rates = hotel.roomTypes.flatMap(room => room.rates || []);
      if (rates.length > 0) {
        const prices = rates
          .map(rate => rate.retailRate?.total?.[0]?.amount)
          .filter(p => p != null);
        if (prices.length > 0) {
          price = Math.min(...prices);
        }
      }
    }

    // Extract location data
    const coordinates = hotel.hotelInfo?.coordinates || hotel.hotelInfo?.location;
    const city = hotel.hotelInfo?.city || 'Unknown City';
    const country = hotel.hotelInfo?.country || 'Unknown Country';

    // Generate top amenities from available data
    const getTopAmenities = (hotelInfo: any): string[] => {
      const amenities: string[] = [];
      
      if (hotelInfo?.amenities && Array.isArray(hotelInfo.amenities)) {
        const amenityNames = hotelInfo.amenities
          .map((amenity: any) => {
            if (typeof amenity === 'string') return amenity;
            if (typeof amenity === 'object' && amenity.name) return amenity.name;
            return null;
          })
          .filter(Boolean)
          .slice(0, 3);
        
        amenities.push(...amenityNames);
      }
      
      // If we don't have enough amenities, add defaults
      const defaultAmenities = ['Wi-Fi', 'Air Conditioning', 'Private Bathroom'];
      while (amenities.length < 3) {
        const defaultAmenity = defaultAmenities[amenities.length];
        if (defaultAmenity && !amenities.includes(defaultAmenity)) {
          amenities.push(defaultAmenity);
        } else {
          break;
        }
      }
      
      return amenities.slice(0, 3);
    };

    const topAmenities = getTopAmenities(hotel.hotelInfo);

    return {
      id: index + 1,
      name: hotel.hotelInfo?.name || 'Unknown Hotel',
      image: getHotelImage(hotel.hotelInfo),
      price: Math.round(price),
      originalPrice: Math.round(price * 1.15),
      priceComparison: "Standard rate",
      rating: hotel.hotelInfo?.starRating || hotel.hotelInfo?.rating || 4.0,
      reviews: hotel.hotelInfo?.reviewCount || Math.floor(Math.random() * 1000) + 100,
      safetyRating: 8.5 + Math.random() * 1.5,
      transitDistance: "Check location details",
      tags: topAmenities,
      location: hotel.hotelInfo?.address || 'Location not available',
      features: hotel.hotelInfo?.amenities || ["Standard features"],
      aiExcerpt: hotel.hotelInfo?.description?.substring(0, 100) + "..." || "Great hotel choice",
      roomTypes: hotel.roomTypes,
      guestInsights: hotel.hotelInfo?.guestInsights,
      city: city,
      country: country,
      latitude: coordinates?.latitude || null,
      longitude: coordinates?.longitude || null,
      topAmenities: topAmenities,
      nearbyAttractions: [],
      locationHighlight: `Located in ${city}, ${country}`,
      matchType: 'standard',
      hasAvailability: hotel.roomTypes && hotel.roomTypes.length > 0,
      totalRooms: hotel.roomTypes ? hotel.roomTypes.length : 0,
      fullDescription: hotel.hotelInfo?.description || 'No description available',
      fullAddress: hotel.hotelInfo?.address || 'Address not available'
    };
  };

  // Main search execution using smart search endpoint
  const executeSmartSearch = async (userInput: string) => {
    if (!userInput.trim()) return;

    // Skip API call in test mode
    if (TEST_MODE) {
      console.log('🧪 TEST MODE: Skipping API call, using mock data');
      Alert.alert(
        'Test Mode Active',
        'You\'re viewing mock hotel data with enhanced pricing. Set TEST_MODE to false to use real API calls.',
        [{ text: 'Got it!' }]
      );
      return;
    }

    try {
      console.log('\n' + '='.repeat(80));
      console.log('🚀 Starting Smart Hotel Search...');
      console.log('📝 User Input:', userInput);
      
      setIsSearching(true);

      const searchResponse: SmartSearchResponse = await makeRequest('/api/hotels/smart-search', {
        userInput: userInput
      });

      console.log('✅ Smart Search Complete!');
      console.log('📊 API Response Summary:', {
        totalHotelsFound: searchResponse.totalHotelsFound,
        hotelsWithRates: searchResponse.hotelsWithRates,
        aiRecommendationsCount: searchResponse.aiRecommendationsCount,
        aiRecommendationsAvailable: searchResponse.aiRecommendationsAvailable,
        performance: searchResponse.performance
      });

      setSearchResults(searchResponse);

      let convertedHotels: Hotel[] = [];

      if (searchResponse.aiRecommendationsAvailable && searchResponse.recommendations) {
        console.log('🤖 Using AI Recommendations');
        convertedHotels = searchResponse.recommendations.map((rec, index) => 
          convertRecommendationToDisplayHotel(rec, index)
        );
        
        // UPDATED: Enhanced logging with pricing info
        console.log('🔍 Hotel Summary with Enhanced Pricing:');
        searchResponse.recommendations.forEach((rec, idx) => {
          console.log(`  ${idx + 1}. ${rec.name}:`);
          console.log(`     📊 AI Match: ${rec.aiMatchPercent}%`);
          console.log(`     🏷️  Match Type: ${rec.matchType || 'good'}`);
          console.log(`     ⭐ Star Rating: ${rec.starRating}/5`);
          console.log(`     📍 Location: ${rec.city}, ${rec.country}`);
          console.log(`     🗺️  Coordinates: ${rec.latitude}, ${rec.longitude}`);
          console.log(`     🏨 Top Amenities: ${rec.topAmenities?.join(', ') || 'N/A'}`);
          console.log(`     💡 Why it matches: ${rec.whyItMatches}`);
          console.log(`     🎯 Fun facts: ${rec.funFacts?.join(' | ') || 'N/A'}`);
          console.log(`     📍 Near: ${rec.nearbyAttractions?.join(' | ') || 'N/A'}`);
          console.log(`     🏛️  Location: ${rec.locationHighlight || 'N/A'}`);
          
          // UPDATED: Enhanced price logging with provider info
          if (rec.suggestedPrice && rec.priceProvider) {
            console.log(`     💰 Suggested Price: ${rec.suggestedPrice.currency} ${rec.suggestedPrice.amount}/night (including taxes + fees)`);
            console.log(`     🏷️  Price Provider: ${rec.priceProvider} (Best rate)`);
          } else if (rec.pricePerNight) {
            console.log(`     💰 Price per night: ${rec.pricePerNight.display} (including taxes + fees)`);
            if (rec.pricePerNight.provider) {
              console.log(`     🏷️  Price source: ${rec.pricePerNight.provider}`);
            }
            if (rec.pricePerNight.isSupplierPrice) {
              console.log(`     ✅ Supplier rate available`);
            }
          }
          
          console.log(`     🖼️  Images: ${rec.images?.length || 0} available`);
          if (rec.images && rec.images.length > 0) {
            console.log(`     📸 First image: ${rec.images[0]}`);
          }
          console.log(`     📝 Reviews: ${rec.reviewCount} guest reviews`);
          console.log(`     💬 Guest Insights: ${rec.guestInsights}`);
        });
      } else {
        console.log('📋 Using Regular Hotel Results');
        const hotelsToConvert = searchResponse.hotels || searchResponse.allHotels || [];
        convertedHotels = hotelsToConvert.map((hotel, index) => 
          convertHotelToDisplayHotel(hotel, index)
        );
      }
      
      setDisplayHotels(convertedHotels);

      // Update dates and guest info from search response
      if (searchResponse.searchParams.checkin) {
        setCheckInDate(new Date(searchResponse.searchParams.checkin));
      }
      if (searchResponse.searchParams.checkout) {
        setCheckOutDate(new Date(searchResponse.searchParams.checkout));
      }
      if (searchResponse.searchParams.adults) {
        setAdults(searchResponse.searchParams.adults);
      }
      if (searchResponse.searchParams.children) {
        setChildren(searchResponse.searchParams.children);
      }

      const alertTitle = searchResponse.aiRecommendationsAvailable 
        ? 'AI-Powered Results! 🤖✨' 
        : 'Search Complete! 🏨';
        
      const alertMessage = searchResponse.aiRecommendationsAvailable
        ? `Found ${searchResponse.aiRecommendationsCount} personalized AI recommendations with enhanced pricing!`
        : `Found ${convertedHotels.length} available hotels for your search.`;

      Alert.alert(alertTitle, alertMessage, [{ text: 'View Results' }]);

    } catch (error: any) {
      console.error('💥 Smart search failed:', error);
      
      let errorMessage = 'Please try again with a different query. ';
      
      if (error.message.includes('timeout')) {
        errorMessage += 'The request timed out - try a more specific search.';
      } else if (error.message.includes('No hotels found')) {
        errorMessage += 'No hotels found for your criteria - try different dates or location.';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage += 'Make sure your backend server is running on localhost:3003.';
      } else {
        errorMessage += `Error: ${error.message}`;
      }
      
      Alert.alert('Search Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search query from InitialSearchScreen
  useEffect(() => {
    if (params?.searchQuery && params.searchQuery !== searchQuery && !TEST_MODE) {
      console.log('📥 Received search query from InitialSearchScreen:', params.searchQuery);
      setSearchQuery(params.searchQuery);
      executeSmartSearch(params.searchQuery);
    } else if (params?.searchQuery && TEST_MODE) {
      // In test mode, just set the search query for display
      setSearchQuery(params.searchQuery);
    }
  }, [params?.searchQuery]);

  // Event handlers
  const handleAiSearch = useCallback(() => {
    console.log('AI search button pressed');
    setShowAiOverlay(true);
  }, []);

  const handleCloseAiOverlay = useCallback(() => {
    setShowAiOverlay(false);
  }, []);

  const handleSearchUpdate = useCallback((newSearch: string) => {
    setSearchQuery(newSearch);
    if (newSearch.trim()) {
      executeSmartSearch(newSearch);
    }
  }, []);

  const handleDateChange = useCallback((type: 'checkin' | 'checkout', date: Date) => {
    if (type === 'checkin') {
      setCheckInDate(date);
    } else {
      setCheckOutDate(date);
    }
  }, []);

  // UPDATED: Enhanced handleBookNow with provider information
  const handleBookNow = useCallback((hotel: Hotel) => {
    console.log('Book now pressed for:', hotel.name);
    
    let bookingMessage = `Ready to book ${hotel.name}!\n\n`;
    
    // Location
    if (hotel.city && hotel.country) {
      bookingMessage += `📍 Location: ${hotel.city}, ${hotel.country}\n`;
    }
    
    // UPDATED: Enhanced pricing display with provider info
    if (hotel.suggestedPrice && hotel.priceProvider) {
      bookingMessage += `💰 Best Price: ${hotel.suggestedPrice.currency} ${hotel.suggestedPrice.amount}/night\n`;
      bookingMessage += `🏷️  Provider: ${hotel.priceProvider} (Suggested rate)\n`;
    } else if (hotel.pricePerNight) {
      bookingMessage += `💰 Price: ${hotel.pricePerNight.display}\n`;
      if (hotel.pricePerNight.provider) {
        bookingMessage += `🏷️  Provider: ${hotel.pricePerNight.provider}\n`;
      }
      if (hotel.pricePerNight.isSupplierPrice) {
        bookingMessage += `✅ Supplier rate (best available)\n`;
      }
    } else {
      bookingMessage += `💰 Price: ${hotel.price}/night\n`;
    }
    
    // AI match information
    if (hotel.aiMatchPercent) {
      bookingMessage += `🤖 AI Match: ${hotel.aiMatchPercent}% match\n`;
      bookingMessage += `✨ Match Type: ${hotel.matchType || 'good'}\n`;
    }
    
    bookingMessage += `\n`;
    
    // Trip details
    if (searchResults?.searchParams) {
      const params = searchResults.searchParams;
      bookingMessage += `📅 Dates: ${params.checkin} to ${params.checkout}\n`;
      bookingMessage += `👥 Guests: ${params.adults} adults`;
      if (params.children > 0) {
        bookingMessage += `, ${params.children} children`;
      }
      bookingMessage += `\n🌙 Nights: ${params.nights}\n`;
      
      // UPDATED: Calculate total cost with provider info
      const nightsCount = params.nights;
      let totalCost = hotel.price * nightsCount;
      
      if (hotel.suggestedPrice) {
        totalCost = hotel.suggestedPrice.amount * nightsCount;
        bookingMessage += `💵 Total Cost: ${hotel.suggestedPrice.currency} ${totalCost}`;
        if (hotel.priceProvider) {
          bookingMessage += ` (via ${hotel.priceProvider})`;
        }
      } else if (hotel.pricePerNight && hotel.pricePerNight.totalAmount) {
        bookingMessage += `💵 Total Cost: ${hotel.pricePerNight.currency} ${hotel.pricePerNight.totalAmount}`;
        if (hotel.pricePerNight.provider) {
          bookingMessage += ` (via ${hotel.pricePerNight.provider})`;
        }
      } else {
        bookingMessage += `💵 Total Cost: ${totalCost}`;
      }
    }
    
    Alert.alert(
      'Booking Confirmation',
      bookingMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Proceed to Book', style: 'default' }
      ]
    );
  }, [searchResults]);

  // UPDATED: Enhanced handleViewDetails with provider information
  const handleViewDetails = useCallback((hotel: Hotel) => {
    console.log('View details pressed for:', hotel.name);
    
    let detailsMessage = `🏨 ${hotel.name}\n\n`;
    
    // AI matching information
    if (hotel.aiMatchPercent) {
      detailsMessage += `🤖 AI Analysis:\n`;
      detailsMessage += `• Match Score: ${hotel.aiMatchPercent}%\n`;
      detailsMessage += `• Match Type: ${hotel.matchType || 'good'}\n`;
      if (hotel.whyItMatches) {
        detailsMessage += `• Why it matches: ${hotel.whyItMatches}\n`;
      }
      detailsMessage += `\n`;
    }
    
    // Location details
    detailsMessage += `📍 Location Details:\n`;
    if (hotel.city && hotel.country) {
      detailsMessage += `• City: ${hotel.city}, ${hotel.country}\n`;
    }
    if (hotel.fullAddress) {
      detailsMessage += `• Address: ${hotel.fullAddress}\n`;
    }
    if (hotel.latitude && hotel.longitude) {
      detailsMessage += `• Coordinates: ${hotel.latitude}, ${hotel.longitude}\n`;
    }
    if (hotel.locationHighlight) {
      detailsMessage += `• Highlight: ${hotel.locationHighlight}\n`;
    }
    detailsMessage += `• Transit: ${hotel.transitDistance}\n\n`;
    
    // Nearby attractions
    if (hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0) {
      detailsMessage += `🗺️ Nearby Attractions:\n`;
      hotel.nearbyAttractions.forEach(attraction => {
        detailsMessage += `• ${attraction}\n`;
      });
      detailsMessage += `\n`;
    }
    
    // Rating and reviews
    detailsMessage += `⭐ Ratings & Reviews:\n`;
    detailsMessage += `• Star Rating: ${hotel.rating}/5\n`;
    detailsMessage += `• Guest Reviews: ${hotel.reviews.toLocaleString()} reviews\n`;
    detailsMessage += `• Safety Rating: ${hotel.safetyRating.toFixed(1)}/10\n\n`;
    
    // Guest insights
    if (hotel.guestInsights) {
      detailsMessage += `💬 Guest Insights:\n${hotel.guestInsights}\n\n`;
    }
    
    // Top amenities
    if (hotel.topAmenities && hotel.topAmenities.length > 0) {
      detailsMessage += `🏨 Top Amenities:\n`;
      hotel.topAmenities.forEach(amenity => {
        detailsMessage += `• ${amenity}\n`;
      });
      detailsMessage += `\n`;
    }
    
    // Fun facts
    if (hotel.funFacts && hotel.funFacts.length > 0) {
      detailsMessage += `🎉 Fun Facts:\n`;
      hotel.funFacts.forEach(fact => {
        detailsMessage += `• ${fact}\n`;
      });
      detailsMessage += `\n`;
    }
    
    // Room and availability info
    if (hotel.hasAvailability !== undefined || hotel.totalRooms) {
      detailsMessage += `🛏️ Accommodation:\n`;
      if (hotel.hasAvailability !== undefined) {
        detailsMessage += `• Availability: ${hotel.hasAvailability ? 'Available' : 'Limited'}\n`;
      }
      if (hotel.totalRooms) {
        detailsMessage += `• Room Types: ${hotel.totalRooms} different options\n`;
      }
      detailsMessage += `\n`;
    }
    
    // UPDATED: Enhanced pricing section with provider information
    detailsMessage += `💰 Pricing Information:\n`;
    if (hotel.suggestedPrice && hotel.priceProvider) {
      detailsMessage += `• Best Rate: ${hotel.suggestedPrice.currency} ${hotel.suggestedPrice.amount}/night\n`;
      detailsMessage += `• Provider: ${hotel.priceProvider} (Suggested selling price)\n`;
      detailsMessage += `• Rate Type: Supplier rate (best available)\n`;
    } else if (hotel.pricePerNight) {
      detailsMessage += `• Per Night: ${hotel.pricePerNight.display}\n`;
      detailsMessage += `• Currency: ${hotel.pricePerNight.currency}\n`;
      if (hotel.pricePerNight.provider) {
        detailsMessage += `• Provider: ${hotel.pricePerNight.provider}\n`;
      }
      if (hotel.pricePerNight.isSupplierPrice) {
        detailsMessage += `• Rate Type: Supplier rate\n`;
      } else {
        detailsMessage += `• Rate Type: Retail rate\n`;
      }
      if (hotel.pricePerNight.totalAmount) {
        detailsMessage += `• Total Stay Cost: ${hotel.pricePerNight.currency} ${hotel.pricePerNight.totalAmount}\n`;
      }
    } else {
      detailsMessage += `• Per Night: ${hotel.price}\n`;
      detailsMessage += `• Original Price: ${hotel.originalPrice}\n`;
      detailsMessage += `• Comparison: ${hotel.priceComparison}\n`;
    }
    
    Alert.alert(
      'Hotel Details',
      detailsMessage,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Book Now', style: 'default', onPress: () => handleBookNow(hotel) }
      ]
    );
  }, [handleBookNow]);

  // UPDATED: Enhanced handleHotelPress with pricing information
  const handleHotelPress = useCallback((hotel: Hotel) => {
    console.log('Hotel selected:', hotel.name);
    
    let alertMessage = '';
    
    // AI match info
    if (hotel.aiMatchPercent) {
      alertMessage += `🤖 AI Match: ${hotel.aiMatchPercent}% (${hotel.matchType || 'good'} match)\n\n`;
    }
    
    // Quick location and highlights
    if (hotel.city && hotel.country) {
      alertMessage += `📍 ${hotel.city}, ${hotel.country}\n`;
    }
    
    if (hotel.locationHighlight) {
      alertMessage += `🎯 ${hotel.locationHighlight}\n\n`;
    }
    
    // Why it matches
    if (hotel.whyItMatches) {
      alertMessage += `✨ Why it matches: ${hotel.whyItMatches}\n\n`;
    }
    
    // Quick guest insights
    if (hotel.guestInsights) {
      alertMessage += `💬 Guest Insights: ${hotel.guestInsights}\n\n`;
    }
    
    // Top nearby attractions
    if (hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0) {
      alertMessage += `🗺️ Nearby: ${hotel.nearbyAttractions.slice(0, 2).join(', ')}\n\n`;
    }
    
    // Top amenities
    if (hotel.topAmenities && hotel.topAmenities.length > 0) {
      alertMessage += `🏨 Top Amenities: ${hotel.topAmenities.join(', ')}\n\n`;
    }
    
    // UPDATED: Enhanced pricing display
    if (hotel.suggestedPrice && hotel.priceProvider) {
      alertMessage += `💰 ${hotel.suggestedPrice.currency} ${hotel.suggestedPrice.amount}/night (via ${hotel.priceProvider})\n`;
      alertMessage += `🏷️  Best rate available\n`;
    } else if (hotel.pricePerNight) {
      alertMessage += `💰 ${hotel.pricePerNight.display}`;
      if (hotel.pricePerNight.provider) {
        alertMessage += ` (via ${hotel.pricePerNight.provider})`;
      }
      alertMessage += `\n`;
      if (hotel.pricePerNight.isSupplierPrice) {
        alertMessage += `🏷️  Supplier rate\n`;
      }
    } else {
      alertMessage += `💰 ${hotel.price}/night\n`;
    }
    
    alertMessage += `⭐ ${hotel.rating}/5 (${hotel.reviews.toLocaleString()} reviews)\n`;
    
    if (hotel.hasAvailability !== undefined) {
      alertMessage += `🏨 ${hotel.hasAvailability ? 'Available' : 'Limited availability'}`;
    }
    
    Alert.alert(
      hotel.name,
      alertMessage || 'Hotel details',
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Full Details', onPress: () => handleViewDetails(hotel) }
      ]
    );
  }, [handleViewDetails]);

  const handleBackPress = useCallback(() => {
    console.log('Back button pressed - returning to initial search');
    navigation.navigate('InitialSearch');
  }, [navigation]);

  // Show loading screen while searching (but not in test mode)
  if (isSearching && !TEST_MODE) {
    return <LoadingScreen searchQuery={searchQuery} />;
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* SLEEK HEADER */}
      <View style={tw`px-5 pt-3 pb-4 bg-gray-50`}>
        {/* Back button and AI Search button */}
        <View style={tw`flex-row items-center gap-3 mb-4`}>
          <TouchableOpacity
            style={tw`w-11 h-11 items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm`}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>
          
          <TouchableOpacity
           style={tw`flex-1 flex-row items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-gray-900 shadow-xl`}
            onPress={handleAiSearch}
            activeOpacity={0.8}
            disabled={isSearching}
          >
            <Ionicons
              name="sparkles"
              size={18}
              color="#FFFFFF"
            />
            <Text style={tw`text-base font-bold text-white`}>
              Refine Search
            </Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH RESULTS HEADER */}
        {searchQuery.trim().length > 0 && (
          <View style={tw`bg-white px-3 py-2 rounded-lg border border-gray-200`}>
            <Text style={tw`text-xs text-gray-500`}>
              {TEST_MODE ? 
                `Test results for "${searchQuery}" (${displayHotels.length} hotels with enhanced pricing)` :
                searchResults?.aiRecommendationsAvailable 
                  ? `AI Results for "${searchQuery}" (${searchResults.aiRecommendationsCount} hotels)`
                  : searchResults?.hotelsWithRates 
                  ? `Results for "${searchQuery}" (${searchResults.hotelsWithRates} hotels)`
                  : `Results for "${searchQuery}"`
              }
            </Text>
            {/* Search info with dates */}
            {searchResults?.searchParams && (
              <Text style={tw`text-xs text-gray-400 mt-1`}>
                {searchResults.searchParams.cityName}, {searchResults.searchParams.countryCode.toUpperCase()} • 
                {new Date(searchResults.searchParams.checkin).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(searchResults.searchParams.checkout).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • 
                {searchResults.searchParams.adults} adults
                {searchResults.searchParams.children > 0 ? `, ${searchResults.searchParams.children} children` : ''}
              </Text>
            )}
          </View>
        )}
        
      </View>

      {/* CONTENT VIEW - Story View */}
      <View style={tw`flex-1 bg-gray-50`}>
        <SwipeableStoryView
          hotels={displayHotels}
          onHotelPress={handleHotelPress}
          onViewDetails={handleViewDetails}
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          adults={adults}
          children={children}
        />
      </View>

      {/* AI SEARCH OVERLAY */}
      <AISearchOverlay
        visible={showAiOverlay}
        onClose={handleCloseAiOverlay}
        onSearchUpdate={handleSearchUpdate}
        currentSearch={searchQuery}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;