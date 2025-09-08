// RecentSearches.tsx - Fixed width cards with bold shadows like SearchGuidePills
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const TURQUOISE = '#1df9ff';
const CARD_WIDTH = 140; // Updated to match BeautifulHotelCard width

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
        width: CARD_WIDTH,
        marginRight: 10,
      }}
    >
      <TouchableOpacity
        style={[
          tw`bg-white rounded-xl p-2.5 border border-gray-200`,
          {
            minHeight: 40,
            // Bold shadow like SearchGuidePills
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 1,
            },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            // Android shadow
            elevation: 3,
          }
        ]}
        onPress={() => onPress(search)}
        activeOpacity={0.7}
      >
        {/* Top row with search icon and remove button - fixed height */}
        <View style={[
          tw`flex-row items-center justify-between`,
          { height: 24, marginBottom: 6 }
        ]}>
          {/* Search icon */}
          <View style={[
            tw`w-6 h-6 rounded-full items-center justify-center`,
            { backgroundColor: `${TURQUOISE}15` }
          ]}>
            <Ionicons name="search" size={12} color={TURQUOISE} />
          </View>
          
          {/* Remove button */}
          <TouchableOpacity
            onPress={() => onRemove(search)}
            style={tw`w-5 h-5 items-center justify-center`}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="close" size={12} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        
        {/* Search text - fixed height area for text */}
        <View style={[
          tw`justify-center`,
          { height: 28, overflow: 'hidden' }
        ]}>
          <Text 
            style={[
              tw`text-xs font-medium text-gray-900`,
              {
                lineHeight: 14,
              }
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {search}
          </Text>
        </View>
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
    <View style={tw`w-full mb-5`}>
      {/* Section Header */}
      <View style={tw`flex-row items-center justify-between mb-3 px-1`}>
        <View style={tw`flex-row items-center flex-1`}>
          <Text style={tw`text-base font-semibold text-gray-900 mr-2`}>
            Recent Searches
          </Text>
        </View>
        
        {/* Clear all button */}
        {recentSearches.length > 0 && (
          <TouchableOpacity
            onPress={onClearAll}
            style={tw`px-2.4 py-1 rounded-full bg-gray-100`}
            activeOpacity={0.7}
          >
            <Text style={tw`text-xs font-medium text-gray-600`}>
              Clear All
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Scrollable Cards - fixed width */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 4,
          paddingVertical: 4,
        }}
        snapToInterval={CARD_WIDTH + 10} // Card width + margin
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
        
        <View style={tw`w-3`} />
      </ScrollView>
    </View>
  );
};

export default RecentSearches;