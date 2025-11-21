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
const CARD_WIDTH = screenWidth - 37;
const CARD_HEIGHT = screenHeight * 0.35;

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
    <View style={[styles.cardContainer, { width: CARD_WIDTH }]}>
      {/* Image Area */}
      <View style={{ height: CARD_HEIGHT, position: 'relative' }}>
        <ShimmerEffect
          width="100%"
          height={CARD_HEIGHT}
          borderRadius={0}
        />

        {/* Hotel Name - Top Left */}
        <View style={{ position: 'absolute', top: 10, left: 10, right: 100, zIndex: 30 }}>
          <ShimmerEffect width="80%" height={16} borderRadius={4} style={{ marginBottom: 4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ShimmerEffect width={11} height={11} borderRadius={6} />
            <ShimmerEffect width="50%" height={12} borderRadius={4} />
          </View>
        </View>

        {/* Price and Rating - Bottom Left */}
        <View style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 30 }}>
          <View style={{ 
            backgroundColor: 'rgba(229, 231, 235, 0.9)',
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            overflow: 'hidden'
          }}>
            <View style={{ paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
              <ShimmerEffect width={45} height={16} borderRadius={4} />
              <ShimmerEffect width={35} height={10} borderRadius={4} />
            </View>
            <View style={{ width: 1, height: 16, backgroundColor: '#D1D5DB' }} />
            <View style={{ paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <ShimmerEffect width={11} height={11} borderRadius={6} />
              <ShimmerEffect width={28} height={14} borderRadius={4} />
              <ShimmerEffect width={10} height={10} borderRadius={6} />
            </View>
          </View>
        </View>

        {/* Images/Map Toggle - Bottom Right */}
        <View style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 40 }}>
          <View style={{
            backgroundColor: 'rgba(229, 231, 235, 0.9)',
            borderRadius: 12,
            paddingVertical: 11,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6
          }}>
            <ShimmerEffect width={12} height={12} borderRadius={6} />
            <ShimmerEffect width={55} height={12} borderRadius={4} />
          </View>
        </View>

        {/* Image Indicators - Top Right */}
        <View style={{ position: 'absolute', top: 14, right: 10, zIndex: 30 }}>
          <View style={{
            backgroundColor: 'rgba(229, 231, 235, 0.8)',
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 6
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {[0, 1, 2, 3].map((idx) => (
                <View
                  key={idx}
                  style={{
                    width: idx === 0 ? 6 : idx === 1 ? 4 : 3,
                    height: idx === 0 ? 6 : idx === 1 ? 4 : 3,
                    borderRadius: 999,
                    backgroundColor: idx === 0 ? '#FFFFFF' : idx === 1 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)',
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Content Section */}
      <View style={{ marginHorizontal: 12, marginVertical: 12 }}>
        {/* Expandable Info Section */}
        <View
          style={{
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 12,
            marginBottom: 10,
            overflow: 'hidden',
          }}
        >
          <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
            {/* Genie Badge */}
            <View style={{ marginBottom: 6 }}>
              <View style={{
                backgroundColor: '#E5E7EB',
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 4,
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4
              }}>
                <ShimmerEffect width={10} height={10} borderRadius={6} />
                <ShimmerEffect width={60} height={10} borderRadius={4} />
              </View>
            </View>

            {/* Match Text Lines */}
            <View style={{ marginBottom: 4, gap: 4 }}>
              <ShimmerEffect width="100%" height={13} borderRadius={4} />
              <ShimmerEffect width="98%" height={13} borderRadius={4} />
              <ShimmerEffect width="95%" height={13} borderRadius={4} />
              <ShimmerEffect width="75%" height={13} borderRadius={4} />
            </View>

            {/* Expand/Collapse Indicator */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'center', 
              paddingTop: 6,
              borderTopWidth: 1,
              borderTopColor: '#F3F4F6'
            }}>
              <ShimmerEffect width={60} height={11} borderRadius={4} style={{ marginRight: 2 }} />
              <ShimmerEffect width={12} height={12} borderRadius={6} />
            </View>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Favorite Button */}
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
          >
            <ShimmerEffect width={19} height={19} borderRadius={10} />
          </View>

          {/* Ask AI Button */}
          <View
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              gap: 6,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: 'rgba(29, 249, 255, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShimmerEffect width={11} height={11} borderRadius={6} />
            </View>
            <ShimmerEffect width={40} height={13} borderRadius={4} />
          </View>

          {/* Book Now Button */}
          <View
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              gap: 6,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: 'rgba(29, 249, 255, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShimmerEffect width={11} height={11} borderRadius={6} />
            </View>
            <ShimmerEffect width={58} height={13} borderRadius={4} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    ...Platform.select({
      android: {
        elevation: 8,
      },
    }),
  },
});

export default SwipeableHotelStoryCardLoadingPreview;