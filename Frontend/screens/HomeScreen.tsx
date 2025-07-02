// HomeScreen.tsx - Updated with modern loading screen
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  LayoutAnimation,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import ListView from '../components/ListView/ListView';
import StoryView from '../components/StoryView/StoryView';
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

// Mock hotels data (fallback)
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
    features: ["Ocean view rooms", "Award-winning restaurant", "Spa"],
    aiExcerpt: "Panoramic ocean views from all rooms plus award-winning seafood restaurant."
  },
];

// Base URL
const BASE_URL = 'http://localhost:3003';

// Animated Toggle Button Component (keeping existing implementation)
interface AnimatedToggleButtonProps {
  showStoryView: boolean;
  onViewToggle: (viewType: 'list' | 'swipe') => void;
}

const AnimatedToggleButton: React.FC<AnimatedToggleButtonProps> = ({
  showStoryView,
  onViewToggle,
}) => {
  const slideAnimation = useRef(new Animated.Value(showStoryView ? 1 : 0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const buttonWidth = 90;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnimation, {
        toValue: showStoryView ? 1 : 0,
        useNativeDriver: false,
        tension: 150,
        friction: 8,
      }),
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [showStoryView]);

  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, []);

  const handlePress = (viewType: 'list' | 'swipe') => {
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.9,
        duration: 75,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onViewToggle(viewType);
  };

  const slideLeft = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, buttonWidth - 1],
  });

  const glowOpacity = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <Animated.View
      style={[
        tw`relative`,
        { transform: [{ scale: scaleAnimation }] },
      ]}
    >
      <Animated.View
        style={[
          tw`absolute -top-1 -left-1 -right-1 -bottom-1 bg-black/10 rounded-3xl`,
          { opacity: glowOpacity },
        ]}
      />
      <View style={tw`flex-row bg-gray-100 rounded-3xl border border-gray-200 overflow-hidden relative z-10 h-11`}>
        <Animated.View
          style={[
            tw`absolute top-0.5 w-22 h-10 bg-black rounded-3xl shadow-lg`,
            { left: slideLeft },
          ]}
        />
        <TouchableOpacity
          style={tw`items-center justify-center py-2.5 px-5 w-22 h-11 z-20`}
          onPress={() => handlePress('list')}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              tw`flex-row items-center gap-1.5`,
              {
                opacity: slideAnimation.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 0.7, 0.5],
                }),
              },
            ]}
          >
            <Ionicons
              name="list"
              size={16}
              color={!showStoryView ? '#FFFFFF' : '#666666'}
            />
            <Text style={tw`text-sm font-semibold ${!showStoryView ? 'text-white' : 'text-gray-500'}`}>
              List
            </Text>
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`items-center justify-center py-2.5 px-5 w-22 h-11 z-20`}
          onPress={() => handlePress('swipe')}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              tw`flex-row items-center gap-1.5`,
              {
                opacity: slideAnimation.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.5, 0.7, 1],
                }),
              },
            ]}
          >
            <Ionicons
              name="copy"
              size={16}
              color={showStoryView ? '#FFFFFF' : '#666666'}
            />
            <Text style={tw`text-sm font-semibold ${showStoryView ? 'text-white' : 'text-gray-500'}`}>
              Story
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Custom hook for typing placeholder (keeping existing implementation)
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
  const [displayHotels, setDisplayHotels] = useState<Hotel[]>(mockHotels);
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
  const [showStoryView, setShowStoryView] = useState(false);
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
  // Improved image selection logic for LiteAPI structure
  const getHotelImage = (recommendation: HotelRecommendation): string => {
    const defaultImage = "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80";
    
    console.log(`🖼️ Processing images for ${recommendation.name}:`);
    console.log('Recommendation object keys:', Object.keys(recommendation));
    
    // Check for main_photo first (highest quality)
    if (recommendation.images && recommendation.images.length > 0) {
      console.log(`Found images array:`, recommendation.images);
      const firstImage = recommendation.images[0];
      if (firstImage && typeof firstImage === 'string' && firstImage.trim() !== '') {
        if (firstImage.startsWith('http://') || firstImage.startsWith('https://') || firstImage.startsWith('//')) {
          console.log(`✅ Using image from array: ${firstImage}`);
          return firstImage;
        }
      }
    }
    
    // If recommendation has main_photo directly (from AI processing)
    if ((recommendation as any).main_photo) {
      const mainPhoto = (recommendation as any).main_photo;
      if (mainPhoto && typeof mainPhoto === 'string' && mainPhoto.trim() !== '') {
        console.log(`✅ Using main_photo: ${mainPhoto}`);
        return mainPhoto;
      }
    }
    
    // If recommendation has thumbnail
    if ((recommendation as any).thumbnail) {
      const thumbnail = (recommendation as any).thumbnail;
      if (thumbnail && typeof thumbnail === 'string' && thumbnail.trim() !== '') {
        console.log(`✅ Using thumbnail: ${thumbnail}`);
        return thumbnail;
      }
    }
    
    console.log(`⚠️ No valid images found for ${recommendation.name}, using default`);
    return defaultImage;
  };

  // Extract price information
  let price = 200; // Default fallback
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
    image: getHotelImage(recommendation), // Use improved image selection
    price: Math.round(price),
    originalPrice: Math.round(originalPrice),
    priceComparison: priceComparison,
    rating: recommendation.starRating || 4.0,
    reviews: Math.floor(Math.random() * 1000) + 100, // Mock reviews
    safetyRating: 8.5 + Math.random() * 1.5, // Mock safety rating
    transitDistance: "Check location details", // Mock transit
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
  // Improved image selection logic for LiteAPI structure
  const getHotelImage = (hotelInfo: any): string => {
    const defaultImage = "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80";
    
    if (!hotelInfo) {
      console.log(`⚠️ No hotelInfo for hotel at index ${index}`);
      return defaultImage;
    }

    console.log(`🖼️ Processing images for ${hotelInfo.name || 'Unknown Hotel'}:`);
    console.log('HotelInfo keys:', Object.keys(hotelInfo));
    
    // Check for main_photo first (highest quality)
    if (hotelInfo.main_photo) {
      const mainPhoto = hotelInfo.main_photo;
      if (mainPhoto && typeof mainPhoto === 'string' && mainPhoto.trim() !== '') {
        console.log(`✅ Using main_photo: ${mainPhoto}`);
        return mainPhoto;
      }
    }
    
    // Check for thumbnail as backup
    if (hotelInfo.thumbnail) {
      const thumbnail = hotelInfo.thumbnail;
      if (thumbnail && typeof thumbnail === 'string' && thumbnail.trim() !== '') {
        console.log(`✅ Using thumbnail: ${thumbnail}`);
        return thumbnail;
      }
    }
    
    // Check legacy images array (if it exists)
    if (hotelInfo.images && Array.isArray(hotelInfo.images) && hotelInfo.images.length > 0) {
      console.log(`Found images array:`, hotelInfo.images);
      const firstImage = hotelInfo.images[0];
      if (firstImage && typeof firstImage === 'string' && firstImage.trim() !== '') {
        if (firstImage.startsWith('http://') || firstImage.startsWith('https://') || firstImage.startsWith('//')) {
          console.log(`✅ Using image from array: ${firstImage}`);
          return firstImage;
        }
      }
    }
    
    console.log(`⚠️ No valid images found for ${hotelInfo.name || 'Unknown Hotel'}, using default`);
    return defaultImage;
  };

  // Calculate price from room rates
  let price = 200; // Default
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
    image: getHotelImage(hotel.hotelInfo), // Use improved image selection
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

    try {
      console.log('\n' + '='.repeat(80));
      console.log('🚀 Starting Smart Hotel Search...');
      console.log('📝 User Input:', userInput);
      
      setIsSearching(true);

      // Call the smart search endpoint
      const searchResponse: SmartSearchResponse = await makeRequest('/api/hotels/smart-search', {
        userInput: userInput
      });

      console.log('✅ Smart Search Complete!');
      console.log('📊 Search Summary:', {
        totalHotelsFound: searchResponse.totalHotelsFound,
        hotelsWithRates: searchResponse.hotelsWithRates,
        aiRecommendationsCount: searchResponse.aiRecommendationsCount,
        aiRecommendationsAvailable: searchResponse.aiRecommendationsAvailable
      });

      setSearchResults(searchResponse);

      // Convert to display format
      let convertedHotels: Hotel[] = [];

      if (searchResponse.aiRecommendationsAvailable && searchResponse.recommendations) {
        console.log('🤖 Using AI Recommendations');
        convertedHotels = searchResponse.recommendations.map((rec, index) => 
          convertRecommendationToDisplayHotel(rec, index)
        );
        
        // Log AI recommendations
        console.log('\n🤖 AI RECOMMENDATIONS:');
        searchResponse.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec.name}`);
          console.log(`   📊 AI Match: ${rec.aiMatchPercent}%`);
          console.log(`   ⭐ Stars: ${rec.starRating}/5`);
          console.log(`   💡 Why: ${rec.whyItMatches}`);
          console.log(`   🎯 Facts: ${rec.funFacts.join(' | ')}`);
          if (rec.pricePerNight) {
            console.log(`   💰 Price: ${rec.pricePerNight.display}`);
          }
          console.log('');
        });
      } else {
        console.log('📋 Using Regular Hotel Results');
        const hotelsToConvert = searchResponse.hotels || searchResponse.allHotels || [];
        convertedHotels = hotelsToConvert.map((hotel, index) => 
          convertHotelToDisplayHotel(hotel, index)
        );
      }
      
      setDisplayHotels(convertedHotels);

      // Update dates from search params
      if (searchResponse.searchParams.checkin) {
        setCheckInDate(new Date(searchResponse.searchParams.checkin));
      }
      if (searchResponse.searchParams.checkout) {
        setCheckOutDate(new Date(searchResponse.searchParams.checkout));
      }

      // Show success message
      const alertTitle = searchResponse.aiRecommendationsAvailable 
        ? 'AI-Powered Results! 🤖✨' 
        : 'Search Complete! 🏨';
        
      const alertMessage = searchResponse.aiRecommendationsAvailable
        ? `Found ${searchResponse.aiRecommendationsCount} personalized AI recommendations!\n\nThese hotels are specifically matched to your preferences with AI analysis.`
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
    if (params?.searchQuery && params.searchQuery !== searchQuery) {
      console.log('📥 Received search query from InitialSearchScreen:', params.searchQuery);
      setSearchQuery(params.searchQuery);
      
      // Automatically execute smart search
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
    // Auto-search when updated from overlay
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
    setDisplayHotels(mockHotels);
  }, []);

  const handleDateChange = useCallback((type: 'checkin' | 'checkout', date: Date) => {
    if (type === 'checkin') {
      setCheckInDate(date);
    } else {
      setCheckOutDate(date);
    }
  }, []);

  const handleViewToggle = useCallback((viewType: 'list' | 'swipe') => {
    console.log(`${viewType} view selected`);
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext({
        duration: 300,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
      });
    }
    setShowStoryView(viewType === 'swipe');
  }, []);

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

  const handleBookNow = useCallback((hotel: Hotel) => {
    console.log('Book now pressed for:', hotel.name);
    
    let bookingMessage = `Ready to book ${hotel.name}!\n\n`;
    
    if (hotel.pricePerNight) {
      bookingMessage += `Price: ${hotel.pricePerNight.display}\n`;
    } else {
      bookingMessage += `Price: ${hotel.price}/night\n`;
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

  // Show loading screen while searching
  if (isSearching) {
    return <LoadingScreen searchQuery={searchQuery} />;
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* SEARCH HEADER */}
      <View style={tw`px-5 pt-3 pb-4 bg-white`}>
        <View style={tw`flex-row items-center gap-3`}>
          <View style={tw`flex-1 flex-row items-center bg-gray-50 rounded-2xl px-4 border border-gray-100 gap-2.5 h-13`}>
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

          {/* Refine button */}
          <TouchableOpacity
            style={tw`flex-row items-center gap-1.5 px-3 py-2.5 rounded-xl bg-black/5 border border-gray-200 h-13`}
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
              Refine
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTROLS ROW */}
      <View style={tw`flex-row justify-between items-center px-5 pb-4 gap-3`}>
        <DateSelector
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          onDateChange={handleDateChange}
        />
        <AnimatedToggleButton
          showStoryView={showStoryView}
          onViewToggle={handleViewToggle}
        />
      </View>

      {/* SEARCH RESULTS HEADER */}
      {!showStoryView && searchQuery.trim().length > 0 && (
        <View style={tw`px-5 pb-3`}>
          <Text style={tw`text-sm text-gray-500`}>
            {searchResults?.aiRecommendationsAvailable 
              ? `AI-matched results for "${searchQuery}" (${searchResults.aiRecommendationsCount} hotels)`
              : searchResults?.hotelsWithRates 
              ? `Search results for "${searchQuery}" (${searchResults.hotelsWithRates} hotels)`
              : `Search results for "${searchQuery}"`
            }
          </Text>
        </View>
      )}

      {/* CONTENT VIEW */}
      {showStoryView ? (
        <StoryView
          hotels={displayHotels}
          onHotelPress={handleHotelPress}
          onBookNow={handleBookNow}
        />
      ) : (
        <ListView
          hotels={displayHotels}
          onHotelPress={handleHotelPress}
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          adults={searchResults?.searchParams?.adults || 2}
          children={searchResults?.searchParams?.children || 0}
        />
      )}

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