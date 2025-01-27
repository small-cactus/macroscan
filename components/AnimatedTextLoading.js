import React from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

const AnimatedTextLoading = ({ text, colorScheme, style }) => {
  return (
    <Animated.Text style={[styles.text, style]}>
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

export default AnimatedTextLoading; 