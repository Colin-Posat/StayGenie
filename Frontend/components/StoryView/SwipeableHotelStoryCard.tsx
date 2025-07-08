// SwipeableHotelStoryCard.tsx - Enhanced with guest insights and review data from API
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
  pricePerNight?: {
    display: string;
    min: number;
    max: number;
    currency: string;
  };
  bestOffer?: {
    price: {
      currency: string;
      total: string;
    };
  };
  guestInsights?: string; // New field from API
}

interface EnhancedHotel extends Hotel {
  images: string[];
  mapImage: string;
  nearbyAttractions: string[];
}

interface SwipeableHotelStoryCardProps {
  hotel: EnhancedHotel;
  onSave: () => void;
  onViewDetails: () => void;
  onHotelPress: () => void;
  isCurrentHotelSaved: boolean;
  index: number;
  totalCount: number;
  // Additional props for Google Maps deep link (from HotelCard)
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
    // Heart scale animation
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

    // Bounce animation for the button
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
      {/* Main Button */}
      <Animated.View
        style={{
          transform: [{ scale: bounceAnim }],
        }}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.6}
          style={tw`border border-black/10 bg-gray-100 py-2.5 px-4 rounded-lg items-center justify-center`}
        >
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
            }}
          >
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

// Enhanced AI insights generator - now uses API data including guest insights
const generateAIInsight = (hotel: Hotel): string => {
  // Use API-provided AI insight first
  if (hotel.whyItMatches) {
    return hotel.whyItMatches;
  }
  
  if (hotel.aiExcerpt) {
    return hotel.aiExcerpt;
  }

  // Fallback to tag-based insights
  if (hotel.tags.includes('Business center')) {
    return "Perfect for business travelers with excellent transit access and modern amenities";
  } else if (hotel.tags.includes('Family-friendly')) {
    return "Ideal family choice with spacious rooms and kid-friendly amenities nearby";
  } else if (hotel.tags.includes('Luxury')) {
    return "Premium experience with top-tier amenities and exceptional service";
  } else if (hotel.location.includes('Downtown')) {
    return "Prime downtown location with easy access to attractions and dining";
  } else if (hotel.location.includes('Arts')) {
    return "Cultural hub location perfect for art lovers and creative experiences";
  } else {
    return "Great value option with solid amenities and convenient location";
  }
};

