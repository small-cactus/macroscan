import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Modal, Alert, useColorScheme, Animated
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Anthropic } from '@anthropic-ai/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';

const FoodScanScreen = () => {
  const [image, setImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [foodData, setFoodData] = useState(null);
  const colorScheme = useColorScheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
  
    if (!result.canceled) {
      const manipulatedImage = await manipulateAsync(
        result.assets[0].uri,
        [],
        { format: SaveFormat.JPEG, compress: 0.8 }
      );
      console.log('Image URI:', manipulatedImage.uri); // Add this line
      setImage(manipulatedImage.uri);
      await sendImageToApi(manipulatedImage.uri);
    }
  };

  const cropImage = async (uri, position) => {
    try {
      const dimensions = await new Promise((resolve, reject) => {
        Image.getSize(uri, 
          (width, height) => resolve({width, height}),
          (error) => reject(error)
        );
      });
  
      const width = dimensions.width;
      const height = dimensions.height;
    
    switch (position) {
      case 'top_left':
        originX = 0;
        originY = 0;
        cropWidth = width / 2;
        cropHeight = height / 2;
        break;
      case 'top_middle':
        originX = width / 4;
        originY = 0;
        cropWidth = width / 2;
        cropHeight = height / 2;
        break;
      case 'top_right':
        originX = width / 2;
        originY = 0;
        cropWidth = width / 2;
        cropHeight = height / 2;
        break;
      case 'middle_left':
        originX = 0;
        originY = height / 4;
        cropWidth = width / 2;
        cropHeight = height / 2;
        break;
      case 'center':
        originX = width / 4;
        originY = height / 4;
        cropWidth = width / 2;
        cropHeight = height / 2;
        break;
      case 'middle_right':
        originX = width / 2;
        originY = height / 4;
        cropWidth = width / 2;
        cropHeight = height / 2;
        break;
      case 'bottom_left':
        originX = 0;
        originY = height / 2;
        cropWidth = width / 2;
        cropHeight = height / 2;
        break;
      case 'bottom_middle':
        originX = width / 4;
        originY = height / 2;
        cropWidth = width / 2;
        cropHeight = height / 2;
        break;
      case 'bottom_right':
        originX = width / 2;
        originY = height / 2;
        cropWidth = width / 2;
        cropHeight = height / 2;
        break;
      default:
        return uri;
    }
  
    const croppedImage = await manipulateAsync(
        uri,
        [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
        { format: SaveFormat.JPEG }
      );
  
      return croppedImage.uri;
    } catch (error) {
      console.error('Error cropping image:', error);
      return uri; // Return original image if cropping fails
    }
  };

  const sendImageToApi = async (imageUri) => {
    setIsLoading(true);
    try {
      const apiKey = await AsyncStorage.getItem('@apikey');
      if (!apiKey) {
        Alert.alert('Error', 'API key not found');
        setIsLoading(false);
        return;
      }

      const anthropic = new Anthropic({ apiKey });

      const base64Image = await imageToBase64(imageUri);

      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4096,
        temperature: 0.7,
        system: `If the image shows food, fruits, vegetables, or a beverage, list the following macronutrient data for each item present in the image, along with additional information, formatted in JSON. Be as specific as possible with the name of each item. Accuracy in all values, including names, nutrients, and additional information, is the highest priority. Non-nutrient values should be provided above the nutrient values in the JSON.
{
  "items": [
    {
      "name": "specific name of food (e.g., Wagyu steak, Granny Smith apple, Caesar salad)",
      "serving_size": "size (e.g., 200g, 1 slice, 1 cup)",
      "fancy_factor": value,
      "healthy_rating": value,
      "estimated_cost": "cost",
      "guessed_time_to_make": "time (e.g., 30 minutes, 10 minutes, 1 hour)",
      "position": "top_left",  // Values can be top_left, top_middle, top_right, middle_left, center, middle_right, bottom_left, bottom_middle, bottom_right. Position is refering to the location of the food in the image, if it's on the left middle, say left_middle
      "carbohydrates_g": value,
      "proteins_g": value,
      "fats_g": value,
      "calories_cal": value,
      "dietary_fiber_g": value,
      "sugars_g": value,
      "saturated_fats_g": value,
      "sodium_mg": value
    }
  ],
  "total": {
    "name": "collective name of meal (e.g., Steak dinner, Fast food combo)",
    "serving_size": "total size (e.g., 1 plate, 2 burgers)",
    "fancy_factor": total_value,
    "healthy_rating": total_value,
    "estimated_cost": "total cost",
    "guessed_time_to_make": "total time (e.g., 45 minutes, 20 minutes, 1 hour)",
    "carbohydrates_g": total_value,
    "proteins_g": total_value,
    "fats_g": total_value,
    "calories_cal": total_value,
    "dietary_fiber_g": total_value,
    "sugars_g": total_value,
    "saturated_fats_g": total_value,
    "sodium_mg": total_value
  }
}

        Ensure nutrient data is based on the amount shown. Use specific amounts and relevant details from the image. Avoid data not requested, like per serving info or micronutrients. If no food or beverage is shown, respond with:

        {
          "message": "No food found. Try again."
        }

        Be as specific as physically possible when naming the food items. If the image suggests a specific type or brand, include that in the name. For example, if it is evident that a steak is Wagyu, list it as "Wagyu steak." Accuracy in naming, nutrient values, and additional details is the highest priority.`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and provide nutritional information as specified.",
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: base64Image,
                },
              },
            ],
          },
        ],
      });

      const parsedData = JSON.parse(response.content[0].text);
      setFoodData(parsedData);
      fadeIn();
    } catch (error) {
      console.error("Error sending message to Anthropic API:", error);
      Alert.alert("Error", "Failed to analyze the image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const imageToBase64 = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
  };

  const ProgressBar = ({ value, max, color }) => (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBar, { width: `${(value / max) * 100}%`, backgroundColor: color }]} />
    </View>
  );

  const FoodInfoCard = ({ item }) => {
    const [croppedImage, setCroppedImage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
  
    useEffect(() => {
      const cropAndSetImage = async () => {
        try {
          setIsLoading(true);
          const cropped = await cropImage(image, item.position);
          setCroppedImage(cropped);
        } catch (error) {
          console.error('Error setting cropped image:', error);
          setCroppedImage(image); // Use original image if cropping fails
        } finally {
          setIsLoading(false);
        }
      };
      cropAndSetImage();
    }, [item.position]);
  
    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#3498DB" />
          ) : croppedImage ? (
            <Image 
              source={{ uri: croppedImage }} 
              style={styles.cardImage} 
              onError={(e) => console.error('Error loading image:', e.nativeEvent.error)}
            />
          ) : (
            <View style={[styles.cardImage, {backgroundColor: '#ccc'}]} />
          )}
          <View style={styles.titleContainer}>
            <Text style={[styles.cardTitle, { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }]}>{item.name}</Text>
          </View>
          </View>
      <View style={styles.cardInfoContainer}>
        <InfoItem icon="star" label="Fancy Factor" value={`${item.fancy_factor}/100`} />
        <InfoItem icon="dollar-sign" label="Est. Cost" value={item.estimated_cost} />
        <InfoItem icon="heartbeat" label="Health" value={`${item.healthy_rating}/100`} />
        <InfoItem icon="clock" label="Time to Make" value={item.guessed_time_to_make} />
      </View>
      <View style={styles.nutrientContainer}>
        <Text style={[styles.nutrientTitle, { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }]}>Nutrient Information</Text>
        <View style={styles.nutrientGrid}>
          {Object.entries(item).map(([key, value]) => {
            if (['carbohydrates_g', 'proteins_g', 'fats_g', 'calories_cal', 'dietary_fiber_g', 'sugars_g', 'saturated_fats_g', 'sodium_mg'].includes(key)) {
              return (
                <View key={key} style={styles.nutrientItem}>
                  <Text style={[styles.nutrientLabel, { color: colorScheme === 'dark' ? '#d1d1d6' : '#3a3a3c' }]}>
                    {key.replace(/_/g, ' ').replace('_g', '').replace('_cal', '').replace('_mg', '')}
                  </Text>
                  <Text style={[styles.nutrientValue, { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }]}>
                    {value}{key.includes('_g') ? 'g' : key.includes('_cal') ? 'cal' : key.includes('_mg') ? 'mg' : ''}
                  </Text>
                </View>
              );
            }
          })}
        </View>
      </View>
      </View>
 )};

  const InfoItem = ({ icon, label, value }) => (
    <View style={styles.infoItem}>
      <FontAwesome5 name={icon} size={16} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />
      <Text style={[styles.infoLabel, { color: colorScheme === 'dark' ? '#d1d1d6' : '#3a3a3c' }]}>{label}: </Text>
      <Text style={[styles.infoValue, { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }]}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colorScheme === 'dark' ? '#121212' : '#F0F4F8' }]}>
      <Text style={[styles.title, { color: colorScheme === 'dark' ? '#E0E0E0' : '#2C3E50' }]}>
        {foodData && foodData.total ? foodData.total.name : "Food Scanner"}
      </Text>
      
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>Pick an image from gallery</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        {foodData && foodData.items && foodData.items.map((item, index) => (
          <FoodInfoCard key={index} item={item} />
        ))}

        {foodData && foodData.total && (
          <View style={styles.totalInfoContainer}>
            <Text style={[styles.sectionTitle, { color: colorScheme === 'dark' ? '#E0E0E0' : '#2C3E50' }]}>
              Total Meal Information
            </Text>
            <InfoItem icon="dollar-sign" label="Total Est. Cost" value={foodData.total.estimated_cost} />
            <InfoItem icon="clock" label="Total Time to Make" value={foodData.total.guessed_time_to_make} />
            <Text style={[styles.infoText, { color: colorScheme === 'dark' ? '#E0E0E0' : '#2C3E50' }]}>
              <FontAwesome5 name="star" size={16} color={colorScheme === 'dark' ? '#FFD700' : '#F39C12'} /> Total Fancy Factor:
            </Text>
            <ProgressBar value={foodData.total.fancy_factor} max={100} color="#F39C12" />
            <Text style={[styles.infoText, { color: colorScheme === 'dark' ? '#E0E0E0' : '#2C3E50' }]}>
              <FontAwesome5 name="heartbeat" size={16} color={colorScheme === 'dark' ? '#4CAF50' : '#2ECC71'} /> Total Health Rating:
            </Text>
            <ProgressBar value={foodData.total.healthy_rating} max={100} color="#2ECC71" />
          </View>
        )}
      </Animated.View>

      <Modal
        transparent={true}
        animationType="fade"
        visible={isLoading}
      >
        <View style={styles.modalBackground}>
          <View style={styles.activityIndicatorWrapper}>
            <ActivityIndicator size="large" color="#3498DB" />
            <Text style={styles.loadingText}>Analyzing image...</Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    letterSpacing: 0.5,
  },
  button: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 30,
    alignSelf: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    borderRadius: 15,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  titleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  cardInfoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#2a2a2b',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '48%',
  },
  infoLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#7F8C8D',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  nutrientContainer: {
    padding: 16,
    backgroundColor: '#2a2a2b',
  },
  nutrientTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2C3E50',
  },
  nutrientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  nutrientItem: {
    width: '48%',
    marginBottom: 12,
  },
  nutrientLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  nutrientValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  totalInfoContainer: {
    marginTop: 24,
    backgroundColor: '#2a2a2b',
    borderRadius: 24,
    padding: 20,
    marginBottom: 100,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#4a4a4b',
    borderRadius: 6,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  modalBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  activityIndicatorWrapper: {
    backgroundColor: '2a2a2b',
    borderRadius: 15,
    padding: 24,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#2C3E50',
  },
});

export default FoodScanScreen;