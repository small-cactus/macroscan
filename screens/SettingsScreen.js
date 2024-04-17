import React from 'react';
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

const SettingsScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);

  const settingsOptions = [
    {
      title: "Account Settings",
      navigateTo: "AccountSettingsScreen"
    },
    {
      title: "Notification Preferences",
      navigateTo: "NotificationSettingsScreen"
    },
    {
      title: "Privacy and Security",
      navigateTo: "PrivacySettingsScreen"
    },
    {
      title: "About MacroScan",
      navigateTo: "AboutScreen"
    },
    {
      title: "Help and Support",
      navigateTo: "SupportScreen"
    },
  ];

  const handleSettingPress = (navigateTo) => {
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
    fontSize: 28,
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
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#CCC',
    padding: 10,
    borderRadius: 10,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
  },
});

export default SettingsScreen;
