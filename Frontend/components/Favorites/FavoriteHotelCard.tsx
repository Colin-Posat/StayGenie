// FavoriteHotelCard.tsx - Clean turquoise design with enhanced UX + Action Buttons
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  ScrollView,
  Easing,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { FavoritedHotel } from '../../utils/FavoritesCache';
import { formatLocationDisplay, getCountryName } from '../../utils/countryMapping';

// Turquoise color constants
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';

// Base deep link URL
const DEEP_LINK_BASE_URL = 'https://colin-posat-1t6gl.nuitee.link';

interface FavoriteHotelCardProps {
  hotel: FavoritedHotel;
  onPress: (hotel: FavoritedHotel) => void;
  onRemove: (hotel: FavoritedHotel) => void;
  index: number;
  // Optional props for deep linking
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

// Clean confirmation modal with turquoise accents
interface ConfirmationModalProps {
  isVisible: boolean;
  hotelName: string;
  onConfirm: () => void;
  onCancel: () => void;
  cardLayout?: { width: number; height: number; x: number; y: number };
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isVisible,
  hotelName,
  onConfirm,
  onCancel,
  cardLayout
}) => {
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.8)).current;
  const [textHeight, setTextHeight] = useState(0);

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

  // Calculate modal dimensions based on card size - match exact card dimensions
  const modalWidth = cardLayout ? cardLayout.width : 300;
  const baseModalHeight = cardLayout ? cardLayout.height : 140;
  
  // Estimate if text will wrap (rough calculation based on character count and modal width)
  const textContent = `Remove "${hotelName}" from your favorites?`;
  const estimatedTextWidth = textContent.length * 8; // rough estimate: 8px per character
  const availableTextWidth = modalWidth - 48; // subtract padding
  const willTextWrap = estimatedTextWidth > availableTextWidth;
  
  // Add extra height if text will wrap to second line
  const modalHeight = willTextWrap ? baseModalHeight + 24 : baseModalHeight;

  return (
    <View
      style={tw`absolute inset-0 items-center justify-center z-50`}
    >
      <Animated.View
        style={[
          tw`bg-white rounded-xl p-6 border border-gray-200 shadow-xl`,
          { 
            width: modalWidth,
            height: modalHeight,
            transform: [{ scale: scaleAnimation }],
            opacity: fadeAnimation,
          }
        ]}
      >
        <Text style={tw`text-lg font-semibold text-black mb-2`}>
          Remove from Favorites
        </Text>
        <View style={tw`mb-6`}>
          <Text style={tw`text-gray-600 text-sm leading-5`}>
            Remove "{hotelName}" from your favorites?
          </Text>
        </View>
        
        <View style={tw`flex-row justify-end gap-3`}>
          <TouchableOpacity
            style={tw`px-4 py-2 rounded-lg bg-gray-100`}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={tw`text-gray-700 font-medium`}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={tw`px-4 py-2 rounded-lg bg-red-500`}
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

// Clean accordion section with turquoise accents
interface AccordionSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}

const getRatingColor = (rating: number): string => {
  if (rating >= 8.0) return TURQUOISE;
  if (rating >= 7.0) return TURQUOISE + 'E6'; // 90% opacity
  if (rating >= 6.0) return TURQUOISE + 'CC'; // 80% opacity
  if (rating >= 5.0) return TURQUOISE + 'B3'; // 70% opacity
  if (rating >= 4.0) return TURQUOISE + '99'; // 60% opacity
  return TURQUOISE + '80'; // 50% opacity
};

const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  icon,
  children,
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

  return (
    <View style={tw`border-b border-gray-50`}>
      <TouchableOpacity
        style={tw`flex-row items-center justify-between px-4 py-3`}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={tw`flex-row items-center`}>
          <View style={[tw`w-6 h-6 rounded-full items-center justify-center mr-3`, { backgroundColor: TURQUOISE + '20' }]}>
            <Ionicons name={icon as any} size={12} color={TURQUOISE_DARK} />
          </View>
          <Text style={tw`text-gray-900 font-medium text-sm`}>
            {title}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
        </Animated.View>
      </TouchableOpacity>
      
      <Animated.View 
        style={[
          tw`overflow-hidden`,
          { 
            maxHeight: animatedHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 400],
            }),
            opacity: animatedHeight,
          }
        ]}
      >
        <View style={tw`px-4 pb-3`}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

// Clean expandable content with turquoise highlights
interface FavoriteDropdownProps {
  hotel: FavoritedHotel;
  isExpanded: boolean;
  onToggle: () => void;
}

