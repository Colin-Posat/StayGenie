// SwipeableHotelStoryCard.tsx - Updated with FavoritesCache integration
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

// UPDATED: Interface to match optimized backend structure
interface Hotel {
  id: number;
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
  
  // AI-powered fields from optimized backend
  aiExcerpt?: string;
  whyItMatches?: string;
  funFacts?: string[];
  aiMatchPercent?: number;
  matchType?: string;
  
  // Enhanced pricing structure from optimized backend
  pricePerNight?: {
    amount: number;
    totalAmount: number;
    currency: string;
    display: string;
    provider: string | null;
    isSupplierPrice: boolean;
  };
  
  // Location and amenity data from optimized backend
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
  isInsightsLoading?: boolean;
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

// UPDATED: Enhanced AI insights using optimized backend data
const generateAIInsight = (hotel: Hotel): string => {
  // Priority 1: Use API-provided AI match explanation
  if (hotel.whyItMatches) {
    return hotel.whyItMatches;
  }
  
  // Priority 2: Use AI excerpt
  if (hotel.aiExcerpt) {
    return hotel.aiExcerpt;
  }

  // Priority 3: Use location highlight from optimized backend
  if (hotel.locationHighlight) {
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

  // Final fallback
  return "Quality hotel choice with excellent amenities and service";
};

// UPDATED: Enhanced review summary using optimized backend guest insights
const generateReviewSummary = (hotel: Hotel, isInsightsLoading: boolean = false): string => {
  // Show loading state for guest insights
  if (isInsightsLoading && (!hotel.guestInsights || hotel.guestInsights.includes('Loading'))) {
    return "🔄 Loading detailed guest insights...";
  }

  // Priority 1: Use optimized backend guest insights
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

// UPDATED: Hotel Overview slide with optimized backend data
const HotelOverviewSlide: React.FC<{ hotel: EnhancedHotel; isInsightsLoading?: boolean }> = ({ 
  hotel, 
  isInsightsLoading = false 
}) => {
  const aiInsight = generateAIInsight(hotel);
  const panAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1.2)).current;

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
          toValue: 1.3,
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1.2,
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
    outputRange: [-15, 15],
  });

  const translateY = panAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 8],
  });

  // UPDATED: Enhanced price display using optimized backend pricing
  const getDisplayPrice = () => {
    if (hotel.pricePerNight) {
      return `${hotel.pricePerNight.currency} ${hotel.pricePerNight.amount}`;
    }
    return `${hotel.price}`;
  };


  // UPDATED: Location display using optimized backend location data
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
            width: '120%',
            height: '120%',
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
              <Ionicons name="checkmark-circle" size={12} color={getRatingColor(hotel.rating)} />
              <Text style={tw`text-white text-xs font-semibold ml-1`}>
                {hotel.rating.toFixed(1)}
              </Text>
              <Text style={tw`text-white/80 text-xs ml-1`}>
                ({hotel.reviews.toLocaleString()})
              </Text>
            </View>
          </View>
        </View>

        {/* UPDATED: Enhanced AI Match Insight with loading awareness */}
        <View style={tw`bg-black/50 p-2.5 rounded-lg border border-white/20`}>
          <View style={tw`flex-row items-center mb-1`}>
            <Ionicons 
              name={isInsightsLoading ? "sync" : "sparkles"} 
              size={12} 
              color="#FFD700" 
            />
            <Text style={tw`text-yellow-400 text-xs font-semibold ml-1`}>
              {hotel.aiMatchPercent 
                ? `AI Match ${hotel.aiMatchPercent}%`
                : 'AI Insight'
              }
            </Text>
          </View>
          <Text style={tw`text-white text-xs leading-4`}>
            {aiInsight}
          </Text>
        </View>
      </View>
    </View>
  );
};

