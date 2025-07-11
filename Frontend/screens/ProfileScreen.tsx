// ProfileScreen.tsx - Matches app's sleek design language
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Animated,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

// Profile avatar component with floating animation
const ProfileAvatar: React.FC<{ size?: number }> = ({ size = 80 }) => {
  const floatAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnimation, {
          toValue: -4,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        tw`relative`,
        {
          transform: [{ translateY: floatAnimation }],
        }
      ]}
    >
      <View style={[
        tw`bg-gradient-to-br from-blue-400 to-purple-500 rounded-3xl items-center justify-center shadow-lg`,
        { 
          width: size, 
          height: size,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 10,
        }
      ]}>
        <Text style={tw`text-white font-bold text-2xl`}>
          JD
        </Text>
      </View>
      
      {/* Online status indicator */}
      <View style={[
        tw`absolute bg-green-400 rounded-full border-3 border-white`,
        {
          width: size * 0.25,
          height: size * 0.25,
          right: size * 0.05,
          bottom: size * 0.05,
        }
      ]} />
    </Animated.View>
  );
};

// Enhanced section header component
const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <View style={tw`mb-4`}>
    <Text style={tw`text-lg font-bold text-black mb-1`}>
      {title}
    </Text>
    {subtitle && (
      <Text style={tw`text-sm text-gray-500`}>
        {subtitle}
      </Text>
    )}
  </View>
);

// Menu item component matching your app's style
const MenuItem: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  hasSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  showArrow?: boolean;
  iconColor?: string;
  badge?: string;
}> = ({
  icon,
  title,
  subtitle,
  value,
  onPress,
  hasSwitch = false,
  switchValue = false,
  onSwitchChange,
  showArrow = true,
  iconColor = "#666666",
  badge
}) => {
  return (
    <TouchableOpacity
      style={tw`bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm flex-row items-center`}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={hasSwitch}
    >
      {/* Icon container */}
      <View style={tw`w-10 h-10 bg-gray-50 rounded-xl items-center justify-center mr-4`}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>

      {/* Content */}
      <View style={tw`flex-1`}>
        <View style={tw`flex-row items-center`}>
          <Text style={tw`text-base font-semibold text-black`}>
            {title}
          </Text>
          {badge && (
            <View style={tw`bg-red-500 rounded-full px-2 py-0.5 ml-2`}>
              <Text style={tw`text-white text-xs font-bold`}>
                {badge}
              </Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text style={tw`text-sm text-gray-500 mt-0.5`}>
            {subtitle}
          </Text>
        )}
        {value && (
          <Text style={tw`text-sm text-blue-600 mt-0.5 font-medium`}>
            {value}
          </Text>
        )}
      </View>

      {/* Right side content */}
      {hasSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: '#E5E7EB', true: '#000000' }}
          thumbColor={switchValue ? '#FFFFFF' : '#F3F4F6'}
          ios_backgroundColor="#E5E7EB"
        />
      ) : showArrow ? (
        <Ionicons name="chevron-forward" size={20} color="#C6C6C6" />
      ) : null}
    </TouchableOpacity>
  );
};

// Stats card component
const StatsCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  iconColor: string;
}> = ({ title, value, subtitle, icon, iconColor }) => (
  <View style={tw`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex-1 mx-1`}>
    <View style={tw`flex-row items-center justify-between mb-2`}>
      <Text style={tw`text-sm font-medium text-gray-600`}>
        {title}
      </Text>
      <Ionicons name={icon as any} size={18} color={iconColor} />
    </View>
    <Text style={tw`text-2xl font-bold text-black mb-1`}>
      {value}
    </Text>
    <Text style={tw`text-xs text-gray-500`}>
      {subtitle}
    </Text>
  </View>
);

