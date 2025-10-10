// HotelStylesSelectionModal.tsx - Hotel styles and types selector
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
  ScrollView,
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

interface HotelStylesSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onStylesSelect: (stylesText: string) => void;
}

interface HotelStyle {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: 'luxury' | 'business' | 'boutique' | 'budget' | 'unique';
}

const HOTEL_STYLES: HotelStyle[] = [
  // Luxury
  { 
    id: 'luxury-resort', 
    name: 'Luxury Resort', 
    description: 'Premium amenities & service',
    icon: 'diamond', 
    category: 'luxury' 
  },
  { 
    id: 'five-star', 
    name: 'Five Star Hotel', 
    description: 'Ultimate luxury experience',
    icon: 'star', 
    category: 'luxury' 
  },
  { 
    id: 'spa-resort', 
    name: 'Spa Resort', 
    description: 'Wellness & relaxation focused',
    icon: 'flower', 
    category: 'luxury' 
  },

  // Business
  { 
    id: 'business-hotel', 
    name: 'Business Hotel', 
    description: 'Work-friendly amenities',
    icon: 'briefcase', 
    category: 'business' 
  },
  { 
    id: 'airport-hotel', 
    name: 'Airport Hotel', 
    description: 'Convenient for travel',
    icon: 'airplane', 
    category: 'business' 
  },
  { 
    id: 'conference-center', 
    name: 'Conference Hotel', 
    description: 'Meeting & event facilities',
    icon: 'people', 
    category: 'business' 
  },

  // Boutique
  { 
    id: 'boutique-hotel', 
    name: 'Boutique Hotel', 
    description: 'Unique design & character',
    icon: 'color-palette', 
    category: 'boutique' 
  },
  { 
    id: 'historic-hotel', 
    name: 'Historic Hotel', 
    description: 'Rich heritage & charm',
    icon: 'library', 
    category: 'boutique' 
  },
  { 
    id: 'design-hotel', 
    name: 'Design Hotel', 
    description: 'Modern architecture & art',
    icon: 'shapes', 
    category: 'boutique' 
  },

  // Budget
  { 
    id: 'budget-hotel', 
    name: 'Budget Hotel', 
    description: 'Affordable & comfortable',
    icon: 'card', 
    category: 'budget' 
  },
  { 
    id: 'hostel', 
    name: 'Hostel', 
    description: 'Social & economical',
    icon: 'people-circle', 
    category: 'budget' 
  },
  { 
    id: 'motel', 
    name: 'Motel', 
    description: 'Roadside convenience',
    icon: 'car-sport', 
    category: 'budget' 
  },


];

const CATEGORY_LABELS = {
  luxury: 'Luxury',
  business: 'Business',
  boutique: 'Boutique',
  budget: 'Budget',
};

const HotelStylesSelectionModal: React.FC<HotelStylesSelectionModalProps> = ({
  visible,
  onClose,
  onStylesSelect,
}) => {
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(new Set());

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
        setSelectedStyles(new Set());
      }, 300);
    }
  }, [visible]);

  const handleStyleToggle = (styleId: string) => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    }

    setSelectedStyles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(styleId)) {
        newSet.delete(styleId);
      } else {
        newSet.add(styleId);
      }
      return newSet;
    });
  };

  const formatStylesText = (styleIds: Set<string>): string => {
    if (styleIds.size === 0) return '';
    
    const selectedNames = Array.from(styleIds).map(id => {
      const style = HOTEL_STYLES.find(s => s.id === id);
      return style?.name || '';
    }).filter(Boolean);

    if (selectedNames.length === 1) {
      return selectedNames[0];
    }
    
    return selectedNames.join(', ');
  };

  const handleConfirm = () => {
    const stylesText = formatStylesText(selectedStyles);
    onStylesSelect(stylesText);
    onClose();
  };

  const renderStyleButton = (style: HotelStyle) => {
    const isSelected = selectedStyles.has(style.id);
    
    return (
      <TouchableOpacity
        key={style.id}
        style={[
          styles.styleButton,
          {
            backgroundColor: isSelected ? TURQUOISE + '15' : 'white',
            borderColor: isSelected ? TURQUOISE : GRAY_100,
          }
        ]}
        onPress={() => handleStyleToggle(style.id)}
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
            name={style.icon}
            size={16}
            color={isSelected ? TURQUOISE_DARK : GRAY_600}
          />
        </View>
        
        {/* Content */}
        <View style={styles.styleContent}>
          <Text style={[
            styles.styleName,
            { color: isSelected ? TURQUOISE_DARK : '#374151' }
          ]}>
            {style.name}
          </Text>
          <Text style={styles.styleDescription}>
            {style.description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategory = (category: keyof typeof CATEGORY_LABELS) => {
    const categoryStyles = HOTEL_STYLES.filter(style => style.category === category);
    
    return (
      <View key={category} style={styles.categoryContainer}>
        <Text style={styles.categoryTitle}>
          {CATEGORY_LABELS[category]}
        </Text>
        <View style={styles.stylesGrid}>
          {categoryStyles.map(renderStyleButton)}
        </View>
      </View>
    );
  };

  const canConfirm = selectedStyles.size > 0;

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
                  Hotel Style
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

            {/* Styles List - Scrollable Content */}
            <ScrollView 
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {Object.keys(CATEGORY_LABELS).map(category => 
                renderCategory(category as keyof typeof CATEGORY_LABELS)
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
                  {canConfirm ? 'Add To Search' : 'Select Style'}
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
  stylesGrid: {
    gap: 8,
  },
  styleButton: {
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    width: '100%',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  styleContent: {
    flex: 1,
  },
  styleName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  styleDescription: {
    fontSize: 12,
    color: '#6B7280',
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

export default HotelStylesSelectionModal;