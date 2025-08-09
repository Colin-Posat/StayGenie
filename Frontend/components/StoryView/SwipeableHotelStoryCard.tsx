// SwipeableHotelStoryCard.tsx - Updated with Deep Link Button
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
import FavoritesCache from '../../utils/FavoritesCache';
import { formatLocationDisplay, getCountryName } from '../../utils/countryMapping';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 40;
const CARD_HEIGHT = screenHeight * 0.55;

// Base deep link URL
const DEEP_LINK_BASE_URL = 'https://colin-posat-1t6gl.nuitee.link';

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

  // Refundable policy fields
  isRefundable?: boolean;
  refundableTag?: string | null;
  refundableInfo?: string;

  // NEW: Fields needed for deep linking
  placeId?: string; // Google Place ID for destination
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
  // NEW: Props for deep linking
  placeId?: string; // Google Place ID for the destination
  occupancies?: any[]; // Room and guest configuration
}

// NEW: Helper function to generate hotel deep link URL
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

  // Add place ID if available
  if (placeId) {
    params.append('placeId', placeId);
  }

  // Add dates if available
  if (checkInDate) {
    params.append('checkin', checkInDate.toISOString().split('T')[0]);
  }
  if (checkOutDate) {
    params.append('checkout', checkOutDate.toISOString().split('T')[0]);
  }

  // Add occupancies - encode room and guest configuration
  if (occupancies && occupancies.length > 0) {
    try {
      const occupanciesString = btoa(JSON.stringify(occupancies));
      params.append('occupancies', occupanciesString);
    } catch (error) {
      console.warn('Failed to encode occupancies:', error);
    }
  } else if (adults || children) {
    // Create default occupancy structure
    const defaultOccupancy = [{ adults, children: children > 0 ? [children] : [] }];
    try {
      const occupanciesString = btoa(JSON.stringify(defaultOccupancy));
      params.append('occupancies', occupanciesString);
    } catch (error) {
      console.warn('Failed to encode default occupancy:', error);
    }
  }

  // Add meal plan preferences if hotel has them
  if (hotel.tags?.includes('All Inclusive')) {
    params.append('needAllInclusive', '1');
  }
  if (hotel.tags?.includes('Breakfast Included')) {
    params.append('needBreakfast', '1');
  }

  // Add free cancellation if hotel supports it
  if (hotel.isRefundable) {
    params.append('needFreeCancellation', '1');
  }

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
};

// Animated Heart Button Component with cache integration
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
      const newStatus = await favoritesCache.toggleFavorite(hotel);
      setIsLiked(newStatus);
      
      if (newStatus) {
        console.log(`❤️ Added "${hotel.name}" to favorites`);
      } else {
        console.log(`💔 Removed "${hotel.name}" from favorites`);
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
    return "Loading AI insights..."; // Simple loading text
  }
  
  if (insightsStatus === 'partial') {
    return "✨ Generating detailed insights..."; // Simple partial text
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
}> = ({ 
  hotel, 
  insightsStatus = 'complete',
  searchMode = 'two-stage'
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

  // NEW: Handler for deep link button
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

      console.log(`🔗 Opening hotel deep link: ${deepLinkUrl}`);

      const canOpen = await Linking.canOpenURL(deepLinkUrl);
      
      if (canOpen) {
        await Linking.openURL(deepLinkUrl);
      } else {
        Alert.alert(
          'Unable to Open Link',
          'Could not open the hotel booking page. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening deep link:', error);
      Alert.alert(
        'Error',
        'Failed to open hotel booking page. Please try again.',
        [{ text: 'OK' }]
      );
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

  const handleSave = () => {
    if (onSave) {
      onSave();
    }
  };

  return (
    <View style={tw`bg-white rounded-2xl overflow-hidden shadow-lg`}>
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
      
      {/* UPDATED: Action Section with new deep link button */}
      <View style={tw`bg-white rounded-b-2xl`}>
        
        {/* UPDATED: Three-button layout with deep link button */}
        <View style={tw`flex-row items-center px-4 py-3 gap-2`}>
          {/* Heart/Save Button */}
          <AnimatedHeartButton
  hotel={hotel}
  size={24}
/>
          
          {/* View Details Button - Maps */}
          <TouchableOpacity
            style={tw`border border-black/10 flex-1 bg-gray-100 py-3 rounded-lg items-center justify-center`}
            onPress={handleViewDetails}
            activeOpacity={0.7}
          >
            <View style={tw`flex-row items-center`}>
              <Ionicons name="map" size={16} color="#374151" />
              <Text style={tw`text-gray-800 text-sm font-medium ml-1.5`}>
                Details
              </Text>
            </View>
          </TouchableOpacity>

          {/* NEW: Book Now Button - Deep Link */}
<TouchableOpacity
  style={[tw`border border-black/10 flex-1 py-3 rounded-lg items-center justify-center  bg-gray-100`]}
  onPress={handleDeepLink}
  activeOpacity={0.7}
>
  <View style={tw`flex-row items-center`}>
    <Image 
      source={require('../../assets/images/logo.png')} 
      style={{ width: 16, height: 16 }} 
      resizeMode="contain"
    />
    <Text style={tw`text-black text-sm font-medium ml-1.5`}>
      Book Now
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