// MapViewScreen.tsx - Fixed version with smooth search refinement
import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, Image, Animated, Dimensions, ScrollView, Linking, Alert, Share, Modal } from 'react-native';
import { Text } from '../components/CustomText';
import MapboxGL from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedHeartButton from '../components/StoryView/AnimatedHeartButton';
import * as WebBrowser from 'expo-web-browser';
import { formatLocationDisplay } from '../utils/countryMapping';
import { AnalyticsService } from '../services/analytics';
import HotelChatOverlay from '../components/HomeScreenTop/HotelChatOverlay';
import ReviewsModal from '../components/StoryView/ReviewsModal';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiY29saW5wb3NhdCIsImEiOiJjbWN3bzN2azEwMnQxMmxwdmloZ2tjbHJlIn0.F9z35Dybj12dAsSpBnMZJA';
const TURQUOISE = '#1df9ff';
const TURQUOISE_DARK = '#00d4e6';
const CARD_WIDTH = screenWidth - 29;
const CARD_HEIGHT = screenHeight * 0.38;

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

import { Hotel } from '../screens/HomeScreen';

interface MapViewScreenProps {
  hotels: Hotel[];
  onClose: () => void;
  onHotelSelect: (hotel: Hotel) => void;
  checkInDate?: Date;
  checkOutDate?: Date;
  adults?: number;
  children?: number;
  placeId?: string;
  occupancies?: any[];
  onFavoriteSuccess?: (hotelName: string) => void;
  onShowSignUpModal?: () => void;
}

const DEEP_LINK_BASE_URL = 'https://staygenie.nuitee.link';

// Ken Burns Image Component
const KenBurnsImage: React.FC<{ uri: string; isActive: boolean }> = ({ uri, isActive }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      const createLoop = () => {
        return Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(scaleAnim, {
                toValue: 1.12,
                duration: 12000,
                useNativeDriver: true,
              }),
              Animated.timing(translateXAnim, {
                toValue: -10,
                duration: 12000,
                useNativeDriver: true,
              }),
              Animated.timing(translateYAnim, {
                toValue: -8,
                duration: 12000,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 12000,
                useNativeDriver: true,
              }),
              Animated.timing(translateXAnim, {
                toValue: 0,
                duration: 12000,
                useNativeDriver: true,
              }),
              Animated.timing(translateYAnim, {
                toValue: 0,
                duration: 12000,
                useNativeDriver: true,
              }),
            ]),
          ])
        );
      };

      const animation = createLoop();
      animation.start();

      return () => {
        animation.stop();
      };
    } else {
      scaleAnim.setValue(1);
      translateXAnim.setValue(0);
      translateYAnim.setValue(0);
    }
  }, [isActive]);

  return (
    <Animated.View
      style={{
        width: CARD_WIDTH - 8,
        height: CARD_HEIGHT,
        transform: [
          { scale: scaleAnim },
          { translateX: translateXAnim },
          { translateY: translateYAnim },
        ],
      }}
    >
      <Image
        source={{ uri }}
        style={tw`w-full h-full`}
        resizeMode="cover"
      />
    </Animated.View>
  );
};

