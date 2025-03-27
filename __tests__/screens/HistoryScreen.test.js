import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HistoryScreen from '../../screens/HistoryScreen';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProvider } from '../../userContext';
import { TimeZoneProvider } from '../../TimeZoneContext';

// Create mock data for history items
const MOCK_HISTORY_DATA = [
  {
    id: '1',
    timestamp: new Date().toISOString(),
    imageUri: 'file://test1.jpg',
    name: 'Grilled Chicken Salad',
    nutritionalInfo: {
      calories: 320,
      protein: 28,
      carbs: 12,
      fat: 16
    },
    ingredients: ['chicken', 'lettuce', 'tomatoes', 'olive oil'],
    details: 'A healthy salad option with grilled chicken breast.'
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    imageUri: 'file://test2.jpg',
    name: 'Banana Smoothie',
    nutritionalInfo: {
      calories: 180,
      protein: 3,
      carbs: 36,
      fat: 2
    },
    ingredients: ['banana', 'milk', 'honey'],
    details: 'A simple banana smoothie.'
  }
];

// Mock the necessary providers and navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

jest.mock('../../userContext', () => ({
  useUser: () => ({
    userData: { uid: 'test-user', email: 'test@example.com' },
    isLoggedIn: true,
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

describe('HistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up AsyncStorage mock to return history data
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === '@image_history') {
        return Promise.resolve(JSON.stringify(MOCK_HISTORY_DATA));
      }
      return Promise.resolve(null);
    });
  });

  it('loads and displays history items correctly', async () => {
    const { findByText, getAllByTestId } = render(
      <NavigationContainer>
        <UserProvider>
          <TimeZoneProvider>
            <HistoryScreen />
          </TimeZoneProvider>
        </UserProvider>
      </NavigationContainer>
    );
    
    // Verify history items are loaded and displayed
    await findByText('Grilled Chicken Salad');
    await findByText('Banana Smoothie');
    
    // Check for nutritional info display
    await findByText(/320 calories/i);
    await findByText(/180 calories/i);
  });

  it('shows proper message when history is empty', async () => {
    // Override AsyncStorage to return empty history
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === '@image_history') {
        return Promise.resolve(JSON.stringify([]));
      }
      return Promise.resolve(null);
    });
    
    const { findByText } = render(
      <NavigationContainer>
        <UserProvider>
          <TimeZoneProvider>
            <HistoryScreen />
          </TimeZoneProvider>
        </UserProvider>
      </NavigationContainer>
    );
    
    // Should show empty state message
    await findByText(/no history/i);
  });

  it('allows deleting a history item', async () => {
    const { findByText, getAllByTestId } = render(
      <NavigationContainer>
        <UserProvider>
          <TimeZoneProvider>
            <HistoryScreen />
          </TimeZoneProvider>
        </UserProvider>
      </NavigationContainer>
    );
    
    // Find history items
    await findByText('Grilled Chicken Salad');
    
    // Check if AsyncStorage was called to load history
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@image_history');
    
    // Find and press delete button on the first item
    // This part depends on how the delete button is implemented in the HistoryScreen
    // We might need to adjust the selector based on the actual implementation
    const deleteButtons = await getAllByTestId('delete-button');
    fireEvent.press(deleteButtons[0]);
    
    // Verify that AsyncStorage.setItem was called to update history
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@image_history',
        expect.stringContaining('Banana Smoothie')
      );
      // The deleted item should be removed from the storage
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@image_history',
        expect.not.stringContaining('Grilled Chicken Salad')
      );
    });
  });
}); 