import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  Image, Modal, Alert, Dimensions, Platform, Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';

const { width, height } = Dimensions.get('window');

const isIphoneSE = () => {
  const smallIphoneDimensions = [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 414, height: 736 },
    { width: 360, height: 640 },
    { width: 375, height: 812 },
    { width: 360, height: 780 },
  ];

  return (
    Platform.OS === 'ios' &&
    smallIphoneDimensions.some(
      dim => (width === dim.width && height === dim.height) || (width === dim.height && height === dim.width)
    )
  );
};

const HistoryScreen = () => {
  const navigation = useNavigation();
  const [history, setHistory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const styles = getDynamicStyles(colorScheme);
  const [activeTab, setActiveTab] = useState('Nutrition');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const colorSchemeListener = (preferences) => {
      setColorScheme(preferences.colorScheme);
    };
    Appearance.addChangeListener(colorSchemeListener);
    return () => {
      Appearance.removeChangeListener(colorSchemeListener);
    };
  }, []);

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
      let historyArray = historyData ? JSON.parse(historyData) : [];
      historyArray = historyArray.reverse(); // Reverse to show newest first
      setHistory(historyArray);
      console.log('Entire history array:', JSON.stringify(historyArray, null, 2));
    } catch (e) {
      console.error('Error loading history: ', e);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffSeconds = Math.floor(diffTime / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    let dateText = '';

    if (diffSeconds < 30) {
      dateText = 'Just now';
    } else if (diffSeconds < 60) {
      dateText = `${diffSeconds} seconds ago`;
    } else if (diffMinutes < 60) {
      dateText = `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      dateText = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays === 1) {
      dateText = `Yesterday at ${timeString}`;
    } else if (diffDays < 7) {
      dateText = `${date.toLocaleDateString([], { weekday: 'long' })} at ${timeString}`;
    } else if (diffWeeks === 1) {
      dateText = `Last week on ${date.toLocaleDateString([], { weekday: 'long' })} at ${timeString}`;
    } else if (diffWeeks < 4) {
      dateText = `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
    } else if (diffMonths < 12) {
      dateText = `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
    } else if (diffYears === 1) {
      dateText = `Last year on ${formattedDate}`;
    } else {
      dateText = `${diffYears} years ago on ${formattedDate}`;
    }

    const maxLength = 25;
    if (dateText.length > maxLength) {
      const words = dateText.split(' ');
      let lines = [];
      let currentLine = '';

      words.forEach(word => {
        if ((currentLine + word).length > maxLength) {
          lines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          currentLine += word + ' ';
        }
      });

      if (currentLine) {
        lines.push(currentLine.trim());
      }

      return lines;
    }

    return [dateText];
  };

  const deleteEntry = async (date) => {
    Alert.alert(
      'Delete Food',
      'Are you sure you want to delete this history item?',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Cancel Pressed'),
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const updatedHistory = history.filter(item => item.date !== date);
              await AsyncStorage.setItem('@product_history', JSON.stringify(updatedHistory.reverse()));
              setHistory(updatedHistory);
              console.log('Entry deleted successfully.');
            } catch (e) {
              console.error('Error deleting entry: ', e);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadHistory().then(() => setRefreshing(false));
  }, []);

  function truncateString(str, num) {
    if (str.length > num) {
      return str.slice(0, num) + '...';
    } else {
      return str;
    }
  }

  const clearHistory = async () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to permanently delete all scan history?',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Cancel History Pressed'),
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('@product_history');
              setHistory([]);
              console.log('History cleared successfully.');
            } catch (e) {
              console.error('Error clearing history: ', e);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  };

  const handleTabPress = (tab) => {
    setActiveTab(tab);
  };

  const renderNutritionTab = (item) => {
    const nutrients = item.nutrients;

    return (
      <View style={styles.tabContentContainer}>
        {nutrients.calories && renderNutrientRow('Calories', nutrients.calories)}
        {renderSeparator()}
        {nutrients.proteins && renderNutrientRow('Proteins', nutrients.proteins)}
        {renderSeparator()}
        {nutrients.carbohydrates && renderNutrientRow('Carbohydrates', nutrients.carbohydrates)}
        {renderSeparator()}
        {nutrients.fats && renderNutrientRow('Fat', nutrients.fats)}
        {renderSeparator()}
        {nutrients.fiber && renderNutrientRow('Fiber', nutrients.fiber)}
        {renderSeparator()}
        {nutrients.sodium && renderNutrientRow('Sodium', nutrients.sodium)}
      </View>
    );
  };

  const renderNutrientRow = (label, data) => {
    if (!data || data.amount === undefined) {
      return (
        <View style={styles.nutrientRow}>
          <Text style={styles.nutrientLabel}>{label}</Text>
          <Text style={styles.nutrientValue}>N/A</Text>
        </View>
      );
    }
    return (
      <View style={styles.nutrientRow}>
        <Text style={styles.nutrientLabel}>{label}</Text>
        <Text style={styles.nutrientValue}>
          {data.amount}{' '}
          {label === 'Calories' ? 'kcal' : label === 'Sodium' ? 'mg' : 'g'} (±
          {data.marginOfErrorPercent}%)
        </Text>
      </View>
    );
  };

  const renderSeparator = () => <View style={styles.separator} />;

  const renderIngredientsTab = (item) => {
    const nutrients = item.nutrients;
    return (
      <View style={styles.tabContentContainer}>
        <Text style={styles.ingredientDescriptionNote}>
          Click the name of the ingredient to learn more about it.
        </Text>
        {nutrients.ingredients.map((ingredient, index) => (
          <React.Fragment key={index}>
            <View style={styles.ingredientItem}>
              <TouchableOpacity onPress={() => Linking.openURL(ingredient.wikipediaLink)}>
                <Text style={styles.ingredientName}>{ingredient.name}</Text>
              </TouchableOpacity>
              <Text style={styles.ingredientDescription}>{ingredient.description}</Text>
            </View>
            {index < nutrients.ingredients.length - 1 && renderSeparator()}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const renderDetailsTab = (item) => {
    const nutrients = item.nutrients;
    return (
      <View style={styles.tabContentContainer}>
        <Text style={styles.detailText}>{nutrients.details.summary}</Text>
        <Text style={styles.detailPrepTime}>Prep Time: {nutrients.details.prepTime}</Text>
        <Text style={styles.detailServingSize}>Serving Size: {nutrients.details.servingSize}</Text>
        {renderSeparator()}
        <TouchableOpacity onPress={() => Linking.openURL(nutrients.details.wikipediaLink)}>
          <Text style={styles.wikipediaLink}>Learn more on Wikipedia</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTitleSeparator = () => <View style={styles.separatorTitle} />;

  const renderSubtitle = () => {
    if (history.length < 4) {
      return (
        <Text style={styles.subtitle}>
          Results from the last 28 days will be used to personalize your app.
        </Text>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.historyTitle}>History</Text>
      <TouchableOpacity style={styles.iconButton} onPress={clearHistory}>
        <SymbolView
          name="trash.slash.fill"
          size={26}
          tintColor={colorScheme === 'dark' ? '#fff' : '#fff'}
          type="hierarchical"
          style={styles.symbol}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.iconButton, styles.debugButton]}
        onPress={() => navigation.navigate('DebugScreen', { history, setHistory })}
      >
        <SymbolView
          name="wrench.and.screwdriver.fill"
          size={26}
          tintColor={colorScheme === 'dark' ? '#fff' : '#fff'}
          type="hierarchical"
          style={styles.symbol}
        />
      </TouchableOpacity>
      {history.length > 0 ? (
        <ScrollView
          style={styles.scrollContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {history.map((item, index) => (
            <View key={index} style={styles.cardContainer}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => {
                  setSelectedItem(item);
                  setActiveTab('Nutrition');
                }}
              >
                <Image source={{ uri: item.imageUri }} style={styles.productImage} />
                <View style={styles.info}>
                  <Text style={styles.productName}>{item.productName}</Text>
                  {formatDate(item.date).map((line, lineIndex) => (
                    <Text key={lineIndex} style={styles.date}>
                      {line}
                    </Text>
                  ))}
                </View>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteEntry(item.date)}>
                  <SymbolView
                    name="trash.slash.fill"
                    size={26}
                    tintColor={colorScheme === 'dark' ? '#fff' : '#000'}
                    type="hierarchical"
                    style={styles.symbol}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          ))}
          {renderSubtitle()}
        </ScrollView>
      ) : (
        <Text style={styles.emptyText}>
          Your history is currently empty. Items you scan will appear here.
        </Text>
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
              {truncateString(selectedItem.productName, 20)}
            </Text>
            <Text style={styles.dateModal}>{formatDate(selectedItem.date)}</Text>
            <Image source={{ uri: selectedItem.imageUri }} style={styles.imagePreview} />
            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'Nutrition' && styles.activeTabButton,
                ]}
                onPress={() => handleTabPress('Nutrition')}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'Nutrition' && styles.activeTabButtonText,
                  ]}
                >
                  Nutrition
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'Ingredients' && styles.activeTabButton,
                ]}
                onPress={() => handleTabPress('Ingredients')}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'Ingredients' && styles.activeTabButtonText,
                  ]}
                >
                  Ingredients
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'Details' && styles.activeTabButton,
                ]}
                onPress={() => handleTabPress('Details')}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'Details' && styles.activeTabButtonText,
                  ]}
                >
                  Details
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.nutrientContainer}>
              {activeTab === 'Nutrition' && renderNutritionTab(selectedItem)}
              {activeTab === 'Ingredients' && renderIngredientsTab(selectedItem)}
              {activeTab === 'Details' && renderDetailsTab(selectedItem)}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
};

const getDynamicStyles = (colorScheme) =>
  StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 20,
        backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
    },
    scrollContainer: {
        width: '100%',
        marginTop: '5%',
        padding: '3%',
    },
    card: {
        flexDirection: 'row',
        backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f3f3f3',
        padding: 13,
        marginVertical: 6,
        borderRadius: 25,
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
        color: colorScheme === 'dark' ? '#888' : '#7a7a7a',
        marginTop: 3,
        marginLeft: 1,
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
        backgroundColor: colorScheme === 'dark' ? '#111' : '#FFF',
        borderRadius: isIphoneSE() ? 15 : 48,
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
        marginBottom: '3%',
        fontWeight: 'bold',
        top: '0.3%',
        color: colorScheme === 'dark' ? '#fff' : '#000',
    },
    imagePreview: {
        width: '100%',
        height: isIphoneSE() ? 200 : 300,
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
        right: '6%',  // 6.5% from the right edge of the screen
        top: isIphoneSE() ? '5%' : '8%',
        padding: 10,
        zIndex: 1,  // Ensure it stays on top of other components if needed
        backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#000',
        borderRadius: 15,
    },
    historyTitle: {
        marginTop: isIphoneSE() ? '5%' : '12%',
        fontSize: 28,
        fontWeight: 'bold',
        color: colorScheme === 'dark' ? '#fff' : '#000',
        textAlign: 'center',
    },
    separatorTitle: {
        height: 5,
        width: 300,
        backgroundColor: '#333',
        marginVertical: 20,
        borderRadius: 900,
      },
    separator: {
        height: 4,
        backgroundColor: colorScheme === 'dark' ? '#333333' : '#CCCCCC',
        marginVertical: 8,
        marginBottom: 16,
        borderRadius: 900,
    },
    deleteButton: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        backgroundColor: colorScheme === 'dark' ? '#161618' : '#ddd',
        borderRadius: 15,
    },
    debugButton: {
        position: 'absolute', // Corrected to 'absolute' for exact placement
        right: '84%',  // 6.5% from the right edge of the screen
        top: isIphoneSE() ? '5%' : '8%',
        padding: 10,
        zIndex: 1,  // Ensure it stays on top of other components if needed
        backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#000',
        borderRadius: 15,
    },
    subtitle: {
        fontSize: 16,
        color: '#888888',
        textAlign: 'center',
        marginTop: 40,
        marginBottom: 35,
        marginHorizontal: 25,
    },
    tabContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f0f0f0',
      marginHorizontal: 15,
      borderRadius: 13,
      paddingVertical: 4,
      paddingHorizontal: 50,
    },
    tabButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    activeTabButton: {
      borderBottomWidth: 2,
      borderBottomColor: colorScheme === 'dark' ? '#FFFFFF' : '#000',
    },
    tabButtonText: {
      color: '#888888',
      fontSize: 16,
      fontWeight: colorScheme === 'dark' ? '400' : '500',
    },
    activeTabButtonText: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontWeight: colorScheme === 'dark' ? '400' : '500',
    },
    tabContentContainer: {
      backgroundColor: colorScheme === 'dark' ? '#1a1a1b' : '#F0F0F0',
      borderRadius: 15,
      padding: 16,
      marginBottom: 16,
    },
    nutrientRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 2,
    },
    nutrientLabel: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontSize: 17,
      fontWeight: '400',
    },
    nutrientValue: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontSize: 16,
      fontWeight: '500',
    },
    ingredientDescriptionNote: {
      color: colorScheme === 'dark' ? '#888888' : '#888888',
      fontSize: 14,
      marginBottom: 10,
      textAlign: 'center',
    },
    ingredientItem: {
      marginBottom: 5,
    },
    ingredientName: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    ingredientDescription: {
      color: colorScheme === 'dark' ? '#888888' : '#888888',
      fontSize: 14,
    },
    detailText: {
      color: colorScheme === 'dark' ? '#ccc' : '#555',
      fontSize: 16,
      marginBottom: 20,
    },
    detailPrepTime: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 8,
    },
    detailServingSize: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 8,
    },
    wikipediaLink: {
      color: '#3498DB',
      fontSize: 16,
      textDecorationLine: 'underline',
      marginTop: 0,
    },
    dateModal: {
        fontSize: 16,
        color: '#888888',
        textAlign: 'center',
        marginBottom: '4%',
    },
});

export default HistoryScreen;