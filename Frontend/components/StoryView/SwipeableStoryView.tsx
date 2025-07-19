// SwipeableStoryView.tsx - Updated to work with new FavoritesCache system
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
  onSave?: (hotel: Hotel) => void; // Optional - for backward compatibility, now handled by cache
  // Additional props for Google Maps integration
  checkInDate?: Date;
  checkOutDate?: Date;
  adults?: number;
  children?: number;
  // NEW: Track insights loading state
  isInsightsLoading?: boolean;
}

// UPDATED: Enhanced function to preserve optimized backend data while adding story card requirements
// FIXED: Enhanced function to preserve optimized backend data while adding story card requirements
const enhanceHotel = (hotel: Hotel): EnhancedHotel => {
  // UPDATED: Generate multiple images for story slides, preserving API data
  const generateImages = (hotel: Hotel): string[] => {
    // Priority 1: Use images array from optimized backend API if available
    if (hotel.images && hotel.images.length > 0) {
      console.log(`✅ Using API images for ${hotel.name}:`, hotel.images.length, 'images');
      
      // If we have enough images from API, use them
      if (hotel.images.length >= 3) {
        return hotel.images.slice(0, 3); // Use first 3 API images
      }
      
      // If we have some API images but need more, extend with variations
      const apiImages = [...hotel.images];
      const baseImage = hotel.images[0];
      
      // Generate additional images based on the first API image
      if (baseImage && (baseImage.includes('unsplash.com') || baseImage.includes('http') || baseImage.startsWith('//'))) {
        const baseUrl = baseImage.split('?')[0];
        
        while (apiImages.length < 3) {
          if (apiImages.length === 1) {
            apiImages.push(`${baseUrl}?auto=format&fit=crop&w=800&q=80&crop=entropy`);
          } else if (apiImages.length === 2) {
            apiImages.push(`${baseUrl}?auto=format&fit=crop&w=800&q=80&crop=faces`);
          }
        }
      }
      
      // Ensure we have at least 3 images, pad with fallbacks if needed
      while (apiImages.length < 3) {
        const fallbackImages = [
          "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80",
        ];
        apiImages.push(fallbackImages[apiImages.length - 1] || fallbackImages[0]);
      }
      
      return apiImages.slice(0, 3);
    }
    
    // Priority 2: Use single image from API to generate variations
    const baseImage = hotel.image;
    if (baseImage && (baseImage.includes('unsplash.com') || baseImage.includes('http') || baseImage.startsWith('//'))) {
      console.log(`⚠️ No API images array for ${hotel.name}, generating from base image:`, baseImage);
      const baseUrl = baseImage.split('?')[0];
      return [
        baseImage, // Main hotel image (from optimized backend)
        `${baseUrl}?auto=format&fit=crop&w=800&q=80&crop=entropy`, // Different crop for location
        `${baseUrl}?auto=format&fit=crop&w=800&q=80&crop=faces`, // Different crop for amenities
      ];
    }
    
    // Priority 3: Fallback images if no valid base image
    console.log(`❌ No valid images for ${hotel.name}, using fallback images`);
    const fallbackImages = [
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80",
    ];
    
    return fallbackImages;
  };

  // ... rest of the enhanceHotel function remains the same ...

  // UPDATED: Ensure we preserve all optimized backend data while enhancing for story view
  const enhancedHotel: EnhancedHotel = {
    ...hotel, // Preserve ALL optimized backend data
    images: generateImages(hotel), // Pass the whole hotel object instead of just hotel.image
    mapImage: "https://maps.googleapis.com/maps/api/staticmap?center=",
    nearbyAttractions: hotel.nearbyAttractions || ["No nearby attractions available"],
  };

  // Enhanced logging for debugging
  console.log(`🎨 Enhanced hotel ${hotel.name}:`, {
    originalImages: hotel.images?.length || 0,
    finalImages: enhancedHotel.images.length,
    imagesSample: enhancedHotel.images[0]?.substring(0, 50) + '...',
    originalNearbyAttractions: hotel.nearbyAttractions,
    finalNearbyAttractions: enhancedHotel.nearbyAttractions,
    locationData: {
      city: hotel.city,
      country: hotel.country,
      coordinates: hotel.latitude && hotel.longitude ? `${hotel.latitude}, ${hotel.longitude}` : 'None',
      locationHighlight: hotel.locationHighlight,
    },
    aiData: {
      matchPercent: hotel.aiMatchPercent,
      matchType: hotel.matchType,
      whyItMatches: hotel.whyItMatches ? hotel.whyItMatches.substring(0, 50) + '...' : 'None',
    },
    pricingData: {
      hasEnhancedPricing: !!hotel.pricePerNight,
      provider: hotel.pricePerNight?.provider || 'None',
      isSupplierRate: hotel.pricePerNight?.isSupplierPrice || false,
    }
  });

  return enhancedHotel;
};

