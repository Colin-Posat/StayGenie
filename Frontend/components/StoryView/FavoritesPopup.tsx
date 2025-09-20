import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FavoritesPopupProps {
  visible: boolean;
  hotelName: string;
  onPress: () => void;
  onHide?: () => void;
  duration?: number;
}
const TURQUOISE = '#1df9ff';
const { width: screenWidth } = Dimensions.get('window');

const FavoritesPopup: React.FC<FavoritesPopupProps> = ({
  visible,
  hotelName,
  onPress,
  onHide,
  duration = 3000
}) => {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after duration
      const timer = setTimeout(() => {
        hidePopup();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hidePopup();
    }
  }, [visible, duration]);

  const hidePopup = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) {
        onHide();
      }
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 80, // Position above bottom navigation
        left: 20,
        right: 20,
        zIndex: 1000,
        transform: [
          { translateY },
          { scale }
        ],
        opacity,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          paddingHorizontal: 20,
          paddingVertical: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 8,
          borderWidth: 1,
          borderColor: 'rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Left side: Check icon and text */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#1df9ff',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Ionicons name="checkmark" size={18} color='white' />
          </View>
          
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#1F2937',
                lineHeight: 18,
              }}
              numberOfLines={2}
            >
              {hotelName} saved
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: '#6B7280',
                marginTop: 2,
                lineHeight: 16,
              }}
            >
              View in favorites
            </Text>
          </View>
        </View>

        {/* Right side: Arrow */}
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: 'rgba(29, 249, 255, 0.1)',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 8,
          }}
        >
          <Ionicons 
            name="chevron-forward" 
            size={16} 
            color="#1df9ff" 
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default FavoritesPopup;