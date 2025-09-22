// LocationSlide.tsx - Updated with permanent map caching
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Platform,
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

  // Create cache key from coordinates
  const cacheKey = hotel.latitude && hotel.longitude 
    ? `${hotel.latitude.toFixed(6)}-${hotel.longitude.toFixed(6)}` 
    : null;

  // Generate static map URL
  const generateStaticMapUrl = () => {
    if (!hotel.latitude || !hotel.longitude) {
      return null;
    }

    const zoom = 12;
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

  // Check cache and generate map when slide becomes visible
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
      console.log('📍 Using cached map for', hotel.name, 'loaded:', cached.loaded);
      return;
    }

    // Generate new map if not cached or expired
    if (!staticMapGenerated) {
      const mapUrl = generateStaticMapUrl();
      
      if (mapUrl) {
        setStaticMapUri(mapUrl);
        setStaticMapGenerated(true);
        setMapError(false);
        // Don't set mapSuccessfullyLoaded yet - wait for onLoad
        
        console.log('📍 Generated new map for', hotel.name);
      }
    }
  }, [isVisible, cacheKey, hotel.latitude, hotel.longitude, staticMapGenerated]);

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

  const getLocationDisplayText = () => {
    if (hotel.city && hotel.country) {
      return `${hotel.city}, ${getCountryName(hotel.country)}`;
    }
    if (hotel.fullAddress) {
      return hotel.fullAddress;
    }
    return hotel.location;
  };

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

  // NEW: Modified logic - once map is loaded, always use it
  const getDisplayImage = () => {
    // If we have coordinates and the map was successfully loaded, always use the map
    if (hotel.latitude && hotel.longitude && mapSuccessfullyLoaded && staticMapUri && !mapError) {
      return staticMapUri;
    }
    
    // If we're visible and generating a map, show the map (even during initial load)
    if (isVisible && hotel.latitude && hotel.longitude && staticMapGenerated && staticMapUri && !mapError) {
      return staticMapUri;
    }
    
    // Otherwise use fallback
    return getFallbackImage();
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
      {/* Background Image */}
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

      {/* Map loaded successfully indicator */}
      {mapSuccessfullyLoaded && staticMapUri && (
        <View style={[
          tw`absolute top-4 right-4 bg-black/50 border border-green-400/20 rounded-lg p-1 flex-row items-center z-10`,
        ]}>
          <Ionicons name="map" size={10} color="#10B981" />
          <Text style={tw`text-white text-[8px] font-semibold ml-1`}>
            Map View
          </Text>
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