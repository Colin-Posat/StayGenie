// SearchGuidePills.tsx - Updated with hotel styles modal integration
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import DateSelectionModal from '../SearchGuideModals/DateSelectionModal';
import BudgetSelectionModal from '../SearchGuideModals/BudgetSelectionModal';
import GuestsSelectionModal from '../SearchGuideModals/GuestSelectionModal';
import AmenitiesSelectionModal from '../SearchGuideModals/AmenitiesSelectionModal';
import HotelStylesSelectionModal from '../SearchGuideModals/HotelStylesSelectionModal';

const TURQUOISE = '#1df9ff';
const TURQUOISE_DARK = '#00d4e6';

interface SearchGuidePill {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  action: string;
}

interface SearchGuidePillsProps {
  onPillPress?: (action: string, pill: SearchGuidePill) => void;
  onDateSelect?: (searchText: string) => void;
  onBudgetSelect?: (searchText: string) => void;
  onLocationSelect?: (searchText: string) => void;
  onGuestsSelect?: (searchText: string) => void;
  onAmenitiesSelect?: (searchText: string) => void;
  onStyleSelect?: (searchText: string) => void;
}

const SearchGuidePills: React.FC<SearchGuidePillsProps> = ({
  onPillPress,
  onDateSelect,
  onBudgetSelect,
  onGuestsSelect,
  onAmenitiesSelect,
  onStyleSelect,
}) => {
  const [showDateModal, setShowDateModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGuestsModal, setShowGuestsModal] = useState(false);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [showStylesModal, setShowStylesModal] = useState(false);

  const searchGuidePills: SearchGuidePill[] = [
    {
      id: 'dates',
      icon: 'calendar-outline',
      label: 'Add dates',
      action: 'ADD_DATES'
    },
    {
      id: 'budget',
      icon: 'card-outline',
      label: 'Set budget',
      action: 'SET_BUDGET'
    },
    {
      id: 'guests',
      icon: 'people-outline',
      label: 'Add guests',
      action: 'ADD_GUESTS'
    },
    {
      id: 'amenities',
      icon: 'options-outline',
      label: 'Amenities',
      action: 'SELECT_AMENITIES'
    },
    {
      id: 'style',
      icon: 'home-outline',
      label: 'Hotel style',
      action: 'SELECT_STYLE'
    }
  ];

  const handlePillPress = (pill: SearchGuidePill) => {
    console.log('Pill pressed:', pill.id, pill.action);
    
    // Handle specific actions
    if (pill.action === 'ADD_DATES') {
      setShowDateModal(true);
      return;
    }
    
    if (pill.action === 'SET_BUDGET') {
      setShowBudgetModal(true);
      return;
    }
    
    if (pill.action === 'ADD_GUESTS') {
      setShowGuestsModal(true);
      return;
    }
    
    if (pill.action === 'SELECT_AMENITIES') {
      setShowAmenitiesModal(true);
      return;
    }
    
    if (pill.action === 'SELECT_STYLE') {
      setShowStylesModal(true);
      return;
    }
    
    // Call the callback for other actions
    onPillPress?.(pill.action, pill);
  };

  const handleDateSelect = (checkIn: Date, checkOut: Date) => {
    const formatDateForSearch = (date: Date): string => {
      const options: Intl.DateTimeFormatOptions = { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      };
      return date.toLocaleDateString('en-US', options);
    };

    const checkInText = formatDateForSearch(checkIn);
    const checkOutText = formatDateForSearch(checkOut);
    const searchText = `${checkInText} - ${checkOutText}`;
    
    console.log('Date selected:', searchText);
    setShowDateModal(false);
    onDateSelect?.(searchText);
  };

  const handleBudgetSelect = (budgetText: string) => {
    console.log('Budget selected:', budgetText);
    setShowBudgetModal(false);
    onBudgetSelect?.(budgetText);
  };

  const handleGuestsSelect = (guestsText: string) => {
    console.log('Guests selected:', guestsText);
    setShowGuestsModal(false);
    onGuestsSelect?.(guestsText);
  };

  const handleAmenitiesSelect = (amenitiesText: string) => {
    console.log('Amenities selected:', amenitiesText);
    setShowAmenitiesModal(false);
    onAmenitiesSelect?.(amenitiesText);
  };

  const handleStylesSelect = (stylesText: string) => {
    console.log('Hotel styles selected:', stylesText);
    setShowStylesModal(false);
    onStyleSelect?.(stylesText);
  };

  const handleCloseDateModal = () => {
    console.log('Closing date modal');
    setShowDateModal(false);
  };

  const handleCloseBudgetModal = () => {
    console.log('Closing budget modal');
    setShowBudgetModal(false);
  };

  const handleCloseGuestsModal = () => {
    console.log('Closing guests modal');
    setShowGuestsModal(false);
  };

  const handleCloseAmenitiesModal = () => {
    console.log('Closing amenities modal');
    setShowAmenitiesModal(false);
  };

  const handleCloseStylesModal = () => {
    console.log('Closing styles modal');
    setShowStylesModal(false);
  };

  return (
    <View style={tw`w-full mb-4`}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`px-1 py-1`}
      >
        {searchGuidePills.map((pill) => (
          <TouchableOpacity
            key={pill.id}
            onPress={() => handlePillPress(pill)}
            activeOpacity={0.8}
            style={[
              tw`mr-2 px-2.4 py-2.5 rounded-xl flex-row items-center bg-white border border-gray-200`,
              {
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 1,
                },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 3,
              }
            ]}
          >
            {/* Icon container */}
            <View style={[
              tw`w-6 h-6 rounded-full items-center justify-center mr-2`,
              { backgroundColor: 'rgba(29, 249, 255, 0.15)' }
            ]}>
              <Ionicons
                name={pill.icon}
                size={14}
                color={TURQUOISE_DARK}
              />
            </View>
            
            {/* Label */}
            <Text style={tw`text-sm font-medium text-gray-800 mr-1`}>
              {pill.label}
            </Text>
            
            {/* Plus icon */}
            <Ionicons
              name="add"
              size={14}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Date Selection Modal */}
      {showDateModal && (
        <DateSelectionModal
          visible={showDateModal}
          onClose={handleCloseDateModal}
          onDateSelect={handleDateSelect}
        />
      )}

      {/* Budget Selection Modal */}
      {showBudgetModal && (
        <BudgetSelectionModal
          visible={showBudgetModal}
          onClose={handleCloseBudgetModal}
          onBudgetSelect={handleBudgetSelect}
        />
      )}

      {/* Guests Selection Modal */}
      {showGuestsModal && (
        <GuestsSelectionModal
          visible={showGuestsModal}
          onClose={handleCloseGuestsModal}
          onGuestsSelect={handleGuestsSelect}
        />
      )}

      {/* Amenities Selection Modal */}
      {showAmenitiesModal && (
        <AmenitiesSelectionModal
          visible={showAmenitiesModal}
          onClose={handleCloseAmenitiesModal}
          onAmenitiesSelect={handleAmenitiesSelect}
        />
      )}

      {/* Hotel Styles Selection Modal */}
      {showStylesModal && (
        <HotelStylesSelectionModal
          visible={showStylesModal}
          onClose={handleCloseStylesModal}
          onStylesSelect={handleStylesSelect}
        />
      )}
    </View>
  );
};

export default SearchGuidePills;