// Frontend/src/contexts/AuthContext.tsx - Updated with favorites management
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';

// Expo Auth imports
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Import Firebase config
import { auth, db } from '../config/firebaseConfig';

// Complete the browser session for mobile
WebBrowser.maybeCompleteAuthSession();

// Updated User interface with favorites
export interface User {
  id: string;
  email: string;
  name: string;
  favoriteHotels: string[];
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

// Auth context interface - Updated with new favorite methods
interface AuthContextType {
  // State
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Authentication actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  
  // Favorites actions - Updated with rich data support
  addFavoriteHotel: (hotel: FavoriteHotel) => Promise<void>;
  removeFavoriteHotel: (hotelId: string) => Promise<void>;
  toggleFavoriteHotel: (hotel: FavoriteHotel) => Promise<boolean>;
  isFavoriteHotel: (hotelId: string) => boolean;
  getFavoriteHotels: () => string[];
  getFavoriteHotelsData: () => Promise<FavoriteHotel[]>;
  
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

  const isAuthenticated = !!user && !!firebaseUser;

  // Helper function to generate a default name from email
  const generateDefaultName = (email: string): string => {
    const username = email.split('@')[0];
    const cleanUsername = username.replace(/[^a-zA-Z]/g, '');
    return cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1) || 'User';
  };

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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

  // Load user data from Firestore
  const loadUserData = async (firebaseUser: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as Omit<User, 'id'>;
        setUser({
          id: firebaseUser.uid,
          ...userData,
          // Ensure favoriteHotels is always an array
          favoriteHotels: userData.favoriteHotels || []
        });
      } else {
        const defaultName = firebaseUser.displayName || generateDefaultName(firebaseUser.email || '');
        
        const newUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: defaultName,
          favoriteHotels: [],
          createdAt: new Date().toISOString(),
        };
        
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          email: newUser.email,
          name: newUser.name,
          favoriteHotels: newUser.favoriteHotels,
          createdAt: newUser.createdAt,
        });
        
        setUser(newUser);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const defaultName = generateDefaultName(email);
      await updateProfile(firebaseUser, { displayName: defaultName });
      
      const newUser: Omit<User, 'id'> = {
        email: firebaseUser.email || '',
        name: defaultName,
        favoriteHotels: [],
        createdAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      
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
      await signInWithEmailAndPassword(auth, email, password);
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

  // Sign in with Google - Expo compatible
  const signInWithGoogle = async (): Promise<void> => {
    try {
      setIsLoading(true);

      const request = new AuthSession.AuthRequest({
        clientId: '962898883484-62afgb3pgqglhlntco5d1sl10keluqrr.apps.googleusercontent.com',
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.IdToken,
        redirectUri: AuthSession.makeRedirectUri(),
         usePKCE: false,  
      });

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      });

      if (result.type === 'success' && result.params.id_token) {
        const credential = GoogleAuthProvider.credential(result.params.id_token);
        await signInWithCredential(auth, credential);
        console.log('✅ Expo Google sign in successful');
      } else {
        throw new Error('Google sign in was cancelled or failed');
      }

    } catch (error: any) {
      console.error('Expo Google sign in error:', error);
      throw new Error(`Failed to sign in with Google: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const signOutUser = async (): Promise<void> => {
    try {
      await signOut(auth);
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
      await sendPasswordResetEmail(auth, email);
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

  // NEW: Add favorite hotel with complete data stored in Firestore
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
      await addDoc(collection(db, 'users', firebaseUser.uid, 'favoriteHotels'), cleanHotelData);

      // Also add hotel ID to user's favoriteHotels array for quick lookup
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        favoriteHotels: arrayUnion(hotel.id)
      });

      // Update local state
      setUser(prev => prev ? {
        ...prev,
        favoriteHotels: [...prev.favoriteHotels, hotel.id]
      } : null);

      console.log(`✅ Added "${hotel.name}" to favorites with complete data`);
      
    } catch (error) {
      console.error('Add favorite error:', error);
      throw new Error('Failed to add favorite');
    }
  };

  // NEW: Remove favorite hotel (both from array and subcollection)
  const removeFavoriteHotel = async (hotelId: string): Promise<void> => {
    if (!firebaseUser || !user) {
      throw new Error('Must be signed in to remove favorites');
    }

    try {
      // Remove from user's favoriteHotels array
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        favoriteHotels: arrayRemove(hotelId)
      });

      // Remove from favorites subcollection
      const favoritesQuery = query(
        collection(db, 'users', firebaseUser.uid, 'favoriteHotels'),
        where('id', '==', hotelId)
      );
      const querySnapshot = await getDocs(favoritesQuery);
      
      querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

      // Update local state
      setUser(prev => prev ? {
        ...prev,
        favoriteHotels: prev.favoriteHotels.filter(id => id !== hotelId)
      } : null);

      console.log(`✅ Removed hotel ${hotelId} from favorites`);
      
    } catch (error) {
      console.error('Remove favorite error:', error);
      throw new Error('Failed to remove favorite');
    }
  };

  // NEW: Toggle favorite hotel
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

  // NEW: Check if hotel is favorited
  const isFavoriteHotel = (hotelId: string): boolean => {
    if (!user) return false;
    return user.favoriteHotels.includes(hotelId);
  };

  // NEW: Get all favorite hotel IDs
  const getFavoriteHotels = (): string[] => {
    return user?.favoriteHotels || [];
  };

  // NEW: Get complete favorite hotels data from Firestore
  const getFavoriteHotelsData = async (): Promise<FavoriteHotel[]> => {
    if (!firebaseUser || !user) {
      return [];
    }

    try {
      const favoritesQuery = query(
        collection(db, 'users', firebaseUser.uid, 'favoriteHotels'),
        orderBy('addedAt', 'desc') // Most recent first
      );
      const querySnapshot = await getDocs(favoritesQuery);
      
      const favoriteHotels: FavoriteHotel[] = [];
      querySnapshot.forEach((doc) => {
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

  // NEW: Helper method to require authentication
  const requireAuth = (action: () => void, showSignUpModal: () => void): void => {
    if (isAuthenticated) {
      action();
    } else {
      showSignUpModal();
    }
  };

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