// AccountScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Appearance,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  initConnection,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  requestSubscription,
  getAvailablePurchases,
  getSubscriptions,
  getReceiptIOS
} from 'react-native-iap';
import { useIAP } from '../IAPContext';
import { useUser } from '../userContext';
import { LinearGradient } from 'expo-linear-gradient';
import StreakVisualization from './StreakVisualization'; // Import the new component

// Constants for AsyncStorage keys
const LAST_PLACEHOLDER_KEY = '@last_placeholder';
const LAST_PLACEHOLDER_TIME_KEY = '@last_placeholder_time';
const FILTER_SECTION_STATE_KEY = '@filter_section_state';
const PRODUCT_HISTORY_KEY = '@product_history'; // Key for scan history

const { width } = Dimensions.get('window');
const avatarSize = width * 0.3;

// Define all active subscription SKUs
const SUBSCRIPTION_IDS = [
  'macroscan_plusplus',
  'macroscan_plusplus_yearly',
  'macroscan_plus',
  'macroscan_unlimited',
];

export default function AccountScreen() {
  // State
  const [imageUri, setImageUri] = useState(null);
  const [name, setName] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [isSubscribedUnlimited, setIsSubscribedUnlimited] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [debugUnlocked, setDebugUnlocked] = useState(false);
  const [debugTapCount, setDebugTapCount] = useState(0);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [streakData, setStreakData] = useState([]); // State for streak visualization
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? darkColors : lightColors;

  // Hooks & Context
  const navigation = useNavigation();
  const { isIAPEnabled } = useIAP();
  const { user, setUser, updateUser } = useUser();

  // Refs to prevent multiple subscription checks and processing
  const hasCheckedSubscription = useRef(false);
  const processingPurchase = useRef(false);

  // Logging helpers
  const log = (message) => {
    if (showLogs) Alert.alert('Log', message);
    console.log(message);
  };
  const logError = (message, error) => {
    if (showLogs) Alert.alert('Error', `${message}: ${error}`);
    console.error(message, error);
  };

  // Initialize IAP connection and check subscription once
  useEffect(() => {
    if (!isIAPEnabled) return;
    const initIAP = async () => {
      try {
        log('Initializing IAP connection...');
        await initConnection({ autoFinishTransactions: false });
        log('IAP Connection initialized');
        // Fetch available subscriptions to verify connection
        const products = await getAvailableSubscriptions();
        // log(`Available subscriptions: ${JSON.stringify(products)}`);
        // Check subscription status once after initialization
        if (!hasCheckedSubscription.current) {
          await checkSubscription();
          hasCheckedSubscription.current = true;
        }
      } catch (error) {
        logError('Failed to initialize IAP', error);
      }
    };
    initIAP();
    // Proper cleanup
    return () => {
      log('Ending IAP connection...');
      // No need to call endConnection if using react-native-iap >= 6.0.0
    };
  }, [isIAPEnabled]);

  // Load saved profile info
  useEffect(() => {
    async function loadProfile() {
      try {
        const savedName = await AsyncStorage.getItem('userName');
        const savedImageUri = await AsyncStorage.getItem('userImageUri');
        setName(savedName || '');
        setImageUri(savedImageUri || null);
      } catch (error) {
        Alert.alert('Error', 'Failed to load user data.');
        logError('Failed to load user data', error);
      }
    }
    loadProfile();
  }, []);

  // Function to calculate streak data
  const calculateStreak = async (currentStreakData) => {
    try {
      const historyJson = await AsyncStorage.getItem(PRODUCT_HISTORY_KEY);
      const history = historyJson ? JSON.parse(historyJson) : [];
      // console.log('History:', JSON.stringify(history));

      if (!Array.isArray(history)) {
        console.error("History data is not an array:", history);
        return null; // Return null if data is invalid
      }

      // Sort history by timestamp descending
      history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      console.log('Today (start of day):', today.toISOString());

      // Map to track unique days with scans
      const scannedDays = new Set();
      console.log('--- Processing History Timestamps ---');
      history.forEach(item => {
        if (item.date) {
          const scanDate = new Date(item.date);
          console.log('Raw Scan Date:', new Date(item.date).toISOString());
          scanDate.setHours(0, 0, 0, 0); // Normalize to start of day
          console.log('Normalized Scan Date (start of day):', scanDate.toISOString());
          scannedDays.add(scanDate.getTime());
        } else {
          console.log('History item missing date:', item.productName);
        }
      });
      console.log('Scanned Days (timestamps):', Array.from(scannedDays));
      console.log('--- Finished Processing History ---');

      // Check consecutive days backwards from today
      for (let i = 0; ; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const checkDateTime = checkDate.getTime();

        if (scannedDays.has(checkDateTime)) {
          currentStreak++;
        } else {
          // Streak broken
          console.log(`Streak check stopped at day ${i} (Date: ${checkDate.toISOString()})`);
          break;
        }
      }
      console.log('Calculated Current Streak:', currentStreak);

      // Prepare data for streak visualization
      const displayDays = 10;
      const newProgressDays = Array.from({ length: displayDays }, (_, i) => ({
        day: i + 1,
        completed: i < currentStreak,
      }));

      // Only update state if data has changed
      if (JSON.stringify(newProgressDays) !== JSON.stringify(currentStreakData)) {
        console.log('Streak data changed, updating state.');
        return newProgressDays;
      } else {
        console.log('Streak data has not changed.');
        return null; // Return null if no change
      }

    } catch (error) {
      console.error('Failed to calculate streak:', error);
      return null; // Return null on error
    }
  };

  // Use useFocusEffect to load history and calculate streak when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('AccountScreen focused, calculating streak...');
      calculateStreak(streakData).then(newStreakData => {
        if (newStreakData !== null) {
          setStreakData(newStreakData);
        }
      });
    }, [streakData]) // Include streakData to compare against current state
  );

  // Functions
  const getAvailableSubscriptions = async () => {
    try {
      const products = await getSubscriptions({ skus: SUBSCRIPTION_IDS });
      return products;
    } catch (error) {
      logError('Failed to fetch subscriptions', error);
      return [];
    }
  };

  const checkSubscription = async () => {
    try {
      let subscribedUnlimited = false;
      let activeSubscription = null;
  
      if (isIAPEnabled) {
        if (Platform.OS === 'ios') {
          // Ensure initConnection is called before using getReceiptIOS
          await initConnection();
  
          // Retrieve the receipt data
          const receipt = await getReceiptIOS({ forceRefresh: true });
  
          if (!receipt) {
            console.error('No receipt available');
            subscribedUnlimited = false;
            activeSubscription = null;
          } else {
            // Optional: Log receipt data length and sample for debugging
            console.log('Receipt data length:', receipt.length);
            console.log('Receipt data sample:', receipt.substring(0, 100));
  
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
            if (!response.ok) {
              const responseText = await response.text();
              console.error('Server Error:', response.status, responseText);
              Alert.alert(
                'Subscription Check Error',
                `Server returned an error: ${response.status}`
              );
              return;
            }
  
            // Try parsing the response as JSON
            let data;
            try {
              data = await response.json();
            } catch (parseError) {
              const responseText = await response.text();
              console.error('Failed to parse response as JSON:', responseText);
              Alert.alert(
                'Subscription Check Error',
                'Failed to parse server response.'
              );
              return;
            }
  
            if (data.success) {
              if (data.isSubscribed) {
                // Subscription is active
                subscribedUnlimited = true;
                activeSubscription = data.productId;
              } else {
                // Subscription is expired or not active
                subscribedUnlimited = false;
                activeSubscription = null;
              }
            } else {
              // Handle error in receipt validation
              console.log('Receipt validation failed:', data.message);
              Alert.alert(
                'Subscription Check Error',
                data.message || 'Failed to verify subscription status.'
              );
            }
          }
        } else {
          // Handle other platforms if necessary
          subscribedUnlimited = false;
          activeSubscription = null;
        }
      }
  
      setIsSubscribedUnlimited(subscribedUnlimited);
      setCurrentSubscription(activeSubscription);
      // Optionally update user.subscriptionStatus for tracking
      await updateUserSubscription(
        subscribedUnlimited ? activeSubscription : 'free'
      );
    } catch (error) {
      logError('Failed to check subscription status', error);
      Alert.alert(
        'Subscription Check Error',
        'Failed to verify subscription status. Please try again later.'
      );
    }
  };

  const handlePurchase = async (productId) => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Unsupported Platform', 'Purchases are only supported on iOS devices.');
      return;
    }
    try {
      log(`Attempting to purchase SKU: ${productId}`);
      setIsPurchasing(true); // Set purchasing state to true
      processingPurchase.current = true;
      await requestSubscription({ sku: productId });
      // Purchase will be handled in the purchaseUpdatedListener
    } catch (error) {
      setIsPurchasing(false); // Reset purchasing state on error
      processingPurchase.current = false;
      if (error.code === 'E_USER_CANCELLED') {
        console.log('Purchase cancelled by user.');
      } else if (error.code === 'E_ALREADY_OWNED') {
        Alert.alert('Already Purchased', 'You already have this subscription.');
      } else {
        logError(`Purchase failed for: ${productId}`, error);
        Alert.alert('Purchase Error', error.message || 'An unknown error occurred during the purchase.');
      }
    }
  };

  const updateUserSubscription = async (subscription) => {
    if (!user) {
      logError('No user found when updating subscription', null);
      return;
    }
    const updates = { subscriptionStatus: subscription };
    log(`Updating user subscription with: ${JSON.stringify(updates)}`);
    await updateUser(updates);
  };

  const unlockFeatures = (productId) => {
    if (SUBSCRIPTION_IDS.includes(productId)) {
      log(`Features for ${productId} Unlocked!`);
      // Implement feature unlocking logic here
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.cancelled && result.assets && result.assets.length > 0) {
        const newImageUri = result.assets[0].uri;
        setImageUri(newImageUri);
        await saveData(newImageUri);
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while picking the image.');
      logError('Error picking image', error);
    }
  };

  const saveData = async (uri) => {
    try {
      await AsyncStorage.setItem('userName', name);
      if (uri) {
        await AsyncStorage.setItem('userImageUri', uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save data.');
      logError('Failed to save data', error);
    }
  };

  const deleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          onPress: () => log('Account deletion cancelled'),
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              // Add loading state
              setShowAndroidPicker(true); // Temporary reuse of loading state
              
              const keysToRemove = [
                // User related
                '@user',
                '@user_goals',
                // '@user_data', //stores all goal related inputs that are saved in onboarding
                '@user_logged_in',
                '@apikey',
                'userName',
                'userImageUri',

                // Product and history related
                '@product_history',
                '@average_processing_times',
                LAST_PLACEHOLDER_KEY,
                LAST_PLACEHOLDER_TIME_KEY,
                FILTER_SECTION_STATE_KEY,

                // App state and settings
                'selectedModel',
                'selectedMode',
                '@selected_provider',
                'foodSelectionEnabled',
                '@openai_api_key',
                '@gemini_api_key',
                '@anthropic_api_key',
                '@selected_macro',

                // Usage tracking
                'dailyScanCount',
                'firstUseDate',
                'dateLastUsed',
                'freeAccurateScansUsed',
                'selectedProcessing',
                'selectedProvider',
                'previousModel',
                'hasScannedEver',

                // Onboarding and tutorials
                'hasViewedTutorial',
                'hasViewedFeaturesTutorial',
                '@has_seen_whats_new_1_6_0',
                '@visited_steps',
                '@has_seen_mode_tooltip',
                '@has_seen_scan_button_tooltip',

                // paywall
                '@paywall_last_shown',
                '@has_ever_scanned',
              ];
              
              // Clear storage first
              await AsyncStorage.multiRemove(keysToRemove);
              
              // Then clear user context
              setUser(null);
              
              // Add slight delay to ensure state updates propagate
              setTimeout(() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Goodbye' }],
                });
              }, 100);
              
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account.');
              logError('Failed to delete account', error);
            } finally {
              setShowAndroidPicker(false);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  };

  // Listen for purchase updates and errors
  useEffect(() => {
    if (!isIAPEnabled) return undefined;
    const purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase) => {
      try {
        // Prevent processing multiple purchases simultaneously
        if (processingPurchase.current) {
          log('Already processing a purchase.');
        }
        processingPurchase.current = true;
        // Log the purchase object
        console.log('Purchase object:', purchase);
        if (!purchase || typeof purchase !== 'object') {
          throw new Error('Invalid purchase object received.');
        }
        // Ensure that transactionId and transactionReceipt exist
        if (!purchase.transactionId || !purchase.transactionReceipt) {
          throw new Error('Missing transactionId or transactionReceipt in purchase object');
        }
        // Finish the transaction
        await finishTransaction({ purchase, isConsumable: false });
        log(`Transaction finished successfully.`);
        if (SUBSCRIPTION_IDS.includes(purchase.productId)) {
          setIsSubscribedUnlimited(true);
          setCurrentSubscription(purchase.productId);
          await updateUserSubscription(purchase.productId);
          unlockFeatures(purchase.productId);
          // checkSubscription();
          // // Add a slight delay before checking subscription
          // setTimeout(async () => {
          //   await checkSubscription();
          // }, 2000); // 2-second delay
        }
      } catch (err) {
        logError('Finish transaction error', err);
        Alert.alert('Purchase Error', err.message || 'An unknown error occurred during the purchase.');
      } finally {
        processingPurchase.current = false;
        setIsPurchasing(false);
      }
    });
    const purchaseErrorSubscription = purchaseErrorListener((error) => {
      if (error.code === 'E_USER_CANCELLED') {
        console.log('Purchase cancelled by user.');
      } else {
        logError(`Purchase error: ${error.code}`, error.message);
        Alert.alert('Purchase Error', error.message || 'An unknown error occurred during the purchase.');
      }
      setIsPurchasing(false); // Reset purchasing state on error
      processingPurchase.current = false;
    });
    return () => {
      if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription.remove();
        log('Purchase update listener removed');
      }
      if (purchaseErrorSubscription) {
        purchaseErrorSubscription.remove();
        log('Purchase error listener removed');
      }
    };
  }, [isIAPEnabled]);

  // Create dynamic styles based on the current color scheme
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    progressSection: {
      marginBottom: 20,
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5',
      borderRadius: 15,
      padding: 15,
      marginHorizontal: 10,
    },
    input: {
      backgroundColor: c.inputBg,
      borderRadius: 21,
      borderWidth: 3,
      borderColor: c.inputBorder,
      padding: 16,
      color: c.text,
      fontSize: 16,
      marginBottom: 8,
    },
    greeting: {
      fontSize: 28,
      fontWeight: '600',
      color: c.text,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: c.subText,
      marginBottom: 5,
      marginLeft: 15,
    },
    inputHelper: {
      alignSelf: 'center',
      fontSize: 14,
      color: c.subText,
      width: '80%',
      textAlign: 'center',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            <Image
              source={imageUri ? { uri: imageUri } : require('../assets/profile.png')}
              style={styles.avatar}
            />
            <View style={styles.editButton}>
              <MaterialCommunityIcons name="pencil" size={22} color={c.pencilcolor} />
            </View>
          </TouchableOpacity>
          <Text style={dynamicStyles.greeting}>
            Hi, {name && name.trim().split(' ')[0] ? name.split(' ')[0] : 'there'}! 👋
          </Text>
        </View>
        {/* Name Input Section */}
        <View style={styles.inputSection}>
          <Text style={dynamicStyles.inputLabel}>Your name</Text>
          <TextInput
            style={dynamicStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            placeholderTextColor="#666666"
            onBlur={() => {
              const parts = name.trim().split(/\s+/);
              if (parts.length < 2) {
                Alert.alert('Both Names Please!', 'Please enter your full name (first and last).');
                setName('');
              } else {
                saveData();
              }
            }}
          />
          <Text style={dynamicStyles.inputHelper}>
            Your name helps personalize your experience throughout the app.
          </Text>
        </View>
        {/* Subscription Section - Commenting out */}
        {/*
        <View style={styles.subscriptionSection}>
          <LinearGradient
            colors={c.specialOfferGradient}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 1 }}
            style={styles.offerPill}
          >
            <Text style={styles.offerPillText}>SPECIAL OFFER</Text>
          </LinearGradient>
          <View style={styles.subscriptionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../assets/macroscan-unlimited.png')}
                  style={styles.logoImage}
                />
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.cardTitle}>MacroScan Unlimited</Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingStars}>★★★★★</Text>
                  <Text style={styles.ratingText}>4.9/5</Text>
                </View>
              </View>
            </View>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <LinearGradient
                  colors={c.featureIconGradient.flash}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.featureIcon}
                >
                  <MaterialCommunityIcons name="flash" size={25} color="#71A4F3" />
                </LinearGradient>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>Unlimited fast scans</Text>
                  <Text style={styles.featureDescription}>
                    Scan as many meals as you want, instantly
                  </Text>
                </View>
              </View>
              <View style={styles.featureItem}>
                <LinearGradient
                  colors={c.featureIconGradient.star}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.featureIcon}
                >
                  <MaterialCommunityIcons name="star" size={25} color="#B988F6" />
                </LinearGradient>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>Early Access to AI Features</Text>
                  <Text style={styles.featureDescription}>
                    Be the first to try complex AI scans and other features
                  </Text>
                </View>
              </View>
              <View style={styles.featureItem}>
                <LinearGradient
                  colors={c.featureIconGradient.clock}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.featureIcon}
                >
                  <MaterialCommunityIcons name="clock" size={25} color="#78DB89" />
                </LinearGradient>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>Premium Support</Text>
                  <Text style={styles.featureDescription}>
                    24/7 priority customer service
                  </Text>
                </View>
              </View>
            </View>
            <LinearGradient
              colors={c.pricingGradient}
              start={{ x: 1, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pricingCard}
            >
              <View style={styles.priceContainer}>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>$2.99</Text>
                  <Text style={styles.period}>/month</Text>
                  <LinearGradient
                    colors={c.saveTagGradient}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.saveTag}
                  >
                    <Text style={styles.saveTagText}>SAVE 50%</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.trialText}>
                  1 week free trial • cancel anytime • no commitment
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.ctaButton,
                  (isSubscribedUnlimited || isPurchasing) && styles.ctaButtonDisabled,
                ]}
                onPress={() => {
                  if (isSubscribedUnlimited) {
                    Alert.alert('Already Subscribed', 'You already have the MacroScan Unlimited plan.');
                  } else {
                    handlePurchase('macroscan_unlimited');
                  }
                }}
                disabled={isSubscribedUnlimited || isPurchasing}
              >
                {isPurchasing ? (
                  <ActivityIndicator color={c.ctabtntext} size="small" />
                ) : (
                  <View style={styles.ctaButtonContent}>
                    <Text style={styles.ctaButtonText}>
                      {isSubscribedUnlimited ? 'Subscribed' : 'Start Free Trial'}
                    </Text>
                    {!isSubscribedUnlimited && (
                      <FontAwesome6 name="arrow-right" size={20} color={c.ctabtntext} style={styles.ctaButtonIcon} />
                    )}
                  </View>
                )}
              </TouchableOpacity>
              {isSubscribedUnlimited && currentSubscription && (
                <Text style={styles.ctaSubtitle}>
                  You are currently subscribed to {currentSubscription === 'macroscan_unlimited' ? 'a Monthly' : 'a Yearly'} plan.
                </Text>
              )}
            </LinearGradient>
            <Text style={styles.ctaSubtitle}>
              Payments are securely processed by Apple. We cannot see your payment information.
            </Text>
          </View>
        </View>
        */}
        {/* Progress Visualization Section */}
        <View style={dynamicStyles.progressSection}>
           <Text style={[styles.sectionTitle, { color: c.text, marginBottom: 5}]}>Your Streak</Text>
           <StreakVisualization
             isDark={colorScheme === 'dark'}
             progressDays={streakData}
           />
         </View>
        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}></Text>
          <View style={styles.separator} />
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={deleteAccount}
            disabled={showAndroidPicker}
          >
            {showAndroidPicker ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.dangerSubtitle}>
            This action cannot be undone, there is a second confirmation pop up.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* COLOR PALETTES */
const darkColors = {
  background: '#000000',
  text: '#FFFFFF',
  subText: '#b0b0b0',
  cardBg: '#000000', // Maintained black background in dark mode
  inputBg: '#000000',
  inputBorder: '#3B3B3B',
  placeholder: '#7A7A80',
  highlight: '#FFFFFF',
  editIcon: '#000000', // Pencil background is white, so icon is black
  danger: '#ff6666',
  separator: '#444444',
  deleteBtn: '#FF4136',
  ctabtn: '#FFFFFF',
  ctabtntext: '#000000',
  pencilbg: '#2a2a2b',
  pencilcolor: '#cccccc',
  specialOfferbg: '#2a2a2b',
  specialOfferText: '#cccccc',
  pricingBorderColor: '#4D4D4D',
  pricingBorderWidth: 1,
  saveTagbg: '#2E3B80',
  saveTagText: '#9EC5F8',
  logoShadow: '#ffffff',
  // Gradient Colors
  specialOfferGradient: ['#2a2a2b', '#1f1f20'],
  saveTagGradient: ['#2E3B80', '#1F2359'],
  pricingGradient: ['#000000', '#222225'],
  featureIconGradient: {
    flash: ['#2B3E79', '#151F3B'],
    star: ['#3C3478', '#231C44'],
    clock: ['#2D485B', '#192F3A'],
  },
};

const lightColors = {
  background: '#FFFFFF',
  text: '#0A0A0A',
  subText: '#666666',
  cardBg: '#FFFFFF',
  inputBg: '#FFFFFF',
  inputBorder: '#CDCDD0',
  placeholder: '#999999',
  highlight: '#000000',
  editIcon: '#FFFFFF',
  danger: '#c00',
  separator: '#ccc',
  deleteBtn: '#FF4136',
  ctabtn: '#000000',
  ctabtntext: '#FFFFFF',
  pencilbg: '#2a2a2b',
  pencilcolor: '#FFFFFF',
  specialOfferbg: '#000000',
  specialOfferText: '#FFFFFF',
  pricingBorderColor: '#aaa',
  pricingBorderWidth: 1,
  saveTagbg: '#3b65a3',
  saveTagText: '#cae0fc',
  logoShadow: '#000000',
  // Gradient Colors
  specialOfferGradient: ['#555', '#2a2a2b'],
  saveTagGradient: ['#2E3B80', '#6a8ab8'],
  pricingGradient: ['#fff', '#ccc'],
  featureIconGradient: {
    flash: ['#3E4F8C', '#1A284D'],
    star: ['#4D3E8A', '#2A2457'],
    clock: ['#3E5A70', '#1F3A4C'],
  },
};

/* STYLES */
const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  profileSection: {
    marginTop: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    backgroundColor: '#333333',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2a2a2b',
    borderRadius: 13,
    padding: 6,
  },
  inputSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    alignSelf: 'flex-start',
    paddingLeft: 5,
  },
  dangerZone: {
    marginTop: 30,
  },
  dangerTitle: {
    alignSelf: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 16,
  },
  separator: {
    height: 2,
    borderRadius: 90,
    backgroundColor: '#ccc',
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: '#FF4136',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  dangerSubtitle: {
    width: '80%',
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    alignSelf: 'center',
  },
  ctaSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});