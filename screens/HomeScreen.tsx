// HomeScreen.tsx - Updated with AI sparkle icon
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import ListView from '../components/ListView/ListView';
import SwipeView from '../components/StoryView/SwipeView';
import DateSelector from '../components/DateSelector';

// Animated Toggle Button Component
interface AnimatedToggleButtonProps {
  showSwipeView: boolean;
  onViewToggle: (viewType: 'list' | 'swipe') => void;
}

const AnimatedToggleButton: React.FC<AnimatedToggleButtonProps> = ({
  showSwipeView,
  onViewToggle,
}) => {
  // Animation values
  const slideAnimation = useRef(new Animated.Value(showSwipeView ? 1 : 0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  
  // Button width for slide calculation
  const buttonWidth = 85;
  
  // Update animation when showSwipeView changes
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnimation, {
        toValue: showSwipeView ? 1 : 0,
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
  }, [showSwipeView]);

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
    outputRange: [1, buttonWidth],
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
            tw`absolute top-0.5 w-21 h-10.5 bg-black rounded-3xl shadow-lg`,
            {
              left: slideLeft,
            },
          ]}
        />
        
        {/* List Button */}
        <TouchableOpacity
          style={tw`items-center justify-center py-2.5 px-5 w-21 h-11 z-20`}
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
              color={!showSwipeView ? '#FFFFFF' : '#666666'} 
            />
            <Text style={tw`text-sm font-semibold ${!showSwipeView ? 'text-white' : 'text-gray-500'}`}>
              List
            </Text>
          </Animated.View>
        </TouchableOpacity>
        
        {/* Swipe Button */}
        <TouchableOpacity
          style={tw`items-center justify-center py-2.5 px-5 w-21 h-11 z-20`}
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
              name="layers" 
              size={16} 
              color={showSwipeView ? '#FFFFFF' : '#666666'} 
            />
            <Text style={tw`text-sm font-semibold ${showSwipeView ? 'text-white' : 'text-gray-500'}`}>
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
}

const mockHotels: Hotel[] = [
  {
    id: 1,
    name: "Grand Plaza Downtown",
    image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80",
    price: 189,
    originalPrice: 220,
    priceComparison: "15% below average",
    rating: 4.6,
    reviews: 1248,
    safetyRating: 9.2,
    transitDistance: "2 min walk",
    tags: ["Pet-friendly", "Business center", "Gym"],
    location: "Downtown Core",
    features: ["Free WiFi", "Pool", "Parking"]
  },
  {
    id: 2,
    name: "Cozy Family Inn",
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80",
    price: 129,
    originalPrice: 145,
    priceComparison: "11% below average",
    rating: 4.4,
    reviews: 892,
    safetyRating: 8.7,
    transitDistance: "5 min walk",
    tags: ["Family-friendly", "Kitchen", "Laundry"],
    location: "Arts District",
    features: ["Free Breakfast", "WiFi", "Family rooms"]
  },
  {
    id: 3,
    name: "Luxury Riverside Resort",
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
    price: 295,
    originalPrice: 275,
    priceComparison: "7% above average",
    rating: 4.8,
    reviews: 2156,
    safetyRating: 9.5,
    transitDistance: "8 min walk",
    tags: ["Luxury", "Spa", "Fine dining"],
    location: "Riverside",
    features: ["Spa", "Restaurant", "Concierge"]
  }
];

const HomeScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [checkInDate, setCheckInDate] = useState<Date>(new Date());
  const [checkOutDate, setCheckOutDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [showSwipeView, setShowSwipeView] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

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

  // Event handlers
  const handleAiSearch = useCallback(() => {
    console.log('AI search button pressed');
    setIsAiProcessing(!isAiProcessing);
    setTimeout(() => {
      setIsAiProcessing(false);
      setSearchQuery("AI-powered luxury hotels with spa and ocean view");
    }, 2000);
  }, [isAiProcessing]);

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
    
    setShowSwipeView(viewType === 'swipe');
  }, []);

  const handleHotelPress = useCallback((hotel: Hotel) => {
    console.log('Hotel selected:', hotel.name);
  }, []);

  const handleBookNow = useCallback((hotel: Hotel) => {
    console.log('Book now pressed for:', hotel.name);
  }, []);

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
        <View style={tw`flex-row items-center gap-3`}>
          <View style={tw`flex-1 flex-row items-center bg-gray-50 rounded-2xl px-4 py-3.5 border border-gray-100 gap-2.5 ${isFocused ? 'border-black bg-white' : ''}`}>
            <Ionicons name="search" size={20} color="#666666" />
            <TextInput
              style={tw`flex-1 text-base text-black font-normal`}
              placeholder={getPlaceholderText()}
              placeholderTextColor="#999999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={tw`p-1`}
                onPress={handleClearSearch}
                activeOpacity={0.6}
              >
                <Ionicons name="close-circle" size={20} color="#666666" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            style={tw`w-13 h-13 rounded-xl bg-black items-center justify-center ${isAiProcessing ? 'bg-purple-600' : ''}`}
            onPress={handleAiSearch}
            activeOpacity={0.7}
          >
            <View style={tw`items-center justify-center`}>
              <Ionicons 
                name={isAiProcessing ? "hourglass" : "sparkles"} 
                size={20} 
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* AI PROCESSING INDICATOR */}
        {isAiProcessing && (
          <View style={tw`items-center mt-3 py-2.5 px-4 bg-purple-50 rounded-lg self-center border border-purple-200`}>
            <View style={tw`flex-row items-center gap-2 mb-1.5`}>
              <Ionicons name="sparkles" size={16} color="#7C3AED" />
              <View style={tw`flex-row items-center gap-1`}>
                <View style={tw`w-1.5 h-1.5 bg-purple-500 rounded-full`} />
                <View style={tw`w-1.5 h-1.5 bg-purple-400 rounded-full`} />
                <View style={tw`w-1.5 h-1.5 bg-purple-300 rounded-full`} />
              </View>
              <Ionicons name="sparkles" size={16} color="#7C3AED" />
            </View>
            <Text style={tw`text-sm text-purple-700 font-medium`}>AI is finding perfect matches...</Text>
          </View>
        )}
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
          showSwipeView={showSwipeView}
          onViewToggle={handleViewToggle}
        />
      </View>
      
      {/* CONTENT VIEW */}
      {showSwipeView ? (
        <SwipeView 
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
    </SafeAreaView>
  );
};

export default HomeScreen;