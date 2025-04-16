import React, { useState } from 'react';
import { View, Text, Button, Image, StyleSheet, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const resizeImage = async (uri) => {
  let compressQuality = 1;
  const actions = [{ resize: { width: 1024 } }];
  let result;
  while (true) {
    result = await manipulateAsync(uri, actions, { compress: compressQuality, format: SaveFormat.JPEG, base64: true });
    const base64Str = result.base64;
    const sizeBytes = Math.ceil(base64Str.length * 3 / 4);
    if (sizeBytes <= 5000000 || compressQuality <= 0.1) {
      break;
    }
    compressQuality = compressQuality - 0.1;
  }
  return result.base64;
};

const imageToBase64 = async (uri) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error);
    throw error;
  }
};

const ImagePickerTestScreen = () => {
  const [imageUri, setImageUri] = useState(null);
  const [fileSize, setFileSize] = useState(null);
  const [log, setLog] = useState('');
  const [resizedBase64, setResizedBase64] = useState(null);
  const [originalBase64, setOriginalBase64] = useState(null);

  const pickImage = async () => {
    setLog('');
    setResizedBase64(null);
    setOriginalBase64(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: false,
        quality: 1,
        base64: false,
      });
      console.log('Picker result:', result);
      setLog('Picker result: ' + JSON.stringify(result, null, 2));
      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        try {
          const info = await FileSystem.getInfoAsync(uri);
          setFileSize(info.size);
          console.log('File info:', info);
        } catch (fsErr) {
          setFileSize('Error: ' + fsErr.message);
          console.error('File info error:', fsErr);
        }
        // Simulate resizeImage (FoodScanScreen)
        let resizeLog = '';
        try {
          const base64Resized = await resizeImage(uri);
          setResizedBase64(base64Resized);
          resizeLog += `\nResized base64 length: ${base64Resized.length}`;
          console.log('Resized base64 length:', base64Resized.length);
        } catch (resizeErr) {
          resizeLog += `\nResize error: ${resizeErr.message}`;
          console.error('Resize error:', resizeErr);
        }
        // Simulate imageToBase64 (FoodScanScreen)
        try {
          const base64Original = await imageToBase64(uri);
          setOriginalBase64(base64Original);
          resizeLog += `\nOriginal base64 length: ${base64Original.length}`;
          console.log('Original base64 length:', base64Original.length);
        } catch (b64Err) {
          resizeLog += `\nBase64 error: ${b64Err.message}`;
          console.error('Base64 error:', b64Err);
        }
        setLog(l => l + resizeLog);
      } else {
        setImageUri(null);
        setFileSize(null);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
      setLog('Error: ' + error.message);
      console.error('Picker error:', error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Image Picker Test (FoodScanScreen Simulation)</Text>
      <Button title="Pick Image" onPress={pickImage} />
      {imageUri && (
        <>
          <Text style={styles.info}>URI: {imageUri}</Text>
          <Text style={styles.info}>File Size: {fileSize ? fileSize + ' bytes' : 'Unknown'}</Text>
          <Text style={styles.info}>Resized base64 length: {resizedBase64 ? resizedBase64.length : 'N/A'}</Text>
          <Text style={styles.info}>Original base64 length: {originalBase64 ? originalBase64.length : 'N/A'}</Text>
          {resizedBase64 && (
            <Image source={{ uri: 'data:image/jpeg;base64,' + resizedBase64 }} style={styles.image} resizeMode="contain" />
          )}
        </>
      )}
      <Text style={styles.logTitle}>Log:</Text>
      <Text style={styles.log}>{log}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  image: {
    width: 250,
    height: 250,
    marginVertical: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  info: {
    fontSize: 14,
    marginBottom: 5,
    wordBreak: 'break-all',
  },
  logTitle: {
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 5,
    fontSize: 16,
  },
  log: {
    fontSize: 12,
    color: '#333',
    backgroundColor: '#f4f4f4',
    padding: 10,
    borderRadius: 6,
    width: '100%',
  },
});

export default ImagePickerTestScreen; 