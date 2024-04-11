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
        <View style={styles.stepContainer}>
          <BoxComponent />
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
    alignContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
    marginTop: -180, // Adjust this value as needed
    marginBottom: 20, // Adjust this value as needed
    alignContent: 'center',
    textAlign: 'center', // Center the title horizontally
  },
  description: {
    fontSize: 17,
    color: '#333',
    marginBottom: 40,
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 4,
    alignContent: 'center',
    fontStyle: 'italic'
    
  },
  box: {
    width: 350,
    height: 7,
    backgroundColor: '#bababa',
    zIndex: 1000,
    borderColor: '#bababa',
    borderWidth: 1,
    borderRadius: 5,
    marginTop: 0,
    marginBottom: 30,
    alignContent: 'center',
  },
  stepContainer: {
    alignContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    alignContent: 'center',
    alignItems: 'center',
    color: '#333',
  },
  stepDescription: {
    fontSize: 16,
    alignContent: 'center',
    alignItems: 'center',
    color: '#666',
    marginTop: 5,
    marginBottom: 15,
  },
  image: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    resizeMode: 'cover',
  },
  button: {
    backgroundColor: '#000000',
    alignContent: 'center',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    alignContent: 'center',
    alignItems: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Feel free to adjust the colors, fonts, and other styling as needed
});