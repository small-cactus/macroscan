// AnimatedCenteredText.js
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';

const AnimatedCenteredText = ({ text, colorScheme, visible }) => {
  const [lines, setLines] = useState([]);

  const animationsRef = useRef([]);
  const animations = animationsRef.current;

  // Initialize animations when the text changes
  useEffect(() => {
    animationsRef.current = text.split('').map(() => new Animated.Value(0));
    setLines([]); // Reset lines when text changes
  }, [text]);

  useEffect(() => {
    if (visible) {
      animations.forEach((anim) => anim.setValue(0));

      const animationSequence = animations.map((anim, index) => {
        return Animated.timing(anim, {
          toValue: 1,
          duration: 800, // Duration for each character's fade-in
          useNativeDriver: false, // Must be false for opacity animation on Text
        });
      });

      Animated.stagger(2, animationSequence).start();
    } else {
      animations.forEach((anim) => anim.setValue(0));
    }

    return () => {
      animations.forEach((anim) => anim.stopAnimation());
    };
  }, [visible, animations]);

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
        style={[styles.text, { color: textColor }]}
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
              style={{ opacity: animation }}
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
            style={[styles.text, { color: textColor }]}
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
    marginBottom: 15,
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});

export default AnimatedCenteredText;