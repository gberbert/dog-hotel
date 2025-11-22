import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyACJGg6OZiZ16aEBOTFaUq9kqQmLxV6OU0",
  authDomain: "doghotel-eca69.firebaseapp.com",
  projectId: "doghotel-eca69",
  storageBucket: "doghotel-eca69.firebasestorage.app",
  messagingSenderId: "845677452140",
  appId: "1:845677452140:web:eb3d58618809c16dccf149"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const appId = 'doghotel-production';