// SearchQueryCarousel.tsx - Horizontal carousel for search queries with hotels
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import BeautifulHotelCard, { BeautifulHotel } from './BeautifulHotelCard';

const { width } = Dimensions.get('window');
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const TURQUOISE_SUBTLE = '#f0feff'; // Very light turquoise background
const TURQUOISE_BORDER = '#b3f7ff'; // Light turquoise border

interface SearchQueryCarouselProps {
  searchQuery: string;
  hotels: BeautifulHotel[];
  onSearchPress: (query: string) => void;
  onHotelPress?: (hotel: BeautifulHotel) => void;
  index?: number; // For staggered animations
}

const SearchQueryCarousel: React.FC<SearchQueryCarouselProps> = ({
  searchQuery,
  hotels,
  onSearchPress,
  onHotelPress,
  index = 0,
}) => {
  const fadeAnimation = React.useRef(new Animated.Value(0)).current;
  const slideAnimation = React.useRef(new Animated.Value(30)).current;
  const [isChevronPressed, setIsChevronPressed] = useState(false);

  useEffect(() => {
    // Staggered animation based on index
    const delay = index * 200;
    
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
  }, [index]);

  const handleSearchPress = () => {
    setIsChevronPressed(true);
    
    // Reset pressed state after delay (like pill wheel)
    setTimeout(() => {
      setIsChevronPressed(false);
    }, 150);
    
    onSearchPress(searchQuery);
  };

  const handleHotelPress = (hotel: BeautifulHotel) => {
    // Default behavior is to open Google Maps (handled in BeautifulHotelCard)
    onHotelPress?.(hotel);
  };

  // Calculate card dimensions for horizontal scroll - much larger and properly spaced
  const cardWidth = 180; // Increased from 140 - wider than recent search cards
  const cardHeight = 200; // Increased significantly for square-like ratio but taller
  const cardMargin = 8; // Reduced from 16 to make smaller gaps between cards

  // Dynamic text size based on query length to prevent line breaks
  const getTextSize = (text: string) => {
    if (text.length > 60) return 'text-xs'; // Very long text
    if (text.length > 40) return 'text-sm'; // Long text
    return 'text-base'; // Default size for shorter text
  };

  return (
    <Animated.View
      style={[
        tw`w-full mb-0`,
        {
          opacity: fadeAnimation,
          transform: [{ translateY: slideAnimation }],
        },
      ]}
    >
      {/* Search Query Header with Pill-Style Chevron */}
      <TouchableOpacity
        onPress={handleSearchPress}
        activeOpacity={0.7}
        style={tw`flex-row items-center mb-3 px-1`}
      >
        {/* Search query text with dynamic sizing */}
        <Text 
          style={tw`${getTextSize(searchQuery)} font-semibold text-gray-900`}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.7}
          ellipsizeMode="tail"
        >
          {searchQuery}
        </Text>
        
        {/* Pill-Style Chevron Button - right next to text */}
        <View style={[
          tw`w-5 h-5 rounded-full items-center justify-center border ml-2`,
          {
            backgroundColor: isChevronPressed ? TURQUOISE_LIGHT : TURQUOISE_SUBTLE,
            borderColor: isChevronPressed ? TURQUOISE : TURQUOISE_BORDER,
            borderWidth: isChevronPressed ? 1.5 : 1,
            shadowColor: isChevronPressed ? TURQUOISE : '#000',
            shadowOffset: {
              width: 0,
              height: isChevronPressed ? 2 : 1,
            },
            shadowOpacity: isChevronPressed ? 0.2 : 0.08,
            shadowRadius: isChevronPressed ? 4 : 2,
            elevation: isChevronPressed ? 4 : 2,
          }
        ]}>
          <Ionicons 
            name="chevron-forward" 
            size={12} 
            color={isChevronPressed ? TURQUOISE_DARK : '#4B5563'} 
          />
        </View>
      </TouchableOpacity>

      {/* Hotel Cards Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`px-1`}
        decelerationRate="fast"
      >
        {hotels.map((hotel, hotelIndex) => (
          <View
            key={`${hotel.id}-${hotelIndex}`}
            style={[
              tw`mr--5`, // Reduced margin (8px equivalent)
              { width: cardWidth }
            ]}
          >
            <View style={{ height: cardHeight }}>
              <BeautifulHotelCard
                hotel={hotel}
                onPress={() => handleHotelPress(hotel)}
                index={hotelIndex}
              />
            </View>
          </View>
        ))}
        
        {/* Add proper padding at the end */}
        <View style={tw`w-6`} />
      </ScrollView>

    </Animated.View>
  );
};

export default SearchQueryCarousel;