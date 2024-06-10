import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, StyleSheet, Appearance, useColorScheme, ActivityIndicator, View, AppRegistry } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { IAPProvider } from './IAPContext';
import { UserProvider } from './userContext'; // Import the UserProvider

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
import NoInternetScreen from './screens/NoInternetScreen'; // Import NoInternetScreen

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
            case 'Settings': iconName = focused ? 'settings' : 'settings-outline'; break;
            case 'Account': iconName = focused ? 'person' : 'person-outline'; break;
            case 'Log': iconName = focused ? 'clipboard' : 'clipboard-outline'; break;
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colorScheme === 'dark' ? 'white' : 'black',
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#a7a7a7' : 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
      <Tab.Screen name="Log" component={LogScreen} />
    </Tab.Navigator>
  );
}

function App() {
  const navigationRef = useRef(null);
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState(systemScheme);
  const colorScheme = Appearance.getColorScheme();
  const [initialRoute, setInitialRoute] = useState(null);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const userLoggedIn = await AsyncStorage.getItem('@user_logged_in');
        if (userLoggedIn) {
          setInitialRoute('HomeTabs');
        } else {
          setInitialRoute('Welcome');
        }
      } catch (e) {
        console.error('Failed to fetch the data from storage');
        setInitialRoute('Welcome');
      }
    };

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      AsyncStorage.getItem('@theme').then(savedTheme => {
        if (!savedTheme || savedTheme === 'automatic') {
          setTheme(colorScheme);
        }
      });
    });

    checkUser();

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

  const styles = getDynamicStyles(colorScheme);

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
            <Stack.Screen name="HomeTabs" component={HomeTabs} options={{ headerShown: false }} />
            <Stack.Screen name="SupportScreen" component={SupportScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PrivacyScreen" component={PrivacyScreen} options={{ headerShown: false }} />
            <Stack.Screen name="FeaturesScreen" component={FeaturesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="DebuggingScreen" component={DebuggingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AboutScreen" component={AboutScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Goodbye" component={GoodbyeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Log" component={LogScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="NoInternet" component={NoInternetScreen} options={{ headerShown: false }} />
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
    paddingBottom: 30,
    paddingTop: 10,
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '600',
  },
});

AppRegistry.registerComponent('main', () => App);

export default App;
