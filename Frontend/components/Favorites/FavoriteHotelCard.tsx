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
const CARD_WIDTH = screenWidth - 37;
const CARD_HEIGHT = screenHeight * 0.35;

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
  const [showMapView, setShowMapView] = useState(false);
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
  // THIS WAS THE ISSUE - Add thirdImageHd check
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

  // Create enhanced hotel object with all collected images for PhotoGallerySlide
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
    const deepLinkUrl = generateHotelDeepLink();
    await WebBrowser.openBrowserAsync(deepLinkUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      dismissButtonStyle: 'done',
      showTitle: true,
    });
  };

  const handleShare = async () => {
    try {
      const shareUrl = generateHotelDeepLink();
      await Share.share({ message: `Check out ${hotel.name}!\n\n${shareUrl}` });
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
    }).start();
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / CARD_WIDTH);
    setCurrentImageIndex(index);
  };

  const handleTap = ({ nativeEvent }: any) => {
    // 5 === State.END
    if (nativeEvent.state === 5 && !showMapView) {
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
        <View style={[tw`border-2 border-gray-300 rounded-2xl overflow-hidden bg-white`]}>
          <View style={{ height: CARD_HEIGHT }}>
        {!showMapView ? (
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
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                >
                  {images.map((img, idx) => (
                    <View key={idx} style={{ width: CARD_WIDTH, height: CARD_HEIGHT, overflow: 'hidden' }}>
                      <KenBurnsImage uri={img} isActive={idx === currentImageIndex} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            </TapGestureHandler>
          </PanGestureHandler>
        ) : (
          <LocationSlide
            hotel={hotel}
            insightsStatus="complete"
            isVisible={true}
          />
        )}

        {/* Top Gradient for Hotel Name (only show in image view) */}
        {!showMapView && (
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[tw`absolute top-0 left-0 right-0 z-20`, { height: 100 }]}
          />
        )}

        {/* Hotel Name - Top Left (always visible) */}
        {!showMapView && (
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
        )}


        {/* Price and Rating - Bottom Left */}
        {!showMapView && (
          <View style={tw`absolute bottom-2.5 left-2.5 z-30`}>
            <View style={[
              tw`rounded-xl flex-row items-center overflow-hidden`,
              {
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4
              }
            ]}>
              <View style={tw`px-3 py-1.8 flex-row items-baseline gap-0.5`}>
                <Text style={[tw`text-base text-white`, { fontFamily: 'Merriweather-Bold' }]}>
                  {getDisplayPrice()}
                </Text>
                <Text style={[tw`text-xs text-white/80`, { fontFamily: 'Merriweather-Regular' }]}>
                  /night
                </Text>
              </View>

              <View style={[{ width: 1, height: 16, backgroundColor: 'rgba(255, 255, 255, 0.3)' }]} />

              {/* Rating Section - Clickable */}
              <TouchableOpacity
                onPress={() => setShowReviewsModal(true)}
                activeOpacity={0.7}
                style={tw`px-3 py-1.8 flex-row items-center gap-1`}
              >
                <Ionicons name="star" size={11} color="#FFF" />
                <Text style={[tw`text-white text-sm`, { fontFamily: 'Merriweather-Bold' }]}>
                  {hotel.rating?.toFixed(1) || 'N/A'}
                </Text>
                <Ionicons name="chevron-forward" size={10} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Images/Map Toggle - Bottom Right */}
        <View style={tw`absolute bottom-2.5 right-2.5 z-40`}>
          <TouchableOpacity
            onPress={() => setShowMapView(!showMapView)}
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
            <Ionicons
              name={showMapView ? "images" : "map"}
              size={12}
              color="#FFF"
            />
            <Text style={[
              tw`text-xs text-white`,
              {
                fontFamily: 'Merriweather-Bold',
              }
            ]}>
              {showMapView ? "Show Images" : "Show Map"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Image Indicators - Top Right (only show when not in map view) */}
        {!showMapView && images.length > 1 && (
          <View style={tw`absolute top-3.5 right-2.5 z-30`}>
            <View style={[
              tw`px-2.5 py-1.5 rounded-full`,
              { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
            ]}>
              <View style={tw`flex-row items-center gap-1`}>
                {images.map((_, idx) => {
                  const isActive = idx === currentImageIndex;
                  const distance = Math.abs(idx - currentImageIndex);
                  
                  return (
                    <View
                      key={idx}
                      style={[
                        tw`rounded-full`,
                        {
                          width: isActive ? 6 : distance === 1 ? 4 : 3,
                          height: isActive ? 6 : distance === 1 ? 4 : 3,
                          backgroundColor: isActive 
                            ? '#FFFFFF' 
                            : distance === 1 
                              ? 'rgba(255,255,255,0.5)' 
                              : 'rgba(255,255,255,0.3)',
                          opacity: distance > 2 ? 0.4 : 1,
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

      {/* Bottom Section */}
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
              overflow: 'hidden',
            }
          ]}
        >
          <View style={tw`px-3 py-2.5`}>
            {hotel.whyItMatches ? (
              <View style={tw`mb-1.5`}>
                <View style={tw`flex-row items-center mb-1.5`}>
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
                      style={[tw`px-2 py-1 rounded-full`, { alignSelf: 'flex-start' }]}
                    >
                      <View style={tw`flex-row items-center`}>
                        <Ionicons name="sparkles" size={10} color="white" style={tw`mr-1`} />
                        <Text style={[
                          tw`text-[10px] text-white`,
                          { fontFamily: 'Merriweather-Bold', letterSpacing: 0.5 }
                        ]}>
                          Genie Says
                        </Text>
                      </View>
                    </LinearGradient>
                  </Animated.View>
                </View>

                <Text 
                  style={[
                    tw`text-[13px] text-gray-800 mb-1`,
                    { fontFamily: 'Merriweather-Regular', lineHeight: 18 }
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
            ) : (
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
              </View>
            )}

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

          {isExpanded && hotel.topAmenities && hotel.topAmenities.length > 0 && (
            <Animated.View style={{ opacity: expandAnim }}>
              <View style={tw`px-3 pb-2.5`}>
                <Text style={[
                  tw`text-[10px] text-gray-500 mb-1.5 ml-0.5`,
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

                {/* Guest Reviews Summary */}
                <TouchableOpacity
                  style={[
                    tw`py-2 px-2.5 rounded-xl flex-row items-center justify-between bg-white border border-gray-200 mt-2.5`,
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

        {/* Action Buttons */}
        <View style={tw`flex-row items-center gap-2`}>
          <TouchableOpacity
            style={[
              tw`py-2.5 px-3 rounded-xl flex-1 bg-white border border-gray-200`,
              {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 3,
                elevation: 3,
              }
            ]}
            onPress={() => setShowHotelChat(true)}
            activeOpacity={0.8}
          >
            <View style={tw`flex-row items-center justify-center`}>
              <View style={[
                tw`w-5 h-5 rounded-full items-center justify-center mr-1.5`,
                { backgroundColor: 'rgba(29, 249, 255, 0.15)' }
              ]}>
                <Ionicons name="sparkles" size={11} color={TURQUOISE_DARK} />
              </View>
              <Text style={[
                tw`text-[13px] text-gray-800`,
                { fontFamily: 'Merriweather-Regular' }
              ]}>
                Ask AI
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              tw`py-2.5 px-3 rounded-xl flex-1 bg-white border border-gray-200`,
              {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 3,
                elevation: 3,
              }
            ]}
            onPress={handleBookNow}
            activeOpacity={0.8}
          >
            <View style={tw`flex-row items-center justify-center`}>
              <View style={[
                tw`w-5 h-5 rounded-full items-center justify-center mr-1.5`,
                { backgroundColor: 'rgba(29, 249, 255, 0.15)' }
              ]}>
                <Ionicons name="eye-outline" size={11} color={TURQUOISE_DARK} />
              </View>
              <Text style={[
                tw`text-[13px] text-gray-800`,
                { fontFamily: 'Merriweather-Regular' }
              ]}>
                Book
              </Text>
            </View>
          </TouchableOpacity>
<TouchableOpacity
            style={[
              tw`w-11 h-11 items-center justify-center rounded-xl bg-white border border-gray-200`,
              {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 3,
                elevation: 3,
              }
            ]}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={19} color="#374151" />
          </TouchableOpacity>
          <View
            style={[
              tw`w-11 h-11 items-center justify-center rounded-xl bg-white border border-gray-200`,
              {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 3,
                elevation: 3,
              }
            ]}
          >
            <AnimatedHeartButton
              hotel={hotel}
              size={19}
              onFavoriteSuccess={onFavoriteSuccess}
            />
          </View>

          
        </View>
      </View>

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