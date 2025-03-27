import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

const AIAnimatedSubtitle = ({ text, style, colorScheme, isCompleted }) => {
  const [prevText, setPrevText] = useState('');
  const [currentText, setCurrentText] = useState(text);
  
  // Animation values for smooth transitions
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const moveAnim = useRef(new Animated.Value(5)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Run animation when the text changes
  useEffect(() => {
    if (text !== currentText) {
      // First fade out current text with parallel animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(moveAnim, {
          toValue: -5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start(() => {
        // Update text state
        setPrevText(currentText);
        setCurrentText(text);
        
        // Reset animation values for new text
        moveAnim.setValue(5);
        scaleAnim.setValue(0.95);
        
        // Animate in the new text with spring for more natural motion
        Animated.parallel([
          Animated.spring(fadeAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.spring(moveAnim, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          })
        ]).start();
      });
    } else if (fadeAnim._value !== 1) {
      // Initial fade in for first render
      moveAnim.setValue(5);
      scaleAnim.setValue(0.95);
      
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(moveAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        })
      ]).start();
    }
    
    return () => {
      fadeAnim.stopAnimation();
      moveAnim.stopAnimation();
      scaleAnim.stopAnimation();
    };
  }, [text, fadeAnim, moveAnim, scaleAnim, currentText]);

  // Handle completed state changes
  useEffect(() => {
    if (isCompleted) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.98,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isCompleted, fadeAnim, scaleAnim]);
  
  const textColor = isCompleted 
    ? (colorScheme === 'dark' ? '#999999' : '#999999')
    : (colorScheme === 'dark' ? '#CCC' : '#666666');
  
  return (
    <Animated.Text 
      style={[
        styles.subtitle,
        style,
        { 
          color: textColor,
          opacity: fadeAnim,
          transform: [
            { translateY: moveAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
      numberOfLines={2}
      ellipsizeMode="tail"
    >
      {currentText}
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 13,
    fontStyle: 'italic',
    letterSpacing: -0.2,
  }
});

export default AIAnimatedSubtitle; 