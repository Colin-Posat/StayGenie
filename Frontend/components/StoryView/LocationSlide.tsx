
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { formatLocationDisplay, getCountryName } from '../../utils/countryMapping';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiY29saW5wb3NhdCIsImEiOiJjbWN3bzN2azEwMnQxMmxwdmloZ2tjbHJlIn0.F9z35Dybj12dAsSpBnMZJA';

// Enhanced cache to store both map URLs and loaded state
const mapCache = new Map<string, { 
  uri: string; 
  timestamp: number; 
  loaded: boolean; // NEW: Track if map was successfully loaded
}>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface Hotel {
  id: string;
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
  images?: string[];
  photoGalleryImages?: string[]; // ADD: Photo gallery images array
  allHotelInfo?: string;
  firstRoomImage?: string | null;
  secondRoomImage?: string | null;
  
  // AI-powered fields from two-stage API
  aiExcerpt?: string;
  whyItMatches?: string;
  funFacts?: string[];
  aiMatchPercent?: number;
  matchType?: string;
  aiSafetyRating?: number;
  safetyJustification?: string;

  // Enhanced pricing structure from two-stage API
  pricePerNight?: {
    amount: number;
    totalAmount: number;
    currency: string;
    display: string;
    provider: string | null;
    isSupplierPrice: boolean;
  } | null;
  
  // Location and amenity data from two-stage API
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  topAmenities?: string[];
  nearbyAttractions?: string[];
  locationHighlight?: string;
  hasAvailability?: boolean;
  totalRooms?: number;
  fullDescription?: string;
  fullAddress?: string;
  
  // Guest insights and sentiment (may be loading initially)
  guestInsights?: string;
  sentimentPros?: string[];
  sentimentCons?: string[];
  
  // Category ratings
  categoryRatings?: {
    cleanliness: number;
    service: number;
    location: number;
    roomQuality: number;
  };
  thirdImageHd?: string | null;
  
  // Room availability
  roomTypes?: any[];
  
  // Refundable policy fields
  isRefundable?: boolean;
  refundableTag?: string | null;
  refundableInfo?: string;
  
  // Fields needed for deep linking
  placeId?: string; // Google Place ID for destination
  
  // NEW: Placeholder support
  isPlaceholder?: boolean;
}

interface EnhancedHotel extends Hotel {
  images: string[];
  mapImage: string;
  photoGalleryImages: string[]; // ADD: Ensure photo gallery is in enhanced hotel
  firstRoomImage?: string | null;
  secondRoomImage?: string | null;
}

interface SwipeableHotelStoryCardProps {
  hotel: EnhancedHotel;
  onSave?: () => void;
  onViewDetails: () => void;
  onHotelPress: () => void;
  index: number;
  totalCount: number;
  checkInDate?: Date;
  checkOutDate?: Date;
  adults?: number;
  children?: number;
  // Two-stage API props
  isInsightsLoading?: boolean;
  insightsStatus?: 'loading' | 'partial' | 'complete';
  searchMode?: 'test' | 'two-stage' | 'legacy';
  // Props for deep linking
  placeId?: string;
  occupancies?: any[];
  searchParams?: any;
  topAmenities?: string[];
  
  // ADD THESE SAFETY RATING PROPS:
  safetyRating?: number;
  safetyJustification?: string;
  safetySource?: string;
  hasAISafetyRating?: boolean;
  showSafetyRating?: boolean;
  safetyRatingThreshold?: number;
  onFavoriteSuccess?: (hotelName: string) => void;
}

interface LocationSlideProps {
  hotel: EnhancedHotel;
  insightsStatus?: string;
  isVisible?: boolean;
}

