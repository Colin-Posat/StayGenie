// HomeScreen.tsx - Updated with MorphingSearchChat
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  TextInput,
  AppState
} from 'react-native';
import { Text } from '../components/CustomText'; 
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import SwipeableStoryView from '../components/StoryView/SwipeableStoryView';
import AISearchOverlay from '../components/HomeScreenTop/AiSearchOverlay';
import LoadingScreen from '../components/HomeScreenTop/LoadingScreen';
import { useNavigation, useRoute, CompositeNavigationProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import EventSource from 'react-native-sse';
import Constants from 'expo-constants';
import SearchGuidePills from '../components/InitalSearch/SearchGuidePills';
import { Easing, Keyboard, KeyboardAvoidingView, ScrollView } from 'react-native';
import FavoritesPopup from '../components/StoryView/FavoritesPopup';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import SearchErrorScreen from '../components/HomeScreenTop/NoHotelsFoundScreen';
const OVERLAY_BACKDROP = 'rgba(0,0,0,0.7)';
import dotenv from 'dotenv';
import { useFonts } from 'expo-font';
import { AnalyticsService } from '../services/analytics';
import { useAuth } from '../contexts/AuthContext';
import MapViewScreen from '../screens/MapViewScreen';
import { RecentSearch } from '../contexts/AuthContext';
import FeedbackSystem from '../components/Feedback/FeedbackSystem';
import { feedbackTrigger } from '../services/feedbackTrigger';
import MorphingSearchChat from '../components/MorphingSearchChat';

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
type TabParamList = {
  Find: undefined;
  Favorites: undefined;
  Profile: undefined;
};

type HomeScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<FindStackParamList, 'Results'>,
  BottomTabNavigationProp<TabParamList>
>;

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

interface Stage1Hotel {
  hotelId: string;
  name: string;
  aiMatchPercent: number;
  starRating: number;
  images: string[];
  photoGalleryImages?: string[];
  categoryRatings?: {
    cleanliness: number;
    service: number;
    location: number;
    roomQuality: number;
  };
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
  isRefundable: boolean;
  refundableTag: string | null;
  refundableInfo: string;
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
    isRefundable: boolean;
    refundableInfo: string;
    photoGalleryImages?: string[];
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
  firstRoomImage?: string | null;
  secondRoomImage?: string | null;
  allHotelInfo?: string;
  safetyRating: number;
  safetyJustification: string;
  photoGalleryImages: string[];
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

export interface Hotel {
  id: string;
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
  photoGalleryImages?: string[];
  
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
  
  isRefundable?: boolean;
  refundableTag?: string | null;
  refundableInfo?: string;

  isPlaceholder?: boolean;
  firstRoomImage?: string | null;
  secondRoomImage?: string | null;
  allHotelInfo?: string;

  aiSafetyRating?: number;
  safetyJustification?: string;
  categoryRatings?: {
    cleanliness: number;
    service: number;
    location: number;
    roomQuality: number;
  };
  distanceFromSearch?: {
    km: number;
    formatted: string;
    fromLocation?: string;
    showInUI?: boolean;
    searchLocation?: string;
  } | null;
}

const BASE_URL ="https://staygenie-wwpa.onrender.com"

import { Dimensions } from 'react-native';

const HomeScreen = () => {
  const searchCompleted = useRef(false);

  const { addRecentSearch } = useAuth();
  const screenSlideOut = useRef(new Animated.Value(0)).current;
  const contentFadeOut = useRef(new Animated.Value(1)).current;
  const scaleTransition = useRef(new Animated.Value(1)).current;
  const route = useRoute();
  const params = route.params as RouteParams;
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const width = Dimensions.get('window').width;
  const [streamingSearchParams, setStreamingSearchParams] = useState<any>(null);
const [isSearchInfoExpanded, setIsSearchInfoExpanded] = useState(false);
const [textIsTruncated, setTextIsTruncated] = useState(false);
const [shouldShowChevron, setShouldShowChevron] = useState(false);
  // State management
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [searchParamsLoading, setSearchParamsLoading] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [scrollToHotelId, setScrollToHotelId] = useState<string | null>(null);
const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);

  const [searchError, setSearchError] = useState<{
  type: 'no_hotels_found' | 'processing_error' | 'timeout';
  message: string;
  originalQuery: string;
} | null>(null);
const [showErrorScreen, setShowErrorScreen] = useState(false);
  
  // NEW: Two-stage search state
  const [stage1Results, setStage1Results] = useState<Stage1SearchResponse | null>(null);
  const [stage2Results, setStage2Results] = useState<Stage2InsightsResponse | null>(null);
  const [displayHotels, setDisplayHotels] = useState<Hotel[]>([]);
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);

  const [isStreamingSearch, setIsStreamingSearch] = useState(false);
const [streamingProgress, setStreamingProgress] = useState({ step: 0, totalSteps: 8, message: '' });
const [streamedHotels, setStreamedHotels] = useState<Hotel[]>([]);
const [firstHotelFound, setFirstHotelFound] = useState(false);
  const [fontsLoaded] = useFonts({
  'Merriweather-Bold': require('../assets/fonts/Merriweather_36pt-Bold.ttf'),
  'Merriweather-Regular': require('../assets/fonts/Merriweather_36pt-Regular.ttf'),
});

  // Legacy state for backward compatibility
  const [searchResults, setSearchResults] = useState<OptimizedSearchResponse | null>(null);
  
  const isBusy = isSearching || isStreamingSearch || isInsightsLoading;
  // AI Suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
const [isLoadingAiSuggestions, setIsLoadingAiSuggestions] = useState(false);
const [aiSuggestionsError, setAiSuggestionsError] = useState<string | null>(null);
const [aiSuggestionsLoaded, setAiSuggestionsLoaded] = useState(false);
  
const [isEditingSearch, setIsEditingSearch] = useState(false);
const [editedSearchQuery, setEditedSearchQuery] = useState('');
const searchHasStarted = useRef(false);

const editContainerHeight = useRef(new Animated.Value(0)).current;
const editContentOpacity = useRef(new Animated.Value(0)).current;
const editBackgroundScale = useRef(new Animated.Value(1)).current;
const normalModeOpacity = useRef(new Animated.Value(1)).current;
const [showFavoritesPopup, setShowFavoritesPopup] = useState(false);
const [favoritedHotelName, setFavoritedHotelName] = useState('');
  
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
const editModeOpacity = useRef(new Animated.Value(0)).current;
const searchWasActive = useRef(false);

useEffect(() => {
  feedbackTrigger.trackSession();
}, []);

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

  const editModeAnimation = useRef(new Animated.Value(0)).current;
const editContentHeight = useRef(new Animated.Value(0)).current;
const editOpacity = useRef(new Animated.Value(0)).current;

const handleFavoriteSuccess = useCallback((hotelName: string) => {
  console.log('Hotel favorited:', hotelName);
  setFavoritedHotelName(hotelName);
  setShowFavoritesPopup(true);
}, []);

const handleNavigateToFavorites = useCallback(() => {
    setShowFavoritesPopup(false);
    navigation.navigate('Favorites');
  }, [navigation]);

const editAnim = useRef(new Animated.Value(0)).current;

const overlayOpacity = editAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [0, 1],
});

