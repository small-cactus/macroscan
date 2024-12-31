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
import { LinearGradient } from 'expo-linear-gradient'; // Ensuring LinearGradient is imported
import AnimatedTextLoading from './AnimatedTextLoading';

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
      (dim) =>
        (width === dim.width && height === dim.height) ||
        (width === dim.height && height === dim.width)
    )
  );
};

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const styles = getDynamicStyles(colorScheme);
  const { createUserWithGoogle, createUserWithApple } = useUser();
  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const [isDisabled, setIsDisabled] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId:
      '675290991564-r29a0q0hf25s70vnh3u29m7tsupihm3f.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    Animated.timing(fadeAnim1, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(fadeAnim2, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim1, fadeAnim2]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleUserVerification(() => createUserWithGoogle(id_token));
    } else if (response?.type === 'cancel') {
      console.log('Google Sign-in cancelled');
    } else if (response?.type === 'error') {
      Alert.alert('Google Sign-Up Error', response.error);
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
      console.error('Failed to store user flag:', e);
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
    <View style={styles.view}>
      <View style={styles.logoContainer}>
        <View style={styles.logoBackground}>
          <Image source={require('../assets/icon.png')} style={styles.logo} />
        </View>
      </View>
      <Text style={styles.title}>Sync with your devices</Text>
      <View style={styles.descriptionContainer}>
      <AnimatedTextLoading
          text="Don't worry, we'll make this quick."
          colorScheme={colorScheme}
          style={styles.description}
        />
      </View>
      <View style={styles.container}>
        {/* Apple Sign-In Button */}
        <TouchableOpacity
          style={styles.AppleContinueButtonTouchable}
          onPress={handlePress}
          disabled={isDisabled}
        >
          <LinearGradient
            colors={['#000000', '#222']}
            style={styles.AppleContinueButton}
            start={[1, 1.3]}
            end={[1, 0]}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.AppleContinueText}>Continue with Apple</Text>
              <FontAwesome
                name="apple"
                size={20}
                color="#ffffff"
                style={styles.icon}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Google Sign-In Button */}
        {/* Uncomment the following block if you wish to enable Google Sign-In
        <TouchableOpacity
          style={styles.GoogleContinueButtonTouchable}
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            promptAsync();
          }}
        >
          <LinearGradient
            colors={['#DB4437', '#E57373']}
            style={styles.GoogleContinueButton}
            start={[1, 1.3]}
            end={[1, 0]}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.GoogleContinueText}>Continue with Google</Text>
              <FontAwesome
                name="google"
                size={20}
                color="#ffffff"
                style={styles.icon}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>
        */}

        {/* Redirect to Sign In */}
        <TouchableOpacity
          style={styles.signUpRedirect}
          onPress={async () => {
          }}
        >
          <Text style={styles.signUpRedirectText}>
            Signing in with Apple makes it easy to sync MacroScan across all your devices. You can't use MacroScan without an Apple Account.
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getDynamicStyles = (colorScheme) =>
  StyleSheet.create({
    view: {
      flexGrow: 1,
      backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
      paddingHorizontal: 20,
    },
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
    },
    title: {
      fontSize: isIphoneSE() ? 28 : 30,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#fff' : '#333',
      textAlign: 'center',
      marginTop: '10%',
      marginBottom: 20,
      zIndex: 1,
    },
    descriptionContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    description: {
      fontSize: 20,
      fontWeight: '400',
      color: colorScheme === 'dark' ? '#EEE' : '#666',
      textAlign: 'center',
      marginBottom: '0%',
    },
    logoContainer: {
      alignItems: 'center',
      marginTop: isIphoneSE() ? 45 : 100,
    },
    logoBackground: {
      marginTop: '0%',
      backgroundColor: '#FFF',
      borderRadius: 32,
      padding: 0,
      shadowColor: colorScheme === 'dark' ? '#fff' : '#000',
      shadowOffset: { width: 0, height: 15 },
      shadowOpacity: 0.25,
      shadowRadius: 15.84,
      elevation: 10,
    },
    logo: {
      width: 125,
      height: 125,
    },
    AppleContinueButtonTouchable: {
      width: '100%', // Preserving original width
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20, // Preserving original border radius
      marginTop: isIphoneSE() ? 10 : 0, // Preserving original marginTop
      marginBottom: 10, // Preserving original marginBottom
    },
    AppleContinueButton: {
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#000',
      borderRadius: 20, // Preserving original border radius
      borderWidth: 2, // Preserving original border width
      borderColor: colorScheme === 'dark' ? '#222' : '#bbb', // Preserving original border color
      padding: 12, // Preserving original padding
      height: 55, // Preserving original height
      maxHeight: 60, // Preserving original maxHeight
      paddingHorizontal: 25, // Preserving original paddingHorizontal
      shadowColor: colorScheme === 'dark' ? '#000' : '#AAA',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 15,
      elevation: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: '1%',
    },
    AppleContinueText: {
      color: colorScheme === 'dark' ? '#d8d8d8' : '#fff',
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '600',
    },
    GoogleContinueButtonTouchable: {
      width: '75%', // Preserving original width
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 200, // Preserving original border radius
      marginTop: 20, // Preserving original marginTop
      marginBottom: 60, // Preserving original marginBottom
    },
    GoogleContinueButton: {
      width: '100%', // Preserving original width
      height: 55, // Preserving original height
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 200, // Preserving original border radius
      shadowColor: colorScheme === 'dark' ? '#000' : '#AAA',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 15,
      elevation: 1,
    },
    GoogleContinueText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: 18,
      textAlign: 'center',
    },
    signUpRedirect: {
      marginBottom: '50%',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    signUpRedirectText: {
      width: '90%',
      textAlign: 'center',
      fontSize: 15,
      color: colorScheme === 'dark' ? '#777' : '#000',
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      marginLeft: 10, // Preserving original margin between text and icon
    },
  });