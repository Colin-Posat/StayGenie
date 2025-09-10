// FavoriteHotelCard.tsx - Updated with single AI Insights dropdown
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Alert,
  Linking,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { FavoritedHotel } from '../../utils/FavoritesCache';
import { formatLocationDisplay, getCountryName } from '../../utils/countryMapping';
import HotelChatOverlay from '../../components/HomeScreenTop/HotelChatOverlay';

// Turquoise color constants
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';

// Base deep link URL
const DEEP_LINK_BASE_URL = 'https://staygenie.nuitee.link';

interface FavoriteHotelCardProps {
  hotel: FavoritedHotel;
  onPress: (hotel: FavoritedHotel) => void;
  onRemove: (hotel: FavoritedHotel) => void;
  index: number;
  checkInDate?: Date;
  checkOutDate?: Date;
  adults?: number;
  children?: number;
  placeId?: string;
  occupancies?: any[];
}

// Helper function to generate hotel deep link URL
const generateHotelDeepLink = (
  hotel: FavoritedHotel,
  checkInDate?: Date,
  checkOutDate?: Date,
  adults: number = 2,
  children: number = 0,
  placeId?: string,
  occupancies?: any[]
): string => {
  let url = `${DEEP_LINK_BASE_URL}/hotels/${hotel.id}`;
  const params = new URLSearchParams();

  if (placeId || hotel.placeId) {
    params.append('placeId', placeId || hotel.placeId!);
  }

  if (checkInDate) {
    params.append('checkin', checkInDate.toISOString().split('T')[0]);
  }
  if (checkOutDate) {
    params.append('checkout', checkOutDate.toISOString().split('T')[0]);
  }

  if (occupancies && occupancies.length > 0) {
    try {
      const occupanciesString = btoa(JSON.stringify(occupancies));
      params.append('occupancies', occupanciesString);
    } catch (error) {
      console.warn('Failed to encode occupancies:', error);
    }
  } else if (adults || children) {
    const defaultOccupancy = [{ adults, children: children > 0 ? [children] : [] }];
    try {
      const occupanciesString = btoa(JSON.stringify(defaultOccupancy));
      params.append('occupancies', occupanciesString);
    } catch (error) {
      console.warn('Failed to encode default occupancy:', error);
    }
  }

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

// Helper function to generate Google Maps link
const generateGoogleMapsLink = (hotel: FavoritedHotel, checkin?: Date, checkout?: Date, adults: number = 2, children: number = 0): string => {
  let query = '';

  const locationText = hotel.city && hotel.country 
    ? `${hotel.name} ${hotel.city} ${hotel.country}`
    : hotel.fullAddress 
    ? `${hotel.name} ${hotel.fullAddress}`
    : `${hotel.name} ${hotel.location}`;
  query = encodeURIComponent(locationText);
  
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

// Simple confirmation modal
interface ConfirmationModalProps {
  isVisible: boolean;
  hotelName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isVisible,
  hotelName,
  onConfirm,
  onCancel,
}) => {
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <View style={tw`rounded-2xl absolute inset-0 items-center justify-center z-50 bg-black/50`}>
      <Animated.View
        style={[
          tw`bg-white rounded-2xl p-6 mx-6 shadow-xl`,
          { 
            transform: [{ scale: scaleAnimation }],
            opacity: fadeAnimation,
          }
        ]}
      >
        <Text style={tw`text-lg font-semibold text-black mb-2`}>
          Remove from Favorites
        </Text>
        <Text style={tw`text-gray-600 text-sm mb-6`}>
          Remove "{hotelName}" from your favorites?
        </Text>
        
        <View style={tw`flex-row justify-end gap-3`}>
          <TouchableOpacity
            style={tw`px-6 py-3 rounded-xl bg-gray-100`}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={tw`text-gray-700 font-medium`}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={tw`px-6 py-3 rounded-xl bg-red-500`}
            onPress={onConfirm}
            activeOpacity={0.7}
          >
            <Text style={tw`text-white font-medium`}>Remove</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const getRatingColor = (rating: number): string => {
  if (rating >= 8.0) return TURQUOISE;
  if (rating >= 7.0) return TURQUOISE + 'E6';
  if (rating >= 6.0) return TURQUOISE + 'CC';
  if (rating >= 5.0) return TURQUOISE + 'B3';
  if (rating >= 4.0) return TURQUOISE + '99';
  return TURQUOISE + '80';
};

// AI Insights Dropdown Component
interface AIInsightsDropdownProps {
  hotel: FavoritedHotel;
  isExpanded: boolean;
  onToggle: () => void;
}

const AIInsightsDropdown: React.FC<AIInsightsDropdownProps> = ({
  hotel,
  isExpanded,
  onToggle
}) => {
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue: isExpanded ? 1 : 0,
        duration: 300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnimation, {
        toValue: isExpanded ? 1 : 0,
        duration: 300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isExpanded]);

  const rotateInterpolate = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Get category ratings with fallbacks
  const getRatings = () => {
    if (hotel.categoryRatings) {
      return hotel.categoryRatings;
    }
    
    // Parse from guestInsights if available
    if (hotel.guestInsights && !hotel.guestInsights.includes('Loading')) {
      try {
        const defaultRatings = {
          cleanliness: 6.0,
          service: 6.0,
          location: 6.0,
          roomQuality: 6.0
        };

        const lines = hotel.guestInsights.split('\n');
        const ratings = { ...defaultRatings };

        lines.forEach((line: string) => {
          if (line.includes('Cleanliness:')) {
            const match = line.match(/(\d+\.?\d*)/);
            if (match) ratings.cleanliness = parseFloat(match[1]);
          } else if (line.includes('Service:')) {
            const match = line.match(/(\d+\.?\d*)/);
            if (match) ratings.service = parseFloat(match[1]);
          } else if (line.includes('Location:')) {
            const match = line.match(/(\d+\.?\d*)/);
            if (match) ratings.location = parseFloat(match[1]);
          } else if (line.includes('Room Quality:')) {
            const match = line.match(/(\d+\.?\d*)/);
            if (match) ratings.roomQuality = parseFloat(match[1]);
          }
        });

        return ratings;
      } catch (error) {
        console.warn('Failed to parse ratings:', error);
      }
    }
    
    // Ultimate fallback: mock ratings based on overall rating
    const baseRating = hotel.rating || 6.0;
    return {
      cleanliness: Math.min(10, baseRating + 0.2),
      service: Math.min(10, baseRating - 0.1),
      location: Math.min(10, baseRating + 0.3),
      roomQuality: Math.min(10, baseRating - 0.2)
    };
  };

  const ratings = getRatings();

  const generateAIInsight = (): string => {
    if (hotel.whyItMatches && !hotel.whyItMatches.includes('progress') && !hotel.whyItMatches.includes('loading')) {
      return hotel.whyItMatches;
    }
    
    if (hotel.aiExcerpt && !hotel.aiExcerpt.includes('progress')) {
      return hotel.aiExcerpt;
    }

    if (hotel.locationHighlight && !hotel.locationHighlight.includes('Analyzing')) {
      return hotel.locationHighlight;
    }

    return "This hotel perfectly matches your preferences with its excellent location, premium amenities, and outstanding guest reviews. The combination of comfort, style, and convenience makes it an ideal choice for your stay.";
  };

  const mockNearbyAttractions = hotel.nearbyAttractions?.length ? hotel.nearbyAttractions : [
    "City Center • 0.2 mi",
    "Main Shopping District • 0.5 mi", 
    "Historic Quarter • 0.8 mi",
    "Transportation Hub • 1.1 mi"
  ];

  return (
    <View style={tw`bg-white border-t border-gray-50`}>
      <TouchableOpacity
        style={tw`flex-row items-center justify-between px-4 py-3`}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={tw`flex-row items-center`}>
          <View style={[tw`w-6 h-6 rounded-full items-center justify-center mr-3`, { backgroundColor: TURQUOISE + '20' }]}>
            <Ionicons name="information-circle" size={12} color={TURQUOISE_DARK} />
          </View>
          <Text style={tw`text-gray-900 font-medium text-sm`}>
            View More Details
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons name="chevron-up" size={16} color="#9CA3AF" />
        </Animated.View>
      </TouchableOpacity>
      
      <Animated.View 
        style={[
          tw`overflow-hidden`,
          { 
            maxHeight: animatedHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 500],
            }),
            opacity: animatedHeight,
          }
        ]}
      >
        <View style={tw`px-4 pb-4`}>

          {/* Category Ratings */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-gray-900 font-medium text-sm mb-3`}>Guest Ratings</Text>
            <View style={tw`gap-2`}>
              <View style={tw`flex-row gap-2`}>
                <View style={tw`flex-1 bg-gray-50 border border-gray-100 rounded-lg p-2 flex-row items-center`}>
                  <View 
                    style={[
                      tw`w-7 h-7 rounded-full items-center justify-center`,
                      { backgroundColor: getRatingColor(ratings.cleanliness) }
                    ]}
                  >
                    <Text 
                      style={[
                        tw`text-xs font-bold`,
                        { 
                          color: '#FFFFFF',
                          textShadowColor: '#000000',
                          textShadowOffset: { width: 0.5, height: 0.5 },
                          textShadowRadius: 1
                        }
                      ]}
                    >
                      {ratings.cleanliness.toFixed(1)}
                    </Text>
                  </View>
                  <Text style={tw`text-gray-800 text-xs font-medium ml-2 flex-1`}>Cleanliness</Text>
                </View>

                <View style={tw`flex-1 bg-gray-50 border border-gray-100 rounded-lg p-2 flex-row items-center`}>
                  <View 
                    style={[
                      tw`w-7 h-7 rounded-full items-center justify-center`,
                      { backgroundColor: getRatingColor(ratings.service) }
                    ]}
                  >
                    <Text 
                      style={[
                        tw`text-xs font-bold`,
                        { 
                          color: '#FFFFFF',
                          textShadowColor: '#000000',
                          textShadowOffset: { width: 0.5, height: 0.5 },
                          textShadowRadius: 1
                        }
                      ]}
                    >
                      {ratings.service.toFixed(1)}
                    </Text>
                  </View>
                  <Text style={tw`text-gray-800 text-xs font-medium ml-2 flex-1`}>Service</Text>
                </View>
              </View>

              <View style={tw`flex-row gap-2`}>
                <View style={tw`flex-1 bg-gray-50 border border-gray-100 rounded-lg p-2 flex-row items-center`}>
                  <View 
                    style={[
                      tw`w-7 h-7 rounded-full items-center justify-center`,
                      { backgroundColor: getRatingColor(ratings.location) }
                    ]}
                  >
                    <Text 
                      style={[
                        tw`text-xs font-bold`,
                        { 
                          color: '#FFFFFF',
                          textShadowColor: '#000000',
                          textShadowOffset: { width: 0.5, height: 0.5 },
                          textShadowRadius: 1
                        }
                      ]}
                    >
                      {ratings.location.toFixed(1)}
                    </Text>
                  </View>
                  <Text style={tw`text-gray-800 text-xs font-medium ml-2 flex-1`}>Location</Text>
                </View>

                <View style={tw`flex-1 bg-gray-50 border border-gray-100 rounded-lg p-2 flex-row items-center`}>
                  <View 
                    style={[
                      tw`w-7 h-7 rounded-full items-center justify-center`,
                      { backgroundColor: getRatingColor(ratings.roomQuality) }
                    ]}
                  >
                    <Text 
                      style={[
                        tw`text-xs font-bold`,
                        { 
                          color: '#FFFFFF',
                          textShadowColor: '#000000',
                          textShadowOffset: { width: 0.5, height: 0.5 },
                          textShadowRadius: 1
                        }
                      ]}
                    >
                      {ratings.roomQuality.toFixed(1)}
                    </Text>
                  </View>
                  <Text style={tw`text-gray-800 text-xs font-medium ml-2 flex-1`}>Rooms</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Nearby Attractions */}
          <View>
            <Text style={tw`text-gray-900 font-medium text-sm mb-3`}>Nearby Attractions</Text>
            <View style={tw`bg-gray-50 p-3 rounded-xl`}>
              {mockNearbyAttractions.slice(0, 4).map((attraction: string, index: number) => (
                <View key={index} style={tw`flex-row items-center ${index === 0 ? '' : 'mt-2'}`}>
                  <View style={[tw`w-1.5 h-1.5 rounded-full mr-2`, { backgroundColor: TURQUOISE }]} />
                  <Text style={tw`text-gray-700 text-sm flex-1`}>
                    {attraction}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const FavoriteHotelCard: React.FC<FavoriteHotelCardProps> = ({
  hotel,
  onPress,
  onRemove,
  index,
  checkInDate,
  checkOutDate,
  adults = 2,
  children = 0,
  placeId,
  occupancies
}) => {
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
const [showHotelChat, setShowHotelChat] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 400 + (index * 80),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index]);

  const handleRemove = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmRemove = () => {
    setShowConfirmModal(false);
    onRemove(hotel);
  };

  const handleCancelRemove = () => {
    setShowConfirmModal(false);
  };

  // Handle View Details (Google Maps)
  const handleViewDetails = async () => {
    try {
      const mapsLink = generateGoogleMapsLink(
        hotel,
        checkInDate,
        checkOutDate,
        adults,
        children
      );

      const canOpen = await Linking.canOpenURL(mapsLink);
      
      if (canOpen) {
        await Linking.openURL(mapsLink);
      } else {
        let fallbackQuery = '';
        if (hotel.latitude && hotel.longitude) {
          fallbackQuery = `${hotel.latitude},${hotel.longitude}`;
        } else if (hotel.city && hotel.country) {
          fallbackQuery = encodeURIComponent(`${hotel.name} ${hotel.city} ${hotel.country}`);
        } else {
          fallbackQuery = encodeURIComponent(`${hotel.name} ${hotel.location}`);
        }
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${fallbackQuery}`;
        await Linking.openURL(fallbackUrl);
      }
    } catch (error) {
      console.error('Error opening Google Maps:', error);
      Alert.alert(
        'Unable to Open Maps',
        'Could not open Google Maps. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle Book Now (Deep Link)
  const handleBookNow = async () => {
    try {
      const deepLinkUrl = generateHotelDeepLink(
        hotel,
        checkInDate,
        checkOutDate,
        adults,
        children,
        placeId,
        occupancies
      );

      const canOpen = await Linking.canOpenURL(deepLinkUrl);
      
      if (canOpen) {
        await Linking.openURL(deepLinkUrl);
      } else {
        Alert.alert(
          'Unable to Open Booking',
          'Could not open the hotel booking page. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening booking link:', error);
      Alert.alert(
        'Error',
        'Failed to open hotel booking page. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const getDisplayPrice = () => {
    if (hotel.pricePerNight) {
      const getCurrencySymbol = (currencyCode: string) => {
        switch (currencyCode.toUpperCase()) {
          case 'USD': return '$';
          case 'EUR': return '€';
          case 'GBP': return '£';
          case 'JPY': return '¥';
          case 'CAD': return 'C$';
          case 'AUD': return 'A$';
          default: return currencyCode;
        }
      };
      
      return `${getCurrencySymbol(hotel.pricePerNight.currency)}${hotel.pricePerNight.amount}`;
    }
    return `${hotel.price}`;
  };

  const getLocationDisplay = () => {
    if (hotel.city) {
      return hotel.city;
    }
    return hotel.location;
  };

  return (
    <Animated.View
      style={[
        tw`mb-4`,
        { opacity: fadeAnimation }
      ]}
    >
      {/* MOVE THE DROPDOWN INSIDE THIS CONTAINER */}
      <View
  style={[
    tw`bg-white rounded-2xl overflow-hidden border border-gray-100`,
    {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 4, // Android
    },
  ]}
>
        <TouchableOpacity
          onPress={() => onPress(hotel)}
          activeOpacity={0.98}
        >
          {/* Main Card Content */}
          <View style={tw`flex-row`}>
            {/* Hotel Image */}
            <View style={tw`relative w-32 h-32`}>
              <Image
                source={{ uri: hotel.image }}
                style={tw`w-full h-full`}
                resizeMode="cover"
              />
              {/* Rating badge on image */}
              <View 
                style={[
                  tw`absolute top-2 left-2 px-2 py-1 rounded-lg flex-row items-center`,
                  { backgroundColor: 'rgba(0, 0, 0, 0.7)' }
                ]}
              >
                <View 
                  style={[
                    tw`w-4 h-4 rounded-full items-center justify-center mr-1`,
                    { backgroundColor: getRatingColor(hotel.rating || 0) }
                  ]}
                >
                  <Ionicons 
                    name="thumbs-up" 
                    size={8} 
                    color="#FFFFFF"
                    style={{
                      textShadowColor: '#000000',
                      textShadowOffset: { width: 0.5, height: 0.5 },
                      textShadowRadius: 1
                    }}
                  />
                </View>
                <Text style={tw`text-white text-xs font-semibold`}>
                  {hotel.rating?.toFixed(1) || 'N/A'}
                </Text>
              </View>
            </View>

            {/* Hotel Information */}
            <View style={tw`flex-1 p-4`}>
              <View style={tw`flex-row justify-between items-start mb-2`}>
                <View style={tw`flex-1 pr-2`}>
                  <Text style={tw`text-base font-semibold text-gray-900 leading-tight mb-1`}>
                    {hotel.name}
                  </Text>
                  <View style={tw`flex-row items-center mb-2`}>
                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                    <Text style={tw`text-sm text-gray-600 ml-1 flex-1`} numberOfLines={1}>
                      {getLocationDisplay()}
                    </Text>
                  </View>
                </View>
                
                {/* Remove button */}
                <TouchableOpacity
                  style={tw`w-8 h-8 bg-gray-100 rounded-full items-center justify-center`}
                  onPress={handleRemove}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Price */}
              <View style={tw`flex-row items-center justify-between`}>
                <Text style={tw`text-lg font-bold text-gray-900`}>
                  {getDisplayPrice()}
                  <Text style={tw`text-sm font-normal text-gray-600`}>/night</Text>
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={tw`px-4 py-3 border-t border-gray-50`}>
          <View style={tw`flex-row gap-2`}>
            {/* Ask Button */}
            <TouchableOpacity
              style={[
                tw`flex-1 py-3 rounded-xl border-2 flex-row items-center justify-center`,
                { 
                  backgroundColor: TURQUOISE + '10',
                  borderColor: TURQUOISE + '30',
                }
              ]}
              onPress={() => setShowHotelChat(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble" size={16} color={TURQUOISE_DARK} />
              <Text style={[tw`ml-2 font-medium text-sm`, { color: '#000000' }]}>
                Ask
              </Text>
            </TouchableOpacity>

            {/* View on Map Button */}
            <TouchableOpacity
              style={[
                tw`flex-1 py-3 rounded-xl border-2 flex-row items-center justify-center`,
                { 
                  backgroundColor: TURQUOISE + '10',
                  borderColor: TURQUOISE + '30',
                }
              ]}
              onPress={handleViewDetails}
              activeOpacity={0.8}
            >
              <Ionicons name="map" size={16} color={TURQUOISE_DARK} />
              <Text style={[tw`ml-2 font-medium text-sm`, { color: '#000000' }]}>
                Map
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                tw`flex-1 py-3 rounded-xl border-2 flex-row items-center justify-center`,
                { 
                  backgroundColor: TURQUOISE + '10',
                  borderColor: TURQUOISE + '30',
                }
              ]}
              onPress={handleBookNow}
              activeOpacity={0.8}
            >
              <Image 
                source={require('../../assets/images/logo.png')} 
                style={{ width: 16, height: 16 }} 
                resizeMode="contain"
              />
              <Text style={[tw`ml-2 font-medium text-sm`, { color: '#000000' }]}>
                Book
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Insights Dropdown - MOVED INSIDE THE CARD CONTAINER */}
        <AIInsightsDropdown
          hotel={hotel}
          isExpanded={showAIInsights}
          onToggle={() => setShowAIInsights(!showAIInsights)}
        />
      </View>

      {/* Hotel Chat Modal */}
      <Modal
        visible={showHotelChat}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHotelChat(false)}
      >
        <HotelChatOverlay
          visible={showHotelChat}
          onClose={() => setShowHotelChat(false)}
          hotel={hotel as any}
        />
      </Modal>

      {/* Confirmation modal */}
      <ConfirmationModal
        isVisible={showConfirmModal}
        hotelName={hotel.name}
        onConfirm={handleConfirmRemove}
        onCancel={handleCancelRemove}
      />
    </Animated.View>
  );
};

export default FavoriteHotelCard;