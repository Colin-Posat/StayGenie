import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { createBottomTabNavigator, BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Image, View, Text, Platform } from 'react-native';
import { AuthProvider } from './contexts/AuthContext';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Import your screen components
import InitialSearchScreen from './screens/InitialSearchScreen';
import ExploreScreen from './screens/HomeScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import ProfileScreen from './screens/ProfileScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Type definitions
type FindStackParamList = {
  InitialSearch: undefined;
  Results: { searchQuery: string };
};

type TabParamList = {
  Find: undefined;
  Favorites: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<FindStackParamList>();

// Brand colors
const TURQUOISE = '#1df9ff';

// Simplified Tab Icon Component
const TabIcon = ({ focused, route }: { focused: boolean; route: any }) => {
  const getIconName = () => {
    switch (route.name) {
      case 'Favorites':
        return focused ? 'heart' : 'heart-outline';
      case 'Profile':
        return focused ? 'person' : 'person-outline';
      default:
        return 'help-outline';
    }
  };

  const getLabel = () => {
    switch (route.name) {
      case 'Find':
        return 'Genie';
      case 'Favorites':
        return 'Favorites';
      case 'Profile':
        return 'Profile';
      default:
        return 'Help';
    }
  };

  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
      minWidth: 60,
    }}>
      {route.name === 'Find' ? (
        <Image
          source={require('./assets/images/logo.png')}
          style={{
            width: 28,
            height: 28,
            tintColor: focused ? TURQUOISE : '#8A8A8A',
            marginBottom: 2,
          }}
          resizeMode="contain"
        />
      ) : (
        <Ionicons 
          name={getIconName()} 
          size={24} 
          color={focused ? TURQUOISE : '#8A8A8A'}
          style={{ marginBottom: 2 }}
        />
      )}
      
      <Text 
        numberOfLines={1}
        style={{
          fontSize: 10,
          fontWeight: focused ? '600' : '500',
          color: focused ? TURQUOISE : '#8A8A8A',
          textAlign: 'center',
          width: '100%',
        }}
      >
        {getLabel()}
      </Text>
    </View>
  );
};

// Stack Navigator for Find Tab
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
        tabBarIcon: ({ focused }) => <TabIcon focused={focused} route={route} />,
        
        tabBarLabel: () => null,

        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 78,
          paddingBottom: Platform.OS === 'ios' ? 28 : 15,
          paddingTop: 15,
          paddingHorizontal: 20,
          position: Platform.OS === 'web' ? 'relative' : 'absolute',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          elevation: 0,
          shadowOpacity: 0,
        },

        tabBarBackground: () => (
          <View
            style={{
              flex: 1,
              backgroundColor: 'white',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: 'visible',
              ...(Platform.OS === 'ios'
                ? {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -6 },
                    shadowOpacity: 0.15,
                    shadowRadius: 16,
                  }
                : {
                    elevation: 25,
                  }),
            }}
          />
        ),

        headerShown: false,
        tabBarHideOnKeyboard: Platform.OS === 'android',
      })}
    >
      <Tab.Screen 
        name="Find" 
        component={FindStackNavigator}
      />
      <Tab.Screen 
        name="Favorites" 
        component={FavoritesScreen}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
};

// Main App Component
const App = () => {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Merriweather-Regular': require('./assets/fonts/Merriweather_36pt-Regular.ttf'),
          'Merriweather-Bold': require('./assets/fonts/Merriweather_36pt-Bold.ttf'),
        });
      } catch (e) {
        console.warn('Error loading fonts:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    loadFonts();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <AuthProvider>
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>
      </AuthProvider>
    </GestureHandlerRootView>
  );
};

export default App;