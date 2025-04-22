// SearchModeInfoSheet.js

// Explantion of search scans:
// 1. The user selects Search Mode (beta)
// 2. The app will use AI to automatically search the web for nutrient info about the food in their image
// 3. It takes a long time sometimes
// 4. It is in beta so results may not be good all the time

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Modal,
  SafeAreaView,
  Platform,
  NativeModules,
  FlatList,
  ScrollView
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Svg, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
  useDerivedValue,
  cancelAnimation,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Calculate scale factor based on screen size
const baseWidth = 430; // iPhone 14 Pro Max width
const baseHeight = 932; // iPhone 14 Pro Max height
const scaleWidth = width / baseWidth;
const scaleHeight = height / baseHeight;
const scale = Math.min(scaleWidth, scaleHeight);

const SearchModeInfoSheet = ({ visible, onClose, onRevertChip, onGetStarted }) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scrollRef = useRef(null);
  const [activePage, setActivePage] = useState(0);
  
  // Set iOS display to 120Hz for animations if available
  useEffect(() => {
    if (Platform.OS === 'ios') {
      if (NativeModules.DisplayLink) {
        // Request 120hz refresh rate on ProMotion devices
        NativeModules.DisplayLink.setPreferredFramesPerSecond(120);
      }
    }
    
    return () => {
      // Reset to default when component unmounts
      if (Platform.OS === 'ios' && NativeModules.DisplayLink) {
        NativeModules.DisplayLink.setPreferredFramesPerSecond(60);
      }
    };
  }, []);
  
  // Reanimated shared values for animations
  const slideAnim = useSharedValue(height);
  const overlayOpacity = useSharedValue(0);
  const blurAnim = useSharedValue(0);
  const panY = useSharedValue(0);
  
  // For pagination dot animation
  const dotPosition = useSharedValue(0);
  
  // Track blur intensity in state
  const [blurIntensity, setBlurIntensity] = React.useState(0);
  
  // Update blur intensity when blurAnim changes
  useDerivedValue(() => {
    runOnJS(setBlurIntensity)(Math.round(blurAnim.value));
  }, [blurAnim]);

  // handleClose now triggers the animation first
  const handleClose = (revert = true) => {
    if (revert && onRevertChip) {
      onRevertChip();
    } else {
      // Play success haptic when "Get Started" is clicked
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Call onGetStarted callback when "Get Started" is clicked
      if (onGetStarted) {
        onGetStarted();
      }
    }
    
    // Make sure we complete the animation before calling onClose
    // First animate down
    slideAnim.value = withTiming(height, {
      duration: 300,
    }, (finished) => {
      if (finished) {
        // Only call onClose after animation completes
        runOnJS(onClose)();
      }
    });
    
    // Also animate opacity and blur
    overlayOpacity.value = withTiming(0, { 
      duration: 300 
    });
    blurAnim.value = withTiming(0, { 
      duration: 300 
    });
  };
  
  // Separate animateOut function now only used for gesture dismissal
  const animateOut = useCallback((callback) => {
    // Use the right timing configuration for 120hz
    const animConfig = {
      duration: 300,
    };
    
    // Run all animations in parallel
    slideAnim.value = withTiming(height, animConfig);
    overlayOpacity.value = withTiming(0, animConfig);
    blurAnim.value = withTiming(0, animConfig);
    panY.value = withTiming(0, animConfig, (finished) => {
      if (finished && callback) {
        // Reset values after animation completes
        slideAnim.value = height;
        overlayOpacity.value = 0;
        blurAnim.value = 0;
        panY.value = 0;
        
        runOnJS(callback)();
      }
    });
  }, [slideAnim, overlayOpacity, blurAnim, panY]);

  // useEffect for handling visibility changes
  useEffect(() => {
    if (visible) {
      // Reset values before animating in
      slideAnim.value = height;
      overlayOpacity.value = 0;
      blurAnim.value = 0;
      panY.value = 0;
      
      // Spring animation for the slide, configured for 120Hz with less bounce
      slideAnim.value = withSpring(0, {
        velocity: 20,
        stiffness: 125,
        damping: 20,
        overshootClamping: false,
        restDisplacementThreshold: 0.1,
        restSpeedThreshold: 0.1,
      });
      
      // Timing animations for opacity and blur
      overlayOpacity.value = withTiming(0.3, { duration: 400 });
      blurAnim.value = withTiming(10, { duration: 400 });
    }
  }, [visible, slideAnim, overlayOpacity, blurAnim, panY]);

  // Auto-scroll to second page after 5 seconds
  // useEffect(() => {
  //   let autoScrollTimer;
    
  //   if (visible && activePage === 0) {
  //     autoScrollTimer = setTimeout(() => {
  //       // Use a smoother animation for automatic scrolling
  //       setActivePage(1);
  //       // Animate dot position with a gentler spring
  //       dotPosition.value = withSpring(1, {
  //         damping: 100,
  //         stiffness: 100,
  //         mass: 100,
  //         velocity: 100,
  //         duration: 7000,
  //       });
  //       // Scroll with animated timing for smoother effect
  //       scrollRef.current?.scrollTo({
  //         x: width,
  //         animated: true,
  //         duration: 3000,
  //       });
  //     }, 1000); // Increased delay to 6.5 seconds
  //   }
    
  //   return () => {
  //     if (autoScrollTimer) {
  //       clearTimeout(autoScrollTimer);
  //     }
  //   };
  // }, [visible, activePage]);

  // Gesture handler with Reanimated
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startY = panY.value;
    },
    onActive: (event, ctx) => {
      // Only allow downward dragging or slight upward movement
      if (event.translationY >= -height * 0.1) {
        panY.value = ctx.startY + event.translationY;
      }
    },
    onEnd: (event, ctx) => {
      if (event.translationY > height * 0.2) {
        // If dragged down far enough, close the sheet
        if (onRevertChip) {
          runOnJS(onRevertChip)();
        }
        runOnJS(animateOut)(onClose);
      } else {
        // Spring back to original position
        panY.value = withSpring(0, {
          velocity: event.velocityY,
          stiffness: 70,
          damping: 12,
          overshootClamping: false,
          restDisplacementThreshold: 0.1,
          restSpeedThreshold: 0.1,
        });
      }
    }
  });

  // Create animated styles
  const sheetAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ 
        translateY: slideAnim.value + panY.value 
      }],
      opacity: interpolate(
        overlayOpacity.value,
        [0, 0.3],
        [0.8, 1],
        Extrapolate.CLAMP
      )
    };
  });

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value
    };
  });

  // Skip rendering if not visible
  if (!visible && blurIntensity === 0) return null;

  // Define colors based on theme
  const bgColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const secondaryTextColor = isDark ? '#BBBBBB' : '#666666';
  const accentColor = '#007AFF';
  const featureIconBg = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)';

  // Feature data organized by pages
  const featurePages = [
    // Page 1: Features
    [
      {
        icon: "globe",
        title: "Deep Web Search",
        description: "We'll search every website for the exact nutrition info for your food."
      },
      {
        icon: "library",
        title: "Multiple Types of Sources",
        description: "We combine data from food databases, websites, and government sources."
      },
      {
        icon: "information-circle",
        title: "Beta Feature",
        description: "This feature is extremely expensive for me to run. It may take a while to process."
      }
    ],
    // Page 2: Good For / Bad For
    [
      {
        icon: "checkmark-circle",
        title: "Good For",
        description: "Promotional foods, limited time foods, and anything well documented but recent."
      },
      {
        icon: "close-circle",
        title: "Not Ideal For",
        description: "Home made meals and custom creations. Use the standard scanning tools for these."
      },
      {
        icon: "star",
        title: "Best Results",
        description: "The more specific your image is, the better results you'll get from our search."
      }
    ]
  ];

  // Page width for scrolling calculations
  const pageWidth = width * 0.9;

  // Handle page change
  const handlePageChange = (pageIndex) => {
    setActivePage(pageIndex);
    // Animate the dot position with a smoother spring
    dotPosition.value = withSpring(pageIndex, {
      damping: 26,
      stiffness: 85,
      mass: 1.2,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
      duration: 1000,
    });
    // Scroll to the page with a smooth animation
    scrollRef.current?.scrollTo({
      x: pageIndex * width,
      animated: true,
    });
  };

  // Handle scroll to update active page
  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const position = contentOffsetX / width;
    
    // Update dotPosition for smooth animation during scrolling
    dotPosition.value = position;
    
    // Only update active page and trigger haptic when crossing a threshold
    const pageIndex = Math.round(position);
    if (pageIndex !== activePage) {
      setActivePage(pageIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={() => handleClose(true)}
    >
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={StyleSheet.absoluteFill}>
          <BlurView 
            style={[StyleSheet.absoluteFill]}
            intensity={blurIntensity}
            tint={isDark ? "dark" : "light"}
          />
        </Animated.View>
        <Animated.View 
          style={[
            StyleSheet.absoluteFill, 
            { backgroundColor: 'black' },
            overlayAnimatedStyle
          ]} 
        />
      </View>
      <View style={styles.modalContainer} pointerEvents={visible ? 'auto' : 'none'}>
        <PanGestureHandler
          onGestureEvent={gestureHandler}
        >
          <Animated.View 
            style={[
              styles.sheetContainer, 
              { backgroundColor: bgColor },
              sheetAnimatedStyle
            ]}
          >
            {/* Handle indicator */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            <SafeAreaView style={styles.safeArea}>
              {/* Feature Icon / App logo */}
              <View style={styles.iconContainer}>
                <View style={styles.iconGradient}>
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
                  <Ionicons name="search" size={48} color="#FFFFFF" style={styles.iconOverlay} />
                </View>
                <View style={[styles.betaBadge, { backgroundColor: isDark ? '#000' : '#E5E5EA' }]}>
                  <Text style={styles.betaText}>BETA</Text>
                </View>
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: textColor }]}>Deep Search Mode</Text>

              {/* Subtitle */}
              <Text style={[styles.subtitle, { color: secondaryTextColor }]}>Automatically find nutrition info for your food from across the web.</Text>

              {/* Feature list - Horizontal Scrollable */}
              <View style={styles.featureListContainer}>
                <ScrollView
                  ref={scrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  decelerationRate="fast"
                  snapToInterval={width}
                  snapToAlignment="center"
                  contentContainerStyle={styles.scrollContent}
                >
                  {featurePages.map((page, pageIndex) => (
                    <View key={`page-${pageIndex}`} style={styles.featurePage}>
                      {page.map((feature, index) => (
                        <FeatureItem
                          key={`feature-${pageIndex}-${index}`}
                          icon={feature.icon}
                          title={feature.title}
                          description={feature.description}
                          iconBg={featureIconBg}
                          textColor={textColor}
                          secondaryTextColor={secondaryTextColor}
                        />
                      ))}
                    </View>
                  ))}
                </ScrollView>
                
                {/* Pagination Dots */}
                <View style={styles.paginationContainer}>
                  {featurePages.map((_, index) => {
                    return (
                      <PaginationDot
                        key={`dot-${index}`}
                        index={index}
                        dotPosition={dotPosition}
                        accentColor={secondaryTextColor}
                        secondaryTextColor={secondaryTextColor}
                        onPress={() => handlePageChange(index)}
                      />
                    );
                  })}
                </View>
              </View>

              {/* Action buttons */}
              <View style={styles.actionContainer}>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => handleClose(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Get Started</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.secondaryButton}
                  onPress={() => handleClose(true)}
                >
                  <Text style={[styles.secondaryButtonText, { color: accentColor }]}>Not Now</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
};

