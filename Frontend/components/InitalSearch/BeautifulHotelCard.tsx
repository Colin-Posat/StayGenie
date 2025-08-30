import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import FavoritesCache from '../../utils/FavoritesCache';
import { formatLocationDisplay, getCountryName } from '../../utils/countryMapping';

const { width } = Dimensions.get('window');

// Hotel interface matching the beautiful hotels data
export interface BeautifulHotel {
  id: string;
  name: string;
  image: string;
  images: string[];
  price: number;
  originalPrice?: number;
  priceComparison?: string;
  rating: number;
  reviews?: number;
  safetyRating?: number;
  transitDistance?: string;
  tags?: string[];
  location: string;
  features?: string[];
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  topAmenities?: string[];
  fullDescription?: string;
  fullAddress?: string;
  pricePerNight?: {
    amount: number;
    totalAmount: number;
    currency: string;
    display: string;
    provider: string;
    isSupplierPrice: boolean;
  };
  isRefundable?: boolean;
  refundableTag?: string;
  refundableInfo?: string;
  hasAvailability?: boolean;
  totalRooms?: number;
  theme: string;
  architecturalStyle?: string;
  uniqueFeatures?: string[];
  description?: string; // still included for backward compatibility
  coordinates?: {
    lat: number;
    lng: number;
  }; // derived from latitude/longitude if needed
}

// Custom hook for intersection observer style lazy loading
const useLazyLoading = (threshold: number = 150) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<View>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkVisibility = () => {
      if (elementRef.current && !hasLoaded) {
        elementRef.current.measure((x, y, width, height, pageX, pageY) => {
          const screenHeight = Dimensions.get('window').height;
          const isInViewport = pageY < screenHeight + threshold && pageY + height > -threshold;
          
          if (isInViewport) {
            setIsVisible(true);
            setHasLoaded(true);
          }
        });
      }
    };

    // Check visibility on mount and periodically
    const checkLoop = () => {
      checkVisibility();
      if (!hasLoaded) {
        timeoutId = setTimeout(checkLoop, 100);
      }
    };

    // Start checking after component mounts
    timeoutId = setTimeout(checkLoop, 50);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [threshold, hasLoaded]);

  return { isVisible, elementRef, hasLoaded };
};

// Image cache for React Native Image component
class ImageCache {
  private static cache = new Map<string, boolean>();
  
  static isImageCached(uri: string): boolean {
    return this.cache.has(uri);
  }
  
  static markImageCached(uri: string): void {
    this.cache.set(uri, true);
  }
  
  static preloadImages(uris: string[]): void {
    uris.forEach(uri => {
      Image.prefetch(uri).then(() => {
        this.markImageCached(uri);
      }).catch(error => {
        console.warn('Failed to preload image:', uri, error);
      });
    });
  }
}

// Animated Heart Button Component for Grid Cards
interface GridHeartButtonProps {
  hotel: BeautifulHotel;
  size?: number;
}

const GridHeartButton: React.FC<GridHeartButtonProps> = ({ hotel, size = 20 }) => {
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
        toValue: 1.3,
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

  const handlePress = async (event: any) => {
    // Stop event propagation to prevent card tap
    event.stopPropagation();
    
    if (isLoading) return;
    
    setIsLoading(true);
    animateHeart();
    
    try {
      // Convert BeautifulHotel to Hotel-like object for cache compatibility
      const hotelForCache = {
        ...hotel,
        originalPrice: hotel.price,
        priceComparison: '',
        reviews: 0,
        safetyRating: 8.0,
        transitDistance: '',
        tags: [],
        features: [],
      };

      // Toggle favorite status in cache
      const newStatus = await favoritesCache.toggleFavorite(hotelForCache);
      setIsLiked(newStatus);
      
      // Show feedback to user
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
    <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.6}
        disabled={isLoading}
        style={[
          tw`w-8 h-8 rounded-full bg-white/90 items-center justify-center shadow-sm`,
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
  );
};

// Lazy Loading Image Component
interface LazyImageProps {
  source: { uri: string };
  style: any;
  resizeMode: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLoadStart?: () => void;
  onLoad?: () => void;
  onError?: () => void;
  isVisible: boolean;
}

const LazyImage: React.FC<LazyImageProps> = ({
  source,
  style,
  resizeMode,
  onLoadStart,
  onLoad,
  onError,
  isVisible
}) => {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Add a small delay to prevent loading all images at once
      const timer = setTimeout(() => {
        setShouldLoad(true);
      }, Math.random() * 100); // Random delay 0-100ms

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldLoad) {
    return <View style={style} />;
  }

  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      onLoadStart={onLoadStart}
      onLoad={() => {
        ImageCache.markImageCached(source.uri);
        onLoad?.();
      }}
      onError={onError}
      fadeDuration={300}
    />
  );
};

// Square Hotel Card Component for Grid
interface BeautifulHotelCardProps {
  hotel: BeautifulHotel;
  onPress?: () => void;
  checkInDate?: Date;
  checkOutDate?: Date;
  adults?: number;
  children?: number;
  index?: number; // For staggered loading
}

