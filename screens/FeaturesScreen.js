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
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useUser } from '../userContext';

const { width, height } = Dimensions.get('window');

const isIphoneSE = () => {
  const smallIphoneDimensions = [
    { width: 320, height: 568 }, // iPhone SE (1st generation), iPhone 5, 5S, 5C
    { width: 375, height: 667 }, // iPhone 6, 6S, 7, 8, SE (2nd generation)
    { width: 414, height: 736 }, // iPhone 8 Plus
    { width: 360, height: 640 }, // iPhone SE (2020)
    { width: 375, height: 812 }, // iPhone 12 Mini, iPhone 13 Mini
    { width: 360, height: 780 }, // iPhone 12 Mini, iPhone 13 Mini
  ];

  return (
    Platform.OS === 'ios' &&
    smallIphoneDimensions.some(
      (dim) => (width === dim.width && height === dim.height) || (width === dim.height && height === dim.width)
    )
  );
};

const FeaturesScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);
  const { user } = useUser();

  const renderSeparator = () => <View style={styles.separator} />;

  const models = {
    'claude-3-5-sonnet-20240620': 'Complex Processing',
    'claude-3-sonnet-20240229': 'Standard Processing',
    'claude-3-haiku-20240307': 'Fast Processing',
  };

  const descriptions = {
    'claude-3-5-sonnet-20240620': 'Highest accuracy, slower processing',
    'claude-3-sonnet-20240229': 'Balanced accuracy and speed',
    'claude-3-haiku-20240307': 'Fastest speed, average accuracy',
  };

  const [selectedModel, setSelectedModel] = useState('claude-3-haiku-20240307');
  const [selectedMode, setSelectedMode] = useState('fast'); // Default to Fast Mode
  const [subscriptionStatus, setSubscriptionStatus] = useState('free');

  // Separate Animated.Values for Models and Modes
  const [modelBorderColor] = useState(new Animated.Value(0));
  const [modeBorderColor] = useState(new Animated.Value(0));

  // Separate Current Border Colors for Models and Modes
  const [currentModelBorderColor, setCurrentModelBorderColor] = useState('#AAA');
  const [currentModeBorderColor, setCurrentModeBorderColor] = useState('#AAA');

  useEffect(() => {
    checkSubscription();
    loadSettings();
  }, []);

  const checkSubscription = async () => {
    const status = user ? user.subscriptionStatus : 'free';
    setSubscriptionStatus(status);
  };

  const loadSettings = async () => {
    try {
      const model = await AsyncStorage.getItem('selectedModel');
      const mode = await AsyncStorage.getItem('selectedMode'); // Changed key to 'selectedMode' for clarity
      if (model) setSelectedModel(model);
      if (mode) setSelectedMode(mode);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Animation Functions for Models
  const animateModelBorderColorGreen = () => {
    setCurrentModelBorderColor('green');
    Animated.sequence([
      Animated.timing(modelBorderColor, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(modelBorderColor, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start(() => setCurrentModelBorderColor('#AAA'));
  };

  const animateModelBorderColorRed = () => {
    setCurrentModelBorderColor('red');
    Animated.sequence([
      Animated.timing(modelBorderColor, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(modelBorderColor, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => setCurrentModelBorderColor('#AAA'));
  };

  // Animation Functions for Modes
  const animateModeBorderColorGreen = () => {
    setCurrentModeBorderColor('green');
    Animated.sequence([
      Animated.timing(modeBorderColor, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(modeBorderColor, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start(() => setCurrentModeBorderColor('#AAA'));
  };

  const animateModeBorderColorRed = () => {
    setCurrentModeBorderColor('red');
    Animated.sequence([
      Animated.timing(modeBorderColor, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(modeBorderColor, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => setCurrentModeBorderColor('#AAA'));
  };

  // Interpolate Border Colors Separately
  const modelBorderColorInterpolate = modelBorderColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#AAA', currentModelBorderColor],
  });

  const modeBorderColorInterpolate = modeBorderColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#AAA', currentModeBorderColor],
  });

  const handleModelChange = async (model) => {
    if (selectedModel === model) {
      await Haptics.selectionAsync();
      return;
    }

    const showAlert = (message) => {
      setTimeout(() => {
        Alert.alert('Upgrade Required', message);
      }, 500);
    };

    if (subscriptionStatus === 'free' && model !== 'claude-3-haiku-20240307') {
      animateModelBorderColorRed();
      showAlert('You need to be a subscribed user to change this setting.');
      return;
    }

    if (subscriptionStatus === 'plus' && model === 'claude-3-opus-20240229') {
      animateModelBorderColorRed();
      showAlert('You need to be a MacroScan++ subscriber to use this setting.');
      return;
    }

    try {
      await AsyncStorage.setItem('selectedModel', model);
      setSelectedModel(model);
      animateModelBorderColorGreen();
    } catch (error) {
      console.error('Error saving selectedModel:', error);
    }
  };

  const handleModeChange = async (mode) => {
    try {
      await AsyncStorage.setItem('selectedMode', mode); // Changed key to 'selectedMode' for consistency
      setSelectedMode(mode);
      animateModeBorderColorGreen();
    } catch (error) {
      console.error('Error saving selectedMode:', error);
    }
  };

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
          {/* Processing Models Section */}
          <Text style={styles.sectionTitle}>Processing Models</Text>
          {Object.entries(models).map(([key, value]) => (
            <Animated.View
              key={key}
              style={[
                styles.optionButton,
                selectedModel === key && styles.optionButtonSelected,
                {
                  borderColor:
                    selectedModel === key ? modelBorderColorInterpolate : 'transparent',
                },
              ]}
            >
              <TouchableOpacity onPress={() => handleModelChange(key)}>
                <Text style={styles.optionText}>{value}</Text>
                <Text style={styles.descriptionText}>{descriptions[key]}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}

          {/* Separator */}
          {renderSeparator()}

          {/* Preferred Mode Section */}
          <Text style={styles.title}>Preferred Mode</Text>
          <Text style={styles.upgradeText}>
            Choose how scans are prioritized for speed and accuracy.
          </Text>
          <View style={styles.content}>
            {/* Always Fast Mode */}
            <Animated.View
              style={[
                styles.optionButton,
                selectedMode === 'fast' && styles.optionButtonSelected,
                {
                  borderColor:
                    selectedMode === 'fast' ? modeBorderColorInterpolate : 'transparent',
                },
              ]}
            >
              <TouchableOpacity onPress={() => handleModeChange('fast')}>
                <Text style={styles.optionText}>Always Fast</Text>
                <Text style={styles.descriptionText}>
                  ~5 second scan time, high accuracy on well-known foods
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Always Accurate Mode */}
            <Animated.View
              style={[
                styles.optionButton,
                selectedMode === 'accurate' && styles.optionButtonSelected,
                {
                  borderColor:
                    selectedMode === 'accurate' ? modeBorderColorInterpolate : 'transparent',
                },
              ]}
            >
              <TouchableOpacity onPress={() => handleModeChange('accurate')}>
                <Text style={styles.optionText}>Always Accurate</Text>
                <Text style={styles.descriptionText}>
                  ~20 second scan time, much higher accuracy on homemade food
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Dynamic Mode */}
            <Animated.View
              style={[
                styles.optionButton,
                selectedMode === 'dynamic' && styles.optionButtonSelected,
                {
                  borderColor:
                    selectedMode === 'dynamic' ? modeBorderColorInterpolate : 'transparent',
                },
              ]}
            >
              <TouchableOpacity onPress={() => handleModeChange('dynamic')}>
                <Text style={styles.optionText}>Dynamic</Text>
                <Text style={styles.descriptionText}>
                  Switches automatically between fast and accurate mode based off each individual scan before it processes.
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
          <Text style={styles.bottomDescriptionText}>
            Accuracy is unlikely to change with either mode, but accurate mode is much less likely to make up ingredients or macros in foods that do not have those ingredients visible in the image.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getDynamicStyles = (colorScheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
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
    sectionTitle: { // Added sectionTitle for Processing Models
      fontSize: 20,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      textAlign: 'center',
      marginTop: '5%',
      marginBottom: '2%',
    },
    content: {
      marginTop: '2%',
      marginBottom: '20%',
    },
    optionButton: {
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#DDD',
      padding: '2.5%',
      borderRadius: 17,
      marginBottom: '3%',
      borderWidth: 2,
    },
    optionButtonSelected: {
      // Removed static borderColor to use animated borderColor
    },
    optionText: {
      fontSize: 18,
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      textAlign: 'center',
    },
    descriptionText: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#bbb' : '#333',
      textAlign: 'center',
      marginTop: 5,
    },
    modeTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      textAlign: 'center',
      marginTop: '5%',
    },
    modeToggle: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    modeButton: {
      flex: 1,
      padding: '2.5%',
      borderRadius: 10,
      marginHorizontal: 5,
      backgroundColor: colorScheme === 'dark' ? '#333' : '#EEE',
      borderWidth: 2,
    },
    modeButtonSelected: {
      borderColor: '#AAA',
    },
    modeText: {
      fontSize: 16,
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      textAlign: 'center',
    },
    modeDescription: {
      fontSize: 12,
      color: colorScheme === 'dark' ? '#bbb' : '#333',
      textAlign: 'center',
      marginTop: 5,
    },
    upgradeText: {
      fontSize: 15,
      color: colorScheme === 'dark' ? '#888' : '#555',
      textAlign: 'center',
      marginVertical: '2%',
      paddingHorizontal: '2%',
    },
    bottomDescriptionText: {
      fontSize: 15,
      color: colorScheme === 'dark' ? '#888' : '#555',
      textAlign: 'center',
      paddingHorizontal: '2%',
      marginTop: '-18%',
      marginBottom: '10%',
    },
    backButton: {
      position: 'absolute',
      left: '5%',
      top: isIphoneSE() ? '5%' : '9%',
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
    separator: {
      height: 5,
      backgroundColor: '#333333',
      marginVertical: 16,
      marginBottom: 16,
      borderRadius: 900,
    },
  });

export default FeaturesScreen;