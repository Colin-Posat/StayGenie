// HomeScreen.tsx - Updated with twrnc styling
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  FlatList,
  LayoutAnimation,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import ListView from '../components/ListView/ListView';
import SwipeView from '../components/StoryView/SwipeView';

// Animated Toggle Button Component
interface AnimatedToggleButtonProps {
  showSwipeView: boolean;
  onViewToggle: (viewType: 'list' | 'swipe') => void;
}

const AnimatedToggleButton: React.FC<AnimatedToggleButtonProps> = ({
  showSwipeView,
  onViewToggle,
}) => {
  // Animation values
  const slideAnimation = useRef(new Animated.Value(showSwipeView ? 1 : 0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  
  // Button width for slide calculation
  const buttonWidth = 85;
  
  // Update animation when showSwipeView changes
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnimation, {
        toValue: showSwipeView ? 1 : 0,
        useNativeDriver: false,
        tension: 150,
        friction: 8,
      }),
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [showSwipeView]);

  // Glow effect animation
  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    
    glowLoop.start();
    
    return () => glowLoop.stop();
  }, []);

  const handlePress = (viewType: 'list' | 'swipe') => {
    // Scale animation on press
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.9,
        duration: 75,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onViewToggle(viewType);
  };

  // Calculate slide position
  const slideLeft = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, buttonWidth],
  });

  // Interpolate glow opacity
  const glowOpacity = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <Animated.View
      style={[
        tw`relative`,
        {
          transform: [{ scale: scaleAnimation }],
        },
      ]}
    >
      {/* Background glow effect */}
      <Animated.View
        style={[
          tw`absolute -top-1 -left-1 -right-1 -bottom-1 bg-black/10 rounded-3xl`,
          {
            opacity: glowOpacity,
          },
        ]}
      />
      
      {/* Toggle container */}
      <View style={tw`flex-row bg-gray-100 rounded-3xl border border-gray-200 overflow-hidden relative z-10 h-11`}>
        {/* Animated sliding background */}
        <Animated.View
          style={[
            tw`absolute top-0.5 w-21 h-10.5 bg-black rounded-2xl shadow-lg`,
            {
              left: slideLeft,
            },
          ]}
        />
        
        {/* List Button */}
        <TouchableOpacity
          style={tw`items-center justify-center py-2.5 px-5 w-21 h-11 z-20`}
          onPress={() => handlePress('list')}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              tw`flex-row items-center gap-1.5`,
              {
                opacity: slideAnimation.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 0.7, 0.5],
                }),
              },
            ]}
          >
            <Ionicons 
              name="list" 
              size={16} 
              color={!showSwipeView ? '#FFFFFF' : '#666666'} 
            />
            <Text style={tw`text-sm font-semibold ${!showSwipeView ? 'text-white' : 'text-gray-500'}`}>
              List
            </Text>
          </Animated.View>
        </TouchableOpacity>
        
        {/* Swipe Button */}
        <TouchableOpacity
          style={tw`items-center justify-center py-2.5 px-5 w-21 h-11 z-20`}
          onPress={() => handlePress('swipe')}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              tw`flex-row items-center gap-1.5`,
              {
                opacity: slideAnimation.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.5, 0.7, 1],
                }),
              },
            ]}
          >
            <Ionicons 
              name="layers" 
              size={16} 
              color={showSwipeView ? '#FFFFFF' : '#666666'} 
            />
            <Text style={tw`text-sm font-semibold ${showSwipeView ? 'text-white' : 'text-gray-500'}`}>
              Story
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

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

interface Hotel {
  id: number;
  name: string;
  image: string;
  price: number;
  originalPrice: number;
  priceComparison: string;
  rating: number;
  reviews: number;
  safetyRating: number;
  transitDistance: string;
  tags: string[];
  location: string;
  features: string[];
}

const mockHotels: Hotel[] = [
  {
    id: 1,
    name: "Grand Plaza Downtown",
    image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80",
    price: 189,
    originalPrice: 220,
    priceComparison: "15% below average",
    rating: 4.6,
    reviews: 1248,
    safetyRating: 9.2,
    transitDistance: "2 min walk",
    tags: ["Pet-friendly", "Business center", "Gym"],
    location: "Downtown Core",
    features: ["Free WiFi", "Pool", "Parking"]
  },
  {
    id: 2,
    name: "Cozy Family Inn",
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80",
    price: 129,
    originalPrice: 145,
    priceComparison: "11% below average",
    rating: 4.4,
    reviews: 892,
    safetyRating: 8.7,
    transitDistance: "5 min walk",
    tags: ["Family-friendly", "Kitchen", "Laundry"],
    location: "Arts District",
    features: ["Free Breakfast", "WiFi", "Family rooms"]
  },
  {
    id: 3,
    name: "Luxury Riverside Resort",
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
    price: 295,
    originalPrice: 275,
    priceComparison: "7% above average",
    rating: 4.8,
    reviews: 2156,
    safetyRating: 9.5,
    transitDistance: "8 min walk",
    tags: ["Luxury", "Spa", "Fine dining"],
    location: "Riverside",
    features: ["Spa", "Restaurant", "Concierge"]
  }
];

