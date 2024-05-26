// createUser.js
import { v4 as uuidv4 } from 'uuid';
import { createUserDocument } from './FirestoreContext';

export const createUser = async (name, email) => {
  const userId = uuidv4(); // Generate a unique user ID
  await createUserDocument(userId, name, email);
  return userId;
};
