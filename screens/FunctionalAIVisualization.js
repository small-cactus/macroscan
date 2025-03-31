import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Dimensions, Animated, Text, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AIAnimatedText from './AIAnimatedText';
import AIAnimatedSubtitle from './AIAnimatedSubtitle';
import ShimmerText from '../components/ShimmerText';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Step states
const STEP_WAITING = 'waiting';
const STEP_ACTIVE = 'active';
const STEP_COMPLETED = 'completed';

// Define minimum durations for each step
const MIN_RECOGNIZE_DURATION = 2000; // Increased for smoother transition
const MIN_SEARCH_DURATION = 3000; // Increased to ensure search step visibility
const MIN_PROCESS_DURATION = 2500; // Increased for smoother transition
const MIN_RESULT_DURATION = 2000; // Increased for smoother transition
const STEP_TRANSITION_DELAY = 500; // Added delay between steps

// Visualization component that actually works
const FunctionalAIVisualization = forwardRef(({ isDark, isVisible }, ref) => {
  // State for current step progression
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
  
  // Animation for the accuracy box
  const accuracyBoxAnim = useRef(new Animated.Value(0)).current;
  
  // Subtitles for each step
  const [recognizeSubtitle, setRecognizeSubtitle] = useState('Analyzing image for food...');
  const [searchSubtitle, setSearchSubtitle] = useState('Searching nutrition databases...');
  const [processSubtitle, setProcessSubtitle] = useState('Calculating nutritional values...');
  const [resultSubtitle, setResultSubtitle] = useState('Generating personalized nutrition insights...');
  
  // Detected food name
  const [detectedFood, setDetectedFood] = useState('');
  
  // Search results count
  const [searchResultsCount, setSearchResultsCount] = useState(0);

  // Animation cleanup references
  const timeoutRefs = useRef([]);
  const intervalRefs = useRef([]);
  
  // API finished state
  const [isAPIFinished, setIsAPIFinished] = useState(false);
  
  // Reference for current step
  const currentStepRef = useRef(null);
  
  // Last poll time for global state updates
  const lastPollTimeRef = useRef(Date.now());
  
  // Flag to track if we should poll for updates
  const shouldPollRef = useRef(true);
  
  // Track when each step started (for minimum duration enforcement)
  const stepStartTimeRefs = useRef({
    recognize: 0,
    search: 0,
    process: 0,
    result: 0
  });
  
  // Add state validation flag
  const [isValidatingState, setIsValidatingState] = useState(false);
  
  // Add last completed step tracking
  const lastCompletedStepRef = useRef(null);
  
  // Add step order validation
  const stepOrder = ['recognize', 'search', 'process', 'result'];
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    reset,
    resetForNewScan,
    updateWithFoodItems,
    updateWithSearchQueries,
    updateWithSearchResults,
    updateWithScanData,
    setAPIFinished,
    forceCompleteAllSteps,
    logState
  }), [stepStates, detectedFood, searchSubtitle, processSubtitle]);

  // Start a spinner animation
  const spinnerRefs = {
    recognize: useRef(new Animated.Value(0)).current,
    search: useRef(new Animated.Value(0)).current,
    process: useRef(new Animated.Value(0)).current,
    result: useRef(new Animated.Value(0)).current
  };
  
  const startSpinner = (step) => {
    const spinAnim = spinnerRefs[step];
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopSpinner = (step) => {
    const spinAnim = spinnerRefs[step];
    spinAnim.stopAnimation();
    spinAnim.setValue(0);
  };
  
  // Haptic feedback functions
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  
  const triggerCompletionHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Start a specific step
  const startStep = (step) => {
    console.log(`[VISUALIZER] Starting step: ${step}, current states:`, stepStates);
    if (stepStates[step] !== STEP_WAITING) return;
    
    currentStepRef.current = step;
    
    // Record the start time for this step
    stepStartTimeRefs.current[step] = Date.now();
    console.log(`[VISUALIZER] Recorded start time for ${step}: ${stepStartTimeRefs.current[step]}`);
    
    // Update state
    setStepStates(prev => ({ ...prev, [step]: STEP_ACTIVE }));
    
    // Start spinner
    startSpinner(step);
    
    // Animate in the step
    let stepAnim;
    let subtitleAnim;
    
    switch (step) {
      case 'recognize':
        stepAnim = recognizeAnim;
        subtitleAnim = recognizeSubtitleAnim;
        break;
      case 'search':
        stepAnim = searchAnim;
        subtitleAnim = searchSubtitleAnim;
        break;
      case 'process':
        stepAnim = processAnim;
        subtitleAnim = processSubtitleAnim;
        break;
      case 'result':
        stepAnim = resultAnim;
        subtitleAnim = resultSubtitleAnim;
        break;
    }
    
    // Animate the step in
        Animated.spring(stepAnim, {
          toValue: 1,
      tension: 50,
      friction: 7,
          useNativeDriver: true,
    }).start();
    
    // Animate the subtitle in after a short delay
    const subtitleTimeout = setTimeout(() => {
        Animated.timing(subtitleAnim, {
          toValue: 1,
        duration: 300,
          useNativeDriver: true,
      }).start();
    }, 200);
    
    timeoutRefs.current.push(subtitleTimeout);
    
    // Set text animation as completed after a delay
    const textTimeout = setTimeout(() => {
      setTextAnimCompleted(prev => ({ ...prev, [step]: true }));
    }, 1000);
    
    timeoutRefs.current.push(textTimeout);
    
    // Trigger haptic feedback
    triggerHaptic();
  };

  // Complete a specific step
  const completeStep = (step) => {
    console.log(`[VISUALIZER] Completing step: ${step}, current states:`, stepStates);
    
    // Validate step order
    const currentStepIndex = stepOrder.indexOf(step);
    const previousStep = currentStepIndex > 0 ? stepOrder[currentStepIndex - 1] : null;
    
    // Check if previous step is completed
    if (previousStep && stepStates[previousStep] !== STEP_COMPLETED) {
      console.log(`[VISUALIZER] Cannot complete ${step} - previous step ${previousStep} not completed`);
      return;
    }
    
    if (stepStates[step] !== STEP_ACTIVE) {
      console.log(`[VISUALIZER] Cannot complete step ${step} - not in ACTIVE state (current: ${stepStates[step]})`);
      
      // If we're trying to complete a step that's not active, we'll first need to start it
      if (stepStates[step] === STEP_WAITING) {
        console.log(`[VISUALIZER] Step ${step} is in WAITING state - starting it first`);
        startStep(step);
        
        // Get minimum duration for this step
        const minDuration = 
          step === 'recognize' ? MIN_RECOGNIZE_DURATION :
          step === 'search' ? MIN_SEARCH_DURATION :
          step === 'process' ? MIN_PROCESS_DURATION :
          MIN_RESULT_DURATION;
          
        // Schedule completion after the minimum duration
        const completeTimeout = setTimeout(() => {
          console.log(`[VISUALIZER] Now completing previously waiting step ${step} after minimum duration`);
          completeStep(step);
        }, minDuration);
        
        timeoutRefs.current.push(completeTimeout);
        return;
      }
      
      // If it's already completed, nothing to do
      if (stepStates[step] === STEP_COMPLETED) {
        console.log(`[VISUALIZER] Step ${step} already COMPLETED`);
        return;
      }
      
      return;
    }
    
    // Check if minimum duration has elapsed for this step
    const startTime = stepStartTimeRefs.current[step] || 0;
    const elapsed = Date.now() - startTime;
    const minDuration = 
      step === 'recognize' ? MIN_RECOGNIZE_DURATION :
      step === 'search' ? MIN_SEARCH_DURATION :
      step === 'process' ? MIN_PROCESS_DURATION :
      MIN_RESULT_DURATION;
      
    if (elapsed < minDuration) {
      const remaining = minDuration - elapsed;
      console.log(`[VISUALIZER] Step ${step} hasn't reached minimum duration, waiting ${remaining}ms before completing`);
      
      const delayedComplete = setTimeout(() => {
        console.log(`[VISUALIZER] Minimum duration reached for ${step}, now completing`);
        completeStep(step);
      }, remaining);
      
      timeoutRefs.current.push(delayedComplete);
      return;
    }
    
    // Update state to completed
    setStepStates(prev => ({ ...prev, [step]: STEP_COMPLETED }));
    lastCompletedStepRef.current = step;
    
    // Stop spinner
    stopSpinner(step);
    
    // Animate checkmark in
    let checkAnim;
    
    switch (step) {
      case 'recognize':
        checkAnim = recognizeCheckAnim;
        break;
      case 'search':
        checkAnim = searchCheckAnim;
        break;
      case 'process':
        checkAnim = processCheckAnim;
        break;
      case 'result':
        checkAnim = resultCheckAnim;
        break;
    }
    
    Animated.spring(checkAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start(() => {
      triggerCompletionHaptic();
      
      // Start next step after a delay if available
      const nextStepIndex = currentStepIndex + 1;
      if (nextStepIndex < stepOrder.length) {
        const nextStep = stepOrder[nextStepIndex];
        const startNextTimeout = setTimeout(() => {
          if (stepStates[nextStep] === STEP_WAITING) {
            console.log(`[VISUALIZER] Starting next step ${nextStep} after completion delay`);
            startStep(nextStep);
          }
        }, STEP_TRANSITION_DELAY);
        timeoutRefs.current.push(startNextTimeout);
      }
    });
  };

  // Get the next step
  const getNextStep = (step) => {
    switch (step) {
      case 'recognize':
        return 'search';
      case 'search':
        return 'process';
      case 'process':
        return 'result';
      default:
        return null;
    }
  };
  
  // Show the accuracy box
  const showAccuracyBox = () => {
    Animated.spring(accuracyBoxAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true
    }).start(() => {
      triggerCompletionHaptic();
    });
  };

  // Reset the component
  const reset = async () => {
    console.log('[VISUALIZER] Resetting component');
    
    // Clear all timeouts and intervals
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    intervalRefs.current.forEach(interval => clearInterval(interval));
    timeoutRefs.current = [];
    intervalRefs.current = [];
    
    // Reset state
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
    
    // Reset refs
    currentStepRef.current = null;
    lastCompletedStepRef.current = null;
    stepStartTimeRefs.current = {
      recognize: 0,
      search: 0,
      process: 0,
      result: 0
    };
    
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
    accuracyBoxAnim.setValue(0);
    
    // Reset spinners
    Object.values(spinnerRefs).forEach(spinAnim => {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    });
    
    // Reset subtitles
    setRecognizeSubtitle('Analyzing image for food...');
    setSearchSubtitle('Searching nutrition databases...');
    setProcessSubtitle('Calculating nutritional values...');
    setResultSubtitle('Generating personalized nutrition insights...');
    
    // Reset detected food and search results
    setDetectedFood('');
    setSearchResultsCount(0);
    
    // Reset API finished state
    setIsAPIFinished(false);
    
    // Clear AsyncStorage
    try {
      await AsyncStorage.multiRemove([
        '@nutrilens:search_queries',
        '@nutrilens:search_results',
        '@nutrilens:api_finished',
        '@nutrilens:detected_food',
        '@nutrilens:processing_step',
        '@nutrilens:step_timestamp',
        '@nutrilens:recognize_step_active',
        '@nutrilens:search_step_active',
        '@nutrilens:process_step_active',
        '@nutrilens:result_step_active',
        '@nutrilens:recognize_step_completed',
        '@nutrilens:search_step_completed',
        '@nutrilens:process_step_completed',
        '@nutrilens:result_step_completed'
      ]);
      console.log('[VISUALIZER] Cleared AsyncStorage');
    } catch (error) {
      console.error('[VISUALIZER] Error clearing AsyncStorage:', error);
    }
    
    // Reset global state
    if (global.NUTRILENS_VISUALIZATION) {
      global.NUTRILENS_VISUALIZATION = {
        currentStep: null,
        stepStates: {
          recognize: { active: false, completed: false },
          search: { active: false, completed: false },
          process: { active: false, completed: false },
          result: { active: false, completed: false }
        },
        subtitles: {
          recognize: [],
          search: [],
          process: [],
          result: []
        },
        detectedFood: "",
        updateTime: Date.now()
      };
    }
    
    // Reset validation state
    setIsValidatingState(false);
  };

  // Update with food items
  const updateWithFoodItems = (items) => {
    console.log('[VISUALIZER] updateWithFoodItems called with:', items);
    console.log('[VISUALIZER] Current step states:', stepStates);
    
    if (!items || !items.length) return;
    
    const foodName = items[0];
    if (foodName) {
      console.log(`[VISUALIZER] Setting detectedFood to: ${foodName}`);
      setDetectedFood(foodName);
      setRecognizeSubtitle(`Detected ${foodName}...`);
      
      // Update result subtitle with food name
      setResultSubtitle(`Generating nutrition facts for ${foodName}...`);
      
      // CRITICAL FIX: Actually progress from step 1 to step 2 when food is detected
      if (stepStates.recognize === STEP_ACTIVE && stepStates.recognize !== STEP_COMPLETED) {
        console.log('[VISUALIZER] Scheduling recognize step completion after 1500ms');
        
        // Complete recognize step after a short delay to let user see the food detection
        const completeTimeout = setTimeout(() => {
          console.log('[VISUALIZER] Timeout fired - completing recognize step');
          completeStep('recognize');
        }, 1500);
        
        timeoutRefs.current.push(completeTimeout);
      } else {
        console.log('[VISUALIZER] Not scheduling recognize completion:', { 
          isActive: stepStates.recognize === STEP_ACTIVE, 
          isCompleted: stepStates.recognize === STEP_COMPLETED 
        });
      }
    }
  };

  // Update with search queries
  const updateWithSearchQueries = (queries) => {
    console.log('[VISUALIZER] updateWithSearchQueries called with:', queries);
    if (!queries || !queries.length) return;
    
    // Update search subtitle with first query
    setSearchSubtitle(`Searching "${queries[0]}"...`);
    
    // Extract possible food name from queries
    const foodKeywords = ['nutrition facts for', 'calories in'];
    for (const query of queries) {
      if (!query) continue;
      
      for (const keyword of foodKeywords) {
        if (query.toLowerCase().includes(keyword)) {
          const match = query.match(new RegExp(`${keyword}\\s+(.+?)(?:$|\\.|,)`, 'i'));
          if (match && match[1]) {
            const foodName = match[1].trim();
            setDetectedFood(foodName);
            setRecognizeSubtitle(`Detected ${foodName}...`);
            setResultSubtitle(`Generating nutrition facts for ${foodName}...`);
          }
        }
      }
    }
    
    // Store the queries in the global state for other components
    if (global.NUTRILENS_VISUALIZATION) {
      global.NUTRILENS_VISUALIZATION.subtitles.search = queries.map(q => `Searching "${q}"...`);
      global.NUTRILENS_VISUALIZATION.updateTime = Date.now();
    }
    
    // Use the new search step update handler to ensure proper step transitions
    handleSearchStepUpdate(true, false);
  };

  // Update with search results
  const updateWithSearchResults = (results) => {
    console.log('[VISUALIZER] updateWithSearchResults called with:', results?.length, 'results');
    if (!results || !results.length) return;
    
    // Update search results count
    setSearchResultsCount(results.length);
    
    // Update process subtitle with first result title
    if (results[0] && results[0].title) {
      const title = results[0].title;
      const shortTitle = title.length > 20 ? title.substring(0, 20) + '...' : title;
      setProcessSubtitle(`Analyzing "${shortTitle}"`);
    }
    
    // Use the new search step update handler to ensure proper step transitions
    handleSearchStepUpdate(false, true);
  };

  // Update with scan data
  const updateWithScanData = (data) => {
    console.log('[VISUALIZER] updateWithScanData called with food:', data?.food?.name);
    console.log('[VISUALIZER] API completion status:', data?._isProcessingComplete);
    if (!data) return;
    
    // Track if we updated any state to trigger appropriate step transitions
    let foodUpdated = false;
    let queriesUpdated = false;
    let resultsUpdated = false;
    
    // Update detected food from scan data
    if (data.food && data.food.name) {
      const foodName = data.food.name;
      setDetectedFood(foodName);
      setRecognizeSubtitle(`Detected ${foodName}...`);
      setResultSubtitle(`Generating nutrition facts for ${foodName}...`);
      foodUpdated = true;
    }
    
    // Update search data
    if (data._searchInfo) {
      // Update search queries
      if (data._searchInfo.queries && data._searchInfo.queries.length > 0) {
        queriesUpdated = true;
        const query = data._searchInfo.queries[0];
        setSearchSubtitle(`Searching "${query}"...`);
      }
      
      // Update search results
      if (data._searchInfo.results && data._searchInfo.results.length > 0) {
        resultsUpdated = true;
        setSearchResultsCount(data._searchInfo.results.length);
        
        // Update process subtitle with first result title
        if (data._searchInfo.results[0] && data._searchInfo.results[0].title) {
          const title = data._searchInfo.results[0].title;
          const shortTitle = title.length > 20 ? title.substring(0, 20) + '...' : title;
          setProcessSubtitle(`Analyzing "${shortTitle}"`);
        }
      }
    }
    
    // Handle proper step transitions based on what was updated
    // 1. If food was updated, ensure recognize step is handled
    if (foodUpdated) {
      if (stepStates.recognize === STEP_WAITING) {
        startStep('recognize');
      }
      
      // If the recognize step is active, complete it after a delay
      if (stepStates.recognize === STEP_ACTIVE) {
        const completeTimeout = setTimeout(() => {
          completeStep('recognize');
        }, 1500);
        timeoutRefs.current.push(completeTimeout);
      }
    }
    
    // 2. If search data was updated, ensure search and process steps are handled
    if (queriesUpdated || resultsUpdated) {
      handleSearchStepUpdate(queriesUpdated, resultsUpdated);
    }
    
    // 3. If API is complete, make sure to mark it as finished
    if (data._isProcessingComplete) {
      // Allow some time to see current step before completion
      setTimeout(() => {
        setAPIFinished(true);
      }, 1000);
    }
  };

  // Mark API as finished
  const setAPIFinished = (finished) => {
    console.log(`[VISUALIZER] setAPIFinished called with: ${finished}`);
    console.log(`[VISUALIZER] Current isAPIFinished: ${isAPIFinished}`);
    console.log(`[VISUALIZER] Current stepStates:`, JSON.stringify(stepStates));
    console.log(`[VISUALIZER] Current step from ref: ${currentStepRef.current}`);
    
    if (finished && !isAPIFinished) {
      console.log('[VISUALIZER] Setting isAPIFinished to true');
          setIsAPIFinished(true);
      
      // Disable polling when API is finished
      shouldPollRef.current = false;
      
      // Capture current state of steps to ensure we have a consistent state to work with
      const currentStepStates = { ...stepStates };
      
      // Figure out which step we're on
      let currentActiveStep = null;
      let lastCompletedStepIndex = -1;
      const orderedSteps = ['recognize', 'search', 'process', 'result'];
      
      // Find which step is active or the last completed step
      for (let i = 0; i < orderedSteps.length; i++) {
        const step = orderedSteps[i];
        if (currentStepStates[step] === STEP_ACTIVE) {
          currentActiveStep = step;
            break;
        } else if (currentStepStates[step] === STEP_COMPLETED) {
          lastCompletedStepIndex = i;
        }
      }
      
      console.log(`[VISUALIZER] Current active step: ${currentActiveStep}, last completed step index: ${lastCompletedStepIndex}`);
      
      // Complete the active step if there is one
      if (currentActiveStep) {
        console.log(`[VISUALIZER] Completing current active step: ${currentActiveStep}`);
        completeStep(currentActiveStep);
        // Update our local record of step states
        currentStepStates[currentActiveStep] = STEP_COMPLETED;
        
        // Find the index of the step we just completed
        lastCompletedStepIndex = orderedSteps.indexOf(currentActiveStep);
      }
      
      // Complete all remaining steps in sequence
      let delay = 500;
      
      for (let i = lastCompletedStepIndex + 1; i < orderedSteps.length; i++) {
        const step = orderedSteps[i];
        
        if (currentStepStates[step] !== STEP_COMPLETED) {
          console.log(`[VISUALIZER] Scheduling step ${step} after ${delay}ms`);
          
          // Create a closure to capture the current step
          ((currentStep) => {
            // Schedule start of step
            const startTimeout = setTimeout(() => {
              console.log(`[VISUALIZER] Starting scheduled step ${currentStep}`);
              startStep(currentStep);
            }, delay);
            timeoutRefs.current.push(startTimeout);
            
            // Schedule completion of step
            const completeTimeout = setTimeout(() => {
              console.log(`[VISUALIZER] Completing scheduled step ${currentStep}`);
              completeStep(currentStep);
              
              // Show accuracy box if it's the last step
              if (currentStep === 'result') {
                setTimeout(() => {
                  showAccuracyBox();
                }, 500);
              }
            }, delay + 1000);
            timeoutRefs.current.push(completeTimeout);
          })(step);
          
          delay += 1500; // Increase delay for next step
        }
      }
      
      // If we're already not visible, force all steps to complete immediately
      if (!isVisible) {
        console.log('[VISUALIZER] API finished but component not visible, forcing immediate completion');
        forceCompleteAllSteps();
      }
    }
  };

  // Initialize the animation when component becomes visible
  useEffect(() => {
    console.log(`[VISUALIZER] isVisible changed to: ${isVisible}`);
    
    if (isVisible) {
      console.log('[VISUALIZER] Component became visible, animating container in');
      
      // Animate in the container
      Animated.spring(containerAnim, {
          toValue: 1,
        tension: 50,
        friction: 8,
          useNativeDriver: true,
        }).start();
        
      // Start with the recognize step
      const startTimeout = setTimeout(() => {
        console.log('[VISUALIZER] Starting recognize step after delay');
        startStep('recognize');
        
        // If we already have detected food, complete recognize step after a delay
        if (detectedFood) {
          console.log(`[VISUALIZER] Already have detected food: ${detectedFood}, scheduling recognize step completion`);
          const completeTimeout = setTimeout(() => {
            console.log('[VISUALIZER] Completing recognize step due to existing detectedFood');
            completeStep('recognize');
          }, 2000);
          
          timeoutRefs.current.push(completeTimeout);
        }
      }, 500);
      
      timeoutRefs.current.push(startTimeout);
    } else if (!isVisible && isAPIFinished) {
      // If we're hiding while API is finished, make sure all steps are completed
      // before actually cleaning up
      console.log('[VISUALIZER] Component becoming invisible but API is finished, forcing step completion');
      
      // Complete any active steps
      forceCompleteAllSteps();
    }
    
    // Cleanup on unmount or when becoming invisible
    return () => {
      console.log('[VISUALIZER] Running cleanup, clearing timeouts and intervals');
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      intervalRefs.current.forEach(interval => clearInterval(interval));
    };
  }, [isVisible]);
  
  // NEW: Add polling mechanism to check global state for updates
  useEffect(() => {
    if (!isVisible || isAPIFinished || !shouldPollRef.current) {
      return;
    }
    
    console.log('[VISUALIZER] Setting up polling for global state updates');
    
    const pollInterval = setInterval(() => {
      if (!global.NUTRILENS_VISUALIZATION_ACCESS || !shouldPollRef.current) {
          return;
        }
        
      try {
        // Get the latest visualization data
        const latestData = global.NUTRILENS_VISUALIZATION_ACCESS.getData();
        
        // Check if data has been updated since our last poll
        if (latestData && latestData.updateTime > lastPollTimeRef.current) {
          console.log('[VISUALIZER] Found new data in global state at timestamp:', latestData.updateTime);
          lastPollTimeRef.current = latestData.updateTime;
          
          // *** Add critical logging of global step states ***
          console.log('[VISUALIZER] Global step states:', {
            recognize: latestData.stepStates.recognize,
            search: latestData.stepStates.search,
            process: latestData.stepStates.process,
            result: latestData.stepStates.result,
            current: latestData.currentStep
          });
          
          // Check for new food detection
          let foodUpdated = false;
          if (latestData.detectedFood && latestData.detectedFood !== detectedFood) {
            setDetectedFood(latestData.detectedFood);
            setRecognizeSubtitle(`Detected ${latestData.detectedFood}...`);
            setResultSubtitle(`Generating nutrition facts for ${latestData.detectedFood}...`);
            foodUpdated = true;
          }
          
          // Check for search queries and results changes
          let queriesUpdated = false;
          let resultsUpdated = false;
          
          // Process subtitles for search queries
          if (latestData.subtitles && latestData.subtitles.search && latestData.subtitles.search.length > 0) {
            const searchSubtitles = latestData.subtitles.search;
            const latestSubtitle = searchSubtitles[searchSubtitles.length - 1];
            if (latestSubtitle && latestSubtitle !== searchSubtitle) {
              setSearchSubtitle(latestSubtitle);
              queriesUpdated = true;
            }
          }
          
          // Process subtitles for search results
          if (latestData.subtitles && latestData.subtitles.process && latestData.subtitles.process.length > 0) {
            const processSubtitles = latestData.subtitles.process;
            const latestSubtitle = processSubtitles[processSubtitles.length - 1];
            if (latestSubtitle && latestSubtitle !== processSubtitle) {
              setProcessSubtitle(latestSubtitle);
              resultsUpdated = true;
            }
          }
          
          // Process result subtitles separately
          if (latestData.subtitles && latestData.subtitles.result && latestData.subtitles.result.length > 0) {
            const resultSubtitles = latestData.subtitles.result;
            const latestSubtitle = resultSubtitles[resultSubtitles.length - 1];
            if (latestSubtitle) {
              setResultSubtitle(latestSubtitle);
            }
          }
          
          // If food, queries, or results were updated, make sure step transitions happen
          if (foodUpdated) {
            // If food was detected, ensure recognize step is started
            if (stepStates.recognize === STEP_WAITING) {
              startStep('recognize');
            }
            
            // Schedule recognize to complete after a short delay if it's active
            if (stepStates.recognize === STEP_ACTIVE) {
              const completeTimeout = setTimeout(() => {
              completeStep('recognize');
              }, 1500);
              timeoutRefs.current.push(completeTimeout);
            }
          }
          
          // Handle search-related updates
          if (queriesUpdated || resultsUpdated) {
            handleSearchStepUpdate(queriesUpdated, resultsUpdated);
          }
          
          // Process step states - only if no specific updates were detected
          if (!foodUpdated && !queriesUpdated && !resultsUpdated) {
            // For each step, check if we need to update our local state
            Object.entries(latestData.stepStates).forEach(([step, state]) => {
              if (state.active && stepStates[step] === STEP_WAITING) {
                console.log(`[VISUALIZER-POLL] Step ${step} is now active in global state, starting it locally`);
                startStep(step);
              } else if (state.completed && stepStates[step] !== STEP_COMPLETED) {
                console.log(`[VISUALIZER-POLL] Step ${step} is now completed in global state, completing it locally`);
                completeStep(step);
              }
            });
          }
          
          // Check if API finished
          if (latestData.apiFinished && !isAPIFinished) {
            console.log('[VISUALIZER] API marked as finished in global state, updating local state');
            // Small delay before setting API as finished to allow current step animations to complete
            setTimeout(() => {
              setAPIFinished(true);
            }, 1000);
          }
        }
      } catch (error) {
        console.error('[VISUALIZER] Error polling global state:', error);
      }
    }, 250);
    
    intervalRefs.current.push(pollInterval);
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [isVisible, isAPIFinished, stepStates, detectedFood, searchSubtitle, processSubtitle]);
  
  // Add a function to force completion of all steps immediately
  const forceCompleteAllSteps = () => {
    console.log('[VISUALIZER] Force completing all steps immediately');
    const steps = ['recognize', 'search', 'process', 'result'];
    
    // Force complete all steps in sequence with no delays
    steps.forEach(step => {
      if (stepStates[step] === STEP_WAITING) {
        console.log(`[VISUALIZER] Forcing step ${step} from WAITING to ACTIVE`);
        // Update state immediately
        setStepStates(prev => ({ ...prev, [step]: STEP_ACTIVE }));
      }
      
      if (stepStates[step] !== STEP_COMPLETED) {
        console.log(`[VISUALIZER] Forcing step ${step} to COMPLETED`);
        // Update state immediately
        setStepStates(prev => ({ ...prev, [step]: STEP_COMPLETED }));
      }
    });
        
        // Show accuracy box
        showAccuracyBox();
  };
  
  // Add effect to handle detectedFood changes
  useEffect(() => {
    console.log(`[VISUALIZER] detectedFood changed to: ${detectedFood}, recognize step state: ${stepStates.recognize}`);
    
    // If food is detected but recognize step is still active, complete it
    if (detectedFood && stepStates.recognize === STEP_ACTIVE) {
      console.log('Food detected, completing recognize step:', detectedFood);
      const completeTimeout = setTimeout(() => {
              completeStep('recognize');
      }, 1500);
      
      timeoutRefs.current.push(completeTimeout);
    }
  }, [detectedFood]);
  
  // Add new effect to log step state changes
  useEffect(() => {
    console.log('[VISUALIZER] Step states changed:', JSON.stringify(stepStates));
  }, [stepStates]);
  
  // Add debug function to reveal current state
  const logState = () => {
    console.log('[VISUALIZER-DEBUG] Current state:', {
      stepStates,
      currentStep: currentStepRef.current,
      detectedFood,
      searchResultsCount,
      isAPIFinished,
      isPolling: shouldPollRef.current,
      lastPollTime: lastPollTimeRef.current
    });
  };

  // Add an effect to handle transitions from global state when they might be missed by polling
  useEffect(() => {
    if (!isVisible || isAPIFinished) return;
    
    // Handle case where step sequence might be out of order
    const orderedSteps = ['recognize', 'search', 'process', 'result'];
    
    for (let i = 0; i < orderedSteps.length - 1; i++) {
      const currentStep = orderedSteps[i];
      const nextStep = orderedSteps[i + 1];
      
      // If this step is completed but the next isn't started, start it
      if (stepStates[currentStep] === STEP_COMPLETED && stepStates[nextStep] === STEP_WAITING) {
        console.log(`[VISUALIZER-RECOVERY] Found completed step ${currentStep} with waiting next step ${nextStep}, starting next step`);
        startStep(nextStep);
        break; // Only handle one transition at a time
      }
    }
  }, [stepStates, isVisible, isAPIFinished]);
  
  // Render a step
  const renderStep = (icon, text, step, isLast = false) => {
    const stepState = stepStates[step];
    const isTextAnimDone = textAnimCompleted[step];
    
    // Get animations for this step
    let stepAnim, subtitleAnim, checkAnim, subtitle;
    
    switch (step) {
          case 'recognize':
        stepAnim = recognizeAnim;
        subtitleAnim = recognizeSubtitleAnim;
        checkAnim = recognizeCheckAnim;
        subtitle = recognizeSubtitle;
        break;
          case 'search':
        stepAnim = searchAnim;
        subtitleAnim = searchSubtitleAnim;
        checkAnim = searchCheckAnim;
        subtitle = searchSubtitle;
        break;
          case 'process':
        stepAnim = processAnim;
        subtitleAnim = processSubtitleAnim;
        checkAnim = processCheckAnim;
        subtitle = processSubtitle;
            break;
          case 'result':
        stepAnim = resultAnim;
        subtitleAnim = resultSubtitleAnim;
        checkAnim = resultCheckAnim;
        subtitle = resultSubtitle;
            break;
        }
    
    // For completed state, show more specific subtitles
      if (stepState === STEP_COMPLETED) {
      switch (step) {
      case 'recognize':
          subtitle = detectedFood ? `Detected ${detectedFood}` : 'Analysis complete';
          break;
      case 'search':
          subtitle = searchResultsCount > 0 ? 
            `Searched ${searchResultsCount} websites` : 
            'Search complete';
          break;
      case 'process':
          subtitle = 'Processing complete';
          break;
      case 'result':
          subtitle = detectedFood ? 
            `Nutrition facts for ${detectedFood} ready` : 
            'Results ready';
          break;
      }
    }
    
    const spin = spinnerRefs[step].interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
    
    return (
      <View style={styles.stepContainer}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isDark ? '#2C2C2E' : '#000',
              borderColor: isDark ? '#333' : '#000',
              borderWidth: 1,
              opacity: stepAnim,
              transform: [
                {
                  scale: stepAnim.interpolate({
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
        
        <View style={[styles.textContainer, { opacity: stepState === STEP_COMPLETED ? 0.7 : 1 }]}>
          <View style={styles.textWrapper}>
            <Animated.View
              style={{
                opacity: stepAnim,
                position: 'relative',
                overflow: 'hidden',
                transform: [
                  { translateX: stepAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
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
                  baseColor={isDark ? '#FFF' : '#000'}
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
              text={subtitle}
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
                opacity: stepAnim.interpolate({
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

  // Handle updating both search-related steps
  const handleSearchStepUpdate = (searchQueriesUpdated, searchResultsUpdated) => {
    // When search queries are updated, it means we're in the search step
    if (searchQueriesUpdated) {
      // Make sure we complete the recognize step and activate the search step
      if (stepStates.recognize === STEP_ACTIVE) {
        console.log('[VISUALIZER] Search queries updated while in recognize step, completing recognize');
        completeStep('recognize');
      }
      
      // If search step isn't active, start it
      if (stepStates.search === STEP_WAITING) {
        console.log('[VISUALIZER] Search queries updated, starting search step');
        startStep('search');
      }
    }
    
    // When search results are updated, we should transition to the process step
    // BUT only after a minimum duration to ensure the search step is visible
    if (searchResultsUpdated) {
      // Make sure both recognize and search are complete/active
      if (stepStates.recognize === STEP_WAITING || stepStates.recognize === STEP_ACTIVE) {
        console.log('[VISUALIZER] Search results updated but recognize step not completed, completing it');
        completeStep('recognize');
      }
      
      if (stepStates.search === STEP_WAITING) {
        console.log('[VISUALIZER] Search results updated but search step not started, starting it');
        startStep('search');
        
        // CRITICAL: Enforce minimum search step duration before completing
        const completeTimeout = setTimeout(() => {
          console.log('[VISUALIZER] Enforced minimum search duration reached, completing search step');
          completeStep('search');
        }, MIN_SEARCH_DURATION);
        
        timeoutRefs.current.push(completeTimeout);
      } else if (stepStates.search === STEP_ACTIVE) {
        // Get the active duration of the search step
        const stepStartTime = Date.now() - (stepStartTimeRefs.current.search || 0);
        const remainingTime = Math.max(0, MIN_SEARCH_DURATION - stepStartTime);
        
        console.log(`[VISUALIZER] Search results received, search step active for ${stepStartTime}ms, remaining time: ${remainingTime}ms`);
        
        if (remainingTime > 0) {
          // Enforce minimum duration for search step
          console.log(`[VISUALIZER] Enforcing minimum search duration, waiting ${remainingTime}ms before completing`);
          const completeTimeout = setTimeout(() => {
            if (stepStates.search === STEP_ACTIVE) {
              console.log('[VISUALIZER] Minimum search duration reached, completing search step');
              completeStep('search');
            }
          }, remainingTime);
          
          timeoutRefs.current.push(completeTimeout);
      } else {
          console.log('[VISUALIZER] Search step already exceeded minimum duration, completing now');
          completeStep('search');
        }
      }
    }
  };

  // Add a specific API key reset function for external calls 
  const resetForNewScan = async () => {
    console.log('[VISUALIZER] Resetting visualization for new scan');
    
    // Full reset
    reset();
    
    // Ensure all global and AsyncStorage state is reset
    // Double-check critical keys to make sure they're reset
    await AsyncStorage.setItem('@nutrilens:api_finished', 'false');
    
    // Directly ensure global state is reset
    if (global.NUTRILENS_VISUALIZATION) {
      global.NUTRILENS_VISUALIZATION.apiFinished = false;
      global.NUTRILENS_VISUALIZATION.currentStep = null;
    }
    
    // Refresh the global visualization state
    if (global.NUTRILENS_VISUALIZATION_ACCESS && global.NUTRILENS_VISUALIZATION_ACCESS.refreshVisualization) {
      await global.NUTRILENS_VISUALIZATION_ACCESS.refreshVisualization();
    }
    
    console.log('[VISUALIZER] Reset for new scan completed');
  };

  // Validate step states to ensure proper order
  const validateStepStates = () => {
    if (isValidatingState) return;
    setIsValidatingState(true);
    
    console.log('[VISUALIZER] Validating step states');
    
    try {
      let foundIncomplete = false;
      let lastCompletedIndex = -1;
      
      // Find the last completed step
      for (let i = stepOrder.length - 1; i >= 0; i--) {
        if (stepStates[stepOrder[i]] === STEP_COMPLETED) {
          lastCompletedIndex = i;
          break;
        }
      }
      
      // Find the current active step
      let activeStepIndex = -1;
      for (let i = 0; i < stepOrder.length; i++) {
        if (stepStates[stepOrder[i]] === STEP_ACTIVE) {
          activeStepIndex = i;
          break;
        }
      }
      
      // Validate step order
      for (let i = 0; i < stepOrder.length; i++) {
        const step = stepOrder[i];
        
        if (i <= lastCompletedIndex) {
          // All steps before the last completed step should be completed
          if (stepStates[step] !== STEP_COMPLETED) {
            console.log(`[VISUALIZER] Fixing inconsistency: ${step} should be completed`);
            setStepStates(prev => ({ ...prev, [step]: STEP_COMPLETED }));
          }
        } else if (i === activeStepIndex) {
          // Current active step should be active
          if (stepStates[step] !== STEP_ACTIVE) {
            console.log(`[VISUALIZER] Fixing inconsistency: ${step} should be active`);
            setStepStates(prev => ({ ...prev, [step]: STEP_ACTIVE }));
          }
        } else if (i > activeStepIndex) {
          // All steps after active step should be waiting
          if (stepStates[step] !== STEP_WAITING) {
            console.log(`[VISUALIZER] Fixing inconsistency: ${step} should be waiting`);
            setStepStates(prev => ({ ...prev, [step]: STEP_WAITING }));
          }
        }
      }
    } catch (error) {
      console.error('[VISUALIZER] Error during state validation:', error);
    } finally {
      setIsValidatingState(false);
    }
  };
  
  // Add validation to useEffect
  useEffect(() => {
    if (!isValidatingState) {
      validateStepStates();
    }
  }, [stepStates]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)',
            borderColor: isDark ? 'rgba(51, 51, 51, 0.5)' : '#bbb',
            borderWidth: 1,
            opacity: containerAnim,
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
        <View style={styles.stepsContainer}>
          {renderStep('food-apple', 'Food Recognition', 'recognize')}
          {renderStep('web', 'Web Search', 'search')}
          {renderStep('brain', 'AI Processing', 'process')}
          {renderStep('flag', 'Results', 'result', true)}
        </View>
        
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
    opacity: 1,
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
    paddingRight: 10,
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
  }
});

export default FunctionalAIVisualization;
