import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, Animated, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeInDown } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

const StreakVisualization = ({ isDark, progressDays = [], isContinuable = false }) => {
  // Calculate current streak
  const currentStreak = progressDays.filter(day => day.completed).length;
  
  // Calculate number of days based on prop length
  const numDays = progressDays.length;
  const numConnectors = numDays > 0 ? numDays - 1 : 0;

  // Use useRef to hold the animation arrays
  const dayAnimations = useRef([]);
  const connectorAnimations = useRef([]);
  const streakCountAnimation = useRef(new Animated.Value(0)).current;
  const continuableOpacityAnimation = useRef(new Animated.Value(1)).current; // Animation for continuable state
  const continuableAnimationRef = useRef(null); // Ref to store the looping animation
  
  // Animation values for view toggling
  const infoOpacity = useRef(new Animated.Value(0)).current;
  const mainViewOpacity = useRef(new Animated.Value(1)).current;
  const infoTranslateY = useRef(new Animated.Value(200)).current;
  const mainViewTranslateY = useRef(new Animated.Value(0)).current;
  
  // State to track which view is currently active
  const [activeView, setActiveView] = useState('main');
  // State to track if entry animation has run
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  // State to track if we should show the confetti animation
  const [showConfetti, setShowConfetti] = useState(false);
  // Ref to track previous continuable state
  const prevContinuableRef = useRef(isContinuable);
  // Ref for the Lottie animation
  const confettiRef = useRef(null);
  // Ref to track if this is the first render
  const didMountRef = useRef(false);

  // Get motivational message based on streak
  const getMotivationalMessage = (streak, isContinuable) => {
    if (isContinuable && streak > 0) return "Streak running out! Scan today to keep it going!";
    if (streak === 0) return "Scan a meal to get started!";
    if (streak === 1) return "Great start! Keep it going!";
    if (streak === 2) return "Two days strong! You're building momentum!";
    if (streak === 3) return "Three days in! You're forming a habit!";
    if (streak >= 4 && streak <= 6) return "Fantastic progress! Keep pushing!";
    if (streak >= 7) return "Incredible! You're on fire! 🔥";
    return "Keep going! Every day counts!";
  };

  // Effect to handle animations based on data presence and animation state
  useEffect(() => {
    // Initialize/resize refs
    if (dayAnimations.current.length !== numDays) {
      dayAnimations.current = Array(numDays).fill(0).map(() => new Animated.Value(0));
    }
    if (connectorAnimations.current.length !== numConnectors) {
      connectorAnimations.current = Array(numConnectors).fill(0).map(() => new Animated.Value(0));
    }

    if (numDays > 0) {
      if (!hasAnimatedIn) {
        // First time with data: reset, animate, set flag
        resetAnimations(); // Ensure reset before animation
        
        // Timer for initial streak count animation
        const countTimerId = setTimeout(() => {
          animateStreakCount();
          setHasAnimatedIn(true); // Set flag after count starts
        }, 0); 

        // Timer for delayed days/connectors animation
        const daysDelay = 300; // Delay for days animation start (adjust as needed)
        const daysTimerId = setTimeout(() => {
          animateDaysAndConnectors();
        }, daysDelay); 

        // Cleanup both timers
        return () => {
          clearTimeout(countTimerId);
          clearTimeout(daysTimerId);
          // Stop pulsing animation if component unmounts or data clears
          stopPulsingAnimation(); 
        };
      } else {
        // Data updated after initial animation: set directly to final state
        setToFinalState();
      }
    } else {
      // No data: reset everything and clear the flag
      resetAnimations();
      setHasAnimatedIn(false);
    }
  }, [numDays, progressDays, isContinuable]); // Rerun when data changes OR isContinuable changes

  // Effect to detect streak renewal and trigger confetti
  useEffect(() => {
    // Skip this effect on first render to avoid false streak renewal detection
    if (!didMountRef.current) {
      didMountRef.current = true;
      prevContinuableRef.current = isContinuable;
      return;
    }
    
    // Check if streak was renewed: was continuable (about to break) but now it's not
    // And current streak is still greater than 0 (streak was actually renewed, not just reset)
    if (prevContinuableRef.current && !isContinuable && currentStreak > 0) {
      setShowConfetti(true);
      // Provide success haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Auto-hide confetti after animation completes
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000); // Adjust time as needed for your animation duration
      
      return () => clearTimeout(timer);
    }
    
    // Update the previous continuable state
    prevContinuableRef.current = isContinuable;
  }, [isContinuable, currentStreak]);
  
  // Play confetti animation when it becomes visible
  useEffect(() => {
    if (showConfetti && confettiRef.current) {
      // Reset and play animation
      confettiRef.current.reset();
      confettiRef.current.play();
    }
  }, [showConfetti]);

  // Helper function to start the pulsing animation
  const startPulsingAnimation = () => {
    if (continuableAnimationRef.current) {
      continuableAnimationRef.current.stop(); // Stop existing animation first
    }
    continuableAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(continuableOpacityAnimation, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(continuableOpacityAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    continuableAnimationRef.current.start();
  };

  // Helper function to stop the pulsing animation
  const stopPulsingAnimation = () => {
    if (continuableAnimationRef.current) {
      continuableAnimationRef.current.stop();
      continuableAnimationRef.current = null;
    }
    // Ensure opacity returns to 1 when stopped
    Animated.timing(continuableOpacityAnimation, {
      toValue: 1,
      duration: 200, // Short duration for reset
      useNativeDriver: true,
    }).start();
  };

  // Function to reset animations to initial state (invisible/default)
  const resetAnimations = () => {
    if (!dayAnimations.current || !connectorAnimations.current) return;
    dayAnimations.current.forEach(anim => anim.setValue(0));
    connectorAnimations.current.forEach(anim => anim.setValue(0));
    streakCountAnimation.setValue(0);
    infoOpacity.setValue(0);
    mainViewOpacity.setValue(1);
    infoTranslateY.setValue(200);
    mainViewTranslateY.setValue(0);
    // Stop pulsing and reset opacity
    stopPulsingAnimation();
    // Hide confetti if it's showing
    setShowConfetti(false);
    setActiveView('main');
  };
  
  // Function to set animated values directly to their final state
  const setToFinalState = () => {
    if (!dayAnimations.current || !connectorAnimations.current) return;
    dayAnimations.current.forEach(anim => anim.setValue(1));
    connectorAnimations.current.forEach(anim => anim.setValue(1));
    streakCountAnimation.setValue(1);
    infoOpacity.setValue(0);
    mainViewOpacity.setValue(1);
    infoTranslateY.setValue(200);
    mainViewTranslateY.setValue(0);
    setActiveView('main');
    // Ensure pulsing state is correct for the final state
    if (isContinuable) {
      startPulsingAnimation();
    } else {
      stopPulsingAnimation();
    }
    
    // Don't automatically trigger confetti in setToFinalState
    // The useEffect watching isContinuable will handle that
  };

  // Animate only the streak count
  const animateStreakCount = () => {
    Animated.spring(streakCountAnimation, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start(() => {
      // After count animation, check if pulsing should start
      if (isContinuable) {
        startPulsingAnimation();
      }
    });
  };

  // Animate only the days and connectors
  const animateDaysAndConnectors = () => {
    if (!dayAnimations.current || !connectorAnimations.current || numDays === 0) return;
    
    const animationSequence = [];
    dayAnimations.current.forEach((anim, index) => {
      const dayAnimationDelay = 50 * (index * 2); // Keep original stagger delay logic relative to this start
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, dayAnimationDelay); // Delay haptics relative to days animation start

      animationSequence.push(
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        })
      );

      if (index < connectorAnimations.current.length) {
        animationSequence.push(
          Animated.spring(connectorAnimations.current[index], {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          })
        );
      }
    });

    // Start the stagger animation for days/connectors
    Animated.stagger(50, animationSequence).start(() => {
      // Haptic feedback for completion of days animation
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  };

  // Function to handle toggling between views (unchanged)
  const toggleView = () => {
    if (activeView === 'main') {
      // Provide haptic feedback for transition to info
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Transition from main to info
      Animated.parallel([
        Animated.timing(mainViewOpacity, {
          toValue: 0.2,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(mainViewTranslateY, {
          toValue: -200,
          tension: 20,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(infoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(infoTranslateY, {
          toValue: 0,
          tension: 20,
          friction: 10,
          useNativeDriver: true,
        })
      ]).start();
      setActiveView('info');
    } else {
      // Provide haptic feedback for transition to main
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Transition from info to main
      Animated.parallel([
        Animated.timing(mainViewOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(mainViewTranslateY, {
          toValue: 0,
          tension: 20,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(infoOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(infoTranslateY, {
          toValue: 200,
          tension: 20,
          friction: 10,
          useNativeDriver: true,
        })
      ]).start();
      setActiveView('main');
    }
  };

  // Split days into two rows
  const midPoint = Math.ceil(numDays / 2);
  const firstRowDays = progressDays.slice(0, midPoint);
  const secondRowDays = progressDays.slice(midPoint);

  const renderDayCircle = (day, completed, animationIndex) => (
    <Animated.View style={[
      styles.dayCircle,
      {
        backgroundColor: completed
          ? (isDark ? '#FFF' : '#000')
          : isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
        transform: [
          { scale: dayAnimations.current[animationIndex] ? dayAnimations.current[animationIndex] : 0 },
        ],
        opacity: dayAnimations.current[animationIndex] ? dayAnimations.current[animationIndex] : 0
      }
    ]}>
      {completed ? (
        <MaterialCommunityIcons
          name={day === 1 ? "flag" : "fire"}
          size={18}
          color={isDark ? '#000' : '#FFF'}
        />
      ) : (
        <Text style={[
          styles.dayNumber,
          { color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }
        ]}>
          {day}
        </Text>
      )}
    </Animated.View>
  );

  const renderHorizontalConnector = (completed, animationIndex) => (
    <Animated.View style={[
      styles.horizontalConnector,
      {
        backgroundColor: completed
          ? (isDark ? '#FFF' : '#000')
          : isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
        transform: [
          { scaleX: animationIndex < connectorAnimations.current.length && connectorAnimations.current[animationIndex] ? connectorAnimations.current[animationIndex] : 0 }
        ],
        opacity: animationIndex < connectorAnimations.current.length && connectorAnimations.current[animationIndex] ? connectorAnimations.current[animationIndex] : 0
      }
    ]} />
  );

  return (
    <View style={styles.container}>
      {/* Confetti animation overlay */}
      {showConfetti && (
        <View style={styles.confettiContainer}>
          <LottieView
            ref={confettiRef}
            source={require('../assets/animations/confetti.json')}
            autoPlay
            loop={false}
            style={styles.confetti}
            resizeMode="cover"
          />
        </View>
      )}
      
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={toggleView}
        style={styles.touchableContainer}
      >
        {/* Main Streak View - Apply opacity and transform */}
        <Animated.View 
          style={[
            styles.progressTrackerContainer,
            {
              opacity: mainViewOpacity,
              transform: [{ translateY: mainViewTranslateY }]
            }
          ]}
        >
          {/* Streak Count Display */}
          <Animated.View style={[
            styles.streakCountContainer,
            {
              transform: [{ scale: streakCountAnimation }],
              // Apply only the entry animation opacity/scale to the container
              opacity: streakCountAnimation
            },
          ]}>
            {/* Wrap the gradient in an Animated.View to apply the pulsing opacity */}
            <Animated.View style={{ opacity: continuableOpacityAnimation }}>
              <LinearGradient
                colors={isDark ? ['#2E3B80', '#1F2359'] : ['#4B5EAC', '#2E3B80']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.streakCountGradient}
              >
                <Text style={styles.streakCountNumber}>{currentStreak}</Text>
                <Text style={styles.streakCountLabel}>DAY{currentStreak !== 1 ? 'S' : ''}</Text>
              </LinearGradient>
            </Animated.View>
          </Animated.View>

          {/* Motivational Message */}
          <Animated.Text style={[
            styles.motivationalMessage,
            { 
              color: isDark ? '#FFF' : '#000',
              opacity: streakCountAnimation // Only use entry animation opacity
            }
          ]}>
            {getMotivationalMessage(currentStreak, isContinuable)}
          </Animated.Text>

          <View style={styles.rowsContainer}>
            {/* First row */}
            <View style={styles.daysRow}>
              <View style={styles.dayRowContent}>
                {firstRowDays.map((day, index) => (
                  <React.Fragment key={`day-${day.day}`}>
                    {renderDayCircle(day.day, day.completed, index)}
                    {index < firstRowDays.length - 1 && renderHorizontalConnector(firstRowDays[index + 1].completed, index)}
                  </React.Fragment>
                ))}
              </View>
            </View>

            {secondRowDays.length > 0 && <View style={styles.rowSpacing} />}

            {/* Second row */}
            {secondRowDays.length > 0 && (
              <View style={styles.daysRow}>
                <View style={styles.dayRowContent}>
                  {secondRowDays.map((day, index) => (
                    <React.Fragment key={`day-${day.day}`}>
                      {renderDayCircle(day.day, day.completed, index + firstRowDays.length)}
                      {index < secondRowDays.length - 1 && renderHorizontalConnector(secondRowDays[index + 1].completed, index + firstRowDays.length)}
                    </React.Fragment>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Info Prompt */}
          <Animated.View 
            style={[
              styles.infoPrompt,
              { opacity: streakCountAnimation }
            ]}
          >
            <Text style={[
              styles.infoPromptText,
              { color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)' }
            ]}>
              Tap to learn more about streaks
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={16}
              color={isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)'}
            />
          </Animated.View>
        </Animated.View>

        {/* Info View - Background color instead of BlurView */}
        <Animated.View
          style={[
            styles.infoOverlay,
            {
              opacity: infoOpacity,
              transform: [{ translateY: infoTranslateY }],
              // Apply background color based on theme
              backgroundColor: isDark ? '#121212' : '#f6f6f6' 
            }
          ]}
          pointerEvents={activeView === 'info' ? 'auto' : 'none'}
        >
          <View style={styles.infoContainer}>
            <View style={styles.infoHeader}>
              <MaterialCommunityIcons 
                name="information-outline" 
                size={24} 
                color={isDark ? '#FFF' : '#000'} 
              />
              <Text style={[styles.infoTitle, { color: isDark ? '#FFF' : '#000' }]}>
                Understanding Your Streak
              </Text>
            </View>

            <View style={styles.infoContent}>
              {/* Wrap each section in Animated.View and apply entering animation */}
              {/* Section 1: What is a Streak? */}
              <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                <View style={styles.infoSection}>
                  <MaterialCommunityIcons name="calendar-check-outline" size={22} color={isDark ? '#A1AFFF' : '#4B5EAC'} style={styles.infoIcon} />
                  <View style={styles.infoTextContainer}>
                    <Text style={[styles.infoSectionTitle, { color: isDark ? '#FFF' : '#000' }]}>What is a Streak?</Text>
                    <Text style={[styles.infoText, { color: isDark ? '#DDD' : '#333' }]}>
                      Scan at least one meal a day, miss one day and the streak is broken.
                    </Text>
                  </View>
                </View>
              </Animated.View>

              {/* Section 2: Why Streaks Matter */}
              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                <View style={styles.infoSection}>
                  <MaterialCommunityIcons name="brain" size={22} color={isDark ? '#FFD700' : '#FFA500'} style={styles.infoIcon} />
                  <View style={styles.infoTextContainer}>
                    <Text style={[styles.infoSectionTitle, { color: isDark ? '#FFF' : '#000' }]}>Why Streaks Matter</Text>
                    <Text style={[styles.infoText, { color: isDark ? '#DDD' : '#333' }]}>
                      Build healthy habits (avg. 21 days) and improve nutrition awareness through consistency.
                    </Text>
                  </View>
                </View>
              </Animated.View>
              
              {/* Section 3: Keep Going */}
              <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                <View style={styles.infoSection}>
                  <MaterialCommunityIcons name="fire" size={22} color={isDark ? '#FF6B6B' : '#FF453A'} style={styles.infoIcon} />
                  <View style={styles.infoTextContainer}>
                    <Text style={[styles.infoSectionTitle, { color: isDark ? '#FFF' : '#000' }]}>Keep Going!</Text>
                    <Text style={[styles.infoText, { color: isDark ? '#DDD' : '#333' }]}>
                      Every scan counts towards your goals. Stay motivated and track your progress!
                    </Text>
                  </View>
                </View>
              </Animated.View>
            </View>

            <View style={styles.backPrompt}>
              <Text style={[styles.backPromptText, { color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)' }]}>
                Tap to return to streak view
              </Text>
              <MaterialCommunityIcons
                name="chevron-up"
                size={16}
                color={isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)'}
              />
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  touchableContainer: {
    width: '100%',
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressTrackerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  streakCountContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  streakCountGradient: {
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
    minWidth: 100,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 20,
  },
  streakCountNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  streakCountLabel: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
    opacity: 0.9,
    letterSpacing: 1,
  },
  motivationalMessage: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  rowsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    width: '100%',
  },
  daysRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '95%',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 0,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  horizontalConnector: {
    height: 2,
    width: 40,
    marginHorizontal: 0,
  },
  streakDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    fontWeight: '500',
  },
  infoPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  infoPromptText: {
    fontSize: 12,
    marginRight: 5,
  },
  infoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  infoContent: {
    width: '100%',
    paddingHorizontal: 5,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    width: '100%',
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'left',
  },
  backPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  backPromptText: {
    fontSize: 12,
    marginRight: 5,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    zIndex: 10,
    pointerEvents: 'none',
  },
  confetti: {
    width: '100%',
    height: '100%',
  },
});

export default StreakVisualization; 