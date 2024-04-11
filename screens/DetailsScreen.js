import React from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';

export default function DetailsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: 'image-url' }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title}>MacroScan Details</Text>
        <Text style={styles.description}>
        Welcome to MacroScan! MacroScan utilizes innovative AI Image Recognition technology to identify and calculate important nutrition facts and macronutrients. See how you can begin below. :
        </Text>
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 1: Take an Photo</Text>
          <Text style={styles.stepDescription}>
          Take a photo using the in-app camera or select a photo from your camera roll.
          </Text>
        </View>
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 2: Select Continue</Text>
          <Text style={styles.stepDescription}>
          Click on the "Continue" button and wait for the AI to generate nutrient facts about your meal.
          </Text>
        </View>
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 3: Read and Enjoy!</Text>
          <Text style={styles.stepDescription}>
          View the macronutrients and nutritional facts, and enjoy your meal.
          </Text>
        </View>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  stepContainer: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Feel free to adjust the colors, fonts, and other styling as needed
});
