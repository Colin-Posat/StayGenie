import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth } from '../../contexts/AuthContext';

// TypeScript Interfaces
interface EnhancedHotel {
  id: string;
  name: string;
  image: string;
  price: number;
  rating: number;
  reviews: number;
  location: string;
  images?: string[];
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  aiExcerpt?: string;
  whyItMatches?: string;
  funFacts?: string[];
  aiMatchPercent?: number;
  matchType?: string;
  tags?: string[];
  features?: string[];
  topAmenities?: string[];
  nearbyAttractions?: string[];
  locationHighlight?: string;
  pricePerNight?: {
    amount: number;
    totalAmount: number;
    currency: string;
    display: string;
    provider: string | null;
    isSupplierPrice: boolean;
  } | null;
  guestInsights?: string;
  sentimentPros?: string[];
  sentimentCons?: string[];
  isRefundable?: boolean;
  refundableTag?: string | null;
  fullDescription?: string;
  fullAddress?: string;
  [key: string]: any;
}

interface AnimatedHeartButtonProps {
  hotel: EnhancedHotel;
  size?: number;
  onShowSignUpModal?: () => void;
}

// Sleek Floating Heart Button Component
const AnimatedHeartButton: React.FC<AnimatedHeartButtonProps> = ({ 
  hotel, 
  size = 18, 
  onShowSignUpModal 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const heartOpacityAnim = useRef(new Animated.Value(1)).current;
  
  // Use Firebase auth context
  const { 
    isAuthenticated, 
    isFavoriteHotel, 
    toggleFavoriteHotel, 
    requireAuth 
  } = useAuth();

  const isLiked = isAuthenticated ? isFavoriteHotel(hotel.id) : false;

  const animateHeart = () => {
    // Heart scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.25,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    // Bounce animation for the container
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 0.92,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow effect when liking
    if (!isLiked) {
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: false,
        }),
      ]).start();
    }

    // Subtle particle burst effect
    if (!isLiked) {
      Animated.sequence([
        Animated.timing(particleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(particleAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const animateLoadingState = () => {
    // Smooth fade out heart during loading
    Animated.timing(heartOpacityAnim, {
      toValue: 0.3,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const animateLoadingComplete = () => {
    // Smooth fade back in after loading
    Animated.timing(heartOpacityAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    if (isLoading) return;
    
    // Use requireAuth to handle unauthenticated users
    requireAuth(
      async () => {
        // This runs only if user is authenticated
        setIsLoading(true);
        animateLoadingState();
        
        try {
          const newStatus = await toggleFavoriteHotel({
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
          });
          
          // Animate heart change after successful toggle
          animateHeart();
          
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
          animateLoadingComplete();
        }
      },
      () => {
        // This runs if user is not authenticated - show sign up modal
        animateHeart();
        if (onShowSignUpModal) {
          onShowSignUpModal();
        }
      }
    );
  };

  return (
    <View style={tw`relative`}>
      {/* Subtle Particle Effects */}
      {[...Array(3)].map((_, index) => (
        <Animated.View
          key={index}
          style={[
            tw`absolute`,
            {
              transform: [
                {
                  translateX: particleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, (Math.cos((index * 120) * Math.PI / 180) * 14)],
                  }),
                },
                {
                  translateY: particleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, (Math.sin((index * 120) * Math.PI / 180) * 14)],
                  }),
                },
                {
                  scale: particleAnim.interpolate({
                    inputRange: [0, 0.4, 1],
                    outputRange: [0, 1, 0],
                  }),
                },
              ],
              opacity: particleAnim.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0, 1, 0],
              }),
              left: 14,
              top: 14,
            },
          ]}
        >
          <Ionicons name="heart" size={4} color="#FF3040" />
        </Animated.View>
      ))}

      {/* Main Floating Button */}
      <Animated.View
        style={[
          {
            transform: [{ scale: bounceAnim }],
          }
        ]}
      >
        <Animated.View
          style={[
            tw`w-12 h-12 rounded-full items-center justify-center`,
            {
              backgroundColor: isLiked 
                ? 'rgba(255, 48, 64, 0.15)' 
                : 'rgba(255, 255, 255, 0.85)',
              borderWidth: 0.5,
              borderColor: isLiked 
                ? 'rgba(255, 48, 64, 0.3)' 
                : 'rgba(255, 255, 255, 0.4)',
              shadowColor: isLiked ? '#FF3040' : 'rgba(0, 0, 0, 0.1)',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isLiked ? 0.3 : 0.08,
              shadowRadius: isLiked ? 4 : 3,
              elevation: isLiked ? 4 : 2,
            },
            // Animated glow for like action
            !isLiked && {
              backgroundColor: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [
                  'rgba(255, 255, 255, 0.85)',
                  'rgba(255, 48, 64, 0.2)'
                ],
              }),
              borderColor: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [
                  'rgba(255, 255, 255, 0.4)',
                  'rgba(255, 48, 64, 0.4)'
                ],
              }),
            }
          ]}
        >
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.75}
            style={tw`w-full h-full items-center justify-center`}
            disabled={isLoading}
          >
            <Animated.View
              style={{
                transform: [{ scale: scaleAnim }],
                opacity: heartOpacityAnim,
              }}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={size}
                color={isLiked ? "#FF3040" : "#4B5563"}
                style={{
                  textShadowColor: isLiked ? 'rgba(255, 48, 64, 0.3)' : 'rgba(255, 255, 255, 0.8)',
                  textShadowOffset: { width: 0, height: 0.5 },
                  textShadowRadius: isLiked ? 2 : 1,
                }}
              />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default AnimatedHeartButton;