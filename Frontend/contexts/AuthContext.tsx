// Frontend/src/contexts/AuthContext.tsx - Fully RN Firebase (Auth + Firestore)
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Expo Auth imports
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Type alias for Firebase User
export type FirebaseUser = FirebaseAuthTypes.User;

// Updated User interface with favorites
export interface User {
  id: string;
  email: string;
  name: string;
  favoriteHotels: string[];
  recentSearches: string[];
  createdAt: string;
}

// Add this new interface after the FavoriteHotel interface
export interface RecentSearch {
  id: string;
  query: string;
  searchParams?: {
    checkin: string;
    checkout: string;
    cityName?: string;
    countryCode?: string;
    adults: number;
    children: number;
  };
  resultCount?: number;
  createdAt: string;
}

// Hotel interface for favorites with all the rich data
export interface FavoriteHotel {
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

// Favorites change listener type
type FavoritesChangeListener = () => void;

// Auth context interface
interface AuthContextType {
  // State
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  removeRecentSearch: (searchToRemove: string) => Promise<void>;
  addRecentSearch: (query: string, replaceQuery?: string) => Promise<void>;
  getRecentSearches: () => string[];
  clearRecentSearches: () => Promise<void>;
  
  // Authentication actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  
  // Favorites actions
  addFavoriteHotel: (hotel: FavoriteHotel) => Promise<void>;
  removeFavoriteHotel: (hotelId: string) => Promise<void>;
  toggleFavoriteHotel: (hotel: FavoriteHotel) => Promise<boolean>;
  isFavoriteHotel: (hotelId: string) => boolean;
  getFavoriteHotels: () => string[];
  getFavoriteHotelsData: () => Promise<FavoriteHotel[]>;
  
  // Change notification system
  onFavoritesChange: (listener: FavoritesChangeListener) => () => void;
  notifyFavoritesChanged: () => void;
  
  // UI helpers
  requireAuth: (action: () => void, showSignUpModal: () => void) => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Store favorites change listeners
  const [favoritesChangeListeners, setFavoritesChangeListeners] = useState<Set<FavoritesChangeListener>>(new Set());

  const isAuthenticated = !!user && !!firebaseUser;

  // Helper function to generate a default name from email
  const generateDefaultName = (email: string): string => {
    const username = email.split('@')[0];
    const cleanUsername = username.replace(/[^a-zA-Z]/g, '');
    return cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1) || 'User';
  };

