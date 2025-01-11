// InsightsV2.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Platform,
  Linking,
  FlatList,
  Animated,
  useColorScheme,
  Easing,
  TouchableWithoutFeedback,
  LayoutAnimation,
  UIManager,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as Animatable from 'react-native-animatable';
import * as Haptics from 'expo-haptics';
import AnimatedCenteredText from './AnimatedCenteredText';
import AnimatedAnswer from './AnimatedAnswer'; // Ensure path is correct
import { LinearGradient } from 'expo-linear-gradient';

// Android LayoutAnimation fix
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Just a debug constant to force onboarding
const DEBUG_SHOW_ONBOARDING = false;

const { width } = Dimensions.get('window');
const { height } = Dimensions.get('window');

// Detect smaller iPhones
const isIphoneSE = () => {
  const smallIphoneDimensions = [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 414, height: 736 },
    { width: 360, height: 640 },
    { width: 375, height: 812 },
    { width: 360, height: 780 },
  ];
  const { width: w, height: h } = Dimensions.get('window');
  return (
    Platform.OS === 'ios' &&
    smallIphoneDimensions.some(
      dim => (w === dim.width && h === dim.height) || (w === dim.height && h === dim.width)
    )
  );
};

/* -------------------------------------------------------------------------- */
/*                                AnimatedBar                                  */
/* -------------------------------------------------------------------------- */
const AnimatedBar = ({
  value,
  maxValue,
  barColor,
  exceedsGoal,
  percentageOverGoal,
  tooltipText,
  index,
  isTodayBar,
  maxBarHeight = 160,
}) => {
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const fadeInPercent = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const styles = getDynamicStyles(colorScheme);

  // Store bar’s X position to decide tooltip side
  const [barX, setBarX] = useState(0);

  useEffect(() => {
    const barHeight = Math.min((value / maxValue) * maxBarHeight, maxBarHeight);
    Animated.timing(animatedHeight, {
      toValue: barHeight,
      duration: 800,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      Animated.timing(fadeInPercent, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
      }).start();
    });
  }, [value, maxValue, maxBarHeight]);

  const onBarLayout = e => {
    setBarX(e.nativeEvent.layout.x);
  };

  // Decide which side to place the tooltip
  let tooltipPositionStyle = { left: '100%', marginLeft: 8 };
  if (barX > width / 2) {
    tooltipPositionStyle = { right: '100%', marginRight: 8 };
  }

  // Compute how far over the goal we are
  // (percentageOverGoal was originally the total percent vs. goal, e.g. 115 => 115% of goal,
  //  but we need the difference above 100, so 115 => 15% over the goal)
  let realDifference = 0;
  if (exceedsGoal) {
    realDifference = Math.round(percentageOverGoal - 100);
  }
  // Only show tooltip if it's today's bar, we exceed the goal by at least 15%
  const showTooltip = exceedsGoal && isTodayBar && realDifference >= 15;

  // For the label pinned at top of bar:
  // If it's under 100% show e.g. "75%", if it's between 100–114, show "✅", if >= 115, show "❗"
  let computedPercentage = 0;
  if (value > 0 && maxValue > 0) {
    computedPercentage = Math.round((value / maxValue) * 100);
  }
  let percentString = '';
  if (computedPercentage < 100) {
    percentString = `${computedPercentage}%`;
  } else if (computedPercentage <= 114) {
    percentString = '✅';
  } else {
    percentString = '❗';
  }

  const hasData = value > 0 && maxValue > 0;

  return (
    <View style={{ alignItems: 'center', position: 'relative' }} onLayout={onBarLayout}>
      {showTooltip && (
        <View style={[styles.tooltip, tooltipPositionStyle]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="warning" size={16} color="#FFD700" style={styles.tooltipIcon} />
            <Text style={styles.tooltipText}>
              You are {realDifference}%{tooltipText.includes('%') ? tooltipText.split('%')[1] : tooltipText}
            </Text>
          </View>
        </View>
      )}

      {/* The bar itself */}
      {value > 0 ? (
        <View
          style={{
            width: 30,
            height: maxBarHeight,
            overflow: 'hidden',
            borderRadius: 10,
            marginBottom: 8,
            backgroundColor: 'transparent',
          }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              borderRadius: 10,
              backgroundColor: barColor,
              height: animatedHeight,
            }}
          />
        </View>
      ) : (
        <View style={styles.noDataTab} />
      )}

      {/* Label pinned at top of bar */}
      {hasData && (
        <Animated.Text
          style={[
            styles.barPercentText,
            {
              bottom: animatedHeight,
              color: barColor,
              opacity: fadeInPercent,
            },
          ]}
        >
          {percentString}
        </Animated.Text>
      )}
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/*                             generateFakeTrends                              */
/* -------------------------------------------------------------------------- */
const generateFakeTrends = () => {
  return {
    calories: Array.from({ length: 7 }, () => Math.floor(Math.random() * 300) + 50),
    proteins: Array.from({ length: 7 }, () => Math.floor(Math.random() * 100) + 20),
    carbohydrates: Array.from({ length: 7 }, () => Math.floor(Math.random() * 400) + 50),
    fats: Array.from({ length: 7 }, () => Math.floor(Math.random() * 100) + 20),
  };
};

/* -------------------------------------------------------------------------- */
/*                           MAIN COMPONENT: InsightsV2                        */
/* -------------------------------------------------------------------------- */
const InsightsV2 = () => {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const styles = getDynamicStyles(colorScheme);

  // ------------------------ All Hooks at the top ----------------------------
  // Basic states
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [goals, setGoals] = useState(null);

  // Onboarding
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
      description:
        'We use your height to calculate your BMR. We will never share this data with third parties.',
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
      description:
        'We use your age to calculate your BMR. We only use this for calculating goals, it will not be used for anything else.',
    },
    {
      key: '5',
      title: 'What is your gender?',
      options: ['Male', 'Female', 'Other'],
      field: 'gender',
      icon: 'transgender-outline',
      description:
        'We use your gender to calculate your BMR. This will not be shared, it is important for correct goals.',
    },
    {
      key: '6',
      title: 'Select Your Activity Level',
      options: [
        { name: 'Sedentary', description: 'Little or no exercise' },
        { name: 'Moderately Active', description: 'Moderate exercise 3-5 days/week' },
        { name: 'Very Active', description: 'Intense exercise 6-7 days or highly active job' },
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
      description:
        'These goals were calculated based on published scientific papers and real data. Nothing was guessed!',
    },
  ];

  // Trends
  const [trends, setTrends] = useState(generateFakeTrends());
  const [recommendations, setRecommendations] = useState('');
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Macro selection
  const [selectedMacro, setSelectedMacro] = useState('goal');
  const [prevMacro, setPrevMacro] = useState('goal');
  const macroTextOpacity = useRef(new Animated.Value(1)).current;

  // Focus effect to load data
  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [])
  );

  // For weekly bar chart
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const WEEKS_RANGE = 52;
  const scrollX = useRef(new Animated.Value(WEEKS_RANGE * width)).current;
  const allOffsets = Array.from({ length: WEEKS_RANGE * 2 + 1 }, (_, i) => i - WEEKS_RANGE);
  const flatListRefWeekly = useRef(null);
  const returnButtonOpacity = useRef(new Animated.Value(0)).current;
  const goalsContainerTranslateY = useRef(new Animated.Value(0)).current;

  // Macro Modal
  const [showMacroOptions, setShowMacroOptions] = useState(false);
  const macroModalFade = useRef(new Animated.Value(0)).current;
  const [selectionCompleted, setSelectionCompleted] = useState(false);
  const checkmarkOpacity = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0.5)).current;

  // Name
  const [userName, setUserName] = useState('User');

  // FAQ
  const [faqOpen, setFaqOpen] = useState(false);

  // ----------------------- End of top-level hooks ---------------------------

  /* ---------------------------- Hook Logic --------------------------- */

  // 1) Onboarding + user goals
  const loadInitialData = async () => {
    await Promise.all([loadHistory(), loadGoals(), loadSelectedMacro()]);
    setIsLoading(false);
  };

  const loadHistory = async () => {
    try {
      const storedHistoryString = await AsyncStorage.getItem('@product_history');
      if (storedHistoryString) setHistory(JSON.parse(storedHistoryString));
      else setHistory([]);
    } catch (error) {
      console.error('Error loading history:', error);
      setHistory([]);
    }
  };

  const loadGoals = async () => {
    try {
      const storedGoalsString = await AsyncStorage.getItem('@user_goals');
      if (DEBUG_SHOW_ONBOARDING || !storedGoalsString) {
        setShowOnboarding(true);
        // Animate onboarding in
        Animated.timing(onboardingOpacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      } else {
        setGoals(JSON.parse(storedGoalsString));
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const loadSelectedMacro = async () => {
    try {
      const storedMacro = await AsyncStorage.getItem('@selected_macro');
      if (storedMacro) {
        const safeMacro = storedMacro === 'carbohydrates' ? 'carbs' : storedMacro;
        setSelectedMacro(safeMacro);
        setPrevMacro(safeMacro);
      }
    } catch (error) {
      console.error('Error loading selected macro:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const fetchUserName = async () => {
        try {
          const savedName = await AsyncStorage.getItem('userName');
          if (savedName) setUserName(savedName);
        } catch (error) {
          console.error('Error fetching user name:', error);
        }
      };
      fetchUserName();
    }, [])
  );

  // 2) Onboarding: calculate goals
  useEffect(() => {
    if (currentOnboardingIndex === 7) {
      const d = onboardingDataCollected;
      // Check if we have enough data
      const missingImperial =
        d.unit === 'imperial' &&
        (!d.heightFeet || !d.heightInches || !d.weight || !d.age || !d.gender || !d.activityLevel);
      const missingMetric =
        d.unit === 'metric' &&
        (!d.height || !d.weight || !d.age || !d.gender || !d.activityLevel);
      if (!missingImperial && !missingMetric) {
        const g = calculateGoals(d);
        setCalculatedGoals(g);
      } else {
        console.warn('Incomplete data for goal calculation');
      }
    }
  }, [currentOnboardingIndex]);

  const calculateGoals = data => {
    let weightKg;
    let heightCm;
    if (data.unit === 'imperial') {
      weightKg = parseFloat(data.weight) * 0.453592;
      if (data.heightFeet && data.heightInches) {
        heightCm =
          (parseFloat(data.heightFeet) * 12 + parseFloat(data.heightInches)) * 2.54;
      } else {
        heightCm = 0;
      }
    } else {
      weightKg = parseFloat(data.weight);
      heightCm = parseFloat(data.height);
    }
    const age = parseInt(data.age, 10) || 0;
    const gender = data.gender;
    let BMR;
    if (gender === 'Male') {
      BMR = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else {
      BMR = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }
    let activityFactor = 1.2;
    switch (data.activityLevel) {
      case 'Sedentary':
        activityFactor = 1.2;
        break;
      case 'Moderately Active':
        activityFactor = 1.55;
        break;
      case 'Very Active':
        activityFactor = 1.75;
        break;
      default:
        activityFactor = 1.2;
    }
    let TDEE = BMR * activityFactor;
    if (data.goal === 'Lose Weight') {
      TDEE -= 500;
    } else if (data.goal === 'Gain Weight') {
      TDEE += 500;
    }
    TDEE = Math.max(TDEE, 1200); // safety
    const calories = Math.round(TDEE);
    const proteins = Math.round(weightKg * 1.2);
    const fats = Math.round((calories * 0.30) / 9);
    const carbohydrates = Math.round((calories - proteins * 4 - fats * 9) / 4);
    return { calories, proteins, carbohydrates, fats };
  };

  const handleSaveGoalsFromOnboarding = async () => {
    try {
      const finalGoals = {};
      ['calories', 'proteins', 'carbohydrates', 'fats'].forEach(macro => {
        finalGoals[macro] = Math.round(
          calculatedGoals[macro] * (1 + goalsAdjustments[macro] / 100)
        );
      });
      await AsyncStorage.setItem('@user_goals', JSON.stringify(finalGoals));

      // Fade out the onboarding overlay
      Animated.timing(onboardingOpacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowOnboarding(false);
        setCalculatedGoals(null);
        setOnboardingIndex(0);
        setCurrentOnboardingIndex(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadHistory();
      });
    } catch (error) {
      console.error('Error saving goals:', error);
    }
  };

  const renderOnboardingItem = ({ item, index }) => {
    return (
      <View style={styles.onboardingPage}>
        <View style={styles.onboardingInnerContent}>
          <View style={styles.onboardingIconContainer}>
            <BlurView intensity={50} style={styles.onboardingIcon}>
              <Ionicons
                name={item.icon}
                size={80}
                color={colorScheme === 'dark' ? '#fff' : '#444'}
              />
            </BlurView>
          </View>
          <Text style={styles.onboardingTitle}>{item.title}</Text>
          {renderOnboardingFields(item, index)}
        </View>
        {item.description && (
          <AnimatedCenteredText
            text={item.description}
            colorScheme="dark"
            visible={currentOnboardingIndex === index}
          />
        )}
      </View>
    );
  };

  const renderOnboardingFields = (item, index) => {
    // This is just factoring out the inline logic from your snippet
    const d = onboardingDataCollected;
    // Return whichever input fields or toggles are relevant
    if (item.field === 'height') {
      return (
        <>
          <View style={styles.unitToggleContainer}>
            <TouchableOpacity
              onPress={() =>
                setOnboardingDataCollected(prev => ({
                  ...prev,
                  unit: 'imperial',
                  height: '',
                }))
              }
              style={d.unit === 'imperial' ? styles.unitToggleSelected : styles.unitToggle}
            >
              <Text
                style={d.unit === 'imperial' ? styles.unitToggleTextSelected : styles.unitToggleText}
              >
                Imperial (ft/in)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                setOnboardingDataCollected(prev => ({
                  ...prev,
                  unit: 'metric',
                  heightFeet: '',
                  heightInches: '',
                }))
              }
              style={d.unit === 'metric' ? styles.unitToggleSelected : styles.unitToggle}
            >
              <Text
                style={d.unit === 'metric' ? styles.unitToggleTextSelected : styles.unitToggleText}
              >
                Metric (cm)
              </Text>
            </TouchableOpacity>
          </View>
          {d.unit === 'imperial' ? (
            <View style={styles.inputRow}>
              <TextInput
                placeholder="Feet"
                placeholderTextColor="#999"
                keyboardType="numeric"
                style={styles.inputSmall}
                value={d.heightFeet}
                onChangeText={value =>
                  setOnboardingDataCollected(prev => ({ ...prev, heightFeet: value }))
                }
              />
              <TextInput
                placeholder="Inches"
                placeholderTextColor="#999"
                keyboardType="numeric"
                style={styles.inputSmall}
                value={d.heightInches}
                onChangeText={value =>
                  setOnboardingDataCollected(prev => ({ ...prev, heightInches: value }))
                }
              />
            </View>
          ) : (
            <TextInput
              placeholder="Centimeters"
              placeholderTextColor="#999"
              keyboardType="numeric"
              style={styles.input}
              value={d.height}
              onChangeText={value => setOnboardingDataCollected(prev => ({ ...prev, height: value }))}
            />
          )}
        </>
      );
    } else if (item.field === 'weight') {
      return (
        <>
          <View style={styles.unitToggleContainer}>
            <TouchableOpacity
              onPress={() =>
                setOnboardingDataCollected(prev => ({
                  ...prev,
                  unit: 'imperial',
                }))
              }
              style={d.unit === 'imperial' ? styles.unitToggleSelected : styles.unitToggle}
            >
              <Text
                style={d.unit === 'imperial' ? styles.unitToggleTextSelected : styles.unitToggleText}
              >
                Imperial (lbs)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                setOnboardingDataCollected(prev => ({
                  ...prev,
                  unit: 'metric',
                }))
              }
              style={d.unit === 'metric' ? styles.unitToggleSelected : styles.unitToggle}
            >
              <Text
                style={d.unit === 'metric' ? styles.unitToggleTextSelected : styles.unitToggleText}
              >
                Metric (kg)
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            placeholder={d.unit === 'imperial' ? 'Pounds' : 'Kilograms'}
            placeholderTextColor="#999"
            keyboardType="numeric"
            style={styles.input}
            value={d.weight}
            onChangeText={value => setOnboardingDataCollected(prev => ({ ...prev, weight: value }))}
          />
        </>
      );
    } else if (item.field === 'age') {
      return (
        <TextInput
          placeholder="Age"
          placeholderTextColor="#999"
          keyboardType="numeric"
          style={styles.input}
          value={d.age}
          onChangeText={value => setOnboardingDataCollected(prev => ({ ...prev, age: value }))}
        />
      );
    } else if (item.field === 'gender') {
      return (
        <View style={styles.optionsContainer}>
          {item.options.map(option => (
            <TouchableOpacity
              key={option}
              onPress={() =>
                setOnboardingDataCollected(prev => ({
                  ...prev,
                  gender: option,
                }))
              }
              style={d.gender === option ? styles.optionSelected : styles.option}
            >
              <Text style={d.gender === option ? styles.optionTextSelected : styles.optionText}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    } else if (item.field === 'activityLevel') {
      return (
        <View style={styles.activityOptionsContainer}>
          {item.options.map(option => {
            const isSelected = d.activityLevel === option.name;
            return (
              <TouchableOpacity
                key={option.name}
                onPress={() =>
                  setOnboardingDataCollected(prev => ({
                    ...prev,
                    activityLevel: option.name,
                  }))
                }
                style={isSelected ? styles.activityOptionLargeSelected : styles.activityOptionLarge}
              >
                <Text style={isSelected ? styles.activityOptionTextSelected : styles.activityOptionText}>
                  {option.name}
                </Text>
                <Text
                  style={[
                    styles.activityOptionDescription,
                    isSelected && styles.activityOptionDescriptionSelected,
                  ]}
                >
                  {option.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    } else if (item.field === 'goal') {
      return (
        <View style={styles.optionsContainer}>
          {item.options.map(option => (
            <TouchableOpacity
              key={option}
              onPress={() =>
                setOnboardingDataCollected(prev => ({
                  ...prev,
                  goal: option,
                }))
              }
              style={d.goal === option ? styles.optionSelected : styles.option}
            >
              <Text style={d.goal === option ? styles.optionTextSelected : styles.optionText}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    } else if (index === 7 && calculatedGoals) {
      // final goals screen
      return (
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
        </View>
      );
    }
    return null;
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      if (idx !== null && idx !== undefined) {
        setCurrentOnboardingIndex(idx);
      }
    }
  }).current;

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  // 4) Trends
  useEffect(() => {
    calculateTrends();
  }, [history, goals]);

  const calculateTrends = () => {
    if (!history || history.length === 0) {
      setTrends([]);
      return;
    }
    const macros = ['calories', 'proteins', 'carbohydrates', 'fats'];
    const today = new Date();
    const startCurrentRange = new Date(today);
    startCurrentRange.setDate(today.getDate() - 7);
    const startPreviousRange = new Date(today);
    startPreviousRange.setDate(today.getDate() - 14);

    const last7DaysItems = history.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startCurrentRange && itemDate <= today;
    });
    const previous7DaysItems = history.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startPreviousRange && itemDate < startCurrentRange;
    });

    const newTrends = [];
    macros.forEach(macro => {
      const last7Sum = last7DaysItems.reduce(
        (sum, item) => sum + (item.nutrients?.[macro]?.amount || 0),
        0
      );
      const previous7Sum = previous7DaysItems.reduce(
        (sum, item) => sum + (item.nutrients?.[macro]?.amount || 0),
        0
      );
      if (previous7Sum === 0 && last7Sum === 0) return;
      if (previous7Sum === 0 && last7Sum > 0) {
        newTrends.push(`Big changes for ${macro} compared to last week! Keep it up!`);
        return;
      }
      const diffPercent = ((last7Sum - previous7Sum) / (previous7Sum || 1)) * 100;
      if (Math.abs(diffPercent) >= 5) {
        if (diffPercent > 0) {
          newTrends.push(
            `You're about ${Math.round(diffPercent)}% more on track with ${macro} than last week. Great job!`
          );
        } else {
          newTrends.push(
            `You're about ${Math.round(Math.abs(diffPercent))}% below last week's ${macro}. Keep an eye on this!`
          );
        }
      }
    });
    setTrends(newTrends);
  };

  // 5) Today’s scans
  const [todaysScansCount, setTodaysScansCount] = useState(0);
  useEffect(() => {
    const today = new Date();
    const todaysHistory = history.filter(item => {
      const itemDate = new Date(item.date);
      return (
        itemDate.getUTCFullYear() === today.getUTCFullYear() &&
        itemDate.getUTCMonth() === today.getUTCMonth() &&
        itemDate.getUTCDate() === today.getUTCDate()
      );
    });
    setTodaysScansCount(todaysHistory.length);
  }, [history]);

  // 6) Repeat foods
  const [repeatFoods, setRepeatFoods] = useState([]);
  useEffect(() => {
    identifyRepeatFoods(history);
  }, [history]);

  const identifyRepeatFoods = historyData => {
    if (!historyData || historyData.length === 0) {
      setRepeatFoods([]);
      return;
    }
    const foodDateMap = {};
  
    historyData.forEach(item => {
      const date = new Date(item.date).toDateString();
      const name = item.productName;
      if (!foodDateMap[name]) {
        foodDateMap[name] = {};
      }
      if (!foodDateMap[name][date]) {
        foodDateMap[name][date] = 0;
      }
      foodDateMap[name][date] += 1;
    });
  
    const today = new Date().toDateString();
  
    const repeats = Object.keys(foodDateMap).filter(name =>
      Object.values(foodDateMap[name]).some(count => count >= 2)
    ).map(name => {
      // Total count across all history
      const totalCount = historyData.filter(item => item.productName === name).length;
      // Today's count
      const todayCount = foodDateMap[name][today] || 0;
      // Collect samples (e.g., latest two)
      const samples = historyData
        .filter(item => item.productName === name)
        .slice(-2); // Get last two samples
      return { name, count: totalCount, countToday: todayCount, samples };
    });
  
    // Remove duplicates and sort by count descending
    const uniqueRepeats = repeats.reduce((acc, current) => {
      const existing = acc.find(item => item.name === current.name);
      if (!existing) {
        acc.push(current);
      }
      return acc;
    }, []);
  
    uniqueRepeats.sort((a, b) => b.count - a.count);
  
    // Limit to top 5
    const topRepeats = uniqueRepeats.slice(0, 5);
  
    setRepeatFoods(topRepeats);
  };

  const isFoodNegative = food => {
    const cals = food.nutrients?.calories?.amount || 0;
    const fatCals = (food.nutrients?.fats?.amount || 0) * 9;
    if (cals > 0 && fatCals / cals > 0.5) return true;
    return false;
  };

  // 7) Today’s progress
  const calculateTodayProgress = () => {
    if (!goals) return { calories: 0, proteins: 0, carbohydrates: 0, fats: 0 };
    const today = new Date();
    const todaysHistory = history.filter(item => {
      const itemDate = new Date(item.date);
      return (
        itemDate.getUTCFullYear() === today.getUTCFullYear() &&
        itemDate.getUTCMonth() === today.getUTCMonth() &&
        itemDate.getUTCDate() === today.getUTCDate()
      );
    });
    return {
      calories: todaysHistory.reduce((sum, i) => sum + (i.nutrients?.calories?.amount || 0), 0),
      proteins: todaysHistory.reduce((sum, i) => sum + (i.nutrients?.proteins?.amount || 0), 0),
      carbohydrates: todaysHistory.reduce(
        (sum, i) => sum + (i.nutrients?.carbohydrates?.amount || 0),
        0
      ),
      fats: todaysHistory.reduce((sum, i) => sum + (i.nutrients?.fats?.amount || 0), 0),
    };
  };

  const findLastItemThatCausedOver = (macro, dailyIntake, todaysHistory) => {
    const goal = goals?.[macro] || 1;
    const threshold = goal * 1.2; // 120%
    let runningTotal = 0;
    let lastItem = null;
    for (let i = 0; i < todaysHistory.length; i++) {
      const item = todaysHistory[i];
      const val = item.nutrients?.[macro]?.amount || 0;
      runningTotal += val;
      if (runningTotal > threshold) {
        lastItem = item;
        break;
      }
    }
    return lastItem;
  };

  // 8) Weekly bar chart
  const onViewableItemsChangedWeekly = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      if (idx !== null && idx !== undefined) {
        setCurrentWeekOffset(allOffsets[idx]);
      }
    }
  }).current;

  const viewabilityConfigWeekly = {
    itemVisiblePercentThreshold: 50,
  };

  const macroColors = {
    goal: colorScheme === 'dark' ? '#fff' : '#000',
    calories: '#FF4500',
    proteins: '#3CB371',
    carbohydrates: '#FFA500',
    fats: '#6495ED',
  };

  const macroIconsMap = macro => {
    switch (macro) {
      case 'calories':
        return 'fire';
      case 'fats':
        return 'water';
      case 'proteins':
        return 'arm-flex';
      case 'carbs':
      case 'carbohydrates':
        return 'corn';
      case 'goal':
        return 'flag-checkered';
      default:
        return 'fire';
    }
  };

  const macroColorsMap = macro => {
    const usedMacro = macro === 'carbs' ? 'carbohydrates' : macro;
    return macroColors[usedMacro] || '#000';
  };

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getWeekDatesAndData = offset => {
    const today = new Date();
    const dayOfWeek = today.getUTCDay();
    const currentMonday = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
      )
    );
    const startOfWeek = new Date(
      Date.UTC(
        currentMonday.getUTCFullYear(),
        currentMonday.getUTCMonth(),
        currentMonday.getUTCDate() + offset * 7
      )
    );

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(
        Date.UTC(
          startOfWeek.getUTCFullYear(),
          startOfWeek.getUTCMonth(),
          startOfWeek.getUTCDate() + i
        )
      );
      days.push(d);
    }

    const dailyMacro = days.map(d => {
      const dateYear = d.getUTCFullYear();
      const dateMonth = d.getUTCMonth();
      const dateDay = d.getUTCDate();
      const dailyItems = history.filter(item => {
        const itemDate = new Date(item.date);
        return (
          itemDate.getUTCFullYear() === dateYear &&
          itemDate.getUTCMonth() === dateMonth &&
          itemDate.getUTCDate() === dateDay
        );
      });

      if (selectedMacro === 'goal') {
        // sum of all macros
        let daySum = 0;
        daySum += dailyItems.reduce((sum, i) => sum + (i.nutrients?.calories?.amount || 0), 0);
        daySum += dailyItems.reduce((sum, i) => sum + (i.nutrients?.proteins?.amount || 0), 0);
        daySum += dailyItems.reduce((sum, i) => sum + (i.nutrients?.carbohydrates?.amount || 0), 0);
        daySum += dailyItems.reduce((sum, i) => sum + (i.nutrients?.fats?.amount || 0), 0);
        return daySum;
      } else {
        const usedMacro = selectedMacro === 'carbs' ? 'carbohydrates' : selectedMacro;
        return dailyItems.reduce((sum, i) => sum + (i.nutrients?.[usedMacro]?.amount || 0), 0);
      }
    });

    return { days, dailyMacro };
  };

  const renderWeekItem = ({ item: offset }) => {
    const { days, dailyMacro } = getWeekDatesAndData(offset);
    const startDate = days[0];
    const endDate = days[6];
    const dateRangeString = `${startDate.toLocaleString('default', {
      month: 'short',
    })} ${startDate.getUTCDate()} - ${endDate.toLocaleString('default', {
      month: 'short',
    })} ${endDate.getUTCDate()}, ${endDate.getUTCFullYear()}`;

    const nowDate = new Date();
    const nowUTC = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate());
    const currentDayIndex = days.findIndex(
      d =>
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) === nowUTC
    );

    let maxGoal = 1;
    if (selectedMacro === 'goal') {
      if (goals) {
        maxGoal =
          (goals.calories || 0) +
          (goals.proteins || 0) +
          (goals.carbohydrates || 0) +
          (goals.fats || 0);
      }
    } else {
      const macroKey = selectedMacro === 'carbs' ? 'carbohydrates' : selectedMacro;
      maxGoal = goals ? goals[macroKey] : 1;
    }

    return (
      <View style={styles.weekContainer}>
        {/* Date range header */}
        <View style={styles.dateRangeContainer}>
          <Text style={styles.dateRangeText}>{dateRangeString}</Text>

          {/* Macro Chip */}
          <TouchableOpacity
            style={styles.macroChip}
            onPress={() => {
              Haptics.selectionAsync();
              setShowMacroOptions(true);
            }}
          >
            <Animated.View style={{ opacity: macroTextOpacity }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons
                  name={macroIconsMap(selectedMacro)}
                  size={16}
                  color={macroColorsMap(selectedMacro)}
                />
                <Text style={[styles.macroChipText, { color: macroColorsMap(selectedMacro) }]}>
                  {selectedMacro === 'carbs'
                    ? 'Viewing Carbs'
                    : selectedMacro === 'goal'
                    ? 'Viewing Goal'
                    : `Viewing ${capitalizeFirstLetter(selectedMacro)}`}
                </Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Bar chart */}
        <View style={styles.barChartRow}>
          {dayLabels.map((label, i) => {
            const val = dailyMacro[i] || 0;
            const isCurrentDay = offset === 0 && i === currentDayIndex;
            let barColor = colorScheme === 'dark' ? '#444' : '#CCC';
            if (isCurrentDay) {
              barColor = macroColorsMap(selectedMacro);
            }
            const dayNameColor = isCurrentDay
              ? colorScheme === 'dark'
                ? '#fff'
                : '#000'
              : colorScheme === 'dark'
              ? '#888'
              : '#555';

            const exceedsGoal = val > maxGoal;
            // We originally pass "percentageOverGoal" as total percent of the goal
            // so if val=115, maxGoal=100 => 115% of goal
            const overPercent = exceedsGoal ? Math.round((val / maxGoal) * 100) : 0;

            return (
              <View key={i} style={styles.barItem}>
                <AnimatedBar
                  value={val}
                  maxValue={maxGoal}
                  barColor={barColor}
                  index={i}
                  exceedsGoal={exceedsGoal}
                  percentageOverGoal={overPercent}
                  tooltipText={`${overPercent}% over your ${
                    selectedMacro === 'carbs'
                      ? 'Carbs'
                      : selectedMacro === 'goal'
                      ? 'Overall Daily Goal'
                      : capitalizeFirstLetter(selectedMacro)
                  } goal`}
                  isTodayBar={isCurrentDay}
                />
                <Text style={[styles.dayLabel, { color: dayNameColor }]}>{label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Macro Modal
  useEffect(() => {
    if (showMacroOptions) animateModalIn();
  }, [showMacroOptions]);

  const animateModalIn = () => {
    macroModalFade.setValue(0);
    Animated.timing(macroModalFade, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const animateModalOut = callback => {
    Animated.parallel([
      Animated.timing(macroModalFade, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(checkmarkOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(checkmarkScale, {
        toValue: 0.5,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (callback) callback();
    });
  };

  const crossfadeMacroText = newMacro => {
    Animated.timing(macroTextOpacity, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      LayoutAnimation.easeInEaseOut();
      setPrevMacro(selectedMacro);
      setSelectedMacro(newMacro);

      Animated.timing(macroTextOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleMacroSelect = async macro => {
    try {
      setSelectionCompleted(true);

      Animated.parallel([
        Animated.timing(checkmarkOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(checkmarkScale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => {
          animateModalOut(() => {
            setShowMacroOptions(false);
            setSelectionCompleted(false);
            checkmarkOpacity.setValue(0);
            checkmarkScale.setValue(0.5);
          });
        }, 400);
      });

      let storedMacroKey = macro;
      if (macro === 'carbs') storedMacroKey = 'carbohydrates';
      await AsyncStorage.setItem('@selected_macro', storedMacroKey);
      crossfadeMacroText(macro);
    } catch (error) {
      console.error('Error saving selected macro:', error);
    }
  };

  const renderMacroModal = () => {
    if (!showMacroOptions) return null;
    const macros = [
      { key: 'goal', label: 'Goal', icon: 'flag-checkered' },
      { key: 'calories', label: 'Calories', icon: 'fire' },
      { key: 'fats', label: 'Fats', icon: 'water' },
      { key: 'proteins', label: 'Proteins', icon: 'arm-flex' },
      { key: 'carbohydrates', label: 'Carbs', icon: 'corn' },
    ];

    return (
      <View style={styles.macroModalOverlay}>
        <TouchableWithoutFeedback onPress={() => animateModalOut(() => setShowMacroOptions(false))}>
          <Animated.View
            style={[styles.macroModalBackground, { opacity: macroModalFade }]}
          >
            <BlurView intensity={30} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </TouchableWithoutFeedback>

        <Animated.View
          style={{
            position: 'absolute',
            zIndex: 9999,
            opacity: macroModalFade,
            transform: [
              {
                scale: macroModalFade.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!selectionCompleted && (
            <View style={styles.macroModalContainer}>
              <Text style={styles.macroModalTitle}>Select a macro to view</Text>
              {macros.map(m => {
                let dataMacro = m.key;
                if (m.key === 'carbohydrates') dataMacro = 'carbs';
                const isActive = selectedMacro === dataMacro;

                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.macroButton, isActive && styles.macroButtonActive]}
                    onPress={() => handleMacroSelect(dataMacro)}
                  >
                    <View style={styles.macroButtonContent}>
                      <MaterialCommunityIcons
                        name={m.icon}
                        size={24}
                        color={colorScheme === 'dark' ? '#FFF' : '#000'}
                      />
                      <Text
                        style={[
                          styles.macroButtonTitle,
                          { marginLeft: 12 },
                          isActive && styles.macroButtonTitleActive,
                        ]}
                      >
                        {m.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Animated.View>

        {selectionCompleted && (
          <Animated.View
            style={{
              position: 'absolute',
              zIndex: 10000,
              opacity: checkmarkOpacity,
              transform: [{ scale: checkmarkScale }],
              alignItems: 'center',
            }}
          >
            <Ionicons
              name="checkmark-circle"
              color={colorScheme === 'dark' ? '#fff' : '#000'}
              size={100}
            />
            <Text
              style={{
                color: colorScheme === 'dark' ? '#fff' : '#000',
                fontSize: 28,
                marginTop: 8,
                fontWeight: '700',
              }}
            >
              Saved
            </Text>
          </Animated.View>
        )}
      </View>
    );
  };

  // Return-to-this-week
  const handleReturnToCurrentWeek = () => {
    Animated.timing(returnButtonOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      flatListRefWeekly.current?.scrollToIndex({ index: WEEKS_RANGE, animated: true });
      setCurrentWeekOffset(0);
    });
  };

  useEffect(() => {
    if (currentWeekOffset !== 0) {
      Animated.timing(returnButtonOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(returnButtonOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [currentWeekOffset]);

  const renderReturnButton = () => {
    if (currentWeekOffset === 0) return null;
    const isFutureWeek = currentWeekOffset > 0;
    return (
      <Animated.View
        style={[styles.animatedReturnButtonContainer, { opacity: returnButtonOpacity }]}
      >
        <TouchableOpacity
          style={styles.returnButton}
          onPress={async () => {
            await Haptics.selectionAsync();
            handleReturnToCurrentWeek();
          }}
        >
          <Ionicons
            name={isFutureWeek ? 'return-up-back' : 'return-down-forward'}
            size={24}
            color="#fff"
          />
          <Text style={styles.returnButtonText}>Return to this week</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Beta alert
  const showBetaAlert = () => {
    Alert.alert(
      'Almost Done!',
      'We have a lot planned for this screen! Stay tuned for more features and improvements.'
    );
  };

  // Single FAQ
  const toggleFaq = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFaqOpen(prev => !prev);
  }, []);

  /* --------------------- All Hooks declared above --------------------------- */
  /* ----------------------- Now do final rendering --------------------------- */
  const todaysIntake = calculateTodayProgress();
  const macrosList = ['calories', 'proteins', 'carbohydrates', 'fats'];
  const overLimitInfo = [];
  let macrosWithGoalsCount = 0;
  let totalTransformedPercent = 0;

  macrosList.forEach(macro => {
    if (goals?.[macro] > 0) {
      const ratio = todaysIntake[macro] / goals[macro];
      let ratioInPercent = ratio * 100;
      if (ratioInPercent > 100) {
        ratioInPercent = 200 - ratioInPercent; // your special "200 - x" logic
      }
      totalTransformedPercent += ratioInPercent;
      macrosWithGoalsCount += 1;
    }
  });

  let avgPercent = 0;
  if (macrosWithGoalsCount > 0) {
    avgPercent = totalTransformedPercent / macrosWithGoalsCount;
  }
  const displayPercent = Math.round(Math.min(Math.max(avgPercent, 0), 999));

  const todaysHistory = history.filter(item => {
    const itemDate = new Date(item.date);
    const now = new Date();
    return (
      itemDate.getUTCFullYear() === now.getUTCFullYear() &&
      itemDate.getUTCMonth() === now.getUTCMonth() &&
      itemDate.getUTCDate() === now.getUTCDate()
    );
  });

  macrosList.forEach(macro => {
    if (goals?.[macro] > 0) {
      const ratio = todaysIntake[macro] / goals[macro];
      if (ratio > 1.2) {
        const lastOverItem = findLastItemThatCausedOver(macro, todaysIntake[macro], todaysHistory);
        const overPercent = Math.round((ratio - 1) * 100);
        overLimitInfo.push({ macro, overPercent, lastItem: lastOverItem });
      }
    }
  });

  const isAnyMacroOverLimit = overLimitInfo.length > 0;

  const miniBarConfig = {
    calories: { icon: 'fire', color: '#FF4500' },
    proteins: { icon: 'arm-flex', color: '#3CB371' },
    carbohydrates: { icon: 'corn', color: '#FFA500' },
    fats: { icon: 'water', color: '#6495ED' },
  };

  // Finally, conditionally render loading or main UI in ONE return.
  // (So we don't skip hooks if isLoading is true.)
  return (
    <SafeAreaView style={styles.safeArea}>
      {isLoading ? (
        // ------------------ LOADING UI ------------------
        <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#888" />
        </View>
      ) : (
        // ------------------ MAIN UI ---------------------
        <>
          {/* Onboarding Overlay */}
          {showOnboarding && (
            <Animated.View style={[styles.onboardingOverlay, { opacity: onboardingOpacityAnim }]}>
              <BlurView intensity={50} style={StyleSheet.absoluteFill} />
              <View style={styles.onboardingContainer}>
                <View style={styles.onboardingContent}>
                  <FlatList
                    data={onboardingData}
                    renderItem={renderOnboardingItem}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={it => it.key}
                    scrollEnabled
                    extraData={onboardingIndex}
                    ref={flatListRef}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                  />
                </View>
                <View style={styles.onboardingFooter}>
                  <View style={styles.pagination}>
                    {onboardingData.map((_, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.paginationDot,
                          currentOnboardingIndex === idx
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
                  ) : (
                    <TouchableOpacity
                      style={styles.onboardingNextButton}
                      onPress={handleSaveGoalsFromOnboarding}
                    >
                      <Text style={styles.onboardingButtonText}>Finish</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Animated.View>
          )}

          {renderMacroModal()}

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Hi, {userName}!</Text>
            <TouchableOpacity onPress={showBetaAlert}>
              <View style={styles.betaContainer}>
                <Text style={styles.betaTag}>BETA</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Weekly Scroll */}
          <View style={styles.weekScrollContainer}>
            <FlatList
              data={allOffsets}
              keyExtractor={item => item.toString()}
              horizontal
              pagingEnabled
              initialScrollIndex={WEEKS_RANGE}
              getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
              renderItem={renderWeekItem}
              showsHorizontalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
              onMomentumScrollEnd={e => {
                const pageIndex = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentWeekOffset(allOffsets[pageIndex]);
              }}
              onViewableItemsChanged={onViewableItemsChangedWeekly}
              viewabilityConfig={viewabilityConfigWeekly}
              ref={flatListRefWeekly}
            />
            {renderReturnButton()}
          </View>

          {/* Main Content */}
          <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
            <Animated.View
              style={[
                styles.goalsInfoContainer,
                {
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                },
                { transform: [{ translateY: goalsContainerTranslateY }] },
              ]}
            >
              {goals ? (
                <>
                  {/* Left side */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalsInfoTitle}>Today's Progress</Text>
                    <Text
                      style={[
                        styles.bigPercent,
                        { color: isAnyMacroOverLimit ? '#e34949' : '#007AFF' },
                      ]}
                    >
                      {Number.isNaN(displayPercent) ? '0' : displayPercent}%
                    </Text>
                    <Text style={styles.percentSubtext}>of your daily goals</Text>
                  </View>

                  {/* Right side: mini bar chart */}
                  <View style={styles.miniBarChartContainer}>
                    {['calories', 'proteins', 'carbohydrates', 'fats'].map(macro => {
                      const macroGoal = goals[macro] || 1;
                      const macroIntake = todaysIntake[macro] || 0;
                      const isOverGoal = macroIntake > macroGoal;
                      // We'll still compute the "overPercent" but
                      // we ensure no tooltip appears by setting isTodayBar={false}.
                      const overPercent = isOverGoal ? Math.round((macroIntake / macroGoal) * 100) : 0;
                      const { icon, color } = miniBarConfig[macro];
                      return (
                        <View key={macro} style={styles.miniBarItem}>
                          <AnimatedBar
                            value={macroIntake}
                            maxValue={macroGoal}
                            barColor={color}
                            exceedsGoal={isOverGoal}
                            percentageOverGoal={overPercent}
                            tooltipText={`${overPercent}% over your ${macro} goal`}
                            // Ensure tooltips never show in this mini chart:
                            isTodayBar={false}
                            maxBarHeight={78}
                          />
                          <MaterialCommunityIcons
                            name={icon}
                            size={24}
                            color={color}
                            style={{ marginTop: 4 }}
                          />
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : (
                <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#ccc' : '#888'} />
              )}
            </Animated.View>

            {/* Over-limit breakdown */}
            {isAnyMacroOverLimit && (
              <View style={styles.overLimitContainer}>
                <Text style={styles.overLimitTitle}>Over the limit!</Text>
                {overLimitInfo.map(({ macro, overPercent, lastItem }, idx) => {
                  if (!lastItem) return null;
                  const itemMacroVal = lastItem.nutrients?.[macro]?.amount || 0;
                  const prettyMacroName =
                    macro === 'carbohydrates' ? 'Carbs' : capitalizeFirstLetter(macro);

                  return (
                    <View key={`${macro}-${idx}`} style={styles.overLimitRow}>
                      <Text style={styles.overLimitMacro}>
                        {prettyMacroName} +{overPercent}%
                      </Text>
                      <Text style={styles.overLimitFood}>
                        Last scan:{' '}
                        <Text style={styles.foodName}>{lastItem.productName}</Text>
                      </Text>
                      <Text style={styles.overLimitReason}>
                        {prettyMacroName}:{' '}
                        <Text style={styles.highlightMacro}>{itemMacroVal}</Text>
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Trends */}
            {todaysScansCount > 3 && trends && trends.length > 0 && (
              <View style={styles.adviceContainer}>
                <Text style={styles.sectionTitle}>Trends</Text>
                {trends.map((trend, idx) => (
                  <Text key={idx} style={styles.adviceText}>
                    {trend}
                  </Text>
                ))}
              </View>
            )}

            {/* Single FAQ Accordion */}
            <View style={styles.faqContainer}>
              <TouchableOpacity style={styles.faqTitleContainer} onPress={toggleFaq}>
                <Ionicons
                  name={faqOpen ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={colorScheme === 'dark' ? '#FFF' : '#000'}
                />
                <Text style={styles.faqTitle}>
                  Why do the bar chart and Today's Progress show different percentages?
                </Text>
              </TouchableOpacity>
              {faqOpen && (
                <AnimatedAnswer
                  text="Today’s Progress averages each macro’s percentage (with adjustments if over 100%), while the bar chart compares total macros to their goals. This creates different percentages: the bar chart is technically more accurate, but “Today’s Progress” better reflects your effort."
                  colorScheme={colorScheme}
                />
              )}
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimerContainer}>
<Text style={styles.disclaimerText}>
  Your data is stored locally and is not shared. Learn more about BMI{' '}
  <Text
    style={styles.linkText}
    onPress={() => Linking.openURL('https://en.wikipedia.org/wiki/Body_mass_index')}
  >
    here
  </Text>
  {' '}and BMR{' '}
  <Text
    style={styles.linkText}
    onPress={() => Linking.openURL('https://en.wikipedia.org/wiki/Basal_metabolic_rate')}
  >
    here
  </Text>
  .
</Text>
            </View>
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
};

/* -------------------------------------------------------------------------- */
/*                          Helper: capitalizeFirstLetter                      */
/* -------------------------------------------------------------------------- */
function capitalizeFirstLetter(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* -------------------------------------------------------------------------- */
/*                             getDynamicStyles                                */
/* -------------------------------------------------------------------------- */
const getDynamicStyles = colorScheme =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
    },
    header: {
      paddingTop: isIphoneSE() ? 12 : 10,
      paddingBottom: 8,
      backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
      alignItems: 'flex-start',
      marginLeft: 25,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
    },
    container: {
      flex: 1,
      paddingHorizontal: 20,
    },
    weekScrollContainer: {
      height: 300,
      backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
      position: 'relative',
      paddingBottom: 50,
    },
    weekContainer: {
      width,
      alignItems: 'center',
    },
    dateRangeContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '90%',
      marginLeft: 15,
      marginBottom: 10,
    },
    dateRangeText: {
      color: colorScheme === 'dark' ? '#ccc' : '#555',
      fontSize: 16,
      fontWeight: '500',
    },
    macroChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#444' : '#ccc',
      marginRight: 10,
    },
    macroChipText: {
      marginLeft: 6,
      fontSize: 15,
      fontWeight: '600',
    },
    barChartRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-end',
      width: '90%',
      height: 200,
    },
    barItem: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      width: 40,
    },
    noDataTab: {
      width: 30,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#AAA',
      marginBottom: 8,
    },
    barPercentText: {
      left: 3.5,
      position: 'absolute',
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 12,
    },

    /* Today's Progress */
    goalsInfoContainer: {
      backgroundColor: colorScheme === 'dark' ? '#1b1b1d' : '#EEE',
      borderRadius: 15,
      padding: 20,
      marginTop: 20,
      marginBottom: 20,
      minHeight: 170,
    },
    goalsInfoTitle: {
      fontSize: height >= 926 ? 20 : 18,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      marginBottom: 5,
    },
    bigPercent: {
      fontSize: 60,
      fontWeight: 'bold',
      textAlign: 'left',
      marginBottom: 5,
    },
    percentSubtext: {
      fontSize: 16,
      color: colorScheme === 'dark' ? '#ccc' : '#666',
      marginTop: 5,
    },
    miniBarChartContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      width: 160,
    },
    miniBarItem: {
      alignItems: 'center',
      marginLeft: 10,
    },

    /* Over-limit breakdown */
    overLimitContainer: {
      backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#f5cfcf',
      borderRadius: 15,
      padding: 15,
      marginBottom: 20,
    },
    overLimitTitle: {
      fontSize: 18,
      color: colorScheme === 'dark' ? '#f88' : '#900',
      fontWeight: 'bold',
      marginBottom: 10,
    },
    overLimitRow: {
      marginBottom: 10,
    },
    overLimitMacro: {
      fontSize: 16,
      color: colorScheme === 'dark' ? '#faa' : '#900',
      fontWeight: '600',
    },
    overLimitFood: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#FFF' : '#000',
    },
    overLimitReason: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#FFF' : '#000',
    },
    highlightMacro: {
      color: 'red',
      fontWeight: '700',
    },

    /* Trends & Advice */
    adviceContainer: {
      marginBottom: 30,
      position: 'relative',
      backgroundColor: colorScheme === 'dark' ? '#1b1b1d' : '#EEE',
      borderRadius: 15,
      padding: 15,
    },
    sectionTitle: {
      fontSize: 18,
      color: colorScheme === 'dark' ? '#fff' : '#000',
      marginBottom: 10,
      fontWeight: '400',
      textAlign: 'center',
    },
    adviceText: {
      fontSize: 16,
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      marginBottom: 10,
      textAlign: 'center',
    },

    /* Frequently Consumed */
    repeatFoodsContainer: {
      marginBottom: 8,
    },
    foodItem: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#eee',
      padding: 15,
      borderRadius: 15,
      marginBottom: 10,
    },
    foodNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    },
    foodName: {
      fontSize: 18,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#fff' : '#000',
    },
    scanCount: {
      fontSize: 12,
      color: colorScheme === 'dark' ? '#ccc' : '#555',
      right: 95,
      top: 1.5,
    },
    foodSubtitle: {
      width: '80%',
      fontSize: 14,
      color: colorScheme === 'dark' ? '#ccc' : '#555',
      marginTop: 4,
    },
    foodIcon: {
      position: 'absolute',
      right: 15,
      top: 7,
      alignSelf: 'flex-end',
      marginTop: 8,
    },

    /* Disclaimer */
    disclaimerContainer: {
      marginTop: 20,
      marginBottom: 50,
    },
    disclaimerText: {
      color: colorScheme === 'dark' ? '#AAA' : '#666',
      fontSize: 14,
      textAlign: 'center',
    },
    linkText: {
      color: '#007AFF',
      textDecorationLine: 'underline',
    },

    /* Return Button */
    animatedReturnButtonContainer: {
      position: 'absolute',
      bottom: 0,
      alignSelf: 'center',
    },
    returnButton: {
      backgroundColor: '#000',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 25,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3.84,
      elevation: 5,
    },
    returnButtonText: {
      color: '#fff',
      marginLeft: 8,
      fontSize: 16,
      fontWeight: '600',
    },

    /* Macro Modal */
    macroModalOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    macroModalBackground: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
    },
    macroModalContainer: {
      backgroundColor: colorScheme === 'dark' ? '#222' : '#fff',
      padding: 20,
      borderRadius: 30,
      width: 300,
      alignItems: 'center',
      borderColor: colorScheme === 'dark' ? '#444' : '#ccc',
      borderWidth: 2,
    },
    macroModalTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 20,
      color: colorScheme === 'dark' ? '#fff' : '#000',
      textAlign: 'center',
    },
    macroButton: {
      width: '100%',
      paddingVertical: 12,
      paddingHorizontal: 15,
      borderRadius: 20,
      marginBottom: 10,
      backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#F3F3F3',
    },
    macroButtonActive: {
      borderWidth: 2,
      borderColor: '#007AFF',
    },
    macroButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    macroButtonTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#fff' : '#000',
    },
    macroButtonTitleActive: {
      color: '#007AFF',
      fontWeight: '600',
    },

    /* Tooltip */
    tooltip: {
      position: 'absolute',
      zIndex: 10,
      pointerEvents: 'none',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      padding: 10,
      borderRadius: 8,
      minWidth: 170,
      maxWidth: 200,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    tooltipText: {
      color: '#fff',
      fontSize: 12,
      textAlign: 'left',
    },
    tooltipIcon: {
      marginRight: 6,
    },
    dayLabel: {
      color: colorScheme === 'dark' ? '#bbb' : '#555',
      fontSize: 15,
      fontWeight: '500',
    },

    /* Onboarding */
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
      width,
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
      backgroundColor:
        colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    onboardingTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#fff' : '#000',
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
      backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#ccc',
      marginHorizontal: 5,
    },
    unitToggleSelected: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
      backgroundColor: colorScheme === 'dark' ? '#fff' : '#000',
      marginHorizontal: 5,
    },
    unitToggleText: {
      color: colorScheme === 'dark' ? '#fff' : '#000',
    },
    unitToggleTextSelected: {
      color: colorScheme === 'dark' ? '#000' : '#fff',
    },
    input: {
      backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#ccc',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
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
      backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#ccc',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
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
    option: {
      backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#ccc',
      padding: 15,
      borderRadius: 15,
      marginBottom: 10,
      width: '80%',
      alignItems: 'center',
    },
    optionSelected: {
      backgroundColor: colorScheme === 'dark' ? '#fff' : '#000',
      padding: 15,
      borderRadius: 15,
      marginBottom: 10,
      width: '80%',
      alignItems: 'center',
    },
    optionText: {
      color: colorScheme === 'dark' ? '#fff' : '#000',
      fontSize: 16,
      textAlign: 'center',
    },
    optionTextSelected: {
      color: colorScheme === 'dark' ? '#000' : '#fff',
      fontSize: 16,
      textAlign: 'center',
    },
    activityOptionsContainer: {
      width: '100%',
      alignItems: 'center',
      marginTop: 10,
      height: '50%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    activityOptionLarge: {
      backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#ccc',
      padding: 12,
      borderRadius: 18,
      marginBottom: 10,
      width: '90%',
      alignContent: 'center',
    },
    activityOptionLargeSelected: {
      backgroundColor: colorScheme === 'dark' ? '#fff' : '#000',
      padding: 12,
      borderRadius: 18,
      marginBottom: 10,
      width: '90%',
      alignContent: 'center',
    },
    activityOptionText: {
      color: colorScheme === 'dark' ? '#fff' : '#000',
      fontSize: 18,
      textAlign: 'center',
      marginTop: 2,
    },
    activityOptionTextSelected: {
      color: colorScheme === 'dark' ? '#000' : '#fff',
      fontSize: 18,
      textAlign: 'center',
    },
    activityOptionDescription: {
      color: colorScheme === 'dark' ? '#aaa' : '#555',
      fontSize: 15,
      textAlign: 'center',
      marginTop: 1,
    },
    activityOptionDescriptionSelected: {
      color: colorScheme === 'dark' ? '#333' : '#aaa',
      fontSize: 15,
      textAlign: 'center',
      marginTop: 1,
    },
    goalsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: 10,
    },
    goalCard: {
      backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#ccc',
      padding: 20,
      borderRadius: 15,
      margin: 10,
      width: '40%',
      alignItems: 'center',
    },
    goalValue: {
      color: colorScheme === 'dark' ? '#fff' : '#000',
      fontSize: 22,
      fontWeight: 'bold',
    },
    goalLabel: {
      color: colorScheme === 'dark' ? '#aaa' : '#333',
      fontSize: 16,
      marginTop: 5,
    },
    onboardingFooter: {
      width: '100%',
      alignItems: 'center',
    },
    pagination: {
      flexDirection: 'row',
    },
    paginationDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginHorizontal: 5,
    },
    paginationDotActive: {
      top: -1,
      backgroundColor: colorScheme === 'dark' ? '#fff' : '#000',
    },
    paginationDotInactive: {
      backgroundColor: '#777',
    },
    onboardingNextButton: {
      backgroundColor: colorScheme === 'dark' ? '#fff' : '#000',
      paddingVertical: 12,
      paddingHorizontal: 40,
      borderRadius: 25,
      marginTop: 20,
    },
    onboardingButtonText: {
      color: colorScheme === 'dark' ? '#000' : '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },

    /* FAQ */
    faqContainer: {
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#eee',
      borderRadius: 16,
      padding: 16,
      marginTop: 8,
      marginBottom: 8,
    },
    faqTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    faqTitle: {
      fontSize: height >= 926 ? 16 : 15,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      marginLeft: 8,
      flexShrink: 1,
    },
    betaContainer: {
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#E5E5EA',
      borderRadius: 8,
      overflow: 'hidden',
      marginLeft: 0,
      marginTop: 8,
    },
    betaTag: {
      fontSize: 14,
      color: '#007AFF',
      fontWeight: '600',
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
  });

export default InsightsV2;