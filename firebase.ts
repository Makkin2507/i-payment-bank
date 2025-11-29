
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBm8xeFMR_w42NUvO-b8Mp6dRhRyL0Y75k",
  authDomain: "ibrahim-family.firebaseapp.com",
  databaseURL: "https://ibrahim-family-default-rtdb.firebaseio.com",
  projectId: "ibrahim-family",
  storageBucket: "ibrahim-family.firebasestorage.app",
  messagingSenderId: "687604018961",
  appId: "1:687604018961:web:759b9513c853b38e91e6b0",
  measurementId: "G-5THXS91V8W"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
