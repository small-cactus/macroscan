import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import { FontAwesome } from '@expo/vector-icons'; // Ensure FontAwesome is installed
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

const colorScheme = Appearance.getColorScheme();

export default function SignInScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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

  const storeData = async (value) => {
    try {
      console.log("Storing data:", value); // Add logging to see what is being stored
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem('@user', jsonValue);
    } catch (e) {
      console.error("Failed to store data:", e);
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
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Text style={styles.title}>Sign In to MacroScan</Text>
        <Image
          source={require('../assets/icon.png')}
          style={styles.icon}
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
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
          <View style={styles.seperatorBox}></View>
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
          <TouchableOpacity style={styles.SignInRedirect} onPress={() => {
            navigation.navigate('SignUp');
          }}>
            <Text style={styles.SignInText}>Don't Have an Account?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginTop: 200,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginTop: 100,
    marginBottom: 20,
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
    color: '#000',
  },
  button: {
    width: '80%',
    backgroundColor: '#000000',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  icon: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: -380,
    marginTop: -10
  },
  seperatorBox: {
    width: 330,
    height: 5,
    backgroundColor: '#C8C8C8',
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 3,
  },
  AppleContinueButton: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 5,
    width: '88%',
    height: '7%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#000000",
    borderRadius: 100,
  },
  AppleContinueText: {
    color:'#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  GoogleContinueButton: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 60,
    borderWidth: 5,
    width: '88%',
    height: '7%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#000000",
    borderRadius: 100,
    marginTop: 2,
  },
  GoogleContinueText: {
    color:'#ffffff',
    fontWeight: 'bold',
    fontSize: 18
  },
  SignUpRedirect: {
    textDecorationStyle: 'underline',
    textDecorationStyle: 'solid',
  },
});
