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
import AnimatedTextFoodScan from './AnimatedTextFoodScan'; // Adjust the path accordingly
import AnimatedTextFoodScanFast from './AnimatedTextFoodScanFast'; // Adjust the path accordingly
import TutorialOverlay from './Tutorial';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Add this import
import { BlurView } from 'expo-blur'; // Add this import at the top
import * as StoreReview from 'react-native-store-review';

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
  const [selectedModel, setSelectedModel] = useState('claude-3-haiku-20240307');
  const [selectedMode, setSelectedMode] = useState('fast'); // Default to 'fast'
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

  useEffect(() => {
    const processImageFromCamera = async () => {
      console.log(
        'Received imageUri:',
        route.params?.imageUri,
        'barcodeData:',
        route.params?.barcodeData
      );
  
      // If an imageUri is present, handle it
      if (route.params?.imageUri) {
        const imageUri = route.params.imageUri;
        const barcodeData = route.params.barcodeData;  // <--- Grab barcode data
        setProcessingImage(imageUri);
        setModalImageUri(imageUri);
  
        // Now pass both the imageUri and barcode data to your AI function
        await sendImageToApi(imageUri, barcodeData);
  
        // Clear them so they aren't re-processed if user revisits the screen
        navigation.setParams({ imageUri: null, barcodeData: null });
      }
    };
  
    processImageFromCamera();
    // Include barcodeData in the dependency array if you want to trigger re-check on it
  }, [route.params?.imageUri, route.params?.barcodeData]);

  const getLoadingTextsByMode = (mode) => {
    return LOADING_TEXTS[mode] || LOADING_TEXTS.fast; // Default to 'fast' if mode not found
  };

  const enqueueLoadingText = (text) => {
    setLoadingTextQueue((prevQueue) => [...prevQueue, text]);
  };

  const [averageProcessingTimes, setAverageProcessingTimes] = useState({
    fast: 4000, // in milliseconds
    accurate: 20000,
  });

  // Function to load average times from storage
  const loadAverageProcessingTimes = async () => {
    try {
      const storedTimes = await AsyncStorage.getItem('@average_processing_times');
      if (storedTimes) {
        setAverageProcessingTimes(JSON.parse(storedTimes));
      }
    } catch (error) {
      console.error("Error loading average processing times:", error);
    }
  };

  // Function to save average times to storage
  const saveAverageProcessingTimes = async (updatedTimes) => {
    try {
      await AsyncStorage.setItem('@average_processing_times', JSON.stringify(updatedTimes));
    } catch (error) {
      console.error("Error saving average processing times:", error);
    }
  };

  // Function to update the average processing time using Exponential Moving Average
  const updateAverageProcessingTime = (mode, newTime) => {
    const alpha = 0.2; // Smoothing factor (adjust as needed)
    setAverageProcessingTimes(prevTimes => {
      const updatedTime = alpha * newTime + (1 - alpha) * prevTimes[mode];
      const updatedTimes = { ...prevTimes, [mode]: updatedTime };
      saveAverageProcessingTimes(updatedTimes);
      return updatedTimes;
    });
  };

  // Call loadAverageProcessingTimes in useEffect
  useEffect(() => {
    loadAverageProcessingTimes();
  }, []);

  // Function to enqueue loading texts based on average processing time
  const scheduleLoadingTexts = () => {
    const mode = selectedMode;
    const averageTime = averageProcessingTimes[mode] || 6000; // Default average time if not set

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
    // For example, schedule a "Still working..." text after averageTime
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
      console.log(`Scheduling "Taking longer than usual..." at ${averageTime + 2000} ms`);
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
          const model = await AsyncStorage.getItem('selectedModel');
          if (model) setSelectedModel(model);
          const mode = await AsyncStorage.getItem('selectedMode'); // Ensure this key matches FeaturesScreen
          if (mode) setSelectedMode(mode);
        } catch (error) {
          console.error("Error loading settings:", error);
        }
      };
      loadSettings();
    }, [])
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
        console.log('[INIT] dateLastUsed:', dateLastUsed, ' vs. today:', today);
  
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
          console.log('[INIT] Resetting daily counters because date changed.');
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
          console.log('[INIT] freeAccurateScansUsed =', accurateScansUsed);
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
                  console.error('Receipt validation failed:', data.message);
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
  
    checkSubscription();
  }, [isIAPEnabled, user]);


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
    if (!modalVisible && apiSuccess && modalImageUri) {
      setImage(modalImageUri);
      setApiSuccess(false);
    }
  }, [modalVisible, apiSuccess, modalImageUri]);

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
    const result = await manipulateAsync(
      uri,
      { compress: 1, format: SaveFormat.JPEG, base64: true }
    );
    return result.base64;
  };

  const handleScroll = (event) => {
    if (!foodData) return;  // Don't handle scroll if there's no food data
  
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
  
    const shouldShowIndicator = offsetY + scrollViewHeight < contentHeight - 20;
  
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
          modelUsed: selectedModel
        }
      };
      console.log('Storing product details:', JSON.stringify(productDetailsWithDate, null, 2));

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
  if (isFirstDayUnlimited || isSubscribed) {
    // User has unlimited scans
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [9, 16],
      quality: 1,
    });
    if (!result.canceled && result.assets) {
      const manipulatedImage = await manipulateAsync(
        result.assets[0].uri,
        [],
        { format: SaveFormat.JPEG, compress: 0.8 }
      );
      setProcessingImage(manipulatedImage.uri);
      setModalImageUri(manipulatedImage.uri);
      await sendImageToApi(manipulatedImage.uri);
    }
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

    // Proceed with image picking and processing
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [9, 16],
      quality: 1,
    });
    if (!result.canceled && result.assets) {
      const manipulatedImage = await manipulateAsync(
        result.assets[0].uri,
        [],
        { format: SaveFormat.JPEG, compress: 0.8 }
      );
      setProcessingImage(manipulatedImage.uri);
      setModalImageUri(manipulatedImage.uri);
      await sendImageToApi(manipulatedImage.uri);
    }
  } else {
    const timeLeft = getTimeUntilMidnight();
    Alert.alert(
      "No More Scans Left",
      `You have reached your daily scan limit. Please wait ${timeLeft} for more scans or upgrade for unlimited access.`
    );
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
        'You have used your 1 accurate scan for today. Fast mode has automatically been selected. Upgrade for unlimited accurate scans.'
      );
      setSelectedMode('fast');
      await AsyncStorage.setItem('selectedMode', 'fast');
      console.log('Selected Mode:', 'fast');
      // navigate to CameraScreen with fast mode
      // navigation.navigate('CameraScreen');
      return;
    }

    navigation.navigate('CameraScreen');
  } else {
    const timeLeft = getTimeUntilMidnight();
    Alert.alert(
      "No More Scans Left",
      `You have reached your daily scan limit. Please wait ${timeLeft} for more scans or upgrade for unlimited access.`
    );
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

  const sendImageToApi = async (imageUri, barcodeData) => {
    // Set hadBarcode state based on whether barcodeData exists
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
  
    setIsLoading(true);
    startLoadingAnimation();
    console.log(currentLoadingText);
    setProcessingImage(imageUri);
  
    scheduleLoadingTexts(); // Schedule loading texts based on average time
    startTimeRef.current = Date.now(); // Update this line
  
    console.log("Starting API call with mode:", mode);
    console.log(currentLoadingText);
  
    let foodFound = false; // Local variable to track if food was found
  
    try {
      const base64Image = await imageToBase64(imageUri);
  
      // Define your system prompts here (unchanged)
      let systemPromptFast = `You are an AI assistant specialized in analyzing food images and providing detailed nutritional information. Your primary goal is to determine the nutrient content of the food provided in the image with the highest possible accuracy, while maintaining transparency about potential uncertainties.

When presented with an image and potential barcode data, follow these steps:
1. EXTREMELY IMPORTANT: Only use barcode data if it is explicitly provided to you. NEVER make up or infer barcode data that wasn't provided.
2. If barcode data is provided:
   - Use it as your primary source of truth for any nutritional values and product information it contains
   - Verify the image matches the barcode data
   - Only use the barcode data that was explicitly provided, never infer additional barcode data
3. If no barcode data is provided:
   - Rely solely on visual analysis
   - Do not make assumptions about barcode information
   - Be transparent about estimations in the details.summary
4. If the image does not contain food, respond only with "{No Food Found.}"

IMPORTANT STEPS:
5. Pay meticulous attention to serving size measurements:
   - Carefully measure serving size shown in image
   - Provide nutrient information based precisely on the visible serving size, not anything else

6. Clearly document in the details.summary:
If barcode data is provided:
   - Which specific values came from barcode data
   - Any values calculated/extended from barcode data
   - How the barcode product matches the image
   - Any adjustments made to barcode values based on serving size
   - Which values were estimated visually
   - Format example: "Nutrition data sourced from barcode scan (calories, protein, carbs). Fat content estimated from visual analysis. Serving size adjusted to match 1.5x portion shown in image."
If no barcode data is provided:
  - Clearly state that all values are based on visual analysis
  - Explain anything that you saw in the image that was not included in the calculations for macronutrients
  - Format example: "All nutrition data sourced from visual analysis. Serving size adjusted to match 1.5x portion shown in image."`;

  // Add barcode data if available
  if (barcodeData) {
    const barcodeDataString = JSON.stringify(barcodeData, null, 2);
    systemPromptFast += `

BARCODE INFO FOR THE IMAGE PROVIDED (EXTREMELY IMPORTANT):
The user scanned a barcode with nutrient data, this data is from the image provided. some data may be missing:
${barcodeDataString}

It doesn't matter if the product name is missing, this data is always from the image provided.

1. The barcode data supersedes visual estimates for any nutritional values it contains
2. Document in details.summary exactly what values came from the barcode data
3. Adjust all barcode values proportionally if serving size differs
4. Only fall back to visual estimation for values not provided in barcode data
5. Infer from the image any and all values that are not provided in the barcode data`;
  }

  // Add the JSON format specification
  systemPromptFast += `

6. For food images, analyze and provide the following information in JSON format:
{
  "food": {
    "name": "String",
    "class": "String",
    "type": "String",
    "calories": {
      "amount": "Number",
      "marginOfErrorPercent": "Number"
    },
    "proteins": {
      "amount": "Number",
      "marginOfErrorPercent": "Number"
    },
    "carbohydrates": {
      "amount": "Number",
      "marginOfErrorPercent": "Number"
    },
    "fats": {
      "amount": "Number",
      "marginOfErrorPercent": "Number"
    },
    "fiber": {
      "amount": "Number",
      "marginOfErrorPercent": "Number"
    },
    "sodium": {
      "amount": "Number",
      "marginOfErrorPercent": "Number"
    },
    "ingredients": [
      {
        "name": "String",
        "wikipediaLink": "String",
        "description": "String"
      }
    ],
    "details": {
      "summary": "String",
      "prepTime": "String",
      "servingSize": "String",
      "wikipediaLink": "String"
    }
  }
}

Include anything you saw like drinks, condiments, or other items that were NOT included in the calculations for macronutrients inside the 'details' section of the JSON output. These things might include condiments, also include things you are unsure about in the details screen. Be specific and concise.`;
  
      let systemPromptAccurate = `You are an AI assistant specialized in analyzing food images and providing detailed nutritional information. Your primary goal is to determine the nutrient content of the food provided in the image with the highest possible accuracy, while maintaining transparency about potential uncertainties.
  
  You will be provided with an image to analyze:
  
  Carefully examine the image to identify all food items or components of the meal, including those that may be partially visible or in small quantities. If the image does not contain any food at all, respond only with "{No Food Found.}" and stop your analysis there.
  
  For food images, analyze using the following process:
  
  1. Use <brainstorm> tags to create a tree of thought about the nutrient content of the image. Generate at least 3 different thought paths, considering various possibilities for food identification and portion sizes.
  
  2. Use <thinking> tags to reason on each of your brainstorm paths. Verify your findings as best as you can using the food database provided. Consider factors such as preparation methods, hidden ingredients, and regional variations that might affect nutritional content.
  
  3. Use <reasoning> tags to refine and rethink your original analysis for each path, verifying it once more. Cross-examine your assumptions and check for any inconsistencies or overlooked details.
  
  4. After completing each thought path (you should conduct at least three in this reply), use <score> tags to rate the quality and confidence of that path on a scale from -100 to 100. Consider factors such as completeness, accuracy, and confidence in your assessment. Provide a detailed justification for your score before stating the numerical value.
  
  5. Select the thought path with the highest score and summarize it using <best_path> tags. Include your final nutritional analysis, detailing macronutrients (proteins, carbohydrates, fats) and estimated calorie content. If possible, include information on key micronutrients as well.
  
  Throughout your analysis, maintain transparency about uncertainties and avoid overconfidence in your estimations. Clearly state when you are making assumptions or when certain aspects of the nutritional content are difficult to determine from the image alone.
  
  Your final output should be structured as follows:
  
  <analysis>
  [Your detailed analysis, including brainstorming, thinking, reasoning, and scoring for each path]
  
  <best_path>
  [Summary of the highest-scored thought path, including final nutritional analysis]
  </best_path>
  
  <uncertainties>
  [List of any uncertainties or assumptions made during the analysis]
  </uncertainties>
  
  <recommendations>
  [Any recommendations for the user, such as seeking professional nutritional advice for more accurate information]
  </recommendations>
  </analysis>
  
  Remember, your analysis should help users make informed dietary decisions while acknowledging the limitations of visual assessment. Always prioritize accuracy and transparency over providing a complete but potentially inaccurate analysis.`;
  
      // Add barcode data if available
      if (barcodeData) {
        const barcodeDataString = JSON.stringify(barcodeData, null, 2);
        systemPromptAccurate += `

BARCODE INFO FOR THE IMAGE PROVIDED (EXTREMELY IMPORTANT):
The user scanned a barcode with nutrient data, this data is from the image provided. some data may be missing:
${barcodeDataString}

It doesn't matter if the product name is missing, this data is always from the image provided.

1. The barcode data supersedes visual estimates for any nutritional values it contains
2. Document in details.summary exactly what values came from the barcode data
3. Adjust all barcode values proportionally if serving size differs
4. Only fall back to visual estimation for values not provided in barcode data
5. Infer from the image any and all values that are not provided in the barcode data`;
      }
  
      systemPromptAccurateJson = `Based on your previous analysis, particularly focusing on the highest-scored thought path you identified, provide the following information in JSON format:
  
  {
    "food": {
      "name": "String",
      "class": "String",
      "type": "String",
      "calories": {
        "amount": "Number",
        "marginOfErrorPercent": "Number"
      },
      "proteins": {
        "amount": "Number",
        "marginOfErrorPercent": "Number"
      },
      "carbohydrates": {
        "amount": "Number",
        "marginOfErrorPercent": "Number"
      },
      "fats": {
        "amount": "Number",
        "marginOfErrorPercent": "Number"
      },
      "fiber": {
        "amount": "Number",
        "marginOfErrorPercent": "Number"
      },
      "sodium": {
        "amount": "Number",
        "marginOfErrorPercent": "Number"
      },
      "ingredients": [
        {
          "name": "String",
          "wikipediaLink": "String",
          "description": "String"
        }
      ],
      "details": {
        "summary": "String",
        "prepTime": "String",
        "servingSize": "String",
        "wikipediaLink": "String"
      }
    }
  }
  
  Ensure that your JSON response is based on the highest-scored thought path from your thorough analysis.
  
  Pay meticulous attention to serving size measurements. Provide nutrient information based precisely on the serving size shown in the image. For example, if the image depicts a whole jar of peanut butter, report nutrients for the entire jar. If it shows 2/3 of a cookie, provide nutrients for 2/3 of a cookie. Aim for maximum accuracy in all calculations. Ensure the serving size value correctly represents the entire food content visible in the image. For instance, if the image shows a plate of food, the serving size should be "1 plate." If it displays 2/3 of a cookie, the serving size should be "2/3 cookie."
  Clearly state any assumptions or adjustments made specific to the image within the details value. For example, if you only analyzed 2/3 of a cookie because that's what was shown in the image, explicitly mention this. Your explanation might read: "Nutrient information is provided for 2/3 of a cookie, as that was the portion visible in the image." This transparency ensures the user understands the basis of your nutrient calculations.
  
  Include anything you saw like, drinks, condiments, or other items that were NOT included in the calculations for macronutrients inside the 'details' section of the JSON output. These things might include condiments, also include things you are unsure about in the details screen. Be specific and concise.
  `;
  
      // Check the toggle variable
      if (useOpenAI) {
        console.log("Using OpenAI API");
      
        const apiKey = await AsyncStorage.getItem('@openai_api_key');
        if (!apiKey) {
          console.error("OpenAI API key not found");
          Alert.alert('Error', 'OpenAI API key not found');
          setIsLoading(false);
          stopLoadingAnimation();
          setProcessingImage(null);
          return;
        }
      
        if (mode === 'accurate') {
          // Accurate mode with OpenAI API
          console.log("Using accurate mode with OpenAI API");
      
          const firstPayload = {
            model: "gpt-4o",
            temperature: 0.7,
            messages: [
              {
                role: "system",
                content: systemPromptAccurate
              },
              {
                role: "user",
                content: [
                  { 
                    type: "text", 
                    text: "Analyze this image and provide nutritional information as specified. If the image isn't food, just say '{No Food Found.}'" 
                  },
                  { 
                    type: "image_url", 
                    image_url: { 
                      url: `data:image/jpeg;base64,${base64Image}` 
                    } 
                  }
                ]
              }
            ],
            max_tokens: 4096,
            temperature: 0.7,
          };
      
          const firstResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(firstPayload),
          });
      
          const firstResponseJson = await firstResponse.json();
      
          if (firstResponseJson.error) {
            console.error("OpenAI API error:", firstResponseJson.error);
            Alert.alert('Error', 'OpenAI API error');
            setIsLoading(false);
            stopLoadingAnimation();
            setProcessingImage(null);
            return;
          }
      
          const firstAssistantReply = firstResponseJson.choices[0].message.content;
      
          if (firstAssistantReply.includes("No Food Found.}")) {
            setNoFoodFound(true);
            setFoodData(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setActiveTab('');
            foodFound = false;
          } else {
            // Second API call with JSON schema
            const secondPayload = {
              model: "gpt-4o",
              temperature: 0.7,
              messages: [
                {
                  role: "system",
                  content: "You analyze food images and provide structured nutritional data."
                },
                {
                  role: "user",
                  content: [
                    { 
                      type: "text", 
                      text: firstAssistantReply 
                    },
                    { 
                      type: "image_url", 
                      image_url: { 
                        url: `data:image/jpeg;base64,${base64Image}` 
                      } 
                    }
                  ]
                }
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "food_analysis_schema",
                  schema: {
                    type: "object",
                    properties: {
                      food: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          class: { type: "string" },
                          type: { type: "string" },
                          calories: {
                            type: "object",
                            properties: {
                              amount: { type: "number" },
                              marginOfErrorPercent: { type: "number" }
                            }
                          },
                          proteins: {
                            type: "object",
                            properties: {
                              amount: { type: "number" },
                              marginOfErrorPercent: { type: "number" }
                            }
                          },
                          carbohydrates: {
                            type: "object",
                            properties: {
                              amount: { type: "number" },
                              marginOfErrorPercent: { type: "number" }
                            }
                          },
                          fats: {
                            type: "object",
                            properties: {
                              amount: { type: "number" },
                              marginOfErrorPercent: { type: "number" }
                            }
                          },
                          fiber: {
                            type: "object",
                            properties: {
                              amount: { type: "number" },
                              marginOfErrorPercent: { type: "number" }
                            }
                          },
                          sodium: {
                            type: "object",
                            properties: {
                              amount: { type: "number" },
                              marginOfErrorPercent: { type: "number" }
                            }
                          },
                          ingredients: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                name: { type: "string" },
                                wikipediaLink: { type: "string" },
                                description: { type: "string" }
                              }
                            }
                          },
                          details: {
                            type: "object",
                            properties: {
                              summary: { type: "string" },
                              prepTime: { type: "string" },
                              servingSize: { type: "string" },
                              wikipediaLink: { type: "string" }
                            }
                          }
                        },
                        required: ["name", "calories", "proteins", "carbohydrates", "fats", "details"]
                      }
                    },
                    required: ["food"]
                  }
                }
              }
            };
      
            const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(secondPayload),
            });
      
            const secondResponseJson = await secondResponse.json();
      
            if (secondResponseJson.error) {
              console.error("OpenAI API error:", secondResponseJson.error);
              Alert.alert('Error', 'OpenAI API error');
              setIsLoading(false);
              stopLoadingAnimation();
              setProcessingImage(null);
              return;
            }
      
            try {
              const parsedData = JSON.parse(secondResponseJson.choices[0].message.content);
              if (parsedData && parsedData.food) {
                foodFound = await handleSuccessfulScan(parsedData, imageUri, barcodeData);
              } else {
                throw new Error("Parsed data is missing required properties.");
              }
            } catch (parseError) {
              console.error("Error parsing JSON response:", parseError);
              setFoodData(null);
              setErrorOccured(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              setActiveTab('');
              foodFound = false;
            }
          }
        } else {
          // Fast mode with OpenAI API
          const payload = {
            model: "gpt-4o",
            temperature: 0.7,
            messages: [
              {
                role: "system",
                content: systemPromptFast
              },
              {
                role: "user",
                content: [
                  { 
                    type: "text", 
                    text: "Analyze this image and provide nutritional information as specified. If the image isn't food, just say '{No Food Found.}'" 
                  },
                  { 
                    type: "image_url", 
                    image_url: { 
                      url: `data:image/jpeg;base64,${base64Image}` 
                    } 
                  }
                ]
              }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "food_analysis_schema",
                schema: {
                  type: "object",
                  properties: {
                    food: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        class: { type: "string" },
                        type: { type: "string" },
                        calories: {
                          type: "object",
                          properties: {
                            amount: { type: "number" },
                            marginOfErrorPercent: { type: "number" }
                          }
                        },
                        proteins: {
                          type: "object",
                          properties: {
                            amount: { type: "number" },
                            marginOfErrorPercent: { type: "number" }
                          }
                        },
                        carbohydrates: {
                          type: "object",
                          properties: {
                            amount: { type: "number" },
                            marginOfErrorPercent: { type: "number" }
                          }
                        },
                        fats: {
                          type: "object",
                          properties: {
                            amount: { type: "number" },
                            marginOfErrorPercent: { type: "number" }
                          }
                        },
                        fiber: {
                          type: "object",
                          properties: {
                            amount: { type: "number" },
                            marginOfErrorPercent: { type: "number" }
                          }
                        },
                        sodium: {
                          type: "object",
                          properties: {
                            amount: { type: "number" },
                            marginOfErrorPercent: { type: "number" }
                          }
                        },
                        ingredients: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              wikipediaLink: { type: "string" },
                              description: { type: "string" }
                            }
                          }
                        },
                        details: {
                          type: "object",
                          properties: {
                            summary: { type: "string" },
                            prepTime: { type: "string" },
                            servingSize: { type: "string" },
                            wikipediaLink: { type: "string" }
                          }
                        }
                      },
                      required: ["name", "calories", "proteins", "carbohydrates", "fats", "details"]
                    }
                  },
                  required: ["food"]
                }
              }
            }
          };
      
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
      
          const responseJson = await response.json();
      
          if (responseJson.error) {
            console.error("OpenAI API error:", responseJson.error);
            Alert.alert('Error', 'OpenAI API error');
            setIsLoading(false);
            stopLoadingAnimation();
            setProcessingImage(null);
            return;
          }
      
          try {
            const parsedData = JSON.parse(responseJson.choices[0].message.content);
            if (parsedData && parsedData.food) {
              foodFound = await handleSuccessfulScan(parsedData, imageUri, barcodeData);
            } else {
              throw new Error("Parsed data is missing required properties.");
            }
          } catch (parseError) {
            console.error("Error parsing JSON response:", parseError);
            setFoodData(null);
            setErrorOccured(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setActiveTab('');
            foodFound = false;
          }
        }
      } else {
        // Existing Anthropic API code
        console.log("Using Anthropic API");
  
        const apiKey = await AsyncStorage.getItem('@apikey');
        if (!apiKey) {
          console.error("API key not found");
          Alert.alert('Error', 'API key not found');
          setIsLoading(false);
          // Do not update average processing time on error
          return;
        }
  
        const anthropic = new Anthropic({ apiKey });
  
        if (mode === 'fast') {
          // Fast mode logic
          console.log(
            "Using fast mode. Sending request to Anthropic API with prompt:",
            systemPromptFast
          );
          const response = await anthropic.messages.create({
            model: selectedModel,
            max_tokens: 4096,
            temperature: 0.7,
            system: systemPromptFast,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text:
                      "Analyze this image and provide nutritional information as specified, using barcode data if available, otherwise use visual analysis. If the image isn't food, just say '{No Food Found.}'. Your response should be in perfect JSON format.",
                  },
                  {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: "image/jpeg",
                      data: base64Image,
                    },
                  },
                ],
              },
              {
                role: "assistant",
                content: "{",
              },
            ],
          });
          console.log("Received response from Anthropic API (fast mode):", response);
  
          const responseText = response.content[0].text;
          if (responseText.includes("No Food Found.}")) {
            setNoFoodFound(true); // Set noFoodFound to true when "No Food Found.}" is in the response
            setFoodData(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setActiveTab('');
            foodFound = false; // Food was not found
          } else {
            const jsonString = `{${responseText}`;
            try {
              const parsedData = JSON.parse(jsonString);
              if (parsedData && parsedData.food) {
                foodFound = await handleSuccessfulScan(parsedData, imageUri, barcodeData);
              } else {
                throw new Error("Parsed data is missing required properties.");
              }
            } catch (parseError) {
              console.error(
                "Error parsing JSON response (fast mode):",
                parseError
              );
              setFoodData(null);
              setErrorOccured(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              setActiveTab('');
              foodFound = false; // Food was not found
            }
          }
        } else {
          // Accurate mode logic
          console.log(
            "Using accurate mode. Sending first request to Anthropic API with prompt:",
            systemPromptAccurate
          );
          const firstResponse = await anthropic.messages.create({
            model: selectedModel,
            max_tokens: 4096,
            temperature: 0.7,
            system: systemPromptAccurate,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text:
                      "Analyze this image and provide nutritional information as specified. If the image doesn't contain any food AT ALL, just say '{No Food Found.}'. Your response should be in perfect JSON format.",
                  },
                  {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: "image/jpeg",
                      data: base64Image,
                    },
                  },
                ],
              },
              {
                role: "assistant",
                content: "",
              },
            ],
          });
  
          console.log(
            "Received first response from Anthropic API (accurate mode):",
            firstResponse
          );
  
          const firstResponseText = firstResponse.content[0].text;
          if (firstResponseText.includes("No Food Found.}")) {
            setNoFoodFound(true);
            setFoodData(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setActiveTab('');
            foodFound = false;
          } else {
            // Proceed to second request
            console.log(
              "Sending second request to Anthropic API (accurate mode) with prompt:",
              systemPromptAccurateJson
            );
            const secondResponse = await anthropic.messages.create({
              model: selectedModel,
              max_tokens: 4096,
              temperature: 0.7,
              system: systemPromptAccurateJson,
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text:
                        "Analyze this image and provide nutritional information as specified. If the image isn't food, just say '{No Food Found.}'",
                    },
                    {
                      type: "image",
                      source: {
                        type: "base64",
                        media_type: "image/jpeg",
                        data: base64Image,
                      },
                    },
                  ],
                },
                {
                  role: "assistant",
                  content: `{${firstResponse.content[0].text}`,
                },
                {
                  role: "user",
                  content:
                    "Now, based on your analysis and focusing on the highest-scored thought path, provide the JSON data as specified. Continue from the opening curly brace.",
                },
                {
                  role: "assistant",
                  content: "{",
                },
              ],
            });
  
            console.log(
              "Received second response from Anthropic API (accurate mode):",
              secondResponse
            );
  
            const responseText = secondResponse.content[0].text;
            const jsonString = `{${responseText}`;
            try {
              const parsedData = JSON.parse(jsonString);
              if (parsedData && parsedData.food) {
                foodFound = await handleSuccessfulScan(parsedData, imageUri, barcodeData);
              } else {
                throw new Error("Parsed data is missing required properties.");
              }
            } catch (parseError) {
              console.error(
                "Error parsing JSON response (accurate mode):",
                parseError
              );
              setFoodData(null);
              setErrorOccured(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              setActiveTab('');
              foodFound = false;
            }
          }
        }
      }
  
      if (foodFound) {
        const endTime = Date.now(); // End time measurement
        const processingDuration = endTime - startTimeRef.current;
        handleAccurateScanUsed();
        updateAverageProcessingTime(mode, processingDuration); // Update average
  
        if (!isFirstDayUnlimited && !isSubscribed) {
          await incrementScanCount();
        }
      } else {
        console.log("No food detected or error occurred, processing time not updated");
      }
  
      setIsLoading(false);
      stopLoadingAnimation();
      setProcessingImage(null);
  
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
      console.error("Error during API call:", error);
      Alert.alert('Error', 'Failed to analyze the image');
      setIsLoading(false);
      stopLoadingAnimation();
      setProcessingImage(null);
      // Do not update average processing time on error
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
    console.log('currentLoadingText updated:', currentLoadingText);
  }, [currentLoadingText]);

  const handleCorrectPress = () => {
    console.log("User confirmed correctness");
    fadeOutFeedback();
  };

  const handleIncorrectPress = () => {
    console.log("User marked the response as incorrect.");
    setInputModalVisible(true);
    fadeOutFeedback();
    removeLatestHistoryEntry();
  };

  const submitUserInput = async () => {
    console.log("User entered food type:", userInput);
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

  const renderNutritionTab = () => (
    <View style={styles.tabContentContainer}>
      {renderNutrientRow('Calories', foodData.calories)}
      {renderSeparator()}
      {renderNutrientRow('Proteins', foodData.proteins)}
      {renderSeparator()}
      {renderNutrientRow('Carbohydrates', foodData.carbohydrates)}
      {renderSeparator()}
      {renderNutrientRow('Fat', foodData.fats)}
      {renderSeparator()}
      {renderNutrientRow('Fiber', foodData.fiber)}
      {renderSeparator()}
      {renderNutrientRow('Sodium', foodData.sodium)}
    </View>
  );

  const renderNutrientRow = (label, data) => (
    <View style={styles.nutrientRow}>
      <Text style={styles.nutrientLabel}>{label}</Text>
      <Text style={styles.nutrientValue}>
        {data.amount} {label === 'Calories' ? 'kcal' : label === 'Sodium' ? 'mg' : 'g'} (±{data.marginOfErrorPercent}%)
      </Text>
    </View>
  );

  const renderSeparator = () => <View style={styles.separator} />;

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

  const renderButtons = () => {
    // Separate Animated.Values for each button
    const scaleAnimScan = useRef(new Animated.Value(1)).current;
    const scaleAnimChoose = useRef(new Animated.Value(1)).current;

    // Handlers for Scan Meal Button
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

    // Handlers for Choose Photo Button
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
      <View style={styles.buttonContainer}>
        {/* Choose Photo Button */}
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

                {/* Scan Meal Button */}
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
    
    const switchToMode = async (newMode) => {
      if (newMode === 'accurate') {
        if (isSubscribed || isFirstDayUnlimited) {
          await AsyncStorage.setItem('selectedMode', newMode);
          crossfadeChipText(newMode);
          await AsyncStorage.setItem('selectedModel', 'claude-3-5-sonnet-20240620');
          setSelectedModel('claude-3-5-sonnet-20240620');
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
                  await AsyncStorage.setItem('selectedMode', newMode);
                  crossfadeChipText(newMode);
                  await AsyncStorage.setItem('selectedModel', 'claude-3-5-sonnet-20240620');
                  setSelectedModel('claude-3-5-sonnet-20240620');
                  Haptics.selectionAsync();
                },
              },
            ],
            { cancelable: false }
          );
        }
      } else {
        await AsyncStorage.setItem('selectedMode', newMode);
        crossfadeChipText(newMode);
        await AsyncStorage.setItem('selectedModel', 'claude-3-haiku-20240307');
        setSelectedModel('claude-3-haiku-20240307');
        Haptics.selectionAsync();
      }
    };

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
          onPress: () => switchToMode(oppositeMode)
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

  const handleSuccessfulScan = async (parsedData, imageUri, barcodeData) => {
    setFoodData(parsedData.food);
    setNoFoodFound(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    fadeOutTab('Nutrition');

    await storeProductDetails({
      productName: parsedData.food.name,
      imageUri: imageUri,
      nutrients: parsedData.food,
      date: new Date().toISOString(),
      hadBarcode: !!barcodeData
    });

    // If this was an accurate scan, update the count and store the scan time
    if (selectedMode === 'accurate') {
      const newCount = accurateScansBeforeReview + 1;
      try {
        await AsyncStorage.setItem('@accurate_scans_before_review', newCount.toString());
        await AsyncStorage.setItem('@last_scan_time', Date.now().toString());
        setAccurateScansBeforeReview(newCount);
        // Set the flag indicating user has scanned since opening the app
        setHasScannedSinceOpen(true);
      } catch (error) {
        console.error('Error updating scan data:', error);
      }
    }

    return true; // Indicate success
  };

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
      <View style={styles.imageContainer}>
        <View style={styles.controlsOverlay}>
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
            <LinearGradient
              colors={colorScheme === 'dark' 
                ? ['rgba(0, 0, 0, 1)', 'rgba(30, 30, 30, 0.85)']
                : ['rgba(60, 60, 60, 0.95)', 'rgba(140, 140, 140, 0.95)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.chip}
            >
              <View style={styles.chipContent}>
                <Text style={[styles.chipLabel, { color: colorScheme === 'dark' ? '#fff' : '#fff' }]}>Scans:</Text>
                {isFirstDayUnlimited || isSubscribed ? (
                  <FontAwesomeIcon
                    icon={faInfinity}
                    size={18}
                    color={colorScheme === 'dark' ? '#fff' : '#fff'}
                  />
                ) : (
                  <Text style={[styles.chipText, { color: colorScheme === 'dark' ? '#fff' : '#fff' }]}>
                    {selectedMode === 'accurate' 
                      ? Math.max(0, 1 - freeAccurateScansUsed)
                      : isSubscribedPlus 
                        ? (20 - scanCount) 
                        : (5 - scanCount)}
                  </Text>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.chipContainer} 
            onPress={handleModeChipPress}
          >
            <LinearGradient
              colors={
                selectedMode === 'accurate' 
                  ? colorScheme === 'dark'
                    ? ['rgba(25, 72, 110, 0.95)', 'rgba(40, 90, 140, 0.95)']
                    : ['rgba(70, 120, 220, 0.95)', 'rgba(40, 90, 180, 0.95)']
                  : colorScheme === 'dark'
                    ? ['rgba(0, 0, 0, 0.85)', 'rgba(20, 20, 20, 0.95)']
                    : ['rgba(40, 40, 40, 0.95)', 'rgba(80, 80, 80, 0.95)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.chip, selectedMode === 'accurate' && styles.chipAccurate]}
            >
              <View style={styles.chipContent}>
                <Icon 
                  name={selectedMode === 'fast' ? 'flash' : 'shield-checkmark'} 
                  size={16} 
                  color={colorScheme === 'dark' ? '#fff' : selectedMode === 'accurate' ? '#fff' : '#fff'} 
                />
                <Animated.Text style={[
                  styles.chipText, 
                  { 
                    opacity: chipTextOpacity,
                    color: colorScheme === 'dark' ? '#fff' : selectedMode === 'accurate' ? '#fff' : '#fff'
                  }
                ]}>
                  {selectedMode === 'fast' ? 'Fast' : 'Accurate'}
                </Animated.Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

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
              source={{ uri: image }}
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
          </View>
        )}
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
</View>
      )}

      {!foodData && renderButtons()}

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
              `~${Math.round(averageProcessingTimes[selectedMode] / 1000)}s`
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
                <Image source={{ uri: modalImageUri }} style={styles.imagePreview} />
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
    </View>
  );
};

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
    paddingTop: isIphoneSE() ? 0 : 40,
  },
  scanCounterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  scanCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
  },
  scanCounterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scanCounterText: {
    fontSize: 16,
    fontWeight: '500',
    color: colorScheme === 'dark' ? '#e0e0e0' : '#333333',
  },
  scanCounterLabel: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#888' : '#666',
    marginRight: 4,
  },
  modeChip: {
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#f0f0f0',
    paddingHorizontal: 12,
    borderRadius: 15,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: colorScheme === 'dark' ? '#3a3a3d' : '#e0e0e0',
    width: 100,
  },
  modeChipAccurate: {
    backgroundColor: colorScheme === 'dark' ? '#1a3f5c' : '#e1f0ff',
    borderColor: colorScheme === 'dark' ? '#234b6b' : '#b8d6f3',
  },
  modeChipText: {
    color: colorScheme === 'dark' ? '#e0e0e0' : '#333333',
    fontSize: 12,
    fontWeight: '500',
  },
  modeIcon: {
    marginRight: 8,
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
    fontSize: 15.5,
    color: colorScheme === 'dark' ? '#AAAAAA' : '#666666',
    marginBottom: 10,
  },
  iconButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  icon: {
    marginRight: 10, // Space between icon and text
  },
  iconButton: {
    padding: 3,
    marginHorizontal: 30,
    backgroundColor: colorScheme === 'dark' ? '#e9e9e9' : '#DDD',
    borderRadius: 100,
  },
  inputModalView: {
    margin: 20,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFFFFF',
    borderRadius: 40,
    padding: 25,
    alignItems: 'center',
    shadowColor: colorScheme === 'dark' ? '#000' : '#999',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 100,
    shadowRadius: 90,
    elevation: 100,
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 2,
    padding: 10,
    width: 300,
    borderColor: colorScheme === 'dark' ? '#4a4a4a' : '#CCCCCC',
    color: colorScheme === 'dark' ? '#c5c5c5' : '#333333',
    borderRadius: 15,
  },
  inputModalButton: {
    backgroundColor: colorScheme === 'dark' ? '#2d2d2d' : '#F0F0F0',
    borderRadius: 90,
    padding: '4%',
    paddingHorizontal: '15%',
    elevation: 2,
    marginTop: '3%',
  },
  inputModalButtonText: {
    color: colorScheme === 'dark' ? 'white' : 'black',
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '500',
    color: colorScheme === 'dark' ? '#e9e9e9' : '#333333',
  },
  noContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 35,
  },
  placeholderTextInScroll: {
    color: colorScheme === 'dark' ? '#4a4a4a' : '#888888',
    fontSize: 16,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    textAlign: 'center',
    marginBottom: 4,
    marginTop: 20,
    marginHorizontal: 25,
  },
  subtitle: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#888888' : '#555555',
    textAlign: 'center',
    marginBottom: 16,
    marginHorizontal: 25,
  },
  scrollViewStyle: {
    flex: 1,
  },
  foodImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  placeholderContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    borderRadius: 24,
    backgroundColor: colorScheme === 'dark' ? '#111' : '#EEE',
  },
  placeholderText: {
    color: colorScheme === 'dark' ? '#4a4a4a' : '#888888',
    fontSize: 16,
    fontWeight: '400',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#F0F0F0',
    marginHorizontal: 15,
    borderRadius: 20,
    paddingVertical: 6,
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
    borderRadius: 90,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    // Remove the border bottom since we're using the sliding indicator
  },
  tabButtonText: {
    color: colorScheme === 'dark' ? '#666' : '#888',
    fontSize: 16,
    fontWeight: '400',
  },
  activeTabButtonText: {
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
    fontWeight: '500',
  },
  scrollContainer: {
    paddingBottom: 100,
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  tabContentContainer: {
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F0F0F0',
    borderRadius: 25,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
  },
  separator: {
    height: 4,
    backgroundColor: colorScheme === 'dark' ? '#333333' : '#CCCCCC',
    marginVertical: 8,
    marginBottom: 16,
    borderRadius: 900,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  nutrientLabel: {
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
    fontSize: 17,
    fontWeight: '400',
  },
  nutrientValue: {
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
    fontSize: 16,
    fontWeight: '500',
  },
  ingredientItem: {
    marginBottom: 5,
  },
  ingredientName: {
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ingredientDescription: {
    color: '#888888',
    fontSize: 14,
  },
  detailText: {
    color: colorScheme === 'dark' ? '#ccc' : '#555',
    fontSize: 16,
    marginBottom: 20,
  },
  detailPrepTime: {
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  detailServingSize: {
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  wikipediaLink: {
    color: '#3498DB',
    fontSize: 16,
    textDecorationLine: 'underline',
    marginTop: 0,
  },
  ingredientDescriptionNote: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  button: {
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#000',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colorScheme === 'dark' ? '#222' : '#bbb',
    padding: 12,
    paddingHorizontal: 20,
    shadowColor: colorScheme === 'dark' ? '#000' : '#AAA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 1,
  },
  buttonText: {
    color: colorScheme === 'dark' ? '#d8d8d8' : '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  feedbackContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    marginBottom: 24,
  },
  feedbackText: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 8,
  },
  feedbackButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  feedbackButton: {
    backgroundColor: colorScheme === 'dark' ? '#333333' : '#CCC',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Slightly transparent background
  },
  loadingTextContainer: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  loadingText: {
    color: colorScheme === 'dark' ? '#a9a9a9' : '#555',
    fontWeight: '500',
    fontSize: 16,
    textAlign: 'center',
  },
  scrollPlaceholderContainer: {
    flexGrow: 1,
    marginBottom: 450,
    marginHorizontal: 35,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    paddingBottom: 100,
  },
  imageContainer: {
    width: '90%',
    height: 200,
    borderRadius: 24,
    marginBottom: 16,
    backgroundColor: colorScheme === 'dark' ? '#111' : '#EEE',
    marginHorizontal: 20,
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
    borderRadius: 20,
    padding: 10,
    top: -80,
    left: '50%',
    transform: [{ translateX: -75 }],
    width: 180,
    alignItems: 'center',
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
  barcodeIconContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 14,
    padding: 7,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    // Add these to show it's interactive
    opacity: 1,
    activeOpacity: 0.7,
  },
  processingTimeText: {
    color: colorScheme === 'dark' ? '#a9a9a9' : '#555',
    fontWeight: '400',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  chipContainer: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  chipAccurate: {
    borderColor: 'rgba(66, 135, 245, 0.6)',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center', // Add this to keep content centered during animation
  },
  chipLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '400',
  },
  chipText: {
    fontSize: 14,
    color: '#fff',
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
    shadowRadius: 10,
    borderRadius: 200,
    padding: 3,
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
    paddingVertical: 30,
    borderRadius: 25, // Match your existing rounded corners
    overflow: 'hidden', // Ensure the blur effect respects the border radius
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loadingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modeText: {
    color: colorScheme === 'dark' ? '#fff' : '#000',
    marginLeft: 8,
    fontWeight: '500',
  },
  scanCounter: {
    backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scanCounterText: {
    color: colorScheme === 'dark' ? '#fff' : '#fff',
    fontWeight: '500',
  },
  loadingContent: {
    alignItems: 'center',
    marginBottom: 30,
  },
  loadingTextContainer: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  estimatedTimeContainer: {
    borderTopWidth: 1,
    borderTopColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    paddingTop: 16,
    marginTop: 8,
  },
  estimatedTimeText: {
    color: colorScheme === 'dark' ? '#999' : '#666',
    fontSize: 14,
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
    paddingVertical: 30,
  },
  modeBadgeContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    backgroundColor: colorScheme === 'dark' ? 'transparent' : 'rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  modeBadgeText: {
    color: colorScheme === 'dark' ? '#fff' : '#000',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  loadingContent: {
    alignItems: 'center',
    marginBottom: 30,
  },
  loadingTextContainer: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: colorScheme === 'dark' ? '#fff' : '#000',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  infoCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    backgroundColor: colorScheme === 'dark' ? 'transparent' : 'rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  infoCardText: {
    color: colorScheme === 'dark' ? '#fff' : '#000',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default FoodScanScreen;