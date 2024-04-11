import React from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';

export default function DetailsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: 'image-url' }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title}>MacroScan Details</Text>
        <Text style={styles.description}>
          Welcome to MacroScan! MacroScan utilizes innovative AI Image Recognition technology to identify and calculate important nutrition facts and macronutrients. See how you can begin below.
        </Text>
        <BoxComponent />
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 1: Take an Photo</Text>
          <Text style={styles.stepDescription}>
          Take a photo using the in-app camera or select an image from your camera roll.
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

const BoxComponent = () => {
  return (
    <View style={styles.box}></View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignContent: 'center',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
    marginTop: -180, // Adjust this value as needed
    marginBottom: 20, // Adjust this value as needed
    textAlign: 'center', // Center the title horizontally
  },
  description: {
    fontSize: 17,
    color: '#333',
    marginBottom: 40,
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 4,
    fontStyle: 'italic'
  },
  box: {
    width: 350,
    height: 12,
    backgroundColor: '#5E5E5E',
    zIndex: 1000,
    borderColor: '#5E5E5E',
    borderWidth: 1,
    borderRadius: 5,
    marginTop: -10,
    marginBottom: 30,
    alignContent: 'center',
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
    marginBottom: 15,
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