// InstagramStyledHotelCard.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import AnimatedHeartButton from './AnimatedHeartButton';
import { useFonts } from 'expo-font';
import * as WebBrowser from 'expo-web-browser';
import HotelChatOverlay from '../../components/HomeScreenTop/HotelChatOverlay';
import EmailSignUpModal from '../SignupLogin/EmailSignUpModal';
import EmailSignInModal from '../SignupLogin/EmailSignInModal';
import LocationSlide from './LocationSlide';
import ReviewsModal from './ReviewsModal';
import PhotoGallerySlide from './PhotoGallerySlide';
import { Animated } from 'react-native';
import { formatLocationDisplay, getCountryName } from '../../utils/countryMapping';
import { PanGestureHandler, TapGestureHandler } from 'react-native-gesture-handler';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 32;
const CARD_HEIGHT = screenHeight * 0.34;

const TURQUOISE = '#1df9ff';
const TURQUOISE_DARK = '#00d4e6';

interface Review {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  helpful?: number;
}

interface Hotel {
  id: string;
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
  images?: string[];
  photoGalleryImages?: string[];
  allHotelInfo?: string;
  firstRoomImage?: string | null;
  secondRoomImage?: string | null;
  
  aiExcerpt?: string;
  whyItMatches?: string;
  funFacts?: string[];
  aiMatchPercent?: number;
  matchType?: string;
  aiSafetyRating?: number;
  safetyJustification?: string;

  pricePerNight?: {
    amount: number;
    totalAmount: number;
    currency: string;
    display: string;
    provider: string | null;
    isSupplierPrice: boolean;
  } | null;
  
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  topAmenities?: string[];
  nearbyAttractions?: string[];
  locationHighlight?: string;
  hasAvailability?: boolean;
  totalRooms?: number;
  fullDescription?: string;
  fullAddress?: string;
  
  guestInsights?: string;
  sentimentPros?: string[];
  sentimentCons?: string[];
  
  categoryRatings?: {
    cleanliness: number;
    service: number;
    location: number;
    roomQuality: number;
  };
  thirdImageHd?: string | null;
  
  roomTypes?: any[];
  
  isRefundable?: boolean;
  refundableTag?: string | null;
  refundableInfo?: string;
  
  placeId?: string;
  
  isPlaceholder?: boolean;
}

interface EnhancedHotel extends Hotel {
  images: string[];
  mapImage: string;
  photoGalleryImages: string[];
  firstRoomImage?: string | null;
  secondRoomImage?: string | null;
}

interface SwipeableHotelStoryCardProps {
  onShowSignUpModal?: () => void;
  hotel: EnhancedHotel;
  onSave?: () => void;
  onViewDetails: () => void;
  onHotelPress: () => void;
  index: number;
  totalCount: number;
  checkInDate?: Date;
  checkOutDate?: Date;
  adults?: number;
  children?: number;
  isInsightsLoading?: boolean;
  insightsStatus?: 'loading' | 'partial' | 'complete';
  searchMode?: 'test' | 'two-stage' | 'legacy';
  placeId?: string;
  occupancies?: any[];
  searchParams?: any;
  topAmenities?: string[];
  
  safetyRating?: number;
  safetyJustification?: string;
  safetySource?: string;
  hasAISafetyRating?: boolean;
  showSafetyRating?: boolean;
  safetyRatingThreshold?: number;
  onFavoriteSuccess?: (hotelName: string) => void;
}

