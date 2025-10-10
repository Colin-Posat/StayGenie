import React, { useState } from 'react';
import { View, Text as RNText, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { Text } from '../../components/CustomText'; 
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
  // Additional AI properties from smart search
  whyItMatches?: string;
  funFacts?: string[];
  aiMatchPercent?: number;
  pricePerNight?: {
    display: string;
    min: number;
    max: number;
    currency: string;
  };
  bestOffer?: {
    price: {
      currency: string;
      total: string;
    };
  };
}

interface HotelCardProps {
  hotel: Hotel;
  onPress?: (hotel: Hotel) => void;
  onViewDetails?: (hotel: Hotel) => void;
  // Additional props for Google Maps deep link
  checkInDate?: Date;
  checkOutDate?: Date;
  adults?: number;
  children?: number;
}

const HotelCard: React.FC<HotelCardProps> = ({ 
  hotel, 
  onPress, 
  onViewDetails,
  checkInDate,
  checkOutDate,
  adults = 2,
  children = 0
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Default AI excerpt if not provided
  const defaultExcerpt = "Perfect match for your search with excellent amenities and prime location";
  const aiExcerpt = hotel.whyItMatches || hotel.aiExcerpt || defaultExcerpt;

  // Fallback image URL
  const fallbackImage = "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80";



  // Handle image load success
  const handleImageLoad = () => {
    console.log(`✅ Image loaded successfully for: ${hotel.name}`);
    setImageLoaded(true);
    setImageError(false);
  };

  // Handle image load error
  const handleImageError = (error: any) => {
    console.error(`❌ Image failed to load for: ${hotel.name}`, error);
    console.error(`Failed URL: ${hotel.image}`);
    setImageError(true);
    setImageLoaded(false);
  };

  // Get the image source
  const getImageSource = () => {
    if (imageError || !hotel.image || hotel.image.trim() === '') {
      return { uri: fallbackImage };
    }
    return { uri: hotel.image };
  };

  // Generate Google Maps deep link for hotel with dates
  const generateGoogleMapsLink = (hotelName: string, location: string, checkin?: Date, checkout?: Date, adults: number = 2, children: number = 0): string => {
    // Clean and encode the search query
    const query = encodeURIComponent(`${hotelName} ${location}`);
    
    // Build base URL with hotel search parameters
    let url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    
    // Add hotel booking parameters if dates are provided
    if (checkin && checkout) {
      const checkinStr = checkin.toISOString().split('T')[0]; // YYYY-MM-DD format
      const checkoutStr = checkout.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      url += `&hotel_dates=${checkinStr},${checkoutStr}`;
      url += `&hotel_adults=${adults}`;
      
      if (children > 0) {
        url += `&hotel_children=${children}`;
      }
    }
    
    return url;
  };

  // Handle View Details button press
  const handleViewDetails = async () => {
    try {
      // Generate the Google Maps deep link
      const mapsLink = generateGoogleMapsLink(
        hotel.name,
        hotel.location,
        checkInDate,
        checkOutDate,
        adults,
        children
      );

      console.log(`🗺️ Opening Google Maps for: ${hotel.name}`);
      console.log(`📍 Location: ${hotel.location}`);
      console.log(`🔗 Maps URL: ${mapsLink}`);

      // Check if the URL can be opened
      const canOpen = await Linking.canOpenURL(mapsLink);
      
      if (canOpen) {
        // Open the Google Maps link
        await Linking.openURL(mapsLink);
      } else {
        // Fallback to basic Google Maps search if the enhanced URL doesn't work
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotel.name} ${hotel.location}`)}`;
        await Linking.openURL(fallbackUrl);
      }

      // Call the original onViewDetails callback if provided
      onViewDetails?.(hotel);

    } catch (error) {
      console.error('Error opening Google Maps:', error);
      
      // Show user-friendly error message
      Alert.alert(
        'Unable to Open Maps',
        'Could not open Google Maps. Please check your internet connection and try again.',
        [
          {
            text: 'OK',
            onPress: () => onViewDetails?.(hotel) // Still call the callback
          }
        ]
      );
    }
  };

  // Get display price - always show cheapest price only
  const getDisplayPrice = () => {
    if (hotel.pricePerNight) {
      // Use the minimum price from pricePerNight object
      return `$${hotel.pricePerNight.min}/night`;
    }
    return `$${hotel.price}/night`;
  };
 
  return (
    <TouchableOpacity
      style={tw`bg-white rounded-xl mb-6 overflow-hidden shadow-sm border border-gray-100`}
      onPress={() => onPress?.(hotel)}
      activeOpacity={0.95}
    >
      {/* Image Section with Overlays */}
      <View style={tw`relative`}>
        <Image 
          source={getImageSource()}
          style={tw`w-full h-44`}
          resizeMode="cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />

        {/* Image loading indicator */}
        {!imageLoaded && !imageError && (
          <View style={tw`absolute inset-0 bg-gray-200 items-center justify-center`}>
            <Ionicons name="image-outline" size={32} color="#9CA3AF" />
            <Text style={tw`text-xs text-gray-500 mt-2`}>Loading...</Text>
          </View>
        )}

        {/* Image error indicator (development only) */}
        {__DEV__ && imageError && (
          <View style={tw`absolute top-2 left-2 bg-red-500 px-2 py-1 rounded`}>
            <Text style={tw`text-white text-xs`}>IMG ERROR</Text>
          </View>
        )}
         
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

        {/* AI Match Badge - Top Left (if available) */}
        {hotel.aiMatchPercent && (
          <View style={tw`absolute top-3 left-3 bg-black/90 rounded-lg px-2 py-1`}>
            <View style={tw`flex-row items-center`}>
              <Ionicons name="sparkles" size={12} color="white" />
              <Text style={tw`ml-1 text-[13px] font-semibold text-white`}>
                {hotel.aiMatchPercent}%
              </Text>
            </View>
          </View>
        )}
         
        {/* Price Badge - Bottom Left */}
        <View style={tw`absolute bottom-3 left-3 bg-black/80 px-3 py-1.5 rounded-full`}>
          <Text style={tw`text-white text-sm font-semibold`}>
            {getDisplayPrice()}
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
        <View style={tw`mb-4 flex-row items-start gap-3`}>
          <View style={tw`w-5 h-5 rounded-full ${hotel.aiMatchPercent ? 'bg-gray-100' : 'bg-gray-100'} items-center justify-center mt-0.5`}>
            <Ionicons 
              name="sparkles" 
              size={12} 
              color="#666666" 
            />
          </View>
          <Text style={tw`flex-1 text-[13px] text-gray-600 leading-5`}>
            {aiExcerpt}
          </Text>
        </View>

        {/* Tags */}
        {hotel.tags && hotel.tags.length > 0 && (
          <View style={tw`mb-4 flex-row flex-wrap gap-1.5`}>
            {hotel.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={tw`bg-gray-50 px-2 py-1 rounded-full`}>
                <Text style={tw`text-[11px] text-gray-700 font-medium`}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* View Details Button */}
        <TouchableOpacity
          style={tw`bg-gray-900 rounded-lg py-3.5 items-center justify-center flex-row`}
          onPress={(e) => { 
            e.stopPropagation(); 
            handleViewDetails();
          }}
          activeOpacity={0.8}
        >
          <Text style={tw`text-white text-[15px] font-semibold mr-2`}>
            View Details
          </Text>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default HotelCard;