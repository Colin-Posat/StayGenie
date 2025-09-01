// HomeScreen.tsx - Updated with Two-Stage API functionality
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import SwipeableStoryView from '../components/StoryView/SwipeableStoryView';
import AISearchOverlay from '../components/HomeScreenTop/AiSearchOverlay';
import LoadingScreen from '../components/HomeScreenTop/LoadingScreen';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import EventSource from 'react-native-sse';


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

// NEW: Two-stage API response interfaces
interface Stage1SearchResponse {
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
  hotels: Stage1Hotel[];
  matchedHotelsCount: number;
  searchId: string;
  aiMatchingCompleted: boolean;
  performance: {
    totalTimeMs: number;
    stepBreakdown: any[];
    bottlenecks: any[];
  };
  totalHotelsFound: number;
  hotelsWithRates: number;
  generatedAt: string;
}

interface Stage1Hotel {
  hotelId: string;
  name: string;
  aiMatchPercent: number;
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
  address: string;
  amenities: string[];
  description: string;
  coordinates: any;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
    display: string;
  };
  totalRooms: number;
  hasAvailability: boolean;
  roomTypes?: any[];
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  topAmenities: string[];
  // NEW: Refundable policy fields
  isRefundable: boolean;
  refundableTag: string | null;
  refundableInfo: string;
  // Contains summarized info for Stage 2
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
}

interface Stage2InsightsResponse {
  insightsId: string;
  processedHotels: number;
  recommendations: AIRecommendation[];
  aiModels: {
    content: string;
    insights: string;
  };
  generatedAt: string;
  performance: {
    totalTimeMs: number;
    stepBreakdown: any[];
    bottlenecks: any[];
  };
}

interface AIRecommendation {
  hotelId: string;
  hotelName: string;
  aiMatchPercent: number;
  whyItMatches: string;
  funFacts: string[];
  nearbyAttractions: string[];
  locationHighlight: string;
  guestInsights: string;
  sentimentData: any;
  thirdImageHd?: string | null;
  allHotelInfo?: string;
}

// Legacy interface for backward compatibility
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
  
  // NEW: Make refundable policy fields OPTIONAL (since API might not return them yet)
  isRefundable?: boolean;
  refundableTag?: string | null;
  refundableInfo?: string;
}

// AI Suggestions interface
interface AISuggestion {
  id: string;
  text: string;
  category?: string;
  reasoning?: string;
  priority?: string;
}

interface Hotel {
  id: string; // Changed from: id: number;
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
  images?: string[];
  
  pricePerNight?: {
    amount: number;
    totalAmount: number;
    currency: string;
    display: string;
    provider: string | null;
    isSupplierPrice: boolean;
  } | null;
  
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
  
  // NEW: Refundable policy fields
  isRefundable?: boolean;
  refundableTag?: string | null;
  refundableInfo?: string;

  isPlaceholder?: boolean;
  thirdImageHd?: string | null;
  allHotelInfo?: string;
}

//const BASE_URL = 'https://staygenie-wwpa.onrender.com';
const BASE_URL = 'http://localhost:3003';



import { Dimensions } from 'react-native';

const HomeScreen = () => {
  const screenSlideOut = useRef(new Animated.Value(0)).current;
  const contentFadeOut = useRef(new Animated.Value(1)).current;
  const scaleTransition = useRef(new Animated.Value(1)).current;
  const route = useRoute();
  const params = route.params as RouteParams;
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const width = Dimensions.get('window').width;

  const [showPlaceholders, setShowPlaceholders] = useState(false);
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  
  // NEW: Two-stage search state
  const [stage1Results, setStage1Results] = useState<Stage1SearchResponse | null>(null);
  const [stage2Results, setStage2Results] = useState<Stage2InsightsResponse | null>(null);
  const [displayHotels, setDisplayHotels] = useState<Hotel[]>([]);
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);

  const [isStreamingSearch, setIsStreamingSearch] = useState(false);
const [streamingProgress, setStreamingProgress] = useState({ step: 0, totalSteps: 8, message: '' });
const [streamedHotels, setStreamedHotels] = useState<Hotel[]>([]);
const [firstHotelFound, setFirstHotelFound] = useState(false);
  
  // Legacy state for backward compatibility
  const [searchResults, setSearchResults] = useState<OptimizedSearchResponse | null>(null);
  
  const isBusy = isSearching || isStreamingSearch || isInsightsLoading;
  // AI Suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
const [isLoadingAiSuggestions, setIsLoadingAiSuggestions] = useState(false);
const [aiSuggestionsError, setAiSuggestionsError] = useState<string | null>(null);
const [aiSuggestionsLoaded, setAiSuggestionsLoaded] = useState(false);
  
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

  const loadAiSuggestionsForSearch = useCallback(async (searchQuery: string, searchContext?: any) => {
  try {
    console.log('🤖 Loading AI suggestions during search...');
    setIsLoadingAiSuggestions(true);
    setAiSuggestionsError(null);

    if (TEST_MODE) {
      // TEST MODE: Use pre-loaded suggestions
      console.log('🧪 TEST MODE: Using pre-loaded AI suggestions');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
      setAiSuggestions(testAISuggestions);
      setAiSuggestionsLoaded(true);
      console.log('✅ TEST MODE: AI suggestions loaded');
      return;
    }

    // PRODUCTION: Fetch from API
    const response = await makeRequest('/api/hotels/ai-suggestions', {
      currentSearch: searchQuery,
      searchContext: searchContext
    });

    if (response.success && response.suggestions) {
      console.log(`✅ Loaded ${response.suggestions.length} AI suggestions during search`);
      setAiSuggestions(response.suggestions);
      setAiSuggestionsLoaded(true);
      
      if (response.metadata?.model) {
        console.log(`🤖 Suggestions generated by: ${response.metadata.model}`);
      }
    } else {
      throw new Error('Invalid response format');
    }

  } catch (error: any) {
    console.error('❌ Failed to load AI suggestions:', error);
    setAiSuggestionsError(error.message);
    
    // Fallback to basic suggestions
    const fallbackSuggestions = generateFallbackSuggestions(searchQuery);
    setAiSuggestions(fallbackSuggestions);
    setAiSuggestionsLoaded(true);
  } finally {
    setIsLoadingAiSuggestions(false);
  }
}, []);

