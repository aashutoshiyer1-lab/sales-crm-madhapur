import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, remove, get } from 'firebase/database';

export const RTDB_BASE_URL = "https://sales-crm-madhapur-default-rtdb.firebaseio.com";

// Primary Firebase Configuration for Escape Time (Madhapur Branch)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDYDQWQSw-eyEUcVfwTddw3MmEdisqnNEc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sales-crm-madhapur.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || RTDB_BASE_URL,
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
 * Fetch bookings directly via REST API (Guaranteed fallback)
 */
export const fetchBookingsFromREST = async () => {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/${BOOKINGS_PATH}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return [];
    return Object.values(data);
  } catch (e) {
    console.warn("REST fetch warning:", e);
    return null;
  }
};

/**
 * Sync booking with Firebase Realtime Database (SDK + REST Fallback)
 */
export const saveBookingToFirebase = async (booking) => {
  let saved = false;

  // 1. Try Firebase RTDB SDK
  if (rtdb) {
    try {
      const bookingRef = ref(rtdb, `${BOOKINGS_PATH}/${booking.id}`);
      await set(bookingRef, booking);
      saved = true;
    } catch (sdkError) {
      console.warn("RTDB SDK save notice, attempting REST fallback:", sdkError);
    }
  }

  // 2. Direct REST Fallback
  if (!saved) {
    try {
      const res = await fetch(`${RTDB_BASE_URL}/${BOOKINGS_PATH}/${booking.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
      });
      if (res.ok) saved = true;
    } catch (restError) {
      console.error("REST fallback save failed:", restError);
    }
  }

  return saved;
};

/**
 * Remove booking from Firebase Realtime Database (SDK + REST Fallback)
 */
export const deleteBookingFromFirebase = async (bookingId) => {
  let deleted = false;

  // 1. Try Firebase RTDB SDK
  if (rtdb) {
    try {
      const bookingRef = ref(rtdb, `${BOOKINGS_PATH}/${bookingId}`);
      await remove(bookingRef);
      deleted = true;
    } catch (sdkError) {
      console.warn("RTDB SDK delete notice, attempting REST fallback:", sdkError);
    }
  }

  // 2. Direct REST Fallback
  if (!deleted) {
    try {
      const res = await fetch(`${RTDB_BASE_URL}/${BOOKINGS_PATH}/${bookingId}.json`, {
        method: 'DELETE'
      });
      if (res.ok) deleted = true;
    } catch (restError) {
      console.error("REST fallback delete failed:", restError);
    }
  }

  return deleted;
};
