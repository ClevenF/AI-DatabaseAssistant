// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDgP9cfTTxL9aVvNMKyVHreg57zVZJCZVQ",
  authDomain: "majorproject-c1d08.firebaseapp.com",
  projectId: "majorproject-c1d08",
  storageBucket: "majorproject-c1d08.firebasestorage.app",
  messagingSenderId: "1020582692743",
  appId: "1:1020582692743:web:fbe6643b392c983eb93522",
  measurementId: "G-T17B0ND4VB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics (optional)
export const analytics = getAnalytics(app);

export default app;
