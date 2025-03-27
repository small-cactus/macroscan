import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import { View, Text, TouchableOpacity } from 'react-native';
import { UserProvider, useUser } from '../../userContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock the AsyncStorage for consistent tests
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn((key) => {
    if (key === '@user') {
      return Promise.resolve(JSON.stringify({ 
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        userString: 'test-user-string',
        anthropicApiKey: 'test-anthropic-key',
        geminiApiKey: 'test-gemini-key',
        provider: 'anthropic'
      }));
    }
    if (key === '@apikey') {
      return Promise.resolve('test-anthropic-key');
    }
    if (key === '@gemini_api_key') {
      return Promise.resolve('test-gemini-key');
    }
    if (key === '@selected_provider') {
      return Promise.resolve('anthropic');
    }
    return Promise.resolve(null);
  }),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn(() => Promise.resolve({ 
    data: { 
      anthropicApiKey: 'updated-anthropic-key',
      geminiApiKey: 'updated-gemini-key',
      provider: 'gemini'
    } 
  }))
}));

// Create a test component that uses the context
const TestComponent = () => {
  const { 
    user, 
    updateUser,
    deleteUser,
    apiKeys,
    selectedProvider
  } = useUser();
  
  return (
    <View>
      <Text testID="user-data">{JSON.stringify(user)}</Text>
      <Text testID="has-user">{user ? 'yes' : 'no'}</Text>
      <Text testID="api-keys">{JSON.stringify(apiKeys)}</Text>
      <Text testID="selected-provider">{selectedProvider}</Text>
      <TouchableOpacity 
        testID="update-user" 
        onPress={() => updateUser({ name: 'Updated User' })}
      >
        <Text>Update User</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        testID="delete-user" 
        onPress={deleteUser}
      >
        <Text>Delete User</Text>
      </TouchableOpacity>
    </View>
  );
};

describe('UserContext', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('provides user data from AsyncStorage when available', async () => {
    const { getByTestId } = render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );
    
    // Wait for user data to be loaded from AsyncStorage
    await waitFor(() => {
      const userData = JSON.parse(getByTestId('user-data').props.children);
      expect(userData).toHaveProperty('uid', 'test-uid');
      expect(userData).toHaveProperty('email', 'test@example.com');
    });
  });

  it('provides API keys and selected provider', async () => {
    const { getByTestId } = render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );
    
    await waitFor(() => {
      const apiKeys = JSON.parse(getByTestId('api-keys').props.children);
      expect(apiKeys).toHaveProperty('anthropicApiKey', 'test-anthropic-key');
      expect(apiKeys).toHaveProperty('geminiApiKey', 'test-gemini-key');
      expect(getByTestId('selected-provider').props.children).toBe('anthropic');
    });
  });

  it('handles user deletion correctly', async () => {
    const { getByTestId } = render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );
    
    // Initially has user
    await waitFor(() => {
      expect(getByTestId('has-user').props.children).toBe('yes');
    });
    
    // Simulate delete user
    await act(async () => {
      fireEvent.press(getByTestId('delete-user'));
    });
    
    // Should have called AsyncStorage.removeItem
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@user');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@apikey');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@gemini_api_key');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@selected_provider');
    
    // User should be null
    await waitFor(() => {
      expect(getByTestId('has-user').props.children).toBe('no');
    });
  });
}); 