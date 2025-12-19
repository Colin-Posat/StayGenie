// HotelChatOverlay.tsx — Centered fullscreen popup (matches ConversationalRefineOverlay behavior)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback, 
} from 'react-native';
import { Text } from '../../components/CustomText'; 
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import type { EnhancedHotel } from '../StoryView/SwipeableHotelStoryCard';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Turquoise color constants - keep in sync with ConversationalRefineOverlay
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const TURQUOISE_GLOW = '#1df9ff';
const TURQUOISE_SUBTLE = '#f0feff';
const TURQUOISE_BORDER = '#b3f7ff';

// Common hotel questions as suggestion pills
const HOTEL_QUESTION_SUGGESTIONS = [
  { text: 'Check-in/out', query: 'What are the check-in and check-out times?', icon: 'time' as const },
  { text: 'Amenities', query: 'What amenities does this hotel offer?', icon: 'list' as const },
  { text: 'Location info', query: 'Tell me about the location', icon: 'location' as const },
  { text: 'Breakfast', query: 'Do they have breakfast included?', icon: 'restaurant' as const },
  { text: 'Parking', query: 'Is parking available and free?', icon: 'car' as const },
  { text: 'WiFi', query: 'Do they have free WiFi?', icon: 'wifi' as const },
  { text: 'Pool & spa', query: 'Tell me about the pool and spa facilities', icon: 'water' as const },
  { text: 'Pet policy', query: 'Are pets allowed?', icon: 'paw' as const },
  { text: 'Reviews', query: 'What do guests typically say about this hotel?', icon: 'chatbubbles' as const },
];

