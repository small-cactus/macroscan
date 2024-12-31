import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios'; // Ensure axios is installed
import jwtDecode from 'jwt-decode'; // [ADDED] Import jwtDecode

const UserContext = createContext();
const apiBaseUrl = 'https://us-central1-weighty-works-420523.cloudfunctions.net/distributeApiKey';

export const UserProvider = ({ children, mockSubscriptionStatus }) => { // [CHANGED] Accept mockSubscriptionStatus prop
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@user');
        const storedApiKey = await AsyncStorage.getItem('@apikey');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (mockSubscriptionStatus) { // [ADDED] Override subscriptionStatus if mock is provided
            parsedUser.subscriptionStatus = mockSubscriptionStatus;
          }
          setUser(parsedUser);
        }
        if (storedApiKey) {
          setApiKey(storedApiKey);
        }
      } catch (error) {
        console.error('Failed to load user or API key from storage:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserFromStorage();
  }, [mockSubscriptionStatus]); // [CHANGED] Add mockSubscriptionStatus as dependency

  const handleApiResponse = async (data) => {
    if (mockSubscriptionStatus) { // [ADDED] Override subscriptionStatus if mock is provided
      data.subscriptionStatus = mockSubscriptionStatus;
    }
    await AsyncStorage.setItem('@user', JSON.stringify(data));
    await AsyncStorage.setItem('@apikey', data.apiKey);
    setUser(data);
    setApiKey(data.apiKey);
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
        action: 'create'
      });
      const responseData = { ...response.data, name, email };
      if (mockSubscriptionStatus) { // [ADDED] Override subscriptionStatus if mock is provided
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
        action: 'create'
      });
      console.log('Cloud function output:', response.data);
      
      const newUser = { 
        ...response.data,
        email: response.data.email || email, // Prioritize email from cloud function
        name: response.data.name || fullName // Prioritize name from cloud function
      };
      if (mockSubscriptionStatus) { // [ADDED] Override subscriptionStatus if mock is provided
        newUser.subscriptionStatus = mockSubscriptionStatus;
      }
      await handleApiResponse(newUser);
      return newUser; // Return the newUser object, not response.data
    } catch (error) {
      console.error('Error creating user with Apple:', error);
      throw error;
    }
  };

  const updateUser = async (updates) => {
    if (!user) return;

    const sanitizeUpdates = (updates) => {
      return Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
    };

    const sanitizedUpdates = sanitizeUpdates(updates);
    console.log('Sanitized updates:', sanitizedUpdates);

    try {
      const response = await axios.post(apiBaseUrl, {
        userString: user.userString,
        updates: sanitizedUpdates,
        action: 'update'
      });
      const newUserDetails = { ...user, ...sanitizedUpdates, apiKey: response.data.apiKey };
      if (mockSubscriptionStatus) { // [ADDED] Override subscriptionStatus if mock is provided
        newUserDetails.subscriptionStatus = mockSubscriptionStatus;
      }
      await AsyncStorage.setItem('@user', JSON.stringify(newUserDetails));
      await AsyncStorage.setItem('@apikey', response.data.apiKey);
      setUser(newUserDetails);
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
      setUser(null);
      setApiKey('');
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, createUserWithGoogle, createUserWithApple, updateUser, deleteUser, loading, apiKey, setApiKey }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  return useContext(UserContext);
};