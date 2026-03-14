import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { systemPrompts } from './prompts';
import { getModel } from './models';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventRegister } from 'react-native-event-listeners';

// --- START HELPER FUNCTIONS ---

/**
 * Decodes basic HTML entities.
 * @param {string} text Text with potential HTML entities.
 * @returns {string} Text with entities decoded.
 */
const decodeHtmlEntities = (text) => {
  if (!text) return '';
  // Basic decoding for common entities
  return text.replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'")
             .replace(/&nbsp;/g, ' ');
};

/**
 * Extracts plain text from raw HTML, cleans it, and limits its length.
 * @param {string} html Raw HTML string.
 * @param {number} maxLength Maximum length of the returned text.
 * @returns {string} Cleaned plain text content.
 */
const extractAndCleanText = (html, maxLength = 15000) => {
  if (!html) return '';
  try {
    // 1. Remove script and style blocks
    let text = html.replace(/<script[^>]*>.*?<\/script>/gis, ' ');
    text = text.replace(/<style[^>]*>.*?<\/style>/gis, ' ');
    // 2. Remove remaining HTML tags - replace with space
    text = text.replace(/<[^>]*>/g, ' ');
    // 3. Decode HTML entities
    text = decodeHtmlEntities(text);
    // 4. Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();
    // 5. Limit length
    return text.substring(0, maxLength);
  } catch (error) {
    console.error('Error extracting text from HTML:', error);
    return '';
  }
};

/**
 * Uses the passed scrapeUrl function (from WebScraperContext) to fetch rendered HTML.
 * @param {string} url The URL to scrape.
 * @param {function} scrapeUrl The function provided by useWebScraper().scrapeUrl.
 * @returns {Promise<string|null>} Rendered HTML content or null on error/failure.
 */
const fetchUrlWithWebView = async (url, scrapeUrl) => {
  if (!scrapeUrl || typeof scrapeUrl !== 'function') {
    console.error('fetchUrlWithWebView: scrapeUrl function is missing or invalid.');
    throw new Error('Scraping function not available.');
  }
  if (!url || typeof url !== 'string') {
      console.error('fetchUrlWithWebView: Invalid URL provided.');
      throw new Error('Invalid URL for scraping.');
  }

  // Basic check for non-HTTP URLs
  if (!url.startsWith('http')) {
     console.warn(`fetchUrlWithWebView: Skipping non-HTTP URL: ${url}`);
     return null;
  }

  try {
    console.log(`fetchUrlWithWebView: Requesting scrape for ${url}`);
    const renderedHtml = await scrapeUrl(url);
    console.log(`fetchUrlWithWebView: Received HTML (${renderedHtml ? renderedHtml.length : 'null'} bytes) for ${url}`);
    // Ensure empty string is treated as null/failure for consistency
    return renderedHtml && renderedHtml.length > 0 ? renderedHtml : null;
  } catch (error) {
    console.error(`fetchUrlWithWebView: Error scraping ${url}:`, error.message);
    // Return null to indicate failure, allow caller to handle
    return null;
  }
};

