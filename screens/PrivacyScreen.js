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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const PrivacyScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);

  const [faqOpen, setFaqOpen] = useState(new Array(4).fill(false));
  const [animatedTexts, setAnimatedTexts] = useState(new Array(4).fill(""));

  const handleContactPress = () => {
    const email = "macroscan.help@gmail.com";
    const subject = encodeURIComponent("Privacy Inquiry");
    const body = encodeURIComponent("Please describe your privacy concern or question:");
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
      question: "What personal data does MacroScan collect?",
      answer: "MacroScan collects no personal data. All app functionalities except image processing are processed on-device, even your account login, history, and settings are all saved locally, that means nothing is available for us or anyone else to see."
    },
    {
      question: "How does MacroScan handle my photos?",
      answer: "Photos taken in MacroScan are sent to our partner, Anthropic, for macronutrient analysis via their vision models. These photos are used solely for this purpose and are not stored or used after processing for any other purposes."
    },
    {
      question: "Can I delete data stored by MacroScan?",
      answer: "Since all data is stored locally on your device, you can delete it at any time by uninstalling the app, deleting scan history, or deleting your account from the corresponding screens."
    },
    {
      question: "How can I ensure my data remains private?",
      answer: "Since we don't store any data in the cloud, the only way for someone to steal your data, would be to physically steal your device and open MacroScan."
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
      </TouchableOpacity>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Privacy and Security</Text>
        <View style={styles.content}>
          <Text style={styles.description}>
            If you have any privacy concerns, even small ones, feel free to reach out to us.
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={handleContactPress}>
            <Text style={styles.contactButtonText}>Contact Us About Privacy Concerns</Text>
          </TouchableOpacity>
          <Text style={styles.faqHeader}>Frequently Asked Privacy Questions</Text>
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
  faqItemContainer: {
    marginBottom: '3%',
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#eee',
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
    color: colorScheme === 'dark' ? '#e1e1e1' : '#2a2a2a',
    paddingLeft: '7%',
    paddingRight: '5%',
    paddingTop: '1%',
    paddingBottom: '3%',
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
    position: 'absolute',
    left: '5%',
    top: '9%',
    zIndex: 10,
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

export default PrivacyScreen;