const FavoriteDropdown: React.FC<FavoriteDropdownProps> = ({ 
  hotel, 
  isExpanded, 
  onToggle 
}) => {
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const mockAIReason = hotel.whyItMatches || "This hotel perfectly matches your preferences with its excellent location, premium amenities, and outstanding guest reviews. The combination of comfort, style, and convenience makes it an ideal choice for your stay.";
  
  const mockNearbyAttractions = hotel.nearbyAttractions?.length ? hotel.nearbyAttractions : [
    "City Center • 0.2 mi",
    "Main Shopping District • 0.5 mi", 
    "Historic Quarter • 0.8 mi",
    "Transportation Hub • 1.1 mi"
  ];

  const mockFunFacts = hotel.funFacts?.length ? hotel.funFacts : [
    "Featured in architectural magazines for innovative design",
    "Rooftop terrace offers panoramic city views",
    "Award-winning restaurant with local cuisine",
    "Eco-friendly with LEED Gold certification"
  ];

  return (
    <View style={tw`bg-white`}>
      <AccordionSection
        title="Why You Saved This"
        icon="sparkles"
        isExpanded={expandedSections.aiReason}
        onToggle={() => toggleSection('aiReason')}
      >
        <View style={[tw`p-3 rounded-xl border`, { backgroundColor: TURQUOISE + '10', borderColor: TURQUOISE + '30' }]}>
          <Text style={tw`text-gray-800 text-sm leading-5`}>
            {mockAIReason}
          </Text>
        </View>
      </AccordionSection>

      <AccordionSection
        title="Nearby Attractions"
        icon="location"
        isExpanded={expandedSections.attractions}
        onToggle={() => toggleSection('attractions')}
      >
        <View style={tw`bg-gray-50 p-3 rounded-xl`}>
          {mockNearbyAttractions.map((attraction: string, index: number) => (
            <View key={index} style={tw`flex-row items-center ${index === 0 ? '' : 'mt-2'}`}>
              <View style={[tw`w-1.5 h-1.5 rounded-full mr-2`, { backgroundColor: TURQUOISE }]} />
              <Text style={tw`text-gray-700 text-sm flex-1`}>
                {attraction}
              </Text>
            </View>
          ))}
        </View>
      </AccordionSection>

      <AccordionSection
        title="Hotel Highlights"
        icon="star"
        isExpanded={expandedSections.funFacts}
        onToggle={() => toggleSection('funFacts')}
      >
        <View style={tw`bg-gray-50 p-3 rounded-xl`}>
          {mockFunFacts.map((fact: string, index: number) => (
            <View key={index} style={tw`flex-row items-start ${index === 0 ? '' : 'mt-2'}`}>
              <View style={[tw`w-1.5 h-1.5 rounded-full mr-2 mt-2`, { backgroundColor: TURQUOISE }]} />
              <Text style={tw`text-gray-700 text-sm flex-1 leading-5`}>
                {fact}
              </Text>
            </View>
          ))}
        </View>
      </AccordionSection>
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
  const chevronRotateAnimation = useRef(new Animated.Value(0)).current;
  const mainDropdownAnimation = useRef(new Animated.Value(0)).current;
  const [isDropdownExpanded, setIsDropdownExpanded] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cardLayout, setCardLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });

  useEffect(() => {
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 400 + (index * 80),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(chevronRotateAnimation, {
        toValue: isDropdownExpanded ? 1 : 0,
        duration: 300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(mainDropdownAnimation, {
        toValue: isDropdownExpanded ? 1 : 0,
        duration: 350,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }),
    ]).start();
  }, [isDropdownExpanded]);

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

  const handleCardLayout = (event: any) => {
    const { width, height, x, y } = event.nativeEvent.layout;
    setCardLayout({ width, height, x, y });
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

      console.log(`🗺️ Opening Google Maps for: ${hotel.name}`);

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

      console.log(`🔗 Opening hotel booking: ${hotel.name}`);

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

  const toggleDropdown = () => {
    setIsDropdownExpanded(!isDropdownExpanded);
  };

  const chevronRotateInterpolate = chevronRotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View
      style={[
        tw`mb-4`,
        { opacity: fadeAnimation }
      ]}
    >
      <View 
        style={tw`bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100`}
        onLayout={handleCardLayout}
      >
        {/* Main Card Content */}
        <View style={tw`flex-row min-h-28`}>
          {/* Hotel Image with enhanced styling */}
          <View style={tw`relative w-28`}>
            <Image
              source={{ uri: hotel.image }}
              style={tw`w-28 h-full absolute inset-0`}
              resizeMode="cover"
            />
            {/* Subtle overlay for better text contrast */}
            <View style={tw`absolute inset-0 bg-black/5`} />
          </View>

          {/* Hotel Information */}
          <TouchableOpacity
            style={tw`flex-1 p-4 justify-between pr-12`}
            onPress={() => onPress(hotel)}
            activeOpacity={0.95}
          >
            <View>
              <Text style={tw`text-base font-semibold text-gray-900 leading-5 mb-1.5`}>
                {hotel.name}
              </Text>
              <View style={tw`flex-row items-center mb-3`}>
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text style={tw`text-sm text-gray-600 ml-1.5`} numberOfLines={1}>
                  {getLocationDisplay()}
                </Text>
              </View>
            </View>

            {/* Price and Rating */}
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={tw`text-base font-bold text-gray-900`}>
                {getDisplayPrice()}<Text style={tw`text-sm font-normal text-gray-600`}>/night</Text>
              </Text>
                         
              <View style={tw`flex-row items-center`}>
                <View 
                  style={[
                    tw`w-5 h-5 rounded-full items-center justify-center mr-2`,
                    { backgroundColor: getRatingColor(hotel.rating || 0) }
                  ]}
                >
                  <Ionicons 
                    name="thumbs-up" 
                    size={10} 
                    color="#FFFFFF"
                    style={{
                      textShadowColor: '#000000',
                      textShadowOffset: { width: 0.5, height: 0.5 },
                      textShadowRadius: 1
                    }}
                  />
                </View>
                <Text style={tw`text-sm font-semibold text-gray-800`}>
                  {hotel.rating?.toFixed(1) || 'N/A'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Remove button with enhanced styling */}
        <TouchableOpacity
          style={tw`absolute top-3 right-3 w-7 h-7 bg-white/90 backdrop-blur rounded-full items-center justify-center shadow-lg border border-gray-200`}
          onPress={handleRemove}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={14} color="#6B7280" />
        </TouchableOpacity>

        {/* NEW: Action Buttons Section */}
        <View style={tw`border-t border-gray-50 px-4 py-3`}>
          <View style={tw`flex-row gap-2`}>
            {/* View Details Button */}
            <TouchableOpacity
              style={[
                tw`flex-1 py-2.5 rounded-lg border flex-row items-center justify-center`,
                { 
                  backgroundColor: TURQUOISE + '10',
                  borderColor: TURQUOISE + '30',
                }
              ]}
              onPress={handleViewDetails}
              activeOpacity={0.7}
            >
              <Ionicons name="map-outline" size={16} color={TURQUOISE_DARK} />
              <Text style={[tw`ml-2 font-medium text-sm`, { color: TURQUOISE_DARK }]}>
                View Details
              </Text>
            </TouchableOpacity>

            {/* Book Now Button */}
            <TouchableOpacity
              style={[
                tw`flex-1 py-2.5 rounded-lg flex-row items-center justify-center shadow-sm`,
                { backgroundColor: TURQUOISE }
              ]}
              onPress={handleBookNow}
              activeOpacity={0.8}
            >
              <Image 
                source={require('../../assets/images/logo.png')} 
                style={{ width: 16, height: 16, tintColor: '#FFFFFF' }} 
                resizeMode="contain"
              />
              <Text style={tw`text-white font-semibold text-sm ml-2`}>
                Book Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Clean Expandable Dropdown Toggle */}
        <TouchableOpacity
          style={tw`flex-row items-center justify-between px-4 py-3 border-t border-gray-50`}
          onPress={toggleDropdown}
          activeOpacity={0.7}
        >
          <Text style={tw`text-gray-700 font-medium text-sm`}>
            More Details
          </Text>
          <Animated.View style={{ transform: [{ rotate: chevronRotateInterpolate }] }}>
            <Ionicons 
              name="chevron-down" 
              size={18} 
              color={TURQUOISE_DARK}
            />
          </Animated.View>
        </TouchableOpacity>

        {/* Expandable Dropdown */}
        <Animated.View 
          style={[
            tw`overflow-hidden border-t border-gray-50`,
            { 
              maxHeight: mainDropdownAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 600],
              }),
              opacity: mainDropdownAnimation,
            }
          ]}
        >
          <FavoriteDropdown
            hotel={hotel}
            isExpanded={isDropdownExpanded}
            onToggle={toggleDropdown}
          />
        </Animated.View>
      </View>

      {/* Confirmation modal */}
      <ConfirmationModal
        isVisible={showConfirmModal}
        hotelName={hotel.name}
        onConfirm={handleConfirmRemove}
        onCancel={handleCancelRemove}
        cardLayout={cardLayout}
      />
    </Animated.View>
  );
};

export default FavoriteHotelCard;