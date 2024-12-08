// LandscapeCarouselScreen.js

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import FoodCarouselLandscape from './FoodCarouselLandscape'; // Adjust the path as necessary

const LandscapeCarouselScreen = () => {
  useEffect(() => {
    // Lock the screen orientation to landscape
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

    return () => {
      // Unlock orientation when leaving the screen
      ScreenOrientation.unlockAsync();
    };
  }, []);

  return (
    <View style={styles.container}>
      <FoodCarouselLandscape isDark={true} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Adjust based on your theme
  },
});

export default LandscapeCarouselScreen;