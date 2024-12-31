import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Appearance,
  Animated,
  Linking,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

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

const NoInternetScreen = () => {
  const navigation = useNavigation();
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const styles = getDynamicStyles(colorScheme);
  const [isConnected, setIsConnected] = useState(false);
  const [secondsDisconnected, setSecondsDisconnected] = useState(0);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    const interval = setInterval(() => {
      if (!isConnected) {
        setSecondsDisconnected(prev => prev + 1);
      } else {
        setSecondsDisconnected(0);
      }
    }, 1000);

    if (secondsDisconnected >= 30) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isConnected, secondsDisconnected]);

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => {
        if (isConnected) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'HomeTabs' }],
          });
        }
      }, 2000);
      return () => clearTimeout(timer);
    }, [isConnected, navigation])
  );

  const handleRetry = async () => {
    await Haptics.selectionAsync();
    if (isConnected) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeTabs' }],
      });
    } else {
      Alert.alert("Still no connection", "Please check your internet settings.");
    }
  };

  const openSettings = () => {
    Linking.openURL('app-settings:');
  };

  return (
    <View style={styles.View}>
      <View style={styles.logoContainer}>
        <View style={styles.logoBackground}>
          <Ionicons
            name={isConnected ? "cloud-done-outline" : "cloud-offline-outline"}
            size={125}
            color={colorScheme === 'dark' ? '#333' : '#DDD'}
            style={styles.logo}
          />
        </View>
      </View>
      <Text style={styles.title}>
        {isConnected ? 'Connection Restored' : 'No Internet Connection'}
      </Text>
      <Text style={styles.description}>
        {isConnected
          ? 'You are now connected to the internet. Click Go Back to continue using MacroScan!'
          : 'It seems that you are not connected to the internet. Please check your connection to continue using MacroScan.'}
      </Text>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.buttonTouchable}
          onPress={handleRetry}>
          <LinearGradient
            colors={['#101010', '#555']}
            style={styles.button}
            start={[1, 1.3]}
            end={[1, 0]}>
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>
                {isConnected ? 'Go Back' : 'Retry'}
              </Text>
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
          onPress={openSettings}>
          <View style={styles.secondaryButton}>
            <View style={styles.buttonContent}>
              <Text style={styles.secondaryButtonText}>
                Open Internet Settings
              </Text>
              <FontAwesome
                name="cog"
                size={16}
                color={colorScheme === 'dark' ? '#d8d8d8' : '#fff'}
                style={styles.arrowIcon}
              />
            </View>
          </View>
        </TouchableOpacity>
      </View>
      <Animated.View style={[styles.timerContainer, { opacity: fadeAnim }]}>
        <Text style={styles.timerText}>
          You've been disconnected for {secondsDisconnected} seconds
        </Text>
      </Animated.View>
    </View>
  );
};

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
    logoContainer: {
      marginTop: isIphoneSE() ? 45 : 100,
      alignItems: 'center',
      marginBottom: '0%',
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
      alignSelf: 'center',
    },
    title: {
      fontSize: isIphoneSE() ? 28 : 30,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#fff' : '#333',
      textAlign: 'center',
      marginBottom: 20,
      marginTop: '5%',
      zIndex: 1,
    },
    description: {
      fontSize: 16,
      color: colorScheme === 'dark' ? '#EEE' : '#666',
      textAlign: 'center',
      marginBottom: '10%',
      paddingHorizontal: '5%',
    },
    buttonTouchable: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
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
      marginBottom: '10%',
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
    timerContainer: {
      marginTop: 20,
      alignItems: 'center',
    },
    timerText: {
      fontSize: 16,
      color: colorScheme === 'dark' ? '#CCC' : '#333',
    },
  });

export default NoInternetScreen;