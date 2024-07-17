import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Dimensions,
  Platform
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from "expo-web-browser";
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';
import { Appearance } from 'react-native';
import { useUser } from '../userContext';

const { width, height } = Dimensions.get('window');

const isIphoneSE = () => {
  const smallIphoneDimensions = [
    { width: 320, height: 568 }, // iPhone SE (1st generation), iPhone 5, 5S, 5C
    { width: 375, height: 667 }, // iPhone 6, 6S, 7, 8, SE (2nd generation)
    { width: 414, height: 736 }, // iPhone 8 Plus
    { width: 360, height: 640 }, // iPhone SE (2020)
    { width: 375, height: 812 }, // iPhone 12 Mini, iPhone 13 Mini
    { width: 360, height: 780 }, // iPhone 12 Mini, iPhone 13 Mini
  ];

  return (
    Platform.OS === 'ios' &&
    smallIphoneDimensions.some(
      dim => (width === dim.width && height === dim.height) || (width === dim.height && height === dim.width)
    )
  );
};

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const styles = getDynamicStyles(colorScheme);
  const { createUserWithGoogle, createUserWithApple } = useUser();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '675290991564-r29a0q0hf25s70vnh3u29m7tsupihm3f.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleUserVerification(() => createUserWithGoogle(id_token));
    } else if (response?.type === 'cancel') {
      console.log('Google Sign-in cancelled');
    } else if (response?.type === 'error') {
      Alert.alert("Google Sign-Up Error", response.error);
    }
  }, [response]);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const storeUserFlag = async () => {
    try {
      await AsyncStorage.setItem('@user_logged_in', 'true');
    } catch (e) {
      console.error("Failed to store user flag:", e);
    }
  };

  const navigateHome = () => {
    navigation.navigate('OnBoardingScreen');
    navigation.reset({
      index: 0,
      routes: [{ name: 'OnBoardingScreen' }],
    });
  };

  const handleUserVerification = async (createUserFn) => {
    setLoading(true);
    navigation.navigate('LoadingScreen');
    navigation.reset({
      index: 0,
      routes: [{ name: 'LoadingScreen' }],
    });
    try {
      const newUser = await createUserFn();
      console.log('handleUserVerification response:', newUser);
      await AsyncStorage.setItem('@user_logged_in', 'true');
      if (!newUser.name || newUser.name === 'No Name' || !newUser.email) {
        Alert.alert("Sign Up Failed", "Apple sign in failed, our servers are US based, if you're seeing this, you have a slow connection.");
      } else {
        await AsyncStorage.setItem('userName', newUser.name);
        await AsyncStorage.setItem('userEmail', newUser.email);
        navigateHome();
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Sign Up Error', error.message);
    }
  };

  const signInWithApple = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      handleUserVerification(() => createUserWithApple(credential));
    } catch (e) {
      if (e.code === 'ERR_CANCELED') {
        console.log('Sign in with Apple was cancelled!');
      } else {
        Alert.alert('Sign Up Error', e.message);
      }
    }
  };

  return (
    <View style={styles.view}>
      <Text style={styles.title}>Sign Up for MacroScan</Text>
      <Image
        source={colorScheme === 'dark' ? require('../assets/icon-light.png') : require('../assets/icon.png')}
        style={styles.icon}
      />
      <View style={styles.container}>
        <View style={styles.separatorBox}></View>
        <TouchableOpacity style={styles.AppleContinueButton} onPress={signInWithApple}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={styles.AppleContinueText}>
              Continue with Apple
            </Text>
            <FontAwesome name="apple" size={20} color="#ffffff" style={{ marginLeft: 10 }} />
          </View>
        </TouchableOpacity>
        {/* <TouchableOpacity style={styles.GoogleContinueButton} onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          promptAsync();
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={styles.GoogleContinueText}>
              Continue with Google
            </Text>
            <FontAwesome name="google" size={20} color="#ffffff" style={{ marginLeft: 10 }} />
          </View>
        </TouchableOpacity> */}
        <TouchableOpacity style={styles.signUpRedirect} onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('SignIn');
        }}>
          <Text style={styles.signUpRedirectText}>Already Have an Account?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  view: {
    flexGrow: 1,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 200,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
    color: colorScheme === 'dark' ? '#161618' : '#FFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginTop: isIphoneSE() ? 50 : 100,
    marginBottom: 20,
    color: colorScheme === 'dark' ? '#fff' : '#333',
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
    zIndex: 1,
  },
  button: {
    width: '80%',
    backgroundColor: '#000000',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
  },
  buttonText: {
    color: colorScheme === 'dark' ? '#e9e9e9' : '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  icon: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginTop: '-2%',
    marginBottom: "-120%",
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
    zIndex: 1,
  },
  separatorBox: {
    width: 330,
    height: 5,
    backgroundColor: colorScheme === 'dark' ? '#5a5a5a' : '#CCCCCC',
    marginTop: 0,
    marginBottom: 10,
    borderRadius: 3,
  },
  AppleContinueButton: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 0,
    width: '85%',
    height: isIphoneSE() ? '8%' : '6%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#000000",
    borderRadius: 100,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
  },
  AppleContinueText: {
    color: colorScheme === 'dark' ? '#e9e9e9' : '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  GoogleContinueButton: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 60,
    borderWidth: 0,
    width: '88%',
    height: '7%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    marginTop: 2,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
  },
  GoogleContinueText: {
    color: colorScheme === 'dark' ? '#e9e9e9' : '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  signUpRedirect: {
    marginTop: 20,
    marginBottom: 20,
  },
  signUpRedirectText: {
    color: colorScheme === 'dark' ? '#fff' : '#000',
    textDecorationLine: 'underline',
  },
});
