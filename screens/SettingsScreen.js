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
import { SymbolView } from 'expo-symbols';

// Import your user context hook (adjust the path as needed)
import { useUser } from '../userContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SettingsScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const [currentColorScheme, setCurrentColorScheme] = useState(colorScheme);
  const styles = getDynamicStyles(currentColorScheme);
  
  // Retrieve the current user from your context
  const { user } = useUser();

  // Replace the single developerUserString with an array of authorized developer userStrings
  const developerUserStrings = [
    "001609.452f0eefdef44ff2836215fc746112b9.0803",
    "000288.649bb66db9c449338b8ffb3cc0b29e69.0115"
  ];

  // Define your settings options
  const settingsOptions = [
    {
      title: "Features",
      navigateTo: "FeaturesScreen",
      symbol: "star.fill"
    },
    {
      title: "Privacy and Security",
      navigateTo: "PrivacyScreen",
      symbol: "lock.shield.fill"
    },
    {
      title: "Developer",
      navigateTo: "DebuggingScreen",
      symbol: "hammer.fill"
    },
    {
      title: "Help and Support",
      navigateTo: "SupportScreen",
      symbol: "questionmark.circle.fill"
    },
    {
      title: "About MacroScan",
      navigateTo: "AboutScreen",
      symbol: "info.circle.fill"
    },
    // {
    //   title: "Multi-Food Scan (BETA)",
    //   navigateTo: "MultiFoodScanScreen",
    //   symbol: "fork.knife"
    // },
    // {
    //   title: "Search Mode (BETA)",
    //   navigateTo: "SearchScreen",
    //   symbol: "fork.knife"
    // }
  ];

  // Update the filtering logic to check against the array of authorized userStrings
  const filteredSettingsOptions = settingsOptions.filter(option => {
    if (option.title === "Developer") {
      return user && developerUserStrings.includes(user.userString);
    }
    return true;
  });

  useEffect(() => {
    const colorSchemeListener = ({ colorScheme }) => {
      setCurrentColorScheme(colorScheme);
    };
    const subscription = Appearance.addChangeListener(colorSchemeListener);
    return () => {
      subscription.remove();
    };
  }, []);

  const handleSettingPress = async (navigateTo) => {
    // Example: Clearing a specific AsyncStorage item (uncomment if needed)
    // await AsyncStorage.setItem('freeAccurateScansUsed', '0');
    // await AsyncStorage.removeItem('@selected_provider');
    // await AsyncStorage.setItem('@openai_api_key', 'OPENAI_API_KEY_REMOVED');
    // await AsyncStorage.setItem('@gemini_api_key', 'GEMINI_API_KEY_REMOVED');
    // await AsyncStorage.removeItem('@has_seen_whats_new_1_6_0');
    // await AsyncStorage.removeItem('@has_seen_mode_tooltip');
    // await AsyncStorage.removeItem('@has_seen_scan_button_tooltip');
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
        <SymbolView 
          name={icon} 
          size={24} 
          tintColor={currentColorScheme === 'dark' ? '#b4b4b4' : '#000'} 
        />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <SafeAreaView style={styles.safeArea}>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.content}>
            {filteredSettingsOptions.map((setting, index) => (
              <TouchableOpacity
                key={index}
                style={styles.settingItemContainer}
                onPress={() => handleSettingPress(setting.navigateTo)}
              >
                <View style={styles.settingRow}>
                  <SymbolView
                    name={setting.symbol}
                    size={24}
                    tintColor={currentColorScheme === 'dark' ? '#8E8E93' : '#000'}
                    style={styles.settingIcon}
                    weight="semibold"
                  />
                  <Text style={styles.settingTitle}>{setting.title}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={currentColorScheme === 'dark' ? '#8E8E93' : '#000'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </ScrollView>
    </View>
  );
};

// Dynamic Styles based on Color Scheme
const getDynamicStyles = (colorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
  },
  safeArea: {
    flex: 1,
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    marginRight: 12,
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
    borderColor: colorScheme === 'dark' ? '#222' : '#eee',
    width: '100%', // Make sure the gradient covers the entire width
  },
  featureIconContainer: {
    width: 36,
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