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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 40;
const CARD_HEIGHT = screenHeight * 0.50;
const TURQUOISE_SUBTLE = '#f0feff';
const TURQUOISE_BORDER = '#b3f7ff';

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
  allHotelInfo?: string;
  
  // AI-powered fields from two-stage API
  aiExcerpt?: string;
  whyItMatches?: string;
  funFacts?: string[];
  aiMatchPercent?: number;
  matchType?: string;
  
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
}


const AvailabilityChip = ({ label }: { label?: string }) => {
  if (!label) return null;
  return (
    <View
      style={[
        tw`self-start flex-row items-center px-3 py-1.5 rounded-lg`,
        {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
        },
      ]}
    >
      <Ionicons name="checkmark-circle" size={12} color={TURQUOISE} style={tw`mr-1`} />
      <Text numberOfLines={1} style={[tw`text-xs font-medium text-white`]}>
        {label}
      </Text>
    </View>
  );
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
            toValue: 0.8,
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
            toValue: 0.3,
            duration: 150,
            useNativeDriver: false,
          })
        ]);
      }
    });

    Animated.parallel(animations).start();
  }, [currentSlide, progressValues, opacityValues]);

  return (
    <View style={tw`flex-row absolute top-4 left-4 right-4 z-10 gap-1.5`}>
      {Array.from({ length: totalSlides }, (_, index) => (
        <TouchableOpacity
          key={index}
          style={tw`flex-1 h-1 rounded-sm bg-white/20 overflow-hidden`}
          onPress={() => onSlideChange(index)}
          activeOpacity={0.7}
        >
          <Animated.View
            style={[
              tw`h-full bg-white rounded-sm`,
              {
                opacity: opacityValues[index],
                transform: [{ scaleX: progressValues[index] }],
                transformOrigin: 'left'
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
  showAvailability = false
}) => {
  const aiInsight = generateAIInsight(hotel, insightsStatus);
  const panAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1.05)).current;

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
          toValue: 1.1,
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1.05,
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

  const translateX = panAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 8],
  });

  const translateY = panAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 4],
  });

  const getDisplayPrice = () => {
    if (hotel.pricePerNight && hotel.pricePerNight !== null) {
      return `${hotel.pricePerNight.currency} ${hotel.pricePerNight.amount}`;
    }
    return `${hotel.price}`;
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

  // Format dates for availability display - same logic as header
  const formatDateRange = () => {
    if (!showAvailability || !checkInDate || !checkOutDate) return null;
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    };
    
    return `${formatDate(checkInDate)} - ${formatDate(checkOutDate)}`;
  };

  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      <Animated.Image 
        source={{ uri: hotel.images[0] }} 
        style={[
          {
            position: 'absolute',
            width: '110%',
            height: '110%',
            left: '-5%',
            top: '-5%',
          },
          {
            transform: [
              { translateX },
              { translateY },
              { scale: scaleAnimation }
            ],
          }
        ]} 
        resizeMode="cover"
      />
      
      <View style={tw`absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-black/70 to-transparent z-1`} />
      
      <View style={tw`absolute top-10 left-4 z-10`}>
        <View style={[tw`bg-black/30 border border-white/20 px-2.5 py-1.5 rounded-lg`, { maxWidth: screenWidth * 0.6 }]}>
          <Text 
            style={[
              tw`text-white text-sm font-semibold`,
              { textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }
            ]}
            numberOfLines={2}
          >
            {hotel.name}
          </Text>
        </View>
        
        <View style={tw`flex-row items-center mt-1.5`}>
          <View style={tw`bg-black/30 border border-white/20 px-2 py-1 rounded-md flex-row items-center`}>
            <Ionicons name="location" size={12} color="#FFFFFF" />
            <Text style={[
              tw`text-white text-xs font-medium ml-1`,
              { textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }
            ]}>
              {getLocationDisplay()}
            </Text>
          </View>
        </View>
      </View>

      <View style={tw`absolute bottom-6 left-4 right-4 z-10`}>
        {/* Compact availability chip above price */}
{showAvailability && formatDateRange() && (
  <View style={tw`mb-2`}>
    <AvailabilityChip label={formatDateRange()!} />
  </View>
)}

        <View style={tw`flex-row items-end gap-2 mb-2.5`}>
          <View style={tw`bg-black/50 border border-white/20 px-3 py-1.5 rounded-lg`}>
            <View style={tw`flex-row items-baseline`}>
              <Text style={tw`text-xl font-bold text-white`}>
                {getDisplayPrice()}
              </Text>
              <Text style={tw`text-white/80 text-xs ml-1`}>
                /night
              </Text>
            </View>
          </View>
          
          <View style={tw`bg-black/50 border border-white/20 px-3 py-1.5 rounded-lg`}>
            <View style={tw`flex-row items-center`}>
              <View 
                style={[
                  tw`w-5 h-5 rounded-full items-center justify-center mr-1`,
                  { backgroundColor: getRatingColor(hotel.rating) }
                ]}
              >
                <Ionicons 
                  name="thumbs-up" 
                  size={10} 
                  color="#FFFFFF"
                  style={{
                    textShadowColor: '#000000',
                    textShadowOffset: { width: 0.5, height: 0.5 },
                    textShadowRadius: 1
                  }}
                />
              </View>
              <Text style={tw`text-white text-xs font-semibold`}>
                {hotel.rating.toFixed(1)}
              </Text>
              <Text style={tw`text-white/70 text-xs ml-1`}>
                ({hotel.reviews || 0})
              </Text>
            </View>
          </View>
        </View>

        <View style={tw`bg-black/50 p-2.5 rounded-lg border border-white/20`}>
          <View style={tw`flex-row items-center mb-1`}>
            <Ionicons 
              name={insightsStatus === 'loading' ? "sync" : searchMode === 'test' ? "flask" : "sparkles"} 
              size={12} 
              color={searchMode === 'test' ? "#EA580C" : "#1df9ff"} 
            />
            <Text style={tw`text-white text-xs font-semibold ml-1`}>
              {hotel.aiMatchPercent 
                ? `AI Match ${hotel.aiMatchPercent}%`
                : searchMode === 'test' 
                  ? 'Test Mode'
                  : 'AI Insight'
              }
            </Text>
            {insightsStatus === 'loading' && (
              <View style={tw`ml-2`}>
                <Text style={tw`text-white/60 text-xs`}>Loading...</Text>
              </View>
            )}
          </View>
          <Text style={tw`text-white text-xs leading-4`}>
            {aiInsight}
          </Text>
        </View>
      </View>
    </View>
  );
};

