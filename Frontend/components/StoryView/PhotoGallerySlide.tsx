// PhotoGallerySlide.tsx - Centered photo gallery layout
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Modal,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 42;

interface PhotoGallerySlideProps {
  hotel: {
    images: string[];
    firstRoomImage?: string | null;
    secondRoomImage?: string | null;
    thirdImageHd?: string | null;
    name: string;
  };
  insightsStatus?: string;
}

interface FullScreenGalleryProps {
  visible: boolean;
  images: string[];
  initialIndex: number;
  hotelName: string;
  onClose: () => void;
}

const FullScreenGallery: React.FC<FullScreenGalleryProps> = ({
  visible,
  images,
  initialIndex,
  hotelName,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, initialIndex]);

  useEffect(() => {
    if (visible && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: currentIndex * screenWidth,
          animated: false,
        });
      }, 100);
    }
  }, [visible, currentIndex]);

  const handleScroll = (event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(scrollX / screenWidth);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < images.length) {
      setCurrentIndex(newIndex);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar hidden />
      <Animated.View
        style={[
          tw`flex-1 bg-black`,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Header */}
        <View style={tw`absolute top-12 left-0 right-0 z-20 flex-row items-center justify-between px-4`}>
          <TouchableOpacity
            onPress={onClose}
            style={tw`bg-black/50 rounded-full p-2`}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={tw`bg-black/50 rounded-full px-3 py-2`}>
            <Text style={tw`text-white text-sm font-medium`}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
          
          <View style={tw`w-10`} />
        </View>

        {/* Gallery */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={tw`flex-1`}
          contentContainerStyle={tw`items-center justify-center`}
        >
          {images.map((imageUri, index) => (
            <View
              key={index}
              style={[
                tw`items-center justify-center`,
                { width: screenWidth, height: screenHeight },
              ]}
            >
              <Image
                source={{ uri: imageUri }}
                style={{
                  width: screenWidth,
                  height: screenHeight * 0.8,
                }}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* Bottom info */}
        <View style={tw`absolute bottom-12 left-0 right-0 px-4`}>
          <View style={tw`bg-black/70 rounded-lg p-4`}>
            <Text style={tw`text-white text-lg font-semibold mb-1`}>
              {hotelName}
            </Text>
            <Text style={tw`text-white/80 text-sm`}>
              Photo {currentIndex + 1} of {images.length}
            </Text>
          </View>
        </View>

        {/* Navigation dots */}
        <View style={tw`absolute bottom-32 left-0 right-0 flex-row justify-center gap-2`}>
          {images.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                setCurrentIndex(index);
                scrollViewRef.current?.scrollTo({
                  x: index * screenWidth,
                  animated: true,
                });
              }}
              style={[
                tw`w-2 h-2 rounded-full`,
                {
                  backgroundColor: index === currentIndex ? '#1df9ff' : 'rgba(255,255,255,0.4)',
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
};

const PhotoGallerySlide: React.FC<PhotoGallerySlideProps> = ({
  hotel,
  insightsStatus = 'complete',
}) => {
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Collect all available images
  const getAllImages = () => {
    const allImages: string[] = [];
    
    // Add main hotel images
    if (hotel.images && hotel.images.length > 0) {
      allImages.push(...hotel.images);
    }
    
    // Add room images if they're not already included
    if (hotel.firstRoomImage && !allImages.includes(hotel.firstRoomImage)) {
      allImages.push(hotel.firstRoomImage);
    }
    
    if (hotel.secondRoomImage && !allImages.includes(hotel.secondRoomImage)) {
      allImages.push(hotel.secondRoomImage);
    }
    
    if (hotel.thirdImageHd && !allImages.includes(hotel.thirdImageHd)) {
      allImages.push(hotel.thirdImageHd);
    }
    
    // For demonstration: duplicate images to show 6+ photos layout
    const baseImages = allImages.filter(img => img && img.trim() !== '');
    if (baseImages.length > 0) {
      // Add duplicates to demonstrate 6+ photo layout
      const duplicatedImages = [...baseImages];
      while (duplicatedImages.length < 6 && baseImages.length > 0) {
        duplicatedImages.push(...baseImages.slice(0, Math.min(baseImages.length, 6 - duplicatedImages.length)));
      }
      return duplicatedImages;
    }
    
    return baseImages;
  };

  const allImages = getAllImages();

  const openFullScreen = (index: number) => {
    setSelectedImageIndex(index);
    setShowFullScreen(true);
  };

  if (allImages.length === 0) {
    return (
      <View style={tw`flex-1 bg-black/20 items-center justify-center relative overflow-hidden`}>
        {/* Background overlay similar to other slides */}
        <View style={tw`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent z-1`} />
        
        {/* Error state content */}
        <View style={tw`items-center`}>
          <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.7)" />
          <Text style={tw`text-white/70 text-sm mt-2`}>No photos available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      {/* Hero image with overlay - matches other slides */}
      <View style={tw`absolute inset-0`}>
        <Image
          source={{ uri: allImages[0] }}
          style={{
            width: '100%',
            height: '100%',
          }}
          resizeMode="cover"
        />
        {/* Dark overlay for consistency */}
        <View style={tw`absolute inset-0 bg-black/40`} />
      </View>

      {/* Gradient overlay - consistent with other slides */}
      <View style={tw`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent z-1`} />



      {/* Central Photo Gallery Content */}
      <View style={tw`absolute inset-0 items-center justify-center z-10 px-4`}>
        {/* Main interactive photo gallery */}
        <TouchableOpacity
          onPress={() => openFullScreen(0)}
          style={tw`bg-black/45 border border-white/15 rounded-md p-3 max-w-xs w-full`}
          activeOpacity={0.8}
        >
          {/* Header */}
          <View style={tw`flex-row items-center mb-2`}>
            <Ionicons 
              name={insightsStatus === 'loading' ? "sync" : "camera"} 
              size={10} 
              color="#1df9ff" 
            />
            <Text style={tw`text-white text-[10px] font-semibold ml-1`}>
              Photo Gallery
            </Text>
            {insightsStatus === 'loading' && (
              <Text style={tw`text-white/60 text-[10px] ml-2`}>Loading...</Text>
            )}
          </View>
          
          {/* Photo grid - always shows exactly 4 photos in 2x2 grid */}
          <View style={tw`gap-1 mb-2`}>
            <View style={tw`flex-row gap-1`}>
              {allImages.slice(0, 2).map((imageUri, index) => (
                <View key={index} style={tw`flex-1 rounded-md overflow-hidden`}>
                  <Image
                    source={{ uri: imageUri }}
                    style={{
                      width: '100%',
                      height: 45,
                    }}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </View>
            
            <View style={tw`flex-row gap-1`}>
              {allImages.slice(2, 4).map((imageUri, index) => (
                <View key={index + 2} style={tw`flex-1 rounded-md overflow-hidden relative`}>
                  <Image
                    source={{ uri: imageUri }}
                    style={{
                      width: '100%',
                      height: 45,
                    }}
                    resizeMode="cover"
                  />
                  {/* Bottom right overlay for additional photos */}
                  {index === 1 && allImages.length > 4 && (
                    <View style={tw`absolute inset-0 bg-black/60 items-center justify-center`}>
                      <Text style={tw`text-white text-[9px] font-bold`}>
                        +{allImages.length - 4}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Call to action */}
          <View style={tw`flex-row items-center justify-center pt-1 border-t border-white/15`}>
            <Ionicons name="expand" size={10} color="#1df9ff" />
            <Text style={tw`text-white text-[10px] font-medium ml-1`}>
              Tap to View All Photos
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Loading state overlay */}
      {insightsStatus === 'loading' && (
        <View style={tw`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20`}>
          <View style={tw`bg-black/70 border border-white/15 rounded-lg p-3 flex-row items-center`}>
            <Ionicons name="sync" size={16} color="#1df9ff" />
            <Text style={tw`text-white text-[10px] ml-2`}>
              Loading photos...
            </Text>
          </View>
        </View>
      )}

      {/* Full Screen Gallery Modal */}
      <FullScreenGallery
        visible={showFullScreen}
        images={allImages}
        initialIndex={selectedImageIndex}
        hotelName={hotel.name}
        onClose={() => setShowFullScreen(false)}
      />
    </View>
  );
};

export default PhotoGallerySlide;