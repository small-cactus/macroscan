import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  SafeAreaView,
  Alert,
  Appearance,
  Animated,
  Platform,
  Dimensions,
  FlatList,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../userContext';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import AnimatedCenteredText from './AnimatedCenteredText';
import { loadAverageProcessingTimes, getFastestModels } from './providers/processingTimes';
import { getDefaultModel, MODELS } from './providers/models';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

const DebuggingScreen = () => {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);
  const { user, updateUser } = useUser();

  // Basic state
  const [pin, setPin] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [originalScanCount, setOriginalScanCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hasPurchasedAdsRemoval, setHasPurchasedAdsRemoval] = useState(false);
  const [isFirstDayUnlimited, setIsFirstDayUnlimited] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude-3-haiku-20240307');
  const [selectedProvider, setSelectedProvider] = useState('anthropic');

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);
  const tutorialOpacityAnim = useRef(new Animated.Value(0)).current;
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [currentTutorialIndex, setCurrentTutorialIndex] = useState(0);
  const flatListRef = useRef(null);

  // Button animations
  const scaleValues = {
    scanCount: useRef(new Animated.Value(1)).current,
    subscription: useRef(new Animated.Value(1)).current,
    features: useRef(new Animated.Value(1)).current,
  };

  const buttonBackgroundColors = {
    scanCount: useRef(new Animated.Value(0)).current,
    subscription: useRef(new Animated.Value(0)).current,
    features: useRef(new Animated.Value(0)).current,
  };

  const tutorialData = [
    {
      key: '1',
      title: 'Developer Tools',
      description: 'Welcome to the developer debugging interface. Here you can modify app states and test features.',
      icon: 'construct',
    },
    {
      key: '2',
      title: 'Scan Management',
      description: 'Modify scan counts and test different scanning modes and models.',
      icon: 'scan',
    },
    {
      key: '3',
      title: 'Subscription Testing',
      description: 'Toggle between different subscription states to test premium features.',
      icon: 'star',
    },
    {
      key: '4',
      title: 'Feature Controls',
      description: 'Enable/disable specific features and test different app states.',
      icon: 'toggle',
    },
  ];

  // Viewability config for tutorial
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

  // Add new state
  const [processingTimes, setProcessingTimes] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          const storedScanCount = await AsyncStorage.getItem('dailyScanCount');
          const parsedScanCount = parseInt(storedScanCount);
          const firstUseDate = await AsyncStorage.getItem('firstUseDate');
          const today = new Date().toISOString().slice(0, 10);
          const storedModel = await AsyncStorage.getItem('@selected_model');

          // Check if user has unlimited subscription
          if (user?.subscriptionStatus === 'macroscan_unlimited') {
            setIsSubscribed(true);
          } else {
            setIsSubscribed(false);
          }

          if (firstUseDate === today) {
            setIsFirstDayUnlimited(true);
            setScanCount(Infinity);
          } else {
            setIsFirstDayUnlimited(false);
            setScanCount(parsedScanCount || 0);
          }

          setOriginalScanCount(parsedScanCount || 0);
          if (storedModel) setSelectedModel(storedModel);
          
          // Load processing times
          const times = await loadAverageProcessingTimes();
          // console.log('Loaded processing times:', JSON.stringify(times, null, 2));
          setProcessingTimes(times);
          
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };

      fetchData();
    }, [user])
  );

  useEffect(() => {
    const loadProvider = async () => {
      const provider = await AsyncStorage.getItem('@selected_provider');
      if (provider) {
        setSelectedProvider(provider);
      }
    };
    loadProvider();
  }, []);

  // Check if tutorial has been shown before when screen gains focus
  useFocusEffect(
    useCallback(() => {
      const checkTutorialStatus = async () => {
        try {
          const tutorialShown = await AsyncStorage.getItem('debugTutorialShown');
          if (!tutorialShown && accessGranted) {
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

      checkTutorialStatus();
    }, [accessGranted])
  );

  const validatePin = () => {
    if (pin === '7778') {
      setAccessGranted(true);
      checkAndShowTutorial();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert('Access Denied', 'Incorrect PIN');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const checkAndShowTutorial = async () => {
    try {
      const tutorialShown = await AsyncStorage.getItem('debugTutorialShown');
      if (!tutorialShown) {
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

  const dismissTutorial = async () => {
    try {
      await AsyncStorage.setItem('debugTutorialShown', 'true');
      Animated.timing(tutorialOpacityAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowTutorial(false);
        tutorialOpacityAnim.setValue(0);
        setTutorialIndex(0);
      });
    } catch (error) {
      console.error('Error saving tutorial status:', error);
    }
  };

  const handleButtonPress = (type) => {
    const scaleValue = scaleValues[type];
    
    Animated.spring(scaleValue, {
      toValue: 0.97,
      useNativeDriver: false,
    }).start();
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleButtonRelease = (type, action) => {
    const scaleValue = scaleValues[type];
    
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: false,
    }).start();

    // Execute the action
    action();
  };

  const updateScanCount = async (newCount) => {
    if (!isNaN(newCount)) {
      try {
        await AsyncStorage.setItem('dailyScanCount', newCount.toString());
        setScanCount(newCount);
        Alert.alert('Success', 'Scan count updated successfully');
      } catch (error) {
        console.error('Error updating scan count:', error);
        Alert.alert('Error', 'Failed to update scan count');
      }
    } else {
      Alert.alert('Error', 'Invalid number entered');
    }
  };

  const resetScanCount = async () => {
    try {
      const newCount = isFirstDayUnlimited ? Infinity : originalScanCount;
      await AsyncStorage.setItem('dailyScanCount', newCount.toString());
      setScanCount(newCount);
      Alert.alert('Success', 'Scan count reset successfully');
    } catch (error) {
      console.error('Error resetting scan count:', error);
      Alert.alert('Error', 'Failed to reset scan count');
    }
  };

  const handleSubscriptionChange = async (type) => {
    if (!user) {
      Alert.alert('Error', 'No user authenticated');
      return;
    }
    try {
      switch (type) {
        case 'unlimited':
          setIsSubscribed(!isSubscribed);
          await updateUser({ subscriptionStatus: !isSubscribed ? 'macroscan_unlimited' : 'free' });
          Alert.alert('Subscription Update', isSubscribed ? 'Unsubscribed from Unlimited' : 'Subscribed to Unlimited');
          break;
        case 'ads':
          setHasPurchasedAdsRemoval(!hasPurchasedAdsRemoval);
          Alert.alert('Purchase Update', hasPurchasedAdsRemoval ? 'Ads Purchase Removed' : 'Ads Purchase Added');
          break;
        case 'free':
          setIsSubscribed(false);
          await updateUser({ subscriptionStatus: 'free' });
          Alert.alert('Subscription Update', 'Set to Free Plan');
          break;
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      Alert.alert('Error', 'Failed to update subscription');
    }
  };

  const toggleFirstDayUnlimited = async (value) => {
    try {
      setIsFirstDayUnlimited(value);
      const today = new Date().toISOString().slice(0, 10);
      await AsyncStorage.setItem('firstUseDate', value ? today : '1990-01-01');
      Alert.alert('First Day Unlimited', value ? 'Enabled' : 'Disabled');
    } catch (error) {
      console.error('Error toggling first day unlimited:', error);
      Alert.alert('Error', 'Failed to toggle first day unlimited');
    }
  };

  const handleModelChange = async (model) => {
    try {
      await AsyncStorage.setItem('selectedModel', model);
      setSelectedModel(model);
      Alert.alert('Success', `Model changed to ${model}`);
      Haptics.selectionAsync();
    } catch (error) {
      console.error('Error changing model:', error);
      Alert.alert('Error', 'Failed to change model');
    }
  };

  const handleProviderChange = async (provider) => {
    try {
      await AsyncStorage.setItem('@selected_provider', provider);
      setSelectedProvider(provider);
      Alert.alert('Success', `Provider changed to ${provider}`);
    } catch (error) {
      console.error('Error changing provider:', error);
      Alert.alert('Error', 'Failed to change provider');
    }
  };

  // Tutorial slide renderer
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
        <AnimatedCenteredText
          text={item.description}
          colorScheme={colorScheme}
          visible={currentTutorialIndex === index}
        />
      </View>
    </View>
  );

  // Render a debug section button
  const renderDebugButton = (type, icon, title, description, onPress) => {
    const scaleValue = scaleValues[type];
    const backgroundColor = buttonBackgroundColors[type].interpolate({
      inputRange: [0, 1],
      outputRange: [
        colorScheme === 'dark' ? '#1c1c1e' : '#f0f0f0',
        colorScheme === 'dark' ? '#2c2c2e' : '#e5e5e5',
      ],
    });

    return (
      <TouchableWithoutFeedback
        onPressIn={() => handleButtonPress(type)}
        onPressOut={() => handleButtonRelease(type, onPress)}
      >
        <Animated.View
          style={[
            styles.debugButton,
            {
              backgroundColor,
              transform: [{ scale: scaleValue }],
            },
          ]}
        >
          <View style={styles.debugButtonContent}>
            <View style={styles.debugIconContainer}>
              <Ionicons
                name={icon}
                size={24}
                color={colorScheme === 'dark' ? '#FFF' : '#000'}
              />
            </View>
            <View style={styles.debugTextContainer}>
              <Text style={styles.debugButtonTitle}>{title}</Text>
              <Text style={styles.debugButtonDescription}>{description}</Text>
            </View>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  };

  // Add this function to format time
  const formatTime = (ms) => {
    return `${(ms / 1000).toFixed(1)}s`;
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
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                style={styles.flatList}
                contentContainerStyle={styles.flatListContent}
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

      {/* Header */}
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
          <TouchableOpacity onPress={() => setShowTutorial(true)}>
            <Text style={styles.title}>Developer Tools</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.container}>
        {!accessGranted ? (
          <View style={styles.content}>
            <Text style={styles.description}>
              Enter the developer PIN to access debugging tools.
            </Text>
            <BlurView
              intensity={30}
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              style={styles.pinContainer}
            >
              <TextInput
                style={styles.input}
                onChangeText={setPin}
                value={pin}
                placeholder="Enter PIN"
                placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
                keyboardType="numeric"
                secureTextEntry={true}
              />
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={validatePin}
              >
                <Text style={styles.submitButtonText}>Unlock Tools</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.description}>
              Modify application states and test features.
            </Text>

            {/* Scan Count Section */}
            {renderDebugButton(
              'scanCount',
              'scan',
              'Scan Management',
              'Modify scan counts and reset daily limits',
              () => {
                Alert.alert(
                  'Scan Count Options',
                  'Choose an action:',
                  [
                    {
                      text: 'Set Custom Count',
                      onPress: () => {
                        Alert.prompt(
                          'Set Scan Count',
                          'Enter new scan count:',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Set',
                              onPress: (value) => updateScanCount(parseInt(value)),
                            },
                          ],
                          'plain-text',
                          scanCount.toString()
                        );
                      },
                    },
                    {
                      text: 'Reset Count',
                      onPress: resetScanCount,
                    },
                    {
                      text: 'Toggle Unlimited',
                      onPress: () => toggleFirstDayUnlimited(!isFirstDayUnlimited),
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }
            )}

            {/* Subscription Section */}
            {renderDebugButton(
              'subscription',
              'star',
              'Subscription Testing',
              'Toggle between different subscription states',
              () => {
                Alert.alert(
                  'Subscription Options',
                  'Choose a subscription state:',
                  [
                    {
                      text: 'MacroScan Unlimited',
                      onPress: () => handleSubscriptionChange('unlimited'),
                    },
                    {
                      text: 'Free Plan',
                      onPress: () => handleSubscriptionChange('free'),
                    },
                    {
                      text: 'Toggle Ads Removal',
                      onPress: () => handleSubscriptionChange('ads'),
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }
            )}

            {/* Features Section */}
            {renderDebugButton(
              'features',
              'construct',
              'Feature Controls',
              'Test models and processing modes',
              () => {
                Alert.alert(
                  'Feature Options',
                  'Choose a feature to modify:',
                  [
                    {
                      text: 'Set Default Model',
                      onPress: () => handleModelChange('claude-3-haiku-20240307'),
                    },
                    {
                      text: 'Set Complex Model',
                      onPress: () => handleModelChange('claude-3-5-sonnet-20240620'),
                    },
                    {
                      text: 'Show Tutorial',
                      onPress: () => setShowTutorial(true),
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }
            )}

            <View style={styles.separator} />

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Current State</Text>
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Scans:</Text>
                  <Text style={styles.infoValue}>{scanCount === Infinity ? '∞' : scanCount}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Model:</Text>
                  <Text style={styles.infoValue}>
                    {selectedProvider === 'anthropic' 
                      ? selectedModel 
                      : MODELS[selectedProvider]?.regular || 'Not available'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Subscription:</Text>
                  <Text style={styles.infoValue}>{isSubscribed ? 'Unlimited' : 'Free'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>First Day:</Text>
                  <Text style={styles.infoValue}>{isFirstDayUnlimited ? 'Yes' : 'No'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AI Provider Selection</Text>
              <View style={styles.providerContainer}>
                <TouchableOpacity
                  style={[
                    styles.providerButton,
                    selectedProvider === 'anthropic' && styles.selectedProvider
                  ]}
                  onPress={() => handleProviderChange('anthropic')}
                >
                  <Text style={[
                    styles.providerText,
                    selectedProvider === 'anthropic' && styles.selectedProviderText
                  ]}>Anthropic</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.providerButton,
                    selectedProvider === 'openai' && styles.selectedProvider
                  ]}
                  onPress={() => handleProviderChange('openai')}
                >
                  <Text style={[
                    styles.providerText,
                    selectedProvider === 'openai' && styles.selectedProviderText
                  ]}>OpenAI</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.providerButton,
                    selectedProvider === 'gemini' && styles.selectedProvider
                  ]}
                  onPress={() => handleProviderChange('gemini')}
                >
                  <Text style={[
                    styles.providerText,
                    selectedProvider === 'gemini' && styles.selectedProviderText
                  ]}>Gemini</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Processing Times</Text>
              <View style={styles.currentModelCard}>
                <Text style={styles.currentModelLabel}>Current Model:</Text>
                <Text style={styles.currentModelValue}>
                  {selectedProvider === 'anthropic' 
                    ? selectedModel 
                    : MODELS[selectedProvider]?.regular || 'Not available'}
                </Text>
                <Text style={styles.currentModelProvider}>({selectedProvider})</Text>
              </View>

              {/* Processing Times Graph */}
              {(() => {
                // Check if we have any processing times
                const hasAnyTimes = processingTimes && Object.keys(processingTimes).length > 0;
    
                if (!hasAnyTimes) {
                  return (
                    <View style={styles.noTimesContainer}>
                      <Text style={styles.noTimesText}>
                        No processing times available. Complete some successful scans to see performance data.
                      </Text>
                    </View>
                  );
                }

                // Calculate the max time across all providers and models
                const allTimes = [];
                Object.entries(processingTimes).forEach(([provider, models]) => {
                  Object.entries(models).forEach(([model, modes]) => {
                    if (modes && typeof modes === 'object') {
                      if (typeof modes.fast === 'number') allTimes.push(modes.fast);
                      if (typeof modes.accurate === 'number') allTimes.push(modes.accurate);
                    }
                  });
                });
                const maxTime = allTimes.length > 0 ? Math.max(...allTimes) : 1;

                // Get fastest models
                const fastestModels = getFastestModels(processingTimes);
    
                return (
                  <View style={styles.processingTimesContainer}>
                    {Object.entries(processingTimes).map(([provider, models]) => (
                      <View key={provider} style={styles.providerSection}>
                        <Text style={styles.providerTitle}>{provider.charAt(0).toUpperCase() + provider.slice(1)}</Text>
                        {Object.entries(models).map(([model, modes]) => {
                          // Skip rendering for Gemini 1.5 Pro models
                          if (!modes || typeof modes !== 'object' || (provider === 'gemini' && model.includes('pro'))) return null;
                          
                          return (
                            <View key={`${provider}-${model}`} style={styles.modelTimingCard}>
                              <View style={styles.modelHeader}>
                                <Text style={styles.modelName}>{model}</Text>
                              </View>
                              
                              {/* Fast Mode Bar */}
                              <View style={styles.timeBarContainer}>
                                <Text style={styles.timeLabel}>Fast:</Text>
                                <View style={styles.timeBarWrapper}>
                                  {typeof modes.fast === 'number' ? (
                                    <View style={[
                                      styles.timeBar,
                                      { width: `${(modes.fast / maxTime) * 100}%` }
                                    ]}>
                                      <Text style={styles.timeValue}>
                                        {(modes.fast / 1000).toFixed(1)}s
                                        {modes.fast === fastestModels.fast.time && (
                                          <Ionicons
                                            name="trophy"
                                            size={14}
                                            color="#FFD700"
                                            style={styles.trophyIcon}
                                          />
                                        )}
                                      </Text>
                                    </View>
                                  ) : (
                                    <Text style={styles.noTimeText}>No data</Text>
                                  )}
                                </View>
                              </View>
    
                              {/* Accurate Mode Bar - Only render if not a Haiku model */}
                              {!model.includes('haiku') && (
                                <View style={styles.timeBarContainer}>
                                  <Text style={styles.timeLabel}>Accurate:</Text>
                                  <View style={styles.timeBarWrapper}>
                                    {typeof modes.accurate === 'number' ? (
                                      <View style={[
                                        styles.timeBar,
                                        { width: `${(modes.accurate / maxTime) * 100}%` }
                                      ]}>
                                        <Text style={styles.timeValue}>
                                          {(modes.accurate / 1000).toFixed(1)}s
                                          {modes.accurate === fastestModels.accurate.time && (
                                            <Ionicons
                                              name="trophy"
                                              size={14}
                                              color="#FFD700"
                                              style={styles.trophyIcon}
                                            />
                                          )}
                                        </Text>
                                      </View>
                                    ) : (
                                      <Text style={styles.noTimeText}>No data</Text>
                                    )}
                                  </View>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                );
              })()}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const getDynamicStyles = (colorScheme) => StyleSheet.create({
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
  description: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#999' : '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  content: {
    marginTop: '2%',
    marginBottom: '20%',
  },
  pinContainer: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F0F0F0',
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#2C2C2E' : '#F0F0F0',

  },
  input: {
    fontSize: 18,
    padding: 15,
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5',
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5E5',
  },
  submitButton: {
    backgroundColor: colorScheme === 'dark' ? '#FFF' : '#000',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colorScheme === 'dark' ? '#000' : '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  debugButton: {
    borderRadius: 17,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  debugButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  debugIconContainer: {
    backgroundColor: colorScheme === 'dark' ? '#3c3c3e' : '#e0e0e0',
    padding: 12,
    borderRadius: 12,
    marginRight: 15,
  },
  debugTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  debugButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    marginBottom: 4,
  },
  debugButtonDescription: {
    fontSize: 13,
    color: colorScheme === 'dark' ? '#bbb' : '#666',
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: colorScheme === 'dark' ? '#333' : '#e0e0e0',
    marginVertical: 20,
  },
  infoSection: {
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f0f0f0',
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoContainer: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: colorScheme === 'dark' ? '#999' : '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
  },
  // Tutorial styles
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
    backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
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
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    marginBottom: 10,
  },
  providerContainer: {
    marginTop: 10,
    gap: 10,
  },
  providerButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#f0f0f0',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#2C2C2E' : '#ddd',
  },
  selectedProvider: {
    backgroundColor: '#007AFF',
    borderColor: '#0056B3',
  },
  providerText: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#FFF' : '#333',
  },
  selectedProviderText: {
    color: '#fff',
    fontWeight: '500',
  },
  processingTimeCard: {
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f0f0f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5e5',
  },
  processingTimeProvider: {
    fontSize: 18,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    marginBottom: 8,
  },
  processingTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  processingTimeLabel: {
    fontSize: 14,
    color: colorScheme === 'dark' ? '#999' : '#666',
  },
  processingTimeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
  },
  currentModelCard: {
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f0f0f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5e5',
  },
  currentModelLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    marginBottom: 4,
  },
  currentModelValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
  },
  currentModelProvider: {
    fontSize: 14,
    color: colorScheme === 'dark' ? '#999' : '#666',
  },
  processingTimesContainer: {
    marginTop: 10,
  },
  modelTimingCard: {
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f0f0f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5e5',
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
  },
  providerName: {
    fontSize: 14,
    color: colorScheme === 'dark' ? '#999' : '#666',
    marginLeft: 8,
  },
  timeBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeLabel: {
    width: 70,
    fontSize: 14,
    color: colorScheme === 'dark' ? '#999' : '#666',
  },
  timeBarWrapper: {
    flex: 1,
    height: 24,
    backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5e5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  timeBar: {
    height: '100%',
    backgroundColor: colorScheme === 'dark' ? '#0A84FF' : '#007AFF',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 8,
    minWidth: 60,
  },
  timeValue: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  trophyIcon: {
    marginLeft: 4,
  },
  noTimesContainer: {
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f0f0f0',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noTimesText: {
    color: colorScheme === 'dark' ? '#999' : '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  noTimeText: {
    color: colorScheme === 'dark' ? '#999' : '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 4,
  },
  providerSection: {
    marginBottom: 24,
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f0f0f0',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5e5',
  },
  providerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    marginBottom: 12,
    textAlign: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5e5',
  },
});

export default DebuggingScreen;
