import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDkmVLAtwyrNIpbmJxUPfKq_zBIB58KyMo",
  authDomain: "sostutuzioni-smart.firebaseapp.com",
  projectId: "sostutuzioni-smart",
  storageBucket: "sostutuzioni-smart.firebasestorage.app",
  messagingSenderId: "715617762221",
  appId: "1:715617762221:web:d2ccabf48488cf6e563f24",
  measurementId: "G-HDM9D9D9M"
};

// Inizializzazione Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
export const db = getFirestore(app);
