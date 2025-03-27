import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Animated, 
  useColorScheme,
  Dimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const ImageUploader = ({ 
  selectedImage, 
  onSelectImage, 
  onTakePhoto, 
  onRemoveImage 
}) => {
  const colorScheme = useColorScheme();
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(0.9)).current;
  const buttonScale1 = useRef(new Animated.Value(1)).current;
  const buttonScale2 = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (selectedImage) {
      Animated.parallel([
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(imageScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
    } else {
      // Reset animation values when image is removed
      imageOpacity.setValue(0);
      imageScale.setValue(0.9);
    }
  }, [selectedImage]);

  const handleRemoveImage = () => {
    Animated.parallel([
      Animated.timing(imageOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(imageScale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      onRemoveImage();
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
  };

  const handleButtonPress = (button, callback) => {
    const buttonScale = button === 1 ? buttonScale1 : buttonScale2;
    
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    callback();
  };

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colorScheme === 'dark' ? 0.2 : 0.1,
        shadowRadius: 8,
        elevation: 3
      }
    ]}>
      <Text style={[
        styles.title,
        { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }
      ]}>
        Food Image
      </Text>
      
      <View style={styles.imageContainer}>
        {selectedImage ? (
          <Animated.View 
            style={[
              styles.selectedImageWrapper,
              { 
                opacity: imageOpacity,
                transform: [{ scale: imageScale }]
              }
            ]}
          >
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.selectedImage} 
              resizeMode="cover"
            />
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={handleRemoveImage}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={28} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.imageOverlay}>
              <Ionicons name="checkmark-circle" size={36} color="#3b82f6" />
            </View>
          </Animated.View>
        ) : (
          <View style={[
            styles.placeholderContainer,
            { borderColor: colorScheme === 'dark' ? '#333333' : '#dddddd' }
          ]}>
            <Ionicons 
              name="fast-food-outline" 
              size={64} 
              style={{ color: colorScheme === 'dark' ? '#444444' : '#dddddd' }} 
            />
            <Text style={[
              styles.placeholderText,
              { color: colorScheme === 'dark' ? '#aaaaaa' : '#888888' }
            ]}>
              Take a photo of your food
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.buttonsContainer}>
        <Animated.View style={{ transform: [{ scale: buttonScale1 }] }}>
          <TouchableOpacity 
            style={[
              styles.button,
              { backgroundColor: colorScheme === 'dark' ? '#333333' : '#eeeeee' }
            ]} 
            onPress={() => handleButtonPress(1, onTakePhoto)}
            activeOpacity={0.7}
          >
            <View style={styles.buttonIconContainer}>
              <Ionicons 
                name="camera-outline" 
                size={22} 
                style={{ color: '#3b82f6' }} 
              />
            </View>
            <Text style={[
              styles.buttonText,
              { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }
            ]}>
              Take Photo
            </Text>
          </TouchableOpacity>
        </Animated.View>
        
        <Animated.View style={{ transform: [{ scale: buttonScale2 }] }}>
          <TouchableOpacity 
            style={[
              styles.button,
              { backgroundColor: colorScheme === 'dark' ? '#333333' : '#eeeeee' }
            ]} 
            onPress={() => handleButtonPress(2, onSelectImage)}
            activeOpacity={0.7}
          >
            <View style={styles.buttonIconContainer}>
              <Ionicons 
                name="image-outline" 
                size={22} 
                style={{ color: '#3b82f6' }} 
              />
            </View>
            <Text style={[
              styles.buttonText,
              { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }
            ]}>
              Choose Image
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginTop: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  imageContainer: {
    width: '100%',
    height: 250,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  selectedImageWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 4,
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    width: width * 0.4,
  },
  buttonIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  }
});

export default ImageUploader; 