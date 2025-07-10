// HomeScreen.tsx - Updated to handle optimized search with staged responses and sentiment polling
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
  insightsPending: boolean;        // NEW: Indicates if insights are still loading
  searchId: string;                // NEW: For polling sentiment data
  performance: {                   // NEW: Performance metrics
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
  
  // Enhanced pricing structure
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
  guestInsights: string;      // May initially be "Loading insights..." 
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  topAmenities: string[];
}

// NEW: Sentiment polling response interface
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
  
  // Enhanced pricing fields
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

  // NEW: Sentiment polling function
  const startSentimentPolling = useCallback(async (searchId: string) => {
    console.log('🎭 Starting sentiment polling for searchId:', searchId);
    setIsInsightsLoading(true);
    
    const pollSentiment = async () => {
      try {
        console.log('🔄 Polling sentiment data...');
        const sentimentData: SentimentResponse = await makeRequest(`/api/hotels/sentiment/${searchId}`);
        
        if (!sentimentData.insightsPending) {
          console.log('✅ Sentiment insights ready!');
          
          // Update hotel insights
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
          
          // Stop polling
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
        // Continue polling on error
      }
    };

    // Poll every 2 seconds
    sentimentPollingRef.current = setInterval(pollSentiment, 2000);
    
    // Stop polling after 30 seconds max
    pollingTimeoutRef.current = setTimeout(() => {
      if (sentimentPollingRef.current) {
        clearInterval(sentimentPollingRef.current);
        sentimentPollingRef.current = null;
      }
      setIsInsightsLoading(false);
      console.log('⏰ Sentiment polling timeout - stopping');
    }, 30000);

    // Initial poll
    pollSentiment();
  }, []);

  // Enhanced convert recommendation to display format
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

    // Enhanced pricing calculation
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
      
      // Enhanced pricing data
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

  // UPDATED: Main search execution using optimized endpoint
  const executeOptimizedSearch = async (userInput: string) => {
    if (!userInput.trim()) return;

    try {
      console.log('\n' + '='.repeat(80));
      console.log('🚀 Starting Optimized Hotel Search...');
      console.log('📝 User Input:', userInput);
      
      setIsSearching(true);

      // Call the new optimized search endpoint
      const searchResponse: OptimizedSearchResponse = await makeRequest('/api/hotels/search', {
        userInput: userInput
      });

      console.log('✅ Optimized Search Complete!');
      console.log('📊 Performance:', searchResponse.performance);
      console.log('🎭 Insights Pending:', searchResponse.insightsPending);
      console.log('🔍 Search ID:', searchResponse.searchId);

      setSearchResults(searchResponse);
      setCurrentSearchId(searchResponse.searchId);

      // Convert recommendations to display format
      const convertedHotels: Hotel[] = searchResponse.recommendations.map((rec, index) => 
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

  // Handle search query from InitialSearchScreen
  useEffect(() => {
    if (params?.searchQuery && params.searchQuery !== searchQuery) {
      console.log('📥 Received search query from InitialSearchScreen:', params.searchQuery);
      setSearchQuery(params.searchQuery);
      executeOptimizedSearch(params.searchQuery);
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
      executeOptimizedSearch(newSearch);
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
    
    // Location
    if (hotel.city && hotel.country) {
      bookingMessage += `📍 Location: ${hotel.city}, ${hotel.country}\n`;
    }
    
    // Enhanced pricing display
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
      
      // Calculate total cost
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
        { text: 'Proceed to Book', style: 'default' }
      ]
    );
  }, [searchResults]);

  // Enhanced handleViewDetails
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
    
    // Guest insights with loading state
    if (isInsightsLoading && hotel.guestInsights?.includes('Loading')) {
      detailsMessage += `💬 Guest Insights:\n🔄 Loading detailed insights...\n\n`;
    } else if (hotel.guestInsights) {
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
    
    // Enhanced pricing section
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
        { text: 'Book Now', style: 'default', onPress: () => handleBookNow(hotel) }
      ]
    );
  }, [handleBookNow, isInsightsLoading]);

  // Enhanced handleHotelPress
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
    
    // Guest insights with loading state
    if (isInsightsLoading && hotel.guestInsights?.includes('Loading')) {
      alertMessage += `💬 Guest Insights: 🔄 Loading...\n\n`;
    } else if (hotel.guestInsights) {
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
    
    // Enhanced pricing display
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
    // Cleanup polling when going back
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
                  ? `AI Results for "${searchQuery}" (${searchResults.aiRecommendationsCount} hotels)`
                  : `Results for "${searchQuery}"`
                }
              </Text>
              
              {/* Performance indicator */}
              {searchResults?.performance && (
                <View style={tw`flex-row items-center ml-2`}>
                  <Ionicons 
                    name={searchResults.performance.optimized ? "flash" : "time"} 
                    size={12} 
                    color={searchResults.performance.optimized ? "#10B981" : "#F59E0B"} 
                  />
                  <Text style={tw`text-xs ml-1 ${
                    searchResults.performance.optimized ? 'text-green-600' : 'text-amber-600'
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
                
                {/* Insights loading indicator */}
                {isInsightsLoading && (
                  <View style={tw`flex-row items-center ml-2`}>
                    <Ionicons name="sync" size={12} color="#6B7280" />
                    <Text style={tw`text-xs text-gray-500 ml-1`}>
                      Loading insights...
                    </Text>
                  </View>
                )}
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
      />
    </SafeAreaView>
  );
};

export default HomeScreen;