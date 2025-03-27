import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import FoodScanScreen from '../../screens/FoodScanScreen';
import { NavigationContainer } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProvider } from '../../userContext';
import { TimeZoneProvider } from '../../TimeZoneContext';
import { IAPProvider } from '../../IAPContext';

// Mock required context providers
jest.mock('../../userContext', () => ({
  useUser: () => ({
    userData: {
      uid: 'test-user',
      email: 'test@example.com',
      settings: { 
        scanMode: 'accurate',
        scanCount: 5,
        isPremium: true
      }
    },
    isLoggedIn: true,
    updateUserData: jest.fn(),
    updateUserSettings: jest.fn(),
  }),
  UserProvider: ({ children }) => <>{children}</>,
}));

jest.mock('../../TimeZoneContext', () => ({
  useTimeZone: () => ({
    timeZone: 'America/New_York',
    timeFormat: '12h',
  }),
  TimeZoneProvider: ({ children }) => <>{children}</>,
}));

jest.mock('../../IAPContext', () => ({
  useIAP: () => ({
    isPremium: true,
    products: [],
    initializeIAP: jest.fn(),
    handlePurchase: jest.fn(),
    refreshPurchases: jest.fn(),
  }),
  IAPProvider: ({ children }) => <>{children}</>,
}));

// Mock Image Picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

// Mock handleAnthropicScan function from providers
jest.mock('../../screens/providers', () => ({
  handleAnthropicScan: jest.fn(() => Promise.resolve({
    name: 'Grilled Chicken Salad',
    nutritionalInfo: {
      calories: 350,
      protein: 30,
      carbs: 15,
      fat: 18,
    },
    ingredients: ['chicken', 'lettuce', 'tomatoes', 'olive oil'],
    details: 'A healthy salad with grilled chicken.'
  })),
  handleOpenAIScan: jest.fn(),
  handleGeminiScan: jest.fn(),
}));

// Setup Superwall mock
jest.mock('@superwall/react-native-superwall', () => ({
  default: {
    register: jest.fn(),
    identify: jest.fn(),
    registerForRemoteNotifications: jest.fn(),
    handleDeepLink: jest.fn(),
    present: jest.fn(() => Promise.resolve({ status: 'purchased' })),
  },
}));

describe('FoodScanScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up AsyncStorage mock for settings
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === '@scan_mode') return Promise.resolve('accurate');
      if (key === '@accurate_scans_remaining') return Promise.resolve('5');
      if (key === '@image_history') return Promise.resolve(JSON.stringify([]));
      return Promise.resolve(null);
    });
    
    // Mock successful image pick
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://test/image.jpg', width: 1000, height: 1000 }]
    });
  });

  it('renders correctly with initial state', async () => {
    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <UserProvider>
          <TimeZoneProvider>
            <IAPProvider>
              <FoodScanScreen />
            </IAPProvider>
          </TimeZoneProvider>
        </UserProvider>
      </NavigationContainer>
    );
    
    // Check for main UI elements
    await waitFor(() => {
      expect(getByText(/scan food/i)).toBeTruthy();
    });
  });

  it('allows picking an image from library', async () => {
    const { getByTestId, findByText } = render(
      <NavigationContainer>
        <UserProvider>
          <TimeZoneProvider>
            <IAPProvider>
              <FoodScanScreen />
            </IAPProvider>
          </TimeZoneProvider>
        </UserProvider>
      </NavigationContainer>
    );
    
    // Find and press the "Choose from Gallery" button
    // Note: We'll need to adjust this selector based on the actual testID or accessible text
    const galleryButton = await findByText(/choose/i);
    fireEvent.press(galleryButton);
    
    // Verify that image picker was called
    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });
  });

  // Additional tests would be more complex and require more detailed mocking
  // of the image processing, API calls, and state management.
  // These would depend on the exact implementation details of FoodScanScreen.
}); 