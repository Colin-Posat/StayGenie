// SwipeableHotelStoryCard.tsx - Updated with Firebase authentication favorites
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Animated,
  Linking,
  Alert,
  StyleSheet,
   KeyboardAvoidingView,
   Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth} from '../../contexts/AuthContext';
import { formatLocationDisplay, getCountryName } from '../../utils/countryMapping';
import EmailSignUpModal from '../SignupLogin/EmailSignUpModal';
import EmailSignInModal from '../SignupLogin/EmailSignInModal';
import AnimatedHeartButton from './AnimatedHeartButton';
import HotelChatOverlay from '../../components/HomeScreenTop/HotelChatOverlay';
import * as WebBrowser from 'expo-web-browser';
import { Easing } from 'react-native';
import PhotoGallerySlide from './PhotoGallerySlide';
import LocationSlide from './LocationSlide';
import ReviewsSlide from './ReviewsSlide';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 42;
const CARD_HEIGHT = screenHeight * 0.52;
const TURQUOISE_SUBTLE = '#f0feff';
const TURQUOISE_BORDER = '#b3f7ff';

const IMAGE_BLEED = 0.01;        // 0 = no extra crop (was ~0.05 via 110%/-5%)
const IMAGE_SCALE_MIN = 1.00;   // start scale (was 1.05 / 1.20)
const IMAGE_SCALE_MAX = 1.15;   // subtle zoom (was 1.10 / 1.32)
const IMAGE_PAN_X = 4;          // px left/right pan (was ~8–10)
const IMAGE_PAN_Y = 4;          // px up/down pan (was ~4–12)
const IMAGE_RESIZE_MODE = 'cover';

// Base deep link URL
const DEEP_LINK_BASE_URL = 'https://staygenie.nuitee.link';
// Turquoise color constants
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const BLACK = "#000000";

// Updated Hotel interface types for SwipeableHotelStoryCard.tsx

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
  photoGalleryImages?: string[]; // ADD: Photo gallery images array
  allHotelInfo?: string;
  firstRoomImage?: string | null;
  secondRoomImage?: string | null;
  
  // AI-powered fields from two-stage API
  aiExcerpt?: string;
  whyItMatches?: string;
  funFacts?: string[];
  aiMatchPercent?: number;
  matchType?: string;
  aiSafetyRating?: number;
  safetyJustification?: string;

  // Enhanced pricing structure from two-stage API
  pricePerNight?: {
    amount: number;
    totalAmount: number;
    currency: string;
    display: string;
    provider: string | null;
    isSupplierPrice: boolean;
  } | null;
  
  // Location and amenity data from two-stage API
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
  
  // Guest insights and sentiment (may be loading initially)
  guestInsights?: string;
  sentimentPros?: string[];
  sentimentCons?: string[];
  
  // Category ratings
  categoryRatings?: {
    cleanliness: number;
    service: number;
    location: number;
    roomQuality: number;
  };
  thirdImageHd?: string | null;
  
  // Room availability
  roomTypes?: any[];
  
  // Refundable policy fields
  isRefundable?: boolean;
  refundableTag?: string | null;
  refundableInfo?: string;
  
  // Fields needed for deep linking
  placeId?: string; // Google Place ID for destination
  
  // NEW: Placeholder support
  isPlaceholder?: boolean;
}

interface EnhancedHotel extends Hotel {
  images: string[];
  mapImage: string;
  photoGalleryImages: string[]; // ADD: Ensure photo gallery is in enhanced hotel
  firstRoomImage?: string | null;
  secondRoomImage?: string | null;
}

interface SwipeableHotelStoryCardProps {
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
  // Two-stage API props
  isInsightsLoading?: boolean;
  insightsStatus?: 'loading' | 'partial' | 'complete';
  searchMode?: 'test' | 'two-stage' | 'legacy';
  // Props for deep linking
  placeId?: string;
  occupancies?: any[];
  searchParams?: any;
  topAmenities?: string[];
  
  // ADD THESE SAFETY RATING PROPS:
  safetyRating?: number;
  safetyJustification?: string;
  safetySource?: string;
  hasAISafetyRating?: boolean;
  showSafetyRating?: boolean;
  safetyRatingThreshold?: number;
  onFavoriteSuccess?: (hotelName: string) => void;
}

const calculateTotalStayCost = (
  checkInDate?: Date,
  checkOutDate?: Date,
  pricePerNight?: { amount: number; currency: string } | null,
  fallbackPrice?: number
): { nights: number; totalCost: string; currency: string } | null => {
  if (!checkInDate || !checkOutDate) return null;
  
  const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
  const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  if (nights <= 0) return null;
  
  const nightlyRate = pricePerNight?.amount || fallbackPrice || 0;
  const currency = pricePerNight?.currency || '$';
  const totalCost = nightlyRate * nights;
  
  return {
    nights,
    totalCost: `${currency}${totalCost.toLocaleString()}`,
    currency
  };
};


// Helper function to generate hotel deep link URL
const generateHotelDeepLink = (
  hotel: EnhancedHotel,
  checkInDate?: Date,
  checkOutDate?: Date,
  adults: number = 2,
  children: number = 0,
  placeId?: string,
  occupancies?: any[]
): string => {
  let url = `${DEEP_LINK_BASE_URL}/hotels/${hotel.id}`;
  const params = new URLSearchParams();

  if (placeId) {
    params.append('placeId', placeId);
  }

  if (checkInDate) {
    params.append('checkin', checkInDate.toISOString().split('T')[0]);
  }
  if (checkOutDate) {
    params.append('checkout', checkOutDate.toISOString().split('T')[0]);
  }

  if (occupancies && occupancies.length > 0) {
    try {
      const occupanciesString = btoa(JSON.stringify(occupancies));
      params.append('occupancies', occupanciesString);
    } catch (error) {
      console.warn('Failed to encode occupancies:', error);
    }
  } else if (adults || children) {
    const defaultOccupancy = [{ adults, children: children > 0 ? [children] : [] }];
    try {
      const occupanciesString = btoa(JSON.stringify(defaultOccupancy));
      params.append('occupancies', occupanciesString);
    } catch (error) {
      console.warn('Failed to encode default occupancy:', error);
    }
  }

  if (hotel.tags?.includes('All Inclusive')) {
    params.append('needAllInclusive', '1');
  }
  if (hotel.tags?.includes('Breakfast Included')) {
    params.append('needBreakfast', '1');
  }

  if (hotel.isRefundable) {
    params.append('needFreeCancellation', '1');
  }

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
};