// Helper component for features
const FeatureItem = ({ icon, title, description, iconBg, textColor, secondaryTextColor }) => (
  <View style={styles.featureItem}>
    <View style={[styles.featureIconContainer, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={width * 0.055} color="#007AFF" />
    </View>
    <View style={styles.featureTextContainer}>
      <Text style={[styles.featureTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.featureDescription, { color: secondaryTextColor }]}>{description}</Text>
    </View>
  </View>
);

// Helper component for pagination dots
const PaginationDot = ({ index, dotPosition, accentColor, secondaryTextColor, onPress }) => {
  // Create animated styles outside the render function
  const animatedDotStyle = useAnimatedStyle(() => {
    const dotWidth = interpolate(
      dotPosition.value,
      [index - 1, index - 0.5, index, index + 0.5, index + 1],
      [width * 0.02, width * 0.03, width * 0.05, width * 0.03, width * 0.02],
      Extrapolate.CLAMP
    );
    
    const opacity = interpolate(
      dotPosition.value,
      [index - 1, index - 0.5, index, index + 0.5, index + 1],
      [0.4, 0.7, 1, 0.7, 0.4],
      Extrapolate.CLAMP
    );
    
    return {
      width: dotWidth,
      opacity,
      backgroundColor: index === Math.round(dotPosition.value) 
        ? accentColor 
        : secondaryTextColor,
    };
  });
  
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.paginationDot,
          animatedDotStyle
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  sheetContainer: {
    height: height * 0.9,
    width: '100%',
    borderTopLeftRadius: 48 * scale,
    borderTopRightRadius: 48 * scale,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: height * 0.015,
  },
  handle: {
    width: width * 0.1,
    height: 5 * scale,
    borderRadius: 3 * scale,
    backgroundColor: '#CECECE',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: width * 0.06,
  },
  iconContainer: {
    marginTop: 20 * scale,
    marginBottom: 20 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconGradient: {
    width: width * 0.22,
    height: width * 0.22,
    borderRadius: 24 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  iconOverlay: {
    position: 'absolute',
    zIndex: 1,
  },
  betaBadge: {
    position: 'absolute',
    bottom: -7 * scale,
    right: -7 * scale,
    borderRadius: 8 * scale,
    overflow: 'hidden',
  },
  betaText: {
    fontSize: 12 * scale,
    color: '#007AFF',
    fontWeight: '700',
    paddingHorizontal: 9 * scale,
    paddingVertical: 3 * scale,
  },
  title: {
    fontSize: width * 0.07,
    fontWeight: 'bold',
    marginBottom: 10 * scale,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18 * scale,
    textAlign: 'center',
    marginBottom: height * 0.045,
    lineHeight: height * 0.03,
    paddingHorizontal: 16 * scale,
  },
  featureListContainer: {
    width: '100%',
    marginBottom: height * 0.03,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  featurePage: {
    width: width,
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.05,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: height * 0.03,
    width: '100%',
    paddingHorizontal: width * 0.02,
  },
  featureIconContainer: {
    width: width * 0.11,
    height: width * 0.11,
    borderRadius: width * 0.055,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: width * 0.04,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: width * 0.04,
    fontWeight: '600',
    marginBottom: height * 0.005,
  },
  featureDescription: {
    fontSize: width * 0.035,
    lineHeight: height * 0.025,
  },
  actionContainer: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: height * 0.02,
  },
  primaryButton: {
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 15,
    height: height * 0.065,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.015,
    width: '90%',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: width * 0.04,
    fontWeight: '600',
  },
  secondaryButton: {
    height: height * 0.055,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: width * 0.04,
    fontWeight: '500',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'absolute',
    bottom: height * 0.01,
    zIndex: 10,
    height: 20 * scale,
  },
  paginationDot: {
    height: 8 * scale,
    borderRadius: 4 * scale,
    marginHorizontal: 4 * scale,
    backgroundColor: '#000',
  },
});

export default SearchModeInfoSheet;