const generatePlaceholderHotels = useCallback((count: number = 10): Hotel[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `placeholder-${index}`,
    name: '', // Empty for grey placeholder
    image: '', // Empty for grey placeholder
    images: [],
    price: 0,
    originalPrice: 0,
    priceComparison: '',
    rating: 0,
    reviews: 0,
    safetyRating: 0,
    transitDistance: '',
    tags: [],
    location: '',
    features: [],
    aiExcerpt: '',
    whyItMatches: '',
    funFacts: [],
    aiMatchPercent: 0,
    isPlaceholder: true, // This identifies it as a placeholder
  }));
}, []);

const handleStreamingUpdate = async (data: any, userInput?: string) => {
  console.log('📡 Streaming update received:', data.type);

  switch (data.type) {
    case 'progress':
      setStreamingProgress({
        step: data.step || 0,
        totalSteps: data.totalSteps || 8,
        message: data.message || 'Processing...'
      });
      break;

    case 'hotel_found':
      if (data.hotel) {
        const newHotel = convertStreamedHotelToDisplay(data.hotel, data.hotelIndex - 1);
        
        // ✨ IMMEDIATE DISPLAY LOGIC - Show first hotel and dismiss loading screen
        if (!firstHotelFound && data.hotelIndex === 1) {
          console.log('🎯 FIRST HOTEL FOUND - Showing immediately!');
          setFirstHotelFound(true);
          setShowPlaceholders(false);
          setDisplayHotels([newHotel]); // Show just the first hotel
        } else {
          // ✨ LIVE UPDATES - Add subsequent hotels to existing list
          console.log(`🔥 Hotel ${data.hotelIndex}/${data.totalExpected} streaming in: ${newHotel.name} (${newHotel.aiMatchPercent}% match)`);
          
          setDisplayHotels(prevHotels => {
            const realHotels = prevHotels.filter(h => !h.isPlaceholder);
            const updatedHotels = [...realHotels];
            const existingIndex = updatedHotels.findIndex(h => h.id === newHotel.id);
            
            if (existingIndex >= 0) {
              // Update existing hotel with enhanced data
              updatedHotels[existingIndex] = newHotel;
              console.log(`🔄 Updated existing hotel: ${newHotel.name}`);
            } else {
              // Add new hotel and sort by match percentage
              updatedHotels.push(newHotel);
              console.log(`➕ Added new hotel: ${newHotel.name}`);
            }
            
            // Sort by AI match percentage (best matches first)
            return updatedHotels.sort((a, b) => (b.aiMatchPercent || 0) - (a.aiMatchPercent || 0));
          });
        }

        console.log(`✨ Hotel ${data.hotelIndex}/${data.totalExpected} processed: ${data.hotel.name} (${data.hotel.aiMatchPercent}%)`);
      }
      break;

    // 🔥 NEW: Handle enhanced hotels with AI insights
    case 'hotel_enhanced':
  if (data.hotel && data.hotelId) {
    console.log(`✨ Received AI-enhanced hotel: ${data.hotel.name}`);
    
    const enhancedHotel = convertStreamedHotelToDisplay(data.hotel, data.hotelIndex - 1);
    
    setDisplayHotels(prevHotels => {
      const updatedHotels = [...prevHotels];
      const existingIndex = updatedHotels.findIndex(h => h.id === data.hotelId);
      
      if (existingIndex >= 0) {
        // Replace with AI-enhanced version
        updatedHotels[existingIndex] = {
          ...updatedHotels[existingIndex],
          ...enhancedHotel,
          // Specifically update AI-generated content
          aiExcerpt: enhancedHotel.whyItMatches || enhancedHotel.aiExcerpt,
          whyItMatches: enhancedHotel.whyItMatches || "Enhanced with AI insights",
          funFacts: enhancedHotel.funFacts || ["AI-curated facts"],
          guestInsights: enhancedHotel.guestInsights || "AI-enhanced guest insights",
          nearbyAttractions: enhancedHotel.nearbyAttractions || ["AI-found attractions"],
          locationHighlight: enhancedHotel.locationHighlight || "AI-analyzed location",
          allHotelInfo: enhancedHotel.allHotelInfo || "Comprehensive hotel details available" // ADD THIS
        };
        
        console.log(`🎨 Enhanced existing hotel with AI insights: ${data.hotel.name}`);
        
        // Show subtle notification for enhancement (optional)
        if (data.hotelIndex <= 3) { // Only for first 3 hotels to avoid spam
          console.log(`✨ Hotel ${data.hotelIndex} enhanced: ${data.hotel.name}`);
        }
      } else {
        console.warn(`⚠️ Could not find hotel ${data.hotelId} to enhance`);
      }
      
      // Sort by AI match percentage (best matches first)
      return updatedHotels.sort((a, b) => (b.aiMatchPercent || 0) - (a.aiMatchPercent || 0));
    });
  }
  break;

    case 'complete':
      console.log('🎉 All hotels found and AI-enhanced!');
      
      setStreamingProgress({
        step: 8,
        totalSteps: 8,
        message: 'All hotels enhanced with AI insights!'
      });
      
      if (data.searchId) {
        setCurrentSearchId(data.searchId);
      }

      break;

    case 'error':
      console.error('❌ Streaming error:', data.message);
      setShowPlaceholders(false);
      setIsSearching(false);
      Alert.alert('Search Error', data.message, [{ text: 'OK' }]);
      break;

    default:
      console.log('📝 Unknown streaming event:', data.type, data);
  }
};

