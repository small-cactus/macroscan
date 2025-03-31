import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Dimensions, Animated, Text, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AIAnimatedText from './AIAnimatedText';
import AIAnimatedSubtitle from './AIAnimatedSubtitle';
import ShimmerText from '../components/ShimmerText';
// Import AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

// EXTREME SOLUTION: Global static reference that can be checked from anywhere
// This will be true if ANY FunctionalAIVisualization instance has blocked updates
global.FUNCTIONAL_AI_VISUALIZATION_BLOCK_ALL_UPDATES = false;

const { width } = Dimensions.get('window');

// Step states
const STEP_WAITING = 'waiting';
const STEP_ACTIVE = 'active';
const STEP_COMPLETED = 'completed';

// Animation durations
const DEFAULT_STEP_DURATION = 3000;
const EXPEDITED_STEP_DURATION = 2500;
const DEFAULT_SUBTITLE_INTERVAL = 1200;
const EXPEDITED_SUBTITLE_INTERVAL = 1000;

// Add class-level flag to block ALL updates after API finishes
let globalUpdateBlocker = false;
// Add a flag to track if this specific instance has completed freezing its state
let stateIsFrozen = false;
// Add timestamp for when API finished processing
let apiFinishedTimestamp = 0;
// CRITICAL: Add a permanent fixed search subtitle that can't be changed
let permanentSearchSubtitle = null;

// Constants for AsyncStorage keys - self-contained within this component
const SEARCH_QUERIES_KEY = '@nutrilens:search_queries';
const SEARCH_RESULTS_KEY = '@nutrilens:search_results';
const API_FINISHED_KEY = '@nutrilens:api_finished';
const DETECTED_FOOD_KEY = '@nutrilens:detected_food';

// Add the missing step state keys
const PROCESSING_STEP_KEY = '@nutrilens:processing_step';
const STEP_TIMESTAMP_KEY = '@nutrilens:step_timestamp';

// Step-specific AsyncStorage keys
const RECOGNIZE_STEP_ACTIVE_KEY = '@nutrilens:recognize_step_active';
const SEARCH_STEP_ACTIVE_KEY = '@nutrilens:search_step_active';
const PROCESS_STEP_ACTIVE_KEY = '@nutrilens:process_step_active';
const RESULT_STEP_ACTIVE_KEY = '@nutrilens:result_step_active';

const RECOGNIZE_STEP_COMPLETED_KEY = '@nutrilens:recognize_step_completed';
const SEARCH_STEP_COMPLETED_KEY = '@nutrilens:search_step_completed';
const PROCESS_STEP_COMPLETED_KEY = '@nutrilens:process_step_completed';
const RESULT_STEP_COMPLETED_KEY = '@nutrilens:result_step_completed';

// Define step constants
const STEP_RECOGNIZE = 'recognize';
const STEP_SEARCH = 'search';
const STEP_PROCESS = 'process';
const STEP_RESULT = 'result';

// Add a debug flag to control logging - set to false to reduce logs
const DEBUG_LOGGING = false;

// Helper for conditional logging
const debugLog = (...args) => {
  if (DEBUG_LOGGING) {
    console.log(...args);
  }
};

// Add constants for minimum step durations at the top of the file
const MIN_STEP_DURATIONS = {
  recognize: 1800,
  search: 1800,
  process: 2500, // Longer duration for process step
  result: 1500
};

