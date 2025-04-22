// ModeInfoSheet.js
import React, { useEffect, useRef, useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';
import { Svg, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Calculate scale factor based on screen size
const baseWidth = 430; // iPhone 14 Pro Max width
const baseHeight = 932; // iPhone 14 Pro Max height
const scaleWidth = width / baseWidth;
const scaleHeight = height / baseHeight;
const scale = Math.min(scaleWidth, scaleHeight);

const modeData = [
  {
    title: "Fast Mode",
    iconName: "flash-outline",
    gradientColors: ['#FFB74D', '#FFA726', '#FF9800'],
    stats: [
      { label: "Time", value: "5 sec", highlight: false },
      { label: "Focus", value: "Calories & Carbs", highlight: true },
      { label: "Accuracy", value: "75%", highlight: false }
    ],
    description: "Lightning-fast calorie estimates in seconds.",
    accuracyExplanation: "Great for quick snacks & daily calorie counting.",
    goodAt: [
      "~90% accurate for calories",
      "~90% accurate for carbs",
      "Perfect for quick decisions"
    ],
    strugglesWith: [
      "Only ~50-60% accurate on other macros",
      "May miss nutritional details",
      "Not ideal for strict diet planning"
    ]
  },
  {
    title: "Accurate Mode",
    iconName: "locate-outline",
    gradientColors: ['#64B5F6', '#42A5F5', '#2196F3'],
    stats: [
      { label: "Time", value: "20 sec", highlight: false },
      { label: "Focus", value: "Full Macros", highlight: true },
      { label: "Accuracy", value: "68%", highlight: false }
    ],
    description: "Balanced analysis of all nutrients and macros.",
    accuracyExplanation: "Best for meal prep & balancing your macros.",
    goodAt: [
      "~80% accurate on all macros",
      "Better overall nutrient balance",
      "Improved protein & fiber accuracy",
      "Good for meal planning"
    ],
    strugglesWith: [
      "Still has more variance than Deep Search",
      "Can miss hidden ingredients",
      "Not perfect for strict nutrition tracking"
    ]
  },
  {
    title: "Deep Search Mode",
    iconName: "search-circle-outline",
    gradientColors: ['#FFB74D', '#FF5252', '#42A5F5', '#AB47BC'],
    stats: [
      { label: "Time", value: "40 sec", highlight: false },
      { label: "Focus", value: "Anything Online", highlight: true },
      { label: "Accuracy", value: "100%*", highlight: false }
    ],
    description: "Searches online for exact nutrition data.",
    accuracyExplanation: "*100% accurate when food is found online, otherwise uses our best estimate.",
    goodAt: [
      "Perfect for branded foods",
      "Restaurant menu items",
      "Packaged foods with nutrition labels",
      "Anything with an online presence"
    ],
    strugglesWith: [
      "Generic fallback if not found online",
      "Homemade meals without recipes",
      "⚠️ Only works when the food is documented online"
    ]
  }
];

const ModeInfoSheet = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [currentModeIndex, setCurrentModeIndex] = useState(0);

  // Set iOS display to 120Hz for animations if available
  useEffect(() => {
    if (Platform.OS === 'ios') {
      if (NativeModules.DisplayLink) {
        NativeModules.DisplayLink.setPreferredFramesPerSecond(120);
      }
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
  
  // Track blur intensity in state
  const [blurIntensity, setBlurIntensity] = React.useState(0);
  
  // Update blur intensity when blurAnim changes
  useDerivedValue(() => {
    runOnJS(setBlurIntensity)(Math.round(blurAnim.value));
  }, [blurAnim]);

  // Handle closing the sheet (only after the last mode)
  const handleClose = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    slideAnim.value = withTiming(height, {
      duration: 300,
    }, (finished) => {
      if (finished) {
        runOnJS(() => {
          setCurrentModeIndex(0); // Reset for next time
          onClose();
        })();
      }
    });
    
    overlayOpacity.value = withTiming(0, { duration: 300 });
    blurAnim.value = withTiming(0, { duration: 300 });
  };

  // Handle progressing to the next mode or closing
  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentModeIndex < modeData.length - 1) {
      setCurrentModeIndex(currentModeIndex + 1);
    } else {
      handleClose(); // Close the sheet on the last mode
    }
  };

  // useEffect for handling visibility changes
  useEffect(() => {
    if (visible) {
      slideAnim.value = height;
      overlayOpacity.value = 0;
      blurAnim.value = 0;
      setCurrentModeIndex(0); // Start at the first mode
      
      slideAnim.value = withSpring(0, {
        velocity: 20,
        stiffness: 125,
        damping: 20,
        overshootClamping: false,
        restDisplacementThreshold: 0.1,
        restSpeedThreshold: 0.1,
      });
      
      overlayOpacity.value = withTiming(0.3, { duration: 400 });
      blurAnim.value = withTiming(10, { duration: 400 });
    } else {
      // If visibility is turned off externally, ensure animations run out
      if (slideAnim.value !== height) {
        slideAnim.value = withTiming(height, { duration: 300 });
        overlayOpacity.value = withTiming(0, { duration: 300 });
        blurAnim.value = withTiming(0, { duration: 300 });
      }
    }
  }, [visible, slideAnim, overlayOpacity, blurAnim]);

  // Create animated styles
  const sheetAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ 
        translateY: slideAnim.value 
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

  // Skip rendering if not visible and blur is done
  if (!visible && blurIntensity === 0) return null;

  // Define colors based on theme
  const bgColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const secondaryTextColor = isDark ? '#BBBBBB' : '#666666';
  const accentColor = '#007AFF';
  const listBgColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  // Get current mode data
  const currentMode = modeData[currentModeIndex];
  const isLastMode = currentModeIndex === modeData.length - 1;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={() => { /* Prevent default close */ }} // Make it undismissable by back button/gesture
    >
      {/* Background Blur and Overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
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

      {/* Main Sheet Content */}
      <View style={styles.modalContainer} pointerEvents={visible ? 'auto' : 'none'}>
        {/* Removed PanGestureHandler to disable swipe dismissal */}
        <Animated.View 
          style={[
            styles.sheetContainer, 
            { backgroundColor: bgColor },
            sheetAnimatedStyle
          ]}
        >
          {/* Handle indicator (visual only, non-functional) */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <SafeAreaView style={styles.safeArea}>
            {/* Mode Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconGradient}>
                <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                  <Defs>
                    {currentMode.gradientColors.map((col, idx) => (
                      <RadialGradient
                        key={`grad-${idx}`}
                        id={`grad${idx}`}
                        cx={`${30 + idx*15}%`}
                        cy={`${25 + idx*15}%`}
                        r={`${80 - idx*10}%`}
                      >
                        <Stop offset="0%" stopColor={col} stopOpacity={1 - idx*0.1} />
                        <Stop offset="100%" stopColor={col} stopOpacity="0" />
                      </RadialGradient>
                    ))}
                  </Defs>
                  {currentMode.gradientColors.map((_, idx) => (
                    <Rect key={`rect-${idx}`} x="0" y="0" width="100%" height="100%" fill={`url(#grad${idx})`} />
                  ))}
                </Svg>
                <Ionicons name={currentMode.iconName} size={54} color="#FFFFFF" style={styles.iconOverlay} />
              </View>
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: textColor }]}>{currentMode.title}</Text>
            {/* Step Indicator */}
            <Text style={[styles.stepIndicator, { color: secondaryTextColor }]}>
              {`Step ${currentModeIndex + 1} of ${modeData.length}`}
            </Text>
            {/* Subtitle */}
            <Text style={[styles.subtitle, { color: secondaryTextColor }]}>{currentMode.description}</Text>

            {/* Scrollable Mode Specific Content */}
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer}>
              {/* Accuracy Banner */}
              <View style={[styles.accuracyBanner, { backgroundColor: listBgColor }]}>  
                <Text style={[styles.focusValue, { color: accentColor }]}>
                  {currentMode.stats.find(s => s.label === 'Focus').value}
                </Text>
                <Text style={[styles.focusTimeLabel, { color: secondaryTextColor }]}>
                  {currentMode.stats.find(s => s.label === 'Time').value}
                </Text>
              </View>
              {currentMode.accuracyExplanation && (
                <Text style={[styles.accuracyExplanation, { color: secondaryTextColor }]}>  
                  {currentMode.accuracyExplanation}
                </Text>
              )}
              {/* Stats Row */}
              {/* <View style={[styles.statsRow, { backgroundColor: listBgColor }]}> 
                {currentMode.stats
                  .filter(s => s.label !== 'Accuracy')
                  .map((s, i) => (
                    <StatItem
                      key={i}
                      label={s.label}
                      value={s.value}
                      color={s.highlight ? accentColor : textColor}
                      isProminent={s.highlight}
                    />
                  ))}
              </View> */}

              {/* Good / Struggles Lists */}
              <ListSection 
                title="✓ Strong Points"
                items={currentMode.goodAt}
                iconName="thumbs-up-outline"
                iconColor={isDark ? '#4CAF50' : '#2E7D32'} // Greenish color
                bgColor={listBgColor}
                textColor={textColor}
                secondaryTextColor={secondaryTextColor}
              />

              {/* Struggles List */}
              <ListSection 
                title="✗ Limitations"
                items={currentMode.strugglesWith}
                iconName="thumbs-down-outline"
                iconColor={isDark ? '#F44336' : '#C62828'} // Reddish color
                bgColor={listBgColor}
                textColor={textColor}
                secondaryTextColor={secondaryTextColor}
              />
            </ScrollView>
            
            {/* Action button */}
            <View style={styles.actionContainer}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>
                  {isLastMode ? 'Got It!' : 'Next Mode'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// TODO: Add Helper components for stats, lists etc. if needed

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  sheetContainer: {
    height: height * 0.9, // Keep similar height
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
    paddingTop: 0,
  },
  title: {
    fontSize: width * 0.07,
    fontWeight: 'bold',
    marginTop: 10 * scale,
    marginBottom: 5 * scale,
    textAlign: 'center',
  },
  stepIndicator: {
    fontSize: 14 * scale,
    fontWeight: '500',
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
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  scrollContentContainer: {
    paddingBottom: height * 0.02,
    paddingHorizontal: width * 0.04,
  },
  actionContainer: {
    width: '100%',
    paddingBottom: 10 * scale, // Add padding instead of margin for button spacing
    marginTop: 'auto', // Push to bottom
  },
  primaryButton: {
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 15,
    height: height * 0.065,
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%', // Make button slightly smaller if needed
  },
  primaryButtonText: {
    color: 'white',
    fontSize: width * 0.04,
    fontWeight: '600',
  },
  // TODO: Add styles for stats, lists, etc.
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: height * 0.03,
    width: '100%',
    borderRadius: 14 * scale,
    paddingVertical: height * 0.02,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: width * 0.06,
    fontWeight: '600',
    marginBottom: 5 * scale,
  },
  statValueProminent: {
    fontSize: width * 0.075,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: width * 0.035,
    fontWeight: '500',
  },
  listSection: {
    marginBottom: height * 0.03,
    width: '100%',
  },
  listTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.015,
    paddingLeft: width * 0.02,
  },
  listTitle: {
    fontSize: width * 0.045,
    fontWeight: '600',
    marginLeft: width * 0.02,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.03,
    borderRadius: 10 * scale,
    marginBottom: height * 0.01,
  },
  listIcon: {
    marginRight: width * 0.025,
    marginTop: 2 * scale, // Align icon slightly better with text
  },
  listText: {
    flex: 1,
    fontSize: width * 0.038,
    lineHeight: height * 0.025,
  },
  iconContainer: {
    marginTop: 15 * scale,
    marginBottom: 15 * scale,
    alignItems: 'center',
    justifyContent: 'center',
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
  accuracyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10 * scale,
    borderRadius: 10 * scale,
    marginBottom: height * 0.02,
  },
  focusValue: {
    fontSize: width * 0.06,
    fontWeight: '600',
  },
  focusTimeLabel: {
    fontSize: width * 0.035,
    fontWeight: '500',
    marginLeft: 5 * scale,
  },
  accuracyExplanation: {
    fontSize: 14 * scale,
    textAlign: 'center',
    marginBottom: height * 0.02,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.3)',
    width: '80%',
    alignSelf: 'center',
    marginVertical: height * 0.02
  },
});

// Helper component for Stats
const StatItem = ({ label, value, color, isProminent = false }) => (
  <View style={styles.statItem}>
    <Text style={[styles.statValue, { color }, isProminent && styles.statValueProminent]}>{value}</Text>
    <Text style={[styles.statLabel, { color: isProminent ? color : (color === '#007AFF' ? (useColorScheme() === 'dark' ? '#BBBBBB' : '#666666') : color) }]}>{label}</Text>
  </View>
);

// Helper component for Lists (Good At / Struggles With)
const ListSection = ({ title, items, iconName, iconColor, bgColor, textColor, secondaryTextColor }) => (
  <View style={styles.listSection}>
    <View style={styles.listTitleContainer}>
      <Ionicons name={iconName} size={width * 0.055} color={iconColor} />
      <Text style={[styles.listTitle, { color: textColor }]}>{title}</Text>
    </View>
    {items.map((item, index) => (
      <View key={index} style={[styles.listItem, { backgroundColor: bgColor }]}>
        <Text style={[styles.listText, { color: secondaryTextColor }]}>{item}</Text>
      </View>
    ))}
  </View>
);

export default ModeInfoSheet; 