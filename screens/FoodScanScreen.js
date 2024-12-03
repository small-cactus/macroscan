import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigationState } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
  Modal, Alert, useColorScheme, Animated, Linking, TextInput, Dimensions, Platform
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
  ],
  // Add more modes if needed
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

// Add this outside of your component, preferably at the top of your file


const FoodScanScreen = () => {
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

  useEffect(() => {
    const processImageFromCamera = async () => {
      console.log('Received imageUri:', route.params?.imageUri);
      if (route.params?.imageUri) {
        const imageUri = route.params.imageUri;
        // Process the image
        setProcessingImage(imageUri);
        setModalImageUri(imageUri); // Ensure modalImageUri is set
        await sendImageToApi(imageUri);

        // Clear the imageUri from params so it doesn't trigger again
        navigation.setParams({ imageUri: null });
      }
    };

    processImageFromCamera();
  }, [route.params?.imageUri]);

  const getLoadingTextsByMode = (mode) => {
    return LOADING_TEXTS[mode] || LOADING_TEXTS.fast; // Default to 'fast' if mode not found
  };

  const enqueueLoadingText = (text) => {
    setLoadingTextQueue((prevQueue) => [...prevQueue, text]);
  };

  const [averageProcessingTimes, setAverageProcessingTimes] = useState({
    fast: 5000, // in milliseconds
    accurate: 10000,
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

  const startLoadingAnimation = () => {
    if (isAnimationRunningRef.current) return;
    isAnimationRunningRef.current = true;
    const loadingTexts = getLoadingTextsByMode(selectedMode);
  
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
        // Schedule the first fade out after display duration
        loadingTimeoutRef.current = setTimeout(() => {
          updateLoadingText();
        }, 0); // Display duration
      });
    });
  
    const mode = selectedMode;
    const averageTime = averageProcessingTimes[mode] || 8000;
    console.log(`Predicted processing time for mode ${mode}: ${averageTime} ms`);
  
    // Schedule "Almost done..."
    setTimeout(() => {
      console.log(`Scheduling "Almost done..." at ${averageTime * 0.7} ms`);
      // Replace the loadingTextQueue with "Almost done..." and skip remaining texts
      loadingTextQueueRef.current = ["Almost done..."];
      isHoldingRef.current = true;
  
      // Force an update to display "Almost done..."
      updateLoadingText();
    }, averageTime * 0.7);
  
    // Schedule "Taking longer than usual..."
    setTimeout(() => {
      console.log(`Scheduling "Taking longer than usual..." at ${averageTime + 2000} ms`);
      loadingTextQueueRef.current = ["Taking longer than usual..."];
      isHoldingRef.current = false;
  
      // Continue updates
      updateLoadingText();
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
  if (loadingTimeoutRef.current) {
    clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = null;
  }
  // Fade out the parent container
  Animated.timing(fadeAnim, {
    toValue: 0, // Fade out
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
        const firstUseDate = await AsyncStorage.getItem('firstUseDate');
        const today = new Date().toISOString().slice(0, 10);

        if (!firstUseDate) {
          await AsyncStorage.setItem('firstUseDate', today);
          setIsFirstDayUnlimited(true);
          setScanCount(Infinity);
        } else {
          setIsFirstDayUnlimited(firstUseDate === today);
        }

        const dateLastUsed = await AsyncStorage.getItem('dateLastUsed');
        if (dateLastUsed !== today) {
          await AsyncStorage.setItem('dailyScanCount', '0');
          await AsyncStorage.setItem('dateLastUsed', today);
          setScanCount(0);
        } else {
          const count = await AsyncStorage.getItem('dailyScanCount');
          setScanCount(parseInt(count, 10) || 0);
        }

        const model = await AsyncStorage.getItem('selectedModel');
        if (model) {
          setSelectedModel(model);
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
      if (isIAPEnabled) {
        try {
          const purchases = await RNIap.getAvailablePurchases();

          const hasActivePlusPlusSubscription = purchases.some(purchase =>
            purchase.productId === 'macroscan_plusplus' ||
            purchase.productId === 'macroscan_plusplus_yearly'
          );

          const hasActivePlusSubscription = purchases.some(purchase =>
            purchase.productId === 'macroscan_plus'
          );

          if (hasActivePlusPlusSubscription) {
            setIsSubscribed(true);
            setIsSubscribedPlus(false);
          } else if (hasActivePlusSubscription) {
            setIsSubscribed(false);
            setIsSubscribedPlus(true);
          } else {
            setIsSubscribed(false);
            setIsSubscribedPlus(false);
          }

        } catch (err) {
          console.error('Failed to check subscriptions:', err);
          setIsSubscribed(false);
          setIsSubscribedPlus(false);
        }
      } else {
        if (user?.subscriptionStatus === 'plusplus') {
          setIsSubscribed(true);
          setIsSubscribedPlus(false);
        } else if (user?.subscriptionStatus === 'plus') {
          setIsSubscribed(false);
          setIsSubscribedPlus(true);
        } else {
          setIsSubscribed(false);
          setIsSubscribedPlus(false);
        }
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
      };
      console.log('Storing product details:', JSON.stringify(productDetailsWithDate, null, 2)); // Added logging

      existingHistory.push(productDetailsWithDate);
      const newHistoryJson = JSON.stringify(existingHistory);
      await AsyncStorage.setItem('@product_history', newHistoryJson);
      // console.log("Updated History: ", existingHistory);
    } catch (e) {
      console.error("Error storing product details: ", e);
    }
  };

  const pickImage = async () => {
    if (isFirstDayUnlimited || isSubscribed) {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets) {
        const manipulatedImage = await manipulateAsync(
          result.assets[0].uri,
          [],
          { format: SaveFormat.JPEG, compress: 0.8 }
        );
        setProcessingImage(manipulatedImage.uri);
        setModalImageUri(manipulatedImage.uri); // Ensure modalImageUri is set
        await sendImageToApi(manipulatedImage.uri);
      }
    } else if ((isSubscribedPlus && scanCount < 20) || (!isSubscribed && scanCount < 5)) {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets) {
        const manipulatedImage = await manipulateAsync(
          result.assets[0].uri,
          [],
          { format: SaveFormat.JPEG, compress: 0.8 }
        );
        setProcessingImage(manipulatedImage.uri);
        setModalImageUri(manipulatedImage.uri); // Ensure modalImageUri is set
        await sendImageToApi(manipulatedImage.uri);
      }
    } else {
      const timeLeft = getTimeUntilMidnight();
      Alert.alert("No more Scans left", `Upgrade for unlimited scans or wait ${timeLeft} for more scans.`);
    }
  };

  const takePhoto = async () => {
    navigation.navigate('CameraScreen');
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

  const sendImageToApi = async (imageUri) => {
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
    const startTime = Date.now(); // Start time measurement
  
    console.log("Starting API call with mode:", mode);
    console.log(currentLoadingText);
  
    let foodFound = false; // Local variable to track if food was found
  
    try {
      const base64Image = await imageToBase64(imageUri);
  
      // Define your system prompts here (unchanged)
      const systemPromptFast = `You are an AI assistant specialized in analyzing food images and providing detailed nutritional information. Your primary goal is to determine the nutrient content of the food provided in the image with the highest possible accuracy, while maintaining transparency about potential uncertainties.
  
  When presented with an image, follow these steps:
  
  1. Carefully examine the image to identify all food items or components of the meal, including those that may be partially visible or in small quantities.
  2. If the image does not contain food, respond only with "{No Food Found.}"
  
  IMPORTANT STEPS:
  
  3. Pay meticulous attention to serving size measurements. Provide nutrient information based precisely on the serving size shown in the image. For example, if the image depicts a whole jar of peanut butter, report nutrients for the entire jar. If it shows 2/3 of a cookie, provide nutrients for 2/3 of a cookie. Aim for maximum accuracy in all calculations. Ensure the serving size value correctly represents the entire food content visible in the image. For instance, if the image shows a plate of food, the serving size should be "1 plate." If it displays 2/3 of a cookie, the serving size should be "2/3 cookie."
  4. Clearly state any assumptions or adjustments made specific to the image within the details value. For example, if you only analyzed 2/3 of a cookie because that's what was shown in the image, explicitly mention this. Your explanation might read: "Nutrient information is provided for 2/3 of a cookie, as that was the portion visible in the image." This transparency ensures the user understands the basis of your nutrient calculations.
  
  5. For food images, analyze and provide the following information in JSON format:
  
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
  
  Include anything you saw like, drinks, condiments, or other items that were NOT included in the calculations for macronutrients inside the 'details' section of the JSON output. These things might include condiments, also include things you are unsure about in the details screen. Be specific and concise. 
  `;
  
      const systemPromptAccurate = `You are an AI assistant specialized in analyzing food images and providing detailed nutritional information. Your primary goal is to determine the nutrient content of the food provided in the image with the highest possible accuracy, while maintaining transparency about potential uncertainties.
  
  You will be provided with an image to analyze:
  
  Carefully examine the image to identify all food items or components of the meal, including those that may be partially visible or in small quantities. If the image does not contain any food at all, respond only with "{No Food Found.}" and stop your analysis there.
  
  For food images, analyze using the following process:
  
  1. Use <brainstorm> tags to create a tree of thought about the nutrient content of the image. Generate at least 3 different thought paths, considering various possibilities for food identification and portion sizes.
  
  2. Use <thinking> tags to reason on each of your brainstorm paths. Verify your findings as best as you can using the food database provided. Consider factors such as preparation methods, hidden ingredients, and regional variations that might affect nutritional content.
  
  3. Use <reasoning> tags to refine and rethink your original analysis for each path, verifying it once more. Cross-examine your assumptions and check for any inconsistencies or overlooked details.
  
  4. After completing each thought path (you should conduct at least three in this reply), use <score> tags to rate the quality and confidence of that path on a scale from -100 to 100. Consider factors such as completeness, accuracy, and confidence in your assessment. Provide a detailed justification for your score before stating the numerical value.
  
  5. Select the thought path with the highest score and summarize it using <best_path> tags. Include your final nutritional analysis, detailing macronutrients (proteins, carbohydrates, fats) and estimated calorie content. If possible, include information on key micronutrients as well.
  
  Throughout your analysis, maintain transparency about uncertainties and avoid overconfidence in your estimations. Clearly state when you are making assumptions or when certain aspects of the nutritional content are difficult to determine from the image alone.
  
  Additionally, ensure that any seen foods, drinks, condiments, or other items that were NOT included in the calculations for macronutrients are noted, so they can be included in the 'details' section of the JSON output.
  
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
  
  Remember, your analysis should help users make informed dietary decisions while acknowledging the limitations of visual assessment. Always prioritize accuracy and transparency over providing a complete but potentially inaccurate analysis.
  `;
  
      const systemPromptAccurateJson = `Based on your previous analysis, particularly focusing on the highest-scored thought path you identified, provide the following information in JSON format:
  
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
                setFoodData(parsedData.food);
                setNoFoodFound(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                fadeOutTab('Nutrition');
      
                await storeProductDetails({
                  productName: parsedData.food.name,
                  imageUri: imageUri,
                  nutrients: parsedData.food,
                  date: new Date().toISOString(),
                });
      
                foodFound = true;
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
              setFoodData(parsedData.food);
              setNoFoodFound(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              fadeOutTab('Nutrition');
      
              await storeProductDetails({
                productName: parsedData.food.name,
                imageUri: imageUri,
                nutrients: parsedData.food,
                date: new Date().toISOString(),
              });
      
              foodFound = true;
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
                setFoodData(parsedData.food);
                setNoFoodFound(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                fadeOutTab('Nutrition');
  
                // Directly store the product details
                await storeProductDetails({
                  productName: parsedData.food.name,
                  imageUri: imageUri,
                  nutrients: parsedData.food,
                  date: new Date().toISOString(),
                });
  
                foodFound = true; // Food was found
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
                      "Analyze this image and provide nutritional information as specified. If the image doesn't contain any food AT ALL, just say '{No Food Found.}'",
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
                setFoodData(parsedData.food);
                setNoFoodFound(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                fadeOutTab('Nutrition');
  
                // Directly store the product details
                await storeProductDetails({
                  productName: parsedData.food.name,
                  imageUri: imageUri,
                  nutrients: parsedData.food,
                  date: new Date().toISOString(),
                });
  
                foodFound = true;
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
        const processingDuration = endTime - startTime;
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

  const handleTabPress = (tab) => {
    if (!isTabsDisabled) {
      fadeOutTab(tab);
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
          <Animated.Image
            source={{ uri: image }}
            style={[styles.foodImage, { opacity: fadeAnimImage }]}
          />
        )}
      </View>

      <View style={styles.scanCounterContainer}>
        <TouchableOpacity
          style={styles.scanCounter}
          onPress={() => {
            let message = '';
            if (isFirstDayUnlimited || isSubscribed) {
              message = "You have unlimited scans today.";
            } else if (isSubscribedPlus) {
              message = `You have used ${scanCount} of 20 scans today.`;
            } else {
              message = `You have used ${scanCount} of 5 scans today.`;
            }
            Alert.alert("Scan Limit", message);
          }}
        >
          <View style={styles.scanCounterContent}>
            {isSubscribed || isFirstDayUnlimited ? (
              <FontAwesomeIcon
                icon={faInfinity}
                size={24}
                color={colorScheme === 'dark' ? '#e9e9e9' : '#000'}
              />
            ) : (
              <Text style={styles.scanCounterText}>
                {isSubscribedPlus ? (20 - scanCount) : (5 - scanCount)}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
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
      <Entypo name="chevron-down" size={32} color="#FFFFFF" />
    </TouchableOpacity>
  </Animated.View>
)}

      <Modal
  transparent={true}
  animationType="fade"
  visible={isLoading}
>
  <View style={styles.modalBackground}>
    <View style={styles.activityIndicatorWrapper}>
      <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#FFF' : '#000'} />
      <Animated.View
        style={[
          styles.loadingTextContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
<Animated.Text style={[styles.loadingText, { opacity: loadingTextFadeAnim }]}>
  {currentLoadingText}
</Animated.Text>
      </Animated.View>
    </View>
  </View>
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
    position: 'absolute',
    top: isIphoneSE() ? 30 : 50,
    right: 20,
  },
  scanCounter: {
    borderWidth: 2.5,
    borderColor: colorScheme === 'dark' ? '#5a5a5a' : '#CCCCCC',
    borderRadius: 50,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    width: 40,
  },
  scanCounterText: {
    fontSize: 21,
    fontWeight: '500',
    color: colorScheme === 'dark' ? '#e0e0e0' : '#333333',
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
    backgroundColor: colorScheme === 'dark' ? 'black' : '#FFFFFF',
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
    borderRadius: 13,
    paddingVertical: 4,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: colorScheme === 'dark' ? '#FFFFFF' : '#000',
  },
  tabButtonText: {
    color: '#888888',
    fontSize: 16,
  },
  activeTabButtonText: {
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
    fontWeight: '400',
  },
  scrollContainer: {
    paddingBottom: 100,
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  tabContentContainer: {
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F0F0F0',
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
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
    borderColor: colorScheme === 'dark' ? '#222' : '#fff',
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
    backgroundColor: colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(50, 50, 50, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
    borderRadius: 24,
    marginBottom: 16,
    backgroundColor: colorScheme === 'dark' ? '#111' : '#EEE',
    marginHorizontal: 20,
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
});

export default FoodScanScreen;
