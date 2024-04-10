import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Image } from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native'; // Import useNavigation hook

export default function MacroScanHome() {
  const [hasPermission, setHasPermission] = useState(null);
  const [image, setImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation(); // Initialize navigation

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const pickImage = async () => {
    console.log("permission granted to pick image")
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      console.log("photo from library submitted")
      setImage(result.assets[0].uri);
      setModalVisible(true);
      if (result.assets[0].base64) {
        sendImageToApi(result.assets[0].base64);
        closeModal
      }
    }
  };

  const takePhoto = async () => {
    if (!hasPermission) {
      console.log("permission granted to take photo")
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    }

    if (hasPermission) {
      console.log("photo taken")
      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
        base64: true,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setModalVisible(true);
        if (result.assets[0].base64) {
          sendImageToApi(result.assets[0].base64);
          closeModal
        }
      }
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    console.log("modal closing")
  };

  const sendImageToApi = async (base64Image) => {
    const OPENAI_API_KEY = "OPENAI_API_KEY_REMOVED"; // Replace with your OpenAI API Key
    const prompt = "What's in this image? Be very concise, 5 words."; // Your prompt text
    console.log("attempting to send to api")
    try {
      const payload = {
        model: "gpt-4-turbo",
        messages: [
          {
            "role": "user",
            "content": [
              {"type": "text", "text": prompt},
              {
                "type": "image_url",
                "image_url": {
                  "url": `data:image/jpeg;base64,${base64Image}`
                }
              }
            ],
          }
        ],
        max_tokens: 150
      };
  
      const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        }
      });
  
      console.log(response.data.choices[0].message.content);
      closeModal()
      
      // Handle the response here. For example, you might want to store it in state, display it, or navigate.
    } catch (error) {
      console.error('Error sending image to API:', error);
    }
  };

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007bff',
    borderRadius: 20,
    padding: 10,
    marginBottom: 10,
    elevation: 2,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    backgroundColor: '#aaaaaa',
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginTop: 15,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  imagePreview: {
    width: 300, // Adjust the width as necessary
    height: 300, // Adjust the height as necessary
    borderRadius: 10,
    marginBottom: 15,
  },
});
