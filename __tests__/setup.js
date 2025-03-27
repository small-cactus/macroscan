// Mock external libraries that might cause issues in test environment
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
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
}));

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

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

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

jest.mock('expo-camera', () => ({
  Camera: 'Camera',
  CameraType: {
    front: 'front',
    back: 'back',
  },
  FlashMode: {
    on: 'on',
    off: 'off',
    auto: 'auto',
    torch: 'torch',
  },
}));

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(() => Promise.resolve({ cancelled: false, uri: 'test-uri' })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ cancelled: false, uri: 'test-uri' })),
  MediaTypeOptions: {
    All: 'All',
    Videos: 'Videos',
    Images: 'Images',
  },
}));

jest.mock('@expo/vector-icons', () => ({
  FontAwesome: 'FontAwesome',
  MaterialIcons: 'MaterialIcons',
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('expo-symbols', () => ({
  Symbol: 'Symbol',
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  })),
  useRoute: jest.fn(() => ({
    params: {},
  })),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('react-native-iap', () => ({
  initConnection: jest.fn(() => Promise.resolve()),
  getProducts: jest.fn(() => Promise.resolve([])),
  requestPurchase: jest.fn(() => Promise.resolve()),
  finishTransaction: jest.fn(() => Promise.resolve()),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(() => Promise.resolve({
        content: [{ text: 'Mocked response from Anthropic' }],
      })),
    },
  })),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => ({ unsubscribe: jest.fn() })),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

// Mock for react-native Settings and TurboModuleRegistry
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => {
  return {
    get: jest.fn((name) => {
      if (name === 'SettingsManager') {
        return {
          settings: {
            AppleLocale: 'en_US',
            AppleLanguages: ['en'],
          },
        };
      }
      if (name === 'PlatformConstants') {
        return {
          getConstants: () => ({
            isTesting: true,
            reactNativeVersion: {
              major: 0,
              minor: 68,
              patch: 0,
            },
            Version: 10,
            forceTouchAvailable: false,
            osVersion: '14.0',
            systemName: 'iOS',
            interfaceIdiom: 'phone',
          }),
        };
      }
      if (name === 'DeviceInfo') {
        return {
          getConstants: () => ({
            Dimensions: {
              window: {
                width: 375,
                height: 667,
                scale: 2,
                fontScale: 1,
              },
              screen: {
                width: 375,
                height: 667,
                scale: 2,
                fontScale: 1,
              },
            },
            isIPhoneX_deprecated: false,
            deviceName: 'iPhone Simulator',
            systemName: 'iOS',
            systemVersion: '14.0',
          }),
        };
      }
      if (name === 'SourceCode') {
        return {
          getConstants: () => ({
            scriptURL: 'http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false',
          }),
        };
      }
      return null;
    }),
    getEnforcing: jest.fn((name) => {
      if (name === 'SettingsManager') {
        return {
          settings: {
            AppleLocale: 'en_US',
            AppleLanguages: ['en'],
          },
        };
      }
      if (name === 'PlatformConstants') {
        return {
          getConstants: () => ({
            isTesting: true,
            reactNativeVersion: {
              major: 0,
              minor: 68,
              patch: 0,
            },
            Version: 10,
            forceTouchAvailable: false,
            osVersion: '14.0',
            systemName: 'iOS',
            interfaceIdiom: 'phone',
          }),
        };
      }
      if (name === 'DeviceInfo') {
        return {
          getConstants: () => ({
            Dimensions: {
              window: {
                width: 375,
                height: 667,
                scale: 2,
                fontScale: 1,
              },
              screen: {
                width: 375,
                height: 667,
                scale: 2,
                fontScale: 1,
              },
            },
            isIPhoneX_deprecated: false,
            deviceName: 'iPhone Simulator',
            systemName: 'iOS',
            systemVersion: '14.0',
          }),
        };
      }
      if (name === 'SourceCode') {
        return {
          getConstants: () => ({
            scriptURL: 'http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false',
          }),
        };
      }
      throw new Error(`TurboModuleRegistry.getEnforcing(...): '${name}' could not be found.`);
    }),
  };
});

// Mock for react-native Settings
jest.mock('react-native/Libraries/Settings/Settings', () => {
  return {
    get: jest.fn((key) => {
      const settings = {
        AppleLocale: 'en_US',
        AppleLanguages: ['en'],
      };
      return settings[key];
    }),
    set: jest.fn(),
    watchKeys: jest.fn(() => ({ unsubscribe: jest.fn() })),
  };
});

// Mock for react-native
jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  return {
    ...rn,
    Settings: {
      get: jest.fn(),
      set: jest.fn(),
      watchKeys: jest.fn(() => ({ unsubscribe: jest.fn() })),
    },
    NativeModules: {
      ...rn.NativeModules,
      SettingsManager: {
        settings: {
          AppleLocale: 'en_US',
          AppleLanguages: ['en'],
        },
      },
    },
    Animated: {
      ...rn.Animated,
      timing: jest.fn(() => ({
        start: jest.fn(cb => cb && cb()),
      })),
      parallel: jest.fn(() => ({
        start: jest.fn(cb => cb && cb()),
      })),
      Value: jest.fn(() => ({
        interpolate: jest.fn(() => ({})),
      })),
      View: ({ children, style, ...props }) => (
        <rn.View style={style} {...props}>{children}</rn.View>
      ),
    },
  };
});

// Add a dummy test to avoid the "Your test suite must contain at least one test" error
