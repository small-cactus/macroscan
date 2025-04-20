// App.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  StatusBar,
  StyleSheet,
  Appearance,
  useColorScheme,
  ActivityIndicator,
  View,
  AppRegistry,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { IAPProvider } from './IAPContext';
import { UserProvider } from './userContext';
import { TimeZoneProvider } from './TimeZoneContext';
import { SymbolView, SymbolViewProps, SFSymbol } from 'expo-symbols';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // **Import GestureHandlerRootView**
// UNCOMMENT THIS FOR PRODUCTION USE
import Superwall from '@superwall/react-native-superwall';
import WhatsNew from './screens/WhatsNew';
import DataMigrationScreen from './screens/DataMigrationScreen';
// import FoodScanScreenRedesigned from './screens/FoodScanScreenRedesigned';

// Screens
import WelcomeScreen from './screens/WelcomeScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import SupportScreen from './screens/SupportScreen';
import SignInScreen from './screens/SignInScreen';
import SettingsScreen from './screens/SettingsScreen';
import AccountScreen from './screens/AccountScreen';
import GoodbyeScreen from './screens/GoodbyeScreen';
import HistoryScreen from './screens/HistoryScreen';
import PrivacyScreen from './screens/PrivacyScreen';
import FeaturesScreen from './screens/FeaturesScreen';
import DebuggingScreen from './screens/DebuggingScreen';
import AboutScreen from './screens/AboutScreen';
import LogScreen from './screens/LogScreen';
import CompleteProfileScreen from './screens/CompleteProfileScreen';
import NoInternetScreen from './screens/NoInternetScreen';
import InsightsScreen from './screens/InsightsScreen';
import LoadingScreen from './screens/LoadingScreen';
import CancelScreen from './screens/CancelScreen';
import OnBoardingScreen from './screens/OnBoardingScreen';
import FoodScanScreen from './screens/FoodScanScreen';
import DebugScreen from './screens/DebugScreen';
import CameraScreen from './screens/CameraScreen';
import ChatWithImageTest from './screens/ChatWithImageTest';
import LandscapeCarouselScreen from './screens/LandscapeCarouselScreen';
import InsightsV2 from './screens/InsightsV2';
// import MealPlanCameraScreen from './screens/MealPlanCameraScreen';
// import MealPlanScreen from './screens/MealPlanScreen';
import MultiFoodScanScreen from './screens/MultiFoodScanScreen';
import FoodDetailsScreen from './screens/FoodDetailsScreen';
import SearchScreen from './screens/SearchScreen';
import ProfileScreen from './screens/ProfileScreen';
import ImagePickerTestScreen from './screens/ImagePickerTestScreen';
import { WebScraperProvider } from './contexts/WebScraperContext'; // Adjust path if needed

const { width, height } = Dimensions.get('window');

const isIphoneSE = () => {
  const smallIphoneDimensions = [
    { width: 320, height: 568 }, // iPhone SE (1st generation), iPhone 5, 5S, 5C
    { width: 375, height: 667 }, // iPhone 6, 6S, 7, 8, SE (2nd generation)
    { width: 414, height: 736 }, // iPhone 8 Plus
    { width: 360, height: 640 }, // iPhone SE (2020)
  ];

  return (
    Platform.OS === 'ios' &&
    smallIphoneDimensions.some(
      (dim) =>
        (width === dim.width && height === dim.height) ||
        (width === dim.height && height === dim.width)
    )
  );
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  const colorScheme = useColorScheme();
  const styles = getDynamicStyles(colorScheme);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBarStyle,
        tabBarLabelStyle: styles.tabBarLabelStyle,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'scan' : 'scan-outline';
              break;
            case 'History':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Insights':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Beta':
              iconName = focused ? 'scan' : 'scan-outline';
              break;
            case 'Search (BETA)':
              iconName = focused ? 'search' : 'search-outline';
              break;
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colorScheme === 'dark' ? 'white' : 'black',
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#a7a7a7' : 'gray',
      })}
    >
      <Tab.Screen name="Home" component={FoodScanScreen} />
      <Tab.Screen name="Insights" component={InsightsV2} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      {/* <Tab.Screen 
        name="Search (BETA)" 
        component={SearchScreen}
        options={{ 
          tabBarLabel: 'Search (BETA)',
          tabBarTestID: 'search-beta-tab'
        }}
      /> */}
    </Tab.Navigator>
  );
}

