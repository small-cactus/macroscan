import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigationState } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
  Modal, Alert, useColorScheme, Animated, Linking, TextInput, Dimensions, Platform, AppState,
  LayoutAnimation,
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

const useOpenAI = false; // Set to true to use OpenAI, false to use Anthropic

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
  accurate: 'Accurate Mode'
};

const FoodScanScreen = () => {
  // Add debug flag at the top of the component
  const DEBUG_MODE = false; // Set to false for production

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
  const { user } = useUser();
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
    return LOADING_TEXTS[mode] || LOADING_TEXTS.fast; // Default to 'fast' if mode not found
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
      setLoadingTextQueue((prevQueue) => [...prevQueue, "Still working on it..."]);
    }, averageTime + 2000); // 2 seconds after average time
  };

  // Update the startLoadingAnimation function
  const startLoadingAnimation = () => {
    if (isAnimationRunningRef.current) return;
    isAnimationRunningRef.current = true;
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
      // console.log(`Scheduling "Taking longer than usual..." at ${averageTime + 2000} ms`);
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
  
  if (loadingTimeoutRef.current) {
    clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = null;
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
  
  useEffect(() => {
    const initializeAppData = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
  
        // 1) Check the existing "dateLastUsed"
        const dateLastUsed = await AsyncStorage.getItem('dateLastUsed');
        // Remove the log printing dateLastUsed
        // console.log('[INIT] dateLastUsed:', dateLastUsed, ' vs. today:', today);
  
        // 2) Check "firstUseDate"
        const firstUseDate = await AsyncStorage.getItem('firstUseDate');
        if (!firstUseDate) {
          // If no firstUseDate, set it to today
          await AsyncStorage.setItem('firstUseDate', today);
          setIsFirstDayUnlimited(true);
          setScanCount(0);
        } else {
          setIsFirstDayUnlimited(firstUseDate === today);
        }
  
        // 3) If the date changed since last use, reset daily counters
        if (dateLastUsed !== today) {
          // Removed the reset-counter log:
          // console.log('[INIT] Resetting daily counters because date changed.');
          await AsyncStorage.setItem('dailyScanCount', '0');
          await AsyncStorage.setItem('dateLastUsed', today);
          await AsyncStorage.setItem('freeAccurateScansUsed', '0');
          setFreeAccurateScansUsed(0);
          setScanCount(0);
        } else {
          // If the date is the same, load existing counters
          const count = await AsyncStorage.getItem('dailyScanCount');
          setScanCount(parseInt(count, 10) || 0);
  
          // Also load how many accurate scans used
          const accurateScansUsed = await AsyncStorage.getItem('freeAccurateScansUsed');
          setFreeAccurateScansUsed(parseInt(accurateScansUsed, 10) || 0);
          // Removed log:
          // console.log('[INIT] freeAccurateScansUsed =', accurateScansUsed);
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
      }
    };
  
    initializeAppData();
  }, []);

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

  const getTimeUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const millisTillMidnight = midnight.getTime() - now.getTime();
    const hours = Math.floor(millisTillMidnight / (1000 * 60 * 60));
    const minutes = Math.floor((millisTillMidnight % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} hours and ${minutes} minutes`;
  };

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
    scrollViewRef.current?.scrollToEnd({ animated: true });
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
      // Removed logging of product details to avoid logging sensitive base64 data:
      // console.log('Storing product details:', JSON.stringify(productDetailsWithDate, null, 2));
      
      existingHistory.push(productDetailsWithDate);
      const newHistoryJson = JSON.stringify(existingHistory);
      await AsyncStorage.setItem('@product_history', newHistoryJson);
    } catch (e) {
      console.error("Error storing product details: ", e);
    }
  };

// Update handleAccurateScanUsed to persist the count
const handleAccurateScanUsed = async () => {
  if (!isSubscribed && !isFirstDayUnlimited && selectedMode === 'accurate') {
    const newVal = freeAccurateScansUsed + 1;
    setFreeAccurateScansUsed(newVal);
    await AsyncStorage.setItem('freeAccurateScansUsed', newVal.toString());
    if (newVal >= 1) {
      setSelectedMode('fast');
      await AsyncStorage.setItem('selectedMode', 'fast');
      await AsyncStorage.getItem('selectedMode');
      console.log('Selected Mode:', selectedMode);
      Alert.alert(
        'Accurate Scan Used',
        'You have used your 1 accurate scan for today. Switching back to Fast Mode.'
      );
    }
  }
};

// Modified pickImage to reflect daily accurate-scan usage
const pickImage = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
  if (isFirstDayUnlimited || isSubscribed) {
    navigation.navigate('CameraScreen');
  } else if ((isSubscribedPlus && scanCount < 20) || (!isSubscribed && scanCount < 5)) {
    // Check if accurate scan limit is reached for free users
    if (
      !isSubscribed &&
      !isFirstDayUnlimited &&
      selectedMode === 'accurate' &&
      freeAccurateScansUsed >= 1
    ) {
      Alert.alert(
        'No Accurate Scans Left',
        'You have used your 1 accurate scan for today. Fast mode has automatically been selected. Upgrade for more accurate scans.'
      );
      setSelectedMode('fast');
      await AsyncStorage.setItem('selectedMode', 'fast');
      await AsyncStorage.getItem('selectedMode');
      console.log('Selected Mode:', selectedMode);
      return;
    }

    navigation.navigate('CameraScreen');
  } else {
    // Show paywall when no scans left
    try {
      await Superwall.shared.register('no-scans');
      console.log('Paywall shown for no scans left');
    } catch (error) {
      console.error('Error showing paywall:', error);
      // Fallback to alert if paywall fails
      const timeLeft = getTimeUntilMidnight();
      Alert.alert(
        "No More Scans Left",
        `You have reached your daily scan limit. Please wait ${timeLeft} for more scans or upgrade for unlimited access.`
      );
    }
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
      
      const currentModel = getModel(provider, { 
        selectedMode: selectedMode,
        selectedModel: selectedModel,
        hasDrawing: hasDrawing 
      });
      setSelectedModel(currentModel);

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
    
      let foodFound = false;

      // Get the appropriate API key based on provider
      const apiKeyMap = {
        anthropic: '@apikey',
        openai: '@openai_api_key',
        gemini: '@gemini_api_key'
      };

      const apiKey = await AsyncStorage.getItem(apiKeyMap[provider]);
      if (!apiKey) {
        console.error(`API key not found for provider: ${provider}`);
        Alert.alert('Error', `API key not found for ${provider}`);
        setIsLoading(false);
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
        handleAccurateScanUsed,
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
          foodFound = await handleAnthropicScan(providerParams);
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
      setActiveTab(newTab);
      fadeInTab();
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
      if (activeTab === 'Nutrition') {
        triggerMacroAnimations();
      } else {
        // Reset animations when switching away from nutrition tab
        cardAnimations.forEach(anim => anim.setValue(0));
        nutrientProgressAnim.setValue(0);
        hasAnimatedRef.current = false;
      }
    } else {
      // Reset animations when data is cleared
      cardAnimations.forEach(anim => anim.setValue(0));
      nutrientProgressAnim.setValue(0);
      hasAnimatedRef.current = false;
    }
  }, [foodData, activeTab]); // Depend on both foodData and activeTab changes

  // Add effect to handle tab changes
  useEffect(() => {
    if (activeTab === 'Nutrition' && foodData && !hasAnimatedRef.current) {
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

  const renderIngredientsTab = () => (
    <View style={styles.tabContentContainer}>
      <Text style={styles.ingredientDescriptionNote}>
        Click the name of the ingredient to learn more about it.
      </Text>
      {foodData.ingredients.map((ingredient, index) => (
        <React.Fragment key={index}>
          <View style={styles.ingredientItem}>
            <TouchableOpacity onPress={() => Linking.openURL(ingredient.wikipediaLink)}>
              <Text style={styles.ingredientName}>{ingredient.name}</Text>
            </TouchableOpacity>
            <Text style={styles.ingredientDescription}>{ingredient.description}</Text>
          </View>
          {index < foodData.ingredients.length - 1 && renderSeparator()}
        </React.Fragment>
      ))}
    </View>
  );

  const renderDetailsTab = () => (
    <View style={styles.tabContentContainer}>
      <Text style={styles.detailText}>{foodData.details.summary}</Text>
      <Text style={styles.detailPrepTime}>Prep Time: {foodData.details.prepTime}</Text>
      <Text style={styles.detailServingSize}>Serving Size: {foodData.details.servingSize}</Text>
      {renderSeparator()}
      <TouchableOpacity onPress={() => Linking.openURL(foodData.details.wikipediaLink)}>
        <Text style={styles.wikipediaLink}>Learn more on Wikipedia</Text>
      </TouchableOpacity>
    </View>
  );

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

    return (
      <View style={[styles.buttonContainer, !foodData && styles.buttonContainerNoFood]}>
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

      Animated.timing(chipTextOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  // Update the handleModeChipPress function
  const handleModeChipPress = async () => {
    const currentMode = selectedMode;
    const oppositeMode = currentMode === 'fast' ? 'accurate' : 'fast';
    
    Alert.alert(
      'Scan Mode',
      `Currently using ${MODE_LABELS[currentMode]}.\n\n` +
      (currentMode === 'fast' 
        ? 'Fast Mode provides quick results and is great for packaged foods.'
        : 'Accurate Mode uses detailed analysis and is best for complex meals.'),
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: `Switch to ${MODE_LABELS[oppositeMode]}`,
          onPress: async () => {
            if (oppositeMode === 'accurate') {
              if (isSubscribed || isFirstDayUnlimited) {
                await AsyncStorage.setItem('selectedMode', oppositeMode);
                crossfadeChipText(oppositeMode);
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
                        await AsyncStorage.setItem('selectedMode', oppositeMode);
                        crossfadeChipText(oppositeMode);
                        Haptics.selectionAsync();
                      },
                    },
                  ],
                  { cancelable: false }
                );
              }
            } else {
              await AsyncStorage.setItem('selectedMode', oppositeMode);
              crossfadeChipText(oppositeMode);
              Haptics.selectionAsync();
            }
          }
        }
      ]
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

  // Update the useFocusEffect for paywall
  useFocusEffect(
    useCallback(() => {
      const checkAndShowPaywall = async () => {
        try {
          // Check if user has ever scanned
          const hasEverScanned = await AsyncStorage.getItem('@has_ever_scanned');
          setHasScannedEver(hasEverScanned === 'true');

          // Only proceed with paywall check if user has scanned before
          if (hasEverScanned === 'true') {
            const lastShownTime = await AsyncStorage.getItem('@paywall_last_shown');
            const currentTime = Date.now();
            
            // If never shown before or 20 minutes (1200000 ms) have passed
            if (!lastShownTime || (currentTime - parseInt(lastShownTime)) >= 1200000) {
              await Superwall.shared.register('onboardingV2');
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

  // Update handleSuccessfulScan to mark that user has scanned
  const handleSuccessfulScan = async (parsedData, imageUri, barcodeData, hasDrawing = false, actualModel = null) => {
    try {
      // First fade out existing content
      await new Promise((resolve) => {
        Animated.timing(tabFadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start(resolve);
      });

      // Then update the data
      setFoodData(parsedData.food);
      setNoFoodFound(false);
      setActiveTab('Nutrition');  // or whatever default tab you want

      // Finally fade in new content
      Animated.timing(tabFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Check if this is the first scan ever
      const hasEverScanned = await AsyncStorage.getItem('@has_ever_scanned');
      if (hasEverScanned !== 'true') {
        // This is the first scan, show paywall and mark as scanned
        await AsyncStorage.setItem('@has_ever_scanned', 'true');
        setHasScannedEver(true);
        await Superwall.shared.register('onboardingV2');
        await AsyncStorage.setItem('@paywall_last_shown', Date.now().toString());
      }

      // Rest of your success handling code...
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      triggerMacroAnimations();
      setActivePage(0);
      lastKnownPage.current = 0;

      await storeProductDetails({
        productName: parsedData.food.name,
        imageUri: imageUri,
        nutrients: parsedData.food,
        date: new Date().toISOString(),
        hadBarcode: !!barcodeData,
        hasDrawing: hasDrawing,
        modelUsed: actualModel || selectedModel
      });

      return true;
    } catch (error) {
      console.error('Error in handleSuccessfulScan:', error);
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
              await Superwall.shared.register('onboardingV2');
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
    const checkWhatsNewStatus = async () => {
      try {
        const hasSeenWhatsNew = await AsyncStorage.getItem('@has_seen_whats_new_1_6_0');
        if (hasSeenWhatsNew !== 'true') {
          setShowWhatsNew(true);
        }
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

  return (
    <View style={styles.container}>

      <AnimatedTextFoodScan
        text={
          foodData
            ? foodData.name.length > 23
              ? foodData.name.slice(0, 23) + '...'
              : foodData.name
            : noFoodFound
            ? 'No Food Found'
            : ErrorOccured
            ? "Couldn't Process"
            : 'No Image Selected'
        }
        colorScheme={colorScheme}
        style={styles.title}
      />
      <AnimatedTextFoodScan
        text={
          foodData
            ? `${foodData.class} • ${foodData.type}`
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
              <Animated.Image
                source={{ 
                  uri: typeof image === 'string' && !image.startsWith('data:image/jpeg;base64,')
                    ? 'data:image/jpeg;base64,' + image
                    : image 
                }}
                style={[styles.foodImage, { opacity: fadeAnimImage }]}
              />
              {hadBarcode && (
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
                        : isSubscribedPlus
                          ? (20 - scanCount)
                          : (5 - scanCount)}
                    </Text>
                  )}
                </View>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chipContainer}
              onPress={handleModeChipPress}
            >
              <BlurView
                intensity={50}
                tint={chipAppearance} // Updated here
                style={[
                  styles.chip,
                  selectedMode === 'accurate' && styles.chipAccurate,
                  { borderColor: chipAppearance === 'dark' ? '#666' : '#ddd' } // New border color update
                ]}
              >
                <View style={styles.chipContent}>
                  <Icon
                    name={selectedMode === 'fast' ? 'flash' : 'shield-checkmark'}
                    size={16}
                    color={chipAppearance === 'dark' ? '#fff' : '#444'} // Updated here
                  />
                  <Animated.Text
                    style={[
                      styles.chipText,
                      {
                        opacity: chipTextOpacity,
                        color: chipAppearance === 'dark' ? '#fff' : '#444' // Updated here
                      }
                    ]}
                  >
                    {selectedMode === 'fast' ? 'Fast' : 'Accurate'}
                  </Animated.Text>
                </View>
              </BlurView>
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
            name={selectedMode === 'fast' ? 'flash' : 'shield-checkmark'} 
            size={24} 
            color={colorScheme === 'dark' ? '#fff' : '#000'} 
          />
          <Text style={styles.modeBadgeText}>
            {selectedMode === 'fast' ? 'Fast Scan' : 'Accurate Scan'}
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
                `${Math.max(0, 1 - freeAccurateScansUsed - 1)} accurate scans left` :
                isSubscribedPlus ?
                  `${20 - scanCount - 1} scans left` :
                  `${5 - scanCount - 1} scans left`
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
            styles.overlayContainer,
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
    </View>
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
      paddingTop: isIphoneSE() ? 20 : 30 * scale,
    },
    mainContentContainer: {
      flex: 1,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 20 * scale,
      paddingVertical: 10 * scale,
      marginTop: 'auto',
      backgroundColor: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
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
      borderRadius: 40 * scale,
      padding: 25 * scale,
      alignItems: 'center',
      shadowColor: colorScheme === 'dark' ? '#000' : '#999',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 100,
      shadowRadius: 90 * scale,
      elevation: 100,
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
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F0F0F0',
      borderRadius: 24 * scale,
      overflow: 'hidden',
      marginBottom: 16 * scale,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
    },
    separator: {
      height: 4 * scale,
      backgroundColor: colorScheme === 'dark' ? '#333333' : '#CCCCCC',
      marginVertical: 8 * scale,
      marginBottom: 16 * scale,
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
      backgroundColor: colorScheme === 'dark' ? '000' : '#eee',
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
      padding: 8 * scale,
      gap: 5 * scale,
    },

    macroCard: {
      width: '100%',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5',
      borderRadius: 18 * scale,
      padding: 12 * scale,
      height: 100 * scale,
      marginBottom: 5 * scale,
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
      backgroundColor: colorScheme === 'dark' ? '000' : '#eee',
      shadowColor: colorScheme === 'dark' ? '#000' : '#aaa',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 10,
      borderRadius: 200,
      padding: 3,
    },
    overlayContainer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
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
      width: '80%',
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
  });

export default FoodScanScreen;