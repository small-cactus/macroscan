// OnboardingScreen.js

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  FlatList,
  Animated,
  Appearance,
  Platform,
  UIManager,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import AnimatedTextOnboarding from './AnimatedTextOnboarding.js';
import AnimatedTextLoading from './AnimatedTextLoading';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FoodCarousel from './FoodCarousel.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const isSmallDevice = height < 700;

const ONBOARDING_STEPS = [
  {
    id: '1',
    title: 'Welcome to MacroScan',
    description: 'Your AI-powered nutrition companion for a healthier lifestyle',
    features: [
      { 
        id: '1-1',
        title: 'Unlimited Scanning',
        description: 'Scan as many meals as you want, whenever you want',
        icon: '🔄'
      },
      { 
        id: '1-2',
        title: 'Smart Recognition',
        description: 'Our AI identifies foods instantly with high accuracy',
        icon: '🔍'
      },
      { 
        id: '1-3',
        title: 'Detailed Nutrition',
        description: 'Get complete macro and micronutrient breakdowns',
        icon: '📊'
      },
      { 
        id: '1-4',
        title: 'Progress Tracking',
        description: 'Monitor your nutrition journey with detailed insights',
        icon: '📈'
      },
      { 
        id: '1-5',
        title: 'AI Coach',
        description: 'Receive personalized nutrition recommendations',
        icon: '🤖'
      }
    ]
  },
  {
    id: '2',
    title: 'Quick & Easy Scanning',
    description: 'Two simple ways to log your meals',
    features: [
      {
        id: '2-1',
        title: 'Take Photo',
        description: 'Snap a picture of your meal in real-time',
        icon: '📸'
      },
      {
        id: '2-2',
        title: 'Choose from Gallery',
        description: 'Select existing photos from your device',
        icon: '🖼️'
      }
    ]
  },
  {
    id: '3',
    title: 'Get Personalized Goals',
    description: "Let's make your journey truly personal. We'll create custom nutrition goals that fit your lifestyle.",
    features: [
      {
        id: '3-1',
        title: 'Smart Calculations',
        description: 'Based on scientific research and real data',
        icon: '🧮'
      },
      {
        id: '3-2',
        title: 'Tailored Goals',
        description: 'Perfectly matched to your body and lifestyle',
        icon: '🎯'
      },
      {
        id: '3-3',
        title: 'Privacy First',
        description: 'Your data stays on your device, always',
        icon: '🔒'
      }
    ]
  },
  {
    id: '4',
    title: "Let's Get Started",
    description: "First, we'll need a few details to calculate your perfect nutrition goals. This helps us provide the most accurate recommendations.",
    preInput: true,
    features: [
      {
        id: '4-1',
        title: 'Quick Setup',
        description: 'Takes less than 2 minutes',
        icon: '⚡'
      },
      {
        id: '4-2',
        title: 'Accurate Goals',
        description: 'Based on your unique profile',
        icon: '📊'
      }
    ]
  },
  {
    id: '5',
    title: "What's your height?",
    field: 'height',
    description: 'This helps us calculate your base metabolic rate (BMR) for accurate nutrition goals.',
    showUnitToggle: true,
    icon: 'human-male-height',
    iconType: 'material',
    unitOptions: [
      { label: 'Imperial (ft/in)', value: 'imperial' },
      { label: 'Metric (cm)', value: 'metric' }
    ]
  },
  {
    id: '6',
    title: 'What is your weight?',
    field: 'weight',
    description: 'Your weight helps us determine your daily energy needs.',
    showUnitToggle: true,
    icon: 'scale-bathroom',
    iconType: 'material',
    unitOptions: [
      { label: 'Imperial (lbs)', value: 'imperial' },
      { label: 'Metric (kg)', value: 'metric' }
    ]
  },
  {
    id: '7',
    title: 'What is your age?',
    field: 'age',
    description: 'Age plays a key role in calculating your metabolic rate.',
    icon: 'calendar',
    iconType: 'ionicon',
    useDatePicker: true
  },
  {
    id: '8',
    title: 'What is your gender?',
    field: 'gender',
    description: 'This helps us calculate your metabolic rate more accurately.',
    icon: 'gender-male-female',
    iconType: 'material',
    options: ['Male', 'Female', 'Other']
  },
  {
    id: '9',
    title: 'How active are you?',
    field: 'activityLevel',
    description: 'Your activity level helps us determine your daily calorie needs.',
    icon: 'run',
    iconType: 'material',
    options: [
      { 
        name: 'Sedentary',
        description: 'Office job, little to no exercise'
      },
      { 
        name: 'Moderately Active',
        description: 'Light exercise/sports 3-5 days/week'
      },
      { 
        name: 'Very Active',
        description: 'Hard exercise/sports 6-7 days/week'
      }
    ]
  },
  {
    id: '10',
    title: "What's your goal?",
    field: 'goal',
    description: "Let's focus your nutrition journey on what matters to you.",
    icon: 'target',
    iconType: 'material',
    options: ['Lose Weight', 'Maintain Weight', 'Gain Weight']
  },
  {
    id: '10a',
    title: "What's your target weight?",
    field: 'targetWeight',
    description: "Enter your goal weight so we can help you track your progress.",
    icon: 'scale-bathroom',
    iconType: 'material',
    showUnitToggle: true,
    unitOptions: [
      { label: 'Imperial (lbs)', value: 'imperial' },
      { label: 'Metric (kg)', value: 'metric' }
    ],
    dependsOnGoal: true
  },
  {
    id: '10b',
    title: "How fast do you want to change?",
    field: 'weightChangeRate',
    description: "Select a comfortable pace for your journey. Remember, sustainable changes lead to lasting results.",
    icon: 'speedometer',
    iconType: 'material',
    showWeightChangeOptions: true,
    dependsOnGoal: true
  },
  {
    id: '11',
    title: "Your Personalized Nutrition Blueprint 🎯",
    description: "Your goals are realistic and achievable. Let's make it happen!",
    showCalculatedGoals: true,
    features: [
      {
        id: '11-1',
        title: 'Scientific Calculation',
        description: 'Goals based on proven formulas',
        icon: '🔬'
      },
      {
        id: '11-2',
        title: 'Personalized',
        description: 'Tailored to your unique profile',
        icon: '👤'
      }
    ]
  },
  {
    id: '12',
    title: 'Scan Any Food, Anywhere',
    description: 'Our AI recognizes any food, including new creations',
    showPaywall: true,
    features: [
      {
        id: '12-1',
        title: 'Unlimited Accurate Scans',
        description: 'Track your meals with 93% accuracy, which is industry leading in AI nutrition apps',
        icon: '∞'
      },
      {
        id: '12-2',
        title: 'Super Personalized Goals',
        description: 'Your personalized nutrition targets more personal aspects than most other apps',
        icon: '🎯'
      },
      {
        id: '12-3',
        title: 'Detailed Analytics',
        description: 'Track your progress over time in a way that makes sense',
        icon: '📊'
      },
      {
        id: '12-4',
        title: 'AI Coach',
        description: 'Get smart nutrition advice that is personalized to you, not just a generic recommendation',
        icon: '🤖'
      }
    ]
  }
];

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const flatListRef = useRef(null);
  const colorScheme = Appearance.getColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getDynamicStyles(isDark);
  const [visitedSteps, setVisitedSteps] = useState({});
  const [showSavedDataToast, setShowSavedDataToast] = useState(false);
  const savedDataToastOpacity = useRef(new Animated.Value(0)).current;
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const [savedDataExists, setSavedDataExists] = useState({});
  const [hasCalculatedGoals, setHasCalculatedGoals] = useState(false);

  // New state variables for user data collection
  const [userData, setUserData] = useState({
    unit: 'imperial',
    height: '',
    heightFeet: '',
    heightInches: '',
    weight: '',
    age: '',
    gender: '',
    activityLevel: '',
    goal: 'Maintain Weight',
    weightChangeRate: 0
  });

  // New state for calculated goals
  const [calculatedGoals, setCalculatedGoals] = useState(null);

  // Step 3 state variables
  const [loadingStep3, setLoadingStep3] = useState(true);
  const [step3Loaded, setStep3Loaded] = useState(false);
  const [showBlur, setShowBlur] = useState(false);
  const blurOpacity = useRef(new Animated.Value(0)).current;

  // Loading indicator opacity
  const loadingOpacity = useRef(new Animated.Value(0)).current;

  // Replay button state variables
  const [showReplayButton, setShowReplayButton] = useState(false);
  const replayButtonOpacity = useRef(new Animated.Value(0)).current;

  // New Animated Value for fading out the content
  const savedContentOpacity = useRef(new Animated.Value(1)).current;

  // Add previousRate to state
  const [previousRate, setPreviousRate] = useState(0);

  const macronutrientData = [
    { name: 'Calories', value: '450 kcal' },
    { name: 'Protein', value: '25g' },
    { name: 'Carbohydrates', value: '50g' },
    { name: 'Fat', value: '20g' },
    { name: 'Fiber', value: '5g' },
    { name: 'Sugar', value: '10g' },
  ];

  // Initialize Animated.Values for each feature
  const featureAnimValues = useRef(
    ONBOARDING_STEPS[0].features.map(() => new Animated.Value(0))
  ).current;

  // Animated value for the active dot (pill)
  const dotTranslateX = useRef(new Animated.Value(0)).current;

  const dotSize = 8;
  const dotSpacing = 16; // Increased spacing to prevent overlapping
  const activeDotWidth = 24;

  const progressWidth = useRef(new Animated.Value(0)).current;

  // Inside the OnboardingScreen component
  const [selectedDate, setSelectedDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() - 20)));

  const [showValidationMessage, setShowValidationMessage] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const validationOpacity = useRef(new Animated.Value(0)).current;

  // Add these new animated values in the OnboardingScreen component
  const goalCardAnimations = useRef([
    new Animated.Value(0), // calories
    new Animated.Value(0), // proteins
    new Animated.Value(0), // carbs
    new Animated.Value(0)  // fats
  ]).current;

  // Add this with the other animated values at the top of the component
  const affirmationOpacity = useRef(new Animated.Value(0)).current;

  // Add these new state variables at the top of the component with other states
  const [isCalculatingGoals, setIsCalculatingGoals] = useState(false);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const buttonContainerOpacity = useRef(new Animated.Value(1)).current;

  // Add these new animated values at the top with other animated values
  const circleProgress = useRef(new Animated.Value(0)).current;
  const loadingTextOpacity = useRef(new Animated.Value(1)).current;
  const loadingIconOpacity = useRef(new Animated.Value(1)).current;

  // Add this array of loading states
  const loadingStates = [
    { text: "Analyzing your profile", icon: "account-search" },
    { text: "Calculating your metabolism", icon: "calculator-variant" },
    { text: "Optimizing protein intake", icon: "food-steak" },
    { text: "Balancing your macros", icon: "chart-pie" },
    { text: "Finding your best path", icon: "compass" },
    { text: "Finalizing your plan", icon: "check-circle" }
  ];

  // Add state for current loading state
  const [currentLoadingState, setCurrentLoadingState] = useState(loadingStates[0]);

  // Add state for feature animations
  const [featureAnimations, setFeatureAnimations] = useState({});
  
  // Add new animated values for title and description
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const descriptionOpacity = useRef(new Animated.Value(0)).current;
  
  // Add this with the other animated values at the top of the component
  const loadingTextPulse = useRef(new Animated.Value(0.4)).current;
  
  // Effect to initialize feature animations for each step
  useEffect(() => {
    const animations = {};
    ONBOARDING_STEPS.forEach((step) => {
      if (step.features) {
        animations[step.id] = step.features.map(() => new Animated.Value(0));
      }
    });
    setFeatureAnimations(animations);
  }, []);

  // Effect to trigger animations when step changes
  useEffect(() => {
    const currentStep = ONBOARDING_STEPS[currentIndex];
    if (['1', '2', '3', '4'].includes(currentStep?.id) && featureAnimations[currentStep.id]) {
      Animated.stagger(100, 
        featureAnimations[currentStep.id].map(anim =>
          Animated.spring(anim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true
          })
        )
      ).start();
    }
  }, [currentIndex, featureAnimations]);

  // Function to save visited steps
  const saveVisitedStep = async (stepId) => {
    if (visitedSteps[stepId] === undefined) {
      const newVisitedSteps = {
        ...visitedSteps,
        [stepId]: 1
      };
      setVisitedSteps(newVisitedSteps);
      await AsyncStorage.setItem('@visited_steps', JSON.stringify(newVisitedSteps));
    } else {
      const newVisitedSteps = {
        ...visitedSteps,
        [stepId]: visitedSteps[stepId] + 1
      };
      setVisitedSteps(newVisitedSteps);
      await AsyncStorage.setItem('@visited_steps', JSON.stringify(newVisitedSteps));
    }
  };

  // Effect to check for saved data on mount
  useEffect(() => {
    checkForSavedData();
  }, []);

  // Function to check if saved data exists
  const checkForSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('@user_data');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        const exists = {};
        
        // Check each field that could have saved data
        exists.height = parsedData.height || (parsedData.heightFeet && parsedData.heightInches);
        exists.weight = !!parsedData.weight;
        exists.age = !!parsedData.age;
        exists.gender = !!parsedData.gender;
        exists.activityLevel = !!parsedData.activityLevel;
        exists.goal = !!parsedData.goal;
        
        setSavedDataExists(exists);
      }
    } catch (error) {
      console.error('Error checking saved data:', error);
    }
  };

  // Effect to handle step changes and toast visibility
  useEffect(() => {
    const currentStep = ONBOARDING_STEPS[currentIndex];
    if (!currentStep?.field) {
      setShowSavedDataToast(false);
      Animated.timing(savedDataToastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      return;
    }

    const handleStepChange = async () => {
      if (hasAutoFilled) {
        setShowSavedDataToast(false);
        return;
      }

      const field = currentStep.field;
      const hasData = savedDataExists[field];
      const isFieldEmpty = !userData[field] && 
        !(field === 'height' && (userData.heightFeet || userData.heightInches));

      if (hasData && isFieldEmpty) {
        setShowSavedDataToast(true);
        Animated.timing(savedDataToastOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        setShowSavedDataToast(false);
        Animated.timing(savedDataToastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    };

    handleStepChange();
  }, [currentIndex, hasAutoFilled, savedDataExists]);

  // Initialize userData with empty values - only run once
  useEffect(() => {
    setUserData({
      unit: 'imperial',
      height: '',
      heightFeet: '',
      heightInches: '',
      weight: '',
      age: '',
      gender: '',
      activityLevel: '',
      goal: 'Maintain Weight',
      weightChangeRate: 0
    });
  }, []);

  // Load saved data only once on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  useEffect(() => {
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
  }, [isDark]);

  useEffect(() => {
    if (currentIndex === 0 && !hasAnimated) {
      const animations = featureAnimValues.map((animValue) =>
        Animated.timing(animValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      );
      Animated.stagger(70, animations).start(() => setHasAnimated(true));
    }
  }, [currentIndex, hasAnimated]);

  useEffect(() => {
    const xPosition =
      currentIndex * (dotSize + dotSpacing) - (activeDotWidth - dotSize) / 2;
    Animated.timing(dotTranslateX, {
      toValue: xPosition,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentIndex, dotTranslateX]);

  useEffect(() => {
    Animated.timing(progressWidth, {
      toValue: (currentIndex + 1) / ONBOARDING_STEPS.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentIndex]);

  const navigateHome = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate('HomeTabs', { screen: 'Home' });
    navigation.reset({
      index: 0,
      routes: [{ name: 'HomeTabs' }],
    });
  };

  const showPaywall = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate('SignUp');
  };

  const showValidation = (message) => {
    setValidationMessage(message);
    setShowValidationMessage(true);

    // Animate saved data pill up if it's showing
    if (showSavedDataToast) {
      Animated.spring(savedDataToastOpacity, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }

    // Show validation message
    Animated.sequence([
      Animated.timing(validationOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();

    setTimeout(() => {
      Animated.timing(validationOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start(() => {
        setShowValidationMessage(false);
      });
    }, 2800);
  };

  const handleNext = async () => {
    if (!isCurrentStepValid()) {
      const currentStep = ONBOARDING_STEPS[currentIndex];
      let message = '';
      
      if (currentStep.field === 'height') {
        message = 'Please enter a valid height';
      } else if (currentStep.field === 'weight') {
        message = 'Please enter a valid weight';
      } else if (currentStep.field === 'age') {
        message = 'Please enter a valid age';
      } else if (currentStep.field === 'gender') {
        message = 'Please select your gender';
      } else if (currentStep.field === 'activityLevel') {
        message = 'Please select your activity level';
      } else if (currentStep.field === 'goal') {
        message = 'Please select your goal';
      }
      
      showValidation(message);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (currentIndex === 8) {
      try {
        await AsyncStorage.setItem('@user_goals', JSON.stringify(calculatedGoals));
      } catch (error) {
        console.error('Error saving goals:', error);
      }
    }

    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      showPaywall();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Find the previous valid step
      let prevIndex = currentIndex - 1;
      // If the previous step is a weight change step and we're maintaining weight,
      // skip it and go to the step before
      const prevStep = ONBOARDING_STEPS[prevIndex];
      if (prevStep?.showWeightChangeOptions && userData.goal === 'Maintain Weight') {
        prevIndex--;
      }
      setCurrentIndex(prevIndex);
      flatListRef.current?.scrollToIndex({
        index: prevIndex,
        animated: true,
      });
    }
  };

  const timers = useRef([]);

  // Adjusted useEffect for currentIndex === 2
  useEffect(() => {
    if (currentIndex === 2 && !step3Loaded) {
      setLoadingStep3(true);
      loadingOpacity.setValue(0);
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      const timer1 = setTimeout(() => {
        setLoadingStep3(false);
        setStep3Loaded(true);

        Animated.timing(loadingOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();

        const timer2 = setTimeout(() => {
          setShowBlur(true);
          Animated.timing(blurOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }).start(() => {
            // After blur animation completes, wait 1 second before showing the replay button
            const timer3 = setTimeout(() => {
              setShowReplayButton(true);

              // Animate the replay button opacity
              Animated.timing(replayButtonOpacity, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }).start();
            }, 1000);

            timers.current.push(timer3);
          });
        }, 1800);

        timers.current.push(timer2);
      }, 1200);

      timers.current.push(timer1);
    }

    return () => {
      // Clear timers when currentIndex changes or component unmounts
      if (currentIndex !== 2) {
        timers.current.forEach((timer) => clearTimeout(timer));
        timers.current = [];
      }
    };
  }, [currentIndex, step3Loaded, blurOpacity, replayButtonOpacity, loadingOpacity]);

  const renderFeature = ({ item, index }, showAnimation = false, animValue) => {
    const animatedStyle = showAnimation && animValue
      ? {
          opacity: animValue,
          transform: [
            {
              translateY: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
            {
              scale: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
        }
      : {};

    return (
      <Animated.View style={[styles.featureItem, animatedStyle]} key={item.id}>
        <View style={styles.featureIconContainer}>
          <Text style={styles.featureIcon}>{item.icon}</Text>
        </View>
        <View style={styles.featureTextContainer}>
          <Text style={styles.featureTitle}>{item.title}</Text>
          <Text style={styles.featureDescription}>{item.description}</Text>
        </View>
      </Animated.View>
    );
  };

  // handleReplayAnimation Function
  const handleReplayAnimation = () => {
    Animated.timing(savedContentOpacity, {
      toValue: 0,
      duration: 800,
      useNativeDriver: false,
    }).start(() => {
      // After animation completes
      setShowReplayButton(false);
      // Reset step 3 state variables
      setLoadingStep3(true);
      setStep3Loaded(false);
      setShowBlur(false);
      blurOpacity.setValue(0);
      savedContentOpacity.setValue(1); // Reset opacity
      replayButtonOpacity.setValue(0); // Reset replayButtonOpacity

      // Restart the loading animation
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      const timer1 = setTimeout(() => {
        setLoadingStep3(false);
        setStep3Loaded(true);

        Animated.timing(loadingOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();

        const timer2 = setTimeout(() => {
          setShowBlur(true);
          Animated.timing(blurOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }).start(() => {
            // After blur animation completes, wait 1 second before showing the replay button
            const timer3 = setTimeout(() => {
              setShowReplayButton(true);

              // Animate the replay button opacity
              Animated.timing(replayButtonOpacity, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }).start();
            }, 1000);

            timers.current.push(timer3);
          });
        }, 1500);

        timers.current.push(timer2);
      }, 600);

      timers.current.push(timer1);
    });
  };

  // Update the useEffect for goal calculation to run on any userData change
  useEffect(() => {
    // Only calculate if we have all the required data
    if (userData.weight && 
        ((userData.unit === 'imperial' && userData.heightFeet && userData.heightInches) || 
         (userData.unit === 'metric' && userData.height)) && 
        userData.age && 
        userData.gender && 
        userData.activityLevel) {
      const goals = calculateGoals(userData);
      setCalculatedGoals(goals);
    }
  }, [userData]); // Run whenever userData changes

  // Function to delete saved inputs (Debug Function)
const deleteSavedInputs = async () => {
  try {
    // Confirm the deletion with the user
    Alert.alert(
      'Debug Action',
      'Are you sure you want to delete all saved inputs?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('@user_data');
            setUserData({
              unit: 'imperial',
              height: '',
              heightFeet: '',
              heightInches: '',
              weight: '',
              age: '',
              gender: '',
              activityLevel: '',
              goal: 'Maintain Weight',
              weightChangeRate: 0,
              customRateConfirmed: false, // Reset custom rate confirmation
              targetWeight: '', // Reset target weight
            });
            Alert.alert('Success', 'All saved inputs have been deleted.');
          },
        },
      ],
      { cancelable: true }
    );
  } catch (error) {
    console.error('Error deleting saved inputs:', error);
    Alert.alert('Error', 'Failed to delete saved inputs.');
  }
};

const calculateGoals = (data) => {
  // For debug:
  console.log('DEBUG => calculateGoals called with:', data);

  let weightKg, heightCm;

  // Convert weight/height based on unit
  if (data.unit === 'imperial') {
    const parsedWeight = parseFloat(data.weight);
    const parsedFeet   = parseFloat(data.heightFeet);
    const parsedInches = parseFloat(data.heightInches);

    // Defend against NaN
    if (
      isNaN(parsedWeight) || parsedWeight <= 0 ||
      isNaN(parsedFeet)   || parsedFeet < 0 ||
      isNaN(parsedInches) || parsedInches < 0
    ) {
      console.warn('calculateGoals => Invalid imperial weight/height data:', {
        weight: data.weight, heightFeet: data.heightFeet, heightInches: data.heightInches
      });
      return null;
    }

    weightKg = parsedWeight * 0.453592;
    heightCm = (parsedFeet * 12 + parsedInches) * 2.54;
  } else {
    // Metric
    const parsedWeight = parseFloat(data.weight);
    const parsedHeight = parseFloat(data.height);

    if (
      isNaN(parsedWeight) || parsedWeight <= 0 ||
      isNaN(parsedHeight) || parsedHeight <= 0
    ) {
      console.warn('calculateGoals => Invalid metric weight/height data:', {
        weight: data.weight, height: data.height
      });
      return null;
    }

    weightKg = parsedWeight;
    heightCm = parsedHeight;
  }

  // Age & Gender checks
  const age = parseInt(data.age, 10);
  if (isNaN(age) || age <= 0 || age >= 120) {
    console.warn('calculateGoals => Invalid age:', data.age);
    return null;
  }
  const gender = data.gender;
  if (!gender) {
    console.warn('calculateGoals => No gender set');
    return null;
  }

  // --- Calculate BMR (Mifflin-St Jeor) ---
  let BMR;
  if (gender === 'Male') {
    BMR = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
  } else {
    BMR = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
  }

  // Activity factor
  let activityFactor;
  switch (data.activityLevel) {
    case 'Sedentary':
      activityFactor = 1.2;
      break;
    case 'Moderately Active':
      activityFactor = 1.55;
      break;
    case 'Very Active':
      activityFactor = 1.725;
      break;
    default:
      activityFactor = 1.2;
  }

  let TDEE = BMR * activityFactor;

  // If user wants to lose/gain weight at a certain weekly rate
  // (and that rate is > 0)
  if (data.goal !== 'Maintain Weight' && data.weightChangeRate > 0) {
    const adjustmentFactor = Math.min(1.2, Math.max(0.8, weightKg / 70));
    const baseAdjustment   = (data.weightChangeRate * 3500) / 7;
    const calorieAdjustment = baseAdjustment * adjustmentFactor;

    if (data.goal === 'Lose Weight') {
      TDEE -= calorieAdjustment;
    } else if (data.goal === 'Gain Weight') {
      TDEE += calorieAdjustment;
    }
  }

  // Enforce NIH recommended minimum
  const minCalories = (gender === 'Male') ? 1500 : 1200;
  TDEE = Math.max(TDEE, minCalories);

  // Macro splits
  let proteinPerKg, carbsPercent, fatsPercent;
  if (data.goal === 'Lose Weight') {
    proteinPerKg  = 2.2;  // higher protein
    carbsPercent  = 0.35;
    fatsPercent   = 0.30;
  } else if (data.goal === 'Gain Weight') {
    proteinPerKg  = 1.8;
    carbsPercent  = 0.45;
    fatsPercent   = 0.25;
  } else {
    // Maintain
    proteinPerKg  = 1.6;
    carbsPercent  = 0.40;
    fatsPercent   = 0.30;
  }

  const calories       = Math.round(TDEE);
  const proteins       = Math.round(weightKg * proteinPerKg);          // grams
  const fats           = Math.round((calories * fatsPercent) / 9);     // grams
  const carbohydrates  = Math.round((calories - proteins * 4 - fats * 9) / 4);

  // Final debug logging
  console.log('calculateGoals => BMR:', BMR, 
    'calories:', calories, 
    'protein(g):', proteins, 
    'carbs(g):', carbohydrates, 
    'fats(g):', fats
  );

  // Return the final goals
  return {
    calories,
    proteins,
    carbohydrates,
    fats
  };
};

  // Function to validate current step
  const isCurrentStepValid = () => {
    const currentStep = ONBOARDING_STEPS[currentIndex];
    const data = userData;
    
    if (!currentStep.field && !currentStep.showWeightChangeOptions) return true;

    if (currentStep.showWeightChangeOptions) {
      if (data.goal === 'Maintain Weight') return true;
      return data.weightChangeRate > 0;
    }

    if (currentStep.field === 'height') {
      if (data.unit === 'imperial') {
        const feet = parseFloat(data.heightFeet);
        const inches = parseFloat(data.heightInches);
        return !isNaN(feet) && !isNaN(inches) && feet > 0 && inches >= 0 && inches < 12;
      } else {
        const height = parseFloat(data.height);
        return !isNaN(height) && height > 0;
      }
    }

    if (currentStep.field === 'weight') {
      const weight = parseFloat(data.weight);
      return !isNaN(weight) && weight > 0;
    }

    if (currentStep.field === 'age') {
      const age = parseInt(data.age);
      return !isNaN(age) && age > 0 && age < 120;
    }

    if (currentStep.field === 'gender') {
      return !!data.gender;
    }

    if (currentStep.field === 'activityLevel') {
      return !!data.activityLevel;
    }

    if (currentStep.field === 'goal') {
      return !!data.goal;
    }

    return true;
  };

  // Update the useEffect to handle all step skipping logic
  useEffect(() => {
    const currentStep = ONBOARDING_STEPS[currentIndex];
    if (userData.goal === 'Maintain Weight') {
      if (currentStep?.showWeightChangeOptions || currentStep?.field === 'targetWeight') {
        // Use a timeout to avoid immediate state updates
        const timer = setTimeout(() => {
          // Find the index of the next valid step
          const nextStepIndex = ONBOARDING_STEPS.findIndex((step, idx) => 
            idx > currentIndex && 
            !step.showWeightChangeOptions && 
            step.field !== 'targetWeight'
          );
          if (nextStepIndex !== -1) {
            setCurrentIndex(nextStepIndex);
            flatListRef.current?.scrollToIndex({
              index: nextStepIndex,
              animated: true,
            });
          }
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [currentIndex, userData.goal]);

  // Modify the animateGoalCards function to chain the affirmation animation
  const animateGoalCards = () => {
    Animated.stagger(150, goalCardAnimations.map(anim => 
      Animated.spring(anim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      })
    )).start(() => {
      // After all goal cards are animated, fade in the affirmation
      Animated.timing(affirmationOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    });
  };

  // Add this function to generate random duration within a range
  const getRandomDuration = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // Update the animateLoading function
  const animateLoading = () => {
    let currentIndex = 0;

    // Create a pulsing animation for the loading text
    const pulseAnimation = Animated.sequence([
      Animated.timing(loadingTextPulse, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(loadingTextPulse, {
        toValue: 0.4,
        duration: 800,
        useNativeDriver: true,
      })
    ]);

    // Loop the pulse animation
    Animated.loop(pulseAnimation).start();

    // Function to animate state changes
    const animateState = () => {
      // Only fade the icon, not the container
      Animated.timing(loadingIconOpacity, {
        toValue: 0,
        duration: 400, // Increased duration for smoother fade
        easing: Easing.inOut(Easing.ease), // Added easing for smooth transition
        useNativeDriver: true,
      }).start(() => {
        currentIndex = (currentIndex + 1) % loadingStates.length;
        setCurrentLoadingState(loadingStates[currentIndex]);

        Animated.timing(loadingIconOpacity, {
          toValue: 1,
          duration: 400, // Increased duration for smoother fade
          easing: Easing.inOut(Easing.ease), // Added easing for smooth transition
          useNativeDriver: true,
        }).start();
      });
    };

    // Create a progress animation that pauses at macros balancing
    const totalDuration = 9000; // Increased from 8000
    const pauseAt = 3 / loadingStates.length;
    const pauseDuration = getRandomDuration(2200, 2800); // Increased pause duration

    // Calculate timing segments with more variance
    const firstSegmentDuration = totalDuration * pauseAt;
    const secondSegmentDuration = totalDuration * (1 - pauseAt);
    
    const stepsBeforePause = 3;
    const stepsAfterPause = loadingStates.length - stepsBeforePause;

    // More variable step durations
    const baseStepDurationBefore = firstSegmentDuration / stepsBeforePause;
    const baseStepDurationAfter = secondSegmentDuration / stepsAfterPause;

    // Set initial state
    setCurrentLoadingState(loadingStates[0]);

    // Animate progress bar with natural easing
    Animated.sequence([
      Animated.timing(circleProgress, {
        toValue: pauseAt,
        duration: firstSegmentDuration,
        useNativeDriver: false,
        easing: Easing.inOut(Easing.ease), // Add natural easing
      }),
      Animated.delay(pauseDuration),
      Animated.timing(circleProgress, {
        toValue: 1,
        duration: secondSegmentDuration,
        useNativeDriver: false,
        easing: Easing.inOut(Easing.ease), // Add natural easing
      })
    ]).start();

    // Schedule states with more natural timing
    let timeoutIds = [];
    let accumulatedTime = getRandomDuration(800, 1200); // Initial delay

    // Schedule first 3 states (before pause) with more variance
    for (let i = 0; i < stepsBeforePause - 1; i++) {
      const variance = getRandomDuration(-300, 300);
      const duration = baseStepDurationBefore + variance;
      
      // Add small random delays between state changes
      const stateChangeDelay = getRandomDuration(100, 300);
      
      timeoutIds.push(setTimeout(() => {
        animateState();
      }, accumulatedTime + stateChangeDelay));
      
      accumulatedTime += duration;
    }

    // Add pause with slight variance
    accumulatedTime += pauseDuration + getRandomDuration(-200, 200);

    // Schedule remaining states with increasing durations
    for (let i = stepsBeforePause - 1; i < loadingStates.length - 2; i++) {
      // Gradually increase duration for later steps
      const progressFactor = (i - stepsBeforePause + 1) / stepsAfterPause;
      const variance = getRandomDuration(-200, 400);
      const duration = baseStepDurationAfter * (1 + progressFactor * 0.3) + variance;
      
      // Add variable delays between states
      const stateChangeDelay = getRandomDuration(150, 400);
      
      timeoutIds.push(setTimeout(() => {
        animateState();
      }, accumulatedTime + stateChangeDelay));
      
      accumulatedTime += duration;
    }

    // Final state change
    timeoutIds.push(setTimeout(() => {
      animateState();
    }, accumulatedTime + getRandomDuration(200, 400)));

    return () => timeoutIds.forEach(id => clearTimeout(id));
  };

  // Update the useEffect for calculated goals
  useEffect(() => {
    if (ONBOARDING_STEPS[currentIndex]?.showCalculatedGoals && !hasCalculatedGoals) {
      setIsCalculatingGoals(true);
      contentOpacity.setValue(0);
      loadingOpacity.setValue(1);
      circleProgress.setValue(0);
      titleOpacity.setValue(0);
      descriptionOpacity.setValue(0);
      
      Animated.timing(buttonContainerOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const cleanup = animateLoading();

      // Wait for total animation duration plus a small buffer
      const totalWaitTime = 8000 + getRandomDuration(1800, 2200) + 1000;

      setTimeout(() => {
        // Animate all elements simultaneously
        Animated.parallel([
          Animated.timing(loadingOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(descriptionOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          })
        ]).start(() => {
          setIsCalculatingGoals(false);
          setHasCalculatedGoals(true);
          animateGoalCards();
          Animated.timing(buttonContainerOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        });
      }, totalWaitTime);

      return cleanup;
    } else if (ONBOARDING_STEPS[currentIndex]?.showCalculatedGoals && hasCalculatedGoals) {
      // If goals were already calculated, show content immediately
      contentOpacity.setValue(1);
      titleOpacity.setValue(1);
      descriptionOpacity.setValue(1);
      buttonContainerOpacity.setValue(1);
      setIsCalculatingGoals(false);
      animateGoalCards();
    }
  }, [currentIndex]);

  const renderItem = ({ item, index }) => {
    if ((item.field === 'targetWeight' || item.showWeightChangeOptions) && userData.goal === 'Maintain Weight') {
      return null;
    }

    // Special handling for first four informational steps
    if (['1', '2', '3', '4'].includes(item.id)) {
      return (
        <View style={styles.slide}>
          {item.id === '4' ? (
            <TouchableOpacity onPress={deleteSavedInputs}>
              <AnimatedTextOnboarding
                text={item.title}
                colorScheme={isDark ? 'dark' : 'light'}
                style={styles.title}
              />
            </TouchableOpacity>
          ) : (
            <AnimatedTextOnboarding
              text={item.title}
              colorScheme={isDark ? 'dark' : 'light'}
              style={styles.title}
            />
          )}
          <AnimatedTextOnboarding
            text={item.description}
            colorScheme={isDark ? 'dark' : 'light'}
            style={styles.description}
          />

          {item.features && (
            <View style={styles.featuresContainer}>
              <ScrollView
                nestedScrollEnabled={true}
                contentContainerStyle={styles.scrollViewContent}
                style={styles.scrollView}
                showsVerticalScrollIndicator={true}
              >
                {item.features.map((feature, idx) =>
                  renderFeature(
                    { item: feature, index: idx },
                    true,
                    featureAnimations[item.id]?.[idx]
                  )
                )}
              </ScrollView>
            </View>
          )}

          {item.bottomDescription && (
            <Text style={styles.bottomDescription}>{item.bottomDescription}</Text>
          )}
        </View>
      );
    }

    if (item.showPaywall) {
      return (
        <View style={styles.slide}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
          <FoodCarousel isDark={isDark} />
          <Text style={[styles.bottomDescription, { marginTop: 20 }]}>
            MacroScan is the only AI app with 93% accuracy for identifying foods.
          </Text>
        </View>
      );
    }

    if (item.field === 'targetWeight') {
      return (
        <View style={styles.slide}>
          {item.icon && (
            <View style={styles.iconHeaderContainer}>
              {item.iconType === 'material' ? (
                <MaterialCommunityIcons name={item.icon} size={40} color={isDark ? '#FFF' : '#000'} />
              ) : (
                <Ionicons name={item.icon} size={40} color={isDark ? '#FFF' : '#000'} />
              )}
            </View>
          )}
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>

          {item.showUnitToggle && (
            <View style={styles.unitToggleContainer}>
              {item.unitOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateUserData({ unit: option.value });
                  }}
                  style={[
                    styles.unitToggle,
                    userData.unit === option.value && styles.unitToggleSelected
                  ]}
                >
                  <Text style={[
                    styles.unitToggleText,
                    userData.unit === option.value && styles.unitToggleTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TextInput
            placeholder={userData.unit === 'imperial' ? 'Target weight in pounds' : 'Target weight in kilograms'}
            placeholderTextColor="#999"
            keyboardType="numeric"
            style={styles.input}
            value={userData.targetWeight}
            onChangeText={(value) => updateUserData({ targetWeight: value })}
          />

          {userData.weight && userData.targetWeight && (
            <Text style={styles.weightChangeText}>
              {calculateWeightChangeText(userData.weight, userData.targetWeight, userData.unit)}
            </Text>
          )}
        </View>
      );
    }

    if (item.showWeightChangeOptions) {
      // If user wants to maintain weight, skip
      if (userData.goal === 'Maintain Weight') {
        return null;
      }

      const isLosing = userData.goal === 'Lose Weight';
      const isVeryActive = userData.activityLevel === 'Very Active';
      const isModeratelyActive = userData.activityLevel === 'Moderately Active';
      const isSedentary = userData.activityLevel === 'Sedentary';

      // Parse user weight, height, age
      let weightKg, BMR, TDEE;
      try {
        // Convert to metric if needed
        if (userData.unit === 'imperial') {
          const w = parseFloat(userData.weight);
          const ft = parseFloat(userData.heightFeet);
          const inch = parseFloat(userData.heightInches);
          if (isNaN(w) || w <= 0 || isNaN(ft) || ft < 0 || isNaN(inch) || inch < 0) {
            console.warn('showWeightChangeOptions => invalid imperial data. userData:', userData);
            return (
              <View style={styles.slide}>
                <Text style={styles.title}>Invalid Data</Text>
                <Text style={styles.description}>Please enter valid weight/height first.</Text>
              </View>
            );
          }
          weightKg = w * 0.453592;
        } else {
          const w = parseFloat(userData.weight);
          if (isNaN(w) || w <= 0) {
            console.warn('showWeightChangeOptions => invalid metric data. userData:', userData);
            return (
              <View style={styles.slide}>
                <Text style={styles.title}>Invalid Data</Text>
                <Text style={styles.description}>Please enter valid weight/height first.</Text>
              </View>
            );
          }
          weightKg = w;
        }

        const age = parseInt(userData.age, 10);
        if (isNaN(age) || age <= 0 || age >= 120) {
          console.warn('showWeightChangeOptions => invalid age. userData:', userData);
          return (
            <View style={styles.slide}>
              <Text style={styles.title}>Invalid Age</Text>
              <Text style={styles.description}>Please enter a valid age first.</Text>
            </View>
          );
        }
        if (!userData.gender) {
          console.warn('showWeightChangeOptions => no gender selected. userData:', userData);
          return (
            <View style={styles.slide}>
              <Text style={styles.title}>Invalid Gender</Text>
              <Text style={styles.description}>Please select your gender first.</Text>
            </View>
          );
        }

        if (userData.gender === 'Male') {
          BMR = (10 * weightKg) + (6.25 * 170) - (5 * age) + 5;
        } else {
          BMR = (10 * weightKg) + (6.25 * 160) - (5 * age) - 161;
        }

        let activityFactor = isSedentary ? 1.2 : (isModeratelyActive ? 1.55 : 1.75);
        TDEE = BMR * activityFactor;
      } catch (e) {
        console.warn('showWeightChangeOptions => error computing TDEE:', e);
        return null;
      }

      // Max safe deficit
      const maxSafeDeficit = Math.min(TDEE * 0.25, 1000);
      const maxWeeklyLoss = (maxSafeDeficit * 7) / 3500;

      // Build options
      const options = [];
      if (isLosing) {
        options.push(
          { rate: 0.5, label: '0.5 lb per week', description: 'Gentle and very sustainable pace' },
          { rate: 1, label: '1 lb per week', description: 'Good balance of results & sustainability' },
        );
        if (maxWeeklyLoss >= 1.5) {
          options.push({ rate: 1.5, label: '1.5 lb per week', description: 'Challenging, requires dedication' });
        }
      } else {
        options.push(
          { rate: 0.25, label: '0.25 lb per week', description: 'Focus on lean muscle gain' },
          { rate: 0.5, label: '0.5 lb per week', description: 'Balance muscle gain & minimal fat' },
          { rate: 0.75, label: '0.75 lb per week', description: 'Faster gains but may include more fat' }
        );
      }

      options.push({
        rate: 'custom',
        label: 'Custom rate',
        description: 'Set your own weekly target'
      });

      let weightDiff = NaN;
      if (userData.targetWeight && userData.weight) {
        const cw = parseFloat(userData.weight);
        const tw = parseFloat(userData.targetWeight);
        if (!isNaN(cw) && cw > 0 && !isNaN(tw) && tw > 0) {
          weightDiff = Math.abs(tw - cw);
        }
      }

      return (
        <View style={styles.slide}>
          {item.icon && (
            <View style={styles.iconHeaderContainer}>
              {item.iconType === 'material' ? (
                <MaterialCommunityIcons
                  name={item.icon}
                  size={40}
                  color={isDark ? '#FFF' : '#000'}
                />
              ) : (
                <Ionicons
                  name={item.icon}
                  size={40}
                  color={isDark ? '#FFF' : '#000'}
                />
              )}
            </View>
          )}
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>

          <View style={styles.activityOptionsContainer}>
            {options.map((option) => {
              const isSelected = (option.rate === 'custom')
                ? (userData.weightChangeRate !== 0 && userData.customRateConfirmed)
                : (userData.weightChangeRate === option.rate);

              let timeToGoal = null;
              if (!isNaN(weightDiff) && weightDiff > 0 && option.rate !== 'custom') {
                timeToGoal = Math.round(weightDiff / option.rate);
              }

              return (
                <TouchableOpacity
                  key={String(option.rate)}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (option.rate === 'custom') {
                      Alert.prompt(
                        'Enter custom rate',
                        `Enter your desired ${userData.unit === 'imperial' ? 'lbs' : 'kg'} per week`,
                        [
                          {
                            text: 'Cancel',
                            onPress: () => {
                              if (!userData.customRateConfirmed) {
                                updateUserData({
                                  weightChangeRate: previousRate,
                                  customRateConfirmed: false
                                });
                              }
                            },
                            style: 'cancel',
                          },
                          {
                            text: 'OK',
                            onPress: (value) => {
                              const rate = parseFloat(value);
                              if (!isNaN(rate) && rate > 0) {
                                const maxRate = isLosing ? maxWeeklyLoss : 1;
                                if (rate > maxRate) {
                                  Alert.alert(
                                    'Warning',
                                    `${rate} ${userData.unit === 'imperial' ? 'lbs' : 'kg'} per week might be too aggressive. Consider a slower rate.\n\nMax recommended: ${maxRate.toFixed(2)} per week.`,
                                    [
                                      {
                                        text: 'Cancel',
                                        onPress: () => {
                                          if (!userData.customRateConfirmed) {
                                            updateUserData({
                                              weightChangeRate: previousRate,
                                              customRateConfirmed: false
                                            });
                                          }
                                        },
                                        style: 'cancel'
                                      },
                                      {
                                        text: 'Use Anyway',
                                        onPress: () => {
                                          updateUserData({
                                            weightChangeRate: rate,
                                            customRateConfirmed: true
                                          });
                                        }
                                      }
                                    ]
                                  );
                                } else {
                                  updateUserData({
                                    weightChangeRate: rate,
                                    customRateConfirmed: true
                                  });
                                }
                              }
                            },
                          },
                        ],
                        'plain-text',
                        '',
                        'decimal-pad'
                      );
                    } else {
                      updateUserData({
                        weightChangeRate: option.rate,
                        customRateConfirmed: false
                      });
                    }
                  }}
                  style={[
                    styles.activityOptionLarge,
                    isSelected && styles.activityOptionLargeSelected
                  ]}
                >
                  <View style={styles.optionHeader}>
                    <Text
                      style={[
                        styles.activityOptionText,
                        isSelected && styles.activityOptionTextSelected
                      ]}
                    >
                      {option.label}
                    </Text>
                    {timeToGoal && (
                      <View
                        style={[
                          styles.timeEstimate,
                          isSelected && styles.timeEstimateSelected
                        ]}
                      >
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={
                            isSelected
                              ? '#FFF'
                              : isDark
                                ? '#CCC'
                                : '#666'
                          }
                        />
                        <Text
                          style={[
                            styles.timeEstimateText,
                            isSelected && styles.timeEstimateTextSelected
                          ]}
                        >
                          ~{timeToGoal}w
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.activityOptionDescription,
                      isSelected && styles.activityOptionDescriptionSelected
                    ]}
                  >
                    {option.rate === 'custom' &&
                      userData.weightChangeRate &&
                      userData.customRateConfirmed
                      ? `${userData.weightChangeRate} ${userData.unit === 'imperial' ? 'lbs' : 'kg'} per week`
                      : option.description}
                  </Text>

                  {option.rate === 'custom' &&
                    isSelected &&
                    !isNaN(weightDiff) &&
                    weightDiff > 0 && (
                      <View
                        style={[
                          styles.timeEstimate,
                          isSelected && styles.timeEstimateSelected
                        ]}
                      >
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={
                            isSelected
                              ? '#FFF'
                              : isDark
                                ? '#CCC'
                                : '#666'
                          }
                        />
                        <Text
                          style={[
                            styles.timeEstimateText,
                            isSelected && styles.timeEstimateTextSelected
                          ]}
                        >
                          ~{Math.round(weightDiff / userData.weightChangeRate)}w
                        </Text>
                      </View>
                    )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    if (item.field) {
      return (
        <View style={styles.slide}>
          {item.icon && (
            <View style={styles.iconHeaderContainer}>
              {item.iconType === 'material' ? (
                <MaterialCommunityIcons name={item.icon} size={40} color={isDark ? '#FFF' : '#000'} />
              ) : (
                <Ionicons name={item.icon} size={40} color={isDark ? '#FFF' : '#000'} />
              )}
            </View>
          )}
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>

          {item.showUnitToggle && (
            <View style={styles.unitToggleContainer}>
              {item.unitOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateUserData({
                      unit: option.value,
                      ...(item.field === 'height' && option.value === 'metric' ? { heightFeet: '', heightInches: '' } : {}),
                      ...(item.field === 'height' && option.value === 'imperial' ? { height: '' } : {})
                    });
                  }}
                  style={[
                    styles.unitToggle,
                    userData.unit === option.value && styles.unitToggleSelected
                  ]}
                >
                  <Text style={[
                    styles.unitToggleText,
                    userData.unit === option.value && styles.unitToggleTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {item.field === 'height' && userData.unit === 'imperial' ? (
            <View style={styles.inputRow}>
              <TextInput
                placeholder="Feet"
                placeholderTextColor="#999"
                keyboardType="numeric"
                style={styles.inputSmall}
                value={userData.heightFeet}
                onChangeText={(value) => updateUserData({ heightFeet: value })}
              />
              <TextInput
                placeholder="Inches"
                placeholderTextColor="#999"
                keyboardType="numeric"
                style={styles.inputSmall}
                value={userData.heightInches}
                onChangeText={(value) => updateUserData({ heightInches: value })}
              />
            </View>
          ) : item.field === 'height' ? (
            <TextInput
              placeholder="Centimeters"
              placeholderTextColor="#999"
              keyboardType="numeric"
              style={styles.input}
              value={userData.height}
              onChangeText={(value) => updateUserData({ height: value })}
            />
          ) : item.field === 'weight' ? (
            <TextInput
              placeholder={userData.unit === 'imperial' ? 'Pounds' : 'Kilograms'}
              placeholderTextColor="#999"
              keyboardType="numeric"
              style={styles.input}
              value={userData.weight}
              onChangeText={(value) => updateUserData({ weight: value })}
            />
          ) : item.field === 'age' ? (
            <TextInput
              placeholder="Enter your age"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              style={styles.input}
              value={userData.age}
              onChangeText={(value) => {
                const age = parseInt(value);
                if (!isNaN(age) && age >= 0 && age <= 120) {
                  updateUserData({ age: value });
                }
              }}
              maxLength={3}
            />
          ) : null}

          {item.options && !item.options[0]?.name && (
            <View style={styles.optionsContainer}>
              {item.options.map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateUserData({ [item.field]: option });
                  }}
                  style={[
                    styles.option,
                    userData[item.field] === option && styles.optionSelected
                  ]}
                >
                  <Text style={[
                    styles.optionText,
                    userData[item.field] === option && styles.optionTextSelected
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {item.options && item.options[0]?.name && (
            <View style={styles.activityOptionsContainer}>
              {item.options.map((option) => {
                const isSelected = userData[item.field] === option.name;
                return (
                  <TouchableOpacity
                    key={option.name}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateUserData({ [item.field]: option.name });
                    }}
                    style={[
                      styles.activityOptionLarge,
                      isSelected && styles.activityOptionLargeSelected
                    ]}
                  >
                    <Text style={[
                      styles.activityOptionText,
                      isSelected && styles.activityOptionTextSelected
                    ]}>
                      {option.name}
                    </Text>
                    <Text style={[
                      styles.activityOptionDescription,
                      isSelected && styles.activityOptionDescriptionSelected
                    ]}>
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {(showSavedDataToast || savedDataToastOpacity._value > 0) && (
            <Animated.View style={[
              styles.savedDataToast,
              {
                opacity: savedDataToastOpacity,
                transform: [
                  {
                    translateY: validationOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -50]
                    })
                  }
                ]
              }
            ]}>
              <TouchableOpacity style={styles.savedDataToastButton} onPress={useSavedData}>
                <Text style={styles.savedDataToastText}>Use previously saved data?</Text>
                <Ionicons name="chevron-forward" size={20} color={isDark ? '#FFF' : '#000'} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      );
    }

    if (item.showCalculatedGoals && calculatedGoals) {
      const goalData = [
        { 
          value: calculatedGoals.calories,
          label: 'Calories',
          unit: 'kcal',
          icon: 'fire',
          color: '#FF6B6B'
        },
        { 
          value: calculatedGoals.proteins,
          label: 'Proteins',
          unit: 'g',
          icon: 'egg',
          color: '#4ECDC4'
        },
        { 
          value: calculatedGoals.carbohydrates,
          label: 'Carbs',
          unit: 'g',
          icon: 'bread-slice',
          color: '#FFD93D'
        },
        { 
          value: calculatedGoals.fats,
          label: 'Fats',
          unit: 'g',
          icon: 'oil',
          color: '#95A5A6'
        }
      ];

      // Add these debug logs
      // console.log('Debug - Calculated Goals:', calculatedGoals);
      // console.log('Debug - Gender:', userData.gender);
      // console.log('Debug - Calories:', calculatedGoals.calories);
      // console.log('Debug - Min Calories:', userData.gender === 'Male' ? 1500 : 1200);
      // console.log('Debug - Condition:', !(calculatedGoals.calories === (userData.gender === 'Male' ? 1500 : 1200)));

      return (
        <View style={styles.slide}>
          <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>
            {item.title}
          </Animated.Text>
          <Animated.Text style={[styles.description, { opacity: descriptionOpacity }]}>
            {item.description}
          </Animated.Text>
          
          {/* Loading Animation */}
          <Animated.View style={[styles.loadingContainer, { opacity: loadingOpacity }]}>
            <View style={styles.loadingIconContainer}>
              <Animated.View style={{ opacity: loadingIconOpacity }}>
                <MaterialCommunityIcons
                  name={currentLoadingState.icon}
                  size={45}
                  color={isDark ? '#FFF' : '#000'}
                />
              </Animated.View>
            </View>
            
            <Animated.Text style={[styles.loadingText, { opacity: loadingTextPulse }]}>
              {currentLoadingState.text}
            </Animated.Text>

            <View style={styles.loadingProgressContainer}>
              <Animated.View style={styles.loadingProgressBackground}>
                <Animated.View 
                  style={[
                    styles.loadingProgressBar,
                    {
                      width: circleProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%']
                      })
                    }
                  ]} 
                />
              </Animated.View>
              <Text style={styles.loadingStepCount}>
                {`Step ${loadingStates.findIndex(state => state.text === currentLoadingState.text) + 1} of ${loadingStates.length}`}
              </Text>
            </View>
          </Animated.View>

          {/* Goals Content */}
          <Animated.View style={[styles.goalsContent, { opacity: contentOpacity }]}>
            <View style={styles.goalsContainer}>
              {goalData.map((goal, index) => (
                <Animated.View 
                  key={goal.label}
                  style={[
                    styles.goalCard,
                    {
                      transform: [
                        { scale: goalCardAnimations[index] },
                        {
                          translateY: goalCardAnimations[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [50, 0]
                          })
                        }
                      ],
                      opacity: goalCardAnimations[index]
                    }
                  ]}
                >
                  <View style={[styles.goalCardIcon, { backgroundColor: goal.color + '15' }]}>
                    <MaterialCommunityIcons 
                      name={goal.icon} 
                      size={26} 
                      color={goal.color} 
                    />
                  </View>
                  <Text style={styles.goalValue}>
                    {goal.value}{goal.unit}
                  </Text>
                  <Text style={styles.goalLabel}>{goal.label}</Text>
                </Animated.View>
              ))}
            </View>
            
            {calculatedGoals.calories !== (userData.gender === 'Male' ? 1500 : 1200) && (
              <Animated.View style={[
                styles.affirmationContainer,
                { opacity: affirmationOpacity }
              ]}>
                <MaterialCommunityIcons 
                  name="check-circle-outline" 
                  size={20} 
                  color={isDark ? '#4ECDC4' : '#2ecc71'} 
                />
                <Text style={styles.affirmationText}>
                  These goals are reasonable for you
                </Text>
              </Animated.View>
            )}

            {calculatedGoals.calories === (userData.gender === 'Male' ? 1500 : 1200) && (
              <View style={styles.disclaimerContainer}>
                <MaterialCommunityIcons 
                  name="alert-circle-outline" 
                  size={20} 
                  color={isDark ? '#FF6961' : '#D32F2F'} 
                />
                <Text style={styles.disclaimerText}>
                  Your selected weight loss rate sets calories at the minimum safe level. Consider choosing a more moderate, sustainable rate to protect your health.
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      );
    }

    // Default case for welcome and scanning steps
    return (
      <View style={styles.slide}>
        {item.id === '4' ? (
          <TouchableOpacity onPress={deleteSavedInputs}>
            <Text style={styles.title}>{item.title}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.title}>{item.title}</Text>
        )}
        <Text style={styles.description}>{item.description}</Text>

        {item.features && (
          <View style={styles.featuresContainer}>
            <ScrollView
              nestedScrollEnabled={true}
              contentContainerStyle={styles.scrollViewContent}
              style={styles.scrollView}
              showsVerticalScrollIndicator={true}
            >
              {item.features.map((feature, idx) =>
                renderFeature(
                  { item: feature, index: idx },
                  currentIndex === 0 && index === 0,
                  currentIndex === 0 && index === 0 ? featureAnimValues[idx] : null
                )
              )}
            </ScrollView>
          </View>
        )}

        {item.bottomDescription && (
          <Text style={styles.bottomDescription}>{item.bottomDescription}</Text>
        )}
      </View>
    );
  };

  const handleValidationAndNext = () => {
    if (!isCurrentStepValid()) {
      const currentStep = ONBOARDING_STEPS[currentIndex];
      let message = '';
      
      if (currentStep.field === 'height') {
        message = 'Please enter a valid height to continue';
      } else if (currentStep.field === 'weight') {
        message = 'Please enter a valid weight to continue';
      } else if (currentStep.field === 'age') {
        message = 'Please enter a valid age to continue';
      } else if (currentStep.field === 'gender') {
        message = 'Please select your gender to continue';
      } else if (currentStep.field === 'activityLevel') {
        message = 'Please select your activity level to continue';
      } else if (currentStep.field === 'goal') {
        message = 'Please select your goal to continue';
      }
      
      showValidation(message);
      return;
    }
    handleNext();
  };

  // Function to update and save user data
  const updateUserData = (newData) => {
    if (newData.weightChangeRate !== undefined) {
      setPreviousRate(userData.weightChangeRate);
    }
    const updatedData = { ...userData, ...newData };
    setUserData(updatedData);
    saveData(updatedData);
  };

  // Function to load saved data
  const loadSavedData = async () => {
    try {
      const savedVisits = await AsyncStorage.getItem('@visited_steps');
      if (savedVisits) {
        setVisitedSteps(JSON.parse(savedVisits));
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  // Function to save data
  const saveData = async (newData) => {
    try {
      await AsyncStorage.setItem('@user_data', JSON.stringify(newData));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  // Function to use saved data for current step
  const useSavedData = async () => {
    try {
      // First trigger success haptic
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const savedData = await AsyncStorage.getItem('@user_data');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setUserData(parsedData);
        setHasAutoFilled(true);
      }
      
      // Just start the fade animation
      Animated.timing(savedDataToastOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // Set a timeout to hide the toast after animation completes
      setTimeout(() => {
        setShowSavedDataToast(false);
      }, 400);
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  // Add helper function for weight change text
  const calculateWeightChangeText = (currentWeight, targetWeight, unit) => {
    const current = parseFloat(currentWeight);
    const target = parseFloat(targetWeight);
    if (isNaN(current) || isNaN(target)) return '';

    const diff = Math.abs(target - current);
    const direction = target > current ? 'gain' : 'lose';
    
    return `You want to ${direction} ${diff.toFixed(1)} ${unit === 'imperial' ? 'lbs' : 'kg'}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_STEPS}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        scrollEnabled={!isCalculatingGoals}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          // If trying to scroll forward and validation fails, scroll back
          if (newIndex > currentIndex && !isCurrentStepValid()) {
            flatListRef.current?.scrollToIndex({
              index: currentIndex,
              animated: true
            });
            showValidation('Please complete this step first');
            return;
          }
          setCurrentIndex(newIndex);
        }}
        onScrollBeginDrag={(event) => {
          // Prevent scrolling forward if current step is invalid
          const xOffset = event.nativeEvent.contentOffset.x;
          if (xOffset < currentIndex * width && !isCurrentStepValid()) {
            flatListRef.current?.scrollToIndex({
              index: currentIndex,
              animated: true
            });
            showValidation('Please complete this step first');
          }
        }}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise((resolve) => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          });
        }}
      />

      <Animated.View style={[styles.bottomContainer, { opacity: buttonContainerOpacity }]}>
        {showValidationMessage && (
          <Animated.View style={[styles.validationContainer, { opacity: validationOpacity }]}>
            <AnimatedTextLoading
              text={validationMessage}
              colorScheme={isDark ? 'dark' : 'light'}
              style={styles.validationMessage}
            />
          </Animated.View>
        )}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarContainer}>
            <Animated.View 
              style={[
                styles.progressBar,
                {
                  width: progressWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]} 
            />
          </View>
        </View>

        <View style={styles.buttonContainer} pointerEvents={isCalculatingGoals ? 'none' : 'auto'}>
          {currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handlePrevious}
            >
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.primaryButton,
              !isCurrentStepValid() && styles.disabledButton,
            ]}
            onPress={handleValidationAndNext}
          >
            <Text style={styles.actionButtonText}>
              {currentIndex === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const getDynamicStyles = (isDark) => {
  const dotSize = 8;
  const dotSpacing = 16;
  const activeDotWidth = 24;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: isDark ? '#000' : '#FFF',
    },
    slide: {
      flex: 1,
      width,
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: isSmallDevice ? '5%' : '8%',
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
      paddingHorizontal: 20,
      width: '100%',
      gap: 20,
    },
    headerTextContainer: {
      flex: 1,
    },
    iconHeaderContainer: {
      width: 80,
      height: 80,
      borderRadius: 30,
      backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#E0E0E0',
    },
    title: {
      fontSize: isSmallDevice ? 24 : 28,
      fontWeight: '700',
      color: isDark ? '#FFF' : '#000',
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      fontSize: isSmallDevice ? 16 : 18,
      color: isDark ? '#CCC' : '#666',
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: isSmallDevice ? 22 : 24,
    },
    bottomDescription: {
      fontSize: isSmallDevice ? 16 : 18,
      color: isDark ? '#CCC' : '#666',
      textAlign: 'center',
      marginTop: 16,
      lineHeight: isSmallDevice ? 22 : 24,
    },
    bottomContainer: {
      padding: 10,
      paddingBottom: Platform.OS === 'ios' ? 20 : 40,
    },
    progressContainer: {
      marginHorizontal: 20,
      marginBottom: 16,
    },
    progressBarContainer: {
      height: 18,
      backgroundColor: isDark ? '#333' : '#E0E0E0',
      borderRadius: 100,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: isDark ? '#FFF' : '#000',
      borderRadius: 100,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      flex: 1,
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: isDark ? '#FFF' : '#000',
    },
    secondaryButton: {
      backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#000' : '#FFF',
    },
    secondaryButtonText: {
      color: isDark ? '#FFF' : '#000',
    },
    disabledButton: {
      opacity: 0.5,
    },
    featuresContainer: {
      width: '100%',
      marginTop: 8,
      marginBottom: 16,
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      paddingBottom: 20,
      flexGrow: 1,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      backgroundColor: isDark ? '#1C1C1E' : '#F8F8F8',
      padding: 16,
      borderRadius: 25,
      shadowColor: isDark ? '#000' : '#666',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 0,
    },
    featureIconContainer: {
      width: 50,
      height: 50,
      borderRadius: 15,
      backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    featureIcon: {
      fontSize: 25,
    },
    featureTextContainer: {
      flex: 1,
    },
    featureTitle: {
      fontSize: isSmallDevice ? 16 : 17,
      fontWeight: '600',
      color: isDark ? '#FFF' : '#000',
      marginBottom: 4,
    },
    featureDescription: {
      fontSize: isSmallDevice ? 13 : 14,
      color: isDark ? '#CCC' : '#666',
      lineHeight: isSmallDevice ? 18 : 20,
    },
    unitToggleContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      marginBottom: 24,
      width: '100%',
    },
    unitToggle: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 16,
      backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#E0E0E0',
    },
    unitToggleSelected: {
      backgroundColor: isDark ? '#FFF' : '#000',
      borderColor: isDark ? '#FFF' : '#000',
    },
    unitToggleText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#FFF' : '#000',
    },
    unitToggleTextSelected: {
      color: isDark ? '#000' : '#FFF',
    },
    inputRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      width: '100%',
    },
    input: {
      width: '80%',
      height: 56,
      backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
      borderRadius: 16,
      paddingHorizontal: 20,
      fontSize: 18,
      color: isDark ? '#FFF' : '#000',
      textAlign: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#E0E0E0',
    },
    inputSmall: {
      width: '38%',
      height: 56,
      backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
      borderRadius: 16,
      paddingHorizontal: 20,
      fontSize: 18,
      color: isDark ? '#FFF' : '#000',
      textAlign: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#E0E0E0',
    },
    optionsContainer: {
      width: '100%',
      alignItems: 'center',
      gap: 12,
      marginTop: 12,
    },
    option: {
      width: '80%',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#E0E0E0',
      alignItems: 'center',
    },
    optionSelected: {
      backgroundColor: isDark ? '#FFF' : '#000',
      borderColor: isDark ? '#FFF' : '#000',
    },
    optionText: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#FFF' : '#000',
    },
    optionTextSelected: {
      color: isDark ? '#000' : '#FFF',
    },
    activityOptionsContainer: {
      width: '100%',
      alignItems: 'center',
      gap: 12,
      marginTop: 12,
    },
    activityOptionLarge: {
      width: '90%',
      padding: 20,
      borderRadius: 16,
      backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#E0E0E0',
    },
    activityOptionLargeSelected: {
      backgroundColor: isDark ? '#FFF' : '#000',
      borderColor: isDark ? '#FFF' : '#000',
    },
    activityOptionText: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#FFF' : '#000',
      marginBottom: 4,
      textAlign: 'center',
    },
    activityOptionTextSelected: {
      color: isDark ? '#000' : '#FFF',
    },
    activityOptionDescription: {
      fontSize: 14,
      color: isDark ? '#CCC' : '#666',
      textAlign: 'center',
    },
    activityOptionDescriptionSelected: {
      color: isDark ? '#666' : '#CCC',
    },
    goalsContainer: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'center',
      marginTop: 24,
    },
    goalCard: {
      width: '45%',
      aspectRatio: 1,
      backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
      borderRadius: 20,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#E0E0E0',
    },
    goalCardIcon: {
      width: 48,
      height: 48,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    goalValue: {
      fontSize: 24,
      fontWeight: '700',
      color: isDark ? '#FFF' : '#000',
      marginBottom: 8,
    },
    goalLabel: {
      fontSize: 16,
      color: isDark ? '#CCC' : '#666',
    },
    datePickerButton: {
      width: '80%',
      height: 56,
      backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#E0E0E0',
    },
    datePickerButtonText: {
      fontSize: 18,
      color: isDark ? '#FFF' : '#000',
      textAlign: 'center',
      width: '100%',
      height: '100%',
      paddingVertical: 15,
    },
    validationContainer: {
      position: 'absolute',
      alignItems: 'center',
      bottom: 140,
      left: 0,
      right: 0,
      height: 25,
    },
    validationMessage: {
      fontSize: 18,
      fontWeight: '400',
      color: isDark ? '#ccc' : '#ccc',
      textAlign: 'center',
    },
    savedDataToast: {
      position: 'absolute',
      bottom: 20,
      alignSelf: 'center',
      backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
      borderRadius: 25,
      paddingVertical: 12,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#E0E0E0',
      transform: [{translateY: 0}],
    },
    savedDataToastButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    savedDataToastText: {
      fontSize: 16,
      fontWeight: '500',
      color: isDark ? '#FFF' : '#000',
    },
    optionHeader: {
      position: 'relative',
      width: '100%',
      alignItems: 'center',
      marginBottom: 8,
      flexDirection: 'row',
      justifyContent: 'center',
    },
    timeEstimate: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: isDark ? '#2C2C2E' : '#EAEAEA',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    timeEstimateSelected: {
      backgroundColor: '#1C1C1E',
    },
    timeEstimateText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#CCC' : '#666',
    },
    timeEstimateTextSelected: {
      color: '#FFF',
    },
    weightChangeText: {
      fontSize: 16,
      color: isDark ? '#CCC' : '#666',
      marginTop: 16,
      textAlign: 'center',
    },
    disclaimerText: {
      fontSize: 14,
      color: isDark ? '#FF6961' : '#D32F2F',
      textAlign: 'center',
      marginVertical: 0,
      paddingHorizontal: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      top: 80,
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 24,
    },
    loadingText: {
      fontSize: 20,
      color: isDark ? '#FFF' : '#000',
      marginTop: 40,
      textAlign: 'center',
      fontWeight: '600',
      letterSpacing: -0.5,
      opacity: 0.9,
    },
    loadingIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 30,
      backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#E0E0E0',
    },
    loadingProgressContainer: {
      width: '100%',
      maxWidth: 300,
      marginTop: 32,
    },
    loadingProgressBackground: {
      height: 15,
      backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5',
      borderRadius: 100,
      overflow: 'hidden',
    },
    loadingProgressBar: {
      height: '100%',
      backgroundColor: isDark ? '#FFF' : '#000',
      borderRadius: 100,
    },
    loadingStepCount: {
      fontSize: 14,
      color: isDark ? '#999' : '#666',
      marginTop: 16,
      textAlign: 'center',
      fontWeight: '500',
    },
    goalsContent: {
      width: '100%',
    },
    affirmationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#4ECDC420' : '#2ecc7120',
      borderRadius: 12,
      padding: 12,
      marginTop: 24,
      marginHorizontal: 20,
      gap: 8,
    },
    affirmationText: {
      fontSize: 16,
      color: isDark ? '#4ECDC4' : '#27ae60',
      textAlign: 'center',
      marginVertical: 0,
      paddingHorizontal: 20,
    },
  });
};

export default OnboardingScreen;