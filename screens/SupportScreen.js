import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Appearance,
  Dimensions,
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

const SupportScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);

  const [faqOpen, setFaqOpen] = useState(new Array(8).fill(false));
  const [animatedTexts, setAnimatedTexts] = useState(new Array(8).fill(""));

  const handleContactPress = () => {
    const email = "macroscan.help@gmail.com";
    const subject = encodeURIComponent("Support Request");
    const body = encodeURIComponent("Please describe your issue or question:");
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const toggleFaq = index => {
    let updatedFaqs = [...faqOpen];
    updatedFaqs[index] = !updatedFaqs[index];
    setFaqOpen(updatedFaqs);
    if (!updatedFaqs[index]) {
      setAnimatedTexts(texts => ({...texts, [index]: ""}));
    } else {
      animateText(index, faqQuestions[index].answer);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const animateText = (index, fullText) => {
    let i = 0;
    const interval = setInterval(() => {
      setAnimatedTexts(texts => ({...texts, [index]: fullText.substring(0, i + 1)}));
      i++;
      if (i === fullText.length) clearInterval(interval);
    }, 1); // Speed of typing can be adjusted here
  };

  const faqQuestions = [
    {
      question: "What is MacroScan?",
      answer: "MacroScan is a mobile app that helps you determine the macronutrient content (fats, proteins, and carbohydrates) of your food by simply taking a photo."
    },
    {
      question: "How does MacroScan work?",
      answer: "Just snap a picture of your meal with MacroScan, and it will estimate the macronutrient values using advanced image recognition and machine learning."
    },
    {
      question: "Do I need to photograph the nutrition label for accurate results?",
      answer: "No, photographing the nutrition label is not necessary. However, including it can improve the accuracy of the nutrient information."
    },
    {
      question: "How accurate is MacroScan?",
      answer: "MacroScan is typically within 80% accuracy of the actual macronutrient content. The precision can vary based on image quality and clarity of the food items."
    },
    {
      question: "Can MacroScan identify all types of food?",
      answer: "Yes, MacroScan can identify a wide variety of foods. For best results, try to scan one food item at a time."
    },
    {
      question: "Is there a limit to how many foods I can scan in a day?",
      answer: "Yes, on the free plan you can scan up to 5 times a day. Upgrading to MacroScan++ removes this limit and gives you unlimited scans. All users get unlimited scans on their first day."
    },
    {
      question: "What should I do if MacroScan does not recognize a food item?",
      answer: "Try taking a clearer picture with better lighting. Including the packaging, writing the food name on paper, or using the 'Did we get this right?' button can also help."
    },
    {
      question: "Can I save my meal history in MacroScan?",
      answer: "Yes, MacroScan saves the nutrient data from each scan, which you can access later in the history tab. You can delete this history at any time."
    },
    {
      question: "Can MacroScan estimate all types of macronutrients?",
      answer: "Yes, MacroScan can estimate various macronutrients. We focus on the most important ones to keep the app user-friendly. You can request additional macros via support."
    },
    {
      question: "What if the quantity of items shown is wrong?",
      answer: "Sometimes the quantity might be incorrect, but the nutrient data will still be right. Use the 'Did we get this right?' button to update it without using a scan."
    }
  ];
  

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
      </TouchableOpacity>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Support</Text>
        <View style={styles.content}>
          <Text style={styles.description}>
            If you can't find what you're looking for in the FAQ below, don't hesitate to contact us.
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={handleContactPress}>
            <Text style={styles.contactButtonText}>Contact Us</Text>
          </TouchableOpacity>
          <Text style={styles.faqHeader}>Frequently Asked Questions</Text>
          {faqQuestions.map((faq, index) => (
            <View key={index} style={styles.faqItemContainer}>
              <TouchableOpacity style={styles.faqTitleContainer} onPress={() => toggleFaq(index)}>
                <Ionicons name={faqOpen[index] ? "remove" : "add"} size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
                <Text style={styles.faqTitle}>{faq.question}</Text>
              </TouchableOpacity>
              {faqOpen[index] && (
                <Text style={styles.answer}>{animatedTexts[index]}</Text>
              )}
            </View>
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
  description: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#EEE' : '#666',
    textAlign: 'center',
    marginBottom: '5%',
  },
  faqHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    marginBottom: '4%',
  },
  faqItem: {
    marginBottom: '3%',
  },
  faqItemContainer: {
    marginBottom: '3%',
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#eee',
    borderRadius: 10,
    overflow: 'hidden',
  },
  faqTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: '2%',
    paddingRight: 10,
    paddingLeft: 5,
  },
  faqTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    marginLeft: '2%',
    flexShrink: 1, // Allow text to shrink to prevent overflow
  },
  answer: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#e1e1e1' : '#2a2a2d',
    paddingLeft: '7%',
    paddingRight: '5%',
    paddingTop: '1%',
    paddingBottom: '3%',
    borderRadius: 50,
  },
  contactButton: {
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
    borderRadius: 90,
    padding: 10,
    alignItems: 'center', // Center text horizontally
    justifyContent: 'center', // Center text vertically
  },
  contactButtonText: {
    color: colorScheme === 'dark' ? '#fff' : '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  backButton: {
    position: 'absolute', // Corrected to 'absolute' for exact placement
    left: '5%',  // 5% from the right edge of the screen
    top: isIphoneSE() ? '5%' : '9%',  // 20% from the top of the screen
    zIndex: 10, // Ensures the button is clickable over other elements
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
    padding: 10,
  },
});

export default SupportScreen;
