// GuestsSelectionModal.tsx - Guest and room selector (Fixed Layout)
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  Modal,
  Vibration,
  Platform,
} from 'react-native';
import { Text } from '../../components/CustomText'; 
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Color palette
const TURQUOISE = '#1df9ff';
const TURQUOISE_DARK = '#00d4e6';
const GRAY_50 = '#f9fafb';
const GRAY_100 = '#f3f4f6';
const GRAY_600 = '#4b5563';

interface GuestsSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onGuestsSelect: (guestsText: string) => void;
}

interface GuestCounts {
  adults: number;
  children: number;
}

const GuestsSelectionModal: React.FC<GuestsSelectionModalProps> = ({
  visible,
  onClose,
  onGuestsSelect,
}) => {
  const [guestCounts, setGuestCounts] = useState<GuestCounts>({
    adults: 2,
    children: 0,
  });

  // Animations
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const panelWidth = Math.min(screenWidth - 40, 420);
  const panelHeight = Math.min(Math.round(screenHeight * 0.45), 480);

  // Animation effects
  useEffect(() => {
    if (visible) {
      slideAnim.setValue(30);
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.9);
      
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 100, friction: 10 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 30, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setGuestCounts({
          adults: 1,
          children: 0,
        });
      }, 300);
    }
  }, [visible]);

  const handleCountChange = (type: keyof GuestCounts, increment: boolean) => {
    if (Platform.OS === 'ios') {
    }

    setGuestCounts(prev => {
      const newCounts = { ...prev };
      
      if (increment) {
        // Set maximum limits
        if (type === 'adults' && newCounts.adults < 10) {
          newCounts.adults += 1;
        } else if (type === 'children' && newCounts.children < 8) {
          newCounts.children += 1;
        } 
      } else {
        // Set minimum limits
        if (type === 'adults' && newCounts.adults > 1) {
          newCounts.adults -= 1;
        } else if (type === 'children' && newCounts.children > 0) {
          newCounts.children -= 1;
        } 
      }
      
      return newCounts;
    });
  };

  const formatGuestsText = (counts: GuestCounts): string => {
    const parts: string[] = [];
    
    // Format adults
    if (counts.adults === 1) {
      parts.push('1 adult');
    } else {
      parts.push(`${counts.adults} adults`);
    }
    
    // Format children
    if (counts.children > 0) {
      if (counts.children === 1) {
        parts.push('1 child');
      } else {
        parts.push(`${counts.children} children`);
      }
    }
    
    return parts.join(', ');
  };

  const handleConfirm = () => {
    const guestsText = formatGuestsText(guestCounts);
    onGuestsSelect(guestsText);
    onClose();
  };

  const getTotalGuests = () => guestCounts.adults + guestCounts.children;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFillObject} 
          onPress={onClose}
          activeOpacity={1}
        />
        
        <View style={styles.centerContainer}>
          <Animated.View
            style={[
              styles.modalPanel,
              {
                width: panelWidth,
                height: panelHeight,
                opacity: opacityAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ],
              }
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <Text style={tw`text-xl font-bold text-gray-900`}>
                  Add Guests
                </Text>
                <TouchableOpacity
                  style={[tw`w-8 h-8 rounded-full items-center justify-center`, { backgroundColor: TURQUOISE + '10' }]}
                  onPress={onClose}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="close" size={16} color={TURQUOISE_DARK} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Content Container - Scrollable area */}
            <View style={styles.contentContainer}>
              {/* Adults */}
              <View style={styles.guestRow}>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-lg font-semibold text-gray-900`}>Adults</Text>
                  <Text style={tw`text-sm text-gray-600`}>Ages 13 or above</Text>
                </View>
                <View style={tw`flex-row items-center`}>
                  <TouchableOpacity
                    style={[
                      tw`w-10 h-10 rounded-full items-center justify-center border-2`,
                      {
                        borderColor: guestCounts.adults > 1 ? TURQUOISE : GRAY_100,
                        backgroundColor: guestCounts.adults > 1 ? 'white' : GRAY_50,
                      }
                    ]}
                    onPress={() => handleCountChange('adults', false)}
                    disabled={guestCounts.adults <= 1}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name="remove" 
                      size={18} 
                      color={guestCounts.adults > 1 ? TURQUOISE_DARK : '#d1d5db'} 
                    />
                  </TouchableOpacity>
                  
                  <Text style={tw`mx-4 text-lg font-bold text-gray-900 min-w-8 text-center`}>
                    {guestCounts.adults}
                  </Text>
                  
                  <TouchableOpacity
                    style={[
                      tw`w-10 h-10 rounded-full items-center justify-center border-2`,
                      {
                        borderColor: guestCounts.adults < 10 ? TURQUOISE : GRAY_100,
                        backgroundColor: guestCounts.adults < 10 ? 'white' : GRAY_50,
                      }
                    ]}
                    onPress={() => handleCountChange('adults', true)}
                    disabled={guestCounts.adults >= 10}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name="add" 
                      size={18} 
                      color={guestCounts.adults < 10 ? TURQUOISE_DARK : '#d1d5db'} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Children */}
              <View style={[styles.guestRow, { borderBottomWidth: 0 }]}>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-lg font-semibold text-gray-900`}>Children</Text>
                  <Text style={tw`text-sm text-gray-600`}>Ages 2-12</Text>
                </View>
                <View style={tw`flex-row items-center`}>
                  <TouchableOpacity
                    style={[
                      tw`w-10 h-10 rounded-full items-center justify-center border-2`,
                      {
                        borderColor: guestCounts.children > 0 ? TURQUOISE : GRAY_100,
                        backgroundColor: guestCounts.children > 0 ? 'white' : GRAY_50,
                      }
                    ]}
                    onPress={() => handleCountChange('children', false)}
                    disabled={guestCounts.children <= 0}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name="remove" 
                      size={18} 
                      color={guestCounts.children > 0 ? TURQUOISE_DARK : '#d1d5db'} 
                    />
                  </TouchableOpacity>
                  
                  <Text style={tw`mx-4 text-lg font-bold text-gray-900 min-w-8 text-center`}>
                    {guestCounts.children}
                  </Text>
                  
                  <TouchableOpacity
                    style={[
                      tw`w-10 h-10 rounded-full items-center justify-center border-2`,
                      {
                        borderColor: guestCounts.children < 8 ? TURQUOISE : GRAY_100,
                        backgroundColor: guestCounts.children < 8 ? 'white' : GRAY_50,
                      }
                    ]}
                    onPress={() => handleCountChange('children', true)}
                    disabled={guestCounts.children >= 8}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name="add" 
                      size={18} 
                      color={guestCounts.children < 8 ? TURQUOISE_DARK : '#d1d5db'} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  tw`py-4 rounded-xl items-center flex-row justify-center`,
                  {
                    backgroundColor: TURQUOISE,
                    shadowColor: TURQUOISE,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  },
                ]}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <Text style={tw`text-lg font-bold text-white mr-2`}>
                  Add To Search
                </Text>
                <Ionicons name="checkmark" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalPanel: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: TURQUOISE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 25,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: GRAY_100,
  },
});

export default GuestsSelectionModal;