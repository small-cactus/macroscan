import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, useColorScheme } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

const LoadingSpinner = ({ message, accentColor = '#3b82f6' }) => {
  const colorScheme = useColorScheme();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const textFadeAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    // Continuous rotation animation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Subtle pulsing effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();
    
    // Text fade animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(textFadeAnim, {
          toValue: 0.7,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.container}>
      <View style={styles.spinnerWrapper}>
        <Animated.View 
          style={[
            styles.spinner, 
            { 
              transform: [
                { rotate: spin },
                { scale: pulseAnim }
              ] 
            }
          ]}
        >
          <LinearGradient
            colors={[accentColor, colorScheme === 'dark' ? '#222' : '#f5f5f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientSpinner}
          />
        </Animated.View>
        
        {/* Icon stays static while the border rotates */}
        <View style={styles.iconContainer}>
          <View style={[
            styles.iconBackground, 
            { backgroundColor: colorScheme === 'dark' ? '#000' : '#fff' }
          ]}>
            <Ionicons 
              name="search-outline" 
              size={24} 
              style={[styles.icon, { color: accentColor }]} 
            />
          </View>
        </View>
      </View>
      
      {message && (
        <Animated.Text 
          style={[
            styles.message, 
            { 
              color: colorScheme === 'dark' ? '#cccccc' : '#555555',
              opacity: textFadeAnim
            }
          ]}
        >
          {message}
        </Animated.Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  spinnerWrapper: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  spinner: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
  },
  gradientSpinner: {
    width: '100%',
    height: '100%',
    borderRadius: 31,
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  iconContainer: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  icon: {
    opacity: 0.9,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: '90%',
    lineHeight: 22,
  }
});

export default LoadingSpinner; 