// Ken Burns Image Component
const KenBurnsImage: React.FC<{ uri: string; isActive: boolean }> = ({ uri, isActive }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // Create looping Ken Burns effect
      const createLoop = () => {
        return Animated.loop(
          Animated.sequence([
            // Zoom in and pan
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
            // Zoom out and pan back
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
      // Reset animation
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
      <Image 
        source={{ uri }}
        style={tw`w-full h-full`}
        resizeMode="cover"
      />
    </Animated.View>
  );
};

const SwipeableHotelStoryCard: React.FC<SwipeableHotelStoryCardProps> = ({ 
  hotel, 
  onSave,
  onViewDetails, 
  onHotelPress,
  onFavoriteSuccess,
  onShowSignUpModal,
  index,
  totalCount,
  checkInDate,
  checkOutDate,
  adults = 2,
  children = 0,
  isInsightsLoading = false,
  insightsStatus = 'complete',
  searchMode = 'two-stage',
  placeId,
  occupancies,
  safetyRating,
  safetyJustification,
  safetySource = 'Standard',
  hasAISafetyRating = false,
  showSafetyRating = true,
  safetyRatingThreshold = 6.0,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hotelInfoHeight, setHotelInfoHeight] = useState(0);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const scrollViewRef = useRef<any>(null);
  const DEEP_LINK_BASE_URL = 'https://staygenie.nuitee.link';
  const [showHotelChat, setShowHotelChat] = useState(false);
  const [showEmailSignUpModal, setShowEmailSignUpModal] = useState(false);
  const [showEmailSignInModal, setShowEmailSignInModal] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const panRef = useRef(null);
  const tapRef = useRef(null);

  const handleTap = ({ nativeEvent }: any) => {
    // 5 === State.END
    if (nativeEvent.state === 5 && !showMapView) {
      setShowPhotoGallery(true);
    }
  };

  
  const [fontsLoaded] = useFonts({
    'Merriweather-Bold': require('../../assets/fonts/Merriweather_36pt-Bold.ttf'),
    'Merriweather-Regular': require('../../assets/fonts/Merriweather_36pt-Regular.ttf'),
  });

  const images = React.useMemo(() => {
    const collectedImages: string[] = [];
    const MAX_IMAGES = 10;
    
    if (hotel.photoGalleryImages && hotel.photoGalleryImages.length > 0) {
      collectedImages.push(...hotel.photoGalleryImages.slice(0, MAX_IMAGES));
    }
    
    if (collectedImages.length < MAX_IMAGES && hotel.images && hotel.images.length > 0) {
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
    if (collectedImages.length < MAX_IMAGES && hotel.thirdImageHd && !collectedImages.includes(hotel.thirdImageHd)) {
      collectedImages.push(hotel.thirdImageHd);
    }
    
    if (collectedImages.length === 0 && hotel.image) {
      collectedImages.push(hotel.image);
    }
    
    const validImages = collectedImages.filter(img => 
      img && img.trim() !== '' && 
      (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('//'))
    );
    
    return validImages;
  }, [hotel]);

  const displayLocation = hotel.city && hotel.country 
  ? formatLocationDisplay(hotel.city, hotel.country)
  : hotel.location;

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / CARD_WIDTH);
    setCurrentImageIndex(index);
  };

  const getDisplayPrice = () => {
    if (hotel.pricePerNight) {
      return `$${hotel.pricePerNight.amount}`;
    }
    return `$${hotel.price}`;
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
      try { await Linking.openURL(url); } catch {}
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

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: showMapView ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [showMapView]);

  const handleAskAI = () => {
    setShowHotelChat(true);
    onHotelPress?.();
  };

  const handleViewDetailsPress = async () => {
    try {
      const url = generateHotelDeepLink(
        hotel,
        checkInDate,
        checkOutDate,
        adults,
        children,
        placeId,
        occupancies
      );
      await openInAppBrowser(url);
    } catch {
      Alert.alert('Error', 'Failed to open hotel page. Please try again.');
    }
  };

  const openSignUp = () => {
    if (onShowSignUpModal) return onShowSignUpModal();
    setShowEmailSignUpModal(true);
  };

  const handleImagePress = () => {
    if (!showMapView) {
      setShowPhotoGallery(true);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[tw`rounded-2xl overflow-hidden bg-white`, { width: CARD_WIDTH }]}>
      <View style={{ height: CARD_HEIGHT }}>
        {!showMapView ? (
           <PanGestureHandler
      ref={panRef}
      activeOffsetX={[-12, 12]}  

    >
      <TapGestureHandler
        ref={tapRef}
        waitFor={panRef}     
        onHandlerStateChange={handleTap}
      >
        
          <View
          >
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              scrollEnabled={true}
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
            insightsStatus={insightsStatus}
            isVisible={true}
          />
        )}

        <View style={tw`absolute top-2.5 right-2.5 z-40`}>
          <View style={[
            tw`flex-row rounded-lg overflow-hidden`,
            { 
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              shadowColor: '#000', 
              shadowOffset: { width: 0, height: 2 }, 
              shadowOpacity: 0.2, 
              shadowRadius: 4 
            }
          ]}>
            <Animated.View
              style={[
                tw`absolute inset-y-0 rounded-lg`,
                {
                  width: 75,
                  backgroundColor: TURQUOISE,
                  opacity: 0.25,
                  transform: [{
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 75]
                    })
                  }]
                }
              ]}
            />

            <TouchableOpacity
              onPress={() => setShowMapView(false)}
              style={[
                tw`py-2.7 flex-row items-center gap-1`,
                { width: 75, justifyContent: 'center', zIndex: 10 }
              ]}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="images" 
                size={12} 
                color={!showMapView ? TURQUOISE : '#FFF'} 
              />
              <Animated.Text style={[
                tw`text-xs`,
                { 
                  fontFamily: 'Merriweather-Bold',
                  color: !showMapView ? TURQUOISE : '#FFF'
                }
              ]}>
                Images
              </Animated.Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowMapView(true)}
              style={[
                tw`py-2 flex-row items-center gap-1`,
                { width: 75, justifyContent: 'center', zIndex: 10 }
              ]}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="map" 
                size={12} 
                color={showMapView ? TURQUOISE : '#FFF'} 
              />
              <Animated.Text style={[
                tw`text-xs`,
                { 
                  fontFamily: 'Merriweather-Bold',
                  color: showMapView ? TURQUOISE : '#FFF'
                }
              ]}>
                Map
              </Animated.Text>
            </TouchableOpacity>
          </View>
        </View>

       {!showMapView && (
  <View style={tw`absolute top-2.5 left-2.5 z-30`}>
    <View style={[
      tw`px-3 py-1.8 rounded-xl flex-row items-center`,
      { 
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.2, 
        shadowRadius: 4 
      }
    ]}>
      {/* Price Section */}
      <View style={tw`flex-row items-baseline gap-0.5`}>
        <Text style={[tw`text-base text-white`, { fontFamily: 'Merriweather-Bold' }]}>
          {getDisplayPrice()}
        </Text>
        <Text style={[tw`text-xs text-white/80`, { fontFamily: 'Merriweather-Regular' }]}>
          /night
        </Text>
      </View>
      
      {/* Vertical Divider */}
      <View style={[
        tw`mx-2.5`,
        { 
          width: 1, 
          height: 16, 
          backgroundColor: 'rgba(255, 255, 255, 0.3)' 
        }
      ]} />
      
      {/* Rating Section */}
      <View style={tw`flex-row items-center gap-1`}>
        <Ionicons name="star" size={11} color="#FFF" />
        <Text style={[tw`text-white text-sm`, { fontFamily: 'Merriweather-Bold' }]}>
          {hotel.rating.toFixed(1)}
        </Text>
      </View>
    </View>
  </View>
)}

        {!showMapView && (
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'transparent']}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={[tw`absolute bottom-0 left-0 right-0 z-20`, {
              height: 80,
            }]}
          />
        )}

        {!showMapView && images && images.length > 1 && (
          <View 
            style={[
              tw`absolute left-0 right-0 flex-row justify-center gap-1 z-25`,
              { bottom: hotelInfoHeight + 16 }
            ]}
          >
            {images.map((_, idx) => (
              <View
                key={idx}
                style={[
                  tw`rounded-full`,
                  {
                    width: idx === currentImageIndex ? 5 : 4,
                    height: idx === currentImageIndex ? 5 : 4,
                    backgroundColor: idx === currentImageIndex ? '#FFF' : 'rgba(255,255,255,0.5)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.3,
                    shadowRadius: 2,
                  }
                ]}
              />
            ))}
          </View>
        )}
 <View 
          style={tw`absolute bottom-2.5 left-2.5 right-2.5 z-30`}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            setHotelInfoHeight(height);
          }}
        >
          {!showMapView ? (
            // Show hotel name and location when NOT on map view
            <>
              <Text style={[tw`text-white text-base mb-0.5`, { 
                fontFamily: 'Merriweather-Bold',
                textShadowColor: 'rgba(0, 0, 0, 1)', 
                textShadowOffset: { width: 0, height: 1 }, 
                textShadowRadius: 4 
              }]}>
                {hotel.name}
              </Text>
              <View style={tw`flex-row items-center gap-1`}>
                <Ionicons name="location" size={11} color="#FFF" />
                <Text style={[tw`text-white text-xs`, { 
                  fontFamily: 'Merriweather-Regular',
                  textShadowColor: 'rgba(0, 0, 0, 1)', 
                  textShadowOffset: { width: 0, height: 1 }, 
                  textShadowRadius: 4
                }]}>
                  {displayLocation}
                </Text>
              </View>
            </>
          ) : (
            // Show location highlight and nearby attractions when ON map view
            <>
              {hotel.locationHighlight && (
                <Text style={[tw`text-white text-base mb-1`, { 
                  fontFamily: 'Merriweather-Bold',
                  textShadowColor: 'rgba(0, 0, 0, 1)', 
                  textShadowOffset: { width: 0, height: 1 }, 
                  textShadowRadius: 4 
                }]}>
                  {hotel.locationHighlight}
                </Text>
              )}

            </>
          )}
        
        </View>
      </View>

      <View style={tw`px-3.5 py-3`}>

