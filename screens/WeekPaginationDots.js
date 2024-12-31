// WeekPaginationDots.js

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const WEEKS_RANGE = 52; // Ensure this matches the range used in InsightsV2.js

const SCALING_THRESHOLD = 0.2; // Threshold to detect significant scale changes

const WeekPaginationDots = React.memo(({ scrollX }) => {
  // Refs to store the previous dot scales
  const prevLeftScale = useRef(1); // Initialized to 1 as per your original mapping
  const prevCenterScale = useRef(1.4); // Initialized to 1.4 as per your original mapping
  const prevRightScale = useRef(1); // Initialized to 1 as per your original mapping
  const prevFutureRightScale = useRef(0); // Initialized to 0 as per your original mapping

  useEffect(() => {
    // Listener callback to monitor scrollX updates
    const listenerId = scrollX.addListener(({ value }) => {
      // Calculate currentPage
      const currentPageValue = (value - WEEKS_RANGE * width) / width;

      // Calculate fractionalPage with full positive range
      let fractionalPageValue = currentPageValue % 2; // Allow up to double
      if (fractionalPageValue < 0) fractionalPageValue += 2; // Map negatives to positive
      fractionalPageValue = Math.min(fractionalPageValue, 1.999999); // Prevent reaching 2.00

      // Remap fractionalPageValue to [0, 1)
      fractionalPageValue = fractionalPageValue % 1;

      // Manually compute scale values based on fractionalPageValue
      const dotSpacing = 25;

      // Left Dot Interpolations
      const leftTranslateXValue = interpolateValue(
        fractionalPageValue,
        [0, 1],
        [-dotSpacing, -2 * dotSpacing]
      );
      const leftScaleValue = interpolateValue(
        fractionalPageValue,
        [0, 1],
        [1, 0] // **Left Dot Mapping Remains Unchanged**
      );
      const leftOpacityValue = interpolateValue(
        fractionalPageValue,
        [0, 1],
        [1, 0]
      );

      // Center Dot Interpolations
      const centerTranslateXValue = interpolateValue(
        fractionalPageValue,
        [0, 1],
        [0, -dotSpacing]
      );
      const centerScaleValue = interpolateValue(
        fractionalPageValue,
        [0, 1],
        [1.4, 1]
      );
      const centerColorValue =
        fractionalPageValue < 0.5 ? '#222222' : '#aaaaaa'; // Simplified for logging

      // Right Dot Interpolations
      const rightTranslateXValue = interpolateValue(
        fractionalPageValue,
        [0, 1],
        [dotSpacing, 0]
      );
      const rightScaleValue = interpolateValue(
        fractionalPageValue,
        [0, 1],
        [1, 1.4]
      );
      const rightColorValue =
        fractionalPageValue < 0.5 ? '#aaaaaa' : '#222222'; // Simplified for logging

      // Future Right Dot Interpolations
      const futureRightTranslateXValue = interpolateValue(
        fractionalPageValue,
        [0, 1],
        [2 * dotSpacing, dotSpacing]
      );
      const futureRightScaleValue = interpolateValue(
        fractionalPageValue,
        [0, 1],
        [0, 1]
      );
      const futureRightOpacityValue = interpolateValue(
        fractionalPageValue,
        [0, 0.5, 1],
        [0, 0.5, 1]
      );

      // Check for significant scale changes
      const scaleChanges =
        Math.abs(leftScaleValue - prevLeftScale.current) >= SCALING_THRESHOLD ||
        Math.abs(centerScaleValue - prevCenterScale.current) >= SCALING_THRESHOLD ||
        Math.abs(rightScaleValue - prevRightScale.current) >= SCALING_THRESHOLD ||
        Math.abs(futureRightScaleValue - prevFutureRightScale.current) >= SCALING_THRESHOLD;

      if (scaleChanges) {
        console.log(`\n--- ScrollX Updated ---`);
        console.log(`scrollX value: ${value.toFixed(2)}`);
        console.log(`Calculated Current Page: ${currentPageValue.toFixed(2)}`);
        console.log(`Calculated Fractional Page: ${fractionalPageValue.toFixed(6)}`);

        console.log(
          `Left Dot - TranslateX: ${leftTranslateXValue.toFixed(
            2
          )}, Scale: ${leftScaleValue.toFixed(
            2
          )}, Opacity: ${leftOpacityValue.toFixed(2)}`
        );
        console.log(
          `Center Dot - TranslateX: ${centerTranslateXValue.toFixed(
            2
          )}, Scale: ${centerScaleValue.toFixed(
            2
          )}, Color: ${centerColorValue}`
        );
        console.log(
          `Right Dot - TranslateX: ${rightTranslateXValue.toFixed(
            2
          )}, Scale: ${rightScaleValue.toFixed(
            2
          )}, Color: ${rightColorValue}`
        );
        console.log(
          `Future Right Dot - TranslateX: ${futureRightTranslateXValue.toFixed(
            2
          )}, Scale: ${futureRightScaleValue.toFixed(
            2
          )}, Opacity: ${futureRightOpacityValue.toFixed(2)}`
        );

        // Update previous scales
        prevLeftScale.current = leftScaleValue;
        prevCenterScale.current = centerScaleValue;
        prevRightScale.current = rightScaleValue;
        prevFutureRightScale.current = futureRightScaleValue;
      }
    });

    // Clean up the listener on unmount
    return () => {
      scrollX.removeListener(listenerId);
      console.log('ScrollX listener removed.');
    };
  }, [scrollX]);

  // Helper function to mimic Animated's interpolate
  const interpolateValue = (value, inputRange, outputRange) => {
    // Simple linear interpolation
    if (value <= inputRange[0]) return outputRange[0];
    if (value >= inputRange[inputRange.length - 1]) return outputRange[outputRange.length - 1];

    for (let i = 0; i < inputRange.length - 1; i++) {
      if (value >= inputRange[i] && value < inputRange[i + 1]) {
        const ratio = (value - inputRange[i]) / (inputRange[i + 1] - inputRange[i]);
        return outputRange[i] + ratio * (outputRange[i + 1] - outputRange[i]);
      }
    }
    return outputRange[outputRange.length - 1];
  };

  // Calculate the current page based on scrollX
  const currentPage = Animated.divide(
    Animated.subtract(scrollX, WEEKS_RANGE * width),
    width
  );

  // Calculate fractionalPage ensuring it stays within [0, 1)
  const fractionalPage = Animated.modulo(
    currentPage,
    1
  );

  const dotSpacing = 25;

  // Define interpolations based on fractionalPage
  const leftTranslateX = fractionalPage.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [-dotSpacing, -2 * dotSpacing, -dotSpacing],
    extrapolate: 'clamp',
  });

  const leftScale = fractionalPage.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [1, 0, 1], // **Left Dot Mapping Remains Unchanged**
    extrapolate: 'clamp',
  });

  const leftOpacity = fractionalPage.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [1, 0, 1],
    extrapolate: 'clamp',
  });

  const centerTranslateX = fractionalPage.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, -dotSpacing, 0],
    extrapolate: 'clamp',
  });

  const centerScale = fractionalPage.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [1.4, 1, 1.4],
    extrapolate: 'clamp',
  });

  const centerColor = fractionalPage.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['#222222', '#aaaaaa', '#222222'],
    extrapolate: 'clamp',
  });

  const rightTranslateX = fractionalPage.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [dotSpacing, 0, dotSpacing],
    extrapolate: 'clamp',
  });

  const rightScale = fractionalPage.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [1, 1.4, 1],
    extrapolate: 'clamp',
  });

  const rightColor = fractionalPage.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['#aaaaaa', '#222222', '#aaaaaa'],
    extrapolate: 'clamp',
  });

  const futureRightTranslateX = fractionalPage.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [2 * dotSpacing, dotSpacing, 0],
    extrapolate: 'clamp',
  });

  const futureRightScale = fractionalPage.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  const futureRightOpacity = fractionalPage.interpolate({
    inputRange: [0, 0.5, 1, 1.5, 2],
    outputRange: [0, 0.5, 1, 0.5, 0],
    extrapolate: 'clamp',
  });

  // Static Colors
  const leftColorStatic = '#aaa';
  const futureRightColorStatic = '#aaa';

  return (
    <View style={styles.paginationDotsContainer}>
      {/* Left Dot */}
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: leftColorStatic,
            transform: [
              { translateX: leftTranslateX },
              { translateY: -4 },
              { scale: leftScale },
            ],
            opacity: leftOpacity,
          },
        ]}
      />

      {/* Center Dot */}
      <Animated.View
        style={[
          styles.bigDot,
          {
            backgroundColor: centerColor,
            transform: [
              { translateX: centerTranslateX },
              { translateY: -5 },
              { scale: centerScale },
            ],
          },
        ]}
      />

      {/* Right Dot */}
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: rightColor,
            transform: [
              { translateX: rightTranslateX },
              { translateY: -4 },
              { scale: rightScale },
            ],
          },
        ]}
      />

      {/* Future Right Dot */}
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: futureRightColorStatic,
            transform: [
              { translateX: futureRightTranslateX },
              { translateY: -4 },
              { scale: futureRightScale },
            ],
            opacity: futureRightOpacity,
          },
        ]}
      />
    </View>
  );
});

// Helper function to mimic Animated's interpolate in JS
const interpolateValue = (value, inputRange, outputRange) => {
  if (inputRange.length !== outputRange.length) {
    console.warn('Input range and output range must have the same length');
    return outputRange[outputRange.length - 1];
  }

  if (value <= inputRange[0]) return outputRange[0];
  if (value >= inputRange[inputRange.length - 1]) return outputRange[outputRange.length - 1];

  for (let i = 0; i < inputRange.length - 1; i++) {
    if (value >= inputRange[i] && value < inputRange[i + 1]) {
      const ratio = (value - inputRange[i]) / (inputRange[i + 1] - inputRange[i]);
      return outputRange[i] + ratio * (outputRange[i + 1] - outputRange[i]);
    }
  }
  return outputRange[outputRange.length - 1];
};

const styles = StyleSheet.create({
  paginationDotsContainer: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    width: 100,
    height: 20,
    overflow: 'visible',
  },
  dot: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bigDot: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default WeekPaginationDots;