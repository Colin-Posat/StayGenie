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
}

interface HotelCardProps {
  hotel: Hotel;
  onPress?: (hotel: Hotel) => void;
  onBookNow?: (hotel: Hotel) => void;
}

const HotelCard: React.FC<HotelCardProps> = ({ hotel, onPress, onBookNow }) => (
  <TouchableOpacity
    style={tw`bg-white rounded-xl mb-4 overflow-hidden shadow-sm border border-gray-100`}
    onPress={() => onPress?.(hotel)}
    activeOpacity={0.95}
  >
    <Image source={{ uri: hotel.image }} style={tw`w-full h-44`} />
    <View style={tw`p-4`}>
      {/* Header */}
      <View style={tw`flex-row justify-between items-start mb-2`}>
        <Text style={tw`flex-1 mr-3 text-[17px] font-semibold text-black`} numberOfLines={2}>
          {hotel.name}
        </Text>
        <View style={tw`flex-row items-center bg-gray-100 px-2 py-1 rounded-md`}>
          <Ionicons name="star" size={12} color="#FFB800" />
          <Text style={tw`ml-1 text-[13px] font-semibold text-black`}>
            {hotel.rating}
          </Text>
        </View>
      </View>

      {/* Location */}
      <Text style={tw`text-[14px] text-gray-500 mb-4`}>{hotel.location}</Text>

      {/* Price */}
      <View style={tw`flex-row justify-between items-center mb-3`}>
        <View style={tw`flex-row items-baseline`}>
          <Text style={tw`text-xl font-bold text-black`}>
            ${hotel.price}
          </Text>
          {hotel.originalPrice > hotel.price && (
            <Text style={tw`ml-1 text-[13px] text-gray-400 line-through`}>
              ${hotel.originalPrice}
            </Text>
          )}
        </View>
        <Text style={tw`text-[11px] font-semibold text-[#007B5F] bg-[#E8F5F0] px-2 py-1 rounded`}>
          {hotel.priceComparison}
        </Text>
      </View>

      {/* Details */}
      <View style={tw`flex-row justify-between items-center mb-4`}>
        <View style={tw`flex-row items-center`}>
          <Ionicons name="shield-checkmark" size={12} color="#00C851" />
          <Text style={tw`ml-1 text-[12px] text-gray-800 font-medium`}>
            Safety {hotel.safetyRating}
          </Text>
        </View>
        <Text style={tw`text-[12px] text-gray-500`}>
          {hotel.transitDistance}
        </Text>
      </View>

      {/* Book Now */}
      <TouchableOpacity
        style={tw`bg-black rounded-lg py-3 items-center justify-center`}
        onPress={(e) => { e.stopPropagation(); onBookNow?.(hotel); }}
        activeOpacity={0.8}
      >
        <Text style={tw`text-white text-[15px] font-semibold`}>Book Now</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

export default HotelCard;
