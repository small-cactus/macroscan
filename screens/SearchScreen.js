import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
  Modal, Alert, useColorScheme, Animated, Dimensions, Platform, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useUser } from '../userContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { handleWebSearch } from './providers/WebSearchProvider';
import { getModel } from './providers/models';
import { updateAverageProcessingTime } from './providers/processingTimes';
import { useTimeZone } from '../TimeZoneContext';
import FunctionalAIVisualization from './FunctionalAIVisualization';

const { width, height } = Dimensions.get('window');

const LOADING_TEXTS = [
  "Searching the web...",
  "Analyzing nutrition data...",
  "Checking sources...",
  "Comparing information...",
  "Finding accurate details...",
  "Verifying sources...",
  "Gathering nutrition facts...",
  "Processing search results...",
  "Almost there...",
];

const SEARCH_QUERIES_KEY = '@nutrilens:search_queries';
const SEARCH_RESULTS_KEY = '@nutrilens:search_results';
const API_FINISHED_KEY = '@nutrilens:api_finished';
const DETECTED_FOOD_KEY = '@nutrilens:detected_food';

// Add missing step state keys to match WebSearchProvider.js
const PROCESSING_STEP_KEY = '@nutrilens:processing_step';
const STEP_TIMESTAMP_KEY = '@nutrilens:step_timestamp';

// Step-specific storage keys
const RECOGNIZE_STEP_ACTIVE_KEY = '@nutrilens:recognize_step_active';
const SEARCH_STEP_ACTIVE_KEY = '@nutrilens:search_step_active';
const PROCESS_STEP_ACTIVE_KEY = '@nutrilens:process_step_active';
const RESULT_STEP_ACTIVE_KEY = '@nutrilens:result_step_active';

const RECOGNIZE_STEP_COMPLETED_KEY = '@nutrilens:recognize_step_completed';
const SEARCH_STEP_COMPLETED_KEY = '@nutrilens:search_step_completed';
const PROCESS_STEP_COMPLETED_KEY = '@nutrilens:process_step_completed';
const RESULT_STEP_COMPLETED_KEY = '@nutrilens:result_step_completed';

// Step constants
const STEP_RECOGNIZE = 'recognize';
const STEP_SEARCH = 'search';
const STEP_PROCESS = 'process';
const STEP_RESULT = 'result';

