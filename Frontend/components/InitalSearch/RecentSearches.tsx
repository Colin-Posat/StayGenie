// RecentSearches.tsx - Horizontal carousel for recent searches
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';

interface RecentSearchCardProps {
  search: string;
  onPress: (search: string) => void;
  onRemove: (search: string) => void;
  index: number;
}

const RecentSearchCard: React.FC<RecentSearchCardProps> = ({ 
  search, 
  onPress, 
  onRemove, 
  index 
}) => {
  return (
    <View
      style={{
        width: 160,
        marginRight: 12,
        // iOS shadow - matching BeautifulHotelCard
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 3.5,
        // Android shadow
        elevation: 5,
      }}
    >
      <TouchableOpacity
        style={[
          tw`bg-white rounded-2xl p-4`,
          {
            minHeight: 80,
            width: '100%',
          }
        ]}
        onPress={() => onPress(search)}
        activeOpacity={0.7}
      >
        {/* Search icon and remove button header */}
        <View style={tw`flex-row items-center justify-between mb-2`}>
          <View style={[
            tw`w-8 h-8 rounded-full items-center justify-center`,
            { backgroundColor: `${TURQUOISE}15` }
          ]}>
            <Ionicons name="search" size={14} color={TURQUOISE} />
          </View>
                 
          <TouchableOpacity
            onPress={() => onRemove(search)}
            style={tw`w-6 h-6 items-center justify-center`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={14} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
       
        {/* Search text */}
        <Text 
          style={tw`text-xs font-medium text-gray-900 leading-4`}
          numberOfLines={3}
          ellipsizeMode="tail"
        >
          {search}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

interface RecentSearchesProps {
  recentSearches: string[];
  onSearchPress: (search: string) => void;
  onRemoveSearch: (search: string) => void;
  onClearAll: () => void;
}

const RecentSearches: React.FC<RecentSearchesProps> = ({
  recentSearches,
  onSearchPress,
  onRemoveSearch,
  onClearAll,
}) => {
  // Don't render if no recent searches
  if (!recentSearches || recentSearches.length === 0) {
    return null;
  }

  return (
    <View style={tw`w-full mb-6`}>
      {/* Section Header */}
      <View style={tw`flex-row items-center justify-between mb-4 px-1`}>
        <View style={tw`flex-row items-center flex-1`}>
          <Text style={tw`text-lg font-semibold text-gray-900 mr-2`}>
            Recent Searches
          </Text>
        </View>
                
        {/* Clear all button */}
        {recentSearches.length > 0 && (
          <TouchableOpacity
            onPress={onClearAll}
            style={tw`px-3 py-1.5 rounded-full bg-gray-100`}
            activeOpacity={0.7}
          >
            <Text style={tw`text-xs font-medium text-gray-600`}>
              Clear All
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Scrollable Cards with proper padding for shadows */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 4, // Horizontal padding for shadow
          paddingVertical: 6,   // Vertical padding for shadow - prevents clipping
        }}
        decelerationRate="fast"
        snapToInterval={172} // Card width (160) + margin (12)
        snapToAlignment="start"
      >
        {recentSearches.map((search, index) => (
          <RecentSearchCard
            key={`${search}-${index}`}
            search={search}
            onPress={onSearchPress}
            onRemove={onRemoveSearch}
            index={index}
          />
        ))}
                
        {/* Add some padding at the end */}
        <View style={tw`w-4`} />
      </ScrollView>
    </View>
  );
};

export default RecentSearches;