// MorphingSearchChat.tsx - With date/guests info display
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Animated,
  Keyboard,
  Platform,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { Text } from '../components/CustomText';
import DateSelectionModal from './SearchGuideModals/DateSelectionModal';
import BudgetSelectionModal from './SearchGuideModals/BudgetSelectionModal';
import GuestsSelectionModal from './SearchGuideModals/GuestSelectionModal';
import AmenitiesSelectionModal from './SearchGuideModals/AmenitiesSelectionModal';
import HotelStylesSelectionModal from './SearchGuideModals/HotelStylesSelectionModal';
import { useAuth } from '../contexts/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TURQUOISE = '#00d4e6';
const TURQUOISE_LIGHT = 'rgba(29, 249, 255, 0.15)';


// API Base URLs
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
  searchParams?: {
    checkin?: string;
    checkout?: string;
    adults?: number;
    children?: number;
    location?: string;
  };
  searchParamsLoading?: boolean;
}

interface RefinePill {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  action: string;
}

// Helper function to parse text with bold formatting
const parseMessageText = (text: string) => {
  const parts: Array<{ text: string; bold: boolean }> = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        bold: false,
      });
    }
    parts.push({
      text: match[1],
      bold: true,
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      bold: false,
    });
  }

  return parts.length > 0 ? parts : [{ text, bold: false }];
};

