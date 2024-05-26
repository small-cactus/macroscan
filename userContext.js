import React, { createContext, useState, useContext, useEffect } from 'react';
import { firestore } from './firebaseConfig';
import { v4 as uuidv4 } from 'uuid';
import { collection, doc, setDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jwtDecode from 'jwt-decode';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Failed to load user from storage:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  const checkIfUserExists = async (identifier, key = 'email') => {
    console.log(`Checking if user exists with ${key}:`, identifier);
    const q = query(collection(firestore, 'users'), where(key, '==', identifier));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const existingUserDoc = querySnapshot.docs[0];
      const existingUser = existingUserDoc.data();
      console.log('User exists:', existingUser);
      return { exists: true, user: existingUser };
    }
    return { exists: false, user: null };
  };

  const createUserWithGoogle = async (idToken) => {
    console.log('Creating user with Google');

    const decodedToken = jwtDecode(idToken);
    const email = decodedToken.email;
    const name = decodedToken.name;

    const { exists, user: existingUser } = await checkIfUserExists(email);
    if (exists) {
      await AsyncStorage.setItem('@user', JSON.stringify(existingUser));
      await AsyncStorage.setItem('userName', existingUser.name); // Save userName
      setUser(existingUser);
      return existingUser;
    }

    const userId = uuidv4();
    const userDocRef = doc(firestore, 'users', userId);
    const newUser = {
      uid: userId,
      name: name || 'No Name',
      email: email || null,
      subscriptionStatus: 'free',
    };
    await setDoc(userDocRef, newUser);

    await AsyncStorage.setItem('@user', JSON.stringify(newUser));
    await AsyncStorage.setItem('userName', newUser.name); // Save userName
    setUser(newUser);
    console.log('New user created with Google:', newUser);
    return newUser;
  };

  const createUserWithApple = async (credential) => {
    const { identityToken, user: appleId } = credential;
    console.log('Creating user with Apple');

    const { exists, user: existingUser } = await checkIfUserExists(appleId, 'appleId');
    if (exists) {
      await AsyncStorage.setItem('@user', JSON.stringify(existingUser));
      await AsyncStorage.setItem('userName', existingUser.name); // Save userName
      setUser(existingUser);
      return existingUser;
    }

    const email = credential.email || null;
    const fullName = credential.fullName || {};
    const userId = uuidv4();
    const userDocRef = doc(firestore, 'users', userId);
    const newUser = {
      uid: userId,
      appleId: appleId,
      name: fullName.givenName || 'No Name',
      email: email,
      subscriptionStatus: 'free',
    };
    await setDoc(userDocRef, newUser);

    await AsyncStorage.setItem('@user', JSON.stringify(newUser));
    await AsyncStorage.setItem('userName', newUser.name); // Save userName
    setUser(newUser);
    console.log('New user created with Apple:', newUser);
    return newUser;
  };

  const updateUser = async (updates) => {
    if (!user) return;

    const userDocRef = doc(firestore, 'users', user.uid);
    await setDoc(userDocRef, updates, { merge: true });

    const updatedUser = { ...user, ...updates };
    await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));
    if (updates.name) {
      await AsyncStorage.setItem('userName', updates.name); // Save userName
    }
    setUser(updatedUser);
    console.log('User updated:', updates);
  };

  const deleteUser = async () => {
    if (!user) return;

    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await deleteDoc(userDocRef);
      await AsyncStorage.removeItem('@user');
      await AsyncStorage.removeItem('userName'); // Remove userName
      console.log('User deleted from Firestore');
      setUser(null);
    } catch (error) {
      console.error('Error deleting user document:', error);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, createUserWithGoogle, createUserWithApple, updateUser, deleteUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  return useContext(UserContext);
};
