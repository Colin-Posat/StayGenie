// components/TermsOfServiceScreen.tsx
import React from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Text } from '../../components/CustomText';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

const TURQUOISE = '#1df9ff';
const TURQUOISE_DARK = '#00d4e6';

interface TermsOfServiceScreenProps {
  onClose: () => void;
}

const TermsOfServiceScreen: React.FC<TermsOfServiceScreenProps> = ({ onClose }) => {
  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={[
        tw`flex-row items-center justify-between px-6 py-4 border-b border-gray-200`,
        { backgroundColor: 'white' }
      ]}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-2xl font-bold text-gray-900`}>
            Terms of Service
          </Text>
          <Text style={tw`text-sm text-gray-500 mt-1`}>
            Last updated: December 11, 2024
          </Text>
        </View>
        <TouchableOpacity
          style={[
            tw`w-10 h-10 rounded-full items-center justify-center ml-4`,
            { backgroundColor: '#F3F4F6' }
          ]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 py-6`}
        showsVerticalScrollIndicator={true}
      >
        <Section title="1. Acceptance of Terms">
          <Text style={tw`text-gray-700 leading-6`}>
            By accessing and using StayGenie ("the App"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these Terms of Service, please do not use this App.
          </Text>
        </Section>

        <Section title="2. Description of Service">
          <Text style={tw`text-gray-700 leading-6 mb-3`}>
            StayGenie is an AI-powered hotel search and booking platform that provides:
          </Text>
          <BulletPoint text="Natural language hotel search powered by artificial intelligence" />
          <BulletPoint text="Hotel recommendations and information aggregated from third-party sources" />
          <BulletPoint text="Affiliate links to booking platforms for hotel reservations" />
          <BulletPoint text="Personalized search history and favorites (for registered users)" />
        </Section>

        <Section title="3. User Accounts">
          <Text style={tw`text-gray-700 leading-6 mb-3`}>
            To access certain features, you may need to create an account. You agree to:
          </Text>
          <BulletPoint text="Provide accurate and complete information during registration" />
          <BulletPoint text="Maintain the security of your password and account" />
          <BulletPoint text="Accept responsibility for all activities under your account" />
          <BulletPoint text="Notify us immediately of any unauthorized use" />
        </Section>

        <Section title="4. Use of AI Services">
          <Text style={tw`text-gray-700 leading-6 mb-3`}>
            StayGenie uses AI technology (including OpenAI's GPT models) to process your search queries. By using our service, you acknowledge that:
          </Text>
          <BulletPoint text="Your search queries are processed by third-party AI services" />
          <BulletPoint text="AI responses are generated automatically and may not always be accurate" />
          <BulletPoint text="We do not guarantee the accuracy, completeness, or reliability of AI-generated content" />
          <BulletPoint text="You should verify important information independently" />
        </Section>

        <Section title="5. Third-Party Services and Affiliates">
          <Text style={tw`text-gray-700 leading-6 mb-3`}>
            StayGenie is not a hotel booking platform. We provide:
          </Text>
          <BulletPoint text="Links to third-party booking platforms (Booking.com, etc.)" />
          <BulletPoint text="Affiliate links through which we may earn commissions" />
          <BulletPoint text="Information aggregated from external sources" />
          <Text style={tw`text-gray-700 leading-6 mt-3`}>
            We are not responsible for the accuracy of information provided by third parties, the availability of hotels, pricing, or booking transactions. All bookings are subject to the terms and conditions of the respective booking platforms.
          </Text>
        </Section>

        <Section title="6. User Conduct">
          <Text style={tw`text-gray-700 leading-6 mb-3`}>
            You agree not to:
          </Text>
          <BulletPoint text="Use the App for any illegal or unauthorized purpose" />
          <BulletPoint text="Attempt to interfere with or disrupt the App's functionality" />
          <BulletPoint text="Use automated systems to access the App without permission" />
          <BulletPoint text="Violate any applicable laws or regulations" />
          <BulletPoint text="Impersonate any person or entity" />
        </Section>

        <Section title="7. Intellectual Property">
          <Text style={tw`text-gray-700 leading-6`}>
            The App and its original content, features, and functionality are owned by StayGenie and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
          </Text>
        </Section>

        <Section title="8. Disclaimer of Warranties">
          <Text style={tw`text-gray-700 leading-6 mb-3`}>
            THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT WARRANT THAT:
          </Text>
          <BulletPoint text="The App will be uninterrupted, timely, secure, or error-free" />
          <BulletPoint text="The results obtained from using the App will be accurate or reliable" />
          <BulletPoint text="The quality of any products, services, information obtained through the App will meet your expectations" />
          <BulletPoint text="AI-generated recommendations will be suitable for your needs" />
        </Section>

        <Section title="9. Limitation of Liability">
          <Text style={tw`text-gray-700 leading-6`}>
            To the maximum extent permitted by law, StayGenie shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or other intangibles, resulting from your use or inability to use the App.
          </Text>
        </Section>

        <Section title="10. Data Storage and Search History">
          <Text style={tw`text-gray-700 leading-6`}>
            We store your search queries and browsing history to improve your experience and our services. This data may be used to provide personalized recommendations and enhance our AI models. See our Privacy Policy for more details.
          </Text>
        </Section>

        <Section title="11. Changes to Terms">
          <Text style={tw`text-gray-700 leading-6`}>
            We reserve the right to modify these terms at any time. We will notify users of significant changes via the App or email. Your continued use of the App after such modifications constitutes acceptance of the updated terms.
          </Text>
        </Section>

        <Section title="12. Termination">
          <Text style={tw`text-gray-700 leading-6`}>
            We may terminate or suspend your account and access to the App immediately, without prior notice or liability, for any reason, including breach of these Terms.
          </Text>
        </Section>

        <Section title="13. Governing Law">
          <Text style={tw`text-gray-700 leading-6`}>
            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which StayGenie operates, without regard to its conflict of law provisions.
          </Text>
        </Section>

        <Section title="14. Contact Information">
          <Text style={tw`text-gray-700 leading-6`}>
            For questions about these Terms of Service, please contact us at:
          </Text>
          <Text style={[tw`text-gray-700 leading-6 mt-2`, { color: TURQUOISE_DARK }]}>
            support@staygenie.com
          </Text>
        </Section>

        {/* Bottom spacing */}
        <View style={tw`h-8`} />
      </ScrollView>

      {/* Accept Button */}
      <View style={[
        tw`px-6 py-4 border-t border-gray-200`,
        { backgroundColor: 'white' }
      ]}>
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
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={tw`text-white font-semibold text-base`}>
            I Understand
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Helper Components
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={tw`mb-6`}>
    <Text style={tw`text-lg font-bold text-gray-900 mb-3`}>
      {title}
    </Text>
    {children}
  </View>
);

const BulletPoint: React.FC<{ text: string }> = ({ text }) => (
  <View style={tw`flex-row mb-2`}>
    <Text style={tw`text-gray-700 mr-2`}>•</Text>
    <Text style={tw`text-gray-700 leading-6 flex-1`}>{text}</Text>
  </View>
);

export default TermsOfServiceScreen;