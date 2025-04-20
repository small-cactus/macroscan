// OnboardingScreen.js

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  Image,
  Switch,
  Modal,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import AnimatedTextOnboarding from './AnimatedTextOnboarding.js';
import AnimatedTextLoading from './AnimatedTextLoading';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FoodCarousel from './FoodCarousel.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Superwall from '@superwall/react-native-superwall';
import ProgressVisualization from './ProgressVisualization';
import AIVisualization from './AIVisualization';
import Svg, { Circle } from 'react-native-svg';
import DatePicker from '@react-native-community/datetimepicker';

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
    id: '4',
    title: 'Better Search, Better Results',
    description: "This is how we get you the most accurate results, every. single. time.",
    features: [
      {
        id: '4-1',
        title: 'Real-Time Web Search',
        description: 'Our AI actively searches the web to identify any food, even unique creations',
        icon: '🌐'
      },
      {
        id: '4-2',
        title: 'Global Database Access',
        description: 'Connects to multiple food databases worldwide for accurate nutrition data',
        icon: '🔍'
      },
      {
        id: '4-3',
        title: 'Smart Learning',
        description: 'Improves accuracy with each scan across our entire user base',
        icon: '🧠'
      },
      {
        id: '4-4',
        title: 'Context Understanding',
        description: 'Recognizes cooking methods, portions, and mixed ingredients',
        icon: '🍽️'
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
    title: 'Progress Takes Time',
    description: "Our data shows most users see significant results after 30 days",
    features: []
  },
  {
    id: '3.5',
    title: "Let's Create Your Personalized Plan",
    description: "We'll ask you a few questions to craft nutrition goals tailored just for you",
    isIntermediate: true,
    features: [
      {
        id: '3.5-1',
        title: 'Personalized Macros',
        description: 'Get precise protein, carb, and fat targets based on your body',
        icon: '⚖️'
      },
      {
        id: '3.5-2',
        title: 'Science-Backed Goals',
        description: 'Calculations based on proven nutritional formulas',
        icon: '🧪'
      },
      {
        id: '3.5-3',
        title: 'Adaptive Tracking',
        description: 'Goals that adjust as your journey progresses',
        icon: '📈'
      }
    ]
  },
  {
    id: '8',
    title: "What's your gender?",
    field: 'gender',
    description: 'This helps us calculate your metabolic rate more accurately.',
    icon: 'gender-male-female',
    iconType: 'material',
    options: ['Male', 'Female', 'Other']
  },
  {
    id: '7',
    title: "How old are you?",
    field: 'age',
    description: 'Age plays a key role in calculating your metabolic rate.',
    icon: 'calendar',
    iconType: 'ionicon',
    useDatePicker: true
  },
  {
    id: '5',
    title: "How tall are you?",
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
    title: "How much do you weigh?",
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
    id: '9',
    title: "How active are you?",
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
    id: '10c',
    title: "Ready to Generate Your Plan!",
    description: "We have all the information we need to create your personalized nutrition plan.",
    isPreCalculation: true,
    isLoading: true,
    features: [
      {
        id: '10c-1',
        title: 'Profile Complete',
        description: 'Your personal information has been collected successfully',
        icon: '✅'
      },
      {
        id: '10c-2',
        title: 'Science-Based Calculation',
        description: 'We use proven formulas to determine your optimal nutrition needs',
        icon: '🧪'
      },
      {
        id: '10c-3',
        title: 'Personalized Results',
        description: 'Your plan will be tailored specifically to your body and goals',
        icon: '🎯'
      }
    ]
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

// Calculate scale factor based on screen size
const baseWidth = 430; // iPhone 14 Pro Max width
const baseHeight = 932; // iPhone 14 Pro Max height
const scaleWidth = width / baseWidth;
const scaleHeight = height / baseHeight;
const scale = Math.min(scaleWidth, scaleHeight);

// Update styles to use scale factor
const getBaseStyles = (isDark) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent', // Changed from solid color to transparent
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  slide: {
    flex: 1,
    width,
    alignItems: 'center',
    paddingHorizontal: 20 * scale,
    paddingTop: isSmallDevice ? '5%' : '5%',
    backgroundColor: 'transparent', // Make slide background transparent
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24 * scale,
    paddingHorizontal: 20 * scale,
    width: '100%',
    gap: 20 * scale,
  },
  headerTextContainer: {
    flex: 1,
  },
  iconHeaderContainer: {
    width: 80 * scale,
    height: 80 * scale,
    borderRadius: 30 * scale,
    backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24 * scale,
    borderWidth: 1,
    borderColor: isDark ? '#333' : '#E0E0E0',
  },
  title: {
    fontSize: (isSmallDevice ? 24 : 28) * scale,
    fontWeight: '700',
    color: isDark ? '#FFF' : '#000',
    textAlign: 'center',
    marginBottom: 12 * scale,
    textShadowColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.75)', // Add text shadow
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    fontSize: (isSmallDevice ? 16 : 18) * scale,
    color: isDark ? '#CCC' : '#666',
    textAlign: 'center',
    marginBottom: 24 * scale,
    lineHeight: (isSmallDevice ? 22 : 24) * scale,
    textShadowColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.75)', // Add text shadow
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomDescription: {
    fontSize: (isSmallDevice ? 16 : 18) * scale,
    color: isDark ? '#CCC' : '#666',
    textAlign: 'center',
    marginTop: 16 * scale,
    lineHeight: (isSmallDevice ? 22 : 24) * scale,
  },
  bottomContainer: {
    padding: 10 * scale,
    paddingBottom: Platform.OS === 'ios' ? 20 * scale : 40 * scale,
    borderTopWidth: 1,
    borderTopColor: isDark ? 'rgba(51, 51, 51, 0.5)' : 'rgba(224, 224, 224, 0.5)',
  },
  progressContainer: {
    marginHorizontal: 20 * scale,
    marginBottom: 16 * scale,
  },
  progressBarContainer: {
    height: 18 * scale,
    backgroundColor: isDark ? '#333' : '#E0E0E0',
    borderRadius: 100 * scale,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: isDark ? '#FFF' : '#000',
    borderRadius: 100 * scale,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12 * scale,
  },
  actionButton: {
    flex: 1,
    height: 56 * scale,
    borderRadius: 16 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: isDark ? '#FFF' : '#000',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0)',
  },
  secondaryButton: {
    backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0)',
  },
  actionButtonText: {
    fontSize: 16 * scale,
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
    marginTop: 8 * scale,
    marginBottom: 16 * scale,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20 * scale,
    flexGrow: 1,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16 * scale,
    backgroundColor: 'transparent',
    padding: 16 * scale,
    borderRadius: 25 * scale,
    shadowColor: isDark ? '#000' : '#666',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 2 * scale,
    elevation: 0,
    overflow: 'hidden',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0)',
  },
  featureItemBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.5)',
  },
  featureIconContainer: {
    width: 50 * scale,
    height: 50 * scale,
    borderRadius: 15 * scale,
    backgroundColor: isDark ? 'rgba(44, 44, 46, 0.8)' : 'rgba(245, 245, 245, 0.9)', // Add opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12 * scale,
  },
  featureIcon: {
    fontSize: 25 * scale,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: (isSmallDevice ? 16 : 17) * scale,
    fontWeight: '600',
    color: isDark ? '#FFF' : '#000',
    marginBottom: 4 * scale,
  },
  featureDescription: {
    fontSize: (isSmallDevice ? 13 : 14) * scale,
    color: isDark ? '#CCC' : '#666',
    lineHeight: (isSmallDevice ? 18 : 20) * scale,
  },
  unitToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12 * scale,
    marginBottom: 24 * scale,
    width: '100%',
  },
  unitToggle: {
    paddingVertical: 12 * scale,
    paddingHorizontal: 20 * scale,
    borderRadius: 16 * scale,
    backgroundColor: isDark ? 'rgba(28, 28, 30, 0.8)' : 'rgba(245, 245, 245, 0.9)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(51, 51, 51, 0.5)' : 'rgba(224, 224, 224, 0.5)',
  },
  unitToggleSelected: {
    backgroundColor: isDark ? '#FFFFFF' : '#000000',
    borderColor: isDark ? '#FFFFFF' : '#000000',
  },
  unitToggleText: {
    fontSize: 16 * scale,
    fontWeight: '600',
    color: isDark ? '#FFF' : '#000',
  },
  unitToggleTextSelected: {
    color: isDark ? '#000' : '#FFF',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12 * scale,
    width: '100%',
  },
  input: {
    width: '80%',
    height: 56 * scale,
    backgroundColor: isDark ? 'rgba(28, 28, 30, 0.8)' : 'rgba(245, 245, 245, 0.9)',
    borderRadius: 16 * scale,
    paddingHorizontal: 20 * scale,
    fontSize: 18 * scale,
    color: isDark ? '#FFF' : '#000',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(51, 51, 51, 0.5)' : 'rgba(224, 224, 224, 0.5)',
  },
  inputSmall: {
    width: '38%',
    height: 56 * scale,
    backgroundColor: isDark ? 'rgba(28, 28, 30, 0.8)' : 'rgba(245, 245, 245, 0.9)',
    borderRadius: 16 * scale,
    paddingHorizontal: 20 * scale,
    fontSize: 18 * scale,
    color: isDark ? '#FFF' : '#000',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(51, 51, 51, 0.5)' : 'rgba(224, 224, 224, 0.5)',
  },
  optionsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 12 * scale,
    marginTop: 12 * scale,
  },
  option: {
    width: '80%',
    paddingVertical: 16 * scale,
    paddingHorizontal: 24 * scale,
    borderRadius: 16 * scale,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  optionSelected: {
    backgroundColor: isDark ? '#FFFFFF' : '#000000',
    borderColor: isDark ? '#FFFFFF' : '#000000',
    overflow: 'hidden',
  },
  optionText: {
    fontSize: 18 * scale,
    fontWeight: '600',
    color: isDark ? '#FFF' : '#000',
  },
  optionTextSelected: {
    color: isDark ? '#000000' : '#FFFFFF',
  },
  activityOptionsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 12 * scale,
    marginTop: 12 * scale,
  },
  activityOptionLarge: {
    width: '90%',
    padding: 20 * scale,
    borderRadius: 16 * scale,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  activityOptionLargeSelected: {
    backgroundColor: isDark ? '#FFFFFF' : '#000000',
    borderColor: isDark ? '#FFFFFF' : '#000000',
  },
  activityOptionText: {
    textAlign: 'center',
    justifyContent: 'center',
    fontSize: 18 * scale,
    fontWeight: '600',
    color: isDark ? '#FFF' : '#000',
  },
  activityOptionTextSelected: {
    color: isDark ? '#000000' : '#FFFFFF',
  },
  activityOptionDescription: {
    fontSize: 14 * scale,
    color: isDark ? '#CCC' : '#666',
    textAlign: 'center',
  },
  activityOptionDescriptionSelected: {
    color: isDark ? '#000000' : '#FFFFFF',
  },
  goalsContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12 * scale,
    justifyContent: 'center',
    marginTop: 24 * scale,
  },
  goalCard: {
    width: '45%',
    aspectRatio: 1,
    backgroundColor: isDark ? 'rgba(28, 28, 30, 0.8)' : 'rgba(245, 245, 245, 0.9)',
    borderRadius: 20 * scale,
    padding: 16 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(51, 51, 51, 0.5)' : 'rgba(224, 224, 224, 0.5)',
  },
  goalCardIcon: {
    width: 48 * scale,
    height: 48 * scale,
    borderRadius: 30 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12 * scale,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3 * scale,
    elevation: 2,
  },
  goalValue: {
    fontSize: 24 * scale,
    fontWeight: '700',
    color: isDark ? '#FFF' : '#000',
    marginBottom: 8 * scale,
  },
  goalLabel: {
    fontSize: 16 * scale,
    color: isDark ? '#CCC' : '#666',
  },
  datePickerButton: {
    width: '80%',
    height: 56 * scale,
    backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
    borderRadius: 16 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? '#333' : '#E0E0E0',
  },
  datePickerButtonText: {
    fontSize: 18 * scale,
    color: isDark ? '#FFF' : '#000',
    textAlign: 'center',
    width: '100%',
    height: '100%',
    paddingVertical: 15 * scale,
  },
  validationContainer: {
    position: 'absolute',
    alignItems: 'center',
    bottom: 140 * scale,
    left: 0,
    right: 0,
    height: 25 * scale,
  },
  validationMessage: {
    fontSize: 18 * scale,
    fontWeight: '400',
    color: isDark ? '#ccc' : '#ccc',
    textAlign: 'center',
  },
  savedDataToast: {
    position: 'absolute',
    bottom: 20 * scale,
    alignSelf: 'center',
    backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
    borderRadius: 25 * scale,
    paddingVertical: 12 * scale,
    paddingHorizontal: 20 * scale,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84 * scale,
    elevation: 5,
    borderWidth: 1,
    borderColor: isDark ? '#333' : '#E0E0E0',
    transform: [{translateY: 0}],
  },
  savedDataToastButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 * scale,
  },
  savedDataToastText: {
    fontSize: 16 * scale,
    fontWeight: '500',
    color: isDark ? '#FFF' : '#000',
  },
  optionHeader: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    marginBottom: 8 * scale,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  timeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4 * scale,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8 * scale,
    paddingVertical: 4 * scale,
    borderRadius: 12 * scale,
    position: 'absolute',
    right: 0,
    top: 0,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  timeEstimateSelected: {
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderColor: isDark ? '#000000' : '#FFFFFF',
    color: isDark ? '#ccc' : '#666',
  },
  timeEstimateText: {
    fontSize: 12 * scale,
    fontWeight: '600',
    color: isDark ? '#CCC' : '#666',
  },
  timeEstimateTextSelected: {
    color: isDark ? '#ccc' : '#666',
  },
  weightChangeText: {
    fontSize: 16 * scale,
    color: isDark ? '#CCC' : '#666',
    marginTop: 16 * scale,
    textAlign: 'center',
  },
  disclaimerText: {
    fontSize: 14 * scale,
    color: isDark ? '#FF6961' : '#D32F2F',
    textAlign: 'center',
    marginVertical: 0,
    paddingHorizontal: 20 * scale,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20 * scale,
  },
  loadingIconContainer: {
    width: 60,
    height: 60,
    marginBottom: 20 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginHorizontal: 20 * scale,
  },
  goalsContent: {
    width: '100%',
  },
  affirmationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#4ECDC420' : '#2ecc7120',
    borderRadius: 12 * scale,
    padding: 12 * scale,
    marginTop: 24 * scale,
    marginHorizontal: 20 * scale,
    gap: 8 * scale,
  },
  affirmationText: {
    fontSize: 16 * scale,
    color: isDark ? '#4ECDC4' : '#27ae60',
    textAlign: 'center',
    marginVertical: 0,
    paddingHorizontal: 20 * scale,
  },
  privacyFooter: {
    fontSize: 13 * scale,
    color: isDark ? '#999' : '#666',
    textAlign: 'center',
    marginTop: 20 * scale,
    paddingHorizontal: 40 * scale,
    fontStyle: 'italic',
  },
});

