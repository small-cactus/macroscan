// SupportScreen.js
import React, { useState, useCallback } from 'react';
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
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AnimatedAnswer from './AnimatedAnswer'; // Ensure the correct path

const { width, height } = Dimensions.get('window');

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
      dim =>
        (width === dim.width && height === dim.height) ||
        (width === dim.height && height === dim.width)
    )
  );
};

const SupportScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);

  const [faqOpen, setFaqOpen] = useState(new Array(10).fill(false));

  const handleContactPress = useCallback(() => {
    const email = 'macroscan.help@gmail.com';
    const subject = encodeURIComponent('Support Request');
    const body = encodeURIComponent('Please describe your issue or question:');
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  }, []);

  const toggleFaq = useCallback(
    index => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setFaqOpen(prevFaqOpen => {
        const updatedFaqs = [...prevFaqOpen];
        updatedFaqs[index] = !updatedFaqs[index];
        return updatedFaqs;
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    []
  );

  const faqQuestions = [
    {
      question: 'What is MacroScan?',
      answer:
        'MacroScan is a mobile app that helps you determine the macronutrient content (fats, proteins, and carbohydrates) of your food by simply taking a photo.',
    },
    {
      question: 'How does MacroScan work?',
      answer:
        'Just snap a picture of your meal with MacroScan, and it will estimate the macronutrient values using advanced image recognition and machine learning.',
    },
    {
      question: 'Do I need to photograph the nutrition label for accurate results?',
      answer:
        'No, photographing the nutrition label is not necessary. However, including it can improve the accuracy of the nutrient information.',
    },
    {
      question: 'How accurate is MacroScan?',
      answer:
        'MacroScan is typically within 80% accuracy of the actual macronutrient content. The precision can vary based on image quality and clarity of the food items.',
    },
    {
      question: 'Can MacroScan identify all types of food?',
      answer:
        'Yes, MacroScan can identify a wide variety of foods. For best results, try to scan one food item at a time.',
    },
    {
      question: 'Is there a limit to how many foods I can scan in a day?',
      answer:
        'Yes, on the free plan you can scan up to 5 times a day. Upgrading to MacroScan++ removes this limit and gives you unlimited scans. All users get unlimited scans on their first day.',
    },
    {
      question: 'What should I do if MacroScan does not recognize a food item?',
      answer:
        "Try taking a clearer picture with better lighting. Including the packaging, writing the food name on paper, or using the 'Did we get this right?' button can also help.",
    },
    {
      question: 'Can I save my meal history in MacroScan?',
      answer:
        'Yes, MacroScan saves the nutrient data from each scan, which you can access later in the history tab. You can delete this history at any time.',
    },
    {
      question: 'Can MacroScan estimate all types of macronutrients?',
      answer:
        'Yes, MacroScan can estimate various macronutrients. We focus on the most important ones to keep the app user-friendly. You can request additional macros via support.',
    },
    {
      question: 'What if the quantity of items shown is wrong?',
      answer:
        "Sometimes the quantity might be incorrect, but the nutrient data will still be right. Use the 'Did we get this right?' button to update it without using a scan.",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
        </TouchableOpacity>
        <Text style={styles.title}>Support</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.description}>
            If you can't find what you're looking for in the FAQ below, don't hesitate to contact us.
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={handleContactPress}>
            <Ionicons name="mail-outline" size={20} color="#FFF" style={styles.contactButtonIcon} />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>

          <Text style={styles.faqHeader}>Frequently Asked Questions</Text>
          {faqQuestions.map((faq, index) => (
            <View key={index} style={styles.faqItemContainer}>
              <TouchableOpacity style={styles.faqTitleContainer} onPress={() => toggleFaq(index)}>
                <Ionicons
                  name={faqOpen[index] ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={colorScheme === 'dark' ? '#FFF' : '#000'}
                />
                <Text style={styles.faqTitle}>{faq.question}</Text>
              </TouchableOpacity>
              {faqOpen[index] && <AnimatedAnswer text={faq.answer} colorScheme={colorScheme} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getDynamicStyles = colorScheme =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: isIphoneSE() ? 12 : 16,
      paddingBottom: 8,
      paddingHorizontal: '5%',
      backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: '5%',
    },
    title: {
      flex: 1,
      fontSize: 32, // Updated to match AboutScreen's title size
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      textAlign: 'center',
      marginRight: 40, // Width of back button to maintain center alignment
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
    contactButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#000', // Matching actionButton color
      borderRadius: 15,
      padding: 16,
      marginBottom: 20,
      width: '100%',
      justifyContent: 'center',
    },
    contactButtonIcon: {
      marginRight: 8,
    },
    contactButtonText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
    },
    faqHeader: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      marginBottom: '4%',
    },
    faqItemContainer: {
      marginBottom: '3%',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7', // Matching changelogContainer background
      borderRadius: 16,
      padding: 16,
    },
    faqTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    faqTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      marginLeft: 8,
      flexShrink: 1,
    },
    backButton: {
      backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#FFFFFF',
      borderRadius: 140,
      padding: 10,
      // Removed marginRight
      borderWidth: 2,
      borderColor: colorScheme === 'dark' ? '#2a2a2d' : '#eee',
    },
  });

export default SupportScreen;