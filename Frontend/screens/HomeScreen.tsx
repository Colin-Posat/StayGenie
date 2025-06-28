// HomeScreen.tsx - Updated with correct navigation
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import ListView from '../components/ListView/ListView';
import StoryView from '../components/StoryView/StoryView';
import DateSelector from '../components/HomeScreenTop/DateSelector';
import AISearchOverlay from '../components/HomeScreenTop/AiSearchOverlay';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

interface RouteParams {
  searchQuery?: string;
}

// Updated navigation types to match the new structure
type FindStackParamList = {
  InitialSearch: undefined;
  Results: {
    searchQuery?: string;
  };
};

type HomeScreenNavigationProp = StackNavigationProp<FindStackParamList>;

// Animated Toggle Button Component
interface AnimatedToggleButtonProps {
  showStoryView: boolean;
  onViewToggle: (viewType: 'list' | 'swipe') => void;
}

const AnimatedToggleButton: React.FC<AnimatedToggleButtonProps> = ({
  showStoryView,
  onViewToggle,
}) => {
  // Animation values
  const slideAnimation = useRef(new Animated.Value(showStoryView ? 1 : 0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;

  // Button width for slide calculation
  const buttonWidth = 90;

  // Update animation when showStoryView changes
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

  // Glow effect animation
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
    // Scale animation on press
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

  // Calculate slide position
  const slideLeft = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, buttonWidth - 1],
  });

  // Interpolate glow opacity
  const glowOpacity = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <Animated.View
      style={[
        tw`relative`,
        {
          transform: [{ scale: scaleAnimation }],
        },
      ]}
    >
      {/* Background glow effect */}
      <Animated.View
        style={[
          tw`absolute -top-1 -left-1 -right-1 -bottom-1 bg-black/10 rounded-3xl`,
          {
            opacity: glowOpacity,
          },
        ]}
      />

      {/* Toggle container */}
      <View style={tw`flex-row bg-gray-100 rounded-3xl border border-gray-200 overflow-hidden relative z-10 h-11`}>
        {/* Animated sliding background */}
        <Animated.View
          style={[
            tw`absolute top-0.5 w-22 h-10 bg-black rounded-3xl shadow-lg`,
            {
              left: slideLeft,
            },
          ]}
        />

        {/* List Button */}
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

        {/* Swipe Button */}
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

// Custom hook for auto-typing placeholder text
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

  // Handle cursor blinking
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  // Handle typing animation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isDeleting) {
        // Deleting text
        setDisplayText(currentWord.substring(0, currentIndex.current - 1));
        currentIndex.current -= 1;

        // When deletion is complete, move to next word
        if (currentIndex.current <= 0) {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length);
        }
      } else {
        // Typing text
        setDisplayText(currentWord.substring(0, currentIndex.current + 1));
        currentIndex.current += 1;

        // When word is complete, pause then start deleting
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
}

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
  {
    id: 2,
    name: "Kona Cliffside Lodge",
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80",
    price: 195,
    originalPrice: 225,
    priceComparison: "13% below average",
    rating: 4.5,
    reviews: 892,
    safetyRating: 8.9,
    transitDistance: "5 min walk to town",
    tags: ["Mountain view", "Local cuisine", "Sunset deck"],
    location: "Kailua-Kona, Big Island",
    features: ["Volcanic mountain views", "Farm-to-table dining", "Sunset viewing deck"],
    aiExcerpt: "Volcanic cliff views with authentic Hawaiian poke and farm-to-table dining."
  },
  {
    id: 3,
    name: "Waikiki Luxury Oceanfront",
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
    price: 395,
    originalPrice: 365,
    priceComparison: "8% above average",
    rating: 4.9,
    reviews: 2756,
    safetyRating: 9.6,
    transitDistance: "Beachfront location",
    tags: ["Beachfront", "Michelin dining", "Infinity pool"],
    location: "Waikiki, Oahu",
    features: ["Direct beach access", "Michelin-starred restaurant", "Rooftop infinity pool"],
    aiExcerpt: "Diamond Head views and Michelin-starred Hawaiian-Japanese fusion restaurant."
  },
  {
    id: 4,
    name: "Hanalei Bay Garden Resort",
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
    price: 225,
    originalPrice: 245,
    priceComparison: "8% below average",
    rating: 4.6,
    reviews: 1203,
    safetyRating: 9.1,
    transitDistance: "2 min walk to bay",
    tags: ["Garden view", "Organic dining", "Cultural center"],
    location: "Hanalei, Kauai",
    features: ["Tropical garden setting", "Organic restaurant", "Hawaiian cultural activities"],
    aiExcerpt: "Tropical garden and bay views with organic Hawaiian cuisine using local ingredients."
  },
  {
    id: 5,
    name: "Volcano House Heritage Hotel",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
    price: 165,
    originalPrice: 185,
    priceComparison: "11% below average",
    rating: 4.4,
    reviews: 967,
    safetyRating: 8.7,
    transitDistance: "Inside National Park",
    tags: ["Volcano view", "Historic dining", "Stargazing"],
    location: "Hawaii Volcanoes National Park, Big Island",
    features: ["Active volcano views", "Historic restaurant", "Stargazing deck"],
    aiExcerpt: "Active volcano crater views and historic restaurant with lava rock-grilled meats."
  },
  {
    id: 6,
    name: "Lanai Pineapple Plantation Resort",
    image: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80",
    price: 310,
    originalPrice: 285,
    priceComparison: "9% above average",
    rating: 4.8,
    reviews: 1445,
    safetyRating: 9.4,
    transitDistance: "Private island location",
    tags: ["Private island", "Gourmet dining", "Plantation views"],
    location: "Lanai City, Lanai",
    features: ["Private island exclusivity", "Gourmet restaurant", "Historic plantation grounds"],
    aiExcerpt: "Private island plantation views with world-class Hawaiian regional cuisine."
  }
];

