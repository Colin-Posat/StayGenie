// FavoritesScreen.tsx - Clean turquoise design with enhanced UX
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

// Turquoise color constants
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const BLACK = "#000000";

// Clean empty state with turquoise accents
const EmptyFavorites: React.FC<{ onExplore: () => void }> = ({ onExplore }) => {
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.9)).current;
  const slideAnimation = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnimation, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 500,
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
      <View style={tw`items-center mb-10`}>
        {/* Enhanced icon with turquoise gradient */}
        <View style={[
          tw`w-24 h-24 rounded-3xl items-center justify-center mb-6 shadow-lg`,
          { 
            backgroundColor: TURQUOISE + '15',
            borderWidth: 2,
            borderColor: TURQUOISE + '40',
          }
        ]}>
          <Ionicons name="heart-outline" size={32} color={TURQUOISE_DARK} />
        </View>

        <Text style={tw`text-2xl font-bold text-gray-900 text-center mb-3`}>
          No Favorites Yet
        </Text>

        <Text style={tw`text-base text-gray-600 text-center leading-6 mb-8 max-w-sm`}>
          Start exploring amazing hotels and save the ones you love for quick access later.
        </Text>
      </View>

      {/* Enhanced CTA with turquoise styling */}
      <TouchableOpacity
        style={[
          tw`py-4 px-8 rounded-2xl flex-row items-center shadow-lg`,
          { 
            backgroundColor: TURQUOISE,
            shadowColor: TURQUOISE,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }
        ]}
        onPress={onExplore}
        activeOpacity={0.9}
      >
        <Ionicons name="search" size={20} color="#FFFFFF" />
        <Text style={tw`text-white font-semibold text-base ml-3`}>
          Explore Hotels
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Clean header with turquoise accents
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

  const getSortLabel = () => {
    switch (sortBy) {
      case 'recent': return 'Recently Added';
      case 'name': return 'Hotel Name';
      case 'location': return 'Location';
      default: return 'Sort';
    }
  };

  return (
    <View style={tw`px-6 pt-6 pb-4 bg-white`}>
      <View style={tw`flex-row items-center justify-between mb-3`}>
        <Text style={tw`text-2xl font-bold text-gray-900`}>
          My Favorites
        </Text>
        
        {count > 0 && (
          <TouchableOpacity
            style={[
              tw`py-2.5 px-4 rounded-xl border-2 flex-row items-center`,
              { 
                backgroundColor: TURQUOISE + '10',
                borderColor: TURQUOISE + '30',
              }
            ]}
            onPress={onSort}
            activeOpacity={0.8}
          >
            <Ionicons name={getSortIcon()} size={16} color={TURQUOISE_DARK} />
            <Text style={[tw`ml-2 font-medium text-sm`, { color: BLACK }]}>
              Sort
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={tw`flex-row items-center justify-between`}>
        <Text style={tw`text-base text-gray-600`}>
          {count > 0
            ? `${count} saved hotel${count > 1 ? 's' : ''}`
            : "Save hotels you love for quick access"
          }
        </Text>
        
        {count > 0 && (
          <Text style={tw`text-sm text-gray-500`}>
            {getSortLabel()}
          </Text>
        )}
      </View>
    </View>
  );
};

// Clean loading state with turquoise animation
const LoadingState: React.FC<{ error?: string | null }> = ({ error }) => {
  const pulseAnimation = useRef(new Animated.Value(0)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    const rotate = Animated.loop(
      Animated.timing(rotateAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    pulse.start();
    rotate.start();

    return () => {
      pulse.stop();
      rotate.stop();
    };
  }, []);

  const opacity = pulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  const rotation = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={tw`flex-1 items-center justify-center px-6`}>
      <Animated.View 
        style={[
          tw`w-16 h-16 rounded-3xl items-center justify-center mb-4 border-2`,
          { 
            opacity,
            transform: [{ rotate: rotation }],
            backgroundColor: TURQUOISE + '15',
            borderColor: TURQUOISE + '40',
          }
        ]}
      >
        <Ionicons name="heart" size={24} color={TURQUOISE_DARK} />
      </Animated.View>
      
      <Text style={tw`text-gray-800 text-base mb-2 font-medium`}>
        Loading your favorites...
      </Text>
      
      {error && (
        <Text style={tw`text-red-500 text-sm text-center px-4 leading-5 mt-2`}>
          {error}
        </Text>
      )}
    </View>
  );
};

// Clean error state with turquoise retry button
const ErrorState: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <View style={tw`flex-1 items-center justify-center px-8`}>
    <View style={tw`w-16 h-16 bg-red-50 rounded-3xl items-center justify-center mb-4 border-2 border-red-100`}>
      <Ionicons name="alert-circle" size={24} color="#EF4444" />
    </View>
    
    <Text style={tw`text-red-600 text-lg mb-2 text-center font-semibold`}>
      Couldn't Load Favorites
    </Text>
    
    <Text style={tw`text-gray-600 text-base text-center mb-6 leading-6 max-w-sm`}>
      {error}
    </Text>
    
    <TouchableOpacity
      style={[
        tw`py-3 px-6 rounded-xl shadow-lg`,
        { 
          backgroundColor: TURQUOISE,
          shadowColor: TURQUOISE,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }
      ]}
      onPress={onRetry}
      activeOpacity={0.9}
    >
      <Text style={tw`text-white font-semibold text-base`}>
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
      console.log('Loading favorites...');
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
    console.log('Refreshing favorites...');
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
    
    console.log(`Sorted by: ${nextSort}`);
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
              tintColor={TURQUOISE_DARK}
              colors={[TURQUOISE_DARK]}
              progressBackgroundColor="#F9FAFB"
            />
          }
        >
          {/* Clean hotel cards layout */}
          <View style={tw`gap-0`}>
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

          {/* Clean bottom spacing */}
          <View style={tw`h-6`} />
          
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default FavoritesScreen;