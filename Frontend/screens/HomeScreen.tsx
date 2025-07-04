// HomeScreen.tsx - Updated with test mode and unified swipeable story card view
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import SwipeableStoryView from '../components/StoryView/SwipeableStoryView';
import DateSelector from '../components/HomeScreenTop/DateSelector';
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

// Updated interfaces to match new API
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
}

interface HotelRecommendation {
  hotelId: string;
  name: string;
  aiMatchPercent: number;
  whyItMatches: string;
  starRating: number;
  images: string[];
  pricePerNight?: {
    min: number;
    max: number;
    currency: string;
    display: string;
  };
  funFacts: string[];
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
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
}

// Display hotel interface (keeping for compatibility)
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
  pricePerNight?: any;
  roomTypes?: any[];
}

// Test mode configuration
const TEST_MODE = false; // Set to true to enable test mode, false for normal operation

// Mock hotels data for test mode
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
    funFacts: ["Home to endangered Hawaiian monk seals", "Features a rooftop infinity pool", "Offers traditional Hawaiian luau experiences"],
    aiMatchPercent: 95
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
    funFacts: ["Located in world's busiest pedestrian crossing", "Offers authentic Japanese breakfast", "Features traditional Japanese garden"],
    aiMatchPercent: 88
  },
  {
    id: 3,
    name: "Parisian Boutique Retreat",
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
    price: 295,
    originalPrice: 275,
    priceComparison: "7% above average",
    rating: 4.8,
    reviews: 2156,
    safetyRating: 9.5,
    transitDistance: "5 min walk to Metro",
    tags: ["Historic", "Art gallery", "Wine cellar"],
    location: "Marais District, Paris",
    features: ["Historic architecture", "Art collection", "Wine tasting"],
    aiExcerpt: "Charming boutique hotel in historic Parisian neighborhood.",
    whyItMatches: "Perfect blend of history and modern luxury in artistic district",
    funFacts: ["Building dates back to 1640", "Houses works by local artists", "Secret underground wine cellar"],
    aiMatchPercent: 92
  }
];

// Base URL
const BASE_URL = 'http://localhost:3003';

