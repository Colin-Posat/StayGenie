// SwipeableHotelStoryCardLoadingPreview.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Dimensions,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 42;
const CARD_HEIGHT = screenHeight * 0.51;
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const BLACK = "#000000";

interface LoadingPreviewProps {
  index?: number;
  totalCount?: number;
}

const ShimmerEffect: React.FC<{ 
  width: string | number; 
  height: number; 
  style?: any;
  borderRadius?: number;
}> = ({ width, height, style, borderRadius = 8 }) => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();

    return () => shimmer.stop();
  }, [shimmerAnimation]);

  const translateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

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
            opacity,
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

const LoadingProgressBar: React.FC = () => {
  const progressAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const progress = Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(progressAnimation, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ])
    );
    progress.start();

    return () => progress.stop();
  }, [progressAnimation]);

  return (
    <View style={[
      tw`flex-row absolute left-4 right-4 z-30 gap-2`,
      { top: 12 },
      {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        padding: 8,
        borderRadius: 12,
      }
    ]}>
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={[
            tw`flex-1 rounded-full overflow-hidden`,
            {
              height: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
            }
          ]}
        >
          <Animated.View
            style={[
              tw`h-full rounded-full`,
              {
                backgroundColor: index === 0 ? '#1df9ff' : '#FFFFFF',
                opacity: 0.6,
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }
            ]}
          />
        </View>
      ))}
    </View>
  );
};

const SwipeableHotelStoryCardLoadingPreview: React.FC<LoadingPreviewProps> = ({ 
  index = 0, 
  totalCount = 1 
}) => {
  return (
    <View style={[tw`rounded-2xl shadow-lg`, { position: 'relative' }]}>
      <View
        style={[
          tw`bg-white overflow-hidden relative rounded-t-2xl`,
          { width: CARD_WIDTH, height: CARD_HEIGHT },
        ]}
      >
        {/* Loading Progress Bar */}
        <LoadingProgressBar />

        {/* Background Loading Image */}
        <ShimmerEffect
          width="100%"
          height={CARD_HEIGHT}
          style={{ position: 'absolute', top: 0, left: 0 }}
          borderRadius={0}
        />

        {/* Gradient Overlay */}
        <View style={tw`absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-black/70 to-transparent z-1`} />

        {/* Top Content - Hotel Name and Location */}
        <View style={tw`absolute top-10 left-4 z-10`}>
          <View style={[tw`bg-black/30 border border-white/20 px-2.5 py-1.5 rounded-lg`, { maxWidth: screenWidth * 0.6 }]}>
            <ShimmerEffect width={120} height={16} borderRadius={4} />
          </View>
          
          <View style={tw`flex-row items-center mt-1.5`}>
            <View style={tw`bg-black/30 border border-white/20 px-2 py-1 rounded-md flex-row items-center`}>
              <Ionicons name="location" size={12} color="#FFFFFF" style={{ opacity: 0.6 }} />
              <View style={tw`ml-1`}>
                <ShimmerEffect width={80} height={12} borderRadius={4} />
              </View>
            </View>
          </View>
        </View>
        

        {/* Bottom Content */}
        <View style={tw`absolute bottom-6 left-4 right-4 z-10`}>
          {/* Price and Rating Row */}
          <View style={tw`flex-row items-end gap-2 mb-2.5`}>
            <View style={tw`bg-black/50 border border-white/20 px-3 py-1.5 rounded-lg`}>
              <ShimmerEffect width={60} height={20} borderRadius={4} />
            </View>
            
            <View style={tw`bg-black/50 border border-white/20 px-3 py-1.5 rounded-lg`}>
              <View style={tw`flex-row items-center`}>
                <View 
                  style={[
                    tw`w-5 h-5 rounded-full items-center justify-center mr-1`,
                    { backgroundColor: '#E5E7EB' }
                  ]}
                >
                  <Ionicons 
                    name="thumbs-up" 
                    size={10} 
                    color="#9CA3AF"
                  />
                </View>
                <ShimmerEffect width={40} height={12} borderRadius={4} />
              </View>
            </View>
          </View>

          {/* AI Insight Box */}
          <View style={tw`bg-black/50 p-2.5 rounded-lg border border-white/20`}>

            <View style={tw`gap-1`}>
              <ShimmerEffect width="100%" height={12} borderRadius={4} />
              <ShimmerEffect width="85%" height={12} borderRadius={4} />
              <ShimmerEffect width="92%" height={12} borderRadius={4} />
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Action Buttons */}
      <View style={tw`bg-white rounded-b-2xl`}>
        <View style={tw`flex-row items-center px-4 py-3 gap-2`}>
          {/* Heart Button - Disabled State */}
          <View
            style={[
              tw`w-12 h-12 rounded-xl border-2 items-center justify-center`,
              {
                backgroundColor: '#F3F4F6',
                borderColor: '#E5E7EB',
              },
            ]}
          >
            <Ionicons name="heart-outline" size={24} color="#9CA3AF" />
          </View>

          {/* Ask Button - Loading */}
          <View
            style={[
              tw`py-3 px-4 rounded-xl border-2 flex-row items-center flex-1 justify-center`,
              {
                backgroundColor: '#F3F4F6',
                borderColor: '#E5E7EB',
              },
            ]}
          >
            <Ionicons name="chatbubble" size={14} color="#9CA3AF" />
            <Text
              style={[tw`ml-2 font-medium text-xs`, { color: '#9CA3AF' }]}
              allowFontScaling={false}
            >
              Ask
            </Text>
          </View>

          {/* Map Button - Loading */}
          <View
            style={[
              tw`py-3 px-4 rounded-xl border-2 flex-row items-center flex-1 justify-center`,
              {
                backgroundColor: '#F3F4F6',
                borderColor: '#E5E7EB',
              },
            ]}
          >
            <Ionicons name="map" size={14} color="#9CA3AF" />
            <Text
              style={[tw`ml-2 font-medium text-xs`, { color: '#9CA3AF' }]}
              allowFontScaling={false}
            >
              Map
            </Text>
          </View>

          {/* Book Button - Loading */}
          <View
            style={[
              tw`py-3 px-4 rounded-xl border-2 flex-row items-center flex-1 justify-center`,
              {
                backgroundColor: '#F3F4F6',
                borderColor: '#E5E7EB',
              },
            ]}
          >
            <View style={{ width: 14, height: 14, backgroundColor: '#9CA3AF', borderRadius: 2 }} />
            <Text
              style={[tw`ml-2 font-medium text-xs`, { color: '#9CA3AF' }]}
              allowFontScaling={false}
            >
              Book
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default SwipeableHotelStoryCardLoadingPreview;