// SwipeableHotelStoryCardLoadingPreview.tsx - Updated to match current card design
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Dimensions,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 42;
const CARD_HEIGHT = screenHeight * 0.52;
const TURQUOISE = '#1df9ff';

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
      {[0, 1, 2, 3].map((index) => (
        <TouchableOpacity
          key={index}
          style={[
            tw`flex-1 rounded-full overflow-hidden`, 
            {
              height: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 2,
            }
          ]}
          activeOpacity={0.7}
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
        </TouchableOpacity>
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
        {/* Loading Progress Bar - now with 4 slides */}
        <LoadingProgressBar />

        {/* Background Loading Image */}
        <ShimmerEffect
          width="100%"
          height={CARD_HEIGHT}
          style={{ position: 'absolute', top: 0, left: 0 }}
          borderRadius={0}
        />

        {/* Reduced gradient for less obstruction */}
        <View style={tw`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent z-1`} />

        {/* COMPACT TOP: Hotel info sized to content */}
        <View style={tw`absolute top-12 left-2 right-2 z-10`}>
          <View style={[
            tw`bg-black/30 border border-white/15 px-2 py-1 rounded-lg self-start`,
          ]}>
            <ShimmerEffect width={120} height={12} borderRadius={4} />
            <View style={tw`flex-row items-center mt-0.5`}>
              <Ionicons name="location" size={10} color="#FFFFFF" />
              <View style={tw`ml-1`}>
                <ShimmerEffect width={80} height={10} borderRadius={4} />
              </View>
            </View>
          </View>
        </View>

        {/* COMPACT BOTTOM: Essential info only with tighter spacing */}
        <View style={tw`absolute bottom-4 left-2 right-2 z-10`}>
          {/* Compact price and rating row */}
          <View style={tw`flex-row items-center justify-between mb-2`}>
            <View style={tw`bg-black/45 border border-white/15 px-2 py-1 rounded-md`}>
              <View style={tw`flex-row items-baseline`}>
                <ShimmerEffect width={40} height={18} borderRadius={4} />
                <View style={tw`ml-1`}>
                  <ShimmerEffect width={25} height={10} borderRadius={4} />
                </View>
              </View>
            </View>
            
            <View style={tw`bg-black/45 border border-white/15 px-2 py-1 rounded-md flex-row items-center`}>
              <View 
                style={[
                  tw`w-4 h-4 rounded-full items-center justify-center mr-1`,
                  { backgroundColor: '#E5E7EB' }
                ]}
              >
                <Ionicons 
                  name="thumbs-up" 
                  size={8} 
                  color="#9CA3AF"
                />
              </View>
              <ShimmerEffect width={20} height={12} borderRadius={4} />
              <View style={tw`ml-1`}>
                <ShimmerEffect width={25} height={10} borderRadius={4} />
              </View>
            </View>
          </View>

          {/* Flexible amenities row - adapts to text length */}
          <View style={tw`mb-2 flex-row flex-wrap gap-1`}>
            {[0, 1, 2].map((idx) => (
              <View
                key={idx}
                style={[
                  tw`px-1.5 py-0.5 rounded-full`,
                  { backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1 }
                ]}
              >
                <ShimmerEffect width={idx === 0 ? 40 : idx === 1 ? 35 : 30} height={9} borderRadius={4} />
              </View>
            ))}
          </View>

          {/* Compact AI insight with smaller text */}
          <View style={tw`bg-black/40 p-2 rounded-md border border-white/15`}>
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons 
                name="sparkles" 
                size={10} 
                color="#1df9ff" 
              />
              <Text style={tw`text-white text-[10px] font-semibold ml-1`}>
                AI Insight
              </Text>
              <View style={tw`ml-2`}>
                <Text style={tw`text-white/60 text-[10px]`}>Loading...</Text>
              </View>
            </View>
            <View style={tw`gap-0.5`}>
              <ShimmerEffect width="100%" height={10} borderRadius={4} />
              <ShimmerEffect width="85%" height={10} borderRadius={4} />
              <ShimmerEffect width="92%" height={10} borderRadius={4} />
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Action Buttons - Updated to match new responsive design */}
      <View style={tw`bg-white rounded-b-2xl`}>
        <View style={tw`flex-row items-center px-3 py-3 gap-2`}>
          {/* Heart Button - Compact with rounded design */}
          <View style={[
            tw`w-10 h-10 items-center justify-center rounded-xl bg-white border border-gray-200`,
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 3,
              elevation: 2,
            }
          ]}>
            <Ionicons name="heart-outline" size={20} color="#9CA3AF" />
          </View>

          {/* Ask Button - Responsive pill with circular icon background */}
          <View style={[
            tw`py-2.5 px-3 rounded-xl flex-row items-center flex-1 justify-center bg-white border border-gray-200`,
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 3,
              elevation: 2,
              minHeight: 40,
              maxWidth: '30%',
            }
          ]}>
            <View style={[
              tw`w-5 h-5 rounded-full items-center justify-center mr-1.5`,
              { backgroundColor: 'rgba(29, 249, 255, 0.15)' }
            ]}>
              <Ionicons name="chatbubble-outline" size={12} color="#9CA3AF" />
            </View>
            <Text
              style={tw`text-xs font-medium text-gray-400`}
            >
              Ask
            </Text>
          </View>

          {/* Map Button - Responsive pill with circular icon background */}
          <View style={[
            tw`py-2.5 px-3 rounded-xl flex-row items-center flex-1 justify-center bg-white border border-gray-200`,
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 3,
              elevation: 2,
              minHeight: 40,
              maxWidth: '30%',
            }
          ]}>
            <View style={[
              tw`w-5 h-5 rounded-full items-center justify-center mr-1.5`,
              { backgroundColor: 'rgba(29, 249, 255, 0.15)' }
            ]}>
              <Ionicons name="map-outline" size={12} color="#9CA3AF" />
            </View>
            <Text
              style={tw`text-xs font-medium text-gray-400`}
            >
              Map
            </Text>
          </View>

          {/* Book Button - Responsive pill with circular icon background */}
          <View style={[
            tw`py-2.5 px-3 rounded-xl flex-row items-center flex-1 justify-center bg-white border border-gray-200`,
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 3,
              elevation: 2,
              minHeight: 40,
              maxWidth: '30%',
            }
          ]}>
            <View style={[
              tw`w-5 h-5 rounded-full items-center justify-center mr-1.5`,
              { backgroundColor: 'rgba(29, 249, 255, 0.15)' }
            ]}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={{ width: 12, height: 12, tintColor: '#9CA3AF' }}
                resizeMode="contain"
              />
            </View>
            <Text
              style={tw`text-xs font-medium text-gray-400`}
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