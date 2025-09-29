// SearchQueryCarousel.tsx - Opens booking link on card click
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import * as WebBrowser from 'expo-web-browser';

const { width } = Dimensions.get('window');
const TURQUOISE = '#1df9ff';
const TURQUOISE_DARK = '#00d4e6';
const DEEP_LINK_BASE_URL = 'https://staygenie.nuitee.link';

const cardWidth = 170;
const cardHeight = 170;
const cardMargin = 12;

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
  placeId?: string;
  tags?: string[];
  isRefundable?: boolean;
}

const openInAppBrowser = async (url: string) => {
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      dismissButtonStyle: 'done',
      showTitle: true,
      toolbarColor: '#ffffff',
      controlsColor: '#000000ff',
      enableBarCollapsing: true,
      secondaryToolbarColor: '#f6f6f6',
      showInRecents: false,
    });
  } catch (e) {
    try { 
      const { Linking } = require('react-native');
      await Linking.openURL(url); 
    } catch {}
  }
};

// Generate booking deep link with next month's dates
const generateBookingDeepLink = (hotel: Hotel): string => {
  let url = `${DEEP_LINK_BASE_URL}/hotels/${hotel.id}`;
  const params = new URLSearchParams();

  // Calculate dates for next month (30 days from now for 3 nights)
  const today = new Date();
  const checkIn = new Date(today);
  checkIn.setDate(today.getDate() + 30);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkIn.getDate() + 3);

  const checkinStr = checkIn.toISOString().split('T')[0];
  const checkoutStr = checkOut.toISOString().split('T')[0];

  if (hotel.placeId) {
    params.append('placeId', hotel.placeId);
  }

  params.append('checkin', checkinStr);
  params.append('checkout', checkoutStr);

  // Default occupancy: 2 adults
  const defaultOccupancy = [{ adults: 2, children: [] }];
  try {
    const occupanciesString = btoa(JSON.stringify(defaultOccupancy));
    params.append('occupancies', occupanciesString);
  } catch (error) {
    console.warn('Failed to encode occupancy:', error);
  }

  // Add special tags if present
  if (hotel.tags?.includes('All Inclusive')) {
    params.append('needAllInclusive', '1');
  }
  if (hotel.tags?.includes('Breakfast Included')) {
    params.append('needBreakfast', '1');
  }
  if (hotel.isRefundable) {
    params.append('needFreeCancellation', '1');
  }

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
};

