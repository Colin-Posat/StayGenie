// FavoriteHotelCard.tsx - With web-compatible remove handler
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  ScrollView,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { FavoritedHotel } from '../../utils/FavoritesCache';
import { formatLocationDisplay, getCountryName } from '../../utils/countryMapping';

interface FavoriteHotelCardProps {
  hotel: FavoritedHotel;
  onPress: (hotel: FavoritedHotel) => void;
  onRemove: (hotel: FavoritedHotel) => void;
  index: number;
}

// NEW: Web-compatible confirmation modal
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
  onCancel
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
    <Animated.View
      style={[
        tw`absolute inset-0 bg-black/50 items-center justify-center z-50`,
        { opacity: fadeAnimation }
      ]}
    >
      <Animated.View
        style={[
          tw`bg-white rounded-xl p-6 mx-4 max-w-sm w-full`,
          { transform: [{ scale: scaleAnimation }] }
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
    </Animated.View>
  );
};

// NEW: Accordion Section Component
interface AccordionSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}

const getRatingColor = (rating: number): string => {
  // Use the same turquoise color (#1df9ff) with different opacities based on rating
  if (rating >= 8.0) return "#1df9ff"; // Full turquoise - Excellent
  if (rating >= 7.0) return "#1df9ffE6"; // 90% opacity - Very Good  
  if (rating >= 6.0) return "#1df9ffCC"; // 80% opacity - Good
  if (rating >= 5.0) return "#1df9ffB3"; // 70% opacity - Average
  if (rating >= 4.0) return "#1df9ff99"; // 60% opacity - Below Average
  return "#1df9ff80"; // 50% opacity - Poor
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
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnimation, {
        toValue: isExpanded ? 1 : 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isExpanded]);

  const rotateInterpolate = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={tw`border-b border-gray-100 last:border-b-0`}>
      <TouchableOpacity
        style={tw`flex-row items-center justify-between px-3 py-2.5`}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={tw`flex-row items-center`}>
          <Ionicons name={icon as any} size={12} color="#000000" />
          <Text style={tw`text-black font-semibold text-xs ml-1.5`}>
            {title}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons name="chevron-down" size={14} color="#6B7280" />
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
            opacity: animatedHeight.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0, 0.7, 1],
            }),
          }
        ]}
      >
        <View style={tw`px-3 pb-2.5`}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

