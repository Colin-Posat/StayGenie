// ProfileScreen.tsx - Updated with password reset flow
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth } from '../contexts/AuthContext';
import EmailSignUpModal from '../components/SignupLogin/EmailSignUpModal';
import EmailSignInModal from '../components/SignupLogin/EmailSignInModal';
import ForgotPasswordModal from '../components/SignupLogin/ForgotPasswordModal'; // Add this import
import HelpFeedbackModal from '../components/Profile/HelpFeedbackModal';

// Consistent color constants
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';

// Clean menu item component
const MenuItem: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  iconColor?: string;
  isDestructive?: boolean;
}> = ({
  icon,
  title,
  subtitle,
  onPress,
  iconColor,
  isDestructive = false
}) => {
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const defaultIconColor = isDestructive ? '#EF4444' : TURQUOISE;

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
          tw`mx-6 mb-3 p-4 rounded-2xl flex-row items-center`,
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
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Icon container */}
        <View style={[
          tw`w-12 h-12 rounded-xl items-center justify-center mr-4`,
          { 
            backgroundColor: isDestructive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(29, 249, 255, 0.08)',
          }
        ]}>
          <Ionicons 
            name={icon as any} 
            size={22} 
            color={iconColor || defaultIconColor} 
          />
        </View>

        {/* Content */}
        <View style={tw`flex-1`}>
          <Text style={[
            tw`text-base font-semibold`,
            { color: isDestructive ? '#EF4444' : '#1F2937' }
          ]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[
              tw`text-sm mt-0.5`,
              { color: '#6B7280' }
            ]}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Arrow */}
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={isDestructive ? '#EF4444' : TURQUOISE} 
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Main Profile Screen
const ProfileScreen = () => {
  const [showEmailSignUpModal, setShowEmailSignUpModal] = useState(false);
  const [showEmailSignInModal, setShowEmailSignInModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false); // Add this state
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false); // Add this state
  const [resetToken, setResetToken] = useState<string | undefined>(undefined); // Add this state
  const [showHelpFeedbackModal, setShowHelpFeedbackModal] = useState(false);

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

  const handleSignOut = async () => {
    try {
      if (Platform.OS === 'web') {
        const ok = window.confirm('Are you sure you want to sign out?');
        if (!ok) return;
        await firebaseSignOut();
        console.log('✅ Successfully signed out (web)');
        return;
      }

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
              console.log('✅ Successfully signed out');
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

  // Updated to show ForgotPasswordModal
  const handleForgotPassword = () => {
    setShowEmailSignInModal(false);
    setTimeout(() => {
      setShowForgotPasswordModal(true);
    }, 300);
  };

  // Handle when forgot password modal wants to go back to sign in
  const handleBackToSignIn = () => {
    setShowForgotPasswordModal(false);
    setTimeout(() => {
      setShowEmailSignInModal(true);
    }, 300);
  };

  // Handle when reset email is sent
  const handleResetSent = (email: string) => {
    console.log('Reset email sent to:', email);
    // You could show a success message or handle deep linking here
  };

  // Handle password reset with token (for deep link scenarios)
  const handlePasswordResetWithToken = (token: string) => {
    setResetToken(token);
    setShowResetPasswordModal(true);
  };

  // Handle successful password reset
  const handlePasswordResetSuccess = () => {
    setShowResetPasswordModal(false);
    setResetToken(undefined);
    Alert.alert('Success', 'Password updated successfully! You can now sign in with your new password.');
  };

  const handleChangePassword = () => {
    // For authenticated users who want to change their password
    // You could implement this to show the SimpleResetPasswordModal
    // or redirect to a settings page
    console.log('Change password pressed');
    setShowResetPasswordModal(true);
  };

  const handleHelpFeedback = () => {
    setShowHelpFeedbackModal(true);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      <ScrollView 
        style={tw`flex-1`}
        contentContainerStyle={tw`pb-8`}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={tw`px-6 pt-6 pb-8 bg-white`}>
          <Text style={[
            tw`text-3xl font-bold`,
            { color: '#1F2937' },
            Platform.OS === 'android' && { fontFamily: 'sans-serif-medium' }
          ]}>
            Profile
          </Text>
        </View>

        {/* Profile section */}
        <Animated.View
          style={[
            tw`px-6 pb-8`,
            {
              opacity: fadeAnimation,
              transform: [{ translateY: slideAnimation }],
            }
          ]}
        >
          {isAuthenticated && user ? (
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
              {/* User info */}
              <View style={tw`flex-row items-center mb-4`}>
                <View style={[
                  tw`w-16 h-16 rounded-2xl items-center justify-center mr-4`,
                  { backgroundColor: 'rgba(29, 249, 255, 0.08)' }
                ]}>
                  <Ionicons name="person" size={28} color={TURQUOISE} />
                </View>
                
                <View style={tw`flex-1`}>
                  <Text style={[
                    tw`text-lg font-semibold`,
                    { color: '#1F2937' }
                  ]}>
                    {user.email}
                  </Text>
                </View>
              </View>

              {/* Stats */}
              <View style={[
                tw`pt-4 border-t border-gray-100`,
              ]}>
                <View style={tw`flex-row items-center`}>
                  <View style={[tw`w-2 h-2 rounded-full mr-2`, { backgroundColor: TURQUOISE }]} />
                  <Text style={[tw`text-sm`, { color: '#6B7280' }]}>
                    {user.favoriteHotels.length} favorited hotel{user.favoriteHotels.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
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
                  Sign in to your account
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
          )}
        </Animated.View>

        {/* Menu Items - Only for authenticated users */}
        {isAuthenticated && (
          <Animated.View
            style={{
              opacity: fadeAnimation,
              transform: [{
                translateY: slideAnimation.interpolate({
                  inputRange: [0, 30],
                  outputRange: [0, 15],
                }),
              }],
            }}
          >

            <MenuItem
              icon="help-circle-outline"
              title="Help & Feedback"
              subtitle="Booking support and personal assistance"
              onPress={handleHelpFeedback}
            />
            
            <MenuItem
              icon="log-out-outline"
              title="Sign Out"
              subtitle="Sign out of your account"
              onPress={handleSignOut}
              isDestructive={true}
            />
          </Animated.View>
        )}

        {/* Bottom spacing */}
        <View style={tw`h-8`} />
      </ScrollView>

      {/* Help Feedback Modal */}
      <HelpFeedbackModal
        visible={showHelpFeedbackModal}
        onClose={() => setShowHelpFeedbackModal(false)}
      />

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
        onForgotPassword={handleForgotPassword} // Updated to use the proper handler
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        visible={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        onBackToSignIn={handleBackToSignIn}
        onResetSent={handleResetSent}
      />

    </SafeAreaView>
  );
};

export default ProfileScreen;