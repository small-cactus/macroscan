import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  Image, Modal, Alert, Dimensions, Platform, Linking,
  Appearance, RefreshControl, Animated, LayoutAnimation, UIManager,
  TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Svg, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Calculate scale factor based on screen size
const baseWidth = 430; // iPhone 14 Pro Max width
const baseHeight = 932; // iPhone 14 Pro Max height
const scaleWidth = width / baseWidth;
const scaleHeight = height / baseHeight;
const scale = Math.min(scaleWidth, scaleHeight);

// Define the Gradient Background Component (copied from SearchModeInfoSheet.js icon)
const DeepSearchGradientBackground = () => (
  <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
    <Defs>
      <RadialGradient id="hist_grad1" cx="25%" cy="25%" r="80%" gradientUnits="userSpaceOnUse">
        <Stop offset="0%" stopColor="#FFB74D" stopOpacity="1" />
        <Stop offset="100%" stopColor="#FFB74D" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="hist_grad2" cx="75%" cy="30%" r="70%" gradientUnits="userSpaceOnUse">
        <Stop offset="0%" stopColor="#FF5252" stopOpacity="1" />
        <Stop offset="100%" stopColor="#FF5252" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="hist_grad3" cx="50%" cy="60%" r="75%" gradientUnits="userSpaceOnUse">
        <Stop offset="0%" stopColor="#42A5F5" stopOpacity="0.9" />
        <Stop offset="100%" stopColor="#42A5F5" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="hist_grad4" cx="65%" cy="75%" r="60%" gradientUnits="userSpaceOnUse">
        <Stop offset="0%" stopColor="#AB47BC" stopOpacity="0.8" />
        <Stop offset="100%" stopColor="#AB47BC" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Rect x="0" y="0" width="100%" height="100%" fill="url(#hist_grad1)" />
    <Rect x="0" y="0" width="100%" height="100%" fill="url(#hist_grad2)" />
    <Rect x="0" y="0" width="100%" height="100%" fill="url(#hist_grad3)" />
    <Rect x="0" y="0" width="100%" height="100%" fill="url(#hist_grad4)" />
  </Svg>
);

// Define the Circle to Scan Gradient Background Component
const CircleToScanGradientBackground = () => (
  <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
    <Defs>
      <RadialGradient id="circle_hist_grad1" cx="30%" cy="25%" r="80%" gradientUnits="userSpaceOnUse">
        <Stop offset="0%" stopColor="#4FACFE" stopOpacity="1" />
        <Stop offset="100%" stopColor="#4FACFE" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="circle_hist_grad2" cx="70%" cy="30%" r="70%" gradientUnits="userSpaceOnUse">
        <Stop offset="0%" stopColor="#00F2FE" stopOpacity="1" />
        <Stop offset="100%" stopColor="#00F2FE" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="circle_hist_grad3" cx="45%" cy="60%" r="75%" gradientUnits="userSpaceOnUse">
        <Stop offset="0%" stopColor="#6A82FB" stopOpacity="0.9" />
        <Stop offset="100%" stopColor="#6A82FB" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="circle_hist_grad4" cx="60%" cy="75%" r="60%" gradientUnits="userSpaceOnUse">
        <Stop offset="0%" stopColor="#985EFF" stopOpacity="0.8" />
        <Stop offset="100%" stopColor="#985EFF" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Rect x="0" y="0" width="100%" height="100%" fill="url(#circle_hist_grad1)" />
    <Rect x="0" y="0" width="100%" height="100%" fill="url(#circle_hist_grad2)" />
    <Rect x="0" y="0" width="100%" height="100%" fill="url(#circle_hist_grad3)" />
    <Rect x="0" y="0" width="100%" height="100%" fill="url(#circle_hist_grad4)" />
  </Svg>
);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const isIphoneSE = () => {
  const smallIphoneDimensions = [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 414, height: 736 },
    { width: 360, height: 640 },
    { width: 375, height: 812 },
    { width: 360, height: 780 },
  ];

  return (
    Platform.OS === 'ios' &&
    smallIphoneDimensions.some(
      dim =>
        (width === dim.width && height === dim.height) ||
        (width === dim.height && height === dim.width)
    )
  );
};

const HistoryCard = ({
  item,
  onSelect,
  onRemove,
  styles,
  colorScheme,
  formatDate,
  renderMetadataBadges
}) => {
  const animation = useRef(new Animated.Value(1)).current;

  const confirmDelete = () => {
    Alert.alert(
      'Delete Food',
      'Are you sure you want to delete this history item?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDeleteConfirmed }
      ],
      { cancelable: false }
    );
  };

  const handleDeleteConfirmed = () => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onRemove();
    });
  };

  return (
    <Animated.View style={{ opacity: animation }}>
      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => onSelect(item)}
        >
          {item.imageUri ? (
            <Image 
              source={{ 
                uri: typeof item.imageUri === 'string' && !item.imageUri.startsWith('data:image/jpeg;base64,')
                  ? 'data:image/jpeg;base64,' + item.imageUri
                  : item.imageUri 
              }} 
              style={styles.productImage} 
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons 
                name="document-text-outline" 
                size={40 * scale} 
                color={colorScheme === 'dark' ? '#555' : '#bbb'} 
              />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.productName}>{item.productName}</Text>
            {formatDate(item.date).map((line, lineIndex) => (
              <Text key={lineIndex} style={styles.date}>{line}</Text>
            ))}
            {renderMetadataBadges(item.scanMetadata)}
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete}>
            <SymbolView
              name="trash.slash.fill"
              size={26}
              tintColor={colorScheme === 'dark' ? '#fff' : '#000'}
              type="hierarchical"
              style={styles.symbol}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Add this constant at the top of the file, outside the component
const FILTER_SECTION_STATE_KEY = '@filter_section_state';
const LAST_PLACEHOLDER_KEY = '@last_placeholder';
const LAST_PLACEHOLDER_TIME_KEY = '@last_placeholder_time';

