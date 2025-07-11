// FavoritesScreen.tsx - Optimized with better organization and UX
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Animated,
  RefreshControl,
  Alert,
  Dimensions,
  LayoutAnimation,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import tw from 'twrnc';
import FavoritesCache, { FavoritedHotel } from '../utils/FavoritesCache';
import FavoriteHotelCard from '../components/Favorites/FavoriteHotelCard';

const { width } = Dimensions.get('window');

// Enhanced Empty State Component - Fixed without wiggling
const EmptyFavorites: React.FC<{ onExplore: () => void }> = ({ onExplore }) => {
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.8)).current;
  const slideAnimation = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Clean entrance animation sequence
    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnimation, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        tw`flex-1 items-center justify-center px-8`,
        { 
          opacity: fadeAnimation,
          transform: [
            { scale: scaleAnimation },
            { translateY: slideAnimation }
          ],
        }
      ]}
    >
      <View style={tw`items-center mb-12`}>
        {/* Enhanced Icon Container */}
        <View style={tw`w-24 h-24 bg-gray-50 rounded-3xl items-center justify-center mb-6 border border-gray-100 shadow-sm`}>
          <Ionicons name="heart-outline" size={36} color="#9CA3AF" />
        </View>

        <Text style={tw`text-2xl font-bold text-black text-center mb-3`}>
          No Favorites Yet
        </Text>

        <Text style={tw`text-[15px] text-gray-600 text-center leading-6 mb-8 max-w-sm`}>
          Discover amazing hotels and save your favorites for quick access. Your perfect stay awaits!
        </Text>
      </View>

      {/* Enhanced CTA Button */}
      <TouchableOpacity
        style={tw`bg-black py-4 px-8 rounded-2xl flex-row items-center shadow-lg`}
        onPress={onExplore}
        activeOpacity={0.8}
      >
        <Ionicons name="search" size={18} color="#FFFFFF" />
        <Text style={tw`text-white font-semibold text-[16px] ml-3`}>
          Explore Hotels
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Enhanced Header Component
const FavoritesHeader: React.FC<{
  count: number;
  onRefresh: () => void;
  isRefreshing: boolean;
  onSort: () => void;
  sortBy: 'recent' | 'name' | 'location';
}> = ({ count, onRefresh, isRefreshing, onSort, sortBy }) => {
  const getSortIcon = () => {
    switch (sortBy) {
      case 'recent': return 'time-outline';
      case 'name': return 'text-outline';
      case 'location': return 'location-outline';
      default: return 'swap-vertical-outline';
    }
  };

  return (
    <View style={tw`px-6 pt-4 pb-5 bg-white border-b border-gray-100`}>
      <View style={tw`flex-row items-center justify-between mb-2`}>
        <Text style={tw`text-2xl font-bold text-black`}>
          My Favorites
        </Text>
        
        {count > 0 && (
          <View style={tw`flex-row items-center gap-2`}>
            <TouchableOpacity
              style={tw`bg-gray-100 py-2.5 px-3.5 rounded-xl border border-gray-200`}
              onPress={onSort}
              activeOpacity={0.7}
            >
              <Ionicons name={getSortIcon()} size={16} color="#666666" />
            </TouchableOpacity>
            
          </View>
        )}
      </View>
      
      <View style={tw`flex-row items-center justify-between`}>
        <Text style={tw`text-[14px] text-gray-600`}>
          {count > 0
            ? `${count} saved hotel${count > 1 ? 's' : ''}`
            : "Save hotels you love"
          }
        </Text>
        
        {count > 0 && (
          <Text style={tw`text-[12px] text-gray-500 capitalize`}>
            Sorted by {sortBy}
          </Text>
        )}
      </View>
    </View>
  );
};

// Enhanced Loading Component
const LoadingState: React.FC<{ error?: string | null }> = ({ error }) => {
  const pulseAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const opacity = pulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={tw`flex-1 items-center justify-center px-6`}>
      <Animated.View 
        style={[
          tw`w-16 h-16 bg-gray-100 rounded-3xl items-center justify-center mb-4`,
          { opacity }
        ]}
      >
        <Ionicons name="heart" size={28} color="#9CA3AF" />
      </Animated.View>
      
      <Text style={tw`text-gray-700 text-[16px] mb-2 font-medium`}>
        Loading favorites...
      </Text>
      
      {error && (
        <Text style={tw`text-red-500 text-[13px] text-center px-4 leading-5`}>
          {error}
        </Text>
      )}
    </View>
  );
};

// Enhanced Error Component
const ErrorState: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <View style={tw`flex-1 items-center justify-center px-8`}>
    <View style={tw`w-16 h-16 bg-red-50 rounded-3xl items-center justify-center mb-4 border border-red-100`}>
      <Ionicons name="alert-circle" size={28} color="#EF4444" />
    </View>
    
    <Text style={tw`text-red-600 text-[17px] mb-2 text-center font-semibold`}>
      Unable to Load Favorites
    </Text>
    
    <Text style={tw`text-gray-600 text-[14px] text-center mb-6 leading-5 max-w-sm`}>
      {error}
    </Text>
    
    <TouchableOpacity
      style={tw`bg-black py-3 px-6 rounded-xl`}
      onPress={onRetry}
      activeOpacity={0.8}
    >
      <Text style={tw`text-white font-semibold text-[15px]`}>
        Try Again
      </Text>
    </TouchableOpacity>
  </View>
);

