import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';

const AIAnimatedText = ({ 
  text, 
  colorScheme, 
  style, 
  staggerDuration = 4, 
  animationDuration = 300,
  delay = 0,
  fontWeight = '600'
}) => {
  const [lines, setLines] = useState([]);

  const animationsRef = useRef([]);
  const animations = animationsRef.current;
  const animationTimer = useRef(null);

  // Initialize animations when the text changes
  useEffect(() => {
    animationsRef.current = text.split('').map(() => new Animated.Value(0));
    setLines([]); // Reset lines when text changes
    
    return () => {
      if (animationTimer.current) {
        clearTimeout(animationTimer.current);
      }
    };
  }, [text]);

  useEffect(() => {
    // Reset animations
    animations.forEach((anim) => anim.setValue(0));
    
    // Start animations after delay
    animationTimer.current = setTimeout(() => {
      const animationSequence = animations.map((anim) => {
        return Animated.timing(anim, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: false, // Must be false for opacity animation on Text
        });
      });

      Animated.stagger(staggerDuration, animationSequence).start();
    }, delay);

    return () => {
      if (animationTimer.current) {
        clearTimeout(animationTimer.current);
      }
      animations.forEach((anim) => anim.stopAnimation());
    };
  }, [animations, staggerDuration, animationDuration, delay]);

  const handleTextLayout = (event) => {
    const { lines } = event.nativeEvent;
    if (lines && lines.length > 0) {
      setLines(lines.map((line) => line.text));
    }
  };

  const textColor = colorScheme === 'dark' ? '#cccccc' : '#444444';

  // If lines are not calculated yet, render the text to measure lines
  if (lines.length === 0) {
    return (
      <Text
        style={[styles.text, { color: textColor, fontWeight }, style]}
        onTextLayout={handleTextLayout}
      >
        {text}
      </Text>
    );
  }

  // Now that we have lines, render the text with animations
  let charIndex = 0;
  return (
    <View style={styles.container}>
      {lines.map((lineText, lineIndex) => {
        const characters = lineText.split('');
        const lineChars = characters.map((char, index) => {
          const animation = animations[charIndex];
          const animatedChar = (
            <Animated.Text
              key={charIndex}
              style={[{ opacity: animation, fontWeight }, style]}
            >
              {char}
            </Animated.Text>
          );
          charIndex++;
          return animatedChar;
        });
        return (
          <Text
            key={lineIndex}
            style={[styles.text, { color: textColor }, style]}
          >
            {lineChars}
          </Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // We'll allow the parent component to control alignment
  },
  text: {
    fontSize: 15, // Default size, will be overridden by style prop
    // No text align to allow parent component to control
  },
});

export default AIAnimatedText; 