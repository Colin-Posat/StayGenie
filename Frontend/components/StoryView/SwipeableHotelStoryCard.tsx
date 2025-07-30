// SwipeableHotelStoryCard.tsx - Updated for Two-Stage API system
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import FavoritesCache from '../../utils/FavoritesCache'; // Import the cache
import { formatLocationDisplay, getCountryName } from '../../utils/countryMapping';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 40;
const CARD_HEIGHT = screenHeight * 0.55;

// UPDATED: Interface to match two-stage API structure
interface Hotel {
  id: string; // FIXED: Changed from number to string to match API hotel IDs
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
  
  // Room availability
  roomTypes?: any[];

  // NEW: Refundable policy fields
  isRefundable?: boolean;
  refundableTag?: string | null;
  refundableInfo?: string;
}

interface EnhancedHotel extends Hotel {
  images: string[];
  mapImage: string;
}

interface SwipeableHotelStoryCardProps {
  hotel: EnhancedHotel;
  onSave?: () => void; // Made optional since we'll handle internally
  onViewDetails: () => void;
  onHotelPress: () => void;
  index: number;
  totalCount: number;
  checkInDate?: Date;
  checkOutDate?: Date;
  adults?: number;
  children?: number;
  // NEW: Two-stage API props
  isInsightsLoading?: boolean;
  insightsStatus?: 'loading' | 'partial' | 'complete';
  searchMode?: 'test' | 'two-stage' | 'legacy';
}

// UPDATED: Animated Heart Button Component with cache integration
interface AnimatedHeartButtonProps {
  hotel: EnhancedHotel;
  size?: number;
}