const convertStreamedHotelToDisplay = (streamedHotel: any, index: number): Hotel => {
  console.log('🔄 Converting streamed hotel:', streamedHotel.name);

  const getHotelImage = (hotel: any): string => {
    const defaultImage = "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80";
    
    if (hotel.images && hotel.images.length > 0) {
      const firstImage = hotel.images[0];
      if (firstImage && typeof firstImage === 'string' && firstImage.trim() !== '') {
        return firstImage;
      }
    }
    
    return defaultImage;
  };

  let price = 200;
  let originalPrice = price * 1.15;
  let priceComparison = "Standard rate";

  if (streamedHotel.pricePerNight) {
    price = streamedHotel.pricePerNight.amount || streamedHotel.pricePerNight;
    originalPrice = Math.round(price * 1.15);
    priceComparison = streamedHotel.pricePerNight.display || `${price}/night`;
  }

  // Handle both basic hotels and AI-enhanced hotels
  const isAIEnhanced = streamedHotel.whyItMatches && 
                      !streamedHotel.whyItMatches.includes('Analyzing') && 
                      !streamedHotel.whyItMatches.includes('progress');

  return {
    id: streamedHotel.hotelId || streamedHotel.id,
    name: streamedHotel.name,
    image: getHotelImage(streamedHotel),
    images: streamedHotel.images || [],
    price: Math.round(price),
    originalPrice: Math.round(originalPrice),
    priceComparison: priceComparison,
    rating: streamedHotel.starRating || 4.0,
    reviews: streamedHotel.reviewCount || Math.floor(Math.random() * 1000) + 100,
    safetyRating: 8.5 + Math.random() * 1.5,
    transitDistance: '5 min walk to main area',
    tags: streamedHotel.topAmenities?.slice(0, 3) || ["Premium amenities"],
    location: streamedHotel.address || streamedHotel.summarizedInfo?.location || 'Prime location',
    features: streamedHotel.amenities || streamedHotel.topAmenities || ["Excellent features"],
    thirdImageHd: streamedHotel.thirdImageHd || null,
    
    // AI content - use enhanced if available, otherwise show loading
    aiExcerpt: isAIEnhanced 
      ? streamedHotel.whyItMatches 
      : streamedHotel.whyItMatches?.includes('Analyzing') 
        ? streamedHotel.whyItMatches 
        : "Perfect match for your preferences!",
        
    whyItMatches: isAIEnhanced 
      ? streamedHotel.whyItMatches 
      : streamedHotel.whyItMatches || "Analyzing match reasons...",
      
    funFacts: isAIEnhanced 
      ? streamedHotel.funFacts 
      : streamedHotel.funFacts?.includes?.('Generating') 
        ? streamedHotel.funFacts 
        : ["Modern luxury facilities", "Prime location", "Excellent guest reviews"],
        
    guestInsights: isAIEnhanced 
      ? streamedHotel.guestInsights 
      : streamedHotel.guestInsights?.includes?.('Processing') 
        ? streamedHotel.guestInsights 
        : "Guests consistently praise the exceptional service and perfect location",
        
    nearbyAttractions: isAIEnhanced 
      ? streamedHotel.nearbyAttractions 
      : streamedHotel.nearbyAttractions?.includes?.('Finding') 
        ? streamedHotel.nearbyAttractions 
        : [`${streamedHotel.city || 'City'} center`, "Local attractions"],
        
    locationHighlight: isAIEnhanced 
      ? streamedHotel.locationHighlight 
      : streamedHotel.locationHighlight?.includes?.('Analyzing') 
        ? streamedHotel.locationHighlight 
        : "Prime location with easy access to everything",
    
    // Match data
    aiMatchPercent: streamedHotel.aiMatchPercent,
    matchType: streamedHotel.aiMatchPercent >= 90 ? 'perfect' :
               streamedHotel.aiMatchPercent >= 85 ? 'excellent' : 
               streamedHotel.aiMatchPercent >= 75 ? 'great' : 'good',
    
    // Hotel details
    pricePerNight: streamedHotel.pricePerNight,
    city: streamedHotel.city || streamedHotel.summarizedInfo?.city,
    country: streamedHotel.country || streamedHotel.summarizedInfo?.country,
    latitude: streamedHotel.latitude,
    longitude: streamedHotel.longitude,
    topAmenities: streamedHotel.topAmenities || [],
    hasAvailability: true,
    totalRooms: streamedHotel.totalRooms || 1,
    fullDescription: streamedHotel.description || streamedHotel.summarizedInfo?.description,
    fullAddress: streamedHotel.address || streamedHotel.summarizedInfo?.location,
    
    // Refundable policy
    isRefundable: streamedHotel.isRefundable,
    refundableTag: streamedHotel.refundableTag,
    refundableInfo: streamedHotel.refundableInfo || streamedHotel.summarizedInfo?.refundableInfo,
    
    // ADD THIS: All hotel info
    allHotelInfo: streamedHotel.allHotelInfo || "Detailed hotel information loading..."
  };
};

// FINAL FIX: Remove all custom event listeners - everything goes through 'message'

