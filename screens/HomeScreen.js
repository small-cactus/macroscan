import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Image, Animated, ActivityIndicator, ScrollView, TextInput, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Anthropic from "@anthropic-ai/sdk";
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import * as RNIap from 'react-native-iap';
import { useIAP } from '../IAPContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faInfinity } from '@fortawesome/free-solid-svg-icons';
import { SymbolView, SymbolViewProps, SFSymbol } from 'expo-symbols';
import { useUser } from '../userContext';

const MacroScanHome = () => {
  const { user, updateUser } = useUser();
  const [hasPermission, setHasPermission] = useState(null);
  const [modalImageUri, setModalImageUri] = useState(null);
  const [homeScreenImageUri, setHomeScreenImageUri] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation();
  const [extractedText, setExtractedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const [nutrientData, setNutrientData] = useState(null);
  const [apiSuccess, setApiSuccess] = useState(false);
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);
  const fadeAnims = useRef([]);
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const [isInputModalVisible, setInputModalVisible] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribedPlus, setIsSubscribedPlus] = useState(false);
  const [timeLeftForScans, setTimeLeftForScans] = useState('');
  const [isFirstDayUnlimited, setIsFirstDayUnlimited] = useState(false);
  const { isIAPEnabled } = useIAP();
  const [selectedModel, setSelectedModel] = useState('claude-3-haiku-20240307');

  const initializeAppData = useCallback(async () => {
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      initializeAppData();
    }, [initializeAppData])
  );

  useEffect(() => {
    const checkSubscription = async () => {
      if (isIAPEnabled) {
        try {
          const purchases = await RNIap.getAvailablePurchases();
          const hasActiveSubscription = purchases.some(purchase => {
            return ['macroscan_plusplus_subscription', 'macroscan_plus_subscription'].includes(purchase.productId);
          });
          setIsSubscribed(hasActiveSubscription);
        } catch (err) {
          console.error('Failed to check subscriptions:', err);
        }
      } else {
        setIsSubscribed(user?.subscriptionStatus === 'plusplus');
        setIsSubscribedPlus(user?.subscriptionStatus === 'plus');
      }
    };

    checkSubscription();
  }, [isIAPEnabled, user]);
  
//PLUSPLUS AND FREE
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!isSubscribed && scanCount >= 5) {
        setTimeLeftForScans(getTimeUntilMidnight());
      } else {
        setTimeLeftForScans('');
      }
    }, 1000 * 60);

    return () => clearInterval(intervalId);
  }, [scanCount, isSubscribed]);

