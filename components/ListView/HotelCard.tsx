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
  onBookNow?: (hotel: Hotel) => void;
}

const HotelCard: React.FC<HotelCardProps> = ({ hotel, onPress, onBookNow }) => {
  // Default AI excerpt if not provided
  const defaultExcerpt = "Perfect match for your search with excellent amenities and prime location";
  
  const aiExcerpt = hotel.aiExcerpt || defaultExcerpt;

  return (
    <TouchableOpacity
      style={tw`bg-white rounded-xl mb-6 overflow-hidden shadow-sm border border-gray-100`}
      onPress={() => onPress?.(hotel)}
      activeOpacity={0.95}
    >
      <Image source={{ uri: hotel.image }} style={tw`w-full h-44`} />
      <View style={tw`p-5`}>
        {/* Header */}
        <View style={tw`flex-row justify-between items-start mb-4`}>
          <Text style={tw`flex-1 mr-3 text-[17px] font-semibold text-black leading-5`} numberOfLines={2}>
            {hotel.name}
          </Text>
          <View style={tw`flex-row items-center bg-gray-100 px-2 py-1 rounded-md`}>
            <Ionicons name="star" size={12} color="#FFB800" />
            <Text style={tw`ml-1 text-[13px] font-semibold text-black`}>
              {hotel.rating}
            </Text>
          </View>
        </View>

        {/* AI Insight - Cohesive with existing design */}
        <View style={tw`mb-5 flex-row items-start gap-3`}>
          <View style={tw`w-5 h-5 rounded-full bg-gray-100 items-center justify-center mt-0.5`}>
            <Ionicons name="sparkles" size={12} color="#666666" />
          </View>
          <Text style={tw`flex-1 text-[13px] text-gray-600 leading-5`}>
            {aiExcerpt}
          </Text>
        </View>

        {/* Price and Safety Rating */}
        <View style={tw`flex-row justify-between items-center mb-5`}>
          <View style={tw`flex-row items-baseline`}>
            <Text style={tw`text-xl font-bold text-black`}>
              ${hotel.price}
            </Text>
            {hotel.originalPrice > hotel.price && (
              <Text style={tw`ml-2 text-[13px] text-gray-400 line-through`}>
                ${hotel.originalPrice}
              </Text>
            )}
            <Text style={tw`ml-2 text-[12px] text-gray-500`}>per night</Text>
          </View>
                   
          {/* Safety Rating moved to the right */}
          <View style={tw`flex-row items-center`}>
            <Ionicons name="shield-checkmark" size={14} color="#00C851" />
            <Text style={tw`ml-1 text-[12px] text-gray-800 font-medium`}>
              Safety {hotel.safetyRating}/10
            </Text>
          </View>
        </View>

        {/* Book Now */}
        <TouchableOpacity
          style={tw`bg-black rounded-lg py-3.5 items-center justify-center`}
          onPress={(e) => { e.stopPropagation(); onBookNow?.(hotel); }}
          activeOpacity={0.8}
        >
          <Text style={tw`text-white text-[15px] font-semibold`}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default HotelCard;