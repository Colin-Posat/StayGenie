// components/ContextualSuggestionPills.tsx
import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

// Turquoise color theme
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const TURQUOISE_SUBTLE = '#f0feff';
const TURQUOISE_BORDER = '#b3f7ff';

export interface SuggestionPill {
  id: string;
  text: string;
  query: string;
  type: 'essential' | 'amenity' | 'preference';
  priority: number; // 1 = highest priority
}

interface SearchContext {
  location?: string;
  dates?: {
    checkin: string;
    checkout: string;
  };
  guests?: {
    adults: number;
    children: number;
  };
  budget?: {
    min?: number | null;
    max?: number | null;
    currency?: string;
  };
  amenities?: string[];
  preferences?: string[];
}

interface ContextualSuggestionPillsProps {
  searchContext?: SearchContext;
  currentSearch: string;
  onPillPress: (pill: SuggestionPill) => void;
  maxPills?: number;
  isSearchUpdating?: boolean; // Add this prop to know when typing animation is active
}

const ContextualSuggestionPills: React.FC<ContextualSuggestionPillsProps> = ({
  searchContext,
  currentSearch,
  onPillPress,
  maxPills = 8,
  isSearchUpdating = false,
}) => {
  // Store the stable search value (only updates when not typing)
  const stableSearchRef = useRef(currentSearch);
  const [stableSearch, setStableSearch] = React.useState(currentSearch);

  // Update stable search only when typing animation is not active
  useEffect(() => {
    if (!isSearchUpdating && currentSearch !== stableSearchRef.current) {
      stableSearchRef.current = currentSearch;
      setStableSearch(currentSearch);
    }
  }, [currentSearch, isSearchUpdating]);

  const suggestions = useMemo(() => {
    const pills: SuggestionPill[] = [];
    const search = stableSearch.toLowerCase(); // Use stable search instead of current search

    // Essential missing information (highest priority) - show ALL missing essentials
    if (!searchContext?.dates?.checkin || !searchContext?.dates?.checkout) {
      const hasDateInSearch = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}|check in|check out|staying|night)\b/i.test(search);
      if (!hasDateInSearch) {
        // Random date suggestions
        const dateOptions = [
          { text: 'This weekend', query: 'this weekend' },
          { text: 'Next month', query: 'next month' },
          { text: 'Dec 15-18', query: 'check in December 15 check out December 18' },
          { text: 'Jan 20-23', query: 'check in January 20 check out January 23' },
          { text: 'Next Friday', query: 'next Friday for 2 nights' },
          { text: 'Spring break', query: 'March 15-22' },
        ];
        const randomDate = dateOptions[Math.floor(Math.random() * dateOptions.length)];
        pills.push({
          id: 'add-dates',
          text: randomDate.text,
          query: randomDate.query,
          type: 'amenity',
          priority: 1,
        });
      }
    }

    if (!searchContext?.guests || (searchContext.guests.adults === 0 && searchContext.guests.children === 0)) {
      const hasGuestsInSearch = /\b(\d+\s*(guest|adult|child|people|person|room))\b/i.test(search);
      if (!hasGuestsInSearch) {
        // Random guest suggestions
        const guestOptions = [
          { text: '2 adults', query: '2 adults' },
          { text: '4 guests', query: '4 guests' },
          { text: 'Family of 5', query: '2 adults 3 children' },
          { text: 'Solo traveler', query: '1 adult' },
          { text: '3 adults', query: '3 adults' },
          { text: 'Couple + baby', query: '2 adults 1 child' },
        ];
        const randomGuests = guestOptions[Math.floor(Math.random() * guestOptions.length)];
        pills.push({
          id: 'add-guests',
          text: randomGuests.text,
          query: randomGuests.query,
          type: 'amenity',
          priority: 2,
        });
      }
    }

    if (!searchContext?.budget?.max && !searchContext?.budget?.min) {
      const hasBudgetInSearch = /\b(\$\d+|under|budget|price|cheap|expensive|affordable)\b/i.test(search);
      if (!hasBudgetInSearch) {
        // Random budget suggestions
        const budgetOptions = [
          { text: 'Under $150', query: 'under $150 per night' },
          { text: 'Under $300', query: 'under $300 per night' },
          { text: '$100-200', query: 'between $100-200 per night' },
          { text: 'Budget friendly', query: 'budget friendly under $120' },
          { text: 'Under $250', query: 'under $250 per night' },
          { text: '$80-150', query: 'between $80-150 per night' },
        ];
        const randomBudget = budgetOptions[Math.floor(Math.random() * budgetOptions.length)];
        pills.push({
          id: 'add-budget',
          text: randomBudget.text,
          query: randomBudget.query,
          type: 'amenity',
          priority: 3,
        });
      }
    }

    // Additional essential suggestions - room type and duration
    const hasRoomInSearch = /\b(suite|room|king|queen|double|single|deluxe)\b/i.test(search);
    if (!hasRoomInSearch) {
      const roomOptions = [
        { text: 'King bed', query: 'king bed room' },
        { text: 'Suite', query: 'suite room' },
        { text: 'Ocean view', query: 'ocean view room' },
        { text: 'Deluxe room', query: 'deluxe room' },
      ];
      const randomRoom = roomOptions[Math.floor(Math.random() * roomOptions.length)];
      pills.push({
        id: 'add-room',
        text: randomRoom.text,
        query: randomRoom.query,
        type: 'amenity',
        priority: 4,
      });
    }

    const hasLocationSpecific = /\b(downtown|beach|airport|center|district)\b/i.test(search);
    if (!hasLocationSpecific) {
      const locationOptions = [
        { text: 'Downtown', query: 'downtown area' },
        { text: 'Near beach', query: 'near beach' },
        { text: 'City center', query: 'city center' },
        { text: 'Near airport', query: 'near airport' },
      ];
      const randomLocation = locationOptions[Math.floor(Math.random() * locationOptions.length)];
      pills.push({
        id: 'add-location',
        text: randomLocation.text,
        query: randomLocation.query,
        type: 'amenity',
        priority: 5,
      });
    }

    // Amenity suggestions (medium priority)
    const commonAmenities = [
      { key: 'breakfast', text: 'Free breakfast', query: 'with free breakfast' },
      { key: 'wifi', text: 'Free WiFi', query: 'with free WiFi' },
      { key: 'parking', text: 'Free parking', query: 'with free parking' },
      { key: 'pool', text: 'Pool access', query: 'with pool' },
      { key: 'gym', text: 'Fitness center', query: 'with gym' },
      { key: 'spa', text: 'Spa services', query: 'with spa' },
      { key: 'cancellation', text: 'Free cancellation', query: 'with free cancellation' },
      { key: 'pet', text: 'Pet friendly', query: 'pet friendly' },
    ];

    commonAmenities.forEach((amenity, index) => {
      const hasAmenity = search.includes(amenity.key) || 
                        search.includes(amenity.query.replace('with ', ''));
      const isInContext = searchContext?.amenities?.some(a => 
        a.toLowerCase().includes(amenity.key)
      );

      if (!hasAmenity && !isInContext) {
        pills.push({
          id: `amenity-${amenity.key}`,
          text: amenity.text,
          query: amenity.query,
          type: 'amenity',
          priority: 10 + index,
        });
      }
    });

    // Preference suggestions (lower priority)
    const preferences = [
      { key: 'luxury', text: 'Luxury hotels', query: 'luxury hotels' },
      { key: 'boutique', text: 'Boutique hotels', query: 'boutique hotels' },
      { key: 'business', text: 'Business hotels', query: 'business hotels' },
      { key: 'family', text: 'Family friendly', query: 'family friendly' },
      { key: 'romantic', text: 'Romantic hotels', query: 'romantic hotels' },
      { key: 'beach', text: 'Near beach', query: 'near beach' },
      { key: 'downtown', text: 'Downtown location', query: 'downtown location' },
      { key: 'airport', text: 'Near airport', query: 'near airport' },
    ];

    preferences.forEach((pref, index) => {
      const hasPreference = search.includes(pref.key) || search.includes(pref.query);
      const isInContext = searchContext?.preferences?.some(p => 
        p.toLowerCase().includes(pref.key)
      );

      if (!hasPreference && !isInContext) {
        pills.push({
          id: `pref-${pref.key}`,
          text: pref.text,
          query: pref.query,
          type: 'amenity',
          priority: 20 + index,
        });
      }
    });

    // Sort by priority and limit
    const finalPills = pills
      .sort((a, b) => a.priority - b.priority)
      .slice(0, maxPills);

    return finalPills;
  }, [searchContext, stableSearch, maxPills]); // Use stableSearch instead of currentSearch

  if (suggestions.length === 0) {
    return null;
  }

  const handlePillPress = (pill: SuggestionPill) => {
    onPillPress(pill);
  };

  const getPillStyle = (type: SuggestionPill['type']) => {
    return {
      backgroundColor: TURQUOISE_SUBTLE,
      borderColor: TURQUOISE_BORDER,
      borderWidth: 1,
      opacity: isSearchUpdating ? 0.7 : 1, // Slightly fade pills during typing
    };
  };

  const getTextColor = (type: SuggestionPill['type']) => {
    return '#4B5563';
  };

  const getIconName = (type: SuggestionPill['type']) => {
    switch (type) {
      case 'essential':
        return 'add-circle' as const;
      case 'amenity':
        return 'add' as const;
      case 'preference':
        return 'add-outline' as const;
      default:
        return 'add' as const;
    }
  };

  return (
    <View style={tw`mb-3`}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`pl-0 pr-4 gap-2`}
        style={tw`max-h-12`}
        scrollEnabled={!isSearchUpdating} // Disable scrolling during typing
      >
        {suggestions.map((pill) => {
          const pillStyle = getPillStyle(pill.type);
          const textColor = getTextColor(pill.type);
          const iconName = getIconName(pill.type);

          return (
            <TouchableOpacity
              key={pill.id}
              style={[
                tw`flex-row items-center px-3 py-2 rounded-full`,
                {
                  minHeight: 36,
                  ...pillStyle,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 2,
                  elevation: 2,
                }
              ]}
              onPress={() => handlePillPress(pill)}
              activeOpacity={0.7}
              disabled={isSearchUpdating} // Disable pill presses during typing
            >
              <Ionicons
                name={iconName}
                size={14}
                color={textColor}
                style={tw`mr-1`}
              />
              <Text
                style={[
                  tw`text-xs font-medium`,
                  { color: textColor }
                ]}
                numberOfLines={1}
              >
                {pill.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default ContextualSuggestionPills;