import React, { useState, useEffect, useRef } from 'react';
import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import {
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  ActivityIndicator,
  Alert,
  AppState,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';

export default function CameraScreen() {
  const [facing, setFacing] = useState('Back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [flashMode, setFlashMode] = useState('off');
  const [zoom, setZoom] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  const DEBUG_ALWAYS_SHOW_TUTORIAL = false;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadingTextAnim = useRef(new Animated.Value(0)).current;
  const scanTextAnim = useRef(new Animated.Value(0.5)).current;
  const scanBlurOpacityAnim = useRef(new Animated.Value(0)).current;

  const cameraRef = useRef(null);
  const navigation = useNavigation();
  const loadingAnimationRef = useRef(null);

  const blurOpacityAnim = useRef(new Animated.Value(0)).current;
  const checkmarkOpacityAnim = useRef(new Animated.Value(0)).current;

  const [isBlurring, setIsBlurring] = useState(false);

  const pinchRef = useRef();
  const baseZoom = useRef(zoom);

  const isFocused = useIsFocused();

  const [appState, setAppState] = useState(AppState.currentState);

  const screenBlurOpacityAnim = useRef(new Animated.Value(0)).current;

  // New animated values for tutorial overlay and steps
  const tutorialOpacityAnim = useRef(new Animated.Value(0)).current;
  const tutorialStepAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    // Listener for AppState changes
    const handleAppStateChange = (nextAppState) => {
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  // New useEffect to check tutorial after camera is ready
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

    // Start fade-out animation
    Animated.timing(tutorialOpacityAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      // After animation completes, hide the tutorial
      setShowTutorial(false);

      // Reset the animations for next time
      tutorialOpacityAnim.setValue(0);
      tutorialStepAnims.forEach((anim) => anim.setValue(0));
    });
  };

  const isActive = isFocused && appState === 'active';

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

  // New useEffect for tutorial animations
  useEffect(() => {
    if (showTutorial) {
      // Fade in the tutorial overlay
      Animated.timing(tutorialOpacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Fade in the tutorial steps sequentially
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

  if (!permission) {
    return <View />;
  }

// Inside your CameraScreen component

if (!permission.granted) {
  return (
    <View style={styles.container}>
      <BlurView intensity={50} style={StyleSheet.absoluteFill} />
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={haptic}>
            <BlurView intensity={30} style={styles.blurViewButton}>
              <Ionicons name="close" size={40} color="#fff" />
            </BlurView>
          </TouchableOpacity>

          {/* Permissions needed title */}
          <TouchableOpacity style={styles.flashButton} onPress={haptic}>
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

  const secret = () => {
    setShowTutorial(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const haptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const toggleZoom = () => {
    setZoom(zoom === 0 ? 0.5 : 0);
    baseZoom.current = zoom === 0 ? 0.5 : 0;
  };

  const handleCapture = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const imageUri = await takePicture();
    if (imageUri) {
      setIsBlurring(true);

      Animated.timing(blurOpacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      Animated.timing(checkmarkOpacityAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          navigation.navigate('Home', { imageUri });

          blurOpacityAnim.setValue(0);
          checkmarkOpacityAnim.setValue(0);
          setIsBlurring(false);
        }, 1000);
      });
    } else {
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const onPinchEvent = (event) => {
    if (event.nativeEvent.state === State.ACTIVE || event.nativeEvent.state === State.END) {
      let scale = event.nativeEvent.scale;

      let newZoom = baseZoom.current + (scale - 1) * 0.0005;
      newZoom = Math.max(0, Math.min(newZoom, 1));

      setZoom(newZoom);
      baseZoom.current = newZoom;
    }
  };

  return (
    <View style={styles.container}>
      {/* Tutorial Overlay */}
      {showTutorial && (
  <Animated.View
    style={[styles.tutorialOverlay, { opacity: tutorialOpacityAnim }]}
  >
    <BlurView intensity={50} style={StyleSheet.absoluteFill} />
    <View style={styles.tutorialContent}>
      {/* Title Container */}
      <View style={styles.tutorialTitleContainer}>
        <BlurView intensity={30} style={styles.blurViewTitleTutorial}>
          <Text style={styles.title}>Welcome to Photo Mode</Text>
        </BlurView>
      </View>
      
      {/* Tutorial Steps */}
      <View style={styles.tutorialStepsContainer}>
        <Animated.View
          style={[styles.tutorialStep, { opacity: tutorialStepAnims[0] }]}
        >
        <View style={styles.tutorialIcon}>
          <BlurView intensity={50} style={styles.blurViewButton}>
          <Ionicons name="scan" size={50} color="#fff" />
          </BlurView>
        </View>
          <Text style={styles.tutorialText}>
            Tap the scan button to capture your meal.
          </Text>
        </Animated.View>
        <Animated.View
          style={[styles.tutorialStep, { opacity: tutorialStepAnims[1] }]}
        >
        <View style={styles.tutorialIcon}>
          <BlurView intensity={50} style={styles.blurViewButton}>
          <Ionicons name="move" size={50} color="#fff" />
          </BlurView>
        </View>
          <Text style={styles.tutorialText}>
            Use pinch gestures to zoom in and out.
          </Text>
        </Animated.View>
        <Animated.View
          style={[styles.tutorialStep, { opacity: tutorialStepAnims[2] }]}
        >
        <View style={styles.tutorialIcon}>
          <BlurView intensity={50} style={styles.blurViewButton}>
          <Ionicons name="pizza-outline" size={50} color="#fff" />
          </BlurView>
        </View>
          <Text style={styles.tutorialText}>
            Enjoy instant meal scanning straight from your camera.
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
      {/* Screen Blur Overlay */}
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
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={haptic}>
            <BlurView intensity={30} style={styles.blurViewButton}>
              <Ionicons name="close" size={40} color="#fff" />
            </BlurView>
          </TouchableOpacity>

          {/* Flash Button */}
          <TouchableOpacity style={styles.flashButton} onPress={haptic}>
            <BlurView intensity={30} style={styles.blurViewTitle}>
              <Text style={styles.title}>Photo Mode</Text>
            </BlurView>
          </TouchableOpacity>

          {/* Scan Food Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={haptic}>
              <BlurView intensity={30} style={styles.blurView}>
                <Ionicons name="scan" size={50} color="#fff" />
              </BlurView>
            </TouchableOpacity>
          </View>
        </View>
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
            type={facing}
            onCameraReady={onCameraReady}
            ref={cameraRef}
            flashMode={flashMode}
            zoom={zoom}
          >
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
            >
              <BlurView intensity={30} style={styles.blurViewButton}>
                <Ionicons name="close" size={40} color="#fff" />
              </BlurView>
            </TouchableOpacity>

            {/* Flash Button */}
            <TouchableOpacity style={styles.flashButton} onPress={secret}>
              <BlurView intensity={30} style={styles.blurViewTitle}>
                <Text style={styles.title}>Photo Mode</Text>
              </BlurView>
            </TouchableOpacity>

            {/* Scan Text and Button */}
            <View style={styles.buttonContainer}>
              <Animated.View style={{ opacity: scanBlurOpacityAnim }}>
                <BlurView intensity={30} style={styles.blurViewDescription}>
                  <Animated.Text
                    style={[styles.description, { opacity: scanTextAnim }]}
                  >
                    Scan a food item to begin
                  </Animated.Text>
                </BlurView>
              </Animated.View>
              {/* Scan Food Button */}
              <TouchableOpacity style={styles.button} onPress={handleCapture}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: 'white',
  },
  camera: {
    flex: 1,
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
  zoomButton: {
    position: 'absolute',
    right: 20,
    bottom: 150,
    zIndex: 4,
    borderRadius: 15,
    overflow: 'hidden',
  },
  blurViewButton: {
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
  zoomText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
  blurViewDescription2: {
    borderRadius: 90,
    padding: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#555',
    marginTop: 14,
  },
  description: {
    fontSize: 18,
    fontWeight: '400',
    color: '#eee',
    textAlign: 'center',
  },
  description2: {
    fontSize: 18,
    fontWeight: '400',
    color: '#eee',
    textAlign: 'center',
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
  blurView: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    zIndex: 6,
  },
  loadingText: {
    marginTop: 10,
    color: '#a9a9a9',
    fontWeight: '500',
    fontSize: 16,
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
  tutorialStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 35,
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
    marginBottom: 50
  },
  tutorialTitleContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20, // Adjust spacing as needed
  },
  tutorialStepsContainer: {
    width: '100%',
    alignItems: 'flex-start', // Ensures steps are left-aligned
  },
  tutorialIcon: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  permissionTitleContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  permissionDescription: {
    fontSize: 18,
    fontWeight: '400',
    color: '#eee',
    textAlign: 'center',
    marginBottom: 50,
    paddingHorizontal: 20,
  },
});
