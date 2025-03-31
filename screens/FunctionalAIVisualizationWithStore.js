import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Dimensions, Animated, Text, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AIAnimatedText from './AIAnimatedText';
import AIAnimatedSubtitle from './AIAnimatedSubtitle';
import ShimmerText from '../components/ShimmerText';
import useVisualizationStore from '../store/useVisualizationStore';

const { width } = Dimensions.get('window');

// Step states
const STEP_WAITING = 'waiting';
const STEP_ACTIVE = 'active';
const STEP_COMPLETED = 'completed';

// Animation durations
const STEP_DURATION = 3000;
const SUBTITLE_INTERVAL = 1200;

// Define step constants
const STEP_RECOGNIZE = 'recognize';
const STEP_SEARCH = 'search';
const STEP_PROCESS = 'process';
const STEP_RESULT = 'result';

// Add minimum step durations
const MIN_STEP_DURATIONS = {
  recognize: 2500,
  search: 3000,
  process: 3500,
  result: 2000
};

const FunctionalAIVisualizationWithStore = forwardRef(({ 
  isDark, 
  isVisible,
  onComplete
}, ref) => {
  // Get store state and actions
  const store = useVisualizationStore();
  
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
  
  // Track if text animation is completed for each step
  const [textAnimCompleted, setTextAnimCompleted] = React.useState({
    recognize: false,
    search: false,
    process: false,
    result: false
  });
  
  // Animation for the accuracy box
  const accuracyBoxAnim = useRef(new Animated.Value(0)).current;
  
  // Animation for component fade out
  const componentFadeOutAnim = useRef(new Animated.Value(1)).current;
  
  // Refs for AnimatedText components
  const recognizeTitleRef = useRef(null);
  const searchTitleRef = useRef(null);
  const processTitleRef = useRef(null);
  const resultTitleRef = useRef(null);
  
  const recognizeSubtitleRef = useRef(null);
  const searchSubtitleRef = useRef(null);
  const processSubtitleRef = useRef(null);
  const resultSubtitleRef = useRef(null);
  
  // Animation state
  const [isAnimationRunning, setIsAnimationRunning] = React.useState(false);
  const [isAnimationCompleted, setIsAnimationCompleted] = React.useState(false);
  
  // Animation cleanup references
  const timeoutRefs = useRef([]);
  const intervalRefs = useRef([]);
  
  // Start time reference for each step
  const stepStartTimeRef = useRef({
    recognize: 0,
    search: 0,
    process: 0,
    result: 0
  });
  
  // Observe store changes to complete steps when data arrives
  useEffect(() => {
    // Respond to changes in food data
    if (store.stepStates.recognize === STEP_ACTIVE && 
        (store.foodItems.length > 0 || store.detectedFood)) {
      console.log("COMPONENT EFFECT: Detected food data, completing recognize step");
      store.completeStep(STEP_RECOGNIZE).then(() => {
        stopSpinner(recognizeSpinAnim);
        Animated.spring(recognizeCheckAnim, {
          toValue: 1,
          tension: 120,
          friction: 4,
          useNativeDriver: true,
        }).start();
      });
    }
    
    // Respond to changes in search queries
    if (store.stepStates.search === STEP_ACTIVE && store.searchQueries.length > 0) {
      console.log("COMPONENT EFFECT: Detected search queries, completing search step");
      store.completeStep(STEP_SEARCH).then(() => {
        stopSpinner(searchSpinAnim);
        Animated.spring(searchCheckAnim, {
          toValue: 1,
          tension: 120,
          friction: 4,
          useNativeDriver: true,
        }).start();
      });
    }
    
    // Respond to changes in search results
    if (store.stepStates.process === STEP_ACTIVE && store.searchResults.length > 0) {
      console.log("COMPONENT EFFECT: Detected search results, completing process step");
      store.completeStep(STEP_PROCESS).then(() => {
        stopSpinner(processSpinAnim);
        Animated.spring(processCheckAnim, {
          toValue: 1,
          tension: 120,
          friction: 4,
          useNativeDriver: true,
        }).start();
      });
    }
    
    // Respond to API finished flag
    if (store.apiFinished && store.stepStates.result === STEP_ACTIVE) {
      console.log("COMPONENT EFFECT: API finished, completing result step");
      store.completeStep(STEP_RESULT).then(() => {
        stopSpinner(resultSpinAnim);
        Animated.spring(resultCheckAnim, {
          toValue: 1,
          tension: 120,
          friction: 4,
          useNativeDriver: true,
        }).start();
        
        // Show accuracy box if all steps are complete
        if (store.stepStates.recognize === STEP_COMPLETED && 
            store.stepStates.search === STEP_COMPLETED && 
            store.stepStates.process === STEP_COMPLETED && 
            store.stepStates.result === STEP_COMPLETED) {
          console.log("COMPONENT EFFECT: All steps complete, showing accuracy box");
          showAccuracyBox();
        }
      });
    }
  }, [store.foodItems, store.detectedFood, store.searchQueries, store.searchResults, store.apiFinished, store.stepStates]);
  
  // Haptic feedback functions
  const triggerStepHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const triggerSubtitleHaptic = () => {
    // Only trigger every 3rd time to reduce lag
    if (Math.random() > 0.7) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        .catch(err => console.log('Haptic feedback error:', err));
    }
  };

  const triggerCompletionHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Start a spinner animation
  const startSpinner = (spinAnim) => {
    spinAnim.setValue(0); // Reset first
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
  
  // Reset all animations to initial state
  const resetAllAnimations = () => {
    console.log("Resetting all animations to initial state");
    
    // Reset step animations
    recognizeAnim.setValue(0);
    searchAnim.setValue(0);
    processAnim.setValue(0);
    resultAnim.setValue(0);
    
    // Reset subtitle animations
    recognizeSubtitleAnim.setValue(0);
    searchSubtitleAnim.setValue(0);
    processSubtitleAnim.setValue(0);
    resultSubtitleAnim.setValue(0);
    
    // Reset checkmark animations
    recognizeCheckAnim.setValue(0);
    searchCheckAnim.setValue(0);
    processCheckAnim.setValue(0);
    resultCheckAnim.setValue(0);
    
    // Stop and reset spinners
    stopSpinner(recognizeSpinAnim);
    stopSpinner(searchSpinAnim);
    stopSpinner(processSpinAnim);
    stopSpinner(resultSpinAnim);
    
    // Reset accuracy box
    accuracyBoxAnim.setValue(0);
    
    // Reset container animations
    containerAnim.setValue(0);
    stepsContainerAnim.setValue(1);
    componentFadeOutAnim.setValue(1);
    
    // Reset text animation tracking
    setTextAnimCompleted({
      recognize: false,
      search: false,
      process: false,
      result: false
    });
  };
  
  // Expose methods to the parent component
  useImperativeHandle(ref, () => ({
    reset: () => {
      console.log("COMPONENT: Reset called");
      
      // Clear any running animations
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      intervalRefs.current.forEach(interval => clearInterval(interval));
      
      // Reset store state
      store.resetState();
      
      // Reset animation values
      resetAllAnimations();
      
      // Reset animation state
      setIsAnimationRunning(false);
      setIsAnimationCompleted(false);
    },
    updateWithSearchQueries: (queries) => {
      store.updateWithSearchQueries(queries);
    },
    updateWithSearchResults: (results) => {
      store.updateWithSearchResults(results);
    },
    updateWithFoodItems: (items) => {
      store.updateWithFoodItems(items);
    },
    updateWithScanData: (data) => {
      store.updateWithScanData(data);
    },
    forceUpdateSubtitles: () => {
      store.cycleSubtitle(STEP_RECOGNIZE);
      store.cycleSubtitle(STEP_SEARCH);
      store.cycleSubtitle(STEP_PROCESS);
    },
    completeVisualization,
    setAPIFinished: (finished) => {
      store.setAPIFinished(finished);
    },
  }));
  
  // Initialize animation when component becomes visible
  useEffect(() => {
    if (isVisible && !isAnimationRunning) {
      console.log("COMPONENT: Visualization component became visible");
      
      // Reset store state first to ensure all steps start in WAITING state
      store.resetState();
      
      // Reset all animations
      resetAllAnimations();
      
      // Animate container in
      Animated.spring(containerAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
      
      // Start animation sequence after a short delay
      setIsAnimationRunning(true);
      const animationTimeout = setTimeout(() => {
        console.log("COMPONENT: Starting animation sequence");
        animateSequence();
      }, 800);
      timeoutRefs.current.push(animationTimeout);
    }
    
    return () => {
      // Cleanup on unmount
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      intervalRefs.current.forEach(interval => clearInterval(interval));
      timeoutRefs.current = [];
      intervalRefs.current = [];
    };
  }, [isVisible]);
  
  // Helper function to show accuracy box with animation
  const showAccuracyBox = () => {
    console.log('COMPONENT: Showing accuracy box');
    Animated.spring(accuracyBoxAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true
    }).start(() => {
      // Fade out after 1.5 seconds if API is finished
      if (store.apiFinished) {
        setTimeout(() => {
          console.log('COMPONENT: Fading out component after accuracy box shown');
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
  
  // Animation sequence logic
  const animateSequence = async () => {
    console.log('COMPONENT: Beginning animation sequence');
    
    try {
      // Initialize steps
      console.log("COMPONENT: Starting step sequence - all steps initially in WAITING state");
      
      // Step 1: Food Recognition - START
      console.log("COMPONENT: STARTING STEP 1: Recognition");
      await store.activateStep(STEP_RECOGNIZE);
      triggerStepHaptic();
      
      // Start spinner animation
      startSpinner(recognizeSpinAnim);
      stepStartTimeRef.current.recognize = Date.now();
      
      // Animate the recognition step in
      Animated.spring(recognizeAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
      
      // Short delay then show subtitle
      await new Promise(resolve => setTimeout(resolve, 300));
      
      Animated.timing(recognizeSubtitleAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
      
      // Mark text as completed after a delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setTextAnimCompleted(prev => ({ ...prev, recognize: true }));
      
      // Set up cycling interval for recognize step
      const recognizeInterval = setInterval(() => {
        if (!store.apiFinished && !store.globalUpdateBlocker && !store.stateIsFrozen) {
          store.cycleSubtitle(STEP_RECOGNIZE);
          triggerSubtitleHaptic();
        }
      }, SUBTITLE_INTERVAL);
      
      intervalRefs.current.push(recognizeInterval);
      
      // Wait for food data or minimum time, whichever is longer
      const waitForFoodData = new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (store.foodItems.length > 0 || store.detectedFood) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 500);
        intervalRefs.current.push(checkInterval);
      });
      
      const minTimePromise = new Promise(resolve => {
        const timeoutId = setTimeout(resolve, MIN_STEP_DURATIONS.recognize);
        timeoutRefs.current.push(timeoutId);
      });
      
      // Wait for both data and min time
      await Promise.all([waitForFoodData, minTimePromise]);
      
      // Clear interval
      clearInterval(recognizeInterval);
      
      // Check if we have data to complete this step
      if (store.foodItems.length > 0 || store.detectedFood) {
        // Step 1: Food Recognition - COMPLETE
        console.log("COMPONENT: COMPLETING STEP 1: Recognition");
        await store.completeStep(STEP_RECOGNIZE);
        stopSpinner(recognizeSpinAnim);
        
        Animated.spring(recognizeCheckAnim, {
          toValue: 1,
          tension: 120,
          friction: 4,
          useNativeDriver: true,
        }).start();
      } else {
        // Keep waiting for data - keep spinner running
        console.log("COMPONENT: Keeping recognition step active - waiting for data");
      }
      
      // Short delay between steps
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Step 2: Web Search - START
      console.log("COMPONENT: STARTING STEP 2: Search");
      await store.activateStep(STEP_SEARCH);
      triggerStepHaptic();
      startSpinner(searchSpinAnim); // Start spinner right away
      stepStartTimeRef.current.search = Date.now();
      
      // Animate the search step in
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
      
      // Set up cycling interval for search step
      const searchInterval = setInterval(() => {
        if (!store.apiFinished && !store.globalUpdateBlocker && !store.stateIsFrozen) {
          store.cycleSubtitle(STEP_SEARCH);
          triggerSubtitleHaptic();
        }
      }, SUBTITLE_INTERVAL * 0.5); // Search subtitle cycles faster
      
      intervalRefs.current.push(searchInterval);
      
      // Wait for search queries or minimum time, whichever is longer
      const waitForSearchData = new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (store.searchQueries.length > 0) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 500);
        intervalRefs.current.push(checkInterval);
      });
      
      const minSearchTimePromise = new Promise(resolve => {
        const timeoutId = setTimeout(resolve, MIN_STEP_DURATIONS.search);
        timeoutRefs.current.push(timeoutId);
      });
      
      // Wait for both data and min time
      await Promise.all([waitForSearchData, minSearchTimePromise]);
      
      // Clear interval
      clearInterval(searchInterval);
      
      // Check if we have data to complete this step
      if (store.searchQueries.length > 0) {
        // Step 2: Web Search - COMPLETE
        console.log("COMPONENT: COMPLETING STEP 2: Search");
        await store.completeStep(STEP_SEARCH);
        stopSpinner(searchSpinAnim);
        
        Animated.spring(searchCheckAnim, {
          toValue: 1,
          tension: 120,
          friction: 4,
          useNativeDriver: true,
        }).start();
      } else {
        // Keep waiting for data - keep spinner running
        console.log("COMPONENT: Keeping search step active - waiting for data");
      }
      
      // Short delay between steps
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Step 3: Processing - START
      console.log("COMPONENT: STARTING STEP 3: Process");
      await store.activateStep(STEP_PROCESS);
      triggerStepHaptic();
      startSpinner(processSpinAnim); // Start spinner right away
      stepStartTimeRef.current.process = Date.now();
      
      // Animate the process step in
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
      
      // Set up cycling interval for process step
      const processInterval = setInterval(() => {
        if (!store.apiFinished && !store.globalUpdateBlocker && !store.stateIsFrozen) {
          store.cycleSubtitle(STEP_PROCESS);
          triggerSubtitleHaptic();
        }
      }, SUBTITLE_INTERVAL * 0.66); // Process subtitle cycles at medium speed
      
      intervalRefs.current.push(processInterval);
      
      // Wait for search results or minimum time, whichever is longer
      const waitForProcessData = new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (store.searchResults.length > 0) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 500);
        intervalRefs.current.push(checkInterval);
      });
      
      const minProcessTimePromise = new Promise(resolve => {
        const timeoutId = setTimeout(resolve, MIN_STEP_DURATIONS.process);
        timeoutRefs.current.push(timeoutId);
      });
      
      // Wait for both data and min time
      await Promise.all([waitForProcessData, minProcessTimePromise]);
      
      // Clear interval
      clearInterval(processInterval);
      
      // Check if we have data to complete this step
      if (store.searchResults.length > 0) {
        // Step 3: Processing - COMPLETE
        console.log("COMPONENT: COMPLETING STEP 3: Process");
        await store.completeStep(STEP_PROCESS);
        stopSpinner(processSpinAnim);
        
        Animated.spring(processCheckAnim, {
          toValue: 1,
          tension: 120,
          friction: 4,
          useNativeDriver: true,
        }).start();
      } else {
        // Keep waiting for data - keep spinner running
        console.log("COMPONENT: Keeping process step active - waiting for data");
      }
      
      // Short delay between steps
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Step 4: Results - START
      console.log("COMPONENT: STARTING STEP 4: Result");
      await store.activateStep(STEP_RESULT);
      triggerStepHaptic();
      startSpinner(resultSpinAnim); // Start spinner right away
      stepStartTimeRef.current.result = Date.now();
      
      // Animate the result step in
      Animated.spring(resultAnim, {
        toValue: 1,
        tension: 80,
        friction: 5,
        useNativeDriver: true,
      }).start();
      
      // Short delay then show subtitle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      Animated.timing(resultSubtitleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Mark text as completed after a delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setTextAnimCompleted(prev => ({ ...prev, result: true }));
      
      // Wait for API to finish or minimum time, whichever is longer
      const minResultTimePromise = new Promise(resolve => {
        const timeoutId = setTimeout(resolve, MIN_STEP_DURATIONS.result);
        timeoutRefs.current.push(timeoutId);
      });
      
      // Check API status frequently
      const apiCheckInterval = setInterval(() => {
        if (store.apiFinished) {
          console.log("COMPONENT: API IS FINISHED - completing result step");
          store.completeStep(STEP_RESULT).then(() => {
            stopSpinner(resultSpinAnim);
            
            Animated.spring(resultCheckAnim, {
              toValue: 1,
              tension: 120,
              friction: 4,
              useNativeDriver: true,
            }).start();
            
            // Show accuracy box if all steps are complete
            if (store.stepStates.recognize === STEP_COMPLETED && 
                store.stepStates.search === STEP_COMPLETED && 
                store.stepStates.process === STEP_COMPLETED && 
                store.stepStates.result === STEP_COMPLETED) {
              console.log("COMPONENT: SHOWING ACCURACY BOX - All steps complete");
              showAccuracyBox();
            }
          });
          
          clearInterval(apiCheckInterval);
        }
      }, 500);
      
      intervalRefs.current.push(apiCheckInterval);
      
      // Wait for minimum display time
      await minResultTimePromise;
      
      // Keep running until API finishes and progress is made
      while (!store.apiFinished && store.stepStates.result === STEP_ACTIVE) {
        // Keep spinner running and wait a bit longer
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Mark animation as completed
      setIsAnimationCompleted(true);
      
      // Call completion callback if provided
      if (onComplete && typeof onComplete === 'function') {
        onComplete();
      }
    } catch (error) {
      console.error('Error in animation sequence:', error);
      // Emergency fallback - force visualization to complete
      completeVisualization(true);
    }
  };
  
  // Function to artificially complete the visualization
  const completeVisualization = async (force = false) => {
    console.log('COMPONENT: Completing visualization' + (force ? ' (forced)' : ''));
    
    // Clear any running animations
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    intervalRefs.current.forEach(interval => clearInterval(interval));
    timeoutRefs.current = [];
    intervalRefs.current = [];
    
    if (force) {
      // Force all steps to complete if specifically requested
      
      // First ensure steps are in proper state - active steps need to be completed in sequence
      const { stepStates } = store;
      
      // First make sure API is marked as finished
      await store.setAPIFinished(true);
      
      // Recognize step
      if (stepStates.recognize === STEP_ACTIVE) {
        await store.completeStep(STEP_RECOGNIZE);
      } else if (stepStates.recognize === STEP_WAITING) {
        await store.activateStep(STEP_RECOGNIZE);
        await store.completeStep(STEP_RECOGNIZE);
      }
      
      // Search step
      if (stepStates.search === STEP_ACTIVE) {
        await store.completeStep(STEP_SEARCH);
      } else if (stepStates.search === STEP_WAITING) {
        await store.activateStep(STEP_SEARCH);
        await store.completeStep(STEP_SEARCH);
      }
      
      // Process step
      if (stepStates.process === STEP_ACTIVE) {
        await store.completeStep(STEP_PROCESS);
      } else if (stepStates.process === STEP_WAITING) {
        await store.activateStep(STEP_PROCESS);
        await store.completeStep(STEP_PROCESS);
      }
      
      // Result step
      if (stepStates.result === STEP_ACTIVE) {
        // Use the special method to force complete result
        await store.forceCompleteResult();
      } else if (stepStates.result === STEP_WAITING) {
        await store.activateStep(STEP_RESULT);
        await store.forceCompleteResult();
      }
      
      // Show all animations for steps
      recognizeAnim.setValue(1);
      searchAnim.setValue(1);
      processAnim.setValue(1);
      resultAnim.setValue(1);
      
      // Stop all spinners
      stopSpinner(recognizeSpinAnim);
      stopSpinner(searchSpinAnim);
      stopSpinner(processSpinAnim);
      stopSpinner(resultSpinAnim);
      
      // Show all check animations for completed steps
      recognizeCheckAnim.setValue(1);
      searchCheckAnim.setValue(1);
      processCheckAnim.setValue(1);
      resultCheckAnim.setValue(1);
      
      // Show accuracy box now that all steps are complete
      Animated.spring(accuracyBoxAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }).start(() => {
        // If API is finished, trigger fade out
        if (store.apiFinished) {
          setTimeout(() => {
            console.log('COMPONENT: Visualization complete and API finished, fading out component');
            Animated.timing(componentFadeOutAnim, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true
            }).start();
          }, 1000);
        }
      });
    } else {
      // Just stop animations but don't force completion
      // This respects the logic in the store that prevents premature step completion
      stopSpinner(recognizeSpinAnim);
      stopSpinner(searchSpinAnim);
      stopSpinner(processSpinAnim);
      stopSpinner(resultSpinAnim);
    }
    
    // Trigger haptic feedback
    triggerCompletionHaptic();
    
    // Mark animations as completed
    setIsAnimationCompleted(true);
    
    // Call onComplete callback if provided
    if (onComplete && typeof onComplete === 'function') {
      setTimeout(() => {
        onComplete();
      }, 1500);
    }
  };
  
  const getCheckmarkAnimation = (step) => {
    switch(step) {
      case 'recognize': return recognizeCheckAnim;
      case 'search': return searchCheckAnim;
      case 'process': return processCheckAnim;
      case 'result': return resultCheckAnim;
      default: return recognizeCheckAnim;
    }
  };
  
  const getSpinnerAnimation = (step) => {
    switch(step) {
      case 'recognize': return recognizeSpinAnim;
      case 'search': return searchSpinAnim;
      case 'process': return processSpinAnim;
      case 'result': return resultSpinAnim;
      default: return recognizeSpinAnim;
    }
  };
  
  // Get spinner rotation interpolation
  const getSpinnerRotation = (spinAnim) => {
    return spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg']
    });
  };
  
  // Custom ShimmerEffect component that uses LinearGradient for masking
  const ShimmerEffect = ({ style, width = 120, isCompleted = false, isActive = true, children }) => {
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      if (isActive && !isCompleted) {
        Animated.loop(
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          })
        ).start();
      } else {
        shimmerAnim.setValue(0);
      }
      
      return () => {
        shimmerAnim.stopAnimation();
      };
    }, [isActive, isCompleted]);
    
    if (isCompleted) {
      return (
        <View style={style}>
          {children}
        </View>
      );
    }
    
    return (
      <View style={[style, { overflow: 'hidden', position: 'relative' }]}>
        {children}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: isActive ? 0.7 : 0,
          }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: shimmerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-width, width + 50],
              }),
              right: 0,
              bottom: 0,
              opacity: isActive ? 1 : 0,
            }}
          >
            <LinearGradient
              colors={isDark ? 
                ['rgba(255,255,255,0)', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0)'] : 
                ['rgba(255,255,255,0)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1, width: width }}
            />
          </Animated.View>
        </Animated.View>
      </View>
    );
  };

  const renderStep = (icon, text, defaultSubtitle, animation, subtitleAnim, step, isLast = false, isDark) => {
    const checkAnim = getCheckmarkAnimation(step);
    const spinAnim = getSpinnerAnimation(step);
    const stepState = store.stepStates[step];
    const isTextAnimDone = textAnimCompleted[step];
    
    // Special handling for result step - CRITICALLY important
    // Only render the result step if it's active or completed
    if (step === 'result' && stepState === STEP_WAITING) {
      return null;
    }
    
    // Standard rendering for all steps
    const displaySubtitle = store.getCurrentSubtitle(step) || defaultSubtitle;
    
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
                  typingSpeed={20}
                  characterDelay={20}
                  onComplete={() => { setTextAnimCompleted(prev => ({ ...prev, [step]: true })); }}
                />
              ) : (
                <ShimmerEffect 
                  style={{ width: '100%' }} 
                  isCompleted={stepState === STEP_COMPLETED}
                  isActive={stepState === STEP_ACTIVE}
                  width={200}
                  isDark={isDark}
                >
                  <Text 
                    style={[
                      styles.stepText, 
                      { color: stepState === STEP_COMPLETED ? (isDark ? '#CCC' : '#999999') : (isDark ? '#FFF' : '#000') }
                    ]}
                  >
                    {text}
                  </Text>
                </ShimmerEffect>
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
        
        {/* Use custom spinner for active step */}
        {stepState === STEP_ACTIVE && (
          <Animated.View
            style={[
              styles.spinnerContainer,
              {
                transform: [
                  { rotate: getSpinnerRotation(spinAnim) }
                ]
              }
            ]}
          >
            <MaterialCommunityIcons
              name="loading"
              size={20}
              color={isDark ? '#FFF' : '#000'}
            />
          </Animated.View>
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
        <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFillObject} />
        
        <Animated.View 
          style={[
            styles.stepsContainer,
            { opacity: stepsContainerAnim }
          ]}
        >
          {renderStep(
            'food-apple', 
            'Food Recognition', 
            store.detectedFood ? `Found ${store.detectedFood} in your image` : 
              (store.foodItems && store.foodItems.length > 0) ? `Found ${store.foodItems[0]} in your image` :
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
            store.searchResults.length > 0 ? `Searched ${store.searchResults.length} websites` :
              store.searchQueries.length > 0 ? `Searching for "${store.searchQueries[0]}"` :
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
          {renderStep(
            'flag', 
            'Results', 
            store.detectedFood ? `Nutrition facts for ${store.detectedFood}` : 
              (store.foodItems && store.foodItems.length > 0) ? `Nutrition facts for ${store.foodItems[0]}` :
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
    backgroundColor: 'transparent', // Make transparent to allow BlurView to work
    position: 'relative',
    minHeight: 380,
    overflow: 'hidden',
  },
  stepsContainer: {
    opacity: 1, // Will be animated
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 12,
    position: 'relative',
    paddingRight: 40, // Add padding to accommodate spinner
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
    zIndex: 5, // Ensure icon is above connector line
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
    zIndex: 6, // Ensure checkmark is above icon
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
    zIndex: 1, // Ensure connector is below icon
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
    right: 8,
    top: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  }
});

export default FunctionalAIVisualizationWithStore; 