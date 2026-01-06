// MapViewScreen.web.tsx - Web version with static map
import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Dimensions, ScrollView } from 'react-native';
import { Text } from '../components/CustomText';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { Hotel } from '../screens/HomeScreen';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiY29saW5wb3NhdCIsImEiOiJjbWN3bzN2azEwMnQxMmxwdmloZ2tjbHJlIn0.F9z35Dybj12dAsSpBnMZJA';

interface MapViewScreenProps {
  hotels: Hotel[];
  onClose: () => void;
  onHotelSelect: (hotel: Hotel) => void;
}

const MapViewScreen: React.FC<MapViewScreenProps> = ({ hotels, onClose, onHotelSelect }) => {
  // Filter hotels with valid coordinates
  const validHotels = hotels.filter((h): h is Hotel & { latitude: number; longitude: number } => 
    h.latitude != null && h.longitude != null && !isNaN(h.latitude) && !isNaN(h.longitude)
  );

  // Calculate center point
  const centerCoordinate = React.useMemo(() => {
    if (validHotels.length === 0) return [-122.4194, 37.7749];
    
    const avgLat = validHotels.reduce((sum, h) => sum + (h.latitude ?? 0), 0) / validHotels.length;
    const avgLng = validHotels.reduce((sum, h) => sum + (h.longitude ?? 0), 0) / validHotels.length;
    
    return [avgLng, avgLat];
  }, [validHotels]);

  const getMarkerColor = (matchPercent: number) => {
    if (matchPercent >= 90) return '00d4e6';
    if (matchPercent >= 85) return '1df9ff';
    if (matchPercent >= 75) return '34d399';
    return '60a5fa';
  };

  // Generate static map URL
  const generateStaticMapUrl = () => {
    const [lng, lat] = centerCoordinate;
    
    // Build markers string
    const markers = validHotels.map(hotel => {
      const color = getMarkerColor(hotel.aiMatchPercent || 0);
      return `pin-s+${color}(${hotel.longitude},${hotel.latitude})`;
    }).join(',');

    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${markers}/${lng},${lat},11,0/${Math.round(screenWidth)}x${Math.round(screenHeight * 0.6)}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`;
  };

  return (
    <View style={tw`flex-1 relative bg-gray-50`}>
      {/* Static Map Image */}
      <Image
        source={{ uri: generateStaticMapUrl() }}
        style={{ width: '100%', height: '60%' }}
        resizeMode="cover"
      />

      {/* Close Button */}
      <TouchableOpacity
        style={[
          tw`absolute top-12 left-4 w-10 h-10 rounded-full items-center justify-center`,
          {
            backgroundColor: 'white',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
          },
        ]}
        onPress={onClose}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={22} color="#374151" />
      </TouchableOpacity>

      {/* Hotel Count Badge */}
      <View
        style={[
          tw`absolute top-12 right-4 px-3 py-2 rounded-full flex-row items-center`,
          {
            backgroundColor: 'white',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
          },
        ]}
      >
        <Ionicons name="home" size={14} color="#00d4e6" style={tw`mr-1`} />
        <Text style={[tw`text-sm text-gray-800`, { fontFamily: 'Merriweather-Bold' }]}>
          {validHotels.length}
        </Text>
      </View>

      {/* Hotel List */}
      <ScrollView
        style={[tw`flex-1 bg-white`, { marginTop: -20, borderTopLeftRadius: 20, borderTopRightRadius: 20 }]}
        contentContainerStyle={tw`p-4`}
      >
        <Text style={[tw`text-lg text-gray-900 mb-3`, { fontFamily: 'Merriweather-Bold' }]}>
          Hotels on Map ({validHotels.length})
        </Text>
        
        {validHotels.map((hotel) => (
          <TouchableOpacity
            key={hotel.id}
            style={[
              tw`mb-3 p-3 rounded-xl border border-gray-200`,
              { backgroundColor: 'white' }
            ]}
            onPress={() => onHotelSelect(hotel)}
            activeOpacity={0.7}
          >
            <View style={tw`flex-row`}>
              <Image
                source={{ uri: hotel.image }}
                style={[tw`rounded-lg`, { width: 80, height: 80, marginRight: 12 }]}
                resizeMode="cover"
              />
              <View style={tw`flex-1`}>
                <Text
                  style={[tw`text-sm text-gray-900 mb-1`, { fontFamily: 'Merriweather-Bold' }]}
                  numberOfLines={2}
                >
                  {hotel.name}
                </Text>
                
                <LinearGradient
                  colors={['#1df9ff', '#00d4e6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[tw`px-2 py-1 rounded-full mb-1`, { alignSelf: 'flex-start' }]}
                >
                  <Text style={[tw`text-xs text-white`, { fontFamily: 'Merriweather-Bold' }]}>
                    {hotel.aiMatchPercent}% Match
                  </Text>
                </LinearGradient>

                <Text style={[tw`text-sm text-gray-900`, { fontFamily: 'Merriweather-Bold' }]}>
                  ${hotel.pricePerNight?.amount || hotel.price}
                  <Text style={[tw`text-xs text-gray-500`, { fontFamily: 'Merriweather-Regular' }]}>
                    /night
                  </Text>
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default MapViewScreen;