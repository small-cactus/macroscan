// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "FIREBASE_API_KEY_REMOVED",
  authDomain: "macro-scan.firebaseapp.com",
  projectId: "macro-scan",
  storageBucket: "macro-scan.appspot.com",
  messagingSenderId: "830662615947",
  appId: "1:830662615947:web:620aaae66fa87dabbb458e",
  measurementId: "G-FR3DJDB0RY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

export { auth, firestore };