const cardTranslateY = editAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [-8, 0],
});

const cardOpacity = editAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [0, 1],
});

const normalHeaderScale = editAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [1, 0.98],
});

const saveRecentSearch = useCallback(async (searchQuery: string) => {
  if (!searchQuery.trim()) return;
  
  try {
    await addRecentSearch(searchQuery);
  } catch (error) {
    console.error('Failed to save search:', error);
  }
}, [addRecentSearch]);

const replaceDateInSearch = (prev: string, newDate: string) => {
  if (!prev.trim()) return newDate;

  const dateRegex = /\b([A-Z][a-z]{2}\s\d{1,2},\s\d{4})\s*-\s*([A-Z][a-z]{2}\s\d{1,2},\s\d{4})\b/;

  let cleaned = prev.replace(dateRegex, '').trim();

  cleaned = cleaned.replace(/•\s*•/g, '•').trim();
  cleaned = cleaned.replace(/^•\s*/, '').replace(/\s*•$/, '');

  return cleaned.length > 0 ? `${cleaned} • ${newDate}` : newDate;
};

const debugHotelState = () => {
  console.log('🔍 HOTEL STATE DEBUG:', {
    displayHotelsCount: displayHotels.length,
    showPlaceholders,
    isStreamingSearch,
    firstHotelFound,
    placeholderCount: displayHotels.filter(h => h.isPlaceholder).length,
    realHotelCount: displayHotels.filter(h => !h.isPlaceholder).length,
    hotelNames: displayHotels.map(h => ({ name: h.name || 'NO_NAME', id: h.id, isPlaceholder: h.isPlaceholder }))
  });
};

