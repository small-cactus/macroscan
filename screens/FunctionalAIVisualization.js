import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Animated, Text, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AIAnimatedText from './AIAnimatedText';
import AIAnimatedSubtitle from './AIAnimatedSubtitle';
import ShimmerText from '../components/ShimmerText';
import { EventRegister } from 'react-native-event-listeners';
import { Audio } from 'expo-av'; // Added import

const { width } = Dimensions.get('window');

// Step states
const STEP_WAITING = 'waiting';
const STEP_ACTIVE = 'active';
const STEP_COMPLETED = 'completed';

// Define minimum durations for each step
const MIN_RECOGNIZE_DURATION = 1000; // Increased for smoother transition
const MIN_SEARCH_DURATION = 2000; // Increased to ensure search step visibility
const MIN_PROCESS_DURATION = 3000; // Increased for smoother transition
const MIN_RESULT_DURATION = 2000; // Increased for smoother transition
const STEP_TRANSITION_DELAY = 1000; // Added delay between steps

// Flavor text subtitles for cycling
const recognizeSubtitles = [
  'Analyzing image for food...',
  'Detecting prominent items...',
  'Checking angles and lighting...',
  'Isolating food portions...',
];

const searchSubtitles = [
  'Searching nutrition databases...',
  'Querying USDA FoodData Central...',
  'Checking Open Food Facts...',
  'Cross-referencing sources...',
  'Looking for matching items...',
];

const processSubtitles = [
  'Calculating nutritional values...',
  'Aggregating data points...',
  'Applying nutritional models...',
  'Evaluating confidence levels...',
  'Compiling results...',
];

// Create global event channel names
const EVENTS = {
  STEP_UPDATE: 'ai_visualization_step_update',
  STEP_COMPLETE: 'ai_visualization_step_complete',
  SUBTITLE_UPDATE: 'ai_visualization_subtitle_update',
  FOOD_DETECTED: 'ai_visualization_food_detected',
  API_FINISHED: 'ai_visualization_api_finished',
  SEARCH_DATA: 'ai_visualization_search_data'
};

// Define a debounce function
const debounce = (func, delay) => {
  let inDebounce;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(inDebounce);
    inDebounce = setTimeout(() => func.apply(context, args), delay);
  };
};

