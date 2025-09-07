// GridDateSelectionModal.tsx - Fixed styling for today and selection
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
const RED_500 = '#ef4444';

interface GridDateSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onDateSelect: (checkIn: Date, checkOut: Date) => void;
}

interface DateInfo {
  date: Date;
  day: number;
  isToday: boolean;
  isPast: boolean;
  isCurrentMonth: boolean;
  disabled: boolean;
}

interface MonthInfo {
  month: number;
  year: number;
  label: string;
  shortLabel: string;
  isCurrentMonth: boolean;
}

const GridDateSelectionModal: React.FC<GridDateSelectionModalProps> = ({
  visible,
  onClose,
  onDateSelect,
}) => {
  // Simplified date state - store actual dates instead of separate month/day
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
  const [selectedDateType, setSelectedDateType] = useState<'checkin' | 'checkout'>('checkin');
  const [currentViewMonth, setCurrentViewMonth] = useState<number>(new Date().getMonth());
  const [currentViewYear, setCurrentViewYear] = useState<number>(new Date().getFullYear());

  // Animations
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const panelWidth = Math.min(screenWidth - 40, 420);
  const panelHeight = Math.min(Math.round(screenHeight * 0.8), 700);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  // Generate available months (current month + next 11 months)
  const getAvailableMonths = (): MonthInfo[] => {
    const months: MonthInfo[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentYear, currentMonth + i, 1);
      months.push({
        month: date.getMonth(),
        year: date.getFullYear(),
        label: date.toLocaleDateString('en-US', { month: 'long' }),
        shortLabel: date.toLocaleDateString('en-US', { month: 'short' }),
        isCurrentMonth: i === 0,
      });
    }
    return months;
  };

  const availableMonths = getAvailableMonths();

  // Get days for calendar display
  const getCalendarDays = (month: number, year: number): (DateInfo | null)[] => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: (DateInfo | null)[] = [];
    const current = new Date(startDate);

    // Generate 6 weeks of days (42 days total)
    for (let i = 0; i < 42; i++) {
      const date = new Date(current);
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.toDateString() === today.toDateString();
      const isPast = date < new Date(currentYear, currentMonth, currentDay);
      
      // Determine if date should be disabled
      let disabled = isPast;
      
      // If selecting checkout date, disable dates before or same as checkin
      // BUT don't disable the checkin date itself
      if (selectedDateType === 'checkout' && checkInDate) {
        disabled = disabled || (date < checkInDate);
      }

      if (isCurrentMonth) {
        days.push({
          date: new Date(date),
          day: date.getDate(),
          isToday,
          isPast,
          isCurrentMonth,
          disabled,
        });
      } else {
        days.push(null); // Empty cell for other month days
      }

      current.setDate(current.getDate() + 1);
    }

    return days;
  };

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
        setCheckInDate(null);
        setCheckOutDate(null);
        setSelectedDateType('checkin');
        setCurrentViewMonth(new Date().getMonth());
        setCurrentViewYear(new Date().getFullYear());
      }, 300);
    }
  }, [visible]);

  // Auto-advance to checkout selection after checkin is selected
  useEffect(() => {
    if (checkInDate && selectedDateType === 'checkin') {
      setSelectedDateType('checkout');
    }
  }, [checkInDate]);

  const handleDateSelect = (date: Date) => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    }

    if (selectedDateType === 'checkin') {
      setCheckInDate(date);
      // Clear checkout if it's before the new checkin date
      if (checkOutDate && checkOutDate <= date) {
        setCheckOutDate(null);
      }
    } else {
      setCheckOutDate(date);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (currentViewMonth === 11) {
        setCurrentViewMonth(0);
        setCurrentViewYear(currentViewYear + 1);
      } else {
        setCurrentViewMonth(currentViewMonth + 1);
      }
    } else {
      // Don't allow going before current month
      if (currentViewMonth === currentMonth && currentViewYear === currentYear) {
        return;
      }
      
      if (currentViewMonth === 0) {
        setCurrentViewMonth(11);
        setCurrentViewYear(currentViewYear - 1);
      } else {
        setCurrentViewMonth(currentViewMonth - 1);
      }
    }
  };

  const getCurrentMonthLabel = () => {
    const date = new Date(currentViewYear, currentViewMonth);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getNightCount = () => {
    if (!checkInDate || !checkOutDate) return 0;
    return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const canConfirm = checkInDate && checkOutDate;

  const handleConfirm = () => {
    if (canConfirm) {
      onDateSelect(checkInDate, checkOutDate);
      onClose();
    }
  };

  const isDateInRange = (date: Date) => {
    if (!checkInDate || !checkOutDate) return false;
    return date > checkInDate && date < checkOutDate;
  };

  const isDateSelected = (date: Date) => {
    if (checkInDate && date.toDateString() === checkInDate.toDateString()) return 'checkin';
    if (checkOutDate && date.toDateString() === checkOutDate.toDateString()) return 'checkout';
    return null;
  };

  const calendarDays = getCalendarDays(currentViewMonth, currentViewYear);

  // Check if we can go to previous month
  const canGoPrev = !(currentViewMonth === currentMonth && currentViewYear === currentYear);

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
              <View style={tw`flex-row items-center justify-between mb-3`}>
                <Text style={tw`text-xl font-bold text-gray-900`}>
                  Select Dates
                </Text>
                <TouchableOpacity
                  style={[tw`w-8 h-8 rounded-full items-center justify-center`, { backgroundColor: TURQUOISE + '10' }]}
                  onPress={onClose}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="close" size={16} color={TURQUOISE_DARK} />
                </TouchableOpacity>
              </View>
              
              {/* Date Selection Status */}
              <View style={tw`flex-row items-center space-x-4`}>
                <TouchableOpacity
                  style={[
                    tw`flex-1 py-3 px-4 rounded-lg border-2 flex-row items-center justify-between`,
                    selectedDateType === 'checkin' 
                      ? { borderColor: TURQUOISE, backgroundColor: TURQUOISE + '10' }
                      : { borderColor: GRAY_100, backgroundColor: 'white' }
                  ]}
                  onPress={() => setSelectedDateType('checkin')}
                >
                  <View>
                    <Text style={tw`text-xs font-medium text-gray-500 uppercase tracking-wide`}>Check-in</Text>
                    <Text style={[
                      tw`text-sm font-medium`,
                      checkInDate ? tw`text-gray-900` : tw`text-gray-400`
                    ]}>
                      {formatDateDisplay(checkInDate) || 'Select date'}
                    </Text>
                  </View>
                  <Ionicons 
                    name="calendar" 
                    size={16} 
                    color={selectedDateType === 'checkin' ? TURQUOISE_DARK : GRAY_600} 
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    tw`flex-1 py-3 px-4 rounded-lg border-2 flex-row items-center justify-between`,
                    selectedDateType === 'checkout' 
                      ? { borderColor: TURQUOISE, backgroundColor: TURQUOISE + '10' }
                      : { borderColor: GRAY_100, backgroundColor: 'white' }
                  ]}
                  onPress={() => setSelectedDateType('checkout')}
                  disabled={!checkInDate}
                >
                  <View>
                    <Text style={tw`text-xs font-medium text-gray-500 uppercase tracking-wide`}>Check-out</Text>
                    <Text style={[
                      tw`text-sm font-medium`,
                      checkOutDate ? tw`text-gray-900` : tw`text-gray-400`
                    ]}>
                      {formatDateDisplay(checkOutDate) || 'Select date'}
                    </Text>
                  </View>
                  <Ionicons 
                    name="calendar" 
                    size={16} 
                    color={selectedDateType === 'checkout' ? TURQUOISE_DARK : GRAY_600} 
                  />
                </TouchableOpacity>
              </View>


            </View>

            {/* Calendar */}
            <View style={tw`flex-1 px-6 pt-3`}>
              {/* Month Navigation */}
              <View style={tw`flex-row items-center justify-between mb-4`}>
                <TouchableOpacity
                  style={[
                    tw`p-2 rounded-lg`,
                    canGoPrev 
                      ? { backgroundColor: GRAY_100 }
                      : { backgroundColor: GRAY_50, opacity: 0.5 }
                  ]}
                  onPress={() => navigateMonth('prev')}
                  disabled={!canGoPrev}
                >
                  <Ionicons name="chevron-back" size={18} color={canGoPrev ? GRAY_600 : '#d1d5db'} />
                </TouchableOpacity>

                <Text style={tw`text-lg font-bold text-gray-900`}>
                  {getCurrentMonthLabel()}
                </Text>

                <TouchableOpacity
                  style={[tw`p-2 rounded-lg`, { backgroundColor: GRAY_100 }]}
                  onPress={() => navigateMonth('next')}
                >
                  <Ionicons name="chevron-forward" size={18} color={GRAY_600} />
                </TouchableOpacity>
              </View>

              {/* Day labels */}
              <View style={tw`flex-row mb-2`}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayLabel, index) => (
                  <View key={index} style={tw`flex-1 items-center py-1`}>
                    <Text style={tw`text-xs font-bold text-gray-500 uppercase tracking-wide`}>{dayLabel}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={tw`flex-1`}>
                {Array.from({ length: 6 }, (_, weekIndex) => (
                  <View key={weekIndex} style={tw`flex-row flex-1 mb-1`}>
                    {calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7).map((day, dayIndex) => {
                      if (!day) {
                        return <View key={dayIndex} style={tw`flex-1 px-0.5`} />;
                      }

                      const selected = isDateSelected(day.date);
                      const inRange = isDateInRange(day.date);

                      return (
                        <View key={dayIndex} style={tw`flex-1 px-0.5`}>
                          <TouchableOpacity
                            style={[
                              tw`rounded-lg items-center justify-center aspect-square`,
                              day.disabled 
                                ? { backgroundColor: GRAY_50, opacity: 0.5 }
                                : selected === 'checkin'
                                  ? { 
                                      backgroundColor: TURQUOISE, 
                                      shadowColor: TURQUOISE, 
                                      shadowOffset: { width: 0, height: 2 }, 
                                      shadowOpacity: 0.3, 
                                      shadowRadius: 4,
                                      borderWidth: 2,
                                      borderColor: TURQUOISE_DARK
                                    }
                                  : selected === 'checkout'
                                    ? { 
                                        backgroundColor: TURQUOISE_DARK, 
                                        shadowColor: TURQUOISE_DARK, 
                                        shadowOffset: { width: 0, height: 2 }, 
                                        shadowOpacity: 0.3, 
                                        shadowRadius: 4,
                                        borderWidth: 2,
                                        borderColor: TURQUOISE
                                      }
                                    : inRange
                                      ? { backgroundColor: TURQUOISE + '20' }
                                      : day.isToday
                                        ? { backgroundColor: GRAY_100, borderWidth: 1, borderColor: GRAY_600 }
                                        : { backgroundColor: 'white', borderWidth: 1, borderColor: GRAY_100 }
                            ]}
                            onPress={() => handleDateSelect(day.date)}
                            disabled={day.disabled}
                            activeOpacity={0.8}
                          >
                            <Text style={[
                              tw`text-sm font-semibold`,
                              day.disabled 
                                ? tw`text-gray-400`
                                : selected
                                  ? tw`text-white`
                                  : inRange
                                    ? { color: TURQUOISE_DARK }
                                    : tw`text-gray-800`
                            ]}>
                              {day.day}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

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
                  {canConfirm ? 'Add To Search' : 'Select Both Dates'}
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

export default GridDateSelectionModal;