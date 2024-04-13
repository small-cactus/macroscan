import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Ensure react-native-vector-icons is installed

const CustomHeader = ({ navigation }) => (
    <TouchableOpacity style={{ padding: 10 }} onPress={() => navigation.goBack()}>
        <Icon name="chevron-left" size={30} color="#000" style={styles.chevron} />
    </TouchableOpacity>
);

const GeneralSettingsScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CustomHeader navigation={navigation} />
        <Text style={styles.title}>General Settings</Text>
      </View>
      <View style={styles.setting}>
        <Text style={styles.settingText}>Enable Dark Mode</Text>
        <Switch />
      </View>
      <View style={styles.setting}>
        <Text style={styles.settingText}>Enable Notifications</Text>
        <Switch />
      </View>
      {/* Add more settings here */}
    </View>
  );
};

const AccountSettingsScreen = ({ navigation }) => (
  <View style={styles.container}>
    <CustomHeader navigation={navigation} />
    <Text style={styles.title}>Account Settings</Text>
    <View style={styles.setting}>
      <Text style={styles.settingText}>Change Password</Text>
      {/* Placeholder for the password change component */}
    </View>
    <View style={styles.setting}>
      <Text style={styles.settingText}>Manage Email</Text>
      {/* Placeholder for the email management component */}
    </View>
  </View>
);

const NotificationSettingsScreen = ({ navigation }) => (
  <View style={styles.container}>
    <CustomHeader navigation={navigation} />
    <Text style={styles.title}>Notification Settings</Text>
    <View style={styles.setting}>
      <Text style={styles.settingText}>Receive Promotional Emails</Text>
      <Switch />
    </View>
    <View style={styles.setting}>
      <Text style={styles.settingText}>Receive System Notifications</Text>
      <Switch />
    </View>
  </View>
);

const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 60, // Adjusted top padding to fit header appropriately
      padding: 20,
      backgroundColor: '#fff',
      alignContent: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      marginLeft: -25,
      textAlign: 'center',
    },
    setting: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E2E2',
    },
    settingText: {
      fontSize: 16,
    },
  chevron: {
    marginLeft: -110,
  }
});

export { GeneralSettingsScreen, AccountSettingsScreen, NotificationSettingsScreen };