// Image cache
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
  isVisible,
}) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

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
      onLoadStart={() => { 
        if (!isCached) onLoadStart?.(); 
      }}
      onLoad={() => {
        ImageCache.markImageCached(source.uri);
        setImageLoaded(true);
        onLoad?.();
      }}
      onError={(e) => { 
        onError?.(); 
      }}
      onLoadEnd={() => { 
        onLoadEnd?.(); 
      }}
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
  const scaleAnimation = useRef(new Animated.Value(1.02)).current;
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const threshold = 150 + (index * 50);
  const { isVisible, elementRef, hasLoaded } = useLazyLoading(threshold);

  useEffect(() => {
    if (isVisible && !hasLoaded) {
      setImageLoading(true);
      setImageError(false);
      setImageLoaded(false);
    }
  }, [isVisible, hasLoaded]);

  useEffect(() => {
    if (isVisible && imageLoaded && !imageError) {
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
  }, [panAnimation, scaleAnimation, isVisible, imageLoaded, imageError]);

  const translateX = panAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-3, 3],
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

  // UPDATED: Now opens booking link instead of Google Maps
  const handlePress = async () => {
    try {
      const bookingLink = generateBookingDeepLink(hotel);
      console.log(`🏨 Opening booking link in-app: ${bookingLink}`);
      await openInAppBrowser(bookingLink);
      onPress(); // Still call the original onPress for any additional functionality
    } catch (error) {
      console.error('Error opening booking link:', error);
      Alert.alert('Unable to Open Booking', 'Please check your internet connection and try again.', [
        { text: 'OK', onPress: () => onPress() },
      ]);
    }
  };

  const handleImageLoadStart = () => {
    setImageLoading(true);
    setImageError(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    setImageLoaded(false);
  };

  const handleImageLoadEnd = () => {
    setImageLoading(false);
  };

  return (
    <View
      ref={elementRef}
      style={[
        tw`rounded-2xl overflow-hidden`,
        {
          width: cardWidth,
          height: cardHeight,
          backgroundColor: '#f8f9fa',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 6,
        }
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.95}
        style={[
          tw`rounded-2xl overflow-hidden`,
          { width: '100%', height: '100%', backgroundColor: 'transparent' }
        ]}
      >
        <View style={[
          tw`flex-1 relative overflow-hidden`,
          { backgroundColor: imageError ? '#f3f4f6' : 'transparent' }
        ]}>
          {isVisible ? (
            !imageError ? (
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    width: '108%',
                    height: '108%',
                    left: '-4%',
                    top: '-4%',
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
                  onLoadStart={handleImageLoadStart}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  onLoadEnd={handleImageLoadEnd}
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

          {imageLoading && !imageError && !imageLoaded && isVisible && (
            <View style={tw`absolute inset-0 items-center justify-center bg-black/20`}>
              <ActivityIndicator size="small" color={TURQUOISE} />
            </View>
          )}
          
          {imageLoaded && !imageError && isVisible && (
            <View style={tw`absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/70 to-transparent`} />
          )}

          {/* Price Badge */}
          <View style={tw`absolute top-3 right-3`}>
            <View style={[
              tw`px-2.5 py-1.5 rounded-xl border`,
              {
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.3,
                shadowRadius: 2,
              }
            ]}>
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

          {/* Hotel name */}
          <View style={tw`absolute bottom-3 left-3 right-3`}>
            <View style={[
              tw`px-2.5 py-2 rounded-xl border`,
              {
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(3px)',
              }
            ]}>
              <Text 
                style={[
                  tw`text-white text-xs font-semibold leading-tight text-center`,
                  {
                    textShadowColor: 'rgba(0, 0, 0, 0.8)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2
                  }
                ]}
                numberOfLines={3}
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
  onSearchPress: (query: string) => void;
  onHotelPress?: (hotel: Hotel) => void;
  index?: number;
  searchQuery: string;
  hotels: Hotel[];
}

const SearchQueryCarousel: React.FC<SearchQueryCarouselProps> = ({
  onSearchPress,
  onHotelPress,
  index = 0,
  searchQuery,
  hotels
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

  useEffect(() => {
    if (hotels && hotels.length > 0) {
      const imageUris = hotels.map(hotel => hotel.image).filter(Boolean);
      ImageCache.preloadImages(imageUris);
    }
  }, [hotels]);

  const handleSearchPress = () => {
    setIsChevronPressed(true);
    setTimeout(() => setIsChevronPressed(false), 150);
    onSearchPress(searchQuery);
  };

  const handleHotelPress = (hotel: Hotel) => {
    onHotelPress?.(hotel);
  };

  if (!searchQuery || !hotels || hotels.length === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        tw`w-full mb-6`,
        {
          opacity: fadeAnimation,
          transform: [{ translateY: slideAnimation }],
        },
      ]}
    >
      {/* Search Query Header */}
      <TouchableOpacity
        onPress={handleSearchPress}
        activeOpacity={0.8}
        style={[
          tw`ml-1 mr-2 mb-4 px-2.4 py-2.5 rounded-xl border bg-white border-gray-200`,
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isChevronPressed ? 0.15 : 0.1,
            shadowRadius: isChevronPressed ? 3 : 2,
            elevation: isChevronPressed ? 4 : 3,
            borderColor: isChevronPressed ? TURQUOISE : '#E5E7EB',
            borderWidth: isChevronPressed ? 2 : 1,
          }
        ]}
      >
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-1 mr-3`}>
            <Text 
              style={[
                tw`text-sm font-medium text-gray-800 leading-snug`,
                { lineHeight: 18 }
              ]}
              numberOfLines={2}
            >
              {searchQuery}
            </Text>
          </View>
          
          <View style={[
            tw`w-6 h-6 rounded-full items-center justify-center`,
            {
              backgroundColor: isChevronPressed ? TURQUOISE : 'rgba(29, 249, 255, 0.15)',
              transform: [{ scale: isChevronPressed ? 1.1 : 1 }],
            }
          ]}>
            <Ionicons 
              name="arrow-forward" 
              size={14} 
              color={isChevronPressed ? 'white' : TURQUOISE_DARK} 
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Hotels Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`pl-1 pr-2`}
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
        
        <View style={tw`w-6`} />
      </ScrollView>
    </Animated.View>
  );
};

export default SearchQueryCarousel;