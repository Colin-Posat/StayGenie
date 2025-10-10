// FavoritesScreen.tsx - Updated with ProfileScreen matching sign-up layout
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text as RNText,
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
import { Text } from '../components/CustomText'; 
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import tw from 'twrnc';
import { useAuth } from '../contexts/AuthContext';
import FavoriteHotelCard from '../components/Favorites/FavoriteHotelCard';
import { getCountryName } from '../utils/countryMapping';
import { getFlagEmoji } from '../utils/flagMapping';
import EmailSignUpModal from '../components/SignupLogin/EmailSignUpModal';
import EmailSignInModal from '../components/SignupLogin/EmailSignInModal';
import { useNavigation, NavigationProp } from '@react-navigation/native';


type FindStackParamList = {
  InitialSearch: undefined;
  Results: undefined;
};

type RootTabParamList = {
  Favorites: undefined;
  Find: { screen?: keyof FindStackParamList } | undefined;
  Profile: undefined;
};

const { width } = Dimensions.get('window');

// Consistent turquoise color theme - matching InitialSearchScreen
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';

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

interface UIState {
  expandedFolders: Set<string>;
  expandedCards: Set<string>;
  lastDataHash: string;
}

// Sleek empty state - consistent with InitialSearchScreen aesthetic
const EmptyFavorites: React.FC<{ onExplore: () => void }> = ({ onExplore }) => {
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const floatAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnimation, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnimation, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  const translateY = floatAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <Animated.View
      style={[
        tw`flex-1 items-center justify-center px-6`,
        { opacity: fadeAnimation }
      ]}
    >
      <Animated.View 
        style={[
          tw`items-center`,
          { transform: [{ translateY }] }
        ]}
      >
        <View style={[
          tw`w-20 h-20 rounded-3xl items-center justify-center mb-6`,
          { 
            backgroundColor: 'rgba(29, 249, 255, 0.08)',
            borderWidth: 1,
            borderColor: 'rgba(29, 249, 255, 0.2)',
          }
        ]}>
          <Ionicons name="heart-outline" size={28} color={TURQUOISE} />
        </View>

        <Text style={[
          tw`text-3xl font-bold text-center mb-3`,
          { color: '#1F2937' }
        ]}>
          No Favorites Yet
        </Text>

        <Text style={[
          tw`text-base text-center leading-6 mb-8 max-w-xs`,
          { color: '#6B7280' }
        ]}>
          Start exploring and save hotels you love for easy access later.
        </Text>

        <TouchableOpacity
          style={[
            tw`py-4 px-8 rounded-2xl flex-row items-center`,
            { 
              backgroundColor: TURQUOISE,
              shadowColor: 'rgba(29, 249, 255, 0.3)',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 8,
            }
          ]}
          onPress={onExplore}
          activeOpacity={0.9}
        >
          <Ionicons name="search" size={18} color="#FFFFFF" />
          <Text style={tw`text-white font-semibold text-base ml-2`}>
            Explore Hotels
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

// Modern city folder header
const CityFolderHeader: React.FC<{
  cityFolder: CityFolder;
  onToggle: (displayName: string) => void;
}> = ({ cityFolder, onToggle }) => {
  const rotateAnimation = useRef(new Animated.Value(cityFolder.isExpanded ? 1 : 0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(rotateAnimation, {
      toValue: cityFolder.isExpanded ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [cityFolder.isExpanded]);

  const rotation = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const handlePressIn = () => {
    Animated.spring(scaleAnimation, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnimation }] }}>
      <TouchableOpacity
        style={[
          tw`mx-4 mb-3 p-4 rounded-2xl flex-row items-center justify-between`,
          { 
            backgroundColor: '#FFFFFF',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.04)',
          }
        ]}
        onPress={() => onToggle(cityFolder.displayName)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={tw`flex-row items-center flex-1`}>
          <View style={[
            tw`w-12 h-12 rounded-xl items-center justify-center mr-3`,
            { backgroundColor: 'rgba(29, 249, 255, 0.08)' }
          ]}>
            <Text style={tw`text-xl`}>
              {cityFolder.flagEmoji}
            </Text>
          </View>
          
          <View style={tw`flex-1`}>
            <Text style={[
              tw`text-lg font-bold`,
              { color: '#1F2937' }
            ]}>
              {cityFolder.city}
            </Text>
            <Text style={[
              tw`text-sm mt-0.5`,
              { color: '#6B7280' }
            ]}>
              {cityFolder.country}
            </Text>
          </View>
        </View>

        <View style={tw`flex-row items-center`}>
          <View style={[
            tw`px-3 py-1.5 rounded-full mr-3`,
            { backgroundColor: 'rgba(29, 249, 255, 0.12)' }
          ]}>
            <Text style={[tw`text-sm font-semibold`, { color: TURQUOISE_DARK }]}>
              {cityFolder.count}
            </Text>
          </View>
          
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={TURQUOISE}
            />
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Clean modern header - consistent styling
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
      <View style={tw`flex-row items-center justify-between`}>
        <View>
          <Text style={[
            tw`text-3xl font-bold`,
            { color: '#1F2937' },
            Platform.OS === 'android' && { fontFamily: 'sans-serif-medium' }
          ]}>
            Favorites
          </Text>
          {totalCount > 0 && (
            <Text style={[
              tw`text-sm mt-1`,
              { color: '#6B7280' }
            ]}>
              {totalCount} hotel{totalCount !== 1 ? 's' : ''} in {cityCount} cit{cityCount !== 1 ? 'ies' : 'y'}
            </Text>
          )}
        </View>
        
        {totalCount > 0 && (
          <TouchableOpacity
            style={[
              tw`py-2.5 px-4 rounded-xl flex-row items-center`,
              { 
                backgroundColor: 'rgba(29, 249, 255, 0.08)',
                borderWidth: 1,
                borderColor: 'rgba(29, 249, 255, 0.2)',
              }
            ]}
            onPress={hasExpandedFolders ? onCollapseAll : onExpandAll}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={hasExpandedFolders ? "contract-outline" : "expand-outline"} 
              size={16} 
              color={TURQUOISE} 
            />
            <Text style={[tw`ml-2 font-medium text-sm`, { color: TURQUOISE_DARK }]}>
              {hasExpandedFolders ? 'Collapse' : 'Expand'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};


// Enhanced loading state
const LoadingState: React.FC<{ error?: string | null }> = ({ error }) => {
  const pulseAnimation = useRef(new Animated.Value(0)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    const rotate = Animated.loop(
      Animated.timing(rotateAnimation, {
        toValue: 1,
        duration: 3000,
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
    outputRange: [0.3, 1],
  });

  const rotation = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={tw`flex-1 items-center justify-center px-6`}>
      <Animated.View 
        style={[
          tw`w-16 h-16 rounded-3xl items-center justify-center mb-6`,
          { 
            opacity,
            transform: [{ rotate: rotation }],
            backgroundColor: 'rgba(29, 249, 255, 0.08)',
            borderWidth: 2,
            borderColor: 'rgba(29, 249, 255, 0.2)',
          }
        ]}
      >
        <Ionicons name="heart" size={24} color={TURQUOISE} />
      </Animated.View>
      
      <Text style={[
        tw`text-lg mb-2 font-semibold`,
        { color: '#1F2937' }
      ]}>
        Loading favorites
      </Text>
      
      <Text style={[
        tw`text-base text-center`,
        { color: '#6B7280' }
      ]}>
        Organizing your saved hotels...
      </Text>
      
      {error && (
        <Text style={[
          tw`text-sm text-center px-4 leading-5 mt-4`,
          { color: '#EF4444' }
        ]}>
          {error}
        </Text>
      )}
    </View>
  );
};

// Clean error state
const ErrorState: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <View style={tw`flex-1 items-center justify-center px-8`}>
    <View style={[
      tw`w-16 h-16 rounded-3xl items-center justify-center mb-6`,
      { 
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderWidth: 2,
        borderColor: 'rgba(239, 68, 68, 0.2)',
      }
    ]}>
      <Ionicons name="alert-circle" size={24} color="#EF4444" />
    </View>
    
    <Text style={[
      tw`text-xl mb-2 text-center font-semibold`,
      { color: '#EF4444' }
    ]}>
      Something went wrong
    </Text>
    
    <Text style={[
      tw`text-base text-center mb-8 leading-6 max-w-sm`,
      { color: '#6B7280' }
    ]}>
      {error}
    </Text>
    
    <TouchableOpacity
      style={[
        tw`py-4 px-8 rounded-2xl`,
        { 
          backgroundColor: TURQUOISE,
          shadowColor: 'rgba(29, 249, 255, 0.3)',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 8,
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
  const [cityFolders, setCityFolders] = useState<CityFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showEmailSignUpModal, setShowEmailSignUpModal] = useState(false);
  const [showEmailSignInModal, setShowEmailSignInModal] = useState(false);
  
  const [uiState, setUIState] = useState<UIState>({
    expandedFolders: new Set(),
    expandedCards: new Set(),
    lastDataHash: ''
  });
  
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

  const createDataHash = useCallback((hotels: FavoritedHotel[]): string => {
    const hotelIds = hotels.map(h => h.id).sort().join(',');
    return `${hotels.length}-${hotelIds}`;
  }, []);

  const navigation = useNavigation<NavigationProp<RootTabParamList>>();

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

  const loadFavorites = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated) {
      setCityFolders([]);
      setTotalCount(0);
      setIsLoading(false);
      setNeedsDataRefresh(true);
      return;
    }

    if (!needsDataRefresh && !forceRefresh && hasLoadedOnce) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const favoriteHotels = await getFavoriteHotelsData();
      const newDataHash = createDataHash(favoriteHotels);
      
      if (newDataHash === uiState.lastDataHash && !forceRefresh && hasLoadedOnce) {
        setIsLoading(false);
        setNeedsDataRefresh(false);
        return;
      }
      
      const shouldPreserveExpansion = newDataHash !== uiState.lastDataHash && uiState.lastDataHash !== '' && hasLoadedOnce;
      const newFolders = createCityFolders(favoriteHotels, shouldPreserveExpansion);
      
      setCityFolders(newFolders);
      setTotalCount(favoriteHotels.length);
      setNeedsDataRefresh(false);
      setHasLoadedOnce(true);
      
      setUIState(prev => ({
        ...prev,
        lastDataHash: newDataHash
      }));
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load favorites');
      setCityFolders([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getFavoriteHotelsData, createDataHash, needsDataRefresh, uiState.lastDataHash, createCityFolders, hasLoadedOnce]);

  const handleRefresh = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsRefreshing(true);
    setNeedsDataRefresh(true);
    await loadFavorites(true);
    setIsRefreshing(false);
    
    if (Platform.OS === 'ios') {
      const { HapticFeedback } = require('expo-haptics');
      HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Light);
    }
  }, [loadFavorites, isAuthenticated]);

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
    
    setCityFolders(prev => 
      prev.map(folder => 
        folder.displayName === displayName 
          ? { ...folder, isExpanded: !folder.isExpanded }
          : folder
      )
    );
  }, []);

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
  }, []);

  const handleRemoveFavorite = useCallback(async (hotel: FavoritedHotel) => {
    if (!isAuthenticated) return;
    
    try {
      setCityFolders(prev => {
        const newFolders = prev.map(folder => ({
          ...folder,
          hotels: folder.hotels.filter(h => h.id !== hotel.id),
          count: folder.hotels.filter(h => h.id !== hotel.id).length
        })).filter(folder => folder.count > 0);
        
        return newFolders;
      });
      
      setTotalCount(prev => prev - 1);
      
      await removeFavoriteHotel(hotel.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to remove hotel from favorites');
      setNeedsDataRefresh(true);
      await loadFavorites(true);
    }
  }, [removeFavoriteHotel, isAuthenticated, loadFavorites]);

  const handleHotelPress = useCallback((hotel: FavoritedHotel) => {
    // Navigation logic here
  }, []);

const handleExplore = useCallback(() => {
  navigation.navigate('Find');
}, [navigation]);

  const handleGoogleSignUp = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
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

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const unsubscribe = onFavoritesChange(() => {
      setNeedsDataRefresh(true);
    });
    
    return unsubscribe;
  }, [isAuthenticated, onFavoritesChange]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        const currentTime = Date.now();
        const timeSinceLastFocus = currentTime - lastFocusTime.current;
        
        if (!hasLoadedOnce || timeSinceLastFocus > 5000 || needsDataRefresh) {
          const timer = setTimeout(() => {
            loadFavorites();
          }, hasLoadedOnce ? 100 : 0);
          lastFocusTime.current = currentTime;
          return () => clearTimeout(timer);
        } else {
          setIsLoading(false);
        }
      }
    }, [loadFavorites, authLoading, needsDataRefresh, hasLoadedOnce])
  );

  if (authLoading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
        
        {/* Header */}
        <View style={tw`px-6 pt-6 pb-8 bg-white`}>
          <Text style={[
            tw`text-3xl font-bold`,
            { color: '#1F2937' },
            Platform.OS === 'android' && { fontFamily: 'sans-serif-medium' }
          ]}>
            Favorites
          </Text>
        </View>

        {/* Profile section - matches ProfileScreen exactly */}
        <View style={tw`px-6 pb-8`}>
          <View style={[
            tw`p-6 rounded-2xl`,
            { 
              backgroundColor: '#FFFFFF',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
              borderWidth: 1,
              borderColor: 'rgba(0, 0, 0, 0.04)',
            }
          ]}>
            <View style={tw`items-center`}>
              <View style={[
                tw`w-16 h-16 rounded-2xl items-center justify-center mb-4`,
                { backgroundColor: 'rgba(29, 249, 255, 0.08)' }
              ]}>
                <Ionicons name="person-outline" size={28} color={TURQUOISE} />
              </View>

              <Text style={[
                tw`text-xl font-bold text-center mb-2`,
                { color: '#1F2937' }
              ]}>
                Sign in to Save Hotels
              </Text>
              
              <Text style={[
                tw`text-sm text-center mb-6 max-w-sm`,
                { color: '#6B7280' }
              ]}>
                Create an account to save favorites and get personalized recommendations
              </Text>

              {/* Updated Sign Up with Email Button */}
              <TouchableOpacity
                style={[
                  tw`px-4 py-4 rounded-xl flex-row items-center justify-center w-full mb-3 bg-white border border-gray-200`,
                  {
                    shadowColor: '#000',
                    shadowOffset: {
                      width: 0,
                      height: 1,
                    },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 3,
                  }
                ]}
                onPress={() => setShowEmailSignUpModal(true)}
                activeOpacity={0.8}
              >
                <View style={[
                  tw`w-6 h-6 rounded-full items-center justify-center mr-3`,
                  { backgroundColor: 'rgba(29, 249, 255, 0.15)' }
                ]}>
                  <Ionicons
                    name="mail-outline"
                    size={14}
                    color={TURQUOISE_DARK}
                  />
                </View>
                <Text style={tw`text-base font-medium text-gray-800`}>
                  Sign Up with Email
                </Text>
              </TouchableOpacity>

              {/* Updated Sign Up with Google Button */}
              <TouchableOpacity
                style={[
                  tw`px-4 py-4 rounded-xl flex-row items-center justify-center w-full mb-4 bg-white border border-gray-200`,
                  {
                    shadowColor: '#000',
                    shadowOffset: {
                      width: 0,
                      height: 1,
                    },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 3,
                  }
                ]}
                onPress={handleGoogleSignUp}
                activeOpacity={0.8}
              >
                <View style={[
                  tw`w-6 h-6 rounded-full items-center justify-center mr-3`,
                  { backgroundColor: 'rgba(66, 133, 244, 0.15)' }
                ]}>
                  <Ionicons
                    name="logo-google"
                    size={14}
                    color="#4285F4"
                  />
                </View>
                <Text style={tw`text-base font-medium text-gray-800`}>
                  Sign Up with Google
                </Text>
              </TouchableOpacity>

              {/* Already have account link */}
              <TouchableOpacity
                style={tw`mt-2 items-center`}
                onPress={() => setShowEmailSignInModal(true)}
                activeOpacity={0.8}
              >
                <Text style={[tw`text-sm font-medium`, { color: TURQUOISE_DARK }]}>
                  Already have an account? Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <EmailSignUpModal
          visible={showEmailSignUpModal}
          onClose={() => setShowEmailSignUpModal(false)}
          onSwitchToSignIn={handleSwitchToSignIn}
        />

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
          style={tw`flex-1`}
          contentContainerStyle={tw`pb-6`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={TURQUOISE}
              colors={[TURQUOISE]}
              progressBackgroundColor="#FFFFFF"
            />
          }
        >
          <View style={tw`pt-2`}>
            {cityFolders.map((cityFolder, folderIndex) => (
              <View key={cityFolder.displayName} style={tw`mb-2`}>
                <CityFolderHeader
                  cityFolder={cityFolder}
                  onToggle={toggleCityFolder}
                />

                {cityFolder.isExpanded && (
                  <View style={tw`px-4 mb-4`}>
                    {cityFolder.hotels.map((hotel, index) => {
                      const safeHotel = {
                        ...hotel,
                        addedAt: hotel.addedAt ?? '',
                      };
                      return (
                        <View 
                          key={`${hotel.id}-${cityFolder.displayName}-${hotel.addedAt ?? ''}`}
                          style={[
                            tw`mb-3`,
                            index === cityFolder.hotels.length - 1 && tw`mb-0`
                          ]}
                        >
                          <FavoriteHotelCard
                            hotel={safeHotel}
                            onPress={handleHotelPress}
                            onRemove={handleRemoveFavorite}
                            index={index}
                          />
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={tw`h-8`} />
        </ScrollView>
      )}

      <EmailSignUpModal
        visible={showEmailSignUpModal}
        onClose={() => setShowEmailSignUpModal(false)}
        onSwitchToSignIn={handleSwitchToSignIn}
      />

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