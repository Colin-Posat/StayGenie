// ProfileScreen.tsx - Updated with TOS/Privacy Policy viewer
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Animated,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { Text } from '../components/CustomText'; 
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth } from '../contexts/AuthContext';
import EmailSignUpModal from '../components/SignupLogin/EmailSignUpModal';
import EmailSignInModal from '../components/SignupLogin/EmailSignInModal';
import ForgotPasswordModal from '../components/SignupLogin/ForgotPasswordModal';
import HelpFeedbackModal from '../components/Profile/HelpFeedbackModal';
import { Svg, Path } from 'react-native-svg';

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
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetToken, setResetToken] = useState<string | undefined>(undefined);
  const [showHelpFeedbackModal, setShowHelpFeedbackModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);

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

  const handleForgotPassword = () => {
    setShowEmailSignInModal(false);
    setTimeout(() => {
      setShowForgotPasswordModal(true);
    }, 300);
  };

  const handleBackToSignIn = () => {
    setShowForgotPasswordModal(false);
    setTimeout(() => {
      setShowEmailSignInModal(true);
    }, 300);
  };

  const handleResetSent = (email: string) => {
    console.log('Reset email sent to:', email);
  };

  const handlePasswordResetWithToken = (token: string) => {
    setResetToken(token);
    setShowResetPasswordModal(true);
  };

  const handlePasswordResetSuccess = () => {
    setShowResetPasswordModal(false);
    setResetToken(undefined);
    Alert.alert('Success', 'Password updated successfully! You can now sign in with your new password.');
  };

  const handleChangePassword = () => {
    console.log('Change password pressed');
    setShowResetPasswordModal(true);
  };

  const handleHelpFeedback = () => {
    setShowHelpFeedbackModal(true);
  };

  const handleLegal = () => {
    setShowLegalModal(true);
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
              tw`p-5 rounded-2xl`,
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
              <View style={tw`flex-row items-center mb-4`}>
                <View style={[
                  tw`w-12 h-12 rounded-xl items-center justify-center mr-3`,
                  { backgroundColor: 'rgba(29, 249, 255, 0.08)' }
                ]}>
                  <Ionicons name="person-outline" size={22} color={TURQUOISE} />
                </View>

                <View style={tw`flex-1`}>
                  <Text style={[
                    tw`text-lg font-bold mb-0.5`,
                    { color: '#1F2937' }
                  ]}>
                    Sign in to Your Account
                  </Text>
                  <Text style={[
                    tw`text-sm`,
                    { color: '#6B7280' }
                  ]}>
                    Save favorites and get recommendations
                  </Text>
                </View>
              </View>

              {/* Buttons row */}
              <View style={tw`flex-row gap-2`}>
                {/* Sign Up with Email Button */}
                <TouchableOpacity
                  style={[
                    tw`flex-1 px-3 py-3 rounded-xl flex-row items-center justify-center bg-white border border-gray-200`,
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
                    tw`w-5 h-5 rounded-full items-center justify-center mr-2`,
                    { backgroundColor: 'rgba(29, 249, 255, 0.15)' }
                  ]}>
                    <Ionicons
                      name="mail-outline"
                      size={12}
                      color={TURQUOISE_DARK}
                    />
                  </View>
                  <Text style={tw`text-sm font-medium text-gray-800`}>
                    Sign Up
                  </Text>
                </TouchableOpacity>

                {/* Sign Up with Google Button */}
                <TouchableOpacity
                  style={[
                    tw`flex-1 px-3 py-3 rounded-xl flex-row items-center justify-center bg-white border border-gray-200`,
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
                    tw`w-5 h-5 rounded-full items-center justify-center mr-2`,
                    { backgroundColor: 'rgba(66, 133, 244, 0.15)' }
                  ]}>
                    <Ionicons
                      name="logo-google"
                      size={12}
                      color="#4285F4"
                    />
                  </View>
                  <Text style={tw`text-sm font-medium text-gray-800`}>
                    Google
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Already have account link */}
              <TouchableOpacity
                style={tw`mt-3 items-center`}
                onPress={() => setShowEmailSignInModal(true)}
                activeOpacity={0.8}
              >
                <Text style={[tw`text-sm font-medium`, { color: TURQUOISE_DARK }]}>
                  Already have an account? Sign In
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Menu Items - Available to everyone */}
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
          {/* Help & Feedback */}
          <MenuItem
            icon="help-circle-outline"
            title="Help & Feedback"
            subtitle="Booking support and personal assistance"
            onPress={handleHelpFeedback}
          />

          {/* Terms & Privacy */}
          <MenuItem
            icon="document-text-outline"
            title="Terms & Privacy"
            subtitle="View our legal policies"
            onPress={handleLegal}
          />
          
          {/* Sign Out - Only for authenticated users */}
          {isAuthenticated && (
            <MenuItem
              icon="log-out-outline"
              title="Sign Out"
              subtitle="Sign out of your account"
              onPress={handleSignOut}
              isDestructive={true}
            />
          )}
        </Animated.View>

        {/* Bottom spacing */}
        <View style={tw`h-8`} />
      </ScrollView>

      {/* Help Feedback Modal */}
      <HelpFeedbackModal
        visible={showHelpFeedbackModal}
        onClose={() => setShowHelpFeedbackModal(false)}
      />

      {/* Legal Modal */}
      <LegalModal
        visible={showLegalModal}
        onClose={() => setShowLegalModal(false)}
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
        onForgotPassword={handleForgotPassword}
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