  // Notify all listeners that favorites have changed
  const notifyFavoritesChanged = useCallback(() => {
    console.log('🔔 Notifying favorites changed to', favoritesChangeListeners.size, 'listeners');
    favoritesChangeListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in favorites change listener:', error);
      }
    });
  }, [favoritesChangeListeners]);

  // Add favorites change listener
  const onFavoritesChange = useCallback((listener: FavoritesChangeListener): (() => void) => {
    setFavoritesChangeListeners(prev => new Set([...prev, listener]));
    
    // Return cleanup function
    return () => {
      setFavoritesChangeListeners(prev => {
        const newSet = new Set(prev);
        newSet.delete(listener);
        return newSet;
      });
    };
  }, []);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      console.log('🔐 Auth state changed:', firebaseUser?.uid);
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        await loadUserData(firebaseUser);
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const addRecentSearch = async (query: string, replaceQuery?: string): Promise<void> => {
    if (!firebaseUser || !user || !query.trim()) {
      return;
    }

    try {
      const trimmedQuery = query.trim();
      const trimmedReplaceQuery = replaceQuery?.trim();
      
      let updatedSearches: string[];
      
      if (trimmedReplaceQuery && trimmedReplaceQuery !== trimmedQuery) {
        // Replace the original query with the new one
        updatedSearches = [
          trimmedQuery,
          ...user.recentSearches.filter(search => 
            search !== trimmedQuery && search !== trimmedReplaceQuery
          )
        ].slice(0, 10);
        
        console.log(`Replacing "${trimmedReplaceQuery}" with "${trimmedQuery}" in recent searches`);
      } else {
        // Normal behavior - add to front, remove duplicates
        updatedSearches = [
          trimmedQuery,
          ...user.recentSearches.filter(search => search !== trimmedQuery)
        ].slice(0, 10);
      }

      await firestore()
        .collection('users')
        .doc(firebaseUser.uid)
        .update({
          recentSearches: updatedSearches
        });

      // Update local state
      setUser(prev => prev ? {
        ...prev,
        recentSearches: updatedSearches
      } : null);

      console.log('Recent search saved:', trimmedQuery);
      
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  };

  const getRecentSearches = (): string[] => {
    return user?.recentSearches || [];
  };

  const clearRecentSearches = async (): Promise<void> => {
    if (!firebaseUser || !user) {
      return;
    }

    try {
      await firestore()
        .collection('users')
        .doc(firebaseUser.uid)
        .update({
          recentSearches: []
        });

      setUser(prev => prev ? {
        ...prev,
        recentSearches: []
      } : null);

      console.log('Recent searches cleared');
      
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  };

  const removeRecentSearch = async (searchToRemove: string): Promise<void> => {
    if (!firebaseUser || !user) {
      return;
    }

    try {
      const updatedSearches = user.recentSearches.filter(search => search !== searchToRemove);

      await firestore()
        .collection('users')
        .doc(firebaseUser.uid)
        .update({
          recentSearches: updatedSearches
        });

      setUser(prev => prev ? {
        ...prev,
        recentSearches: updatedSearches
      } : null);

      console.log('Removed recent search:', searchToRemove);
      
    } catch (error) {
      console.error('Failed to remove recent search:', error);
    }
  };

  // Load user data from Firestore
  const loadUserData = async (firebaseUser: FirebaseUser) => {
    try {
      console.log('🔍 Loading user data for:', firebaseUser.uid);
      
      const userDoc = await firestore()
        .collection('users')
        .doc(firebaseUser.uid)
        .get();
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as Omit<User, 'id'>;
        setUser({
          id: firebaseUser.uid,
          ...userData,
          // Ensure arrays are always initialized
          favoriteHotels: userData.favoriteHotels || [],
          recentSearches: userData.recentSearches || []
        });
        console.log('✅ User data loaded from Firestore');
      } else {
        console.log('📝 Creating new user document');
        const defaultName = firebaseUser.displayName || generateDefaultName(firebaseUser.email || '');
        
        const newUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: defaultName,
          favoriteHotels: [],
          recentSearches: [],
          createdAt: new Date().toISOString(),
        };
        
        await firestore()
          .collection('users')
          .doc(firebaseUser.uid)
          .set({
            email: newUser.email,
            name: newUser.name,
            favoriteHotels: newUser.favoriteHotels,
            recentSearches: newUser.recentSearches,
            createdAt: newUser.createdAt,
          });
        
        setUser(newUser);
        console.log('✅ New user document created');
      }
    } catch (error: any) {
      console.error('❌ Error loading user data:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;
      
      const defaultName = generateDefaultName(email);
      await firebaseUser.updateProfile({ displayName: defaultName });
      
      const newUser: Omit<User, 'id'> = {
        email: firebaseUser.email || '',
        name: defaultName,
        favoriteHotels: [],
        createdAt: new Date().toISOString(),
        recentSearches: []
      };
      
      await firestore()
        .collection('users')
        .doc(firebaseUser.uid)
        .set(newUser);
      
      setUser({
        id: firebaseUser.uid,
        ...newUser
      });
      
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          throw new Error('An account with this email already exists');
        case 'auth/weak-password':
          throw new Error('Password is too weak');
        case 'auth/invalid-email':
          throw new Error('Invalid email address');
        default:
          throw new Error('Failed to create account');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      await auth().signInWithEmailAndPassword(email, password);
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          throw new Error('Invalid email or password');
        case 'auth/too-many-requests':
          throw new Error('Too many failed attempts. Please try again later');
        case 'auth/invalid-email':
          throw new Error('Invalid email address');
        default:
          throw new Error('Failed to sign in');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Perform sign in
      const { data } = await GoogleSignin.signIn();
      console.log('✅ Got user info from Google:', data?.user.email);

      // Create Firebase credential with the ID token
      if (!data?.idToken) {
        throw new Error('No ID token received from Google Sign-In');
      }
      
      const googleCredential = auth.GoogleAuthProvider.credential(data.idToken);
      
      // Sign in to Firebase
      await auth().signInWithCredential(googleCredential);
      console.log('✅ Firebase sign in successful');

    } catch (error: any) {
      console.error('Native Google sign in error:', error);
      
      if (error.code === 'SIGN_IN_CANCELLED') {
        throw new Error('Sign in was cancelled');
      } else if (error.code === 'IN_PROGRESS') {
        throw new Error('Sign in already in progress');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        throw new Error('Play Services not available');
      } else {
        throw new Error(`Failed to sign in with Google: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const signOutUser = async (): Promise<void> => {
    try {
      await auth().signOut();
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw new Error('Failed to sign out');
    }
  };

  // Send password reset email
  const sendPasswordReset = async (email: string): Promise<void> => {
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
          throw new Error('No account found with this email');
        case 'auth/invalid-email':
          throw new Error('Invalid email address');
        default:
          throw new Error('Failed to send password reset email');
      }
    }
  };

  // Add favorite hotel with change notification
  const addFavoriteHotel = async (hotel: FavoriteHotel): Promise<void> => {
    if (!firebaseUser || !user) {
      throw new Error('Must be signed in to add favorites');
    }

    try {
      // Clean the hotel data to remove undefined values (Firestore doesn't allow undefined)
      const cleanHotelData = Object.fromEntries(
        Object.entries({
          ...hotel,
          addedAt: new Date().toISOString(),
        }).filter(([_, value]) => value !== undefined)
      ) as FavoriteHotel;

      // Store complete hotel data in a separate favorites collection
      await firestore()
        .collection('users')
        .doc(firebaseUser.uid)
        .collection('favoriteHotels')
        .add(cleanHotelData);

      // Also add hotel ID to user's favoriteHotels array for quick lookup
      await firestore()
        .collection('users')
        .doc(firebaseUser.uid)
        .update({
          favoriteHotels: firestore.FieldValue.arrayUnion(hotel.id)
        });

      // Update local state
      setUser(prev => prev ? {
        ...prev,
        favoriteHotels: [...prev.favoriteHotels, hotel.id]
      } : null);

      console.log(`✅ Added "${hotel.name}" to favorites with complete data`);
      
      // Notify listeners that favorites changed
      notifyFavoritesChanged();
      
    } catch (error) {
      console.error('Add favorite error:', error);
      throw new Error('Failed to add favorite');
    }
  };

  // Remove favorite hotel with change notification
  const removeFavoriteHotel = async (hotelId: string): Promise<void> => {
    if (!firebaseUser || !user) {
      throw new Error('Must be signed in to remove favorites');
    }

    try {
      // Remove from user's favoriteHotels array
      await firestore()
        .collection('users')
        .doc(firebaseUser.uid)
        .update({
          favoriteHotels: firestore.FieldValue.arrayRemove(hotelId)
        });

      // Remove from favorites subcollection
      const favoritesSnapshot = await firestore()
        .collection('users')
        .doc(firebaseUser.uid)
        .collection('favoriteHotels')
        .where('id', '==', hotelId)
        .get();
      
      const batch = firestore().batch();
      favoritesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Update local state
      setUser(prev => prev ? {
        ...prev,
        favoriteHotels: prev.favoriteHotels.filter(id => id !== hotelId)
      } : null);

      console.log(`✅ Removed hotel ${hotelId} from favorites`);
      
      // Notify listeners that favorites changed
      notifyFavoritesChanged();
      
    } catch (error) {
      console.error('Remove favorite error:', error);
      throw new Error('Failed to remove favorite');
    }
  };

  // Toggle favorite hotel with change notification
  const toggleFavoriteHotel = async (hotel: FavoriteHotel): Promise<boolean> => {
    if (!firebaseUser || !user) {
      throw new Error('Must be signed in to toggle favorites');
    }

    try {
      const isCurrentlyFavorited = user.favoriteHotels.includes(hotel.id);
      
      if (isCurrentlyFavorited) {
        await removeFavoriteHotel(hotel.id);
        console.log(`Toggled OFF: ${hotel.name}`);
        return false; // Now not favorited
      } else {
        await addFavoriteHotel(hotel);
        console.log(`Toggled ON: ${hotel.name}`);
        return true; // Now favorited
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
      throw new Error(`Failed to toggle favorite status for ${hotel.name}`);
    }
  };

  // Check if hotel is favorited
  const isFavoriteHotel = (hotelId: string): boolean => {
    if (!user) return false;
    return user.favoriteHotels.includes(hotelId);
  };

  // Get all favorite hotel IDs
  const getFavoriteHotels = (): string[] => {
    return user?.favoriteHotels || [];
  };

  // Get complete favorite hotels data from Firestore
  const getFavoriteHotelsData = async (): Promise<FavoriteHotel[]> => {
    if (!firebaseUser || !user) {
      return [];
    }

    try {
      const favoritesSnapshot = await firestore()
        .collection('users')
        .doc(firebaseUser.uid)
        .collection('favoriteHotels')
        .orderBy('addedAt', 'desc') // Most recent first
        .get();
      
      const favoriteHotels: FavoriteHotel[] = [];
      favoritesSnapshot.forEach((doc) => {
        const data = doc.data() as FavoriteHotel;
        favoriteHotels.push(data);
      });
      
      console.log(`📚 Retrieved ${favoriteHotels.length} favorite hotels with complete data`);
      return favoriteHotels;
    } catch (error) {
      console.error('Error getting favorite hotels data:', error);
      return [];
    }
  };

  // Helper method to require authentication
  const requireAuth = (action: () => void, showSignUpModal: () => void): void => {
    if (isAuthenticated) {
      action();
    } else {
      showSignUpModal();
    }
  };

  // Context value
  const value: AuthContextType = {
    user,
    firebaseUser,
    isAuthenticated,
    isLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut: signOutUser,
    sendPasswordReset,
    addFavoriteHotel,
    removeFavoriteHotel,
    toggleFavoriteHotel,
    isFavoriteHotel,
    getFavoriteHotels,
    getFavoriteHotelsData,
    onFavoritesChange,
    notifyFavoritesChanged,
    removeRecentSearch,
    addRecentSearch,
    getRecentSearches,
    clearRecentSearches,
    requireAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protected routes
export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  return (props: P) => {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
      return null;
    }
    
    if (!isAuthenticated) {
      return null;
    }
    
    return <Component {...props} />;
  };
};