// PLUS
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

  const handleCorrectPress = () => {
    console.log("User confirmed correctness")
    fadeOutFeedback();
  };

  const handleIncorrectPress = () => {
    console.log("User marked the response as incorrect.");
    setInputModalVisible(true);
    fadeOutFeedback();
    removeLatestHistoryEntry();
  };

  const removeLatestHistoryEntry = async () => {
    try {
      const existingHistoryJson = await AsyncStorage.getItem('@product_history');
      let existingHistory = existingHistoryJson ? JSON.parse(existingHistoryJson) : [];
      if (existingHistory.length > 0) {
        existingHistory.pop();
        await AsyncStorage.setItem('@product_history', JSON.stringify(existingHistory));
        console.log("Latest history entry removed.");
      } else {
        console.log("No history to remove.");
      }
    } catch (e) {
      console.error("Error removing latest history entry: ", e);
    }
  };

  const submitUserInput = async () => {
    console.log("User entered food type:", userInput);
    setInputModalVisible(false);
    if (userInput.trim()) {
      await sendImageToApiWithHint(userInput.trim());
    }
    setUserInput('');
  };

  const fadeOutFeedback = () => {
    Animated.timing(fadeInAnim, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const fadeInFeedback = () => {
    Animated.timing(fadeInAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const animateButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const animateButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (apiSuccess && modalImageUri && nutrientData && !nutrientData.productName.toLowerCase().includes("again")) {
      storeProductDetails({
        productName: nutrientData.productName,
        imageUri: modalImageUri,
        nutrients: nutrientData
      });
      setApiSuccess(false);
    }
  }, [apiSuccess, modalImageUri, nutrientData]);

  useEffect(() => {
    if (apiSuccess && nutrientData.productName.toLowerCase().includes("again")) {
      setTimeout(() => {
        fadeInFeedback();
      }, 750);
    }
  }, [apiSuccess, modalImageUri, nutrientData]);

  useEffect(() => {
    if (apiSuccess) {
      setTimeout(() => {
        fadeInFeedback();
      }, 1650);
    }
  }, [apiSuccess, modalImageUri, nutrientData]);

  useEffect(() => {
    if (!modalVisible && apiSuccess && modalImageUri) {
      setHomeScreenImageUri(modalImageUri);
      setApiSuccess(false);
    }
  }, [modalVisible, apiSuccess, modalImageUri]);

  useEffect(() => {
    if (nutrientData && Object.keys(nutrientData).length > 0) {
      Object.keys(nutrientData).forEach((_, index) => fadeAnims.current[index] = new Animated.Value(0));
      animateNutrients();
    }
  }, [nutrientData]);

  const animateNutrients = () => {
    const animations = Object.keys(nutrientData).map((_, index) => {
      return Animated.timing(fadeAnims.current[index], {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        delay: index * 2
      });
    });
    Animated.sequence(animations).start();
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
        date: new Date().toISOString()
      };

      existingHistory.push(productDetailsWithDate);
      const newHistoryJson = JSON.stringify(existingHistory);
      await AsyncStorage.setItem('@product_history', newHistoryJson);
      console.log("Updated History: ", existingHistory);
    } catch (e) {
      console.error("Error storing product details: ", e);
    }
  };

  const resizeImage = async (uri) => {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return result.base64;
  };

  const getTimeUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const millisTillMidnight = midnight.getTime() - now.getTime();
    const hours = Math.floor(millisTillMidnight / (1000 * 60 * 60));
    const minutes = Math.floor((millisTillMidnight % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} hours and ${minutes} minutes`;
  };

  const incrementScanCount = async () => {
    if (!isFirstDayUnlimited && !isSubscribed) {
      const newCount = scanCount + 1;
      setScanCount(newCount);
      await AsyncStorage.setItem('dailyScanCount', newCount.toString());
    }
  };

  const pickImage = async () => {
    let maxScansAllowed;
  
    if (isSubscribedPlus) {
      maxScansAllowed = 20;
    } else if (!isSubscribed || !isFirstDayUnlimited) {
      maxScansAllowed = 5;
    } else {
      const timeLeft = getTimeUntilMidnight();
      Alert.alert(
        "No more Scans left",
        `Upgrade for unlimited scans or wait ${timeLeft} for more scans.`
      );
      return;
    }
  
    if (scanCount >= maxScansAllowed) {
      const timeLeft = getTimeUntilMidnight();
      Alert.alert(
        "No more Scans left",
        `Upgrade for unlimited scans or wait ${timeLeft} for more scans.`
      );
      return;
    }
  
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
  
    if (!result.canceled && result.assets) {
      const base64Data = await resizeImage(result.assets[0].uri);
      setModalImageUri(result.assets[0].uri);
      setModalVisible(true);
      await sendImageToApi(base64Data);
  
      if (!(isSubscribed) && !isFirstDayUnlimited && apiSuccess) {
        await incrementScanCount();
      }
    }
  };
  
  const takePhoto = async () => {
    if (!hasPermission) {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    }
  
    if (hasPermission) {
      let maxScansAllowed;
  
    if (isSubscribedPlus) {
      maxScansAllowed = 20;
    } else if (!isSubscribed || !isFirstDayUnlimited) {
      maxScansAllowed = 5;
    } else {
      const timeLeft = getTimeUntilMidnight();
      Alert.alert(
        "No more Scans left",
        `Upgrade for unlimited scans or wait ${timeLeft} for more scans.`
      );
      return;
    }
  
    if (scanCount >= maxScansAllowed) {
      const timeLeft = getTimeUntilMidnight();
      Alert.alert(
        "No more Scans left",
        `Upgrade for unlimited scans or wait ${timeLeft} for more scans.`
      );
      return;
    }
  
      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
  
      if (!result.canceled && result.assets) {
        const base64Data = await resizeImage(result.assets[0].uri);
        setModalImageUri(result.assets[0].uri);
        setModalVisible(true);
        await sendImageToApi(base64Data);
  
        if (!isSubscribed && !isFirstDayUnlimited && apiSuccess) {
          await incrementScanCount();
        }
      }
    }
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  async function sendImageToApiWithHint(userHint) {
    setIsLoading(true);
    try {
      const apiKey = await AsyncStorage.getItem('@apikey');
    
    if (!apiKey) {
      console.error('API key not found');
      setIsLoading(false);
      return;
    }

    // Create a new instance of the Anthropic library using the retrieved API key
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

      const base64Image = await resizeImage(modalImageUri);

      const msg = await anthropic.messages.create({
        model: selectedModel,
        max_tokens: 4096,
        temperature: 0.7,
        system: `If the image depicts food, fruits, vegetables, or a beverage, list the macronutrient data for each item, focusing on the following, SAY NOTHING but the following macronutrient data:
          Name of food(s) (number of food items, eg. bags, plates, pieces, example: 2 burgers. 2 bags. 2 pieces. 2 plates. 2 bowls. If 1 item, do not specify the item number)
          Carbohydrates (g) per item
          Proteins (g) per item
          Fats (g) per item
          Total Calories (cal) both items
          Dietary Fiber (g) per item
          Sugars (g) per item
          Saturated Fats (g) per item
          Sodium (mg) per item

          NOTE: Only include calculations based on the quantity depicted. Exclude additional categories. Name meals by their collective identity, e.g., McDonalds Meal (number of items). Always include the unit next to the measurement.

    Focus on precise amounts, detailing visible food items for an accurate nutrient breakdown, e.g., separate 'Proteins' for chicken.
    Avoid discussing unrequested details like serving sizes or micronutrients. If no food or beverage is present, simply state 'No food found. Try again.' and cease further comments.`,
        messages: [{
          "role": "user",
          "content": [{
            "type": "text",
            "text": `Hint, a detail about the food is: ${userHint}
            
            Please check my hint before trusting it with these guidelines:
            CRUCIAL GUIDANCE FOR USER INPUT:
      1. If the user's count is excessively inaccurate, e.g., you observe 8 items and the user claims 700, respond only with 'There aren't 700 items.' EXTREMELY IMPORTANT: Do not add further comments or descriptions.
      2. Exercise judgment regarding the user's reliability before responding. If unsure, either reply with a concise four-word message or provide macronutrient data as outlined above.

        DO NOT REPLY WITH MORE THAN 2 SENTENCES OR ANYTHING OTHER THAN EXACTLY WHAT YOU HAVE BEEN TOLD TO RESPOND WITH.`
          }, {
            "type": "image",
            "source": {
              "type": "base64",
              "media_type": "image/jpeg",
              "data": base64Image
            }
          }]
        }]
      });

      const textResponse = msg.content && msg.content.length > 0 && msg.content[0].text ? msg.content[0].text : "No text data available in the response.";
      setIsLoading(false);
      setExtractedText(textResponse);

      if (textResponse !== "No text data available in the response.") {
        const parsedData = parseNutrientData(textResponse);
        setNutrientData(parsedData);
      }

      closeModal();
      setApiSuccess(true);
    } catch (error) {
      console.error("Error sending message to Anthropic API:", error);
      Alert.alert("High Demand", `We're experiencing extremely high demand, try again in 1 minute.`);
      setIsLoading(false);
      closeModal();
    }
  }

  async function sendImageToApi(base64Image) {
    setIsLoading(true);
    try {
      const apiKey = await AsyncStorage.getItem('@apikey');
    
    if (!apiKey) {
      console.error('API key not found');
      setIsLoading(false);
      return;
    }

    // Create a new instance of the Anthropic library using the retrieved API key
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

      const msg = await anthropic.messages.create({
        model: selectedModel,
        max_tokens: 4096,
        temperature: 0.7,
        system: `If the image depicts food, fruits, vegetables, or a beverage, list the macronutrient data for each item, focusing on the following, SAY NOTHING but the following macronutrient data:
        Name of food(s) (number of food items, eg. bags, plates, pieces, example: 2 burgers. 2 bags. 2 pieces. 2 plates. 2 bowls. If 1 item, do not specify the item number)
        Carbohydrates (g) per item
        Proteins (g) per item
        Fats (g) per item
        Total Calories (cal) both items
        Dietary Fiber (g) per item
        Sugars (g) per item
        Saturated Fats (g) per item
        Sodium (mg) per item

        IMPORTANT: take into account the amount of the item presented for nutrient data. Don't add extra categories. Label meals by their collective status, eg McDonalds Meal (number of items). Always include the measurement label next to the measurement.

      Be specific with amounts, using all relevant details from the image for precision. For instance, if it's a chicken salad, break it down into 'Proteins' for chicken, with estimated amounts for each listed nutrient.
      Avoid providing data not requested, like per serving info or micronutrients. If no food or beverage is shown, respond with 'No food found. Try again.' without further comments.
      
      We DO NOT allow multiple food items, ONLY IF there are multiple food items, include them all together like (examlple: Burger and fries) and make sure the nutrient values line up with the full meal content.`,
        messages: [{
          "role": "user",
          "content": [{
            "type": "text",
            "text": `If the image depicts food, fruits, vegetables, or a beverage, list the macronutrient data for each item, focusing on the following, SAY NOTHING but the following macronutrient data:
            Name of food(s) (number of food items, eg. bags, plates, pieces, example: 2 burgers. 2 bags. 2 pieces. 2 plates. 2 bowls. If 1 item, do not specify the item number)
            Carbohydrates (g) per item
            Proteins (g) per item
            Fats (g) per item
            Total Calories (cal) both items
            Dietary Fiber (g) per item
            Sugars (g) per item
            Saturated Fats (g) per item
            Sodium (mg) per item

            IMPORTANT: take into account the amount of the item presented for nutrient data. Don't add extra categories. Label meals by their collective status, eg McDonalds Meal (number of items). Always include the measurement label next to the measurement.

          Be specific with amounts, using all relevant details from the image for precision. For instance, if it's a chicken salad, break it down into 'Proteins' for chicken, with estimated amounts for each listed nutrient.
          Avoid providing data not requested, like per serving info or micronutrients. If no food or beverage is shown, respond with 'No food found. Try again.' without further comments.
          
      We DO NOT allow multiple food items, ONLY IF there are multiple food items, include them all together like (examlple: Burger and fries) and make sure the nutrient values line up with the full meal content.`,
    }, {
            "type": "image",
            "source": {
              "type": "base64",
              "media_type": "image/jpeg",
              "data": base64Image
            }
          }]
        }]
      });

      const textResponse = msg.content && msg.content.length > 0 && msg.content[0].text ? msg.content[0].text : "No text data available in the response.";
      setIsLoading(false);
      setExtractedText(textResponse);

      if (textResponse !== "No text data available in the response.") {
        const parsedData = parseNutrientData(textResponse);
        setNutrientData(parsedData);
      }
      console.log(msg)
      closeModal();
      setApiSuccess(true);
      await incrementScanCount();
    } catch (error) {
      console.error("Error sending message to Anthropic API:", error);
      Alert.alert("High Demand", `We're experiencing extremely high demand, try again in 1 minute.`);
      
      setIsLoading(false);
      closeModal();
    }
  }

  function parseNutrientData(text) {
    const lines = text.split('\n');
    const productName = lines[0] || '';

    const nutrients = lines
      .slice(1)
      .map((line) => {
        const parts = line.split(': ');
        return {
          label: parts[0]?.trim().replace(/\d+\.\s/, '') || '',
          value: parts[1]?.trim() || '',
        };
      })
      .reduce((acc, nutrient) => {
        acc[nutrient.label] = nutrient.value;
        return acc;
      }, {});

    return { productName, ...nutrients };
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.titleContainer}>
          <Text style={styles.productName}>
            {nutrientData ? nutrientData.productName : 'No image selected'}
          </Text>
          <TouchableOpacity
  style={styles.scanCounter}
  onPress={() => {
    let message = '';
    if (isSubscribed) {
      message = "You have unlimited scans because you're subscribed.";
    } else if (isSubscribedPlus) {
      message = `You have used ${scanCount} of 20 scans today.`;
    } else {
      message = `You have used ${scanCount} of 5 scans today.`;
    }
    Alert.alert("Scan Limit", message);
  }}