function App() {
  const navigationRef = useRef(null);
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState(systemScheme);
  const [initialRoute, setInitialRoute] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);

  const generateChecksum = (data) => {
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum += data.charCodeAt(i);
    }
    return checksum.toString();
  };

  // UNCOMMENT THIS FOR PRODUCTION USE
  React.useEffect(() => {
    const apiKey = Platform.OS === "ios" ? "pk_bda2670c19f0b35a69ea4d829c74af62e480386339850ce8" : "MY_ANDROID_API_KEY"
    Superwall.configure(apiKey)
  }, [])

  useEffect(() => {
    const checkMigrationNeeded = async () => {
      try {
        const userData = await AsyncStorage.getItem('@user');
        const selectedProvider = await AsyncStorage.getItem('@selected_provider');
        
        if (userData && !selectedProvider) {
          setNeedsMigration(true);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error checking migration:', error);
        return false;
      }
    };

    const verifyChecksum = (name, storedChecksum) => {
      const generatedChecksum = generateChecksum(name);
      return generatedChecksum === storedChecksum;
    };

    const checkUser = async () => {
      try {
        const migrationNeeded = await checkMigrationNeeded();
        if (migrationNeeded) {
          return;
        }

        const userName = await AsyncStorage.getItem('userName');
        if (userName) {
          setInitialRoute('HomeTabs');
        } else {
          setInitialRoute('Welcome');
        }
      } catch (e) {
        console.error(e);
        setInitialRoute('Welcome');
      }
    };

    checkUser();

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      AsyncStorage.getItem('@theme').then((savedTheme) => {
        if (!savedTheme || savedTheme === 'automatic') {
          setTheme(colorScheme);
        }
      });
    });

    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });

    return () => {
      subscription.remove();
      netInfoUnsubscribe();
    };
  }, []);

  const handleMigrationComplete = () => {
    setNeedsMigration(false);
    setInitialRoute('Welcome');
  };

  useEffect(() => {
    if (!isConnected) {
      navigationRef.current?.reset({
        index: 0,
        routes: [{ name: 'NoInternet' }],
      });
    }
  }, [isConnected]);

  if (needsMigration) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <TimeZoneProvider>
          <DataMigrationScreen onComplete={handleMigrationComplete} />
        </TimeZoneProvider>
      </GestureHandlerRootView>
    );
  }

  if (initialRoute === null) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <TimeZoneProvider>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#ccc" />
          </View>
        </TimeZoneProvider>
      </GestureHandlerRootView>
    );
  }

  const styles = getDynamicStyles(theme);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TimeZoneProvider>
        <WebScraperProvider>
          <NavigationContainer ref={navigationRef}>
            <UserProvider
              navigation={navigationRef.current}
            >
              <IAPProvider>
                <Stack.Navigator
                  initialRouteName={initialRoute}
                  screenOptions={{
                    headerStyle: styles.headerStyle,
                    headerTintColor: '#fff',
                    headerTitleStyle: styles.headerTitleStyle,
                    headerTitleAlign: 'center',
                  }}
                >
                  <Stack.Screen
                    name="Welcome"
                    component={WelcomeScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="SignUp"
                    component={SignUpScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="SignIn"
                    component={SignInScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="LoadingScreen"
                    component={LoadingScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="OnBoardingScreen"
                    component={OnBoardingScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="HomeTabs"
                    component={HomeTabs}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="InsightsV2"
                    component={InsightsV2}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="CameraScreen"
                    component={CameraScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="FoodScanScreen"
                    component={FoodScanScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="SupportScreen"
                    component={SupportScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="PrivacyScreen"
                    component={PrivacyScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="FeaturesScreen"
                    component={FeaturesScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="DebuggingScreen"
                    component={DebuggingScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="AboutScreen"
                    component={AboutScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="CancelScreen"
                    component={CancelScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="Goodbye"
                    component={GoodbyeScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="Log"
                    component={LogScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="CompleteProfile"
                    component={CompleteProfileScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="NoInternet"
                    component={NoInternetScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="Insights"
                    component={InsightsScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="DebugScreen"
                    component={DebugScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="LandscapeCarouselScreen"
                    component={LandscapeCarouselScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="ChatWithImageTest"
                    component={ChatWithImageTest}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="MultiFoodScanScreen"
                    component={MultiFoodScanScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="FoodDetailsScreen"
                    component={FoodDetailsScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="ImagePickerTestScreen"
                    component={ImagePickerTestScreen}
                    options={{ headerShown: false }}
                  />
                </Stack.Navigator>
                <StatusBar
                  style={theme === 'dark' ? 'light-content' : 'dark-content'}
                />
              </IAPProvider>
            </UserProvider>
          </NavigationContainer>
        </WebScraperProvider>
      </TimeZoneProvider>
    </GestureHandlerRootView>
  );
}

// Calculate scale factor based on screen size
const baseWidth = 430; // iPhone 14 Pro Max width
const baseHeight = 932; // iPhone 14 Pro Max height
const scaleWidth = width / baseWidth;
const scaleHeight = height / baseHeight;
const scale = Math.min(scaleWidth, scaleHeight);

const getDynamicStyles = (colorScheme) =>
  StyleSheet.create({
    headerStyle: {
      backgroundColor: colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : '#fff',
    },
    headerTitleStyle: {
      fontSize: 18 * scale,
    },
    tabBarStyle: {
      backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
      borderTopColor: colorScheme === 'dark' ? '#3a3a3a' : '#e0e0e0',
      paddingBottom: isIphoneSE() ? 8 : 30 * scale, // 20% from the top of the screen
      paddingTop: isIphoneSE() ? 3 : 10 * scale, // 20% from the top of the screen
    },
    tabBarLabelStyle: {
      fontSize: 12 * scale,
      fontWeight: '600',
    },
  });

AppRegistry.registerComponent('main', () => App);

export default App;