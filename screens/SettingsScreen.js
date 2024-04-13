import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';  // Import the icons

const SETTINGS = [
  { id: '1', title: 'General', screen: 'GeneralSettings' },
  { id: '2', title: 'Account', screen: 'AccountSettings' },
  { id: '3', title: 'Notifications', screen: 'NotificationSettings' },
];


const SettingsScreen = ({ navigation }) => {
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => navigation.navigate(item.screen)}>
      <Text style={styles.itemText}>{item.title}</Text>
      <Icon name="chevron-right" size={25} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <FlatList
        data={SETTINGS}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Add background color for entire screen
    paddingTop: 20, // Increase padding at the top
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 20,
  },
  itemContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  icon: {
    fontSize: 25,  // Adjust size accordingly
    color: '#ccc',
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E2E2',
    marginLeft: 20,
  },
});

export default SettingsScreen;
