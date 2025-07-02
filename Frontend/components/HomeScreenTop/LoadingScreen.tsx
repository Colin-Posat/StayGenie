// LoadingScreen.tsx - Simple & Fun Step Progression
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Image } from 'react-native';
import tw from 'twrnc';

interface LoadingScreenProps {
  searchQuery: string;
  logoSource?: any;
  isComplete?: boolean;
}

// Simplified, fun steps that users can relate to
const LOADING_STEPS = [
  { message: "Looking for amazing hotels", duration: 3000 },
  { message: "Getting smart recommendations", duration: 4000 },
  { message: "Adding the perfect touches", duration: 3000 }
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  searchQuery, 
  logoSource,
  isComplete = false
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const hoverAnim = useRef(new Animated.Value(0)).current;
  const dotsAnim = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;

  const [currentStep, setCurrentStep] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(LOADING_STEPS[0].message);
  const stepTimeouts = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Initial entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Gentle float animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(hoverAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(hoverAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();

    // Animated dots with wave effect
    const animateDots = () => {
      const animations = dotsAnim.map((dot, index) =>
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.timing(dot, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );

      Animated.loop(Animated.stagger(200, animations)).start();
    };
    animateDots();

    // Step progression
    let cumulativeTime = 0;
    LOADING_STEPS.forEach((step, index) => {
      cumulativeTime += step.duration;
      const timeout = setTimeout(() => {
        if (!isComplete) {
          setCurrentStep(index);
          setCurrentMessage(step.message);
        }
      }, cumulativeTime);
      
      stepTimeouts.current.push(timeout);
    });

    return () => {
      stepTimeouts.current.forEach(timeout => clearTimeout(timeout));
      stepTimeouts.current = [];
      floatAnimation.stop();
    };
  }, [isComplete]);

  // Complete the loading when done
  useEffect(() => {
    if (isComplete) {
      setCurrentMessage("Ready to explore!");
      stepTimeouts.current.forEach(timeout => clearTimeout(timeout));
      stepTimeouts.current = [];
    }
  }, [isComplete]);

  const floatY = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <Animated.View style={[
      tw`flex-1 justify-center items-center bg-white px-8`,
      { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
    ]}>
      {/* Subtle background elements */}
      <View style={tw`absolute inset-0 opacity-5`}>
        <View style={tw`absolute top-16 left-8 w-24 h-24 border border-black rounded-full`} />
        <View style={tw`absolute bottom-24 right-6 w-32 h-32 border border-black rounded-full`} />
        <View style={tw`absolute top-1/4 right-12 w-16 h-16 border border-black rounded-full`} />
      </View>
      
      {/* Logo with gentle float */}
      <Animated.View style={[
        tw`mb-8`,
        { transform: [{ translateY: floatY }] }
      ]}>
        <Image 
          source={require('../../assets/images/logo.png')}
          style={tw`w-28 h-28`}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Main Title */}
      <Text style={tw`text-2xl font-light text-black mb-8 text-center tracking-wide`}>
        Finding your perfect stay
      </Text>

      {/* Search Query in a clean card */}
      <View style={tw`bg-gray-50 rounded-2xl px-6 py-4 mb-12 border border-gray-100 max-w-sm`}>
        <Text style={tw`text-base text-gray-600 text-center font-medium`}>
          {searchQuery}
        </Text>
      </View>

      {/* Current Step Message */}
      <View style={tw`mb-12 min-h-[60px] justify-center`}>
        <Text style={tw`text-xl text-black text-center font-light px-4`}>
          {currentMessage}
        </Text>
      </View>

      {/* Simple Animated Dots */}
      <View style={tw`flex-row gap-2 mb-16`}>
        {dotsAnim.map((dot, index) => (
          <Animated.View
            key={index}
            style={[
              tw`w-3 h-3 bg-black rounded-full`,
              { opacity: dot }
            ]}
          />
        ))}
      </View>

    </Animated.View>
  );
};

export default LoadingScreen;
export { LOADING_STEPS };