// NEW: Updated Heart Button with Firebase auth integration
interface AnimatedHeartButtonProps {
  hotel: EnhancedHotel;
  size?: number;
  onShowSignUpModal?: () => void;
}

const openInAppBrowser = async (url: string) => {
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET, // iOS nice sheet
      dismissButtonStyle: 'done',
      showTitle: true,                // Android toolbar title
      toolbarColor: '#ffffff',        // Android toolbar
      controlsColor: '#000000ff',       // iOS controls tint
      enableBarCollapsing: true,      // Android
      secondaryToolbarColor: '#f6f6f6',
      showInRecents: false,
    });
  } catch (e) {
    // last-ditch fallback if WebBrowser fails
    try { await Linking.openURL(url); } catch {}
  }
};

const getRatingColor = (rating: number): string => {
  if (rating >= 8.0) return "#1df9ff";
  if (rating >= 7.0) return "#1df9ffE6";
  if (rating >= 6.0) return "#1df9ffCC";
  if (rating >= 5.0) return "#1df9ffB3";
  if (rating >= 4.0) return "#1df9ff99";
  return "#1df9ff80";
};

const isStage1Data = (hotel: Hotel): boolean => {
  return (
    (hotel.whyItMatches?.includes('progress') ?? false) ||
    (hotel.whyItMatches?.includes('loading') ?? false) ||
    (hotel.guestInsights?.includes('Loading') ?? false) ||
    (hotel.locationHighlight?.includes('Analyzing') ?? false) ||
    (hotel.nearbyAttractions?.some(attr => attr.includes('Loading')) ?? false) ||
    (hotel.funFacts?.some(fact => fact.includes('Loading')) ?? false)
  );
};



const generateAIInsight = (hotel: Hotel, insightsStatus?: string): string => {
  if (insightsStatus === 'loading' || isStage1Data(hotel)) {
    return "Loading AI insights...";
  }
  
  if (insightsStatus === 'partial') {
    return "✨ Generating detailed insights...";
  }
  
  if (hotel.whyItMatches && !hotel.whyItMatches.includes('progress') && !hotel.whyItMatches.includes('loading')) {
    return hotel.whyItMatches;
  }
  
  if (hotel.aiExcerpt && !hotel.aiExcerpt.includes('progress')) {
    return hotel.aiExcerpt;
  }

  if (hotel.locationHighlight && !hotel.locationHighlight.includes('Analyzing')) {
    return hotel.locationHighlight;
  }

  if (hotel.fullDescription) {
    return hotel.fullDescription.length > 120 
      ? hotel.fullDescription.substring(0, 120) + "..."
      : hotel.fullDescription;
  }

  if (hotel.aiMatchPercent && hotel.matchType) {
    const percentage = hotel.aiMatchPercent;
    const type = hotel.matchType;
    
    if (percentage >= 90) {
      return `Perfect ${type} match with exceptional amenities and ideal location for your preferences`;
    } else if (percentage >= 80) {
      return `Excellent ${type} match featuring premium facilities and great connectivity`;
    } else if (percentage >= 70) {
      return `Strong ${type} match with quality amenities and convenient location`;
    } else {
      return `Good ${type} match offering solid value and essential amenities`;
    }
  }

  return "Quality hotel choice with excellent amenities and service";
};

const generateReviewSummary = (hotel: Hotel, insightsStatus?: string): string => {
  if (insightsStatus === 'loading' || (hotel.guestInsights && hotel.guestInsights.includes('Loading'))) {
    return "Loading detailed guest sentiment analysis...";
  }

  if (hotel.guestInsights && !hotel.guestInsights.includes('Loading')) {
    return hotel.guestInsights;
  }

  if (hotel.sentimentPros && hotel.sentimentPros.length > 0) {
    const topPros = hotel.sentimentPros.slice(0, 2).join(' and ');
    let summary = `Guests particularly love the ${topPros}.`;
    
    if (hotel.sentimentCons && hotel.sentimentCons.length > 0) {
      summary += ` Some mention ${hotel.sentimentCons[0]} as an area for improvement.`;
    }
    
    return summary;
  }

  if (insightsStatus === 'partial') {
    return "✨ Analyzing guest reviews to provide detailed insights...";
  }

  const rating = hotel.rating;
  const matchType = hotel.matchType || 'standard';
  
  if (rating >= 4.5) {
    return `Guests consistently praise the exceptional service and ${matchType === 'perfect' ? 'premium' : 'quality'} amenities. Many highlight the comfortable accommodations and prime location.`;
  } else if (rating >= 4.0) {
    return `Travelers appreciate the solid value and convenient location. Most guests highlight the ${hotel.topAmenities?.slice(0, 2).join(' and ') || 'good amenities'}.`;
  } else if (rating >= 3.5) {
    return `Mixed reviews with guests enjoying the location and basic amenities. Many appreciate the value for money and accessible location.`;
  } else {
    return `Budget-friendly option with essential amenities. Guests appreciate the affordable rates and convenient access to local attractions.`;
  }
};

interface StoryProgressBarProps {
  currentSlide: number;
  totalSlides: number;
  onSlideChange: (slide: number) => void;
}