// NEW: Expandable Accordion Component for Favorites
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

  // Mock data for demonstration - you can replace with actual hotel data
  const mockAIReason = hotel.whyItMatches || "This hotel was saved because it perfectly matches your preferences for luxury accommodations with excellent amenities. The location offers easy access to attractions while providing the comfort and convenience you're looking for.";
  
  const mockNearbyAttractions = hotel.nearbyAttractions?.length ? hotel.nearbyAttractions : [
    "Central Park - 0.3 miles",
    "Times Square - 0.8 miles", 
    "Metropolitan Museum - 1.2 miles",
    "Brooklyn Bridge - 2.1 miles"
  ];

  const mockFunFacts = hotel.funFacts?.length ? hotel.funFacts : [
    "This hotel was featured in 3 major Hollywood movies",
    "The rooftop bar offers 360° views of the city skyline",
    "Home to the city's first underwater restaurant",
    "The lobby chandelier contains over 10,000 crystals"
  ];

  return (
    <View style={tw`bg-white`}>
      {/* Why You Saved This Hotel */}
      <AccordionSection
        title="Why You Saved This Hotel"
        icon="sparkles"
        isExpanded={expandedSections.aiReason}
        onToggle={() => toggleSection('aiReason')}
      >
        <Text style={tw`text-black text-xs leading-4 bg-gray-100 p-2.5 rounded-lg`}>
          {mockAIReason}
        </Text>
      </AccordionSection>

      {/* Nearby Attractions */}
      <AccordionSection
        title="Nearby Attractions"
        icon="location"
        isExpanded={expandedSections.attractions}
        onToggle={() => toggleSection('attractions')}
      >
        <View style={tw`bg-gray-100 p-2.5 rounded-lg`}>
          {mockNearbyAttractions.map((attraction: string, index: number) => (
            <Text key={index} style={tw`text-black text-xs leading-4 ${index === 0 ? '' : 'mt-1'}`}>
              • {attraction}
            </Text>
          ))}
        </View>
      </AccordionSection>

      {/* Fun Facts */}
      <AccordionSection
        title="Fun Facts"
        icon="bulb"
        isExpanded={expandedSections.funFacts}
        onToggle={() => toggleSection('funFacts')}
      >
        <View style={tw`bg-gray-100 p-2.5 rounded-lg`}>
          {mockFunFacts.map((fact: string, index: number) => (
            <Text key={index} style={tw`text-black text-xs leading-4 ${index === 0 ? '' : 'mt-1'}`}>
              • {fact}
            </Text>
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
  index
}) => {
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const chevronRotateAnimation = useRef(new Animated.Value(0)).current;
  const mainDropdownAnimation = useRef(new Animated.Value(0)).current;
  const [isDropdownExpanded, setIsDropdownExpanded] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 300 + (index * 50),
      useNativeDriver: true,
    }).start();
  }, [index]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(chevronRotateAnimation, {
        toValue: isDropdownExpanded ? 1 : 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(mainDropdownAnimation, {
        toValue: isDropdownExpanded ? 1 : 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [isDropdownExpanded]);

  // Updated handler - uses custom modal for both mobile and web
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


const getDisplayPrice = () => {
  if (hotel.pricePerNight) {
    // Convert currency code to symbol
    const getCurrencySymbol = (currencyCode: string) => {
      switch (currencyCode.toUpperCase()) {
        case 'USD':
          return '$';
        case 'EUR':
          return '€';
        case 'GBP':
          return '£';
        case 'JPY':
          return '¥';
        case 'CAD':
          return 'C$';
        case 'AUD':
          return 'A$';
        default:
          return currencyCode; // fallback to currency code if symbol not found
      }
    };
    
    return `${getCurrencySymbol(hotel.pricePerNight.currency)}${hotel.pricePerNight.amount}`;
  }
  return `${hotel.price}`;
};

  const getLocationDisplay = () => {
    if (hotel.city && hotel.country) {
      return formatLocationDisplay(hotel.city, hotel.country);
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
        tw`mb-3`,
        { opacity: fadeAnimation }
      ]}
    >
      <View style={tw`relative bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm`}>
        {/* Main Card Content */}
        <TouchableOpacity
          style={tw`flex-row`}
          onPress={() => onPress(hotel)}
          activeOpacity={0.8}
        >
          {/* Hotel Image */}
          <View>
            <Image
              source={{ uri: hotel.image }}
              style={tw`w-24 h-24`}
              resizeMode="cover"
            />
          </View>

          {/* Hotel Information */}
          <View style={tw`flex-1 p-3 justify-between`}>
            <View>
              <Text style={tw`text-base font-semibold text-black leading-5 mb-1`} numberOfLines={1}>
                {hotel.name}
              </Text>
              <View style={tw`flex-row items-center mb-2`}>
                <Ionicons name="location-outline" size={12} color="#666666" />
                <Text style={tw`text-xs text-gray-600 ml-1`} numberOfLines={1}>
                  {getLocationDisplay()}
                </Text>
              </View>
            </View>

            {/* Price and Rating */}
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={tw`text-sm font-bold text-black`}>
                {getDisplayPrice()}/night
              </Text>
                         
              <View style={tw`flex-row items-center`}>
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
            <Text style={tw`text-xs font-medium text-gray-700`}>
              {hotel.rating?.toFixed(1) || 'N/A'}
            </Text>
          </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Remove button positioned absolutely over the entire card */}
        <TouchableOpacity
          style={tw`absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full items-center justify-center`}
          onPress={handleRemove}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={12} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Expandable Dropdown Toggle */}
        <TouchableOpacity
          style={tw`flex-row items-center justify-between px-3 py-2.5 border-t border-gray-100`}
          onPress={toggleDropdown}
          activeOpacity={0.7}
        >
          <Text style={tw`text-gray-700 font-medium text-xs`}>
            Hotel Details & Insights
          </Text>
          <Animated.View style={{ transform: [{ rotate: chevronRotateInterpolate }] }}>
            <Ionicons 
              name="chevron-down" 
              size={16} 
              color="#6B7280" 
            />
          </Animated.View>
        </TouchableOpacity>

        {/* Expandable Dropdown */}
        <Animated.View 
          style={[
            tw`overflow-hidden bg-white border-t border-gray-100`,
            { 
              maxHeight: mainDropdownAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 800],
              }),
              opacity: mainDropdownAnimation.interpolate({
                inputRange: [0, 0.2, 1],
                outputRange: [0, 0.5, 1],
              }),
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

      {/* Custom confirmation modal for all platforms */}
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