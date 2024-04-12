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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const BoxComponent = () => {
    return (
      <View style={styles.seperatorBox}></View>
    );
  };

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (username === 'Macro' && password === 'Scan') {
      navigation.replace('Home');
    } else {
      Alert.alert('Invalid Credentials', 'The username or password is incorrect.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Text style={styles.title}>Sign Up for MacroScan</Text>
        <Image
  source={require('../assets/icon.png')} // Adjust the path accordingly
  style={styles.icon} // Define a style for your icon
/>
<View style={styles.container}></View>
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
          <TouchableOpacity style={styles.SignUpRedirect} onPress={() => navigation.navigate('SignIn')}>
        <Text style={styles.SignUpText}>Already Have an Account?</Text>
      </TouchableOpacity>
        </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginTop: 10, // Adjust as needed to position the title at the top
    marginBottom: 20,
  },
  input: {
    width: '80%', // Adjust based on preference
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
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
    width: 95, // Adjust the width as needed
    height: 95, // Adjust the height as needed
    alignSelf: 'center', // Center the icon horizontally
    marginBottom: -380, // Space between icon and the next element
    marginTop: -10
  },
  seperatorBox: {
    width: 330,
    height: 5,
    backgroundColor: '#C8C8C8',
    borderWidth:0,
    zIndex: 1,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 3,
  },
  SignUpRedirect: {
    textDecorationStyle: 'underline',
    textDecorationStyle: 'solid',
  },
});
