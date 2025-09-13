// SwipeableStoryView.tsx - Updated with Enhanced Room Image Support
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  Animated,
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
  checkInDate?: Date;
  checkOutDate?: Date;
  adults?: number;
  children?: number;
  isInsightsLoading?: boolean;
  stage1Complete?: boolean;
  stage2Complete?: boolean;
  searchMode?: 'test' | 'two-stage' | 'legacy';
  showPlaceholders?: boolean;
  isStreaming?: boolean;
  streamingProgress?: {
    step: number;
    totalSteps: number;
    message: string;
  };
  searchParams?: any;
}

const SwipeableStoryView: React.FC<SwipeableStoryViewProps> = ({
  hotels = [],
  onHotelPress,
  onViewDetails,
  onSave,
  checkInDate,
  checkOutDate,
  adults = 2,
  children = 0,
  isInsightsLoading = false,
  stage1Complete = false,
  stage2Complete = false,
  searchMode = 'two-stage',
  showPlaceholders = false,
  isStreaming = false,
  streamingProgress = { step: 0, totalSteps: 8, message: '' },
  searchParams,
}) => {
  // Streaming state
  const [streamingHotelsCount, setStreamingHotelsCount] = useState(0);
  const [lastStreamedHotel, setLastStreamedHotel] = useState<Hotel | null>(null);
  const [showNewHotelAnimation, setShowNewHotelAnimation] = useState(false);

  // Track streaming hotels and trigger animations
  useEffect(() => {
    if (isStreaming) {
      const currentCount = hotels.filter(h => !h.isPlaceholder).length;
      
      if (currentCount > streamingHotelsCount) {
        const newHotel = hotels.find(h => !h.isPlaceholder);
        console.log(`🌊 New hotel streamed in: ${newHotel?.name} (${currentCount} total)`);
        
        setStreamingHotelsCount(currentCount);
        setLastStreamedHotel(newHotel || null);
        setShowNewHotelAnimation(true);
        
        const timer = setTimeout(() => {
          setShowNewHotelAnimation(false);
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    } else {
      setStreamingHotelsCount(hotels.length);
      setShowNewHotelAnimation(false);
    }
  }, [hotels.length, isStreaming, streamingHotelsCount]);

  // Handle streaming completion
  useEffect(() => {
    if (!isStreaming && streamingHotelsCount > 0) {
      console.log(`✅ Streaming completed with ${hotels.length} hotels`);
    }
  }, [isStreaming, streamingHotelsCount, hotels.length]);

  // Generate placeholder card
  const renderPlaceholderCard = (index: number) => {
    return (
      <View style={tw`px-5 mb-6`}>
        <View style={[
          tw`bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100`,
          { height: screenHeight * 0.65 }
        ]}>
          {/* Grey placeholder image with subtle animation */}
          <View style={[
            tw`bg-gray-200 relative`,
            { height: '60%' }
          ]}>
            {/* Animated shimmer effect */}
            <View style={tw`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse`} />
            
            {/* Placeholder search icon */}
            <View style={tw`absolute inset-0 justify-center items-center`}>
              <Ionicons name="search" size={40} color="#D1D5DB" />
            </View>
          </View>
          
          {/* Placeholder content */}
          <View style={tw`p-6 flex-1`}>
            {/* Placeholder hotel name */}
            <View style={tw`bg-gray-200 h-7 rounded-lg mb-4 animate-pulse`} />
            
            {/* Placeholder rating and price row */}
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <View style={tw`bg-gray-200 h-5 w-24 rounded animate-pulse`} />
              <View style={tw`bg-gray-200 h-6 w-20 rounded animate-pulse`} />
            </View>
            
            {/* Placeholder description lines */}
            <View style={tw`mb-4`}>
              <View style={tw`bg-gray-200 h-4 rounded mb-2 animate-pulse`} />
              <View style={tw`bg-gray-200 h-4 w-4/5 rounded mb-2 animate-pulse`} />
              <View style={tw`bg-gray-200 h-4 w-3/5 rounded animate-pulse`} />
            </View>
            
            {/* Placeholder tags */}
            <View style={tw`flex-row gap-2 mb-6`}>
              <View style={tw`bg-gray-200 h-7 w-16 rounded-full animate-pulse`} />
              <View style={tw`bg-gray-200 h-7 w-20 rounded-full animate-pulse`} />
              <View style={tw`bg-gray-200 h-7 w-14 rounded-full animate-pulse`} />
            </View>
            
            {/* Placeholder buttons */}
            <View style={tw`flex-row gap-3 mt-auto`}>
              <View style={tw`flex-1 bg-gray-200 h-12 rounded-2xl animate-pulse`} />
              <View style={tw`flex-1 bg-gray-200 h-12 rounded-2xl animate-pulse`} />
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Enhanced hotel processing with priority room image handling
  const enhanceHotel = (hotel: Hotel): EnhancedHotel => {
const generateImages = (hotel: Hotel): string[] => {
  console.log(`🖼️ Processing images for ${hotel.name}:`);
  console.log(`- firstRoomImage: ${hotel.firstRoomImage ? 'Present' : 'Not available'}`);
  console.log(`- secondRoomImage: ${hotel.secondRoomImage ? 'Present' : 'Not available'}`);
  console.log(`- images array: ${hotel.images ? hotel.images.length + ' images' : 'Not available'}`);
  console.log(`- fallback image: ${hotel.image ? 'Present' : 'Not available'}`);

  const finalImages: string[] = [];
  
  // PRIORITY 1: Use existing images array first (don't mix with room images)
  if (hotel.images && hotel.images.length > 0) {
    for (const image of hotel.images) {
      if (finalImages.length >= 3) break;
      
      if (image && 
          typeof image === 'string' && 
          image.trim() !== '' && 
          !finalImages.includes(image)) {
        console.log(`✅ Adding image from array: ${image.substring(0, 50)}...`);
        finalImages.push(image);
      }
    }
  }
  
  // PRIORITY 2: Use fallback hotel.image if still need more (but NOT room images)
  if (finalImages.length < 3 && hotel.image && 
      typeof hotel.image === 'string' && 
      hotel.image.trim() !== '' && 
      !finalImages.includes(hotel.image)) {
    console.log(`✅ Adding fallback image: ${hotel.image.substring(0, 50)}...`);
    finalImages.push(hotel.image);
  }
  
  // PRIORITY 3: Generate variations from existing images if we have a base
  if (finalImages.length > 0 && finalImages.length < 3) {
    const baseImage = finalImages[0];
    if (baseImage.includes('unsplash.com') || baseImage.includes('http') || baseImage.startsWith('//')) {
      const baseUrl = baseImage.split('?')[0];
      
      while (finalImages.length < 3) {
        let variation = '';
        if (finalImages.length === 1) {
          variation = `${baseUrl}?auto=format&fit=crop&w=800&q=80&crop=entropy&v=${Date.now()}`;
        } else if (finalImages.length === 2) {
          variation = `${baseUrl}?auto=format&fit=crop&w=800&q=80&crop=faces&v=${Date.now()}`;
        }
        
        if (variation && !finalImages.includes(variation)) {
          console.log(`✅ Generated variation: ${variation.substring(0, 50)}...`);
          finalImages.push(variation);
        } else {
          break;
        }
      }
    }
  }
  
  // FALLBACK: Use default images if still don't have enough
  const defaultImages = [
    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80",
  ];
  
  while (finalImages.length < 3) {
    const defaultImage = defaultImages[finalImages.length];
    if (defaultImage && !finalImages.includes(defaultImage)) {
      console.log(`⚠️ Using default image ${finalImages.length + 1}: ${defaultImage.substring(0, 50)}...`);
      finalImages.push(defaultImage);
    } else {
      break;
    }
  }
  
  // Ensure we return exactly 3 images
  const result = finalImages.slice(0, 3);
  console.log(`✅ Final images for ${hotel.name}: ${result.length} images (room images preserved separately)`);
  
  return result;
};

    const enhancedHotel: EnhancedHotel = {
      ...hotel,
      // Use our enhanced image generation that prioritizes room images
      images: generateImages(hotel),
      // Preserve the original room images for reference
      firstRoomImage: hotel.firstRoomImage,
      secondRoomImage: hotel.secondRoomImage,
      // Generate map image
      mapImage: hotel.latitude && hotel.longitude
        ? `https://maps.googleapis.com/maps/api/staticmap?center=${hotel.latitude},${hotel.longitude}&zoom=15&size=400x200&markers=color:red%7C${hotel.latitude},${hotel.longitude}&key=YOUR_API_KEY`
        : "https://maps.googleapis.com/maps/api/staticmap?center=",
      // Handle nearby attractions
      nearbyAttractions: hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0
        ? hotel.nearbyAttractions
        : ["Exploring nearby attractions..."],
    };

    return enhancedHotel;
  };

  // Process hotels - filter out placeholders for enhancement
  const realHotels = hotels.filter(h => !h.isPlaceholder);
  const enhancedHotels = realHotels.map(enhanceHotel);

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

  const getInsightsStats = () => {
    if (realHotels.length === 0) return { complete: 0, loading: 0, partial: 0 };
    
    const stats = { complete: 0, loading: 0, partial: 0 };
    realHotels.forEach(hotel => {
      const status = getHotelInsightsStatus(hotel);
      stats[status]++;
    });
    
    return stats;
  };

  const insightsStats = getInsightsStats();

  const handleSave = (hotel: Hotel) => {
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
    console.log(`🖼️ Room Images: First=${hotel.firstRoomImage ? 'Yes' : 'No'}, Second=${hotel.secondRoomImage ? 'Yes' : 'No'}`);
    onHotelPress?.(hotel);
  };

  // Render placeholder or real hotel card
  const renderHotelCard = ({ item: hotel, index }: { item: EnhancedHotel | any; index: number }) => {
    // If showing placeholders and this is a placeholder hotel, render grey placeholder
    if (showPlaceholders && hotels[index]?.isPlaceholder) {
      return renderPlaceholderCard(index);
    }

    // Render real hotel card
    const insightsStatus = getHotelInsightsStatus(hotel);
    const isNewlyStreamed = isStreaming && index === realHotels.length - 1 && showNewHotelAnimation;
    
    return (
      <View style={tw`px-5 mb-6`}>
        <View style={[
          tw`border border-black/10 shadow-md rounded-2xl`,
          isNewlyStreamed && tw`border-blue-400 shadow-blue-200 shadow-lg`
        ]}>
          {/* New hotel streaming indicator */}
          {isNewlyStreamed && (
            <View style={tw`absolute -top-2 -right-2 bg-blue-500 px-2 py-1 rounded-full z-10`}>
              <Text style={tw`text-xs text-white font-bold`}>NEW!</Text>
            </View>
          )}
          
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
            isInsightsLoading={insightsStatus === 'loading'}
            insightsStatus={insightsStatus}
            searchMode={searchMode}
            searchParams={searchParams}
          />
        </View>
      </View>
    );
  };

  const getItemLayout = (_: any, index: number) => ({
    length: screenHeight * 0.65 + 48,
    offset: (screenHeight * 0.65 + 48) * index,
    index,
  });

  // Empty state - show when no hotels and not showing placeholders
  if (enhancedHotels.length === 0 && !showPlaceholders) {
    return (
      <View style={tw`flex-1 bg-gray-50 justify-center items-center px-10`}>
        <View style={tw`w-32 h-32 rounded-full bg-gray-100 justify-center items-center mb-6`}>
          <Ionicons name="bed-outline" size={64} color="#CCCCCC" />
        </View>
        <Text style={tw`text-3xl font-bold text-gray-800 mb-2 text-center`}>
          {isStreaming ? 'Finding Your Perfect Hotels...' : 'No Hotels Found'}
        </Text>
        <Text style={tw`text-base text-gray-500 text-center leading-6 mb-4`}>
          {isStreaming 
            ? 'AI is analyzing hotels and will show results as they\'re found...'
            : 'Try adjusting your search criteria or dates to find available hotels.'
          }
        </Text>
        {/* Streaming progress indicator in empty state */}
        {isStreaming && (
          <View style={tw`flex-row items-center mt-4`}>
            <View style={tw`w-3 h-3 bg-blue-500 rounded-full animate-pulse mr-2`} />
            <Text style={tw`text-sm text-blue-600`}>
              {streamingProgress.message || `Step ${streamingProgress.step}/${streamingProgress.totalSteps}`}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Determine what to render - placeholders or real hotels
  const dataToRender = showPlaceholders 
    ? Array.from({ length: 10 }, (_, i) => ({ isPlaceholder: true, id: `placeholder-${i}` }))
    : enhancedHotels;

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* New hotel notification */}
      {showNewHotelAnimation && lastStreamedHotel && (
        <View style={tw`absolute top-16 left-4 right-4 bg-green-500 px-4 py-3 rounded-lg flex-row items-center z-40`}>
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text style={tw`text-white font-medium ml-2 flex-1`}>
            Found: {lastStreamedHotel.name} ({lastStreamedHotel.aiMatchPercent}% match!)
          </Text>
        </View>
      )}

      <FlatList
        data={dataToRender as (EnhancedHotel | { isPlaceholder: boolean; id: string })[]}
        renderItem={({ item, index }) => 
          showPlaceholders 
            ? renderPlaceholderCard(index)
            : renderHotelCard({ item, index })
        }
        keyExtractor={(item, index) => 
          showPlaceholders 
            ? `placeholder-${index}` 
            : `hotel-${item.id}`
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`py-2`}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        scrollEventThrottle={16}
        extraData={`${isInsightsLoading}-${stage1Complete}-${stage2Complete}-${insightsStats.complete}-${isStreaming}-${hotels.length}-${showPlaceholders}`}
      />
    </View>
  );
};

export default SwipeableStoryView;