import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Modal, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';  // Import the icon component
import { SymbolView } from 'expo-symbols';

const HistoryScreen = () => {
    const [history, setHistory] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
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
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadHistory();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            loadHistory();
            return () => {};
        }, [])
    );

    const loadHistory = async () => {
        try {
            const historyData = await AsyncStorage.getItem('@product_history');
            console.log(historyData)
            let history = historyData ? JSON.parse(historyData) : [];
            history = history.reverse(); // Reverse the array to show new entries first
            console.log(history)
            setHistory(history);
        } catch (e) {
            console.error("Error loading history: ", e);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        loadHistory().then(() => setRefreshing(false));
    }, []);

    function truncateString(str, num) {
        if (str.length > num) {
            return str.slice(0, num) + '...';  // Truncate the string to 'num' characters and add ellipsis
        } else {
            return str;
        }
    }

    const clearHistory = async () => {
        // Show confirmation dialog
        Alert.alert(
            "Clear History", // Title of the alert
            "Are you sure you want to permanently delete all scan history?", // Message shown to the user
            [
                {
                    text: "Cancel",
                    onPress: () => console.log("Cancel History Pressed"), // Log or handle the cancel action
                    style: "cancel"
                },
                {
                    text: "Delete",
                    onPress: async () => {
                        try {
                            await AsyncStorage.removeItem('@product_history');
                            setHistory([]);  // Update local state to reflect the cleared history
                            console.log("History cleared successfully.");
                        } catch (e) {
                            console.error("Error clearing history: ", e);
                        }
                    },
                    style: 'destructive'
                }
            ],
            { cancelable: false } // Prevents the alert from being dismissed by tapping outside of the alert box
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.historyTitle}>History</Text>
            <TouchableOpacity style={styles.iconButton} onPress={clearHistory}>
            <SymbolView 
        name="trash.slash.fill" // SF Symbol name for 'close'
        size={26} 
        tintColor={colorScheme === 'dark' ? '#fff' : '#fff'} 
        type="hierarchical" // or other types like 'monochrome', 'palette', etc.
        style={styles.symbol}
      />
            </TouchableOpacity>
            {history.length > 0 ? (
                <ScrollView
                style={styles.scrollContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {history.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.card} onPress={() => setSelectedItem(item)}>
                        <Image source={{ uri: item.imageUri }} style={styles.productImage} />
                        <View style={styles.info}>
                            <Text style={styles.productName}>{item.productName}</Text>
                            <Text style={styles.date}>{new Date(item.date).toLocaleString()}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
            ) : (
                <Text style={styles.emptyText}>Your history is currently empty. Items you scan will appear here.</Text>
            )}
            {selectedItem && (
            <Modal
                animationType="slide"
                transparent={true}
                visible={!!selectedItem}
                onRequestClose={() => setSelectedItem(null)}
            >
                <View style={styles.modalView}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedItem(null)}>
                        <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#fff' : '#fff'} />
                    </TouchableOpacity>
                    <Text style={styles.productNameModal} numberOfLines={1}>
                        {truncateString(selectedItem.productName,20)}
                    </Text>
                    <Image source={{ uri: selectedItem.imageUri }} style={styles.imagePreview} />
                    <ScrollView style={styles.nutrientContainer}>
                        {Object.entries(selectedItem.nutrients).map(([key, value], index) => {
                            // Skip rendering if the key is "productName"
                            if (key.toLowerCase() === "productname") return null;
                            
                            return (
                                <View key={index}>
                                    <View style={styles.nutrientItem}>
                                        <Text style={styles.nutrientLabel}>{key}:</Text>
                                        <Text style={styles.nutrientValue}>{value}</Text>
                                    </View>
                                    <View style={styles.separator}></View>
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            </Modal>
        )}
        </View>
    );
};

const getDynamicStyles = (colorScheme) => StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 20,
        backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
    },
    scrollContainer: {
        width: '100%',
        marginTop: '5%',
        padding: '3%',
    },
    card: {
        flexDirection: 'row',
        backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#f3f3f3',
        padding: 13,
        marginVertical: 6,
        borderRadius: 25,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.25,
        // shadowRadius: 3,
        // elevation: 5,
    },
    productImage: {
        width: 100,
        height: 100,
        borderRadius: 15,
    },
    info: {
        flex: 1,
        marginLeft: 10,
        justifyContent: 'center',
    },
    productName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colorScheme === 'dark' ? '#fff' : '#000',
    },
    date: {
        fontSize: 14,
        color: colorScheme === 'dark' ? '#d9d9d9' : '#7a7a7a',
    },
    emptyText: {
        marginTop: '70%',
        fontSize: 16,
        color: colorScheme === 'dark' ? '#AAAAAA' : '#AAAAAA',
        textAlign: 'center',
        marginHorizontal: '13%'
    },
    modalView: {
        flex: 1,
        marginTop: '14%',
        backgroundColor: colorScheme === 'dark' ? '#1d1d1f' : '#FFF',
        borderRadius: 48,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.75,
        shadowRadius: 50,
        elevation: 5,
    },
    productNameModal: {
        fontSize: 24,
        alignSelf: 'center',
        marginBottom: '7%',
        fontWeight: 'bold',
        top: '0.3%',
        color: colorScheme === 'dark' ? '#fff' : '#000',
    },
    imagePreview: {
        width: '100%',
        height: 300,
        borderRadius: 25,
        marginBottom: 15,
    },
    nutrientContainer: {
        width: '100%',
    },
    nutrientItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    nutrientLabel: {
        fontWeight: '500',
        fontSize: 17,
        color: colorScheme === 'dark' ? '#f9f9f9' : '#000',
    },
    nutrientValue: {
        color: "#7a7a7a",
        textAlign: 'right',
        fontSize: 16,
        fontWeight: '400',
        color: colorScheme === 'dark' ? '#d9d9d9' : '#7a7a7a',
    },
    closeButton: {
        backgroundColor: colorScheme === 'dark' ? '#3a3a3F' : '#000',
        borderRadius: 100,
        padding: 8,
        elevation: 2,
        position: 'absolute', // Corrected to 'absolute' for exact placement
        right: '5%',  // 5% from the right edge of the screen
        top: '2%',  // 20% from the top of the screen
        zIndex: 1,  // Ensure it stays on top of other components if needed
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 5,
    },
    iconButton: {
        position: 'absolute', // Corrected to 'absolute' for exact placement
        right: '5%',  // 5% from the right edge of the screen
        top: '8%',  // 20% from the top of the screen
        padding: 10,
        zIndex: 1,  // Ensure it stays on top of other components if needed
        backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
        borderRadius: 15,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.25,
        // shadowRadius: 3,
        // elevation: 5,
    },
    historyTitle: {
        marginTop: '12%',
        fontSize: 28,
        fontWeight: 'bold',
        color: colorScheme === 'dark' ? '#fff' : '#000',
        textAlign: 'center',
    },
    separator: {
        height: 3.4,
        borderRadius: 60,
        backgroundColor: colorScheme === 'dark' ? '#3a3a3d' : '#CCCCCC',
        width: '100%', // Make sure this stretches across the nutrient item
        marginVertical: 5,
    },
});

export default HistoryScreen;
