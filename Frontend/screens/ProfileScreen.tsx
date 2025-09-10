// ProfileScreen.tsx - Revamped with Firebase authentication
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Animated,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth } from '../contexts/AuthContext';
import EmailSignUpModal from '../components/SignupLogin/EmailSignUpModal';
import EmailSignInModal from '../components/SignupLogin/EmailSignInModal';

// Consistent color constants (matching other screens)
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const BLACK = "#000000";

// Enhanced section header component (consistent with FavoritesScreen)
const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <View style={tw`mb-4 px-6`}>
    <Text style={tw`text-xl font-bold text-gray-900 mb-1`}>
      {title}
    </Text>
    {subtitle && (
      <Text style={tw`text-sm text-gray-600`}>
        {subtitle}
      </Text>
    )}
  </View>
);

// Menu item component matching consistent app style
const MenuItem: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  hasSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  showArrow?: boolean;
  iconColor?: string;
  badge?: string;
  isDestructive?: boolean;
}> = ({
  icon,
  title,
  subtitle,
  value,
  onPress,
  hasSwitch = false,
  switchValue = false,
  onSwitchChange,
  showArrow = true,
  iconColor,
  badge,
  isDestructive = false
}) => {
  const defaultIconColor = isDestructive ? '#EF4444' : TURQUOISE_DARK;
  const finalIconColor = iconColor || defaultIconColor;

  return (
    <TouchableOpacity
      style={[
        tw`mx-6 mb-3 p-4 rounded-2xl flex-row items-center shadow-sm`,
        { 
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: isDestructive ? '#FEE2E2' : TURQUOISE + '20',
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={hasSwitch}
    >
      {/* Icon container */}
      <View style={[
        tw`w-12 h-12 rounded-xl items-center justify-center mr-4`,
        { 
          backgroundColor: isDestructive ? '#FEE2E2' : TURQUOISE + '15',
        }
      ]}>
        <Ionicons name={icon as any} size={22} color={finalIconColor} />
      </View>

      {/* Content */}
      <View style={tw`flex-1`}>
        <View style={tw`flex-row items-center`}>
          <Text style={[
            tw`text-base font-semibold`,
            { color: isDestructive ? '#EF4444' : BLACK }
          ]}>
            {title}
          </Text>
          {badge && (
            <View style={[
              tw`rounded-full px-2.5 py-1 ml-2`,
              { backgroundColor: TURQUOISE }
            ]}>
              <Text style={tw`text-white text-xs font-bold`}>
                {badge}
              </Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text style={tw`text-sm text-gray-500 mt-0.5`}>
            {subtitle}
          </Text>
        )}
        {value && (
          <Text style={[tw`text-sm mt-0.5 font-medium`, { color: TURQUOISE_DARK }]}>
            {value}
          </Text>
        )}
      </View>

      {/* Right side content */}
      {hasSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: '#E5E7EB', true: TURQUOISE }}
          thumbColor={switchValue ? '#FFFFFF' : '#F3F4F6'}
          ios_backgroundColor="#E5E7EB"
        />
      ) : showArrow ? (
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={isDestructive ? '#EF4444' : TURQUOISE_DARK} 
        />
      ) : null}
    </TouchableOpacity>
  );
};

