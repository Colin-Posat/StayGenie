// SwipeableHotelStoryCard.tsx - Updated with enhanced pricing structure
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 40;
const CARD_HEIGHT = screenHeight * 0.55;

// Updated interfaces to match the enhanced API data structure
interface SentimentCategory {
  name: string;
  rating: number;
  description: string;
}

interface SentimentAnalysis {
  cons: string[];
  pros: string[];
  categories: SentimentCategory[];
}

interface HotelSentimentData {
  sentiment_analysis: SentimentAnalysis;
  sentiment_updated_at: string;
}

// UPDATED: Enhanced Hotel interface with new pricing structure
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
  aiExcerpt?: string;
  whyItMatches?: string;
  funFacts?: string[];
  aiMatchPercent?: number;
  
  // UPDATED: Enhanced pricing structure to match HomeScreen
  pricePerNight?: {
    amount: number;
    totalAmount: number;
    currency: string;
    display: string;
    provider: string | null;
    isSupplierPrice: boolean;
  };
  
  // NEW: Additional pricing fields
  suggestedPrice?: {
    amount: number;
    currency: string;
    display: string;
  };
  priceProvider?: string | null;
  
  roomTypes?: any[];
  guestInsights?: string;
  // NEW ENHANCED FIELDS FROM API
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  topAmenities?: string[];
  nearbyAttractions?: string[];
  locationHighlight?: string;
  matchType?: string;
  hasAvailability?: boolean;
  totalRooms?: number;
  sentimentData?: HotelSentimentData | null;
  sentimentPros?: string[];
  sentimentCons?: string[];
  topSentimentCategories?: SentimentCategory[];
  fullDescription?: string;
  fullAddress?: string;
}

interface EnhancedHotel extends Hotel {
  images: string[];
  mapImage: string;
}

interface SwipeableHotelStoryCardProps {
  hotel: EnhancedHotel;
  onSave: () => void;
  onViewDetails: () => void;
  onHotelPress: () => void;
  isCurrentHotelSaved: boolean;
  index: number;
  totalCount: number;
  checkInDate?: Date;
  checkOutDate?: Date;
  adults?: number;
  children?: number;
}

// Animated Heart Button Component
interface AnimatedHeartButtonProps {
  isLiked: boolean;
  onPress: () => void;
  size?: number;
}

