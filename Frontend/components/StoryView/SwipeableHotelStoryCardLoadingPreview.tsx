// SwipeableHotelStoryCardLoadingPreview.tsx - Updated to match new card design
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Dimensions,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_HORIZONTAL_MARGIN = 0;
const CAROUSEL_WIDTH = screenWidth - CARD_HORIZONTAL_MARGIN;

interface LoadingPreviewProps {
  index?: number;
  totalCount?: number;
}

interface ShimmerEffectProps {
  width: string | number;
  height: number;
  style?: any;
  borderRadius?: number;
}

const ShimmerEffect: React.FC<ShimmerEffectProps> = ({ 
  width, 
  height, 
  style, 
  borderRadius = 8 
}) => {
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

const SwipeableHotelStoryCardLoadingPreview: React.FC<LoadingPreviewProps> = ({ 
  index = 0, 
  totalCount = 1 
}) => {
  return (
    <View style={{ marginBottom: 18 }}>
      {/* Shadow wrapper */}
      <View style={[styles.shadowWrapper, { marginHorizontal: 0 }]}>
        {/* Inner card */}
        <View style={styles.cardContainer}>
          {/* Card Content */}
          <View style={{ backgroundColor: '#ffffff' }}>
            {/* Image Carousel */}
            <View style={{ marginBottom: 0, position: 'relative' }}>
              <ShimmerEffect
                width="100%"
                height={screenHeight * 0.34}
                borderRadius={0}
              />

              {/* Price badge */}
              <View
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: '#E5E7EB',
                  zIndex: 10,
                }}
              >
                <ShimmerEffect width={70} height={16} borderRadius={4} />
              </View>

              {/* Rating badge */}
              <View
                style={{
                  position: 'absolute',
                  top: 52,
                  left: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: '#E5E7EB',
                  zIndex: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <ShimmerEffect width={11} height={11} borderRadius={6} />
                <ShimmerEffect width={24} height={14} borderRadius={4} />
              </View>

              {/* Images/Map toggle */}
              <View
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  backgroundColor: '#E5E7EB',
                  borderRadius: 8,
                  flexDirection: 'row',
                  overflow: 'hidden',
                  zIndex: 10,
                }}
              >
                <View style={{ width: 75, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                  <ShimmerEffect width={12} height={12} borderRadius={6} />
                  <ShimmerEffect width={40} height={10} borderRadius={4} />
                </View>
                <View style={{ width: 75, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                  <ShimmerEffect width={12} height={12} borderRadius={6} />
                  <ShimmerEffect width={28} height={10} borderRadius={4} />
                </View>
              </View>

              {/* Hotel name and location at bottom of image */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 10,
                  right: 10,
                  zIndex: 10,
                }}
              >
                <ShimmerEffect width="70%" height={16} borderRadius={4} style={{ marginBottom: 4 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ShimmerEffect width={11} height={11} borderRadius={6} />
                  <ShimmerEffect width="45%" height={12} borderRadius={4} />
                </View>
              </View>

              {/* Image dots indicator */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 60,
                  left: 0,
                  right: 0,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 4,
                  zIndex: 10,
                }}
              >
                {[0, 1, 2, 3].map((idx) => (
                  <View
                    key={idx}
                    style={{
                      width: idx === 0 ? 5 : 4,
                      height: idx === 0 ? 5 : 4,
                      borderRadius: 999,
                      backgroundColor: '#E5E7EB',
                    }}
                  />
                ))}
              </View>
            </View>

            {/* Content Area */}
            <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12 }}>
              {/* Amenities - Horizontal scroll */}
              <View style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[0, 1, 2].map((idx) => (
                    <View
                      key={idx}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: '#F9FAFB',
                      }}
                    >
                      <ShimmerEffect 
                        width={idx % 3 === 0 ? 52 : idx % 3 === 1 ? 48 : 45} 
                        height={9} 
                        borderRadius={4} 
                      />
                    </View>
                  ))}
                </View>
              </View>

              {/* Genie Says Section */}
              <View
                style={{
                  backgroundColor: 'rgba(29, 249, 255, 0.06)',
                  borderLeftWidth: 2,
                  borderLeftColor: '#1df9ff',
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 8,
                  marginBottom: 10,
                }}
              >
                <View style={{ gap: 4 }}>
                  <ShimmerEffect width="100%" height={10} borderRadius={4} />
                  <ShimmerEffect width="95%" height={10} borderRadius={4} />
                  <ShimmerEffect width="70%" height={10} borderRadius={4} />
                </View>
              </View>

              {/* Separator */}
              <View style={{ height: 1, backgroundColor: '#F3F4F6', marginBottom: 10 }} />

              {/* Guest Reviews Button */}
              <View
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ShimmerEffect width={14} height={14} borderRadius={7} />
                  <ShimmerEffect width={85} height={10} borderRadius={4} />
                </View>
                <ShimmerEffect width={13} height={13} borderRadius={7} />
              </View>

              {/* Bottom Action Bar - 3 buttons */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 4,
                }}
              >
                {/* Heart Button */}
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: '#E5E5E5',
                  }}
                >
                  <ShimmerEffect width={19} height={19} borderRadius={10} />
                </View>

                {/* Ask AI Button */}
                <View
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: '#E5E5E5',
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: 'rgba(29, 249, 255, 0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShimmerEffect width={14} height={14} borderRadius={7} />
                  </View>
                  <ShimmerEffect width={38} height={10} borderRadius={4} />
                </View>

                {/* View Details Button */}
                <View
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: '#E5E5E5',
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: 'rgba(29, 249, 255, 0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShimmerEffect width={14} height={14} borderRadius={7} />
                  </View>
                  <ShimmerEffect width={58} height={10} borderRadius={4} />
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowWrapper: {
    borderRadius: 12,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    ...Platform.select({
      android: {
        elevation: 12,
        backgroundColor: '#fff',
      },
    }),
  },
  cardContainer: {
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
});

export default SwipeableHotelStoryCardLoadingPreview;