// Main Profile Screen
const ProfileScreen = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [showEmailSignUpModal, setShowEmailSignUpModal] = useState(false);
  const [showEmailSignInModal, setShowEmailSignInModal] = useState(false);

  // Firebase auth
  const { user, isAuthenticated, signOut: firebaseSignOut, signInWithGoogle } = useAuth();

  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogout = async () => {
  try {
    if (Platform.OS === 'web') {
      // RN Alert buttons don't work on web; use native confirm
      const ok = window.confirm('Are you sure you want to sign out?');
      if (!ok) return;
      await firebaseSignOut();
      console.log('✅ Successfully signed out (web)');
      return;
    }

    // iOS/Android: use Alert with buttons
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await firebaseSignOut();
            console.log('✅ Successfully signed out (native)');
          }
        }
      ]
    );
  } catch (err) {
    console.log('❌ Sign out error:', (err as any)?.message);
    Alert.alert('Error', 'Failed to sign out');
  }
};

  const handleGoogleSignUp = async () => {
    try {
      await signInWithGoogle();
      console.log('✅ Google sign up successful');
    } catch (error: any) {
      console.log('❌ Google sign up error:', error.message);
      Alert.alert('Sign Up Failed', 'Failed to sign up with Google. Please try again.');
    }
  };

  const handleSwitchToSignUp = () => {
    setShowEmailSignInModal(false);
    setTimeout(() => {
      setShowEmailSignUpModal(true);
    }, 300);
  };

  const handleSwitchToSignIn = () => {
    setShowEmailSignUpModal(false);
    setTimeout(() => {
      setShowEmailSignInModal(true);
    }, 300);
  };

  const handleEditProfile = () => {
    console.log('Edit profile pressed');
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <ScrollView 
        style={tw`flex-1`}
        contentContainerStyle={tw`pb-8`}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with profile info */}
        <View style={tw`px-6 pt-6 pb-8 bg-white`}>
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <Text style={tw`text-2xl font-bold text-gray-900`}>
              Profile
            </Text>
            <TouchableOpacity
              style={[
                tw`w-12 h-12 rounded-xl items-center justify-center`,
                { backgroundColor: TURQUOISE + '15' }
              ]}
              onPress={handleEditProfile}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={20} color={TURQUOISE_DARK} />
            </TouchableOpacity>
          </View>

          {/* Profile section with user info */}
          <Animated.View
            style={[
              tw``,
              {
                opacity: fadeAnimation,
                transform: [{ translateY: slideAnimation }],
              }
            ]}
          >
            {isAuthenticated && user ? (
              <>
                <Text style={tw`text-xl font-bold text-gray-900 mb-1`}>
                  {user.name}
                </Text>
                <Text style={tw`text-sm text-gray-500`}>
                  {user.email}
                </Text>
                <View style={tw`flex-row items-center mt-2`}>
                  <View style={[tw`w-2 h-2 rounded-full mr-2`, { backgroundColor: TURQUOISE }]} />
                  <Text style={tw`text-xs text-gray-500`}>
                    {user.favoriteHotels.length} favorite hotel{user.favoriteHotels.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={tw`text-xl font-bold text-gray-900 mb-1`}>
                  Guest User
                </Text>
                <Text style={tw`text-sm text-gray-500 mb-4`}>
                  Create an account to save your favorite hotels and get personalized recommendations
                </Text>

                {/* Sign Up with Email Button */}
                <TouchableOpacity
                  style={[
                    tw`p-4 rounded-xl mb-3 flex-row items-center justify-center`,
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
                    tw`p-4 rounded-xl flex-row items-center justify-center border`,
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
              </>
            )}
          </Animated.View>
        </View>

        {/* Search Preferences Section */}
        <SectionHeader 
          title="Search Preferences" 
          subtitle="Your hotel discovery settings"
        />
        
        <MenuItem
          icon="star-outline"
          title="Recent Searches"
          subtitle="Quick access to recent searches"
          onPress={() => console.log('Saved searches pressed')}
        />
        
        <MenuItem
          icon="location-outline"
          title="Preferred Locations"
          subtitle="Cities you search often"
          onPress={() => console.log('Locations pressed')}
        />
        
        <MenuItem
          icon="options-outline"
          title="Default Filters"
          subtitle="Set your go-to preferences"
          onPress={() => console.log('Filters pressed')}
        />

        {/* Account Section */}
        <SectionHeader 
          title="Account" 
          subtitle="Manage your account settings"
        />
        
        <MenuItem
          icon="person-outline"
          title="Personal Information"
          subtitle="Update your details"
          onPress={() => console.log('Personal info pressed')}
        />
        
        <MenuItem
          icon="shield-checkmark-outline"
          title="Privacy & Security"
          subtitle="Control your privacy"
          onPress={() => console.log('Privacy pressed')}
        />
        
        <MenuItem
          icon="heart-outline"
          title="Favorites"
          subtitle={isAuthenticated ? "Your saved hotels" : "Sign in to save favorites"}
          badge={isAuthenticated && user ? user.favoriteHotels.length.toString() : undefined}
          onPress={() => {
            if (isAuthenticated) {
              console.log('Navigate to favorites');
            } else {
              console.log('Navigate to sign in');
            }
          }}
        />

        {/* Preferences Section */}
        <SectionHeader 
          title="Preferences" 
          subtitle="Customize your experience"
        />
        
        <MenuItem
          icon="notifications-outline"
          title="Push Notifications"
          subtitle="Hotel recommendations & updates"
          hasSwitch={true}
          switchValue={notificationsEnabled}
          onSwitchChange={setNotificationsEnabled}
          showArrow={false}
        />
        
        <MenuItem
          icon="location-outline"
          title="Location Services"
          subtitle="For better hotel recommendations"
          hasSwitch={true}
          switchValue={locationEnabled}
          onSwitchChange={setLocationEnabled}
          showArrow={false}
        />
        
        <MenuItem
          icon="finger-print-outline"
          title="Biometric Login"
          subtitle="Use Face ID or Touch ID"
          hasSwitch={true}
          switchValue={biometricEnabled}
          onSwitchChange={setBiometricEnabled}
          showArrow={false}
        />
        
        <MenuItem
          icon="moon-outline"
          title="Dark Mode"
          subtitle="Coming soon"
          hasSwitch={true}
          switchValue={darkModeEnabled}
          onSwitchChange={setDarkModeEnabled}
          showArrow={false}
        />

        {/* Support Section */}
        <SectionHeader 
          title="Support" 
          subtitle="Get help when you need it"
        />
        
        <MenuItem
          icon="help-circle-outline"
          title="Help Center"
          subtitle="FAQs and guides"
          onPress={() => console.log('Help pressed')}
        />
        
        <MenuItem
          icon="chatbubble-outline"
          title="Contact Support"
          subtitle="Get help with hotel searches"
          onPress={() => console.log('Support pressed')}
        />
        
        <MenuItem
          icon="star-outline"
          title="Rate Our App"
          subtitle="Share your feedback"
          onPress={() => console.log('Rate pressed')}
        />

        {/* About Section */}
        <SectionHeader title="About" />
        
        <MenuItem
          icon="document-text-outline"
          title="Terms of Service"
          onPress={() => console.log('Terms pressed')}
        />
        
        <MenuItem
          icon="shield-outline"
          title="Privacy Policy"
          onPress={() => console.log('Privacy policy pressed')}
        />
        
        <MenuItem
          icon="information-circle-outline"
          title="App Version"
          value="1.2.4"
          showArrow={false}
        />

        {/* Logout Button (only shown when authenticated) */}
        {isAuthenticated && (
          <View style={tw`px-6 pt-4 pb-6`}>
            <TouchableOpacity
              style={[
                tw`p-4 rounded-2xl flex-row items-center justify-center shadow-sm border`,
                { 
                  backgroundColor: '#FEF2F2',
                  borderColor: '#FECACA',
                }
              ]}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={tw`text-red-600 font-semibold text-base ml-3`}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

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

export default ProfileScreen;