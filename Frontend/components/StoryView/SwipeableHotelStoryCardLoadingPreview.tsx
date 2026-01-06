// SwipeableHotelStoryCardLoadingPreview.tsx
// Jitter-free premium loading state

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Dimensions,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import tw from 'twrnc';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = Math.round(screenWidth - 37);
const CARD_HEIGHT = screenHeight * 0.45;

const TURQUOISE = '#1df9ff';
const TURQUOISE_DARK = '#00d4e6';

const LOADING_MESSAGES = [
  'Detecting what matters most to you',
  'Finding places that feel just right',
  'Putting in the final touches',
];

/* ---------- SHIMMER ---------- */

const ShimmerEffect = ({
  width,
  height,
  style,
  borderRadius = 8,
}: {
  width: string | number;
  height: number;
  style?: any;
  borderRadius?: number;
}) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: '#E5E7EB',
          borderRadius,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: '#F3F4F6',
            opacity: shimmer.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.25, 0.5, 0.25],
            }),
            transform: [
              {
                translateX: shimmer.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-200, 200],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
};

/* ---------- MAIN ---------- */

const SwipeableHotelStoryCardLoadingPreview = () => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  const messageOpacity = useRef(new Animated.Value(1)).current;
  const sparkleRotate = useRef(new Animated.Value(0)).current;
  const sparkleScale = useRef(new Animated.Value(1)).current;

  const [fontsLoaded] = useFonts({
    'Merriweather-Regular': require('../../assets/fonts/Merriweather_36pt-Regular.ttf'),
  });

  /* Sparkle: soft + slow */
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(sparkleRotate, {
            toValue: 1,
            duration: 2800,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleRotate, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(sparkleScale, {
            toValue: 1.12,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleScale, {
            toValue: 1,
            duration: 1400,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  /* 🔒 JITTER-FREE TEXT CYCLE - STOPS AT LAST MESSAGE */
  useEffect(() => {
    let mounted = true;
    let timeout: NodeJS.Timeout;

    const cycle = () => {
      // Don't cycle if we're already at the last message
      if (currentMessageIndex >= LOADING_MESSAGES.length - 1) {
        return;
      }

      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        if (!mounted) return;

        // 🔒 SWITCH TEXT ONLY WHILE INVISIBLE
        setCurrentMessageIndex((prev) => {
          const nextIndex = prev + 1;
          // Stop at the last message
          return Math.min(nextIndex, LOADING_MESSAGES.length - 1);
        });

        requestAnimationFrame(() => {
          Animated.timing(messageOpacity, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }).start(() => {
            if (!mounted) return;
            timeout = setTimeout(cycle, 2200);
          });
        });
      });
    };

    timeout = setTimeout(cycle, 2200);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [currentMessageIndex]);

  if (!fontsLoaded) return null;

  const rotation = sparkleRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.cardContainer, { width: CARD_WIDTH }]}>
      <View style={styles.borderWrapper}>
        <View style={{ height: CARD_HEIGHT }}>
          <ShimmerEffect width="100%" height={CARD_HEIGHT} borderRadius={0} />

          {/* LOADING OVERLAY */}
          <View style={styles.overlay}>
            <View style={styles.loadingCard}>
              <Animated.View
                style={{
                  marginBottom: 14,
                  transform: [{ rotate: rotation }, { scale: sparkleScale }],
                }}
              >
                <LinearGradient
                  colors={[TURQUOISE, TURQUOISE_DARK]}
                  style={styles.sparkle}
                >
                  <Ionicons name="sparkles" size={22} color="white" />
                </LinearGradient>
              </Animated.View>

              <Animated.View style={{ opacity: messageOpacity }}>
                <Text style={styles.loadingText}>
                  {LOADING_MESSAGES[currentMessageIndex]}
                </Text>
              </Animated.View>

              <View style={styles.dots}>
                {[0, 1, 2].map((i) => (
                  <LoadingDot key={i} delay={i * 160} />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* BODY SHIMMER */}
        <View style={tw`mx-3 my-3 gap-2`}>
          <ShimmerEffect width="100%" height={14} />
          <ShimmerEffect width="92%" height={14} />
          <ShimmerEffect width="80%" height={14} />
        </View>
      </View>
    </View>
  );
};

/* ---------- DOTS ---------- */

const LoadingDot = ({ delay }: { delay: number }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(0,212,230,0.7)',
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -3],
            }),
          },
        ],
      }}
    />
  );
};

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    elevation: 8,
  },
  borderWrapper: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    width: CARD_WIDTH * 0.82,
  },
  sparkle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Merriweather-Regular',
    color: '#1F2937',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
});

export default SwipeableHotelStoryCardLoadingPreview;