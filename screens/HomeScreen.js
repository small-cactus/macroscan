import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Image } from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native'; // Import useNavigation hook
import Anthropic from "@anthropic-ai/sdk";
import * as ImageManipulator from 'expo-image-manipulator';

export default function MacroScanHome() {
  const [hasPermission, setHasPermission] = useState(null);
  const [image, setImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation(); // Initialize navigation
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
      [{ resize: { width: 800 } }], // Resize operation
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return result.base64; // Return the base64 string directly
  };
  
  const pickImage = async () => {
    console.log("permission granted to pick image");
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1, // Consider setting a lower quality here if the images are still too large
    });
  
    if (!result.canceled && result.assets) {
      console.log("photo from library submitted");
      const base64Data = await resizeImage(result.assets[0].uri);
      setImage(result.assets[0].uri); // Display the original image in your UI
      setModalVisible(true);
      sendImageToApi(base64Data); // Now sending the correct base64 string
    }
  };
  
  const takePhoto = async () => {
    if (!hasPermission) {
      console.log("permission granted to take photo");
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    }
  
    if (hasPermission) {
      console.log("photo taken");
      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1, // Consider setting a lower quality here as well
      });
  
      if (!result.canceled && result.assets) {
        console.log("photo from library submitted");
        const base64Data = await resizeImage(result.assets[0].uri);
        setImage(result.assets[0].uri); // Display the original image in your UI
        setModalVisible(true);
        sendImageToApi(base64Data); // Now sending the correct base64 string
      }
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    console.log("modal closing")
  };


  async function sendImageToApi(base64Image) {
    try {
      const anthropic = new Anthropic({
        apiKey: "ANTHROPIC_API_KEY_REMOVED", // Ensure this is securely managed
      });
  
      const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        temperature: 0,
        system: "You will be provided an image, If the image contains food, identify each food item and list all of its macronutrients in a structured format. Extract and include any relevant details from the image to support your analysis. For example, if you see a plate of spaghetti, categorize it as 'Carbohydrates' and estimate its macronutrient content. If the image does not feature food, simply respond with 'The image does not contain food. Try again.' Remember to always provide detailed estimates for any food items, avoiding conversational responses.",
        messages: [{
          "role": "user",
          "content": [{
            "type": "text",
            "text": "If the image shows food, write down the macronutrient data for each item, being extremely specific with the amounts. Use any relevant details from the image to make your analysis as precise as possible. For instance, if the image is of a chicken salad, list it with categories such as 'Protein' for chicken, including specific estimated amounts. If the image does not show food, simply respond with 'The image does not contain food. Try again.' Do not add any other comments."
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
      <TouchableOpacity style={styles.button} onPress={takePhoto}>
        <Text style={styles.buttonText}>Take Photo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>Pick an Image from Gallery</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Details')}>
        <Text style={styles.buttonText}>Go to Details</Text>
      </TouchableOpacity>

        {/* Display the extracted text here */}
  {extractedText ? (
    <View style={styles.extractedTextView}>
      <Text style={styles.extractedText}>{extractedText}</Text>
    </View>
  ) : null}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal} // This calls closeModal when attempting to close the modal on Android by back button
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
}

// Defining constants for colors and spacing can help in maintaining consistency and ease of adjustments.
const colors = {
  white: '#FFFFFF',
  primaryBlue: '#007BFF',
  modalBackground: 'rgba(0, 0, 0, 0.5)',
  lightGrey: '#F0F0F0',
  darkGrey: '#AAAAAA',
  black: '#000000',
};

const spacing = {
  small: 10,
  medium: 20,
  large: 35,
  xLarge: 300, // For image dimensions or larger elements
};

const borderRadius = {
  small: 5,
  default: 20,
};

const shadow = {
  default: {
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  button: {
    backgroundColor: colors.primaryBlue,
    borderRadius: borderRadius.default,
    padding: spacing.small,
    marginBottom: spacing.small,
    elevation: 2,
  },
  buttonText: {
    color: colors.white,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.modalBackground,
  },
  modalView: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.default,
    padding: spacing.large,
    alignItems: 'center',
    ...shadow.default,
  },
  closeButton: {
    backgroundColor: colors.darkGrey,
    borderRadius: borderRadius.default,
    padding: spacing.small,
    elevation: 2,
    marginTop: spacing.medium,
  },
  closeButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  imagePreview: {
    width: spacing.xLarge, // Adjust the width as necessary
    height: spacing.xLarge, // Adjust the height as necessary
    borderRadius: borderRadius.small,
    marginBottom: spacing.medium,
  },
  extractedTextView: {
    margin: spacing.medium,
    padding: spacing.small,
    backgroundColor: colors.lightGrey, // Light grey background
    borderRadius: borderRadius.small,
  },
  extractedText: {
    color: colors.black, // Black text color
    textAlign: 'center',
  },
});