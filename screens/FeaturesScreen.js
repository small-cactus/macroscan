// FeaturesScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  SafeAreaView,
  LayoutAnimation,
  UIManager,
  Platform,
  Dimensions,
  Alert,
  Appearance,
  Animated,
  ActionSheetIOS,
  Picker,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as RNIap from 'react-native-iap';
import { useIAP } from '../IAPContext'; 
import { BlurView } from 'expo-blur';
import AnimatedCenteredText from './AnimatedCenteredText';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DEBUG_MOCK_UNLIMITED = false;
const { width, height } = Dimensions.get('window');

// Helper function to detect older iPhone sizes
const isIphoneSE = () => {
  const smallIphoneDimensions = [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 414, height: 736 },
    { width: 360, height: 640 },
    { width: 375, height: 812 },
    { width: 360, height: 780 },
  ];
  return (
    Platform.OS === 'ios' &&
    smallIphoneDimensions.some(
      (dim) =>
        (width === dim.width && height === dim.height) ||
        (width === dim.height && height === dim.width)
    )
  );
};

const FeaturesScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);
  const { isIAPEnabled } = useIAP();

  // Models: 'Complex Processing' is paywalled in the UI,
  // but we'll force it behind the scenes when user picks Accurate Mode.
  const models = {
    'claude-3-5-sonnet-20240620': 'Complex Processing',
    'claude-3-haiku-20240307': 'Default Processing',
  };

  // Basic state
  const [selectedModel, setSelectedModel] = useState('claude-3-haiku-20240307');
  const [selectedMode, setSelectedMode] = useState('fast');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [debugUnlocked] = useState(DEBUG_MOCK_UNLIMITED);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  // For animating the mode buttons
  const scaleValues = {
    fast: useRef(new Animated.Value(1)).current,
    accurate: useRef(new Animated.Value(1)).current,
  };
  const buttonBackgroundColors = {
    fast: useRef(new Animated.Value(0)).current,
    accurate: useRef(new Animated.Value(0)).current,
  };
  const buttonBorderColors = {
    fast: useRef(new Animated.Value(0)).current,
    accurate: useRef(new Animated.Value(0)).current,
  };

  // Tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const [debugShowTutorialAlways, setDebugShowTutorialAlways] = useState(false);
  const tutorialOpacityAnim = useRef(new Animated.Value(0)).current;
  const tutorialData = [
    {
      key: '1',
      title: 'Welcome to Scanner Settings',
      description:
        'Adjust how our intelligence features scan your meals to get the most accurate macro information.',
      icon: 'restaurant',
    },
    {
      key: '2',
      title: 'Fast Mode (Default)',
      description:
        'Provides instant results without in-depth analysis. Great for packaged or well-known foods.',
      icon: 'flash',
    },
    {
      key: '3',
      title: 'Accurate Mode',
      description:
        'Accurate Mode uses specialized reasoning with multiple runs for high accuracy. You only get one free scan a day!',
      icon: 'shield-checkmark',
      isBeta: true,
    },
    {
      key: '4',
      title: 'Processing Models',
      description:
        'Pick the intelligence model for detection. Complex is normally locked for subscribers, but is used behind the scenes in Accurate Mode.',
      icon: 'settings',
    },
  ];
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [currentTutorialIndex, setCurrentTutorialIndex] = useState(0);
  const flatListRef = useRef(null);

  // Viewability config for the tutorial slides
  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      if (index !== null && index !== undefined) {
        setCurrentTutorialIndex(index);
      }
    }
  }).current;

  // Subscription IDs to check
  const SUBSCRIPTION_IDS = [
    'macroscan_plusplus',
    'macroscan_plusplus_yearly',
    'macroscan_unlimited',
  ];

  useEffect(() => {
    checkUnlockStatus();
    loadSettings();
  }, [isIAPEnabled]);

  useEffect(() => {
    // Animate selected mode on mount
    Object.keys(buttonBackgroundColors).forEach((mode) => {
      animateButtonSelection(mode, mode === selectedMode);
    });
  }, [selectedMode, colorScheme]);

  useEffect(() => {
    checkTutorial();
  }, [debugShowTutorialAlways]);

  // Check if user has seen tutorial
  const checkTutorial = async () => {
    try {
      const hasViewedTutorial = await AsyncStorage.getItem(
        'hasViewedFeaturesTutorial'
      );
      if (!hasViewedTutorial || debugShowTutorialAlways) {
        setShowTutorial(true);
        Animated.timing(tutorialOpacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error('Error checking tutorial status:', error);
    }
  };

  // Dismiss the tutorial
  const dismissTutorial = async () => {
    try {
      await AsyncStorage.setItem('hasViewedFeaturesTutorial', 'true');
    } catch (error) {
      console.error('Error setting tutorial status:', error);
    }
    Animated.timing(tutorialOpacityAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setShowTutorial(false);
      tutorialOpacityAnim.setValue(0);
      setTutorialIndex(0);
    });
  };

  // Check subscription status (iOS example)
  const checkUnlockStatus = async () => {
    try {
      let isUnlockedStatus = false;

      if (isIAPEnabled) {
        if (Platform.OS === 'ios') {
          await RNIap.initConnection();
          const receipt = await RNIap.getReceiptIOS({ forceRefresh: true });
          if (!receipt) {
            console.error('No receipt available');
          } else {
            const response = await fetch(
              'https://us-central1-weighty-works-420523.cloudfunctions.net/verifyReceipt2',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ receiptData: receipt }),
              }
            );
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.isSubscribed) {
                const productId = data.productId;
                if (SUBSCRIPTION_IDS.includes(productId)) {
                  isUnlockedStatus = true;
                }
              } else {
                console.error('Receipt validation failed:', data.message);
              }
            } else {
              const responseText = await response.text();
              console.error('Server Error:', response.status, responseText);
            }
          }
        } else {
          // Android subscription check can go here
          isUnlockedStatus = false;
        }
      } else {
        // Fallback if not using IAP
        // Example: user object says user.subscriptionStatus
        if (
          user?.subscriptionStatus === 'macroscan_unlimited' ||
          user?.subscriptionStatus === 'macroscan_plusplus'
        ) {
          isUnlockedStatus = true;
        }
      }
      setIsUnlocked(debugUnlocked || isUnlockedStatus);
    } catch (error) {
      console.error('Failed to check subscriptions:', error);
      setIsUnlocked(debugUnlocked || false);
    }
  };

  // Load any saved settings (model/mode) from AsyncStorage
  const loadSettings = async () => {
    try {
      const model = await AsyncStorage.getItem('selectedModel');
      const mode = await AsyncStorage.getItem('selectedMode');
      if (model) setSelectedModel(model);
      if (mode) setSelectedMode(mode);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleTitlePress = () => {
    setShowTutorial(true);
    Animated.timing(tutorialOpacityAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  // Force set the Complex model (claude-3-5-sonnet-20240620) in AsyncStorage
  const forceComplexModel = async () => {
    try {
      await AsyncStorage.setItem('selectedModel', 'claude-3-5-sonnet-20240620');
      setSelectedModel('claude-3-5-sonnet-20240620');
    } catch (error) {
      console.error('Error setting complex model:', error);
    }
  };

  // Handle changing the model
  const handleModelChange = async (model) => {
    // If user tries to pick Complex from the model selector manually
    // but isn't unlocked => show alert
    if (!isUnlocked && model !== 'claude-3-haiku-20240307') {
      Alert.alert(
        'Unlock Required',
        'Upgrade to MacroScan Unlimited to access Complex Processing.'
      );
      return;
    }
    try {
      await AsyncStorage.setItem('selectedModel', model);
      setSelectedModel(model);
      Haptics.selectionAsync();
    } catch (error) {
      console.error('Error saving selectedModel:', error);
    }
  };

  // Main logic for changing the scanning mode
  const handleModeChange = async (mode) => {
    try {
      if (mode === 'accurate') {
        if (isUnlocked) {
          // Subscribers get unlimited accurate scans
          await AsyncStorage.setItem('selectedMode', mode);
          setSelectedMode(mode);
          // Force complex model too
          await forceComplexModel();
          Haptics.selectionAsync();
        } else {
          // Free user => check if used up the 1 daily scan
          const freeAccurateScansUsed = await AsyncStorage.getItem(
            'freeAccurateScansUsed'
          );
          
          if (freeAccurateScansUsed === '1') {
            // Already used the free accurate scan
            Alert.alert(
              'Daily Limit Reached',
              'You have already used your daily Accurate Mode scan. Please wait until tomorrow or upgrade for unlimited scans.'
            );
          } else {
            // Not used yet => show the "make it count" alert
            Alert.alert(
              'Heads Up!',
              'You only get one accurate scan a day on the free plan, so make it count!',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'OK',
                  onPress: async () => {
                    // Switch to accurate
                    await AsyncStorage.setItem('selectedMode', mode);
                    setSelectedMode(mode);
                    // Force complex model even on free plan
                    await forceComplexModel();
                    Haptics.selectionAsync();
                  },
                },
              ],
              { cancelable: false }
            );
          }
        }
      } else {
        // Fast mode is always allowed
        await AsyncStorage.setItem('selectedMode', mode);
        setSelectedMode(mode);
        Haptics.selectionAsync();

        // If user toggles back to fast mode, force them back to default model.
        if (selectedModel !== 'claude-3-haiku-20240307') {
          try {
            await AsyncStorage.setItem('selectedModel', 'claude-3-haiku-20240307');
            setSelectedModel('claude-3-haiku-20240307');
          } catch (error) {
            console.error('Error setting default model:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error handling mode change:', error);
    }
  };

  // Animate button color & border changes
  const animateButtonSelection = (mode, selected) => {
    const duration = 200;
    Animated.timing(buttonBackgroundColors[mode], {
      toValue: selected ? 1 : 0,
      duration,
      useNativeDriver: false,
    }).start();
    Animated.timing(buttonBorderColors[mode], {
      toValue: selected ? 1 : 0,
      duration,
      useNativeDriver: false,
    }).start();
  };

  const toggleModelSelector = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  // Render a single mode button (fast or accurate)
  const renderScanModeButton = (mode, icon, title, description) => {
    const scaleValue = scaleValues[mode];
    const backgroundColor = buttonBackgroundColors[mode].interpolate({
      inputRange: [0, 1],
      outputRange: [
        colorScheme === 'dark' ? '#1c1c1e' : '#f0f0f0',
        colorScheme === 'dark' ? '#2c2c2e' : '#e5e5e5',
      ],
    });
    const borderColor = buttonBorderColors[mode].interpolate({
      inputRange: [0, 1],
      outputRange: [
        'transparent',
        colorScheme === 'dark' ? '#5c5c5e' : '#d5d5d5',
      ],
    });

    const handlePressIn = () => {
      Animated.spring(scaleValue, {
        toValue: 0.97,
        useNativeDriver: false,
      }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handlePressOut = () => {
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: false,
      }).start();
      // Actually change the mode on release
      handleModeChange(mode);

      // Switch animations for the selected/deselected states
      Object.keys(buttonBackgroundColors).forEach((m) => {
        animateButtonSelection(m, m === mode);
      });
    };

    return (
      <TouchableWithoutFeedback
        key={mode}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            styles.modeButton,
            {
              backgroundColor,
              borderColor,
              transform: [{ scale: scaleValue }],
            },
          ]}
        >
          <View style={styles.modeButtonContent}>
            <View style={styles.modeIconContainer}>
              <Ionicons
                name={icon}
                size={24}
                color={colorScheme === 'dark' ? '#FFF' : '#000'}
              />
            </View>
            <View style={styles.modeTextContainer}>
              <Text style={styles.modeButtonTitle}>{title}</Text>
              <Text style={styles.modeButtonDescription}>{description}</Text>
            </View>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  };

  // iOS ActionSheet for picking the model OR Android picker modal
  const handleModelSelectorPress = () => {
    if (selectedMode === 'accurate') {
      Alert.alert(
        'Sorry!',
        'Accurate mode is a beta feature and currently only acheives 90% accuracy using the Complex Processing model.'
      );
      return;
    }
    if (Platform.OS === 'ios') {
      const options = Object.entries(models).map(([key, value]) => ({
        key,
        title: value,
        locked: !isUnlocked && key !== 'claude-3-haiku-20240307',
      }));
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            'Cancel',
            ...options.map(
              (opt) => `${opt.title}${opt.locked ? ' (Locked)' : ''}`
            ),
          ],
          cancelButtonIndex: 0,
          title: 'Select Processing Model',
          message: 'Choose the processing model that best fits your needs',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) return;
          const selectedOption = options[buttonIndex - 1];
          if (selectedOption.locked) {
            Alert.alert(
              'Unlock Required',
              'Upgrade to MacroScan Unlimited to access Complex Processing.'
            );
            return;
          }
          handleModelChange(selectedOption.key);
        }
      );
    } else {
      setShowAndroidPicker(true);
    }
  };

  // Android modal
  const AndroidPickerModal = () => (
    <Modal
      visible={showAndroidPicker}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAndroidPicker(false)}
    >
      <View style={styles.modalContainer}>
        <View
          style={[
            styles.pickerContainer,
            { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#fff' },
          ]}
        >
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setShowAndroidPicker(false)}>
              <Text
                style={[
                  styles.pickerHeaderButton,
                  { color: colorScheme === 'dark' ? '#fff' : '#000' },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAndroidPicker(false)}>
              <Text
                style={[
                  styles.pickerHeaderButton,
                  { color: colorScheme === 'dark' ? '#fff' : '#000' },
                ]}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
          <Picker
            selectedValue={selectedModel}
            onValueChange={(itemValue) => {
              if (!isUnlocked && itemValue !== 'claude-3-haiku-20240307') {
                Alert.alert(
                  'Unlock Required',
                  'Upgrade to MacroScan Unlimited to access Complex Processing.'
                );
                return;
              }
              handleModelChange(itemValue);
              setShowAndroidPicker(false);
            }}
            style={{ color: colorScheme === 'dark' ? '#fff' : '#000' }}
          >
            {Object.entries(models).map(([key, value]) => (
              <Picker.Item
                key={key}
                label={`${value}${
                  !isUnlocked && key !== 'claude-3-haiku-20240307'
                    ? ' (Locked)'
                    : ''
                }`}
                value={key}
                enabled={isUnlocked || key === 'claude-3-haiku-20240307'}
              />
            ))}
          </Picker>
        </View>
      </View>
    </Modal>
  );

  // Tutorial slides
  const renderTutorialItem = ({ item, index }) => (
    <View style={styles.tutorialPage}>
      <View style={styles.tutorialInnerContent}>
        <View style={styles.tutorialIconContainer}>
          <BlurView intensity={30} style={styles.tutorialIcon}>
            <Ionicons
              name={item.icon}
              size={80}
              color={colorScheme === 'dark' ? '#fff' : '#000'}
            />
          </BlurView>
        </View>
        <Text style={styles.tutorialTitle}>{item.title}</Text>
        {item.isBeta && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Beta Feature',
                'Accurate mode is a beta feature, so occasionally it may produce unexpected results.'
              );
            }}
          >
            <View style={styles.betaContainer}>
              <Text style={styles.betaTag}>BETA</Text>
            </View>
          </TouchableOpacity>
        )}
        <AnimatedCenteredText
          text={item.description}
          colorScheme={colorScheme}
          visible={currentTutorialIndex === index}
        />
      </View>
    </View>
  );

  // Slide animation
  const handleScroll = (event) => {
    const newIndex = Math.round(
      event.nativeEvent.contentOffset.x / width
    );
    if (newIndex !== tutorialIndex) {
      setTutorialIndex(newIndex);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Tutorial Overlay */}
      {showTutorial && (
        <Animated.View
          style={[styles.tutorialOverlay, { opacity: tutorialOpacityAnim }]}
        >
          <BlurView intensity={50} style={StyleSheet.absoluteFill} />
          <View style={styles.tutorialContainer}>
            <View style={styles.tutorialContent}>
              <FlatList
                ref={flatListRef}
                data={tutorialData}
                renderItem={renderTutorialItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.key}
                onMomentumScrollEnd={handleScroll}
                style={styles.flatList}
                contentContainerStyle={styles.flatListContent}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
              />
            </View>
            <View style={styles.tutorialFooter}>
              <View style={styles.pagination}>
                {tutorialData.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      currentTutorialIndex === index
                        ? styles.paginationDotActive
                        : styles.paginationDotInactive,
                    ]}
                  />
                ))}
              </View>
              <TouchableOpacity
                style={styles.tutorialNextButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (currentTutorialIndex < tutorialData.length - 1) {
                    const nextIndex = currentTutorialIndex + 1;
                    setTutorialIndex(nextIndex);
                    flatListRef.current?.scrollToIndex({ index: nextIndex });
                  } else {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    dismissTutorial();
                  }
                }}
              >
                <Text style={styles.tutorialNextButtonText}>
                  {currentTutorialIndex === tutorialData.length - 1
                    ? 'Get Started'
                    : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Header with Back Button and Title */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colorScheme === 'dark' ? '#FFF' : '#000'}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <TouchableOpacity onPress={handleTitlePress}>
            <Text style={styles.title}>Scanner Settings</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.container}>
        <Text style={styles.sectionDescription}>
          Choose between quick results (Fast Mode) or detailed analysis (Accurate Mode).
        </Text>
        <View style={styles.modeButtonsContainer}>
          {renderScanModeButton(
            'fast',
            'flash',
            'Default Mode',
            'Instant results • Good for packaged foods • Quick tracking'
          )}
          {renderScanModeButton(
            'accurate',
            'shield-checkmark',
            'Accurate Mode',
            'Detailed analysis • Best for homemade meals • Uses Complex Reasoning',
          )}
        </View>
        <View style={styles.separator} />
        {/* Processing Model Section */}
        <TouchableOpacity
          style={styles.modelSelectorButton}
          onPress={handleModelSelectorPress}
        >
          <View style={styles.modelSelectorButtonContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.modelSelectorLabel}>
                Processing Model
              </Text>
              {(selectedMode === 'accurate' &&
                selectedModel === 'claude-3-5-sonnet-20240620') && (
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={colorScheme === 'dark' ? '#666' : '#000'}
                  style={{ marginLeft: 5 }}
                />
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.modelSelectorValue}>
                {models[selectedModel]}
              </Text>
              <Ionicons
                name="chevron-down"
                size={24}
                color={colorScheme === 'dark' ? '#FFF' : '#000'}
              />
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.bottomNote}>
          💡 Tip: Fast Mode is great for quick checks. Use Accurate Mode for 
          complex meals. Free users get only 1 accurate scan per day. 
          (Accurate Mode automatically uses Complex Processing in the background.)
        </Text>
      </ScrollView>

      {Platform.OS === 'android' && <AndroidPickerModal />}
    </SafeAreaView>
  );
};