const AnimatedHeartButton: React.FC<AnimatedHeartButtonProps> = ({ isLiked, onPress, size = 28 }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

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

  const handlePress = () => {
    animateHeart();
    onPress();
  };

  return (
    <View style={tw`relative`}>
      <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.6}
          style={tw`border border-black/10 bg-gray-100 py-2.5 px-4 rounded-lg items-center justify-center`}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={size}
              color={isLiked ? "#FF3040" : "#262626"}
            />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const getRatingColor = (rating: number): string => {
  // Normalize rating from 0-10 scale to 0-1 scale
  const normalizedRating = Math.max(0, Math.min(10, rating)) / 10;
  
  if (normalizedRating >= 0.8) return "#10B981"; // Green (8-10)
  if (normalizedRating >= 0.6) return "#84CC16"; // Light green (6-8)
  if (normalizedRating >= 0.4) return "#EAB308"; // Yellow (4-6)
  if (normalizedRating >= 0.2) return "#F97316"; // Orange (2-4)
  return "#EF4444"; // Red (0-2)
};

// Enhanced AI insights using API data
const generateAIInsight = (hotel: Hotel): string => {
  // Use API-provided AI insight first
  if (hotel.whyItMatches) {
    return hotel.whyItMatches;
  }
  
  if (hotel.aiExcerpt) {
    return hotel.aiExcerpt;
  }

  // Use location highlight if available
  if (hotel.locationHighlight) {
    return hotel.locationHighlight;
  }

  // Use full description excerpt
  if (hotel.fullDescription) {
    return hotel.fullDescription.length > 120 
      ? hotel.fullDescription.substring(0, 120) + "..."
      : hotel.fullDescription;
  }

  // Fallback based on match type
  const matchType = hotel.matchType;
  if (matchType === 'perfect') {
    return "Exceptional match with all your preferences and premium amenities";
  } else if (matchType === 'excellent') {
    return "Outstanding choice with great location and top-rated features";
  } else if (matchType === 'good') {
    return "Solid option with good value and convenient location";
  }

  // Final fallback
  return "Great hotel choice with quality amenities and service";
};

// Enhanced review summary using API guest insights and sentiment data
const generateReviewSummary = (hotel: Hotel): string => {
  // Use API-provided guest insights first
  if (hotel.guestInsights) {
    return hotel.guestInsights;
  }

  // Use sentiment data if available
  if (hotel.sentimentPros && hotel.sentimentPros.length > 0) {
    const topPros = hotel.sentimentPros.slice(0, 2).join(' and ');
    let summary = `Guests particularly love the ${topPros}.`;
    
    if (hotel.sentimentCons && hotel.sentimentCons.length > 0) {
      summary += ` Some mention ${hotel.sentimentCons[0]} as an area for improvement.`;
    }
    
    return summary;
  }

  // Fallback to rating-based summaries
  const rating = hotel.rating;
  
  if (rating >= 4.5) {
    return "Guests consistently praise the exceptional service, prime location, and outstanding amenities. Many highlight the comfortable rooms and friendly staff.";
  } else if (rating >= 4.0) {
    return "Travelers appreciate the good value, convenient location, and solid amenities. Most guests would recommend this hotel to others.";
  } else if (rating >= 3.5) {
    return "Mixed reviews with guests enjoying the location and basic amenities. Some mention areas for improvement in service and facilities.";
  } else {
    return "Budget-friendly option with basic amenities. Guests appreciate the affordable rates and convenient location.";
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

// Slide 1: Hotel Overview with enhanced API data
const HotelOverviewSlide: React.FC<{ hotel: EnhancedHotel }> = ({ hotel }) => {
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

  // UPDATED: Enhanced display price logic with new pricing structure
  const getDisplayPrice = () => {
    // Use suggested price if available
    if (hotel.suggestedPrice) {
      return `${hotel.suggestedPrice.currency} ${hotel.suggestedPrice.amount}`;
    }
    // Fall back to pricePerNight
    if (hotel.pricePerNight) {
      return `${hotel.pricePerNight.currency} ${hotel.pricePerNight.amount}`;
    }
    // Final fallback
    return `$${hotel.price}`;
  };

  // UPDATED: Enhanced provider display
  const getPriceProvider = () => {
    if (hotel.priceProvider) {
      return hotel.priceProvider;
    }
    if (hotel.pricePerNight?.provider) {
      return hotel.pricePerNight.provider;
    }
    return '/night';
  };

  // Get location display - use enhanced location data
  const getLocationDisplay = () => {
    if (hotel.city && hotel.country) {
      return `${hotel.city}, ${hotel.country}`;
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
          <View style={tw`bg-black/60 border border-white/20 px-3 py-1.5 rounded-lg`}>
            <View style={tw`flex-row items-baseline`}>
              <Text style={tw`text-xl font-bold text-white`}>
                {getDisplayPrice()}
              </Text>
              <Text style={tw`text-white/80 text-xs ml-1`}>
                /night
              </Text>
            </View>
            {/* NEW: Show provider info if available */}

          </View>
          
          <View style={tw`bg-black/60 border border-white/20 px-3 py-1.5 rounded-lg`}>
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

        {/* Enhanced AI Match Insight */}
        <View style={tw`bg-black/50 p-2.5 rounded-lg border border-white/20`}>
          <View style={tw`flex-row items-center mb-1`}>
            <Ionicons name="sparkles" size={12} color="#FFD700" />
            <Text style={tw`text-yellow-400 text-xs font-semibold ml-1`}>
              {hotel.aiMatchPercent ? `AI Match ${hotel.aiMatchPercent}%` : 'AI Insight'}
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

// Enhanced LocationSlide with API location data
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
      
      {/* Enhanced Location Information */}
      <View style={tw`absolute bottom-6 left-4 right-4 z-10`}>

        {/* Nearby Attractions using API data */}
        {hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0 && (
          <View style={tw`bg-black/30 p-2.5 rounded-lg border border-white/20 mb-2.5`}>
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="location" size={12} color="#4ECDC4" />
              <Text style={tw`text-cyan-400 text-xs font-semibold ml-1`}>Nearby Attractions</Text>
            </View>
            {hotel.nearbyAttractions.slice(0, 2).map((attraction, index) => (
              <Text key={index} style={tw`text-white text-xs leading-4 ${index === 0 ? '' : 'mt-1'}`}>
                • {attraction}
              </Text>
            ))}
          </View>
        )}
        
        {/* Location Highlight using API data */}
        <View style={tw`bg-black/30 p-2.5 border border-white/20 rounded-lg`}>
          <View style={tw`flex-row items-center mb-1`}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={tw`text-yellow-400 text-xs font-semibold ml-1`}>Location Highlight</Text>
          </View>
          <Text style={tw`text-white text-xs leading-4`}>
            {hotel.locationHighlight || 
             (hotel.funFacts && hotel.funFacts[0]) || 
             "Prime location with easy access to local attractions and dining"}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Enhanced Amenities & Reviews slide with API sentiment data
const AmenitiesSlide: React.FC<{ hotel: EnhancedHotel }> = ({ hotel }) => {
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
      
      {/* Enhanced Content Information */}
      <View style={tw`absolute bottom-6 left-4 right-4 z-10`}>

        {/* Enhanced Sentiment Analysis */}
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

        {/* Sentiment Categories */}
        {hotel.topSentimentCategories && hotel.topSentimentCategories.length > 0 && (
          <View style={tw`bg-black/50 p-2.5 rounded-lg border border-white/20 mb-2.5`}>
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="analytics" size={12} color="#8B5CF6" />
              <Text style={tw`text-purple-400 text-xs font-semibold ml-1`}>Top Rated Aspects</Text>
            </View>
            {hotel.topSentimentCategories.slice(0, 2).map((category, index) => (
              <Text key={index} style={tw`text-white text-xs leading-4 ${index === 0 ? '' : 'mt-1'}`}>
                • {category.name}: {category.rating}/10
              </Text>
            ))}
          </View>
        )}
        
        {/* Guest Insights using API data */}
        <View style={tw`bg-black/50 p-2.5 rounded-lg border border-white/20`}>
          <View style={tw`flex-row items-center mb-1`}>
            <Ionicons name="people" size={12} color="#FFD700" />
            <Text style={tw`text-yellow-400 text-xs font-semibold ml-1`}>
              Guest Insights
            </Text>
          </View>
          <Text style={tw`text-white text-xs leading-4`}>
            {generateReviewSummary(hotel)}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Main component with enhanced Google Maps integration
const SwipeableHotelStoryCard: React.FC<SwipeableHotelStoryCardProps> = ({ 
  hotel, 
  onSave, 
  onViewDetails, 
  onHotelPress,
  isCurrentHotelSaved,
  index,
  totalCount,
  checkInDate,
  checkOutDate,
  adults = 2,
  children = 0
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

  // Enhanced Google Maps link generation with coordinates
  const generateGoogleMapsLink = (hotel: Hotel, checkin?: Date, checkout?: Date, adults: number = 2, children: number = 0): string => {
    let query = '';
    
    // Use coordinates if available for more precise location
    if (hotel.latitude && hotel.longitude) {
      query = `${hotel.latitude},${hotel.longitude}`;
    } else {
      // Fallback to name and location
      const locationText = hotel.city && hotel.country 
        ? `${hotel.name} ${hotel.city} ${hotel.country}`
        : `${hotel.name} ${hotel.location}`;
      query = encodeURIComponent(locationText);
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

  // Enhanced View Details handler with Google Maps integration
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
      if (hotel.latitude && hotel.longitude) {
        console.log(`📍 Coordinates: ${hotel.latitude}, ${hotel.longitude}`);
      } else {
        console.log(`📍 Location: ${hotel.location}`);
      }
      console.log(`🔗 Maps URL: ${mapsLink}`);

      const canOpen = await Linking.canOpenURL(mapsLink);
      
      if (canOpen) {
        await Linking.openURL(mapsLink);
      } else {
        // Enhanced fallback with coordinates
        let fallbackQuery = '';
        if (hotel.latitude && hotel.longitude) {
          fallbackQuery = `${hotel.latitude},${hotel.longitude}`;
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
        
        {/* Slides */}
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
            <HotelOverviewSlide hotel={hotel} />
          </View>
          <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <LocationSlide hotel={hotel} />
          </View>
          <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <AmenitiesSlide hotel={hotel} />
          </View>
        </ScrollView>
      </TouchableOpacity>
      
      {/* Action Section */}
      <View style={tw`bg-white rounded-b-2xl`}>
        {/* Main Action Row */}
        <View style={tw`flex-row items-center px-4 py-3 gap-3`}>
          {/* Animated Heart/Save Button */}
          <AnimatedHeartButton
            isLiked={isCurrentHotelSaved}
            onPress={onSave}
            size={28}
          />
          
          {/* View Details Button */}
          <TouchableOpacity
            style={tw`border border-black/10 flex-1 bg-gray-100 py-3 rounded-lg items-center justify-center ml-2`}
            onPress={handleViewDetails}
            activeOpacity={0.7}
          >
            <Text style={tw`text-gray-800 text-base font-medium`}>
              View Details
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default SwipeableHotelStoryCard;
export type { Hotel, EnhancedHotel, SwipeableHotelStoryCardProps, SentimentCategory, SentimentAnalysis, HotelSentimentData };