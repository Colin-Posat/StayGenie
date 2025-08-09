// AISearchOverlay.tsx - Fixed to prevent auto-refetch on manual typing
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

const BASE_URL = 'http://localhost:3003';

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
  
  // REMOVED: isInternallyLoading and internal suggestions fetching
  const [isInternallyLoading, setIsInternallyLoading] = useState(false);
  const isLoadingSuggestions = isExternallyLoading || isInternallyLoading;
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  // Track if suggestions have been loaded for this session
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);

  // Animated values for loading dots
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  // Animated loading dots effect
  useEffect(() => {
    if (isLoadingSuggestions) {
      const animateDot = (dotAnim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(dotAnim, {
              toValue: 1,
              duration: 600,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(dotAnim, {
              toValue: 0,
              duration: 600,
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

  // UPDATED: Only fetch suggestions ONCE when overlay opens (if no preloaded suggestions)
  useEffect(() => {
    if (visible && preloadedSuggestions.length === 0 && !suggestionsLoaded) {
      console.log('🤖 Fetching suggestions once for overlay session...');
      fetchAISuggestionsOnce(currentSearch);
    }
  }, [visible, preloadedSuggestions.length, suggestionsLoaded]);

  // REMOVED: Auto-fetch on search text changes
  // No longer fetch new suggestions when user types manually

  // Reset when overlay opens
  useEffect(() => {
    if (visible) {
      setOriginalSearch(currentSearch);
      setSearchText(currentSearch);
      setUsedSuggestions(new Set());
      
      // Reset suggestions loaded state if we're starting fresh
      if (preloadedSuggestions.length === 0) {
        setSuggestionsLoaded(false);
      }
    } else {
      // Reset suggestions loaded state when overlay closes
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

  // UPDATED: Simple search text change handler (no auto-fetch)
  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
    // No auto-fetching - user can manually refetch if needed
  }, []);

  // NEW: Manual refresh function for suggestions
  const handleRefreshSuggestions = useCallback(async () => {
    console.log('🔄 Manual refresh of AI suggestions requested...');
    await fetchAISuggestionsOnce(searchText);
  }, [searchText]);

  // UPDATED: Renamed and simplified fetch function (called only once per session)
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

  // Generate fallback suggestions
  const generateFallbackSuggestions = useCallback((searchQuery: string): AISuggestion[] => {
    const query = searchQuery.toLowerCase();
    const suggestionTexts: string[] = [];

    // Budget suggestions
    if (!query.includes('$') && !query.includes('budget')) {
      suggestionTexts.push('under $150 per night', 'under $300 per night');
    }

    // Guest count
    if (!query.includes('people') && !query.includes('guest')) {
      suggestionTexts.push('for 2 people', 'for 4+ people');
    }

    // Location based
    if (query.includes('beach')) {
      suggestionTexts.push('with ocean view', 'walking distance to beach');
    } else if (query.includes('city') || query.includes('downtown')) {
      suggestionTexts.push('in walkable area', 'near public transport');
    } else {
      suggestionTexts.push('in city center', 'in quiet area');
    }

    // Amenities
    if (!query.includes('wifi') && !query.includes('breakfast')) {
      suggestionTexts.push('with free WiFi', 'with free breakfast');
    }
    
    if (!query.includes('pool') && !query.includes('parking')) {
      suggestionTexts.push('with pool access', 'with free parking');
    }

    // Quality
    if (!query.includes('rating') && !query.includes('star')) {
      suggestionTexts.push('with 4+ star rating', 'with recent positive reviews');
    }

    // Flexibility
    if (!query.includes('cancel')) {
      suggestionTexts.push('with free cancellation');
    }

    // Default suggestions for empty search
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

  const handleMicrophonePress = useCallback(() => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
      }, 3000);
    }
  }, [isListening]);

  // Get category icon
  const getCategoryIcon = (category?: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'budget': return 'card-outline';
      case 'amenities': return 'wifi-outline';
      case 'location': return 'location-outline';
      case 'experience': return 'star-outline';
      case 'property-type': return 'business-outline';
      case 'guest-needs': return 'people-outline';
      default: return 'add';
    }
  };

  // Get priority color
  const getPriorityColor = (priority?: string): string => {
    switch (priority) {
      case 'high': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'low': return '#6B7280';
      default: return '#6B7280';
    }
  };

  // Filter out used suggestions
  const availableSuggestions = suggestions.filter(suggestion => !usedSuggestions.has(suggestion.id));

  // Enhanced loading component
  const LoadingComponent = () => (
    <View style={tw`flex-row items-center justify-center py-8`}>
      <View style={tw`flex-row items-center bg-gray-50 px-4 py-3 rounded-full border border-gray-200`}>
        <View style={tw`flex-row items-center mr-3`}>
          <Animated.View
            style={[
              tw`w-2 h-2 rounded-full bg-gray-500 mr-1`,
              {
                opacity: dot1Anim,
                transform: [{
                  scale: dot1Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                }],
              },
            ]}
          />
          <Animated.View
            style={[
              tw`w-2 h-2 rounded-full bg-gray-500 mr-1`,
              {
                opacity: dot2Anim,
                transform: [{
                  scale: dot2Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                }],
              },
            ]}
          />
          <Animated.View
            style={[
              tw`w-2 h-2 rounded-full bg-gray-500`,
              {
                opacity: dot3Anim,
                transform: [{
                  scale: dot3Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                }],
              },
            ]}
          />
        </View>
        <Text style={tw`text-sm font-medium text-gray-700`}>
          {isExternallyLoading ? 'AI is crafting suggestions...' : 'Loading suggestions...'}
        </Text>
        <Ionicons name="sparkles" size={16} color="#3B82F6" style={tw`ml-2`} />
      </View>
    </View>
  );

  if (!isVisible) {
    return null;
  }

  const displayError = externalSuggestionsError || suggestionsError;

  return (
    <View style={tw`absolute inset-0 z-50`}>
      {/* Backdrop */}
      <Animated.View
        style={[
          tw`absolute inset-0 bg-black/60`,
          { opacity: fadeAnim }
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
          tw`bg-white px-4 pt-6 pb-4 rounded-t-3xl`,
          { 
            height: screenHeight * 0.75,
            maxHeight: screenHeight * 0.85,
            minHeight: 400
          }
        ]}>
          
          {/* Fixed Header */}
          <View style={tw`items-center mb-4`}>
            <Text style={tw`text-xl font-bold text-gray-900`}>
              Refine Your Search
            </Text>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            style={tw`flex-1`}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={tw`pb-4`}
          >
            {/* Search Box */}
            <View style={tw`bg-gray-50 rounded-xl border border-gray-200 mb-4`}>
              <View style={tw`p-4`}>
                <Text style={tw`text-xs text-gray-600 mb-3`}>Current Search:</Text>
                <View style={tw`flex-row items-center`}>
                  <View style={tw`mr-3`}>
                    <Ionicons
                      name="search"
                      size={16}
                      color="#9CA3AF"
                    />
                  </View>
                  <View style={tw`flex-1`}>
                    <TextInput
                      style={[
                        tw`text-sm text-gray-900 font-medium`,
                        { 
                          lineHeight: Platform.OS === 'ios' ? 20 : 22,
                          paddingVertical: 0, 
                          minHeight: 20,
                          maxHeight: 100,
                        }
                      ]}
                      value={searchText}
                      onChangeText={handleSearchTextChange}
                      placeholder="Enter your search criteria..."
                      placeholderTextColor="#9CA3AF"
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
                        size={16}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* AI Suggestions */}
            <View style={tw`mb-6`}>
              <View style={tw`flex-row items-center justify-between mb-4`}>
                <View style={tw`flex-row items-center`}>
                  <Text style={tw`text-sm font-semibold text-gray-900 mr-2`}>
                    AI Suggestions
                  </Text>
                  <Ionicons name="sparkles" size={14} color="#666666" />
                  {preloadedSuggestions.length > 0 && !isExternallyLoading && (
                    <View style={tw`w-2 h-2 rounded-full bg-green-400 ml-2`} />
                  )}
                </View>
                
                {/* NEW: Manual refresh button */}
                {suggestionsLoaded && !isLoadingSuggestions && (
                  <TouchableOpacity
                    onPress={handleRefreshSuggestions}
                    style={tw`flex-row items-center px-3 py-1.5 rounded-lg bg-gray-100`}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh" size={14} color="#6B7280" />
                    <Text style={tw`text-xs text-gray-600 ml-1`}>Refresh</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Loading State */}
              {isLoadingSuggestions && <LoadingComponent />}
              
              {/* Error State */}
              {displayError && !isLoadingSuggestions && (
                <View style={tw`mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200`}>
                  <Text style={tw`text-xs text-amber-700`}>
                    ⚠️ Using fallback suggestions (AI unavailable)
                  </Text>
                </View>
              )}
              
              {/* Suggestions List */}
              {!isLoadingSuggestions && availableSuggestions.length > 0 && (
                <View style={tw`gap-2`}>
                  {availableSuggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.id}
                      style={tw`flex-row items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-gray-200`}
                      onPress={() => handleSuggestionSelect(suggestion)}
                      activeOpacity={0.7}
                    >
                      <View style={tw`flex-row items-center flex-1 pr-3`}>
                        <View style={tw`w-5 h-5 items-center justify-center mr-3`}>
                          <Ionicons
                            name={getCategoryIcon(suggestion.category)}
                            size={14}
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
                      <View style={tw`w-6 h-6 items-center justify-center`}>
                        <Ionicons
                          name="add"
                          size={16}
                          color="#666666"
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {/* Empty State */}
              {availableSuggestions.length === 0 && !isLoadingSuggestions && suggestionsLoaded && (
                <View style={tw`py-8 items-center`}>
                  <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                  <Text style={tw`text-sm text-gray-500 mt-2 text-center`}>
                    All suggestions applied!
                  </Text>
                  <TouchableOpacity
                    onPress={handleRefreshSuggestions}
                    style={tw`mt-3 px-4 py-2 rounded-lg bg-gray-100`}
                    activeOpacity={0.7}
                  >
                    <Text style={tw`text-xs text-gray-600`}>Get new suggestions</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom Actions - Fixed at bottom */}
          <View style={tw`mt-4 gap-3 border-t border-gray-100 pt-4`}>
            <View style={tw`flex-row gap-3`}>
              <TouchableOpacity
                style={tw`flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 bg-white`}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={tw`text-center text-sm font-semibold text-gray-700`}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={tw`flex-1 py-3 px-4 rounded-xl bg-black`}
                onPress={handleApply}
                activeOpacity={0.8}
              >
                <Text style={tw`text-center text-sm font-semibold text-white`}>
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