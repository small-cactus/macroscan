// context/UserContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import jwtDecode from 'jwt-decode';

const UserContext = createContext();
const apiBaseUrl = 'https://us-central1-weighty-works-420523.cloudfunctions.net/distributeApiKey';

export const UserProvider = ({ children, mockSubscriptionStatus }) => {
  const [user, setUser] = useState(null);
  // Manage both API keys and the selected provider.
  const [apiKeys, setApiKeys] = useState({ anthropicApiKey: '', geminiApiKey: '' });
  const [selectedProvider, setSelectedProvider] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@user');
        const storedAnthropicApiKey = await AsyncStorage.getItem('@apikey'); // Anthropi­c key
        const storedGeminiApiKey = await AsyncStorage.getItem('@gemini_api_key');
        const storedProvider = await AsyncStorage.getItem('@selected_provider');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (mockSubscriptionStatus) {
            parsedUser.subscriptionStatus = mockSubscriptionStatus;
          }
          setUser(parsedUser);
        }
        if (storedAnthropicApiKey && storedGeminiApiKey) {
          setApiKeys({ anthropicApiKey: storedAnthropicApiKey, geminiApiKey: storedGeminiApiKey });
        }
        if (storedProvider) {
          setSelectedProvider(storedProvider);
        }
      } catch (error) {
        console.error('Failed to load user, API keys or provider from storage:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserFromStorage();
  }, [mockSubscriptionStatus]);

  const handleApiResponse = async (data) => {
    if (mockSubscriptionStatus) {
      data.subscriptionStatus = mockSubscriptionStatus;
    }
    // Save the user, API keys, and provider in AsyncStorage
    await AsyncStorage.setItem('@user', JSON.stringify(data));
    await AsyncStorage.setItem('@apikey', data.anthropicApiKey);
    await AsyncStorage.setItem('@gemini_api_key', data.geminiApiKey);
    await AsyncStorage.setItem('@selected_provider', data.provider);
    setUser(data);
    setApiKeys({ anthropicApiKey: data.anthropicApiKey, geminiApiKey: data.geminiApiKey });
    setSelectedProvider(data.provider);
  };

  const createUserWithGoogle = async (idToken) => {
    const decodedToken = jwtDecode(idToken);
    const email = decodedToken.email;
    const name = decodedToken.name || null;

    try {
      const response = await axios.post(apiBaseUrl, {
        userString: email,
        email: email,
        name: name,
        action: 'create',
      });
      const responseData = { ...response.data, name, email };
      if (mockSubscriptionStatus) {
        responseData.subscriptionStatus = mockSubscriptionStatus;
      }
      await handleApiResponse(responseData);
    } catch (error) {
      console.error('Error creating user with Google:', error);
    }
  };

  const createUserWithApple = async (credential) => {
    const userString = credential.user;
    const email = credential.email || '';
    let fullName = '';
    if (credential.fullName) {
      fullName = `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim();
    }
  
    try {
      const response = await axios.post(apiBaseUrl, {
        userString: userString,
        email: email,
        name: fullName || null,
        action: 'create',
      });
      console.log('Cloud function output:', response.data);
      
      const newUser = { 
        ...response.data,
        email: response.data.email || email,
        name: response.data.name || fullName,
      };
      if (mockSubscriptionStatus) {
        newUser.subscriptionStatus = mockSubscriptionStatus;
      }
      await handleApiResponse(newUser);
      return newUser;
    } catch (error) {
      console.error('Error creating user with Apple:', error);
      throw error;
    }
  };

  const updateUser = async (updates) => {
    if (!user) return;

    const sanitizeUpdates = (updates) => {
      return Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );
    };

    const sanitizedUpdates = sanitizeUpdates(updates);
    console.log('Sanitized updates:', sanitizedUpdates);

    try {
      const response = await axios.post(apiBaseUrl, {
        userString: user.userString,
        updates: sanitizedUpdates,
        action: 'update',
      });
      const newUserDetails = { 
        ...user, 
        ...sanitizedUpdates, 
        anthropicApiKey: response.data.anthropicApiKey, 
        geminiApiKey: response.data.geminiApiKey,
        provider: response.data.provider,
      };
      if (mockSubscriptionStatus) {
        newUserDetails.subscriptionStatus = mockSubscriptionStatus;
      }
      await AsyncStorage.setItem('@user', JSON.stringify(newUserDetails));
      await AsyncStorage.setItem('@apikey', response.data.anthropicApiKey);
      await AsyncStorage.setItem('@gemini_api_key', response.data.geminiApiKey);
      await AsyncStorage.setItem('@selected_provider', response.data.provider);
      setUser(newUserDetails);
      setApiKeys({ anthropicApiKey: response.data.anthropicApiKey, geminiApiKey: response.data.geminiApiKey });
      setSelectedProvider(response.data.provider);
      console.log('User updated:', newUserDetails);
    } catch (error) {
      console.error('Error updating user:', error);
      console.error('Error details:', error.response ? error.response.data : error.message);
    }
  };

  const deleteUser = async () => {
    if (!user) return;

    try {
      await axios.post(apiBaseUrl, { userString: user.userString, action: 'delete' });
      await AsyncStorage.removeItem('@user');
      await AsyncStorage.removeItem('@apikey');
      await AsyncStorage.removeItem('@gemini_api_key');
      await AsyncStorage.removeItem('@selected_provider');
      setUser(null);
      setApiKeys({ anthropicApiKey: '', geminiApiKey: '' });
      setSelectedProvider('');
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        createUserWithGoogle,
        createUserWithApple,
        updateUser,
        deleteUser,
        loading,
        apiKeys,
        setApiKeys,
        selectedProvider,
        setSelectedProvider,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  return useContext(UserContext);
};