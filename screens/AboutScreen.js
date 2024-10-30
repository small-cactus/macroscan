// AboutScreen.js
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Appearance,
  Dimensions,
  Platform,
  Linking,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedAnswer from './AnimatedAnswer'; // Ensure you have the correct path

const { width, height } = Dimensions.get('window');

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CHANGELOG = [
  {
    title: 'UI Overhaul',
    details: 'Complete dark mode focus with updated colors and animations.',
  },
  {
    title: 'Enhanced Scanning',
    details: 'Improved meal detection accuracy with detailed ingredients and macro analysis.',
  },
  {
    title: 'New Pricing',
    details: 'Single $2.99 lifetime purchase. All premium features included.',
  },
  {
    title: 'Free Plan Updates',
    details: '2 daily scans, access to premium features except unlimited scanning.',
  },
  {
    title: 'Camera Improvements',
    details: 'Custom photo interface with faster processing and higher accuracy.',
  },
  {
    title: 'Insights Update',
    details: 'Improved analysis with upcoming workout and recipe suggestions.',
  },
];

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
      dim =>
        (width === dim.width && height === dim.height) ||
        (width === dim.height && height === dim.width)
    )
  );
};

const AboutScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);

  // Initialize an array to track open/closed state for each changelog item
  const [changelogOpen, setChangelogOpen] = useState(new Array(CHANGELOG.length).fill(false));

  const toggleChangelog = useCallback(
    index => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setChangelogOpen(prevState => {
        const updatedState = [...prevState];
        updatedState[index] = !updatedState[index];
        return updatedState;
      });
    },
    []
  );

  const handleContactPress = () => {
    const email = 'macroscan.help@gmail.com';
    const subject = encodeURIComponent('Support Request');
    const body = encodeURIComponent('Please describe your issue or question:');
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const handleTermsPress = () => {
    const policyUrl = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
    Linking.openURL(policyUrl);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
        </TouchableOpacity>
        <Text style={styles.title}>About MacroScan</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Image source={require('../assets/icon.png')} style={styles.logo} />
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.version}>Version 1.5.0 (67)</Text>
            <View style={styles.betaContainer}>
              <Text style={styles.betaTag}>BETA</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleContactPress}>
              <Ionicons name="mail-outline" size={20} color="#FFF" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>Contact Support</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleTermsPress}>
              <Ionicons name="document-text-outline" size={20} color="#FFF" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>Terms & Conditions</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.changelogHeader}>Changelog v1.5.0</Text>
          <View style={styles.betaContainer}>
              <Text style={styles.betaTag}>BETA</Text>
            </View>
          {CHANGELOG.map((item, index) => (
            <View key={index} style={styles.changelogItemContainer}>
              <TouchableOpacity
                style={styles.changelogTitleContainer}
                onPress={() => toggleChangelog(index)}
              >
                <Ionicons
                  name={changelogOpen[index] ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={colorScheme === 'dark' ? '#FFF' : '#000'}
                />
                <Text style={styles.changelogTitle}>{item.title}</Text>
              </TouchableOpacity>
              {changelogOpen[index] && (
                <AnimatedAnswer text={item.details} colorScheme={colorScheme} />
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getDynamicStyles = colorScheme =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: isIphoneSE() ? 12 : 16,
      paddingBottom: 8,
      paddingHorizontal: '5%',
      backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: '5%',
    },
    title: {
      flex: 1,
      fontSize: 32,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      textAlign: 'center',
      marginRight: 40, // Width of back button to maintain center alignment
    },
    content: {
      alignItems: 'center',
      marginTop: '2%',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: '8%',
    },
    logoBackground: {
      backgroundColor: '#FFF',
      borderRadius: 30,
      padding: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    logo: {
      width: 130,
      height: 130,
      borderRadius: 26,
    },
    infoSection: {
      alignItems: 'center',
      marginBottom: '6%',
    },
    version: {
      fontSize: 18,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      marginBottom: 8,
    },
    betaContainer: {
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#E5E5EA',
      borderRadius: 8,
      overflow: 'hidden',
      margin: '2%',
    },
    betaTag: {
      fontSize: 14,
      color: '#007AFF',
      fontWeight: '600',
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    changelogHeader: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      alignSelf: 'center',
      marginBottom: '0.5%',
      marginTop: '10%',
    },
    changelogItemContainer: {
      marginBottom: '3%',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
      borderRadius: 16,
      padding: 16,
      width: '100%',
    },
    changelogTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    changelogTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      marginLeft: 8,
      flexShrink: 1,
    },
    buttonContainer: {
      width: '100%',
      gap: 12,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#000',
      borderRadius: 15,
      padding: 16,
      width: '100%',
    },
    buttonIcon: {
      marginRight: 8,
    },
    actionButtonText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
    },
    backButton: {
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 5,
      padding: 10,
      width: 40,
    },
  });

export default AboutScreen;