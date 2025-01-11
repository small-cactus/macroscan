// AccountScreen.js
import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
  const colorScheme = Appearance.getColorScheme();
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
              console.error('Receipt validation failed:', data.message);
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
              const keysToRemove = [
                '@user',
                '@user_goals',
                'userImageUri',
                'userName',
                '@user_logged_in',
                '@product_history',
                'selectedModel',
                'dailyScanCount',
                'firstUseDate',
                'dateLastUsed',
                'hasViewedTutorial',
                'hasViewedFeaturesTutorial',
                'freeAccurateScansUsed',
              ];
              // Use multiRemove to delete all keys at once
              await AsyncStorage.multiRemove(keysToRemove);
              log(`Deleted keys: ${keysToRemove.join(', ')}`);
              // Clear user state
              setUser(null);
              Alert.alert('Account Deleted', 'Your account has been deleted.');
              // Reset navigation stack to prevent going back
              navigation.reset({
                index: 0,
                routes: [{ name: 'Goodbye' }],
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account.');
              logError('Failed to delete account', error);
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

  // Determine color set for dark vs. light mode
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
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
          <Text style={styles.greeting}>
            Hi, {name && name.trim().split(' ')[0] ? name.split(' ')[0] : 'there'}! 👋
          </Text>
        </View>
        {/* Name Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Your name</Text>
          <TextInput
            style={styles.input}
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
          <Text style={styles.inputHelper}>
            Your name helps personalize your experience throughout the app.
          </Text>
        </View>
        {/* Subscription Section */}
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
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.logoContainer}>
                {/* Replace with your actual logo */}
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
            {/* Features */}
            <View style={styles.featuresList}>
              {/* Repeat for each feature */}
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
            {/* Pricing Card */}
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
                  4 week free trial • cancel anytime • no commitment
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
        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}></Text>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.deleteButton} onPress={deleteAccount}>
            <Text style={styles.deleteButtonText}>Delete Account</Text>
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
const getStyles = (c) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background, // Dynamic background color
    },
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
      backgroundColor: c.pencilbg,
      borderRadius: 13,
      padding: 6,
    },
    greeting: {
      fontSize: 28,
      fontWeight: '600',
      color: c.text, // Dynamic text color
    },
    inputSection: {
      marginBottom: 30,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: c.subText, // Dynamic subtext color
      marginBottom: 5,
      marginLeft: 15,
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
    inputHelper: {
      alignSelf: 'center',
      fontSize: 14,
      color: c.subText,
      width: '80%',
      textAlign: 'center',
    },
    subscriptionSection: {
      marginBottom: 30,
    },
    offerPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    offerPillText: {
      color: c.specialOfferText,
      fontSize: 12,
      fontWeight: '800',
    },
    subscriptionCard: {
      backgroundColor: c.cardBg, // Maintained black or white based on theme
      borderRadius: 16,
      padding: 20,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    logoContainer: {
      marginLeft: '-1.5%',
      width: 60,
      height: 60,
      borderColor: '#777',
      borderWidth: 1,
      backgroundColor: '#fff',
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.logoShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 15.84,
      elevation: 10,
    },
    logoImage: {
      width: 55,
      height: 55,
      resizeMode: 'contain',
    },
    titleContainer: {
      marginLeft: 12,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: c.text,
      marginBottom: 4,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ratingStars: {
      color: '#F0CF60',
      marginRight: 4,
    },
    ratingText: {
      color: c.subText,
      fontSize: 14,
    },
    featuresList: {
      marginBottom: 12,
    },
    featureItem: {
      flexDirection: 'row',
      marginBottom: 20,
    },
    featureIcon: {
      width: 50,
      height: 50,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    featureText: {
      flex: 1,
    },
    featureTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: c.text,
      marginBottom: 4,
    },
    featureDescription: {
      fontSize: 14,
      color: c.subText,
    },
    pricingCard: {
      marginHorizontal: -20,
      borderRadius: 33,
      padding: 16,
      borderWidth: c.pricingBorderWidth,
      borderColor: c.pricingBorderColor,
    },
    priceContainer: {
      marginBottom: 16,
    },
    priceRow: {
      marginLeft: '3%',
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    price: {
      fontSize: 24,
      fontWeight: '700',
      color: c.text,
    },
    period: {
      fontSize: 16,
      color: c.subText,
      marginLeft: 4,
    },
    saveTag: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 90,
      marginLeft: '30%',
    },
    saveTagText: {
      color: c.saveTagText,
      fontSize: 15,
      fontWeight: '600',
    },
    trialText: {
      marginLeft: '3%',
      fontSize: 14,
      color: c.subText,
    },
    ctaButton: {
      backgroundColor: c.ctabtn, // Button background remains white or black based on theme
      borderRadius: 25,
      padding: 20,
      alignItems: 'center',
    },
    ctaButtonDisabled: {
      backgroundColor: '#A9A9A9', // Gray background for disabled state
    },
    ctaButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaButtonText: {
      color: c.ctabtntext,
      fontSize: 18,
      fontWeight: '700',
      marginRight: 8, // Space between text and icon
    },
    ctaButtonIcon: {
      // Additional styling for the icon if needed
    },
    ctaSubtitle: {
      marginTop: 8,
      fontSize: 14,
      color: c.subText,
      textAlign: 'center',
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
      backgroundColor: c.separator,
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
      color: c.subText,
      textAlign: 'center',
      alignSelf: 'center',
    },
  });