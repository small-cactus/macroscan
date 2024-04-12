import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from './screens/WelcomeScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import DetailsScreen from './screens/DetailsScreen';
import SignInScreen from './screens/SignInScreen';
import { StatusBar } from 'expo-status-bar';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Welcome" // Set Welcome as the initial route
          screenOptions={{
            headerStyle: {
              backgroundColor: '#f7f7f7', // Light gray background for the header
            },
            headerTintColor: '#333', // Dark text for contrast
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ title: 'Welcome' }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Sign Up' }} />
          <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Sign In' }} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'MacroScan' }} />
          <Stack.Screen name="Details" component={DetailsScreen} options={{ title: 'Details' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}