const HomeScreen = () => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkInDate, setCheckInDate] = useState<Date>(new Date());
  const [checkOutDate, setCheckOutDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [showSwipeView, setShowSwipeView] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectingDate, setSelectingDate] = useState<'checkin' | 'checkout'>('checkin');

  // Auto-typing setup
  const hotelSearchSuggestions = [
    "Luxury hotels in Dubai",
    "Beach resorts in Maldives", 
    "City breaks in Barcelona",
    "Mountain lodges in Swiss Alps",
    "Boutique hotels in Paris",
    "Safari lodges in Kenya",
    "Ski resorts in Aspen",
    "Historic hotels in Rome",
    "Beach villas in Santorini",
    "Spa resorts in Bali"
  ];

  const { displayText, cursorVisible } = useTypingPlaceholder(
    hotelSearchSuggestions,
    120,
    60,
    2500
  );

  // Event handlers
  const handleVoiceSearch = useCallback(() => {
    console.log('Voice button pressed');
    setIsListening(!isListening);
    setTimeout(() => {
      setIsListening(false);
      setSearchQuery("Hotels with pool and spa in Bali");
    }, 2000);
  }, [isListening]);

  const handleSearch = useCallback(() => {
    console.log('Searching for:', searchQuery);
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    console.log('Clear button pressed');
    setSearchQuery('');
  }, []);

  const handleDateSelect = useCallback((type: 'checkin' | 'checkout') => {
    console.log('Opening date picker for:', type);
    setSelectingDate(type);
    setShowDatePicker(true);
  }, []);

  // Enhanced view toggle handler with layout animation
  const handleViewToggle = useCallback((viewType: 'list' | 'swipe') => {
    console.log(`${viewType} view selected`);
    
    // Add smooth layout transition
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext({
        duration: 300,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
      });
    }
    
    setShowSwipeView(viewType === 'swipe');
  }, []);

  const handleHotelPress = useCallback((hotel: Hotel) => {
    console.log('Hotel selected:', hotel.name);
  }, []);

  const handleBookNow = useCallback((hotel: Hotel) => {
    console.log('Book now pressed for:', hotel.name);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getPlaceholderText = () => {
    if (!isFocused && !searchQuery) {
      return `${displayText}${cursorVisible ? '|' : ''}`;
    }
    return "Search for amazing stays...";
  };

  const handleDateChange = (selectedDate: Date) => {
    if (selectingDate === 'checkin') {
      setCheckInDate(selectedDate);
      if (selectedDate >= checkOutDate) {
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        setCheckOutDate(nextDay);
      }
    } else {
      setCheckOutDate(selectedDate);
    }
    setShowDatePicker(false);
  };

  const generateCalendarDays = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();
    
    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ key: `empty-${i}`, day: null, date: null });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = 
        (selectingDate === 'checkin' && date.toDateString() === checkInDate.toDateString()) ||
        (selectingDate === 'checkout' && date.toDateString() === checkOutDate.toDateString());
      
      const isDisabled = 
        selectingDate === 'checkin' 
          ? date < today
          : date <= checkInDate;
      
      days.push({
        key: `day-${day}`,
        day,
        date,
        isToday,
        isSelected,
        isDisabled
      });
    }
    
    return days;
  };

  const renderCalendarDay = ({ item }: any) => {
    if (!item.day) {
      return <View style={tw`flex-1 h-11 m-0.5`} />;
    }
    
    return (
      <TouchableOpacity
        style={tw`flex-1 h-11 m-0.5 items-center justify-center rounded-lg ${
          item.isToday ? 'bg-gray-100' : ''
        } ${
          item.isSelected ? 'bg-black' : ''
        } ${
          item.isDisabled ? 'opacity-30' : ''
        }`}
        onPress={() => !item.isDisabled && handleDateChange(item.date)}
        disabled={item.isDisabled}
        activeOpacity={0.7}
      >
        <Text
          style={tw`text-base font-medium text-black ${
            item.isToday ? 'font-bold' : ''
          } ${
            item.isSelected ? 'text-white font-bold' : ''
          } ${
            item.isDisabled ? 'text-gray-300' : ''
          }`}
        >
          {item.day}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* SEARCH HEADER */}
      <View style={tw`px-5 pt-3 pb-4 bg-white`}>
        <View style={tw`flex-row items-center gap-3`}>
          <View style={tw`flex-1 flex-row items-center bg-gray-50 rounded-2xl px-4 py-3.5 border border-gray-100 gap-2.5 ${isFocused ? 'border-black bg-white' : ''}`}>
            <Ionicons name="search" size={20} color="#666666" />
            <TextInput
              style={tw`flex-1 text-base text-black font-normal`}
              placeholder={getPlaceholderText()}
              placeholderTextColor="#999999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={tw`p-1`}
                onPress={handleClearSearch}
                activeOpacity={0.6}
              >
                <Ionicons name="close-circle" size={20} color="#666666" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            style={tw`w-13 h-13 rounded-full bg-black items-center justify-center ${isListening ? 'bg-gray-800' : ''}`}
            onPress={handleVoiceSearch}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isListening ? "stop" : "mic"} 
              size={20} 
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* LISTENING INDICATOR */}
        {isListening && (
          <View style={tw`items-center mt-3 py-2.5 px-4 bg-gray-50 rounded-lg self-center`}>
            <View style={tw`flex-row items-center gap-1 mb-1.5`}>
              <View style={tw`w-1 h-2 bg-black rounded-full`} />
              <View style={tw`w-1 h-4 bg-black rounded-full`} />
              <View style={tw`w-1 h-6 bg-black rounded-full`} />
              <View style={tw`w-1 h-5 bg-black rounded-full`} />
              <View style={tw`w-1 h-3 bg-black rounded-full`} />
            </View>
            <Text style={tw`text-sm text-gray-600 font-medium`}>Listening...</Text>
          </View>
        )}
      </View>

      {/* CONTROLS ROW */}
      <View style={tw`flex-row justify-between items-center px-5 pb-4 gap-3`}>
        {/* DATE SELECTOR */}
        <View style={tw`flex-row items-center bg-gray-50 rounded-xl border border-gray-100 overflow-hidden`}>
          <TouchableOpacity
            style={tw`py-3 px-4 items-center min-w-20`}
            onPress={() => handleDateSelect('checkin')}
            activeOpacity={0.7}
          >
            <Text style={tw`text-xs text-gray-600 font-medium mb-0.5`}>Check-in</Text>
            <Text style={tw`text-sm text-black font-semibold`}>{formatDate(checkInDate)}</Text>
          </TouchableOpacity>
          
          <View style={tw`w-px h-7 bg-gray-300`} />
          
          <TouchableOpacity
            style={tw`py-3 px-4 items-center min-w-20`}
            onPress={() => handleDateSelect('checkout')}
            activeOpacity={0.7}
          >
            <Text style={tw`text-xs text-gray-600 font-medium mb-0.5`}>Check-out</Text>
            <Text style={tw`text-sm text-black font-semibold`}>{formatDate(checkOutDate)}</Text>
          </TouchableOpacity>
        </View>
        
        {/* ANIMATED VIEW TOGGLE */}
        <AnimatedToggleButton
          showSwipeView={showSwipeView}
          onViewToggle={handleViewToggle}
        />
      </View>
      
      {/* CONTENT VIEW */}
      {showSwipeView ? (
        <SwipeView 
          hotels={mockHotels}
          onHotelPress={handleHotelPress}
          onBookNow={handleBookNow}
        />
      ) : (
        <ListView 
          hotels={mockHotels}
          onHotelPress={handleHotelPress}
          onBookNow={handleBookNow}
        />
      )}
      
      {/* DATE PICKER MODAL */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={tw`flex-1 bg-black/30 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl px-6 pb-10 max-h-4/5`}>
            <View style={tw`w-10 h-1 bg-gray-300 rounded-full self-center mt-3 mb-6`} />
            
            <View style={tw`flex-row justify-between items-center mb-8`}>
              <Text style={tw`text-xl text-black font-bold`}>
                Select {selectingDate === 'checkin' ? 'check-in' : 'check-out'} date
              </Text>
              <TouchableOpacity
                style={tw`w-9 h-9 items-center justify-center rounded-2xl`}
                onPress={() => setShowDatePicker(false)}
                activeOpacity={0.6}
              >
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
            <View style={tw`items-center mb-6 py-4 bg-gray-50 rounded-xl`}>
              <Text style={tw`text-lg text-black font-semibold`}>
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
            </View>
            
            <View style={tw`flex-row mb-4`}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, index) => (
                <View key={index} style={tw`flex-1 items-center py-3`}>
                  <Text style={tw`text-sm text-gray-600 font-semibold`}>{day}</Text>
                </View>
              ))}
            </View>
            
            <FlatList
              data={generateCalendarDays()}
              renderItem={renderCalendarDay}
              numColumns={7}
              style={tw`mb-8`}
              scrollEnabled={false}
            />
            
            <TouchableOpacity
              style={tw`bg-black py-4 rounded-xl items-center`}
              onPress={() => setShowDatePicker(false)}
              activeOpacity={0.8}
            >
              <Text style={tw`text-white text-base font-bold`}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HomeScreen;