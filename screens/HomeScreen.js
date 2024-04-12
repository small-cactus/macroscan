import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Image, Animated, ActivityIndicator, ScrollView } from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import Anthropic from "@anthropic-ai/sdk";
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';

const MacroScanHome = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [image, setImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation();
  const [extractedText, setExtractedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const [nutrientData, setNutrientData] = useState(null);

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
      setImage(result.assets[0].uri);
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
        setImage(result.assets[0].uri);
        setModalVisible(true);
        sendImageToApi(base64Data);
      }
    }
  };

  const closeModal = () => setModalVisible(false);

  async function sendImageToApi(base64Image) {
    setIsLoading(true); // Start loading
    try {
      const anthropic = new Anthropic({
        apiKey: "ANTHROPIC_API_KEY_REMOVED", // Ensure this is securely managed
      });
  
      const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1500,
        temperature: 0,
        system: `If the image depicts food or a beverage, list the macronutrient data for each item, focusing on the following, SAY NOTHING but the following macronutrient data:
        Name of food(s)
        Carbohydrates (g)
        Proteins (g)
        Fats (g)
        Total Calories (cal)
        Dietary Fiber (g)
        Sugars (g)
        Saturated Fats (g)
        Trans Fats (g)
      Be specific with amounts, using all relevant details from the image for precision. For instance, if it's a chicken salad, break it down into 'Proteins' for chicken, with estimated amounts for each listed nutrient.
      Avoid providing data not requested, like per serving info or micronutrients. If no food or beverage is shown, respond with 'The image does not contain food. Try again.' without further comments.`,        messages: [{
          "role": "user",
          "content": [{
            "type": "text",
            "text": `If the image shows food, accurately detail the macronutrient data for each item, emphasizing:
- Name of food(s) EXTREMELY IMPORTANT!!!
- Carbohydrates(from thing, example: oats) (g)
- Proteins(from thing) (g)
- Fats(from thing) (g)
- Total Calories (cal)
- Dietary Fiber(from thing) (g)
- Sugars(from thing) (g)
- Saturated Fats(from thing) (g)
- Trans Fats(from thing) (g)
Be extremely specific, leveraging image details for precision. E.g., for a bowl of oatmeal with nuts, list 'Carbohydrates' for oats, 'Proteins' for nuts, etc., with specific amounts for the macronutrients above.
Do not collect or provide nutrient data not requested, such as per serving details. If the image doesn't feature food or a beverage, simply state 'The image does not contain food. Try again.' But make sure with 100% certainity that it is not food before saying this.`
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
      console.log(textResponse);
      setExtractedText(textResponse);

      if (textResponse !== "No text data available in the response.") {
        const parsedData = parseNutrientData(textResponse);
        setNutrientData(parsedData);
      } else {
        setNutrientData(null);
      }

      closeModal();
    } catch (error) {
      console.error("Error sending message to Anthropic API:", error);
      setIsLoading(false);
    }
  }

  function parseNutrientData(text) {
    const lines = text.split('\n');
    const productName = lines[0];
    const nutrients = lines.slice(1).map(line => {
      const parts = line.split(': ');
      return { label: parts[0].trim().replace(/\d+\.\s/, ''), value: parts[1].trim() };
    }).reduce((acc, nutrient) => {
      acc[nutrient.label] = nutrient.value;
      return acc;
    }, {});
    return { productName, ...nutrients };
  }

  return (
    <View style={styles.container}>
      <Text style={styles.productName}>{nutrientData ? nutrientData.productName : 'MacroScan'}</Text>
      <ScrollView style={styles.nutrientContainer} showsVerticalScrollIndicator={false}>
      {nutrientData ? Object.entries(nutrientData).map(([key, value]) => {
  if (key !== 'productName') {
    return (
      <View key={key} style={styles.nutrientItem}>
        <Text style={styles.nutrientLabel}>{key}:</Text>
        <Text style={styles.nutrientValue}>{value}</Text>
        <View style={styles.separator}></View>
      </View>
    );
  }
}) : (
  <Text style={styles.promptText}>Capture or select an image to get Macros.</Text>
)}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            onPressIn={animateButtonPressIn}
            onPressOut={animateButtonPressOut}
            onPress={takePhoto}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            onPressIn={animateButtonPressIn}
            onPressOut={animateButtonPressOut}
            onPress={pickImage}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Pick from Gallery</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {image ? (
              <Image source={{ uri: image }} style={styles.imagePreview} />
            ) : (
              <Text>No image selected</Text>
            )}
            {isLoading ? (
              <ActivityIndicator size="large" color="#000000" />
            ) : (
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
    backgroundColor: '#FFFFFF',
  },
  productName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 90,
    marginBottom: 10,
    textAlign: 'center'
  },
  nutrientContainer: {
    width: '90%',
    maxHeight: 300, // Limits the height of the ScrollView
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 10,
  },
  nutrientItem: {
    flexDirection: 'column',  // Changed to 'column' to stack label/value and separator
    alignItems: 'stretch',    // Ensures children (including separator) stretch full width
    width: '100%',
  },
  
  nutrientLabel: {
    fontWeight: 'bold',
    flex: 1,  // Removed since flexDirection is now column
    marginBottom: -5,
    fontSize: 17,
  },
  
  nutrientValue: {
    flex: 1,  // Removed since flexDirection is now column
    textAlign: 'right',
    fontSize: 16,
  },
  
  separator: {
    height: 1,
    backgroundColor: '#CCCCCC',
    width: '100%',  // Ensures the separator spans the full width
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
    backgroundColor: '#000',
    borderRadius: 20,
    padding: 12,
    marginHorizontal: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  detailButton: {
    backgroundColor: '#000000',
    borderRadius: 20,
    padding: 12,
    paddingHorizontal: 20,
  },
  modalView: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000000',
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
});

export default MacroScanHome;
