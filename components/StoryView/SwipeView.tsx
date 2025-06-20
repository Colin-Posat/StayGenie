// SwipeView.tsx - Updated with card swipe animations
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import HotelStoryCard, { Hotel, EnhancedHotel } from './HotelStoryCard';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SwipeViewProps {
  hotels: Hotel[];
  onHotelPress?: (hotel: Hotel) => void;
  onBookNow?: (hotel: Hotel) => void;
  onSave?: (hotel: Hotel) => void;
  onNext?: (hotel: Hotel) => void;
}

// Mock hotels data
const mockHotels: Hotel[] = [
  {
    id: 1,
    name: "Grand Plaza Downtown",
    image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80",
    price: 189,
    originalPrice: 220,
    priceComparison: "15% below average",
    rating: 4.6,
    reviews: 1248,
    safetyRating: 9.2,
    transitDistance: "2 min walk",
    tags: ["Pet-friendly", "Business center", "Gym"],
    location: "Downtown Core",
    features: ["Free WiFi", "Pool", "Parking"],
  },
  {
    id: 2,
    name: "Cozy Family Inn",
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80",
    price: 129,
    originalPrice: 145,
    priceComparison: "11% below average",
    rating: 4.4,
    reviews: 892,
    safetyRating: 8.7,
    transitDistance: "5 min walk",
    tags: ["Family-friendly", "Kitchen", "Laundry"],
    location: "Arts District",
    features: ["Free Breakfast", "WiFi", "Family rooms"],
  },
  {
    id: 3,
    name: "Luxury Riverside Resort",
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
    price: 295,
    originalPrice: 275,
    priceComparison: "7% above average",
    rating: 4.8,
    reviews: 2156,
    safetyRating: 9.5,
    transitDistance: "8 min walk",
    tags: ["Luxury", "Spa", "Fine dining"],
    location: "Riverside",
    features: ["Spa", "Restaurant", "Concierge"],
  },
];

// Function to enhance hotels with additional data for the story cards
const enhanceHotel = (hotel: Hotel): EnhancedHotel => {
  const baseImageUrl = hotel.image.split('?')[0];
  const images = [
    hotel.image, // Main hotel image
    `${baseImageUrl}?auto=format&fit=crop&w=800&q=80&crop=entropy`, // Different crop for location
    `${baseImageUrl}?auto=format&fit=crop&w=800&q=80&crop=faces`, // Different crop for amenities
  ];

  // Generate map-style image for location card
  const mapImages = [
    "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1519302959554-a75be0afc82a?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80",
  ];
  const mapImage = mapImages[hotel.id % mapImages.length];

  // Generate nearby attractions based on location
  let nearbyAttractions = ["City Center - 5 min", "Shopping Mall - 8 min", "Restaurant District - 3 min"];
  if (hotel.location.includes('Downtown')) {
    nearbyAttractions = ["Business District - 2 min", "Theater District - 4 min", "Shopping Center - 6 min"];
  } else if (hotel.location.includes('Arts')) {
    nearbyAttractions = ["Art Museum - 2 min", "Gallery District - 3 min", "Cultural Center - 5 min"];
  } else if (hotel.location.includes('Riverside')) {
    nearbyAttractions = ["Waterfront - 1 min", "Marina - 3 min", "River Walk - 2 min"];
  }

  return {
    ...hotel,
    images,
    mapImage,
    nearbyAttractions,
  };
};

// Animation constants
const SWIPE_THRESHOLD = 120;
const ANIMATION_DURATION = 250;

