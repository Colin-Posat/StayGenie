import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

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
  // AI excerpt about how hotel matches search criteria
  aiExcerpt?: string;
}

interface HotelCardProps {
  hotel: Hotel;
  onPress?: (hotel: Hotel) => void;
  onViewDetails?: (hotel: Hotel) => void;
}

const HotelCard: React.FC<HotelCardProps> = ({ hotel, onPress, onViewDetails }) => {
  // Default AI excerpt if not provided
  const defaultExcerpt = "Perfect match for your search with excellent amenities and prime location";
   
  const aiExcerpt = hotel.aiExcerpt || defaultExcerpt;
 
  return (
    <TouchableOpacity
      style={tw`bg-white rounded-xl mb-6 overflow-hidden shadow-sm border border-gray-100`}
      onPress={() => onPress?.(hotel)}
      activeOpacity={0.95}
    >
      {/* Image Section with Overlays */}
      <View style={tw`relative`}>
        <Image 
          source={{ uri: hotel.image }}
          style={tw`w-full h-44`}
          resizeMode="cover"
        />
         
        {/* Overlay gradient */}
        <View style={tw`absolute inset-0 bg-gradient-to-t from-black/20 to-transparent`} />
         
        {/* Rating Badge - Top Right */}
        <View style={tw`absolute top-3 right-3 bg-white/90 rounded-lg px-2 py-1`}>
          <View style={tw`flex-row items-center`}>
            <Ionicons name="star" size={12} color="#FFB800" />
            <Text style={tw`ml-1 text-[13px] font-semibold text-black`}>
              {hotel.rating}
            </Text>
          </View>
        </View>
         
        {/* Price Badge - Bottom Left */}
        <View style={tw`absolute bottom-3 left-3 bg-black/80 px-3 py-1.5 rounded-full`}>
          <Text style={tw`text-white text-sm font-semibold`}>
            ${hotel.price}/night
          </Text>
        </View>
      </View>

      <View style={tw`p-5`}>
        {/* Header */}
        <View style={tw`mb-4`}>
          <Text style={tw`text-[17px] font-semibold text-black leading-5`} numberOfLines={2}>
            {hotel.name}
          </Text>
        </View>

        {/* AI Insight */}
        <View style={tw`mb-5 flex-row items-start gap-3`}>
          <View style={tw`w-5 h-5 rounded-full bg-gray-100 items-center justify-center mt-0.5`}>
            <Ionicons name="sparkles" size={12} color="#666666" />
          </View>
          <Text style={tw`flex-1 text-[13px] text-gray-600 leading-5`}>
            {aiExcerpt}
          </Text>
        </View>

        {/* View Details */}
        <TouchableOpacity
          style={tw`bg-gray-900 rounded-lg py-3.5 items-center justify-center flex-row`}
          onPress={(e) => { e.stopPropagation(); onViewDetails?.(hotel); }}
          activeOpacity={0.8}
        >
          <Text style={tw`text-white text-[15px] font-semibold mr-2`}>View Details</Text>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default HotelCard;