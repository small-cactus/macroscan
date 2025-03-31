import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, Animated, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const ProgressVisualization = ({ isDark, isVisible = false, onAnimationComplete }) => {
  // Create animated values for each day
  const dayAnimations = useRef(Array(10).fill(0).map(() => new Animated.Value(0))).current;
  const connectorAnimations = useRef(Array(9).fill(0).map(() => new Animated.Value(0))).current;
  
  // Simplified animation values
  const graphOpacity = useRef(new Animated.Value(0)).current;
  const challengeOpacity = useRef(new Animated.Value(1)).current;
  const challengeTranslateY = useRef(new Animated.Value(0)).current;
  const graphTranslateY = useRef(new Animated.Value(200)).current;

  // State to track which view is currently active
  const [activeView, setActiveView] = useState('challenge');

  // Define the chart data
  const chartData = {
    labels: ['Start', '2 Weeks', '30 Days'],
    datasets: [
      {
        data: [0, 1, 0, 0, 25, 30],
        color: (opacity = 1) => isDark ? '#FFFFFF' : '#222',
        strokeWidth: 3
      }
    ]
  };

  // Function to handle toggling between views
  const toggleView = () => {
    if (activeView === 'challenge') {
      // Provide haptic feedback for transition to graph
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Transition from challenge to graph
      Animated.parallel([
        Animated.timing(challengeOpacity, {
          toValue: 0.4,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(challengeTranslateY, {
          toValue: 200,
          tension: 20,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(graphOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(graphTranslateY, {
          toValue: 0,
          tension: 20,
          friction: 10,
          useNativeDriver: true,
        })
      ]).start();
      setActiveView('graph');
    } else {
      // Provide haptic feedback for transition to challenge
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Transition from graph to challenge
      Animated.parallel([
        Animated.timing(challengeOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(challengeTranslateY, {
          toValue: -50,
          tension: 20,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(graphOpacity, {
          toValue: 0.4,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(graphTranslateY, {
          toValue: 260,
          tension: 20,
          friction: 10,
          useNativeDriver: true,
        })
      ]).start();
      setActiveView('challenge');
    }
  };

  // Reset and start animations
  const startAnimations = () => {
    // Reset all animations to initial state
    dayAnimations.forEach(anim => anim.setValue(0));
    connectorAnimations.forEach(anim => anim.setValue(0));
    graphOpacity.setValue(0);
    challengeOpacity.setValue(1);
    challengeTranslateY.setValue(0);
    graphTranslateY.setValue(200);
    setActiveView('challenge');

    const dayAnimationsArray = [];
    
    // Animate each day and its following connector
    dayAnimations.forEach((anim, index) => {
      // Add haptic feedback for each day animation with appropriate timing
      const dayAnimationDelay = 50 * (index * 2); // Match the stagger timing
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, dayAnimationDelay);
      
      dayAnimationsArray.push(
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        })
      );
      
      if (index < connectorAnimations.length) {
        dayAnimationsArray.push(
          Animated.spring(connectorAnimations[index], {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          })
        );
      }
    });

    // Start the 30-day challenge animation sequence
    Animated.stagger(50, dayAnimationsArray).start(() => {
      // Provide haptic feedback for transition to graph
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Animated.parallel([
        Animated.timing(challengeOpacity, {
          toValue: 0.4,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(challengeTranslateY, {
          toValue: 200,
          tension: 20,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(graphOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(graphTranslateY, {
          toValue: 0,
          tension: 20,
          friction: 10,
          useNativeDriver: true,
        })
      ]).start(() => {
        setActiveView('graph');
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      });
    });
  };

  // Trigger animation when isVisible changes to true
  useEffect(() => {
    if (isVisible) {
      startAnimations();
    }
  }, [isVisible]);

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: isDark ? '#010101' : '#fff',
    backgroundGradientTo: isDark ? '#1a1a1a' : '#e2e2e2',
    decimalPlaces: 0,
    color: (opacity = 1) => isDark ? '#FFFFFF' : '#000000',
    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity * 0.7})` : `rgba(0, 0, 0, ${opacity * 0.7})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '0',
      strokeWidth: '0',
      stroke: 'transparent'
    },
    propsForBackgroundLines: {
      strokeWidth: 0,
      strokeColor: 'transparent'
    },
    paddingRight: 30,
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 15,
    yAxisInterval: 1
  };

  // Sample data for the progress tracker showing 30-day streak requirement
  const progressDays = [
    { day: 1, completed: true },
    { day: 2, completed: false },
    { day: 3, completed: false },
    { day: 4, completed: false },
    { day: 5, completed: false },
    { day: 6, completed: false },
    { day: 7, completed: false },
    { day: 8, completed: false },
    { day: 9, completed: false },
    { day: 10, completed: false }
  ];

  // Split days into two rows
  const firstRowDays = progressDays.slice(0, 5);
  const secondRowDays = progressDays.slice(5);

  const renderDayCircle = (day, completed, animationIndex) => (
    <Animated.View style={[
      styles.dayCircle,
      { 
        backgroundColor: completed 
          ? (isDark ? '#FFF' : '#000')
          : isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
        transform: [
          { scale: dayAnimations[animationIndex] },
        ],
        opacity: dayAnimations[animationIndex]
      }
    ]}>
      {completed ? (
        <MaterialCommunityIcons 
          name={day === 1 ? "flag" : "fire"} 
          size={20} 
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
          { scaleX: connectorAnimations[animationIndex] }
        ],
        opacity: connectorAnimations[animationIndex]
      }
    ]} />
  );

  const renderProgressTracker = () => {
    return (
      <View style={styles.progressTrackerContainer}>
        <View style={styles.streakHeader}>
          <MaterialCommunityIcons 
            name="calendar-clock" 
            size={24} 
            color={isDark ? '#FFF' : '#000'} 
          />
          <Text style={[
            styles.streakTitle,
            { color: isDark ? '#FFF' : '#000' }
          ]}>
            30-Day Challenge
          </Text>
        </View>
        
        <View style={styles.rowsContainer}>
          {/* First row */}
          <View style={styles.daysRow}>
            {firstRowDays.map((day, index) => (
              <React.Fragment key={`day-${day.day}`}>
                {renderDayCircle(day.day, day.completed, index)}
                {index < firstRowDays.length - 1 && renderHorizontalConnector(firstRowDays[index + 1].completed, index)}
              </React.Fragment>
            ))}
          </View>
          
          {/* Add some vertical spacing between rows */}
          <View style={styles.rowSpacing} />
          
          {/* Second row */}
          <View style={styles.daysRow}>
            {secondRowDays.map((day, index) => (
              <React.Fragment key={`day-${day.day}`}>
                {renderDayCircle(day.day, day.completed, index + firstRowDays.length)}
                {index < secondRowDays.length - 1 && renderHorizontalConnector(secondRowDays[index + 1].completed, index + firstRowDays.length - 1)}
              </React.Fragment>
            ))}
          </View>
        </View>

        <Text style={[
          styles.streakDescription,
          { color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }
        ]}>
          Keep your streak going! Most users see significant results after 30 days of consistent tracking
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => activeView === 'challenge' ? toggleView() : null}
        style={styles.touchableContainer}
      >
        <Animated.View
          style={{
            opacity: graphOpacity,
            position: 'absolute',
            top: 0,
            width: width * 0.85,
            transform: [{ translateY: graphTranslateY }]
          }}
        >
          <View style={styles.graphHeader}>
            <Text style={[styles.graphTitle, { color: isDark ? '#FFF' : '#000' }]}>
              Weight loss after 30 days
            </Text>
          </View>
          <LineChart
            data={chartData}
            width={width * 0.85}
            height={180}
            chartConfig={chartConfig}
            bezier
            withVerticalLabels={true}
            withHorizontalLabels={true}
            style={{
              marginVertical: 8,
              borderRadius: 16,
              paddingVertical: 8,
              marginTop: 0,
            }}
            withInnerLines={false}
            segments={4}
            strokeWidth={4}
            yAxisLabel=""
            yAxisSuffix="lbs"
          />
        </Animated.View>
      </TouchableOpacity>
        
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => activeView === 'graph' ? toggleView() : null}
        style={[styles.touchableContainer, { position: 'absolute' }]}
      >
        <Animated.View 
          style={{
            opacity: challengeOpacity,
            transform: [{ translateY: challengeTranslateY }]
          }}
        >
          {renderProgressTracker()}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
    position: 'relative',
  },
  touchableContainer: {
    width: width * 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  progressTrackerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    width: width * 0.85,
    paddingHorizontal: 20,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  streakTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  rowsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  rowSpacing: {
    height: 20,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  horizontalConnector: {
    height: 4,
    width: 30,
  },
  streakDescription: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 22,
  },
  graphHeader: {
    width: '100%',
    paddingVertical: 0,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
    zIndex: 10,
  },
  graphTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'left',
  },
});

export default ProgressVisualization; 