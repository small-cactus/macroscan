// TipsInfoSheet.js
import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Modal,
  SafeAreaView,
  Platform,
  ScrollView,
  NativeModules
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
import MaskedView from '@react-native-masked-view/masked-view';

const { width, height } = Dimensions.get('window');

// Calculate scale factor 
const baseWidth = 430; 
const baseHeight = 932; 
const scaleWidth = width / baseWidth;
const scaleHeight = height / baseHeight;
const scale = Math.min(scaleWidth, scaleHeight);

const TipsInfoSheet = ({ visible, onClose, onGetStarted }) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Set iOS display to 120Hz for animations if available
  useEffect(() => {
    if (Platform.OS === 'ios' && NativeModules.DisplayLink) {
      NativeModules.DisplayLink.setPreferredFramesPerSecond(120);
    }
    
    return () => {
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
  
  // Track blur intensity in state
  const [blurIntensity, setBlurIntensity] = React.useState(0);
  
  // Update blur intensity when blurAnim changes
  useDerivedValue(() => {
    runOnJS(setBlurIntensity)(Math.round(blurAnim.value));
  }, [blurAnim]);

  // handleClose triggers the animation first - UPDATED FOR SMOOTHER DISMISSAL
  const handleCloseAction = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // First run all animations in parallel
    const animConfig = { duration: 300 };
    slideAnim.value = withTiming(height, animConfig);
    overlayOpacity.value = withTiming(0, animConfig);
    blurAnim.value = withTiming(0, animConfig, (finished) => {
      if (finished) {
        // Only after animations complete, call callbacks
        if (onGetStarted) {
          runOnJS(onGetStarted)();
        }
        runOnJS(onClose)();
      }
    });
  };
  
  // Separate animateOut function for gesture dismissal
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
    onEnd: (event) => {
      if (event.translationY > height * 0.2 || event.velocityY > 500) {
        // If dragged down far enough or with enough velocity, close the sheet
        runOnJS(animateOut)(onClose);
      } else {
        // Spring back to original position with physics-based animation
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
  
  // Simple gradient color definitions - properly reversed for light mode
  const gradientCenter = isDark ? '#FFD700' : '#FFA000'; // Gold in dark, Amber in light
  const gradientEdge = isDark ? '#FFA000' : '#FFECB3';   // Amber in dark, Light yellow in light

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={() => animateOut(onClose)}
    >
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={StyleSheet.absoluteFill}>
          <BlurView 
            style={[StyleSheet.absoluteFill, styles.sheet]}
            intensity={blurIntensity}
            tint={isDark ? "dark" : "light"}
          >
            <MaskedView
              style={[StyleSheet.absoluteFill]}
              maskElement={
                <LinearGradient
                  style={StyleSheet.absoluteFill}
                  colors={
                    colorScheme === 'dark'
                      ? [
                          'transparent',
                          'rgba(0, 0, 0, 0.9)',
                          'rgba(0, 0, 0, 1)',
                          'rgba(0, 0, 0, 0.9)',
                          'transparent',
                        ]
                      : [
                          'transparent',
                          'rgba(255, 255, 255, 0.9)',
                          'rgba(255, 255, 255, 1)',
                          'rgba(255, 255, 255, 0.9)',
                          'transparent',
                        ]
                  }
                  locations={[0, 0.1, 0.5, 0.9, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                />
              }
            >
              <View style={StyleSheet.absoluteFill} />
            </MaskedView>
          </BlurView>
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
              {/* Feature Icon with Gradient */}
              <View style={styles.iconContainer}>
                <View style={styles.iconGradient}>
                  <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                    <Defs>
                      <RadialGradient id="gradBulb" cx="50%" cy="50%" r="80%" gradientUnits="userSpaceOnUse">
                        <Stop offset="0%" stopColor={gradientCenter} stopOpacity="1" />
                        <Stop offset="100%" stopColor={gradientEdge} stopOpacity="0" />
                      </RadialGradient>
                    </Defs>
                    <Rect x="0" y="0" width="100%" height="100%" fill="url(#gradBulb)" />
                  </Svg>
                  <Ionicons name="bulb" size={36} color="#FFFFFF" style={styles.iconOverlay} />
                </View>
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: textColor }]}>Tips & Tricks</Text>

              {/* Subtitle */}
              <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                Get the most out of MacroScan with these helpful tips
              </Text>

              {/* Scrollable Feature list */}
              <ScrollView 
                style={styles.featureListScrollView}
                contentContainerStyle={styles.featureListContent}
                showsVerticalScrollIndicator={false}
              >
                <FeatureItem 
                  icon="flash" 
                  title="Default Mode" 
                  description="Great for quick checks of packaged foods or simple items where speed is key."
                  textColor={textColor}
                  secondaryTextColor={secondaryTextColor}
                />
                
                <FeatureItem 
                  icon="shield-checkmark" 
                  title="Accurate Mode" 
                  description="Ideal for complex homemade meals when you need the most detailed nutrient breakdown. Free users get 1 scan per day!"
                  textColor={textColor}
                  secondaryTextColor={secondaryTextColor}
                />
                
                <FeatureItem 
                  icon="search-circle" 
                  title="Deep Search Mode (Beta)" 
                  description="Use for obscure items or anything the other modes struggle with. It searches the web, so it can take longer."
                  textColor={textColor}
                  secondaryTextColor={secondaryTextColor}
                />

                <FeatureItem 
                  icon="scan-circle-outline" 
                  title="Circle to Scan (Beta)" 
                  description="Perfect for analyzing specific portions on a plate, like isolating the chicken from the salad."
                  textColor={textColor}
                  secondaryTextColor={secondaryTextColor}
                />

                <FeatureItem 
                  icon="sunny" 
                  title="Lighting Matters" 
                  description="Good, even lighting helps the AI see your food clearly. Avoid harsh shadows or dim light."
                  textColor={textColor}
                  secondaryTextColor={secondaryTextColor}
                />

                <FeatureItem 
                  icon="camera" 
                  title="Clear View" 
                  description="Ensure the food is the main focus and not obstructed by packaging reflections or other objects."
                  textColor={textColor}
                  secondaryTextColor={secondaryTextColor}
                />
                
                {/* Add some bottom padding for better scrolling */}
                <View style={{ height: 20 * scale }} />
              </ScrollView>

              {/* Action buttons */}
              <View style={styles.actionContainer}>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={handleCloseAction}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Got it!</Text>
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
const FeatureItem = ({ icon, title, description, textColor, secondaryTextColor }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIconContainer}>
      <Ionicons name={icon} size={width * 0.055} color="#007AFF" />
    </View>
    <View style={styles.featureTextContainer}>
      <Text style={[styles.featureTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.featureDescription, { color: secondaryTextColor }]}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  sheetContainer: {
    height: height * 0.88,
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
  title: {
    fontSize: width * 0.07,
    fontWeight: 'bold',
    marginBottom: 10 * scale,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18 * scale,
    textAlign: 'center',
    marginBottom: height * 0.03,
    lineHeight: height * 0.03,
    paddingHorizontal: 16 * scale,
  },
  featureListScrollView: {
    width: '100%',
    flex: 1,
  },
  featureListContent: {
    paddingTop: 10 * scale,
    paddingLeft: width * 0.05, // Proper left margin for all content
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: height * 0.025,
    width: '100%',
    paddingHorizontal: width * 0.02,
  },
  featureIconContainer: {
    width: width * 0.11,
    height: width * 0.11,
    borderRadius: width * 0.055,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: width * 0.04,
    marginLeft: width * 0.02,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: width * 0.045,
    fontWeight: '600',
    marginBottom: height * 0.005,
  },
  featureDescription: {
    fontSize: width * 0.038,
    lineHeight: height * 0.024,
  },
  actionContainer: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: height * 0.04,
  },
  primaryButton: {
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 15,
    height: height * 0.065,
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: width * 0.045,
    fontWeight: '600',
  },
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default TipsInfoSheet; 