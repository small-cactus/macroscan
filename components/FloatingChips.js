import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, useColorScheme, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const scale = Math.min(width / 430, 1);

const FloatingChip = ({ text, category, delay, startPosition, calories }) => {
  const colorScheme = useColorScheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const pillWidth = useRef(new Animated.Value(32 * scale)).current;
  const pillTextOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Simple fade in for dot and chip
    Animated.timing(opacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      delay,
    }).start();

    // Pill animation sequence
    setTimeout(() => {
      Animated.sequence([
        // First show the circular pill
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Then expand the width
        Animated.timing(pillWidth, {
          toValue: 90 * scale,
          duration: 500,
          useNativeDriver: false,
        }),
        // Finally fade in the text
        Animated.timing(pillTextOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay + 300);
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          ...startPosition,
        }
      ]}
    >
      {/* Chip */}
      <View style={[styles.chipShadowContainer]}>
        <View style={styles.chipContainer}>
          <BlurView
            intensity={100}
            tint={colorScheme}
            style={[
              styles.chip,
              { backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)' }
            ]}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 1)', 'transparent', 'transparent']}
              style={styles.innerGlow}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0 }}
              locations={[0, 0.5, 1]}
            />
            <View style={styles.textContainer}>
              <View style={styles.textWrapper}>
                <Animated.Text
                  style={[
                    styles.chipText,
                    { color: colorScheme === 'dark' ? '#fff' : '#000' }
                  ]}
                >
                  {text}
                </Animated.Text>
                <Animated.Text
                  style={[
                    styles.categoryText,
                    { color: colorScheme === 'dark' ? '#999' : '#666' }
                  ]}
                >
                  {category}
                </Animated.Text>
              </View>
            </View>
          </BlurView>
        </View>
      </View>

      {/* Calories Pill */}
      <View style={styles.caloriesPillContainer}>
        <Animated.View style={[
          styles.caloriesPill,
          {
            width: pillWidth,
          }
        ]}>
          <BlurView
            intensity={100}
            tint={colorScheme}
            style={[
              styles.caloriesPillBlur,
              { backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)' }
            ]}
          >
            <MaterialCommunityIcons 
              name="fire" 
              size={14 * scale} 
              color="#FF6B00"
            />
            <Animated.Text style={[
              styles.caloriesText,
              { opacity: pillTextOpacity }
            ]}>
              {calories} kcal
            </Animated.Text>
          </BlurView>
        </Animated.View>
      </View>

      {/* Dot */}
      <Animated.View style={[
        styles.dotContainer
      ]}>
        <View style={[
          styles.dotShadowContainer,
          styles.dot,
          { backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)' }
        ]} />
      </Animated.View>
    </Animated.View>
  );
};

const FloatingChips = () => {
  const chips = [
    { 
      text: 'Bread', 
      category: 'Grain/Baked', 
      position: { top: '29%', left: '58%' }, 
      delay: 2100,
      calories: '265'
    },
    { 
      text: 'Olive', 
      category: 'Vegetable', 
      position: { top: '45%', left: '5%' }, 
      delay: 2300,
      calories: '120'
    },
    { 
      text: 'Avocado Toast', 
      category: 'Breakfast', 
      position: { top: '10%', left: '30%' }, 
      delay: 2000,
      calories: '320'
    },
  ];

  return (
    <View style={styles.containerWrapper}>
      {chips.map((chip, index) => (
        <FloatingChip
          key={index}
          text={chip.text}
          category={chip.category}
          delay={chip.delay}
          startPosition={chip.position}
          calories={chip.calories}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  containerWrapper: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  container: {
    position: 'absolute',
    height: 32 * scale,
  },
  chipContainer: {
    height: 45 * scale,
    width: 'auto',
    minWidth: 120 * scale,
    borderRadius: 12 * scale,
    overflow: 'hidden',
  },
  chip: {
    height: '100%',
    borderRadius: 12 * scale,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    paddingHorizontal: 16 * scale,
  },
  dotContainer: {
    position: 'absolute',
    left: -20 * scale,
    bottom: -30 * scale,
    width: 24 * scale,
    height: 24 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 10 * scale,
    height: 10 * scale,
    borderRadius: 100 * scale,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  textContainer: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrapper: {
    alignItems: 'center',
    marginTop: -1,
  },
  chipText: {
    fontSize: 14 * scale,
    fontWeight: '500',
    marginBottom: 1,
    lineHeight: 16 * scale,
    textAlign: 'center',
  },
  categoryText: {
    fontSize: 12 * scale,
    fontWeight: '400',
    lineHeight: 14 * scale,
    textAlign: 'center',
    marginBottom: 0,
  },
  caloriesPillContainer: {
    borderRadius: 10 * scale,
    position: 'absolute',
    top: '100%',
    left: '48%',
    transform: [{ translateX: -40 * scale }, { translateY: 20 * scale }],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  caloriesPill: {
    borderRadius: 100 * scale,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  caloriesPillBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 24 * scale,
    paddingHorizontal: 8 * scale,
    gap: 4 * scale,
    borderRadius: 900 * scale,
  },
  caloriesText: {
    fontSize: 12 * scale,
    fontWeight: '500',
    color: '#FF6B00',
  },
  chipShadowContainer: {
    borderRadius: 10 * scale,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 10,
  },
  dotShadowContainer: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  innerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12 * scale,
  },
});

export default FloatingChips; 