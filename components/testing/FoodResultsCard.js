import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Animated, 
  useColorScheme 
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

const MacroItem = ({ label, value, color, iconName, unit = '' }) => {
  const colorScheme = useColorScheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  return (
    <Animated.View 
      style={[
        styles.macroItem, 
        { 
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }] 
        }
      ]}
    >
      <View style={[styles.macroIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={iconName} size={20} color={color} />
      </View>
      <Text style={[
        styles.macroValue, 
        { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }
      ]}>
        {value}{unit}
      </Text>
      <Text style={[
        styles.macroLabel,
        { color: colorScheme === 'dark' ? '#aaaaaa' : '#666666' }
      ]}>
        {label}
      </Text>
    </Animated.View>
  );
};

const IngredientItem = ({ ingredient, index }) => {
  const colorScheme = useColorScheme();
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 500,
        delay: 500 + (index * 100),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: 500 + (index * 100),
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  return (
    <Animated.View 
      style={[
        styles.ingredientItem,
        {
          opacity: fadeInAnim,
          transform: [{ translateY: slideAnim }],
          borderBottomColor: colorScheme === 'dark' ? '#444444' : '#eeeeee'
        }
      ]}
    >
      <View style={styles.ingredientHeader}>
        <View style={styles.ingredientDot} />
        <Text style={[
          styles.ingredientName,
          { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }
        ]}>
          {ingredient.name}
        </Text>
      </View>
      {ingredient.description && (
        <Text style={[
          styles.ingredientDescription,
          { color: colorScheme === 'dark' ? '#bbbbbb' : '#666666' }
        ]}>
          {ingredient.description}
        </Text>
      )}
    </Animated.View>
  );
};

const SourceItem = ({ source, index }) => {
  const colorScheme = useColorScheme();
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(fadeInAnim, {
      toValue: 1,
      duration: 400,
      delay: 700 + (index * 100),
      useNativeDriver: true,
    }).start();
  }, []);
  
  return (
    <Animated.View style={{ opacity: fadeInAnim }}>
      <View style={styles.sourceItemContainer}>
        <Ionicons 
          name="information-circle-outline" 
          size={16} 
          color="#3b82f6" 
          style={styles.sourceIcon}
        />
        <Text 
          style={[
            styles.sourceItem,
            { color: colorScheme === 'dark' ? '#bbbbbb' : '#666666' }
          ]} 
          numberOfLines={1}
        >
          {source}
        </Text>
      </View>
    </Animated.View>
  );
};

const SectionHeader = ({ title, iconName }) => {
  const colorScheme = useColorScheme();
  
  return (
    <View style={styles.sectionHeaderContainer}>
      {iconName && (
        <Ionicons 
          name={iconName} 
          size={18} 
          color="#3b82f6" 
          style={{ marginRight: 8 }} 
        />
      )}
      <Text style={[
        styles.sectionTitle,
        { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }
      ]}>
        {title}
      </Text>
    </View>
  );
};

const FoodResultsCard = ({ foodData, onNewScan }) => {
  const colorScheme = useColorScheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  const handleNewScanPress = () => {
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    onNewScan();
  };
  
  const { food } = foodData;
  
  return (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <Animated.View 
        style={[
          styles.container,
          { 
            backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.header}>
          <Ionicons 
            name="nutrition-outline" 
            size={28} 
            color="#3b82f6" 
            style={styles.headerIcon} 
          />
          <Text style={[
            styles.foodName,
            { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }
          ]}>
            {food.name}
          </Text>
          <Text style={[
            styles.foodClassification,
            { color: colorScheme === 'dark' ? '#aaaaaa' : '#666666' }
          ]}>
            {food.class} · {food.type}
          </Text>
        </View>
        
        <View style={[
          styles.macrosContainer,
          { backgroundColor: colorScheme === 'dark' ? '#333333' : '#ffffff' }
        ]}>
          <MacroItem 
            label="Calories" 
            value={food.calories.amount} 
            color="#ff6b6b" 
            iconName="flame-outline"
          />
          <MacroItem 
            label="Protein" 
            value={food.proteins.amount} 
            color="#4d8af0" 
            iconName="barbell-outline"
            unit="g"
          />
          <MacroItem 
            label="Carbs" 
            value={food.carbohydrates.amount} 
            color="#ff922b" 
            iconName="leaf-outline"
            unit="g"
          />
          <MacroItem 
            label="Fat" 
            value={food.fats.amount} 
            color="#20c997" 
            iconName="water-outline"
            unit="g"
          />
        </View>
        
        <View style={styles.detailsSection}>
          <Text style={[
            styles.servingSize,
            { color: colorScheme === 'dark' ? '#aaaaaa' : '#777777' }
          ]}>
            Serving: {food.servingSize ? `${food.servingSize.amount} ${food.servingSize.unit}` : "1 serving"}
          </Text>
          
          <Text style={[
            styles.summaryText,
            { color: colorScheme === 'dark' ? '#dddddd' : '#333333' }
          ]}>
            {food.details?.summaryText || "No summary available."}
          </Text>
        </View>
        
        {food.ingredients && food.ingredients.length > 0 && (
          <View style={[
            styles.ingredientsContainer,
            { backgroundColor: colorScheme === 'dark' ? '#333333' : '#ffffff' }
          ]}>
            <SectionHeader title="Key Ingredients" iconName="list-outline" />
            
            {food.ingredients.map((ingredient, index) => (
              <IngredientItem 
                key={index} 
                ingredient={ingredient} 
                index={index}
              />
            ))}
          </View>
        )}
        
        {food.metadata?.searchDetails?.sources && (
          <View style={[
            styles.sourcesContainer,
            { backgroundColor: colorScheme === 'dark' ? '#252525' : '#eeeeee' }
          ]}>
            <SectionHeader title="Information Sources" iconName="document-text-outline" />
            
            {food.metadata.searchDetails.sources.map((source, index) => (
              <SourceItem key={index} source={source} index={index} />
            ))}
          </View>
        )}
        
        <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
          <TouchableOpacity
            style={[
              styles.newScanButton,
              { backgroundColor: colorScheme === 'dark' ? '#333333' : '#e0e0e0' }
            ]}
            onPress={handleNewScanPress}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="refresh-outline" 
              size={20} 
              style={[styles.buttonIcon, { color: '#3b82f6' }]} 
            />
            <Text style={[
              styles.buttonText,
              { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }
            ]}>
              Scan New Food
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginTop: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    marginBottom: 10,
  },
  foodName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  foodClassification: {
    fontSize: 16,
    textAlign: 'center',
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  macroItem: {
    alignItems: 'center',
    width: '25%',
    marginBottom: 8,
  },
  macroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  macroLabel: {
    fontSize: 14,
  },
  detailsSection: {
    marginBottom: 20,
  },
  servingSize: {
    fontSize: 14,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  ingredientsContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  ingredientItem: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ingredientDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginRight: 8,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  ingredientDescription: {
    fontSize: 14,
    lineHeight: 20,
    paddingLeft: 16,
  },
  sourcesContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  sourceItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  sourceIcon: {
    marginRight: 8,
  },
  sourceItem: {
    fontSize: 14,
    flex: 1,
  },
  newScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 10,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  }
});

export default FoodResultsCard; 