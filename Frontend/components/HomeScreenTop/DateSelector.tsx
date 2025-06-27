// DateSelector.tsx - Sleek modern UI with enhanced visual design
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
  Dimensions,
  Easing,
  Platform,
  PanResponder,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import tw from 'twrnc';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface DateSelectorProps {
  checkInDate: Date;
  checkOutDate: Date;
  onDateChange: (type: 'checkin' | 'checkout', date: Date) => void;
}

interface CalendarDay {
  key: string;
  day: number | null;
  date: Date | null;
  isToday?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  isInRange?: boolean;
  isRangeStart?: boolean;
  isRangeEnd?: boolean;
  isHovered?: boolean;
}

interface MonthData {
  year: number;
  month: number;
  monthName: string;
  days: CalendarDay[];
}

const DateSelector: React.FC<DateSelectorProps> = ({
  checkInDate,
  checkOutDate,
  onDateChange,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectingDate, setSelectingDate] = useState<'checkin' | 'checkout'>('checkin');
  const [tempCheckIn, setTempCheckIn] = useState<Date | null>(null);
  const [tempCheckOut, setTempCheckOut] = useState<Date | null>(null);
  const [isRangeSelection, setIsRangeSelection] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>(undefined);

  // Animation refs
  const backdropAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(screenHeight)).current;
  const scaleAnimation = useRef(new Animated.Value(0.9)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const selectionPulseAnimation = useRef(new Animated.Value(1)).current;
  
  // Pan gesture for smooth dismiss
  const panY = useRef(new Animated.Value(0)).current;

  // Pulse animation for selected dates
  const startPulseAnimation = useCallback(() => {
    Animated.sequence([
      Animated.timing(selectionPulseAnimation, {
        toValue: 1.1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(selectionPulseAnimation, {
        toValue: 1,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Generate calendar days for a specific month
  const generateCalendarDays = useCallback((year: number, month: number): CalendarDay[] => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const today = new Date();
    
    const days: CalendarDay[] = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ key: `empty-${month}-${i}`, day: null, date: null });
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      
      // Determine selection state
      const activeCheckIn = tempCheckIn || checkInDate;
      const activeCheckOut = tempCheckOut || checkOutDate;
      
      const isRangeStart = date.toDateString() === activeCheckIn.toDateString();
      const isRangeEnd = date.toDateString() === activeCheckOut.toDateString();
      
      // Enhanced range logic with hover preview
      const previewCheckOut = hoveredDate && tempCheckIn && hoveredDate > tempCheckIn ? hoveredDate : activeCheckOut;
      const isInRange = date > activeCheckIn && date < previewCheckOut;
      const isSelected = isRangeStart || isRangeEnd;
      
      // Hover state for preview
      const isHovered = hoveredDate && date.toDateString() === hoveredDate.toDateString();
      
      const isDisabled = date < today;
      
      days.push({
        key: `day-${month}-${day}`,
        day,
        date,
        isToday,
        isSelected,
        isDisabled,
        isInRange,
        isRangeStart,
        isRangeEnd,
        isHovered
      });
    }
    
    return days;
  }, [tempCheckIn, tempCheckOut, checkInDate, checkOutDate, hoveredDate]);

  // Generate months data (current month + next 11 months)
  const generateMonthsData = useCallback((): MonthData[] => {
    const today = new Date();
    const months: MonthData[] = [];
    
    for (let i = 0; i < 12; i++) {
      const currentDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const monthName = currentDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      months.push({
        year,
        month,
        monthName,
        days: generateCalendarDays(year, month)
      });
    }
    
    return months;
  }, [generateCalendarDays]);

  const [monthsData, setMonthsData] = useState(() => generateMonthsData());

  // Update months data when dependencies change
  useEffect(() => {
    setMonthsData(generateMonthsData());
  }, [generateMonthsData]);

  // Enhanced date formatting with modern style
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateLong = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate nights between dates
  const calculateNights = (checkIn: Date, checkOut: Date) => {
    const timeDiff = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  // Smooth modal animations
  const showModal = useCallback(() => {
    setShowDatePicker(true);
    
    Animated.parallel([
      Animated.timing(backdropAnimation, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnimation, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnimation, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const hideModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropAnimation, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnimation, {
        toValue: screenHeight,
        duration: 300,
        easing: Easing.in(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 0.9,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowDatePicker(false);
      setTempCheckIn(null);
      setTempCheckOut(null);
      setIsRangeSelection(false);
      setHoveredDate(undefined);
      panY.setValue(0);
    });
  }, []);

  const handleDateSelect = (type: 'checkin' | 'checkout') => {
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setSelectingDate(type);
    setIsRangeSelection(false);
    setTempCheckIn(null);
    setTempCheckOut(null);
    setHoveredDate(undefined);
    showModal();
  };

  const handleDatePress = (selectedDate: Date) => {
    // Enhanced haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
    }

    startPulseAnimation();

    if (!isRangeSelection) {
      // First date selection
      if (selectingDate === 'checkin') {
        setTempCheckIn(selectedDate);
        setTempCheckOut(null);
        setIsRangeSelection(true);
        setHoveredDate(undefined);
      } else {
        setTempCheckOut(selectedDate);
      }
    } else {
      // Second date selection (range end)
      if (tempCheckIn && selectedDate > tempCheckIn) {
        setTempCheckOut(selectedDate);
        setHoveredDate(undefined);
      } else if (tempCheckIn && selectedDate < tempCheckIn) {
        // If selecting earlier date, make it the new check-in
        setTempCheckIn(selectedDate);
        setTempCheckOut(null);
        setHoveredDate(undefined);
      } else {
        // Reset if same date
        setTempCheckIn(selectedDate);
        setTempCheckOut(null);
        setHoveredDate(undefined);
      }
    }
  };

  const handleDateHover = (date: Date) => {
    if (isRangeSelection && tempCheckIn && date > tempCheckIn) {
      setHoveredDate(date);
    }
  };

  // Handle the Done button press
  const handleDonePress = () => {
    if (tempCheckIn && tempCheckOut) {
      // Success haptic
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success);
      }
      
      onDateChange('checkin', tempCheckIn);
      onDateChange('checkout', tempCheckOut);
    } else if (selectingDate === 'checkout' && tempCheckOut) {
      onDateChange('checkout', tempCheckOut);
    } else if (selectingDate === 'checkin' && tempCheckIn) {
      onDateChange('checkin', tempCheckIn);
    }
    
    hideModal();
  };

  // Pan responder for smooth dismiss
  const currentPanValue = useRef(0);
  
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        currentPanValue.current = 0;
        panY.setOffset(currentPanValue.current);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          currentPanValue.current = gestureState.dy;
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        panY.flattenOffset();
        
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          hideModal();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }).start(() => {
            currentPanValue.current = 0;
          });
        }
      },
    })
  ).current;

  const renderCalendarDay = ({ item }: { item: CalendarDay }) => {
    if (!item.day) {
      return <View style={tw`flex-1 h-12 m-0.5`} />;
    }
    
    // Enhanced styling with modern glassmorphism effects
    const dayStyle = [
      tw`flex-1 h-12 m-0.5 items-center justify-center rounded-2xl relative overflow-hidden`,
      item.isToday && !item.isSelected && tw`border-2 border-blue-500 bg-blue-50`,
      item.isRangeStart && tw`bg-gradient-to-r from-black to-gray-800 shadow-xl`,
      item.isRangeEnd && tw`bg-gradient-to-r from-gray-800 to-black shadow-xl`,
      item.isInRange && tw`bg-gradient-to-r from-gray-100 to-gray-50`,
      item.isHovered && isRangeSelection && tw`bg-gradient-to-r from-gray-200 to-gray-100 border-2 border-gray-400`,
      item.isDisabled && tw`opacity-30`,
    ];

    const textStyle = [
      tw`text-base font-bold z-10`,
      item.isToday && !item.isSelected && tw`text-blue-600`,
      (item.isRangeStart || item.isRangeEnd) && tw`text-white`,
      item.isInRange && tw`text-gray-800`,
      item.isHovered && isRangeSelection && tw`text-gray-800`,
      item.isDisabled && tw`text-gray-400`,
      !item.isSelected && !item.isInRange && !item.isToday && !item.isHovered && tw`text-gray-800`,
    ];

    return (
      <TouchableOpacity
        style={dayStyle}
        onPress={() => !item.isDisabled && handleDatePress(item.date!)}
        onPressIn={() => !item.isDisabled && handleDateHover(item.date!)}
        disabled={item.isDisabled}
        activeOpacity={0.7}
      >
        {/* Selection indicator with glow effect */}
        {(item.isRangeStart || item.isRangeEnd) && (
          <Animated.View
            style={[
              tw`absolute inset-0 bg-black rounded-2xl shadow-lg`,
              { transform: [{ scale: selectionPulseAnimation }] }
            ]}
          />
        )}
        
        <Text style={textStyle}>
          {item.day}
        </Text>
        
        {/* Modern today indicator */}
        {item.isToday && !item.isSelected && (
          <View style={tw`absolute bottom-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-sm`} />
        )}
      </TouchableOpacity>
    );
  };

  const renderMonth = ({ item: monthData }: { item: MonthData }) => {
    return (
      <View style={tw`px-6 mb-8`}>
        {/* Modern month header */}
        <Text style={tw`text-2xl text-black font-black mb-6 text-center tracking-tight`}>
          {monthData.monthName}
        </Text>
        
        {/* Refined day headers */}
        <View style={tw`flex-row mb-4`}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, index) => (
            <View key={index} style={tw`flex-1 items-center py-2`}>
              <Text style={tw`text-sm text-gray-500 font-bold tracking-wide`}>{day}</Text>
            </View>
          ))}
        </View>
        
        {/* Calendar Grid */}
        <FlatList
          data={monthData.days}
          renderItem={renderCalendarDay}
          numColumns={7}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  };

  const getSelectionText = () => {
    const activeCheckIn = tempCheckIn || checkInDate;
    const activeCheckOut = tempCheckOut || checkOutDate;
    
    if (isRangeSelection && tempCheckIn && !tempCheckOut) {
      return {
        primary: formatDateLong(activeCheckIn),
        secondary: 'Select checkout date',
        showArrow: true
      };
    }
    
    if (tempCheckIn && tempCheckOut) {
      const nights = calculateNights(tempCheckIn, tempCheckOut);
      return {
        primary: `${formatDateLong(tempCheckIn)} → ${formatDateLong(tempCheckOut)}`,
        secondary: `${nights} night${nights !== 1 ? 's' : ''}`,
        showArrow: false
      };
    }
    
    if (activeCheckIn && activeCheckOut && !tempCheckIn && !tempCheckOut) {
      const nights = calculateNights(activeCheckIn, activeCheckOut);
      return {
        primary: `${formatDateLong(activeCheckIn)} → ${formatDateLong(activeCheckOut)}`,
        secondary: `${nights} night${nights !== 1 ? 's' : ''}`,
        showArrow: false
      };
    }
    
    return {
      primary: `Select ${selectingDate === 'checkin' ? 'check-in' : 'check-out'} date`,
      secondary: selectingDate === 'checkin' ? 'Choose your arrival date' : 'Choose your departure date',
      showArrow: false
    };
  };

  const selectionInfo = getSelectionText();

  // Determine if Done button should be enabled
  const isDoneEnabled = () => {
    if (isRangeSelection) {
      return tempCheckIn && tempCheckOut;
    } else {
      return (selectingDate === 'checkin' && tempCheckIn) || 
             (selectingDate === 'checkout' && tempCheckOut);
    }
  };

  return (
    <>
      {/* MODERN DATE SELECTOR BUTTONS - Same size as original */}
      <View style={tw`flex-row items-center bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`}>
        <TouchableOpacity
          style={tw`py-3 px-4 items-center min-w-20 border-r border-gray-200`}
          onPress={() => handleDateSelect('checkin')}
          activeOpacity={0.7}
        >
          <Text style={tw`text-xs text-gray-600 font-semibold mb-0.5`}>Check-in</Text>
          <Text style={tw`text-sm text-black font-bold`}>{formatDate(checkInDate)}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={tw`py-3 px-4 items-center min-w-20`}
          onPress={() => handleDateSelect('checkout')}
          activeOpacity={0.7}
        >
          <Text style={tw`text-xs text-gray-600 font-semibold mb-0.5`}>Check-out</Text>
          <Text style={tw`text-sm text-black font-bold`}>{formatDate(checkOutDate)}</Text>
        </TouchableOpacity>
      </View>

      {/* ENHANCED DATE PICKER MODAL */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="none"
        onRequestClose={hideModal}
      >
        <View style={tw`flex-1`}>
          {/* Animated Backdrop with Blur Effect */}
          <Animated.View
            style={[
              tw`absolute inset-0 bg-black`,
              {
                opacity: backdropAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.6],
                }),
              },
            ]}
          >
            <TouchableOpacity
              style={tw`flex-1`}
              onPress={hideModal}
              activeOpacity={1}
            />
          </Animated.View>

          {/* Modal Content */}
          <Animated.View
            style={[
              tw`absolute bottom-0 left-0 right-0`,
              {
                transform: [
                  { translateY: Animated.add(slideAnimation, panY) },
                  { scale: scaleAnimation },
                ],
                height: screenHeight * 0.85,
              },
            ]}
          >
            <Animated.View
              style={[
                tw`bg-white rounded-t-3xl shadow-2xl flex-1`,
                { transform: [{ translateY: panY }] }
              ]}
              {...panResponder.panHandlers}
            >
              {/* Modern Drag Handle */}
              <View style={tw`items-center pt-4 pb-3`}>
                <View style={tw`w-12 h-1.5 bg-gray-300 rounded-full`} />
              </View>
              
              {/* Enhanced Header with Modern Typography */}
              <View style={tw`px-6 pb-6 border-b border-gray-100`}>
                <Text style={tw`text-lg text-black font-black text-center mb-2 tracking-tight`}>
                  {selectionInfo.primary}
                </Text>
                <Text style={tw`text-sm text-gray-600 text-center font-medium`}>
                  {selectionInfo.secondary}
                </Text>
                
                {/* Modern progress indicator */}
                <View style={tw`flex-row justify-center mt-4 space-x-3`}>
                  <View style={[
                    tw`w-8 h-1.5 rounded-full transition-colors duration-200`,
                    (tempCheckIn || (selectingDate === 'checkin' && !isRangeSelection)) ? tw`bg-black` : tw`bg-gray-200`
                  ]} />
                  <View style={[
                    tw`w-8 h-1.5 rounded-full transition-colors duration-200`,
                    (tempCheckOut || (selectingDate === 'checkout' && !isRangeSelection)) ? tw`bg-black` : tw`bg-gray-200`
                  ]} />
                </View>
              </View>
              
              {/* Scrollable Calendar */}
              <ScrollView
                ref={scrollViewRef}
                style={tw`flex-1`}
                showsVerticalScrollIndicator={false}
                bounces={true}
                contentContainerStyle={tw`pb-4`}
              >
                <FlatList
                  data={monthsData}
                  renderItem={renderMonth}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  keyExtractor={(item) => `${item.year}-${item.month}`}
                />
              </ScrollView>
              
              {/* Modern Bottom Actions */}
              <View style={tw`px-6 py-6 bg-white border-t border-gray-100`}>
                <View style={tw`flex-row space-x-4`}>
                  <TouchableOpacity
                    style={tw`flex-1 bg-gray-100 py-4 rounded-2xl items-center border border-gray-200`}
                    onPress={hideModal}
                    activeOpacity={0.8}
                  >
                    <Text style={tw`text-gray-700 text-base font-bold`}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      tw`flex-1 py-4 rounded-2xl items-center shadow-lg`,
                      isDoneEnabled() ? tw`bg-black` : tw`bg-gray-300`
                    ]}
                    onPress={handleDonePress}
                    activeOpacity={0.8}
                    disabled={!isDoneEnabled()}
                  >
                    <Text style={[
                      tw`text-base font-bold`,
                      isDoneEnabled() ? tw`text-white` : tw`text-gray-500`
                    ]}>
                      Confirm Dates
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

export default DateSelector;