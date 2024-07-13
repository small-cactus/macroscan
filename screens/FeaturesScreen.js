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
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useUser } from '../userContext';

const FeaturesScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);
  const { user } = useUser();

  const models = {
    'claude-3-opus-20240229': 'Perfect Precision',
    'claude-3-sonnet-20240229': 'Balanced',
    'claude-3-haiku-20240307': 'Fast',
  };

  const descriptions = {
    'claude-3-opus-20240229': 'Highest accuracy, slower processing',
    'claude-3-sonnet-20240229': 'Balanced accuracy and speed',
    'claude-3-haiku-20240307': 'Fastest speed, average accuracy',
  };  

  const [selectedModel, setSelectedModel] = useState('claude-3-haiku-20240307');
  const [subscriptionStatus, setSubscriptionStatus] = useState('free');
  const [borderColor] = useState(new Animated.Value(0));
  const [currentBorderColor, setCurrentBorderColor] = useState('#AAA');

  useEffect(() => {
    checkSubscription();
    loadModelSetting();
  }, []);

  const checkSubscription = async () => {
    const status = user ? user.subscriptionStatus : 'free';
    setSubscriptionStatus(status);
  };

  const loadModelSetting = async () => {
    const model = await AsyncStorage.getItem('selectedModel');
    if (model) setSelectedModel(model);
  };

  const animateBorderColorGreen = () => {
    setCurrentBorderColor('green');
    Animated.sequence([
      Animated.timing(borderColor, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(borderColor, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start(() => setCurrentBorderColor('#AAA'));
  };

  const animateBorderColorRed = () => {
    setCurrentBorderColor('red');
    Animated.sequence([
      Animated.timing(borderColor, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(borderColor, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => setCurrentBorderColor('#AAA'));
  };

  const handleModelChange = async (model) => {
    if (selectedModel === model) {
      await Haptics.selectionAsync();
      return;
    }

    const showAlert = (message) => {
      setTimeout(() => {
        Alert.alert("Upgrade Required", message);
      }, 500);
    };

    if (subscriptionStatus === 'free' && model !== 'claude-3-haiku-20240307') {
      animateBorderColorRed();
      showAlert("You need to be a subscribed user to change this setting.");
      return;
    }

    if (subscriptionStatus === 'plus' && model === 'claude-3-opus-20240229') {
      animateBorderColorRed();
      showAlert("You need to be a MacroScan++ subscriber to use this setting.");
      return;
    }

    await AsyncStorage.setItem('selectedModel', model);
    setSelectedModel(model);
    animateBorderColorGreen();
  };

  const borderColorInterpolate = borderColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#AAA', currentBorderColor],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
      </TouchableOpacity>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Scanner Settings</Text>
        {subscriptionStatus === 'free' && (
          <Text style={styles.upgradeText}>
            Upgrade to change options. Default is Fast.
          </Text>
        )}
        {subscriptionStatus === 'plus' && (
          <Text style={styles.upgradeText}>
            As a MacroScan+ subscriber, you can use Balanced and Fast. Upgrade to MacroScan++ for more features.
          </Text>
        )}
        {subscriptionStatus === 'plusplus' && (
          <Text style={styles.upgradeText}>
            As a MacroScan++ subscriber, you have full access to all options. Enjoy experimenting!
          </Text>
        )}
        <View style={styles.content}>
          {Object.entries(models).map(([key, value]) => (
            <Animated.View
              key={key}
              style={[
                styles.optionButton,
                selectedModel === key && styles.optionButtonSelected,
                { borderColor: selectedModel === key ? borderColorInterpolate : 'transparent' },
              ]}
            >
              <TouchableOpacity onPress={() => handleModelChange(key)}>
                <Text style={styles.optionText}>{value}</Text>
                <Text style={styles.descriptionText}>{descriptions[key]}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
        <Text style={styles.bottomDescriptionText}>
          These options won't affect your battery life.
        </Text>
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
    fontSize: 25,
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
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#DDD',
    padding: '2.5%',
    borderRadius: 17,
    marginBottom: '3%',
    borderWidth: 2,
  },
  optionButtonSelected: {
    borderColor: '#AAA',
  },
  optionText: {
    fontSize: 18,
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 14,
    color: colorScheme === 'dark' ? '#CCC' : '#333',
    textAlign: 'center',
    marginTop: 5,
  },
  upgradeText: {
    fontSize: 15,
    color: colorScheme === 'dark' ? '#AAA' : '#555',
    textAlign: 'center',
    marginVertical: '2%',
    paddingHorizontal: '2%',
  },
  bottomDescriptionText: {
    fontSize: 15,
    color: colorScheme === 'dark' ? '#AAA' : '#555',
    textAlign: 'center',
    paddingHorizontal: '2%',
    marginTop: '-18%',
  },
  backButton: {
    position: 'absolute',
    left: '5%',
    top: '9%',
    zIndex: 10,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#FFFFFF',
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
