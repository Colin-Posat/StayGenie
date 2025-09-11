// HelpFeedbackModal.tsx — use Modal to guarantee full-window coverage
import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, Dimensions, StyleSheet,
  Linking, Alert, Modal, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const TURQUOISE = '#1df9ff';
const TURQUOISE_DARK = '#00d4e6';
const TURQUOISE_SUBTLE = '#f0feff';
const TURQUOISE_BORDER = '#b3f7ff';

interface HelpFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

const HelpFeedbackModal: React.FC<HelpFeedbackModalProps> = ({ visible, onClose }) => {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;

  const panelWidth = Math.min(screenWidth - 32, 700);
  const panelHeight = Math.min(Math.round(screenHeight * 0.45), 360);

  useEffect(() => {
    if (!visible) return;
    slideAnim.setValue(20); opacityAnim.setValue(0); scaleAnim.setValue(0.97);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 100, friction: 10 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
    ]).start();
  }, [visible]);

  const handleEmailPress = async (email: string) => {
    try {
      const url = `mailto:${email}`;
      (await Linking.canOpenURL(url)) ? Linking.openURL(url) :
        Alert.alert('Email App Not Available', `Please email us at: ${email}`);
    } catch { Alert.alert('Error', `Please email us at: ${email}`); }
  };

  const handlePhonePress = async (phone: string) => {
    try {
      const url = `tel:${phone}`;
      (await Linking.canOpenURL(url)) ? Linking.openURL(url) :
        Alert.alert('Phone App Not Available', `Please call us at: ${phone}`);
    } catch { Alert.alert('Error', `Please call us at: ${phone}`); }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"      // <- key to cover tab bar
      statusBarTranslucent={Platform.OS === 'android'} // consistent backdrop under status bar
      onRequestClose={onClose}
    >
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: opacityAnim }]} pointerEvents="auto">
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
          <View style={tw`flex-1 justify-center items-center px-4`}>
            <Animated.View style={{ transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
              <View style={[
                tw`bg-white rounded-2xl overflow-hidden`,
                {
                  width: panelWidth, height: panelHeight,
                  shadowColor: TURQUOISE, shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.15, shadowRadius: 20,
                }
              ]}>
                {/* Header */}
                <View style={tw`px-4 pt-4 pb-2 border-b border-gray-100`}>
                  <View style={tw`flex-row items-center justify-between`}>
                    <Text style={tw`text-lg font-bold text-gray-900`}>Help & Support</Text>
                    <TouchableOpacity
                      style={[tw`ml-3 w-8 h-8 rounded-full items-center justify-center`, { backgroundColor: TURQUOISE + '10' }]}
                      onPress={onClose}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close" size={16} color={TURQUOISE_DARK} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Content */}
                <View style={[tw`flex-1 px-4`, { justifyContent: 'center' }]}>
                  <View style={tw`mt-2`}>
                    <Row
                      icon="bed"
                      title="Booking Support"
                      subtitle="operations@nuitee.com"
                      onPress={() => handleEmailPress('operations@nuitee.com')}
                    />
                    <Row
                      icon="call"
                      title="Phone Support"
                      subtitle="(+1) 844-727-0478"
                      onPress={() => handlePhonePress('+18447270478')}
                    />
                    <Row
                      icon="phone-portrait"
                      title="App Support"
                      subtitle="staygenieapp@gmail.com"
                      onPress={() => handleEmailPress('staygenieapp@gmail.com')}
                    />
                  </View>
                </View>
              </View>
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const Row = ({ icon, title, subtitle, onPress }:{
  icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void;
}) => (
  <TouchableOpacity
    style={[
      tw`flex-row items-center py-3 px-4 rounded-xl mb-2`,
      { backgroundColor: TURQUOISE_SUBTLE, borderColor: TURQUOISE_BORDER, borderWidth: 1 },
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[tw`w-10 h-10 rounded-full items-center justify-center mr-3`, { backgroundColor: TURQUOISE + '15' }]}>
      <Ionicons name={icon} size={20} color={TURQUOISE_DARK} />
    </View>
    <View style={tw`flex-1`}>
      <Text style={tw`text-sm font-bold text-gray-900`}>{title}</Text>
      <Text style={[tw`text-xs`, { color: TURQUOISE_DARK }]}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
  </TouchableOpacity>
);

export default HelpFeedbackModal;
