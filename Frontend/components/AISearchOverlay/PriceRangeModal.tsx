// PriceRangeModal.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

// Turquoise color constants
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';

interface PriceRange {
  min: number;
  max: number | null;
  label: string;
}

interface PriceRangeModalProps {
  visible: boolean;
  onClose: () => void;
  onPriceRangeSelect: (range: PriceRange) => void;
}

const PriceRangeModal: React.FC<PriceRangeModalProps> = ({
  visible,
  onClose,
  onPriceRangeSelect,
}) => {
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(500);
  
  const MIN_VALUE = 0;
  const MAX_VALUE = 1000;
  const SLIDER_WIDTH = 260;
  const THUMB_SIZE = 32;

  const minThumbPosition = useRef(new Animated.Value(0)).current;
  const maxThumbPosition = useRef(new Animated.Value((500 / MAX_VALUE) * SLIDER_WIDTH)).current;

  // Convert price to slider position
  const priceToPosition = (price: number) => {
    return (price / MAX_VALUE) * SLIDER_WIDTH;
  };

  // Convert slider position to price
  const positionToPrice = (position: number) => {
    return Math.round((position / SLIDER_WIDTH) * MAX_VALUE);
  };

  // Format price for display
  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${(price / 1000).toFixed(0)}k`;
    return `$${price}`;
  };

  // Min thumb pan responder
  const minPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (event, gestureState) => {
      const newPosition = Math.max(
        0, 
        Math.min(gestureState.dx + priceToPosition(minPrice), priceToPosition(maxPrice) - 30)
      );
      minThumbPosition.setValue(newPosition);
      const newPrice = positionToPrice(newPosition);
      setMinPrice(newPrice);
    },
    onPanResponderRelease: () => {
      // Snap to final position
      minThumbPosition.setValue(priceToPosition(minPrice));
    },
  });

  // Max thumb pan responder
  const maxPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (event, gestureState) => {
      const newPosition = Math.max(
        priceToPosition(minPrice) + 30,
        Math.min(gestureState.dx + priceToPosition(maxPrice), SLIDER_WIDTH)
      );
      maxThumbPosition.setValue(newPosition);
      const newPrice = positionToPrice(newPosition);
      setMaxPrice(newPrice);
    },
    onPanResponderRelease: () => {
      // Snap to final position
      maxThumbPosition.setValue(priceToPosition(maxPrice));
    },
  });

  const handleApply = () => {
    const range: PriceRange = {
      min: minPrice,
      max: maxPrice >= MAX_VALUE ? null : maxPrice,
      label: maxPrice >= MAX_VALUE 
        ? `${formatPrice(minPrice)}+` 
        : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`
    };
    onPriceRangeSelect(range);
    onClose();
  };

  const handleReset = () => {
    setMinPrice(0);
    setMaxPrice(500);
    minThumbPosition.setValue(0);
    maxThumbPosition.setValue(priceToPosition(500));
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50 px-6`}>
        <View style={[
          tw`bg-white rounded-3xl p-6 w-full max-w-sm`,
          {
            shadowColor: TURQUOISE,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 15,
          }
        ]}>
          {/* Header */}
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <Text style={tw`text-xl font-bold text-gray-900`}>Price Range</Text>
            <View style={tw`flex-row items-center`}>
              <TouchableOpacity
                onPress={handleReset}
                style={tw`mr-3 px-3 py-1 rounded-full`}
                activeOpacity={0.7}
              >
                <Text style={[tw`text-sm font-medium`, { color: TURQUOISE_DARK }]}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={tw`p-1`}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Price Display */}
          <View style={tw`mb-8`}>
            <View style={tw`flex-row justify-between items-center mb-2`}>
              <Text style={tw`text-sm font-medium text-gray-600`}>Min Price</Text>
              <Text style={tw`text-sm font-medium text-gray-600`}>Max Price</Text>
            </View>
            <View style={tw`flex-row justify-between items-center`}>
              <Text style={[tw`text-2xl font-bold`, { color: TURQUOISE_DARK }]}>
                {formatPrice(minPrice)}
              </Text>
              <Text style={[tw`text-2xl font-bold`, { color: TURQUOISE_DARK }]}>
                {maxPrice >= MAX_VALUE ? `${formatPrice(maxPrice)}+` : formatPrice(maxPrice)}
              </Text>
            </View>
          </View>

          {/* Slider Container */}
          <View style={tw`mb-8 px-4`}>
            <View style={[tw`relative justify-center`, { height: 60 }]}>
              {/* Slider Track */}
              <View style={[
                tw`rounded-full`,
                {
                  height: 6,
                  width: SLIDER_WIDTH,
                  backgroundColor: '#E5E7EB',
                }
              ]} />
              
              {/* Active Track */}
              <Animated.View style={[
                tw`absolute rounded-full`,
                {
                  height: 6,
                  left: minThumbPosition,
                  width: Animated.subtract(maxThumbPosition, minThumbPosition),
                  backgroundColor: TURQUOISE,
                }
              ]} />

              {/* Min Thumb */}
              <Animated.View
                style={[
                  tw`absolute items-center justify-center`,
                  {
                    width: THUMB_SIZE,
                    height: THUMB_SIZE,
                    borderRadius: THUMB_SIZE / 2,
                    backgroundColor: 'white',
                    left: Animated.subtract(minThumbPosition, THUMB_SIZE / 2),
                    shadowColor: TURQUOISE,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 8,
                    borderWidth: 3,
                    borderColor: TURQUOISE,
                  }
                ]}
                {...minPanResponder.panHandlers}
              >
                <View style={[
                  tw`rounded-full`,
                  {
                    width: 8,
                    height: 8,
                    backgroundColor: TURQUOISE_DARK
                  }
                ]} />
              </Animated.View>

              {/* Max Thumb */}
              <Animated.View
                style={[
                  tw`absolute items-center justify-center`,
                  {
                    width: THUMB_SIZE,
                    height: THUMB_SIZE,
                    borderRadius: THUMB_SIZE / 2,
                    backgroundColor: 'white',
                    left: Animated.subtract(maxThumbPosition, THUMB_SIZE / 2),
                    shadowColor: TURQUOISE,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 8,
                    borderWidth: 3,
                    borderColor: TURQUOISE,
                  }
                ]}
                {...maxPanResponder.panHandlers}
              >
                <View style={[
                  tw`rounded-full`,
                  {
                    width: 8,
                    height: 8,
                    backgroundColor: TURQUOISE_DARK
                  }
                ]} />
              </Animated.View>
            </View>

            {/* Price Scale */}
            <View style={tw`flex-row justify-between mt-2`}>
              <Text style={tw`text-xs text-gray-400`}>$0</Text>
              <Text style={tw`text-xs text-gray-400`}>$250</Text>
              <Text style={tw`text-xs text-gray-400`}>$500</Text>
              <Text style={tw`text-xs text-gray-400`}>$750</Text>
              <Text style={tw`text-xs text-gray-400`}>$1k+</Text>
            </View>
          </View>

          {/* Apply Button */}
          <TouchableOpacity
            style={[
              tw`p-4 rounded-2xl items-center`,
              {
                backgroundColor: TURQUOISE,
                shadowColor: TURQUOISE,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }
            ]}
            onPress={handleApply}
            activeOpacity={0.9}
          >
            <Text style={tw`text-white font-bold text-lg`}>
              Apply Range • {minPrice === 0 && maxPrice >= MAX_VALUE 
                ? 'Any Price' 
                : `${formatPrice(minPrice)} - ${maxPrice >= MAX_VALUE ? `${formatPrice(maxPrice)}+` : formatPrice(maxPrice)}`}
            </Text>
          </TouchableOpacity>

          {/* Quick Presets */}
          <View style={tw`mt-4`}>
            <Text style={tw`text-sm font-medium text-gray-600 mb-3 text-center`}>Quick Select</Text>
            <View style={tw`flex-row justify-between`}>
              {[
                { min: 0, max: 100, label: 'Under $100' },
                { min: 100, max: 300, label: '$100-300' },
                { min: 300, max: 1000, label: '$300+' },
              ].map((preset, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    tw`px-4 py-2 rounded-full border flex-1 mx-1`,
                    {
                      backgroundColor: minPrice === preset.min && maxPrice === preset.max ? TURQUOISE + '15' : '#F8FAFC',
                      borderColor: minPrice === preset.min && maxPrice === preset.max ? TURQUOISE : '#E5E7EB',
                    }
                  ]}
                  onPress={() => {
                    setMinPrice(preset.min);
                    setMaxPrice(preset.max);
                    minThumbPosition.setValue(priceToPosition(preset.min));
                    maxThumbPosition.setValue(priceToPosition(preset.max));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    tw`text-xs font-medium text-center`,
                    { color: minPrice === preset.min && maxPrice === preset.max ? TURQUOISE_DARK : '#6B7280' }
                  ]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default PriceRangeModal;