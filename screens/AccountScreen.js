import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Ensure FontAwesome is installed
import { Appearance } from 'react-native';


export default function AccountScreen() {
  const [imageUri, setImageUri] = useState(null);
  const [name, setName] = useState('');
  const [loadError, setLoadError] = useState(false);
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);


  useEffect(() => {
    async function loadProfile() {
        try {
            const savedName = await AsyncStorage.getItem('userName');
            const savedImageUri = await AsyncStorage.getItem('userImageUri');
            console.log('Loaded URI:', savedImageUri); // Confirm what URI is loaded
            setName(savedName || '');
            setImageUri(savedImageUri || 'https://via.placeholder.com/150');
        } catch (error) {
            Alert.alert('Error', 'Failed to load user data.');
            console.error(error);
        }
    }
    loadProfile();
}, []);


const resetImageUri = async () => {
  try {
      // Remove the userImageUri key from AsyncStorage
      await AsyncStorage.removeItem('userImageUri');
      // Reset the imageUri state to null or directly to the placeholder URI
      setImageUri('https://via.placeholder.com/150');
      Alert.alert('Reset Done', 'The profile image has been reset.');
  } catch (error) {
      Alert.alert('Error', 'Failed to reset the profile image.');
      console.error(error);
  }
};

const saveData = async (uri) => {
  try {
      await AsyncStorage.setItem('userName', name);
      if (uri) {
          console.log('Attempting to save URI:', uri);
          await AsyncStorage.setItem('userImageUri', uri);
          console.log('URI saved to storage:', uri);
      }
  } catch (error) {
      Alert.alert('Error', 'Failed to save the data.');
      console.error(error);
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

        console.log('Picker Result:', result); // Log the full result object

        if (!result.cancelled && result.assets && result.assets.length > 0) {
          const newImageUri = result.assets[0].uri;
          console.log('Picked URI:', newImageUri);
          setImageUri(newImageUri);
          await saveData(newImageUri); // Pass URI directly to the save function
        } else {
            console.log('Image picker was cancelled or no assets');
        }
    } catch (error) {
        Alert.alert('Error', 'An error occurred while picking the image.');
        console.error(error);
    }
};

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        <TouchableOpacity onPress={pickImage}>
        <Image
          source={{ uri: loadError ? 'https://via.placeholder.com/150' : imageUri }}
          style={styles.image}
          onError={() => {
            console.log('Failed to load image:', imageUri); // Debug: Log on image load failure
            setLoadError(true); // Indicate an error without changing the original URI
          }}
        />
          <View style={styles.iconOverlay}>
          <MaterialCommunityIcons
                name="pencil"
                size={24}
                color={colorScheme === 'dark' ? 'black' : 'white'}  // Dynamic color based on mode
            />
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
      <Text style={styles.title}>
        {name && name.split(" ")[0] ? `Hi, ${name.split(" ")[0]}!` : "Your Account"}
      </Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Enter your full name"
        onBlur={() => {
          // Split the name by spaces to check for multiple parts
          const parts = name.trim().split(/\s+/);
          if (parts.length < 2) {
            // Not a full name, clear the input and show an alert
            Alert.alert("Both Names Please!", "Please enter your full name (first and last name).");
            setName(''); // Clear the text input
          } else {
            // If valid, save the name
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
      <TouchableOpacity style={styles.subscribeButton1}>
        <Text style={styles.subscribeButtonText}>Subscribe</Text>
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
      <TouchableOpacity style={styles.subscribeButton2}>
        <Text style={styles.subscribeButtonText}>Subscribe</Text>
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
      <TouchableOpacity style={styles.subscribeButton3}>
        <Text style={styles.subscribeButtonText}>Purchase</Text>
      </TouchableOpacity>
    </View>
    <View style={styles.rightPart}>

      <Text style={styles.priceText}>$5.99 Once</Text>
    </View>
    <Text style={styles.subscriptionFeature}>• No Ads</Text>
    <Text style={styles.subscriptionFeature}>• Everything on free plan</Text>
    <Text style={styles.subscriptionFeature}>• Can upgrade any time</Text>
  </View>
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
    marginTop: 30,
    alignItems: 'center',
    paddingBottom: 60,
  },
  subscriptionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subscriptionFeature: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  subscribeButtonText: {
    color: 'black',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  purchaseButton: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 100,
    marginTop: 10,
  },
  purchaseButtonText: {
    color: 'black',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  titleWithLogo: {
    flexDirection: 'row', // Align children in a row
    alignItems: 'center', // Align children vertically in the center
    marginBottom: 10, // Space below the row
  },
  logo: {
    width: 40, // Adjust width as needed
    height: 40, // Adjust height as needed
    marginRight: 10, // Space between logo and title
    resizeMode: 'contain', // So the logo does not get stretched
  },
  priceText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4, // Adjust the space between the button and the price text as needed
    textAlign: 'right',
    marginRight: 25,
  },
  subscribeButton1: {
    backgroundColor: '#ffffff',
    padding: 12,
    width: '40%',
    borderRadius: 100,
    marginTop: 0,
    marginLeft: 22,
  },
  subscribeButton2: {
    backgroundColor: '#ffffff',
    padding: 12,
    width: '40%',
    borderRadius: 100,
    marginTop: 0,
    marginLeft: 36,
  },
  subscribeButton3: {
    backgroundColor: '#ffffff',
    padding: 12,
    width: '40%',
    borderRadius: 100,
    marginTop: 0,
    marginLeft: 43,
  },
  subscriptionOption1: {
    backgroundColor: 'black',
    padding: 20,
    borderRadius: 30,
    width: '100%',
    marginBottom: 20,
  },
  subscriptionOption2: {
    backgroundColor: '#232323',
    padding: 20,
    borderRadius: 30,
    width: '100%',
    marginBottom: 20,
  },
  subscriptionOption3: {
    backgroundColor: '#424242',
    padding: 20,
    borderRadius: 30,
    width: '100%',
    marginBottom: 20,
  },
});