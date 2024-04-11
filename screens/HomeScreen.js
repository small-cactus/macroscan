import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Image } from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import Anthropic from "@anthropic-ai/sdk";
import * as ImageManipulator from 'expo-image-manipulator';

const MacroScanHome = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [image, setImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation();
  const [extractedText, setExtractedText] = useState("");

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
    try {
      const anthropic = new Anthropic({
        apiKey: "ANTHROPIC_API_KEY_REMOVED", // Ensure this is securely managed
      });
  
      const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        temperature: 0,
        system: `If the image depicts food, list the macronutrient data for each item, focusing on the following, SAY NOTHING but the following macronutrient data:
        Name of food(s)
        1. Carbohydrates (g)
        2. Proteins (g)
        3. Fats (g)
        4. Total Calories (kcal)
        5. Dietary Fiber (g)
        6. Sugars (g)
        7. Saturated Fats (g)
        8. Trans Fats (g)
      Be specific with amounts, using all relevant details from the image for precision. For instance, if it's a chicken salad, break it down into 'Proteins' for chicken, with estimated amounts for each listed nutrient.
      Avoid providing data not requested, like per serving info or micronutrients. If no food is shown, respond with 'The image does not contain food. Try again.' without further comments.`,        messages: [{
          "role": "user",
          "content": [{
            "type": "text",
            "text": `If the image shows food, accurately detail the macronutrient data for each item, emphasizing:
- Name of food(s) EXTREMELY IMPORTANT!!!
- Carbohydrates (g)
- Proteins (g)
- Fats (g)
- Total Calories (kcal)
- Dietary Fiber (g)
- Sugars (g)
- Saturated Fats (g)
- Trans Fats (g)
Be extremely specific, leveraging image details for precision. E.g., for a bowl of oatmeal with nuts, list 'Carbohydrates' for oats, 'Proteins' for nuts, etc., with specific amounts for the macronutrients above.
Do not collect or provide nutrient data not requested, such as per serving details. If the image doesn't feature food, simply state 'The image does not contain food. Try again.' But make sure with 100% certainity that it is not food before saying this.`
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
  
      const textResponse = msg.content[0].text;
      console.log(textResponse); // Log the text content to the console
      setExtractedText(textResponse); // Update the state to display in the UI
      closeModal(); // Close the modal after processing the response
    } catch (error) {
      console.error("Error sending message to Anthropic API:", error);
    }
  }

  return (
    <View style={styles.container}>
      {/* Conditional rendering based on whether there's extracted text */}
      {extractedText ? (
        <View style={styles.extractedTextView}>
          <Text style={styles.extractedText}>{extractedText}</Text>
        </View>
      ) : (
        <Text style={styles.promptText}>Capture or select an image to extract text.</Text>
      )}

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Pick from Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.detailButton} onPress={() => navigation.navigate('Details')}>
          <Text style={styles.detailButtonText}>Details</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for image preview */}
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
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
  
const colors = {
  white: '#FFFFFF',
  lightGray: '#AAAAAA',
  blue: '#007BFF',
  black: '#000000',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
  shadow: '#000',
  backgroundGray: '#F0F0F0',
};

const fontSizes = {
  regular: 16,
  small: 14,
  large: 18,
};

  const styles = StyleSheet.create({
    // Container styles
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.modalOverlay,
  },

  // Text styles
  promptText: {
    color: colors.lightGray,
    fontSize: fontSizes.regular,
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  buttonText: {
    color: colors.white,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  detailButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fontSizes.small,
  },
  extractedText: {
    color: colors.black,
    fontSize: fontSizes.large,
    textAlign: 'center',
    fontWeight: '500',
  },
  closeButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Button styles
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  button: {
    backgroundColor: colors.blue,
    borderRadius: 20,
    padding: 10,
    marginHorizontal: 10,
  },
  detailButton: {
    backgroundColor: colors.lightGray,
    borderRadius: 10,
    padding: 10,
    paddingHorizontal: 20,
  },
  closeButton: {
    backgroundColor: colors.lightGray,
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginTop: 15,
  },

  // Other component styles
  extractedTextView: {
    margin: 20,
    padding: 20,
    backgroundColor: colors.backgroundGray,
    borderRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
    width: '80%',
  },
  modalView: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imagePreview: {
    width: 300,
    height: 300,
    borderRadius: 10,
    marginBottom: 15,
  },
  });

  export default MacroScanHome;

