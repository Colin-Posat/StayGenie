// SwipeableStoryView.tsx - Swipeable list of story cards
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import SwipeableHotelStoryCard, { Hotel, EnhancedHotel } from './SwipeableHotelStoryCard';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 40;

interface SwipeableStoryViewProps {
  hotels: Hotel[];
  onHotelPress?: (hotel: Hotel) => void;
  onViewDetails?: (hotel: Hotel) => void;
  onSave?: (hotel: Hotel) => void;
}

// Function to enhance hotels with additional data for the story cards
const enhanceHotel = (hotel: Hotel): EnhancedHotel => {
  const baseImageUrl = hotel.image.split('?')[0];
  const images = [
    hotel.image, // Main hotel image
    `${baseImageUrl}?auto=format&fit=crop&w=800&q=80&crop=entropy`, // Different crop for location
    `${baseImageUrl}?auto=format&fit=crop&w=800&q=80&crop=faces`, // Different crop for amenities
  ];

  // Generate map-style image for location card
  const mapImages = [
    "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1519302959554-a75be0afc82a?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80",
  ];
  const mapImage = mapImages[hotel.id % mapImages.length];

  // Generate nearby attractions based on location
  let nearbyAttractions = ["City Center - 5 min", "Shopping Mall - 8 min", "Restaurant District - 3 min"];
  if (hotel.location.includes('Downtown')) {
    nearbyAttractions = ["Business District - 2 min", "Theater District - 4 min", "Shopping Center - 6 min"];
  } else if (hotel.location.includes('Arts')) {
    nearbyAttractions = ["Art Museum - 2 min", "Gallery District - 3 min", "Cultural Center - 5 min"];
  } else if (hotel.location.includes('Riverside')) {
    nearbyAttractions = ["Waterfront - 1 min", "Marina - 3 min", "River Walk - 2 min"];
  }

  return {
    ...hotel,
    images,
    mapImage,
    nearbyAttractions,
  };
};

// Main SwipeableStoryView Component
const SwipeableStoryView: React.FC<SwipeableStoryViewProps> = ({ 
  hotels = [], 
  onHotelPress, 
  onViewDetails, 
  onSave
}) => {
  const [savedHotels, setSavedHotels] = useState<Set<number>>(new Set());

  // Enhance hotels with additional data
  const enhancedHotels = hotels.map(enhanceHotel);

  const handleSave = (hotel: Hotel) => {
    setSavedHotels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hotel.id)) {
        newSet.delete(hotel.id);
      } else {
        newSet.add(hotel.id);
      }
      return newSet;
    });
    onSave?.(hotel);
  };

  const handleViewDetails = (hotel: Hotel) => {
    onViewDetails?.(hotel);
  };

  const handleHotelPress = (hotel: Hotel) => {
    onHotelPress?.(hotel);
  };

  const renderHotelCard = ({ item: hotel, index }: { item: EnhancedHotel; index: number }) => {
    const isCurrentHotelSaved = savedHotels.has(hotel.id);
    
    return (
      <View style={tw`px-5 mb-6`}>
        <SwipeableHotelStoryCard
          hotel={hotel}
          onSave={() => handleSave(hotel)}
          onViewDetails={() => handleViewDetails(hotel)}
          onHotelPress={() => handleHotelPress(hotel)}
          isCurrentHotelSaved={isCurrentHotelSaved}
          index={index}
          totalCount={enhancedHotels.length}
        />
      </View>
    );
  };

  const getItemLayout = (_: any, index: number) => ({
    length: screenHeight * 0.65 + 48, // Card height + margin
    offset: (screenHeight * 0.65 + 48) * index,
    index,
  });

  // Empty state
  if (enhancedHotels.length === 0) {
    return (
      <View style={tw`flex-1 bg-gray-50 justify-center items-center px-10`}>
        <View style={tw`w-32 h-32 rounded-full bg-gray-100 justify-center items-center mb-6`}>
          <Ionicons name="bed-outline" size={64} color="#CCCCCC" />
        </View>
        <Text style={tw`text-3xl font-bold text-gray-800 mb-2 text-center`}>
          No Hotels Found
        </Text>
        <Text style={tw`text-base text-gray-500 text-center leading-6`}>
          Try adjusting your search criteria or dates to find available hotels.
        </Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <FlatList
        data={enhancedHotels}
        renderItem={renderHotelCard}
        keyExtractor={(item) => `hotel-${item.id}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`py-2`}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        scrollEventThrottle={16}
      />
    </View>
  );
};

export default SwipeableStoryView;