const BeautifulHotelCard: React.FC<BeautifulHotelCardProps> = ({ 
  hotel, 
  onPress,
  checkInDate,
  checkOutDate,
  adults = 2,
  children = 0,
  index = 0
}) => {
  const panAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1.05)).current;
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Lazy loading hook with staggered threshold based on index
  const threshold = 150 + (index * 50); // Stagger loading based on position
  const { isVisible, elementRef, hasLoaded } = useLazyLoading(threshold);

  useEffect(() => {
    // Only start animations if image is visible and loaded
    if (isVisible && !imageLoading && !imageError) {
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
    }
  }, [panAnimation, scaleAnimation, isVisible, imageLoading, imageError]);

  const translateX = panAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 4],
  });

  const translateY = panAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-2, 2],
  });

  // Google Maps link generation - prioritize hotel name
  const generateGoogleMapsLink = (hotel: BeautifulHotel, checkin?: Date, checkout?: Date, adults: number = 2, children: number = 0): string => {
    let query = '';

    // Always use hotel name with location text
    const locationText = hotel.city && hotel.country 
      ? `${hotel.name} ${hotel.city} ${hotel.country}`
      : hotel.fullAddress 
      ? `${hotel.name} ${hotel.fullAddress}`
      : `${hotel.name} ${hotel.location}`;
    query = encodeURIComponent(locationText);
    console.log(`📍 Using hotel name and location: ${locationText}`);
    
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

  // Handle card press - open Google Maps
  const handleCardPress = async () => {
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
        // Fallback with hotel name and location
        let fallbackQuery = '';
        if (hotel.city && hotel.country) {
          fallbackQuery = encodeURIComponent(`${hotel.name} ${hotel.city} ${hotel.country}`);
        } else {
          fallbackQuery = encodeURIComponent(`${hotel.name} ${hotel.location}`);
        }
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${fallbackQuery}`;
        await Linking.openURL(fallbackUrl);
      }

      // Call optional onPress callback if provided
      onPress?.();

    } catch (error) {
      console.error('Error opening Google Maps:', error);
      
      Alert.alert(
        'Unable to Open Maps',
        'Could not open Google Maps. Please check your internet connection and try again.',
        [
          {
            text: 'OK',
            onPress: () => onPress?.()
          }
        ]
      );
    }
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 9.0) return "#00E676"; // Bright green for exceptional
    if (rating >= 8.0) return "#4CAF50"; // Green for very good
    if (rating >= 7.0) return "#FF9800"; // Orange for good
    if (rating >= 6.0) return "#FF5722"; // Orange-red for fair
    return "#F44336"; // Red for poor
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return `${Math.round(price / 100) / 10}k`;
    }
    return price.toString();
  };

  const cardWidth = (width - 56) / 2; // Account for padding and gap
  const cardHeight = cardWidth * 1.1; // Slightly taller than square

  return (
    <TouchableOpacity
      ref={elementRef}
      onPress={handleCardPress}
      activeOpacity={0.95}
      style={[
        tw`bg-white rounded-xl overflow-hidden shadow-lg`,
        { width: cardWidth, height: cardHeight }
      ]}
    >
      {/* Image with Ken Burns effect and lazy loading */}
      <View style={tw`flex-1 relative overflow-hidden bg-gray-200`}>
        {isVisible ? (
          !imageError ? (
            <Animated.View
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
            >
              <LazyImage
                source={{ uri: hotel.image }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                onLoadStart={() => setImageLoading(true)}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
                isVisible={isVisible}
              />
            </Animated.View>
          ) : (
            // Error placeholder
            <View style={tw`flex-1 items-center justify-center bg-gray-300`}>
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
              <Text style={tw`text-gray-500 text-xs mt-2`}>Image unavailable</Text>
            </View>
          )
        ) : (
          // Lazy loading placeholder with subtle animation
          <View style={tw`flex-1 bg-gray-100 items-center justify-center`}>
            <Animated.View 
              style={[
                tw`w-8 h-8 bg-gray-300 rounded`,
                {
                  opacity: panAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.6]
                  })
                }
              ]} 
            />
          </View>
        )}

        {/* Loading indicator */}
        {imageLoading && !imageError && isVisible && (
          <View style={tw`absolute inset-0 items-center justify-center bg-gray-100/80`}>
            <ActivityIndicator size="small" color="#666" />
          </View>
        )}
        
        {/* Gradient overlay - only show when image is loaded */}
        {!imageLoading && !imageError && isVisible && (
          <View style={tw`absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/70 to-transparent`} />
        )}

        {/* Price Badge - Top Right */}
        <View style={tw`absolute top-2 right-2`}>
          <View style={tw`bg-black/50 border border-white/20 px-2.5 py-1 rounded-lg`}>
            <View style={tw`flex-row items-baseline`}>
              <Text style={tw`text-white text-xs font-bold`}>
                ${formatPrice(hotel.price)}
              </Text>
              <Text style={tw`text-white/80 text-[9px] ml-0.5`}>
                /night
              </Text>
            </View>
          </View>
        </View>

        {/* Favorite Button - Bottom Right */}
        <View style={tw`absolute bottom-2 right-2`}>
          <GridHeartButton hotel={hotel} size={20} />
        </View>

        {/* Hotel info at bottom left */}
        <View style={tw`absolute bottom-2 left-2 right-12`}>
          <View style={tw`bg-black/30 border border-white/20 px-1.5 py-0.5 rounded-md`}>
            <Text 
              style={tw`text-white text-[10px] font-semibold leading-tight`}
            >
              {hotel.name}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Preload function for critical images (use in parent component)
export const preloadHotelImages = (hotels: BeautifulHotel[], count: number = 4) => {
  const criticalImages = hotels.slice(0, count).map(hotel => hotel.image);
  ImageCache.preloadImages(criticalImages);
};

export default BeautifulHotelCard;