// SettingsScreen.js

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Appearance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FoodCarousel from './FoodCarouselHero.js';
import { LinearGradient } from 'expo-linear-gradient'; // Import LinearGradient

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SettingsScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const [currentColorScheme, setCurrentColorScheme] = useState(colorScheme);
  const styles = getDynamicStyles(currentColorScheme);

  useEffect(() => {
    const colorSchemeListener = (preferences) => {
      setCurrentColorScheme(preferences.colorScheme);
    };
    Appearance.addChangeListener(colorSchemeListener);
    return () => {
      Appearance.removeChangeListener(colorSchemeListener);
    };
  }, []);

  const settingsOptions = [
    {
      title: "Features",
      navigateTo: "FeaturesScreen",
    },
    // {
    //   title: "Notification Preferences",
    //   navigateTo: "NotificationSettingsScreen",
    // },
    {
      title: "Privacy and Security",
      navigateTo: "PrivacyScreen",
    },
    {
      title: "About MacroScan",
      navigateTo: "AboutScreen",
    },
    // {
    //   title: "Developer",
    //   navigateTo: "DebuggingScreen",
    // },
    {
      title: "Help and Support",
      navigateTo: "SupportScreen",
    },
    // {
    //   title: "Loading Screen Test",
    //   navigateTo: "LoadingScreen",
    // },
    // {
    //   title: "Goodbye Screen Test",
    //   navigateTo: "Goodbye",
    // },
    // {
    //   title: "No Internet Screen Test",
    //   navigateTo: "NoInternet",
    // },
    // {
    //   title: "Fullscreen Camera Test (Beta)",
    //   navigateTo: "CameraScreen",
    // },
    // {
    //   title: "On Boarding Test",
    //   navigateTo: "OnBoardingScreen",
    // },
    // {
    //   title: "Image chat test",
    //   navigateTo: "ChatWithImageTest",
    // },
    // {
    //   title: "Landscape carousel screen",
    //   navigateTo: "LandscapeCarouselScreen",
    // },
    // {
    //   title: "InsightsV2 Testing",
    //   navigateTo: "InsightsV2",
    // },
  ];

  const handleSettingPress = async (navigateTo) => {
    // Example: Clearing a specific AsyncStorage item (uncomment if needed)
    // await AsyncStorage.removeItem('freeAccurateScansUsed');
    // await AsyncStorage.setItem('@openai_api_key', 'OPENAI_API_KEY_REMOVED');
    navigation.navigate(navigateTo);
  };

  const handlePurchasePress = () => {
    navigation.navigate('PurchaseScreen');
  };

  const PremiumFeatureItem = ({ icon, text }) => (
    <LinearGradient
      colors={
        currentColorScheme === 'dark'
        ? ['#101010', '#222222'] // Enhanced dark mode gradient with more depth
        : ['#e2e2e2', '#dcdcdc', '#f0f0f0', '#fcfcfc'] // Enhanced light mode gradient for more depth
      }
      start={[1, 1.3]}
      end={[1, 0]}
      style={styles.featureItem}
    >
      <View style={styles.featureIconContainer}>
        <Ionicons name={icon} size={24} color={currentColorScheme === 'dark' ? '#b4b4b4' : '#000'} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.content}>
          {settingsOptions.map((setting, index) => (
            <TouchableOpacity
              key={index}
              style={styles.settingItemContainer}
              onPress={() => handleSettingPress(setting.navigateTo)}
            >
              <Text style={styles.settingTitle}>{setting.title}</Text>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={currentColorScheme === 'dark' ? '#FFF' : '#000'}
              />
            </TouchableOpacity>
          ))}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Dynamic Styles based on Color Scheme
const getDynamicStyles = (colorScheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
  },
  scrollContainer: {
    padding: '5%',
    paddingBottom: 0, // To allow the purchaseButton to extend to edges
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    textAlign: 'center',
    marginBottom: '5%',
  },
  content: {
    marginTop: '2%',
    marginBottom: '20%',
  },
  settingItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '3%',
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f3f3f3',
    padding: 10,
    borderRadius: 10,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
  },
  separator: {
    alignItems: 'center',
    alignSelf: 'center',
    alignContent: 'center',
    height: 3,
    borderRadius: 90,
    backgroundColor: colorScheme === 'dark' ? '#444' : '#CCC',
    marginVertical: 10,
    width: '95%',
  },
  purchaseButton: {
    backgroundColor: colorScheme === 'dark' ? '#000' : '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: colorScheme === 'dark' ? 1 : 0,
    width: SCREEN_WIDTH - 10, // Adjust width to account for container padding
    alignSelf: 'center', // Center align
    paddingBottom: 20, // Add padding to prevent overlapping
  },
  premiumBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: colorScheme === 'dark' ? '#FFF' : '#000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    zIndex: 1, // Ensure it stays above other elements
  },
  premiumBadgeText: {
    color: colorScheme === 'dark' ? '#000' : '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  purchaseContent: {
    paddingHorizontal: 16, // Adjust horizontal padding
    paddingTop: 56, // Add top padding to prevent overlap with premiumBadge
  },
  purchaseTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  purchaseSubtitle: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#B0B0B0' : '#666666',
    marginBottom: 16,
    textAlign: 'center',
  },
  carouselContainer: {
    marginHorizontal: -20,
    alignSelf: 'center',
    marginBottom: 16,
  },
  featuresList: {
    gap: 16,
    marginBottom: 24,
    alignItems: 'center', // Center the feature list
    alignSelf: 'center',
    alignContent: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colorScheme === 'dark' ? '#222' : '#eee',    // Removed borderWidth and borderColor since LinearGradient handles borders if needed
    width: '100%', // Make sure the gradient covers the entire width
  },
  featureIconContainer: {
    width: 36, // Adjust size as needed
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#fff' : '#333', 
    flex: 1,
    fontWeight: '400',
  },
  ctaContainer: {
    alignItems: 'center',
    gap: 12,
  },
  ctaText: {
    fontSize: 14,
    color: colorScheme === 'dark' ? '#B0B0B0' : '#666666',
  },
  ctaButton: {
    backgroundColor: colorScheme === 'dark' ? '#fff' : '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    width: '100%',
  },
  ctaButtonText: {
    color: colorScheme === 'dark' ? '#000' : '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default SettingsScreen;