{hotel.topAmenities && hotel.topAmenities.length > 0 && (
          <View style={tw`flex-row gap-1.5 mb-2.5`}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`gap-1.5`}
            >
              {hotel.topAmenities.slice(0, 6).map((amenity:any, idx:any) => (
                <View
                  key={`${amenity}-${idx}`}
                  style={[
                    tw`px-2 py-1 rounded-full`,
                    { backgroundColor: '#F9FAFB' }
                  ]}
                >
                  <Text style={[tw`text-xs text-gray-600`, { fontFamily: 'Merriweather-Regular' }]} numberOfLines={1}>
                    {amenity}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
        {hotel.whyItMatches && (
  <View style={[
    tw`px-2.5 py-2 rounded-lg mb-2.5 flex-row`,
    { backgroundColor: 'rgba(29, 249, 255, 0.06)', borderLeftWidth: 2, borderLeftColor: TURQUOISE }
  ]}>

    <Text
      style={[
        tw`text-xs leading-4 text-gray-700 flex-1`,
        { fontFamily: 'Merriweather-Regular' }
      ]}
    >
      <Text style={{ fontFamily: 'Merriweather-Bold', color: TURQUOISE_DARK }}>
        Genie says:{'  '}
      </Text>
      {hotel.whyItMatches}
    </Text>
  </View>
)}

        

        <View style={[tw`mb-2.5`, { height: 1, backgroundColor: '#F3F4F6' }]} />

        <TouchableOpacity
          style={tw`mb-2.5 py-2 px-3 rounded-lg flex-row items-center justify-between bg-gray-50`}
          onPress={() => {
            console.log('Opening reviews modal, hotel ID:', hotel.id);
            setShowReviewsModal(true);
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={tw`flex-row items-center gap-2`}>
            <Ionicons name="chatbubbles-outline" size={14} color="#6B7280" />
            <Text style={[tw`text-xs text-gray-600`, { fontFamily: 'Merriweather-Regular' }]}>
              Guest Reviews
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={13} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={tw`flex-row items-center gap-2 mt-1`}>
          <View 
            style={[
              tw`w-10 h-10 items-center justify-center rounded-xl bg-white border border-gray-200`,
              {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 3,
              }
            ]}
          >
            <AnimatedHeartButton
              hotel={hotel}
              size={19}
              onShowSignUpModal={openSignUp}
              onFavoriteSuccess={onFavoriteSuccess}
            />
          </View>

          <TouchableOpacity
            style={[
              tw`py-2 px-3 rounded-xl flex-1 bg-white border border-gray-200`,
              {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 3,
              }
            ]}
            onPress={handleAskAI}
            activeOpacity={0.8}
          >
            <View style={tw`flex-row items-center justify-center`}>
              <View style={[
                tw`w-6 h-6 rounded-full items-center justify-center mr-1.5`,
                { backgroundColor: 'rgba(29, 249, 255, 0.15)' }
              ]}>
                <Ionicons name="sparkles" size={14} color={TURQUOISE_DARK} />
              </View>
              <Text style={[tw`text-xs text-gray-800`, { fontFamily: 'Merriweather-Regular' }]}>
                Ask AI
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              tw`py-2 px-3 rounded-xl flex-1 bg-white border border-gray-200`,
              {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 3,
              }
            ]}
            onPress={handleViewDetailsPress}
            activeOpacity={0.8}
          >
            <View style={tw`flex-row items-center justify-center`}>
              <View style={[
                tw`w-6 h-6 rounded-full items-center justify-center mr-1.5`,
                { backgroundColor: 'rgba(29, 249, 255, 0.15)' }
              ]}>
                <Ionicons name="eye-outline" size={14} color={TURQUOISE_DARK} />
              </View>
              <Text style={[tw`text-xs text-gray-800`, { fontFamily: 'Merriweather-Regular' }]}>
                View Details
              </Text>
            </View>
          </TouchableOpacity>
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

      <EmailSignUpModal
        visible={showEmailSignUpModal}
        onClose={() => setShowEmailSignUpModal(false)}
        onSwitchToSignIn={() => {
          setShowEmailSignUpModal(false);
          setTimeout(() => setShowEmailSignInModal(true), 250);
        }}
      />

      <EmailSignInModal
        visible={showEmailSignInModal}
        onClose={() => setShowEmailSignInModal(false)}
        onSwitchToSignUp={() => {
          setShowEmailSignInModal(false);
          setTimeout(() => setShowEmailSignUpModal(true), 250);
        }}
        onForgotPassword={() => {}}
      />

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
          hotel={hotel}
          insightsStatus={insightsStatus}
          onClose={() => setShowPhotoGallery(false)}
        />

      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  profileRing: {
    padding: 2,
    borderRadius: 999,
  },
  bottomGradient: {
  },
});
 
export default SwipeableHotelStoryCard;
export type { Hotel, EnhancedHotel, SwipeableHotelStoryCardProps, Review };