// AnimatedTextFoodScan.js
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';

const AnimatedTextFoodScan = ({ text, colorScheme, style }) => {
  const [lines, setLines] = useState([]);

  const animationsRef = useRef([]);
  const animations = animationsRef.current;

  // Initialize animations when the text changes
  useEffect(() => {
    animationsRef.current = text.split('').map(() => new Animated.Value(0));
    setLines([]); // Reset lines when text changes
  }, [text]);

  useEffect(() => {
    // Start animations
    animations.forEach((anim) => anim.setValue(0));

    const animationSequence = animations.map((anim) => {
      return Animated.timing(anim, {
        toValue: 1,
        duration: 500, // Duration for each character's fade-in
        useNativeDriver: false, // Must be false for opacity animation on Text
      });
    });

    Animated.stagger(20, animationSequence).start();

    return () => {
      animations.forEach((anim) => anim.stopAnimation());
    };
  }, [animations]);

  const handleTextLayout = (event) => {
    const { lines } = event.nativeEvent;
    if (lines && lines.length > 0) {
      setLines(lines.map((line) => line.text));
    }
  };

  const textColor = colorScheme === 'dark' ? '#999' : '#666';

  // If lines are not calculated yet, render the text to measure lines
  if (lines.length === 0) {
    return (
      <Text
        style={[styles.text, { color: textColor }, style]}
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
        const lineChars = characters.map((char) => {
          const animation = animations[charIndex];
          const animatedChar = (
            <Animated.Text
              key={charIndex}
              style={[{ opacity: animation }, style]}
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
    alignItems: 'center', // Adjust alignment as needed
  },
  text: {
    fontSize: 14, // This will be overridden by your custom style
    lineHeight: 25,
    textAlign: 'center', // Adjust alignment as needed
  },
});

export default AnimatedTextFoodScan;