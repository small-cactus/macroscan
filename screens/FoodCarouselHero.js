import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const CARD_MARGIN_HORIZONTAL = 8;
const CARD_MARGIN_VERTICAL = 8;
const CARD_WIDTH = (width - 40 - CARD_MARGIN_HORIZONTAL * 2 * 3) / 3;
const CARD_HEIGHT = 150;

const SAMPLE_FOODS = [
  { id: '1', name: 'Grilled Chicken', emoji: '🍗', protein: 32, carbs: 0, fat: 3.6 },
  { id: '2', name: 'Sweet Potato', emoji: '🍠', protein: 2, carbs: 27, fat: 0.1 },
  { id: '3', name: 'Salmon Fillet', emoji: '🐟', protein: 25, carbs: 0, fat: 15 },
  { id: '4', name: 'Quinoa Bowl', emoji: '🥣', protein: 8, carbs: 39, fat: 4 },
  { id: '5', name: 'Greek Yogurt', emoji: '🥛', protein: 17, carbs: 6, fat: 0.4 },
  { id: '6', name: 'Avocado Toast', emoji: '🥑🍞', protein: 4, carbs: 18, fat: 15 },
  { id: '7', name: 'Protein Smoothie', emoji: '🥤', protein: 20, carbs: 30, fat: 5 },
  { id: '8', name: 'Oatmeal', emoji: '🥣', protein: 6, carbs: 32, fat: 3 },
  { id: '9', name: 'Chicken Salad', emoji: '🥗', protein: 28, carbs: 10, fat: 8 },
  { id: '10', name: 'Rice Bowl', emoji: '🍚', protein: 5, carbs: 45, fat: 1 },
  { id: '11', name: 'Beef Steak', emoji: '🥩', protein: 26, carbs: 0, fat: 20 },
  { id: '12', name: 'Pasta Primavera', emoji: '🍝', protein: 12, carbs: 60, fat: 10 },
  { id: '13', name: 'Tofu Stir Fry', emoji: '🍲', protein: 15, carbs: 20, fat: 8 },
  { id: '14', name: 'Egg Benedict', emoji: '🍳', protein: 18, carbs: 24, fat: 12 },
  { id: '16', name: 'Turkey Sandwich', emoji: '🥪', protein: 22, carbs: 30, fat: 5 },
  { id: '17', name: 'Veggie Burger', emoji: '🍔', protein: 14, carbs: 35, fat: 10 },
  { id: '18', name: 'Shrimp Tacos', emoji: '🌮', protein: 20, carbs: 28, fat: 6 },
  { id: '19', name: 'Lentil Soup', emoji: '🍜', protein: 12, carbs: 35, fat: 2 },
  { id: '15', name: 'Fruit Salad', emoji: '🍉🍇', carbs: 25, fat: 0.5, sugar: 20 },
  { id: '20', name: 'Blueberry Muffin', emoji: '🧁', carbs: 40, fat: 12, sugar: 22 },
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
      style={{
        padding: 8,
        borderRadius: 16,
        backgroundColor: isDark ? '#1C1C1E' : '#F8F8F8',
        width: CARD_WIDTH,
        marginHorizontal: CARD_MARGIN_HORIZONTAL,
        marginVertical: CARD_MARGIN_VERTICAL,
        shadowColor: isDark ? '#000' : '#666',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 3,
        alignItems: 'center',
        zIndex: 1,
      }}
    >
      <Text style={{ fontSize: 32, marginBottom: 8 }}>{food.emoji}</Text>
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: isDark ? '#FFF' : '#000',
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        {food.name}
      </Text>
      <View style={{ marginTop: 8, width: '100%' }}>
        {macrosToDisplay.map((macro, index) => (
          <View key={index}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: isDark ? '#CCC' : '#666',
                  textAlign: 'left',
                }}
              >
                {macro.name}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  color: isDark ? '#FFF' : '#000',
                  textAlign: 'right',
                }}
              >
                {macro.value}g
              </Text>
            </View>
            {index < macrosToDisplay.length - 1 && (
              <View
                style={{
                  height: 1,
                  backgroundColor: isDark ? '#333' : '#E0E0E0',
                  marginHorizontal: 0,
                }}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const FoodCarousel = ({ isDark }) => {
  const scrollY1 = useRef(new Animated.Value(0)).current;
  const scrollY2 = useRef(new Animated.Value(0)).current;
  const scrollY3 = useRef(new Animated.Value(0)).current;

  const column1Foods = SAMPLE_FOODS.filter((_, index) => index % 3 === 0);
  const column2Foods = SAMPLE_FOODS.filter((_, index) => index % 3 === 1);
  const column3Foods = SAMPLE_FOODS.filter((_, index) => index % 3 === 2);

  const maxLength = Math.max(column1Foods.length, column2Foods.length, column3Foods.length);

  const padColumn = (column) => {
    const padded = [...column];
    while (padded.length < maxLength) {
      padded.push(...column);
    }
    return padded;
  };

  const paddedColumn1Foods = padColumn(column1Foods);
  const paddedColumn2Foods = padColumn(column2Foods);
  const paddedColumn3Foods = padColumn(column3Foods);

  const extendedColumn1Foods = [...paddedColumn1Foods, ...paddedColumn1Foods, ...paddedColumn1Foods];
  const extendedColumn2Foods = [...paddedColumn2Foods, ...paddedColumn2Foods, ...paddedColumn2Foods];
  const extendedColumn3Foods = [...paddedColumn3Foods, ...paddedColumn3Foods, ...paddedColumn3Foods];

  const itemHeight = CARD_HEIGHT + CARD_MARGIN_VERTICAL * 2;
  const totalHeight = itemHeight * paddedColumn1Foods.length;

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

    createInfiniteLoop(scrollY1, 50000, false);  // First column down
    createInfiniteLoop(scrollY2, 45000, true);   // Middle column up
    createInfiniteLoop(scrollY3, 55000, false);  // Last column down

    return () => {
      scrollY1.stopAnimation();
      scrollY2.stopAnimation();
      scrollY3.stopAnimation();
    };
  }, [scrollY1, scrollY2, scrollY3, totalHeight]);

  return (
    <View
      style={{
        height: itemHeight * 2,
        overflow: 'hidden',
        width: width - 0,
        flexDirection: 'row',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <Animated.View
        style={{
          transform: [{ translateY: scrollY1 }],
          marginHorizontal: CARD_MARGIN_HORIZONTAL,
        }}
      >
        {extendedColumn1Foods.map((food, index) => (
          <FoodCard key={`col1-food-${index}-${food.id}`} food={food} isDark={isDark} />
        ))}
      </Animated.View>

      <Animated.View
        style={{
          transform: [{ translateY: scrollY2 }],
          marginHorizontal: CARD_MARGIN_HORIZONTAL,
        }}
      >
        {extendedColumn2Foods.map((food, index) => (
          <FoodCard key={`col2-food-${index}-${food.id}`} food={food} isDark={isDark} />
        ))}
      </Animated.View>

      <Animated.View
        style={{
          transform: [{ translateY: scrollY3 }],
          marginHorizontal: CARD_MARGIN_HORIZONTAL,
        }}
      >
        {extendedColumn3Foods.map((food, index) => (
          <FoodCard key={`col3-food-${index}-${food.id}`} food={food} isDark={isDark} />
        ))}
      </Animated.View>

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

export default FoodCarousel;