const SearchScreen = () => {
  // Core state
  const [image, setImage] = useState(null);
  const [processingImage, setProcessingImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [foodData, setFoodData] = useState(null);
  const [activeTab, setActiveTab] = useState('nutrition');
  const colorScheme = useColorScheme();
  const styles = getDynamicStyles(colorScheme);
  
  // Loading animation state
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [loadingTextQueue, setLoadingTextQueue] = useState([]);
  const [currentLoadingText, setCurrentLoadingText] = useState('');
  const isAnimationRunningRef = useRef(false);
  const tabFadeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnimTitle = useRef(new Animated.Value(1)).current;
  const fadeAnimImage = useRef(new Animated.Value(1)).current;
  const fadeAnimPlaceholder = useRef(new Animated.Value(1)).current;
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  
  // Add fade animation for visualization
  const visualizationFadeAnim = useRef(new Animated.Value(1)).current;
  
  // Status state
  const [noFoodFound, setNoFoodFound] = useState(false);
  const [errorOccurred, setErrorOccurred] = useState(false);
  const loadingAnimationRef = useRef(null);
  const startTimeRef = useRef(null);
  
  // External hooks
  const { user, apiKeys } = useUser();
  const { getTodayString } = useTimeZone();
  
  // Scan settings
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [selectedModel, setSelectedModel] = useState(null);
  const isProcessingRef = useRef(false);
  
  // Search results display
  const [searchQueries, setSearchQueries] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  
  // New state for visualization
  const [showVisualization, setShowVisualization] = useState(false);
  
  // Add array to track detected food items during scanning
  const [detectedFoodItems, setDetectedFoodItems] = useState([]);
  const [detectedBrand, setDetectedBrand] = useState('');
  const [detectedPackaging, setDetectedPackaging] = useState('');
  const [detectedPortionSize, setDetectedPortionSize] = useState('');
  
  // Reference to the FunctionalAIVisualization component
  const visualizationRef = useRef(null);
  
  // Add a reference to track interval/timeout IDs using an object
  const timersRef = useRef({}); // Changed from array to object
  
  // Helper to safely clear all timers (intervals and timeouts)
  const clearAllTimers = () => {
    console.log('Clearing all timers:', Object.keys(timersRef.current));
    Object.keys(timersRef.current).forEach(key => {
      const id = timersRef.current[key];
      if (id) {
        clearTimeout(id); // Works for both intervals and timeouts
        clearInterval(id);
      }
    });
    timersRef.current = {}; // Reset the object
  };
  
  // Helper to add a timer
  const addTimer = (key, id) => {
    // Clear previous timer with the same key if it exists
    if (timersRef.current[key]) {
      clearTimeout(timersRef.current[key]);
      clearInterval(timersRef.current[key]);
    }
    timersRef.current[key] = id;
    console.log('Added timer:', key, id);
  };

  // Helper to remove a timer (optional, clearAllTimers is often sufficient)
  const removeTimer = (key) => {
    if (timersRef.current[key]) {
      clearTimeout(timersRef.current[key]);
      clearInterval(timersRef.current[key]);
      delete timersRef.current[key];
      console.log('Removed timer:', key);
    }
  };
  
  // Initialize settings when screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadSettings = async () => {
        try {
          // Always use search mode in this screen
          const mode = 'search';
          
          // Get the provider preference from storage
          const provider = await AsyncStorage.getItem('@selected_provider') || 'anthropic';
          setSelectedProvider(provider);
          
          // Get the model for the selected provider in search mode
          const currentModel = getModel(provider, {
            selectedMode: mode,
            selectedModel: await AsyncStorage.getItem('selectedModel'),
            hasDrawing: false
          });
          
          setSelectedModel(currentModel);
        } catch (error) {
          console.error("Error loading settings:", error);
        }
      };
      
      loadSettings();
      setLoadingTextQueue(LOADING_TEXTS);
    }, [])
  );
  
  // Loading animation functions
  const enqueueLoadingText = (text) => {
    setLoadingTextQueue(prevQueue => [...prevQueue, text]);
  };
  
  const scheduleLoadingTexts = () => {
    setLoadingTextQueue(LOADING_TEXTS);
    isAnimationRunningRef.current = true;
    processLoadingQueue();
  };
  
  const processLoadingQueue = () => {
    if (loadingTextQueue.length > 0 && isAnimationRunningRef.current) {
      const nextText = loadingTextQueue[0];
      setCurrentLoadingText(nextText);
      setLoadingTextQueue(prevQueue => prevQueue.slice(1));
      
      // Re-add the text to the end of the queue for cycling
      const intervalId = setTimeout(() => {
        if (isAnimationRunningRef.current) {
          setLoadingTextQueue(prevQueue => [...prevQueue, nextText]);
          processLoadingQueue();
        }
      }, 2000);
      
      // Track the timeout ID using the new helper
      addTimer(`loadingQueue_${nextText.replace(/\s/g, '_')}`, intervalId);
    }
  };
  
  const startLoadingAnimation = () => {
    setCurrentLoadingText(LOADING_TEXTS[0]);
    isAnimationRunningRef.current = true;
    
    // Extract food names from any preliminary detection results if available
    const foodNames = [];
    try {
      if (processingImage) {
        // See if we can extract food names from ML model results or other sources
        // This is a placeholder for potential real detection
        if (foodData?.food?.name) {
          foodNames.push(foodData.food.name);
        }
      }
    } catch (error) {
      console.error('Error extracting food names:', error);
    }
    
    // Don't directly animate here, we do this in the sendImageToApi function
    // with a setTimeout to ensure state is properly updated first
    
    loadingAnimationRef.current = setTimeout(() => {
      processLoadingQueue();
    }, 2000);

    // Track the timeout ID using the new helper
    addTimer('loadingAnimationStart', loadingAnimationRef.current);
  };
  
  // Add a function to safely stop animations
  const safelyStopAnimations = useCallback(() => {
    // Make sure we're not processing anymore
    isAnimationRunningRef.current = false;
    
    // Use Animated.timing with callbacks rather than direct value setting
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    Animated.timing(visualizationFadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Clear any pending loading animation timeouts or intervals
    if (loadingAnimationRef.current) {
      clearTimeout(loadingAnimationRef.current);
      loadingAnimationRef.current = null;
    }
    
    // Reset any running intervals
    clearAllTimers();
  }, [fadeAnim, visualizationFadeAnim]);
  
  const stopLoadingAnimation = () => {
    isAnimationRunningRef.current = false;
    
    if (loadingAnimationRef.current) {
      clearTimeout(loadingAnimationRef.current);
      loadingAnimationRef.current = null;
    }
    
    // Clear any other intervals/timeouts
    clearAllTimers();
    
    // Use animation to fade out safely
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };
  
  // Image processing functions
  const resizeImage = async (uri) => {
    try {
      const manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );
      return manipResult.uri;
    } catch (error) {
      console.error('Error resizing image:', error);
      return uri;
    }
  };
  
  const imageToBase64 = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64data = reader.result.split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  
  // UI animation functions
  const fadeOutTitle = (callback) => {
    Animated.timing(fadeAnimTitle, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(callback);
  };
  
  const fadeInTitle = () => {
    Animated.timing(fadeAnimTitle, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };
  
  // Reset the visualization component
  const resetVisualization = () => {
    // Reset the visualization component itself
    if (visualizationRef.current && visualizationRef.current.reset) {
      console.log('Explicitly resetting visualization component');
      visualizationRef.current.reset();
    }
    
    // Reset visualization-related states
    setShowVisualization(false);
    // Don't directly set animated values
    // Instead, use Animated.timing to change values safely
  };
  
  // Add this function to force cleanup after a timeout
  const forceCleanupVisualization = () => {
    console.log('Force cleanup visualization due to timeout');
    
    // Clear all timers first to prevent any pending actions
    clearAllTimers();
    
    // Make sure visualization is marked as API finished
    if (visualizationRef.current && visualizationRef.current.setAPIFinished) {
      visualizationRef.current.setAPIFinished(true);
    }
    
    // Force completion of visualization
    if (visualizationRef.current && visualizationRef.current.completeVisualization) {
      visualizationRef.current.completeVisualization(true);
    }
    
    // After a short delay, force hide and reset the visualization
    setTimeout(() => {
      // Directly reset state without animations
      setShowVisualization(false);
      setIsLoading(false);
      
      // Do a final reset of the visualization component
      if (visualizationRef.current && visualizationRef.current.reset) {
        visualizationRef.current.reset();
      }
      
      // Force update UI
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1000);
  };
  
  // Update fadeOutVisualization to use resetVisualization
  const fadeOutVisualization = (callback) => {
    // Check if visualization can be safely hidden first
    if (visualizationRef.current && visualizationRef.current.canBeHidden) {
      const canHide = visualizationRef.current.canBeHidden();
      if (!canHide) {
        console.log('Visualization not ready to be hidden yet, waiting for animations to complete');
        // Set a delay and try again if API is finished but animation isn't
        if (visualizationRef.current.setAPIFinished) {
          visualizationRef.current.setAPIFinished(true); // Mark that API processing is done
        }
        
        // Try again in a second
        const retryTimeout = setTimeout(() => {
          fadeOutVisualization(callback);
        }, 1500); // Increased from 1000ms to 1500ms
        
        // Add a safety timeout in case the visualization gets stuck
        const safetyTimeout = setTimeout(() => {
          forceCleanupVisualization();
          if (callback) callback();
        }, 10000); // Increased from 8000ms to 10000ms
        
        addTimer('fadeOutRetry', retryTimeout);
        addTimer('safetyTimeout', safetyTimeout);
        return;
      }
    }
    
    // Fade out smoothly
    Animated.timing(visualizationFadeAnim, {
      toValue: 0,
      duration: 800, // Increased from 500ms to 800ms for clearer fade out
      useNativeDriver: true,
    }).start(() => {
      // After fade completes, update state
      setShowVisualization(false);
      
      // Clear any pending loading animation timeouts or intervals
      if (loadingAnimationRef.current) {
        clearTimeout(loadingAnimationRef.current);
        loadingAnimationRef.current = null;
      }
      
      // Reset any running intervals (like loading text cycling)
      clearAllTimers();
      
      // Reset temporary states
      setProcessingImage(null);
      setCurrentLoadingText('');
      setLoadingTextQueue(LOADING_TEXTS);
      isAnimationRunningRef.current = false;
      
      // Reset the visualization component with a delay
      setTimeout(() => {
        if (visualizationRef.current && visualizationRef.current.reset) {
          // Call the reset method directly instead of through resetVisualization
          visualizationRef.current.reset();
        }
      }, 200); // Increased from 100ms to 200ms
      
      // Reset search tracking states if not needed in results
      if (foodData) {
        // Keep search queries and results since they're displayed in the results
        // But reset detection states that were just for processing
        setDetectedBrand('');
        setDetectedPackaging('');
        setDetectedPortionSize('');
        // We keep detectedFoodItems since they're used in showing results
      } else {
        // If no food data, reset everything
        setSearchQueries([]);
        setSearchResults([]);
        setDetectedFoodItems([]);
        setDetectedBrand('');
        setDetectedPackaging('');
        setDetectedPortionSize('');
      }
      
      // Force active tab to refresh by briefly toggling animation
      if (activeTab === 'nutrition' && foodData) {
        // Use setState instead of direct value manipulation
        setActiveTab('details');
        setTimeout(() => {
          setActiveTab('nutrition');
        }, 50);
      }
      
      // Call callback if provided
      if (callback) callback();
    });
  };
  
  // Image selection functions
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant permission to access your photo library.');
      return;
    }
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const resizedImage = await resizeImage(result.assets[0].uri);
        await sendImageToApi(resizedImage);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'An error occurred while accessing your photos. Please try again.');
    }
  };
  
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant permission to access your camera.');
      return;
    }
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const resizedImage = await resizeImage(result.assets[0].uri);
        await sendImageToApi(resizedImage);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'An error occurred while using your camera. Please try again.');
    }
  };
  
  // Main API function
  const sendImageToApi = async (imageUri, barcodeData = null, hasDrawing = false) => {
    if (isProcessingRef.current) {
      console.log('Already processing an image, ignoring new request');
      return;
    }
    
    try {
      isProcessingRef.current = true;
      
      // Reset states from any previous scan
      clearAllTimers(); 
      
      // Initialize step states in AsyncStorage
      await initializeStepStates();
      
      // Explicitly reset the visualization component itself *before* showing it
      if (visualizationRef.current && visualizationRef.current.reset) {
        console.log('Explicitly resetting visualization component before new scan');
        visualizationRef.current.reset();
      } else {
        console.log('Visualization ref not available for reset yet');
      }
      
      // Always use the selected provider
      const provider = selectedProvider;
      
      // Always use search mode in this screen
      const mode = 'search';
      
      // Get the appropriate model
      const currentModel = getModel(provider, { 
        selectedMode: mode,
        selectedModel,
        hasDrawing
      });
      
      setIsLoading(true);
      setNoFoodFound(false);
      setErrorOccurred(false);
      
      // Explicitly clear search queries and results before starting a new scan
      setSearchQueries([]);
      setSearchResults([]);
      setDetectedFoodItems([]);
      setDetectedBrand('');
      setDetectedPackaging('');
      setDetectedPortionSize('');
      
      // Set showVisualization *after* potential reset
      setShowVisualization(true);
      
      // Log reset confirmation to verify states are clean
      console.log('All states reset for new scan. Ready to process new image.');
      
      // Convert image to base64
      let base64Image;
      if (typeof imageUri === 'string') {
        if (imageUri.startsWith('data:image/jpeg;base64,')) {
          base64Image = imageUri.replace('data:image/jpeg;base64,', '');
        } else if (!imageUri.startsWith('file://')) {
          base64Image = imageUri;
        } else {
          base64Image = await imageToBase64(imageUri);
        }
      } else {
        base64Image = await imageToBase64(imageUri);
      }
      
      base64Image = base64Image.replace(/[\n\r]/g, '').trim();
      
      if (!base64Image || !/^[A-Za-z0-9+/=]+$/.test(base64Image)) {
        throw new Error('Invalid base64 string format');
      }
      
      // Set processing image here
      setProcessingImage(imageUri);
      
      // Delay animation start until after renders have completed
      const delayTimer = setTimeout(() => {
        // Check if we're still processing before starting animations
        if (!isProcessingRef.current) return;
        
        // Start animations in a safe way using start callback
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
        
        // Only schedule loading texts if we're still processing
        if (isProcessingRef.current) {
          scheduleLoadingTexts();
        }
      }, 100);
      
      // Track the timeout for cleanup
      addTimer('animationDelay', delayTimer); // Use the new helper
      
      console.log('Mode: search, Provider:', provider, 'Has drawing:', hasDrawing);
      startTimeRef.current = Date.now();
      
      let foodFound = false;
      
      // Use API key from context
      const apiKey = apiKeys?.[provider + 'ApiKey'];
      
      if (!apiKey) {
        console.error(`API key not found for ${provider}`);
        Alert.alert('Error', `API key not found for ${provider}`);
        setIsLoading(false);
        isProcessingRef.current = false;
        
        // Safely stop animations
        setTimeout(() => {
          stopLoadingAnimation();
          setProcessingImage(null);
        }, 100);
        return;
      }
      
      // Set up parameters for the web search handler
      const providerParams = {
        provider,
        selectedModel: currentModel,
        selectedMode: mode,
        base64Image,
        barcodeData,
        hasDrawing,
        apiKey,
        handleSuccessfulScan: async (parsedData, imageUri, barcodeData, hasDrawing, actualModel) => {
          try {
            console.log('Processing successful scan with data:', parsedData);
            
            // Extract search sources if available
            if (parsedData && parsedData.details && parsedData.details.sources) {
              const sources = parsedData.details.sources;
              console.log('Found sources in response:', sources);
              
              if (Array.isArray(sources) && sources.length > 0) {
                setSearchResults(sources);
              }
            }
            
            // Add a flag to indicate this is the final processing step
            parsedData._isProcessingComplete = true;
            
            // Also add a flag to indicate this is a new scan
            parsedData._isNewScan = true;
            
            // MARK API AS FINISHED - This must happen before updating visualization
            await markAPIFinished();
            
            // If we got food data, save it and set the active tab
            if (parsedData && parsedData.food) {
              setFoodData(parsedData);
              setActiveTab('nutrition');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              // If we have the AI visualization ref, force all steps to complete in sequence
              if (visualizationRef.current) {
                console.log('Final data received - completing AI visualization');
                
                // First update with the final data
                visualizationRef.current.updateWithScanData(parsedData);
                
                // Then complete the visualization with a series of deliberate delays
                // to ensure the steps complete in the right order visually
                setTimeout(() => {
                  if (visualizationRef.current && visualizationRef.current.completeVisualization) {
                    console.log('Explicitly completing AI visualization - using force flag');
                    visualizationRef.current.completeVisualization(true); // Use force flag to bypass timing checks
                    
                    // Increase the delay before hiding the visualization
                    // This gives users more time to see the completed visualization
                    if (!isLoading) {
                      const fadeOutTimer = setTimeout(() => { // Track this timer
                        if (isProcessingRef.current) {
                          fadeOutVisualization(() => {
                            // After fade completes, update state and refresh UI
                            setShowVisualization(false);
                            
                            // Clear search storage when visualization is hidden
                            clearSearchStorage();
                            
                            // Force active tab to refresh by briefly toggling animation
                            if (activeTab === 'nutrition' && foodData) {
                              // Force re-render of nutrition tab content by toggling animation
                              Animated.timing(tabFadeAnim, {
                                toValue: 0,
                                duration: 50,
                                useNativeDriver: true,
                              }).start(() => {
                                Animated.timing(tabFadeAnim, {
                                  toValue: 1,
                                  duration: 50,
                                  useNativeDriver: true,
                                }).start();
                              });
                            }
                          });
                        }
                      }, 2000);
                      addTimer('fadeOutVizSuccess', fadeOutTimer); // Track timer
                    }
                  }
                }, 1500);
                // Track the timeout
                const completeVizDelayTimer = setTimeout(() => {}, 1); // Placeholder timer
                addTimer('completeVizDelay', completeVizDelayTimer); // Track timer
              }
              
              return true;
            }
            
            return false;
          } catch (error) {
            console.error('Error in handleSuccessfulScan:', error);
            return false;
          }
        },
        handleError: (error, imageUri, barcodeData) => {
          console.error('Error in web search:', error);
          setErrorOccurred(true);
          setIsLoading(false);
          
          // Reset all animation and visualization states
          stopLoadingAnimation(); // This now calls clearAllTimers
          
          // Explicitly reset the visualization component
          if (visualizationRef.current && visualizationRef.current.reset) {
            console.log('Resetting visualization component due to API error');
            visualizationRef.current.reset();
          }
          
          resetVisualization();
          
          // Reset processing states
          setProcessingImage(null);
          isAnimationRunningRef.current = false;
          
          Alert.alert('Error', 'An error occurred during web search. Please try again.');
        },
        // Add a specific handler for tracking search queries and results
        handleSearchTracking: async (queries, results) => {
          try {
            // First check if API is finished by reading from AsyncStorage
            const apiFinishedValue = await AsyncStorage.getItem(API_FINISHED_KEY);
            const apiFinished = apiFinishedValue === 'true';
            
            // EXTREME CHECK: If API is already finished, block all updates
            if (apiFinished || global.FUNCTIONAL_AI_VISUALIZATION_BLOCK_ALL_UPDATES) {
              console.log('BLOCKED search tracking update - API is already finished or global blocker active');
              // SET THE GLOBAL FLAG to make sure everything is blocked
              global.FUNCTIONAL_AI_VISUALIZATION_BLOCK_ALL_UPDATES = true;
              return;
            }
            
            // Process and store queries if provided
            if (queries && queries.length > 0) {
              console.log('Processing search queries in tracking function:', queries);
              
              // Get existing queries from storage
              const existingQueriesJson = await AsyncStorage.getItem(SEARCH_QUERIES_KEY);
              let existingQueries = [];
              if (existingQueriesJson) {
                try {
                  existingQueries = JSON.parse(existingQueriesJson);
                } catch (e) {
                  console.error('Error parsing existing queries:', e);
                }
              }
              
              // Filter out duplicates and add new queries
              const newQueries = [...existingQueries];
              queries.forEach(query => {
                if (!newQueries.includes(query)) {
                  newQueries.push(query);
                }
              });
              
              // Save updated queries to AsyncStorage
              await AsyncStorage.setItem(SEARCH_QUERIES_KEY, JSON.stringify(newQueries));
              
              // Update local state with new queries
              setSearchQueries(newQueries);
              
              // Try to extract food items from queries for accurate recognition
              if (queries.length > 0) {
                const foodNameMatch = queries.find(q => 
                  q.toLowerCase().includes('nutrition facts for') || 
                  q.toLowerCase().includes('calories in')
                );
                
                if (foodNameMatch) {
                  // Extract food name using regex
                  const match = foodNameMatch.match(/(?:nutrition facts for|calories in)\s+(.+?)(?:$|\.|,)/i);
                  if (match && match[1]) {
                    const foodName = match[1].trim();
                    if (foodName.length > 2) {
                      // Save detected food to AsyncStorage
                      await AsyncStorage.setItem(DETECTED_FOOD_KEY, foodName);
                      // Update local state
                      setDetectedFoodItems([foodName]);
                    }
                  }
                }
              }
              
              // Update visualization with latest queries from storage
              if (visualizationRef.current) {
                visualizationRef.current.updateWithSearchQueries(newQueries);
              }
            }
            
            // Process and store results if provided
            if (results && results.length > 0) {
              console.log('Processing search results in tracking function:', results.length);
              
              // Get existing results from storage
              const existingResultsJson = await AsyncStorage.getItem(SEARCH_RESULTS_KEY);
              let existingResults = [];
              if (existingResultsJson) {
                try {
                  existingResults = JSON.parse(existingResultsJson);
                } catch (e) {
                  console.error('Error parsing existing results:', e);
                }
              }
              
              // Filter out duplicates by URL and add new results
              const newResults = [...existingResults];
              results.forEach(result => {
                if (!newResults.some(existing => existing.url === result.url)) {
                  newResults.push(result);
                }
              });
              
              // Save updated results to AsyncStorage
              await AsyncStorage.setItem(SEARCH_RESULTS_KEY, JSON.stringify(newResults));
              
              // Update local state with new results
              setSearchResults(newResults);
              
              // Update visualization with latest results from storage
              if (visualizationRef.current) {
                visualizationRef.current.updateWithSearchResults(newResults);
              }
            }
          } catch (error) {
            console.error('Error in handleSearchTracking:', error);
          }
        },
        imageUri,
        startTimeRef,
        updateAverageProcessingTime,
        isFirstDayUnlimited: false,
        isSubscribed: true, // Assume subscribed for testing
        setNoFoodFound,
        setFoodData,
        setActiveTab,
      };
      
      // Call the web search handler
      foodFound = await handleWebSearch(providerParams);
      
      setIsLoading(false);
      stopLoadingAnimation();
      setProcessingImage(null);
      
      // Mark that API processing is complete
      if (visualizationRef.current && visualizationRef.current.setAPIFinished) {
        visualizationRef.current.setAPIFinished(true);
      }
      
      // Allow visualization to complete before hiding it
      setTimeout(() => {
        // Only try to fade out if the visualization isn't already hidden
        if (showVisualization) {
          // First, ensure the visualization has completely finished its animations
          if (visualizationRef.current && visualizationRef.current.completeVisualization) {
            visualizationRef.current.completeVisualization(true);
          }
          
          // Give more time before fading out
          setTimeout(() => {
            console.log('Starting fade-out animation for visualization...');
            // Try to fade out with native animation
            Animated.timing(visualizationFadeAnim, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true
            }).start(({finished}) => {
              console.log('Fade-out animation complete, finished:', finished);
              
              // After fade completes, reset state
              if (finished) {
                setShowVisualization(false);
                resetVisualization();
              } else {
                // If for some reason the animation didn't finish, force hide
                console.log('Animation did not finish naturally, forcing reset');
                setShowVisualization(false);
                resetVisualization();
              }
            });
          }, 3000); // Give 3 seconds to view the completed animation
        }
      }, 2500); // Increased to 2.5 seconds to give time for visualization to complete
      
      fadeOutTitle(() => {
        fadeInTitle();
      });
      
      setShowPlaceholder(false);
    } catch (error) {
      console.error('Error in sendImageToApi:', error);
      setIsLoading(false);
      
      // Explicitly stop animations before resetting state
      fadeAnim.stopAnimation();
      visualizationFadeAnim.stopAnimation();
      fadeAnimTitle.stopAnimation(); // Stop other animations too if necessary
      tabFadeAnim.stopAnimation();

      // Safely stop animations and clear timers
      safelyStopAnimations(); 
      setProcessingImage(null);
      
      // Reset all animation and temporary states
      const resetTimer = setTimeout(() => { 
        // Explicitly reset the visualization component
        if (visualizationRef.current && visualizationRef.current.reset) {
          console.log('Resetting visualization component due to error');
          visualizationRef.current.reset();
        }
        
        // Hide visualization if it was shown
        setShowVisualization(false);
      }, 200);
      addTimer('errorReset', resetTimer); 
      
      Alert.alert('Error', 'An error occurred during image processing. Please try again.');
    } finally {
      isProcessingRef.current = false;
    }
  };
  
  // Handle tab switching
  const handleTabPress = (tab) => {
    if (activeTab === tab || isLoading || noFoodFound || !foodData) return;
    
    Animated.timing(tabFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(tab);
      Animated.timing(tabFadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };
  
  // Render functions for the UI
  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'nutrition' && styles.activeTab]}
        onPress={() => handleTabPress('nutrition')}
        disabled={isLoading || noFoodFound || !foodData}
      >
        <Text style={[styles.tabText, activeTab === 'nutrition' && styles.activeTabText]}>Nutrition</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'ingredients' && styles.activeTab]}
        onPress={() => handleTabPress('ingredients')}
        disabled={isLoading || noFoodFound || !foodData}
      >
        <Text style={[styles.tabText, activeTab === 'ingredients' && styles.activeTabText]}>Ingredients</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'details' && styles.activeTab]}
        onPress={() => handleTabPress('details')}
        disabled={isLoading || noFoodFound || !foodData}
      >
        <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>Details</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'search' && styles.activeTab]}
        onPress={() => handleTabPress('search')}
        disabled={isLoading || noFoodFound || !foodData}
      >
        <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>Search</Text>
      </TouchableOpacity>
    </View>
  );
  
  const renderNutritionTab = () => {
    if (!foodData || !foodData.food) return null;
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.nutritionContainer}>
          <Text style={styles.foodName}>{foodData.food.name}</Text>
          <Text style={styles.foodCategory}>{foodData.food.class} - {foodData.food.type}</Text>
          
          <View style={styles.macroContainer}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{foodData.food.calories?.amount || 0}</Text>
              <Text style={styles.macroLabel}>Calories</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{foodData.food.proteins?.amount || 0}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{foodData.food.carbohydrates?.amount || 0}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{foodData.food.fats?.amount || 0}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>
          
          <View style={styles.nutritionDetailsContainer}>
            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Fiber</Text>
              <Text style={styles.nutritionValue}>{foodData.food.fiber?.amount || 0}g</Text>
            </View>
            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Sugar</Text>
              <Text style={styles.nutritionValue}>{foodData.food.sugar?.amount || 0}g</Text>
            </View>
            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Sodium</Text>
              <Text style={styles.nutritionValue}>{foodData.food.sodium?.amount || 0}mg</Text>
            </View>
            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Serving Size</Text>
              <Text style={styles.nutritionValue}>
                {foodData.food.servingSize?.amount || 1} {foodData.food.servingSize?.unit || 'serving'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };
  
  const renderIngredientsTab = () => {
    if (!foodData || !foodData.food || !foodData.food.ingredients) return null;
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.ingredientsContainer}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {foodData.food.ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientItem}>
              <Text style={styles.ingredientName}>{ingredient.name}</Text>
              {ingredient.description && (
                <Text style={styles.ingredientDescription}>{ingredient.description}</Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };
  
  const renderDetailsTab = () => {
    if (!foodData || !foodData.details) return null;
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Details</Text>
          {foodData.details.summaryText && (
            <Text style={styles.summaryText}>{foodData.details.summaryText}</Text>
          )}
        </View>
      </View>
    );
  };
  
  const renderSearchTab = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.searchContainer}>
          <Text style={styles.sectionTitle}>Web Search</Text>
          
          {searchQueries.length > 0 && (
            <View style={styles.searchQueriesContainer}>
              <Text style={styles.subsectionTitle}>Search Queries</Text>
              {searchQueries.map((query, index) => (
                <View key={index} style={styles.searchQueryItem}>
                  <Icon name="search-outline" size={16} color={colorScheme === 'dark' ? '#aaa' : '#666'} />
                  <Text style={styles.searchQueryText}>{query}</Text>
                </View>
              ))}
            </View>
          )}
          
          {searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <Text style={styles.subsectionTitle}>Results</Text>
              {searchResults.map((result, index) => (
                <View key={index} style={styles.searchResultItem}>
                  <Text style={styles.searchResultTitle}>{result.title}</Text>
                  <Text style={styles.searchResultUrl}>{result.url}</Text>
                  <Text style={styles.searchResultSnippet}>{result.snippet}</Text>
                </View>
              ))}
            </View>
          )}
          
          {searchQueries.length === 0 && searchResults.length === 0 && (
            <Text style={styles.noSearchText}>No web searches were performed for this analysis.</Text>
          )}
        </View>
      </View>
    );
  };
  
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <Animated.View style={{ opacity: visualizationFadeAnim }}>
        {showVisualization && (
          <FunctionalAIVisualization 
            ref={visualizationRef}
            isDark={colorScheme === 'dark'}
            isVisible={showVisualization}
            searchQueries={searchQueries}
            searchResults={searchResults}
            foodItems={getFoodItems()}
            processingSteps={LOADING_TEXTS}
            brandName={detectedBrand}
            onComplete={() => {
              // When animation completes, we can do additional actions if needed
              console.log('Animation completed, isLoading:', isLoading);
              
              // If we're no longer loading, we can hide the visualization after a delay
              // but only if we have food data successfully processed
              if (!isLoading && foodData) {
                console.log('Setting timer to hide visualization');
                const visHideTimeout = setTimeout(() => {
                  console.log('Hiding visualization with fade');
                  if (isProcessingRef.current) {
                    fadeOutVisualization();
                  }
                }, 2000);
                
                // Track the timeout
                addTimer('visHideTimeout', visHideTimeout);
              } else {
                console.log('Keeping visualization visible - still loading or no food data');
              }
            }}
          />
        )}
      </Animated.View>
      {isLoading && !searchQueries.length && !searchResults.length && (
        <Text style={[styles.loadingText, { marginTop: 8 }]}>
          Initializing search...
        </Text>
      )}
    </View>
  );
  
  const renderNoFoodFound = () => (
    <View style={styles.noFoodContainer}>
      <Icon name="alert-circle-outline" size={64} color={colorScheme === 'dark' ? '#fff' : '#000'} />
      <Text style={styles.noFoodText}>No food found in the image</Text>
      <TouchableOpacity style={styles.tryAgainButton} onPress={() => setNoFoodFound(false)}>
        <Text style={styles.tryAgainButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
  
  const renderErrorState = () => (
    <View style={styles.noFoodContainer}>
      <Icon name="alert-circle-outline" size={64} color="#E53935" />
      <Text style={styles.noFoodText}>An error occurred</Text>
      <TouchableOpacity style={styles.tryAgainButton} onPress={() => setErrorOccurred(false)}>
        <Text style={styles.tryAgainButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
  
  const renderContent = () => {
    if (showVisualization) {
      return renderLoadingState();
    }
    
    if (isLoading) {
      return renderLoadingState();
    }
    
    if (noFoodFound) {
      return renderNoFoodFound();
    }
    
    if (errorOccurred) {
      return renderErrorState();
    }
    
    if (foodData) {
      return (
        <View style={styles.contentContainer}>
          {renderTabs()}
          <Animated.View style={[styles.tabContentContainer, { opacity: tabFadeAnim }]}>
            {activeTab === 'nutrition' && renderNutritionTab()}
            {activeTab === 'ingredients' && renderIngredientsTab()}
            {activeTab === 'details' && renderDetailsTab()}
            {activeTab === 'search' && renderSearchTab()}
          </Animated.View>
        </View>
      );
    }
    
    return (
      <View style={styles.placeholderContainer}>
        <Animated.View style={[styles.placeholderTextContainer, { opacity: fadeAnimPlaceholder }]}>
          <Image
            source={require('../assets/search-placeholder.png')}
            style={styles.placeholderImage}
            resizeMode="contain"
          />
          <Text style={styles.placeholderTitle}>Search Mode (BETA)</Text>
          <Text style={styles.placeholderText}>
            This mode allows the AI to search the web to find accurate nutrition information. Take a photo or select an image to analyze.
          </Text>
        </Animated.View>
      </View>
    );
  };
  
  const renderButtons = () => (
    <View style={styles.buttonContainer}>
      <TouchableOpacity
        style={[styles.button, styles.cameraButton]}
        onPress={takePhoto}
        disabled={isLoading}
      >
        <Icon name="camera-outline" size={24} color="#fff" />
        <Text style={styles.buttonText}>Camera</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, styles.galleryButton]}
        onPress={pickImage}
        disabled={isLoading}
      >
        <Icon name="image-outline" size={24} color="#fff" />
        <Text style={styles.buttonText}>Gallery</Text>
      </TouchableOpacity>
    </View>
  );
  
  // Add this helper function to extract food items
  const getFoodItems = () => {
    const items = [];
    
    // Add detected items first
    detectedFoodItems.forEach(item => {
      if (!items.includes(item)) {
        items.push(item);
      }
    });
    
    // Then add from foodData if available
    if (foodData?.food) {
      if (foodData.food.name && !items.includes(foodData.food.name)) {
        items.push(foodData.food.name);
      }
      
      // Check for ingredients list
      if (foodData.food.ingredients && Array.isArray(foodData.food.ingredients)) {
        foodData.food.ingredients.forEach(ingredient => {
          if (ingredient.name && !items.includes(ingredient.name)) {
            items.push(ingredient.name);
          }
        });
      }
    }
    
    return items;
  };
  
  // Add a function to mark API as finished
  const markAPIFinished = async () => {
    console.log('Marking API as finished in AsyncStorage');
    try {
      // Store flag in AsyncStorage
      await AsyncStorage.setItem(API_FINISHED_KEY, 'true');
      
      // Update global blockers
      global.FUNCTIONAL_AI_VISUALIZATION_BLOCK_ALL_UPDATES = true;
      
      // Set the visualization as finished
      if (visualizationRef.current && visualizationRef.current.setAPIFinished) {
        visualizationRef.current.setAPIFinished(true);
      }
    } catch (error) {
      console.error('Error marking API as finished:', error);
    }
  };
  
  // Update the clearSearchStorage function to clear all step state keys
  const clearSearchStorage = async () => {
    console.log('Clearing all search and step state storage');
    try {
      // Clear search data
      await AsyncStorage.removeItem(SEARCH_QUERIES_KEY);
      await AsyncStorage.removeItem(SEARCH_RESULTS_KEY);
      await AsyncStorage.removeItem(API_FINISHED_KEY);
      await AsyncStorage.removeItem(DETECTED_FOOD_KEY);
      
      // Clear processing step data
      await AsyncStorage.removeItem(PROCESSING_STEP_KEY);
      await AsyncStorage.removeItem(STEP_TIMESTAMP_KEY);
      
      // Clear step active states
      await AsyncStorage.removeItem(RECOGNIZE_STEP_ACTIVE_KEY);
      await AsyncStorage.removeItem(SEARCH_STEP_ACTIVE_KEY);
      await AsyncStorage.removeItem(PROCESS_STEP_ACTIVE_KEY);
      await AsyncStorage.removeItem(RESULT_STEP_ACTIVE_KEY);
      
      // Clear step completed states
      await AsyncStorage.removeItem(RECOGNIZE_STEP_COMPLETED_KEY);
      await AsyncStorage.removeItem(SEARCH_STEP_COMPLETED_KEY);
      await AsyncStorage.removeItem(PROCESS_STEP_COMPLETED_KEY);
      await AsyncStorage.removeItem(RESULT_STEP_COMPLETED_KEY);
      
      console.log('All search and step state storage cleared successfully');
    } catch (error) {
      console.error('Error clearing search and step storage:', error);
    }
  };
  
  // Add a function to initialize step states at the start of a search
  const initializeStepStates = async () => {
    console.log('Initializing step states in AsyncStorage');
    try {
      // Clear any previous step states first
      await clearSearchStorage();
      
      // Initialize with recognize step active
      await AsyncStorage.setItem(RECOGNIZE_STEP_ACTIVE_KEY, 'true');
      await AsyncStorage.setItem(PROCESSING_STEP_KEY, STEP_RECOGNIZE);
      await AsyncStorage.setItem(STEP_TIMESTAMP_KEY, Date.now().toString());
      
      // Initialize all other steps as inactive
      await AsyncStorage.setItem(SEARCH_STEP_ACTIVE_KEY, 'false');
      await AsyncStorage.setItem(PROCESS_STEP_ACTIVE_KEY, 'false');
      await AsyncStorage.setItem(RESULT_STEP_ACTIVE_KEY, 'false');
      
      // Initialize all completion states as false
      await AsyncStorage.setItem(RECOGNIZE_STEP_COMPLETED_KEY, 'false');
      await AsyncStorage.setItem(SEARCH_STEP_COMPLETED_KEY, 'false');
      await AsyncStorage.setItem(PROCESS_STEP_COMPLETED_KEY, 'false');
      await AsyncStorage.setItem(RESULT_STEP_COMPLETED_KEY, 'false');
      
      // Initialize API finished state as false
      await AsyncStorage.setItem(API_FINISHED_KEY, 'false');
      
      console.log('Step states initialized successfully');
    } catch (error) {
      console.error('Error initializing step states:', error);
    }
  };
  
  // Add cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      // Clear all timeouts and intervals when component unmounts
      clearAllTimers();
      
      // Clear search storage on unmount
      clearSearchStorage();
      
      // Reset all states
      setIsLoading(false);
      setShowVisualization(false);
      setProcessingImage(null);
      setCurrentLoadingText('');
      isAnimationRunningRef.current = false;
    };
  }, []);
  
  // Main render
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colorScheme === 'dark' ? ['#121212', '#121212'] : ['#f7f7f7', '#ffffff']}
        style={styles.headerGradient}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnimTitle }]}>
          <Text style={styles.headerTitle}>Search Mode (BETA)</Text>
          <View style={styles.providerBadge}>
            <Text style={styles.providerText}>{selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)}</Text>
          </View>
        </Animated.View>
      </LinearGradient>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
      
      {renderButtons()}
    </View>
  );
};

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorScheme === 'dark' ? '#121212' : '#ffffff',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
  },
  providerBadge: {
    backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  providerText: {
    fontSize: 14,
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 20,
    paddingBottom: 100,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f9f9f9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f9f9f9',
    borderRadius: 12,
    minHeight: 300,
  },
  placeholderTextContainer: {
    alignItems: 'center',
  },
  placeholderImage: {
    width: 100,
    height: 100,
    marginBottom: 20,
    tintColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    color: colorScheme === 'dark' ? '#aaaaaa' : '#666666',
  },
  loadingContainer: {
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
  },
  noFoodContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  noFoodText: {
    marginTop: 20,
    fontSize: 18,
    textAlign: 'center',
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
  },
  tryAgainButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#f0f0f0',
    borderRadius: 8,
  },
  tryAgainButtonText: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    flex: 0.48,
  },
  cameraButton: {
    backgroundColor: '#4e54c8',
  },
  galleryButton: {
    backgroundColor: '#1e88e5',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colorScheme === 'dark' ? '#333333' : '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
  },
  tabText: {
    fontSize: 14,
    color: colorScheme === 'dark' ? '#aaaaaa' : '#666666',
  },
  activeTabText: {
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
  },
  tabContentContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  nutritionContainer: {
    marginBottom: 20,
  },
  foodName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
    marginBottom: 4,
  },
  foodCategory: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#aaaaaa' : '#666666',
    marginBottom: 20,
  },
  macroContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
  },
  macroLabel: {
    fontSize: 14,
    color: colorScheme === 'dark' ? '#aaaaaa' : '#666666',
    marginTop: 4,
  },
  nutritionDetailsContainer: {
    borderTopWidth: 1,
    borderTopColor: colorScheme === 'dark' ? '#333333' : '#e0e0e0',
    paddingTop: 16,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  nutritionLabel: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#aaaaaa' : '#666666',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
  },
  ingredientsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
    marginBottom: 16,
  },
  ingredientItem: {
    marginBottom: 12,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '500',
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
    marginBottom: 2,
  },
  ingredientDescription: {
    fontSize: 14,
    color: colorScheme === 'dark' ? '#aaaaaa' : '#666666',
  },
  detailsContainer: {
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: colorScheme === 'dark' ? '#dddddd' : '#333333',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchQueriesContainer: {
    marginBottom: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
    marginBottom: 12,
  },
  searchQueryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 12,
    backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#f0f0f0',
    borderRadius: 8,
  },
  searchQueryText: {
    marginLeft: 8,
    fontSize: 15,
    color: colorScheme === 'dark' ? '#dddddd' : '#333333',
  },
  searchResultsContainer: {
    marginBottom: 20,
  },
  searchResultItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#f0f0f0',
    borderRadius: 8,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
    marginBottom: 4,
  },
  searchResultUrl: {
    fontSize: 14,
    color: colorScheme === 'dark' ? '#64B5F6' : '#1976D2',
    marginBottom: 8,
  },
  searchResultSnippet: {
    fontSize: 14,
    color: colorScheme === 'dark' ? '#bbbbbb' : '#555555',
  },
  noSearchText: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#aaaaaa' : '#666666',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SearchScreen; 