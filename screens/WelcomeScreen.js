import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Appearance } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import AnimatedTextLoading from './AnimatedTextLoading';

const { width, height } = Dimensions.get('window');

export default function SignInScreen({ navigation }) {
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const [buttonScaleAnim] = useState(new Animated.Value(1));
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
            text="This is MacroScan"
            colorScheme={colorScheme}
            style={styles.title}
          />
          <AnimatedTextLoading
            text="The easiest way to track your daily macros"
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
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('OnBoardingScreen');
              }}
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
          </Animated.View>

          <TouchableOpacity style={styles.SignInButton}>
            <Text style={styles.SignInText}>
              Get ready to transform how you track nutrition
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const getDynamicStyles = (colorScheme) => {
  const isSmallScreen = height < 700; // Adjust breakpoint as needed
  const isLargeScreen = height > 800;
  
  return StyleSheet.create({
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
      fontSize: width * 0.07, // 7% of screen width
      fontWeight: '800',
      color: colorScheme === 'dark' ? '#fff' : '#000',
      textAlign: 'center',
      marginBottom: height * 0.02, // 2% of screen height
      letterSpacing: -0.5,
      padding: 4,
    },
    logoContainer: {
      alignItems: 'center',
      marginTop: height * 0.1, // 10% of screen height
    },
    logoBackground: {
      backgroundColor: '#FFF',
      borderRadius: 32,
      padding: 0,
      shadowColor: colorScheme === 'dark' ? '#fff' : '#000',
      shadowOffset: { width: 0, height: height * 0.02 }, // 2% of height
      shadowOpacity: colorScheme === 'dark' ? 0.15 : 0.25,
      shadowRadius: height * 0.02, // 2% of height
      elevation: 10,
    },
    logo: {
      width: width * 0.3, // 30% of screen width
      height: width * 0.3,
    },
    SignUpButton: {
      borderRadius: 16,
      padding: height * 0.02, // 2% of height
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: height * 0.005 },
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
      fontSize: width * 0.045, // 4.5% of width
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    SignInButton: {
      marginTop: 20,
      padding: 12,
    },
    SignInText: {
      fontSize: width * 0.035, // 3.5% of width
      color: colorScheme === 'dark' ? '#999' : '#666',
      textAlign: 'center',
    },
    description: {
      fontSize: height < 830 ? width * 0.044 : width * 0.045, // 3.4% or 4.5% of width
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#999' : '#666',
      textAlign: 'center',
      marginBottom: height * 0.2, // 20% of height
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
};