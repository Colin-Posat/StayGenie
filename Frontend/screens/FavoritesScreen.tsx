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
import { useAuth } from '../contexts/AuthContext';
import FavoriteHotelCard from '../components/Favorites/FavoriteHotelCard';
import { getCountryName } from '../utils/countryMapping';
import { getFlagEmoji } from '../utils/flagMapping';

const { width } = Dimensions.get('window');

// Turquoise color constants
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const BLACK = "#000000";

// Updated interfaces to match Firebase data structure
interface FavoritedHotel {
  id: string;
  name: string;
  location?: string;
  image?: string;
  images?: string[];
  price?: number;
  rating?: number;
  reviews?: number;
  addedAt?: string;
  // Rich hotel data for better favorites display
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  aiExcerpt?: string;
  whyItMatches?: string;
  funFacts?: string[];
  aiMatchPercent?: number;
  matchType?: string;
  tags?: string[];
  features?: string[];
  topAmenities?: string[];
  nearbyAttractions?: string[];
  locationHighlight?: string;
  pricePerNight?: {
    amount: number;
    totalAmount: number;
    currency: string;
    display: string;
    provider: string | null;
    isSupplierPrice: boolean;
  } | null;
  guestInsights?: string;
  sentimentPros?: string[];
  sentimentCons?: string[];
  isRefundable?: boolean;
  refundableTag?: string | null;
  fullDescription?: string;
  fullAddress?: string;
  [key: string]: any;
}

// Updated city folder interface with country info
interface CityFolder {
  city: string;
  country: string; // Full country name
  countryCode: string; // Store original country code for flag lookup
  displayName: string; // City name for display
  flagEmoji: string; // Flag emoji for the country
  hotels: FavoritedHotel[];
  isExpanded: boolean;
  count: number;
}

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
          Start exploring amazing hotels and save them by city for easy organization.
        </Text>
      </View>

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

