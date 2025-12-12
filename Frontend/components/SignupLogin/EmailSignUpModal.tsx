// components/EmailSignUpModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text as RNText,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from '../../components/CustomText'; 
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth } from '../../contexts/AuthContext';

// Consistent color constants
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const BLACK = "#000000";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface EmailSignUpModalProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToSignIn?: () => void;
}

const EmailSignUpModal: React.FC<EmailSignUpModalProps> = ({ 
  visible, 
  onClose, 
  onSwitchToSignIn 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const { signUp } = useAuth();

  // Center modal animation
  const scaleAnimation = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show modal with scale animation
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
      // Hide modal
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

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setIsLoading(false);
    setShowPassword(false);
  };

  const handleClose = () => {
    Keyboard.dismiss();
    resetForm();
    onClose();
  };

  const handleSwitchToSignIn = () => {
    if (onSwitchToSignIn) {
      handleClose();
      setTimeout(() => onSwitchToSignIn(), 300);
    }
  };

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long');
      return false;
    }
    
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await signUp(email.trim(), password);
      console.log('✅ Email sign up successful');
      handleClose();
    } catch (error: any) {
      console.log('❌ Email sign up error:', error.message);
      Alert.alert('Sign Up Failed', error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

 const TermsOverlay = () => {
    if (!showTerms) return null;

    return (
      <View style={[
        tw`absolute inset-0`,
        { 
          zIndex: 9999,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }
      ]}>
        {/* Overlay content */}
        <View style={tw`flex-1 justify-center items-center px-4`}>
          <View style={[
            tw`bg-white rounded-3xl w-full max-w-sm`,
            {
              maxHeight: SCREEN_HEIGHT * 0.8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 20,
            }
          ]}>
            {/* Header */}
            <View style={tw`flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200`}>
              <Text style={tw`text-xl font-bold text-gray-900`}>
                Terms & Privacy
              </Text>
              <TouchableOpacity
                style={[
                  tw`w-10 h-10 rounded-full items-center justify-center`,
                  { backgroundColor: '#F3F4F6' }
                ]}
                onPress={() => setShowTerms(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Scrollable content */}
            <ScrollView 
              style={tw`px-6 py-4`}
              showsVerticalScrollIndicator={true}
            >
              <Text style={tw`text-sm text-gray-700 leading-6`}>
                <Text style={tw`font-bold text-base`}>Terms of Service{'\n\n'}</Text>
                
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

                <Text style={tw`font-bold text-base mt-4`}>Privacy Policy{'\n\n'}</Text>
                
                <Text style={tw`text-xs text-gray-500`}>Last Updated: December 11, 2025{'\n\n'}</Text>

                <Text style={tw`font-bold`}>1. Information We Collect{'\n'}</Text>
                <Text style={tw`font-semibold`}>Account Information: </Text>
                Email address, password (encrypted), and profile preferences.{'\n'}
                <Text style={tw`font-semibold`}>Search Data: </Text>
                Hotel search queries, destinations, dates, preferences, and booking history.{'\n'}
                <Text style={tw`font-semibold`}>Usage Data: </Text>
                App interactions, features used, time spent, and navigation patterns.{'\n'}
                <Text style={tw`font-semibold`}>Device Information: </Text>
                Device type, operating system, unique device identifiers, and IP address.{'\n'}
                <Text style={tw`font-semibold`}>Location Data: </Text>
                Approximate location based on IP address (with your permission).{'\n\n'}
                
                <Text style={tw`font-bold`}>2. How We Use Your Information{'\n'}</Text>
                • Provide and improve our AI-powered search and booking services{'\n'}
                • Personalize recommendations based on your preferences{'\n'}
                • Train and enhance our AI models{'\n'}
                • Process and manage bookings{'\n'}
                • Send booking confirmations and important updates{'\n'}
                • Analyze usage patterns to improve user experience{'\n'}
                • Prevent fraud and ensure platform security{'\n'}
                • Comply with legal obligations{'\n\n'}
                
                <Text style={tw`font-bold`}>3. Information Sharing{'\n'}</Text>
                We do not sell your personal information. We may share data with:{'\n'}
                <Text style={tw`font-semibold`}>Hotel Partners: </Text>
                Necessary booking information to complete reservations.{'\n'}
                <Text style={tw`font-semibold`}>Service Providers: </Text>
                Third-party services for analytics, payment processing, and infrastructure (e.g., Firebase, cloud hosting).{'\n'}
                <Text style={tw`font-semibold`}>Affiliate Partners: </Text>
                Anonymized data for commission tracking.{'\n'}
                <Text style={tw`font-semibold`}>Legal Requirements: </Text>
                When required by law or to protect our rights.{'\n\n'}
                
                <Text style={tw`font-bold`}>4. AI and Machine Learning{'\n'}</Text>
                Your search queries and interactions help train our AI models. This data is anonymized and aggregated. You can opt out of AI training by contacting us, though this may limit personalization features.{'\n\n'}
                
                <Text style={tw`font-bold`}>5. Data Retention{'\n'}</Text>
                We retain your account information for as long as your account is active. Search history and usage data are retained for up to 2 years for AI training and service improvement. You can request deletion of your data at any time.{'\n\n'}
                
                <Text style={tw`font-bold`}>6. Your Rights{'\n'}</Text>
                • Access the personal data we hold about you{'\n'}
                • Request correction of inaccurate data{'\n'}
                • Request deletion of your account and data{'\n'}
                • Opt out of marketing communications{'\n'}
                • Export your data in a portable format{'\n'}
                • Withdraw consent for data processing{'\n\n'}
                
                <Text style={tw`font-bold`}>7. Security{'\n'}</Text>
                We implement industry-standard security measures including encryption, secure authentication, and regular security audits. However, no system is 100% secure, and we cannot guarantee absolute security.{'\n\n'}
                
                <Text style={tw`font-bold`}>8. Children's Privacy{'\n'}</Text>
                StayGenie is not intended for users under 18. We do not knowingly collect information from children. If we discover such data, we will delete it immediately.{'\n\n'}
                
                <Text style={tw`font-bold`}>9. Cookies and Tracking{'\n'}</Text>
                We use cookies and similar technologies to enhance user experience, remember preferences, and analyze app usage. You can manage cookie preferences in your device settings.{'\n\n'}
                
                <Text style={tw`font-bold`}>10. International Users{'\n'}</Text>
                Your information may be transferred to and processed in the United States. By using StayGenie, you consent to this transfer.{'\n\n'}
                
                <Text style={tw`font-bold`}>11. Changes to This Policy{'\n'}</Text>
                We may update this Privacy Policy periodically. Significant changes will be notified through the app or via email.{'\n\n'}
                
                <Text style={tw`font-bold`}>12. Contact Us{'\n'}</Text>
                For questions about these Terms or Privacy Policy, or to exercise your data rights, contact us at:{'\n'}
                Email: support@staygenie.com{'\n'}
                Response time: Within 48 hours{'\n\n'}
                
                <Text style={tw`text-xs text-gray-500 italic`}>
                  By using StayGenie, you acknowledge that you have read and understood these Terms of Service and Privacy Policy.
                </Text>
              </Text>
            </ScrollView>

            {/* Accept button */}
            <View style={tw`px-6 py-4 border-t border-gray-200`}>
              <TouchableOpacity
                style={[
                  tw`p-4 rounded-2xl items-center justify-center`,
                  { 
                    backgroundColor: TURQUOISE,
                    shadowColor: TURQUOISE,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }
                ]}
                onPress={() => setShowTerms(false)}
                activeOpacity={0.8}
              >
                <Text style={tw`text-white font-semibold text-base`}>
                  I Understand
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
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
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={tw`flex-1`} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Modal content container */}
      <View style={tw`flex-1 justify-center items-center px-4`}>
        <Animated.View
          style={[
            tw`bg-white rounded-3xl w-full max-w-sm`,
            {
              transform: [{ scale: scaleAnimation }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 20,
            }
          ]}
        >
          {/* Header */}
          <View style={tw`flex-row items-center justify-between px-6 pt-6 mb-4`}>
            <View style={tw`flex-1 pr-4`}>
              <Text style={tw`text-2xl font-bold text-gray-900`}>
                Create Account
              </Text>
              <Text style={tw`text-sm text-gray-500 mt-1`}>
                Join us to save your favorite hotels
              </Text>
            </View>
            <TouchableOpacity
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center`,
                { backgroundColor: '#F3F4F6' }
              ]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Form content */}
          <View style={tw`px-6 pb-6`}>
            {/* Form Fields */}
            <View style={tw`mb-6`}>
              {/* Email Input */}
              <View style={tw`mb-5`}>
                <Text style={tw`text-sm font-medium text-gray-700 mb-3`}>
                  Email Address
                </Text>
                <View style={[
                  tw`flex-row items-center border rounded-2xl px-4`,
                  { 
                    height: 56,
                    borderColor: email ? TURQUOISE_LIGHT : '#E5E7EB', 
                    backgroundColor: '#FAFAFA',
                    borderWidth: email ? 1.5 : 1,
                  }
                ]}>
                  <Ionicons 
                    name="mail-outline" 
                    size={20} 
                    color={email ? TURQUOISE_DARK : "#9CA3AF"} 
                  />
                  <TextInput
                    style={[
                      tw`flex-1 ml-3 text-base text-gray-900`,
                      {
                        lineHeight: Platform.OS === 'ios' ? 20 : 22,
                        includeFontPadding: false,
                        textAlignVertical: 'center',
                        paddingVertical: 0,
                      }
                    ]}
                    placeholder="Enter your email"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    editable={!isLoading}
                    selectionColor={TURQUOISE}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={tw`mb-6`}>
                <Text style={tw`text-sm font-medium text-gray-700 mb-3`}>
                  Password
                </Text>
                <View style={[
                  tw`flex-row items-center border rounded-2xl px-4`,
                  { 
                    height: 56,
                    borderColor: password ? TURQUOISE_LIGHT : '#E5E7EB', 
                    backgroundColor: '#FAFAFA',
                    borderWidth: password ? 1.5 : 1,
                  }
                ]}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color={password ? TURQUOISE_DARK : "#9CA3AF"} 
                  />
                  <TextInput
                    style={[
                      tw`flex-1 ml-3 text-base text-gray-900`,
                      {
                        lineHeight: Platform.OS === 'ios' ? 20 : 22,
                        includeFontPadding: false,
                        textAlignVertical: 'center',
                        paddingVertical: 0,
                      }
                    ]}
                    placeholder="Create a password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSignUp}
                    editable={!isLoading}
                    selectionColor={TURQUOISE}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                    style={tw`p-2 -m-1`}
                    disabled={isLoading}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={password ? TURQUOISE_DARK : "#9CA3AF"} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[
                tw`p-4 rounded-2xl flex-row items-center justify-center mb-6`,
                { 
                  backgroundColor: isLoading ? '#9CA3AF' : TURQUOISE,
                  opacity: isLoading ? 0.7 : 1,
                  shadowColor: TURQUOISE,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }
              ]}
              onPress={handleSignUp}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={tw`text-white font-semibold text-base ml-3`}>
                    Creating Account...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color="white" />
                  <Text style={tw`text-white font-semibold text-base ml-3`}>
                    Create Account
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Switch to Sign In */}
            {onSwitchToSignIn && (
              <View style={tw`flex-row justify-center items-center mb-4`}>
                <Text style={tw`text-sm text-gray-500`}>
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity
                  onPress={handleSwitchToSignIn}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <Text style={[tw`text-sm font-medium`, { color: TURQUOISE_DARK }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Terms and Privacy */}
            <Text style={tw`text-xs text-gray-500 text-center leading-4 px-2`}>
              By creating an account, you agree to our{' '}
              <Text 
                style={[tw``, { color: TURQUOISE_DARK }]}
                onPress={() => setShowTerms(true)}
              >
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text 
                style={[tw``, { color: TURQUOISE_DARK }]}
                onPress={() => setShowTerms(true)}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Terms Overlay */}
      <TermsOverlay />
    </Modal>
  );
};

export default EmailSignUpModal;