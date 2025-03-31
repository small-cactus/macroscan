import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Appearance } from 'react-native';

const { width, height } = Dimensions.get('window');

const isIphoneSE = () => {
  const smallIphoneDimensions = [
    { width: 320, height: 568 }, // iPhone SE (1st generation), iPhone 5, 5S, 5C
    { width: 375, height: 667 }, // iPhone 6, 6S, 7, 8, SE (2nd generation)
    { width: 414, height: 736 }, // iPhone 8 Plus
    { width: 360, height: 640 }, // iPhone SE (2020)
    { width: 375, height: 812 }, // iPhone 12 Mini, iPhone 13 Mini
    { width: 360, height: 780 }, // iPhone 12 Mini, iPhone 13 Mini
  ];

  return (
    Platform.OS === 'ios' &&
    smallIphoneDimensions.some(
      dim => (width === dim.width && height === dim.height) || (width === dim.height && height === dim.width)
    )
  );
};

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
        <Text style={styles.description}>
            The easiest way to track macros
          </Text>
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
    padding: 0,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
  },
  title: {
    fontSize: isIphoneSE() ? 28 : 30,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginTop: 100, // Adjust as needed to position the title at the top
    marginBottom: 20,
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
    height: isIphoneSE() ? '6.5%' : '5%',
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
  description: {
    fontSize: 20,
    fontWeight: '400',
    color: colorScheme === 'dark' ? '#EEE' : '#666',
    textAlign: 'center',
    marginBottom: '20%',
  },
});
