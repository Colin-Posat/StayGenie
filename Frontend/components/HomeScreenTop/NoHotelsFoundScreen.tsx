// components/ErrorScreens/SearchErrorScreen.tsx
import React from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Text } from '../../components/CustomText'; 
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

// Consistent turquoise theme
const TURQUOISE = '#1df9ff';
const TURQUOISE_DARK = '#00d4e6';

interface SearchErrorScreenProps {
  onTryAgain: () => void;
  onBackToSearch: () => void;
}

const SearchErrorScreen: React.FC<SearchErrorScreenProps> = ({
  onTryAgain,
  onBackToSearch,
}) => {
  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      
      <View style={tw`flex-1 items-center justify-center px-6`}>
        {/* Error Icon */}
        <View style={[tw`mb-8`, {
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: 'rgba(29, 249, 255, 0.08)',
          alignItems: 'center',
          justifyContent: 'center'
        }]}>
          <Ionicons name="search-outline" size={36} color={TURQUOISE} />
        </View>

        {/* Main Message */}
        <Text style={[
          tw`text-3xl font-bold text-center mb-4`,
          { color: '#1F2937' },
          Platform.OS === 'android' && { fontFamily: 'sans-serif-medium' }
        ]}>
          Search failed
        </Text>
        
        <Text style={[
          tw`text-lg text-center mb-12 max-w-sm`,
          { color: '#6B7280' }
        ]}>
          Please try again or start a new search
        </Text>

        {/* Action Buttons */}
        <View style={tw`w-full max-w-sm gap-4`}>
          {/* Try Again Button */}
          <TouchableOpacity
            style={[tw`w-full py-4 rounded-2xl`, {
              backgroundColor: TURQUOISE,
              shadowColor: TURQUOISE,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 6
            }]}
            onPress={onTryAgain}
            activeOpacity={0.9}
          >
            <View style={tw`flex-row items-center justify-center`}>
              <Ionicons name="refresh" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={tw`text-white text-lg font-semibold`}>
                Try Again
              </Text>
            </View>
          </TouchableOpacity>

          {/* New Search Button */}
          <TouchableOpacity
            style={[tw`w-full py-4 border-2 rounded-2xl bg-white`, {
              borderColor: '#E5E7EB',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }]}
            onPress={onBackToSearch}
            activeOpacity={0.9}
          >
            <View style={tw`flex-row items-center justify-center`}>
              <Ionicons name="search" size={20} color="#374151" style={{ marginRight: 8 }} />
              <Text style={tw`text-gray-900 text-lg font-semibold`}>
                New Search
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SearchErrorScreen;