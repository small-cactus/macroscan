// FoodCarouselLandscape.js

import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, Dimensions, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Get device dimensions
const { width } = Dimensions.get('window');

// Define the number of columns and rows for landscape
const NUM_COLUMNS = 5;
const NUMBER_OF_ROWS = 7;

// Margin and card dimensions
const CARD_MARGIN_HORIZONTAL = 8;
const CARD_MARGIN_VERTICAL = 8;
const CARD_WIDTH = (width - CARD_MARGIN_HORIZONTAL * 9 * NUM_COLUMNS) / NUM_COLUMNS;
const CARD_HEIGHT = 150;

// Sample food data
const SAMPLE_FOODS = [
  { id: '1', name: 'Coconut Bliss Bowl', emoji: '🥥', protein: 4, carbs: 20, fat: 18 },
  { id: '2', name: 'Beef Steak', emoji: '🥩', protein: 26, carbs: 0, fat: 20 },
  { id: '3', name: 'Tomato Bruschetta', emoji: '🍅🍞', protein: 3, carbs: 22, fat: 4 },
  { id: '4', name: 'Apple Slices', emoji: '🍎', carbs: 22, fat: 0.1, sugar: 18 },
  { id: '5', name: 'Sweet Corn', emoji: '🌽', protein: 4, carbs: 19, fat: 1 },
  { id: '6', name: 'Pumpkin Pancake', emoji: '🥞', protein: 6, carbs: 25, fat: 3 },
  { id: '7', name: 'Blueberry Muffin', emoji: '🧁', carbs: 40, fat: 12, sugar: 22 },
  { id: '8', name: 'Pasta Primavera', emoji: '🍝', protein: 12, carbs: 60, fat: 10 },
  { id: '9', name: 'Egg Benedict', emoji: '🍳', protein: 18, carbs: 24, fat: 12 },
  { id: '10', name: 'Zucchini Fries', emoji: '🍟', protein: 3, carbs: 15, fat: 4 },
  { id: '11', name: 'Avocado Toast', emoji: '🥑🍞', protein: 4, carbs: 18, fat: 15 },
  { id: '12', name: 'Cheese Platter', emoji: '🧀', protein: 15, carbs: 2, fat: 20 },
  { id: '13', name: 'Honeydew Sorbet', emoji: '🍈', carbs: 22, fat: 0.1, sugar: 18 },
  { id: '14', name: 'Tofu Stir Fry', emoji: '🍲', protein: 15, carbs: 20, fat: 8 },
  { id: '15', name: 'Peach Yogurt', emoji: '🍑🥛', protein: 12, carbs: 15, fat: 3 },
  { id: '16', name: 'Spinach Wrap', emoji: '🌯', protein: 8, carbs: 20, fat: 4 },
  { id: '17', name: 'Carrot Soup', emoji: '🥕', protein: 4, carbs: 16, fat: 2 },
  { id: '18', name: 'Broccoli Stir Fry', emoji: '🥦', protein: 5, carbs: 12, fat: 4 },
  { id: '19', name: 'Almond Butter Toast', emoji: '🫓', protein: 7, carbs: 16, fat: 12 },
  { id: '20', name: 'Baked Pear', emoji: '🍐', carbs: 28, fat: 0.2, sugar: 18 },
  { id: '21', name: 'Grilled Chicken', emoji: '🍗', protein: 32, carbs: 0, fat: 3.6 },
  { id: '22', name: 'Cherry Sorbet', emoji: '🍒', carbs: 20, fat: 0.2, sugar: 18 },
  { id: '23', name: 'Lentil Soup', emoji: '🍜', protein: 12, carbs: 35, fat: 2 },
  { id: '24', name: 'Pineapple Spears', emoji: '🍍', carbs: 28, fat: 0.2, sugar: 24 },
  { id: '25', name: 'Sweet Potato', emoji: '🍠', protein: 2, carbs: 27, fat: 0.1 },
  { id: '26', name: 'Eggplant Chips', emoji: '🍆', protein: 1, carbs: 10, fat: 2 },
  { id: '27', name: 'Radish Salad', emoji: '🥗', protein: 2, carbs: 10, fat: 0.5 },
  { id: '28', name: 'Veggie Burger', emoji: '🍔', protein: 14, carbs: 35, fat: 10 },
  { id: '29', name: 'Seaweed Salad', emoji: '🍙', protein: 3, carbs: 10, fat: 0.5 },
  { id: '30', name: 'Protein Smoothie', emoji: '🥤', protein: 20, carbs: 30, fat: 5 },
  { id: '31', name: 'Chicken Salad', emoji: '🥗', protein: 28, carbs: 10, fat: 8 },
  { id: '32', name: 'Tomato Bruschetta', emoji: '🍅🍞', protein: 3, carbs: 22, fat: 4 },
  { id: '33', name: 'Tofu Stir Fry', emoji: '🍲', protein: 15, carbs: 20, fat: 8 },
  { id: '34', name: 'Beet Salad', emoji: '🍠🥗', protein: 3, carbs: 18, fat: 2 },
  { id: '35', name: 'Avocado Smoothie', emoji: '🥑🥤', protein: 5, carbs: 15, fat: 10 },
  { id: '36', name: 'Crispy Chickpeas', emoji: '🧆', protein: 8, carbs: 19, fat: 6 },
  { id: '37', name: 'Walnut Bread', emoji: '🍞🌰', protein: 7, carbs: 28, fat: 8 },
  { id: '38', name: 'Kimchi Wrap', emoji: '🌯', protein: 4, carbs: 15, fat: 2 },
  { id: '39', name: 'Oatmeal', emoji: '🥣', protein: 6, carbs: 32, fat: 3 },
  { id: '40', name: 'Quinoa Bowl', emoji: '🥣', protein: 8, carbs: 39, fat: 4 },
  { id: '41', name: 'Mushroom Risotto', emoji: '🍄', protein: 9, carbs: 32, fat: 8 },
  { id: '42', name: 'Rice Bowl', emoji: '🍚', protein: 5, carbs: 45, fat: 1 },
  { id: '43', name: 'Egg Benedict', emoji: '🍳', protein: 18, carbs: 24, fat: 12 },
  { id: '44', name: 'Cucumber Salad', emoji: '🥒', protein: 1, carbs: 5, fat: 0.2 },
  { id: '45', name: 'Shrimp Tacos', emoji: '🌮', protein: 20, carbs: 28, fat: 6 },
  { id: '46', name: 'Greek Yogurt', emoji: '🥛', protein: 17, carbs: 6, fat: 0.4 },
  { id: '47', name: 'Banana Pancake', emoji: '🍌🥞', protein: 8, carbs: 30, fat: 6 },
  { id: '48', name: 'Stuffed Bell Pepper', emoji: '🌶️', protein: 10, carbs: 25, fat: 6 },
  { id: '49', name: 'Blueberry Muffin', emoji: '🧁', carbs: 40, fat: 12, sugar: 22 },
  { id: '50', name: 'Fruit Salad', emoji: '🍉🍇', carbs: 25, fat: 0.5, sugar: 20 },
];

