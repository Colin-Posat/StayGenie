import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Text } from '../../components/CustomText'; 
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import FavoritesCache from '../../utils/FavoritesCache';
import { formatLocationDisplay, getCountryName } from '../../utils/countryMapping';

const { width } = Dimensions.get('window');

// Turquoise color constants matching the app theme
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const TURQUOISE_SUBTLE = '#f0feff';
const TURQUOISE_BORDER = '#b3f7ff';

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
  description?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// Custom hook for intersection observer style lazy loading
const useLazyLoading = (threshold: number = 150) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<View>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!isVisible || !imageLoading) return;
    const t = setTimeout(() => setImageLoading(false), 8000);
    return () => clearTimeout(t);
  }, [isVisible, imageLoading]);

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

    const checkLoop = () => {
      checkVisibility();
      if (!hasLoaded) {
        timeoutId = setTimeout(checkLoop, 100);
      }
    };

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

const GridHeartButton: React.FC<GridHeartButtonProps> = ({ hotel, size = 16 }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
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
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.4,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 0.85,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }).start();
    });
  };

  const handlePress = async (event: any) => {
    event.stopPropagation();
    
    if (isLoading) return;
    
    setIsLoading(true);
    animateHeart();
    
    try {
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

      const newStatus = await favoritesCache.toggleFavorite(hotelForCache);
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
    <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
      <Animated.View
        style={[
          tw`w-7 h-7 rounded-full items-center justify-center`,
          {
            backgroundColor: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 48, 64, 0.2)'],
            }),
            borderColor: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(255, 255, 255, 0.3)', '#FF3040'],
            }),
            borderWidth: 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 3,
          },
          isLoading && tw`opacity-60`
        ]}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.6}
          disabled={isLoading}
          style={tw`w-full h-full items-center justify-center`}
          ></TouchableOpacity>
              <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.6}
          disabled={isLoading}
          style={tw`w-full h-full items-center justify-center`}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={size}
                color={isLiked ? "#FF3040" : "#666666"}
              />
            )}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
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
  onLoadEnd?: () => void; 
  isVisible: boolean;
}

const LazyImage: React.FC<LazyImageProps> = ({
  source,
  style,
  resizeMode,
  onLoadStart,
  onLoad,
  onError,
  onLoadEnd,   
  isVisible
}) => {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setShouldLoad(true);
      }, Math.random() * 100);

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldLoad) {
    return <View style={style} />;
  }

  const isCached = ImageCache.isImageCached(source.uri);
  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      onLoadStart={() => { if (!isCached) onLoadStart?.(); }}
      onLoad={() => {
        ImageCache.markImageCached(source.uri);
        onLoad?.();
      }}
      onError={(e) => { onError?.(); }}
      onLoadEnd={() => { onLoadEnd?.(); }}
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
  index?: number;
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
  const scaleAnimation = useRef(new Animated.Value(1.02)).current;
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  const threshold = 150 + (index * 50);
  const { isVisible, elementRef, hasLoaded } = useLazyLoading(threshold);

  useEffect(() => {
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
            toValue: 1.08,
            duration: 10000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnimation, {
            toValue: 1.02,
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
    outputRange: [-3, 3],
  });

  const translateY = panAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-2, 2],
  });

  const generateGoogleMapsLink = (hotel: BeautifulHotel, checkin?: Date, checkout?: Date, adults: number = 2, children: number = 0): string => {
    let query = '';

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
        let fallbackQuery = '';
        if (hotel.city && hotel.country) {
          fallbackQuery = encodeURIComponent(`${hotel.name} ${hotel.city} ${hotel.country}`);
        } else {
          fallbackQuery = encodeURIComponent(`${hotel.name} ${hotel.location}`);
        }
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${fallbackQuery}`;
        await Linking.openURL(fallbackUrl);
      }

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
    if (rating >= 9.0) return TURQUOISE;
    if (rating >= 8.0) return TURQUOISE + 'E6';
    if (rating >= 7.0) return TURQUOISE + 'CC';
    if (rating >= 6.0) return TURQUOISE + 'B3';
    return TURQUOISE + '99';
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return `${Math.round(price / 100) / 10}k`;
    }
    return price.toString();
  };

  const cardWidth = (width - 48) / 2; // Updated for better spacing
  const cardHeight = cardWidth * 1.15; // Slightly taller ratio

  return (
    <View
      ref={elementRef}
      style={{
        width: cardWidth,
        height: cardHeight,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      <TouchableOpacity
        onPress={handleCardPress}
        activeOpacity={0.95}
        style={[
          tw`bg-white rounded-2xl overflow-hidden`,
          { width: '100%', height: '100%' }
        ]}
      >
        {/* Image with Ken Burns effect */}
        <View style={tw`flex-1 relative overflow-hidden bg-gray-100`}>
          {isVisible ? (
            !imageError ? (
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    width: '106%',
                    height: '106%',
                    left: '-3%',
                    top: '-3%',
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
                    setImageError(true);
                    setImageLoading(false);
                  }}
                  onLoadEnd={() => setImageLoading(false)}
                  isVisible={isVisible}
                />
              </Animated.View>
            ) : (
              <View style={tw`flex-1 items-center justify-center bg-gray-200`}>
                <Ionicons name="image-outline" size={28} color="#9CA3AF" />
                <Text style={tw`text-gray-500 text-xs mt-2`}>Image unavailable</Text>
              </View>
            )
          ) : (
            <View style={tw`flex-1 bg-gray-100 items-center justify-center`}>
              <Animated.View 
                style={[
                  tw`w-8 h-8 bg-gray-200 rounded-lg`,
                  {
                    opacity: panAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 0.7]
                    })
                  }
                ]} 
              />
            </View>
          )}

          {imageLoading && !imageError && isVisible && (
            <View style={tw`absolute inset-0 items-center justify-center bg-white/70`}>
              <ActivityIndicator size="small" color={TURQUOISE} />
            </View>
          )}
          
          {!imageLoading && !imageError && isVisible && (
            <View style={tw`absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/50 to-transparent`} />
          )}

          {/* Price Badge - Top Right */}
          <View style={tw`absolute top-3 right-3`}>
            <View style={[
              tw`px-2.5 py-1.5 rounded-xl border`,
              {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
              }
            ]}>
              <View style={tw`flex-row items-baseline`}>
                <Text style={tw`text-gray-900 text-xs font-bold`}>
                  ${formatPrice(hotel.price)}
                </Text>
                <Text style={tw`text-gray-600 text-[9px] ml-0.5`}>
                  /night
                </Text>
              </View>
            </View>
          </View>

          {/* Favorite Button - Top Left */}
          <View style={tw`absolute top-3 left-3`}>
            <GridHeartButton hotel={hotel} size={15} />
          </View>

          {/* Hotel Info - Bottom overlay */}

        </View>
      </TouchableOpacity>
    </View>
  );
};

// Preload function for critical images
export const preloadHotelImages = (hotels: BeautifulHotel[], count: number = 4) => {
  const criticalImages = hotels.slice(0, count).map(hotel => hotel.image);
  ImageCache.preloadImages(criticalImages);
};

export default BeautifulHotelCard;