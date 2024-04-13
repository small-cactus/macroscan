import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import WelcomeScreen from './screens/WelcomeScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import DetailsScreen from './screens/DetailsScreen';
import SignInScreen from './screens/SignInScreen';
import SettingsScreen from './screens/SettingsScreen';  // Import the SettingsScreen

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
              iconName = focused ? 'scan' : 'scan-outline';  // Corrected the icon for consistency
              break;
            case 'Details':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';  // Settings icon
              break;
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'black',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Details" component={DetailsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerStyle: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  headerTitleStyle: {
    fontSize: 18,
  },
  tabBarStyle: {
    backgroundColor: '#ffffff',
    borderTopColor: '#5a5a5a',
    paddingBottom: 30,
    paddingTop: 10,
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default function App() {
  return (
    <NavigationContainer>
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
        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="HomeTabs" component={HomeTabs} options={{ headerShown: false }} />

      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
