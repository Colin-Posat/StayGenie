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
  Share,
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
const CARD_WIDTH = screenWidth - 37;
const CARD_HEIGHT = screenHeight * 0.35;

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
  const genieShimmerAnim = useRef(new Animated.Value(0)).current;


useEffect(() => {
  // Genie badge shimmer animation (ADD THIS)
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
  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const genieShimmerAnim = useRef(new Animated.Value(0)).current;
  // Sparkle animation for magical effect
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Continuous sparkle animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

  }, []);

  const handleTap = ({ nativeEvent }: any) => {
    // 5 === State.END
    if (nativeEvent.state === 5 && !showMapView) {
      setShowPhotoGallery(true);
    }
  };

  const parseBoldText = (text: string, boldStyle: any, normalStyle: any) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Remove the ** markers and render as bold
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

  const maxExpandedHeight = 400;
// Add near the top with other useRefs
const dotAnimations = useRef(
  images.map(() => new Animated.Value(0))
).current;
  return (
    <View style={[tw`rounded-2xl overflow-hidden bg-white`, {
      width: CARD_WIDTH,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    }]}>
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
              <View>
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

        {/* Top Gradient for Hotel Name */}
        {!showMapView && (
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[tw`absolute top-0 left-0 right-0 z-20`, {
              height: 100,
            }]}
          />
        )}

       {/* Hotel Name - Top Left */}
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
      {/* Price Section */}
      <View style={tw`px-3 py-1.8 flex-row items-baseline gap-0.5`}>
        <Text style={[tw`text-base text-white`, { fontFamily: 'Merriweather-Bold' }]}>
          {getDisplayPrice()}
        </Text>
        <Text style={[tw`text-xs text-white/80`, { fontFamily: 'Merriweather-Regular' }]}>
          /night
        </Text>
      </View>

      {/* Vertical Divider */}
      <View style={[
        {
          width: 1,
          height: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.3)'
        }
      ]} />

      {/* Rating Section - Clickable */}
      <TouchableOpacity
        onPress={() => setShowReviewsModal(true)}
        activeOpacity={0.7}
        style={tw`px-3 py-1.8 flex-row items-center gap-1`}
      >
        <Ionicons name="star" size={11} color="#FFF" />
        <Text style={[tw`text-white text-sm`, { fontFamily: 'Merriweather-Bold' }]}>
          {hotel.rating.toFixed(1)}
        </Text>
        <Ionicons name="chevron-forward" size={10} color="rgba(255, 255, 255, 0.6)" />
      </TouchableOpacity>
    </View>
  </View>
)}


{/* Images/Map Toggle - Bottom Right */}
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



      {/* Image Indicators - Top Right (Sleek & Responsive) */}
{!showMapView && images && images.length > 1 && (
  <View style={tw`absolute top-3.5 right-2.5 z-30`}>
    <View
      style={[
        tw`px-2.5 py-1.5 rounded-full`,
        {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
        }
      ]}
    >
      <View style={tw`flex-row items-center gap-1`}>
        {images.map((_, idx) => {
          const isActive = idx === currentImageIndex;
          const distance = Math.abs(idx - currentImageIndex);
          
          return (
            <View
              key={idx}
              style={[
                tw`rounded-full transition-all`,
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

      {/* Expandable Bottom Section - Search Guide Pill Style */}
     <View style={tw`mx-3 my-3`}>
  {/* Collapsible Info Section */}
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
        {/* Inline Genie Badge + Text */}
<View style={tw`mb-1.5`}>
  <View style={tw`flex-row items-center mb-1.5`}>
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
        style={[tw`px-2 py-1 rounded-full`, { alignSelf: 'flex-start' }]}
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
              {hotel.rating.toFixed(1)}
            </Text>
            <Text style={[tw`text-[11px] text-gray-500 ml-1`, { fontFamily: 'Merriweather-Regular' }]}>
              ({hotel.reviews} reviews)
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
          <View style={tw`mb-2.5`}>
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

  {/* Always Visible Action Buttons - Consistent with top overlays */}
{/* Always Visible Action Buttons - Consistent with top overlays */}
<View style={tw`flex-row items-center gap-2`}>


  

  {/* Ask AI Button */}
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
    onPress={handleAskAI}
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

  {/* Book Now Button */}
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
    onPress={handleViewDetailsPress}
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
        Book Now
      </Text>
    </View>
  </TouchableOpacity>

    {/* Favorite Button */}
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
      onShowSignUpModal={openSignUp}
      onFavoriteSuccess={onFavoriteSuccess}
    />
  </View>
  
  {/* Share Button */}
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
    onPress={async () => {
  try {
    const shareUrl = generateHotelDeepLink(
      hotel,
      checkInDate,
      checkOutDate,
      adults,
      children,
      placeId,
      occupancies
    );

    const shareMessage =
      `Check out ${hotel.name}!\n\n` +
      `${shareUrl}`;

    await Share.share({
      message: shareMessage,
    });
  } catch (error) {
    console.log('Error sharing:', error);
  }
}}

    activeOpacity={0.8}
  >
    <Ionicons name="share-outline" size={19} color="#374151" />
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
        onForgotPassword={() => { }}
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