// PhotoGallerySlide.tsx - Simplified approach with fixed 2x2 grid
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
}

// Simple optimized image component
const OptimizedImage: React.FC<{
  uri: string;
  style: any;
  onPress?: () => void;
}> = ({ uri, style, onPress }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View style={[style, tw`bg-gray-200 items-center justify-center`]}>
        <Ionicons name="image-outline" size={20} color="#9CA3AF" />
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
      {loading && (
        <View style={[style, tw`bg-gray-100 items-center justify-center absolute inset-0`]}>
          <View style={tw`w-4 h-4 bg-gray-300 rounded animate-pulse`} />
        </View>
      )}
      <Image
        source={{ uri }}
        style={style}
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
        resizeMode="cover"
      />
    </TouchableOpacity>
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

        {/* Simple grid layout */}
        <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-4`}>
          {/* First image - large */}
          {images.length > 0 && (
            <TouchableOpacity
              onPress={() => onImagePress(0)}
              style={tw`mb-4 rounded-lg overflow-hidden`}
            >
              <OptimizedImage
                uri={images[0]}
                style={{ width: '100%', height: 240 }}
              />
            </TouchableOpacity>
          )}

          {/* Remaining images in pairs */}
          {images.slice(1).map((imageUri, index) => {
            const actualIndex = index + 1;
            const isEven = index % 2 === 0;
            
            if (isEven) {
              const nextImage = images[actualIndex + 1];
              return (
                <View key={actualIndex} style={tw`flex-row gap-2 mb-2`}>
                  <TouchableOpacity
                    onPress={() => onImagePress(actualIndex)}
                    style={tw`flex-1 rounded-lg overflow-hidden`}
                  >
                    <OptimizedImage
                      uri={imageUri}
                      style={{ width: '100%', height: 120 }}
                    />
                  </TouchableOpacity>
                  
                  {nextImage && (
                    <TouchableOpacity
                      onPress={() => onImagePress(actualIndex + 1)}
                      style={tw`flex-1 rounded-lg overflow-hidden`}
                    >
                      <OptimizedImage
                        uri={nextImage}
                        style={{ width: '100%', height: 120 }}
                      />
                    </TouchableOpacity>
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

// Full screen image viewer with back to gallery option
const FullScreenImage: React.FC<FullScreenImageProps> = ({
  visible,
  images,
  currentIndex,
  onClose,
}) => {
  if (!visible) return null;

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
        {/* Header with close button */}
        <View style={tw`absolute top-12 left-0 right-0 z-20 flex-row items-center justify-between px-4`}>
          <TouchableOpacity
            onPress={onClose}
            style={tw`bg-black/50 rounded-full p-3`}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          <Text style={tw`text-white text-sm font-medium`}>
            {currentIndex + 1} of {images.length}
          </Text>
        </View>

        {/* Full screen image */}
        <TouchableOpacity 
          style={tw`flex-1 items-center justify-center`}
          onPress={onClose}
          activeOpacity={1}
        >
          <OptimizedImage
            uri={images[currentIndex]}
            style={{
              width: screenWidth,
              height: screenHeight * 0.8,
            }}
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

  // Get all available images (limit to 8 for performance)
  const allImages = useMemo(() => {
    const images: string[] = [];
    const MAX_IMAGES = 8;
    
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
    
    // Filter valid URLs
    return images.filter(img => 
      img && img.trim() !== '' && 
      (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('//'))
    );
  }, [hotel]);

  const openGridGallery = () => {
    setShowGridGallery(true);
  };

  const handleImagePress = (index: number) => {
    console.log(`📸 Image ${index + 1} pressed - showing full screen`);
    setSelectedImageIndex(index);
    setShowGridGallery(false); // Close gallery modal
    
    // Small delay to ensure smooth transition
    setTimeout(() => {
      setShowFullScreenImage(true);
    }, 100);
  };

  const handleCloseFullScreen = () => {
    console.log('📸 Closing full screen - returning to gallery');
    setShowFullScreenImage(false);
    
    // Return to gallery modal
    setTimeout(() => {
      setShowGridGallery(true);
    }, 200);
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
                />
              </View>
              <View style={tw`flex-1 rounded-lg overflow-hidden`}>
                <OptimizedImage
                  uri={allImages[1] || allImages[0]}
                  style={{ width: '100%', height: 60 }}
                />
              </View>
            </View>
            
            {/* Bottom row */}
            <View style={tw`flex-row gap-2`}>
              <View style={tw`flex-1 rounded-lg overflow-hidden`}>
                <OptimizedImage
                  uri={allImages[2] || allImages[0]}
                  style={{ width: '100%', height: 60 }}
                />
              </View>
              <View style={tw`flex-1 rounded-lg overflow-hidden relative`}>
                <OptimizedImage
                  uri={allImages[3] || allImages[0]}
                  style={{ width: '100%', height: 60 }}
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
        onClose={() => setShowGridGallery(false)}
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