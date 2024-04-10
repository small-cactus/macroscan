import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ImageBackground } from 'react-native';

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
    <ImageBackground source={require("\favicon.png")} style={styles.background}>
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
    marginBottom: 350
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
    height: 210,
    width: 370,
    backgroundColor: '#5E5E5E',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 10,
    position: 'absolute',
    top: 88,
    left: 9,
    opacity: .5,
    zIndex: -1,

  },
});
