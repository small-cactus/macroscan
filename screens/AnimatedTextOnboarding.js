// AnimatedTextOnboarding.js
import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

const AnimatedTextOnboarding = ({ text, colorScheme, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [text]);

  return (
    <Animated.Text 
      style={[
        styles.text,
        style,
        { opacity: fadeAnim }
      ]}
    >
      {text}
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: '400',
  },
});

export default AnimatedTextOnboarding;