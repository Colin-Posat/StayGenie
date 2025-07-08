import React, { useRef } from 'react';
import { View, TouchableOpacity, Animated, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

// TypeScript Interfaces
interface AnimatedHeartButtonProps {
  isLiked: boolean;
  onPress: () => void;
  size?: number;
}

interface StoryCardProps {
  hotelName: string;
  location: string;
  imageUri: string;
  price: string;
  rating: string;
  isCurrentHotelSaved: boolean;
  onSave: () => void;
  onShare: () => void;
  onBookmark: () => void;
}

// Animated Heart Button Component
const AnimatedHeartButton: React.FC<AnimatedHeartButtonProps> = ({ isLiked, onPress, size = 28 }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;

  const animateHeart = () => {
    // Heart scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.4,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Bounce animation for the button
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Particle burst effect when liking
    if (!isLiked) {
      Animated.sequence([
        Animated.timing(particleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(particleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handlePress = () => {
    animateHeart();
    onPress();
  };

  return (
    <View style={tw`relative`}>
      {/* Particle Effects */}
      {[...Array(6)].map((_, index) => (
        <Animated.View
          key={index}
          style={[
            tw`absolute`,
            {
              transform: [
                {
                  translateX: particleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, (Math.cos((index * 60) * Math.PI / 180) * 30)],
                  }),
                },
                {
                  translateY: particleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, (Math.sin((index * 60) * Math.PI / 180) * 30)],
                  }),
                },
                {
                  scale: particleAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1, 0],
                  }),
                },
              ],
              opacity: particleAnim.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0, 1, 0],
              }),
              left: size === 28 ? 14 : (size / 2) - 4,
              top: size === 28 ? 10 : (size / 2) - 4,
            },
          ]}
        >
          <Ionicons name="heart" size={8} color="#FF3040" />
        </Animated.View>
      ))}

      {/* Main Button */}
      <Animated.View
        style={{
          transform: [{ scale: bounceAnim }],
        }}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.6}
          style={tw`border border-black/20 bg-gray-100 py-2.5 px-4 rounded-lg items-center justify-center`}
        >
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
            }}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={size}
              color={isLiked ? "#FF3040" : "#262626"}
            />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};