// Legal Modal Component with Terms & Privacy combined
const LegalModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const scaleAnimation = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnimation, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="rgba(0, 0, 0, 0.5)" barStyle="light-content" />
      
      {/* Background overlay */}
      <Animated.View
        style={[
          tw`absolute inset-0`,
          {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            opacity: backgroundOpacity,
          }
        ]}
      >
        <TouchableOpacity 
          style={tw`flex-1`}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Modal content - Smaller and centered */}
      <View style={tw`flex-1 justify-center items-center px-6`}>
        <Animated.View
          style={[
            tw`bg-white rounded-3xl w-full`,
            {
              maxWidth: 400,
              maxHeight: '60%',
              transform: [{ scale: scaleAnimation }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 20,
            }
          ]}
        >
          {/* Header - Compact */}
          <View style={tw`px-5 pt-5 pb-3 border-b border-gray-200`}>
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <Text style={tw`text-lg font-bold text-gray-900`}>
                Legal
              </Text>
              <TouchableOpacity
                style={[
                  tw`w-8 h-8 rounded-full items-center justify-center`,
                  { backgroundColor: '#F3F4F6' }
                ]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Tabs - Compact */}
            <View style={tw`flex-row`}>
              <TouchableOpacity
                style={[
                  tw`flex-1 py-2 items-center border-b-2`,
                  {
                    borderBottomColor: activeTab === 'terms' ? TURQUOISE : 'transparent'
                  }
                ]}
                onPress={() => setActiveTab('terms')}
                activeOpacity={0.7}
              >
                <Text style={[
                  tw`text-xs font-semibold`,
                  { color: activeTab === 'terms' ? TURQUOISE_DARK : '#9CA3AF' }
                ]}>
                  Terms
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  tw`flex-1 py-2 items-center border-b-2`,
                  {
                    borderBottomColor: activeTab === 'privacy' ? TURQUOISE : 'transparent'
                  }
                ]}
                onPress={() => setActiveTab('privacy')}
                activeOpacity={0.7}
              >
                <Text style={[
                  tw`text-xs font-semibold`,
                  { color: activeTab === 'privacy' ? TURQUOISE_DARK : '#9CA3AF' }
                ]}>
                  Privacy
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView 
            style={tw`px-5 py-3`}
            showsVerticalScrollIndicator={true}
          >
            {activeTab === 'terms' ? (
              <TermsContent />
            ) : (
              <PrivacyContent />
            )}
          </ScrollView>

          {/* Footer - Compact */}
          <View style={tw`px-5 py-3 border-t border-gray-200`}>
            <TouchableOpacity
              style={[
                tw`p-3 rounded-2xl items-center justify-center`,
                { 
                  backgroundColor: TURQUOISE,
                  shadowColor: TURQUOISE,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={tw`text-white font-semibold text-sm`}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Terms Content Component
const TermsContent = () => (
  <Text style={tw`text-sm text-gray-700 leading-6`}>
    <Text style={tw`text-xs text-gray-500`}>Last Updated: December 11, 2025{'\n\n'}</Text>

    <Text style={tw`font-bold`}>1. Acceptance of Terms{'\n'}</Text>
    By creating an account and using StayGenie, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.{'\n\n'}
    
    <Text style={tw`font-bold`}>2. Service Description{'\n'}</Text>
    StayGenie is an AI-powered hotel search and booking platform that uses natural language processing to help you find and book accommodations. We aggregate hotel information from third-party providers and facilitate bookings through affiliate partnerships.{'\n\n'}
    
    <Text style={tw`font-bold`}>3. User Accounts{'\n'}</Text>
    You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate, current, and complete information during registration and keep your account information updated.{'\n\n'}
    
    <Text style={tw`font-bold`}>4. Bookings and Payments{'\n'}</Text>
    All hotel bookings are subject to availability and confirmation by the hotel or booking provider. StayGenie acts as an intermediary and is not responsible for hotel services, policies, or cancellations. Payment processing is handled by third-party providers. Cancellation and refund policies are determined by the individual hotels and booking platforms.{'\n\n'}
    
    <Text style={tw`font-bold`}>5. AI-Generated Content{'\n'}</Text>
    StayGenie uses artificial intelligence to provide search results, recommendations, and conversational assistance. While we strive for accuracy, AI-generated content may contain errors or inaccuracies. Always verify critical information before making booking decisions.{'\n\n'}
    
    <Text style={tw`font-bold`}>6. User Content and Searches{'\n'}</Text>
    By using our service, you grant us the right to collect, store, and analyze your search queries, preferences, and interactions to improve our AI models and provide personalized recommendations. You retain ownership of your personal information.{'\n\n'}
    
    <Text style={tw`font-bold`}>7. Prohibited Uses{'\n'}</Text>
    You may not use StayGenie to: (a) violate any laws or regulations; (b) infringe on intellectual property rights; (c) transmit malicious code or spam; (d) attempt to gain unauthorized access to our systems; or (e) interfere with other users' use of the service.{'\n\n'}
    
    <Text style={tw`font-bold`}>8. Limitation of Liability{'\n'}</Text>
    StayGenie is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, special, or consequential damages arising from your use of the service, including but not limited to booking errors, hotel service issues, or travel disruptions.{'\n\n'}
    
    <Text style={tw`font-bold`}>9. Affiliate Relationships{'\n'}</Text>
    StayGenie participates in affiliate programs and may earn commissions from hotel bookings made through our platform. This does not affect the price you pay or our commitment to providing unbiased recommendations.{'\n\n'}
    
    <Text style={tw`font-bold`}>10. Modifications to Service{'\n'}</Text>
    We reserve the right to modify, suspend, or discontinue any aspect of StayGenie at any time without prior notice.{'\n\n'}
    
    <Text style={tw`font-bold`}>11. Governing Law{'\n'}</Text>
    These terms are governed by the laws of the United States and the State of California, without regard to conflict of law principles.{'\n\n'}
    
    <Text style={tw`font-bold`}>12. Contact Us{'\n'}</Text>
    For questions about these Terms, contact us at:{'\n'}
    Email: support@staygenie.com{'\n'}
    Response time: Within 48 hours
  </Text>
);

// Privacy Content Component
const PrivacyContent = () => (
  <Text style={tw`text-sm text-gray-700 leading-6`}>
    <Text style={tw`text-xs text-gray-500`}>Last Updated: December 11, 2025{'\n\n'}</Text>

    <Text style={tw`font-bold`}>Introduction{'\n'}</Text>
    StayGenie ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered hotel search and booking application.{'\n\n'}

    <Text style={tw`font-bold`}>1. Information We Collect{'\n\n'}</Text>
    
    <Text style={tw`font-semibold`}>Account Information:{'\n'}</Text>
    Email address, password (encrypted), display name, and profile preferences.{'\n\n'}
    
    <Text style={tw`font-semibold`}>Search and Booking Data:{'\n'}</Text>
    Hotel search queries, destinations, dates, preferences, saved hotels, booking history, and price alerts.{'\n\n'}
    
    <Text style={tw`font-semibold`}>AI Interaction Data:{'\n'}</Text>
    Conversational queries, natural language inputs, feedback, and personalization preferences.{'\n\n'}
    
    <Text style={tw`font-semibold`}>Usage and Analytics:{'\n'}</Text>
    App interactions, navigation patterns, features used, time spent, error logs, and performance metrics.{'\n\n'}
    
    <Text style={tw`font-semibold`}>Device Information:{'\n'}</Text>
    Device type, OS, unique identifiers, IP address, and network connection type.{'\n\n'}

    <Text style={tw`font-bold`}>2. How We Use Your Information{'\n\n'}</Text>
    • Provide hotel search and booking functionality{'\n'}
    • Train and improve our AI models{'\n'}
    • Generate personalized recommendations{'\n'}
    • Process and manage reservations{'\n'}
    • Analyze usage patterns{'\n'}
    • Prevent fraud and ensure security{'\n'}
    • Comply with legal obligations{'\n\n'}

    <Text style={tw`font-bold`}>3. Information Sharing{'\n\n'}</Text>
    
    <Text style={tw`font-semibold`}>We do not sell your personal information.{'\n\n'}</Text>
    
    We share data with:{'\n'}
    • Hotel and booking partners (necessary booking info){'\n'}
    • Service providers (Firebase, analytics, payment processors){'\n'}
    • Affiliate partners (anonymized data for commissions){'\n'}
    • Legal authorities (when required by law){'\n\n'}

    <Text style={tw`font-bold`}>4. AI and Machine Learning{'\n\n'}</Text>
    Your search queries and interactions help improve our AI models. Data is anonymized and aggregated. You can opt out of AI training by contacting us, though this may limit personalization.{'\n\n'}

    <Text style={tw`font-bold`}>5. Data Retention{'\n\n'}</Text>
    Account information is retained while your account is active. Search history and usage data are kept for up to 2 years for analytics and AI training. You can request deletion at any time.{'\n\n'}

    <Text style={tw`font-bold`}>6. Your Rights{'\n\n'}</Text>
    • Access your personal data{'\n'}
    • Request correction of inaccurate data{'\n'}
    • Request account and data deletion{'\n'}
    • Opt out of marketing communications{'\n'}
    • Export your data in portable format{'\n'}
    • Withdraw consent for processing{'\n\n'}

    <Text style={tw`font-bold`}>7. Security{'\n\n'}</Text>
    We implement encryption (TLS/SSL), secure authentication, regular security audits, and access controls. However, no system is 100% secure.{'\n\n'}

    <Text style={tw`font-bold`}>8. Children's Privacy{'\n\n'}</Text>
    StayGenie is not for users under 18. We don't knowingly collect children's data and will delete it if discovered.{'\n\n'}

    <Text style={tw`font-bold`}>9. Cookies and Tracking{'\n\n'}</Text>
    We use cookies for authentication, preferences, analytics, and performance. Manage preferences in device settings.{'\n\n'}

    <Text style={tw`font-bold`}>10. International Transfers{'\n\n'}</Text>
    Your information may be processed in the United States and other countries. By using StayGenie, you consent to these transfers.{'\n\n'}

    <Text style={tw`font-bold`}>11. Changes to Policy{'\n\n'}</Text>
    We may update this policy periodically. Significant changes will be notified through the app or email.{'\n\n'}

    <Text style={tw`font-bold`}>12. Contact Us{'\n\n'}</Text>
    Email: privacy@staygenie.com{'\n'}
    Support: support@staygenie.com{'\n'}
    DPO: dpo@staygenie.com{'\n'}
    Response time: Within 48 hours
  </Text>
);

export default ProfileScreen;