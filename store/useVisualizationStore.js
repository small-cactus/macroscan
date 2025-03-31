import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants for AsyncStorage keys
const SEARCH_QUERIES_KEY = '@nutrilens:search_queries';
const SEARCH_RESULTS_KEY = '@nutrilens:search_results';
const API_FINISHED_KEY = '@nutrilens:api_finished';
const DETECTED_FOOD_KEY = '@nutrilens:detected_food';
const PROCESSING_STEP_KEY = '@nutrilens:processing_step';
const STEP_TIMESTAMP_KEY = '@nutrilens:step_timestamp';

// Step constants
const STEP_WAITING = 'waiting';
const STEP_ACTIVE = 'active';
const STEP_COMPLETED = 'completed';

// Define step constants
const STEP_RECOGNIZE = 'recognize';
const STEP_SEARCH = 'search';
const STEP_PROCESS = 'process';
const STEP_RESULT = 'result';

// Step-specific AsyncStorage keys
const RECOGNIZE_STEP_ACTIVE_KEY = '@nutrilens:recognize_step_active';
const SEARCH_STEP_ACTIVE_KEY = '@nutrilens:search_step_active';
const PROCESS_STEP_ACTIVE_KEY = '@nutrilens:process_step_active';
const RESULT_STEP_ACTIVE_KEY = '@nutrilens:result_step_active';

const RECOGNIZE_STEP_COMPLETED_KEY = '@nutrilens:recognize_step_completed';
const SEARCH_STEP_COMPLETED_KEY = '@nutrilens:search_step_completed';
const PROCESS_STEP_COMPLETED_KEY = '@nutrilens:process_step_completed';
const RESULT_STEP_COMPLETED_KEY = '@nutrilens:result_step_completed';

// Polling interval (ms) to check for WebSearch updates
const POLLING_INTERVAL = 300;

