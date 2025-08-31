// ConversationalRefineOverlay.tsx - Chat-based search refinement with improved suggestion pills
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Turquoise color constants
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const TURQUOISE_GLOW = '#1df9ff';
const TURQUOISE_SUBTLE = '#f0feff';
const TURQUOISE_BORDER = '#b3f7ff';

// Enhanced suggestion pills with icons and better variety
const ENHANCED_SUGGESTIONS = [
  { text: 'Under $200', query: 'under $200', icon: 'card' as const },
  { text: 'Free Breakfast', query: 'free breakfast', icon: 'restaurant' as const },
  { text: 'Pool', query: 'pool', icon: 'water' as const },
  { text: 'Free Parking', query: 'free parking', icon: 'car' as const },
  { text: 'Pet Friendly', query: 'pet friendly', icon: 'paw' as const },
  { text: 'Free WiFi', query: 'free wifi', icon: 'wifi' as const },
  { text: 'Spa Services', query: 'with spa', icon: 'flower' as const },
  { text: 'Gym Access', query: 'with gym', icon: 'fitness' as const },
  { text: 'Free Cancellation', query: 'free cancellation', icon: 'checkmark-circle' as const },
  { text: 'Downtown', query: 'downtown area', icon: 'business' as const },
  { text: 'Near Beach', query: 'near beach', icon: 'sunny' as const },
  { text: 'King Bed', query: 'king bed room', icon: 'bed' as const },
];

interface ChatMessage {
  id: string;
  type: 'ai' | 'user';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface HighlightedTextPart {
  text: string;
  isHighlighted: boolean;
  id: string;
}

interface ConversationalRefineOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSearchUpdate: (newSearch: string) => void;
  currentSearch: string;
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
    amenities?: string[];
    preferences?: string[];
    resultCount?: number;
  };
}

//const BASE_URL = 'https://staygenie-wwpa.onrender.com';
const BASE_URL = 'http://localhost:3003';

