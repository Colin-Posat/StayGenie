import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
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
  onClose?: () => void;
}

// -------- STATIC MAP URL (always safe on Web) --------
const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoiY29saW5wb3NhdCIsImEiOiJjbWN3bzN2azEwMnQxMmxwdmloZ2tjbHJlIn0.F9z35Dybj12dAsSpBnMZJA';

interface AttractionCoordinate {
  name: string;
  coordinates: [number, number];
}

// Function to extract attraction name from "Name - Description - Distance" format
const extractAttractionName = (attractionString: string): string => {
  // Try em dash first (–), then regular dash (-)
  let parts = attractionString.split(' – ');
  if (parts.length === 1) {
    parts = attractionString.split(' - ');
  }
  const name = parts[0].trim();
  console.log(`📝 Extracted "${name}" from "${attractionString}"`);
  return name;
};

// Place this outside the main LocationSlide component
const HotelMarkerIcon = () => (
  <View style={tw`items-center`}>
    {/* Dot Marker - now on top */}
    <View
      style={tw`w-4 h-4 rounded-full bg-[#1df9ff] border-2 border-white`}
    />

    {/* Label (Your Hotel) - now below */}
    <View style={tw`bg-black/80 px-2 py-1 rounded-md mt-1`}>
      <Text
        style={[
          tw`text-white text-xs`,
          {
            fontFamily: 'Merriweather-Bold',
          },
        ]}
      >
        Your Hotel
      </Text>
    </View>
  </View>
);

// Function to remove distance information from attraction display text
const formatAttractionForDisplay = (attractionString: string): string => {
  // Split by em dash or regular dash
  let parts = attractionString.split(' – ');
  if (parts.length === 1) {
    parts = attractionString.split(' - ');
  }
  
  // If we have 3+ parts (Name – Description – Distance), remove the last part
  if (parts.length >= 3) {
    return parts.slice(0, -1).join(' – ').trim();
  }
  
  // Otherwise return as is
  return attractionString.trim();
};

// Function to calculate distance between two coordinates in meters
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Function to geocode attraction using Mapbox Geocoding API
const LOCATIONIQ_KEY = 'pk.79c544ae745ee83f91a7523c99939210';

const geocodeAttraction = async (
  attractionName: string,
  hotelLat: number,
  hotelLng: number,
  hotelCity: string,
  hotelCountry: string
): Promise<[number, number] | null> => {
  try {
    // LocationIQ LOVES this format
    // "Central Park, New York, US"
    const query = encodeURIComponent(`${attractionName}, ${hotelCity}, ${hotelCountry}`);

    const url = `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_KEY}&q=${query}&format=json&limit=1`;

    console.log(`🌍 LocationIQ URL: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      console.log(`❌ LocationIQ error ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.log(`❌ No LocationIQ result for ${attractionName}`);
      return null;
    }

    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);

    console.log(`✅ LocationIQ found ${attractionName}:`, [lon, lat]);

    return [lon, lat];
  } catch (err) {
    console.log(`❌ LocationIQ exception for ${attractionName}`, err);
    return null;
  }
};




