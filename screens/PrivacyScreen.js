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
        answer: "MacroScan collects your name, email, and subscription status. Each user has a unique ID, which is a long, random code that can't be guessed and isn't linked to your personal details. This ID is stored only on your device and in our secure cloud storage. It's used to manage your account and data."
    },
    {
        question: "How does MacroScan handle my photos?",
        answer: "Photos taken in MacroScan are sent to our partner, Anthropic, for macronutrient analysis. These photos are stored on your device for your history feature. When you delete your history or uninstall the app, all photos of food taken or imported into MacroScan are permanently deleted from the app. Any other photos on your device remain unaffected."
    },
    {
        question: "Can I delete data stored by MacroScan?",
        answer: "Yes, you can delete your data anytime. Just uninstall the app, delete your scan history, or delete your account from the settings. All your data will be permanently removed from the app."
    },
    {
        question: "How can I ensure my data remains private?",
        answer: "Your data is safe because it is stored securely. The only way someone could access your data would be to steal your device or try every possible combination of user IDs, which is practically impossible and would take millions of years."
    },
    {
        question: "Who can see my information?",
        answer: "Only MacroScan staff can see the information we store, and we make sure no sensitive details are kept. For anyone else to see your information, they would need every user's unique ID, which is securely stored on your device and in our system, making unauthorized access virtually impossible."
    }
];

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
      </TouchableOpacity>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Privacy</Text>
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
      faqItem: {
        marginBottom: '3%',
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

export default PrivacyScreen;
