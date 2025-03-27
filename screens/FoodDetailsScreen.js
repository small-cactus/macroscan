import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  useColorScheme
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Calculate scale factor based on screen size
const baseWidth = 430; // iPhone 14 Pro Max width
const baseHeight = 932; // iPhone 14 Pro Max height
const scaleWidth = width / baseWidth;
const scaleHeight = height / baseHeight;
const scale = Math.min(scaleWidth, scaleHeight);

const FoodDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const styles = getDynamicStyles(colorScheme);
  
  // Get food data from route params
  const { foodData } = route.params || {};
  const [activeTab, setActiveTab] = useState('Nutrition');
  
  // Default mock data in case no data is provided
  const defaultFoodData = {
    name: 'Unknown Food Item',
    class: 'Unknown',
    type: 'Unknown',
    calories: { amount: 0, marginOfErrorPercent: 0 },
    proteins: { amount: 0, marginOfErrorPercent: 0 },
    carbohydrates: { amount: 0, marginOfErrorPercent: 0 },
    fats: { amount: 0, marginOfErrorPercent: 0 },
  };
  
  const data = foodData || defaultFoodData;
  
  const renderNutritionTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.macroCard}>
        <View style={styles.macroHeader}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#FF4500', '#FF4500B0']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Icon name="flame" size={20} color="#FFF" />
          </View>
          <Text style={styles.macroLabel}>Calories</Text>
        </View>
        <Text style={styles.macroValue}>
          {data.calories?.amount || '0'}
          <Text style={styles.macroUnit}> kcal</Text>
        </Text>
      </View>
      
      <View style={styles.macroCard}>
        <View style={styles.macroHeader}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#3CB371', '#3CB371B0']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Icon name="barbell-outline" size={20} color="#FFF" />
          </View>
          <Text style={styles.macroLabel}>Proteins</Text>
        </View>
        <Text style={styles.macroValue}>
          {data.proteins?.amount || '0'}
          <Text style={styles.macroUnit}> g</Text>
        </Text>
      </View>
      
      <View style={styles.macroCard}>
        <View style={styles.macroHeader}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#FFA500', '#FFA500B0']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Icon name="leaf-outline" size={20} color="#FFF" />
          </View>
          <Text style={styles.macroLabel}>Carbohydrates</Text>
        </View>
        <Text style={styles.macroValue}>
          {data.carbohydrates?.amount || '0'}
          <Text style={styles.macroUnit}> g</Text>
        </Text>
      </View>
      
      <View style={styles.macroCard}>
        <View style={styles.macroHeader}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#6495ED', '#6495EDB0']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Icon name="water-outline" size={20} color="#FFF" />
          </View>
          <Text style={styles.macroLabel}>Fats</Text>
        </View>
        <Text style={styles.macroValue}>
          {data.fats?.amount || '0'}
          <Text style={styles.macroUnit}> g</Text>
        </Text>
      </View>
    </View>
  );
  
  const renderIngredientsTab = () => {
    const ingredients = data.ingredients || [];
    
    if (ingredients.length === 0) {
      return (
        <View style={styles.emptyTabContent}>
          <Text style={styles.emptyText}>No ingredient information available</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.tabContent}>
        {ingredients.map((ingredient, index) => (
          <View key={index} style={styles.ingredientItem}>
            <Text style={styles.ingredientName}>{ingredient.name || 'Unknown ingredient'}</Text>
            {ingredient.description && (
              <Text style={styles.ingredientDescription}>{ingredient.description}</Text>
            )}
            {index < ingredients.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    );
  };
  
  const renderDetailsTab = () => {
    const details = data.details || {};
    
    if (!details.summary && !details.servingSize && !details.prepTime) {
      return (
        <View style={styles.emptyTabContent}>
          <Text style={styles.emptyText}>No detailed information available</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.tabContent}>
        {details.summary && (
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>About</Text>
            <Text style={styles.detailText}>{details.summary}</Text>
          </View>
        )}
        
        {(details.servingSize || details.prepTime) && (
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>Quick Facts</Text>
            
            {details.servingSize && (
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>Serving Size</Text>
                <Text style={styles.factValue}>{details.servingSize}</Text>
              </View>
            )}
            
            {details.prepTime && (
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>Prep Time</Text>
                <Text style={styles.factValue}>{details.prepTime}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{data.name}</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.foodTypeContainer}>
        <Text style={styles.foodTypeText}>
          {data.class || 'Unknown'} • {data.type || 'Unknown'}
        </Text>
      </View>
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Nutrition' && styles.activeTabButton]}
          onPress={() => setActiveTab('Nutrition')}
        >
          <Text 
            style={[
              styles.tabButtonText, 
              activeTab === 'Nutrition' && styles.activeTabButtonText
            ]}
          >
            Nutrition
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Ingredients' && styles.activeTabButton]}
          onPress={() => setActiveTab('Ingredients')}
        >
          <Text 
            style={[
              styles.tabButtonText, 
              activeTab === 'Ingredients' && styles.activeTabButtonText
            ]}
          >
            Ingredients
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Details' && styles.activeTabButton]}
          onPress={() => setActiveTab('Details')}
        >
          <Text 
            style={[
              styles.tabButtonText, 
              activeTab === 'Details' && styles.activeTabButtonText
            ]}
          >
            Details
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {activeTab === 'Nutrition' && renderNutritionTab()}
        {activeTab === 'Ingredients' && renderIngredientsTab()}
        {activeTab === 'Details' && renderDetailsTab()}
      </ScrollView>
    </View>
  );
};

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16 * scale,
    paddingTop: 60 * scale,
    paddingBottom: 16 * scale,
  },
  backButton: {
    width: 40 * scale,
    height: 40 * scale,
    borderRadius: 20 * scale,
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18 * scale,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
  },
  placeholder: {
    width: 40 * scale,
  },
  foodTypeContainer: {
    alignItems: 'center',
    marginBottom: 24 * scale,
  },
  foodTypeText: {
    fontSize: 16 * scale,
    color: colorScheme === 'dark' ? '#888888' : '#555555',
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16 * scale,
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#F0F0F0',
    marginHorizontal: 15 * scale,
    borderRadius: 20 * scale,
    paddingVertical: 6 * scale,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
  },
  tabButton: {
    paddingVertical: 8 * scale,
    paddingHorizontal: 16 * scale,
    flex: 1,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
  },
  tabButtonText: {
    color: colorScheme === 'dark' ? '#666' : '#888',
    fontSize: 16 * scale,
    fontWeight: '400',
  },
  activeTabButtonText: {
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16 * scale,
  },
  tabContent: {
    paddingBottom: 32 * scale,
  },
  macroCard: {
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5',
    borderRadius: 18 * scale,
    padding: 16 * scale,
    marginBottom: 12 * scale,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5E5',
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8 * scale,
  },
  iconContainer: {
    width: 40 * scale,
    height: 40 * scale,
    borderRadius: 12 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12 * scale,
    overflow: 'hidden',
  },
  macroLabel: {
    fontSize: 18 * scale,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
  },
  macroValue: {
    fontSize: 24 * scale,
    fontWeight: '700',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    marginLeft: 52 * scale,
  },
  macroUnit: {
    fontSize: 16 * scale,
    fontWeight: '400',
    color: colorScheme === 'dark' ? '#999999' : '#666666',
  },
  emptyTabContent: {
    paddingVertical: 48 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16 * scale,
    color: colorScheme === 'dark' ? '#999999' : '#666666',
    textAlign: 'center',
  },
  ingredientItem: {
    marginBottom: 16 * scale,
  },
  ingredientName: {
    fontSize: 16 * scale,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    marginBottom: 8 * scale,
  },
  ingredientDescription: {
    fontSize: 14 * scale,
    color: colorScheme === 'dark' ? '#999999' : '#666666',
    lineHeight: 20 * scale,
  },
  divider: {
    height: 1,
    backgroundColor: colorScheme === 'dark' ? '#333333' : '#EEEEEE',
    marginTop: 16 * scale,
  },
  detailSection: {
    marginBottom: 24 * scale,
  },
  detailTitle: {
    fontSize: 18 * scale,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    marginBottom: 12 * scale,
  },
  detailText: {
    fontSize: 16 * scale,
    color: colorScheme === 'dark' ? '#CCCCCC' : '#333333',
    lineHeight: 22 * scale,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8 * scale,
    paddingVertical: 4 * scale,
  },
  factLabel: {
    fontSize: 16 * scale,
    color: colorScheme === 'dark' ? '#999999' : '#666666',
  },
  factValue: {
    fontSize: 16 * scale,
    fontWeight: '500',
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
  },
});

export default FoodDetailsScreen; 