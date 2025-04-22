// FeaturesScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  SafeAreaView,
  LayoutAnimation,
  UIManager,
  Platform,
  Dimensions,
  Alert,
  Appearance,
  Animated,
  ActionSheetIOS,
  Picker,
  Modal,
  FlatList,
  Switch,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as RNIap from 'react-native-iap';
import { useIAP } from '../IAPContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedCenteredText from './AnimatedCenteredText';
import AnimatedTextOnboarding from './AnimatedTextOnboarding';
import { MODELS, getModel } from './providers/models';
import Superwall from '@superwall/react-native-superwall';
import { useUser } from '../userContext';
import SearchModeInfoSheet from './SearchModeInfoSheet';
import TipsInfoSheet from './TipsInfoSheet';
import CircleToScanInfoSheet from './CircleToScanInfoSheet';
import { Svg, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DEBUG_MOCK_UNLIMITED = false;
const { width, height } = Dimensions.get('window');

// Calculate scale factor based on screen size for consistent UI
const baseWidth = 430; // iPhone 14 Pro Max width
const baseHeight = 932; // iPhone 14 Pro Max height
const scaleWidth = width / baseWidth;
const scaleHeight = height / baseHeight;
const scale = Math.min(scaleWidth, scaleHeight);

// Helper function to detect older iPhone sizes
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
      (dim) =>
        (width === dim.width && height === dim.height) ||
        (width === dim.height && height === dim.width)
    )
  );
};

// Modern background component with blur and gradient effects
const Background = ({ isDark }) => {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={
          isDark
            ? ['#121212', '#262626', '#121212']
            : ['#f8f9fa', '#e9ecef', '#f8f9fa']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <BlurView
        style={StyleSheet.absoluteFill}
        tint={isDark ? 'dark' : 'light'}
        intensity={20}
      />
    </View>
  );
};