// Updated city folder header component to show city with country flag and text
const CityFolderHeader: React.FC<{
  cityFolder: CityFolder;
  onToggle: (displayName: string) => void;
}> = ({ cityFolder, onToggle }) => {
  const rotateAnimation = useRef(new Animated.Value(cityFolder.isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotateAnimation, {
      toValue: cityFolder.isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [cityFolder.isExpanded]);

  const rotation = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <TouchableOpacity
      style={[
        tw`mx-6 mb-3 p-4 rounded-2xl flex-row items-center justify-between shadow-sm`,
        { 
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: TURQUOISE + '20',
        }
      ]}
      onPress={() => onToggle(cityFolder.displayName)}
      activeOpacity={0.8}
    >
      <View style={tw`flex-row items-center flex-1`}>
        <View style={tw`mr-3`}>
          <Text style={tw`text-xl`}>
            {cityFolder.flagEmoji}
          </Text>
        </View>
        
        <View style={tw`flex-1`}>
          <Text style={tw`text-lg font-bold text-gray-900`}>
            {cityFolder.city}
          </Text>
          <Text style={tw`text-xs text-gray-500`}>
            {cityFolder.country} • {cityFolder.count} hotel{cityFolder.count !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <View style={tw`flex-row items-center`}>
        <View style={[
          tw`px-3 py-1.5 rounded-full mr-3`,
          { backgroundColor: TURQUOISE + '15' }
        ]}>
          <Text style={[tw`text-xs font-semibold`, { color: TURQUOISE_DARK }]}>
            {cityFolder.count}
          </Text>
        </View>
        
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={TURQUOISE_DARK}
          />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

// Enhanced header with city folders controls
const FavoritesHeader: React.FC<{
  totalCount: number;
  cityCount: number;
  onRefresh: () => void;
  isRefreshing: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  hasExpandedFolders: boolean;
}> = ({ totalCount, cityCount, onRefresh, isRefreshing, onExpandAll, onCollapseAll, hasExpandedFolders }) => {
  return (
    <View style={tw`px-6 pt-6 pb-4 bg-white`}>
      <View style={tw`flex-row items-center justify-between mb-3`}>
        <Text style={tw`text-2xl font-bold text-gray-900`}>
          My Favorites
        </Text>
        
        {totalCount > 0 && (
          <TouchableOpacity
            style={[
              tw`py-2.5 px-4 rounded-xl border-2 flex-row items-center`,
              { 
                backgroundColor: TURQUOISE + '10',
                borderColor: TURQUOISE + '30',
              }
            ]}
            onPress={hasExpandedFolders ? onCollapseAll : onExpandAll}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={hasExpandedFolders ? "contract-outline" : "expand-outline"} 
              size={16} 
              color={TURQUOISE_DARK} 
            />
            <Text style={[tw`ml-2 font-medium text-sm`, { color: BLACK }]}>
              {hasExpandedFolders ? 'Collapse' : 'Expand'} All
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={tw`flex-row items-center justify-between`}>
        <Text style={tw`text-base text-gray-600`}>
          {totalCount > 0
            ? `${totalCount} hotel${totalCount > 1 ? 's' : ''} in ${cityCount} cit${cityCount > 1 ? 'ies' : 'y'}`
            : "Save hotels organized by city"
          }
        </Text>
      </View>
    </View>
  );
};

// Loading and Error states
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

// Main Favorites Screen Component - Updated for Firebase
const FavoritesScreen = () => {
  const [cityFolders, setCityFolders] = useState<CityFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Use Firebase auth context instead of cache
  const { 
    isAuthenticated, 
    getFavoriteHotelsData, 
    removeFavoriteHotel,
    isLoading: authLoading
  } = useAuth();

  // Group hotels by city, creating folders with country context and flags
  const createCityFolders = useCallback((hotels: FavoritedHotel[]): CityFolder[] => {
    const cityMap = new Map<string, { hotels: FavoritedHotel[]; country: string; countryCode: string }>();
    
    // Group hotels by city-country combination to avoid conflicts
    hotels.forEach(hotel => {
      const city = hotel.city || 'Unknown City';
      const countryCode = hotel.country || 'Unknown';
      const country = getCountryName(countryCode, countryCode);
      const cityCountryKey = `${city}, ${country}`; // Use as unique key
      
      if (!cityMap.has(cityCountryKey)) {
        cityMap.set(cityCountryKey, { hotels: [], country, countryCode });
      }
      cityMap.get(cityCountryKey)!.hotels.push(hotel);
    });

    // Convert to city folders and sort
    const folders: CityFolder[] = Array.from(cityMap.entries())
      .map(([cityCountryKey, { hotels, country, countryCode }]) => {
        const city = cityCountryKey.split(', ')[0]; // Extract city from key
        return {
          city,
          country,
          countryCode,
          displayName: cityCountryKey, // Use full "City, Country" as display key for uniqueness
          flagEmoji: getFlagEmoji(countryCode),
          hotels: hotels.sort((a, b) => {
            // Sort by date added (newest first), then by name
            const dateA = new Date(a.addedAt || 0).getTime();
            const dateB = new Date(b.addedAt || 0).getTime();
            if (dateB !== dateA) return dateB - dateA;
            return a.name.localeCompare(b.name);
          }),
          isExpanded: false, // Start collapsed
          count: hotels.length,
        };
      })
      .sort((a, b) => a.city.localeCompare(b.city)); // Sort cities alphabetically

    return folders;
  }, []);

  // Load and organize favorites from Firebase
  const loadFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('User not authenticated, clearing favorites data');
      setCityFolders([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Loading favorites from Firebase...');
      setIsLoading(true);
      setError(null);
      
      const favoriteHotels = await getFavoriteHotelsData();
      const folders = createCityFolders(favoriteHotels);
      
      console.log(`📱 Loaded ${favoriteHotels.length} favorites organized into ${folders.length} city folders`);
      
      if (Platform.OS === 'ios') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      
      setCityFolders(folders);
      setTotalCount(favoriteHotels.length);
    } catch (error) {
      console.error('❌ Error loading favorites:', error);
      setError(error instanceof Error ? error.message : 'Failed to load favorites');
      setCityFolders([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getFavoriteHotelsData, createCityFolders]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    if (!isAuthenticated) return;
    
    console.log('Refreshing favorites...');
    setIsRefreshing(true);
    await loadFavorites();
    setIsRefreshing(false);
    
    if (Platform.OS === 'ios') {
      const { HapticFeedback } = require('expo-haptics');
      HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Light);
    }
  }, [loadFavorites, isAuthenticated]);

  // Toggle city folder expansion using displayName as key
  const toggleCityFolder = useCallback((displayName: string) => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    
    setCityFolders(prev => 
      prev.map(folder => 
        folder.displayName === displayName 
          ? { ...folder, isExpanded: !folder.isExpanded }
          : folder
      )
    );
    
    console.log(`📁 Toggled ${displayName} folder`);
  }, []);

  // Expand all folders
  const expandAllFolders = useCallback(() => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    
    setCityFolders(prev => prev.map(folder => ({ ...folder, isExpanded: true })));
    console.log('📁 Expanded all folders');
  }, []);

  // Collapse all folders
  const collapseAllFolders = useCallback(() => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    
    setCityFolders(prev => prev.map(folder => ({ ...folder, isExpanded: false })));
    console.log('📁 Collapsed all folders');
  }, []);

  // Remove hotel from favorites using Firebase
  const handleRemoveFavorite = useCallback(async (hotel: FavoritedHotel) => {
    if (!isAuthenticated) return;
    
    try {
      console.log(`🗑️ Removing ${hotel.name}...`);
      await removeFavoriteHotel(hotel.id);
      await loadFavorites(); // Reload to update the UI
      console.log(`✅ Removed ${hotel.name}`);
    } catch (error) {
      console.error('❌ Error removing favorite:', error);
      Alert.alert('Error', 'Failed to remove hotel from favorites');
    }
  }, [removeFavoriteHotel, loadFavorites, isAuthenticated]);

  const handleHotelPress = useCallback((hotel: FavoritedHotel) => {
    console.log('🏨 Hotel pressed:', hotel.name);
    // Navigation logic here
  }, []);

  const handleExplore = useCallback(() => {
    console.log('🔍 Explore hotels pressed');
    // Navigation logic here
  }, []);

  // Check if any folders are expanded
  const hasExpandedFolders = cityFolders.some(folder => folder.isExpanded);

  // Auto-reload on focus when authenticated
  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        console.log('📱 Screen focused');
        const timer = setTimeout(() => {
          loadFavorites();
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [loadFavorites, authLoading])
  );

  // Show loading while auth is still loading
  if (authLoading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
        <LoadingState />
      </SafeAreaView>
    );
  }

  // Show message for unauthenticated users
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
        
        <FavoritesHeader
          totalCount={0}
          cityCount={0}
          onRefresh={() => {}}
          isRefreshing={false}
          onExpandAll={() => {}}
          onCollapseAll={() => {}}
          hasExpandedFolders={false}
        />

        <View style={tw`flex-1 items-center justify-center px-8`}>
          <View style={tw`items-center mb-10`}>
            <View style={[
              tw`w-24 h-24 rounded-3xl items-center justify-center mb-6 shadow-lg`,
              { 
                backgroundColor: TURQUOISE + '15',
                borderWidth: 2,
                borderColor: TURQUOISE + '40',
              }
            ]}>
              <Ionicons name="person-outline" size={32} color={TURQUOISE_DARK} />
            </View>

            <Text style={tw`text-2xl font-bold text-gray-900 text-center mb-3`}>
              Sign In Required
            </Text>

            <Text style={tw`text-base text-gray-600 text-center leading-6 mb-8 max-w-sm`}>
              Sign in to save and organize your favorite hotels by city.
            </Text>
          </View>

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
            onPress={() => {
              // Navigate to sign in screen
              console.log('Navigate to sign in');
            }}
            activeOpacity={0.9}
          >
            <Ionicons name="log-in" size={20} color="#FFFFFF" />
            <Text style={tw`text-white font-semibold text-base ml-3`}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      <FavoritesHeader
        totalCount={totalCount}
        cityCount={cityFolders.length}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onExpandAll={expandAllFolders}
        onCollapseAll={collapseAllFolders}
        hasExpandedFolders={hasExpandedFolders}
      />

      {isLoading ? (
        <LoadingState error={error} />
      ) : error ? (
        <ErrorState error={error} onRetry={handleRefresh} />
      ) : cityFolders.length === 0 ? (
        <EmptyFavorites onExplore={handleExplore} />
      ) : (
        <ScrollView
          style={tw`flex-1 bg-gray-50`}
          contentContainerStyle={tw`py-4`}
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
          {cityFolders.map((cityFolder) => (
            <View key={cityFolder.displayName} style={tw`mb-4`}>
              {/* City Folder Header */}
              <CityFolderHeader
                cityFolder={cityFolder}
                onToggle={toggleCityFolder}
              />

              {/* Hotels in this location (when expanded) */}
              {cityFolder.isExpanded && (
                <View style={tw`px-6`}>
                  {cityFolder.hotels.map((hotel, index) => {
                    // Ensure addedAt is always a string
                    const safeHotel = {
                      ...hotel,
                      addedAt: hotel.addedAt ?? '',
                    };
                    return (
                      <FavoriteHotelCard
                        key={`${hotel.id}-${cityFolder.displayName}-${hotel.addedAt ?? ''}`}
                        hotel={safeHotel}
                        onPress={handleHotelPress}
                        onRemove={handleRemoveFavorite}
                        index={index}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          ))}

          {/* Bottom spacing */}
          <View style={tw`h-6`} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default FavoritesScreen;