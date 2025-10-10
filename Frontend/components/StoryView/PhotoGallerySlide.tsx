// PhotoGallerySlide.tsx - Direct to grid view
import React, { useState, useMemo } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Modal,
  StatusBar,
} from 'react-native';
import { Text } from '../../components/CustomText'; 
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
  onClose: () => void; // Made required since we always need it
}

const PhotoGallerySlide: React.FC<PhotoGallerySlideProps> = ({
  hotel,
  insightsStatus = 'complete',
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'fullscreen'>('grid');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Get all available images
  const allImages = useMemo(() => {
    const images: string[] = [];
    const MAX_IMAGES = 12;
    
    if (hotel.photoGalleryImages && hotel.photoGalleryImages.length > 0) {
      images.push(...hotel.photoGalleryImages.slice(0, MAX_IMAGES));
    }
    
    if (images.length < MAX_IMAGES && hotel.images && hotel.images.length > 0) {
      for (const image of hotel.images) {
        if (images.length >= MAX_IMAGES) break;
        if (image && !images.includes(image)) {
          images.push(image);
        }
      }
    }
    
    if (images.length < MAX_IMAGES && hotel.firstRoomImage && !images.includes(hotel.firstRoomImage)) {
      images.push(hotel.firstRoomImage);
    }
    if (images.length < MAX_IMAGES && hotel.secondRoomImage && !images.includes(hotel.secondRoomImage)) {
      images.push(hotel.secondRoomImage);
    }
    if (images.length < MAX_IMAGES && hotel.thirdImageHd && !images.includes(hotel.thirdImageHd)) {
      images.push(hotel.thirdImageHd);
    }
    
    const validImages = images.filter(img => 
      img && img.trim() !== '' && 
      (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('//'))
    );
    
    return validImages;
  }, [hotel]);

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setViewMode('fullscreen');
  };

  const handleBackToGrid = () => {
    setViewMode('grid');
  };

  if (allImages.length === 0) {
    return (
      <View style={tw`flex-1 bg-white items-center justify-center`}>
        <Ionicons name="image-outline" size={48} color="#9CA3AF" />
        <Text style={tw`text-gray-500 text-sm mt-2`}>No photos available</Text>
      </View>
    );
  }

  // Fullscreen view
  if (viewMode === 'fullscreen') {
    return (
      <View style={tw`flex-1 bg-white`}>
        <StatusBar hidden />

        {/* Image - tap to go back to grid */}
        <TouchableOpacity
          style={tw`flex-1 items-center justify-center`}
          onPress={handleBackToGrid}
          activeOpacity={1}
        >
          <Image
            source={{ uri: allImages[selectedImageIndex] }}
            style={{
              width: screenWidth,
              height: screenHeight,
            }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Grid view
  return (
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
            {hotel.name}
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
        {allImages.length > 0 && (
          <TouchableOpacity
            style={tw`mb-4 rounded-lg overflow-hidden bg-gray-100`}
            onPress={() => handleImagePress(0)}
            activeOpacity={0.8}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          >
            <Image
              source={{ uri: allImages[0] }}
              style={{ width: '100%', height: 240 }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        {/* Remaining images in pairs */}
        {allImages.slice(1).map((imageUri, index) => {
          const actualIndex = index + 1;
          const isEven = index % 2 === 0;
          
          if (isEven) {
            const nextImage = allImages[actualIndex + 1];
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
  );
};

export default PhotoGallerySlide;