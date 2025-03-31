import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Animated, Text, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AIAnimatedText from './AIAnimatedText';
import AIAnimatedSubtitle from './AIAnimatedSubtitle';
import ShimmerText from '../components/ShimmerText';

const { width } = Dimensions.get('window');

// Step states
const STEP_WAITING = 'waiting';
const STEP_ACTIVE = 'active';
const STEP_COMPLETED = 'completed';

const AIVisualization = ({ isDark, isVisible }) => {
  // Track the current state of each step
  const [stepStates, setStepStates] = useState({
    recognize: STEP_WAITING,
    search: STEP_WAITING,
    process: STEP_WAITING,
    result: STEP_WAITING
  });
  
  // Track if text animation is completed for each step
  const [textAnimCompleted, setTextAnimCompleted] = useState({
    recognize: false,
    search: false,
    process: false,
    result: false
  });
  
  // Animation value for steps container
  const stepsContainerAnim = useRef(new Animated.Value(1)).current;
  
  // Animation for the main container
  const containerAnim = useRef(new Animated.Value(0)).current;
  
  // Animation values for steps
  const recognizeAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const processAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  
  // Animation values for subtitles
  const recognizeSubtitleAnim = useRef(new Animated.Value(0)).current;
  const searchSubtitleAnim = useRef(new Animated.Value(0)).current;
  const processSubtitleAnim = useRef(new Animated.Value(0)).current;
  const resultSubtitleAnim = useRef(new Animated.Value(0)).current;
  
  // Animation values for checkmarks
  const recognizeCheckAnim = useRef(new Animated.Value(0)).current;
  const searchCheckAnim = useRef(new Animated.Value(0)).current;
  const processCheckAnim = useRef(new Animated.Value(0)).current;
  const resultCheckAnim = useRef(new Animated.Value(0)).current;
  
  // Animation values for spinners
  const recognizeSpinAnim = useRef(new Animated.Value(0)).current;
  const searchSpinAnim = useRef(new Animated.Value(0)).current;
  const processSpinAnim = useRef(new Animated.Value(0)).current;
  const resultSpinAnim = useRef(new Animated.Value(0)).current;
  
  // Food recognition subtitles that cycle
  const recognizeSubtitles = [
    'Analyzing image for food...',
    'Zooming in on food...',
    'Detecting ingredients...',
    'Categorizing food items...',
    'Measuring portion sizes...',
  ];
  
  // Web search subtitles that cycle
  const searchSubtitles = [
    'Searching "USDA food database"...',
    'Clicking on link: "www.usda.gov"...',
    'Clicking on link: "www.fda.gov"...',
    'Clicking on link: "www.eatright.org"...',
    'Checking "European Food Safety Authority"...',
    'Accessing "WHO Nutrition Database"...',
    'Searching "NIH Dietary Supplements"...',
    'Checking "Harvard School of Public Health"...',
    'Looking at ingredient images...',
    'Comparing with similar foods...',
    'Accessing recipe databases...',
  ];
  
  // Processing subtitles that cycle
  const processSubtitles = [
    'Calculating nutritional values...',
    'Applying AI algorithms...',
    'Cross-referencing research...',
    'Evaluating health impact...',
    'Optimizing recommendations...',
  ];
  
  // Current subtitle indices
  const [currentRecognizeSubtitleIndex, setCurrentRecognizeSubtitleIndex] = useState(0);
  const [currentSearchSubtitleIndex, setCurrentSearchSubtitleIndex] = useState(0);
  const [currentProcessSubtitleIndex, setCurrentProcessSubtitleIndex] = useState(0);

  // Animation cleanup references
  const timeoutRefs = useRef([]);
  const intervalRefs = useRef([]);
  const shimmerLoopsRef = useRef([]);

  // Animation for the accuracy box
  const accuracyBoxAnim = useRef(new Animated.Value(0)).current;

  // Refs for AnimatedColorText components
  const recognizeTitleRef = useRef(null);
  const searchTitleRef = useRef(null);
  const processTitleRef = useRef(null);
  const resultTitleRef = useRef(null);
  
  const recognizeSubtitleRef = useRef(null);
  const searchSubtitleRef = useRef(null);
  const processSubtitleRef = useRef(null);
  const resultSubtitleRef = useRef(null);
  
  const accuracyTextRef = useRef(null);

  // Haptic feedback functions
  const triggerStepHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const triggerSubtitleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const triggerCompletionHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Start a spinner animation
  const startSpinner = (spinAnim) => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ).start();
  };

  // Stop a spinner animation
  const stopSpinner = (spinAnim) => {
    spinAnim.stopAnimation();
    spinAnim.setValue(0);
  };

  useEffect(() => {
    if (isVisible) {
      // Reset all states
      setStepStates({
        recognize: STEP_WAITING,
        search: STEP_WAITING,
        process: STEP_WAITING,
        result: STEP_WAITING
      });
      
      // Reset text animation completion state
      setTextAnimCompleted({
        recognize: false,
        search: false,
        process: false,
        result: false
      });
      
      stepsContainerAnim.setValue(1);
      containerAnim.setValue(0); // Reset container animation
      
      // Reset all animations
      recognizeAnim.setValue(0);
      searchAnim.setValue(0);
      processAnim.setValue(0);
      resultAnim.setValue(0);
      recognizeSubtitleAnim.setValue(0);
      searchSubtitleAnim.setValue(0);
      processSubtitleAnim.setValue(0);
      resultSubtitleAnim.setValue(0);
      recognizeCheckAnim.setValue(0);
      searchCheckAnim.setValue(0);
      processCheckAnim.setValue(0);
      resultCheckAnim.setValue(0);
      recognizeSpinAnim.setValue(0);
      searchSpinAnim.setValue(0);
      processSpinAnim.setValue(0);
      resultSpinAnim.setValue(0);
      accuracyBoxAnim.setValue(0); // Reset accuracy box animation
      
      // First animate in the container
      Animated.spring(containerAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
      
      // Animation sequence
      const animateSequence = () => {
        // Step 1: Food Recognition
        setStepStates(prev => ({ ...prev, recognize: STEP_ACTIVE }));
        triggerStepHaptic(); // Haptic feedback when step becomes active
        startSpinner(recognizeSpinAnim);
        
        // Start cycling through recognition subtitles
        const recognizeInterval = setInterval(() => {
          setCurrentRecognizeSubtitleIndex(prevIndex => 
            (prevIndex + 1) % recognizeSubtitles.length
          );
          triggerSubtitleHaptic();
        }, 600);
        intervalRefs.current.push(recognizeInterval);
        
        // Animate in the recognition step
        Animated.sequence([
          Animated.spring(recognizeAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(recognizeSubtitleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
        
        // After a delay, mark recognize text animation as completed
        timeoutRefs.current.push(setTimeout(() => {
          setTextAnimCompleted(prev => ({ ...prev, recognize: true }));
        }, 500));
        
        // After a delay, complete the recognition step and move to search
        timeoutRefs.current.push(setTimeout(() => {
          // Complete recognition step
          clearInterval(recognizeInterval);
          stopSpinner(recognizeSpinAnim);
          Animated.timing(recognizeCheckAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }).start();
          setStepStates(prev => ({ ...prev, recognize: STEP_COMPLETED }));
          triggerStepHaptic(); // Haptic feedback when step is completed
          
          // Start Web Search step
          setStepStates(prev => ({ ...prev, search: STEP_ACTIVE }));
          triggerStepHaptic(); // Haptic feedback when step becomes active
          startSpinner(searchSpinAnim);
          
          // Start cycling through search subtitles
          const searchInterval = setInterval(() => {
            setCurrentSearchSubtitleIndex(prevIndex => 
              (prevIndex + 1) % searchSubtitles.length
            );
            triggerSubtitleHaptic();
          }, 300);
          intervalRefs.current.push(searchInterval);
          
          // Animate in the search step
          Animated.sequence([
            Animated.spring(searchAnim, {
              toValue: 1,
              tension: 50,
              friction: 7,
              useNativeDriver: true,
            }),
            Animated.timing(searchSubtitleAnim, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
          
          // After a delay, mark search text animation as completed
          timeoutRefs.current.push(setTimeout(() => {
            setTextAnimCompleted(prev => ({ ...prev, search: true }));
          }, 500));
          
          // After a delay, complete the search step and move to processing
          timeoutRefs.current.push(setTimeout(() => {
            // Complete search step
            clearInterval(searchInterval);
            stopSpinner(searchSpinAnim);
            Animated.timing(searchCheckAnim, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }).start();
            setStepStates(prev => ({ ...prev, search: STEP_COMPLETED }));
            triggerStepHaptic(); // Haptic feedback when step is completed
            
            // Start Processing step
            setStepStates(prev => ({ ...prev, process: STEP_ACTIVE }));
            triggerStepHaptic(); // Haptic feedback when step becomes active
            startSpinner(processSpinAnim);
            
            // Start cycling through processing subtitles
            const processInterval = setInterval(() => {
              setCurrentProcessSubtitleIndex(prevIndex => 
                (prevIndex + 1) % processSubtitles.length
              );
              triggerSubtitleHaptic();
            }, 400);
            intervalRefs.current.push(processInterval);
            
            // Animate in the processing step
            Animated.sequence([
              Animated.spring(processAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
              }),
              Animated.timing(processSubtitleAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              }),
            ]).start();
            
            // After a delay, mark process text animation as completed
            timeoutRefs.current.push(setTimeout(() => {
              setTextAnimCompleted(prev => ({ ...prev, process: true }));
            }, 500));
            
            // After a delay, complete the processing step and move to results
            timeoutRefs.current.push(setTimeout(() => {
              // Complete processing step
              clearInterval(processInterval);
              stopSpinner(processSpinAnim);
              Animated.timing(processCheckAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
              }).start();
              setStepStates(prev => ({ ...prev, process: STEP_COMPLETED }));
              triggerStepHaptic(); // Haptic feedback when step is completed
              
              // Start Results step
              setStepStates(prev => ({ ...prev, result: STEP_ACTIVE }));
              triggerStepHaptic(); // Haptic feedback when step becomes active
              startSpinner(resultSpinAnim);
              
              // Animate in the results step
              Animated.sequence([
                Animated.spring(resultAnim, {
                  toValue: 1,
                  tension: 50,
                  friction: 7,
                  useNativeDriver: true,
                }),
                Animated.timing(resultSubtitleAnim, {
                  toValue: 1,
                  duration: 200,
                  useNativeDriver: true,
                }),
              ]).start();
              
              // After a delay, mark result text animation as completed
              timeoutRefs.current.push(setTimeout(() => {
                setTextAnimCompleted(prev => ({ ...prev, result: true }));
              }, 500));
              
              // Complete results step after proper delay
              timeoutRefs.current.push(setTimeout(() => {
                stopSpinner(resultSpinAnim);
                Animated.timing(resultCheckAnim, {
                  toValue: 1,
                  duration: 250,
                  useNativeDriver: true,
                }).start();
                setStepStates(prev => ({ ...prev, result: STEP_COMPLETED }));
                triggerStepHaptic(); // Haptic feedback when step is completed
                
                // After a short delay, show the accuracy box
                timeoutRefs.current.push(setTimeout(() => {
                  Animated.spring(accuracyBoxAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true
                  }).start();
                  // Haptic feedback when accuracy box appears
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  
                  // Final success haptic when entire process is complete
                  setTimeout(() => {
                    triggerCompletionHaptic();
                  }, 500);
                }, 1000));
              }, 2000));
            }, 2000));
          }, 2000));
        }, 2000));
      };

      // Start the animation sequence after a short delay and container animation
      timeoutRefs.current.push(setTimeout(animateSequence, 400));

      // Cleanup function
      return () => {
        // Clear all timeouts and intervals
        timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
        intervalRefs.current.forEach(interval => clearInterval(interval));
        timeoutRefs.current = [];
        intervalRefs.current = [];
        
        // Reset states
        setStepStates({
          recognize: STEP_WAITING,
          search: STEP_WAITING,
          process: STEP_WAITING,
          result: STEP_WAITING
        });
        
        // Reset text animation states
        setTextAnimCompleted({
          recognize: false,
          search: false,
          process: false,
          result: false
        });
        
        // Reset container animation
        containerAnim.setValue(0);
        
        // Reset accuracy box animation
        accuracyBoxAnim.setValue(0);
        
        // Reset subtitle indices
        setCurrentRecognizeSubtitleIndex(0);
        setCurrentSearchSubtitleIndex(0);
        setCurrentProcessSubtitleIndex(0);
      };
    }
  }, [isVisible]);

  const getCheckmarkAnimation = (step) => {
    switch(step) {
      case 'recognize':
        return recognizeCheckAnim;
      case 'search':
        return searchCheckAnim;
      case 'process':
        return processCheckAnim;
      case 'result':
        return resultCheckAnim;
      default:
        return recognizeCheckAnim;
    }
  };
  
  const getSpinnerAnimation = (step) => {
    switch(step) {
      case 'recognize':
        return recognizeSpinAnim;
      case 'search':
        return searchSpinAnim;
      case 'process':
        return processSpinAnim;
      case 'result':
        return resultSpinAnim;
      default:
        return recognizeSpinAnim;
    }
  };
  
  const getCyclingSubtitle = (step) => {
    switch(step) {
      case 'recognize':
        return recognizeSubtitles[currentRecognizeSubtitleIndex];
      case 'search':
        return searchSubtitles[currentSearchSubtitleIndex];
      case 'process':
        return processSubtitles[currentProcessSubtitleIndex];
      case 'result':
        return 'Generating personalized nutrition insights...';
      default:
        return '';
    }
  };

  const renderStep = (icon, text, defaultSubtitle, animation, subtitleAnim, step, isLast = false, isDark) => {
    const checkAnim = getCheckmarkAnimation(step);
    const spinAnim = getSpinnerAnimation(step);
    const stepState = stepStates[step];
    const isTextAnimDone = textAnimCompleted[step];
    
    // Get the appropriate refs based on the step
    const titleRef = 
      step === 'recognize' ? recognizeTitleRef :
      step === 'search' ? searchTitleRef :
      step === 'process' ? processTitleRef :
      resultTitleRef;
      
    const subtitleRef = 
      step === 'recognize' ? recognizeSubtitleRef :
      step === 'search' ? searchSubtitleRef :
      step === 'process' ? processSubtitleRef :
      resultSubtitleRef;
    
    const spin = spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
    
    // Use the appropriate subtitle based on step state and cycling
    const displaySubtitle = stepState === STEP_ACTIVE ? getCyclingSubtitle(step) : defaultSubtitle;
    
    // Determine opacity based on step state
    const containerOpacity = stepState === STEP_COMPLETED ? 0.7 : 1;
    
    return (
      <View style={styles.stepContainer}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isDark ? '#2C2C2E' : '#000',
              borderColor: isDark ? '#333' : '#000',
              borderWidth: 1,
              opacity: animation,
              transform: [
                {
                  scale: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={24}
            color={isDark ? '#FFF' : '#fff'}
          />
          
          {stepState === STEP_COMPLETED && (
            <Animated.View 
              style={[
                styles.checkmarkOverlay,
                {
                  opacity: checkAnim,
                  transform: [
                    { scale: checkAnim },
                  ],
                  backgroundColor: isDark ? '#FFF' : '#fff',
                  borderColor: isDark ? '#333' : '#E0E0E0',
                  borderWidth: 1,
                }
              ]}
            >
              <MaterialCommunityIcons
                name="check"
                size={18}
                color={isDark ? '#000' : '#000'}
              />
            </Animated.View>
          )}
        </Animated.View>
        
        <View style={[styles.textContainer, { opacity: containerOpacity, paddingRight: 4 }]}>
          <View style={styles.textWrapper}>
            <Animated.View
              style={{
                opacity: animation,
                position: 'relative',
                overflow: 'hidden',
                transform: [
                  { translateX: animation.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
                ],
              }}
            >
              {stepState === STEP_ACTIVE && !isTextAnimDone ? (
                <AIAnimatedText
                  text={text}
                  style={[styles.stepText, { color: isDark ? '#FFF' : '#000' }]}
                  typingSpeed={10000}
                  characterDelay={10000}
                  onComplete={() => { setTextAnimCompleted(prev => ({ ...prev, [step]: true })); }}
                />
              ) : (
                <ShimmerText
                  text={text}
                  style={[styles.stepText]}
                  isCompleted={stepState === STEP_COMPLETED}
                  completedColor={isDark ? '#CCC' : '#999999'}
                  baseColor={'#000'}
                  shimmerDuration={800}
                />
              )}
            </Animated.View>
          </View>
          <Animated.View
            style={{
              opacity: subtitleAnim,
              transform: [
                { translateY: subtitleAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                { translateX: subtitleAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
              ],
            }}
          >
            <AIAnimatedSubtitle
              text={displaySubtitle}
              style={[styles.subtitleText]}
              colorScheme={isDark ? 'dark' : 'light'}
              isCompleted={stepState === STEP_COMPLETED}
            />
          </Animated.View>
        </View>
        
        {stepState === STEP_ACTIVE && (
          <View style={{ marginLeft: 8 }}>
            <ActivityIndicator size="small" color={isDark ? '#FFF' : '#000'} />
          </View>
        )}
        
        {!isLast && (
          <Animated.View
            style={[
              styles.connector,
              {
                backgroundColor: isDark ? '#333' : '#000',
                opacity: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.7],
                }),
              },
            ]}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)',
            borderColor: isDark ? 'rgba(51, 51, 51, 0.5)' : '#bbb',
            borderWidth: 1,
            position: 'relative',
            opacity: containerAnim,
            transform: [
              { 
                scale: containerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                })
              },
              {
                translateY: containerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                })
              }
            ]
          },
        ]}
      >
        <Animated.View 
          style={[
            styles.stepsContainer,
            { opacity: stepsContainerAnim }
          ]}
        >
          {renderStep(
            'food-apple', 
            'Food Recognition', 
            'Found 3 items in your image.',
            recognizeAnim,
            recognizeSubtitleAnim,
            'recognize',
            false,
            isDark
          )}
          {renderStep(
            'web', 
            'Web Search', 
            'Searched 8 websites and databases.',
            searchAnim,
            searchSubtitleAnim,
            'search',
            false,
            isDark
          )}
          {renderStep(
            'brain', 
            'AI Processing', 
            'Retreived 3 data points.',
            processAnim,
            processSubtitleAnim,
            'process',
            false,
            isDark
          )}
          {renderStep(
            'flag', 
            'Results', 
            'Nutrient facts are done processing.',
            resultAnim,
            resultSubtitleAnim,
            'result',
            true,
            isDark
          )}
        </Animated.View>
        
        {/* Accuracy information box */}
        <Animated.View 
          style={[
            styles.accuracyBox,
            {
              borderColor: isDark ? 'rgba(51, 51, 51, 0.5)' : 'rgba(224, 224, 224, 0.5)',
              backgroundColor: isDark ? 'rgba(44, 44, 46, 0.8)' : 'rgba(248, 248, 248, 0.8)',
              opacity: accuracyBoxAnim,
              transform: [
                { 
                  translateY: accuracyBoxAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                },
                {
                  scale: accuracyBoxAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1]
                  })
                }
              ]
            }
          ]}
        >
          <View style={styles.accuracyContent}>
            <MaterialCommunityIcons 
              name="shield-check" 
              size={22} 
              color={isDark ? '#FFF' : '#666'} 
              style={styles.accuracyIcon}
            />
            <Text
              style={[styles.accuracyText, { color: isDark ? '#CCC' : '#333' }]}
            >
              We verify multiple websites and databases to ensure accuracy, every single time.
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  content: {
    borderRadius: 32,
    padding: 20,
    width: width * 0.9,
    backgroundColor: '#fff',
    position: 'relative',
    minHeight: 380,
  },
  stepsContainer: {
    opacity: 1, // Will be animated
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 12,
    position: 'relative',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
    backgroundColor: '#000',
  },
  checkmarkOverlay: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    backgroundColor: '#fff',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    paddingTop: 2,
    paddingRight: 10, // Reduced padding since we no longer need room for the large spinner
  },
  textWrapper: {
    marginBottom: 4,
  },
  stepText: {
    fontSize: 17,
    fontWeight: '600',
    backgroundColor: 'transparent',
    letterSpacing: -0.3,
    color: '#000',
    minHeight: 24,
  },
  subtitleText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginLeft: 2,
    letterSpacing: -0.2,
    color: '#666',
    marginTop: 0,
    minHeight: 18,
  },
  connector: {
    position: 'absolute',
    left: 22,
    top: 42,
    width: 2,
    height: 36,
    backgroundColor: '#000',
  },
  accuracyBox: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accuracyContent: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accuracyIcon: {
    marginRight: 10,
  },
  accuracyText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  spinnerContainer: {
    position: 'absolute',
    right: 16,
    top: 14,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AIVisualization; 