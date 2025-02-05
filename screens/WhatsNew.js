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
    title: 'Circle to Scan',
    description: 'Draw circles to isolate and analyze specific foods in your photos.',
    icon: 'scan-circle-outline',
    iconLibrary: 'Ionicons',
    color: '#000',
    isBeta: true,
    isOffByDefault: true,
  },
  {
    title: 'Barcode Scanning',
    description: 'Barcodes are automatically detected and analyzed with AI to fill in missing info.',
    icon: 'barcode-outline',
    iconLibrary: 'Ionicons',
    color: '#30D158',
    isBeta: false,
  },
  {
    title: 'History Search & Filters',
    description: 'New search and filter options for your scan history.',
    icon: 'search',
    iconLibrary: 'Ionicons',
    color: '#0A84FF',
    isBeta: false,
  },
  {
    title: 'Daily Limit Tracking UI',
    description: 'Overlimit warnings and a new UI for your daily limit.',
    icon: 'stats-chart',
    iconLibrary: 'Ionicons',
    color: '#FFD60A',
    isBeta: true,
  },
  {
    title: 'Free Accurate Scans',
    description: 'Everyone gets one free accurate scan per day.',
    icon: 'star',
    iconLibrary: 'Ionicons',
    color: '#BF5AF2',
    isBeta: false,
    isOffByDefault: true,
  },
  {
    title: 'Home Screen Redesign',
    description: 'Fresh, intuitive scanning interface with smart guides for seamless nutrition tracking.',
    icon: 'grid',
    iconLibrary: 'Ionicons',
    color: '#FF9F0A',
    isBeta: false,
  },
  {
    title: 'Responsive UI Improvements',
    description: 'Pixel-perfect layouts from tiny phones to massive tablets. It just works.',
    icon: 'devices',
    iconLibrary: 'MaterialIcons',
    color: '#64D2FF',
    isBeta: false,
  },
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
  
  // Add animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rocketAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(1)).current;
  const [isVisible, setIsVisible] = React.useState(false);
  const [showFinalMessage, setShowFinalMessage] = React.useState(false);
  
  // Add feature animations array
  const featureAnimations = useRef(updates.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Wait 1 second before starting animations
    const timer = setTimeout(() => {
      setIsVisible(true);
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      // Rocket wiggle animation
      Animated.sequence([
        Animated.delay(200), // Wait a bit after fade starts
        Animated.spring(rocketAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Stagger animate features
      Animated.stagger(70, 
        featureAnimations.map(anim =>
          Animated.spring(anim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true
          })
        )
      ).start();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const rocketWiggle = rocketAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['0deg', '-10deg', '10deg', '-10deg', '0deg'],
  });

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Configure the layout animation
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });

    // Fade out content
    Animated.timing(contentFadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowFinalMessage(true);
      // After 2 seconds with the final message, close the modal
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onClose());
      }, 2000);
    });
  };

  if (!isVisible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
      <BlurView
        intensity={30}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        style={[StyleSheet.absoluteFill, styles.container]}
      >
        <View style={styles.errorCard}>
          <BlurView
            intensity={showFinalMessage ? 90 : 90}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={[
              styles.errorCardContent,
              showFinalMessage && { 
                backgroundColor: 'transparent',
                borderWidth: 0,
                padding: 12 * scale,
                height: 60 * scale // Add fixed height for final message
              }
            ]}
          >
            {!showFinalMessage ? (
              <Animated.View style={{ opacity: contentFadeAnim, width: '100%' }}>
                <View style={styles.headerContainer}>
                  <Animated.View style={[styles.rocketContainer, { transform: [{ rotate: rocketWiggle }] }]}>
                    <Icon
                      name="sparkles" 
                      size={28} 
                      color={colorScheme === 'dark' ? '#007AFF' : '#0A84FF'} 
                    />
                  </Animated.View>
                  <Text style={[
                    styles.title,
                    { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
                  ]}>
                    wow, updates! updates!
                  </Text>
                </View>
                
                <Text style={[
                  styles.subtitle,
                  { color: colorScheme === 'dark' ? '#CCCCCC' : '#666666' }
                ]}>
                  This is what's new in version 1.6.0
                </Text>

                <ScrollView 
                  style={styles.updatesList}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.updatesContent}
                >
                  {updates.map((update, index) => (
                    <Animated.View 
                      key={index} 
                      style={[
                        styles.updateItem,
                        {
                          opacity: featureAnimations[index],
                          transform: [
                            {
                              translateY: featureAnimations[index].interpolate({
                                inputRange: [0, 1],
                                outputRange: [50, 0]
                              })
                            },
                            {
                              scale: featureAnimations[index].interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.8, 1]
                              })
                            }
                          ]
                        }
                      ]}
                    >
                      <LinearGradient
                        colors={[
                          update.color,
                          adjustBrightness(update.color, colorScheme === 'dark' ? -20 : 20)
                        ]}
                        style={[styles.iconContainer]}
                      >
                        {update.iconLibrary === 'Ionicons' && (
                          <Icon
                            name={update.icon}
                            size={22 * scale}
                            color="#FFFFFF"
                          />
                        )}
                        {update.iconLibrary === 'MaterialCommunityIcons' && (
                          <MaterialCommunityIcons
                            name={update.icon}
                            size={22 * scale}
                            color="#FFFFFF"
                          />
                        )}
                        {update.iconLibrary === 'MaterialIcons' && (
                          <MaterialIcon
                            name={update.icon}
                            size={22 * scale}
                            color="#FFFFFF"
                          />
                        )}
                      </LinearGradient>
                      <View style={styles.updateText}>
                        <View style={styles.updateTitleContainer}>
                          <Text style={[
                            styles.updateTitle,
                            { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
                          ]}>
                            {update.title}
                          </Text>
                          {update.isBeta && (
                            <View style={styles.betaContainer}>
                              <Text style={styles.betaTag}>BETA</Text>
                            </View>
                          )}
                          {update.isOffByDefault && (
                            <View style={styles.offByDefaultContainer}>
                              <Text style={styles.offByDefaultTag}>OFF BY DEFAULT</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[
                          styles.updateDescription,
                          { color: colorScheme === 'dark' ? '#CCCCCC' : '#666666' }
                        ]}>
                          {update.description}
                        </Text>
                      </View>
                    </Animated.View>
                  ))}
                </ScrollView>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={styles.button}
                    onPress={handleClose}
                  >
                    <BlurView
                      intensity={60}
                      tint={colorScheme === 'dark' ? 'dark' : 'light'}
                      style={styles.buttonBlur}
                    >
                      <View style={styles.buttonContent}>
                        <Icon 
                          name="rocket" 
                          size={20} 
                          color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} 
                        />
                        <Text style={[
                          styles.buttonText,
                          { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
                        ]}>
                          Let's Go!
                        </Text>
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ) : (
              <AnimatedTextLoading
                text="See features in Settings for more"
                colorScheme={colorScheme}
                style={[
                  styles.title,
                  { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
                ]}
              />
            )}
          </BlurView>
        </View>
      </BlurView>
    </Animated.View>
  );
};

