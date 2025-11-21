import React from 'react';
import { View, Image } from 'react-native';
import { Text } from '../../components/CustomText';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { formatLocationDisplay } from '../../utils/countryMapping';

const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoiY29saW5wb3NhdCIsImEiOiJjbWN3bzN2azEwMnQxMmxwdmloZ2tjbHJlIn0.F9z35Dybj12dAsSpBnMZJA';

interface LocationSlideProps {
  hotel: any;
  isVisible?: boolean;
  insightsStatus?: string;
}

const LocationSlide: React.FC<LocationSlideProps> = ({ hotel }) => {
  if (!hotel.latitude || !hotel.longitude) {
    return (
      <View style={tw`flex-1 bg-gray-200 items-center justify-center`}>
        <Text>No map available</Text>
      </View>
    );
  }

  const latitude = hotel.latitude!;
  const longitude = hotel.longitude!;

  const staticMapUrl =
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
    `pin-s+1df9ff(${longitude},${latitude})/` +
    `${longitude},${latitude},14,0/800x800@2x` +
    `?access_token=${MAPBOX_ACCESS_TOKEN}`;

  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      {/* STATIC MAP - Web version (no interactive map) */}
      <Image
        source={{ uri: staticMapUrl }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />

      {/* OVERLAY GRADIENT */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[tw`absolute top-0 left-0 right-0 z-20`, { height: 120 }]}
      />

      {/* TOP TEXT CONTENT */}
      <View style={tw`absolute top-2.5 left-2.5 right-2.5 z-30 px-1`}>
        {hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0 ? (
          <View>
            <Text
              style={[
                tw`text-white text-xs mb-1.5`,
                {
                  fontFamily: 'Merriweather-Bold',
                  textShadowColor: 'rgba(0, 0, 0, 1)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4,
                  letterSpacing: 0.5,
                },
              ]}
            >
              NEARBY ATTRACTIONS
            </Text>

            <View style={tw`gap-1`}>
              {hotel.nearbyAttractions.slice(0, 3).map((a: string, i: number) => (
                <View key={i} style={tw`flex-row items-center`}>
                  <View
                    style={[
                      tw`w-1.5 h-1.5 rounded-full mr-2`,
                      { backgroundColor: 'white' },
                    ]}
                  />
                  <Text
                    style={[
                      tw`text-white text-xs flex-1`,
                      {
                        fontFamily: 'Merriweather-Regular',
                        textShadowColor: 'rgba(0, 0, 0, 1)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 4,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {a}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View>
            <Text
              style={[
                tw`text-white text-base mb-0.5`,
                {
                  fontFamily: 'Merriweather-Bold',
                  textShadowColor: 'rgba(0, 0, 0, 1)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4,
                },
              ]}
            >
              {hotel.name}
            </Text>
            <View style={tw`flex-row items-center`}>
              <Ionicons name="location" size={11} color="#fff" />
              <Text
                style={[
                  tw`text-white text-xs ml-1`,
                  {
                    fontFamily: 'Merriweather-Regular',
                    textShadowColor: 'rgba(0, 0, 0, 1)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 4,
                  },
                ]}
              >
                {formatLocationDisplay(hotel.city || '', hotel.country || '')}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default LocationSlide;