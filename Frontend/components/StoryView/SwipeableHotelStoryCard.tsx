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
import { AnalyticsService } from '../../services/analytics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = Math.round(screenWidth - 37);

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
  position: number; // ✅ ADD THIS
  searchQuery: string; // ✅ ADD THIS
  isVisible: boolean; // ✅ ADD THIS
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
  position, // ✅ ADD THIS
  searchQuery, // ✅ ADD THIS
  isVisible,
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
  const [showFullMap, setShowFullMap] = useState(false);
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

  const handleTap = async ({ nativeEvent }: any) => {
  // 5 === State.END
  if (nativeEvent.state === 5) {
    // ✅ Track photo gallery opens
    console.log('🟦 Tracking photo gallery open');
    await AnalyticsService.trackFirstAction('photo_gallery', position);
    await AnalyticsService.trackHotelClick(hotel.id, hotel.name, position, 'photo_gallery');
    
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
  
const getTotalPrice = (hotel: Hotel, checkInDate?: Date, checkOutDate?: Date) => {
  if (!hotel?.pricePerNight || !checkInDate || !checkOutDate) return null;

  const oneDay = 1000 * 60 * 60 * 24;
  const nights = Math.max(
    1,
    Math.round((checkOutDate.getTime() - checkInDate.getTime()) / oneDay)
  );

  return hotel.pricePerNight.amount * nights;
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
  const handleShowReviews = async () => {
  console.log('🟦 Tracking reviews modal');
  await AnalyticsService.trackFirstAction('review_modal', position);
  await AnalyticsService.trackHotelClick(hotel.id, hotel.name, position, 'review_modal');
  
  setShowReviewsModal(true);
};

  const formatShortDateRange = (checkIn: Date, checkOut: Date) => {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  const start = checkIn.toLocaleDateString('en-US', opts);
  const end = checkOut.toLocaleDateString('en-US', opts);

  return `${start} – ${end}`;
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

  // --- Booking.com affiliate constants ---
const BOOKING_AID = "304142";
const BOOKING_LABEL_BASE = "staygenie_blog";
const AWIN_MID = "6776";
const AWIN_AFFID = "2062217";

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}
function formatDate(d?: Date): string | undefined {
  if (!d) return undefined;
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

const handleShowMap = async () => {
  console.log('🟦 Tracking map view');
  await AnalyticsService.trackFirstAction('map_view', position);
  await AnalyticsService.trackHotelClick(hotel.id, hotel.name, position, 'map_view');
  
  setShowFullMap(true);
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


const handleAskAI = async () => {
  console.log('🟦 Tracking Ask AI click');
  await AnalyticsService.trackFirstAction('ask_ai', position);
  await AnalyticsService.trackHotelClick(hotel.id, hotel.name, position, 'ask_ai');
  
  setShowHotelChat(true);
  onHotelPress?.();
};

const handleViewDetailsPress = async () => {
  try {
     // ✅ Track the book click BEFORE opening the URL
    console.log('🟦 Tracking book click');
    await AnalyticsService.trackBookClick(
      hotel.id,
      hotel.name,
      position, // Already passed as prop
      hotel.pricePerNight?.amount || hotel.price
    );
    console.log('🟦 Book click tracked');

    // ✅ Track first action if this is the first interaction
    await AnalyticsService.trackFirstAction('book_now', position);
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
    setShowPhotoGallery(true);
  };

  if (!fontsLoaded) {
    return null;
  }

  const maxExpandedHeight = 400;
// Add near the top with other useRefs
const dotAnimations = useRef(
  images.map(() => new Animated.Value(0))
).current;
const isLoading = isInsightsLoading || insightsStatus === "loading" || insightsStatus === "partial";

  return (
  <View style={[tw`rounded-2xl`, {
    width: CARD_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  }]}>

    
    <View style={[tw`border-2 border-gray-200 rounded-2xl overflow-hidden bg-white`]}>
      <View style={{ height: CARD_HEIGHT }}>
        <PanGestureHandler
          ref={panRef}
          activeOffsetX={[-12, 12]}
        >
          <TapGestureHandler
            ref={tapRef}
            waitFor={panRef}
            onHandlerStateChange={handleTap}
            enabled={!isLoading}
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
    overflow: 'hidden', // PAGE CLIP
  }}
>
  <View
    style={{
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      overflow: 'hidden', // INNER CLIP (important)
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
            </View>
          </TapGestureHandler>
        </PanGestureHandler>

        {/* Top Gradient for Hotel Name */}
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

{/* Availability Mini-Bar (matching other bars) */}
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


    {/* Text */}
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
    {/* LEFT SIDE */}
    <View style={tw`px-3 py-2`}>
      {/* PRICE PER NIGHT */}
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

    {/* RIGHT SIDE — RATING */}
    <TouchableOpacity
      onPress={handleShowReviews} 
      activeOpacity={0.7}
      style={tw`px-3 py-2 flex-row items-center gap-1`}
    >
      <Ionicons name="star" size={11} color="#FFF" />
      <Text style={[tw`text-white text-sm`, { fontFamily: 'Merriweather-Bold' }]}>
        {hotel.rating.toFixed(1)}
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
<View style={tw`absolute bottom-2.5 right-2.5 z-40`} pointerEvents={isLoading ? 'none' : 'auto'}>
  <TouchableOpacity
    onPress={handleShowMap}
    disabled={isLoading}
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
      name="map"
      size={12}
      color="#FFF"
    />
    <Text style={[
      tw`text-xs text-white`,
      {
        fontFamily: 'Merriweather-Bold',
      }
    ]}>
      Show Map
    </Text>
  </TouchableOpacity>
</View>



{/* Image Indicators - Top Right (Simple & Visible) */}
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

      {/* Expandable Bottom Section - Search Guide Pill Style */}
     <View style={tw`mx-3 my-3`}>
  {/* Collapsible Info Section */}
<TouchableOpacity
  onPress={toggleExpanded}
  activeOpacity={0.8}
  disabled={isLoading}
  style={[
    tw`rounded-xl mb-2.5`,
    { opacity: isLoading ? 0.6 : 1 },
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
      opacity: isLoading ? 0.6 : 1,
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

  {/* Minimalist Circular Action Buttons */}
<View style={tw`flex-row items-center justify-between px-1`}>
  {/* Ask AI */}
  <TouchableOpacity
    style={tw`items-center flex-1`}
    onPress={handleAskAI}
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
    onPress={handleViewDetailsPress}
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
      console.log('🟦 Tracking Google Maps click');
      await AnalyticsService.trackFirstAction('google_maps', position);
      await AnalyticsService.trackHotelClick(hotel.id, hotel.name, position, 'google_maps');
      
      const searchQuery = hotel.fullAddress 
        ? encodeURIComponent(`${hotel.name} ${hotel.fullAddress}`)
        : encodeURIComponent(`${hotel.name} ${displayLocation}`);
      
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
      await Linking.openURL(mapsUrl);
      console.log('✅ Google Maps opened');
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
    {/* Grey Google "G" - using text representation */}
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
  onPress={async () => {
    try {
      console.log('🟦 Tracking share click');
      await AnalyticsService.trackFirstAction('share', position);
      await AnalyticsService.trackHotelClick(hotel.id, hotel.name, position, 'share');
      
      // Generate Google Maps link instead of booking link
      const searchQuery = hotel.fullAddress 
        ? encodeURIComponent(`${hotel.name} ${hotel.fullAddress}`)
        : encodeURIComponent(`${hotel.name} ${displayLocation}`);
      
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
      const shareMessage = `Check out ${hotel.name}!\n\n${mapsUrl}`;
      
      await Share.share({ message: shareMessage });
      console.log('✅ Share completed');
    } catch (error) {
      console.log('Error sharing:', error);
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
        onShowSignUpModal={openSignUp}
        onFavoriteSuccess={onFavoriteSuccess}
        onFavoriteClick={async () => {
          console.log('🟦 Tracking favorite click');
          await AnalyticsService.trackFirstAction('favorite', position);
          await AnalyticsService.trackHotelClick(hotel.id, hotel.name, position, 'favorite');
        }}
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

      {/* Full Screen Interactive Map Modal */}
      <Modal
        visible={showFullMap}
        animationType="slide"
        onRequestClose={() => setShowFullMap(false)}
        statusBarTranslucent={true}
      >
        <LocationSlide
          hotel={hotel}
          insightsStatus={insightsStatus}
          isVisible={showFullMap}
          onClose={() => setShowFullMap(false)}
        />
      </Modal>
    </View>
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