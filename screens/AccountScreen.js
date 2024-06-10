import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, TextInput, Alert, Dimensions, Platform, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Appearance } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as RNIap from 'react-native-iap';
import { useIAP } from '../IAPContext';
import { useUser } from '../userContext';

const itemSkus = Platform.select({
  ios: ['macroscan_plusplus_subscription', 'macroscan_plus_subscription', 'remove_ads_one_time'],
  android: ['macroscan_plusplus_subscription', 'macroscan_plus_subscription', 'remove_ads_one_time']
});

const { width, height } = Dimensions.get('window');
const fontSize = width * 0.045;
const logoSize = width * 0.1;
const subcriptionFeatureSize = width * 0.037;
const priceTextSize = width * 0.037;

export default function AccountScreen() {
  const [imageUri, setImageUri] = useState(null);
  const [name, setName] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [isSubscribedPlusPlus, setIsSubscribedPlusPlus] = useState(false);
  const [isSubscribedPlus, setIsSubscribedPlus] = useState(false);
  const [hasPurchasedAdsRemoval, setHasPurchasedAdsRemoval] = useState(false);
  const { isIAPEnabled, toggleIAP } = useIAP();
  const { user, setUser, deleteUser, updateUser } = useUser();
  const intervalRef = useRef(null);
  const lastFetchTimeRef = useRef(Date.now());

  const log = (message) => {
    if (showLogs) {
      Alert.alert('Log', message);
    }
    console.log(message);
  };

  const logError = (message, error) => {
    if (showLogs) {
      Alert.alert('Error', `${message}: ${error}`);
    }
    console.error(message, error);
  };

  useEffect(() => {
    if (!isIAPEnabled) return;

    const initIAP = async () => {
      try {
        log('Initializing IAP connection...');
        await RNIap.initConnection();
        log('IAP Connection initialized');

        if (itemSkus && itemSkus.length > 0) {
          const prods = await RNIap.getProducts({ skus: itemSkus });
          log(`Products fetched: ${JSON.stringify(prods)}`);
          setProducts(prods);
        } else {
          logError('SKUs not found');
        }
      } catch (error) {
        logError('Failed to initialize IAP', error);
      }

      return () => {
        log('Ending IAP connection...');
        RNIap.endConnection();
      };
    };

    initIAP();
  }, [isIAPEnabled]);

  const handlePurchase = async (productId) => {
    log(`Attempting to purchase SKU: ${productId}`);
    try {
      const purchase = await RNIap.requestPurchase({ sku: productId });
      log(`Purchase completed for: ${productId}, ${JSON.stringify(purchase)}`);
  
      if (productId === 'macroscan_plusplus_subscription') {
        setIsSubscribedPlusPlus(true);
        await updateUserSubscription('macroscan_plusplus_subscription');
        log('Updated user subscription to MacroScan++');
      } else if (productId === 'macroscan_plus_subscription') {
        setIsSubscribedPlus(true);
        await updateUserSubscription('macroscan_plus_subscription');
        log('Updated user subscription to MacroScan+');
      } else if (productId === 'remove_ads_one_time') {
        setHasPurchasedAdsRemoval(true);
        await updateUserSubscription('remove_ads_one_time');
        log('Updated user subscription to remove ads');
      }
  
      unlockFeatures(productId);
    } catch (error) {
      logError(`Purchase failed for: ${productId}`, error);
      if (error.code === 'E_USER_CANCELLED') {
        Alert.alert('Purchase Cancelled', 'You cancelled the purchase.');
      } else if (error.code === 'E_ALREADY_OWNED') {
        Alert.alert('Already Purchased', 'You have already purchased this item.');
      } else if (error.code === 'E_ITEM_UNAVAILABLE') {
        Alert.alert('Item Unavailable', 'The requested item is unavailable.');
      } else if (error.code === 'E_REMOTE_ERROR') {
        Alert.alert('Server Error', 'An error occurred on the server. Please try again later.');
      } else if (error.code === 'E_NETWORK_ERROR') {
        Alert.alert('Network Error', 'A network error occurred. Please check your internet connection and try again.');
      } else if (error.code === 'E_SERVICE_ERROR') {
        Alert.alert('Service Error', 'An error occurred with the payment service. Please try again later.');
      } else {
        Alert.alert('Purchase Error', 'An unknown error occurred while processing the purchase. Please try again later.');
      }
    }
  };

  const updateUserSubscription = async (subscription) => {
    if (!user) return;
    const updates = { subscriptionStatus: subscription };
    await updateUser(updates);
  };

  const checkSubscription = async () => {
    try {
      const purchases = await RNIap.getAvailablePurchases();
      log(`Available purchases: ${JSON.stringify(purchases)}`);
  
      if (purchases && purchases.length > 0) {
        const subscribedPlusPlus = purchases.some(purchase => purchase.productId === 'macroscan_plusplus_subscription');
        const subscribedPlus = purchases.some(purchase => purchase.productId === 'macroscan_plus_subscription');
        const purchasedAdsRemoval = purchases.some(purchase => purchase.productId === 'remove_ads_one_time');
  
        setIsSubscribedPlusPlus(subscribedPlusPlus);
        setIsSubscribedPlus(subscribedPlus);
        setHasPurchasedAdsRemoval(purchasedAdsRemoval);

        await updateUserSubscription(subscribedPlusPlus ? 'macroscan_plusplus_subscription' : subscribedPlus ? 'macroscan_plus_subscription' : purchasedAdsRemoval ? 'remove_ads_one_time' : 'free');
      } else {
        log('No available purchases found, setting to free plan');
        setIsSubscribedPlusPlus(false);
        setIsSubscribedPlus(false);
        setHasPurchasedAdsRemoval(false);
        await updateUserSubscription('free');
      }
    } catch (error) {
      logError('Failed to restore purchases', error);
      Alert.alert('Restore Error', 'Failed to restore purchases. Please try again later.');
    }
  };

  useEffect(() => {
    if (isIAPEnabled) {
      checkSubscription();

      intervalRef.current = setInterval(() => {
        checkSubscription();
      }, 30 * 60 * 1000); // 30 minutes in milliseconds

      return () => {
        clearInterval(intervalRef.current);
      };
    }
  }, [isIAPEnabled]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const now = Date.now();
      if (isIAPEnabled && now - lastFetchTimeRef.current >= 30 * 60 * 1000) {
        checkSubscription();
        lastFetchTimeRef.current = now;
      }
    });

    return unsubscribe;
  }, [navigation, isIAPEnabled]);

  useEffect(() => {
    if (!isIAPEnabled) return;

    const purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
      log(`Purchase updated: ${JSON.stringify(purchase)}`);
      const receipt = purchase.transactionReceipt ? purchase.transactionReceipt : purchase.originalJson;
      if (receipt) {
        try {
          await RNIap.finishTransaction(purchase, true);
          log(`Transaction finished: ${JSON.stringify(purchase)}`);
    
          if (purchase.productId === 'macroscan_plusplus_subscription') {
            setIsSubscribedPlusPlus(true);
            await updateUserSubscription('macroscan_plusplus_subscription');
          } else if (purchase.productId === 'macroscan_plus_subscription') {
            setIsSubscribedPlus(true);
            await updateUserSubscription('macroscan_plus_subscription');
          } else if (purchase.productId === 'remove_ads_one_time') {
            setHasPurchasedAdsRemoval(true);
            await updateUserSubscription('remove_ads_one_time');
          }
    
          unlockFeatures(purchase.productId);
        } catch (error) {
          logError('Finish transaction error', error);
        }
      }
    });

    return () => {
      if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription.remove();
      }
    };
  }, [isIAPEnabled]);

  const unlockFeatures = (productId) => {
    switch (productId) {
      case 'macroscan_plusplus_subscription':
        log("Features for MacroScan++ Unlocked!");
        break;
      case 'macroscan_plus_subscription':
        log("Features for MacroScan+ Unlocked!");
        break;
      case 'remove_ads_one_time':
        log("Ads Removed!");
        break;
      default:
        log("Unknown product ID");
        break;
    }
  };

  useEffect(() => {
    async function loadProfile() {
      try {
        const savedName = await AsyncStorage.getItem('userName');
        const savedImageUri = await AsyncStorage.getItem('userImageUri');
        setName(savedName || '');
        setImageUri(savedImageUri || 'https://via.placeholder.com/150');
      } catch (error) {
        Alert.alert('Error', 'Failed to load user data.');
        logError('Failed to load user data', error);
      }
    }
    loadProfile();
  }, []);

  const resetImageUri = async () => {
    try {
      await AsyncStorage.removeItem('userImageUri');
      setImageUri('https://via.placeholder.com/150');
      Alert.alert('Reset Done', 'The profile image has been reset.');
    } catch (error) {
      Alert.alert('Error', 'Failed to reset the profile image.');
      logError('Failed to reset the profile image', error);
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
              await AsyncStorage.removeItem('@user');
              await AsyncStorage.removeItem('userImageUri');
              await AsyncStorage.removeItem('userName');
              await AsyncStorage.removeItem('@user_logged_in');
              await AsyncStorage.removeItem('@product_history');
              await AsyncStorage.removeItem('selectedModel');
              await AsyncStorage.removeItem('dailyScanCount');
              await AsyncStorage.removeItem('firstUseDate');
              await AsyncStorage.removeItem('dateLastUsed');

              setUser(null);

              Alert.alert('Account deleted', 'Your account has been deleted.');
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
        }
      ],
      { cancelable: false }
    );
  };

  const saveData = async (uri) => {
    try {
      await AsyncStorage.setItem('userName', name);
      if (uri) {
        await AsyncStorage.setItem('userImageUri', uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save the data.');
      logError('Failed to save the data', error);
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
      logError('An error occurred while picking the image', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>Show Logs</Text>
        <Switch value={showLogs} onValueChange={setShowLogs} />
      </View>
      <View style={styles.imageContainer}>
        <TouchableOpacity onPress={pickImage}>
          <Image
            source={{ uri: loadError ? 'https://via.placeholder.com/150' : imageUri }}
            style={styles.image}
            onError={() => {
              setLoadError(true);
            }}
          />
          <View style={styles.iconOverlay}>
            <MaterialCommunityIcons
              name="pencil"
              size={24}
              color={colorScheme === 'dark' ? 'black' : 'white'}
            />
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>
          {name && name.split(" ")[0] ? `Hi, ${name.split(" ")[0]}! 👋` : "Your Account"}
        </Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your full name"
          onBlur={() => {
            const parts = name.trim().split(/\s+/);
            if (parts.length < 2) {
              Alert.alert("Both Names Please!", "Please enter your full name (first and last name).");
              setName('');
            } else {
              saveData();
            }
          }}
        />
        <Text style={styles.description}>
          {name && name.split(" ")[0]
            ? `Hello, ${name.split(" ")[0]}! You can manage your account, and subscribe to MacroScan+ here.`
            : "Welcome to MacroScan! You can manage your account settings here."}
        </Text>
      </View>
      <View style={styles.subscriptionContainer}>
        <View style={styles.subscriptionOption1}>
          <View style={styles.titleWithLogo}>
            <Image source={require('../assets/logo-white-big.png')} style={styles.logo} />
            <Text style={styles.subscriptionTitle}>MacroScan++</Text>
            <TouchableOpacity
              style={isSubscribedPlusPlus ? styles.subscribeButtonDisabled1 : styles.subscribeButton1}
              onPress={() => handlePurchase('macroscan_plusplus_subscription')}
              disabled={isSubscribedPlusPlus || isSubscribedPlus || hasPurchasedAdsRemoval}>
              <Text style={styles.subscribeButtonText}>
                {isSubscribedPlusPlus ? 'Subscribed' : 'Subscribe'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.rightPart}>
            <Text style={styles.priceText}>$8.99/Month</Text>
          </View>
          <Text style={styles.subscriptionFeature}>• Unlimited scans</Text>
          <Text style={styles.subscriptionFeature}>• Access to the most accurate scanner</Text>
          <Text style={styles.subscriptionFeature}>• No Ads</Text>
        </View>
        <View style={styles.subscriptionOption2}>
          <View style={styles.titleWithLogo}>
            <Image source={require('../assets/logo-white-big.png')} style={styles.logo} />
            <Text style={styles.subscriptionTitle}>MacroScan+</Text>
            <TouchableOpacity
              style={isSubscribedPlus ? styles.subscribeButtonDisabled2 : styles.subscribeButton2}
              onPress={() => handlePurchase('macroscan_plus_subscription')}
              disabled={isSubscribedPlus || isSubscribedPlusPlus}>
              <Text style={styles.subscribeButtonText}>
                {isSubscribedPlus ? 'Subscribed' : 'Subscribe'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.rightPart}>
            <Text style={styles.priceText}>$3.99/Month</Text>
          </View>
          <Text style={styles.subscriptionFeature}>• Unlimited scans</Text>
          <Text style={styles.subscriptionFeature}>• Access to more accurate recognition</Text>
          <Text style={styles.subscriptionFeature}>• No Ads</Text>
        </View>
        <View style={styles.subscriptionOption3}>
          <View style={styles.titleWithLogo}>
            <Image source={require('../assets/logo-white-big.png')} style={styles.logo} />
            <Text style={styles.subscriptionTitle}>Remove Ads</Text>
            <TouchableOpacity
              style={hasPurchasedAdsRemoval ? styles.subscribeButtonDisabled3 : styles.subscribeButton3}
              onPress={() => handlePurchase('remove_ads_one_time')}
              disabled={hasPurchasedAdsRemoval || isSubscribedPlusPlus}>
              <Text style={styles.subscribeButtonText}>
                {hasPurchasedAdsRemoval ? 'Purchased' : 'Purchase'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.rightPart}>
            <Text style={styles.priceText}>$5.99 Once</Text>
          </View>
          <Text style={styles.subscriptionFeature}>• No Ads</Text>
          <Text style={styles.subscriptionFeature}>• Everything on free plan</Text>
          <Text style={styles.subscriptionFeature}>• Can upgrade any time</Text>
        </View>
        <Text style={styles.dangerSection}>⚠️ Danger Section ⚠️</Text>
        <View style={styles.separatorBox}></View>
        <TouchableOpacity style={styles.deleteButton} onPress={deleteAccount}>
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  content: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#fff' : '#333',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#b0b0b0' : '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: 'center',
    backgroundColor: '#ddd',
  },
  input: {
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#5f5f5f' : '#ddd',
    color: colorScheme === 'dark' ? '#f9f9f9' : '#000',
    padding: 10,
    fontSize: 18,
    borderRadius: 6,
    width: '100%',
  },
  iconOverlay: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    backgroundColor: colorScheme === 'dark' ? '#fff' : '#000',
    padding: 5,
    paddingHorizontal: 5,
    borderRadius: 12,
  },
  resetButton: {
    marginTop: 20,
    backgroundColor: 'black',
    padding: 10,
    borderRadius: 100,
  },
  resetButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
  subscriptionContainer: {
    marginTop: '10%',
    alignItems: 'center',
    paddingBottom: 60,
  },
  subscriptionTitle: {
    color: 'white',
    fontSize: fontSize,
    fontWeight: 'bold',
  },
  subscriptionFeature: {
    color: 'white',
    fontSize: subcriptionFeatureSize,
    marginBottom: '2%',
  },
  subscribeButtonText: {
    color: 'black',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  titleWithLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: '2%',
  },
  logo: {
    width: logoSize,
    height: logoSize,
    marginRight: '4%',
    resizeMode: 'contain',
  },
  priceText: {
    color: 'white',
    fontSize: priceTextSize,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'right',
    marginRight: '7%',
  },
  subscribeButton1: {
    backgroundColor: '#ffffff',
    padding: '3.3%',
    width: '40%',
    borderRadius: 100,
    marginTop: 0,
    marginLeft: '6%',
    marginRight: '11%',
  },
  subscribeButton2: {
    backgroundColor: '#ffffff',
    padding: '3.3%',
    width: '40%',
    borderRadius: 100,
    marginTop: 0,
    marginLeft: '10%',
    marginRight: '11%',
  },
  subscribeButton3: {
    backgroundColor: '#ffffff',
    padding: '3.3%',
    width: '40%',
    borderRadius: 100,
    marginTop: 0,
    marginLeft: '11%',
    marginRight: '11%',
  },
  subscriptionOption1: {
    backgroundColor: 'black',
    padding: '4.5%',
    borderRadius: 30,
    width: '100%',
    marginBottom: '3%',
  },
  subscriptionOption2: {
    backgroundColor: '#232323',
    padding: '4.5%',
    borderRadius: 30,
    width: '100%',
    marginBottom: '3%',
  },
  subscriptionOption3: {
    backgroundColor: '#424242',
    padding: '5%',
    borderRadius: 30,
    width: '100%',
    marginBottom: '3%',
  },
  deleteButton: {
    marginTop: '6%',
    backgroundColor: '#FF4136',
    padding: 15,
    borderRadius: 100,
    width: '45%',
    marginBottom: '10%',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  dangerSection: {
    marginTop: '5%',
    marginBottom: '5%',
    color: colorScheme === 'dark' ? '#fff' : '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  separatorBox: {
    width: 330,
    height: 5,
    backgroundColor: colorScheme === 'dark' ? '#5a5a5a' : '#CCCCCC',
    borderRadius: 3,
  },
  subscribeButtonDisabled1: {
    backgroundColor: '#a3a3a3',  // Light gray color for disabled state
    padding: '3.3%',
    width: '40%',
    borderRadius: 100,
    marginTop: 0,
    marginLeft: '6%',
    marginRight: '11%',
  },
  subscribeButtonDisabled2: {
    backgroundColor: '#a3a3a3',  // Light gray color for disabled state
    padding: '3.3%',
    width: '40%',
    borderRadius: 100,
    marginTop: 0,
    marginLeft: '10%',
    marginRight: '11%',
  },
  subscribeButtonDisabled3: {
    backgroundColor: '#a3a3a3',  // Light gray color for disabled state
    padding: '3.3%',
    width: '40%',
    borderRadius: 100,
    marginTop: 0,
    marginLeft: '11%',
    marginRight: '11%',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  toggleLabel: {
    fontSize: 16,
    marginRight: 10,
  },
});
