import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
  Animated,
  SafeAreaView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Appearance } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import AnimatedTextLoading from './AnimatedTextLoading';
import FloatingChips from '../components/FloatingChips';

const { width, height } = Dimensions.get('window');

export default function SignInScreen({ navigation }) {
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const [buttonScaleAnim] = useState(new Animated.Value(1));
  const [imageBlurRadius] = useState(new Animated.Value(20)); // Start with blur
  const bottomCardHeight = useRef(new Animated.Value(0)).current;
  const logoBottom = useRef(new Animated.Value(height * 0.05)).current;
  const [cardOpacity] = useState(new Animated.Value(0)); // Start card invisible
  const [logoOpacity] = useState(new Animated.Value(0)); // Start logo invisible
  const [buttonOpacity] = useState(new Animated.Value(0)); // Start buttons invisible
  const [fullScreenBlurRadius] = useState(new Animated.Value(20)); // Start with full blur
  const [bgOverlayOpacity] = useState(new Animated.Value(1)); // White overlay opacity for fade-in effect
  const styles = getDynamicStyles(colorScheme);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });

    // Create staggered animations for a more natural feel
    const startAnimations = () => {
      // First wave - Background and blur effects
      Animated.parallel([
        // Remove background blur with easing
        Animated.timing(imageBlurRadius, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
        // Fade out white overlay with easing
        Animated.timing(bgOverlayOpacity, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
        // Remove full screen blur with easing
        Animated.timing(fullScreenBlurRadius, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]).start();

      // Second wave - Logo animation
      setTimeout(() => {
        Animated.spring(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
          damping: 12,
          stiffness: 100,
        }).start();

        Animated.spring(logoBottom, {
          toValue: height * 0.45 - 40,
          useNativeDriver: false,
          damping: 14,
          stiffness: 100,
          mass: 1,
        }).start();
      }, 200);

      // Third wave - Bottom card animation
      setTimeout(() => {
        Animated.parallel([
          // Fade in the card with easing
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          // Animate card height with refined spring physics
          Animated.spring(bottomCardHeight, {
            toValue: height * 0.45,
            useNativeDriver: false,
            damping: 14,
            stiffness: 100,
            mass: 1,
            restDisplacementThreshold: 0.001,
            restSpeedThreshold: 0.001,
          }),
        ]).start();

        // Fourth wave - Button fade in
        setTimeout(() => {
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }).start();
        }, 800);
      }, 400);
    };

    // Start the animation sequence after a short delay
    setTimeout(startAnimations, 300);

    return () => subscription.remove();
  }, []);

  const handlePressIn = () => {
    Animated.spring(buttonScaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      damping: 12,
      stiffness: 200,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 12,
      stiffness: 200,
    }).start();
  };

  return (
    <View style={styles.container}>
      <BlurView
        style={StyleSheet.absoluteFill}
        intensity={100}
        blurRadius={fullScreenBlurRadius}
        tint={colorScheme}
      />
      <View style={styles.imageContainer}>
        <Image
          source={require('../assets/foodwelcome.jpg')}
          style={styles.image}
          resizeMode='cover'
        />
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(0,0,0,0.1)',
              blurRadius: imageBlurRadius,
            },
          ]}
        />
        <Animated.View 
          style={[
            StyleSheet.absoluteFill, 
            { backgroundColor: '#fff', opacity: bgOverlayOpacity }
          ]}
        />
        <FloatingChips />
      </View>

      <Animated.View 
        style={[
          styles.appIconContainer, 
          { 
            bottom: logoBottom,
            opacity: logoOpacity 
          }
        ]}>
        <Image source={require('../assets/logo4.jpg')} style={styles.appIcon} />
      </Animated.View>

      {/* NEW: Shadow container wrapping the bottom card */}
      <View style={styles.bottomCardShadow}>
        <Animated.View 
          style={[
            styles.bottomCard, 
            { 
              height: bottomCardHeight,
              opacity: cardOpacity,
            }
          ]}>
          <View style={styles.topBorder} />
          <BlurView intensity={100} tint={colorScheme} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)' }]} />
          <View style={styles.contentContainer}>
            <View style={styles.textContainer}>
              <AnimatedTextLoading
                text="This is MacroScan"
                colorScheme={colorScheme}
                style={styles.title}
                delay={1000}
              />
              <AnimatedTextLoading
                text="The easiest way to track your daily macros"
                colorScheme={colorScheme}
                style={styles.description}
                delay={1200}
              />
            </View>

            <Animated.View style={[styles.buttonContainer, { opacity: buttonOpacity }]}>
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
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const getDynamicStyles = (colorScheme) => {
  const isSmallScreen = height < 700;
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#000' : '#fff', // Ensure background is set
    },
    bottomCard: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopLeftRadius: 35,
      borderTopRightRadius: 35,
      paddingTop: 60,
      overflow: 'hidden',
    },
    topBorder: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 35, // Adjust the height as needed
      backgroundColor: colorScheme === 'dark' ? '#00eeff90' : '#0044cc80', // Adjust the color as needed
      overflow: 'visible',
    },
    contentContainer: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    appIconContainer: {
      position: 'absolute',
      alignSelf: 'center',
      zIndex: 1,
      backgroundColor: '#FFF',
      borderRadius: 28,
      padding: 0,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 1,
      shadowRadius: 25,
      elevation: 5,
    },
    appIcon: {
      width: width * 0.2,
      height: width * 0.2,
      borderRadius: 18,
    },
    textContainer: {
      alignItems: 'center',
      marginTop: 24,
    },
    title: {
      fontSize: width * 0.07,
      fontWeight: '800',
      color: colorScheme === 'dark' ? '#fff' : '#000',
      textAlign: 'center',
      marginBottom: 12,
      letterSpacing: -0.5,
    },
    description: {
      fontSize: width * 0.044,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#999' : '#666',
      textAlign: 'center',
      marginBottom: 32,
      letterSpacing: 0.2,
    },
    buttonContainer: {
      width: '100%',
      alignItems: 'center',
      marginTop: 'auto',
      marginBottom: Platform.OS === 'ios' ? 34 : 24,
    },
    SignUpButtonTouchable: {
      width: '100%',
      maxWidth: 400,
    },
    SignUpButton: {
      borderRadius: 16,
      padding: height * 0.02,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    SignUpText: {
      color: '#fff',
      fontSize: width * 0.045,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    arrowIcon: {
      marginLeft: 8,
    },
    SignInButton: {
      marginTop: 16,
      padding: 12,
    },
    SignInText: {
      fontSize: width * 0.035,
      color: colorScheme === 'dark' ? '#999' : '#666',
      textAlign: 'center',
    },
    imageContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    bottomCardShadow: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopLeftRadius: 35,
      borderTopRightRadius: 35,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 1,
      shadowRadius: 10,
      elevation: 10,
    },
  });
};