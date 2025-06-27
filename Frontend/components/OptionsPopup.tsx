// OptionsPopup.tsx - Sleek popup menu component
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface OptionsPopupProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  position: { x: number; y: number };
  title: string;
}

const OptionsPopup: React.FC<OptionsPopupProps> = ({
  visible,
  onClose,
  onEdit,
  onDelete,
  position,
  title
}) => {
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.8)).current;
  const slideAnimation = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnimation, {
          toValue: 1,
          tension: 300,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnimation, {
          toValue: -10,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleEdit = () => {
    onEdit();
    onClose();
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  if (!visible) return null;

  // Calculate popup position
  const popupWidth = 160;
  const popupHeight = 120;
  
  // Adjust position to keep popup on screen
  const adjustedX = Math.min(
    Math.max(10, position.x - popupWidth + 20), // 20px offset from button
    screenWidth - popupWidth - 10
  );
  
  const adjustedY = Math.min(
    Math.max(10, position.y - 10), // 10px offset from button
    screenHeight - popupHeight - 10
  );

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={tw`absolute inset-0 z-50`}>
        {/* Background overlay */}
        <Animated.View
          style={[
            tw`absolute inset-0 bg-black/10`,
            {
              opacity: fadeAnimation,
            },
          ]}
        />

        {/* Popup menu */}
        <Animated.View
          style={[
            tw`absolute bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden`,
            {
              left: adjustedX,
              top: adjustedY,
              width: popupWidth,
              opacity: fadeAnimation,
              transform: [
                { scale: scaleAnimation },
                { translateY: slideAnimation },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={tw`px-4 py-3 border-b border-gray-100 bg-gray-50`}>
            <Text style={tw`text-[13px] font-semibold text-gray-700 text-center`} numberOfLines={1}>
              {title}
            </Text>
          </View>

          {/* Options */}
          <View style={tw`py-1`}>
            {/* Edit Option */}
            <TouchableOpacity
              style={tw`flex-row items-center px-4 py-3 active:bg-gray-50`}
              onPress={handleEdit}
              activeOpacity={0.7}
            >
              <View style={tw`w-7 h-7 rounded-lg bg-blue-50 items-center justify-center mr-3`}>
                <Ionicons name="create-outline" size={14} color="#3B82F6" />
              </View>
              <Text style={tw`text-[15px] font-medium text-gray-800`}>
                Edit Trip
              </Text>
            </TouchableOpacity>

            {/* Delete Option */}
            <TouchableOpacity
              style={tw`flex-row items-center px-4 py-3 active:bg-red-50`}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <View style={tw`w-7 h-7 rounded-lg bg-red-50 items-center justify-center mr-3`}>
                <Ionicons name="trash-outline" size={14} color="#EF4444" />
              </View>
              <Text style={tw`text-[15px] font-medium text-red-600`}>
                Delete Trip
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default OptionsPopup;