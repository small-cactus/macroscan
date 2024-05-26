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
import { firestore } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
          try {
            const userDocRef = doc(firestore, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              setCurrentUserData(userDoc.data());
              console.log('Current user data fetched:', userDoc.data());
            } else {
              console.log('No user document found for current user.');
            }
          } catch (error) {
            console.error('Error fetching current user data:', error);
          }
        } else {
          console.log('No authenticated user.');
        }

        try {
          const storedScanCount = await AsyncStorage.getItem('dailyScanCount');
          const parsedScanCount = parseInt(storedScanCount);
          setScanCount(parsedScanCount || 0);
          setOriginalScanCount(parsedScanCount || 0);

          const firstUseDate = await AsyncStorage.getItem('firstUseDate');
          setIsFirstDayUnlimited(firstUseDate === new Date().toISOString().slice(0, 10));

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
      await AsyncStorage.setItem('dailyScanCount', originalScanCount.toString());
      setScanCount(originalScanCount);
      Alert.alert('Success', 'Scan count reset successfully');
      console.log("Scan count reset to:", originalScanCount);
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

  const createTestUser = async () => {
    try {
      const userId = 'test_user_id';
      const userData = {
        name: 'Test User',
        email: 'testuser@example.com',
        subscriptionStatus: 'free',
      };
      const userDocRef = doc(firestore, 'users', userId);
      await setDoc(userDocRef, userData);
      console.log('Test user created:', userData);
      Alert.alert('Success', 'Test user created successfully');
    } catch (error) {
      console.error('Error creating test user:', error);
      Alert.alert('Error', 'Failed to create test user');
    }
  };

  const fetchTestUserData = async () => {
    try {
      const userDocRef = doc(firestore, 'users', testUserId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        console.log('Test user data fetched:', userDoc.data());
        setTestUserData(userDoc.data());
      } else {
        console.log('No such test user found');
        Alert.alert('Error', 'No such test user found');
      }
    } catch (error) {
      console.error('Error fetching test user data:', error);
      Alert.alert('Error', 'Failed to fetch test user data');
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
              <Text style={styles.optionDescription}>First Day with Unlimited Scans:</Text>
              <TouchableOpacity style={styles.button} onPress={() => toggleFirstDayUnlimited(!isFirstDayUnlimited)}>
                <Text style={styles.buttonText}>{isFirstDayUnlimited ? 'Disable' : 'Enable'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.optionDescription}>Create Test User:</Text>
              <TouchableOpacity style={styles.button} onPress={createTestUser}>
                <Text style={styles.buttonText}>Create Test User</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.optionDescription}>Fetch Test User Data:</Text>
              <TextInput
                style={styles.input}
                onChangeText={setTestUserId}
                value={testUserId}
                placeholder="Enter Test User ID"
              />
              <TouchableOpacity style={styles.button} onPress={fetchTestUserData}>
                <Text style={styles.buttonText}>Fetch Test User Data</Text>
              </TouchableOpacity>
              {testUserData && (
                <View style={styles.testUserData}>
                  <Text style={styles.testUserDataText}>Name: {testUserData.name}</Text>
                  <Text style={styles.testUserDataText}>Email: {testUserData.email}</Text>
                  <Text style={styles.testUserDataText}>Subscription: {testUserData.subscriptionStatus}</Text>
                </View>
              )}
            </View>
            {currentUserData && (
              <View style={styles.currentUserData}>
                <Text style={styles.optionDescription}>Current User Data:</Text>
                <Text style={styles.testUserDataText}>Name: {currentUserData.name}</Text>
                <Text style={styles.testUserDataText}>Email: {currentUserData.email}</Text>
                <Text style={styles.testUserDataText}>Subscription: {currentUserData.subscriptionStatus}</Text>
              </View>
            )}
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
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#000',
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
    position: 'absolute',
    left: '5%',
    top: '5%',
    zIndex: 10,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#FFFFFF',
    borderRadius: 14,
    padding: 10,
  },
  button: {
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#000',
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
