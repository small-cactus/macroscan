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
  // UNCOMMENT THIS FOR PRODUCTION USE
// import Superwall from "@superwall/react-native-superwall"

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
      title: "Start Your Journey",
      description: "Get ready to jumpstart your health with MacroScan",
      imageStyle: { width: width * 0.9, height: height * 0.9 },
      features: [
        { title: "Daily scan count", description: "All users start with unlimited scans" },
        { title: "Snap a photo, or choose one", description: "Capture any food, store bought or homemade" },
        { title: "Instant results like magic", description: "Nutrients appear instantly on demand" },
        { title: "Track Daily", description: "Monitor your intake with Insights" },
        { title: "Smart Coach", description: "Get tailored AI-driven dietary advice" }
      ]
    },
    {
      title: "Capture an image",
      description: "You'll see buttons like this on the home page. They'll say Take photo or Choose from gallery.",
      imageLight: require('../assets/camera-light.jpg'),
      imageDark: require('../assets/camera-dark.jpg'),
      imageStyle: { width: width * 0.9, height: height * 0.15 },
      bottomDescription: "When on the homescreen, click them to submit a meal to be scanned by our advanced AI system",
    },
    {
      title: "Get Instant Results",
      description: "Receive detailed macro and micronutrient information.",
      imageLight: require('../assets/resultImage-light.jpg'),
      imageDark: require('../assets/resultImage-dark.jpg'),
      imageStyle: { width: width * 0.9, height: height * 0.55 },
      bottomDescription: "Don't bother writing it down either, it get's saved automatically",
    },
    {
      title: "Fix Your Results",
  description: "You can always fix your results.",
  imageLight: require('../assets/fixScan-light.jpg'),
  imageDark: require('../assets/fixScan-dark.jpg'),
  imageStyle: { width: width * 0.6, height: height * 0.15 },
  bottomDescription: "Just tap the X and write the name of the food, or anything else.",
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
  // // UNCOMMENT THIS FOR PRODUCTION USE
  // const showPaywall = () => {
  //   Superwall.shared.register('onboardingV2').then(() => {
  //     navigateHome();
  //   });
  // };

  // COMMENT THIS FOR PRODUCTION USE
  const showPaywall = () => {
      navigateHome();
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
        {item.features && (
          <View style={styles.featuresContainer}>
            {item.features.map((feature, idx) => (
              <View key={idx} style={styles.featureItem}>
                <View style={styles.featureNumberContainer}>
                  <Text style={styles.featureNumber}>{idx + 1}</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
    width: width, // Slightly smaller to account for padding
    height: height, // Adjust height as needed
    resizeMode: 'contain',
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
  featuresContainer: {
    width: '100%',
    marginTop: '10%',
    marginBottom: '5%',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '3%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: '5%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureNumberContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: colorScheme === 'dark' ? '#444' : '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  featureNumber: {
    fontSize: 25,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 19,
    fontWeight: '500',
    color: colorScheme === 'dark' ? '#FFF' : '#000',
  },
  featureDescription: {
    fontSize: 15,
    color: colorScheme === 'dark' ? '#CCC' : '#333',
    marginTop: 2,
  },
});

export default OnboardingScreen;