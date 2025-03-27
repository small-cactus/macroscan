import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Animated, Text, ActivityIndicator } from 'react-native';
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
  
  // Animation value for steps container
  const stepsContainerAnim = useRef(new Animated.Value(1)).current;
  
  // Animation for the main container
  const containerAnim = useRef(new Animated.Value(0.1)).current;
  
  // Animation values for steps
  const recognizeAnim = useRef(new Animated.Value(0.01)).current;
  const searchAnim = useRef(new Animated.Value(0.01)).current;
  const processAnim = useRef(new Animated.Value(0.01)).current;
  const resultAnim = useRef(new Animated.Value(0.01)).current;
  
  // Animation values for subtitles
  const recognizeSubtitleAnim = useRef(new Animated.Value(0.01)).current;
  const searchSubtitleAnim = useRef(new Animated.Value(0.01)).current;
  const processSubtitleAnim = useRef(new Animated.Value(0.01)).current;
  const resultSubtitleAnim = useRef(new Animated.Value(0.01)).current;
  
  // Animation values for checkmarks
  const recognizeCheckAnim = useRef(new Animated.Value(0.01)).current;
  const searchCheckAnim = useRef(new Animated.Value(0.01)).current;
  const processCheckAnim = useRef(new Animated.Value(0.01)).current;
  const resultCheckAnim = useRef(new Animated.Value(0.01)).current;
  
  // Animation values for spinners
  const recognizeSpinAnim = useRef(new Animated.Value(0.01)).current;
  const searchSpinAnim = useRef(new Animated.Value(0.01)).current;
  const processSpinAnim = useRef(new Animated.Value(0.01)).current;
  const resultSpinAnim = useRef(new Animated.Value(0.01)).current;
  
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
  const intervalRefs = useRef([]);
  const shimmerLoopsRef = useRef([null, null, null, null, null]);

  // Animation for the accuracy box
  const accuracyBoxAnim = useRef(new Animated.Value(0.1)).current;

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

  // Start a spinner animation
  const startSpinner = (spinAnim) => {
    // Instead of directly setting value, use Animated.timing
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 0,
      useNativeDriver: true,
    }).start();
  };

  // Stop a spinner animation
  const stopSpinner = (spinAnim) => {
    // Instead of directly setting value, use Animated.timing
    Animated.timing(spinAnim, {
      toValue: 0.01,
      duration: 0,
      useNativeDriver: true,
    }).start();
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
    // Clear the recognition interval
    clearInterval(intervalRefs.current.find(i => i._recognitionInterval));
    stopSpinner(recognizeSpinAnim);

    // Use a safer approach for animations
    const doAnimation = () => {
      Animated.timing(recognizeCheckAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    };
    
    // Schedule animation after state update
    setTimeout(doAnimation, 0);
    
    setStepStates(prev => ({ ...prev, recognize: STEP_COMPLETED, search: STEP_ACTIVE }));
    triggerStepHaptic();

    // Start the search spinner
    startSpinner(searchSpinAnim);
    
    // Start cycling through search subtitles
    const searchInterval = setInterval(() => {
      // First check if we need to update subtitles based on new data
      const updatedSearchSubtitles = getSearchSubtitles();
      
      // If we have new subtitles, update the list and show the newest one
      if (updatedSearchSubtitles.length > searchSubtitles.length) {
        setSearchSubtitles(updatedSearchSubtitles);
        setCurrentSearchSubtitleIndex(updatedSearchSubtitles.length - 1);
        triggerSubtitleHaptic();
      } else {
        // Just cycle through existing subtitles if no new ones
        setCurrentSearchSubtitleIndex(prevIndex => 
          (prevIndex + 1) % searchSubtitles.length
        );
        triggerSubtitleHaptic();
      }
    }, 800);
    searchInterval._searchInterval = true;
    intervalRefs.current.push(searchInterval);
    
    // Animate in the search step - using safer approach with timeout
    setTimeout(() => {
      Animated.sequence([
        Animated.spring(searchAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(searchSubtitleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }, 0);
    
    // Mark search text animation as completed after a delay
    timeoutRefs.current.push(setTimeout(() => {
      setTextAnimCompleted(prev => ({ ...prev, search: true }));
    }, 1000));
  };
  
  const completeSearchStep = () => {
    // Clear the search interval
    clearInterval(intervalRefs.current.find(i => i._searchInterval));
    stopSpinner(searchSpinAnim);

    // Use a safer approach for animations
    const doAnimation = () => {
      Animated.timing(searchCheckAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    };
    
    // Schedule animation after state update
    setTimeout(doAnimation, 0);
    
    setStepStates(prev => ({ ...prev, search: STEP_COMPLETED, process: STEP_ACTIVE }));
    triggerStepHaptic();

    // Start the process spinner
    startSpinner(processSpinAnim);
    
    // Start cycling through process subtitles
    const processInterval = setInterval(() => {
      setCurrentProcessSubtitleIndex(prevIndex => 
        (prevIndex + 1) % processSubtitles.length
      );
      triggerSubtitleHaptic();
    }, 800);
    processInterval._processInterval = true;
    intervalRefs.current.push(processInterval);
    
    // Animate in the process step - using safer approach with timeout
    setTimeout(() => {
      Animated.sequence([
        Animated.spring(processAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(processSubtitleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }, 0);
    
    // Mark process text animation as completed after a delay
    timeoutRefs.current.push(setTimeout(() => {
      setTextAnimCompleted(prev => ({ ...prev, process: true }));
    }, 1000));
  };
  
  const completeProcessingStep = () => {
    // Clear the process interval
    clearInterval(intervalRefs.current.find(i => i._processInterval));
    stopSpinner(processSpinAnim);
    
    Animated.timing(processCheckAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    setStepStates(prev => ({ ...prev, process: STEP_COMPLETED, result: STEP_ACTIVE }));
    triggerStepHaptic();
    
    // Log that we're activating the result step
    console.log('Activating result step - ready for completion');
    
    // Start the result spinner
    startSpinner(resultSpinAnim);
    
    // Start cycling through result subtitles
    const resultInterval = setInterval(() => {
      // First check if we need to update subtitles based on new data
      const updatedResultSubtitles = getResultSubtitles();
      
      // If we have new subtitles, update the list and show the newest one
      if (updatedResultSubtitles.length > resultSubtitles.length) {
        setResultSubtitles(updatedResultSubtitles);
        setCurrentResultSubtitleIndex(updatedResultSubtitles.length - 1);
        triggerSubtitleHaptic();
      } else {
        // Just cycle through existing subtitles if no new ones
        setCurrentResultSubtitleIndex(prevIndex => 
          (prevIndex + 1) % resultSubtitles.length
        );
        triggerSubtitleHaptic();
      }
    }, 800);
    resultInterval._resultInterval = true;
    intervalRefs.current.push(resultInterval);
    
    // Animate in the result step
    Animated.sequence([
      Animated.spring(resultAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(resultSubtitleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
    
    // Mark result text animation as completed after a delay
    timeoutRefs.current.push(setTimeout(() => {
      setTextAnimCompleted(prev => ({ ...prev, result: true }));
    }, 1000));
  };

  // Get statistics about the search results
  const getAccuracyText = () => {
    // Return the requested text regardless of other conditions
    return "We verified this result with search";
  };

  // Helper method to complete visualization (used internally and exposed via ref)
  const completeVisualization = (forceCompletion = false) => {
    // Log the current state of all steps for debugging
    console.log('Attempting to complete visualization with step states:', stepStates);
    
    // Make sure all previous steps are completed
    if (stepStates.recognize !== STEP_COMPLETED) {
      console.log('Completing recognition step first');
      completeRecognitionStep();
      // Set a timeout to continue after recognition completes
      setTimeout(() => completeVisualization(forceCompletion), 800);
      return;
    }
    
    if (stepStates.search !== STEP_COMPLETED) {
      console.log('Completing search step first');
      completeSearchStep();
      // Set a timeout to continue after search completes
      setTimeout(() => completeVisualization(forceCompletion), 800);
      return;
    }
    
    if (stepStates.process !== STEP_COMPLETED) {
      console.log('Completing process step first');
      completeProcessingStep();
      // Set a timeout to continue after processing completes
      setTimeout(() => completeVisualization(forceCompletion), 800);
      return;
    }
    
    // If we've made it here and the result step isn't active, force it to become active
    if (stepStates.result !== STEP_ACTIVE && stepStates.result !== STEP_COMPLETED) {
      console.log('Force activating result step');
      setStepStates(prev => ({ ...prev, result: STEP_ACTIVE }));
      startSpinner(resultSpinAnim);
      
      // Wait a moment for the state to update
      setTimeout(() => completeVisualization(true), 500);
      return;
    }
    
    // If we've already completed the result step, don't do it again
    if (stepStates.result === STEP_COMPLETED) {
      console.log('Result step already completed, nothing to do');
      return;
    }
    
    // Check if we've recently tried to complete, prevent rapid re-completions
    // BUT allow bypassing this check with forceCompletion flag
    const now = Date.now();
    if (!forceCompletion && now - lastCompletionAttemptRef.current < 2000) {
      console.log('Not completing visualization: too soon since last attempt (use forceCompletion to override)');
      return;
    }
    
    lastCompletionAttemptRef.current = now;
    console.log('Completing visualization - all steps ready');
    
    // Complete the results step
    clearInterval(intervalRefs.current.find(i => i._resultInterval)); // Clear the subtitle cycling interval
    stopSpinner(resultSpinAnim);
    Animated.timing(resultCheckAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    setStepStates(prev => ({ ...prev, result: STEP_COMPLETED }));
    triggerStepHaptic();
    
    // Show the accuracy box
    Animated.spring(accuracyBoxAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true
    }).start();
    
    // Haptic feedback when accuracy box appears
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Final success haptic
    setTimeout(() => {
      triggerCompletionHaptic();
      
      // If onComplete is provided, call it
      if (onComplete) {
        console.log('Calling onComplete callback');
        onComplete();
      }
    }, 500);
  };

  // Define a common reset function that both the imperative handle and internal methods can use
  const resetVisualization = () => {
    // Reset all animations safely using Animated.timing instead of setValue
    const resetAnimations = () => {
      // Use Animated.parallel to reset all animations at once
      Animated.parallel([
        Animated.timing(recognizeSpinAnim, { toValue: 0.01, duration: 0, useNativeDriver: true }),
        Animated.timing(searchSpinAnim, { toValue: 0.01, duration: 0, useNativeDriver: true }),
        Animated.timing(processSpinAnim, { toValue: 0.01, duration: 0, useNativeDriver: true }),
        Animated.timing(resultSpinAnim, { toValue: 0.01, duration: 0, useNativeDriver: true }),
        
        Animated.timing(recognizeCheckAnim, { toValue: 0.01, duration: 0, useNativeDriver: true }),
        Animated.timing(searchCheckAnim, { toValue: 0.01, duration: 0, useNativeDriver: true }),
        Animated.timing(processCheckAnim, { toValue: 0.01, duration: 0, useNativeDriver: true }),
        Animated.timing(resultCheckAnim, { toValue: 0.01, duration: 0, useNativeDriver: true }),
        
        Animated.timing(accuracyBoxAnim, { toValue: 0.1, duration: 0, useNativeDriver: true })
      ]).start();
    };

    // Reset other state
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
    
    // Call the animation reset
    resetAnimations();
    
    // Clear any timeouts or intervals
    if (timeoutRefs.current.searchCompletion) {
      clearTimeout(timeoutRefs.current.searchCompletion);
      timeoutRefs.current.searchCompletion = null;
    }
    
    // Reset step progression
    currentRecognizeSubtitleIndex = 0;
    currentSearchSubtitleIndex = 0;
    currentProcessSubtitleIndex = 0;
    currentResultSubtitleIndex = 0;
  };

  // Expose methods to parent component via ref
  React.useImperativeHandle(ref, () => ({
    forceUpdateSubtitles: () => {
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
        currentRecognizeSubtitleIndex = updatedRecognizeSubtitles.length - 1;
      }
      
      if (stepStates.search === STEP_ACTIVE && updatedSearchSubtitles.length > 0) {
        currentSearchSubtitleIndex = updatedSearchSubtitles.length - 1;
      }
      
      if (stepStates.process === STEP_ACTIVE && updatedProcessSubtitles.length > 0) {
        currentProcessSubtitleIndex = updatedProcessSubtitles.length - 1;
      }
      
      if (stepStates.result === STEP_ACTIVE && updatedResultSubtitles.length > 0) {
        currentResultSubtitleIndex = updatedResultSubtitles.length - 1;
      }
      
      // Apply a small haptic feedback to indicate change
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    completeVisualization: (forceCompletion = false) => {
      completeVisualization(forceCompletion);
    },
    reset: () => {
      resetVisualization();
    },
    updateWithScanData: (scanData) => {
      // This method can be called when the scan data comes in from the API
      if (scanData) {
        console.log('Updating visualization with scan data:', scanData.food?.name);
        
        // Check if this is a new scan (indicated by a special flag from the parent component)
        // or if we're in a waiting state (which implies we're ready for a new scan)
        const isNewScan = scanData._isNewScan === true || stepStates.recognize === STEP_WAITING;
        
        // If this is a new scan, reset everything first
        if (isNewScan) {
          console.log('New scan detected, resetting visualization state');
          // Use the internal resetVisualization function directly
          resetVisualization();
        }
        
        // Update food items if available
        if (scanData.food && scanData.food.name) {
          const updatedSubtitles = getRecognizeSubtitles([scanData.food.name]);
          setRecognizeSubtitles(updatedSubtitles);
          
          // If in recognition step, show the new subtitle
          if (stepStates.recognize === STEP_ACTIVE) {
            currentRecognizeSubtitleIndex = updatedSubtitles.length - 1;
            triggerSubtitleHaptic();
          }
        }
        
        // Update search info if available
        if (scanData._searchInfo) {
          let updatedQueries = scanData._searchInfo.queries || [];
          let updatedResults = scanData._searchInfo.results || [];
          
          if (updatedQueries.length > 0 || updatedResults.length > 0) {
            const updatedSubtitles = getSearchSubtitles(updatedQueries, updatedResults);
            setSearchSubtitles(updatedSubtitles);
            
            // If in search step, show the new subtitle
            if (stepStates.search === STEP_ACTIVE) {
              currentSearchSubtitleIndex = updatedSubtitles.length - 1;
              triggerSubtitleHaptic();
            }
          }
        }
        
        // Update summary text if available
        if (scanData.details && scanData.details.summaryText) {
          // Store the summary text for accuracy box
          if (!isAccuracyFinalized) {
            setFinalAccuracyText(scanData.details.summaryText);
            setIsAccuracyFinalized(true);
            
            // Trigger haptic feedback to indicate new content
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        console.log('Processing completion check:', {
          hasCompleteData,
          isExplicitlyComplete,
          currentStep: Object.entries(stepStates).find(([_, value]) => value === STEP_ACTIVE)?.[0] || 'none'
        });
                    
        // If this is the final update and we're in results step, complete the visualization
        if ((hasCompleteData || isExplicitlyComplete)) {
          console.log('Complete data received, finalizing visualization');
          const now = Date.now();
          if (now - lastCompletionAttemptRef.current > 3000) { // Prevent duplicate completions
            lastCompletionAttemptRef.current = now;
            setTimeout(() => {
              completeVisualization(isExplicitlyComplete);
            }, 1000); // Short delay for visual effect
          }
        }
      }
    }
  }));
    
    // Add initial animation setup in a useEffect hook
    useEffect(() => {
      if (isVisible && stepStates.recognize === STEP_WAITING) {
        // Clear previous animations/timeouts
        timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
        intervalRefs.current.forEach(interval => clearInterval(interval));
        
        // Set first step to active with a slight delay
        setTimeout(() => {
          setStepStates(prev => ({
            ...prev,
            recognize: STEP_ACTIVE
          }));
          
          // Start the recognition spinner
          startSpinner(recognizeSpinAnim);
          
          // Start cycling through recognition subtitles
          const recognitionInterval = setInterval(() => {
            currentRecognizeSubtitleIndex = (currentRecognizeSubtitleIndex + 1) % recognizeSubtitles.length;
            triggerSubtitleHaptic();
          }, 800);
          recognitionInterval._recognitionInterval = true;
          intervalRefs.current.push(recognitionInterval);
          
          // Animate in the recognition step
          Animated.sequence([
            Animated.spring(recognizeAnim, {
              toValue: 1,
              tension: 50,
              friction: 7,
              useNativeDriver: true,
            }),
            Animated.timing(recognizeSubtitleAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            })
          ]).start();
          
          // Mark recognition text animation as completed after a delay
          timeoutRefs.current.push(setTimeout(() => {
            setTextAnimCompleted(prev => ({ ...prev, recognize: true }));
          }, 1000));
        }, 300);
      }
      
      // Cleanup function
      return () => {
        // Clear all timeouts and intervals to prevent memory leaks
        timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
        intervalRefs.current.forEach(interval => clearInterval(interval));
      };
    }, [isVisible, stepStates.recognize, recognizeSubtitles.length]); // Dependencies

  return (
        <Animated.View
          style={[
        styles.container,
            {
          opacity: containerAnim
        }
      ]}
    >
      <Animated.View
        style={[
          styles.stepsContainer,
          {
            opacity: stepsContainerAnim
          }
        ]}
      >
        <Animated.View
          style={[
            styles.step,
            {
              opacity: recognizeAnim
            }
          ]}
        >
          <AIAnimatedText
            style={[
              styles.stepTitle,
              {
                opacity: recognizeAnim
              }
            ]}
            text="Food Recognition"
            color="#FFC107"
            duration={1000}
          />
            <Animated.View 
              style={[
              styles.subtitleContainer,
                {
                opacity: recognizeSubtitleAnim
              }
            ]}
          >
            <AIAnimatedSubtitle
              text={recognizeSubtitles[currentRecognizeSubtitleIndex]}
              style={[
                styles.subtitle,
                {
                  opacity: recognizeSubtitleAnim
                }
              ]}
              textColor={isDark ? '#FFFFFF' : '#000000'}
              duration={1000}
              shimmerColor="#FFC107"
              shimmerDuration={2000}
              shimmerLoops={shimmerLoopsRef.current[0]}
              isAnimated={textAnimCompleted.recognize}
              numberOfLines={1}
              ellipsizeMode="tail"
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.checkContainer,
              {
                opacity: recognizeCheckAnim
                }
              ]}
            >
              <MaterialCommunityIcons
                name="check"
              size={24}
              color="#4CAF50"
              />
            </Animated.View>
          <Animated.View
            style={[
              styles.spinnerContainer,
              {
                opacity: recognizeSpinAnim
              }
            ]}
          >
            {recognizeIndicator}
          </Animated.View>
        </Animated.View>
        
            <Animated.View
          style={[
            styles.step,
            {
              opacity: searchAnim
            }
          ]}
        >
                <AIAnimatedText
            style={[
              styles.stepTitle,
              {
                opacity: searchAnim
              }
            ]}
            text="Web Search"
            color="#2196F3"
            duration={1000}
          />
          <Animated.View
            style={[
              styles.subtitleContainer,
              {
                opacity: searchSubtitleAnim
              }
            ]}
          >
            <AIAnimatedSubtitle
              text={searchSubtitles[currentSearchSubtitleIndex]}
              style={[
                styles.subtitle,
                {
                  opacity: searchSubtitleAnim
                }
              ]}
              textColor={isDark ? '#FFFFFF' : '#000000'}
              duration={1000}
              shimmerColor="#2196F3"
              shimmerDuration={2000}
              shimmerLoops={shimmerLoopsRef.current[1]}
              isAnimated={textAnimCompleted.search}
              numberOfLines={1}
              ellipsizeMode="tail"
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.checkContainer,
              {
                opacity: searchCheckAnim
              }
            ]}
          >
            <MaterialCommunityIcons
              name="check"
              size={24}
              color="#4CAF50"
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.spinnerContainer,
              {
                opacity: searchSpinAnim
              }
            ]}
          >
            {searchIndicator}
          </Animated.View>
        </Animated.View>
        
        <Animated.View
          style={[
            styles.step,
            {
              opacity: processAnim
            }
          ]}
        >
          <AIAnimatedText
            style={[
              styles.stepTitle,
              {
                opacity: processAnim
              }
            ]}
            text="Data Processing"
            color="#9C27B0"
            duration={1000}
          />
          <Animated.View
            style={[
              styles.subtitleContainer,
              {
                opacity: processSubtitleAnim
              }
            ]}
          >
            <AIAnimatedSubtitle
              text={processSubtitles[currentProcessSubtitleIndex]}
              style={[
                styles.subtitle,
                {
                  opacity: processSubtitleAnim
                }
              ]}
              textColor={isDark ? '#FFFFFF' : '#000000'}
              duration={1000}
              shimmerColor="#9C27B0"
              shimmerDuration={2000}
              shimmerLoops={shimmerLoopsRef.current[2]}
              isAnimated={textAnimCompleted.process}
              numberOfLines={1}
              ellipsizeMode="tail"
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.checkContainer,
              {
                opacity: processCheckAnim
              }
            ]}
          >
            <MaterialCommunityIcons
              name="check"
              size={24}
              color="#4CAF50"
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.spinnerContainer,
              {
                opacity: processSpinAnim
              }
            ]}
          >
            {processIndicator}
          </Animated.View>
        </Animated.View>
        
        <Animated.View
          style={[
            styles.step,
            {
              opacity: resultAnim
            }
          ]}
        >
          <AIAnimatedText
            style={[
              styles.stepTitle,
              {
                opacity: resultAnim
              }
            ]}
            text="Result Summary"
            color="#FF5722"
            duration={1000}
          />
      <Animated.View
        style={[
              styles.subtitleContainer,
              {
                opacity: resultSubtitleAnim
              }
            ]}
          >
            <AIAnimatedSubtitle
              text={resultSubtitles[currentResultSubtitleIndex]}
              style={[
                styles.subtitle,
                {
                  opacity: resultSubtitleAnim
                }
              ]}
              textColor={isDark ? '#FFFFFF' : '#000000'}
              duration={1000}
              shimmerColor="#FF5722"
              shimmerDuration={2000}
              shimmerLoops={shimmerLoopsRef.current[3]}
              isAnimated={textAnimCompleted.result}
              numberOfLines={1}
              ellipsizeMode="tail"
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.checkContainer,
              {
                opacity: resultCheckAnim
              }
            ]}
          >
            <MaterialCommunityIcons
              name="check"
              size={24}
              color="#4CAF50"
            />
          </Animated.View>
        <Animated.View 
          style={[
              styles.spinnerContainer,
              {
                opacity: resultSpinAnim
              }
            ]}
          >
            {resultIndicator}
          </Animated.View>
        </Animated.View>
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.accuracyBox,
            {
              opacity: accuracyBoxAnim
            }
          ]}
        >
        <AIAnimatedText
          text={getAccuracyText()}
          style={styles.accuracyText}
          textColor={isDark ? '#FFFFFF' : '#000000'}
          duration={1000}
          shimmerColor="#4CAF50"
          shimmerDuration={2000}
          shimmerLoops={shimmerLoopsRef.current[4]}
          isAnimated={isAccuracyFinalized}
        />
        </Animated.View>
      </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    overflow: 'hidden',
    transition: 'opacity 0.3s, transform 0.3s',
    minHeight: 200,
    maxHeight: 300,
    width: width - 40,
    maxWidth: 600
  },
  stepsContainer: {
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    transition: 'opacity 0.3s, transform 0.3s',
    minHeight: 100,
    marginBottom: 20
  },
  step: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.3s, transform 0.3s'
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    transition: 'opacity 0.3s, transform 0.3s'
  },
  subtitleContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.3s, transform 0.3s'
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    transition: 'opacity 0.3s, transform 0.3s',
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  checkContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 5,
    transition: 'opacity 0.3s, transform 0.3s'
  },
  spinnerContainer: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 5,
    transition: 'opacity 0.3s, transform 0.3s'
  },
  accuracyBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 10,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.3s, transform 0.3s',
    height: 50
  },
  accuracyText: {
    fontSize: 16,
    textAlign: 'center'
  }
});

export default FunctionalAIVisualization; 