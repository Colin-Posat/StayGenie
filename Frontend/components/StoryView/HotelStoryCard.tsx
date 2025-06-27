// HotelStoryCard.tsx - Updated with larger, more accessible buttons
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Animated,
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
}

interface EnhancedHotel extends Hotel {
  images: string[];
  mapImage: string;
  nearbyAttractions: string[];
}

interface HotelStoryCardProps {
  hotel: EnhancedHotel;
  onSave: () => void;
  onNext: () => void;
  onPrev: () => void;
  isLastHotel: boolean;
  hasSavedHotels: boolean;
  isCurrentHotelSaved: boolean;
  onViewSavedHotels: () => void;
  canGoPrev: boolean;
}

// Generate AI insights based on hotel characteristics
const generateAIInsight = (hotel: Hotel): string => {
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

// Slide 1: Hotel Overview with panning effect
const HotelOverviewSlide: React.FC<{ hotel: EnhancedHotel }> = ({ hotel }) => {
  const aiInsight = generateAIInsight(hotel);
  const panAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1.2)).current; // Start larger

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

    // Start subtle scale animation (always keep it large enough)
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
    outputRange: [-15, 15], // Reduced range since we have larger base scale
  });

  const translateY = panAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 8], // Reduced range
  });

  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      <Animated.Image 
        source={{ uri: hotel.images[0] }} 
        style={[
          {
            position: 'absolute',
            width: '120%', // Make image larger than container
            height: '120%', // Make image larger than container
            left: '-10%', // Center the oversized image
            top: '-10%', // Center the oversized image
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
                ${hotel.price}
              </Text>
              <Text style={tw`text-white/80 text-sm ml-1`}>/night</Text>
            </View>
          </View>
        </View>
        
        {/* AI Match Insight */}
        <View style={tw`bg-black/50 p-3 rounded-lg border border-white/20`}>
          <View style={tw`flex-row items-center mb-1.5`}>
            <Ionicons name="sparkles" size={14} color="#FFD700" />
            <Text style={tw`text-yellow-400 text-xs font-semibold ml-1`}>
              AI Match
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

// Slide 2: Location - Minimalistic with panning effect
const LocationSlide: React.FC<{ hotel: EnhancedHotel }> = ({ hotel }) => {
  const panAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1.2)).current; // Start larger

  useEffect(() => {
    // Different panning pattern for location slide
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
    outputRange: [12, -12], // Reduced range
  });

  const translateY = panAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [6, -6], // Reduced range
  });

  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      <Animated.Image 
        source={{ uri: hotel.mapImage }} 
        style={[
          {
            position: 'absolute',
            width: '120%', // Make image larger than container
            height: '120%', // Make image larger than container
            left: '-10%', // Center the oversized image
            top: '-10%', // Center the oversized image
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
        
        {/* Nearby Attractions - Simple List */}
        <View style={tw`bg-black/50 p-3 rounded-lg border border-white/20`}>
          <Text style={tw`text-white text-sm font-semibold mb-2`}>Nearby</Text>
          {hotel.nearbyAttractions.slice(0, 3).map((attraction, index) => (
            <View key={index} style={tw`flex-row items-center mb-1`}>
              <View style={tw`w-1 h-1 rounded-full bg-white/60 mr-2`} />
              <Text style={tw`text-white/90 text-sm`}>{attraction}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// Slide 3: Amenities & Features - Minimalistic with panning effect
const AmenitiesSlide: React.FC<{ hotel: EnhancedHotel }> = ({ hotel }) => {
  const panAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1.2)).current; // Start larger

  useEffect(() => {
    // Unique panning pattern for amenities slide
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
    outputRange: [-10, 10], // Reduced range
  });

  const translateY = panAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [12, -12], // Reduced range
  });

  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      <Animated.Image 
        source={{ uri: hotel.images[2] }} 
        style={[
          {
            position: 'absolute',
            width: '120%', // Make image larger than container
            height: '120%', // Make image larger than container
            left: '-10%', // Center the oversized image
            top: '-10%', // Center the oversized image
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
        
        {/* Features Grid - Simple */}
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

// Main Hotel Story Card Component
const HotelStoryCard: React.FC<HotelStoryCardProps> = ({ 
  hotel, 
  onSave, 
  onNext, 
  onPrev, 
  isLastHotel, 
  hasSavedHotels, 
  isCurrentHotelSaved, 
  onViewSavedHotels,
  canGoPrev 
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
        animated: false, // No animation for hotel change
      });
      prevHotelId.current = hotel.id;
    }
  }, [hotel.id]);

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

  return (
    <View 
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
            { height: CARD_HEIGHT - 80 } // Stop 80px from bottom for smaller buttons
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
            { height: CARD_HEIGHT - 80 } // Stop 80px from bottom for smaller buttons
          ]}
          onPress={handleRightTap}
          activeOpacity={0}
        />
      )}
      
      {/* Larger Navigation Buttons */}
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
      
      {/* MUCH LARGER Navigation Buttons - Main improvement */}
      <View style={tw`absolute bottom-4 left-4 right-4 z-10`}>
        <View style={tw`flex-row gap-2`}>
          {/* Back button - back to original size */}
          {canGoPrev && (
            <TouchableOpacity
              style={tw`w-12 h-12 bg-white/95 rounded-lg items-center justify-center shadow-md`}
              onPress={onPrev}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={20} color="#000000" />
            </TouchableOpacity>
          )}
          
          {/* Save button - back to original size */}
          <TouchableOpacity
            style={tw`w-12 h-12 rounded-lg items-center justify-center shadow-md ${
              isCurrentHotelSaved ? 'bg-red-500' : 'bg-white/95'
            }`}
            onPress={onSave}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isCurrentHotelSaved ? "heart" : "heart-outline"} 
              size={20} 
              color={isCurrentHotelSaved ? "#FFFFFF" : "#000000"} 
            />
          </TouchableOpacity>
          
          {/* Main action button - back to original height */}
          <TouchableOpacity
            style={tw`flex-1 flex-row py-3 px-4 rounded-lg items-center justify-center shadow-md ${
              isLastHotel && hasSavedHotels
                ? 'bg-green-600'
                : isLastHotel
                ? 'bg-gray-600'
                : 'bg-black'
            }`}
            onPress={isLastHotel && hasSavedHotels ? onViewSavedHotels : onNext}
            activeOpacity={0.8}
          >
            <Text style={tw`text-white text-base font-bold mr-2`}>
              {isLastHotel && hasSavedHotels
                ? 'View Saved Hotels'
                : isLastHotel
                ? 'Start Over'
                : 'Next Hotel'
              }
            </Text>
            <Ionicons 
              name={
                isLastHotel && hasSavedHotels
                  ? "heart"
                  : isLastHotel
                  ? "refresh"
                  : "chevron-forward"
              } 
              size={18} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default HotelStoryCard;
export type { Hotel, EnhancedHotel, HotelStoryCardProps };