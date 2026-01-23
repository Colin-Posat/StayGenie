// MorphingSearchChat.tsx - Single morphing input that becomes chat composer
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Animated,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { Text } from '../components/CustomText';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TURQUOISE = '#00d4e6'; // Softer turquoise for better text readability

// API Base URLs - switch between local dev and production
//const BASE_URL = 'http://localhost:3003';
const BASE_URL = 'https://staygenie-wwpa.onrender.com';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  refinementData?: {
    query: string;
    originalMessage: string;
  };
}

interface MorphingSearchChatProps {
  currentSearch: string;
  onSearchRefined: (newQuery: string, originalQuery: string) => void;
  onBackPress: () => void;
  hotelContext?: any[];
  searchParams?: any;
}

const MorphingSearchChat: React.FC<MorphingSearchChatProps> = ({
  currentSearch,
  onSearchRefined,
  onBackPress,
  hotelContext = [],
  searchParams = {},
}) => {
  const insets = useSafeAreaInsets();
  
  // State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Refs
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animations
  const chatExpanded = useRef(new Animated.Value(0)).current;
  
  // Constants
  const INPUT_HEIGHT = 56;
  const TOP_POSITION = 10; // Where input sits when collapsed
  const KEYBOARD_OFFSET = -25; // Negative = closer to keyboard
  
  // No animation needed - using static shadow
  
  // Keyboard listeners
  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        // Use endCoordinates.height which is standard across iOS and Android
        const height = e.endCoordinates.height;
        setKeyboardHeight(height);
      }
    );
    
    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);
  
  // Generate initial welcome message
  const generateInitialMessage = async () => {
    if (messages.length > 0) return; // Only generate if no messages exist
    
    setIsLoadingResponse(true);
    
    try {
      const response = await fetch(`${BASE_URL}/api/hotels/ai-search-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Generate a brief welcome message for my search results',
          conversationHistory: [],
          currentSearch,
          hotelContext,
          searchParams,
          isInitialMessage: true, // Flag for backend to know this is the welcome message
        }),
      });
      
      const data = await response.json();
      
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response || `Found your hotels! Let me know if you want to refine your search or ask questions.`,
        timestamp: new Date(),
      };
      
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Failed to generate initial message:', error);
      // Fallback welcome message
      const fallbackMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Found your hotels! Let me know if you want to refine your search or ask questions.`,
        timestamp: new Date(),
      };
      setMessages([fallbackMessage]);
    } finally {
      setIsLoadingResponse(false);
    }
  };
  
  // Open chat animation
  const openChat = () => {
    setIsChatOpen(true);
    
    Animated.spring(chatExpanded, {
      toValue: 1,
      tension: 280,
      friction: 30,
      useNativeDriver: true,
    }).start();
    
    // Generate initial message only if chat is empty
    if (messages.length === 0) {
      generateInitialMessage();
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };
  
  // Close chat animation
  const closeChat = () => {
    Keyboard.dismiss();
    setMessage(''); // Clear any typed text when closing
    
    Animated.spring(chatExpanded, {
      toValue: 0,
      tension: 280,
      friction: 30,
      useNativeDriver: true,
    }).start(() => {
      setIsChatOpen(false);
      // Keep messages so chat history persists
      // setMessages([]);
    });
  };
  
  // Send message handler
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const trimmedMessage = message.trim().toLowerCase();
    
    // Check if there are any pending refinement suggestions
    const pendingRefinement = messages.find(msg => msg.refinementData);
    
    // If user types "yes" or "no" and there's a pending refinement, handle it
    if (pendingRefinement && (trimmedMessage === 'yes' || trimmedMessage === 'no')) {
      if (trimmedMessage === 'yes') {
        // User confirmed the refinement
        handleConfirmRefinement(pendingRefinement.refinementData!.query, pendingRefinement.id);
      } else {
        // User declined the refinement
        handleDeclineRefinement(pendingRefinement.id);
      }
      setMessage(''); // Clear the input
      return; // Don't process as a regular message
    }
    
    // If there are any pending refinement suggestions (and user didn't type yes/no), auto-dismiss them
    const hasPendingRefinements = messages.some(msg => msg.refinementData);
    if (hasPendingRefinements) {
      setMessages(prev => 
        prev.map(msg => 
          msg.refinementData ? { ...msg, refinementData: undefined } : msg
        )
      );
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoadingResponse(true);
    
    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      // Call your AI chat endpoint
      const response = await fetch(`${BASE_URL}/api/hotels/ai-search-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.filter(msg => !msg.refinementData), // Don't send dismissed refinements
          currentSearch,
          hotelContext,
          searchParams,
        }),
      });
      
      const data = await response.json();
      
      // Create assistant message with optional refinement data
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || "I'm here to help!",
        timestamp: new Date(),
        ...(data.shouldRefineSearch && data.refinedQuery && {
          refinementData: {
            query: data.refinedQuery,
            originalMessage: data.response
          }
        })
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Note: We no longer auto-refine - user must confirm via buttons
      
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting. Please try again!",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingResponse(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };
  
  // Handle refinement confirmation
  const handleConfirmRefinement = (query: string, messageId: string) => {
    // Remove refinement data first so buttons disappear
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, refinementData: undefined }
          : msg
      )
    );
    
    onSearchRefined(query, currentSearch);
    closeChat(); // Close chat when confirming refinement
  };

  const handleDeclineRefinement = (messageId: string) => {
    // Remove refinement data from the message
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, refinementData: undefined }
          : msg
      )
    );
    
    // Add a follow-up message from Genie
    const followUpMessage: Message = {
      id: (Date.now() + 2).toString(),
      role: 'assistant',
      content: "Okay, I won't refresh the search. What else can I help you with?",
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, followUpMessage]);
    
    // Scroll to bottom to show new message
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };
  
  const inputTranslateY = chatExpanded.interpolate({
    inputRange: [0, 1],
    outputRange: [
      0, 
      SCREEN_HEIGHT - keyboardHeight - INPUT_HEIGHT - insets.bottom - TOP_POSITION + KEYBOARD_OFFSET
    ],
  });
  
  const chatContainerOpacity = chatExpanded.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });
  
  const chatContainerTranslateY = chatExpanded.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });
  
  const overlayOpacity = chatExpanded.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });
  
  return (
    <>
      {/* Overlay behind chat (dims results feed) */}
      {isChatOpen && (
        <TouchableWithoutFeedback onPress={closeChat}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: -insets.top, // Extend to cover status bar
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#000',
                opacity: overlayOpacity,
                zIndex: 998,
              },
            ]}
            pointerEvents="auto"
          />
        </TouchableWithoutFeedback>
      )}
      
      {/* Chat Messages Container */}
      {isChatOpen && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: TOP_POSITION + INPUT_HEIGHT - 45,
              left: 0,
              right: 0,
              bottom: keyboardHeight + INPUT_HEIGHT + insets.bottom - 20,
              zIndex: 999,
              opacity: chatContainerOpacity,
              transform: [{ translateY: chatContainerTranslateY }],
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={tw`flex-1 px-4`}>
            {/* Chat Header */}
            <View style={[
              tw`bg-white rounded-t-2xl px-4 py-3 border-b border-gray-200`,
              {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }
            ]}>
              <Text style={{
                fontFamily: 'Merriweather-Bold',
                fontSize: 16,
                color: '#111827',
              }}>
                Chat with Genie
              </Text>

            </View>
            
            {/* Messages List */}
            <ScrollView
              ref={scrollViewRef}
              style={tw`flex-1 bg-white`}
              contentContainerStyle={tw`px-4 py-4`}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((msg) => (
                <View key={msg.id}>
                  <View
                    style={[
                      tw`mb-3 flex-row items-start`,
                      msg.role === 'user' ? tw`justify-end` : tw`justify-start`,
                    ]}
                  >
                    {/* Genie icon for assistant messages */}
                    {msg.role === 'assistant' && (
                      <View style={tw`mr-2 mt-0.5`}>
                        <Image
                          source={require('../assets/images/logo.png')}
                          style={tw`w-6 h-6`}
                          resizeMode="contain"
                        />
                      </View>
                    )}
                    
                    <View
                      style={[
                        tw`px-4 py-3 rounded-2xl max-w-[80%]`,
                        msg.role === 'user'
                          ? { backgroundColor: TURQUOISE }
                          : tw`bg-gray-100`,
                      ]}
                    >
                      <Text style={{
                        fontFamily: 'Merriweather-Regular',
                        fontSize: 14,
                        color: msg.role === 'user' ? '#fff' : '#111827',
                        lineHeight: 20,
                      }}>
                        {msg.content}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Refinement Confirmation Buttons */}
                  {msg.role === 'assistant' && msg.refinementData && (
                    <View style={[
                      tw`ml-8 mb-3 bg-white border border-gray-200 rounded-xl p-3`,
                      {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 2,
                      }
                    ]}>
                      <Text style={{
                        fontFamily: 'Merriweather-Regular',
                        fontSize: 13,
                        color: '#6B7280',
                        marginBottom: 8,
                      }}>
                        Would you like me to refresh the search?
                      </Text>
                      <View style={tw`flex-row gap-2`}>
                        <TouchableOpacity
                          style={[
                            tw`flex-1 py-2.5 rounded-lg items-center`,
                            { backgroundColor: TURQUOISE }
                          ]}
                          onPress={() => handleConfirmRefinement(msg.refinementData!.query, msg.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={{
                            fontFamily: 'Merriweather-Bold',
                            fontSize: 14,
                            color: '#fff',
                          }}>
                            Yes
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={tw`flex-1 py-2.5 rounded-lg items-center bg-gray-100`}
                          onPress={() => handleDeclineRefinement(msg.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={{
                            fontFamily: 'Merriweather-Bold',
                            fontSize: 14,
                            color: '#374151',
                          }}>
                            No
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))}
              
              {isLoadingResponse && (
                <View style={tw`mb-3 flex-row items-start justify-start`}>
                  <View style={tw`mr-2 mt-0.5`}>
                    <Image
                      source={require('../assets/images/logo.png')}
                      style={tw`w-6 h-6`}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={tw`bg-gray-100 px-4 py-3 rounded-2xl`}>
                    <Text style={{
                      fontFamily: 'Merriweather-Regular',
                      fontSize: 14,
                      color: '#6B7280',
                    }}>
                      Genie is typing...
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
            
            {/* Bottom rounded corners */}
            <View style={tw`bg-white h-2 rounded-b-2xl`} />
          </View>
        </Animated.View>
      )}
      
      {/* MORPHING INPUT - Moves from top to keyboard */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: TOP_POSITION,
            left: 16,
            right: 16,
            height: INPUT_HEIGHT,
            zIndex: 1000,
            transform: [{ translateY: inputTranslateY }],
          },
        ]}
        pointerEvents="box-none"
      >
        <View
          style={[
            tw`bg-white rounded-2xl border border-gray-200 flex-row items-center px-4`,
            {
              height: INPUT_HEIGHT,
              shadowColor: isChatOpen ? '#000' : TURQUOISE,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isChatOpen ? 0.1 : 0.15,
              shadowRadius: isChatOpen ? 4 : 8,
              elevation: 5,
            },
          ]}
        >
          {/* Back Button (only when collapsed) */}
          {!isChatOpen && (
            <TouchableOpacity
              style={tw`w-8 h-8 items-center justify-center mr-3`}
              onPress={onBackPress}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#374151" />
            </TouchableOpacity>
          )}
          
          {/* Close Button (only when expanded) */}
          {isChatOpen && (
            <TouchableOpacity
              style={tw`w-8 h-8 items-center justify-center mr-3`}
              onPress={closeChat}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#374151" />
            </TouchableOpacity>
          )}
          
          {/* Input */}
          <TextInput
            ref={inputRef}
            style={{
              flex: 1,
              fontFamily: 'Merriweather-Regular',
              fontSize: 14,
              color: '#111827',
              paddingVertical: 0,
            }}
            placeholder={
              isChatOpen 
                ? "Type to refine search or ask questions..."
                : "Tap to chat with Genie"
            }
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={setMessage}
            onFocus={() => {
              if (!isChatOpen) {
                openChat();
              }
            }}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
            editable={true}
          />
          
          {/* Send Button (only when chat is open and message exists) */}
          {isChatOpen && message.trim().length > 0 && (
            <TouchableOpacity
              style={[
                tw`w-8 h-8 rounded-full items-center justify-center ml-2`,
                { backgroundColor: TURQUOISE }
              ]}
              onPress={handleSendMessage}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          )}
          
          {/* Chat Icon (only when collapsed) */}
          {!isChatOpen && (
            <TouchableOpacity
              style={tw`w-8 h-8 items-center justify-center ml-2`}
              onPress={openChat}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={18} color={TURQUOISE} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </>
  );
};

export default MorphingSearchChat;