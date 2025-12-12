// components/PrivacyPolicyScreen.tsx
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

interface PrivacyPolicyScreenProps {
  onClose: () => void;
}

const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ onClose }) => {
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
            Privacy Policy
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
        <Section title="Introduction">
          <Text style={tw`text-gray-700 leading-6`}>
            StayGenie ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.
          </Text>
        </Section>

        <Section title="1. Information We Collect">
          <Subsection title="Personal Information">
            <Text style={tw`text-gray-700 leading-6 mb-2`}>
              When you create an account, we collect:
            </Text>
            <BulletPoint text="Email address" />
            <BulletPoint text="Password (encrypted)" />
            <BulletPoint text="Account creation date and authentication data" />
          </Subsection>

          <Subsection title="Search and Usage Data">
            <Text style={tw`text-gray-700 leading-6 mb-2`}>
              To provide and improve our AI-powered search service, we collect:
            </Text>
            <BulletPoint text="Search queries and natural language inputs" />
            <BulletPoint text="Hotels you view, favorite, or interact with" />
            <BulletPoint text="Search filters and preferences (location, dates, price range, etc.)" />
            <BulletPoint text="Time and date of searches" />
            <BulletPoint text="App usage patterns and navigation data" />
          </Subsection>

          <Subsection title="Device and Technical Information">
            <BulletPoint text="Device type, operating system, and version" />
            <BulletPoint text="IP address and general location data" />
            <BulletPoint text="App version and crash reports" />
            <BulletPoint text="Analytics data (via Firebase Analytics)" />
          </Subsection>

          <Subsection title="Favorites and Saved Data">
            <BulletPoint text="Hotels you save to your favorites" />
            <BulletPoint text="Your personalized hotel lists" />
            <BulletPoint text="User preferences and settings" />
          </Subsection>
        </Section>

        <Section title="2. How We Use Your Information">
          <Text style={tw`text-gray-700 leading-6 mb-3`}>
            We use your information for the following purposes:
          </Text>
          
          <Subsection title="Service Delivery">
            <BulletPoint text="Process your search queries using AI technology (OpenAI GPT)" />
            <BulletPoint text="Provide personalized hotel recommendations" />
            <BulletPoint text="Save your favorites and search history" />
            <BulletPoint text="Authenticate your account and maintain security" />
          </Subsection>

          <Subsection title="Service Improvement">
            <BulletPoint text="Analyze usage patterns to improve our AI algorithms" />
            <BulletPoint text="Train and refine our recommendation systems" />
            <BulletPoint text="Develop new features and enhance user experience" />
            <BulletPoint text="Debug and fix technical issues" />
          </Subsection>

          <Subsection title="Communication">
            <BulletPoint text="Send service-related notifications" />
            <BulletPoint text="Respond to your inquiries and support requests" />
            <BulletPoint text="Notify you of updates or changes to our services" />
          </Subsection>
        </Section>

        <Section title="3. Third-Party AI Processing (OpenAI/GPT)">
          <HighlightBox>
            <Text style={tw`text-gray-800 leading-6 font-medium mb-2`}>
              Important: AI Data Processing
            </Text>
            <Text style={tw`text-gray-700 leading-6`}>
              Your search queries are processed by OpenAI's GPT models to provide intelligent search results. This means:
            </Text>
          </HighlightBox>
          
          <BulletPoint text="Your natural language searches are sent to OpenAI's servers" />
          <BulletPoint text="OpenAI may process this data according to their own privacy policy" />
          <BulletPoint text="We do not share personally identifiable information with AI queries" />
          <BulletPoint text="OpenAI has committed not to use API data to train their models (as of their current policy)" />
          
          <Text style={tw`text-gray-700 leading-6 mt-3`}>
            For more information, please review OpenAI's privacy policy at openai.com/privacy.
          </Text>
        </Section>

        <Section title="4. Data Sharing and Disclosure">
          <Text style={tw`text-gray-700 leading-6 mb-3`}>
            We may share your information with:
          </Text>
          
          <Subsection title="Service Providers">
            <BulletPoint text="OpenAI (for AI search processing)" />
            <BulletPoint text="Firebase (for authentication and analytics)" />
            <BulletPoint text="Cloud hosting providers (for data storage)" />
            <BulletPoint text="Analytics services to improve our app" />
          </Subsection>

          <Subsection title="Affiliate Partners">
            <BulletPoint text="When you click affiliate links, your interaction may be tracked by booking platforms (Booking.com, AWIN, etc.)" />
            <BulletPoint text="We do not share your personal information with these partners" />
            <BulletPoint text="Their privacy policies govern data collected through their platforms" />
          </Subsection>

          <Subsection title="Legal Requirements">
            <Text style={tw`text-gray-700 leading-6`}>
              We may disclose your information if required by law, legal process, or governmental request, or to protect our rights, property, or safety.
            </Text>
          </Subsection>
        </Section>

        <Section title="5. Data Storage and Retention">
          <BulletPoint text="Your data is stored on secure cloud servers (Firebase/Google Cloud)" />
          <BulletPoint text="Search history is retained to improve personalization and AI performance" />
          <BulletPoint text="Account data is retained until you delete your account" />
          <BulletPoint text="We implement industry-standard security measures to protect your data" />
          <BulletPoint text="Data backups may be retained for disaster recovery purposes" />
        </Section>

        <Section title="6. Your Rights and Choices">
          <Subsection title="Access and Control">
            <BulletPoint text="View your search history within the app" />
            <BulletPoint text="Delete individual searches or favorites" />
            <BulletPoint text="Update your email address and account settings" />
            <BulletPoint text="Delete your account and associated data" />
          </Subsection>

          <Subsection title="Opt-Out Options">
            <BulletPoint text="Disable analytics tracking in app settings (if available)" />
            <BulletPoint text="Stop using the app to prevent further data collection" />
            <BulletPoint text="Request deletion of your data by contacting support" />
          </Subsection>
        </Section>

        <Section title="7. Data Security">
          <Text style={tw`text-gray-700 leading-6 mb-3`}>
            We implement appropriate security measures including:
          </Text>
          <BulletPoint text="Encrypted password storage" />
          <BulletPoint text="Secure HTTPS connections for all data transmission" />
          <BulletPoint text="Firebase Authentication security protocols" />
          <BulletPoint text="Regular security audits and updates" />
          
          <Text style={tw`text-gray-700 leading-6 mt-3`}>
            However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.
          </Text>
        </Section>

        <Section title="8. Children's Privacy">
          <Text style={tw`text-gray-700 leading-6`}>
            Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
          </Text>
        </Section>

        <Section title="9. International Data Transfers">
          <Text style={tw`text-gray-700 leading-6`}>
            Your information may be transferred to and processed in countries other than your own. By using our service, you consent to the transfer of information to countries outside your country of residence, which may have different data protection rules.
          </Text>
        </Section>

        <Section title="10. Changes to This Privacy Policy">
          <Text style={tw`text-gray-700 leading-6`}>
            We may update this Privacy Policy periodically. We will notify you of significant changes via email or in-app notification. Your continued use after such modifications constitutes acceptance of the updated policy.
          </Text>
        </Section>

        <Section title="11. Do Not Track">
          <Text style={tw`text-gray-700 leading-6`}>
            We do not currently respond to "Do Not Track" signals from browsers, as there is no standard for how such signals should be interpreted.
          </Text>
        </Section>

        <Section title="12. Contact Us">
          <Text style={tw`text-gray-700 leading-6 mb-2`}>
            If you have questions about this Privacy Policy or want to exercise your rights, contact us at:
          </Text>
          <Text style={[tw`text-gray-700 leading-6`, { color: TURQUOISE_DARK }]}>
            privacy@staygenie.com
          </Text>
          <Text style={tw`text-gray-700 leading-6 mt-3`}>
            For data deletion requests or privacy concerns, please include "Privacy Request" in your email subject line.
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

const Subsection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={tw`mb-4`}>
    <Text style={tw`text-base font-semibold text-gray-800 mb-2`}>
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

const HighlightBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={[
    tw`p-4 rounded-xl mb-4`,
    { backgroundColor: '#E0F9FA', borderLeftWidth: 3, borderLeftColor: TURQUOISE_DARK }
  ]}>
    {children}
  </View>
);

export default PrivacyPolicyScreen;