const LocationSlide: React.FC<LocationSlideProps> = ({ hotel, onClose }) => {
  const [attractionCoordinates, setAttractionCoordinates] = useState<AttractionCoordinate[]>([]);
  const [isLoadingAttractions, setIsLoadingAttractions] = useState(false);

  useEffect(() => {
    const loadAttractionCoordinates = async () => {
      if (!hotel.nearbyAttractions || hotel.nearbyAttractions.length === 0) {
        console.log('⚠️ No nearby attractions provided');
        return;
      }

      if (!hotel.latitude || !hotel.longitude) {
        console.log('⚠️ No hotel coordinates provided');
        return;
      }

      setIsLoadingAttractions(true);
      
      console.log('\n🏨 Hotel:', hotel.name);
      console.log('📍 Hotel coords:', [hotel.longitude, hotel.latitude]);
      console.log('🏙️ Location:', hotel.city, hotel.country);
      console.log('🎯 Attractions to geocode:', hotel.nearbyAttractions.slice(0, 3));
      console.log('═'.repeat(60));
      
      const coordinates: AttractionCoordinate[] = [];
      
      // Get coordinates for up to 3 attractions
      for (const attraction of hotel.nearbyAttractions.slice(0, 3)) {
        const name = extractAttractionName(attraction);
        const coords = await geocodeAttraction(
  name,
  hotel.latitude,
  hotel.longitude,
  hotel.city,
  hotel.country
);
        
        if (coords) {
          coordinates.push({ name, coordinates: coords });
        }
        
        // Add small delay between requests
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      console.log('\n' + '═'.repeat(60));
      console.log('📊 FINAL RESULTS:');
      console.log(`   Total attractions: ${hotel.nearbyAttractions.length}`);
      console.log(`   Successfully geocoded: ${coordinates.length}`);
      coordinates.forEach((coord, i) => {
        console.log(`   ${i + 1}. ${coord.name}: ${coord.coordinates}`);
      });
      console.log('═'.repeat(60) + '\n');
      
      setAttractionCoordinates(coordinates);
      setIsLoadingAttractions(false);
    };

    if (onClose && Platform.OS !== 'web') {
      loadAttractionCoordinates();
    }
  }, [hotel.nearbyAttractions, hotel.latitude, hotel.longitude, onClose]);

  if (!hotel.latitude || !hotel.longitude) {
    return (
      <View style={tw`flex-1 bg-gray-200 items-center justify-center`}>
        <Text>No map available</Text>
        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            style={tw`absolute top-12 right-4 bg-black/70 p-3 rounded-xl`}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        )}
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

  // If this is being used as a full-screen modal (when onClose is provided)
  // show the interactive map directly
  if (onClose && Platform.OS !== 'web') {
    return (
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
            zoomLevel={13}
            pitch={0}
            animationDuration={300}
          />

{/* Hotel marker with label */}
<MapboxGL.ShapeSource
  id="hotel-source"
  shape={{
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    properties: {
  name: hotel.name,
},
  }}
>
  {/* Circle marker */}
  <MapboxGL.CircleLayer
    id="hotel-circle"
    style={{
      circleRadius: 8,
      circleColor: '#1df9ff',
      circleStrokeWidth: 2,
      circleStrokeColor: '#ffffff',
    }}
  />
  
  {/* Label */}
  <MapboxGL.SymbolLayer
    id="hotel-label"
    style={{
      textField: ['get', 'name'],
      textSize: 12,
      textColor: '#ffffff',
      textHaloColor: '#000000',
      textHaloWidth: 2,
      textAnchor: 'top',
      textOffset: [0, 1],
      textFont: ['Open Sans Bold', 'Arial Unicode MS Bold'],
    }}
  />
</MapboxGL.ShapeSource>



          {/* Attraction markers with labels */}
          {attractionCoordinates.length > 0 && (
            <MapboxGL.ShapeSource
              id="attractions-source"
              shape={{
                type: 'FeatureCollection',
                features: attractionCoordinates.map((attraction, index) => ({
                  type: 'Feature',
                  id: `attraction-${index}`,
                  geometry: {
                    type: 'Point',
                    coordinates: attraction.coordinates,
                  },
                  properties: {
                    name: attraction.name,
                  },
                })),
              }}
            >
              {/* Circle markers */}
              <MapboxGL.CircleLayer
                id="attractions-circles"
                style={{
                  circleRadius: 7,
                  circleColor: '#ff6b6b',
                  circleStrokeWidth: 2,
                  circleStrokeColor: '#ffffff',
                }}
              />
              
              {/* Labels */}
              <MapboxGL.SymbolLayer
                id="attractions-labels"
                style={{
                  textField: ['get', 'name'],
                  textSize: 11,
                  textColor: '#ffffff',
                  textHaloColor: '#000000',
                  textHaloWidth: 2,
                  textAnchor: 'top',
                  textOffset: [0, 1],
                  textFont: ['Open Sans Bold', 'Arial Unicode MS Bold'],
                }}
              />
            </MapboxGL.ShapeSource>
          )}
        </MapboxGL.MapView>

        {/* Loading indicator */}
        {isLoadingAttractions && (
          <View style={tw`absolute top-20 left-0 right-0 items-center`}>
            <View style={tw`bg-black/70 px-4 py-2 rounded-xl flex-row items-center`}>
              <ActivityIndicator size="small" color="#1df9ff" />
              <Text style={[tw`text-white text-xs ml-2`, { fontFamily: 'Merriweather-Regular' }]}>
                Loading attractions...
              </Text>
            </View>
          </View>
        )}

        {/* Close button */}
        <TouchableOpacity
          onPress={onClose}
          style={tw`absolute top-12 right-4 bg-black/70 p-3 rounded-xl`}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Hotel info overlay at bottom */}
        <View style={tw`absolute bottom-0 left-0 right-0`}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={tw`px-4 py-17`}
          >
            <Text
              style={[
                tw`text-white text-lg mb-1`,
                {
                  fontFamily: 'Merriweather-Bold',
                },
              ]}
            >
              {hotel.name}
            </Text>
            <View style={tw`flex-row items-center`}>
              <Ionicons name="location" size={14} color="#1df9ff" />
              <Text
                style={[
                  tw`text-white text-sm ml-1`,
                  {
                    fontFamily: 'Merriweather-Regular',
                  },
                ]}
              >
                {formatLocationDisplay(hotel.city || '', hotel.country || '')}
              </Text>
            </View>
            {hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0 && (
              <View style={tw`mt-3`}>
                <Text
                  style={[
                    tw`text-white/70 text-xs mb-2`,
                    {
                      fontFamily: 'Merriweather-Bold',
                      letterSpacing: 0.5,
                    },
                  ]}
                >
                  NEARBY ATTRACTIONS
                </Text>
                {hotel.nearbyAttractions.slice(0, 3).map((a: string, i: number) => (
                  <View key={i} style={tw`flex-row items-center mb-1`}>
                    <View
                      style={[
                        tw`w-1 h-1 rounded-full mr-2`,
                        { backgroundColor: '#ff6b6b' },
                      ]}
                    />
                    <Text
                      style={[
                        tw`text-white/90 text-xs flex-1`,
                        {
                          fontFamily: 'Merriweather-Regular',
                        },
                      ]}
                      numberOfLines={3}
                    >
                      {formatAttractionForDisplay(a)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </LinearGradient>
        </View>
      </View>
    );
  }

  // Otherwise show the static preview (original behavior - not used anymore)
  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      <Image
        source={{ uri: staticMapUrl }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />

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
                    numberOfLines={3}
                  >
                    {formatAttractionForDisplay(a)}
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