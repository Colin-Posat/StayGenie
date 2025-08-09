// SwipeableStoryView.tsx - Updated with Streaming Support
import React, { useState, useEffect } from 'react'; // ADD useEffect import
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
  checkInDate?: Date;
  checkOutDate?: Date;
  adults?: number;
  children?: number;
  isInsightsLoading?: boolean;
  stage1Complete?: boolean;
  stage2Complete?: boolean;
  searchMode?: 'test' | 'two-stage' | 'legacy';
  // ADD: New streaming props
  isStreaming?: boolean;
  streamingProgress?: {
    step: number;
    totalSteps: number;
    message: string;
  };
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
  // ADD: Streaming props with defaults
  isStreaming = false,
  streamingProgress = { step: 0, totalSteps: 8, message: '' }
}) => {
  // ADD: Local state for streaming animation and effects
  const [streamingHotelsCount, setStreamingHotelsCount] = useState(0);
  const [lastStreamedHotel, setLastStreamedHotel] = useState<Hotel | null>(null);
  const [showNewHotelAnimation, setShowNewHotelAnimation] = useState(false);

  // ADD: useEffect to track streaming hotels and trigger animations
  useEffect(() => {
    if (isStreaming) {
      // Update streaming count when hotels array changes during streaming
      const currentCount = hotels.length;
      
      if (currentCount > streamingHotelsCount) {
        const newHotel = hotels[currentCount - 1];
        console.log(`🌊 New hotel streamed in: ${newHotel?.name} (${currentCount} total)`);
        
        setStreamingHotelsCount(currentCount);
        setLastStreamedHotel(newHotel);
        setShowNewHotelAnimation(true);
        
        // Hide animation after 2 seconds
        const timer = setTimeout(() => {
          setShowNewHotelAnimation(false);
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    } else {
      // Reset streaming state when streaming stops
      setStreamingHotelsCount(hotels.length);
      setShowNewHotelAnimation(false);
    }
  }, [hotels.length, isStreaming, streamingHotelsCount]);

  // ADD: useEffect to handle streaming completion
  useEffect(() => {
    if (!isStreaming && streamingHotelsCount > 0) {
      console.log(`✅ Streaming completed with ${hotels.length} hotels`);
      // Could trigger completion animation here
    }
  }, [isStreaming, streamingHotelsCount, hotels.length]);

  // Existing functions (enhanceHotel, getHotelInsightsStatus, etc.) remain the same...

  const enhanceHotel = (hotel: Hotel): EnhancedHotel => {
    // Your existing enhanceHotel logic remains exactly the same
    const generateImages = (hotel: Hotel): string[] => {
      if (hotel.images && hotel.images.length > 0) {
        console.log(`✅ Using API images for ${hotel.name}:`, hotel.images.length, 'images');
        
        if (hotel.images.length >= 3) {
          return hotel.images.slice(0, 3);
        }
        
        const apiImages = [...hotel.images];
        const baseImage = hotel.images[0];
        
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
      
      const baseImage = hotel.image;
      if (baseImage && (baseImage.includes('unsplash.com') || baseImage.includes('http') || baseImage.startsWith('//'))) {
        console.log(`⚠️ No API images array for ${hotel.name}, generating from base image:`, baseImage);
        const baseUrl = baseImage.split('?')[0];
        return [
          baseImage,
          `${baseUrl}?auto=format&fit=crop&w=800&q=80&crop=entropy`,
          `${baseUrl}?auto=format&fit=crop&w=800&q=80&crop=faces`,
        ];
      }
      
      console.log(`❌ No valid images for ${hotel.name}, using fallback images`);
      const fallbackImages = [
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80",
      ];
      
      return fallbackImages;
    };

    const enhancedHotel: EnhancedHotel = {
      ...hotel,
      images: generateImages(hotel),
      mapImage: hotel.latitude && hotel.longitude 
        ? `https://maps.googleapis.com/maps/api/staticmap?center=${hotel.latitude},${hotel.longitude}&zoom=15&size=400x200&markers=color:red%7C${hotel.latitude},${hotel.longitude}&key=YOUR_API_KEY`
        : "https://maps.googleapis.com/maps/api/staticmap?center=",
      nearbyAttractions: hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0 
        ? hotel.nearbyAttractions 
        : ["Exploring nearby attractions..."],
    };

    return enhancedHotel;
  };

  // Enhanced hotels with existing logic
  const enhancedHotels = hotels.map(enhanceHotel);

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
    if (hotels.length === 0) return { complete: 0, loading: 0, partial: 0 };
    
    const stats = { complete: 0, loading: 0, partial: 0 };
    hotels.forEach(hotel => {
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
    onHotelPress?.(hotel);
  };

  // ADD: Enhanced render function with streaming indicators
  const renderHotelCard = ({ item: hotel, index }: { item: EnhancedHotel; index: number }) => {
    const insightsStatus = getHotelInsightsStatus(hotel);
    const isNewlyStreamed = isStreaming && index === hotels.length - 1 && showNewHotelAnimation;
    
    return (
      <View style={tw`px-5 mb-6`}>
        <View style={[
          tw`border border-black/10 shadow-md rounded-2xl`,
          // ADD: Highlight newly streamed hotels
          isNewlyStreamed && tw`border-blue-400 shadow-blue-200 shadow-lg`
        ]}>
          {/* ADD: New hotel streaming indicator */}
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

  // Enhanced empty state remains the same...
  if (enhancedHotels.length === 0) {
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
        {/* ADD: Streaming progress indicator in empty state */}
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

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* ADD: Global streaming status indicator */}
      {isStreaming && (
        <View style={tw`absolute top-4 right-4 bg-blue-500 px-3 py-2 rounded-full flex-row items-center z-50`}>
          <View style={tw`w-2 h-2 bg-white rounded-full animate-pulse mr-2`} />
          <Text style={tw`text-xs text-white font-medium`}>
            {streamingProgress.step}/{streamingProgress.totalSteps}
          </Text>
        </View>
      )}

      {/* ADD: New hotel notification */}
      {showNewHotelAnimation && lastStreamedHotel && (
        <View style={tw`absolute top-16 left-4 right-4 bg-green-500 px-4 py-3 rounded-lg flex-row items-center z-40`}>
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text style={tw`text-white font-medium ml-2 flex-1`}>
            Found: {lastStreamedHotel.name} ({lastStreamedHotel.aiMatchPercent}% match!)
          </Text>
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
        // ADD: Include streaming state in extraData
        extraData={`${isInsightsLoading}-${stage1Complete}-${stage2Complete}-${insightsStats.complete}-${isStreaming}-${hotels.length}`}
      />
    </View>
  );
};

export default SwipeableStoryView;