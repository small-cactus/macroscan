import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator,
  Animated, 
  Dimensions, 
  Platform, 
  Alert,
  useColorScheme
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation, useNavigationState } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useUser } from '../userContext';
import { useTimeZone } from '../TimeZoneContext';
import { useIAP } from '../IAPContext';
import { handleAnthropicScan, handleOpenAIScan, handleGeminiScan } from './providers';
import { getModel } from './providers/models';
import { updateAverageProcessingTime } from './providers/processingTimes';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const MultiFoodScanScreen = () => {
  // Core state for managing multiple food scans
  const [foodQueue, setFoodQueue] = useState([]);
  const [processingItems, setProcessingItems] = useState([]);
  const [completedItems, setCompletedItems] = useState([]);
  const [failedItems, setFailedItems] = useState([]);
  
  // UI state
  const [image, setImage] = useState(null);
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);
  const colorScheme = useColorScheme();
  const styles = getDynamicStyles(colorScheme);
  
  // External hooks
  const { user, apiKeys } = useUser();
  const { isIAPEnabled } = useIAP();
  const navigation = useNavigation();
  const { getTodayString, getTimeUntilMidnight } = useTimeZone();
  
  // For tracking scan limits
  const [scanCount, setScanCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribedPlus, setIsSubscribedPlus] = useState(false);
  const [isFirstDayUnlimited, setIsFirstDayUnlimited] = useState(false);

  // Settings
  const [selectedMode, setSelectedMode] = useState('fast');
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [selectedModel, setSelectedModel] = useState(null);
  
  // Refs to track processing state
  const isProcessingRef = useRef(false);
  const startTimeRef = useRef(null);
  const isMountedRef = useRef(true);

  // Add notification state
  const [notification, setNotification] = useState(null);
  const notificationOpacity = useRef(new Animated.Value(0)).current;
  
  // Add progress animation to processingItems state and UI
  const [processingProgress, setProcessingProgress] = useState({});

  // Add state for scan options dropdown
  const [showScanOptions, setShowScanOptions] = useState(false);
  const scanOptionsAnim = useRef(new Animated.Value(0)).current;

  // Add this ref for progress intervals
  const progressIntervalsRef = useRef({});

  // Add these refs for animations
  const heightAnimRef = useRef(new Animated.Value(0)).current;
  
  // Add this ref at the top level with other refs
  const elapsedTimeRef = useRef({});

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      console.log('Component is unmounting - canceling all operations');
      isMountedRef.current = false;
      
      // Clear all progress animation intervals
      if (progressIntervalsRef.current) {
        Object.values(progressIntervalsRef.current).forEach(interval => {
          if (interval) clearInterval(interval);
        });
        progressIntervalsRef.current = {};
      }
    };
  }, []);
  
  // Load user preferences and settings
  useFocusEffect(
    useCallback(() => {
      const loadSettings = async () => {
        try {
          // Load provider setting
          const provider = await AsyncStorage.getItem('@selected_provider') || 'anthropic';
          setSelectedProvider(provider);
          
          // Load mode setting
          const mode = await AsyncStorage.getItem('selectedMode') || 'fast';
          setSelectedMode(mode);
          
          // Get the current model
          const currentModel = getModel(provider, {
            selectedMode: mode,
            selectedModel: await AsyncStorage.getItem('selectedModel'),
            hasDrawing: false
          });
          
          setSelectedModel(currentModel);
          
          // Load subscription status
          checkSubscriptionStatus();
          
          // Initialize app data (scan counts, etc.)
          initializeAppData();
        } catch (error) {
          console.error("Error loading settings:", error);
        }
      };
      
      loadSettings();
    }, [])
  );
  
  // Check user's subscription status
  const checkSubscriptionStatus = async () => {
    try {
      // Use the user context to determine subscription status
      if (user?.subscriptionStatus === 'macroscan_unlimited' || 
          user?.subscriptionStatus === 'macroscan_plusplus') {
        setIsSubscribed(true);
        setIsSubscribedPlus(false);
      } else if (user?.subscriptionStatus === 'macroscan_plus') {
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
  
  // Initialize app data (scan counts, first use date)
  const initializeAppData = async () => {
    try {
      const today = getTodayString();
  
      // Check first use date
      const firstUseDate = await AsyncStorage.getItem('firstUseDate');
      
      // Validate first use date
      const isValidFirstUseDate = firstUseDate && 
                                 /^\d{4}-\d{2}-\d{2}$/.test(firstUseDate) && 
                                 !isNaN(new Date(firstUseDate).getTime());
      
      if (!isValidFirstUseDate) {
        // If first use date is invalid or doesn't exist, set it to today
        await AsyncStorage.setItem('firstUseDate', today);
        setIsFirstDayUnlimited(true);
        setScanCount(0);
      } else {
        setIsFirstDayUnlimited(firstUseDate === today);
      }
  
      // Check if date changed since last use and reset counters if needed
      const dateLastUsed = await AsyncStorage.getItem('dateLastUsed');
      const isValidLastUsed = dateLastUsed && 
                             /^\d{4}-\d{2}-\d{2}$/.test(dateLastUsed) && 
                             !isNaN(new Date(dateLastUsed).getTime());
      
      if (!isValidLastUsed || dateLastUsed !== today) {
        // Reset the counters for a new day
        await AsyncStorage.setItem('dailyScanCount', '0');
        await AsyncStorage.setItem('dateLastUsed', today);
        setScanCount(0);
      } else {
        // Load existing counter
        const count = await AsyncStorage.getItem('dailyScanCount');
        setScanCount(parseInt(count, 10) || 0);
      }
    } catch (error) {
      console.error("Error initializing app data:", error);
      
      // Set safe defaults
      setIsFirstDayUnlimited(false);
      setScanCount(0);
      
      // Ensure dateLastUsed is set
      await AsyncStorage.setItem('dateLastUsed', getTodayString());
    }
  };
  
  // Increment the scan count
  const incrementScanCount = useCallback(async () => {
    if (!isFirstDayUnlimited && !isSubscribed) {
      const newCount = scanCount + 1;
      setScanCount(newCount);
      await AsyncStorage.setItem('dailyScanCount', newCount.toString());
    }
  }, [isFirstDayUnlimited, isSubscribed, scanCount]);

  // Show notification when item is processed
  const showNotification = useCallback((item, isSuccess = true) => {
    if (!isMountedRef.current) return;
    
    setNotification({
      message: isSuccess 
        ? `${item.result?.name || 'Food item'} processed successfully!` 
        : `Failed to process item. Tap to retry.`,
      type: isSuccess ? 'success' : 'error',
      item,
      timestamp: Date.now()
    });
    
    Animated.sequence([
      Animated.timing(notificationOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(notificationOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Only clear notification if component is still mounted
      if (isMountedRef.current) {
        setNotification(null);
      }
    });
  }, []);
  
  // Add a food item to the queue
  const addToQueue = useCallback(async (imageUri) => {
    try {
      if (!isMountedRef.current) {
        console.log('Component unmounted, not adding to queue');
        return null;
      }
      
      setIsAddingToQueue(true);
      
      // Resize the image
      const resizedImage = await resizeImage(imageUri);
      
      // Check if component is still mounted after async operation
      if (!isMountedRef.current) {
        console.log('Component unmounted during image resize');
        return null;
      }
      
      // Create a unique ID using timestamp + random string
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const scanId = `${timestamp}-${randomStr}`;
      
      // Add to queue
      const newItem = {
        id: scanId,
        imageUri: resizedImage,
        originalUri: imageUri,
        status: 'queued',
        addedAt: new Date(),
        result: null,
        progress: 0,
      };
      
      // First update the queue state if component is still mounted
      if (isMountedRef.current) {
        setFoodQueue(prevQueue => [...prevQueue, newItem]);
        
        // Wait a moment for state to update before processing
        setTimeout(() => {
          if (isMountedRef.current) {
            console.log(`Added item ${scanId} to queue, now processing...`);
            processQueue();
          }
        }, 100);
      }
      
      return scanId; // Return the ID of the added item
    } catch (error) {
      console.error('Error adding to queue:', error);
      if (isMountedRef.current) {
        Alert.alert('Error', 'Failed to add item to queue');
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsAddingToQueue(false);
      }
    }
  }, []);
  
  // Start a progress animation for a processing item with robust cleanup
  const startProgressAnimation = useCallback((itemId) => {
    // Don't proceed if component is unmounting
    if (!isMountedRef.current) {
      console.log(`Component unmounted, not starting animation for ${itemId}`);
      return null;
    }
    
    console.log(`Starting progress animation for item ${itemId}`);
    
    // Ensure we have a valid reference object
    if (!progressIntervalsRef.current) {
      progressIntervalsRef.current = {};
    }
    
    // Clear any existing interval for this item
    if (progressIntervalsRef.current[itemId]) {
      console.log(`Clearing existing interval for item ${itemId}`);
      clearInterval(progressIntervalsRef.current[itemId]);
      delete progressIntervalsRef.current[itemId];
    }
    
    // Initialize progress at 0
    if (isMountedRef.current) {
      setProcessingProgress(prev => ({
        ...prev,
        [itemId]: 0
      }));
    }
    
    // Animate progress from 0 to 100 over time
    let progress = 0;
    const interval = setInterval(() => {
      // Skip updates if component unmounted
      if (!isMountedRef.current) {
        clearInterval(interval);
        return;
      }
      
      progress += 2;
      
      // Slow down as we get closer to 100%
      if (progress > 70) {
        progress += 0.5;
      } else if (progress > 85) {
        progress += 0.2;
      }
      
      // Update progress state
      if (progress <= 98) {
        if (isMountedRef.current) {
          setProcessingProgress(prev => ({
            ...prev,
            [itemId]: progress
          }));
        }
      } else {
        console.log(`Progress animation for item ${itemId} reaching completion`);
        clearInterval(interval);
        
        if (progressIntervalsRef.current) {
          delete progressIntervalsRef.current[itemId];
        }
        
        // Set final progress to 98%
        if (isMountedRef.current) {
          setProcessingProgress(prev => ({
            ...prev,
            [itemId]: 98
          }));
        }
      }
    }, 300);
    
    // Store the interval ID if component still mounted
    if (isMountedRef.current && progressIntervalsRef.current) {
      progressIntervalsRef.current[itemId] = interval;
      console.log(`Progress interval set for item ${itemId}`);
    } else {
      clearInterval(interval);
    }
    
    return interval;
  }, []);
  
  // Process the next item in the queue
  const processQueue = useCallback(async () => {
    // Don't proceed if component is unmounting
    if (!isMountedRef.current) {
      console.log('Component unmounted, aborting queue processing');
      return;
    }
    
    console.log(`processQueue called - checking queue state`);
    
    // Get latest state directly to ensure we have the most up-to-date values
    const currentQueue = foodQueue;
    const currentProcessingItems = processingItems;
    
    // If no items in queue or already processing max items, do nothing
    if (currentQueue.length === 0) {
      console.log('No items in queue to process');
      return;
    }
    
    if (currentProcessingItems.length >= 2) {
      console.log(`Already processing ${currentProcessingItems.length} items (max: 2), waiting to process more`);
      return;
    }
    
    console.log(`Processing next item from queue (${currentQueue.length} items in queue)`);
    
    // Get the next item from the queue
    const nextItem = currentQueue[0];
    
    if (!nextItem || !nextItem.id) {
      console.error('Invalid queue item, skipping processing');
      if (isMountedRef.current) {
        setFoodQueue(prevQueue => prevQueue.slice(1)); // Remove invalid item
      }
      return;
    }
    
    console.log(`Processing queue item ${nextItem.id}`);
    
    // Create a new item object with the progressive interval stored separately
    const processingItem = { 
      ...nextItem, 
      status: 'processing',
      startTime: Date.now() 
    };
    
    // Move from queue to processing (but only if component is still mounted)
    if (!isMountedRef.current) {
      console.log('Component unmounted during processing, aborting');
      return;
    }
    
    setFoodQueue(prevQueue => prevQueue.filter(item => item.id !== nextItem.id));
    setProcessingItems(prevProcessing => [...prevProcessing, processingItem]);
    
    // Start progress animation for this item
    if (isMountedRef.current) {
      startProgressAnimation(nextItem.id);
      
      // Process the item using the existing API functions
      // Use setTimeout to ensure state updates have completed
      setTimeout(() => {
        if (isMountedRef.current) {
          processImageItem(nextItem).catch(error => {
            if (isMountedRef.current) {
              console.error('Unhandled error in processImageItem:', error);
              handleProcessingFailed(nextItem.id, error);
            }
          });
        }
      }, 100);
    }
  }, [foodQueue, processingItems, startProgressAnimation]);
  
  // Process an individual food item
  const processImageItem = useCallback(async (item) => {
    try {
      console.log(`Starting to process item ${item.id}`);
      startTimeRef.current = Date.now();
      
      // Get API key based on selected provider
      const apiKey = apiKeys?.[selectedProvider + 'ApiKey'];
        
      if (!apiKey) {
        console.error(`API key not found for ${selectedProvider}`);
        handleProcessingFailed(item.id, new Error(`API key not found for ${selectedProvider}`));
        return false;
      }
      
      // Ensure we have proper image data format
      let processableImage = item.imageUri;
      if (processableImage.startsWith('data:image/jpeg;base64,')) {
        processableImage = processableImage.replace('data:image/jpeg;base64,', '');
      }
      
      // Add debugging log
      console.log(`Processing image with provider: ${selectedProvider}, model: ${selectedModel}, mode: ${selectedMode}`);
      
      // Set up parameters for the API call
      const providerParams = {
        selectedModel: selectedModel,
        selectedMode: selectedMode,
        base64Image: processableImage,
        barcodeData: null,
        hasDrawing: false,
        apiKey,
        handleSuccessfulScan: (parsedData, imageUri) => {
          console.log(`Successfully processed item ${item.id}`);
          if (!parsedData || !parsedData.food) {
            console.error('Invalid response structure:', parsedData);
            handleProcessingFailed(item.id, new Error('Invalid API response'));
            return false;
          }
          
          // On success, update the item and mark as completed
          handleProcessingComplete(item.id, parsedData.food);
          
          // Increment scan count if needed
          incrementScanCount();
          
          return true;
        },
        handleError: (error) => {
          console.error(`Error processing item ${item.id}:`, error);
          handleProcessingFailed(item.id, error);
        },
        imageUri: processableImage,
        startTimeRef,
        updateAverageProcessingTime,
        isFirstDayUnlimited,
        isSubscribed,
        setNoFoodFound: () => {
          console.log(`No food found in item ${item.id}`);
          handleProcessingFailed(item.id, new Error('No food found in image'));
        },
      };
      
      // Call the appropriate provider based on selection
      let result = false;
      try {
        switch (selectedProvider) {
          case 'openai':
            result = await handleOpenAIScan(providerParams);
            break;
          case 'gemini':
            result = await handleGeminiScan(providerParams);
            break;
          case 'anthropic':
          default:
            result = await handleAnthropicScan(providerParams);
            break;
        }
        
        if (!result) {
          console.log(`No result returned for item ${item.id}, but no error thrown`);
          // If we didn't get an error but also didn't get a successful result,
          // we'll consider this a failure
          handleProcessingFailed(item.id, new Error('Processing failed or timed out'));
        }
        
        return result;
      } catch (providerError) {
        console.error(`Provider error for item ${item.id}:`, providerError);
        handleProcessingFailed(item.id, providerError);
        return false;
      }
    } catch (error) {
      console.error('Critical error processing food item:', error);
      handleProcessingFailed(item.id, error);
      return false;
    }
  }, [
    selectedProvider, 
    selectedModel, 
    selectedMode, 
    apiKeys, 
    isFirstDayUnlimited, 
    isSubscribed, 
    incrementScanCount
  ]);
  
  // Update handleProcessingComplete to show notification and use useCallback
  const handleProcessingComplete = useCallback((itemId, result) => {
    if (!isMountedRef.current) return;

    // Use functional update to get latest state
    setProcessingItems(prevProcessing => {
      const item = prevProcessing.find(item => item.id === itemId);
      if (!item) {
        console.error(`Item ${itemId} not found in processing items`);
        return prevProcessing;
      }

      // Update progress to 100% immediately
      setProcessingProgress(prev => ({ ...prev, [itemId]: 100 }));

      // Clear progress interval
      if (progressIntervalsRef.current?.[itemId]) {
        clearInterval(progressIntervalsRef.current[itemId]);
        delete progressIntervalsRef.current[itemId];
      }

      // Calculate processing time
      const processingTime = ((Date.now() - (item.startTime || Date.now())) / 1000).toFixed(1);
      console.log(`Item ${itemId} processed in ${processingTime}s`);

      const completedItem = {
        ...item,
        status: 'completed',
        result: result,
        completedAt: new Date(),
        processingTime: processingTime
      };

      // Update completed items
      setCompletedItems(prev => [completedItem, ...prev]);

      // Return filtered processing items
      return prevProcessing.filter(i => i.id !== itemId);
    });

    // Rest of the function...
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showNotification({ ...completedItem, result }, true);

    setTimeout(() => {
      if (isMountedRef.current && foodQueue.length > 0) {
        processQueue();
      }
    }, 300);
  }, [foodQueue.length, processQueue, showNotification]);
  
  // Update handleProcessingFailed to show error notification and use useCallback
  const handleProcessingFailed = useCallback((itemId, error) => {
    // Don't proceed if component is unmounting
    if (!isMountedRef.current) {
      console.log(`Component unmounted, aborting failure handling for ${itemId}`);
      return;
    }
    
    console.log(`Processing failed for item ${itemId}: ${error.message}`);
    
    const item = processingItems.find(item => item.id === itemId);
    
    if (!item) {
      console.error(`Failed item ${itemId} not found in processing items`);
      return;
    }
    
    // Clear the progress animation interval
    if (progressIntervalsRef.current && progressIntervalsRef.current[itemId]) {
      console.log(`Clearing progress interval for failed item ${itemId}`);
      clearInterval(progressIntervalsRef.current[itemId]);
      delete progressIntervalsRef.current[itemId];
    }
    
    const failedItem = {
      ...item,
      status: 'failed',
      error: error,
      failedAt: new Date()
    };
    
    // Only update state if component is still mounted
    if (isMountedRef.current) {
      // Move from processing to failed
      setProcessingItems(prev => prev.filter(i => i.id !== itemId));
      setFailedItems(prev => [failedItem, ...prev]);
      
      // Notify user of failure
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Show error notification
      showNotification(failedItem, false);
      
      // Process next item in queue if available
      setTimeout(() => {
        if (isMountedRef.current && foodQueue.length > 0 && processingItems.length < 2) {
          console.log(`Checking for next item after failure`);
          processQueue();
        }
      }, 300);
    }
  }, [processingItems, foodQueue, startProgressAnimation]);
  
  // Improve the image resizing utility for better reliability
  const resizeImage = async (uri) => {
    try {
      // Log the initial URI
      console.log(`Resizing image: ${uri.substring(0, 30)}...`);
      
      // If it's already a base64 string, don't process it again
      if (uri.startsWith('data:image/jpeg;base64,')) {
        console.log('Image is already in base64 format, returning as is');
        return uri.replace('data:image/jpeg;base64,', '');
      }
      
      let compressQuality = 0.8; // Start with good quality
      const actions = [{ resize: { width: 1024 } }]; // Resize to reasonable dimensions
      let result;
      
      // First attempt - standard quality
      try {
        result = await manipulateAsync(
          uri, 
          actions, 
          { 
            compress: compressQuality, 
            format: SaveFormat.JPEG, 
            base64: true 
          }
        );
        
        // Calculate approximate size
        const sizeBytes = Math.ceil((result.base64?.length || 0) * 3 / 4);
        console.log(`Resized image size: ${(sizeBytes / 1024 / 1024).toFixed(2)} MB with quality ${compressQuality}`);
        
        // If size is acceptable, return the result
        if (sizeBytes <= 4 * 1024 * 1024) { // 4MB limit
          return result.base64;
        }
        
        // If too large, try with lower quality
        compressQuality = 0.6;
        console.log(`Image too large, trying with lower quality: ${compressQuality}`);
        
        result = await manipulateAsync(
          uri, 
          actions, 
          { 
            compress: compressQuality, 
            format: SaveFormat.JPEG, 
            base64: true 
          }
        );
        
        return result.base64;
      } catch (error) {
        console.error('Error in primary resize attempt:', error);
        
        // Fallback to a more aggressive approach
        try {
          // More aggressive resize and compression
          const fallbackActions = [{ resize: { width: 800 } }];
          console.log('Using fallback resize approach with width: 800');
          
          result = await manipulateAsync(
            uri, 
            fallbackActions, 
            { 
              compress: 0.5, 
              format: SaveFormat.JPEG, 
              base64: true 
            }
          );
          
          return result.base64;
        } catch (fallbackError) {
          console.error('Critical error in image resizing:', fallbackError);
          throw new Error('Failed to resize image after multiple attempts');
        }
      }
    } catch (error) {
      console.error('Error resizing image:', error);
      throw error;
    }
  };
  
  // Add functionality to retry a failed item
  const retryFailedItem = (itemId) => {
    // Find the failed item
    const failedItem = failedItems.find(item => item.id === itemId);
    
    if (!failedItem) return;
    
    // Move back to queue
    setFailedItems(prev => prev.filter(item => item.id !== itemId));
    setFoodQueue(prev => [...prev, {
      ...failedItem,
      status: 'queued',
      addedAt: new Date()
    }]);
    
    // Process queue if not already processing maximum items
    if (processingItems.length < 2) {
      processQueue();
    }
    
    // Notify user
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // Pick image from gallery
  const pickImage = async () => {
    try {
      // Check scan limits before picking images
      if (!isSubscribed && !isFirstDayUnlimited && scanCount >= 5) {
        const timeLeft = getTimeUntilMidnight().formatted;
        Alert.alert(
          "Scan Limit Reached",
          `You've reached your daily scan limit. Please wait ${timeLeft} for more scans or upgrade for unlimited access.`
        );
        return;
      }
      
      if (isSubscribedPlus && !isFirstDayUnlimited && scanCount >= 20) {
        const timeLeft = getTimeUntilMidnight().formatted;
        Alert.alert(
          "Scan Limit Reached",
          `You've reached your daily scan limit of 20. Please wait ${timeLeft} for more scans or upgrade for unlimited access.`
        );
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });

      if (!result.canceled) {
        // Handle single or multiple images
        const selectedUris = result.assets.map(asset => asset.uri);
        
        // Check if adding these would exceed limits
        const remainingScans = isSubscribed || isFirstDayUnlimited 
          ? Infinity 
          : isSubscribedPlus 
            ? 20 - scanCount 
            : 5 - scanCount;
            
        if (selectedUris.length > remainingScans) {
          Alert.alert(
            "Scan Limit Warning",
            `You only have ${remainingScans} scans remaining. Only the first ${remainingScans} images will be processed.`
          );
          
          // Only process up to the remaining limit
          for (let i = 0; i < Math.min(remainingScans, selectedUris.length); i++) {
            await addToQueue(selectedUris[i]);
          }
        } else {
          // Process all selected images
          for (const uri of selectedUris) {
            await addToQueue(uri);
          }
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };
  
  // Take a photo
  const takePhoto = async () => {
    // Check scan limits before taking photo
    if (!isSubscribed && !isFirstDayUnlimited && scanCount >= 5) {
      const timeLeft = getTimeUntilMidnight().formatted;
      Alert.alert(
        "Scan Limit Reached",
        `You've reached your daily scan limit. Please wait ${timeLeft} for more scans or upgrade for unlimited access.`
      );
      return;
    }
    
    if (isSubscribedPlus && !isFirstDayUnlimited && scanCount >= 20) {
      const timeLeft = getTimeUntilMidnight().formatted;
      Alert.alert(
        "Scan Limit Reached",
        `You've reached your daily scan limit of 20. Please wait ${timeLeft} for more scans or upgrade for unlimited access.`
      );
      return;
    }
    
    navigation.navigate('CameraScreen', { returnToMultiFoodScan: true });
  };
  
  // Define processImageFromCamera outside the useFocusEffect
  const processImageFromCamera = useCallback(async () => {
    try {
      // Get params from navigation state in a more reliable way
      const routes = navigation.getState()?.routes || [];
      const currentRoute = routes.find(r => r.name === 'MultiFoodScanScreen');
      
      if (!currentRoute || !currentRoute.params) {
        return;
      }
      
      const { imageUri, barcodeData, timestamp } = currentRoute.params;
      
      if (imageUri && timestamp) {
        console.log(`Processing camera image with timestamp: ${timestamp}`);
        
        // Ensure image URI is valid
        if (typeof imageUri !== 'string' || !imageUri.trim()) {
          console.error('Invalid image URI');
          return;
        }
        
        // Add the image to the queue with a slight delay to allow navigation to complete
        setTimeout(async () => {
          await addToQueue(imageUri);
          
          // Clear the params to prevent processing the same image multiple times
          navigation.setParams({ 
            imageUri: null, 
            barcodeData: null,
            timestamp: null 
          });
        }, 300);
      }
    } catch (error) {
      console.error('Error processing camera image:', error);
      Alert.alert('Error', 'Failed to process camera image');
    }
  }, [navigation, addToQueue]);
  
  // Use the navigationState at the component level
  const navigationState = useNavigationState(state => state);
  
  // Use the predefined callback in useFocusEffect
  useFocusEffect(
    useCallback(() => {
      processImageFromCamera();
    }, [processImageFromCamera, navigationState])
  );
  
  // Update the problematic useEffect - remove the inner useRef
  useEffect(() => {
    if (processingItems.length === 0) return;
    
    // Update elapsed time every second
    const timer = setInterval(() => {
      let hasUpdates = false;
      
      // Update the elapsed time for each processing item
      processingItems.forEach(item => {
        if (item.startTime) {
          const newElapsedSeconds = Math.floor((Date.now() - item.startTime) / 1000);
          
          // Only update if the elapsed time has changed
          if (elapsedTimeRef.current[item.id] !== newElapsedSeconds) {
            elapsedTimeRef.current[item.id] = newElapsedSeconds;
            hasUpdates = true;
          }
        }
      });
      
      // Only trigger a re-render if there are actual updates
      if (hasUpdates) {
        // Create a shallow copy to trigger re-render without modifying existing items
        setProcessingItems(prevItems => [...prevItems]);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [processingItems.length]);
  
  // Add an effect to handle queue processing when state changes
  useEffect(() => {
    // Only trigger if component is mounted and we have items in the queue and capacity to process
    if (!isMountedRef.current) return;
    
    if (foodQueue.length > 0 && processingItems.length < 2) {
      console.log(`Queue state changed - ${foodQueue.length} items in queue, ${processingItems.length} processing`);
      
      // Small delay to ensure all state updates have been applied
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          processQueue();
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [foodQueue.length, processingItems.length, processQueue]);
  
  // UI rendering functions
  const renderQueueItem = (item) => {
    if (!item || !item.id) {
      console.error('Attempted to render queue item without id');
      return null;
    }
    
    // Check if imageUri is already a data URI or needs prefix
    const imageSource = !item.imageUri ? null :
      item.imageUri.startsWith('data:') 
        ? { uri: item.imageUri } 
        : { uri: `data:image/jpeg;base64,${item.imageUri}` };
        
    if (!imageSource) {
      console.error('Invalid image source for queue item');
      return null;
    }
      
    return (
      <View key={`queue-${item.id}`} style={styles.queueItem}>
        <Image source={imageSource} style={styles.queueItemImage} />
        <View style={styles.queueItemInfo}>
          <Text style={styles.queueItemText}>In queue</Text>
          <ActivityIndicator size="small" color="#888" />
        </View>
      </View>
    );
  };
  
  // Update the processing item renderer to show progress
  const renderProcessingItem = (item) => {
    if (!item || !item.id) {
      console.error('Attempted to render processing item without id');
      return null;
    }
    
    // Check if imageUri is already a data URI or needs prefix
    const imageSource = !item.imageUri ? null :
      item.imageUri.startsWith('data:') 
        ? { uri: item.imageUri } 
        : { uri: `data:image/jpeg;base64,${item.imageUri}` };
        
    if (!imageSource) {
      console.error('Invalid image source for processing item');
      return null;
    }
      
    // Get progress for this item or default to 0
    const progress = processingProgress[item.id] || 0;
    const progressWidth = `${progress}%`;
    
    // Calculate elapsed time since processing started
    const elapsedSeconds = item.startTime 
      ? Math.floor((Date.now() - item.startTime) / 1000) 
      : 0;
    
    return (
      <View key={`processing-${item.id}`} style={styles.processingItem}>
        <Image source={imageSource} style={styles.processingItemImage} />
        <View style={styles.processingItemOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingItemText}>
            Processing{elapsedSeconds > 2 ? ` (${elapsedSeconds}s)` : '...'}
          </Text>
          
          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: progressWidth }]} />
          </View>
        </View>
      </View>
    );
  };
  
  // Update the completed item renderer to show processing time
  const renderCompletedItem = (item) => {
    if (!item || !item.id) {
      console.error('Attempted to render completed item without id');
      return null;
    }
    
    // Check if imageUri is already a data URI or needs prefix
    const imageSource = !item.imageUri ? null :
      item.imageUri.startsWith('data:') 
        ? { uri: item.imageUri } 
        : { uri: `data:image/jpeg;base64,${item.imageUri}` };
        
    if (!imageSource) {
      console.error('Invalid image source for completed item');
      return null;
    }
      
    return (
      <TouchableOpacity 
        key={`completed-${item.id}`} 
        style={styles.completedItem}
        onPress={() => navigation.navigate('FoodDetailsScreen', { foodData: item.result })}
      >
        <Image source={imageSource} style={styles.completedItemImage} />
        <View style={styles.completedItemInfo}>
          <Text style={styles.completedItemName}>{item.result?.name || 'Food item'}</Text>
          <View style={styles.completedItemDetails}>
            <View style={styles.timeContainer}>
              <Icon name="time-outline" size={14} color={colorScheme === 'dark' ? '#999999' : '#666666'} style={styles.timeIcon} />
              <Text style={styles.completedItemTime}>
                {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            
            {item.processingTime && (
              <View style={styles.processingTimeContainer}>
                <Text style={styles.processingTimeText}>
                  {item.processingTime}s
                </Text>
              </View>
            )}
          </View>
          
          {/* Add nutrition summary */}
          {item.result?.calories && (
            <View style={styles.nutritionPreview}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>Calories</Text>
                <Text style={styles.nutritionValue}>
                  {item.result.calories.amount}<Text style={styles.nutritionUnit}> kcal</Text>
                </Text>
              </View>
              {item.result?.proteins && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                  <Text style={styles.nutritionValue}>
                    {item.result.proteins.amount}<Text style={styles.nutritionUnit}>g</Text>
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        <View style={styles.chevronContainer}>
          <Icon name="chevron-forward" size={20} color="#888" />
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render failed item with improved styling
  const renderFailedItem = (item) => {
    if (!item || !item.id) {
      console.error('Attempted to render failed item without id');
      return null;
    }
    
    // Check if imageUri is already a data URI or needs prefix
    const imageSource = !item.imageUri ? null :
      item.imageUri.startsWith('data:') 
        ? { uri: item.imageUri } 
        : { uri: `data:image/jpeg;base64,${item.imageUri}` };
        
    if (!imageSource) {
      console.error('Invalid image source for failed item');
      return null;
    }
      
    return (
      <TouchableOpacity 
        key={`failed-${item.id}`} 
        style={[styles.completedItem, styles.failedItem]}
        onPress={() => retryFailedItem(item.id)}
      >
        <Image source={imageSource} style={styles.completedItemImage} />
        <View style={styles.completedItemInfo}>
          <Text style={styles.failedItemName}>Processing failed</Text>
          <Text style={styles.failedItemMessage}>
            {item.error?.message || 'Unknown error occurred'}
          </Text>
          <View style={styles.retryContainer}>
            <Icon name="refresh-outline" size={14} color={colorScheme === 'dark' ? '#FF6B6B' : '#CC4B4B'} />
            <Text style={styles.retryText}>Tap to retry</Text>
          </View>
        </View>
        <Icon name="refresh" size={20} color={colorScheme === 'dark' ? '#FF6B6B' : '#CC4B4B'} />
      </TouchableOpacity>
    );
  };
  
  // Render the notification component
  const renderNotification = () => {
    if (!notification) return null;
    
    const backgroundColor = notification.type === 'success' 
      ? (colorScheme === 'dark' ? '#1C7D33' : '#E2F7E8')
      : (colorScheme === 'dark' ? '#7D331C' : '#F7E2E2');
      
    const textColor = notification.type === 'success'
      ? (colorScheme === 'dark' ? '#FFFFFF' : '#1C7D33')
      : (colorScheme === 'dark' ? '#FFFFFF' : '#7D331C');
      
    const icon = notification.type === 'success' ? 'checkmark-circle' : 'alert-circle';
    
    return (
      <Animated.View 
        style={[
          styles.notification,
          { 
            backgroundColor,
            opacity: notificationOpacity,
            transform: [
              {
                translateY: notificationOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          }
        ]}
      >
        <Icon name={icon} size={24} color={textColor} />
        <Text style={[styles.notificationText, { color: textColor }]}>
          {notification.message}
        </Text>
        {notification.type === 'error' && (
          <TouchableOpacity 
            onPress={() => {
              if (notification.item?.id) {
                retryFailedItem(notification.item.id);
              }
            }}
            style={styles.retryButton}
          >
            <Text style={[styles.retryText, { color: textColor }]}>Retry</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  // Toggle scan options
  const toggleScanOptions = () => {
    const newValue = !showScanOptions;
    setShowScanOptions(newValue);
    
    // Opacity and transform can use native driver
    Animated.timing(scanOptionsAnim, {
      toValue: newValue ? 1 : 0,
      duration: 200,
      useNativeDriver: true
    }).start();
    
    // Height needs a separate animation without native driver
    Animated.timing(heightAnimRef, {
      toValue: newValue ? 1 : 0,
      duration: 250,
      useNativeDriver: false
    }).start();
    
    // Provide haptic feedback when opening options
    if (newValue) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Change scan mode
  const changeMode = async (mode) => {
    // Save the selected mode
    await AsyncStorage.setItem('selectedMode', mode);
    setSelectedMode(mode);
    
    // Close the options menu
    toggleScanOptions();
    
    // Provide feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Show quick notification of mode change
    setNotification({
      message: `Mode changed to ${mode === 'fast' ? 'Fast' : 'Accurate'}`,
      type: 'success',
      timestamp: Date.now()
    });
    
    Animated.sequence([
      Animated.timing(notificationOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(notificationOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setNotification(null);
    });
  };

  // Add scan count info display
  const renderScanCountInfo = () => {
    // Don't show for unlimited users
    if (isSubscribed || isFirstDayUnlimited) return null;
    
    // Determine the limit and remaining scans
    const limit = isSubscribedPlus ? 20 : 5;
    const remaining = Math.max(0, limit - scanCount);
    const isLow = remaining <= Math.floor(limit * 0.2); // 20% or less remaining is "low"
    
    return (
      <View style={[
        styles.scanCountContainer,
        isLow && styles.scanCountLow
      ]}>
        <Icon 
          name={isLow ? "alert-circle-outline" : "scan-outline"} 
          size={14} 
          color={isLow ? (colorScheme === 'dark' ? '#FF6B6B' : '#CC4B4B') : (colorScheme === 'dark' ? '#BBBBBB' : '#666666')} 
        />
        <Text style={[
          styles.scanCountText,
          isLow && styles.scanCountTextLow
        ]}>
          {remaining} {remaining === 1 ? 'scan' : 'scans'} remaining today
        </Text>
      </View>
    );
  };

  // Add error boundary wrapper for the renderProcessingItem
  const safeRenderProcessingItem = (item) => {
    try {
      return renderProcessingItem(item);
    } catch (error) {
      console.error(`Error rendering processing item ${item?.id}:`, error);
      
      // If there's a rendering error, try to clean up the item
      if (item?.id) {
        setTimeout(() => {
          handleProcessingFailed(item.id, new Error('Rendering error occurred'));
        }, 100);
      }
      
      // Return a simple fallback
      return (
        <View key={`error-processing-${item?.id || 'unknown'}`} style={styles.processingItem}>
          <View style={styles.processingItemOverlay}>
            <Text style={styles.processingItemText}>Error displaying item</Text>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Multi-Food Scanner</Text>
          <Text style={styles.subtitle}>Analyze multiple food items at once</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.standardScanButton}
          onPress={() => navigation.navigate('HomeTabs', { screen: 'Home' })}
        >
          <Icon name="scan-outline" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
          <Text style={styles.standardScanText}>Standard</Text>
        </TouchableOpacity>
      </View>
      
      {/* Scan count and mode info */}
      <View style={styles.optionsRow}>
        {renderScanCountInfo()}
        
        <TouchableOpacity 
          style={styles.modeSelector} 
          onPress={toggleScanOptions}
        >
          <Icon 
            name={selectedMode === 'fast' ? 'flash-outline' : 'shield-checkmark-outline'} 
            size={16} 
            color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} 
          />
          <Text style={styles.modeSelectorText}>
            {selectedMode === 'fast' ? 'Fast' : 'Accurate'} Mode
          </Text>
          <Icon 
            name={showScanOptions ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Scan options dropdown */}
      <Animated.View style={[
        styles.scanOptions,
        {
          opacity: scanOptionsAnim,
          transform: [{
            translateY: scanOptionsAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0]
            })
          }],
          maxHeight: heightAnimRef.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 200]
          }),
          overflow: 'hidden'
        },
        {display: showScanOptions ? 'flex' : 'none'}
      ]}>
        <TouchableOpacity 
          style={[
            styles.scanOptionItem,
            selectedMode === 'fast' && styles.selectedOption
          ]}
          onPress={() => changeMode('fast')}
        >
          <Icon name="flash-outline" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
          <View style={styles.scanOptionTextContainer}>
            <Text style={styles.scanOptionName}>Fast Mode</Text>
            <Text style={styles.scanOptionDescription}>Quick results, great for packaged foods</Text>
          </View>
          {selectedMode === 'fast' && (
            <Icon name="checkmark-circle" size={20} color={colorScheme === 'dark' ? '#4CAF50' : '#2E7D32'} />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.scanOptionItem,
            selectedMode === 'accurate' && styles.selectedOption
          ]}
          onPress={() => changeMode('accurate')}
        >
          <Icon name="shield-checkmark-outline" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
          <View style={styles.scanOptionTextContainer}>
            <Text style={styles.scanOptionName}>Accurate Mode</Text>
            <Text style={styles.scanOptionDescription}>Detailed analysis, best for complex meals</Text>
          </View>
          {selectedMode === 'accurate' && (
            <Icon name="checkmark-circle" size={20} color={colorScheme === 'dark' ? '#4CAF50' : '#2E7D32'} />
          )}
        </TouchableOpacity>
      </Animated.View>
      
      {/* Add notification component */}
      {renderNotification()}
      
      {/* Add scan status indicators */}
      {(processingItems.length > 0 || foodQueue.length > 0) && (
        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <Text style={styles.statusCount}>{processingItems.length}</Text>
            <Text style={styles.statusLabel}>Processing</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Text style={styles.statusCount}>{foodQueue.length}</Text>
            <Text style={styles.statusLabel}>In Queue</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Text style={styles.statusCount}>{completedItems.length + failedItems.length}</Text>
            <Text style={styles.statusLabel}>Completed</Text>
          </View>
        </View>
      )}
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Processing items */}
        {processingItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Processing</Text>
            <View style={styles.itemsContainer}>
              {processingItems.map(safeRenderProcessingItem)}
            </View>
          </View>
        )}
        
        {/* Queued items */}
        {foodQueue.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>In Queue</Text>
            <View style={styles.itemsContainer}>
              {foodQueue.map(renderQueueItem)}
            </View>
          </View>
        )}
        
        {/* Failed items */}
        {failedItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Failed</Text>
            <View style={styles.itemsContainer}>
              {failedItems.map(renderFailedItem)}
            </View>
          </View>
        )}
        
        {/* Completed items */}
        {completedItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Results</Text>
            <View style={styles.itemsContainer}>
              {completedItems.map(renderCompletedItem)}
            </View>
          </View>
        )}
        
        {/* Empty state */}
        {foodQueue.length === 0 && processingItems.length === 0 && completedItems.length === 0 && failedItems.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="fast-food-outline" size={64} color="#888" />
            <Text style={styles.emptyStateText}>No food items to display</Text>
            <Text style={styles.emptyStateSubtext}>Take a photo or select from gallery to get started</Text>
          </View>
        )}
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={pickImage}
          disabled={isAddingToQueue}
        >
          <LinearGradient
            colors={['#101010', '#1b1b1d']}
            style={styles.buttonGradient}
            start={[0, 0]}
            end={[1, 1]}
          >
            <View style={styles.buttonContent}>
              <Icon name="images" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Select Photos</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={takePhoto}
        >
          <LinearGradient
            colors={['#101010', '#555']}
            style={styles.buttonGradient}
            start={[1, 1.3]}
            end={[1, 0]}
          >
            <View style={styles.buttonContent}>
              <Icon name="camera" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Take Photo</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 30, // Adjust for platform
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20 * scale,
    marginBottom: 8 * scale,
  },
  titleContainer: {
    flex: 1,
  },
  standardScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5',
    paddingHorizontal: 12 * scale,
    paddingVertical: 6 * scale,
    borderRadius: 16 * scale,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
  },
  standardScanText: {
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    fontSize: 14 * scale,
    fontWeight: '500',
    marginLeft: 6 * scale,
  },
  title: {
    fontSize: 24 * scale,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 16 * scale,
    color: colorScheme === 'dark' ? '#888888' : '#555555',
    textAlign: 'left',
    marginTop: 4 * scale,
  },
  
  // Add status indicators styles
  statusContainer: {
    flexDirection: 'row',
    marginHorizontal: 20 * scale,
    marginBottom: 16 * scale,
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5',
    borderRadius: 12 * scale,
    padding: 12 * scale,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5E5',
    justifyContent: 'space-between',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusCount: {
    fontSize: 20 * scale,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
  },
  statusLabel: {
    fontSize: 12 * scale,
    color: colorScheme === 'dark' ? '#888888' : '#666666',
    marginTop: 4 * scale,
  },
  statusDivider: {
    width: 1,
    height: '70%',
    backgroundColor: colorScheme === 'dark' ? '#333333' : '#E0E0E0',
  },
  
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16 * scale,
    paddingBottom: 100 * scale,
  },
  section: {
    marginBottom: 24 * scale,
  },
  sectionTitle: {
    fontSize: 18 * scale,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    marginBottom: 12 * scale,
  },
  itemsContainer: {
    gap: 12 * scale,
  },
  queueItem: {
    flexDirection: 'row',
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5',
    borderRadius: 12 * scale,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5E5',
  },
  queueItemImage: {
    width: 80 * scale,
    height: 80 * scale,
  },
  queueItemInfo: {
    flex: 1,
    padding: 12 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueItemText: {
    fontSize: 16 * scale,
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    marginBottom: 8 * scale,
  },
  processingItem: {
    position: 'relative',
    borderRadius: 12 * scale,
    overflow: 'hidden',
    height: 160 * scale,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5E5',
  },
  processingItemImage: {
    width: '100%',
    height: '100%',
  },
  processingItemOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingItemText: {
    color: '#FFFFFF',
    fontSize: 18 * scale,
    fontWeight: '600',
    marginTop: 12 * scale,
    marginBottom: 8 * scale,
  },
  
  // Add progress bar styles
  progressBarContainer: {
    width: '80%',
    height: 4 * scale,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2 * scale,
    overflow: 'hidden',
    marginTop: 8 * scale,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  
  completedItem: {
    flexDirection: 'row',
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5',
    borderRadius: 12 * scale,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5E5',
    alignItems: 'center',
  },
  failedItem: {
    borderColor: colorScheme === 'dark' ? '#501E1E' : '#FFEEEE',
    backgroundColor: colorScheme === 'dark' ? '#2C1C1E' : '#FFF5F5',
  },
  completedItemImage: {
    width: 80 * scale,
    height: 80 * scale,
  },
  completedItemInfo: {
    flex: 1,
    padding: 12 * scale,
  },
  completedItemName: {
    fontSize: 16 * scale,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    marginBottom: 4 * scale,
  },
  completedItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6 * scale,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIcon: {
    marginRight: 4 * scale,
  },
  completedItemTime: {
    fontSize: 14 * scale,
    color: colorScheme === 'dark' ? '#999999' : '#666666',
  },
  processingTimeContainer: {
    backgroundColor: colorScheme === 'dark' ? 'rgba(28, 125, 51, 0.2)' : 'rgba(28, 125, 51, 0.1)',
    paddingHorizontal: 8 * scale,
    paddingVertical: 2 * scale,
    borderRadius: 8 * scale,
  },
  processingTimeText: {
    fontSize: 12 * scale,
    color: colorScheme === 'dark' ? '#4CAF50' : '#2E7D32',
    fontWeight: '500',
  },
  nutritionPreview: {
    flexDirection: 'row',
    marginTop: 4 * scale,
    gap: 12 * scale,
  },
  nutritionItem: {
    flexDirection: 'column',
  },
  nutritionLabel: {
    fontSize: 12 * scale,
    color: colorScheme === 'dark' ? '#AAAAAA' : '#666666',
  },
  nutritionValue: {
    fontSize: 14 * scale,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
  },
  nutritionUnit: {
    fontSize: 12 * scale,
    fontWeight: '400',
  },
  chevronContainer: {
    paddingRight: 12 * scale,
  },
  failedItemName: {
    fontSize: 16 * scale,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FF6B6B' : '#CC4B4B',
    marginBottom: 4 * scale,
  },
  failedItemMessage: {
    fontSize: 14 * scale,
    color: colorScheme === 'dark' ? '#BBBBBB' : '#777777',
    marginBottom: 4 * scale,
  },
  retryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4 * scale,
  },
  retryText: {
    fontSize: 14 * scale,
    color: colorScheme === 'dark' ? '#FF6B6B' : '#CC4B4B',
    marginLeft: 6 * scale,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100 * scale,
  },
  emptyStateText: {
    fontSize: 18 * scale,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    marginTop: 16 * scale,
    marginBottom: 8 * scale,
  },
  emptyStateSubtext: {
    fontSize: 16 * scale,
    color: colorScheme === 'dark' ? '#888888' : '#555555',
    textAlign: 'center',
    paddingHorizontal: 32 * scale,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20 * scale,
    paddingVertical: 16 * scale,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 10,
  },
  button: {
    flex: 1,
    marginHorizontal: 8 * scale,
  },
  buttonGradient: {
    borderRadius: 20 * scale,
    borderWidth: 2 * scale,
    borderColor: colorScheme === 'dark' ? '#222' : '#bbb',
    padding: 12 * scale,
    paddingHorizontal: 20 * scale,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8 * scale,
  },
  buttonText: {
    color: colorScheme === 'dark' ? '#d8d8d8' : '#fff',
    fontSize: 16 * scale,
    fontWeight: '500',
  },
  
  // Add/update notification and retry button styles
  notification: {
    position: 'absolute',
    top: 120 * scale,
    left: 16 * scale,
    right: 16 * scale,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16 * scale,
    paddingVertical: 12 * scale,
    borderRadius: 12 * scale,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84 * scale,
    elevation: 5,
  },
  notificationText: {
    flex: 1,
    fontSize: 16 * scale,
    marginLeft: 12 * scale,
    fontWeight: '500',
  },
  retryButton: {
    paddingVertical: 6 * scale,
    paddingHorizontal: 12 * scale,
    borderRadius: 8 * scale,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginLeft: 8 * scale,
  },
  
  // Add styles for scan options
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20 * scale,
    marginBottom: 10 * scale,
  },
  scanCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 10 * scale,
    paddingVertical: 6 * scale,
    borderRadius: 12 * scale,
  },
  scanCountLow: {
    backgroundColor: colorScheme === 'dark' ? 'rgba(255, 107, 107, 0.1)' : 'rgba(204, 75, 75, 0.1)',
  },
  scanCountText: {
    fontSize: 12 * scale,
    color: colorScheme === 'dark' ? '#BBBBBB' : '#666666',
    marginLeft: 6 * scale,
  },
  scanCountTextLow: {
    color: colorScheme === 'dark' ? '#FF6B6B' : '#CC4B4B',
    fontWeight: '500',
  },
  modeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5',
    paddingHorizontal: 12 * scale,
    paddingVertical: 6 * scale,
    borderRadius: 12 * scale,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5E5',
  },
  modeSelectorText: {
    fontSize: 14 * scale,
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    marginHorizontal: 6 * scale,
  },
  scanOptions: {
    marginHorizontal: 20 * scale,
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5',
    borderRadius: 12 * scale,
    overflow: 'hidden',
    marginBottom: 10 * scale,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5E5',
  },
  scanOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12 * scale,
    borderBottomWidth: 1,
    borderBottomColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5E5',
  },
  selectedOption: {
    backgroundColor: colorScheme === 'dark' ? 'rgba(60, 179, 113, 0.1)' : 'rgba(60, 179, 113, 0.05)',
  },
  scanOptionTextContainer: {
    flex: 1,
    marginLeft: 10 * scale,
  },
  scanOptionName: {
    fontSize: 14 * scale,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
  },
  scanOptionDescription: {
    fontSize: 12 * scale,
    color: colorScheme === 'dark' ? '#999999' : '#666666',
    marginTop: 2 * scale,
  },
});

export default MultiFoodScanScreen; 