const useVisualizationStore = create((set, get) => ({
  // State
  stepStates: {
    recognize: STEP_WAITING,
    search: STEP_WAITING,
    process: STEP_WAITING,
    result: STEP_WAITING
  },
  currentStep: null,
  apiFinished: false,
  globalUpdateBlocker: false,
  stateIsFrozen: false,
  detectedFood: '',
  searchQueries: [],
  searchResults: [],
  foodItems: [],
  processingSteps: [],
  permanentSearchSubtitle: null,
  
  // Last update timestamp - used to track changes
  lastUpdateTime: Date.now(),
  
  // Subtitle state
  recognizeSubtitles: [
    'Analyzing image for food...',
    'Zooming in on food...',
    'Detecting ingredients...',
    'Categorizing food items...',
    'Measuring portion sizes...',
  ],
  searchSubtitles: [
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
  ],
  processSubtitles: [
    'Calculating nutritional values...',
    'Applying AI algorithms...',
    'Cross-referencing research...',
    'Evaluating health impact...',
    'Optimizing recommendations...',
  ],
  
  // Real subtitles arrays for persistence
  realRecognizeSubtitles: [],
  realSearchSubtitles: [],
  realProcessSubtitles: [],
  
  // Subtitle indices
  currentRecognizeSubtitleIndex: 0,
  currentSearchSubtitleIndex: 0,
  currentProcessSubtitleIndex: 0,
  
  // Set up polling to sync with WebSearchProvider
  setupPolling: () => {
    // Only set up polling once
    if (get().pollingActive) return;
    
    // Check for global visualization data from WebSearchProvider
    const pollInterval = setInterval(() => {
      // Don't poll if state is frozen
      if (get().stateIsFrozen || get().apiFinished) return;
      
      // Check global state from WebSearchProvider
      if (global.NUTRILENS_VISUALIZATION) {
        const visualData = global.NUTRILENS_VISUALIZATION;
        
        // Only update if there's been a change
        if (visualData.updateTime > get().lastUpdateTime) {
          console.log("STORE: Syncing with WebSearchProvider global state");
          
          // Sync step states
          const newStepStates = {
            recognize: visualData.stepStates.recognize.completed ? STEP_COMPLETED : 
                      (visualData.stepStates.recognize.active ? STEP_ACTIVE : STEP_WAITING),
            search: visualData.stepStates.search.completed ? STEP_COMPLETED : 
                   (visualData.stepStates.search.active ? STEP_ACTIVE : STEP_WAITING),
            process: visualData.stepStates.process.completed ? STEP_COMPLETED : 
                    (visualData.stepStates.process.active ? STEP_ACTIVE : STEP_WAITING),
            result: visualData.stepStates.result.completed ? STEP_COMPLETED : 
                   (visualData.stepStates.result.active ? STEP_ACTIVE : STEP_WAITING)
          };
          
          // Update relevant state
          set(state => ({
            stepStates: newStepStates,
            currentStep: visualData.currentStep,
            apiFinished: visualData.apiFinished,
            detectedFood: visualData.detectedFood || state.detectedFood,
            lastUpdateTime: visualData.updateTime,
            
            // Update food items if detected food changed
            foodItems: visualData.detectedFood && visualData.detectedFood !== state.detectedFood ? 
              [visualData.detectedFood, ...state.foodItems.filter(f => f !== visualData.detectedFood)] : 
              state.foodItems,
              
            // Update subtitle data if available
            realRecognizeSubtitles: visualData.subtitles.recognize.length > 0 ? 
              visualData.subtitles.recognize : state.realRecognizeSubtitles,
            realSearchSubtitles: visualData.subtitles.search.length > 0 ? 
              visualData.subtitles.search : state.realSearchSubtitles,
            realProcessSubtitles: visualData.subtitles.process.length > 0 ? 
              visualData.subtitles.process : state.realProcessSubtitles
          }));
          
          // If API is finished, freeze state
          if (visualData.apiFinished && !get().stateIsFrozen) {
            set({ stateIsFrozen: true });
          }
        }
      }
    }, POLLING_INTERVAL);
    
    // Store interval ID and mark polling as active
    set({ 
      pollingInterval: pollInterval,
      pollingActive: true
    });
    
    // Clean up on component unmount
    return () => {
      clearInterval(pollInterval);
      set({ pollingActive: false });
    };
  },
  
  // Methods
  resetState: () => {
    console.log("STORE: Resetting visualization store state");
    
    // Clear AsyncStorage items for visualization
    AsyncStorage.multiRemove([
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
    ]);
    
    // Also reset the global state
    global.FUNCTIONAL_AI_VISUALIZATION_BLOCK_ALL_UPDATES = false;
    
    // Initialize polling if not already active
    get().setupPolling();
    
    set({
      stepStates: {
        recognize: STEP_WAITING,
        search: STEP_WAITING,
        process: STEP_WAITING,
        result: STEP_WAITING
      },
      currentStep: null,
      apiFinished: false,
      globalUpdateBlocker: false,
      stateIsFrozen: false,
      detectedFood: '',
      searchQueries: [],
      searchResults: [],
      foodItems: [],
      processingSteps: [],
      permanentSearchSubtitle: null,
      
      // Reset subtitle indices
      currentRecognizeSubtitleIndex: 0,
      currentSearchSubtitleIndex: 0,
      currentProcessSubtitleIndex: 0,
      
      // Reset persisted subtitles
      realRecognizeSubtitles: [],
      realSearchSubtitles: [],
      realProcessSubtitles: [],
      
      // Reset to default subtitles
      recognizeSubtitles: [
        'Analyzing image for food...',
        'Zooming in on food...',
        'Detecting ingredients...',
        'Categorizing food items...',
        'Measuring portion sizes...',
      ],
      searchSubtitles: [
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
      ],
      processSubtitles: [
        'Calculating nutritional values...',
        'Applying AI algorithms...',
        'Cross-referencing research...',
        'Evaluating health impact...',
        'Optimizing recommendations...',
      ],
      
      // Reset update time
      lastUpdateTime: Date.now()
    });
  },
  
  // Auto-initialize polling when the store is first created
  initializePolling: async () => {
    await get().loadFromAsyncStorage();
    get().setupPolling();
  },
  
  // Load data from AsyncStorage
  loadFromAsyncStorage: async () => {
    try {
      console.log("STORE: Loading data from AsyncStorage");
      
      // Try to access WebSearchProvider's global state first for faster access
      if (global.NUTRILENS_VISUALIZATION && global.NUTRILENS_VISUALIZATION_ACCESS) {
        await global.NUTRILENS_VISUALIZATION_ACCESS.refreshVisualization();
        
        const visualData = global.NUTRILENS_VISUALIZATION;
        if (visualData) {
          console.log("STORE: Loaded data from WebSearchProvider global state");
          
          // Convert step states format
          const newStepStates = {
            recognize: visualData.stepStates.recognize.completed ? STEP_COMPLETED : 
                      (visualData.stepStates.recognize.active ? STEP_ACTIVE : STEP_WAITING),
            search: visualData.stepStates.search.completed ? STEP_COMPLETED : 
                   (visualData.stepStates.search.active ? STEP_ACTIVE : STEP_WAITING),
            process: visualData.stepStates.process.completed ? STEP_COMPLETED : 
                    (visualData.stepStates.process.active ? STEP_ACTIVE : STEP_WAITING),
            result: visualData.stepStates.result.completed ? STEP_COMPLETED : 
                   (visualData.stepStates.result.active ? STEP_ACTIVE : STEP_WAITING)
          };
          
          // Update store with loaded data
          set({
            stepStates: newStepStates,
            currentStep: visualData.currentStep,
            apiFinished: visualData.apiFinished,
            detectedFood: visualData.detectedFood || '',
            lastUpdateTime: visualData.updateTime,
            
            // Update food items array if we have detected food
            foodItems: visualData.detectedFood ? [visualData.detectedFood] : [],
            
            // Update subtitles if available
            realRecognizeSubtitles: visualData.subtitles.recognize.length > 0 ? 
              visualData.subtitles.recognize : [],
            realSearchSubtitles: visualData.subtitles.search.length > 0 ? 
              visualData.subtitles.search : [],
            realProcessSubtitles: visualData.subtitles.process.length > 0 ? 
              visualData.subtitles.process : []
          });
          
          return;
        }
      }
      
      // Fallback to direct AsyncStorage access if needed
      const [
        recognizeActive, recognizeCompleted,
        searchActive, searchCompleted,
        processActive, processCompleted,
        resultActive, resultCompleted,
        detectedFood, apiFinished
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
        AsyncStorage.getItem(API_FINISHED_KEY)
      ]);
      
      // Process step state data
      const stepStates = {
        recognize: recognizeCompleted === 'true' ? STEP_COMPLETED : 
                  (recognizeActive === 'true' ? STEP_ACTIVE : STEP_WAITING),
        search: searchCompleted === 'true' ? STEP_COMPLETED : 
               (searchActive === 'true' ? STEP_ACTIVE : STEP_WAITING),
        process: processCompleted === 'true' ? STEP_COMPLETED : 
                (processActive === 'true' ? STEP_ACTIVE : STEP_WAITING),
        result: resultCompleted === 'true' ? STEP_COMPLETED : 
               (resultActive === 'true' ? STEP_ACTIVE : STEP_WAITING)
      };
      
      // Determine current step
      let currentStep = null;
      if (resultActive === 'true') {
        currentStep = STEP_RESULT;
      } else if (processActive === 'true') {
        currentStep = STEP_PROCESS;
      } else if (searchActive === 'true') {
        currentStep = STEP_SEARCH;
      } else if (recognizeActive === 'true') {
        currentStep = STEP_RECOGNIZE;
      }
      
      // Update store state with loaded data
      set({
        stepStates,
        currentStep,
        apiFinished: apiFinished === 'true',
        detectedFood: detectedFood || '',
        foodItems: detectedFood ? [detectedFood] : [],
        lastUpdateTime: Date.now()
      });
      
      // Also load search data if available
      const searchQueriesJson = await AsyncStorage.getItem(SEARCH_QUERIES_KEY);
      const searchResultsJson = await AsyncStorage.getItem(SEARCH_RESULTS_KEY);
      
      try {
        if (searchQueriesJson) {
          const searchQueries = JSON.parse(searchQueriesJson);
          set({ searchQueries });
        }
        
        if (searchResultsJson) {
          const searchResults = JSON.parse(searchResultsJson);
          set({ searchResults });
        }
      } catch (e) {
        console.error('Error parsing search data from AsyncStorage:', e);
      }
    } catch (error) {
      console.error('Error loading data from AsyncStorage:', error);
    }
  },
  
  // Set a step's state (active or completed)
  setStepState: async (step, state) => {
    const { apiFinished, globalUpdateBlocker, stateIsFrozen } = get();
    
    // Don't update if API is finished and not setting result step
    if ((apiFinished || globalUpdateBlocker || stateIsFrozen) && step !== 'result') {
      console.log(`STORE: Blocking step state update for ${step} - frozen state`);
      return;
    }
    
    console.log(`STORE: Setting ${step} step state to ${state}`);
    
    set(prevState => ({
      stepStates: {
        ...prevState.stepStates,
        [step]: state
      },
      ...(state === STEP_ACTIVE ? { currentStep: step } : {})
    }));
    
    // Also update in AsyncStorage for backward compatibility
    if (state === STEP_ACTIVE) {
      let key = '';
      switch (step) {
        case STEP_RECOGNIZE: key = RECOGNIZE_STEP_ACTIVE_KEY; break;
        case STEP_SEARCH: key = SEARCH_STEP_ACTIVE_KEY; break;
        case STEP_PROCESS: key = PROCESS_STEP_ACTIVE_KEY; break;
        case STEP_RESULT: key = RESULT_STEP_ACTIVE_KEY; break;
      }
      if (key) await AsyncStorage.setItem(key, 'true');
      await AsyncStorage.setItem(PROCESSING_STEP_KEY, step);
      await AsyncStorage.setItem(STEP_TIMESTAMP_KEY, Date.now().toString());
    } else if (state === STEP_COMPLETED) {
      let key = '';
      switch (step) {
        case STEP_RECOGNIZE: key = RECOGNIZE_STEP_COMPLETED_KEY; break;
        case STEP_SEARCH: key = SEARCH_STEP_COMPLETED_KEY; break;
        case STEP_PROCESS: key = PROCESS_STEP_COMPLETED_KEY; break;
        case STEP_RESULT: key = RESULT_STEP_COMPLETED_KEY; break;
      }
      if (key) await AsyncStorage.setItem(key, 'true');
    }
    
    // Also update global state from WebSearchProvider if available
    if (global.NUTRILENS_VISUALIZATION) {
      if (state === STEP_ACTIVE) {
        global.NUTRILENS_VISUALIZATION.currentStep = step;
        global.NUTRILENS_VISUALIZATION.stepStates[step].active = true;
      } else if (state === STEP_COMPLETED) {
        global.NUTRILENS_VISUALIZATION.stepStates[step].completed = true;
      }
      global.NUTRILENS_VISUALIZATION.updateTime = Date.now();
    }
  },
  
  // Activate a step (and complete previous if needed)
  activateStep: async (step) => {
    console.log(`STORE: Activating step ${step}`);
    const { currentStep, stepStates } = get();
    
    // Complete the previous step if it exists and isn't completed
    if (currentStep && currentStep !== step && stepStates[currentStep] !== STEP_COMPLETED) {
      console.log(`STORE: Completing previous step ${currentStep} before activating ${step}`);
      await get().setStepState(currentStep, STEP_COMPLETED);
    }
    
    await get().setStepState(step, STEP_ACTIVE);
    console.log(`STORE: Step ${step} activated successfully`);
  },
  
  // Complete the current step
  completeStep: async (step) => {
    const { apiFinished, globalUpdateBlocker, stateIsFrozen, stepStates } = get();
    
    console.log(`Attempting to complete step ${step} - current state: ${stepStates[step]}`);
    console.log(`API finished: ${apiFinished}, Global blocker: ${globalUpdateBlocker}, State frozen: ${stateIsFrozen}`);
    
    // Don't update if state is frozen or API is finished (except for result step)
    if ((stateIsFrozen || globalUpdateBlocker) && step !== 'result') {
      console.log(`Blocking step completion for ${step} - frozen state`);
      return;
    }
    
    // Make sure step is actually in ACTIVE state before completing it
    if (stepStates[step] !== STEP_ACTIVE) {
      console.log(`Cannot complete step ${step} - not in active state (current: ${stepStates[step]})`);
      return;
    }
    
    // Additional validations to prevent premature step completion
    switch (step) {
      case STEP_RECOGNIZE:
        if (get().foodItems.length === 0 && !get().detectedFood) {
          console.log('Cannot complete recognize step - no food items detected yet');
          return;
        }
        break;
        
      case STEP_SEARCH:
        if (get().searchQueries.length === 0) {
          console.log('Cannot complete search step - no search queries yet');
          return;
        }
        
        // Make sure recognize step is completed first
        if (stepStates.recognize !== STEP_COMPLETED) {
          console.log('Cannot complete search step - recognize step not completed yet');
          return;
        }
        break;
        
      case STEP_PROCESS:
        if (get().searchResults.length === 0) {
          console.log('Cannot complete process step - no search results yet');
          return;
        }
        
        // Make sure search step is completed first
        if (stepStates.search !== STEP_COMPLETED) {
          console.log('Cannot complete process step - search step not completed yet');
          return;
        }
        break;
        
      case STEP_RESULT:
        // For result step, only complete if API is finished or we're forcing it
        if (!apiFinished && !get()._forceCompleteResult) {
          console.log('Cannot complete result step - API not finished yet');
          return;
        }
        
        // Make sure process step is completed first
        if (stepStates.process !== STEP_COMPLETED) {
          console.log('Cannot complete result step - process step not completed yet');
          return;
        }
        break;
    }
    
    console.log(`All validations passed - completing step ${step}`);
    await get().setStepState(step, STEP_COMPLETED);
    console.log(`Step ${step} completed successfully`);
  },
  
  // Update subtitles for a given step
  updateSubtitles: (step, subtitles) => {
    if (!Array.isArray(subtitles) || subtitles.length === 0) return;
    
    const { apiFinished, globalUpdateBlocker, stateIsFrozen } = get();
    
    // Don't update if state is frozen
    if (apiFinished || globalUpdateBlocker || stateIsFrozen) {
      console.log(`Blocking subtitle update for ${step} - frozen state`);
      return;
    }
    
    switch (step) {
      case STEP_RECOGNIZE:
        set({
          recognizeSubtitles: subtitles,
          currentRecognizeSubtitleIndex: 0
        });
        break;
      case STEP_SEARCH:
        set({
          searchSubtitles: subtitles,
          currentSearchSubtitleIndex: 0
        });
        break;
      case STEP_PROCESS:
        set({
          processSubtitles: subtitles,
          currentProcessSubtitleIndex: 0
        });
        break;
    }
  },
  
  // Update real subtitles for persistence
  updateRealSubtitles: (step, subtitles) => {
    if (!Array.isArray(subtitles) || subtitles.length === 0) return;
    
    const { apiFinished, globalUpdateBlocker, stateIsFrozen } = get();
    
    // Don't update if state is frozen
    if (apiFinished || globalUpdateBlocker || stateIsFrozen) {
      console.log(`Blocking real subtitle update for ${step} - frozen state`);
      return;
    }
    
    switch (step) {
      case STEP_RECOGNIZE:
        set(state => ({
          realRecognizeSubtitles: [...new Set([...subtitles, ...state.realRecognizeSubtitles])]
        }));
        break;
      case STEP_SEARCH:
        set(state => ({
          realSearchSubtitles: [...new Set([...subtitles, ...state.realSearchSubtitles])]
        }));
        break;
      case STEP_PROCESS:
        set(state => ({
          realProcessSubtitles: [...new Set([...subtitles, ...state.realProcessSubtitles])]
        }));
        break;
    }
  },
  
  // Update detected food
  setDetectedFood: async (food) => {
    const { apiFinished, globalUpdateBlocker, stateIsFrozen } = get();
    
    // Don't update if state is frozen
    if (apiFinished || globalUpdateBlocker || stateIsFrozen) {
      console.log(`Blocking detected food update - frozen state`);
      return;
    }
    
    set({ detectedFood: food });
    await AsyncStorage.setItem(DETECTED_FOOD_KEY, food);
  },
  
  // Update with search queries
  updateWithSearchQueries: async (queries) => {
    if (!queries || !queries.length) return;
    
    const { apiFinished, globalUpdateBlocker, stateIsFrozen, permanentSearchSubtitle } = get();
    
    // Block updates if state is frozen or permanent subtitle is set
    if (permanentSearchSubtitle || apiFinished || globalUpdateBlocker || stateIsFrozen) {
      console.log('Blocking search query update - state is frozen or permanent subtitle set');
      return;
    }
    
    console.log('Updating search subtitles with queries:', queries);
    
    // Create search subtitles from queries
    const newSubtitles = queries.map(query => `Searching "${query}"...`);
    
    // Update real search subtitles
    get().updateRealSubtitles(STEP_SEARCH, newSubtitles);
    
    // Update search subtitles combining with some original ones
    const originalSubtitles = get().searchSubtitles.filter(subtitle => 
      subtitle.includes('Clicking on link:') || 
      subtitle.includes('Checking') || 
      subtitle.includes('Accessing')
    );
    
    get().updateSubtitles(STEP_SEARCH, [...newSubtitles, ...originalSubtitles].slice(0, 12));
    
    // Store search queries in AsyncStorage for animation sequence
    try {
      const queriesJson = await AsyncStorage.getItem(SEARCH_QUERIES_KEY);
      const existingQueries = queriesJson ? JSON.parse(queriesJson) : [];
      
      // Add new unique queries
      let hasNewQueries = false;
      queries.forEach(query => {
        if (!existingQueries.includes(query)) {
          existingQueries.push(query);
          hasNewQueries = true;
        }
      });
      
      if (hasNewQueries) {
        await AsyncStorage.setItem(SEARCH_QUERIES_KEY, JSON.stringify(existingQueries));
        console.log('Saved search queries to AsyncStorage:', existingQueries.length);
      }
      
      // Update state
      set({ searchQueries: existingQueries });
    } catch (e) {
      console.error('Error saving search queries to AsyncStorage:', e);
    }
    
    // Extract possible food items from queries
    if (queries.length > 0) {
      const foodKeywords = ['nutrition facts for', 'calories in', 'food', 'recipe'];
      const possibleFoodItem = queries.find(query => 
        query && foodKeywords.some(keyword => 
          query.toLowerCase && query.toLowerCase().includes(keyword.toLowerCase())
        )
      );
      
      if (possibleFoodItem) {
        // Try to extract the food name from the query
        const match = possibleFoodItem.match(/(?:nutrition facts for|calories in)\s+(.+?)(?:$|\.|,)/i);
        if (match && match[1]) {
          get().setDetectedFood(match[1].trim());
        }
      }
    }
  },
  
  // Update with search results
  updateWithSearchResults: async (results) => {
    if (!results || !results.length) return;
    
    const { apiFinished, globalUpdateBlocker, stateIsFrozen } = get();
    
    // Block updates if state is frozen
    if (apiFinished || globalUpdateBlocker || stateIsFrozen) {
      console.log('Blocking search results update - state is frozen');
      return;
    }
    
    // Limit to 3 results for better performance
    const limitedResults = results.slice(0, 3);
    
    // Update process subtitles with result titles
    const newSubtitles = limitedResults.map(result => {
      const title = result.title || '';
      const shortTitle = title.length > 20 ? title.substring(0, 20) + '...' : title;
      return `Analyzing "${shortTitle}"`;
    });
    
    // Update real process subtitles
    get().updateRealSubtitles(STEP_PROCESS, newSubtitles);
    
    // Combine with some original subtitles
    const originalSubtitles = get().processSubtitles
      .filter(subtitle => 
        subtitle.includes('Calculating') || 
        subtitle.includes('Cross-referencing') || 
        subtitle.includes('Evaluating')
      )
      .slice(0, 2);
    
    get().updateSubtitles(STEP_PROCESS, [...newSubtitles, ...originalSubtitles].slice(0, 5));
    
    // Store search results in AsyncStorage
    try {
      const resultsJson = await AsyncStorage.getItem(SEARCH_RESULTS_KEY);
      const existingResults = resultsJson ? JSON.parse(resultsJson) : [];
      
      // Add only unique results
      let hasNewResults = false;
      for (let i = 0; i < Math.min(limitedResults.length, 5); i++) {
        const result = limitedResults[i];
        if (!existingResults.some(existing => existing.url === result.url)) {
          existingResults.push(result);
          hasNewResults = true;
          
          // Limit total results
          if (existingResults.length >= 10) break;
        }
      }
      
      if (hasNewResults) {
        await AsyncStorage.setItem(SEARCH_RESULTS_KEY, JSON.stringify(existingResults));
        console.log('Saved search results to AsyncStorage:', existingResults.length);
      }
      
      // Update state
      set({ searchResults: existingResults });
    } catch (e) {
      console.error('Error saving search results to AsyncStorage:', e);
    }
  },
  
  // Update with food items
  updateWithFoodItems: async (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) return;
    
    const { apiFinished, globalUpdateBlocker, stateIsFrozen } = get();
    
    // Block updates if state is frozen
    if (apiFinished || globalUpdateBlocker || stateIsFrozen) {
      console.log('Blocking food items update - state is frozen');
      return;
    }
    
    // Limit to 3 items
    const limitedItems = items.slice(0, 3);
    
    // Update recognition subtitles with food items
    const newSubtitles = limitedItems
      .filter(item => item && typeof item === 'string')
      .map(item => `Detected ${item}...`);
    
    if (newSubtitles.length === 0) return;
    
    // Update real food subtitles
    get().updateRealSubtitles(STEP_RECOGNIZE, newSubtitles);
    
    // Combine with some original subtitles
    const originalSubtitles = get().recognizeSubtitles
      .filter(subtitle => 
        subtitle.includes('Analyzing') || 
        subtitle.includes('Measuring') ||
        subtitle.includes('Zooming')
      )
      .slice(0, 3);
    
    get().updateSubtitles(STEP_RECOGNIZE, [...newSubtitles, ...originalSubtitles].slice(0, 5));
    
    // Update detected food
    if (limitedItems.length > 0 && limitedItems[0] && typeof limitedItems[0] === 'string') {
      const { detectedFood } = get();
      // If no detected food yet, or if we have a better one (longer, more specific)
      if (!detectedFood || (limitedItems[0].length > detectedFood.length)) {
        get().setDetectedFood(limitedItems[0]);
      }
    }
    
    // Update state
    set({ foodItems });
  },
  
  // Set API as finished
  setAPIFinished: async (finished) => {
    if (finished && !get().apiFinished) {
      console.log('API processing marked as finished, FREEZING ALL STATE');
      
      try {
        // Store in AsyncStorage
        await AsyncStorage.setItem(API_FINISHED_KEY, 'true');
        
        // Set global flag
        global._isNutrilensProcessingComplete = true;
        global.FUNCTIONAL_AI_VISUALIZATION_BLOCK_ALL_UPDATES = true;
        
        // CRITICAL: Capture final subtitles before freezing
        const {
          realRecognizeSubtitles,
          realSearchSubtitles,
          realProcessSubtitles,
          detectedFood,
          searchResults
        } = get();
        
        // Determine final subtitles
        let finalRecognizeSubtitle = '';
        let finalSearchSubtitle = '';
        let finalProcessSubtitle = '';
        let finalResultSubtitle = '';
        
        // Final recognize subtitle
        if (realRecognizeSubtitles.length > 0) {
          finalRecognizeSubtitle = realRecognizeSubtitles[0];
        } else if (detectedFood) {
          finalRecognizeSubtitle = `Detected ${detectedFood}...`;
        } else {
          finalRecognizeSubtitle = 'Analysis complete';
        }
        
        // Final search subtitle
        if (searchResults && searchResults.length > 0) {
          finalSearchSubtitle = `Searched ${searchResults.length} websites`;
        } else if (realSearchSubtitles.length > 0) {
          finalSearchSubtitle = realSearchSubtitles[0];
        } else {
          finalSearchSubtitle = 'Search complete';
        }
        
        // Final process subtitle
        if (realProcessSubtitles.length > 0) {
          finalProcessSubtitle = realProcessSubtitles[0];
        } else {
          finalProcessSubtitle = 'Processing complete';
        }
        
        // Final result subtitle
        if (detectedFood) {
          finalResultSubtitle = `Nutrition facts for ${detectedFood} ready`;
        } else {
          finalResultSubtitle = 'Results ready';
        }
        
        console.log('FINAL SUBTITLES CAPTURED:', {
          recognize: finalRecognizeSubtitle,
          search: finalSearchSubtitle,
          process: finalProcessSubtitle,
          result: finalResultSubtitle
        });
        
        // Set permanent search subtitle
        const permanentSearchSubtitle = finalSearchSubtitle;
        
        // Store it in AsyncStorage
        await AsyncStorage.setItem('@nutrilens:permanent_search_subtitle', permanentSearchSubtitle);
        
        // Freeze all state
        set({
          apiFinished: true,
          globalUpdateBlocker: true,
          stateIsFrozen: true,
          permanentSearchSubtitle,
          
          // Replace subtitle arrays with final values
          recognizeSubtitles: [finalRecognizeSubtitle],
          searchSubtitles: [finalSearchSubtitle],
          processSubtitles: [finalProcessSubtitle],
          
          realRecognizeSubtitles: [finalRecognizeSubtitle],
          realSearchSubtitles: [finalSearchSubtitle],
          realProcessSubtitles: [finalProcessSubtitle],
          
          // Reset indices to 0
          currentRecognizeSubtitleIndex: 0,
          currentSearchSubtitleIndex: 0,
          currentProcessSubtitleIndex: 0,
        });
      } catch (error) {
        console.error('Error setting API finished state:', error);
      }
    }
  },
  
  // Add updateWithScanData method to handle scan data updates
  updateWithScanData: async (data) => {
    if (!data) return;
    
    // Check if state is frozen before processing
    const { apiFinished, globalUpdateBlocker, stateIsFrozen } = get();
    if (stateIsFrozen || globalUpdateBlocker || apiFinished) {
      console.log('BLOCKING scan data update - state is frozen');
      return;
    }
    
    console.log('Processing scan data update:', data);
    
    // First, extract and store all relevant data before attempting to transition states
    let hasNewFood = false;
    let hasNewQueries = false;
    let hasNewResults = false;
    
    // Process food data first - this is needed for recognize step
    if (data.food) {
      // If we have a food name, update food items
      if (data.food.name) {
        console.log('Found food name:', data.food.name);
        await get().updateWithFoodItems([data.food.name]);
        await get().setDetectedFood(data.food.name);
        hasNewFood = true;
      }
      
      // Update with ingredients if available
      if (data.food.ingredients && Array.isArray(data.food.ingredients)) {
        const ingredientNames = data.food.ingredients
          .filter(ingredient => ingredient && ingredient.name)
          .map(ingredient => ingredient.name);
        
        if (ingredientNames.length > 0) {
          console.log('Found ingredients:', ingredientNames.length);
          await get().updateWithFoodItems(ingredientNames);
          hasNewFood = true;
        }
      }
    }
    
    // Process search queries and results - needed for search and process steps
    if (data._searchInfo) {
      if (data._searchInfo.queries && data._searchInfo.queries.length > 0) {
        console.log('Found search queries:', data._searchInfo.queries.length);
        await get().updateWithSearchQueries(data._searchInfo.queries);
        hasNewQueries = true;
      }
      
      if (data._searchInfo.results && data._searchInfo.results.length > 0) {
        console.log('Found search results:', data._searchInfo.results.length);
        await get().updateWithSearchResults(data._searchInfo.results);
        hasNewResults = true;
      }
    }
    
    // Check for API completion flag
    if (data._isProcessingComplete) {
      console.log('API CALL FINISHED - processing final data');
      
      // Create placeholder data if missing - helps with step progression
      if (!hasNewFood && !get().detectedFood && get().stepStates.recognize === STEP_ACTIVE) {
        console.log('No food detected, creating placeholder');
        const placeholder = 'food item';
        await get().updateWithFoodItems([placeholder]);
        await get().setDetectedFood(placeholder);
      }
      
      if (!hasNewQueries && get().searchQueries.length === 0 && get().stepStates.search === STEP_ACTIVE) {
        console.log('No search queries, creating placeholder');
        const placeholder = ['nutrition information'];
        await get().updateWithSearchQueries(placeholder);
      }
      
      if (!hasNewResults && get().searchResults.length === 0 && get().stepStates.process === STEP_ACTIVE) {
        console.log('No search results, creating placeholder');
        const placeholder = [
          { title: 'Nutritional Database', url: 'https://example.com', snippet: 'Found nutrition information' }
        ];
        await get().updateWithSearchResults(placeholder);
      }
      
      // Now progress through all the steps in sequence
      const { stepStates } = get();
      
      // Process the recognize step
      if (stepStates.recognize === STEP_ACTIVE) {
        console.log('Completing recognize step (on API completion)');
        await get().completeStep(STEP_RECOGNIZE);
      }
      
      // Process the search step
      if (stepStates.search === STEP_ACTIVE || 
         (stepStates.recognize === STEP_COMPLETED && stepStates.search === STEP_WAITING)) {
        if (stepStates.search === STEP_WAITING) {
          console.log('Activating search step (on API completion)');
          await get().activateStep(STEP_SEARCH);
        }
        console.log('Completing search step (on API completion)');
        await get().completeStep(STEP_SEARCH);
      }
      
      // Process the process step
      if (stepStates.process === STEP_ACTIVE || 
         (stepStates.search === STEP_COMPLETED && stepStates.process === STEP_WAITING)) {
        if (stepStates.process === STEP_WAITING) {
          console.log('Activating process step (on API completion)');
          await get().activateStep(STEP_PROCESS);
        }
        console.log('Completing process step (on API completion)');
        await get().completeStep(STEP_PROCESS);
      }
      
      // Process the result step
      if (stepStates.result === STEP_ACTIVE || 
         (stepStates.process === STEP_COMPLETED && stepStates.result === STEP_WAITING)) {
        if (stepStates.result === STEP_WAITING) {
          console.log('Activating result step (on API completion)');
          await get().activateStep(STEP_RESULT);
        }
      }
      
      // Now mark API as finished - this handles state freezing
      await get().setAPIFinished(true);
      
      // Complete the result step after minimal display time
      setTimeout(async () => {
        if (get().stepStates.result === STEP_ACTIVE) {
          console.log('Completing result step after API finished');
          await get().completeStep(STEP_RESULT);
        }
      }, 1000);
      
      return;
    }
    
    // Now process step transitions based on the data we received
    const { stepStates } = get();
    
    // Process recognize step - Transition from recognize to search if we have food data
    if (hasNewFood && stepStates.recognize === STEP_ACTIVE) {
      console.log('Food data received - attempting to complete recognize step');
      await get().completeStep(STEP_RECOGNIZE);
      
      // Only activate search if it's not already active or completed
      if (stepStates.search === STEP_WAITING) {
        console.log('Activating search step after food recognition');
        await get().activateStep(STEP_SEARCH);
      }
    }
    
    // Process search step - Transition from search to process if we have queries
    if (hasNewQueries && stepStates.search === STEP_ACTIVE) {
      // Look for results too - if we have both, complete the step
      if (hasNewResults || get().searchResults.length > 0) {
        console.log('Search queries and results received - completing search step');
        await get().completeStep(STEP_SEARCH);
        
        // Only activate process if it's not already active or completed
        if (stepStates.process === STEP_WAITING) {
          console.log('Activating process step after search completion');
          await get().activateStep(STEP_PROCESS);
        }
      }
    }
    
    // Process the process step - requires search results
    if (hasNewResults && stepStates.process === STEP_ACTIVE && 
        get().searchResults.length >= 2) { // Require at least 2 results to transition
      console.log('Enough search results received - completing process step');
      await get().completeStep(STEP_PROCESS);
      
      // Only activate result if it's not already active or completed
      if (stepStates.result === STEP_WAITING) {
        console.log('Activating result step after process completion');
        await get().activateStep(STEP_RESULT);
      }
    }
  },
  
  // Get current subtitles for each step
  getCurrentSubtitle: (step) => {
    const {
      recognizeSubtitles,
      searchSubtitles,
      processSubtitles,
      currentRecognizeSubtitleIndex,
      currentSearchSubtitleIndex,
      currentProcessSubtitleIndex,
      permanentSearchSubtitle,
      stepStates,
      detectedFood,
      foodItems,
      searchResults
    } = get();
    
    // If step is completed, return a fixed subtitle
    if (stepStates[step] === STEP_COMPLETED) {
      switch (step) {
        case STEP_RECOGNIZE:
          if (detectedFood) {
            return `Found ${detectedFood} in your image`;
          } else if (foodItems.length > 0) {
            return `Found ${foodItems[0]} in your image`;
          }
          return 'Food identified';
          
        case STEP_SEARCH:
          if (permanentSearchSubtitle) {
            return permanentSearchSubtitle;
          } else if (searchResults.length > 0) {
            return `Searched ${searchResults.length} websites`;
          }
          return 'Search completed';
          
        case STEP_PROCESS:
          return 'Processing completed';
          
        case STEP_RESULT:
          if (detectedFood) {
            return `Nutrition facts for ${detectedFood}`;
          } else if (foodItems.length > 0) {
            return `Nutrition facts for ${foodItems[0]}`;
          }
          return 'Results ready';
      }
    }
    
    // For active steps, return the current subtitle from the array
    switch (step) {
      case STEP_RECOGNIZE:
        return recognizeSubtitles[currentRecognizeSubtitleIndex] || 'Analyzing image...';
        
      case STEP_SEARCH:
        return searchSubtitles[currentSearchSubtitleIndex] || 'Searching nutrition databases...';
        
      case STEP_PROCESS:
        return processSubtitles[currentProcessSubtitleIndex] || 'Processing nutrition data...';
        
      case STEP_RESULT:
        if (detectedFood) {
          return `Generating nutrition facts for ${detectedFood}...`;
        } else if (foodItems.length > 0) {
          return `Generating nutrition facts for ${foodItems[0]}...`;
        }
        return 'Generating nutrition data...';
        
      default:
        return 'Processing...';
    }
  },
  
  // Cycle to next subtitle
  cycleSubtitle: (step) => {
    const {
      recognizeSubtitles,
      searchSubtitles,
      processSubtitles,
      currentRecognizeSubtitleIndex,
      currentSearchSubtitleIndex,
      currentProcessSubtitleIndex,
      stepStates,
      permanentSearchSubtitle
    } = get();
    
    // Don't cycle if step is completed or there's a permanent subtitle
    if (stepStates[step] === STEP_COMPLETED || 
        (step === STEP_SEARCH && permanentSearchSubtitle)) {
      return;
    }
    
    switch (step) {
      case STEP_RECOGNIZE:
        if (recognizeSubtitles.length > 0) {
          const nextIndex = (currentRecognizeSubtitleIndex + 1) % recognizeSubtitles.length;
          set({ currentRecognizeSubtitleIndex: nextIndex });
        }
        break;
        
      case STEP_SEARCH:
        if (searchSubtitles.length > 0) {
          const nextIndex = (currentSearchSubtitleIndex + 1) % searchSubtitles.length;
          set({ currentSearchSubtitleIndex: nextIndex });
        }
        break;
        
      case STEP_PROCESS:
        if (processSubtitles.length > 0) {
          const nextIndex = (currentProcessSubtitleIndex + 1) % processSubtitles.length;
          set({ currentProcessSubtitleIndex: nextIndex });
        }
        break;
    }
  },
  
  // Add method to force complete the result step
  forceCompleteResult: async () => {
    console.log('Forcing completion of result step');
    // Set temporary flag to allow completing result step even if API isn't finished
    set({ _forceCompleteResult: true });
    
    // Attempt to complete the result step 
    await get().completeStep(STEP_RESULT);
    
    // Clear the temporary flag
    set({ _forceCompleteResult: false });
  }
}));

export default useVisualizationStore; 