// Custom hook for typing placeholder
const useTypingPlaceholder = (
  words: string[],
  typingSpeed = 100,
  deletingSpeed = 50,
  delayAfterWord = 2000
) => {
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  const currentIndex = useRef(0);
  const currentWord = words[wordIndex];

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isDeleting) {
        setDisplayText(currentWord.substring(0, currentIndex.current - 1));
        currentIndex.current -= 1;
        if (currentIndex.current <= 0) {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length);
        }
      } else {
        setDisplayText(currentWord.substring(0, currentIndex.current + 1));
        currentIndex.current += 1;
        if (currentIndex.current >= currentWord.length) {
          setTimeout(() => {
            setIsDeleting(true);
          }, delayAfterWord);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(timer);
  }, [currentWord, isDeleting, typingSpeed, deletingSpeed, delayAfterWord, words]);

  return { displayText, cursorVisible };
};

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
  const [isFocused, setIsFocused] = useState(false);
  const [showAiOverlay, setShowAiOverlay] = useState(false);

  // Auto-typing setup
  const hotelSearchSuggestions = [
    "Luxury spa hotels in Paris",
    "Beach resorts with pools in Maldives",
    "Boutique hotels near museums in Rome",
    "Mountain lodges with views in Swiss Alps",
    "Business hotels with WiFi in Tokyo",
    "Family resorts with kids clubs in Orlando",
    "Historic hotels with character in Prague",
    "Eco-friendly lodges in Costa Rica",
    "Rooftop bars and city views in NYC",
    "Wellness retreats with yoga in Bali"
  ];

  const { displayText, cursorVisible } = useTypingPlaceholder(
    hotelSearchSuggestions,
    120,
    60,
    2500
  );

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
          adults: 2,
          children: 0,
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
  }, [TEST_MODE, displayHotels.length, checkInDate, checkOutDate]);

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

  // Convert recommendation to display format
  const convertRecommendationToDisplayHotel = (recommendation: HotelRecommendation, index: number): Hotel => {
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
      
      if ((recommendation as any).main_photo) {
        const mainPhoto = (recommendation as any).main_photo;
        if (mainPhoto && typeof mainPhoto === 'string' && mainPhoto.trim() !== '') {
          return mainPhoto;
        }
      }
      
      if ((recommendation as any).thumbnail) {
        const thumbnail = (recommendation as any).thumbnail;
        if (thumbnail && typeof thumbnail === 'string' && thumbnail.trim() !== '') {
          return thumbnail;
        }
      }
      
      return defaultImage;
    };

    let price = 200;
    let originalPrice = price * 1.15;
    let priceComparison = "Standard rate";

    if (recommendation.pricePerNight) {
      price = recommendation.pricePerNight.min;
      originalPrice = Math.round(price * 1.15);
      priceComparison = recommendation.pricePerNight.display;
    }

    return {
      id: index + 1,
      name: recommendation.name,
      image: getHotelImage(recommendation),
      price: Math.round(price),
      originalPrice: Math.round(originalPrice),
      priceComparison: priceComparison,
      rating: recommendation.starRating || 4.0,
      reviews: Math.floor(Math.random() * 1000) + 100,
      safetyRating: 8.5 + Math.random() * 1.5,
      transitDistance: "Check location details",
      tags: recommendation.amenities?.slice(0, 3) || ["Standard amenities"],
      location: recommendation.address,
      features: recommendation.amenities || ["Standard features"],
      aiExcerpt: recommendation.whyItMatches,
      whyItMatches: recommendation.whyItMatches,
      funFacts: recommendation.funFacts,
      aiMatchPercent: recommendation.aiMatchPercent,
      pricePerNight: recommendation.pricePerNight,
      roomTypes: recommendation.roomTypes
    };
  };

  // Convert regular hotel to display format (fallback)
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

    return {
      id: index + 1,
      name: hotel.hotelInfo?.name || 'Unknown Hotel',
      image: getHotelImage(hotel.hotelInfo),
      price: Math.round(price),
      originalPrice: Math.round(price * 1.15),
      priceComparison: "Standard rate",
      rating: hotel.hotelInfo?.rating || hotel.hotelInfo?.starRating || hotel.hotelInfo?.rating || 6.0,
      reviews: Math.floor(Math.random() * 1000) + 100,
      safetyRating: 8.5 + Math.random() * 1.5,
      transitDistance: "Check location details",
      tags: hotel.hotelInfo?.amenities?.slice(0, 3) || ["Standard amenities"],
      location: hotel.hotelInfo?.address || 'Location not available',
      features: hotel.hotelInfo?.amenities || ["Standard features"],
      aiExcerpt: hotel.hotelInfo?.description?.substring(0, 100) + "..." || "Great hotel choice",
      roomTypes: hotel.roomTypes
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
        'You\'re viewing mock hotel data. Set TEST_MODE to false to use real API calls.',
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
      setSearchResults(searchResponse);

      let convertedHotels: Hotel[] = [];

      if (searchResponse.aiRecommendationsAvailable && searchResponse.recommendations) {
        console.log('🤖 Using AI Recommendations');
        convertedHotels = searchResponse.recommendations.map((rec, index) => 
          convertRecommendationToDisplayHotel(rec, index)
        );
      } else {
        console.log('📋 Using Regular Hotel Results');
        const hotelsToConvert = searchResponse.hotels || searchResponse.allHotels || [];
        convertedHotels = hotelsToConvert.map((hotel, index) => 
          convertHotelToDisplayHotel(hotel, index)
        );
      }
      
      setDisplayHotels(convertedHotels);

      if (searchResponse.searchParams.checkin) {
        setCheckInDate(new Date(searchResponse.searchParams.checkin));
      }
      if (searchResponse.searchParams.checkout) {
        setCheckOutDate(new Date(searchResponse.searchParams.checkout));
      }

      const alertTitle = searchResponse.aiRecommendationsAvailable 
        ? 'AI-Powered Results! 🤖✨' 
        : 'Search Complete! 🏨';
        
      const alertMessage = searchResponse.aiRecommendationsAvailable
        ? `Found ${searchResponse.aiRecommendationsCount} personalized AI recommendations!`
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

  const handleSearch = useCallback(() => {
    console.log('🔍 Manual search triggered:', searchQuery);
    if (searchQuery.trim()) {
      executeSmartSearch(searchQuery);
    }
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    console.log('Clear button pressed');
    setSearchQuery('');
    setSearchResults(null);
    if (TEST_MODE) {
      setDisplayHotels(mockHotels);
    } else {
      setDisplayHotels([]);
    }
  }, []);

  const handleDateChange = useCallback((type: 'checkin' | 'checkout', date: Date) => {
    if (type === 'checkin') {
      setCheckInDate(date);
    } else {
      setCheckOutDate(date);
    }
  }, []);

  // Define handleBookNow first
  const handleBookNow = useCallback((hotel: Hotel) => {
    console.log('Book now pressed for:', hotel.name);
    
    let bookingMessage = `Ready to book ${hotel.name}!\n\n`;
    
    if (hotel.pricePerNight) {
      bookingMessage += `Price: ${hotel.pricePerNight.display}\n`;
    } else {
      bookingMessage += `Price: $${hotel.price}/night\n`;
    }
    
    if (searchResults?.searchParams) {
      const params = searchResults.searchParams;
      bookingMessage += `Dates: ${params.checkin} to ${params.checkout}\n`;
      bookingMessage += `Guests: ${params.adults} adults`;
      if (params.children > 0) {
        bookingMessage += `, ${params.children} children`;
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

  const handleViewDetails = useCallback((hotel: Hotel) => {
    console.log('View details pressed for:', hotel.name);
    
    let detailsMessage = `Hotel Details for ${hotel.name}\n\n`;
    
    if (hotel.aiMatchPercent) {
      detailsMessage += `🤖 AI Match: ${hotel.aiMatchPercent}%\n`;
    }
    
    if (hotel.whyItMatches) {
      detailsMessage += `Why it matches: ${hotel.whyItMatches}\n\n`;
    }
    
    if (hotel.funFacts && hotel.funFacts.length > 0) {
      detailsMessage += `Fun facts:\n${hotel.funFacts.map(fact => `• ${fact}`).join('\n')}\n\n`;
    }
    
    detailsMessage += `⭐ Rating: ${hotel.rating}/5 (${hotel.reviews} reviews)\n`;
    detailsMessage += `📍 Location: ${hotel.location}\n`;
    detailsMessage += `🚶 Transit: ${hotel.transitDistance}\n`;
    
    if (hotel.features && hotel.features.length > 0) {
      detailsMessage += `\nAmenities: ${hotel.features.join(', ')}\n`;
    }
    
    if (hotel.tags && hotel.tags.length > 0) {
      detailsMessage += `\nPerfect for: ${hotel.tags.join(', ')}\n`;
    }
    
    if (hotel.pricePerNight) {
      detailsMessage += `\nPrice: ${hotel.pricePerNight.display}`;
    } else {
      detailsMessage += `\nPrice: $${hotel.price}/night`;
    }
    
    if (searchResults?.searchParams) {
      const params = searchResults.searchParams;
      detailsMessage += `\nDates: ${params.checkin} to ${params.checkout}`;
      detailsMessage += `\nGuests: ${params.adults} adults`;
      if (params.children > 0) {
        detailsMessage += `, ${params.children} children`;
      }
    }
    
    Alert.alert(
      'Hotel Details',
      detailsMessage,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Book Now', style: 'default', onPress: () => handleBookNow(hotel) }
      ]
    );
  }, [searchResults, handleBookNow]);

  const handleHotelPress = useCallback((hotel: Hotel) => {
    console.log('Hotel selected:', hotel.name);
    
    let alertMessage = '';
    
    if (hotel.aiMatchPercent) {
      alertMessage += `🤖 AI Match: ${hotel.aiMatchPercent}%\n\n`;
    }
    
    if (hotel.whyItMatches) {
      alertMessage += `Why it matches: ${hotel.whyItMatches}\n\n`;
    }
    
    if (hotel.funFacts && hotel.funFacts.length > 0) {
      alertMessage += `Fun facts:\n${hotel.funFacts.map(fact => `• ${fact}`).join('\n')}\n\n`;
    }
    
    if (hotel.pricePerNight) {
      alertMessage += `Price: ${hotel.pricePerNight.display}\n\n`;
    }
    
    alertMessage += `⭐ Rating: ${hotel.rating}/5\n`;
    alertMessage += `📍 Location: ${hotel.location}`;
    
    Alert.alert(
      hotel.name,
      alertMessage || 'Hotel details',
      [{ text: 'OK' }]
    );
  }, []);

  const handleBackPress = useCallback(() => {
    console.log('Back button pressed - returning to initial search');
    navigation.navigate('InitialSearch');
  }, [navigation]);

  const getPlaceholderText = () => {
    if (!isFocused && !searchQuery) {
      return `${displayText}${cursorVisible ? '|' : ''}`;
    }
    return "Search for amazing stays...";
  };

  // Show loading screen while searching (but not in test mode)
  if (isSearching && !TEST_MODE) {
    return <LoadingScreen searchQuery={searchQuery} />;
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TEST MODE INDICATOR */}
      {TEST_MODE && (
        <View style={tw`bg-orange-100 px-4 py-2 border-b border-orange-200`}>
          <Text style={tw`text-orange-800 text-sm font-medium text-center`}>
            🧪 TEST MODE ACTIVE - Using mock data
          </Text>
        </View>
      )}

      {/* SEARCH HEADER */}
      <View style={tw`px-5 pt-3 pb-4 bg-white`}>
        {/* Main Search Bar - Full Width */}
        <View style={tw`flex-row items-center bg-gray-50 rounded-2xl px-4 border border-gray-100 gap-2.5 h-13 mb-3`}>
          <TouchableOpacity
            style={tw`w-5 h-5 items-center justify-center`}
            onPress={handleBackPress}
            activeOpacity={0.6}
          >
            <Ionicons name="arrow-back" size={20} color="#666666" />
          </TouchableOpacity>
          
          <TextInput
            style={[
              tw`flex-1 text-base text-black font-normal`,
              {
                lineHeight: Platform.OS === 'ios' ? 20 : 22,
                includeFontPadding: false,
                textAlignVertical: 'center',
                paddingVertical: 0,
                margin: 0
              }
            ]}
            placeholder={getPlaceholderText()}
            placeholderTextColor="#999999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={handleSearch}
            autoCorrect={false}
            autoCapitalize="none"
            multiline={false}
            numberOfLines={1}
            returnKeyType="search"
            editable={!isSearching}
          />
          
          {/* Show clear button if there's text */}
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={tw`w-5 h-5 items-center justify-center`}
              onPress={handleClearSearch}
              activeOpacity={0.6}
            >
              <Ionicons name="close-circle" size={20} color="#666666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Refine button - Full Width Below */}
        <TouchableOpacity
          style={tw`flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl bg-black/5 border border-gray-200 w-full`}
          onPress={handleAiSearch}
          activeOpacity={0.7}
          disabled={isSearching}
        >
          <Ionicons
            name="sparkles"
            size={16}
            color="#666666"
          />
          <Text style={tw`text-sm font-medium text-gray-600`}>
            Refine Search with AI
          </Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH RESULTS HEADER */}
      {searchQuery.trim().length > 0 && (
        <View style={tw`px-5 pb-3`}>
          <Text style={tw`text-sm text-gray-500`}>
            {TEST_MODE ? 
              `Test mode results for "${searchQuery}" (${displayHotels.length} hotels)` :
              searchResults?.aiRecommendationsAvailable 
                ? `AI-matched results for "${searchQuery}" (${searchResults.aiRecommendationsCount} hotels)`
                : searchResults?.hotelsWithRates 
                ? `Search results for "${searchQuery}" (${searchResults.hotelsWithRates} hotels)`
                : `Search results for "${searchQuery}"`
            }
          </Text>
        </View>
      )}

      {/* CONTENT VIEW - Always Story View */}
      <SwipeableStoryView
        hotels={displayHotels}
        onHotelPress={handleHotelPress}
        onViewDetails={handleViewDetails}
      />

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