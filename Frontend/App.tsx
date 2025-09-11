import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { AuthProvider } from './contexts/AuthContext';


// Import your screen components
import InitialSearchScreen from './screens/InitialSearchScreen';
import ExploreScreen from './screens/HomeScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import ProfileScreen from './screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack Navigator for Find Tab (Initial Search + Results) with fade transition
const FindStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="InitialSearch" 
        component={InitialSearchScreen}
      />
      <Stack.Screen 
        name="Results" 
        component={ExploreScreen}
        options={{
          // Fade transition configuration
          transitionSpec: {
            open: {
              animation: 'timing',
              config: {
                duration: 400,
              },
            },
            close: {
              animation: 'timing',
              config: {
                duration: 300,
              },
            },
          },
          cardStyleInterpolator: ({ current }) => ({
            cardStyle: {
              opacity: current.progress,
            },
          }),
          // Alternative: Simple fade animation (uncomment to use instead)
          // animation: 'fade',
          // animationDuration: 400,
        }}
      />
    </Stack.Navigator>
  );
};

// Tab Navigator Component
const TabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Find"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Favorites') {
            const iconName: keyof typeof Ionicons.glyphMap = focused ? 'heart' : 'heart-outline';
            return <Ionicons name={iconName} size={20} color={color} />;
          } else if (route.name === 'Find') {
            // Use custom logo for the Find tab
            return (
              <Image
                source={require('./assets/images/logo.png')}
                style={{
                  width: 20,
                  height: 20,
                  opacity: focused ? 1 : 0.6, // Use opacity instead of tint
                }}
                resizeMode="contain"
              />
            );
          } else if (route.name === 'Profile') {
            const iconName: keyof typeof Ionicons.glyphMap = focused ? 'person' : 'person-outline';
            return <Ionicons name={iconName} size={20} color={color} />;
          } else {
            return <Ionicons name="help-outline" size={20} color={color} />;
          }
        },
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#E5E5E5',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 8,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: -5,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Favorites" 
        component={FavoritesScreen}
        options={{
          tabBarLabel: 'Favorites',
        }}
      />
      <Tab.Screen 
        name="Find" 
        component={FindStackNavigator}
        options={{
          tabBarLabel: 'Genie',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

// Main App Component
export default function App() {
  return (
    <AuthProvider>
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
    </AuthProvider>
  );
}