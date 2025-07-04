// SwipeableHotelStoryCard.tsx - Updated with Google Maps deep linking and API data integration
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
const CARD_HEIGHT = screenHeight * 0.65;

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

// Generate AI insights based on hotel characteristics - now uses API data if available
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
      
      {/* Hotel Information - Bottom Overlay */}
      <View style={tw`absolute bottom-20 left-4 right-4 z-10`}>
        {/* Hotel Name and Rating */}
        <View style={tw`mb-3`}>
          <Text style={[
            tw`text-2xl font-bold text-white mb-2`, 
            { textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }
          ]}>
            {hotel.name}
          </Text>
          
          <View style={tw`flex-row items-center justify-between mb-3`}>
            {/* Rating */}
            <View style={tw`flex-row items-center bg-black/40 px-3 py-1.5 rounded-lg`}>
              <Ionicons name="star" size={16} color="#FFB800" />
              <Text style={tw`text-white text-sm font-semibold ml-1`}>
                {hotel.rating}
              </Text>
              <Text style={tw`text-white/80 text-xs ml-1`}>
                ({hotel.reviews.toLocaleString()})
              </Text>
            </View>
            
            {/* Price */}
            <View style={tw`flex-row items-baseline`}>
              <Text style={[
                tw`text-3xl font-bold text-white`, 
                { textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }
              ]}>
                {getDisplayPrice()}
              </Text>
              <Text style={tw`text-white/80 text-sm ml-1`}>/night</Text>
            </View>
          </View>
        </View>
        
        {/* AI Match Insight - Uses API data */}
        <View style={tw`bg-black/50 p-3 rounded-lg border border-white/20`}>
          <View style={tw`flex-row items-center mb-1.5`}>
            <Ionicons name="sparkles" size={14} color="#FFD700" />
            <Text style={tw`text-yellow-400 text-xs font-semibold ml-1`}>
              {hotel.aiMatchPercent ? `AI Match ${hotel.aiMatchPercent}%` : 'AI Match'}
            </Text>
          </View>
          <Text style={tw`text-white text-sm leading-5`}>
            {aiInsight}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Slide 2: Location - enhanced with API data
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
      <View style={tw`absolute bottom-24 left-4 right-4 z-10`}>
        {/* Location Header */}
        <View style={tw`mb-3`}>
          <View style={tw`flex-row items-center mb-2`}>
            <Ionicons name="location" size={16} color="#FF6B6B" />
            <Text style={tw`text-red-400 text-sm font-semibold ml-1`}>
              {hotel.location}
            </Text>
          </View>
          <Text style={[
            tw`text-2xl font-bold text-white`, 
            { textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }
          ]}>
            Location
          </Text>
        </View>
        
        {/* Transit Distance */}
        <View style={tw`flex-row items-center bg-black/40 px-3 py-2 rounded-lg mb-3`}>
          <Ionicons name="walk" size={16} color="#4ECDC4" />
          <Text style={tw`text-white text-sm font-medium ml-2`}>
            <Text style={tw`font-bold`}>{hotel.transitDistance}</Text> to transit
          </Text>
        </View>
        
        {/* Fun Facts - Uses API data if available */}
        {hotel.funFacts && hotel.funFacts.length > 0 ? (
          <View style={tw`bg-black/50 p-3 rounded-lg border border-white/20`}>
            <Text style={tw`text-white text-sm font-semibold mb-2`}>Fun Facts</Text>
            {hotel.funFacts.slice(0, 3).map((fact, index) => (
              <View key={index} style={tw`flex-row items-start mb-1`}>
                <View style={tw`w-1 h-1 rounded-full bg-yellow-400 mr-2 mt-2`} />
                <Text style={tw`text-white/90 text-sm flex-1`}>{fact}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={tw`bg-black/50 p-3 rounded-lg border border-white/20`}>
            <Text style={tw`text-white text-sm font-semibold mb-2`}>Nearby</Text>
            {hotel.nearbyAttractions.slice(0, 3).map((attraction, index) => (
              <View key={index} style={tw`flex-row items-center mb-1`}>
                <View style={tw`w-1 h-1 rounded-full bg-white/60 mr-2`} />
                <Text style={tw`text-white/90 text-sm`}>{attraction}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

// Slide 3: Amenities & Features - enhanced with API data
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
      
      {/* Amenities Information */}
      <View style={tw`absolute bottom-24 left-4 right-4 z-10`}>
        {/* Amenities Header */}
        <View style={tw`mb-3`}>
          <View style={tw`flex-row items-center mb-2`}>
            <Ionicons name="checkmark-circle" size={16} color="#00C851" />
            <Text style={tw`text-green-400 text-sm font-semibold ml-1`}>
              Included
            </Text>
          </View>
          <Text style={[
            tw`text-2xl font-bold text-white`, 
            { textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }
          ]}>
            Amenities
          </Text>
        </View>
        
        {/* Features Grid */}
        <View style={tw`bg-black/50 p-3 rounded-lg border border-white/20 mb-3`}>
          <View style={tw`flex-row flex-wrap gap-2`}>
            {hotel.features.map((feature, index) => (
              <View key={index} style={tw`flex-row items-center bg-white/20 px-2.5 py-1.5 rounded-lg`}>
                <Ionicons name="checkmark" size={12} color="#00C851" />
                <Text style={tw`text-white text-xs font-medium ml-1`}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* Tags - What it's perfect for */}
        <View style={tw`bg-black/50 p-3 rounded-lg border border-white/20`}>
          <Text style={tw`text-white text-sm font-semibold mb-2`}>Perfect For</Text>
          <View style={tw`flex-row flex-wrap gap-1.5`}>
            {hotel.tags.map((tag, index) => (
              <View key={index} style={tw`bg-white/20 px-2.5 py-1 rounded-lg`}>
                <Text style={tw`text-white text-xs font-medium`}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

// Main Swipeable Hotel Story Card Component - now with Google Maps integration
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
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={handleCardPress}
      style={[
        tw`bg-white rounded-2xl shadow-xl overflow-hidden relative`,
        { width: CARD_WIDTH, height: CARD_HEIGHT },
        { 
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        }
      ]}
    >

      {/* Smooth Story Progress Bar */}
      <StoryProgressBar
        currentSlide={currentSlide}
        totalSlides={3}
        onSlideChange={handleSlideChange}
      />
      
      {/* Left Tap Zone - Stops above buttons to prevent conflicts */}
      {currentSlide > 0 && (
        <TouchableOpacity
          style={[
            tw`absolute top-0 left-0 w-40 z-20`,
            { height: CARD_HEIGHT - 80 } // Stop 80px from bottom
          ]}
          onPress={handleLeftTap}
          activeOpacity={0}
        />
      )}
      
      {/* Right Tap Zone - Stops above buttons to prevent conflicts */}
      {currentSlide < 2 && (
        <TouchableOpacity
          style={[
            tw`absolute top-0 right-0 w-40 z-20`,
            { height: CARD_HEIGHT - 80 } // Stop 80px from bottom
          ]}
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
      
      {/* Bottom Action Buttons */}
      <View style={tw`absolute bottom-4 left-4 right-4 z-10`}>
        <View style={tw`flex-row gap-2`}>
          {/* Save button */}
          <TouchableOpacity
            style={tw`w-12 h-12 rounded-lg items-center justify-center shadow-md ${
              isCurrentHotelSaved ? 'bg-red-500' : 'bg-white/95'
            }`}
            onPress={(e) => {
              e.stopPropagation();
              onSave();
            }}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isCurrentHotelSaved ? "heart" : "heart-outline"} 
              size={20} 
              color={isCurrentHotelSaved ? "#FFFFFF" : "#000000"} 
            />
          </TouchableOpacity>
          
          {/* View Details button with Google Maps integration */}
          <TouchableOpacity
            style={tw`flex-1 flex-row py-3 px-4 rounded-lg items-center justify-center shadow-md bg-black`}
            onPress={(e) => {
              e.stopPropagation();
              handleViewDetails();
            }}
            activeOpacity={0.8}
          >
            <Text style={tw`text-white text-base font-bold mr-2`}>
              View Details
            </Text>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default SwipeableHotelStoryCard;
export type { Hotel, EnhancedHotel, SwipeableHotelStoryCardProps };