const MorphingSearchChat: React.FC<MorphingSearchChatProps> = ({
  currentSearch,
  onSearchRefined,
  onBackPress,
  hotelContext = [],
  searchParams = {},
  searchParamsLoading = false,
}) => {
  const insets = useSafeAreaInsets();
  
  const pillsTopYRef = useRef(0);
const inputStartYRef = useRef(0);
  // State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  
  // Modal states
  const [showDateModal, setShowDateModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGuestsModal, setShowGuestsModal] = useState(false);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [showStylesModal, setShowStylesModal] = useState(false);
  const { startChatConversation, logChatMessage } = useAuth();
const [conversationId, setConversationId] = useState<string | null>(null);

  // Refs
  const closeCooldownRef = useRef(false);
  const canOpenRef = useRef(true);
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const lastKeyboardHeightRef = useRef(0);
  
  // Animations
  const chatExpanded = useRef(new Animated.Value(0)).current;
  const inputTranslateY = useRef(new Animated.Value(0)).current;
  const infoOpacity = useRef(new Animated.Value(1)).current;
  
  // Constants
  const INPUT_HEIGHT = 56;
  const INFO_HEIGHT = 32;
  const TOP_POSITION = 1;
  const KEYBOARD_OFFSET = -25;
  const PILLS_HEIGHT = 56;
  const isAnimatingRef = useRef(false);
  const chatBottomPositionRef = useRef(0);
  
  // Refine pills
  const refinePills: RefinePill[] = [
    {
      id: 'dates',
      icon: 'calendar-outline',
      label: 'Add dates',
      action: 'ADD_DATES'
    },
    {
      id: 'budget',
      icon: 'card-outline',
      label: 'Set budget',
      action: 'SET_BUDGET'
    },
    {
      id: 'guests',
      icon: 'people-outline',
      label: 'Add guests',
      action: 'ADD_GUESTS'
    },
    {
      id: 'amenities',
      icon: 'options-outline',
      label: 'Amenities',
      action: 'SELECT_AMENITIES'
    },
    {
      id: 'style',
      icon: 'home-outline',
      label: 'Hotel style',
      action: 'SELECT_STYLE'
    }
  ];
  
  // Format date range helper
  const formatDateRange = (checkin?: string, checkout?: string) => {
    if (!checkin || !checkout) return null;
    
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr + 'T12:00:00');
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    };
    
    return `${formatDate(checkin)} - ${formatDate(checkout)}`;
  };
  
  // Format guests helper
  const formatGuestInfo = (adults?: number, children?: number) => {
    if (adults === undefined || adults === null) return null;
    
    let guestStr = `${adults} adult${adults !== 1 ? 's' : ''}`;
    if (children && children > 0) {
      guestStr += `, ${children} child${children !== 1 ? 'ren' : ''}`;
    }
    return guestStr;
  };
  
  // Keyboard listeners
  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        lastKeyboardHeightRef.current = e.endCoordinates.height;
      }
    );

    return () => {
      showListener.remove();
    };
  }, []);
  
  // Generate initial welcome message
  const generateInitialMessage = async () => {
    if (messages.length > 0) return;
    
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
          isInitialMessage: true,
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
  
const openChat = () => {
  const id = startChatConversation(currentSearch);
  setConversationId(id);

  if (closeCooldownRef.current) return;

  chatExpanded.setValue(0);
  inputTranslateY.setValue(0);

  setIsChatOpen(true);

  // Fade out date/guest info
  Animated.timing(infoOpacity, {
    toValue: 0,
    duration: 200,
    useNativeDriver: true,
  }).start();

  // wait for pills to mount & layout
  setTimeout(() => {
    const gap = -115;

    if (!pillsTopYRef.current || !inputStartYRef.current) {
      console.warn('Layout not ready for morph animation');
      return;
    }

    // absolute Y where input should land
    const targetAbsY =
      pillsTopYRef.current - INPUT_HEIGHT - gap;

    // translate delta from starting Y
    const deltaY =
      targetAbsY - inputStartYRef.current;

    chatBottomPositionRef.current = gap + INPUT_HEIGHT;

    Animated.parallel([
      Animated.spring(chatExpanded, {
        toValue: 1,
        tension: 280,
        friction: 30,
        useNativeDriver: true,
      }),
      Animated.spring(inputTranslateY, {
        toValue: deltaY,
        tension: 280,
        friction: 30,
        useNativeDriver: true,
      }),
    ]).start();
  }, 60);

  if (messages.length === 0) {
    generateInitialMessage();
  }

  setTimeout(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, 300);

  setTimeout(() => inputRef.current?.focus(), 120);
};

  // Close chat animation
  const closeChat = () => {
    setConversationId(null);

    if (closeCooldownRef.current) return;
    
    closeCooldownRef.current = true;
    setIsCooldown(true);
    Keyboard.dismiss();
    setMessage('');
    
    Animated.parallel([
      Animated.spring(chatExpanded, {
        toValue: 0,
        tension: 280,
        friction: 30,
        useNativeDriver: true,
      }),
      Animated.spring(inputTranslateY, {
        toValue: 0,
        tension: 280,
        friction: 30,
        useNativeDriver: true,
      }),
      Animated.timing(infoOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setTimeout(() => {
        closeCooldownRef.current = false;
        setIsCooldown(false);
      }, 800);
      
      setIsChatOpen(false);
      chatBottomPositionRef.current = 0;
    });
  };
  
  // Send message handler
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const trimmedMessage = message.trim().toLowerCase();
    const pendingRefinement = messages.find(msg => msg.refinementData);
    
    if (pendingRefinement && (trimmedMessage === 'yes' || trimmedMessage === 'no')) {
      if (trimmedMessage === 'yes') {
        handleConfirmRefinement(pendingRefinement.refinementData!.query, pendingRefinement.id);
      } else {
        handleDeclineRefinement(pendingRefinement.id);
      }
      setMessage('');
      return;
    }
    
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

    if (conversationId) {
  await logChatMessage({
    conversationId,
    role: 'user',
    text: userMessage.content,
    searchQuery: currentSearch,
  });
}

    
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoadingResponse(true);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      const response = await fetch(`${BASE_URL}/api/hotels/ai-search-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.filter(msg => !msg.refinementData),
          currentSearch,
          hotelContext,
          searchParams,
        }),
      });
      
      const data = await response.json();
      
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
      if (conversationId) {
  await logChatMessage({
    conversationId,
    role: 'assistant',
    text: assistantMessage.content,
    searchQuery: currentSearch,
  });
}

      
      setMessages(prev => [...prev, assistantMessage]);
      
      if (conversationId) {
  await logChatMessage({
    conversationId,
    role: 'assistant',
    text: assistantMessage.content,
    searchQuery: currentSearch,
  });
}

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
// Handle refinement confirmation
const handleConfirmRefinement = (query: string, messageId: string) => {
  setMessages(prev => 
    prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, refinementData: undefined }
        : msg
    )
  );
  
  onSearchRefined(query, currentSearch);
  closeChat();
};

  const handleDeclineRefinement = (messageId: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, refinementData: undefined }
          : msg
      )
    );
    
    const followUpMessage: Message = {
      id: (Date.now() + 2).toString(),
      role: 'assistant',
      content: "Okay, I won't refresh the search. What else can I help you with?",
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, followUpMessage]);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };
  
  // Handle pill presses
  const handlePillPress = (pill: RefinePill) => {
    console.log('Pill pressed:', pill.id, pill.action);
    
    Keyboard.dismiss();
    
    setTimeout(() => {
      if (pill.action === 'ADD_DATES') {
        setShowDateModal(true);
        return;
      }
      
      if (pill.action === 'SET_BUDGET') {
        setShowBudgetModal(true);
        return;
      }
      
      if (pill.action === 'ADD_GUESTS') {
        setShowGuestsModal(true);
        return;
      }
      
      if (pill.action === 'SELECT_AMENITIES') {
        setShowAmenitiesModal(true);
        return;
      }
      
      if (pill.action === 'SELECT_STYLE') {
        setShowStylesModal(true);
        return;
      }
    }, 100);
  };

  // Extract API call logic
  const sendMessageToAPI = async (messageContent: string) => {
    try {
      const response = await fetch(`${BASE_URL}/api/hotels/ai-search-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          conversationHistory: messages.filter(msg => !msg.refinementData),
          currentSearch,
          hotelContext,
          searchParams,
        }),
      });
      
      const data = await response.json();
      
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

  const handleDateSelect = (checkIn: Date, checkOut: Date) => {
    const formatDateForSearch = (date: Date): string => {
      const options: Intl.DateTimeFormatOptions = { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      };
      return date.toLocaleDateString('en-US', options);
    };

    const checkInText = formatDateForSearch(checkIn);
    const checkOutText = formatDateForSearch(checkOut);
    const conversationalText = `I'm looking for hotels from ${checkInText} to ${checkOutText}`;
    
    console.log('Date selected:', conversationalText);
    setShowDateModal(false);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: conversationalText,
      timestamp: new Date(),
    };
    if (conversationId) {
  logChatMessage({
    conversationId,
    role: 'user',
    text: conversationalText,
    searchQuery: currentSearch,
  });
}

    setMessages(prev => [...prev, userMessage]);
    setIsLoadingResponse(true);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    sendMessageToAPI(conversationalText);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  };

  const handleBudgetSelect = (budgetText: string) => {
    console.log('Budget selected:', budgetText);
    const conversationalText = `I'd like to keep my budget ${budgetText}`;
    
    setShowBudgetModal(false);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: conversationalText,
      timestamp: new Date(),
    };
    if (conversationId) {
  logChatMessage({
    conversationId,
    role: 'user',
    text: conversationalText,
    searchQuery: currentSearch,
  });
}

    
    setMessages(prev => [...prev, userMessage]);
    setIsLoadingResponse(true);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    sendMessageToAPI(conversationalText);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  };

  const handleGuestsSelect = (guestsText: string) => {
    console.log('Guests selected:', guestsText);
    const conversationalText = `I'm traveling with ${guestsText}`;
    
    setShowGuestsModal(false);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: conversationalText,
      timestamp: new Date(),
    };
    if (conversationId) {
  logChatMessage({
    conversationId,
    role: 'user',
    text: conversationalText,
    searchQuery: currentSearch,
  });
}

    
    setMessages(prev => [...prev, userMessage]);
    setIsLoadingResponse(true);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    sendMessageToAPI(conversationalText);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  };

  const handleAmenitiesSelect = (amenitiesText: string) => {
    console.log('Amenities selected:', amenitiesText);
    const conversationalText = `I need hotels with ${amenitiesText}`;
    
    setShowAmenitiesModal(false);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: conversationalText,
      timestamp: new Date(),
    };

    if (conversationId) {
  logChatMessage({
    conversationId,
    role: 'user',
    text: conversationalText,
    searchQuery: currentSearch,
  });
}

    
    setMessages(prev => [...prev, userMessage]);
    setIsLoadingResponse(true);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    sendMessageToAPI(conversationalText);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  };

  const handleStylesSelect = (stylesText: string) => {
    console.log('Hotel styles selected:', stylesText);
    const conversationalText = `I'm looking for ${stylesText} hotels`;
    
    setShowStylesModal(false);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: conversationalText,
      timestamp: new Date(),
    };
    
    if (conversationId) {
  logChatMessage({
    conversationId,
    role: 'user',
    text: conversationalText,
    searchQuery: currentSearch,
  });
}

    setMessages(prev => [...prev, userMessage]);
    setIsLoadingResponse(true);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    sendMessageToAPI(conversationalText);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  };
  
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
  
  const fixedBottom =
    (lastKeyboardHeightRef.current || 350) +
    INPUT_HEIGHT +
    insets.bottom -
    40 +
    PILLS_HEIGHT;
  
  // Only show dates/guests if we have CONFIRMED data from search params (not defaults)
  // We check if the data is coming from actual search params, not just fallback values
  const hasConfirmedDates = !searchParamsLoading && 
                            searchParams.checkin && 
                            searchParams.checkout;
  
  const hasConfirmedGuests = !searchParamsLoading && 
                             searchParams.adults !== undefined && 
                             searchParams.adults !== null &&
                             (searchParams.checkin !== undefined); // Only show if we have search params at all
  
  const dateRange = hasConfirmedDates ? formatDateRange(searchParams.checkin, searchParams.checkout) : null;
  const guestInfo = hasConfirmedGuests ? formatGuestInfo(searchParams.adults, searchParams.children) : null;
  
  return (
    <>
      {/* Overlay behind chat */}
      {isChatOpen && (
        <TouchableWithoutFeedback onPress={closeChat}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: -insets.top,
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
        <View
          style={[
            {
              position: 'absolute',
              top: TOP_POSITION + INPUT_HEIGHT - 50,
              left: 0,
              right: 0,
              bottom: fixedBottom,
              zIndex: 999,
            },
          ]}
          pointerEvents="box-none"
        >
          <Animated.View 
            style={[
              tw`flex-1`,
              {
                opacity: chatContainerOpacity,
                transform: [{ translateY: chatContainerTranslateY }],
              }
            ]}
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
                          {parseMessageText(msg.content).map((part, index) => (
                            <Text
                              key={index}
                              style={{
                                fontFamily: part.bold ? 'Merriweather-Bold' : 'Merriweather-Regular',
                                fontSize: 14,
                                color: msg.role === 'user' ? '#fff' : '#111827',
                              }}
                            >
                              {part.text}
                            </Text>
                          ))}
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
                          Ready to see new results?
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
        </View>
      )}
      
      {/* REFINE PILLS */}
{isChatOpen && (
  <View
    onLayout={(e) => {
      pillsTopYRef.current = e.nativeEvent.layout.y;
    }}
    style={[
      {
        position: 'absolute',
        bottom: fixedBottom - PILLS_HEIGHT - 8,
        left: 0,
        right: 0,
        height: PILLS_HEIGHT,
        zIndex: 999,
      },
    ]}
  >


          <Animated.View
            style={{
              opacity: chatContainerOpacity,
            }}
          >
            <View style={tw`px-4`}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw`py-2`}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="on-drag"
                style={tw`flex-grow-0`}
              >
                {refinePills.map((pill) => (
                  <TouchableOpacity
                    key={pill.id}
                    onPress={() => handlePillPress(pill)}
                    activeOpacity={0.8}
                    style={[
                      tw`mr-2 px-2.5 py-2.5 rounded-xl flex-row items-center bg-white border border-gray-200`,
                      {
                        shadowColor: '#000',
                        shadowOffset: {
                          width: 0,
                          height: 1,
                        },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 3,
                      }
                    ]}
                  >
                    <View style={[
                      tw`w-6 h-6 rounded-full items-center justify-center mr-2`,
                      { backgroundColor: TURQUOISE_LIGHT }
                    ]}>
                      <Ionicons
                        name={pill.icon}
                        size={14}
                        color={TURQUOISE}
                      />
                    </View>
                    
                    <Text style={{
                      fontFamily: 'Merriweather-Regular',
                      fontSize: 13,
                      color: '#374151',
                      marginRight: 4,
                    }}>
                      {pill.label}
                    </Text>
                    
                    <Ionicons
                      name="add"
                      size={14}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      )}
      
      {/* MORPHING INPUT */}
<Animated.View
  onLayout={(e) => {
    inputStartYRef.current = e.nativeEvent.layout.y;
  }}
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
              shadowRadius: isChatOpen ? 4 : 6,
              elevation: 5,
            },
          ]}
        >
          {!isChatOpen && (
            <TouchableOpacity
              style={tw`w-8 h-8 items-center justify-center mr-3`}
              onPress={onBackPress}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#374151" />
            </TouchableOpacity>
          )}
          
          {isChatOpen && (
            <TouchableOpacity
              style={tw`w-8 h-8 items-center justify-center mr-3`}
              onPress={closeChat}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#374151" />
            </TouchableOpacity>
          )}
          
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
                : "Refine your search with Genie"
            }
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={setMessage}
            editable={!isCooldown}
            onFocus={() => {
              if (!isChatOpen && !isCooldown) {
                openChat();
              }
            }}
            onBlur={() => {
              if (isChatOpen && !isCooldown) {
                setTimeout(() => {
                  inputRef.current?.focus();
                }, 0);
              }
            }}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
          />
          
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
      
      {/* DATE/GUESTS INFO DISPLAY - Below input, disappears when chat opens */}
      {!isChatOpen && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: TOP_POSITION + INPUT_HEIGHT + 8,
              left: 16,
              right: 16,
              height: INFO_HEIGHT,
              zIndex: 999,
              opacity: infoOpacity,
            },
          ]}
        >
          <View style={tw`flex-row items-center justify-center`}>
            {/* Date Info */}
            <View style={tw`flex-row items-center mr-4`}>
              <Ionicons name="calendar-outline" size={13} color="#6B7280" />
              <Text style={{
                fontFamily: 'Merriweather-Regular',
                fontSize: 12,
                color: hasConfirmedDates ? '#6B7280' : '#9CA3AF',
                marginLeft: 6,
                fontStyle: hasConfirmedDates ? 'normal' : 'italic'
              }}>
                {hasConfirmedDates 
                  ? dateRange 
                  : 'Loading dates...'
                }
              </Text>
            </View>
            
            {/* Separator */}
            <View style={[
              tw`rounded-full`,
              { width: 3, height: 3, backgroundColor: '#D1D5DB' }
            ]} />
            
            {/* Guest Info */}
            <View style={tw`flex-row items-center ml-4`}>
              <Ionicons name="people-outline" size={13} color="#6B7280" />
              <Text style={{
                fontFamily: 'Merriweather-Regular',
                fontSize: 12,
                color: hasConfirmedGuests ? '#6B7280' : '#9CA3AF',
                marginLeft: 6,
                fontStyle: hasConfirmedGuests ? 'normal' : 'italic'
              }}>
                {hasConfirmedGuests 
                  ? guestInfo 
                  : 'Loading guest info...'
                }
              </Text>
            </View>
          </View>
        </Animated.View>
      )}
      
      {/* Modals */}
      {showDateModal && (
        <DateSelectionModal
          visible={showDateModal}
          onClose={() => setShowDateModal(false)}
          onDateSelect={handleDateSelect}
        />
      )}

      {showBudgetModal && (
        <BudgetSelectionModal
          visible={showBudgetModal}
          onClose={() => setShowBudgetModal(false)}
          onBudgetSelect={handleBudgetSelect}
        />
      )}

      {showGuestsModal && (
        <GuestsSelectionModal
          visible={showGuestsModal}
          onClose={() => setShowGuestsModal(false)}
          onGuestsSelect={handleGuestsSelect}
        />
      )}

      {showAmenitiesModal && (
        <AmenitiesSelectionModal
          visible={showAmenitiesModal}
          onClose={() => setShowAmenitiesModal(false)}
          onAmenitiesSelect={handleAmenitiesSelect}
        />
      )}

      {showStylesModal && (
        <HotelStylesSelectionModal
          visible={showStylesModal}
          onClose={() => setShowStylesModal(false)}
          onStylesSelect={handleStylesSelect}
        />
      )}
    </>
  );
};

export default MorphingSearchChat;