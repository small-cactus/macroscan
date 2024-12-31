import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Appearance } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // Added import
import { FontAwesome } from '@expo/vector-icons'; // Added import for Font Awesome
import AnimatedTextLoading from './AnimatedTextLoading'; // Adjust the path as necessary

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

export default function SignInScreen({ navigation }) {
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const styles = getDynamicStyles(colorScheme);
  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.View}>
      <View style={styles.logoContainer}>
        <View style={styles.logoBackground}>
          <Image source={require('../assets/icon.png')} style={styles.logo} />
        </View>
      </View>
      <AnimatedTextLoading
          text="Welcome to MacroScan"
          colorScheme={colorScheme}
          style={styles.title}
        />
      <AnimatedTextLoading
          text="The easiest way to track macros"
          colorScheme={colorScheme}
          style={styles.description}
        />

      <View style={styles.container}></View>
      <View style={styles.container}>
        {/* Make the entire gradient clickable by wrapping LinearGradient inside TouchableOpacity */}
        <TouchableOpacity
          style={styles.SignUpButtonTouchable}
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('SignUp');
          }}
        >
          <LinearGradient
            colors={['#101010', '#555']}
            style={styles.SignUpButton}
            start={[1, 1.3]}
            end={[1, 0]}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.SignUpText}>Get Started</Text>
              <FontAwesome
                name="arrow-right"
                size={16}
                color={colorScheme === 'dark' ? '#d8d8d8' : '#fff'}
                style={styles.arrowIcon}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.SignInButton}
          onPress={async () => {
          }}
        >
          <Text style={styles.SignInText}>You'll need to sign in with your Apple ID on the next screen.</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  View: {
    flexGrow: 1,
    backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
  },
  title: {
    fontSize: isIphoneSE() ? 28 : 30,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#fff' : '#333',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: '10%',
    zIndex: 1,
  },
  button: {
    width: '80%',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: isIphoneSE() ? 10 : 0,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
  },
  buttonText: {
    color: colorScheme === 'dark' ? '#e9e9e9' : '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoContainer: {
    marginTop: isIphoneSE() ? 45 : 100,
    alignItems: 'center',
    marginBottom: '0',
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
  SignUpButton: {
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#000',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colorScheme === 'dark' ? '#222' : '#bbb',
    padding: 12,
    height: 55,
    maxHeight: 60,
    paddingHorizontal: 25,
    shadowColor: colorScheme === 'dark' ? '#000' : '#AAA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  SignUpButtonTouchable: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20, // Ensure the touchable area matches the gradient's border radius
  },
  SignUpText: {
    color: colorScheme === 'dark' ? '#d8d8d8' : '#fff',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  SignInButton: {
    marginTop: 20,
    marginBottom: '70%',
    width: '100%',
    alignItems: 'center',
  },
  SignInText: {
    width: '80%',
    textAlign: 'center',
    fontSize: 15,
    color: colorScheme === 'dark' ? '#777' : '#000',
  },
  description: {
    fontSize: 20,
    fontWeight: '400',
    color: colorScheme === 'dark' ? '#EEE' : '#666',
    textAlign: 'center',
    marginBottom: '0%',
  },
  buttonContent: { // Added style for button content
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: { // Added style for the arrow icon
    marginLeft: 8, // Adjust spacing between text and icon as needed
  },
});