import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Appearance,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const FeaturesScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);

  const models = {
    'claude-3-opus-20240229': 'Perfect Precision',
    'claude-3-sonnet-20240229': 'Balanced',
    'claude-3-haiku-20240307': 'Fast',
  };

  const [selectedModel, setSelectedModel] = useState('claude-3-haiku-20240307');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    checkSubscription();
    loadModelSetting();
  }, []);

  const checkSubscription = async () => {
    // Fetch subscription status from AsyncStorage or server
    const status = await AsyncStorage.getItem('subscriptionStatus');
    setIsSubscribed(status === 'subscribed');
  };

  const loadModelSetting = async () => {
    const model = await AsyncStorage.getItem('selectedModel');
    if (model) setSelectedModel(model);
  };

  const handleModelChange = async (model) => {
    if (!isSubscribed) {
      Alert.alert("Upgrade Required", "You need to be a subscribed user to change this setting.");
      return;
    }
    await AsyncStorage.setItem('selectedModel', model);
    setSelectedModel(model);
    Alert.alert("Settings Updated", `Scanner accuracy set to ${models[model]}.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
      </TouchableOpacity>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>AI Scanner Accuracy Settings</Text>
        <View style={styles.content}>
          {Object.entries(models).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={[styles.optionButton, selectedModel === key && styles.optionButtonSelected]}
              onPress={() => handleModelChange(key)}
              disabled={!isSubscribed}
            >
              <Text style={styles.optionText}>{value}</Text>
            </TouchableOpacity>
          ))}
          {!isSubscribed && (
            <Text style={styles.upgradeText}>
              Note: Upgrade to change these options. Currently, 'Fast' is selected by default.
            </Text>
          )}
        </View>
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
  optionButton: {
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#EEE',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  optionButtonSelected: {
    borderColor: colorScheme === 'dark' ? '#FFF' : '#000',
    borderWidth: 2,
  },
  optionText: {
    fontSize: 18,
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    textAlign: 'center',
  },
  upgradeText: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#999' : '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    left: '5%',
    top: '9%',
    zIndex: 10,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
    padding: 10,
  },
});

export default FeaturesScreen;