interface ChatMessage {
  id: string;
  type: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

interface HotelChatOverlayProps {
  visible: boolean;
  onClose: () => void;
  hotel: EnhancedHotel;
}

//const BASE_URL = __DEV__ ? 'http://localhost:3003' : "https://staygenie-wwpa.onrender.com";
const BASE_URL = 'https://staygenie-wwpa.onrender.com';
const HotelChatOverlay: React.FC<HotelChatOverlayProps> = ({
  visible,
  onClose,
  hotel,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [contextReady, setContextReady] = useState(false);
  const [enrichedHotel, setEnrichedHotel] = useState<EnhancedHotel>(hotel);
  const [conversationId] = useState(() => `chat_${Date.now()}`);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const inputTextRef = useRef('');

  // Animations — mirror ConversationalRefineOverlay
  const slideAnim = useRef(new Animated.Value(20)).current;   // small vertical offset
  const opacityAnim = useRef(new Animated.Value(0)).current;  // fade
  const scaleAnim  = useRef(new Animated.Value(0.97)).current; // tiny scale pop

  // Panel dimensions — mirror ConversationalRefineOverlay
  const panelWidth = Math.min(screenWidth - 32, 700);
  const panelHeight = Math.min(Math.round(screenHeight * 0.6), 560);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Contextual suggestions (avoid repeating user-asked items)
  const getContextualSuggestions = useCallback(() => {
    const usedQueries = new Set(
      messages.filter(m => m.type === 'user').map(m => m.text.toLowerCase())
    );
    return HOTEL_QUESTION_SUGGESTIONS.filter(s =>
      !usedQueries.has(s.query.toLowerCase()) &&
      !Array.from(usedQueries).some(used =>
        used.includes(s.text.toLowerCase()) || s.query.toLowerCase().includes(used)
      )
    ).slice(0, 4);
  }, [messages]);

  // Animate in/out + initialize
  useEffect(() => {
    if (!visible) return;

    // Start slightly below center
    slideAnim.setValue(20);
    opacityAnim.setValue(0);
    scaleAnim.setValue(0.97);

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();

    initializeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Reset state when closed
  useEffect(() => {
    if (visible) return;
    setMessages([]);
    setInputText('');
    setContextReady(false);
    setIsLoading(false);
    setIsTyping(false);
    setEnrichedHotel(hotel);
  }, [visible, hotel]);

  const initializeChat = async () => {
    setIsLoading(true);

    const welcomeMsg: ChatMessage = {
      id: `welcome_${Date.now()}`,
      type: 'ai',
      text: `Hi! I'm loading information about ${hotel.name}. This will just take a moment...`,
      timestamp: new Date(),
    };
    setMessages([welcomeMsg]);

    try {
      const response = await fetch(`${BASE_URL}/api/hotels/fetch-details-for-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: hotel.id,
          hotelName: hotel.name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEnrichedHotel({ ...hotel, allHotelInfo: data.allHotelInfo });
          setContextReady(true);

          const readyMsg: ChatMessage = {
            id: `ready_${Date.now()}`,
            type: 'ai',
            text: `I'm ready to help you with any questions about ${hotel.name}. What would you like to know?`,
            timestamp: new Date(),
          };
          setMessages([readyMsg]);
        } else {
          throw new Error('Fetch details returned success=false');
        }
      } else {
        throw new Error('Failed to fetch details');
      }
    } catch (error) {
      console.error('Failed to load hotel context:', error);
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'ai',
        text: `I'm ready to help with basic information about ${hotel.name}. What would you like to know?`,
        timestamp: new Date(),
      };
      setMessages([errorMsg]);
      setContextReady(true);
    }

    setIsLoading(false);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping || !contextReady) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    inputTextRef.current = '';
    setIsTyping(true);
    scrollToEnd();

    try {
      const response = await fetch(`${BASE_URL}/api/hotels/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          userMessage: text.trim(),
          hotelData: {
            id: enrichedHotel.id,
            name: enrichedHotel.name,
            location: enrichedHotel.location,
            city: enrichedHotel.city,
            country: enrichedHotel.country,
            allHotelInfo: enrichedHotel.allHotelInfo,
            rating: enrichedHotel.rating,
            reviews: enrichedHotel.reviews,
            price: enrichedHotel.price,
            pricePerNight: enrichedHotel.pricePerNight,
            tags: enrichedHotel.tags,
            features: enrichedHotel.features,
            topAmenities: enrichedHotel.topAmenities,
            nearbyAttractions: enrichedHotel.nearbyAttractions,
            fullDescription: enrichedHotel.fullDescription,
            fullAddress: enrichedHotel.fullAddress,
            aiExcerpt: enrichedHotel.aiExcerpt,
            whyItMatches: enrichedHotel.whyItMatches,
            funFacts: enrichedHotel.funFacts,
            guestInsights: enrichedHotel.guestInsights,
            sentimentPros: enrichedHotel.sentimentPros,
            sentimentCons: enrichedHotel.sentimentCons,
            locationHighlight: enrichedHotel.locationHighlight,
            isRefundable: enrichedHotel.isRefundable,
            refundableInfo: enrichedHotel.refundableInfo,
            categoryRatings: enrichedHotel.categoryRatings,
            roomTypes: enrichedHotel.roomTypes,
          },
          chatHistory: messages.slice(-8),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const aiMsg: ChatMessage = {
            id: `ai_${Date.now()}`,
            type: 'ai',
            text: data.aiResponse,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, aiMsg]);
          scrollToEnd();
        } else {
          throw new Error('chat success=false');
        }
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'ai',
        text: `I'm having trouble connecting right now. Try asking about ${hotel.name}'s amenities, location, or reviews!`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    }

    setIsTyping(false);
    scrollToEnd();
  };

  const handleSend = () => {
    if (isTyping || !contextReady) return;
    const msg = inputTextRef.current.trim();
    if (!msg) return;
    sendMessage(msg);
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    inputTextRef.current = text;
  };

  const handleSuggestionPress = (suggestion: typeof HOTEL_QUESTION_SUGGESTIONS[0]) => {
    if (contextReady && !isTyping) {
      sendMessage(suggestion.query);
    }
  };

  const SuggestionPills = () => {
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
              tw`flex-row items-center px-2.5 py-2 rounded-xl border border-gray-200 bg-white`,
              {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 3,
              }
            ]}
            onPress={() => {
              Keyboard.dismiss();
              handleSuggestionPress(suggestion);
            }}
            activeOpacity={0.8}
            disabled={isTyping}
          >
            <View style={[
              tw`w-5 h-5 rounded-full items-center justify-center mr-1.5`,
              { backgroundColor: 'rgba(29, 249, 255, 0.15)' }
            ]}>
              <Ionicons
                name={suggestion.icon}
                size={11}
                color={TURQUOISE_DARK}
              />
            </View>
            <Text
              style={[tw`text-xs font-medium text-gray-800`]}
              numberOfLines={1}
            >
              {suggestion.text}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const MessageBubble = ({ message }: { message: ChatMessage }) => {
    const isAI = message.type === 'ai';
    return (
      <View style={[tw`flex-row items-end mb-3 px-4`, isAI ? tw`justify-start` : tw`justify-end`]}>
        {isAI && (
          <View style={[tw`w-6 h-6 rounded-full items-center justify-center mr-2`, { backgroundColor: 'rgba(29, 249, 255, 0.15)' }]}>
            <Ionicons name="sparkles" size={12} color={TURQUOISE_DARK} />
          </View>
        )}
        <View
          style={[
            tw`rounded-2xl px-3 py-2`,
            { maxWidth: screenWidth * 0.65 },
            isAI
              ? { backgroundColor: '#F8FAFC', borderColor: '#E5E7EB', borderWidth: 1 }
              : { backgroundColor: TURQUOISE }
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

  const TypingIndicator = () => (
    <View style={tw`flex-row items-end mb-3 px-4 justify-start`}>
      <View style={[tw`w-6 h-6 rounded-full items-center justify-center mr-2`, { backgroundColor: 'rgba(29, 249, 255, 0.15)' }]}>
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

  if (!visible) return null;

  return (
<View
  style={[
    StyleSheet.absoluteFillObject,
    {
      zIndex: 999999,
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
  ]}
>
  <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: opacityAnim }]} pointerEvents="box-none">
    <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />

        {/* Centered panel with keyboard avoidance */}
        <KeyboardAvoidingView
          style={tw`flex-1 justify-center items-center`}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 60}
        >
          <Animated.View style={[{ transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
            <View
              style={[
                tw`bg-white rounded-xl overflow-hidden border border-gray-200`,
                {
                  width: panelWidth,
                  height: panelHeight,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 3,
                },
              ]}
            >
              {/* Header */}
              <View style={tw`px-4 pt-4 pb-3 border-b border-gray-100`}>
                <View style={tw`flex-row items-center justify-between`}>
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-base font-bold text-gray-900`} numberOfLines={1}>
                      Get Instant Answers
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      tw`ml-3 w-8 h-8 rounded-full items-center justify-center`,
                      { backgroundColor: '#F3F4F6' }
                    ]}
                    onPress={onClose}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="close" size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Messages */}
              <View style={tw`flex-1`}>
                <ScrollView
                  ref={scrollRef}
                  style={tw`flex-1`}
                  contentContainerStyle={tw`pt-3 pb-2`}
                  keyboardShouldPersistTaps="always"
                  showsVerticalScrollIndicator={false}
                >
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  {isTyping && <TypingIndicator />}
                </ScrollView>
              </View>

              {/* Input area */}
             <View 
  style={[tw`px-4 py-3 border-t border-gray-100`]}
  pointerEvents="box-none"
