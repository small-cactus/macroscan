import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const DebuggingScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);

  // State for authentication and app data
  const [pin, setPin] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [isSubscribedPlus, setIsSubscribedPlus] = useState(false);
  const [isSubscribedPlusPlus, setIsSubscribedPlusPlus] = useState(false);
  const [hasPurchasedAdsRemoval, setHasPurchasedAdsRemoval] = useState(false);
  const [isFirstDayUnlimited, setIsFirstDayUnlimited] = useState(false);

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
      await AsyncStorage.setItem('dailyScanCount', newCount.toString());
      setScanCount(newCount);
      Alert.alert('Success', 'Scan count updated successfully');
      console.log("Scan count updated to:", newCount);
    } else {
      Alert.alert('Error', 'Invalid number entered');
    }
  };

  const handleSubscriptionChange = async (type) => {
    switch (type) {
      case 'plus':
        setIsSubscribedPlus(!isSubscribedPlus);
        setIsSubscribedPlusPlus(false); // Ensure only one subscription can be active
        Alert.alert('Subscription Update', isSubscribedPlus ? 'Unsubscribed from Plus' : 'Subscribed to Plus');
        console.log("Subscription Plus toggled:", !isSubscribedPlus);
        break;
      case 'plusplus':
        setIsSubscribedPlusPlus(!isSubscribedPlusPlus);
        setIsSubscribedPlus(false); // Ensure only one subscription can be active
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
  };

  const toggleFirstDayUnlimited = async (value) => {
    setIsFirstDayUnlimited(value);
    const today = new Date().toISOString().slice(0, 10);
    await AsyncStorage.setItem('firstUseDate', value ? today : '1990-01-01');
    Alert.alert('First Day Unlimited', value ? 'Enabled' : 'Disabled');
    console.log("First Day Unlimited toggled:", value);
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
});

export default DebuggingScreen;
