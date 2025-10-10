// components/ForgotPasswordModal.tsx - Functional with Firebase Auth
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
} from 'react-native';
import { Text } from '../../components/CustomText'; 
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig'; // Adjust path as needed

// Consistent color constants
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const BLACK = "#000000";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onBackToSignIn?: () => void;
  onResetSent?: (email: string) => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ 
  visible, 
  onClose, 
  onBackToSignIn,
  onResetSent 
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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
    setIsLoading(false);
    setEmailSent(false);
  };

  const handleClose = () => {
    Keyboard.dismiss();
    resetForm();
    onClose();
  };

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const handleSendResetEmail = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Send password reset email using Firebase Auth
      await sendPasswordResetEmail(auth, email.trim());
      
      console.log('✅ Password reset email sent to:', email.trim());
      setEmailSent(true);
      
      if (onResetSent) {
        onResetSent(email.trim());
      }
    } catch (error: any) {
      console.log('❌ Password reset error:', error.code, error.message);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection and try again.';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      Alert.alert('Reset Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    if (onBackToSignIn) {
      handleClose();
      setTimeout(() => onBackToSignIn(), 300);
    }
  };

  const handleTryAgain = () => {
    setEmailSent(false);
    // Keep the email so user doesn't have to retype it
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
                {emailSent ? 'Check Your Email' : 'Reset Password'}
              </Text>
              <Text style={tw`text-sm text-gray-500 mt-1`}>
                {emailSent 
                  ? 'We\'ve sent you a reset link' 
                  : 'Enter your email to reset your password'
                }
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
            {!emailSent ? (
              // Reset form
              <>
                {/* Email Input */}
                <View style={tw`mb-6`}>
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
                      returnKeyType="send"
                      onSubmitEditing={handleSendResetEmail}
                      editable={!isLoading}
                      selectionColor={TURQUOISE}
                    />
                  </View>
                </View>

                {/* Send Reset Email Button */}
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
                  onPress={handleSendResetEmail}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <>
                      <ActivityIndicator size="small" color="white" />
                      <Text style={tw`text-white font-semibold text-base ml-3`}>
                        Sending...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="paper-plane-outline" size={20} color="white" />
                      <Text style={tw`text-white font-semibold text-base ml-3`}>
                        Send Reset Link
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              // Email sent confirmation
              <>
                {/* Success Icon */}
                <View style={tw`items-center mb-6`}>
                  <View style={[
                    tw`w-20 h-20 rounded-full items-center justify-center mb-4`,
                    { backgroundColor: `${TURQUOISE}20` }
                  ]}>
                    <Ionicons name="checkmark-circle" size={40} color={TURQUOISE} />
                  </View>
                  <Text style={tw`text-center text-gray-600 text-base leading-6`}>
                    We've sent a password reset link to
                  </Text>
                  <Text style={[tw`text-center font-semibold text-base mt-1`, { color: TURQUOISE_DARK }]}>
                    {email}
                  </Text>
                </View>

                {/* Instructions */}
                <View style={[tw`p-4 rounded-2xl mb-6`, { backgroundColor: '#F9FAFB' }]}>
                  <Text style={tw`text-sm text-gray-600 text-center leading-5`}>
                    Click the link in the email to reset your password. 
                    If you don't see it, check your spam folder.
                  </Text>
                </View>

                {/* Resend Button */}
                <TouchableOpacity
                  style={[
                    tw`p-4 rounded-2xl flex-row items-center justify-center mb-4`,
                    { 
                      backgroundColor: TURQUOISE,
                      shadowColor: TURQUOISE,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8,
                    }
                  ]}
                  onPress={handleTryAgain}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={20} color="white" />
                  <Text style={tw`text-white font-semibold text-base ml-3`}>
                    Send Again
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Back to Sign In */}
            {onBackToSignIn && (
              <View style={tw`flex-row justify-center items-center`}>
                <Text style={tw`text-sm text-gray-500`}>
                  Remember your password?{' '}
                </Text>
                <TouchableOpacity
                  onPress={handleBackToSignIn}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <Text style={[tw`text-sm font-medium`, { color: TURQUOISE_DARK }]}>
                    Back to Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default ForgotPasswordModal;