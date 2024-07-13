import React, { useState, useEffect } from 'react';
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
import { Appearance } from 'react-native';


export default function SignInScreen({ navigation }) {
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const styles = getDynamicStyles(colorScheme);
  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  return (
      <View style={styles.View}>
        <Text style={styles.title}>Welcome to MacroScan</Text>
        <Image
  source={colorScheme === 'dark' ? require('../assets/icon-light.png') : require('../assets/icon.png')}
  style={styles.icon} // Define a style for your icon icon
/>
<View style={styles.container}></View>
        <View style={styles.container}>
        </View>
        <TouchableOpacity style={styles.SignUpButton} onPress={async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  navigation.navigate('SignUp');
}}>
  <Text style={styles.SignUpText}>Sign Up</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.SignInButton} onPress={async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  navigation.navigate('SignIn');
}}>
  <Text style={styles.SignInText}>Already Have an Account?</Text>
</TouchableOpacity>
      </View>
  );
}

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  View: {
    flexGrow: 1,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: -330,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginTop: 100, // Adjust as needed to position the title at the top
    marginBottom: 40,
    color: colorScheme === 'dark' ? '#fff' : '#333',
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
    zIndex: 1,
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
    color: '#000',
    borderColor: colorScheme === 'dark' ? '#5f5f5f' : '#ddd',
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#fff',
  }, // Text color
  button: {
    width: '80%', // Match the input fields width
    backgroundColor: '#000000',
    padding: 10,
    borderRadius: 20, // Maintain rounded corners for consistency
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
  },
  buttonText: {
    color: '#FFFFFF',
    color: colorScheme === 'dark' ? '#e9e9e9' : '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  icon: {
    width: 150, // Adjust the width as needed
    height: 150, // Adjust the height as needed
    alignSelf: 'center', // Center the icon horizontally
    marginBottom: -380, // Space between icon and the next element
    marginTop: -10,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
    zIndex: 1,
  },
  SignUpButton:{
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 0,
    width: '40%',
    height: '5%',
    justifyContent: 'center', // Center the content vertically
    alignItems: 'center',
    backgroundColor: "#000000",
    borderRadius: 200,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',

  },
  SignUpText: {
    textAlign: 'center',
    color: colorScheme === 'dark' ? '#e9e9e9' : '#FFF',
    fontWeight: 'bold',
    fontSize: 20,
    color: "#ffffff",
  },
  SignInButton: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 210,
    width: '100%',
    height: '5%',
    justifyContent: 'center', // Center the content vertically
    alignItems: 'center',
  },
  SignInText: {
    textAlign: 'center',
    fontSize: 15,
    color: colorScheme === 'dark' ? '#fff' : '#000',
    textDecorationLine: 'underline'
  },
});
