import React from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';

export default function DetailsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: 'image-url' }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title}>YakRack Details</Text>
        <Text style={styles.description}>
          Welcome to MacroScan, the premier kayak renting app that makes exploring the waterways both easy and accessible. Whether you're planning a serene solo paddle or a group adventure, here's how you can get started:
        </Text>
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 1: Choose Your Kayak</Text>
          <Text style={styles.stepDescription}>
            Browse our extensive collection of kayaks suitable for all skill levels. Select your preferred kayak based on location, availability, and features.
          </Text>
        </View>
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 2: Reserve & Pay</Text>
          <Text style={styles.stepDescription}>
            Once you've selected your kayak, choose your rental duration and proceed to checkout. Payment is secure and swift.
          </Text>
        </View>
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 3: Pick Up & Paddle</Text>
          <Text style={styles.stepDescription}>
            Head to the designated pick-up location with your confirmation details. All that's left is to enjoy your time on the water!
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
