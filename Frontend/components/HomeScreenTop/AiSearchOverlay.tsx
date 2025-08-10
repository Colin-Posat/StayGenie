// AISearchOverlay.tsx - Updated with scrollable AI suggestions
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Turquoise color constants
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const TURQUOISE_GLOW = '#1df9ff';

interface AISuggestion {
  id: string;
  text: string;
  category?: string;
  reasoning?: string;
  priority?: string;
}

interface AISearchOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSearchUpdate: (newSearch: string) => void;
  currentSearch: string;
  preloadedSuggestions?: AISuggestion[];
  isLoadingSuggestions?: boolean;
  suggestionsError?: string | null;
  searchContext?: {
    location?: string;
    dates?: {
      checkin: string;
      checkout: string;
    };
    guests?: {
      adults: number;
      children: number;
    };
    budget?: {
      min?: number | null;
      max?: number | null;
      currency?: string;
    };
  };
}

const BASE_URL = 'https://staygenie-wwpa.onrender.com';

const AISearchOverlay: React.FC<AISearchOverlayProps> = ({
  visible,
  onClose,
  onSearchUpdate,
  currentSearch,
  preloadedSuggestions = [],
  isLoadingSuggestions: isExternallyLoading = false,
  suggestionsError: externalSuggestionsError = null,
  searchContext,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  
  const [searchText, setSearchText] = useState(currentSearch);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [usedSuggestions, setUsedSuggestions] = useState<Set<string>>(new Set());
  const [originalSearch, setOriginalSearch] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isVisible, setIsVisible] = useState(visible);
  
  const [isInternallyLoading, setIsInternallyLoading] = useState(false);
  const isLoadingSuggestions = isExternallyLoading || isInternallyLoading;
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);

  // Animated values for loading dots
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  // Enhanced loading dots with turquoise glow
  useEffect(() => {
    if (isLoadingSuggestions) {
      const animateDot = (dotAnim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(dotAnim, {
              toValue: 1,
              duration: 800,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(dotAnim, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const animation = Animated.parallel([
        animateDot(dot1Anim, 0),
        animateDot(dot2Anim, 200),
        animateDot(dot3Anim, 400),
      ]);

      animation.start();

      return () => {
        animation.stop();
        dot1Anim.setValue(0);
        dot2Anim.setValue(0);
        dot3Anim.setValue(0);
      };
    }
  }, [isLoadingSuggestions, dot1Anim, dot2Anim, dot3Anim]);

  // Use pre-loaded suggestions when available
  useEffect(() => {
    if (preloadedSuggestions.length > 0) {
      console.log('🤖 Using pre-loaded AI suggestions:', preloadedSuggestions.length);
      setSuggestions(preloadedSuggestions);
      setSuggestionsError(externalSuggestionsError);
      setSuggestionsLoaded(true);
    }
  }, [preloadedSuggestions, externalSuggestionsError]);

  useEffect(() => {
    if (visible && preloadedSuggestions.length === 0 && !suggestionsLoaded) {
      console.log('🤖 Fetching suggestions once for overlay session...');
      fetchAISuggestionsOnce(currentSearch);
    }
  }, [visible, preloadedSuggestions.length, suggestionsLoaded]);

  // Reset when overlay opens
  useEffect(() => {
    if (visible) {
      setOriginalSearch(currentSearch);
      setSearchText(currentSearch);
      setUsedSuggestions(new Set());
      
      if (preloadedSuggestions.length === 0) {
        setSuggestionsLoaded(false);
      }
    } else {
      setSuggestionsLoaded(false);
    }
  }, [visible, currentSearch, preloadedSuggestions.length]);

  // Handle visibility animations
  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: screenHeight,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsVisible(false);
        }
      });
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  const handleRefreshSuggestions = useCallback(async () => {
    console.log('🔄 Manual refresh of AI suggestions requested...');
    await fetchAISuggestionsOnce(searchText);
  }, [searchText]);

  const fetchAISuggestionsOnce = useCallback(async (searchQuery: string) => {
    try {
      setIsInternallyLoading(true);
      setSuggestionsError(null);
      
      console.log('🤖 Fetching AI suggestions once for overlay session:', searchQuery);

      const response = await fetch(`${BASE_URL}/api/hotels/ai-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentSearch: searchQuery,
          searchContext: searchContext
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.suggestions) {
        console.log(`✅ Received ${data.suggestions.length} AI suggestions for overlay session`);
        setSuggestions(data.suggestions);
        setSuggestionsLoaded(true);
        
        if (data.metadata?.model) {
          console.log(`🤖 Suggestions generated by: ${data.metadata.model}`);
        }
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error: any) {
      console.error('❌ Failed to fetch AI suggestions:', error);
      setSuggestionsError(error.message);
      
      const fallbackSuggestions = generateFallbackSuggestions(searchQuery);
      setSuggestions(fallbackSuggestions);
      setSuggestionsLoaded(true);
    } finally {
      setIsInternallyLoading(false);
    }
  }, [searchContext]);

  const generateFallbackSuggestions = useCallback((searchQuery: string): AISuggestion[] => {
    const query = searchQuery.toLowerCase();
    const suggestionTexts: string[] = [];

    if (!query.includes('$') && !query.includes('budget')) {
      suggestionTexts.push('under $150 per night', 'under $300 per night');
    }

    if (!query.includes('people') && !query.includes('guest')) {
      suggestionTexts.push('for 2 people', 'for 4+ people');
    }

    if (query.includes('beach')) {
      suggestionTexts.push('with ocean view', 'walking distance to beach');
    } else if (query.includes('city') || query.includes('downtown')) {
      suggestionTexts.push('in walkable area', 'near public transport');
    } else {
      suggestionTexts.push('in city center', 'in quiet area');
    }

    if (!query.includes('wifi') && !query.includes('breakfast')) {
      suggestionTexts.push('with free WiFi', 'with free breakfast');
    }
    
    if (!query.includes('pool') && !query.includes('parking')) {
      suggestionTexts.push('with pool access', 'with free parking');
    }

    if (!query.includes('rating') && !query.includes('star')) {
      suggestionTexts.push('with 4+ star rating', 'with recent positive reviews');
    }

    if (!query.includes('cancel')) {
      suggestionTexts.push('with free cancellation');
    }

    if (!query.trim()) {
      const defaultTexts = [
        'under $200 per night',
        'for 2 people', 
        'with free WiFi',
        'in city center',
        'with 4+ star rating',
        'with free breakfast'
      ];
      
      return defaultTexts.map((text, index) => ({
        id: `fallback-${index}`,
        text,
        category: 'general',
        priority: 'medium'
      }));
    }

    const uniqueTexts = [...new Set(suggestionTexts)].slice(0, 6);
    
    return uniqueTexts.map((text, index) => ({
      id: `fallback-${index}-${Date.now()}`,
      text,
      category: 'general',
      priority: 'medium'
    }));
  }, []);

  const handleSuggestionSelect = useCallback((suggestion: AISuggestion) => {
    const updatedSearch = searchText.trim() 
      ? `${searchText} ${suggestion.text}`
      : suggestion.text;
    
    setSearchText(updatedSearch);
    setUsedSuggestions(prev => new Set(prev).add(suggestion.id));
  }, [searchText]);

  const handleApply = useCallback(() => {
    onSearchUpdate(searchText);
    onClose();
  }, [searchText, onSearchUpdate, onClose]);

  const handleCancel = useCallback(() => {
    setSearchText(originalSearch);
    onClose();
  }, [originalSearch, onClose]);

  // Get category icon with turquoise styling
  const getCategoryIcon = (category?: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'budget': return 'card-outline';
      case 'amenities': return 'wifi-outline';
      case 'location': return 'location-outline';
      case 'experience': return 'star-outline';
      case 'property-type': return 'business-outline';
      case 'guest-needs': return 'people-outline';
      default: return 'add-circle-outline';
    }
  };

  // Get priority color with turquoise theme
  const getPriorityColor = (priority?: string): string => {
    switch (priority) {
      case 'high': return TURQUOISE_DARK;
      case 'medium': return TURQUOISE;
      case 'low': return '#94A3B8';
      default: return TURQUOISE;
    }
  };

  const availableSuggestions = suggestions.filter(suggestion => !usedSuggestions.has(suggestion.id));

  // Enhanced loading component with turquoise theme
  const LoadingComponent = () => (
    <View style={tw`flex-row items-center justify-center py-8`}>
      <View style={[
        tw`flex-row items-center px-6 py-4 rounded-2xl border`,
        { 
          backgroundColor: TURQUOISE + '08',
          borderColor: TURQUOISE + '20',
          shadowColor: TURQUOISE,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }
      ]}>
        <View style={tw`flex-row items-center mr-4`}>
          <Animated.View
            style={[
              tw`w-2.5 h-2.5 rounded-full mr-1.5`,
              {
                backgroundColor: TURQUOISE,
                opacity: dot1Anim,
                transform: [{
                  scale: dot1Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1.2],
                  }),
                }],
              },
            ]}
          />
          <Animated.View
            style={[
              tw`w-2.5 h-2.5 rounded-full mr-1.5`,
              {
                backgroundColor: TURQUOISE,
                opacity: dot2Anim,
                transform: [{
                  scale: dot2Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1.2],
                  }),
                }],
              },
            ]}
          />
          <Animated.View
            style={[
              tw`w-2.5 h-2.5 rounded-full`,
              {
                backgroundColor: TURQUOISE,
                opacity: dot3Anim,
                transform: [{
                  scale: dot3Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1.2],
                  }),
                }],
              },
            ]}
          />
        </View>
        <Text style={[tw`text-sm font-medium`, { color: TURQUOISE_DARK }]}>
          {isExternallyLoading ? 'AI is crafting suggestions...' : 'Loading suggestions...'}
        </Text>
        <Ionicons name="sparkles" size={16} color={TURQUOISE} style={tw`ml-2`} />
      </View>
    </View>
  );

  if (!isVisible) {
    return null;
  }

  const displayError = externalSuggestionsError || suggestionsError;

  return (
    <View style={tw`absolute inset-0 z-50`}>
      {/* Backdrop with gradient */}
      <Animated.View
        style={[
          tw`absolute inset-0`,
          { 
            opacity: fadeAnim,
            backgroundColor: 'rgba(0, 0, 0, 0.7)'
          }
        ]}
      >
        <TouchableOpacity
          style={tw`flex-1`}
          onPress={handleCancel}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Overlay Content */}
      <Animated.View
        style={[
          tw`absolute inset-0 justify-end`,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <View style={[
          tw`bg-white rounded-t-3xl`,
          { 
            height: screenHeight * 0.75,
            maxHeight: screenHeight * 0.85,
            minHeight: 400,
            shadowColor: TURQUOISE,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 20,
          }
        ]}>
          
          {/* Handle bar */}
          <View style={tw`items-center pt-3 pb-2`}>
            <View style={[
              tw`w-12 h-1 rounded-full`,
              { backgroundColor: TURQUOISE + '40' }
            ]} />
          </View>
          
          {/* Header with title */}
          <View style={tw`px-6 pt-4 pb-4`}>
            <View style={tw`items-center mb-2`}>
              <Text style={tw`text-xl font-bold text-gray-900`}>
                Refine Your Search
              </Text>
            </View>
          </View>

          {/* Content Container - Fixed layout with separate scrollable areas */}
          <View style={tw`flex-1 px-6`}>
            
            {/* Modern Search Box - Fixed at top */}
            <View style={[
              tw`rounded-2xl border mb-6`,
              { 
                backgroundColor: '#F8FAFC',
                borderColor: TURQUOISE + '20',
              }
            ]}>
              <View style={tw`p-5`}>
                <View style={tw`flex-row items-center`}>
                  <View style={tw`mr-3`}>
                    <Ionicons
                      name="search"
                      size={18}
                      color={TURQUOISE}
                    />
                  </View>
                  <View style={tw`flex-1`}>
                    <TextInput
                      style={[
                        tw`text-base text-gray-900 font-medium`,
                        { 
                          lineHeight: Platform.OS === 'ios' ? 22 : 24,
                          paddingVertical: 0, 
                          minHeight: 22,
                          maxHeight: 120,
                        }
                      ]}
                      value={searchText}
                      onChangeText={handleSearchTextChange}
                      placeholder="Enter your search criteria..."
                      placeholderTextColor="#94A3B8"
                      multiline={true}
                      scrollEnabled={false}
                      returnKeyType="done"
                      blurOnSubmit={true}
                    />
                  </View>
                  {searchText.length > 0 && (
                    <TouchableOpacity
                      onPress={() => handleSearchTextChange('')}
                      style={tw`p-2 ml-2`}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color="#94A3B8"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* AI Suggestions Section - Fills remaining space */}
            <View style={tw`flex-1 mb-4`}>
              {/* Header for suggestions - Fixed */}
              <View style={tw`flex-row items-center justify-between mb-4`}>
                <View style={tw`flex-row items-center`}>
                  <Text style={tw`text-lg font-bold text-gray-900 mr-2`}>
                    AI Suggestions
                  </Text>
                  <Ionicons name="sparkles" size={16} color={TURQUOISE} />
                  {preloadedSuggestions.length > 0 && !isExternallyLoading && (
                    <View style={[
                      tw`w-2 h-2 rounded-full ml-2`,
                      { backgroundColor: TURQUOISE }
                    ]} />
                  )}
                </View>
                
              </View>
              
              {/* Scrollable Suggestions Content */}
              <View style={tw`flex-1`}>
                {/* Loading State */}
                {isLoadingSuggestions && <LoadingComponent />}
                
                {/* Error State with turquoise accent */}
                {displayError && !isLoadingSuggestions && (
                  <View style={[
                    tw`mb-4 p-4 rounded-xl border`,
                    { 
                      backgroundColor: '#FEF3CD',
                      borderColor: '#F59E0B',
                    }
                  ]}>
                    <Text style={tw`text-sm text-amber-700`}>
                      ⚠️ Using fallback suggestions (AI temporarily unavailable)
                    </Text>
                  </View>
                )}
                
                {/* Scrollable Suggestions List */}
                {!isLoadingSuggestions && availableSuggestions.length > 0 && (
                  <ScrollView
                    style={tw`flex-1 mr-1`}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={tw`gap-3 pb-2 pr-2`}
                    nestedScrollEnabled={true}
                  >
                    {availableSuggestions.map((suggestion) => (
                      <TouchableOpacity
                        key={suggestion.id}
                        style={[
                          tw`flex-row items-center justify-between p-4 rounded-2xl border`,
                          { 
                            backgroundColor: '#FFFFFF',
                            borderColor: TURQUOISE + '15',
                            shadowColor: TURQUOISE,
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 4,
                            elevation: 2,
                          }
                        ]}
                        onPress={() => handleSuggestionSelect(suggestion)}
                        activeOpacity={0.8}
                      >
                        <View style={tw`flex-row items-center flex-1 pr-3`}>
                          <View style={[
                            tw`w-8 h-8 items-center justify-center mr-3 rounded-xl`,
                            { backgroundColor: getPriorityColor(suggestion.priority) + '15' }
                          ]}>
                            <Ionicons
                              name={getCategoryIcon(suggestion.category)}
                              size={16}
                              color={getPriorityColor(suggestion.priority)}
                            />
                          </View>
                          <Text 
                            style={tw`text-sm font-medium text-gray-800 flex-1`}
                            numberOfLines={2}
                          >
                            {suggestion.text}
                          </Text>
                        </View>
                        <View style={[
                          tw`w-7 h-7 items-center justify-center rounded-full`,
                          { backgroundColor: TURQUOISE + '15' }
                        ]}>
                          <Ionicons
                            name="add"
                            size={16}
                            color={TURQUOISE_DARK}
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                
                {/* Modern Empty State */}
                {availableSuggestions.length === 0 && !isLoadingSuggestions && suggestionsLoaded && (
                  <View style={tw`py-12 items-center`}>
                    <View style={[
                      tw`w-16 h-16 rounded-2xl items-center justify-center mb-4`,
                      { backgroundColor: TURQUOISE + '15' }
                    ]}>
                      <Ionicons name="checkmark-circle" size={28} color={TURQUOISE_DARK} />
                    </View>
                    <Text style={tw`text-base font-semibold text-gray-900 mb-2`}>
                      All Set!
                    </Text>
                    <Text style={tw`text-sm text-gray-500 text-center mb-4`}>
                      All suggestions have been applied to your search
                    </Text>
                    <TouchableOpacity
                      onPress={handleRefreshSuggestions}
                      style={[
                        tw`px-5 py-3 rounded-xl`,
                        { backgroundColor: TURQUOISE + '10' }
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[tw`text-sm font-medium`, { color: TURQUOISE_DARK }]}>
                        Get New Suggestions
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Modern Bottom Actions - Fixed at bottom */}
          <View style={[
            tw`px-6 py-5 border-t`,
            { borderColor: TURQUOISE + '10' }
          ]}>
            <View style={tw`flex-row gap-4`}>
              <TouchableOpacity
                style={[
                  tw`flex-1 py-4 px-4 rounded-2xl border-2`,
                  { 
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E5E7EB',
                  }
                ]}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <Text style={tw`text-center text-base font-semibold text-gray-700`}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  tw`flex-1 py-4 px-4 rounded-2xl shadow-lg`,
                  { 
                    backgroundColor: TURQUOISE,
                    shadowColor: TURQUOISE,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 8,
                  }
                ]}
                onPress={handleApply}
                activeOpacity={0.9}
              >
                <Text style={tw`text-center text-base font-semibold text-white`}>
                  Apply Search
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

export default AISearchOverlay;