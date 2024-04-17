import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Appearance } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

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
      answer: "MacroScan is a mobile application that allows you to scan images of food items to quickly and easily determine their macronutrient content, including fats, proteins, and carbohydrates."
    },
    {
      question: "How does MacroScan work?",
      answer: "Simply take a photo of your meal using MacroScan, and it will analyze the image to estimate the macronutrient values of the food. The app uses advanced image recognition and machine learning technology to identify food items and calculate their nutrients."
    },
    {
      question: "Do I need to photograph the nutrition label for accurate results?",
      answer: "No, you do not need to photograph the nutrition label for MacroScan to work. However, if you do include the nutrition label in your photo, MacroScan can provide more precise nutrient information."
    },
    {
      question: "How accurate is MacroScan?",
      answer: "MacroScan is always within 80% of the real macronutrient content of your food. The accuracy may vary based on the quality of the image and the visibility of the food items."
    },
    {
      question: "Can MacroScan identify all types of food?",
      answer: "MacroScan can identify a wide range of common foods and dishes. However, its ability to recognize highly unusual or complex dishes may be limited."
    },
    {
      question: "Is there a limit to how many foods I can scan in a day?",
      answer: "Yes, there is a 5 scan a day limit to how many times you can use MacroScan in a day on the free plan. MacroScan+ and MacroScan++ remove the daily limit."
    },
    {
      question: "What should I do if MacroScan does not recognize a food item?",
      answer: "If MacroScan struggles to recognize a food item, try taking a clearer picture with better lighting."
    },
    {
      question: "Can I save my meal history in MacroScan?",
      answer: "Yes, MacroScan automatically saves and tracks the nutrient content of every meal you scan. This feature helps you keep track of your daily intake and nutritional goals. You can delete the history at any time."
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
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#CCC',
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
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    marginLeft: '2%',
    flexShrink: 1, // Allow text to shrink to prevent overflow
  },
  answer: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#e1e1e1' : '#2a2a2a',
    paddingLeft: '7%',
    paddingRight: '5%',
    paddingTop: '1%',
    paddingBottom: '3%',
    borderRadius: 50,
  },
  contactButton: {
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#000',
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
    top: '9%',  // 20% from the top of the screen
    zIndex: 10, // Ensures the button is clickable over other elements
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#FFFFFF',
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