const editSearchInputRef = useRef<TextInput>(null);

const formatDateRange = (checkin: Date, checkout: Date) => {
  const checkinStr = checkin.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  const checkoutStr = checkout.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  return `${checkinStr} - ${checkoutStr}`;
};

const formatGuestInfo = (adults: number, children: number) => {
  let guestStr = `${adults} adult${adults !== 1 ? 's' : ''}`;
  if (children > 0) {
    guestStr += `, ${children} child${children !== 1 ? 'ren' : ''}`;
  }
  return guestStr;
};

const {submitFeedback } = useAuth();

const generatePlaceholderHotels = useCallback((count: number = 10): Hotel[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `placeholder-${index}`,
    name: '',
    image: '',
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
    isPlaceholder: true,
  }));
}, []);

const handleFeedbackSubmitted = async (rating: number, feedback?: string) => {
  console.log('📝 Feedback submitted:', { rating, feedback });
  
 if (rating > 0) {
    try {
      await submitFeedback({
        isHappy: true,
        rating: rating,
        feedback: 'User enjoyed the app and left a review',
        searchQuery: searchQuery,
      });
    } catch (error) {
      console.error('Failed to send positive feedback:', error);
    }
    
    await AnalyticsService.trackEvent('user_left_review', { 
      rating,
      source: 'feedback_popup'
    });
  } else {
    await feedbackTrigger.markUserReviewed();
    
    try {
      await submitFeedback({
        isHappy: false,
        rating: null,
        feedback,
        searchQuery: searchQuery,
      });
    } catch (error) {
      console.error('Failed to send feedback:', error);
    }
  }
  
  setShowFeedbackPopup(false);
};

