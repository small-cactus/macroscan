import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Animated, StyleSheet, Text, View, Dimensions, useColorScheme, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const scale = Math.min(width / 430, 1);

const ScanButtonTooltip = forwardRef(({ visible, onHide, position, debug = false }, ref) => {
  const colorScheme = useColorScheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const textFadeOut = useRef(new Animated.Value(1)).current;
  const containerWidth = useRef(new Animated.Value(260 * scale)).current;
  const arrowOpacity = useRef(new Animated.Value(1)).current;
  const borderRadius = useRef(new Animated.Value(12 * scale)).current;
  const [showCheckmark, setShowCheckmark] = useState(false);

  useImperativeHandle(ref, () => ({
    hideTooltipWithAnimation: () => {
      if (debug) return;
      setShowCheckmark(true);
      
      // First shrink container, fade out text and arrow
      Animated.parallel([
        Animated.timing(textFadeOut, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(containerWidth, {
          toValue: 45 * scale,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(translateX, {
          toValue: 25,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(arrowOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(borderRadius, {
          toValue: 100,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        })
      ]).start();

      // Then show checkmark
      setTimeout(() => {
        Animated.spring(checkmarkScale, {
          toValue: 1,
          tension: 60,
          friction: 5,
          useNativeDriver: false,
        }).start();
      }, 100);

      // Finally fade out the entire tooltip
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(translateY, {
            toValue: 10,
            duration: 200,
            useNativeDriver: false,
          })
        ]).start(async () => {
          await AsyncStorage.setItem('@has_seen_scan_button_tooltip', 'true');
          if (onHide) onHide();
        });
      }, 600);
    }
  }));

  useEffect(() => {
    if (debug) {
      fadeAnim.setValue(1);
      translateY.setValue(0);
      translateX.setValue(25);
      checkmarkScale.setValue(1);
      textFadeOut.setValue(0);
      containerWidth.setValue(45 * scale);
      arrowOpacity.setValue(0);
      borderRadius.setValue(100);
      setShowCheckmark(true);
    } else if (visible) {
      translateY.setValue(-10);
      translateX.setValue(0);
      fadeAnim.setValue(0);
      checkmarkScale.setValue(0);
      textFadeOut.setValue(1);
      containerWidth.setValue(260 * scale);
      arrowOpacity.setValue(1);
      borderRadius.setValue(12 * scale);
      setShowCheckmark(false);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: false,
        })
      ]).start();
    }
  }, [visible, debug]);

  if (!debug && (!visible || !position.x || !position.y)) return null;

  const leftPosition = Animated.add(
    Animated.subtract(
      Animated.subtract(
        position.x,
        Animated.divide(containerWidth, 2)
      ),
      20 * scale
    ),
    translateX
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
          backgroundColor: colorScheme === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.9)',
          position: 'absolute',
          left: leftPosition,
          top: position.y - (50 * scale),
          width: containerWidth,
          borderRadius,
        }
      ]}
      pointerEvents="none"
    >
      <View style={styles.contentContainer}>
        <Ionicons
          name="scan-outline"
          size={20 * scale}
          color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'}
          style={{ marginRight: 8 * scale }}
        />
        <Animated.Text style={[styles.text, { 
          opacity: textFadeOut, 
          color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' 
        }]}>
          Take a photo of your meal!
        </Animated.Text>
      </View>
      {showCheckmark && (
        <Animated.View style={[
          styles.checkmarkContainer,
          {
            transform: [{ scale: checkmarkScale }],
          }
        ]}>
          <Ionicons name="checkmark-circle" size={30} color="#4CAF50" />
        </Animated.View>
      )}
      <Animated.View style={[
        styles.arrow,
        {
          opacity: arrowOpacity,
          borderTopColor: colorScheme === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.9)',
          bottom: -8 * scale,
          transform: [{ rotate: '0deg' }],
        }
      ]} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16 * scale,
    paddingVertical: 10 * scale,
    borderRadius: 12 * scale,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.35,
    shadowRadius: 5 * scale,
    elevation: 8,
    zIndex: 1000,
    overflow: 'visible',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24 * scale,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 15 * scale,
    fontWeight: '600',
    textAlign: 'center',
  },
  checkmarkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: 0 * scale, // Half of icon size (30/2)
    marginTop: -5 * scale, // Half of icon size (30/2)
    zIndex: 1000000,
    width: 30 * scale,
    height: 30 * scale,
  },
  arrow: {
    position: 'absolute',
    left: '50%',
    marginLeft: 35 * scale,
    width: 16 * scale,
    height: 8 * scale,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8 * scale,
    borderRightWidth: 8 * scale,
    borderTopWidth: 8 * scale,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});

export default ScanButtonTooltip; 