const FunctionalAIVisualization = forwardRef(({ 
  isDark, 
  isVisible, 
  searchQueries = [], 
  searchResults = [], 
  foodItems = [],
  processingSteps = [],
  brandName = '',
  onComplete
}, ref) => {
  // Track the current state of each step
  const [stepStates, setStepStates] = useState({
    recognize: STEP_WAITING,
    search: STEP_WAITING,
    process: STEP_WAITING,
    result: STEP_WAITING
  });
  
  // Track if text animation is completed for each step
  const [textAnimCompleted, setTextAnimCompleted] = useState({
    recognize: false,
    search: false,
    process: false,
    result: false
  });
  
  // Animation value for steps container
  const stepsContainerAnim = useRef(new Animated.Value(1)).current;
  
  // Animation for the main container
  const containerAnim = useRef(new Animated.Value(0)).current;
  
  // Animation values for steps
  const recognizeAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const processAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  
  // Animation values for subtitles
  const recognizeSubtitleAnim = useRef(new Animated.Value(0)).current;
  const searchSubtitleAnim = useRef(new Animated.Value(0)).current;
  const processSubtitleAnim = useRef(new Animated.Value(0)).current;
  const resultSubtitleAnim = useRef(new Animated.Value(0)).current;
  
  // Animation values for checkmarks
  const recognizeCheckAnim = useRef(new Animated.Value(0)).current;
  const searchCheckAnim = useRef(new Animated.Value(0)).current;
  const processCheckAnim = useRef(new Animated.Value(0)).current;
  const resultCheckAnim = useRef(new Animated.Value(0)).current;
  
  // Animation values for spinners
  const recognizeSpinAnim = useRef(new Animated.Value(0)).current;
  const searchSpinAnim = useRef(new Animated.Value(0)).current;
  const processSpinAnim = useRef(new Animated.Value(0)).current;
  const resultSpinAnim = useRef(new Animated.Value(0)).current;
  
  // Food recognition subtitles that cycle
  const [recognizeSubtitles, setRecognizeSubtitles] = useState([
    'Analyzing image for food...',
    'Zooming in on food...',
    'Detecting ingredients...',
    'Categorizing food items...',
    'Measuring portion sizes...',
  ]);
  
  // Web search subtitles that cycle
  const [searchSubtitles, setSearchSubtitles] = useState([
    'Searching "USDA food database"...',
    'Clicking on link: "www.usda.gov"...',
    'Clicking on link: "www.fda.gov"...',
    'Clicking on link: "www.eatright.org"...',
    'Checking "European Food Safety Authority"...',
    'Accessing "WHO Nutrition Database"...',
    'Searching "NIH Dietary Supplements"...',
    'Checking "Harvard School of Public Health"...',
    'Looking at ingredient images...',
    'Comparing with similar foods...',
    'Accessing recipe databases...',
  ]);
  
  // Processing subtitles that cycle
  const [processSubtitles, setProcessSubtitles] = useState([
    'Calculating nutritional values...',
    'Applying AI algorithms...',
    'Cross-referencing research...',
    'Evaluating health impact...',
    'Optimizing recommendations...',
  ]);
  
  // Current subtitle indices
  const [currentRecognizeSubtitleIndex, setCurrentRecognizeSubtitleIndex] = useState(0);
  const [currentSearchSubtitleIndex, setCurrentSearchSubtitleIndex] = useState(0);
  const [currentProcessSubtitleIndex, setCurrentProcessSubtitleIndex] = useState(0);

  // Animation cleanup references
  const timeoutRefs = useRef([]);
  const intervalRefs = useRef([]);
  const shimmerLoopsRef = useRef([]);

  // Animation for the accuracy box
  const accuracyBoxAnim = useRef(new Animated.Value(0)).current;
  
  // Animation for component fade out
  const componentFadeOutAnim = useRef(new Animated.Value(1)).current;

  // Refs for AnimatedColorText components
  const recognizeTitleRef = useRef(null);
  const searchTitleRef = useRef(null);
  const processTitleRef = useRef(null);
  const resultTitleRef = useRef(null);
  
  const recognizeSubtitleRef = useRef(null);
  const searchSubtitleRef = useRef(null);
  const processSubtitleRef = useRef(null);
  const resultSubtitleRef = useRef(null);
  
  const accuracyTextRef = useRef(null);

  // Animation state
  const [isAnimationRunning, setIsAnimationRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isAPIFinished, setIsAPIFinished] = useState(false);
  const [isAnimationCompleted, setIsAnimationCompleted] = useState(false);
  const [currentLoadingStep, setCurrentLoadingStep] = useState(null);
  
  // Track detected food items
  const [detectedFood, setDetectedFood] = useState('');
  
  // Add arrays to persist real subtitles for each step
  const [realRecognizeSubtitles, setRealRecognizeSubtitles] = useState([]);
  const [realSearchSubtitles, setRealSearchSubtitles] = useState([]);
  const [realProcessSubtitles, setRealProcessSubtitles] = useState([]);
  
  // Start time reference for each step
  const stepStartTimeRef = useRef({
    recognize: 0,
    search: 0,
    process: 0,
    result: 0
  });
  
  // Timing configurations
  const [stepDuration, setStepDuration] = useState(DEFAULT_STEP_DURATION);
  const [subtitleInterval, setSubtitleInterval] = useState(DEFAULT_SUBTITLE_INTERVAL);

  // Haptic feedback functions
  const triggerStepHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  // Trigger less haptic feedback to reduce lag
  const triggerSubtitleHaptic = () => {
    // Only trigger haptic feedback every other time to reduce lag
    if (Math.random() > 0.5) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const triggerCompletionHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Start a spinner animation
  const startSpinner = (spinAnim) => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  };

  // Stop a spinner animation
  const stopSpinner = (spinAnim) => {
    spinAnim.stopAnimation();
    spinAnim.setValue(0);
  };
  
  // Function to update visualization with search results
  const updateWithSearchResults = (results) => {
    // Check frozen state flag first - most aggressive check
    if (stateIsFrozen) {
      debugLog('BLOCKING search results update - state is frozen');
      return;
    }
    
    // FIRST check the global flag before anything else
    if (globalUpdateBlocker) {
      debugLog('BLOCKING search results update - global update blocker active');
      return;
    }
    
    // More strict check to prevent ANY updates after API has finished
    if (!results || !results.length || isAPIFinished) {
      debugLog('Blocking search results update because API is finished or invalid results');
      return;
    }
    
    // Update processing subtitles with real result titles
    const newSubtitles = results.slice(0, 3).map(result => 
      `Analyzing "${result.title.substring(0, 30)}${result.title.length > 30 ? '...' : ''}"`
    );
    
    // Save real process subtitles for persistence
    setRealProcessSubtitles(prev => {
      const combined = [...prev, ...newSubtitles];
      // Remove duplicates
      return [...new Set(combined)];
    });
    
    setProcessSubtitles(prev => {
      // Keep some original subtitles
      const originalSubtitles = prev.filter(subtitle => 
        subtitle.includes('Calculating') || 
        subtitle.includes('Cross-referencing') || 
        subtitle.includes('Evaluating')
      );
      
      // Combine with new result subtitles
      return [...newSubtitles, ...originalSubtitles].slice(0, 8);
    });
    
    // If we're in the process step, immediately show a result subtitle
    if (stepStates.process === STEP_ACTIVE && newSubtitles.length > 0 && !stateIsFrozen) {
      setTimeout(() => {
        // Triple check before making any state changes
        if (!isAPIFinished && !globalUpdateBlocker && !stateIsFrozen) {
          setCurrentProcessSubtitleIndex(0); // Show the first real result immediately
          triggerSubtitleHaptic();
        }
      }, 50);
    }
  };
  
  // Function to update visualization with dynamic data
  const updateWithSearchQueries = (queries) => {
    // EXTREME MEASURE: If we have a permanent search subtitle, block ALL updates
    if (permanentSearchSubtitle) {
      debugLog('COMPLETE BLOCK: Permanent search subtitle set, blocking ALL query updates');
      return;
    }
  
    // Check frozen state flag first - most aggressive check
    if (stateIsFrozen) {
      debugLog('BLOCKING search query update - state is frozen');
      return;
    }
    
    // FIRST check the global flag before anything else
    if (globalUpdateBlocker) {
      debugLog('BLOCKING search query update - global update blocker active');
      return;
    }
    
    // More strict check to prevent ANY updates after API has finished
    if (!queries || !queries.length || isAPIFinished) {
      debugLog('Blocking search query update because API is finished or invalid queries');
      return;
    }
    
    debugLog('Updating search subtitles with queries:', queries);
    
    // Update search subtitles based on real queries
    const newSubtitles = queries.map(query => `Searching "${query}"...`);
    
    // Save real search subtitles for persistence
    setRealSearchSubtitles(prev => {
      const combined = [...prev, ...newSubtitles];
      // Remove duplicates
      return [...new Set(combined)];
    });
    
    // Preserve some original subtitles
    setSearchSubtitles(prev => {
      const originalSubtitles = prev.filter(subtitle => 
        subtitle.includes('Clicking on link:') || 
        subtitle.includes('Checking') || 
        subtitle.includes('Accessing')
      );
      
      // Combine with new query subtitles, prioritizing real queries
      return [...newSubtitles, ...originalSubtitles].slice(0, 12);
    });
    
    // If we're in the search step, immediately show one of the search queries
    if (stepStates.search === STEP_ACTIVE && !stateIsFrozen) {
      // Short delay to ensure setState has completed for searchSubtitles
      const lockTimeout = setTimeout(() => {
        // Triple check before any state changes
        if (!isAPIFinished && !globalUpdateBlocker && !stateIsFrozen && !permanentSearchSubtitle) {
          debugLog('Setting search subtitle to first query immediately');
          setCurrentSearchSubtitleIndex(0); // Show the first real query immediately
          triggerSubtitleHaptic();
        }
      }, 50);
      
      // Track this timeout to ensure we can cancel it if needed
      timeoutRefs.current.push(lockTimeout);
    }
    
    // Extract possible food items from queries
    if (queries.length > 0) {
      const foodKeywords = ['nutrition facts for', 'calories in', 'food', 'recipe'];
      const possibleFoodItem = queries.find(query => 
        foodKeywords.some(keyword => query.toLowerCase().includes(keyword.toLowerCase()))
      );
      
      if (possibleFoodItem) {
        // Try to extract the food name from the query
        const match = possibleFoodItem.match(/(?:nutrition facts for|calories in)\s+(.+?)(?:$|\.|,)/i);
        if (match && match[1]) {
          setDetectedFood(match[1].trim());
          
          // Also update the result subtitle based on detected food
          if (stepStates.result === STEP_ACTIVE && !isAPIFinished && !globalUpdateBlocker && !stateIsFrozen) {
            forceUpdateSubtitles();
          }
        }
      }
    }
  };
  
  // Function to update with food items
  const updateWithFoodItems = (items) => {
    // Check frozen state flag first - most aggressive check
    if (stateIsFrozen) {
      debugLog('BLOCKING food items update - state is frozen');
      return;
    }
    
    // FIRST check the global flag before anything else
    if (globalUpdateBlocker) {
      debugLog('BLOCKING food items update - global update blocker active');
      return;
    }
    
    // More strict check to prevent ANY updates after API has finished
    if (!items || !items.length || isAPIFinished) {
      debugLog('Blocking food items update because API is finished or invalid items');
      return;
    }
    
    debugLog('Updating with food items:', items);
    
    // Update recognition subtitles with real food items
    const newSubtitles = items.map(item => `Detected ${item}...`);
    
    // Save real food subtitles for persistence
    setRealRecognizeSubtitles(prev => {
      const combined = [...prev, ...newSubtitles];
      // Remove duplicates
      return [...new Set(combined)];
    });
    
    // If we're in the recognize step, immediately show a food item
    if (stepStates.recognize === STEP_ACTIVE && !stateIsFrozen) {
      if (newSubtitles.length > 0) {
        // Immediately update the current subtitle index
        if (!isAPIFinished && !globalUpdateBlocker && !stateIsFrozen) { // Triple check to prevent update after API finishes
          const newIndex = recognizeSubtitles.findIndex(item => item.includes(newSubtitles[0]));
          if (newIndex >= 0) {
            setCurrentRecognizeSubtitleIndex(newIndex);
          } else {
            // Add the subtitle at the beginning and update index
            setRecognizeSubtitles(prev => [newSubtitles[0], ...prev]);
            setCurrentRecognizeSubtitleIndex(0);
          }
          triggerSubtitleHaptic();
        }
      }
    }
    
    setRecognizeSubtitles(prev => {
      // Keep some original subtitles
      const originalSubtitles = prev.filter(subtitle => 
        subtitle.includes('Analyzing') || 
        subtitle.includes('Measuring') ||
        subtitle.includes('Zooming')
      );
      
      // Combine with new food item subtitles, prioritizing real detections
      return [...newSubtitles, ...originalSubtitles].slice(0, 8);
    });
    
    // Update detected food - be more aggressive about setting it
    if (items.length > 0) {
      // If there's no detected food yet, or if we have a better one (longer, more specific)
      if (!detectedFood || (items[0].length > detectedFood.length)) {
        setDetectedFood(items[0]);
        
        // Update result step subtitle as well if we're already there
        if (stepStates.result === STEP_ACTIVE && !isAPIFinished && !globalUpdateBlocker && !stateIsFrozen) {
          forceUpdateSubtitles();
        }
      }
    }
  };
  
  // Speed up remaining animations when API call finishes early
  const expediteAnimations = () => {
    debugLog('Expediting animations due to early API completion');
    
    // Set moderately faster durations - not too fast to maintain visual flow
    setStepDuration(EXPEDITED_STEP_DURATION);
    setSubtitleInterval(EXPEDITED_SUBTITLE_INTERVAL);
    
    // Get current active step and make sure we don't skip steps
    const currentStep = getCurrentStep();
    
    if (currentStep) {
      // Instead of clearing all timeouts, we'll just speed up the remaining animations
      // by shortening the duration for the current and next steps
      
      // Don't interrupt the current step if it's already in progress
      // Just let it complete naturally, but speed up the next steps
      const nextStep = getNextStep(currentStep);
      
      // If we're in the final step, just let it complete naturally
      if (currentStep === 'result' || !nextStep) {
        return;
      }
      
      // Let the current timeouts continue but at a faster pace for future steps
      debugLog(`Current step: ${currentStep}. Expediting future steps.`);
    }
  };
  
  // Get the current active step
  const getCurrentStep = () => {
    if (stepStates.recognize === STEP_ACTIVE) return 'recognize';
    if (stepStates.search === STEP_ACTIVE) return 'search';
    if (stepStates.process === STEP_ACTIVE) return 'process';
    if (stepStates.result === STEP_ACTIVE) return 'result';
    return null;
  };
  
  // Get the next step to transition to
  const getNextStep = (currentStep) => {
    switch (currentStep) {
      case 'recognize': return 'search';
      case 'search': return 'process';
      case 'process': return 'result';
      case 'result': return null;
      default: return null;
    }
  };
  
  // Handle transitioning to a new step
  const transitionToStep = (step) => {
    // Mark previous step as completed
    let previousStep;
    switch (step) {
      case 'search': previousStep = 'recognize'; break;
      case 'process': previousStep = 'search'; break;
      case 'result': previousStep = 'process'; break;
      default: previousStep = null;
    }
    
    if (previousStep) {
      completeStep(previousStep);
    }
    
    // Start the new step
    startStep(step);
  };
  
  // Start a specific step
  const startStep = (step) => {
    // Set the step as active in local state
    setStepStates(prev => ({ ...prev, [step]: STEP_ACTIVE }));
    stepStartTimeRef.current[step] = Date.now();
    setCurrentLoadingStep(step);
    triggerStepHaptic();
    
    // Update AsyncStorage (for other components to detect)
    updateStepStateInStorage(step, STEP_ACTIVE);
    
    // Start visual animations
    switch (step) {
      case 'recognize':
        startSpinner(recognizeSpinAnim);
        startStepAnimations(recognizeAnim, recognizeSubtitleAnim, step);
        break;
      case 'search':
        startSpinner(searchSpinAnim);
        startStepAnimations(searchAnim, searchSubtitleAnim, step);
        break;
      case 'process':
        startSpinner(processSpinAnim);
        startStepAnimations(processAnim, processSubtitleAnim, step);
        break;
      case 'result':
        startSpinner(resultSpinAnim);
        startStepAnimations(resultAnim, resultSubtitleAnim, step);
        break;
    }
  };
  
  // Start animations for a step
  const startStepAnimations = (stepAnim, subtitleAnim, step) => {
    // Always animate the step visually regardless of API state
    if (step === 'result') {
      debugLog('Starting result step animation');
      // For result step, use a more reliable animation sequence
      Animated.sequence([
        // First animate the icon in
        Animated.spring(stepAnim, {
          toValue: 1,
          tension: 80,
          friction: 5,
          useNativeDriver: true,
        }),
        // Then animate the subtitle in
        Animated.timing(subtitleAnim, {
          toValue: 1,
          duration: 300, // Slightly longer for more visibility
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // For other steps, use the standard animation
      Animated.sequence([
        Animated.spring(stepAnim, {
          toValue: 1,
          tension: 80,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    // After a delay, mark text animation as completed
    const textTimeout = setTimeout(() => {
      setTextAnimCompleted(prev => ({ ...prev, [step]: true }));
    }, 800);
    timeoutRefs.current.push(textTimeout);
    
    // Clear any existing intervals to prevent duplicates
    intervalRefs.current.forEach(interval => clearInterval(interval));
    intervalRefs.current = [];
    
    // Special handling for result step - always show it even if API is finished
    if (step === 'result') {
      // Force the result step to be visible
      if (resultAnim._value < 1) {
        resultAnim.setValue(1);
      }
      
      if (resultSubtitleAnim._value < 1) {
        resultSubtitleAnim.setValue(1);
      }
      
      // Set a meaningful subtitle for the result step
      if (detectedFood) {
        if (stepStates.result === STEP_ACTIVE) {
          setTimeout(() => {
            // Ensure subtitle is shown
            resultSubtitleAnim.setValue(1);
          }, 100);
        }
      }
    }
    
    // If API is already finished, don't start cycling subtitles
    if (isAPIFinished || globalUpdateBlocker || stateIsFrozen) {
      debugLog(`API already finished, not starting subtitle cycling for ${step}`);
      
      // Set a static subtitle for this step based on real data if available
      if (step === 'recognize' && realRecognizeSubtitles.length > 0) {
        setCurrentRecognizeSubtitleIndex(0);
      } else if (step === 'search' && realSearchSubtitles.length > 0) {
        setCurrentSearchSubtitleIndex(0);
      } else if (step === 'process' && realProcessSubtitles.length > 0) {
        setCurrentProcessSubtitleIndex(0);
      }
      
      return; // Don't set up cycling intervals but visuals will still show
    }
    
    // ENSURE THERE ARE ACTUAL SUBTITLES TO CYCLE THROUGH
    // If we don't have real subtitles, make sure we have default ones
    if (step === 'recognize' && recognizeSubtitles.length === 0) {
      setRecognizeSubtitles([
        'Analyzing image for food...',
        'Zooming in on food...',
        'Detecting ingredients...',
        'Categorizing food items...',
        'Measuring portion sizes...',
      ]);
    } else if (step === 'search' && searchSubtitles.length === 0) {
      setSearchSubtitles([
        'Searching "USDA food database"...',
        'Clicking on link: "www.usda.gov"...',
        'Clicking on link: "www.fda.gov"...',
        'Clicking on link: "www.eatright.org"...',
        'Checking "European Food Safety Authority"...',
        'Accessing "WHO Nutrition Database"...',
        'Searching "NIH Dietary Supplements"...',
        'Checking "Harvard School of Public Health"...',
        'Looking at ingredient images...',
        'Comparing with similar foods...',
        'Accessing recipe databases...',
      ]);
    } else if (step === 'process' && processSubtitles.length === 0) {
      setProcessSubtitles([
        'Calculating nutritional values...',
        'Applying AI algorithms...',
        'Cross-referencing research...',
        'Evaluating health impact...',
        'Optimizing recommendations...',
      ]);
    }
    
    // Set up interval for cycling subtitles - make sure we start with our real data if available
    if (step === 'recognize' && realRecognizeSubtitles.length > 0) {
      setCurrentRecognizeSubtitleIndex(0); // Start with the first real subtitle
    } else if (step === 'search' && realSearchSubtitles.length > 0) {
      setCurrentSearchSubtitleIndex(0); // Start with the first real subtitle
    } else if (step === 'process' && realProcessSubtitles.length > 0) {
      setCurrentProcessSubtitleIndex(0); // Start with the first real subtitle
    }
    
    // SPECIAL FIX FOR SEARCH STEP: If it's the search step, use a more direct approach
    if (step === 'search') {
      debugLog('Using enhanced interval handling for search step');
      
      // Create a shorter interval for search since subtitles can sometimes get stuck
      const searchInterval = setInterval(() => {
        // Check flags INSIDE the interval to catch any changes
        if (isAPIFinished || globalUpdateBlocker || stateIsFrozen) {
          clearInterval(searchInterval);
          return;
        }
        
        // Regular subtitle cycling logic
        if (realSearchSubtitles.length > 0) {
          setCurrentSearchSubtitleIndex(prevIndex => 
            (prevIndex + 1) % realSearchSubtitles.length
          );
        } else if (searchSubtitles.length > 0) { // Make sure there are subtitles to cycle through
          setCurrentSearchSubtitleIndex(prevIndex => 
            (prevIndex + 1) % searchSubtitles.length
          );
        }
        triggerSubtitleHaptic();
      }, subtitleInterval * 0.25); // Search subtitle cycles faster
      
      intervalRefs.current.push(searchInterval);
      return; // Return early to avoid setting other intervals
    }
    
    let interval;
    switch (step) {
      case 'recognize':
        interval = setInterval(() => {
          // Check if API is finished INSIDE the interval callback
          if (isAPIFinished || globalUpdateBlocker || stateIsFrozen) {
            clearInterval(interval);
            return;
          }
          
          // Only cycle through real subtitles if available
          if (realRecognizeSubtitles.length > 0) {
            setCurrentRecognizeSubtitleIndex(prevIndex => 
              (prevIndex + 1) % realRecognizeSubtitles.length
            );
          } else if (recognizeSubtitles.length > 0) { // Make sure there are subtitles to cycle through
            setCurrentRecognizeSubtitleIndex(prevIndex => 
              (prevIndex + 1) % recognizeSubtitles.length
            );
          }
          triggerSubtitleHaptic();
        }, subtitleInterval);
        break;
      case 'process':
        interval = setInterval(() => {
          // Check if API is finished INSIDE the interval callback
          if (isAPIFinished || globalUpdateBlocker || stateIsFrozen) {
            clearInterval(interval);
            return;
          }
          
          // Only cycle through real subtitles if available
          if (realProcessSubtitles.length > 0) {
            setCurrentProcessSubtitleIndex(prevIndex => 
              (prevIndex + 1) % realProcessSubtitles.length
            );
          } else if (processSubtitles.length > 0) { // Make sure there are subtitles to cycle through
            setCurrentProcessSubtitleIndex(prevIndex => 
              (prevIndex + 1) % processSubtitles.length
            );
          }
          triggerSubtitleHaptic();
        }, subtitleInterval * 0.66); // Process subtitle cycles at medium speed
        break;
      case 'result':
        // For result step, we don't need to cycle, but we ensure it's visible
        break;
    }
    
    if (interval) {
      // Store interval for later cleanup
      intervalRefs.current.push(interval);
    }
  };
  
  // Complete a specific step - optimized to reduce animation lag
  const completeStep = (step) => {
    // Don't proceed if state is frozen or API is finished
    if (stateIsFrozen && step !== 'result') {
      debugLog(`Blocking step completion for ${step} - state is frozen`);
      return;
    }
    
    // Clear intervals before updating states to prevent race conditions
    intervalRefs.current.forEach(interval => clearInterval(interval));
    intervalRefs.current = [];
    
    // Make sure the subtitle index is pointing to a real subtitle if available
    // This ensures we show meaningful information in the completed state
    if (step === 'recognize' && realRecognizeSubtitles.length > 0) {
      setCurrentRecognizeSubtitleIndex(0);
    } else if (step === 'search' && realSearchSubtitles.length > 0) {
      setCurrentSearchSubtitleIndex(0);
    } else if (step === 'process' && realProcessSubtitles.length > 0) {
      setCurrentProcessSubtitleIndex(0);
    }
    
    // Store a persistent completed subtitle value
    if (step === 'recognize') {
      // Create a more meaningful completed subtitle by selecting from real subtitles or detected food
      const completedSubtitle = realRecognizeSubtitles.length > 0 ? 
        realRecognizeSubtitles[0] : 
        detectedFood ? `Detected ${detectedFood}...` : 
        'Analysis complete';
      
      // Save it to the array to ensure it's preserved
      setRealRecognizeSubtitles(prev => 
        prev.includes(completedSubtitle) ? prev : [completedSubtitle, ...prev]
      );
    }
    
    // If the search step is being completed and API has finished, respect the permanent subtitle
    if (step === 'search' && (isAPIFinished || globalUpdateBlocker || stateIsFrozen)) {
      debugLog('Search step completed while API is finished - using permanent subtitle');
      
      // CRITICAL: Use the already-set permanent subtitle instead of creating a new one
      if (permanentSearchSubtitle) {
        debugLog('Using existing permanent search subtitle:', permanentSearchSubtitle);
        
        // Reset subtitle index to ensure we show the permanent subtitle
        setCurrentSearchSubtitleIndex(0);
      } else {
        debugLog('WARNING: No permanent search subtitle set, but state is frozen');
      }
    }
    
    // Stop spinner and show checkmark - now more optimized
    let checkAnim;
    switch (step) {
      case 'recognize':
        stopSpinner(recognizeSpinAnim);
        checkAnim = recognizeCheckAnim;
        break;
      case 'search':
        stopSpinner(searchSpinAnim);
        checkAnim = searchCheckAnim;
        break;
      case 'process':
        stopSpinner(processSpinAnim);
        checkAnim = processCheckAnim;
        break;
      case 'result':
        stopSpinner(resultSpinAnim);
        checkAnim = resultCheckAnim;
        break;
    }
    
    // Use optimized spring animation for checkmark
    Animated.spring(checkAnim, {
      toValue: 1,
      tension: 120, // Higher tension for faster spring
      friction: 4, // Lower friction for faster animation
      useNativeDriver: true,
    }).start();
    
    // Update step state
    setStepStates(prev => ({ ...prev, [step]: STEP_COMPLETED }));
    
    // Update AsyncStorage - but only if not already in that state
    AsyncStorage.getItem(
      step === 'recognize' ? RECOGNIZE_STEP_COMPLETED_KEY :
      step === 'search' ? SEARCH_STEP_COMPLETED_KEY :
      step === 'process' ? PROCESS_STEP_COMPLETED_KEY :
      RESULT_STEP_COMPLETED_KEY
    ).then(value => {
      if (value !== 'true') {
        updateStepStateInStorage(step, STEP_COMPLETED);
      }
    });
    
    triggerStepHaptic();
  };
  
  // Force update subtitles when new search data arrives
  const forceUpdateSubtitles = () => {
    // Check frozen state flag first - most aggressive check
    if (stateIsFrozen) {
      debugLog('BLOCKING forceUpdateSubtitles - state is frozen');
      return;
    }
    
    // Don't update anything if API is already finished or global blocker is active
    if (isAPIFinished || globalUpdateBlocker) {
      debugLog('Blocking forceUpdateSubtitles - API finished or global blocker active');
      return;
    }
    
    // Force a subtitle update by advancing the indices
    setCurrentRecognizeSubtitleIndex(prev => {
      // If we have real subtitles, make sure we're showing them
      if (realRecognizeSubtitles.length > 0) {
        return 0; // Always show the first real subtitle for consistency
      }
      return (prev + 1) % recognizeSubtitles.length;
    });
    
    setCurrentSearchSubtitleIndex(prev => {
      if (realSearchSubtitles.length > 0) {
        return 0;
      }
      return (prev + 1) % searchSubtitles.length;
    });
    
    setCurrentProcessSubtitleIndex(prev => {
      if (realProcessSubtitles.length > 0) {
        return 0;
      }
      return (prev + 1) % processSubtitles.length;
    });
  };

  // FREEZE ALL STATE by taking a snapshot and forcing it with new objects
  const freezeAllState = () => {
    // If state is already frozen, don't freeze again
    if (stateIsFrozen) {
      debugLog('State already frozen, skipping freezeAllState');
      return;
    }
    
    try {
      debugLog('FREEZING ALL STATE - blocking all future updates');
      
      // Mark state as frozen to prevent ANY further updates
      stateIsFrozen = true;
      debugLog('STATE IS NOW FROZEN - all update functions will be blocked');
      
      // AGGRESSIVELY clear all intervals that might update subtitles
      intervalRefs.current.forEach(interval => {
        clearInterval(interval);
        debugLog('Cleared interval in freezeAllState');
      });
      intervalRefs.current = [];
      
      // NOTE: We don't set subtitle values here - that should ONLY happen in setAPIFinishedInternal
      // This function now just makes sure no future updates can happen
    } catch (error) {
      console.error('Error freezing all state:', error);
    }
  };
  
  // Helper function to show accuracy box with animation
  const showAccuracyBox = () => {
    debugLog('Showing accuracy box');
    Animated.spring(accuracyBoxAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true
    }).start(() => {
      // Fade out after 1.5 seconds if API is finished
      if (isAPIFinished) {
        setTimeout(() => {
          debugLog('Fading out component after accuracy box shown');
          Animated.timing(componentFadeOutAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true
          }).start();
        }, 1500);
      }
    });
    
    // Haptic feedback
    triggerStepHaptic();
  };

  // Expose methods to the parent component via ref
  useImperativeHandle(ref, () => ({
    reset,
    updateWithSearchQueries,
    updateWithSearchResults,
    updateWithFoodItems,
    updateWithScanData,
    forceUpdateSubtitles,
    completeVisualization,
    canBeHidden, // New method to check if visualization can be safely hidden
    setAPIFinished: setAPIFinishedInternal, 
  }));

  useEffect(() => {
    if (isVisible && !isAnimationRunning) {
      // Reset states if component becomes visible
      setStepStates({
        recognize: STEP_WAITING,
        search: STEP_WAITING,
        process: STEP_WAITING,
        result: STEP_WAITING
      });
      
      setTextAnimCompleted({
        recognize: false,
        search: false,
        process: false,
        result: false
      });
      
      // Reset animation values as needed
      stepsContainerAnim.setValue(1);
      componentFadeOutAnim.setValue(1); // Ensure component is fully visible
      
      // Animate container in
      Animated.spring(containerAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
      
      // Update subtitles based on initial data
      if (searchQueries.length > 0) {
        updateWithSearchQueries(searchQueries);
      }
      
      if (searchResults.length > 0) {
        updateWithSearchResults(searchResults);
      }
      
      if (foodItems.length > 0) {
        updateWithFoodItems(foodItems);
      }
      
      if (brandName) {
        const brandSubtitle = `Identified ${brandName} brand...`;
        setRecognizeSubtitles(prev => {
          if (!prev.includes(brandSubtitle)) {
            return [brandSubtitle, ...prev.slice(0, prev.length - 1)];
          }
          return prev;
        });
      }
      
      // Start animation sequence
      setIsAnimationRunning(true);
      const animationTimeout = setTimeout(animateSequence, 800);
      timeoutRefs.current.push(animationTimeout);
      
      // Debug timer to check result step visibility
      const debugInterval = setInterval(() => {
        debugLog('DEBUG - Step states:', JSON.stringify(stepStates));
        debugLog('DEBUG - Result step state:', stepStates.result);
        debugLog('DEBUG - Animation values:', {
          result: resultAnim._value,
          resultSubtitle: resultSubtitleAnim._value,
          resultCheck: resultCheckAnim._value
        });
        
        // Force result step to be visible if it's in WAITING state for too long
        if (stepStates.recognize === STEP_COMPLETED && 
            stepStates.search === STEP_COMPLETED && 
            stepStates.process === STEP_COMPLETED && 
            stepStates.result === STEP_WAITING) {
          debugLog('DEBUG - Result step stuck in WAITING state, forcing ACTIVE');
          setStepStates(prev => ({...prev, result: STEP_ACTIVE}));
          resultAnim.setValue(1);
          resultSubtitleAnim.setValue(1);
          startSpinner(resultSpinAnim);
        }
      }, 2000);
      timeoutRefs.current.push(debugInterval);
      
      // Add a fail-safe timer to ensure result step is shown
      const resultFailSafeTimer = setTimeout(() => {
        const currentStep = getCurrentStep();
        
        // If result step isn't active or completed after 15 seconds, force it
        if (stepStates.result !== STEP_ACTIVE && stepStates.result !== STEP_COMPLETED) {
          debugLog('Fail-safe timer: Result step not shown after 15s, forcing it now');
          
          // Force all previous steps to completed state
          setStepStates(prev => ({
            recognize: STEP_COMPLETED,
            search: STEP_COMPLETED,
            process: STEP_COMPLETED,
            result: STEP_ACTIVE
          }));
          
          // Start the result step manually
          startStep('result');
          
          // Force result step to be visible
          resultAnim.setValue(1);
          resultSubtitleAnim.setValue(1);
          
          // Complete it after a delay
          setTimeout(() => {
            completeStep('result');
            
            // Show accuracy box
            setTimeout(() => {
              Animated.spring(accuracyBoxAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true
              }).start(() => {
                // Fade out after 1 second
                setTimeout(() => {
                  debugLog('Fail-safe: Fading out component');
                  Animated.timing(componentFadeOutAnim, {
                    toValue: 0,
                    duration: 800,
                    useNativeDriver: true
                  }).start();
                }, 1000);
              });
            }, 1000);
          }, 3000);
        }
      }, 15000);
      
      timeoutRefs.current.push(resultFailSafeTimer);
    }
    
    // Cleanup function
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      intervalRefs.current.forEach(interval => clearInterval(interval));
    };
  }, [isVisible]);
  
  // Watch for changes in search queries and results
  useEffect(() => {
    // Only process new search queries if API is not finished yet
    if (searchQueries.length > 0 && !isAPIFinished && !globalUpdateBlocker && !stateIsFrozen) {
      debugLog('Processing search queries from props update');
      updateWithSearchQueries(searchQueries);
    }
  }, [searchQueries, isAPIFinished]);
  
  useEffect(() => {
    // Only process new search results if API is not finished yet
    if (searchResults.length > 0 && !isAPIFinished && !globalUpdateBlocker && !stateIsFrozen) {
      debugLog('Processing search results from props update');
      updateWithSearchResults(searchResults);
    }
  }, [searchResults, isAPIFinished]);
  
  useEffect(() => {
    // Only process new food items if API is not finished yet
    if (foodItems.length > 0 && !isAPIFinished && !globalUpdateBlocker && !stateIsFrozen) {
      debugLog('Processing food items from props update');
      updateWithFoodItems(foodItems);
    }
  }, [foodItems, isAPIFinished]);
  
  // Watch for API finished state and stop ALL animations immediately
  useEffect(() => {
    if (isAPIFinished) {
      // Stop all subtitle cycling intervals when API call finishes
      intervalRefs.current.forEach(interval => {
        debugLog('Clearing interval after API finished:', interval);
        clearInterval(interval);
      });
      intervalRefs.current = [];
      
      // IMPORTANT: Stop any animations correctly by calling stopAnimation on the animated value
      try {
        // Stop animations correctly by calling the stopAnimation method on the Animated.Value
        searchSubtitleAnim.stopAnimation();
        processSubtitleAnim.stopAnimation();
      } catch (error) {
        console.error('Error stopping animations:', error);
      }
      
      // NOTE: We removed all subtitle setting code from here since it's handled in setAPIFinishedInternal
      // This avoids the duplicate setting problem
    }
  }, [isAPIFinished]);

  // Add a function to check if the API has finished
  const isApiFinishedInStorage = async () => {
    try {
      const apiFinishedValue = await AsyncStorage.getItem(API_FINISHED_KEY);
      return apiFinishedValue === 'true';
    } catch (error) {
      console.error('Error checking API finished state:', error);
      return false;
    }
  };

  // Modify the animateSequence function to include Process step logic for checking API completion
  const animateSequence = () => {
    debugLog('Starting animation sequence with FIXED timing');
    
    // Use a specific sequence with guaranteed timing
    const runFixedSequence = async () => {
      try {
        // First, make sure we have default subtitle arrays in case they're empty
        if (recognizeSubtitles.length === 0) {
          setRecognizeSubtitles([
            'Analyzing image for food...',
            'Zooming in on food...',
            'Detecting ingredients...',
            'Categorizing food items...',
            'Measuring portion sizes...',
          ]);
        }
        
        if (searchSubtitles.length === 0) {
          setSearchSubtitles([
            'Searching "USDA food database"...',
            'Clicking on link: "www.usda.gov"...',
            'Clicking on link: "www.fda.gov"...',
            'Clicking on link: "www.eatright.org"...',
            'Checking "European Food Safety Authority"...',
            'Accessing "WHO Nutrition Database"...',
            'Searching "NIH Dietary Supplements"...',
            'Checking "Harvard School of Public Health"...',
            'Looking at ingredient images...',
            'Comparing with similar foods...',
            'Accessing recipe databases...',
          ]);
        }
        
        if (processSubtitles.length === 0) {
          setProcessSubtitles([
            'Calculating nutritional values...',
            'Applying AI algorithms...',
            'Cross-referencing research...',
            'Evaluating health impact...',
            'Optimizing recommendations...',
          ]);
        }
        
        // Step 1: Food Recognition - START
        debugLog("STARTING STEP 1: Recognition");
        setStepStates(prev => ({...prev, recognize: STEP_ACTIVE}));
        triggerStepHaptic();
        startSpinner(recognizeSpinAnim);
        stepStartTimeRef.current.recognize = Date.now(); // Track start time
        
        // Animate the recognition step in - faster animations
        Animated.spring(recognizeAnim, {
          toValue: 1,
          tension: 80,
          friction: 5,
          useNativeDriver: true,
        }).start();
        
        // Short delay then show subtitle
        await new Promise(resolve => setTimeout(resolve, 200));
        
        Animated.timing(recognizeSubtitleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        
        // Mark text as completed after a delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setTextAnimCompleted(prev => ({ ...prev, recognize: true }));
        
        // Set up cycling interval and wait
        const recognizeInterval = setInterval(() => {
          // Only cycle if not frozen
          if (!isAPIFinished && !globalUpdateBlocker && !stateIsFrozen) {
            if (realRecognizeSubtitles.length > 0) {
              setCurrentRecognizeSubtitleIndex(prevIndex => 
                (prevIndex + 1) % realRecognizeSubtitles.length
              );
            } else if (recognizeSubtitles.length > 0) {
              setCurrentRecognizeSubtitleIndex(prevIndex => 
                (prevIndex + 1) % recognizeSubtitles.length
              );
            }
            triggerSubtitleHaptic();
          }
        }, subtitleInterval);
        
        intervalRefs.current.push(recognizeInterval);
        
        // Ensure minimum duration for recognize step
        const recognizeElapsed = Date.now() - stepStartTimeRef.current.recognize;
        if (recognizeElapsed < MIN_STEP_DURATIONS.recognize) {
          const remainingTime = MIN_STEP_DURATIONS.recognize - recognizeElapsed;
          await new Promise(resolve => {
            const timeoutId = setTimeout(resolve, remainingTime);
            timeoutRefs.current.push(timeoutId);
          });
        }
        
        // Clear interval
        clearInterval(recognizeInterval);
        
        // Check if API is finished before continuing
        if (isAPIFinished || await isApiFinishedInStorage()) {
          setIsAPIFinished(true);
          // If API is already finished, go directly to completing all steps
          debugLog("API ALREADY FINISHED - using expedited sequence");
          await runExpediteSequence();
          return;
        }
        
        // Step 1: Food Recognition - COMPLETE
        debugLog("COMPLETING STEP 1: Recognition");
        completeStep('recognize');
        
        // Short delay between steps
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Step 2: Web Search - START
        debugLog("STARTING STEP 2: Search");
        setStepStates(prev => ({...prev, search: STEP_ACTIVE}));
        triggerStepHaptic();
        startSpinner(searchSpinAnim);
        stepStartTimeRef.current.search = Date.now(); // Track start time
        
        // Animate the search step in - faster animations
        Animated.spring(searchAnim, {
          toValue: 1,
          tension: 80,
          friction: 5,
          useNativeDriver: true,
        }).start();
        
        // Short delay then show subtitle
        await new Promise(resolve => setTimeout(resolve, 200));
        
        Animated.timing(searchSubtitleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        
        // Mark text as completed after a delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setTextAnimCompleted(prev => ({ ...prev, search: true }));
        
        // Set up cycling interval and wait
        const searchInterval = setInterval(() => {
          // Only cycle if not frozen
          if (!isAPIFinished && !globalUpdateBlocker && !stateIsFrozen) {
            if (realSearchSubtitles.length > 0) {
              setCurrentSearchSubtitleIndex(prevIndex => 
                (prevIndex + 1) % realSearchSubtitles.length
              );
            } else if (searchSubtitles.length > 0) {
              setCurrentSearchSubtitleIndex(prevIndex => 
                (prevIndex + 1) % searchSubtitles.length
              );
            }
            triggerSubtitleHaptic();
          }
        }, subtitleInterval * 0.25); // Search subtitle cycles faster
        
        intervalRefs.current.push(searchInterval);
        
        // Ensure minimum duration for search step
        const searchElapsed = Date.now() - stepStartTimeRef.current.search;
        if (searchElapsed < MIN_STEP_DURATIONS.search) {
          const remainingTime = MIN_STEP_DURATIONS.search - searchElapsed;
          await new Promise(resolve => {
            const timeoutId = setTimeout(resolve, remainingTime);
            timeoutRefs.current.push(timeoutId);
          });
        }
        
        // Clear interval
        clearInterval(searchInterval);
        
        // Check if API is finished before continuing
        if (isAPIFinished || await isApiFinishedInStorage()) {
          setIsAPIFinished(true);
          // If API is already finished, go directly to completing all steps
          debugLog("API FINISHED DURING SEARCH - using expedited sequence");
          await runExpediteSequence('search');
          return;
        }
        
        // Step 2: Web Search - COMPLETE
        debugLog("COMPLETING STEP 2: Search");
        completeStep('search');
        
        // Short delay between steps
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Step 3: Processing - START
        debugLog("STARTING STEP 3: Process");
        setStepStates(prev => ({...prev, process: STEP_ACTIVE}));
        triggerStepHaptic();
        startSpinner(processSpinAnim);
        stepStartTimeRef.current.process = Date.now(); // Track start time
        
        // Animate the process step in - faster animations
        Animated.spring(processAnim, {
          toValue: 1,
          tension: 80,
          friction: 5,
          useNativeDriver: true,
        }).start();
        
        // Short delay then show subtitle
        await new Promise(resolve => setTimeout(resolve, 200));
        
        Animated.timing(processSubtitleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        
        // Mark text as completed after a delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setTextAnimCompleted(prev => ({ ...prev, process: true }));
        
        // Set up cycling interval and wait
        const processInterval = setInterval(() => {
          // Only cycle if not frozen
          if (!isAPIFinished && !globalUpdateBlocker && !stateIsFrozen) {
            if (realProcessSubtitles.length > 0) {
              setCurrentProcessSubtitleIndex(prevIndex => 
                (prevIndex + 1) % realProcessSubtitles.length
              );
            } else if (processSubtitles.length > 0) {
              setCurrentProcessSubtitleIndex(prevIndex => 
                (prevIndex + 1) % processSubtitles.length
              );
            }
            triggerSubtitleHaptic();
          }
        }, subtitleInterval * 0.8); // Process subtitle cycles slower for more deliberate feel
        
        intervalRefs.current.push(processInterval);
        
        // For the process step, we need to wait until:
        // 1. The minimum duration has passed AND
        // 2. The API has finished OR a maximum timeout is reached
        
        // We'll check for API completion every second until either:
        // - The API is finished
        // - We've waited for a maximum amount of time
        const MAX_PROCESS_WAIT = 10000; // Max 10 seconds wait for API to finish during process
        const startWaitTime = Date.now();
        let apiFinished = false;
        
        // Enter polling loop for API completion
        while (!apiFinished) {
          // Check if API is finished
          apiFinished = isAPIFinished || await isApiFinishedInStorage();
          
          if (apiFinished) {
            setIsAPIFinished(true);
            debugLog("API IS NOW FINISHED - will complete process step soon");
            break;
          }
          
          // Check if we've waited long enough
          const currentElapsed = Date.now() - startWaitTime;
          if (currentElapsed >= MAX_PROCESS_WAIT) {
            debugLog("MAXIMUM PROCESS WAIT TIME REACHED - proceeding anyway");
            break;
          }
          
          // Wait a second before checking again
          await new Promise(resolve => {
            const timeoutId = setTimeout(resolve, 1000);
            timeoutRefs.current.push(timeoutId);
          });
        }
        
        // Ensure we've also waited the minimum duration
        const processElapsed = Date.now() - stepStartTimeRef.current.process;
        if (processElapsed < MIN_STEP_DURATIONS.process) {
          const remainingTime = MIN_STEP_DURATIONS.process - processElapsed;
          debugLog(`Waiting additional ${remainingTime}ms to ensure minimum process duration`);
          await new Promise(resolve => {
            const timeoutId = setTimeout(resolve, remainingTime);
            timeoutRefs.current.push(timeoutId);
          });
        }
        
        // Clear interval
        clearInterval(processInterval);
        
        // Check if API is finished and use expedited sequence if needed
        if (apiFinished) {
          // If API is finished, use expedited sequence
          debugLog("API FINISHED DURING PROCESS - using expedited sequence");
          await runExpediteSequence('process');
          return;
        }
        
        // Step 3: Processing - COMPLETE
        debugLog("COMPLETING STEP 3: Process");
        completeStep('process');
        
        // Short delay between steps
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Step 4: Results - START
        debugLog("STARTING STEP 4: Result");
        setStepStates(prev => ({...prev, result: STEP_ACTIVE}));
        triggerStepHaptic();
        startSpinner(resultSpinAnim);
        stepStartTimeRef.current.result = Date.now(); // Track start time
        
        // Make sure result step is visible
        resultAnim.setValue(1);
        
        // Short delay then show subtitle
        await new Promise(resolve => setTimeout(resolve, 200));
        
        resultSubtitleAnim.setValue(1);
        
        // Mark text as completed after a delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setTextAnimCompleted(prev => ({ ...prev, result: true }));
        
        // Ensure minimum duration for result step
        const resultElapsed = Date.now() - stepStartTimeRef.current.result;
        if (resultElapsed < MIN_STEP_DURATIONS.result) {
          const remainingTime = MIN_STEP_DURATIONS.result - resultElapsed;
          await new Promise(resolve => {
            const timeoutId = setTimeout(resolve, remainingTime);
            timeoutRefs.current.push(timeoutId);
          });
        }
        
        // Complete the result step
        debugLog("COMPLETING STEP 4: Result");
        completeStep('result');
        
        // Short delay before showing accuracy box
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Show accuracy box
        debugLog("SHOWING ACCURACY BOX");
        showAccuracyBox();
        
        // Mark animation as completed
        setIsAnimationCompleted(true);
        
        if (onComplete && typeof onComplete === 'function') {
          onComplete();
        }
      } catch (error) {
        console.error('Error in fixed animation sequence:', error);
        // Emergency fallback - force visualization to complete
        completeVisualization(true);
      }
    };
    
    // Expedited sequence to use when API finishes early - make it even faster
    const runExpediteSequence = async (currentStep = 'recognize') => {
      try {
        debugLog(`RUNNING EXPEDITED SEQUENCE FROM ${currentStep}`);
        
        // Even shorter step durations for expedited sequence
        const stepDuration = 1000;
        
        // Complete current step if it's not already completed
        switch (currentStep) {
          case 'recognize':
            if (stepStates.recognize !== STEP_COMPLETED) {
              debugLog("EXPEDITED: Completing recognize step");
              completeStep('recognize');
              await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            // Start and complete search step
            debugLog("EXPEDITED: Starting search step");
            setStepStates(prev => ({...prev, search: STEP_ACTIVE}));
            triggerStepHaptic();
            startSpinner(searchSpinAnim);
            searchAnim.setValue(1);
            searchSubtitleAnim.setValue(1);
            setTextAnimCompleted(prev => ({ ...prev, search: true }));
            
            await new Promise(resolve => setTimeout(resolve, stepDuration));
            
            debugLog("EXPEDITED: Completing search step");
            completeStep('search');
            await new Promise(resolve => setTimeout(resolve, 200));
            // Fall through to next step
            
          case 'search':
            if (currentStep === 'search' && stepStates.search !== STEP_COMPLETED) {
              debugLog("EXPEDITED: Completing search step");
              completeStep('search');
              await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            // Start and complete process step
            debugLog("EXPEDITED: Starting process step");
            setStepStates(prev => ({...prev, process: STEP_ACTIVE}));
            triggerStepHaptic();
            startSpinner(processSpinAnim);
            processAnim.setValue(1);
            processSubtitleAnim.setValue(1);
            setTextAnimCompleted(prev => ({ ...prev, process: true }));
            
            await new Promise(resolve => setTimeout(resolve, stepDuration));
            
            debugLog("EXPEDITED: Completing process step");
            completeStep('process');
            await new Promise(resolve => setTimeout(resolve, 200));
            // Fall through to next step
            
          case 'process':
            if (currentStep === 'process' && stepStates.process !== STEP_COMPLETED) {
              debugLog("EXPEDITED: Completing process step");
              completeStep('process');
              await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            // Start and complete result step
            debugLog("EXPEDITED: Starting result step");
            setStepStates(prev => ({...prev, result: STEP_ACTIVE}));
            triggerStepHaptic();
            startSpinner(resultSpinAnim);
            resultAnim.setValue(1);
            resultSubtitleAnim.setValue(1);
            setTextAnimCompleted(prev => ({ ...prev, result: true }));
            
            await new Promise(resolve => setTimeout(resolve, stepDuration));
            
            debugLog("EXPEDITED: Completing result step");
            completeStep('result');
            
            // Show accuracy box
            await new Promise(resolve => setTimeout(resolve, 300));
            debugLog("EXPEDITED: Showing accuracy box");
            showAccuracyBox();
            
            // Mark animation as completed
            setIsAnimationCompleted(true);
            
            if (onComplete && typeof onComplete === 'function') {
              onComplete();
            }
            break;
            
          case 'result':
            if (stepStates.result !== STEP_COMPLETED) {
              debugLog("EXPEDITED: Completing result step");
              completeStep('result');
              
              // Show accuracy box
              await new Promise(resolve => setTimeout(resolve, 300));
              debugLog("EXPEDITED: Showing accuracy box");
              showAccuracyBox();
              
              // Mark animation as completed
              setIsAnimationCompleted(true);
              
              if (onComplete && typeof onComplete === 'function') {
                onComplete();
              }
            }
            break;
        }
      } catch (error) {
        console.error('Error in expedited animation sequence:', error);
        // Emergency fallback - force visualization to complete
        completeVisualization(true);
      }
    };
    
    // Start the animation sequence with fixed timing
    runFixedSequence().catch(error => {
      console.error('Error in animation sequence:', error);
      // Emergency fallback
      completeVisualization(true);
    });
  };

  const getCheckmarkAnimation = (step) => {
    switch(step) {
      case 'recognize':
        return recognizeCheckAnim;
      case 'search':
        return searchCheckAnim;
      case 'process':
        return processCheckAnim;
      case 'result':
        return resultCheckAnim;
      default:
        return recognizeCheckAnim;
    }
  };
  
  const getSpinnerAnimation = (step) => {
    switch(step) {
      case 'recognize':
        return recognizeSpinAnim;
      case 'search':
        return searchSpinAnim;
      case 'process':
        return processSpinAnim;
      case 'result':
        return resultSpinAnim;
      default:
        return recognizeSpinAnim;
    }
  };
  
  const getCyclingSubtitle = (step) => {
    // EXTREME FIX: If we have a permanent search subtitle and this is the search step, use it
    if (step === 'search' && permanentSearchSubtitle) {
      return permanentSearchSubtitle;
    }
    
    switch(step) {
      case 'recognize':
        // For completed state, always return something meaningful
        if (stepStates[step] === STEP_COMPLETED) {
          if (realRecognizeSubtitles.length > 0) {
            return realRecognizeSubtitles[0];
          } else if (detectedFood) {
            return `Detected ${detectedFood}...`;
          } else if (foodItems && foodItems.length > 0) {
            return `Detected ${foodItems[0]}...`;
          }
          return 'Analysis complete';
        }
        
        // For active state, cycle through subtitles
        // Prioritize real subtitles if available
        if (realRecognizeSubtitles.length > 0) {
          const currentIndex = currentRecognizeSubtitleIndex % realRecognizeSubtitles.length;
          return realRecognizeSubtitles[currentIndex];
        }
        return recognizeSubtitles[currentRecognizeSubtitleIndex];
      
      case 'search':
        // For completed state, always return something meaningful
        if (stepStates[step] === STEP_COMPLETED) {
          if (realSearchSubtitles.length > 0) {
            return realSearchSubtitles[0];
          } else if (searchResults.length > 0) {
            return `Searched ${searchResults.length} websites`;
          }
          return 'Search complete';
        }
        
        // For active state, cycle through subtitles
        // Prioritize real subtitles if available
        if (realSearchSubtitles.length > 0) {
          const currentIndex = currentSearchSubtitleIndex % realSearchSubtitles.length;
          return realSearchSubtitles[currentIndex];
        }
        return searchSubtitles[currentSearchSubtitleIndex];
      
      case 'process':
        // For completed state, always return something meaningful
        if (stepStates[step] === STEP_COMPLETED) {
          if (realProcessSubtitles.length > 0) {
            return realProcessSubtitles[0];
          }
          return 'Processing complete';
        }
        
        // For active state, cycle through subtitles
        // Prioritize real subtitles if available
        if (realProcessSubtitles.length > 0) {
          const currentIndex = currentProcessSubtitleIndex % realProcessSubtitles.length;
          return realProcessSubtitles[currentIndex];
        }
        return processSubtitles[currentProcessSubtitleIndex];
      
      case 'result':
        if (stepStates[step] === STEP_COMPLETED) {
          if (detectedFood) {
            return `Nutrition facts for ${detectedFood} ready`;
          } else if (foodItems && foodItems.length > 0) {
            return `Nutrition facts for ${foodItems[0]} ready`;
          }
          return 'Results ready';
        }
        
        if (detectedFood) {
          return `Generating nutrition facts for ${detectedFood}...`;
        } else if (foodItems && foodItems.length > 0) {
          return `Generating nutrition facts for ${foodItems[0]}...`;
        }
        return 'Generating personalized nutrition insights...';
      
      default:
        return '';
    }
  };

  const renderStep = (icon, text, defaultSubtitle, animation, subtitleAnim, step, isLast = false, isDark) => {
    const checkAnim = getCheckmarkAnimation(step);
    const spinAnim = getSpinnerAnimation(step);
    const stepState = stepStates[step];
    const isTextAnimDone = textAnimCompleted[step];
    
    // Special handling for result step to ensure it's always visible WHEN IT SHOULD BE
    if (step === 'result') {
      // Only apply special rendering when result step is active or completed
      if (stepState === STEP_WAITING) {
        // Don't show at all when in waiting state
        return null;
      }
      
      // Special rendering for active or completed result step
      // If we're in the last step of the sequence, ensure visibility
      const forceOpacity = 1; // Force opacity to 1 for result step
      
      // Get the appropriate refs based on the step
      const titleRef = resultTitleRef;
      const subtitleRef = resultSubtitleRef;
      
      const spin = resultSpinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      });
      
      // Use the appropriate subtitle based on step state and cycling
      let displaySubtitle = '';
      
      // ENHANCED LOGIC: Priority order for result subtitle
      if (stepState === STEP_COMPLETED) {
        // For completed state, use more definitive language
        if (detectedFood) {
          displaySubtitle = `Nutrition facts for ${detectedFood} ready`;
        } else if (foodItems && foodItems.length > 0) {
          displaySubtitle = `Nutrition facts for ${foodItems[0]} ready`;
        } else {
          displaySubtitle = 'Results ready';
        }
      } else {
        // For active state
        if (detectedFood) {
          displaySubtitle = `Generating nutrition facts for ${detectedFood}...`;
        } else if (foodItems && foodItems.length > 0) {
          displaySubtitle = `Generating nutrition facts for ${foodItems[0]}...`;
        } else {
          displaySubtitle = 'Generating personalized nutrition insights...';
        }
      }
      
      // Override to always be fully visible
      const containerOpacity = 1;
      
      return (
        <View style={[styles.stepContainer, { opacity: forceOpacity }]}>
          <Animated.View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isDark ? '#2C2C2E' : '#000',
                borderColor: isDark ? '#333' : '#000',
                borderWidth: 1,
                opacity: 1, // Force opacity to 1
                transform: [
                  {
                    scale: 1, // Force scale to 1
                  },
                ],
              },
            ]}
          >
            <MaterialCommunityIcons
              name={icon}
              size={24}
              color={isDark ? '#FFF' : '#fff'}
            />
            
            {stepState === STEP_COMPLETED && (
              <Animated.View 
                style={[
                  styles.checkmarkOverlay,
                  {
                    opacity: 1, // Force opacity to 1 for result step checkmark
                    transform: [
                      { scale: 1 }, // Force scale to 1 for result step checkmark
                    ],
                    backgroundColor: isDark ? '#FFF' : '#fff',
                    borderColor: isDark ? '#333' : '#E0E0E0',
                    borderWidth: 1,
                  }
                ]}
              >
                <MaterialCommunityIcons
                  name="check"
                  size={18}
                  color={isDark ? '#000' : '#000'}
                />
              </Animated.View>
            )}
          </Animated.View>
          
          <View style={[styles.textContainer, { opacity: containerOpacity, paddingRight: 4 }]}>
            <View style={styles.textWrapper}>
              <Animated.View
                style={{
                  opacity: 1, // Force opacity to 1
                  position: 'relative',
                  overflow: 'hidden',
                  transform: [
                    { translateX: 0 }, // Force translateX to 0
                  ],
                }}
              >
                <ShimmerText
                  text={text}
                  style={[styles.stepText]}
                  isCompleted={stepState === STEP_COMPLETED}
                  completedColor={isDark ? '#CCC' : '#999999'}
                  baseColor={'#000'}
                  shimmerDuration={1600}
                />
              </Animated.View>
            </View>
            <Animated.View
              style={{
                opacity: 1, // Force opacity to 1
                transform: [
                  { translateY: 0 }, // Force translateY to 0
                  { translateX: 0 }, // Force translateX to 0
                ],
              }}
            >
              <AIAnimatedSubtitle
                text={displaySubtitle}
                style={[styles.subtitleText]}
                colorScheme={isDark ? 'dark' : 'light'}
                isCompleted={stepState === STEP_COMPLETED}
              />
            </Animated.View>
          </View>
          
          {stepState === STEP_ACTIVE && (
            <View style={{ marginLeft: 8 }}>
              <ActivityIndicator size="small" color={isDark ? '#FFF' : '#000'} />
            </View>
          )}
        </View>
      );
    }
    
    // Standard rendering for other steps
    // Get the appropriate refs based on the step
    const titleRef = 
      step === 'recognize' ? recognizeTitleRef :
      step === 'search' ? searchTitleRef :
      step === 'process' ? processTitleRef :
      resultTitleRef;
      
    const subtitleRef = 
      step === 'recognize' ? recognizeSubtitleRef :
      step === 'search' ? searchSubtitleRef :
      step === 'process' ? processSubtitleRef :
      resultSubtitleRef;
    
    const spin = spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
    
    // Use the appropriate subtitle based on step state and cycling
    const displaySubtitle = stepState === STEP_ACTIVE ? getCyclingSubtitle(step) : defaultSubtitle;
    
    // Determine opacity based on step state
    const containerOpacity = stepState === STEP_COMPLETED ? 0.7 : 1;
    
    return (
      <View style={styles.stepContainer}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isDark ? '#2C2C2E' : '#000',
              borderColor: isDark ? '#333' : '#000',
              borderWidth: 1,
              opacity: animation,
              transform: [
                {
                  scale: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={24}
            color={isDark ? '#FFF' : '#fff'}
          />
          
          {stepState === STEP_COMPLETED && (
            <Animated.View 
              style={[
                styles.checkmarkOverlay,
                {
                  opacity: checkAnim,
                  transform: [
                    { scale: checkAnim },
                  ],
                  backgroundColor: isDark ? '#FFF' : '#fff',
                  borderColor: isDark ? '#333' : '#E0E0E0',
                  borderWidth: 1,
                }
              ]}
            >
              <MaterialCommunityIcons
                name="check"
                size={18}
                color={isDark ? '#000' : '#000'}
              />
            </Animated.View>
          )}
        </Animated.View>
        
        <View style={[styles.textContainer, { opacity: containerOpacity, paddingRight: 4 }]}>
          <View style={styles.textWrapper}>
            <Animated.View
              style={{
                opacity: animation,
                position: 'relative',
                overflow: 'hidden',
                transform: [
                  { translateX: animation.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
                ],
              }}
            >
              {stepState === STEP_ACTIVE && !isTextAnimDone ? (
                <AIAnimatedText
                  text={text}
                  style={[styles.stepText, { color: isDark ? '#FFF' : '#000' }]}
                  typingSpeed={20000}
                  characterDelay={20000}
                  onComplete={() => { setTextAnimCompleted(prev => ({ ...prev, [step]: true })); }}
                />
              ) : (
                <ShimmerText
                  text={text}
                  style={[styles.stepText]}
                  isCompleted={stepState === STEP_COMPLETED}
                  completedColor={isDark ? '#CCC' : '#999999'}
                  baseColor={'#000'}
                  shimmerDuration={1600}
                />
              )}
            </Animated.View>
          </View>
          <Animated.View
            style={{
              opacity: subtitleAnim,
              transform: [
                { translateY: subtitleAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                { translateX: subtitleAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
              ],
            }}
          >
            <AIAnimatedSubtitle
              text={displaySubtitle}
              style={[styles.subtitleText]}
              colorScheme={isDark ? 'dark' : 'light'}
              isCompleted={stepState === STEP_COMPLETED}
            />
          </Animated.View>
        </View>
        
        {stepState === STEP_ACTIVE && (
          <View style={{ marginLeft: 8 }}>
            <ActivityIndicator size="small" color={isDark ? '#FFF' : '#000'} />
          </View>
        )}
        
        {!isLast && (
          <Animated.View
            style={[
              styles.connector,
              {
                backgroundColor: isDark ? '#333' : '#000',
                opacity: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.7],
                }),
              },
            ]}
          />
        )}
      </View>
    );
  };

  // Function to update the component with scan data
  const updateWithScanData = (data) => {
    if (!data) return;
    
    // Check frozen state flag first - most aggressive check
    if (stateIsFrozen) {
      debugLog('BLOCKING scan data update - state is frozen');
      return;
    }
    
    // Check for completed processing flag first
    if (data._isProcessingComplete && !isAPIFinished) {
      debugLog('API CALL FINISHED - Setting up final data');
      
      // Record timestamp when API finished
      apiFinishedTimestamp = Date.now();
      
      // IMMEDIATELY activate the global update blocker to prevent ANY further updates
      globalUpdateBlocker = true;
      global.FUNCTIONAL_AI_VISUALIZATION_BLOCK_ALL_UPDATES = true;
      debugLog('ACTIVATED global update blocker from updateWithScanData - all future updates will be blocked');
      
      // CRITICAL: Capture the final subtitle values BEFORE any additional state changes
      // This is the single place where final subtitle values should be determined
      let finalRecognizeSubtitle = '';
      let finalSearchSubtitle = '';
      let finalProcessSubtitle = '';
      let finalResultSubtitle = '';
      
      // Determine the final recognize subtitle
      if (realRecognizeSubtitles.length > 0) {
        finalRecognizeSubtitle = realRecognizeSubtitles[0];
      } else if (detectedFood) {
        finalRecognizeSubtitle = `Detected ${detectedFood}...`;
      } else if (foodItems && foodItems.length > 0) {
        finalRecognizeSubtitle = `Detected ${foodItems[0]}...`;
      } else {
        finalRecognizeSubtitle = 'Analysis complete';
      }
      
      // Determine the final search subtitle (THIS IS THE CRITICAL ONE)
      if (searchResults.length > 0) {
        finalSearchSubtitle = `Searched ${searchResults.length} websites`;
      } else if (realSearchSubtitles.length > 0) {
        finalSearchSubtitle = realSearchSubtitles[0];
      } else if (searchQueries.length > 0) {
        finalSearchSubtitle = `Searched for "${searchQueries[0]}"`;
      } else {
        finalSearchSubtitle = 'Search complete';
      }
      
      // Determine the final process subtitle
      if (realProcessSubtitles.length > 0) {
        finalProcessSubtitle = realProcessSubtitles[0];
      } else {
        finalProcessSubtitle = 'Processing complete';
      }
      
      // Determine the final result subtitle
      if (detectedFood) {
        finalResultSubtitle = `Generating nutrition facts for ${detectedFood}...`;
      } else if (foodItems && foodItems.length > 0) {
        finalResultSubtitle = `Generating nutrition facts for ${foodItems[0]}...`;
      } else {
        finalResultSubtitle = 'Generating personalized nutrition insights...';
      }
      
      debugLog('FINAL SUBTITLES CAPTURED:', {
        recognize: finalRecognizeSubtitle,
        search: finalSearchSubtitle,
        process: finalProcessSubtitle,
        result: finalResultSubtitle
      });
      
      // CRITICAL: Set the permanent search subtitle here - the ONLY place it should be set
      permanentSearchSubtitle = finalSearchSubtitle;
      debugLog('PERMANENT SEARCH SUBTITLE SET:', permanentSearchSubtitle);
      
      // Store the permanent subtitle in AsyncStorage
      try {
        AsyncStorage.setItem('@nutrilens:permanent_search_subtitle', permanentSearchSubtitle);
      } catch (error) {
        console.error('Error storing permanent search subtitle:', error);
      }
      
      // FREEZE EVERYTHING by completely replacing the subtitle arrays in a single batch of setState calls
      // Using the final values we captured above - this is the ONLY place that should set these arrays
      setRecognizeSubtitles([finalRecognizeSubtitle]);
      setSearchSubtitles([finalSearchSubtitle]);
      setProcessSubtitles([finalProcessSubtitle]);
      
      setRealRecognizeSubtitles([finalRecognizeSubtitle]);
      setRealSearchSubtitles([finalSearchSubtitle]);
      setRealProcessSubtitles([finalProcessSubtitle]);
      
      // Force indices to 0 - we only need to do this once
      setCurrentRecognizeSubtitleIndex(0);
      setCurrentSearchSubtitleIndex(0);
      setCurrentProcessSubtitleIndex(0);
      
      // Mark state as frozen to prevent ANY further updates
      stateIsFrozen = true;
      debugLog('STATE IS NOW FROZEN - all update functions will be blocked');
      
      // Stop subtitle cycling
      intervalRefs.current.forEach(interval => clearInterval(interval));
      intervalRefs.current = [];
      
      // Set API finished state
      setIsAPIFinished(true);
      
      // Record when the API finished for timeout purposes
      stepStartTimeRef.current.apiFinished = Date.now();
      
      // NOTE: We don't need to manually manage the animation sequence here.
      // The animation sequence (animateSequence function) now checks for isAPIFinished
      // and will automatically adjust its behavior accordingly.
      
      return; // Exit early after handling the API completion
    }
    
    // Extract food name if available (for non-completion updates)
    if (data.food && data.food.name && !isAPIFinished && !globalUpdateBlocker && !stateIsFrozen) {
      setDetectedFood(data.food.name);
      
      // Update recognize subtitles
      const newSubtitle = `Detected ${data.food.name}...`;
      setRecognizeSubtitles(prev => {
        if (!prev.includes(newSubtitle)) {
          return [newSubtitle, ...prev.slice(0, prev.length - 1)];
        }
        return prev;
      });
      
      // Add to real subtitles for persistence
      setRealRecognizeSubtitles(prev => {
        if (!prev.includes(newSubtitle)) {
          return [newSubtitle, ...prev];
        }
        return prev;
      });
      
      // Update the final step subtitle as well
      if (stepStates.result === STEP_ACTIVE) {
        forceUpdateSubtitles();
      }
    }
  };

  // Function to reset the component
  const reset = () => {
    debugLog('Resetting FunctionalAIVisualization');
    
    // Reset the global update blocker
    globalUpdateBlocker = false;
    // Reset state frozen flag
    stateIsFrozen = false;
    // Reset the global flag
    global.FUNCTIONAL_AI_VISUALIZATION_BLOCK_ALL_UPDATES = false;
    // Reset API finished timestamp
    apiFinishedTimestamp = 0;
    // Reset permanent search subtitle
    permanentSearchSubtitle = null;
    
    debugLog('Global blocker and state frozen flags reset - updates will be accepted');
    
    // Clear all timeouts and intervals
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    intervalRefs.current.forEach(interval => clearInterval(interval));
    timeoutRefs.current = [];
    intervalRefs.current = [];
    
    // Reset states
    setStepStates({
      recognize: STEP_WAITING,
      search: STEP_WAITING,
      process: STEP_WAITING,
      result: STEP_WAITING
    });
    
    // Reset text animation states
    setTextAnimCompleted({
      recognize: false,
      search: false,
      process: false,
      result: false
    });
    
    // Reset animation values
    containerAnim.setValue(0);
    recognizeAnim.setValue(0);
    searchAnim.setValue(0);
    processAnim.setValue(0);
    resultAnim.setValue(0);
    recognizeSubtitleAnim.setValue(0);
    searchSubtitleAnim.setValue(0);
    processSubtitleAnim.setValue(0);
    resultSubtitleAnim.setValue(0);
    recognizeCheckAnim.setValue(0);
    searchCheckAnim.setValue(0);
    processCheckAnim.setValue(0);
    resultCheckAnim.setValue(0);
    recognizeSpinAnim.setValue(0);
    searchSpinAnim.setValue(0);
    processSpinAnim.setValue(0);
    resultSpinAnim.setValue(0);
    accuracyBoxAnim.setValue(0);
    componentFadeOutAnim.setValue(1); // Reset fade-out animation
    
    // Reset subtitle indices
    setCurrentRecognizeSubtitleIndex(0);
    setCurrentSearchSubtitleIndex(0);
    setCurrentProcessSubtitleIndex(0);
    
    // Reset other states
    setIsAnimationRunning(false);
    setIsCompleted(false);
    setIsAPIFinished(false);
    setIsAnimationCompleted(false);
    setCurrentLoadingStep(null);
    setDetectedFood('');
    
    // Reset persisted subtitles
    setRealRecognizeSubtitles([]);
    setRealSearchSubtitles([]);
    setRealProcessSubtitles([]);
    
    // Reset subtitles to default values
    setRecognizeSubtitles([
      'Analyzing image for food...',
      'Zooming in on food...',
      'Detecting ingredients...',
      'Categorizing food items...',
      'Measuring portion sizes...',
    ]);
    
    setSearchSubtitles([
      'Searching "USDA food database"...',
      'Clicking on link: "www.usda.gov"...',
      'Clicking on link: "www.fda.gov"...',
      'Clicking on link: "www.eatright.org"...',
      'Checking "European Food Safety Authority"...',
      'Accessing "WHO Nutrition Database"...',
      'Searching "NIH Dietary Supplements"...',
      'Checking "Harvard School of Public Health"...',
      'Looking at ingredient images...',
      'Comparing with similar foods...',
      'Accessing recipe databases...',
    ]);
    
    setProcessSubtitles([
      'Calculating nutritional values...',
      'Applying AI algorithms...',
      'Cross-referencing research...',
      'Evaluating health impact...',
      'Optimizing recommendations...',
    ]);
    
    // Reset timing configurations to defaults
    setStepDuration(DEFAULT_STEP_DURATION);
    setSubtitleInterval(DEFAULT_SUBTITLE_INTERVAL);
    
    // Reset step start times
    stepStartTimeRef.current = {
      recognize: 0,
      search: 0,
      process: 0,
      result: 0
    };
  };
  
  // Function to check if visualization can be safely hidden
  const canBeHidden = () => {
    // We can always hide if everything is fully completed
    if (isCompleted) {
      return true;
    }
    
    // We can hide if API is finished and all animations have completed
    if (isAPIFinished && isAnimationCompleted) {
      return true;
    }
    
    // We can also hide if API is finished and all steps are at least in the final stage
    if (isAPIFinished && stepStates.recognize === STEP_COMPLETED && 
        stepStates.search === STEP_COMPLETED && 
        stepStates.process === STEP_COMPLETED &&
        (stepStates.result === STEP_COMPLETED || stepStates.result === STEP_ACTIVE)) {
      
      // Force completion of the visualization to ensure proper state
      if (stepStates.result === STEP_ACTIVE) {
        const forceCompleteTimeout = setTimeout(() => {
          completeVisualization(true);
        }, 500);
        timeoutRefs.current.push(forceCompleteTimeout);
      }
      
      return true;
    }
    
    // If the API call has been finished for a while (over 5 seconds), allow hiding
    if (isAPIFinished) {
      const apiFinishedTime = Date.now() - (stepStartTimeRef.current.apiFinished || 0);
      if (apiFinishedTime > 5000) {
        debugLog('API has been finished for over 5 seconds, allowing visualization to hide');
        
        // Force completion for a clean state
        if (!isCompleted) {
          completeVisualization(true);
        }
        
        return true;
      }
    }
    
    // If nothing has changed for a long time (15 seconds), allow hiding as safety measure
    const currentTime = Date.now();
    const lastActivityTime = Math.max(
      stepStartTimeRef.current.recognize || 0,
      stepStartTimeRef.current.search || 0, 
      stepStartTimeRef.current.process || 0,
      stepStartTimeRef.current.result || 0,
      stepStartTimeRef.current.apiFinished || 0
    );
    
    if (lastActivityTime > 0 && (currentTime - lastActivityTime > 15000)) {
      debugLog('No activity for over 15 seconds, allowing visualization to hide');
      return true;
    }
    
    // Otherwise, keep showing the visualization
    return false;
  };
  
  // Function to artificially complete the visualization for testing or forced completion
  const completeVisualization = (force = false) => {
    if (isCompleted && !force) return;
    
    const currentTime = Date.now();
    
    // Check if enough time has passed for each step (if not forcing)
    if (!force) {
      const recognizeTime = stepStartTimeRef.current.recognize ? 
        currentTime - stepStartTimeRef.current.recognize : 0;
      const searchTime = stepStartTimeRef.current.search ? 
        currentTime - stepStartTimeRef.current.search : 0;
      const processTime = stepStartTimeRef.current.process ? 
        currentTime - stepStartTimeRef.current.process : 0;
      
      // Require minimum times for natural progression
      if (recognizeTime < 2000 || searchTime < 2000 || processTime < 2000) {
        debugLog('Skipping forced completion - not enough time has passed');
        return;
      }
    }
    
    debugLog('Completing visualization' + (force ? ' (forced)' : ''));
    
    // Clear any running animations
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    intervalRefs.current.forEach(interval => clearInterval(interval));
    timeoutRefs.current = [];
    intervalRefs.current = [];
    
    // Ensure we have meaningful subtitles for completed states
    if (realRecognizeSubtitles.length === 0 && detectedFood) {
      setRealRecognizeSubtitles([`Detected ${detectedFood}...`]);
    }
    
    if (realSearchSubtitles.length === 0 && searchResults.length > 0) {
      setRealSearchSubtitles([`Searched ${searchResults.length} websites`]);
    }
    
    if (realProcessSubtitles.length === 0) {
      setRealProcessSubtitles(['Processing complete']);
    }
    
    // Immediately complete all steps
    setStepStates({
      recognize: STEP_COMPLETED,
      search: STEP_COMPLETED,
      process: STEP_COMPLETED,
      result: STEP_COMPLETED
    });
    
    // Ensure all text animations are completed
    setTextAnimCompleted({
      recognize: true,
      search: true,
      process: true,
      result: true
    });
    
    // Stop all spinners
    stopSpinner(recognizeSpinAnim);
    stopSpinner(searchSpinAnim);
    stopSpinner(processSpinAnim);
    stopSpinner(resultSpinAnim);
    
    // Show all check animations
    recognizeCheckAnim.setValue(1);
    searchCheckAnim.setValue(1);
    processCheckAnim.setValue(1);
    resultCheckAnim.setValue(1);
    
    // Show accuracy box
    Animated.spring(accuracyBoxAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true
    }).start(() => {
      // If API is finished, trigger fade out
      if (isAPIFinished) {
        setTimeout(() => {
          debugLog('Visualization complete and API finished, fading out component');
          Animated.timing(componentFadeOutAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true
          }).start();
        }, 1000);
      }
    });
    
    // Trigger haptic feedback
    triggerCompletionHaptic();
    
    // Mark animations as completed
    setIsAnimationCompleted(true);
    
    // Mark as completed
    setIsCompleted(true);
    
    // Add a delay before allowing the component to hide
    const finalDelay = setTimeout(() => {
      // Call onComplete callback if provided
      if (onComplete && typeof onComplete === 'function') {
        onComplete();
      }
    }, 2500); // Increased from 1500ms to 2500ms to give time to see completed state
    
    timeoutRefs.current.push(finalDelay);
  };

  // Modify the function to set API finished
  const setAPIFinishedInternal = async (finished) => {
    // Only update if we're changing from false to true to prevent re-renders
    if (finished && !isAPIFinished) {
      debugLog('API processing marked as finished, COMPLETELY FREEZING ALL STATE');
      
      try {
        // Store finished flag in AsyncStorage
        await AsyncStorage.setItem(API_FINISHED_KEY, 'true');
      } catch (error) {
        console.error('Error storing API finished flag:', error);
      }
      
      // Record timestamp when API finished
      apiFinishedTimestamp = Date.now();
      
      // IMMEDIATELY SET GLOBAL FLAG
      global.FUNCTIONAL_AI_VISUALIZATION_BLOCK_ALL_UPDATES = true;
      debugLog('GLOBAL UPDATE BLOCK ACTIVATED - ALL COMPONENTS WILL REJECT UPDATES');
      
      // IMMEDIATELY activate the global update blocker to prevent ANY further updates
      globalUpdateBlocker = true;
      debugLog('ACTIVATED global update blocker - all future updates will be blocked');
      
      // IMMEDIATELY clear all intervals that might be cycling through subtitles
      intervalRefs.current.forEach(interval => {
        debugLog('Clearing interval on API finish:', interval);
        clearInterval(interval);
      });
      intervalRefs.current = [];
      
      // CRITICAL: Capture the final subtitle values BEFORE any additional state changes
      // This is the single place where final subtitle values should be determined
      let finalRecognizeSubtitle = '';
      let finalSearchSubtitle = '';
      let finalProcessSubtitle = '';
      let finalResultSubtitle = '';
      
      // Determine the final recognize subtitle
      if (realRecognizeSubtitles.length > 0) {
        finalRecognizeSubtitle = realRecognizeSubtitles[0];
      } else if (detectedFood) {
        finalRecognizeSubtitle = `Detected ${detectedFood}...`;
      } else if (foodItems && foodItems.length > 0) {
        finalRecognizeSubtitle = `Detected ${foodItems[0]}...`;
      } else {
        finalRecognizeSubtitle = 'Analysis complete';
      }
      
      // Determine the final search subtitle (THIS IS THE CRITICAL ONE)
      if (searchResults.length > 0) {
        finalSearchSubtitle = `Searched ${searchResults.length} websites`;
      } else if (realSearchSubtitles.length > 0) {
        finalSearchSubtitle = realSearchSubtitles[0];
      } else if (searchQueries.length > 0) {
        finalSearchSubtitle = `Searched for "${searchQueries[0]}"`;
      } else {
        finalSearchSubtitle = 'Search complete';
      }
      
      // Determine the final process subtitle
      if (realProcessSubtitles.length > 0) {
        finalProcessSubtitle = realProcessSubtitles[0];
      } else {
        finalProcessSubtitle = 'Processing complete';
      }
      
      // Determine the final result subtitle
      if (detectedFood) {
        finalResultSubtitle = `Generating nutrition facts for ${detectedFood}...`;
      } else if (foodItems && foodItems.length > 0) {
        finalResultSubtitle = `Generating nutrition facts for ${foodItems[0]}...`;
      } else {
        finalResultSubtitle = 'Generating personalized nutrition insights...';
      }
      
      debugLog('FINAL SUBTITLES CAPTURED:', {
        recognize: finalRecognizeSubtitle,
        search: finalSearchSubtitle,
        process: finalProcessSubtitle,
        result: finalResultSubtitle
      });
      
      // CRITICAL: Set the permanent search subtitle here - the ONLY place it should be set
      permanentSearchSubtitle = finalSearchSubtitle;
      debugLog('PERMANENT SEARCH SUBTITLE SET:', permanentSearchSubtitle);
      
      // Store the permanent subtitle in AsyncStorage
      try {
        AsyncStorage.setItem('@nutrilens:permanent_search_subtitle', permanentSearchSubtitle);
      } catch (error) {
        console.error('Error storing permanent search subtitle:', error);
      }
      
      // FREEZE EVERYTHING by completely replacing the subtitle arrays in a single batch of setState calls
      // Using the final values we captured above - this is the ONLY place that should set these arrays
      setRecognizeSubtitles([finalRecognizeSubtitle]);
      setSearchSubtitles([finalSearchSubtitle]);
      setProcessSubtitles([finalProcessSubtitle]);
      
      setRealRecognizeSubtitles([finalRecognizeSubtitle]);
      setRealSearchSubtitles([finalSearchSubtitle]);
      setRealProcessSubtitles([finalProcessSubtitle]);
      
      // Force indices to 0 - we only need to do this once
      setCurrentRecognizeSubtitleIndex(0);
      setCurrentSearchSubtitleIndex(0);
      setCurrentProcessSubtitleIndex(0);
      
      // Mark state as frozen to prevent ANY further updates
      stateIsFrozen = true;
      debugLog('STATE IS NOW FROZEN - all update functions will be blocked');
      
      // Set API finished state
      setIsAPIFinished(finished);
      
      // Record when the API finished for timeout purposes
      stepStartTimeRef.current.apiFinished = Date.now();
    }
  };

  // In the FunctionalAIVisualization component, add a hook to pull data from AsyncStorage
  useEffect(() => {
    if (isVisible) {
      // Load data from AsyncStorage initially
      const loadStoredData = async () => {
        try {
          // Check if API is finished first
          const apiFinishedValue = await AsyncStorage.getItem(API_FINISHED_KEY);
          const apiFinished = apiFinishedValue === 'true';
          
          if (apiFinished) {
            debugLog('API already marked as finished in AsyncStorage - freezing state');
            // Block all updates and set globally
            global.FUNCTIONAL_AI_VISUALIZATION_BLOCK_ALL_UPDATES = true;
            globalUpdateBlocker = true;
            setIsAPIFinished(true);
            freezeAllState();
            return;
          }
          
          // Load step states to accurately reflect progress
          await loadStepStatesFromStorage();
          
          // Load search queries
          const queriesJson = await AsyncStorage.getItem(SEARCH_QUERIES_KEY);
          if (queriesJson) {
            const queries = JSON.parse(queriesJson);
            if (queries.length > 0) {
              debugLog('Loading stored queries from AsyncStorage:', queries);
              updateWithSearchQueries(queries);
            }
          }
          
          // Load search results
          const resultsJson = await AsyncStorage.getItem(SEARCH_RESULTS_KEY);
          if (resultsJson) {
            const results = JSON.parse(resultsJson);
            if (results.length > 0) {
              debugLog('Loading stored results from AsyncStorage:', results.length);
              updateWithSearchResults(results);
            }
          }
          
          // Load detected food
          const detectedFoodValue = await AsyncStorage.getItem(DETECTED_FOOD_KEY);
          if (detectedFoodValue) {
            debugLog('Loading detected food from AsyncStorage:', detectedFoodValue);
            setDetectedFood(detectedFoodValue);
          }
        } catch (error) {
          console.error('Error loading data from AsyncStorage:', error);
        }
      };
      
      loadStoredData();
      
      // Setup more frequent polling for immediate updates
      const pollingInterval = setInterval(async () => {
        try {
          // Check if API is finished
          const apiFinishedValue = await AsyncStorage.getItem(API_FINISHED_KEY);
          const apiFinished = apiFinishedValue === 'true';
          
          if (apiFinished && !isAPIFinished) {
            debugLog('API just marked as finished in AsyncStorage - freezing state');
            // Set API finished state
            setIsAPIFinished(true);
            
            // Block all updates and set globally
            global.FUNCTIONAL_AI_VISUALIZATION_BLOCK_ALL_UPDATES = true;
            globalUpdateBlocker = true;
            
            // Freeze state
            freezeAllState();
            
            // Clear the polling interval
            clearInterval(pollingInterval);
            return;
          }
          
          // Skip updates if API is finished or blockers are active
          if (isAPIFinished || globalUpdateBlocker || stateIsFrozen) {
            return;
          }
          
          // Update step states from AsyncStorage
          await loadStepStatesFromStorage();
          
          // Get latest queries
          const queriesJson = await AsyncStorage.getItem(SEARCH_QUERIES_KEY);
          if (queriesJson) {
            const queries = JSON.parse(queriesJson);
            if (queries.length > realSearchSubtitles.length) {
              debugLog('Found new queries in AsyncStorage:', queries.length);
              updateWithSearchQueries(queries);
            }
          }
          
          // Get latest results
          const resultsJson = await AsyncStorage.getItem(SEARCH_RESULTS_KEY);
          if (resultsJson) {
            const results = JSON.parse(resultsJson);
            if (results.length > 0 && searchResults.length !== results.length) {
              debugLog('Found new results in AsyncStorage:', results.length);
              updateWithSearchResults(results);
            }
          }
          
          // Get latest detected food
          const detectedFoodValue = await AsyncStorage.getItem(DETECTED_FOOD_KEY);
          if (detectedFoodValue && detectedFoodValue !== detectedFood) {
            debugLog('Found new detected food in AsyncStorage:', detectedFoodValue);
            setDetectedFood(detectedFoodValue);
          }
        } catch (error) {
          console.error('Error in polling interval:', error);
        }
      }, 250); // Reduced from 1000ms to 250ms for more immediate updates
      
      // Return cleanup function
      return () => {
        clearInterval(pollingInterval);
      };
    }
  }, [isVisible]);

  // Add a listener for direct AsyncStorage changes
  useEffect(() => {
    // Self-contained function to react to AsyncStorage change events
    const checkSpecificKeys = async () => {
      if (!isVisible || isAPIFinished || globalUpdateBlocker || stateIsFrozen) {
        return;
      }
      
      try {
        // Check for any step state changes
        await loadStepStatesFromStorage();
        
        // Check for new search data
        const queriesJson = await AsyncStorage.getItem(SEARCH_QUERIES_KEY);
        const resultsJson = await AsyncStorage.getItem(SEARCH_RESULTS_KEY);
        const detectedFoodValue = await AsyncStorage.getItem(DETECTED_FOOD_KEY);
        
        if (queriesJson) {
          const queries = JSON.parse(queriesJson);
          updateWithSearchQueries(queries);
        }
        
        if (resultsJson) {
          const results = JSON.parse(resultsJson);
          updateWithSearchResults(results);
        }
        
        if (detectedFoodValue) {
          setDetectedFood(detectedFoodValue);
        }
      } catch (error) {
        console.error('Error checking specific AsyncStorage keys:', error);
      }
    };
    
    if (isVisible) {
      // Set up a more frequent interval for critical keys
      const criticalUpdateInterval = setInterval(checkSpecificKeys, 150);
      
      return () => {
        clearInterval(criticalUpdateInterval);
      };
    }
  }, [isVisible, isAPIFinished, globalUpdateBlocker, stateIsFrozen]);

  // Add this new function to load step states from AsyncStorage
  const loadStepStatesFromStorage = async () => {
    try {
      // Get current processing step
      const currentStep = await AsyncStorage.getItem(PROCESSING_STEP_KEY);
      
      // Load active states for each step
      const recognizeActive = await AsyncStorage.getItem(RECOGNIZE_STEP_ACTIVE_KEY) === 'true';
      const searchActive = await AsyncStorage.getItem(SEARCH_STEP_ACTIVE_KEY) === 'true';
      const processActive = await AsyncStorage.getItem(PROCESS_STEP_ACTIVE_KEY) === 'true';
      const resultActive = await AsyncStorage.getItem(RESULT_STEP_ACTIVE_KEY) === 'true';
      
      // Load completed states for each step
      const recognizeCompleted = await AsyncStorage.getItem(RECOGNIZE_STEP_COMPLETED_KEY) === 'true';
      const searchCompleted = await AsyncStorage.getItem(SEARCH_STEP_COMPLETED_KEY) === 'true';
      const processCompleted = await AsyncStorage.getItem(PROCESS_STEP_COMPLETED_KEY) === 'true';
      const resultCompleted = await AsyncStorage.getItem(RESULT_STEP_COMPLETED_KEY) === 'true';
      
      // Update step states based on AsyncStorage values
      let newStepStates = {...stepStates};
      let hasChanges = false;
      
      // Determine state for each step (waiting, active, or completed)
      if (recognizeCompleted && newStepStates.recognize !== STEP_COMPLETED) {
        newStepStates.recognize = STEP_COMPLETED;
        hasChanges = true;
      } else if (recognizeActive && newStepStates.recognize !== STEP_ACTIVE) {
        newStepStates.recognize = STEP_ACTIVE;
        hasChanges = true;
      }
      
      if (searchCompleted && newStepStates.search !== STEP_COMPLETED) {
        newStepStates.search = STEP_COMPLETED;
        hasChanges = true;
      } else if (searchActive && newStepStates.search !== STEP_ACTIVE) {
        newStepStates.search = STEP_ACTIVE;
        hasChanges = true;
      }
      
      if (processCompleted && newStepStates.process !== STEP_COMPLETED) {
        newStepStates.process = STEP_COMPLETED;
        hasChanges = true;
      } else if (processActive && newStepStates.process !== STEP_ACTIVE) {
        newStepStates.process = STEP_ACTIVE;
        hasChanges = true;
      }
      
      if (resultCompleted && newStepStates.result !== STEP_COMPLETED) {
        newStepStates.result = STEP_COMPLETED;
        hasChanges = true;
      } else if (resultActive && newStepStates.result !== STEP_ACTIVE) {
        newStepStates.result = STEP_ACTIVE;
        hasChanges = true;
      }
      
      // Only update state if there's a change to prevent unnecessary renders
      if (hasChanges) {
        debugLog('Step state changes detected');
        setStepStates(newStepStates);
        
        // Start animations for active steps if needed
        if (newStepStates.recognize === STEP_ACTIVE && stepStates.recognize !== STEP_ACTIVE) {
          startStep('recognize');
        }
        if (newStepStates.search === STEP_ACTIVE && stepStates.search !== STEP_ACTIVE) {
          startStep('search');
        }
        if (newStepStates.process === STEP_ACTIVE && stepStates.process !== STEP_ACTIVE) {
          startStep('process');
        }
        if (newStepStates.result === STEP_ACTIVE && stepStates.result !== STEP_ACTIVE) {
          startStep('result');
        }
        
        // IMPORTANT: Complete steps that are marked as completed in storage
        if (newStepStates.recognize === STEP_COMPLETED && stepStates.recognize !== STEP_COMPLETED) {
          completeStep('recognize');
        }
        if (newStepStates.search === STEP_COMPLETED && stepStates.search !== STEP_COMPLETED) {
          completeStep('search');
        }
        if (newStepStates.process === STEP_COMPLETED && stepStates.process !== STEP_COMPLETED) {
          completeStep('process');
        }
        if (newStepStates.result === STEP_COMPLETED && stepStates.result !== STEP_COMPLETED) {
          completeStep('result');
        }
        
        // Update current loading step
        if (newStepStates.result === STEP_ACTIVE) {
          setCurrentLoadingStep('result');
        } else if (newStepStates.process === STEP_ACTIVE) {
          setCurrentLoadingStep('process');
        } else if (newStepStates.search === STEP_ACTIVE) {
          setCurrentLoadingStep('search');
        } else if (newStepStates.recognize === STEP_ACTIVE) {
          setCurrentLoadingStep('recognize');
        }
      }
    } catch (error) {
      console.error('Error loading step states from AsyncStorage:', error);
    }
  };

  // Add self-contained function to update step states in AsyncStorage
  const updateStepStateInStorage = async (step, state) => {
    try {
      if (state === STEP_ACTIVE) {
        // Mark step as active
        const activeKey = step === 'recognize' ? RECOGNIZE_STEP_ACTIVE_KEY :
                        step === 'search' ? SEARCH_STEP_ACTIVE_KEY :
                        step === 'process' ? PROCESS_STEP_ACTIVE_KEY : 
                        RESULT_STEP_ACTIVE_KEY;
        
        await AsyncStorage.setItem(activeKey, 'true');
        await AsyncStorage.setItem(PROCESSING_STEP_KEY, step);
        await AsyncStorage.setItem(STEP_TIMESTAMP_KEY, Date.now().toString());
      } else if (state === STEP_COMPLETED) {
        // Mark step as completed
        const completedKey = step === 'recognize' ? RECOGNIZE_STEP_COMPLETED_KEY :
                           step === 'search' ? SEARCH_STEP_COMPLETED_KEY :
                           step === 'process' ? PROCESS_STEP_COMPLETED_KEY : 
                           RESULT_STEP_COMPLETED_KEY;
        
        await AsyncStorage.setItem(completedKey, 'true');
      }
    } catch (error) {
      console.error(`Error updating step ${step} state in storage:`, error);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)',
            borderColor: isDark ? 'rgba(51, 51, 51, 0.5)' : '#bbb',
            borderWidth: 1,
            position: 'relative',
            opacity: Animated.multiply(containerAnim, componentFadeOutAnim),
            transform: [
              { 
                scale: containerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                })
              },
              {
                translateY: containerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                })
              }
            ]
          },
        ]}
      >
        <Animated.View 
          style={[
            styles.stepsContainer,
            { opacity: stepsContainerAnim }
          ]}
        >
          {renderStep(
            'food-apple', 
            'Food Recognition', 
            detectedFood ? `Found ${detectedFood} in your image` : 
              (foodItems && foodItems.length > 0) ? `Found ${foodItems[0]} in your image` :
              'Analyzing your image...',
            recognizeAnim,
            recognizeSubtitleAnim,
            'recognize',
            false,
            isDark
          )}
          {renderStep(
            'web', 
            'Web Search', 
            searchResults.length > 0 ? `Searched ${searchResults.length} websites` :
              searchQueries.length > 0 ? `Searching for "${searchQueries[0]}"` :
              'Searching nutrition databases...',
            searchAnim,
            searchSubtitleAnim,
            'search',
            false,
            isDark
          )}
          {renderStep(
            'brain', 
            'AI Processing', 
            'Analyzing nutrition data...',
            processAnim,
            processSubtitleAnim,
            'process',
            false,
            isDark
          )}
          {(stepStates.result === STEP_ACTIVE || stepStates.result === STEP_COMPLETED || 
           (isAPIFinished && stepStates.process === STEP_COMPLETED)) && renderStep(
            'flag', 
            'Results', 
            detectedFood ? `Nutrition facts for ${detectedFood}` : 
              (foodItems && foodItems.length > 0) ? `Nutrition facts for ${foodItems[0]}` :
              'Generating nutrition data...',
            resultAnim,
            resultSubtitleAnim,
            'result',
            true,
            isDark
          )}
        </Animated.View>
        
        {/* Accuracy information box */}
        <Animated.View 
          style={[
            styles.accuracyBox,
            {
              borderColor: isDark ? 'rgba(51, 51, 51, 0.5)' : 'rgba(224, 224, 224, 0.5)',
              backgroundColor: isDark ? 'rgba(44, 44, 46, 0.8)' : 'rgba(248, 248, 248, 0.8)',
              opacity: accuracyBoxAnim,
              transform: [
                { 
                  translateY: accuracyBoxAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                },
                {
                  scale: accuracyBoxAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1]
                  })
                }
              ]
            }
          ]}
        >
          <View style={styles.accuracyContent}>
            <MaterialCommunityIcons 
              name="shield-check" 
              size={22} 
              color={isDark ? '#FFF' : '#666'} 
              style={styles.accuracyIcon}
            />
            <Text
              style={[styles.accuracyText, { color: isDark ? '#CCC' : '#333' }]}
            >
              We verify multiple websites and databases to ensure accuracy, every single time.
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  content: {
    borderRadius: 32,
    padding: 20,
    width: width * 0.9,
    backgroundColor: '#fff',
    position: 'relative',
    minHeight: 380,
  },
  stepsContainer: {
    opacity: 1, // Will be animated
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 12,
    position: 'relative',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
    backgroundColor: '#000',
  },
  checkmarkOverlay: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    backgroundColor: '#fff',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    paddingTop: 2,
    paddingRight: 10, // Reduced padding since we no longer need room for the large spinner
  },
  textWrapper: {
    marginBottom: 4,
  },
  stepText: {
    fontSize: 17,
    fontWeight: '600',
    backgroundColor: 'transparent',
    letterSpacing: -0.3,
    color: '#000',
    minHeight: 24,
  },
  subtitleText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginLeft: 2,
    letterSpacing: -0.2,
    color: '#666',
    marginTop: 0,
    minHeight: 18,
  },
  connector: {
    position: 'absolute',
    left: 22,
    top: 42,
    width: 2,
    height: 36,
    backgroundColor: '#000',
  },
  accuracyBox: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accuracyContent: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accuracyIcon: {
    marginRight: 10,
  },
  accuracyText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  spinnerContainer: {
    position: 'absolute',
    right: 16,
    top: 14,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FunctionalAIVisualization;