const LocationSlide: React.FC<LocationSlideProps> = ({ 
  hotel, 
  insightsStatus = 'complete',
  isVisible = false 
}) => {
  const [staticMapGenerated, setStaticMapGenerated] = useState(false);
  const [staticMapUri, setStaticMapUri] = useState<string | null>(null);
  const [mapSuccessfullyLoaded, setMapSuccessfullyLoaded] = useState(false); // NEW: Track successful load
  const [showInteractiveMap, setShowInteractiveMap] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(12); // NEW: Track current zoom level

  // Create cache key from coordinates and zoom level
  const cacheKey = hotel.latitude && hotel.longitude 
    ? `${hotel.latitude.toFixed(6)}-${hotel.longitude.toFixed(6)}-z${currentZoom}` 
    : null;

  // Generate static map URL with zoom parameter
  const generateStaticMapUrl = (zoom: number = currentZoom) => {
    if (!hotel.latitude || !hotel.longitude) {
      return null;
    }

    const width = 600;
    const height = 400;
    const retina = '@2x';

    const lat = parseFloat(hotel.latitude.toString()).toFixed(6);
    const lng = parseFloat(hotel.longitude.toString()).toFixed(6);
    const marker = `pin-s+ff0000(${lng},${lat})`;
    
    const baseUrl = 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static';
    const center = `${lng},${lat},${zoom}`;
    const size = `${width}x${height}${retina}`;
    
    return `${baseUrl}/${marker}/${center}/${size}?access_token=${MAPBOX_ACCESS_TOKEN}`;
  };

  // Check cache and generate map when slide becomes visible or zoom changes
  useEffect(() => {
    if (!isVisible || !cacheKey || !hotel.latitude || !hotel.longitude) {
      return;
    }

    // Check cache first
    const cached = mapCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      // Use cached version
      setStaticMapUri(cached.uri);
      setStaticMapGenerated(true);
      setMapSuccessfullyLoaded(cached.loaded); // NEW: Restore loaded state from cache
      setMapError(false);
      console.log('📍 Using cached map for', hotel.name, 'zoom:', currentZoom, 'loaded:', cached.loaded);
      return;
    }

    // Generate new map if not cached or expired
    setStaticMapGenerated(false);
    setMapSuccessfullyLoaded(false);
    
    const mapUrl = generateStaticMapUrl(currentZoom);
    
    if (mapUrl) {
      setStaticMapUri(mapUrl);
      setStaticMapGenerated(true);
      setMapError(false);
      // Don't set mapSuccessfullyLoaded yet - wait for onLoad
      
      console.log('📍 Generated new map for', hotel.name, 'zoom:', currentZoom);
    }
  }, [isVisible, cacheKey, hotel.latitude, hotel.longitude, currentZoom]);

  // Clean up old cache entries periodically
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      for (const [key, value] of mapCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
          mapCache.delete(key);
        }
      }
    };

    // Clean up every hour
    const interval = setInterval(cleanup, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fallback image logic
  const getFallbackImage = () => {
    if (hotel.images && hotel.images.length > 1) {
      return hotel.images[1];
    }
    return hotel.images?.[0] || hotel.image;
  };

  // NEW: Map loading animation component
  const MapLoadingAnimation = () => {
    const pulseAnim1 = useRef(new Animated.Value(0.8)).current;
    const pulseAnim2 = useRef(new Animated.Value(0.8)).current;
    const pulseAnim3 = useRef(new Animated.Value(0.8)).current;
    const scanAnim = useRef(new Animated.Value(0)).current;
    const bounceAnim1 = useRef(new Animated.Value(0)).current;
    const bounceAnim2 = useRef(new Animated.Value(0)).current;
    const bounceAnim3 = useRef(new Animated.Value(0)).current;
    const pinPulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      // Pulse animations for radar circles
      const createPulseAnimation = (animValue: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: 1.5,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0.8,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
      };

      // Scanning line animation
      const scanAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      // Bouncing dots animation
      const createBounceAnimation = (animValue: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: -4,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ])
        );
      };

      // Pin pulse animation
      const pinPulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pinPulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pinPulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      // Start all animations
      Animated.parallel([
        createPulseAnimation(pulseAnim1, 0),
        createPulseAnimation(pulseAnim2, 500),
        createPulseAnimation(pulseAnim3, 1000),
        scanAnimation,
        createBounceAnimation(bounceAnim1, 0),
        createBounceAnimation(bounceAnim2, 200),
        createBounceAnimation(bounceAnim3, 400),
        pinPulseAnimation,
      ]).start();
    }, []);

    return (
      <View style={tw`flex-1 relative overflow-hidden`}>
        {/* Background gradient */}
        <View style={tw`absolute inset-0 bg-gray-600`}>
          <View style={tw`absolute inset-0 bg-gradient-to-br from-gray-500 to-gray-700`} />
        </View>

        {/* Grid background */}
        <View style={tw`absolute inset-0`}>
          {/* Horizontal grid lines */}
          {Array.from({ length: 8 }).map((_, i) => (
            <View 
              key={`h-${i}`} 
              style={[
                tw`absolute left-0 right-0 border-t border-gray-300/30`,
                { top: `${(i + 1) * 12.5}%` }
              ]} 
            />
          ))}
          {/* Vertical grid lines */}
          {Array.from({ length: 6 }).map((_, i) => (
            <View 
              key={`v-${i}`} 
              style={[
                tw`absolute top-0 bottom-0 border-l border-gray-300/30`,
                { left: `${(i + 1) * 16.67}%` }
              ]} 
            />
          ))}
        </View>

        {/* Pulsing radar circles */}
        <View style={tw`absolute inset-0 items-center justify-center`}>
          <Animated.View
            style={[
              tw`absolute border-2 border-gray-200/50 rounded-full`,
              {
                width: 120,
                height: 120,
                transform: [{ scale: pulseAnim1 }],
                opacity: pulseAnim1.interpolate({
                  inputRange: [0.8, 1.5],
                  outputRange: [1, 0],
                }),
              }
            ]}
          />
          <Animated.View
            style={[
              tw`absolute border-2 border-gray-200/50 rounded-full`,
              {
                width: 160,
                height: 160,
                transform: [{ scale: pulseAnim2 }],
                opacity: pulseAnim2.interpolate({
                  inputRange: [0.8, 1.5],
                  outputRange: [1, 0],
                }),
              }
            ]}
          />
          <Animated.View
            style={[
              tw`absolute border-2 border-gray-200/50 rounded-full`,
              {
                width: 200,
                height: 200,
                transform: [{ scale: pulseAnim3 }],
                opacity: pulseAnim3.interpolate({
                  inputRange: [0.8, 1.5],
                  outputRange: [1, 0],
                }),
              }
            ]}
          />
          
          {/* Center pin */}
          <Animated.View 
            style={[
              tw`bg-gray-800 w-4 h-4 rounded-full border-2 border-gray-200 shadow-lg`,
              { transform: [{ scale: pinPulseAnim }] }
            ]}
          />
        </View>

        {/* Scanning line */}
        <Animated.View 
          style={[
            tw`absolute left-0 right-0 h-0.5 bg-gray-200/70`,
            {
              transform: [{
                translateY: scanAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 400], // Adjust based on screen height
                })
              }],
              opacity: scanAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 1, 0],
              }),
            }
          ]} 
        />

        {/* Corner elements */}
        <View style={tw`absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-gray-200/70`} />
        <View style={tw`absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-gray-200/70`} />
        <View style={tw`absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-gray-200/70`} />
        <View style={tw`absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-gray-200/70`} />


      </View>
    );
  };

  // NEW: Handle zoom toggle functionality (12 ↔ 10)
  const handleZoomOut = () => {
    if (currentZoom === 12) {
      setCurrentZoom(10);
      console.log('📍 Zooming out to level 10');
    }
  };

  const handleZoomIn = () => {
    if (currentZoom === 10) {
      setCurrentZoom(12);
      console.log('📍 Zooming in to level 12');
    }
  };

  // NEW: Check zoom states
  const canZoomOut = currentZoom === 12;
  const canZoomIn = currentZoom === 10;

  const handleMapError = () => {
    setMapError(true);
    setMapSuccessfullyLoaded(false);
    // Remove from cache if there was an error
    if (cacheKey) {
      mapCache.delete(cacheKey);
    }
    console.log('📍 Map failed to load for', hotel.name);
  };

  const handleMapLoad = () => {
    // NEW: Map loaded successfully - mark as permanently loaded and cache it
    setMapSuccessfullyLoaded(true);
    setMapError(false);
    
    // Update cache with loaded state
    if (cacheKey && staticMapUri) {
      mapCache.set(cacheKey, { 
        uri: staticMapUri, 
        timestamp: Date.now(),
        loaded: true // NEW: Mark as successfully loaded
      });
      console.log('📍 Map successfully loaded and cached for', hotel.name);
    }
  };

  // NEW: Modified logic - show loading animation before map loads, then permanent map
  const getDisplayImage = (): string => {
    // If we have coordinates and the map was successfully loaded, always use the map
    if (hotel.latitude && hotel.longitude && mapSuccessfullyLoaded && staticMapUri && !mapError) {
      return staticMapUri;
    }
    
    // If we're visible and generating a map, show the map (even during initial load)
    if (isVisible && hotel.latitude && hotel.longitude && staticMapGenerated && staticMapUri && !mapError) {
      return staticMapUri;
    }
    
    // Use hotel fallback for any other case
    return getFallbackImage();
  };

  // NEW: Check if we should show the animated loading placeholder
  const shouldShowLoadingAnimation = () => {
    return hotel.latitude && 
           hotel.longitude && 
           !mapSuccessfullyLoaded && 
           !staticMapGenerated &&
           !mapError;
  };

  // NEW: Check if we should show map loading indicator
  const shouldShowLoadingIndicator = () => {
    return isVisible && 
           !mapSuccessfullyLoaded && 
           !staticMapGenerated && 
           hotel.latitude && 
           hotel.longitude && 
           !mapError;
  };

  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      {/* Background - either map image or animated loading */}
      {shouldShowLoadingAnimation() ? (
        <MapLoadingAnimation />
      ) : (
        <Image 
          source={{ uri: getDisplayImage() }} 
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
          }}
          resizeMode="cover"
          onError={handleMapError}
          onLoad={handleMapLoad}
        />
      )}
      
      {/* Simple gradient for readability */}
      <View style={tw`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent z-1`} />

      {/* Loading indicator for static map */}
      {shouldShowLoadingIndicator() && (
        <View style={[
          tw`absolute top-4 left-4 bg-black/50 border border-white/20 rounded-lg p-2 flex-row items-center z-10`,
        ]}>
          <Ionicons name="sync" size={12} color="#1df9ff" />
          <Text style={tw`text-white text-[10px] font-semibold ml-1`}>
            Loading Map...
          </Text>
        </View>
      )}

      {/* Map failed indicator */}
      {mapError && (
        <View style={[
          tw`absolute top-4 left-4 bg-black/50 border border-red-400/20 rounded-lg p-2 flex-row items-center z-10`,
        ]}>
          <Ionicons name="warning" size={12} color="#EF4444" />
          <Text style={tw`text-white text-[10px] font-semibold ml-1`}>
            Map Failed
          </Text>
        </View>
      )}

      {/* Zoom controls - show appropriate button based on current zoom */}
      {mapSuccessfullyLoaded && (
        <View style={tw`absolute top-10 right-4 z-20`}>
          {canZoomOut && (
            <TouchableOpacity
              style={[
                tw`w-8 h-8 bg-black/60 border border-white/30 rounded-full items-center justify-center`,
              ]}
              onPress={handleZoomOut}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={16} color="white" />
            </TouchableOpacity>
          )}
          
          {canZoomIn && (
            <TouchableOpacity
              style={[
                tw`w-8 h-8 bg-black/60 border border-white/30 rounded-full items-center justify-center`,
              ]}
              onPress={handleZoomIn}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Compact bottom content */}
      <View style={tw`absolute bottom-4 left-2 right-2 z-10`}>
        {hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0 ? (
          <View style={tw`bg-black/50 border border-white/20 rounded-lg p-2`}>
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons 
                name={insightsStatus === 'loading' && hotel.nearbyAttractions.some(attr => attr.includes('Loading')) ? "sync" : "compass"} 
                size={10} 
                color="#1df9ff" 
              />
              <Text style={tw`text-white text-[10px] font-semibold ml-1`}>
                Nearby
              </Text>
              {insightsStatus === 'loading' && hotel.nearbyAttractions.some(attr => attr.includes('Loading')) && (
                <Text style={tw`text-white/60 text-[10px] ml-2`}>Loading...</Text>
              )}
            </View>
            
            <View style={tw`gap-0.5`}>
              {hotel.nearbyAttractions.slice(0, 3).map((attraction, index) => (
                <Text key={index} style={tw`text-white/90 text-[10px] leading-3`} numberOfLines={3}>
                  • {attraction}
                </Text>
              ))}
              {hotel.nearbyAttractions.length > 3 && (
                <Text style={tw`text-white/70 text-[10px] mt-0.5`}>
                  +{hotel.nearbyAttractions.length - 3} more
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={tw`bg-black/50 border border-white/20 rounded-lg p-2`}>
            <View style={tw`flex-row items-center`}>
              <Ionicons name="compass" size={10} color="#1df9ff" />
              <Text style={tw`text-white/80 text-[10px] ml-1`}>
                {insightsStatus === 'loading' ? 'Finding nearby places...' : 'Exploring the area'}
              </Text>
            </View>
          </View>
        )}

        {/* Compact location highlight if available */}
        {hotel.locationHighlight && 
         !hotel.locationHighlight.includes('Analyzing') && 
         !hotel.nearbyAttractions?.some(attr => attr.includes(hotel.locationHighlight?.substring(0, 200) || '')) && (
          <View style={tw`bg-black/50 border border-white/20 rounded-lg p-2 mt-1`}>
            <Text style={tw`text-white/90 text-[10px] leading-3`} numberOfLines={2}>
              💡 {hotel.locationHighlight}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default LocationSlide;