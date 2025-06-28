// FloatingStars.tsx - Enhanced with more abundant and varied stars
import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  Dimensions,
  Image,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Individual floating star component
const FloatingStar: React.FC<{
  size: number;
  top: number;
  left?: number;
  right?: number;
  animationDelay: number;
  floatDelay: number;
  duration: number;
  translateY: number;
  maxOpacity?: number;
}> = ({ size, top, left, right, animationDelay, floatDelay, duration, translateY, maxOpacity = 0.4 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial fade in to base opacity
    const fadeTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: maxOpacity * 0.4, // Base opacity for breathing effect
        duration: 2000,
        useNativeDriver: true,
      }).start(() => {
        // Start breathing effect after fade in completes
        Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: maxOpacity, // Breathe up to max opacity
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: maxOpacity * 0.4, // Breathe down to base
              duration: 3000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    }, animationDelay);

    // Gentle floating animation
    const floatTimer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateAnimation, {
            toValue: translateY,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(translateAnimation, {
            toValue: -translateY,
            duration: duration,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, floatDelay);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(floatTimer);
    };
  }, [opacity, translateAnimation, animationDelay, floatDelay, duration, translateY, maxOpacity]);

  // Convert percentage to actual pixel values
  const topPosition = (height * top) / 100;
  const leftPosition = left ? (width * left) / 100 : undefined;
  const rightPosition = right ? (width * right) / 100 : undefined;

  return (
    <View
      style={{
        position: 'absolute',
        top: topPosition,
        left: leftPosition,
        right: rightPosition,
        zIndex: 0,
      }}
    >
      <Animated.View
        style={{
          opacity: opacity,
          transform: [{ translateY: translateAnimation }],
        }}
      >
        <Image
          source={require('../../assets/images/star.png')} 
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

interface FloatingStarsProps {
  density?: 'light' | 'medium' | 'heavy';
  customStars?: Array<{
    size: number;
    top: number;
    left?: number;
    right?: number;
    animationDelay: number;
    floatDelay: number;
    duration: number;
    translateY: number;
    maxOpacity?: number;
  }>;
}

const FloatingStars: React.FC<FloatingStarsProps> = ({ 
  density = 'medium',
  customStars 
}) => {
  const getStarConfig = () => {
    if (customStars) {
      return customStars;
    }

    // Light density - minimal stars in safe zones
    const baseStars = [
      {
        size: 28,
        top: 8,
        left: 8,
        animationDelay: 0,
        floatDelay: 1000,
        duration: 6000,
        translateY: 8,
        maxOpacity: 0.35,
      },
      {
        size: 24,
        top: 15,
        right: 12,
        animationDelay: 2000,
        floatDelay: 2000,
        duration: 8000,
        translateY: 6,
        maxOpacity: 0.3,
      },
      {
        size: 32,
        top: 85,
        left: 15,
        animationDelay: 4000,
        floatDelay: 3000,
        duration: 7000,
        translateY: 10,
        maxOpacity: 0.4,
      },
      {
        size: 20,
        top: 88,
        right: 18,
        animationDelay: 3000,
        floatDelay: 2500,
        duration: 9000,
        translateY: 7,
        maxOpacity: 0.25,
      },
    ];

    // Medium density - more stars in corners and edges
    const mediumStars = [
      ...baseStars,
      {
        size: 26,
        top: 22,
        left: 5,
        animationDelay: 1000,
        floatDelay: 1500,
        duration: 9000,
        translateY: 7,
        maxOpacity: 0.35,
      },
      {
        size: 30,
        top: 82,
        right: 8,
        animationDelay: 3000,
        floatDelay: 4000,
        duration: 6000,
        translateY: 9,
        maxOpacity: 0.4,
      },
      {
        size: 18,
        top: 5,
        right: 25,
        animationDelay: 1500,
        floatDelay: 2500,
        duration: 10000,
        translateY: 5,
        maxOpacity: 0.25,
      },
      {
        size: 22,
        top: 92,
        left: 25,
        animationDelay: 2500,
        floatDelay: 3500,
        duration: 8000,
        translateY: 8,
        maxOpacity: 0.3,
      },
      {
        size: 16,
        top: 18,
        right: 5,
        animationDelay: 4500,
        floatDelay: 1800,
        duration: 7500,
        translateY: 6,
        maxOpacity: 0.2,
      },
    ];

    // Heavy density - abundant stars but still avoiding center content area
    const heavyStars = [
      ...mediumStars,
      // Top edge stars
      {
        size: 34,
        top: 3,
        left: 25,
        animationDelay: 500,
        floatDelay: 2800,
        duration: 8500,
        translateY: 10,
        maxOpacity: 0.45,
      },
      {
        size: 20,
        top: 10,
        left: 35,
        animationDelay: 3500,
        floatDelay: 4200,
        duration: 11000,
        translateY: 6,
        maxOpacity: 0.3,
      },
      {
        size: 24,
        top: 6,
        right: 35,
        animationDelay: 2800,
        floatDelay: 1200,
        duration: 9500,
        translateY: 8,
        maxOpacity: 0.35,
      },
      // Bottom edge stars

      {
        size: 22,
        top: 90,
        right: 35,
        animationDelay: 4200,
        floatDelay: 2600,
        duration: 8200,
        translateY: 7,
        maxOpacity: 0.32,
      },
      {
        size: 36,
        top: 87,
        left: 5,
        animationDelay: 600,
        floatDelay: 4800,
        duration: 6800,
        translateY: 11,
        maxOpacity: 0.5,
      },
      // Side edge stars
      {
        size: 18,
        top: 35,
        left: 2,
        animationDelay: 3200,
        floatDelay: 1600,
        duration: 10500,
        translateY: 5,
        maxOpacity: 0.25,
      },
      {
        size: 26,
        top: 45,
        left: 8,
        animationDelay: 1200,
        floatDelay: 3800,
        duration: 9200,
        translateY: 8,
        maxOpacity: 0.38,
      },
      {
        size: 30,
        top: 65,
        left: 3,
        animationDelay: 4800,
        floatDelay: 2200,
        duration: 7200,
        translateY: 9,
        maxOpacity: 0.42,
      },
      {
        size: 20,
        top: 38,
        right: 3,
        animationDelay: 2200,
        floatDelay: 4600,
        duration: 8800,
        translateY: 6,
        maxOpacity: 0.28,
      },
      {
        size: 32,
        top: 72,
        right: 2,
        animationDelay: 800,
        floatDelay: 3600,
        duration: 7600,
        translateY: 10,
        maxOpacity: 0.44,
      },
      // Additional corner accents
      {
        size: 16,
        top: 12,
        left: 18,
        animationDelay: 4000,
        floatDelay: 2400,
        duration: 11200,
        translateY: 4,
        maxOpacity: 0.22,
      },
      {
        size: 14,
        top: 8,
        right: 18,
        animationDelay: 1600,
        floatDelay: 4400,
        duration: 12000,
        translateY: 3,
        maxOpacity: 0.2,
      },

    ];

    switch (density) {
      case 'light':
        return baseStars;
      case 'medium':
        return mediumStars;
      case 'heavy':
        return heavyStars;
      default:
        return mediumStars;
    }
  };

  const stars = getStarConfig();

  return (
    <>
      {stars.map((star, index) => (
        <FloatingStar
          key={index}
          size={star.size}
          top={star.top}
          left={star.left}
          right={star.right}
          animationDelay={star.animationDelay}
          floatDelay={star.floatDelay}
          duration={star.duration}
          translateY={star.translateY}
          maxOpacity={star.maxOpacity}
        />
      ))}
    </>
  );
};

export default FloatingStars;