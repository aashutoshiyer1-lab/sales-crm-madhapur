import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, remove, get } from 'firebase/database';

// Primary Firebase Configuration for Escape Time (Madhapur Branch)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDYDQWQSw-eyEUcVfwTddw3MmEdisqnNEc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sales-crm-madhapur.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://sales-crm-madhapur-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sales-crm-madhapur",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sales-crm-madhapur.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "13548032124",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:13548032124:web:338573729fe9e6d82579f9",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-MKQYY5SPDR"
};

export const isFirebaseConfigured = () => {
  return (
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes("YOUR_") &&
    firebaseConfig.projectId === "sales-crm-madhapur"
  );
};

let app = null;
let rtdb = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    rtdb = getDatabase(app);
  } catch (err) {
    console.warn("Firebase initialization notice:", err);
  }
}

export { app, rtdb, ref, onValue, set, remove, get };

// RTDB Node path for Madhapur branch
export const BOOKINGS_PATH = 'madhapur/bookings';

/**
 * Sync booking with Firebase Realtime Database
 */
export const saveBookingToFirebase = async (booking) => {
  if (!rtdb) {
    console.info("Firebase RTDB not initialized; persisted locally in browser.");
    return false;
  }
  try {
    const bookingRef = ref(rtdb, `${BOOKINGS_PATH}/${booking.id}`);
    await set(bookingRef, booking);
    return true;
  } catch (error) {
    console.error("Error saving booking to Firebase Realtime Database:", error);
    throw error;
  }
};

/**
 * Remove booking from Firebase Realtime Database
 */
export const deleteBookingFromFirebase = async (bookingId) => {
  if (!rtdb) {
    console.info("Firebase RTDB not initialized; deleted locally in browser.");
    return false;
  }
  try {
    const bookingRef = ref(rtdb, `${BOOKINGS_PATH}/${bookingId}`);
    await remove(bookingRef);
    return true;
  } catch (error) {
    console.error("Error deleting booking from Firebase Realtime Database:", error);
    throw error;
  }
};
