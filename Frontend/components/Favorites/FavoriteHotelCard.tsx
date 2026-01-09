// FavoriteHotelCard.tsx - SwipeableHotelStoryCard with delete button
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Modal,
  Share,
  Animated,
  Easing,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import AnimatedHeartButton from '../StoryView/AnimatedHeartButton';
import * as WebBrowser from 'expo-web-browser';
import HotelChatOverlay from '../../components/HomeScreenTop/HotelChatOverlay';
import { formatLocationDisplay } from '../../utils/countryMapping';
import { PanGestureHandler, TapGestureHandler } from 'react-native-gesture-handler';
import ReviewsModal from '../StoryView/ReviewsModal';
import PhotoGallerySlide from '../StoryView/PhotoGallerySlide';
import LocationSlide from '../StoryView/LocationSlide';
import { useFonts } from 'expo-font';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = Math.round(screenWidth - 37);
const CARD_HEIGHT = screenHeight * 0.32;

const TURQUOISE = '#1df9ff';
const TURQUOISE_DARK = '#00d4e6';
const DEEP_LINK_BASE_URL = 'https://staygenie.nuitee.link';

interface FavoriteHotelCardProps {
  hotel: any;
  onPress: (hotel: any) => void;
  onRemove: (hotel: any) => void;
  index: number;
  checkInDate?: Date;
  checkOutDate?: Date;
  adults?: number;
  children?: number;
  placeId?: string;
  occupancies?: any[];
  onFavoriteSuccess?: (hotelName: string) => void;
}

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
      return () => animation.stop();
    } else {
      scaleAnim.setValue(1);
      translateXAnim.setValue(0);
      translateYAnim.setValue(0);
    }
  }, [isActive]);

  return (
    <Animated.View
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        transform: [
          { scale: scaleAnim },
          { translateX: translateXAnim },
          { translateY: translateYAnim },
        ],
      }}
    >
      <Image source={{ uri }} style={tw`w-full h-full`} resizeMode="cover" />
    </Animated.View>
  );
};

// Confirmation Modal
const ConfirmationModal: React.FC<{
  isVisible: boolean;
  hotelName: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isVisible, hotelName, onConfirm, onCancel }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <View style={tw`absolute inset-0 items-center justify-center z-50 bg-black/50`}>
      <Animated.View
        style={[
          tw`bg-white rounded-2xl p-6 mx-6 shadow-xl`,
          { transform: [{ scale: scaleAnim }], opacity: fadeAnim }
        ]}
      >
        <Text style={tw`text-lg font-semibold text-black mb-2`}>
          Remove from Favorites
        </Text>
        <Text style={tw`text-gray-600 text-sm mb-6`}>
          Remove "{hotelName}" from your favorites?
        </Text>
        
        <View style={tw`flex-row justify-end gap-3`}>
          <TouchableOpacity
            style={tw`px-6 py-3 rounded-xl bg-gray-100`}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={tw`text-gray-700 font-medium`}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={tw`px-6 py-3 rounded-xl bg-red-500`}
            onPress={onConfirm}
            activeOpacity={0.7}
          >
            <Text style={tw`text-white font-medium`}>Remove</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const parseBoldText = (text: string, boldStyle: any, normalStyle: any) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={index} style={boldStyle}>{part.slice(2, -2)}</Text>;
    }
    return <Text key={index} style={normalStyle}>{part}</Text>;
  });
};

