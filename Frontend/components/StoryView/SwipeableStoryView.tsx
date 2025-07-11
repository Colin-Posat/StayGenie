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
const enhanceHotel = (hotel: Hotel): EnhancedHotel => {
  // UPDATED: Generate multiple images for story slides, preserving API data
  const generateImages = (baseImage: string): string[] => {
    // If we have a good base image from the optimized backend, create variations
    if (baseImage && (baseImage.includes('unsplash.com') || baseImage.includes('http') || baseImage.startsWith('//'))) {
      const baseUrl = baseImage.split('?')[0];
      return [
        baseImage, // Main hotel image (from optimized backend)
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

  // UPDATED: Generate map image for location slide based on optimized backend location data
  const generateMapImage = (): string => {
    // Use location-specific map images when possible
    const city = hotel.city?.toLowerCase() || '';
    const country = hotel.country?.toLowerCase() || '';
    const location = hotel.location?.toLowerCase() || '';
    
    // Location-specific map images
    if (city.includes('paris') || country.includes('france')) {
      return "https://images.unsplash.com/photo-1502602898536-47ad22581b52?auto=format&fit=crop&w=800&q=80"; // Paris map view
    } else if (city.includes('tokyo') || country.includes('japan')) {
      return "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80"; // Tokyo map view
    } else if (city.includes('new york') || location.includes('manhattan')) {
      return "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?auto=format&fit=crop&w=800&q=80"; // NYC map view
    } else if (city.includes('london') || country.includes('uk')) {
      return "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80"; // London map view
    } else if (city.includes('maui') || city.includes('hawaii')) {
      return "https://images.unsplash.com/photo-1606041008023-472dfb5e530f?auto=format&fit=crop&w=800&q=80"; // Hawaii map view
    } else if (location.includes('beach') || location.includes('coastal')) {
      return "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=80"; // Coastal map
    } else if (location.includes('mountain') || location.includes('resort')) {
      return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80"; // Mountain resort map
    }
    
    // Generic city map fallbacks
    const mapImages = [
      "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80", // Generic city map
      "https://images.unsplash.com/photo-1519302959554-a75be0afc82a?auto=format&fit=crop&w=800&q=80", // Urban planning view
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80", // Aerial city view
    ];
    
    return mapImages[hotel.id % mapImages.length];
  };

  // UPDATED: Preserve nearbyAttractions from optimized backend, with intelligent fallbacks
  const generateNearbyAttractions = (): string[] => {
    // Priority 1: Use nearbyAttractions from optimized backend API
    if (hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0) {
      console.log(`✅ Using optimized backend nearbyAttractions for ${hotel.name}:`, hotel.nearbyAttractions);
      return hotel.nearbyAttractions;
    }
  
    console.log(`⚠️ No nearbyAttractions from optimized backend for ${hotel.name}, generating intelligent fallback`);
    
    // Priority 2: Generate based on city and country from optimized backend
    const city = hotel.city?.toLowerCase() || '';
    const country = hotel.country?.toLowerCase() || '';
    const location = hotel.location?.toLowerCase() || '';
    
    if (city.includes('paris') || country.includes('france')) {
      return ["Eiffel Tower - 10 min", "Louvre Museum - 15 min", "Notre-Dame Cathedral - 8 min"];
    } else if (city.includes('tokyo') || country.includes('japan')) {
      return ["Tokyo Tower - 12 min", "Sensoji Temple - 18 min", "Shibuya Crossing - 5 min"];
    } else if (city.includes('new york') || location.includes('manhattan')) {
      return ["Central Park - 8 min", "Times Square - 12 min", "Empire State Building - 15 min"];
    } else if (city.includes('london') || country.includes('uk')) {
      return ["Big Ben - 10 min", "Tower Bridge - 15 min", "British Museum - 12 min"];
    } else if (city.includes('maui') || city.includes('hawaii')) {
      return ["Haleakala National Park - 30 min", "Road to Hana - 45 min", "Molokini Crater - 20 min"];
    } else if (city.includes('san francisco') || city.includes('sf')) {
      return ["Golden Gate Bridge - 20 min", "Fisherman's Wharf - 15 min", "Alcatraz Island - 25 min"];
    } else if (city.includes('los angeles') || city.includes('la')) {
      return ["Hollywood Walk of Fame - 18 min", "Santa Monica Pier - 25 min", "Griffith Observatory - 22 min"];
    } else if (city.includes('miami')) {
      return ["South Beach - 8 min", "Art Deco District - 10 min", "Wynwood Walls - 15 min"];
    }
    
    // Priority 3: Generate based on location characteristics and topAmenities
    if (location.includes('downtown') || location.includes('city center')) {
      return ["Business District - 2 min", "Theater District - 4 min", "Shopping Center - 6 min"];
    } else if (location.includes('arts') || location.includes('cultural')) {
      return ["Art Museum - 2 min", "Gallery District - 3 min", "Cultural Center - 5 min"];
    } else if (location.includes('riverside') || location.includes('waterfront')) {
      return ["Waterfront Promenade - 1 min", "Marina District - 3 min", "River Walk - 2 min"];
    } else if (hotel.topAmenities?.some(amenity => amenity.toLowerCase().includes('beach'))) {
      return ["Beach Access - 2 min", "Beach Club - 5 min", "Water Sports Center - 3 min"];
    } else if (hotel.topAmenities?.some(amenity => amenity.toLowerCase().includes('business'))) {
      return ["Convention Center - 5 min", "Business District - 3 min", "Airport Shuttle - 10 min"];
    } else if (hotel.topAmenities?.some(amenity => amenity.toLowerCase().includes('spa'))) {
      return ["Wellness Center - 2 min", "Yoga Studio - 4 min", "Meditation Garden - 3 min"];
    }
    
    // Priority 4: Use location highlight to generate attractions
    if (hotel.locationHighlight) {
      const highlight = hotel.locationHighlight.toLowerCase();
      if (highlight.includes('historic')) {
        return ["Historic District - 3 min", "Heritage Museum - 5 min", "Old Town Square - 4 min"];
      } else if (highlight.includes('shopping')) {
        return ["Shopping Mall - 2 min", "Boutique District - 4 min", "Local Market - 3 min"];
      } else if (highlight.includes('dining')) {
        return ["Restaurant Row - 2 min", "Food Market - 4 min", "Rooftop Bars - 5 min"];
      }
    }
    
    // Final fallback: Generic city attractions
    return ["City Center - 5 min", "Shopping District - 8 min", "Restaurant Quarter - 3 min"];
  };

  // UPDATED: Ensure we preserve all optimized backend data while enhancing for story view
  const enhancedHotel: EnhancedHotel = {
    ...hotel, // Preserve ALL optimized backend data
    images: generateImages(hotel.image),
    mapImage: generateMapImage(),
    nearbyAttractions: hotel.nearbyAttractions || generateNearbyAttractions(), // Preserve API data or generate fallback
  };

  // Log the enhancement for debugging
  console.log(`🎨 Enhanced hotel ${hotel.name}:`, {
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