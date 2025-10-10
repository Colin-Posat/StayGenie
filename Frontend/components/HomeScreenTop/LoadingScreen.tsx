// LoadingScreen.tsx - Updated to match InitialSearchScreen style with turquoise theme
import React, { useEffect, useRef, useState } from 'react';
import { View, Text as RNText, Animated, Image } from 'react-native';
import tw from 'twrnc';
import { Text } from '../../components/CustomText'; 

interface LoadingScreenProps {
  searchQuery: string;
  logoSource?: any;
  isComplete?: boolean;
}

// Turquoise color theme to match InitialSearchScreen
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';

// Refined, hotel-focused loading steps
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
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const hoverAnim = useRef(new Animated.Value(0)).current;
  const turquoiseGlow = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const dotsAnim = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3)
  ]).current;

  const [currentStep, setCurrentStep] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(LOADING_STEPS[0].message);
  const stepTimeouts = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Initial entrance animation with turquoise glow
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(turquoiseGlow, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
    ]).start();

    // Gentle float animation for logo
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(hoverAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(hoverAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();

    // Progress bar animation
    const totalDuration = LOADING_STEPS.reduce((sum, step) => sum + step.duration, 0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: totalDuration,
      useNativeDriver: false,
    }).start();

    // Animated dots with turquoise wave effect
    const animateDots = () => {
      const animations = dotsAnim.map((dot, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 300),
            Animated.timing(dot, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0.3,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        )
      );

      animations.forEach(anim => anim.start());
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
    outputRange: [0, -8],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[
      tw`flex-1 justify-center items-center bg-white px-6`,
      { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
    ]}>
      {/* Background gradient overlay to match InitialSearchScreen */}
      <View style={tw`absolute inset-0 bg-gradient-to-b from-gray-50 to-white opacity-60`} />
      
      {/* Subtle background circles with turquoise tint */}
      <View style={tw`absolute inset-0 opacity-5`}>
        <View style={[
          tw`absolute top-20 left-8 w-24 h-24 rounded-full border`,
          { borderColor: TURQUOISE }
        ]} />
        <View style={[
          tw`absolute bottom-32 right-6 w-32 h-32 rounded-full border`,
          { borderColor: TURQUOISE }
        ]} />
        <View style={[
          tw`absolute top-1/4 right-12 w-16 h-16 rounded-full border`,
          { borderColor: TURQUOISE }
        ]} />
      </View>
      
      {/* Logo with gentle float and turquoise glow */}
      <Animated.View style={[
        tw`mb-2`,
        { 
          transform: [{ translateY: floatY }],
          shadowColor: TURQUOISE,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: turquoiseGlow.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.3],
          }),
          shadowRadius: 20,
          elevation: 10,
        }
      ]}>
        <Image 
          source={require('../../assets/images/logo3.png')}
          style={tw`w-50 h-50`}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Main Title with turquoise accent */}
      <View style={tw`items-center mb-6`}>
        <Text style={tw`text-2xl font-semibold text-gray-900 text-center mb-1`}>
          Finding your perfect stay{' '}
        </Text>

      </View>

      {/* Search Query in a clean card matching InitialSearchScreen style */}
      <View style={[
        tw`bg-white rounded-3xl px-6 py-4 mb-8 shadow-lg border max-w-sm`,
        {
          borderColor: TURQUOISE,
          borderWidth: 1,
          shadowColor: TURQUOISE,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 8,
        }
      ]}>
        <Text style={tw`text-base text-gray-700 text-center font-medium`}>
          {searchQuery}
        </Text>
      </View>

      {/* Current Step Message */}
      <View style={tw`mb-8 min-h-[50px] justify-center`}>
        <Text style={tw`text-lg text-gray-800 text-center font-medium px-4`}>
          {currentMessage}
        </Text>
      </View>

      {/* Animated Dots with turquoise styling */}
      <View style={tw`flex-row gap-3 mb-12`}>
        {dotsAnim.map((dot, index) => (
          <Animated.View
            key={index}
            style={[
              tw`w-3 h-3 rounded-full`,
              {
                backgroundColor: TURQUOISE,
                opacity: dot,
                transform: [{
                  scale: dot.interpolate({
                    inputRange: [0.3, 1],
                    outputRange: [0.8, 1.2],
                  })
                }]
              }
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

export default LoadingScreen;
export { LOADING_STEPS };