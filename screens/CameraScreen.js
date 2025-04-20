import React, { useState, useEffect, useRef } from 'react';
import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  ActivityIndicator,
  AppState,
  Alert,
  Dimensions,
  useColorScheme,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import { getModel } from './providers/models';
import { Svg, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Add these constants
const MODE_LABELS = {
  fast: 'Fast Mode',
  accurate: 'Accurate Mode',
  search: 'Deep Search',
};

export default function CameraScreen() {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [flash, setFlash] = useState('off');
  const [zoom, setZoom] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHelpText, setShowHelpText] = useState(false);
  const helpTextAnim = useRef(new Animated.Value(0)).current;
  const [selectedMode, setSelectedMode] = useState('fast');
  const [prevMode, setPrevMode] = useState('fast');
  const chipTextOpacity = useRef(new Animated.Value(1)).current;
  const colorScheme = useColorScheme();

  const DEBUG_ALWAYS_SHOW_TUTORIAL = false;

  // Animations for the general UI
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadingTextAnim = useRef(new Animated.Value(0)).current;
  const scanTextAnim = useRef(new Animated.Value(0.5)).current;
  const scanBlurOpacityAnim = useRef(new Animated.Value(0)).current;
  const blurOpacityAnim = useRef(new Animated.Value(0)).current;
  const checkmarkOpacityAnim = useRef(new Animated.Value(0)).current;
  const screenBlurOpacityAnim = useRef(new Animated.Value(0)).current;
  const tutorialOpacityAnim = useRef(new Animated.Value(0)).current;

  // Tutorial step animations
  const tutorialStepAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // References
  const cameraRef = useRef(null);
  const pinchRef = useRef();
  const baseZoom = useRef(zoom);
  const loadingAnimationRef = useRef(null);

  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [appState, setAppState] = useState(AppState.currentState);

  const [isBlurring, setIsBlurring] = useState(false);

  // -------------------- BARCODE TRACKING --------------------
  const [isBarcodeInFrame, setIsBarcodeInFrame] = useState(false);
  const [barcodeData, setBarcodeData] = useState(null);
  const [lastBarcodeTime, setLastBarcodeTime] = useState(Date.now());

  // Animated values for bounding box transitions
  const animX = useRef(new Animated.Value(0)).current;
  const animY = useRef(new Animated.Value(0)).current;
  const animWidth = useRef(new Animated.Value(0)).current;
  const animHeight = useRef(new Animated.Value(0)).current;
  const animRotation = useRef(new Animated.Value(0)).current;
  const boundingBoxOpacity = useRef(new Animated.Value(0)).current;
  const boundingBoxScale = useRef(new Animated.Value(1)).current;

  // Add this constant near the top of the file with other constants
  const MIN_CORNER_SPACING = 15; // Minimum pixels between corners

  // Update the animateBoundingBox function
  const animateBoundingBox = (x, y, width, height, rotation) => {
    // Ensure minimum size for the bounding box
    const adjustedWidth = Math.max(width, MIN_CORNER_SPACING * 2);
    const adjustedHeight = Math.max(height, MIN_CORNER_SPACING * 2);
    
    // Adjust position to maintain center if size was increased
    const xOffset = (adjustedWidth - width) / 2;
    const yOffset = (adjustedHeight - height) / 2;
    const adjustedX = x - xOffset;
    const adjustedY = y - yOffset;

    Animated.parallel([
      Animated.timing(animX, {
        toValue: adjustedX,
        duration: 50,
        useNativeDriver: false,
      }),
      Animated.timing(animY, {
        toValue: adjustedY,
        duration: 50,
        useNativeDriver: false,
      }),
      Animated.timing(animWidth, {
        toValue: adjustedWidth,
        duration: 70,
        useNativeDriver: false,
      }),
      Animated.timing(animHeight, {
        toValue: adjustedHeight,
        duration: 70,
        useNativeDriver: false,
      }),
      Animated.timing(animRotation, {
        toValue: rotation,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Called on each barcode
  const handleBarcodeScanned = ({ data, bounds }) => {
    if (data && bounds?.origin && bounds?.size) {
      setIsBarcodeInFrame(true);
      setBarcodeData(data);
      setLastBarcodeTime(Date.now());

      const rotation = bounds?.rotation || 0;
      animateBoundingBox(
        bounds.origin.x,
        bounds.origin.y,
        bounds.size.width,
        bounds.size.height,
        rotation
      );

      // If bounding box was invisible, animate it in
      if (boundingBoxOpacity._value === 0) {
        boundingBoxScale.setValue(1.4);
        boundingBoxOpacity.setValue(0);

        Animated.parallel([
          Animated.timing(boundingBoxScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(boundingBoxOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
      }
    }
  };

  // Periodically check if the barcode was lost
  useEffect(() => {
    const interval = setInterval(() => {
      if (isBarcodeInFrame && Date.now() - lastBarcodeTime > 200) {
        // Fade out bounding box
        Animated.timing(boundingBoxOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          setIsBarcodeInFrame(false);
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isBarcodeInFrame, lastBarcodeTime, boundingBoxOpacity]);

  // Listen for AppState changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      setAppState(nextAppState);
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  // Check tutorial after camera is ready
  useEffect(() => {
    if (isCameraReady) {
      const checkTutorial = async () => {
        try {
          const hasViewedTutorial = await AsyncStorage.getItem('hasViewedTutorial');
          // if (!hasViewedTutorial || DEBUG_ALWAYS_SHOW_TUTORIAL) {
          //   setShowTutorial(true);
          // }
          // Tutorial is now always disabled
        } catch (error) {
          console.error('Error checking tutorial status:', error);
        }
      };
      checkTutorial();
    }
  }, [isCameraReady]);

  const dismissTutorial = async () => {
    try {
      await AsyncStorage.setItem('hasViewedTutorial', 'true');
    } catch (error) {
      console.error('Error setting tutorial status:', error);
    }

    // Fade out tutorial
    Animated.timing(tutorialOpacityAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setShowTutorial(false);
      tutorialOpacityAnim.setValue(0);
      tutorialStepAnims.forEach((anim) => anim.setValue(0));
    });
  };

  // Camera Active check
  const isActive = isFocused && appState === 'active';

  // Animate camera preview in
  useEffect(() => {
    if (permission?.granted && isCameraReady) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      const scanFadeTimeout = setTimeout(() => {
        Animated.timing(scanBlurOpacityAnim, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: true,
        }).start();
      }, 1000);

      return () => clearTimeout(scanFadeTimeout);
    }
  }, [permission, isCameraReady, fadeAnim, scanBlurOpacityAnim]);

  // Loading animation
  useEffect(() => {
    if (!isCameraReady) {
      loadingAnimationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(loadingTextAnim, {
            toValue: 1,
            duration: 1300,
            useNativeDriver: true,
          }),
          Animated.timing(loadingTextAnim, {
            toValue: 0,
            duration: 1300,
            useNativeDriver: true,
          }),
        ])
      );
      loadingAnimationRef.current.start();
    } else {
      if (loadingAnimationRef.current) {
        loadingAnimationRef.current.stop();
        loadingAnimationRef.current = null;
      }
    }

    return () => {
      if (loadingAnimationRef.current) {
        loadingAnimationRef.current.stop();
      }
    };
  }, [isCameraReady, loadingTextAnim]);

  // Scan text pulsing
  useEffect(() => {
    const scanTextLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanTextAnim, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.timing(scanTextAnim, {
          toValue: 0.3,
          duration: 1300,
          useNativeDriver: true,
        }),
      ])
    );
    scanTextLoop.start();

    return () => {
      scanTextLoop.stop();
    };
  }, [scanTextAnim]);

  // Blur overlay if screen is not active
  useEffect(() => {
    if (!isActive) {
      Animated.timing(screenBlurOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(screenBlurOpacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, screenBlurOpacityAnim]);

  // Tutorial animations
  useEffect(() => {
    if (showTutorial) {
      Animated.timing(tutorialOpacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      tutorialStepAnims.forEach((anim, index) => {
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          delay: index * 800,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [showTutorial, tutorialOpacityAnim, tutorialStepAnims]);

  // Add new state near the top of the component with other state declarations
  const [needsFrontImage, setNeedsFrontImage] = useState(false);
  const [scannedBarcodeData, setScannedBarcodeData] = useState(null);

  // Add this state near other state declarations
  const [isShowingFrontPrompt, setIsShowingFrontPrompt] = useState(false);
  const [frontPromptAnim] = useState(new Animated.Value(0));

  // Add this effect after the other useEffect hooks
  useEffect(() => {
    const loadSelectedMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('selectedMode');
        if (savedMode) {
          setSelectedMode(savedMode);
          setPrevMode(savedMode);
        }
      } catch (error) {
        console.error('Error loading selected mode:', error);
      }
    };
    loadSelectedMode();
  }, []);

  // Add this near the top with other state declarations
  const [useComplexProcessing, setUseComplexProcessing] = useState(false);

  // Add this effect to load the complex processing setting
  useEffect(() => {
    const loadComplexProcessing = async () => {
      try {
        const complexSetting = await AsyncStorage.getItem('useComplexProcessing');
        setUseComplexProcessing(complexSetting === 'true');
      } catch (error) {
        console.error('Error loading complex processing setting:', error);
      }
    };
    loadComplexProcessing();
  }, []);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <BlurView intensity={90} style={StyleSheet.absoluteFill} tint="dark" />
        
        {/* Modern Permission Content */}
        <View style={styles.permissionContent}>
          <View style={styles.permissionIconContainer}>
            <BlurView intensity={30} style={styles.permissionIconBlur}>
              <Ionicons name="camera" size={60} color="#fff" />
            </BlurView>
          </View>

          <Text style={styles.permissionTitle}>
            Camera Access Needed
          </Text>
          
          <Text style={styles.permissionDescription}>
            To scan your food and track nutrition, we need permission to use your camera. Your privacy is important to us - photos are only used for food recognition.
          </Text>

          <View style={styles.permissionButtonsContainer}>
            <TouchableOpacity
              style={styles.primaryPermissionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                requestPermission();
                setShowHelpText(true);
                Animated.timing(helpTextAnim, {
                  toValue: 1,
                  duration: 500,
                  useNativeDriver: true,
                }).start();
              }}
            >
              <Text style={styles.primaryPermissionButtonText}>Allow Camera Access</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryPermissionButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryPermissionButtonText}>Not Now</Text>
            </TouchableOpacity>
          </View>

          <Animated.Text style={[styles.helpText, { opacity: helpTextAnim }]}>
            If the button doesn't work, please enable camera access in your iPhone Settings
          </Animated.Text>
        </View>
      </View>
    );
  }

  const onCameraReady = () => {
    setIsCameraReady(true);
  };

  // Helper to snap a picture
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const data = await cameraRef.current.takePictureAsync();
        console.log('Captured image URI:', data.uri);
        return data.uri;
      } catch (error) {
        console.error('Error taking picture:', error);
        return null;
      }
    }
    return null;
  };

  // Add this function before the secret function
  const crossfadeChipText = (newMode) => {
    Animated.timing(chipTextOpacity, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      setPrevMode(selectedMode);
      setSelectedMode(newMode);

      Animated.timing(chipTextOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleModePress = async () => {
    const currentMode = selectedMode;
    const otherModes = Object.keys(MODE_LABELS).filter(mode => mode !== currentMode);

    Alert.alert(
      'Scan Mode',
      `Currently using ${MODE_LABELS[currentMode]}.\n\n` +
      (currentMode === 'fast' 
        ? 'Fast Mode provides quick results and is great for packaged foods.'
        : currentMode === 'accurate'
          ? 'Accurate Mode uses detailed analysis and is best for complex meals.'
          : 'Deep Search uses web search for enhanced results (Beta).'),
      [
        { text: 'Cancel', style: 'cancel' },
        ...otherModes.map(mode => ({
          text: `Switch to ${MODE_LABELS[mode]}`,
          onPress: async () => {
            if (mode === 'accurate' || mode === 'search') {
              // Example: Check if user has premium access for accurate/search modes
              // const hasPremium = await checkPremiumStatus(); // Replace with actual check
              // if (!hasPremium) {
              //   Alert.alert('Premium Feature', `${MODE_LABELS[mode]} requires a premium subscription.`);
              //   return;
              // }
            }
            
            await AsyncStorage.setItem('selectedMode', mode);
            crossfadeChipText(mode);
            Haptics.selectionAsync();
          }
        }))
      ]
    );
  };

  // Easter egg to re-show tutorial
  const secret = () => {
    // setShowTutorial(true);
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Tutorial is now always disabled
  };

  // Just an example zoom toggle
  const toggleZoom = () => {
    setZoom(zoom === 0 ? 0.5 : 0);
    baseZoom.current = zoom === 0 ? 0.5 : 0;
  };

  const haptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  // Single function to handle the entire "capture" step 
  // (including final animations before navigation)
  const performCaptureAnimationsAndNavigate = (imageUri, productData) => {
    setIsBlurring(true);
    Animated.timing(blurOpacityAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    Animated.timing(checkmarkOpacityAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(async () => {
        // Get the current mode and provider
        const provider = await AsyncStorage.getItem('@selected_provider') || 'anthropic';
        
        // Get the appropriate model based on mode and user preference
        const currentModel = getModel(provider, { 
          selectedMode,
          hasDrawing: false
        });
        
        // Navigate with all the necessary data
        navigation.navigate('Home', {
          imageUri,
          barcodeData: productData || null,
          selectedMode,
          provider
        });

        blurOpacityAnim.setValue(0);
        checkmarkOpacityAnim.setValue(0);
        setIsBlurring(false);
      }, 200);
    });
  };

  // Update the handleScanOrCapture function
  const handleScanOrCapture = async () => {
    // Always do haptic feedback when button is pressed
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isBarcodeInFrame && barcodeData && !needsFrontImage) {
      // Store the barcode data and set flag to capture front image
      setScannedBarcodeData(null); // Initially null until API responds
      setNeedsFrontImage(true);
      
      // Show the front prompt animation
      setIsShowingFrontPrompt(true);
      Animated.sequence([
        Animated.timing(frontPromptAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(frontPromptAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        setIsShowingFrontPrompt(false);
      });

      // Start API fetch in background
      let attempts = 0;
      const fetchProductData = async () => {
        try {
          const response = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${barcodeData}.json`,
            {
              headers: {
                'User-Agent': 'MacroScan - iOS - Version 1.0 - https://macroscan.example.com',
              },
            }
          );
          const data = await response.json();

          if (data.status === 1 && data.product) {
            const product = data.product;
            const productData = {
              barcode: barcodeData,
              name: product.product_name || 'Unknown Product',
              calories: product.nutriments['energy-kcal'] || product.nutriments['energy-kcal_100g'] || 'Unknown',
              protein: product.nutriments['proteins'] || product.nutriments['proteins_100g'] || 'Unknown',
              carbs: product.nutriments['carbohydrates'] || product.nutriments['carbohydrates_100g'] || 'Unknown',
              fat: product.nutriments['fat'] || product.nutriments['fat_100g'] || 'Unknown',
              sodium: product.nutriments['sodium'] || product.nutriments['sodium_100g'] || 'Unknown',
            };
            setScannedBarcodeData(productData);
          } else if (attempts < 1) {
            // Try one more time
            attempts++;
            setTimeout(fetchProductData, 1000);
          }
        } catch (error) {
          console.error('Error fetching product data:', error);
          if (attempts < 1) {
            attempts++;
            setTimeout(fetchProductData, 1000);
          }
        }
      };

      fetchProductData();
      
    } else if (needsFrontImage) {
      // Capturing front image after barcode scan
      const imageUri = await takePicture();
      if (imageUri) {
        performCaptureAnimationsAndNavigate(imageUri, scannedBarcodeData);
        setNeedsFrontImage(false);
        setScannedBarcodeData(null);
      }
    } else {
      // No barcode, just capture
      const imageUri = await takePicture();
      if (imageUri) {
        performCaptureAnimationsAndNavigate(imageUri, null);
      }
    }
  };

  // Pinch gesture for zoom
  const onPinchEvent = (event) => {
    if (
      event.nativeEvent.state === State.ACTIVE ||
      event.nativeEvent.state === State.END
    ) {
      const scale = event.nativeEvent.scale;
      let newZoom = baseZoom.current + (scale - 1) * 0.0005;
      newZoom = Math.max(0, Math.min(newZoom, 1));
      setZoom(newZoom);
      baseZoom.current = newZoom;
    }
  };

  // Style for bounding box
  const boundingBoxStyle = {
    position: 'absolute',
    zIndex: 10,
    width: animWidth,
    height: animHeight,
    opacity: boundingBoxOpacity,
    transform: [
      { translateX: animX },
      { translateY: animY },
      { scale: boundingBoxScale },
      {
        rotate: animRotation.interpolate({
          inputRange: [0, 360],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      {/* Tutorial Overlay */}
      {showTutorial && (
        <Animated.View style={[styles.tutorialOverlay, { opacity: tutorialOpacityAnim }]}>
          <BlurView intensity={50} style={StyleSheet.absoluteFill} />
          <View style={styles.tutorialContent}>
            <View style={styles.tutorialTitleContainer}>
              <BlurView intensity={50} style={styles.blurViewTitleTutorial}>
                <Text style={[styles.title, { fontSize: 28 * scale }]}>Quick Start</Text>
                <Text style={[styles.description, { marginTop: 8 * scale, opacity: 0.8 }]}>
                  Let's get you started with the basics
                </Text>
              </BlurView>
            </View>
            <View style={styles.tutorialStepsContainer}>
              <Animated.View style={[styles.tutorialStep, { opacity: tutorialStepAnims[0] }]}>
                <View style={styles.tutorialIcon}>
                  <Ionicons name="scan" size={32 * scale} color="#fff" />
                </View>
                <Text style={styles.tutorialText}>
                  Point your camera at any food item and tap the scan button
                </Text>
              </Animated.View>
              <Animated.View style={[styles.tutorialStep, { opacity: tutorialStepAnims[1] }]}>
                <View style={styles.tutorialIcon}>
                  <Ionicons name="barcode-outline" size={32 * scale} color="#fff" />
                </View>
                <Text style={styles.tutorialText}>
                  For packaged foods, scan the barcode for instant recognition
                </Text>
              </Animated.View>
              <Animated.View style={[styles.tutorialStep, { opacity: tutorialStepAnims[2] }]}>
                <View style={styles.tutorialIcon}>
                  <Ionicons name="flash" size={32 * scale} color="#fff" />
                </View>
                <Text style={styles.tutorialText}>
                  Switch between Fast and Accurate modes for different types of foods
                </Text>
              </Animated.View>
            </View>
            <TouchableOpacity
              style={styles.tutorialCloseButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                dismissTutorial();
              }}
            >
              <Text style={styles.tutorialCloseButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Screen Blur Overlay (when not active) */}
      <Animated.View
        style={[styles.screenBlurOverlay, { opacity: screenBlurOpacityAnim }]}
        pointerEvents="none"
      >
        <BlurView intensity={90} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Blur Overlay during Capture */}
      <Animated.View
        style={[styles.blurOverlay, { opacity: blurOpacityAnim }]}
        pointerEvents={isBlurring ? 'auto' : 'none'}
      >
        <BlurView intensity={90} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Checkmark Overlay */}
      <Animated.View
        style={[
          styles.checkmarkOverlay,
          { opacity: checkmarkOpacityAnim },
        ]}
        pointerEvents="none"
      >
        <Ionicons name="checkmark-circle" size={100} color="white" />
        <Text style={styles.title}>Meal Captured</Text>
      </Animated.View>

      {/* Loading Screen */}
      {!isCameraReady && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFF" />
          <Animated.Text style={[styles.loadingText, { opacity: loadingTextAnim }]}>
            Loading camera...
          </Animated.Text>
          <TouchableOpacity style={styles.closeButton} onPress={haptic}>
            <BlurView intensity={30} style={styles.blurViewButton}>
              <Ionicons name="close" size={40} color="#fff" />
            </BlurView>
          </TouchableOpacity>
          <TouchableOpacity style={styles.flashButton} onPress={haptic}>
            <BlurView intensity={30} style={styles.blurViewTitle}>
              <Text style={styles.title}>Photo Mode</Text>
            </BlurView>
          </TouchableOpacity>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={haptic}>
              <BlurView intensity={30} style={styles.blurView}>
                <Ionicons name="scan" size={50} color="#fff" />
              </BlurView>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Front Image Prompt Overlay */}
      {isShowingFrontPrompt && (
        <Animated.View 
          style={[
            styles.frontPromptOverlay,
            { opacity: frontPromptAnim }
          ]}
        >
          <BlurView intensity={50} style={StyleSheet.absoluteFill} />
          <Text style={styles.frontPromptText}>
            Now capture the front of the item
          </Text>
        </Animated.View>
      )}

      {/* Camera View with Pinch Gesture */}
      <PinchGestureHandler
        onGestureEvent={onPinchEvent}
        onHandlerStateChange={onPinchEvent}
        ref={pinchRef}
        simultaneousHandlers={pinchRef}
      >
        <Animated.View style={[styles.cameraContainer, { opacity: fadeAnim }]}>
          <CameraView
            style={styles.camera}
            facing={facing}
            onCameraReady={onCameraReady}
            ref={cameraRef}
            flash={flash}
            zoom={zoom}
            active={true}
            onBarcodeScanned={isActive ? handleBarcodeScanned : undefined}
            barcodeScannerSettings={{
              barcodeTypes: [
                'ean13',
                'ean8',
                'upc_e',
                'code39',
                'code93',
                'code128',
                'itf14',
                'codabar',
                'datamatrix',
                'pdf417',
                'upc_a',
              ],
            }}
          >
            {/* Fixed scanning frame */}
            <View style={styles.fixedScanFrame}>
              <View style={[styles.fixedCorner, styles.fixedTopLeftCorner]} />
              <View style={[styles.fixedCorner, styles.fixedTopRightCorner]} />
              <View style={[styles.fixedCorner, styles.fixedBottomLeftCorner]} />
              <View style={[styles.fixedCorner, styles.fixedBottomRightCorner]} />
            </View>

            {/* Animated bounding box if a barcode is in frame */}
            {isBarcodeInFrame && (
              <Animated.View style={[styles.barcodeBoundingBox, boundingBoxStyle]} pointerEvents="none">
                <View style={[styles.corner, styles.topLeftCorner]} />
                <View style={[styles.corner, styles.topRightCorner]} />
                <View style={[styles.corner, styles.bottomLeftCorner]} />
                <View style={[styles.corner, styles.bottomRightCorner]} />
              </Animated.View>
            )}

            {/* Barcode icon if a barcode is in frame */}
            {isBarcodeInFrame && (
              <View style={styles.barcodeIconContainer}>
                <BlurView intensity={30} style={styles.iconBlur}>
                  <Ionicons name="barcode-outline" size={40} color="#fff" />
                </BlurView>
              </View>
            )}

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
            >
              <BlurView intensity={30} style={styles.iconBlur}>
                <Ionicons name="close" size={40} color="#fff" />
              </BlurView>
            </TouchableOpacity>

            {/* Mode selection button */}
            <TouchableOpacity style={styles.flashButton} onPress={handleModePress}>
              <BlurView intensity={30} style={[
                styles.blurViewTitle,
                selectedMode === 'accurate' && { backgroundColor: 'rgba(25, 72, 110, 0.3)' }
              ]}>
                <View style={styles.chipContent}>
                  {selectedMode === 'search' ? (
                    <View style={{
                      width: 36 * scale,
                      height: 36 * scale,
                      borderRadius: 12 * scale,
                      marginRight: 8,
                      overflow: 'hidden',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}>
                      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                        <Defs>
                          <RadialGradient id="grad1" cx="25%" cy="25%" r="80%" gradientUnits="userSpaceOnUse">
                            <Stop offset="0%" stopColor="#FFB74D" stopOpacity="1" />
                            <Stop offset="100%" stopColor="#FFB74D" stopOpacity="0" />
                          </RadialGradient>
                          <RadialGradient id="grad2" cx="75%" cy="30%" r="70%" gradientUnits="userSpaceOnUse">
                            <Stop offset="0%" stopColor="#FF5252" stopOpacity="1" />
                            <Stop offset="100%" stopColor="#FF5252" stopOpacity="0" />
                          </RadialGradient>
                          <RadialGradient id="grad3" cx="50%" cy="60%" r="75%" gradientUnits="userSpaceOnUse">
                            <Stop offset="0%" stopColor="#42A5F5" stopOpacity="0.9" />
                            <Stop offset="100%" stopColor="#42A5F5" stopOpacity="0" />
                          </RadialGradient>
                          <RadialGradient id="grad4" cx="65%" cy="75%" r="60%" gradientUnits="userSpaceOnUse">
                            <Stop offset="0%" stopColor="#AB47BC" stopOpacity="0.8" />
                            <Stop offset="100%" stopColor="#AB47BC" stopOpacity="0" />
                          </RadialGradient>
                        </Defs>
                        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad1)" />
                        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad2)" />
                        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad3)" />
                        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad4)" />
                      </Svg>
                      <Ionicons name="search" size={24} color="#fff" style={{ position: 'absolute', zIndex: 1 }} />
                    </View>
                  ) : (
                    <Ionicons 
                      name={
                        selectedMode === 'fast' ? 'flash' : 
                        selectedMode === 'accurate' ? 'shield-checkmark' : 
                        'search'
                      } 
                      size={24} 
                      color="#fff" 
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Animated.Text style={[styles.title, { opacity: chipTextOpacity }]}>
                    {MODE_LABELS[selectedMode]}
                  </Animated.Text>
                </View>
              </BlurView>
            </TouchableOpacity>

            {/* Scan Text and Button */}
            <View style={styles.buttonContainer}>
              <Animated.View style={{ opacity: scanBlurOpacityAnim }}>
                <BlurView intensity={30} style={styles.blurViewDescription}>
                  <Animated.Text style={[styles.description, { opacity: scanTextAnim }]}>
                    Scan a food item to begin
                  </Animated.Text>
                </BlurView>
              </Animated.View>
              <TouchableOpacity style={styles.button} onPress={handleScanOrCapture}>
                <BlurView intensity={30} style={styles.blurView}>
                  <Ionicons name="scan" size={60} color="#fff" />
                </BlurView>
              </TouchableOpacity>
            </View>
          </CameraView>
        </Animated.View>
      </PinchGestureHandler>
    </View>
  );
}

const baseWidth = 430; // iPhone 14 Pro Max width
const baseHeight = 932; // iPhone 14 Pro Max height
const scaleWidth = width / baseWidth;
const scaleHeight = height / baseHeight;
const scale = Math.min(scaleWidth, scaleHeight);

// --------------------- Styles ---------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  title: {
    fontSize: 24 * scale,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 17 * scale,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  loadingText: {
    marginTop: 12 * scale,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    fontSize: 16 * scale,
    letterSpacing: -0.2,
  },
  closeButton: {
    position: 'absolute',
    right: 16 * scale,
    top: 60 * scale,
    zIndex: 5,
    borderRadius: 100 * scale,
    overflow: 'hidden',
  },
  flashButton: {
    position: 'absolute',
    left: 16 * scale,
    top: 60 * scale,
    zIndex: 5,
    overflow: 'hidden',
  },
  blurViewButton: {
    borderRadius: 40 * scale,
    padding: 12 * scale,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(20px)',
  },
  iconBlur: {
    borderRadius: 0 * scale,
    padding: 12 * scale,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(20px)',
  },
  blurViewTitle: {
    borderRadius: 18 * scale,
    padding: 14 * scale,
    paddingHorizontal: 20 * scale,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(20px)',
    borderWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  blurViewDescription: {
    borderRadius: 16 * scale,
    padding: 12 * scale,
    paddingHorizontal: 24 * scale,
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 24 * scale,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(20px)',
    borderWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  blurView: {
    padding: 24 * scale,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
    backdropFilter: 'blur(20px)',
    borderRadius: 0 * scale,
    borderWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40 * scale,
    width: '100%',
    alignItems: 'center',
    zIndex: 5,
  },
  button: {
    borderRadius: 50 * scale,
    marginBottom: 25 * scale,
    overflow: 'hidden',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 6,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  checkmarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  screenBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 7,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  tutorialOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 8,
    padding: 24 * scale,
    paddingBottom: 50 * scale,
  },
  tutorialContent: {
    width: '100%',
    maxWidth: 400 * scale,
  },
  tutorialTitleContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32 * scale,
  },
  tutorialStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16 * scale,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    borderRadius: 20 * scale,
    padding: 16 * scale,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ scale: 1 }],
  },
  tutorialIcon: {
    width: 60 * scale,
    height: 60 * scale,
    borderRadius: 18 * scale,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tutorialText: {
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'left',
    fontSize: 17 * scale,
    marginLeft: 16 * scale,
    flexShrink: 1,
    letterSpacing: -0.3,
    lineHeight: 24 * scale,
  },
  tutorialCloseButton: {
    marginTop: 32 * scale,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16 * scale,
    paddingHorizontal: 32 * scale,
    borderRadius: 20 * scale,
    width: '100%',
    maxWidth: 400 * scale,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 120 * scale,
  },
  tutorialCloseButtonText: {
    color: '#000000',
    fontSize: 17 * scale,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  blurViewTitleTutorial: {
    borderRadius: 20 * scale,
    padding: 20 * scale,
    paddingHorizontal: 32 * scale,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 32 * scale,
    width: '100%',
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32 * scale,
    paddingBottom: 40 * scale,
  },
  permissionIconContainer: {
    marginBottom: 32 * scale,
    borderRadius: 30 * scale,
    overflow: 'hidden',
  },
  permissionIconBlur: {
    padding: 24 * scale,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  permissionTitle: {
    fontSize: 28 * scale,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16 * scale,
    letterSpacing: -0.5,
  },
  permissionDescription: {
    fontSize: 17 * scale,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 32 * scale,
    lineHeight: 24 * scale,
    letterSpacing: -0.2,
  },
  permissionButtonsContainer: {
    width: '100%',
    gap: 12 * scale,
    marginBottom: 24 * scale,
  },
  primaryPermissionButton: {
    backgroundColor: '#fff',
    paddingVertical: 16 * scale,
    paddingHorizontal: 20 * scale,
    borderRadius: 16 * scale,
    alignItems: 'center',
  },
  primaryPermissionButtonText: {
    color: '#000',
    fontSize: 17 * scale,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  secondaryPermissionButton: {
    paddingVertical: 16 * scale,
    paddingHorizontal: 20 * scale,
    borderRadius: 16 * scale,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryPermissionButtonText: {
    color: '#fff',
    fontSize: 17 * scale,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  helpText: {
    fontSize: 15 * scale,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    paddingHorizontal: 24 * scale,
    lineHeight: 20 * scale,
    letterSpacing: -0.2,
  },
  barcodeIconContainer: {
    position: 'absolute',
    top: 150 * scale,
    right: 16 * scale,
    zIndex: 10,
    borderRadius: 40 * scale,
    overflow: 'hidden',
  },
  barcodeBoundingBox: {},
  corner: {
    position: 'absolute',
    width: 20 * scale,
    height: 20 * scale,
    backgroundColor: 'transparent',
    borderColor: 'yellow',
    minWidth: 20 * scale,
    minHeight: 20 * scale,
  },
  topLeftCorner: {
    top: 0,
    left: 0,
    borderTopWidth: 2 * scale,
    borderLeftWidth: 2 * scale,
    borderTopLeftRadius: 10 * scale,
    marginRight: 20 * scale,
    marginBottom: 20 * scale,
  },
  topRightCorner: {
    top: 0,
    right: 0,
    borderTopWidth: 2 * scale,
    borderRightWidth: 2 * scale,
    borderTopRightRadius: 10 * scale,
    marginLeft: 20 * scale,
    marginBottom: 20 * scale,
  },
  bottomLeftCorner: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2 * scale,
    borderLeftWidth: 2 * scale,
    borderBottomLeftRadius: 10 * scale,
    marginRight: 20 * scale,
    marginTop: 20 * scale,
  },
  bottomRightCorner: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2 * scale,
    borderRightWidth: 2 * scale,
    borderBottomRightRadius: 10 * scale,
    marginLeft: 20 * scale,
    marginTop: 20 * scale,
  },
  frontPromptOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  frontPromptText: {
    color: '#fff',
    fontSize: 22 * scale,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 32 * scale,
    lineHeight: 30 * scale,
    letterSpacing: -0.3,
  },
  fixedScanFrame: {
    position: 'absolute',
    width: 280 * scale,
    height: 320 * scale,
    top: '45%',
    left: '50%',
    transform: [
      { translateX: -140 * scale },
      { translateY: -140 * scale }
    ],
    zIndex: 3,
  },
  fixedCorner: {
    position: 'absolute',
    width: 40 * scale,
    height: 40 * scale,
    backgroundColor: 'transparent',
    borderColor: '#FFFFFF',
    borderWidth: 4 * scale,
  },
  fixedTopLeftCorner: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 15 * scale,
  },
  fixedTopRightCorner: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 15 * scale,
  },
  fixedBottomLeftCorner: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 15 * scale,
  },
  fixedBottomRightCorner: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 15 * scale,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});