const AnimatedHeartButton: React.FC<AnimatedHeartButtonProps> = ({ hotel, size = 28 }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const favoritesCache = FavoritesCache.getInstance();

  // Check if hotel is already favorited on mount
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        const isFavorited = await favoritesCache.isFavorited(hotel.id);
        setIsLiked(isFavorited);
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    };

    checkFavoriteStatus();
  }, [hotel.id, favoritesCache]);

  const animateHeart = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.4,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    animateHeart();
    
    try {
      // Toggle favorite status in cache
      const newStatus = await favoritesCache.toggleFavorite(hotel);
      setIsLiked(newStatus);
      
      // Show feedback to user
      if (newStatus) {
        console.log(`❤️ Added "${hotel.name}" to favorites`);
        // Could show a toast notification here
      } else {
        console.log(`💔 Removed "${hotel.name}" from favorites`);
        // Could show a toast notification here
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorites. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={tw`relative`}>
      <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.6}
          disabled={isLoading}
          style={[
            tw`border border-black/10 bg-gray-100 py-2.5 px-4 rounded-lg items-center justify-center`,
            isLoading && tw`opacity-60`
          ]}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            {isLoading ? (
              <Ionicons
                name="sync"
                size={size}
                color="#666666"
              />
            ) : (
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={size}
                color={isLiked ? "#FF3040" : "#262626"}
              />
            )}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const getRatingColor = (rating: number): string => {
  const normalizedRating = Math.max(0, Math.min(10, rating)) / 10;
  
  if (normalizedRating >= 0.8) return "#10B981"; // Green (8-10)
  if (normalizedRating >= 0.6) return "#84CC16"; // Light green (6-8)
  if (normalizedRating >= 0.4) return "#EAB308"; // Yellow (4-6)
  if (normalizedRating >= 0.2) return "#F97316"; // Orange (2-4)
  return "#EF4444"; // Red (0-2)
};

// NEW: Check if data is from Stage 1 (has loading placeholders)
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

// UPDATED: Enhanced AI insights using two-stage API data
const generateAIInsight = (hotel: Hotel, insightsStatus?: string): string => {
  // Show loading state for Stage 1 data
  if (insightsStatus === 'loading' || isStage1Data(hotel)) {
    return "AI is analyzing this hotel...";
  }
  
  // Priority 1: Use API-provided AI match explanation (Stage 2)
  if (hotel.whyItMatches && !hotel.whyItMatches.includes('progress') && !hotel.whyItMatches.includes('loading')) {
    return hotel.whyItMatches;
  }
  
  // Priority 2: Use AI excerpt
  if (hotel.aiExcerpt && !hotel.aiExcerpt.includes('progress')) {
    return hotel.aiExcerpt;
  }

  // Priority 3: Use location highlight from two-stage API
  if (hotel.locationHighlight && !hotel.locationHighlight.includes('Analyzing')) {
    return hotel.locationHighlight;
  }

  // Priority 4: Use description excerpt
  if (hotel.fullDescription) {
    return hotel.fullDescription.length > 120 
      ? hotel.fullDescription.substring(0, 120) + "..."
      : hotel.fullDescription;
  }

  // Priority 5: Generate based on match type and AI match percentage
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

  // Fallback for partial data
  if (insightsStatus === 'partial') {
    return "✨ AI analysis in progress - detailed insights coming soon...";
  }

  // Final fallback
  return "Quality hotel choice with excellent amenities and service";
};

// UPDATED: Enhanced review summary using two-stage API guest insights
const generateReviewSummary = (hotel: Hotel, insightsStatus?: string): string => {
  // Show loading state for insights
  if (insightsStatus === 'loading' || (hotel.guestInsights && hotel.guestInsights.includes('Loading'))) {
    return "Loading detailed guest sentiment analysis...";
  }

  // Priority 1: Use two-stage API guest insights
  if (hotel.guestInsights && !hotel.guestInsights.includes('Loading')) {
    return hotel.guestInsights;
  }

  // Priority 2: Use sentiment analysis data
  if (hotel.sentimentPros && hotel.sentimentPros.length > 0) {
    const topPros = hotel.sentimentPros.slice(0, 2).join(' and ');
    let summary = `Guests particularly love the ${topPros}.`;
    
    if (hotel.sentimentCons && hotel.sentimentCons.length > 0) {
      summary += ` Some mention ${hotel.sentimentCons[0]} as an area for improvement.`;
    }
    
    return summary;
  }

  // Show partial loading state
  if (insightsStatus === 'partial') {
    return "✨ Analyzing guest reviews to provide detailed insights...";
  }

  // Priority 3: Generate based on rating and match type
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

// Smooth Story Progress Bar Component
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

// UPDATED: Hotel Overview slide with two-stage API data and loading states
const HotelOverviewSlide: React.FC<{ 
  hotel: EnhancedHotel; 
  insightsStatus?: string;
  searchMode?: string;
}> = ({ 
  hotel, 
  insightsStatus = 'complete',
  searchMode = 'two-stage'
}) => {
  const aiInsight = generateAIInsight(hotel, insightsStatus);
  const panAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1.05)).current; // REDUCED from 1.2 to 1.05

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
          toValue: 1.1, // REDUCED from 1.3 to 1.1
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1.05, // REDUCED from 1.2 to 1.05
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

  // REDUCED pan movement for more image visibility
  const translateX = panAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 8], // REDUCED from [-15, 15] to [-8, 8]
  });

  const translateY = panAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 4], // REDUCED from [-8, 8] to [-4, 4]
  });

  // UPDATED: Enhanced price display using two-stage API pricing
  const getDisplayPrice = () => {
    if (hotel.pricePerNight && hotel.pricePerNight !== null) {
      return `${hotel.pricePerNight.currency} ${hotel.pricePerNight.amount}`;
    }
    return `${hotel.price}`;
  };

  // UPDATED: Location display using two-stage API location data
  const getLocationDisplay = () => {
    if (hotel.city && hotel.country) {
      return formatLocationDisplay(hotel.city, hotel.country);
    }
    if (hotel.fullAddress) {
      return hotel.fullAddress;
    }
    return hotel.location;
  };

  // NEW: Helper function to get refundable policy display
  const getRefundablePolicyDisplay = () => {
    if (hotel.isRefundable === undefined) {
      return null; // Don't show anything if no refundable data available
    }
    
    return {
      icon: hotel.isRefundable ? "checkmark-circle" : "close-circle",
      color: hotel.isRefundable ? "#10B981" : "#EF4444",
      tag: hotel.refundableTag
    };
  };

  const refundableDisplay = getRefundablePolicyDisplay();

  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      <Animated.Image 
        source={{ uri: hotel.images[0] }} 
        style={[
          {
            position: 'absolute',
            width: '100%', // REDUCED from '120%' to '110%'
            height: '100%', // REDUCED from '120%' to '110%'
            left: '-5%', // REDUCED from '-10%' to '-5%'
            top: '-5%', // REDUCED from '-10%' to '-5%'
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
      
      {/* Hotel Title and Location */}
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

      {/* Hotel Information - Bottom Overlay */}
      <View style={tw`absolute bottom-6 left-4 right-4 z-10`}>
        {/* UPDATED: Enhanced Price and Reviews with provider info */}
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
              <Ionicons name="star" size={12} color="#1df9ff" />
              <Text style={tw`text-white text-xs font-semibold ml-1`}>
                {hotel.rating.toFixed(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* UPDATED: Enhanced AI Match Insight with two-stage loading awareness */}
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
            {/* NEW: Loading indicator for insights */}
            {insightsStatus === 'loading' && (
              <View style={tw`ml-2`}>
                <Text style={tw`text-white/60 text-xs`}>Loading...</Text>
              </View>
            )}
          </View>
          <Text style={tw`text-white text-xs leading-4`}>
            {aiInsight}
          </Text>
        
       {/* NEW: Detailed refundable policy info in AI insight section */}
          {/* {refundableDisplay && refundableDisplay.tag && (
            <View style={tw`mt-2 pt-2 border-t border-white/20`}>
              <View style={tw`flex-row items-center`}>
                <Ionicons 
                  name="information-circle" 
                  size={10} 
                  color="#1df9ff" 
                />
                <Text style={tw`text-white/80 text-xs ml-1`}>
                  Policy: {refundableDisplay.tag}
                  {refundableDisplay.tag === 'RFN' && ' (Refundable rates available)'}
                  {refundableDisplay.tag === 'NRFN' && ' (Non-refundable rates only)'}
                </Text>
              </View>
            </View>
          )} */}
        </View>
      </View>
    </View>
  );
};

// UPDATED: Enhanced Location slide with two-stage API location data
// UPDATED: Enhanced Location slide with two-stage API location data - NO KEN BURNS EFFECT
const LocationSlide: React.FC<{ hotel: EnhancedHotel; insightsStatus?: string }> = ({ 
  hotel, 
  insightsStatus = 'complete' 
}) => {
  // REMOVED: All animation references and effects for static image display

  // UPDATED: Use images array for second slide background
  const getLocationImage = () => {
    if (hotel.latitude && hotel.longitude) {
      const zoom = 13;
      const width = 600;
      const height = 400;
      return `https://maps.locationiq.com/v3/staticmap?key=pk.79c544ae745ee83f91a7523c99939210&center=${hotel.latitude},${hotel.longitude}&zoom=${zoom}&size=${width}x${height}&markers=icon:large-red-cutout|${hotel.latitude},${hotel.longitude}`;
    }

    // Fallbacks if coordinates are missing
    if (hotel.images && hotel.images.length > 1) {
      return hotel.images[1];
    }
    return hotel.images?.[0] || hotel.image;
  };

  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      {/* UPDATED: Static image with full coverage and no animations */}
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
      
      {/* UPDATED: Enhanced Location Information using two-stage API data */}
      <View style={tw`absolute bottom-6 left-4 right-4 z-10`}>

        {/* UPDATED: Nearby Attractions using two-stage API data with loading state */}
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
        
        {/* UPDATED: Location Highlight using two-stage API data with loading state */}
        <View style={tw`bg-black/50 p-2.5 border border-white/20 rounded-lg`}>
          <View style={tw`flex-row items-center mb-1`}>
            <Ionicons 
              name={insightsStatus === 'loading' && hotel.locationHighlight?.includes('Analyzing') ? "sync" : "star"} 
              size={12} 
              color="#1df9ff" 
            />
            <Text style={tw`text-white text-xs font-semibold ml-1`}>Location Highlight</Text>
            {insightsStatus === 'loading' && hotel.locationHighlight?.includes('Analyzing') && (
              <Text style={tw`text-white/60 text-xs ml-2`}>Analyzing...</Text>
            )}
          </View>
          <Text style={tw`text-white text-xs leading-4`}>
            {hotel.locationHighlight && !hotel.locationHighlight.includes('Analyzing')
              ? hotel.locationHighlight
              : (hotel.funFacts && hotel.funFacts[0] && !hotel.funFacts[0].includes('Loading')) 
                ? hotel.funFacts[0]
                : insightsStatus === 'loading'
                  ? "Analyzing location advantages..."
                  : `Prime location in ${hotel.city || 'the city'} with easy access to attractions and dining`
            }
          </Text>
        </View>
      </View>
    </View>
  );
};

// UPDATED: Enhanced Amenities & Reviews slide with clean rating grid format
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

  // Parse guest insights to extract ratings
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
      // Parse the clean format from the API
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
      console.warn('Failed to parse ratings:', error);
      return defaultRatings;
    }
  };

  const ratings = parseRatings(hotel.guestInsights);

  // Get rating color based on score using cyan shades
  const getRatingColor = (rating: number): string => {
    if (rating >= 8.0) return "#06B6D4"; // Cyan-500 - Excellent
    if (rating >= 7.0) return "#22D3EE"; // Cyan-400 - Very Good  
    if (rating >= 6.0) return "#67E8F9"; // Cyan-300 - Good
    if (rating >= 5.0) return "#A5F3FC"; // Cyan-200 - Average
    if (rating >= 4.0) return "#CFFAFE"; // Cyan-100 - Below Average
    return "#E0F7FA"; // Very light cyan - Poor
  };

  // Get rating text color for contrast with cyan shades
  const getRatingTextColor = (rating: number): string => {
    return "#FFFFFF"; // Always white text
  };

  // UPDATED: Use images array for third slide background
  const getAmenitiesImage = () => {
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
      
      {/* Guest Ratings Grid */}
      <View style={tw`absolute bottom-6 left-4 right-4 z-10`}>
        
        {/* Fun Facts Header */}
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

        {/* 2x2 Ratings Grid - Compact with Labels to the Right */}
        <View style={tw`gap-1`}>
          {/* Top Row */}
          <View style={tw`flex-row gap-1`}>
            {/* Cleanliness - Top Left */}
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

            {/* Service - Top Right */}
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

          {/* Bottom Row */}
          <View style={tw`flex-row gap-1`}>
            {/* Location - Bottom Left */}
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

            {/* Room Quality - Bottom Right */}
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

// UPDATED: Main component with enhanced two-stage API integration
const SwipeableHotelStoryCard: React.FC<SwipeableHotelStoryCardProps> = ({ 
  hotel, 
  onSave, // Optional, for backward compatibility
  onViewDetails, 
  onHotelPress,
  index,
  totalCount,
  checkInDate,
  checkOutDate,
  adults = 2,
  children = 0,
  // NEW: Two-stage API props
  isInsightsLoading = false,
  insightsStatus = 'complete',
  searchMode = 'two-stage'
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const prevHotelId = useRef(hotel.id);

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

  // UPDATED: Enhanced Google Maps link generation with two-stage API coordinates
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

  // UPDATED: Enhanced View Details handler with two-stage API location data
  const handleViewDetails = async () => {
    try {
      const mapsLink = generateGoogleMapsLink(
        hotel,
        checkInDate,
        checkOutDate,
        adults,
        children
      );

      console.log(`🗺️ Opening Google Maps for: ${hotel.name}`);
      console.log(`🔗 Maps URL: ${mapsLink}`);

      const canOpen = await Linking.canOpenURL(mapsLink);
      
      if (canOpen) {
        await Linking.openURL(mapsLink);
      } else {
        // Enhanced fallback with two-stage API data
        let fallbackQuery = '';
        if (hotel.latitude && hotel.longitude) {
          fallbackQuery = `${hotel.latitude},${hotel.longitude}`;
        } else if (hotel.city && hotel.country) {
          fallbackQuery = encodeURIComponent(`${hotel.name} ${hotel.city} ${hotel.country}`);
        } else {
          fallbackQuery = encodeURIComponent(`${hotel.name} ${hotel.location}`);
        }
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${fallbackQuery}`;
        await Linking.openURL(fallbackUrl);
      }

      onViewDetails?.();

    } catch (error) {
      console.error('Error opening Google Maps:', error);
      
      Alert.alert(
        'Unable to Open Maps',
        'Could not open Google Maps. Please check your internet connection and try again.',
        [
          {
            text: 'OK',
            onPress: () => onViewDetails?.()
          }
        ]
      );
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

  // UPDATED: Handle save action with optional callback for backward compatibility
  const handleSave = () => {
    // The AnimatedHeartButton now handles the cache internally
    // This is just for backward compatibility
    if (onSave) {
      onSave();
    }
  };

  return (
    <View style={tw`bg-white rounded-2xl overflow-hidden shadow-lg`}>
      {/* Hotel Card */}
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handleCardPress}
        style={[
          tw`bg-white overflow-hidden relative rounded-t-2xl`,
          { width: CARD_WIDTH, height: CARD_HEIGHT },
        ]}
      >
        {/* Smooth Story Progress Bar */}
        <StoryProgressBar
          currentSlide={currentSlide}
          totalSlides={3}
          onSlideChange={handleSlideChange}
        />
        
        {/* Left Tap Zone */}
        {currentSlide > 0 && (
          <TouchableOpacity
            style={tw`absolute top-0 left-0 w-40 h-full z-20`}
            onPress={handleLeftTap}
            activeOpacity={0}
          />
        )}
        
        {/* Right Tap Zone */}
        {currentSlide < 2 && (
          <TouchableOpacity
            style={tw`absolute top-0 right-0 w-40 h-full z-20`}
            onPress={handleRightTap}
            activeOpacity={0}
          />
        )}
        
        {/* Navigation Buttons */}
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
        
        {/* UPDATED: Slides with two-stage API data and loading awareness */}
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
      
      {/* UPDATED: Action Section with two-stage API status indicators */}
      <View style={tw`bg-white rounded-b-2xl`}>
        
        {/* NEW: Partial insights indicator */}
        {insightsStatus === 'partial' && !isInsightsLoading && (
          <View style={tw`px-4 py-2 bg-amber-50 border-b border-amber-100`}>
            <View style={tw`flex-row items-center`}>
              <Ionicons name="time" size={14} color="#F59E0B" />
              <Text style={tw`text-amber-600 text-xs font-medium ml-2`}>
                Partial insights loaded - detailed analysis completing...
              </Text>
            </View>
          </View>
        )}
        
        {/* Main Action Row */}
        <View style={tw`flex-row items-center px-4 py-3 gap-3`}>
          {/* UPDATED: Self-contained Animated Heart/Save Button */}
          <AnimatedHeartButton
            hotel={hotel}
            size={28}
          />
          
          {/* View Details Button with enhanced wording */}
          <TouchableOpacity
            style={tw`border border-black/10 flex-1 bg-gray-100 py-3 rounded-lg items-center justify-center ml-2`}
            onPress={handleViewDetails}
            activeOpacity={0.7}
          >
            <View style={tw`flex-row items-center`}>
              <Ionicons name="map" size={16} color="#374151" />
              <Text style={tw`text-gray-800 text-base font-medium ml-2`}>
                View Details
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default SwipeableHotelStoryCard;
export type { Hotel, EnhancedHotel, SwipeableHotelStoryCardProps };