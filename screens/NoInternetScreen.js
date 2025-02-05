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
  Image,
  Switch,
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
  const [buttonScaleAnim] = useState(new Animated.Value(1));

  // Set debugNoInternet to true to simulate no internet connection
  const [debugNoInternet] = useState(false);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(debugNoInternet ? false : state.isConnected);
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

  const handlePressIn = () => {
    Animated.spring(buttonScaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleRetry = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <View style={styles.headerLogo}>
              <Image 
                source={require('../assets/icon.png')} 
                style={{width: 35, height: 35}}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.headerText}>MacroScan</Text>
          </View>
        </View>

        <View style={styles.logoContainer}>
          <View style={styles.logoBackground}>
            <Ionicons
              name={isConnected ? "cloud-done-outline" : "cloud-offline-outline"}
              size={isIphoneSE() ? 110 : 125}
              color={colorScheme === 'dark' ? '#333' : '#DDD'}
              style={styles.logo}
            />
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isConnected ? 'Connection Restored' : 'No Internet Connection'}
          </Text>
          <Text style={styles.description}>
            {isConnected
              ? 'You are now connected to the internet. Click Go Back to continue using MacroScan!'
              : 'It seems that you are not connected to the internet. Please check your connection to continue using MacroScan.'}
          </Text>
          <Animated.View style={[styles.timerContainer, { opacity: fadeAnim }]}>
          <Text style={styles.timerText}>
            You've been disconnected for {secondsDisconnected} seconds
          </Text>
        </Animated.View>
        </View>

        <View style={styles.buttonContainer}>
          <Animated.View style={[
            styles.buttonTouchable,
            { transform: [{ scale: buttonScaleAnim }] }
          ]}>
            <TouchableOpacity
              onPress={handleRetry}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <LinearGradient
                colors={colorScheme === 'dark' ? ['#2a2a2a', '#1a1a1a'] : ['#000', '#333']}
                style={styles.button}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
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
          </Animated.View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={openSettings}>
            <Text style={styles.secondaryButtonText}>
              Open App Settings
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Calculate scale factor based on screen size
const baseWidth = 430; // iPhone 14 Pro Max width
const baseHeight = 932; // iPhone 14 Pro Max height
const scaleWidth = width / baseWidth;
const scaleHeight = height / baseHeight;
const scale = Math.min(scaleWidth, scaleHeight);

const getDynamicStyles = (colorScheme) =>
  StyleSheet.create({
    View: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
    },
    contentContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: scale * 60,
    },
    textContainer: {
      alignItems: 'center',
      paddingHorizontal: scale * 20,
    },
    buttonContainer: {
      width: '100%',
      paddingHorizontal: scale * 24,
      alignItems: 'center',
    },
    logoContainer: {
      alignItems: 'center',
      marginTop: scale * 140,
    },
    logoBackground: {
      backgroundColor: '#FFF',
      borderRadius: 32,
      padding: 0,
    },
    logo: {
      alignSelf: 'center',
      padding: 16,
    },
    title: {
      fontSize: scale * 25,
      fontWeight: '800',
      color: colorScheme === 'dark' ? '#fff' : '#000',
      textAlign: 'center',
      marginBottom: scale * 16,
      letterSpacing: -0.5,
      padding: scale * 4,
    },
    description: {
      fontSize: scale * 18,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#999' : '#666',
      textAlign: 'center',
      marginBottom: scale * 250,
      letterSpacing: 0.2,
      paddingHorizontal: '5%',
    },
    buttonTouchable: {
      width: '100%',
      maxWidth: 400,
    },
    button: {
      borderRadius: scale * 16,
      padding: scale * 16,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: scale * 4 },
      shadowOpacity: 0.3,
      shadowRadius: scale * 8,
      elevation: 5,
    },
    buttonText: {
      color: '#fff',
      fontSize: scale * 18,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    secondaryButton: {
      marginTop: scale * 20,
      padding: scale * 12,
    },
    secondaryButtonText: {
      fontSize: scale * 15,
      color: colorScheme === 'dark' ? '#999' : '#666',
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    arrowIcon: {
      marginLeft: scale * 8,
    },
    timerContainer: {
      position: 'absolute',
      bottom: scale * 20,
      alignItems: 'center',
    },
    timerText: {
      fontSize: scale * 15,
      color: colorScheme === 'dark' ? '#999' : '#666',
    },
    headerContainer: {
      position: 'absolute',
      top: scale * 60,
      left: scale * 24,
      backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
      borderRadius: scale * 16,
      paddingVertical: scale * 12,
      paddingHorizontal: scale * 16,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#333' : '#e0e0e0',
      zIndex: 1,
      alignSelf: 'flex-start',
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerLogo: {
      width: scale * 45,
      height: scale * 45,
      borderRadius: scale * 12,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerText: {
      fontSize: scale * 22,
      fontWeight: '700',
      color: colorScheme === 'dark' ? '#fff' : '#000',
      marginLeft: scale * 12,
      letterSpacing: 0.3,
    },
  });

export default NoInternetScreen;