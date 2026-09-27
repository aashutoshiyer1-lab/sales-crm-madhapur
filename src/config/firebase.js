import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, remove, get } from 'firebase/database';

// Configuration can be loaded from Vite environment variables (for Vercel deployment)
// or fallback placeholders.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_MADHAPUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_MADHAPUR_AUTH_DOMAIN",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "YOUR_MADHAPUR_FIREBASE_DATABASE_URL_HERE",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_MADHAPUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_MADHAPUR_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MADHAPUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_MADHAPUR_APP_ID"
};

export const isFirebaseConfigured = () => {
  return (
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes("YOUR_MADHAPUR") &&
    firebaseConfig.databaseURL &&
    !firebaseConfig.databaseURL.includes("YOUR_MADHAPUR")
  );
};

let app = null;
let rtdb = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    rtdb = getDatabase(app);
  } catch (err) {
    console.warn("Firebase initialization warning:", err);
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
    console.info("Firebase not configured yet; saved locally.");
    return false;
  }
  try {
    const bookingRef = ref(rtdb, `${BOOKINGS_PATH}/${booking.id}`);
    await set(bookingRef, booking);
    return true;
  } catch (error) {
    console.error("Error saving booking to Firebase:", error);
    throw error;
  }
};

/**
 * Remove booking from Firebase Realtime Database
 */
export const deleteBookingFromFirebase = async (bookingId) => {
  if (!rtdb) {
    console.info("Firebase not configured yet; deleted locally.");
    return false;
  }
  try {
    const bookingRef = ref(rtdb, `${BOOKINGS_PATH}/${bookingId}`);
    await remove(bookingRef);
    return true;
  } catch (error) {
    console.error("Error deleting booking from Firebase:", error);
    throw error;
  }
};
