// InitialSearchScreen.tsx - Sleek redesign with emphasized search
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import RevolvingPillWheel, { SearchRecommendation } from '../components/InitalSearch/RevolvingPillWheel';

const { width, height } = Dimensions.get('window');

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

// Floating genie logo component
const FloatingGenie: React.FC = () => {
  const floatAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnimation, {
          toValue: -6,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnimation, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        transform: [{ translateY: floatAnimation }],
      }}
    >
      <Image
        source={require('../assets/images/logo.png')}
        style={tw`w-20 h-20 opacity-90`}
        resizeMode="contain"
      />
    </Animated.View>
  );
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
  
  // Animation values
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(40)).current;
  const searchBarScale = useRef(new Animated.Value(0.98)).current;

  // Refined search suggestions
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

  // Search recommendations for the revolving wheel
  const searchRecommendations: SearchRecommendation[] = [
    {
      text: "Budget Tokyo food scene",
      query: "Budget hotels in Tokyo with great local food and restaurants nearby"
    },
    {
      text: "NYC rooftop bars downtown",
      query: "Downtown Manhattan hotels with rooftop bars and city views"
    },
    {
      text: "Bali spa beachfront",
      query: "Beachfront spa resorts in Bali with wellness packages"
    },
    {
      text: "Orlando family suites",
      query: "Family hotels near Disney World Orlando with shuttle service"
    },
    {
      text: "Paris historic walkable",
      query: "Boutique hotels in historic Paris neighborhoods walkable to attractions"
    },
    {
      text: "Cancun kids club resorts",
      query: "All-inclusive Cancun resorts with children's activities and babysitting"
    },
    {
      text: "London Heathrow business",
      query: "Business hotels near London Heathrow with airport shuttle and meeting rooms"
    },
    {
      text: "Tuscany vineyard romance",
      query: "Romantic hotels in Tuscany wine country with vineyard views"
    },
    {
      text: "Aspen ski-in ski-out",
      query: "Ski-in ski-out mountain lodges in Aspen with equipment rental"
    },
    {
      text: "Barcelona beach boutique",
      query: "Boutique hotels near Barcelona beaches with rooftop terraces"
    }
  ];

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
    ]).start();
  }, []);

  // Search bar focus animation
  useEffect(() => {
    Animated.timing(searchBarScale, {
      toValue: isFocused ? 1.02 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
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
      <View style={tw`flex-1 px-8`}>
        {/* Top spacing */}
        <View style={tw`h-12`} />
        
        <Animated.View 
          style={[
            tw`items-center`,
            {
              opacity: fadeAnimation,
              transform: [{ translateY: slideAnimation }],
            }
          ]}
        >
          {/* Logo section */}
          <View style={tw`items-center mb-6`}>
            <View style={tw`mb-4`}>
              <FloatingGenie />
            </View>
            
            {/* Refined tagline */}
            <Text style={tw`text-xl font-medium text-gray-800 text-center mb-2`}>
              Where would you like to stay?
            </Text>
            
            <Text style={tw`text-sm text-gray-500 text-center font-light`}>
              Tell us anything, we'll find the perfect match
            </Text>
          </View>

          {/* Main Search Input */}
          <Animated.View 
            style={[
              tw`relative mb-6 w-full max-w-md`,
              {
                transform: [{ scale: searchBarScale }],
              }
            ]}
          >
            <View style={[
              tw`flex-row items-center bg-white rounded-3xl px-6 shadow-lg border border-gray-100`,
              { 
                height: 64,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
                elevation: 10,
              },
              isFocused && {
                borderColor: '#000000',
                shadowOpacity: 0.15,
              }
            ]}>
              {/* Search icon */}
              <View style={tw`w-6 h-6 mr-4 items-center justify-center`}>
                <Ionicons
                  name="search"
                  size={20}
                  color={isFocused ? "#000000" : "#9CA3AF"}
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
              />
              
              {/* Clear button */}
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  activeOpacity={0.6}
                  style={tw`ml-3 w-6 h-6 items-center justify-center`}
                >
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Floating search button - Changed to black background with white arrow */}
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
                    tw`w-12 h-12 bg-black rounded-2xl items-center justify-center shadow-lg`,
                    {
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
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
          <View style={tw`w-full max-w-md`}>
            {/* Suggestions label */}
            <View style={tw`mb-3`}>

            </View>

            {/* Revolving Search Recommendations */}
            <RevolvingPillWheel
              recommendations={searchRecommendations}
              onPress={handleRecommendationPress}
              pixelsPerSecond={30}
              pauseOnInteraction={true}
            />
          </View>
        </Animated.View>

        {/* Bottom spacing */}
        <View style={tw`flex-1`} />
      </View>
    </SafeAreaView>
  );
};

export default InitialSearchScreen;