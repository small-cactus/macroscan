import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';
import { Appearance } from 'react-native';
import { useUser } from '../userContext';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedTextLoading from './AnimatedTextLoading';

const { width, height } = Dimensions.get('window');

const isIphoneSE = () => {
  const smallIphoneDimensions = [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 414, height: 736 },
    { width: 360, height: 640 },
    { width: 375, height: 812 },
    { width: 360, height: 780 },
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
  const [buttonScaleAnim] = useState(new Animated.Value(1));
  const [isDisabled, setIsDisabled] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '675290991564-r29a0q0hf25s70vnh3u29m7tsupihm3f.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const handlePressIn = () => {
    Animated.spring(buttonScaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const storeUserFlag = async () => {
    try {
      await AsyncStorage.setItem('@user_logged_in', 'true');
    } catch (e) {
      console.error('Failed to store user flag:', e);
    }
  };

  const navigateHome = () => {
    navigation.navigate('HomeTabs', { screen: 'Home' });
    navigation.reset({
      index: 0,
      routes: [{ name: 'HomeTabs' }],
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
      if (
        !newUser.name ||
        newUser.name === 'No Name' ||
        !newUser.email
      ) {
        Alert.alert(
          'Sign Up Failed',
          'Apple sign in failed, our servers are US based, if you\'re seeing this, you have a slow connection.'
        );
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

  const handlePress = () => {
    if (!isDisabled) {
      setIsDisabled(true);
      signInWithApple();
      setTimeout(() => {
        setIsDisabled(false);
      }, 1000);
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
    <View style={styles.View}>
      <View style={styles.contentContainer}>
        <View style={styles.logoContainer}>
          <View style={styles.logoBackground}>
            <Image source={require('../assets/icon.png')} style={styles.logo} />
          </View>
        </View>

        <View style={styles.textContainer}>
          <AnimatedTextLoading
            text="Sync with your devices"
            colorScheme={colorScheme}
            style={styles.title}
          />
          <AnimatedTextLoading
            text="Don't worry, we'll make this quick"
            colorScheme={colorScheme}
            style={styles.description}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Animated.View style={[
            styles.SignUpButtonTouchable,
            { transform: [{ scale: buttonScaleAnim }] }
          ]}>
            <TouchableOpacity
              onPress={handlePress}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={isDisabled}
            >
              <LinearGradient
                colors={colorScheme === 'dark' ? ['#2a2a2a', '#1a1a1a'] : ['#000', '#333']}
                style={styles.SignUpButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.buttonContent}>
                  <Text style={styles.SignUpText}>Continue with Apple</Text>
                  <FontAwesome
                    name="apple"
                    size={20}
                    color={colorScheme === 'dark' ? '#d8d8d8' : '#fff'}
                    style={styles.arrowIcon}
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.SignInButton}>
            <Text style={styles.SignInText}>
              Signing in with Apple makes it easy to sync MacroScan across all your devices. You can't use MacroScan without an Apple Account.
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  View: {
    flex: 1,
    backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 60 : 40,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: isIphoneSE() ? 25 : 35,
    fontWeight: '800',
    color: colorScheme === 'dark' ? '#fff' : '#000',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
    padding: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 100 : 0,
  },
  logoBackground: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 0,
    shadowColor: colorScheme === 'dark' ? '#fff' : '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: colorScheme === 'dark' ? 0.15 : 0.25,
    shadowRadius: 15.84,
    elevation: 10,
  },
  logo: {
    width: isIphoneSE() ? 110 : 125,
    height: isIphoneSE() ? 110 : 125,
  },
  SignUpButton: {
    borderRadius: 16,
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  SignUpButtonTouchable: {
    width: '100%',
    maxWidth: 400,
  },
  SignUpText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  SignInButton: {
    marginTop: 20,
    padding: 12,
  },
  SignInText: {
    fontSize: 15,
    color: colorScheme === 'dark' ? '#999' : '#666',
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    fontWeight: '500',
    color: colorScheme === 'dark' ? '#999' : '#666',
    textAlign: 'center',
    marginBottom: 250,
    letterSpacing: 0.2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: {
    marginLeft: 8,
  },
});