const StoryProgressBar: React.FC<StoryProgressBarProps> = ({ 
  currentSlide, 
  totalSlides, 
  onSlideChange 
}) => {
  const progressValues = useRef(
    Array.from({ length: totalSlides }, () => new Animated.Value(0))
  ).current;

  const opacityValues = useRef(
    Array.from({ length: totalSlides }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    const animations = progressValues.map((value, index) => {
      if (index < currentSlide) {
        return Animated.parallel([
          Animated.timing(value, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(opacityValues[index], {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          })
        ]);
      } else if (index === currentSlide) {
        return Animated.parallel([
          Animated.timing(value, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(opacityValues[index], {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          })
        ]);
      } else {
        return Animated.parallel([
          Animated.timing(value, {
            toValue: 0,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(opacityValues[index], {
            toValue: 0.4,
            duration: 150,
            useNativeDriver: false,
          })
        ]);
      }
    });

    Animated.parallel(animations).start();
  }, [currentSlide, progressValues, opacityValues]);

  return (
    // Enhanced container with better visibility
    <View style={[
      tw`flex-row absolute left-4 right-4 z-30 gap-2`, // Removed top-4
      { top: 12 }, // Custom top position - adjust this number
      {
        // Add subtle background for better contrast
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        padding: 8,
        borderRadius: 12,
        backdropFilter: 'blur(10px)', // iOS blur effect
      }
    ]}>
      {Array.from({ length: totalSlides }, (_, index) => (
        <TouchableOpacity
          key={index}
          style={[
            tw`flex-1 rounded-full overflow-hidden`, 
            {
              height: 4, // Increased height from 1 to 4
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              // Add subtle shadow for depth
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 2, // Android shadow
            }
          ]}
          onPress={() => onSlideChange(index)}
          activeOpacity={0.7}
        >
          <Animated.View
            style={[
              tw`h-full rounded-full`,
              {
                backgroundColor: index === currentSlide ? '#1df9ff' : '#FFFFFF', // Turquoise for active, white for completed
                opacity: opacityValues[index],
                transform: [{ scaleX: progressValues[index] }],
                transformOrigin: 'left',
                // Add glow effect for active indicator
                ...(index === currentSlide && {
                  shadowColor: '#1df9ff',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                  elevation: 4,
                })
              }
            ]}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const HotelOverviewSlide: React.FC<{ 
  hotel: EnhancedHotel; 
  insightsStatus?: string;
  searchMode?: string;
  checkInDate?: Date;
  checkOutDate?: Date;
  showAvailability?: boolean;
}> = ({ 
  hotel, 
  insightsStatus = 'complete',
  searchMode = 'two-stage',
  checkInDate,
  checkOutDate,
  showAvailability = true
}) => {
  const aiInsight = generateAIInsight(hotel, insightsStatus);
  const panAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(IMAGE_SCALE_MIN)).current;

  useEffect(() => {
    const panningAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(panAnimation, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(panAnimation, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    );

    const scalingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: IMAGE_SCALE_MAX,
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: IMAGE_SCALE_MIN,
          duration: 10000,
          useNativeDriver: true,
        }),
      ])
    );

    panningAnimation.start();
    scalingAnimation.start();

    return () => {
      panningAnimation.stop();
      scalingAnimation.stop();
    };
  }, [panAnimation, scaleAnimation]);

  const parseRatings = (guestInsights?: string) => {
  const defaultRatings = {
    cleanliness: 0,
    service: 0,
    location: 0,
    roomQuality: 0
  };

  if (!guestInsights || insightsStatus === 'loading') {
    return defaultRatings;
  }

  try {
    const lines = guestInsights.split('\n');
    const ratings = { ...defaultRatings };

    lines.forEach(line => {
      if (line.includes('Cleanliness:')) {
        const match = line.match(/(\d+\.?\d*)/);
        if (match) ratings.cleanliness = parseFloat(match[1]);
      } else if (line.includes('Service:')) {
        const match = line.match(/(\d+\.?\d*)/);
        if (match) ratings.service = parseFloat(match[1]);
      } else if (line.includes('Location:')) {
        const match = line.match(/(\d+\.?\d*)/);
        if (match) ratings.location = parseFloat(match[1]);
      } else if (line.includes('Room Quality:')) {
        const match = line.match(/(\d+\.?\d*)/);
        if (match) ratings.roomQuality = parseFloat(match[1]);
      }
    });

    return ratings;
  } catch (error) {
    return defaultRatings;
  }
};

const ratings = parseRatings(hotel.guestInsights);
const overallScore = ((ratings.cleanliness + ratings.service + ratings.location + ratings.roomQuality) / 4);


  const translateX = panAnimation.interpolate({ inputRange: [0, 1], outputRange: [-IMAGE_PAN_X, IMAGE_PAN_X] });
  const translateY = panAnimation.interpolate({ inputRange: [0, 1], outputRange: [-IMAGE_PAN_Y, IMAGE_PAN_Y] });

  const getDisplayPrice = () => {
    if (hotel.pricePerNight && hotel.pricePerNight !== null) {
      return `${hotel.pricePerNight.currency} ${hotel.pricePerNight.amount}`;
    }
    return `$${hotel.price}`;
  };

  const getLocationDisplay = () => {
    if (hotel.city && hotel.country) {
      return formatLocationDisplay(hotel.city, hotel.country);
    }
    if (hotel.fullAddress) {
      return hotel.fullAddress;
    }
    return hotel.location;
  };

  const getCompactAvailabilityText = () => {
  if (!checkInDate || !checkOutDate) return null;
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const start = formatDate(checkInDate);
  const end = formatDate(checkOutDate);
  
  // Smart formatting: if same month, show "Dec 15-18"
  if (checkInDate.getMonth() === checkOutDate.getMonth()) {
    const month = checkInDate.toLocaleDateString('en-US', { month: 'short' });
    const startDay = checkInDate.getDate();
    const endDay = checkOutDate.getDate();
    return `${month} ${startDay}-${endDay}`;
  }
  
  return `${start} - ${end}`;
};

  // Format dates for availability display
  const formatAvailabilityText = () => {
    if (!showAvailability || !checkInDate || !checkOutDate) return null;
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    };
    
    return `Available ${formatDate(checkInDate)} - ${formatDate(checkOutDate)}`;
  };

  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      <Animated.Image 
        source={{ uri: hotel.images[0] }} 
        style={[
          {
            width: `${100 + IMAGE_BLEED * 200}%`,
            height: `${100 + IMAGE_BLEED * 200}%`,
            left: `${-IMAGE_BLEED * 100}%`,
            top: `${-IMAGE_BLEED * 100}%`,
          },
          {
            transform: [
              { translateX },
              { translateY },
              { scale: scaleAnimation }
            ],
          }
        ]} 
        resizeMode={IMAGE_RESIZE_MODE}
      />
      
      {/* Reduced gradient height and opacity for less obstruction */}
      <View style={tw`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent z-1`} />
      
      {/* COMPACT TOP: Hotel info sized to content */}
      <View style={tw`absolute top-12 left-2 right-2 z-10`}>
        <View style={[
          tw`bg-black/30 border border-white/15 px-2 py-1 rounded-lg self-start`,
        ]}>
          <Text 
            style={[
              tw`text-white text-xs font-semibold`,
              { textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }
            ]}
          >
            {hotel.name}
          </Text>
          <View style={tw`flex-row items-center mt-0.5`}>
            <Ionicons name="location" size={10} color="#FFFFFF" />
            <Text style={[
              tw`text-white text-[10px] font-medium ml-1`,
              { textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }
            ]}
            >
              {getLocationDisplay()}
            </Text>
          </View>
        </View>
      </View>

      

      {/* COMPACT BOTTOM: Essential info only with tighter spacing */}
      <View style={tw`absolute bottom-4 left-2 right-2 z-10`}>
{getCompactAvailabilityText() && (
  <View style={tw`mb-2 self-start`}>
    <View style={[
      tw`bg-black/45 border border-white/15 px-2 py-1 rounded-md flex-row items-center`,
      {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      }
    ]}>
      <Ionicons name="checkmark-circle" size={10} color="#1df9ff" />
      <Text style={tw`text-white text-[9px] font-semibold ml-1`}>
        Available {getCompactAvailabilityText()}
      </Text>
    </View>
  </View>
)}

        {/* Compact price and rating row */}
<View style={tw`flex-row items-center justify-between mb-2`}>
  <View style={tw`bg-black/45 border border-white/15 px-2 py-1 rounded-md`}>
    
    <View style={tw`flex-row items-baseline`}>
      <Text style={tw`text-lg font-bold text-white`}>
        {getDisplayPrice()}
      </Text>
      <Text style={tw`text-white/80 text-[10px] ml-1`}>/night</Text>
    </View>
  </View>
  
  <View style={tw`bg-black/45 border border-white/15 px-2 py-1 rounded-md flex-row items-center`}>
    <View 
  style={[
    tw`w-4 h-4 rounded-full items-center justify-center mr-1`,
    { backgroundColor: getRatingColor(overallScore) } // Use overallScore instead of hotel.rating
  ]}
>
  <Ionicons 
    name="thumbs-up" 
    size={8} 
    color="#FFFFFF"
    style={{
      textShadowColor: '#000000',
      textShadowOffset: { width: 0.5, height: 0.5 },
      textShadowRadius: 1
    }}
  />
</View>
<Text style={tw`text-white text-xs font-semibold`}>
  {overallScore.toFixed(1)} {/* Use overallScore instead of hotel.rating */}
</Text>
<Text style={tw`text-white/70 text-[10px] ml-1`}>
  ({hotel.reviews || 0})
</Text>
  </View>
</View>

        {/* Flexible amenities row - adapts to text length */}
        {Array.isArray(hotel.topAmenities) && hotel.topAmenities.length > 0 && (
          <View style={tw`mb-2 flex-row flex-wrap gap-1`}>
            {hotel.topAmenities.slice(0, 3).map((amenity, idx) => (
              <View
                key={`${amenity}-${idx}`}
                style={[
                  tw`px-1.5 py-0.5 rounded-full`,
                  { backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1 }
                ]}
              >
                <Text style={tw`text-white text-[9px]`}>
                  {amenity}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Compact AI insight with smaller text */}
        <View style={tw`bg-black/40 p-2 rounded-md border border-white/15`}>
          <View style={tw`flex-row items-center mb-1`}>
            <Ionicons 
              name={insightsStatus === 'loading' ? "sync" : searchMode === 'test' ? "flask" : "sparkles"} 
              size={10} 
              color={searchMode === 'test' ? "#EA580C" : "#1df9ff"} 
            />
            <Text style={tw`text-white text-[10px] font-semibold ml-1`}>
              {hotel.aiMatchPercent 
                ? `AI Match ${hotel.aiMatchPercent}%`
                : searchMode === 'test' 
                  ? 'Test Mode'
                  : 'AI Insight'
              }
            </Text>
            {insightsStatus === 'loading' && (
              <View style={tw`ml-2`}>
                <Text style={tw`text-white/60 text-[10px]`}>Loading...</Text>
              </View>
            )}
          </View>
          <Text style={tw`text-white text-[10px] leading-3`} numberOfLines={4}>
            {aiInsight}
          </Text>
        </View>
      </View>
    </View>
  );
};




const AmenitiesSlide: React.FC<{ 
  hotel: EnhancedHotel; 
  insightsStatus?: string;
  // Safety rating props
  safetyRating?: number;
  safetyJustification?: string;
  safetySource?: string;
  hasAISafetyRating?: boolean;
  showSafetyRating?: boolean;
  safetyRatingThreshold?: number;
}> = ({ 
  hotel, 
  insightsStatus = 'complete',
  safetyRating,
  safetyJustification,
  safetySource = 'Standard',
  hasAISafetyRating = false,
  showSafetyRating = true,
  safetyRatingThreshold = 6.0,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Get stacked room images (same logic as before)
  const getStackedRoomImages = () => {
    const roomImages: string[] = [];
    
    if (hotel.firstRoomImage && typeof hotel.firstRoomImage === 'string' && hotel.firstRoomImage.trim() !== '') {
      roomImages.push(hotel.firstRoomImage);
    }
    
    if (hotel.secondRoomImage && typeof hotel.secondRoomImage === 'string' && hotel.secondRoomImage.trim() !== '') {
      roomImages.push(hotel.secondRoomImage);
    }
    
    if (roomImages.length === 0) {
      if (hotel.images && hotel.images.length > 2) {
        return [{ uri: hotel.images[2], type: 'fallback' }];
      }
      if (hotel.images && hotel.images.length > 1) {
        return [{ uri: hotel.images[1], type: 'fallback' }];
      }
      return [{ uri: hotel.images?.[0] || hotel.image, type: 'fallback' }];
    }
    
    return roomImages.map(uri => ({ uri, type: 'room' }));
  };

  const stackedImages = getStackedRoomImages();
  const hasRoomImages = stackedImages.length > 0 && stackedImages[0].type === 'room';

  const parseRatings = (guestInsights?: string) => {
    const defaultRatings = {
      cleanliness: 6.0,
      service: 6.0,
      location: 6.0,
      roomQuality: 6.0
    };

    if (!guestInsights || insightsStatus === 'loading') {
      return defaultRatings;
    }

    try {
      const lines = guestInsights.split('\n');
      const ratings = { ...defaultRatings };

      lines.forEach(line => {
        if (line.includes('Cleanliness:')) {
          const match = line.match(/(\d+\.?\d*)/);
          if (match) ratings.cleanliness = parseFloat(match[1]);
        } else if (line.includes('Service:')) {
          const match = line.match(/(\d+\.?\d*)/);
          if (match) ratings.service = parseFloat(match[1]);
        } else if (line.includes('Location:')) {
          const match = line.match(/(\d+\.?\d*)/);
          if (match) ratings.location = parseFloat(match[1]);
        } else if (line.includes('Room Quality:')) {
          const match = line.match(/(\d+\.?\d*)/);
          if (match) ratings.roomQuality = parseFloat(match[1]);
        }
      });

      hotel.categoryRatings = ratings;
      return ratings;
    } catch (error) {
      console.warn('Failed to parse ratings:', error);
      return defaultRatings;
    }
  };

  const ratings = parseRatings(hotel.guestInsights);

  const getRatingColor = (rating: number): string => {
    if (rating >= 8.0) return "#1df9ff";
    if (rating >= 7.0) return "#1df9ffE6";
    if (rating >= 6.0) return "#1df9ffCC";
    if (rating >= 5.0) return "#1df9ffB3";
    if (rating >= 4.0) return "#1df9ff99";
    return "#1df9ff80";
  };

  const getSafetyRatingColor = (rating: number): string => {
    if (rating >= safetyRatingThreshold) return '#10B981';
    if (rating >= 5.0) return '#F59E0B';
    return '#EF4444';
  };

  const displaySafetyRating = safetyRating || hotel.aiSafetyRating || hotel.safetyRating;
  const displaySafetyJustification = safetyJustification || hotel.safetyJustification;

  // Calculate overall guest score
  const overallScore = ((ratings.cleanliness + ratings.service + ratings.location + ratings.roomQuality) / 4);

  // Handle tap outside the ratings box to close it
  const handleBackgroundTap = () => {
    if (showDetails) {
      setShowDetails(false);
    }
  };

  // Handle tap on the ratings box
  const handleRatingsBoxTap = () => {
    setShowDetails(!showDetails);
  };

  // Prevent event bubbling when tapping inside the expanded box
  const handleExpandedContentTap = (e: any) => {
    e.stopPropagation();
    // Allow closing when tapping inside expanded content
    setShowDetails(false);
  };

  return (
    <TouchableOpacity 
      style={tw`flex-1 relative overflow-hidden`}
      activeOpacity={1}
      onPress={handleBackgroundTap}
    >
      {/* Background Images - same as before */}
      {hasRoomImages && stackedImages.length > 0 ? (
        <View style={tw`flex-1`}>
          {stackedImages.map((imageData, index) => (
            <View key={index} style={[
              tw`absolute left-0 right-0`,
              {
                top: index * (CARD_HEIGHT * 0.5),
                height: CARD_HEIGHT * 0.5,
              }
            ]}>
              <Image 
                source={{ uri: imageData.uri }}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                resizeMode="cover"
              />
            </View>
          ))}
        </View>
      ) : (
        <Image 
          source={{ uri: stackedImages[0]?.uri }}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
          }}
          resizeMode="cover"
        />
      )}
      
      <View style={tw`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent z-1`} />

      {/* BOTTOM: Expandable ratings section with improved tap interactions */}
      <View style={tw`absolute bottom-4 left-2 right-2 z-10`}>
        <TouchableOpacity
          style={[
            tw`bg-black/45 border border-white/15 rounded-md`,
            { 
              shadowColor: '#000000', 
              shadowOffset: { width: 0, height: 2 }, 
              shadowOpacity: 0.3, 
              shadowRadius: 4 
            }
          ]}
          onPress={handleRatingsBoxTap}
          activeOpacity={0.8}
        >
          {!showDetails ? (
            // Collapsed: Show icons with improved visual cues
            <View>
              <View style={tw`p-2 flex-row items-center justify-between`}>
                {/* Rating icons */}
                <View style={tw`items-center`}>
                  <View 
                    style={[
                      tw`w-6 h-6 rounded-full items-center justify-center mb-1`,
                      { backgroundColor: getRatingColor(ratings.cleanliness) }
                    ]}
                  >
                    <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                  </View>
                  <Text style={tw`text-white text-[8px]`}>
                    {insightsStatus === 'loading' ? '-' : ratings.cleanliness.toFixed(1)}
                  </Text>
                </View>

                <View style={tw`items-center`}>
                  <View 
                    style={[
                      tw`w-6 h-6 rounded-full items-center justify-center mb-1`,
                      { backgroundColor: getRatingColor(ratings.service) }
                    ]}
                  >
                    <Ionicons name="person" size={12} color="#FFFFFF" />
                  </View>
                  <Text style={tw`text-white text-[8px]`}>
                    {insightsStatus === 'loading' ? '-' : ratings.service.toFixed(1)}
                  </Text>
                </View>

                <View style={tw`items-center`}>
                  <View 
                    style={[
                      tw`w-6 h-6 rounded-full items-center justify-center mb-1`,
                      { backgroundColor: getRatingColor(ratings.location) }
                    ]}
                  >
                    <Ionicons name="location" size={12} color="#FFFFFF" />
                  </View>
                  <Text style={tw`text-white text-[8px]`}>
                    {insightsStatus === 'loading' ? '-' : ratings.location.toFixed(1)}
                  </Text>
                </View>

                <View style={tw`items-center`}>
                  <View 
                    style={[
                      tw`w-6 h-6 rounded-full items-center justify-center mb-1`,
                      { backgroundColor: getRatingColor(ratings.roomQuality) }
                    ]}
                  >
                    <Ionicons name="bed" size={12} color="#FFFFFF" />
                  </View>
                  <Text style={tw`text-white text-[8px]`}>
                    {insightsStatus === 'loading' ? '-' : ratings.roomQuality.toFixed(1)}
                  </Text>
                </View>

                {showSafetyRating && displaySafetyRating && (
                  <View style={tw`items-center`}>
                    <View 
                      style={[
                        tw`w-6 h-6 rounded-full items-center justify-center mb-1`,
                        { backgroundColor: getSafetyRatingColor(displaySafetyRating) }
                      ]}
                    >
                      <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
                    </View>
                    <Text style={tw`text-white text-[8px]`}>
                      {insightsStatus === 'loading' ? '-' : displaySafetyRating.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Enhanced tap prompt with animation hint */}
              <View style={[
                tw` bg-black/5 border-t border-white/20 px-3 py-2`,
                
              ]}>
                <View style={tw`flex-row items-center justify-center`}>
                  <View style={tw`flex-row items-center`}>
                   
                    <Text style={[
                      tw`text-[10px] font-medium mr-1 text-white`,
                 
                    ]}>
                      Tap here to view details
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            // Expanded: Detailed view with tap-to-close functionality
            <TouchableOpacity
              style={tw`p-3`}
              onPress={handleExpandedContentTap}
              activeOpacity={1}
            >
              {/* Header with overall score and close hint */}
              <View style={tw`flex-row items-center justify-between mb-3`}>
                <View style={tw`flex-row items-center`}>
                  <View 
                    style={[
                      tw`w-8 h-8 rounded-full items-center justify-center mr-2`,
                      { backgroundColor: getRatingColor(overallScore) }
                    ]}
                  >
                    <Text 
                      style={[
                        tw`text-[11px] font-bold text-white`,
                        {
                          textShadowColor: '#000000',
                          textShadowOffset: { width: 0.5, height: 0.5 },
                          textShadowRadius: 1
                        }
                      ]}
                    >
                      {insightsStatus === 'loading' ? '-' : overallScore.toFixed(1)}
                    </Text>
                  </View>
                  <Text style={tw`text-white text-sm font-semibold`}>Guest Ratings</Text>
                </View>
                <View style={tw`flex-row items-center`}>

                  <Ionicons 
                    name="chevron-up" 
                    size={16} 
                    color="white" 
                  />
                </View>
              </View>

              {/* Category ratings with labels */}
              <View style={tw`gap-2`}>
                <View style={tw`flex-row gap-2`}>
                  <View style={tw`flex-1 bg-black/30 border border-white/20 rounded-md p-2 flex-row items-center`}>
                    <View 
                      style={[
                        tw`w-6 h-6 rounded-full items-center justify-center`,
                        { backgroundColor: getRatingColor(ratings.cleanliness) }
                      ]}
                    >
                      <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                    </View>
                    <View style={tw`ml-2`}>
                      <Text style={tw`text-white text-[10px] font-medium`}>Cleanliness</Text>
                      <Text style={tw`text-white/80 text-[9px]`}>
                        {insightsStatus === 'loading' ? '-' : ratings.cleanliness.toFixed(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={tw`flex-1 bg-black/30 border border-white/20 rounded-md p-2 flex-row items-center`}>
                    <View 
                      style={[
                        tw`w-6 h-6 rounded-full items-center justify-center`,
                        { backgroundColor: getRatingColor(ratings.service) }
                      ]}
                    >
                      <Ionicons name="person" size={12} color="#FFFFFF" />
                    </View>
                    <View style={tw`ml-2`}>
                      <Text style={tw`text-white text-[10px] font-medium`}>Service</Text>
                      <Text style={tw`text-white/80 text-[9px]`}>
                        {insightsStatus === 'loading' ? '-' : ratings.service.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={tw`flex-row gap-2`}>
                  <View style={tw`flex-1 bg-black/30 border border-white/20 rounded-md p-2 flex-row items-center`}>
                    <View 
                      style={[
                        tw`w-6 h-6 rounded-full items-center justify-center`,
                        { backgroundColor: getRatingColor(ratings.location) }
                      ]}
                    >
                      <Ionicons name="location" size={12} color="#FFFFFF" />
                    </View>
                    <View style={tw`ml-2`}>
                      <Text style={tw`text-white text-[10px] font-medium`}>Location</Text>
                      <Text style={tw`text-white/80 text-[9px]`}>
                        {insightsStatus === 'loading' ? '-' : ratings.location.toFixed(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={tw`flex-1 bg-black/30 border border-white/20 rounded-md p-2 flex-row items-center`}>
                    <View 
                      style={[
                        tw`w-6 h-6 rounded-full items-center justify-center`,
                        { backgroundColor: getRatingColor(ratings.roomQuality) }
                      ]}
                    >
                      <Ionicons name="bed" size={12} color="#FFFFFF" />
                    </View>
                    <View style={tw`ml-2`}>
                      <Text style={tw`text-white text-[10px] font-medium`}>Rooms</Text>
                      <Text style={tw`text-white/80 text-[9px]`}>
                        {insightsStatus === 'loading' ? '-' : ratings.roomQuality.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Safety rating expanded */}
                {showSafetyRating && displaySafetyRating && (
                  <View style={tw`bg-black/30 border border-white/20 rounded-md p-2`}>
                    <View style={tw`flex-row items-center mb-1`}>
                      <View 
                        style={[
                          tw`w-6 h-6 rounded-full items-center justify-center`,
                          { backgroundColor: getSafetyRatingColor(displaySafetyRating) }
                        ]}
                      >
                        <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
                      </View>
                      <Text style={tw`text-white text-[10px] font-medium ml-2`}>
                        Safety {insightsStatus === 'loading' ? '-' : displaySafetyRating.toFixed(1)}
                      </Text>
                    </View>
                    
                    {displaySafetyJustification && displaySafetyJustification.trim() !== '' && (
                      <Text style={tw`text-white/90 text-[10px] leading-3`} numberOfLines={3}>
                        {displaySafetyJustification}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};
const SwipeableHotelStoryCard: React.FC<SwipeableHotelStoryCardProps> = ({ 
  hotel, 
  onSave,
  onViewDetails, 
  onHotelPress,
   onFavoriteSuccess,
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
  

  
  // ADD THESE DESTRUCTURED SAFETY PROPS:
  safetyRating,
  safetyJustification,
  safetySource = 'Standard',
  hasAISafetyRating = false,
  showSafetyRating = true,
  safetyRatingThreshold = 6.0,
}) => {

const [showFavoritesPopup, setShowFavoritesPopup] = useState(false);
const [favoritedHotelName, setFavoritedHotelName] = useState('');
const popupAnimation = useRef(new Animated.Value(0)).current;
const [showHotelChat, setShowHotelChat] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showEmailSignUpModal, setShowEmailSignUpModal] = useState(false);
  const [showEmailSignInModal, setShowEmailSignInModal] = useState(false);
  const [pendingFavorite, setPendingFavorite] = useState(false); // Track if we need to favorite after login
  const scrollViewRef = useRef<ScrollView>(null);
  const prevHotelId = useRef(hotel.id);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  // Particle animation for heart button
  const particleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
const { isAuthenticated, addFavoriteHotel, isFavoriteHotel, toggleFavoriteHotel, requireAuth } = useAuth();

  useEffect(() => {
    // Animate particles when favorite changes
    if (isAuthenticated && isFavoriteHotel(hotel.id)) {
      Animated.sequence([
        Animated.timing(particleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(particleAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.2,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isAuthenticated, hotel.id, isFavoriteHotel(hotel.id)]);
  

  useEffect(() => {
  if (prevHotelId.current !== hotel.id) {
    setCurrentSlide(0);
    setHasUserInteracted(false); // Add this line
    scrollViewRef.current?.scrollTo({
      x: 0,
      animated: false,
    });
    prevHotelId.current = hotel.id;
  }

  // Add this new section for the swipe hint
  if (!hasUserInteracted) {
    const timer = setTimeout(() => {

    }, 1000);

    return () => clearTimeout(timer);
  }
}, [hotel.id, hasUserInteracted]);

useEffect(() => {
  const handlePostAuthFavorite = async () => {
    if (isAuthenticated && pendingFavorite) {
      try {
        await addFavoriteHotel({
          id: hotel.id,
          name: hotel.name,
          location: hotel.location,
          image: hotel.image || hotel.images?.[0],
          images: hotel.images,
          price: hotel.price,
          rating: hotel.rating,
          reviews: hotel.reviews,
          // Rich hotel data for favorites
          city: hotel.city,
          country: hotel.country,
          latitude: hotel.latitude,
          longitude: hotel.longitude,
          aiExcerpt: hotel.aiExcerpt,
          whyItMatches: hotel.whyItMatches,
          funFacts: hotel.funFacts,
          aiMatchPercent: hotel.aiMatchPercent,
          matchType: hotel.matchType,
          tags: hotel.tags,
          features: hotel.features,
          topAmenities: hotel.topAmenities,
          nearbyAttractions: hotel.nearbyAttractions,
          locationHighlight: hotel.locationHighlight,
          pricePerNight: hotel.pricePerNight,
          guestInsights: hotel.guestInsights,
          sentimentPros: hotel.sentimentPros,
          sentimentCons: hotel.sentimentCons,
          isRefundable: hotel.isRefundable,
          refundableTag: hotel.refundableTag,
          fullDescription: hotel.fullDescription,
          fullAddress: hotel.fullAddress,
          // NEW: Add category ratings
          categoryRatings: hotel.categoryRatings,
        });
        console.log(`❤️ Successfully favorited "${hotel.name}" after authentication`);
        setPendingFavorite(false);
        
        // Close any open modals
        setShowEmailSignUpModal(false);
        setShowEmailSignInModal(false);
      } catch (error) {
        console.error('Error favoriting hotel after auth:', error);
        Alert.alert('Error', 'Failed to add hotel to favorites. Please try again.');
        setPendingFavorite(false);
      }
    }
  };

  handlePostAuthFavorite();
}, [isAuthenticated, pendingFavorite, addFavoriteHotel, hotel]);

  const handleShowSignUpModal = () => {
    console.log('🔒 User not authenticated - showing sign up modal');
    setPendingFavorite(true); // Mark that we want to favorite this hotel after auth
    setShowEmailSignUpModal(true);
  };

  const handleSwitchToSignIn = () => {
    setShowEmailSignUpModal(false);
    setTimeout(() => {
      setShowEmailSignInModal(true);
    }, 300);
  };

  const handleSwitchToSignUp = () => {
    setShowEmailSignInModal(false);
    setTimeout(() => {
      setShowEmailSignUpModal(true);
    }, 300);
  };

  const handleCloseSignUpModal = () => {
    setShowEmailSignUpModal(false);
    setPendingFavorite(false); // Cancel pending favorite if modal is closed
  };

  const handleCloseSignInModal = () => {
    setShowEmailSignInModal(false);
    setPendingFavorite(false); // Cancel pending favorite if modal is closed
  };

  const handleDeepLink = async () => {
  try {
    const deepLinkUrl = generateHotelDeepLink(
      hotel,
      checkInDate,
      checkOutDate,
      adults,
      children,
      placeId || hotel.placeId,
      occupancies
    );

    console.log(`🔗 Opening hotel deep link in-app: ${deepLinkUrl}`);
    await openInAppBrowser(deepLinkUrl);
  } catch (error) {
    console.error('Error opening deep link:', error);
    Alert.alert('Error', 'Failed to open hotel booking page. Please try again.', [{ text: 'OK' }]);
  }
};
const performSimpleSwipeHint = () => {
  if (scrollViewRef.current && !hasUserInteracted) {
    // Small peek at next slide
    scrollViewRef.current.scrollTo({ 
      x: CARD_WIDTH * 0.12, // Just 12% peek
      animated: true 
    });
    
    // Return to start
    setTimeout(() => {
      if (scrollViewRef.current && !hasUserInteracted) {
        scrollViewRef.current.scrollTo({ 
          x: 0, 
          animated: true 
        });
      }
    }, 400);
  }
};
  const generateGoogleMapsLink = (hotel: Hotel, checkin?: Date, checkout?: Date, adults: number = 2, children: number = 0): string => {
    let query = '';

    const locationText = hotel.city && hotel.country 
      ? `${hotel.name} ${hotel.city} ${hotel.country}`
      : hotel.fullAddress 
      ? `${hotel.name} ${hotel.fullAddress}`
      : `${hotel.name} ${hotel.location}`;
    query = encodeURIComponent(locationText);
    console.log(`📍 Using location text: ${locationText}`);
    
    let url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    
    if (checkin && checkout) {
      const checkinStr = checkin.toISOString().split('T')[0];
      const checkoutStr = checkout.toISOString().split('T')[0];
      
      url += `&hotel_dates=${checkinStr},${checkoutStr}`;
      url += `&hotel_adults=${adults}`;
      
      if (children > 0) {
        url += `&hotel_children=${children}`;
      }
    }
    
    return url;
  };

  const handleViewDetails = async () => {
  try {
    const mapsLink = generateGoogleMapsLink(hotel, checkInDate, checkOutDate, adults, children);
    console.log(`🗺️ Opening Google Maps (web) in-app: ${mapsLink}`);
    await openInAppBrowser(mapsLink);
    onViewDetails?.();
  } catch (error) {
    console.error('Error opening Google Maps:', error);
    Alert.alert('Unable to Open Maps', 'Please check your internet connection and try again.', [
      { text: 'OK', onPress: () => onViewDetails?.() },
    ]);
  }
};

const handleSlideChange = (slideIndex: number) => {
  if (!hasUserInteracted) {
  setHasUserInteracted(true);
}
  
  setCurrentSlide(slideIndex);
  scrollViewRef.current?.scrollTo({
    x: slideIndex * CARD_WIDTH,
    animated: true,
  });
};

 const handleScroll = (event: any) => {
  const scrollX = event.nativeEvent.contentOffset.x;
  
  // Add this line to detect real user interaction
  if (scrollX > CARD_WIDTH * 0.2 && !hasUserInteracted) {
    setHasUserInteracted(true);
  }

  const slideIndex = Math.round(scrollX / CARD_WIDTH);
  if (slideIndex !== currentSlide) {
    setCurrentSlide(slideIndex);
  }
};

  const handleLeftTap = () => {
    if (currentSlide > 0) {
      handleSlideChange(currentSlide - 1);
    }
  };

  const handleRightTap = () => {
    if (currentSlide < 2) {
      handleSlideChange(currentSlide + 1);
    }
  };

  const handleCardPress = () => {
    onHotelPress();
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    }
  };

  return (
    <View style={[tw`rounded-2xl shadow-lg`, { position: 'relative' }]}>
      <View
  style={[
    tw`bg-white overflow-hidden relative rounded-t-2xl`,
    { width: CARD_WIDTH, height: CARD_HEIGHT },
  ]}
>
        <StoryProgressBar
          currentSlide={currentSlide}
          totalSlides={5}
          onSlideChange={handleSlideChange}
        />
        

        
        <ScrollView
  ref={scrollViewRef}
  horizontal
  pagingEnabled
  showsHorizontalScrollIndicator={false}
  onScroll={handleScroll}
  scrollEventThrottle={8}
  style={tw`flex-1`}
  // Add these for better swiping:
  decelerationRate="fast"
  bounces={false}
  scrollEnabled={true}
  nestedScrollEnabled={false}
  snapToInterval={CARD_WIDTH}
  snapToAlignment="start"
  removeClippedSubviews={true}
scrollsToTop={false}
>
          <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <HotelOverviewSlide 
              hotel={hotel} 
              insightsStatus={insightsStatus}
              searchMode={searchMode}
              checkInDate={checkInDate} 
  checkOutDate={checkOutDate}
              showAvailability={true}
            />
          </View>
          <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <LocationSlide 
  hotel={hotel} 
  insightsStatus={insightsStatus}
  isVisible={currentSlide === 1}

/>
          </View>
          <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <AmenitiesSlide 
    hotel={hotel} 
    insightsStatus={insightsStatus}
    // Pass the safety rating props
    safetyRating={safetyRating}
    safetyJustification={safetyJustification}
    safetySource={safetySource}
    hasAISafetyRating={hasAISafetyRating}
    showSafetyRating={showSafetyRating}
    safetyRatingThreshold={safetyRatingThreshold}
  />
  
          </View>
          <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
  <ReviewsSlide 
    hotel={hotel}
    
    isVisible={currentSlide === 3}  // Reviews is slide index 3
  />
</View>
          {/* Slide 4: Photo Gallery - NEW! */}
  <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
  <PhotoGallerySlide 
    hotel={{
      ...hotel,
      photoGalleryImages: hotel.photoGalleryImages || [] // ADD: Pass photo gallery images
    }}
    insightsStatus={insightsStatus}
  />
</View>
  
        </ScrollView>
     </View>

<View style={tw`bg-white rounded-b-2xl`}>
  
{/* Action Buttons - Responsive design that adapts to screen width */}
<View style={tw`flex-row items-center px-3 py-3 gap-2`}>
  {/* Heart - Compact but accessible touch target */}
  <TouchableOpacity 
    style={[
      tw`w-10 h-10 items-center justify-center rounded-xl bg-white border border-gray-200`,
      {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
      }
    ]}
    activeOpacity={0.7}
  >
    <AnimatedHeartButton
      hotel={hotel}
  size={20}
  onShowSignUpModal={handleShowSignUpModal}
  onFavoriteSuccess={onFavoriteSuccess}
/>
  </TouchableOpacity>

  {/* Ask - Responsive pill that shrinks gracefully */}
  <TouchableOpacity
    style={[
      tw`py-2.5 px-3 rounded-xl flex-row items-center flex-1 justify-center bg-white border border-gray-200`,
      {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
        minHeight: 40,
        maxWidth: '30%', // Prevents overflow on small screens
      }
    ]}
    onPress={() => setShowHotelChat(true)}
    activeOpacity={0.8}
  >
    <View style={[
      tw`w-5 h-5 rounded-full items-center justify-center mr-1.5`,
      { backgroundColor: 'rgba(29, 249, 255, 0.15)' }
    ]}>
      <Ionicons name="chatbubble-outline" size={12} color={TURQUOISE_DARK} />
    </View>
    <Text 
      style={tw`text-xs font-medium text-gray-800`}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
    >
      Ask
    </Text>
  </TouchableOpacity>

  {/* Map - Responsive pill that shrinks gracefully */}
  <TouchableOpacity
    style={[
      tw`py-2.5 px-3 rounded-xl flex-row items-center flex-1 justify-center bg-white border border-gray-200`,
      {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
        minHeight: 40,
        maxWidth: '30%', // Prevents overflow on small screens
      }
    ]}
    onPress={handleViewDetails}
    activeOpacity={0.8}
  >
    <View style={[
      tw`w-5 h-5 rounded-full items-center justify-center mr-1.5`,
      { backgroundColor: 'rgba(29, 249, 255, 0.15)' }
    ]}>
      <Ionicons name="map-outline" size={12} color={TURQUOISE_DARK} />
    </View>
    <Text 
      style={tw`text-xs font-medium text-gray-800`}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
    >
      Map
    </Text>
  </TouchableOpacity>

  {/* Book - Responsive pill that shrinks gracefully */}
  <TouchableOpacity
    style={[
      tw`py-2.5 px-3 rounded-xl flex-row items-center flex-1 justify-center bg-white border border-gray-200`,
      {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
        minHeight: 40,
        maxWidth: '30%', // Prevents overflow on small screens
      }
    ]}
    onPress={handleDeepLink}
    activeOpacity={0.8}
  >
    <View style={[
      tw`w-5 h-5 rounded-full items-center justify-center mr-1.5`,
      { backgroundColor: 'rgba(29, 249, 255, 0.15)' }
    ]}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={{ width: 12, height: 12, tintColor: TURQUOISE_DARK }}
        resizeMode="contain"
      />
    </View>
    <Text 
      style={tw`text-xs font-medium text-gray-800`}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
    >
      Book
    </Text>
  </TouchableOpacity>
</View>
</View>

      {/* Email Sign Up Modal */}
      <EmailSignUpModal
        visible={showEmailSignUpModal}
        onClose={handleCloseSignUpModal}
        onSwitchToSignIn={handleSwitchToSignIn}
      />

      {/* Email Sign In Modal */}
      <EmailSignInModal
        visible={showEmailSignInModal}
        onClose={handleCloseSignInModal}
        onSwitchToSignUp={handleSwitchToSignUp}
        onForgotPassword={() => {
          console.log('Forgot password pressed');
        }}
      />
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

    </View>
    
  );
};

export default SwipeableHotelStoryCard;
export type { Hotel, EnhancedHotel, SwipeableHotelStoryCardProps };