// Enhanced review summary generator using API guest insights
const generateReviewSummary = (hotel: Hotel): string => {
  // Use API-provided guest insights first
  if (hotel.guestInsights) {
    return hotel.guestInsights;
  }

  // Fallback to rating-based summaries
  const rating = hotel.rating;
  const reviewCount = hotel.reviews;
  
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
  // Create animated values for each progress bar
  const progressValues = useRef(
    Array.from({ length: totalSlides }, () => new Animated.Value(0))
  ).current;

  // Create opacity values for smooth transitions
  const opacityValues = useRef(
    Array.from({ length: totalSlides }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    // Animate all progress bars
    const animations = progressValues.map((value, index) => {
      if (index < currentSlide) {
        // Completed slides
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
        // Current slide
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
        // Future slides
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

    // Run all animations in parallel
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
                transform: [
                  {
                    scaleX: progressValues[index]
                  }
                ],
                transformOrigin: 'left'
              }
            ]}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Hotel Title Component for top left
const HotelTitleOverlay: React.FC<{ hotel: EnhancedHotel }> = ({ hotel }) => {
  return (
    <View style={tw`absolute top-14 left-4 right-16 z-15`}>
      <View style={tw`bg-black/30 px-2.5 py-1.5 rounded-lg self-start`}>
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
    </View>
  );
};

// Slide 1: Hotel Overview with panning effect - now uses API data
const HotelOverviewSlide: React.FC<{ hotel: EnhancedHotel }> = ({ hotel }) => {
  const aiInsight = generateAIInsight(hotel); // Uses API data when available
  const panAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1.2)).current;

  useEffect(() => {
    // Start panning animation
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

    // Start subtle scale animation
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

  // Get display price - matches HotelCard logic
  const getDisplayPrice = () => {
    if (hotel.pricePerNight) {
      return `$${hotel.pricePerNight.min}`;
    }
    return `$${hotel.price}`;
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
      
      {/* Subtle gradient overlay */}
      <View style={tw`absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-black/70 to-transparent z-1`} />
      
      {/* Hotel Title and Location - Top Left */}
      <View style={tw`absolute top-10 left-4 z-10`}>
        <View style={tw`bg-black/30 border border-white/20 px-2.5 py-1.5 rounded-lg self-start`}>
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
        
        {/* Location under hotel name */}
        <View style={tw`flex-row items-center mt-1.5`}>
          <View style={tw`bg-black/30 border border-white/20 px-2 py-1 rounded-md flex-row items-center`}>
            <Ionicons name="location" size={12} color="#FFFFFF" />
            <Text style={[
              tw`text-white text-xs font-medium ml-1`,
              { textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }
            ]}>
              {hotel.location}
            </Text>
          </View>
        </View>
      </View>

      {/* Hotel Information - Bottom Overlay */}
      <View style={tw`absolute bottom-6 left-4 right-4 z-10`}>
        {/* Price and Reviews - Top row */}
        <View style={tw`flex-row items-end gap-2 mb-2.5`}>
          {/* Price */}
          <View style={tw`bg-black/60 border border-white/20 px-3 py-1.5 rounded-lg`}>
            <View style={tw`flex-row items-baseline`}>
              <Text style={tw`text-xl font-bold text-white`}>
                {getDisplayPrice()}
              </Text>
              <Text style={tw`text-white/80 text-xs ml-1`}>/night</Text>
            </View>
          </View>
          
          {/* Reviews - Enhanced with proper review count formatting */}
          <View style={tw`bg-black/60 border border-white/20 px-3 py-1.5 rounded-lg`}>
            <View style={tw`flex-row items-center`}>
              <Ionicons name="star" size={12} color="#FFB800" />
              <Text style={tw`text-white text-xs font-semibold ml-1`}>
                {hotel.rating}
              </Text>
              <Text style={tw`text-white/80 text-xs ml-1`}>
                ({hotel.reviews.toLocaleString()})
              </Text>
            </View>
          </View>
        </View>

        {/* AI Match Insight - Uses API data */}
        <View style={tw`bg-black/50 p-2.5 rounded-lg border border-white/20`}>
          <View style={tw`flex-row items-center mb-1`}>
            <Ionicons name="sparkles" size={12} color="#FFD700" />
            <Text style={tw`text-yellow-400 text-xs font-semibold ml-1`}>
              {hotel.aiMatchPercent ? `AI Match ${hotel.aiMatchPercent}%` : 'AI Match'}
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

// Updated LocationSlide component with matching overlay styling
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
      
      {/* Subtle gradient overlay */}
      <View style={tw`absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-black/70 to-transparent z-1`} />
      
      {/* Location Information */}
      <View style={tw`absolute bottom-6 left-4 right-4 z-10`}>
        {/* Nearby Attractions - matching first slide's bg-black/60 style */}
        <View style={tw`bg-black/30 p-2.5 rounded-lg border border-white/20 mb-2.5`}>
          <View style={tw`flex-row items-center mb-1`}>
            <Ionicons name="location" size={12} color="#4ECDC4" />
            <Text style={tw`text-cyan-400 text-xs font-semibold ml-1`}>Nearby</Text>
          </View>
          {hotel.nearbyAttractions.slice(0, 2).map((attraction, index) => (
            <Text key={index} style={tw`text-white text-xs leading-4 ${index === 0 ? '' : 'mt-1'}`}>
              • {attraction}
            </Text>
          ))}
        </View>
        
        {/* Location Highlight - matching first slide's bg-black/50 style */}
        {hotel.funFacts && hotel.funFacts.length > 0 ? (
          <View style={tw`bg-black/30 p-2.5 border border-white/20 rounded-lg `}>
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={tw`text-yellow-400 text-xs font-semibold ml-1`}>Location Highlight</Text>
            </View>
            <Text style={tw`text-white text-xs leading-4`}>{hotel.funFacts[0]}</Text>
          </View>
        ) : (
          <View style={tw`bg-black/30 p-2.5 rounded-lg border border-white/20 border border-white/20`}>
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={tw`text-yellow-400 text-xs font-semibold ml-1`}>Area Highlight</Text>
            </View>
            <Text style={tw`text-white text-xs leading-4`}>Prime location with easy access to local attractions and dining</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Enhanced Amenities & Reviews slide - now uses API guest insights
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
      
      {/* Subtle gradient overlay */}
      <View style={tw`absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-black/70 to-transparent z-1`} />
      
      {/* Content Information */}
      <View style={tw`absolute bottom-6 left-4 right-4 z-10`}>
        {/* Top Amenities - Small section like second slide */}
        <View style={tw`bg-black/50 p-2.5 rounded-lg border border-white/20 mb-2.5`}>
          <View style={tw`flex-row flex-wrap gap-1.5`}>
            {hotel.features.slice(0, 3).map((feature, index) => (
              <Text key={index} style={tw`text-white text-xs leading-4`}>
                • {feature}
              </Text>
            ))}
          </View>
        </View>
        
        {/* Enhanced Reviews Section - Uses API guest insights */}
        <View style={tw`bg-black/50 p-2.5 rounded-lg border border-white/20`}>
          <View style={tw`flex-row items-center mb-1`}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={tw`text-yellow-400 text-xs font-semibold ml-1`}>
              Guest Insights ({hotel.reviews.toLocaleString()} reviews)
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

// Main Swipeable Hotel Story Card Component - now with enhanced guest insights
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

  // Reset slide to 0 when hotel changes
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

  // Google Maps deep link generation (copied from HotelCard)
  const generateGoogleMapsLink = (hotelName: string, location: string, checkin?: Date, checkout?: Date, adults: number = 2, children: number = 0): string => {
    // Clean and encode the search query
    const query = encodeURIComponent(`${hotelName} ${location}`);
    
    // Build base URL with hotel search parameters
    let url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    
    // Add hotel booking parameters if dates are provided
    if (checkin && checkout) {
      const checkinStr = checkin.toISOString().split('T')[0]; // YYYY-MM-DD format
      const checkoutStr = checkout.toISOString().split('T')[0]; // YYYY-MM-DD format
      
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
      // Generate the Google Maps deep link
      const mapsLink = generateGoogleMapsLink(
        hotel.name,
        hotel.location,
        checkInDate,
        checkOutDate,
        adults,
        children
      );

      console.log(`🗺️ Opening Google Maps for: ${hotel.name}`);
      console.log(`📍 Location: ${hotel.location}`);
      console.log(`🔗 Maps URL: ${mapsLink}`);

      // Check if the URL can be opened
      const canOpen = await Linking.canOpenURL(mapsLink);
      
      if (canOpen) {
        // Open the Google Maps link
        await Linking.openURL(mapsLink);
      } else {
        // Fallback to basic Google Maps search if the enhanced URL doesn't work
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotel.name} ${hotel.location}`)}`;
        await Linking.openURL(fallbackUrl);
      }

      // Call the original onViewDetails callback if provided
      onViewDetails?.();

    } catch (error) {
      console.error('Error opening Google Maps:', error);
      
      // Show user-friendly error message
      Alert.alert(
        'Unable to Open Maps',
        'Could not open Google Maps. Please check your internet connection and try again.',
        [
          {
            text: 'OK',
            onPress: () => onViewDetails?.() // Still call the callback
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
        
        {/* Left Tap Zone - Full height since no buttons are inside */}
        {currentSlide > 0 && (
          <TouchableOpacity
            style={tw`absolute top-0 left-0 w-40 h-full z-20`}
            onPress={handleLeftTap}
            activeOpacity={0}
          />
        )}
        
        {/* Right Tap Zone - Full height since no buttons are inside */}
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
      
      {/* Simplified Instagram-style Action Section with Animated Heart Button */}
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
export type { Hotel, EnhancedHotel, SwipeableHotelStoryCardProps };