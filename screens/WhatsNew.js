import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  useColorScheme,
  Platform,
  ScrollView,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import AnimatedTextLoading from './AnimatedTextLoading';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');
const baseWidth = 430; // iPhone 14 Pro Max width
const baseHeight = 932; // iPhone 14 Pro Max height
const scaleWidth = width / baseWidth;
const scaleHeight = height / baseHeight;
const scale = Math.min(scaleWidth, scaleHeight);

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const updates = [
  {
    title: 'Unlimited Features Unlocked! 🎉',
    description: 'For the next 24 hours, enjoy unlimited access to all premium features:\n\n• Unlimited Accurate Scans\n• Advanced Nutrition Insights\n• Detailed Macro Breakdowns\n• Premium AI Analysis\n\nNo catch, no strings attached - just try everything!',
    icon: 'gift',
    iconLibrary: 'MaterialCommunityIcons',
    color: '#FF2D55',
    isSpecialOffer: true,
  }
];

// Helper function to adjust color brightness
const adjustBrightness = (color, percent) => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
};

const WhatsNew = ({ onClose }) => {
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);
  const lottieRef = useRef(null);
  
  const blurFadeAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const giftAnim = useRef(new Animated.Value(0)).current;
  const featureAnimations = useRef([0,1,2,3].map(() => new Animated.Value(0))).current;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      
      // First animate the background blur
      Animated.timing(blurFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        // Then start the confetti
        if (lottieRef.current) {
          lottieRef.current.play();
        }
        
        // After a short delay, fade in the content
        setTimeout(() => {
          // Fade in the content
          Animated.timing(contentFadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }).start();

          // Gift bounce animation
          Animated.spring(giftAnim, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }).start();

          // Stagger animate features
          Animated.stagger(100, 
            featureAnimations.map(anim =>
              Animated.spring(anim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true
              })
            )
          ).start();
        }, 400); // Delay before content appears
      });
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const giftBounce = giftAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 1.2, 0.9, 1.1, 1],
  });

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Fade out content first
    Animated.parallel([
      Animated.timing(contentFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(blurFadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Call onClose after animations complete
      onClose();
    });
  };

  if (!isVisible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: blurFadeAnim }]}>
        <BlurView
          intensity={30}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, styles.container]}
        />
      </Animated.View>

      <LottieView
        ref={lottieRef}
        source={require('../assets/animations/confetti.json')}
        style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
        autoPlay={false}
        loop={false}
      />

      <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity: contentFadeAnim }]}>
        <View style={styles.card}>
          <LinearGradient
            colors={colorScheme === 'dark' 
              ? ['rgba(21, 21, 21, 0.95)', 'rgba(14, 14, 14, 0.95)']
              : ['rgba(255, 255, 255, 0.95)', 'rgba(238, 238, 238, 0.95)']}
            style={styles.cardContent}
          >
            <View style={styles.headerContainer}>
              <Animated.View style={[styles.giftContainer, { transform: [{ scale: giftBounce }] }]}>
                <LinearGradient
                  colors={['#FF2D55', '#FF375F']}
                  style={styles.giftIconGradient}
                >
                  <MaterialCommunityIcons
                    name="gift"
                    size={32 * scale}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </Animated.View>
              <Text style={[
                styles.title,
                { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
              ]}>
                Special Gift For You!
              </Text>
            </View>

            <Text style={[
              styles.description,
              { color: colorScheme === 'dark' ? '#CCCCCC' : '#666666' }
            ]}>
              For the next 24 hours, enjoy unlimited access to all premium features:
            </Text>

            <View style={styles.featuresList}>
              {[
                { 
                  icon: 'infinity', 
                  color: '#FF2D55',
                  text: 'Unlimited Accurate Scans',
                  subtitle: 'Scan any food or meal with perfect accuracy',
                  gradient: ['#FF2D55', '#FF6482'],
                  gradientStart: { x: 0, y: 0 },
                  gradientEnd: { x: 1, y: 1 }
                },
                { 
                  icon: 'chart-box', 
                  color: '#30D158',
                  text: 'Advanced Nutrition Insights',
                  subtitle: 'Deep analysis of your nutritional patterns',
                  gradient: ['#2DCE55', '#4AE87C'],
                  gradientStart: { x: 0, y: 1 },
                  gradientEnd: { x: 1, y: 0 }
                },
                { 
                  icon: 'chart-donut', 
                  color: '#0A84FF',
                  text: 'Detailed Macro Breakdowns',
                  subtitle: 'Track proteins, carbs, fats, and micronutrients',
                  gradient: ['#0A84FF', '#60AEFF'],
                  gradientStart: { x: 1, y: 0 },
                  gradientEnd: { x: 0, y: 1 }
                },
                { 
                  icon: 'brain', 
                  color: '#BF5AF2',
                  text: 'Premium AI Analysis',
                  subtitle: 'Get personalized nutrition recommendations',
                  gradient: ['#BF5AF2', '#DA8FFF'],
                  gradientStart: { x: 0, y: 0 },
                  gradientEnd: { x: 1, y: 1 }
                },
              ].map((feature, index) => (
                <Animated.View
                  key={index}
                  style={{
                    opacity: featureAnimations[index],
                    transform: [
                      {
                        translateY: featureAnimations[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0]
                        })
                      }
                    ],
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    marginBottom: 20 * scale,
                  }}
                >
                  <View style={[styles.featureIconContainer, { shadowColor: feature.color }]}>
                    <LinearGradient
                      colors={feature.gradient}
                      start={feature.gradientStart}
                      end={feature.gradientEnd}
                      style={styles.featureIcon}
                    >
                      <MaterialCommunityIcons
                        name={feature.icon}
                        size={20 * scale}
                        color="#FFFFFF"
                      />
                    </LinearGradient>
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={[
                      styles.feature,
                      { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
                    ]}>
                      {feature.text}
                    </Text>
                    <Text style={[
                      styles.featureSubtitle,
                      { color: colorScheme === 'dark' ? '#999999' : '#666666' }
                    ]}>
                      {feature.subtitle}
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.button}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={colorScheme === 'dark' 
                  ? ['#FFFFFF', '#F0F0F0']
                  : ['#000000', '#1A1A1A']}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <MaterialCommunityIcons 
                    name="rocket-launch" 
                    size={20 * scale} 
                    color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} 
                  />
                  <Text style={[
                    styles.buttonText,
                    { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }
                  ]}>
                    Start Exploring!
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Animated.View>
    </View>
  );
};

