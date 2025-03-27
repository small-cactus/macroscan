import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';

const AnimatedColorText = forwardRef(({ 
  text, 
  primaryColor = '#3498db', 
  secondaryColor = '#cccccc', 
  completedColor = '#999999',
  style, 
  staggerDuration = 20, 
  animationDuration = 600,
  shimmerDuration = 2000,
  delay = 0,
  fontWeight = '600',
  isCompleted = false,
  onAnimationComplete = () => {},
}, ref) => {
  const [lines, setLines] = useState([]);
  const [internalCompleted, setInternalCompleted] = useState(isCompleted);
  
  // Track the active shimmer position for multi-character effects
  const [shimmerPosition, setShimmerPosition] = useState(0);
  
  // Animation values for each letter
  const fadeAnimsRef = useRef([]);
  const shimmerAnimsRef = useRef([]);
  
  // Animation refs
  const shimmerLoopRef = useRef(null);
  const animationTimer = useRef(null);
  const shimmerPositionRef = useRef(null);
  const isAnimatingRef = useRef(false);
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    complete: () => {
      setInternalCompleted(true);
    },
    reset: () => {
      setInternalCompleted(false);
    }
  }));

  // Initialize animations when the text changes
  useEffect(() => {
    const charCount = text.length;
    fadeAnimsRef.current = Array(charCount).fill().map(() => new Animated.Value(0));
    shimmerAnimsRef.current = Array(charCount).fill().map(() => new Animated.Value(0));
    setLines([]); // Reset lines when text changes
    isAnimatingRef.current = true;
    
    return () => cleanupAnimations();
  }, [text]);

  // Use external isCompleted prop or internal state
  const effectiveCompleted = isCompleted || internalCompleted;

  // Cleanup all animations
  const cleanupAnimations = () => {
    if (animationTimer.current) {
      clearTimeout(animationTimer.current);
    }
    if (shimmerLoopRef.current) {
      shimmerLoopRef.current.stop();
    }
    if (shimmerPositionRef.current) {
      clearInterval(shimmerPositionRef.current);
    }
    fadeAnimsRef.current.forEach(anim => anim.stopAnimation());
    shimmerAnimsRef.current.forEach(anim => anim.stopAnimation());
  };

  // Start or update animations based on isCompleted prop
  useEffect(() => {
    const fadeAnims = fadeAnimsRef.current;
    const shimmerAnims = shimmerAnimsRef.current;
    
    // Reset animations
    cleanupAnimations();
    
    if (effectiveCompleted) {
      // If completing, smoothly transition all characters to their completed state
      fadeAnims.forEach(anim => {
        // Make sure characters are fully visible
        if (anim.__getValue() < 1) {
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }).start();
        }
      });
      
      // Gradually fade out the shimmer effect for a smooth transition to gray
      shimmerAnims.forEach((anim, i) => {
        // Stagger the fade to completed state slightly for a nicer effect
        const staggerDelay = Math.min(i * 20, 300);
        
        Animated.timing(anim, {
          toValue: 0,
          duration: 600,
          delay: staggerDelay,
          useNativeDriver: false,
        }).start();
      });
      
      isAnimatingRef.current = false;
      onAnimationComplete();
    } else {
      // Start fade-in animations after delay
      animationTimer.current = setTimeout(() => {
        const fadeSequence = fadeAnims.map((anim, index) => {
          return Animated.timing(anim, {
            toValue: 1,
            duration: animationDuration,
            useNativeDriver: false, // Must be false for text color interpolation
          });
        });

        Animated.stagger(staggerDuration, fadeSequence).start(() => {
          // Start shimmer effect after all letters are visible
          if (!effectiveCompleted) {
            startShimmerAnimation();
          }
        });
      }, delay);
    }

    return () => cleanupAnimations();
  }, [effectiveCompleted, animationDuration, delay, staggerDuration, shimmerDuration]);
  
  // Start the shimmer wave animation using improved multi-character effect
  const startShimmerAnimation = () => {
    const totalChars = text.length;
    const shimmerAnims = shimmerAnimsRef.current;
    
    // Reset shimmer values
    shimmerAnims.forEach(anim => anim.setValue(0));
    
    // Create a more advanced shimmer that updates multiple characters with a gradient
    let position = -4; // Start off-screen for a wider effect
    
    // Create an interval to update the shimmer position
    shimmerPositionRef.current = setInterval(() => {
      position += 0.5; // Consistent speed
      
      if (position > totalChars + 4) {
        position = -4; // Reset when we go past the end
      }
      
      // Update all character animations based on their distance from the shimmer position
      shimmerAnims.forEach((anim, index) => {
        // Calculate distance from current shimmer position
        const distance = Math.abs(index - position);
        
        // Calculate intensity based on distance (within a 4-character radius)
        let intensity = 0;
        if (distance <= 4) {
          // Linear falloff
          intensity = 1 - (distance / 4);
        }
        
        // Update animation value
        anim.setValue(intensity);
      });
      
      setShimmerPosition(position);
    }, 16); // Update at ~60fps for smooth animation
  };

  const handleTextLayout = (event) => {
    const { lines } = event.nativeEvent;
    if (lines && lines.length > 0) {
      setLines(lines.map((line) => line.text));
    }
  };

  // If lines are not calculated yet, render the text to measure lines
  if (lines.length === 0) {
    return (
      <Text
        style={[styles.text, { color: effectiveCompleted ? completedColor : secondaryColor, fontWeight }, style]}
        onTextLayout={handleTextLayout}
      >
        {text}
      </Text>
    );
  }

  // Determine if we're in dark mode based on the secondary color brightness
  // This is a simple way to detect if we should make text lighter or darker when highlighting
  const isDarkMode = () => {
    // Extract RGB components from secondaryColor hex
    const r = parseInt(secondaryColor.slice(1, 3), 16) / 255;
    const g = parseInt(secondaryColor.slice(3, 5), 16) / 255;
    const b = parseInt(secondaryColor.slice(5, 7), 16) / 255;
    
    // Calculate perceived brightness (using standard luminance formula)
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
    
    // If brightness is low, we're in dark mode
    return brightness < 0.5;
  };
  
  const isTextDark = isDarkMode();

  // Now that we have lines, render the text with animations
  let charIndex = 0;
  return (
    <View style={styles.container}>
      {lines.map((lineText, lineIndex) => {
        const characters = lineText.split('');
        const lineChars = characters.map((char, index) => {
          const fadeAnim = fadeAnimsRef.current[charIndex];
          const shimmerAnim = shimmerAnimsRef.current[charIndex];
          
          // Interpolate color based on shimmer and fade animations
          const baseColor = fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['transparent', secondaryColor],
          });
          
          // Calculate color based on shimmer intensity
          const shimmerColor = shimmerAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [secondaryColor, '#ffffff'],
          });
          
          // For completed state, transition to the completed color
          const finalColor = effectiveCompleted 
            ? completedColor
            : shimmerColor;
          
          const animatedChar = (
            <Animated.Text
              key={charIndex}
              style={[
                { 
                  fontWeight,
                  color: effectiveCompleted ? completedColor : shimmerColor,
                  opacity: fadeAnim, // Fade in initially
                }, 
                style
              ]}
            >
              {char}
            </Animated.Text>
          );
          
          charIndex++;
          return animatedChar;
        });
        
        return (
          <Text key={lineIndex} style={[styles.text, style]}>
            {lineChars}
          </Text>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    // Allow parent component to control alignment
  },
  text: {
    fontSize: 15, // Default size, will be overridden by style prop
    // No text align to allow parent component to control
  },
});

export default AnimatedColorText; 