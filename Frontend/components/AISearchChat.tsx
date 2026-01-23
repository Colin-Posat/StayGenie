// components/HomeScreenTop/AISearchChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Text } from './CustomText';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const BASE_URL = "https://staygenie-wwpa.onrender.com";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AISearchChatProps {
  visible: boolean;
  onClose: () => void;
  currentSearch: string;
  hotelContext: any[];
  searchParams: any;
  onSearchUpdate: (newSearch: string, originalSearch: string) => void;
}

const AISearchChat: React.FC<AISearchChatProps> = ({
  visible,
  onClose,
  currentSearch,
  hotelContext,
  searchParams,
  onSearchUpdate,
}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      // Focus input when chat opens
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Clear messages when chat closes
      setMessages([]);
      setMessage('');
    }
  }, [visible]);

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');

    // Add user message to chat
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: userMessage }
    ];
    setMessages(newMessages);

    setIsLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/hotels/ai-search-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          currentSearch,
          hotelContext: hotelContext.slice(0, 10).map(h => ({
            id: h.id,
            name: h.name,
            city: h.city,
            country: h.country,
            price: h.price,
            rating: h.rating,
            aiMatchPercent: h.aiMatchPercent,
            topAmenities: h.topAmenities,
            distanceFromSearch: h.distanceFromSearch,
          })),
          searchParams: {
            checkin: searchParams?.checkin,
            checkout: searchParams?.checkout,
            adults: searchParams?.adults,
            children: searchParams?.children,
            location: searchParams?.cityName,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add assistant response
        setMessages([
          ...newMessages,
          { role: 'assistant', content: data.response }
        ]);

        // If AI suggests search refinement, trigger it
        if (data.shouldRefineSearch && data.refinedQuery) {
          setTimeout(() => {
            onSearchUpdate(data.refinedQuery, currentSearch);
            onClose();
          }, 1500);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([
        ...newMessages,
        { 
          role: 'assistant', 
          content: "Sorry, I'm having trouble right now. Please try again!" 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw`flex-1`}
      keyboardVerticalOffset={0}
    >
      {/* Chat Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={tw`flex-1 px-4`}
        contentContainerStyle={tw`py-4`}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View style={tw`items-center py-8`}>
            <View style={[
              tw`w-16 h-16 rounded-full items-center justify-center mb-4`,
              { backgroundColor: 'rgba(29, 249, 255, 0.1)' }
            ]}>
              <Ionicons name="chatbubbles" size={32} color="#1df9ff" />
            </View>
            <Text style={{
              fontFamily: 'Merriweather-Bold',
              fontSize: 18,
              color: '#111827',
              marginBottom: 8,
            }}>
              How can I help?
            </Text>
            <Text style={{
              fontFamily: 'Merriweather-Regular',
              fontSize: 14,
              color: '#6B7280',
              textAlign: 'center',
              paddingHorizontal: 32,
            }}>
              Ask me anything about your hotels or refine your search
            </Text>
          </View>
        )}

        {messages.map((msg, idx) => (
          <View
            key={idx}
            style={[
              tw`mb-3 max-w-[80%]`,
              msg.role === 'user' ? tw`self-end` : tw`self-start`
            ]}
          >
            <View
              style={[
                tw`px-4 py-3 rounded-2xl`,
                msg.role === 'user'
                  ? { backgroundColor: '#1df9ff' }
                  : { backgroundColor: '#F3F4F6' }
              ]}
            >
              <Text style={{
                fontFamily: 'Merriweather-Regular',
                fontSize: 14,
                color: msg.role === 'user' ? '#ffffff' : '#111827',
                lineHeight: 20,
              }}>
                {msg.content}
              </Text>
            </View>
          </View>
        ))}

        {isLoading && (
          <View style={[tw`self-start mb-3`, { maxWidth: '80%' }]}>
            <View style={[tw`px-4 py-3 rounded-2xl`, { backgroundColor: '#F3F4F6' }]}>
              <ActivityIndicator size="small" color="#1df9ff" />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={[
        tw`px-4 pb-4 pt-3 bg-white`,
        {
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
        }
      ]}>
        <View style={[
          tw`flex-row items-end rounded-2xl px-4 py-2`,
          {
            backgroundColor: '#F9FAFB',
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }
        ]}>
          <TextInput
            ref={inputRef}
            style={{
              fontFamily: 'Merriweather-Regular',
              fontSize: 14,
              color: '#111827',
              flex: 1,
              maxHeight: 100,
              paddingVertical: 8,
            }}
            value={message}
            onChangeText={setMessage}
            placeholder="Ask about hotels or refine search..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!message.trim() || isLoading}
            style={[
              tw`w-8 h-8 rounded-full items-center justify-center ml-2`,
              {
                backgroundColor: message.trim() && !isLoading
                  ? '#1df9ff'
                  : '#E5E7EB'
              }
            ]}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={message.trim() && !isLoading ? '#ffffff' : '#9CA3AF'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default AISearchChat;