import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  PanResponder,
  Animated,
  Image,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ViewShot from 'react-native-view-shot';
import Svg, { Polyline } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getModel } from './providers/models';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 0;
const SAFE_AREA_PADDING = Platform.OS === 'ios' ? 44 : STATUS_BAR_HEIGHT;

const FoodSelectionModal = ({
  visible,
  imageUri,
  onClose,
  onSubmit,
  colorScheme = 'light',
  selectedMode,
}) => {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [bakedImageUri, setBakedImageUri] = useState(imageUri);
  const [currentPath, setCurrentPath] = useState([]);
  const [isLargeImage, setIsLargeImage] = useState(false);
  const [userHasDrawn, setUserHasDrawn] = useState(false);
  const viewShotRef = useRef(null);
  
  const handleClearDrawing = () => {
    setCurrentPath([]);
    setBakedImageUri(imageUri);
    setUserHasDrawn(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrentPath([{ x: locationX, y: locationY }]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrentPath(prev => {
          const newPath = [...prev, { x: locationX, y: locationY }];
          if (newPath.length > 1) {
            setUserHasDrawn(true);
          }
          return newPath;
        });
      },
      onPanResponderRelease: async () => {
        try {
          if (viewShotRef.current) {
            const uri = await viewShotRef.current.capture({
              format: "jpg",
              quality: 0.9,
              result: "tmpfile"
            });
            setBakedImageUri(uri);
            setCurrentPath([]);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        } catch (error) {
          console.error('Error baking drawing:', error);
        }
      },
    })
  ).current;

  useEffect(() => {
    if (imageUri && visible) {
      Image.getSize(imageUri, (width, height) => {
        const screenRatio = (SCREEN_WIDTH * 0.95) / (SCREEN_HEIGHT - SAFE_AREA_PADDING * 2);
        const imageRatio = width / height;
        let newWidth, newHeight;

        if (imageRatio > screenRatio) {
          // Limit width to 90% of screen width
          newWidth = SCREEN_WIDTH * 0.95;
          newHeight = newWidth / imageRatio;
          setIsLargeImage(newHeight < SCREEN_HEIGHT * 0.7);
        } else {
          // Limit height to 80% of available height
          newHeight = (SCREEN_HEIGHT - SAFE_AREA_PADDING * 2) * 0.8;
          newWidth = newHeight * imageRatio;
          setIsLargeImage(true);
        }

        setImageSize({ width: newWidth, height: newHeight });
        setBakedImageUri(imageUri);
      });
    }
  }, [imageUri, visible]);

  const handleSubmit = async () => {
    try {
      if (viewShotRef.current) {
        const hasDrawing = userHasDrawn;
        console.log('User has drawn:', hasDrawing);
        
        let complexModel = null;
        
        // Only switch models if user has actually drawn something
        if (hasDrawing) {
          // First store current model before switching to complex
          const currentModel = await AsyncStorage.getItem('selectedModel');
          console.log('Previous model:', currentModel);
          
          if (currentModel !== null) {
            await AsyncStorage.setItem('previousModel', currentModel);
          } else {
            await AsyncStorage.removeItem('previousModel');
          }
          
          // Get the provider and use getModel to get the complex model
          const provider = await AsyncStorage.getItem('@selected_provider') || 'anthropic';
          complexModel = getModel(provider, { 
            selectedMode, 
            hasDrawing: true 
          });
          await AsyncStorage.setItem('selectedModel', complexModel);
          
          console.log('Switched to model:', complexModel);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const uri = await viewShotRef.current.capture({
          format: "jpg",
          quality: 0.9,
          result: "tmpfile"
        });
        
        const response = await fetch(uri);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64data = reader.result;
            console.log('Base64 data starts with:', base64data.substring(0, 50));
            // Only pass hasDrawing as true if user actually drew something
            onSubmit(base64data, hasDrawing);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <BlurView
          intensity={90}
          style={StyleSheet.absoluteFill}
          tint={colorScheme}
        />
        
        <View style={styles.contentContainer}>
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'jpg', quality: 0.9 }}
            style={[styles.imageContainer, { width: imageSize.width, height: imageSize.height }]}
          >
            <Image
              source={{ uri: bakedImageUri }}
              style={[styles.image, { width: imageSize.width, height: imageSize.height }]}
              resizeMode="contain"
            />
            <View
              {...panResponder.panHandlers}
              style={[StyleSheet.absoluteFill, styles.drawingContainer]}
            >
              <Svg style={{ flex: 1 }}>
                {currentPath.length > 1 && (
                  <>
                    <Polyline
                      points={currentPath.map(pt => `${pt.x},${pt.y}`).join(' ')}
                      fill="none"
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth={11}
                      strokeLinecap="round"
                    />
                    <Polyline
                      points={currentPath.map(pt => `${pt.x},${pt.y}`).join(' ')}
                      fill="none"
                      stroke="#FFF"
                      strokeWidth={8}
                      strokeLinecap="round"
                    />
                  </>
                )}
              </Svg>
            </View>
          </ViewShot>
        </View>

        {/* Floating Controls */}
        <View style={[
          styles.floatingControls,
          isLargeImage ? styles.floatingControlsOverlay : styles.floatingControlsBottom
        ]}>
          <BlurView intensity={30} tint={colorScheme} style={styles.controlsBlur}>
            <View style={styles.controlsContent}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onClose}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={colorScheme === 'dark' ? '#FFF' : '#000'}
                />
              </TouchableOpacity>

              <View style={styles.controlsMiddle}>
                <Text style={[styles.headerTitle, { color: colorScheme === 'dark' ? '#FFF' : '#000' }]}>
                  Select Food
                </Text>
                <TouchableOpacity onPress={handleClearDrawing} style={styles.clearButton}>
                  <Text style={[styles.clearButtonText, { color: colorScheme === 'dark' ? '#FFF' : '#000' }]}>
                    Clear Drawing
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleSubmit}
              >
                <Ionicons
                  name="checkmark"
                  size={24}
                  color={colorScheme === 'dark' ? '#FFF' : '#000'}
                />
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>

        <View style={[
          styles.instructions,
          isLargeImage ? styles.instructionsOverlay : styles.instructionsBottom,
        ]}>
          <BlurView intensity={30} tint={colorScheme} style={styles.controlsBlur}>
            <View style={styles.instructionsContent}>
              <Text style={[styles.instructionsText, { color: colorScheme === 'dark' ? '#FFF' : '#000' }]}>
                Draw around the food item you want to scan
              </Text>
            </View>
          </BlurView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 30,
  },
  image: {
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  drawingContainer: {
    backgroundColor: 'transparent',
  },
  floatingControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  floatingControlsOverlay: {
    top: SAFE_AREA_PADDING + 20,
  },
  floatingControlsBottom: {
    bottom: SAFE_AREA_PADDING,
  },
  controlsBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  controlsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  controlsMiddle: {
    flex: 1,
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  instructions: {
    position: 'absolute',
    left: 16,
    right: 16,
    textAlign: 'center',
    fontSize: 14,
    overflow: 'hidden',
  },
  instructionsOverlay: {
    bottom: SAFE_AREA_PADDING + 20,
  },
  instructionsBottom: {
    bottom: SAFE_AREA_PADDING + 80,
  },
  instructionsContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  instructionsText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default FoodSelectionModal; 