// Main SwipeView Component
const SwipeView: React.FC<SwipeViewProps> = ({ 
  hotels = mockHotels, 
  onHotelPress, 
  onBookNow, 
  onSave, 
  onNext 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedHotels, setSavedHotels] = useState<Set<number>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation values
  const cardAnimationX = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  // Enhance hotels with additional data
  const enhancedHotels = hotels.map(enhanceHotel);
  const currentHotel = enhancedHotels[currentIndex];

  // Animate card transition
  const animateCardTransition = useCallback((direction: 'left' | 'right', callback: () => void) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    const targetX = direction === 'left' ? -screenWidth : screenWidth;

    Animated.parallel([
      Animated.timing(cardAnimationX, {
        toValue: targetX,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.8,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Execute callback (change index)
      callback();
      
      // Reset animation values for new card
      cardAnimationX.setValue(direction === 'left' ? screenWidth : -screenWidth);
      cardOpacity.setValue(0);
      cardScale.setValue(0.8);
      
      // Animate new card in
      Animated.parallel([
        Animated.timing(cardAnimationX, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsAnimating(false);
      });
    });
  }, [cardAnimationX, cardOpacity, cardScale, isAnimating]);

  const handleNext = useCallback(() => {
    if (isAnimating || currentIndex >= enhancedHotels.length - 1) return;
    
    onNext?.(currentHotel);
    
    animateCardTransition('left', () => {
      setCurrentIndex(prev => prev + 1);
    });
  }, [currentIndex, currentHotel, enhancedHotels.length, onNext, isAnimating, animateCardTransition]);

  const handlePrev = useCallback(() => {
    if (isAnimating || currentIndex <= 0) return;
    
    animateCardTransition('right', () => {
      setCurrentIndex(prev => prev - 1);
    });
  }, [currentIndex, isAnimating, animateCardTransition]);

  const handleSave = useCallback(() => {
    setSavedHotels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentHotel.id)) {
        newSet.delete(currentHotel.id);
      } else {
        newSet.add(currentHotel.id);
      }
      return newSet;
    });
    onSave?.(currentHotel);
  }, [currentHotel, onSave]);



  const isLastHotel = currentIndex >= enhancedHotels.length - 1;
  const hasSavedHotels = savedHotels.size > 0;
  const isCurrentHotelSaved = savedHotels.has(currentHotel?.id);
  const canGoPrev = currentIndex > 0;

  const handleViewSavedHotels = () => {
    // This would navigate to saved hotels view
    console.log('Navigate to saved hotels');
  };

  // End state when all hotels viewed
  if (currentIndex >= enhancedHotels.length) {
    return (
      <View style={tw`flex-1 bg-gray-50`}>
        <View style={tw`flex-1 justify-center items-center px-10`}>
          <View style={tw`w-32 h-32 rounded-full bg-gray-100 justify-center items-center mb-6`}>
            <Ionicons name="bookmark-outline" size={64} color="#CCCCCC" />
          </View>
          <Text style={tw`text-3xl font-bold text-gray-800 mb-2 text-center`}>
            No More Hotels
          </Text>
          <Text style={tw`text-base text-gray-500 text-center leading-6 mb-8`}>
            You've seen all available hotels. Try adjusting your search criteria.
          </Text>
          <TouchableOpacity
            style={tw`bg-black px-8 py-4 rounded-xl`}
            onPress={() => {
              setCurrentIndex(0);
              // Reset animation values
              cardAnimationX.setValue(0);
              cardOpacity.setValue(1);
              cardScale.setValue(1);
            }}
            activeOpacity={0.8}
          >
            <Text style={tw`text-white text-base font-semibold`}>Start Over</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Single Card Display with Animation */}
      <View style={tw`flex-1 items-center justify-center px-5`}>
        <Animated.View
          style={[
            {
              transform: [
                { translateX: cardAnimationX },
                { scale: cardScale }
              ],
              opacity: cardOpacity,
            }
          ]}
        >
          <HotelStoryCard
            hotel={currentHotel}
            onSave={handleSave}
            onNext={handleNext}
            onPrev={handlePrev}
            isLastHotel={isLastHotel}
            hasSavedHotels={hasSavedHotels}
            isCurrentHotelSaved={isCurrentHotelSaved}
            onViewSavedHotels={handleViewSavedHotels}
            canGoPrev={canGoPrev}
          />
        </Animated.View>
      </View>


    </View>
  );
};

export default SwipeView;