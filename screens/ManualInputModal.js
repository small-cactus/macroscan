import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  SafeAreaView,
  Platform,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
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

const ManualInputModal = ({ visible, onClose, onSubmit }) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // State for the text input
  const [description, setDescription] = useState('');

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

  // handleClose now triggers the animation first
  const handleClose = (submitted = false) => {
    if (!submitted) {
        // Haptic feedback for cancel/dismiss
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
        // Haptic feedback for successful submission
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Animate sheet down
    slideAnim.value = withTiming(height, { duration: 300 }, (finished) => {
      if (finished) {
        // Only call onClose after animation completes
        runOnJS(onClose)();
        // Reset description state after closing
        runOnJS(setDescription)('');
      }
    });

    // Also animate opacity and blur out
    overlayOpacity.value = withTiming(0, { duration: 300 });
    blurAnim.value = withTiming(0, { duration: 300 });
  };

  // Separate animateOut function now only used for gesture dismissal
  const animateOut = useCallback((callback) => {
    const animConfig = { duration: 300 };

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
        runOnJS(setDescription)(''); // Reset description on gesture dismiss
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

      // Spring animation for the slide
      slideAnim.value = withSpring(0, {
        velocity: 10,
        stiffness: 90,
        damping: 15,
        overshootClamping: false,
        restDisplacementThreshold: 0.1,
        restSpeedThreshold: 0.1,
      });

      // Timing animations for opacity and blur
      overlayOpacity.value = withTiming(0.3, { duration: 400 });
      blurAnim.value = withTiming(10, { duration: 400 });
    }
    // Don't animate out here if visible becomes false, handleClose does that
  }, [visible, slideAnim, overlayOpacity, blurAnim, panY]);

  // Gesture handler with Reanimated
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startY = panY.value;
    },
    onActive: (event, ctx) => {
      if (event.translationY >= -height * 0.1) { // Allow slight upward movement
        panY.value = ctx.startY + event.translationY;
      }
    },
    onEnd: (event, ctx) => {
      if (event.translationY > height * 0.2) {
        // If dragged down far enough, close the sheet
        runOnJS(animateOut)(onClose);
      } else {
        // Spring back to original position
        panY.value = withSpring(0, {
          velocity: event.velocityY,
          stiffness: 70,
          damping: 12,
        });
      }
    }
  });

  // Helper function to analyze input detail level
  const analyzeInputDetail = (text) => {
    // Check if the input mentions size
    const hasSizeMention = /\b(size|portion|cup|oz|ounce|pound|lb|gram|g|ml|liter|l|slice|piece|serving|tablespoon|tbsp|teaspoon|tsp|large|medium|small)\b/i.test(text);
    
    // Check for detailed description (more than just a few words)
    const wordCount = text.split(/\s+/).length;
    const isDetailed = wordCount > 4;
    
    return {
      hasSizeMention,
      isDetailed,
      isDetailedEnough: hasSizeMention && isDetailed
    };
  };

  // Handle submission
  const handleSubmit = () => {
    if (description.trim()) {
      // Analyze the detail level of the input
      const { hasSizeMention, isDetailedEnough } = analyzeInputDetail(description.trim());
      
      if (!isDetailedEnough) {
        // If not detailed enough, show an alert asking if they want to proceed
        Alert.alert(
          'Improve Your Results',
          `${!hasSizeMention ? 'Your description doesn\'t mention portion size. ' : ''}Adding more details like quantity, size, and preparation method will improve nutrition estimates.`,
          [
            {
              text: 'Edit Description',
              style: 'cancel',
              onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
            },
            {
              text: 'Submit Anyway',
              style: 'default',
              onPress: () => {
                onSubmit(description.trim());
                handleClose(true);
              }
            }
          ]
        );
      } else {
        // If detailed enough, submit directly
        onSubmit(description.trim());
        handleClose(true); // Close modal after submission (pass true for success haptic)
      }
    } else {
      Alert.alert('Input Required', 'Please describe the food you ate.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

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

  // Skip rendering if not visible and fully blurred out
  if (!visible && blurIntensity === 0) return null;

  // Define colors based on theme
  const bgColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const secondaryTextColor = isDark ? '#BBBBBB' : '#666666';
  const tertiaryTextColor = isDark ? '#888888' : '#AAAAAA';
  const inputBgColor = isDark ? '#2C2C2E' : '#F0F0F0';
  const inputBorderColor = isDark ? '#444444' : '#CCCCCC';
  const accentColor = '#007AFF';
  const handleColor = isDark ? '#555555' : '#CECECE';


  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none" // Controlled by Reanimated
      onRequestClose={() => handleClose(false)}
    >
      {/* Background Blur and Overlay */}
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

      {/* Keyboard Avoiding View */}
      <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContainer}
          pointerEvents={visible ? 'auto' : 'none'}
          keyboardVerticalOffset={Platform.OS === "ios" ? -insets.bottom : 0}
          enabled={Platform.OS === "ios"}
      >
          <PanGestureHandler
            onGestureEvent={gestureHandler}
          >
            <Animated.View
              style={[
                styles.sheetContainer,
                { backgroundColor: bgColor, paddingBottom: insets.bottom },
                sheetAnimatedStyle
              ]}
            >
              {/* Handle indicator */}
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: handleColor }]} />
              </View>

              {/* Use SafeAreaView only for content padding, not positioning */}
              <SafeAreaView style={styles.safeAreaContent}>
                {/* Icon */}
                <View style={styles.iconContainer}>
                    <Ionicons name="pencil-outline" size={36} color={accentColor} />
                </View>

                {/* Title */}
                <Text style={[styles.title, { color: textColor }]}>Describe Your Meal</Text>

                {/* Subtitle */}
                <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                  Enter details about the food you ate. The more info, the better the estimate!
                </Text>

                {/* Text Input */}
                <TextInput
                  style={[
                      styles.textInput,
                      {
                          backgroundColor: inputBgColor,
                          borderColor: inputBorderColor,
                          color: textColor,
                      }
                  ]}
                  onChangeText={setDescription}
                  value={description}
                  placeholder="e.g., Large bowl of oatmeal with blueberries, almonds, and honey"
                  placeholderTextColor={tertiaryTextColor}
                  keyboardType="default"
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top" // Android specific
                  autoFocus={true} // Focus input when modal opens
                />

                {/* Action buttons */}
                <View style={styles.actionContainer}>
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: accentColor }]}
                    onPress={handleSubmit}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryButtonText}>Estimate Nutrition</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handleClose(false)} // Pass false for cancel haptic
                  >
                    <Text style={[styles.secondaryButtonText, { color: accentColor }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </Animated.View>
          </PanGestureHandler>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Styles adapted from SearchModeInfoSheet
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  sheetContainer: {
    height: Math.min(height * 0.6, 600),
    width: '100%',
    borderTopLeftRadius: 45 * scale,
    borderTopRightRadius: 45 * scale,
    overflow: 'hidden',
    position: 'relative',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: height * 0.015,
  },
  handle: {
    width: width * 0.1,
    height: 5 * scale,
    borderRadius: 3 * scale,
  },
  safeAreaContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: width * 0.06,
    position: 'relative',
  },
  iconContainer: {
    marginTop: 15 * scale, // Reduced margin
    marginBottom: 15 * scale,
  },
  title: {
    fontSize: width * 0.06, // Slightly smaller title
    fontWeight: '600', // Semi-bold
    marginBottom: 8 * scale, // Reduced margin
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16 * scale, // Slightly smaller subtitle
    textAlign: 'center',
    marginBottom: height * 0.025, // Reduced margin
    lineHeight: height * 0.028,
    paddingHorizontal: 10 * scale,
  },
  textInput: {
    width: '100%',
    height: Math.min(height * 0.12, 120),
    borderRadius: 18 * scale,
    borderWidth: 1,
    padding: 12 * scale,
    fontSize: 16 * scale,
    marginBottom: height * 0.03,
    maxHeight: 120,
  },
  actionContainer: {
    width: '100%',
    marginTop: 'auto', // Push buttons to bottom
    marginBottom: height * 0.02, // Bottom padding
  },
  primaryButton: {
    alignSelf: 'center',
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
});

export default ManualInputModal; 