const FoodCard = ({ food, isDark }) => {
  let macrosToDisplay = [];

  if (food.sugar !== undefined) {
    macrosToDisplay.push({ name: 'Sugar', value: food.sugar });
  } else if (food.protein !== undefined) {
    macrosToDisplay.push({ name: 'Protein', value: food.protein });
  }

  if (food.carbs !== undefined) {
    macrosToDisplay.push({ name: 'Carbs', value: food.carbs });
  }

  if (food.fat !== undefined) {
    macrosToDisplay.push({ name: 'Fat', value: food.fat });
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1C1C1E' : '#F8F8F8',
          width: CARD_WIDTH,
          shadowColor: isDark ? '#000' : '#666',
        },
      ]}
    >
      <Text style={styles.emoji}>{food.emoji}</Text>
      <Text
        style={[
          styles.foodName,
          { color: isDark ? '#FFF' : '#000' },
        ]}
      >
        {food.name}
      </Text>
      <View style={styles.macrosContainer}>
        {macrosToDisplay.map((macro, index) => (
          <View key={index}>
            <View style={styles.macroRow}>
              <Text
                style={[
                  styles.macroName,
                  { color: isDark ? '#CCC' : '#666' },
                ]}
              >
                {macro.name}
              </Text>
              <Text
                style={[
                  styles.macroValue,
                  { color: isDark ? '#FFF' : '#000' },
                ]}
              >
                {macro.value}g
              </Text>
            </View>
            {index < macrosToDisplay.length - 1 && (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: isDark ? '#333' : '#E0E0E0' },
                ]}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const FoodCarouselLandscape = ({ isDark }) => {
  // Initialize animated values for each column
  const scrollYs = useRef(
    Array.from({ length: NUM_COLUMNS }, () => new Animated.Value(0))
  ).current;

  // Distribute foods into columns
  const columns = Array.from({ length: NUM_COLUMNS }, (_, i) =>
    SAMPLE_FOODS.filter((_, index) => index % NUM_COLUMNS === i)
  );

  // Determine the maximum column length
  const maxLength = Math.max(...columns.map(col => col.length));

  // Function to pad columns to the max length
  const padColumn = (column) => {
    const padded = [...column];
    while (padded.length < maxLength) {
      padded.push(...column);
    }
    return padded;
  };

  // Pad each column
  const paddedColumns = columns.map(padColumn);

  // Extend each column by repeating its items 9 times for smooth scrolling
  const extendedColumns = paddedColumns.map(col => Array(9).fill().flatMap(() => col));

  const itemHeight = CARD_HEIGHT + CARD_MARGIN_VERTICAL * 2;
  const containerHeight = itemHeight * NUMBER_OF_ROWS;
  const totalHeight = itemHeight * maxLength;

  // Define different durations for each column to vary scroll speeds
  const durations = [100000, 95000, 105000, 90000, 110000]; // Example durations for 5 columns

  useEffect(() => {
    const createInfiniteLoop = (scrollY, duration, isReverse = false) => {
      const startPosition = isReverse ? -totalHeight : 0;
      const endPosition = isReverse ? 0 : -totalHeight;

      const animate = () => {
        scrollY.setValue(startPosition);
        Animated.timing(scrollY, {
          toValue: endPosition,
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: true,
          isInteraction: false,
        }).start(({ finished }) => {
          if (finished) {
            animate();
          }
        });
      };

      animate();
    };

    scrollYs.forEach((scrollY, index) => {
      const duration = durations[index % durations.length];
      const isReverse = index % 2 === 1; // Alternate scrolling direction
      createInfiniteLoop(scrollY, duration, isReverse);
    });

    return () => {
      scrollYs.forEach(scrollY => scrollY.stopAnimation());
    };
  }, [scrollYs, totalHeight]);

  return (
    <View style={[styles.carouselContainer, { height: containerHeight }]}>
      {extendedColumns.map((columnFoods, columnIndex) => (
        <Animated.View
          key={`column-${columnIndex}`}
          style={[
            styles.animatedColumn,
            {
              transform: [{ translateY: scrollYs[columnIndex] }],
              marginHorizontal: CARD_MARGIN_HORIZONTAL,
            },
          ]}
        >
          {columnFoods.map((food, index) => (
            <FoodCard key={`col${columnIndex}-food-${index}-${food.id}`} food={food} isDark={isDark} />
          ))}
        </Animated.View>
      ))}

      {/* Top Gradient */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 0)']
            : ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0)']
        }
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 100,
        }}
      />
      <LinearGradient
        colors={
          isDark
            ? ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 1)']
            : ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)']
        }
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 100,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
    width: '100%', // Ensure the carousel takes the full width
  },
  animatedColumn: {
    // Additional styles if needed
  },
  card: {
    padding: 8,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 3,
    alignItems: 'center',
    zIndex: 1,
    marginHorizontal: CARD_MARGIN_HORIZONTAL,
    marginVertical: CARD_MARGIN_VERTICAL,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  macrosContainer: {
    marginTop: 8,
    width: '100%',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  macroName: {
    fontSize: 14,
    textAlign: 'left',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    marginHorizontal: 0,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    // Removed zIndex to ensure it overlays correctly
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    // Removed zIndex to ensure it overlays correctly
  },
});

export default FoodCarouselLandscape;