// Main Profile Screen
const ProfileScreen = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

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

  const handleLogout = () => {
    console.log('Logout pressed');
  };

  const handleEditProfile = () => {
    console.log('Edit profile pressed');
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <ScrollView 
        style={tw`flex-1`}
        contentContainerStyle={tw`pb-8`}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={tw`px-6 pt-4 pb-6 bg-white border-b border-gray-100`}>
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <Text style={tw`text-2xl font-bold text-black`}>
              Profile
            </Text>
            <TouchableOpacity
              style={tw`w-10 h-10 bg-gray-100 rounded-xl items-center justify-center`}
              onPress={handleEditProfile}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={20} color="#666666" />
            </TouchableOpacity>
          </View>

          {/* Profile Info */}
          <Animated.View
            style={[
              tw``,
              {
                opacity: fadeAnimation,
                transform: [{ translateY: slideAnimation }],
              }
            ]}
          >
            <Text style={tw`text-xl font-bold text-black mb-1`}>
              John Doe
            </Text>
            
            <Text style={tw`text-sm text-gray-500`}>
              john.doe@example.com
            </Text>
          </Animated.View>
        </View>

        {/* Search Preferences Section */}
        <View style={tw`px-6 pb-6`}>
          <SectionHeader 
            title="Search Preferences" 
            subtitle="Your hotel discovery settings"
          />
          
          <MenuItem
            icon="star-outline"
            title="Saved Searches"
            subtitle="Quick access to recent searches"
            badge="5"
            onPress={() => console.log('Saved searches pressed')}
          />
          
          <MenuItem
            icon="location-outline"
            title="Preferred Locations"
            subtitle="Cities you search often"
            onPress={() => console.log('Locations pressed')}
          />
          
          <MenuItem
            icon="options-outline"
            title="Default Filters"
            subtitle="Set your go-to preferences"
            onPress={() => console.log('Filters pressed')}
          />
        </View>

        {/* Account Section */}
        <View style={tw`px-6 pb-6`}>
          <SectionHeader 
            title="Account" 
            subtitle="Manage your account settings"
          />
          
          <MenuItem
            icon="person-outline"
            title="Personal Information"
            subtitle="Update your details"
            onPress={() => console.log('Personal info pressed')}
          />
          
          <MenuItem
            icon="shield-checkmark-outline"
            title="Privacy & Security"
            subtitle="Control your privacy"
            onPress={() => console.log('Privacy pressed')}
          />
          
          <MenuItem
            icon="heart-outline"
            title="Favorites"
            subtitle="Your saved hotels"
            badge="12"
            onPress={() => console.log('Favorites pressed')}
          />
        </View>

        {/* Preferences Section */}
        <View style={tw`px-6 pb-6`}>
          <SectionHeader 
            title="Preferences" 
            subtitle="Customize your experience"
          />
          
          <MenuItem
            icon="notifications-outline"
            title="Push Notifications"
            subtitle="Hotel recommendations & updates"
            hasSwitch={true}
            switchValue={notificationsEnabled}
            onSwitchChange={setNotificationsEnabled}
            showArrow={false}
          />
          
          <MenuItem
            icon="location-outline"
            title="Location Services"
            subtitle="For better hotel recommendations"
            hasSwitch={true}
            switchValue={locationEnabled}
            onSwitchChange={setLocationEnabled}
            showArrow={false}
          />
          
          <MenuItem
            icon="moon-outline"
            title="Dark Mode"
            subtitle="Coming soon"
            hasSwitch={true}
            switchValue={darkModeEnabled}
            onSwitchChange={setDarkModeEnabled}
            showArrow={false}
          />
        </View>

        {/* Support Section */}
        <View style={tw`px-6 pb-6`}>
          <SectionHeader 
            title="Support" 
            subtitle="Get help when you need it"
          />
          
          <MenuItem
            icon="help-circle-outline"
            title="Help Center"
            subtitle="FAQs and guides"
            onPress={() => console.log('Help pressed')}
          />
          
          <MenuItem
            icon="chatbubble-outline"
            title="Contact Support"
            subtitle="Get help with hotel searches"
            onPress={() => console.log('Support pressed')}
          />
          
          <MenuItem
            icon="star-outline"
            title="Rate Our App"
            subtitle="Share your feedback"
            onPress={() => console.log('Rate pressed')}
          />
        </View>

        {/* About Section */}
        <View style={tw`px-6 pb-6`}>
          <SectionHeader title="About" />
          
          <MenuItem
            icon="document-text-outline"
            title="Terms of Service"
            onPress={() => console.log('Terms pressed')}
          />
          
          <MenuItem
            icon="shield-outline"
            title="Privacy Policy"
            onPress={() => console.log('Privacy policy pressed')}
          />
          
          <MenuItem
            icon="information-circle-outline"
            title="App Version"
            value="1.2.4"
            showArrow={false}
          />
        </View>

        {/* Logout Button */}
        <View style={tw`px-6 pb-6`}>
          <TouchableOpacity
            style={tw`bg-red-50 border border-red-200 rounded-2xl p-4 flex-row items-center justify-center`}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={tw`text-red-600 font-semibold text-base ml-3`}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;