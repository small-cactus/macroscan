import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Appearance,
  SafeAreaView,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import AnimatedTextLoading from './AnimatedTextLoading'; // Adjust the path as necessary

const { width, height } = Dimensions.get('window');

const isIphoneSE = () => {
  const smallIphoneDimensions = [
    { width: 320, height: 568 }, // iPhone SE (1st generation), iPhone 5, 5S, 5C
    { width: 375, height: 667 }, // iPhone 6, 6S, 7, 8, SE (2nd generation)
    { width: 414, height: 736 }, // iPhone 8 Plus
    { width: 360, height: 640 }, // iPhone SE (2020)
    { width: 375, height: 812 }, // iPhone 12 Mini, iPhone 13 Mini
    { width: 360, height: 780 }, // iPhone 12 Mini, iPhone 13 Mini
  ];

  return (
    Platform.OS === 'ios' &&
    smallIphoneDimensions.some(
      dim => (width === dim.width && height === dim.height) || (width === dim.height && height === dim.width)
    )
  );
};

const LoadingScreen = () => {
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);

  const [fadeAnim] = useState(new Animated.Value(0));
  const [currentPhrase, setCurrentPhrase] = useState('');

  const phrases = [
    'Preparing nutrients',
    'Applying polish',
    'Analyzing ingredients',
    'Calibrating taste buds',
    'Finalizing flavors',
  ];

  useEffect(() => {
    const changePhrase = () => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setCurrentPhrase(phrases[Math.floor(Math.random() * phrases.length)]);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    };

    changePhrase();
    const interval = setInterval(changePhrase, 2000);

    return () => clearInterval(interval);
  }, [fadeAnim]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Replace the Text component with AnimatedTextLoading */}
        <AnimatedTextLoading
          text="Setting up MacroScan"
          colorScheme={colorScheme}
          style={styles.title}
        />
        <ActivityIndicator
          size="large"
          color={colorScheme === 'dark' ? '#FFF' : '#000'}
          style={styles.loadingIndicator}
        />
      </View>
    </SafeAreaView>
  );
};

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '5%',
  },
  title: {
    fontSize: isIphoneSE() ? 28 : 30,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    textAlign: 'center',
    marginBottom: '10%',
  },
  loadingIndicator: {
    marginBottom: '10%',
  },
  subText: {
    fontSize: isIphoneSE() ? 16 : 18,
    color: colorScheme === 'dark' ? '#EEE' : '#666',
    textAlign: 'center',
  },
});

export default LoadingScreen;