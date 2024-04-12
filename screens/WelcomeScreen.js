import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export default function SignInScreen({ navigation }) {

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Text style={styles.title}>Welcome to MacroScan</Text>
        <Image
  source={require('../assets/icon.png')} // Adjust the path accordingly
  style={styles.icon} // Define a style for your icon
/>
<View style={styles.container}></View>
        <View style={styles.container}>
        </View>
        <TouchableOpacity style={styles.SignUpButton} onPress={() => navigation.navigate('SignUp')}>
        <Text style={styles.SignUpText}>Sign Up</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.SignInButton} onPress={() => navigation.navigate('SignIn')}>
        <Text style={styles.SignInText}>Sign In</Text>
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: -330,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginTop: 50, // Adjust as needed to position the title at the top
    marginBottom: 40,
  },
  input: {
    width: '80%', // Adjust based on preference
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20, // Increased borderRadius for more pronounced rounded corners
    borderWidth: 1,
    borderColor: 'gray',
    color: '#000', // Text color
  },
  button: {
    width: '80%', // Match the input fields width
    backgroundColor: '#000000',
    padding: 10,
    borderRadius: 20, // Maintain rounded corners for consistency
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  icon: {
    width: 150, // Adjust the width as needed
    height: 150, // Adjust the height as needed
    alignSelf: 'center', // Center the icon horizontally
    marginBottom: -380, // Space between icon and the next element
    marginTop: -10
  },
  SignUpButton:{
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 5,
    width: '77%',
    height: '10%',
    justifyContent: 'center', // Center the content vertically
    alignItems: 'center',
    backgroundColor: "#000000",
    borderRadius: 20,

  },
  SignUpText: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 35,
    color: "#ffffff",
  },
  SignInButton: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 210,
    borderWidth: 5,
    width: '77%',
    height: '10%',
    justifyContent: 'center', // Center the content vertically
    alignItems: 'center',
    backgroundColor: "#000000",
    borderRadius: 20,
  },
  SignInText: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 35,
    color: "#ffffff"
  },
});