>
  <Text style={isSubscribed ? styles.infinityIcon : styles.scanCounterText}>
    {isSubscribed ? (
      <FontAwesomeIcon
        icon={faInfinity}
        size={24}
        color={colorScheme === 'dark' ? '#e9e9e9' : '#000'}
      />
    ) : isSubscribedPlus ? (20 - scanCount) : (5 - scanCount)}
  </Text>
</TouchableOpacity>
        </View>
        {homeScreenImageUri && (
          <View style={styles.productImageContainer}>
            <Image source={{ uri: homeScreenImageUri }} style={styles.productImage} />
          </View>
        )}
      </View>
      <ScrollView style={styles.nutrientContainer} showsVerticalScrollIndicator={true}>
        {nutrientData ? Object.entries(nutrientData).map(([key, value], index) => {
          if (key !== 'productName') {
            return (
              <Animated.View key={key} style={[styles.nutrientItem, { opacity: fadeAnims.current[index] }]}>
                <View style={styles.nutrientContent}>
                  <Text style={styles.nutrientLabel}>{key}:</Text>
                  <Text style={styles.nutrientValue}>{value}</Text>
                </View>
                <View style={styles.separator}></View>
              </Animated.View>
            );
          }
        }) : (
          <Text style={styles.promptText}>Capture or select an image to get Macros, you can also take a picture of the nutrients label for more accurate information.</Text>
        )}
      </ScrollView>
      <View style={styles.buttonContainer}>
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            onPressIn={animateButtonPressIn}
            onPressOut={animateButtonPressOut}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              takePhoto();
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Take Photo Now</Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            onPressIn={animateButtonPressIn}
            onPressOut={animateButtonPressOut}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              pickImage();
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Pick from Gallery</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
      <View> 
      </View>
      <Animated.View style={[styles.feedbackContainer, { opacity: fadeInAnim }]}>
        <Text style={styles.feedbackText}>Did we get this right?</Text>
        <View style={styles.iconButtonContainer}>
          <TouchableOpacity onPress={handleCorrectPress} style={[styles.iconButton, { backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000' }]}>
            <Icon
              name="checkmark-outline"
              size={25}
              color={colorScheme === 'dark' ? '#e9e9e9' : '#FFF'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleIncorrectPress} style={[styles.iconButton, { backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000' }]}>
            <Icon
              name="close-outline"
              size={25}
              color={colorScheme === 'dark' ? '#e9e9e9' : '#FFF'}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {modalImageUri && (
              <Image source={{ uri: modalImageUri }} style={styles.imagePreview} />
            )}
            {isLoading ? (
              <ActivityIndicator size="large" color={styles.activityIndicatorColor.color} />
            ) : (
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
        visible={isInputModalVisible}
        onRequestClose={() => setInputModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.inputModalView}>
            <Text style={styles.inputModalText}>Enter the food name or type</Text>
            <Text style={styles.inputModalText}>(e.g., apple, pasta)</Text>
            <TextInput
              style={styles.input}
              onChangeText={setUserInput}
              value={userInput}
              placeholder="Name or type of food"
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
  },
  headerContainer: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: '9%',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#fff' : '#000',
    textAlign: 'center',
    flex: 1,
    marginRight: '-12%',
  },
  scanCounter: {
    marginLeft: 10,
    borderWidth: colorScheme === 'dark' ? 2.5 : 3.2,
    borderColor: colorScheme === 'dark' ? '#5a5a5a' : '#e0e0e0',
    borderRadius: 50,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    width: 40,
  },
  infinityIcon: {
    marginTop: '12.6%',
    textAlign: 'center',
    color: colorScheme === 'dark' ? '#e9e9e9' : '#000',
  },
  scanCounterText: {
    fontSize: 21,
    fontWeight: '500',
    color: colorScheme === 'dark' ? '#e0e0e0' : '#5a5a5a',
  },
  nutrientContainer: {
    width: '95%',
    maxHeight: '40%',
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
    borderRadius: 10,
    padding: '3%',
  },
  nutrientItem: {
    flexDirection: 'column',
    alignItems: 'stretch',
    marginBottom: '2%',
    width: '100%',
  },
  nutrientContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1%',
  },
  nutrientLabel: {
    fontWeight: '500',
    fontSize: 17,
    color: colorScheme === 'dark' ? '#f9f9f9' : '#000',
  },
  nutrientValue: {
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '400',
    color: colorScheme === 'dark' ? '#d9d9d9' : '#7a7a7a',
  },
  separator: {
    height: 3.4,
    backgroundColor: colorScheme === 'dark' ? '#2f2f2f' : '#e1e1e1',
    width: '100%',
    borderRadius: 60,
    marginTop: 5,
  },
  promptText: {
    color: '#AAAAAA',
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '5%',
  },
  button: {
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
    borderRadius: 20,
    padding: 12,
    marginHorizontal: '3%',
    width: '88%',
    marginTop: '-5%',
  },
  buttonText: {
    color: colorScheme === 'dark' ? '#e9e9e9' : '#FFF',
    fontWeight: "600",
    textAlign: 'center'
  },
  modalView: {
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#FFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: colorScheme === 'dark' ? '#000' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  imagePreview: {
    width: 300,
    height: 400,
    borderRadius: 10,
    marginBottom: 15,
  },
  closeButton: {
    backgroundColor: '#AAAAAA',
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginTop: 15,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  productImageContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: '2%',
    marginBottom: '4%',
  },
  productImage: {
    width: '100%',
    height: 230, // Adjust the height as needed
    borderRadius: 25,
  },
  NeedHelpText: {
    textDecorationLine: 'underline',
    marginBottom: 20,
    textAlign: 'center',
  },
  NeedHelp: {
    marginTop: 50,
    textAlign: 'center',
  },
  activityIndicatorColor: {
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
  },
  feedbackContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2.5%',
    width: '100%',
    marginTop: '0%',
  },
  feedbackText: {
    fontSize: 15.5,
    color: colorScheme === 'dark' ? '#AAAAAA' : '#AAAAAA',
    marginBottom: 10,
  },
  iconButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  iconButton: {
    padding: 3,
    marginHorizontal: 30,
    backgroundColor: colorScheme === 'dark' ? '#e9e9e9' : '#000',
    borderRadius: 100,
  },
  inputModalView: {
    margin: 20,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
    borderRadius: 40,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 2,
    padding: 10,
    width: 300,
    borderColor: colorScheme === 'dark' ? '#4a4a4a' : '#000',
    color: colorScheme === 'dark' ? '#e9e9e9' : '#000',
    borderRadius: 15,
  },
  inputModalButton: {
    backgroundColor: colorScheme === 'dark' ? '#2d2d2d' : '#000',
    borderRadius: 90,
    padding: '3%',
    paddingHorizontal: '6%',
    elevation: 2,
    marginTop: '5%',
  },
  inputModalButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center"
  },
  inputModalText: {
    marginBottom: '2%',
    textAlign: "center",
    fontSize: 15,
    fontWeight: "500",
    color: colorScheme === 'dark' ? '#e9e9e9' : '#000',
  },
});

export default MacroScanHome;
