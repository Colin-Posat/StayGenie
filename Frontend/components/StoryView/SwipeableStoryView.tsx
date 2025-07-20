// SwipeableStoryView.tsx - Updated for Two-Stage API system
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
  // NEW: Track insights loading state for two-stage API
  isInsightsLoading?: boolean;
  // NEW: Additional state tracking for better UX
  stage1Complete?: boolean;
  stage2Complete?: boolean;
  searchMode?: 'test' | 'two-stage' | 'legacy';
}

// UPDATED: Enhanced function to preserve optimized backend data while adding story card requirements
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

  // NEW: Detect if hotel has loading placeholders (Stage 1 data)
  const hasLoadingPlaceholders = (hotel: Hotel): boolean => {
    return (
      (hotel.whyItMatches?.includes('progress') ?? false) ||
      (hotel.whyItMatches?.includes('loading') ?? false) ||
      (hotel.guestInsights?.includes('Loading') ?? false) ||
      (hotel.locationHighlight?.includes('Analyzing') ?? false) ||
      (hotel.nearbyAttractions?.some(attr => attr.includes('Loading')) ?? false) ||
      (hotel.funFacts?.some(fact => fact.includes('Loading')) ?? false)
    );
  };

  // NEW: Get data stage for better debugging
  const getDataStage = (hotel: Hotel): 'stage1' | 'stage2' | 'complete' => {
    if (hasLoadingPlaceholders(hotel)) {
      return 'stage1';
    } else if (hotel.whyItMatches && hotel.guestInsights && !hotel.guestInsights.includes('Loading')) {
      return 'complete';
    } else {
      return 'stage2';
    }
  };

  // UPDATED: Ensure we preserve all optimized backend data while enhancing for story view
  const enhancedHotel: EnhancedHotel = {
    ...hotel, // Preserve ALL optimized backend data
    images: generateImages(hotel),
    mapImage: hotel.latitude && hotel.longitude 
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${hotel.latitude},${hotel.longitude}&zoom=15&size=400x200&markers=color:red%7C${hotel.latitude},${hotel.longitude}&key=YOUR_API_KEY`
      : "https://maps.googleapis.com/maps/api/staticmap?center=",
    nearbyAttractions: hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0 
      ? hotel.nearbyAttractions 
      : ["Exploring nearby attractions..."],
  };

  // Enhanced logging for debugging two-stage API
  const dataStage = getDataStage(hotel);
  console.log(`🎨 Enhanced hotel ${hotel.name} (${dataStage}):`, {
    dataStage: dataStage,
    hasLoadingPlaceholders: hasLoadingPlaceholders(hotel),
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
      guestInsights: hotel.guestInsights ? hotel.guestInsights.substring(0, 50) + '...' : 'None',
    },
    pricingData: {
      hasEnhancedPricing: !!hotel.pricePerNight,
      provider: hotel.pricePerNight?.provider || 'None',
      isSupplierRate: hotel.pricePerNight?.isSupplierPrice || false,
    }
  });

  return enhancedHotel;
};

// NEW: Get insights loading status for individual hotels
const getHotelInsightsStatus = (hotel: Hotel): 'loading' | 'partial' | 'complete' => {
  const hasLoadingGuestInsights = hotel.guestInsights?.includes('Loading') ?? false;
  const hasLoadingWhyItMatches = (hotel.whyItMatches?.includes('progress') ?? false) || (hotel.whyItMatches?.includes('loading') ?? false);
  const hasLoadingLocationHighlight = hotel.locationHighlight?.includes('Analyzing') ?? false;
  const hasLoadingAttractions = hotel.nearbyAttractions?.some(attr => attr.includes('Loading')) ?? false;
  
  if (hasLoadingGuestInsights || hasLoadingWhyItMatches) {
    return 'loading';
  } else if (hasLoadingLocationHighlight || hasLoadingAttractions) {
    return 'partial';
  } else {
    return 'complete';
  }
};

// UPDATED: Main SwipeableStoryView Component with two-stage API support
const SwipeableStoryView: React.FC<SwipeableStoryViewProps> = ({ 
  hotels = [], 
  onHotelPress, 
  onViewDetails, 
  onSave, // Optional - kept for backward compatibility
  checkInDate,
  checkOutDate,
  adults = 2,
  children = 0,
  isInsightsLoading = false,
  stage1Complete = false,
  stage2Complete = false,
  searchMode = 'two-stage'
}) => {
  // UPDATED: Enhance hotels with additional data while preserving optimized backend data
  const enhancedHotels = hotels.map(enhanceHotel);

  // NEW: Calculate insights completion status
  const getInsightsStats = () => {
    if (hotels.length === 0) return { complete: 0, loading: 0, partial: 0 };
    
    const stats = { complete: 0, loading: 0, partial: 0 };
    hotels.forEach(hotel => {
      const status = getHotelInsightsStatus(hotel);
      stats[status]++;
    });
    
    return stats;
  };

  const insightsStats = getInsightsStats();

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
    console.log(`📊 Insights Status: ${getHotelInsightsStatus(hotel)}`);
    onHotelPress?.(hotel);
  };

  // UPDATED: Enhanced render function with insights status
  const renderHotelCard = ({ item: hotel, index }: { item: EnhancedHotel; index: number }) => {
    const insightsStatus = getHotelInsightsStatus(hotel);
    
    return (
      <View style={tw`px-5 mb-6`}>
        <View style={tw`border border-black/10 shadow-md rounded-2xl`}>
          <SwipeableHotelStoryCard
            hotel={hotel}
            onSave={() => handleSave(hotel)}
            onViewDetails={() => handleViewDetails(hotel)}
            onHotelPress={() => handleHotelPress(hotel)}
            index={index}
            totalCount={enhancedHotels.length}
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            adults={adults}
            children={children}
            // NEW: Pass individual hotel insights status
            isInsightsLoading={insightsStatus === 'loading'}
            insightsStatus={insightsStatus}
            searchMode={searchMode}
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

  // UPDATED: Enhanced empty state with two-stage API context
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
          {searchMode === 'test' 
            ? 'Test mode - No test data available for this search.'
            : searchMode === 'two-stage' 
              ? 'Our two-stage AI-powered search will find the perfect match for your preferences.'
              : 'Our AI-powered search will find the perfect match for your preferences.'
          }
        </Text>
      </View>
    );
  }

  // NEW: Get appropriate loading message based on search mode and stage
  const getLoadingMessage = () => {
    if (searchMode === 'test') {
      return {
        title: 'Loading test insights',
        subtitle: 'Processing test data...'
      };
    } else if (searchMode === 'two-stage') {
      if (!stage1Complete) {
        return {
          title: 'Finding hotels with AI matching',
          subtitle: 'Stage 1: Llama is analyzing your preferences...'
        };
      } else if (!stage2Complete) {
        return {
          title: 'Enhancing results with AI insights',
          subtitle: 'Stage 2: GPT-4o is generating detailed content...'
        };
      } else {
        return {
          title: 'Final insights loading',
          subtitle: 'Adding sentiment analysis and guest insights...'
        };
      }
    } else {
      return {
        title: 'Enhancing your results with AI insights',
        subtitle: 'Loading detailed guest sentiment analysis...'
      };
    }
  };

  const loadingMessage = getLoadingMessage();

  // UPDATED: Enhanced insights loading indicator for two-stage API
  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Enhanced global insights loading indicator */}
      {isInsightsLoading && (
        <View style={tw`mx-5 mt-2 mb-1 p-3 ${
          searchMode === 'test' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
        } rounded-lg border`}>
          <View style={tw`flex-row items-center`}>
            <View style={tw`w-4 h-4 rounded-full border-2 ${
              searchMode === 'test' ? 'border-orange-500 border-t-transparent' : 'border-blue-500 border-t-transparent'
            } animate-spin mr-3`} />
            <View style={tw`flex-1`}>
              <Text style={tw`${
                searchMode === 'test' ? 'text-orange-700' : 'text-blue-700'
              } text-sm font-medium`}>
                {loadingMessage.title}
              </Text>
              <Text style={tw`${
                searchMode === 'test' ? 'text-orange-600' : 'text-blue-600'
              } text-xs mt-0.5`}>
                {loadingMessage.subtitle}
              </Text>
              
              {/* NEW: Progress indicator for two-stage */}
              {searchMode === 'two-stage' && insightsStats.complete > 0 && (
                <Text style={tw`text-blue-500 text-xs mt-1`}>
                  {insightsStats.complete}/{hotels.length} hotels enhanced
                </Text>
              )}
            </View>
            <Ionicons 
              name={searchMode === 'test' ? "flask" : "sparkles"} 
              size={16} 
              color={searchMode === 'test' ? "#EA580C" : "#3B82F6"} 
            />
          </View>
          
          {/* NEW: Stage indicators for two-stage mode */}
          {searchMode === 'two-stage' && (
            <View style={tw`flex-row items-center mt-2 pt-2 border-t border-blue-200`}>
              <View style={tw`flex-row items-center mr-4`}>
                <Ionicons 
                  name={stage1Complete ? "checkmark-circle" : "time"} 
                  size={14} 
                  color={stage1Complete ? "#10B981" : "#6B7280"} 
                />
                <Text style={tw`text-xs ml-1 ${stage1Complete ? 'text-green-600' : 'text-gray-500'}`}>
                  Stage 1
                </Text>
              </View>
              <View style={tw`flex-row items-center`}>
                <Ionicons 
                  name={stage2Complete ? "checkmark-circle" : isInsightsLoading ? "sync" : "time"} 
                  size={14} 
                  color={stage2Complete ? "#10B981" : isInsightsLoading ? "#3B82F6" : "#6B7280"} 
                />
                <Text style={tw`text-xs ml-1 ${
                  stage2Complete ? 'text-green-600' : isInsightsLoading ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  Stage 2
                </Text>
              </View>
            </View>
          )}
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
        // UPDATED: Enhanced extraData for two-stage API
        extraData={`${isInsightsLoading}-${stage1Complete}-${stage2Complete}-${insightsStats.complete}`}
      />
    </View>
  );
};

export default SwipeableStoryView;