const LocationSlide: React.FC<{ hotel: EnhancedHotel; insightsStatus?: string }> = ({ 
  hotel, 
  insightsStatus = 'complete' 
}) => {
  const getLocationImage = () => {
    if (hotel.latitude && hotel.longitude) {
      const zoom = 12;
      const width = 600;
      const height = 400;
      return `https://maps.locationiq.com/v3/staticmap?key=pk.79c544ae745ee83f91a7523c99939210&center=${hotel.latitude},${hotel.longitude}&zoom=${zoom}&size=${width}x${height}&markers=icon:large-red-cutout|${hotel.latitude},${hotel.longitude}`;
    }

    if (hotel.images && hotel.images.length > 1) {
      return hotel.images[1];
    }
    return hotel.images?.[0] || hotel.image;
  };

  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      <Image 
        source={{ uri: getLocationImage() }} 
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
        }}
        resizeMode="cover"
      />
      
      <View style={tw`absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-black/70 to-transparent z-1`} />
      
      <View style={tw`absolute bottom-6 left-4 right-4 z-10`}>
        {hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0 && (
          <View style={tw`bg-black/50 p-2.5 rounded-lg border border-white/20 mb-2.5`}>
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons 
                name={insightsStatus === 'loading' && hotel.nearbyAttractions.some(attr => attr.includes('Loading')) ? "sync" : "location"} 
                size={12} 
                color="#1df9ff" 
              />
              <Text style={tw`text-white text-xs font-semibold ml-1`}>Nearby Attractions</Text>
              {insightsStatus === 'loading' && hotel.nearbyAttractions.some(attr => attr.includes('Loading')) && (
                <Text style={tw`text-white/60 text-xs ml-2`}>Loading...</Text>
              )}
            </View>
            {hotel.nearbyAttractions.slice(0, 3).map((attraction, index) => (
              <Text key={index} style={tw`text-white text-xs leading-4 ${index === 0 ? '' : 'mt-1'}`}>
                • {attraction}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const AmenitiesSlide: React.FC<{ 
  hotel: EnhancedHotel; 
  insightsStatus?: string;
}> = ({ 
  hotel, 
  insightsStatus = 'complete'
}) => {
  const panAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1.2)).current;

  useEffect(() => {
    const panningAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(panAnimation, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(panAnimation, {
          toValue: 0,
          duration: 10000,
          useNativeDriver: true,
        }),
      ])
    );

    const scalingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 1.32,
          duration: 14000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1.2,
          duration: 14000,
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

  const translateX = panAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 10],
  });

  const translateY = panAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [12, -12],
  });

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

    // Store the parsed ratings in the hotel object for later use
    hotel.categoryRatings = ratings;

    return ratings;
  } catch (error) {
    console.warn('Failed to parse ratings:', error);
    return defaultRatings;
  }
};
  const ratings = parseRatings(hotel.guestInsights);

  const getRatingColor = (rating: number): string => {
    if (rating >= 8.0) return "#06B6D4";
    if (rating >= 7.0) return "#22D3EE";
    if (rating >= 6.0) return "#67E8F9";
    if (rating >= 5.0) return "#A5F3FC";
    if (rating >= 4.0) return "#CFFAFE";
    return "#E0F7FA";
  };

  const getRatingTextColor = (rating: number): string => {
    return "#FFFFFF";
  };

  const getAmenitiesImage = () => {
  // NEW: Use thirdImageHd if available
  if (hotel.thirdImageHd) {
    return hotel.thirdImageHd;
  }
  
  // Fallback to existing logic
  if (hotel.images && hotel.images.length > 2) {
    return hotel.images[2];
  }
  if (hotel.images && hotel.images.length > 1) {
    return hotel.images[1];
  }
  return hotel.images && hotel.images.length > 0 ? hotel.images[0] : hotel.image;
};

  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      <Animated.Image 
        source={{ uri: getAmenitiesImage() }} 
        style={[
          {
            position: 'absolute',
            width: '100%',
            height: '100%',
            left: '-10%',
            top: '-10%',
          },
          {
            transform: [
              { translateX },
              { translateY },
              { scale: scaleAnimation }
            ],
          }
        ]} 
        resizeMode="cover"
      />
      
      <View style={tw`absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-black/70 to-transparent z-1`} />
      
      <View style={tw`absolute bottom-6 left-4 right-4 z-10`}>
        
        <View style={tw`bg-black/50 p-2.5 rounded-lg border border-white/20 mb-3`}>
          <View style={tw`flex-row items-center mb-1`}>
            <Ionicons 
              name={insightsStatus === 'loading' && hotel.funFacts?.some(fact => fact.includes('Loading')) ? "sync" : "bulb"} 
              size={12} 
              color="#1df9ff" 
            />
            <Text style={tw`text-white text-xs font-semibold ml-1`}>
              Fun Facts
            </Text>
            {insightsStatus === 'loading' && hotel.funFacts?.some(fact => fact.includes('Loading')) && (
              <View style={tw`ml-2`}>
                <Text style={tw`text-white/60 text-xs`}>Loading...</Text>
              </View>
            )}
          </View>
          {hotel.funFacts && hotel.funFacts.length > 0 ? (
            hotel.funFacts.slice(0, 2).map((fact, index) => (
              <Text key={index} style={tw`text-white text-xs leading-4 ${index === 0 ? '' : 'mt-1'}`}>
                • {fact.includes('Loading') ? 'Generating fun facts...' : fact}
              </Text>
            ))
          ) : (
            <Text style={tw`text-white text-xs leading-4`}>
              {insightsStatus === 'loading' 
                ? 'Discovering interesting facts about this hotel...'
                : 'Modern amenities and excellent guest services'
              }
            </Text>
          )}
        </View>

        <View style={tw`gap-1`}>
          <View style={tw`flex-row gap-1`}>
            <View style={tw`flex-1 bg-black/50 border border-white/20 rounded-md p-1.5 flex-row items-center`}>
              <View 
                style={[
                  tw`w-7 h-7 rounded-full items-center justify-center`,
                  { backgroundColor: getRatingColor(ratings.cleanliness) }
                ]}
              >
                <Text 
                  style={[
                    tw`text-xs font-bold`,
                    { 
                      color: getRatingTextColor(ratings.cleanliness),
                      textShadowColor: '#000000',
                      textShadowOffset: { width: 0.5, height: 0.5 },
                      textShadowRadius: 1
                    }
                  ]}
                >
                  {insightsStatus === 'loading' ? '-' : ratings.cleanliness.toFixed(1)}
                </Text>
              </View>
              <Text style={tw`text-white text-xs font-medium ml-1.5`}>Cleanliness</Text>
            </View>

            <View style={tw`flex-1 bg-black/50 border border-white/20 rounded-md p-1.5 flex-row items-center`}>
              <View 
                style={[
                  tw`w-7 h-7 rounded-full items-center justify-center`,
                  { backgroundColor: getRatingColor(ratings.service) }
                ]}
              >
                <Text 
                  style={[
                    tw`text-xs font-bold`,
                    { 
                      color: getRatingTextColor(ratings.service),
                      textShadowColor: '#000000',
                      textShadowOffset: { width: 0.5, height: 0.5 },
                      textShadowRadius: 1
                    }
                  ]}
                >
                  {insightsStatus === 'loading' ? '-' : ratings.service.toFixed(1)}
                </Text>
              </View>
              <Text style={tw`text-white text-xs font-medium ml-1.5`}>Service</Text>
            </View>
          </View>

          <View style={tw`flex-row gap-1`}>
            <View style={tw`flex-1 bg-black/50 border border-white/20 rounded-md p-1.5 flex-row items-center`}>
              <View 
                style={[
                  tw`w-7 h-7 rounded-full items-center justify-center`,
                  { backgroundColor: getRatingColor(ratings.location) }
                ]}
              >
                <Text 
                  style={[
                    tw`text-xs font-bold`,
                    { 
                      color: getRatingTextColor(ratings.location),
                      textShadowColor: '#000000',
                      textShadowOffset: { width: 0.5, height: 0.5 },
                      textShadowRadius: 1
                    }
                  ]}
                >
                  {insightsStatus === 'loading' ? '-' : ratings.location.toFixed(1)}
                </Text>
              </View>
              <Text style={tw`text-white text-xs font-medium ml-1.5`}>Location</Text>
            </View>

            <View style={tw`flex-1 bg-black/50 border border-white/20 rounded-md p-1.5 flex-row items-center`}>
              <View 
                style={[
                  tw`w-7 h-7 rounded-full items-center justify-center`,
                  { backgroundColor: getRatingColor(ratings.roomQuality) }
                ]}
              >
                <Text 
                  style={[
                    tw`text-xs font-bold`,
                    { 
                      color: getRatingTextColor(ratings.roomQuality),
                      textShadowColor: '#000000',
                      textShadowOffset: { width: 0.5, height: 0.5 },
                      textShadowRadius: 1
                    }
                  ]}
                >
                  {insightsStatus === 'loading' ? '-' : ratings.roomQuality.toFixed(1)}
                </Text>
              </View>
              <Text style={tw`text-white text-xs font-medium ml-1.5`}>Rooms</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const SwipeableHotelStoryCard: React.FC<SwipeableHotelStoryCardProps> = ({ 
  hotel, 
  onSave,
  onViewDetails, 
  onHotelPress,
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
  occupancies
}) => {

  const [showFavoritePopup, setShowFavoritePopup] = useState(false);
const popupAnimation = useRef(new Animated.Value(0)).current;
const [showHotelChat, setShowHotelChat] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showEmailSignUpModal, setShowEmailSignUpModal] = useState(false);
  const [showEmailSignInModal, setShowEmailSignInModal] = useState(false);
  const [pendingFavorite, setPendingFavorite] = useState(false); // Track if we need to favorite after login
  const scrollViewRef = useRef<ScrollView>(null);
  const prevHotelId = useRef(hotel.id);

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
      scrollViewRef.current?.scrollTo({
        x: 0,
        animated: false,
      });
      prevHotelId.current = hotel.id;
    }
  }, [hotel.id]);

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
    setCurrentSlide(slideIndex);
    scrollViewRef.current?.scrollTo({
      x: slideIndex * CARD_WIDTH,
      animated: true,
    });
  };

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
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
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handleCardPress}
        style={[
          tw`bg-white overflow-hidden relative rounded-t-2xl`,
          { width: CARD_WIDTH, height: CARD_HEIGHT },
        ]}
      >
        <StoryProgressBar
          currentSlide={currentSlide}
          totalSlides={3}
          onSlideChange={handleSlideChange}
        />
        
        {currentSlide > 0 && (
          <TouchableOpacity
            style={tw`absolute top-0 left-0 w-40 h-full z-20`}
            onPress={handleLeftTap}
            activeOpacity={0}
          />
        )}
        
        {currentSlide < 2 && (
          <TouchableOpacity
            style={tw`absolute top-0 right-0 w-40 h-full z-20`}
            onPress={handleRightTap}
            activeOpacity={0}
          />
        )}
        
        {currentSlide > 0 && (
          <TouchableOpacity
            style={tw`absolute top-24 left-3 w-8 h-8 rounded-full bg-black/30 items-center justify-center z-25`}
            onPress={handleLeftTap}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        
        {currentSlide < 2 && (
          <TouchableOpacity
            style={tw`absolute top-24 right-3 w-8 h-8 rounded-full bg-black/30 items-center justify-center z-25`}
            onPress={handleRightTap}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={tw`flex-1`}
        >
          <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <HotelOverviewSlide 
              hotel={hotel} 
              insightsStatus={insightsStatus}
              searchMode={searchMode}
              showAvailability={true}
            />
          </View>
          <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <LocationSlide 
              hotel={hotel} 
              insightsStatus={insightsStatus}
            />
          </View>
          <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <AmenitiesSlide 
              hotel={hotel} 
              insightsStatus={insightsStatus}
            />
          </View>
        </ScrollView>
      </TouchableOpacity>
      

<View style={tw`bg-white rounded-b-2xl`}>
  
{/* Action Buttons - Original spacing, smaller text */}
<View style={tw`flex-row items-center px-4 py-3 gap-2`}>
  {/* Heart/Save Button */}
  <AnimatedHeartButton
    hotel={hotel}
    size={24}
    onShowSignUpModal={handleShowSignUpModal}
  />

  {/* Ask Button */}
  <TouchableOpacity
    style={[
      tw`py-3 px-4 rounded-xl border-2 flex-row items-center flex-1 justify-center`,
      {
        backgroundColor: TURQUOISE + '10',
        borderColor: TURQUOISE + '30',
      },
    ]}
    onPress={() => setShowHotelChat(true)}
    activeOpacity={0.8}
  >
    <Ionicons name="chatbubble" size={14} color={TURQUOISE_DARK} />
    <Text
      style={[tw`ml-2 font-medium text-xs`, { color: BLACK }]}
      numberOfLines={1}
    >
      Ask
    </Text>
  </TouchableOpacity>

  {/* View Details (Map) Button */}
  <TouchableOpacity
    style={[
      tw`py-3 px-4 rounded-xl border-2 flex-row items-center flex-1 justify-center`,
      {
        backgroundColor: TURQUOISE + '10',
        borderColor: TURQUOISE + '30',
      },
    ]}
    onPress={handleViewDetails}
    activeOpacity={0.8}
  >
    <Ionicons name="map" size={14} color={TURQUOISE_DARK} />
    <Text
      style={[tw`ml-2 font-medium text-xs`, { color: BLACK }]}
      numberOfLines={1}
    >
      Map
    </Text>
  </TouchableOpacity>

  {/* Book Button */}
  <TouchableOpacity
    style={[
      tw`py-3 px-4 rounded-xl border-2 flex-row items-center flex-1 justify-center`,
      {
        backgroundColor: TURQUOISE + '10',
        borderColor: TURQUOISE + '30',
      },
    ]}
    onPress={handleDeepLink}
    activeOpacity={0.8}
  >
    <Image
      source={require('../../assets/images/logo.png')}
      style={{ width: 14, height: 14 }}
      resizeMode="contain"
    />
    <Text
      style={[tw`ml-2 font-medium text-xs`, { color: BLACK }]}
      numberOfLines={1}
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