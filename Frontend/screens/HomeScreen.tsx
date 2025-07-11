// HomeScreen.tsx - Updated with Test Mode functionality
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

// Import test data
import { testAISuggestions, generateTestSearchResponse } from '../components/HomeScreenTop/TestModeData';

// TEST MODE CONFIGURATION
const TEST_MODE = false; // Set to false for production

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

// UPDATED: Enhanced interfaces for optimized backend response
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

// AI Suggestions interface
interface AISuggestion {
  id: string;
  text: string;
  category?: string;
  reasoning?: string;
  priority?: string;
}

interface SentimentResponse {
  searchId: string;
  insights: {
    [hotelId: string]: {
      guestInsights: string;
      sentimentData: any;
      reviewCount: number;
    };
  };
  insightsPending: boolean;
  completedAt?: string;
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
  
  pricePerNight?: {
    amount: number;
    totalAmount: number;
    currency: string;
    display: string;
    provider: string | null;
    isSupplierPrice: boolean;
  };
  
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

// Base URL
const BASE_URL = 'http://localhost:3003';

const HomeScreen = () => {
  const route = useRoute();
  const params = route.params as RouteParams;
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<OptimizedSearchResponse | null>(null);
  const [displayHotels, setDisplayHotels] = useState<Hotel[]>([]);
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);
  
  // AI Suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAiSuggestions, setIsLoadingAiSuggestions] = useState(false);
  const [aiSuggestionsError, setAiSuggestionsError] = useState<string | null>(null);
  
