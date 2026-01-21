// components/Feedback/FeedbackSystem.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Linking,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import * as StoreReview from 'expo-store-review';

interface FeedbackSystemProps {
  visible: boolean;
  onClose: () => void;
  onFeedbackSubmitted?: (rating: number, feedback?: string) => void;
}

type FeedbackStage = 'initial' | 'feedback';

export const FeedbackSystem: React.FC<FeedbackSystemProps> = ({
  visible,
  onClose,
  onFeedbackSubmitted,
}) => {
  const [stage, setStage] = useState<FeedbackStage>('initial');
  const [isHappy, setIsHappy] = useState<boolean | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      setStage('initial');
      setIsHappy(null);
      setFeedbackText('');
      setIsSubmitting(false);
    }
  }, [visible]);

  const handleInitialResponse = async (happy: boolean) => {
    setIsHappy(happy);
    
    if (happy) {
      try {
        const isAvailable = await StoreReview.isAvailableAsync();
        
        if (isAvailable) {
          await StoreReview.requestReview();
          onFeedbackSubmitted?.(5, undefined);
          onClose();
        } else {
          const storeUrl = Platform.select({
            ios: 'https://apps.apple.com/app/id[YOUR_APP_ID]',
            android: 'https://play.google.com/store/apps/details?id=com.staygenie.app',
          });

          if (storeUrl) {
            const canOpen = await Linking.canOpenURL(storeUrl);
            if (canOpen) {
              await Linking.openURL(storeUrl);
              onFeedbackSubmitted?.(5, undefined);
              onClose();
            }
          } else {
            onClose();
          }
        }
      } catch (error) {
        console.error('Error requesting review:', error);
        onClose();
      }
    } else {
      setTimeout(() => setStage('feedback'), 300);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return;

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onFeedbackSubmitted?.(0, feedbackText);
    setIsSubmitting(false);
    onClose();
  };

  const renderInitialStage = () => (
    <View style={tw`items-center`}>
      <View style={[tw`w-16 h-16 rounded-full items-center justify-center mb-4`, { backgroundColor: '#E0F7FF' }]}>
        <Ionicons name="heart" size={32} color="#00D4E6" />
      </View>

      <Text style={{
        fontFamily: 'Merriweather-Bold',
        fontSize: 22,
        color: '#111827',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 28,
      }}>
        Are you enjoying{'\n'}StayGenie so far?
      </Text>

      <Text style={{
        fontFamily: 'Merriweather-Regular',
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 28,
      }}>
        Your honest feedback helps us improve
      </Text>

      <View style={tw`w-full gap-3`}>
        <TouchableOpacity
          style={[tw`w-full py-4 rounded-xl`, { backgroundColor: '#00D4E6' }]}
          onPress={() => handleInitialResponse(true)}
          activeOpacity={0.8}
        >
          <Text style={{
            fontFamily: 'Merriweather-Bold',
            fontSize: 16,
            color: '#ffffff',
            textAlign: 'center',
          }}>
            Yes, I'm enjoying it! 😊
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[tw`w-full py-4 rounded-xl border`, { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }]}
          onPress={() => handleInitialResponse(false)}
          activeOpacity={0.8}
        >
          <Text style={{
            fontFamily: 'Merriweather-Regular',
            fontSize: 14,
            color: '#6B7280',
            textAlign: 'center',
          }}>
            Not really...
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={tw`absolute top-0 right-0`}
        onPress={onClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={24} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );

  const renderFeedbackStage = () => (
    <View style={tw`items-center`}>
      <View style={[tw`w-12 h-12 rounded-full items-center justify-center mb-3`, { backgroundColor: '#FEF3C7' }]}>
        <Ionicons name="bulb" size={24} color="#F59E0B" />
      </View>

      <Text style={{
        fontFamily: 'Merriweather-Bold',
        fontSize: 18,
        color: '#111827',
        textAlign: 'center',
        marginBottom: 6,
      }}>
        Help Us Improve
      </Text>

      <Text style={{
        fontFamily: 'Merriweather-Regular',
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 18,
      }}>
        What can we do better?
      </Text>

      <View style={[
        tw`w-full rounded-xl border mb-3`,
        { 
          borderColor: '#E5E7EB', 
          backgroundColor: '#FFFFFF',
        }
      ]}>
        <TextInput
          style={{
            fontFamily: 'Merriweather-Regular',
            fontSize: 14,
            color: '#111827',
            padding: 12,
            height: 100,
            textAlignVertical: 'top',
          }}
          value={feedbackText}
          onChangeText={setFeedbackText}
          placeholder="Tell us what went wrong..."
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={500}
          autoFocus
        />
      </View>

      <View style={tw`w-full gap-2.5`}>
        <TouchableOpacity
          style={[
            tw`w-full py-3.5 rounded-xl`,
            { backgroundColor: feedbackText.trim() ? '#00D4E6' : '#E5E7EB' }
          ]}
          onPress={handleSubmitFeedback}
          disabled={!feedbackText.trim() || isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={{
            fontFamily: 'Merriweather-Bold',
            fontSize: 15,
            color: feedbackText.trim() ? '#ffffff' : '#9CA3AF',
            textAlign: 'center',
          }}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`w-full py-3 rounded-xl`}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={{
            fontFamily: 'Merriweather-Regular',
            fontSize: 13,
            color: '#9CA3AF',
            textAlign: 'center',
          }}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={stage === 'feedback' ? Keyboard.dismiss : onClose}>
          <Animated.View
            style={[
              tw`flex-1 justify-center items-center px-6`,
              {
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                opacity: fadeAnim,
              },
            ]}
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  tw`w-full bg-white rounded-2xl p-6`,
                  {
                    maxWidth: 400,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 20 },
                    shadowOpacity: 0.25,
                    shadowRadius: 25,
                    elevation: 20,
                    transform: [{ translateY }],
                  },
                ]}
              >
                {stage === 'initial' && renderInitialStage()}
                {stage === 'feedback' && renderFeedbackStage()}
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default FeedbackSystem;