import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';

const TutorialOverlay = ({ visible, onDismiss, steps }) => {
  const blurAnim = useRef(new Animated.Value(5)).current; // Initial blur amount
  const currentStep = useRef(0); // Tracks current tutorial step

  // Pulse animation for blur effect
  const pulseBlur = () => {
    Animated.sequence([
      Animated.timing(blurAnim, {
        toValue: 20, // Max blur value
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(blurAnim, {
        toValue: 5, // Min blur value
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start(() => {
      pulseBlur(); // Repeat the animation indefinitely
    });
  };

  useEffect(() => {
    if (visible) {
      pulseBlur();
    } else {
      Animated.timing(blurAnim, {
        toValue: 5,
        duration: 500,
        useNativeDriver: false,
      }).stop();
    }
  }, [visible]);

  const goToNextStep = () => {
    if (currentStep.current < steps.length - 1) {
      currentStep.current += 1;
    } else {
      onDismiss(); // Close tutorial when steps are done
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.container}>
        {/* Blurred Background */}
        <Animated.View style={StyleSheet.absoluteFill}>
          <BlurView
            intensity={blurAnim}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Tutorial Highlight and Instructions */}
        <View style={styles.highlightContainer}>
          <Text style={styles.instructionText}>{steps[currentStep.current].text}</Text>
        </View>

        {/* Next Step Button */}
        <TouchableOpacity style={styles.nextButton} onPress={goToNextStep}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default TutorialOverlay;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Slight dark overlay for visibility
  },
  highlightContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 18,
    color: 'black',
    textAlign: 'center',
  },
  nextButton: {
    padding: 10,
    backgroundColor: '#007BFF',
    borderRadius: 5,
  },
  nextButtonText: {
    fontSize: 16,
    color: 'white',
  },
});