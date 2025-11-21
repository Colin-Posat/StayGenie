import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, Image, Platform } from 'react-native';
import { Text } from '../CustomText';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { formatLocationDisplay } from '../../utils/countryMapping';

// ---------- CONDITIONAL MAPBOX IMPORT ----------
let MapboxGL: any = null;
if (Platform.OS !== 'web') {
  MapboxGL = require('@rnmapbox/maps').default;

  // ------------ MAPBOX SETUP ------------
  const MAPBOX_ACCESS_TOKEN =
    'pk.eyJ1IjoiY29saW5wb3NhdCIsImEiOiJjbWN3bzN2azEwMnQxMmxwdmloZ2tjbHJlIn0.F9z35Dybj12dAsSpBnMZJA';
  MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
}
// -------------------------------------

const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';

interface LocationSlideProps {
  hotel: any;
  isVisible?: boolean;
  insightsStatus?: string;
}

// -------- STATIC MAP URL (always safe on Web) --------
const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoiY29saW5wb3NhdCIsImEiOiJjbWN3bzN2azEwMnQxMmxwdmloZ2tjbHJlIn0.F9z35Dybj12dAsSpBnMZJA';

const LocationSlide: React.FC<LocationSlideProps> = ({ hotel }) => {
  const [showFullMap, setShowFullMap] = useState(false);

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

      {/* ---------- STATIC MAP PREVIEW (Used on ALL platforms) ---------- */}
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => {
          if (Platform.OS !== 'web') setShowFullMap(true);
        }}
        style={{ flex: 1 }}
      >
        <Image
          source={{ uri: staticMapUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* ---------- OVERLAY GRADIENT ---------- */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[tw`absolute top-0 left-0 right-0 z-20`, { height: 120 }]}
      />

      {/* ---------- TOP CONTENT ---------- */}
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

      {/* ---------- TAP TO EXPLORE BUTTON ---------- */}
      {Platform.OS !== 'web' && (
        <View style={tw`absolute bottom-2.5 left-2.5 z-30`}>
          <TouchableOpacity
            onPress={() => setShowFullMap(true)}
            style={[
              tw`py-2.8 px-3 rounded-xl flex-row items-center gap-1.5`,
              {
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
              },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons name="expand" size={12} color="#FFF" />

            <Text
              style={[
                tw`text-xs text-white`,
                {
                  fontFamily: 'Merriweather-Bold',
                  fontWeight: '700',
                },
              ]}
            >
              Tap to Explore
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ---------- FULL SCREEN MAP (Native Only) ---------- */}
      {Platform.OS !== 'web' && (
        <Modal visible={showFullMap} animationType="slide">
          <View style={{ flex: 1 }}>
            <MapboxGL.MapView
              style={{ flex: 1 }}
              styleURL={MAPBOX_STYLE}
              rotateEnabled={true}
              scrollEnabled={true}
              zoomEnabled={true}
              pitchEnabled={true}
            >
              <MapboxGL.Camera
                centerCoordinate={[longitude, latitude]}
                zoomLevel={14}
                pitch={0}
                animationDuration={300}
              />

              <MapboxGL.PointAnnotation
                id="full-marker"
                coordinate={[longitude, latitude]}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#1df9ff',
                    borderWidth: 3,
                    borderColor: 'white',
                  }}
                />
              </MapboxGL.PointAnnotation>
            </MapboxGL.MapView>

            {/* Close button */}
            <TouchableOpacity
              onPress={() => setShowFullMap(false)}
              style={tw`absolute top-12 right-4 bg-black/70 p-3 rounded-xl`}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>
      )}

    </View>
  );
};

export default LocationSlide;
