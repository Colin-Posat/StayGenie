// BookingDisclaimerModal.tsx (No expo-blur version)
import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const TURQUOISE_DARK = '#00d4e6';

interface BookingDisclaimerModalProps {
  visible: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

const BookingDisclaimerModal: React.FC<BookingDisclaimerModalProps> = ({
  visible,
  onContinue,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <TouchableWithoutFeedback>
            <View style={tw`flex-1 justify-center items-center px-6`}>
              <View
                style={[
                  tw`bg-white rounded-3xl p-6 w-full max-w-sm`,
                  {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.15,
                    shadowRadius: 16,
                    elevation: 12,
                  },
                ]}
              >
                {/* Icon */}
                <View style={tw`items-center mb-4`}>
                  <View
                    style={[
                      tw`w-14 h-14 rounded-full items-center justify-center`,
                      { backgroundColor: 'rgba(29, 249, 255, 0.15)' },
                    ]}
                  >
                    <Ionicons name="information-circle" size={32} color={TURQUOISE_DARK} />
                  </View>
                </View>

                {/* Title */}
                <Text
                  style={[
                    tw`text-xl text-center text-gray-900 mb-3`,
                    { fontFamily: 'Merriweather-Bold' },
                  ]}
                >
                  Booking is completed separately
                </Text>

                {/* Body */}
                <Text
                  style={[
                    tw`text-sm text-center text-gray-600 mb-6 leading-5`,
                    { fontFamily: 'Merriweather-Regular' },
                  ]}
                >
                  You'll finish your booking on StayGenie's booking platform.{'\n\n'}
                  Accounts created in the StayGenie app aren't connected to bookings, so you may be asked to enter details again.
                </Text>

                {/* Buttons */}
                <View style={tw`gap-3`}>
                  {/* Continue Button */}
                  <TouchableOpacity
                    onPress={onContinue}
                    activeOpacity={0.8}
                    style={[
                      tw`py-3.5 rounded-xl items-center`,
                      { backgroundColor: TURQUOISE_DARK },
                    ]}
                  >
                    <Text
                      style={[
                        tw`text-white text-base`,
                        { fontFamily: 'Merriweather-Bold' },
                      ]}
                    >
                      Continue to booking
                    </Text>
                  </TouchableOpacity>

                  {/* Cancel Button */}
                  <TouchableOpacity
                    onPress={onCancel}
                    activeOpacity={0.8}
                    style={[
                      tw`py-3.5 rounded-xl items-center border border-gray-300`,
                      { backgroundColor: 'white' },
                    ]}
                  >
                    <Text
                      style={[
                        tw`text-gray-700 text-base`,
                        { fontFamily: 'Merriweather-Regular' },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default BookingDisclaimerModal;