// Update the FeatureItem component definition
const FeatureItem = React.memo(({ item, showAnimation, animValue, styles, isDark }) => {
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
    <Animated.View style={[styles.featureItem, animatedStyle]}>
      <BlurView
        style={StyleSheet.absoluteFill}
        intensity={100}
        tint={isDark ? 'dark' : 'light'}
      />
      <View style={styles.featureItemBackground} />
      <View style={styles.featureIconContainer}>
        <Text style={styles.featureIcon}>{item.icon}</Text>
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{item.title}</Text>
        <Text style={styles.featureDescription}>{item.description}</Text>
      </View>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary rerenders
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.showAnimation === nextProps.showAnimation &&
    prevProps.isDark === nextProps.isDark &&
    prevProps.animValue === nextProps.animValue
  );
});

// Memoized goal card component with more efficient props equality check
const GoalCard = React.memo(({ goal, animation, styles }) => (
  <Animated.View 
    style={[
      styles.goalCard,
      {
        transform: [
          { scale: animation },
          {
            translateY: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            })
          }
        ],
        opacity: animation
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
), (prevProps, nextProps) => {
  // Custom equality check to prevent unnecessary re-renders
  return (
    prevProps.goal.value === nextProps.goal.value &&
    prevProps.goal.label === nextProps.goal.label &&
    prevProps.animation === nextProps.animation &&
    prevProps.styles === nextProps.styles
  );
});

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [progressAnimationComplete, setProgressAnimationComplete] = useState(false);
  const flatListRef = useRef(null);
  const colorScheme = Appearance.getColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Add new animated value for background fade
  const backgroundFadeOpacity = useRef(new Animated.Value(0)).current;
  
  // Add state to track if the continue button is disabled
  const [isContinueDisabled, setIsContinueDisabled] = useState(false);
  
  // Memoize styles
  const styles = useMemo(() => getBaseStyles(isDark), [isDark]);
  
  // Optimize FlatList
  const getItemLayout = useCallback((data, index) => ({
    length: width,
    offset: width * index,
    index,
  }), []);

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

  // Add state for current loading state
  const [currentLoadingState, setCurrentLoadingState] = useState(null);

  // Add state for feature animations
  const [featureAnimations, setFeatureAnimations] = useState({});
  
  // Add new animated values for title and description
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const descriptionOpacity = useRef(new Animated.Value(0)).current;
  
  // Add this with the other animated values at the top of the component
  const loadingTextPulse = useRef(new Animated.Value(0.4)).current;
  
  // Add this with other animated values near the top of the component
  const intermediatePulse = useRef(new Animated.Value(0)).current;

  // Add new animated value for circle rotation
  const rotationAnim = useRef(new Animated.Value(0)).current;

  // Add loading text messages array
  const LOADING_MESSAGES = [
    { text: "Analyzing your profile data...", duration: 2500 },
    { text: "Running metabolic calculations...", duration: 1800 },
    { text: "Processing nutritional algorithms...", duration: 2800 },
    { text: "Finalizing personalized plan...", duration: 2200 }
  ];

  // Add state for current loading message
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(LOADING_MESSAGES[0].text);
  const loadingMessageOpacity = useRef(new Animated.Value(1)).current;

  const [loadingBetterSearch, setLoadingBetterSearch] = useState(false);
  const betterSearchLoadingAnim = useRef(new Animated.Value(0)).current;

  // State for the Generate Plan button's initial loading state
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  // Memoize goalData outside renderItem
  const goalData = useMemo(() => {
    if (!calculatedGoals) return [];
    return [
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
  }, [calculatedGoals]);

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
    const currentStep = filteredSteps[currentIndex];
    if (!currentStep) return; // Skip if step doesn't exist
    
    if (['1', '2', '3', '4'].includes(currentStep.id) && featureAnimations[currentStep.id]) {
      if (currentStep.id === '4') {
        // For "Better Search, Better Results" step, show loading first
        setLoadingBetterSearch(true);
        Animated.timing(betterSearchLoadingAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }).start();

        // After a shorter delay, start the feature animations
        setTimeout(() => {
          setLoadingBetterSearch(false);
          Animated.timing(betterSearchLoadingAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true
          }).start();

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
        }, 800); // Reduced delay
      } else {
        // For other steps, animate normally
        Animated.stagger(100, 
          featureAnimations[currentStep.id].map((anim, index) => {
            // Add timeout to trigger haptic for each feature item
            const animDuration = 100 * index;
            setTimeout(() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }, animDuration);
            
            return Animated.spring(anim, {
              toValue: 1,
              tension: 50,
              friction: 7,
              useNativeDriver: true
            });
          })
        ).start();
      }
    }
    
    // Special animation for intermediate step
    if (currentStep.id === '3.5' && featureAnimations[currentStep.id]) {
      // First reset all animations to 0
      featureAnimations[currentStep.id].forEach(anim => anim.setValue(0));
      
      // Create a more dramatic entrance animation with longer delay
      Animated.stagger(400, 
        featureAnimations[currentStep.id].map((anim, index) => {
          // Add timeout to trigger haptic for each feature item
          const animDuration = 400 * index;
          setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }, animDuration);
          
          return Animated.spring(anim, {
            toValue: 1,
            tension: 30,
            friction: 8,
            useNativeDriver: true
          });
        })
      ).start();
    }
  }, [currentIndex, featureAnimations, filteredSteps]);

  // Add animation for intermediate step background
  useEffect(() => {
    const currentStep = filteredSteps[currentIndex];
    if (!currentStep) return; // Skip if step doesn't exist
    
    if (currentStep.id === '3.5') {
      // Create a pulsing animation for background elements
      Animated.loop(
        Animated.sequence([
          Animated.timing(intermediatePulse, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(intermediatePulse, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      // Stop the animation when leaving the step
      intermediatePulse.stopAnimation();
      intermediatePulse.setValue(0);
    }
  }, [currentIndex, filteredSteps]);

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

  // Function to check if saved data exists and load it
  const checkForSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('@user_data');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // --- BEGIN CHANGE: Load data into state ---
        // Check if the loaded data seems valid before applying
        // (basic check: ensure it's an object and has expected keys)
        if (typeof parsedData === 'object' && parsedData !== null && parsedData.hasOwnProperty('unit')) {
          setUserData(parsedData); 
          console.log('[OnBoardingScreen] Loaded saved user data:', parsedData);
        } else {
          console.warn('[OnBoardingScreen] Discarding invalid saved data:', parsedData);
          // Optionally clear invalid saved data
          // await AsyncStorage.removeItem('@user_data');
        }
        // --- END CHANGE ---

        const exists = {};
        // Check each field that could have saved data
        exists.height = parsedData.height || (parsedData.heightFeet && parsedData.heightInches);
        exists.weight = !!parsedData.weight;
        exists.age = !!parsedData.age;
        exists.gender = !!parsedData.gender;
        exists.activityLevel = !!parsedData.activityLevel;
        exists.goal = !!parsedData.goal;
        
        setSavedDataExists(exists);
      } else {
        console.log('[OnBoardingScreen] No saved user data found.');
        // Ensure initial state is set if no data found
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
      }
    } catch (error) {
      console.error('Error checking/loading saved data:', error);
    }
  };

  // Effect to handle step changes and toast visibility
  useEffect(() => {
    const currentStep = filteredSteps[currentIndex]; // Use filteredSteps
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
      
      // Save the step ID to visited steps
      await saveVisitedStep(currentStep.id);
    };

    handleStepChange();
  }, [currentIndex, hasAutoFilled, savedDataExists, filteredSteps]);

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

  useEffect(() => {
    const isLastStep = filteredSteps && currentIndex === filteredSteps.length - 1;
    
    if (filteredSteps) {
      Animated.timing(backgroundFadeOpacity, {
        toValue: isLastStep ? 1 : 0,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }
  }, [currentIndex, filteredSteps]);

  useEffect(() => {
    if (isCalculatingGoals) {
      Animated.loop(
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotationAnim.setValue(0);
    }
  }, [isCalculatingGoals]);

  const navigateHome = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate('HomeTabs', { screen: 'Home' });
    navigation.reset({
      index: 0,
      routes: [{ name: 'HomeTabs' }],
    });
  };

  const showPaywall = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // await Superwall.shared.register('fortune');
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

  // Helper function to filter steps based on userData
  function getFilteredSteps(userData) {
    // Always clone the original steps
    let steps = [...ONBOARDING_STEPS];

    // If the user's goal is "Maintain Weight", filter out steps 10a and 10b
    if (userData.goal === 'Maintain Weight') {
      steps = steps.filter(step => step.id !== '10a' && step.id !== '10b');
    }

    return steps;
  }

  // NEW: Function to find the next valid step index
  const findNextStepIndex = (currentIndex, direction = 1) => {
    const nextIndex = currentIndex + direction;
    
    // Check if the next index is valid
    if (nextIndex < 0 || nextIndex >= filteredSteps.length) {
      return -1; // Invalid index
    }
    
    return nextIndex;
  };

  // Update handleNext to use the new function
  const handleNext = async () => {
    if (!isCurrentStepValid()) {
      const currentStep = filteredSteps[currentIndex];
      let message = '';
      
      if (currentStep?.field === 'height') {
        message = 'Please enter a valid height';
      } else if (currentStep?.field === 'weight') {
        message = 'Please enter a valid weight';
      } else if (currentStep?.field === 'age') {
        message = 'Please enter a valid age';
      } else if (currentStep?.field === 'gender') {
        message = 'Please select your gender';
      } else if (currentStep?.field === 'activityLevel') {
        message = 'Please select your activity level';
      } else if (currentStep?.field === 'goal') {
        message = 'Please select your goal';
      }
      
      showValidation(message);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // If the current step has ID '11', save the goals
    if (filteredSteps[currentIndex]?.id === '11') {
      try {
        console.log('[OnBoardingScreen] Attempting to save goals to AsyncStorage...');
        
        if (!calculatedGoals) {
          console.error('[OnBoardingScreen] Cannot save goals: calculatedGoals is null');
          throw new Error('Goals not calculated yet');
        }
        
        console.log('[OnBoardingScreen] Goals to save:', calculatedGoals);
        await AsyncStorage.setItem('@user_goals', JSON.stringify(calculatedGoals));
        console.log('[OnBoardingScreen] Successfully saved goals to AsyncStorage');
      } catch (error) {
        console.error('[OnBoardingScreen] Error saving goals:', error);
        // Show an error message to the user
        Alert.alert(
          'Error',
          'There was a problem saving your goals. Please try again.',
          [{ text: 'OK' }]
        );
        return; // Don't proceed if we couldn't save the goals
      }
    }

    const nextIndex = findNextStepIndex(currentIndex, 1);
    
    if (nextIndex !== -1) {
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      showPaywall();
    }
  };

  // Update handlePrevious to use the new function
  const handlePrevious = () => {
    const prevIndex = findNextStepIndex(currentIndex, -1);
    
    if (prevIndex !== -1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentIndex(prevIndex);
      flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
    }
  };

  const timers = useRef([]);

  // Instead, check the step ID to decide if it's step "3"
  useEffect(() => {
    const currentStep = filteredSteps[currentIndex];
    if (currentStep?.id === '3' && !step3Loaded) {
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
  }, [currentIndex, step3Loaded, filteredSteps]);

  // Optimize renderFeature with better memoization
  const renderFeature = useCallback(({ item, index }, showAnimation = false, animValue) => (
    <FeatureItem 
      key={item.id}
      item={item}
      showAnimation={showAnimation}
      animValue={animValue}
      styles={styles}
      isDark={isDark}
    />
  ), [styles, isDark]);

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
      
      console.log('[OnBoardingScreen] Triggering goal calculation with userData:', userData);
      
      const goals = calculateGoals(userData);
      if (goals) {
        console.log('[OnBoardingScreen] Setting new calculated goals:', goals);
        setCalculatedGoals(goals);
      } else {
        console.error('[OnBoardingScreen] Goal calculation returned null. Current userData:', userData);
      }
    } else {
      console.log('[OnBoardingScreen] Skipping goal calculation - missing required data:', {
        hasWeight: !!userData.weight,
        hasHeight: userData.unit === 'imperial' ? 
          !!(userData.heightFeet && userData.heightInches) : 
          !!userData.height,
        hasAge: !!userData.age,
        hasGender: !!userData.gender,
        hasActivityLevel: !!userData.activityLevel
      });
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
  console.log('[OnBoardingScreen] Starting goals calculation with data:', data);

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
      console.warn('[OnBoardingScreen] Invalid imperial weight/height data:', {
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
      console.warn('[OnBoardingScreen] Invalid metric weight/height data:', {
        weight: data.weight, height: data.height
      });
      return null;
    }

    weightKg = parsedWeight;
    heightCm = parsedHeight;
  }

  console.log('[OnBoardingScreen] Converted measurements - Weight (kg):', weightKg, 'Height (cm):', heightCm);

  // Age & Gender checks
  const age = parseInt(data.age, 10);
  if (isNaN(age) || age <= 0 || age >= 120) {
    console.warn('[OnBoardingScreen] Invalid age:', data.age);
    return null;
  }
  const gender = data.gender;
  if (!gender) {
    console.warn('[OnBoardingScreen] No gender set');
    return null;
  }

  // --- Calculate BMR (Mifflin-St Jeor) ---
  let BMR;
  if (gender === 'Male') {
    BMR = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
  } else {
    BMR = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
  }

  console.log('[OnBoardingScreen] Calculated BMR:', BMR);

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

  console.log('[OnBoardingScreen] Initial TDEE:', TDEE, 'with activity factor:', activityFactor);

  // If user wants to lose/gain weight at a certain weekly rate
  if (data.goal !== 'Maintain Weight' && data.weightChangeRate > 0) {
    const adjustmentFactor = Math.min(1.2, Math.max(0.8, weightKg / 70));
    const baseAdjustment   = (data.weightChangeRate * 3500) / 7;
    const calorieAdjustment = baseAdjustment * adjustmentFactor;

    console.log('[OnBoardingScreen] Weight change adjustments:', {
      adjustmentFactor,
      baseAdjustment,
      calorieAdjustment,
      goal: data.goal
    });

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

  console.log('[OnBoardingScreen] Macro splits:', {
    proteinPerKg,
    carbsPercent,
    fatsPercent
  });

  const calories       = Math.round(TDEE);
  const proteins       = Math.round(weightKg * proteinPerKg);          // grams
  const fats           = Math.round((calories * fatsPercent) / 9);     // grams
  const carbohydrates  = Math.round((calories - proteins * 4 - fats * 9) / 4);

  const goals = {
    calories,
    proteins,
    carbohydrates,
    fats
  };

  console.log('[OnBoardingScreen] Final calculated goals:', goals);
  return goals;
};

  // Function to validate current step
  const isCurrentStepValid = () => {
    const currentStep = filteredSteps[currentIndex];
    if (!currentStep) return false; // Add safety check
    
    // For progress visualization step, require animation completion
    if (currentStep.id === '3') {
      return progressAnimationComplete;
    }

    if (!currentStep.field && !currentStep.showWeightChangeOptions) return true;

    if (currentStep.showWeightChangeOptions) {
      if (userData.goal === 'Maintain Weight') return true;
      return userData.weightChangeRate > 0;
    }

    if (currentStep.field === 'height') {
      if (userData.unit === 'imperial') {
        const feet = parseFloat(userData.heightFeet);
        const inches = parseFloat(userData.heightInches);
        return !isNaN(feet) && !isNaN(inches) && feet > 0 && inches >= 0 && inches < 12;
      } else {
        const height = parseFloat(userData.height);
        return !isNaN(height) && height > 0;
      }
    }

    if (currentStep.field === 'weight') {
      const weight = parseFloat(userData.weight);
      return !isNaN(weight) && weight > 0;
    }

    if (currentStep.field === 'age') {
      const age = parseInt(userData.age);
      return !isNaN(age) && age > 0 && age < 120;
    }

    if (currentStep.field === 'gender') {
      return !!userData.gender;
    }

    if (currentStep.field === 'activityLevel') {
      return !!userData.activityLevel;
    }

    if (currentStep.field === 'goal') {
      return !!userData.goal;
    }

    return true;
  };

  // Modify the animateGoalCards function to use timing instead of spring
  const animateGoalCards = () => {
    // Create an array of timing animations for each goal card
    const animations = goalCardAnimations.map((anim) => 
      Animated.timing(anim, {
        toValue: 1,
        duration: 400, // Faster duration for timing animation
        easing: Easing.out(Easing.ease), // Smooth easing
        useNativeDriver: true
      })
    );

    // Start all card animations in parallel
    Animated.parallel(animations).start(() => {
      // After card animations complete, fade in the affirmation text
      Animated.timing(affirmationOpacity, {
        toValue: 1,
        duration: 500, // Affirmation fade-in duration
        useNativeDriver: true,
      }).start(() => {
        // Optional: Haptic feedback when affirmation appears
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      });
    });
  };

  // Update the useEffect for calculated goals with new timing and text animations
  useEffect(() => {
    const step = filteredSteps[currentIndex];
    if (step?.showCalculatedGoals && !hasCalculatedGoals) {
      setIsCalculatingGoals(true);
      contentOpacity.setValue(0);
      loadingOpacity.setValue(1);
      titleOpacity.setValue(0);
      descriptionOpacity.setValue(0);
      setCurrentLoadingMessage(LOADING_MESSAGES[0].text);
      
      Animated.timing(buttonContainerOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Function to animate text change with precise timing
      const animateTextChange = (index, remainingTime) => {
        if (index >= LOADING_MESSAGES.length) return;
        
        const currentMessage = LOADING_MESSAGES[index];
        const fadeOutDuration = 300;
        const fadeInDuration = 300;
        const pauseDuration = 200; // Pause between fade out and fade in

        // First fade out the current text
        Animated.timing(loadingMessageOpacity, {
          toValue: 0,
          duration: fadeOutDuration,
          useNativeDriver: true,
        }).start(() => {
          // After fade out completes, wait a bit then change text and fade in
          setTimeout(() => {
            if (index + 1 < LOADING_MESSAGES.length) {
              setCurrentLoadingMessage(LOADING_MESSAGES[index + 1].text);
              
              // Fade in the new text
              Animated.timing(loadingMessageOpacity, {
                toValue: 1,
                duration: fadeInDuration,
                useNativeDriver: true,
              }).start();

              // Schedule next message change
              const totalTransitionTime = fadeOutDuration + pauseDuration + fadeInDuration;
              const nextMessageDelay = currentMessage.duration - totalTransitionTime;
              
              setTimeout(() => {
                animateTextChange(index + 1, remainingTime - currentMessage.duration);
              }, nextMessageDelay);
            }
          }, pauseDuration);
        });
      };

      // Calculate total duration
      const totalDuration = LOADING_MESSAGES.reduce((sum, msg) => sum + msg.duration, 0);

      // Start text animation sequence with total duration tracking
      animateTextChange(0, totalDuration);

      // Update the final animation timing
      setTimeout(() => {
        // First fade out the loading elements
        Animated.parallel([
          Animated.timing(loadingOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(loadingMessageOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          })
        ]).start(() => {
          // Wait for 1 second after fade out
          // setTimeout(() => {
            // Then animate in the content
            Animated.parallel([
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
          // }, 1000); // 1 second pause after fade out --> REMOVED THIS DELAY
        });
      }, totalDuration + 300); // Add a small buffer to the total duration

    } else if (step?.showCalculatedGoals && hasCalculatedGoals && currentIndex === findStepById('11')) {
      // Only run these animations if we're actually on the goals screen (step 11)
      contentOpacity.setValue(1);
      titleOpacity.setValue(1);
      descriptionOpacity.setValue(1);
      buttonContainerOpacity.setValue(1);
      setIsCalculatingGoals(false);
      animateGoalCards();
    }
  }, [currentIndex, filteredSteps, findStepById]);

  // Make renderItem a memoized callback
  const renderItem = useCallback(({ item, index }) => {
    // Skip rendering if item is null
    if (!item) return null;
    
    // Special handling for progress visualization step
    if (item.id === '3') {
      // Define default progress days for onboarding visualization
      const defaultProgressDays = Array.from({ length: 10 }, (_, i) => ({
        day: i + 1,
        completed: false,
      }));

      return (
        <View style={styles.slide}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
          <ProgressVisualization
            isDark={isDark}
            isVisible={currentIndex === index}
            onAnimationComplete={() => setProgressAnimationComplete(true)}
            progressDays={defaultProgressDays} // Pass default data
          />
        </View>
      );
    }

    // Special handling for the intermediate step
    if (item.id === '3.5') {
      return (
        <View style={[styles.slide, { justifyContent: 'center' }]}>
          <Animated.View 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: intermediatePulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.05, 0.15]
              })
            }}
          >
            <Animated.View style={{
              position: 'absolute',
              top: '5%',
              left: '5%',
              right: '5%',
              bottom: '5%',
              borderRadius: 30 * scale,
              backgroundColor: isDark ? '#ffffff20' : '#00000015',
              transform: [
                { rotate: '10deg' },
                { 
                  scale: intermediatePulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1.05]
                  }) 
                }
              ]
            }} />
            <Animated.View style={{
              position: 'absolute',
              top: '8%',
              left: '8%',
              right: '8%',
              bottom: '8%',
              borderRadius: 30 * scale,
              backgroundColor: isDark ? '#ffffff15' : '#00000010',
              transform: [
                { rotate: '-5deg' },
                { 
                  scale: intermediatePulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1.05, 0.95]
                  }) 
                }
              ]
            }} />
          </Animated.View>

          <AnimatedTextOnboarding
            text={item.title}
            colorScheme={isDark ? 'dark' : 'light'}
            style={[styles.title, { 
              fontSize: (isSmallDevice ? 32 : 38) * scale, 
              marginBottom: 24 * scale,
              textAlign: 'center' 
            }]}
          />
          
          <AnimatedTextOnboarding
            text={item.description}
            colorScheme={isDark ? 'dark' : 'light'}
            style={[styles.description, { 
              fontSize: (isSmallDevice ? 18 : 22) * scale,
              marginBottom: 40 * scale,
              textAlign: 'center'
            }]}
          />

          <View style={{
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 20 * scale
          }}>
            {item.features.map((feature, idx) => {
              const animValue = featureAnimations[item.id]?.[idx] || new Animated.Value(0);
              return (
                <Animated.View 
                  key={feature.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 24 * scale,
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
                          inputRange: [0, 0.5, 0.8, 1],
                          outputRange: [0.3, 1.1, 0.9, 1],
                        }),
                      }
                    ],
                  }}
                >
                  <Animated.View style={{
                    width: 60 * scale,
                    height: 60 * scale,
                    borderRadius: 30 * scale,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 16 * scale,
                    transform: [{ 
                      scale: animValue.interpolate({
                        inputRange: [0, 0.5, 0.8, 1],
                        outputRange: [0.2, 1.2, 0.9, 1],
                      }) 
                    }]
                  }}>
                    <Text style={{ fontSize: 30 * scale }}>{feature.icon}</Text>
                  </Animated.View>
                  <Animated.View style={{ 
                    flex: 1,
                    transform: [{
                      translateX: animValue.interpolate({
                        inputRange: [0, 0.5, 0.8, 1],
                        outputRange: [20, -10, 5, 0],
                      })
                    }]
                  }}>
                    <Text style={{
                      fontSize: 20 * scale,
                      fontWeight: '700',
                      color: isDark ? '#FFF' : '#000',
                      marginBottom: 4 * scale,
                    }}>
                      {feature.title}
                    </Text>
                    <Text style={{
                      fontSize: 16 * scale,
                      color: isDark ? '#CCC' : '#666',
                    }}>
                      {feature.description}
                    </Text>
                  </Animated.View>
                </Animated.View>
              );
            })}
          </View>

          <Animated.View style={{
            opacity: featureAnimations[item.id]?.[item.features.length - 1] || new Animated.Value(0),
            transform: [{
              translateY: (featureAnimations[item.id]?.[item.features.length - 1] || new Animated.Value(0)).interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              })
            }]
          }}>
            <TouchableOpacity
              style={{
                backgroundColor: isDark ? '#FFF' : '#000',
                paddingVertical: 16 * scale,
                paddingHorizontal: 32 * scale,
                borderRadius: 25 * scale,
                marginTop: 40 * scale,
                alignSelf: 'center',
                shadowColor: isDark ? '#000' : '#666',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 8,
              }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleNext();
              }}
            >
              <Text style={{
                color: isDark ? '#000' : '#FFF',
                fontSize: 22 * scale,
                fontWeight: '600',
                textAlign: 'center',
              }}>
                Start
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      );
    }

    // Special handling for AI visualization step
    if (item.id === '4') {
      return (
        <View style={styles.slide}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
          <AIVisualization isDark={isDark} isVisible={currentIndex === index} />
        </View>
      );
    }

    // Skip conditional steps for maintain weight
    if ((item.field === 'targetWeight' || item.showWeightChangeOptions) && userData.goal === 'Maintain Weight') {
      return null;
    }

    // Special handling for first four informational steps
    if (['1', '2', '3', '4'].includes(item.id)) {
      return (
        <View style={styles.slide}>
          {item.id === '4' ? (
            <>
              <TouchableOpacity onPress={deleteSavedInputs}>
                <AnimatedTextOnboarding
                  text={item.title}
                  colorScheme={isDark ? 'dark' : 'light'}
                  style={styles.title}
                />
              </TouchableOpacity>
              <AnimatedTextOnboarding
                text={item.description}
                colorScheme={isDark ? 'dark' : 'light'}
                style={styles.description}
              />

              {loadingBetterSearch ? (
                <Animated.View style={{
                  opacity: betterSearchLoadingAnim,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 20 * scale
                }}>
                  <ActivityIndicator size="large" color={isDark ? '#FFF' : '#000'} />
                  <Text style={{
                    marginTop: 12 * scale,
                    fontSize: 16 * scale,
                    color: isDark ? '#CCC' : '#666',
                    textAlign: 'center'
                  }}>
                    Preparing search capabilities...
                  </Text>
                </Animated.View>
              ) : (
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
            </>
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

    // Paywall step
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

    // Show calculated goals
    if (item.showCalculatedGoals && calculatedGoals) {
      return (
        <View style={styles.slide}>
          <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>
            {item.title}
          </Animated.Text>
          <Animated.Text style={[styles.description, { opacity: descriptionOpacity }]}>
            {item.description}
          </Animated.Text>
          
          {/* Loading Animation */}
          {isCalculatingGoals && (
            <Animated.View style={[styles.loadingContainer, { opacity: loadingOpacity }]}>
              <View style={styles.loadingIconContainer}>
                <Animated.View style={{
                  transform: [{
                    rotate: rotationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }}>
                  <Svg width={60} height={60} viewBox="0 0 60 60">
                    <Circle
                      cx="30"
                      cy="30"
                      r="25"
                      stroke={isDark ? "#FFF" : "#000"}
                      strokeWidth="5"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray="120,180"
                    />
                  </Svg>
                </Animated.View>
              </View>
              <Animated.Text style={[
                styles.loadingText, 
                { 
                  opacity: loadingMessageOpacity,
                  color: isDark ? '#FFF' : '#000',
                  fontSize: 20 * scale,
                  fontWeight: '600',
                  textAlign: 'center',
                  marginTop: 20 * scale
                }
              ]}>
                {currentLoadingMessage}
              </Animated.Text>
            </Animated.View>
          )}

          {/* Goals Content */}
          {!isCalculatingGoals && (
            <Animated.View style={[styles.goalsContent, { opacity: contentOpacity }]}>
              <View style={styles.goalsContainer}>
                {goalData.map((goal, index) => (
                  <GoalCard 
                    key={goal.label}
                    goal={goal}
                    animation={goalCardAnimations[index]}
                    styles={styles}
                  />
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
          )}
        </View>
      );
    }

    // Target weight step
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

    // Weight change options step
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
                  {!isSelected && (
                    <>
                      <BlurView
                        style={StyleSheet.absoluteFill}
                        intensity={100}
                        tint={isDark ? 'dark' : 'light'}
                      />
                      <View style={styles.featureItemBackground} />
                    </>
                  )}
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
                              ? (isDark ? '#ccc' : '#666')
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
                              ? (isDark ? '#ccc' : '#666')
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

    // Default case for user data input fields
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
              {item.options.map((option) => {
                const isSelected = userData[item.field] === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateUserData({ [item.field]: option });
                    }}
                    style={[
                      styles.option,
                      isSelected && styles.optionSelected
                    ]}
                  >
                    {!isSelected && (
                      <>
                        <BlurView
                          style={StyleSheet.absoluteFill}
                          intensity={100}
                          tint={isDark ? 'dark' : 'light'}
                        />
                        <View style={styles.featureItemBackground} />
                      </>
                    )}
                    <Text style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
                    {!isSelected && (
                      <>
                        <BlurView
                          style={StyleSheet.absoluteFill}
                          intensity={100}
                          tint={isDark ? 'dark' : 'light'}
                        />
                        <View style={styles.featureItemBackground} />
                      </>
                    )}
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

          <PrivacyFooter />

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

    // Add new rendering logic for step 10c
    if (item.id === '10c') {
      return (
        <View style={[styles.slide, { justifyContent: 'center' }]}>
          {isCalculatingGoals ? (
            // Loading Animation
            <Animated.View style={[styles.loadingContainer, { opacity: loadingOpacity }]}>
              <View style={styles.loadingIconContainer}>
                <Animated.View style={{
                  transform: [{
                    rotate: rotationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }}>
                  <Svg width={60} height={60} viewBox="0 0 60 60">
                    <Circle
                      cx="30"
                      cy="30"
                      r="25"
                      stroke={isDark ? "#FFF" : "#000"}
                      strokeWidth="5"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray="120,180"
                    />
                  </Svg>
                </Animated.View>
              </View>
              <Animated.Text style={[
                styles.loadingText, 
                { 
                  opacity: loadingMessageOpacity,
                  color: isDark ? '#FFF' : '#000',
                  fontSize: 20 * scale,
                  fontWeight: '600',
                  textAlign: 'center',
                  marginTop: 20 * scale
                }
              ]}>
                {currentLoadingMessage}
              </Animated.Text>
            </Animated.View>
          ) : (
            <>
              <Animated.View 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: intermediatePulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.05, 0.15]
                  })
                }}
              >
                <Animated.View style={{
                  position: 'absolute',
                  top: '5%',
                  left: '5%',
                  right: '5%',
                  bottom: '5%',
                  borderRadius: 30 * scale,
                  backgroundColor: isDark ? '#ffffff20' : '#00000015',
                  transform: [
                    { rotate: '10deg' },
                    { 
                      scale: intermediatePulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1.05]
                      }) 
                    }
                  ]
                }} />
                <Animated.View style={{
                  position: 'absolute',
                  top: '8%',
                  left: '8%',
                  right: '8%',
                  bottom: '8%',
                  borderRadius: 30 * scale,
                  backgroundColor: isDark ? '#ffffff15' : '#00000010',
                  transform: [
                    { rotate: '-5deg' },
                    { 
                      scale: intermediatePulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1.05, 0.95]
                      }) 
                    }
                  ]
                }} />
              </Animated.View>

              <AnimatedTextOnboarding
                text={item.title}
                colorScheme={isDark ? 'dark' : 'light'}
                style={[styles.title, { 
                  fontSize: (isSmallDevice ? 32 : 38) * scale, 
                  marginBottom: 24 * scale,
                  textAlign: 'center' 
                }]}
              />
              
              <AnimatedTextOnboarding
                text={item.description}
                colorScheme={isDark ? 'dark' : 'light'}
                style={[styles.description, { 
                  fontSize: (isSmallDevice ? 18 : 22) * scale,
                  marginBottom: 40 * scale,
                  textAlign: 'center'
                }]}
              />

              <View style={{
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 20 * scale
              }}>
                {item.features.map((feature, idx) => {
                  const animValue = featureAnimations[item.id]?.[idx] || new Animated.Value(0);
                  return (
                    <Animated.View 
                      key={feature.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 24 * scale,
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
                              inputRange: [0, 0.5, 0.8, 1],
                              outputRange: [0.3, 1.1, 0.9, 1],
                            }),
                          }
                        ],
                      }}
                    >
                      <Animated.View style={{
                        width: 60 * scale,
                        height: 60 * scale,
                        borderRadius: 30 * scale,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 16 * scale,
                        transform: [{ 
                          scale: animValue.interpolate({
                            inputRange: [0, 0.5, 0.8, 1],
                            outputRange: [0.2, 1.2, 0.9, 1],
                          }) 
                        }]
                      }}>
                        <Text style={{ fontSize: 30 * scale }}>{feature.icon}</Text>
                      </Animated.View>
                      <Animated.View style={{ 
                        flex: 1,
                        transform: [{
                          translateX: animValue.interpolate({
                            inputRange: [0, 0.5, 0.8, 1],
                            outputRange: [20, -10, 5, 0],
                          })
                        }]
                      }}>
                        <Text style={{
                          fontSize: 20 * scale,
                          fontWeight: '700',
                          color: isDark ? '#FFF' : '#000',
                          marginBottom: 4 * scale,
                        }}>
                          {feature.title}
                        </Text>
                        <Text style={{
                          fontSize: 16 * scale,
                          color: isDark ? '#CCC' : '#666',
                        }}>
                          {feature.description}
                        </Text>
                      </Animated.View>
                    </Animated.View>
                  );
                })}
              </View>

              <Animated.View style={{
                opacity: featureAnimations[item.id]?.[item.features.length - 1] || new Animated.Value(0),
                transform: [{
                  translateY: (featureAnimations[item.id]?.[item.features.length - 1] || new Animated.Value(0)).interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  })
                }]
              }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: isDark ? '#FFF' : '#000',
                    paddingVertical: 16 * scale,
                    paddingHorizontal: 32 * scale,
                    borderRadius: 25 * scale,
                    marginTop: 40 * scale,
                    alignSelf: 'center',
                    shadowColor: isDark ? '#000' : '#666',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 8,
                  }}
                  onPress={() => {
                    setIsButtonLoading(true); // Show loading indicator on the button
                    // Add a 350ms delay before executing the rest of the logic
                    setTimeout(() => {
                      setIsButtonLoading(false); // Hide button loading indicator
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      // Start the loading process and animations
                      setCurrentLoadingMessage(LOADING_MESSAGES[0].text);
                      setIsCalculatingGoals(true);
                      loadingOpacity.setValue(1);
                      loadingMessageOpacity.setValue(1);
                      
                      // Start rotation animation for the loading icon
                      Animated.loop(
                        Animated.timing(rotationAnim, {
                          toValue: 1,
                          duration: 1500,
                          useNativeDriver: true,
                        })
                      ).start();
                      
                      // Start the text animation sequence
                      const animateTextChange = (index, remainingTime) => {
                        if (index >= LOADING_MESSAGES.length) return;
                        
                        const currentMessage = LOADING_MESSAGES[index];
                        const fadeOutDuration = 300;
                        const fadeInDuration = 300;
                        const pauseDuration = 200; // Pause between fade out and fade in
                      
                        // First fade out the current text
                        Animated.timing(loadingMessageOpacity, {
                          toValue: 0,
                          duration: fadeOutDuration,
                          useNativeDriver: true,
                        }).start(() => {
                          // After fade out completes, wait a bit then change text and fade in
                          setTimeout(() => {
                            if (index + 1 < LOADING_MESSAGES.length) {
                              setCurrentLoadingMessage(LOADING_MESSAGES[index + 1].text);
                              
                              // Fade in the new text
                              Animated.timing(loadingMessageOpacity, {
                                toValue: 1,
                                duration: fadeInDuration,
                                useNativeDriver: true,
                              }).start();
                      
                              // Schedule next message change
                              const totalTransitionTime = fadeOutDuration + pauseDuration + fadeInDuration;
                              const nextMessageDelay = currentMessage.duration - totalTransitionTime;
                              
                              setTimeout(() => {
                                animateTextChange(index + 1, remainingTime - currentMessage.duration);
                              }, nextMessageDelay);
                            }
                          }, pauseDuration);
                        });
                      };
                      
                      // Calculate total duration and start the animation sequence
                      const totalDuration = LOADING_MESSAGES.reduce((sum, msg) => sum + msg.duration, 0);
                      animateTextChange(0, totalDuration);
                      
                      // After the animation sequence, calculate goals and proceed
                      setTimeout(() => {
                        // First fade out loading animation
                        Animated.timing(loadingOpacity, {
                          toValue: 0,
                          duration: 500,
                          useNativeDriver: true,
                        }).start(() => {
                          // Calculate goals and move to next step
                          const goals = calculateGoals(userData);
                          setCalculatedGoals(goals);
                          setHasCalculatedGoals(true);
                          setIsCalculatingGoals(false);
                          handleNext();
                        });
                      }, totalDuration + 500);
                    }, 350); // 350ms delay
                  }}
                  disabled={isButtonLoading} // Disable button while its specific loading is active
                >
                  {isButtonLoading ? (
                    <ActivityIndicator size="small" color={isDark ? '#000' : '#FFF'} />
                  ) : (
                    <Text style={{
                      color: isDark ? '#000' : '#FFF',
                      fontSize: 22 * scale,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}>
                      Generate Plan
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </View>
      );
    }

    // Default fallback case
    return (
      <View style={styles.slide}>
        <Text style={styles.title}>{item.title}</Text>
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
                  true,
                  featureAnimations[item.id]?.[idx]
                )
              )}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }, [currentIndex, isDark, progressAnimationComplete, calculatedGoals, userData, styles, featureAnimations, isCalculatingGoals, goalData]);

  const handleValidationAndNext = () => {
    if (!isCurrentStepValid()) {
      const currentStep = filteredSteps[currentIndex];
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

  // Add privacy footer component
  const PrivacyFooter = () => (
    <Text style={styles.privacyFooter}>
      Your data and choices are stored securely on your device only. We never collect or transmit your personal information.
    </Text>
  );

  // NEW: A memoized filtered list of steps for FlatList
  const filteredSteps = useMemo(() => {
    return getFilteredSteps(userData);
  }, [userData]);

  // Initialize or update feature animations when needed
  useEffect(() => {
    const step = filteredSteps[currentIndex];
    if (!step?.features?.length) return;

    // If the animations haven't been created for this step yet
    if (!featureAnimations[step.id]) {
      featureAnimations[step.id] = step.features.map(() => new Animated.Value(0));
      setFeatureAnimations({ ...featureAnimations });
    }

    // Handle intermediate step animations
    if (step.id === '3.5' || step.id === '10c') {
      // Reset animations to 0 when step first appears
      featureAnimations[step.id].forEach(anim => anim.setValue(0));
      
      // Stagger animations for features with haptic feedback
      const animations = featureAnimations[step.id].map((anim, idx) => {
        const delay = 400 + (idx * 150);
        
        // Schedule haptic feedback to match animation timing
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, delay);
        
        return Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          delay: delay,
          useNativeDriver: true
        });
      });
      
      Animated.parallel(animations).start();
    }
    // ... existing code for other steps ...
  }, [currentIndex, filteredSteps, featureAnimations]);

  // Add effect to handle the delay on the second step
  useEffect(() => {
    const currentStep = filteredSteps?.[currentIndex];
    
    // Check if current step is the second step (id = '4')
    if (currentStep?.id === '4') {
      // Disable the continue button
      setIsContinueDisabled(true);
      
      // Enable it after 2 seconds
      const timer = setTimeout(() => {
        setIsContinueDisabled(false);
      }, 2000);
      
      // Clean up timer
      return () => clearTimeout(timer);
    }
  }, [currentIndex, filteredSteps]);

  // Special handling for step 10c - ensure animations play
  useEffect(() => {
    const currentStep = filteredSteps[currentIndex];
    if (!currentStep) return; // Skip if step doesn't exist
    
    if (currentStep.id === '10c' && !isCalculatingGoals && featureAnimations[currentStep.id]) {
      // Reset animations to 0
      featureAnimations[currentStep.id].forEach(anim => anim.setValue(0));
      
      // Stagger animations for features with haptic feedback
      const animations = featureAnimations[currentStep.id].map((anim, idx) => {
        const delay = 400 + (idx * 150);
        
        // Schedule haptic feedback to match animation timing
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, delay);
        
        return Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          delay: delay,
          useNativeDriver: true
        });
      });
      
      Animated.parallel(animations).start();
    }
  }, [currentIndex, filteredSteps, isCalculatingGoals, featureAnimations]);

  // Reset progress animation state when leaving the step
  useEffect(() => {
    // Find the index of the step with id '3' in the filtered list
    const progressStepIndex = filteredSteps.findIndex(step => step.id === '3');
    
    // Only reset if the progress step exists and we are no longer on it
    if (progressStepIndex !== -1 && currentIndex !== progressStepIndex) {
      setProgressAnimationComplete(false);
    }
  }, [currentIndex, filteredSteps]); // Add filteredSteps as dependency

  // Add this function to check if the current step has a start button
  const hasStartButton = (stepId) => {
    // Add the IDs of steps that have start buttons here
    const stepsWithStartButtons = ['3.5', '10c']; 
    return stepsWithStartButtons.includes(stepId);
  };

  // Improved function to determine if scrolling should be disabled
  const shouldDisableScroll = () => {
    if (!filteredSteps || filteredSteps.length === 0) return true;
    
    const currentStep = filteredSteps[currentIndex];
    if (!currentStep) return true;
    
    // Always disable during calculations
    if (isCalculatingGoals) return true;
    
    // Disable on steps with start buttons
    if (hasStartButton(currentStep.id)) return true;
    
    // Disable when continue button is disabled
    if (isContinueDisabled) return true;
    
    // Disable when current step is invalid
    if (!isCurrentStepValid()) return true;
    
    // Allow scrolling in all other cases
    return false;
  };

  // Add this new function to create a bouncing effect for better feedback
  const createBounceAnimation = () => {
    // Get current slide position
    const startPosition = currentIndex * width;
    
    // Create sequence of small movements to simulate a bounce
    Animated.sequence([
      // Move slightly in the direction of the attempted scroll
      Animated.timing(new Animated.Value(startPosition), {
        toValue: startPosition + 15,
        duration: 100,
        useNativeDriver: true
      }),
      // Bounce back to original position
      Animated.timing(new Animated.Value(startPosition + 15), {
        toValue: startPosition,
        duration: 150,
        useNativeDriver: true
      })
    ]).start();
    
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // NEW: Function to find a step by ID
  const findStepById = (stepId) => {
    return filteredSteps.findIndex(step => step?.id === stepId);
  };

  // Use the new function for step-specific logic
  useEffect(() => {
    // Find the index of the step with id '3' in the filtered list
    const progressStepIndex = findStepById('3');
    
    // Only reset if the progress step exists and we are no longer on it
    if (progressStepIndex !== -1 && currentIndex !== progressStepIndex) {
      setProgressAnimationComplete(false);
    }
  }, [currentIndex, filteredSteps]); // Add filteredSteps as dependency

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[
          StyleSheet.absoluteFill,
          { backgroundColor: isDark ? '#000000' : '#FFFFFF', opacity: backgroundFadeOpacity }
        ]} />
        <Animated.View style={[
          StyleSheet.absoluteFill,
          { opacity: backgroundFadeOpacity.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }) }
        ]}>
          <Image
            source={require('../assets/foodwelcome.jpg')}
            style={styles.backgroundImage}
            resizeMode='cover'
          />
          <BlurView
            style={StyleSheet.absoluteFill}
            intensity={100}
            tint={colorScheme}
          />
          <View style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.75)' }
          ]} />
        </Animated.View>
      </View>

      {filteredSteps && (
        <FlatList
          ref={flatListRef}
          data={filteredSteps}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          scrollEnabled={!shouldDisableScroll()}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          getItemLayout={getItemLayout}
          windowSize={3} // Allow rendering of one screen on either side of visible area
          maxToRenderPerBatch={1}
          initialNumToRender={1}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0
          }}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
            // Make sure the index is valid before setting it
            if (newIndex >= 0 && newIndex < filteredSteps.length) {
              setCurrentIndex(newIndex);
            }
          }}
          onScrollBeginDrag={(event) => {
            const currentStep = filteredSteps[currentIndex];
            const xOffset = event.nativeEvent.contentOffset.x;
            // Fix the direction detection logic
            // If xOffset < currentIndex * width, user is scrolling backward (to the left)
            // If xOffset > currentIndex * width, user is scrolling forward (to the right)
            const isScrollingForward = xOffset <= currentIndex * width ? false : true;
            
            // Determine if this scroll attempt should be blocked
            let shouldBlockScroll = false;
            let validationMessage = '';
            
            // Check various conditions that should prevent scrolling
            if (isScrollingForward && !isCurrentStepValid()) {
              shouldBlockScroll = true;
              validationMessage = 'Please complete this step first';
            } else if (isScrollingForward && isContinueDisabled) {
              shouldBlockScroll = true;
              validationMessage = 'Please wait for this step to complete';
            } else if (isScrollingForward && hasStartButton(currentStep?.id)) {
              shouldBlockScroll = true;
              validationMessage = 'Please use the button to continue';
            }
            
            // If scrolling should be blocked, prevent it and show feedback
            if (shouldBlockScroll) {
              // Add bounce animation and vibration feedback
              createBounceAnimation();
              
              // Ensure we stay on the current index
              flatListRef.current?.scrollToIndex({
                index: currentIndex,
                animated: true
              });
              
              // Show validation message
              showValidation(validationMessage);
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
      )}

      <Animated.View style={[
        styles.bottomContainer, 
        { 
          opacity: buttonContainerOpacity,
          // Use filteredSteps to check the current step ID
          display: (filteredSteps[currentIndex]?.id === '3.5' || filteredSteps[currentIndex]?.id === '10c') ? 'none' : 'flex'
        }
      ]}>
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
              (!isCurrentStepValid() || isContinueDisabled) && styles.disabledButton,
            ]}
            onPress={isContinueDisabled ? null : handleValidationAndNext}
            disabled={isContinueDisabled}
          >
            <Text style={styles.actionButtonText}>
              {currentIndex === filteredSteps.length - 1 ? 'Start Scanning' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;