// ConversationalRefineOverlay.tsx — Centered compact popup styled to match HotelChatOverlay
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
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Turquoise color constants (keep in sync with HotelChatOverlay)
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
  onSearchUpdate: (newSearch: string, originalSearch?: string) => void;
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

const BASE_URL = 'https://staygenie-wwpa.onrender.com';
// const BASE_URL = 'http://localhost:3003';

const ConversationalRefineOverlay: React.FC<ConversationalRefineOverlayProps> = ({
  visible,
  onClose,
  onSearchUpdate,
  currentSearch,
  searchContext,
}) => {
  const [searchText, setSearchText] = useState(currentSearch);
  const [originalSearch, setOriginalSearch] = useState(currentSearch);
  const [searchParts, setSearchParts] = useState<HighlightedTextPart[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [isSearchUpdating, setIsSearchUpdating] = useState(false);
  const [conversationId] = useState(() => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Compact + consistent animations (mirror HotelChatOverlay)
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;

  // Compact panel (match HotelChatOverlay vibe)
  const panelWidth = Math.min(screenWidth - 32, 700);
  const panelHeight = Math.min(Math.round(screenHeight * 0.7), 560);

  // State helpers
  const hasSearchChanged = searchText.trim() !== originalSearch.trim();

  const getContextualSuggestions = useCallback(() => {
    const search = searchText.toLowerCase();
    const used = new Set<string>();
    const out = [];
    for (const s of ENHANCED_SUGGESTIONS) {
      const isUsed = search.includes(s.query.toLowerCase()) || search.includes(s.text.toLowerCase());
      if (!isUsed && !used.has(s.query)) {
        out.push(s);
        used.add(s.query);
        if (out.length >= 6) break; // slightly tighter than before (compact)
      }
    }
    return out;
  }, [searchText]);

  const initializeSearchParts = useCallback((text: string) => {
    setSearchParts([{ text, isHighlighted: false, id: `part_${Date.now()}` }]);
  }, []);

  const highlightNewText = useCallback((newText: string, speed: number = 1000) => {
    const currentText = searchText;
    setIsSearchUpdating(true);

    if (newText.length > currentText.length) {
      const addedText = newText.slice(currentText.length);
      setSearchText(newText);

      const parts: HighlightedTextPart[] = [];
      if (currentText.length > 0) {
        parts.push({ text: currentText, isHighlighted: false, id: `existing_${Date.now()}` });
      }
      if (addedText.length > 0) {
        parts.push({ text: addedText, isHighlighted: true, id: `new_${Date.now()}` });
      }
      setSearchParts(parts);

      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = setTimeout(() => {
        setSearchParts([{ text: newText, isHighlighted: false, id: `final_${Date.now()}` }]);
        setIsSearchUpdating(false);
      }, speed);
    } else {
      setSearchText(newText);
      setSearchParts([{ text: newText, isHighlighted: false, id: `replaced_${Date.now()}` }]);
      setIsSearchUpdating(false);
    }
  }, [searchText]);

  useEffect(() => () => {
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
  }, []);

  // Animate + init
  useEffect(() => {
    if (visible) {
      slideAnim.setValue(20);
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.97);

      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 100, friction: 10 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
      ]).start();

      initializeConversation();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 10, duration: 220, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 100, friction: 8 }),
      ]).start(() => {
        // Reset compactly
        setChatMessages([]);
        setUserInput('');
        setSearchText(currentSearch);
        setOriginalSearch(currentSearch);
        initializeSearchParts(currentSearch);
        if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      });
    }
  }, [visible, currentSearch, initializeSearchParts, opacityAnim, scaleAnim, slideAnim]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chatMessages]);

  const initializeConversation = useCallback(() => {
    const welcomeMessage: ChatMessage = {
      id: `ai_${Date.now()}`,
      type: 'ai',
      text: `You searched "${currentSearch}". Use the suggestions below or tell me how you'd like to refine your search.`,
      timestamp: new Date(),
    };
    setChatMessages([welcomeMessage]);
    initializeSearchParts(currentSearch);
    setOriginalSearch(currentSearch);
  }, [currentSearch, initializeSearchParts]);

  // Pills (match HotelChatOverlay style)
  const EnhancedSuggestionPills = ({ onPillPress }: { onPillPress: (s: { text: string; query: string; icon: string }) => void }) => {
    const suggestions = getContextualSuggestions();
    if (suggestions.length === 0) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={tw`mb-2`}
        contentContainerStyle={tw`px-0 gap-2`}
        keyboardShouldPersistTaps="always"
      >
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={[
              tw`flex-row items-center px-3 py-2 rounded-full`,
              { backgroundColor: TURQUOISE_SUBTLE, borderColor: TURQUOISE_BORDER, borderWidth: 1, opacity: isSearchUpdating ? 0.7 : 1 },
            ]}
            onPress={() => onPillPress(suggestion)}
            activeOpacity={0.7}
            disabled={isSearchUpdating}
          >
            <Ionicons name={suggestion.icon} size={12} color="#4B5563" style={tw`mr-1`} />
            <Text style={[tw`text-xs font-medium`, { color: '#4B5563' }]} numberOfLines={1}>
              {suggestion.text}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const handlePillPress = useCallback((s: { text: string; query: string; icon: string }) => {
    const newSearch = searchText.trim() ? `${searchText} ${s.query}` : s.query;
    highlightNewText(newSearch, 1200);

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      text: s.text,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMessage]);

    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        text: `Perfect! I've added "${s.text}" to your search. Anything else you'd like to include?`,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, aiMessage]);
    }, 600);
  }, [searchText, highlightNewText]);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

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
      const response = await fetch(`${BASE_URL}/api/hotels/conversational-refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          userMessage: message.trim(),
          currentSearch: searchText,
          searchContext,
          chatHistory: chatMessages.slice(-6),
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.success) {
        const aiMessage: ChatMessage = {
          id: `ai_${Date.now()}`,
          type: 'ai',
          text: data.aiResponse,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, aiMessage]);

        if (data.refinedSearch && data.refinedSearch !== searchText) {
          setTimeout(() => {
            highlightNewText(data.refinedSearch, 1200);
          }, 400);
        }
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      const fallbackResponse = generateFallbackResponse(message, searchText);

      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        text: fallbackResponse.text,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, aiMessage]);

      if (fallbackResponse.refinedSearch) {
        setTimeout(() => {
          highlightNewText(fallbackResponse.refinedSearch!, 1200);
        }, 400);
      }
    } finally {
      setIsAITyping(false);
    }
  }, [conversationId, searchText, searchContext, chatMessages, highlightNewText]);

  const generateFallbackResponse = useCallback((userMessage: string, currentSearch: string) => {
    const message = userMessage.toLowerCase();
    let refinedSearch = currentSearch;
    let responseText = '';

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
        responseText = "I can help with pricing—try 'under $200' or 'between $150-300'.";
      }
    } else if (message.includes('breakfast')) {
      refinedSearch = `${currentSearch} with free breakfast`;
      responseText = 'Added free breakfast. Want to add parking, pool, or WiFi?';
    } else if (message.includes('wifi')) {
      refinedSearch = `${currentSearch} with free WiFi`;
      responseText = 'Added free WiFi. Anything else?';
    } else if (message.includes('pool')) {
      refinedSearch = `${currentSearch} with pool`;
      responseText = 'Pool added! Indoor or outdoor preference?';
    } else if (message.includes('parking')) {
      refinedSearch = `${currentSearch} with free parking`;
      responseText = 'Free parking added. Keep refining if you like!';
    } else if (message.includes('cancel')) {
      refinedSearch = `${currentSearch} with free cancellation`;
      responseText = 'Free cancellation added. What else can I help with?';
    } else if (message.includes('date') || message.includes('check')) {
      responseText = "Try: 'check in Aug 12 check out Aug 18' or 'Aug 12–18'.";
    } else {
      refinedSearch = `${currentSearch} ${userMessage}`;
      responseText = 'I added that to your search. Want to specify budget, dates, or amenities?';
    }

    return { text: responseText, refinedSearch: refinedSearch !== currentSearch ? refinedSearch : null };
  }, []);

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
    initializeSearchParts(text);
  }, [initializeSearchParts]);

  const handleApplySearch = useCallback(() => {
    if (hasSearchChanged) {
      onSearchUpdate(searchText, originalSearch);
      onClose();
    }
  }, [searchText, onSearchUpdate, onClose, hasSearchChanged]);

  const renderHighlightedText = () => (
    <View style={tw`flex-row flex-wrap`}>
      {searchParts.map((part) => (
        <Animated.Text
          key={part.id}
          style={[
            tw`text-sm font-medium`, // compact text
            {
              color: part.isHighlighted ? TURQUOISE_DARK : '#111827',
              backgroundColor: part.isHighlighted ? TURQUOISE + '20' : 'transparent',
              borderRadius: part.isHighlighted ? 4 : 0,
              paddingHorizontal: part.isHighlighted ? 2 : 0,
              lineHeight: Platform.OS === 'ios' ? 20 : 22,
            },
          ]}
        >
          {part.text}
        </Animated.Text>
      ))}
    </View>
  );

  const TypingIndicator = () => (
    <View style={tw`flex-row items-end mb-3 px-4 justify-start`}>
      <View style={[tw`w-6 h-6 rounded-full items-center justify-center mr-2`, { backgroundColor: TURQUOISE + '15' }]}>
        <Ionicons name="sparkles" size={12} color={TURQUOISE_DARK} />
      </View>
      <View style={[tw`bg-gray-100 rounded-2xl px-3 py-2 flex-row items-center`]}>
        <View style={tw`flex-row items-center`}>
          <View style={[tw`w-1.5 h-1.5 rounded-full bg-gray-400 mr-1`]} />
          <View style={[tw`w-1.5 h-1.5 rounded-full bg-gray-400 mr-1`]} />
          <View style={[tw`w-1.5 h-1.5 rounded-full bg-gray-400`]} />
        </View>
        <Text style={tw`text-xs text-gray-500 ml-2`}>Thinking...</Text>
      </View>
    </View>
  );

  const MessageBubble = ({ message }: { message: ChatMessage }) => {
    const isAI = message.type === 'ai';
    return (
      <View style={[tw`flex-row items-end mb-3 px-4`, isAI ? tw`justify-start` : tw`justify-end`]}>
        {isAI && (
          <View style={[tw`w-6 h-6 rounded-full items-center justify-center mr-2`, { backgroundColor: TURQUOISE + '15' }]}>
            <Ionicons name="sparkles" size={12} color={TURQUOISE_DARK} />
          </View>
        )}
        <View
          style={[
            tw`rounded-2xl px-3 py-2`,
            { maxWidth: screenWidth * 0.65 },
            isAI
              ? { backgroundColor: '#F8FAFC', borderColor: TURQUOISE + '20', borderWidth: 1 }
              : { backgroundColor: TURQUOISE },
          ]}
        >
          <Text style={[tw`text-sm`, isAI ? tw`text-gray-800` : tw`text-white`]}>
            {message.text}
          </Text>
        </View>
        {!isAI && (
          <View style={tw`w-6 h-6 rounded-full bg-gray-300 items-center justify-center ml-2`}>
            <Ionicons name="person" size={12} color="#6B7280" />
          </View>
        )}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        { zIndex: 999999, backgroundColor: 'rgba(0,0,0,0.7)' }, // darkens status/tab bars too
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: opacityAnim }]} pointerEvents="auto">
        {/* Backdrop click to close */}
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />

        {/* Centered panel with keyboard avoidance (consistent with hotel overlay) */}
        <KeyboardAvoidingView
          style={tw`flex-1 justify-center items-center`}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 60}
        >
          <Animated.View style={[{ transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
            <View
              style={[
                tw`bg-white rounded-2xl overflow-hidden`,
                {
                  width: panelWidth,
                  height: panelHeight,
                  shadowColor: TURQUOISE,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.15,
                  shadowRadius: 20,
                },
              ]}
            >
              {/* Header — compact and consistent */}
              <View style={tw`px-4 pt-4 pb-3 border-b border-gray-100`}>
                <View style={tw`flex-row items-center justify-between`}>
                  <Text style={tw`text-base font-bold text-gray-900`} numberOfLines={1}>
                    Refine Your Search
                  </Text>
                  <TouchableOpacity
                    style={[tw`ml-3 w-8 h-8 rounded-full items-center justify-center`, { backgroundColor: TURQUOISE + '10' }]}
                    onPress={onClose}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="close" size={16} color={TURQUOISE_DARK} />
                  </TouchableOpacity>
                </View>

                {/* Compact highlighted search bar */}
                <View
                  style={[
                    tw`mt-3 rounded-xl border bg-white`,
                    {
                      borderColor: isSearchUpdating ? TURQUOISE : TURQUOISE + '30',
                      shadowColor: TURQUOISE,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isSearchUpdating ? 0.12 : 0.04,
                      shadowRadius: 4,
                    },
                  ]}
                >
                  <View style={tw`px-3 py-2 flex-row items-center`}>
                    <Ionicons
                      name={isSearchUpdating ? 'sparkles' : 'search'}
                      size={16}
                      color={isSearchUpdating ? TURQUOISE_DARK : TURQUOISE_DARK}
                      style={tw`mr-2`}
                    />
                    <View style={tw`flex-1`}>
                      {searchParts.length > 0 ? (
                        renderHighlightedText()
                      ) : (
                        <TextInput
                          style={[
                            tw`text-sm font-medium`,
                            {
                              color: '#111827',
                              lineHeight: Platform.OS === 'ios' ? 20 : 22,
                              paddingVertical: 0,
                              minHeight: 20,
                              maxHeight: 80,
                            },
                          ]}
                          value={searchText}
                          onChangeText={handleSearchTextChange}
                          placeholder="Your search will appear here…"
                          placeholderTextColor="#94A3B8"
                          multiline
                          scrollEnabled={false}
                          returnKeyType="done"
                          blurOnSubmit
                        />
                      )}
                    </View>
                    {isSearchUpdating && (
                      <Text style={[tw`text-xs font-medium ml-2`, { color: TURQUOISE_DARK }]}>Updated</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Messages — compact */}
              <View style={tw`flex-1`}>
                <ScrollView
                  ref={scrollViewRef}
                  style={tw`flex-1`}
                  contentContainerStyle={tw`pt-3 pb-2`}
                  keyboardShouldPersistTaps="always"
                  showsVerticalScrollIndicator={false}
                >
                  {chatMessages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))}
                  {isAITyping && <TypingIndicator />}
                </ScrollView>
              </View>

              {/* Input + pills */}
              <View style={[tw`px-4 py-3 border-t border-gray-100`]}>
                <EnhancedSuggestionPills onPillPress={handlePillPress} />

                <View style={tw`flex-row items-end gap-2`}>
                  <View
                    style={[
                      tw`flex-1 rounded-xl border`,
                      { backgroundColor: '#F8FAFC', borderColor: TURQUOISE + '20', maxHeight: 100 },
                    ]}
                  >
                    <TextInput
                      ref={inputRef}
                      style={[
                        tw`px-3 py-2 text-base text-gray-900`,
                        { lineHeight: Platform.OS === 'ios' ? 20 : 20, minHeight: 42 },
                      ]}
                      value={userInput}
                      onChangeText={setUserInput}
                      placeholder="Refine your search (e.g., 'under $200', 'Aug 12–18')…"
                      placeholderTextColor="#94A3B8"
                      multiline
                      returnKeyType="send"
                      onSubmitEditing={() => {
                        inputRef.current?.blur();
                        if (userInput.trim()) sendMessage(userInput);
                      }}
                      blurOnSubmit
                      enablesReturnKeyAutomatically
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      tw`w-12 h-12 rounded-2xl items-center justify-center`,
                      {
                        backgroundColor: userInput.trim() ? TURQUOISE : '#E5E7EB',
                        shadowColor: userInput.trim() ? TURQUOISE : 'transparent',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: userInput.trim() ? 0.2 : 0,
                        shadowRadius: 4,
                        elevation: userInput.trim() ? 3 : 0,
                      },
                    ]}
                    onPress={() => {
                      if (userInput.trim()) {
                        inputRef.current?.blur();
                        sendMessage(userInput);
                      }
                    }}
                    disabled={!userInput.trim() || isAITyping}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="send" size={18} color={userInput.trim() ? 'white' : '#9CA3AF'} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Footer buttons — compact + consistent look */}
              <View style={[tw`px-4 py-3 border-t border-gray-100`]}>
                <View style={tw`flex-row gap-2`}>
                  <TouchableOpacity
                    style={[
                      tw`py-2 px-5 rounded-2xl items-center`,
                      { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderWidth: 2, flex: 0.42 },
                    ]}
                    onPress={onClose}
                    activeOpacity={0.85}
                  >
                    <Text style={tw`text-gray-700 text-base font-semibold`}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      tw`py-2 px-5 rounded-2xl items-center`,
                      {
                        backgroundColor: TURQUOISE,
                        shadowColor: TURQUOISE,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 10,
                        elevation: 6,
                        flex: 0.58,
                        opacity: hasSearchChanged ? 1 : 0.55, // visually same color but disabled feel
                      },
                    ]}
                    onPress={handleApplySearch}
                    disabled={!hasSearchChanged}
                    activeOpacity={hasSearchChanged ? 0.9 : 1}
                  >
                    <Text style={[tw`text-base font-semibold`, { color: 'white' }]}>Apply Search</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

export default ConversationalRefineOverlay;
