
// Mock external libraries that might cause issues in test environment
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock Expo modules
jest.mock('expo-modules-core', () => ({
  NativeModulesProxy: {
    ExponentHaptics: {
      notification: jest.fn(),
      impact: jest.fn(),
      selection: jest.fn(),
    },
    ExponentBlurView: {},
    ExponentLinearGradient: {},
    ExponentImageManipulator: {
      manipulate: jest.fn(() => Promise.resolve({ uri: 'manipulated-uri' })),
    },
    ExponentCamera: {},
    ExponentImagePicker: {
      launchCameraAsync: jest.fn(() => Promise.resolve({ cancelled: false, uri: 'test-uri' })),
      launchImageLibraryAsync: jest.fn(() => Promise.resolve({ cancelled: false, uri: 'test-uri' })),
    },
  },
  NativeModule: {
    getConstants: jest.fn(() => ({})),
  },
}));

// Mock Expo Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock Expo Image Manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(() => Promise.resolve({ uri: 'manipulated-uri' })),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
  FlipType: {
    Horizontal: 'horizontal',
    Vertical: 'vertical',
  },
}));

// Mock Expo Image Picker
jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(() => Promise.resolve({ cancelled: false, uri: 'test-uri' })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ cancelled: false, uri: 'test-uri' })),
  MediaTypeOptions: {
    All: 'All',
    Videos: 'Videos',
    Images: 'Images',
  },
}));

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(() => Promise.resolve({
        content: [{ text: 'Mocked response from Anthropic' }],
      })),
    },
  })),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => ({ unsubscribe: jest.fn() })),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
})); 