// PhotoGallerySlide.tsx - Updated with grid-based gallery modal
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

interface GridGalleryModalProps {
  visible: boolean;
  images: string[];
  hotelName: string;
  onClose: () => void;
  onImagePress: (index: number) => void;
}

interface FullScreenImageProps {
  visible: boolean;
  images: string[];
  currentIndex: number;
  hotelName: string;
  onClose: () => void;
}

// Grid-based gallery modal (like your reference image)
const GridGalleryModal: React.FC<GridGalleryModalProps> = ({
  visible,
  images,
  hotelName,
  onClose,
  onImagePress,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
  }, [visible]);

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
          tw`flex-1 bg-white`,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Header */}
        <View style={tw`pt-12 pb-4 px-4 border-b border-gray-200`}>
          <View style={tw`flex-row items-center justify-between`}>
            <TouchableOpacity
              onPress={onClose}
              style={tw`p-2`}
            >
              <Ionicons name="close" size={28} color="black" />
            </TouchableOpacity>
            
            <Text style={tw`text-black text-lg font-semibold flex-1 text-center`}>
              {hotelName}
            </Text>
            
            <View style={tw`w-12`} />
          </View>
        </View>

        {/* Photo Grid */}
        <ScrollView style={tw`flex-1 px-4`} showsVerticalScrollIndicator={false}>
          <View style={tw`py-4`}>
            {/* Main large image */}
            {images.length > 0 && (
              <TouchableOpacity
                onPress={() => onImagePress(0)}
                style={tw`mb-4 rounded-lg overflow-hidden`}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: images[0] }}
                  style={{
                    width: '100%',
                    height: 240,
                  }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}

            {/* Grid for remaining images */}
            {images.length > 1 && (
              <View style={tw`gap-2`}>
                {/* Create rows of 2 images each */}
                {Array.from({ length: Math.ceil((images.length - 1) / 2) }).map((_, rowIndex) => (
                  <View key={rowIndex} style={tw`flex-row gap-2`}>
                    {images.slice(1 + rowIndex * 2, 1 + (rowIndex + 1) * 2).map((imageUri, index) => {
                      const imageIndex = 1 + rowIndex * 2 + index;
                      return (
                        <TouchableOpacity
                          key={imageIndex}
                          onPress={() => onImagePress(imageIndex)}
                          style={tw`flex-1 rounded-lg overflow-hidden`}
                          activeOpacity={0.8}
                        >
                          <Image
                            source={{ uri: imageUri }}
                            style={{
                              width: '100%',
                              height: 120,
                            }}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      );
                    })}
                    {/* Fill empty space if odd number of images in last row */}
                    {1 + rowIndex * 2 + 1 === images.length && (
                      <View style={tw`flex-1`} />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

// Simple full screen single image viewer (no swiping)
const FullScreenImage: React.FC<FullScreenImageProps> = ({
  visible,
  images,
  currentIndex,
  hotelName,
  onClose,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
  }, [visible]);

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
          
          <View style={tw`w-10`} />
        </View>

        {/* Single image viewer */}
        <View style={tw`flex-1 items-center justify-center`}>
          <Image
            source={{ uri: images[currentIndex] }}
            style={{
              width: screenWidth,
              height: screenHeight * 0.8,
            }}
            resizeMode="contain"
          />
        </View>
      </Animated.View>
    </Modal>
  );
};

const PhotoGallerySlide: React.FC<PhotoGallerySlideProps> = ({
  hotel,
  insightsStatus = 'complete',
}) => {
  const [showGridGallery, setShowGridGallery] = useState(false);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
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

  const openGridGallery = () => {
    setShowGridGallery(true);
  };

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setShowGridGallery(false);
    setShowFullScreenImage(true);
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
          onPress={openGridGallery}
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

      {/* Grid Gallery Modal */}
      <GridGalleryModal
        visible={showGridGallery}
        images={allImages}
        hotelName={hotel.name}
        onClose={() => setShowGridGallery(false)}
        onImagePress={handleImagePress}
      />

      {/* Full Screen Image Modal (when clicking on individual images) */}
      <FullScreenImage
        visible={showFullScreenImage}
        images={allImages}
        currentIndex={selectedImageIndex}
        hotelName={hotel.name}
        onClose={() => setShowFullScreenImage(false)}
      />
    </View>
  );
};

export default PhotoGallerySlide;