const MapViewScreen: React.FC<MapViewScreenProps> = ({ 
  hotels, 
  onClose, 
  onHotelSelect,
  checkInDate,
  checkOutDate,
  adults = 2,
  children = 0,
  placeId,
  occupancies,
  onFavoriteSuccess,
  onShowSignUpModal
}) => {
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const genieShimmerAnim = useRef(new Animated.Value(0)).current;
  const [showHotelChat, setShowHotelChat] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  
  const isInitialMount = useRef(true);
  const previousHotelsRef = useRef<Hotel[]>([]);

  // Filter hotels with valid coordinates
  const validHotels = hotels.filter((h): h is Hotel & { latitude: number; longitude: number } => 
    h.latitude != null && 
    h.longitude != null && 
    !isNaN(h.latitude) && 
    !isNaN(h.longitude)
  );

  // Calculate center point from current hotels
  const centerCoordinate = React.useMemo(() => {
    if (validHotels.length === 0) return [-122.4194, 37.7749];
    
    const avgLat = validHotels.reduce((sum, h) => sum + h.latitude, 0) / validHotels.length;
    const avgLng = validHotels.reduce((sum, h) => sum + h.longitude, 0) / validHotels.length;
    
    return [avgLng, avgLat];
  }, [validHotels]);

  // When hotels change (refinement), smoothly pan to first new hotel
  useEffect(() => {
    if (validHotels.length === 0) return;

    const hotelsChanged = previousHotelsRef.current.length === 0 || 
      validHotels.length !== previousHotelsRef.current.length ||
      validHotels[0]?.id !== previousHotelsRef.current[0]?.id;
    
    if (hotelsChanged && !isInitialMount.current && previousHotelsRef.current.length > 0) {
      // This is a search refinement - pan to first hotel
      const firstHotel = validHotels[0];
      if (firstHotel) {
        setTimeout(() => {
          cameraRef.current?.setCamera({
            centerCoordinate: [firstHotel.longitude, firstHotel.latitude],
            zoomLevel: 12,
            animationDuration: 800,
          });
        }, 150);
      }
    }
    
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    
    previousHotelsRef.current = validHotels;
  }, [validHotels]);

  // Calculate initial center point (only used on first mount)
  const initialCenterCoordinate = React.useMemo(() => {
    if (validHotels.length === 0) return [-122.4194, 37.7749];
    
    const avgLat = validHotels.reduce((sum, h) => sum + h.latitude, 0) / validHotels.length;
    const avgLng = validHotels.reduce((sum, h) => sum + h.longitude, 0) / validHotels.length;
    
    return [avgLng, avgLat];
  }, []);

  // Genie shimmer animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(genieShimmerAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(genieShimmerAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleMarkerPress = (hotel: Hotel) => {
    if (hotel.latitude == null || hotel.longitude == null) return;
    
    setSelectedHotel(hotel);
    setCurrentImageIndex(0);
    
    // Slide up and scale animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
    ]).start();

    // Center map on hotel
    cameraRef.current?.setCamera({
      centerCoordinate: [hotel.longitude, hotel.latitude],
      zoomLevel: 14,
      animationDuration: 600,
    });
  };

  const closePreview = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedHotel(null);
      setCurrentImageIndex(0);
    });
  };

  const getMarkerColor = (matchPercent: number) => {
    if (matchPercent >= 90) return '#00d4e6';
    if (matchPercent >= 85) return '#1df9ff';
    if (matchPercent >= 75) return '#34d399';
    return '#60a5fa';
  };

  const parseBoldText = (text: string, boldStyle: any, normalStyle: any) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return (
          <Text key={index} style={boldStyle}>
            {boldText}
          </Text>
        );
      }
      return (
        <Text key={index} style={normalStyle}>
          {part}
        </Text>
      );
    });
  };

  const getDisplayPrice = (hotel: Hotel) => {
    if (hotel.pricePerNight) {
      return `$${hotel.pricePerNight.amount}`;
    }
    return `$${hotel.price}`;
  };

  const getHotelImages = (hotel: Hotel) => {
    const collectedImages: string[] = [];
    const MAX_IMAGES = 10;

    if (hotel.photoGalleryImages?.length) {
      collectedImages.push(...hotel.photoGalleryImages.slice(0, MAX_IMAGES));
    }

    if (collectedImages.length < MAX_IMAGES && hotel.images?.length) {
      for (const image of hotel.images) {
        if (collectedImages.length >= MAX_IMAGES) break;
        if (image && !collectedImages.includes(image)) {
          collectedImages.push(image);
        }
      }
    }

    if (collectedImages.length < MAX_IMAGES && hotel.firstRoomImage && !collectedImages.includes(hotel.firstRoomImage)) {
      collectedImages.push(hotel.firstRoomImage);
    }
    if (collectedImages.length < MAX_IMAGES && hotel.secondRoomImage && !collectedImages.includes(hotel.secondRoomImage)) {
      collectedImages.push(hotel.secondRoomImage);
    }

    if (collectedImages.length === 0 && hotel.image) {
      collectedImages.push(hotel.image);
    }

    return collectedImages.filter(img =>
      img && img.trim() !== '' &&
      (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('//'))
    );
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / (CARD_WIDTH - 8));
    setCurrentImageIndex(index);
  };

  const formatShortDateRange = (checkIn: Date, checkOut: Date) => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const start = checkIn.toLocaleDateString('en-US', opts);
    const end = checkOut.toLocaleDateString('en-US', opts);
    return `${start} – ${end}`;
  };

  const openInAppBrowser = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        dismissButtonStyle: 'done',
        showTitle: true,
        toolbarColor: '#ffffff',
        controlsColor: '#000000ff',
        enableBarCollapsing: true,
        secondaryToolbarColor: '#f6f6f6',
        showInRecents: false,
      });
    } catch {
      try { await Linking.openURL(url); } catch { }
    }
  };

  const generateHotelDeepLink = (
    hotel: Hotel,
    checkInDate?: Date,
    checkOutDate?: Date,
    adults: number = 2,
    children: number = 0,
    placeId?: string,
    occupancies?: any[]
  ) => {
    const url = new URL(`${DEEP_LINK_BASE_URL}/hotels/${hotel.id}`);
    if (placeId) url.searchParams.set('placeId', placeId);
    if (checkInDate) url.searchParams.set('checkin', checkInDate.toISOString().split('T')[0]);
    if (checkOutDate) url.searchParams.set('checkout', checkOutDate.toISOString().split('T')[0]);

    if (occupancies?.length) {
      const enc = typeof btoa !== 'undefined' ? btoa(JSON.stringify(occupancies)) : JSON.stringify(occupancies);
      url.searchParams.set('occupancies', enc);
    } else if (adults || children) {
      const defOcc = [{ adults, children: children > 0 ? [children] : [] }];
      const enc = typeof btoa !== 'undefined' ? btoa(JSON.stringify(defOcc)) : JSON.stringify(defOcc);
      url.searchParams.set('occupancies', enc);
    }

    if (hotel.topAmenities?.includes('All Inclusive')) url.searchParams.set('needAllInclusive', '1');
    if (hotel.topAmenities?.includes('Breakfast Included')) url.searchParams.set('needBreakfast', '1');

    return url.toString();
  };

