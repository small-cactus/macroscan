import axios from 'axios';

const apiBaseUrl = 'https://us-central1-weighty-works-420523.cloudfunctions.net/distributeApiKey';

export const createUser = async (name, email) => {
  try {
    const response = await axios.post(apiBaseUrl, {
      name,
      email
    });
    const { uid } = response.data;
    console.log('User created with UID:', uid);
    return uid;  // Return UID for client-side logic that may depend on it
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;  // Rethrow to handle it in the UI if necessary
  }
};