  // Polling management
  const sentimentPollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (sentimentPollingRef.current) {
        clearInterval(sentimentPollingRef.current);
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  // API request helper
  const makeRequest = async (endpoint: string, data?: any) => {
    try {
      const config: RequestInit = {
        method: data ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data) {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, config);

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

  // TEST MODE: Load pre-loaded AI suggestions
  const loadTestAiSuggestions = useCallback(async () => {
    console.log('🧪 TEST MODE: Loading pre-loaded AI suggestions...');
    setIsLoadingAiSuggestions(true);
    setAiSuggestionsError(null);

    // Simulate loading time
    await new Promise(resolve => setTimeout(resolve, 500));

    setAiSuggestions(testAISuggestions);
    setIsLoadingAiSuggestions(false);
    console.log('✅ TEST MODE: AI suggestions loaded');
  }, []);

  // PRODUCTION: Pre-load AI suggestions during hotel search
  const preloadAiSuggestions = useCallback(async (searchQuery: string, searchContext?: any) => {
    try {
      console.log('🤖 Pre-loading AI suggestions during search...');
      setIsLoadingAiSuggestions(true);
      setAiSuggestionsError(null);

      const response = await makeRequest('/api/hotels/ai-suggestions', {
        currentSearch: searchQuery,
        searchContext: searchContext
      });

      if (response.success && response.suggestions) {
        console.log(`✅ Pre-loaded ${response.suggestions.length} AI suggestions`);
        setAiSuggestions(response.suggestions);
        
        if (response.metadata?.model) {
          console.log(`🤖 Suggestions generated by: ${response.metadata.model}`);
        }
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error: any) {
      console.error('❌ Failed to pre-load AI suggestions:', error);
      setAiSuggestionsError(error.message);
      
      // Fallback to basic suggestions
      const fallbackSuggestions = generateFallbackSuggestions(searchQuery);
      setAiSuggestions(fallbackSuggestions);
    } finally {
      setIsLoadingAiSuggestions(false);
    }
  }, []);

  // Generate fallback suggestions (production only)
  const generateFallbackSuggestions = useCallback((searchQuery: string): AISuggestion[] => {
    const query = searchQuery.toLowerCase();
    const suggestionTexts: string[] = [];

    // Budget suggestions
    if (!query.includes('$') && !query.includes('budget')) {
      suggestionTexts.push('under $150 per night', 'under $300 per night');
    }

    // Guest count
    if (!query.includes('people') && !query.includes('guest')) {
      suggestionTexts.push('for 2 people', 'for 4+ people');
    }

    // Location based
    if (query.includes('beach')) {
      suggestionTexts.push('with ocean view', 'walking distance to beach');
    } else if (query.includes('city') || query.includes('downtown')) {
      suggestionTexts.push('in walkable area', 'near public transport');
    } else {
      suggestionTexts.push('in city center', 'in quiet area');
    }

    // Amenities
    if (!query.includes('wifi') && !query.includes('breakfast')) {
      suggestionTexts.push('with free WiFi', 'with free breakfast');
    }
    
    if (!query.includes('pool') && !query.includes('parking')) {
      suggestionTexts.push('with pool access', 'with free parking');
    }

    // Quality
    if (!query.includes('rating') && !query.includes('star')) {
      suggestionTexts.push('with 4+ star rating', 'with recent positive reviews');
    }

    // Flexibility
    if (!query.includes('cancel')) {
      suggestionTexts.push('with free cancellation');
    }

    // Default suggestions for empty search
    if (!query.trim()) {
      const defaultTexts = [
        'under $200 per night',
        'for 2 people', 
        'with free WiFi',
        'in city center',
        'with 4+ star rating',
        'with free breakfast'
      ];
      
      return defaultTexts.map((text, index) => ({
        id: `fallback-${index}`,
        text,
        category: 'general',
        priority: 'medium'
      }));
    }

    // Take first 6 unique suggestions
    const uniqueTexts = [...new Set(suggestionTexts)].slice(0, 6);
    
    return uniqueTexts.map((text, index) => ({
      id: `fallback-${index}-${Date.now()}`,
      text,
      category: 'general',
      priority: 'medium'
    }));
  }, []);

  // Sentiment polling function (production only)
  const startSentimentPolling = useCallback(async (searchId: string) => {
    if (TEST_MODE) {
      console.log('🧪 TEST MODE: Skipping sentiment polling');
      return;
    }

    console.log('🎭 Starting sentiment polling for searchId:', searchId);
    setIsInsightsLoading(true);
    
    const pollSentiment = async () => {
      try {
        console.log('🔄 Polling sentiment data...');
        const sentimentData: SentimentResponse = await makeRequest(`/api/hotels/sentiment/${searchId}`);
        
        if (!sentimentData.insightsPending) {
          console.log('✅ Sentiment insights ready!');
          
          setDisplayHotels(prevHotels => 
            prevHotels.map(hotel => {
              const hotelInsights = sentimentData.insights[hotel.id.toString()];
              if (hotelInsights) {
                return {
                  ...hotel,
                  guestInsights: hotelInsights.guestInsights,
                  reviews: hotelInsights.reviewCount || hotel.reviews
                };
              }
              return hotel;
            })
          );
          
          if (sentimentPollingRef.current) {
            clearInterval(sentimentPollingRef.current);
            sentimentPollingRef.current = null;
          }
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
          }
          
          setIsInsightsLoading(false);
          
          Alert.alert(
            'Insights Ready! ✨',
            'Guest insights and sentiment analysis have been updated.',
            [{ text: 'Great!' }]
          );
        } else {
          console.log('⏳ Insights still pending...');
        }
      } catch (error) {
        console.error('❌ Sentiment polling error:', error);
      }
    };

    sentimentPollingRef.current = setInterval(pollSentiment, 2000);
    
    pollingTimeoutRef.current = setTimeout(() => {
      if (sentimentPollingRef.current) {
        clearInterval(sentimentPollingRef.current);
        sentimentPollingRef.current = null;
      }
      setIsInsightsLoading(false);
      console.log('⏰ Sentiment polling timeout - stopping');
    }, 30000);

    pollSentiment();
  }, []);

  // Convert recommendation to display format
  const convertRecommendationToDisplayHotel = (recommendation: HotelRecommendation, index: number): Hotel => {
    console.log('🔍 Converting recommendation:', recommendation.name);
    
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

    let price = 200;
    let originalPrice = price * 1.15;
    let priceComparison = "Standard rate";

    if (recommendation.pricePerNight) {
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
        'Miami': '3 min walk to beach',
        'Los Angeles': '5 min walk to metro',
        'Vail': '2 min walk to ski lift',
        'Chicago': '4 min walk to L train'
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
      pricePerNight: recommendation.pricePerNight,
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

  // TEST MODE: Execute test search with pre-loaded data
  const executeTestSearch = async (userInput: string) => {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TEST MODE: Starting Test Search...');
    console.log('📝 User Input:', userInput);
    
    setIsSearching(true);

    try {
      // Simulate search delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Load pre-loaded AI suggestions
      await loadTestAiSuggestions();

      // Generate test search response
      const testResponse = generateTestSearchResponse(userInput);
      
      console.log('✅ TEST MODE: Search Complete!');
      console.log('📊 Performance:', testResponse.performance);
      console.log('🔍 Search ID:', testResponse.searchId);

      setSearchResults(testResponse);
      setCurrentSearchId(testResponse.searchId);

      // Convert recommendations to display format
      const convertedHotels: Hotel[] = testResponse.recommendations.map((rec: HotelRecommendation, index: number) => 
        convertRecommendationToDisplayHotel(rec, index)
      );
      
      setDisplayHotels(convertedHotels);

      // Update dates and guest info from search response
      if (testResponse.searchParams.checkin) {
        setCheckInDate(new Date(testResponse.searchParams.checkin));
      }
      if (testResponse.searchParams.checkout) {
        setCheckOutDate(new Date(testResponse.searchParams.checkout));
      }
      if (testResponse.searchParams.adults) {
        setAdults(testResponse.searchParams.adults);
      }
      if (testResponse.searchParams.children) {
        setChildren(testResponse.searchParams.children);
      }

      // Show results
      Alert.alert(
        'Test Results Ready! 🧪', 
        `Found ${testResponse.aiRecommendationsCount} pre-loaded test hotels.\n\n⚡ Test mode (${testResponse.performance.totalTimeMs}ms)`,
        [{ text: 'View Results' }]
      );

    } catch (error: any) {
      console.error('💥 Test search failed:', error);
      Alert.alert('Test Search Failed', 'Error in test mode: ' + error.message, [{ text: 'OK' }]);
    } finally {
      setIsSearching(false);
    }
  };

  // PRODUCTION: Main search execution with AI suggestions pre-loading
  const executeOptimizedSearch = async (userInput: string) => {
    if (!userInput.trim()) return;

    try {
      console.log('\n' + '='.repeat(80));
      console.log('🚀 Starting Optimized Hotel Search...');
      console.log('📝 User Input:', userInput);
      
      setIsSearching(true);

      // Create search context for AI suggestions
      const searchContext = {
        dates: {
          checkin: checkInDate.toISOString().split('T')[0],
          checkout: checkOutDate.toISOString().split('T')[0],
        },
        guests: {
          adults: adults,
          children: children,
        }
      };

      // START AI SUGGESTIONS PRE-LOADING IN PARALLEL with hotel search
      console.log('🤖 Starting parallel AI suggestions pre-loading...');
      const aiSuggestionsPromise = preloadAiSuggestions(userInput, searchContext);

      // START HOTEL SEARCH
      const searchPromise = makeRequest('/api/hotels/search', {
        userInput: userInput
      });

      // Wait for hotel search to complete (AI suggestions continue in background)
      const searchResponse: OptimizedSearchResponse = await searchPromise;

      console.log('✅ Optimized Search Complete!');
      console.log('📊 Performance:', searchResponse.performance);
      console.log('🎭 Insights Pending:', searchResponse.insightsPending);
      console.log('🔍 Search ID:', searchResponse.searchId);

      setSearchResults(searchResponse);
      setCurrentSearchId(searchResponse.searchId);

      // Convert recommendations to display format
      const convertedHotels: Hotel[] = searchResponse.recommendations.map((rec: HotelRecommendation, index: number) => 
        convertRecommendationToDisplayHotel(rec, index)
      );
      
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

      // Show initial results
      const performanceText = searchResponse.performance.optimized 
        ? `⚡ Fast search (${searchResponse.performance.totalTimeMs}ms)`
        : `Standard search (${searchResponse.performance.totalTimeMs}ms)`;

      Alert.alert(
        'Results Ready! 🎯', 
        `Found ${searchResponse.aiRecommendationsCount} AI-curated recommendations.\n\n${performanceText}`,
        [{ text: 'View Results' }]
      );

      // Start sentiment polling if insights are pending
      if (searchResponse.insightsPending && searchResponse.searchId) {
        console.log('🎭 Starting sentiment polling...');
        startSentimentPolling(searchResponse.searchId);
      }

      // Wait for AI suggestions to complete (if not already done)
      await aiSuggestionsPromise;
      console.log('🤖 AI suggestions pre-loading completed!');

    } catch (error: any) {
      console.error('💥 Optimized search failed:', error);
      
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

  // MAIN SEARCH FUNCTION - routes to test or production
  const executeSearch = async (userInput: string) => {
    if (TEST_MODE) {
      await executeTestSearch(userInput);
    } else {
      await executeOptimizedSearch(userInput);
    }
  };

  // Handle search query from InitialSearchScreen
  useEffect(() => {
    if (params?.searchQuery && params.searchQuery !== searchQuery) {
      console.log('📥 Received search query from InitialSearchScreen:', params.searchQuery);
      setSearchQuery(params.searchQuery);
      executeSearch(params.searchQuery);
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
      executeSearch(newSearch);
    }
  }, []);

  const handleDateChange = useCallback((type: 'checkin' | 'checkout', date: Date) => {
    if (type === 'checkin') {
      setCheckInDate(date);
    } else {
      setCheckOutDate(date);
    }
  }, []);

  // Enhanced handleBookNow with provider information
  const handleBookNow = useCallback((hotel: Hotel) => {
    console.log('Book now pressed for:', hotel.name);
    
    let bookingMessage = `Ready to book ${hotel.name}!\n\n`;
    
    if (TEST_MODE) {
      bookingMessage += `🧪 TEST MODE - No actual booking\n\n`;
    }
    
    if (hotel.city && hotel.country) {
      bookingMessage += `📍 Location: ${hotel.city}, ${hotel.country}\n`;
    }
    
    if (hotel.pricePerNight) {
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
    
    if (hotel.aiMatchPercent) {
      bookingMessage += `🤖 AI Match: ${hotel.aiMatchPercent}% match\n`;
      bookingMessage += `✨ Match Type: ${hotel.matchType || 'good'}\n`;
    }
    
    bookingMessage += `\n`;
    
    if (searchResults?.searchParams) {
      const params = searchResults.searchParams;
      bookingMessage += `📅 Dates: ${params.checkin} to ${params.checkout}\n`;
      bookingMessage += `👥 Guests: ${params.adults} adults`;
      if (params.children > 0) {
        bookingMessage += `, ${params.children} children`;
      }
      bookingMessage += `\n🌙 Nights: ${params.nights}\n`;
      
      const nightsCount = params.nights;
      let totalCost = hotel.price * nightsCount;
      
      if (hotel.pricePerNight && hotel.pricePerNight.totalAmount) {
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
        { text: TEST_MODE ? 'Test Book' : 'Proceed to Book', style: 'default' }
      ]
    );
  }, [searchResults]);

  // Enhanced handleViewDetails
  const handleViewDetails = useCallback((hotel: Hotel) => {
    console.log('View details pressed for:', hotel.name);
    
    let detailsMessage = `🏨 ${hotel.name}\n\n`;
    
    if (TEST_MODE) {
      detailsMessage += `🧪 TEST MODE DATA\n\n`;
    }
    
    if (hotel.aiMatchPercent) {
      detailsMessage += `🤖 AI Analysis:\n`;
      detailsMessage += `• Match Score: ${hotel.aiMatchPercent}%\n`;
      detailsMessage += `• Match Type: ${hotel.matchType || 'good'}\n`;
      if (hotel.whyItMatches) {
        detailsMessage += `• Why it matches: ${hotel.whyItMatches}\n`;
      }
      detailsMessage += `\n`;
    }
    
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
    
    if (hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0) {
      detailsMessage += `🗺️ Nearby Attractions:\n`;
      hotel.nearbyAttractions.forEach(attraction => {
        detailsMessage += `• ${attraction}\n`;
      });
      detailsMessage += `\n`;
    }
    
    detailsMessage += `⭐ Ratings & Reviews:\n`;
    detailsMessage += `• Star Rating: ${hotel.rating}/5\n`;
    detailsMessage += `• Guest Reviews: ${hotel.reviews.toLocaleString()} reviews\n`;
    detailsMessage += `• Safety Rating: ${hotel.safetyRating.toFixed(1)}/10\n\n`;
    
    if (isInsightsLoading && hotel.guestInsights?.includes('Loading')) {
      detailsMessage += `💬 Guest Insights:\n🔄 Loading detailed insights...\n\n`;
    } else if (hotel.guestInsights) {
      detailsMessage += `💬 Guest Insights:\n${hotel.guestInsights}\n\n`;
    }
    
    if (hotel.topAmenities && hotel.topAmenities.length > 0) {
      detailsMessage += `🏨 Top Amenities:\n`;
      hotel.topAmenities.forEach(amenity => {
        detailsMessage += `• ${amenity}\n`;
      });
      detailsMessage += `\n`;
    }
    
    if (hotel.funFacts && hotel.funFacts.length > 0) {
      detailsMessage += `🎉 Fun Facts:\n`;
      hotel.funFacts.forEach(fact => {
        detailsMessage += `• ${fact}\n`;
      });
      detailsMessage += `\n`;
    }
    
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
    
    detailsMessage += `💰 Pricing Information:\n`;
    if (hotel.pricePerNight) {
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
        { text: TEST_MODE ? 'Test Book' : 'Book Now', style: 'default', onPress: () => handleBookNow(hotel) }
      ]
    );
  }, [handleBookNow, isInsightsLoading]);

  // Enhanced handleHotelPress
  const handleHotelPress = useCallback((hotel: Hotel) => {
    console.log('Hotel selected:', hotel.name);
    
    let alertMessage = '';
    
    if (TEST_MODE) {
      alertMessage += `🧪 TEST MODE\n\n`;
    }
    
    if (hotel.aiMatchPercent) {
      alertMessage += `🤖 AI Match: ${hotel.aiMatchPercent}% (${hotel.matchType || 'good'} match)\n\n`;
    }
    
    if (hotel.city && hotel.country) {
      alertMessage += `📍 ${hotel.city}, ${hotel.country}\n`;
    }
    
    if (hotel.locationHighlight) {
      alertMessage += `🎯 ${hotel.locationHighlight}\n\n`;
    }
    
    if (hotel.whyItMatches) {
      alertMessage += `✨ Why it matches: ${hotel.whyItMatches}\n\n`;
    }
    
    if (isInsightsLoading && hotel.guestInsights?.includes('Loading')) {
      alertMessage += `💬 Guest Insights: 🔄 Loading...\n\n`;
    } else if (hotel.guestInsights) {
      alertMessage += `💬 Guest Insights: ${hotel.guestInsights}\n\n`;
    }
    
    if (hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0) {
      alertMessage += `🗺️ Nearby: ${hotel.nearbyAttractions.slice(0, 2).join(', ')}\n\n`;
    }
    
    if (hotel.topAmenities && hotel.topAmenities.length > 0) {
      alertMessage += `🏨 Top Amenities: ${hotel.topAmenities.join(', ')}\n\n`;
    }
    
    if (hotel.pricePerNight) {
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
  }, [handleViewDetails, isInsightsLoading]);

  const handleBackPress = useCallback(() => {
    console.log('Back button pressed - returning to initial search');
    if (sentimentPollingRef.current) {
      clearInterval(sentimentPollingRef.current);
      sentimentPollingRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    navigation.navigate('InitialSearch');
  }, [navigation]);

  // Show loading screen while searching
  if (isSearching) {
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


        {/* SEARCH RESULTS HEADER WITH PERFORMANCE INDICATORS */}
        {searchQuery.trim().length > 0 && (
          <View style={tw`bg-white px-3 py-2 rounded-lg border border-gray-200`}>
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={tw`text-xs text-gray-500 flex-1`}>
                {searchResults?.aiRecommendationsCount 
                  ? `${TEST_MODE ? 'Test' : 'AI'} Results for "${searchQuery}" (${searchResults.aiRecommendationsCount} hotels)`
                  : `Results for "${searchQuery}"`
                }
              </Text>
              
              {/* Performance indicator */}
              {searchResults?.performance && (
                <View style={tw`flex-row items-center ml-2`}>
                  <Ionicons 
                    name={TEST_MODE ? "flask" : (searchResults.performance.optimized ? "flash" : "time")} 
                    size={12} 
                    color={TEST_MODE ? "#EA580C" : (searchResults.performance.optimized ? "#10B981" : "#F59E0B")} 
                  />
                  <Text style={tw`text-xs ml-1 ${
                    TEST_MODE ? 'text-orange-600' : (searchResults.performance.optimized ? 'text-green-600' : 'text-amber-600')
                  }`}>
                    {searchResults.performance.totalTimeMs}ms
                  </Text>
                </View>
              )}
            </View>
            
            {/* Search info with dates and insights loading indicator */}
            {searchResults?.searchParams && (
              <View style={tw`flex-row items-center justify-between mt-1`}>
                <Text style={tw`text-xs text-gray-400`}>
                  {searchResults.searchParams.cityName}, {searchResults.searchParams.countryCode.toUpperCase()} • 
                  {new Date(searchResults.searchParams.checkin).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(searchResults.searchParams.checkout).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • 
                  {searchResults.searchParams.adults} adults
                  {searchResults.searchParams.children > 0 ? `, ${searchResults.searchParams.children} children` : ''}
                </Text>
                
                {/* Combined loading indicators */}
                <View style={tw`flex-row items-center ml-2 gap-2`}>
                  {/* Insights loading indicator - only show in production */}
                  {!TEST_MODE && isInsightsLoading && (
                    <View style={tw`flex-row items-center`}>
                      <Ionicons name="sync" size={12} color="#6B7280" />
                      <Text style={tw`text-xs text-gray-500 ml-1`}>
                        Insights...
                      </Text>
                    </View>
                  )}
                  
                  {/* AI Suggestions loading indicator */}
                  {isLoadingAiSuggestions && (
                    <View style={tw`flex-row items-center`}>
                      <Ionicons name={TEST_MODE ? "flask" : "sparkles"} size={12} color={TEST_MODE ? "#EA580C" : "#3B82F6"} />
                      <Text style={tw`text-xs ${TEST_MODE ? 'text-orange-500' : 'text-blue-500'} ml-1`}>
                        {TEST_MODE ? 'Test...' : 'AI...'}
                      </Text>
                    </View>
                  )}
                  
                </View>
              </View>
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
        // Pass pre-loaded AI suggestions to overlay
        preloadedSuggestions={aiSuggestions}
        isLoadingSuggestions={isLoadingAiSuggestions}
        suggestionsError={aiSuggestionsError}
        searchContext={{
          dates: {
            checkin: checkInDate.toISOString().split('T')[0],
            checkout: checkOutDate.toISOString().split('T')[0],
          },
          guests: {
            adults: adults,
            children: children,
          },
          ...(searchResults?.searchParams && {
            budget: {
              min: searchResults.searchParams.minCost,
              max: searchResults.searchParams.maxCost,
              currency: searchResults.searchParams.currency,
            }
          })
        }}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;