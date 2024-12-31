import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NutrientSlider = ({ lower, main, upper, unit, colorScheme }) => {
  // Define a base width for the slider and adjust based on margin of error
  const baseWidth = 100;
  const scalingFactor = 2; // Adjust this factor to increase/decrease slider length based on error
  const marginOfErrorPercent = ((upper - lower) / main) * 100;
  const sliderWidth = baseWidth + (marginOfErrorPercent * scalingFactor);

  return (
    <View style={styles.sliderContainer}>
      <Text style={[styles.boundText, { color: '#FF6347' }]}>{lower}</Text>
      <View style={[styles.sliderLine, { width: sliderWidth }]}>
        <View style={styles.markerContainer}>
          <View style={styles.marker} />
          <Text style={styles.mainValue}>{main}</Text>
        </View>
      </View>
      <Text style={[styles.boundText, { color: '#FF6347' }]}>{upper}</Text>
      <Text style={[styles.unitText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>{unit}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  boundText: {
    fontSize: 12,
  },
  sliderLine: {
    height: 2,
    backgroundColor: '#888888',
    marginHorizontal: 8,
    position: 'relative',
    justifyContent: 'center',
  },
  markerContainer: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -10 }],
    alignItems: 'center',
  },
  marker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6347',
    marginBottom: 4,
  },
  mainValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6347',
  },
  unitText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});

export default NutrientSlider;