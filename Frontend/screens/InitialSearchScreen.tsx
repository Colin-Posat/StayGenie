// InitialSearchScreen.tsx - Fixed with animation reset
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
import { useFocusEffect } from '@react-navigation/native'; // ADD THIS IMPORT

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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pillWheelResetTrigger, setPillWheelResetTrigger] = useState(0);
  
  // Animation values
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(40)).current;
  const searchBarScale = useRef(new Animated.Value(0.98)).current;
  const turquoiseGlow = useRef(new Animated.Value(0)).current;
  const logoFade = useRef(new Animated.Value(0)).current;
  const floatingElements = useRef(new Animated.Value(0)).current;
  const backgroundShift = useRef(new Animated.Value(0)).current;
  
  // Transition animations
  const screenSlideOut = useRef(new Animated.Value(0)).current;
  const contentFadeOut = useRef(new Animated.Value(1)).current;
  const scaleTransition = useRef(new Animated.Value(1)).current;

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

  // FIX: Reset animations when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('InitialSearchScreen focused - resetting animations');
      
      // IMMEDIATE RESET: Reset pill wheel immediately when screen comes into focus
      setPillWheelResetTrigger(prev => prev + 1);
      
      // Add small delay to let navigation transition complete
      const resetTimer = setTimeout(() => {
        // Reset all animation values to their initial state
        screenSlideOut.setValue(0);
        contentFadeOut.setValue(1);
        scaleTransition.setValue(1);
        fadeAnimation.setValue(0);
        slideAnimation.setValue(40);
        logoFade.setValue(0);
        searchBarScale.setValue(0.98);
        turquoiseGlow.setValue(0);
        
        // Reset component state
        setIsTransitioning(false);
        setIsFocused(false);
        
        // Start the proper entry animations
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
      }, 100); // Small delay to let navigation settle
      
      return () => {
        // Cleanup function (runs when screen loses focus)
        console.log('InitialSearchScreen unfocused - cleaning up');
        clearTimeout(resetTimer);
      };
    }, [])
  );

  // Continuous floating animation for background elements
  useEffect(() => {
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingElements, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
        }),
        Animated.timing(floatingElements, {
          toValue: 0,
          duration: 6000,
          useNativeDriver: true,
        }),
      ])
    );

    const backgroundAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundShift, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: false,
        }),
        Animated.timing(backgroundShift, {
          toValue: 0,
          duration: 20000,
          useNativeDriver: false,
        }),
      ])
    );

    floatingAnimation.start();
    backgroundAnimation.start();

    return () => {
      floatingAnimation.stop();
      backgroundAnimation.stop();
    };
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

  // Transition animation function
  const performTransitionAnimation = (callback: () => void) => {
    setIsTransitioning(true);
    
    Animated.parallel([
      // Slide entire screen to the left (off-screen)
      Animated.timing(screenSlideOut, {
        toValue: -width, // Slide to the left by screen width
        duration: 400,
        useNativeDriver: true,
      }),
      // Fade out content
      Animated.timing(contentFadeOut, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      // Slight scale down for depth effect
      Animated.timing(scaleTransition, {
        toValue: 0.95,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Execute the navigation callback after animation completes
      callback();
    });
  };

  // Search handler with transition animation
  const handleSearch = () => {
    if (searchQuery.trim() && !isTransitioning) {
      console.log('Starting search transition for:', searchQuery);
      
      // Perform transition animation, then navigate
      performTransitionAnimation(() => {
        if (navigation) {
          // Navigate to HomeScreen (Results) with search query
          navigation.navigate('Results', { 
            searchQuery: searchQuery.trim() 
          });
        }
        onSearchStart?.(searchQuery);
      });
    }
  };

  // Recommendation handler with transition animation
  const handleRecommendationPress = (recommendation: SearchRecommendation) => {
    if (!isTransitioning) {
      console.log('Starting recommendation transition for:', recommendation.query);
      
      // Perform transition animation, then navigate
      performTransitionAnimation(() => {
        if (navigation) {
          // Navigate to HomeScreen (Results) with recommendation query
          navigation.navigate('Results', { 
            searchQuery: recommendation.query 
          });
        }
        onSearchStart?.(recommendation.query);
      });
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

  // Floating background elements positions
  const getFloatingElementTransform = (index: number, scale = 1) => {
    const baseY = (index * 150) % height;
    const baseX = (index * 120) % width;
    
    return {
      transform: [
        {
          translateY: floatingElements.interpolate({
            inputRange: [0, 1],
            outputRange: [baseY, baseY - 30],
          }),
        },
        {
          translateX: floatingElements.interpolate({
            inputRange: [0, 1],
            outputRange: [baseX, baseX + (index % 2 === 0 ? 20 : -20)],
          }),
        },
        { scale },
        {
          rotate: floatingElements.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', index % 2 === 0 ? '10deg' : '-10deg'],
          }),
        },
      ],
    };
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      {/* Animated container for the entire screen */}
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
        {/* Simple white background with subtle floating elements */}
        <View style={tw`absolute inset-0 bg-white`}>
          {/* Floating geometric elements - more subtle */}
          {[...Array(5)].map((_, index) => (
            <Animated.View
              key={index}
              style={[
                tw`absolute rounded-full opacity-5`,
                {
                  width: 40 + (index * 15) % 60,
                  height: 40 + (index * 15) % 60,
                  backgroundColor: index % 3 === 0 ? TURQUOISE_LIGHT : 
                                  index % 3 === 1 ? TURQUOISE : '#e0f7ff',
                  ...getFloatingElementTransform(index, 0.3 + (index * 0.05)),
                }
              ]}
            />
          ))}

          {/* Floating sparkle icons - very subtle */}
          {[...Array(3)].map((_, index) => (
            <Animated.View
              key={`sparkle-${index}`}
              style={[
                tw`absolute`,
                {
                  ...getFloatingElementTransform(index + 8, 0.6),
                  opacity: 0.1,
                }
              ]}
            >
              <Ionicons 
                name="sparkles" 
                size={12 + (index * 2)} 
                color={TURQUOISE_LIGHT} 
              />
            </Animated.View>
          ))}
        </View>

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
            {/* Enhanced Header section with encapsulating highlight */}
            <View style={tw`items-center mb-2 relative`}>
              {/* Subtle background glow that encapsulates both texts */}
              <View style={[
                tw`absolute -inset-3 rounded-3xl opacity-5 `,
                { backgroundColor: TURQUOISE,
                  top: -25,
                 }
              ]} />
              
              <Text style={tw`text-2xl font-semibold text-gray-900 text-center relative z-10`}>
                Describe your perfect stay{' '}
                <Text style={{ color: TURQUOISE }}></Text>
              </Text>
              
              <Text style={tw`text-sm text-gray-500 text-center font-light mb-4 relative z-10`}>
                Type anything. We'll find the right place.
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
                    name="sparkles"
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
                  editable={!isTransitioning}
                />
                
                {/* Clear button with turquoise hover */}
                {searchQuery.length > 0 && !isTransitioning && (
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
                        backgroundColor: isTransitioning ? '#9CA3AF' : TURQUOISE,
                        shadowColor: TURQUOISE,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.4,
                        shadowRadius: 12,
                        elevation: 8,
                      }
                    ]}
                    onPress={handleSearch}
                    activeOpacity={0.8}
                    disabled={isTransitioning}
                  >
                    <Ionicons 
                      name={isTransitioning ? "hourglass" : "arrow-forward"} 
                      size={20} 
                      color="white" 
                    />
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
                resetTrigger={pillWheelResetTrigger}
              />
            </View>
          </Animated.View>

          {/* Enhanced Beautiful Hotels Section */}
          <View style={tw`flex-1`}>
            <View style={tw`mb-6 flex-row items-center justify-between`}>
              <View style={tw`flex-1`}>
                <Text style={tw`text-lg font-semibold text-gray-900 mb-1`}>
                  Beautiful Stays For You
                </Text>
                <View style={tw`flex-row items-center`}>
                  <View style={[tw`w-8 h-0.5 rounded-full mr-2`, { backgroundColor: TURQUOISE }]} />
                  <Text style={tw`text-xs text-gray-500 font-medium`}>
                    Our top picks
                  </Text>
                </View>
              </View>
              
              {/* Animated explore more button */}
              <Animated.View
                style={{
                  opacity: fadeAnimation,
                  transform: [{
                    scale: fadeAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  }],
                }}
              >

              </Animated.View>
            </View>

            {/* Enhanced Hotel Grid */}
            <Animated.View
              style={{
                opacity: fadeAnimation,
                transform: [{
                  translateY: slideAnimation.interpolate({
                    inputRange: [0, 40],
                    outputRange: [0, 20],
                  }),
                }],
              }}
            >
              <FlatList
                data={displayedHotels}
                numColumns={2}
                keyExtractor={(item) => item.id}
                columnWrapperStyle={tw`justify-between`}
                contentContainerStyle={tw`gap-4 pb-8`}
                showsVerticalScrollIndicator={false}
                scrollEnabled={!isTransitioning}
                renderItem={({ item, index }) => (
                  <Animated.View
                    style={{
                      opacity: fadeAnimation,
                      transform: [{
                        translateY: fadeAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      }],
                    }}
                  >
                    <BeautifulHotelCard
                      hotel={item}
                      onPress={() => handleHotelPress(item)}
                    />
                  </Animated.View>
                )}
                ItemSeparatorComponent={() => <View style={tw`h-4`} />}
              />
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  ); 
};

export default InitialSearchScreen;