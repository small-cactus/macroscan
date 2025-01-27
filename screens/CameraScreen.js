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
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';

export default function CameraScreen() {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [flash, setFlash] = useState('off');
  const [zoom, setZoom] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

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
          if (!hasViewedTutorial || DEBUG_ALWAYS_SHOW_TUTORIAL) {
            setShowTutorial(true);
          }
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

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <BlurView intensity={50} style={StyleSheet.absoluteFill} />
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}>
          <BlurView intensity={30} style={styles.blurViewButton}>
            <Ionicons name="close" size={40} color="#fff" />
          </BlurView>
        </TouchableOpacity>

        {/* Permissions needed title */}
        <TouchableOpacity style={styles.flashButton} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}>
          <BlurView intensity={30} style={styles.blurViewTitle}>
            <Text style={styles.title}>Permissions needed</Text>
          </BlurView>
        </TouchableOpacity>

        <View style={styles.permissionContent}>
          <Text style={styles.permissionDescription}>
            We need your permission to use the camera.
          </Text>
          <Text style={styles.permissionDescription}>
            If this button doesn't do anything, go into your iPhone's settings, scroll down and find MacroScan in Apps at the bottom, and toggle on Camera permissions.
          </Text>
          <TouchableOpacity
            style={styles.tutorialCloseButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              requestPermission();
            }}
          >
            <Text style={styles.tutorialCloseButtonText}>Grant Permission</Text>
          </TouchableOpacity>
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

  // Easter egg to re-show tutorial
  const secret = () => {
    setShowTutorial(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
      setTimeout(() => {
        // If there's valid productData, we pass that along, else pass null
        navigation.navigate('Home', {
          imageUri,
          barcodeData: productData || null,
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
                <Text style={styles.title}>Welcome to Photo Mode</Text>
              </BlurView>
            </View>
            <View style={styles.tutorialStepsContainer}>
              <Animated.View style={[styles.tutorialStep, { opacity: tutorialStepAnims[0] }]}>
                <View style={styles.tutorialIcon}>
                  <BlurView intensity={50} style={styles.blurViewButton}>
                    <Ionicons name="scan" size={50} color="#fff" />
                  </BlurView>
                </View>
                <Text style={styles.tutorialText}>
                  Tap the scan button to capture your meal.
                </Text>
              </Animated.View>
              <Animated.View style={[styles.tutorialStep, { opacity: tutorialStepAnims[1] }]}>
                <View style={styles.tutorialIcon}>
                  <BlurView intensity={50} style={styles.blurViewButton}>
                    <Ionicons name="move" size={50} color="#fff" />
                  </BlurView>
                </View>
                <Text style={styles.tutorialText}>
                  Use pinch gestures to zoom in and out.
                </Text>
              </Animated.View>
              <Animated.View style={[styles.tutorialStep, { opacity: tutorialStepAnims[2] }]}>
                <View style={styles.tutorialIcon}>
                  <BlurView intensity={50} style={styles.blurViewButton}>
                    <Ionicons name="barcode-outline" size={50} color="#fff" />
                  </BlurView>
                </View>
                <Text style={styles.tutorialText}>
                  Barcodes are automatically detected and used to improve your meal scans.
                </Text>
              </Animated.View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.tutorialCloseButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              dismissTutorial();
            }}
          >
            <Text style={styles.tutorialCloseButtonText}>Got it!</Text>
          </TouchableOpacity>
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

            {/* Example "secret" button re-using flashButton style */}
            <TouchableOpacity style={styles.flashButton} onPress={secret}>
              <BlurView intensity={30} style={styles.blurViewTitle}>
                <Text style={styles.title}>Photo Mode</Text>
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

// --------------------- Styles ---------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    fontWeight: '400',
    color: '#eee',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#a9a9a9',
    fontWeight: '500',
    fontSize: 16,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 70,
    zIndex: 5,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#555',
  },
  flashButton: {
    position: 'absolute',
    left: 20,
    top: 70,
    zIndex: 5,
    overflow: 'hidden',
  },
  blurViewButton: {
    borderRadius: 25,
    padding: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconBlur: {
    borderRadius: 25,
    padding: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  blurViewTitle: {
    borderRadius: 20,
    padding: 13.5,
    paddingHorizontal: 18,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  blurViewDescription: {
    borderRadius: 20,
    padding: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#555',
  },
  blurView: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    borderWidth: 0,
    borderColor: '#555',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
    zIndex: 5,
  },
  button: {
    borderRadius: 30,
    marginBottom: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#555',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    zIndex: 6,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  checkmarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  screenBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 7,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tutorialOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
    padding: 20,
  },
  tutorialContent: {
    width: '100%',
  },
  tutorialTitleContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  tutorialStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 35,
  },
  tutorialIcon: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tutorialText: {
    color: '#eee',
    fontWeight: '400',
    textAlign: 'left',
    fontSize: 18,
    marginLeft: 15,
    flexShrink: 1,
  },
  tutorialCloseButton: {
    marginTop: 20,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  tutorialCloseButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  blurViewTitleTutorial: {
    borderRadius: 20,
    padding: 13.5,
    paddingHorizontal: 18,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 50,
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  permissionDescription: {
    fontSize: 18,
    fontWeight: '400',
    color: '#eee',
    textAlign: 'center',
    marginBottom: 50,
    paddingHorizontal: 20,
  },
  barcodeIconContainer: {
    position: 'absolute',
    top: 130,
    right: 20,
    zIndex: 10,
    borderRadius: 40,
    overflow: 'hidden',
  },
  barcodeBoundingBox: {},
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: 'transparent',
    borderColor: 'yellow',
    minWidth: 20,
    minHeight: 20,
  },
  topLeftCorner: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 10,
    marginRight: 20,
    marginBottom: 20,
  },
  topRightCorner: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 10,
    marginLeft: 20,
    marginBottom: 20,
  },
  bottomLeftCorner: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 10,
    marginRight: 20,
    marginTop: 20,
  },
  bottomRightCorner: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 10,
    marginLeft: 20,
    marginTop: 20,
  },
  frontPromptOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 6,
  },
  frontPromptText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 32,
  },
});