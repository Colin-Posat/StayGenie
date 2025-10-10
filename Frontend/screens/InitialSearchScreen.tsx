// InitialSearchScreen.tsx - Updated with faster, more interesting auto-typing
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text as TextRN,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
  ScrollView,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from '../components/CustomText'; 
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import SearchGuidePills from '../components/InitalSearch/SearchGuidePills';
import RecentSearches from '../components/InitalSearch/RecentSearches';
import SearchQueryCarousel from '../components/InitalSearch/SearchQueryCarousel';
import { getRandomCarousels } from '../utils/carouselData';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

// Turquoise color theme
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';

// Interface for carousel data
interface SearchQueryWithHotels {
  searchQuery: string;
  hotels: Array<{
    id: string;
    name: string;
    image: string;
    price: number;
    rating: number;
    location: string;
    city: string;
    country: string;
    fullAddress: string;
  }>;
}

// Custom hook for auto-typing placeholder text
const useTypingPlaceholder = (
  words: string[],
  typingSpeed = 60,
  deletingSpeed = 30,
  delayAfterWord = 1500
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
    }, 400);
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
  const [inputHeight, setInputHeight] = useState(60);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [searchQueryCarousels, setSearchQueryCarousels] = useState<SearchQueryWithHotels[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Refs
  const textInputRef = useRef<TextInput>(null);
  
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
  const heightAnimation = useRef(new Animated.Value(60)).current;
  const scrollHintOpacity = useRef(new Animated.Value(0)).current;
  
  // Transition animations
  const screenSlideOut = useRef(new Animated.Value(0)).current;
  const contentFadeOut = useRef(new Animated.Value(1)).current;
  const scaleTransition = useRef(new Animated.Value(1)).current;

  // Constants for input handling
  const INPUT_FONT_SIZE = 16;
  const INPUT_LINE_HEIGHT = 22;
  const INPUT_VISIBLE_LINES = 3;
  const INPUT_HEIGHT = INPUT_LINE_HEIGHT * INPUT_VISIBLE_LINES + 12;
  const MIN_INPUT_HEIGHT = 85;
  const MAX_INPUT_HEIGHT = 85;
  const INPUT_BOTTOM_PAD = 10;
  const ANDROID_EXTRA_PAD = 6;

  // Realistic and appealing search suggestions for travelers
  const hotelSearchSuggestions = [
    "Beachfront resorts in Maldives with private pools",
    "Boutique hotels in Paris with Eiffel Tower views",
    "Mountain lodges in Swiss Alps with spa amenities",
    "Luxury villas in Tuscany with wine tastings",
    "Safari camps in Kenya with guided game drives",
    "Rooftop hotels in Tokyo with city skyline views",
    "Historic castles in Scotland with afternoon tea",
    "Eco-lodges in Costa Rica with zip line adventures",
    "Desert resorts in Morocco with camel trekking",
    "Overwater bungalows in Bora Bora with sunset dinners",
    "Ski chalets in Aspen with fireplace lounges",
    "Cliffside hotels in Santorini with infinity pools",
    "Tree lodges in Kenya overlooking wildlife",
    "Beach cabanas in Tulum with cenote access",
    "Ice hotels in Finland with northern lights viewing",
    "Jungle resorts in Bali with yoga classes",
    "Lighthouse hotels on coastal Maine with lobster dinners",
    "Floating hotels in Amsterdam with canal views",
    "Cave hotels in Cappadocia with balloon rides",
    "Ranch stays in Montana with horseback riding",
    "Vineyard hotels in Napa with wine tours",
    "Island resorts in Seychelles with snorkeling",
    "Historic ryokans in Japan with hot spring baths",
    "Desert glamping in Utah with stargazing tours"
  ];

  const { displayText, cursorVisible } = useTypingPlaceholder(
    hotelSearchSuggestions,
    15,  // Faster typing speed (was 80)
    10,  // Faster deleting speed (was 40)
    1500 // Shorter delay (was 2000)
  );

  // Load 3 random carousel collections on mount
  useEffect(() => {
    const randomCarousels = getRandomCarousels(3);
    setSearchQueryCarousels(randomCarousels);
  }, []);

  // Auto-focus to end when screen becomes active
  useEffect(() => {
    if (isFocused && searchQuery && textInputRef.current) {
      setTimeout(() => {
        textInputRef.current?.setNativeProps({
          selection: { start: searchQuery.length, end: searchQuery.length }
        });
      }, 100);
    }
  }, [isFocused, searchQuery]);

  // Handle content size change for multiline input
  const handleContentSizeChange = (e: any) => {
    const h = e?.nativeEvent?.contentSize?.height ?? MIN_INPUT_HEIGHT;
    const clamped = Math.max(MIN_INPUT_HEIGHT, Math.min(h, MAX_INPUT_HEIGHT));
    setInputHeight(clamped);
  };

  // Handle focus with cursor positioning
  const handleFocus = () => {
    setIsFocused(true);
    
    if (searchQuery && textInputRef.current) {
      setTimeout(() => {
        textInputRef.current?.setNativeProps({
          selection: { start: searchQuery.length, end: searchQuery.length }
        });
      }, 50);
    }
  };

  // Enhanced clear function
  const handleClear = () => {
    setSearchQuery('');
    setShowScrollHint(false);
    
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  };

  // Focus management on screen activation
  useFocusEffect(
    React.useCallback(() => {
      // Reset animations to visible state
      screenSlideOut.setValue(0);
      contentFadeOut.setValue(1);
      scaleTransition.setValue(1);
      fadeAnimation.setValue(1);
      slideAnimation.setValue(0);
      logoFade.setValue(1);
      searchBarScale.setValue(1);
      turquoiseGlow.setValue(0);

      setIsTransitioning(false);
      setIsFocused(false);
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
      Animated.spring(searchBarScale, {
        toValue: isFocused ? 1.02 : 1,
        tension: 100,
        friction: 8,
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
      Animated.timing(screenSlideOut, {
        toValue: -width,
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
      callback();
    });
  };

  // Focus input helper
  const focusInput = () => {
    textInputRef.current?.focus();
  };

  // Search Guide Pills handlers
  const handleStyleSelect = (styleText: string) => {
    console.log('Hotel style selected from pills:', styleText);
    
    if (searchQuery.trim()) {
      setSearchQuery(prev => `${prev.trim()} • ${styleText}`);
    } else {
      setSearchQuery(styleText);
    }
  };

  const handleAmenitiesSelect = (amenitiesText: string) => {
    console.log('Amenities selected from pills:', amenitiesText);
    
    if (searchQuery.trim()) {
      setSearchQuery(prev => `${prev.trim()} • ${amenitiesText}`);
    } else {
      setSearchQuery(amenitiesText);
    }
  };

  const handleGuestsSelect = (guestsText: string) => {
    console.log('Guests selected from pills:', guestsText);
    
    if (searchQuery.trim()) {
      setSearchQuery(prev => `${prev.trim()} • ${guestsText}`);
    } else {
      setSearchQuery(guestsText);
    }
  };

  const handleBudgetSelect = (budgetText: string) => {
    console.log('Budget selected from pills:', budgetText);
    
    if (searchQuery.trim()) {
      setSearchQuery(prev => `${prev.trim()} • ${budgetText}`);
    } else {
      setSearchQuery(budgetText);
    }
  };

  const handleDateSelect = (dateText: string) => {
    console.log('Date selected from pills:', dateText);
    
    if (searchQuery.trim()) {
      setSearchQuery(prev => `${prev.trim()} • ${dateText}`);
    } else {
      setSearchQuery(dateText);
    }
  };

  // Search handler with recent searches tracking
  const handleSearch = async () => {
    if (searchQuery.trim() && !isTransitioning) {
      const trimmedQuery = searchQuery.trim();
      console.log('Starting search transition for:', trimmedQuery);
      
      if (isAuthenticated) {
        try {
          await addRecentSearch(trimmedQuery);
        } catch (error) {
          console.error('Failed to save recent search:', error);
        }
      }
      
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
      
      if (isAuthenticated) {
        try {
          await addRecentSearch(search);
        } catch (error) {
          console.error('Failed to update recent search:', error);
        }
      }
      
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
      
      if (isAuthenticated) {
        try {
          await addRecentSearch(query);
        } catch (error) {
          console.error('Failed to save recent search:', error);
        }
      }
      
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

      {/* KeyboardAvoidingView for better mobile keyboard handling */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1`}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
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
            contentContainerStyle={[tw`px-4 pb-6`, { minHeight: height - 100 }]}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isTransitioning}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            contentInsetAdjustmentBehavior="automatic"
          >
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
              {/* Enhanced Header section - Mobile optimized */}
              <View style={tw`items-center mb-6 w-full px-2`}>
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
                
                <Animated.View
                  style={[
                    tw`mb-4`,
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
                  <View style={tw`items-center px-2`}>
                    {/* Mobile-responsive text sizes */}
                    <Text style={[
                      tw`text-4xl md:text-4xl font-bold text-gray-900 text-center leading-tight mt--10`,
                      Platform.OS === 'android' && { fontFamily: 'sans-serif-medium' }
                    ]}>
                      Describe your
                    </Text>
                    <View style={tw`flex-row items-center justify-center`}>
                      <Text style={[
                        tw`text-4xl md:text-4xl font-bold text-center leading-tight mb--2`,
                        Platform.OS === 'android' && { fontFamily: 'sans-serif-medium' },
                        { 
                          color: TURQUOISE,
                          textShadowColor: 'rgba(29, 249, 255, 0.3)',
                          textShadowOffset: { width: 0, height: 2 },
                          textShadowRadius: 8,
                        }
                      ]}>
                        perfect stay
                      </Text>
                      <View style={tw`ml-0.5`}>
                        <Image
                          source={require('../assets/images/logo.png')}
                          style={[
                            tw`w-8 h-8 md:w-8 md:h-8`,
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

              {/* Mobile-optimized Search Bar */}
              <View style={tw`w-full items-center px-2`}>
                <Animated.View 
                  style={[
                    tw`relative mb-4 w-full`,
                    { transform: [{ scale: searchBarScale }] }
                  ]}
                >
                  {/* Make the entire container tappable */}
                  <TouchableOpacity activeOpacity={0.9} onPress={focusInput} accessibilityRole="search">
                    <Animated.View 
                      style={[
                        tw`bg-white rounded-2xl shadow-lg border`,
                        {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: pulsingShadow.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.15] }),
                          shadowRadius: pulsingShadow.interpolate({ inputRange: [0, 1], outputRange: [4, 6] }),
                          elevation: 8,
                          borderColor: Animated.add(
                            turquoiseGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
                            pulsingShadow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] })
                          ).interpolate({
                            inputRange: [0, 0.3, 1, 1.3],
                            outputRange: ['#E5E7EB', 'rgba(29, 249, 255, 0.5)', TURQUOISE, TURQUOISE],
                          }),
                          borderWidth: turquoiseGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }),
                        },
                      ]}
                    >
                      {/* Leading search icon */}
                      <View style={tw`absolute left-4 top-4 z-10`}>
                        <Ionicons
                          name="sparkles"
                          size={18}
                          color={isFocused || searchQuery ? TURQUOISE : '#9CA3AF'}
                        />
                      </View>

                      {/* Main input area */}
                      <View style={tw`px-4 pt-3.5`}>
                        <View style={tw`flex-row items-start`}>
                          <View style={tw`flex-1 relative`}>
                            {/* Animated placeholder overlay */}
                            {!isFocused && !searchQuery && (
                              <View 
                                style={[
                                  tw`absolute left-0 top-0`,
                                  {
                                    paddingLeft: 28,
                                    paddingRight: 0,
                                    pointerEvents: 'none',
                                  }
                                ]}
                              >
                                <Text
                                  style={[
                                    tw`text-base font-normal`,
                                    Platform.OS === 'android' && { fontFamily: 'sans-serif' },
                                    {
                                      fontSize: INPUT_FONT_SIZE,
                                      lineHeight: INPUT_LINE_HEIGHT,
                                      color: '#9CA3AF',
                                    }
                                  ]}
                                  numberOfLines={INPUT_VISIBLE_LINES}
                                >
                                  {displayText}
                                  <Text style={{ opacity: cursorVisible ? 1 : 0 }}>|</Text>
                                </Text>
                              </View>
                            )}
                            
                            <TextInput
                              ref={textInputRef}
                              multiline
                              numberOfLines={INPUT_VISIBLE_LINES}
                              style={[
                                tw`text-base text-gray-900 font-normal`,
                                Platform.OS === 'android' && { fontFamily: 'sans-serif' },
                                {
                                  fontSize: INPUT_FONT_SIZE,
                                  lineHeight: INPUT_LINE_HEIGHT,
                                  height: INPUT_HEIGHT,
                                  textAlignVertical: 'top',
                                  paddingVertical: -10,
                                  paddingHorizontal: 0,
                                  margin: 0,
                                  paddingLeft: 28,
                                  paddingBottom: INPUT_BOTTOM_PAD + (Platform.OS === 'android' ? ANDROID_EXTRA_PAD : 0),
                                },
                              ]}
                              placeholder={isFocused || searchQuery ? "Search for amazing stays..." : ""}
                              placeholderTextColor="#9CA3AF"
                              value={searchQuery}
                              onChangeText={setSearchQuery}
                              onFocus={handleFocus}
                              onBlur={() => setIsFocused(false)}
                              onSubmitEditing={handleSearch}
                              maxLength={400}
                              autoCorrect={false}
                              autoCapitalize="none"
                              returnKeyType="search"
                              selectionColor={TURQUOISE}
                              editable={!isTransitioning}
                              blurOnSubmit
                              scrollEnabled
                              accessibilityLabel="Search hotels and stays"
                            />
                          </View>
                        </View>
                      </View>

                      {/* Bottom action bar */}
                      <View style={tw`flex-row items-center justify-end px-4 py-3 border-t border-gray-100`}>
                        <View style={tw`flex-row items-center`}>
                          {searchQuery.length > 0 && (
                            <TouchableOpacity
                              onPress={handleClear}
                              activeOpacity={0.7}
                              style={tw`w-8 h-8 items-center justify-center`}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Ionicons name="close" size={18} color="#6B7280" />
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            onPress={focusInput}
                            style={tw`w-8 h-8 items-center justify-center`}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="mic" size={18} color="#6B7280" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              tw`w-8 h-8 items-center justify-center rounded-full`,
                              { backgroundColor: searchQuery.trim().length > 0 && !isTransitioning ? TURQUOISE : '#E5E7EB' }
                            ]}
                            onPress={handleSearch}
                            activeOpacity={0.8}
                            disabled={!searchQuery.trim() || isTransitioning}
                          >
                            <Ionicons 
                              name={isTransitioning ? 'hourglass' : 'arrow-forward'} 
                              size={16} 
                              color={searchQuery.trim().length > 0 && !isTransitioning ? 'white' : '#9CA3AF'} 
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Animated.View>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* Mobile-optimized Suggestions section */}
              <View style={tw`w-full px-2 mb-5`}>
                <SearchGuidePills
                  onPillPress={handleSearchGuidePillPress}
                  onDateSelect={handleDateSelect}
                  onBudgetSelect={handleBudgetSelect}
                  onGuestsSelect={handleGuestsSelect}
                  onAmenitiesSelect={handleAmenitiesSelect}
                  onStyleSelect={handleStyleSelect}
                />
              </View>
            </Animated.View>

            {/* Content sections - Mobile optimized */}
            <View style={tw`flex-1 w-full px-2`}>
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

              {/* Search Query Carousels Section - Mobile optimized */}
              <View style={tw`mb-2`}>
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

                {/* Render each carousel with its specific data */}
                {searchQueryCarousels.map((carousel, index) => {
                  const isLast = index === searchQueryCarousels.length - 1;
                  return (
                    <View
                      key={`${carousel.searchQuery}-${index}`}
                      style={[tw`${isLast ? '' : 'mb-4'}`]}
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

            {/* Bottom padding for mobile keyboards */}
            <View style={tw`h-20`} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  ); 
};

export default InitialSearchScreen;