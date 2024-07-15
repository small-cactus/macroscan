import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Linking,
  Appearance,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const isIphoneSE = () => {
  const smallIphoneDimensions = [
    { width: 320, height: 568 }, // iPhone SE (1st generation), iPhone 5, 5S, 5C
    { width: 375, height: 667 }, // iPhone 6, 6S, 7, 8, SE (2nd generation)
    { width: 414, height: 736 }, // iPhone 8 Plus
    { width: 360, height: 640 }, // iPhone SE (2020)
    { width: 375, height: 812 }, // iPhone 12 Mini, iPhone 13 Mini
    { width: 360, height: 780 }, // iPhone 12 Mini, iPhone 13 Mini
  ];

  return (
    Platform.OS === 'ios' &&
    smallIphoneDimensions.some(
      dim => (width === dim.width && height === dim.height) || (width === dim.height && height === dim.width)
    )
  );
};

const cancellationSteps = [
  {
    title: "Open App Store Settings",
    description: "Go to your iPhone's Settings app, and tap on your Apple ID at the top. It's highlighted in white.",
    image: require("../assets/settingsiPhone.jpg"),
  },
  {
    title: "Find Subscription Menu",
    description: "In the list of menus, locate and tap on the Subscriptions menu. It's highlighted in white.",
    image: require("../assets/subscriptionsiPhone.jpg"),
  },
  {
    title: "Find MacroScan Subscription",
    description: "In the list of active subscriptions, locate and tap on MacroScan. It's not in this screenshot, but it should be there for you.",
    image: require("../assets/chooseSubscriptioniPhone.jpg"),
  },
  {
    title: "Canceling your Subscription",
    description: "Tap on Cancel Subscription at the bottom of the screen. Confirm your choice when prompted.",
    image: require("../assets/cancelSubscriptioniPhone.jpg"),
  }
];

const CancelScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);

  const [stepsOpen, setStepsOpen] = useState(new Array(cancellationSteps.length).fill(false));
  const [animatedTexts, setAnimatedTexts] = useState(new Array(cancellationSteps.length).fill(""));
  const [imageDimensions, setImageDimensions] = useState([]);
  const imageOpacities = useRef(cancellationSteps.map(() => new Animated.Value(0))).current;

  const handleContactPress = () => {
    const email = "macroscan.help@gmail.com";
    const subject = encodeURIComponent("Subscription Cancellation Inquiry");
    const body = encodeURIComponent("I need assistance with cancelling my subscription:");
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const fadeInImage = (index) => {
    imageOpacities[index].setValue(0);  // Reset to 0 before fading in
    Animated.timing(imageOpacities[index], {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const resetImageOpacity = (index) => {
    Animated.timing(imageOpacities[index], {
      toValue: 0,
      duration: 0,
      useNativeDriver: true,
    }).start();
  };

  const toggleStep = index => {
    let updatedSteps = [...stepsOpen];
    updatedSteps[index] = !updatedSteps[index];
    setStepsOpen(updatedSteps);
    if (!updatedSteps[index]) {
        setAnimatedTexts(texts => ({...texts, [index]: ""}));
        imageOpacities[index].setValue(0);  // Reset opacity when closing
      } else {
        animateText(index, cancellationSteps[index].description);
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
    cancellationSteps.forEach((step, index) => {
      if (!step.dimensions) {
        Image.getSize(Image.resolveAssetSource(step.image).uri, (width, height) => {
          setImageDimensions(prev => {
            const newDimensions = [...prev];
            newDimensions[index] = { width, height };
            return newDimensions;
          });
        });
      }
    });
  }, []);

  const getImageStyle = (index) => {
    const step = cancellationSteps[index];
    if (step.dimensions) {
      return {
        width: step.dimensions.width,
        height: step.dimensions.height,
      };
    } else if (imageDimensions[index]) {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
      </TouchableOpacity>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Cancel Subscription</Text>
        <View style={styles.content}>
          <Text style={styles.description}>
            We're sorry to see you go. Here's how you can cancel your MacroScan subscription, tap each step below to follow along:
          </Text>
          {cancellationSteps.map((step, index) => (
            <View key={index} style={styles.stepItemContainer}>
              <TouchableOpacity style={styles.stepTitleContainer} onPress={() => toggleStep(index)}>
                <Ionicons name={stepsOpen[index] ? "remove" : "add"} size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
                <Text style={styles.stepTitle}>{step.title}</Text>
              </TouchableOpacity>
              {stepsOpen[index] && (
                <View>
                  <Text style={styles.stepDescription}>{animatedTexts[index]}</Text>
                  <View style={styles.imageContainer}>
                    <Animated.Image 
                      source={step.image} 
                      style={[
                        styles.stepImage, 
                        getImageStyle(index),
                        { opacity: imageOpacities[index] }
                      ]} 
                    />
                  </View>
                </View>
              )}
            </View>
          ))}
          <Text style={styles.noteText}>
            Note: Your subscription will remain active until the end of the current billing period. Don't worry, you won't be charged anything extra.
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={handleContactPress}>
            <Text style={styles.contactButtonText}>Need Help? Contact Us</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
      fontSize: isIphoneSE() ? 24 : 26,
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
      stepItemContainer: {
        marginBottom: '3%',
        backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#eee',
        borderRadius: 10,
        overflow: 'hidden',
      },
      stepTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: '2%',
        paddingRight: 10,
        paddingLeft: 5,
      },
      stepTitle: {
        fontSize: 18,
        fontWeight: '500',
        color: colorScheme === 'dark' ? '#FFF' : '#000',
        marginLeft: '2%',
        flexShrink: 1,
      },
      stepDescription: {
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
      stepImage: {
        resizeMode: 'contain',
      },
      noteText: {
        fontSize: 14,
        fontStyle: 'italic',
        color: colorScheme === 'dark' ? '#BBB' : '#666',
        textAlign: 'center',
        marginTop: '5%',
        marginBottom: '3%',
      },
      contactButton: {
        marginTop: 10,
        backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
        borderRadius: 90,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
      },
      contactButtonText: {
        color: colorScheme === 'dark' ? '#fff' : '#fff',
        fontSize: 16,
        fontWeight: 'bold'
      },
      backButton: {
        position: 'absolute',
        left: '5%',
        top: isIphoneSE() ? '5%' : '9%',
        zIndex: 10,
        backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#FFFFFF',
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 5,
        padding: 10,
      },
      defaultImageSize: {
        width: screenWidth * 0.8,
        height: (screenWidth * 0.8) * (16/9),
      },
    });
  };

export default CancelScreen;