const handleStreamingUpdate = async (data: any, userInput?: string) => {
  console.log('📡 Streaming update received:', data.type);

  switch (data.type) {
case 'progress':
  setStreamingProgress({
    step: data.step || 0,
    totalSteps: data.totalSteps || 8,
    message: data.message || 'Processing...'
  });
  
  if (data.searchParams) {
    console.log('📅 Received parsed dates early:', data.searchParams);
    
    setSearchParamsLoading(false);
    
    if (data.searchParams.checkin) {
      const checkinDate = new Date(data.searchParams.checkin + 'T12:00:00');
      setCheckInDate(checkinDate);
      console.log('✅ Updated check-in date:', checkinDate);
    }
    
    if (data.searchParams.checkout) {
      const checkoutDate = new Date(data.searchParams.checkout + 'T12:00:00');
      setCheckOutDate(checkoutDate);
      console.log('✅ Updated check-out date:', checkoutDate);
    }
    
    if (data.searchParams.adults) {
      setAdults(data.searchParams.adults);
      console.log('✅ Updated adults:', data.searchParams.adults);
    }
    
    if (data.searchParams.children) {
      setChildren(data.searchParams.children);
      console.log('✅ Updated children:', data.searchParams.children);
    }
  }

      if (data.destination && !checkInDate) {
        const defaultCheckIn = new Date();
        defaultCheckIn.setDate(defaultCheckIn.getDate() + 7);
        const defaultCheckOut = new Date();
        defaultCheckOut.setDate(defaultCheckOut.getDate() + 9);
        
        setCheckInDate(defaultCheckIn);
        setCheckOutDate(defaultCheckOut);
        setAdults(2);
      }
      break;

    case 'hotel_found':
      if (data.hotel) {
        const newHotel = convertStreamedHotelToDisplay(data.hotel, data.hotelIndex - 1);
        
        if (!firstHotelFound && data.hotelIndex === 1) {
          console.log('🎯 FIRST HOTEL FOUND - Showing immediately!');
          setFirstHotelFound(true);
          setShowPlaceholders(false);
          setDisplayHotels([newHotel]);
        } else {
          console.log(`🔥 Hotel ${data.hotelIndex}/${data.totalExpected} streaming in: ${newHotel.name} (${newHotel.aiMatchPercent}% match)`);
          
          setDisplayHotels(prevHotels => {
            const realHotels = prevHotels.filter(h => !h.isPlaceholder);
            const updatedHotels = [...realHotels];
            const existingIndex = updatedHotels.findIndex(h => h.id === newHotel.id);
            
            if (existingIndex >= 0) {
              updatedHotels[existingIndex] = newHotel;
              console.log(`🔄 Updated existing hotel: ${newHotel.name}`);
            } else {
              updatedHotels.push(newHotel);
              console.log(`➕ Added new hotel: ${newHotel.name}`);
            }
            
            if (updatedHotels.length > 0 && !updatedHotels[0].isPlaceholder) {
              setShowPlaceholders(false);
            }
            
            return updatedHotels.sort((a, b) => (b.aiMatchPercent || 0) - (a.aiMatchPercent || 0));
          });
        }

        console.log(`✨ Hotel ${data.hotelIndex}/${data.totalExpected} processed: ${data.hotel.name} (${data.hotel.aiMatchPercent}%)`);
      }
      break;

    case 'hotel_enhanced':
      if (data.hotel && data.hotelId) {
         console.log('✨✨✨✨✨✨✨ RECEIVED ENHANCED HOTEL:', {
      name: data.hotel.name,
      hasDistance: !!data.hotel.distanceFromSearch,
      distanceObject: data.hotel.distanceFromSearch,
      showInUI: data.hotel.distanceFromSearch?.showInUI,
      fromLocation: data.hotel.distanceFromSearch?.fromLocation
    });
    console.log("poopdiescoop")
        
        const enhancedHotel = convertStreamedHotelToDisplay(data.hotel, data.hotelIndex - 1);
        
        setDisplayHotels(prevHotels => {
          const updatedHotels = [...prevHotels];
          const existingIndex = updatedHotels.findIndex(h => h.id === data.hotelId);
          
          if (existingIndex >= 0) {
            console.log(`🔄 Updating hotel at index ${existingIndex}: ${data.hotel.name}`);

            updatedHotels[existingIndex] = {
              ...updatedHotels[existingIndex],
              ...enhancedHotel,
              aiExcerpt: enhancedHotel.whyItMatches || enhancedHotel.aiExcerpt,
              whyItMatches: enhancedHotel.whyItMatches || "Enhanced with AI insights",
              funFacts: enhancedHotel.funFacts || ["AI-curated facts"],
              guestInsights: enhancedHotel.guestInsights || "AI-enhanced guest insights",
              nearbyAttractions: enhancedHotel.nearbyAttractions || ["AI-found attractions"],
              locationHighlight: enhancedHotel.locationHighlight || "AI-analyzed location",
              allHotelInfo: enhancedHotel.allHotelInfo || "Comprehensive hotel details available",
              topAmenities: enhancedHotel.topAmenities || updatedHotels[existingIndex].topAmenities || [],
              tags: enhancedHotel.topAmenities?.slice(0, 3) || updatedHotels[existingIndex].tags || ["Premium amenities"],
              safetyRating: enhancedHotel.aiSafetyRating || enhancedHotel.safetyRating || updatedHotels[existingIndex].safetyRating,
              aiSafetyRating: enhancedHotel.aiSafetyRating,
              safetyJustification: enhancedHotel.safetyJustification || "AI-enhanced safety assessment",
              photoGalleryImages: enhancedHotel.photoGalleryImages || [],
              categoryRatings: data.hotel.categoryRatings
            };
            
            console.log(`🎨 Successfully enhanced hotel: ${data.hotel.name} with ${enhancedHotel.photoGalleryImages?.length || 0} gallery images`);
            console.log(`📊 Category ratings applied:`, data.hotel.categoryRatings);
          } else {
            console.warn(`⚠️ Could not find hotel ${data.hotelId} to enhance in current hotels list of ${updatedHotels.length}`);
            console.log(`Current hotel IDs:`, updatedHotels.map(h => h.id));
          }
          
          return updatedHotels.sort((a, b) => (b.aiMatchPercent || 0) - (a.aiMatchPercent || 0));
        });
      }
      break;

    case 'complete':
      
      searchCompleted.current = true; 
      console.log('🎉 All hotels found and AI-enhanced!');
      setSearchParamsLoading(false);

      (async () => {
        try {
          await feedbackTrigger.trackSearch();
          const shouldShow = await feedbackTrigger.shouldShowPrompt();
          
          if (shouldShow) {
            setTimeout(() => {
              setShowFeedbackPopup(true);
              feedbackTrigger.markPromptShown();
            }, 3000);
          }
        } catch (error) {
          console.error('Feedback prompt error:', error);
        }
      })();

      setStreamingProgress({
        step: 8,
        totalSteps: 8,
        message: 'All hotels enhanced with AI insights!'
      });
      
      if (data.searchId) {
        setCurrentSearchId(data.searchId);
      }

      if (data.searchParams) {
        console.log('📅 Updating dates from search params:', data.searchParams);
        setStreamingSearchParams(data.searchParams);
        
        if (data.searchParams.checkin) {
          const checkinDate = new Date(data.searchParams.checkin + 'T12:00:00');
          setCheckInDate(checkinDate);
        }
        if (data.searchParams.checkout) {
          const checkoutDate = new Date(data.searchParams.checkout + 'T12:00:00');
          setCheckOutDate(checkoutDate);
        }
        if (data.searchParams.adults) {
          console.log('Setting adults:', data.searchParams.adults);
          setAdults(data.searchParams.adults);
        }
        if (data.searchParams.children) {
          console.log('Setting children:', data.searchParams.children);
          setChildren(data.searchParams.children);
        }
      }
      break;

    case 'error':
      console.error('❌ Streaming error:', data.message);
      setShowPlaceholders(false);
      setIsSearching(false);
      setIsStreamingSearch(false);
      setSearchParamsLoading(false);
      setShowErrorScreen(true);
      break;

    default:
      console.log('📝 Unknown streaming event:', data.type, data);
  }
};

