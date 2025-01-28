import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  Dimensions,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { Appearance } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { FontAwesome } from '@expo/vector-icons';
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
      dim =>
        (width === dim.width && height === dim.height) ||
        (width === dim.height && height === dim.width)
    )
  );
};

export default function GoodbyeScreen({ navigation }) {
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const [buttonScaleAnim] = useState(new Animated.Value(1));
  const [secondaryButtonScaleAnim] = useState(new Animated.Value(1));
  const styles = getDynamicStyles(colorScheme);

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

  const handleSecondaryPressIn = () => {
    Animated.spring(secondaryButtonScaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handleSecondaryPressOut = () => {
    Animated.spring(secondaryButtonScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleExit = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  };

  const handleEmail = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const email = 'macroscan.help@gmail.com';
    const subject = encodeURIComponent('Need Help');
    const body = encodeURIComponent('Hello MacroScan Support,\n\nI need help with...');
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
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
            text="Goodbye, User."
            colorScheme={colorScheme}
            style={styles.title}
          />
          <AnimatedTextLoading
            text="We hope to see you again soon"
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
              onPress={handleExit}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <LinearGradient
                colors={colorScheme === 'dark' ? ['#2a2a2a', '#1a1a1a'] : ['#000', '#333']}
                style={styles.SignUpButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.buttonContent}>
                  <Text style={styles.SignUpText}>Sign up again</Text>
                  <FontAwesome
                    name="arrow-right"
                    size={16}
                    color={colorScheme === 'dark' ? '#d8d8d8' : '#fff'}
                    style={styles.arrowIcon}
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity 
            style={styles.helpButton}
            onPress={handleEmail}
          >
            <Text style={styles.helpText}>Need help? Contact support</Text>
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
  secondaryButton: {
    marginTop: 16,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#444',
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
  helpButton: {
    marginTop: 20,
    padding: 12,
  },
  helpText: {
    fontSize: 15,
    color: colorScheme === 'dark' ? '#999' : '#666',
    textAlign: 'center',
  },
});