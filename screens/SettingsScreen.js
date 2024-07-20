import React from 'react';
import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Appearance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const styles = getDynamicStyles(colorScheme);

  useEffect(() => {
    const colorSchemeListener = (preferences) => {
      setColorScheme(preferences.colorScheme);
    };
    
    Appearance.addChangeListener(colorSchemeListener);
    
    return () => {
      Appearance.removeChangeListener(colorSchemeListener);
    };
  }, []);

  const settingsOptions = [
    {
      title: "Features",
      navigateTo: "FeaturesScreen"
    },
    // {
    //   title: "Notification Preferences",
    //   navigateTo: "NotificationSettingsScreen"
    // },
    {
      title: "Privacy and Security",
      navigateTo: "PrivacyScreen"
    },
    {
      title: "About MacroScan",
      navigateTo: "AboutScreen"
    },
    // {
    //   title: "Developer",
    //   navigateTo: "DebuggingScreen"
    // },
    {
      title: "Help and Support",
      navigateTo: "SupportScreen"
    },
    // {
    //   title: "Food scanning test",
    //   navigateTo: "FoodScanScreen"
    // },
    // {
    //   title: "On Boarding Test",
    //   navigateTo: "OnBoardingScreen"
    // },
  ];

  const handleSettingPress = (navigateTo) => {
    AsyncStorage.removeItem('@user_goals');
    navigation.navigate(navigateTo);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.content}>
          {settingsOptions.map((setting, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.settingItemContainer} 
              onPress={() => handleSettingPress(setting.navigateTo)}
            >
              <Text style={styles.settingTitle}>{setting.title}</Text>
              <Ionicons name="chevron-forward" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
            </TouchableOpacity>
          ))}
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
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#f3f3f3',
    padding: 10,
    borderRadius: 10,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
  },
});

export default SettingsScreen;