// Visualization component that actually works
const FunctionalAIVisualization = forwardRef(({ isDark, isVisible }, ref) => {
  // State for current step progression
  const [stepStates, setStepStates] = useState({
    recognize: STEP_WAITING,
    search: STEP_WAITING,
    process: STEP_WAITING,
    result: STEP_WAITING
  });
  // Ref to hold the latest stepStates for polling without causing effect re-runs
  const stepStatesRef = useRef(stepStates);

  // Keep the ref updated whenever stepStates changes
  useEffect(() => {
    stepStatesRef.current = stepStates;
  }, [stepStates]);
  
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
  const intervalRefs = useRef([]); // General intervals (keep for now?)
  // Refs for subtitle cycling intervals
  const recognizeCycleIntervalRef = useRef(null);
  const searchCycleIntervalRef = useRef(null);
  const processCycleIntervalRef = useRef(null);
  // Ref to store pending completion timeouts, keyed by step name
  const completionTimeoutRefs = useRef({});
  
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
  
  // Add event listeners ref to help with cleanup
  const listeners = useRef([]);

  // Add refs for sound objects
  const stepCompleteSoundRef = useRef(null);
  const scanCompleteSoundRef = useRef(null);

  // Add ref to track if sound has played for a step
  const stepSoundPlayedRef = useRef({
    recognize: false,
    search: false,
    process: false,
    result: false,
  });

  // Add ref to track if final completion sound has played
  const scanCompleteSoundPlayedRef = useRef(false);

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

  // Add haptic feedback for subtitle changes
  const triggerSubtitleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const triggerCompletionHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Add a controlled state update function that enforces proper step order
  // This function should be stable and not depend on stepStates directly.
  const updateStepStatesInOrder = useCallback((updates) => {
    console.log('[VISUALIZER] Updating step states with enforced ordering:', updates);
    
    // Use functional update form of setStepStates
    setStepStates((prevStates) => {
       // Make a copy of the *previous* states
      const newStates = { ...prevStates };
      
      // Apply requested updates to the copy
      Object.entries(updates).forEach(([step, newState]) => {
        newStates[step] = newState;
      });
      
      // Find the active step (if any) in the potential new state
      const orderedSteps = stepOrder; // Use stepOrder directly (constant)
      let activeStepIndex = -1;
      
      for (let i = 0; i < orderedSteps.length; i++) {
        if (newStates[orderedSteps[i]] === STEP_ACTIVE) {
          activeStepIndex = i;
          break;
        }
      }
      
      // Enforce proper state ordering on the newStates copy:
      // - Steps before active step must be COMPLETED
      // - Current step must be ACTIVE
      // - Steps after active step must be WAITING
      if (activeStepIndex >= 0) {
        for (let i = 0; i < orderedSteps.length; i++) {
          const step = orderedSteps[i];
          if (i < activeStepIndex && newStates[step] !== STEP_COMPLETED) {
            console.log(`[VISUALIZER-ORDERING] Enforcing: ${step} must be COMPLETED (before active)`);
            newStates[step] = STEP_COMPLETED;
          } else if (i === activeStepIndex && newStates[step] !== STEP_ACTIVE) {
            console.warn(`[VISUALIZER-ORDERING] Warning: Requested update seems inconsistent. Forcing ${step} to ACTIVE.`);
            newStates[step] = STEP_ACTIVE;
          } else if (i > activeStepIndex && newStates[step] !== STEP_WAITING) {
            console.log(`[VISUALIZER-ORDERING] Enforcing: ${step} must be WAITING (after active)`);
            newStates[step] = STEP_WAITING;
          }
        }
      } else {
        // If no active step, either all steps are waiting or some are completed
        // Find the last completed step in the potential new state
        let lastCompletedIndex = -1;
        for (let i = orderedSteps.length - 1; i >= 0; i--) {
          if (newStates[orderedSteps[i]] === STEP_COMPLETED) {
            lastCompletedIndex = i;
            break;
          }
        }
        
        if (lastCompletedIndex >= 0) {
          // Ensure all steps before the last completed step are also completed
          for (let i = 0; i < lastCompletedIndex; i++) {
            if (newStates[orderedSteps[i]] !== STEP_COMPLETED) {
              console.log(`[VISUALIZER-ORDERING] Enforcing: ${orderedSteps[i]} must be COMPLETED (before last completed)`);
              newStates[orderedSteps[i]] = STEP_COMPLETED;
            }
          }
          // Ensure all steps after the last completed step are waiting
          for (let i = lastCompletedIndex + 1; i < orderedSteps.length; i++) {
            if (newStates[orderedSteps[i]] !== STEP_WAITING) {
              console.log(`[VISUALIZER-ORDERING] Enforcing: ${orderedSteps[i]} must be WAITING (after last completed)`);
              newStates[orderedSteps[i]] = STEP_WAITING;
            }
          }
        }
        // If lastCompletedIndex is -1, all steps should be WAITING (unless explicitly set otherwise in updates)
        // The initial `newStates = { ...prevStates }` and update application handles this.
      }
      
      // Return the corrected new state object for setStepStates
      return newStates;
    });
  // Dependency: stepOrder (constant), setStepStates (stable from useState)
  // This function itself is now stable.
  }, [stepOrder]);

  // Replace the startStep and completeStep functions to use the controlled update
  const startStep = useCallback((step) => {
    // *** Read the latest state from the ref ***
    const currentStates = stepStatesRef.current;
    console.log(`[VISUALIZER] Attempting to start step: ${step}. Current states from ref:`, currentStates);

    // Check if the step is already active or completed
    if (currentStates[step] !== STEP_WAITING) {
      console.log(`[VISUALIZER] Cannot start step ${step} - not in WAITING state (current: ${currentStates[step]})`);
      return; // Exit function, no state change needed
    }

    // Check if the previous step is completed
    const currentStepIndex = stepOrder.indexOf(step);
    const previousStep = currentStepIndex > 0 ? stepOrder[currentStepIndex - 1] : null;
    if (previousStep && currentStates[previousStep] !== STEP_COMPLETED) {
        console.warn(`[VISUALIZER] Cannot start step ${step} because previous step ${previousStep} is not completed (${currentStates[previousStep]}). Aborting start.`);
        return; // Exit function, no state change needed
    }

    console.log(`[VISUALIZER] Conditions met. Starting step: ${step}`);

    // Record the start time for this step *before* updating state
    stepStartTimeRefs.current[step] = Date.now();
    console.log(`[VISUALIZER] Recorded start time for ${step}: ${stepStartTimeRefs.current[step]}`);

    // Update state: Set current step to ACTIVE
    currentStepRef.current = step;
    const newStateUpdate = { [step]: STEP_ACTIVE };
    // Call the state setter function (passed via dependency)
    updateStepStatesInOrder(newStateUpdate);

    // Start spinner
    startSpinner(step);

    // *** Set default subtitle when step starts ***
    let defaultSubtitle = '';
    let subtitleSetter = null;
    switch (step) {
      case 'recognize': defaultSubtitle = 'Analyzing image for food...'; subtitleSetter = setRecognizeSubtitle; break;
      case 'search': defaultSubtitle = 'Searching nutrition databases...'; subtitleSetter = setSearchSubtitle; break;
      case 'process': defaultSubtitle = 'Calculating nutritional values...'; subtitleSetter = setProcessSubtitle; break;
      case 'result': defaultSubtitle = 'Generating personalized nutrition insights...'; subtitleSetter = setResultSubtitle; break;
    }
    if (subtitleSetter && defaultSubtitle) {
        console.log(`[VISUALIZER] Setting default subtitle for ${step}: "${defaultSubtitle}"`);
        subtitleSetter(defaultSubtitle);
    }

    // --- Animation Logic --- (Doesn't directly depend on stepStates)
    let stepAnim, subtitleAnim;
    switch (step) {
      case 'recognize': stepAnim = recognizeAnim; subtitleAnim = recognizeSubtitleAnim; break;
      case 'search': stepAnim = searchAnim; subtitleAnim = searchSubtitleAnim; break;
      case 'process': stepAnim = processAnim; subtitleAnim = processSubtitleAnim; break;
      case 'result': stepAnim = resultAnim; subtitleAnim = resultSubtitleAnim; break;
    }
    Animated.spring(stepAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
    const subtitleTimeout = setTimeout(() => {
      Animated.timing(subtitleAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, 200);
    timeoutRefs.current.push(subtitleTimeout);
    const textTimeout = setTimeout(() => {
      // Use direct state setter for text animation completion
      setTextAnimCompleted(prev => ({ ...prev, [step]: true }));
    }, 1000);
    timeoutRefs.current.push(textTimeout);
    triggerHaptic();

    // --- Start Subtitle Cycling Interval --- 
    let subtitlesArray = null;
    let cycleIntervalRef = null;
    let intervalDuration = 1500; // Default duration

    switch (step) {
        case 'recognize':
            subtitlesArray = recognizeSubtitles;
            cycleIntervalRef = recognizeCycleIntervalRef;
            intervalDuration = 1800;
            break;
        case 'search':
            subtitlesArray = searchSubtitles;
            cycleIntervalRef = searchCycleIntervalRef;
            intervalDuration = 1500;
            break;
        case 'process':
            subtitlesArray = processSubtitles;
            cycleIntervalRef = processCycleIntervalRef;
            intervalDuration = 1600;
            break;
        // 'result' step doesn't cycle subtitles
    }

    if (subtitlesArray && cycleIntervalRef && subtitleSetter) {
        // Clear any existing interval for this step first
        if (cycleIntervalRef.current) {
            clearInterval(cycleIntervalRef.current);
        }
        // Start new interval
        let subtitleIndex = 0;
        cycleIntervalRef.current = setInterval(() => {
            subtitleIndex = (subtitleIndex + 1) % subtitlesArray.length;
            const nextSubtitle = subtitlesArray[subtitleIndex];
            // Update subtitle state
            console.log(`[VISUALIZER-CYCLE] Cycling ${step} subtitle to: "${nextSubtitle}"`);
            subtitleSetter(nextSubtitle);
            triggerSubtitleHaptic();
        }, intervalDuration);
    }

  // Dependencies: updateStepStatesInOrder (stable), stepOrder (constant)
  // No longer depends on stepStates directly.
  }, [updateStepStatesInOrder, stepOrder]);

  const completeStep = useCallback((step) => {
    // *** Read the latest state from the ref ***
    const currentStates = stepStatesRef.current;
    console.log(`[VISUALIZER] Attempting to complete step: ${step}. Current states from ref:`, currentStates);

    // 1. Check if already completed
    if (currentStates[step] === STEP_COMPLETED) {
      console.log(`[VISUALIZER] Step ${step} already COMPLETED`);
      // Clear any lingering completion timeout for this step
      if (completionTimeoutRefs.current[step]) {
          clearTimeout(completionTimeoutRefs.current[step]);
          delete completionTimeoutRefs.current[step];
      }
      return; // No change needed
    }

    // 2. Check if the step is ACTIVE (required for completion)
    if (currentStates[step] !== STEP_ACTIVE) {
      console.log(`[VISUALIZER] Cannot complete step ${step} - not in ACTIVE state (current: ${currentStates[step]})`);
      return; // No change needed
    }

    // 3. Check if previous step is completed (redundant but safe)
    const currentStepIndex = stepOrder.indexOf(step);
    const previousStep = currentStepIndex > 0 ? stepOrder[currentStepIndex - 1] : null;
    if (previousStep && currentStates[previousStep] !== STEP_COMPLETED) {
      console.warn(`[VISUALIZER] Attempting to complete ${step} but previous step ${previousStep} is not COMPLETED (${currentStates[previousStep]}). State inconsistency?`);
    }

    // 4. Check minimum duration
    const startTime = stepStartTimeRefs.current[step] || 0;
    const elapsed = Date.now() - startTime;
    const minDuration = 
      step === 'recognize' ? MIN_RECOGNIZE_DURATION :
      step === 'search' ? MIN_SEARCH_DURATION :
      step === 'process' ? MIN_PROCESS_DURATION :
      MIN_RESULT_DURATION;

    if (elapsed < minDuration) {
      const remaining = minDuration - elapsed;
      // *** Check if a completion timeout is already running for this step ***
      if (completionTimeoutRefs.current[step]) {
          console.log(`[VISUALIZER] Minimum duration check for ${step} already scheduled, waiting.`);
          return; // Already waiting, do nothing
      }
      console.log(`[VISUALIZER] Step ${step} hasn't reached minimum duration, scheduling re-attempt in ${remaining}ms`);
      // *** Store the new timeout ID ***
      completionTimeoutRefs.current[step] = setTimeout(() => {
        // Clear the stored ref *before* re-calling completeStep
        delete completionTimeoutRefs.current[step];
        completeStep(step); // Re-call completeStep
      }, remaining);
      // Do NOT add to general timeoutRefs, handled by completionTimeoutRefs
      return; // No state change *yet*
    }

    // --- MINIMUM DURATION MET --- 
    console.log(`[VISUALIZER] Conditions met. Completing step: ${step}`);

    // Clear any potentially existing (but now irrelevant) completion timeout for this step
    if (completionTimeoutRefs.current[step]) {
        clearTimeout(completionTimeoutRefs.current[step]);
        delete completionTimeoutRefs.current[step];
    }

    // Perform the completion actions (stopping spinner etc.)
    lastCompletedStepRef.current = step;
    stopSpinner(step);

    // --- Play Sound and Haptic Immediately ---
    triggerCompletionHaptic();
    // Play step complete sound only once per step
    if (stepCompleteSoundRef.current && !stepSoundPlayedRef.current[step]) {
      stepSoundPlayedRef.current[step] = true; // Set flag immediately
      stepCompleteSoundRef.current.replayAsync().catch(error => {
        console.error('[VISUALIZER] Error playing step complete sound:', error);
        stepSoundPlayedRef.current[step] = false; // Reset flag on error
      });
    }

    // --- Stop Subtitle Cycling Interval --- 
    let cycleIntervalRef = null;
    switch (step) {
        case 'recognize': cycleIntervalRef = recognizeCycleIntervalRef; break;
        case 'search': cycleIntervalRef = searchCycleIntervalRef; break;
        case 'process': cycleIntervalRef = processCycleIntervalRef; break;
    }
    if (cycleIntervalRef && cycleIntervalRef.current) {
        console.log(`[VISUALIZER] Clearing subtitle cycle interval for ${step}`);
        clearInterval(cycleIntervalRef.current);
        cycleIntervalRef.current = null;
    }

    // Update state to COMPLETED
    const newStateUpdate = { [step]: STEP_COMPLETED };
    updateStepStatesInOrder(newStateUpdate); // Call stable state updater

    // --- Animation & Next Step Logic --- (Doesn't directly depend on stepStates)
    let checkAnim, nextStepSubtitleSetter;
    switch (step) {
      case 'recognize': checkAnim = recognizeCheckAnim; nextStepSubtitleSetter = setSearchSubtitle; break;
      case 'search': checkAnim = searchCheckAnim; nextStepSubtitleSetter = setProcessSubtitle; break;
      case 'process': checkAnim = processCheckAnim; nextStepSubtitleSetter = setResultSubtitle; break;
      case 'result': checkAnim = resultCheckAnim; nextStepSubtitleSetter = null; break;
    }

    Animated.spring(checkAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start(() => {
      const nextStepIndex = currentStepIndex + 1;
      if (nextStepIndex < stepOrder.length) {
        const nextStep = stepOrder[nextStepIndex];
        if (nextStepSubtitleSetter) {
           // Simplified subtitle setting logic
          let defaultNextSubtitle = '';
          switch (nextStep) {
            case 'search': defaultNextSubtitle = 'Searching nutrition databases...'; break;
            case 'process': defaultNextSubtitle = 'Calculating nutritional values...'; break;
            case 'result': defaultNextSubtitle = 'Generating personalized nutrition insights...'; break;
          }
          if (defaultNextSubtitle) nextStepSubtitleSetter(defaultNextSubtitle);
        }
        // Start next step after delay (using the stable startStep)
        const startNextTimeout = setTimeout(() => {
           console.log(`[VISUALIZER] Triggering start for next step ${nextStep} after completion delay`);
           startStep(nextStep);
        }, STEP_TRANSITION_DELAY);
        timeoutRefs.current.push(startNextTimeout);
      } else if (step === 'result' && isAPIFinished) {
         setTimeout(() => showAccuracyBox(), 200);
      }
    });

  // Dependencies: updateStepStatesInOrder, startStep (stable), stepOrder, isAPIFinished (props/state)
  // Does not depend on stepStates directly.
  }, [updateStepStatesInOrder, startStep, stepOrder, isAPIFinished]);

  // Replace the validation function with a simplified version that just logs but doesn't update state
  const validateStepStates = useCallback(() => {
    if (isValidatingState) return;
    setIsValidatingState(true);
    
    try {
      console.log('[VISUALIZER] Validating step states:', JSON.stringify(stepStates));
      
      // No longer updating states directly here - just log issues for debugging
      // All state updates go through updateStepStatesInOrder
      
      const orderedSteps = ['recognize', 'search', 'process', 'result'];
      let activeStepIndex = -1;
      
      // Find active step
      for (let i = 0; i < orderedSteps.length; i++) {
        if (stepStates[orderedSteps[i]] === STEP_ACTIVE) {
          activeStepIndex = i;
          break;
        }
      }
      
      if (activeStepIndex >= 0) {
        // Check steps before active
        for (let i = 0; i < activeStepIndex; i++) {
          const step = orderedSteps[i];
          if (stepStates[step] !== STEP_COMPLETED) {
            console.log(`[VISUALIZER-VALIDATION] Issue: ${step} should be COMPLETED (before active step)`);
          }
        }
        
        // Check steps after active
        for (let i = activeStepIndex + 1; i < orderedSteps.length; i++) {
          const step = orderedSteps[i];
          if (stepStates[step] !== STEP_WAITING) {
            console.log(`[VISUALIZER-VALIDATION] Issue: ${step} should be WAITING (after active step)`);
          }
        }
      } else {
        // Find last completed step
        let lastCompletedIndex = -1;
        for (let i = orderedSteps.length - 1; i >= 0; i--) {
          if (stepStates[orderedSteps[i]] === STEP_COMPLETED) {
            lastCompletedIndex = i;
            break;
          }
        }
        
        if (lastCompletedIndex >= 0) {
          // Check steps before last completed
          for (let i = 0; i < lastCompletedIndex; i++) {
            const step = orderedSteps[i];
            if (stepStates[step] !== STEP_COMPLETED) {
              console.log(`[VISUALIZER-VALIDATION] Issue: ${step} should be COMPLETED (before last completed step)`);
            }
          }
          
          // Check steps after last completed
          for (let i = lastCompletedIndex + 1; i < orderedSteps.length; i++) {
            const step = orderedSteps[i];
            if (stepStates[step] !== STEP_WAITING) {
              console.log(`[VISUALIZER-VALIDATION] Issue: ${step} should be WAITING (after last completed step)`);
            }
          }
        }
      }
    } catch (error) {
      console.error('[VISUALIZER] Error during state validation:', error);
    } finally {
      setIsValidatingState(false);
    }
  }, [stepStates, isValidatingState]);
  
  // Modify the effect that calls validateStepStates
  useEffect(() => {
    if (!isValidatingState) {
      validateStepStates();
    }
  }, [stepStates, validateStepStates, isValidatingState]);

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
    // --- Play Sound and Haptic Immediately ---
    triggerCompletionHaptic();
    // Play scan complete sound here, only once
    if (scanCompleteSoundRef.current && !scanCompleteSoundPlayedRef.current) {
      scanCompleteSoundPlayedRef.current = true; // Set flag immediately
      scanCompleteSoundRef.current.replayAsync().catch(error => {
        console.error('[VISUALIZER] Error playing scan complete sound:', error);
        scanCompleteSoundPlayedRef.current = false; // Reset flag on error
      });
    }

    Animated.spring(accuracyBoxAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true
    }).start(() => {
    });
  };

  // Reset the component
  const reset = async () => {
    console.log('[VISUALIZER] Resetting component');
    
    // Clear all timeouts and intervals
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    intervalRefs.current.forEach(interval => clearInterval(interval)); // Clear general intervals if any
    // Clear subtitle cycle intervals
    if (recognizeCycleIntervalRef.current) clearInterval(recognizeCycleIntervalRef.current);
    if (searchCycleIntervalRef.current) clearInterval(searchCycleIntervalRef.current);
    if (processCycleIntervalRef.current) clearInterval(processCycleIntervalRef.current);
    recognizeCycleIntervalRef.current = null;
    searchCycleIntervalRef.current = null;
    processCycleIntervalRef.current = null;
    // Clear pending completion timeouts
    Object.values(completionTimeoutRefs.current).forEach(timeout => clearTimeout(timeout));
    completionTimeoutRefs.current = {};

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
    
    // Reset event tracking to prevent stale event handling
    lastEventsRef.current = {
      step_update: {},
      step_complete: {},
      subtitle_update: {},
      food_detected: null,
      api_finished: false
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
    
    // Disable polling
    shouldPollRef.current = false;
    
    // Emit reset event
    EventRegister.emit('ai_visualization_reset');
    
    // Reset validation state
    setIsValidatingState(false);
  };

  // Improve transition handling in the handleSearchStepUpdate function
  const handleSearchStepUpdate = useCallback((queriesUpdated, resultsUpdated) => {
    // *** Read latest local state from ref ***
    const currentLocalStates = stepStatesRef.current;

    // When search queries are updated, it means we're in the search step
    if (queriesUpdated) {
      console.log('[VISUALIZER] Search queries updated, handling step transitions');

      // Make sure we complete the recognize step and activate the search step
      // *** Use ref state ***
      if (currentLocalStates.recognize === STEP_ACTIVE) {
        console.log('[VISUALIZER] Search queries updated while in recognize step, completing recognize');
        completeStep('recognize'); // completeStep is safe now
      }

      // If search step isn't active, start it
      // *** Use ref state ***
      if (currentLocalStates.search === STEP_WAITING) {
        console.log('[VISUALIZER] Search queries updated, starting search step');
        startStep('search'); // startStep is safe now
      }
    }

    // When search results are updated, we should transition to the process step
    // BUT only after a minimum duration to ensure the search step is visible
    if (resultsUpdated) {
      console.log('[VISUALIZER] Search results updated, handling step transitions');

      // Make sure both recognize and search are complete/active
      // *** Use ref state ***
      if (currentLocalStates.recognize === STEP_WAITING || currentLocalStates.recognize === STEP_ACTIVE) {
        console.log('[VISUALIZER] Search results updated but recognize step not completed, completing it');
        completeStep('recognize');
      }

      // CRITICAL: Explicitly complete search and start process
      // *** Use ref state ***
      if (currentLocalStates.search === STEP_WAITING) {
        console.log('[VISUALIZER] Search results updated but search step not started, starting it');
        startStep('search');

        // After a proper delay, complete search and start process
        const transitionTimeout = setTimeout(() => {
          console.log('[VISUALIZER] Enforced minimum search duration reached, completing search step');
          // IMPORTANT: First mark search as complete
          completeStep('search');

          // Then explicitly start the process step
          setTimeout(() => {
            // *** Use ref state for check ***
            if (stepStatesRef.current.process === STEP_WAITING) {
                startStep('process');
            }
          }, 300);
        }, MIN_SEARCH_DURATION);

        timeoutRefs.current.push(transitionTimeout);
      // *** Use ref state ***
      } else if (currentLocalStates.search === STEP_ACTIVE) {
        // Calculate how long search has been active
        const searchStartTime = stepStartTimeRefs.current.search || 0;
        const searchActiveDuration = Date.now() - searchStartTime;
        const remainingTime = Math.max(300, MIN_SEARCH_DURATION - searchActiveDuration);

        console.log(`[VISUALIZER] Search results received, search active for ${searchActiveDuration}ms, remaining: ${remainingTime}ms`);

        // Ensure search is visible for minimum duration before transitioning
        const transitionTimeout = setTimeout(() => {
          console.log('[VISUALIZER] Completing search step after minimum duration');
          // IMPORTANT: First mark search as complete
          completeStep('search');

          // Then explicitly start the process step after a short delay
          setTimeout(() => {
             // *** Use ref state for check ***
            if (stepStatesRef.current.process === STEP_WAITING) {
              startStep('process');
            }
          }, 300);
        }, remainingTime);

        timeoutRefs.current.push(transitionTimeout);
      }
    }
  // Remove stepStates dependency, keep completeStep and startStep
  }, [completeStep, startStep]);

  // Improve food detection update to make subtitle changes immediate
  const updateWithFoodItems = useCallback((items) => {
    console.log('[VISUALIZER] updateWithFoodItems called with:', items);
    
    if (!items || !items.length) return;
    
    const foodName = items[0];
    if (foodName) {
      console.log(`[VISUALIZER] Setting detectedFood to: ${foodName}`);
      
      // IMMEDIATE UI UPDATES - set these directly for faster feedback
      setDetectedFood(foodName);
      setRecognizeSubtitle(`Detected ${foodName}...`);
      setResultSubtitle(`Generating nutrition facts for ${foodName}...`);
      
      // Force UI to update immediately
      requestAnimationFrame(() => {
        // Ensure recognize step is active
        if (stepStates.recognize === STEP_WAITING) {
          startStep('recognize');
        }
        
        // Ensure recognize subtitle is visible
        Animated.timing(recognizeSubtitleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        
        // After food detection, schedule completion of recognize step
        if (stepStates.recognize === STEP_ACTIVE) {
        const completeTimeout = setTimeout(() => {
          completeStep('recognize');
        }, 1500);
        timeoutRefs.current.push(completeTimeout);
        }
        });
      }
  }, [stepStates, startStep, completeStep]);

  // Update with search queries
  const updateWithSearchQueries = useCallback((queries) => {
    console.log('[VISUALIZER] updateWithSearchQueries called with:', queries);
    if (!queries || !queries.length) return;
    
    // Update search subtitle with first query
    setSearchSubtitle(`Searching "${queries[0]}"...`);
    
    // Ensure search subtitle is visible immediately
    requestAnimationFrame(() => {
      if (stepStates.search === STEP_ACTIVE) {
        Animated.timing(searchSubtitleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    });
    
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
            
            // Ensure recognize subtitle is visible immediately
            requestAnimationFrame(() => {
              Animated.timing(recognizeSubtitleAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }).start();
            });
          }
        }
      }
    }
    
    // Use the search step update handler to ensure proper step transitions
    handleSearchStepUpdate(true, false);
  }, [stepStates, handleSearchStepUpdate, searchSubtitleAnim, recognizeSubtitleAnim]);

  // Update handleSearchStepUpdate call in updateWithSearchResults
  const updateWithSearchResults = useCallback((results) => {
    console.log('[VISUALIZER] updateWithSearchResults called with:', results?.length, 'results');
    if (!results || !results.length) return;
    
    // Update search results count
    setSearchResultsCount(results.length);
    
    // Update process subtitle with first result title
    if (results[0] && results[0].title) {
      const title = results[0].title;
      const shortTitle = title.length > 20 ? title.substring(0, 20) + '...' : title;
      setProcessSubtitle(`Analyzing "${shortTitle}"`);
      
      // Make subtitle immediately visible if process step is active
      if (stepStates.process === STEP_ACTIVE) {
        Animated.timing(processSubtitleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    }
    
    // IMPORTANT: Set resultsUpdated=true to ensure search → process transition
    handleSearchStepUpdate(false, true);
  }, [stepStates, handleSearchStepUpdate]);

  // Add explicit transition management for process → result step
  const manageProcessToResultTransition = useCallback(() => {
    if (stepStates.process === STEP_ACTIVE) {
      console.log('[VISUALIZER] Managing process to result transition');
      
      // Calculate how long process has been active
      const processStartTime = stepStartTimeRefs.current.process || 0;
      const processActiveDuration = Date.now() - processStartTime;
      const remainingTime = Math.max(300, MIN_PROCESS_DURATION - processActiveDuration);
      
      console.log(`[VISUALIZER] Process step active for ${processActiveDuration}ms, remaining: ${remainingTime}ms`);
      
      // Ensure process is visible for minimum duration before transitioning
      const transitionTimeout = setTimeout(() => {
        console.log('[VISUALIZER] Completing process step after minimum duration');
        
        // First mark process as complete
        completeStep('process');
        
        // Then explicitly start the result step
        setTimeout(() => {
          if (stepStates.result === STEP_WAITING) {
            startStep('result');
          }
        }, 300);
      }, remainingTime);
      
      timeoutRefs.current.push(transitionTimeout);
    }
  }, [stepStates, completeStep, startStep]);

  // Add useEffect to monitor search results count and trigger process → result transition
  useEffect(() => {
    if (searchResultsCount >= 3 && stepStates.process === STEP_ACTIVE) {
      // We have enough results to move to the result step
      manageProcessToResultTransition();
    }
  }, [searchResultsCount, stepStates.process, manageProcessToResultTransition]);

  // Add dependencies to updateWithScanData
  const updateWithScanData = useCallback((data) => {
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
      
      // Immediate UI updates
      setDetectedFood(foodName);
      setRecognizeSubtitle(`Detected ${foodName}...`);
      setResultSubtitle(`Generating nutrition facts for ${foodName}...`);
      
      // Ensure recognize subtitle is visible immediately
      requestAnimationFrame(() => {
        Animated.timing(recognizeSubtitleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
      
      foodUpdated = true;
    }
    
    // Update search data
    if (data._searchInfo) {
      // Update search queries
      if (data._searchInfo.queries && data._searchInfo.queries.length > 0) {
        queriesUpdated = true;
        const query = data._searchInfo.queries[0];
        setSearchSubtitle(`Searching "${query}"...`);
        
        // Ensure search subtitle is visible immediately if search step is active
        if (stepStates.search === STEP_ACTIVE) {
          requestAnimationFrame(() => {
            Animated.timing(searchSubtitleAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          });
        }
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
          
          // Ensure process subtitle is visible immediately if process step is active
          if (stepStates.process === STEP_ACTIVE) {
            requestAnimationFrame(() => {
              Animated.timing(processSubtitleAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }).start();
            });
          }
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
  }, [
    stepStates, 
    startStep, 
    completeStep, 
    handleSearchStepUpdate, 
    recognizeSubtitleAnim,
    searchSubtitleAnim,
    processSubtitleAnim
  ]);

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
      
      // Get the current step or determine the last completed step
      const orderedSteps = ['recognize', 'search', 'process', 'result'];
      let currentStepIndex = -1;
      let lastCompletedIndex = -1;
      
      // Find active and last completed steps
      for (let i = 0; i < orderedSteps.length; i++) {
        const step = orderedSteps[i];
        if (stepStates[step] === STEP_ACTIVE) {
          currentStepIndex = i;
        } else if (stepStates[step] === STEP_COMPLETED) {
          lastCompletedIndex = Math.max(lastCompletedIndex, i);
        }
      }
      
      // Complete the active step
      if (currentStepIndex >= 0) {
        const currentStep = orderedSteps[currentStepIndex];
        console.log(`[VISUALIZER] API finished - completing active step: ${currentStep}`);
        completeStep(currentStep);
        lastCompletedIndex = currentStepIndex;
      }
      
      // Complete any remaining steps in sequence
      const completionsInOrder = [];
      for (let i = lastCompletedIndex + 1; i < orderedSteps.length; i++) {
        completionsInOrder.push(orderedSteps[i]);
      }
      
      if (completionsInOrder.length > 0) {
        console.log(`[VISUALIZER] API finished - scheduling completion of remaining steps:`, completionsInOrder);
        
        let delay = 500;
        completionsInOrder.forEach(step => {
            const startTimeout = setTimeout(() => {
            console.log(`[VISUALIZER] Starting remaining step: ${step}`);
            startStep(step);
            }, delay);
            timeoutRefs.current.push(startTimeout);
            
          delay += 1000;
          
            const completeTimeout = setTimeout(() => {
            console.log(`[VISUALIZER] Completing remaining step: ${step}`);
            completeStep(step);
              
            // Show accuracy box after the last step
            if (step === orderedSteps[orderedSteps.length - 1]) {
                setTimeout(() => {
                  showAccuracyBox();
                }, 200);
              }
          }, delay);
            timeoutRefs.current.push(completeTimeout);
          
          delay += 500;
        });
      } else if (lastCompletedIndex === orderedSteps.length - 1) {
        // All steps already completed, just show accuracy box
        showAccuracyBox();
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
        
        // --- BEGIN DETAILED LOGGING ---
        console.log('[VISUALIZER-POLL-DEBUG] Raw latestData:', JSON.stringify(latestData));
        if (latestData) {
            console.log('[VISUALIZER-POLL-DEBUG] latestData.stepStates:', JSON.stringify(latestData.stepStates));
            console.log('[VISUALIZER-POLL-DEBUG] latestData.subtitles:', JSON.stringify(latestData.subtitles));
            console.log('[VISUALIZER-POLL-DEBUG] latestData.updateTime:', latestData.updateTime);
            console.log('[VISUALIZER-POLL-DEBUG] lastPollTimeRef.current:', lastPollTimeRef.current);
        }
        // --- END DETAILED LOGGING ---

        // Check if data has been updated since our last poll
        if (latestData && latestData.updateTime > lastPollTimeRef.current) {
          console.log('[VISUALIZER] Found new data in global state at timestamp:', latestData.updateTime);
          lastPollTimeRef.current = latestData.updateTime;

          // *** Guard against undefined stepStates ***
          if (!latestData.stepStates) {
            console.warn('[VISUALIZER-POLL] Global data is missing stepStates, skipping state update.');
          } else {
            // *** Add critical logging of global step states ***
            console.log('[VISUALIZER] Global step states:', {
              recognize: latestData.stepStates.recognize,
              search: latestData.stepStates.search,
              process: latestData.stepStates.process,
              result: latestData.stepStates.result,
              current: latestData.currentStep
            });
          }

          // Check for new food detection
          let foodUpdated = false;
          if (latestData.detectedFood && latestData.detectedFood !== detectedFood) {
             // NOTE: Still use direct state setters here as they don't affect the polling effect
            setDetectedFood(latestData.detectedFood);
            setRecognizeSubtitle(`Detected ${latestData.detectedFood}...`);
            setResultSubtitle(`Generating nutrition facts for ${latestData.detectedFood}...`);
            foodUpdated = true;
          }

          // Check for search queries and results changes
          let queriesUpdated = false;
          let resultsUpdated = false;

          // *** Guard against undefined subtitles ***
          if (latestData.subtitles) {
              // Process subtitles for search queries
              if (latestData.subtitles.search && latestData.subtitles.search.length > 0) {
                const searchSubtitles = latestData.subtitles.search;
                const latestSubtitle = searchSubtitles[searchSubtitles.length - 1];
                if (latestSubtitle && latestSubtitle !== searchSubtitle) {
                  // NOTE: Still use direct state setters here
                  setSearchSubtitle(latestSubtitle);
                  queriesUpdated = true;
                }
              }

              // Process subtitles for search results
              if (latestData.subtitles.process && latestData.subtitles.process.length > 0) {
                const processSubtitles = latestData.subtitles.process;
                const latestSubtitle = processSubtitles[processSubtitles.length - 1];
                if (latestSubtitle && latestSubtitle !== processSubtitle) {
                   // NOTE: Still use direct state setters here
                  setProcessSubtitle(latestSubtitle);
                  resultsUpdated = true;
                }
              }

              // Process result subtitles separately
              if (latestData.subtitles.result && latestData.subtitles.result.length > 0) {
                const resultSubtitles = latestData.subtitles.result;
                const latestSubtitle = resultSubtitles[resultSubtitles.length - 1];
                if (latestSubtitle) {
                   // NOTE: Still use direct state setters here
                  setResultSubtitle(latestSubtitle);
                }
              }
          } else {
            console.warn('[VISUALIZER-POLL] Global data is missing subtitles, skipping subtitle update.');
          }

          // If food, queries, or results were updated, make sure step transitions happen
          if (foodUpdated) {
             // Read local state from ref here
            const currentLocalState = stepStatesRef.current;
            // If food was detected, ensure recognize step is started
            if (currentLocalState.recognize === STEP_WAITING) {
              startStep('recognize');
            }

            // Schedule recognize to complete after a short delay if it's active
             if (currentLocalState.recognize === STEP_ACTIVE) {
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
          // *** Guard against undefined stepStates here too ***
          if (!foodUpdated && !queriesUpdated && !resultsUpdated && latestData.stepStates) {
            
            // --- REVISED STATE SYNC LOGIC ---
            let actionTaken = false;
            for (const step of stepOrder) {
              const globalState = latestData.stepStates[step];
              const localState = stepStatesRef.current[step]; // *** Read current local state from ref ***

              // Check if 'globalState' exists before accessing properties
              if (globalState) {
                 // Priority 1: Start a step if it's active globally but waiting locally
                 if (globalState.active && localState === STEP_WAITING) {
                   console.log(`[VISUALIZER-POLL] Step ${step} needs starting (Globally Active, Locally Waiting). Scheduling start.`);
                   // Schedule startStep for the next event loop tick
                   setTimeout(() => startStep(step), 0);
                   actionTaken = true;
                   break; // Only perform one action per poll cycle
                 }

                 // Priority 2: Complete a step if it's completed globally but not locally
                 // We only complete if it's currently ACTIVE locally to ensure minimum duration logic runs
                 if (globalState.completed && localState === STEP_ACTIVE) {
                    console.log(`[VISUALIZER-POLL] Step ${step} needs completing (Globally Completed, Locally Active). Scheduling complete.`);
                    // Schedule completeStep for the next event loop tick
                    setTimeout(() => completeStep(step), 0);
                    actionTaken = true;
                    break; // Only perform one action per poll cycle
                 }
                 
                 // Optional: Handle case where global is completed but local is waiting (less common, might indicate a skip)
                 if (globalState.completed && localState === STEP_WAITING) {
                    console.warn(`[VISUALIZER-POLL] Step ${step} is COMPLETED globally but WAITING locally. Attempting to schedule start.`);
                    // Schedule startStep for the next event loop tick
                    setTimeout(() => startStep(step), 0); // Start it, completion will be handled later
                    actionTaken = true;
                    break;
                 }
                 
              } else {
                 console.warn(`[VISUALIZER-POLL] Global state for step '${step}' is missing or invalid.`);
              }
            }
            if (!actionTaken) {
                console.log("[VISUALIZER-POLL] No step state actions required in this cycle.");
            }
            // --- END REVISED LOGIC ---
            
            /* --- OLD LOOP (commented out) ---
            Object.entries(latestData.stepStates).forEach(([step, state]) => {
               // ... existing loop logic ...
            });
            */
          }

          // Check if API finished
          if (latestData.apiFinished && !isAPIFinished) {
            console.log('[VISUALIZER] API marked as finished in global state, updating local state');
            // Small delay before setting API as finished to allow current step animations to complete
            // Use direct state setter here
            setTimeout(() => {
              setIsAPIFinished(true);
            }, 1000);
          }
        }
      } catch (error) {
        console.error('[VISUALIZER] Error polling global state:', error);
      }
    }, 250); // Poll interval 250ms
    
    intervalRefs.current.push(pollInterval);
    
    return () => {
      clearInterval(pollInterval);
    };
  // *** REMOVED stepStates, startStep, completeStep, handleSearchStepUpdate from dependencies ***
  // Keep only props/state values that should actually trigger a restart of the polling
  }, [isVisible, isAPIFinished, detectedFood, searchSubtitle, processSubtitle]);
  
  // Add a function to force completion of all steps immediately
  const forceCompleteAllSteps = () => {
    console.log('[VISUALIZER] Force completing all steps immediately');
    
    // Create a batch update
    const updates = {};
    ['recognize', 'search', 'process', 'result'].forEach(step => {
      updates[step] = STEP_COMPLETED;
    });
    
    // Update state with all steps completed
    updateStepStatesInOrder(updates);
        
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
  // Renamed to recovery effect
  useEffect(() => {
    // Only run if visible and API is not finished
    if (!isVisible || isAPIFinished) return;

    // Read the latest state using the ref
    const currentLocalStates = stepStatesRef.current;
    
    // Check for state inconsistencies (e.g., completed step followed by waiting step)
    for (let i = 0; i < stepOrder.length - 1; i++) {
      const currentStep = stepOrder[i];
      const nextStep = stepOrder[i + 1];
      
      // If this step is completed but the next isn't started, log it for polling to handle.
      if (currentLocalStates[currentStep] === STEP_COMPLETED && currentLocalStates[nextStep] === STEP_WAITING) {
        console.log(`[VISUALIZER-RECOVERY] Detected completed step ${currentStep} with waiting next step ${nextStep}. Polling will handle start.`);
        // No longer directly calling startStep here - let polling manage it.
        // startStep(nextStep);
        break; // Only detect one inconsistency at a time
      }
    }
  // Depend only on isVisible and isAPIFinished - state checks use the ref
  }, [isVisible, isAPIFinished]);
  
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
              numberOfLines={1}
              ellipsizeMode="tail"
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
  }), [
    reset, 
    resetForNewScan, 
    updateWithFoodItems, 
    updateWithSearchQueries, 
    updateWithSearchResults, 
    updateWithScanData, 
    setAPIFinished,
    forceCompleteAllSteps,
    logState
  ]);

  // Add a specific API key reset function for external calls 
  const resetForNewScan = async () => {
    console.log('[VISUALIZER] Resetting visualization for new scan');
    
    // Cancel any pending animations and timers
    Animated.stopAnimation(containerAnim);
    Animated.stopAnimation(recognizeAnim);
    Animated.stopAnimation(searchAnim);
    Animated.stopAnimation(processAnim);
    Animated.stopAnimation(resultAnim);
    Animated.stopAnimation(recognizeSubtitleAnim);
    Animated.stopAnimation(searchSubtitleAnim);
    Animated.stopAnimation(processSubtitleAnim);
    Animated.stopAnimation(resultSubtitleAnim);
    Animated.stopAnimation(recognizeCheckAnim);
    Animated.stopAnimation(searchCheckAnim);
    Animated.stopAnimation(processCheckAnim);
    Animated.stopAnimation(resultCheckAnim);
    Animated.stopAnimation(accuracyBoxAnim);
    
    // Clear all timeouts and intervals
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    intervalRefs.current.forEach(interval => clearInterval(interval));
    timeoutRefs.current = [];
    intervalRefs.current = [];
     // Clear subtitle cycle intervals
    if (recognizeCycleIntervalRef.current) clearInterval(recognizeCycleIntervalRef.current);
    if (searchCycleIntervalRef.current) clearInterval(searchCycleIntervalRef.current);
    if (processCycleIntervalRef.current) clearInterval(processCycleIntervalRef.current);
    recognizeCycleIntervalRef.current = null;
    searchCycleIntervalRef.current = null;
    processCycleIntervalRef.current = null;
    // Clear pending completion timeouts
    Object.values(completionTimeoutRefs.current).forEach(timeout => clearTimeout(timeout));
    completionTimeoutRefs.current = {};

    // Reset ref arrays
    timeoutRefs.current = [];
    intervalRefs.current = [];
    
    // Force clear all listeners to ensure we don't have duplicates
    listeners.current.forEach(listener => {
      EventRegister.removeEventListener(listener);
    });
    listeners.current = [];
    
    // Reset animation values to initial state
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
    
    // Hard reset to initial state
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
    
    // Reset last events tracking
    lastEventsRef.current = {
      step_update: {},
      step_complete: {},
      subtitle_update: {},
      food_detected: null,
      api_finished: false
    };
    
    // Reset the sound played flags
    stepSoundPlayedRef.current = {
      recognize: false,
      search: false,
      process: false,
      result: false,
    };
    scanCompleteSoundPlayedRef.current = false; // Reset final sound flag

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
    
    // Re-enable polling for the new scan
    shouldPollRef.current = true;
    
    // Brief delay to ensure reset is processed
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Re-setup listeners if component is visible
    if (isVisible) {
      setupEventListeners();
    }
    
    // Animate in the container (restart animation)
    if (isVisible) {
      Animated.spring(containerAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
    
    // Emit reset event to ensure all components are in sync
    EventRegister.emit('ai_visualization_reset');
    
    console.log('[VISUALIZER] Reset for new scan completed');
  };

  // Track the last processed events to prevent duplicates
  const lastEventsRef = useRef({
    step_update: {},
    step_complete: {},
    subtitle_update: {},
    food_detected: null,
    api_finished: false
  });

  // Add a ref to track the current scan ID
  const currentScanIdRef = useRef(null);
  
  // Setup event listeners with controlled state updates
  // Wrap in useCallback to stabilize its identity
  const setupEventListeners = useCallback(() => {
    console.log('[VISUALIZER] Setting up event listeners');
    
    // Add scan ID validation function
    const isCurrentScan = (data) => {
      // If we don't have a current scan ID, accept all events
      if (!currentScanIdRef.current) return true;
      
      // If event doesn't have a scan ID, still accept it for backward compatibility
      if (!data || !data.scanId) return true;
      
      // Only accept events matching our current scan ID
      return data.scanId === currentScanIdRef.current;
    };
    
    // Enhanced start step with controlled updates
    const enhancedStartStep = debounce((step) => {
      if (stepStates[step] === STEP_WAITING) {
        console.log(`[VISUALIZER-EVENT] Enhancing start step for: ${step}`);
        startStep(step);
      } else {
        console.log(`[VISUALIZER-EVENT] Not starting step ${step}, current state:`, stepStates[step]);
      }
    }, 100);
    
    // Enhanced complete step with controlled updates
    const enhancedCompleteStep = debounce((step) => {
      if (stepStates[step] === STEP_ACTIVE) {
        console.log(`[VISUALIZER-EVENT] Enhancing complete step for: ${step}`);
        completeStep(step);
      } else if (stepStates[step] === STEP_WAITING) {
        console.log(`[VISUALIZER-EVENT] Cannot complete waiting step ${step}, starting it first`);
        startStep(step);
        
        // Schedule completion after minimum duration
        const minDuration = 
          step === 'recognize' ? MIN_RECOGNIZE_DURATION :
          step === 'search' ? MIN_SEARCH_DURATION :
          step === 'process' ? MIN_PROCESS_DURATION :
          MIN_RESULT_DURATION;
        
        const completeTimeout = setTimeout(() => {
          completeStep(step);
        }, minDuration);
        
        timeoutRefs.current.push(completeTimeout);
      } else {
        console.log(`[VISUALIZER-EVENT] Not completing step ${step}, current state:`, stepStates[step]);
      }
    }, 100);
    
    // Other debounced handlers
    const debouncedUpdateSubtitle = debounce((step, subtitle) => {
      switch (step) {
        case 'recognize':
          setRecognizeSubtitle(subtitle);
          break;
        case 'search':
          setSearchSubtitle(subtitle);
          break;
        case 'process':
          setProcessSubtitle(subtitle);
          break;
        case 'result':
          setResultSubtitle(subtitle);
          break;
      }
    }, 150);
    
    const debouncedUpdateFood = debounce((foodName) => {
      setDetectedFood(foodName);
      setRecognizeSubtitle(`Detected ${foodName}...`);
      setResultSubtitle(`Generating nutrition facts for ${foodName}...`);
      
      // If recognize step is active, schedule completion
      if (stepStates.recognize === STEP_ACTIVE) {
          const completeTimeout = setTimeout(() => {
          completeStep('recognize');
        }, 1500);
        timeoutRefs.current.push(completeTimeout);
      }
    }, 150);
    
    const debouncedSetAPIFinished = debounce((isFinished) => {
      if (isFinished) {
        setAPIFinished(true);
      }
    }, 200);
    
    const debouncedUpdateSearchData = debounce((data) => {
      if (data) {
        if (data.queries && data.queries.length > 0) {
          const query = data.queries[0];
          setSearchSubtitle(`Searching "${query}"...`);
        }
        
        if (data.results && data.results.length > 0) {
          setSearchResultsCount(data.results.length);
          
          if (data.results[0] && data.results[0].title) {
            const title = data.results[0].title;
            const shortTitle = title.length > 20 ? title.substring(0, 20) + '...' : title;
            setProcessSubtitle(`Analyzing "${shortTitle}"`);
          }
        }
      }
    }, 150);

    // Listen for step updates with debouncing and duplicate prevention
    listeners.current.push(
      EventRegister.addEventListener(EVENTS.STEP_UPDATE, (data) => {
        // Ignore events from other scans
        if (!isCurrentScan(data)) {
          console.log(`[VISUALIZER] Ignoring event from scan ${data?.scanId}, current scan: ${currentScanIdRef.current}`);
          return;
        }
        
        if (data && data.step) {
          // Prevent duplicate processing
          const eventKey = `${data.step}_${data.active}`;
          if (lastEventsRef.current.step_update[eventKey]) {
            return;
          }
          lastEventsRef.current.step_update[eventKey] = Date.now();
          
          console.log(`[VISUALIZER-EVENT] Received step update: ${data.step}, active: ${data.active}`);
          if (data.active) {
            enhancedStartStep(data.step);
          }
        }
      })
    );

    // Listen for step completions with debouncing and duplicate prevention
    listeners.current.push(
      EventRegister.addEventListener(EVENTS.STEP_COMPLETE, (data) => {
        // Ignore events from other scans
        if (!isCurrentScan(data)) return;
        
        if (data && data.step) {
          // Prevent duplicate processing
          if (lastEventsRef.current.step_complete[data.step]) {
            return;
          }
          lastEventsRef.current.step_complete[data.step] = Date.now();
          
          console.log(`[VISUALIZER-EVENT] Received step completion: ${data.step}`);
          enhancedCompleteStep(data.step);
        }
      })
    );

    // Listen for subtitle updates with debouncing and duplicate prevention
    listeners.current.push(
      EventRegister.addEventListener(EVENTS.SUBTITLE_UPDATE, (data) => {
        // Ignore events from other scans
        if (!isCurrentScan(data)) return;
        
        if (data && data.step && data.subtitle) {
          // Prevent duplicate processing
          const eventKey = `${data.step}_${data.subtitle}`;
          if (lastEventsRef.current.subtitle_update[eventKey]) {
            return;
          }
          lastEventsRef.current.subtitle_update[eventKey] = Date.now();
          
          console.log(`[VISUALIZER-EVENT] Received subtitle update for ${data.step}: ${data.subtitle}`);
          debouncedUpdateSubtitle(data.step, data.subtitle);
        }
      })
    );

    // Listen for food detection with debouncing and duplicate prevention
    listeners.current.push(
      EventRegister.addEventListener(EVENTS.FOOD_DETECTED, (data) => {
        // Ignore events from other scans
        if (!isCurrentScan({ scanId: data?.scanId })) return;
        
        const foodName = typeof data === 'object' ? data.foodName || data : data;
        if (foodName) {
          // Prevent duplicate processing
          if (lastEventsRef.current.food_detected === foodName) {
            return;
          }
          lastEventsRef.current.food_detected = foodName;
          
          console.log(`[VISUALIZER-EVENT] Received food detection: ${foodName}`);
          debouncedUpdateFood(foodName);
        }
      })
    );

    // Listen for API completion with debouncing and duplicate prevention
    listeners.current.push(
      EventRegister.addEventListener(EVENTS.API_FINISHED, (data) => {
        // Ignore events from other scans
        if (!isCurrentScan(data)) return;
        
        const isFinished = typeof data === 'object' ? data.isFinished || true : data;
        if (isFinished) {
          // Prevent duplicate processing
          if (lastEventsRef.current.api_finished) {
            return;
          }
          lastEventsRef.current.api_finished = true;
          
          console.log('[VISUALIZER-EVENT] Received API finished');
          debouncedSetAPIFinished(isFinished);
        }
      })
    );

    // Listen for search data with debouncing
    listeners.current.push(
      EventRegister.addEventListener(EVENTS.SEARCH_DATA, (data) => {
        // Ignore events from other scans
        if (!isCurrentScan(data)) return;
        
        if (data) {
          console.log('[VISUALIZER-EVENT] Received search data update');
          debouncedUpdateSearchData(data);
        }
      })
    );
  }, [startStep, completeStep, setRecognizeSubtitle, setSearchSubtitle, setProcessSubtitle, setResultSubtitle, setDetectedFood, setSearchResultsCount, setAPIFinished, handleSearchStepUpdate]); // Only stable functions/setters

  // Initialize event listeners for direct component communication
  useEffect(() => {
    if (isVisible) {
      setupEventListeners();
      
      // Listen for reset events first to get current scan ID
      const resetListener = EventRegister.addEventListener('ai_visualization_reset', (data) => {
        console.log('[VISUALIZER] Reset event received', data);
        
        // Update current scan ID if provided
        if (data && data.scanId) {
          console.log(`[VISUALIZER] Setting current scan ID to: ${data.scanId}`);
          currentScanIdRef.current = data.scanId;
        } else {
          // If no scan ID provided, generate a fallback
          const fallbackId = `fallback_${Date.now()}`;
          console.log(`[VISUALIZER] No scan ID provided, using fallback: ${fallbackId}`);
          currentScanIdRef.current = fallbackId;
        }
        
        // Reset component state
        resetForNewScan();
      });
      
      listeners.current.push(resetListener);
    }

    // Cleanup listeners on unmount or when visibility changes
    return () => {
      console.log('[VISUALIZER] Removing event listeners');
      listeners.current.forEach(listener => {
        EventRegister.removeEventListener(listener);
      });
      listeners.current = [];
      
      // Reset last events tracking
      lastEventsRef.current = {
        step_update: {},
        step_complete: {},
        subtitle_update: {},
        food_detected: null,
        api_finished: false
      };
      
      // Clear scan ID
      currentScanIdRef.current = null;
    };
  }, [isVisible, setupEventListeners, resetForNewScan]);

  // Add useEffect to load/unload sounds based on visibility
  useEffect(() => {
    let stepSoundObject = null;
    let scanSoundObject = null;

    const loadSounds = async () => {
      try {
        console.log('[VISUALIZER] Loading sounds...');
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true }); // Allow playing sound in silent mode

        // Load step complete sound
        const { sound: stepSound } = await Audio.Sound.createAsync(
           require('../assets/scan_intermediate_TRIMMED.mp3') // progress sound
        );
        stepCompleteSoundRef.current = stepSound;
        stepSoundObject = stepSound; // Keep local ref for cleanup
        console.log('[VISUALIZER] Step complete sound loaded');

        // Load scan complete sound
        const { sound: scanSound } = await Audio.Sound.createAsync(
           require('../assets/scan_complete_TRIMMED.mp3') // complete sound
        );
        scanCompleteSoundRef.current = scanSound;
        scanSoundObject = scanSound; // Keep local ref for cleanup
        console.log('[VISUALIZER] Scan complete sound loaded');

      } catch (error) {
        console.error('[VISUALIZER] Error loading sounds:', error);
      }
    };

    const unloadSounds = async () => {
       console.log('[VISUALIZER] Unloading sounds...');
       if (stepCompleteSoundRef.current) {
         try {
           await stepCompleteSoundRef.current.unloadAsync();
           console.log('[VISUALIZER] Step complete sound unloaded');
         } catch (e) { console.error('[VISUALIZER] Error unloading step sound:', e); }
         stepCompleteSoundRef.current = null;
       }
       if (scanCompleteSoundRef.current) {
         try {
           await scanCompleteSoundRef.current.unloadAsync();
           console.log('[VISUALIZER] Scan complete sound unloaded');
         } catch (e) { console.error('[VISUALIZER] Error unloading scan sound:', e); }
         scanCompleteSoundRef.current = null;
       }
       // Also unload local refs if they exist
       if (stepSoundObject) {
          try { await stepSoundObject.unloadAsync(); } catch(e) {}
       }
       if (scanSoundObject) {
          try { await scanSoundObject.unloadAsync(); } catch(e) {}
       }
    };

    if (isVisible) {
      loadSounds();
    }

    // Cleanup function
    return () => {
      unloadSounds();
    };
  }, [isVisible]); // Reload sounds when visibility changes

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            borderColor: isDark ? 'rgba(51, 51, 51, 0.5)' : '#bbb',
            borderWidth: 2,
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
              Deep Search has been completed. We checked multiple websites and are now loading the final data for you.
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
    // Remove minHeight to prevent forcing multiple lines
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

export { EVENTS };
export default FunctionalAIVisualization;
