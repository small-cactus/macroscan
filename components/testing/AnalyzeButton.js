import React, { useEffect, useRef } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Animated, 
  View, 
  useColorScheme,
  ActivityIndicator
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

const AnalyzeButton = ({ 
  onPress, 
  loading, 
  disabled, 
  loadingText = 'Analyzing...',
  buttonText = 'Analyze Food' 
}) => {
  const colorScheme = useColorScheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const loadingRotateAnim = useRef(new Animated.Value(0)).current;
  
  // Pulse animation when button is enabled and not loading
  useEffect(() => {
    if (!disabled && !loading) {
      startPulseAnimation();
    } else {
      // Stop the animation
      pulseAnim.setValue(1);
      Animated.timing(pulseAnim).stop();
    }
    
    // Loading animation
    if (loading) {
      Animated.loop(
        Animated.timing(loadingRotateAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    } else {
      loadingRotateAnim.setValue(0);
      Animated.timing(loadingRotateAnim).stop();
    }
  }, [disabled, loading]);
  
  const loadingRotate = loadingRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };
  
  // Handle press with animation
  const handlePress = () => {
    if (disabled || loading) return;
    
    // Touch feedback animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    onPress();
  };
  
  return (
    <Animated.View
      style={[
        styles.buttonContainer,
        {
          transform: [
            { scale: disabled ? 1 : Animated.multiply(pulseAnim, scaleAnim) }
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: colorScheme === 'dark' ? '#262626' : '#333333',
            opacity: disabled ? 0.6 : 1,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={disabled || loading}
      >
        <View style={styles.gradientOverlay} />
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <Animated.View 
              style={[
                styles.loadingIconContainer, 
                { transform: [{ rotate: loadingRotate }] }
              ]}
            >
              <Ionicons name="scan" size={22} color="#3b82f6" />
            </Animated.View>
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        ) : (
          <View style={styles.buttonContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="scan-outline" size={22} color="#3b82f6" />
            </View>
            <Text style={styles.buttonText}>{buttonText}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    margin: 16,
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    borderTopWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    borderBottomWidth: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default AnalyzeButton; 