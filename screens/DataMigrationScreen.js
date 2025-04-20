import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  useColorScheme,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import AnimatedTextLoading from './AnimatedTextLoading';
import AnimatedCenteredText from './AnimatedCenteredText';

const { width, height } = Dimensions.get('window');
const baseWidth = 430; // iPhone 14 Pro Max width
const baseHeight = 932; // iPhone 14 Pro Max height
const scaleWidth = width / baseWidth;
const scaleHeight = height / baseHeight;
const scale = Math.min(scaleWidth, scaleHeight);

const DataMigrationScreen = ({ onComplete }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleUpgrade = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Keys to remove based on AccountScreen
      const keysToRemove = [
        // User related
        '@user',
        '@user_goals',
        '@user_logged_in',
        '@apikey',
        'userName',
        'userImageUri',

        // Product and history related
        '@product_history',
        '@average_processing_times',
        '@last_placeholder',
        '@last_placeholder_time',
        '@filter_section_state',

        // App state and settings
        'selectedModel',
        'selectedMode',
        '@selected_provider',
        'foodSelectionEnabled',
        '@openai_api_key',
        '@gemini_api_key',
        '@anthropic_api_key',
        '@selected_macro',

        // Usage tracking
        'dailyScanCount',
        'firstUseDate',
        'dateLastUsed',
        'freeAccurateScansUsed',
        'selectedProcessing',
        'selectedProvider',
        'previousModel',
        'hasScannedEver',

        // Onboarding and tutorials
        'hasViewedTutorial',
        'hasViewedFeaturesTutorial',
        '@has_seen_whats_new_1_6_0',
        '@visited_steps',
        '@has_seen_mode_tooltip',
        '@has_seen_scan_button_tooltip',

        // paywall
        '@paywall_last_shown',
        '@has_ever_scanned',
      ];

      await AsyncStorage.multiRemove(keysToRemove);
      onComplete();
    } catch (error) {
      console.error('Error during data migration:', error);
    }
  };

  return (
    <View style={styles.container}>
      <BlurView
        intensity={0}
        tint={isDark ? 'dark' : 'light'}
        style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconRow}>
              <Icon 
                name="sparkles" 
                size={40 * scale} 
                color={isDark ? '#007AFF' : '#0A84FF'} 
              />
              <Image
                source={isDark ? require('../assets/icon-light.png') : require('../assets/icon.png')}
                style={[styles.logo, { transform: [{ rotate: '10deg' }] }]}
              />
            </View>
            <AnimatedTextLoading
              text="Time for an Upgrade!"
              colorScheme={colorScheme}
              style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}
            />
            <AnimatedCenteredText
              text="We've completely redesigned MacroScan with powerful new features."
              colorScheme={colorScheme}
              visible={true}
              style={[styles.subtitle, { color: isDark ? '#CCCCCC' : '#666666' }]}
            />
          </View>

          <View style={styles.features}>
            <FeatureItem
              icon="flash"
              title="Faster & More Accurate"
              description="Enhanced AI models for better nutrition tracking"
              isDark={isDark}
              index={0}
            />
            <FeatureItem
              icon="scan"
              title="Circle to Scan"
              description="Draw circles to analyze specific foods in your photos"
              isDark={isDark}
              index={1}
            />
            <FeatureItem
              icon="refresh-circle"
              title="Fresh Start"
              description="We've rebuilt the app from scratch - a quick refresh will get you set up with all the new features"
              isDark={isDark}
              index={2}
            />
            <FeatureItem
              icon="barcode"
              title="Barcode Scanning"
              description="Scan barcodes for instant nutrition info"
              isDark={isDark}
              index={3}
            />
            <FeatureItem
              icon="analytics"
              title="Better Insights"
              description="Improved nutrition tracking and analysis"
              isDark={isDark}
              index={4}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleUpgrade}
            >
              <LinearGradient
                colors={isDark ? ['#FFFFFF', '#F5F5F5'] : ['#000000', '#1A1A1A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
              >
                <Text style={[styles.buttonText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                  Upgrade MacroScan
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={[styles.note, { color: isDark ? '#999999' : '#666666' }]}>
              Note: This will reset your app data for the new version
            </Text>
          </View>
        </View>
      </BlurView>
    </View>
  );
};

const FeatureItem = ({ icon, title, description, isDark, index = 0 }) => {
  const animatedValue = new Animated.Value(0);

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
      delay: index * 100,
    }).start();
  }, []);

  const animatedStyle = {
    opacity: animatedValue,
    transform: [
      {
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.featureItem, animatedStyle]}>
      <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2A2A2B' : '#F5F5F5' }]}>
        <Icon name={icon} size={24 * scale} color={isDark ? '#007AFF' : '#0A84FF'} />
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          {title}
        </Text>
        <Text style={[styles.featureDescription, { color: isDark ? '#CCCCCC' : '#666666' }]}>
          {description}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24 * scale,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 70 * scale,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 * scale,
  },
  logo: {
    width: 55 * scale,
    height: 55 * scale,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28 * scale,
    fontWeight: '700',
    marginTop: 16 * scale,
    marginBottom: 8 * scale,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16 * scale,
    textAlign: 'center',
    marginBottom: 8 * scale,
    paddingHorizontal: 24 * scale,
  },
  features: {
    marginBottom: 32 * scale,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24 * scale,
  },
  iconContainer: {
    width: 48 * scale,
    height: 48 * scale,
    borderRadius: 16 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16 * scale,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17 * scale,
    fontWeight: '600',
    marginBottom: 4 * scale,
  },
  featureDescription: {
    fontSize: 14 * scale,
    lineHeight: 20 * scale,
  },
  footer: {
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 50 * scale : 30 * scale,
  },
  button: {
    width: '100%',
    height: 56 * scale,
    borderRadius: 28 * scale,
    overflow: 'hidden',
    marginBottom: 16 * scale,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 17 * scale,
    fontWeight: '600',
  },
  note: {
    fontSize: 14 * scale,
    textAlign: 'center',
  },
});

export default DataMigrationScreen; 