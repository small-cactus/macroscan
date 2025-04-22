// AboutScreen.js
import React, { useState, useCallback, useRef } from 'react';
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
  Platform,
  Linking,
  LayoutAnimation,
  UIManager,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedAnswer from './AnimatedAnswer'; // Ensure you have the correct path

const { width, height } = Dimensions.get('window');

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CHANGELOG = [
  {
    title: 'Redesigned App',
    details: 'Major app redesign focusing on fluid animations and strategic use of color to enhance user experience.',
    icon: 'brush',
    iconLibrary: 'Ionicons',
    color: '#FF3B30', // Example color, adjust if needed
    isBeta: false,
    isOffByDefault: false,
  },
  {
    title: 'Deep Search Mode',
    details: 'Introduced Deep Search mode, which queries multiple websites, government food databases, and other popular food apps for comprehensive nutritional information beyond our standard database.',
    icon: 'cloud-search',
    iconLibrary: 'MaterialCommunityIcons',
    color: '#5E5CE6', // Example color, adjust if needed
    isBeta: true,
    isOffByDefault: true,
  },
  {
    title: 'Usage Streaks',
    details: 'Track your consistent app usage with the new Streaks feature. Stay motivated by building and maintaining your daily scan streak!',
    icon: 'flame',
    iconLibrary: 'Ionicons',
    color: '#FF9500', // Example color, adjust if needed
    isBeta: false,
    isOffByDefault: false,
  },
  {
    title: 'Manual Scan',
    details: 'Added a manual scan button to the scan screen. This allows you to manually log a food you ate.',
    icon: 'pencil',
    iconLibrary: 'Ionicons',
    color: '#007AFF', // Example color, adjust if needed
    isBeta: false,
    isOffByDefault: false,
  }
];

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

const AboutScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);

  // Initialize an array to track open/closed state for each changelog item
  const [changelogOpen, setChangelogOpen] = useState(new Array(CHANGELOG.length).fill(false));
  // Add rotation animation values for each chevron
  const rotationAnimations = useRef(CHANGELOG.map(() => new Animated.Value(0))).current;

  const toggleChangelog = useCallback(
    index => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setChangelogOpen(prevState => {
        const updatedState = [...prevState];
        updatedState[index] = !updatedState[index];
        return updatedState;
      });

      // Animate the chevron rotation
      Animated.spring(rotationAnimations[index], {
        toValue: changelogOpen[index] ? 0 : 1,
        friction: 10,
        tension: 40,
        useNativeDriver: true
      }).start();
    },
    [changelogOpen]
  );

  const handleContactPress = () => {
    const email = 'macroscan.help@gmail.com';
    const subject = encodeURIComponent('Support Request');
    const body = encodeURIComponent('Please describe your issue or question:');
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const handleTermsPress = () => {
    const policyUrl = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
    Linking.openURL(policyUrl);
  };

  // Helper function to adjust color brightness
  const adjustBrightness = (color, percent) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
        </TouchableOpacity>
        <Text style={styles.title}>About MacroScan</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Image source={require('../assets/icon.png')} style={styles.logo} />
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.version}>Version 1.6.1 (150)</Text>
            <View style={styles.betaContainer}>
              {/* <Text style={styles.betaTag}>BETA</Text> */}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleContactPress}>
              <Ionicons name="mail-outline" size={20} color="#FFF" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>Contact Support</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleTermsPress}>
              <Ionicons name="document-text-outline" size={20} color="#FFF" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>Terms & Conditions</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.changelogHeader}>Changelog v1.6.1</Text>
          <View style={styles.betaContainer}>
              <Text style={styles.betaTag}>Big Update</Text>
            </View>
          {CHANGELOG.map((item, index) => (
            <View key={index} style={styles.changelogItemContainer}>
              <TouchableOpacity
                style={styles.changelogTitleContainer}
                onPress={() => toggleChangelog(index)}
              >
                <LinearGradient
                  colors={[
                    item.color,
                    adjustBrightness(item.color, colorScheme === 'dark' ? -20 : 20)
                  ]}
                  style={styles.iconContainer}
                >
                  {item.iconLibrary === 'Ionicons' && (
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color="#FFFFFF"
                    />
                  )}
                  {item.iconLibrary === 'MaterialCommunityIcons' && (
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={22}
                      color="#FFFFFF"
                    />
                  )}
                  {item.iconLibrary === 'MaterialIcons' && (
                    <MaterialIcon
                      name={item.icon}
                      size={22}
                      color="#FFFFFF"
                    />
                  )}
                </LinearGradient>
                <View style={styles.titleChipsContainer}>
                  <Text style={styles.changelogTitle}>{item.title}</Text>
                  <View style={styles.chipsContainer}>
                    {item.isBeta && (
                      <View style={styles.betaChipContainer}>
                        <Text style={styles.betaChipTag}>BETA</Text>
                      </View>
                    )}
                    {item.isOffByDefault && (
                      <View style={styles.offByDefaultChipContainer}>
                        <Text style={styles.offByDefaultChipTag}>OFF BY DEFAULT</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Animated.View style={[
                  styles.chevron,
                  {
                    transform: [{
                      rotate: rotationAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '90deg']
                      })
                    }]
                  }
                ]}>
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={colorScheme === 'dark' ? '#FFF' : '#000'}
                  />
                </Animated.View>
              </TouchableOpacity>
              {changelogOpen[index] && (
                <View style={styles.expandedContent}>
                  <AnimatedAnswer text={item.details} colorScheme={colorScheme} />
                  {(item.title === 'Circle to Scan' || item.title === 'Free Accurate Scans') && (
                    <TouchableOpacity
                      style={[styles.featureButton, {
                        backgroundColor: item.color
                      }]}
                      onPress={() => navigation.navigate('FeaturesScreen')}
                    >
                      <Text style={styles.featureButtonText}>Try it in Features</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.featureButtonIcon} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
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
      fontSize: 25,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      textAlign: 'center',
      marginRight: 40, // Width of back button to maintain center alignment
    },
    content: {
      alignItems: 'center',
      marginTop: '2%',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: '8%',
    },
    logoBackground: {
      backgroundColor: '#FFF',
      borderRadius: 35,
      padding: 0,
      borderWidth: 2,
      borderColor: '#eee'
    },
    logo: {
      width: 130,
      height: 130,
      borderRadius: 26,
    },
    infoSection: {
      alignItems: 'center',
      marginBottom: '6%',
    },
    version: {
      fontSize: 18,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      marginBottom: 8,
    },
    betaContainer: {
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#E5E5EA',
      borderRadius: 8,
      overflow: 'hidden',
      margin: '2%',
    },
    betaTag: {
      fontSize: 14,
      color: '#007AFF',
      fontWeight: '600',
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    changelogHeader: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      alignSelf: 'center',
      marginBottom: '0.5%',
      marginTop: '10%',
    },
    changelogItemContainer: {
      marginBottom: '3%',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
      borderRadius: 16,
      padding: 16,
      width: '100%',
    },
    changelogTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    titleChipsContainer: {
      flex: 1,
      marginLeft: 12,
    },
    changelogTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      marginBottom: 4,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chipsContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    betaChipContainer: {
      backgroundColor: colorScheme === 'dark' ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)',
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    betaChipTag: {
      color: '#007AFF',
      fontSize: 10,
      fontWeight: '600',
    },
    offByDefaultChipContainer: {
      backgroundColor: colorScheme === 'dark' ? 'rgba(255, 69, 58, 0.15)' : 'rgba(255, 69, 58, 0.1)',
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    offByDefaultChipTag: {
      color: '#FF453A',
      fontSize: 10,
      fontWeight: '600',
    },
    chevron: {
      marginLeft: 'auto',
    },
    buttonContainer: {
      width: '100%',
      gap: 12,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#000',
      borderRadius: 15,
      padding: 16,
      width: '100%',
    },
    buttonIcon: {
      marginRight: 8,
    },
    actionButtonText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
    },
    backButton: {
      backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#FFFFFF',
      borderRadius: 140,
      padding: 10,
      // Removed marginRight
      borderWidth: 2,
      borderColor: colorScheme === 'dark' ? '#2a2a2d' : '#eee',
    },
    expandedContent: {
      marginTop: 12,
    },
    featureButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 12,
      marginTop: 16,
    },
    featureButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
      marginRight: 8,
    },
    featureButtonIcon: {
      marginLeft: 4,
    },
  });

export default AboutScreen;