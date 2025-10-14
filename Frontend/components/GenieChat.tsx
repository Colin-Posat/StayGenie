import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  ActivityIndicator,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { Text } from '../components/CustomText';
import axios from 'axios';

const { width } = Dimensions.get('window');

// Turquoise theme colors
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';

const BASE_URL = __DEV__ ? 'http://localhost:3003' : "https://staygenie-wwpa.onrender.com";

interface GenieChatProps {
  currentSearch: string;
  searchContext: {
    location?: string;
    dates: {
      checkin: string;
      checkout: string;
    };
    guests: {
      adults: number;
      children: number;
    };
    resultCount: number;
  };
  onSearchUpdate: (newSearch: string, originalSearch?: string) => void;
  onBackPress: () => void;
  checkInDate?: Date;
  checkOutDate?: Date;
  adults: number;
  children: number;
  isLoading?: boolean;
}

interface Message {
  id: string;
  type: 'user' | 'genie';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface ChatHistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const GenieChat: React.FC<GenieChatProps> = ({ 
  currentSearch, 
  searchContext, 
  onSearchUpdate,
  onBackPress,
  checkInDate,
  checkOutDate,
  adults,
  children,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'genie',
      text: `Hi! Want to narrow things down? Tell me what matters most to you`,
      timestamp: new Date(),
    }
  ]);
  const [conversationHistory, setConversationHistory] = useState<ChatHistoryMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const heightAnim = useRef(new Animated.Value(0)).current;
  const magicGlow = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;
  const logoClickAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const spinAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Determine if button should be disabled
  const isButtonDisabled = isLoading;

  // Magical shimmer animation
  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    shimmer.start();
    return () => shimmer.stop();
  }, []);

  // Continuous spin animation - only when loading
  useEffect(() => {
    if (isButtonDisabled) {
      if (spinAnimationRef.current) {
        spinAnimationRef.current.stop();
      }
      
      spinAnim.setValue(0);
      
      spinAnimationRef.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      
      spinAnimationRef.current.start();
      
    } else {
      if (spinAnimationRef.current) {
        spinAnimationRef.current.stop();
        spinAnimationRef.current = null;
      }
      spinAnim.setValue(0);
    }
    
    return () => {
      if (spinAnimationRef.current) {
        spinAnimationRef.current.stop();
        spinAnimationRef.current = null;
      }
    };
  }, [isButtonDisabled, spinAnim]);

  // Input focus animation
  useEffect(() => {
    Animated.timing(inputFocusAnim, {
      toValue: message.trim() ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [message]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Helper function to close the chat smoothly
  const closeChat = () => {
    Animated.spring(heightAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 120,
      friction: 12,
    }).start();
    
    Animated.timing(magicGlow, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    setIsExpanded(false);
  };

  const toggleExpand = () => {
    if (isButtonDisabled) return;

    Animated.sequence([
      Animated.spring(logoClickAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(logoClickAnim, {
        toValue: 0,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.spring(heightAnim, {
      toValue: isExpanded ? 0 : 1,
      useNativeDriver: false,
      tension: 120,
      friction: 12,
    }).start();
    
    Animated.timing(magicGlow, {
      toValue: isExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    setIsExpanded(!isExpanded);
    
    if (!isExpanded) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const containerHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [84, 500],
  });

  const contentOpacity = heightAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const formatDateRange = (checkin?: Date, checkout?: Date) => {
    if (!checkin || !checkout) return 'Select dates';
    const checkinStr = checkin.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const checkoutStr = checkout.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${checkinStr} - ${checkoutStr}`;
  };

  const formatGuestInfo = (adults: number, children: number) => {
    let guestStr = `${adults} adult${adults !== 1 ? 's' : ''}`;
    if (children > 0) {
      guestStr += `, ${children} child${children !== 1 ? 'ren' : ''}`;
    }
    return guestStr;
  };

  const addTypingIndicator = () => {
    const typingMessage: Message = {
      id: `typing-${Date.now()}`,
      type: 'genie',
      text: '',
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages(prev => [...prev, typingMessage]);
    return typingMessage.id;
  };

  const removeTypingIndicator = (typingId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== typingId));
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing || isButtonDisabled) return;

    const userMessageText = message.trim();
    setMessage('');
    setIsProcessing(true);

    // Add user message
    const newUserMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: userMessageText,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newUserMessage]);

    // Show typing indicator
    const typingId = addTypingIndicator();

    try {
      // Call Genie Chat API
      const response = await axios.post(`${BASE_URL}/api/genie/chat`, {
        userMessage: userMessageText,
        currentSearch: currentSearch,
        conversationHistory: conversationHistory,
        searchContext: {
          location: searchContext.location,
          dates: {
            checkin: checkInDate?.toISOString().split('T')[0] || searchContext.dates.checkin,
            checkout: checkOutDate?.toISOString().split('T')[0] || searchContext.dates.checkout,
          },
          guests: {
            adults: adults,
            children: children,
          },
          resultCount: searchContext.resultCount,
        }
      }, {
        timeout: 15000
      });

      removeTypingIndicator(typingId);

      const { 
        response: genieResponse, 
        shouldSearch, 
        newSearchQuery, 
        conversationHistory: updatedHistory 
      } = response.data;

      // Add Genie's response
      const genieMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'genie',
        text: genieResponse,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, genieMessage]);
      setConversationHistory(updatedHistory || []);

      // If Genie decided to search, trigger the search AND close the chat
      if (shouldSearch && newSearchQuery) {
        console.log('🔍 Genie triggered search:', newSearchQuery);
        
        // Small delay for UX - let user see the response briefly
        setTimeout(() => {
          onSearchUpdate(newSearchQuery, currentSearch);
          // Close the chat after triggering search
          setTimeout(() => {
            closeChat();
          }, 300);
        }, 800);
      }

    } catch (error) {
      console.error('❌ Genie chat error:', error);
      
      removeTypingIndicator(typingId);

      // Fallback response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'genie',
        text: "I'm having a bit of trouble right now. Could you try rephrasing that? ✨",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
      style={[tw`absolute top-0 left-0 right-0 z-50`]}
    >
      <Animated.View
        style={[
          tw`bg-white`,
          { 
            height: containerHeight,
            shadowColor: TURQUOISE,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: magicGlow.interpolate({
              inputRange: [0, 1],
              outputRange: [0.15, 0.35],
            }),
            shadowRadius: 16,
            elevation: 12,
          }
        ]}
      >
        {/* Animated magical border gradient */}
        <Animated.View 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: TURQUOISE,
              shadowColor: TURQUOISE,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 8,
            }}
          />
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: width * 0.3,
              height: 3,
              backgroundColor: 'white',
              opacity: 0.6,
              transform: [{ translateX: shimmerTranslate }],
            }}
          />
        </Animated.View>

        {/* Compact Header */}
        <View style={[
          tw`flex-row items-center px-4`,
          { 
            height: 84,
            paddingTop: Platform.OS === 'ios' ? 48 : 12,
            paddingBottom: 12,
          }
        ]}>
          {/* Back Button */}
          <TouchableOpacity
  style={[
    tw`w-9 h-9 items-center justify-center rounded-xl mr-5`,
    { 
      backgroundColor: '#F5F5F5',  // ← Match user message background
      borderWidth: 1,  // ← ADD BORDER
      borderColor: '#E5E7EB',  // ← ADD BORDER COLOR
      shadowColor: '#000',  // ← Change to black shadow like user messages
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }
  ]}
  onPress={onBackPress}
  activeOpacity={0.7}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
  <Ionicons name="arrow-back" size={18} color="#374151" />
</TouchableOpacity>
          
          {/* Search Info */}
          <TouchableOpacity 
            style={tw`flex-1 mr-3`}
            onPress={toggleExpand}
            activeOpacity={0.9}
            disabled={isButtonDisabled}
          >
            <Text style={{
              fontFamily: 'Merriweather-Bold',
              fontSize: 15,
              letterSpacing: -0.2,
              lineHeight: 20,
              color: '#111827',
              marginBottom: 6,
            }} numberOfLines={2}>
              {currentSearch || 'Your Search'}
            </Text>
            
            <View style={tw`flex-row items-center flex-wrap`}>
              <View style={tw`flex-row items-center mr-3`}>
                <Ionicons name="calendar-outline" size={11} color="#6B7280" />
                <Text style={{
                  fontFamily: 'Merriweather-Regular',
                  fontSize: 11,
                  color: '#6B7280',
                  marginLeft: 3,
                }}>
                  {formatDateRange(checkInDate, checkOutDate)}
                </Text>
              </View>
              
              <View style={tw`flex-row items-center mr-3`}>
                <Ionicons name="people-outline" size={11} color="#6B7280" />
                <Text style={{
                  fontFamily: 'Merriweather-Regular',
                  fontSize: 11,
                  color: '#6B7280',
                  marginLeft: 3,
                }}>
                  {formatGuestInfo(adults, children)}
                </Text>
              </View>
              
              {searchContext?.resultCount > 0 && (
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="home" size={11} color="#6B7280" />
                  <Text style={{
                    fontFamily: 'Merriweather-Regular',
                    fontSize: 11,
                    color: '#6B7280',
                    marginLeft: 3,
                  }}>
                    {searchContext.resultCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Magical Logo Button */}
          <TouchableOpacity
            onPress={toggleExpand}
            activeOpacity={isButtonDisabled ? 1 : 0.7}
            disabled={isButtonDisabled}
            style={[
              tw`w-11 h-11 rounded-full items-center justify-center`,
              {
                backgroundColor: isButtonDisabled ? 'rgba(29, 249, 255, 0.25)' : 'rgba(29, 249, 255, 0.15)',
                borderWidth: 2,
                borderColor: TURQUOISE,
                shadowColor: TURQUOISE,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isButtonDisabled ? 0.7 : 0.5,
                shadowRadius: isButtonDisabled ? 16 : 12,
              }
            ]}
          >
            <Animated.View
              style={{
                transform: [
                  { rotate: isButtonDisabled ? spinRotation : '0deg' },
                  { 
                    scale: Animated.add(
                      heightAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.15],
                      }),
                      logoClickAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 0.2],
                      })
                    ) as any
                  },
                  {
                    rotateZ: isButtonDisabled ? '0deg' : logoClickAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: ['0deg', '-10deg', '0deg'],
                    }),
                  }
                ],
              }}
            >
              <Image
                source={require('../assets/images/logo.png')}
                style={[tw`w-6 h-6`]}
                resizeMode="contain"
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Expanded Chat Content */}
        <Animated.View
          style={[
            tw`flex-1`,
            { opacity: contentOpacity }
          ]}
          pointerEvents={isExpanded ? 'auto' : 'none'}
        >
          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={tw`flex-1 px-4 pt-3`}
            contentContainerStyle={tw`pb-3`}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg, index) => (
              <Animated.View
                key={msg.id}
                style={[
                  tw`flex-row mb-3 items-end`,
                  msg.type === 'user' && tw`flex-row-reverse`,
                  {
                    opacity: contentOpacity,
                    transform: [{
                      translateY: contentOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    }],
                  }
                ]}
              >
                {msg.type === 'genie' && (
                  <View style={[
                    tw`w-7 h-7 rounded-full items-center justify-center mr-2`,
                    {
                      backgroundColor: 'rgba(29, 249, 255, 0.12)',
                      borderWidth: 1,
                      borderColor: 'rgba(29, 249, 255, 0.3)',
                    }
                  ]}>
                    <Image
                      source={require('../assets/images/logo.png')}
                      style={tw`w-3.5 h-3.5`}
                      resizeMode="contain"
                    />
                  </View>
                )}
                
                <View
                  style={[
                    tw`px-4 py-3 rounded-2xl`,
                    msg.type === 'user' 
  ? [
      {
        backgroundColor: '#F5F5F5',  // ← Light gray background
        borderBottomRightRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }
    ]
                      : [
    { 
      backgroundColor: 'rgba(29, 249, 255, 0.06)',
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: 'rgba(29, 249, 255, 0.2)',
      shadowColor: TURQUOISE,  // ← ADD THIS
      shadowOffset: { width: 0, height: 2 },  // ← ADD THIS
      shadowOpacity: 0.15,  // ← ADD THIS (lighter than user messages)
      shadowRadius: 4,  // ← ADD THIS
    }
  ],
                    { maxWidth: '78%' }
                  ]}
                >
                  {msg.isTyping ? (
                    <View style={tw`flex-row items-center py-1`}>
                      <View style={[tw`w-2 h-2 rounded-full bg-gray-400 mr-1.5`, { opacity: 0.6 }]} />
                      <View style={[tw`w-2 h-2 rounded-full bg-gray-400 mr-1.5`, { opacity: 0.8 }]} />
                      <View style={[tw`w-2 h-2 rounded-full bg-gray-400`, { opacity: 1 }]} />
                    </View>
                  ) : (
                    <Text
                      style={[
                        { color: msg.type === 'user' ? '#424242' : '#111827' },
                        {
                          fontFamily: 'Merriweather-Regular',
                          fontSize: 13,
                          lineHeight: 19,
                        }
                      ]}
                    >
                      {msg.text}
                    </Text>
                  )}
                </View>
              </Animated.View>
            ))}
          </ScrollView>

          {/* Input Area */}
          <View style={[
            tw`px-4 py-3`,
            {
              borderTopWidth: 1,
              borderTopColor: 'rgba(229, 231, 235, 0.6)',
              backgroundColor: '#FAFBFC',
            }
          ]}>
            <Animated.View style={[
              tw`bg-white rounded-2xl shadow-lg`,
              {
                shadowColor: TURQUOISE,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: inputFocusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.08, 0.2],
                }),
                shadowRadius: 8,
                borderWidth: 1.5,
                borderColor: inputFocusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#E5E7EB', TURQUOISE],
                }) as any,
              }
            ]}>
              <View style={tw`flex-row items-center px-4 py-3`}>
                <Animated.View style={[
                  tw`mr-3`,
                  {
                    transform: [{
                      scale: inputFocusAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.1],
                      }),
                    }],
                  }
                ]}>
                  <Ionicons
                    name="sparkles"
                    size={16}
                    color={message.trim() ? TURQUOISE : '#9CA3AF'}
                  />
                </Animated.View>
                
                <TextInput
                  ref={inputRef}
                  style={[
                    tw`flex-1 text-gray-900`,
                    {
                      fontFamily: 'Merriweather-Regular',
                      fontSize: 14,
                      lineHeight: 20,
                      paddingVertical: 0,
                    }
                  ]}
                  placeholder="Ask me anything..."
                  placeholderTextColor="#9CA3AF"
                  value={message}
                  onChangeText={setMessage}
                  multiline={false}
                  maxLength={200}
                  returnKeyType="send"
                  onSubmitEditing={handleSendMessage}
                  selectionColor={TURQUOISE}
                  editable={!isProcessing && !isButtonDisabled}
                />
                
                {message.trim().length > 0 && !isProcessing && !isButtonDisabled && (
                  <Animated.View
                    style={{
                      opacity: inputFocusAnim,
                      transform: [{
                        scale: inputFocusAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      }],
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => setMessage('')}
                      style={tw`w-6 h-6 items-center justify-center mr-2`}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  </Animated.View>
                )}
                
                {isProcessing || isButtonDisabled ? (
                  <View style={[
                    tw`w-8 h-8 rounded-full items-center justify-center`,
                    { backgroundColor: '#E5E7EB' }
                  ]}>
                    <ActivityIndicator size="small" color={TURQUOISE} />
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handleSendMessage}
                    disabled={!message.trim() || isProcessing || isButtonDisabled}
                    activeOpacity={0.7}
                    style={[
                      tw`w-8 h-8 rounded-full items-center justify-center`,
                      {
                        backgroundColor: message.trim() ? TURQUOISE : '#E5E7EB',
                        shadowColor: TURQUOISE,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: message.trim() ? 0.4 : 0,
                        shadowRadius: 4,
                      }
                    ]}
                  >
                    <Ionicons 
                      name="arrow-up" 
                      size={18} 
                      color={message.trim() ? '#ffffff' : '#9CA3AF'} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

export default GenieChat;