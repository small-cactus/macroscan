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
import * as AppleAuthentication from 'expo-apple-authentication';
import { FontAwesome } from '@expo/vector-icons'; // Ensure FontAwesome is installed
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';


export default function SignUpScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);
  const BoxComponent = () => {

    return (
      <View style={styles.seperatorBox}></View>
    );
  };


  const storeData = async (value) => {
    try {
      console.log("Storing data:", value); // Add logging to see what is being stored
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem('@user', jsonValue);
    } catch (e) {
      console.error("Failed to store data:", e);
    }
  };

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (username === 'Macro' && password === 'Scan') {
      navigation.navigate('HomeTabs', { screen: 'Home' });
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeTabs' }],
      });
    } else {
      Alert.alert('Invalid Credentials', 'The username or password is incorrect.');
    }
  };

  const signInWithApple = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      console.log(credential);
      await storeData(credential);
      navigation.navigate('HomeTabs', { screen: 'Home' });
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeTabs' }],
      });
    } catch (e) {
      if (e.code === 'ERR_CANCELED') {
        console.log('Sign in with Apple was cancelled!');
      } else {
        console.error(e);
      }
    }
  };

  return (
    <View style={styles.view}>
        <Text style={styles.title}>Sign Up for MacroScan</Text>
        <Image
          source={colorScheme === 'dark' ? require('../assets/icon-light.png') : require('../assets/icon.png')}
          style={styles.icon} // Define a style for your icon
        />
        <View style={styles.container}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#A9A9A9"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#A9A9A9"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#A9A9A9"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
          <BoxComponent />
          <TouchableOpacity style={styles.AppleContinueButton} onPress={signInWithApple}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={styles.AppleContinueText}>
                Continue with Apple
              </Text>
              <FontAwesome name="apple" size={20} color="#ffffff" style={{ marginLeft: 10 }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.GoogleContinueButton} onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('HomeTabs', {
              screen: 'Home',
            });
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={styles.GoogleContinueText}>
                Continue with Google
              </Text>
              <FontAwesome name="google" size={20} color="#ffffff" style={{ marginLeft: 10 }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.SignUpRedirect} onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('SignIn');
          }}>
            <Text style={styles.SignUpRedirect}>Already Have an Account?</Text>
          </TouchableOpacity>
        </View>
  </View>      
  );
}

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  view: {
    flexGrow: 1,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF', // Apply background color here
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 200,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
    color: colorScheme === 'dark' ? '#161618' : '#FFF',
    
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginTop: 100,
    marginBottom: 20,
    color: colorScheme === 'dark' ? '#fff' : '#333',
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
    zIndex: 1,
  },
  input: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'gray',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    borderColor: colorScheme === 'dark' ? '#5f5f5f' : '#ddd',
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#fff',
  },
  button: {
    width: '80%',
    backgroundColor: '#000000',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#000',
  },
  buttonText: {
    color: colorScheme === 'dark' ? '#e9e9e9' : '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  icon: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginTop: '-2%',
    marginBottom: "-80%",
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
    zIndex: 1,
  },
  seperatorBox: {
    width: 330,
    height: 5,
    backgroundColor: colorScheme === 'dark' ? '#5a5a5a' : '#CCCCCC',
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 3,
  },
  AppleContinueButton: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 0,
    width: '88%',
    height: '7%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#000000",
    borderRadius: 100,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#000',
  },
  AppleContinueText: {
    color: colorScheme === 'dark' ? '#e9e9e9' : '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  GoogleContinueButton: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 60,
    borderWidth: 0,
    width: '88%',
    height: '7%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    marginTop: 2,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#000',
  },
  GoogleContinueText: {
    color: colorScheme === 'dark' ? '#e9e9e9' : '#FFF',
    fontWeight: 'bold',
    fontSize: 18
  },
  SignUpRedirect: {
    color: colorScheme === 'dark' ? '#fff' : '#000',
    textDecorationLine: 'underline'
  },
});
