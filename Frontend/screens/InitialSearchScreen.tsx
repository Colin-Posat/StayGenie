// InitialSearchScreen.tsx - Updated with turquoise (#1df9ff) integration and logo
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import RevolvingPillWheel, { SearchRecommendation } from '../components/InitalSearch/RevolvingPillWheel';
import BeautifulHotelCard, { BeautifulHotel } from '../components/InitalSearch/BeautifulHotelCard';
import { getRandomBeautifulHotels } from '../utils/BeautifulHotelsData';

const { width, height } = Dimensions.get('window');

// Turquoise color theme
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';

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

interface InitialSearchScreenProps {
  navigation?: any;
  onSearchStart?: (query: string) => void;
}

const InitialSearchScreen: React.FC<InitialSearchScreenProps> = ({ 
  navigation,
  onSearchStart 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [displayedHotels, setDisplayedHotels] = useState<BeautifulHotel[]>([]);
  
  // Animation values
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(40)).current;
  const searchBarScale = useRef(new Animated.Value(0.98)).current;
  const turquoiseGlow = useRef(new Animated.Value(0)).current;
  const logoFade = useRef(new Animated.Value(0)).current;

  // Refined search suggestions with turquoise theme
  const hotelSearchSuggestions = [
    "Tokyo capsule hotels",
    "Bali beachfront villas",
    "Paris boutique stays",
    "NYC rooftop hotels",
    "Dubai luxury resorts",
    "Rome historic hotels",
    "London business hotels",
    "Santorini sunset views",
    "Aspen ski lodges",
    "Morocco desert camps"
  ];

  const { displayText, cursorVisible } = useTypingPlaceholder(
    hotelSearchSuggestions,
    80,
    40,
    2000
  );

  const searchRecommendations: SearchRecommendation[] = [
    {
      text: "Chic boutique stays in Paris",
      query: "Boutique hotels in Paris with artistic flair"
    },
    {
      text: "Skyline-view hotels in NYC",
      query: "Hotels in NYC with skyline views"
    },
    {
      text: "Luxury desert stays in Morocco",
      query: "Upscale desert camps and riads in Morocco"
    },
    {
      text: "Cozy slopeside lodges in Aspen",
      query: "Ski-in ski-out lodges in Aspen"
    },
    {
      text: "Timeless stays in ancient Rome",
      query: "Historic hotels near Roman landmarks"
    },
    {
      text: "Executive stays in central London",
      query: "Business hotels near London financial district"
    },
    {
      text: "Cliffside sunsets in Santorini",
      query: "Romantic cliffside hotels in Santorini with sunset views"
    },
    {
      text: "Futuristic pods in Tokyo",
      query: "Unique capsule hotels in Tokyo"
    }
  ];

  // Load random hotels on mount
  useEffect(() => {
    const randomHotels = getRandomBeautifulHotels(6);
    setDisplayedHotels(randomHotels);
  }, []);

  // Initial animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(logoFade, {
        toValue: 1,
        duration: 1000,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Search bar focus animation with turquoise glow
  useEffect(() => {
    Animated.parallel([
      Animated.timing(searchBarScale, {
        toValue: isFocused ? 1.02 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(turquoiseGlow, {
        toValue: isFocused ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isFocused]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      console.log('Starting search for:', searchQuery);
      
      if (navigation) {
        navigation.navigate('Results', { searchQuery: searchQuery.trim() });
      }
      
      onSearchStart?.(searchQuery);
    }
  };

  const handleRecommendationPress = (recommendation: SearchRecommendation) => {
    setSearchQuery(recommendation.query);
    if (navigation) {
      navigation.navigate('Results', { searchQuery: recommendation.query });
    }
  };

  const handleHotelPress = (hotel: BeautifulHotel) => {
    console.log('Hotel card tapped - opening Google Maps for:', hotel.name);
    // The BeautifulHotelCard will handle opening Google Maps internally
    // No navigation or search is triggered here
  };

  const getPlaceholderText = () => {
    if (!isFocused && !searchQuery) {
      return `${displayText}${cursorVisible ? '|' : ''}`;
    }
    return "Search for amazing stays...";
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      {/* Background gradient overlay */}
      <View style={tw`absolute inset-0 bg-gradient-to-b from-gray-50 to-white opacity-60`} />



      {/* Main Content */}
      <View style={tw`flex-1 px-6`}>
        {/* Top spacing - increased to accommodate logo */}
        <View style={tw`h-16`} />
        
        <Animated.View 
          style={[
            tw`items-center`,
            {
              opacity: fadeAnimation,
              transform: [{ translateY: slideAnimation }],
            }
          ]}
        >
          {/* Header section with turquoise accent */}
          <View style={tw`items-center mb-2`}>
              <Text style={tw`text-2xl font-semibold text-gray-900 text-center`}>
                Where would you like to{' '}
                <Text style={[
                  tw`font-bold`,
                  { color: TURQUOISE }
                ]}>
                  stay?
                </Text>
              </Text>
              
            </View>
            <Text style={tw`text-sm text-gray-500 text-center font-light mb-4`}>
              Tell us anything, we'll find the perfect match
            </Text>

            

          {/* Main Search Input with turquoise styling */}
          <Animated.View 
            style={[
              tw`relative mb-6 w-full max-w-md`,
              {
                transform: [{ scale: searchBarScale }],
              }
            ]}
          >
            <Animated.View 
              style={[
                tw`flex-row items-center bg-white rounded-3xl px-6 shadow-lg border`,
                { 
                  height: 64,
                  shadowColor: isFocused ? TURQUOISE : '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: isFocused ? 0.3 : 0.1,
                  shadowRadius: 20,
                  elevation: 10,
                  borderColor: turquoiseGlow.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#E5E7EB', TURQUOISE],
                  }),
                  borderWidth: turquoiseGlow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 2],
                  }),
                },
              ]}
            >
              {/* Search icon with turquoise color when focused */}
              <View style={tw`w-6 h-6 mr-2 items-center justify-center`}>
                <Ionicons
                  name="search"
                  size={20}
                  color={isFocused ? TURQUOISE : "#9CA3AF"}
                />
              </View>
              
              <TextInput
                style={[
                  tw`flex-1 text-lg text-gray-900 font-normal`,
                  {
                    lineHeight: Platform.OS === 'ios' ? 24 : 26,
                    includeFontPadding: false,
                    textAlignVertical: 'center',
                    paddingVertical: 0,
                  }
                ]}
                placeholder={getPlaceholderText()}
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onSubmitEditing={handleSearch}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="search"
                selectionColor={TURQUOISE}
              />
              
              {/* Clear button with turquoise hover */}
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  activeOpacity={0.6}
                  style={tw`ml-3 w-6 h-6 items-center justify-center`}
                >
                  <Ionicons name="close-circle" size={20} color={TURQUOISE} />
                </TouchableOpacity>
              )}
            </Animated.View>
            
            {/* Floating search button with turquoise gradient */}
            {searchQuery.trim().length > 0 && (
              <Animated.View
                style={[
                  tw`absolute -right--2 top-2`,
                  {
                    opacity: fadeAnimation,
                  }
                ]}
              >
                <TouchableOpacity
                  style={[
                    tw`w-12 h-12 rounded-2xl items-center justify-center shadow-lg`,
                    {
                      backgroundColor: TURQUOISE,
                      shadowColor: TURQUOISE,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 12,
                      elevation: 8,
                    }
                  ]}
                  onPress={handleSearch}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>

          {/* Suggestions section */}
          <View style={tw`w-full max-w-md mb-4`}>
            {/* Revolving Search Recommendations */}
            <RevolvingPillWheel
              recommendations={searchRecommendations}
              onPress={handleRecommendationPress}
              pixelsPerSecond={30}
              pauseOnInteraction={true}
            />
          </View>
        </Animated.View>

        {/* Beautiful Hotels Section with turquoise accent */}
        <View style={tw`flex-1`}>
          <View style={tw`mb-4 flex-row items-center`}>
            <Text style={tw`text-lg font-semibold text-gray-900 mb-1 flex-1`}>
              Beautiful Stays For You
            </Text>
          </View>

          {/* Hotel Grid using BeautifulHotelCard */}
          <FlatList
            data={displayedHotels}
            numColumns={2}
            keyExtractor={(item) => item.id}
            columnWrapperStyle={tw`justify-between`}
            contentContainerStyle={tw`gap-4`}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <BeautifulHotelCard
                hotel={item}
                onPress={() => handleHotelPress(item)}
              />
            )}
            ItemSeparatorComponent={() => <View style={tw`h-4`} />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default InitialSearchScreen;