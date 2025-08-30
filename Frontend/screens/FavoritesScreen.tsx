// FavoritesScreen.tsx - Updated with sign up buttons matching ProfileScreen
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
import EmailSignUpModal from '../components/SignupLogin/EmailSignUpModal';
import EmailSignInModal from '../components/SignupLogin/EmailSignInModal';

const { width } = Dimensions.get('window');

// Turquoise color constants
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const BLACK = "#000000";

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
  categoryRatings?: {
    cleanliness: number;
    service: number;
    location: number;
    roomQuality: number;
  };
  [key: string]: any;
}

interface CityFolder {
  city: string;
  country: string;
  countryCode: string;
  displayName: string;
  flagEmoji: string;
  hotels: FavoritedHotel[];
  isExpanded: boolean;
  count: number;
}

// Add interface for tracking expanded states
interface UIState {
  expandedFolders: Set<string>;
  expandedCards: Set<string>;
  lastDataHash: string;
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

// Main Favorites Screen Component - Updated with sign up functionality
const FavoritesScreen = () => {
  const [cityFolders, setCityFolders] = useState<CityFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showEmailSignUpModal, setShowEmailSignUpModal] = useState(false);
  const [showEmailSignInModal, setShowEmailSignInModal] = useState(false);
  
  // Track UI state separately from data
  const [uiState, setUIState] = useState<UIState>({
    expandedFolders: new Set(),
    expandedCards: new Set(),
    lastDataHash: ''
  });
  
  // Track if we need to refresh data vs just preserve UI
  const [needsDataRefresh, setNeedsDataRefresh] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const lastFocusTime = useRef<number>(0);

  const { 
    isAuthenticated, 
    getFavoriteHotelsData, 
    removeFavoriteHotel,
    onFavoritesChange,
    isLoading: authLoading,
    signInWithGoogle
  } = useAuth();

  // Helper function to create a hash of the data to detect changes
  const createDataHash = useCallback((hotels: FavoritedHotel[]): string => {
    const hotelIds = hotels.map(h => h.id).sort().join(',');
    return `${hotels.length}-${hotelIds}`;
  }, []);

  // Group hotels by city, creating folders with country context and flags
  const createCityFolders = useCallback((hotels: FavoritedHotel[], preserveExpansion = false): CityFolder[] => {
    const cityMap = new Map<string, { hotels: FavoritedHotel[]; country: string; countryCode: string }>();
    
    hotels.forEach(hotel => {
      const city = hotel.city || 'Unknown City';
      const countryCode = hotel.country || 'Unknown';
      const country = getCountryName(countryCode, countryCode);
      const cityCountryKey = `${city}, ${country}`;
      
      if (!cityMap.has(cityCountryKey)) {
        cityMap.set(cityCountryKey, { hotels: [], country, countryCode });
      }
      cityMap.get(cityCountryKey)!.hotels.push(hotel);
    });

    const folders: CityFolder[] = Array.from(cityMap.entries())
      .map(([cityCountryKey, { hotels, country, countryCode }]) => {
        const city = cityCountryKey.split(', ')[0];
        const isExpanded = preserveExpansion ? uiState.expandedFolders.has(cityCountryKey) : false;
        
        return {
          city,
          country,
          countryCode,
          displayName: cityCountryKey,
          flagEmoji: getFlagEmoji(countryCode),
          hotels: hotels.sort((a, b) => {
            const dateA = new Date(a.addedAt || 0).getTime();
            const dateB = new Date(b.addedAt || 0).getTime();
            if (dateB !== dateA) return dateB - dateA;
            return a.name.localeCompare(b.name);
          }),
          isExpanded,
          count: hotels.length,
        };
      })
      .sort((a, b) => a.city.localeCompare(b.city));

    return folders;
  }, [uiState.expandedFolders]);

