import React, { useState, useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

interface EnhancedHeartButtonProps {
  hotel: any;
  size?: number;
  onShowSignUpModal?: () => void;
  onFavoriteSuccess?: (hotelName: string) => void;
}

const EnhancedHeartButton: React.FC<EnhancedHeartButtonProps> = ({
  hotel,
  size = 24,
  onShowSignUpModal,
  onFavoriteSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(false);
  const [pendingFavorite, setPendingFavorite] = useState<any>(null); // Store hotel data for post-auth favoriting
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  
  const {
    isAuthenticated,
    isFavoriteHotel,
    toggleFavoriteHotel,
    requireAuth
  } = useAuth();

  const actualIsLiked = isAuthenticated ? isFavoriteHotel(hotel.id) : false;
  const displayIsLiked = optimisticLiked || actualIsLiked;

  // Reset optimistic state when actual state changes
  useEffect(() => {
    if (actualIsLiked === optimisticLiked && optimisticLiked !== false) {
      setOptimisticLiked(false);
    }
  }, [actualIsLiked]);

  // Handle post-authentication favoriting
  useEffect(() => {
    if (isAuthenticated && pendingFavorite) {
      // User just authenticated and we have a pending favorite action
      handleFavoriteToggle(pendingFavorite, true);
      setPendingFavorite(null);
    }
  }, [isAuthenticated, pendingFavorite]);

  const createHeartAnimation = (isLiking: boolean) => {
    if (isLiking) {
      // Liking animation - more dramatic
      return Animated.parallel([
        // Main heart bounce and scale
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1.2,
            tension: 200,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        
        // Rotation for excitement
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: -1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]);
    } else {
      // Unliking animation - subtle
      return Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
      ]);
    }
  };

  const resetAnimations = () => {
    scaleAnim.setValue(1);
    rotateAnim.setValue(0);
    bounceAnim.setValue(1);
  };

  const handleFavoriteToggle = async (hotelData: any, showSuccessPopup: boolean = false) => {
    if (isLoading) return;

    setIsLoading(true);
    
    // Optimistically update the state immediately
    const willBeLiked = !isFavoriteHotel(hotelData.id);
    setOptimisticLiked(willBeLiked);
    
    // Start animation immediately (don't wait for API)
    const animation = createHeartAnimation(willBeLiked);
    animation.start();

    try {
      await toggleFavoriteHotel({
        id: hotelData.id,
        name: hotelData.name,
        location: hotelData.location,
        image: hotelData.image || hotelData.images?.[0],
        images: hotelData.images,
        // ADD ALL IMAGE FIELDS - This is what was missing!
        photoGalleryImages: hotelData.photoGalleryImages,
        firstRoomImage: hotelData.firstRoomImage,
        secondRoomImage: hotelData.secondRoomImage,
        thirdImageHd: hotelData.thirdImageHd,
        price: hotelData.price,
        rating: hotelData.rating,
        reviews: hotelData.reviews,
        city: hotelData.city,
        country: hotelData.country,
        latitude: hotelData.latitude,
        longitude: hotelData.longitude,
        aiExcerpt: hotelData.aiExcerpt,
        whyItMatches: hotelData.whyItMatches,
        funFacts: hotelData.funFacts,
        aiMatchPercent: hotelData.aiMatchPercent,
        matchType: hotelData.matchType,
        tags: hotelData.tags,
        features: hotelData.features,
        topAmenities: hotelData.topAmenities,
        nearbyAttractions: hotelData.nearbyAttractions,
        locationHighlight: hotelData.locationHighlight,
        pricePerNight: hotelData.pricePerNight,
        guestInsights: hotelData.guestInsights,
        sentimentPros: hotelData.sentimentPros,
        sentimentCons: hotelData.sentimentCons,
        isRefundable: hotelData.isRefundable,
        refundableTag: hotelData.refundableTag,
        fullDescription: hotelData.fullDescription,
        fullAddress: hotelData.fullAddress,
        categoryRatings: hotelData.categoryRatings,
        placeId: hotelData.placeId,
      });
      
      // Success - trigger popup if hotel was favorited and we should show the popup
      if (willBeLiked && showSuccessPopup && onFavoriteSuccess) {
        onFavoriteSuccess(hotelData.name);
      }
      setOptimisticLiked(false);
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
      
      // Revert optimistic update on error
      setOptimisticLiked(!willBeLiked);
      resetAnimations();
      
      Alert.alert('Error', 'Failed to update favorites. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = async () => {
    if (isLoading) return;

    requireAuth(
      async () => {
        // User is authenticated - proceed with favorite toggle
        await handleFavoriteToggle(hotel, true);
      },
      () => {
        // User not authenticated - store the hotel data for post-auth favoriting
        setPendingFavorite(hotel);
        
        // Show quick animation feedback
        const quickAnimation = Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 400,
            friction: 8,
            useNativeDriver: true,
          }),
        ]);
        
        quickAnimation.start();
        
        if (onShowSignUpModal) {
          onShowSignUpModal();
        }
      }
    );
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-15deg', '15deg'],
  });

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={isLoading}
      style={{
        width: size + 24,
        height: size + 24,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Main heart icon */}
      <Animated.View
        style={{
          transform: [
            { scale: scaleAnim },
            { rotate: rotation }
          ],
        }}
      >
        <Ionicons
          name={displayIsLiked ? "heart" : "heart-outline"}
          size={size}
          color={displayIsLiked ? "#EF4444" : "#374151"}
          style={{
            // Add a subtle glow effect for liked state
            textShadowColor: displayIsLiked ? 'rgba(239, 68, 68, 0.3)' : 'transparent',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: displayIsLiked ? 4 : 0,
          }}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default EnhancedHeartButton;