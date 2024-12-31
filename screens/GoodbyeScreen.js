import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  Dimensions,
  Platform,
} from 'react-native';
import { Appearance } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { FontAwesome } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const isIphoneSE = () => {
  const smallIphoneDimensions = [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 414, height: 736 },
    { width: 360, height: 640 },
    { width: 375, height: 812 },
    { width: 360, height: 780 },
  ];
  return (
    Platform.OS === 'ios' &&
    smallIphoneDimensions.some(
      dim =>
        (width === dim.width && height === dim.height) ||
        (width === dim.height && height === dim.width)
    )
  );
};

export default function GoodbyeScreen({ navigation }) {
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const styles = getDynamicStyles(colorScheme);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const handleExit = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  };

  const handleEmail = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const email = 'macroscan.help@gmail.com';
    const subject = encodeURIComponent('Need Help');
    const body = encodeURIComponent('Hello MacroScan Support,\n\nI need help with...');
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  return (
    <View style={styles.View}>
      <View style={styles.logoContainer}>
        <View style={styles.logoBackground}>
          <Image
            source={require('../assets/icon.png')}
            style={styles.logo}
          />
        </View>
      </View>
      <Text style={styles.title}>Goodbye, User. 😔</Text>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.buttonTouchable}
          onPress={handleExit}
        >
          <LinearGradient
            colors={['#101010', '#555']}
            style={styles.button}
            start={[1, 1.3]}
            end={[1, 0]}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>Sign up again</Text>
              <FontAwesome
                name="arrow-right"
                size={16}
                color={colorScheme === 'dark' ? '#d8d8d8' : '#fff'}
                style={styles.arrowIcon}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButtonTouchable}
          onPress={handleEmail}
        >
          <View style={styles.secondaryButton}>
            <View style={styles.buttonContent}>
              <Text style={styles.secondaryButtonText}>Email Support</Text>
              <FontAwesome
                name="envelope"
                size={16}
                color={colorScheme === 'dark' ? '#d8d8d8' : '#fff'}
                style={styles.arrowIcon}
              />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getDynamicStyles = (colorScheme) =>
  StyleSheet.create({
    View: {
      flexGrow: 1,
      backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
    },
    container: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 0,
      backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
    },
    title: {
      fontSize: isIphoneSE() ? 28 : 30,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#fff' : '#333',
      textAlign: 'center',
      marginBottom: '20%',
      marginTop: '5%',
      zIndex: 1,
    },
    logoContainer: {
      marginTop: isIphoneSE() ? 45 : 120,
      alignItems: 'center',
      marginBottom: '10%',
    },
    logoBackground: {
      backgroundColor: '#FFF',
      borderRadius: 32,
      padding: 0,
      shadowColor: colorScheme === 'dark' ? '#fff' : '#000',
      shadowOffset: { width: 0, height: 15 },
      shadowOpacity: 0.25,
      shadowRadius: 15.84,
      elevation: 10,
    },
    logo: {
      width: 125,
      height: 125,
    },
    button: {
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#000',
      borderRadius: 20,
      borderWidth: 2,
      borderColor: colorScheme === 'dark' ? '#222' : '#bbb',
      padding: 12,
      height: 55,
      maxHeight: 60,
      paddingHorizontal: 25,
      shadowColor: colorScheme === 'dark' ? '#000' : '#AAA',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 15,
      elevation: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonTouchable: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
    },
    buttonText: {
      color: colorScheme === 'dark' ? '#d8d8d8' : '#fff',
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '600',
    },
    secondaryButtonTouchable: {
      marginTop: 20,
      width: '100%',
      alignItems: 'center',
      borderRadius: 20,
      marginBottom: '70%',
    },
    secondaryButton: {
      backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#444',
      borderRadius: 20,
      padding: 12,
      height: 55,
      maxHeight: 60,
      paddingHorizontal: 25,
      justifyContent: 'center',
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: colorScheme === 'dark' ? '#d8d8d8' : '#fff',
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '600',
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    arrowIcon: {
      marginLeft: 8,
    },
  });