// Calculate scale factor based on screen size
const getStyles = (colorScheme) =>
  StyleSheet.create({
    container: {
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
      overflow: 'hidden',
    },
    card: {
      width: '90%',
      maxWidth: 400 * scale,
      borderRadius: 35 * scale,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
      zIndex: 2000,
      shadowColor: colorScheme === 'dark' ? '#000000' : '#000000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 8,
    },
    cardContent: {
      padding: 24 * scale,
      alignItems: 'center',
      zIndex: 2000,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 28 * scale,
      gap: 12 * scale,
      zIndex: 2000,
    },
    giftContainer: {
      width: 56 * scale,
      height: 56 * scale,
      borderRadius: 15 * scale,
      overflow: 'hidden',
      shadowColor: '#FF2D55',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    giftIconGradient: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 26 * scale,
      fontWeight: '700',
      textAlign: 'center',
    },
    description: {
      fontSize: 16 * scale,
      lineHeight: 24 * scale,
      textAlign: 'center',
      marginBottom: 24 * scale,
      opacity: 0.8,
    },
    featuresList: {
      width: '100%',
      paddingHorizontal: 16 * scale,
      marginBottom: 32 * scale,
    },
    featureTextContainer: {
      flex: 1,
      marginLeft: 16 * scale,
    },
    feature: {
      fontSize: 16 * scale,
      lineHeight: 22 * scale,
      fontWeight: '600',
      marginBottom: 4 * scale,
    },
    featureSubtitle: {
      fontSize: 14 * scale,
      lineHeight: 18 * scale,
      opacity: 0.8,
    },
    featureIconContainer: {
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    featureIcon: {
      width: 40 * scale,
      height: 40 * scale,
      borderRadius: 12 * scale,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    button: {
      width: '100%',
      borderRadius: 24 * scale,
      overflow: 'hidden',
      shadowColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
      zIndex: 3000,
    },
    buttonGradient: {
      paddingVertical: 16 * scale,
      paddingHorizontal: 24 * scale,
      zIndex: 3000,
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10 * scale,
      zIndex: 3000,
    },
    buttonText: {
      fontSize: 18 * scale,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
  });

export default WhatsNew; 