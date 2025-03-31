// SearchModeInfoSheet.js

// Explantion of search scans:
// 1. The user selects Search Mode (beta)
// 2. The app will use AI to automatically search the web for nutrient info about the food in their image
// 3. It takes a long time sometimes
// 4. It is in beta so results may not be good all the time

import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Modal,
  Animated,
  SafeAreaView,
  Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Svg, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { PanGestureHandler } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

// Calculate scale factor based on screen size
const baseWidth = 430; // iPhone 14 Pro Max width
const baseHeight = 932; // iPhone 14 Pro Max height
const scaleWidth = width / baseWidth;
const scaleHeight = height / baseHeight;
const scale = Math.min(scaleWidth, scaleHeight);

const SearchModeInfoSheet = ({ visible, onClose, onRevertChip }) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const slideAnim = useRef(new Animated.Value(height)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  // Blur animation refs
  const blurAnim = useRef(new Animated.Value(0)).current;
  const [blurIntensity, setBlurIntensity] = React.useState(0);

  // Pan gesture refs
  const panY = useRef(new Animated.Value(0)).current;
  const lastGestureDy = useRef(0);

  // Blur animation listener
  useEffect(() => {
    const listener = blurAnim.addListener(({ value }) => {
      setBlurIntensity(Math.round(value));
    });
    return () => blurAnim.removeListener(listener);
  }, [blurAnim]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          velocity: 3,
          tension: 70,
          friction: 12,
          useNativeDriver: true
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true
        }),
        Animated.timing(blurAnim, {
          toValue: 10,
          duration: 400,
          useNativeDriver: false
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(blurAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false
        })
      ]).start(() => {
        slideAnim.setValue(height);
        overlayOpacity.setValue(0);
        blurAnim.setValue(0);
        onClose();
      });
    }
  }, [visible, slideAnim, overlayOpacity, blurAnim]);

  const handleClose = (revert = true) => {
    // Remove haptic feedback
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(blurAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false
      })
    ]).start(() => {
      if (revert && onRevertChip) {
        onRevertChip();
      }
      onClose();
    });
  };

  // Gesture handler functions
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: panY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = event => {
    if (event.nativeEvent.oldState === 4) { // State.ACTIVE = 4
      lastGestureDy.current = 0;
      const { translationY } = event.nativeEvent;
      
      if (translationY > height * 0.2) { // If dragged down more than 20% of screen height
        // Remove haptic feedback
        handleClose(true); // Revert to previous chip when swiped down
      } else {
        // Reset to original position with spring animation
        Animated.spring(panY, {
          toValue: 0,
          velocity: 3,
          tension: 70,
          friction: 12,
          useNativeDriver: true
        }).start();
      }
    }
  };

  // Combine panY and slideAnim for total translation
  const translateY = Animated.add(slideAnim, panY);

  // Skip rendering if not visible
  if (!visible) return null;

  // Define colors based on theme
  const bgColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const secondaryTextColor = isDark ? '#BBBBBB' : '#666666';
  const accentColor = '#007AFF';
  const featureIconBg = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)';

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
            { 
              backgroundColor: 'black',
              opacity: overlayOpacity
            }
          ]} 
        />
      </View>
      <View style={styles.modalContainer}>
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View 
            style={[
              styles.sheetContainer, 
              { 
                backgroundColor: bgColor,
                transform: [{ translateY: translateY }]
              }
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
                  <Ionicons name="search" size={36} color="#FFFFFF" style={styles.iconOverlay} />
                </View>
                <View style={[styles.betaBadge, { backgroundColor: isDark ? '#000' : '#E5E5EA' }]}>
                  <Text style={styles.betaText}>BETA</Text>
                </View>
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: textColor }]}>Enhanced Search Mode</Text>

              {/* Subtitle */}
              <Text style={[styles.subtitle, { color: secondaryTextColor }]}>Automatically find nutrition info for your food from across the web</Text>

              {/* Feature list */}
              <View style={styles.featureList}>
                <FeatureItem 
                  icon="globe" 
                  title="Smart Web Searching" 
                  description="AI identifies your food and searches the internet for the real nutrition data"
                  iconBg={featureIconBg}
                  textColor={textColor}
                  secondaryTextColor={secondaryTextColor}
                />
                
                <FeatureItem 
                  icon="library" 
                  title="Multiple Sources" 
                  description="Combines information from databases, websites, and government sources"
                  iconBg={featureIconBg}
                  textColor={textColor}
                  secondaryTextColor={secondaryTextColor}
                />
                
                <FeatureItem 
                  icon="information-circle" 
                  title="Beta Feature" 
                  description="This feature is still in testing. Results may vary and take much longer to process."
                  iconBg={featureIconBg}
                  textColor={textColor}
                  secondaryTextColor={secondaryTextColor}
                />
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
  featureList: {
    width: '100%',
    marginBottom: height * 0.05,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: height * 0.03,
    width: '100%',
    paddingHorizontal: width * 0.05,
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
});

export default SearchModeInfoSheet;