>
  {contextReady && !isLoading && <SuggestionPills />}

  <View style={tw`flex-row items-end`} pointerEvents="box-none">
    <View
      style={[
        tw`flex-1 rounded-xl border mr-2`,
        {
          backgroundColor: '#FAFAFA',
          borderColor: inputText ? TURQUOISE_LIGHT : '#E5E7EB',
          borderWidth: inputText ? 1.5 : 1,
          maxHeight: 100,
        },
      ]}
    >
      <TextInput
        ref={inputRef}
        style={[
          tw`px-3 py-2 text-base text-gray-900`,
          { lineHeight: Platform.OS === 'ios' ? 20 : 20, minHeight: 42 },
        ]}
        value={inputText}
        onChangeText={handleInputChange}
        placeholder={contextReady ? 'Ask about this hotel…' : 'Please wait…'}
        placeholderTextColor="#9CA3AF"
        maxLength={500}
        editable={contextReady && !isTyping}
        returnKeyType="send"
        blurOnSubmit={false}
        onSubmitEditing={handleSend}
        selectionColor={TURQUOISE}
        multiline={false}
      />
    </View>

    <View
      style={[
        tw`w-11 h-11 rounded-xl items-center justify-center`,
        {
          backgroundColor: inputText.trim() && contextReady && !isTyping ? TURQUOISE : '#F3F4F6',
        },
      ]}
      onTouchStart={(e) => {
        e.stopPropagation();
        if (inputText.trim() && contextReady && !isTyping) {
          handleSend();
        }
      }}
    >
      <Ionicons
        name="send"
        size={18}
        color={inputText.trim() && contextReady && !isTyping ? 'white' : '#9CA3AF'}
      />
    </View>
  </View>
</View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* Optional loading spinner overlay */}
      {isLoading && (
        <View style={tw`absolute inset-0 items-center justify-center`}>
          <ActivityIndicator size="small" color={TURQUOISE_DARK} />
        </View>
      )}
    </View>
  );
};

export default HotelChatOverlay;