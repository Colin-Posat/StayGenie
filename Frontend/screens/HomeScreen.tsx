// HomeScreen.tsx - Updated with Two-Stage API functionality
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

import { RecentSearch } from '../contexts/AuthContext';

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
  photoGalleryImages?: string[]; // ADD: Photo gallery from stage 1
  categoryRatings?: {  // ✅ ADD THIS
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
    photoGalleryImages?: string[]; // ADD: Also in summarized info
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
  photoGalleryImages: string[]; // ADD: Photo gallery array
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
  photoGalleryImages?: string[]; // ADD: Photo gallery for hotels
  
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
}
//const BASE_URL = __DEV__ ? 'http://localhost:3003' : "https://staygenie-wwpa.onrender.com";
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
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [searchParamsLoading, setSearchParamsLoading] = useState(false);

  // Add error handling state
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
    // Navigate to the Favorites tab
    navigation.navigate('Favorites');
  }, [navigation]);

// One driver for the whole edit mode animation: 0 = closed, 1 = open
const editAnim = useRef(new Animated.Value(0)).current;

const overlayOpacity = editAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [0, 1],
});

const cardTranslateY = editAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [-8, 0], // small slide down
});

const cardOpacity = editAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [0, 1],
});

const normalHeaderScale = editAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [1, 0.98], // subtle scale when edit is open
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

  // Match date ranges like "Nov 28, 2025 - Dec 3, 2025"
  const dateRegex = /\b([A-Z][a-z]{2}\s\d{1,2},\s\d{4})\s*-\s*([A-Z][a-z]{2}\s\d{1,2},\s\d{4})\b/;

  let cleaned = prev.replace(dateRegex, '').trim();

  // Cleanup leftover bullets or spacing
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

// Add these helper functions before the return statement:
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


// Simple edit handlers without animations
const handleEditSearchPress = () => {
  setEditedSearchQuery(searchQuery);
  setIsEditingSearch(true);

  // start with rAF for immediate responsiveness
  requestAnimationFrame(() => {
    Animated.spring(editAnim, {
      toValue: 1,
      // tuned for crisp, quick snap
      stiffness: 520,
      damping: 36,
      mass: 0.9,
      useNativeDriver: true,
    }).start(() => {
      // focus ASAP after the first frame
      requestAnimationFrame(() => editSearchInputRef.current?.focus());
    });
  });
};
const handleCancelEdit = () => {
  Keyboard.dismiss();
  Animated.timing(editAnim, {
    toValue: 0,
    duration: 150,            // faster close
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  }).start(() => {
    setEditedSearchQuery(searchQuery);
    setIsEditingSearch(false);
  });
};



