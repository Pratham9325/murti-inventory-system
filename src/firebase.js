import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDmCPixIWe5PMlSofQPQbN8AyulUf4ahT4',
  authDomain: 'murti-inventory-system.firebaseapp.com',
  projectId: 'murti-inventory-system',
  storageBucket: 'murti-inventory-system.firebasestorage.app',
  messagingSenderId: '1014642295878',
  appId: '1:1014642295878:web:3926745991970bde75b647',
  measurementId: 'G-5EESFEWNP7'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
