// AnimatedDetails.js
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const AnimatedDetails = ({ text, colorScheme }) => {
  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: colorScheme === 'dark' ? '#CCC' : '#555' }]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingLeft: 32, // Align with text after the icon
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default AnimatedDetails;