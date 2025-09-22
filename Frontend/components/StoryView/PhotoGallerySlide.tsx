// PhotoGallerySlide.tsx - Enhanced with improved full screen modal
import React, { useState, useRef, useEffect, useMemo } from 'react';
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
    photoGalleryImages?: string[];
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
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

// Simple optimized image component - FIXED TOUCH HANDLING
const OptimizedImage: React.FC<{
  uri: string;
  style: any;
  onPress?: () => void;
  interactive?: boolean;   // NEW
}> = ({ uri, style, onPress, interactive = true }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handlePress = () => {
    if (onPress) onPress();
  };

  if (error) {
    const Content = (
      <View style={[style, tw`bg-gray-200 items-center justify-center`]}>
        <Ionicons name="image-outline" size={20} color="#9CA3AF" />
      </View>
    );
    return interactive ? (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={[style]}>
        {Content}
      </TouchableOpacity>
    ) : (
      <View style={[style]} pointerEvents="none">{Content}</View>
    );
  }

  const Img = (
    <>
      {loading && (
        <View style={[style, tw`bg-gray-100 items-center justify-center absolute inset-0 z-10`]}>
          <View style={tw`w-4 h-4 bg-gray-300 rounded animate-pulse`} />
        </View>
      )}
      <Image
        source={{ uri }}
        style={[style, { position: 'absolute', top: 0, left: 0 }]}
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
        resizeMode="cover"
      />
    </>
  );

  // If not interactive, render a plain View so touches pass to parent
  return interactive ? (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={[style, { position: 'relative' }]}>{Img}</TouchableOpacity>
  ) : (
    <View style={[style, { position: 'relative' }]} pointerEvents="none">
      {Img}
    </View>
  );
};

