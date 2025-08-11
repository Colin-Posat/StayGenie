import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

// Consistent color constants
const TURQUOISE = '#1df9ff';
const TURQUOISE_LIGHT = '#5dfbff';
const TURQUOISE_DARK = '#00d4e6';
const BLACK = "#000000";

const { height } = Dimensions.get('window');

interface AuthWelcomeScreenProps {
  onGoogleSignIn: () => void;
  onEmailSignUp: () => void;
  onEmailSignIn: () => void;
  onSkip: () => void;
}

const AuthWelcomeScreen: React.FC<AuthWelcomeScreenProps> = ({
  onGoogleSignIn,
  onEmailSignUp,
  onEmailSignIn,
  onSkip
}) => {
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(30)).current;
  const logoAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
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
      ]),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={tw`flex-1 justify-center px-6`}>
        {/* Logo and Title */}
        <Animated.View
          style={[
            tw`items-center mb-12`,
            {
              opacity: logoAnimation,
              transform: [{
                scale: logoAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              }],
            }
          ]}
        >
          <View style={[
            tw`w-20 h-20 rounded-3xl items-center justify-center mb-6`,
            { backgroundColor: TURQUOISE }
          ]}>
            <Ionicons name="bed-outline" size={40} color="white" />
          </View>
          
          <Text style={tw`text-3xl font-bold text-gray-900 mb-2`}>
            Welcome to STAYGENIE
          </Text>
          
          <Text style={tw`text-center text-gray-600 text-base leading-6`}>
            Sign in to save your favorite hotels and get personalized recommendations
          </Text>
        </Animated.View>

        {/* Auth Options */}
        <Animated.View
          style={[
            tw``,
            {
              opacity: fadeAnimation,
              transform: [{ translateY: slideAnimation }],
            }
          ]}
        >
          {/* Google Sign In Button */}
          <TouchableOpacity
            style={[
              tw`p-4 rounded-2xl flex-row items-center justify-center mb-4 border`,
              { 
                backgroundColor: '#FFFFFF',
                borderColor: '#E5E7EB',
              }
            ]}
            onPress={onGoogleSignIn}
            activeOpacity={0.8}
          >
            <View style={tw`w-6 h-6 mr-3`}>
              {/* Google Icon - you'd replace this with actual Google logo */}
              <View style={[
                tw`w-6 h-6 rounded-full items-center justify-center`,
                { backgroundColor: '#4285F4' }
              ]}>
                <Text style={tw`text-white text-xs font-bold`}>G</Text>
              </View>
            </View>
            <Text style={tw`text-gray-900 font-semibold text-base`}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={tw`flex-row items-center my-6`}>
            <View style={tw`flex-1 h-px bg-gray-300`} />
            <Text style={tw`mx-4 text-gray-500 text-sm`}>or</Text>
            <View style={tw`flex-1 h-px bg-gray-300`} />
          </View>

          {/* Email Sign Up Button */}
          <TouchableOpacity
            style={[
              tw`p-4 rounded-2xl flex-row items-center justify-center mb-4`,
              { backgroundColor: TURQUOISE }
            ]}
            onPress={onEmailSignUp}
            activeOpacity={0.9}
          >
            <Ionicons name="mail-outline" size={20} color="white" />
            <Text style={tw`text-white font-semibold text-base ml-3`}>
              Sign up with Email
            </Text>
          </TouchableOpacity>

          {/* Sign In Link */}
          <View style={tw`flex-row justify-center mb-8`}>
            <Text style={tw`text-gray-600 text-sm`}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={onEmailSignIn} activeOpacity={0.8}>
              <Text style={[tw`text-sm font-semibold`, { color: TURQUOISE_DARK }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>

          {/* Skip Button */}
          <TouchableOpacity
            style={tw`p-4 rounded-2xl items-center justify-center`}
            onPress={onSkip}
            activeOpacity={0.8}
          >
            <Text style={tw`text-gray-500 font-medium text-base`}>
              Continue as Guest
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Terms Text */}
        <Animated.View
          style={[
            tw`mt-8`,
            { opacity: fadeAnimation }
          ]}
        >
          <Text style={tw`text-center text-xs text-gray-500 leading-4`}>
            By continuing, you agree to our{' '}
            <Text style={[tw`font-medium`, { color: TURQUOISE_DARK }]}>
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text style={[tw`font-medium`, { color: TURQUOISE_DARK }]}>
              Privacy Policy
            </Text>
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

export default AuthWelcomeScreen;