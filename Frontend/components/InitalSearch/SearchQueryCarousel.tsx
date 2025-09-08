// NewSearchQueryCarousel.tsx - Fixed mobile sizing with original lazy loading
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const { width } = Dimensions.get('window');
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const TURQUOISE_SUBTLE = '#f0feff';
const TURQUOISE_BORDER = '#b3f7ff';

// Use same dimensions as your original - this was working properly
const cardWidth = 140; // Same as your original SearchQueryCarousel
const cardHeight = 140; // Same as your original SearchQueryCarousel  
const cardMargin = 8; // Same as your original

interface Hotel {
  id: string;
  name: string;
  image: string;
  price: number;
  rating: number;
  location: string;
  city?: string;
  country?: string;
  fullAddress?: string;
}

// Custom hook for intersection observer style lazy loading - EXACT COPY from your original
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

// Image cache for React Native Image component - EXACT COPY from your original
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

// Lazy Loading Image Component - EXACT COPY from your original
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

  const isCached = ImageCache.isImageCached(source.uri);
  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      // Don't trigger loading UI for known-cached images
      onLoadStart={() => { if (!isCached) onLoadStart?.(); }}
      onLoad={() => {
        ImageCache.markImageCached(source.uri);
        onLoad?.();
      }}
      onError={(e) => { onError?.(); }}
      onLoadEnd={() => { onLoadEnd?.(); }}    // ALWAYS fires (success or error)
      fadeDuration={300}
    />
  );
};

interface HotelCardProps {
  hotel: Hotel;
  onPress: () => void;
  index: number;
}

const HotelCard: React.FC<HotelCardProps> = ({ hotel, onPress, index }) => {
  const panAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1.05)).current;
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Lazy loading hook with staggered threshold based on index - SAME AS YOUR ORIGINAL
  const threshold = 150 + (index * 50); // Stagger loading based on position
  const { isVisible, elementRef, hasLoaded } = useLazyLoading(threshold);

  useEffect(() => {
    // Only start animations if image is visible and loaded - SAME AS YOUR ORIGINAL
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

  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return `${Math.round(price / 100) / 10}k`;
    }
    return price.toString();
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 9.0) return "#00E676";
    if (rating >= 8.0) return "#4CAF50";
    if (rating >= 7.0) return "#FF9800";
    if (rating >= 6.0) return "#FF5722";
    return "#F44336";
  };

  const handlePress = () => {
    // Generate Google Maps link
    let query = '';
    if (hotel.city && hotel.country) {
      query = encodeURIComponent(`${hotel.name} ${hotel.city} ${hotel.country}`);
    } else if (hotel.fullAddress) {
      query = encodeURIComponent(`${hotel.name} ${hotel.fullAddress}`);
    } else {
      query = encodeURIComponent(`${hotel.name} ${hotel.location}`);
    }
    
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    
    Linking.canOpenURL(mapsUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(mapsUrl);
        } else {
          Alert.alert('Error', 'Cannot open Google Maps');
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Failed to open Google Maps');
      });
    
    onPress();
  };

  return (
    <View
      ref={elementRef}
      style={{
        width: cardWidth,
        height: cardHeight,
        // iOS shadow
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.5,
        // Android shadow
        elevation: 5,
      }}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.95}
        style={[
          tw`bg-white rounded-2xl overflow-hidden`,
          { width: '100%', height: '100%' }
        ]}
      >
        {/* Image with Ken Burns effect and lazy loading - SAME AS YOUR ORIGINAL */}
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
                    setImageError(true);
                    setImageLoading(false);
                  }}
                  onLoadEnd={() => setImageLoading(false)}
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

          {imageLoading && !imageError && isVisible && (
            <View style={tw`absolute inset-0 items-center justify-center bg-gray-100/60`}>
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
    </View>
  );
};

interface SearchQueryCarouselProps {
  searchQuery: string;
  hotels: Hotel[];
  onSearchPress: (query: string) => void;
  onHotelPress?: (hotel: Hotel) => void;
  index?: number;
}

const NewSearchQueryCarousel: React.FC<SearchQueryCarouselProps> = ({
  searchQuery,
  hotels,
  onSearchPress,
  onHotelPress,
  index = 0,
}) => {
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(30)).current;
  const [isChevronPressed, setIsChevronPressed] = useState(false);

  useEffect(() => {
    const delay = index * 200;
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
  }, [index]);

  const handleSearchPress = () => {
    setIsChevronPressed(true);
    setTimeout(() => setIsChevronPressed(false), 150);
    onSearchPress(searchQuery);
  };

  const handleHotelPress = (hotel: Hotel) => {
    onHotelPress?.(hotel);
  };

  const getTextSize = (text: string) => {
    if (text.length > 60) return 'text-xs';
    if (text.length > 40) return 'text-sm';
    return 'text-base';
  };

  return (
    <Animated.View
      style={[
        tw`w-full mb-4`,
        {
          opacity: fadeAnimation,
          transform: [{ translateY: slideAnimation }],
        },
      ]}
    >
      {/* Search Query Header with Pill-Style Chevron */}
      <TouchableOpacity
        onPress={handleSearchPress}
        activeOpacity={0.7}
        style={tw`flex-row items-center mb-3 px-1`}
      >
        {/* Search query text with dynamic sizing */}
        <Text 
          style={tw`${getTextSize(searchQuery)} font-semibold text-gray-900`}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.7}
          ellipsizeMode="tail"
        >
          {searchQuery}
        </Text>
        
        {/* Pill-Style Chevron Button - right next to text */}
        <View style={[
          tw`w-5 h-5 rounded-full items-center justify-center border ml-2`,
          {
            backgroundColor: isChevronPressed ? TURQUOISE_LIGHT : TURQUOISE_SUBTLE,
            borderColor: isChevronPressed ? TURQUOISE : TURQUOISE_BORDER,
            borderWidth: isChevronPressed ? 1.5 : 1,
            shadowColor: isChevronPressed ? TURQUOISE : '#000',
            shadowOffset: {
              width: 0,
              height: isChevronPressed ? 2 : 1,
            },
            shadowOpacity: isChevronPressed ? 0.2 : 0.08,
            shadowRadius: isChevronPressed ? 4 : 2,
            elevation: isChevronPressed ? 4 : 2,
          }
        ]}>
          <Ionicons 
            name="chevron-forward" 
            size={12} 
            color={isChevronPressed ? TURQUOISE_DARK : '#4B5563'} 
          />
        </View>
      </TouchableOpacity>

      {/* Hotel Cards Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`px-1`}
        decelerationRate="fast"
      >
        {hotels.map((hotel, hotelIndex) => (
          <View
            key={`${hotel.id}-${hotelIndex}`}
            style={[
              { marginRight: cardMargin, width: cardWidth }
            ]}
          >
            <HotelCard
              hotel={hotel}
              onPress={() => handleHotelPress(hotel)}
              index={hotelIndex}
            />
          </View>
        ))}
        
        {/* Add proper padding at the end */}
        <View style={tw`w-6`} />
      </ScrollView>
    </Animated.View>
  );
};

export default NewSearchQueryCarousel;