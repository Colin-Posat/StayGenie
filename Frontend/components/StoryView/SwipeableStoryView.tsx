// SwipeableStoryView.tsx - Updated with Google Maps props and API data preservation
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
  // Additional props for Google Maps integration
  checkInDate?: Date;
  checkOutDate?: Date;
  adults?: number;
  children?: number;
}

// Enhanced function to preserve API data while adding story card requirements
const enhanceHotel = (hotel: Hotel): EnhancedHotel => {
  // Generate multiple images for story slides, using API data when available
  const generateImages = (baseImage: string): string[] => {
    // If we have a good base image, create variations
    if (baseImage && (baseImage.includes('unsplash.com') || baseImage.includes('http'))) {
      // Try to create variations of the same image
      const baseUrl = baseImage.split('?')[0];
      return [
        baseImage, // Main hotel image (from API)
        `${baseUrl}?auto=format&fit=crop&w=800&q=80&crop=entropy`, // Different crop for location
        `${baseUrl}?auto=format&fit=crop&w=800&q=80&crop=faces`, // Different crop for amenities
      ];
    }
    
    // Fallback images if base image isn't available or valid
    const fallbackImages = [
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80",
    ];
    
    return fallbackImages;
  };

  // Generate map image for location slide
  const mapImages = [
    "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1519302959554-a75be0afc82a?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1606041008023-472dfb5e530f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=80",
  ];
  const mapImage = mapImages[hotel.id % mapImages.length];

  // Generate nearby attractions, prioritizing fun facts from API
  const generateNearbyAttractions = (): string[] => {
    // If we have fun facts from the API, use those as "nearby attractions"
    if (hotel.funFacts && hotel.funFacts.length > 0) {
      return hotel.funFacts;
    }

    // Fallback based on location and tags
    const location = hotel.location.toLowerCase();
    
    if (location.includes('paris') || location.includes('france')) {
      return ["Eiffel Tower - 10 min", "Louvre Museum - 15 min", "Notre-Dame Cathedral - 8 min"];
    } else if (location.includes('tokyo') || location.includes('japan')) {
      return ["Tokyo Tower - 12 min", "Sensoji Temple - 18 min", "Shibuya Crossing - 5 min"];
    } else if (location.includes('maui') || location.includes('hawaii')) {
      return ["Haleakala National Park - 30 min", "Road to Hana - 45 min", "Molokini Crater - 20 min"];
    } else if (location.includes('downtown')) {
      return ["Business District - 2 min", "Theater District - 4 min", "Shopping Center - 6 min"];
    } else if (location.includes('arts')) {
      return ["Art Museum - 2 min", "Gallery District - 3 min", "Cultural Center - 5 min"];
    } else if (location.includes('riverside') || location.includes('waterfront')) {
      return ["Waterfront - 1 min", "Marina - 3 min", "River Walk - 2 min"];
    } else if (hotel.tags.some(tag => tag.toLowerCase().includes('beach'))) {
      return ["Beach Access - 2 min", "Beach Club - 5 min", "Water Sports - 3 min"];
    } else if (hotel.tags.some(tag => tag.toLowerCase().includes('business'))) {
      return ["Convention Center - 5 min", "Business District - 3 min", "Airport Shuttle - 10 min"];
    } else {
      // Generic fallback
      return ["City Center - 5 min", "Shopping Mall - 8 min", "Restaurant District - 3 min"];
    }
  };

  return {
    ...hotel,
    images: generateImages(hotel.image),
    mapImage,
    nearbyAttractions: generateNearbyAttractions(),
  };
};

// Main SwipeableStoryView Component
const SwipeableStoryView: React.FC<SwipeableStoryViewProps> = ({ 
  hotels = [], 
  onHotelPress, 
  onViewDetails, 
  onSave,
  checkInDate,
  checkOutDate,
  adults = 2,
  children = 0
}) => {
  const [savedHotels, setSavedHotels] = useState<Set<number>>(new Set());

  // Enhance hotels with additional data while preserving API data
  const enhancedHotels = hotels.map(enhanceHotel);

  const handleSave = (hotel: Hotel) => {
    setSavedHotels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hotel.id)) {
        newSet.delete(hotel.id);
        console.log(`💔 Removed hotel from saved: ${hotel.name}`);
      } else {
        newSet.add(hotel.id);
        console.log(`❤️ Saved hotel: ${hotel.name}`);
      }
      return newSet;
    });
    onSave?.(hotel);
  };

  const handleViewDetails = (hotel: Hotel) => {
    console.log(`🗺️ View details for: ${hotel.name}`);
    onViewDetails?.(hotel);
  };

  const handleHotelPress = (hotel: Hotel) => {
    console.log(`🏨 Hotel pressed: ${hotel.name}`);
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
          // Pass through Google Maps props
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          adults={adults}
          children={children}
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