// Modify the SearchIcon component to accept styles as prop
const SearchIcon = ({ iconStyles }) => (
  <View style={{
    width: width * 0.11,
    height: width * 0.11,
    borderRadius: 12 * scale,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="grad1" cx="25%" cy="25%" r="80%" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#FFB74D" stopOpacity="1" />
          <Stop offset="100%" stopColor="#FFB74D" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="grad2" cx="75%" cy="30%" r="70%" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#FF5252" stopOpacity="1" />
          <Stop offset="100%" stopColor="#FF5252" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="grad3" cx="50%" cy="60%" r="75%" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#42A5F5" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#42A5F5" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="grad4" cx="65%" cy="75%" r="60%" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#AB47BC" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#AB47BC" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad1)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad2)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad3)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad4)" />
    </Svg>
    <Ionicons name="search" size={width * 0.055} color="#FFFFFF" style={{
      position: 'absolute',
      zIndex: 1,
    }} />
  </View>
);

// Add CircleToScanIcon component
const CircleToScanIcon = ({ iconStyles }) => (
  <View style={{
    width: width * 0.11,
    height: width * 0.11,
    borderRadius: 12 * scale,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15 * scale
  }}>
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="circleGrad1" cx="30%" cy="25%" r="80%" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#4FACFE" stopOpacity="1" />
          <Stop offset="100%" stopColor="#4FACFE" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="circleGrad2" cx="70%" cy="30%" r="70%" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#00F2FE" stopOpacity="1" />
          <Stop offset="100%" stopColor="#00F2FE" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="circleGrad3" cx="45%" cy="60%" r="75%" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#6A82FB" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#6A82FB" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="circleGrad4" cx="60%" cy="75%" r="60%" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#985EFF" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#985EFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#circleGrad1)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#circleGrad2)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#circleGrad3)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#circleGrad4)" />
    </Svg>
    <Ionicons name="scan-circle-outline" size={width * 0.055} color="#FFFFFF" style={{
      position: 'absolute',
      zIndex: 1,
    }} />
  </View>
);

const FeaturesScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getDynamicStyles(colorScheme);
  const { isIAPEnabled } = useIAP();
  const { user } = useUser();
  const insets = useSafeAreaInsets(); // Get safe area insets

  // Models: 'Complex Processing' is paywalled in the UI,
  // but we'll force it behind the scenes when user picks Accurate Mode.
  const MODEL_TYPES = {
    DEFAULT: 'Default Processing',
    COMPLEX: 'Complex Processing'
  };

  // Basic state
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [selectedMode, setSelectedMode] = useState('fast');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [debugUnlocked] = useState(DEBUG_MOCK_UNLIMITED);
  const [foodSelectionEnabled, setFoodSelectionEnabled] = useState(false);
  const [isFirstDayUnlimited, setIsFirstDayUnlimited] = useState(false);
  const initialCheckDoneRef = useRef(false);
  const [showSearchModeInfo, setShowSearchModeInfo] = useState(false);
  const previousModeRef = useRef(selectedMode);
  const [showTipsInfoSheet, setShowTipsInfoSheet] = useState(false);
  const [showCircleToScanInfoSheet, setShowCircleToScanInfoSheet] = useState(false);

  // For splash animation when screen appears
  const splashAnim = useRef(new Animated.Value(0)).current;

  // Individual item animations
  const descTextAnim = useRef(new Animated.Value(0)).current;
  const modeButtonFastAnim = useRef(new Animated.Value(0)).current;
  const modeButtonAccurateAnim = useRef(new Animated.Value(0)).current;
  const modeButtonSearchAnim = useRef(new Animated.Value(0)).current;
  const separatorAnim = useRef(new Animated.Value(0)).current; // Animate separator too
  const magicHeaderAnim = useRef(new Animated.Value(0)).current;
  const circleToggleAnim = useRef(new Animated.Value(0)).current;
  const tipsTouchableAnim = useRef(new Animated.Value(0)).current;

  // For animating the mode buttons
  const scaleValues = {
    fast: useRef(new Animated.Value(1)).current,
    accurate: useRef(new Animated.Value(1)).current,
    search: useRef(new Animated.Value(1)).current,
  };
  const buttonBackgroundColors = {
    fast: useRef(new Animated.Value(0)).current,
    accurate: useRef(new Animated.Value(0)).current,
    search: useRef(new Animated.Value(0)).current,
  };
  const buttonBorderColors = {
    fast: useRef(new Animated.Value(0)).current,
    accurate: useRef(new Animated.Value(0)).current,
    search: useRef(new Animated.Value(0)).current,
  };

  // Subscription IDs to check
  const SUBSCRIPTION_IDS = [
    'macroscan_plusplus',
    'macroscan_plusplus_yearly',
    'macroscan_unlimited',
  ];

  // Status bar configuration
  useEffect(() => {
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
    
    // Entrance animation
    Animated.timing(splashAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start(); // Start splash animation immediately

    // Start staggered animation after a short delay (e.g., 300ms)
    const staggerTimeout = setTimeout(() => {
      Animated.stagger(80, [ // Shorten stagger delay for more items
        Animated.spring(descTextAnim, { // Animate description text
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(modeButtonFastAnim, { // Animate fast mode button
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(modeButtonAccurateAnim, { // Animate accurate mode button
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(modeButtonSearchAnim, { // Animate search mode button
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(separatorAnim, { // Animate separator
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(magicHeaderAnim, { // Animate magic header
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(circleToggleAnim, { // Animate circle toggle
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(tipsTouchableAnim, { // Animate tips touchable
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    return () => {
      // Reset animation when component unmounts
      splashAnim.setValue(0);
      // Clear the timeout if the component unmounts before it fires
      clearTimeout(staggerTimeout);
    };
  }, [isDark, splashAnim]);

  useEffect(() => {
    const initializeFeatures = async () => {
      try {
        // First check first day unlimited status
        const today = new Date().toISOString().slice(0, 10);
        const firstUseDate = await AsyncStorage.getItem('firstUseDate');
        
        let isFirstDay = false;
        if (!firstUseDate) {
          await AsyncStorage.setItem('firstUseDate', today);
          isFirstDay = true;
        } else {
          isFirstDay = firstUseDate === today;
        }
        setIsFirstDayUnlimited(isFirstDay);

        // Load saved mode
        const savedMode = await AsyncStorage.getItem('selectedMode') || 'fast';
        setSelectedMode(savedMode);

        // Load food selection setting
        const foodSelection = await AsyncStorage.getItem('foodSelectionEnabled');
        setFoodSelectionEnabled(foodSelection === 'true');

        // Animate the selected mode button after loading
        setTimeout(() => {
          Object.keys(buttonBackgroundColors).forEach((mode) => {
            animateButtonSelection(mode, mode === savedMode);
          });
        }, 100);
      } catch (error) {
        console.error('Error initializing features:', error);
      }
    };

    initializeFeatures();
  }, [isIAPEnabled]);

  // Add subscription checking effect
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        let isSubscribedUnlimited = false;
    
        if (isIAPEnabled) {
          if (Platform.OS === 'ios') {
            // Ensure initConnection is called before using getReceiptIOS
            await RNIap.initConnection();
            // Retrieve the receipt data
            const receipt = await RNIap.getReceiptIOS({ forceRefresh: true });
    
            if (!receipt) {
              console.error('No receipt available');
            } else {
              // Send the receipt data to the cloud function
              const response = await fetch(
                'https://us-central1-weighty-works-420523.cloudfunctions.net/verifyReceipt2',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ receiptData: receipt }),
                }
              );
    
              // Check if the response is OK
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.isSubscribed) {
                  const productId = data.productId;
                  if (
                    ['macroscan_plusplus', 'macroscan_plusplus_yearly', 'macroscan_unlimited'].includes(productId)
                  ) {
                    isSubscribedUnlimited = true;
                  }
                } else {
                  console.log('Receipt validation failed:', data.message);
                }
              } else {
                const responseText = await response.text();
                console.error('Server Error:', response.status, responseText);
              }
            }
          } else {
            // Handle Android platform if necessary
            isSubscribedUnlimited = false;
          }
        } else {
          // If IAP is not enabled, rely on user context
          if (
            user?.subscriptionStatus === 'macroscan_unlimited' ||
            user?.subscriptionStatus === 'macroscan_plusplus'
          ) {
            isSubscribedUnlimited = true;
          }
        }
    
        setIsUnlocked(isSubscribedUnlimited);
      } catch (error) {
        console.error('Failed to check subscription status:', error);
        setIsUnlocked(false);
      }
    };

    let isMounted = true;
    let checkInterval;

    // Only do initial check if we haven't done it yet
    if (!initialCheckDoneRef.current) {
      checkSubscription();
      initialCheckDoneRef.current = true;
    }

    // Set up interval for periodic checks (every 5 minutes)
    checkInterval = setInterval(() => {
      if (isMounted) {
        checkSubscription();
      }
    }, 300000); // 5 minutes

    // Cleanup function
    return () => {
      isMounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [isIAPEnabled, user]); // Only depend on isIAPEnabled and user changes

  // Remove the separate effects for checking status and loading settings
  useEffect(() => {
    // Only animate mode buttons when they change
    Object.keys(buttonBackgroundColors).forEach((mode) => {
      animateButtonSelection(mode, mode === selectedMode);
    });
  }, [selectedMode]);

  // Add this new function to handle the toggle
  const handleFoodSelectionToggle = async (value) => {
    try {
      // Check for incompatibility with Deep Search Mode
      if (value === true && selectedMode === 'search') {
        Alert.alert(
          'Incompatible Features',
          'Circle to Scan cannot be used with Deep Search Mode while in beta.',
          [{ text: 'OK' }]
        );
        return; // Prevent enabling
      }

      if (!isUnlocked && !isFirstDayUnlimited && value) {
        // Show upgrade alert with paywall
        Alert.alert(
          'Unlock Required',
          'Circle to Scan is only available with MacroScan Unlimited.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Upgrade',
              onPress: () => {
                navigation.navigate('FoodScan', { showPaywall: true });
              },
            },
          ]
        );
        return;
      }
      
      if (value) {
        // If enabling, show the info sheet
        setShowCircleToScanInfoSheet(true);
        // We'll save the setting after the user closes the info sheet
      } else {
        // If disabling, directly update the state and storage
        await AsyncStorage.setItem('foodSelectionEnabled', 'false');
        setFoodSelectionEnabled(false);
        Haptics.selectionAsync();
      }
    } catch (error) {
      console.error('Error saving food selection setting:', error);
    }
  };

  // Handle changing the scanning mode
  const handleModeChange = async (mode) => {
    const currentMode = selectedMode;
    previousModeRef.current = currentMode;

    try {
      if (mode === 'search') {
        // Directly activate Search Mode 
        await AsyncStorage.setItem('selectedMode', mode);
        setSelectedMode(mode);
        await AsyncStorage.removeItem('selectedModel'); // Search mode doesn't need model
        
        // Disable Circle to Scan if it was enabled
        if (foodSelectionEnabled) {
          setFoodSelectionEnabled(false);
          await AsyncStorage.setItem('foodSelectionEnabled', 'false');
          console.log('Disabled Circle to Scan due to switching to Deep Search Mode.');
        }

        Haptics.selectionAsync();
        // Animate the button selection
        animateButtonSelection(mode, true);
        animateButtonSelection(currentMode, false);
        return; // Exit early
      }

      if (mode === 'accurate') {
        if (isUnlocked || isFirstDayUnlimited) {
          await AsyncStorage.setItem('selectedMode', mode);
          setSelectedMode(mode);
          await AsyncStorage.setItem('selectedModel', MODELS[selectedProvider].complex);
          Haptics.selectionAsync();
          if (isFirstDayUnlimited && !isUnlocked) { 
             Alert.alert(
              'First Day Unlimited Access',
              "Today you have unlimited accurate scans! Starting tomorrow, you'll only get one accurate scan per day unless you upgrade."
            );
          }
          // Animate the button selection
          animateButtonSelection(mode, true);
          animateButtonSelection(currentMode, false);
        } else {
          const freeAccurateScansUsed = await AsyncStorage.getItem('freeAccurateScansUsed');
          if (freeAccurateScansUsed === '1') {
            Alert.alert(
              'Daily Limit Reached',
              'You have already used your daily Accurate Mode scan. Please wait until tomorrow or upgrade for unlimited scans.'
            );
            // Don't change state or animate if limit reached
          } else {
            Alert.alert(
              'Heads Up!',
              'You only get one accurate scan a day on the free plan, so make it count!',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'OK',
                  onPress: async () => {
                    await AsyncStorage.setItem('selectedMode', mode);
                    setSelectedMode(mode);
                    await AsyncStorage.setItem('selectedModel', MODELS[selectedProvider].complex);
                    Haptics.selectionAsync();
                    // Animate the button selection
                    animateButtonSelection(mode, true);
                    animateButtonSelection(currentMode, false);
                  },
                },
              ],
              { cancelable: false }
            );
          }
        }
      } else { // Fast mode
        await AsyncStorage.setItem('selectedMode', mode);
        setSelectedMode(mode);
        await AsyncStorage.setItem('selectedModel', MODELS[selectedProvider].regular);
        Haptics.selectionAsync();
        // Animate the button selection
        animateButtonSelection(mode, true);
        animateButtonSelection(currentMode, false);
      }
    } catch (error) {
      console.error('Error handling mode change:', error);
      setSelectedMode(previousModeRef.current); // Revert visual state on error
      animateButtonSelection(previousModeRef.current, true);
      animateButtonSelection(mode, false);
    }
  };

  // Animate button color & border changes
  const animateButtonSelection = (mode, selected) => {
    const duration = 200;
    Animated.timing(buttonBackgroundColors[mode], {
      toValue: selected ? 1 : 0,
      duration,
      useNativeDriver: false,
    }).start();
    Animated.timing(buttonBorderColors[mode], {
      toValue: selected ? 1 : 0,
      duration,
      useNativeDriver: false,
    }).start();
  };

  // Re-introduce the renderScanModeButton function
  const renderScanModeButton = (mode, icon, title, description, isBeta = false) => {
    const scaleValue = scaleValues[mode];
    
    const backgroundColor = buttonBackgroundColors[mode].interpolate({
      inputRange: [0, 1],
      outputRange: [
        'transparent',
        isDark ? 'rgba(40, 40, 46, 0.7)' : 'rgba(240, 240, 240, 0.7)',
      ],
    });
    
    const borderColor = buttonBorderColors[mode].interpolate({
      inputRange: [0, 1],
      outputRange: [
        isDark ? '#333' : '#ddd',
        isDark ? '#007AFF' : '#007AFF',
      ],
    });

    const handlePressIn = () => {
      Animated.spring(scaleValue, {
        toValue: 0.97,
        useNativeDriver: true, // Keep scale native
        friction: 8,
        tension: 150,
      }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handlePressOut = () => {
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 5,
        tension: 150,
        useNativeDriver: true, // Keep scale native
      }).start();
      // Actually change the mode on release
      handleModeChange(mode);

      // Switch animations for the selected/deselected states
      Object.keys(buttonBackgroundColors).forEach((m) => {
        animateButtonSelection(m, m === mode);
      });
    };
    
    const isSelected = mode === selectedMode;

    return (
      <TouchableWithoutFeedback
        key={mode}
        onPressIn={isSelected ? undefined : handlePressIn}
        onPressOut={isSelected ? undefined : handlePressOut}
        disabled={isSelected}
      >
        <Animated.View
          style={[
            styles.modeButton,
            {
              backgroundColor: 'transparent',
              borderWidth: 0,
              transform: [{ scale: scaleValue }],
            },
          ]}
        >
          <Animated.View 
            style={[
              StyleSheet.absoluteFill, 
              { 
                backgroundColor,
                borderColor,
                borderWidth: styles.modeButton.borderWidth,
                borderRadius: styles.modeButton.borderRadius,
              }
            ]} 
          />
          
          <View style={styles.modeButtonContent}>
            {mode === 'search' ? (
              <View style={{ marginRight: 15 * scale }}>
                <SearchIcon iconStyles={styles} />
              </View>
            ) : (
              <View style={[
                styles.modeIconContainer,
                isSelected && { 
                  backgroundColor: isDark ? 'rgba(60, 60, 62, 0.9)' : 'rgba(230, 230, 235, 0.9)'
                }
              ]}>
                <Ionicons
                  name={icon}
                  size={24 * scale}
                  color={isDark ? '#FFF' : '#000'}
                />
              </View>
            )}
            <View style={styles.modeTextContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.modeButtonTitle}>{title}</Text>
                {isBeta && (
                  <View style={styles.betaContainer}>
                    <Text style={styles.betaTag}>BETA</Text>
                  </View>
                )}
              </View>
              <Text style={styles.modeButtonDescription}>{description}</Text>
            </View>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      
      {/* Animated content container */}
      <Animated.View style={{
        flex: 1,
        opacity: splashAnim,
      }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons
                name="chevron-back"
                size={24 * scale}
                color={isDark ? '#FFF' : '#000'}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <AnimatedTextOnboarding 
              text="Scanner Settings" 
              colorScheme={isDark ? 'dark' : 'light'}
              style={styles.title}
            />
          </View>
          <View style={styles.headerRight} />
        </View>

        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ // Animate description text
            opacity: descTextAnim,
            transform: [{
              translateY: descTextAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] })
            },
            {
              scale: descTextAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] })
            }]
          }}>
            <Text style={styles.sectionDescription}>
              Choose between quick results (Fast Mode) or detailed analysis (Accurate Mode).
            </Text>
          </Animated.View>

          <View style={styles.modeButtonsContainer}>
            <Animated.View style={{ // Animate fast button
              opacity: modeButtonFastAnim,
              transform: [
                { translateY: modeButtonFastAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
                { scale: modeButtonFastAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }
              ]
            }}> 
              {renderScanModeButton(
                'fast',
                'flash',
                'Default Mode',
                'Instant results • Good for packaged foods • Quick tracking'
              )}
            </Animated.View>
            <Animated.View style={{ // Animate accurate button
              opacity: modeButtonAccurateAnim,
              transform: [
                { translateY: modeButtonAccurateAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
                { scale: modeButtonAccurateAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }
              ]
            }}> 
              {renderScanModeButton(
                'accurate',
                'shield-checkmark',
                'Accurate Mode',
                'Detailed analysis • Best for homemade meals • Uses Complex Reasoning',
              )}
            </Animated.View>
            <Animated.View style={{ // Animate search button
              opacity: modeButtonSearchAnim,
              transform: [
                { translateY: modeButtonSearchAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
                { scale: modeButtonSearchAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }
              ]
            }}> 
              {renderScanModeButton(
                'search',
                'search-circle',
                'Deep Search Mode',
                'Automatic web search • Finds detailed info • Slower, Beta feature',
                true // isBeta - Only search mode has beta tag now
              )}
            </Animated.View>
          </View>
          
          {/* Separator before the new section */}
          <Animated.View style={{ // Animate separator
            opacity: separatorAnim,
            transform: [
              { translateY: separatorAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
              { scale: separatorAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }
            ]
          }}>
            <View style={styles.separator} />
          </Animated.View>

          {/* New Experimental Features Section */}
          <Animated.View style={{ // Animate magic header
            opacity: magicHeaderAnim,
            transform: [
              { translateY: magicHeaderAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
              { scale: magicHeaderAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }
            ]
          }}>
            <View style={styles.sectionHeader}>
              <AnimatedTextOnboarding
                text="Magic Features"
                colorScheme={isDark ? 'dark' : 'light'}
                style={styles.sectionHeaderText}
              />
            </View>
            
            {/* Food Selection Toggle */}
            {(!isUnlocked && !isFirstDayUnlimited) ? (
              <TouchableOpacity
                onPress={async () => {
                  await Superwall.shared.register('locked-fortune');
                }}
              >
                <View style={[styles.toggleContainer, styles.toggleContainerLocked]}>
                  {/* Removed BlurView */}
                  <CircleToScanIcon iconStyles={styles} />
                  <View style={styles.toggleTextContainer}>
                    <View style={styles.toggleHeaderContainer}>
                      <Text style={styles.toggleLabel}>Circle to Scan</Text>
                      <View style={[styles.betaContainer, styles.betaContainerInline]}>
                        <Text style={styles.betaTag}>BETA</Text>
                      </View>
                      <Ionicons
                        name="lock-closed"
                        size={16 * scale}
                        color={isDark ? '#666' : '#999'}
                        style={{ marginLeft: 5 * scale }}
                      />
                    </View>
                    <Text style={styles.toggleDescription}>
                      Circle an item to scan that selection for nutrients and avoid the rest of the image
                    </Text>
                  </View>
                  <Switch
                    value={false}
                    disabled={true}
                    trackColor={{ false: '#767577', true: '#34C759' }}
                    thumbColor={'#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                  />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.toggleContainer}>
                {/* Removed BlurView */}
                <CircleToScanIcon iconStyles={styles} />
                <View style={styles.toggleTextContainer}>
                  <View style={styles.toggleHeaderContainer}>
                    <Text style={styles.toggleLabel}>Circle to Scan</Text>
                    <View style={[styles.betaContainer, styles.betaContainerInline]}>
                      <Text style={styles.betaTag}>BETA</Text>
                    </View>
                  </View>
                  <Text style={styles.toggleDescription}>
                  Draw a circle around any food item to scan only that selection for nutrients
                  </Text>
                </View>
                <Switch
                  value={foodSelectionEnabled}
                  onValueChange={handleFoodSelectionToggle}
                  trackColor={{ false: '#767577', true: '#34C759' }}
                  thumbColor={foodSelectionEnabled ? '#FFFFFF' : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                />
              </View>
            )}

            {/* Updated TouchableOpacity for Tips */}
            <Animated.View style={{ // Animate tips touchable
              opacity: tipsTouchableAnim,
              transform: [
                { translateY: tipsTouchableAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
                { scale: tipsTouchableAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }
              ]
            }}> 
              <TouchableOpacity onPress={() => setShowTipsInfoSheet(true)} activeOpacity={0.7}>
                <View style={styles.tipContainer}>
                  <View style={styles.tipIconContainer}>
                    <Ionicons name="bulb" size={20 * scale} color={isDark ? '#FFD700' : '#FFA000'} />
                  </View>
                  {/* Shortened text */}
                  <Text style={styles.bottomNote} numberOfLines={2}>
                    Tap here for tips on using scan modes and Circle to Scan effectively.
                  </Text>
                  <Ionicons name="chevron-forward" size={20 * scale} color={isDark ? '#AAA' : '#777'} style={{marginLeft: 8 * scale}} />
                </View>
              </TouchableOpacity>
            </Animated.View>

          </Animated.View>

        </ScrollView>
      </Animated.View>

      {/* Search Mode Info Sheet */}
      <SearchModeInfoSheet
        visible={showSearchModeInfo}
        onClose={() => {
          setShowSearchModeInfo(false);
          // If user closes without confirming, revert the mode selection
          if (selectedMode === 'search') {
             setSelectedMode(previousModeRef.current);
             animateButtonSelection(previousModeRef.current, true);
             animateButtonSelection('search', false);
          }
        }}
        onRevertChip={() => {
          // This is called when user taps "Not Now" or swipes down
          setShowSearchModeInfo(false);
          // Revert the mode selection
          setSelectedMode(previousModeRef.current);
          animateButtonSelection(previousModeRef.current, true);
          animateButtonSelection('search', false);
        }}
        onGetStarted={async () => {
          // This is called when user taps "Get Started"
          setShowSearchModeInfo(false);
          try {
            await AsyncStorage.setItem('hasConfirmedSearchMode', 'true');
            await AsyncStorage.setItem('selectedMode', 'search');
            // Search mode doesn't use the Complex/Default model selector logic
            await AsyncStorage.removeItem('selectedModel');
            setSelectedMode(previousModeRef.current);
            // Keep selectedMode as 'search' (already set tentatively)
            // Ensure animation state reflects the final selection
            animateButtonSelection('search', true); 
            animateButtonSelection(previousModeRef.current, false);
          } catch (error) {
            console.error('Error saving search mode confirmation:', error);
            // Revert if saving fails
            setSelectedMode(previousModeRef.current);
             animateButtonSelection(previousModeRef.current, true);
             animateButtonSelection('search', false);
          }
        }}
      />

      {/* Tips Info Sheet */}
      <TipsInfoSheet 
        visible={showTipsInfoSheet} 
        onClose={() => setShowTipsInfoSheet(false)} 
        // Use onGetStarted to handle the primary action (closing the sheet)
        onGetStarted={() => setShowTipsInfoSheet(false)} 
      />
      
      {/* Circle to Scan Info Sheet */}
      <CircleToScanInfoSheet
        visible={showCircleToScanInfoSheet}
        onClose={() => setShowCircleToScanInfoSheet(false)}
        onGetStarted={async () => {
          setShowCircleToScanInfoSheet(false);
          // Save the setting after seeing the info
          await AsyncStorage.setItem('foodSelectionEnabled', 'true');
          setFoodSelectionEnabled(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />

    </View>
  );
};

const getDynamicStyles = (colorScheme) => {
  const isDark = colorScheme === 'dark';
  const baseStyles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: isDark ? '#000' : '#FFF', // Set solid background
    },
    container: {
      flex: 1,
      paddingHorizontal: 20 * scale,
    },
    contentContainer: {
      paddingBottom: 30 * scale,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: isIphoneSE() ? 10 * scale : 5 * scale,
      paddingHorizontal: 20 * scale,
      height: 60 * scale,
    },
    headerLeft: {
      width: 50 * scale,
      alignItems: 'flex-start',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerRight: {
      width: 50 * scale,
      alignItems: 'flex-end',
    },
    backButton: {
      backgroundColor: isDark ? 'rgba(42, 42, 45, 0.7)' : 'rgba(255, 255, 255, 0.7)',
      borderRadius: 30 * scale,
      padding: 10 * scale,
      borderWidth: 1 * scale,
      borderColor: isDark ? 'rgba(80, 80, 85, 0.5)' : 'rgba(230, 230, 230, 0.5)',
      // Removed shadows
    },
    title: {
      fontSize: 26 * scale,
      fontWeight: 'bold',
      color: isDark ? '#FFF' : '#000',
      // Removed text shadows
    },
    sectionDescription: {
      fontSize: 16 * scale,
      color: isDark ? '#BBB' : '#666',
      marginBottom: 20 * scale,
      textAlign: 'center',
      marginTop: 8 * scale,
      lineHeight: 22 * scale,
    },
    modeButtonsContainer: {
      marginTop: 15 * scale,
      marginBottom: 15 * scale,
    },
    modeButton: {
      borderRadius: 16 * scale,
      marginBottom: 12 * scale,
      borderWidth: 1.5 * scale,
      borderColor: isDark ? '#333' : '#ddd', // Default border color
      overflow: 'hidden',
      // Removed shadows
    },
    modeButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16 * scale,
    },
    modeIconContainer: {
      backgroundColor: isDark ? 'rgba(60, 60, 62, 0.8)' : 'rgba(240, 240, 240, 0.9)',
      padding: 12 * scale,
      borderRadius: 12 * scale,
      marginRight: 15 * scale,
    },
    modeTextContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    modeButtonTitle: {
      fontSize: 17 * scale,
      fontWeight: '600',
      color: isDark ? '#FFF' : '#000',
      marginBottom: 4 * scale,
    },
    modeButtonDescription: {
      fontSize: 14 * scale,
      color: isDark ? '#BBB' : '#666',
      lineHeight: 19 * scale,
    },
    separator: {
      height: 1 * scale,
      backgroundColor: isDark ? 'rgba(80, 80, 85, 0.5)' : 'rgba(200, 200, 200, 0.5)',
      marginVertical: 20 * scale,
    },
    sectionHeader: {
      marginBottom: 15 * scale,
    },
    sectionHeaderText: {
      fontSize: 18 * scale,
      fontWeight: '600',
      color: isDark ? '#FFF' : '#000',
      marginBottom: 8 * scale,
    },
    // Remove searchIconContainer and searchIconOverlay styles
    tipContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 15 * scale,
      marginBottom: 25 * scale,
      backgroundColor: isDark ? 'rgba(42, 42, 45, 0.7)' : 'rgba(255, 255, 255, 0.7)',
      padding: 16 * scale,
      borderRadius: 16 * scale,
      borderWidth: 1 * scale,
      borderColor: isDark ? 'rgba(80, 80, 85, 0.5)' : 'rgba(230, 230, 230, 0.9)',
    },
    tipIconContainer: {
      marginRight: 12 * scale,
    },
    bottomNote: {
      flex: 1,
      fontSize: 14 * scale,
      color: isDark ? '#BBB' : '#666',
      lineHeight: 20 * scale,
    },
    toggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 16 * scale,
      marginBottom: 20 * scale,
      borderWidth: 1 * scale,
      borderColor: isDark ? 'rgba(80, 80, 85, 0.5)' : 'rgba(200, 200, 200, 0.5)',
      overflow: 'hidden',
      padding: 16 * scale,
    },
    toggleContainerLocked: {
      opacity: 0.8,
    },
    toggleIconContainer: {
      backgroundColor: isDark ? 'rgba(60, 60, 62, 0.8)' : 'rgba(240, 240, 240, 0.9)',
      padding: 12 * scale,
      borderRadius: 12 * scale,
      marginRight: 15 * scale,
    },
    toggleTextContainer: {
      flex: 1,
      marginRight: 10 * scale,
    },
    toggleHeaderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4 * scale,
    },
    toggleLabel: {
      fontSize: 16 * scale,
      fontWeight: '600',
      color: isDark ? '#FFF' : '#000',
    },
    toggleDescription: {
      fontSize: 14 * scale,
      color: isDark ? '#BBB' : '#666',
      lineHeight: 19 * scale,
    },
    betaContainer: {
      marginLeft: 8 * scale,
      paddingHorizontal: 8 * scale,
      paddingVertical: 2 * scale,
      borderRadius: 8 * scale,
      backgroundColor: 'transparent',
      borderWidth: 1 * scale,
      borderColor: '#007AFF',
    },
    betaContainerInline: {
      marginBottom: 0,
      marginLeft: 8 * scale,
    },
    betaTag: {
      fontSize: 12 * scale,
      color: '#007AFF',
      fontWeight: '600',
    },
  });
  return baseStyles;
};

export default FeaturesScreen;