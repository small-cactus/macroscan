// AnimatedTextOnboarding.js
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';

const AnimatedTextOnboarding = ({ data, colorScheme }) => {
  // Initialize animated values for each data item
  const animations = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Create an array of animation configurations
    const animationsArray = data.map((_, index) => {
      return Animated.timing(animations[index], {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      });
    });

    // Start staggered animations
    Animated.stagger(200, animationsArray).start();
  }, [animations, data]);

  // Determine if the current color scheme is dark
  const isDark = colorScheme === 'dark';

  // Define dynamic colors based on the color scheme
  const textColor = isDark ? '#CCC' : '#666';
  const valueColor = isDark ? '#FFF' : '#000';
  const borderColor = isDark ? '#444' : '#DDD';

  return (
    <View style={styles.container}>
      {data.map((item, index) => {
        // Define animation styles for each item
        const animationStyle = {
          opacity: animations[index],
          transform: [
            {
              translateY: animations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        };

        return (
          <Animated.View key={index} style={[styles.row, animationStyle, { borderBottomColor: borderColor }]}>
            <Text style={[styles.name, { color: textColor }]}>{item.name}</Text>
            <Text style={[styles.value, { color: valueColor }]}>{item.value}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  name: {
    fontSize: 16,
    // Color is now handled dynamically
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    // Color is now handled dynamically
  },
});

export default AnimatedTextOnboarding;