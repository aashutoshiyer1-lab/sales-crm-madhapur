import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import CalendarDashboard from './components/CalendarDashboard';
import SalesDashboard from './components/SalesDashboard';
import ClosingMessageGenerator from './components/ClosingMessageGenerator';
import BookingModal from './components/BookingModal';
import BookingDetailModal from './components/BookingDetailModal';
import LoginView from './components/LoginView';
import {
  rtdb,
  ref,
  onValue,
  saveBookingToFirebase,
  deleteBookingFromFirebase,
  fetchBookingsFromREST,
  isFirebaseConfigured,
  BOOKINGS_PATH
} from './config/firebase';

const LOCAL_STORAGE_KEY = 'escapetime_madhapur_bookings_v1';
const AUTH_STORAGE_KEY = 'escapetime_madhapur_auth';

// Initial realistic sample data for Escape Time Madhapur
const getInitialSampleBookings = () => {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      id: "ETM-SAMPLE-01",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: today,
      timeSlot: "11:30 AM",
      gameName: "Bank Heist",
      players: 4,
      ratePerPlayer: 899,
      baseTotal: 3596,
      offerId: "none",
      offerName: "No Discount (Standard Rate)",
      discountPercent: 0,
      discountAmount: 0,
      finalTotal: 3596,
      customerName: "Vikram Reddy",
      customerPhone: "9876543210",
      notes: "First time playing escape room",
      reference: "",
      payments: {
        "UPI-New Pay": 3596
      },
      isPending: false,
      paymentStatus: "paid"
    },
    {
      id: "ETM-SAMPLE-02",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: today,
      timeSlot: "01:00 PM",
      gameName: "The Lost Recipe",
      players: 6,
      ratePerPlayer: 899,
      baseTotal: 5394,
      offerId: "second_game",
      offerName: "Second Game Special (20% OFF)",
      discountPercent: 20,
      discountAmount: 1079,
      finalTotal: 4315,
      customerName: "Sneha Kapur",
      customerPhone: "9123456789",
      notes: "Played Bank Heist earlier",
      reference: "Khaja Sir",
      payments: {
        "Cash": 2000,
        "Card": 2315
      },
      isPending: false,
      paymentStatus: "paid"
    },
    {
      id: "ETM-SAMPLE-03",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: today,
      timeSlot: "03:15 PM",
      gameName: "Curse of the Mummy",
      players: 3,
      ratePerPlayer: 999,
      baseTotal: 2997,
      offerId: "none",
      offerName: "No Discount (Standard Rate)",
      discountPercent: 0,
      discountAmount: 0,
      finalTotal: 2997,
      customerName: "Ananya Iyer",
      customerPhone: "9988776655",
      notes: "District voucher booking",
      reference: "Khaja Sir",
      payments: {
        "Prepaid by District": 2997
      },
      isPending: false,
      paymentStatus: "paid"
    },
    {
      id: "ETM-SAMPLE-04",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: today,
      timeSlot: "05:00 PM",
      gameName: "Prison Break",
      players: 5,
      ratePerPlayer: 899,
      baseTotal: 4495,
      offerId: "none",
      offerName: "No Discount (Standard Rate)",
      discountPercent: 0,
      discountAmount: 0,
      finalTotal: 4495,
      customerName: "Karthik Verma",
      customerPhone: "9848012345",
      notes: "Collect cash upon arrival",
      reference: "Corporate Reference",
      payments: {
        "Cash": 1000
      },
      isPending: true,
      paymentStatus: "pending"
    }
  ];
};

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  });

  // Current View: 'calendar' or 'sales' or 'closing'
  const [currentView, setCurrentView] = useState('calendar');
  const [viewKey, setViewKey] = useState(0);

  // Selected Date (defaults to Today YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Whenever switching views, ALWAYS reset date to Today's date!
  const handleViewChange = useCallback((newView) => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setCurrentView(newView);
    setViewKey(prev => prev + 1);
  }, []);

  // Bookings State initialized from LocalStorage or Sample
  const [bookings, setBookings] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Could not load from localStorage:", e);
    }
    return getInitialSampleBookings();
  });

  // Sync / Cloud States
  const [isFirebaseActive, setIsFirebaseActive] = useState(isFirebaseConfigured());
  const [isSyncing, setIsSyncing] = useState(false);

  // Modal States
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState(null);
  const [bookingSlotDefaults, setBookingSlotDefaults] = useState({ date: null, timeSlot: null });

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState(null);

  // Keep LocalStorage in sync instantly
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bookings));
    } catch (e) {
      console.error("Failed to write to localStorage:", e);
    }
  }, [bookings]);

  // Firebase Realtime Listener & Initial Sync
  useEffect(() => {
    let isMounted = true;

    // 1. Initial REST fetch for instant guaranteed synchronization
    fetchBookingsFromREST().then(list => {
      if (isMounted && list !== null) {
        setBookings(list);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      }
    });

    // 2. Realtime WebSocket listener
    if (!isFirebaseConfigured() || !rtdb) {
      setIsFirebaseActive(false);
      return;
    }

    setIsFirebaseActive(true);
    setIsSyncing(true);

    const bookingsRef = ref(rtdb, BOOKINGS_PATH);
    const unsubscribe = onValue(
      bookingsRef,
      (snapshot) => {
        setIsSyncing(false);
        if (snapshot.exists()) {
          const val = snapshot.val();
          if (val) {
            const list = Object.values(val);
            setBookings(list);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
          }
        } else {
          // Database has been emptied - respect empty list!
          setBookings([]);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
        }
      },
      (error) => {
        console.warn("Firebase Realtime Database listener notice:", error);
        setIsSyncing(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Handle Login & Logout
  const handleLoginSuccess = () => {
    localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
  };

  // Open New Booking Modal
  const handleOpenNewBooking = useCallback((defaults = {}) => {
    setBookingToEdit(null);
    setBookingSlotDefaults({
      date: defaults?.date || selectedDate,
      timeSlot: defaults?.timeSlot || null
    });
    setIsBookingModalOpen(true);
  }, [selectedDate]);

  // Open Edit Booking Modal
  const handleOpenEditBooking = useCallback((booking) => {
    if (!booking) return;
    setBookingToEdit(booking);
    setBookingSlotDefaults({ date: booking.date, timeSlot: booking.timeSlot });
    setIsBookingModalOpen(true);
  }, []);

  // Smart handler: routes to Edit if target has an ID, or New if just slot defaults
  const handleOpenBookingModal = useCallback((target = {}) => {
    if (target && target.id) {
      handleOpenEditBooking(target);
    } else {
      handleOpenNewBooking(target);
    }
  }, [handleOpenEditBooking, handleOpenNewBooking]);

  // Open Receipt Modal
  const handleOpenDetail = (booking) => {
    setSelectedBookingForDetail(booking);
    setIsDetailModalOpen(true);
  };

  // OPTIMISTIC SAVE / UPDATE (0ms Instant Latency + Background Dual Cloud Sync)
  const handleSaveBooking = useCallback(async (bookingData) => {
    // 1. Instant 0ms Local React State Update
    setBookings(prev => {
      const idx = prev.findIndex(b => b.id === bookingData.id);
      let next;
      if (idx >= 0) {
        next = [...prev];
        next[idx] = bookingData;
      } else {
        next = [bookingData, ...prev];
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    // 2. Background Cloud Sync to Firebase (SDK + REST Fallback)
    try {
      setIsSyncing(true);
      await saveBookingToFirebase(bookingData);
    } catch (err) {
      console.warn("Background sync notice:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // OPTIMISTIC DELETE (0ms Instant Latency + Background Dual Cloud Sync)
  const handleDeleteBooking = useCallback(async (bookingId) => {
    if (!window.confirm("Are you sure you want to delete this booking entry?")) {
      return;
    }

    // 1. Instant 0ms Local React State Update
    setBookings(prev => {
      const next = prev.filter(b => b.id !== bookingId);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    // 2. Background Cloud Sync to Firebase (SDK + REST Fallback)
    try {
      setIsSyncing(true);
      await deleteBookingFromFirebase(bookingId);
    } catch (err) {
      console.warn("Background deletion notice:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // If locked/not authenticated, render PIN Screen
  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#fffff0] text-slate-900 flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <Navbar
        currentView={currentView}
        setCurrentView={handleViewChange}
        onOpenNewBooking={() => handleOpenNewBooking()}
        isFirebaseActive={isFirebaseActive}
        isSyncing={isSyncing}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {currentView === 'calendar' && (
          <CalendarDashboard
            key={`calendar-${viewKey}`}
            bookings={bookings}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onOpenBookingModal={handleOpenBookingModal}
            onOpenNewBooking={handleOpenNewBooking}
            onOpenEditBooking={handleOpenEditBooking}
            onOpenDetailModal={handleOpenDetail}
            onDeleteBooking={handleDeleteBooking}
          />
        )}
        {currentView === 'sales' && (
          <SalesDashboard
            key={`sales-${viewKey}`}
            bookings={bookings}
            onOpenBookingModal={handleOpenEditBooking}
            onOpenDetailModal={handleOpenDetail}
            onDeleteBooking={handleDeleteBooking}
          />
        )}
        {currentView === 'closing' && (
          <ClosingMessageGenerator
            key={`closing-${viewKey}`}
            bookings={bookings}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        )}
      </main>

      {/* Booking Form Modal */}
      <BookingModal
        key={bookingToEdit ? `edit-${bookingToEdit.id}` : `new-${bookingSlotDefaults.date || ''}-${bookingSlotDefaults.timeSlot || ''}`}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onSave={handleSaveBooking}
        bookingToEdit={bookingToEdit}
        defaultDate={bookingSlotDefaults.date}
        defaultSlot={bookingSlotDefaults.timeSlot}
        bookings={bookings}
      />

      {/* Receipt Modal */}
      <BookingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        booking={selectedBookingForDetail}
        onEdit={handleOpenEditBooking}
      />

    </div>
  );
}
