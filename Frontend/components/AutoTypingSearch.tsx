import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text as RNText,
  TextInput,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

import { Text } from '../components/CustomText'; 

// Custom hook for auto-typing placeholder text
const useTypingPlaceholder = (
  words: string[], 
  typingSpeed = 100, 
  deletingSpeed = 50, 
  delayAfterWord = 2000
) => {
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  
  const currentIndex = useRef(0);
  const currentWord = words[wordIndex];

  // Handle cursor blinking
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);
    
    return () => clearInterval(cursorInterval);
  }, []);

  // Handle typing animation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isDeleting) {
        // Deleting text
        setDisplayText(currentWord.substring(0, currentIndex.current - 1));
        currentIndex.current -= 1;
        
        // When deletion is complete, move to next word
        if (currentIndex.current <= 0) {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length);
        }
      } else {
        // Typing text
        setDisplayText(currentWord.substring(0, currentIndex.current + 1));
        currentIndex.current += 1;
        
        // When word is complete, pause then start deleting
        if (currentIndex.current >= currentWord.length) {
          setTimeout(() => {
            setIsDeleting(true);
          }, delayAfterWord);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);
    
    return () => clearTimeout(timer);
  }, [currentWord, isDeleting, typingSpeed, deletingSpeed, delayAfterWord, words]);

  return { displayText, cursorVisible };
};

interface AutoTypingSearchProps {
  placeholder?: string;
  staticPlaceholder?: string;
  typingWords?: string[];
  onChangeText?: (text: string) => void;
  onSubmitEditing?: () => void;
  onVoicePress?: () => void;
  isListening?: boolean;
  value?: string;
  style?: any;
}

const AutoTypingSearch: React.FC<AutoTypingSearchProps> = ({
  placeholder = "Search for amazing destinations...",
  staticPlaceholder = "Find your perfect stay...",
  typingWords = [
    "Hotels in Bali",
    "Resorts in Tokyo", 
    "Hostels in Paris",
    "Villas in Santorini",
    "Boutique hotels in NYC",
    "Beach resorts in Maldives",
    "Mountain lodges in Alps",
    "City hotels in London"
  ],
  onChangeText,
  onSubmitEditing,
  onVoicePress,
  isListening = false,
  value = '',
  style
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  
  const { displayText, cursorVisible } = useTypingPlaceholder(
    typingWords,
    120,  // typing speed in ms
    60,   // deleting speed in ms
    2500  // delay after completing word in ms
  );

  // Animate border on focus
  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const handleVoicePress = () => {
    if (onVoicePress) {
      onVoicePress();
    }
  };

  const handleClear = () => {
    if (onChangeText) {
      onChangeText('');
    }
  };

  const getPlaceholderText = () => {
    if (isLoadingSearch) {
      return "Searching...";
    }
    
    if (!isFocused && !value) {
      return `${displayText}${cursorVisible ? '|' : ''}`;
    }
    
    return staticPlaceholder;
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E2E8F0', '#6366F1'], // slate-300 to indigo-500
  });

  const shadowOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 0.15],
  });

  return (
    <View style={[tw`w-full`, style]}>
      <Animated.View
        style={[
          tw`flex-row items-center bg-slate-50 rounded-3xl px-5 py-4 border-2 shadow-sm`,
          {
            borderColor,
            shadowOpacity,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
            elevation: 3,
          }
        ]}
      >
        <View style={tw`mr-3 p-1`}>
          <Ionicons name="search" size={22} color="#6366F1" />
        </View>
        
        <TextInput
          style={tw`flex-1 text-base text-gray-800 font-medium leading-5`}
          placeholder={getPlaceholderText()}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={false}
          autoCorrect={false}
          autoCapitalize="none"
        />
        
        {value.length > 0 && (
          <TouchableOpacity 
            style={tw`p-1 ml-2`}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            tw`w-11 h-11 rounded-full items-center justify-center ml-2`,
            isListening && tw`shadow-red-500/25 shadow-lg`
          ]}
          onPress={handleVoicePress}
          activeOpacity={0.7}
        >
          <View style={[
            tw`w-9 h-9 rounded-full bg-slate-100 items-center justify-center border border-slate-200`,
            isListening && tw`bg-red-500 border-red-600`
          ]}>
            <Ionicons 
              name={isListening ? "stop" : "mic"} 
              size={18} 
              color={isListening ? "#FFFFFF" : "#6366F1"} 
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
      
      {isListening && (
        <View style={tw`items-center mt-4 py-4 px-6 bg-slate-50 rounded-2xl border border-slate-200`}>
          <View style={tw`flex-row items-center gap-1 mb-3`}>
            <Animated.View style={tw`w-1 h-2 bg-indigo-500 rounded-sm`} />
            <Animated.View style={tw`w-1 h-4 bg-indigo-500 rounded-sm`} />
            <Animated.View style={tw`w-1 h-6 bg-indigo-500 rounded-sm`} />
            <Animated.View style={tw`w-1 h-5 bg-indigo-500 rounded-sm`} />
            <Animated.View style={tw`w-1 h-3 bg-indigo-500 rounded-sm`} />
          </View>
          <Text style={tw`text-sm text-gray-500 font-semibold`}>
            Listening for your voice...
          </Text>
        </View>
      )}
    </View>
  );
};

// Enhanced version of your HomeScreen component with AutoTypingSearch integrated
const EnhancedHomeScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleVoiceSearch = () => {
    setIsListening(!isListening);
    setTimeout(() => {
      setIsListening(false);
      setSearchQuery("Hotels with pool and spa in Bali");
    }, 2000);
  };

  const handleSearch = () => {
    console.log('Searching for:', searchQuery);
    // Your search logic here
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      <View style={tw`px-5 pt-4 pb-5 bg-white`}>
        <AutoTypingSearch
          value={searchQuery}
          onChangeText={handleSearchChange}
          onSubmitEditing={handleSearch}
          onVoicePress={handleVoiceSearch}
          isListening={isListening}
          typingWords={[
            "Luxury hotels in Dubai",
            "Beach resorts in Maldives", 
            "City breaks in Barcelona",
            "Mountain lodges in Swiss Alps",
            "Boutique hotels in Paris",
            "Safari lodges in Kenya",
            "Ski resorts in Aspen",
            "Historic hotels in Rome"
          ]}
          staticPlaceholder="Discover amazing stays worldwide..."
        />
      </View>
      
      {/* Rest of your home screen content */}
      <View style={tw`flex-1 px-5 pt-5`}>
        <Text style={tw`text-base font-semibold text-gray-900 text-center`}>
          {searchQuery ? `Searching for: "${searchQuery}"` : 'Start typing to search...'}
        </Text>
      </View>
    </View>
  );
};

export { AutoTypingSearch, EnhancedHomeScreen };
export default AutoTypingSearch;