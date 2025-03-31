// Model constants for each provider
export const MODELS = {
  openai: {
    regular: 'gpt-4o',
    complex: 'gpt-4o' // OpenAI uses same model for both
  },
  gemini: {
    regular: 'gemini-1.5-flash',
    complex: 'gemini-1.5-flash'
  },
  anthropic: {
    regular: 'claude-3-haiku-20240307',
    complex: 'claude-3-5-sonnet-20240620'
  }
};

/**
 * Returns the appropriate model based on provider, mode, and user preferences.
 *
 * Model selection rules:
 * 1. Accurate mode always uses complex model
 * 2. Drawing always uses complex model
 * 3. Fast mode can use either complex or regular model based on user preference
 *
 * @param {string} provider - The provider name (e.g., 'anthropic').
 * @param {object} options - Options including selectedMode, selectedModel, and hasDrawing.
 * @param {string} [options.selectedMode='fast'] - The processing mode ('fast' or 'accurate').
 * @param {string|null} [options.selectedModel=null] - An explicit model selection.
 * @param {boolean} [options.hasDrawing=false] - Indicates if an image drawing is present.
 * @returns {string|null} - The model identifier to use.
 */
export const getModel = (
  provider,
  { selectedMode = 'fast', selectedModel = null, hasDrawing = false } = {}
) => {
  if (!MODELS[provider]) return null;

  // Case 1: Drawing is present - always use complex model
  if (hasDrawing) {
    return MODELS[provider].complex;
  }

  // Case 2: Accurate mode - always use complex model
  if (selectedMode === 'accurate') {
    return MODELS[provider].complex;
  }

  // Case 3: Search mode
  if (selectedMode === 'search') {
    return MODELS[provider].regular;
  }

  // Case 4: Fast mode - can use either model based on user preference
  if (selectedMode === 'fast') {
    // If user explicitly selected complex model, honor that choice
    if (selectedModel === MODELS[provider].complex) {
      return MODELS[provider].complex;
    }
    // Otherwise use regular model for fast mode
    return MODELS[provider].regular;
  }

  // Fallback: use regular model if something unexpected happens
  return MODELS[provider].regular;
};

// For backward compatibility and debugging screen
export const getDefaultModel = (provider) => {
  return MODELS[provider]?.regular || null;
}; 