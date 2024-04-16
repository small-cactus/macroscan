import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, StyleSheet, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';

// Screens
import WelcomeScreen from './screens/WelcomeScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import DetailsScreen from './screens/DetailsScreen';
import SignInScreen from './screens/SignInScreen';
import SettingsScreen from './screens/SettingsScreen';
import AccountScreen from './screens/AccountScreen';
import GoodbyeScreen from './screens/GoodbyeScreen';
import { GeneralSettingsScreen, AccountSettingsScreen, NotificationSettingsScreen } from './screens/SettingsElements';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function App() {
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const styles = getDynamicStyles(colorScheme);
  const navigationRef = useRef(null);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

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
  
    checkUser();
  }, []);

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
              case 'Home':
                iconName = focused ? 'scan' : 'scan-outline';
                break;
              case 'Details':
                iconName = focused ? 'list' : 'list-outline';
                break;
              case 'Settings':
                iconName = focused ? 'settings' : 'settings-outline';
                break;
              case 'Account':
                iconName = focused ? 'person' : 'person-outline';
                break;
            }
            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colorScheme === 'dark' ? 'white' : 'black',
          tabBarInactiveTintColor: colorScheme === 'dark' ? '#a7a7a7' : 'gray',
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Details" component={DetailsScreen} />
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
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
        <Stack.Screen name="HomeTabs" component={HomeTabs} options={{ headerShown: false }} />
        <Stack.Screen name="GeneralSettings" component={GeneralSettingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Goodbye" component={GoodbyeScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
      <StatusBar style={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
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
