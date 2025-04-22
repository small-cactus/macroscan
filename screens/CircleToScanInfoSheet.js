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
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Calculate scale factor based on screen size
const baseWidth = 430; // iPhone 14 Pro Max width
const baseHeight = 932; // iPhone 14 Pro Max height
const scaleWidth = width / baseWidth;
const scaleHeight = height / baseHeight;
const scale = Math.min(scaleWidth, scaleHeight);

const CircleToScanInfoSheet = ({ visible, onClose, onGetStarted }) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scrollRef = useRef(null);
  const [activePage, setActivePage] = useState(0);
  
  // Keep base animations for modal presentation
  const slideAnim = useSharedValue(height);
  const overlayOpacity = useSharedValue(0);
  const blurAnim = useSharedValue(0);
  const panY = useSharedValue(0);
  const dotPosition = useSharedValue(0);
  const [blurIntensity, setBlurIntensity] = React.useState(0);
  
  useDerivedValue(() => {
    runOnJS(setBlurIntensity)(Math.round(blurAnim.value));
  }, [blurAnim]);

  // Simplified handleClose
  const handleClose = (getStarted = true) => {
    // Always trigger haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Always animate out the modal
    slideAnim.value = withTiming(height, { duration: 300 }, (finished) => {
      if (finished) {
        // Only call callbacks after animation completes
        if (getStarted && onGetStarted) {
          runOnJS(onGetStarted)();
        }
        runOnJS(onClose)();
      }
    });
    overlayOpacity.value = withTiming(0, { duration: 300 });
    blurAnim.value = withTiming(0, { duration: 300 });
  };
  
  // AnimateOut for gesture dismissal
  const animateOut = useCallback((callback) => {
    const animConfig = { duration: 300 };
    slideAnim.value = withTiming(height, animConfig);
    overlayOpacity.value = withTiming(0, animConfig);
    blurAnim.value = withTiming(0, animConfig);
    panY.value = withTiming(0, animConfig, (finished) => {
      if (finished && callback) {
        slideAnim.value = height;
        overlayOpacity.value = 0;
        blurAnim.value = 0;
        panY.value = 0;
        runOnJS(callback)();
      }
    });
  }, [slideAnim, overlayOpacity, blurAnim, panY]);

  // useEffect for handling visibility changes (modal animation)
  useEffect(() => {
    if (visible) {
      slideAnim.value = height;
      overlayOpacity.value = 0;
      blurAnim.value = 0;
      panY.value = 0;
      
      slideAnim.value = withSpring(0, {
        velocity: 20, stiffness: 125, damping: 20,
        overshootClamping: false, restDisplacementThreshold: 0.1, restSpeedThreshold: 0.1,
      });
      overlayOpacity.value = withTiming(0.3, { duration: 400 });
      blurAnim.value = withTiming(10, { duration: 400 });
    } else {
      // Optionally animate out if needed when visibility changes externally
      // animateOut(onClose); // Or just let the internal handleClose/animateOut manage it
    }
  }, [visible, slideAnim, overlayOpacity, blurAnim, panY]); // Removed animateOut dependency

  // Gesture handler
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => { ctx.startY = panY.value; },
    onActive: (event, ctx) => {
      if (event.translationY >= -height * 0.1) {
        panY.value = ctx.startY + event.translationY;
      }
    },
    onEnd: (event) => {
      if (event.translationY > height * 0.2) {
        runOnJS(handleClose)(false);
      } else {
        panY.value = withSpring(0, {
          velocity: event.velocityY, stiffness: 70, damping: 12,
          overshootClamping: false, restDisplacementThreshold: 0.1, restSpeedThreshold: 0.1,
        });
      }
    }
  });

  // Animated styles for modal
  const sheetAnimatedStyle = useAnimatedStyle(() => ({ 
    transform: [{ translateY: slideAnim.value + panY.value }],
    opacity: interpolate(overlayOpacity.value, [0, 0.3], [0.8, 1], Extrapolate.CLAMP)
  }));
  const overlayAnimatedStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

  if (!visible && blurIntensity === 0) return null;

  const bgColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const secondaryTextColor = isDark ? '#BBBBBB' : '#666666';
  const accentColor = '#007AFF';
  const featureIconBg = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)';
  
  // Feature data (unchanged)
  const featurePages = [
    // ... feature pages data ...
        // Page 1: How to use Circle to Scan
    [
      {
        icon: "scan-circle-outline",
        title: "Draw a Circle",
        description: "Draw a circle around the food item you want to analyze separately."
      },
      {
        icon: "analytics",
        title: "Isolated Analysis",
        description: "We'll scan just that selection and ignore everything else outside your circle."
      },
      {
        icon: "information-circle",
        title: "Beta Feature",
        description: "This feature is in beta and works best with clear, well-defined food items."
      }
    ],
    // Page 2: Tips and best practices
    [
      {
        icon: "sunny",
        title: "Good Lighting",
        description: "Make sure your food is well-lit for the best selection detection."
      },
      {
        icon: "hand-left",
        title: "Draw Carefully",
        description: "Create a complete circle around the item. The circle doesn't need to be perfect."
      },
      {
        icon: "star",
        title: "Best For",
        description: "Perfect for mixed plates, buffets, or when you only want to analyze one part of a meal."
      }
    ]
  ];

  // Page change/scroll handling (unchanged)
  const handlePageChange = (pageIndex) => {
    setActivePage(pageIndex);
    dotPosition.value = withSpring(pageIndex, {
      damping: 26, stiffness: 85, mass: 1.2,
      restDisplacementThreshold: 0.01, restSpeedThreshold: 0.01, duration: 1000,
    });
    scrollRef.current?.scrollTo({ x: pageIndex * width, animated: true });
  };
  const handleScroll = (event) => {
    const position = event.nativeEvent.contentOffset.x / width;
    dotPosition.value = position;
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
      onRequestClose={() => handleClose(false)}
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
      
      {/* Modal Content */}
      <View style={styles.modalContainer} pointerEvents={visible ? 'auto' : 'none'}>
        <PanGestureHandler onGestureEvent={gestureHandler}>
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
                      <RadialGradient id="grad1" cx="30%" cy="25%" r="80%" gradientUnits="userSpaceOnUse">
                        <Stop offset="0%" stopColor="#4FACFE" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#4FACFE" stopOpacity="0" />
                      </RadialGradient>
                      <RadialGradient id="grad2" cx="70%" cy="30%" r="70%" gradientUnits="userSpaceOnUse">
                        <Stop offset="0%" stopColor="#00F2FE" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#00F2FE" stopOpacity="0" />
                      </RadialGradient>
                      <RadialGradient id="grad3" cx="45%" cy="60%" r="75%" gradientUnits="userSpaceOnUse">
                        <Stop offset="0%" stopColor="#6A82FB" stopOpacity="0.9" />
                        <Stop offset="100%" stopColor="#6A82FB" stopOpacity="0" />
                      </RadialGradient>
                      <RadialGradient id="grad4" cx="60%" cy="75%" r="60%" gradientUnits="userSpaceOnUse">
                        <Stop offset="0%" stopColor="#985EFF" stopOpacity="0.8" />
                        <Stop offset="100%" stopColor="#985EFF" stopOpacity="0" />
                      </RadialGradient>
                    </Defs>
                    <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad1)" />
                    <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad2)" />
                    <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad3)" />
                    <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad4)" />
                  </Svg>
                  <Ionicons name="scan-circle-outline" size={60} color="#FFFFFF" style={styles.iconOverlay} />
                </View>
                <View style={[styles.betaBadge, { backgroundColor: isDark ? '#000' : '#E5E5EA' }]}> 
                  <Text style={[styles.betaText, { color: accentColor }]}>BETA</Text>
                </View>
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: textColor }]}>Circle to Scan</Text>

              {/* Subtitle */}
              <Text style={[styles.subtitle, { color: secondaryTextColor }]}>Draw a circle to isolate and analyze specific food items separately.</Text>

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
                          accentColor={accentColor}
                        />
                      ))}
                    </View>
                  ))}
                </ScrollView>
                {/* Pagination Dots */}
                <View style={styles.paginationContainer}>
                  {featurePages.map((_, index) => (
                    <PaginationDot
                      key={`dot-${index}`}
                      index={index}
                      dotPosition={dotPosition}
                      accentColor={accentColor}
                      secondaryTextColor={secondaryTextColor}
                      onPress={() => handlePageChange(index)}
                    />
                  ))}
                </View>
              </View>

              {/* Action buttons */}
              <View style={styles.actionContainer}>
                <TouchableOpacity 
                  style={[styles.primaryButton, { backgroundColor: accentColor }]}
                  onPress={() => handleClose(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Enable Circle to Scan</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.secondaryButton}
                  onPress={() => handleClose(false)}
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

// Helper component for features (unchanged)
const FeatureItem = ({ icon, title, description, iconBg, textColor, secondaryTextColor, accentColor }) => (
  <View style={styles.featureItem}>
    <View style={[styles.featureIconContainer, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={width * 0.055} color={accentColor} />
    </View>
    <View style={styles.featureTextContainer}>
      <Text style={[styles.featureTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.featureDescription, { color: secondaryTextColor }]}>{description}</Text>
    </View>
  </View>
);

// Helper component for pagination dots (unchanged)
const PaginationDot = ({ index, dotPosition, accentColor, secondaryTextColor, onPress }) => {
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
      backgroundColor: index === Math.round(dotPosition.value) ? accentColor : secondaryTextColor,
    };
  });
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[styles.paginationDot, animatedDotStyle]} />
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
  
  export default CircleToScanInfoSheet;