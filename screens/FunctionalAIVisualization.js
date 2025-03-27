import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AIAnimatedText from './AIAnimatedText';
import AIAnimatedSubtitle from './AIAnimatedSubtitle';
import ShimmerText from '../components/ShimmerText';

const { width } = Dimensions.get('window');

// Step states
const STEP_WAITING = 'waiting';
const STEP_ACTIVE = 'active';
const STEP_COMPLETED = 'completed';

// IMPORTANT: We're using a completely non-animated version to avoid the "cannot add a new property" error
// This version uses regular Views with manual opacity changes instead of Animated API

const FunctionalAIVisualization = React.forwardRef(({ 
  isDark, 
  isVisible, 
  searchQueries = [],
  searchResults = [], 
  foodItems = [],
  processingSteps = [],
  brandName = '',
  summaryText = '',
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
  
  // State to track if accuracy text has been finalized
  const [isAccuracyFinalized, setIsAccuracyFinalized] = useState(false);
  
  // State to store the finalized accuracy text
  const [finalAccuracyText, setFinalAccuracyText] = useState('');
  
  // Use manual opacity states instead of Animated values
  const [containerOpacity, setContainerOpacity] = useState(0.1);
  const [recognizeOpacity, setRecognizeOpacity] = useState(0.01);
  const [searchOpacity, setSearchOpacity] = useState(0.01);
  const [processOpacity, setProcessOpacity] = useState(0.01);
  const [resultOpacity, setResultOpacity] = useState(0.01);
  
  const [recognizeSubtitleOpacity, setRecognizeSubtitleOpacity] = useState(0.01);
  const [searchSubtitleOpacity, setSearchSubtitleOpacity] = useState(0.01);
  const [processSubtitleOpacity, setProcessSubtitleOpacity] = useState(0.01);
  const [resultSubtitleOpacity, setResultSubtitleOpacity] = useState(0.01);
  
  const [recognizeCheckOpacity, setRecognizeCheckOpacity] = useState(0.01);
  const [searchCheckOpacity, setSearchCheckOpacity] = useState(0.01);
  const [processCheckOpacity, setProcessCheckOpacity] = useState(0.01);
  const [resultCheckOpacity, setResultCheckOpacity] = useState(0.01);
  
  const [recognizeSpinOpacity, setRecognizeSpinOpacity] = useState(0.01);
  const [searchSpinOpacity, setSearchSpinOpacity] = useState(0.01);
  const [processSpinOpacity, setProcessSpinOpacity] = useState(0.01);
  const [resultSpinOpacity, setResultSpinOpacity] = useState(0.01);
  
  const [accuracyBoxOpacity, setAccuracyBoxOpacity] = useState(0.1);
  
  // Memoize the ActivityIndicators to prevent recreation
  const recognizeIndicator = useMemo(() => <ActivityIndicator size="small" color="#FFC107" />, []);
  const searchIndicator = useMemo(() => <ActivityIndicator size="small" color="#2196F3" />, []);
  const processIndicator = useMemo(() => <ActivityIndicator size="small" color="#9C27B0" />, []);
  const resultIndicator = useMemo(() => <ActivityIndicator size="small" color="#FF5722" />, []);
  
  // Generate dynamic subtitles from real data
  const getRecognizeSubtitles = (customFoodItems = foodItems) => {
    // Start with clear initial state
    const subtitles = ['Finding food in image...'];
    
    if (customFoodItems && customFoodItems.length > 0) {
      // Add clear indication of progress
      subtitles.push(`Identified ${customFoodItems.length} food item(s): ${customFoodItems.join(', ')}...`);
      
      // More specific analysis steps for each item
      customFoodItems.forEach(item => {
        subtitles.push(`Analyzing ${item}...`);
        subtitles.push(`Measuring portion size of ${item}...`);
        subtitles.push(`Determining nutritional profile of ${item}...`);
      });
      
      // Add meaningful multi-item steps
      if (customFoodItems.length > 1) {
        subtitles.push(`Separating ${customFoodItems.join(', ')} for individual analysis...`);
        subtitles.push(`Evaluating combined meal nutritional content...`);
      }
      
      // Finalizing steps
      subtitles.push(`Completing analysis of ${customFoodItems.join(', ')}...`);
    } else {
      // More informative loading steps when no items yet
      subtitles.push('Scanning image for visible food items...');
      subtitles.push('Detecting food shapes and textures...');
      subtitles.push('Identifying potential food objects...');
      subtitles.push('Analyzing visual characteristics...');
      subtitles.push('Matching against food database...');
    }
    
    return subtitles;
  };
  
  // Use actual search queries if available and format them with website names
  const getSearchSubtitles = (customQueries = searchQueries, customResults = searchResults) => {
    const subtitles = [];
    
    // Add identified food items if available but no queries yet
    if (foodItems && foodItems.length > 0 && (!customQueries || customQueries.length === 0)) {
      if (brandName) {
        subtitles.push(`Identified ${brandName} product...`);
      }
      
      foodItems.forEach(item => {
        const itemText = brandName ? `${brandName} ${item}` : item;
        subtitles.push(`Preparing search queries for ${itemText}...`);
        subtitles.push(`Looking up nutritional data for ${itemText}...`);
      });
    }
    
    // Add actual search queries with clear progress indicators
    if (customQueries && customQueries.length > 0) {
      subtitles.push(`Searching ${customQueries.length} queries for precise nutrition data...`);
      
      customQueries.forEach((query, index) => {
        subtitles.push(`Query ${index+1}/${customQueries.length}: "${query}"...`);
      });
    }
    
    // Add actual websites being visited with more detailed information
    if (customResults && customResults.length > 0) {
      subtitles.push(`Found ${customResults.length} reliable nutrition sources...`);
      
      customResults.forEach((result, index) => {
        // Extract domain name for cleaner display
        let domain = '';
        try {
          const url = new URL(result.url);
          domain = url.hostname.replace('www.', '');
        } catch (e) {
          domain = result.url.split('/')[2] || result.url;
        }
        
        if (domain) {
          subtitles.push(`Source ${index+1}/${customResults.length}: ${domain}...`);
          
          if (result.title) {
            subtitles.push(`Reading "${result.title}"...`);
            subtitles.push(`Extracting nutrition facts from "${result.title}"...`);
          }
        }
      });
      
      // Add source evaluation steps
      if (customResults.length > 1) {
        subtitles.push(`Cross-referencing data across ${customResults.length} sources...`);
        subtitles.push(`Validating nutritional information accuracy...`);
      }
    }
    
    // If we still don't have subtitles, use more specific database references
    if (subtitles.length === 0) {
      return [
        'Searching USDA nutrition database...',
        'Accessing FDA food composition data...',
        'Querying nutritional research databases...',
        'Referencing peer-reviewed nutrition journals...',
        'Consulting trusted nutritional resources...',
        'Analyzing food composition databases...'
      ];
    }
    
    return subtitles;
  };
  
  // Use actual processing steps based on food and search results
  const getProcessSubtitles = (customFoodItems = foodItems, customResults = searchResults) => {
    const subtitles = [];
    
    // Add specific processing messages for each food item
    if (customFoodItems && customFoodItems.length > 0) {
      // First a summary of what we're processing
      if (customFoodItems.length === 1) {
        subtitles.push(`Processing nutritional data for ${customFoodItems[0]}...`);
      } else {
        subtitles.push(`Processing nutritional data for ${customFoodItems.length} food items...`);
      }
      
      // Then detail for each food item
      customFoodItems.forEach(item => {
        subtitles.push(`Analyzing macronutrients in ${item}...`);
        subtitles.push(`Calculating calories in ${item}...`);
        subtitles.push(`Determining micronutrients for ${item}...`);
        subtitles.push(`Evaluating portion accuracy for ${item}...`);
      });
      
      // For multiple items, add combined processing
      if (customFoodItems.length > 1) {
        subtitles.push(`Combining data for complete meal analysis...`);
        subtitles.push(`Evaluating nutritional balance of combined items...`);
      }
    }
    
    // Add data-driven processing based on search results
    if (customResults && customResults.length > 0) {
      // First statement about source processing
      subtitles.push(`Processing data from ${customResults.length} nutrition sources...`);
      
      // Add processing statements for different data types
      subtitles.push(`Validating nutritional values across sources...`);
      subtitles.push(`Resolving conflicting nutrition information...`);
      subtitles.push(`Calculating confidence intervals for nutrition values...`);
      
      // Add processing for specific result types
      const hasUSDA = customResults.some(r => 
        r.url?.includes('usda') || r.title?.includes('USDA')
      );
      
      const hasFDA = customResults.some(r => 
        r.url?.includes('fda') || r.title?.includes('FDA')
      );
      
      if (hasUSDA) {
        subtitles.push(`Verifying against USDA standard reference data...`);
      }
      
      if (hasFDA) {
        subtitles.push(`Checking FDA nutritional guidelines...`);
      }
    }
    
    // Add AI-specific processing steps
    subtitles.push(`Applying nutritional analysis algorithms...`);
    subtitles.push(`Generating comprehensive nutrition profile...`);
    subtitles.push(`Calculating margin of error for nutritional values...`);
    subtitles.push(`Finalizing nutrition fact calculations...`);
    
    // Add custom processing steps from props if available
    if (processingSteps && processingSteps.length > 0) {
      processingSteps.forEach(step => {
        if (!subtitles.includes(step)) {
          subtitles.push(step);
        }
      });
    }
    
    return subtitles;
  };
  
  // Add custom result step messages
  const getResultSubtitles = (customFoodItems = foodItems, customResults = searchResults) => {
    const subtitles = ['Compiling nutrition analysis...'];
    
    // Make specific references to the analyzed food items
    if (customFoodItems && customFoodItems.length > 0) {
      // General statement about results
      if (customFoodItems.length === 1) {
        subtitles.push(`Creating detailed nutrition profile for ${customFoodItems[0]}...`);
      } else {
        subtitles.push(`Creating detailed nutrition profiles for ${customFoodItems.length} items...`);
      }
      
      // Add specific result steps for each item
      customFoodItems.forEach(item => {
        subtitles.push(`Finalizing macronutrient ratios for ${item}...`);
        subtitles.push(`Calculating calorie content for ${item}...`);
        subtitles.push(`Determining portion size accuracy for ${item}...`);
      });
      
      // Reference confidence levels
      if (customResults && customResults.length > 0) {
        subtitles.push(`Calculating confidence based on ${customResults.length} sources...`);
      }
    }
    
    // Add specific result steps
    subtitles.push('Generating nutrition facts panel...');
    subtitles.push('Formatting nutrition data for display...');
    
    // Add output information steps
    subtitles.push('Organizing ingredient breakdown...');
    subtitles.push('Preparing source information...');
    subtitles.push('Formatting accuracy statistics...');
    subtitles.push('Generating nutrition insights...');
    subtitles.push('Preparing final nutrition report...');
    
    return subtitles;
  };

  // State to track current subtitles
  const [recognizeSubtitles, setRecognizeSubtitles] = useState(getRecognizeSubtitles());
  const [searchSubtitles, setSearchSubtitles] = useState(getSearchSubtitles());
  const [processSubtitles, setProcessSubtitles] = useState(getProcessSubtitles());
  const [resultSubtitles, setResultSubtitles] = useState(getResultSubtitles());
  
  // Current subtitle indices
  const [currentRecognizeSubtitleIndex, setCurrentRecognizeSubtitleIndex] = useState(0);
  const [currentSearchSubtitleIndex, setCurrentSearchSubtitleIndex] = useState(0);
  const [currentProcessSubtitleIndex, setCurrentProcessSubtitleIndex] = useState(0);
  const [currentResultSubtitleIndex, setCurrentResultSubtitleIndex] = useState(0);

  // Animation cleanup references
  const timeoutRefs = useRef([]);
  const intervalRefs = useRef({});
  const shimmerLoopsRef = useRef([null, null, null, null, null]);
  
  // Remove animation tracking that causes errors
  // const animationRefs = useRef([]); 

  // Haptic feedback functions
  const triggerStepHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const triggerSubtitleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const triggerCompletionHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Animation utility functions - completely rewritten to avoid all animated API methods
  const startSpinner = (setSpinnerOpacity) => {
    try {
      // Just set the value directly using setState function, not setValue
      setSpinnerOpacity(1);
    } catch (error) {
      console.log(`[AIVisual] ERROR in startSpinner: ${error.message}`);
    }
  };

  // Stop a spinner animation safely with error handling
  const stopSpinner = (setSpinnerOpacity) => {
    try {
      // Just set the value directly using setState function, not setValue
      setSpinnerOpacity(0.01);
    } catch (error) {
      console.log(`[AIVisual] ERROR in stopSpinner: ${error.message}`);
    }
  };

  // Direct value setter without any animation configuration
  const setAnimatedValue = (setStateFunction, targetValue, description = '') => {
    try {
      // Directly set value without any animation using setState function
      setStateFunction(targetValue);
    } catch (error) {
      console.log(`[AIVisual] ERROR setting ${description || 'animated value'}: ${error.message}`);
    }
  };

  // Helper method to animate a value using setInterval instead of Animated API
  const animateWithInterval = (setStateFunction, fromValue, toValue, duration, description = '') => {
    try {
      // Start with from value
      setStateFunction(fromValue);
      
      const steps = 10; // Number of steps in the animation
      const stepValue = (toValue - fromValue) / steps;
      const stepDuration = duration / steps;
      let currentStep = 0;
      
      // Create an interval that increments the value
      const intervalId = setInterval(() => {
        try {
          currentStep++;
          if (currentStep >= steps) {
            // Final step - set exactly to the target value and clear interval
            setStateFunction(toValue);
            clearInterval(intervalId);
          } else {
            // Intermediate step
            const nextValue = fromValue + (stepValue * currentStep);
            setStateFunction(nextValue);
          }
        } catch (error) {
          // If any error, clear the interval and try to set final value
          console.log(`[AIVisual] ERROR in animation interval (${description}): ${error.message}`);
          clearInterval(intervalId);
          try {
            setStateFunction(toValue);
          } catch (finalError) {
            console.log(`[AIVisual] ERROR setting final value: ${finalError.message}`);
          }
        }
      }, stepDuration);
      
      // Store the interval for cleanup
      if (!intervalRefs.current.animations) {
        intervalRefs.current.animations = [];
      }
      intervalRefs.current.animations.push(intervalId);
      
      return intervalId;
    } catch (error) {
      console.log(`[AIVisual] ERROR starting interval animation (${description}): ${error.message}`);
      return null;
    }
  };

  // Add a timestamp to track when we last tried to complete visualization
  const lastCompletionAttemptRef = useRef(0);

  // Update subtitles when props change
  useEffect(() => {
    // First update all subtitle lists
    setRecognizeSubtitles(getRecognizeSubtitles());
    setSearchSubtitles(getSearchSubtitles());
    setProcessSubtitles(getProcessSubtitles());
    setResultSubtitles(getResultSubtitles());
    
    // Reset subtitle indices to show the most recent additions based on current step
    if (stepStates.recognize === STEP_ACTIVE && foodItems && foodItems.length > 0) {
      // Force showing the newest food items if in recognition step
      const newRecognizeSubtitles = getRecognizeSubtitles();
      setCurrentRecognizeSubtitleIndex(newRecognizeSubtitles.length - 1);
      
      // Provide haptic feedback for new content
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (stepStates.search === STEP_ACTIVE) {
      if (searchQueries && searchQueries.length > 0) {
        // Force showing the newest query if in search step
        const newSearchSubtitles = getSearchSubtitles();
        setCurrentSearchSubtitleIndex(newSearchSubtitles.length - 1);
        
        // Provide haptic feedback for new content
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      if (searchResults && searchResults.length > 0) {
        // Force showing the newest result if in search step
        const newSearchSubtitles = getSearchSubtitles();
        setCurrentSearchSubtitleIndex(newSearchSubtitles.length - 1);
        
        // Provide haptic feedback for new content
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [foodItems, searchQueries, searchResults, processingSteps, stepStates]);

  // Update steps based on data availability
  useEffect(() => {
    // If we have food items, complete the recognition step
    if (foodItems && foodItems.length > 0 && stepStates.recognize === STEP_ACTIVE) {
      completeRecognitionStep();
    }
    
    // If we have search queries or results, complete the search step
    if ((searchQueries && searchQueries.length > 0 || searchResults && searchResults.length > 0) && 
        stepStates.search === STEP_ACTIVE) {
      // Set a small timeout to allow for the visual effect
      clearTimeout(timeoutRefs.current.searchCompletion);
      timeoutRefs.current.searchCompletion = setTimeout(() => {
        completeSearchStep();
      }, 800);
    }
    
    // Check for explicit completion flag in props
    // This is a direct pathway to completion when the parent indicates processing is complete
    if (foodItems && foodItems.length > 0 && foodItems[0]._isProcessingComplete === true) {
      console.log('Found explicit completion flag in foodItems, completing visualization');
      
      // Ensure we're in the result step first if not already
      if (stepStates.recognize === STEP_ACTIVE) {
        completeRecognitionStep();
        setTimeout(() => {
          if (stepStates.search === STEP_ACTIVE) {
            completeSearchStep();
            setTimeout(() => {
              if (stepStates.process === STEP_ACTIVE) {
                completeProcessingStep();
                // Allow time for the result step to initialize
                setTimeout(() => {
                  completeVisualization();
                }, 1500);
              }
            }, 1500);
          }
        }, 1500);
      } else if (stepStates.search === STEP_ACTIVE) {
        completeSearchStep();
        setTimeout(() => {
          if (stepStates.process === STEP_ACTIVE) {
            completeProcessingStep();
            // Allow time for the result step to initialize
            setTimeout(() => {
              completeVisualization();
            }, 1500);
          }
        }, 1500);
      } else if (stepStates.process === STEP_ACTIVE) {
        completeProcessingStep();
        // Allow time for the result step to initialize
        setTimeout(() => {
          completeVisualization();
        }, 1500);
      } else if (stepStates.result === STEP_ACTIVE) {
        completeVisualization();
      }
    }
    
    // Check if we have summary text - it's a signal that we have complete data
    if (summaryText && stepStates.result === STEP_ACTIVE) {
      // We have summary text which indicates complete data
      const now = Date.now();
      if (now - lastCompletionAttemptRef.current > 3000) {
        lastCompletionAttemptRef.current = now;
        setTimeout(() => {
          completeVisualization();
        }, 1500);
      }
    }
    
    // Processing step completes on a timer, not based on data
    // We'll set this up in the completeSearchStep function
  }, [foodItems, searchQueries, searchResults, summaryText, stepStates]);

  // Helper functions to complete each step
  const completeRecognitionStep = () => {
    console.log(`[AIVisual] Starting recognition step completion`);
    
    // Clear the recognition interval
    try {
      if (intervalRefs.current.recognition) {
        clearInterval(intervalRefs.current.recognition);
        intervalRefs.current.recognition = null;
        console.log(`[AIVisual] Recognition interval cleared`);
      }
    } catch (error) {
      console.log(`[AIVisual] ERROR clearing recognition interval: ${error.message}`);
    }
    
    try {
      console.log(`[AIVisual] Stopping recognition spinner`);
      stopSpinner(setRecognizeSpinOpacity);
    } catch (error) {
      console.log(`[AIVisual] ERROR stopping spinner: ${error.message}`);
    }

    try {
      console.log(`[AIVisual] Showing recognition checkmark`);
      setAnimatedValue(setRecognizeCheckOpacity, 1, "recognizeCheckOpacity");
    } catch (error) {
      console.log(`[AIVisual] ERROR showing checkmark: ${error.message}`);
    }
    
    try {
      console.log(`[AIVisual] Updating step states`);
      setStepStates(prev => ({ ...prev, recognize: STEP_COMPLETED, search: STEP_ACTIVE }));
      console.log(`[AIVisual] Step states updated`);
    } catch (error) {
      console.log(`[AIVisual] ERROR updating step states: ${error.message}`);
    }
    
    try {
      console.log(`[AIVisual] Triggering haptic feedback`);
      triggerStepHaptic();
      console.log(`[AIVisual] Haptic feedback triggered`);
    } catch (error) {
      console.log(`[AIVisual] ERROR with haptic feedback: ${error.message}`);
    }

    try {
      console.log(`[AIVisual] Starting search spinner`);
      startSpinner(setSearchSpinOpacity);
    } catch (error) {
      console.log(`[AIVisual] ERROR starting search spinner: ${error.message}`);
    }
    
    try {
      console.log(`[AIVisual] Setting up search subtitle cycling`);
      const searchInterval = animateWithInterval(setSearchOpacity, 0, 1, 3000, "searchOpacity");
      intervalRefs.current.search = searchInterval;
      console.log(`[AIVisual] Search subtitle cycling set up`);
    } catch (error) {
      console.log(`[AIVisual] ERROR setting up search subtitle cycling: ${error.message}`);
    }
    
    try {
      console.log(`[AIVisual] Animating search step`);
      // Use interval for search animation instead of Animated.spring
      animateWithInterval(setSearchOpacity, 0, 1, 500, "search step animation");
      
      // Use interval for subtitle animation instead of Animated.timing
      animateWithInterval(setSearchSubtitleOpacity, 0, 1, 300, "search subtitle animation");
    } catch (error) {
      console.log(`[AIVisual] ERROR animating search step: ${error.message}`);
      // Fallback: directly set values if animation fails
      try {
        setAnimatedValue(setSearchOpacity, 1, "searchOpacity direct fallback");
        setAnimatedValue(setSearchSubtitleOpacity, 1, "searchSubtitleOpacity direct fallback");
      } catch (fallbackError) {
        console.log(`[AIVisual] ERROR in animation fallback: ${fallbackError.message}`);
      }
    }
    
    try {
      console.log(`[AIVisual] Setting up text animation completion timeout`);
      const textAnimTimeout = setTimeout(() => {
        try {
          setTextAnimCompleted(prev => ({ ...prev, search: true }));
          console.log(`[AIVisual] Search text animation marked as completed`);
        } catch (error) {
          console.log(`[AIVisual] ERROR marking search text animation complete: ${error.message}`);
        }
      }, 1000);
      
      timeoutRefs.current.push(textAnimTimeout);
      console.log(`[AIVisual] Text animation completion timeout set`);
    } catch (error) {
      console.log(`[AIVisual] ERROR setting up text animation completion: ${error.message}`);
    }
    
    console.log(`[AIVisual] Recognition step completion finished`);
  };
  
  const completeSearchStep = () => {
    // Clear the search interval
    if (intervalRefs.current.search) {
      clearInterval(intervalRefs.current.search);
      intervalRefs.current.search = null;
    }
    stopSpinner(setSearchSpinOpacity);

    // Show checkmark directly without tracking
    setSearchCheckOpacity(1);
    
    setStepStates(prev => ({ ...prev, search: STEP_COMPLETED, process: STEP_ACTIVE }));
    triggerStepHaptic();

    // Start the process spinner
    startSpinner(setProcessSpinOpacity);
    
    // Start cycling through process subtitles
    const processInterval = animateWithInterval(setProcessOpacity, 0, 1, 3000, "processOpacity");
    intervalRefs.current.process = processInterval;
    
    // Animate process step directly without tracking
    // Use interval for process animation
    animateWithInterval(setProcessOpacity, 0, 1, 500, "process step animation");
    
    // Use interval for subtitle animation
    animateWithInterval(setProcessSubtitleOpacity, 0, 1, 300, "process subtitle animation");
    
    // Mark process text animation as completed after a delay
    const textAnimTimeout = setTimeout(() => {
      setTextAnimCompleted(prev => ({ ...prev, process: true }));
    }, 1000);
    
    timeoutRefs.current.push(textAnimTimeout);
  };
  
  const completeProcessingStep = () => {
    // Clear the process interval
    if (intervalRefs.current.process) {
      clearInterval(intervalRefs.current.process);
      intervalRefs.current.process = null;
    }
    stopSpinner(setProcessSpinOpacity);
    
    // Show checkmark directly without tracking
    setProcessCheckOpacity(1);
    
    setStepStates(prev => ({ ...prev, process: STEP_COMPLETED, result: STEP_ACTIVE }));
    triggerStepHaptic();
    
    // Log that we're activating the result step
    console.log('Activating result step - ready for completion');
    
    // Start the result spinner
    startSpinner(setResultSpinOpacity);
    
    // Start cycling through result subtitles
    const resultInterval = animateWithInterval(setResultOpacity, 0, 1, 3000, "resultOpacity");
    intervalRefs.current.result = resultInterval;
    
    // Animate result step directly without tracking
    // Use interval for result animation
    animateWithInterval(setResultOpacity, 0, 1, 500, "result step animation");
    
    // Use interval for subtitle animation
    animateWithInterval(setResultSubtitleOpacity, 0, 1, 300, "result subtitle animation");
    
    // Mark result text animation as completed after a delay
    const textAnimTimeout = setTimeout(() => {
      setTextAnimCompleted(prev => ({ ...prev, result: true }));
    }, 1000);
    
    timeoutRefs.current.push(textAnimTimeout);
  };

  // Get statistics about the search results
  const getAccuracyText = () => {
    // Return the requested text regardless of other conditions
    return "We verified this result with search";
  };

  // Helper method to complete visualization (used internally and exposed via ref)
  const completeVisualization = (forceCompletion = false) => {
    try {
      console.log(`[AIVisual] Starting visualization completion (force=${forceCompletion})`);
      console.log(`[AIVisual] Current step states:`, JSON.stringify(stepStates));
      
      // Make sure all previous steps are completed
      if (stepStates.recognize !== STEP_COMPLETED) {
        console.log(`[AIVisual] Recognize step not completed, completing it first`);
        try {
          completeRecognitionStep();
          // Set a timeout to continue after recognition completes
          const completionTimeout = setTimeout(() => {
            try {
              completeVisualization(forceCompletion);
            } catch (timeoutError) {
              console.log(`[AIVisual] ERROR in completion timeout callback: ${timeoutError.message}`);
            }
          }, 800);
          timeoutRefs.current.push(completionTimeout);
        } catch (error) {
          console.log(`[AIVisual] ERROR completing recognition step: ${error.message}`);
        }
        return;
      }
      
      if (stepStates.search !== STEP_COMPLETED) {
        console.log(`[AIVisual] Search step not completed, completing it first`);
        try {
          completeSearchStep();
          // Set a timeout to continue after search completes
          const completionTimeout = setTimeout(() => {
            try {
              completeVisualization(forceCompletion);
            } catch (timeoutError) {
              console.log(`[AIVisual] ERROR in completion timeout callback: ${timeoutError.message}`);
            }
          }, 800);
          timeoutRefs.current.push(completionTimeout);
        } catch (error) {
          console.log(`[AIVisual] ERROR completing search step: ${error.message}`);
        }
        return;
      }
      
      if (stepStates.process !== STEP_COMPLETED) {
        console.log(`[AIVisual] Process step not completed, completing it first`);
        try {
          completeProcessingStep();
          // Set a timeout to continue after processing completes
          const completionTimeout = setTimeout(() => {
            try {
              completeVisualization(forceCompletion);
            } catch (timeoutError) {
              console.log(`[AIVisual] ERROR in completion timeout callback: ${timeoutError.message}`);
            }
          }, 800);
          timeoutRefs.current.push(completionTimeout);
        } catch (error) {
          console.log(`[AIVisual] ERROR completing processing step: ${error.message}`);
        }
        return;
      }
      
      // If we've made it here and the result step isn't active, force it to become active
      if (stepStates.result !== STEP_ACTIVE && stepStates.result !== STEP_COMPLETED) {
        console.log(`[AIVisual] Result step not active or completed, activating it`);
        try {
          setStepStates(prev => ({ ...prev, result: STEP_ACTIVE }));
          startSpinner(setResultSpinOpacity);
          
          // Wait a moment for the state to update
          const completionTimeout = setTimeout(() => {
            try {
              completeVisualization(true);
            } catch (timeoutError) {
              console.log(`[AIVisual] ERROR in activation timeout callback: ${timeoutError.message}`);
            }
          }, 500);
          timeoutRefs.current.push(completionTimeout);
        } catch (error) {
          console.log(`[AIVisual] ERROR activating result step: ${error.message}`);
        }
        return;
      }
      
      // If we've already completed the result step, don't do it again
      if (stepStates.result === STEP_COMPLETED) {
        console.log(`[AIVisual] Result step already completed, nothing to do`);
        return;
      }
      
      // Check if we've recently tried to complete, prevent rapid re-completions
      // BUT allow bypassing this check with forceCompletion flag
      const now = Date.now();
      if (!forceCompletion && now - lastCompletionAttemptRef.current < 2000) {
        console.log(`[AIVisual] Not completing visualization: too soon since last attempt`);
        return;
      }
      
      lastCompletionAttemptRef.current = now;
      console.log(`[AIVisual] All checks passed, proceeding with final completion`);
      
      // Complete the results step
      try {
        console.log(`[AIVisual] Cleaning up result cycle interval`);
        if (intervalRefs.current.result) {
          clearInterval(intervalRefs.current.result);
          intervalRefs.current.result = null;
        }
      } catch (error) {
        console.log(`[AIVisual] ERROR clearing result interval: ${error.message}`);
      }
      
      try {
        console.log(`[AIVisual] Stopping result spinner`);
        stopSpinner(setResultSpinOpacity);
      } catch (error) {
        console.log(`[AIVisual] ERROR stopping result spinner: ${error.message}`);
      }
      
      try {
        console.log(`[AIVisual] Showing result checkmark`);
        setAnimatedValue(setResultCheckOpacity, 1, "resultCheckOpacity");
      } catch (error) {
        console.log(`[AIVisual] ERROR showing result checkmark: ${error.message}`);
      }
      
      try {
        console.log(`[AIVisual] Updating result step state to completed`);
        setStepStates(prev => ({ ...prev, result: STEP_COMPLETED }));
      } catch (error) {
        console.log(`[AIVisual] ERROR updating result step state: ${error.message}`);
      }
      
      try {
        console.log(`[AIVisual] Triggering step haptic feedback`);
        triggerStepHaptic();
      } catch (error) {
        console.log(`[AIVisual] ERROR triggering step haptic: ${error.message}`);
      }
      
      try {
        console.log(`[AIVisual] Animating accuracy box`);
        // Use interval for accuracy box animation
        animateWithInterval(setAccuracyBoxOpacity, 0.1, 1, 500, "accuracy box animation");
      } catch (error) {
        console.log(`[AIVisual] ERROR animating accuracy box: ${error.message}`);
        // Try direct approach if animation fails
        try {
          setAnimatedValue(setAccuracyBoxOpacity, 1, "accuracyBoxOpacity direct fallback");
        } catch (fallbackError) {
          console.log(`[AIVisual] ERROR in accuracy box fallback: ${fallbackError.message}`);
        }
      }
      
      try {
        console.log(`[AIVisual] Triggering accuracy box haptic feedback`);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.log(`[AIVisual] ERROR with accuracy box haptic: ${error.message}`);
      }
      
      try {
        console.log(`[AIVisual] Setting up completion haptic timeout`);
        const successHapticTimeout = setTimeout(() => {
          try {
            console.log(`[AIVisual] Triggering completion haptic`);
            triggerCompletionHaptic();
            
            // If onComplete is provided, call it
            if (onComplete) {
              console.log(`[AIVisual] Calling onComplete callback`);
              try {
                onComplete();
              } catch (callbackError) {
                console.log(`[AIVisual] ERROR in onComplete callback: ${callbackError.message}`);
              }
            }
          } catch (hapticError) {
            console.log(`[AIVisual] ERROR with completion haptic: ${hapticError.message}`);
          }
        }, 500);
        
        timeoutRefs.current.push(successHapticTimeout);
      } catch (error) {
        console.log(`[AIVisual] ERROR setting up completion haptic: ${error.message}`);
      }
      
      console.log(`[AIVisual] Visualization completion sequence finished successfully`);
    } catch (error) {
      console.log(`[AIVisual] CRITICAL ERROR in completeVisualization: ${error.message}`);
      // Even in case of critical error, try to call onComplete if provided
      if (onComplete) {
        try {
          console.log(`[AIVisual] Attempting to call onComplete after critical error`);
          onComplete();
        } catch (callbackError) {
          console.log(`[AIVisual] ERROR calling onComplete after critical error: ${callbackError.message}`);
        }
      }
    }
  };

  // Define a common reset function that both the imperative handle and internal methods can use
  const resetVisualization = () => {
    console.log(`[AIVisual] Resetting visualization - starting`);
    
    try {
      // Reset all animation values directly with logging
      console.log(`[AIVisual] Resetting main animations`);
      setAnimatedValue(setRecognizeOpacity, 0.01, "recognizeOpacity");
      setAnimatedValue(setSearchOpacity, 0.01, "searchOpacity");
      setAnimatedValue(setProcessOpacity, 0.01, "processOpacity");
      setAnimatedValue(setResultOpacity, 0.01, "resultOpacity");
      
      console.log(`[AIVisual] Resetting subtitle animations`);
      setAnimatedValue(setRecognizeSubtitleOpacity, 0.01, "recognizeSubtitleOpacity");
      setAnimatedValue(setSearchSubtitleOpacity, 0.01, "searchSubtitleOpacity");
      setAnimatedValue(setProcessSubtitleOpacity, 0.01, "processSubtitleOpacity");
      setAnimatedValue(setResultSubtitleOpacity, 0.01, "resultSubtitleOpacity");
      
      console.log(`[AIVisual] Resetting spinner animations`);
      setAnimatedValue(setRecognizeSpinOpacity, 0.01, "recognizeSpinOpacity");
      setAnimatedValue(setSearchSpinOpacity, 0.01, "searchSpinOpacity");
      setAnimatedValue(setProcessSpinOpacity, 0.01, "processSpinOpacity");
      setAnimatedValue(setResultSpinOpacity, 0.01, "resultSpinOpacity");
      
      console.log(`[AIVisual] Resetting checkmark animations`);
      setAnimatedValue(setRecognizeCheckOpacity, 0.01, "recognizeCheckOpacity");
      setAnimatedValue(setSearchCheckOpacity, 0.01, "searchCheckOpacity");
      setAnimatedValue(setProcessCheckOpacity, 0.01, "processCheckOpacity");
      setAnimatedValue(setResultCheckOpacity, 0.01, "resultCheckOpacity");
      
      console.log(`[AIVisual] Resetting accuracy box animation`);
      setAnimatedValue(setAccuracyBoxOpacity, 0.1, "accuracyBoxOpacity");
    } catch (error) {
      console.log(`[AIVisual] ERROR during animation reset: ${error.message}`);
      // Continue with reset even if animations fail
    }

    // Clear all timeouts with logging
    console.log(`[AIVisual] Clearing ${timeoutRefs.current.length} timeouts`);
    timeoutRefs.current.forEach((timeout, index) => {
      try {
        if (timeout) {
          clearTimeout(timeout);
          console.log(`[AIVisual] Cleared timeout #${index}`);
        }
      } catch (error) {
        console.log(`[AIVisual] ERROR clearing timeout #${index}: ${error.message}`);
      }
    });
    timeoutRefs.current = [];
    
    // Clear all intervals with logging
    const intervalCount = Object.keys(intervalRefs.current).length;
    console.log(`[AIVisual] Clearing ${intervalCount} intervals`);
    Object.entries(intervalRefs.current).forEach(([key, interval]) => {
      try {
        if (interval) {
          clearInterval(interval);
          console.log(`[AIVisual] Cleared interval: ${key}`);
        }
      } catch (error) {
        console.log(`[AIVisual] ERROR clearing interval ${key}: ${error.message}`);
      }
    });
    intervalRefs.current = {};
    
    // Reset other state
    console.log(`[AIVisual] Resetting state variables`);
    try {
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
      
      setIsAccuracyFinalized(false);
      setFinalAccuracyText('');
      
      // Reset step progression
      setCurrentRecognizeSubtitleIndex(0);
      setCurrentSearchSubtitleIndex(0);
      setCurrentProcessSubtitleIndex(0);
      setCurrentResultSubtitleIndex(0);
      
      console.log(`[AIVisual] State reset completed successfully`);
    } catch (error) {
      console.log(`[AIVisual] ERROR during state reset: ${error.message}`);
    }
    
    console.log(`[AIVisual] Reset visualization completed`);
  };

  // Expose methods to parent component via ref
  React.useImperativeHandle(ref, () => ({
    forceUpdateSubtitles: () => {
      try {
        console.log(`[AIVisual] Force updating subtitles`);
        // Update all subtitle lists
        const updatedRecognizeSubtitles = getRecognizeSubtitles();
        const updatedSearchSubtitles = getSearchSubtitles();
        const updatedProcessSubtitles = getProcessSubtitles();
        const updatedResultSubtitles = getResultSubtitles();
        
        // Set the updated lists
        setRecognizeSubtitles(updatedRecognizeSubtitles);
        setSearchSubtitles(updatedSearchSubtitles);
        setProcessSubtitles(updatedProcessSubtitles);
        setResultSubtitles(updatedResultSubtitles);
        
        // Update indices to show latest items
        if (stepStates.recognize === STEP_ACTIVE && updatedRecognizeSubtitles.length > 0) {
          setCurrentRecognizeSubtitleIndex(updatedRecognizeSubtitles.length - 1);
          console.log(`[AIVisual] Updated recognition subtitle index`);
        }
        
        if (stepStates.search === STEP_ACTIVE && updatedSearchSubtitles.length > 0) {
          setCurrentSearchSubtitleIndex(updatedSearchSubtitles.length - 1);
          console.log(`[AIVisual] Updated search subtitle index`);
        }
        
        if (stepStates.process === STEP_ACTIVE && updatedProcessSubtitles.length > 0) {
          setCurrentProcessSubtitleIndex(updatedProcessSubtitles.length - 1);
          console.log(`[AIVisual] Updated process subtitle index`);
        }
        
        if (stepStates.result === STEP_ACTIVE && updatedResultSubtitles.length > 0) {
          setCurrentResultSubtitleIndex(updatedResultSubtitles.length - 1);
          console.log(`[AIVisual] Updated result subtitle index`);
        }
        
        // Apply a small haptic feedback to indicate change
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (hapticError) {
          console.log(`[AIVisual] ERROR with update haptic: ${hapticError.message}`);
        }
        
        console.log(`[AIVisual] Force update subtitles completed`);
      } catch (error) {
        console.log(`[AIVisual] ERROR in forceUpdateSubtitles: ${error.message}`);
      }
    },
    completeVisualization: (forceCompletion = false) => {
      try {
        console.log(`[AIVisual] External call to completeVisualization (force=${forceCompletion})`);
        completeVisualization(forceCompletion);
      } catch (error) {
        console.log(`[AIVisual] ERROR in external completeVisualization: ${error.message}`);
      }
    },
    reset: () => {
      try {
        console.log(`[AIVisual] External call to reset`);
        resetVisualization();
      } catch (error) {
        console.log(`[AIVisual] ERROR in external reset: ${error.message}`);
      }
    },
    updateWithScanData: (scanData) => {
      try {
        console.log(`[AIVisual] Updating with scan data`);
        // This method can be called when the scan data comes in from the API
        if (scanData) {
          console.log(`[AIVisual] Scan data received for: ${scanData.food?.name || 'unknown'}`);
          
          // Check if this is a new scan (indicated by a special flag from the parent component)
          // or if we're in a waiting state (which implies we're ready for a new scan)
          const isNewScan = scanData._isNewScan === true || stepStates.recognize === STEP_WAITING;
          
          // If this is a new scan, reset everything first
          if (isNewScan) {
            console.log(`[AIVisual] New scan detected, resetting visualization state`);
            try {
              // Use the internal resetVisualization function directly
              resetVisualization();
            } catch (resetError) {
              console.log(`[AIVisual] ERROR during reset for new scan: ${resetError.message}`);
            }
          }
          
          // Update food items if available
          if (scanData.food && scanData.food.name) {
            try {
              const updatedSubtitles = getRecognizeSubtitles([scanData.food.name]);
              setRecognizeSubtitles(updatedSubtitles);
              
              // If in recognition step, show the new subtitle
              if (stepStates.recognize === STEP_ACTIVE) {
                setCurrentRecognizeSubtitleIndex(updatedSubtitles.length - 1);
                triggerSubtitleHaptic();
                console.log(`[AIVisual] Updated recognition subtitles with food: ${scanData.food.name}`);
              }
            } catch (foodUpdateError) {
              console.log(`[AIVisual] ERROR updating food recognition subtitles: ${foodUpdateError.message}`);
            }
          }
          
          // Update search info if available
          if (scanData._searchInfo) {
            try {
              let updatedQueries = scanData._searchInfo.queries || [];
              let updatedResults = scanData._searchInfo.results || [];
              
              if (updatedQueries.length > 0 || updatedResults.length > 0) {
                const updatedSubtitles = getSearchSubtitles(updatedQueries, updatedResults);
                setSearchSubtitles(updatedSubtitles);
                
                // If in search step, show the new subtitle
                if (stepStates.search === STEP_ACTIVE) {
                  setCurrentSearchSubtitleIndex(updatedSubtitles.length - 1);
                  triggerSubtitleHaptic();
                  console.log(`[AIVisual] Updated search subtitles with ${updatedQueries.length} queries and ${updatedResults.length} results`);
                }
              }
            } catch (searchUpdateError) {
              console.log(`[AIVisual] ERROR updating search subtitles: ${searchUpdateError.message}`);
            }
          }
          
          // Update summary text if available
          if (scanData.details && scanData.details.summaryText) {
            try {
              // Store the summary text for accuracy box
              if (!isAccuracyFinalized) {
                setFinalAccuracyText(scanData.details.summaryText);
                setIsAccuracyFinalized(true);
                
                // Trigger haptic feedback to indicate new content
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                console.log(`[AIVisual] Updated summary text and finalized accuracy`);
              }
            } catch (summaryUpdateError) {
              console.log(`[AIVisual] ERROR updating summary text: ${summaryUpdateError.message}`);
            }
          }
          
          // Check if this looks like a complete nutrition response
          const hasCompleteData = scanData.food && 
                                  scanData.food.name && 
                                  scanData.food.calories && 
                                  scanData.food.calories.amount && 
                                  scanData.details && 
                                  scanData.details.summaryText;
          
          // Check if explicitly marked as complete by the parent component
          const isExplicitlyComplete = scanData._isProcessingComplete === true;
          
          // Log the completion status
          console.log(`[AIVisual] Processing completion check:`, {
            hasCompleteData,
            isExplicitlyComplete,
            currentStep: Object.entries(stepStates).find(([_, value]) => value === STEP_ACTIVE)?.[0] || 'none'
          });
                      
          // If this is the final update and we're in results step, complete the visualization
          if ((hasCompleteData || isExplicitlyComplete)) {
            console.log(`[AIVisual] Complete data received, finalizing visualization`);
            const now = Date.now();
            if (now - lastCompletionAttemptRef.current > 3000) { // Prevent duplicate completions
              lastCompletionAttemptRef.current = now;
              try {
                setTimeout(() => {
                  try {
                    completeVisualization(isExplicitlyComplete);
                  } catch (completionError) {
                    console.log(`[AIVisual] ERROR in delayed completion: ${completionError.message}`);
                  }
                }, 1000); // Short delay for visual effect
              } catch (timeoutError) {
                console.log(`[AIVisual] ERROR setting completion timeout: ${timeoutError.message}`);
              }
            }
          }
          
          console.log(`[AIVisual] Scan data update completed`);
        } else {
          console.log(`[AIVisual] No scan data provided to update`);
        }
      } catch (error) {
        console.log(`[AIVisual] ERROR in updateWithScanData: ${error.message}`);
      }
    }
  }));
    
  // Effect for handling component mount/unmount
  useEffect(() => {
    // Initialize container animation when component becomes visible
    if (isVisible) {
      try {
        console.log(`[AIVisual] Component becoming visible`);
        // Directly set container animation value using setState
        setAnimatedValue(setContainerOpacity, 1, "container visibility");
        
        // Start cycling recognition subtitles if in recognition step
        if (stepStates.recognize === STEP_ACTIVE) {
          const subtitleInterval = setInterval(() => {
            try {
              setCurrentRecognizeSubtitleIndex(prevIndex => 
                (prevIndex + 1) % recognizeSubtitles.length
              );
              triggerSubtitleHaptic();
            } catch (error) {
              console.log(`[AIVisual] ERROR cycling recognition subtitles: ${error.message}`);
            }
          }, 800);
          
          if (!intervalRefs.current.subtitles) {
            intervalRefs.current.subtitles = {};
          }
          intervalRefs.current.subtitles.recognize = subtitleInterval;
        }
        
        // Start cycling search subtitles if in search step
        if (stepStates.search === STEP_ACTIVE) {
          const subtitleInterval = setInterval(() => {
            try {
              setCurrentSearchSubtitleIndex(prevIndex => 
                (prevIndex + 1) % searchSubtitles.length
              );
              triggerSubtitleHaptic();
            } catch (error) {
              console.log(`[AIVisual] ERROR cycling search subtitles: ${error.message}`);
            }
          }, 800);
          
          if (!intervalRefs.current.subtitles) {
            intervalRefs.current.subtitles = {};
          }
          intervalRefs.current.subtitles.search = subtitleInterval;
        }
      } catch (error) {
        console.log(`[AIVisual] ERROR setting up component visibility: ${error.message}`);
      }
    } else {
      // Set container to invisible directly
      try {
        console.log(`[AIVisual] Component becoming invisible`);
        setAnimatedValue(setContainerOpacity, 0.1, "container invisibility");
      } catch (error) {
        console.log(`[AIVisual] ERROR hiding component: ${error.message}`);
      }
    }
    
    // Cleanup on component unmount
    return () => {
      try {
        console.log(`[AIVisual] Component unmounting - cleaning up`);
        
        // Clear all the intervals we've created
        if (intervalRefs.current.animations) {
          intervalRefs.current.animations.forEach((interval, idx) => {
            try {
              clearInterval(interval);
              console.log(`[AIVisual] Cleared animation interval #${idx}`);
            } catch (error) {
              console.log(`[AIVisual] ERROR clearing animation interval #${idx}: ${error.message}`);
            }
          });
          intervalRefs.current.animations = [];
        }
        
        // Clear subtitle cycling intervals
        if (intervalRefs.current.subtitles) {
          Object.entries(intervalRefs.current.subtitles).forEach(([key, interval]) => {
            try {
              clearInterval(interval);
              console.log(`[AIVisual] Cleared subtitle interval: ${key}`);
            } catch (error) {
              console.log(`[AIVisual] ERROR clearing subtitle interval ${key}: ${error.message}`);
            }
          });
          intervalRefs.current.subtitles = {};
        }
        
        // Clear other timeouts
        timeoutRefs.current.forEach((timeout, idx) => {
          try {
            clearTimeout(timeout);
            console.log(`[AIVisual] Cleared timeout #${idx}`);
          } catch (error) {
            console.log(`[AIVisual] ERROR clearing timeout #${idx}: ${error.message}`);
          }
        });
        timeoutRefs.current = [];
        
        // Clear other named intervals
        Object.entries(intervalRefs.current).forEach(([key, interval]) => {
          // Skip the special collections we cleared above
          if (key !== 'animations' && key !== 'subtitles' && interval) {
            try {
              clearInterval(interval);
              console.log(`[AIVisual] Cleared interval: ${key}`);
            } catch (error) {
              console.log(`[AIVisual] ERROR clearing interval ${key}: ${error.message}`);
            }
          }
        });
        
        // Reset interval refs
        intervalRefs.current = {};
        
        console.log(`[AIVisual] Cleanup complete`);
      } catch (error) {
        console.log(`[AIVisual] ERROR in cleanup: ${error.message}`);
      }
    };
  }, [isVisible, stepStates.recognize, stepStates.search]); // Dependencies

  // Add initial animation setup in a useEffect hook
  useEffect(() => {
    if (isVisible && stepStates.recognize === STEP_WAITING) {
      try {
        console.log(`[AIVisual] Initializing visualization from waiting state`);
        
        // Clear previous animations/timeouts
        try {
          timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
          timeoutRefs.current = [];
          
          // Clear all the intervals we've created
          if (intervalRefs.current.animations) {
            intervalRefs.current.animations.forEach(interval => clearInterval(interval));
            intervalRefs.current.animations = [];
          }
          
          // Clear subtitle cycling intervals
          if (intervalRefs.current.subtitles) {
            Object.values(intervalRefs.current.subtitles).forEach(interval => clearInterval(interval));
            intervalRefs.current.subtitles = {};
          }
          
          // Clear other named intervals
          Object.entries(intervalRefs.current).forEach(([key, interval]) => {
            if (key !== 'animations' && key !== 'subtitles' && interval) {
              clearInterval(interval);
            }
          });
          
          intervalRefs.current = {};
          console.log(`[AIVisual] Cleared all existing timers and intervals`);
        } catch (clearError) {
          console.log(`[AIVisual] ERROR clearing timers: ${clearError.message}`);
        }
        
        // Set first step to active with a slight delay
        const initialDelay = setTimeout(() => {
          try {
            console.log(`[AIVisual] Setting recognition step to active`);
            setStepStates(prev => ({
              ...prev,
              recognize: STEP_ACTIVE
            }));
            
            try {
              console.log(`[AIVisual] Starting recognition spinner`);
              startSpinner(setRecognizeSpinOpacity);
            } catch (spinnerError) {
              console.log(`[AIVisual] ERROR starting recognition spinner: ${spinnerError.message}`);
            }
            
            try {
              console.log(`[AIVisual] Setting up recognition subtitle cycling`);
              const subtitleCycleInterval = setInterval(() => {
                try {
                  setCurrentRecognizeSubtitleIndex(prevIndex => 
                    (prevIndex + 1) % recognizeSubtitles.length
                  );
                  triggerSubtitleHaptic();
                } catch (cycleError) {
                  console.log(`[AIVisual] ERROR in subtitle cycle: ${cycleError.message}`);
                }
              }, 800);
              
              if (!intervalRefs.current.subtitles) {
                intervalRefs.current.subtitles = {};
              }
              intervalRefs.current.subtitles.recognize = subtitleCycleInterval;
              console.log(`[AIVisual] Recognition subtitle cycling set up`);
            } catch (intervalError) {
              console.log(`[AIVisual] ERROR setting up subtitle cycling: ${intervalError.message}`);
            }
            
            try {
              console.log(`[AIVisual] Starting recognition step animation`);
              // Animate elements via simple intervals instead of Animated API
              animateWithInterval(setRecognizeOpacity, 0, 1, 500, "initial recognize opacity");
              animateWithInterval(setRecognizeSubtitleOpacity, 0, 1, 500, "initial recognize subtitle opacity");
            } catch (animError) {
              console.log(`[AIVisual] ERROR animating recognition: ${animError.message}`);
              
              // Fallback to direct value setting
              try {
                setAnimatedValue(setRecognizeOpacity, 1, "recognize opacity fallback");
                setAnimatedValue(setRecognizeSubtitleOpacity, 1, "recognize subtitle opacity fallback");
              } catch (fallbackError) {
                console.log(`[AIVisual] ERROR in animation fallback: ${fallbackError.message}`);
              }
            }
            
            try {
              console.log(`[AIVisual] Setting up text animation completion`);
              const textAnimTimeout = setTimeout(() => {
                try {
                  setTextAnimCompleted(prev => ({ ...prev, recognize: true }));
                  console.log(`[AIVisual] Recognition text animation marked complete`);
                } catch (completionError) {
                  console.log(`[AIVisual] ERROR marking animation complete: ${completionError.message}`);
                }
              }, 1000);
              
              timeoutRefs.current.push(textAnimTimeout);
            } catch (timeoutError) {
              console.log(`[AIVisual] ERROR setting up animation completion: ${timeoutError.message}`);
            }
          } catch (delayedError) {
            console.log(`[AIVisual] ERROR in delayed initialization: ${delayedError.message}`);
          }
        }, 300);
        
        timeoutRefs.current.push(initialDelay);
        console.log(`[AIVisual] Initial delay timeout set`);
      } catch (error) {
        console.log(`[AIVisual] CRITICAL ERROR in initialization: ${error.message}`);
      }
    }
    
    // Cleanup function
    return () => {
      try {
        console.log(`[AIVisual] Cleaning up initial animation`);
        
        // Clear all timeouts
        timeoutRefs.current.forEach((timeout, idx) => {
          try {
            clearTimeout(timeout);
            console.log(`[AIVisual] Cleared timeout #${idx}`);
          } catch (timeoutError) {
            console.log(`[AIVisual] ERROR clearing timeout #${idx}: ${timeoutError.message}`);
          }
        });
        
        // Clear all intervals
        Object.entries(intervalRefs.current).forEach(([key, value]) => {
          if (value) {
            try {
              if (Array.isArray(value)) {
                value.forEach((interval, idx) => {
                  clearInterval(interval);
                  console.log(`[AIVisual] Cleared array interval ${key}[${idx}]`);
                });
              } else {
                clearInterval(value);
                console.log(`[AIVisual] Cleared interval ${key}`);
              }
            } catch (intervalError) {
              console.log(`[AIVisual] ERROR clearing interval ${key}: ${intervalError.message}`);
            }
          }
        });
        
        console.log(`[AIVisual] Initial animation cleanup complete`);
      } catch (error) {
        console.log(`[AIVisual] ERROR in cleanup: ${error.message}`);
      }
    };
  }, [isVisible, stepStates.recognize, recognizeSubtitles.length]); // Dependencies

  return (
    <View
      style={styles.container}
    >
      <View
        style={[
          styles.content,
          {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)',
            borderColor: isDark ? 'rgba(51, 51, 51, 0.5)' : '#bbb',
            borderWidth: 1,
            opacity: containerOpacity
          }
        ]}
      >
        <View style={styles.stepsContainer}>
          {/* Recognition Step */}
          <View
            style={[
              styles.stepContainer,
              { opacity: recognizeOpacity }
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: isDark ? '#2C2C2E' : '#000',
                  borderColor: isDark ? '#333' : '#000',
                  borderWidth: 1,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="food-apple"
                size={24}
                color={isDark ? '#FFF' : '#fff'}
              />
              <View 
                style={[
                  styles.checkmarkOverlay,
                  {
                    opacity: recognizeCheckOpacity,
                    backgroundColor: isDark ? '#FFF' : '#fff',
                    borderColor: isDark ? '#333' : '#E0E0E0',
                    borderWidth: 1,
                    position: 'absolute',
                    right: -5,
                    bottom: -5,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }
                ]}
              >
                <MaterialCommunityIcons
                  name="check"
                  size={18}
                  color={isDark ? '#000' : '#000'}
                />
              </View>
            </View>
            
            <View style={styles.textContainer}>
              <View style={styles.textWrapper}>
                <AIAnimatedText
                  style={[styles.stepText, { color: isDark ? '#FFF' : '#000' }]}
                  text="Food Recognition"
                  color="#FFC107"
                  duration={1000}
                />
              </View>
              <AIAnimatedSubtitle
                text={recognizeSubtitles[currentRecognizeSubtitleIndex]}
                style={[styles.subtitleText]}
                colorScheme={isDark ? 'dark' : 'light'}
                isCompleted={stepStates.recognize === STEP_COMPLETED}
              />
            </View>
            
            {stepStates.recognize === STEP_ACTIVE && (
              <View style={{ marginLeft: 8 }}>
                <ActivityIndicator size="small" color={isDark ? '#FFF' : '#000'} />
              </View>
            )}
            
            <View
              style={[
                styles.connector,
                {
                  backgroundColor: isDark ? '#333' : '#000',
                  opacity: 0.7,
                },
              ]}
            />
          </View>

          {/* Search Step */}
          <View
            style={[
              styles.stepContainer,
              { opacity: searchOpacity }
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: isDark ? '#2C2C2E' : '#000',
                  borderColor: isDark ? '#333' : '#000',
                  borderWidth: 1,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="web"
                size={24}
                color={isDark ? '#FFF' : '#fff'}
              />
              <View 
                style={[
                  styles.checkmarkOverlay,
                  {
                    opacity: searchCheckOpacity,
                    backgroundColor: isDark ? '#FFF' : '#fff',
                    borderColor: isDark ? '#333' : '#E0E0E0',
                    borderWidth: 1,
                    position: 'absolute',
                    right: -5,
                    bottom: -5,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }
                ]}
              >
                <MaterialCommunityIcons
                  name="check"
                  size={18}
                  color={isDark ? '#000' : '#000'}
                />
              </View>
            </View>
            
            <View style={styles.textContainer}>
              <View style={styles.textWrapper}>
                <AIAnimatedText
                  style={[styles.stepText, { color: isDark ? '#FFF' : '#000' }]}
                  text="Web Search"
                  color="#2196F3"
                  duration={1000}
                />
              </View>
              <AIAnimatedSubtitle
                text={searchSubtitles[currentSearchSubtitleIndex]}
                style={[styles.subtitleText]}
                colorScheme={isDark ? 'dark' : 'light'}
                isCompleted={stepStates.search === STEP_COMPLETED}
              />
            </View>
            
            {stepStates.search === STEP_ACTIVE && (
              <View style={{ marginLeft: 8 }}>
                <ActivityIndicator size="small" color={isDark ? '#FFF' : '#000'} />
              </View>
            )}
            
            <View
              style={[
                styles.connector,
                {
                  backgroundColor: isDark ? '#333' : '#000',
                  opacity: 0.7,
                },
              ]}
            />
          </View>

          {/* Process Step */}
          <View
            style={[
              styles.stepContainer,
              { opacity: processOpacity }
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: isDark ? '#2C2C2E' : '#000',
                  borderColor: isDark ? '#333' : '#000',
                  borderWidth: 1,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="brain"
                size={24}
                color={isDark ? '#FFF' : '#fff'}
              />
              <View 
                style={[
                  styles.checkmarkOverlay,
                  {
                    opacity: processCheckOpacity,
                    backgroundColor: isDark ? '#FFF' : '#fff',
                    borderColor: isDark ? '#333' : '#E0E0E0',
                    borderWidth: 1,
                    position: 'absolute',
                    right: -5,
                    bottom: -5,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }
                ]}
              >
                <MaterialCommunityIcons
                  name="check"
                  size={18}
                  color={isDark ? '#000' : '#000'}
                />
              </View>
            </View>
            
            <View style={styles.textContainer}>
              <View style={styles.textWrapper}>
                <AIAnimatedText
                  style={[styles.stepText, { color: isDark ? '#FFF' : '#000' }]}
                  text="AI Processing"
                  color="#9C27B0"
                  duration={1000}
                />
              </View>
              <AIAnimatedSubtitle
                text={processSubtitles[currentProcessSubtitleIndex]}
                style={[styles.subtitleText]}
                colorScheme={isDark ? 'dark' : 'light'}
                isCompleted={stepStates.process === STEP_COMPLETED}
              />
            </View>
            
            {stepStates.process === STEP_ACTIVE && (
              <View style={{ marginLeft: 8 }}>
                <ActivityIndicator size="small" color={isDark ? '#FFF' : '#000'} />
              </View>
            )}
            
            <View
              style={[
                styles.connector,
                {
                  backgroundColor: isDark ? '#333' : '#000',
                  opacity: 0.7,
                },
              ]}
            />
          </View>

          {/* Result Step */}
          <View
            style={[
              styles.stepContainer,
              { opacity: resultOpacity }
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: isDark ? '#2C2C2E' : '#000',
                  borderColor: isDark ? '#333' : '#000',
                  borderWidth: 1,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="flag"
                size={24}
                color={isDark ? '#FFF' : '#fff'}
              />
              <View 
                style={[
                  styles.checkmarkOverlay,
                  {
                    opacity: resultCheckOpacity,
                    backgroundColor: isDark ? '#FFF' : '#fff',
                    borderColor: isDark ? '#333' : '#E0E0E0',
                    borderWidth: 1,
                    position: 'absolute',
                    right: -5,
                    bottom: -5,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }
                ]}
              >
                <MaterialCommunityIcons
                  name="check"
                  size={18}
                  color={isDark ? '#000' : '#000'}
                />
              </View>
            </View>
            
            <View style={styles.textContainer}>
              <View style={styles.textWrapper}>
                <AIAnimatedText
                  style={[styles.stepText, { color: isDark ? '#FFF' : '#000' }]}
                  text="Results"
                  color="#FF5722"
                  duration={1000}
                />
              </View>
              <AIAnimatedSubtitle
                text={resultSubtitles[currentResultSubtitleIndex]}
                style={[styles.subtitleText]}
                colorScheme={isDark ? 'dark' : 'light'}
                isCompleted={stepStates.result === STEP_COMPLETED}
              />
            </View>
            
            {stepStates.result === STEP_ACTIVE && (
              <View style={{ marginLeft: 8 }}>
                <ActivityIndicator size="small" color={isDark ? '#FFF' : '#000'} />
              </View>
            )}
          </View>
        </View>
        
        {/* Accuracy Box */}
        <View 
          style={[
            styles.accuracyBox,
            {
              borderColor: isDark ? 'rgba(51, 51, 51, 0.5)' : 'rgba(224, 224, 224, 0.5)',
              backgroundColor: isDark ? 'rgba(44, 44, 46, 0.8)' : 'rgba(248, 248, 248, 0.8)',
              opacity: accuracyBoxOpacity,
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
              {getAccuracyText()}
            </Text>
          </View>
        </View>
      </View>
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
    backgroundColor: 'transparent',
    position: 'relative',
    minHeight: 380,
  },
  stepsContainer: {
    width: '100%',
  },
  step: {
    marginBottom: 24,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 12,
    position: 'relative',
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
    letterSpacing: -0.3,
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
  subtitleContainer: {
    marginTop: 4,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#666',
    letterSpacing: -0.2,
  },
  checkContainer: {
    position: 'absolute',
    right: 10,
    top: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  spinnerContainer: {
    position: 'absolute',
    left: 10,
    top: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 5,
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
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(224, 224, 224, 0.5)',
    backgroundColor: 'rgba(248, 248, 248, 0.8)',
    overflow: 'hidden',
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  accuracyContent: {
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
    color: '#333',
  },
  textContainer: {
    flex: 1,
    paddingTop: 2,
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
});

export default FunctionalAIVisualization; 