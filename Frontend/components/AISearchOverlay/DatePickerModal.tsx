// DatePickerModal.tsx - Completely revamped for better mobile experience
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Turquoise color constants
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';

interface DateRange {
  checkin: Date | null;
  checkout: Date | null;
}

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onDateRangeApply: (dateRange: DateRange) => void;
  initialDateRange?: DateRange;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  onDateRangeApply,
  initialDateRange,
}) => {
  const [checkinDate, setCheckinDate] = useState<Date | null>(null);
  const [checkoutDate, setCheckoutDate] = useState<Date | null>(null);
  const [currentStep, setCurrentStep] = useState<'checkin' | 'checkout'>('checkin');

  // Initialize dates when modal opens
  useEffect(() => {
    if (visible) {
      if (initialDateRange?.checkin) {
        setCheckinDate(initialDateRange.checkin);
        setCurrentStep(initialDateRange.checkout ? 'checkin' : 'checkout');
      } else {
        setCheckinDate(null);
        setCurrentStep('checkin');
      }
      
      if (initialDateRange?.checkout) {
        setCheckoutDate(initialDateRange.checkout);
      } else {
        setCheckoutDate(null);
      }
    }
  }, [visible, initialDateRange]);

  // Generate calendar grid for current month view
  const generateCalendarDays = (year: number, month: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days = [];
    const current = new Date(startDate);

    // Generate 6 weeks (42 days) to ensure consistent calendar size
    for (let i = 0; i < 42; i++) {
      const date = new Date(current);
      const isCurrentMonth = date.getMonth() === month;
      const isPast = date < today;
      const isToday = date.getTime() === today.getTime();
      
      // For checkout, can't select same day as checkin or before
      const isBeforeCheckin = checkinDate && currentStep === 'checkout' && date <= checkinDate;
      const isDisabled = isPast || isBeforeCheckin;

      days.push({
        date: new Date(date),
        day: date.getDate(),
        isCurrentMonth,
        isDisabled,
        isToday,
        isSelected: 
          (currentStep === 'checkin' && checkinDate && date.getTime() === checkinDate.getTime()) ||
          (currentStep === 'checkout' && checkoutDate && date.getTime() === checkoutDate.getTime()),
        isInRange: checkinDate && checkoutDate && date >= checkinDate && date <= checkoutDate
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const calendarDays = generateCalendarDays(currentYear, currentMonth);

  const goToPreviousMonth = () => {
    const today = new Date();
    const newDate = new Date(currentYear, currentMonth - 1, 1);
    
    // Don't allow going to past months
    if (newDate >= new Date(today.getFullYear(), today.getMonth(), 1)) {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    }
  };

  const goToNextMonth = () => {
    // Allow going up to 12 months in the future
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    
    const newDate = new Date(currentYear, currentMonth + 1, 1);
    if (newDate <= maxDate) {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const handleDateSelect = (date: Date) => {
    if (currentStep === 'checkin') {
      setCheckinDate(date);
      // If there's already a checkout date that's invalid, clear it
      if (checkoutDate && checkoutDate <= date) {
        setCheckoutDate(null);
      }
      setCurrentStep('checkout');
    } else {
      setCheckoutDate(date);
    }
  };

  const handleApply = () => {
    if (checkinDate && checkoutDate) {
      onDateRangeApply({
        checkin: checkinDate,
        checkout: checkoutDate
      });
      onClose();
    }
  };

  const handleClear = () => {
    setCheckinDate(null);
    setCheckoutDate(null);
    setCurrentStep('checkin');
  };

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Check if previous month button should be disabled
  const isPrevMonthDisabled = () => {
    const today = new Date();
    const prevMonth = new Date(currentYear, currentMonth - 1, 1);
    return prevMonth < new Date(today.getFullYear(), today.getMonth(), 1);
  };

  // Check if next month button should be disabled
  const isNextMonthDisabled = () => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    const nextMonth = new Date(currentYear, currentMonth + 1, 1);
    return nextMonth > maxDate;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50 px-4`}>
        <View style={[
          tw`bg-white rounded-3xl p-6 w-full`,
          { 
            maxWidth: Math.min(screenWidth - 32, 400),
            maxHeight: screenHeight * 0.85,
            shadowColor: TURQUOISE,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 15,
          }
        ]}>
          {/* Header */}
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <Text style={tw`text-xl font-bold text-gray-900`}>Select Dates</Text>
            <TouchableOpacity 
              onPress={onClose}
              style={tw`p-2 -m-2`}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Date Selection Summary */}
          <View style={tw`mb-6`}>
            <View style={tw`flex-row gap-3`}>
              <TouchableOpacity
                style={[
                  tw`flex-1 p-4 rounded-2xl border-2`,
                  currentStep === 'checkin' ? {
                    backgroundColor: TURQUOISE + '10',
                    borderColor: TURQUOISE
                  } : {
                    backgroundColor: '#F8FAFC',
                    borderColor: '#E5E7EB'
                  }
                ]}
                onPress={() => setCurrentStep('checkin')}
                activeOpacity={0.8}
              >
                <Text style={[
                  tw`text-xs font-semibold mb-1`,
                  currentStep === 'checkin' ? { color: TURQUOISE_DARK } : tw`text-gray-500`
                ]}>
                  CHECK-IN
                </Text>
                <Text style={[
                  tw`text-sm font-bold`,
                  currentStep === 'checkin' ? { color: TURQUOISE_DARK } : tw`text-gray-900`
                ]}>
                  {formatDateDisplay(checkinDate)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  tw`flex-1 p-4 rounded-2xl border-2`,
                  currentStep === 'checkout' ? {
                    backgroundColor: TURQUOISE + '10',
                    borderColor: TURQUOISE
                  } : {
                    backgroundColor: '#F8FAFC',
                    borderColor: '#E5E7EB'
                  }
                ]}
                onPress={() => checkinDate && setCurrentStep('checkout')}
                disabled={!checkinDate}
                activeOpacity={checkinDate ? 0.8 : 1}
              >
                <Text style={[
                  tw`text-xs font-semibold mb-1`,
                  currentStep === 'checkout' ? { color: TURQUOISE_DARK } : tw`text-gray-500`
                ]}>
                  CHECK-OUT
                </Text>
                <Text style={[
                  tw`text-sm font-bold`,
                  currentStep === 'checkout' ? { color: TURQUOISE_DARK } : tw`text-gray-900`
                ]}>
                  {formatDateDisplay(checkoutDate)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Calendar Header */}
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <TouchableOpacity
              onPress={goToPreviousMonth}
              disabled={isPrevMonthDisabled()}
              style={[
                tw`p-2 rounded-xl`,
                isPrevMonthDisabled() ? tw`opacity-30` : { backgroundColor: TURQUOISE + '10' }
              ]}
              activeOpacity={isPrevMonthDisabled() ? 1 : 0.8}
            >
              <Ionicons 
                name="chevron-back" 
                size={20} 
                color={isPrevMonthDisabled() ? '#9CA3AF' : TURQUOISE_DARK} 
              />
            </TouchableOpacity>

            <Text style={tw`text-lg font-bold text-gray-900`}>
              {monthNames[currentMonth]} {currentYear}
            </Text>

            <TouchableOpacity
              onPress={goToNextMonth}
              disabled={isNextMonthDisabled()}
              style={[
                tw`p-2 rounded-xl`,
                isNextMonthDisabled() ? tw`opacity-30` : { backgroundColor: TURQUOISE + '10' }
              ]}
              activeOpacity={isNextMonthDisabled() ? 1 : 0.8}
            >
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={isNextMonthDisabled() ? '#9CA3AF' : TURQUOISE_DARK} 
              />
            </TouchableOpacity>
          </View>

          {/* Week Days Header */}
          <View style={tw`flex-row mb-2`}>
            {weekDays.map((day) => (
              <View key={day} style={tw`flex-1 items-center py-2`}>
                <Text style={tw`text-xs font-semibold text-gray-500`}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={tw`mb-6`}>
            {Array.from({ length: 6 }, (_, weekIndex) => (
              <View key={weekIndex} style={tw`flex-row`}>
                {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((dayData, dayIndex) => {
                  const isRangeStart = checkinDate && dayData.date.getTime() === checkinDate.getTime();
                  const isRangeEnd = checkoutDate && dayData.date.getTime() === checkoutDate.getTime();
                  
                  return (
                    <TouchableOpacity
                      key={dayIndex}
                      style={[
                        tw`flex-1 aspect-square items-center justify-center m-0.5 rounded-xl`,
                        !dayData.isCurrentMonth && tw`opacity-30`,
                        dayData.isDisabled && tw`opacity-30`,
                        dayData.isInRange && !isRangeStart && !isRangeEnd && {
                          backgroundColor: TURQUOISE + '15'
                        },
                        (isRangeStart || isRangeEnd) && {
                          backgroundColor: TURQUOISE
                        },
                        dayData.isToday && !dayData.isSelected && !dayData.isInRange && {
                          borderWidth: 2,
                          borderColor: TURQUOISE + '50'
                        }
                      ]}
                      onPress={() => !dayData.isDisabled && dayData.isCurrentMonth && handleDateSelect(dayData.date)}
                      disabled={dayData.isDisabled || !dayData.isCurrentMonth}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        tw`text-sm font-medium`,
                        (isRangeStart || isRangeEnd) ? tw`text-white font-bold` :
                        dayData.isInRange ? { color: TURQUOISE_DARK } :
                        dayData.isToday ? { color: TURQUOISE_DARK } :
                        dayData.isDisabled ? tw`text-gray-400` :
                        tw`text-gray-900`
                      ]}>
                        {dayData.day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={tw`flex-row gap-3`}>
            <TouchableOpacity
              style={[
                tw`flex-1 py-4 rounded-2xl border-2`,
                { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }
              ]}
              onPress={handleClear}
              activeOpacity={0.8}
            >
              <Text style={tw`text-center font-semibold text-gray-700`}>Clear</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                tw`flex-1 py-4 rounded-2xl`,
                checkinDate && checkoutDate ? {
                  backgroundColor: TURQUOISE,
                } : {
                  backgroundColor: '#E5E7EB',
                }
              ]}
              onPress={handleApply}
              disabled={!checkinDate || !checkoutDate}
              activeOpacity={0.8}
            >
              <Text style={[
                tw`text-center font-semibold`,
                checkinDate && checkoutDate ? tw`text-white` : tw`text-gray-500`
              ]}>
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default DatePickerModal;