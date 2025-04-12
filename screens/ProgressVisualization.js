import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, Animated, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const ProgressVisualization = ({ isDark, isVisible = false, onAnimationComplete, progressDays = [] }) => {
  // Calculate number of days based on prop length
  const numDays = progressDays.length;
  const numConnectors = numDays > 0 ? numDays - 1 : 0;

  // Use useRef to hold the animation arrays
  const dayAnimations = useRef([]);
  const connectorAnimations = useRef([]);
  
  // Simplified animation values
  const graphOpacity = useRef(new Animated.Value(0)).current;
  const challengeOpacity = useRef(new Animated.Value(1)).current;
  const challengeTranslateY = useRef(new Animated.Value(0)).current;
  const graphTranslateY = useRef(new Animated.Value(200)).current;

  // State to track which view is currently active
  const [activeView, setActiveView] = useState('challenge');

  // Effect to update animation refs when numDays changes
  useEffect(() => {
    dayAnimations.current = Array(numDays).fill(0).map(() => new Animated.Value(0));
    connectorAnimations.current = Array(numConnectors).fill(0).map(() => new Animated.Value(0));
    // Optionally, reset graph/challenge state if needed when data changes
    // Reset animation states if the component might re-animate with new data
    startAnimations(); // Restart animations when data changes
  }, [numDays]); // Dependency array includes numDays

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
    // Ensure refs have been initialized by the useEffect
    if (!dayAnimations.current || !connectorAnimations.current) return;

    // Reset all animations to initial state using .current
    dayAnimations.current.forEach(anim => anim.setValue(0));
    connectorAnimations.current.forEach(anim => anim.setValue(0));
    graphOpacity.setValue(0);
    challengeOpacity.setValue(1);
    challengeTranslateY.setValue(0);
    graphTranslateY.setValue(200);
    setActiveView('challenge');

    const dayAnimationsArray = [];
    
    // Animate each day and its following connector using .current
    dayAnimations.current.forEach((anim, index) => {
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
      
      // Ensure connector animation exists before pushing using .current
      if (index < connectorAnimations.current.length) {
        dayAnimationsArray.push(
          Animated.spring(connectorAnimations.current[index], {
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

  // Split days into two rows based on prop length
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
          { scale: dayAnimations.current[animationIndex] || 0 },
        ],
        opacity: dayAnimations.current[animationIndex] || 0
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
          { scaleX: animationIndex < connectorAnimations.current.length ? connectorAnimations.current[animationIndex] : 0 }
        ],
        opacity: animationIndex < connectorAnimations.current.length ? connectorAnimations.current[animationIndex] : 0
      }
    ]} />
  );

  const renderProgressTracker = () => {
    // Handle case with no progress days
    if (numDays === 0) {
      return (
        <View style={styles.progressTrackerContainer}>
          <Text style={{ color: isDark ? '#FFF' : '#000' }}>No scan data available.</Text>
        </View>
      );
    }

    // Calculate indices correctly for connectors
    const firstRowConnectorIndices = firstRowDays.map((_, index) => index).slice(0, -1);
    const secondRowConnectorIndices = secondRowDays.map((_, index) => index + firstRowDays.length -1).slice(0,-1);

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
          
          {/* Add some vertical spacing between rows if there are two rows */}
          {secondRowDays.length > 0 && <View style={styles.rowSpacing} />}
          
          {/* Second row */}
          {secondRowDays.length > 0 && (
            <View style={styles.daysRow}>
              {secondRowDays.map((day, index) => (
                <React.Fragment key={`day-${day.day}`}>
                  {/* Adjust animation index for the second row */}
                  {renderDayCircle(day.day, day.completed, index + firstRowDays.length)}
                  {/* Adjust connector logic for the second row */}
                  {index < secondRowDays.length - 1 && renderHorizontalConnector(secondRowDays[index + 1].completed, index + firstRowDays.length)}
                </React.Fragment>
              ))}
            </View>
          )}
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