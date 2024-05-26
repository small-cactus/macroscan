import React, { createContext, useContext } from 'react';
import { firestore } from './firebaseConfig';
import { collection, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';

const FirestoreContext = createContext();

export const FirestoreProvider = ({ children }) => {

  const createUserDocument = async (userId, name, email) => {
    try {
      await setDoc(doc(firestore, 'users', userId), {
        name,
        email,
        subscriptionStatus: 'free',
      });
    } catch (error) {
      console.error('Error creating user document: ', error);
    }
  };

  const updateUserSubscriptionStatus = async (userId, subscriptionStatus) => {
    try {
      await updateDoc(doc(firestore, 'users', userId), {
        subscriptionStatus,
      });
    } catch (error) {
      console.error('Error updating subscription status: ', error);
    }
  };

  const getUserDocument = async (userId) => {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data();
      } else {
        console.log('No such document!');
        return null;
      }
    } catch (error) {
      console.error('Error getting user document: ', error);
      throw error;
    }
  };

  return (
    <FirestoreContext.Provider value={{ createUserDocument, updateUserSubscriptionStatus, getUserDocument }}>
      {children}
    </FirestoreContext.Provider>
  );
};

export const useFirestore = () => useContext(FirestoreContext);