const executeStreamingSearch = async (userInput: string) => {
  if (!userInput.trim()) return;

  let eventSource: any = null;
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    console.log('🌊 Starting SSE Real-time Streaming Search...');
    setShowPlaceholders(true);
    setIsStreamingSearch(true);
    setFirstHotelFound(false);
    setStreamingProgress({ step: 0, totalSteps: 8, message: 'Starting search...' });

    const placeholderHotels = generatePlaceholderHotels(10);
    setDisplayHotels(placeholderHotels);

    setStage1Results(null);
    setStage2Results(null);
    
    // Clear previous results
    setDisplayHotels([]);
    setStage1Results(null);
    setStage2Results(null);

    const searchParams = new URLSearchParams({
      userInput: userInput,
      q: userInput
    });

    const sseUrl = `${BASE_URL}/api/hotels/search-and-match/stream?${searchParams.toString()}`;
    console.log('🔗 SSE URL:', sseUrl);

    // Create EventSource - use any to bypass TypeScript issues
    eventSource = new (EventSource as any)(sseUrl, {
      headers: {
        'Cache-Control': 'no-cache',
      },
      polyfill: true,
      withCredentials: false,
    });

    // ONLY USE STANDARD SSE EVENTS - no custom event names

    // Connection opened
    eventSource.addEventListener('open', () => {
      console.log('✅ SSE Connection opened');
    });

    // ALL messages come through here - this is the key fix
    eventSource.addEventListener('message', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        const eventType = data.type || 'message';
        
        console.log('📡 SSE Message received:', eventType);
        
        // Route based on data.type instead of using custom event listeners
        switch (eventType) {
          case 'connected':
            console.log('🔌 SSE Connected:', data.message);
            break;
            
          case 'progress':
            handleStreamingUpdate({ type: 'progress', ...data }, userInput);
            break;
            
          case 'hotel_found':
            handleStreamingUpdate({ type: 'hotel_found', ...data }, userInput);
            break;
            
          case 'hotel_enhanced':
            handleStreamingUpdate({ type: 'hotel_enhanced', ...data }, userInput);
            break;
            
          case 'complete':
            handleStreamingUpdate({ type: 'complete', ...data }, userInput);
            
            // Close connection on completion
            console.log('✅ Search completed, closing SSE connection');
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
            setIsStreamingSearch(false);
            
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            break;
            
          case 'error':
            console.error('❌ Server error:', data.message);
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
            setIsSearching(false);
            setIsStreamingSearch(false);
            Alert.alert('Search Error', data.message || 'An error occurred', [{ text: 'OK' }]);
            break;
            
          default:
            // Handle any other message types
            console.log('📝 Unknown SSE message type:', eventType, data);
            break;
        }

      } catch (parseError) {
        console.warn('⚠️ Failed to parse SSE data:', parseError, 'Raw data:', event.data);
      }
    });

    // Connection error
    eventSource.addEventListener('error', (error: any) => {
      console.error('❌ SSE Connection error:', error);
      
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      
      setIsSearching(false);
      setIsStreamingSearch(false);
      
      Alert.alert(
        'Connection Error',
        'Lost connection to search service. Please try again.',
        [{ text: 'OK' }]
      );
    });

    // Set timeout for safety (30 seconds)
    timeoutId = setTimeout(() => {
      console.warn('⏰ SSE search timeout after 30 seconds');
      
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      
      setIsSearching(false);
      setIsStreamingSearch(false);
      
      Alert.alert('Search Timeout', 'Search took too long. Please try again.', [{ text: 'OK' }]);
    }, 30000);

  } catch (error: any) {
    console.error('💥 SSE streaming search failed:', error);

    setShowPlaceholders(false);
    setDisplayHotels([]);
    
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    setIsSearching(false);
    setIsStreamingSearch(false);
    
    Alert.alert('Search Failed', error.message, [{ text: 'OK' }]);
  }

  // Store cleanup function
  (global as any).cleanupSSESearch = () => {
    console.log('🧹 Cleaning up SSE connection');
    
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    setIsStreamingSearch(false);
  };
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

  // NEW: Convert Stage 1 hotel to display format (basic info with loading placeholders)
  const convertStage1HotelToDisplay = (hotel: Stage1Hotel, index: number): Hotel => {
  console.log('🔍 Converting Stage 1 hotel (basic data):', hotel.name);
  
  const getHotelImage = (hotel: Stage1Hotel): string => {
    const defaultImage = "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80";
    
    if (hotel.images && hotel.images.length > 0) {
      const firstImage = hotel.images[0];
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

  if (hotel.pricePerNight) {
    price = hotel.pricePerNight.amount;
    originalPrice = Math.round(price * 1.15);
    priceComparison = hotel.pricePerNight.display;
    
    if (hotel.pricePerNight.provider) {
      priceComparison += ` (${hotel.pricePerNight.provider})`;
    }
  } else if (hotel.priceRange) {
    price = hotel.priceRange.min;
    originalPrice = Math.round(price * 1.15);
    priceComparison = hotel.priceRange.display;
  }

  const generateTransitDistance = (city: string, topAmenities: string[]): string => {
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
    // FIX: Use the actual hotel ID from the API instead of array index
    id: hotel.hotelId, // Changed from: index + 1
    name: hotel.name,
    image: getHotelImage(hotel),
    images: hotel.images || [],
    price: Math.round(price),
    originalPrice: Math.round(originalPrice),
    priceComparison: priceComparison,
    rating: hotel.starRating || 4.0,
    reviews: hotel.reviewCount || Math.floor(Math.random() * 1000) + 100,
    safetyRating: 8.5 + Math.random() * 1.5,
    transitDistance: generateTransitDistance(hotel.city, hotel.topAmenities),
    tags: hotel.topAmenities?.slice(0, 3) || hotel.amenities?.slice(0, 3) || ["Standard amenities"],
    location: hotel.address,
    features: hotel.amenities || ["Standard features"],
    
    // Stage 1: Show loading placeholders for AI content
    aiExcerpt: "AI is analyzing this hotel for you...", 
    whyItMatches: "AI match analysis in progress...", 
    funFacts: ["Loading interesting facts..."], 
    guestInsights: "Loading guest insights...", 
    nearbyAttractions: ["Finding nearby attractions..."], 
    locationHighlight: "Analyzing location advantages...", 
    
    // Basic data available immediately
    aiMatchPercent: hotel.aiMatchPercent,
    pricePerNight: hotel.pricePerNight,
    roomTypes: hotel.roomTypes,
    city: hotel.city,
    country: hotel.country,
    latitude: hotel.latitude,
    longitude: hotel.longitude,
    topAmenities: hotel.topAmenities,
    matchType: "analyzing", // Will be updated in Stage 2
    hasAvailability: hotel.hasAvailability,
    totalRooms: hotel.totalRooms,
    fullDescription: hotel.description,
    fullAddress: hotel.address,
    
    // NEW: Refundable policy data from Stage 1
    isRefundable: hotel.isRefundable,
    refundableTag: hotel.refundableTag,
    refundableInfo: hotel.refundableInfo
  };
};


const updateHotelsWithInsights = (stage2Results: Stage2InsightsResponse) => {
  console.log('🎨 Updating hotels with AI insights...');
  
  setDisplayHotels(prevHotels => 
    prevHotels.map(hotel => {
      const aiRecommendation = stage2Results.recommendations.find(
        rec => rec.hotelId === hotel.id.toString() || 
               rec.hotelId === hotel.id || 
               rec.hotelName === hotel.name
      );
      
      if (aiRecommendation) {
        console.log(`✨ Updating ${hotel.name} with AI insights`);
        return {
          ...hotel,
          aiExcerpt: aiRecommendation.whyItMatches,
          whyItMatches: aiRecommendation.whyItMatches,
          funFacts: aiRecommendation.funFacts || hotel.funFacts,
          guestInsights: aiRecommendation.guestInsights,
          nearbyAttractions: aiRecommendation.nearbyAttractions,
          locationHighlight: aiRecommendation.locationHighlight,
          allHotelInfo: aiRecommendation.allHotelInfo || hotel.allHotelInfo, // ADD THIS
          matchType: aiRecommendation.aiMatchPercent >= 85 ? 'excellent' : 
                    aiRecommendation.aiMatchPercent >= 75 ? 'great' : 'good'
        };
      }
      
      return hotel;
    })
  );
};

  // NEW: Execute Stage 2 - AI Insights
const executeStage2Insights = async (stage1Data: Stage1SearchResponse, userQuery?: string) => {
  try {
    console.log('🧠 Starting Stage 2: AI Insights Generation...');
    console.log('📥 Stage 1 data received:', {
      hotelCount: stage1Data.hotels?.length,
      searchParams: stage1Data.searchParams,
      searchId: stage1Data.searchId
    });
    
    setIsInsightsLoading(true);

    // Prepare hotels for insights - use the exact format your AI insights endpoint expects
    const hotelsForInsights = stage1Data.hotels.map(hotel => ({
      hotelId: hotel.hotelId,
      name: hotel.name,
      aiMatchPercent: hotel.aiMatchPercent,
      summarizedInfo: {
        name: hotel.name,
        description: hotel.description?.substring(0, 1000) || hotel.summarizedInfo?.description?.substring(0, 1000) || 'Quality accommodation',
        amenities: hotel.topAmenities || hotel.amenities || hotel.summarizedInfo?.amenities || [],
        starRating: hotel.starRating,
        reviewCount: hotel.reviewCount,
        pricePerNight: hotel.pricePerNight?.display || hotel.summarizedInfo?.pricePerNight || 'Price not available',
        location: hotel.address || hotel.summarizedInfo?.location || 'Location not available',
        city: hotel.city,
        country: hotel.country,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        isRefundable: hotel.isRefundable || false,
        refundableInfo: hotel.refundableInfo || 'No refund information available'
      }
    }));

    console.log(`📦 Prepared ${hotelsForInsights.length} hotels for AI insights`);
    console.log('🔍 Sample hotel for insights:', hotelsForInsights[0]);

    const stage2Response: Stage2InsightsResponse = await makeRequest('/api/hotels/ai-insights', {
      hotels: hotelsForInsights,
      userQuery: userQuery,
      nights: stage1Data.searchParams?.nights || 2
    });

    console.log('✅ Stage 2 Complete - AI insights generated!');
    console.log(`🎨 Generated insights for ${stage2Response.processedHotels} hotels`);
    console.log(`🤖 AI Models: ${stage2Response.aiModels.content} + ${stage2Response.aiModels.insights}`);

    setStage2Results(stage2Response);
    
    // Update hotels with AI insights
    updateHotelsWithInsights(stage2Response);

    console.log('🎉 Stage 2 insights applied to displayed hotels');

  } catch (error: any) {
    console.error('❌ Stage 2 failed:', error);
    
    // Check if it's a payload size error
    if (error.message.includes('too large') || error.message.includes('PayloadTooLargeError')) {
      console.error('💥 Payload too large error - even compressed data exceeded server limits');
      Alert.alert(
        'Data Processing Issue',
        'The search results are too large to enhance with AI insights. Using basic recommendations.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'AI Insights Unavailable',
        `Using fallback insights. Hotel data is still accurate.\n\nError: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
    
    // Provide fallback insights
    setDisplayHotels(prevHotels => 
      prevHotels.map(hotel => ({
        ...hotel,
        aiExcerpt: "Great choice with excellent amenities and location",
        whyItMatches: "Excellent choice with great amenities and location", 
        funFacts: ["Modern facilities", "Excellent guest reviews"],
        guestInsights: "Guests appreciate the comfortable accommodations and convenient location.",
        nearbyAttractions: [`${hotel.city} center`, "Local landmarks"],
        locationHighlight: "Prime location"
      }))
    );
    
  } finally {
    setIsInsightsLoading(false);
  }
};

  // Convert recommendation to display format (legacy compatibility)
const convertRecommendationToDisplayHotel = (recommendation: HotelRecommendation, index: number): Hotel => {
  console.log('🔍 Converting legacy recommendation:', recommendation.name);
  
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
    // FIX: Use the actual hotel ID from the API instead of array index
    id: recommendation.hotelId, // Changed from: index + 1
    name: recommendation.name,
    image: getHotelImage(recommendation),
    images: recommendation.images || [],
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
    fullAddress: recommendation.address,
    
    // NEW: Refundable policy data from legacy recommendation
    isRefundable: recommendation.isRefundable,
    refundableTag: recommendation.refundableTag,
    refundableInfo: recommendation.refundableInfo
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

  // NEW: Two-stage optimized search
  const executeTwoStageOptimizedSearch = async (userInput: string) => {
    if (!userInput.trim()) return;

    try {
      console.log('\n' + '='.repeat(80));
      console.log('🚀 Starting Two-Stage Optimized Hotel Search...');
      console.log('📝 User Input:', userInput);
      
      setShowPlaceholders(true);

      const placeholderHotels = generatePlaceholderHotels(10);
      setDisplayHotels(placeholderHotels);

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

      // Start AI suggestions loading in parallel
const aiSuggestionsPromise = loadAiSuggestionsForSearch(userInput, searchContext);

      // STAGE 1: Hotel Search + Llama Matching
      console.log('🏨 Stage 1: Starting hotel search and Llama matching...');
      const stage1Response: Stage1SearchResponse = await makeRequest('/api/hotels/search-and-match', {
        userInput: userInput
      });

      console.log('✅ Stage 1 Complete - Basic hotel data ready!');
      console.log('📊 Stage 1 Performance:', stage1Response.performance);
      console.log('🎯 Matched Hotels:', stage1Response.matchedHotelsCount);
      console.log('🔍 Search ID:', stage1Response.searchId);

      setStage1Results(stage1Response);
      setCurrentSearchId(stage1Response.searchId);

      await aiSuggestionsPromise;
console.log('🤖 AI suggestions loading completed!');

      // IMMEDIATELY Convert Stage 1 hotels to display format and show them
      const basicHotels: Hotel[] = stage1Response.hotels.map((hotel: Stage1Hotel, index: number) => 
        convertStage1HotelToDisplay(hotel, index)
      );

      setDisplayHotels(basicHotels);
    setShowPlaceholders(false);
      
      // Show hotels immediately after Stage 1
      setDisplayHotels(basicHotels);
      setIsSearching(false); // Stop the main loading screen

      // Update dates and guest info from search response
      if (stage1Response.searchParams.checkin) {
        setCheckInDate(new Date(stage1Response.searchParams.checkin));
      }
      if (stage1Response.searchParams.checkout) {
        setCheckOutDate(new Date(stage1Response.searchParams.checkout));
      }
      if (stage1Response.searchParams.adults) {
        setAdults(stage1Response.searchParams.adults);
      }
      if (stage1Response.searchParams.children) {
        setChildren(stage1Response.searchParams.children);
      }

      // Show Stage 1 results immediately
      const performanceText = `⚡ Fast search (${stage1Response.performance.totalTimeMs}ms)`;
      Alert.alert(
        'Hotels Found! 🎯', 
        `Found ${stage1Response.matchedHotelsCount} AI-matched hotels.\n\n${performanceText}\n\n🧠 Now enhancing with AI insights...`,
        [{ text: 'View Hotels' }]
      );
      

      // STAGE 2: AI Insights Generation (in background after showing hotels)
      console.log('🧠 Stage 2: Starting AI insights generation in background...');
      
      // Wait for AI suggestions to complete (if not already done)
      await aiSuggestionsPromise;
      console.log('🤖 AI suggestions pre-loading completed!');

      // Execute Stage 2 insights in background
      await executeStage2Insights(stage1Response, userInput);

    } catch (error: any) {
      console.error('💥 Two-stage search failed:', error);

      setShowPlaceholders(false);
    setDisplayHotels([]);
      
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

  // PRODUCTION: Legacy single-stage search (for backward compatibility)
  const executeLegacySearch = async (userInput: string) => {
    if (!userInput.trim()) return;

    try {
      console.log('\n' + '='.repeat(80));
      console.log('🚀 Starting Legacy Hotel Search...');
      console.log('📝 User Input:', userInput);
      
      setIsSearching(true);
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

await loadAiSuggestionsForSearch(userInput, searchContext);

      // START HOTEL SEARCH
      const searchPromise = makeRequest('/api/hotels/search', {
        userInput: userInput
      });

      // Wait for hotel search to complete (AI suggestions continue in background)
      const searchResponse: OptimizedSearchResponse = await searchPromise;

      console.log('✅ Legacy Search Complete!');
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

      // Start sentiment polling if insights are pending (legacy behavior)
      if (searchResponse.insightsPending && searchResponse.searchId) {
        console.log('🎭 Starting legacy sentiment polling...');
        // Add legacy sentiment polling logic here if needed
      }


    } catch (error: any) {
      console.error('💥 Legacy search failed:', error);
      
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
  

  // MAIN SEARCH FUNCTION - routes to test, two-stage, or legacy
const executeSearch = async (userInput: string) => {
  if (TEST_MODE) {
    await executeTestSearch(userInput);
  } else {
    // Always try streaming for immediate results
    try {
      await executeStreamingSearch(userInput);
    } catch (error: any) {
      console.warn('⚠️ Streaming failed, falling back to two-stage...', error);
      await executeTwoStageOptimizedSearch(userInput);
    }
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

  useEffect(() => {
  return () => {
    // Clean up SSE connection when component unmounts
    if ((global as any).cleanupSSESearch) {
      (global as any).cleanupSSESearch();
    }
    
    if (sentimentPollingRef.current) {
      clearInterval(sentimentPollingRef.current);
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }
  };
}, []);

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
  
  // NEW: Include refundable policy information
  if (hotel.isRefundable !== undefined) {
    const refundIcon = hotel.isRefundable ? '✅' : '❌';
    bookingMessage += `${refundIcon} Refundable: ${hotel.refundableInfo || (hotel.isRefundable ? 'Yes' : 'No')}\n`;
    if (hotel.refundableTag) {
      bookingMessage += `🏷️  Policy: ${hotel.refundableTag}\n`;
    }
  }
  
  if (hotel.aiMatchPercent) {
    bookingMessage += `🤖 AI Match: ${hotel.aiMatchPercent}% match\n`;
    bookingMessage += `✨ Match Type: ${hotel.matchType || 'good'}\n`;
  }
  
  bookingMessage += `\n`;
  
  // Use Stage 1 results if available, otherwise fallback to legacy
  const searchParams = stage1Results?.searchParams || searchResults?.searchParams;
  
  if (searchParams) {
    bookingMessage += `📅 Dates: ${searchParams.checkin} to ${searchParams.checkout}\n`;
    bookingMessage += `👥 Guests: ${searchParams.adults} adults`;
    if (searchParams.children > 0) {
      bookingMessage += `, ${searchParams.children} children`;
    }
    bookingMessage += `\n🌙 Nights: ${searchParams.nights}\n`;
    
    const nightsCount = searchParams.nights;
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
}, [stage1Results, searchResults]);

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
    
    const hasEnhancedInsights = hotel.whyItMatches && 
                                !hotel.whyItMatches.includes('Analyzing') && 
                                !hotel.whyItMatches.includes('progress');
    
    if (hasEnhancedInsights) {
      detailsMessage += `• Why it matches: ${hotel.whyItMatches}\n`;
      detailsMessage += `• ✨ Real-time AI insights active\n`;
    } else {
      detailsMessage += `• 🔄 AI insights generating...\n`;
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
  if (hotel.locationHighlight && !hotel.locationHighlight.includes('Analyzing')) {
    detailsMessage += `• Highlight: ${hotel.locationHighlight}\n`;
  }
  detailsMessage += `• Transit: ${hotel.transitDistance}\n\n`;
  
  if (hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0 && !hotel.nearbyAttractions[0].includes('Finding')) {
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
  
  const hasEnhancedGuestInsights = hotel.guestInsights && !hotel.guestInsights.includes('Processing');
  if (hasEnhancedGuestInsights) {
    detailsMessage += `💬 Guest Insights (AI-Enhanced):\n${hotel.guestInsights}\n\n`;
  } else {
    detailsMessage += `💬 Guest Insights:\n🔄 AI analyzing guest feedback...\n\n`;
  }
  
  if (hotel.topAmenities && hotel.topAmenities.length > 0) {
    detailsMessage += `🏨 Top Amenities:\n`;
    hotel.topAmenities.forEach(amenity => {
      detailsMessage += `• ${amenity}\n`;
    });
    detailsMessage += `\n`;
  }
  
  if (hotel.funFacts && hotel.funFacts.length > 0 && !hotel.funFacts[0].includes('Generating')) {
    detailsMessage += `🎉 AI-Curated Fun Facts:\n`;
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
  
  // Add refundable policy info
  if (hotel.isRefundable !== undefined) {
    detailsMessage += `\n🔄 Refund Policy:\n`;
    detailsMessage += `• Refundable: ${hotel.isRefundable ? 'Yes' : 'No'}\n`;
    if (hotel.refundableInfo) {
      detailsMessage += `• Details: ${hotel.refundableInfo}\n`;
    }
    if (hotel.refundableTag) {
      detailsMessage += `• Policy Code: ${hotel.refundableTag}\n`;
    }
  }
  
}, [handleBookNow]);

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
  
  if (hotel.locationHighlight && !hotel.locationHighlight.includes('Analyzing')) {
    alertMessage += `🎯 ${hotel.locationHighlight}\n\n`;
  }
  
  // Check if AI insights are enhanced or still loading
  const hasEnhancedInsights = hotel.whyItMatches && 
                              !hotel.whyItMatches.includes('Analyzing') && 
                              !hotel.whyItMatches.includes('progress');
  
  if (hasEnhancedInsights) {
    alertMessage += `✨ Why it matches: ${hotel.whyItMatches}\n\n`;
    
    if (hotel.guestInsights && !hotel.guestInsights.includes('Processing')) {
      alertMessage += `💬 Guest Insights: ${hotel.guestInsights}\n\n`;
    }
    
    if (hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0 && !hotel.nearbyAttractions[0].includes('Finding')) {
      alertMessage += `🗺️ Nearby: ${hotel.nearbyAttractions.slice(0, 2).join(', ')}\n\n`;
    }
  } else {
    alertMessage += `🔄 AI insights generating in real-time...\n\n`;
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
  

}, [handleViewDetails]);

const handleBackPress = useCallback(() => {
  console.log('Back button pressed - starting transition animation');
  
  // Cleanup first
  if ((global as any).cleanupSSESearch) {
    (global as any).cleanupSSESearch();
  }
  if (sentimentPollingRef.current) {
    clearInterval(sentimentPollingRef.current);
    sentimentPollingRef.current = null;
  }
  if (pollingTimeoutRef.current) {
    clearTimeout(pollingTimeoutRef.current);
    pollingTimeoutRef.current = null;
  }
  
  // Animate out (opposite direction - slide to the right)
  Animated.parallel([
    Animated.timing(screenSlideOut, {
      toValue: width, // Slide to the right (opposite of InitialSearch)
      duration: 400,
      useNativeDriver: true,
    }),
    Animated.timing(contentFadeOut, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }),
    Animated.timing(scaleTransition, {
      toValue: 0.95,
      duration: 400,
      useNativeDriver: true,
    }),
  ]).start(() => {
    navigation.goBack();
    
  });
}, [navigation]);

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <Animated.View
      style={[
        tw`flex-1`,
        {
          opacity: contentFadeOut,
          transform: [
            { translateX: screenSlideOut },
            { scale: scaleTransition },
          ],
        },
      ]}
    >

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
  // keep visuals CONSTANT
  style={[
    tw`flex-1 py-3 px-8 rounded-2xl flex-row items-center justify-center shadow-lg`,
    { 
      backgroundColor: '#1df9ff',
      shadowColor: '#1df9ff',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    }
  ]}
  onPress={handleAiSearch}
  activeOpacity={0.9}
  disabled={isBusy}                    // blocks taps, no visual change
  accessibilityState={{ disabled: isBusy }}  // a11y
>
  <Ionicons name="sparkles" size={20} color="#FFFFFF" />
  <Text style={tw`text-white font-semibold text-base ml-3`}>
    {isBusy ? 'Searching…' : 'Refine Search'}
  </Text>
</TouchableOpacity>



        </View>

{/* SEARCH RESULTS HEADER WITH PERFORMANCE INDICATORS */}
{searchQuery.trim().length > 0 && (
  <View style={tw`bg-white px-3 py-2 rounded-lg border border-gray-200`}>
    <View style={tw`flex-row items-center justify-between`}>
      <Text style={tw`text-xs text-gray-500 flex-1`}>
        {isStreamingSearch && displayHotels.length > 0
          ? `${displayHotels.length} Hotels Found For "${searchQuery}"`
          : isStreamingSearch
            ? `Searching for "${searchQuery}"`
            : displayHotels.length > 0
              ? `${displayHotels.length} Hotels Found For "${searchQuery}"`
              : `Results for "${searchQuery}"`
        }
      </Text>
    </View>
    
    {/* Streaming progress message */}
    {isStreamingSearch && streamingProgress.message && (
      <Text style={tw`text-xs text-blue-500 mt-1`}>
        {streamingProgress.message}
      </Text>
    )}
  </View>
)}
            </View>
            
            {/* Search info with dates and insights loading indicator */}
            {(stage1Results?.searchParams || searchResults?.searchParams) && (
              <View style={tw`flex-row items-center justify-between mt-1`}>
                <Text style={tw`text-xs text-gray-400`}>
                  {(stage1Results?.searchParams || searchResults?.searchParams)!.cityName}, {(stage1Results?.searchParams || searchResults?.searchParams)!.countryCode.toUpperCase()} • 
                  {new Date((stage1Results?.searchParams || searchResults?.searchParams)!.checkin).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date((stage1Results?.searchParams || searchResults?.searchParams)!.checkout).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • 
                  {(stage1Results?.searchParams || searchResults?.searchParams)!.adults} adults
                  {((stage1Results?.searchParams || searchResults?.searchParams)!.children || 0) > 0 ? `, ${(stage1Results?.searchParams || searchResults?.searchParams)!.children} children` : ''}
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
                  
                  {/* Stage completion indicators */}
                  {stage1Results && !TEST_MODE && (
                    <View style={tw`flex-row items-center`}>
                      <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                      <Text style={tw`text-xs text-green-600 ml-1`}>
                        Stage 1
                      </Text>
                    </View>
                  )}
                  
                  {stage2Results && !TEST_MODE && (
                    <View style={tw`flex-row items-center`}>
                      <Ionicons name="checkmark-circle" size={12} color="#3B82F6" />
                      <Text style={tw`text-xs text-blue-600 ml-1`}>
                        Stage 2
                      </Text>
                    </View>
                  )}
              </View>
            </View>
          )}


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
        // NEW: Add placeholder prop
        showPlaceholders={showPlaceholders}
        isInsightsLoading={isInsightsLoading}
        stage1Complete={!!stage1Results}
        stage2Complete={!!stage2Results}
        searchMode={TEST_MODE ? 'test' : stage1Results ? 'two-stage' : 'legacy'}
      />
      </View>

      {/* AI SEARCH OVERLAY */}
      <AISearchOverlay
        visible={showAiOverlay}
        onClose={handleCloseAiOverlay}
        onSearchUpdate={handleSearchUpdate}
        currentSearch={searchQuery}
        searchContext={{
          location: (stage1Results?.searchParams || searchResults?.searchParams)?.cityName,
          dates: {
            checkin: checkInDate.toISOString().split('T')[0],
            checkout: checkOutDate.toISOString().split('T')[0],
          },
          guests: {
            adults: adults,
            children: children,
          },
          budget: {
            min: (stage1Results?.searchParams || searchResults?.searchParams)?.minCost,
            max: (stage1Results?.searchParams || searchResults?.searchParams)?.maxCost,
            currency: (stage1Results?.searchParams || searchResults?.searchParams)?.currency,
          },
          // Include result count for AI's opening message
          resultCount: displayHotels.length || stage1Results?.matchedHotelsCount || searchResults?.aiRecommendationsCount || 0
        }}
      />
      </Animated.View>
    </SafeAreaView>
  );
};

export default HomeScreen;