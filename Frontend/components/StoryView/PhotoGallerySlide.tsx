// PhotoGallerySlide.tsx - Single modal approach for mobile compatibility
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

// Optimized image component
const OptimizedImage: React.FC<{
  uri: string;
  style: any;
  onPress?: () => void;
  interactive?: boolean;
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

  return interactive ? (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={[style, { position: 'relative' }]}>
      {Img}
    </TouchableOpacity>
  ) : (
    <View style={[style, { position: 'relative' }]} pointerEvents="none">
      {Img}
    </View>
  );
};

// Single modal that handles both grid and fullscreen views
interface GalleryModalProps {
  visible: boolean;
  images: string[];
  hotelName: string;
  onClose: () => void;
}

const GalleryModal: React.FC<GalleryModalProps> = ({
  visible,
  images,
  hotelName,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'fullscreen'>('grid');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Reset to grid view when modal opens
  useEffect(() => {
    if (visible) {
      setViewMode('grid');
    }
  }, [visible]);

  const handleImagePress = (index: number) => {
    console.log(`🎯 Image ${index} pressed - switching to fullscreen`);
    setSelectedImageIndex(index);
    setViewMode('fullscreen');
  };

  const handleBackToGrid = () => {
    console.log('🔙 Back to grid view');
    setViewMode('grid');
  };

  if (!visible) return null;

  // Fullscreen view
  if (viewMode === 'fullscreen') {
    return (
      <Modal
        visible={visible}
        transparent={false}
        animationType="none"
        onRequestClose={handleBackToGrid}
        statusBarTranslucent={true}
        presentationStyle="fullScreen"
      >
        <StatusBar hidden />
        <View style={tw`flex-1 bg-white`}>
          {/* Back button */}
          <TouchableOpacity
            onPress={handleBackToGrid}
            style={[
              tw`absolute z-50  rounded-full`,
              {
                top: 50,
                left: 20,
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }
            ]}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>



          {/* Image */}
          <TouchableOpacity
            style={tw`flex-1 items-center justify-center`}
            onPress={handleBackToGrid}
            activeOpacity={1}
          >
            <Image
              source={{ uri: images[selectedImageIndex] }}
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
  }

  // Grid view
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={tw`flex-1 bg-white`}>
        {/* Header */}
        <View style={tw`pt-12 pb-4 px-4 border-b border-gray-200 bg-white`}>
          <View style={tw`flex-row items-center justify-between`}>
            <TouchableOpacity 
              onPress={onClose} 
              style={tw`p-2`}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={28} color="black" />
            </TouchableOpacity>
            
            <Text style={tw`text-black text-lg font-semibold flex-1 text-center`}>
              {hotelName}
            </Text>
            
            <View style={tw`w-12`} />
          </View>
        </View>

        {/* Grid layout */}
        <ScrollView 
          style={tw`flex-1`} 
          contentContainerStyle={tw`p-4`}
          showsVerticalScrollIndicator={false}
        >
          {/* First image - large */}
          {images.length > 0 && (
            <TouchableOpacity
              style={tw`mb-4 rounded-lg overflow-hidden bg-gray-100`}
              onPress={() => handleImagePress(0)}
              activeOpacity={0.8}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            >
              <Image
                source={{ uri: images[0] }}
                style={{ width: '100%', height: 240 }}
                resizeMode="cover"
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
                  {/* Left image */}
                  <TouchableOpacity
                    style={tw`flex-1 rounded-lg overflow-hidden bg-gray-100`}
                    onPress={() => handleImagePress(actualIndex)}
                    activeOpacity={0.8}
                    hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                  >
                    <Image
                      source={{ uri: imageUri }}
                      style={{ width: '100%', height: 120 }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                  
                  {/* Right image */}
                  {nextImage && (
                    <TouchableOpacity
                      style={tw`flex-1 rounded-lg overflow-hidden bg-gray-100`}
                      onPress={() => handleImagePress(actualIndex + 1)}
                      activeOpacity={0.8}
                      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                    >
                      <Image
                        source={{ uri: nextImage }}
                        style={{ width: '100%', height: 120 }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }
            return null;
          })}
          
          {/* Bottom padding for safe area */}
          <View style={{ height: 50 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const PhotoGallerySlide: React.FC<PhotoGallerySlideProps> = ({
  hotel,
  insightsStatus = 'complete',
}) => {
  const [showGalleryModal, setShowGalleryModal] = useState(false);

  // Get all available images
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
    
    const validImages = images.filter(img => 
      img && img.trim() !== '' && 
      (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('//'))
    );
    
    console.log(`📸 Total images available: ${validImages.length}`, validImages);
    return validImages;
  }, [hotel]);

  const openGallery = () => {
    console.log('📱 Opening gallery modal');
    setShowGalleryModal(true);
  };

  const closeGallery = () => {
    console.log('📱 Closing gallery modal');
    setShowGalleryModal(false);
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
          interactive={false}
        />
        <View style={tw`absolute inset-0 bg-black/40`} />
      </View>

      {/* Gradient overlay */}
      <View style={tw`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent z-1`} />

      {/* Centered gallery preview */}
      <View style={tw`absolute inset-0 items-center justify-center z-10 px-4`}>
        <TouchableOpacity
          onPress={openGallery}
          style={tw`bg-black/45 border border-white/15 rounded-xl p-4 w-80 max-w-full`}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
          
          {/* Fixed 2x2 grid preview */}
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

      {/* Single Gallery Modal */}
      <GalleryModal
        visible={showGalleryModal}
        images={allImages}
        hotelName={hotel.name}
        onClose={closeGallery}
      />
    </View>
  );
};

export default PhotoGallerySlide;