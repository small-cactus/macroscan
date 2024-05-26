import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Appearance, SafeAreaView } from 'react-native';
import { useUser } from '../userContext';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CompleteProfileScreen = ({ navigation }) => {
  const { user, updateUser } = useUser();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);

  const handleSave = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!name || name.trim().split(' ').length < 2) {
      Alert.alert('Invalid Name', 'Please enter your full name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      await updateUser({ name, email });
      await AsyncStorage.setItem('userName', name);
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeTabs' }],
      });
    } catch (error) {
      Alert.alert('Update Error', 'Failed to update user information.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>
          We signed you in, but it looks like your profile was missing a few things. Please complete this to sign in.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
  },
  container: {
    padding: '5%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    textAlign: 'center',
    marginBottom: '5%',
  },
  subtitle: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#EEE' : '#666',
    textAlign: 'center',
    marginBottom: '5%',
  },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#5f5f5f' : '#ddd',
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#fff',
    borderRadius: 10,
    marginBottom: 20,
    color: colorScheme === 'dark' ? '#e9e9e9' : '#000',
  },
  button: {
    width: '80%',
    padding: 15,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#000',
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: colorScheme === 'dark' ? '#e9e9e9' : '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CompleteProfileScreen;
