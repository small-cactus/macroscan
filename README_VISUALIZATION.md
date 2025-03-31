# FunctionalAIVisualization with Zustand Store

This document explains the enhanced visualization component used in the NutriLens app.

## Problem

The original `FunctionalAIVisualization` component had stability issues:

1. Excessive re-renders when state was updated
2. Race conditions with AsyncStorage updates
3. Inconsistent state across mount/unmount cycles
4. No central state management leading to data duplication

## Solution

The new `FunctionalAIVisualizationWithStore` component uses Zustand for state management, providing:

1. **Global State**: Consistent state accessible everywhere in the app
2. **Persistence**: State persists across component mount/unmount cycles
3. **Performance**: Reduced re-renders with selective state updates
4. **Stability**: Better handling of race conditions
5. **Simpler interface**: Cleaner API for updating visualization data

## Usage

```jsx
import FunctionalAIVisualizationWithStore from './FunctionalAIVisualizationWithStore';
import useVisualizationStore from '../store/useVisualizationStore';

// In your component:
const visualizationRef = useRef(null);

// You can directly update store state without needing the ref:
const store = useVisualizationStore();
store.updateWithSearchQueries(queries);
store.updateWithSearchResults(results);
store.updateWithFoodItems(items);

// Or use the ref if needed:
<FunctionalAIVisualizationWithStore
  isDark={colorScheme === 'dark'}
  isVisible={isLoading}
  ref={visualizationRef}
  onComplete={() => {}}
/>
```

## Store API

The Zustand store exposes these methods:

- `resetState()`: Resets all state to initial values
- `setStepState(step, state)`: Sets a step's state (active or completed)
- `activateStep(step)`: Activates a step (and completes the previous)
- `completeStep(step)`: Completes a step
- `updateSubtitles(step, subtitles)`: Updates the subtitles for a step
- `updateRealSubtitles(step, subtitles)`: Updates real subtitles for persistence
- `setDetectedFood(food)`: Updates detected food
- `updateWithSearchQueries(queries)`: Updates with search queries
- `updateWithSearchResults(results)`: Updates with search results 
- `updateWithFoodItems(items)`: Updates with food items
- `setAPIFinished(finished)`: Marks API as finished
- `getCurrentSubtitle(step)`: Gets current subtitle for a step
- `cycleSubtitle(step)`: Cycles to next subtitle
- `loadFromAsyncStorage()`: Loads state from AsyncStorage

## Implementation Details

1. The store centralizes all state that was previously scattered across the component
2. AsyncStorage operations are abstracted away and handled by the store
3. The component's UI is now purely presentational, with all logic in the store
4. Atomic updates ensure state consistency
5. All operations have better error handling and safety checks

## Advantages for the Search Scan Visualization

1. Seamless updates to the visualization as search data comes in
2. No flickering or jumpy animations during updates
3. Persisted state if user navigates away and back
4. More responsive UI during heavy processing
5. Better handling of edge cases (e.g., API finishes early) 