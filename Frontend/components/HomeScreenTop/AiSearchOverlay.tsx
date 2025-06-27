// AISearchOverlay.tsx - Simplified Version
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AISuggestion {
  id: string;
  text: string;
}

interface AISearchOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSearchUpdate: (newSearch: string) => void;
  currentSearch: string;
}

const AISearchOverlay: React.FC<AISearchOverlayProps> = ({
  visible,
  onClose,
  onSearchUpdate,
  currentSearch,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  
  const [searchText, setSearchText] = useState(currentSearch);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [originalSearch, setOriginalSearch] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isVisible, setIsVisible] = useState(visible);

  // Generate suggestions based on search text
  const generateSuggestions = useCallback((searchQuery: string): AISuggestion[] => {
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
        id: `default-${index}`,
        text
      }));
    }

    // Take first 6 unique suggestions
    const uniqueTexts = [...new Set(suggestionTexts)].slice(0, 6);
    
    return uniqueTexts.map((text, index) => ({
      id: `suggestion-${index}-${Date.now()}`,
      text
    }));
  }, []);

  // Set initial suggestions when overlay opens
  useEffect(() => {
    if (visible) {
      const initialSuggestions = generateSuggestions(searchText);
      setSuggestions(initialSuggestions);
    }
  }, [visible]);

  // Reset when overlay opens
  useEffect(() => {
    if (visible) {
      setOriginalSearch(currentSearch); // Store the original first
      setSearchText(currentSearch);
    }
  }, [visible, currentSearch]);

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
    // Don't call onSearchUpdate here - only update local state
  }, []);

  const handleSuggestionSelect = useCallback((suggestion: AISuggestion) => {
    // Simply add suggestion to search text (local state only)
    const updatedSearch = searchText.trim() 
      ? `${searchText} ${suggestion.text}`
      : suggestion.text;
    
    setSearchText(updatedSearch);
    // Don't call onSearchUpdate here - only update local state
  }, [searchText]);

  const handleApply = useCallback(() => {
    // Only update parent state when Apply is pressed
    onSearchUpdate(searchText);
    onClose();
  }, [searchText, onSearchUpdate, onClose]);

  const handleCancel = useCallback(() => {
    setSearchText(originalSearch);
    onSearchUpdate(originalSearch);
    onClose();
  }, [originalSearch, onSearchUpdate, onClose]);

  const handleMicrophonePress = useCallback(() => {
    if (isListening) {
      // Stop listening if currently listening
      setIsListening(false);
    } else {
      // Start listening
      setIsListening(true);
      
      // Mock listening for 3 seconds (auto-stop)
      setTimeout(() => {
        setIsListening(false);
      }, 3000);
    }
  }, [isListening]);

  if (!isVisible) {
    return null;
  }

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
        <View style={[tw`bg-white px-6 pt-8 pb-6 rounded-t-3xl`, { height: screenHeight * 0.65 }]}>
          
          {/* Fixed Header */}
          <View style={tw`items-center mb-6`}>
            <Text style={tw`text-xl font-bold text-gray-900`}>
              Refine Your Search
            </Text>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            style={tw`flex-1`}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Search Box */}
            <View style={tw`bg-gray-50 rounded-xl border border-gray-200 mb-4`}>
              <View style={tw`p-4`}>
                <Text style={tw`text-xs text-gray-600 mb-3`}>Current Search:</Text>
                <View style={tw`flex-row`}>
                  <View style={tw`w-7 pt-1`}>
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
                        { lineHeight: 20, paddingVertical: 0, minHeight: 20 }
                      ]}
                      value={searchText}
                      onChangeText={handleSearchTextChange}
                      placeholder="Enter your search criteria..."
                      placeholderTextColor="#9CA3AF"
                      multiline={true}
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={() => {
                        // Optionally dismiss keyboard or perform search
                      }}
                    />
                  </View>
                  <View style={tw`w-8 pt-1 items-center`}>
                    {searchText.length > 0 && (
                      <TouchableOpacity
                        onPress={() => handleSearchTextChange('')}
                        style={tw`p-1`}
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
            </View>

            {/* Voice Input Button - Now under search box */}
            <View style={tw`items-center mb-8`}>
              <TouchableOpacity
                style={[
                  tw`w-16 h-16 rounded-full items-center justify-center border-2`,
                  isListening 
                    ? tw`bg-red-500 border-red-500` 
                    : tw`bg-gray-50 border-gray-300`
                ]}
                onPress={handleMicrophonePress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isListening ? "stop" : "mic"}
                  size={24}
                  color={isListening ? "white" : "#666666"}
                />
              </TouchableOpacity>
              
              {isListening && (
                <Text style={tw`text-sm text-red-500 font-medium mt-2`}>
                  Listening...
                </Text>
              )}
            </View>

            {/* AI Suggestions */}
            <View style={tw`mb-8`}>
              <View style={tw`flex-row items-center mb-4`}>
                <Text style={tw`text-sm font-semibold text-gray-900 mr-2`}>
                  AI Suggestions
                </Text>
                <Ionicons name="sparkles" size={14} color="#666666" />
              </View>
              
              <View style={tw`flex-row flex-wrap gap-2`}>
                {suggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    style={tw`flex-row items-center px-3 py-2 rounded-full border bg-gray-50 border-gray-300`}
                    onPress={() => handleSuggestionSelect(suggestion)}
                    activeOpacity={0.7}
                  >
                    <Text style={tw`text-xs font-medium mr-1 text-gray-700`}>
                      {suggestion.text}
                    </Text>
                    <Ionicons
                      name="add"
                      size={12}
                      color="#666666"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Add some bottom padding for scroll */}
            <View style={tw`h-20`} />
          </ScrollView>

          {/* Bottom Actions - Fixed at bottom */}
          <View style={tw`mt-6 gap-4 border-t border-gray-100 pt-6`}>
            <View style={tw`flex-row gap-4`}>
              <TouchableOpacity
                style={tw`flex-1 py-4 px-6 rounded-xl border-2 border-gray-200 bg-white`}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={tw`text-center text-sm font-semibold text-gray-700`}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={tw`flex-1 py-4 px-6 rounded-xl bg-black`}
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