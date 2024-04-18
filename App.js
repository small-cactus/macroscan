import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, StyleSheet, Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';

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


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function App() {
  const navigationRef = useRef(null);
  const systemScheme = useColorScheme(); // This hook automatically updates on theme change
  const [theme, setTheme] = useState(systemScheme); // Initialize theme based on system settings
  const colorScheme = Appearance.getColorScheme();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await AsyncStorage.getItem('@user');
        if (user && navigationRef.current) {
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: 'HomeTabs' }],
          });
        }
      } catch (e) {
        console.error('Failed to fetch the data from storage');
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
  
    return () => subscription.remove();
  }, []);
  

  const styles = getDynamicStyles(colorScheme);

  function HomeTabs() {
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
      </Tab.Navigator>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Welcome"
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
        <Stack.Screen name="Goodbye" component={GoodbyeScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
      <StatusBar style={theme === 'dark' ? 'light-content' : 'dark-content'} />
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
    fontWeight: 'bold',
  },
});

export default App;
