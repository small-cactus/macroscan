/**
 * Visualization Helper Functions
 * 
 * Utility functions to help manage visualization animations and states
 */

/**
 * Runs a complete animation sequence for the visualization
 * @param {React.RefObject} visualizationRef - Reference to the visualization component
 * @param {Object} options - Options for the animation sequence
 */
export const runFullVisualizationSequence = (visualizationRef, options = {}) => {
  if (!visualizationRef || !visualizationRef.current) {
    console.log('Visualization reference not available');
    return;
  }
  
  console.log('Starting full visualization sequence');
  
  const {
    startDelay = 300,
    stepDelay = 2000,
    finalDelay = 1000,
    skipSteps = [],
  } = options;
  
  // Reset the visualization first
  if (visualizationRef.current.reset) {
    console.log('Resetting visualization state');
    visualizationRef.current.reset();
  }
  
  // Set up sequential steps with appropriate delays
  setTimeout(() => {
    if (!skipSteps.includes('recognize')) {
      console.log('Force starting visualization - recognize step');
      visualizationRef.current.forceActivateStep('recognize');
    }
    
    setTimeout(() => {
      if (!skipSteps.includes('search')) {
        console.log('Force activating search step');
        visualizationRef.current.forceActivateStep('search');
      }
      
      setTimeout(() => {
        if (!skipSteps.includes('process')) {
          console.log('Force activating process step');
          visualizationRef.current.forceActivateStep('process');
        }
        
        setTimeout(() => {
          if (!skipSteps.includes('result')) {
            console.log('Force activating result step');
            visualizationRef.current.forceActivateStep('result');
          }
          
          // Finally, complete the visualization
          setTimeout(() => {
            console.log('Force completing visualization');
            visualizationRef.current.forceActivateStep('complete');
          }, finalDelay);
        }, stepDelay);
      }, stepDelay);
    }, stepDelay);
  }, startDelay);
};

/**
 * Updates the visualization with data and advances to the next step
 * @param {React.RefObject} visualizationRef - Reference to the visualization component
 * @param {string} step - The step to advance to ('recognize', 'search', 'process', 'result', 'complete')
 * @param {Object} data - Data to update the visualization with
 */
export const advanceVisualization = (visualizationRef, step, data = {}) => {
  if (!visualizationRef || !visualizationRef.current) {
    console.log('Visualization reference not available');
    return;
  }
  
  console.log(`Advancing visualization to step: ${step}`);
  
  // Update with data if provided
  if (Object.keys(data).length > 0) {
    visualizationRef.current.updateWithScanData(data);
  }
  
  // Advance to the specified step
  if (visualizationRef.current.forceActivateStep) {
    visualizationRef.current.forceActivateStep(step);
  } else if (step === 'complete' && visualizationRef.current.completeVisualization) {
    visualizationRef.current.completeVisualization(true);
  }
};

/**
 * Legacy fallback for older visualization components
 * @param {React.RefObject} visualizationRef - Reference to the visualization component
 * @param {Object} data - Data for the visualization
 */
export const legacyCompleteVisualization = (visualizationRef, data = {}) => {
  if (!visualizationRef || !visualizationRef.current) {
    console.log('Visualization reference not available');
    return;
  }
  
  // Add the completion flag
  const updatedData = {
    ...data,
    _isProcessingComplete: true
  };
  
  // Update with data
  visualizationRef.current.updateWithScanData(updatedData);
  
  // Force complete after a short delay
  setTimeout(() => {
    if (visualizationRef.current.completeVisualization) {
      visualizationRef.current.completeVisualization(true);
    }
  }, 1000);
}; 