const HomeScreen = () => {
  const route = useRoute();
  const params = route.params as RouteParams;
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const [searchQuery, setSearchQuery] = useState('');
  const [checkInDate, setCheckInDate] = useState<Date>(() => {
    const today = new Date();
    today.setDate(today.getDate() + 30);
    return today;
  });
  const [checkOutDate, setCheckOutDate] = useState<Date>(() => {
    const today = new Date();
    today.setDate(today.getDate() + 32); // 30 + 2
    return today;
  });
  const [showStoryView, setShowStoryView] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // AI Overlay states
  const [showAiOverlay, setShowAiOverlay] = useState(false);

  // Auto-typing setup
  const hotelSearchSuggestions = [
    "Luxury hotels in Dubai",
    "Beach resorts in Maldives",
    "City breaks in Barcelona",
    "Mountain lodges in Swiss Alps",
    "Boutique hotels in Paris",
    "Safari lodges in Kenya",
    "Ski resorts in Aspen",
    "Historic hotels in Rome",
    "Beach villas in Santorini",
    "Spa resorts in Bali"
  ];

  const { displayText, cursorVisible } = useTypingPlaceholder(
    hotelSearchSuggestions,
    120,
    60,
    2500
  );

  useEffect(() => {
    if (params?.searchQuery) {
      setSearchQuery(params.searchQuery);
    }
  }, [params?.searchQuery]);

  // Event handlers
  const handleAiSearch = useCallback(() => {
    console.log('AI search button pressed');
    setShowAiOverlay(true);
    setIsAiProcessing(false); // Reset processing state when opening overlay
  }, []);

  const handleCloseAiOverlay = useCallback(() => {
    setShowAiOverlay(false);
  }, []);

  const handleSearchUpdate = useCallback((newSearch: string) => {
    setSearchQuery(newSearch);
  }, []);

  const handleSearch = useCallback(() => {
    console.log('Searching for:', searchQuery);
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    console.log('Clear button pressed');
    setSearchQuery('');
  }, []);

  const handleDateChange = useCallback((type: 'checkin' | 'checkout', date: Date) => {
    if (type === 'checkin') {
      setCheckInDate(date);
    } else {
      setCheckOutDate(date);
    }
  }, []);

  // Enhanced view toggle handler with layout animation
  const handleViewToggle = useCallback((viewType: 'list' | 'swipe') => {
    console.log(`${viewType} view selected`);

    // Add smooth layout transition
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
  }, []);

  const handleBookNow = useCallback((hotel: Hotel) => {
    console.log('Book now pressed for:', hotel.name);
  }, []);

  // Updated back press handler to match new navigation structure
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

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* SEARCH HEADER */}
      <View style={tw`px-5 pt-3 pb-4 bg-white`}>
        {/* Search bar with external refine button */}
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
              placeholder={!isFocused && !searchQuery ? `${displayText}${cursorVisible ? '|' : ''}` : "Search for amazing stays..."}
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
            />
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

          {/* Refine button outside search bar */}
          <TouchableOpacity
            style={tw`flex-row items-center gap-1.5 px-3 py-2.5 rounded-xl bg-black/5 border border-gray-200 h-13`}
            onPress={handleAiSearch}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isAiProcessing ? "hourglass" : "sparkles"}
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
        {/* DATE SELECTOR */}
        <DateSelector
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          onDateChange={handleDateChange}
        />

        {/* ANIMATED VIEW TOGGLE */}
        <AnimatedToggleButton
          showStoryView={showStoryView}
          onViewToggle={handleViewToggle}
        />
      </View>

      {/* SEARCH RESULTS HEADER - Only show in List view */}
      {!showStoryView && searchQuery.trim().length > 0 && (
        <View style={tw`px-5 pb-3`}>
          <Text style={tw`text-sm text-gray-500`}>
            Search results for "{searchQuery}"
          </Text>
        </View>
      )}

      {/* CONTENT VIEW */}
      {showStoryView ? (
        <StoryView
          hotels={mockHotels}
          onHotelPress={handleHotelPress}
          onBookNow={handleBookNow}
        />
      ) : (
        <ListView
          hotels={mockHotels}
          onHotelPress={handleHotelPress}
          onBookNow={handleBookNow}
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