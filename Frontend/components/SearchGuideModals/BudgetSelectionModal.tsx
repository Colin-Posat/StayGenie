// BudgetSelectionModal.tsx - Budget selector with price ranges
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

interface BudgetSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onBudgetSelect: (budgetText: string) => void;
}

interface BudgetRange {
  id: string;
  label: string;
  range: string;
  description: string;
  popular?: boolean;
}

const BudgetSelectionModal: React.FC<BudgetSelectionModalProps> = ({
  visible,
  onClose,
  onBudgetSelect,
}) => {
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  
  // Animations
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const panelWidth = Math.min(screenWidth - 40, 420);
  const panelHeight = Math.min(Math.round(screenHeight * 0.75), 600);

  // Budget ranges with different options
  const budgetRanges: BudgetRange[] = [
    {
      id: 'budget',
      label: 'Budget',
      range: '$50 - $100',
      description: 'Hostels, budget hotels, shared accommodations'
    },
    {
      id: 'moderate',
      label: 'Moderate',
      range: '$100 - $200',
      description: 'Mid-range hotels, private rooms, good amenities',
    },
    {
      id: 'upscale',
      label: 'Upscale',
      range: '$200 - $400',
      description: 'Premium hotels, excellent service, prime locations'
    },
    {
      id: 'luxury',
      label: 'Luxury',
      range: '$400 - $800',
      description: 'High-end resorts, luxury amenities, concierge service'
    },
    {
      id: 'ultra_luxury',
      label: 'Ultra Luxury',
      range: '$800+',
      description: 'Ultra-premium properties, exclusive experiences'
    },
  ];

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
        setSelectedBudget(null);
      }, 300);
    }
  }, [visible]);

  const handleBudgetSelect = (budget: BudgetRange) => {
    if (Platform.OS === 'ios') {
    }
    setSelectedBudget(budget.id);
  };

  const handleConfirm = () => {
    if (selectedBudget) {
      const budget = budgetRanges.find(b => b.id === selectedBudget);
      if (budget) {
        // Only send the price range, not the descriptive label
        const budgetText = budget.range;
        onBudgetSelect(budgetText);
        onClose();
      }
    }
  };

  const canConfirm = selectedBudget !== null;

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
            <View style={tw`px-6 pt-6 pb-4 border-b border-gray-100`}>
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <Text style={tw`text-xl font-bold text-gray-900`}>
                  Set Your Budget
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

            {/* Budget Options */}
            <ScrollView 
              style={tw`flex-1 px-6 pt-4`}
              showsVerticalScrollIndicator={false}
            >
              {budgetRanges.map((budget, index) => {
                const isSelected = selectedBudget === budget.id;
                const isPopular = budget.popular;
                
                return (
                  <TouchableOpacity
                    key={budget.id}
                    style={[
                      tw`mb-3 p-4 rounded-xl border-2 relative`,
                      {
                        backgroundColor: isSelected ? TURQUOISE + '10' : 'white',
                        borderColor: isSelected ? TURQUOISE : GRAY_100,
                        shadowColor: isSelected ? TURQUOISE : '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isSelected ? 0.2 : 0.05,
                        shadowRadius: isSelected ? 8 : 4,
                        elevation: isSelected ? 6 : 2,
                      }
                    ]}
                    onPress={() => handleBudgetSelect(budget)}
                    activeOpacity={0.8}
                  >
                    {/* Popular badge */}
                    {isPopular && (
                      <View style={[
                        tw`absolute -top-2 -right-2 px-2 py-1 rounded-full`,
                        { backgroundColor: TURQUOISE }
                      ]}>
                        <Text style={tw`text-xs font-bold text-white`}>Popular</Text>
                      </View>
                    )}
                    
                    <View style={tw`flex-row items-start justify-between`}>
                      <View style={tw`flex-1 mr-3`}>
                        <View style={tw`flex-row items-center mb-1`}>
                          <Text style={[
                            tw`text-lg font-bold`,
                            isSelected ? { color: TURQUOISE_DARK } : tw`text-gray-900`
                          ]}>
                            {budget.label}
                          </Text>
                          <Text style={[
                            tw`ml-2 text-lg font-semibold`,
                            isSelected ? { color: TURQUOISE_DARK } : tw`text-gray-600`
                          ]}>
                            {budget.range}
                          </Text>
                        </View>
                        <Text style={tw`text-sm text-gray-600 leading-5`}>
                          {budget.description}
                        </Text>
                      </View>
                      
                      {/* Selection indicator */}
                      <View style={[
                        tw`w-6 h-6 rounded-full border-2 items-center justify-center`,
                        {
                          borderColor: isSelected ? TURQUOISE : GRAY_100,
                          backgroundColor: isSelected ? TURQUOISE : 'white'
                        }
                      ]}>
                        {isSelected && (
                          <Ionicons name="checkmark" size={14} color="white" />
                        )}
                      </View>
                    </View>

                  </TouchableOpacity>
                );
              })}
              
              {/* Bottom spacing */}
              <View style={tw`h-4`} />
            </ScrollView>

            {/* Footer */}
            <View style={tw`px-6 py-4 border-t border-gray-100`}>
              <TouchableOpacity
                style={[
                  tw`py-4 rounded-xl items-center flex-row justify-center`,
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
                  tw`text-lg font-bold mr-2`,
                  canConfirm ? tw`text-white` : tw`text-gray-400`
                ]}>
                  {canConfirm ? 'Add To Search' : 'Select Budget Range'}
                </Text>
                {canConfirm && (
                  <Ionicons name="checkmark" size={20} color="white" />
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
});

export default BudgetSelectionModal;