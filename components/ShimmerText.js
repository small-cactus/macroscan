import React, { useRef, useEffect } from 'react';
import { Text, Animated, StyleSheet, Easing, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

const ShimmerText = ({ 
  text, 
  style, 
  isCompleted = false,
  completedColor = '#000',
  // Optional props for base color and highlight
  baseColor, 
  highlightColor,
  // Duration of the shimmer animation in milliseconds
  shimmerDuration = 3000,
  // Ratio (0 to 1) that determines how wide the highlight is relative to the gradient
  highlightWidthRatio = 0.9,
}) => {
  const colorScheme = useColorScheme();
  
  // Set default colors based on system theme if not provided
  if (!baseColor) {
    baseColor = colorScheme === 'light' ? '#000' : '#ddd';
  }
  if (!highlightColor) {
    highlightColor = colorScheme === 'light' ? '#ccc' : '#eee';
  }

  const animatedValue = useRef(new Animated.Value(0)).current;
  const gradientWidth = 600; // Adjust gradient width to control shimmer concentration

  useEffect(() => {
    if (!isCompleted) {
      const animation = Animated.loop(
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: shimmerDuration,
          useNativeDriver: true,
          isInteraction: false,
          easing: Easing.linear,
        })
      );
      animatedValue.setValue(0);
      animation.start();

      return () => {
        animation.stop();
        animatedValue.setValue(0);
      };
    } else {
      animatedValue.stopAnimation();
    }
  }, [animatedValue, isCompleted, shimmerDuration]);

  // Animate from left to right.
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-gradientWidth, 0],
  });

  // Calculate gradient locations dynamically based on highlightWidthRatio.
  // This makes the white (highlight) size easily adjustable.
  const highlightStart = (1 - highlightWidthRatio) / 2;
  const highlightEnd = (1 + highlightWidthRatio) / 2;
  const gradientColors = [baseColor, baseColor, highlightColor, baseColor, baseColor];
  const gradientLocations = [0, highlightStart, 0.5, highlightEnd, 1];

  if (isCompleted) {
    return (
      <Text style={[styles.text, style, { color: completedColor }]}>
        {text}
      </Text>
    );
  }

  return (
    <MaskedView
      style={styles.maskedView}
      maskElement={
        <Text style={[styles.text, style, { color: '#000' }]}>
          {text}
        </Text>
      }
    >
      <Animated.View 
        style={{ 
          flexDirection: 'row', 
          width: gradientWidth * 2, 
          transform: [{ translateX }] 
        }}
      >
        <LinearGradient
          colors={gradientColors}
          locations={gradientLocations}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { width: gradientWidth }]}
        />
        <LinearGradient
          colors={gradientColors}
          locations={gradientLocations}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { width: gradientWidth }]}
        />
      </Animated.View>
    </MaskedView>
  );
};

const styles = StyleSheet.create({
  maskedView: {
    height: 24,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  text: {
    fontSize: 17,
    fontWeight: '200',
  },
  gradient: {
    height: '100%',
  },
});

export default ShimmerText;