const confirmedParams =
  stage1Results?.searchParams ||
  searchResults?.searchParams ||
  (streamingSearchParams?.checkin && streamingSearchParams);

const hasFinalizedDates = Boolean(
  confirmedParams?.checkin && confirmedParams?.checkout
);

const confirmedCheckInDate = hasFinalizedDates
  ? new Date(`${confirmedParams!.checkin}T12:00:00`)
  : undefined;

const confirmedCheckOutDate = hasFinalizedDates
  ? new Date(`${confirmedParams!.checkout}T12:00:00`)
  : undefined;

const convertStreamedHotelToDisplay = (streamedHotel: any, index: number): Hotel => {
  console.log('🔄 Converting streamed hotel:', streamedHotel.name);
  console.log('🟢🟢🟢 DISTANCE FROM SEARCH:', {
    hasDistance: !!streamedHotel.distanceFromSearch,
    distanceData: streamedHotel.distanceFromSearch,
    showInUI: streamedHotel.distanceFromSearch?.showInUI,
    fromLocation: streamedHotel.distanceFromSearch?.fromLocation
  });
  console.log('🔄 Converting streamed hotel:', streamedHotel.name);
  console.log(`   Hotel ID: ${streamedHotel.hotelId || streamedHotel.id || 'NO_ID'}`);
  console.log(`   Photo gallery images: ${streamedHotel.photoGalleryImages?.length || 0}`);
  
  const hotelId = streamedHotel.hotelId || streamedHotel.id || `fallback-${Date.now()}-${index}`;

  if (!streamedHotel.name) {
    console.error('❌ CRITICAL: Hotel has no name!', streamedHotel);
  }

  const getHotelImage = (hotel: any): string => {
    const defaultImage = "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80";
    
    if (hotel.firstRoomImage && typeof hotel.firstRoomImage === 'string' && hotel.firstRoomImage.trim() !== '') {
      return hotel.firstRoomImage;
    }
    
    if (hotel.secondRoomImage && typeof hotel.secondRoomImage === 'string' && hotel.secondRoomImage.trim() !== '') {
      return hotel.secondRoomImage;
    }
    
    if (hotel.photoGalleryImages && hotel.photoGalleryImages.length > 0) {
      const firstGalleryImage = hotel.photoGalleryImages[0];
      if (firstGalleryImage && typeof firstGalleryImage === 'string' && firstGalleryImage.trim() !== '') {
        return firstGalleryImage;
      }
    }
    
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

  const isAIEnhanced = streamedHotel.whyItMatches && 
                      !streamedHotel.whyItMatches.includes('Analyzing') && 
                      !streamedHotel.whyItMatches.includes('progress');

  return {
    id: streamedHotel.hotelId || streamedHotel.id,
    name: streamedHotel.name,
    image: getHotelImage(streamedHotel),
    images: streamedHotel.images || [],
    photoGalleryImages: streamedHotel.photoGalleryImages || [],
    price: Math.round(price),
    originalPrice: Math.round(originalPrice),
    priceComparison: priceComparison,
    rating: streamedHotel.starRating || 4.0,
    reviews: streamedHotel.reviewCount || Math.floor(Math.random() * 1000) + 100,
    
    safetyRating: streamedHotel.safetyRating || streamedHotel.aiSafetyRating || (8.5 + Math.random() * 1.5),
    
    transitDistance: '5 min walk to main area',
    tags: streamedHotel.topAmenities?.slice(0, 3) || ["Premium amenities"],
    location: streamedHotel.address || streamedHotel.summarizedInfo?.location || 'Prime location',
    features: streamedHotel.amenities || streamedHotel.topAmenities || ["Excellent features"],
    firstRoomImage: streamedHotel.firstRoomImage || null,
    secondRoomImage: streamedHotel.secondRoomImage || null,
    topAmenities: streamedHotel.topAmenities || [],
    
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
    
    aiMatchPercent: streamedHotel.aiMatchPercent,
    matchType: streamedHotel.aiMatchPercent >= 90 ? 'perfect' :
               streamedHotel.aiMatchPercent >= 85 ? 'excellent' : 
               streamedHotel.aiMatchPercent >= 75 ? 'great' : 'good',
    
    pricePerNight: streamedHotel.pricePerNight,
    city: streamedHotel.city || streamedHotel.summarizedInfo?.city,
    country: streamedHotel.country || streamedHotel.summarizedInfo?.country,
    latitude: streamedHotel.latitude,
    longitude: streamedHotel.longitude,

    hasAvailability: true,
    totalRooms: streamedHotel.totalRooms || 1,
    fullDescription: streamedHotel.description || streamedHotel.summarizedInfo?.description,
    fullAddress: streamedHotel.address || streamedHotel.summarizedInfo?.location,
    
    isRefundable: streamedHotel.isRefundable,
    refundableTag: streamedHotel.refundableTag,
    refundableInfo: streamedHotel.refundableInfo || streamedHotel.summarizedInfo?.refundableInfo,
    
    allHotelInfo: streamedHotel.allHotelInfo || "Detailed hotel information loading...",
    
    aiSafetyRating: streamedHotel.safetyRating || streamedHotel.aiSafetyRating,
    safetyJustification: streamedHotel.safetyJustification || "Safety assessment based on location and area knowledge",
    distanceFromSearch: streamedHotel.distanceFromSearch || null
  };
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const executeStreamingSearch = async (userInput: string) => {
  if (!userInput.trim()) return;
  if ((global as any).cleanupSSESearch) {
    (global as any).cleanupSSESearch();
  }

  let eventSource: any = null;
  let timeoutId: NodeJS.Timeout | null = null;
   searchHasStarted.current = true; 
   searchCompleted.current = false; 

  try {
    console.log('🌊 Starting SSE Real-time Streaming Search...');
    
    setStage1Results(null);
    setStage2Results(null);
    setCurrentSearchId(null);
    
    setSearchParamsLoading(true);

    setShowPlaceholders(true);
    setIsStreamingSearch(true);
    setFirstHotelFound(false);
    setStreamingProgress({ step: 0, totalSteps: 8, message: 'Starting search...' });

    const placeholderHotels = generatePlaceholderHotels(10);
    setDisplayHotels(placeholderHotels);
    const searchParams = new URLSearchParams({
      userInput: userInput,
      q: userInput
    });

    const sseUrl = `${BASE_URL}/api/hotels/search-and-match/stream?${searchParams.toString()}`;
    console.log('🔗 SSE URL:', sseUrl);

    eventSource = new (EventSource as any)(sseUrl, {
      headers: {
        'Cache-Control': 'no-cache',
      },
      polyfill: true,
      withCredentials: false,
    });

    eventSource.addEventListener('open', () => {
      console.log('✅ SSE Connection opened');
    });

    eventSource.addEventListener('message', async (event: any) => {
      try {
        const data = JSON.parse(event.data);
        const eventType = data.type || 'message';
        
        console.log('📡 SSE Message received:', eventType);
        
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
            const realHotelsCount = displayHotels.filter(h => !h.isPlaceholder).length;
  
  await AnalyticsService.trackSearchSuccess(
    searchQuery,
    realHotelsCount
  );

            searchCompleted.current = true; 
            handleStreamingUpdate({ type: 'complete', ...data }, userInput);
            
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

            await saveRecentSearch(userInput);
            break;
            
          case 'error':
             await AnalyticsService.trackSearchFailed(
    searchQuery,
    'api_error'
  );
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
            console.log('📝 Unknown SSE message type:', eventType, data);
            break;
        }

      } catch (parseError) {
        console.warn('⚠️ Failed to parse SSE data:', parseError, 'Raw data:', event.data);
      }
    });

    eventSource.addEventListener('error', (error: any) => {
  console.error('❌ SSE Connection error:', error);
  
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  
  setIsSearching(false);
  setIsStreamingSearch(false);
  setShowErrorScreen(true);
});

    timeoutId = setTimeout(() => {
       AnalyticsService.trackSearchFailed(searchQuery, 'timeout');
  
  console.warn('⏰ SSE search timeout after 30 seconds');
  
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  
  setIsSearching(false);
  setIsStreamingSearch(false);
  setShowErrorScreen(true);
}, 40000);

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
  
  setShowErrorScreen(true);
}

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

const executeSearch = async (userInput: string) => {
  if (TEST_MODE) {
  } else {
    try {
      await executeStreamingSearch(userInput);
    } catch (error: any) {
      console.warn('⚠️ Streaming failed, falling back to two-stage...', error);
    }
  }
};

useEffect(() => {
  if (displayHotels.length > 0) {
    debugHotelState();
  }
}, [displayHotels, showPlaceholders, isStreamingSearch]);

  useEffect(() => {
    if (params?.searchQuery && params.searchQuery !== searchQuery) {
      console.log('📥 Received search query from InitialSearchScreen:', params.searchQuery);
      setSearchQuery(params.searchQuery);
      executeSearch(params.searchQuery);
    }
  }, [params?.searchQuery]);

  useEffect(() => {
  return () => {
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

  const handleAiSearch = useCallback(() => {
    console.log('AI search button pressed');
    setShowAiOverlay(true);
  }, []);

  const handleCloseAiOverlay = useCallback(() => {
    setShowAiOverlay(false);
  }, []);

  const handleSearchUpdate = useCallback((newSearch: string, originalSearch?: string) => {
  setSearchQuery(newSearch);
  if (newSearch.trim()) {
    executeSearch(newSearch);
    
    // Use addRecentSearch with replaceQuery parameter
    if (originalSearch && originalSearch !== newSearch) {
      addRecentSearch(newSearch, originalSearch);
    }
  }
}, [addRecentSearch]);

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

const handleViewDetails = useCallback((hotel: Hotel) => {
  console.log('View details pressed for:', hotel.name);
}, [handleBookNow]);

const handleHotelPress = useCallback((hotel: Hotel) => {
  console.log('Hotel selected:', hotel.name);
}, [handleViewDetails]);

const handleBackPress = useCallback(() => {
  console.log('Back button pressed - starting transition animation');
  
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
  
  Animated.parallel([
    Animated.timing(screenSlideOut, {
      toValue: width,
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

{/* MorphingSearchChat - Replaces old header */}
<MorphingSearchChat
  currentSearch={searchQuery}
  onSearchRefined={handleSearchUpdate}
  onBackPress={handleBackPress}
  hotelContext={displayHotels.slice(0, 10).map(hotel => ({
    id: hotel.id,
    name: hotel.name,
    city: hotel.city,
    country: hotel.country,
    price: hotel.price,
    rating: hotel.rating,
    aiMatchPercent: hotel.aiMatchPercent,
    topAmenities: hotel.topAmenities,
    distanceFromSearch: hotel.distanceFromSearch ? {
      formatted: hotel.distanceFromSearch.formatted,
      fromLocation: hotel.distanceFromSearch.fromLocation,
    } : undefined,
  }))}
  searchParams={{
    location: streamingSearchParams?.cityName || stage1Results?.searchParams?.cityName,
    checkin: streamingSearchParams?.checkin || stage1Results?.searchParams?.checkin,
    checkout: streamingSearchParams?.checkout || stage1Results?.searchParams?.checkout,
    adults: streamingSearchParams?.adults || stage1Results?.searchParams?.adults || adults,
    children: streamingSearchParams?.children || stage1Results?.searchParams?.children || children,
  }}
/>

{/* Map/List Toggle Button - Floating above content */}
{displayHotels.length > 0 && !showPlaceholders && !showErrorScreen && (
  <TouchableOpacity
    style={[
      tw`absolute bottom-19 right-4 z-50 w-16 h-16 rounded-full items-center justify-center`,
      {
        backgroundColor: isStreamingSearch ? 'rgba(156, 163, 175, 0.9)' : 'rgba(0, 212, 230, 0.9)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        opacity: isStreamingSearch ? 0.6 : 1,
      },
    ]}
    onPress={() => {
      if (!isStreamingSearch) {
        setShowMapView(!showMapView);
      }
    }}
    activeOpacity={isStreamingSearch ? 1 : 0.8}
    disabled={isStreamingSearch}
  >
    {isStreamingSearch ? (
      <View style={tw`items-center justify-center`}>
        <Ionicons
          name="hourglass-outline"
          size={26}
          color="white"
        />
      </View>
    ) : (
      <Ionicons
        name={showMapView ? "list" : "map"}
        size={24}
        color="white"
      />
    )}
  </TouchableOpacity>
)}

{/* CONTENT VIEW - Story View OR Map View */}
<View style={[tw`flex-1 bg-gray-50`, { paddingTop: 80 }]}>
  {showErrorScreen ? (
    <SearchErrorScreen
      onTryAgain={() => {
        setShowErrorScreen(false);
        if (searchQuery.trim()) {
          executeSearch(searchQuery);
        }
      }}
      onBackToSearch={() => {
        setShowErrorScreen(false);
        handleBackPress();
      }}
    />
  ) : showMapView ? (
    <MapViewScreen
      hotels={displayHotels.filter(h => h.latitude && h.longitude && !h.isPlaceholder)}
      onClose={() => setShowMapView(false)}
      onHotelSelect={(hotel) => {
        console.log('🎯 Selected hotel from map:', hotel.name, hotel.id);
        setShowMapView(false);
        setScrollToHotelId(hotel.id);
      }}
    />
  ) : (
    <SwipeableStoryView
      key={scrollToHotelId || 'default'}
      hotels={displayHotels}
      onHotelPress={handleHotelPress}
      onViewDetails={handleViewDetails}
      searchQuery={searchQuery}
      onScrollToPosition={(pos) => {
        AnalyticsService.trackScrollDepth(pos, displayHotels.length);
      }}
      checkInDate={hasFinalizedDates && confirmedCheckInDate ? confirmedCheckInDate : checkInDate}
      checkOutDate={hasFinalizedDates && confirmedCheckOutDate ? confirmedCheckOutDate : checkOutDate} 
      adults={adults}
      children={children}
      showPlaceholders={showPlaceholders && displayHotels.length > 0 && displayHotels.every(h => h.isPlaceholder)}
      isInsightsLoading={isInsightsLoading}
      stage1Complete={!!stage1Results}
      stage2Complete={!!stage2Results}
      searchMode={TEST_MODE ? 'test' : stage1Results ? 'two-stage' : 'legacy'}
      searchParams={streamingSearchParams || searchResults?.searchParams}
      onFavoriteSuccess={handleFavoriteSuccess}
    />
  )}
</View>

      <Modal
  visible={showAiOverlay}
  transparent
  animationType="fade"
  statusBarTranslucent
  presentationStyle="overFullScreen"
  onRequestClose={handleCloseAiOverlay}
>
  <TouchableWithoutFeedback onPress={handleCloseAiOverlay}>
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.1)' }]} />
  </TouchableWithoutFeedback>

  <View style={[StyleSheet.absoluteFillObject, tw`items-center justify-center`]}>
    <AISearchOverlay
      visible
      onClose={handleCloseAiOverlay}
      onSearchUpdate={handleSearchUpdate}
      currentSearch={searchQuery}
      searchContext={{
        location: (stage1Results?.searchParams || searchResults?.searchParams)?.cityName,
        dates: {
          checkin: checkInDate.toISOString().split('T')[0],
          checkout: checkOutDate.toISOString().split('T')[0],
        },
        guests: { adults, children },
        budget: {
          min: (stage1Results?.searchParams || searchResults?.searchParams)?.minCost,
          max: (stage1Results?.searchParams || searchResults?.searchParams)?.maxCost,
          currency: (stage1Results?.searchParams || searchResults?.searchParams)?.currency,
        },
        resultCount: displayHotels.length || stage1Results?.matchedHotelsCount || searchResults?.aiRecommendationsCount || 0
      }}
    />
  </View>
</Modal>

  <FavoritesPopup
  visible={showFavoritesPopup}
  hotelName={favoritedHotelName}
  onPress={handleNavigateToFavorites}
  onHide={() => setShowFavoritesPopup(false)}
/>

<FeedbackSystem
    visible={showFeedbackPopup}
    onClose={() => setShowFeedbackPopup(false)}
    onFeedbackSubmitted={handleFeedbackSubmitted}
  />

      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerShadowWrapper: {
    borderRadius: 12,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    ...Platform.select({
      android: {
        elevation: 8,
        backgroundColor: '#fff',
      },
    }),
  },
  headerContainer: {
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
});

export default HomeScreen;