// Calculate scale factor based on screen size
const getStyles = (colorScheme) =>
  StyleSheet.create({
    container: {
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    errorCard: {
      width: '90%',
      maxWidth: 400 * scale,
      borderRadius: 30 * scale,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
    },
    errorCardContent: {
      padding: 24 * scale,
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8 * scale,
      gap: 8 * scale,
    },
    rocketContainer: {
      marginBottom: 0,
    },
    title: {
      fontSize: 22 * scale,
      fontWeight: '600',
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16 * scale,
      fontWeight: '400',
      textAlign: 'center',
      marginBottom: 24 * scale,
      lineHeight: 22 * scale,
    },
    updatesList: {
      maxHeight: 400 * scale,
      width: '100%',
    },
    updatesContent: {
      paddingHorizontal: 4 * scale,
    },
    updateItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 20 * scale,
      width: '100%',
    },
    iconContainer: {
      width: 40 * scale,
      height: 40 * scale,
      borderRadius: 12 * scale,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12 * scale,
    },
    updateText: {
      flex: 1,
    },
    updateTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8 * scale,
    },
    updateTitle: {
      fontSize: 16 * scale,
      fontWeight: '600',
      marginBottom: 4 * scale,
    },
    updateDescription: {
      fontSize: 14 * scale,
      lineHeight: 20 * scale,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      width: '100%',
      marginTop: 8 * scale,
    },
    button: {
      flex: 1,
      borderRadius: 15 * scale,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
    },
    buttonBlur: {
      paddingVertical: 12 * scale,
      paddingHorizontal: 24 * scale,
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    buttonText: {
      fontSize: 16 * scale,
      fontWeight: '600',
    },
    betaContainer: {
      backgroundColor: colorScheme === 'dark' ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)',
      bottom: 2 * scale,
      borderRadius: 4 * scale,
      paddingHorizontal: 6 * scale,
      paddingVertical: 2 * scale,
    },
    betaTag: {
      color: '#007AFF',
      fontSize: 10 * scale,
      fontWeight: '600',
    },
    offByDefaultContainer: {
      backgroundColor: colorScheme === 'dark' ? 'rgba(255, 69, 58, 0.15)' : 'rgba(255, 69, 58, 0.1)',
      bottom: 2 * scale,
      borderRadius: 4 * scale,
      paddingHorizontal: 6 * scale,
      paddingVertical: 2 * scale,
    },
    offByDefaultTag: {
      color: '#FF453A',
      fontSize: 10 * scale,
      fontWeight: '600',
    },
  });

export default WhatsNew; 