const ConversationalRefineOverlay: React.FC<ConversationalRefineOverlayProps> = ({
  visible,
  onClose,
  onSearchUpdate,
  currentSearch,
  searchContext,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  
  const [searchText, setSearchText] = useState(currentSearch);
  const [originalSearch, setOriginalSearch] = useState(currentSearch);
  const [searchParts, setSearchParts] = useState<HighlightedTextPart[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isVisible, setIsVisible] = useState(visible);
  const [isAITyping, setIsAITyping] = useState(false);
  const [isSearchUpdating, setIsSearchUpdating] = useState(false);
  const [conversationId] = useState(() => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if search has changed from original
  const hasSearchChanged = searchText.trim() !== originalSearch.trim();

  // Get contextual suggestions based on current search
  const getContextualSuggestions = useCallback(() => {
    const search = searchText.toLowerCase();
    const usedSuggestions = new Set<string>();
    const suggestions = [];

    // Filter out already used suggestions
    for (const suggestion of ENHANCED_SUGGESTIONS) {
      const isAlreadyUsed = search.includes(suggestion.query.toLowerCase()) ||
                           search.includes(suggestion.text.toLowerCase());
      
      if (!isAlreadyUsed && !usedSuggestions.has(suggestion.query)) {
        suggestions.push(suggestion);
        usedSuggestions.add(suggestion.query);
        
        // Limit to 6-8 suggestions for better UX
        if (suggestions.length >= 8) break;
      }
    }

    return suggestions;
  }, [searchText]);

  // Initialize search parts
  const initializeSearchParts = useCallback((text: string) => {
    setSearchParts([{
      text,
      isHighlighted: false,
      id: `part_${Date.now()}`
    }]);
  }, []);

  // Highlight new text parts
  const highlightNewText = useCallback((newText: string, speed: number = 1000) => {
    const currentText = searchText;
    
    setIsSearchUpdating(true);
    
    // Find the difference between old and new text
    if (newText.length > currentText.length) {
      // Text was added
      const addedText = newText.slice(currentText.length);
      
      // Update search text immediately
      setSearchText(newText);
      
      // Create parts: existing text + new highlighted text
      const parts: HighlightedTextPart[] = [];
      
      if (currentText.length > 0) {
        parts.push({
          text: currentText,
          isHighlighted: false,
          id: `existing_${Date.now()}`
        });
      }
      
      if (addedText.length > 0) {
        parts.push({
          text: addedText,
          isHighlighted: true,
          id: `new_${Date.now()}`
        });
      }
      
      setSearchParts(parts);
      
      // Remove highlight after delay
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      
      highlightTimeoutRef.current = setTimeout(() => {
        setSearchParts([{
          text: newText,
          isHighlighted: false,
          id: `final_${Date.now()}`
        }]);
        setIsSearchUpdating(false);
      }, speed);
      
    } else {
      // Text was replaced or shortened
      setSearchText(newText);
      setSearchParts([{
        text: newText,
        isHighlighted: false,
        id: `replaced_${Date.now()}`
      }]);
      setIsSearchUpdating(false);
    }
  }, [searchText]);

  // Cleanup highlight timeout on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Handle visibility animations
  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      setSearchText(currentSearch);
      setOriginalSearch(currentSearch);
      initializeSearchParts(currentSearch);
      
      // Initialize conversation
      initializeConversation();
      
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
          setChatMessages([]);
          setUserInput('');
          if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
          }
        }
      });
    }
  }, [visible, fadeAnim, slideAnim, currentSearch, initializeSearchParts]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages]);

  const initializeConversation = useCallback(async () => {
    const resultCount = searchContext?.resultCount || 0;
    const location = searchContext?.location || 'your search area';
    
    const welcomeMessage: ChatMessage = {
      id: `ai_${Date.now()}`,
      type: 'ai',
      text: `I found ${resultCount} hotels for "${currentSearch}". Use the suggestions below or tell me how you'd like to refine your search.`,
      timestamp: new Date(),
    };
    
    setChatMessages([welcomeMessage]);
  }, [currentSearch, searchContext]);

  // Enhanced suggestion pill component with contextual suggestions
  const EnhancedSuggestionPills = ({ 
    onPillPress 
  }: { 
    onPillPress: (suggestion: { text: string; query: string; icon: string }) => void 
  }) => {
    const suggestions = getContextualSuggestions();

    if (suggestions.length === 0) {
      return null;
    }

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={tw`mb-3`}
        contentContainerStyle={tw`pl-0 pr-4 gap-2`}
        scrollEnabled={!isSearchUpdating}
      >
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={[
              tw`flex-row items-center px-3 py-2 rounded-full`,
              {
                minHeight: 36,
                backgroundColor: TURQUOISE_SUBTLE,
                borderColor: TURQUOISE_BORDER,
                borderWidth: 1,
                opacity: isSearchUpdating ? 0.7 : 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 2,
                elevation: 2,
              }
            ]}
            onPress={() => onPillPress(suggestion)}
            activeOpacity={0.7}
            disabled={isSearchUpdating}
          >
            <Ionicons
              name={suggestion.icon}
              size={14}
              color="#4B5563"
              style={tw`mr-1`}
            />
            <Text
              style={[
                tw`text-xs font-medium`,
                { color: '#4B5563' }
              ]}
              numberOfLines={1}
            >
              {suggestion.text}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const handlePillPress = useCallback((suggestion: { text: string; query: string; icon: string }) => {
    // Add the pill's query to the current search
    const newSearch = searchText.trim() 
      ? `${searchText} ${suggestion.query}`
      : suggestion.query;
    
    // Highlight the new text
    highlightNewText(newSearch, 1200);
    
    // Add a user message to chat showing what was added
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      text: suggestion.text,
      timestamp: new Date(),
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    
    // Add AI acknowledgment
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        text: `Perfect! I've added "${suggestion.text}" to your search. Anything else you'd like to include?`,
        timestamp: new Date(),
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
    }, 800);
  }, [searchText, highlightNewText]);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      text: message.trim(),
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsAITyping(true);

    try {
      // Call AI refinement endpoint
      const response = await fetch(`${BASE_URL}/api/hotels/conversational-refine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          userMessage: message.trim(),
          currentSearch: searchText,
          searchContext,
          chatHistory: chatMessages.slice(-6), // Send last 6 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Add AI response first
        const aiMessage: ChatMessage = {
          id: `ai_${Date.now()}`,
          type: 'ai',
          text: data.aiResponse,
          timestamp: new Date(),
        };

        setChatMessages(prev => [...prev, aiMessage]);

        // Then highlight search text update if AI refined it
        if (data.refinedSearch && data.refinedSearch !== searchText) {
          setTimeout(() => {
            highlightNewText(data.refinedSearch, 1500); // 1.5s highlight duration
          }, 500); // Wait 500ms after AI message appears
        }
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }

    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      
      // Fallback AI response
      const fallbackResponse = generateFallbackResponse(message, searchText);
      
      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        text: fallbackResponse.text,
        timestamp: new Date(),
      };

      setChatMessages(prev => [...prev, aiMessage]);

      // Highlight fallback search update if needed
      if (fallbackResponse.refinedSearch) {
        setTimeout(() => {
          highlightNewText(fallbackResponse.refinedSearch!, 1500);
        }, 500);
      }
    } finally {
      setIsAITyping(false);
    }
  }, [conversationId, searchText, searchContext, chatMessages, highlightNewText]);

  const generateFallbackResponse = useCallback((userMessage: string, currentSearch: string) => {
    const message = userMessage.toLowerCase();
    let refinedSearch = currentSearch;
    let responseText = '';

    // Simple pattern matching for common requests
    if (message.includes('$') || message.includes('budget') || message.includes('price')) {
      const priceMatch = message.match(/\$?(\d+)/);
      if (priceMatch) {
        const price = priceMatch[1];
        if (message.includes('under') || message.includes('less than')) {
          refinedSearch = `${currentSearch} under $${price}`;
          responseText = `Got it! I've updated your search to include hotels under $${price}. Anything else you'd like to add?`;
        } else if (message.includes('over') || message.includes('more than')) {
          refinedSearch = `${currentSearch} over $${price}`;
          responseText = `Perfect! Now looking for hotels over $${price}. Want to add any amenities?`;
        }
      } else {
        responseText = "I'd be happy to help with pricing! Can you specify a budget range, like 'under $200' or 'between $150-300'?";
      }
    } else if (message.includes('breakfast')) {
      refinedSearch = `${currentSearch} with free breakfast`;
      responseText = "Great choice! I've added free breakfast to your search. Want to specify dates or add other amenities?";
    } else if (message.includes('wifi')) {
      refinedSearch = `${currentSearch} with free WiFi`;
      responseText = "Added free WiFi to your search! Need anything else like parking or a pool?";
    } else if (message.includes('pool')) {
      refinedSearch = `${currentSearch} with pool`;
      responseText = "Pool access added! Want to specify indoor/outdoor, or add other amenities?";
    } else if (message.includes('parking')) {
      refinedSearch = `${currentSearch} with free parking`;
      responseText = "Free parking added to your search! Anything else I can help refine?";
    } else if (message.includes('cancel')) {
      refinedSearch = `${currentSearch} with free cancellation`;
      responseText = "Smart choice! Added free cancellation to give you flexibility. What else can I help with?";
    } else if (message.includes('date') || message.includes('check')) {
      responseText = "I can help with dates! Try something like 'check in March 15 check out March 18' or 'staying March 15-18'.";
    } else {
      // Generic fallback
      refinedSearch = `${currentSearch} ${userMessage}`;
      responseText = "I've added that to your search. Want to refine it further with dates, budget, or amenities?";
    }

    return {
      text: responseText,
      refinedSearch: refinedSearch !== currentSearch ? refinedSearch : null,
    };
  }, []);

  const handleSearchTextChange = useCallback((text: string) => {
    // Allow manual editing
    setSearchText(text);
    initializeSearchParts(text);
  }, [initializeSearchParts]);

  const handleApplySearch = useCallback(() => {
    if (hasSearchChanged) {
      onSearchUpdate(searchText);
      onClose();
    }
  }, [searchText, onSearchUpdate, onClose, hasSearchChanged]);

  // Render highlighted text
  const renderHighlightedText = () => {
    return (
      <View style={tw`flex-row flex-wrap`}>
        {searchParts.map((part) => (
          <Animated.Text
            key={part.id}
            style={[
              tw`text-base font-medium`,
              {
                color: part.isHighlighted ? TURQUOISE_DARK : '#111827',
                backgroundColor: part.isHighlighted ? TURQUOISE + '20' : 'transparent',
                borderRadius: part.isHighlighted ? 4 : 0,
                paddingHorizontal: part.isHighlighted ? 2 : 0,
                lineHeight: Platform.OS === 'ios' ? 22 : 24,
              }
            ]}
          >
            {part.text}
          </Animated.Text>
        ))}
      </View>
    );
  };

  const TypingIndicator = () => (
    <View style={tw`flex-row items-center p-4`}>
      <View style={[
        tw`bg-gray-100 rounded-2xl px-4 py-3 flex-row items-center`,
        { maxWidth: screenWidth * 0.7 }
      ]}>
        <View style={tw`flex-row items-center`}>
          <View style={[tw`w-2 h-2 rounded-full bg-gray-400 mr-1`]} />
          <View style={[tw`w-2 h-2 rounded-full bg-gray-400 mr-1`]} />
          <View style={[tw`w-2 h-2 rounded-full bg-gray-400`]} />
        </View>
        <Text style={tw`text-sm text-gray-500 ml-2`}>AI is thinking...</Text>
      </View>
    </View>
  );

  const MessageBubble = ({ message }: { message: ChatMessage }) => {
    const isAI = message.type === 'ai';
    
    return (
      <View style={[
        tw`flex-row items-end mb-4 px-4`,
        isAI ? tw`justify-start` : tw`justify-end`
      ]}>
        {isAI && (
          <View style={[
            tw`w-8 h-8 rounded-full items-center justify-center mr-2`,
            { backgroundColor: TURQUOISE + '15' }
          ]}>
            <Ionicons name="sparkles" size={14} color={TURQUOISE_DARK} />
          </View>
        )}
        
        <View style={[
          tw`rounded-2xl px-4 py-3 max-w-3/4`,
          isAI 
            ? { backgroundColor: '#F8FAFC', borderColor: TURQUOISE + '20' }
            : { backgroundColor: TURQUOISE }
        ]}>
          <Text style={[
            tw`text-sm`,
            isAI ? tw`text-gray-800` : tw`text-white`
          ]}>
            {message.text}
          </Text>
        </View>
        
        {!isAI && (
          <View style={tw`w-8 h-8 rounded-full bg-gray-300 items-center justify-center ml-2`}>
            <Ionicons name="person" size={14} color="#6B7280" />
          </View>
        )}
      </View>
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <View style={tw`absolute inset-0 z-50`}>
      {/* Backdrop */}
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
          onPress={onClose}
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw`flex-1 justify-end`}
        >
          <View style={[
            tw`bg-white rounded-t-3xl`,
            { 
              height: screenHeight * 0.85,
              maxHeight: screenHeight * 0.90,
              minHeight: 500,
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
            
            {/* Header with highlighted search bar */}
            <View style={tw`px-6 pt-4 pb-4 border-b border-gray-100`}>
              <Text style={tw`text-lg font-bold text-gray-900 mb-3`}>
                Refine Your Search
              </Text>
              
              {/* Search Bar with Highlighted Text */}
              <View style={[
                tw`rounded-2xl border-2 bg-white`,
                { 
                  borderColor: isSearchUpdating ? TURQUOISE : TURQUOISE + '30',
                  shadowColor: TURQUOISE,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isSearchUpdating ? 0.15 : 0.05,
                  shadowRadius: 4,
                  elevation: isSearchUpdating ? 4 : 2,
                }
              ]}>
                <View style={tw`p-4`}>
                  <View style={tw`flex-row items-center`}>
                    <Ionicons 
                      name={isSearchUpdating ? "sparkles" : "search"} 
                      size={18} 
                      color={isSearchUpdating ? TURQUOISE : TURQUOISE_DARK} 
                      style={tw`mr-3`} 
                    />
                    <View style={tw`flex-1`}>
                      {searchParts.length > 0 ? (
                        renderHighlightedText()
                      ) : (
                        <TextInput
                          style={[
                            tw`text-base font-medium`,
                            { 
                              color: '#111827',
                              lineHeight: Platform.OS === 'ios' ? 22 : 24,
                              paddingVertical: 0,
                              minHeight: 22,
                              maxHeight: 80,
                            }
                          ]}
                          value={searchText}
                          onChangeText={handleSearchTextChange}
                          placeholder="Your search query will appear here..."
                          placeholderTextColor="#94A3B8"
                          multiline={true}
                          scrollEnabled={false}
                          returnKeyType="done"
                          blurOnSubmit={true}
                        />
                      )}
                    </View>
                    {isSearchUpdating && (
                      <View style={tw`ml-2`}>
                        <Text style={[
                          tw`text-xs font-medium`,
                          { color: TURQUOISE_DARK }
                        ]}>
                          Updated!
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* Chat Messages Area */}
            <View style={tw`flex-1`}>
              <ScrollView
                ref={scrollViewRef}
                style={tw`flex-1`}
                contentContainerStyle={tw`pt-4 pb-2`}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {chatMessages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                
                {isAITyping && <TypingIndicator />}
              </ScrollView>
            </View>

            {/* Chat Input Area */}
            <View style={[
              tw`px-4 py-4 border-t`,
              { borderColor: TURQUOISE + '10' }
            ]}>
              {/* Enhanced Contextual Suggestion Pills - Above Input */}
              <EnhancedSuggestionPills onPillPress={handlePillPress} />

              <View style={tw`flex-row items-end gap-3`}>
                <View style={[
                  tw`flex-1 rounded-2xl border`,
                  { 
                    backgroundColor: '#F8FAFC',
                    borderColor: TURQUOISE + '20',
                    maxHeight: 100,
                  }
                ]}>
                  <TextInput
                    ref={inputRef}
                    style={[
                      tw`px-4 py-3 text-base text-gray-900`,
                      { 
                        lineHeight: Platform.OS === 'ios' ? 20 : 22,
                        minHeight: 44,
                      }
                    ]}
                    value={userInput}
                    onChangeText={setUserInput}
                    placeholder="Refine your search (e.g., 'under $200', '8/12 to 8/18')..."
                    placeholderTextColor="#94A3B8"
                    multiline={true}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      inputRef.current?.blur(); // Dismiss keyboard
                    }}
                    blurOnSubmit={true}
                  />
                </View>
                
                <TouchableOpacity
                  style={[
                    tw`w-12 h-12 rounded-2xl items-center justify-center`,
                    { 
                      backgroundColor: userInput.trim() ? TURQUOISE : '#E5E7EB',
                      shadowColor: userInput.trim() ? TURQUOISE : 'transparent',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: userInput.trim() ? 3 : 0,
                    }
                  ]}
                  onPress={() => {
                    if (userInput.trim()) {
                      inputRef.current?.blur(); // Close keyboard
                      sendMessage(userInput);
                    }
                  }}
                  disabled={!userInput.trim() || isAITyping}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name="send" 
                    size={18} 
                    color={userInput.trim() ? 'white' : '#9CA3AF'} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Apply Search Button with Cancel - Sticky Bottom */}
            <View style={[
              tw`px-6 py-4 border-t`,
              { borderColor: TURQUOISE + '10' }
            ]}>
              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  style={[
                    tw`py-3 px-6 rounded-2xl items-center border-2`,
                    { 
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E5E7EB',
                      flex: 0.4, // Smaller cancel button
                    }
                  ]}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={tw`text-gray-700 text-base font-semibold`}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    tw`py-3 px-6 rounded-2xl items-center`,
                    { 
                      backgroundColor: hasSearchChanged ? TURQUOISE : '#E5E7EB',
                      shadowColor: hasSearchChanged ? TURQUOISE : 'transparent',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: hasSearchChanged ? 0.3 : 0,
                      shadowRadius: 12,
                      elevation: hasSearchChanged ? 8 : 0,
                      flex: 0.6, // Larger apply button
                    }
                  ]}
                  onPress={handleApplySearch}
                  disabled={!hasSearchChanged}
                  activeOpacity={hasSearchChanged ? 0.9 : 1}
                >
                  <Text style={[
                    tw`text-base font-semibold`,
                    { color: hasSearchChanged ? 'white' : '#9CA3AF' }
                  ]}>
                    Apply Search
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

export default ConversationalRefineOverlay;