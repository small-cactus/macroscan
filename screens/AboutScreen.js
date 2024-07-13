import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Appearance,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const AboutScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);

  const handleContactPress = () => {
    const email = "macroscan.help@gmail.com";
    const subject = encodeURIComponent("Support Request");
    const body = encodeURIComponent("Please describe your issue or question:");
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
      </TouchableOpacity>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>About</Text>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Image source={require('../assets/icon.png')} style={styles.logo} />
            </View>
          </View>
          <Text style={styles.description}>
            MacroScan v0.1 Alpha
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={handleContactPress}>
            <Text style={styles.contactButtonText}>Contact Us</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    textAlign: 'center',
    marginBottom: '5%',
  },
  content: {
    alignItems: 'center',
    marginTop: '2%',
    marginBottom: '20%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: '5%',
  },
  logoBackground: {
    backgroundColor: '#FFF',
    borderRadius: 27,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logo: {
    width: 120,
    height: 120,
  },
  description: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#EEE' : '#666',
    textAlign: 'center',
    marginBottom: '5%',
    paddingHorizontal: '5%',
  },
  versionInfo: {
    fontSize: 18,
    fontWeight: '500',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    marginBottom: '5%',
  },
  contactButton: {
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
    borderRadius: 90,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  backButton: {
    position: 'absolute',
    left: '5%',
    top: '9%',
    zIndex: 10,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
    padding: 10,
  },
});

export default AboutScreen;