const handleBookPress = async () => {
  if (!selectedHotel) return;
  
  try {
    console.log('🔵 Map View - Generating deep link with dates:', {
      checkInDate: checkInDate?.toISOString(),
      checkOutDate: checkOutDate?.toISOString(),
      adults,
      children,
      placeId,
      occupancies
    });

    await AnalyticsService.trackBookClick(
      selectedHotel.id,
      selectedHotel.name,
      0,
      selectedHotel.pricePerNight?.amount || selectedHotel.price
    );

    const url = generateHotelDeepLink(
      selectedHotel,
      checkInDate,
      checkOutDate,
      adults,
      children,
      placeId,
      occupancies
    );
    
    console.log('🔗 Map View - Generated deep link:', url);
    
    await Linking.openURL(url);  // ✅ USE THIS INSTEAD
  } catch (error) {
    console.error('❌ Error opening hotel page:', error);
    Alert.alert('Error', 'Failed to open hotel page. Please try again.');
  }
};

  const handleShowReviews = async () => {
    if (!selectedHotel) return;
    console.log('🟦 Opening reviews modal for hotel:', selectedHotel.name);
    setShowReviewsModal(true);
  };

  const handleAskAI = async () => {
    if (!selectedHotel) return;
    console.log('🟦 Opening AI chat for hotel:', selectedHotel.name);
    setShowHotelChat(true);
  };

  const displayLocation = selectedHotel?.city && selectedHotel?.country
    ? formatLocationDisplay(selectedHotel.city, selectedHotel.country)
    : selectedHotel?.location;

  const images = selectedHotel ? getHotelImages(selectedHotel) : [];

  return (
    <View style={tw`flex-1`}>
      {/* Map */}
      <MapboxGL.MapView
        style={tw`flex-1`}
        styleURL="mapbox://styles/mapbox/streets-v12"
        zoomEnabled
        scrollEnabled
        pitchEnabled={false}
        rotateEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={12}
          centerCoordinate={centerCoordinate}
          animationDuration={0}
        />

        {/* Hotel Markers */}
        {validHotels.map((hotel) => {
          const displayPrice = hotel.pricePerNight 
            ? `$${hotel.pricePerNight.amount}` 
            : `$${hotel.price}`;
          const matchPercent = hotel.aiMatchPercent ?? 0;
          
          return (
            <MapboxGL.PointAnnotation
              key={hotel.id}
              id={hotel.id}
              coordinate={[hotel.longitude, hotel.latitude]}
              onSelected={() => handleMarkerPress(hotel)}
            >
              <View style={tw`items-center`}>
                <View
                  style={[
                    tw`px-2.5 py-1.5 rounded-full items-center justify-center`,
                    {
                      backgroundColor: getMarkerColor(matchPercent),
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 3,
                      elevation: 5,
                    },
                  ]}
                >
                  <Text
                    style={[
                      tw`text-xs text-white`,
                      { fontFamily: 'Merriweather-Bold' },
                    ]}
                  >
                    {displayPrice}
                  </Text>
                </View>
                
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 6,
                    borderRightWidth: 6,
                    borderTopWidth: 8,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderTopColor: getMarkerColor(matchPercent),
                  }}
                />
              </View>
            </MapboxGL.PointAnnotation>
          );
        })}
      </MapboxGL.MapView>

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
            elevation: 5,
          },
        ]}
        onPress={onClose}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={22} color="#374151" />
      </TouchableOpacity>

      {/* Full Hotel Card - Bottom Sheet */}
      {selectedHotel && (
        <Animated.View
          style={[
            tw`absolute left-0 right-0 bottom-0`,
            {
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 20,
            },
          ]}
        >
          <View style={[tw`bg-white rounded-t-3xl`, { maxHeight: screenHeight * 0.75 }]}>
            {/* Top whitespace with X button */}
            <View style={tw`px-4 pt-3 pb-1 flex-row items-center justify-end`}>
              <TouchableOpacity
                style={[
                  tw`w-9 h-9 rounded-full items-center justify-center`,
                  {
                    backgroundColor: 'rgba(0,0,0,0.6)',
                  }
                ]}
                onPress={closePreview}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{ paddingBottom: 120 }}
            >
              {/* Image Carousel */}
              <View style={[tw`border-2 border-gray-200 rounded-2xl overflow-hidden mx-4 mb-3`, {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 8,
              }]}>
                <View style={{ height: CARD_HEIGHT }}>
                  <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    snapToInterval={CARD_WIDTH - 8}
                    decelerationRate="fast"
                    snapToAlignment="start"
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                  >
                    {images.map((img, idx) => (
                      <View
                        key={idx}
                        style={{
                          width: CARD_WIDTH - 8,
                          height: CARD_HEIGHT,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: CARD_WIDTH - 8,
                            height: CARD_HEIGHT,
                            overflow: 'hidden',
                          }}
                        >
                          <KenBurnsImage
                            uri={img}
                            isActive={idx === currentImageIndex}
                          />
                        </View>
                      </View>
                    ))}
                  </ScrollView>

                  {/* Top Gradient */}
                  <LinearGradient
                    colors={['rgba(0,0,0,0.7)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[tw`absolute top-0 left-0 right-0 z-20`, {
                      height: 100,
                    }]}
                  />

                  {/* Hotel Name - Top Left */}
                  <View style={[tw`absolute top-2.5 left-2.5 z-30 px-1`, { right: 100 }]}>
                    <Text style={[tw`text-white text-base mb-0.5`, {
                      fontFamily: 'Merriweather-Bold',
                      textShadowColor: 'rgba(0, 0, 0, 1)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 4
                    }]} numberOfLines={2}>
                      {selectedHotel.name}
                    </Text>
                    <View style={tw`flex-row items-center gap-1`}>
                      <Ionicons name="location" size={11} color="#FFF" />
                      <Text style={[tw`text-white text-xs`, {
                        fontFamily: 'Merriweather-Regular',
                        textShadowColor: 'rgba(0, 0, 0, 1)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 4
                      }]} numberOfLines={1}>
                        {displayLocation}
                      </Text>
                    </View>
                  </View>

                  {/* Availability Mini-Bar */}
                  {selectedHotel.hasAvailability !== false && checkInDate && checkOutDate && (
                    <View
                      style={[
                        tw`absolute bottom-14 left-2.5 z-40 flex-row items-center`,
                        {
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 10,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 3,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          tw`text-[10px] text-white`,
                          { fontFamily: 'Merriweather-Regular', letterSpacing: 0.2 }
                        ]}
                      >
                        Available {formatShortDateRange(checkInDate, checkOutDate)}
                      </Text>
                    </View>
                  )}

                  {/* Price and Rating - Bottom Left */}
                  <View style={tw`absolute bottom-2.5 left-2.5 z-30`}>
                    <View
                      style={[
                        tw`rounded-xl overflow-hidden`,
                        {
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                        },
                      ]}
                    >
                      {/* Price */}
                      <View style={tw`px-3 py-2`}>
                        <View style={tw`flex-row items-baseline gap-0.5`}>
                          <Text
                            style={[tw`text-base text-white`, { fontFamily: 'Merriweather-Bold' }]}
                          >
                            {getDisplayPrice(selectedHotel)}
                          </Text>
                          <Text
                            style={[tw`text-xs text-white/80`, { fontFamily: 'Merriweather-Regular' }]}
                          >
                            /night
                          </Text>
                        </View>
                      </View>

                      {/* Divider */}
                      <View
                        style={{
                          width: 1,
                          height: '70%',
                          backgroundColor: 'rgba(255,255,255,0.3)',
                        }}
                      />

                      {/* Rating */}
                      <TouchableOpacity
                        onPress={handleShowReviews}
                        activeOpacity={0.7}
                        style={tw`px-3 py-2 flex-row items-center gap-1`}
                      >
                        <Ionicons name="star" size={11} color="#FFF" />
                        <Text style={[tw`text-white text-sm`, { fontFamily: 'Merriweather-Bold' }]}>
                          {selectedHotel.rating.toFixed(1)}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={10}
                          color="rgba(255,255,255,0.6)"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Image Indicators - Top Right */}
                  {images && images.length > 1 && (
                    <View style={tw`absolute top-3.5 right-2.5 z-30`}>
                      <View
                        style={[
                          tw`px-2 py-1 rounded-full`,
                          {
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          }
                        ]}
                      >
                        <View style={tw`flex-row items-center gap-1`}>
                          {images.map((_, idx) => {
                            const isActive = idx === currentImageIndex;
                            
                            return (
                              <View
                                key={idx}
                                style={[
                                  tw`rounded-full`,
                                  {
                                    width: isActive ? 5 : 4,
                                    height: isActive ? 5 : 4,
                                    backgroundColor: isActive 
                                      ? '#FFFFFF' 
                                      : 'rgba(255,255,255,0.4)',
                                  }
                                ]}
                              />
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Hotel Info Section */}
              <View style={tw`px-4`}>
                {/* Why It Matches */}
                {selectedHotel.whyItMatches && (
                  <View style={tw`mb-4`}>
                    <View style={tw`flex-row items-center mb-2`}>
                      <Animated.View
                        style={{
                          opacity: genieShimmerAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [1, 0.7, 1]
                          }),
                        }}
                      >
                        <LinearGradient
                          colors={[TURQUOISE, TURQUOISE_DARK]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={tw`px-2 py-1 rounded-full`}
                        >
                          <View style={tw`flex-row items-center`}>
                            <Ionicons name="sparkles" size={10} color="white" style={tw`mr-1`} />
                            <Text
                              style={[
                                tw`text-[10px] text-white`,
                                { fontFamily: 'Merriweather-Bold', letterSpacing: 0.5 },
                              ]}
                            >
                              Genie Says
                            </Text>
                          </View>
                        </LinearGradient>
                      </Animated.View>
                    </View>

                    <View style={[tw`p-3 rounded-xl`, { backgroundColor: '#F9FAFB' }]}>
                      <Text style={[{ lineHeight: 20 }]}>
                        {parseBoldText(
                          selectedHotel.whyItMatches,
                          [tw`text-[13px] text-gray-800`, { fontFamily: 'Merriweather-Bold', lineHeight: 20 }],
                          [tw`text-[13px] text-gray-800`, { fontFamily: 'Merriweather-Regular', lineHeight: 20 }]
                        )}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Top Amenities */}
                {selectedHotel.topAmenities && selectedHotel.topAmenities.length > 0 && (
                  <View style={tw`mb-4`}>
                    <Text
                      style={[
                        tw`text-xs text-gray-500 mb-2`,
                        { fontFamily: 'Merriweather-Bold', letterSpacing: 0.5 }
                      ]}
                    >
                      TOP AMENITIES
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={tw`gap-2`}
                    >
                      {selectedHotel.topAmenities.slice(0, 6).map((amenity, idx) => (
                        <View
                          key={`${amenity}-${idx}`}
                          style={[
                            tw`px-3 py-2 rounded-lg border border-gray-200`,
                            { backgroundColor: '#FFFFFF' }
                          ]}
                        >
                          <Text
                            style={[
                              tw`text-xs text-gray-700`,
                              { fontFamily: 'Merriweather-Regular' }
                            ]}
                          >
                            {amenity}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Category Ratings */}
                {selectedHotel.categoryRatings && (
                  <View style={tw`mb-4`}>
                    <Text
                      style={[
                        tw`text-xs text-gray-500 mb-2`,
                        { fontFamily: 'Merriweather-Bold', letterSpacing: 0.5 }
                      ]}
                    >
                      RATINGS BREAKDOWN
                    </Text>
                    <View style={tw`gap-2`}>
                      {Object.entries(selectedHotel.categoryRatings).map(([key, value]) => (
                        <View key={key} style={tw`flex-row items-center justify-between`}>
                          <Text
                            style={[
                              tw`text-sm text-gray-700 flex-1 capitalize`,
                              { fontFamily: 'Merriweather-Regular' }
                            ]}
                          >
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </Text>
                          <View style={tw`flex-row items-center gap-2`}>
                            <View style={[tw`flex-row`, { width: 60 }]}>
                              <View
                                style={[
                                  tw`h-2 rounded-full`,
                                  {
                                    width: `${(value / 10) * 100}%`,
                                    backgroundColor: TURQUOISE
                                  }
                                ]}
                              />
                              <View
                                style={[
                                  tw`h-2 rounded-full flex-1`,
                                  { backgroundColor: '#E5E7EB' }
                                ]}
                              />
                            </View>
                            <Text
                              style={[
                                tw`text-sm text-gray-600 w-8 text-right`,
                                { fontFamily: 'Merriweather-Bold' }
                              ]}
                            >
                              {value.toFixed(1)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={tw`flex-row items-center justify-between gap-2 mb-6`}>
                  {/* Ask AI */}
                  <TouchableOpacity
                    style={tw`items-center flex-1`}
                    onPress={handleAskAI}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        tw`w-14 h-14 rounded-full items-center justify-center bg-white border border-gray-200`,
                        {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 3,
                          elevation: 3,
                        }
                      ]}
                    >
                      <Ionicons name="sparkles" size={20} color={TURQUOISE_DARK} />
                    </View>
                    <Text
                      style={[
                        tw`text-[10px] text-gray-600 mt-1`,
                        { fontFamily: 'Merriweather-Regular' }
                      ]}
                    >
                      Ask AI
                    </Text>
                  </TouchableOpacity>

                  {/* Book */}
                  <TouchableOpacity
                    style={tw`items-center flex-1`}
                    onPress={handleBookPress}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        tw`w-14 h-14 rounded-full items-center justify-center bg-white border border-gray-200`,
                        {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 3,
                          elevation: 3,
                        }
                      ]}
                    >
                      <Ionicons name="eye-outline" size={20} color={TURQUOISE_DARK} />
                    </View>
                    <Text
                      style={[
                        tw`text-[10px] text-gray-600 mt-1`,
                        { fontFamily: 'Merriweather-Regular' }
                      ]}
                    >
                      Book
                    </Text>
                  </TouchableOpacity>

                  {/* Google Maps */}
                  <TouchableOpacity
                    style={tw`items-center flex-1`}
                    onPress={async () => {
                      try {
                        const searchQuery = selectedHotel.fullAddress 
                          ? encodeURIComponent(`${selectedHotel.name} ${selectedHotel.fullAddress}`)
                          : encodeURIComponent(`${selectedHotel.name} ${displayLocation}`);
                        
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
                        await Linking.openURL(mapsUrl);
                      } catch (error) {
                        Alert.alert('Error', 'Could not open Google Maps');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        tw`w-14 h-14 rounded-full items-center justify-center bg-white border border-gray-200`,
                        {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 3,
                          elevation: 3,
                        }
                      ]}
                    >
                      <Text style={{
                        fontSize: 22,
                        fontWeight: '700',
                        color: '#374151',
                      }}>
                        G
                      </Text>
                    </View>
                    <Text
                      style={[
                        tw`text-[10px] text-gray-600 mt-1`,
                        { fontFamily: 'Merriweather-Regular' }
                      ]}
                    >
                      Google
                    </Text>
                  </TouchableOpacity>

                  {/* Share */}
                  <TouchableOpacity
                    style={tw`items-center flex-1`}
                    onPress={async () => {
                      try {
                        const searchQuery = selectedHotel.fullAddress 
                          ? encodeURIComponent(`${selectedHotel.name} ${selectedHotel.fullAddress}`)
                          : encodeURIComponent(`${selectedHotel.name} ${displayLocation}`);
                        
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
                        const shareMessage = `Check out ${selectedHotel.name}!\n\n${mapsUrl}`;
                        
                        await Share.share({ message: shareMessage });
                      } catch (error) {
                        console.log('Error sharing:', error);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        tw`w-14 h-14 rounded-full items-center justify-center bg-white border border-gray-200`,
                        {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 3,
                          elevation: 3,
                        }
                      ]}
                    >
                      <Ionicons name="share-outline" size={20} color="#374151" />
                    </View>
                    <Text
                      style={[
                        tw`text-[10px] text-gray-600 mt-1`,
                        { fontFamily: 'Merriweather-Regular' }
                      ]}
                    >
                      Share
                    </Text>
                  </TouchableOpacity>

                  {/* Favorite */}
                  <View style={tw`items-center flex-1`}>
                    <View
                      style={[
                        tw`w-14 h-14 rounded-full items-center justify-center bg-white border border-gray-200`,
                        {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 3,
                          elevation: 3,
                        }
                      ]}
                    >
                      <AnimatedHeartButton
                        hotel={selectedHotel}
                        size={20}
                        onShowSignUpModal={onShowSignUpModal}
                        onFavoriteSuccess={onFavoriteSuccess}
                      />
                    </View>
                    <Text
                      style={[
                        tw`text-[10px] text-gray-600 mt-1`,
                        { fontFamily: 'Merriweather-Regular' }
                      ]}
                    >
                      Save
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      )}

      {/* Hotel Chat Modal */}
      {selectedHotel && (
        <Modal
          visible={showHotelChat}
          transparent
          animationType="fade"
          onRequestClose={() => setShowHotelChat(false)}
        >
          <HotelChatOverlay
            visible={showHotelChat}
            onClose={() => setShowHotelChat(false)}
            hotel={selectedHotel}
          />
        </Modal>
      )}

      {/* Reviews Modal */}
      {selectedHotel && (
        <ReviewsModal
          visible={showReviewsModal}
          hotelId={selectedHotel.id}
          hotelName={selectedHotel.name}
          overallRating={selectedHotel.rating}
          totalReviews={selectedHotel.reviews}
          onClose={() => setShowReviewsModal(false)}
        />
      )}
    </View>
  );
};

export default MapViewScreen;