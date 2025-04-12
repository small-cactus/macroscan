import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput,
  ScrollView, 
  Dimensions, 
  useColorScheme,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeInDown,
  SlideInRight,
  ZoomIn
} from 'react-native-reanimated';
import { useUser } from '../userContext';
import { LinearGradient } from 'expo-linear-gradient';
import EnhancedStreakVisualization from './EnhancedStreakVisualization';
import StreakVisualization from './StreakVisualization';

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

// Calculate scale factor based on screen size
const baseWidth = 430;
const baseHeight = 932;
const scaleWidth = width / baseWidth;
const scaleHeight = height / baseHeight;
const scale = Math.min(scaleWidth, scaleHeight);

const PRODUCT_HISTORY_KEY = '@product_history';

// Toggle to use our new streak visualization instead of enhanced one
const USE_NEW_STREAK_VISUALIZATION = true;

const ProfileScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getDynamicStyles(isDark);
  
  // State
  const [name, setName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [streakData, setStreakData] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);
  const [stats, setStats] = useState({
    totalScans: 0,
    uniqueItems: 0,
    avgCalories: 0,
    mostScanned: { name: '', count: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Context
  const { user, updateUser } = useUser();
  const navigation = useNavigation();

  // Load user data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const savedName = await AsyncStorage.getItem('userName');
        setName(savedName || '');
        setEditedName(savedName || '');
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };
    
    loadProfile();
  }, []);

  // Calculate streak and load history when screen is focused
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadData = async (isFirstLoad) => {
        if (isFirstLoad) {
          // No need to set isLoading(true) here, it defaults to true
          // No need to set isInitialLoad(true) here, it defaults to true
        } else {
          if (isMounted) setIsLoading(false);
        }

        try {
          await calculateStreak();
          await loadScanHistory();
          
          if (isMounted) {
            setDataLoaded(true);
            if (isFirstLoad) {
               setTimeout(() => {
                  if(isMounted) {
                    setIsLoading(false); 
                  }
               }, 300);
            } else {
               setIsLoading(false); 
               setIsInitialLoad(false);
            }
          }
        } catch (error) {
          console.error('Error loading profile data:', error);
          if (isMounted) {
            setIsLoading(false);
            setIsInitialLoad(false);
            setDataLoaded(true);
          }
        }
      };

      if (!dataLoaded) {
         loadData(true); 
      } else {
         loadData(false);
      }

      setIsEditingName(false);

      return () => {
        isMounted = false;
      };
    }, [dataLoaded])
  );

  // Calculate streak
  const calculateStreak = async () => {
    try {
      const historyJson = await AsyncStorage.getItem(PRODUCT_HISTORY_KEY);
      const history = historyJson ? JSON.parse(historyJson) : [];
      
      if (!Array.isArray(history)) {
        console.error("History data is not an array:", history);
        setStreakData(Array.from({ length: 7 }, (_, i) => ({ day: i + 1, completed: false })));
        return;
      }

      // Sort history by date
      history.sort((a, b) => new Date(b.date) - new Date(a.date));

      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const scannedDays = new Set();
      history.forEach(item => {
        if (item.date) {
          const scanDate = new Date(item.date);
          scanDate.setHours(0, 0, 0, 0);
          scannedDays.add(scanDate.getTime());
        }
      });

      for (let i = 0; ; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        if (scannedDays.has(checkDate.getTime())) {
          currentStreak++;
        } else break;
      }

      setStreakData(Array.from({ length: 7 }, (_, i) => ({
        day: i + 1,
        completed: i < currentStreak,
      })));

    } catch (error) {
      console.error('Failed to calculate streak:', error);
      setStreakData(Array.from({ length: 7 }, (_, i) => ({ day: i + 1, completed: false })));
    }
  };

  // Load scan history and calculate stats
  const loadScanHistory = async () => {
    try {
      const historyJson = await AsyncStorage.getItem(PRODUCT_HISTORY_KEY);
      const history = historyJson ? JSON.parse(historyJson) : [];
      
      if (!Array.isArray(history)) return;
      
      setScanHistory(history.slice(0, 5));
      
      const totalScans = history.length;
      const uniqueItems = new Set(history.map(item => item.productName?.toLowerCase())).size;
      
      const caloriesData = history.reduce((acc, item) => {
        if (item.nutrients?.calories) {
          acc.total += item.nutrients.calories;
          acc.count++;
        }
        return acc;
      }, { total: 0, count: 0 });
      
      const avgCalories = caloriesData.count ? Math.round(caloriesData.total / caloriesData.count) : 0;
      
      const itemCounts = history.reduce((acc, item) => {
        if (item.productName) {
          const name = item.productName.toLowerCase();
          acc[name] = (acc[name] || 0) + 1;
        }
        return acc;
      }, {});
      
      const mostScanned = Object.entries(itemCounts)
        .reduce((max, [name, count]) => 
          count > max.count ? { name, count } : max, 
          { name: '', count: 0 }
        );
      
      setStats({
        totalScans,
        uniqueItems,
        avgCalories,
        mostScanned
      });
      
    } catch (error) {
      console.error('Error loading scan history:', error);
    }
  };

  // Save user data
  const saveUserData = async () => {
    if (editedName.trim() === '') {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    try {
      setName(editedName);
      await AsyncStorage.setItem('userName', editedName);
      setIsEditingName(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to save data:', error);
      Alert.alert('Error', 'Failed to save data.');
    }
  };

  // Delete account
  const deleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              // Updated list of keys from AccountScreen.js
              const keysToRemove = [
                // User related
                '@user',
                '@user_goals',
                // '@user_data', //stores all goal related inputs that are saved in onboarding
                '@user_logged_in',
                '@apikey',
                'userName',
                'userImageUri', // Added from AccountScreen logic

                // Product and history related
                '@product_history',
                '@average_processing_times', // Added from AccountScreen logic
                // LAST_PLACEHOLDER_KEY, // These might not be defined here
                // LAST_PLACEHOLDER_TIME_KEY,
                // FILTER_SECTION_STATE_KEY,

                // App state and settings
                'selectedModel',
                'selectedMode',
                '@selected_provider',
                'foodSelectionEnabled', // Added from AccountScreen logic
                '@openai_api_key', // Added from AccountScreen logic
                '@gemini_api_key', // Added from AccountScreen logic
                '@anthropic_api_key', // Added from AccountScreen logic
                '@selected_macro', // Added from AccountScreen logic

                // Usage tracking
                'dailyScanCount',
                'firstUseDate',
                'dateLastUsed',
                'freeAccurateScansUsed', // Added from AccountScreen logic
                'selectedProcessing', // Added from AccountScreen logic
                'selectedProvider', // Added from AccountScreen logic
                'previousModel', // Added from AccountScreen logic
                'hasScannedEver', // Added from AccountScreen logic

                // Onboarding and tutorials
                'hasViewedTutorial',
                'hasViewedFeaturesTutorial', // Added from AccountScreen logic
                '@has_seen_whats_new_1_6_0', // Added from AccountScreen logic
                '@visited_steps', // Added from AccountScreen logic

                // paywall
                '@paywall_last_shown',
                '@has_ever_scanned', // Added from AccountScreen logic
              ];
              
              await AsyncStorage.multiRemove(keysToRemove);
              
              // Clear user context
              if (updateUser) updateUser(null);
              
              // Add navigation logic from AccountScreen.js
              setTimeout(() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'WelcomeScreen' }], // Assuming 'Goodbye' screen exists
                });
              }, 100);

            } catch (error) {
              console.error('Failed to delete account:', error);
              Alert.alert('Error', 'Failed to delete account.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Toggle name editing
  const handleEditNameToggle = () => {
    if (isEditingName) {
      saveUserData();
    } else {
      setEditedName(name);
      setIsEditingName(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Screen Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.screenTitle}>Profile</Text>
      </View>

      {/* Background gradient - REMOVED */}
      {/* <LinearGradient
        colors={isDark ? ['#1A1A1A', '#121212'] : ['#FFFFFF', '#F5F5F5']}
        style={styles.backgroundGradient}
      /> */}
      
      {/* Render content only when animations are ready */}
      {dataLoaded && !isLoading && (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Name Section */}
          <Animated.View 
            entering={isInitialLoad ? FadeInDown.delay(100).duration(400) : undefined}
            style={styles.headerContainer}
          >
            <Text style={styles.profileLabel}>YOUR NAME</Text>
            <View style={styles.nameHeaderContainer}>
              {isEditingName ? (
                <TextInput
                  style={styles.nameInput}
                  value={editedName}
                  onChangeText={setEditedName}
                  autoFocus={true}
                  onBlur={saveUserData}
                  onSubmitEditing={saveUserData}
                  placeholder="Enter your name"
                  placeholderTextColor={styles.placeholderText.color}
                />
              ) : (
                <Text style={styles.name}> 
                  {name || 'Your Name'}
                </Text>
              )}
              <TouchableOpacity 
                onPress={handleEditNameToggle} 
                style={styles.editIconContainer}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name={isEditingName ? "check" : "pencil-outline"} 
                  size={24 * scale} 
                  color={styles.editIcon.color} 
                />
              </TouchableOpacity>
            </View>
            
            {/* <Text style={styles.subtitle}>
              {stats.totalScans > 0 ? `${stats.totalScans} scans • ${stats.uniqueItems} unique items` : 'No scans yet'}
            </Text> */}
          </Animated.View>

          {/* Streak Section */} 
          <Animated.View 
            entering={isInitialLoad ? FadeInDown.delay(300).duration(400) : undefined}
            style={styles.sectionContainer}
          >
            <Text style={styles.profileLabel}>YOUR STREAK</Text>
            <View style={styles.card}>
              <View style={styles.streakContainer}>
                {USE_NEW_STREAK_VISUALIZATION ? (
                  <StreakVisualization 
                    progressDays={streakData}
                    isDark={isDark}
                  />
                ) : (
                  <EnhancedStreakVisualization 
                    progressDays={streakData}
                  />
                )}
              </View>
            </View>
          </Animated.View>

          {/* Stats Section */} 
          <Animated.View 
            entering={isInitialLoad ? FadeInDown.delay(400).duration(400) : undefined}
            style={styles.sectionContainer}
          >
            <Text style={styles.profileLabel}>STATISTICS</Text>
            <View style={styles.statsGrid}>
              {[
                {
                  icon: 'food-apple',
                  value: stats.totalScans,
                  label: 'Total Scans',
                  iconBg: '#FF6B6B'
                },
                {
                  icon: 'playlist-check',
                  value: stats.uniqueItems,
                  label: 'Unique Items',
                  iconBg: '#4ECDC4'
                }
                // Only showing two cards as in the screenshot
              ].map((stat, index) => {
                // Calculate gradient color based on theme
                const gradientColor = isDark
                  ? darkenColor(stat.iconBg, 0.3) 
                  : lightenColor(stat.iconBg, 0.2); // Use existing helpers

                return (
                  <Animated.View
                    key={index}
                    entering={isInitialLoad ? FadeInDown.delay(450 + index * 100).duration(400) : undefined}
                    style={styles.statCard}
                  >
                    <View style={styles.iconContainer}>
                      {/* Add the gradient behind the icon */}
                      <LinearGradient
                        colors={[stat.iconBg, gradientColor]} // Use original and theme-adjusted color
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      {/* Render the icon on top */}
                      <MaterialCommunityIcons name={stat.icon} size={22 * scale} color="#FFF" />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statValue} numberOfLines={1}>
                        {stat.value}
                      </Text>
                      <Text style={styles.statLabel} numberOfLines={1}>
                        {stat.label}
                      </Text>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>

          {/* Settings/Delete Button */} 
          <Animated.View 
            entering={isInitialLoad ? FadeInDown.delay(500).duration(400) : undefined}
            style={styles.sectionContainer}
          >
            <TouchableOpacity 
              style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
              onPress={deleteAccount}
              activeOpacity={0.8}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#FF453A" />
              ) : (
                <>
                  <MaterialCommunityIcons name="delete-outline" size={20 * scale} color={styles.deleteButtonText.color} />
                  <Text style={styles.deleteButtonText}>Delete Account</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      )}
      
      {/* Loading Blur Overlay - Rendered only when isLoading is true */}
      {isLoading && (
        <BlurView
          intensity={isDark ? 50 : 90} // Adjust intensity as needed
          tint={isDark ? "dark" : "light"}
          style={styles.loadingOverlay} // Reference the style below
        >
          <ActivityIndicator size="large" color={isDark ? "#FFF" : "#000"} />
        </BlurView>
      )}
    </SafeAreaView>
  );
};

// Helper functions
const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Color utility functions
const lightenColor = (hex, amount) => {
  // Convert hex to RGB
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  // Lighten
  r = Math.min(255, Math.round(r + (255 - r) * amount));
  g = Math.min(255, Math.round(g + (255 - g) * amount));
  b = Math.min(255, Math.round(b + (255 - b) * amount));

  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const darkenColor = (hex, amount) => {
  // Convert hex to RGB
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  // Darken
  r = Math.max(0, Math.round(r * (1 - amount)));
  g = Math.max(0, Math.round(g * (1 - amount)));
  b = Math.max(0, Math.round(b * (1 - amount)));

  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const getDynamicStyles = (isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#000' : '#FFF',
  },
  titleContainer: {
    paddingHorizontal: 16 * scale,
    paddingTop: Platform.OS === 'android' ? 10 * scale : 10 * scale,
    paddingBottom: 5 * scale,
  },
  screenTitle: {
    fontSize: 34 * scale,
    fontWeight: 'bold',
    color: isDark ? '#FFF' : '#000',
    marginBottom: 5 * scale,
    textAlign: 'center',
  },
  scrollContent: {
    paddingTop: 10 * scale,
    paddingBottom: 50 * scale,
    paddingHorizontal: 16 * scale,
  },
  headerContainer: {
    alignItems: 'flex-start',
    marginBottom: 20 * scale,
    paddingHorizontal: 5 * scale,
  },
  profileLabel: {
    fontSize: 12 * scale,
    fontWeight: '600',
    color: isDark ? '#AAA' : '#888',
    marginBottom: 5 * scale,
    letterSpacing: 1,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginLeft: 18 * scale,
  },
  welcomeContainer: {
    marginBottom: 25 * scale,
    width: '100%',
    paddingHorizontal: 5 * scale,
  },
  welcomeText: {
    fontSize: 15 * scale,
    lineHeight: 22 * scale,
    color: isDark ? '#BBB' : '#666',
    textAlign: 'center',
    paddingHorizontal: 10 * scale,
  },
  sectionContainer: {
    marginBottom: 30 * scale,
    paddingLeft: 5 * scale,
  },
  nameHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8 * scale,
    borderWidth: 1,
    borderColor: isDark ? '#333' : '#E5E5E5',
    borderRadius: 20 * scale,
    paddingVertical: 8 * scale,
    paddingHorizontal: 8 * scale,
    width: '100%',
    backgroundColor: isDark ? '#121212' : '#F5F5F5',
  },
  name: {
    fontSize: 22 * scale,
    fontWeight: '600',
    color: isDark ? '#FFF' : '#000',
    textAlign: 'left',
    flex: 1,
    marginLeft: 10 * scale,
  },
  nameInput: {
    fontSize: 22 * scale,
    fontWeight: '600',
    color: isDark ? '#FFF' : '#000',
    paddingVertical: Platform.OS === 'ios' ? 0 : 0,
    textAlign: 'left',
    flex: 1,
  },
  placeholderText: {
    color: isDark ? '#888' : '#AAA',
  },
  editIconContainer: {
    padding: 5 * scale,
    marginLeft: 10 * scale,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    borderRadius: 15 * scale,
    width: 40 * scale,
    height: 40 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    color: isDark ? '#FFF' : '#666',
  },
  subtitle: {
    fontSize: 16 * scale,
    color: isDark ? '#BBB' : '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20 * scale,
    fontWeight: '600',
    color: isDark ? '#FFF' : '#000',
    marginBottom: 14 * scale,
  },
  card: {
    backgroundColor: isDark ? '#121212' : '#F5F5F5',
    borderRadius: 28 * scale,
    padding: 15 * scale,
    borderWidth: 1,
    borderColor: isDark ? '#333' : '#E5E5E5',
    overflow: 'hidden',
    alignItems: 'center',
  },
  streakContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 5,
    alignItems: 'center',
  },
  statCard: {
    backgroundColor: isDark ? '#121212' : '#F5F5F5',
    borderRadius: 22 * scale,
    padding: 12 * scale,
    width: width * 0.42,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? '#333' : '#E5E5E5',
    marginBottom: 15 * scale,
    minHeight: 80 * scale,
  },
  iconContainer: {
    width: 45 * scale,
    height: 45 * scale,
    borderRadius: 15 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10 * scale,
    overflow: 'hidden',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 22 * scale,
    fontWeight: '600',
    color: isDark ? '#FFF' : '#000',
    marginBottom: 2 * scale,
  },
  statLabel: {
    fontSize: 14 * scale,
    color: isDark ? '#BBB' : '#666',
    fontWeight: '400',
  },
  deleteButton: {
    backgroundColor: isDark ? '#121212' : '#F5F5F5',
    borderRadius: 18 * scale,
    paddingVertical: 15 * scale,
    paddingHorizontal: 20 * scale,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10 * scale,
  },
  deleteButtonText: {
    fontSize: 16 * scale,
    fontWeight: '500',
    color: '#FF453A',
    marginLeft: 8 * scale,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});

export default ProfileScreen; 