import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, StyleSheet, Appearance, useColorScheme, ActivityIndicator, View, AppRegistry, Dimensions, Platform, Linking } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { IAPProvider } from './IAPContext';
import { UserProvider } from './userContext';
import { SymbolView, SymbolViewProps, SFSymbol } from 'expo-symbols';
  // UNCOMMENT THIS FOR PRODUCTION USE
import Superwall from "@superwall/react-native-superwall"

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
      dim => (width === dim.width && height === dim.height) || (width === dim.height && height === dim.width)
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
            case 'Home': iconName = focused ? 'scan' : 'scan-outline'; break;
            case 'History': iconName = focused ? 'list' : 'list-outline'; break;
            case 'Insights': iconName = focused ? 'analytics' : 'analytics-outline'; break;
            case 'Settings': iconName = focused ? 'settings' : 'settings-outline'; break;
            case 'Account': iconName = focused ? 'person' : 'person-outline'; break;
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colorScheme === 'dark' ? 'white' : 'black',
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#a7a7a7' : 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function App() {
  const navigationRef = useRef(null);
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState(systemScheme);
  const [initialRoute, setInitialRoute] = useState(null);
  const [isConnected, setIsConnected] = useState(true);

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
    const verifyChecksum = (name, storedChecksum) => {
      const generatedChecksum = generateChecksum(name);
      return generatedChecksum === storedChecksum;
    };

    const deleteUserAccount = async () => {
      await AsyncStorage.removeItem('@user');
      await AsyncStorage.removeItem('userImageUri');
      await AsyncStorage.removeItem('userName');
      await AsyncStorage.removeItem('@user_logged_in');
      await AsyncStorage.removeItem('@product_history');
      await AsyncStorage.removeItem('selectedModel');
      await AsyncStorage.removeItem('dailyScanCount');
      await AsyncStorage.removeItem('firstUseDate');
      await AsyncStorage.removeItem('dateLastUsed');
    };

    const checkUser = async () => {
      try {
        const userName = await AsyncStorage.getItem('userName');

        if (userName) {
          setInitialRoute('HomeTabs');
        } else {
          await deleteUserAccount();
          setInitialRoute('Welcome');
        }
      } catch (e) {
        console.error(e);
        setInitialRoute('Welcome');
      }
    };

    checkUser();

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      AsyncStorage.getItem('@theme').then(savedTheme => {
        if (!savedTheme || savedTheme === 'automatic') {
          setTheme(colorScheme);
        }
      });
    });

    const netInfoUnsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    return () => {
      subscription.remove();
      netInfoUnsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isConnected) {
      navigationRef.current?.reset({
        index: 0,
        routes: [{ name: 'NoInternet' }],
      });
    }
  }, [isConnected]);

  if (initialRoute === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const styles = getDynamicStyles(theme);

  return (
    <NavigationContainer ref={navigationRef}>
      <UserProvider navigation={navigationRef.current}>
        <IAPProvider>
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{
              headerStyle: styles.headerStyle,
              headerTintColor: '#fff',
              headerTitleStyle: styles.headerTitleStyle,
              headerTitleAlign: 'center',
            }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
            <Stack.Screen name="LoadingScreen" component={LoadingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OnBoardingScreen" component={OnBoardingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="HomeTabs" component={HomeTabs} options={{ headerShown: false }} />
            <Stack.Screen name="FoodScanScreen" component={FoodScanScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SupportScreen" component={SupportScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PrivacyScreen" component={PrivacyScreen} options={{ headerShown: false }} />
            <Stack.Screen name="FeaturesScreen" component={FeaturesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="DebuggingScreen" component={DebuggingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AboutScreen" component={AboutScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CancelScreen" component={CancelScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Goodbye" component={GoodbyeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Log" component={LogScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="NoInternet" component={NoInternetScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Insights" component={InsightsScreen} options={{ headerShown: false }} />
          </Stack.Navigator>
          <StatusBar style={theme === 'dark' ? 'light-content' : 'dark-content'} />
        </IAPProvider>
      </UserProvider>
    </NavigationContainer>
  );
}

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  headerStyle: {
    backgroundColor: colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : '#fff',
  },
  headerTitleStyle: {
    fontSize: 18,
  },
  tabBarStyle: {
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#fff',
    borderTopColor: colorScheme === 'dark' ? '#5a5a5a' : '#e0e0e0',
    paddingBottom: isIphoneSE() ? 8 : 30,  // 20% from the top of the screen
    paddingTop: isIphoneSE() ? 3 : 10,  // 20% from the top of the screen
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '600',
  },
});

AppRegistry.registerComponent('main', () => App);

export default App;