  // Optimized load function that preserves UI state
  const loadFavorites = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated) {
      console.log('User not authenticated, clearing favorites data');
      setCityFolders([]);
      setTotalCount(0);
      setIsLoading(false);
      setNeedsDataRefresh(true);
      return;
    }

    // Skip loading if we don't need to refresh and it's not forced (but not on first load)
    if (!needsDataRefresh && !forceRefresh && hasLoadedOnce) {
      console.log('⚡ Skipping unnecessary data refresh');
      setIsLoading(false);
      return;
    }

    try {
      console.log('📱 Loading favorites from Firebase...');
      setIsLoading(true);
      setError(null);
      
      const favoriteHotels = await getFavoriteHotelsData();
      const newDataHash = createDataHash(favoriteHotels);
      
      // Check if data actually changed (but not on first load)
      if (newDataHash === uiState.lastDataHash && !forceRefresh && hasLoadedOnce) {
        console.log('⚡ Data unchanged, preserving UI state');
        setIsLoading(false);
        setNeedsDataRefresh(false);
        return;
      }
      
      const shouldPreserveExpansion = newDataHash !== uiState.lastDataHash && uiState.lastDataHash !== '' && hasLoadedOnce;
      const newFolders = createCityFolders(favoriteHotels, shouldPreserveExpansion);
      
      console.log(`📱 Loaded ${favoriteHotels.length} favorites organized into ${newFolders.length} city folders`);
      
      setCityFolders(newFolders);
      setTotalCount(favoriteHotels.length);
      setNeedsDataRefresh(false);
      setHasLoadedOnce(true); // Mark that we've loaded at least once
      
      // Update data hash
      setUIState(prev => ({
        ...prev,
        lastDataHash: newDataHash
      }));
      
    } catch (error) {
      console.error('❌ Error loading favorites:', error);
      setError(error instanceof Error ? error.message : 'Failed to load favorites');
      setCityFolders([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getFavoriteHotelsData, createDataHash, needsDataRefresh, uiState.lastDataHash, createCityFolders, hasLoadedOnce]);

  // Optimized refresh handler
  const handleRefresh = useCallback(async () => {
    if (!isAuthenticated) return;
    
    console.log('🔄 Manual refresh triggered');
    setIsRefreshing(true);
    setNeedsDataRefresh(true); // Force refresh on manual pull
    await loadFavorites(true);
    setIsRefreshing(false);
    
    if (Platform.OS === 'ios') {
      const { HapticFeedback } = require('expo-haptics');
      HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Light);
    }
  }, [loadFavorites, isAuthenticated]);

  // Optimized toggle function that preserves state
  const toggleCityFolder = useCallback((displayName: string) => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    
    setUIState(prev => {
      const newExpandedFolders = new Set(prev.expandedFolders);
      if (newExpandedFolders.has(displayName)) {
        newExpandedFolders.delete(displayName);
      } else {
        newExpandedFolders.add(displayName);
      }
      return {
        ...prev,
        expandedFolders: newExpandedFolders
      };
    });
    
    // Update the folders state to reflect the UI change immediately
    setCityFolders(prev => 
      prev.map(folder => 
        folder.displayName === displayName 
          ? { ...folder, isExpanded: !folder.isExpanded }
          : folder
      )
    );
    
    console.log(`📁 Toggled ${displayName} folder`);
  }, []);

  // Optimized expand/collapse functions
  const expandAllFolders = useCallback(() => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    
    const allFolderNames = new Set(cityFolders.map(f => f.displayName));
    setUIState(prev => ({
      ...prev,
      expandedFolders: allFolderNames
    }));
    
    setCityFolders(prev => prev.map(folder => ({ ...folder, isExpanded: true })));
    console.log('📁 Expanded all folders');
  }, [cityFolders]);

  const collapseAllFolders = useCallback(() => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    
    setUIState(prev => ({
      ...prev,
      expandedFolders: new Set()
    }));
    
    setCityFolders(prev => prev.map(folder => ({ ...folder, isExpanded: false })));
    console.log('📁 Collapsed all folders');
  }, []);

  // Optimized remove function that doesn't trigger notifications (since it's from this screen)
  const handleRemoveFavorite = useCallback(async (hotel: FavoritedHotel) => {
    if (!isAuthenticated) return;
    
    try {
      console.log(`🗑️ Removing ${hotel.name}...`);
      
      // Optimistically update UI first for immediate feedback
      setCityFolders(prev => {
        const newFolders = prev.map(folder => ({
          ...folder,
          hotels: folder.hotels.filter(h => h.id !== hotel.id),
          count: folder.hotels.filter(h => h.id !== hotel.id).length
        })).filter(folder => folder.count > 0); // Remove empty folders
        
        return newFolders;
      });
      
      setTotalCount(prev => prev - 1);
      
      // Remove from backend without triggering our own listener
      await removeFavoriteHotel(hotel.id);
      
      console.log(`✅ Removed ${hotel.name}`);
    } catch (error) {
      console.error('❌ Error removing favorite:', error);
      Alert.alert('Error', 'Failed to remove hotel from favorites');
      
      // Revert optimistic update on error
      setNeedsDataRefresh(true);
      await loadFavorites(true);
    }
  }, [removeFavoriteHotel, isAuthenticated, loadFavorites]);

  const handleHotelPress = useCallback((hotel: FavoritedHotel) => {
    console.log('🏨 Hotel pressed:', hotel.name);
    // Navigation logic here
  }, []);

  const handleExplore = useCallback(() => {
    console.log('🔍 Explore hotels pressed');
    // Navigation logic here
  }, []);

  // Sign up handlers matching ProfileScreen
  const handleGoogleSignUp = useCallback(async () => {
    try {
      await signInWithGoogle();
      console.log('✅ Google sign up successful');
    } catch (error: any) {
      console.log('❌ Google sign up error:', error.message);
      Alert.alert('Sign Up Failed', 'Failed to sign up with Google. Please try again.');
    }
  }, [signInWithGoogle]);

  const handleSwitchToSignUp = useCallback(() => {
    setShowEmailSignInModal(false);
    setTimeout(() => {
      setShowEmailSignUpModal(true);
    }, 300);
  }, []);

  const handleSwitchToSignIn = useCallback(() => {
    setShowEmailSignUpModal(false);
    setTimeout(() => {
      setShowEmailSignInModal(true);
    }, 300);
  }, []);

  const hasExpandedFolders = cityFolders.some(folder => folder.isExpanded);

  // Listen for favorites changes from other parts of the app (optimized)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const unsubscribe = onFavoritesChange(() => {
      console.log('🔔 Favorites changed notification received');
      setNeedsDataRefresh(true);
      // Don't auto-refresh here, let the focus effect handle it
    });
    
    return unsubscribe;
  }, [isAuthenticated, onFavoritesChange]);

  // Smart focus effect that only refreshes when needed
  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        const currentTime = Date.now();
        const timeSinceLastFocus = currentTime - lastFocusTime.current;
        
        console.log('📱 Screen focused');
        
        // On first load or if it's been more than 5 seconds since last focus
        // or if we specifically need a data refresh
        if (!hasLoadedOnce || timeSinceLastFocus > 5000 || needsDataRefresh) {
          console.log('📱 Triggering data refresh on focus');
          const timer = setTimeout(() => {
            loadFavorites();
          }, hasLoadedOnce ? 100 : 0); // No delay on first load
          lastFocusTime.current = currentTime;
          return () => clearTimeout(timer);
        } else {
          console.log('⚡ Skipping refresh - too recent');
          setIsLoading(false);
        }
      }
    }, [loadFavorites, authLoading, needsDataRefresh, hasLoadedOnce])
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

  // Show message for unauthenticated users with sign up options
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
              Sign Up Required
            </Text>

            <Text style={tw`text-base text-gray-600 text-center leading-6 mb-8 max-w-sm`}>
              Create an account to save and organize your favorite hotels by city.
            </Text>
          </View>

          {/* Sign Up with Email Button */}
          <TouchableOpacity
            style={[
              tw`p-4 rounded-xl mb-3 flex-row items-center justify-center w-full`,
              { backgroundColor: TURQUOISE }
            ]}
            onPress={() => setShowEmailSignUpModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-outline" size={20} color="white" />
            <Text style={tw`text-white font-semibold text-base ml-3`}>
              Sign Up with Email
            </Text>
          </TouchableOpacity>

          {/* Sign Up with Google Button */}
          <TouchableOpacity
            style={[
              tw`p-4 rounded-xl flex-row items-center justify-center border w-full mb-3`,
              { 
                backgroundColor: '#FFFFFF',
                borderColor: '#E5E7EB',
              }
            ]}
            onPress={handleGoogleSignUp}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <Text style={tw`text-gray-900 font-semibold text-base ml-3`}>
              Sign Up with Google
            </Text>
          </TouchableOpacity>

          {/* Already have account link */}
          <TouchableOpacity
            style={tw`mt-3 items-center`}
            onPress={() => setShowEmailSignInModal(true)}
            activeOpacity={0.8}
          >
            <Text style={[tw`text-sm`, { color: TURQUOISE_DARK }]}>
              Already have an account? Sign In
            </Text>
          </TouchableOpacity>
        </View>

        {/* Email Sign Up Modal */}
        <EmailSignUpModal
          visible={showEmailSignUpModal}
          onClose={() => setShowEmailSignUpModal(false)}
          onSwitchToSignIn={handleSwitchToSignIn}
        />

        {/* Email Sign In Modal */}
        <EmailSignInModal
          visible={showEmailSignInModal}
          onClose={() => setShowEmailSignInModal(false)}
          onSwitchToSignUp={handleSwitchToSignUp}
          onForgotPassword={() => {
            console.log('Forgot password pressed');
          }}
        />
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
              <CityFolderHeader
                cityFolder={cityFolder}
                onToggle={toggleCityFolder}
              />

              {cityFolder.isExpanded && (
                <View style={tw`px-6`}>
                  {cityFolder.hotels.map((hotel, index) => {
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

          <View style={tw`h-6`} />
        </ScrollView>
      )}

      {/* Email Sign Up Modal */}
      <EmailSignUpModal
        visible={showEmailSignUpModal}
        onClose={() => setShowEmailSignUpModal(false)}
        onSwitchToSignIn={handleSwitchToSignIn}
      />

      {/* Email Sign In Modal */}
      <EmailSignInModal
        visible={showEmailSignInModal}
        onClose={() => setShowEmailSignInModal(false)}
        onSwitchToSignUp={handleSwitchToSignUp}
        onForgotPassword={() => {
          console.log('Forgot password pressed');
        }}
      />
    </SafeAreaView>
  );
};

export default FavoritesScreen;