const HistoryScreen = () => {
  const navigation = useNavigation();
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const styles = getDynamicStyles(colorScheme);
  const [activeTab, setActiveTab] = useState('Nutrition');
  const [refreshing, setRefreshing] = useState(false);
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const tabWidthAnim = useRef(new Animated.Value(0)).current;
  const [tabLayout, setTabLayout] = useState({ width: 0, x: 0 });
  const isTabsDisabled = !selectedItem;
  const subtitleAnimation = useRef(new Animated.Value(1)).current;
  const [searchPlaceholder, setSearchPlaceholder] = useState('Search foods...');
  const [lastUsedPlaceholders, setLastUsedPlaceholders] = useState(new Set());
  
  // State variables for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    barcode: false,
    accurate: false,
    fast: false,
    startDate: null,
    endDate: null,
    circleScan: false,
    deepSearch: false
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start');
  
  // Filter chips "open/closed" state and related animated values.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRotation = useRef(new Animated.Value(0)).current;
  const filterOpacity = useRef(new Animated.Value(0)).current;
  const filterHeight = useRef(new Animated.Value(0)).current;

  // Add new state for temporary date selection
  const [tempSelectedDate, setTempSelectedDate] = useState(null);

  const [animatedOpacities, setAnimatedOpacities] = useState({});
  const [isFilterButtonsDisabled, setIsFilterButtonsDisabled] = useState(false);

  // Fun food items array for random placeholders
  const funFoodItems = [
    "Spicy Buffalo Wings...",
    "Double Cheeseburger...",
    "Fresh Fruit Smoothie...",
    "Grilled Chicken Salad...",
    "Pepperoni Pizza...",
    "Chocolate Chip Cookie...",
    "Breakfast Burrito...",
    "Veggie Stir Fry...",
    "Ice Cream Sundae...",
    "Crispy French Fries...",
    "Sushi California Roll...",
    "Greek Yogurt Bowl...",
    "Chicken Noodle Soup...",
    "Avocado Toast...",
    "BBQ Pulled Pork...",
    "Loaded Nachos Supreme...",
    "Teriyaki Stir Fry Bowl...",
    "Fish Tacos & Lime...",
    "Butter Chicken Curry...",
    "Crispy Spring Rolls...",
    "Street Style Tacos...",
    "Eggs Benedict...",
    "Mango Smoothie Bowl...",
    "Cheesy Garlic Bread...",
    "Vietnamese Pho...",
    "Fresh Falafel Wrap...",
    "Acai Power Bowl...",
    "Sweet & Spicy Wings...",
    "Banana Split Sundae...",
    "Spicy Ramen Bowl...",
    "Rainbow Poke Bowl...",
    "Truffle Mac & Cheese...",
    "Korean BBQ Tacos...",
    "Matcha Green Tea Latte...",
    "Loaded Sweet Potato...",
    "Mediterranean Mezze...",
    "Coconut Curry Noodles...",
    "Breakfast Pizza...",
    "Churro Ice Cream Sandwich...",
    "Kimchi Fried Rice...",
    "Golden Milk Latte...",
    "Banh Mi Sandwich...",
    "Dragon Fruit Smoothie...",
    "Loaded Tater Tots...",
    "Mochi Donut...",
    "Sriracha Honey Wings...",
    "Buddha Bowl...",
    "S'mores French Toast...",
    "Pad Thai Noodles...",
    "Guacamole & Chips...",
    "Chicken Tikka Wrap...",
    "Berry Protein Smoothie...",
    "Halloumi Burger...",
    "Peanut Butter Acai Bowl...",
    "Tempura Udon Soup...",
    "Mediterranean Falafel Bowl...",
    "Caramel Macchiato...",
    "Buffalo Cauliflower Bites...",
    "Mango Sticky Rice...",
    "Breakfast Quesadilla...",
    "Zesty Lemon Tart...",
    "Fizzy Root Beer Float...",
    "Cheese-Stuffed Jalapeno Poppers...",
    "Gooey S'mores Brownie...",
    "Crispy Tempura Shrimp...",
    "Savory Beef Wellington...",
    "Spaghetti Carbonara...",
    "Green Goddess Salad...",
    "Maple Bacon Pancakes...",
    "Chocolate Lava Cake...",
    "Cinnamon Roll Pancakes...",
    "Mediterranean Chicken Wrap...",
    "Seafood Paella...",
    "Tropical Pineapple Pizza...",
    "Buttery Croissant...",
    "Homemade Mac and Cheese...",
    "Pancake Stack...",
    "Stuffed Bell Peppers...",
    "Buffalo Mozzarella Caprese...",
    "Smoked Brisket Sandwich...",
    "Apple Pie a la Mode...",
    "Beef Bulgogi Bowl...",
    "Chocolate Fondue...",
    "Lemon Meringue Pie...",
    "Sourdough French Toast...",
    "Fried Pickle Bites...",
    "Spinach Artichoke Dip...",
    "Rosemary Garlic Lamb...",
    "Cornbread & Chili...",
    "Deconstructed Sundae...",
    "Nacho Cheese Fries...",
    "Pesto Pasta Primavera...",
    "Thai Coconut Soup...",
    "BBQ Ribs Feast...",
    "Caramel Popcorn Crunch...",
    "Fig & Goat Cheese Salad...",
    "Chocolate-covered Strawberries...",
    "Gourmet Hot Dog...",
    "Salsa Verde Tacos...",
    "Pumpkin Spice Latte...",
    "Crispy Onion Rings...",
    "Bacon-Wrapped Jalapenos...",
    "Zesty Caesar Salad...",
    "Chocolate Peanut Butter Cup...",
    "Gingerbread Latte...",
    "Crunchy Veggie Chips...",
    "Maple Glazed Donuts...",
    "Berry Waffle Cone...",
    "Pumpkin Pie Cupcake...",
    "Roasted Garlic Bread...",
    "Smoked Salmon Bagel...",
    "Caramel Apple Crisp...",
    "Tangy BBQ Nachos...",
    "Funky Fried Pickles...",
    "Cheddar Bacon Tater Tots...",
    "Spiced Chai Parfait...",
    "Sweet Potato Fries...",
    "Garlic Parmesan Wings...",
    "Coconut Mango Sorbet...",
    "Crispy Chicken Strips...",
    "French Toast Sticks...",
    "Loaded Baked Potato...",
    "Cherry Cheesecake...",
    "Blueberry Muffin Pancakes...",
    "Pumpkin Spice Donut...",
    "Lobster Roll...",
    "Spinach and Feta Pastry...",
    "Sausage Egg McMuffin...",
    "Tiramisu Cake...",
    "Honey Mustard Pretzel Bites...",
    "Triple Chocolate Brownie...",
    "Sea Salt Caramel Popcorn...",
    "Pepper Jack Quesadilla...",
    "Caprese Salad Skewers...",
    "Stuffed Mushroom Caps...",
    "Wasabi Pea Snack...",
    "Cinnamon Sugar Pretzel...",
    "Sweet Chili Shrimp...",
    "Apple Cider Donut...",
    "Pineapple Upside-Down Cake...",
    "Artichoke Spinach Dip...",
    "Peppermint Mocha...",
    "Nutella Crepe...",
    "Rosemary Pita Chips...",
    "Mushroom Swiss Burger...",
    "French Onion Soup...",
    "Tempura Avocado Bites...",
    "Sizzling Fajitas...",
    "Caramelized Banana Pancakes...",
    "Pineapple Teriyaki Skewers...",
    "Miso Glazed Eggplant...",
    "Sesame Ginger Salad...",
    "Blueberry Cheesecake...",
    "Crispy Duck Dumplings...",
    "Red Velvet Cupcake...",
    "Smoked Gouda Mac...",
    "Lemon Garlic Shrimp...",
    "Spinach Artichoke Flatbread...",
    "Truffle Fries...",
    "Coconut Shrimp...",
    "Mango Lassi...",
    "Avocado Egg Rolls...",
    "Crispy Falafel Balls...",
    "Blackberry Lemonade...",
    "Cheesy Stuffed Mushrooms...",
    "Baked Brie with Fig Jam...",
    "BBQ Chicken Flatbread...",
    "Chocolate Dipped Pretzel...",
    "Pistachio Ice Cream...",
    "Lamb Gyro...",
    "Cinnamon Apple Chips...",
    "Roasted Red Pepper Hummus...",
    "Oreo Milkshake...",
    "Matcha Pancakes...",
    "Spiked Eggnog...",
    "Cranberry Walnut Salad...",
    "Fried Mac and Cheese Balls...",
    "Smoked Turkey Club...",
    "Chocolate Eclair...",
    "Margarita Pizza...",
    "Peach Cobbler...",
    "Lobster Bisque...",
    "Loaded Cheese Fries...",
    "Pomegranate Acai Bowl...",
    "Gourmet Grilled Cheese...",
    "Buffalo Chicken Dip...",
    "Raspberry Sorbet...",
    "Eggplant Parmesan...",
    "Tango Mango Salsa...",
    "Lime Cilantro Rice Bowl...",
    "Spiced Apple Cider...",
    "Thai Mango Sticky Rice...",
    "Choco Pretzel Bark...",
    "Pumpkin Cheesecake...",
    "Roasted Brussels Sprouts...",
    "Smoky Chipotle Chili...",
    "Hawaiian BBQ Pizza...",
    "Lava Chocolate Muffin...",
    "Crispy Potato Skins...",
    "Triple Berry Parfait...",
    "Sweet Corn Fritters...",
    "Roasted Beet Salad...",
    "Vanilla Bean Cheesecake...",
    "Crispy Cheese Curds...",
    "Miso Soup with Tofu...",
    "Spaghetti Bolognese...",
    "Cajun Shrimp Po' Boy...",
    "Macadamia Nut Cookie...",
    "Pumpkin Spice Latte...",
    "Cranberry Almond Granola...",
    "Chocolate Croissant...",
    "Lemon Blueberry Scones...",
    "Mediterranean Lamb Skewers...",
    "Pomegranate Glazed Meatballs...",
    "Hoisin Chicken Bao...",
    "Mango Chili Lime Chips...",
    "Key Lime Pie...",
    "Sizzling Steak Tacos...",
    "Buttermilk Biscuits...",
    "Black Forest Cake...",
    "Cheesy Broccoli Soup...",
    "Brie and Cranberry Tart...",
    "Spaghetti Squash Primavera...",
    "Chocolate Raspberry Tart...",
    "Banana Nutella Crepe...",
    "Teriyaki Glazed Meatballs...",
    "Crispy Avocado Fries...",
    "Pumpkin Spice Muffin...",
    "BBQ Brisket Slider...",
    "Chili Cheese Dog...",
    "Strawberry Basil Lemonade...",
    "Garlic Butter Lobster...",
    "Sourdough Bread Bowl...",
    "Cranberry Walnut Bread...",
    "Honey Glazed Carrots...",
    "Buffalo Chicken Wrap...",
    "Strawberry Shortcake...",
    "Pretzel Baked Brie...",
    "Fudge Brownie Sundae...",
    "Roasted Chestnut Soup...",
    "Crispy Tempura Vegetables...",
    "Maple Pecan Pie...",
    "Beetroot Hummus...",
    "Pumpkin Pancakes...",
    "Butternut Squash Ravioli...",
    "Berry Lemon Tart...",
    "Sautéed Garlic Spinach...",
    "Chilled Cucumber Soup...",
    "Ginger Lime Chicken...",
    "Cheesecake Stuffed Strawberries...",
    "Churro Bites...",
    "Mint Chocolate Chip Cookie...",
    "Blueberry Pancake Stack...",
    "Tropical Fruit Salad...",
    "Shaved Ice Float...",
    "Wild Mushroom Risotto...",
    "Ginger Peach Crisp...",
    "Crispy Cauliflower Bites...",
    "Frosted Cupcake...",
    "Cheese Fondue...",
    "Caramelized Onion Tart...",
    "Sweet Corn Chowder...",
    "Triple Berry Galette...",
    "Spicy Tuna Tartare...",
    "Herbed Lemon Chicken...",
    "S'mores Dip...",
    "Hearty Beef Stew...",
    "Gooey Cheese Quesadilla...",
    "Butternut Squash Soup...",
    "Grilled Asparagus...",
    "Pumpkin Spice Waffles...",
    "Garlic Parmesan Knots...",
    "Berry Blast Smoothie...",
    "Spicy Lamb Kofta...",
    "Mango Coconut Pudding...",
    "Crispy Zucchini Fries...",
    "Cherry Almond Clafoutis...",
    "Maple Walnut Ice Cream...",
    "Grilled Shrimp Skewers...",
    "Coconut Curry Chicken...",
    "Sweet Potato Casserole...",
    "Spinach Ricotta Stuffed Shells...",
    "Chocolate Dipped Oreos...",
    "Caramelized Fig Tart...",
    "Toasted Ravioli...",
    "Crispy Buffalo Cauliflower...",
    "Chilled Watermelon Soup...",
    "Fried Ravioli...",
    "Chocolate Banana Bread...",
    "Cajun Popcorn Chicken...",
    "Buttery Biscuit Sliders...",
    "Pineapple Fried Rice...",
    "Gingerbread Pancakes...",
    "Crispy Tempura Sushi...",
    "Lemon Ricotta Pancakes...",
    "Spiced Pear Tart...",
    "Baked Ziti...",
    "Chocolate Hazelnut Spread...",
    "Campfire S'mores...",
    "Garlic Butter Steak...",
    "Vegetable Tempura...",
    "Nutty Granola Bars...",
    "Glazed Lemon Chicken...",
    "Apricot Glazed Chicken...",
    "Crispy Chicken Quesadilla...",
    "Tangy Pineapple Salsa...",
    "Cinnamon Roll Pancakes...",
    "Buffalo Steak Bites...",
    "Toasted Coconut Macaroons...",
    "Spiced Apple Fritters...",
    "Cherry Pie Smoothie...",
    "Fizzy Lemon Sorbet...",
    "Honey Sriracha Chicken...",
    "Mini Chicken Pot Pie...",
    "Buffalo Shrimp Tacos...",
    "Chocolate Covered Pretzels...",
    "Coconut Lime Rice Bowl...",
    "Pesto Chicken Panini...",
    "Vanilla Chai Latte...",
    "Baked Brie with Honey...",
    "Sweet Potato Gnocchi...",
    "Blackberry Lime Tart...",
    "Berrylicious Cheesecake...",
    "Spicy Cajun Wings...",
    "Garlic Butter Scallops...",
    "Balsamic Glazed Brussels...",
    "Strawberry Rhubarb Crisp...",
    "Chocolate Peanut Butter Pie...",
    "Tropical Smoothie Bowl...",
    "Crispy Panko Shrimp...",
    "Lemon Thyme Chicken...",
    "Raspberry White Chocolate Muffin...",
    "Baked Zucchini Chips...",
    "BBQ Chicken Sliders...",
    "Gooey Salted Caramel Brownie...",
    "Crispy Fish and Chips...",
    "Sizzling Skillet Lasagna...",
    "Vanilla Bean Frappe...",
    "Sweet Chili Lime Wings...",
    "BBQ Bacon Burger...",
    "Cheesy Spinach Dip...",
    "Coconut Rice Pudding...",
    "Baked Apple Crisp...",
    "Savory Crab Cake...",
    "Roasted Garlic Mashed Potatoes...",
    "Spiced Churro Sundae...",
    "Parmesan Crusted Chicken...",
    "Blueberry Lemon Pancakes...",
    "Caramelized Onion Burger...",
    "S'mores Milkshake...",
    "Mom's Spaghetti...",
    "Knees Weak, Arms Spaghetti..."
];

  // Add this function to get a new random placeholder
  const getNewRandomPlaceholder = async () => {
    try {
      // Get the last used placeholder and its timestamp
      const lastPlaceholder = await AsyncStorage.getItem(LAST_PLACEHOLDER_KEY);
      const lastTimeStr = await AsyncStorage.getItem(LAST_PLACEHOLDER_TIME_KEY);
      const lastTime = lastTimeStr ? parseInt(lastTimeStr) : 0;
      const currentTime = Date.now();
      
      // If it's been less than a week and we have a last placeholder
      if (lastPlaceholder && currentTime - lastTime < 7 * 24 * 60 * 60 * 1000) {
        // Try to get a different placeholder
        const availablePlaceholders = funFoodItems.filter(item => item !== lastPlaceholder);
        
        // If we have no more unique placeholders, just pick a random one from the full list
        if (availablePlaceholders.length === 0) {
          const randomIndex = Math.floor(Math.random() * funFoodItems.length);
          const newPlaceholder = funFoodItems[randomIndex];
          
          // Store the new placeholder and current time
          await AsyncStorage.setItem(LAST_PLACEHOLDER_KEY, newPlaceholder);
          await AsyncStorage.setItem(LAST_PLACEHOLDER_TIME_KEY, currentTime.toString());
          
          return newPlaceholder;
        }
        
        // Otherwise use an available placeholder
        const randomIndex = Math.floor(Math.random() * availablePlaceholders.length);
        const newPlaceholder = availablePlaceholders[randomIndex];
        
        // Store the new placeholder and current time
        await AsyncStorage.setItem(LAST_PLACEHOLDER_KEY, newPlaceholder);
        await AsyncStorage.setItem(LAST_PLACEHOLDER_TIME_KEY, currentTime.toString());
        
        return newPlaceholder;
      } else {
        // If it's been more than a week or no last placeholder, use any placeholder
        const randomIndex = Math.floor(Math.random() * funFoodItems.length);
        const newPlaceholder = funFoodItems[randomIndex];
        
        // Store the new placeholder and current time
        await AsyncStorage.setItem(LAST_PLACEHOLDER_KEY, newPlaceholder);
        await AsyncStorage.setItem(LAST_PLACEHOLDER_TIME_KEY, currentTime.toString());
        
        return newPlaceholder;
      }
    } catch (error) {
      console.error('Error managing placeholders:', error);
      return funFoodItems[Math.floor(Math.random() * funFoodItems.length)];
    }
  };

  // Update the useFocusEffect to use the new function
  useFocusEffect(
    React.useCallback(() => {
      getNewRandomPlaceholder().then(placeholder => {
        setSearchPlaceholder(placeholder);
      });
    }, [])
  );

  useEffect(() => {
    const colorSchemeListener = ({ colorScheme }) => {
      setColorScheme(colorScheme);
    };
    const subscription = Appearance.addChangeListener(colorSchemeListener);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    loadHistory();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
      return () => {};
    }, [])
  );

  useEffect(() => {
    applyFiltersAndSearch();
  }, [history, searchQuery, filters]);

  useEffect(() => {
    loadFilterSectionState();
  }, []);

  useEffect(() => {
    // Initialize animation values for all history items
    const opacities = {};
    history.forEach(item => {
      opacities[item.date] = new Animated.Value(1);
    });
    setAnimatedOpacities(opacities);
  }, [history]);

  const loadHistory = async () => {
    try {
      const historyData = await AsyncStorage.getItem('@product_history');
      let historyArray = historyData ? JSON.parse(historyData) : [];
      historyArray.sort((a, b) => new Date(b.date) - new Date(a.date));
      setHistory(historyArray);
      console.log('History loaded:', historyArray.length, 'items');
    } catch (e) {
      console.error('Error loading history: ', e);
    }
  };

  const loadFilterSectionState = async () => {
    try {
      const savedState = await AsyncStorage.getItem(FILTER_SECTION_STATE_KEY);
      if (savedState !== null) {
        const isOpen = JSON.parse(savedState);
        setFiltersOpen(isOpen);
        if (isOpen) {
          filterHeight.setValue(58 * scale);
          filterOpacity.setValue(1);
        }
      }
    } catch (error) {
      console.error('Error loading filter section state:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffSeconds = Math.floor(diffTime / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    let dateText = '';

    if (diffSeconds < 30) {
      dateText = 'Just now';
    } else if (diffSeconds < 60) {
      dateText = `${diffSeconds} seconds ago`;
    } else if (diffMinutes < 60) {
      dateText = `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      dateText = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays === 1) {
      dateText = `Yesterday at ${timeString}`;
    } else if (diffDays < 7) {
      dateText = `${date.toLocaleDateString([], { weekday: 'long' })} at ${timeString}`;
    } else if (diffWeeks === 1) {
      dateText = `Last week on ${date.toLocaleDateString([], { weekday: 'long' })} at ${timeString}`;
    } else if (diffWeeks < 4) {
      dateText = `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
    } else if (diffMonths < 12) {
      dateText = `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
    } else if (diffYears === 1) {
      dateText = `Last year on ${formattedDate}`;
    } else {
      dateText = `${diffYears} years ago on ${formattedDate}`;
    }

    const maxLength = 25;
    if (dateText.length > maxLength) {
      const words = dateText.split(' ');
      let lines = [];
      let currentLine = '';

      words.forEach(word => {
        if ((currentLine + word).length > maxLength) {
          lines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          currentLine += word + ' ';
        }
      });

      if (currentLine) {
        lines.push(currentLine.trim());
      }

      return lines;
    }

    return [dateText];
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadHistory().then(() => setRefreshing(false));
  }, []);

  const truncateString = (str, num) => {
    if (str.length > num) {
      return str.slice(0, num) + '...';
    } else {
      return str;
    }
  };

  const clearHistory = async () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to permanently delete all scan history?',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Cancel History Pressed'),
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('@product_history');
              setHistory([]);
              console.log('History cleared');
            } catch (e) {
              console.error('Error clearing history: ', e);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  };

  const handleTabPress = (tab) => {
    setActiveTab(tab);
    const tabIndex = ['Nutrition', 'Ingredients', 'Details'].indexOf(tab);
    Animated.parallel([
      Animated.spring(tabIndicatorAnim, {
        toValue: tabIndex,
        useNativeDriver: true,
        friction: 24,
        tension: 180,
        velocity: 10
      }),
      Animated.spring(tabWidthAnim, {
        toValue: tabLayout.width,
        useNativeDriver: true,
        friction: 24,
        tension: 180,
        velocity: 10
      })
    ]).start();
  };

  const renderNutritionTab = (item) => {
    const nutrients = item.nutrients;

    return (
      <View style={styles.tabContentContainer}>
        {nutrients.calories && renderNutrientRow('Calories', nutrients.calories)}
        {renderSeparator()}
        {nutrients.proteins && renderNutrientRow('Proteins', nutrients.proteins)}
        {renderSeparator()}
        {nutrients.carbohydrates && renderNutrientRow('Carbohydrates', nutrients.carbohydrates)}
        {renderSeparator()}
        {nutrients.fats && renderNutrientRow('Fat', nutrients.fats)}
        {renderSeparator()}
        {nutrients.fiber && renderNutrientRow('Fiber', nutrients.fiber)}
        {renderSeparator()}
        {nutrients.sodium && renderNutrientRow('Sodium', nutrients.sodium)}
      </View>
    );
  };

  const renderNutrientRow = (label, data) => {
    if (!data || data.amount === undefined) {
      return (
        <View style={styles.nutrientRow}>
          <Text style={styles.nutrientLabel}>{label}</Text>
          <Text style={styles.nutrientValue}>N/A</Text>
        </View>
      );
    }
    return (
      <View style={styles.nutrientRow}>
        <Text style={styles.nutrientLabel}>{label}</Text>
        <Text style={styles.nutrientValue}>
          {data.amount} {label === 'Calories' ? 'kcal' : label === 'Sodium' ? 'mg' : 'g'} (±
          {data.marginOfErrorPercent}%)
        </Text>
      </View>
    );
  };

  const renderSeparator = () => <View style={styles.separator} />;

  const renderIngredientsTab = (item) => {
    const nutrients = item.nutrients;
    return (
      <View style={styles.tabContentContainer}>
        <Text style={styles.ingredientDescriptionNote}>
          Click the name of the ingredient to learn more about it.
        </Text>
        {nutrients.ingredients.map((ingredient, index) => (
          <React.Fragment key={index}>
            <View style={styles.ingredientItem}>
              <TouchableOpacity onPress={() => Linking.openURL(ingredient.wikipediaLink)}>
                <Text style={styles.ingredientName}>{ingredient.name}</Text>
              </TouchableOpacity>
              <Text style={styles.ingredientDescription}>{ingredient.description}</Text>
            </View>
            {index < nutrients.ingredients.length - 1 && renderSeparator()}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const renderDetailsTab = (item) => {
    const nutrients = item.nutrients;
    return (
      <View style={styles.tabContentContainer}>
        <Text style={styles.detailText}>{nutrients.details.summary}</Text>
        <Text style={styles.detailPrepTime}>Prep Time: {nutrients.details.prepTime}</Text>
        <Text style={styles.detailServingSize}>Serving Size: {nutrients.details.servingSize}</Text>
        {renderSeparator()}
        <TouchableOpacity onPress={() => Linking.openURL(nutrients.details.wikipediaLink)}>
          <Text style={styles.wikipediaLink}>Learn more on Wikipedia</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSubtitle = () => {
    if (history.length < 4) {
      return (
        <Text style={styles.subtitle}>
          Results from the last 28 days will be used to personalize your app.
        </Text>
      );
    }
    return null;
  };

  const renderMetadataBadges = (scanMetadata) => {
    if (!scanMetadata) return null;

    const isDeepSearch = scanMetadata.scanMode === 'search';
    const isAccurate = scanMetadata.scanMode === 'accurate';

    // Determine the appropriate text for the mode badge
    let modeText = 'Fast Mode';
    if (isAccurate) modeText = 'Accurate Mode';
    if (isDeepSearch) modeText = 'Deep Search';

    return (
      <View style={styles.metadataBadgesContainer}>
        {/* Mode Badge */}
        <View 
          style={[
            styles.metadataBadge,
            isAccurate && styles.accurateBadge, // Keep existing style for accurate
            isDeepSearch && styles.deepSearchBadge // Add a new style for deep search container
          ]}
        >
          {isDeepSearch && <DeepSearchGradientBackground />} 
          <Text 
            style={[
              styles.metadataBadgeText,
              // Apply specific styles for deep search text
              isDeepSearch && {
                color: '#FFFFFF',
                paddingHorizontal: 8 * scale, // Add padding to text
                paddingVertical: 4 * scale,   // Add padding to text
                zIndex: 1, // Ensure text is above gradient
              }
            ]}
          >
            {modeText}
          </Text>
        </View>

        {/* Barcode Badge */}
        {scanMetadata.usedBarcode && (
          <View style={[styles.metadataBadge, styles.barcodeBadge]}>
            <Text style={styles.metadataBadgeText}>Barcode</Text>
          </View>
        )}

        {/* Circle Scan Badge */}
        {scanMetadata.usedCircleScan && (
          <View style={[styles.metadataBadge, styles.circleScanBadge]}>
            <CircleToScanGradientBackground />
            <Text style={[
              styles.metadataBadgeText,
              {
                color: '#FFFFFF',
                paddingHorizontal: 8 * scale,
                paddingVertical: 4 * scale,
                zIndex: 1,
              }
            ]}>
              Circle Scan
            </Text>
          </View>
        )}

        {/* Processing Time Badge */}
        <View style={styles.metadataBadge}>
          <Text style={styles.metadataBadgeText}>{scanMetadata.processingTime}s</Text>
        </View>
      </View>
    );
  };

  const applyFiltersAndSearch = () => {
    let filtered = [...history];
    let hadMatches = true;

    // Create a map to track which items will be visible
    const willBeVisible = {};
    history.forEach(item => {
      willBeVisible[item.date] = true;
    });

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(item => {
        const matches = item.productName.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matches) willBeVisible[item.date] = false;
        return matches;
      });
    }

    // Apply scan type filters
    if (filters.barcode || filters.accurate || filters.fast || filters.circleScan || filters.deepSearch) {
      filtered = filtered.filter(item => {
        if (!item.scanMetadata) {
          willBeVisible[item.date] = false;
          return false;
        }
        const matches = (
          (filters.barcode && item.scanMetadata.usedBarcode) ||
          (filters.accurate && item.scanMetadata.scanMode === 'accurate') ||
          (filters.fast && item.scanMetadata.scanMode === 'fast') ||
          (filters.circleScan && item.scanMetadata.usedCircleScan) ||
          (filters.deepSearch && item.scanMetadata.scanMode === 'search')
        );
        if (!matches) willBeVisible[item.date] = false;
        return matches;
      });
    }

    // Apply date filters
    if (filters.startDate) {
      filtered = filtered.filter(item => {
        const matches = new Date(item.date) >= filters.startDate;
        if (!matches) willBeVisible[item.date] = false;
        return matches;
      });
    }
    if (filters.endDate) {
      filtered = filtered.filter(item => {
        const matches = new Date(item.date) <= filters.endDate;
        if (!matches) willBeVisible[item.date] = false;
        return matches;
      });
    }

    // Check if we have any matches
    hadMatches = filtered.length > 0;

    // Only trigger error haptic for filters, not search (search error is handled in onSubmitEditing)
    if (!hadMatches && (filters.barcode || filters.accurate || filters.fast || filters.circleScan || filters.deepSearch || filters.startDate || filters.endDate)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    // First fade out non-matching items
    const fadeOutPromises = Object.entries(willBeVisible)
      .filter(([_, visible]) => !visible)
      .map(([date]) => {
        return new Promise((resolve) => {
          if (animatedOpacities[date]) {
            Animated.timing(animatedOpacities[date], {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start(resolve);
          } else {
            resolve();
          }
        });
      });

    // After fade out, update layout and fade in
    Promise.all(fadeOutPromises).then(() => {
      // Configure layout animation
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setFilteredHistory(filtered);

      // Fade in matching items (if they were previously faded out)
      Object.entries(willBeVisible)
        .filter(([_, visible]) => visible)
        .forEach(([date]) => {
          if (animatedOpacities[date]) {
            animatedOpacities[date].setValue(1);
          }
        });
    });
  };

  const handleDateSelect = (event, selectedDate) => {
    // For iOS, we'll handle confirmation through the Done button
    if (Platform.OS === 'ios') {
      // Just update the temporary selected date
      if (selectedDate) {
        setTempSelectedDate(selectedDate);
      }
      return;
    }

    // For Android, handle as before
    if (event.type === 'dismissed' || !selectedDate) {
      setShowDatePicker(false);
      return;
    }
    
    setShowDatePicker(false);
    setFilters(prev => ({
      ...prev,
      [datePickerMode === 'start' ? 'startDate' : 'endDate']: selectedDate
    }));
  };

  const clearFilters = () => {
    setFilters({
      barcode: false,
      accurate: false,
      fast: false,
      startDate: null,
      endDate: null,
      circleScan: false,
      deepSearch: false
    });
    setSearchQuery('');
  };

  const renderFilterChips = () => {
    return (
      <Animated.View style={{ height: filterHeight, overflow: 'hidden', marginTop: 8 * scale }}>
        <Animated.ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{
            opacity: filterOpacity,
            transform: [{
              translateY: filterOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0] // Changed from [10, 0] to [-10, 0] to animate from top
              })
            }]
          }}
          contentContainerStyle={styles.filterChipsContent}
        >
          {/* Moved Deep Search Chip to the front */}
          <TouchableOpacity
            style={[styles.filterChip, filters.deepSearch && styles.filterChipActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setFilters(prev => ({ ...prev, deepSearch: !prev.deepSearch }));
            }}
          >
            <View style={styles.filterChipGradientIconContainer}>
              <DeepSearchGradientBackground />
              <Ionicons 
                name="search" 
                size={18 * scale} // Increased size
                color="#FFFFFF" 
                style={styles.filterChipGradientIconOverlay} 
              />
            </View>
            <Text style={[styles.filterChipText, filters.deepSearch && styles.filterChipTextActive]}>
              Deep Search
            </Text>
          </TouchableOpacity>

          {/* Barcode Chip */}
          <TouchableOpacity
            style={[styles.filterChip, filters.barcode && styles.filterChipActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setFilters(prev => ({ ...prev, barcode: !prev.barcode }));
            }}
          >
            <SymbolView
              name="barcode.viewfinder"
              size={16}
              tintColor={filters.barcode ? '#fff' : (colorScheme === 'dark' ? '#fff' : '#000')}
              type="hierarchical"
              style={styles.filterChipIcon}
            />
            <Text style={[styles.filterChipText, filters.barcode && styles.filterChipTextActive]}>
              Barcode
            </Text>
          </TouchableOpacity>

          {/* Accurate Chip */}
          <TouchableOpacity
            style={[styles.filterChip, filters.accurate && styles.filterChipActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setFilters(prev => ({ ...prev, accurate: !prev.accurate }));
            }}
          >
            <SymbolView
              name="checkmark.seal.fill"
              size={16}
              tintColor={filters.accurate ? '#fff' : (colorScheme === 'dark' ? '#fff' : '#000')}
              type="hierarchical"
              style={styles.filterChipIcon}
            />
            <Text style={[styles.filterChipText, filters.accurate && styles.filterChipTextActive]}>
              Accurate
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filters.fast && styles.filterChipActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setFilters(prev => ({ ...prev, fast: !prev.fast }));
            }}
          >
            <SymbolView
              name="bolt.fill"
              size={16}
              tintColor={filters.fast ? '#fff' : (colorScheme === 'dark' ? '#fff' : '#000')}
              type="hierarchical"
              style={styles.filterChipIcon}
            />
            <Text style={[styles.filterChipText, filters.fast && styles.filterChipTextActive]}>
              Fast
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filters.circleScan && styles.filterChipActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setFilters(prev => ({ ...prev, circleScan: !prev.circleScan }));
            }}
          >
            <View style={styles.filterChipGradientIconContainer}>
              <CircleToScanGradientBackground />
              <Ionicons 
                name="scan-circle-outline"
                size={18 * scale}
                color="#FFFFFF"
                style={styles.filterChipGradientIconOverlay}
              />
            </View>
            <Text style={[styles.filterChipText, filters.circleScan && styles.filterChipTextActive]}>
              Circle Scan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filters.startDate && styles.filterChipActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setDatePickerMode('start');
              setShowDatePicker(true);
            }}
          >
            <SymbolView
              name="calendar"
              size={16}
              tintColor={filters.startDate ? '#fff' : (colorScheme === 'dark' ? '#fff' : '#000')}
              type="hierarchical"
              style={styles.filterChipIcon}
            />
            <Text style={[styles.filterChipText, filters.startDate && styles.filterChipTextActive]}>
              {filters.startDate ? filters.startDate.toLocaleDateString() : 'Start Date'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filters.endDate && styles.filterChipActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setDatePickerMode('end');
              setShowDatePicker(true);
            }}
          >
            <SymbolView
              name="calendar"
              size={16}
              tintColor={filters.endDate ? '#fff' : (colorScheme === 'dark' ? '#fff' : '#000')}
              type="hierarchical"
              style={styles.filterChipIcon}
            />
            <Text style={[styles.filterChipText, filters.endDate && styles.filterChipTextActive]}>
              {filters.endDate ? filters.endDate.toLocaleDateString() : 'End Date'}
            </Text>
          </TouchableOpacity>

          {(filters.barcode || filters.accurate || filters.fast || filters.circleScan || filters.deepSearch || filters.startDate || filters.endDate) && (
            <TouchableOpacity
              style={[styles.filterChip, styles.clearFilterChip]}
              onPress={() => {
                Haptics.selectionAsync();
                clearFilters();
              }}
            >
              <SymbolView
                name="xmark.circle.fill"
                size={16}
                tintColor={colorScheme === 'dark' ? '#fff' : '#000'}
                type="hierarchical"
                style={styles.filterChipIcon}
              />
              <Text style={styles.filterChipText}>Clear All</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colorScheme === 'dark' ? '#FF453A' : '#FF3B30' }]}
            onPress={() => {
              Haptics.selectionAsync();
              clearHistory();
            }}
          >
            <SymbolView
              name="trash.slash.fill"
              size={16}
              tintColor="#fff"
              type="hierarchical"
              style={styles.filterChipIcon}
            />
            <Text style={[styles.filterChipText, { color: '#fff' }]}>Clear History</Text>
          </TouchableOpacity>
        </Animated.ScrollView>
      </Animated.View>
    );
  };

  const toggleFilterSection = () => {
    const newShow = !filtersOpen;
    const targetHeight = newShow ? 58 * scale : 0; // Increased from 50 to 58 to account for margin
    
    Animated.parallel([
      Animated.timing(filterRotation, {
        toValue: newShow ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(filterOpacity, {
        toValue: newShow ? 1 : 0,
        duration: newShow ? 400 : 200, // Slower fade in, faster fade out
        useNativeDriver: true,
      }),
      Animated.timing(filterHeight, {
        toValue: targetHeight,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
    
    setFiltersOpen(newShow);
    
    try {
      AsyncStorage.setItem(FILTER_SECTION_STATE_KEY, JSON.stringify(newShow));
    } catch (error) {
      console.error('Error saving filter section state:', error);
    }
  };

  const renderHistoryCard = (item) => {
    const opacity = animatedOpacities[item.date] || new Animated.Value(1);
    
    return (
      <Animated.View 
        key={item.date}
        style={{ opacity }}
      >
        <HistoryCard
          item={item}
          onSelect={(itm) => {
            setSelectedItem(itm);
            setActiveTab('Nutrition');
          }}
          onRemove={() => {
            const updatedHistory = history.filter(i => i.date !== item.date);
            AsyncStorage.setItem('@product_history', JSON.stringify(updatedHistory));
            if (updatedHistory.length >= 4) {
              Animated.timing(subtitleAnimation, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start();
            }
            setHistory(updatedHistory);
            console.log('History entry deleted');
          }}
          styles={styles}
          colorScheme={colorScheme}
          formatDate={formatDate}
          renderMetadataBadges={renderMetadataBadges}
        />
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
            <Text style={styles.historyTitle}>History</Text>
      
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <SymbolView
                  name="magnifyingglass"
                  size={20}
                  tintColor={colorScheme === 'dark' ? '#666' : '#999'}
                  type="hierarchical"
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    if (text === '') {
                      Haptics.selectionAsync();
                    }
                  }}
                  onSubmitEditing={() => {
                // Only trigger error haptic if there's a search query and no results
                    if (searchQuery && filteredHistory.length === 0) {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    }
                  }}
                  returnKeyType="done"
                  enablesReturnKeyAutomatically={false}
                />
                {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => {
                    Haptics.selectionAsync();
                    setSearchQuery('');
                  }}>
                    <SymbolView
                      name="xmark.circle.fill"
                      size={20}
                      tintColor={colorScheme === 'dark' ? '#666' : '#999'}
                      type="hierarchical"
                      style={styles.clearSearchIcon}
                    />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity 
                style={styles.filterButton} 
                onPress={toggleFilterSection}
              >
                <Animated.View 
                  style={{
                    transform: [{
                      rotate: filterRotation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '180deg']
                      })
                    }]
                  }}
                >
                  <SymbolView
                    name="line.3.horizontal.decrease.circle.fill"
                    size={24}
                    tintColor={colorScheme === 'dark' ? '#fff' : '#000'} 
                    type="hierarchical"
                    style={styles.filterIcon}
                  />
                </Animated.View>
              </TouchableOpacity>
            </View>

            {renderFilterChips()}

            {/* Showing foods count */}
            {(searchQuery || filters.barcode || filters.accurate || filters.fast || filters.circleScan || filters.deepSearch || filters.startDate || filters.endDate || filteredHistory.length !== history.length) && filteredHistory.length > 0 && (
              <Text style={{
                textAlign: 'center',
                color: colorScheme === 'dark' ? '#888' : '#888',
                fontSize: 14 * scale,
                marginTop: 4 * scale,
                marginBottom: 2 * scale,
                letterSpacing: 0.1,
              }}>
                {`Showing ${filteredHistory.length} food${filteredHistory.length === 1 ? '' : 's'}${(searchQuery || filters.barcode || filters.accurate || filters.fast || filters.circleScan || filters.deepSearch || filters.startDate || filters.endDate) ? ' from filter(s)' : ''}`}
              </Text>
            )}

        {filteredHistory.length > 0 ? (
          <View style={styles.historyList}>
            {filteredHistory.map(item => renderHistoryCard(item))}
            {history.length < 4 && (
              <Animated.View style={{ opacity: subtitleAnimation }}>
                <Text style={styles.subtitle}>
                  Results from the last 28 days will be used to personalize your app.
                </Text>
              </Animated.View>
            )}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            {history.length === 0 
              ? 'Your history is currently empty. Items you scan will appear here.'
              : 'No results found for your search or filters.'}
          </Text>
        )}
      </ScrollView>

      {showDatePicker && (Platform.OS === 'ios' ? (
        <Modal
          transparent
          animationType="fade"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity 
                  onPress={() => {
                    setTempSelectedDate(null);
                    setShowDatePicker(false);
                  }}
                  style={styles.datePickerButton}
                >
                  <Text style={styles.datePickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    const dateToSet = tempSelectedDate || new Date();
                    setFilters(prev => ({
                      ...prev,
                      [datePickerMode === 'start' ? 'startDate' : 'endDate']: dateToSet
                    }));
                    setTempSelectedDate(null);
                    setShowDatePicker(false);
                  }}
                  style={styles.datePickerButton}
                >
                  <Text style={[styles.datePickerButtonText, { color: '#007AFF' }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempSelectedDate || (datePickerMode === 'start' ? 
                  (filters.startDate || new Date()) : 
                  (filters.endDate || new Date())
                )}
                mode="date"
                display="spinner"
                onChange={handleDateSelect}
                style={styles.datePicker}
              />
            </View>
          </View>
        </Modal>
      ) : (
        <DateTimePicker
          value={datePickerMode === 'start' ? (filters.startDate || new Date()) : (filters.endDate || new Date())}
          mode="date"
          display="default"
          onChange={handleDateSelect}
        />
      ))}

      {selectedItem && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={!!selectedItem}
          onRequestClose={() => setSelectedItem(null)}
        >
          <View style={styles.modalView}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedItem(null)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.productNameModal} numberOfLines={1}>
              {truncateString(selectedItem.productName, 20)}
            </Text>
            <Text style={styles.dateModal}>{formatDate(selectedItem.date)}</Text>
            
            <View style={styles.imageContainer}>
              <View style={styles.controlsOverlay}>
                {selectedItem.scanMetadata && (
                  <View style={styles.metadataOverlay}>
                    {/* Mode Badge in Modal */}
                    <View style={[
                      styles.metadataBadge,
                      selectedItem.scanMetadata.scanMode === 'accurate' && styles.accurateBadge,
                      selectedItem.scanMetadata.scanMode === 'search' && styles.deepSearchBadge // Add style for deep search
                    ]}>
                      {selectedItem.scanMetadata.scanMode === 'search' && <DeepSearchGradientBackground />} 
                      <Text style={[
                        styles.metadataBadgeText,
                        // Apply specific styles for deep search text in modal
                        selectedItem.scanMetadata.scanMode === 'search' && {
                          color: '#FFFFFF',
                          paddingHorizontal: 8 * scale, // Add padding to text
                          paddingVertical: 4 * scale,   // Add padding to text
                          zIndex: 1, // Ensure text is above gradient
                        }
                      ]}>
                        {selectedItem.scanMetadata.scanMode === 'accurate' ? 'Accurate' : 
                          selectedItem.scanMetadata.scanMode === 'search' ? 'Deep Search' : 'Fast'} Mode
                      </Text>
                    </View>
                    
                    {/* Barcode Badge in Modal */}
                    {selectedItem.scanMetadata.usedBarcode && (
                      <View style={[styles.metadataBadge, styles.barcodeBadge]}>
                        <Text style={styles.metadataBadgeText}>Barcode</Text>
                      </View>
                    )}

                    {/* Circle Scan Badge in Modal */}
                    {selectedItem.scanMetadata.usedCircleScan && (
                      <View style={[styles.metadataBadge, styles.circleScanBadge]}>
                        <CircleToScanGradientBackground />
                        <Text style={[
                          styles.metadataBadgeText,
                          {
                            color: '#FFFFFF',
                            paddingHorizontal: 8 * scale,
                            paddingVertical: 4 * scale,
                            zIndex: 1,
                          }
                        ]}>
                          Circle Scan
                        </Text>
                      </View>
                    )}

                    {/* Processing Time Badge in Modal */}
                    <View style={styles.metadataBadge}>
                      <Text style={styles.metadataBadgeText}>
                        {selectedItem.scanMetadata.processingTime}s
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              <Image 
                source={{ 
                  uri: typeof selectedItem.imageUri === 'string' && !selectedItem.imageUri.startsWith('data:image/jpeg;base64,')
                    ? 'data:image/jpeg;base64,' + selectedItem.imageUri
                    : selectedItem.imageUri 
                }} 
                style={styles.modalImage} 
              />
            </View>

            <View style={styles.tabContainer}>
              {!isTabsDisabled && (
                <Animated.View
                  style={[
                    styles.tabIndicator,
                    {
                      transform: [{
                        translateX: tabIndicatorAnim.interpolate({
                          inputRange: [0, 1, 2],
                          outputRange: [width * 0.05, width * 0.35, width * 0.65],
                        })
                      }],
                      width: 90,
                      opacity: isTabsDisabled ? 0 : 1,
                    }
                  ]}
                />
              )}
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'Nutrition' && styles.activeTabButton]}
                onPress={() => handleTabPress('Nutrition')}
              >
                <Text style={[
                  styles.tabButtonText,
                  activeTab === 'Nutrition' && styles.activeTabButtonText
                ]}>Nutrition</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'Ingredients' && styles.activeTabButton]}
                onPress={() => handleTabPress('Ingredients')}
              >
                <Text style={[
                  styles.tabButtonText,
                  activeTab === 'Ingredients' && styles.activeTabButtonText
                ]}>Ingredients</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'Details' && styles.activeTabButton]}
                onPress={() => handleTabPress('Details')}
              >
                <Text style={[
                  styles.tabButtonText,
                  activeTab === 'Details' && styles.activeTabButtonText
                ]}>Details</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.nutrientContainer}>
              {activeTab === 'Nutrition' && renderNutritionTab(selectedItem)}
              {activeTab === 'Ingredients' && renderIngredientsTab(selectedItem)}
              {activeTab === 'Details' && renderDetailsTab(selectedItem)}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
};

const getDynamicStyles = (colorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 50 * scale,
      backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF',
    },
    scrollContainer: {
      flex: 1,
      width: '100%',
    },
    cardContainer: {
      marginVertical: 0 * scale,
    },
    card: {
      flexDirection: 'row',
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f3f3f3',
      padding: 13 * scale,
      borderRadius: 25 * scale,
      borderWidth: 1,
      marginBottom: 16 * scale,
      borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
    },
    productImage: {
      width: 100 * scale,
      height: 100 * scale,
      borderRadius: 15 * scale,
    },
    imagePlaceholder: {
      width: 100 * scale,
      height: 100 * scale,
      borderRadius: 15 * scale,
      backgroundColor: colorScheme === 'dark' ? '#2a2a2c' : '#e9e9e9',
      justifyContent: 'center',
      alignItems: 'center',
    },
    info: {
      flex: 1,
      marginLeft: 10 * scale,
      justifyContent: 'center',
    },
    productName: {
      fontSize: 18 * scale,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#fff' : '#000',
    },
    date: {
      fontSize: 14 * scale,
      color: colorScheme === 'dark' ? '#888' : '#7a7a7a',
      marginTop: 3 * scale,
      marginLeft: 1 * scale,
    },
    emptyText: {
      marginTop: 50 * scale,
      fontSize: 16 * scale,
      color: '#AAAAAA',
      textAlign: 'center',
      marginHorizontal: 13 * scale,
    },
    modalView: {
      flex: 1,
      marginTop: 80 * scale,
      backgroundColor: colorScheme === 'dark' ? '#111' : '#FFF',
      borderRadius: isIphoneSE() ? 15 * scale : 48 * scale,
      padding: 20 * scale,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 * scale },
      shadowOpacity: 0.75,
      shadowRadius: 50 * scale,
      elevation: 5,
    },
    productNameModal: {
      fontSize: 24 * scale,
      alignSelf: 'center',
      marginBottom: 3 * scale,
      fontWeight: 'bold',
      top: 0.3 * scale,
      color: colorScheme === 'dark' ? '#fff' : '#000',
    },
    imageContainer: {
      width: '100%',
      height: 250 * scale,
      borderRadius: 24 * scale,
      marginBottom: 16 * scale,
      position: 'relative',
    },
    modalImage: {
      width: '100%',
      height: '100%',
      borderRadius: 24 * scale,
    },
    controlsOverlay: {
      position: 'absolute',
      top: 12 * scale ,
      left: 12 * scale,
      right: 12 * scale,
      zIndex: 2,
    },
    metadataOverlay: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8 * scale,
    },
    nutrientContainer: {
      width: '100%',
    },
    nutrientRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 2 * scale,
    },
    nutrientLabel: {
      fontWeight: '500',
      fontSize: 17 * scale,
      color: colorScheme === 'dark' ? '#f9f9f9' : '#000',
    },
    nutrientValue: {
      fontSize: 16 * scale,
      fontWeight: '400',
      color: colorScheme === 'dark' ? '#d9d9d9' : '#7a7a7a',
      textAlign: 'right',
    },
    closeButton: {
      backgroundColor: colorScheme === 'dark' ? '#3a3a3F' : '#000',
      borderRadius: 100 * scale,
      padding: 8,
      elevation: 2,
      position: 'absolute',
      right: 15,
      top: 15,
      zIndex: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
    },
    iconButton: {
      position: 'absolute',
      right: 6 * scale,
      top: isIphoneSE() ? 1.5 * scale : 3 * scale,
      padding: 10 * scale,
      zIndex: 1,
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#000',
      borderRadius: 15 * scale,
    },
    historyTitle: {
      marginTop: isIphoneSE() ? 5 * scale : 12 * scale,
      fontSize: 28 * scale,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#fff' : '#000',
      textAlign: 'center',
    },
    separatorTitle: {
      height: 5 * scale,
      width: 300 * scale,
      backgroundColor: '#333',
      marginVertical: 20 * scale,
      borderRadius: 900 * scale,
    },
    separator: {
      height: 4 * scale,
      backgroundColor: colorScheme === 'dark' ? '#333333' : '#CCCCCC',
      marginVertical: 8 * scale,
      marginBottom: 16 * scale,
      borderRadius: 900 * scale,
    },
    deleteButton: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10 * scale,
      backgroundColor: colorScheme === 'dark' ? '#161618' : '#ddd',
      borderRadius: 15 * scale,
    },
    debugButton: {
      position: 'absolute',
      right: 84 * scale,
      top: isIphoneSE() ? 5 * scale : 8 * scale,
      padding: 10 * scale,
      zIndex: 1,
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#000',
      borderRadius: 15 * scale,
    },
    subtitle: {
      fontSize: 16 * scale,
      color: '#888888',
      textAlign: 'center',
      marginTop: 40 * scale,
      marginBottom: 35 * scale,
      marginHorizontal: 25 * scale,
    },
    tabContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 16 * scale,
      width: '100%',
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#F0F0F0',
      marginHorizontal: 15 * scale,
      borderRadius: 20 * scale,
      paddingVertical: 6 * scale,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
      position: 'relative',
      overflow: 'hidden',
    },
    tabButton: {
      paddingVertical: 8 * scale,
      paddingHorizontal: 16 * scale,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeTabButton: {},
    tabButtonText: {
      color: colorScheme === 'dark' ? '#666' : '#888',
      fontSize: 16 * scale,
      fontWeight: '400',
    },
    activeTabButtonText: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontWeight: '500',
    },
    tabContentContainer: {
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F0F0F0',
      borderRadius: 25 * scale,
      padding: 16 * scale,
      marginBottom: 16 * scale,
      borderWidth: 1 * scale,
      borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
    },
    ingredientDescriptionNote: {
      color: '#888888',
      fontSize: 14 * scale,
      marginBottom: 10 * scale,
      textAlign: 'center',
    },
    ingredientItem: {
      marginBottom: 5 * scale,
    },
    ingredientName: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontSize: 16 * scale,
      fontWeight: 'bold',
      marginBottom: 4 * scale,
    },
    ingredientDescription: {
      color: '#888888',
      fontSize: 14 * scale,
    },
    detailText: {
      color: colorScheme === 'dark' ? '#ccc' : '#555',
      fontSize: 16 * scale,
      marginBottom: 20 * scale,
    },
    detailPrepTime: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontSize: 16 * scale,
      fontWeight: '500',
      marginBottom: 8 * scale,
    },
    detailServingSize: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000',
      fontSize: 16 * scale,
      fontWeight: '500',
      marginBottom: 8 * scale,
    },
    wikipediaLink: {
      color: '#3498DB',
      fontSize: 16 * scale,
      textDecorationLine: 'underline',
      marginTop: 0,
    },
    dateModal: {
      fontSize: 16 * scale,
      color: '#888888',
      textAlign: 'center',
      marginBottom: 4 * scale,
    },
    metadataBadgesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6 * scale,
      marginTop: 8 * scale,
    },
    metadataBadge: {
      backgroundColor: colorScheme === 'dark' ? '#2a2a2c' : '#e0e0e0',
      paddingHorizontal: 8 * scale,
      paddingVertical: 4 * scale,
      borderRadius: 8 * scale,
      borderWidth: 1 * scale,
      borderColor: colorScheme === 'dark' ? '#3a3a3c' : '#d0d0d0',
      overflow: 'hidden', // Ensure gradient stays within bounds
      position: 'relative', // Add relative positioning
    },
    deepSearchBadge: {
      backgroundColor: 'transparent', // Override default background
      borderColor: colorScheme === 'dark' ? '#666' : '#bbb',
      paddingHorizontal: 0, // Remove padding from container
      paddingVertical: 0,   // Remove padding from container
    },
    accurateBadge: {
      backgroundColor: colorScheme === 'dark' ? '#1a3f5c' : '#e1f0ff',
      borderColor: colorScheme === 'dark' ? '#234b6b' : '#b8d6f3',
    },
    barcodeBadge: {
      backgroundColor: colorScheme === 'dark' ? '#2c3c2c' : '#e5f5e5',
      borderColor: colorScheme === 'dark' ? '#3c4c3c' : '#c5e5c5',
    },
    circleScanBadge: {
      backgroundColor: colorScheme === 'dark' ? '#2c3c2c' : '#e5f5e5',
      borderColor: colorScheme === 'dark' ? '#3c4c3c' : '#c5e5c5',
    },
    metadataBadgeText: {
      fontSize: 12 * scale,
      color: colorScheme === 'dark' ? '#e0e0e0' : '#333333',
      fontWeight: '500',
    },
    scanMetadataContainer: {
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f0f0f0',
      borderRadius: 15 * scale,
      padding: 16 * scale,
      marginBottom: 16 * scale,
      width: '100%',
    },
    scanMetadataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8 * scale,
    },
    scanMetadataLabel: {
      fontSize: 15 * scale,
      color: colorScheme === 'dark' ? '#888' : '#666',
      fontWeight: '500',
    },
    scanMetadataValue: {
      fontSize: 15 * scale,
      color: colorScheme === 'dark' ? '#fff' : '#000',
      fontWeight: '600',
    },
    accurateText: {
      color: colorScheme === 'dark' ? '#4a9eff' : '#0066cc',
    },
    barcodeText: {
      color: colorScheme === 'dark' ? '#4caf50' : '#2e7d32',
    },
    tabIndicator: {
      position: 'absolute',
      bottom: 4 * scale,
      height: 3 * scale,
      backgroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      borderRadius: 90 * scale,
    },
    filterChipsContainer: {
      width: '100%',
      paddingHorizontal: 16 * scale,
      paddingTop: 8 * scale,
    },
    filterChipsContent: {
      left: 16 * scale,
      paddingRight: 32 * scale,
      gap: 8 * scale,
      flexDirection: 'row',
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12 * scale,
      paddingVertical: 8 * scale,
      borderRadius: 16 * scale,
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f3f3f3',
      borderWidth: 0,
      height: 50 * scale,
      maxHeight: 50 * scale,
    },
    filterChipActive: {
      backgroundColor: colorScheme === 'dark' ? '#0A84FF' : '#007AFF',
      maxHeight: 50 * scale,
    },
    filterChipIcon: {
      width: 16 * scale,
      height: 16 * scale,
      marginRight: 6 * scale,
    },
    filterChipText: {
      fontSize: 15 * scale,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#fff' : '#000',
    },
    filterChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    filterChipGradientIconContainer: {
      width: 32 * scale, // Made bigger
      height: 32 * scale, // Made bigger
      borderRadius: 10 * scale, // More rounded
      marginRight: 6 * scale,
      marginLeft: -3 * scale,
      overflow: 'hidden',
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterChipGradientIconOverlay: {
      position: 'absolute', // Position overlay on top
      // Removed text shadow properties
    },
    clearFilterChip: {
      backgroundColor: colorScheme === 'dark' ? '#FF453A' : '#FF3B30',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16 * scale,
      marginTop: 16 * scale,
      gap: 12 * scale,
      width: '100%',
    },
    searchInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f3f3f3',
      borderRadius: 12 * scale,
      paddingHorizontal: 12 * scale,
      height: 40 * scale,
    },
    searchInput: {
      flex: 1,
      color: colorScheme === 'dark' ? '#fff' : '#000',
      fontSize: 16 * scale,
      marginLeft: 8 * scale,
      height: '100%',
    },
    searchIcon: {
      width: 20 * scale,
      height: 20 * scale,
    },
    clearSearchIcon: {
      width: 20 * scale,
      height: 20 * scale,
      marginLeft: 8 * scale,
    },
    filterIcon: {
      width: 34 * scale,
      height: 34 * scale,
    },
    filterButton: {
      // Define any additional styling if needed for consistency
    },
    datePickerOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    datePickerContainer: {
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff',
      borderTopLeftRadius: 20 * scale,
      borderTopRightRadius: 20 * scale,
      paddingBottom: 20 * scale,
    },
    datePickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16 * scale,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#333' : '#e5e5e5',
    },
    datePickerButton: {
      padding: 8 * scale,
    },
    datePickerButtonText: {
      fontSize: 16 * scale,
      color: colorScheme === 'dark' ? '#fff' : '#000',
    },
    datePicker: {
      height: 200 * scale,
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff',
    },
    historyList: {
      padding: 12 * scale,
    },
  });

export default HistoryScreen;