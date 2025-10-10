// components/EmailSignInModal.tsx
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

interface EmailSignInModalProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToSignUp?: () => void;
  onForgotPassword?: () => void;
}

const EmailSignInModal: React.FC<EmailSignInModalProps> = ({ 
  visible, 
  onClose, 
  onSwitchToSignUp,
  onForgotPassword 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn } = useAuth();

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
    
    if (!password.trim()) {
      Alert.alert('Validation Error', 'Please enter your password');
      return false;
    }
    
    return true;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await signIn(email.trim(), password);
      console.log('✅ Email sign in successful');
      handleClose();
    } catch (error: any) {
      console.log('❌ Email sign in error:', error.message);
      Alert.alert('Sign In Failed', error.message || 'Failed to sign in. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (onForgotPassword) {
      onForgotPassword();
    } else {
      Alert.alert('Forgot Password', 'Password reset functionality will be implemented soon.');
    }
  };

  const handleSwitchToSignUp = () => {
    if (onSwitchToSignUp) {
      handleClose();
      setTimeout(() => onSwitchToSignUp(), 300);
    }
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
                Welcome Back
              </Text>
              <Text style={tw`text-sm text-gray-500 mt-1`}>
                Sign in to Your Account
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
              <View style={tw`mb-4`}>
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
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
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

              {/* Forgot Password */}
              <TouchableOpacity
                onPress={handleForgotPassword}
                activeOpacity={0.7}
                style={tw`self-end mb-6`}
                disabled={isLoading}
              >
                <Text style={[tw`text-sm font-medium`, { color: TURQUOISE_DARK }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
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
              onPress={handleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={tw`text-white font-semibold text-base ml-3`}>
                    Signing In...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="white" />
                  <Text style={tw`text-white font-semibold text-base ml-3`}>
                    Sign In
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Switch to Sign Up */}
            {onSwitchToSignUp && (
              <View style={tw`flex-row justify-center items-center`}>
                <Text style={tw`text-sm text-gray-500`}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity
                  onPress={handleSwitchToSignUp}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <Text style={[tw`text-sm font-medium`, { color: TURQUOISE_DARK }]}>
                    Sign Up
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

export default EmailSignInModal;