// --- END HELPER FUNCTIONS ---

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
const BRAVE_SEARCH_API_KEY = process.env.EXPO_PUBLIC_BRAVE_SEARCH_API_KEY || '';

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
    console.log('Performing Brave web search for:', query);

    if (!BRAVE_SEARCH_API_KEY) {
      console.warn('Brave Search API key is not configured.');
      return [
        {
          title: 'Brave Search API key missing',
          url: 'https://api.search.brave.com/',
          snippet: 'Set EXPO_PUBLIC_BRAVE_SEARCH_API_KEY before using web search features.'
        }
      ];
    }

    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: { 
        q: query, 
        count: 5, // Limit to 5 results, similar to previous implementation
        summary: true, // Request summary from Brave API
        extra_snippets: true // Request extra snippets from Brave API
      },
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_SEARCH_API_KEY
      }
    });
    
    // Log the raw response structure for debugging if needed
    // console.log('Brave API Response:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.web && Array.isArray(response.data.web.results)) {
      return response.data.web.results.map(item => ({
        title: item.title,
        url: item.url,
        // Use description as snippet, fallback to title if description is missing
        snippet: item.description || item.title,
        // Include extra snippets and summary if available
        extra_snippets: item.extra_snippets || [],
        page_age: item.page_age // Include page age if available
      }));
    } else {
      console.warn('Brave API did not return results in the expected format.');
      return [];
    }
    
  } catch (error) {
    console.error('Error performing Brave web search:', error.response ? error.response.data : error.message);
    // Return a minimal set of results on error
    return [
      {
        title: 'Error fetching search results via Brave API',
        url: 'https://brave.com/search/api/',
        snippet: `Could not retrieve search results due to an error: ${error.message}`
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
 * Uses the passed scrapeUrl function (from WebScraperContext) to fetch rendered HTML.
 * @param {string} url The URL to scrape.
 * @param {function} scrapeUrl The function provided by useWebScraper().scrapeUrl.
 * @returns {Promise<string|null>} Rendered HTML content or null on error/failure.
 */

/**
 * Implements web scraping and summarization functionality.
 * @param {Object} toolCall The tool call object from the model
 * @param {Anthropic} anthropic The Anthropic client instance
 * @param {string} model The AI model name to use for summarization
 * @param {function} scrapeUrl The function provided by useWebScraper().scrapeUrl.
 * @returns {Promise<Object>} The search query and summarized nutritional content.
 */
const processWebSearchToolCall = async (toolCall, anthropic, model, scrapeUrl) => {
  try {
    console.log('Processing web search tool call:', JSON.stringify(toolCall, null, 2));
    
    // Extract search query from tool call
    const query = toolCall.input.query;
    console.log('Search query:', query);
    
    // Update the search visualization
    if (globalSearchTrackingFn) {
      globalSearchTrackingFn([query], []);
    }
    
    // Store search data for visualization
    await storeSearchData([query], []);
    
    // Activate the search step if not already active
    const currentStep = await AsyncStorage.getItem(PROCESSING_STEP_KEY);
    if (currentStep !== STEP_SEARCH) {
      await activateStep(STEP_SEARCH);
    }
    
    // Extract food from query for visualization
    await extractFoodFromQuery(query);
    
    // Perform the web search using the correct function
    console.log('Performing web search');
    const searchResults = await performWebSearch(query);
    
    // *** ADD CANCELLATION CHECK ***
    if (global.NUTRILENS_CANCEL_SEARCH === true) {
      console.log('[CANCEL] Web search cancelled after search.');
      throw new Error("Scan cancelled by user.");
    }
    // *** END CANCELLATION CHECK ***
    
    // Check if we have valid search results
    if (!searchResults || searchResults.length === 0) {
      console.log('No search results found');
      return { 
        summarized_content: `No search results found for query: "${query}"`,
        content_found: false,
        processed_urls: []
      };
    }
    
    // Extract URLs from search results
    const urls = searchResults.map(result => result.url);
    console.log('Search URLs:', urls);
    
    // Update search visualization with URLs
    if (globalSearchTrackingFn) {
      globalSearchTrackingFn([query], searchResults);
    }
    
    // Store updated search data
    await storeSearchData([query], searchResults);
    
    // Activate the process step if not already active
    if (currentStep !== STEP_PROCESS) {
      await activateStep(STEP_PROCESS);
    }
    
    // Validate scrapeUrl is available
    if (!scrapeUrl || typeof scrapeUrl !== 'function') {
      console.error("CRITICAL: scrapeUrl function is not available!");
      return {
        summarized_content: `Error: Could not scrape web content for "${query}" - Scraping functionality not available.`,
        content_found: false,
        processed_urls: urls
      };
    }
    
    // Now scrape the top results to get rendered HTML
    console.log('Scraping top search results to get rendered content');
    let combinedContent = '';
    const processedUrls = [];
    const MAX_URLS_TO_SCRAPE = 2; // Limit to top 2 results for performance
    
    for (let i = 0; i < Math.min(MAX_URLS_TO_SCRAPE, searchResults.length); i++) {
      const url = searchResults[i].url;
      try {
        // Use fetchUrlWithWebView which handles the scraping
        console.log(`Scraping URL (${i+1}/${Math.min(MAX_URLS_TO_SCRAPE, searchResults.length)}): ${url}`);
        const renderedHtml = await fetchUrlWithWebView(url, scrapeUrl);
        
        // *** ADD CANCELLATION CHECK ***
        if (global.NUTRILENS_CANCEL_SEARCH === true) {
          console.log('[CANCEL] Web search cancelled during scraping.');
          throw new Error("Scan cancelled by user.");
        }
        // *** END CANCELLATION CHECK ***
        
        if (renderedHtml) {
          // Extract plain text from HTML
          const extractedText = extractAndCleanText(renderedHtml, 15000);
          if (extractedText && extractedText.length > 100) { // Ensure we have substantial content
            combinedContent += `--- SOURCE: ${url} ---\n${extractedText}\n\n`;
            processedUrls.push(url);
            console.log(`Successfully scraped and extracted ${extractedText.length} chars from ${url}`);
          } else {
            console.log(`Skipping URL ${url} - insufficient text content extracted`);
          }
        } else {
          console.log(`Failed to scrape URL: ${url}`);
        }
      } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
      }
    }
    
    // Check if we have any scraped content
    if (!combinedContent || combinedContent.length < 200) { // Minimum content threshold
      console.log('No useful content extracted from scraped pages');
      return {
        summarized_content: `Searched web for "${query}" but could not extract useful content from the pages. The pages may use JavaScript rendering or require login.`,
        content_found: false,
        processed_urls: processedUrls
      };
    }
    
    console.log(`Successfully scraped ${processedUrls.length} URLs with total content length: ${combinedContent.length} chars`);
    
    return {
      summarized_content: combinedContent,
      content_found: true,
      processed_urls: processedUrls
    };
  } catch (error) {
    console.error('Error in processWebSearchToolCall:', error);
    return {
      summarized_content: `Error processing web search: ${error.message}`,
      content_found: false,
      processed_urls: []
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
  scrapeUrl,
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
            scrapeUrl,
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
            scrapeUrl,
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
            scrapeUrl,
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
 * Handles web search using Anthropic's API (Agentic Loop Version)
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
  scrapeUrl,
}) => {
  try {
    // *** ADD CANCELLATION CHECK ***
    if (global.NUTRILENS_CANCEL_SEARCH === true) {
      console.log('[CANCEL] Anthropic agentic search cancelled at start.');
      handleError(new Error("Scan cancelled by user."), imageUri, barcodeData);
      return false;
    }
    // *** END CANCELLATION CHECK ***

    const anthropic = new Anthropic({ apiKey });
    let foodFound = false;
    const searchInfo = { // To store URLs for fallback
      queries: [],
      results: [] // Store as { url: string, title?: string }
    };
    
    // Ensure we have a valid model string
    const actualModel = selectedModel || 'claude-3-5-haiku-latest';
    console.log("Using agentic search mode with Anthropic model:", actualModel);
    
    // --- Tool Definitions ---
    const toolDefinitions = [
      {
        name: "web_search", // KEEP THE ORIGINAL NAME for compatibility
        description: "Use this tool to perform focused web searches for specific food nutrition details, with automatic scraping of rendered web content.",
        input_schema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The specific search query for nutrition details. Accepts search filters (e.g., 'site:nutritionix.com [food name]')"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "submit_nutrition_data",
        description: "Submit all gathered nutrition data. Will error if any required fields are missing.",
        input_schema: {
          type: "object",
          properties: {
            food_name: {
              type: "string",
              description: "The final identified name of the food item."
            },
            serving_size: {
              type: "string", 
              description: "The serving size (e.g., '100g', '1 cup', '1 container')."
            },
            calories: {
              type: "object",
              description: "Calories per serving, including amount and margin of error.",
              properties: {
                amount: { type: "number" },
                marginOfErrorPercent: { type: "number" }
              },
              required: ["amount", "marginOfErrorPercent"]
            },
            protein_g: {
              type: "object",
              description: "Protein in grams per serving, including amount and margin of error.",
              properties: {
                amount: { type: "number" },
                marginOfErrorPercent: { type: "number" }
              },
              required: ["amount", "marginOfErrorPercent"]
            },
            carbs_g: {
              type: "object",
              description: "Total carbs in grams per serving, including amount and margin of error.",
              properties: {
                amount: { type: "number" },
                marginOfErrorPercent: { type: "number" }
              },
              required: ["amount", "marginOfErrorPercent"]
            },
            fat_g: {
              type: "object",
              description: "Total fat in grams per serving, including amount and margin of error.",
              properties: {
                amount: { type: "number" },
                marginOfErrorPercent: { type: "number" }
              },
              required: ["amount", "marginOfErrorPercent"]
            },
            fiber_g: {
              type: "object",
              description: "Dietary fiber in grams per serving (use 0 if not found), including amount and margin of error.",
              properties: {
                amount: { type: "number" },
                marginOfErrorPercent: { type: "number" }
              },
              required: ["amount", "marginOfErrorPercent"]
            },
            sugar_g: {
              type: "object",
              description: "Sugar in grams per serving (use 0 if not found), including amount and margin of error.",
              properties: {
                amount: { type: "number" },
                marginOfErrorPercent: { type: "number" }
              },
              required: ["amount", "marginOfErrorPercent"]
            },
            sodium_mg: {
              type: "object",
              description: "Sodium in milligrams per serving (use 0 if not found), including amount and margin of error.",
              properties: {
                amount: { type: "number" },
                marginOfErrorPercent: { type: "number" }
              },
              required: ["amount", "marginOfErrorPercent"]
            },
            ingredients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "The name of the ingredient." },
                  description: { type: "string", description: "A brief description or clarification of the ingredient, if available." }
                },
                required: ["name"]
              },
              description: "List of ingredient objects (name required, description optional). Use an empty array [] if not found."
            },
            source_urls: {
              type: "array",
              items: { type: "string" },
              description: "List of the primary URLs where the nutritional data was found."
            },
            // NEW: Add summary_text field
            summary_text: {
              type: "string",
              description: "A concise, natural-language summary of the key nutritional findings (e.g., 'This food is high in calories and sugar, but a good source of protein.')."
            },
            // NEW: Add is_reputable_source field
            is_reputable_source: {
              type: "boolean",
              description: "Set to true if the final nutrition data comes directly from a reputable source (e.g., manufacturer website, USDA database), false otherwise."
            }
          },
          // Require core nutritional info AND summary text AND source flag for submission
          required: ["food_name", "serving_size", "calories", "protein_g", "carbs_g", "fat_g", "summary_text", "is_reputable_source"]
        }
      }
    ];

    // --- Initial Prompt ---
    const initialUserMessage = {
      role: "user",
      content: [
        {
          type: "text",
          text: `
Identify the food shown in the image. Wrap the food name in <foodname> tags.

Then, using the 'web_search' tool (up to 10 attempts), gather every required nutrition field:
- Serving size
- Calories
- Protein (g)
- Carbs (g)
- Fat (g)
- Fiber (g)
- Sugar (g)
- Sodium (mg)
- Full ingredients list (including descriptions if available)

Strategy:
• First query brand names or specific product codes.
• If brand not clear, search generic databases (USDA, Wikipedia).
• After each search, verify all fields are present; if not, refine your query.
• **Assess source reliability:** Determine if the data comes directly from a reputable source (manufacturer, USDA). \n• **If you encounter domains (like mcdonalds.com) that return no usable data due to JS rendering, add a site exclusion filter** (e.g., 'NOT site:mcdonalds.com').
• Stop when complete or after 10 searches.

On completion, call 'submit_nutrition_data' with:
- The plain food name (no tags)
- Set \`is_reputable_source\` to true/false based on your assessment.
- All numeric fields as objects: \`{ amount: number, marginOfErrorPercent: number }\`. \n  - Use \`marginOfErrorPercent: 0\` if \`is_reputable_source\` is true.\n  - Use \`marginOfErrorPercent: 20\` if \`is_reputable_source\` is false or uncertain.\n  - Use amount 0 if a value isn't found.
- Ingredients as an array of objects [{ name: \"...\", description: \"...\" }, ...], using null or omitting description if not found.
- A concise, natural-language summary_text of the key findings.
- The scraped URLs as source_urls.
`
        },
        {
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: base64Image },
        },
      ],
    };

    // --- Initial API Call --- 
    // *** ADD CANCELLATION CHECK ***
    if (global.NUTRILENS_CANCEL_SEARCH === true) {
      console.log('[CANCEL] Anthropic agentic search cancelled before initial API call.');
      handleError(new Error("Scan cancelled by user."), imageUri, barcodeData);
      return false;
    }
    // *** END CANCELLATION CHECK ***
    
    console.log('Making initial API call to Anthropic agent...');
    const initialResponse = await anthropic.messages.create({
      model: actualModel,
      max_tokens: 4096,
      temperature: 0.7, // Moderate temp for initial analysis + first search query generation
      system: `
You are an autonomous food-analysis agent.
Your mission is to:
1) Detect the food in the image.
2) Use the 'web_search' tool to get nutrition information. This tool now automatically scrapes and analyzes websites for you.
3) Execute iterative searches if needed.
4) Submit full nutrition facts through 'submit_nutrition_data'.

**Important**: The 'web_search' tool will search the web AND scrape the content from search results. You'll receive TEXT CONTENT from the websites, which you should analyze to find nutrition data.

If certain websites don't yield useful information, try different search queries or target specific nutrition databases in your next search.
Follow tool descriptions exactly. Ensure completeness before submission.
`,
      messages: [initialUserMessage],
      tools: toolDefinitions
    });
    console.log('Anthropic initial agent response:', JSON.stringify(initialResponse, null, 2));

    // --- Agentic Loop ---
    let messages = [initialUserMessage, { role: "assistant", content: initialResponse.content }];
    let currentResponse = initialResponse;
    let iterations = 0;
    const maxIterations = 5; // Keep iterations reasonable as scraping takes time
    let nutritionSubmitted = false;
    let finalParsedData = null;
    let lastScrapedUrls = []; // Keep track of URLs successfully scraped in the last tool call
    
    // Helper function to check if a response contains the submit_nutrition_data tool call
    const hasNutritionSubmission = (response) => {
        if (!response || !response.content || !Array.isArray(response.content)) {
            return false;
        }
        return response.content.some(item => 
            item.type === 'tool_use' && item.name === 'submit_nutrition_data'
        );
    };
    
    // Helper function to check if response has tool use
    const hasToolUse = (response) => response && response.content && response.content.some(item => item.type === 'tool_use');

    while (hasToolUse(currentResponse) && !nutritionSubmitted && iterations < maxIterations) {
        // *** ADD CANCELLATION CHECK ***
        if (global.NUTRILENS_CANCEL_SEARCH === true) {
            console.log(`[CANCEL] Anthropic agentic search cancelled at iteration ${iterations + 1}.`);
            handleError(new Error("Scan cancelled by user."), imageUri, barcodeData);
            return false;
        }
        // *** END CANCELLATION CHECK ***

        iterations++;
        console.log(`--- Agent Iteration ${iterations}/${maxIterations} ---`);
        const toolCalls = currentResponse.content.filter(item => item.type === 'tool_use');
        const toolResults = [];
        lastScrapedUrls = []; // Reset for this iteration

        // Process tool calls from the assistant's last turn
        for (const toolCall of toolCalls) {
            console.log(`Processing tool: ${toolCall.name}`);

            if (toolCall.name === 'web_search') { // MATCH THE NAME USED IN TOOL DEFINITION
              // Ensure scrapeUrl is passed and is a function
              if (!scrapeUrl || typeof scrapeUrl !== 'function') {
                console.error("CRITICAL: scrapeUrl function was not provided to handleAnthropicWebSearch!");
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolCall.id,
                  content: "Error: The scraping functionality is not available in the app.",
                  is_error: true
                });
                continue; // Skip to next tool call
              }

              const query = toolCall.input.query;
              console.log(`Agent requested search & scrape for query: ${query}`);
              searchInfo.queries.push(query);
              // Update visualization (Queries)
              if (globalSearchTrackingFn) globalSearchTrackingFn(searchInfo.queries, searchInfo.results.map(r => r.url));
              await storeSearchData(searchInfo.queries, []); // Store query immediately

              // 1. Perform Brave Search to get URLs
              let searchResults = [];
              try {
                 searchResults = await performWebSearch(query);
              } catch (searchError) {
                 console.error('Error during Brave search:', searchError);
                 toolResults.push({
                    type: "tool_result",
                    tool_use_id: toolCall.id,
                    content: `Error performing initial web search for query '${query}': ${searchError.message}. Try a different query.`,
                    is_error: true
                 });
                 continue;
              }

              if (!searchResults || searchResults.length === 0) {
                console.log(`No search results found for query: ${query}`);
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolCall.id,
                  content: `No web search results found for query: "${query}". Try a different query.`,
                  is_error: true
                });
                continue;
              }

              // 2. Scrape top results using WebView
              let combinedContent = `Scraped Content for query "${query}":\n\n`;
              const MAX_CONTENT_LENGTH_AGENT = 25000;
              const MAX_CONTENT_PER_PAGE = 12000;
              let scrapeSuccess = false;
              const currentAttemptScrapedUrls = [];

              // Update visualization (Results - URLs found)
              const searchResultUrls = searchResults.map(r => ({ url: r.url, title: r.title }));
              searchInfo.results = [...searchInfo.results, ...searchResultUrls.filter(r => !searchInfo.results.some(existing => existing.url === r.url))];
              if (globalSearchTrackingFn) globalSearchTrackingFn(searchInfo.queries, searchInfo.results.map(r => r.url));
              await storeSearchData(searchInfo.queries, searchInfo.results);

              for (const result of searchResults.slice(0, 2)) { // Scrape top 2 results
                // ... existing cancellation check ...
                try {
                  console.log(`Attempting to scrape URL: ${result.url}`);
                  // Use the helper function which calls the passed scrapeUrl
                  const renderedHtml = await fetchUrlWithWebView(result.url, scrapeUrl);

                  if (renderedHtml) {
                    const textContent = extractAndCleanText(renderedHtml, MAX_CONTENT_PER_PAGE);
                    if (textContent) {
                      console.log(`Successfully scraped and cleaned ${textContent.length} chars from ${result.url}`);
                      if (combinedContent.length + textContent.length < MAX_CONTENT_LENGTH_AGENT) {
                        combinedContent += `--- Source: ${result.url} ---\n${textContent}\n\n`;
                        currentAttemptScrapedUrls.push(result.url); // Add to *this attempt's* list
                        scrapeSuccess = true;
                      } else {
                        console.warn(`Skipping further content from ${result.url} due to length limit.`);
                        if (!scrapeSuccess) scrapeSuccess = true;
                        break;
                      }
                    } else {
                      console.log(`No text content extracted from ${result.url} (HTML was likely sparse or non-textual).`);
                      combinedContent += `--- Source: ${result.url} ---\nNote: Failed to extract meaningful text content after scraping. The page might be structured differently or lack text.\n\n`;
                    }
                  } else {
                    // fetchUrlWithWebView returning null indicates an error or empty result during scrape
                    console.log(`Scraping failed or returned empty content for ${result.url}`);
                    combinedContent += `--- Source: ${result.url} ---\nNote: Failed to scrape this URL. It might require login, be blocked, or timed out.\n\n`;
                  }
                } catch (scrapeError) {
                  // This catch block might be redundant if fetchUrlWithWebView handles errors internally and returns null
                  // but kept for safety.
                  console.error(`Unexpected error during scrape attempt for ${result.url}:`, scrapeError.message);
                  combinedContent += `--- Source: ${result.url} ---\nNote: An unexpected error occurred during scraping: ${scrapeError.message}\n\n`;
                }
              }

              // Update the list of successfully scraped URLs for this iteration
              lastScrapedUrls = currentAttemptScrapedUrls;

              // 3. Return combined content to the agent
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolCall.id,
                content: combinedContent, // Provide the combined text content
                // Signal error only if NO content was successfully scraped/extracted in this attempt
                is_error: !scrapeSuccess
              });

            } else if (toolCall.name === 'submit_nutrition_data') {
                console.log('Submit nutrition data tool called with input:', toolCall.input);
                nutritionSubmitted = true;
                const nutritionData = toolCall.input;

                // Clean the food name
                let cleanedFoodName = nutritionData.food_name || "Unknown Food";
                cleanedFoodName = cleanedFoodName.replace(/<foodname>/gi, '').replace(/<\/foodname>/gi, '').trim();

                // Use the URLs from the *last successful scrape* operation for sources
                const sourcesToSubmit = Array.isArray(nutritionData.source_urls) && nutritionData.source_urls.length > 0
                                      ? nutritionData.source_urls // Prefer agent-provided URLs if valid
                                      : lastScrapedUrls; // Fallback to URLs scraped in the previous step

                // Construct final data structure
                finalParsedData = {
                    food: {
                        name: cleanedFoodName,
                        class: "Food",
                        type: "Unknown", // Consider adding classification later if possible
                        calories: {
                            amount: nutritionData.calories?.amount ?? 0,
                            marginOfErrorPercent: nutritionData.calories?.marginOfErrorPercent ?? 20
                        },
                        proteins: {
                            amount: nutritionData.protein_g?.amount ?? 0,
                            marginOfErrorPercent: nutritionData.protein_g?.marginOfErrorPercent ?? 20
                        },
                        carbohydrates: {
                            amount: nutritionData.carbs_g?.amount ?? 0,
                            marginOfErrorPercent: nutritionData.carbs_g?.marginOfErrorPercent ?? 20
                        },
                        fats: {
                            amount: nutritionData.fat_g?.amount ?? 0,
                            marginOfErrorPercent: nutritionData.fat_g?.marginOfErrorPercent ?? 20
                        },
                        fiber: {
                            amount: nutritionData.fiber_g?.amount ?? 0,
                            marginOfErrorPercent: nutritionData.fiber_g?.marginOfErrorPercent ?? 20
                        },
                        sodium: {
                            amount: nutritionData.sodium_mg?.amount ?? 0,
                            marginOfErrorPercent: nutritionData.sodium_mg?.marginOfErrorPercent ?? 20
                        },
                        sugar: {
                            amount: nutritionData.sugar_g?.amount ?? 0,
                            marginOfErrorPercent: nutritionData.sugar_g?.marginOfErrorPercent ?? 20
                        },
                        servingSize: {
                            amount: parseFloat(nutritionData.serving_size) || 1,
                            unit: nutritionData.serving_size || "serving"
                        },
                        ingredients: Array.isArray(nutritionData.ingredients)
                                     ? nutritionData.ingredients.map(ing => ({ name: ing.name, description: ing.description || null }))
                                     : [],
                    },
                    details: {
                        // Use agent-provided summary, with a fallback
                        summaryText: nutritionData.summary_text || `Nutritional details for ${cleanedFoodName}.`,
                        // sources: sourcesToSubmit.map(url => ({ url: url, title: 'Source (Scraped)' }))
                        // Re-apply correct sources mapping
                        sources: sourcesToSubmit.map(url => {
                           const foundResult = searchInfo.results.find(r => r.url === url);
                           return { url: url, title: foundResult?.title || 'Scraped Source' };
                        })
                    },
                    _isProcessingComplete: true,
                    _searchInfo: searchInfo // Include all queries/URLs attempted
                };

                toolResults.push({
                    type: "tool_result",
                    tool_use_id: toolCall.id,
                    content: `Nutrition data for ${cleanedFoodName} received successfully.`, // Use cleaned name
                    is_error: false
                });

                break; // Break inner loop once submission is handled
            }
        } // End for loop over toolCalls

        // ... (rest of while loop: check submission, push results, make next API call) ...
        if (nutritionSubmitted) {
             messages.push({ role: "user", content: toolResults }); // Add final tool results
             console.log('Nutrition submitted, breaking agent loop.');
            break;
        }

        // Add user message containing results of tool calls for this turn
        messages.push({ role: "user", content: toolResults });

        // --- Make the next API call to the agent ---
        console.log(`Making API call for iteration ${iterations + 1}`);
        // UPDATED Iteration prompt
        let iterationSystemPrompt = `
You are a precision-focused nutrition agent. This is analysis attempt #${iterations + 1} based on scraped web content.
Review the provided TEXT CONTENT from the previous 'web_search' call.
- Extract all required nutrition fields from the text.
- If data is incomplete OR the previous tool call returned an error, call 'web_search' AGAIN with a REFINED query (e.g., different keywords, try 'site:usda.gov', 'site:nutritionix.com', 'site:wikipedia.org').
- Prioritize fields still missing.
- Pay attention to notes in the content about scraping errors for specific URLs and avoid querying sites that failed.

Only submit when all data fields are filled or after ${maxIterations} attempts.
Remember to assess source reliability, set \`is_reputable_source\`, and format numeric values as \`{ amount: ..., marginOfErrorPercent: ... }\` with the correct margin.
`;

        currentResponse = await anthropic.messages.create({
            model: actualModel,
            max_tokens: 4096,
            temperature: 0.4,
            system: iterationSystemPrompt,
            messages: messages,
            tools: toolDefinitions
        });
        console.log(`Anthropic response iteration ${iterations + 1}:`, JSON.stringify(currentResponse, null, 2));

        // Add the assistant's response to the message history
        if (currentResponse.content) {
            messages.push({ role: "assistant", content: currentResponse.content });
        }

        if (hasNutritionSubmission(currentResponse)) {
            console.log('Model indicated nutrition submission in this turn, loop will process it next.');
        }

    } // End of while loop

    // --- Post-Loop Handling (Updated) ---
    // NEW: Check the *last* response for submission, even if the loop terminated due to maxIterations
    if (!nutritionSubmitted && hasNutritionSubmission(currentResponse)) {
        console.log('Processing nutrition submission from the final response after loop termination.');
        const toolCalls = currentResponse.content.filter(item => item.type === 'tool_use');
        for (const toolCall of toolCalls) {
             if (toolCall.name === 'submit_nutrition_data') {
                 // Logic copied from inside the loop's tool processing block
                 console.log('Submit nutrition data tool called with input:', toolCall.input);
                 nutritionSubmitted = true; // Set the flag
                 const nutritionData = toolCall.input;
                 let cleanedFoodName = nutritionData.food_name || "Unknown Food";
                 cleanedFoodName = cleanedFoodName.replace(/<foodname>/gi, '').replace(/<\/foodname>/gi, '').trim();
                 const sourcesToSubmit = Array.isArray(nutritionData.source_urls) && nutritionData.source_urls.length > 0
                                       ? nutritionData.source_urls
                                       : lastScrapedUrls; // Fallback to URLs scraped in the previous step

                 finalParsedData = { // Construct the data
                     food: {
                         name: cleanedFoodName,
                         class: "Food", type: "Unknown",
                         calories: {
                            amount: nutritionData.calories?.amount ?? 0,
                            marginOfErrorPercent: nutritionData.calories?.marginOfErrorPercent ?? 20
                        },
                        proteins: {
                            amount: nutritionData.protein_g?.amount ?? 0,
                            marginOfErrorPercent: nutritionData.protein_g?.marginOfErrorPercent ?? 20
                        },
                        carbohydrates: {
                            amount: nutritionData.carbs_g?.amount ?? 0,
                            marginOfErrorPercent: nutritionData.carbs_g?.marginOfErrorPercent ?? 20
                        },
                        fats: {
                            amount: nutritionData.fat_g?.amount ?? 0,
                            marginOfErrorPercent: nutritionData.fat_g?.marginOfErrorPercent ?? 20
                        },
                        fiber: {
                            amount: nutritionData.fiber_g?.amount ?? 0,
                            marginOfErrorPercent: nutritionData.fiber_g?.marginOfErrorPercent ?? 20
                        },
                        sodium: {
                            amount: nutritionData.sodium_mg?.amount ?? 0,
                            marginOfErrorPercent: nutritionData.sodium_mg?.marginOfErrorPercent ?? 20
                        },
                        sugar: {
                            amount: nutritionData.sugar_g?.amount ?? 0,
                            marginOfErrorPercent: nutritionData.sugar_g?.marginOfErrorPercent ?? 20
                        },
                        servingSize: { amount: parseFloat(nutritionData.serving_size) || 1, unit: nutritionData.serving_size || "serving" },
                        ingredients: Array.isArray(nutritionData.ingredients)
                                     ? nutritionData.ingredients.map(ing => ({ name: ing.name, description: ing.description || null }))
                                     : [],
                     },
                     details: {
                         // Use agent-provided summary, with a fallback
                         summaryText: nutritionData.summary_text || `Nutritional details for ${cleanedFoodName}.`,
                         // sources: sourcesToSubmit.map(url => ({ url: url, title: 'Source (Scraped)' }))
                         // Re-apply correct sources mapping
                         sources: sourcesToSubmit.map(url => {
                            const foundResult = searchInfo.results.find(r => r.url === url);
                            return { url: url, title: foundResult?.title || 'Scraped Source' };
                         })
                     },
                     _isProcessingComplete: true,
                     _searchInfo: searchInfo
                 };
                 console.log('Constructed finalParsedData from post-loop submission check.');
                 break; // Exit this inner loop as we found the submission
             }
        }
    }

    // NOW check the flags (Original post-loop logic, now correctly handles the maxIterations case)
    if (nutritionSubmitted && finalParsedData) {
      console.log('Agent loop finished successfully with nutrition data submission.');
      // Call the success handler with the final data
      foodFound = await handleSuccessfulScan(
            finalParsedData, imageUri, barcodeData, hasDrawing, selectedModel
        );
    } else {
      console.log(`Agent loop finished after ${iterations} iterations without submitting complete nutrition data. Using fallback.`);
      const detectedFood = await AsyncStorage.getItem(DETECTED_FOOD_KEY) || "Unknown Food";

      // Try to get the last assistant message for a potential reason
      const lastMessage = messages[messages.length - 1];
      let reason = `Could not find complete nutritional information for ${detectedFood} after ${iterations} search/scrape attempts.`;
      if (lastMessage && lastMessage.role === 'assistant' && typeof lastMessage.content === 'string') {
         reason = lastMessage.content; // Use model's final words if available
      } else if (lastMessage && lastMessage.role === 'assistant' && Array.isArray(lastMessage.content) && lastMessage.content[0]?.type === 'text') {
         reason = lastMessage.content[0].text; // Use model's final text part if available
      }

      const fallbackResponse = {
        food: {
          name: detectedFood,
          class: "Food", type: "Unknown",
          calories: { amount: 0, marginOfErrorPercent: 100 }, proteins: { amount: 0, marginOfErrorPercent: 100 },
          carbohydrates: { amount: 0, marginOfErrorPercent: 100 }, fats: { amount: 0, marginOfErrorPercent: 100 },
          fiber: { amount: 0, marginOfErrorPercent: 100 }, sodium: { amount: 0, marginOfErrorPercent: 100 },
          sugar: { amount: 0, marginOfErrorPercent: 100 }, servingSize: { amount: 1, unit: "serving" }, ingredients: []
        },
        details: {
          summaryText: reason, // Provide the reason from the model or default
          // Include all URLs attempted during the process
          sources: searchInfo.results.map(result => ({ url: result.url, title: result.title || 'Attempted URL' }))
        },
        _searchInfo: searchInfo,
        _isProcessingComplete: true // Mark as complete even for fallback
      };
      // Call handleSuccessfulScan even for the fallback case to trigger UI updates/completion
      foodFound = await handleSuccessfulScan(
        fallbackResponse, imageUri, barcodeData, hasDrawing, selectedModel
      );
    }

    return foodFound;

  } catch (error) {
      // ... (existing error handling) ...
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
  scrapeUrl,
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
    
    // Set the no food found state properly
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
  scrapeUrl,
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
    
    // Set the no food found state properly
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

/**
 * Process nutrition data submission tool call
 * @param {Object} toolCall - The tool call object from Anthropic
 * @returns {Object} - Object containing success status and message
 */
const processSubmitNutritionDataToolCall = async (toolCall) => {
  try {
    console.log('Processing submit nutrition data tool call:', JSON.stringify(toolCall, null, 2));
    
    // Extract nutrition data from tool call
    const {
      foodName,
      servingSize,
      calories,
      protein,
      carbohydrates,
      fat,
      fiber,
      sugar,
      sodium,
      ingredients,
      additionalNotes
    } = toolCall.input;
    
    // Log the received nutrition data
    console.log('Nutrition data received:', {
      foodName,
      servingSize,
      calories,
      protein,
      carbohydrates,
      fat,
      fiber,
      sugar,
      sodium,
      ingredients: ingredients ? ingredients.substring(0, 100) + '...' : 'None provided',
      additionalNotes: additionalNotes ? additionalNotes.substring(0, 100) + '...' : 'None provided'
    });
    
    // Update the app state to indicate nutrition data was found
    await activateStep(STEP_PROCESSING_COMPLETE);
    
    // Create structured nutrition data object
    const nutritionData = {
      foodName: foodName || 'Unknown food',
      servingSize: servingSize || 'Not specified',
      nutritionFacts: {
        calories: calories || 'N/A',
        protein: protein || 'N/A',
        carbohydrates: carbohydrates || 'N/A',
        fat: fat || 'N/A',
        fiber: fiber || 'N/A',
        sugar: sugar || 'N/A',
        sodium: sodium || 'N/A'
      },
      ingredients: ingredients || 'Not available',
      additionalNotes: additionalNotes || ''
    };
    
    // Store the nutrition data for later use
    await AsyncStorage.setItem(NUTRITION_DATA_KEY, JSON.stringify(nutritionData));
    
    // Return success response
    return {
      success: true,
      message: 'Nutrition data successfully processed and stored'
    };
  } catch (error) {
    console.error('Error in processSubmitNutritionDataToolCall:', error);
    return {
      success: false,
      message: `Error processing nutrition data: ${error.message}`
    };
  }
};

const processToolCall = async (toolCall) => {
  console.log(`Processing tool call: ${toolCall.name}`);
  
  switch (toolCall.name) {
    case 'web_search':
      return await processWebSearchToolCall(toolCall);
    case 'submit_nutrition_data':
      return await processSubmitNutritionDataToolCall(toolCall);
    default:
      console.warn(`Unknown tool call: ${toolCall.name}`);
      return {
        success: false,
        message: `Unknown tool call: ${toolCall.name}`
      };
  }
};

export default {
  handleWebSearch,
  handleAnthropicWebSearch,
  handleOpenAIWebSearch,
  handleGeminiWebSearch,
  performWebSearch
}; 
