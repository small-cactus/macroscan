import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { systemPrompts } from './prompts';
import { getModel } from './models';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventRegister } from 'react-native-event-listeners';

// Throttle helper function to limit event emission rate
const throttle = (func, limit) => {
  let lastFunc;
  let lastRan;
  return function() {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

// Create throttled event emitter for smoother visualization
const throttledEmit = throttle((eventName, data) => {
  EventRegister.emit(eventName, data);
}, 200); // Limit to one event every 200ms

// Import event constants from FunctionalAIVisualization
const EVENTS = {
  STEP_UPDATE: 'ai_visualization_step_update',
  STEP_COMPLETE: 'ai_visualization_step_complete',
  SUBTITLE_UPDATE: 'ai_visualization_subtitle_update',
  FOOD_DETECTED: 'ai_visualization_food_detected',
  API_FINISHED: 'ai_visualization_api_finished',
  SEARCH_DATA: 'ai_visualization_search_data'
};

// Global reference to the searchTracking function
let globalSearchTrackingFn = null;

// Constants for AsyncStorage keys - must match those in other files
const SEARCH_QUERIES_KEY = '@nutrilens:search_queries';
const SEARCH_RESULTS_KEY = '@nutrilens:search_results';
const API_FINISHED_KEY = '@nutrilens:api_finished';
const DETECTED_FOOD_KEY = '@nutrilens:detected_food';
// Add new constants for step tracking
const PROCESSING_STEP_KEY = '@nutrilens:processing_step';
const STEP_TIMESTAMP_KEY = '@nutrilens:step_timestamp';

// Define step constants
const STEP_RECOGNIZE = 'recognize';
const STEP_SEARCH = 'search';
const STEP_PROCESS = 'process';
const STEP_RESULT = 'result';

// Step-specific AsyncStorage keys - these are critical for visualization
const RECOGNIZE_STEP_ACTIVE_KEY = '@nutrilens:recognize_step_active';
const SEARCH_STEP_ACTIVE_KEY = '@nutrilens:search_step_active';
const PROCESS_STEP_ACTIVE_KEY = '@nutrilens:process_step_active';
const RESULT_STEP_ACTIVE_KEY = '@nutrilens:result_step_active';

const RECOGNIZE_STEP_COMPLETED_KEY = '@nutrilens:recognize_step_completed';
const SEARCH_STEP_COMPLETED_KEY = '@nutrilens:search_step_completed';
const PROCESS_STEP_COMPLETED_KEY = '@nutrilens:process_step_completed';
const RESULT_STEP_COMPLETED_KEY = '@nutrilens:result_step_completed';

// ADD - CRITICAL GLOBAL STATE for direct communication
// This should work more reliably than AsyncStorage
global.NUTRILENS_VISUALIZATION = {
  currentStep: null,
  stepStates: {
    recognize: { active: false, completed: false },
    search: { active: false, completed: false },
    process: { active: false, completed: false },
    result: { active: false, completed: false }
  },
  subtitles: {
    recognize: [],
    search: [],
    process: [],
    result: []
  },
  detectedFood: "",
  updateTime: Date.now()
};

// Minimum step durations in milliseconds
const MIN_RECOGNIZE_DURATION = 1800;
const MIN_SEARCH_DURATION = 2200;
const MIN_PROCESS_DURATION = 2600;
const MIN_RESULT_DURATION = 1800;
const STEP_TRANSITION_DELAY = 400; // Added for smooth transitions
const TOTAL_MIN_DURATION = 12000; // Minimum total processing time for better UX

// Real-time state access via global variable for smoother visualization
global.NUTRILENS_VISUALIZATION_ACCESS = {
  getData: () => {
    // This function will be called by the visualization component to get the latest data
    return {
      currentStep: global.NUTRILENS_VISUALIZATION?.currentStep || null,
      stepStates: global.NUTRILENS_VISUALIZATION?.stepStates || {
        recognize: { active: false, completed: false },
        search: { active: false, completed: false },
        process: { active: false, completed: false },
        result: { active: false, completed: false }
      },
      subtitles: global.NUTRILENS_VISUALIZATION?.subtitles || {
        recognize: [],
        search: [],
        process: [],
        result: []
      },
      detectedFood: global.NUTRILENS_VISUALIZATION?.detectedFood || "",
      searchQueries: [],
      searchResults: [],
      apiFinished: false,
      updateTime: Date.now()
    };
  },
  refreshVisualization: async () => {
    // Force refresh the visualization with the latest data from AsyncStorage
    try {
      // Get all step states
      const [
        recognizeActive, recognizeCompleted,
        searchActive, searchCompleted,
        processActive, processCompleted,
        resultActive, resultCompleted,
        detectedFood, apiFinished,
        searchQueriesRaw, searchResultsRaw
      ] = await Promise.all([
        AsyncStorage.getItem(RECOGNIZE_STEP_ACTIVE_KEY),
        AsyncStorage.getItem(RECOGNIZE_STEP_COMPLETED_KEY),
        AsyncStorage.getItem(SEARCH_STEP_ACTIVE_KEY),
        AsyncStorage.getItem(SEARCH_STEP_COMPLETED_KEY),
        AsyncStorage.getItem(PROCESS_STEP_ACTIVE_KEY),
        AsyncStorage.getItem(PROCESS_STEP_COMPLETED_KEY),
        AsyncStorage.getItem(RESULT_STEP_ACTIVE_KEY),
        AsyncStorage.getItem(RESULT_STEP_COMPLETED_KEY),
        AsyncStorage.getItem(DETECTED_FOOD_KEY),
        AsyncStorage.getItem(API_FINISHED_KEY),
        AsyncStorage.getItem(SEARCH_QUERIES_KEY),
        AsyncStorage.getItem(SEARCH_RESULTS_KEY)
      ]);
      
      // Update global state with latest data
      if (!global.NUTRILENS_VISUALIZATION) {
        global.NUTRILENS_VISUALIZATION = {
          currentStep: null,
          stepStates: {
            recognize: { active: false, completed: false },
            search: { active: false, completed: false },
            process: { active: false, completed: false },
            result: { active: false, completed: false }
          },
          subtitles: {
            recognize: [],
            search: [],
            process: [],
            result: []
          },
          detectedFood: "",
          updateTime: Date.now()
        };
      }
      
      // Update step states
      global.NUTRILENS_VISUALIZATION.stepStates.recognize.active = recognizeActive === 'true';
      global.NUTRILENS_VISUALIZATION.stepStates.recognize.completed = recognizeCompleted === 'true';
      global.NUTRILENS_VISUALIZATION.stepStates.search.active = searchActive === 'true';
      global.NUTRILENS_VISUALIZATION.stepStates.search.completed = searchCompleted === 'true';
      global.NUTRILENS_VISUALIZATION.stepStates.process.active = processActive === 'true';
      global.NUTRILENS_VISUALIZATION.stepStates.process.completed = processCompleted === 'true';
      global.NUTRILENS_VISUALIZATION.stepStates.result.active = resultActive === 'true';
      global.NUTRILENS_VISUALIZATION.stepStates.result.completed = resultCompleted === 'true';
      
      // Update current step based on active states
      if (resultActive === 'true') {
        global.NUTRILENS_VISUALIZATION.currentStep = 'result';
      } else if (processActive === 'true') {
        global.NUTRILENS_VISUALIZATION.currentStep = 'process';
      } else if (searchActive === 'true') {
        global.NUTRILENS_VISUALIZATION.currentStep = 'search';
      } else if (recognizeActive === 'true') {
        global.NUTRILENS_VISUALIZATION.currentStep = 'recognize';
      }
      
      // Update food and API state
      global.NUTRILENS_VISUALIZATION.detectedFood = detectedFood || "";
      global.NUTRILENS_VISUALIZATION.apiFinished = apiFinished === 'true';
      
      // Parse and store search queries and results
      try {
        const searchQueries = searchQueriesRaw ? JSON.parse(searchQueriesRaw) : [];
        const searchResults = searchResultsRaw ? JSON.parse(searchResultsRaw) : [];
        
        // Create subtitles from queries and results
        if (searchQueries.length > 0) {
          global.NUTRILENS_VISUALIZATION.subtitles.search = searchQueries.map(q => `Searching "${q}"...`);
        }
        
        if (searchResults.length > 0) {
          global.NUTRILENS_VISUALIZATION.subtitles.process = searchResults
            .slice(0, 3)
            .map(r => `Analyzing "${r.title?.substring(0, 20) || 'results'}..."`);
        }
        
        // Store food subtitles
        if (detectedFood) {
          global.NUTRILENS_VISUALIZATION.subtitles.recognize = [`Detected ${detectedFood}...`];
          global.NUTRILENS_VISUALIZATION.subtitles.result = [`Nutrition facts for ${detectedFood}`];
        }
      } catch (err) {
        console.error('Error parsing search data:', err);
      }
      
      // Update timestamp to trigger observers
      global.NUTRILENS_VISUALIZATION.updateTime = Date.now();
      
      return true;
    } catch (error) {
      console.error('Error refreshing visualization data:', error);
      return false;
    }
  }
};

// Setup a polling interval to ensure visualization stays updated
setInterval(() => {
  if (!global._isNutrilensProcessingComplete) {
    global.NUTRILENS_VISUALIZATION_ACCESS.refreshVisualization().catch(err => {
      console.error('Error in visualization refresh interval:', err);
    });
  }
}, 500);

// Add state tracking to prevent redundant events
const stateTracker = {
  steps: {
    recognize: { active: false, completed: false },
    search: { active: false, completed: false },
    process: { active: false, completed: false },
    result: { active: false, completed: false }
  },
  subtitles: {
    recognize: null,
    search: null,
    process: null,
    result: null
  },
  detectedFood: null,
  apiFinished: false,
  lastEventTime: {},
  
  // Only emit events if state has actually changed
  hasChanged(type, value) {
    const now = Date.now();
    const key = `${type}_${JSON.stringify(value)}`;
    
    // Prevent duplicate events within 300ms
    if (this.lastEventTime[key] && (now - this.lastEventTime[key]) < 300) {
      return false;
    }
    
    this.lastEventTime[key] = now;
    return true;
  },
  
  // Reset all tracked state
  reset() {
    this.steps = {
      recognize: { active: false, completed: false },
      search: { active: false, completed: false },
      process: { active: false, completed: false },
      result: { active: false, completed: false }
    };
    this.subtitles = {
      recognize: null,
      search: null,
      process: null,
      result: null
    };
    this.detectedFood = null;
    this.apiFinished = false;
    this.lastEventTime = {};
  }
};

// Make the throttledEmit smarter with state tracking
const smartEmit = (eventName, data) => {
  // Get current scan ID
  const scanId = global.CURRENT_SCAN_ID || null;
  
  // Add scan ID to data if available
  const eventData = scanId ? { ...data, scanId } : data;
  
  // Track different event types
  switch (eventName) {
    case EVENTS.STEP_UPDATE:
      if (data && data.step) {
        if (stateTracker.steps[data.step].active === data.active) {
          return; // State hasn't changed, don't emit
        }
        if (!stateTracker.hasChanged('step_update', data)) {
          return; // Duplicate event, don't emit
        }
        stateTracker.steps[data.step].active = data.active;
      }
      break;
      
    case EVENTS.STEP_COMPLETE:
      if (data && data.step) {
        if (stateTracker.steps[data.step].completed) {
          return; // Already completed, don't emit
        }
        if (!stateTracker.hasChanged('step_complete', data)) {
          return; // Duplicate event, don't emit
        }
        stateTracker.steps[data.step].completed = true;
      }
      break;
      
    case EVENTS.SUBTITLE_UPDATE:
      if (data && data.step && data.subtitle) {
        if (stateTracker.subtitles[data.step] === data.subtitle) {
          return; // Same subtitle, don't emit
        }
        if (!stateTracker.hasChanged('subtitle', data)) {
          return; // Duplicate event, don't emit
        }
        stateTracker.subtitles[data.step] = data.subtitle;
      }
      break;
      
    case EVENTS.FOOD_DETECTED:
      if (stateTracker.detectedFood === data) {
        return; // Same food, don't emit
      }
      if (!stateTracker.hasChanged('food', data)) {
        return; // Duplicate event, don't emit
      }
      stateTracker.detectedFood = data;
      break;
      
    case EVENTS.API_FINISHED:
      if (stateTracker.apiFinished) {
        return; // Already marked as finished, don't emit
      }
      stateTracker.apiFinished = true;
      break;
  }
  
  // Use the throttled emit function with scan ID
  throttledEmit(eventName, eventData);
};

// UPDATED - Simple Direct Function for Updating Step States
/**
 * Updates a step's state in both global state and via events
 * @param {string} step The step to update (recognize, search, process, result)
 * @param {Object} state Object with active and/or completed status
 */
const updateStepState = async (step, state) => {
  try {
    console.log(`Updating step ${step} state:`, state);
    
    // Update global state first (immediate effect)
    if (state.hasOwnProperty('active')) {
      global.NUTRILENS_VISUALIZATION.stepStates[step].active = state.active;
      
      // Also update current step if activating
      if (state.active) {
        global.NUTRILENS_VISUALIZATION.currentStep = step;
      }
      
      // Emit event for step activation using smart emitter
      smartEmit(EVENTS.STEP_UPDATE, { step, active: state.active });
      
      // Also update AsyncStorage for backwards compatibility
      const key = step === STEP_RECOGNIZE ? RECOGNIZE_STEP_ACTIVE_KEY :
                  step === STEP_SEARCH ? SEARCH_STEP_ACTIVE_KEY :
                  step === STEP_PROCESS ? PROCESS_STEP_ACTIVE_KEY :
                  RESULT_STEP_ACTIVE_KEY;
                  
      await AsyncStorage.setItem(key, state.active ? 'true' : 'false');
      
      // Also update processing step key if activating
      if (state.active) {
        await AsyncStorage.setItem(PROCESSING_STEP_KEY, step);
        
        // Store timestamp for duration tracking
        await AsyncStorage.setItem(STEP_TIMESTAMP_KEY, Date.now().toString());
      }
    }
    
    if (state.hasOwnProperty('completed')) {
      global.NUTRILENS_VISUALIZATION.stepStates[step].completed = state.completed;
      
      // Emit event for step completion using smart emitter
      if (state.completed) {
        smartEmit(EVENTS.STEP_COMPLETE, { step });
      }
      
      // Store in AsyncStorage for backwards compatibility
      const key = step === STEP_RECOGNIZE ? RECOGNIZE_STEP_COMPLETED_KEY :
                  step === STEP_SEARCH ? SEARCH_STEP_COMPLETED_KEY :
                  step === STEP_PROCESS ? PROCESS_STEP_COMPLETED_KEY :
                  RESULT_STEP_COMPLETED_KEY;
                  
      await AsyncStorage.setItem(key, state.completed ? 'true' : 'false');
    }
    
    // Update the timestamp to trigger re-renders in observers
    global.NUTRILENS_VISUALIZATION.updateTime = Date.now();
    
    return true;
  } catch (error) {
    console.error(`Error updating step ${step} state:`, error);
    return false;
  }
};

/**
 * Updates subtitles for a specific step
 * @param {string} step The step to update subtitles for
 * @param {Array} subtitles Array of subtitle strings
 */
const updateStepSubtitles = async (step, subtitles) => {
  if (!Array.isArray(subtitles) || subtitles.length === 0) return;
  
  console.log(`Updating ${step} subtitles:`, subtitles);
  
  // Update global state
  global.NUTRILENS_VISUALIZATION.subtitles[step] = subtitles;
  global.NUTRILENS_VISUALIZATION.updateTime = Date.now();
  
  // Emit event with latest subtitle using smart emitter
  smartEmit(EVENTS.SUBTITLE_UPDATE, { 
    step, 
    subtitle: subtitles[subtitles.length - 1] 
  });
  
  // Store in AsyncStorage for backwards compatibility
  try {
    const key = `@nutrilens:${step}_subtitles`;
    await AsyncStorage.setItem(key, JSON.stringify(subtitles));
  } catch (error) {
    console.error(`Error storing ${step} subtitles:`, error);
  }
};

/**
 * Updates detected food and ensures it propagates to visualization
 * @param {string} foodName The detected food name
 */
const updateDetectedFood = async (foodName) => {
  if (!foodName || typeof foodName !== 'string' || foodName.length < 2) return;
  
  console.log('Updating detected food:', foodName);
  
  // Update global state
  global.NUTRILENS_VISUALIZATION.detectedFood = foodName;
  global.NUTRILENS_VISUALIZATION.updateTime = Date.now();
  
  // Emit event for food detection using smart emitter
  smartEmit(EVENTS.FOOD_DETECTED, foodName);
  
  // Store in AsyncStorage for backwards compatibility
  try {
    await AsyncStorage.setItem(DETECTED_FOOD_KEY, foodName);
  } catch (error) {
    console.error('Error storing detected food:', error);
  }
};

// SIMPLIFIED - Activate a step and automatically manage transition from previous step
const directActivateStep = async (step) => {
  console.log(`DIRECT: Activating step ${step}`);
  const currentStep = global.NUTRILENS_VISUALIZATION?.currentStep;
  
  // Complete previous step if it exists and isn't completed
  if (currentStep && 
      currentStep !== step && 
      global.NUTRILENS_VISUALIZATION?.stepStates[currentStep]?.active && 
      !global.NUTRILENS_VISUALIZATION?.stepStates[currentStep]?.completed) {
    await updateStepState(currentStep, { completed: true });
  }
  
  await updateStepState(step, { active: true });
  
  // DIRECTLY update global state
  if (global.NUTRILENS_VISUALIZATION) {
    global.NUTRILENS_VISUALIZATION.currentStep = step;
    global.NUTRILENS_VISUALIZATION.stepStates[step].active = true;
    global.NUTRILENS_VISUALIZATION.updateTime = Date.now();
  }
  
  console.log(`DIRECT: Step ${step} activated`);
  
  return true;
};

// SIMPLIFIED - Complete a step
const directCompleteStep = async (step) => {
  await updateStepState(step, { completed: true });
  
  // DIRECTLY update global state
  if (global.NUTRILENS_VISUALIZATION) {
    global.NUTRILENS_VISUALIZATION.stepStates[step].completed = true;
    global.NUTRILENS_VISUALIZATION.updateTime = Date.now();
  }
  
  console.log(`DIRECT: Step ${step} completed`);
  
  return true;
};

/**
 * Manages step transitions with appropriate timing
 * @param {string} fromStep Current step
 * @param {string} toStep Next step
 */
const transitionStep = async (fromStep, toStep) => {
  // Complete current step
  await directCompleteStep(fromStep);
  
  // Wait for transition delay
  await new Promise(resolve => setTimeout(resolve, STEP_TRANSITION_DELAY));
  
  // Activate next step
  await directActivateStep(toStep);
};

/**
 * Completes a specific visualization step
 * @param {string} step The step to complete (recognize, search, process, result)
 */
const completeStep = async (step) => {
  try {
    console.log(`Completing step: ${step}`);
    
    // Emit event for step completion using smart emitter
    smartEmit(EVENTS.STEP_COMPLETE, { step });
    
    // Store the step's completed status in AsyncStorage for backwards compatibility
    switch(step) {
      case STEP_RECOGNIZE:
        await AsyncStorage.setItem(RECOGNIZE_STEP_COMPLETED_KEY, 'true');
        break;
      case STEP_SEARCH:
        await AsyncStorage.setItem(SEARCH_STEP_COMPLETED_KEY, 'true');
        break;
      case STEP_PROCESS:
        await AsyncStorage.setItem(PROCESS_STEP_COMPLETED_KEY, 'true');
        break;
      case STEP_RESULT:
        await AsyncStorage.setItem(RESULT_STEP_COMPLETED_KEY, 'true');
        break;
    }
    
    // Verify completion status was set correctly (for backwards compatibility)
    let verificationKey;
    switch(step) {
      case STEP_RECOGNIZE: verificationKey = RECOGNIZE_STEP_COMPLETED_KEY; break;
      case STEP_SEARCH: verificationKey = SEARCH_STEP_COMPLETED_KEY; break;
      case STEP_PROCESS: verificationKey = PROCESS_STEP_COMPLETED_KEY; break;
      case STEP_RESULT: verificationKey = RESULT_STEP_COMPLETED_KEY; break;
    }
    
    // Verify the completion was saved (for backwards compatibility)
    const isCompleted = await AsyncStorage.getItem(verificationKey);
    if (isCompleted !== 'true') {
      console.error(`Failed to set completion status for ${step}. Retrying...`);
      await AsyncStorage.setItem(verificationKey, 'true');
    } else {
      console.log(`Verified completion status for ${step}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error completing step ${step}:`, error);
    return false;
  }
};

/**
 * Activates a specific visualization step
 * @param {string} step The step to activate (recognize, search, process, result)
 */
const activateStep = async (step) => {
  try {
    // Verify previous step was completed before activating next step
    let previousStepCompleted = true;
    
    // Enforce sequence: previous step must be completed
    if (step === STEP_SEARCH) {
      const recognizeCompleted = await AsyncStorage.getItem(RECOGNIZE_STEP_COMPLETED_KEY);
      previousStepCompleted = (recognizeCompleted === 'true');
      if (!previousStepCompleted) {
        console.log(`Cannot activate ${step} - previous step not completed. Completing recognize step first.`);
        await completeStep(STEP_RECOGNIZE);
      }
    } else if (step === STEP_PROCESS) {
      const searchCompleted = await AsyncStorage.getItem(SEARCH_STEP_COMPLETED_KEY);
      previousStepCompleted = (searchCompleted === 'true');
      if (!previousStepCompleted) {
        console.log(`Cannot activate ${step} - previous step not completed. Completing search step first.`);
        await completeStep(STEP_SEARCH);
      }
    } else if (step === STEP_RESULT) {
      const processCompleted = await AsyncStorage.getItem(PROCESS_STEP_COMPLETED_KEY);
      previousStepCompleted = (processCompleted === 'true');
      if (!previousStepCompleted) {
        console.log(`Cannot activate ${step} - previous step not completed. Completing process step first.`);
        await completeStep(STEP_PROCESS);
      }
    }
    
    console.log(`Activating step: ${step}`);
    
    // Emit event for step activation using smart emitter
    smartEmit(EVENTS.STEP_UPDATE, { step, active: true });
    
    // Store the step's active status in AsyncStorage for backwards compatibility
    switch(step) {
      case STEP_RECOGNIZE:
        await AsyncStorage.setItem(RECOGNIZE_STEP_ACTIVE_KEY, 'true');
        break;
      case STEP_SEARCH:
        await AsyncStorage.setItem(SEARCH_STEP_ACTIVE_KEY, 'true');
        break;
      case STEP_PROCESS:
        await AsyncStorage.setItem(PROCESS_STEP_ACTIVE_KEY, 'true');
        break;
      case STEP_RESULT:
        await AsyncStorage.setItem(RESULT_STEP_ACTIVE_KEY, 'true');
        break;
    }
    
    // Store current step for reference
    await AsyncStorage.setItem(PROCESSING_STEP_KEY, step);
    
    // Store timestamp for step duration tracking
    const timestamp = Date.now().toString();
    await AsyncStorage.setItem(STEP_TIMESTAMP_KEY, timestamp);
    
    // Update global state for immediate effect
    if (global.NUTRILENS_VISUALIZATION) {
      global.NUTRILENS_VISUALIZATION.currentStep = step;
      global.NUTRILENS_VISUALIZATION.stepStates[step].active = true;
      global.NUTRILENS_VISUALIZATION.updateTime = Date.now();
    }
    
    return true;
  } catch (error) {
    console.error(`Error activating step ${step}:`, error);
    return false;
  }
};

/**
 * Ensures minimum step duration and transitions to next step
 * @param {string} currentStep The current step
 * @param {string} nextStep The next step to transition to
 * @returns {Promise<void>}
 */
const ensureStepDuration = async (currentStep, nextStep) => {
  try {
    const apiFinished = await AsyncStorage.getItem(API_FINISHED_KEY);
    if (apiFinished === 'true') {
      await activateStep(nextStep);
      return;
    }

    const timestampStr = await AsyncStorage.getItem(STEP_TIMESTAMP_KEY);
    const timestamp = timestampStr ? parseInt(timestampStr) : Date.now();
    const now = Date.now();
    
    // Calculate remaining time with smooth easing
    const minDuration = {
      [STEP_RECOGNIZE]: MIN_RECOGNIZE_DURATION,
      [STEP_SEARCH]: MIN_SEARCH_DURATION,
      [STEP_PROCESS]: MIN_PROCESS_DURATION,
      [STEP_RESULT]: MIN_RESULT_DURATION,
    }[currentStep] || 1000;

    const elapsed = now - timestamp;
    if (elapsed < minDuration) {
      await completeStep(currentStep);
      
      // Smooth out the remaining wait time
      const remaining = minDuration - elapsed;
      await new Promise(resolve => setTimeout(resolve, remaining * 0.7));
      await activateStep(nextStep);
      await new Promise(resolve => setTimeout(resolve, remaining * 0.3));
    } else {
      await completeStep(currentStep);
      await new Promise(resolve => setTimeout(resolve, STEP_TRANSITION_DELAY));
      await activateStep(nextStep);
    }
  } catch (error) {
    console.error('Error ensuring step duration:', error);
    await activateStep(nextStep);
  }
};

/**
 * Manages visualization steps with proper timing, even if API finishes early
 * @param {Object} apiData The data from the API call
 * @param {boolean} isApiFinished Whether the API call has finished
 * @returns {Promise<void>}
 */
const manageVisualizationSteps = async (apiData, isApiFinished = false) => {
  try {
    const currentStep = await AsyncStorage.getItem(PROCESSING_STEP_KEY) || STEP_RECOGNIZE;
    const startTime = parseInt(await AsyncStorage.getItem('@nutrilens:scan_start_time') || Date.now());
    const totalElapsed = Date.now() - startTime;

    if (isApiFinished) {
      const steps = [STEP_RECOGNIZE, STEP_SEARCH, STEP_PROCESS, STEP_RESULT];
      const currentIndex = steps.indexOf(currentStep);
      
      // Smoothly progress through remaining steps
      for (let i = currentIndex; i < steps.length; i++) {
        const step = steps[i];
        await ensureStepDuration(step, steps[i+1] || STEP_RESULT);
        
        // If we've reached the actual API completion point
        if (i === steps.length - 1) {
          await AsyncStorage.setItem(API_FINISHED_KEY, 'true');
        }
      }
      return;
    }

    // Fluid progression based on actual API progress
    if (apiData) {
      if (apiData.food && currentStep === STEP_RECOGNIZE) {
        await ensureStepDuration(STEP_RECOGNIZE, STEP_SEARCH);
      }
      if (apiData.searchQueries?.length && currentStep === STEP_SEARCH) {
        await ensureStepDuration(STEP_SEARCH, STEP_PROCESS);
      }
      if (apiData.searchResults?.length && currentStep === STEP_PROCESS) {
        await ensureStepDuration(STEP_PROCESS, STEP_RESULT);
      }
    }
  } catch (error) {
    console.error('Error managing visualization steps:', error);
  }
};

/**
 * Performs a web search using the search query
 * @param {string} query The search query
 * @returns {Promise<Array>} An array of search results with title, url, and snippet
 */
const performWebSearch = async (query) => {
  try {
    console.log('Performing web search for:', query);
    
    // For testing, we're implementing a simple approach using a free search API
    // In production, you'd use a more robust solution like SerpAPI, Bing Web Search API, etc.
    const response = await axios.get('https://ddg-api.herokuapp.com/search', {
      params: { query, limit: 5 }
    });
    
    if (response.data && Array.isArray(response.data)) {
      return response.data.map(item => ({
        title: item.title,
        url: item.url,
        snippet: item.snippet
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error performing web search:', error);
    // Return a minimal set of results on error
    return [
      {
        title: 'Error fetching search results',
        url: 'https://example.com',
        snippet: 'Could not retrieve search results due to an error.'
      }
    ];
  }
};

// Function to store search data directly
const storeSearchData = async (queries = [], results = []) => {
  try {
    // Check if API is finished
    const apiFinishedValue = await AsyncStorage.getItem(API_FINISHED_KEY);
    if (apiFinishedValue === 'true') {
      console.log('BLOCKED: API already finished, not storing search data');
      return false;
    }
    
    console.log('Storing search data:', { queries: queries.length, results: results.length });
    
    // Update current processing step based on what we're storing
    const currentStep = await AsyncStorage.getItem(PROCESSING_STEP_KEY) || STEP_RECOGNIZE;
    
    // If this is the first data we're storing, initialize the scan start time
    const startTimeStr = await AsyncStorage.getItem('@nutrilens:scan_start_time');
    if (!startTimeStr) {
      await AsyncStorage.setItem('@nutrilens:scan_start_time', Date.now().toString());
    }
    
    let updatedQueries = [];
    let updatedResults = [];
    
    // Smooth query handling
    if (queries.length > 0) {
      if (currentStep === STEP_RECOGNIZE) {
        await ensureStepDuration(STEP_RECOGNIZE, STEP_SEARCH);
      }
      
      // Get existing queries
      const existingQueriesJson = await AsyncStorage.getItem(SEARCH_QUERIES_KEY);
      let existingQueries = [];
      if (existingQueriesJson) {
        try {
          existingQueries = JSON.parse(existingQueriesJson);
        } catch (e) {
          console.error('Error parsing existing queries:', e);
        }
      }
      
      // Add new unique queries
      updatedQueries = [...existingQueries];
      let hasNewQueries = false;
      
      queries.forEach(query => {
        if (!updatedQueries.includes(query)) {
          updatedQueries.push(query);
          hasNewQueries = true;
        }
      });
      
      if (hasNewQueries) {
        await AsyncStorage.setItem(SEARCH_QUERIES_KEY, JSON.stringify(updatedQueries));
        console.log('Updated queries in AsyncStorage:', updatedQueries.length);
        
        // Emit search data event using smart emitter
        smartEmit(EVENTS.SEARCH_DATA, { queries: updatedQueries });
        
        // Extract food data from queries
        const foodKeywords = ['nutrition facts for', 'calories in'];
        for (const query of queries) {
          for (const keyword of foodKeywords) {
            if (query.toLowerCase().includes(keyword)) {
              const match = query.match(new RegExp(`${keyword}\\s+(.+?)(?:$|\\.|,)`, 'i'));
              if (match && match[1]) {
                const foodName = match[1].trim();
                if (foodName.length > 2) {
                  // Emit food detected event using smart emitter
                  smartEmit(EVENTS.FOOD_DETECTED, foodName);
                  
                  // Save detected food to AsyncStorage for backwards compatibility
                  await AsyncStorage.setItem(DETECTED_FOOD_KEY, foodName);
                  console.log('Stored detected food in AsyncStorage:', foodName);
                  
                  break;
                }
              }
            }
          }
        }
      }
    }
    
    // Smooth results handling
    if (results.length > 0) {
      if (currentStep === STEP_SEARCH) {
        await ensureStepDuration(STEP_SEARCH, STEP_PROCESS);
      }
      if (currentStep === STEP_PROCESS && results.length >= 3) {
        await ensureStepDuration(STEP_PROCESS, STEP_RESULT);
      }
      
      // Get existing results
      const existingResultsJson = await AsyncStorage.getItem(SEARCH_RESULTS_KEY);
      let existingResults = [];
      if (existingResultsJson) {
        try {
          existingResults = JSON.parse(existingResultsJson);
        } catch (e) {
          console.error('Error parsing existing results:', e);
        }
      }
      
      // Add new unique results (by URL)
      updatedResults = [...existingResults];
      let hasNewResults = false;
      
      results.forEach(result => {
        if (!updatedResults.some(existing => existing.url === result.url)) {
          updatedResults.push(result);
          hasNewResults = true;
        }
      });
      
      if (hasNewResults) {
        await AsyncStorage.setItem(SEARCH_RESULTS_KEY, JSON.stringify(updatedResults));
        console.log('Updated results in AsyncStorage:', updatedResults.length);
        
        // Emit search data results event using smart emitter
        smartEmit(EVENTS.SEARCH_DATA, { results: updatedResults });
      }
    }
    
    // Progressive updates for visualization
    await manageVisualizationSteps({
      food: await AsyncStorage.getItem(DETECTED_FOOD_KEY),
      searchQueries: updatedQueries,
      searchResults: updatedResults
    }, false);
    
    return true;
  } catch (error) {
    console.error('Error storing search data:', error);
    return false;
  }
};

/**
 * Implements web scraping functionality for providers
 * @param {Object} toolCall The tool call object from the model
 * @returns {Promise<Object>} The search results
 */
const processWebSearchToolCall = async (toolCall) => {
  try {
    // Extract the query from the tool call parameters
    let query = '';
    if (toolCall.function && toolCall.function.name === 'search_web') {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        query = args.query;
        
        // Process the query immediately
        if (query) {
          // Check if API is finished before processing
          const apiFinishedValue = await AsyncStorage.getItem(API_FINISHED_KEY);
          if (apiFinishedValue === 'true') {
            console.log('BLOCKED search tracking for query due to API completion:', query);
          } else {
            console.log('Processing search query:', query);
            
            // Extract food FIRST - this will handle recognize step
            await extractFoodFromQuery(query);
            
            // Make sure search step is active
            if (!global.NUTRILENS_VISUALIZATION.stepStates.search.active) {
              // If recognize step didn't complete, force completion and activate search
              if (!global.NUTRILENS_VISUALIZATION.stepStates.recognize.completed) {
                await directCompleteStep(STEP_RECOGNIZE);
                await directActivateStep(STEP_SEARCH);
              }
            }
            
            // Update search step subtitle immediately
            const searchSubtitle = `Searching "${query}"...`;
            await updateStepSubtitles(STEP_SEARCH, [searchSubtitle]);
            
            // Store query in AsyncStorage
            const existingQueriesJson = await AsyncStorage.getItem(SEARCH_QUERIES_KEY);
            let existingQueries = existingQueriesJson ? JSON.parse(existingQueriesJson) : [];
            if (!existingQueries.includes(query)) {
              existingQueries.push(query);
              await AsyncStorage.setItem(SEARCH_QUERIES_KEY, JSON.stringify(existingQueries));
            }
          }
        }
      } catch (e) {
        console.error('Error parsing tool call arguments:', e);
        return { 
          error: 'Failed to parse search query',
          results: []
        };
      }
    } else if (toolCall.tools && toolCall.tools.length > 0) {
      // Handle different format for Gemini
      const searchTool = toolCall.tools.find(tool => 
        tool.functionDeclaration && tool.functionDeclaration.name === 'search_web'
      );
      if (searchTool && searchTool.toolUseValue) {
        try {
          const args = JSON.parse(searchTool.toolUseValue);
          query = args.query;
          
          // Process the query immediately
          if (query) {
            // Check if API is finished before processing
            const apiFinishedValue = await AsyncStorage.getItem(API_FINISHED_KEY);
            if (apiFinishedValue === 'true') {
              console.log('BLOCKED search tracking for Gemini query due to API completion:', query);
            } else {
              console.log('Processing Gemini search query:', query);
              
              // Extract food FIRST - this will handle recognize step
              await extractFoodFromQuery(query);
              
              // Make sure search step is active
              if (!global.NUTRILENS_VISUALIZATION.stepStates.search.active) {
                // If recognize step didn't complete, force completion and activate search
                if (!global.NUTRILENS_VISUALIZATION.stepStates.recognize.completed) {
                  await directCompleteStep(STEP_RECOGNIZE);
                  await directActivateStep(STEP_SEARCH);
                }
              }
              
              // Update search step subtitle immediately
              const searchSubtitle = `Searching "${query}"...`;
              await updateStepSubtitles(STEP_SEARCH, [searchSubtitle]);
              
              // Store query in AsyncStorage
              const existingQueriesJson = await AsyncStorage.getItem(SEARCH_QUERIES_KEY);
              let existingQueries = existingQueriesJson ? JSON.parse(existingQueriesJson) : [];
              if (!existingQueries.includes(query)) {
                existingQueries.push(query);
                await AsyncStorage.setItem(SEARCH_QUERIES_KEY, JSON.stringify(existingQueries));
              }
            }
          }
        } catch (e) {
          console.error('Error parsing Gemini tool arguments:', e);
          return { 
            error: 'Failed to parse search query',
            results: []
          };
        }
      }
    }
    
    if (!query) {
      return {
        error: 'No search query provided',
        results: []
      };
    }
    
    // Perform the web search
    const results = await performWebSearch(query);
    
    // Process the search results
    if (results && Array.isArray(results) && results.length > 0) {
      // Check if API is finished before processing
      const apiFinishedValue = await AsyncStorage.getItem(API_FINISHED_KEY);
      if (apiFinishedValue === 'true') {
        console.log('BLOCKED search result tracking due to API completion - results:', results.length);
      } else {
        console.log('Processing search results:', results.length);
        
        // Make sure search step is completed and process step is active
        const searchActive = global.NUTRILENS_VISUALIZATION.stepStates.search.active;
        const searchCompleted = global.NUTRILENS_VISUALIZATION.stepStates.search.completed;
        
        if (!searchActive) {
          // If search step isn't even active, start from the beginning
          if (!global.NUTRILENS_VISUALIZATION.stepStates.recognize.completed) {
            await directCompleteStep(STEP_RECOGNIZE);
          }
          await directActivateStep(STEP_SEARCH);
        }
        
        // CRITICAL: When we get search results, COMPLETE the search step and ACTIVATE process
        if (!searchCompleted) {
          // Update subtitles before completing the step
          const searchCompletionSubtitle = `Found ${results.length} results`;
          await updateStepSubtitles(STEP_SEARCH, [searchCompletionSubtitle]);
          
          // Transition from search to process
          await transitionStep(STEP_SEARCH, STEP_PROCESS);
        }
        
        // Add processed subtitles
        const processSubtitles = results.slice(0, 3).map(result => 
          `Analyzing "${result.title.substring(0, 20)}..."`
        );
        await updateStepSubtitles(STEP_PROCESS, processSubtitles);
        
        // Store results in AsyncStorage
        const existingResultsJson = await AsyncStorage.getItem(SEARCH_RESULTS_KEY);
        let existingResults = existingResultsJson ? JSON.parse(existingResultsJson) : [];
        
        // Add new unique results
        let hasNewResults = false;
        results.forEach(result => {
          if (!existingResults.some(existing => existing.url === result.url)) {
            existingResults.push(result);
            hasNewResults = true;
          }
        });
        
        if (hasNewResults) {
          await AsyncStorage.setItem(SEARCH_RESULTS_KEY, JSON.stringify(existingResults));
          
          // If we have at least 3 results, schedule process step completion
          if (existingResults.length >= 3 && 
              !global.NUTRILENS_VISUALIZATION.stepStates.process.completed) {
            setTimeout(async () => {
              // Double check we're still in process step
              if (global.NUTRILENS_VISUALIZATION.currentStep === STEP_PROCESS && 
                  !global.NUTRILENS_VISUALIZATION.stepStates.process.completed) {
                // Transition from process to result
                await transitionStep(STEP_PROCESS, STEP_RESULT);
                
                // Add a result step subtitle
                const foodName = global.NUTRILENS_VISUALIZATION.detectedFood;
                const resultSubtitle = foodName ? 
                  `Generating nutrition facts for ${foodName}...` : 
                  `Generating nutrition information...`;
                await updateStepSubtitles(STEP_RESULT, [resultSubtitle]);
              }
            }, MIN_PROCESS_DURATION);
          }
        }
      }
    }
    
    return {
      query,
      results
    };
  } catch (error) {
    console.error('Error handling web search:', error);
    return {
      error: `Web search failed: ${error.message}`,
      results: []
    };
  }
};

/**
 * Helper function to extract food items from search queries
 * @param {string} query The search query
 */
const extractFoodFromQuery = async (query) => {
  try {
    // Check if API is finished
    const apiFinishedValue = await AsyncStorage.getItem(API_FINISHED_KEY);
    if (apiFinishedValue === 'true') {
      console.log('BLOCKED: API already finished, not extracting food from query');
      return;
    }

    // Check if the recognize step is already completed
    if (global.NUTRILENS_VISUALIZATION.stepStates.recognize.completed) {
      console.log('Recognize step already completed, skipping food extraction');
      return;
    }
    
    // If recognize step isn't active yet, activate it
    if (!global.NUTRILENS_VISUALIZATION.stepStates.recognize.active) {
      await directActivateStep(STEP_RECOGNIZE);
    }
    
    // Check for food-related queries
    const foodKeywords = ['nutrition facts for', 'calories in', 'nutritional information', 'food'];
    let foundFood = false;
    
    // First try the structured food keywords for faster matching
    for (const keyword of foodKeywords) {
      if (query.toLowerCase().includes(keyword)) {
        // Try to extract the food name from the query using a regex pattern
        const pattern = new RegExp(`${keyword}\\s+(.+?)(?:$|\\.|,)`, 'i');
        const match = query.match(pattern);
        
        if (match && match[1]) {
          const foodName = match[1].trim();
          if (foodName.length > 2) {
            console.log('Extracted food from query:', foodName);
            
            // DIRECTLY update detected food for immediate display
            await updateDetectedFood(foodName);
            
            // Update the subtitle immediately
            const foodSubtitle = `Detected ${foodName}...`;
            await updateStepSubtitles(STEP_RECOGNIZE, [foodSubtitle]);
            
            // Complete recognize step and move to search step
            await transitionStep(STEP_RECOGNIZE, STEP_SEARCH);
            
            foundFood = true;
            break;
          }
        }
      }
    }
    
    // If no structured food reference found, look for food-like terms
    if (!foundFood) {
      // Common food categories for loose identification
      const commonFoods = [
        'apple', 'banana', 'orange', 'chicken', 'beef', 'pork', 'fish', 'rice', 'pasta',
        'bread', 'cake', 'cookie', 'pizza', 'burger', 'sandwich', 'salad', 'smoothie',
        'juice', 'coffee', 'tea', 'milk', 'yogurt', 'cheese', 'chocolate', 'cereal',
        'egg', 'nuts', 'bean', 'vegetable', 'fruit', 'meat', 'soda', 'drink', 'snack'
      ];
      
      for (const food of commonFoods) {
        if (query.toLowerCase().includes(food)) {
          // Try to extract a phrase around the food term
          const words = query.split(' ');
          const foodIndex = words.findIndex(word => 
            word.toLowerCase().includes(food)
          );
          
          if (foodIndex >= 0) {
            // Get a few words before and after the food term
            const start = Math.max(0, foodIndex - 2);
            const end = Math.min(words.length, foodIndex + 3);
            const foodPhrase = words.slice(start, end).join(' ').trim();
            
            if (foodPhrase) {
              console.log('Extracted food phrase from query:', foodPhrase);
              
              // DIRECTLY update detected food for immediate display
              await updateDetectedFood(foodPhrase);
              
              // Update the subtitle immediately
              const foodSubtitle = `Detected ${foodPhrase}...`;
              await updateStepSubtitles(STEP_RECOGNIZE, [foodSubtitle]);
              
              // Complete recognize step and move to search step
              await transitionStep(STEP_RECOGNIZE, STEP_SEARCH);
              
              break;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error extracting food from query:', error);
  }
};

/**
 * Completes the result step and handles API completion
 * @param {Object} data API result data
 * @returns {Promise<void>}
 */
const handleApiCompletion = async (data) => {
  try {
    console.log('API COMPLETION HANDLER TRIGGERED - ensuring all steps are properly marked');
    
    // IMMEDIATELY mark as processing complete for any waiting clients
    global._isNutrilensProcessingComplete = true;
    
    // CRITICAL: First, mark API as finished in AsyncStorage
    await AsyncStorage.setItem(API_FINISHED_KEY, 'true');
    
    // Emit API finished event
    smartEmit(EVENTS.API_FINISHED, true);
    
    // Also update global state
    if (global.NUTRILENS_VISUALIZATION) {
      global.NUTRILENS_VISUALIZATION.apiFinished = true;
    }
    
    // Get current step and check if we're on the last step
    const currentStep = await AsyncStorage.getItem(PROCESSING_STEP_KEY);
    console.log(`API completed with current step: ${currentStep}`);
    
    // Ensure all steps are completed in order
    await completeAllStepsInOrder();
    
    // Final double-check
    await AsyncStorage.setItem(API_FINISHED_KEY, 'true');
    if (global.NUTRILENS_VISUALIZATION) {
      global.NUTRILENS_VISUALIZATION.apiFinished = true;
      global.NUTRILENS_VISUALIZATION.updateTime = Date.now();
    }
    
    console.log('API completion handler finished successfully');
  } catch (error) {
    console.error('Error handling API completion:', error);
    // Force all steps to complete as fallback
    await forceCompleteAllSteps();
  }
};

// Helper function to complete all steps in order
const completeAllStepsInOrder = async () => {
  try {
    // Step 1: Recognize
    if (!await isStepActivated(STEP_RECOGNIZE)) {
      await directActivateStep(STEP_RECOGNIZE);
    }
    if (!await isStepCompleted(STEP_RECOGNIZE)) {
      await directCompleteStep(STEP_RECOGNIZE);
    }
    
    // Step 2: Search
    if (!await isStepActivated(STEP_SEARCH)) {
      await directActivateStep(STEP_SEARCH);
    }
    if (!await isStepCompleted(STEP_SEARCH)) {
      await directCompleteStep(STEP_SEARCH);
    }
    
    // Step 3: Process
    if (!await isStepActivated(STEP_PROCESS)) {
      await directActivateStep(STEP_PROCESS);
    }
    if (!await isStepCompleted(STEP_PROCESS)) {
      await directCompleteStep(STEP_PROCESS);
    }
    
    // Step 4: Result
    if (!await isStepActivated(STEP_RESULT)) {
      await directActivateStep(STEP_RESULT);
    }
    if (!await isStepCompleted(STEP_RESULT)) {
      await directCompleteStep(STEP_RESULT);
    }
    
    // Final verification
    await verifyAllStepsCompleted();
    
    return true;
  } catch (error) {
    console.error('Error completing steps in order:', error);
    return false;
  }
};

// Helper functions to check step status
const isStepActivated = async (step) => {
  const key = step === STEP_RECOGNIZE ? RECOGNIZE_STEP_ACTIVE_KEY :
              step === STEP_SEARCH ? SEARCH_STEP_ACTIVE_KEY :
              step === STEP_PROCESS ? PROCESS_STEP_ACTIVE_KEY :
              RESULT_STEP_ACTIVE_KEY;
              
  return await AsyncStorage.getItem(key) === 'true';
};

const isStepCompleted = async (step) => {
  const key = step === STEP_RECOGNIZE ? RECOGNIZE_STEP_COMPLETED_KEY :
              step === STEP_SEARCH ? SEARCH_STEP_COMPLETED_KEY :
              step === STEP_PROCESS ? PROCESS_STEP_COMPLETED_KEY :
              RESULT_STEP_COMPLETED_KEY;
              
  return await AsyncStorage.getItem(key) === 'true';
};

/**
 * Helper function to verify all steps are completed
 * @returns {Promise<void>}
 */
const verifyAllStepsCompleted = async () => {
  try {
    // Check completion status of all steps
    const recognizeCompleted = await AsyncStorage.getItem(RECOGNIZE_STEP_COMPLETED_KEY);
    const searchCompleted = await AsyncStorage.getItem(SEARCH_STEP_COMPLETED_KEY);
    const processCompleted = await AsyncStorage.getItem(PROCESS_STEP_COMPLETED_KEY);
    const resultCompleted = await AsyncStorage.getItem(RESULT_STEP_COMPLETED_KEY);
    
    console.log('Step completion verification:', {
      recognize: recognizeCompleted === 'true',
      search: searchCompleted === 'true',
      process: processCompleted === 'true',
      result: resultCompleted === 'true'
    });
    
    // Force complete any steps that aren't marked as completed
    if (recognizeCompleted !== 'true') {
      console.log('Forcing recognize step completion');
      await AsyncStorage.setItem(RECOGNIZE_STEP_COMPLETED_KEY, 'true');
    }
    
    if (searchCompleted !== 'true') {
      console.log('Forcing search step completion');
      await AsyncStorage.setItem(SEARCH_STEP_COMPLETED_KEY, 'true');
    }
    
    if (processCompleted !== 'true') {
      console.log('Forcing process step completion');
      await AsyncStorage.setItem(PROCESS_STEP_COMPLETED_KEY, 'true');
    }
    
    if (resultCompleted !== 'true') {
      console.log('Forcing result step completion');
      await AsyncStorage.setItem(RESULT_STEP_COMPLETED_KEY, 'true');
    }
  } catch (error) {
    console.error('Error verifying step completion:', error);
  }
};

/**
 * Force complete all steps in case of error recovery
 * @returns {Promise<void>}
 */
const forceCompleteAllSteps = async () => {
  try {
    console.log('EMERGENCY: Force completing all steps');
    
    // Force all steps to active first (to maintain correct sequence)
    await AsyncStorage.setItem(RECOGNIZE_STEP_ACTIVE_KEY, 'true');
    await AsyncStorage.setItem(SEARCH_STEP_ACTIVE_KEY, 'true');
    await AsyncStorage.setItem(PROCESS_STEP_ACTIVE_KEY, 'true');
    await AsyncStorage.setItem(RESULT_STEP_ACTIVE_KEY, 'true');
    
    // Then force all steps to completed
    await AsyncStorage.setItem(RECOGNIZE_STEP_COMPLETED_KEY, 'true');
    await AsyncStorage.setItem(SEARCH_STEP_COMPLETED_KEY, 'true');
    await AsyncStorage.setItem(PROCESS_STEP_COMPLETED_KEY, 'true');
    await AsyncStorage.setItem(RESULT_STEP_COMPLETED_KEY, 'true');
    
    // Set current step to result
    await AsyncStorage.setItem(PROCESSING_STEP_KEY, STEP_RESULT);
    
    // Mark API as finished
    await AsyncStorage.setItem(API_FINISHED_KEY, 'true');
    
    console.log('Emergency step completion successful');
  } catch (error) {
    console.error('Error force completing steps:', error);
  }
};

// Add a new function for complete state reset that aggressively clears all state
const forceResetAllState = async () => {
  console.log('FORCE RESET: Aggressively clearing all visualization state');
  
  try {
    // Generate new scan ID
    const scanId = generateNewScanId();
    console.log(`FORCE RESET: Using new scan ID: ${scanId}`);
    
    // Store globally for consistent events
    global.CURRENT_SCAN_ID = scanId;
    
    // Clear all AsyncStorage keys related to visualization
    const keysToRemove = [
      SEARCH_QUERIES_KEY,
      SEARCH_RESULTS_KEY,
      API_FINISHED_KEY,
      DETECTED_FOOD_KEY,
      PROCESSING_STEP_KEY,
      STEP_TIMESTAMP_KEY,
      RECOGNIZE_STEP_ACTIVE_KEY,
      SEARCH_STEP_ACTIVE_KEY,
      PROCESS_STEP_ACTIVE_KEY,
      RESULT_STEP_ACTIVE_KEY,
      RECOGNIZE_STEP_COMPLETED_KEY,
      SEARCH_STEP_COMPLETED_KEY,
      PROCESS_STEP_COMPLETED_KEY,
      RESULT_STEP_COMPLETED_KEY,
      '@nutrilens:scan_start_time',
      '@nutrilens:recognize_subtitles',
      '@nutrilens:search_subtitles',
      '@nutrilens:process_subtitles',
      '@nutrilens:result_subtitles'
    ];
    
    await AsyncStorage.multiRemove(keysToRemove);
    
    // Reset our state tracker to pristine state
    stateTracker.reset();
    
    // Reset critical global state flags
    global._isNutrilensProcessingComplete = false;
    
    // Reset global visualization state completely
    if (global.NUTRILENS_VISUALIZATION) {
      global.NUTRILENS_VISUALIZATION = {
        currentStep: null,
        stepStates: {
          recognize: { active: false, completed: false },
          search: { active: false, completed: false },
          process: { active: false, completed: false },
          result: { active: false, completed: false }
        },
        subtitles: {
          recognize: [],
          search: [],
          process: [],
          result: []
        },
        detectedFood: "",
        updateTime: Date.now(),
        apiFinished: false
      };
    }
    
    console.log('FORCE RESET: State cleared successfully');
    return scanId;
  } catch (error) {
    console.error('FORCE RESET: Error clearing state:', error);
    return null;
  }
};

// Add a scan ID generator to track individual scans
let currentScanId = 0;
const generateNewScanId = () => {
  currentScanId++;
  return `scan_${Date.now()}_${currentScanId}`;
};

// Update the handleWebSearch function to use scan IDs
export const handleWebSearch = async ({
  provider,
  selectedModel,
  selectedMode,
  base64Image,
  barcodeData,
  hasDrawing,
  apiKey,
  handleSuccessfulScan,
  handleError,
  handleSearchTracking,
  imageUri,
  startTimeRef,
  updateAverageProcessingTime,
  isFirstDayUnlimited,
  isSubscribed,
  setNoFoodFound,
  setFoodData,
  setActiveTab,
}) => {
  try {
    // Generate a unique scan ID
    const scanId = generateNewScanId();
    console.log(`[SCAN ${scanId}] Starting new scan with ${provider} provider`);
    
    // First, ensure all previous state is completely cleared
    await forceResetAllState();
    
    // Then emit the reset event to notify visualization component
    EventRegister.emit('ai_visualization_reset', { scanId });
    
    // Brief delay to ensure reset is processed
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Store scan ID in AsyncStorage for reference
    await AsyncStorage.setItem('@nutrilens:current_scan_id', scanId);
    
    // Store the search tracking function in the global reference (legacy)
    globalSearchTrackingFn = handleSearchTracking;
    
    let foodFound = false;
    
    // Get the appropriate model based on provider and search mode
    const currentModel = getModel(provider, { 
      selectedMode: 'search',  // Force search mode
      selectedModel: 'search',
      hasDrawing
    });
    
    console.log(`Debug - handleWebSearch inputs - provider: ${provider}, selectedModel: ${selectedModel}`);
    console.log(`Debug - handleWebSearch - Using search mode with ${provider} model: ${currentModel}`);
    
    // Wrap the handleSuccessfulScan function to manage visualization steps
    const wrappedHandleSuccessfulScan = async (...args) => {
      try {
        // Check if this data indicates API completion
        const data = args[0];
        if (data && data._isProcessingComplete) {
          console.log('API call has completed processing, handling visualization steps');
          await handleApiCompletion(data);
        }
        
        // Call the original handler
        return handleSuccessfulScan(...args);
      } catch (error) {
        console.error('Error in wrappedHandleSuccessfulScan:', error);
        // Mark API as finished as fallback
        await AsyncStorage.setItem(API_FINISHED_KEY, 'true');
        return handleSuccessfulScan(...args);
      }
    };
    
    // Initialize with the recognize step
    await activateStep(STEP_RECOGNIZE);
    
    // Store start time for overall process timing
    await AsyncStorage.setItem('@nutrilens:scan_start_time', Date.now().toString());
    console.log('Initialized visualization with recognize step');
    
    // Route to the appropriate provider-specific web search function with enhanced error handling
    try {
      switch (provider) {
        case 'openai':
          foodFound = await handleOpenAIWebSearch({
            selectedModel: currentModel,
            selectedMode,
            base64Image,
            barcodeData,
            hasDrawing,
            apiKey,
            handleSuccessfulScan: wrappedHandleSuccessfulScan,
            handleError,
            handleSearchTracking, // Pass through original for backward compatibility
            imageUri,
            startTimeRef,
            updateAverageProcessingTime,
            isFirstDayUnlimited,
            isSubscribed,
            setNoFoodFound,
            setFoodData,
            setActiveTab,
          });
          break;
        case 'gemini':
          foodFound = await handleGeminiWebSearch({
            selectedModel: currentModel,
            selectedMode,
            base64Image,
            barcodeData,
            hasDrawing,
            apiKey,
            handleSuccessfulScan: wrappedHandleSuccessfulScan,
            handleError,
            handleSearchTracking, // Pass through original for backward compatibility
            imageUri,
            startTimeRef,
            updateAverageProcessingTime,
            isFirstDayUnlimited,
            isSubscribed,
            setNoFoodFound,
            setFoodData,
            setActiveTab,
          });
          break;
        case 'anthropic':
        default:
          foodFound = await handleAnthropicWebSearch({
            selectedModel: currentModel,
            selectedMode,
            base64Image,
            barcodeData,
            hasDrawing,
            apiKey,
            handleSuccessfulScan: wrappedHandleSuccessfulScan,
            handleError,
            handleSearchTracking, // Pass through original for backward compatibility
            imageUri,
            startTimeRef,
            updateAverageProcessingTime,
            isFirstDayUnlimited,
            isSubscribed,
            setNoFoodFound,
            setFoodData,
            setActiveTab,
          });
          break;
      }
    } catch (providerError) {
      console.error(`Error in ${provider} search:`, providerError);
      
      // Make sure to mark API as finished even on error
      await AsyncStorage.setItem(API_FINISHED_KEY, 'true');
      
      // Re-throw to be handled by caller
      throw providerError;
    }
    
    return foodFound;
  } catch (error) {
    console.error('Error in handleWebSearch:', error);
    handleError(error, imageUri, barcodeData);
    return false;
  }
};

// Update the event listener for reset events to use our more thorough reset function
let resetEventListener = null;

// Remove previous listener if it exists
if (resetEventListener) {
  EventRegister.removeEventListener(resetEventListener);
}

// Set up new reset event listener
resetEventListener = EventRegister.addEventListener('ai_visualization_reset', async () => {
  console.log('EVENT: Reset event received, performing complete reset');
  await forceResetAllState();
});

/**
 * Handles web search using Anthropic's API
 */
const handleAnthropicWebSearch = async ({
  selectedModel,
  selectedMode,
  base64Image,
  barcodeData,
  hasDrawing,
  apiKey,
  handleSuccessfulScan,
  handleError,
  handleSearchTracking,
  imageUri,
  startTimeRef,
  updateAverageProcessingTime,
  isFirstDayUnlimited,
  isSubscribed,
  setNoFoodFound,
  setFoodData,
  setActiveTab,
}) => {
  try {
    const anthropic = new Anthropic({ apiKey });
    let foodFound = false;
    const searchInfo = {
      queries: [],
      results: []
    };
    
    // Ensure we have a valid model string - fall back to Claude 3.5 Sonnet if null
    const actualModel = selectedModel || 'claude-3-haiku-20240307';
    
    console.log("Using search mode with Anthropic. Sending request to API");
    console.log("Debug - handleAnthropicWebSearch - Selected model:", selectedModel);
    console.log("Debug - handleAnthropicWebSearch - Actual model being used:", actualModel);
    
    // Initial message to identify the food and determine what to search for
    const initialResponse = await anthropic.messages.create({
      model: actualModel,
      max_tokens: 4096,
      temperature: 0.5,
      system: systemPrompts.searchMode(hasDrawing, barcodeData),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and tell me what food this is. Look very carefully at all visual details including packaging, branding, logos, and size references. Pay close attention to portion size relative to other objects in the image. Only after thoroughly analyzing what you see, use the search_web tool if needed to gather accurate nutritional information."
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        }
      ],
      tools: [
        {
          name: "search_web",
          description: "Search the web for information related to food nutrition",
          input_schema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to find nutrition information"
              }
            },
            required: ["query"]
          }
        }
      ]
    });
    
    console.log('Anthropic initial response:', JSON.stringify(initialResponse, null, 2));
    
    // Process the initial response
    let messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this image and tell me what food this is. Use the search_web tool if needed to gather accurate nutritional information."
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: base64Image,
            },
          },
        ],
      }
    ];
    
    // Track all tool calls for display purpose
    if (initialResponse.content) {
      const textContent = initialResponse.content.find(item => item.type === 'text');
      if (textContent) {
        // Extract potential food items from the initial text response
        if (textContent.text) {
          // Parse the structured format first
          const foodMatches = [];
          const formattedData = {};
          
          // Look for the structured format pattern we defined
          const lines = textContent.text.split('\n');
          let foundStructuredFormat = false;
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Try to extract key-value pairs
            const match = line.match(/^(Food item\(s\)|Brand\/Restaurant|Portion size|Packaging|Distinguishing features):\s*(.+)$/i);
            if (match) {
              foundStructuredFormat = true;
              const [_, key, value] = match;
              formattedData[key] = value.trim();
              
              // Extract food items from the dedicated field
              if (key === 'Food item(s)') {
                // Split by commas or 'and' to get individual items
                const items = value.split(/,|\s+and\s+/).map(item => item.trim());
                items.forEach(item => {
                  if (item.length > 2 && !foodMatches.includes(item)) {
                    foodMatches.push(item);
                  }
                });
              }
            }
          }
          
          // If we didn't find the structured format, fall back to regex patterns
          if (!foundStructuredFormat) {
            // Common patterns of AI describing food in images
            const patterns = [
              /(?:this is|I can see|the image shows|appears to be|visible is|we can see)\s+(?:a|an|some)?\s+([\w\s\-\'\,]+)(?:\.|,|\s+in\s+the\s+image|\s+on\s+a\s+plate|\s+with\s+)/i,
              /(?:a|an|some)\s+([\w\s\-\'\,]+)(?:\s+is\s+visible|\s+is\s+shown|\s+appears|\s+can\s+be\s+seen)/i,
              /(?:image|photo) (?:of|contains|showing|displays)\s+(?:a|an|some)?\s+([\w\s\-\'\,]+)(?:\.|,|\s+on|\s+with)/i
            ];
            
            // Try each pattern
            for (const pattern of patterns) {
              const match = textContent.text.match(pattern);
              if (match && match[1] && match[1].trim().length > 2) {
                const foodItem = match[1].trim();
                // Remove articles and common qualifiers
                const cleanedItem = foodItem
                  .replace(/^(a|an|some)\s+/i, '')
                  .replace(/\s+(dish|meal|food|item|portion)$/i, '');
                  
                if (cleanedItem.length > 2 && !foodMatches.includes(cleanedItem)) {
                  foodMatches.push(cleanedItem);
                }
              }
            }
          }
          
          // Create search queries for each identified food and update visualization
          if (foodMatches.length > 0) {
            console.log('Extracted food items from initial response:', foodMatches);
            
            // Set the detected food for visualization
            if (foodMatches[0] && foodMatches[0].length > 0) {
              await AsyncStorage.setItem(DETECTED_FOOD_KEY, foodMatches[0]);
              console.log('Set detected food in AsyncStorage:', foodMatches[0]);
              
              // We've identified food in the recognize step, now complete it
              // to make way for the search step
              setTimeout(async () => {
                await completeStep(STEP_RECOGNIZE);
                setTimeout(async () => {
                  await activateStep(STEP_SEARCH);
                }, 500);
              }, MIN_RECOGNIZE_DURATION);
            }
            
            // Add brand information if available from structured format
            let brandInfo = '';
            if (formattedData['Brand/Restaurant'] && 
                formattedData['Brand/Restaurant'] !== 'None visible' && 
                !formattedData['Brand/Restaurant'].includes('None')) {
              brandInfo = formattedData['Brand/Restaurant'] + ' ';
            }
            
            // Create nutritional search queries for each food item, including brand if available
            const queries = foodMatches.map(item => `nutrition facts for ${brandInfo}${item}`);
            
            // Store search queries for visualization
            if (globalSearchTrackingFn) {
              globalSearchTrackingFn(queries, []);
            }
            
            // Directly store to AsyncStorage for visualization
            await storeSearchData(queries, []);
          }
        }
        
        messages.push({
          role: "assistant",
          content: [textContent],
        });
      }
    }
    
    // Process any tool calls (up to 3 iterations)
    let iterations = 0;
    let currentResponse = initialResponse;
    const maxIterations = 3;
    
    // Check for tool calls and process them
    while (currentResponse.tool_calls && currentResponse.tool_calls.length > 0 && iterations < maxIterations) {
      iterations++;
      console.log(`Processing tool call iteration ${iterations}`);
      
      // Process each tool call
      for (const toolCall of currentResponse.tool_calls) {
        if (toolCall.type !== 'function' || toolCall.function.name !== 'search_web') continue;
        
        // Track the search query
        try {
          const args = JSON.parse(toolCall.function.arguments);
          if (args.query) {
            searchInfo.queries.push(args.query);
            
            // Call handleSearchTracking if available
            if (globalSearchTrackingFn && typeof globalSearchTrackingFn === 'function') {
              globalSearchTrackingFn([args.query], []);
            }
            
            // Make sure we're in search step when actively performing searches
            const currentStep = await AsyncStorage.getItem(PROCESSING_STEP_KEY);
            if (currentStep !== STEP_SEARCH && currentStep === STEP_RECOGNIZE) {
              // Complete recognize step and move to search step
              await completeStep(STEP_RECOGNIZE);
              await activateStep(STEP_SEARCH);
            }
          }
        } catch (e) {
          console.error("Error parsing tool arguments:", e);
        }
        
        // Perform the web search
        const searchResult = await processWebSearchToolCall(toolCall);
        console.log('Search result:', searchResult);
        
        // Track the search results
        if (searchResult.results && Array.isArray(searchResult.results)) {
          searchInfo.results.push(...searchResult.results);
          
          // Call handleSearchTracking if available
          if (globalSearchTrackingFn && typeof globalSearchTrackingFn === 'function') {
            globalSearchTrackingFn([], searchResult.results);
          }
          
          // After processing search results, we should be transitioning to process step
          const currentStep = await AsyncStorage.getItem(PROCESSING_STEP_KEY);
          if (currentStep === STEP_SEARCH) {
            // Complete search step and move to process step
            setTimeout(async () => {
              await completeStep(STEP_SEARCH);
              await activateStep(STEP_PROCESS);
            }, MIN_SEARCH_DURATION);
          }
        }
        
        // Add the search result to the messages
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: "search_web",
          content: JSON.stringify(searchResult),
        });
      }
      
      // Continue the conversation with the search results
      currentResponse = await anthropic.messages.create({
        model: actualModel,
        max_tokens: 4096,
        temperature: 0.4,
        system: systemPrompts.searchMode(hasDrawing, barcodeData),
        messages: messages,
        tools: [
          {
            name: "search_web",
            description: "Search the web for information related to food nutrition",
            input_schema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query to find nutrition information"
                }
              },
              required: ["query"]
            }
          }
        ]
      });
      
      console.log(`Anthropic response iteration ${iterations}:`, JSON.stringify(currentResponse, null, 2));
      
      // Add the assistant's response to messages for potential next iteration
      if (currentResponse.content) {
        const textContent = currentResponse.content.find(item => item.type === 'text');
        if (textContent) {
          messages.push({
            role: "assistant",
            content: [textContent],
          });
        }
      }
    }
    
    // Make sure we move to process step if we have search results
    const currentStep = await AsyncStorage.getItem(PROCESSING_STEP_KEY);
    if (searchInfo.results.length > 0 && currentStep === STEP_SEARCH) {
      await completeStep(STEP_SEARCH);
      await activateStep(STEP_PROCESS);
    }
    
    // Final request specifically asking for JSON response
    const finalPrompt = `Based on your analysis and the search results, let's take a careful approach to finalizing your response:

<reflection>
1. Review the image one more time and consider all visual details:
   - Did you correctly identify the specific food/drink and its branding?
   - Have you accurately estimated portion size using visual references?
   - Are there any packaging details or logos that provide definitive identification?

2. Review your search results:
   - Did you find nutritional information for the exact product shown?
   - How confident are you in the accuracy of your nutritional estimates?
   - Are there any discrepancies between different sources that need resolution?

3. Consider accuracy of your assessment:
   - How certain are you about the food identification?
   - How precise is your portion size estimation?
   - Are there any assumptions you're making that could be wrong?
</reflection>

Now, provide the complete nutritional information in the JSON format exactly as specified. The response should start with { and end with } without any other text before or after. Don't use markdown code blocks.`;
    
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: finalPrompt
        }
      ]
    });
    
    // Transition to result step before final response
    await completeStep(await AsyncStorage.getItem(PROCESSING_STEP_KEY) || STEP_PROCESS);
    await activateStep(STEP_RESULT);
    
    // Get the final JSON response
    const finalResponse = await anthropic.messages.create({
      model: actualModel,
      max_tokens: 4096,
      temperature: 0.3,
      system: systemPrompts.searchMode(hasDrawing, barcodeData),
      messages: messages
    });
    
    console.log('Final response:', JSON.stringify(finalResponse, null, 2));
    
    // Extract the response text
    let jsonString = '';
    if (finalResponse.content && finalResponse.content.length > 0) {
      const textContent = finalResponse.content.find(item => item.type === 'text');
      if (textContent) {
        jsonString = textContent.text;
      }
    }
    
    console.log('Final raw text:', jsonString);
    
    // Clean up the JSON string - remove any markdown code blocks
    if (jsonString.includes('```json')) {
      jsonString = jsonString.replace(/```json\n|\n```|```/g, '');
    } else if (jsonString.includes('```')) {
      jsonString = jsonString.replace(/```\n|\n```|```/g, '');
    }
    
    // Extract the JSON object if it's surrounded by other text
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }
    
    console.log('Cleaned JSON string:', jsonString);
    
    try {
      const parsedData = JSON.parse(jsonString);
      console.log('Parsed nutritional data from web search:', parsedData);
      
      // Immediately mark data as processed to trigger API completion process
      parsedData._isProcessingComplete = true;
      
      // Activate the result step as early as possible
      const currentStep = await AsyncStorage.getItem(PROCESSING_STEP_KEY);
      if (currentStep !== STEP_RESULT) {
        if (currentStep === STEP_PROCESS) {
          await completeStep(STEP_PROCESS);
        }
        await activateStep(STEP_RESULT);
      }
      
      // Add the search queries and results to the data
      if (!parsedData.details) {
        parsedData.details = {};
      }
      
      // Add search info directly to the data for tracking
      parsedData._searchInfo = searchInfo;
      
      if (searchInfo.queries.length > 0 || searchInfo.results.length > 0) {
        // If no sources in the response, add them from our collected data
        if (!parsedData.details.sources || !Array.isArray(parsedData.details.sources) || parsedData.details.sources.length === 0) {
          parsedData.details.sources = searchInfo.results.map(result => ({
            title: result.title || 'Search Result',
            url: result.url || '',
            snippet: result.snippet || ''
          }));
        }
      }
      
      if (parsedData && parsedData.food) {
        // Make sure we have enough results info for step visualization
        if (searchInfo.results.length === 0) {
          // Create dummy result if none exists
          parsedData._searchInfo.results = [
            { title: "Nutritional Database", url: "https://nutrition-database.org", snippet: "Found nutrition information for the detected food." }
          ];
          
          // Update in AsyncStorage for visualization - do this after step transitions
          await storeSearchData([], parsedData._searchInfo.results);
        }
        
        // IMPORTANT: handleSuccessfulScan will trigger handleApiCompletion via wrappedHandler
        foodFound = await handleSuccessfulScan(parsedData, imageUri, barcodeData, hasDrawing, selectedModel);
      } else if (jsonString.includes("No Food Found") || jsonString.includes("{No Food Found.}")) {
        console.log("No food found in the image");
        setNoFoodFound(true);
        setFoodData(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setActiveTab('');
        
        // Activate the result step but use a timer for completion
        const currentStep = await AsyncStorage.getItem(PROCESSING_STEP_KEY);
        if (currentStep !== STEP_RESULT) {
          if (currentStep === STEP_PROCESS) {
            await completeStep(STEP_PROCESS);
          }
          await activateStep(STEP_RESULT);
        }
        
        // For no food found case, complete the step after a timer
        setTimeout(async () => {
          await completeStep(STEP_RESULT);
          // Mark API as finished
          await AsyncStorage.setItem(API_FINISHED_KEY, 'true');
        }, MIN_RESULT_DURATION);
        
        foodFound = false;
      } else {
        throw new Error("Parsed data is missing required properties.");
      }
    } catch (parseError) {
      console.error("Error parsing JSON response (web search mode):", parseError);
      console.error("Failed content:", jsonString);
      
      // Attempt to create a minimal valid response as fallback
      try {
        // Create a simple fallback response
        const fallbackResponse = {
          food: {
            name: "Unknown Food",
            class: "Unknown",
            type: "Unknown",
            calories: { amount: 0, marginOfErrorPercent: 50 },
            proteins: { amount: 0, marginOfErrorPercent: 50 },
            carbohydrates: { amount: 0, marginOfErrorPercent: 50 },
            fats: { amount: 0, marginOfErrorPercent: 50 },
            fiber: { amount: 0, marginOfErrorPercent: 50 },
            sodium: { amount: 0, marginOfErrorPercent: 50 },
            sugar: { amount: 0, marginOfErrorPercent: 50 },
            servingSize: { amount: 1, unit: "serving" },
            ingredients: []
          },
          details: {
            summaryText: "Error processing search results, unable to determine nutrition information.",
            sources: searchInfo.results.map(result => ({
              title: result.title || 'Search Result',
              url: result.url || '',
              snippet: result.snippet || ''
            }))
          },
          _searchInfo: searchInfo,
          _isProcessingComplete: true // Mark as complete for visualization
        };
        
        // Immediately activate the result step for fastest user feedback
        const currentStep = await AsyncStorage.getItem(PROCESSING_STEP_KEY);
        if (currentStep !== STEP_RESULT) {
          if (currentStep === STEP_RECOGNIZE) {
            await completeStep(STEP_RECOGNIZE);
            await activateStep(STEP_SEARCH);
            await completeStep(STEP_SEARCH);
            await activateStep(STEP_PROCESS);
            await completeStep(STEP_PROCESS);
          } else if (currentStep === STEP_SEARCH) {
            await completeStep(STEP_SEARCH);
            await activateStep(STEP_PROCESS);
            await completeStep(STEP_PROCESS);
          } else if (currentStep === STEP_PROCESS) {
            await completeStep(STEP_PROCESS);
          }
          
          // Finally activate the result step
          await activateStep(STEP_RESULT);
        }
        
        // Make sure we have enough results info for step visualization
        if (searchInfo.results.length === 0) {
          // Create dummy result if none exists
          fallbackResponse._searchInfo.results = [
            { title: "Error Processing Results", url: "https://nutrition-database.org", snippet: "Error occurred while processing nutrition information." }
          ];
          
          // Update in AsyncStorage for visualization - do this after step transitions
          await storeSearchData([], fallbackResponse._searchInfo.results);
        }
        
        // Log the fallback response and alert the user
        console.log("Using fallback response:", fallbackResponse);
        Alert.alert(
          "Processing Error", 
          "There was an error processing the response. Basic information will be shown instead."
        );
        
        foodFound = await handleSuccessfulScan(fallbackResponse, imageUri, barcodeData, hasDrawing, selectedModel);
      } catch (fallbackError) {
        console.error("Error creating fallback response:", fallbackError);
        handleError(parseError, imageUri, barcodeData);
        
        // Get the current step and update visualization state
        try {
          const currentStep = await AsyncStorage.getItem(PROCESSING_STEP_KEY);
          
          // If we're not at the result step yet, make sure we complete the current step
          // and transition to result
          if (currentStep !== STEP_RESULT) {
            if (currentStep === STEP_RECOGNIZE) {
              await completeStep(STEP_RECOGNIZE);
              await activateStep(STEP_SEARCH);
              await completeStep(STEP_SEARCH);
              await activateStep(STEP_PROCESS);
              await completeStep(STEP_PROCESS);
            } else if (currentStep === STEP_SEARCH) {
              await completeStep(STEP_SEARCH);
              await activateStep(STEP_PROCESS);
              await completeStep(STEP_PROCESS);
            } else if (currentStep === STEP_PROCESS) {
              await completeStep(STEP_PROCESS);
            }
            
            // Finally activate the result step
            await activateStep(STEP_RESULT);
          }
          
          // Complete the result step after a timer
          setTimeout(async () => {
            await completeStep(STEP_RESULT);
            await AsyncStorage.setItem(API_FINISHED_KEY, 'true');
          }, MIN_RESULT_DURATION);
        } catch (asyncError) {
          console.error('Error setting step transitions on error:', asyncError);
          await AsyncStorage.setItem(API_FINISHED_KEY, 'true');
        }
        
        foodFound = false;
      }
    }
    
    return foodFound;
  } catch (error) {
    console.error('Error in handleAnthropicWebSearch:', error);
    handleError(error, imageUri, barcodeData);
    
    // Get the current step and update visualization state
    try {
      const currentStep = await AsyncStorage.getItem(PROCESSING_STEP_KEY);
      
      // If we're not at the result step yet, make sure we complete the current step
      // and transition to result
      if (currentStep !== STEP_RESULT) {
        if (currentStep === STEP_RECOGNIZE) {
          await completeStep(STEP_RECOGNIZE);
          await activateStep(STEP_SEARCH);
          await completeStep(STEP_SEARCH);
          await activateStep(STEP_PROCESS);
          await completeStep(STEP_PROCESS);
        } else if (currentStep === STEP_SEARCH) {
          await completeStep(STEP_SEARCH);
          await activateStep(STEP_PROCESS);
          await completeStep(STEP_PROCESS);
        } else if (currentStep === STEP_PROCESS) {
          await completeStep(STEP_PROCESS);
        }
        
        // Finally activate the result step
        await activateStep(STEP_RESULT);
      }
      
      // Complete the result step after a timer
      setTimeout(async () => {
        await completeStep(STEP_RESULT);
        await AsyncStorage.setItem(API_FINISHED_KEY, 'true');
      }, MIN_RESULT_DURATION);
    } catch (asyncError) {
      console.error('Error setting step transitions on error:', asyncError);
      await AsyncStorage.setItem(API_FINISHED_KEY, 'true');
    }
    
    return false;
  }
};

/**
 * Handles web search using OpenAI's API
 */
const handleOpenAIWebSearch = async ({
  selectedModel,
  selectedMode,
  base64Image,
  barcodeData,
  hasDrawing,
  apiKey,
  handleSuccessfulScan,
  handleError,
  handleSearchTracking,
  imageUri,
  startTimeRef,
  updateAverageProcessingTime,
  isFirstDayUnlimited,
  isSubscribed,
  setNoFoodFound,
  setFoodData,
  setActiveTab,
}) => {
  try {
    const searchInfo = {
      queries: [],
      results: []
    };
    
    // This is a placeholder for future implementation
    console.log('OpenAI web search not yet fully implemented');
    
    // Create a fallback response
    const fallbackResponse = {
      food: {
        name: "OpenAI Search Implementation Required",
        class: "Unknown",
        type: "Unknown",
        calories: { amount: 0, marginOfErrorPercent: 50 },
        proteins: { amount: 0, marginOfErrorPercent: 50 },
        carbohydrates: { amount: 0, marginOfErrorPercent: 50 },
        fats: { amount: 0, marginOfErrorPercent: 50 },
        fiber: { amount: 0, marginOfErrorPercent: 50 },
        sodium: { amount: 0, marginOfErrorPercent: 50 },
        sugar: { amount: 0, marginOfErrorPercent: 50 },
        servingSize: { amount: 1, unit: "serving" },
        ingredients: []
      },
      details: {
        summaryText: "OpenAI web search functionality requires implementation.",
        sources: []
      },
      _searchInfo: searchInfo
    };
    
    Alert.alert(
      "Not Fully Implemented", 
      "OpenAI web search functionality is not yet fully implemented."
    );
    
    // Return false to indicate no food was found
    return false;
  } catch (error) {
    console.error('Error in handleOpenAIWebSearch:', error);
    handleError(error, imageUri, barcodeData);
    return false;
  }
};

/**
 * Handles web search using Gemini's API
 */
const handleGeminiWebSearch = async ({
  selectedModel,
  selectedMode,
  base64Image,
  barcodeData,
  hasDrawing,
  apiKey,
  handleSuccessfulScan,
  handleError,
  handleSearchTracking,
  imageUri,
  startTimeRef,
  updateAverageProcessingTime,
  isFirstDayUnlimited,
  isSubscribed,
  setNoFoodFound,
  setFoodData,
  setActiveTab,
}) => {
  try {
    const searchInfo = {
      queries: [],
      results: []
    };
    
    // This is a placeholder for future implementation
    console.log('Gemini web search not yet fully implemented');
    
    // Create a fallback response
    const fallbackResponse = {
      food: {
        name: "Gemini Search Implementation Required",
        class: "Unknown",
        type: "Unknown",
        calories: { amount: 0, marginOfErrorPercent: 50 },
        proteins: { amount: 0, marginOfErrorPercent: 50 },
        carbohydrates: { amount: 0, marginOfErrorPercent: 50 },
        fats: { amount: 0, marginOfErrorPercent: 50 },
        fiber: { amount: 0, marginOfErrorPercent: 50 },
        sodium: { amount: 0, marginOfErrorPercent: 50 },
        sugar: { amount: 0, marginOfErrorPercent: 50 },
        servingSize: { amount: 1, unit: "serving" },
        ingredients: []
      },
      details: {
        summaryText: "Gemini web search functionality requires implementation.",
        sources: []
      },
      _searchInfo: searchInfo
    };
    
    Alert.alert(
      "Not Fully Implemented", 
      "Gemini web search functionality is not yet fully implemented."
    );
    
    // Return false to indicate no food was found
    return false;
  } catch (error) {
    console.error('Error in handleGeminiWebSearch:', error);
    handleError(error, imageUri, barcodeData);
    return false;
  }
};

export default {
  handleWebSearch,
  handleAnthropicWebSearch,
  handleOpenAIWebSearch,
  handleGeminiWebSearch,
  performWebSearch
}; 