// UPDATED: Main SwipeableStoryView Component with FavoritesCache integration
const SwipeableStoryView: React.FC<SwipeableStoryViewProps> = ({ 
  hotels = [], 
  onHotelPress, 
  onViewDetails, 
  onSave, // Optional - kept for backward compatibility
  checkInDate,
  checkOutDate,
  adults = 2,
  children = 0,
  isInsightsLoading = false
}) => {
  // REMOVED: savedHotels state since it's now handled by FavoritesCache internally

  // UPDATED: Enhance hotels with additional data while preserving optimized backend data
  const enhancedHotels = hotels.map(enhanceHotel);

  // UPDATED: Handle save - now just triggers optional callback for backward compatibility
  const handleSave = (hotel: Hotel) => {
    // The SwipeableHotelStoryCard now handles favorites internally via FavoritesCache
    // This callback is just for backward compatibility
    console.log(`💾 Save callback triggered for: ${hotel.name}`);
    onSave?.(hotel);
  };

  const handleViewDetails = (hotel: Hotel) => {
    console.log(`🗺️ View details for: ${hotel.name}`);
    if (hotel.latitude && hotel.longitude) {
      console.log(`📍 Opening map with coordinates: ${hotel.latitude}, ${hotel.longitude}`);
    } else {
      console.log(`📍 Opening map with location: ${hotel.city || hotel.location}`);
    }
    onViewDetails?.(hotel);
  };

  const handleHotelPress = (hotel: Hotel) => {
    console.log(`🏨 Hotel pressed: ${hotel.name}`);
    console.log(`🤖 AI Match: ${hotel.aiMatchPercent}% (${hotel.matchType || 'standard'})`);
    console.log(`💰 Pricing: ${hotel.pricePerNight?.display || `$${hotel.price}/night`}`);
    onHotelPress?.(hotel);
  };

  // UPDATED: Simplified render function without isCurrentHotelSaved prop
  const renderHotelCard = ({ item: hotel, index }: { item: EnhancedHotel; index: number }) => {
    return (
      <View style={tw`px-5 mb-6`}>
        <View style={tw`border border-black/10 shadow-md rounded-2xl`}>
          <SwipeableHotelStoryCard
            hotel={hotel}
            onSave={() => handleSave(hotel)} // Optional callback
            onViewDetails={() => handleViewDetails(hotel)}
            onHotelPress={() => handleHotelPress(hotel)}
            index={index}
            totalCount={enhancedHotels.length}
            // Pass through Google Maps and insights props
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            adults={adults}
            children={children}
            isInsightsLoading={isInsightsLoading}
          />
        </View>
      </View>
    );
  };

  const getItemLayout = (_: any, index: number) => ({
    length: screenHeight * 0.65 + 48, // Card height + margin
    offset: (screenHeight * 0.65 + 48) * index,
    index,
  });

  // UPDATED: Enhanced empty state with optimized backend context
  if (enhancedHotels.length === 0) {
    return (
      <View style={tw`flex-1 bg-gray-50 justify-center items-center px-10`}>
        <View style={tw`w-32 h-32 rounded-full bg-gray-100 justify-center items-center mb-6`}>
          <Ionicons name="bed-outline" size={64} color="#CCCCCC" />
        </View>
        <Text style={tw`text-3xl font-bold text-gray-800 mb-2 text-center`}>
          No Hotels Found
        </Text>
        <Text style={tw`text-base text-gray-500 text-center leading-6 mb-4`}>
          Try adjusting your search criteria or dates to find available hotels.
        </Text>
        <Text style={tw`text-sm text-gray-400 text-center leading-5`}>
          Our AI-powered search will find the perfect match for your preferences.
        </Text>
      </View>
    );
  }

  // UPDATED: Display insights loading indicator at the top of the list
  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Global insights loading indicator */}
      {isInsightsLoading && (
        <View style={tw`mx-5 mt-2 mb-1 p-3 bg-blue-50 rounded-lg border border-blue-200`}>
          <View style={tw`flex-row items-center`}>
            <View style={tw`w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mr-3`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-blue-700 text-sm font-medium`}>
                Enhancing your results with AI insights
              </Text>
              <Text style={tw`text-blue-600 text-xs mt-0.5`}>
                Loading detailed guest sentiment analysis...
              </Text>
            </View>
            <Ionicons name="sparkles" size={16} color="#3B82F6" />
          </View>
        </View>
      )}

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
        // UPDATED: Simplified extraData since we no longer track savedHotels state
        extraData={isInsightsLoading}
      />
    </View>
  );
};

export default SwipeableStoryView;