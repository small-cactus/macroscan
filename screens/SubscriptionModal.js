import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Animated,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const subscriptionFeatures = [
    {
      title: "Never set goals again",
      description: "Choose some preferences, input some personal data, and Smart Coach figures out the rest.",
      image: require("../assets/goals.jpg"), // Replace with actual image
    },
    {
      title: "AI powered Smart Coach",
      description: "Smart Coach gives you real, actionable advice that no other assistant can give you, well... except a real coach.",
      image: require("../assets/smartcoach.jpg"), // Replace with actual image
    },
    {
      title: "Dynamic Goal Tracking Dashboard",
      description: "Visualize your progress with interactive goal rings for each macronutrient. Your dashboard refreshes daily, and your rings are shown based on importance.",
      image: require("../assets/rings.png"), // Replace with actual image
    },
    {
      title: "Adaptive Nutrition Planner",
      description: "Smart Coach analyzes your entire day's eating habits, and gives you a real-time macro by macro analysis everyday. Smart Coach even recommends specific foods to meet your goals.",
      image: require("../assets/nutrients.jpg"), // Replace with actual image
    }
  ];

const SubscriptionModal = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);

  const [modalVisible, setModalVisible] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(new Array(subscriptionFeatures.length).fill(false));
  const [animatedTexts, setAnimatedTexts] = useState(new Array(subscriptionFeatures.length).fill(""));
  const [imageDimensions, setImageDimensions] = useState([]);
  const imageOpacities = useRef(subscriptionFeatures.map(() => new Animated.Value(0))).current;

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem('@user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.subscriptionStatus) {
          switch (parsedUser.subscriptionStatus) {
            case 'plusplus':
            case 'plus':
              setModalVisible(false);
              break;
            case 'remove_ads_one_time':
            default:
              setModalVisible(true);
              break;
          }
        } else {
          setModalVisible(true);
        }
      } else {
        setModalVisible(true);
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkSubscriptionStatus();
    }, [checkSubscriptionStatus])
  );

  const fadeInImage = (index) => {
    imageOpacities[index].setValue(0);
    Animated.timing(imageOpacities[index], {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const toggleFeature = index => {
    let updatedFeatures = [...featuresOpen];
    updatedFeatures[index] = !updatedFeatures[index];
    setFeaturesOpen(updatedFeatures);
    if (!updatedFeatures[index]) {
      setAnimatedTexts(texts => ({...texts, [index]: ""}));
      imageOpacities[index].setValue(0);
    } else {
      animateText(index, subscriptionFeatures[index].description);
      fadeInImage(index);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const animateText = (index, fullText) => {
    let i = 0;
    const interval = setInterval(() => {
      setAnimatedTexts(texts => ({...texts, [index]: fullText.substring(0, i + 1)}));
      i++;
      if (i === fullText.length) clearInterval(interval);
    }, 1);
  };

  useEffect(() => {
    subscriptionFeatures.forEach((feature, index) => {
      Image.getSize(Image.resolveAssetSource(feature.image).uri, (width, height) => {
        setImageDimensions(prev => {
          const newDimensions = [...prev];
          newDimensions[index] = { width, height };
          return newDimensions;
        });
      });
    });
  }, []);

  const getImageStyle = (index) => {
    if (imageDimensions[index]) {
      const { width, height } = imageDimensions[index];
      const screenWidth = Dimensions.get('window').width;
      const maxWidth = screenWidth * 0.85;
      const scaleFactor = maxWidth / width;
      return {
        width: maxWidth,
        height: height * scaleFactor,
      };
    } else {
      return styles.defaultImageSize;
    }
  };

  const handleHomeNavigation = () => {
    navigation.navigate('HomeTabs', { screen: 'Account' });
    setModalVisible(false);
  };

  if (!modalVisible) {
    return null;
  }

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => {}}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container}>
          <Text style={styles.title}>Subscription Required</Text>
          <View style={styles.content}>
            <Text style={styles.description}>
              To access insights, you need to be a paying subscriber to MacroScan+ or MacroScan++, click through the options below to see the benefits of Insights.
            </Text>
            {subscriptionFeatures.map((feature, index) => (
              <View key={index} style={styles.featureItemContainer}>
                <TouchableOpacity style={styles.featureTitleContainer} onPress={() => toggleFeature(index)}>
                  <Ionicons name={featuresOpen[index] ? "remove" : "add"} size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                </TouchableOpacity>
                {featuresOpen[index] && (
                  <View>
                    <Text style={styles.featureDescription}>{animatedTexts[index]}</Text>
                    <View style={styles.imageContainer}>
                      <Animated.Image 
                        source={feature.image} 
                        style={[
                          styles.featureImage, 
                          getImageStyle(index),
                          { opacity: imageOpacities[index] }
                        ]} 
                      />
                    </View>
                  </View>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.subscribeButton} onPress={handleHomeNavigation}>
              <Text style={styles.subscribeButtonText}>Check our offers</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const getDynamicStyles = (colorScheme) => {
    const screenWidth = Dimensions.get('window').width;
  
    return StyleSheet.create({
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
      description: {
        fontSize: 16,
        color: colorScheme === 'dark' ? '#EEE' : '#666',
        textAlign: 'center',
        marginBottom: '5%',
      },
      featureItemContainer: {
        marginBottom: '3%',
        backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#eee',
        borderRadius: 10,
        overflow: 'hidden',
      },
      featureTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: '2%',
        paddingRight: 10,
        paddingLeft: 5,
      },
      featureTitle: {
        fontSize: 18,
        fontWeight: '500',
        color: colorScheme === 'dark' ? '#FFF' : '#000',
        marginLeft: '2%',
        flexShrink: 1,
      },
      featureDescription: {
        fontSize: 16,
        color: colorScheme === 'dark' ? '#e1e1e1' : '#2a2a2d',
        paddingHorizontal: '5%',
        paddingTop: '1%',
        paddingBottom: '3%',
      },
      imageContainer: {
        alignSelf: 'center',
        marginBottom: '3%',
        borderRadius: 15,
        overflow: 'hidden',
      },
      featureImage: {
        resizeMode: 'contain',
      },
      subscribeButton: {
        marginTop: 20,
        backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
        borderRadius: 90,
        padding: 15,
        alignItems: 'center',
        justifyContent: 'center',
      },
      subscribeButtonText: {
        color: colorScheme === 'dark' ? '#fff' : '#fff',
        fontSize: 16,
        fontWeight: 'bold'
      },
      defaultImageSize: {
        width: screenWidth * 0.8,
        height: (screenWidth * 0.8) * (16/9),
      },
      blurContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
    });
  };
  
  export default SubscriptionModal;