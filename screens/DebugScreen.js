import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const DebugScreen = ({ route, navigation }) => {
    const { history, setHistory } = route.params;
    const [editedHistory, setEditedHistory] = useState(history);
    const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
    const styles = getDynamicStyles(colorScheme);

    const handleDateChange = (index, event, selectedDate) => {
        const updatedHistory = [...editedHistory];
        updatedHistory[index].date = selectedDate.toISOString();
        setEditedHistory(updatedHistory);
    };

    const saveChanges = async () => {
        try {
            await AsyncStorage.setItem('@product_history', JSON.stringify(editedHistory.reverse()));
            setHistory(editedHistory);
            Alert.alert('Success', 'History dates updated successfully');
            navigation.goBack();
        } catch (e) {
            console.error("Error saving history: ", e);
            Alert.alert('Error', 'Failed to save changes');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Edit History Dates</Text>
            <Text style={styles.subtitle}>Debug menu for editing history time and date.</Text>
            <ScrollView style={styles.scrollContainer}>
                {editedHistory.map((item, index) => (
                    <View key={index} style={styles.itemContainer}>
                        <Text style={styles.itemName}>{item.productName}</Text>
                        <DateTimePicker
                            value={new Date(item.date)}
                            mode="datetime"
                            display="default"
                            onChange={(event, selectedDate) => handleDateChange(index, event, selectedDate)}
                        />
                    </View>
                ))}
            </ScrollView>
            <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
        </View>
    );
};

const getDynamicStyles = (colorScheme) => StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
    },
    title: {
        textAlign: 'center',
        marginTop: 35,
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: colorScheme === 'dark' ? '#fff' : '#000',
    },
    scrollContainer: {
        flex: 1,
    },
    itemContainer: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f3f3f3',
        borderRadius: 15,
    },
    itemName: {
        fontSize: 18,
        fontWeight: '500',
        marginLeft: 8,
        marginBottom: 10,
        color: colorScheme === 'dark' ? '#fff' : '#000',
    },
    saveButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 25,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 16,
        color: '#888888',
        textAlign: 'center',
        marginBottom: 35,
        marginHorizontal: 25,
      },
});

export default DebugScreen;