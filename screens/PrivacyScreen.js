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

const PrivacyScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);

  const faqQuestions = [
    {
      question: 'What personal data does MacroScan collect?',
      answer:
        "MacroScan collects your name, email, and subscription status. Each user has a unique ID, which is a long, random code that can't be guessed and isn't linked to your personal details. This ID is stored only on your device and in our secure cloud storage. It's used to manage your account and data.",
    },
    {
      question: 'How does MacroScan handle my photos?',
      answer:
        'Photos taken in MacroScan are sent to our partner, Anthropic, for macronutrient analysis. These photos are stored on your device for your history feature. When you delete your history or uninstall the app, all photos of food taken or imported into MacroScan are permanently deleted from the app. Any other photos on your device remain unaffected.',
    },
    {
      question: 'Can I delete data stored by MacroScan?',
      answer:
        'Yes, you can delete your data anytime. Just uninstall the app, delete your scan history, or delete your account from the settings. All your data will be permanently removed from the app.',
    },
    {
      question: 'How can I ensure my data remains private?',
      answer:
        'Your data is safe because it is stored securely. The only way someone could access your data would be to steal your device or try every possible combination of user IDs, which is practically impossible and would take millions of years.',
    },
    {
      question: 'Who can see my information?',
      answer:
        "Only MacroScan staff can see the information we store, and we make sure no sensitive details are kept. For anyone else to see your information, they would need every user's unique ID, which is securely stored on your device and in our system, making unauthorized access virtually impossible.",
    },
  ];

  const [faqOpen, setFaqOpen] = useState(new Array(faqQuestions.length).fill(false));

  const handleContactPress = useCallback(() => {
    const email = 'macroscan.help@gmail.com';
    const subject = encodeURIComponent('Privacy Inquiry');
    const body = encodeURIComponent('Please describe your privacy concern or question:');
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  }, []);

  const handlePolicyPress = useCallback(() => {
    const policyUrl = 'https://sites.google.com/view/macroscanprivacy/home';
    Linking.openURL(policyUrl);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.description}>
            If you have any privacy concerns, even small ones, feel free to reach out to us.
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={handleContactPress}>
            <Ionicons name="mail-outline" size={20} color="#FFF" style={styles.contactButtonIcon} />
            <Text style={styles.contactButtonText}>Contact Us About Privacy Concerns</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactButton} onPress={handlePolicyPress}>
            <Ionicons name="document-outline" size={20} color="#FFF" style={styles.contactButtonIcon} />
            <Text style={styles.contactButtonText}>Click to view our Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.faqHeader}>Frequently Asked Privacy Questions</Text>
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
      fontSize: 32,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      textAlign: 'center',
      marginRight: 40,
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
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#000',
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
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
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

export default PrivacyScreen;