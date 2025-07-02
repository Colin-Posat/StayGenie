import React from 'react';
import {
  ScrollView,
  View,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import HotelCard from './HotelCard';

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
  aiExcerpt?: string;
  whyItMatches?: string;
  funFacts?: string[];
  aiMatchPercent?: number;
  pricePerNight?: {
    display: string;
    min: number;
    max: number;
    currency: string;
  };
  bestOffer?: any;
}

interface ListViewProps {
  hotels: Hotel[];
  onHotelPress?: (hotel: Hotel) => void;
  onViewDetails?: (hotel: Hotel) => void;
  // Additional props for Google Maps deep links
  checkInDate?: Date;
  checkOutDate?: Date;
  adults?: number;
  children?: number;
}

const ListView: React.FC<ListViewProps> = ({
  hotels,
  onHotelPress,
  onViewDetails,
  checkInDate,
  checkOutDate,
  adults,
  children
}) => {

  // Debug image URLs when component renders
  React.useEffect(() => {
    console.log('🖼️ ListView Image Debug:');
    hotels.forEach((hotel, index) => {
      console.log(`Hotel ${index + 1}: ${hotel.name}`);
      console.log(`Image URL: ${hotel.image}`);
      console.log(`Is default image: ${hotel.image.includes('unsplash.com')}`);
      
      // Check if image URL is valid
      if (hotel.image && !hotel.image.startsWith('http')) {
        console.warn(`⚠️ Invalid image URL for ${hotel.name}: ${hotel.image}`);
      }
    });
  }, [hotels]);

  // Enhanced hotel press handler with debugging
  const handleHotelPress = (hotel: Hotel) => {
    console.log(`🏨 Hotel pressed: ${hotel.name}`);
    console.log(`Image URL: ${hotel.image}`);
    
    if (hotel.aiMatchPercent) {
      console.log(`🤖 AI Match: ${hotel.aiMatchPercent}%`);
    }
    
    onHotelPress?.(hotel);
  };

  // Enhanced view details handler with debugging
  const handleViewDetails = (hotel: Hotel) => {
    console.log(`📍 View details for: ${hotel.name}`);
    console.log(`Location: ${hotel.location}`);
    
    onViewDetails?.(hotel);
  };

  return (
    <ScrollView
      style={tw`flex-1 px-6`}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={tw`pb-5`}
    >
      {/* Hotels List */}
      {hotels.map((hotel, index) => {
        // Add individual hotel debugging
        const isDefaultImage = hotel.image.includes('unsplash.com');
        
        return (
          <View key={hotel.id}>
            {/* Debug info overlay for development (remove in production) */}
            {__DEV__ && isDefaultImage && (
              <View style={tw`bg-yellow-100 p-2 mb-2 rounded-lg border border-yellow-300`}>
                <Text style={tw`text-xs text-yellow-800`}>
                  ⚠️ Using default image for: {hotel.name}
                </Text>
                <Text style={tw`text-xs text-yellow-600`}>
                  Original URL: {hotel.image}
                </Text>
              </View>
            )}
            
            <HotelCard
              hotel={hotel}
              onPress={handleHotelPress}
              onViewDetails={handleViewDetails}
              checkInDate={checkInDate}
              checkOutDate={checkOutDate}
              adults={adults}
              children={children}
            />
          </View>
        );
      })}

      {/* Empty state */}
      {hotels.length === 0 && (
        <View style={tw`flex-1 items-center justify-center py-20`}>
          <View style={tw`w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4`}>
            <Ionicons name="bed-outline" size={32} color="#9CA3AF" />
          </View>
          <Text style={tw`text-lg font-semibold text-gray-900 mb-2`}>
            No Hotels Found
          </Text>
          <Text style={tw`text-sm text-gray-600 text-center px-8`}>
            Try adjusting your search criteria or dates to find available hotels
          </Text>
        </View>
      )}

    </ScrollView>
  );
};

export default ListView;