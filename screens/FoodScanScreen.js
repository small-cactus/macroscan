import React, { useState, useEffect, useRef, useCallback, useMemo, useContext, useLayoutEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
  Modal, Alert, useColorScheme, Animated, Linking, TextInput, Dimensions, Platform, AppState,
  LayoutAnimation, Easing,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Anthropic from '@anthropic-ai/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Entypo } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as RNIap from 'react-native-iap';
import { useIAP } from '../IAPContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faInfinity } from '@fortawesome/free-solid-svg-icons';
import { useUser } from '../userContext';
import { useNavigation } from '@react-navigation/native';
import { Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedTextFoodScan from './AnimatedTextFoodScan';
import AnimatedTextFoodScanFast from './AnimatedTextFoodScanFast';
import TutorialOverlay from './Tutorial';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as StoreReview from 'react-native-store-review';
import Superwall from '@superwall/react-native-superwall';
import FoodSelectionModal from './FoodSelectionModal.js';
import WhatsNew from './WhatsNew';
import { handleAnthropicScan, handleOpenAIScan, handleGeminiScan } from './providers';
import { getModel } from './providers/models';
import { updateAverageProcessingTime, loadAverageProcessingTimes } from './providers/processingTimes';  // Add loadAverageProcessingTimes
import ModeTooltip from '../components/ModeTooltip';
import ScanButtonTooltip from '../components/ScanButtonTooltip';
import { useTimeZone } from '../TimeZoneContext';
import { FadeInDown } from 'react-native-reanimated';
import { handleWebSearch } from './providers/WebSearchProvider';
import WebSearchProvider from './providers/WebSearchProvider';
import FunctionalAIVisualization from './FunctionalAIVisualization';
import SearchModeInfoSheet from './SearchModeInfoSheet';
import { Svg, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { Audio } from 'expo-av'; // Added import
import ManualInputModal from './ManualInputModal'; // Import the new component
import { Ionicons } from '@expo/vector-icons';

const useOpenAI = false; // Set to true to use OpenAI, false rto use Anthropic

const { width, height } = Dimensions.get('window');

const LOADING_TEXTS = {
  fast: [
    "Analyzing image...",
    "Asking Gordon Ramsay...",
    "Cooking up results...",
    "Formatting reply...",
    "Sharpening sensors...",
    "Warming up the engines...",
    "Crunching numbers...",
    "Making it tasty...",
  ],
  accurate: [
    "Carefully examining details...",
    "Running complex algorithms...",
    "Verifying data...",
    "Ensuring accuracy...",
    "Double-checking results...",
    "Refining analysis...",
    "Calculating precision...",
    "Validating information...",
    "Enhancing accuracy...",
    "Finalizing insights...",
    "Still working on it...",
    "Triple checking data...",
    "Checking for errors...",
    "Ensuring consistency...",
  ],
  search: [] // Empty array since we don't need loading texts for search mode
};

const isIphoneSE = () => {
  const smallIphoneDimensions = [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 414, height: 736 },
    { width: 360, height: 640 },
    { width: 375, height: 812 },
    { width: 360, height: 780 },
  ];

  return (
    Platform.OS === 'ios' &&
    smallIphoneDimensions.some(
      dim => (width === dim.width && height === dim.height) || (width === dim.height && height === dim.width)
    )
  );
};

// Constants can stay outside the component
const MODE_LABELS = {
  fast: 'Fast Mode',
  accurate: 'Accurate Mode',
  search: 'Deep Search',
};

// Add search mode constant
const FAST_MODE = 'fast';
const ACCURATE_MODE = 'accurate';
const SEARCH_MODE = 'search';

const FoodScanScreen = () => {
  // Add debug flag at the top of the component
  const DEBUG_MODE = false; // Set to false for production

  // Add a global variable to track when search should be cancelled
  global.NUTRILENS_CANCEL_SEARCH = false;

  // Move useState inside the component
  const [showModeChip, setShowModeChip] = useState(true);
  const [image, setImage] = useState(null);
  const [processingImage, setProcessingImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [foodData, setFoodData] = useState(null);
  const [activeTab, setActiveTab] = useState('');
  const colorScheme = useColorScheme();
  const styles = getDynamicStyles(colorScheme);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [loadingTextQueue, setLoadingTextQueue] = useState([]);
  const [currentLoadingText, setCurrentLoadingText] = useState('');
  const isAnimationRunningRef = useRef(false);
  const tabFadeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnimTitle = useRef(new Animated.Value(1)).current;
  const fadeAnimImage = useRef(new Animated.Value(1)).current;
  const fadeAnimPlaceholder = useRef(new Animated.Value(1)).current;
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipFadeAnim = useRef(new Animated.Value(0)).current;
  const [noFoodFound, setNoFoodFound] = useState(false);
  const [ErrorOccured, setErrorOccured] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const isTabsDisabled = !foodData || noFoodFound;
  const loadingAnimationRef = useRef(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const scrollViewRef = useRef(null);
  const { user, apiKeys } = useUser();
  const { isIAPEnabled } = useIAP();
  const [hasPermission, setHasPermission] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImageUri, setModalImageUri] = useState(null);
  const fadeAnimFeedback = useRef(new Animated.Value(0)).current;
  const [inputModalVisible, setInputModalVisible] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribedPlus, setIsSubscribedPlus] = useState(false);
  const [timeLeftForScans, setTimeLeftForScans] = useState('');
  const [freeAccurateScansUsed, setFreeAccurateScansUsed] = useState(0);
  const [freeSearchScansUsed, setFreeSearchScansUsed] = useState(0);

  // Add new state for paywall tracking
  const [totalScanCount, setTotalScanCount] = useState(0);
  const [lastPaywallTime, setLastPaywallTime] = useState(0);
  const postScanPaywallTimerRef = useRef(null);

  // Add new state variables for manual input
  const [manualInputModalVisible, setManualInputModalVisible] = useState(false);
  const [manualUserInput, setManualUserInput] = useState('');

  // Add new animated value for tab indicator
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  const [isFirstDayUnlimited, setIsFirstDayUnlimited] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [selectedModel, setSelectedModel] = useState(getModel('anthropic', { selectedMode: 'fast' }));
  const [selectedMode, setSelectedMode] = useState('fast');
  const [apiSuccess, setApiSuccess] = useState(false);
  const loadingTextQueueRef = useRef([]);
  const loadingIntervalRef = useRef(null);
  const loadingTimeoutRef = useRef(null);
  const isHoldingRef = useRef(false);
  const loadingTextFadeAnim = useRef(new Animated.Value(1)).current;
  const navigation = useNavigation();
  const route = useRoute();
  const scrollIndicatorOpacity = useRef(new Animated.Value(0)).current;
  const [showTutorial, setShowTutorial] = useState(false);
  const [hadBarcode, setHadBarcode] = useState(false);

  // Add this state near the top with other state declarations
  const [processingTime, setProcessingTime] = useState(0);
  const [showProcessingTime, setShowProcessingTime] = useState(false);
  const processingTimeRef = useRef(null);
  const processingTimeFadeAnim = useRef(new Animated.Value(0)).current;

  // Add these new state variables and refs at the top of the component
  const [prevMode, setPrevMode] = useState(selectedMode);
  const chipTextOpacity = useRef(new Animated.Value(1)).current;
  const modeChipWidth = useRef(new Animated.Value(100)).current;
  // Add new animated value for chip pulse effect
  const chipPulseAnim = useRef(new Animated.Value(0)).current;

  // Add this new Animated Value near your other animation refs
  const longLoadingTextAnim = useRef(new Animated.Value(0)).current;

  const startTimeRef = useRef(null); // Add this line

  const tutorialSteps = [
    { text: 'Welcome! This is your home screen.' },
    { text: 'Tap on the menu to explore options.' },
    { text: 'Use the search bar to find what you need.' },
  ];

  // Add this after other state declarations
  const [tabLayout, setTabLayout] = useState({ width: 0, x: 0 });
  const tabWidthAnim = useRef(new Animated.Value(0)).current;

  const [hasPromptedForReview, setHasPromptedForReview] = useState(false);
  const [accurateScansBeforeReview, setAccurateScansBeforeReview] = useState(0);
  
  // Load rating prompt state
  useEffect(() => {
    const loadRatingState = async () => {
      try {
        const hasPrompted = await AsyncStorage.getItem('@has_prompted_for_review');
        const accurateScans = await AsyncStorage.getItem('@accurate_scans_before_review');
        setHasPromptedForReview(hasPrompted === 'true');
        setAccurateScansBeforeReview(accurateScans ? parseInt(accurateScans) : 0);
      } catch (error) {
        console.error('Error loading rating state:', error);
      }
    };
    loadRatingState();
  }, []);

  // Add this with other refs at the top of the component
  const lastProcessedImageRef = useRef(null);

  useEffect(() => {
    const processImageFromCamera = async () => {
      // If an imageUri is present and we haven't processed it yet, handle it
      if (route.params?.imageUri && route.params.imageUri !== lastProcessedImageRef.current) {
        const imageUri = route.params.imageUri;
        lastProcessedImageRef.current = imageUri;
        const barcodeData = route.params.barcodeData;
        setProcessingImage(imageUri);
        // Resize the camera image to obtain a base64 string
        const resizedImage = await resizeImage(imageUri);
        setModalImageUri(resizedImage);
  
        // Pass the already resized image to the API
        await sendImageToApi(resizedImage, barcodeData, false, true);
  
        // Clear them so they aren't re-processed if user revisits the screen
        navigation.setParams({ imageUri: null, barcodeData: null });
      }
    };
  
    processImageFromCamera();
  }, [route.params?.imageUri, route.params?.barcodeData]);

  const getLoadingTextsByMode = (mode) => {
    switch (mode) {
      case 'fast':
        return LOADING_TEXTS.fast;
      case 'accurate':
        return LOADING_TEXTS.accurate;
      case 'search':
        return LOADING_TEXTS.search;
      default:
        return LOADING_TEXTS.fast;
    }
  };

  const enqueueLoadingText = (text) => {
    setLoadingTextQueue((prevQueue) => [...prevQueue, text]);
  };

  const [averageProcessingTimes, setAverageProcessingTimes] = useState(null);

  // Add this useEffect to load processing times
  useEffect(() => {
    const loadTimes = async () => {
      const times = await loadAverageProcessingTimes();
      setAverageProcessingTimes(times);
    };
    loadTimes();
  }, []);

  // Update scheduleLoadingTexts to use the loaded times
  const scheduleLoadingTexts = () => {
    const mode = selectedMode;
    
    // Skip loading texts for search mode
    if (mode === SEARCH_MODE) {
      return;
    }
    
    let averageTime = 6000; // Default fallback time

    // Try to get the actual average time for current provider/model
    if (averageProcessingTimes && averageProcessingTimes[selectedProvider]) {
      const modelTimes = averageProcessingTimes[selectedProvider][selectedModel];
      if (modelTimes && typeof modelTimes[mode] === 'number') {
        averageTime = modelTimes[mode];
      }
    }

    const loadingTexts = getLoadingTextsByMode(mode);
    const totalTexts = loadingTexts.length;

    // Calculate the interval between texts
    const interval = averageTime / totalTexts;

    // Enqueue each text with a delay based on the interval
    loadingTexts.forEach((text, index) => {
      setTimeout(() => {
        setLoadingTextQueue((prevQueue) => [...prevQueue, text]);
      }, index * interval);
    });

    // Optionally, handle texts that might need to appear if processing takes longer
    setTimeout(() => {
      setLoadingTextQueue((prevQueue) => [...prevQueue, "Taking longer than usual..."]);
    }, averageTime + 2000); // 2 seconds after average time
  };

  // Update the startLoadingAnimation function
  const startLoadingAnimation = () => {
    if (isAnimationRunningRef.current) return;
    isAnimationRunningRef.current = true;
    
    // If in search mode, don't show loading texts
    if (selectedMode === SEARCH_MODE) {
      // Just show the loading UI without text animations
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      return;
    }
    
    const loadingTexts = getLoadingTextsByMode(selectedMode);
  
    // Reset states
    setProcessingTime(0);
    setShowProcessingTime(false);
    clearInterval(processingTimeRef.current);
    longLoadingTextAnim.setValue(0); // Reset the long loading animation
  
    // Immediately display the first loading text
    setCurrentLoadingText(loadingTexts[0]);
    loadingTextQueueRef.current = loadingTexts.slice(1);
    isHoldingRef.current = false;
  
    // Fade in the parent container
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Fade in the first text
      Animated.timing(loadingTextFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        loadingTimeoutRef.current = setTimeout(() => {
          updateLoadingText();
        }, 0);
      });
    });
  
    const mode = selectedMode;
    const averageTime = averageProcessingTimes[mode] || 8000;
    console.log(`Predicted processing time for mode ${mode}: ${averageTime} ms`);
  
    // Schedule "Taking longer than usual..." with fade in
    setTimeout(() => {
      loadingTextQueueRef.current = ["Taking longer than usual..."];
      isHoldingRef.current = true;
  
      // Fade out current text
      Animated.timing(loadingTextFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentLoadingText("Taking longer than usual...");
        
        // Fade in the "taking longer" text and keep it visible
        Animated.timing(longLoadingTextAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
  
      // Start the processing time counter
      setShowProcessingTime(true);
      processingTimeRef.current = setInterval(() => {
        setProcessingTime(prev => prev + 1);
      }, 1000);
  
      // Fade in the processing time
      Animated.timing(processingTimeFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, averageTime + 2000);
  };

// Corrected updateLoadingText function
const updateLoadingText = () => {
  if (!isAnimationRunningRef.current) return;

  // If we are holding the current text, do not schedule fade out
  if (isHoldingRef.current) {
    return;
  }

  // Schedule fade out after display duration
  loadingTimeoutRef.current = setTimeout(() => {
    // Start fade out
    Animated.timing(loadingTextFadeAnim, {
      toValue: 0,
      duration: 500, // Fade-out duration
      useNativeDriver: true,
    }).start(() => {
      // Update the text
      if (loadingTextQueueRef.current.length > 0) {
        const nextText = loadingTextQueueRef.current[0];
        setCurrentLoadingText(nextText);
        loadingTextQueueRef.current = loadingTextQueueRef.current.slice(1);

        // Start fade in
        Animated.timing(loadingTextFadeAnim, {
          toValue: 1,
          duration: 500, // Fade-in duration
          useNativeDriver: true,
        }).start(() => {
          // Continue updating
          updateLoadingText();
        });
      } else {
        // No more texts; if needed, handle cleanup here
      }
    });
  }, 800); // Display duration
};

const stopLoadingAnimation = () => {
  isAnimationRunningRef.current = false;
  loadingTextQueueRef.current = [];
  setCurrentLoadingText('');
  setShowProcessingTime(false);
  clearInterval(processingTimeRef.current);
  
  // Clear the scan duration timer
  if (scanTimerRef.current) {
    clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
  }
  
  if (loadingTimeoutRef.current) {
    clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = null;
  }
  
  // If using search mode, mark the visualization as complete
  if (selectedMode === SEARCH_MODE && visualizationRef.current) {
    if (visualizationRef.current.setAPIFinished) {
      visualizationRef.current.setAPIFinished(true);
    }
  }
  
  Animated.timing(fadeAnim, {
    toValue: 0,
    duration: 300,
    useNativeDriver: true,
  }).start();
};

  useFocusEffect(
    useCallback(() => {
      const loadSettings = async () => {
        try {
          // Get route params if they exist
          const params = route.params || {};
          
          // First set the provider
          const provider = params.provider || await AsyncStorage.getItem('@selected_provider') || 'anthropic';
          setSelectedProvider(provider);
          
          // Then set the mode
          let mode;
          if (params.selectedMode) {
            mode = params.selectedMode;
            setSelectedMode(mode);
            await AsyncStorage.setItem('selectedMode', mode);
          } else {
            mode = await AsyncStorage.getItem('selectedMode') || 'fast';
            setSelectedMode(mode);
          }
          setInitialModeLoaded(mode); // <-- Store the initially loaded mode

          // Get the current model using the getModel helper
          const currentModel = getModel(provider, {
            selectedMode: mode,
            selectedModel: params.selectedModel || await AsyncStorage.getItem('selectedModel'),
            hasDrawing: false
          });
          
          setSelectedModel(currentModel);
          await AsyncStorage.setItem('selectedModel', currentModel);

          // Load food selection setting
          await loadFoodSelectionSetting();

          // If we have an imageUri in the params, process it
          if (params.imageUri) {
            const resizedImage = await resizeImage(params.imageUri);
            await sendImageToApi(resizedImage, params.barcodeData);
          }
        } catch (error) {
          console.error("Error loading settings:", error);
        }
      };
      loadSettings();
    }, [route.params])
  );

  useEffect(() => {
    if (isLoading) {
      setLoadingTextQueue(getLoadingTextsByMode(selectedMode));
    }
  }, [selectedMode, isLoading]);
  
  // Add timezone context
  const { getTodayString, getTimeUntilMidnight } = useTimeZone();
  
  useEffect(() => {
    const initializeAppData = async () => {
      try {
        const today = getTodayString();
  
        // 1) Check the existing "dateLastUsed"
        const dateLastUsed = await AsyncStorage.getItem('dateLastUsed');
        // Remove the log printing dateLastUsed
        // console.log('[INIT] dateLastUsed:', dateLastUsed, ' vs. today:', today);
  
        // 2) Check "firstUseDate"
        const firstUseDate = await AsyncStorage.getItem('firstUseDate');
        
        // Validate firstUseDate before using it
        const isValidFirstUseDate = firstUseDate && 
                                   /^\d{4}-\d{2}-\d{2}$/.test(firstUseDate) && 
                                   !isNaN(new Date(firstUseDate).getTime());
        
        if (!isValidFirstUseDate) {
          // If firstUseDate is invalid or doesn't exist, set it to today
          await AsyncStorage.setItem('firstUseDate', today);
          setIsFirstDayUnlimited(true);
          setScanCount(0);
        } else {
          setIsFirstDayUnlimited(firstUseDate === today);
        }
  
        // 3) Check if date changed since last use and reset counters if needed
        const isValidLastUsed = dateLastUsed && 
                               /^\d{4}-\d{2}-\d{2}$/.test(dateLastUsed) && 
                               !isNaN(new Date(dateLastUsed).getTime());
        
        if (!isValidLastUsed || dateLastUsed !== today) {
          // Reset the counters for a new day or if last used date is invalid
          await AsyncStorage.setItem('dailyScanCount', '0');
          await AsyncStorage.setItem('dateLastUsed', today);
          await AsyncStorage.setItem('freeAccurateScansUsed', '0');
          await AsyncStorage.setItem('freeSearchScansUsed', '0');
          setFreeAccurateScansUsed(0);
          setFreeSearchScansUsed(0);
          setScanCount(0);
        } else {
          // If the date is the same, load existing counters
          const count = await AsyncStorage.getItem('dailyScanCount');
          setScanCount(parseInt(count, 10) || 0);
  
          // Also load how many accurate scans used
          const accurateScansUsed = await AsyncStorage.getItem('freeAccurateScansUsed');
          setFreeAccurateScansUsed(parseInt(accurateScansUsed, 10) || 0);
          
          // Load how many search scans used
          const searchScansUsed = await AsyncStorage.getItem('freeSearchScansUsed');
          setFreeSearchScansUsed(parseInt(searchScansUsed, 10) || 0);
        }
  
        // 4) Load the user's chosen model & mode
        const model = await AsyncStorage.getItem('selectedModel');
        if (model) {
          setSelectedModel(model);
        }
        const mode = await AsyncStorage.getItem('selectedMode');
        if (mode) {
          setSelectedMode(mode);
        }
      } catch (error) {
        console.error("Error initializing app data:", error);
        
        // Set safe defaults in case of error
        setIsFirstDayUnlimited(false);
        setScanCount(0);
        setFreeAccurateScansUsed(0);
        setFreeSearchScansUsed(0);
        
        // Ensure dateLastUsed is set to prevent future errors
        await AsyncStorage.setItem('dateLastUsed', getTodayString());
      }
    };
  
    initializeAppData();
  }, [getTodayString]); // Add getTodayString to dependency array

  useFocusEffect(
    useCallback(() => {
      // Re-initialize or perform actions when the screen is focused
    }, [])
  );

  const initialCheckDoneRef = useRef(false);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        let isSubscribedUnlimited = false;
        let isSubscribedPlus = false;
    
        if (isIAPEnabled) {
          if (Platform.OS === 'ios') {
            // Ensure initConnection is called before using getReceiptIOS
            await RNIap.initConnection();
            // Retrieve the receipt data
            const receipt = await RNIap.getReceiptIOS({ forceRefresh: true });
    
            if (!receipt) {
              console.error('No receipt available');
            } else {
              // Send the receipt data to the cloud function
              const response = await fetch(
                'https://us-central1-weighty-works-420523.cloudfunctions.net/verifyReceipt2',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ receiptData: receipt }),
                }
              );
    
              // Check if the response is OK
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.isSubscribed) {
                  const productId = data.productId;
                  if (
                    ['macroscan_plusplus', 'macroscan_plusplus_yearly', 'macroscan_unlimited'].includes(productId)
                  ) {
                    isSubscribedUnlimited = true;
                  } else if (productId === 'macroscan_plus') {
                    isSubscribedPlus = true;
                  }
                } else {
                  console.log('Receipt validation failed:', data.message);
                }
              } else {
                const responseText = await response.text();
                console.error('Server Error:', response.status, responseText);
              }
            }
          } else {
            // Handle Android platform if necessary
            isSubscribedUnlimited = false;
            isSubscribedPlus = false;
          }
        } else {
          // If IAP is not enabled, rely on user context
          if (
            user?.subscriptionStatus === 'macroscan_unlimited' ||
            user?.subscriptionStatus === 'macroscan_plusplus'
          ) {
            isSubscribedUnlimited = true;
          } else if (user?.subscriptionStatus === 'macroscan_plus') {
            isSubscribedPlus = true;
          }
        }
    
        if (isSubscribedUnlimited) {
          setIsSubscribed(true);
          setIsSubscribedPlus(false);
        } else if (isSubscribedPlus) {
          setIsSubscribed(false);
          setIsSubscribedPlus(true);
        } else {
          setIsSubscribed(false);
          setIsSubscribedPlus(false);
        }
      } catch (error) {
        console.error('Failed to check subscription status:', error);
        setIsSubscribed(false);
        setIsSubscribedPlus(false);
      }
    };

    let isMounted = true;
    let checkInterval;

    // Only do initial check if we haven't done it yet
    if (!initialCheckDoneRef.current) {
      checkSubscription();
      initialCheckDoneRef.current = true;
    }

    // Set up interval for periodic checks (every 5 minutes)
    checkInterval = setInterval(() => {
      if (isMounted) {
        checkSubscription();
      }
    }, 300000); // 5 minutes

    // Cleanup function
    return () => {
      isMounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [isIAPEnabled, user]); // Only depend on isIAPEnabled and user changes

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!isSubscribed && !isSubscribedPlus && scanCount >= 5) {
        setTimeLeftForScans(getTimeUntilMidnight());
      } else {
        setTimeLeftForScans('');
      }
    }, 1000 * 60);

    return () => clearInterval(intervalId);
  }, [scanCount, isSubscribed]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isSubscribedPlus && scanCount >= 20) {
        setTimeLeftForScans(getTimeUntilMidnight());
      } else {
        setTimeLeftForScans('');
      }
    }, 1000 * 60);

    return () => clearInterval(intervalId);
  }, [scanCount, isSubscribedPlus]);

  useEffect(() => {
    if (foodData && !showTooltip) {
      setShowTooltip(true);
      Animated.timing(tooltipFadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        Animated.timing(tooltipFadeAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }).start(() => setShowTooltip(false));
      }, 3000);
    }
  }, [foodData]);

  // Removed the useEffect that depended on apiSuccess, modalImageUri, and foodData

  useEffect(() => {
    if (apiSuccess && modalImageUri && foodData && !noFoodFound && !ErrorOccured) {
      console.log('Storing product to history:', { apiSuccess, modalImageUri, foodData });
      storeProductDetails({
        productName: foodData.name,
        imageUri: modalImageUri,
        nutrients: foodData,
        date: new Date().toISOString(),
      });
      setApiSuccess(false);
    }
  }, [apiSuccess, modalImageUri, foodData, noFoodFound, ErrorOccured]);

  useEffect(() => {
    if (!modalVisible && modalImageUri) {
      let previewUri = modalImageUri;
      // If the string is not a file URI or already a data URI, add the prefix
      if (
        typeof previewUri === 'string' &&
        !previewUri.startsWith('file://') &&
        !previewUri.startsWith('data:image/jpeg;base64,')
      ) {
        previewUri = 'data:image/jpeg;base64,' + previewUri;
      }
      setImage(previewUri);
    }
  }, [modalVisible, modalImageUri]);

  const incrementScanCount = useCallback(async () => {
    if (!isFirstDayUnlimited && !isSubscribed) {
      const newCount = scanCount + 1;
      setScanCount(newCount);
      await AsyncStorage.setItem('dailyScanCount', newCount.toString());
    }
  }, [isFirstDayUnlimited, isSubscribed, scanCount]);

  const resizeImage = async (uri) => {
    let compressQuality = 1;
    const actions = [{ resize: { width: 1024 } }]; // Resize the image to 1024px width while preserving aspect ratio.
    let result;
    while (true) {
      result = await manipulateAsync(uri, actions, { compress: compressQuality, format: SaveFormat.JPEG, base64: true });

      // Calculate the approximate size in bytes.
      const base64Str = result.base64;
      const sizeBytes = Math.ceil(base64Str.length * 3 / 4);
      console.log("Compression quality:", compressQuality, "Size bytes:", sizeBytes);

      // If image size is within limit (<= 5MB) or quality is too low, then break.
      if (sizeBytes <= 5000000 || compressQuality <= 0.1) {
        break;
      }

      // Lower the compression quality for next iteration.
      compressQuality = compressQuality - 0.1;
    }
    return result.base64;
  };

  const handleScroll = (event) => {
    if (!foodData) return;  // Don't handle scroll if there's no food data
  
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
  
    const shouldShowIndicator = offsetY + scrollViewHeight < contentHeight - 150;
  
    if (shouldShowIndicator !== showScrollIndicator) {
      setShowScrollIndicator(shouldShowIndicator);
      Animated.timing(scrollIndicatorOpacity, {
        toValue: shouldShowIndicator ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleContentSizeChange = (contentWidth, contentHeight) => {
    if (!scrollViewRef.current || !foodData) return;
  
    scrollViewRef.current.measure((x, y, width, height, pageX, pageY) => {
      const offsetY = 0;
      const scrollViewHeight = height;
  
      const shouldShowIndicator = offsetY + scrollViewHeight < contentHeight - 20;
  
      if (shouldShowIndicator !== showScrollIndicator) {
        setShowScrollIndicator(shouldShowIndicator);
        Animated.timing(scrollIndicatorOpacity, {
          toValue: shouldShowIndicator ? 1 : 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    });
  };

  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      // Try scrollToEnd method first
      scrollViewRef.current.scrollToEnd({ animated: true });
      
      // Additional attempt for reliability - get content height and scroll there
      scrollViewRef.current.getScrollResponder()?.scrollResponderScrollToEnd({ animated: true });
    }
  };

  const scrollToTop = () => {
    if (scrollViewRef.current) {
      // First try scrollTo method
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
      
      // Also try setNativeProps as a fallback for more reliability
      try {
        scrollViewRef.current.setNativeProps({ contentOffset: { y: 0, x: 0 } });
      } catch (error) {
        console.log('Error using setNativeProps:', error);
      }
    }
  };

  const storeProductDetails = async (productDetails) => {
    try {
      const existingHistoryJson = await AsyncStorage.getItem('@product_history');
      let existingHistory = existingHistoryJson ? JSON.parse(existingHistoryJson) : [];
      if (!Array.isArray(existingHistory)) {
        existingHistory = [];
      }

      const productDetailsWithDate = {
        ...productDetails,
        date: productDetails.date || new Date().toISOString(),
        scanMetadata: {
          scanMode: selectedMode,
          usedBarcode: productDetails.hadBarcode,  // Use the passed value instead of state
          processingTime: ((Date.now() - startTimeRef.current) / 1000).toFixed(1),
          modelUsed: productDetails.modelUsed || selectedModel,
          usedCircleScan: productDetails.hasDrawing === true // Only true if drawing occurred
        }
      };
      
      // Add web search sources if available (for search mode)
      if (selectedMode === SEARCH_MODE && productDetails.nutrients && 
          productDetails.nutrients.details && 
          productDetails.nutrients.details.sources) {
        productDetailsWithDate.sources = productDetails.nutrients.details.sources;
        productDetailsWithDate.isWebSearch = true;
      }
      
      // Removed logging of product details to avoid logging sensitive base64 data:
      // console.log('Storing product details:', JSON.stringify(productDetailsWithDate, null, 2));
      
      existingHistory.push(productDetailsWithDate);
      const newHistoryJson = JSON.stringify(existingHistory);
      await AsyncStorage.setItem('@product_history', newHistoryJson);
    } catch (e) {
      console.error("Error storing product details: ", e);
    }
  };

  const pickImage = async () => {
    // Check scan limits before allowing image picking
    if (!isFirstDayUnlimited && !isSubscribed) {
      if (selectedMode === ACCURATE_MODE && freeAccurateScansUsed >= 1) {
        console.log('[Paywall] Accurate scan limit reached, showing no-scans-fortune');
        Superwall.shared.register('no-scans-fortune');
        return;
      }
      if (selectedMode === SEARCH_MODE && !(await checkSearchScanLimit())) {
        // checkSearchScanLimit already shows paywall if needed
        console.log('[FoodScanScreen] Search scan limit reached on pickImage.');
        return;
      }
      if (isSubscribedPlus && scanCount >= 20) {
        console.log('[Paywall] Plus scan limit reached, showing no-scans-fortune');
        Superwall.shared.register('no-scans-fortune');
        return;
      }
      if (!isSubscribed && !isSubscribedPlus && scanCount >= 5) {
        console.log('[Paywall] Free scan limit reached, showing no-scans-fortune');
        Superwall.shared.register('no-scans-fortune');
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled) {
        const selectedUri = result.assets[0].uri;
        
        if (foodSelectionEnabled) {
          setSelectedImage(selectedUri);
          setShowFoodSelectionModal(true);
        } else {
          const resizedImage = await resizeImage(selectedUri);
          await sendImageToApi(resizedImage);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  const takePhoto = async () => {
    // If tooltip is showing, hide it with animation
    if (showScanButtonTooltip && scanButtonTooltipRef.current) {
      scanButtonTooltipRef.current.hideTooltipWithAnimation();
      // Wait for animation before proceeding
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    if (isFirstDayUnlimited || isSubscribed) {
      navigation.navigate('CameraScreen');
    } else if ((isSubscribedPlus && scanCount < 20) || (!isSubscribed && scanCount < 5)) {
      // Check accurate scan limit specifically if accurate mode is selected
      if (selectedMode === ACCURATE_MODE && freeAccurateScansUsed >= 1) {
        console.log('[FoodScanScreen] Accurate scan limit reached, showing paywall.');
        Superwall.shared.register('no-scans-fortune'); // Trigger paywall
        return; // Stop execution
      }
      // Check general scan limit for Free users (this also covers fast mode implicitly)
      if (!isSubscribed && !isSubscribedPlus && scanCount >= 5) {
        console.log('[FoodScanScreen] Free scan limit reached, showing paywall.');
        Superwall.shared.register('no-scans-fortune'); // Trigger paywall
        return; // Stop execution
      }

      // If no limits are hit, proceed
      navigation.navigate('CameraScreen');
    } else {
      // This else block should now catch cases where limits are explicitly hit
      // (e.g., freeAccurateScansUsed >= 1, scanCount >= 20 for Plus, scanCount >= 2 for Free)
      console.log('[FoodScanScreen] General scan limit reached, showing paywall.');
      Superwall.shared.register('no-scans-fortune'); // Trigger paywall
    }
  };

  const sendImageToApiWithHint = async (userHint) => {
    setIsLoading(true);
    startLoadingAnimation();
    setProcessingImage(modalImageUri);

    try {
      const apiKey = await AsyncStorage.getItem('@apikey');

      if (!apiKey) {
        console.error("API key not found");
        Alert.alert('Error', 'API key not found');
        setIsLoading(false);
        return;
      }

      const anthropic = new Anthropic({ apiKey });

      const base64Image = await resizeImage(modalImageUri);

      // Define your system prompts here
      const systemPrompt = `...`; // Truncated for brevity

      // Implement your API call logic here
      // After receiving and parsing the response:
      const parsedData = parseNutrientData(apiResponse);
      setFoodData(parsedData);
      setNoFoodFound(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fadeOutTab('Nutrition');

      // Directly store the product details
      await storeProductDetails({
        productName: parsedData.name,
        imageUri: modalImageUri,
        nutrients: parsedData,
        date: new Date().toISOString(),
      });

      setApiSuccess(true);
      setModalVisible(false);
      setProcessingImage(null);
    } catch (error) {
      console.error("Error sending message to Anthropic API:", error);
      Alert.alert("High Demand", `We're experiencing extremely high demand, try again in 1 minute.`);
      setIsLoading(false);
      stopLoadingAnimation();
      setProcessingImage(null);
      setModalVisible(false);
    }
  };

  // Remove the useOpenAI constant at the top and replace with:
  const [currentProvider, setCurrentProvider] = useState('anthropic');

  const sendImageToApi = async (imageUri, barcodeData = null, hasDrawing = false) => {
    if (isProcessingRef.current) {
      console.log('Already processing an image, ignoring new request');
      return;
    }

    try {
      isProcessingRef.current = true;
      
      const provider = await AsyncStorage.getItem('@selected_provider') || 'anthropic';
      setSelectedProvider(provider);
      
      console.log('Debug - Provider before getModel:', provider);
      console.log('Debug - Selected mode before getModel:', selectedMode);
      console.log('Debug - Has drawing before getModel:', hasDrawing);
      
      const currentModel = getModel(provider, { 
        selectedMode: selectedMode,
        selectedModel: selectedModel,
        hasDrawing: hasDrawing 
      });
      
      console.log('Debug - Model after getModel:', currentModel);
      
      setSelectedModel(currentModel);

      // Check if we're in search mode and need to check the scan limit
      if (selectedMode === SEARCH_MODE) {
        // Check if user has reached search scan limit
        const canProceed = await checkSearchScanLimit();
        if (!canProceed) {
          // User has reached their limit
          setIsLoading(false);
          isProcessingRef.current = false;
          return;
        }
        
        // Increment search scan count now that we're proceeding
        await incrementSearchScanCount();
      }

      setIsLoading(true);
      setNoFoodFound(false);
      
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

      setHadBarcode(!!barcodeData);

      const mode = selectedMode;

      if (mode === 'dynamic') {
        Alert.alert(
          "Feature Not Implemented",
          "Dynamic processing is an alpha feature and is not implemented yet."
        );
        setIsLoading(false);
        stopLoadingAnimation();
        setProcessingImage(null);
        return;
      }
    
      startLoadingAnimation();
      console.log('Mode:', mode, 'Has drawing:', hasDrawing);
      setProcessingImage(imageUri);
    
      scheduleLoadingTexts();
      startTimeRef.current = Date.now();
      
      // Start the scan timer for search mode
      if (mode === SEARCH_MODE) {
        startScanTimer();
      }
    
      let foodFound = false;

      // Use API key from context
      const apiKey = apiKeys?.[provider + 'ApiKey'];
        
      if (!apiKey) {
        console.error(`API key not found for ${provider}. The developer doesn't know how this happened. Please contact support in the settings menu.`);
        Alert.alert('ERROR', `Cloud functions are not active. The developer doesn't know how this happened. Please contact support in the settings menu.`);
        setIsLoading(false);
        stopLoadingAnimation();
        setProcessingImage(null);
        isProcessingRef.current = false;
        return;
      }
        
      const providerParams = {
        selectedModel: currentModel,
        selectedMode: mode,
        base64Image,
        barcodeData,
        hasDrawing,
        apiKey,
        handleSuccessfulScan,
        handleError,
        imageUri,
        startTimeRef,
        updateAverageProcessingTime,
        isFirstDayUnlimited,
        isSubscribed,
        setNoFoodFound,
        setFoodData,
        setActiveTab,
      };

      // Call the appropriate provider
      switch (provider) {
        case 'openai':
          foodFound = await handleOpenAIScan(providerParams);
          break;
        case 'gemini':
          foodFound = await handleGeminiScan(providerParams);
          break;
        case 'anthropic':
        default:
          if (selectedMode === SEARCH_MODE) {
            // Use web search mode with handleWebSearch for any provider
            foodFound = await handleWebSearch({
              ...providerParams,
              // Add callbacks to update visualization component
              onSearchQueryUpdate: (queries) => {
                setSearchQueries(queries);
                if (visualizationRef.current?.updateWithSearchQueries) {
                  visualizationRef.current.updateWithSearchQueries(queries);
                }
              },
              onSearchResultUpdate: (results) => {
                setSearchResults(results);
                if (visualizationRef.current?.updateWithSearchResults) {
                  visualizationRef.current.updateWithSearchResults(results);
                }
              },
              onFoodItemDetected: (items) => {
                setDetectedFoodItems(items);
                if (visualizationRef.current?.updateWithFoodItems) {
                  visualizationRef.current.updateWithFoodItems(items);
                }
              },
              onProcessingStepUpdate: (step) => {
                setProcessingSteps(prev => [...prev, step]);
              },
              onBrandDetected: (brand) => {
                setDetectedBrand(brand);
              }
            });
          } else {
            foodFound = await handleAnthropicScan(providerParams);
          }
          break;
      }

      setIsLoading(false);
      stopLoadingAnimation();
      setProcessingImage(null);

      // Only increment scan count if food was found
      if (foodFound) {
        await incrementScanCount();
      }

      fadeOutTitle(() => {
        fadeInTitle();
      });

      setShowPlaceholder(false);

      Animated.timing(fadeAnimImage, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setImage(imageUri);
        Animated.timing(fadeAnimImage, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      });
    } catch (error) {
      handleError(error, imageUri, barcodeData);
    } finally {
      isProcessingRef.current = false;
    }
  };
  
  const imageToBase64 = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting image to base64:", error);
      throw error;
    }
  };  

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

  const fadeOutTab = (newTab) => {
    Animated.timing(tabFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Set the active tab first
      setActiveTab(newTab);
      
      // Small delay to ensure refs are ready and content is fully unmounted
      setTimeout(() => {
        // Reset scroll position for all tabs after content has faded out
        if (nutritionScrollViewRef.current) {
          nutritionScrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
        }
        if (ingredientsScrollViewRef.current) {
          ingredientsScrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
        }
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
        }
        
        // Now fade in the new tab content
        fadeInTab();
      }, 50);
    });
  };

  const fadeInTab = () => {
    Animated.timing(tabFadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  };

  // Update the handleTabPress function
  const handleTabPress = (tab) => {
    if (!isTabsDisabled) {
      // Configure layout animation
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      
      // Fade out current tab content
      fadeOutTab(tab);
      
      // Scroll to the top when changing tabs with a slight delay to ensure tab content is ready
      setTimeout(() => {
        scrollToTop();
      }, 50);
      
      // Animate the tab indicator
      const tabIndex = ['Nutrition', 'Ingredients', 'Details'].indexOf(tab);
      Animated.parallel([
        Animated.spring(tabIndicatorAnim, {
          toValue: tabIndex,
          useNativeDriver: true,
          friction: 24,
          tension: 180,
          velocity: 10
        }),
        Animated.spring(tabWidthAnim, {
          toValue: tabLayout.width,
          useNativeDriver: true,
          friction: 24,
          tension: 180,
          velocity: 10
        })
      ]).start();
    }
  };
  
  const processLoadingQueue = () => {
    if (!isAnimationRunningRef.current) return;
  
    console.log('processLoadingQueue called');
  
    const mode = selectedMode;
    const averageTime = averageProcessingTimes[mode] || 5000; // Default average time
  
    // If the queue is empty, reset to the initial loading texts based on mode
    if (loadingTextQueueRef.current.length === 0) {
      const initialTexts = getLoadingTextsByMode(mode);
      loadingTextQueueRef.current = initialTexts;
    }};
  
  useEffect(() => {
    // console.log('currentLoadingText updated:', currentLoadingText);
  }, [currentLoadingText]);

  const handleCorrectPress = () => {
    fadeOutFeedback();
  };

  const handleIncorrectPress = () => {
    setInputModalVisible(true);
    fadeOutFeedback();
    removeLatestHistoryEntry();
  };

  const submitUserInput = async () => {
    setInputModalVisible(false);
    if (userInput.trim()) {
      await sendImageToApiWithHint(userInput.trim());
    }
    setUserInput('');
  };

  const removeLatestHistoryEntry = async () => {
    try {
      const existingHistoryJson = await AsyncStorage.getItem('@product_history');
      let existingHistory = existingHistoryJson ? JSON.parse(existingHistoryJson) : [];
      if (existingHistory.length > 0) {
        existingHistory.pop();
        await AsyncStorage.setItem('@product_history', JSON.stringify(existingHistory));
        setHistory(existingHistory);
        console.log("Latest history entry removed.");
      } else {
        console.log("No history to remove.");
      }
    } catch (e) {
      console.error("Error removing latest history entry: ", e);
    }
  };

  const fadeOutFeedback = () => {
    Animated.timing(fadeAnimFeedback, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const fadeInFeedback = () => {
    Animated.timing(fadeAnimFeedback, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const renderTooltip = () => (
    <Animated.View style={[styles.tooltip, { opacity: tooltipFadeAnim }]}>
      <Text style={styles.tooltipText}>Click other tabs to explore more details!</Text>
    </Animated.View>
  );

  // Move animation values to component level
  const nutrientFadeAnim = useRef(new Animated.Value(0)).current;
  const nutrientScaleAnim = useRef(new Animated.Value(0.9)).current;
  const nutrientProgressAnim = useRef(new Animated.Value(0)).current;
  const hasAnimatedRef = useRef(false); // Add this to track if we've animated for current data

  // Add new animated values for each card
  const cardAnimations = useRef([
    new Animated.Value(0), // calories
    new Animated.Value(0), // proteins
    new Animated.Value(0), // carbs
    new Animated.Value(0), // fats
    new Animated.Value(0), // fiber
    new Animated.Value(0)  // sodium
  ]).current;

  // Function to trigger macro card animations
  const triggerMacroAnimations = () => {
    // Reset animations first
    cardAnimations.forEach(anim => anim.setValue(0));
    nutrientProgressAnim.setValue(0);

    // Animate cards appearing with stagger
    Animated.stagger(100, 
      cardAnimations.map(anim =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true
        })
      )
    ).start();

    // Animate progress bars
    Animated.timing(nutrientProgressAnim, {
      toValue: 1,
      duration: 800,
      delay: 200,
      useNativeDriver: false,
    }).start();

    hasAnimatedRef.current = true;
  };

  // Add effect to handle nutrient animations
  useEffect(() => {
    if (foodData) {
      // Trigger animations for the active tab
      triggerMacroAnimations();
    } else {
      // Reset animations when data is cleared
      cardAnimations.forEach(anim => anim.setValue(0));
      nutrientProgressAnim.setValue(0);
      hasAnimatedRef.current = false;
    }
  }, [foodData, activeTab]); // Depend on both foodData and activeTab changes

  // Add effect to handle tab changes
  useEffect(() => {
    if (foodData && !hasAnimatedRef.current) {
      triggerMacroAnimations();
    }
  }, [activeTab]);

  const macroColors = {
    Calories: '#FF4500',  // Orange-red
    Proteins: '#3CB371',  // Medium sea green
    Carbohydrates: '#FFA500',  // Orange
    Fats: '#6495ED',  // Cornflower blue
    Fiber: '#9370DB',  // Medium purple
    Sodium: '#20B2AA',  // Light sea green
  };

  const macroIcons = {
    Calories: 'flame',
    Proteins: 'barbell-outline',
    Carbohydrates: 'leaf-outline',
    Fats: 'water-outline',  // Fixed key name to match the data
    Fiber: 'nutrition-outline',
    Sodium: 'medical-outline'  // Changed to a valid icon name
  };

  const renderSeparator = () => <View style={styles.separator} />;

  // Add state for pagination
  const [activePage, setActivePage] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const lastKnownPage = useRef(0); // Add this to store the last known page position

  // Add this ref near other ref declarations
  const nutritionScrollViewRef = useRef(null);
  const ingredientsScrollViewRef = useRef(null); // Add new ref for ingredients tab

  // Update the useEffect handling tab changes
  useEffect(() => {
    if (activeTab === 'Nutrition' && foodData) {
      if (!hasAnimatedRef.current) {
        triggerMacroAnimations();
      }
      // Restore the last known page position
      setActivePage(lastKnownPage.current);
      // Scroll to stored position after render
      setTimeout(() => {
        if (nutritionScrollViewRef.current) {
          nutritionScrollViewRef.current.scrollTo({
            x: lastKnownPage.current * width,
            animated: false
          });
        }
      }, 0);
    } else if (activeTab !== 'Nutrition' && foodData) {
      // Store current page when leaving
      lastKnownPage.current = activePage;
    }
  }, [activeTab, foodData]);

  const renderNutritionTab = () => {
    if (!foodData) return null;
    
    // Filter out non-nutrient keys and split into two pages
    const nutrients = Object.entries(foodData).filter(([key, data]) => {
      return data && !['name', 'class', 'type', 'details', 'ingredients'].includes(key);
    });

    const firstHalf = nutrients.slice(0, 3);
    const secondHalf = nutrients.slice(3);
    const pages = [firstHalf, secondHalf];

    const renderPage = (items) => (
      <View style={styles.macroGridContainer}>
        {items.map(([key, data], index) => {
          const label = key.charAt(0).toUpperCase() + key.slice(1);
          if (!macroColors[label] || !macroIcons[label]) {
            return null;
          }

          // Calculate a darker version of the color
          const baseColor = macroColors[label];
          const darkerColor = baseColor + '80'; // Adding 80 for 50% opacity creates a darker shade

          return (
            <Animated.View 
              key={key} 
              style={[
                styles.macroCard,
                {
                  opacity: cardAnimations[index],
                  transform: [
                    {
                      scale: cardAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                    {
                      translateY: cardAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.macroHeaderContainer}>
                <View style={styles.iconLabelContainer}>
                  <View style={[styles.iconContainer]}>
                    <LinearGradient
                      colors={[baseColor, darkerColor]}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <Icon name={macroIcons[label]} size={20} color="#FFF" />
                  </View>
                  <Text style={styles.macroLabel}>{label}</Text>
                </View>
                
                <View style={styles.macroValueContainer}>
                  <Text style={styles.macroValue}>
                    {data.amount}
                    <Text style={styles.macroUnit}>
                      {label === 'Calories' ? ' kcal' : label === 'Sodium' ? ' mg' : 'g'}
                    </Text>
                  </Text>
                </View>
              </View>

              <View style={styles.errorBarContainer}>
                <View style={[styles.errorBar, { backgroundColor: macroColors[label] + '40' }]}>
                  <Animated.View 
                    style={[
                      styles.errorBarFill,
                      { 
                        backgroundColor: macroColors[label],
                        width: nutrientProgressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', `${100 - (data.marginOfErrorPercent || 0)}%`],
                        }),
                      }
                    ]} 
                  />
                </View>
                <Animated.Text 
                  style={[
                    styles.errorText,
                    {
                      opacity: cardAnimations[index],
                    }
                  ]}
                >
                  ±{data.marginOfErrorPercent || 0}%
                </Animated.Text>
              </View>
            </Animated.View>
          );
        })}
      </View>
    );

    return (
      <View style={styles.tabContentContainer}>
        <ScrollView 
          horizontal 
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(event) => {
            const offsetX = event.nativeEvent.contentOffset.x;
            scrollX.setValue(offsetX);
          }}
          onMomentumScrollEnd={(event) => {
            const offsetX = event.nativeEvent.contentOffset.x;
            const page = Math.round(offsetX / width);
            setActivePage(page);
            // Animate to exact position
            Animated.spring(scrollX, {
              toValue: page * width,
              useNativeDriver: false,
              tension: 50,
              friction: 7
            }).start();
          }}
          scrollEventThrottle={16}
          ref={nutritionScrollViewRef}
          key={`nutrition-scrollview-${activeTab}`}
        >
          {pages.map((items, index) => (
            <View key={index} style={styles.nutrientPage}>
              {renderPage(items)}
            </View>
          ))}
        </ScrollView>

        <View style={styles.paginationDots}>
          {pages.map((_, index) => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 16, 8],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.5, 1, 0.5],
              extrapolate: 'clamp',
            });

            const backgroundColor = scrollX.interpolate({
              inputRange,
              outputRange: [
                colorScheme === 'dark' ? '#444' : '#ccc',
                colorScheme === 'dark' ? '#fff' : '#000',
                colorScheme === 'dark' ? '#444' : '#ccc',
              ],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.paginationDot,
                  {
                    width: dotWidth,
                    opacity,
                    backgroundColor,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const renderIngredientsTab = () => {
    // Check if we have any ingredients to display
    const hasIngredients = foodData?.ingredients && foodData.ingredients.length > 0;

    // If no ingredients, show empty state
    if (!hasIngredients) {
      return (
        <View style={styles.tabContentContainer}>
          <Text style={styles.noDataText}>No ingredient information available</Text>
        </View>
      );
    }

    // Group ingredients into smaller chunks for better visual organization (e.g., 3-4 per card)
    const ingredientGroups = [];
    const groupSize = 3; // Number of ingredients per card
    
    for (let i = 0; i < foodData.ingredients.length; i += groupSize) {
      ingredientGroups.push(foodData.ingredients.slice(i, i + groupSize));
    }

    return (
      <View style={styles.tabContentContainer}>
        <ScrollView 
          showsVerticalScrollIndicator={true} 
          style={{flex: 1}} 
          contentContainerStyle={{paddingBottom: activeTab === 'Nutrition' ? 16 * scale : 0}}
          ref={ingredientsScrollViewRef}
          key={`ingredients-scrollview-${activeTab}`}
        >
          <View style={styles.macroGridContainer}>
            {/* Note Card - Instructions */}
            <Animated.View 
              style={[
                styles.macroCard, 
                { height: 'auto', minHeight: 60 * scale, marginBottom: 8 * scale },
                {
                  opacity: cardAnimations[0],
                  transform: [
                    {
                      scale: cardAnimations[0].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                    {
                      translateY: cardAnimations[0].interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                }
              ]}
              entering={FadeInDown.delay(100).springify()}
            >
              <View style={styles.macroHeaderContainer}>
                <View style={styles.iconLabelContainer}>
                  <View style={[styles.iconContainer]}>
                    <LinearGradient
                      colors={['#3182CE', '#2B6CB0']}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <Icon name="information-circle-outline" size={20} color="#FFF" />
                  </View>
                  <Text style={styles.macroLabel}>Ingredients</Text>
                </View>
              </View>

              <Text style={styles.ingredientInstructions}>
                Click on ingredient names to learn more about them
              </Text>
            </Animated.View>

            {/* Ingredient Cards */}
            {ingredientGroups.map((group, groupIndex) => (
              <Animated.View 
                key={`group-${groupIndex}`}
                style={[
                  styles.macroCard, 
                  { height: 'auto' },
                  {
                    opacity: cardAnimations[groupIndex + 1 > cardAnimations.length - 1 ? cardAnimations.length - 1 : groupIndex + 1],
                    transform: [
                      {
                        scale: cardAnimations[groupIndex + 1 > cardAnimations.length - 1 ? cardAnimations.length - 1 : groupIndex + 1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                      {
                        translateY: cardAnimations[groupIndex + 1 > cardAnimations.length - 1 ? cardAnimations.length - 1 : groupIndex + 1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        }),
                      },
                    ],
                  }
                ]}
                entering={FadeInDown.delay(200 + (groupIndex * 100)).springify()}
              >
                {group.map((ingredient, index) => (
                  <React.Fragment key={`ingredient-${index}`}>
                    <View style={styles.ingredientContainer}>
                      <TouchableOpacity 
                        style={styles.ingredientNameContainer}
                        onPress={() => ingredient.wikipediaLink ? Linking.openURL(ingredient.wikipediaLink) : null}
                      >
                        <Text style={styles.ingredientName}>{ingredient.name || "Unknown ingredient"}</Text>
                        {ingredient.wikipediaLink && (
                          <Icon name="open-outline" size={14} color={colorScheme === 'dark' ? '#BBBBBB' : '#666666'} />
                        )}
                      </TouchableOpacity>
                      <Text style={styles.ingredientDescription}>{ingredient.description || ""}</Text>
                    </View>
                    {index < group.length - 1 && <View style={styles.ingredientDivider} />}
                  </React.Fragment>
                ))}
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderDetailsTab = () => {
    console.log('renderDetailsTab - foodData:', JSON.stringify(foodData, null, 2));
    console.log('renderDetailsTab - selectedMode:', selectedMode);
    
    // Determine if this is a search mode scan
    const isSearchMode = selectedMode === SEARCH_MODE || (foodData && foodData._scanType === 'search');
    console.log('renderDetailsTab - isSearchMode:', isSearchMode);
    
    // Get the summary text from various possible sources based on scan type
    let summaryText = '';
    let hasDetails = false;

    if (isSearchMode) {
      // For search mode scans
      summaryText = foodData?.details?.summaryText || 
                   foodData?.details?.summary || 
                   (foodData?.name ? `Nutritional information for ${foodData.name}.` : '');
      
      hasDetails = foodData?.details && (
        foodData.details.summaryText ||
        foodData.details.summary ||
        foodData.details.sources?.length > 0
      );
      console.log('renderDetailsTab - search mode details:', {
        summaryText,
        hasDetails,
        sources: foodData?.details?.sources
      });
    } else {
      // For regular scans (accurate/fast mode)
      summaryText = foodData?.details?.summary || 
                   (foodData?.name ? `Nutritional information for ${foodData.name}. ` +
                    `This ${foodData.type || 'food'} contains ${foodData.calories?.amount || '0'} calories per serving.` : '');
      
      hasDetails = foodData?.details && (
        foodData.details.summary ||
        foodData.details.servingSize ||
        foodData.details.prepTime ||
        foodData.details.preparation?.steps?.length > 0 ||
        foodData.details.wikipediaLink
      );

      // If we have food data but no explicit details, consider that as having details
      if (!hasDetails && foodData) {
        hasDetails = true;
      }
      console.log('renderDetailsTab - regular mode details:', {
        summaryText,
        hasDetails,
        details: foodData?.details
      });
    }

    const hasSummary = !!summaryText;
    console.log('renderDetailsTab - final state:', {
      hasSummary,
      hasDetails,
      summaryText
    });

    // If no details and no summary, show empty state
    if (!hasDetails && !hasSummary) {
      console.log('renderDetailsTab - showing empty state');
      return (
        <View style={styles.tabContentContainer}>
          <Text style={styles.noDataText}>No detailed information available for this food.</Text>
        </View>
      );
    }

    // If we have details, render organized content
    console.log('renderDetailsTab - rendering content');
    return (
      <View style={styles.tabContentContainer}>
        <ScrollView 
          showsVerticalScrollIndicator={true} 
          style={{flex: 1}} 
          contentContainerStyle={{paddingBottom: activeTab === 'Nutrition' ? 16 * scale : 0}}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={handleContentSizeChange}
          ref={scrollViewRef}
          key={`details-scrollview-${activeTab}`}
        >
          <View style={styles.macroGridContainer}>
            {/* About Card */}
            {hasSummary && (
              <Animated.View 
                style={[
                  styles.macroCard, 
                  { height: 'auto', minHeight: 100 * scale, marginBottom: 6 * scale },
                  {
                    opacity: cardAnimations[0],
                    transform: [
                      {
                        scale: cardAnimations[0].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                      {
                        translateY: cardAnimations[0].interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        }),
                      },
                    ],
                  }
                ]}
                entering={FadeInDown.delay(100).springify()}
              >
                <TouchableOpacity 
                  style={styles.macroHeaderContainer}
                  onPress={scrollToTop}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconLabelContainer}>
                    <View style={[styles.iconContainer]}>
                      <LinearGradient
                        colors={['#5A67D8', '#4C51BF']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      <Icon name="information-circle-outline" size={20} color="#FFF" />
                    </View>
                    <Text style={styles.macroLabel}>About</Text>
                  </View>
                </TouchableOpacity>
                <Text style={styles.summaryText}>
                  {summaryText}
                </Text>
              </Animated.View>
            )}

            {/* Quick Facts Card - Only show for regular scans */}
            {!isSearchMode && (
              // Check both object formats for the data
              foodData?.details?.prepTime || 
              (foodData?.details?.servingSize && typeof foodData.details.servingSize === 'string') || 
              (foodData?.servingSize?.amount) ||
              // Additional check for nested food.details structure
              (foodData?.food?.details?.prepTime) ||
              (foodData?.food?.details?.servingSize && typeof foodData.food.details.servingSize === 'string')
            ) && (
              <Animated.View 
                style={[
                  styles.macroCard, 
                  { height: 'auto', minHeight: 100 * scale, marginBottom: 6 * scale },
                  {
                    opacity: cardAnimations[1],
                    transform: [
                      {
                        scale: cardAnimations[1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                      {
                        translateY: cardAnimations[1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        }),
                      },
                    ],
                  }
                ]}
                entering={FadeInDown.delay(200).springify()}
              >
                <TouchableOpacity 
                  style={styles.macroHeaderContainer}
                  onPress={scrollToTop}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconLabelContainer}>
                    <View style={[styles.iconContainer]}>
                      <LinearGradient
                        colors={['#ED8936', '#DD6B20']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      <Icon name="stats-chart" size={20} color="#FFF" />
                    </View>
                    <Text style={styles.macroLabel}>Quick Facts</Text>
                  </View>
                </TouchableOpacity>

                {/* Facts Content */}
                <View style={styles.factsContainer}>
                  {/* Get prepTime from foodData.details or foodData.food.details */}
                  {(foodData?.details?.prepTime || foodData?.food?.details?.prepTime) && (
                    <View style={styles.factRow}>
                      <Text style={styles.factLabel}>Prep Time</Text>
                      <Text style={styles.factValue}>{foodData?.details?.prepTime || foodData?.food?.details?.prepTime}</Text>
                    </View>
                  )}
                  
                  {/* Get servingSize string from foodData.details or foodData.food.details */}
                  {((foodData?.details?.servingSize && typeof foodData.details.servingSize === 'string') || 
                   (foodData?.food?.details?.servingSize && typeof foodData.food.details.servingSize === 'string')) && (
                    <View style={styles.factRow}>
                      <Text style={styles.factLabel}>Serving Size</Text>
                      <Text style={styles.factValue} numberOfLines={3}>
                        {foodData?.details?.servingSize || foodData?.food?.details?.servingSize}
                      </Text>
                    </View>
                  )}

                  {/* Add fallback for servingSize in food object */}
                  {!foodData?.details?.servingSize && !foodData?.food?.details?.servingSize && foodData?.servingSize?.amount && (
                    <View style={styles.factRow}>
                      <Text style={styles.factLabel}>Serving Size</Text>
                      <Text style={styles.factValue} numberOfLines={3}>
                        {foodData.servingSize.amount} {foodData.servingSize.unit || ''}
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            )}
            
            {/* Preparation Steps Card - Only show for regular scans */}
            {!isSearchMode && foodData?.details?.preparation?.steps?.length > 0 && (
              <Animated.View 
                style={[
                  styles.macroCard, 
                  { height: 'auto', marginBottom: 6 * scale },
                  {
                    opacity: cardAnimations[2],
                    transform: [
                      {
                        scale: cardAnimations[2].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                      {
                        translateY: cardAnimations[2].interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        }),
                      },
                    ],
                  }
                ]}
                entering={FadeInDown.delay(300).springify()}
              >
                <TouchableOpacity 
                  style={styles.macroHeaderContainer}
                  onPress={scrollToTop}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconLabelContainer}>
                    <View style={[styles.iconContainer]}>
                      <LinearGradient
                        colors={['#38B2AC', '#319795']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      <Icon name="list-outline" size={20} color="#FFF" />
                    </View>
                    <Text style={styles.macroLabel}>Preparation</Text>
                  </View>
                </TouchableOpacity>

                {/* Preparation Steps */}
                <View style={styles.stepsContainer}>
                  {foodData.details.preparation.steps.map((step, index) => (
                    <View key={index} style={styles.stepRow}>
                      <Text style={styles.stepNumber}>{index + 1}</Text>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}
            
            {/* Wikipedia Link Card - Only show for regular scans */}
            {!isSearchMode && (foodData?.details?.wikipediaLink || foodData?.food?.details?.wikipediaLink) && (
              <Animated.View 
                style={[
                  styles.macroCard, 
                  { height: 'auto', padding: 0, marginBottom: 6 * scale },
                  {
                    opacity: cardAnimations[3],
                    transform: [
                      {
                        scale: cardAnimations[3].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                      {
                        translateY: cardAnimations[3].interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        }),
                      },
                    ],
                  }
                ]}
                entering={FadeInDown.delay(400).springify()}
              >
                <TouchableOpacity 
                  style={[styles.linkRow, { paddingVertical: 16 * scale, paddingHorizontal: 16 * scale }]}
                  onPress={() => {
                    const link = foodData?.details?.wikipediaLink || foodData?.food?.details?.wikipediaLink;
                    console.log("Opening link:", link);
                    Linking.openURL(link);
                  }}
                >
                  <View style={[styles.iconContainer, {marginRight: 12 * scale}]}>
                    <LinearGradient
                      colors={['#805AD5', '#6B46C1']}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <Icon name="globe-outline" size={20} color="#FFF" />
                  </View>
                  <Text style={styles.linkText}>Learn more on Wikipedia</Text>
                  <Icon name="chevron-forward" size={16} color={colorScheme === 'dark' ? '#BBBBBB' : '#666666'} />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Sources Card - Only show for search mode */}
            {isSearchMode && foodData?.details?.sources && foodData.details.sources.length > 0 && (
              <Animated.View 
                style={[
                  styles.macroCard, 
                  { height: 'auto', minHeight: 100 * scale, marginBottom: 6 * scale },
                  {
                    opacity: cardAnimations[4],
                    transform: [
                      {
                        scale: cardAnimations[4].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                      {
                        translateY: cardAnimations[4].interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        }),
                      },
                    ],
                  }
                ]}
                entering={FadeInDown.delay(500).springify()}
              >
                <TouchableOpacity 
                  style={styles.macroHeaderContainer}
                  onPress={scrollToTop}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconLabelContainer}>
                    <View style={[styles.iconContainer]}>
                      <LinearGradient
                        colors={['#9F7AEA', '#805AD5']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      <Icon name="document-text-outline" size={20} color="#FFF" />
                    </View>
                    <Text style={styles.macroLabel}>Sources</Text>
                  </View>
                </TouchableOpacity>

                {/* Sources Links */}
                <View style={styles.linksContainer}>
                  {foodData.details.sources.map((source, index) => {
                    // Handle both source formats (search and regular)
                    const title = source.title || source.name || "Source";
                    const url = source.url || "";
                    const snippet = source.snippet || source.description || "";
                    
                    return (
                      <TouchableOpacity 
                        key={index}
                        style={styles.sourceItem}
                        onPress={() => url ? Linking.openURL(url) : null}
                      >
                        <Text style={styles.sourceTitle}>{title}</Text>
                        {url && <Text style={styles.sourceUrl}>{url}</Text>}
                        {snippet && (
                          <Text style={styles.sourceSnippet} numberOfLines={3}>{snippet}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  // Add these with other animation refs at component level
  const buttonPositionAnim = useRef(new Animated.Value(0)).current;
  const buttonOpacityAnim = useRef(new Animated.Value(1)).current;
  const floatingButtonOpacityAnim = useRef(new Animated.Value(0)).current;

  // Add this effect to handle button animation timing
  useEffect(() => {
    if (foodData) {
      // Wait 3 seconds before animating
      const timer = setTimeout(() => {
        Animated.parallel([
          // Fade out original buttons
          Animated.timing(buttonOpacityAnim, {
        toValue: 0,
            duration: 300,
        useNativeDriver: true,
          }),
          // Fade in floating buttons
          Animated.timing(floatingButtonOpacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      // Reset animations when food data is cleared
      buttonOpacityAnim.setValue(1);
      floatingButtonOpacityAnim.setValue(0);
    }
  }, [foodData]);

  // Update the renderButtons function
  const renderButtons = () => {
    const scaleAnimScan = useRef(new Animated.Value(1)).current;
    const scaleAnimChoose = useRef(new Animated.Value(1)).current;
    const scaleAnimManual = useRef(new Animated.Value(1)).current; // Animation for the new button

    const onPressInScan = () => {
      Animated.spring(scaleAnimScan, {
        toValue: 0.95,
        useNativeDriver: true,
        friction: 3,
      }).start();
    };

    const onPressOutScan = () => {
      Animated.spring(scaleAnimScan, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
      }).start();
    };

    const onPressInChoose = () => {
      Animated.spring(scaleAnimChoose, {
        toValue: 0.95,
        useNativeDriver: true,
        friction: 3,
      }).start();
    };

    const onPressOutChoose = () => {
      Animated.spring(scaleAnimChoose, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
      }).start();
    };

    const onPressInManual = () => {
      Animated.spring(scaleAnimManual, {
        toValue: 0.95,
        useNativeDriver: true,
        friction: 3,
      }).start();
    };

    const onPressOutManual = () => {
      Animated.spring(scaleAnimManual, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
      }).start();
    };


    return (
      <View
        style={[styles.buttonsColumnContainer]} // Use a column layout now
        onLayout={(e) => {
          buttonsYPosition.current = e.nativeEvent.layout;
          // Trigger visibility check after layout updates
          const show = contentHeight.current > scrollViewHeight.current;
          setShowScrollToButtonIndicator(show);
        }}
      >
        {/* Row for existing buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              pickImage();
            }}
            onPressIn={onPressInChoose}
            onPressOut={onPressOutChoose}
            accessibilityLabel="Pick from Gallery"
            android_ripple={{ color: 'rgba(255, 255, 255, 0.3)', borderless: false }}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnimChoose }] }}>
              <LinearGradient
                colors={['#101010', '#1b1b1d']}
                style={styles.button}
                start={[0, 0]}
                end={[1, 1]}
              >
                <View style={styles.buttonContent}>
                  <Icon name="images" size={24} color="#fff" style={styles.icon} />
                  <Text style={styles.buttonText}>Choose photo</Text>
                </View>
              </LinearGradient>
            </Animated.View>
          </Pressable>

          <Pressable
            ref={scanButtonRef}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              takePhoto();
            }}
            onPressIn={onPressInScan}
            onPressOut={onPressOutScan}
            accessibilityLabel="Take Photo Now"
            android_ripple={{ color: 'rgba(255, 255, 255, 0.3)', borderless: false }}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnimScan }] }}>
              <LinearGradient
                colors={['#101010', '#555']}
                style={styles.button}
                start={[1, 1.3]}
                end={[1, 0]}
              >
                <View style={styles.buttonContent}>
                  <Icon name="scan" size={24} color="#fff" style={styles.icon} />
                  <Text style={styles.buttonText}>Scan meal</Text>
                </View>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        </View>

        {/* Conditionally render the manual input button */}
        {!foodData && (
          <Pressable
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleManualInputPress(); // Call the new handler
            }}
            onPressIn={onPressInManual}
            onPressOut={onPressOutManual}
            accessibilityLabel="Add a food manually"
            android_ripple={{ color: 'rgba(255, 255, 255, 0.3)', borderless: false }}
            style={({ pressed }) => [
              styles.manualInputButtonContainer, // Centering style
              {
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnimManual }] }}>
              <LinearGradient
                colors={colorScheme === 'dark' ? ['#2a2a2d', '#1c1c1e'] : ['#e0e0e0', '#f0f0f0']}
                style={styles.manualInputButton}
                start={[0, 0]}
                end={[1, 1]}
              >
                <View style={styles.manualInputButtonContent}>
                  <Icon name="add-circle-outline" size={22} color={colorScheme === 'dark' ? '#fff' : '#333'} style={styles.manualInputButtonIcon} />
                  <Text style={styles.manualInputButtonText}>Add a food manually</Text>
                </View>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        )}
      </View>
    );
  };

  // Add this new function to handle text crossfade
  const crossfadeChipText = (newMode) => {
    Animated.timing(chipTextOpacity, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      LayoutAnimation.easeInEaseOut();
      setPrevMode(selectedMode);
      setSelectedMode(newMode);
      
      // Reset the hasSeenSearchInfoSheetThisSession when changing away from search mode
      // but not when switching to search mode from another mode
      if (selectedMode === 'search' && newMode !== 'search') {
        setHasSeenSearchInfoSheetThisSession(false);
      }

      Animated.timing(chipTextOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  // Add tooltipRef near other refs
  const tooltipRef = useRef(null);

  // Update the handleModeChipPress function
  const handleModeChipPress = async () => {
    // Hide tooltip when chip is pressed
    if (showModeTooltip && tooltipRef.current) {
      tooltipRef.current.hideTooltipWithAnimation();
      // Let the tooltip animation finish before showing the mode selection alert
      setTimeout(() => {
        modeSelectionAlert();
      }, 1500); // Wait for tooltip animation to complete
    } else {
      modeSelectionAlert();
    }
  };

  const modeSelectionAlert = () => {
    const currentMode = selectedMode;

    const modeDescriptions = {
      fast: 'Fast Mode provides quick results and is great for packaged foods.',
      accurate: 'Accurate Mode uses detailed analysis and is best for complex meals.',
      search: 'Deep Seach Mode is our experimental feature for advanced search capabilities.',
    };

    // Define all possible modes and their configuration
    const allModes = [
      {
        key: 'fast',
        label: MODE_LABELS['fast'],
        async onPress() {
          await AsyncStorage.setItem('selectedMode', 'fast');
          crossfadeChipText('fast');
          Haptics.selectionAsync();
        },
        condition: () => true // Always available
      },
      {
        key: 'accurate',
        label: MODE_LABELS['accurate'],
        async onPress() {
          if (isSubscribed || isFirstDayUnlimited) {
            await AsyncStorage.setItem('selectedMode', 'accurate');
            crossfadeChipText('accurate');
            Haptics.selectionAsync();
          } else {
            const freeAccurateScansUsed = await AsyncStorage.getItem('freeAccurateScansUsed');
            if (freeAccurateScansUsed === '1') {
              Alert.alert(
                'Daily Limit Reached',
                'You have already used your daily Accurate Mode scan. Please wait until tomorrow or upgrade for unlimited scans.'
              );
              return;
            }
            Alert.alert(
              'Heads Up!',
              'You only get one accurate scan a day on the free plan, so make it count!',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'OK',
                  onPress: async () => {
                    await AsyncStorage.setItem('selectedMode', 'accurate');
                    crossfadeChipText('accurate');
                    Haptics.selectionAsync();
                  },
                },
              ],
              { cancelable: false }
            );
          }
        },
        condition: () => true // Always available (limit check inside onPress)
      },
      {
        key: 'search',
        label: MODE_LABELS['search'],
        async onPress() {
          if (isSubscribed || isFirstDayUnlimited) {
            await AsyncStorage.setItem('selectedMode', 'search');
            crossfadeChipText('search');
            Haptics.selectionAsync();
          } else {
            const freeSearchScansUsed = await AsyncStorage.getItem('freeSearchScansUsed');
            if (freeSearchScansUsed === '1') {
              Alert.alert(
                'Daily Limit Reached',
                'You have already used your daily Search Mode scan. Please wait until tomorrow or upgrade for unlimited scans.'
              );
              return;
            }
            // Remove heads-up alert and directly change the mode
            await AsyncStorage.setItem('selectedMode', 'search');
            crossfadeChipText('search');
            Haptics.selectionAsync();
          }
        },
        condition: () => true // Always available (limit check inside onPress)
      }
    ];

    // Filter out the current mode and create the button options
    const alertButtons = allModes
      .filter(mode => mode.key !== currentMode && mode.condition())
      .map(mode => ({
        text: `Switch to ${mode.label}`,
        onPress: mode.onPress,
        style: 'default'
      }));

    // Add the Cancel button
    alertButtons.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
      'Switch Scan Mode', // Updated title
      `Currently using ${MODE_LABELS[currentMode]}.

${modeDescriptions[currentMode]}`,
      alertButtons
    );
  };

  // Add this state variable with the other state declarations
  const [hasScannedSinceOpen, setHasScannedSinceOpen] = useState(false);

  // Update the useFocusEffect to check for this new condition
  useFocusEffect(
    useCallback(() => {
      const checkForRatingPrompt = async () => {
        try {
          const hasPrompted = await AsyncStorage.getItem('@has_prompted_for_review');
          const accurateScans = await AsyncStorage.getItem('@accurate_scans_before_review');
          const lastScanTime = await AsyncStorage.getItem('@last_scan_time');
          
          // Only show rating prompt if:
          // 1. We haven't prompted before
          // 2. User has completed enough accurate scans
          // 3. Last scan was not just now (must be from a previous session)
          // 4. User has performed a scan since opening the app
          if (!hasPrompted && 
              accurateScans && 
              parseInt(accurateScans) >= 2 && 
              lastScanTime && 
              hasScannedSinceOpen) {
            const now = Date.now();
            const lastScan = parseInt(lastScanTime);
            // Only show if last scan was more than 1 minute ago
            if (now - lastScan > 60000) {
              if (StoreReview.isAvailable) {
                await AsyncStorage.setItem('@has_prompted_for_review', 'true');
                StoreReview.requestReview();
              }
            }
          }
        } catch (error) {
          console.error('Error checking rating prompt state:', error);
        }
      };

      checkForRatingPrompt();
    }, [hasScannedSinceOpen]) // Add hasScannedSinceOpen to dependencies
  );

  // Add this with other state declarations
  const [hasScannedEver, setHasScannedEver] = useState(false);

  // Track if post-scan paywall has been shown
  const [hasShownPostScanPaywall, setHasShownPostScanPaywall] = useState(false);

  // Load shown flag on mount
  useEffect(() => {
    (async () => {
      const shown = await AsyncStorage.getItem('@paywall_shown_after_scan');
      setHasShownPostScanPaywall(shown === 'true');
    })();
  }, []);

  // Show 'fortune-finished' paywall once after first-ever scan, on focus
  useFocusEffect(
    useCallback(() => {
      const maybeShowPostScan = async () => {
        try {
          if (hasScannedEver && !hasShownPostScanPaywall) {
            // paywall handled in scan completion only
          }
        } catch (error) {
          console.error('Error showing post-scan paywall:', error);
        }
      };
      maybeShowPostScan();
    }, [hasScannedEver, hasShownPostScanPaywall])
  );

  // Update the useFocusEffect for paywall
  useFocusEffect(
    useCallback(() => {
      // Timer reference for the 3-second delay
      let paywallTimerId = null;

      const checkAndShowPaywall = async () => {
        try {
          // Check if user has ever scanned
          const hasEverScanned = await AsyncStorage.getItem('@has_ever_scanned');
          setHasScannedEver(hasEverScanned === 'true');

          // Only proceed if user has scanned before
          if (hasEverScanned === 'true') {
            // Start the 3-second timer
            paywallTimerId = setTimeout(async () => {
              try {
                // Check if the SearchModeInfoSheet is visible *inside* the timeout
                // This uses the latest state value when the timeout executes
                if (!showSearchInfoSheet) {
                  const lastShownTimeStr = await AsyncStorage.getItem('@paywall_last_shown');
                  const currentTime = Date.now();
                  const cooldownPeriod = 45 * 60 * 1000; // 45 minutes in milliseconds
                  const lastShownTime = lastShownTimeStr ? parseInt(lastShownTimeStr, 10) : 0;

                  // If never shown before or 45 minutes have passed
                  if (!lastShownTime || (currentTime - lastShownTime) >= cooldownPeriod) {
                    console.log('[Paywall] Conditions met, showing paywall.');
                    await Superwall.shared.register('fortune-finished');
                    // Update the last shown time
                    await AsyncStorage.setItem('@paywall_last_shown', currentTime.toString());
                  } else {
                    console.log('[Paywall] Cooldown active, not showing paywall.');
                  }
                } else {
                  console.log('[Paywall] Search info sheet visible, not showing paywall.');
                }
              } catch (error) {
                console.error('Error inside paywall timeout:', error);
              }
            }, 3000); // 3-second delay
          } else {
            console.log('[Paywall] User has not scanned yet, not checking paywall timer.');
          }
        } catch (error) {
          console.error('Error setting up paywall check:', error);
        }
      };

      checkAndShowPaywall();

      // Cleanup function to clear the timeout if the screen loses focus
      return () => {
        if (paywallTimerId) {
          clearTimeout(paywallTimerId);
          console.log('[Paywall] Cleared paywall timer on blur.');
        }
      };
      // Add showSearchInfoSheet as a dependency to re-evaluate the effect if it changes
      // This ensures the check inside the timeout uses the most current value.
    }, [showSearchInfoSheet])
  );

  // Update handleSuccessfulScan to mark that user has scanned
  const handleSuccessfulScan = async (parsedData, imageUri, barcodeData, hasDrawing = false, actualModel = null) => {
    try {
      console.log('[FOODSCAN] handleSuccessfulScan called with food:', parsedData?.food?.name);
      console.log('[FOODSCAN] API completion status:', parsedData?._isProcessingComplete);
      
      // Ensure parsedData has valid structure
      if (!parsedData || !parsedData.food) {
        console.error("[FOODSCAN] Invalid parsedData structure:", parsedData);
        setNoFoodFound(true);
        return false;
      }
      
      // Update visualization with scan data if in search mode
      if (selectedMode === SEARCH_MODE && visualizationRef.current) {
        // Create a combined data object that includes both food and details
        const combinedData = {
          food: parsedData.food,
          details: parsedData.details || {},
          _isProcessingComplete: true
        };
        console.log('Updating visualization with data:', JSON.stringify(combinedData, null, 2));
        visualizationRef.current.updateWithScanData(combinedData);
      }

      // First fade out existing content
      await new Promise((resolve) => {
        Animated.timing(tabFadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start(resolve);
      });

      // Then update the data - IMPORTANT: Include both food and details
      // Ensure data is properly structured for the current mode
      let foodDataToSet;
      
      if (selectedMode === SEARCH_MODE || parsedData._scanType === 'search') {
        // For search mode, maintain the details object structure
        foodDataToSet = {
          ...parsedData.food,
          details: parsedData.details || {},
          _scanType: 'search'
        };
      } else {
        // First, check where the details are located - they might be nested in food object or at top level
        // Determine the right location of details - check if details exists at top level or nested in food
        const detailsSource = parsedData.details || parsedData.food.details || {};
        
        console.log("Details source location:", {
          topLevelDetails: !!parsedData.details,
          nestedInFood: !!parsedData.food.details,
          detailsSource
        });
        
        // For regular mode, ensure details are structured as expected
        // Make sure details have the correct structure with all properties we expect
        const details = {
          ...detailsSource,
          // Explicitly extract values with proper fallbacks
          summary: detailsSource.summary || null,
          prepTime: detailsSource.prepTime || null,
          servingSize: detailsSource.servingSize || 
                      (parsedData.food.servingSize ? 
                        `${parsedData.food.servingSize.amount || 1} ${parsedData.food.servingSize.unit || 'serving'}` : 
                        null),
          wikipediaLink: detailsSource.wikipediaLink || null,
          // If preparation steps exist, make sure they're properly formatted
          preparation: detailsSource.preparation || null
        };
        
        foodDataToSet = {
          ...parsedData.food,
          details: details,
          _scanType: 'regular'
        };
      }
      
      console.log("Setting food data:", JSON.stringify(foodDataToSet, null, 2));
      setFoodData(foodDataToSet);
      setNoFoodFound(false);
      setActiveTab('Nutrition');

      // Process scan data in the visualization BEFORE fading in results content
      // This ensures animation steps happen correctly
      if (visualizationRef.current) {
        // Make sure parsedData has _isProcessingComplete flag
        if (!parsedData._isProcessingComplete) {
          console.log('[FOODSCAN] Adding missing _isProcessingComplete flag to parsedData');
          parsedData._isProcessingComplete = true;
        }
        
        // First update with the complete data
        console.log('[FOODSCAN] Calling updateWithScanData on visualization');
        visualizationRef.current.updateWithScanData(parsedData);
        
        // Wait a short moment before marking API as finished to ensure data is processed
        console.log('[FOODSCAN] Waiting 300ms before calling setAPIFinished');
        await new Promise(resolve => {
          setTimeout(() => {
            console.log('[FOODSCAN] Calling setAPIFinished(true) on visualization');
            visualizationRef.current.setAPIFinished(true);
            resolve();
          }, 300);
        });
        
        // Add a delay to allow animation steps to complete before hiding visualization
        console.log('[FOODSCAN] Waiting for visualization steps to complete...');
        await new Promise(resolve => setTimeout(resolve, 4000));
      } else {
        console.log('[FOODSCAN] visualizationRef.current is null - cannot update visualization');
      }
      
      // Now fade in the results
      Animated.timing(tabFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Update scan count and potentially show paywall
      // Mark user as having scanned at least once
      await AsyncStorage.setItem('@has_ever_scanned', 'true');

      // Increment and save total scan count 
      const newScanCount = totalScanCount + 1;
      setTotalScanCount(newScanCount);
      await AsyncStorage.setItem('@total_scan_count', newScanCount.toString());

      // Show 'fortune-finished' paywall on 3rd scan with a delay
      if (newScanCount === 3) {
        // Use a timer to delay showing paywall until user has had time to see results
        if (postScanPaywallTimerRef.current) {
          clearTimeout(postScanPaywallTimerRef.current);
        }
        
        // Show paywall after 10 seconds to give user time to see results
        postScanPaywallTimerRef.current = setTimeout(async () => {
          console.log('[Paywall] Showing third-scan fortune-finished paywall');
          await Superwall.shared.register('fortune-finished');
          await AsyncStorage.setItem('@last_paywall_time', Date.now().toString());
          postScanPaywallTimerRef.current = null;
        }, 10000);
      }

      // Rest of your success handling code...
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      triggerMacroAnimations();
      setActivePage(0);
      lastKnownPage.current = 0;

      // Play sound only for non-search modes
      if (selectedMode !== SEARCH_MODE && scanCompleteSoundRef.current) {
        console.log('[FoodScanScreen] Playing scan complete sound for non-search mode.');
        scanCompleteSoundRef.current.replayAsync().catch(error => console.error('[FoodScanScreen] Error playing scan complete sound:', error));
      } else {
        console.log(`[FoodScanScreen] Skipping sound playback for mode: ${selectedMode}`);
      }

      await storeProductDetails({
        productName: parsedData.food.name,
        imageUri: imageUri,
        nutrients: {
          ...parsedData.food,
          details: foodDataToSet.details // Include the properly formatted details
        },
        date: new Date().toISOString(),
        hadBarcode: !!barcodeData,
        hasDrawing: hasDrawing,
        modelUsed: actualModel || selectedMode
      });
      
      return true;
    } catch (error) {
      console.error('[FOODSCAN] Error in handleSuccessfulScan:', error);
      return false;
    }
  };

  // UNCOMMENT THIS FOR PRODUCTION USE
  useFocusEffect(
    useCallback(() => {
      const checkAndShowPaywall = async () => {
        try {
          // Only check for paywall if user has scanned at least once
          const hasEverScanned = await AsyncStorage.getItem('@has_ever_scanned');
          if (hasEverScanned === 'true') {
            const lastShownTime = await AsyncStorage.getItem('@paywall_last_shown');
            const currentTime = Date.now();
            
            // Show paywall if never shown before or 20 minutes (1200000 ms) have passed
            if (!lastShownTime || (currentTime - parseInt(lastShownTime)) >= 1200000) {
              await Superwall.shared.register('fortune-finished');
              // Update the last shown time
              await AsyncStorage.setItem('@paywall_last_shown', currentTime.toString());
            }
          }
        } catch (error) {
          console.error('Error handling paywall display:', error);
        }
      };

      checkAndShowPaywall();
    }, [])
  );

  // Add new state variables at the top with other state declarations
  const [isOverloadedError, setIsOverloadedError] = useState(false);
  const [retryImageUri, setRetryImageUri] = useState(null);
  const [retryBarcodeData, setRetryBarcodeData] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [errorFadeAnim] = useState(new Animated.Value(0));

  // Add retry handler function
  const handleRetry = async () => {
    if (retryImageUri) {
      Animated.timing(errorFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(async () => {
        setIsOverloadedError(false);
        setProcessingImage(retryImageUri);
        setIsLoading(true);
        startLoadingAnimation();
        await sendImageToApi(retryImageUri, retryBarcodeData);
      });
    }
  };

  // Add new function for error simulation
  const showErrorSimulationAlert = () => {
    Alert.alert(
      'Simulate Error',
      'Which error would you like to simulate?',
      [
        {
          text: 'High Demand',
          onPress: () => {
            setIsOverloadedError(true);
            setRetryImageUri(image || 'https://example.com/test-image.jpg');
            setRetryBarcodeData(null);
            setErrorType('overloaded');
            Animated.timing(errorFadeAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }
        },
        {
          text: 'Unknown Error',
          onPress: () => {
            setIsOverloadedError(true);
            setRetryImageUri(image || 'https://example.com/test-image.jpg');
            setRetryBarcodeData(null);
            setErrorType('unknown');
            Animated.timing(errorFadeAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  // Add effect to handle tab changes and pagination
  useEffect(() => {
    if (activeTab === 'Nutrition' && foodData) {
      if (!hasAnimatedRef.current) {
        triggerMacroAnimations();
      }
      // Restore the last known page position when returning to Nutrition tab
      setActivePage(lastKnownPage.current);
    } else if (activeTab !== 'Nutrition' && foodData) {
      // Store the current page position when leaving Nutrition tab
      lastKnownPage.current = activePage;
    }
  }, [activeTab]);

  // Update page tracking when activePage changes
  useEffect(() => {
    if (activeTab === 'Nutrition') {
      lastKnownPage.current = activePage;
    }
  }, [activePage]);

  // Add chipAppearance based on whether foodData is non-null
  const chipAppearance = (colorScheme === 'dark' || foodData || noFoodFound || hasScannedSinceOpen) ? 'dark' : 'light';

  // Add this helper function to safely extract the JSON object from a string response
  const safeJsonParse = (content) => {
    try {
      let jsonContent = content;
      // If the content doesn't start with '{', try extracting from first '{' to last '}'
      if (!jsonContent.trim().startsWith("{")) {
        const startIndex = jsonContent.indexOf("{");
        const endIndex = jsonContent.lastIndexOf("}");
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          jsonContent = jsonContent.substring(startIndex, endIndex + 1);
        }
      }
      return JSON.parse(jsonContent);
    } catch (e) {
      throw e;
    }
  };

  // Add this to the useEffect that calls loadSettings
  const loadFoodSelectionSetting = async () => {
    try {
      const enabled = await AsyncStorage.getItem('foodSelectionEnabled');
      setFoodSelectionEnabled(enabled === 'true');
    } catch (error) {
      console.error('Error loading food selection setting:', error);
    }
  };

  // Add handler for food selection modal submission
  const handleFoodSelectionSubmit = async (base64Data, hasDrawing) => {
    setShowFoodSelectionModal(false);
    try {
      // Remove the resizeImage call since we already have base64 data
      await sendImageToApi(base64Data, null, hasDrawing);
    } catch (error) {
      console.error('Error processing selected food:', error);
      Alert.alert('Error', 'Failed to process selected food');
    }
  };

  const [foodSelectionEnabled, setFoodSelectionEnabled] = useState(false);
  const [showFoodSelectionModal, setShowFoodSelectionModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Add this effect to load and track model changes
  useEffect(() => {
    const loadModel = async () => {
      try {
        const model = await AsyncStorage.getItem('selectedModel');
        if (model) {
          setSelectedModel(model);
        }
      } catch (error) {
        console.error('Error loading model:', error);
      }
    };
    loadModel();
  }, []);

  // Add a model change listener
  useEffect(() => {
    const modelChangeListener = async () => {
      try {
        const model = await AsyncStorage.getItem('selectedModel');
        if (model && model !== selectedModel) {
          setSelectedModel(model);
        }
      } catch (error) {
        console.error('Error in model change listener:', error);
      }
    };

    // Set up listener
    const interval = setInterval(modelChangeListener, 1000);
    return () => clearInterval(interval);
  }, [selectedModel]);

  // Add this helper function after the component's state declarations but before other functions
  const handleError = (error, imageUri = null, barcodeData = null) => {
    console.error('Error:', error);
    
    setIsLoading(false);
    stopLoadingAnimation();
    setProcessingImage(null);
    setShowPlaceholder(false);
    setErrorOccured(true);
    
    // Determine error type based on error message
    const isOverloaded = error.message?.toLowerCase().includes('rate') || 
                        error.message?.toLowerCase().includes('capacity') ||
                        error.message?.toLowerCase().includes('too many') ||
                        error.message?.toLowerCase().includes('limit') ||
                        error.message?.toLowerCase().includes('overloaded');
    
    setIsOverloadedError(true);
    setRetryImageUri(imageUri);
    setRetryBarcodeData(barcodeData);
    setErrorType(isOverloaded ? 'overloaded' : 'unknown');
    
    // Fade out old results before showing error
    Animated.sequence([
      Animated.timing(tabFadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(errorFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Only clear data after fade out
      setFoodData(null);
      setActiveTab('');
    });
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    
    if (imageUri) {
      setImage(imageUri);
      Animated.timing(fadeAnimImage, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }

    fadeOutTitle(() => {
      fadeInTitle();
    });
  };

  // Add WhatsNew state
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  
  // Add useEffect to check if WhatsNew should be shown
  useEffect(() => {
    // Remove this line that sets it to true by default
    // setShowWhatsNew(true);
    const checkWhatsNewStatus = async () => {
      try {
        // Always consider it as seen, effectively disabling the popup
        await AsyncStorage.setItem('@has_seen_whats_new_1_6_0', 'true');
        setShowWhatsNew(false);
      } catch (error) {
        console.error('Error checking WhatsNew status:', error);
      }
    };
    
    checkWhatsNewStatus();
  }, []);

  const handleWhatsNewClose = async () => {
    try {
      await AsyncStorage.setItem('@has_seen_whats_new_1_6_0', 'true');
      setShowWhatsNew(false);
    } catch (error) {
      console.error('Error saving WhatsNew status:', error);
    }
  };

  // Add this with other refs
  const isProcessingRef = useRef(false);

  // Add this helper function near the top of the component
  const getPredictedProcessingTime = () => {
    const mode = selectedMode;
    if (averageProcessingTimes && averageProcessingTimes[selectedProvider]) {
      const modelTimes = averageProcessingTimes[selectedProvider][selectedModel];
      if (modelTimes && typeof modelTimes[mode] === 'number') {
        return Math.round(modelTimes[mode] / 1000);
      }
    }
    // Default fallback times
    return mode === 'accurate' ? 12 : 6;
  };

  // Add this near other state declarations
  const [useComplexProcessing, setUseComplexProcessing] = useState(false);

  // Add this state near other state declarations
  const [showModeTooltip, setShowModeTooltip] = useState(false);

  // Add this with other refs near the top
  const modeChipRef = useRef(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Separate useEffect for tooltip that only runs after WhatsNew is closed
  useEffect(() => {
    let tooltipTimeout;
    
    const checkTooltipStatus = async () => {
      try {
        const hasSeenTooltip = await AsyncStorage.getItem('@has_seen_mode_tooltip');
        if (!showWhatsNew && hasSeenTooltip !== 'true' && selectedMode === 'fast' && modeChipRef.current) {
          // Reduced timeout from 15000 to 3000 (3 seconds) for first-time users to see it faster
          tooltipTimeout = setTimeout(() => {
            // Added try/catch to handle measurement errors
            try {
              // First check if we have stored measurements
              if (modeChipMeasurementsRef.current) {
                const { pageX, pageY, width, height } = modeChipMeasurementsRef.current;
                setTooltipPosition({ x: pageX + width/2, y: pageY + height });
                setShowModeTooltip(true);
              } else {
                // Fallback to direct measurement
                modeChipRef.current.measure((x, y, width, height, pageX, pageY) => {
                  if (width && height) { // Ensure valid measurements
                    setTooltipPosition({ x: pageX + width/2, y: pageY + height });
                    setShowModeTooltip(true);
                  } else {
                    // Fallback position if measurements aren't valid
                    const screenWidth = Dimensions.get('window').width;
                    setTooltipPosition({ x: screenWidth / 2, y: 200 });
                    setShowModeTooltip(true);
                  }
                });
              }
            } catch (measureError) {
              console.error('Error measuring mode chip position:', measureError);
              // Show tooltip anyway with fallback position
              const screenWidth = Dimensions.get('window').width;
              setTooltipPosition({ x: screenWidth / 2, y: 200 });
              setShowModeTooltip(true);
            }
          }, 3000);
        }
      } catch (error) {
        console.error('Error checking tooltip status:', error);
      }
    };
    
    // Add small delay to ensure component is mounted and rendered
    const initialDelay = setTimeout(() => {
      checkTooltipStatus();
    }, 500);

    // Cleanup timeout when component unmounts or dependencies change
    return () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }
      clearTimeout(initialDelay);
    };
  }, [selectedMode, showWhatsNew]);

  // Add these with other state declarations
  const [showScanButtonTooltip, setShowScanButtonTooltip] = useState(false);
  const [scanButtonTooltipPosition, setScanButtonTooltipPosition] = useState({ x: 0, y: 0 });
  const scanButtonTooltipRef = useRef(null);
  const scanButtonRef = useRef(null);

  // Add this effect after the other tooltip effect
  useEffect(() => {
    let tooltipTimeout;
    let initialDelay;
    
    const checkScanButtonTooltipStatus = async () => {
      try {
        const hasSeenTooltip = await AsyncStorage.getItem('@has_seen_scan_button_tooltip');
        if (!showWhatsNew && hasSeenTooltip !== 'true' && scanButtonRef.current) {
          tooltipTimeout = setTimeout(() => {
            // Added try/catch to handle measurement errors
            try {
              // First check if we have stored measurements
              if (scanButtonMeasurementsRef.current) {
                const { pageX, pageY, width, height } = scanButtonMeasurementsRef.current;
                setScanButtonTooltipPosition({ x: pageX + width/2, y: pageY });
                setShowScanButtonTooltip(true);
                setHasShownScanTooltip(true); // Mark as shown
              } else {
                // Fallback to direct measurement
                scanButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
                  if (width && height) { // Ensure valid measurements
                    setScanButtonTooltipPosition({ x: pageX + width/2, y: pageY });
                    setShowScanButtonTooltip(true);
                    setHasShownScanTooltip(true); // Mark as shown
                  } else {
                    // Fallback position if measurements aren't valid
                    const screenWidth = Dimensions.get('window').width;
                    setScanButtonTooltipPosition({ x: screenWidth / 2, y: 400 });
                    setShowScanButtonTooltip(true);
                    setHasShownScanTooltip(true); // Mark as shown
                  }
                });
              }
            } catch (measureError) {
              console.error('Error measuring scan button position:', measureError);
              // Show tooltip anyway with fallback position
              const screenWidth = Dimensions.get('window').width;
              setScanButtonTooltipPosition({ x: screenWidth / 2, y: 400 });
              setShowScanButtonTooltip(true);
              setHasShownScanTooltip(true); // Mark as shown
            }
          }, 1000); // Increased to 8 seconds to ensure it appears after mode tooltip (which shows at 3 seconds)
        }
      } catch (error) {
        console.error('Error checking scan button tooltip status:', error);
      }
    };
    
    // Add small delay to ensure component is mounted and rendered
    initialDelay = setTimeout(() => {
      checkScanButtonTooltipStatus();
    }, 1000);

    return () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }
      if (initialDelay) {
        clearTimeout(initialDelay);
      }
    };
  }, [showWhatsNew]);

  // const [searchQueries, setSearchQueries] = useState([]);
  // const [searchResults, setSearchResults] = useState([]);
  // const [currentSearchEngine, setCurrentSearchEngine] = useState('');
  // const [visitedWebsites, setVisitedWebsites] = useState([]);

  // Add new state at the top with other state declarations
  const [showScrollToButtonIndicator, setShowScrollToButtonIndicator] = useState(false);
  const mainScrollViewRef = useRef(null);
  const buttonsYPosition = useRef(0);
  const contentHeight = useRef(0);
  const scrollViewHeight = useRef(0);

  // Add this effect to track button visibility
  useEffect(() => {
    const checkButtonVisibility = () => {
      if (contentHeight.current && scrollViewHeight.current && buttonsYPosition.current) {
        const buttonBottom = buttonsYPosition.current.y + buttonsYPosition.current.height;
        const isVisible = buttonBottom < scrollViewHeight.current;
        setShowScrollToButtonIndicator(!isVisible);
      }
    };

    // Initial check when component mounts
    checkButtonVisibility();
    
    // Remove the problematic line that tries to use addListener
    // const subscription = mainScrollViewRef.current?.addListener('onContentSizeChange', checkButtonVisibility);
    
    return () => {
      // No need to clean up subscription since we're not using addListener anymore
      // if (subscription) subscription.remove();
    };
  }, []);

  // Function to check if user has reached their search scan limit
  const checkSearchScanLimit = async () => {
    try {
      // Skip the check for subscribed users or on first day of app use
      if (isSubscribed || isFirstDayUnlimited) {
        return true; // No limit for these users
      }

      // Load search scan usage
      const freeSearchScansUsed = await AsyncStorage.getItem('freeSearchScansUsed');
      const searchScansUsed = parseInt(freeSearchScansUsed, 10) || 0;

      // Free users get 1 search scan per day
      if (searchScansUsed >= 1) {
        // User has reached their daily limit
        console.log('[FoodScanScreen] Search scan limit reached, showing paywall.');
        Superwall.shared.register('no-scans-fortune'); // Trigger paywall
        return false;
      }
      
      return true; // User can still perform search scans
    } catch (error) {
      console.error('Error checking search scan limit:', error);
      return true; // Default to allowing the scan if there's an error
    }
  };

  // Function to increment the search scan count
  const incrementSearchScanCount = async () => {
    try {
      // Skip for subscribed users or on first day
      if (isSubscribed || isFirstDayUnlimited) {
        return;
      }

      // Get current count
      const freeSearchScansUsed = await AsyncStorage.getItem('freeSearchScansUsed');
      let count = parseInt(freeSearchScansUsed, 10) || 0;
      
      // Increment count
      count += 1;
      
      // Save updated count
      await AsyncStorage.setItem('freeSearchScansUsed', count.toString());
      setFreeSearchScansUsed(count);
      
      console.log(`Updated search scan count: ${count}`);
    } catch (error) {
      console.error('Error incrementing search scan count:', error);
    }
  };

  // Add this after renderDetailsTab
  const renderSearchTab = () => {
    // Only show this tab for search mode scans
    const isSearchMode = selectedMode === SEARCH_MODE || (foodData && foodData._scanType === 'search');
    // Safely access search data with fallbacks
    const queries = searchQueries || [];
    const results = searchResults || [];
    const hasSearchData = queries.length > 0 || results.length > 0;
    
    if (!isSearchMode && !hasSearchData) {
      return (
        <View style={styles.tabContentContainer}>
          <Text style={styles.noDataText}>This tab is only available for search mode scans.</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.tabContentContainer}>
        <ScrollView 
          showsVerticalScrollIndicator={true} 
          style={{flex: 1}} 
          contentContainerStyle={{paddingBottom: 16 * scale}}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={handleContentSizeChange}
          ref={scrollViewRef}
          key={`search-scrollview-${activeTab}`}
        >
          <View style={styles.macroGridContainer}>
            {/* Search Queries Card */}
            {queries.length > 0 && (
              <Animated.View 
                style={[
                  styles.macroCard, 
                  { height: 'auto', minHeight: 100 * scale, marginBottom: 6 * scale },
                  {
                    opacity: cardAnimations[0],
                    transform: [
                      {
                        scale: cardAnimations[0].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                      {
                        translateY: cardAnimations[0].interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        }),
                      },
                    ],
                  }
                ]}
                entering={FadeInDown.delay(100).springify()}
              >
                <View style={styles.macroHeaderContainer}>
                  <View style={styles.iconLabelContainer}>
                    <View style={[styles.iconContainer]}>
                      <LinearGradient
                        colors={['#4299E1', '#3182CE']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      <Icon name="search-outline" size={20} color="#FFF" />
                    </View>
                    <Text style={styles.macroLabel}>Search Queries</Text>
                  </View>
                </View>
                
                <View style={styles.queriesContainer}>
                  {queries.map((query, index) => (
                    <View key={index} style={styles.queryItem}>
                      <Icon name="search-outline" size={16} color={colorScheme === 'dark' ? '#BBB' : '#666'} />
                      <Text style={styles.queryText}>{query}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}
            
            {/* Search Results Card */}
            {results.length > 0 && (
              <Animated.View 
                style={[
                  styles.macroCard, 
                  { height: 'auto', minHeight: 100 * scale, marginBottom: 6 * scale },
                  {
                    opacity: cardAnimations[1],
                    transform: [
                      {
                        scale: cardAnimations[1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                      {
                        translateY: cardAnimations[1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        }),
                      },
                    ],
                  }
                ]}
                entering={FadeInDown.delay(200).springify()}
              >
                <View style={styles.macroHeaderContainer}>
                  <View style={styles.iconLabelContainer}>
                    <View style={[styles.iconContainer]}>
                      <LinearGradient
                        colors={['#48BB78', '#38A169']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      <Icon name="globe-outline" size={20} color="#FFF" />
                    </View>
                    <Text style={styles.macroLabel}>Search Results</Text>
                  </View>
                </View>
                
                <View style={styles.resultsContainer}>
                  {results.map((result, index) => {
                    const title = result.title || result.name || "Result";
                    const url = result.url || "";
                    const snippet = result.snippet || result.description || "";
                    
                    return (
                      <View key={index} style={styles.resultItem}>
                        <Text style={styles.resultTitle}>{title}</Text>
                        {url && (
                          <TouchableOpacity onPress={() => Linking.openURL(url)}>
                            <Text style={styles.resultUrl}>{url}</Text>
                          </TouchableOpacity>
                        )}
                        {snippet && (
                          <Text style={styles.resultSnippet} numberOfLines={3}>{snippet}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            )}
            
            {queries.length === 0 && results.length === 0 && (
              <View style={styles.noSearchContainer}>
                <Text style={styles.noSearchText}>No search data available.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  // Update the renderTabNavigator function
  const renderTabNavigator = () => {
    // Only show the search tab for search mode scans
    const isSearchMode = selectedMode === SEARCH_MODE || (foodData && foodData._scanType === 'search');
    // Safely access search data with fallbacks
    const queries = searchQueries || [];
    const results = searchResults || [];
    const hasSearchData = queries.length > 0 || results.length > 0;
    const showSearchTab = isSearchMode || hasSearchData;
    
    return (
      <View style={styles.tabNavigator}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabButtonsContainer}
        >
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'Nutrition' && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab('Nutrition')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'Nutrition' && styles.activeTabButtonText,
              ]}
            >
              Nutrition
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'Ingredients' && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab('Ingredients')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'Ingredients' && styles.activeTabButtonText,
              ]}
            >
              Ingredients
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'Details' && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab('Details')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'Details' && styles.activeTabButtonText,
              ]}
            >
              Details
            </Text>
          </TouchableOpacity>
          
          {showSearchTab && (
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'Search' && styles.activeTabButton,
              ]}
              onPress={() => setActiveTab('Search')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'Search' && styles.activeTabButtonText,
                ]}
              >
                Search
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  // Update the renderTabContent function to render the Search tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Nutrition':
        return renderNutritionTab();
      case 'Ingredients':
        return renderIngredientsTab();
      case 'Details':
        return renderDetailsTab();
      case 'Search':
        return renderSearchTab();
      default:
        return renderNutritionTab();
    }
  };

  // Search-related state
  const [searchQueries, setSearchQueries] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  
  // Add detection states for search
  const [detectedFoodItems, setDetectedFoodItems] = useState([]);
  const [detectedBrand, setDetectedBrand] = useState('');
  const [detectedPackaging, setDetectedPackaging] = useState('');
  const [detectedPortionSize, setDetectedPortionSize] = useState('');
  const [processingSteps, setProcessingSteps] = useState([]);

  
  // Add this where you use the visualization ref or initialize the component
  const updateVisualizationWithSearch = (queries = [], results = []) => {
    console.log('[FOODSCAN] updateVisualizationWithSearch called with:', { 
      queries: queries?.length || 0, 
      results: results?.length || 0 
    });
    
    if (!visualizationRef.current) {
      console.log('[FOODSCAN] No visualization ref available');
      return;
    }
    
    // First update food items if we have a valid food name in queries
    if (queries && queries.length > 0) {
      // Extract potential food items from search queries 
      const foodKeywords = ['nutrition facts for', 'calories in'];
      let foodFound = false;
      
      // First pass: Try to find a food item from the queries
      for (const query of queries) {
        if (!query) continue;
        
        for (const keyword of foodKeywords) {
          if (query.toLowerCase().includes(keyword)) {
            const match = query.match(new RegExp(`${keyword}\\s+(.+?)(?:$|\\.|,)`, 'i'));
            if (match && match[1]) {
              const foodName = match[1].trim();
              if (foodName.length > 2) {
                foodFound = true;
                console.log('[FOODSCAN] Found food in query:', foodName);
                
                // Update detected food items state
                setDetectedFoodItems(prev => {
                  if (!prev || !prev.includes(foodName)) {
                    return [...(prev || []), foodName];
                  }
                  return prev;
                });
                
                // This is critical for step progression - update food items FIRST
                console.log('[FOODSCAN] Updating food items in visualization');
                visualizationRef.current.updateWithFoodItems([foodName]);
                break;
              }
            }
          }
        }
        if (foodFound) break;
      }
    }
    
    // Next, update search queries (ensures search step activates)
    if (queries && queries.length > 0) {
      console.log('[FOODSCAN] Updating search queries in visualization');
      
      // Store search queries state
      setSearchQueries(prev => {
        // Handle duplicate queries
        const combined = [...(prev || [])];
        // Only add queries that aren't already in the list
        queries.forEach(query => {
          if (!combined.includes(query)) {
            combined.push(query);
          }
        });
        return combined;
      });

      // Update visualization with search queries
      visualizationRef.current.updateWithSearchQueries(queries);
    }
    
    // Finally, update search results (ensures process step activates)
    if (results && results.length > 0) {
      console.log('[FOODSCAN] Updating search results in visualization');
      
      // Store search results state
      setSearchResults(prev => {
        const combined = [...(prev || [])];
        // Only add results that aren't already in the list
        results.forEach(result => {
          if (!combined.some(existing => existing.url === result.url)) {
            combined.push(result);
          }
        });
        return combined;
      });

      // Update visualization with search results
      visualizationRef.current.updateWithSearchResults(results);
    }
  };

  // Update the handleSearchModeScan function to safely handle search data
  const handleSearchModeScan = async (base64Image, imageUri, barcodeData, hasDrawing) => {
    try {
      console.log('[FOODSCAN] handleSearchModeScan called');
      
      // Check if we've reached the search scan limit
      const canScan = await checkSearchScanLimit();
      if (!canScan) {
        console.log('[FOODSCAN] Search scan limit reached');
        return false;
      }
      
      // Increment search scan count
      await incrementSearchScanCount();
      
      // Reset state variables
      console.log('[FOODSCAN] Resetting state variables');
      setSearchQueries([]);
      setSearchResults([]);
      setDetectedFoodItems([]);
      setDetectedBrand('');
      
      // Clear previous visualization state
      if (visualizationRef.current) {
        console.log('[FOODSCAN] Resetting visualization');
        visualizationRef.current.reset();
      }
      
      // Add a small delay to ensure reset is complete before starting search
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Start timer for performance tracking
      const startTime = Date.now();
      
      // Define the search tracking function
      const searchTrackingFn = (queries = [], results = []) => {
        console.log('[FOODSCAN] searchTrackingFn called with:', {
          queriesCount: queries?.length || 0,
          resultsCount: results?.length || 0
        });
        
        // Update the visualization with latest search data
        updateVisualizationWithSearch(queries, results);
      };
      
      // Get API key from AsyncStorage
      const apiKey = await AsyncStorage.getItem('@apikey');
      
      // Call the web search provider with tracking function
      console.log('[FOODSCAN] Calling WebSearchProvider.handleWebSearch');
      const result = await WebSearchProvider.handleWebSearch({
        provider,
        selectedModel: MODELS[provider]?.regular || MODELS['anthropic'].regular,
        selectedMode: 'search',
        base64Image,
        barcodeData,
        hasDrawing,
        apiKey,
        handleSuccessfulScan,
        handleError,
        handleSearchTracking: searchTrackingFn,
        imageUri,
        startTimeRef: { current: startTime },
        updateAverageProcessingTime,
        isFirstDayUnlimited: user?.isFreeTrialActive || false,
        isSubscribed: user?.isSubscribed || false,
        setNoFoodFound,
        setFoodData,
        setActiveTab,
      });
      
      console.log('[FOODSCAN] WebSearchProvider.handleWebSearch completed');
      
      // Don't call setAPIFinished here - it's already called in handleSuccessfulScan
      // Let the natural completion of the API process handle this
      return result;
    } catch (error) {
      console.error('[FOODSCAN] Error in handleSearchModeScan:', error);
      handleError(error, imageUri, barcodeData);
      return false;
    }
  };
  
  // For completion, add a helper function to safely get food items data
  const getFoodItems = () => {
    const items = [];
    const detectedItems = detectedFoodItems || [];
    
    // Add detected items first
    detectedItems.forEach(item => {
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

  // Add visualization and cancellation states
  const visualizationRef = useRef(null);
  const [scanDuration, setScanDuration] = useState(0);
  const scanTimerRef = useRef(null);

  // Add functions to manage scan timer and cancellation
  const startScanTimer = () => {
    // Reset scan duration
    setScanDuration(0);
    
    // Clear any existing timer
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
    }
    
    // Start a new timer that updates every second
    scanTimerRef.current = setInterval(() => {
      setScanDuration(prev => prev + 1);
    }, 1000);
  };

  const handleCancelScan = () => {
    // Show warning if scan has been running for more than 4 seconds
    if (scanDuration > 4) {
      Alert.alert(
        "Cancel Scan?",
        "This scan has been running for a while and will still count toward your daily limit if you cancel now.",
        [
          {
            text: "Keep Scanning",
            style: "cancel"
          },
          {
            text: "Cancel Anyway",
            onPress: () => {
              // Set the global cancellation flag to true
              global.NUTRILENS_CANCEL_SEARCH = true;
              
              // Stop the scan UI
              setIsLoading(false);
              stopLoadingAnimation();
              clearInterval(scanTimerRef.current);
              
              // Mark the API as finished in visualization component
              if (visualizationRef.current && visualizationRef.current.setAPIFinished) {
                visualizationRef.current.setAPIFinished(true);
              }
              
              // Reset the cancellation flag after a delay to ensure it's caught by search process
              setTimeout(() => {
                global.NUTRILENS_CANCEL_SEARCH = false;
              }, 500);
            },
            style: "destructive"
          }
        ]
      );
    } else {
      // Just cancel without warning if under 4 seconds
      // Set the global cancellation flag to true
      global.NUTRILENS_CANCEL_SEARCH = true;
      
      // Stop the scan UI
      setIsLoading(false);
      stopLoadingAnimation();
      clearInterval(scanTimerRef.current);
      
      // Mark the API as finished in visualization component
      if (visualizationRef.current && visualizationRef.current.setAPIFinished) {
        visualizationRef.current.setAPIFinished(true);
      }
      
      // Reset the cancellation flag after a delay to ensure it's caught by search process
      setTimeout(() => {
        global.NUTRILENS_CANCEL_SEARCH = false;
      }, 500);
    }
  };

  // Add these new state variables near other state declarations
  const [showSearchInfoSheet, setShowSearchInfoSheet] = useState(false);
  const [hasSeenSearchInfoSheetThisSession, setHasSeenSearchInfoSheetThisSession] = useState(false);
  const [searchInfoSheetKey, setSearchInfoSheetKey] = useState(0);
  const [initialModeLoaded, setInitialModeLoaded] = useState(null); // <-- Add new state here

  // Update the useEffect that depends on selectedMode
  useEffect(() => {
    const handleModeChange = async () => {
      // Existing logic for loading texts...
      if (isLoading) {
        setLoadingTextQueue(getLoadingTextsByMode(selectedMode));
      }
      
      // Reset hasSeenSearchInfoSheetThisSession when switching away from search mode
      if (selectedMode !== 'search' && prevMode === 'search') {
        setHasSeenSearchInfoSheetThisSession(false);
      }

      // New logic to show the info sheet for Search Mode based on time
      if (selectedMode === 'search') {
        // <-- Add condition: Do not show if search mode was loaded initially
        if (selectedMode === initialModeLoaded) {
          console.log('[SearchInfoSheet] Search mode was already selected on load, skipping info sheet.');
          return; 
        }

        try {
          const lastSeenTimestampStr = await AsyncStorage.getItem('@last_seen_search_info_sheet');
          const lastSeenTimestamp = lastSeenTimestampStr ? parseInt(lastSeenTimestampStr, 10) : 0;
          const currentTime = Date.now();
          const threeHoursInMillis = 3 * 60 * 60 * 1000;

          if (!lastSeenTimestamp || (currentTime - lastSeenTimestamp > threeHoursInMillis)) {
            // Increment the key to force a complete re-render of the component
            setSearchInfoSheetKey(prevKey => prevKey + 1);
            // Show the sheet
            setShowSearchInfoSheet(true);
            // Don't update the timestamp here - only when user clicks "Get Started"
            // Don't mark as seen in session so it can be shown again if dismissed
          } else {
            // If shown recently and user clicked "Get Started", maintain that status
            if (lastSeenTimestamp) {
              setHasSeenSearchInfoSheetThisSession(true);
            }
          }
        } catch (error) {
          console.error("Error checking/setting search info sheet timestamp:", error);
          // Fallback: show the sheet if there's an error reading time, but don't update timestamp
          if (!hasSeenSearchInfoSheetThisSession) {
             setSearchInfoSheetKey(prevKey => prevKey + 1);
             setShowSearchInfoSheet(true);
             // Don't set hasSeenSearchInfoSheetThisSession here
          }
        }
      }
    };
    handleModeChange();
    // <-- Add initialModeLoaded to dependency array
  }, [selectedMode, isLoading, prevMode, initialModeLoaded]); 

  // Add this function to start the pulsing animation for the mode chip
  const startChipPulseAnimation = () => {
    // Reset animation value
    chipPulseAnim.setValue(0);
    
    // Create a single smooth pulse animation
    Animated.sequence([
      // Fade in quickly
      Animated.timing(chipPulseAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      // Fade out with longer, smoother curve
      Animated.timing(chipPulseAnim, {
        toValue: 0,
        duration: 900,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: false,
      }),
    ]).start();
    
    // Play haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Add ref for the completion sound
  const scanCompleteSoundRef = useRef(null);

  // Add this effect to load/unload the scan completion sound
  useEffect(() => {
    let soundObject = null;
    const loadSound = async () => {
      try {
        console.log('[FoodScanScreen] Loading scan complete sound...');
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

        const { sound } = await Audio.Sound.createAsync(
           require('../assets/scan_complete_TRIMMED.mp3')
        );
        scanCompleteSoundRef.current = sound;
        soundObject = sound; // Keep local ref for cleanup
        console.log('[FoodScanScreen] Scan complete sound loaded');
      } catch (error) {
        console.error('[FoodScanScreen] Error loading scan complete sound:', error);
      }
    };

    loadSound();

    // Cleanup function
    return () => {
      console.log('[FoodScanScreen] Unloading scan complete sound...');
      if (scanCompleteSoundRef.current) {
        try {
          scanCompleteSoundRef.current.unloadAsync();
        } catch (e) { console.error('[FoodScanScreen] Error unloading sound:', e); }
        scanCompleteSoundRef.current = null;
      }
      // Also unload local ref if it exists
      if (soundObject) {
        try { soundObject.unloadAsync(); } catch (e) {}
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount/unmount

  // Add these refs near the top with other refs
  const modeChipMeasurementsRef = useRef(null);
  const scanButtonMeasurementsRef = useRef(null);

  // Use layout effect to position tooltips after layout
  useLayoutEffect(() => {
    // This runs after layout but before paint
    // Perfect time to measure positions
    
    // Only run this for first-time users
    const checkFirstTimeStatus = async () => {
      try {
        const hasSeenModeTooltip = await AsyncStorage.getItem('@has_seen_mode_tooltip');
        const hasSeenButtonTooltip = await AsyncStorage.getItem('@has_seen_scan_button_tooltip');
        
        const isModeTooltipFirstTime = hasSeenModeTooltip !== 'true';
        const isButtonTooltipFirstTime = hasSeenButtonTooltip !== 'true';
        
        // If either tooltip needs to be shown for first time
        if ((isModeTooltipFirstTime || isButtonTooltipFirstTime) && 
            !showWhatsNew && !isLoading) {
              
          // Small delay to ensure layout is complete
          setTimeout(() => {
            // Position mode tooltip if needed
            if (isModeTooltipFirstTime && modeChipRef.current) {
              try {
                modeChipRef.current.measure((x, y, width, height, pageX, pageY) => {
                  // Store measurements for later use
                  modeChipMeasurementsRef.current = { 
                    x, y, width, height, pageX, pageY 
                  };
                });
              } catch (e) {
                console.error('Failed to measure mode chip in layout effect', e);
              }
            }
            
            // Position scan button tooltip if needed
            if (isButtonTooltipFirstTime && scanButtonRef.current) {
              try {
                scanButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
                  // Store measurements for later use
                  scanButtonMeasurementsRef.current = { 
                    x, y, width, height, pageX, pageY 
                  };
                });
              } catch (e) {
                console.error('Failed to measure scan button in layout effect', e);
              }
            }
          }, 500);
        }
      } catch (error) {
        console.error('Error in tooltip layout effect:', error);
      }
    };
    
    checkFirstTimeStatus();
  }, []);

  // Add handler for the manual input button press
  const handleManualInputPress = () => {
    setManualInputModalVisible(true);
  };

  // Add function to handle submission from the manual input modal
  const handleManualInputSubmit = async (descriptionFromModal) => {
    // No need to check description here, modal already did.
    setManualInputModalVisible(false);
    console.log('[FoodScanScreen] Manual input submitted via modal:', descriptionFromModal);
    // Call the function to send the description to the API
    await sendDescriptionToApi(descriptionFromModal);
    // No need to clear parent state, modal clears its own state
  };

  // Placeholder function to send description to API (to be implemented fully later)
  const sendDescriptionToApi = async (description) => {
    setIsLoading(true);
    startLoadingAnimation(); // Use existing loading animation
    setNoFoodFound(false);
    setErrorOccured(false);
    startTimeRef.current = Date.now();

    try {
      // Get the provider and model
      const provider = await AsyncStorage.getItem('@selected_provider') || 'anthropic';
      setSelectedProvider(provider);
      
      // Get the appropriate model based on the provider
      const currentModel = getModel(provider, { 
        selectedMode: 'fast', // Use fast mode for text-only analysis
        selectedModel,
        hasDrawing: false
      });
      
      // Get API key from context
      const apiKey = apiKeys?.[provider + 'ApiKey'];
      
      if (!apiKey) {
        console.error(`API key not found for ${provider}.`);
        Alert.alert('ERROR', 'Cloud functions are not active. Please contact support.');
        setIsLoading(false);
        stopLoadingAnimation();
        return;
      }
      
      console.log(`[FoodScanScreen] Using ${provider} with model ${currentModel} for text description`);
      
      // Create an instance of the Anthropic client
      const anthropic = new Anthropic({ apiKey });
      
      // Create a text-only prompt for food description
      const textPrompt = `You are a nutrition expert with deep knowledge of food and its nutritional content.
A user has provided this text description: "${description}"

Decide if the description is a food item or not. If it is not a food item, respond with "{No Food Found.}" and say nothing else. THIS IS IMPORTANT.

Based on this description alone, please analyze the food and provide detailed nutritional information. Try to be specific about portion sizes and ingredients. If you can't determine exact values, provide reasonable estimates with proper margin of error indicators.

Your response should ONLY be valid JSON with the following structure:
{
  "food": {
    "name": "Name of the food",
    "class": "Food category (e.g., Breakfast, Snack, Dessert)",
    "type": "Specific type (e.g., Baked Good, Dairy, Protein)",
    "calories": { 
      "amount": "Number - Total calories",
      "marginOfErrorPercent": "Number - Uncertainty percentage"
    },
    "proteins": {
      "amount": "Number - Grams",
      "marginOfErrorPercent": "Number"
    },
    "carbohydrates": {
      "amount": "Number - Grams",
      "marginOfErrorPercent": "Number"
    },
    "fats": {
      "amount": "Number - Grams",
      "marginOfErrorPercent": "Number"
    },
    "fiber": {
      "amount": "Number - Grams",
      "marginOfErrorPercent": "Number"
    },
    "sodium": {
      "amount": "Number - Milligrams",
      "marginOfErrorPercent": "Number"
    },
    "ingredients": [
      {
        "name": "String - Ingredient name",
        "wikipediaLink": "String - Wikipedia URL",
        "description": "String - Brief description"
      }
    ],
    "details": {
      "summary": "String - Brief description of the food",
      "prepTime": "String - Estimated preparation time",
      "servingSize": "String - Exact portion analyzed",
      "wikipediaLink": "String - Wikipedia URL for the food item"
    }
  }
}

IMPORTANT RULES:
1. ALL fields must be provided - no null values allowed
2. Use higher marginOfErrorPercent (20-30%) when uncertain about values
3. Include all ingredients mentioned in the description
4. Base serving size on standard portions or what's specified in the description
5. If the description is too vague or doesn't describe food, like "packing peanuts", respond with "{No Food Found.}" and nothing else.
6. Provide reasonable estimates based on standard nutritional databases
7. Include relevant Wikipedia links for ingredients and the main food item
8. Be specific about serving sizes in the details section`;

      // Send the request to Anthropic
      const response = await anthropic.messages.create({
        model: currentModel,
        max_tokens: 4096,
        temperature: 0.5,
        system: textPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: description
              }
            ]
          }
        ]
      });

      // Get the response text
      const responseText = response.content[0].text;
      console.log('[FoodScanScreen] Anthropic response:', responseText);
      
      // Try to parse the JSON
      try {
        // Remove any non-JSON content if present
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          // Check specifically for the No Food Found response
          if (responseText.trim() === '{No Food Found.}') {
            console.log('[FoodScanScreen] Received No Food Found response.');
            setNoFoodFound(true);
            setImage(null); // Ensure no image is displayed
            setShowPlaceholder(false); // Show the results area (which will now show the no food message)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); // Use warning haptic
            return; // Stop processing here
          }
          throw new Error("No valid JSON found in response");
        }
        
        const jsonString = jsonMatch[0];
        
        // Also check if the extracted JSON string itself is the No Food Found message
        if (jsonString === '{No Food Found.}') {
          console.log('[FoodScanScreen] Received No Food Found response after extraction.');
          setNoFoodFound(true);
          setImage(null);
          setShowPlaceholder(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return;
        }
        
        const parsedData = JSON.parse(jsonString);
        console.log('[FoodScanScreen] Parsed nutritional data:', parsedData);
        
        // Add metadata and mark as a text-based request
        parsedData._isProcessingComplete = true;
        if (parsedData.details) {
          parsedData.details._isTextDescription = true;
        }
        
        // Update UI with the parsed data
        setImage(null); // No image for manual entry
        setShowPlaceholder(false); // Show results area
        
        // Process the response through the existing handler
        await handleSuccessfulScan(parsedData, null, null, false, currentModel + '-text');
      } catch (parseError) {
        console.error("[FoodScanScreen] Error parsing JSON from Anthropic response:", parseError);
        handleError(new Error('Failed to parse nutrition information from the description.'));
      }
    } catch (error) {
      console.error("[FoodScanScreen] Error sending text description to API:", error);
      handleError(error);
    } finally {
      setIsLoading(false);
      stopLoadingAnimation();
    }
  };

  // Load scan count and paywall timing on component mount
  useEffect(() => {
    const loadPaywallState = async () => {
      try {
        const storedScanCount = await AsyncStorage.getItem('@total_scan_count');
        const storedPaywallTime = await AsyncStorage.getItem('@last_paywall_time');
        
        setTotalScanCount(storedScanCount ? parseInt(storedScanCount) : 0);
        setLastPaywallTime(storedPaywallTime ? parseInt(storedPaywallTime) : 0);
      } catch (error) {
        console.error('Error loading paywall state:', error);
      }
    };
    
    loadPaywallState();
  }, []);

  // Add Fortune general paywall on app launch with 5min/6hr rules
  const [appUsageTime, setAppUsageTime] = useState(0);
  const appUsageIntervalRef = useRef(null);

  // Track app usage time
  useEffect(() => {
    const loadAppUsageTime = async () => {
      try {
        const savedTime = await AsyncStorage.getItem('@app_usage_time');
        setAppUsageTime(savedTime ? parseInt(savedTime) : 0);
      } catch (error) {
        console.error('Error loading app usage time:', error);
      }
    };

    loadAppUsageTime();
    
    // Update usage time every 5 seconds
    appUsageIntervalRef.current = setInterval(async () => {
      try {
        const newTime = appUsageTime + 5000;
        setAppUsageTime(newTime);
        await AsyncStorage.setItem('@app_usage_time', newTime.toString());
      } catch (error) {
        console.error('Error updating app usage time:', error);
      }
    }, 5000);
    
    return () => {
      if (appUsageIntervalRef.current) {
        clearInterval(appUsageIntervalRef.current);
      }
    };
  }, [appUsageTime]);

  // General fortune paywall on focus
  useFocusEffect(
    useCallback(() => {
      const checkGeneralPaywall = async () => {
        try {
          // Only show if 5+ minutes used and 6 hours since last show
          const lastShownGeneral = await AsyncStorage.getItem('@general_paywall_last_shown');
          const currentTime = Date.now();
          const sixHours = 6 * 60 * 60 * 1000;
          
          const hasPassedCooldown = !lastShownGeneral || 
                                 (currentTime - parseInt(lastShownGeneral)) >= sixHours;
          
          if (appUsageTime >= 5 * 60 * 1000 && hasPassedCooldown) {
            console.log('[Paywall] Showing general fortune paywall (5min/6hr rule)');
            await Superwall.shared.register('fortune');
            await AsyncStorage.setItem('@general_paywall_last_shown', currentTime.toString());
          }
        } catch (error) {
          console.error('Error handling general paywall:', error);
        }
      };
      
      checkGeneralPaywall();
    }, [appUsageTime])
  );

  const [hasShownScanTooltip, setHasShownScanTooltip] = useState(false);

  return (
    <ScrollView 
      ref={mainScrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.scrollContentContainer}
      onContentSizeChange={(w, h) => {
        contentHeight.current = h;
        const show = foodData && h > scrollViewHeight.current; // Check foodData
        setShowScrollToButtonIndicator(show);
        
        // Call the visibility check function when content size changes
        if (contentHeight.current && scrollViewHeight.current && buttonsYPosition.current) {
          const buttonBottom = buttonsYPosition.current.y + buttonsYPosition.current.height;
          const isVisible = buttonBottom < scrollViewHeight.current;
          setShowScrollToButtonIndicator(foodData && !isVisible); // Check foodData
        }
      }}
      onLayout={(e) => {
        scrollViewHeight.current = e.nativeEvent.layout.height;
        const show = foodData && contentHeight.current > e.nativeEvent.layout.height; // Check foodData
        setShowScrollToButtonIndicator(show);
      }}
      onScroll={({nativeEvent}) => {
        const scrollPosition = nativeEvent.contentOffset.y + nativeEvent.layoutMeasurement.height;
        const show = foodData && scrollPosition < contentHeight.current - 150; // Check foodData
        setShowScrollToButtonIndicator(show);
      }}
      scrollEventThrottle={16}
    >
      <View style={styles.headerContainer}>
        <AnimatedTextFoodScan
          text={
            foodData
              ? (foodData.name 
                 ? (foodData.name.length > 23
                    ? foodData.name.slice(0, 23) + '...'
                    : foodData.name)
                 : 'Unknown Food')
              : noFoodFound
              ? 'No Food Found'
              : ErrorOccured
              ? "Couldn't Process"
              : 'No Image Selected'
          }
          colorScheme={colorScheme}
          style={styles.title}
        />
      </View>
      
      <AnimatedTextFoodScan
        text={
          foodData
            ? `${foodData.class || 'Unknown Class'} • ${foodData.type || 'Unknown Type'}`
            : ErrorOccured
            ? 'Something went wrong, please try again'
            : 'Take clear, centered, and level photos.'
        }
        colorScheme={colorScheme}
        style={styles.subtitle}
      />

      <View style={styles.mainContentContainer}>
        <View style={styles.imageContainer}>
          {showPlaceholder ? (
            <Animated.View
              style={[
                styles.placeholderContainer,
                { opacity: fadeAnimPlaceholder }
              ]}
            >
              <Text style={styles.placeholderText}>You haven't scanned anything yet</Text>
            </Animated.View>
          ) : (
            <View style={styles.imageWrapper}>
              {/* Check if image exists AND it's not a text description result */}
              {image && (!foodData?.details?._isTextDescription) ? (
                <Animated.Image
                  source={{ 
                    uri: typeof image === 'string' && !image.startsWith('data:image/jpeg;base64,')
                      ? 'data:image/jpeg;base64,' + image
                      : image 
                  }}
                  style={[styles.foodImage, { opacity: fadeAnimImage }]}
                />
              ) : (
                <Animated.View style={[styles.placeholderContainer, { opacity: fadeAnimImage }]}>
                  <Ionicons 
                    name="document-text-outline" 
                    size={80 * scale} // Make icon larger for main view
                    color={colorScheme === 'dark' ? '#444' : '#ccc'} 
                  />
                  <Text style={[styles.placeholderText, {marginTop: 10 * scale}]}>
                    Manual Entry
                  </Text>
                </Animated.View>
              )}
              {/* Only show barcode icon if there was an actual image scan */}
              {hadBarcode && image && (!foodData?.details?._isTextDescription) && (
                <TouchableOpacity 
                  style={styles.barcodeIconContainer}
                  onPress={() => {
                    Alert.alert(
                      "Barcode Detected",
                      "This scan's results were enhanced using barcode data for improved accuracy.",
                      [{ text: "OK" }]
                    );
                  }}
                >
                  <MaterialCommunityIcons 
                    name="barcode-scan" 
                    size={30} 
                    color="#fff" 
                  />
                </TouchableOpacity>
              )}
              {DEBUG_MODE && (
                <TouchableOpacity
                  style={styles.debugChipContainer}
                  onPress={showErrorSimulationAlert}
                >
                  <BlurView
                    intensity={50}
                    tint="dark"   // Always use dark tint for debug chip
                    style={styles.debugChip}
                  >
                    <View style={styles.chipContent}>
                      <Icon 
                        name="bug-outline" 
                        size={16} 
                        color="#fff"  // Force white icon
                      />
                      <Text style={[
                        styles.chipText,
                        { color: '#fff' }  // Force white text
                      ]}>
                        Debug
                      </Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={styles.controlsOverlay}>
            {/* Updated Chips: Use dark styling when foodData exists, always light otherwise */}
            <TouchableOpacity
              style={styles.chipContainer}
              onPress={() => {
                let message = '';
                if (selectedMode === 'accurate') {
                  if (isFirstDayUnlimited || isSubscribed) {
                    message = 'Accurate Scans: ∞ (Unlimited Plan)';
                  } else if (isSubscribedPlus) {
                    message = `Plus plan: ${20 - scanCount} total scans left. (Accurate scans are unlimited)`;
                  } else {
                    message = `Accurate Scans Left Today: ${Math.max(0, 1 - freeAccurateScansUsed)}`;
                  }
                } else if (selectedMode === SEARCH_MODE) {
                  if (isFirstDayUnlimited || isSubscribed) {
                    message = 'Search Scans: ∞ (Unlimited Plan)';
                  } else if (isSubscribedPlus) {
                    message = `Plus plan: ${20 - scanCount} total scans left. (Search scans are unlimited)`;
                  } else {
                    message = `Search Scans Left Today: ${Math.max(0, 1 - freeSearchScansUsed)}`;
                  }
                } else {
                  if (isFirstDayUnlimited || isSubscribed) {
                    message = isSubscribed 
                      ? "You have unlimited scans because you're subscribed."
                      : "You have unlimited scans because today is your first day using the app.";
                  } else if (isSubscribedPlus) {
                    message = `You have used ${scanCount} of 20 scans today.`;
                  } else {
                    message = `You have used ${scanCount} of 5 scans today.`;
                  }
                }
                Alert.alert("Scan Limit", message);
              }}
            >
              <BlurView
                intensity={50}
                tint={chipAppearance} // Updated here
                style={[
                  styles.chip,
                  { borderColor: chipAppearance === 'dark' ? '#666' : '#ddd' } // New border color update
                ]}
              >
                <View style={styles.chipContent}>
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: chipAppearance === 'dark' ? '#fff' : '#444' } // Updated here
                    ]}
                  >
                    Scans:
                  </Text>
                  {isFirstDayUnlimited || isSubscribed ? (
                    <FontAwesomeIcon
                      icon={faInfinity}
                      size={18}
                      color={chipAppearance === 'dark' ? '#fff' : '#444'} // Updated here
                    />
                  ) : (
                    <Text
                      style={[
                        styles.chipText,
                        { color: chipAppearance === 'dark' ? '#fff' : '#444' } // Updated here
                      ]}
                    >
                      {selectedMode === 'accurate'
                        ? Math.max(0, 1 - freeAccurateScansUsed)
                        : selectedMode === SEARCH_MODE
                          ? Math.max(0, 1 - freeSearchScansUsed) // Show remaining search scans
                          : isSubscribedPlus
                            ? (20 - scanCount) // Plus users general count
                            : (5 - scanCount)} {/* Free users general count (fast mode) */}
                    </Text>
                  )}
                </View>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              ref={modeChipRef}
              style={[styles.chipContainer, { position: 'relative' }]}
              onPress={handleModeChipPress}
            >
              {/* Add wrapper Animated.View to handle the pulse animation */}
              <Animated.View
                style={[
                  // Add pulsing shadow animation for the Search mode chip
                  selectedMode === SEARCH_MODE && {
                    shadowColor: '#8A2BE2', // Bright purple for the glow
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: chipPulseAnim, // Use chipPulseAnim to control opacity
                    shadowRadius: chipPulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 15]
                    }),
                    elevation: Platform.OS === 'android' ? 8 : 0,
                    borderWidth: 1.5,
                    borderColor: chipPulseAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: ['transparent', '#9932CC', '#8A2BE2']
                    }),
                    borderRadius: 15 * scale,
                  }
                ]}
              >
                <BlurView
                  intensity={50}
                  tint={chipAppearance}
                  style={[
                    styles.chip,
                    selectedMode === 'accurate' && styles.chipAccurate,
                    selectedMode === SEARCH_MODE && styles.chipSearch,
                    { borderColor: chipAppearance === 'dark' ? '#666' : '#ddd' }
                  ]}
                >
                  <View style={styles.chipContent}>
                    <Icon
                      name={
                        selectedMode === 'fast' ? 'flash' : 
                        selectedMode === 'accurate' ? 'shield-checkmark' : 
                        'search'
                      }
                      size={16}
                      color={chipAppearance === 'dark' ? '#fff' : '#444'}
                    />
                    <View style={styles.chipTextContainer}>
                      <Animated.Text
                        style={[
                          styles.chipText,
                          {
                            opacity: chipTextOpacity,
                            color: chipAppearance === 'dark' ? '#fff' : '#444'
                          }
                        ]}
                      >
                        {selectedMode === 'fast' ? 'Fast' : selectedMode === 'accurate' ? 'Accurate' : 'Deep Search'}
                      </Animated.Text>
                      {selectedMode === SEARCH_MODE && (
                        <View style={styles.betaTagContainer}>
                          <Text style={styles.betaTagText}>BETA</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </BlurView>
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabContainer}>
          {/* Add the sliding indicator */}
          {!isTabsDisabled && (
            <Animated.View
              style={[
                styles.tabIndicator,
                {
                  transform: [{
                    translateX: tabIndicatorAnim.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [width * 0.05, width * 0.36, width * 0.67], // Adjusted positions
                    })
                  }],
                  width: 90, // Fixed width for the indicator
                  opacity: isTabsDisabled ? 0 : 1,
                }
              ]}
            />
          )}
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'Nutrition' && styles.activeTabButton,
              isTabsDisabled && styles.disabledTabButton
            ]}
            onPress={() => handleTabPress('Nutrition')}
            disabled={isTabsDisabled}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab === 'Nutrition' && styles.activeTabButtonText,
              isTabsDisabled && styles.disabledTabButtonText
            ]}>Nutrition</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'Ingredients' && styles.activeTabButton,
              isTabsDisabled && styles.disabledTabButton
            ]}
            onPress={() => handleTabPress('Ingredients')}
            disabled={isTabsDisabled}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab === 'Ingredients' && styles.activeTabButtonText,
              isTabsDisabled && styles.disabledTabButtonText
            ]}>Ingredients</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'Details' && styles.activeTabButton,
              isTabsDisabled && styles.disabledTabButton
            ]}
            onPress={() => handleTabPress('Details')}
            disabled={isTabsDisabled}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab === 'Details' && styles.activeTabButtonText,
              isTabsDisabled && styles.disabledTabButtonText
            ]}>Details</Text>
          </TouchableOpacity>
        </View>

        {foodData ? (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContainer}
            style={styles.scrollViewStyle}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            <Animated.View style={{ opacity: tabFadeAnim }}>
              {activeTab === 'Nutrition' && renderNutritionTab()}
              {activeTab === 'Ingredients' && renderIngredientsTab()}
              {activeTab === 'Details' && renderDetailsTab()}
              {activeTab === 'Search' && renderSearchTab()}
            </Animated.View>
            {renderButtons()}
          </ScrollView>
        ) : (
          <View style={styles.noContentContainer}>
            <AnimatedTextFoodScanFast
              text={
                noFoodFound
                  ? "The image you scanned doesn't appear to have any food in it. If it is an image of food, try taking a photo with better lighting or zoom out."
                  : ErrorOccured
                  ? 'An error occurred while processing the image. We aren\'t sure what happened, but it\'s likely to work again. Please try again.'
                  : 'The nutrient data and ingredients of food you scan will appear here.'
              }
              colorScheme={colorScheme}
              style={styles.placeholderTextInScroll}
            />
            {renderButtons()}
          </View>
        )}

        {activeTab === 'Ingredients' && foodData && (
          <Animated.View
            style={[styles.scrollIndicator, { opacity: scrollIndicatorOpacity }]}
            pointerEvents={showScrollIndicator ? 'auto' : 'none'}
          >
            <TouchableOpacity onPress={scrollToBottom}>
              <Entypo name="chevron-down" size={32} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      <Modal
  transparent={true}
  animationType="fade"
  visible={isLoading}
>
  {selectedMode === SEARCH_MODE ? (
    // Search mode loading UI with visualization component
    <BlurView
      intensity={30}
      tint={colorScheme === 'dark' ? 'dark' : 'light'}
      style={styles.modalBackground}
    >
      <View style={styles.searchLoadingContainer}>
        {/* Add the header container here */}
        <View style={styles.searchHeaderContainer}>
          <View style={styles.searchHeaderIconGradient}>
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              <Defs>
                <RadialGradient id="grad1" cx="25%" cy="25%" r="80%" gradientUnits="userSpaceOnUse">
                  <Stop offset="0%" stopColor="#FFB74D" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#FFB74D" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id="grad2" cx="75%" cy="30%" r="70%" gradientUnits="userSpaceOnUse">
                  <Stop offset="0%" stopColor="#FF5252" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#FF5252" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id="grad3" cx="50%" cy="60%" r="75%" gradientUnits="userSpaceOnUse">
                  <Stop offset="0%" stopColor="#42A5F5" stopOpacity="0.9" />
                  <Stop offset="100%" stopColor="#42A5F5" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id="grad4" cx="65%" cy="75%" r="60%" gradientUnits="userSpaceOnUse">
                  <Stop offset="0%" stopColor="#AB47BC" stopOpacity="0.8" />
                  <Stop offset="100%" stopColor="#AB47BC" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad1)" />
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad2)" />
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad3)" />
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad4)" />
            </Svg>
            <Icon name="search" size={28 * scale} color="#FFFFFF" style={styles.searchHeaderIconOverlay} />
          </View>
          <Text style={styles.searchHeaderText}>Deep Search Scan</Text>
        </View>

        <FunctionalAIVisualization
          isDark={colorScheme === 'dark'}
          isVisible={isLoading}
          ref={visualizationRef}
        />
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={handleCancelScan}
          activeOpacity={0.7}
        >
          <BlurView intensity={50} style={[
            styles.cancelButtonBlur,
            {
              borderColor: colorScheme === 'dark' ? 'rgba(51, 51, 51, 0.5)' : '#bbb',
              backgroundColor: colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.85)',
            }
          ]}>
            <View style={styles.cancelButtonContent}>
              <Icon name="close" size={18} color="rgb(255, 59, 48)" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </View>
          </BlurView>
        </TouchableOpacity>
      </View>
    </BlurView>
  ) : (
    // Regular loading UI for fast and accurate modes
    <BlurView
      intensity={30}
      tint={colorScheme === 'dark' ? 'dark' : 'light'}
      style={styles.modalBackground}
    >
      <View style={styles.loadingCard}>
        {/* Mode Badge */}
        <View style={styles.modeBadgeContainer}>
          <BlurView intensity={50} style={styles.modeBadge}>
            <Icon 
              name={
                selectedMode === 'fast' ? 'flash' : 
                selectedMode === 'accurate' ? 'shield-checkmark' : 
                'search'
              }
              size={24} 
              color={colorScheme === 'dark' ? '#fff' : '#000'} 
            />
            <Text style={styles.modeBadgeText}>
              {
                selectedMode === 'fast' ? 'Fast Scan' : 
                selectedMode === 'accurate' ? 'Accurate Scan' : 
                'Search Scan'
              }
            </Text>
          </BlurView>
        </View>

        {/* Loading Indicator and Text */}
        <View style={styles.loadingContent}>
          <ActivityIndicator 
            size="large" 
            color={colorScheme === 'dark' ? '#FFF' : '#000'} 
          />
          
          <Animated.View style={[styles.loadingTextContainer]}>
            {isHoldingRef.current ? (
              <Animated.Text style={[styles.loadingText, { opacity: longLoadingTextAnim }]}>
                {currentLoadingText}
              </Animated.Text>
            ) : (
              <Animated.Text style={[styles.loadingText, { opacity: loadingTextFadeAnim }]}>
                {currentLoadingText}
              </Animated.Text>
            )}
          </Animated.View>
        </View>

        {/* Info Cards */}
        <View style={styles.infoCardsContainer}>
          {/* Scans Left Card */}
          <BlurView intensity={50} style={styles.infoCard}>
            <Icon 
              name="scan-outline" 
              size={20} 
              color={colorScheme === 'dark' ? '#fff' : '#000'} 
            />
            <Text style={styles.infoCardText}>
              {isFirstDayUnlimited || isSubscribed ? (
                'Unlimited Scans'
              ) : (
                selectedMode === 'accurate' ? 
                  `${Math.max(0, 1 - freeAccurateScansUsed - 1)} left` :
                  isSubscribedPlus ?
                    `${20 - scanCount - 1} left` :
                    `${5 - scanCount - 1} left`
              )}
            </Text>
          </BlurView>

          {/* Processing Time Card */}
          <BlurView intensity={50} style={styles.infoCard}>
            <Icon 
              name="time-outline" 
              size={20} 
              color={colorScheme === 'dark' ? '#fff' : '#000'} 
            />
            <Text style={styles.infoCardText}>
              {showProcessingTime ? 
                `${processingTime}s` : 
                `~${getPredictedProcessingTime()}s`
              }
            </Text>
          </BlurView>
        </View>
      </View>
    </BlurView>
  )}
</Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {modalImageUri && (
              <View style={styles.imageContainer}>
                <Image 
                  source={{ 
                    uri: (typeof modalImageUri === 'string' && !modalImageUri.startsWith('data:image/jpeg;base64,')) 
                        ? 'data:image/jpeg;base64,' + modalImageUri 
                        : modalImageUri 
                  }} 
                  style={styles.imagePreview} 
                />
                {isLoading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#FFF' : '#000'}
                    />
                  </View>
                )}
              </View>
            )}
            {!isLoading && (
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={inputModalVisible}
        onRequestClose={() => setInputModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.inputModalView}>
            <Text style={styles.inputModalText}>Enter any extra details, it can be anything.</Text>
            <TextInput
              style={styles.input}
              onChangeText={setUserInput}
              value={userInput}
              placeholder="2 slices of watermelon, and a burger"
              keyboardType="default"
            />
            <TouchableOpacity
              style={styles.inputModalButton}
              onPress={submitUserInput}
            >
              <Text style={styles.inputModalButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isOverloadedError && (
        <BlurView
          intensity={30}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          style={[
            StyleSheet.absoluteFillObject,
            styles.overlayContainer,
            {
              position: 'absolute',
              width: width,
              height: height, 
              top: 0,
              left: 0,
              zIndex: 1001,
            }
          ]}
        >
          <Animated.View
            style={[
              styles.errorCard,
              { opacity: errorFadeAnim }
            ]}
          >
            <BlurView
              intensity={50}
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              style={styles.errorCardContent}
            >
              <MaterialCommunityIcons 
                name={errorType === 'overloaded' ? 'server-network-off' : 'alert-circle-outline'}
                size={40} 
                color={colorScheme === 'dark' ? '#FF453A' : '#FF3B30'} 
                style={styles.errorIcon}
              />
              <Text style={[
                styles.errorTitle,
                { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
              ]}>
                {errorType === 'overloaded' ? 'High Demand' : 'Error Occurred'}
              </Text>
              <Text style={[
                styles.errorMessage,
                { color: colorScheme === 'dark' ? '#AAAAAA' : '#666666' }
              ]}>
                {errorType === 'overloaded'
                  ? "Our servers are experiencing high demand right now. Please wait a moment and try again."
                  : "Something went wrong while processing your image. Please try again."}
              </Text>
              <View style={styles.errorButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.retryButton, styles.errorButton]}
                  onPress={() => {
                    Animated.timing(errorFadeAnim, {
                      toValue: 0,
                      duration: 300,
                      useNativeDriver: true,
                    }).start(() => {
                      setIsOverloadedError(false);
                      setErrorType(null);
                    });
                  }}
                >
                  <BlurView
                    intensity={60}
                    tint={colorScheme === 'dark' ? 'dark' : 'light'}
                    style={styles.retryButtonBlur}
                  >
                    <View style={styles.retryButtonContent}>
                      <Icon 
                        name="close" 
                        size={20} 
                        color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} 
                      />
                      <Text style={[
                        styles.retryButtonText,
                        { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
                      ]}>
                        Cancel
                      </Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.retryButton, styles.errorButton]}
                  onPress={handleRetry}
                >
                  <BlurView
                    intensity={60}
                    tint={colorScheme === 'dark' ? 'dark' : 'light'}
                    style={styles.retryButtonBlur}
                  >
                    <View style={styles.retryButtonContent}>
                      <Icon 
                        name="refresh" 
                        size={20} 
                        color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} 
                      />
                      <Text style={[
                        styles.retryButtonText,
                        { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
                      ]}>
                        Try Again
                      </Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>
        </BlurView>
      )}

      <FoodSelectionModal
        visible={showFoodSelectionModal}
        imageUri={selectedImage}
        onClose={() => setShowFoodSelectionModal(false)}
        onSubmit={handleFoodSelectionSubmit}
        colorScheme={colorScheme}
        selectedMode={selectedMode}
      />
      
      {showWhatsNew && <WhatsNew onClose={handleWhatsNewClose} />}
      {/* Move the ModeTooltip to the root level, just before the closing View of the container */}
      <ModeTooltip 
        visible={showModeTooltip} 
        onHide={() => {
          setShowModeTooltip(false);
          AsyncStorage.setItem('@has_seen_mode_tooltip', 'true');
        }}
        position={tooltipPosition}
        hideTooltipWithAnimation={() => {
          setShowModeTooltip(false);
          AsyncStorage.setItem('@has_seen_mode_tooltip', 'true');
        }}
        ref={tooltipRef}
      />
      {/* Add this before the closing View */}
      <ScanButtonTooltip 
        visible={showScanButtonTooltip} 
        onHide={() => {
          setShowScanButtonTooltip(false);
          AsyncStorage.setItem('@has_seen_scan_button_tooltip', 'true');
        }}
        position={scanButtonTooltipPosition}
        ref={scanButtonTooltipRef}
      />

      {/* Add this at the end of the ScrollView */}
      {showScrollToButtonIndicator && foodData && ( // Also check foodData here for rendering
        <Animated.View style={styles.scrollToButtonIndicator}>
          <TouchableOpacity 
            onPress={() => {
              mainScrollViewRef.current?.scrollToEnd({ animated: true });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.scrollToButton}
          >
            <Entypo name="chevron-down" size={28} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Add the SearchModeInfoSheet modal */}
      <SearchModeInfoSheet
        key={searchInfoSheetKey}
        visible={showSearchInfoSheet}
        onClose={() => setShowSearchInfoSheet(false)}
        onRevertChip={() => {
          // Revert to the previous mode
          setSelectedMode(prevMode);
          // Don't set hasSeenSearchInfoSheetThisSession to false so it can show again
          AsyncStorage.setItem('selectedMode', prevMode);
        }}
        onGetStarted={() => {
          // When user clicks "Get Started" mark it as seen in this session
          setHasSeenSearchInfoSheetThisSession(true);
          // Update the timestamp in AsyncStorage
          const currentTime = Date.now();
          AsyncStorage.setItem('@last_seen_search_info_sheet', currentTime.toString());
          // Trigger the pulse animation when user clicks Get Started
          startChipPulseAnimation();
        }}
      />

      {isOverloadedError && (
        <BlurView
          intensity={30}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          style={[
            StyleSheet.absoluteFillObject,
            styles.overlayContainer,
            {
              position: 'absolute',
              width: width,
              height: height, 
              top: 0,
              left: 0,
              zIndex: 1001,
            }
          ]}
        >
          <Animated.View
            style={[
              styles.errorCard,
              { opacity: errorFadeAnim }
            ]}
          >
            <BlurView
              intensity={50}
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              style={styles.errorCardContent}
            >
              <MaterialCommunityIcons 
                name={errorType === 'overloaded' ? 'server-network-off' : 'alert-circle-outline'}
                size={40} 
                color={colorScheme === 'dark' ? '#FF453A' : '#FF3B30'} 
                style={styles.errorIcon}
              />
              <Text style={[
                styles.errorTitle,
                { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
              ]}>
                {errorType === 'overloaded' ? 'High Demand' : 'Error Occurred'}
              </Text>
              <Text style={[
                styles.errorMessage,
                { color: colorScheme === 'dark' ? '#AAAAAA' : '#666666' }
              ]}>
                {errorType === 'overloaded'
                  ? "Our servers are experiencing high demand right now. Please wait a moment and try again."
                  : "Something went wrong while processing your image. Please try again."}
              </Text>
              <View style={styles.errorButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.retryButton, styles.errorButton]}
                  onPress={() => {
                    Animated.timing(errorFadeAnim, {
                      toValue: 0,
                      duration: 300,
                      useNativeDriver: true,
                    }).start(() => {
                      setIsOverloadedError(false);
                      setErrorType(null);
                    });
                  }}
                >
                  <BlurView
                    intensity={60}
                    tint={colorScheme === 'dark' ? 'dark' : 'light'}
                    style={styles.retryButtonBlur}
                  >
                    <View style={styles.retryButtonContent}>
                      <Icon 
                        name="close" 
                        size={20} 
                        color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} 
                      />
                      <Text style={[
                        styles.retryButtonText,
                        { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
                      ]}>
                        Cancel
                      </Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.retryButton, styles.errorButton]}
                  onPress={handleRetry}
                >
                  <BlurView
                    intensity={60}
                    tint={colorScheme === 'dark' ? 'dark' : 'light'}
                    style={styles.retryButtonBlur}
                  >
                    <View style={styles.retryButtonContent}>
                      <Icon 
                        name="refresh" 
                        size={20} 
                        color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} 
                      />
                      <Text style={[
                        styles.retryButtonText,
                        { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
                      ]}>
                        Try Again
                      </Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>
        </BlurView>
      )}

      {/* Use the new ManualInputModal component */}
      <ManualInputModal
        visible={manualInputModalVisible}
        onClose={() => setManualInputModalVisible(false)}
        onSubmit={handleManualInputSubmit}
      />
    </ScrollView>
  );
};

// Calculate scale factor based on screen size
const baseWidth = 430; // iPhone 14 Pro Max width
const baseHeight = 932; // iPhone 14 Pro Max height
const scaleWidth = width / baseWidth;
const scaleHeight = height / baseHeight;
const scale = Math.min(scaleWidth, scaleHeight);

  const getDynamicStyles = (colorScheme) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
    },
    scrollContentContainer: {
      paddingTop: isIphoneSE() ? 20 : 30 * scale,
      paddingBottom: 40 * scale,
    },
    mainContentContainer: {
      // Remove flex: 1 to allow content-based sizing
      paddingBottom: 20 * scale,
    },
    // Use a column layout for the buttons area
    buttonsColumnContainer: {
      flexDirection: 'column',
      alignItems: 'center', // Center items horizontally
      paddingHorizontal: 20 * scale,
      paddingVertical: 10 * scale,
      marginTop: 'auto', // Pushes buttons to the bottom
      backgroundColor: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
      gap: 15 * scale, // Add gap between the button row and the manual button
    },
    // Row layout for the top two buttons
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around', // Keep space around for the two buttons
      width: '100%', // Ensure the row takes full width
    },
    // Container for the manual input button to center it
    manualInputButtonContainer: {
      width: '80%', // Make the button wider but centered
      alignSelf: 'center',
    },
    // Style for the manual input button itself
    manualInputButton: {
      borderRadius: 25 * scale, // Rounded pill shape
      borderWidth: 1 * scale,
      borderColor: colorScheme === 'dark' ? '#333' : '#bbb',
      padding:8 * scale,
      paddingHorizontal: 20 * scale,
      shadowColor: colorScheme === 'dark' ? '#000' : '#AAA',
      shadowOffset: { width: 0, height: 2 * scale },
      shadowOpacity: 0.8 * scale,
      shadowRadius: 15 * scale,
      elevation: 1,
    },
    // Content layout for the manual input button
    manualInputButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center', // Center content within the button
    },
    manualInputButtonIcon: {
      marginRight: 10 * scale,
    },
    // Text style for the manual input button
    manualInputButtonText: {
      color: colorScheme === 'dark' ? '#d8d8d8' : '#333',
      textAlign: 'center',
      fontSize: 16 * scale,
      fontWeight: '500',
    },
    buttonContainerNoFood: {
      marginBottom: -80 * scale, // Add bottom margin when no food is present
    },
    scrollContainer: {
      flexGrow: 1,
      paddingHorizontal: 16 * scale,
      paddingBottom: 100 * scale, // Space for buttons
      minHeight: '100%', // This ensures content fills the space
    },
    noContentContainer: {
      flex: 1,
      justifyContent: 'center', // Changed from 'space-between' to 'center'
      alignItems: 'center',
      marginTop: 100 * scale,
      paddingHorizontal: 35 * scale,
      gap: 160 * scale, // Add gap to create space between text and buttons
    },
    scanCounterContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16 * scale,
      marginTop: 8 * scale,
    },
    scanCounter: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f0f0f0',
      borderRadius: 20 * scale,
      paddingHorizontal: 16 * scale,
      borderWidth: 1.5,
      borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
    },
    scanCounterContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5 * scale,
    },
    scanCounterText: {
      fontSize: 16 * scale,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#e0e0e0' : '#333333',
    },
    scanCounterLabel: {
      fontSize: 16 * scale,
      color: colorScheme === 'dark' ? '#888' : '#666',
      marginRight: 4 * scale,
    },
    modeChip: {
      backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#f0f0f0',
      paddingHorizontal: 12 * scale,
      borderRadius: 15 * scale,
      marginTop: 8 * scale,
      borderWidth: 1.5,
      borderColor: colorScheme === 'dark' ? '#3a3a3d' : '#e0e0e0',
      width: 100 * scale,
    },
    modeChipAccurate: {
      backgroundColor: colorScheme === 'dark' ? '#1a3f5c' : '#e1f0ff',
      borderColor: colorScheme === 'dark' ? '#234b6b' : '#b8d6f3',
    },
    modeChipSearch: {
      backgroundColor: colorScheme === 'dark' ? '#2c1a5c' : '#f0e1ff',
      borderColor: colorScheme === 'dark' ? '#3b236b' : '#d6b8f3',
    },
    modeChipText: {
      color: colorScheme === 'dark' ? '#e0e0e0' : '#333333',
      fontSize: 12 * scale,
      fontWeight: '500',
    },
    modeIcon: {
      marginRight: 8 * scale,
    },
    feedbackContainer: {
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2.5%',
      width: '100%',
      position: 'absolute',
      bottom: 80,
    },
    feedbackText: {
      fontSize: 15.5 * scale,
      color: colorScheme === 'dark' ? '#AAAAAA' : '#666666',
      marginBottom: 10 * scale,
    },
    iconButtonContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    icon: {
    marginRight: 10 * scale, // Space between icon and text
    },
    iconButton: {
      padding: 3 * scale,
      marginHorizontal: 30 * scale,
      backgroundColor: colorScheme === 'dark' ? '#e9e9e9' : '#DDD',
      borderRadius: 100 * scale,
    },
    inputModalView: {
      margin: 20 * scale,
      backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFFFFF',
      borderRadius: 25 * scale, // Slightly less rounded than before
      padding: 20 * scale,
      alignItems: 'center',
      shadowColor: colorScheme === 'dark' ? '#000' : '#999',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.5, // Reduced shadow
      shadowRadius: 10 * scale,
      elevation: 5,
      width: '90%', // Make modal wider
      maxWidth: 500, // Max width
    },
    inputModalTitle: {
      fontSize: 18 * scale,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#e9e9e9' : '#333333',
      marginBottom: 8 * scale,
    },
    // Multiline input specific style
    manualInput: {
      height: 100 * scale, // Taller for multiline
      marginVertical: 12 * scale,
      borderWidth: 1,
      padding: 10 * scale,
      width: '100%', // Use full width of modal
      borderColor: colorScheme === 'dark' ? '#4a4a4a' : '#CCCCCC',
      color: colorScheme === 'dark' ? '#c5c5c5' : '#333333',
      borderRadius: 10 * scale, // Less rounded input
      textAlignVertical: 'top', // Start text from the top
      backgroundColor: colorScheme === 'dark' ? '#222' : '#fdfdfd', // Slightly different background
    },
    // Style for the Cancel button in the manual input modal
    cancelModalButton: {
      marginTop: 10 * scale,
      padding: 10 * scale,
    },
    cancelModalButtonText: {
      color: colorScheme === 'dark' ? '#aaa' : '#666',
      fontSize: 14 * scale,
      fontWeight: '500',
      textAlign: 'center',
    },
    input: {
      height: 40 * scale,
      margin: 12 * scale,
      borderWidth: 2,
      padding: 10 * scale,
      width: 300 * scale,
      borderColor: colorScheme === 'dark' ? '#4a4a4a' : '#CCCCCC',
      color: colorScheme === 'dark' ? '#c5c5c5' : '#333333',
      borderRadius: 15 * scale,
    },
    inputModalButton: {
      backgroundColor: colorScheme === 'dark' ? '#2d2d2d' : '#F0F0F0',
      borderRadius: 90 * scale,
      padding: '4%',
      paddingHorizontal: '15%',
      elevation: 2,
      marginTop: '3%',
    },
    inputModalButtonText: {
      color: colorScheme === 'dark' ? 'white' : 'black',
      fontSize: 15 * scale,
      fontWeight: '500',
      textAlign: 'center',
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    inputModalText: {
      marginBottom: '2%',
      textAlign: 'center',
      fontSize: 15 * scale,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#e9e9e9' : '#333333',
    },
    scrollViewStyle: {
      flex: 1,
      borderRadius: 25,
    },
    title: {
      fontSize: 24 * scale,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      textAlign: 'center',
      marginBottom: 4 * scale,
      marginTop: 30 * scale,
      marginHorizontal: 25 * scale,
    },
    subtitle: {
      fontSize: 16 * scale,
      color: colorScheme === 'dark' ? '#888888' : '#555555',
      textAlign: 'center',
      marginBottom: 10 * scale,
      marginHorizontal: 25 * scale,
    },
    scrollContainer: {
      paddingBottom: 100 * scale,
      flexGrow: 1,
      paddingHorizontal: 16 * scale,
    },
    floatingButtonWrapper: {
      width: '100%',
    },
    button: {
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#000',
      borderRadius: 20 * scale,
      borderWidth: 2 * scale,
      borderColor: colorScheme === 'dark' ? '#222' : '#bbb',
      padding: 12 * scale,
      paddingHorizontal: 20 * scale,
      shadowColor: colorScheme === 'dark' ? '#000' : '#AAA',
      shadowOffset: { width: 0, height: 2 * scale },
      shadowOpacity: 0.8 * scale,
      shadowRadius: 15 * scale,
      elevation: 1,
    },
    buttonText: {
      color: colorScheme === 'dark' ? '#d8d8d8' : '#fff',
      textAlign: 'center',
      fontSize: 16 * scale,
    },
    foodImage: {
      width: '100%',
      height: '100%',
      borderRadius: 24 * scale,
    },
    placeholderContainer: {
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      borderRadius: 24 * scale,
      backgroundColor: colorScheme === 'dark' ? '#111' : '#EEE',
    },
    placeholderText: {
      color: colorScheme === 'dark' ? '#4a4a4a' : '#888888',
      fontSize: 16 * scale,
      fontWeight: '400',
    },
    tabContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 16 * scale,
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#F0F0F0',
      marginHorizontal: 15 * scale,
      borderRadius: 20 * scale,
      paddingVertical: 6 * scale,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
      position: 'relative',
      overflow: 'hidden',
    },
    tabIndicator: {
      position: 'absolute',
      bottom: 4,
      height: 3,
      backgroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      borderRadius: 90 * scale,
    },
    tabButton: {
      paddingVertical: 8 * scale,
      paddingHorizontal: 16 * scale,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeTabButton: {
      // Remove the border bottom since we're using the sliding indicator
    },
    tabButtonText: {
      color: colorScheme === 'dark' ? '#666' : '#888',
      fontSize: 16 * scale,
      fontWeight: '400',
    },
    activeTabButtonText: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontWeight: '500',
    },
    tabContentContainer: {
      backgroundColor: colorScheme === 'dark' ? '#131314' : '#F0F0F0',
      borderRadius: 24 * scale,
      overflow: 'hidden',
      marginBottom: 16 * scale,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#222' : '#ddd',
    },
    separator: {
      height: 2, // Reduced from 4
      backgroundColor: colorScheme === 'dark' ? '#333333' : '#CCCCCC',
      marginVertical: 4, // Reduced from 8
      marginBottom: 8, // Reduced from 16
      borderRadius: 900 * scale,
      marginHorizontal: 16 * scale,
    },
    nutrientRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 2 * scale,
    },
    nutrientLabel: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontSize: 17 * scale,
      fontWeight: '400',
    },
    nutrientValue: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontSize: 16 * scale,
      fontWeight: '500',
    },
    ingredientItem: {
      marginBottom: 5 * scale,
      paddingHorizontal: 16 * scale,
    },
    ingredientName: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontSize: 16 * scale,
      fontWeight: 'bold',
      marginBottom: 4 * scale,
    },
    ingredientDescription: {
      color: '#888888',
      fontSize: 14 * scale,
      paddingBottom: 8 * scale,

    },
    detailText: {
      color: colorScheme === 'dark' ? '#ccc' : '#555',
      fontSize: 16 * scale,
      marginBottom: 20 * scale,
      padding: 16 * scale,
    },
    detailPrepTime: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontSize: 16 * scale,
      fontWeight: '500',
      marginBottom: 8 * scale,
      paddingHorizontal: 16 * scale,
    },
    detailServingSize: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontSize: 16 * scale,
      fontWeight: '500',
      marginBottom: 8 * scale,
      paddingHorizontal: 16 * scale,
    },
    wikipediaLink: {
      color: '#3498DB',
      fontSize: 16 * scale,
      textDecorationLine: 'underline',
      marginTop: 0,
      padding: 16 * scale,
    },
    ingredientDescriptionNote: {
      color: '#888888',
      fontSize: 14 * scale,
      marginBottom: 10 * scale,
      textAlign: 'center',
      padding: 16 * scale,
      paddingBottom: 0,
    },
    feedbackContainer: {
      position: 'absolute',
      bottom: 20,
      left: 0,
      right: 0,
      alignItems: 'center',
      marginBottom: 24 * scale,
    },
    feedbackText: {
      color: '#888888',
      fontSize: 14 * scale,
      marginBottom: 8 * scale,
    },
    feedbackButtons: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    feedbackButton: {
      backgroundColor: colorScheme === 'dark' ? '#333333' : '#CCC',
      width: 40 * scale,
      height: 40 * scale,
      borderRadius: 20 * scale,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 8 * scale,
    },
    modalBackground: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.2)', // Slightly transparent background
    },
    loadingTextContainer: {
      height: 30 * scale,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 10 * scale,
    },
    loadingText: {
      color: colorScheme === 'dark' ? '#a9a9a9' : '#555',
      fontWeight: '500',
      fontSize: 16 * scale,
      textAlign: 'center',
    },
    scrollPlaceholderContainer: {
      flexGrow: 1,
      marginBottom: 450 * scale,
      marginHorizontal: 35 * scale,
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      paddingBottom: 100 * scale,
    },
    imageContainer: {
      width: '90%',
      height: 200 * scale,
      borderRadius: 24 * scale,
      marginBottom: 16 * scale,
      backgroundColor: colorScheme === 'dark' ? '#111' : '#EEE',
      marginHorizontal: 20 * scale,
      position: 'relative', // Add this to position children absolutely
    },
    imageWrapper: {
      width: '100%',
      height: '100%',
      position: 'relative',
    },
    controlsOverlay: {
      position: 'absolute',
      top: 12,
      left: 12,
      right: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      zIndex: 2,
    },
    tooltip: {
      position: 'absolute',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderRadius: 20 * scale,
      padding: 10 * scale,
      top: -80,
      left: '50%',
      transform: [{ translateX: -75 * scale }],
      width: 180,
      alignItems: 'center',
    },
    tooltipText: {
      color: '#FFFFFF',
      fontSize: 14 * scale,
      textAlign: 'center',
    },
    barcodeIconContainer: {
      position: 'absolute',
      bottom: 10,
      left: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderRadius: 14 * scale,
      padding: 7 * scale,
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
      // Add these to show it's interactive
      opacity: 1,
      activeOpacity: 0.7,
    },
    processingTimeText: {
      color: colorScheme === 'dark' ? '#a9a9a9' : '#555',
      fontWeight: '400',
      fontSize: 14 * scale,
      textAlign: 'center',
      marginTop: 8 * scale,
    },
    chip: {
      paddingHorizontal: 12 * scale,
      paddingVertical: 6 * scale,
      borderRadius: 15 * scale,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
      overflow: 'hidden',
    },
    chipContainer: {
      borderRadius: 15 * scale,
      overflow: 'hidden',
    },
    chipAccurate: {
      borderColor: 'rgba(66, 135, 245, 0.5)',
      backgroundColor: 'rgba(66, 135, 245, 0.3)',
    },
    chipContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6 * scale,
      justifyContent: 'center', // Add this to keep content centered during animation
    },
    chipTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4 * scale,
    },
    betaTagContainer: {
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#E5E5EA',
      borderRadius: 8 * scale,
      overflow: 'hidden',
      marginLeft: 4 * scale,
    },
    betaTagText: {
      fontSize: 11 * scale,
      color: '#007AFF',
      fontWeight: '600',
      paddingHorizontal: 11 * scale,
      paddingVertical: 3 * scale,
    },
    chipLabel: {
      fontSize: 14 * scale,
      fontWeight: '400',
    },
    chipText: {
      fontSize: 14 * scale,
      fontWeight: '500',
    },
    scrollIndicatorOpacity: {
      position: 'absolute',
      bottom: 20,
      alignSelf: 'center',
      backgroundColor: colorScheme === 'dark' ? '#000' : '#eee',
      shadowColor: colorScheme === 'dark' ? '#000' : '#aaa',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 10 * scale,
      borderRadius: 200 * scale,
      padding: 3 * scale,
    },
    modalBackground: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingCard: {
      width: '90%',
      maxWidth: 400,
      alignItems: 'center',
      paddingVertical: 30 * scale,
    },
    loadingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24 * scale,
    },
    modeIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      paddingHorizontal: 12 * scale,
      paddingVertical: 6 * scale,
      borderRadius: 12 * scale,
    },
    modeText: {
      color: colorScheme === 'dark' ? '#fff' : '#000',
      marginLeft: 8 * scale,
      fontWeight: '500',
    },
    scanCounter: {
      backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      paddingHorizontal: 12 * scale,
      paddingVertical: 6 * scale,
      borderRadius: 12 * scale,
    },
    scanCounterText: {
      color: colorScheme === 'dark' ? '#fff' : '#fff',
      fontWeight: '500',
    },
    loadingContent: {
      alignItems: 'center',
      marginBottom: 30 * scale,
    },
    loadingTextContainer: {
      marginTop: 20 * scale,
      alignItems: 'center',
      paddingHorizontal: 20 * scale,
    },
    estimatedTimeContainer: {
      borderTopWidth: 1,
      borderTopColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      paddingTop: 16 * scale,
      marginTop: 8 * scale,
    },
    estimatedTimeText: {
      color: colorScheme === 'dark' ? '#999' : '#666',
      fontSize: 14 * scale,
      textAlign: 'center',
    },
    modalBackground: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    loadingCard: {
      width: '90%',
      maxWidth: 400,
      alignItems: 'center',
      paddingVertical: 30 * scale,
    },
    modeBadgeContainer: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 30 * scale,
    },
    modeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20 * scale,
      paddingVertical: 12 * scale,
      borderRadius: 20 * scale,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
      backgroundColor: colorScheme === 'dark' ? 'transparent' : 'rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
    },
    modeBadgeText: {
      color: colorScheme === 'dark' ? '#fff' : '#000',
      fontSize: 18 * scale,
      fontWeight: '600',
      marginLeft: 10 * scale,
    },
    loadingContent: {
      alignItems: 'center',
      marginBottom: 30 * scale,
    },
    loadingTextContainer: {
      marginTop: 20 * scale,
      alignItems: 'center',
      paddingHorizontal: 20 * scale,
    },
    loadingText: {
      color: colorScheme === 'dark' ? '#fff' : '#000',
      fontSize: 16 * scale,
      fontWeight: '500',
      textAlign: 'center',
    },
    infoCardsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 10 * scale,
      paddingHorizontal: 20 * scale,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16 * scale,
      paddingVertical: 12 * scale,
      borderRadius: 16 * scale,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
      backgroundColor: colorScheme === 'dark' ? 'transparent' : 'rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
    },
    infoCardText: {
      color: colorScheme === 'dark' ? '#fff' : '#000',
      fontSize: 15 * scale,
      fontWeight: '500',
      marginLeft: 8 * scale,
    },
    logo: {
      width: 60 * scale,
      height: 60 * scale,
      position: 'absolute',
      top: isIphoneSE() ? 10 * scale : 50 * scale,
      left: 20 * scale,
    },
    macroGridContainer: {
      flexDirection: 'column',
      justifyContent: 'flex-start',
      padding: 8 * scale, // Reduced from 12 * scale
      gap: 4 * scale, // Reduced from 6 * scale
    },

    macroCard: {
      width: '100%',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5',
      borderRadius: 18 * scale,
      padding: 12 * scale,
      height: 100 * scale,
      marginBottom: 6 * scale, // Reduced from 8 * scale
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5E5',
      flexDirection: 'column',
      justifyContent: 'flex-start',
    },

    macroHeaderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 8 * scale,
    },

    iconLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    iconContainer: {
      width: 40 * scale,
      height: 40 * scale,
      borderRadius: 15 * scale,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8 * scale,
      marginLeft: 5 * scale,
      overflow: 'hidden',
    },

    macroLabel: {
      fontSize: 16 * scale,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },

    macroValueContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginRight: 10 * scale,
    },

    macroValue: {
      fontSize: 24 * scale,
      fontWeight: '700',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },

    macroUnit: {
      fontSize: 14 * scale,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#999999' : '#666666',
      marginLeft: 4 * scale,
    },

    errorBarContainer: {
      position: 'absolute',
      bottom: 0,
      left: 20,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      width: '95%',
      gap: 8 * scale,
      marginTop: 8 * scale,
      paddingBottom: 10 * scale,
    },

    errorBar: {
      height: 10 * scale,
      borderRadius: 100 * scale,
      flex: 1,
      overflow: 'hidden',
    },

    errorBarFill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      borderRadius: 100 * scale,
    },

    errorText: {
      fontSize: 12 * scale,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#999999' : '#666666',
      minWidth: 45 * scale,
      textAlign: 'right',
    },

    floatingButtonContainer: {
      position: 'absolute',
      bottom: 20 * scale,
      left: 0,
      right: 0,
      zIndex: 1000,
    },

    floatingButton: {
      shadowColor: colorScheme === 'dark' ? '#000' : '#666',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4.65 * scale,
      elevation: 8,
      zIndex: 1000,
    },

    buttonsWrapper: {
      width: '100%',
      paddingHorizontal: 0,
      marginBottom: 20 * scale,
    },

    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 30 * scale,
      width: '100%',
    },

    floatingButton: {
      shadowColor: colorScheme === 'dark' ? '#000' : '#666',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4.65 * scale,
      elevation: 8,
      zIndex: 1000,
    },

    nutrientPage: {
    width: (width - 34), // Account for container padding
      alignItems: 'center',
    },

    paginationDots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: -2 * scale,
      marginBottom: 8 * scale,
      gap: 8 * scale,
    },

    paginationDot: {
      width: 8 * scale,
      height: 8 * scale,
      borderRadius: 4 * scale,
    },
    placeholderTextInScroll: {
      color: colorScheme === 'dark' ? '#4a4a4a' : '#888888',
      fontSize: 16 * scale,
      fontWeight: '400',
      textAlign: 'center',
    },
    scrollIndicator: {
      position: 'absolute',
      bottom: 20,
      alignSelf: 'center',
      backgroundColor: colorScheme === 'dark' ? '#000' : '#eee',
      shadowColor: colorScheme === 'dark' ? '#000' : '#aaa',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 10,
      borderRadius: 200,
      padding: 3 * scale,
    },
    overlayContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      elevation: 5, // For Android
    },
    overlayText: {
      fontSize: 18,
      fontWeight: '500',
      marginBottom: 20,
      textAlign: 'center',
      paddingHorizontal: 30,
    },
    retryButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    errorCard: {
      width: '85%',
      maxWidth: 400,
      marginHorizontal: 'auto',
      alignSelf: 'center',
      borderRadius: 30,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#444' : '#ccc',
    },
    errorCardContent: {
      padding: 24,
      alignItems: 'center',
    },
    errorIcon: {
      marginBottom: 16,
    },
    errorTitle: {
      fontSize: 22,
      fontWeight: '600',
      marginBottom: 8,
      textAlign: 'center',
    },
    errorMessage: {
      fontSize: 16,
      fontWeight: '400',
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 22,
    },
    retryButton: {
      width: '100%',
      overflow: 'hidden',
      borderRadius: 15,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#444' : '#ccc',
    },
    retryButtonBlur: {
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    retryButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    debugChipContainer: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      borderRadius: 15 * scale,
      overflow: 'hidden',
      zIndex: 10,
    },
    debugChip: {
      paddingHorizontal: 12 * scale,
      paddingVertical: 6 * scale,
      borderRadius: 15 * scale,
      borderWidth: 1,
      borderColor: '#333',  // always dark-style
      backgroundColor: 'rgba(0,0,0,0.5)',  // always dark-style
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6 * scale,
    },
    errorButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
      width: '100%',
    },
    errorButton: {
      flex: 1,
    },
    loadingText: {
      fontSize: 16,
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      marginTop: 16,
      textAlign: 'center',
    },
    loadingTextContainer: {
      height: 80,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchLoadingContainer: {
      width: '100%',
      paddingHorizontal: 16,
      marginTop: 16,
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.85)',
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    searchInfoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colorScheme === 'dark' ? 'rgba(60, 60, 60, 0.7)' : 'rgba(240, 240, 240, 0.9)',
      borderLeftWidth: 3,
      borderLeftColor: colorScheme === 'dark' ? '#5e72e4' : '#5e72e4',
    },
    searchInfoLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#CCCCCC' : '#444444',
      marginRight: 8,
    },
    searchInfoValue: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      fontWeight: '500',
      flex: 1,
      textAlign: 'right',
    },
    processingTimeText: {
      fontSize: 13,
      color: colorScheme === 'dark' ? '#AAA' : '#666',
      fontStyle: 'italic',
    },
    noDataText: {
      fontSize: 16,
      color: colorScheme === 'dark' ? '#999999' : '#666666',
      textAlign: 'center',
      marginTop: 20,
      fontStyle: 'italic',
    },
    detailSectionTitle: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      fontSize: 18,
      fontWeight: '600',
      marginVertical: 16,
      paddingHorizontal: 16,
    },
    sourceItem: {
      padding: 12 * scale,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#333333' : '#E0E0E0',
      marginBottom: 8 * scale,
    },
    sourceTitle: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      fontSize: 16 * scale,
      fontWeight: '500',
      marginBottom: 4 * scale,
    },
    sourceUrl: {
      color: colorScheme === 'dark' ? '#64B5F6' : '#1976D2',
      fontSize: 14 * scale,
      marginBottom: 6 * scale,
    },
    sourceSnippet: {
      color: colorScheme === 'dark' ? '#BBBBBB' : '#555555',
      fontSize: 14 * scale,
    },
    searchStatusContainer: {
      width: '100%',
      padding: 16,
      marginTop: 16,
      borderRadius: 12,
      backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    searchStatusItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 8,
      gap: 8,
    },
    searchStatusText: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      fontSize: 14,
    },
    preparationItem: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    urlListContainer: {
      width: '100%',
      maxHeight: 100,
      borderRadius: 12,
      marginTop: 8,
      padding: 8,
    },
    urlScrollView: {
      flexGrow: 0,
    },
    urlItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    urlText: {
      fontSize: 12,
      flexShrink: 1,
    },
    detailLabel: {
      color: colorScheme === 'dark' ? '#BBBBBB' : '#444444',
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 8,
    },
    detailValue: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      fontSize: 15,
      marginBottom: 8,
      lineHeight: 22,
    },
    
    // New styles for enhanced details tab
    detailSection: {
      marginVertical: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colorScheme === 'dark' ? '#252529' : '#F8F8F8',
      borderRadius: 12,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#353535' : '#E5E5E5',
    },
    sectionHeader: {
      fontSize: 17,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#222222',
      marginTop: 10,
      marginBottom: 6,
      paddingBottom: 2,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#333333' : '#EEEEEE',
    },
    sectionHeaderText: {
      fontSize: 17,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      marginLeft: 8,
    },
    detailText: {
      fontSize: 15,
      lineHeight: 22,
      color: colorScheme === 'dark' ? '#DDDDDD' : '#444444',
      paddingVertical: 4,
    },
    stepText: {
      fontSize: 15,
      lineHeight: 24,
      color: colorScheme === 'dark' ? '#DDDDDD' : '#333333',
      marginBottom: 8,
      paddingLeft: 4,
    },
    stepNumber: {
      fontSize: 15,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      marginRight: 8,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12 * scale,
      paddingHorizontal: 16 * scale,
    },
    linkTextContainer: {
      flex: 1,
      marginLeft: 12,
    },
    linkTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },
    linkSubtitle: {
      fontSize: 13,
      color: colorScheme === 'dark' ? '#BBBBBB' : '#666666',
      marginTop: 2,
    },
    sourceLinkText: {
      fontSize: 14,
      color: '#3498DB',
      marginLeft: 8,
      flex: 1,
    },
    emptyStateContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      marginTop: 16,
    },
    detailsScrollView: {
      flex: 1,
    },
    summaryText: {
      color: '#888888',
      fontSize: 14 * scale,
      paddingBottom: 8 * scale,
    },
    infoBadgeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 24,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    infoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    infoBadgeText: {
      fontSize: 15,
      color: colorScheme === 'dark' ? '#AAAAAA' : '#555555',
      marginLeft: 8,
    },
    sectionDivider: {
      height: 2,
      backgroundColor: colorScheme === 'dark' ? '#444444' : '#DDDDDD',
      marginVertical: 12,
      width: '100%',
      borderRadius: 1,
    },
    detailSection: {
      marginBottom: 16,
      paddingBottom: 8,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      marginHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#333333',
      marginLeft: 8,
    },
    stepRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    stepBullet: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colorScheme === 'dark' ? '#333333' : '#EEEEEE',
      textAlign: 'center',
      lineHeight: 24,
      fontSize: 14,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#333333',
      marginRight: 12,
      overflow: 'hidden',
    },
    stepText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
      color: colorScheme === 'dark' ? '#DDDDDD' : '#444444',
    },
    resourceLink: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 6,
      marginHorizontal: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderRadius: 8,
    },
    resourceIconWrapper: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colorScheme === 'dark' ? '#333333' : '#EEEEEE',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    resourceText: {
      flex: 1,
      fontSize: 15,
      color: colorScheme === 'dark' ? '#DDDDDD' : '#444444',
    },
    emptyStateContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      flex: 1,
    },
    noDataText: {
      marginTop: 16,
      fontSize: 16,
      color: colorScheme === 'dark' ? '#999999' : '#666666',
      textAlign: 'center',
    },
    
    // New updated styles
    tabScrollView: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 8,
    },
    sectionHeader: {
      fontSize: 17,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#222222',
      marginTop: 10,
      marginBottom: 6,
      paddingBottom: 2,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#333333' : '#EEEEEE',
    },
    summaryText: {
      color: colorScheme === 'dark' ? '#DDDDDD' : '#444444',
      fontSize: 15,
      lineHeight: 20,
      marginBottom: 8,
    },
    infoLabel: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontSize: 16 * scale,
      fontWeight: 'bold',
      marginBottom: 4 * scale,
    },
    infoValue: {
      color: '#888888',
      fontSize: 14 * scale,
      paddingBottom: 4 * scale,
    },
    stepNumber: {
      fontSize: 16 * scale,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      marginRight: 6,
      width: 18,
    },
    stepText: {
      color: '#888888',
      fontSize: 14 * scale,
      lineHeight: 18,
      flex: 1,
      paddingBottom: 4 * scale,
    },
    visibleDivider: {
      height: 2,
      backgroundColor: colorScheme === 'dark' ? '#444444' : '#DDDDDD',
      marginVertical: 6,
      marginHorizontal: 0,
      width: '100%',
    },
    wikiButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#242424' : '#FFFFFF',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 50,
      marginVertical: 5,
      marginHorizontal: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 3,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#3a3a3a' : '#EEEEEE',
    },
    wikiButtonText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#DDDDDD' : '#333333',
      marginRight: 8,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      marginBottom: 3,
    },
    linkIcon: {
      marginRight: 6,
    },
    linkText: {
      color: colorScheme === 'dark' ? '#64B5F6' : '#1976D2',
      fontSize: 15 * scale,
      flex: 1,
      marginRight: 8 * scale,
    },
    noDataText: {
      fontSize: 16,
      color: colorScheme === 'dark' ? '#999999' : '#666666',
      textAlign: 'center',
      marginTop: 32,
      marginHorizontal: 24,
    },
    visibleDivider: {
      height: 2,
      backgroundColor: colorScheme === 'dark' ? '#444444' : '#DDDDDD',
      marginVertical: 6,
      marginHorizontal: 0,
      width: '100%',
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    infoIcon: {
      marginRight: 6,
    },
    stepRow: {
      flexDirection: 'row',
      paddingRight: 8,
      marginBottom: 4,
    },
    // Updated styles for both tabs
    factsContainer: {
      paddingHorizontal: 16 * scale,
      paddingTop: 10 * scale,
      paddingBottom: 10 * scale,
    },
    
    factRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 6 * scale,
      marginBottom: 10 * scale,
      flexWrap: 'wrap',
    },
    
    factLabel: {
      color: colorScheme === 'dark' ? '#BBBBBB' : '#666666',
      fontSize: 15 * scale,
      fontWeight: '500',
      width: 100 * scale,
      marginRight: 8 * scale,
    },
    
    factValue: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      fontSize: 16 * scale,
      fontWeight: '600',
      flex: 1,
      flexWrap: 'wrap',
    },
    
    stepRow: {
      flexDirection: 'row',
      paddingVertical: 8 * scale,
      paddingHorizontal: 10 * scale,
    },
    
    stepNumber: {
      width: 24 * scale,
      height: 24 * scale,
      borderRadius: 12 * scale,
      backgroundColor: colorScheme === 'dark' ? '#333333' : '#F0F0F0',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      textAlign: 'center',
      lineHeight: 24 * scale,
      fontSize: 14 * scale,
      fontWeight: '600',
      marginRight: 10 * scale,
      overflow: 'hidden',
    },
    
    stepText: {
      flex: 1,
      fontSize: 15 * scale,
      lineHeight: 22 * scale,
      color: colorScheme === 'dark' ? '#DDDDDD' : '#444444',
    },
    
    stepsContainer: {
      paddingVertical: 10 * scale,
      paddingHorizontal: 16 * scale,
    },
    
    linksContainer: {
      padding: 12 * scale,
    },
    
    linkRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8 * scale,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#333333' : '#E0E0E0',
    },
    
    linkText: {
      color: colorScheme === 'dark' ? '#64B5F6' : '#1976D2',
      fontSize: 15 * scale,
      flex: 1,
      marginRight: 8 * scale,
    },
    
    summaryText: {
      color: '#888888', 
      fontSize: 14 * scale,
      paddingBottom: 8 * scale,
      paddingHorizontal: 16 * scale,
      lineHeight: 20 * scale,
    },
    
    ingredientInstructions: {
      color: colorScheme === 'dark' ? '#BBBBBB' : '#666666',
      fontSize: 14 * scale,
      fontStyle: 'italic',
      paddingHorizontal: 16 * scale,
      paddingVertical: 8 * scale,
    },
    
    ingredientContainer: {
      paddingHorizontal: 12 * scale,
      paddingVertical: 8 * scale,
    },
    
    ingredientNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4 * scale,
    },
    
    ingredientIconContainer: {
      width: 22 * scale,
      height: 22 * scale,
      borderRadius: 11 * scale,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8 * scale,
      overflow: 'hidden',
    },
    
    ingredientDivider: {
      height: 1 * scale,
      backgroundColor: colorScheme === 'dark' ? '#333333' : '#EEEEEE',
      marginHorizontal: 12 * scale,
    },
    
    noDataText: {
      marginTop: 16 * scale,
      marginBottom: 16 * scale,
      fontSize: 16 * scale,
      color: colorScheme === 'dark' ? '#999999' : '#666666',
      textAlign: 'center',
      paddingHorizontal: 20 * scale,
    },
    
    scrollToButtonIndicator: {
      position: 'absolute',
      bottom: 30,
      right: 20,
      zIndex: 1000,
    },
    scrollToButton: {
      backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      borderRadius: 30,
      padding: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 20 * scale,
    },
    
    multiScanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5',
      paddingHorizontal: 12 * scale,
      paddingVertical: 6 * scale,
      borderRadius: 16 * scale,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
    },
    
    multiScanText: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      fontSize: 14 * scale,
      fontWeight: '500',
      marginLeft: 6 * scale,
    },
    queriesContainer: {
      marginTop: 10,
      paddingHorizontal: 10 * scale,
    },
    queryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8 * scale,
      paddingHorizontal: 8 * scale,
      marginBottom: 6 * scale,
      backgroundColor: colorScheme === 'dark' ? '#252525' : '#f0f0f0',
      borderRadius: 8,
    },
    queryText: {
      marginLeft: 8 * scale,
      fontSize: 14 * scale,
      fontWeight: '400',
      color: colorScheme === 'dark' ? '#e0e0e0' : '#333',
    },
    resultsContainer: {
      marginTop: 10,
      paddingHorizontal: 10 * scale,
    },
    resultItem: {
      marginBottom: 12 * scale,
      paddingVertical: 8 * scale,
      paddingHorizontal: 8 * scale,
      backgroundColor: colorScheme === 'dark' ? '#252525' : '#f0f0f0',
      borderRadius: 8,
    },
    resultTitle: {
      fontSize: 15 * scale,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#e0e0e0' : '#333',
      marginBottom: 4 * scale,
    },
    resultUrl: {
      fontSize: 13 * scale,
      color: colorScheme === 'dark' ? '#64B5F6' : '#1976D2',
      marginBottom: 6 * scale,
    },
    resultSnippet: {
      fontSize: 13 * scale,
      color: colorScheme === 'dark' ? '#bbb' : '#555',
      lineHeight: 18 * scale,
    },
    noSearchContainer: {
      padding: 16 * scale,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noSearchText: {
      fontSize: 16 * scale,
      color: colorScheme === 'dark' ? '#aaa' : '#666',
      textAlign: 'center',
    },
    searchLoadingSquare: {
      width: 100 * scale,
      height: 100 * scale,
      backgroundColor: '#FF0000', // Red square
      borderRadius: 8 * scale,
    },
    searchLoadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      paddingBottom: 24 * scale,
    },
    cancelButton: {
      marginTop: 20 * scale,
      borderRadius: 200 * scale,
      width: 120 * scale,
    },
    cancelButtonBlur: {
      paddingVertical: 12 * scale,
      paddingHorizontal: 20 * scale,
      borderRadius: 100 * scale,
      borderWidth: 2, // Match border width
      overflow: 'hidden',
      // Use the same border color as the header
      borderColor: colorScheme === 'dark' ? 'rgba(51, 51, 51, 0.5)' : '#bbb',
      // Apply a semi-transparent background similar to the header
      backgroundColor: colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
    },
    cancelButtonText: {
      color: 'rgb(255, 59, 48)',
      fontSize: 16 * scale,
      fontWeight: '600',
      textAlign: 'center',
    },
    cancelButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6 * scale,
    },
    // Styles for the new search header
    searchHeaderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 5 * scale, // Space below the header
      padding: 12 * scale, // Adjusted padding
      paddingHorizontal: 15 * scale,
      backgroundColor: colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.85)', // Match visualization background
      borderColor: colorScheme === 'dark' ? 'rgba(51, 51, 51, 0.5)' : '#bbb', // Match visualization border color
      borderWidth: 2, // Match visualization border width
      borderRadius: 25, // Match visualization border radius
      overflow: 'hidden', // Ensure content stays within rounded corners
    },
    searchHeaderIconGradient: {
      width: 50 * scale,
      height: 50 * scale,
      borderRadius: 15 * scale, // Rounded square
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
      marginRight: 12 * scale, // Space between icon and text
    },
    searchHeaderIconOverlay: {
      position: 'absolute',
      zIndex: 1,
    },
    searchHeaderText: {
      fontSize: 24 * scale,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      letterSpacing: 0.5 * scale,
    },
  });

export default FoodScanScreen;