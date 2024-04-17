import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Image, Animated, ActivityIndicator, ScrollView } from 'react-native';
import { Camera } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Anthropic from "@anthropic-ai/sdk";
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


const MacroScanHome = () => {
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
    if (apiSuccess && modalImageUri && nutrientData && !nutrientData.productName.toLowerCase().includes("image")) {
        storeProductDetails({
            productName: nutrientData.productName,
            imageUri: modalImageUri,
            nutrients: nutrientData
        });
        // Ensure we reset API success status only after all conditions are met
        setApiSuccess(false);
    }
}, [apiSuccess, modalImageUri, nutrientData]); // Watching all dependencies


  useEffect(() => {
    if (!modalVisible && apiSuccess && modalImageUri) {
      setHomeScreenImageUri(modalImageUri);
      setApiSuccess(false); // Reset apiSuccess to false for the next API request
    }
  }, [modalVisible, apiSuccess, modalImageUri]);

  useEffect(() => {
    if (nutrientData && Object.keys(nutrientData).length > 0) {
      Object.keys(nutrientData).forEach((_, index) => fadeAnims[index] = new Animated.Value(0));
      animateNutrients();
    }
  }, [nutrientData]);

  const animateNutrients = () => {
    const animations = Object.keys(nutrientData).map((_, index) => {
      return Animated.timing(fadeAnims[index], {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        delay: index * 2 // Delays subsequent animations
      });
    });
    Animated.sequence(animations).start();
  };

  const storeProductDetails = async (productDetails) => {
    try {
        const existingHistoryJson = await AsyncStorage.getItem('@product_history');
        let existingHistory = existingHistoryJson ? JSON.parse(existingHistoryJson) : [];
        if (!Array.isArray(existingHistory)) {
            existingHistory = [];  // Reset if corrupted
        }

        const productDetailsWithDate = {
            ...productDetails,
            date: new Date().toISOString() // Ensuring date is always fresh
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

  const pickImage = async () => {
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
      sendImageToApi(base64Data);
    }
  };

  const takePhoto = async () => {
    if (!hasPermission) {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    }

    if (hasPermission) {
      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets) {
        const base64Data = await resizeImage(result.assets[0].uri);
        setModalImageUri(result.assets[0].uri);
        setModalVisible(true);
        sendImageToApi(base64Data);
      }
    }
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  async function sendImageToApi(base64Image) {
    setIsLoading(true); // Start loading
    try {
      const anthropic = new Anthropic({
        apiKey: "ANTHROPIC_API_KEY_REMOVED", // Ensure this is securely managed
      });
  
      const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4096,
        temperature: 0,
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
      Avoid providing data not requested, like per serving info or micronutrients. If no food or beverage is shown, respond with 'The image does not contain food. Try again.' without further comments.`,        messages: [{
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
          Avoid providing data not requested, like per serving info or micronutrients. If no food or beverage is shown, respond with 'The image does not contain food. Try again.' without further comments.`
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

      closeModal(); // Close modal after processing
      setApiSuccess(true); // Set apiSuccess to true after successful API request
    } catch (error) {
      console.error("Error sending message to Anthropic API:", error);
      setIsLoading(false);
      closeModal(); // Close modal after processing
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
      <Text style={styles.productName}>{nutrientData ? nutrientData.productName : 'No image selected'}</Text>
      {homeScreenImageUri && (
        <Image source={{ uri: homeScreenImageUri }} style={styles.productImage} />
      )}
      <ScrollView style={styles.nutrientContainer} showsVerticalScrollIndicator={false}>
        {nutrientData ? Object.entries(nutrientData).map(([key, value], index) => {
          if (key !== 'productName') {
            return (
              <Animated.View key={key} style={[styles.nutrientItem, {opacity: fadeAnims[index]}]}>
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
    </View>
  );
};
const getDynamicStyles = (colorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF', // Dark mode has dark background
  },
  productName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#fff' : '#000',
    marginTop: '15%',
    marginBottom: '3%',
    textAlign: 'center'
  },
  nutrientContainer: {
    width: '95%',
    maxHeight: '40%',
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
    borderRadius: 10,
    padding: '3%',
  },
  nutrientItem: {
    flexDirection: 'column',  // Ensures vertical stacking of content and separator
    alignItems: 'stretch',
    marginBottom: '2%',          // Space between items
    width: '100%',
  },
  nutrientContent: {          // New style for horizontal layout of label and value
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1%',          // Margin before the separator
  },
  nutrientLabel: {
    fontWeight: 'bold',
    fontSize: 17,
    color: colorScheme === 'dark' ? '#f9f9f9' : '#000',
  },
  nutrientValue: {
    color: "#7a7a7a",
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#d9d9d9' : '#7a7a7a',
  },
  separator: {
    height: 1,
    backgroundColor: colorScheme === 'dark' ? '#5a5a5a' : '#CCCCCC',
    width: '100%',
    marginTop: 5,             // Ensures separation from the text
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
    marginTop: 20,
  },
  button: {
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#000',
    borderRadius: 20,
    padding: 12,
    marginHorizontal: '3%',
    width: '88%',
  },
  buttonText: {
    color: colorScheme === 'dark' ? '#e9e9e9' : '#FFF',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  detailButton: {
    backgroundColor: colorScheme === 'dark' ? '#fff' : '#000',
    borderRadius: 20,
    padding: 12,
    paddingHorizontal: 20,
  },
  modalView: {
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#FFF',
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
  productImage: {
    width: '85%',
    height: '30%',
    borderRadius: 25,
    marginTop: 10,
    marginBottom: 20,
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
});

export default MacroScanHome;
