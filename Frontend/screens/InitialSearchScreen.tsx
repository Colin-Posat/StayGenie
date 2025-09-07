// InitialSearchScreen.tsx - Updated with date selection integration
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
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import SearchGuidePills from '../components/InitalSearch/SearchGuidePills';
import RecentSearches from '../components/InitalSearch/RecentSearches';
import SearchQueryCarousel from '../components/InitalSearch/SearchQueryCarousel';
import { getRandomSearchQueries, SearchQueryWithHotels } from '../utils/SearchQueryData';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

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
  const [searchQueryCarousels, setSearchQueryCarousels] = useState<SearchQueryWithHotels[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Get auth context for recent searches
  const { 
    getRecentSearches, 
    addRecentSearch, 
    clearRecentSearches,
    removeRecentSearch,
    isAuthenticated 
  } = useAuth();
  
  // Animation values
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(40)).current;
  const searchBarScale = useRef(new Animated.Value(0.98)).current;
  const turquoiseGlow = useRef(new Animated.Value(0)).current;
  const logoFade = useRef(new Animated.Value(0)).current;
  const floatingElements = useRef(new Animated.Value(0)).current;
  const backgroundShift = useRef(new Animated.Value(0)).current;
  const pulsingShadow = useRef(new Animated.Value(0)).current;
  
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

  // Load random search query carousels on mount
  useEffect(() => {
    const randomCarousels = getRandomSearchQueries(4);
    setSearchQueryCarousels(randomCarousels);
  }, []);

  // Reset animations when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('InitialSearchScreen focused - resetting animations');
      
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
      }, 100);
      
      return () => {
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

  useEffect(() => {
    const pulsingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulsingShadow, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(pulsingShadow, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    );

    pulsingAnimation.start();

    return () => {
      pulsingAnimation.stop();
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
        toValue: -width,
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

  const handleStyleSelect = (styleText: string) => {
  console.log('Hotel style selected from pills:', styleText);
  
  // Add the style text to the existing search query
  if (searchQuery.trim()) {
    // If there's already text, add the style with a separator
    setSearchQuery(prev => `${prev.trim()} • ${styleText}`);
  } else {
    // If empty, just set the style
    setSearchQuery(styleText);
  }
};

  const handleAmenitiesSelect = (amenitiesText: string) => {
  console.log('Amenities selected from pills:', amenitiesText);
  
  // Add the amenities text to the existing search query
  if (searchQuery.trim()) {
    // If there's already text, add the amenities with a separator
    setSearchQuery(prev => `${prev.trim()} • ${amenitiesText}`);
  } else {
    // If empty, just set the amenities
    setSearchQuery(amenitiesText);
  }
};

  const handleGuestsSelect = (guestsText: string) => {
  console.log('Guests selected from pills:', guestsText);
  
  // Add the guests text to the existing search query
  if (searchQuery.trim()) {
    // If there's already text, add the guests with a separator
    setSearchQuery(prev => `${prev.trim()} • ${guestsText}`);
  } else {
    // If empty, just set the guests
    setSearchQuery(guestsText);
  }
};

  // Search handler with recent searches tracking
  const handleSearch = async () => {
    if (searchQuery.trim() && !isTransitioning) {
      const trimmedQuery = searchQuery.trim();
      console.log('Starting search transition for:', trimmedQuery);
      
      // Add to recent searches if user is authenticated
      if (isAuthenticated) {
        try {
          await addRecentSearch(trimmedQuery);
        } catch (error) {
          console.error('Failed to save recent search:', error);
        }
      }
      
      // Perform transition animation, then navigate
      performTransitionAnimation(() => {
        if (navigation) {
          navigation.navigate('Results', { 
            searchQuery: trimmedQuery 
          });
        }
        onSearchStart?.(trimmedQuery);
      });
    }
  };

  // Handle recent search selection
  const handleRecentSearchPress = async (search: string) => {
    if (!isTransitioning) {
      console.log('Starting recent search transition for:', search);
      
      // Move this search to the top of recent searches
      if (isAuthenticated) {
        try {
          await addRecentSearch(search);
        } catch (error) {
          console.error('Failed to update recent search:', error);
        }
      }
      
      // Perform transition animation, then navigate
      performTransitionAnimation(() => {
        if (navigation) {
          navigation.navigate('Results', { 
            searchQuery: search 
          });
        }
        onSearchStart?.(search);
      });
    }
  };
  const handleBudgetSelect = (budgetText: string) => {
  console.log('Budget selected from pills:', budgetText);
  
  // Add the budget text to the existing search query
  if (searchQuery.trim()) {
    // If there's already text, add the budget with a separator
    setSearchQuery(prev => `${prev.trim()} • ${budgetText}`);
  } else {
    // If empty, just set the budget
    setSearchQuery(budgetText);
  }
};

  // Handle removing individual recent search
  const handleRemoveRecentSearch = async (search: string) => {
    if (isAuthenticated) {
      try {
        await removeRecentSearch(search);
      } catch (error) {
        console.error('Failed to remove recent search:', error);
      }
    }
  };

  // Handle clearing all recent searches
  const handleClearAllRecentSearches = async () => {
    if (isAuthenticated) {
      try {
        await clearRecentSearches();
      } catch (error) {
        console.error('Failed to clear recent searches:', error);
      }
    }
  };

  // Handle search query carousel press
  const handleSearchQueryPress = async (query: string) => {
    if (!isTransitioning) {
      console.log('Starting search query carousel transition for:', query);
      
      // Add to recent searches if user is authenticated
      if (isAuthenticated) {
        try {
          await addRecentSearch(query);
        } catch (error) {
          console.error('Failed to save recent search:', error);
        }
      }
      
      // Perform transition animation, then navigate
      performTransitionAnimation(() => {
        if (navigation) {
          navigation.navigate('Results', { 
            searchQuery: query 
          });
        }
        onSearchStart?.(query);
      });
    }
  };

  // Handle search guide pill press
  const handleSearchGuidePillPress = (action: string, pill: any) => {
    console.log('Search guide pill pressed:', action, pill);
    // TODO: Handle different pill actions
    // switch(action) {
    //   case 'ADD_DATES':
    //     // Open date picker modal
    //     break;
    //   case 'SET_BUDGET':
    //     // Open budget selector modal
    //     break;
    //   case 'PICK_LOCATION':
    //     // Open location picker modal
    //     break;
    //   case 'ADD_GUESTS':
    //     // Open guest count selector
    //     break;
    //   case 'SELECT_AMENITIES':
    //     // Open amenities selector
    //     break;
    //   case 'SELECT_STYLE':
    //     // Open hotel style selector
    //     break;
    // }
  };

  // NEW: Handle date selection from SearchGuidePills
  const handleDateSelect = (dateText: string) => {
    console.log('Date selected from pills:', dateText);
    
    // Add the date text to the existing search query
    if (searchQuery.trim()) {
      // If there's already text, add the dates with a separator
      setSearchQuery(prev => `${prev.trim()} • ${dateText}`);
    } else {
      // If empty, just set the dates
      setSearchQuery(dateText);
    }
    
    // Optional: Focus the search input to show the user the update
    // Note: You might want to add a ref to the TextInput for this
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
        {/* Main Content - ScrollView to handle overflow */}
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-4 pb-6`}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isTransitioning}
          keyboardShouldPersistTaps="handled"
        >
          {/* Reduced top spacing for more compactness */}
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
            {/* Enhanced Header section */}
            <View style={tw`items-center mb-4 w-full max-w-2xl`}>
              {/* Logo/Brand area with subtle animation */}
              <Animated.View 
                style={[
                  tw`mb-3`,
                  {
                    opacity: logoFade,
                    transform: [{
                      scale: logoFade.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    }],
                  }
                ]}
              >
                <View style={tw`flex-row items-center justify-center`}>
                </View>
              </Animated.View>
              
              {/* Main headline with gradient text effect */}
              <Animated.View
                style={[
                  tw`mb-2`,
                  {
                    opacity: fadeAnimation,
                    transform: [{
                      translateY: slideAnimation.interpolate({
                        inputRange: [0, 40],
                        outputRange: [0, -10],
                      }),
                    }],
                  }
                ]}
              >
                <View style={tw`items-center`}>
                  <Text style={tw`mt--10 text-4xl font-bold text-gray-900 text-center leading-tight`}>
                    Describe your
                  </Text>
                  <View style={tw`flex-row items-center justify-center`}>
                    <Text style={[
                      tw`text-4xl font-bold text-center leading-tight`,
                      { 
                        color: TURQUOISE,
                        textShadowColor: 'rgba(29, 249, 255, 0.3)',
                        textShadowOffset: { width: 0, height: 2 },
                        textShadowRadius: 8,
                      }
                    ]}>
                      perfect stay
                    </Text>
                    {/* Your logo */}
                    <View style={tw`ml-1`}>
                      <Image
                        source={require('../assets/images/logo.png')}
                        style={[
                          tw`w-8 h-8`,
                          {
                            shadowColor: 'rgba(29, 249, 255, 0.3)',
                            shadowOffset: { width: 0, height: 2 },
                            shadowRadius: 8,
                            shadowOpacity: 1,
                          }
                        ]}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                </View>
              </Animated.View>
            </View>

            <View style={tw`w-full items-center`}>
              <Animated.View 
                style={[
                  tw`relative mb-5 w-full max-w-2xl`,
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
                      shadowColor: Animated.add(
                        turquoiseGlow.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                        }),
                        pulsingShadow.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 0.5],
                        })
                      ).interpolate({
                        inputRange: [0, 0.5, 1, 1.5],
                        outputRange: ['#000', TURQUOISE, TURQUOISE, TURQUOISE],
                      }),
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: Animated.add(
                        turquoiseGlow.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 0.3],
                        }),
                        pulsingShadow.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.1, 0.25],
                        })
                      ),
                      shadowRadius: Animated.add(
                        turquoiseGlow.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 20],
                        }),
                        pulsingShadow.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 28],
                        })
                      ),
                      elevation: 10,
                      borderColor: Animated.add(
                        turquoiseGlow.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                        }),
                        pulsingShadow.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 0.3],
                        })
                      ).interpolate({
                        inputRange: [0, 0.3, 1, 1.3],
                        outputRange: ['#E5E7EB', 'rgba(29, 249, 255, 0.3)', TURQUOISE, TURQUOISE],
                      }),
                      borderWidth: Animated.add(
                        turquoiseGlow.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 0],
                        }),
                        pulsingShadow.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1],
                        })
                      ),
                    },
                  ]}
                >
                  {/* Search icon */}
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
                  
                  {/* Clear button */}
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
                
                {/* Floating search button */}
                {searchQuery.trim().length > 0 && (
                  <Animated.View
                    style={[
                      tw`absolute -right-0 top-2`,
                      {
                        opacity: fadeAnimation,
                      }
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        tw`w-12 h-12 mr-2 rounded-2xl items-center justify-center shadow-lg`,
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
            </View>

            {/* Suggestions section - SearchGuidePills with date selection handler */}
            <View style={tw`w-full max-w-5xl mx-auto mb-4`}>
              <SearchGuidePills
  onPillPress={handleSearchGuidePillPress}
  onDateSelect={handleDateSelect}
  onBudgetSelect={handleBudgetSelect}
  onGuestsSelect={handleGuestsSelect}
  onAmenitiesSelect={handleAmenitiesSelect}
  onStyleSelect={handleStyleSelect}  // Add this line
/>

            </View>
          </Animated.View>

          {/* Content sections */}
          <View style={tw`flex-1 w-full max-w-4xl mx-auto`}>
            {/* Recent Searches Section */}
            {isAuthenticated && (
              <Animated.View
                style={{
                  opacity: fadeAnimation,
                  transform: [{
                    translateY: slideAnimation.interpolate({
                      inputRange: [0, 40],
                      outputRange: [0, 15],
                    }),
                  }],
                }}
              >
                <RecentSearches
                  recentSearches={getRecentSearches()}
                  onSearchPress={handleRecentSearchPress}
                  onRemoveSearch={handleRemoveRecentSearch}
                  onClearAll={handleClearAllRecentSearches}
                />
              </Animated.View>
            )}

            {/* Search Query Carousels Section */}
            <View style={tw`mb-6`}>
              {/* Section Header */}
              <Animated.View
                style={[
                  tw`flex-row items-center justify-between mb-4 px-1`,
                  {
                    opacity: fadeAnimation,
                    transform: [{
                      translateY: slideAnimation.interpolate({
                        inputRange: [0, 40],
                        outputRange: [0, 20],
                      }),
                    }],
                  }
                ]}
              >
              </Animated.View>

              {searchQueryCarousels.map((carousel, index) => {
                const isLast = index === searchQueryCarousels.length - 1;
                return (
                  <View
                    key={`${carousel.searchQuery}-${index}`}
                    style={[tw`${isLast ? '' : 'mb--5'}`]}
                  >
                    <SearchQueryCarousel
                      searchQuery={carousel.searchQuery}
                      hotels={carousel.hotels}
                      onSearchPress={handleSearchQueryPress}
                      index={index}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  ); 
};

export default InitialSearchScreen;