import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  FlatList,
  useColorScheme,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Superwall from "@superwall/react-native-superwall"

const { width, height } = Dimensions.get('window');

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const styles = getDynamicStyles(colorScheme);

  const onboardingSteps = [
    {
      title: "Welcome to MacroScan",
      description: "Get ready to revolutionize your nutrition tracking for free!",
      imageLight: require('../assets/welcome.png'),
      imageDark: require('../assets/welcome-dark.png'),
      imageStyle: { width: width * 0.9, height: height * 0.2 },
      bottomDescription: "MacroScan uses AI to analyze your meals and provide accurate nutritional information.",
    },
    {
      title: "Take a Photo",
      description: "Simply snap a picture of your meal.",
      imageLight: require('../assets/camera-light.jpg'),
      imageDark: require('../assets/camera-dark.jpg'),
      imageStyle: { width: width * 0.9, height: height * 0.15 },
      bottomDescription: "Our advanced AI will identify the foods and portion sizes.",
    },
    {
      title: "Get Instant Results",
      description: "Receive detailed macro and micronutrient information.",
      imageLight: require('../assets/resultImage-light.jpg'),
      imageDark: require('../assets/resultImage-dark.jpg'),
      imageStyle: { width: width * 0.9, height: height * 0.55 },
      bottomDescription: "Track your daily intake and make informed dietary decisions.",
    },
  ];

  useEffect(() => {
    if (currentIndex === 0 && !hasAnimated) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }).start(() => setHasAnimated(true));
    }
  }, [currentIndex, hasAnimated, fadeAnim]);

  const navigateHome = () => {
    navigation.navigate('HomeTabs', { screen: 'Home' });
    navigation.reset({
      index: 0,
      routes: [{ name: 'HomeTabs' }],
    });
  };

  const showPaywall = () => {
    Superwall.shared.register('onboarding').then(() => {
      navigateHome();
    });
  };

  const handleNext = () => {
    if (currentIndex < onboardingSteps.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      showPaywall();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      flatListRef.current.scrollToIndex({ index: currentIndex - 1 });
      setCurrentIndex(currentIndex - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const renderItem = ({ item, index }) => {
    const content = (
      <View style={styles.slide}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
        <Image 
          source={colorScheme === 'dark' ? item.imageDark : item.imageLight}
          style={[styles.image, item.imageStyle]}
        />
        <Text style={styles.bottomDescription}>{item.bottomDescription}</Text>
      </View>
    );

    if (index === 0) {
      return (
        <Animated.View style={{ opacity: fadeAnim }}>
          {content}
        </Animated.View>
      );
    }

    return content;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        ref={flatListRef}
        data={onboardingSteps}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(newIndex);
        }}
      />
      <View style={styles.dotsContainer}>
        {onboardingSteps.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex ? styles.activeDot : null,
            ]}
          />
        ))}
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, currentIndex === 0 ? styles.disabledButton : null]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <Text style={styles.buttonText}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentIndex === onboardingSteps.length - 1 ? "Get Started" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
  },
  slide: {
    width,
    alignItems: 'center',
    padding: '5%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    textAlign: 'center',
    marginBottom: '5%',
  },
  description: {
    fontSize: 18,
    color: colorScheme === 'dark' ? '#EEE' : '#666',
    textAlign: 'center',
    marginBottom: '5%',
  },
  image: {
    resizeMode: 'contain',
    marginBottom: '5%',
  },
  bottomDescription: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#EEE' : '#666',
    textAlign: 'center',
    marginBottom: '5%',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '5%',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colorScheme === 'dark' ? '#444' : '#CCC',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: colorScheme === 'dark' ? '#FFF' : '#000',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: '5%',
    marginBottom: '5%',
  },
  button: {
    backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
    borderRadius: 90,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '45%',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;