const handleSaveSearch = async () => {
  if (editedSearchQuery.trim() && editedSearchQuery.trim() !== searchQuery) {
    const newQuery = editedSearchQuery.trim();
    
    // ✅ Cancel any ongoing search before starting new one
    if ((global as any).cleanupSSESearch) {
      (global as any).cleanupSSESearch();
    }
    
    // Clear previous results AND date state
    setDisplayHotels([]);
    setStage1Results(null);
    setStage2Results(null);
    setShowPlaceholders(false);
    setFirstHotelFound(false);
    
    // 🆕 CLEAR OLD DATE STATE - this is the key fix
    setStreamingSearchParams(null);
    
    // 🆕 SET LOADING STATE FOR SEARCH PARAMS
    setSearchParamsLoading(true);
    
    setSearchQuery(newQuery);
    await executeSearch(newQuery);
    await saveRecentSearch(newQuery);
  }
  handleCancelEdit();
};


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
  
  // UPDATE DATES IMMEDIATELY WHEN RECEIVED
  if (data.searchParams) {
    console.log('📅 Received parsed dates early:', data.searchParams);
    
    // 🆕 CLEAR LOADING STATE WHEN REAL DATA ARRIVES
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
        console.log(`✨ Received AI-enhanced hotel: ${data.hotel.name}`);
        console.log('🏨 Enhanced topAmenities:', data.hotel.topAmenities);
        console.log('📸 Photo gallery images:', data.hotel.photoGalleryImages?.length || 0); // ADD: Log photo gallery
        console.log('📊 Category ratings:', data.hotel.categoryRatings); 
        
        const enhancedHotel = convertStreamedHotelToDisplay(data.hotel, data.hotelIndex - 1);
        
        setDisplayHotels(prevHotels => {
          const updatedHotels = [...prevHotels];
          const existingIndex = updatedHotels.findIndex(h => h.id === data.hotelId);
          
          if (existingIndex >= 0) {
            console.log(`🔄 Updating hotel at index ${existingIndex}: ${data.hotel.name}`);

            updatedHotels[existingIndex] = {
              ...updatedHotels[existingIndex],
              ...enhancedHotel,
              // Ensure these fields are properly updated
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
              photoGalleryImages: enhancedHotel.photoGalleryImages || [], // ADD: Update photo gallery
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
  (streamingSearchParams?.checkin && streamingSearchParams); // set on SSE 'complete'

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
  console.log(`   Hotel ID: ${streamedHotel.hotelId || streamedHotel.id || 'NO_ID'}`);
  console.log(`   Photo gallery images: ${streamedHotel.photoGalleryImages?.length || 0}`); // ADD: Log photo gallery
  
  const hotelId = streamedHotel.hotelId || streamedHotel.id || `fallback-${Date.now()}-${index}`;

  if (!streamedHotel.name) {
    console.error('❌ CRITICAL: Hotel has no name!', streamedHotel);
  }

  const getHotelImage = (hotel: any): string => {
    const defaultImage = "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80";
    
    // PRIORITY 1: Use firstRoomImage if available
    if (hotel.firstRoomImage && typeof hotel.firstRoomImage === 'string' && hotel.firstRoomImage.trim() !== '') {
      return hotel.firstRoomImage;
    }
    
    // PRIORITY 2: Use secondRoomImage if firstRoomImage is not available
    if (hotel.secondRoomImage && typeof hotel.secondRoomImage === 'string' && hotel.secondRoomImage.trim() !== '') {
      return hotel.secondRoomImage;
    }
    
    // PRIORITY 3: Use first image from photo gallery
    if (hotel.photoGalleryImages && hotel.photoGalleryImages.length > 0) {
      const firstGalleryImage = hotel.photoGalleryImages[0];
      if (firstGalleryImage && typeof firstGalleryImage === 'string' && firstGalleryImage.trim() !== '') {
        return firstGalleryImage;
      }
    }
    
    // FALLBACK: Use existing images array
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
    photoGalleryImages: streamedHotel.photoGalleryImages || [], // ADD: Include photo gallery
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

    hasAvailability: true,
    totalRooms: streamedHotel.totalRooms || 1,
    fullDescription: streamedHotel.description || streamedHotel.summarizedInfo?.description,
    fullAddress: streamedHotel.address || streamedHotel.summarizedInfo?.location,
    
    // Refundable policy
    isRefundable: streamedHotel.isRefundable,
    refundableTag: streamedHotel.refundableTag,
    refundableInfo: streamedHotel.refundableInfo || streamedHotel.summarizedInfo?.refundableInfo,
    
    // All hotel info
    allHotelInfo: streamedHotel.allHotelInfo || "Detailed hotel information loading...",
    
    // AI Safety fields
    aiSafetyRating: streamedHotel.safetyRating || streamedHotel.aiSafetyRating,
    safetyJustification: streamedHotel.safetyJustification || "Safety assessment based on location and area knowledge"
  };
};



// FINAL FIX: Remove all custom event listeners - everything goes through 'message'
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const executeStreamingSearch = async (userInput: string) => {
  if (!userInput.trim()) return;

  let eventSource: any = null;
  let timeoutId: NodeJS.Timeout | null = null;
   searchHasStarted.current = true; 
   searchCompleted.current = false; 

  try {
    console.log('🌊 Starting SSE Real-time Streaming Search...');
    
    // Clear state first
    setStage1Results(null);
    setStage2Results(null);
    setCurrentSearchId(null);
    
    setSearchParamsLoading(true);

    // Set loading state
    setShowPlaceholders(true);
    setIsStreamingSearch(true);
    setFirstHotelFound(false);
    setStreamingProgress({ step: 0, totalSteps: 8, message: 'Starting search...' });

    // Set placeholders and KEEP them
    const placeholderHotels = generatePlaceholderHotels(10);
    setDisplayHotels(placeholderHotels);
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
    eventSource.addEventListener('message', async (event: any) => {
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
            const realHotelsCount = displayHotels.filter(h => !h.isPlaceholder).length;
  
  // ✅ ADD THIS
  await AnalyticsService.trackSearchSuccess(
    searchQuery,
    realHotelsCount
  );

            searchCompleted.current = true; 
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
  setShowErrorScreen(true);
});

    // Set timeout for safety (30 seconds)
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
  

  



  // NEW: Two-stage optimized search
  

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
  } else {
    // Always try streaming for immediate results
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


  // Handle search query from InitialSearchScreen
  useEffect(() => {
    if (params?.searchQuery && params.searchQuery !== searchQuery) {
      console.log('📥 Received search query from InitialSearchScreen:', params.searchQuery);
      setSearchQuery(params.searchQuery);
      executeSearch(params.searchQuery);
    }
  }, [params?.searchQuery]);

 useEffect(() => {
  const subscription = AppState.addEventListener('change', (state) => {
    
    // -----------------------------------------
    // 1. APP GOES TO BACKGROUND
    // -----------------------------------------
if (state === 'background' || state === 'inactive') {
  console.log("📱 App moved to background");

  // Only restart if user left *mid-search*
  if (searchHasStarted.current && !searchCompleted.current) {
    console.log("⏸️ Search interrupted — will restart on resume");
    searchWasActive.current = true;
  } else {
    console.log("⏹️ Search had finished — no restart needed");
    searchWasActive.current = false;
  }

  if ((global as any).cleanupSSESearch) {
    (global as any).cleanupSSESearch();
  }

  return;
}


    // -----------------------------------------
    // 2. APP RETURNS TO FOREGROUND
    // -----------------------------------------
if (state === 'active') {
  console.log("📱 App returned to foreground");

  if (searchWasActive.current) {
    console.log("🔄 Restarting interrupted search...");
    searchWasActive.current = false;
    searchHasStarted.current = false;
    executeSearch(searchQuery);
  }
}
  });

  return () => subscription.remove();
}, [isStreamingSearch, searchQuery]);

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
  const replaceRecentSearch = useCallback(async (originalSearch: string, newSearch: string) => {
  try {
    await addRecentSearch(newSearch, originalSearch); // Pass both parameters
    console.log(`Replaced "${originalSearch}" with "${newSearch}" in recent searches`);
  } catch (error) {
    console.error('Failed to replace recent search:', error);
  }
}, [addRecentSearch]);


  const handleSearchUpdate = useCallback((newSearch: string, originalSearch?: string) => {
  setSearchQuery(newSearch);
  if (newSearch.trim()) {
    executeSearch(newSearch);
    
    // Replace the original search with the refined one in recent searches
    if (originalSearch && originalSearch !== newSearch) {
      replaceRecentSearch(originalSearch, newSearch);
    }
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
  
  // NEW: Add safety information section
  detailsMessage += `🛡️ Safety Assessment:\n`;
  if (hotel.aiSafetyRating) {
    detailsMessage += `• AI Safety Rating: ${hotel.aiSafetyRating}/10\n`;
    if (hotel.safetyJustification) {
      detailsMessage += `• Assessment: ${hotel.safetyJustification}\n`;
    }
    detailsMessage += `• ✨ AI-enhanced safety analysis\n`;
  } else {
    detailsMessage += `• General Safety: ${hotel.safetyRating.toFixed(1)}/10\n`;
    detailsMessage += `• Standard area assessment\n`;
  }
  detailsMessage += `\n`;
  
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

{/* UPDATED HEADER - Matches Hotel Card Style */}
<View style={tw`px-4 pt-2 pb-3 bg-gray-50`}>
  {searchQuery.trim().length > 0 ? (
    <Animated.View
      style={[
        {
          borderRadius: 16,
          backgroundColor: '#fff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 3,
          transform: [{ scale: normalHeaderScale }]
        }
      ]}
    >
      <View style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#fff',
        overflow: 'hidden',
      }}>
        {!isEditingSearch ? (
          // NORMAL MODE
          <TouchableOpacity
            style={tw`px-4 py-3`}
            onPress={handleEditSearchPress}
            activeOpacity={0.8}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center flex-1 min-w-0`}>
                <TouchableOpacity
                  style={[
                    tw`w-8 h-8 items-center justify-center rounded-xl mr-3 flex-shrink-0`,
                    { backgroundColor: '#F9FAFB' }
                  ]}
                  onPress={handleBackPress}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="arrow-back" size={16} color="#374151" />
                </TouchableOpacity>
                
                <View style={tw`flex-1 min-w-0`}>
                  <Text 
                    style={{
                      fontFamily: 'Merriweather-Regular',
                      fontSize: 14,
                      lineHeight: 18,
                      color: '#111827',
                      marginBottom: 4,
                    }}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {searchQuery}
                  </Text>
                  
<View style={tw`flex-row items-center flex-wrap`}>
  <View style={tw`flex-row items-center`}>
    <Ionicons name="calendar-outline" size={11} color="#6B7280" />
    <Text style={{
      fontFamily: 'Merriweather-Regular',
      fontSize: 11,
      color: searchParamsLoading ? '#9CA3AF' : '#6B7280',
      marginLeft: 4,
      fontStyle: searchParamsLoading ? 'italic' : 'normal'
    }}>
      {searchParamsLoading 
        ? 'Loading dates...'
        : (hasFinalizedDates && confirmedCheckInDate && confirmedCheckOutDate
            ? formatDateRange(confirmedCheckInDate, confirmedCheckOutDate)
            : formatDateRange(checkInDate, checkOutDate)
          )
      }
    </Text>
  </View>
  
  <View style={[tw`rounded-full mx-2`, { width: 3, height: 3, backgroundColor: '#D1D5DB' }]} />
  
  <View style={tw`flex-row items-center`}>
    <Ionicons name="people-outline" size={11} color="#6B7280" />
    <Text style={{
      fontFamily: 'Merriweather-Regular',
      fontSize: 11,
      color: searchParamsLoading ? '#9CA3AF' : '#6B7280',
      marginLeft: 4,
      fontStyle: searchParamsLoading ? 'italic' : 'normal'
    }}>
      {searchParamsLoading 
        ? 'Loading...'
        : formatGuestInfo(adults, children)
      }
    </Text>
  </View>
  

</View>
                </View>
              </View>

              <View style={[
                tw`w-8 h-8 rounded-xl items-center justify-center flex-shrink-0`,
                { backgroundColor: 'rgba(29, 249, 255, 0.1)', marginLeft: 12 }
              ]}>
                <Ionicons name="pencil" size={14} color="#00D4E6" />
              </View>
            </View>
          </TouchableOpacity>
          
        ) : (
          // EDIT MODE
          <View style={tw`p-4`}>
            <View style={tw`mb-3`}>
              <View style={[
                tw`rounded-xl border`,
                { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }
              ]}>
                <TextInput
                  ref={editSearchInputRef}
                  style={[
                    {
                      fontFamily: 'Merriweather-Regular',
                      fontSize: 14,
                      lineHeight: 20,
                      color: '#111827',
                      padding: 14,
                      minHeight: 90,
                      maxHeight: 130,
                      textAlignVertical: 'top',
                    }
                  ]}
                  value={editedSearchQuery}
                  onChangeText={setEditedSearchQuery}
                  placeholder="Describe your perfect stay..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  maxLength={1600}
                  selectionColor="#1DF9FF"
                  autoFocus={false}
                />
              </View>
            </View>

            <View style={tw`-mx-1 mb-3`}>
              <SearchGuidePills
  onDateSelect={(dateText) => {
    setEditedSearchQuery(prev => replaceDateInSearch(prev, dateText));
  }}
                onBudgetSelect={(budgetText) => {
                  setEditedSearchQuery(prev => 
                    prev.trim() ? `${prev.trim()} • ${budgetText}` : budgetText
                  );
                }}
                onGuestsSelect={(guestsText) => {
                  setEditedSearchQuery(prev => 
                    prev.trim() ? `${prev.trim()} • ${guestsText}` : guestsText
                  );
                }}
                onAmenitiesSelect={(amenitiesText) => {
                  setEditedSearchQuery(prev => 
                    prev.trim() ? `${prev.trim()} • ${amenitiesText}` : amenitiesText
                  );
                }}
                onStyleSelect={(styleText) => {
                  setEditedSearchQuery(prev => 
                    prev.trim() ? `${prev.trim()} • ${styleText}` : styleText
                  );
                }}
              />
            </View>

            <View style={tw`flex-row justify-end items-center gap-2`}>
  <TouchableOpacity
    style={[
      tw`px-4 py-2.5 rounded-xl border border-gray-200`,
      { 
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
      }
    ]}
    onPress={handleCancelEdit}
    activeOpacity={0.8}
  >
    <Text style={{
      fontFamily: 'Merriweather-Regular',
      fontSize: 14,
      color: '#374151',
    }}>
      Cancel
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[
      tw`px-5 py-2.5 rounded-xl`,
      editedSearchQuery.trim() && editedSearchQuery.trim() !== searchQuery
        ? { 
            backgroundColor: '#00d4e6',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 3,
          }
        : { 
            backgroundColor: '#E5E7EB',
            borderWidth: 1,
            borderColor: '#D1D5DB'
          }
    ]}
    onPress={handleSaveSearch}
    activeOpacity={0.8}
    disabled={!editedSearchQuery.trim() || editedSearchQuery.trim() === searchQuery}
  >
    <Text style={{
      fontFamily: 'Merriweather-Bold',
      fontSize: 14,
      color: editedSearchQuery.trim() && editedSearchQuery.trim() !== searchQuery
        ? '#ffffff'
        : '#9CA3AF',
    }}>
      Search
    </Text>
  </TouchableOpacity>
</View>

          </View>
        )}
      </View>
    </Animated.View>
  ) : (
    <View style={tw`flex-row items-center`}>
      <TouchableOpacity
        style={[
          tw`w-8 h-8 items-center justify-center rounded-xl flex-shrink-0`,
          { 
            backgroundColor: '#fff',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 3,
          }
        ]}
        onPress={handleBackPress}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={16} color="#374151" />
      </TouchableOpacity>
    </View>
  )}
</View>


      {/* CONTENT VIEW - Story View */}
<View style={tw`flex-1 bg-gray-50`}>
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
        handleBackPress(); // This takes them back to InitialSearchScreen
      }}
    />
  ) : (
    <SwipeableStoryView
      hotels={displayHotels}
      onHotelPress={handleHotelPress}
      onViewDetails={handleViewDetails}
      searchQuery={searchQuery}
      onScrollToPosition={(pos) => {
    // ✅ ADD THIS
    AnalyticsService.trackScrollDepth(pos, displayHotels.length);
  }}
      checkInDate={confirmedCheckInDate}
      checkOutDate={confirmedCheckOutDate}
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
  onRequestClose={handleCloseAiOverlay}  // Android back button
>
  {/* Backdrop to close on outside press */}
  <TouchableWithoutFeedback onPress={handleCloseAiOverlay}>
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.1)' }]} />
  </TouchableWithoutFeedback>

  {/* Centered panel (or bottom sheet—your call) */}
  <View style={[StyleSheet.absoluteFillObject, tw`items-center justify-center`]}>
    {/* If AISearchOverlay already draws its own panel/backdrop,
        give it a prop to render just the inner content */}
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