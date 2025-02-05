import AsyncStorage from '@react-native-async-storage/async-storage';

// Processing time tracking
const PROCESSING_TIMES_KEY = '@average_processing_times';

// Load average processing times from storage
export const loadAverageProcessingTimes = async () => {
  try {
    // console.log('Loading processing times from storage...');
    const storedTimes = await AsyncStorage.getItem(PROCESSING_TIMES_KEY);
    
    // Initialize default structure
    const defaultTimes = {
      anthropic: {
        'claude-3-haiku-20240307': {
          fast: 4000,
          accurate: 8000
        },
        'claude-3-5-sonnet-20240620': {
          fast: 6000,
          accurate: 12000
        }
      },
      openai: {
        'gpt-4o': {
          fast: 5000,
          accurate: 10000
        }
      },
      gemini: {
        'gemini-1.5-flash': {
          fast: 5000,
          accurate: 15000
        },
        'gemini-1.5-pro': {
          fast: 4000,
          accurate: 9000
        }
      }
    };

    if (storedTimes) {
    //   console.log('Found stored processing times:', storedTimes);
      const parsedTimes = JSON.parse(storedTimes);
      
      // Validate the structure
      if (parsedTimes && 
          typeof parsedTimes === 'object' && 
          parsedTimes.anthropic && 
          parsedTimes.openai && 
          parsedTimes.gemini) {
        return parsedTimes;
      }
      
      // If structure is invalid, log and use defaults
      console.log('Stored times had invalid structure, using defaults');
    } else {
      // console.log('No stored processing times found, using defaults');
    }
    
    // Save and return default times
    // console.log('Saving default times:', JSON.stringify(defaultTimes, null, 2));
    await AsyncStorage.setItem(PROCESSING_TIMES_KEY, JSON.stringify(defaultTimes));
    return defaultTimes;
  } catch (error) {
    console.error('Error loading processing times:', error);
    return null;
  }
};

// Update processing time with exponential moving average
export const updateAverageProcessingTime = async (provider, model, mode, duration) => {
  try {
    console.log(`Updating processing time for ${provider}/${model}/${mode}: ${duration}ms`);
    let times = await loadAverageProcessingTimes();
    
    // Initialize the structure if it doesn't exist
    if (!times) {
      times = {
        anthropic: {},
        openai: {},
        gemini: {}
      };
    }

    // Ensure provider exists
    if (!times[provider]) {
      times[provider] = {};
    }

    // Ensure model exists for provider
    if (!times[provider][model]) {
      times[provider][model] = {
        fast: null,
        accurate: null
      };
    }
    
    // Convert mode to 'fast' or 'accurate'
    const normalizedMode = mode.toLowerCase() === 'accurate' ? 'accurate' : 'fast';
    
    // Update the time using exponential moving average
    const currentValue = times[provider][model][normalizedMode];
    if (currentValue === null) {
      times[provider][model][normalizedMode] = duration;
    } else {
      const alpha = 0.2; // Smoothing factor
      times[provider][model][normalizedMode] = alpha * duration + (1 - alpha) * currentValue;
    }
    
    // console.log('Saving updated times:', JSON.stringify(times, null, 2));
    await AsyncStorage.setItem(PROCESSING_TIMES_KEY, JSON.stringify(times));
    return times;
  } catch (error) {
    console.error('Error updating processing time:', error);
    return null;
  }
};

// Get fastest model for each mode
export const getFastestModels = (processingTimes) => {
  let fastestFast = { time: Infinity, model: '' };
  let fastestAccurate = { time: Infinity, model: '' };

  Object.entries(processingTimes || {}).forEach(([provider, models]) => {
      Object.entries(models || {}).forEach(([model, times]) => {
         if (times && typeof times === 'object') {
           if (typeof times.fast === 'number' && times.fast < fastestFast.time) {
              fastestFast = { time: times.fast, model };
           }
           if (typeof times.accurate === 'number' && times.accurate < fastestAccurate.time) {
              fastestAccurate = { time: times.accurate, model };
           }
         }
      });
  });
  return { fast: fastestFast, accurate: fastestAccurate };
}; 