const getDynamicStyles = (colorScheme) => {
  const baseStyles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
    },
    container: {
      paddingHorizontal: '5%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: isIphoneSE() ? '5%' : '2%',
      paddingHorizontal: '5%',
      height: 60,
    },
    headerLeft: {
      width: 50,
      alignItems: 'flex-start',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerRight: {
      width: 50,
      alignItems: 'flex-end',
    },
    backButton: {
      backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#FFFFFF',
      borderRadius: 140,
      padding: 10,
      borderWidth: 2,
      borderColor: colorScheme === 'dark' ? '#2a2a2d' : '#eee',
    },
    title: {
      fontSize: 25,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
    },
    sectionDescription: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#999' : '#666',
      marginBottom: 15,
      textAlign: 'center',
    },
    modeButtonsContainer: {
      marginTop: 15,
      marginBottom: 15,
    },
    modeButton: {
      borderRadius: 17,
      marginBottom: 10,
      borderWidth: 2,
    },
    modeButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
    },
    modeIconContainer: {
      backgroundColor: colorScheme === 'dark' ? '#3c3c3e' : '#e0e0e0',
      padding: 12,
      borderRadius: 12,
      marginRight: 15,
    },
    modeTextContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    modeButtonTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      marginBottom: 4,
    },
    modeButtonDescription: {
      fontSize: 13,
      color: colorScheme === 'dark' ? '#bbb' : '#666',
      lineHeight: 18,
    },
    separator: {
      height: 1,
      backgroundColor: colorScheme === 'dark' ? '#333' : '#e0e0e0',
      marginVertical: 20,
    },
    modelSelectorButton: {
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f0f0f0',
      padding: 15,
      borderRadius: 16,
      marginBottom: 10,
    },
    modelSelectorButtonContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modelSelectorLabel: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#999' : '#666',
    },
    modelSelectorValue: {
      fontSize: 16,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#FFF' : '#000',
      marginTop: 2,
      marginRight: 5,
    },
    bottomNote: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#999' : '#666',
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 30,
      paddingHorizontal: '5%',
      fontStyle: 'italic',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    pickerContainer: {
      backgroundColor: '#fff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 20,
    },
    pickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#333' : '#e0e0e0',
    },
    pickerHeaderButton: {
      fontSize: 16,
      fontWeight: '600',
    },
    // Tutorial overlay
    tutorialOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
      zIndex: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tutorialContainer: {
      width: '100%',
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tutorialContent: {
      height: '60%',
    },
    flatList: {
      flexGrow: 0,
    },
    flatListContent: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    tutorialPage: {
      width: width,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    tutorialInnerContent: {
      alignItems: 'center',
      marginTop: 50,
    },
    tutorialIconContainer: {
      marginBottom: 30,
    },
    tutorialIcon: {
      borderRadius: 40,
      padding: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#555' : '#CCC',
      backgroundColor:
        colorScheme === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.1)',
    },
    tutorialTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#fff' : '#000',
      textAlign: 'center',
      marginBottom: 20,
    },
    tutorialFooter: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 50,
    },
    pagination: {
      flexDirection: 'row',
      marginBottom: 20,
    },
    paginationDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginHorizontal: 5,
    },
    paginationDotActive: {
      backgroundColor: colorScheme === 'dark' ? '#fff' : '#000',
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    paginationDotInactive: {
      backgroundColor: colorScheme === 'dark' ? '#777' : '#ccc',
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    tutorialNextButton: {
      backgroundColor: colorScheme === 'dark' ? '#fff' : '#000',
      paddingVertical: 12,
      paddingHorizontal: 40,
      borderRadius: 25,
    },
    tutorialNextButtonText: {
      color: colorScheme === 'dark' ? '#000' : '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    betaContainer: {
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      marginBottom: 12,
      borderColor: colorScheme === 'dark' ? '#555' : '#CCC',
      backgroundColor:
        colorScheme === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.1)',
    },
    betaTag: {
      fontSize: 14,
      color: '#007AFF',
      fontWeight: '600',
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
  });
  return baseStyles;
};

export default FeaturesScreen;