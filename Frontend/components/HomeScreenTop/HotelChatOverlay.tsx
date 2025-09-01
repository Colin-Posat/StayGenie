// HotelChatOverlay.tsx - Compact slide-up modal design
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  FlatList,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import type { EnhancedHotel } from '../StoryView/SwipeableHotelStoryCard';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Turquoise color constants
const TURQUOISE = '#1df9ff';
const TURQUOISE_DARK = '#00d4e6';
const TURQUOISE_SUBTLE = '#f0feff';
const TURQUOISE_BORDER = '#b3f7ff';

// Compact modal height - much smaller!
const MODAL_HEIGHT = screenHeight * 0.6;

// Common hotel questions as suggestion pills - prioritized order
const HOTEL_QUESTION_SUGGESTIONS = [
  { text: 'Check-in/out', query: 'What are the check-in and check-out times?', icon: 'time' as const },
  { text: 'Amenities', query: 'What amenities does this hotel offer?', icon: 'list' as const },
  { text: 'Location info', query: 'Tell me about the location and nearby attractions', icon: 'location' as const },
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

const BASE_URL = 'http://localhost:3003';

const HotelChatOverlay: React.FC<HotelChatOverlayProps> = ({
  visible,
  onClose,
  hotel,
}) => {
  const slideAnim = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [contextReady, setContextReady] = useState(false);
  const [enrichedHotel, setEnrichedHotel] = useState<EnhancedHotel>(hotel);
  const [conversationId] = useState(() => `chat_${Date.now()}`);
  
  const scrollRef = useRef<ScrollView | FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Determine if we should use ScrollView (web) or FlatList (mobile)
  const isWeb = Platform.OS === 'web';

  // Get contextual suggestions that haven't been used yet
  const getContextualSuggestions = useCallback(() => {
    const usedQueries = new Set(
      messages
        .filter(msg => msg.type === 'user')
        .map(msg => msg.text.toLowerCase())
    );

    return HOTEL_QUESTION_SUGGESTIONS.filter(suggestion => 
      !usedQueries.has(suggestion.query.toLowerCase()) &&
      !Array.from(usedQueries).some(used => 
        used.includes(suggestion.text.toLowerCase()) || 
        suggestion.query.toLowerCase().includes(used)
      )
    ).slice(0, 6); // Show up to 6 suggestions
  }, [messages]);

  const scrollToEnd = useCallback(() => {
    if (isWeb && scrollRef.current) {
      // For web ScrollView
      (scrollRef.current as ScrollView).scrollToEnd({ animated: true });
    } else if (scrollRef.current) {
      // For mobile FlatList
      (scrollRef.current as FlatList).scrollToEnd({ animated: true });
    }
  }, [isWeb]);

  // Initialize chat when visible
  useEffect(() => {
    if (visible) {
      // Show modal
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Initialize conversation
      initializeChat();
    } else {
      // Hide modal
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: MODAL_HEIGHT,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Reset state
      setMessages([]);
      setInputText('');
      setContextReady(false);
      setIsLoading(false);
      setIsTyping(false);
    }
  }, [visible]);

  const initializeChat = async () => {
    setIsLoading(true);
    
    // Add welcome message immediately
    const welcomeMsg: ChatMessage = {
      id: `welcome_${Date.now()}`,
      type: 'ai',
      text: `Hi! I'm loading information about ${hotel.name}. This will just take a moment...`,
      timestamp: new Date(),
    };
    setMessages([welcomeMsg]);

    // Fetch hotel context
    try {
      const response = await fetch(`${BASE_URL}/api/hotels/fetch-details-for-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: hotel.id,
          hotelName: hotel.name
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEnrichedHotel({ ...hotel, allHotelInfo: data.allHotelInfo });
          setContextReady(true);
          
          // Update welcome message
          const readyMsg: ChatMessage = {
            id: `ready_${Date.now()}`,
            type: 'ai',
            text: `I'm ready to help you with any questions about ${hotel.name}. What would you like to know?`,
            timestamp: new Date(),
          };
          setMessages([readyMsg]);
        }
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
    setIsTyping(true);

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
          
          // Auto scroll to new message
          setTimeout(() => scrollToEnd(), 100);
        }
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'ai',
        text: `I'm having trouble connecting right now. Try asking about ${hotel.name}'s amenities, location, or reviews!`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
      
      // Auto scroll to new message
      setTimeout(() => scrollToEnd(), 100);
    }

    setIsTyping(false);
  };

  const handleSuggestionPress = (suggestion: typeof HOTEL_QUESTION_SUGGESTIONS[0]) => {
    if (contextReady && !isTyping) {
      sendMessage(suggestion.query);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isAI = item.type === 'ai';
    
    return (
      <View style={[
        tw`mb-3 px-4`,
        isAI ? tw`items-start` : tw`items-end`
      ]}>
        <View style={[
          tw`max-w-4/5 px-3 py-2 rounded-2xl`,
          isAI 
            ? { backgroundColor: '#F1F5F9', borderColor: TURQUOISE + '30', borderWidth: 1 }
            : { backgroundColor: TURQUOISE }
        ]}>
          <Text style={[
            tw`text-sm`,
            isAI ? tw`text-gray-800` : tw`text-white`
          ]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => (
    <View style={tw`mb-3 px-4 items-start`}>
      <View style={[
        tw`px-3 py-2 rounded-2xl flex-row items-center`,
        { backgroundColor: '#F1F5F9', borderColor: TURQUOISE + '30', borderWidth: 1 }
      ]}>
        <ActivityIndicator size="small" color={TURQUOISE_DARK} />
        <Text style={tw`text-sm text-gray-600 ml-2`}>Thinking...</Text>
      </View>
    </View>
  );

  if (!visible) return null;

  return (
    <View style={tw`absolute inset-0 z-50`}>
      {/* Backdrop */}
      <Animated.View
        style={[
          tw`absolute inset-0 bg-black`,
          { opacity: backdropAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.5]
          })}
        ]}
      >
        <TouchableOpacity style={tw`flex-1`} onPress={onClose} />
      </Animated.View>

      {/* Chat Modal */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: MODAL_HEIGHT,
            transform: [{ translateY: slideAnim }],
            backgroundColor: 'white',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 10,
          }
        ]}
      >
        <KeyboardAvoidingView 
          style={tw`flex-1`}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={tw`px-4 py-3 border-b border-gray-100`}>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-1`}>
                <Text style={tw`font-bold text-gray-900`} numberOfLines={1}>
                  Ask Us Anything
                </Text>
              </View>
              <TouchableOpacity
                style={tw`ml-3 w-8 h-8 bg-gray-100 rounded-full items-center justify-center`}
                onPress={onClose}
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

          </View>

          {/* Quick Suggestions - Removed since we have pills at bottom */}

          {/* Messages - Web vs Mobile optimized */}
          <View style={tw`flex-1`}>
            {Platform.OS === 'web' ? (
              // Web version with proper mouse wheel scrolling
              <ScrollView
                ref={scrollRef as React.RefObject<ScrollView>}
                style={tw`flex-1`}
                contentContainerStyle={tw`py-3`}
                showsVerticalScrollIndicator={true}
                onContentSizeChange={() => scrollToEnd()}
              >
                {messages.map(item => renderMessage({ item }))}
                {isTyping && renderTypingIndicator()}
              </ScrollView>
            ) : (
              // Mobile version with FlatList for better performance
              <FlatList
                ref={scrollRef as React.RefObject<FlatList>}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={tw`py-3`}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollToEnd()}
                onLayout={() => scrollToEnd()}
                ListFooterComponent={isTyping ? renderTypingIndicator() : null}
              />
            )}
          </View>

          {/* Input */}
          <View style={[tw`px-4 py-3 border-t border-gray-100`, { backgroundColor: '#FAFAFA' }]}>
            {/* Suggestion Pills */}
            {contextReady && !isLoading && (
              <View style={tw`mb-3`}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={tw`gap-2`}
                  bounces={true}
                >
                  {getContextualSuggestions().map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        tw`flex-row items-center px-3 py-2 rounded-full`,
                        {
                          backgroundColor: TURQUOISE_SUBTLE,
                          borderColor: TURQUOISE_BORDER,
                          borderWidth: 1,
                        }
                      ]}
                      onPress={() => handleSuggestionPress(suggestion)}
                      disabled={isTyping}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={suggestion.icon}
                        size={12}
                        color={TURQUOISE_DARK}
                        style={tw`mr-1.5`}
                      />
                      <Text
                        style={[
                          tw`text-xs font-medium`,
                          { color: '#374151' }
                        ]}
                        numberOfLines={1}
                      >
                        {suggestion.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={tw`flex-row items-end gap-3`}>
              <View style={[
                tw`flex-1 bg-white border rounded-2xl`,
                { borderColor: contextReady ? TURQUOISE + '30' : '#E5E7EB' }
              ]}>
                <TextInput
                  ref={inputRef}
                  style={tw`px-4 py-3 text-sm text-gray-900`}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={contextReady ? "Ask about this hotel..." : "Please wait..."}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  maxLength={500}
                  editable={contextReady && !isTyping}
                  returnKeyType="send"
                  onSubmitEditing={() => sendMessage(inputText)}
                  blurOnSubmit={false}
                />
              </View>
              <TouchableOpacity
                style={[
                  tw`w-12 h-12 rounded-full items-center justify-center`,
                  {
                    backgroundColor: (inputText.trim() && contextReady && !isTyping) 
                      ? TURQUOISE 
                      : '#E5E7EB'
                  }
                ]}
                onPress={() => sendMessage(inputText)}
                disabled={!inputText.trim() || !contextReady || isTyping}
              >
                <Ionicons 
                  name="send" 
                  size={18} 
                  color={(inputText.trim() && contextReady && !isTyping) ? 'white' : '#9CA3AF'} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

export default HotelChatOverlay;