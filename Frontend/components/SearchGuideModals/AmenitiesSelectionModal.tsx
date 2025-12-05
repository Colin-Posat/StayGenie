// CompactAmenitiesSelectionModal.tsx - Compact hotel amenities selector (Fixed Layout)
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  Modal,
  Vibration,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Color palette
const TURQUOISE = '#1df9ff';
const TURQUOISE_DARK = '#00d4e6';
const GRAY_50 = '#f9fafb';
const GRAY_100 = '#f3f4f6';
const GRAY_600 = '#4b5563';

interface AmenitiesSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onAmenitiesSelect: (amenitiesText: string) => void;
}

interface Amenity {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: 'essential' | 'wellness' | 'entertainment' | 'business' | 'family';
}

const AMENITIES: Amenity[] = [
  // Essential
  { id: 'wifi', name: 'WiFi', icon: 'wifi', category: 'essential' },
  { id: 'parking', name: 'Parking', icon: 'car', category: 'essential' },
  { id: 'breakfast', name: 'Breakfast', icon: 'restaurant', category: 'essential' },
  { id: 'ac', name: 'AC', icon: 'snow', category: 'essential' },
  { id: 'elevator', name: 'Elevator', icon: 'arrow-up', category: 'essential' },
  
  // Wellness
  { id: 'pool', name: 'Pool', icon: 'water', category: 'wellness' },
  { id: 'spa', name: 'Spa', icon: 'flower', category: 'wellness' },
  { id: 'gym', name: 'Gym', icon: 'barbell', category: 'wellness' },
  { id: 'sauna', name: 'Sauna', icon: 'thermometer', category: 'wellness' },
  
  // Entertainment
  { id: 'bar', name: 'Bar', icon: 'wine', category: 'entertainment' },
  { id: 'restaurant', name: 'Restaurant', icon: 'restaurant-outline', category: 'entertainment' },
  { id: 'casino', name: 'Casino', icon: 'diamond', category: 'entertainment' },
  { id: 'nightclub', name: 'Nightclub', icon: 'musical-notes', category: 'entertainment' },
  
  // Business
  { id: 'meeting', name: 'Meetings', icon: 'people', category: 'business' },
  { id: 'concierge', name: 'Concierge', icon: 'person', category: 'business' },
  { id: 'laundry', name: 'Laundry', icon: 'shirt', category: 'business' },
  { id: 'roomservice', name: 'Room Service', icon: 'notifications', category: 'business' },
];

const CATEGORY_LABELS = {
  essential: 'Essential',
  wellness: 'Wellness',
  entertainment: 'Entertainment',
  business: 'Business',
};

const CompactAmenitiesSelectionModal: React.FC<AmenitiesSelectionModalProps> = ({
  visible,
  onClose,
  onAmenitiesSelect,
}) => {
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set());

  // Animations
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const panelWidth = Math.min(screenWidth - 40, 420);
  const panelHeight = Math.min(Math.round(screenHeight * 0.8), 700);

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
        setSelectedAmenities(new Set());
      }, 300);
    }
  }, [visible]);

  const handleAmenityToggle = (amenityId: string) => {
    if (Platform.OS === 'ios') {
    }

    setSelectedAmenities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(amenityId)) {
        newSet.delete(amenityId);
      } else {
        newSet.add(amenityId);
      }
      return newSet;
    });
  };

  const formatAmenitiesText = (amenityIds: Set<string>): string => {
    if (amenityIds.size === 0) return '';
    
    const selectedNames = Array.from(amenityIds).map(id => {
      const amenity = AMENITIES.find(a => a.id === id);
      return amenity?.name || '';
    }).filter(Boolean);

    return `with ${selectedNames.join(', ')}`;
  };

  const handleConfirm = () => {
    const amenitiesText = formatAmenitiesText(selectedAmenities);
    onAmenitiesSelect(amenitiesText);
    onClose();
  };

  const renderCompactAmenityButton = (amenity: Amenity) => {
    const isSelected = selectedAmenities.has(amenity.id);
    
    return (
      <TouchableOpacity
        key={amenity.id}
        style={[
          styles.amenityButton,
          {
            backgroundColor: isSelected ? TURQUOISE + '15' : 'white',
            borderColor: isSelected ? TURQUOISE : GRAY_100,
          }
        ]}
        onPress={() => handleAmenityToggle(amenity.id)}
        activeOpacity={0.8}
      >
        {/* Icon */}
        <View style={[
          styles.iconContainer,
          { 
            backgroundColor: isSelected ? TURQUOISE + '20' : GRAY_50 
          }
        ]}>
          <Ionicons
            name={amenity.icon}
            size={12}
            color={isSelected ? TURQUOISE_DARK : GRAY_600}
          />
        </View>
        
        {/* Label */}
        <Text style={[
          styles.amenityLabel,
          { color: isSelected ? TURQUOISE_DARK : '#374151' }
        ]}>
          {amenity.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCompactCategory = (category: keyof typeof CATEGORY_LABELS) => {
    const categoryAmenities = AMENITIES.filter(amenity => amenity.category === category);
    
    return (
      <View key={category} style={styles.categoryContainer}>
        <Text style={styles.categoryTitle}>
          {CATEGORY_LABELS[category]}
        </Text>
        <View style={styles.amenitiesGrid}>
          {categoryAmenities.map(renderCompactAmenityButton)}
        </View>
      </View>
    );
  };

  const canConfirm = selectedAmenities.size > 0;

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
                  Select Amenities
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

            {/* Amenities List - Scrollable Content */}
            <ScrollView 
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {Object.keys(CATEGORY_LABELS).map(category => 
                renderCompactCategory(category as keyof typeof CATEGORY_LABELS)
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  {
                    backgroundColor: canConfirm ? TURQUOISE : GRAY_100,
                    shadowColor: canConfirm ? TURQUOISE : 'transparent',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: canConfirm ? 0.3 : 0,
                    shadowRadius: 8,
                    elevation: canConfirm ? 6 : 0,
                  },
                ]}
                onPress={handleConfirm}
                disabled={!canConfirm}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.confirmButtonText,
                  canConfirm ? tw`text-white` : tw`text-gray-400`
                ]}>
                  {canConfirm ? 'Add To Search' : 'Select Amenities'}
                </Text>
                {canConfirm && (
                  <Ionicons name="checkmark" size={18} color="white" />
                )}
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  amenityButton: {
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    width: '48%',
  },
  iconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  amenityLabel: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: GRAY_100,
  },
  confirmButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
});

export default CompactAmenitiesSelectionModal;