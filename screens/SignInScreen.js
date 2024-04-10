import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';

export default function SignInScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const BoxComponent = () => {
    return (
      <View style={styles.boxStyle}></View>
    );
  };

  const handleLogin = () => {
    if (username === 'Macro' && password === 'Scan') {
      // If the credentials are correct, navigate to the HomeScreen
      navigation.replace('Home');
    } else {
      // If the credentials are incorrect, display an alert
      Alert.alert('Invalid Credentials', 'The username or password is incorrect.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In to MacroScan</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Username" 
        value={username} 
        onChangeText={setUsername} 
        autoCapitalize="none" 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
        autoCapitalize="none" 
      />
      <Button title="Sign In" onPress={handleLogin} />
      <BoxComponent style={styles.boxStyle}></BoxComponent>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'white',
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'gray',
  },
  boxStyle: {
    height: 100, // Specifies the height of the box
    width: 100, // Specifies the width of the box
    backgroundColor: '#00FF00', // Sets the background color of the box
    borderWidth: 2, // Sets the width of the border
    borderColor: '#000000', // Sets the color of the border
    borderRadius: 10, // Optionally, sets the border radius to make corners rounded
    // Add other styles as needed
  },
});
