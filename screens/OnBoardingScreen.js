// OnboardingScreen.js

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  FlatList,
  Animated,
  Appearance,
  Platform,
  UIManager,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import AnimatedTextOnboarding from './AnimatedTextOnboarding.js';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FoodCarousel from './FoodCarousel.js';

const { width, height } = Dimensions.get('window');

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const isSmallDevice = height < 700;

const ONBOARDING_STEPS = [
  {
    id: '1',
    title: 'Welcome to MacroScan',
    description: 'Your AI-powered nutrition companion for a healthier lifestyle',
    features: [
      { 
        id: '1-1',
        title: 'Unlimited Scanning',
        description: 'Scan as many meals as you want, whenever you want',
        icon: '🔄'
      },
      { 
        id: '1-2',
        title: 'Smart Recognition',
        description: 'Our AI identifies foods instantly with high accuracy',
        icon: '🔍'
      },
      { 
        id: '1-3',
        title: 'Detailed Nutrition',
        description: 'Get complete macro and micronutrient breakdowns',
        icon: '📊'
      },
      { 
        id: '1-4',
        title: 'Progress Tracking',
        description: 'Monitor your nutrition journey with detailed insights',
        icon: '📈'
      },
      { 
        id: '1-5',
        title: 'AI Coach',
        description: 'Receive personalized nutrition recommendations',
        icon: '🤖'
      },
    ],
  },
  {
    id: '2',
    title: 'Quick & Easy Scanning',
    description: 'Two simple ways to log your meals',
    features: [
      {
        id: '2-1',
        title: 'Take Photo',
        description: 'Snap a picture of your meal in real-time',
        icon: '📸'
      },
      {
        id: '2-2',
        title: 'Choose from Gallery',
        description: 'Select existing photos from your device',
        icon: '🖼️'
      },
    ],
  },
  {
    id: '3',
    title: 'Instant Analysis',
    description: 'Get detailed nutrition information in seconds',
    bottomDescription: 'All results are automatically saved to your history',
  },
  {
    id: '4',
    title: 'Endless Possibilities',
    description: "Unlike most apps, you can scan any food, even brand-new creations, with accurate results",
    showCarousel: true,
    bottomDescription: 'From simple ingredients to complex meals, we have you covered',
  },
];

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const flatListRef = useRef(null);
  const colorScheme = Appearance.getColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getDynamicStyles(isDark);

  // Step 3 state variables
  const [loadingStep3, setLoadingStep3] = useState(true);
  const [step3Loaded, setStep3Loaded] = useState(false);
  const [showBlur, setShowBlur] = useState(false);
  const blurOpacity = useRef(new Animated.Value(0)).current;

  // Loading indicator opacity
  const loadingOpacity = useRef(new Animated.Value(0)).current;

  // Replay button state variables
  const [showReplayButton, setShowReplayButton] = useState(false);
  const replayButtonOpacity = useRef(new Animated.Value(0)).current;

  // New Animated Value for fading out the content
  const savedContentOpacity = useRef(new Animated.Value(1)).current;

  const macronutrientData = [
    { name: 'Calories', value: '450 kcal' },
    { name: 'Protein', value: '25g' },
    { name: 'Carbohydrates', value: '50g' },
    { name: 'Fat', value: '20g' },
    { name: 'Fiber', value: '5g' },
    { name: 'Sugar', value: '10g' },
  ];

  // Initialize Animated.Values for each feature
  const featureAnimValues = useRef(
    ONBOARDING_STEPS[0].features.map(() => new Animated.Value(0))
  ).current;

  // Animated value for the active dot (pill)
  const dotTranslateX = useRef(new Animated.Value(0)).current;

  const dotSize = 8;
  const dotSpacing = 16; // Increased spacing to prevent overlapping
  const activeDotWidth = 24;

  useEffect(() => {
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
  }, [isDark]);

  useEffect(() => {
    if (currentIndex === 0 && !hasAnimated) {
      const animations = featureAnimValues.map((animValue) =>
        Animated.timing(animValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      );
      Animated.stagger(70, animations).start(() => setHasAnimated(true));
    }
  }, [currentIndex, hasAnimated]);

  useEffect(() => {
    const xPosition =
      currentIndex * (dotSize + dotSpacing) - (activeDotWidth - dotSize) / 2;
    Animated.timing(dotTranslateX, {
      toValue: xPosition,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentIndex, dotTranslateX]);

  const navigateHome = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate('HomeTabs', { screen: 'Home' });
    navigation.reset({
      index: 0,
      routes: [{ name: 'HomeTabs' }],
    });
  };

  const showPaywall = () => {
    // Uncomment for production
    // Superwall.shared.register('onboardingV2').then(navigateHome);
    navigateHome();
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      showPaywall();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true,
      });
      setCurrentIndex(currentIndex - 1);
    }
  };

  const timers = useRef([]);

  // Adjusted useEffect for currentIndex === 2
  useEffect(() => {
    if (currentIndex === 2 && !step3Loaded) {
      setLoadingStep3(true);
      loadingOpacity.setValue(0);
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      const timer1 = setTimeout(() => {
        setLoadingStep3(false);
        setStep3Loaded(true);

        Animated.timing(loadingOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();

        const timer2 = setTimeout(() => {
          setShowBlur(true);
          Animated.timing(blurOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }).start(() => {
            // After blur animation completes, wait 1 second before showing the replay button
            const timer3 = setTimeout(() => {
              setShowReplayButton(true);

              // Animate the replay button opacity
              Animated.timing(replayButtonOpacity, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }).start();
            }, 1000);

            timers.current.push(timer3);
          });
        }, 1800);

        timers.current.push(timer2);
      }, 1200);

      timers.current.push(timer1);
    }

    return () => {
      // Clear timers when currentIndex changes or component unmounts
      if (currentIndex !== 2) {
        timers.current.forEach((timer) => clearTimeout(timer));
        timers.current = [];
      }
    };
  }, [currentIndex, step3Loaded, blurOpacity, replayButtonOpacity, loadingOpacity]);

  const renderFeature = ({ item, index }, showAnimation = false, animValue) => {
    const animatedStyle = showAnimation
      ? {
          opacity: animValue,
          transform: [
            {
              translateY: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        }
      : {};

    return (
      <Animated.View style={[styles.featureItem, animatedStyle]} key={item.id}>
        <View style={styles.featureIconContainer}>
          <Text style={styles.featureIcon}>{item.icon}</Text>
        </View>
        <View style={styles.featureTextContainer}>
          <Text style={styles.featureTitle}>{item.title}</Text>
          <Text style={styles.featureDescription}>{item.description}</Text>
        </View>
      </Animated.View>
    );
  };

  // handleReplayAnimation Function
  const handleReplayAnimation = () => {
    Animated.timing(savedContentOpacity, {
      toValue: 0,
      duration: 800,
      useNativeDriver: false,
    }).start(() => {
      // After animation completes
      setShowReplayButton(false);
      // Reset step 3 state variables
      setLoadingStep3(true);
      setStep3Loaded(false);
      setShowBlur(false);
      blurOpacity.setValue(0);
      savedContentOpacity.setValue(1); // Reset opacity
      replayButtonOpacity.setValue(0); // Reset replayButtonOpacity

      // Restart the loading animation
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      const timer1 = setTimeout(() => {
        setLoadingStep3(false);
        setStep3Loaded(true);

        Animated.timing(loadingOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();

        const timer2 = setTimeout(() => {
          setShowBlur(true);
          Animated.timing(blurOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }).start(() => {
            // After blur animation completes, wait 1 second before showing the replay button
            const timer3 = setTimeout(() => {
              setShowReplayButton(true);

              // Animate the replay button opacity
              Animated.timing(replayButtonOpacity, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }).start();
            }, 1000);

            timers.current.push(timer3);
          });
        }, 1500);

        timers.current.push(timer2);
      }, 600);

      timers.current.push(timer1);
    });
  };

  const renderItem = ({ item, index }) => {
    if (index === 2) {
      // Step 3 modifications
      return (
        <View style={styles.slide}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
          {loadingStep3 ? (
            <Animated.View style={[styles.loadingContainer, { opacity: loadingOpacity }]}>
              <ActivityIndicator size="large" color={isDark ? '#FFF' : '#000'} />
              <Text style={styles.description}>Scanning image...</Text>
            </Animated.View>
          ) : (
            <View style={styles.contentContainer}>
              <AnimatedTextOnboarding
                data={macronutrientData}
                colorScheme={isDark ? 'dark' : 'light'}
              />
              {showBlur && (
                <Animated.View style={[styles.blurOverlay, { opacity: blurOpacity }]}>
                  <View style={[styles.blurView, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
                    <Animated.View
                      style={[styles.savedContainer, { opacity: savedContentOpacity }]}
                    >
                      <Ionicons name="checkmark-circle" size={60} color={isDark ? '#FFF' : '#000'} />
                      <Text style={styles.savedText}>Saved to History</Text>

                      <Animated.View style={[styles.replayButtonContainer, { opacity: showReplayButton ? replayButtonOpacity : 0 }]}>
                        <TouchableOpacity onPress={handleReplayAnimation} style={styles.replayButton}>
                          <Text style={styles.replayButtonText}>Replay Animation</Text>
                        </TouchableOpacity>
                      </Animated.View>
                    </Animated.View>
                  </View>
                </Animated.View>
              )}
            </View>
          )}
          {item.bottomDescription && (
            <Text style={styles.bottomDescription}>{item.bottomDescription}</Text>
          )}
        </View>
      );
    } else {
      // Existing code for other steps
      return (
        <View style={styles.slide}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>

          {item.features && (
            <View style={styles.featuresContainer}>
              <ScrollView
                nestedScrollEnabled={true}
                contentContainerStyle={styles.scrollViewContent}
                style={styles.scrollView}
                showsVerticalScrollIndicator={true}
              >
                {item.features.map((feature, idx) =>
                  renderFeature(
                    { item: feature, index: idx },
                    currentIndex === 0 && index === 0,
                    currentIndex === 0 && index === 0 ? featureAnimValues[idx] : null
                  )
                )}
              </ScrollView>
            </View>
          )}

          {item.showCarousel && item.id === '4' && (
            <View style={{ width: '100%', alignItems: 'center' }}>
              <FoodCarousel isDark={isDark} />
            </View>
          )}

          {item.bottomDescription && (
            <Text style={styles.bottomDescription}>{item.bottomDescription}</Text>
          )}
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_STEPS}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(newIndex);
        }}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise((resolve) => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          });
        }}
      />

      <View style={styles.bottomContainer}>
        <View style={styles.progressContainer}>
          <View style={styles.dotsContainer}>
            {ONBOARDING_STEPS.map((_, index) => (
              <View key={index} style={styles.dot} />
            ))}
            <Animated.View
              style={[
                styles.activeDot,
                {
                  position: 'absolute',
                  left: dotTranslateX,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentIndex + 1}/{ONBOARDING_STEPS.length}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.secondaryButton,
              currentIndex === 0 && styles.disabledButton,
            ]}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
          >
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleNext}>
            <Text style={styles.actionButtonText}>
              {currentIndex === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const getDynamicStyles = (isDark) => {
  const dotSize = 8;
  const dotSpacing = 16; // Increased spacing to prevent overlapping
  const activeDotWidth = 24;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: isDark ? '#000' : '#FFF',
    },
    slide: {
      flex: 1,
      width,
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: isSmallDevice ? '5%' : '8%',
    },
    title: {
      fontSize: isSmallDevice ? 24 : 28,
      fontWeight: '700',
      color: isDark ? '#FFF' : '#000',
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      fontSize: isSmallDevice ? 16 : 18,
      color: isDark ? '#CCC' : '#666',
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: isSmallDevice ? 22 : 24,
    },
    bottomDescription: {
      fontSize: isSmallDevice ? 16 : 18,
      color: isDark ? '#CCC' : '#666',
      textAlign: 'center',
      marginTop: 16,
      lineHeight: isSmallDevice ? 22 : 24,
    },
    bottomContainer: {
      padding: 10,
      paddingBottom: Platform.OS === 'ios' ? 20 : 40,
    },
    progressContainer: {
      marginLeft: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    dotsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
      height: activeDotWidth,
    },
    dot: {
      width: dotSize,
      height: dotSize,
      borderRadius: dotSize / 2,
      backgroundColor: isDark ? '#333' : '#E0E0E0',
      marginRight: dotSpacing,
    },
    activeDot: {
      width: activeDotWidth,
      height: dotSize,
      borderRadius: dotSize / 2,
      backgroundColor: isDark ? '#FFF' : '#000',
      // Optionally add shadow or elevation for better visibility
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    },
    progressText: {
      fontSize: 14,
      color: isDark ? '#999' : '#666',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      flex: 1,
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: isDark ? '#FFF' : '#000',
    },
    secondaryButton: {
      backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#000' : '#FFF',
    },
    secondaryButtonText: {
      color: isDark ? '#FFF' : '#000',
    },
    disabledButton: {
      opacity: 0.5,
    },
    featuresContainer: {
      width: '100%',
      marginTop: 8,
      marginBottom: 16,
      flex: 1, // Allows the container to expand
    },
    scrollView: {
      flex: 1, // Ensures the ScrollView takes available space
    },
    scrollViewContent: {
      paddingBottom: 20, // Ensures the last item is accessible
      flexGrow: 1, // Allows content to grow and be scrollable
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      backgroundColor: isDark ? '#1C1C1E' : '#F8F8F8',
      padding: 16,
      borderRadius: 25,
      shadowColor: isDark ? '#000' : '#666',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 0,
    },
    featureIconContainer: {
      width: 50,
      height: 50,
      borderRadius: 15,
      backgroundColor: isDark ? '#2C2C2E' : '#FFF',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    featureIcon: {
      fontSize: 25,
    },
    featureTextContainer: {
      flex: 1,
    },
    featureTitle: {
      fontSize: isSmallDevice ? 16 : 17,
      fontWeight: '600',
      color: isDark ? '#FFF' : '#000',
      marginBottom: 4,
    },
    featureDescription: {
      fontSize: isSmallDevice ? 13 : 14,
      color: isDark ? '#CCC' : '#666',
      lineHeight: isSmallDevice ? 18 : 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contentContainer: {
      flex: 1,
      width: '100%',
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    blurOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1, // Ensure it appears above other elements
    },
    blurView: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    savedContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      height: 200, // Fixed height to prevent layout shifts
    },
    savedText: {
      fontSize: 24,
      color: isDark ? '#FFF' : '#000',
      fontWeight: 'bold',
      marginTop: 16,
    },
    replayButtonContainer: {
      marginTop: 20, // Space allocated for the replay button
      // No additional positioning to prevent pushing up other elements
    },
    replayButton: {
      backgroundColor: isDark ? '#FFF' : '#000',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 25,
    },
    replayButtonText: {
      color: isDark ? '#000' : '#FFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
};

export default OnboardingScreen;