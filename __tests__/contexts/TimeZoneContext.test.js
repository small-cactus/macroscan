import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { TimeZoneProvider, useTimeZone } from '../../TimeZoneContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Create a test component that uses the context
const TestComponent = () => {
  const { 
    userTimeZone,
    timeZoneOffset,
    getUserDate,
    getTodayString,
    formatDate,
    isDateToday
  } = useTimeZone();
  
  return (
    <View>
      <Text testID="time-zone">{userTimeZone}</Text>
      <Text testID="time-zone-offset">{timeZoneOffset}</Text>
      <Text testID="today-string">{getTodayString()}</Text>
    </View>
  );
};

describe('TimeZoneContext', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Default mock values
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === '@user_timezone') return Promise.resolve('America/New_York');
      if (key === '@timezone_offset') return Promise.resolve('-18000'); // -5 hours in seconds
      return Promise.resolve(null);
    });
  });

  it('provides time zone from AsyncStorage when available', async () => {
    const { getByTestId } = render(
      <TimeZoneProvider>
        <TestComponent />
      </TimeZoneProvider>
    );
    
    await waitFor(() => {
      expect(getByTestId('time-zone').props.children).toBe('America/New_York');
    });
  });

  it('provides time zone offset from AsyncStorage when available', async () => {
    const { getByTestId } = render(
      <TimeZoneProvider>
        <TestComponent />
      </TimeZoneProvider>
    );
    
    await waitFor(() => {
      expect(getByTestId('time-zone-offset').props.children).toBe(-18000);
    });
  });

  it('provides today string in correct format', async () => {
    const { getByTestId } = render(
      <TimeZoneProvider>
        <TestComponent />
      </TimeZoneProvider>
    );
    
    await waitFor(() => {
      const todayString = getByTestId('today-string').props.children;
      // Check that today string is in YYYY-MM-DD format
      expect(todayString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('stores timezone in AsyncStorage if not already stored', async () => {
    // Mock no existing data in AsyncStorage
    AsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));
    
    render(
      <TimeZoneProvider>
        <TestComponent />
      </TimeZoneProvider>
    );
    
    // Wait for AsyncStorage.setItem to be called
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@user_timezone', expect.any(String));
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@timezone_offset', expect.any(String));
    });
  });
}); 