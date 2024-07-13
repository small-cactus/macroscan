import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Appearance,
  Animated,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const NoInternetScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);
  const [isConnected, setIsConnected] = useState(false);
  const [secondsDisconnected, setSecondsDisconnected] = useState(0);
  const fadeAnim = useState(new Animated.Value(0))[0];

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

  const handleRetry = () => {
    Haptics.selectionAsync();
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Ionicons
          name={isConnected ? "cloud-done-outline" : "cloud-offline-outline"}
          size={100}
          color={colorScheme === 'dark' ? '#333' : '#DDD'}
          style={styles.icon}
        />
        <Text style={styles.title}>{isConnected ? 'Connection Restored' : 'No Internet Connection'}</Text>
        <Text style={styles.description}>
          {isConnected 
            ? 'You are now connected to the internet. Click Go Back to continue using MacroScan!'
            : 'It seems that you are not connected to the internet. Please check your connection to continue using MacroScan.'
          }
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>{isConnected ? 'Go Back' : 'Retry'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
          <Text style={styles.settingsButtonText}>Open Internet Settings</Text>
        </TouchableOpacity>
        <Animated.View style={[styles.timerContainer, { opacity: fadeAnim }]}>
          <Text style={styles.timerText}>You've been disconnected for {secondsDisconnected} seconds</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  container: {
    paddingHorizontal: '5%',
    alignItems: 'center',
    marginTop: '10%',
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#EEE' : '#666',
    textAlign: 'center',
    marginBottom: '20%',
    paddingHorizontal: '5%',
  },
  retryButton: {
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
    borderRadius: 90,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4%',
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingsButton: {
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
    borderRadius: 90,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  settingsButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timerContainer: {
    marginTop: 20,
  },
  timerText: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#CCC' : '#333',
  },
});

export default NoInternetScreen;
