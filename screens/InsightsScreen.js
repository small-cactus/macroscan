// InsightsScreen.js

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  Linking,
  Alert,
  FlatList,
  Animated,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import { BlurView } from 'expo-blur';
import * as Animatable from 'react-native-animatable';
import * as Haptics from 'expo-haptics';
import AnimatedCenteredText from './AnimatedCenteredText';

const { width, height } = Dimensions.get('window');

const DEBUG_SHOW_ONBOARDING = true; // Set to true to always show onboarding

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
      (dim) =>
        (width === dim.width && height === dim.height) ||
        (width === dim.height && height === dim.width)
    )
  );
};

const InsightsScreen = () => {
  const navigation = useNavigation();
  const [history, setHistory] = useState([]);
  const [goals, setGoals] = useState(null);
  const [trends, setTrends] = useState(null);
  const [recommendations, setRecommendations] = useState('');
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [repeatFoods, setRepeatFoods] = useState([]);
  const [selectedMacro, setSelectedMacro] = useState('calories');

  // Onboarding state variables
  const [showOnboarding, setShowOnboarding] = useState(false);
  const onboardingOpacityAnim = useRef(new Animated.Value(0)).current;
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const flatListRef = useRef(null);
  const [currentOnboardingIndex, setCurrentOnboardingIndex] = useState(0);
  const [onboardingDataCollected, setOnboardingDataCollected] = useState({
    unit: 'imperial',
    height: '',
    heightFeet: '',
    heightInches: '',
    weight: '',
    age: '',
    gender: '',
    activityLevel: '',
    goal: 'Maintain Weight',
  });
  const [calculatedGoals, setCalculatedGoals] = useState(null);
  const [goalsAdjustments, setGoalsAdjustments] = useState({
    calories: 0,
    proteins: 0,
    carbohydrates: 0,
    fats: 0,
  });

  const onboardingData = [
    {
      key: '1',
      title: 'Welcome to Insights',
      description: "Let's get to know you better to set up your personalized goals.",
      icon: 'stats-chart',
    },
    {
      key: '2',
      title: 'What is your height?',
      field: 'height',
      icon: 'man-outline',
      description: 'We use your height to calculate your BMR. We will never share this data with third parties.',
    },
    {
      key: '3',
      title: 'What is your weight?',
      field: 'weight',
      icon: 'barbell-outline',
      description: 'We use your weight to calculate your BMR. This data is never shared.',
    },
    {
      key: '4',
      title: 'What is your age?',
      field: 'age',
      icon: 'calendar-outline',
      description: 'We use your age to calculate your BMR. We only use this for calculating goals, it will not be used for anything else, nor will it be shared.',
    },
    {
      key: '5',
      title: 'What is your gender?',
      options: ['Male', 'Female', 'Other'],
      field: 'gender',
      icon: 'transgender-outline',
      description: 'We use your gender to calculate your BMR. This will not be shared, this is important to get correct goals.',
    },
    {
      key: '6',
      title: 'Select Your Activity Level',
      options: [
        {
          name: 'Sedentary',
          description: 'Little or no exercise',
        },
        {
          name: 'Lightly Active',
          description: 'Light exercise 1-3 days/week',
        },
        {
          name: 'Moderately Active',
          description: 'Moderate exercise 3-5 days/week',
        },
        {
          name: 'Very Active',
          description: 'Hard exercise 6-7 days/week',
        },
        {
          name: 'Extra Active',
          description: 'Very hard exercise or physical job',
        },
      ],
      field: 'activityLevel',
      icon: 'walk-outline',
      description: 'We use your activity level to calculate your daily calorie needs.',
    },
    {
      key: '7',
      title: 'Select Your Goal',
      options: ['Lose Weight', 'Maintain Weight', 'Gain Weight'],
      field: 'goal',
      icon: 'trending-up-outline',
      description: 'Choose your desired weight management goal.',
    },
    {
      key: '8',
      title: 'Here are your suggested goals',
      icon: 'trophy-outline',
    },
  ];

  useEffect(() => {
    loadHistory();
    loadGoals();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
      loadGoals();
    }, [])
  );

  const loadHistory = async () => {
    try {
      const storedHistoryString = await AsyncStorage.getItem('@product_history');
      if (storedHistoryString) {
        const storedHistory = JSON.parse(storedHistoryString);
        setHistory(storedHistory);
        calculateTrends(storedHistory);
        identifyRepeatFoods(storedHistory);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadGoals = async () => {
    try {
      const storedGoalsString = await AsyncStorage.getItem('@user_goals');
      if (DEBUG_SHOW_ONBOARDING || !storedGoalsString) {
        setShowOnboarding(true);
        Animated.timing(onboardingOpacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      } else {
        const storedGoals = JSON.parse(storedGoalsString);
        setGoals(storedGoals);
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  useEffect(() => {
    if (currentOnboardingIndex === 7) {
      // Only calculate goals if we have collected all necessary data
      if (
        (onboardingDataCollected.unit === 'imperial' &&
          onboardingDataCollected.heightFeet &&
          onboardingDataCollected.heightInches &&
          onboardingDataCollected.weight &&
          onboardingDataCollected.age &&
          onboardingDataCollected.gender &&
          onboardingDataCollected.activityLevel &&
          onboardingDataCollected.goal) ||
        (onboardingDataCollected.unit === 'metric' &&
          onboardingDataCollected.height &&
          onboardingDataCollected.weight &&
          onboardingDataCollected.age &&
          onboardingDataCollected.gender &&
          onboardingDataCollected.activityLevel &&
          onboardingDataCollected.goal)
      ) {
        const goals = calculateGoals(onboardingDataCollected);
        setCalculatedGoals(goals);
      } else {
        // Handle incomplete data
        console.warn('Incomplete data for goal calculation');
      }
    }
  }, [currentOnboardingIndex]);

  const calculateTrends = (historyData) => {
    const today = new Date();
    const dailyData = {
      calories: [],
      proteins: [],
      carbohydrates: [],
      fats: [],
    };

    for (let i = 6; i >= 0; i--) {
      // Create a date object in UTC for the day we're examining
      const date = new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - i
      ));
      const dateYear = date.getUTCFullYear();
      const dateMonth = date.getUTCMonth();
      const dateDay = date.getUTCDate();

      // Filter historyData to find items that match the date
      const dailyItems = historyData.filter((item) => {
        const itemDate = new Date(item.date);
        return (
          itemDate.getUTCFullYear() === dateYear &&
          itemDate.getUTCMonth() === dateMonth &&
          itemDate.getUTCDate() === dateDay
        );
      });

      // Sum up the nutrients for the day
      const dailyCalories = dailyItems.reduce(
        (total, item) => total + (item.nutrients?.calories?.amount || 0),
        0
      );
      const dailyProteins = dailyItems.reduce(
        (total, item) => total + (item.nutrients?.proteins?.amount || 0),
        0
      );
      const dailyCarbohydrates = dailyItems.reduce(
        (total, item) => total + (item.nutrients?.carbohydrates?.amount || 0),
        0
      );
      const dailyFats = dailyItems.reduce(
        (total, item) => total + (item.nutrients?.fats?.amount || 0),
        0
      );

      // Push the sums into the dailyData arrays
      dailyData.calories.push(dailyCalories);
      dailyData.proteins.push(dailyProteins);
      dailyData.carbohydrates.push(dailyCarbohydrates);
      dailyData.fats.push(dailyFats);
    }

    // Update the state with the calculated trends
    setTrends(dailyData);
  };

  const identifyRepeatFoods = (historyData) => {
    const foodCount = {};
    historyData.forEach((item) => {
      const name = item.productName;
      if (foodCount[name]) {
        foodCount[name]++;
      } else {
        foodCount[name] = 1;
      }
    });
    const repeats = Object.keys(foodCount)
      .map((name) => ({ name, count: foodCount[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Get top 5 items
    setRepeatFoods(repeats);
  };

  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const apiKey = await AsyncStorage.getItem('@apikey');
      if (!apiKey) {
        Alert.alert('API Key Missing', 'Please set your API key in the settings.');
        setLoadingRecommendations(false);
        return;
      }

      // Import and initialize Anthropic client
      const Anthropic = require('@anthropic-ai/sdk');
      const anthropic = new Anthropic({
        apiKey: apiKey,
      });

      // Prepare the data for the API call
      const recentHistory = history.slice(-7); // Last 7 entries
      const prompt = `Based on the following food intake, provide personalized nutrition advice in 1 small sentence, do not include further elaboration:\n\n${recentHistory
        .map(
          (item) =>
            `${item.productName} - Calories: ${item.nutrients?.calories?.amount || 0} kcal, Proteins: ${item.nutrients?.proteins?.amount || 0} g, Carbs: ${item.nutrients?.carbohydrates?.amount || 0} g, Fats: ${item.nutrients?.fats?.amount || 0} g`
        )
        .join('\n')}`;

      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      if (message.content[0].text) {
        setRecommendations(message.content[0].text.trim());
      } else {
        setRecommendations('No recommendations available at this time.');
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setRecommendations('Error fetching recommendations.');
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Function to convert hex color to rgba
  const hexToRgba = (hex, opacity) => {
    const bigint = parseInt(hex.replace('#', ''), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // Onboarding functions
  const calculateGoals = (data) => {
    // Convert units if needed
    let weightKg;
    let heightCm;
    if (data.unit === 'imperial') {
      weightKg = parseFloat(data.weight) * 0.453592;
      if (data.heightFeet && data.heightInches) {
        heightCm =
          (parseFloat(data.heightFeet) * 12 + parseFloat(data.heightInches)) *
          2.54;
      } else {
        heightCm = 0;
      }
    } else {
      weightKg = parseFloat(data.weight);
      heightCm = parseFloat(data.height);
    }
    const age = parseInt(data.age);
    const gender = data.gender;
    // Calculate BMR using Mifflin-St Jeor Equation
    let BMR;
    if (gender === 'Male') {
      BMR = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else {
      BMR = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }
    // Activity factor
    let activityFactor = 1.2;
    switch (data.activityLevel) {
      case 'Sedentary':
        activityFactor = 1.2;
        break;
      case 'Lightly Active':
        activityFactor = 1.375;
        break;
      case 'Moderately Active':
        activityFactor = 1.55;
        break;
      case 'Very Active':
        activityFactor = 1.725;
        break;
      case 'Extra Active':
        activityFactor = 1.9;
        break;
    }
    // Total Daily Energy Expenditure
    let TDEE = BMR * activityFactor;

    // Adjust TDEE based on goal
    if (data.goal === 'Lose Weight') {
      TDEE -= 500; // Subtract 500 calories for weight loss
    } else if (data.goal === 'Gain Weight') {
      TDEE += 500; // Add 500 calories for weight gain
    }

    // Ensure TDEE is not negative
    TDEE = Math.max(TDEE, 1200); // Minimum calories

    // Calculate macros based on percentages
    const calories = Math.round(TDEE);
    const proteins = Math.round(weightKg * 2); // 2g per kg of body weight
    const fats = Math.round((calories * 0.25) / 9); // 25% of calories from fat
    const carbohydrates = Math.round(
      (calories - proteins * 4 - fats * 9) / 4
    );
    return {
      calories,
      proteins,
      carbohydrates,
      fats,
    };
  };

  const adjustGoal = (macro, percentage) => {
    setGoalsAdjustments((prevAdjustments) => ({
      ...prevAdjustments,
      [macro]: prevAdjustments[macro] + percentage,
    }));
  };

  const handleSaveGoalsFromOnboarding = async () => {
    try {
      const finalGoals = {};
      ['calories', 'proteins', 'carbohydrates', 'fats'].forEach((macro) => {
        finalGoals[macro] = Math.round(
          calculatedGoals[macro] * (1 + goalsAdjustments[macro] / 100)
        );
      });
      await AsyncStorage.setItem('@user_goals', JSON.stringify(finalGoals));
      setGoals(finalGoals);
      setShowOnboarding(false);
      setCalculatedGoals(null);
      setOnboardingIndex(0);
      setCurrentOnboardingIndex(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving goals:', error);
    }
  };

  const renderOnboardingItem = ({ item, index }) => {
    return (
      <View style={styles.onboardingPage}>
        <View style={styles.onboardingInnerContent}>
          <View style={styles.onboardingIconContainer}>
            <BlurView intensity={30} style={styles.onboardingIcon}>
              <Ionicons name={item.icon} size={80} color="#fff" />
            </BlurView>
          </View>
          <Text style={styles.onboardingTitle}>{item.title}</Text>

          {/* Input Fields or Options */}
          {item.field === 'height' ? (
            <>
              <View style={styles.unitToggleContainer}>
                <TouchableOpacity
                  onPress={() =>
                    setOnboardingDataCollected({
                      ...onboardingDataCollected,
                      unit: 'imperial',
                      height: '',
                    })
                  }
                  style={
                    onboardingDataCollected.unit === 'imperial'
                      ? styles.unitToggleSelected
                      : styles.unitToggle
                  }
                >
                  <Text
                    style={
                      onboardingDataCollected.unit === 'imperial'
                        ? styles.unitToggleTextSelected
                        : styles.unitToggleText
                    }
                  >
                    Imperial (ft/in)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setOnboardingDataCollected({
                      ...onboardingDataCollected,
                      unit: 'metric',
                      heightFeet: '',
                      heightInches: '',
                    })
                  }
                  style={
                    onboardingDataCollected.unit === 'metric'
                      ? styles.unitToggleSelected
                      : styles.unitToggle
                  }
                >
                  <Text
                    style={
                      onboardingDataCollected.unit === 'metric'
                        ? styles.unitToggleTextSelected
                        : styles.unitToggleText
                    }
                  >
                    Metric (cm)
                  </Text>
                </TouchableOpacity>
              </View>
              {onboardingDataCollected.unit === 'imperial' ? (
                <View style={styles.inputRow}>
                  <TextInput
                    placeholder="Feet"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    style={styles.inputSmall}
                    value={onboardingDataCollected.heightFeet}
                    onChangeText={(value) =>
                      setOnboardingDataCollected({
                        ...onboardingDataCollected,
                        heightFeet: value,
                      })
                    }
                  />
                  <TextInput
                    placeholder="Inches"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    style={styles.inputSmall}
                    value={onboardingDataCollected.heightInches}
                    onChangeText={(value) =>
                      setOnboardingDataCollected({
                        ...onboardingDataCollected,
                        heightInches: value,
                      })
                    }
                  />
                </View>
              ) : (
                <TextInput
                  placeholder="Centimeters"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  style={styles.input}
                  value={onboardingDataCollected.height}
                  onChangeText={(value) =>
                    setOnboardingDataCollected({
                      ...onboardingDataCollected,
                      height: value,
                    })
                  }
                />
              )}
            </>
          ) : item.field === 'weight' ? (
            <>
              <View style={styles.unitToggleContainer}>
                <TouchableOpacity
                  onPress={() =>
                    setOnboardingDataCollected({
                      ...onboardingDataCollected,
                      unit: 'imperial',
                    })
                  }
                  style={
                    onboardingDataCollected.unit === 'imperial'
                      ? styles.unitToggleSelected
                      : styles.unitToggle
                  }
                >
                  <Text
                    style={
                      onboardingDataCollected.unit === 'imperial'
                        ? styles.unitToggleTextSelected
                        : styles.unitToggleText
                    }
                  >
                    Imperial (lbs)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setOnboardingDataCollected({
                      ...onboardingDataCollected,
                      unit: 'metric',
                    })
                  }
                  style={
                    onboardingDataCollected.unit === 'metric'
                      ? styles.unitToggleSelected
                      : styles.unitToggle
                  }
                >
                  <Text
                    style={
                      onboardingDataCollected.unit === 'metric'
                        ? styles.unitToggleTextSelected
                        : styles.unitToggleText
                    }
                  >
                    Metric (kg)
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                placeholder={
                  onboardingDataCollected.unit === 'imperial' ? 'Pounds' : 'Kilograms'
                }
                placeholderTextColor="#999"
                keyboardType="numeric"
                style={styles.input}
                value={onboardingDataCollected.weight}
                onChangeText={(value) =>
                  setOnboardingDataCollected({
                    ...onboardingDataCollected,
                    weight: value,
                  })
                }
              />
            </>
          ) : item.field === 'age' ? (
            <TextInput
              placeholder="Age"
              placeholderTextColor="#999"
              keyboardType="numeric"
              style={styles.input}
              value={onboardingDataCollected.age}
              onChangeText={(value) =>
                setOnboardingDataCollected({
                  ...onboardingDataCollected,
                  age: value,
                })
              }
            />
          ) : item.field === 'gender' ? (
            <View style={styles.optionsContainer}>
              {item.options.map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() =>
                    setOnboardingDataCollected({
                      ...onboardingDataCollected,
                      gender: option,
                    })
                  }
                  style={
                    onboardingDataCollected.gender === option
                      ? styles.optionSelected
                      : styles.option
                  }
                >
                  <Text
                    style={
                      onboardingDataCollected.gender === option
                        ? styles.optionTextSelected
                        : styles.optionText
                    }
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : item.field === 'activityLevel' ? (
            <ScrollView
              style={styles.optionsContainerScroll}
              contentContainerStyle={styles.optionsContainer}
            >
              {item.options.map((option) => (
                <TouchableOpacity
                  key={option.name}
                  onPress={() =>
                    setOnboardingDataCollected({
                      ...onboardingDataCollected,
                      activityLevel: option.name,
                    })
                  }
                  style={
                    onboardingDataCollected.activityLevel === option.name
                      ? styles.optionSelectedLarge
                      : styles.optionLarge
                  }
                >
                  <Text
                    style={
                      onboardingDataCollected.activityLevel === option.name
                        ? styles.optionTextSelected
                        : styles.optionText
                    }
                  >
                    {option.name}
                  </Text>
                  <Text style={styles.optionDescription}>
                    {option.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : item.field === 'goal' ? (
            <View style={styles.optionsContainer}>
              {item.options.map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() =>
                    setOnboardingDataCollected({
                      ...onboardingDataCollected,
                      goal: option,
                    })
                  }
                  style={
                    onboardingDataCollected.goal === option
                      ? styles.optionSelected
                      : styles.option
                  }
                >
                  <Text
                    style={
                      onboardingDataCollected.goal === option
                        ? styles.optionTextSelected
                        : styles.optionText
                    }
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : index === 7 && calculatedGoals ? (
            <View style={styles.goalsContainer}>
              <View style={styles.goalCard}>
                <Text style={styles.goalValue}>{calculatedGoals.calories} kcal</Text>
                <Text style={styles.goalLabel}>Calories</Text>
              </View>
              <View style={styles.goalCard}>
                <Text style={styles.goalValue}>{calculatedGoals.proteins} g</Text>
                <Text style={styles.goalLabel}>Proteins</Text>
              </View>
              <View style={styles.goalCard}>
                <Text style={styles.goalValue}>{calculatedGoals.carbohydrates} g</Text>
                <Text style={styles.goalLabel}>Carbs</Text>
              </View>
              <View style={styles.goalCard}>
                <Text style={styles.goalValue}>{calculatedGoals.fats} g</Text>
                <Text style={styles.goalLabel}>Fats</Text>
              </View>
              <TouchableOpacity
                style={styles.saveGoalsButton}
                onPress={handleSaveGoalsFromOnboarding}
              >
                <Text style={styles.saveGoalsButtonText}>Finish</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
        {item.description && (
          <AnimatedCenteredText
            text={item.description}
            colorScheme={'dark'}
            visible={currentOnboardingIndex === index}
          />
        )}
      </View>
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      if (index !== null && index !== undefined) {
        setCurrentOnboardingIndex(index);
      }
    }
  }).current;

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  // Chart colors for macros and background gradients
  const macroColors = {
    calories: '#4CFF50', // Green for calories
    proteins: '#21FFFF', // Blue
    carbohydrates: '#FFcc00', // Orange
    fats: '#ff88B0', // Purple
  };

  const chartGradientColors = {
    calories: ['#003f00', '#001100'], // Green shades
    proteins: ['#0d47a1', '#000022'], // Blue shades
    carbohydrates: ['#b55100', '#110000'], // Orange shades
    fats: ['#4a148c', '#110011'], // Purple shades
  };

  const styles = getDynamicStyles();
  return (
    <SafeAreaView style={styles.safeArea}>
      {showOnboarding && (
        <Animated.View
          style={[styles.onboardingOverlay, { opacity: onboardingOpacityAnim }]}
        >
          <BlurView intensity={50} style={StyleSheet.absoluteFill} />
          <View style={styles.onboardingContainer}>
            <View style={styles.onboardingContent}>
              <FlatList
                data={onboardingData}
                renderItem={renderOnboardingItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.key}
                scrollEnabled={true} // Enable swiping
                extraData={onboardingIndex}
                ref={flatListRef}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
              />
            </View>
            <View style={styles.onboardingFooter}>
              <View style={styles.pagination}>
                {onboardingData.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      currentOnboardingIndex === index
                        ? styles.paginationDotActive
                        : styles.paginationDotInactive,
                    ]}
                  />
                ))}
              </View>
              {currentOnboardingIndex < onboardingData.length - 1 ? (
                <TouchableOpacity
                  style={styles.onboardingNextButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (currentOnboardingIndex < onboardingData.length - 1) {
                      const nextIndex = currentOnboardingIndex + 1;
                      setOnboardingIndex(nextIndex);
                      flatListRef.current.scrollToIndex({ index: nextIndex });
                    }
                  }}
                >
                  <Text style={styles.onboardingButtonText}>Next</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </Animated.View>
      )}
      <View style={styles.header}>
        {/* Removed the back button */}
        <Text style={styles.title}>Insights</Text>
      </View>
      <ScrollView style={styles.container}>
        {!goals && !showOnboarding && (
          <View style={styles.noGoalsContainer}>
            <Text style={styles.noGoalsText}>
              Please set your goals to start tracking your insights.
            </Text>
            <TouchableOpacity
              style={styles.setGoalsButton}
              onPress={() => {
                setShowOnboarding(true);
                Animated.timing(onboardingOpacityAnim, {
                  toValue: 1,
                  duration: 500,
                  useNativeDriver: true,
                }).start();
              }}
            >
              <Text style={styles.setGoalsButtonText}>Set Goals</Text>
            </TouchableOpacity>
          </View>
        )}
        {goals && (
          <>
            <View style={styles.trendContainer}>
              <Text style={styles.sectionTitle}>
                {selectedMacro.charAt(0).toUpperCase() +
                  selectedMacro.slice(1)}{' '}
                Intake (Last 7 Days)
              </Text>
              {trends && (
                <LineChart
                  data={{
                    labels: ['6d', '5d', '4d', '3d', '2d', '1d', 'Today'],
                    datasets: [
                      {
                        data: trends[selectedMacro],
                        color: (opacity = 1) =>
                          hexToRgba(macroColors[selectedMacro], opacity),
                      },
                    ],
                  }}
                  width={Dimensions.get('window').width - 40}
                  height={220}
                  chartConfig={{
                    backgroundGradientFrom:
                      chartGradientColors[selectedMacro][0],
                    backgroundGradientTo: chartGradientColors[selectedMacro][1],
                    decimalPlaces: 0,
                    color: (opacity = 1) => hexToRgba(macroColors[selectedMacro], opacity),
                    labelColor: (opacity = 1) => hexToRgba(macroColors[selectedMacro], opacity),
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '5',
                      strokeWidth: '2',
                      stroke: macroColors[selectedMacro],
                    },
                  }}
                  bezier
                  style={styles.chartStyle}
                />
              )}
            </View>
            <View style={styles.chartSelectorContainer}>
                {['calories', 'proteins', 'carbohydrates', 'fats'].map((macro) => (
                  <TouchableOpacity
                    key={macro}
                    onPress={() => setSelectedMacro(macro)}
                    style={
                      selectedMacro === macro
                        ? styles.selectedMacroButton
                        : styles.macroButton
                    }
                  >
                    <Text
                      style={
                        selectedMacro === macro
                          ? styles.macroButtonTextSelected
                          : styles.macroButtonText
                      }
                    >
                      {macro.charAt(0).toUpperCase() + macro.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            <View style={styles.adviceContainer}>
              <Text style={styles.sectionTitle}>Personalized Advice</Text>
              {loadingRecommendations ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <Text style={styles.adviceText}>{recommendations}</Text>
              )}
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={fetchRecommendations}
              >
                <Ionicons name="refresh" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            {repeatFoods.length > 0 && (
              <View style={styles.repeatFoodsContainer}>
                <Text style={styles.sectionTitle}>Frequently Consumed Foods</Text>
                {repeatFoods.map((food, index) => (
                  <Animatable.View
                    key={index}
                    animation="fadeInUp"
                    delay={index * 100}
                    style={styles.foodItem}
                  >
                    <Text style={styles.foodName}>{food.name}</Text>
                    <Text style={styles.foodCount}>
                      Consumed {food.count} times
                    </Text>
                    <Ionicons
                      name="thumbs-up"
                      size={24}
                      color="#4CAF50"
                      style={styles.foodIcon}
                    />
                  </Animatable.View>
                ))}
              </View>
            )}
          </>
        )}
        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>
            Your data is stored locally and is not shared. Learn more about how
            BMI is calculated{' '}
            <Text
              style={styles.linkText}
              onPress={() =>
                Linking.openURL('https://en.wikipedia.org/wiki/Body_mass_index')
              }
            >
              here
            </Text>
            .
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getDynamicStyles = () =>
  StyleSheet.create({
    // Onboarding styles
    onboardingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
      zIndex: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    onboardingContainer: {
      width: '100%',
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    onboardingContent: {
      height: '65%',
    },
    onboardingPage: {
      width: width,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    onboardingInnerContent: {
      alignItems: 'center',
      width: '100%',
    },
    onboardingIconContainer: {
      marginBottom: 20,
    },
    onboardingIcon: {
      borderRadius: 40,
      padding: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#555',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    onboardingTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
      textAlign: 'center',
      marginBottom: 10,
    },
    unitToggleContainer: {
      flexDirection: 'row',
      marginBottom: 20,
      justifyContent: 'center',
      width: '100%',
    },
    unitToggle: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
      backgroundColor: '#2a2a2d',
      marginHorizontal: 5,
    },
    unitToggleSelected: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
      backgroundColor: '#fff',
      marginHorizontal: 5,
    },
    unitToggleText: {
      color: '#fff',
    },
    unitToggleTextSelected: {
      color: '#000',
    },
    input: {
      backgroundColor: '#2a2a2d',
      color: '#FFF',
      padding: 15,
      borderRadius: 20,
      width: '80%',
      marginBottom: 10,
      textAlign: 'center',
      fontSize: 18,
    },
    inputRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '80%',
      borderRadius: 20,
    },
    inputSmall: {
      backgroundColor: '#2a2a2d',
      color: '#FFF',
      padding: 15,
      borderRadius: 15,
      width: '48%',
      marginBottom: 10,
      textAlign: 'center',
      fontSize: 18,
    },
    optionsContainer: {
      width: '100%',
      alignItems: 'center',
      marginTop: 10,
    },
    optionsContainerScroll: {
      width: '100%',
      maxHeight: '50%',
      alignSelf: 'center',
    },
    option: {
      backgroundColor: '#2a2a2d',
      padding: 15,
      borderRadius: 15,
      marginBottom: 10,
      width: '80%',
      alignItems: 'center',
    },
    optionSelected: {
      backgroundColor: '#fff',
      padding: 15,
      borderRadius: 15,
      marginBottom: 10,
      width: '80%',
      alignItems: 'center',
    },
    optionLarge: {
      backgroundColor: '#2a2a2d',
      padding: 15,
      borderRadius: 15,
      marginBottom: 10,
      width: '90%',
    },
    optionSelectedLarge: {
      backgroundColor: '#fff',
      padding: 15,
      borderRadius: 15,
      marginBottom: 10,
      width: '90%',
    },
    optionText: {
      color: '#fff',
      fontSize: 16,
      textAlign: 'center',
    },
    optionTextSelected: {
      color: '#000',
      fontSize: 16,
      textAlign: 'center',
    },
    optionDescription: {
      color: '#aaa',
      fontSize: 14,
      textAlign: 'center',
      marginTop: 5,
    },
    goalsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: 20,
    },
    goalCard: {
      backgroundColor: '#2a2a2d',
      padding: 20,
      borderRadius: 15,
      margin: 10,
      width: '40%',
      alignItems: 'center',
    },
    goalValue: {
      color: '#fff',
      fontSize: 22,
      fontWeight: 'bold',
    },
    goalLabel: {
      color: '#aaa',
      fontSize: 16,
      marginTop: 5,
    },
    adjustGoalContainer: {
      marginBottom: 20,
      alignItems: 'center',
    },
    goalText: {
      color: '#fff',
      fontSize: 18,
      marginBottom: 5,
    },
    adjustedGoalValue: {
      color: '#fff',
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    adjustButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    adjustButton: {
      backgroundColor: '#2a2a2d',
      padding: 10,
      borderRadius: 10,
      marginHorizontal: 10,
      width: 80,
      alignItems: 'center',
    },
    adjustButtonText: {
      color: '#fff',
      fontSize: 16,
    },
    saveGoalsButton: {
      backgroundColor: '#fff',
      padding: 15,
      borderRadius: 15,
      marginTop: 20,
      width: '80%',
      alignItems: 'center',
      alignSelf: 'center',
    },
    saveGoalsButtonText: {
      color: '#000',
      fontSize: 16,
    },
    onboardingFooter: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 20,
    },
    onboardingNextButton: {
      backgroundColor: '#fff',
      paddingVertical: 12,
      paddingHorizontal: 40,
      borderRadius: 25,
      marginTop: 10,
    },
    onboardingButtonText: {
      color: '#000',
      fontSize: 18,
      fontWeight: 'bold',
    },
    pagination: {
      flexDirection: 'row',
      marginTop: 10,
    },
    paginationDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginHorizontal: 5,
    },
    paginationDotActive: {
      backgroundColor: '#fff',
    },
    paginationDotInactive: {
      backgroundColor: '#777',
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    // Existing styles...
    safeArea: {
      flex: 1,
      backgroundColor: '#000',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center', // Center align the title
      paddingTop: isIphoneSE() ? 12 : 16,
      paddingBottom: 8,
      paddingHorizontal: '5%',
      backgroundColor: '#000',
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#FFF',
      textAlign: 'center',
    },
    container: {
      flex: 1,
      padding: 20,
    },
    noGoalsContainer: {
      alignItems: 'center',
      marginTop: 50,
    },
    noGoalsText: {
      fontSize: 18,
      color: '#FFF',
      textAlign: 'center',
      marginBottom: 20,
    },
    setGoalsButton: {
      backgroundColor: '#1C1C1E',
      padding: 15,
      borderRadius: 15,
    },
    setGoalsButtonText: {
      color: '#FFF',
      fontSize: 16,
    },
    trendContainer: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 18,
      color: '#fff',
      marginBottom: 10,
      fontWeight: '400',
      textAlign: 'center',
    },
    chartSelectorContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 10,
    },
    macroButton: {
      backgroundColor: 'transparent',
      paddingVertical: 8,
      paddingHorizontal: 15,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#2a2a2d',
      marginHorizontal: 5,
    },
    selectedMacroButton: {
      backgroundColor: '#2a2a2d',
      paddingVertical: 8,
      paddingHorizontal: 15,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#fff',
      marginHorizontal: 5,
    },
    macroButtonText: {
      color: '#fff',
      fontSize: 16,
    },
    macroButtonTextSelected: {
      color: '#fff',
      fontSize: 16,
    },
    chartStyle: {
      borderRadius: 16,
    },
    adviceContainer: {
      marginBottom: 30,
      position: 'relative',
    },
    adviceText: {
      fontSize: 18,
      color: '#FFF',
      marginBottom: 10,
    },
    refreshButton: {
      position: 'absolute',
      top: 0,
      right: 0,
      backgroundColor: '#1C1C1E',
      padding: 10,
      borderRadius: 15,
    },
    repeatFoodsContainer: {
      marginBottom: 30,
    },
    foodItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#1C1C1E',
      padding: 15,
      borderRadius: 15,
      marginBottom: 10,
    },
    foodName: {
      color: '#FFF',
      fontSize: 16,
      flex: 1,
    },
    foodCount: {
      color: '#AAA',
      fontSize: 14,
    },
    foodIcon: {
      marginLeft: 10,
    },
    disclaimerContainer: {
      marginTop: 20,
    },
    disclaimerText: {
      color: '#AAA',
      fontSize: 14,
      textAlign: 'center',
    },
    linkText: {
      color: '#007AFF',
      textDecorationLine: 'underline',
    },
  });

export default InsightsScreen;