// Main Favorites Screen Component
const FavoritesScreen = () => {
  const [favorites, setFavorites] = useState<FavoritedHotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'location'>('recent');

  const favoritesCache = useRef(FavoritesCache.getInstance()).current;

  // Enhanced sort function
  const sortFavorites = useCallback((hotels: FavoritedHotel[], sortType: 'recent' | 'name' | 'location') => {
    const sorted = [...hotels].sort((a, b) => {
      switch (sortType) {
        case 'recent':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'location':
          return (a.location || '').localeCompare(b.location || '');
        default:
          return 0;
      }
    });
    return sorted;
  }, []);

  // Enhanced load favorites with sorting
  const loadFavorites = useCallback(async () => {
    try {
      console.log('🔄 Loading favorites...');
      setIsLoading(true);
      setError(null);
      
      await favoritesCache.initialize();
      console.log('✅ Cache initialized');
      
      const [cachedFavorites, count] = await Promise.all([
        favoritesCache.getAllFavorites(),
        favoritesCache.getFavoritesCount()
      ]);
      
      const sortedFavorites = sortFavorites(cachedFavorites, sortBy);
      
      console.log(`📱 Loaded ${sortedFavorites.length} favorites`);
      
      // Smooth transition for data updates
      if (Platform.OS === 'ios') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      
      setFavorites(sortedFavorites);
      setFavoritesCount(count);
    } catch (error) {
      console.error('❌ Error loading favorites:', error);
      setError(error instanceof Error ? error.message : 'Failed to load favorites');
      setFavorites([]);
      setFavoritesCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [favoritesCache, sortBy, sortFavorites]);

  // Enhanced refresh with haptic feedback
  const handleRefresh = useCallback(async () => {
    console.log('🔄 Refreshing favorites...');
    setIsRefreshing(true);
    await loadFavorites();
    setIsRefreshing(false);
    
    // Add haptic feedback on iOS
    if (Platform.OS === 'ios') {
      const { HapticFeedback } = require('expo-haptics');
      HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Light);
    }
  }, [loadFavorites]);

  // Enhanced sort handler
  const handleSort = useCallback(() => {
    const nextSort = sortBy === 'recent' ? 'name' : sortBy === 'name' ? 'location' : 'recent';
    setSortBy(nextSort);
    
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    
    const sortedFavorites = sortFavorites(favorites, nextSort);
    setFavorites(sortedFavorites);
    
    console.log(`🔄 Sorted by: ${nextSort}`);
  }, [sortBy, favorites, sortFavorites]);

  // Enhanced remove with confirmation
  const handleRemoveFavorite = useCallback(async (hotel: FavoritedHotel) => {
    try {
      console.log(`🗑️ Removing ${hotel.name}...`);
      await favoritesCache.removeFromFavorites(hotel.id);
      await loadFavorites();
      console.log(`✅ Removed ${hotel.name}`);
    } catch (error) {
      console.error('❌ Error removing favorite:', error);
      Alert.alert('Error', 'Failed to remove hotel from favorites');
    }
  }, [favoritesCache, loadFavorites]);

  const handleHotelPress = useCallback((hotel: FavoritedHotel) => {
    console.log('🏨 Hotel pressed:', hotel.name);
    // Enhanced navigation with hotel details
  }, []);

  const handleExplore = useCallback(() => {
    console.log('🔍 Explore hotels pressed');
    // Enhanced navigation to search/home
  }, []);

  // Auto-reload on focus with debounce
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Screen focused');
      const timer = setTimeout(() => {
        loadFavorites();
      }, 100);
      return () => clearTimeout(timer);
    }, [loadFavorites])
  );

  // Re-sort when sortBy changes
  useEffect(() => {
    if (favorites.length > 0) {
      const sortedFavorites = sortFavorites(favorites, sortBy);
      setFavorites(sortedFavorites);
    }
  }, [sortBy, sortFavorites]);

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      <FavoritesHeader
        count={favoritesCount}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onSort={handleSort}
        sortBy={sortBy}
      />

      {isLoading ? (
        <LoadingState error={error} />
      ) : error ? (
        <ErrorState error={error} onRetry={handleRefresh} />
      ) : favorites.length === 0 ? (
        <EmptyFavorites onExplore={handleExplore} />
      ) : (
        <ScrollView
          style={tw`flex-1 bg-gray-50`}
          contentContainerStyle={tw`px-6 py-4`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#666666"
              colors={["#666666"]}
              progressBackgroundColor="#F9FAFB"
            />
          }
        >
          {/* Enhanced Grid Layout */}
          <View style={tw`gap-4`}>
            {favorites.map((hotel, index) => (
              <FavoriteHotelCard
                key={`${hotel.id}-${sortBy}`}
                hotel={hotel}
                onPress={handleHotelPress}
                onRemove={handleRemoveFavorite}
                index={index}
              />
            ))}
          </View>

          {/* Enhanced Bottom Spacing */}
          <View style={tw`h-8`} />
          
          {/* Subtle Footer */}
          <View style={tw`items-center py-4`}>
            <Text style={tw`text-gray-400 text-[12px]`}>
              {favoritesCount} of ∞ amazing hotels
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default FavoritesScreen;