// Simplified grid gallery modal with proper spacing
const GridGalleryModal: React.FC<GridGalleryModalProps> = ({
  visible,
  images,
  hotelName,
  onClose,
  onImagePress,
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={tw`flex-1 bg-white`}>
        {/* Header */}
        <View style={tw`pt-12 pb-4 px-4 border-b border-gray-200`}>
          <View style={tw`flex-row items-center justify-between`}>
            <TouchableOpacity onPress={onClose} style={tw`p-2`}>
              <Ionicons name="close" size={28} color="black" />
            </TouchableOpacity>
            
            <Text style={tw`text-black text-lg font-semibold flex-1 text-center`}>
              {hotelName}
            </Text>
            
            <View style={tw`w-12`} />
          </View>
        </View>

        {/* Simple grid layout - FIXED TOUCH EVENTS */}
        <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-4`}>
          {/* First image - large */}
          {images.length > 0 && (
            <View style={tw`mb-4 rounded-lg overflow-hidden`}>
              <TouchableOpacity
                onPress={() => {
                  console.log('🚀 LARGE IMAGE PRESSED - Index 0');
                  onImagePress(0);
                }}
                activeOpacity={0.8}
                style={{ width: '100%', height: 240 }}
              >
                <Image
                  source={{ uri: images[0] }}
                  style={{ width: '100%', height: 240 }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Remaining images in pairs - SIMPLIFIED */}
          {images.slice(1).map((imageUri, index) => {
            const actualIndex = index + 1;
            const isEven = index % 2 === 0;
            
            if (isEven) {
              const nextImage = images[actualIndex + 1];
              return (
                <View key={actualIndex} style={tw`flex-row gap-2 mb-2`}>
                  {/* Left image */}
                  <View style={tw`flex-1 rounded-lg overflow-hidden`}>
                    <TouchableOpacity
                      onPress={() => {
                        console.log(`🚀 LEFT IMAGE PRESSED - Index ${actualIndex}`);
                        onImagePress(actualIndex);
                      }}
                      activeOpacity={0.8}
                      style={{ width: '100%', height: 120 }}
                    >
                      <Image
                        source={{ uri: imageUri }}
                        style={{ width: '100%', height: 120 }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Right image */}
                  {nextImage && (
                    <View style={tw`flex-1 rounded-lg overflow-hidden`}>
                      <TouchableOpacity
                        onPress={() => {
                          console.log(`🚀 RIGHT IMAGE PRESSED - Index ${actualIndex + 1}`);
                          onImagePress(actualIndex + 1);
                        }}
                        activeOpacity={0.8}
                        style={{ width: '100%', height: 120 }}
                      >
                        <Image
                          source={{ uri: nextImage }}
                          style={{ width: '100%', height: 120 }}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }
            return null;
          })}
        </ScrollView>
      </View>
    </Modal>
  );
};

// Simple fullscreen modal - just one photo with close button
const FullScreenImage: React.FC<FullScreenImageProps> = ({
  visible,
  images,
  currentIndex,
  onClose,
}) => {
  if (!visible || !images[currentIndex]) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar hidden />
      <View style={tw`flex-1 bg-black`}>
        {/* Close button */}
        <TouchableOpacity
          onPress={onClose}
          style={tw`absolute top-12 right-4 z-20 bg-black/50 rounded-full p-3`}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>

        {/* Single fullscreen image */}
        <TouchableOpacity 
          style={tw`flex-1 items-center justify-center`}
          onPress={onClose}
          activeOpacity={1}
        >
          <Image
            source={{ uri: images[currentIndex] }}
            style={{
              width: screenWidth,
              height: screenHeight,
            }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
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

  // Get all available images (limit to 12 for performance)
  const allImages = useMemo(() => {
    const images: string[] = [];
    const MAX_IMAGES = 12;
    
    // Collect from photo gallery first
    if (hotel.photoGalleryImages && hotel.photoGalleryImages.length > 0) {
      images.push(...hotel.photoGalleryImages.slice(0, MAX_IMAGES));
    }
    
    // Add regular images if we need more
    if (images.length < MAX_IMAGES && hotel.images && hotel.images.length > 0) {
      for (const image of hotel.images) {
        if (images.length >= MAX_IMAGES) break;
        if (image && !images.includes(image)) {
          images.push(image);
        }
      }
    }
    
    // Add room images if we need more
    if (images.length < MAX_IMAGES && hotel.firstRoomImage && !images.includes(hotel.firstRoomImage)) {
      images.push(hotel.firstRoomImage);
    }
    if (images.length < MAX_IMAGES && hotel.secondRoomImage && !images.includes(hotel.secondRoomImage)) {
      images.push(hotel.secondRoomImage);
    }
    
    // Filter valid URLs and log the final array
    const validImages = images.filter(img => 
      img && img.trim() !== '' && 
      (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('//'))
    );
    
    console.log(`📸 Total images available: ${validImages.length}`, validImages);
    return validImages;
  }, [hotel]);

  const openGridGallery = () => {
    console.log('📱 Opening grid gallery modal');
    setShowGridGallery(true);
  };

  const handleImagePress = (index: number) => {
    console.log(`🎯 Image ${index} tapped - opening fullscreen`);
    setSelectedImageIndex(index);
    setShowFullScreenImage(true);
    // Don't close the grid gallery - keep it open in background
  };

  const handleCloseFullScreen = () => {
    console.log('❌ Closing fullscreen - back to gallery');
    setShowFullScreenImage(false);
    // Grid gallery stays open, no timeout needed
  };

  // Direct full screen from preview (optional enhancement)
  const handlePreviewImagePress = (index: number) => {
    console.log(`🖼️ Preview image ${index + 1} pressed - going directly to full screen`);
    setSelectedImageIndex(index);
    setShowFullScreenImage(true);
  };

  if (allImages.length === 0) {
    return (
      <View style={tw`flex-1 bg-black/20 items-center justify-center relative overflow-hidden`}>
        <View style={tw`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent z-1`} />
        <View style={tw`items-center`}>
          <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.7)" />
          <Text style={tw`text-white/70 text-sm mt-2`}>No photos available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      {/* Background hero image */}
      <View style={tw`absolute inset-0`}>
        <OptimizedImage
          uri={allImages[0]}
          style={{ width: '100%', height: '100%' }}
        />
        <View style={tw`absolute inset-0 bg-black/40`} />
      </View>

      {/* Gradient overlay */}
      <View style={tw`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent z-1`} />

      {/* Centered gallery preview - Fixed 2x2 grid */}
      <View style={tw`absolute inset-0 items-center justify-center z-10 px-4`}>
        <TouchableOpacity
          onPress={openGridGallery}
          style={tw`bg-black/45 border border-white/15 rounded-xl p-4 w-80 max-w-full`}
          activeOpacity={0.8}
        >
          {/* Header */}
          <View style={tw`flex-row items-center mb-3`}>
            <Ionicons name="camera" size={14} color="#1df9ff" />
            <Text style={tw`text-white text-sm font-semibold ml-2`}>
              Photo Gallery
            </Text>
            {insightsStatus === 'loading' && (
              <Text style={tw`text-white/60 text-xs ml-2`}>Loading...</Text>
            )}
          </View>
          
          {/* Fixed 2x2 grid with exactly 4 preview images */}
          <View style={tw`gap-2 mb-3`}>
            {/* Top row */}
            <View style={tw`flex-row gap-2`}>
              <View style={tw`flex-1 rounded-lg overflow-hidden`}>
                <OptimizedImage
                  uri={allImages[0]}
                  style={{ width: '100%', height: 60 }}
                  interactive={false}
                />
              </View>
              <View style={tw`flex-1 rounded-lg overflow-hidden`}>
                <OptimizedImage
                  uri={allImages[1] || allImages[0]}
                  style={{ width: '100%', height: 60 }}
                  interactive={false}
                />
              </View>
            </View>
            
            {/* Bottom row */}
            <View style={tw`flex-row gap-2`}>
              <View style={tw`flex-1 rounded-lg overflow-hidden`}>
                <OptimizedImage
                  uri={allImages[2] || allImages[0]}
                  style={{ width: '100%', height: 60 }}
                  interactive={false}
                />
              </View>
              <View style={tw`flex-1 rounded-lg overflow-hidden relative`}>
                <OptimizedImage
                  uri={allImages[3] || allImages[0]}
                  style={{ width: '100%', height: 60 }}
                  interactive={false}
                />
                {/* Overlay for additional photos */}
                {allImages.length > 4 && (
                  <View style={tw`absolute inset-0 bg-black/60 items-center justify-center`}>
                    <Text style={tw`text-white text-xs font-bold`}>
                      +{allImages.length - 4}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Call to action */}
          <View style={tw`flex-row items-center justify-center pt-2 border-t border-white/15`}>
            <Ionicons name="expand" size={12} color="#1df9ff" />
            <Text style={tw`text-white text-xs font-medium ml-2`}>
              Tap to View All {allImages.length} Photos
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Gallery modal */}
      <GridGalleryModal
        visible={showGridGallery}
        images={allImages}
        hotelName={hotel.name}
        onClose={() => {
          console.log('📱 Closing grid gallery modal');
          setShowGridGallery(false);
        }}
        onImagePress={handleImagePress}
      />

      {/* Full screen image modal */}
      <FullScreenImage
        visible={showFullScreenImage}
        images={allImages}
        currentIndex={selectedImageIndex}
        hotelName={hotel.name}
        onClose={handleCloseFullScreen}
      />
    </View>
  );
};

export default PhotoGallerySlide;