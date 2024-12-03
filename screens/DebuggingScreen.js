import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  Appearance,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../userContext';

const DebuggingScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);
  const { user, setUser, updateUser } = useUser();

  const [pin, setPin] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [originalScanCount, setOriginalScanCount] = useState(0);
  const [isSubscribedPlus, setIsSubscribedPlus] = useState(false);
  const [isSubscribedPlusPlus, setIsSubscribedPlusPlus] = useState(false);
  const [hasPurchasedAdsRemoval, setHasPurchasedAdsRemoval] = useState(false);
  const [isFirstDayUnlimited, setIsFirstDayUnlimited] = useState(false);
  const [testUserId, setTestUserId] = useState('');
  const [testUserData, setTestUserData] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        if (user) {
          console.log('No authenticated user.');
        }

        try {
          const storedScanCount = await AsyncStorage.getItem('dailyScanCount');
          const parsedScanCount = parseInt(storedScanCount);
          const firstUseDate = await AsyncStorage.getItem('firstUseDate');
          const today = new Date().toISOString().slice(0, 10);

          if (firstUseDate === today) {
            setIsFirstDayUnlimited(true);
            setScanCount(Infinity);
          } else {
            setIsFirstDayUnlimited(false);
            setScanCount(parsedScanCount || 0);
          }

          setOriginalScanCount(parsedScanCount || 0);
          console.log('Data fetched on focus');
        } catch (error) {
          console.error('Error fetching data from AsyncStorage:', error);
        }
      };

      fetchData();
    }, [user])
  );

  const validatePin = () => {
    if (pin === '7778') {
      setAccessGranted(true);
      console.log("Access granted");
    } else {
      Alert.alert('Access Denied', 'Incorrect PIN');
      console.log("Access denied");
    }
  };

  const updateScanCount = async (newCount) => {
    if (!isNaN(newCount)) {
      try {
        await AsyncStorage.setItem('dailyScanCount', newCount.toString());
        setScanCount(newCount);
        Alert.alert('Success', 'Scan count updated successfully');
        console.log("Scan count updated to:", newCount);
      } catch (error) {
        console.error('Error updating scan count:', error);
        Alert.alert('Error', 'Failed to update scan count');
      }
    } else {
      Alert.alert('Error', 'Invalid number entered');
    }
  };

  const resetScanCount = async () => {
    try {
      const newCount = isFirstDayUnlimited ? Infinity : originalScanCount;
      await AsyncStorage.setItem('dailyScanCount', newCount.toString());
      setScanCount(newCount);
      Alert.alert('Success', 'Scan count reset successfully');
      console.log("Scan count reset to:", newCount);
    } catch (error) {
      console.error('Error resetting scan count:', error);
      Alert.alert('Error', 'Failed to reset scan count');
    }
  };

  const handleSubscriptionChange = async (type) => {
    if (!user) {
      Alert.alert('Error', 'No user authenticated');
      return;
    }
    try {
      switch (type) {
        case 'plus':
          setIsSubscribedPlus(!isSubscribedPlus);
          setIsSubscribedPlusPlus(false);
          await updateUser({ subscriptionStatus: !isSubscribedPlus ? 'plus' : 'free' });
          Alert.alert('Subscription Update', isSubscribedPlus ? 'Unsubscribed from Plus' : 'Subscribed to Plus');
          console.log("Subscription Plus toggled:", !isSubscribedPlus);
          break;
        case 'plusplus':
          setIsSubscribedPlusPlus(!isSubscribedPlusPlus);
          setIsSubscribedPlus(false);
          await updateUser({ subscriptionStatus: !isSubscribedPlusPlus ? 'plusplus' : 'free' });
          Alert.alert('Subscription Update', isSubscribedPlusPlus ? 'Unsubscribed from PlusPlus' : 'Subscribed to PlusPlus');
          console.log("Subscription PlusPlus toggled:", !isSubscribedPlusPlus);
          break;
        case 'ads':
          setHasPurchasedAdsRemoval(!hasPurchasedAdsRemoval);
          Alert.alert('Purchase Update', hasPurchasedAdsRemoval ? 'Ads Purchase Removed' : 'Ads Purchase Added');
          console.log("Ads Removal toggled:", !hasPurchasedAdsRemoval);
          break;
        case 'free':
          setIsSubscribedPlus(false);
          setIsSubscribedPlusPlus(false);
          await updateUser({ subscriptionStatus: 'free' });
          Alert.alert('Subscription Update', 'Set to Free Plan');
          console.log("Subscription set to Free");
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      Alert.alert('Error', 'Failed to update subscription');
    }
  };

  const toggleFirstDayUnlimited = async (value) => {
    try {
      setIsFirstDayUnlimited(value);
      const today = new Date().toISOString().slice(0, 10);
      await AsyncStorage.setItem('firstUseDate', value ? today : '1990-01-01');
      Alert.alert('First Day Unlimited', value ? 'Enabled' : 'Disabled');
      console.log("First Day Unlimited toggled:", value);
    } catch (error) {
      console.error('Error toggling first day unlimited:', error);
      Alert.alert('Error', 'Failed to toggle first day unlimited');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
      </TouchableOpacity>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Developer Debugging</Text>
        {!accessGranted ? (
          <>
            <TextInput
              style={styles.input}
              onChangeText={setPin}
              value={pin}
              placeholder="Enter PIN"
              keyboardType="numeric"
              secureTextEntry={true}
            />
            <TouchableOpacity style={styles.submitButton} onPress={validatePin}>
              <Text style={styles.submitButtonText}>Submit PIN</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.content}>
            <Text style={styles.description}>Modify Application States:</Text>
            <Text style={styles.optionDescription}>Scans used today - affects limits on daily scan usage:</Text>
            <TextInput
              style={styles.input}
              onChangeText={text => updateScanCount(parseInt(text))}
              value={scanCount.toString()}
              keyboardType="numeric"
              placeholder="Update Scan Count"
            />
            <TouchableOpacity style={styles.button} onPress={resetScanCount}>
              <Text style={styles.buttonText}>Reset Scan Count</Text>
            </TouchableOpacity>
            <View style={styles.switchContainer}>
              <Text style={styles.optionDescription}>Toggle MacroScan+ Subscription:</Text>
              <TouchableOpacity style={styles.button} onPress={() => handleSubscriptionChange('plus')}>
                <Text style={styles.buttonText}>{isSubscribedPlus ? 'Unsubscribe' : 'Subscribe'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.optionDescription}>Toggle MacroScan++ Subscription:</Text>
              <TouchableOpacity style={styles.button} onPress={() => handleSubscriptionChange('plusplus')}>
                <Text style={styles.buttonText}>{isSubscribedPlusPlus ? 'Unsubscribe' : 'Subscribe'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.optionDescription}>Toggle Ads Removal Purchase:</Text>
              <TouchableOpacity style={styles.button} onPress={() => handleSubscriptionChange('ads')}>
                <Text style={styles.buttonText}>{hasPurchasedAdsRemoval ? 'Remove Purchase' : 'Add Purchase'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.optionDescription}>Toggle Free Plan:</Text>
              <TouchableOpacity style={styles.button} onPress={() => handleSubscriptionChange('free')}>
                <Text style={styles.buttonText}>Set to Free Plan</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.optionDescription}>First Day with Unlimited Scans:</Text>
              <TouchableOpacity style={styles.button} onPress={() => toggleFirstDayUnlimited(!isFirstDayUnlimited)}>
                <Text style={styles.buttonText}>{isFirstDayUnlimited ? 'Disable' : 'Enable'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
  },
  container: {
    padding: '5%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    textAlign: 'center',
    marginBottom: '5%',
  },
  content: {
    marginTop: '2%',
    marginBottom: '20%',
  },
  description: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#EEE' : '#666',
    textAlign: 'center',
    marginBottom: '5%',
  },
  optionDescription: {
    fontSize: 14,
    color: colorScheme === 'dark' ? '#CCC' : '#888',
    marginBottom: 10,
  },
  input: {
    fontSize: 18,
    padding: 10,
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    backgroundColor: colorScheme === 'dark' ? '#333' : '#EEE',
    marginBottom: 20,
    borderRadius: 10,
  },
  submitButton: {
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#FFFFFF',
    borderRadius: 140,
    padding: 10,
    // Removed marginRight
    borderWidth: 2,
    borderColor: colorScheme === 'dark' ? '#2a2a2d' : '#eee',
  },
  button: {
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
    padding: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
  },
  switchContainer: {
    marginBottom: 20,
  },
  testUserData: {
    marginTop: 20,
    padding: 10,
    backgroundColor: colorScheme === 'dark' ? '#333' : '#EEE',
    borderRadius: 10,
  },
  testUserDataText: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#FFF' : '#000',
  },
  currentUserData: {
    marginTop: 20,
    padding: 10,
    backgroundColor: colorScheme === 'dark' ? '#333' : '#EEE',
    borderRadius: 10,
  },
});

export default DebuggingScreen;
