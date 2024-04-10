import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Image } from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

export default function MacroScanHome() {
  const [hasPermission, setHasPermission] = useState(null);
  const [image, setImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    (async () => {
      console.log('Requesting camera permissions...');
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      console.log(`Camera permission status: ${status}`);
    })();
  }, []);

  const pickImage = async () => {
    console.log('Opening image picker...');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(`Image picker result: ${JSON.stringify(result)}`);
    if (!result.cancelled) {
      setImage(result.uri);
      setModalVisible(true);
    }
  };

  const takePhoto = async () => {
    console.log('Taking photo...');
    if (!hasPermission) {
      console.log('No camera permission. Requesting permission...');
      await requestCameraPermission();
    }

    if (hasPermission) {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
      });

      console.log(`Photo take result: ${JSON.stringify(result)}`);
      if (!result.cancelled) {
        setImage(result.uri);
        setModalVisible(true);
      }
    } else {
      console.log('Camera permission not granted.');
    }
  };

  const requestCameraPermission = async () => {
    console.log('Requesting camera permission inside takePhoto...');
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    console.log(`Camera permission status (inside takePhoto): ${status}`);
  };

  const closeModal = () => {
    console.log('Closing modal...');
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={takePhoto}>
        <Text style={styles.buttonText}>Take Photo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>Pick an Image from Gallery</Text>
      </TouchableOpacity>

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
