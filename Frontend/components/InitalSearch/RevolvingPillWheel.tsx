// components/InitialSearch/RevolvingPillWheel.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import tw from 'twrnc';

const { width } = Dimensions.get('window');

// Turquoise color theme
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const TURQUOISE_SUBTLE = '#f0feff'; // Very light turquoise background
const TURQUOISE_BORDER = '#b3f7ff'; // Light turquoise border

export interface SearchRecommendation {
  text: string;
  query: string;
}

interface RevolvingPillWheelProps {
  recommendations: SearchRecommendation[];
  onPress: (recommendation: SearchRecommendation) => void;
  pixelsPerSecond?: number;
  pauseOnInteraction?: boolean;
}

const RevolvingPillWheel: React.FC<RevolvingPillWheelProps> = ({
  recommendations,
  onPress,
  pixelsPerSecond = 30,
  pauseOnInteraction = true,
}) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  
  // Create seamless loop by tripling the array
  const extendedRecommendations = [
    ...recommendations,
    ...recommendations,
    ...recommendations,
  ];

  const startAnimation = () => {
    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
    }

    // Calculate total width for one complete cycle (just one set, not the full tripled array)
    const itemWidth = 160; // Reduced width for shorter pills
    const gap = 12;
    const totalWidth = recommendations.length * (itemWidth + gap);
    
    // Calculate duration based on consistent speed
    const duration = (totalWidth / pixelsPerSecond) * 1000;
        
    animationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scrollX, {
          toValue: -totalWidth,
          duration: duration,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
        // Reset to 0 instantly to create seamless loop
        Animated.timing(scrollX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
      { iterations: -1 } // Infinite loop
    );
        
    if (!isPaused) {
      animationRef.current.start();
    }
  };

  useEffect(() => {
    startAnimation();
        
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [recommendations.length, isPaused, pixelsPerSecond]);

  // Handle pause/resume when isPaused changes
  useEffect(() => {
    if (isPaused) {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    } else {
      startAnimation();
    }
  }, [isPaused]);

  const handlePillPress = (recommendation: SearchRecommendation, index: number) => {
    if (pauseOnInteraction) {
      setIsPaused(true);
      setPressedIndex(index);
            
      setTimeout(() => {
        setIsPaused(false);
        setPressedIndex(null);
      }, 3000);
    }
        
    onPress(recommendation);
  };

  return (
    <View style={tw`h-16 overflow-hidden`}>
      <Animated.View
        style={[
          tw`flex-row items-center gap-3`,
          {
            transform: [{ translateX: scrollX }],
            paddingHorizontal: width * 0.1,
          }
        ]}
      >
        {extendedRecommendations.map((recommendation, index) => {
          const isPressed = pressedIndex === index;
          
          return (
            <TouchableOpacity
              key={`${recommendation.text}-${index}`}
              style={[
                tw`px-4 py-2 rounded-full border`,
                {
                  width: 140, // Fixed shorter width
                  minHeight: 40, // Allow height to grow for stacked text
                  justifyContent: 'center',
                  backgroundColor: isPressed ? TURQUOISE_LIGHT : TURQUOISE_SUBTLE,
                  borderColor: isPressed ? TURQUOISE : TURQUOISE_BORDER,
                  borderWidth: isPressed ? 1.5 : 1,
                  shadowColor: isPressed ? TURQUOISE : '#000',
                  shadowOffset: {
                    width: 0,
                    height: isPressed ? 2 : 1,
                  },
                  shadowOpacity: isPressed ? 0.2 : 0.08,
                  shadowRadius: isPressed ? 4 : 2,
                  elevation: isPressed ? 4 : 2,
                }
              ]}
              activeOpacity={0.7}
              onPress={() => handlePillPress(recommendation, index)}
            >
              <Text
                style={[
                  tw`text-xs font-medium text-center leading-tight`,
                  {
                    color: isPressed ? TURQUOISE_DARK : '#4B5563', // Gray-600 equivalent
                  }
                ]}
                numberOfLines={2} // Allow up to 2 lines
                ellipsizeMode="tail"
              >
                {recommendation.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </View>
  );
};

export default RevolvingPillWheel;