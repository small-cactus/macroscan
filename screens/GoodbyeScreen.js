import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Appearance } from 'react-native';

export default function GoodbyeScreen({ navigation }) {
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const styles = getDynamicStyles(colorScheme);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const handleExit = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  };

  const handleEmail = () => {
    const email = 'macroscan.help@gmail.com';
    const subject = encodeURIComponent('Need Help');
    const body = encodeURIComponent('Hello MacroScan Support,\n\nI need help with...');
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Goodbye, User.</Text>
      <Image
        source={colorScheme === 'dark' ? require('../assets/icon-light.png') : require('../assets/icon.png')}
        style={styles.icon}
      />
      <TouchableOpacity style={styles.button} onPress={handleExit}>
        <Text style={styles.buttonText}>Sign up again</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.emailButton} onPress={handleEmail}>
        <Text style={styles.emailButtonText}>Email Support</Text>
      </TouchableOpacity>
    </View>
  );
}

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#fff' : '#333',
    textAlign: 'center',
    marginBottom: '10%',
  },
  icon: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  button: {
    width: '60%',
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#000',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emailButton: {
    width: '60%',
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#000',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  emailButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