// UPDATED: Enhanced Location slide with optimized backend location data
const LocationSlide: React.FC<{ hotel: EnhancedHotel }> = ({ hotel }) => {
  const panAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1.2)).current;

  useEffect(() => {
    const panningAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(panAnimation, {
          toValue: 1,
          duration: 12000,
          useNativeDriver: true,
        }),
        Animated.timing(panAnimation, {
          toValue: 0,
          duration: 12000,
          useNativeDriver: true,
        }),
      ])
    );

    const scalingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 1.28,
          duration: 15000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1.2,
          duration: 15000,
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
    outputRange: [12, -12],
  });

  const translateY = panAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [6, -6],
  });

  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      <Animated.Image 
        source={{ uri: hotel.mapImage }} 
        style={[
          {
            position: 'absolute',
            width: '120%',
            height: '120%',
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
      
      {/* UPDATED: Enhanced Location Information using optimized backend data */}
      <View style={tw`absolute bottom-6 left-4 right-4 z-10`}>
        {/* Coordinates display (if available) */}
        {hotel.latitude && hotel.longitude && (
          <View style={tw`bg-black/50 p-2.5 rounded-lg border border-white/20 mb-2.5`}>
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="navigate" size={12} color="#60A5FA" />
              <Text style={tw`text-blue-400 text-xs font-semibold ml-1`}>Exact Location</Text>
            </View>
            <Text style={tw`text-white text-xs leading-4`}>
              {hotel.latitude.toFixed(6)}, {hotel.longitude.toFixed(6)}
            </Text>
          </View>
        )}

        {/* UPDATED: Nearby Attractions using optimized backend data */}
        {hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0 && (
          <View style={tw`bg-black/50 p-2.5 rounded-lg border border-white/20 mb-2.5`}>
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="location" size={12} color="#4ECDC4" />
              <Text style={tw`text-cyan-400 text-xs font-semibold ml-1`}>Nearby Attractions</Text>
            </View>
            {hotel.nearbyAttractions.slice(0, 3).map((attraction, index) => (
              <Text key={index} style={tw`text-white text-xs leading-4 ${index === 0 ? '' : 'mt-1'}`}>
                • {attraction}
              </Text>
            ))}
          </View>
        )}
        
        {/* UPDATED: Location Highlight using optimized backend data */}
        <View style={tw`bg-black/50 p-2.5 border border-white/20 rounded-lg`}>
          <View style={tw`flex-row items-center mb-1`}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={tw`text-yellow-400 text-xs font-semibold ml-1`}>Location Highlight</Text>
          </View>
          <Text style={tw`text-white text-xs leading-4`}>
            {hotel.locationHighlight || 
             (hotel.funFacts && hotel.funFacts[0]) || 
             `Prime location in ${hotel.city || 'the city'} with easy access to attractions and dining`}
          </Text>
        </View>

      </View>
    </View>
  );
};

// UPDATED: Enhanced Amenities & Reviews slide with optimized backend sentiment data
const AmenitiesSlide: React.FC<{ hotel: EnhancedHotel; isInsightsLoading?: boolean }> = ({ 
  hotel, 
  isInsightsLoading = false 
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

  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      <Animated.Image 
        source={{ uri: hotel.images[2] }} 
        style={[
          {
            position: 'absolute',
            width: '120%',
            height: '120%',
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
      
      {/* UPDATED: Enhanced Content Information using optimized backend data */}
      <View style={tw`absolute bottom-6 left-4 right-4 z-10`}>

        {/* UPDATED: Enhanced Sentiment Analysis from optimized backend */}
        {hotel.sentimentPros && hotel.sentimentPros.length > 0 && (
          <View style={tw`bg-black/50 p-2.5 rounded-lg border border-white/20 mb-2.5`}>
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="thumbs-up" size={12} color="#10B981" />
              <Text style={tw`text-green-400 text-xs font-semibold ml-1`}>What Guests Love</Text>
            </View>
            {hotel.sentimentPros.slice(0, 2).map((pro, index) => (
              <Text key={index} style={tw`text-white text-xs leading-4 ${index === 0 ? '' : 'mt-1'}`}>
                • {pro}
              </Text>
            ))}
          </View>
        )}


        {/* Fun Facts from optimized backend */}
        {hotel.funFacts && hotel.funFacts.length > 0 && (
          <View style={tw`bg-black/50 p-2.5 rounded-lg border border-white/20 mt-2.5`}>
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="bulb" size={12} color="#F59E0B" />
              <Text style={tw`text-amber-400 text-xs font-semibold ml-1`}>Fun Facts</Text>
            </View>
            {hotel.funFacts.slice(0, 2).map((fact, index) => (
              <Text key={index} style={tw`text-white text-xs leading-4 ${index === 0 ? '' : 'mt-1'}`}>
                • {fact}
              </Text>
            ))}
          </View>
        )}
        
        {/* UPDATED: Guest Insights using optimized backend data with loading state */}
        <View style={tw`bg-black/50 p-2.5 rounded-lg border border-white/20`}>
          <View style={tw`flex-row items-center mb-1`}>
            <Ionicons 
              name={isInsightsLoading ? "sync" : "people"} 
              size={12} 
              color="#FFD700" 
            />
            <Text style={tw`text-yellow-400 text-xs font-semibold ml-1`}>
              Guest Insights
            </Text>
            {isInsightsLoading && (
              <View style={tw`ml-2`}>
                <Text style={tw`text-white/60 text-xs`}>Loading...</Text>
              </View>
            )}
          </View>
          <Text style={tw`text-white text-xs leading-4`}>
            {generateReviewSummary(hotel, isInsightsLoading)}
          </Text>
        </View>
      </View>
    </View>
  );
};

// UPDATED: Main component with enhanced Google Maps integration and removed isCurrentHotelSaved prop
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
  isInsightsLoading = false
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

  // UPDATED: Enhanced Google Maps link generation with optimized backend coordinates
  const generateGoogleMapsLink = (hotel: Hotel, checkin?: Date, checkout?: Date, adults: number = 2, children: number = 0): string => {
    let query = '';
    
    // Priority 1: Use optimized backend coordinates if available
    if (hotel.latitude && hotel.longitude) {
      query = `${hotel.latitude},${hotel.longitude}`;
      console.log(`📍 Using optimized backend coordinates: ${hotel.latitude}, ${hotel.longitude}`);
    } else {
      // Priority 2: Use enhanced location data from optimized backend
      const locationText = hotel.city && hotel.country 
        ? `${hotel.name} ${hotel.city} ${hotel.country}`
        : hotel.fullAddress 
        ? `${hotel.name} ${hotel.fullAddress}`
        : `${hotel.name} ${hotel.location}`;
      query = encodeURIComponent(locationText);
      console.log(`📍 Using location text: ${locationText}`);
    }
    
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

  // UPDATED: Enhanced View Details handler with optimized backend location data
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
        // Enhanced fallback with optimized backend data
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
        
        {/* UPDATED: Slides with enhanced data and loading awareness */}
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
            <HotelOverviewSlide hotel={hotel} isInsightsLoading={isInsightsLoading} />
          </View>
          <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <LocationSlide hotel={hotel} />
          </View>
          <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <AmenitiesSlide hotel={hotel} isInsightsLoading={isInsightsLoading} />
          </View>
        </ScrollView>
      </TouchableOpacity>
      
      {/* UPDATED: Action Section with self-contained heart button */}
      <View style={tw`bg-white rounded-b-2xl`}>
        {/* Insights Loading Indicator */}
        {isInsightsLoading && (
          <View style={tw`px-4 py-2 bg-blue-50 border-b border-blue-100`}>
            <View style={tw`flex-row items-center`}>
              <Ionicons name="sync" size={14} color="#3B82F6" />
              <Text style={tw`text-blue-600 text-xs font-medium ml-2`}>
                Loading enhanced guest insights...
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