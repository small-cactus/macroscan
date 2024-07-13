import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Animated,
  Appearance,
  SafeAreaView,
} from 'react-native';

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
    const interval = setInterval(changePhrase, 3000);

    return () => clearInterval(interval);
  }, [fadeAnim]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Loading</Text>
        <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#FFF' : '#000'} style={styles.loadingIndicator} />
        <Animated.Text style={[styles.subText, { opacity: fadeAnim }]}>
          {currentPhrase}
        </Animated.Text>
      </View>
    </SafeAreaView>
  );
};

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '5%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    textAlign: 'center',
    marginBottom: '15%',
  },
  loadingIndicator: {
    marginBottom: '5%',
  },
  subText: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#EEE' : '#666',
    textAlign: 'center',
  },
});

export default LoadingScreen;