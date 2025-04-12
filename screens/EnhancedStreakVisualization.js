import React from 'react';
import { View, StyleSheet, Text, Dimensions, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence, 
  withDelay,
  FadeIn,
  ZoomIn
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const scale = width / 375; // Base scale factor

const EnhancedStreakVisualization = ({ progressDays = [] }) => {
  // Calculate current streak
  const currentStreak = progressDays.filter(day => day.completed).length;
  
  return (
    <Animated.View 
      style={styles.container}
      entering={FadeIn.duration(400)}
    >
      <View style={styles.progressTrackerContainer}>
        {/* Streak Count Display */}
        <Animated.View 
          style={styles.streakCountContainer}
          entering={ZoomIn.duration(400)}
        >
          <LinearGradient
            colors={['#4B5EAC', '#2E3B80']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.streakCountBadge}
          >
            <Text style={styles.streakCountNumber}>{currentStreak}</Text>
            <Text style={styles.streakCountLabel}>DAY{currentStreak !== 1 ? 'S' : ''}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Streak Message */}
        <Animated.Text 
          style={styles.motivationalMessage}
          entering={FadeIn.delay(200).duration(400)}
        >
          {currentStreak > 0 
            ? `Great start! Keep it going!` 
            : "Start your streak today!"}
        </Animated.Text>

        {/* Day Circles in a Row */}
        <View style={styles.daysContainer}>
          {/* First row: days 1-4 */}
          <View style={styles.daysRow}>
            <View style={styles.dayRowContent}>
              {progressDays.slice(0, 4).map((day, index) => (
                <React.Fragment key={`day-${day.day}`}>
                  <Animated.View
                    entering={ZoomIn.delay(100 + index * 50).duration(300)}
                    style={styles.dayCircleContainer}
                  >
                    {day.completed ? (
                      <View style={styles.completedDay}>
                        <MaterialCommunityIcons
                          name={day.day === 1 ? "flag" : "check"}
                          size={16 * scale}
                          color="#FFF"
                        />
                      </View>
                    ) : (
                      <View style={styles.incompleteDay}>
                        <Text style={styles.dayNumber}>{day.day}</Text>
                      </View>
                    )}
                  </Animated.View>
                  {index < 3 && (
                    <View style={[
                      styles.connector,
                      { 
                        backgroundColor: progressDays.length > index + 1 && progressDays[index + 1].completed && day.completed
                          ? '#000' 
                          : '#E5E5E5' 
                      }
                    ]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
          
          {/* Second row: days 5-7 */}
          {progressDays.length > 4 && (
            <View style={styles.daysRow}>
              <View style={styles.dayRowContent}>
                {progressDays.slice(4, 7).map((day, index) => (
                  <React.Fragment key={`day-${day.day}`}>
                    <Animated.View
                      entering={ZoomIn.delay(300 + index * 50).duration(300)}
                      style={styles.dayCircleContainer}
                    >
                      {day.completed ? (
                        <View style={styles.completedDay}>
                          <MaterialCommunityIcons
                            name="check"
                            size={16 * scale}
                            color="#FFF"
                          />
                        </View>
                      ) : (
                        <View style={styles.incompleteDay}>
                          <Text style={styles.dayNumber}>{day.day}</Text>
                        </View>
                      )}
                    </Animated.View>
                    {index < 2 && (
                      <View style={[
                        styles.connector,
                        { 
                          backgroundColor: progressDays.length > index + 5 && progressDays[index + 5].completed && day.completed
                            ? '#000' 
                            : '#E5E5E5' 
                        }
                      ]} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}
        </View>

        <Animated.Text 
          style={styles.streakDescription}
          entering={FadeIn.delay(400).duration(400)}
        >
          Keep your streak going! Consistent tracking leads to results.
        </Animated.Text>
        
        <TouchableOpacity>
          <Animated.View 
            style={styles.learnMoreContainer}
            entering={FadeIn.delay(500).duration(400)}
          >
            <Text style={styles.learnMoreText}>Tap to learn more about streaks</Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={16}
              color="#888"
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFF',
  },
  progressTrackerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 15,
  },
  streakCountContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  streakCountBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 15,
    paddingHorizontal: 25,
    width: 100,
    height: 100,
  },
  streakCountNumber: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFF',
  },
  streakCountLabel: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
    marginTop: 0,
  },
  motivationalMessage: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 25,
    textAlign: 'center',
  },
  daysContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  daysRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  dayRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 270,
  },
  dayCircleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedDay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  incompleteDay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E5E5',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  connector: {
    height: 2,
    width: 25,
    marginHorizontal: 5,
    alignSelf: 'center',
  },
  streakDescription: {
    fontSize: 15,
    textAlign: 'center',
    color: '#666',
    paddingHorizontal: 15,
    fontWeight: '400',
    lineHeight: 20,
  },
  learnMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  learnMoreText: {
    fontSize: 14,
    color: '#888',
    marginRight: 5,
  }
});

export default EnhancedStreakVisualization; 