const FavoriteHotelCard: React.FC<FavoriteHotelCardProps> = ({
  hotel,
  onPress,
  onRemove,
  index,
  checkInDate,
  checkOutDate,
  adults = 2,
  children = 0,
  placeId,
  occupancies,
  onFavoriteSuccess,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showHotelChat, setShowHotelChat] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const genieShimmerAnim = useRef(new Animated.Value(0)).current;
  const panRef = useRef(null);
  const tapRef = useRef(null);

  const [fontsLoaded] = useFonts({
    'Merriweather-Bold': require('../../assets/fonts/Merriweather_36pt-Bold.ttf'),
    'Merriweather-Regular': require('../../assets/fonts/Merriweather_36pt-Regular.ttf'),
  });

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

  const images = React.useMemo(() => {
    const collected: string[] = [];
    const MAX_IMAGES = 10;

    if (hotel.photoGalleryImages?.length) {
      collected.push(...hotel.photoGalleryImages.slice(0, MAX_IMAGES));
    }
    if (collected.length < MAX_IMAGES && hotel.images?.length) {
      for (const img of hotel.images) {
        if (collected.length >= MAX_IMAGES) break;
        if (img && !collected.includes(img)) collected.push(img);
      }
    }
    if (collected.length < MAX_IMAGES && hotel.firstRoomImage && !collected.includes(hotel.firstRoomImage)) {
      collected.push(hotel.firstRoomImage);
    }
    if (collected.length < MAX_IMAGES && hotel.secondRoomImage && !collected.includes(hotel.secondRoomImage)) {
      collected.push(hotel.secondRoomImage);
    }
    if (collected.length < MAX_IMAGES && hotel.thirdImageHd && !collected.includes(hotel.thirdImageHd)) {
      collected.push(hotel.thirdImageHd);
    }
    if (collected.length === 0 && hotel.image) {
      collected.push(hotel.image);
    }

    return collected.filter(img => 
      img && img.trim() !== '' && 
      (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('//'))
    );
  }, [hotel]);

  const enhancedHotel = React.useMemo(() => {
    return {
      ...hotel,
      photoGalleryImages: images,
      images: images,
    };
  }, [hotel, images]);

  const displayLocation = hotel.city && hotel.country
    ? formatLocationDisplay(hotel.city, hotel.country)
    : hotel.location;

  const getDisplayPrice = () => {
    if (hotel.pricePerNight) {
      return `$${hotel.pricePerNight.amount}`;
    }
    return `$${hotel.price}`;
  };

  const formatShortDateRange = (checkIn: Date, checkOut: Date) => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const start = checkIn.toLocaleDateString('en-US', opts);
    const end = checkOut.toLocaleDateString('en-US', opts);
    return `${start} – ${end}`;
  };

  const generateHotelDeepLink = () => {
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

  const handleBookNow = async () => {
    try {
      const url = generateHotelDeepLink();
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
      Alert.alert('Error', 'Failed to open hotel page. Please try again.');
    }
  };

  const handleShare = async () => {
    try {
      const searchQuery = hotel.fullAddress 
        ? encodeURIComponent(`${hotel.name} ${hotel.fullAddress}`)
        : encodeURIComponent(`${hotel.name} ${displayLocation}`);
      
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
      const shareMessage = `Check out ${hotel.name}!\n\n${mapsUrl}`;
      
      await Share.share({ message: shareMessage });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleRemove = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmRemove = () => {
    setShowConfirmModal(false);
    onRemove(hotel);
  };

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);
    Animated.spring(expandAnim, {
      toValue,
      useNativeDriver: false,
      tension: 100,
      friction: 10,
      overshootClamping: false,
    }).start();
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / CARD_WIDTH);
    setCurrentImageIndex(index);
  };

  const handleTap = ({ nativeEvent }: any) => {
    if (nativeEvent.state === 5) {
      setShowPhotoGallery(true);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={tw`mb-4`}>
      <View style={[tw`rounded-2xl`, {
        width: CARD_WIDTH,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
      }]}>
        <View style={[tw`border-2 border-gray-200 rounded-2xl overflow-hidden bg-white`]}>
          {/* Image Section */}
          <View style={{ height: CARD_HEIGHT }}>
            <PanGestureHandler ref={panRef} activeOffsetX={[-12, 12]}>
              <TapGestureHandler
                ref={tapRef}
                waitFor={panRef}
                onHandlerStateChange={handleTap}
              >
                <View>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    snapToInterval={CARD_WIDTH}
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
                          width: CARD_WIDTH,
                          height: CARD_HEIGHT,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: CARD_WIDTH,
                            height: CARD_HEIGHT,
                            overflow: 'hidden',
                          }}
                        >
                          <KenBurnsImage uri={img} isActive={idx === currentImageIndex} />
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </TapGestureHandler>
            </PanGestureHandler>

            {/* Top Gradient for Hotel Name */}
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[tw`absolute top-0 left-0 right-0 z-20`, { height: 100 }]}
            />

            {/* Hotel Name - Top Left */}
            <View style={[tw`absolute top-2.5 left-2.5 z-30 px-1`, { right: 100 }]}>
              <Text style={[tw`text-white text-base mb-0.5`, {
                fontFamily: 'Merriweather-Bold',
                textShadowColor: 'rgba(0, 0, 0, 1)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4
              }]} numberOfLines={2}>
                {hotel.name}
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
            {hotel.hasAvailability !== false && checkInDate && checkOutDate && (
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
                {/* LEFT SIDE - PRICE */}
                <View style={tw`px-3 py-2`}>
                  <View style={tw`flex-row items-baseline gap-0.5`}>
                    <Text
                      style={[tw`text-base text-white`, { fontFamily: 'Merriweather-Bold' }]}
                    >
                      {getDisplayPrice()}
                    </Text>
                    <Text
                      style={[tw`text-xs text-white/80`, { fontFamily: 'Merriweather-Regular' }]}
                    >
                      /night
                    </Text>
                  </View>
                </View>

                {/* DIVIDER */}
                <View
                  style={{
                    width: 1,
                    height: '70%',
                    backgroundColor: 'rgba(255,255,255,0.3)',
                  }}
                />

                {/* RIGHT SIDE - RATING */}
                <TouchableOpacity
                  onPress={() => setShowReviewsModal(true)}
                  activeOpacity={0.7}
                  style={tw`px-3 py-2 flex-row items-center gap-1`}
                >
                  <Ionicons name="star" size={11} color="#FFF" />
                  <Text style={[tw`text-white text-sm`, { fontFamily: 'Merriweather-Bold' }]}>
                    {hotel.rating?.toFixed(1) || 'N/A'}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={10}
                    color="rgba(255,255,255,0.6)"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Show Map Button - Bottom Right */}
            <View style={tw`absolute bottom-2.5 right-2.5 z-40`}>
              <TouchableOpacity
                onPress={() => setShowFullMap(true)}
                style={[
                  tw`py-2.8 px-3 rounded-xl flex-row items-center gap-1.5`,
                  {
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4
                  }
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="map" size={12} color="#FFF" />
                <Text style={[
                  tw`text-xs text-white`,
                  { fontFamily: 'Merriweather-Bold' }
                ]}>
                  Show Map
                </Text>
              </TouchableOpacity>
            </View>

            {/* Image Indicators - Top Right */}
            {images && images.length > 1 && (
              <View style={tw`absolute top-3.5 right-2.5 z-30`}>
                <View
                  style={[
                    tw`px-2 py-1 rounded-full`,
                    { backgroundColor: 'rgba(0, 0, 0, 0.6)' }
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

          {/* Expandable Bottom Section */}
          <View style={tw`mx-3 my-3`}>
            <TouchableOpacity
              onPress={toggleExpanded}
              activeOpacity={0.8}
              style={[
                tw`rounded-xl mb-2.5`,
                {
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 3,
                  overflow: 'hidden',
                }
              ]}
            >
              {/* Collapsed State - Preview */}
              <View style={tw`px-3 py-2.5`}>
                {hotel.whyItMatches ? (
                  <>
                    {/* Header Row: Genie Badge (left) + Distance (right) */}
                    <View style={tw`mb-1.5`}>
                      <View style={tw`flex-row items-center justify-between mb-1.5`}>
                        {/* Genie Badge - Left */}
                        <Animated.View
                          style={{
                            opacity: genieShimmerAnim.interpolate({
                              inputRange: [0, 0.5, 1],
                              outputRange: [1, 0.7, 1]
                            }),
                            transform: [{
                              scale: genieShimmerAnim.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [1, 1.02, 1]
                              })
                            }]
                          }}
                        >
                          <LinearGradient
                            colors={[TURQUOISE, TURQUOISE_DARK]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[tw`px-2 py-1 rounded-full`]}
                          >
                            <View style={tw`flex-row items-center`}>
                              <Animated.View
                                style={{
                                  transform: [{
                                    rotate: genieShimmerAnim.interpolate({
                                      inputRange: [0, 0.5, 1],
                                      outputRange: ['0deg', '15deg', '0deg']
                                    })
                                  }]
                                }}
                              >
                                <Ionicons name="sparkles" size={10} color="white" style={tw`mr-1`} />
                              </Animated.View>
                              <Text style={[
                                tw`text-[10px] text-white`,
                                { 
                                  fontFamily: 'Merriweather-Bold',
                                  letterSpacing: 0.5,
                                }
                              ]}>
                                Genie Says
                              </Text>
                            </View>
                          </LinearGradient>
                        </Animated.View>

                        {/* Distance Badge - Right */}
                        {hotel.distanceFromSearch?.showInUI && hotel.distanceFromSearch?.fromLocation && (
                          <View style={[
                            tw`px-2 py-1 rounded-full bg-gray-100 flex-row items-center`,
                            { maxWidth: '60%' }
                          ]}>
                            <Ionicons name="location" size={10} color="#6B7280" style={tw`mr-1`} />
                            <Text 
                              style={[
                                tw`text-[10px] text-gray-600`,
                                { fontFamily: 'Merriweather-Regular' }
                              ]}
                              numberOfLines={1}
                            >
                              {hotel.distanceFromSearch.formatted} from {hotel.distanceFromSearch.fromLocation}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Match Text - Tighter Line Height */}
                      <Text 
                        style={[
                          tw`text-[13px] text-gray-800 mb-1`,
                          { 
                            fontFamily: 'Merriweather-Regular',
                            lineHeight: 18,
                          }
                        ]}
                        numberOfLines={isExpanded ? undefined : 4}
                      >
                        {parseBoldText(
                          hotel.whyItMatches,
                          [tw`text-[13px] text-gray-800`, { fontFamily: 'Merriweather-Bold', lineHeight: 18 }],
                          [tw`text-[13px] text-gray-800`, { fontFamily: 'Merriweather-Regular', lineHeight: 18 }]
                        )}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    {/* Quick Stats when no match */}
                    <View style={tw`flex-row items-center justify-between mb-1`}>
                      <View style={tw`flex-row items-center`}>
                        <Ionicons name="star" size={13} color="#FCD34D" style={tw`mr-1`} />
                        <Text style={[tw`text-[13px] text-gray-800`, { fontFamily: 'Merriweather-Bold' }]}>
                          {hotel.rating?.toFixed(1) || 'N/A'}
                        </Text>
                        <Text style={[tw`text-[11px] text-gray-500 ml-1`, { fontFamily: 'Merriweather-Regular' }]}>
                          ({hotel.reviews || 0} reviews)
                        </Text>
                      </View>
                      {hotel.transitDistance && (
                        <View style={tw`flex-row items-center`}>
                          <Ionicons name="location-outline" size={13} color="#6B7280" style={tw`mr-1`} />
                          <Text style={[tw`text-[11px] text-gray-600`, { fontFamily: 'Merriweather-Regular' }]}>
                            {hotel.transitDistance}
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                )}

                {/* Compact Expand/Collapse Indicator */}
                <View style={tw`flex-row items-center justify-center pt-1.5 border-t border-gray-100`}>
                  <Text style={[
                    tw`text-[11px] text-gray-500 mr-0.5`,
                    { fontFamily: 'Merriweather-Regular' }
                  ]}>
                    {isExpanded ? 'Show Less' : 'Show More'}
                  </Text>
                  <Animated.View
                    style={{
                      transform: [{
                        rotate: expandAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '180deg']
                        })
                      }]
                    }}
                  >
                    <Ionicons name="chevron-down" size={12} color="#9CA3AF" />
                  </Animated.View>
                </View>
              </View>

              {/* Expanded Content */}
              {isExpanded && (
                <Animated.View
                  style={{
                    opacity: expandAnim,
                    transform: [{
                      translateY: expandAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0]
                      })
                    }]
                  }}
                >
                  <View style={tw`px-3 pb-2.5`}>
                    {/* Top Amenities */}
                    {hotel.topAmenities && hotel.topAmenities.length > 0 && (
                      <View style={tw`mb-5`}>
                        <Text style={[
                          tw`text-[10px] text-gray-500 mb-1.5 ml-.5`,
                          { fontFamily: 'Merriweather-Bold', letterSpacing: 0.5 }
                        ]}>
                          TOP AMENITIES
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={tw`gap-1.5`}
                        >
                          {hotel.topAmenities.slice(0, 6).map((amenity: any, idx: any) => (
                            <View
                              key={`${amenity}-${idx}`}
                              style={[
                                tw`px-2 py-1 rounded-lg border border-gray-200`,
                                { backgroundColor: '#FFFFFF' }
                              ]}
                            >
                              <Text style={[
                                tw`text-[11px] text-gray-700`,
                                { fontFamily: 'Merriweather-Regular' }
                              ]}>
                                {amenity}
                              </Text>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Category Ratings */}
                    {hotel.categoryRatings && (
                      <View style={tw`mb-5`}>
                        <Text style={[
                          tw`text-[10px] text-gray-500 mb-1.5 ml-.5`,
                          { fontFamily: 'Merriweather-Bold', letterSpacing: 0.5 }
                        ]}>
                          RATINGS BREAKDOWN
                        </Text>
                        <View style={tw`gap-1.5`}>
                          {/* Cleanliness */}
                          <View style={tw`flex-row items-center justify-between`}>
                            <Text style={[
                              tw`text-[11px] text-gray-700 flex-1`,
                              { fontFamily: 'Merriweather-Regular' }
                            ]}>
                              Cleanliness
                            </Text>
                            <View style={tw`flex-row items-center gap-1`}>
                              <View style={[tw`flex-row`, { width: 50 }]}>
                                <View style={[
                                  tw`h-1.5 rounded-full`,
                                  { 
                                    width: `${(hotel.categoryRatings.cleanliness / 10) * 100}%`,
                                    backgroundColor: TURQUOISE 
                                  }
                                ]} />
                                <View style={[
                                  tw`h-1.5 rounded-full flex-1`,
                                  { backgroundColor: '#E5E7EB' }
                                ]} />
                              </View>
                              <Text style={[
                                tw`text-[11px] text-gray-600 w-6 text-right`,
                                { fontFamily: 'Merriweather-Bold' }
                              ]}>
                                {hotel.categoryRatings.cleanliness.toFixed(1)}
                              </Text>
                            </View>
                          </View>

                          {/* Service */}
                          <View style={tw`flex-row items-center justify-between`}>
                            <Text style={[
                              tw`text-[11px] text-gray-700 flex-1`,
                              { fontFamily: 'Merriweather-Regular' }
                            ]}>
                              Service
                            </Text>
                            <View style={tw`flex-row items-center gap-1`}>
                              <View style={[tw`flex-row`, { width: 50 }]}>
                                <View style={[
                                  tw`h-1.5 rounded-full`,
                                  { 
                                    width: `${(hotel.categoryRatings.service / 10) * 100}%`,
                                    backgroundColor: TURQUOISE 
                                  }
                                ]} />
                                <View style={[
                                  tw`h-1.5 rounded-full flex-1`,
                                  { backgroundColor: '#E5E7EB' }
                                ]} />
                              </View>
                              <Text style={[
                                tw`text-[11px] text-gray-600 w-6 text-right`,
                                { fontFamily: 'Merriweather-Bold' }
                              ]}>
                                {hotel.categoryRatings.service.toFixed(1)}
                              </Text>
                            </View>
                          </View>

                          {/* Location */}
                          <View style={tw`flex-row items-center justify-between`}>
                            <Text style={[
                              tw`text-[11px] text-gray-700 flex-1`,
                              { fontFamily: 'Merriweather-Regular' }
                            ]}>
                              Location
                            </Text>
                            <View style={tw`flex-row items-center gap-1`}>
                              <View style={[tw`flex-row`, { width: 50 }]}>
                                <View style={[
                                  tw`h-1.5 rounded-full`,
                                  { 
                                    width: `${(hotel.categoryRatings.location / 10) * 100}%`,
                                    backgroundColor: TURQUOISE 
                                  }
                                ]} />
                                <View style={[
                                  tw`h-1.5 rounded-full flex-1`,
                                  { backgroundColor: '#E5E7EB' }
                                ]} />
                              </View>
                              <Text style={[
                                tw`text-[11px] text-gray-600 w-6 text-right`,
                                { fontFamily: 'Merriweather-Bold' }
                              ]}>
                                {hotel.categoryRatings.location.toFixed(1)}
                              </Text>
                            </View>
                          </View>

                          {/* Room Quality */}
                          <View style={tw`flex-row items-center justify-between`}>
                            <Text style={[
                              tw`text-[11px] text-gray-700 flex-1`,
                              { fontFamily: 'Merriweather-Regular' }
                            ]}>
                              Room Quality
                            </Text>
                            <View style={tw`flex-row items-center gap-1`}>
                              <View style={[tw`flex-row`, { width: 50 }]}>
                                <View style={[
                                  tw`h-1.5 rounded-full`,
                                  { 
                                    width: `${(hotel.categoryRatings.roomQuality / 10) * 100}%`,
                                    backgroundColor: TURQUOISE 
                                  }
                                ]} />
                                <View style={[
                                  tw`h-1.5 rounded-full flex-1`,
                                  { backgroundColor: '#E5E7EB' }
                                ]} />
                              </View>
                              <Text style={[
                                tw`text-[11px] text-gray-600 w-6 text-right`,
                                { fontFamily: 'Merriweather-Bold' }
                              ]}>
                                {hotel.categoryRatings.roomQuality.toFixed(1)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Guest Reviews Summary */}
                    <TouchableOpacity
                      style={[
                        tw`py-2 px-2.5 rounded-xl flex-row items-center justify-between bg-white border border-gray-200`,
                        {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: 3,
                        }
                      ]}
                      onPress={() => setShowReviewsModal(true)}
                      activeOpacity={0.7}
                    >
                      <View style={tw`flex-row items-center gap-1.5`}>
                        <View style={[
                          tw`w-5 h-5 rounded-full items-center justify-center`,
                          { backgroundColor: 'rgba(29, 249, 255, 0.15)' }
                        ]}>
                          <Ionicons name="chatbubbles-outline" size={11} color={TURQUOISE_DARK} />
                        </View>
                        <Text style={[
                          tw`text-[13px] text-gray-800`,
                          { fontFamily: 'Merriweather-Regular' }
                        ]}>
                          Read guest reviews
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={12} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              )}
            </TouchableOpacity>

            {/* Minimalist Circular Action Buttons */}
            <View style={tw`flex-row items-center justify-between px-1`}>
              {/* Ask AI */}
              <TouchableOpacity
                style={tw`items-center flex-1`}
                onPress={() => setShowHotelChat(true)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    tw`w-12 h-12 rounded-full items-center justify-center bg-white border border-gray-200`,
                    {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 3,
                    }
                  ]}
                >
                  <Ionicons name="sparkles" size={18} color={TURQUOISE_DARK} />
                </View>
                <Text style={[
                  tw`text-[9px] text-gray-600 mt-1`,
                  { fontFamily: 'Merriweather-Regular' }
                ]}>
                  Ask AI
                </Text>
              </TouchableOpacity>

              {/* Book */}
              <TouchableOpacity
                style={tw`items-center flex-1`}
                onPress={handleBookNow}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    tw`w-12 h-12 rounded-full items-center justify-center bg-white border border-gray-200`,
                    {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 3,
                    }
                  ]}
                >
                  <Ionicons name="eye-outline" size={18} color={TURQUOISE_DARK} />
                </View>
                <Text style={[
                  tw`text-[9px] text-gray-600 mt-1`,
                  { fontFamily: 'Merriweather-Regular' }
                ]}>
                  Book
                </Text>
              </TouchableOpacity>

              {/* Google Maps */}
              <TouchableOpacity
                style={tw`items-center flex-1`}
                onPress={async () => {
                  try {
                    const searchQuery = hotel.fullAddress 
                      ? encodeURIComponent(`${hotel.name} ${hotel.fullAddress}`)
                      : encodeURIComponent(`${hotel.name} ${displayLocation}`);
                    
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
                    await Linking.openURL(mapsUrl);
                  } catch (error) {
                    console.log('Error opening Google Maps:', error);
                    Alert.alert('Error', 'Could not open Google Maps');
                  }
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    tw`w-12 h-12 rounded-full items-center justify-center bg-white border border-gray-200`,
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
                    fontSize: 20,
                    fontWeight: '700',
                    color: '#374151',
                    fontFamily: 'Product Sans, Arial, sans-serif'
                  }}>
                    G
                  </Text>
                </View>
                <Text style={[
                  tw`text-[9px] text-gray-600 mt-1`,
                  { fontFamily: 'Merriweather-Regular' }
                ]}>
                  Google
                </Text>
              </TouchableOpacity>

              {/* Share */}
              <TouchableOpacity
                style={tw`items-center flex-1`}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    tw`w-12 h-12 rounded-full items-center justify-center bg-white border border-gray-200`,
                    {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 3,
                    }
                  ]}
                >
                  <Ionicons name="share-outline" size={18} color="#374151" />
                </View>
                <Text style={[
                  tw`text-[9px] text-gray-600 mt-1`,
                  { fontFamily: 'Merriweather-Regular' }
                ]}>
                  Share
                </Text>
              </TouchableOpacity>

              {/* Favorite */}
              <View style={tw`items-center flex-1`}>
                <View
                  style={[
                    tw`w-12 h-12 rounded-full items-center justify-center bg-white border border-gray-200`,
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
                    hotel={hotel}
                    size={18}
                    onFavoriteSuccess={onFavoriteSuccess}
                  />
                </View>
                <Text style={[
                  tw`text-[9px] text-gray-600 mt-1`,
                  { fontFamily: 'Merriweather-Regular' }
                ]}>
                  Save
                </Text>
              </View>
            </View>
          </View>

          {/* Modals */}
          <Modal
            visible={showHotelChat}
            transparent
            animationType="fade"
            onRequestClose={() => setShowHotelChat(false)}
          >
            <HotelChatOverlay
              visible={showHotelChat}
              onClose={() => setShowHotelChat(false)}
              hotel={hotel}
            />
          </Modal>

          <ReviewsModal
            visible={showReviewsModal}
            hotelId={hotel.id}
            hotelName={hotel.name}
            overallRating={hotel.rating}
            totalReviews={hotel.reviews}
            onClose={() => setShowReviewsModal(false)}
          />

          <Modal
            visible={showPhotoGallery}
            transparent={false}
            animationType="slide"
            onRequestClose={() => setShowPhotoGallery(false)}
            statusBarTranslucent={true}
          >
            <PhotoGallerySlide
              hotel={enhancedHotel}
              insightsStatus="complete"
              onClose={() => setShowPhotoGallery(false)}
            />
          </Modal>

          <Modal
            visible={showFullMap}
            animationType="slide"
            onRequestClose={() => setShowFullMap(false)}
            statusBarTranslucent={true}
          >
            <LocationSlide
              hotel={hotel}
              insightsStatus="complete"
              isVisible={showFullMap}
              onClose={() => setShowFullMap(false)}
            />
          </Modal>

          <ConfirmationModal
            isVisible={showConfirmModal}
            hotelName={hotel.name}
            onConfirm={handleConfirmRemove}
            onCancel={() => setShowConfirmModal(false)}
          />
        </View>
      </View>
    </View>
  );
};

export default FavoriteHotelCard;