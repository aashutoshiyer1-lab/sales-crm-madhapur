import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  Plus,
  Trash2,
  Share2,
  Sparkles,
  DollarSign,
  AlertCircle,
  Printer,
  RotateCcw,
  X,
  Edit3,
  Tag,
  CheckCircle2,
  Eye,
  PlusCircle
} from 'lucide-react';
import { getPaidTotal, getBookingCategory } from '../utils/pricingEngine';
import {
  STAFF_ROSTER,
  GAMES,
  OFFERS,
  isComplimentaryBooking,
  shiftDateString,
  getTodayDateString
} from '../config/venueData';
import {
  rtdb,
  ref,
  onValue,
  isFirebaseConfigured,
  CLOSING_REPORTS_PATH,
  saveClosingReportToFirebase,
  fetchClosingReportFromFirebase
} from '../config/firebase';

/**
 * Format custom notes with proper grammar:
 * - Capitalize first letter
 * - Trailing punctuation (. ! ?)
 * - Strip prefixes like "Note:", "note -", "custom note:", etc.
 * - Never output "None", "no discount", or empty
 */
export const formatCustomNoteGrammar = (note) => {
  if (!note || typeof note !== 'string') return '';
  let cleaned = note.trim();
  if (!cleaned) return '';

  // Strip prefixes like "Note:", "note -", "custom note:", etc.
  cleaned = cleaned.replace(/^(?:note|custom note)\s*[:-]?\s*/i, '').trim();

  // If empty or matches none / no discount / n/a / nil
  if (!cleaned || /^(?:none|no discount|n\/?a|nil)$/i.test(cleaned)) {
    return '';
  }

  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  // Ensure trailing punctuation (. ! ?)
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }

  return cleaned;
};

/**
 * Construct the base sentence for each booking note:
 * - Website / District / Activity Kids
 * - Complimentary kids under 5
 * - Standard discounts (Cross Promo, Second Game, Birthday, Corporate, High Prices)
 * - Custom discount
 * (Nayeem / 900 reference completely stripped)
 */
export const generateBookingNoteSentence = (booking) => {
  const pax = booking.players || 1;
  const room = booking.gameName || 'Escape Room';
  const offerId = booking.offerId || 'none';
  const offer = OFFERS.find(o => o.id === offerId);
  const rawRef = booking.reference ? booking.reference : (offer?.defaultReference || 'Khaja Sir');
  const ref = (rawRef || 'Khaja Sir').replace(/nayeem\s*sir|900/gi, '').trim() || 'Khaja Sir';
  const pct = booking.discountPercent || offer?.discountPercent || 0;
  const customReason = (booking.customDiscountReason || '').trim();

  // 1. Website / District / Activity Kids (Prepaid)
  if (offerId === 'website_booking' || offer?.channel === 'Website') {
    return `Today we had a group of ${pax} who made booking through Website for ${room}.`;
  }
  if (offerId === 'district_app' || offer?.channel === 'District') {
    return `Today we had a group of ${pax} who made booking through District for ${room}.`;
  }
  if (offerId === 'activity_kids' || offer?.channel === 'Activity Kids') {
    return `Today we had a group of ${pax} who made booking through Activity Kids for ${room}.`;
  }

  // 2. Complimentary under 5
  if (offerId === 'complimentary' || offer?.isComplimentary) {
    return `Given complementary game to ${pax} kids as they were under 5 years for ${room} and as per ${ref} reference.`;
  }

  // 3. Custom Discount
  if (offerId === 'custom_discount' || offer?.isCustomPercent) {
    const reasonPart = customReason ? customReason : 'custom discount';
    return `Given ${pct}% discount to group of ${pax} players for ${room} as ${reasonPart}.`;
  }

  // 4. Standard Discounts (Cross Promo, Second Game, Birthday, Corporate, High Prices, etc.)
  if (pct > 0 || (offer && offerId !== 'none')) {
    const reasonText = offer?.reasonText || customReason || 'special offer';
    return `Given ${pct}% discount to group of ${pax} players for ${room} as ${reasonText} and as per ${ref} reference.`;
  }

  // Standard rate booking with note
  return `Today we had a group of ${pax} players for ${room}.`;
};

/**
 * Opens a print window with monospace typography and triggers window.print()
 */
export const executePrintWindow = (title, textContent) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Courier New', monospace; white-space: pre-wrap; padding: 24px; font-size: 14px; line-height: 1.6; color: #000; }
          h2 { margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 6px; }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <div>${(textContent || '').replace(/\n/g, '<br>')}</div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

const getInitialClosingData = (targetDate) => {
  try {
    const raw = localStorage.getItem(`escapetime_madhapur_closing_${targetDate}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading closing storage", e);
  }
  return null;
};

export default function ClosingMessageGenerator({ bookings, selectedDate, setSelectedDate }) {
  const [closingDate, setClosingDate] = useState(
    selectedDate || new Date().toISOString().split('T')[0]
  );

  // Synchronize closingDate whenever selectedDate updates (ensures returning to view always shows current date)
  useEffect(() => {
    if (selectedDate) {
      setClosingDate(selectedDate);
    }
  }, [selectedDate]);

  const initialSaved = useMemo(() => getInitialClosingData(closingDate), [closingDate]);

  // Closing Staff Name (at bottom of message)
  const [closingStaff, setClosingStaff] = useState(initialSaved?.closingStaff || "Bhavani");
  const [customClosingStaff, setCustomClosingStaff] = useState(initialSaved?.customClosingStaff || "");

  // Mummy staff tracker: Array of { name: string, count: number } - defaults to empty [] for fresh dates!
  const [mummyActors, setMummyActors] = useState(() => {
    return Array.isArray(initialSaved?.mummyActors) ? initialSaved.mummyActors : [];
  });
  const [newActorName, setNewActorName] = useState("");
  const [newActorCount, setNewActorCount] = useState(1);

  // Excess, Short & Note fields
  const [excessAmount, setExcessAmount] = useState(initialSaved?.excessAmount || "00");
  const [shortAmount, setShortAmount] = useState(initialSaved?.shortAmount || "00");
  const [closingNote, setClosingNote] = useState(initialSaved?.closingNote || "");

  // Print Escape Notes State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printNotesText, setPrintNotesText] = useState(initialSaved?.printNotesText || "");
  const [isPrintNotesCustomized, setIsPrintNotesCustomized] = useState(initialSaved?.isPrintNotesCustomized || false);

  // Manual Discount Entries added directly on Closing screen (persisted in RTDB)
  const [manualDiscountEntries, setManualDiscountEntries] = useState(() => {
    return Array.isArray(initialSaved?.manualDiscountEntries) ? initialSaved.manualDiscountEntries : [];
  });

  // Direct Editable Closing Message Mode (staff can edit any sentence/line across devices)
  const [isEditMessageMode, setIsEditMessageMode] = useState(
    initialSaved?.isEditMessageMode || false
  );
  const [customFullMessage, setCustomFullMessage] = useState(
    initialSaved?.customFullMessage || ""
  );

  // Form State for Adding a New Discount Entry
  const [newDiscRoom, setNewDiscRoom] = useState(GAMES[0]?.name || "Bank Heist");
  const [newDiscOfferId, setNewDiscOfferId] = useState("cross_promotion");
  const [newDiscPax, setNewDiscPax] = useState(4);
  const [newDiscPercent, setNewDiscPercent] = useState(30);
  const [newDiscRef, setNewDiscRef] = useState("Khaja Sir");
  const [newDiscCustomerName, setNewDiscCustomerName] = useState("");
  const [newDiscPhone, setNewDiscPhone] = useState("");
  const [newDiscNote, setNewDiscNote] = useState("");

  const [copiedStatus, setCopiedStatus] = useState(false);

  // Guard to prevent saving previous date's in-flight state to the newly selected date
  const loadedDateRef = useRef(closingDate);
  const isSwitchingDateRef = useRef(false);

  // Sync state when closing date changes (load from LocalStorage first for instant 0ms UI)
  useEffect(() => {
    isSwitchingDateRef.current = true;
    loadedDateRef.current = closingDate;

    const saved = getInitialClosingData(closingDate);
    if (saved) {
      setClosingStaff(saved.closingStaff || "Bhavani");
      setCustomClosingStaff(saved.customClosingStaff || "");
      setMummyActors(Array.isArray(saved.mummyActors) ? saved.mummyActors : []);
      setExcessAmount(saved.excessAmount || "00");
      setShortAmount(saved.shortAmount || "00");
      setClosingNote(saved.closingNote || "");
      setPrintNotesText(saved.printNotesText || "");
      setIsPrintNotesCustomized(saved.isPrintNotesCustomized || false);
      setManualDiscountEntries(Array.isArray(saved.manualDiscountEntries) ? saved.manualDiscountEntries : []);
      setIsEditMessageMode(saved.isEditMessageMode || false);
      setCustomFullMessage(saved.customFullMessage || "");
    } else {
      // Fresh new date: reset EVERYTHING to fresh clean state with empty mummyActors!
      setClosingStaff("Bhavani");
      setCustomClosingStaff("");
      setMummyActors([]);
      setExcessAmount("00");
      setShortAmount("00");
      setClosingNote("");
      setPrintNotesText("");
      setIsPrintNotesCustomized(false);
      setManualDiscountEntries([]);
      setIsEditMessageMode(false);
      setCustomFullMessage("");
    }

    const timer = setTimeout(() => {
      isSwitchingDateRef.current = false;
    }, 100);

    return () => clearTimeout(timer);
  }, [closingDate]);

  // On date change, also fetch latest from Firebase directly (so refresh on laptop/phone always loads latest)
  useEffect(() => {
    let isCancelled = false;
    const fetchLatest = async () => {
      try {
        const cloudData = await fetchClosingReportFromFirebase(closingDate);
        if (!isCancelled) {
          if (cloudData) {
            if (cloudData.closingStaff !== undefined) setClosingStaff(cloudData.closingStaff);
            if (cloudData.customClosingStaff !== undefined) setCustomClosingStaff(cloudData.customClosingStaff);
            if (cloudData.mummyActors !== undefined) {
              setMummyActors(Array.isArray(cloudData.mummyActors) ? cloudData.mummyActors : []);
            }
            if (cloudData.excessAmount !== undefined) setExcessAmount(cloudData.excessAmount);
            if (cloudData.shortAmount !== undefined) setShortAmount(cloudData.shortAmount);
            if (cloudData.closingNote !== undefined) setClosingNote(cloudData.closingNote);
            if (cloudData.manualDiscountEntries !== undefined) {
              setManualDiscountEntries(Array.isArray(cloudData.manualDiscountEntries) ? cloudData.manualDiscountEntries : []);
            }
            if (cloudData.isEditMessageMode !== undefined) setIsEditMessageMode(cloudData.isEditMessageMode);
            if (cloudData.customFullMessage !== undefined) setCustomFullMessage(cloudData.customFullMessage);
            if (cloudData.printNotesText !== undefined) setPrintNotesText(cloudData.printNotesText);
            if (cloudData.isPrintNotesCustomized !== undefined) setIsPrintNotesCustomized(cloudData.isPrintNotesCustomized);
          } else {
            // Fresh day in cloud: ensure mummyActors is fresh empty array if not in local storage
            const localSaved = getInitialClosingData(closingDate);
            if (!localSaved) {
              setMummyActors([]);
              setManualDiscountEntries([]);
            }
          }
        }
      } catch (err) {
        console.warn("Direct fetchClosingReportFromFirebase notice:", err);
      }
    };
    fetchLatest();
    return () => { isCancelled = true; };
  }, [closingDate]);

  // Real-time synchronization & persistence (LocalStorage + Firebase RTDB)
  useEffect(() => {
    // DO NOT save if we are currently transitioning dates or if state has not aligned with closingDate!
    if (isSwitchingDateRef.current || loadedDateRef.current !== closingDate) {
      return;
    }

    const payload = {
      closingStaff,
      customClosingStaff,
      mummyActors,
      excessAmount,
      shortAmount,
      closingNote,
      manualDiscountEntries,
      isEditMessageMode,
      customFullMessage,
      printNotesText: isPrintNotesCustomized ? printNotesText : "",
      isPrintNotesCustomized,
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(`escapetime_madhapur_closing_${closingDate}`, JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed saving closing to localStorage:", e);
    }

    saveClosingReportToFirebase(closingDate, payload);
  }, [
    closingDate,
    closingStaff,
    customClosingStaff,
    mummyActors,
    excessAmount,
    shortAmount,
    closingNote,
    manualDiscountEntries,
    isEditMessageMode,
    customFullMessage,
    printNotesText,
    isPrintNotesCustomized
  ]);

  // Real-time remote listener from Firebase RTDB (cross-tab / multi-device sync for laptop, phone, tablet)
  useEffect(() => {
    if (!rtdb || !isFirebaseConfigured() || !closingDate) return;
    try {
      const reportRef = ref(rtdb, `${CLOSING_REPORTS_PATH}/${closingDate}`);
      const unsubscribe = onValue(reportRef, (snapshot) => {
        if (isSwitchingDateRef.current || loadedDateRef.current !== closingDate) return;
        const data = snapshot.val();
        if (data) {
          if (data.closingStaff !== undefined) setClosingStaff(data.closingStaff);
          if (data.customClosingStaff !== undefined) setCustomClosingStaff(data.customClosingStaff);
          if (data.mummyActors !== undefined) setMummyActors(Array.isArray(data.mummyActors) ? data.mummyActors : []);
          if (data.excessAmount !== undefined) setExcessAmount(data.excessAmount);
          if (data.shortAmount !== undefined) setShortAmount(data.shortAmount);
          if (data.closingNote !== undefined) setClosingNote(data.closingNote);
          if (data.printNotesText !== undefined) setPrintNotesText(data.printNotesText);
          if (data.isPrintNotesCustomized !== undefined) setIsPrintNotesCustomized(data.isPrintNotesCustomized);
          if (data.manualDiscountEntries !== undefined) setManualDiscountEntries(Array.isArray(data.manualDiscountEntries) ? data.manualDiscountEntries : []);
          if (data.isEditMessageMode !== undefined) setIsEditMessageMode(data.isEditMessageMode);
          if (data.customFullMessage !== undefined) setCustomFullMessage(data.customFullMessage);
        }
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn("RTDB closing listener error:", err);
    }
  }, [closingDate]);

  // Filter bookings for selected closing date
  const dayBookings = useMemo(() => {
    return bookings.filter(b => b.date === closingDate);
  }, [bookings, closingDate]);

  // Aggregate stats per game for the day
  // Game 1: Bank (Bank Heist)
  // Game 2: Mummy (Curse of the Mummy)
  // Game 3: Prison (Prison Break)
  // Game 4: Biryani (The Lost Recipe)
  // Pure complimentary sessions (finalTotal === 0 / 100% off) are excluded from paid session counts and counted separately!
  const gameStats = useMemo(() => {
    const stats = {
      bank: { name: "Bank", games: 0, players: 0, sale: 0, complimentaryGames: 0, complimentaryPlayers: 0 },
      mummy: { name: "Mummy", games: 0, players: 0, sale: 0, complimentaryGames: 0, complimentaryPlayers: 0 },
      prison: { name: "Prison", games: 0, players: 0, sale: 0, complimentaryGames: 0, complimentaryPlayers: 0 },
      biryani: { name: "Biryani", games: 0, players: 0, sale: 0, complimentaryGames: 0, complimentaryPlayers: 0 }
    };

    dayBookings.forEach(b => {
      const gName = (b.gameName || '').toLowerCase();
      let key = null;

      if (gName.includes('bank')) key = 'bank';
      else if (gName.includes('mummy')) key = 'mummy';
      else if (gName.includes('prison')) key = 'prison';
      else if (gName.includes('recipe') || gName.includes('biryani')) key = 'biryani';

      if (key && stats[key]) {
        const isComp = isComplimentaryBooking(b) || b.offerId === 'complimentary' || Number(b.finalTotal) === 0;
        if (isComp) {
          stats[key].complimentaryGames += 1;
          stats[key].complimentaryPlayers += Number(b.players) || 0;
        } else {
          stats[key].games += 1;
          stats[key].players += Number(b.players) || 0;
          stats[key].sale += getPaidTotal(b.payments);
        }
      }
    });

    return stats;
  }, [dayBookings]);

  // Overall Sale
  const overallSale = useMemo(() => {
    return (
      gameStats.bank.sale +
      gameStats.mummy.sale +
      gameStats.prison.sale +
      gameStats.biryani.sale
    );
  }, [gameStats]);

  // Format Date to DD-MM-YYYY
  const formattedDisplayDate = useMemo(() => {
    if (!closingDate) return '';
    const parts = closingDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return closingDate;
  }, [closingDate]);

  // On date change, also fetch latest from Firebase directly (so refresh on laptop/phone always loads latest)
  useEffect(() => {
    let isCancelled = false;
    const fetchLatest = async () => {
      try {
        const cloudData = await fetchClosingReportFromFirebase(closingDate);
        if (!isCancelled && cloudData) {
          if (cloudData.closingStaff !== undefined) setClosingStaff(cloudData.closingStaff);
          if (cloudData.customClosingStaff !== undefined) setCustomClosingStaff(cloudData.customClosingStaff);
          if (cloudData.mummyActors !== undefined) setMummyActors(cloudData.mummyActors);
          if (cloudData.excessAmount !== undefined) setExcessAmount(cloudData.excessAmount);
          if (cloudData.shortAmount !== undefined) setShortAmount(cloudData.shortAmount);
          if (cloudData.closingNote !== undefined) setClosingNote(cloudData.closingNote);
          if (cloudData.manualDiscountEntries !== undefined) setManualDiscountEntries(cloudData.manualDiscountEntries);
          if (cloudData.isEditMessageMode !== undefined) setIsEditMessageMode(cloudData.isEditMessageMode);
          if (cloudData.customFullMessage !== undefined) setCustomFullMessage(cloudData.customFullMessage);
          if (cloudData.printNotesText !== undefined) setPrintNotesText(cloudData.printNotesText);
          if (cloudData.isPrintNotesCustomized !== undefined) setIsPrintNotesCustomized(cloudData.isPrintNotesCustomized);
        }
      } catch (err) {
        console.warn("Direct fetchClosingReportFromFirebase notice:", err);
      }
    };
    fetchLatest();
    return () => { isCancelled = true; };
  }, [closingDate]);

  // Two-digit pad helper
  const pad2 = (num) => {
    const n = Number(num) || 0;
    return n.toString().padStart(2, '0');
  };

  // Indian Rupee formatting with commas (e.g. 20,379)
  const formatIndianNumber = (num) => {
    const n = Number(num) || 0;
    return new Intl.NumberFormat('en-IN').format(n);
  };

  // Final Closing Staff Name
  const finalStaffName = closingStaff === 'custom' ? (customClosingStaff.trim() || 'Staff') : closingStaff;

  // Add Mummy Actor
  const handleAddMummyActor = () => {
    if (!newActorName.trim()) return;
    setMummyActors(prev => [...prev, { name: newActorName.trim(), count: Number(newActorCount) || 1 }]);
    setNewActorName("");
    setNewActorCount(1);
  };

  // Remove Mummy Actor
  const handleRemoveMummyActor = (index) => {
    setMummyActors(prev => prev.filter((_, i) => i !== index));
  };

  // Update Mummy Actor count
  const handleActorCountChange = (index, delta) => {
    setMummyActors(prev => {
      const next = [...prev];
      const count = Math.max(1, next[index].count + delta);
      next[index] = { ...next[index], count };
      return next;
    });
  };

  // Date Shift Helpers (Strictly 1 day shift with no timezone offset jumping)
  const handleShiftDate = (days) => {
    const nextDate = shiftDateString(closingDate, days);
    setClosingDate(nextDate);
    if (setSelectedDate) setSelectedDate(nextDate);
  };

  const handleSetToday = () => {
    const today = getTodayDateString();
    setClosingDate(today);
    if (setSelectedDate) setSelectedDate(today);
  };

  // Handle adding manual discount entry directly from closing screen
  const handleAddManualDiscount = () => {
    if (!newDiscCustomerName.trim() && !newDiscNote.trim()) {
      alert("Please enter customer name or custom note/reason.");
      return;
    }
    const off = OFFERS.find(o => o.id === newDiscOfferId);
    const entry = {
      id: `MDE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      gameName: newDiscRoom,
      offerId: newDiscOfferId,
      offerName: off ? off.name : 'Discount Offer',
      players: Number(newDiscPax) || 1,
      discountPercent: Number(newDiscPercent) || (off ? off.discountPercent : 0),
      reference: (newDiscRef || 'Khaja Sir').replace(/nayeem\s*sir|900/gi, '').trim() || 'Khaja Sir',
      customerName: newDiscCustomerName.trim(),
      customerPhone: newDiscPhone.trim(),
      customDiscountReason: newDiscNote.trim(),
      customNote: newDiscNote.trim(),
      notes: newDiscNote.trim(),
      isManualDiscountEntry: true
    };

    setManualDiscountEntries(prev => [...prev, entry]);
    setNewDiscCustomerName("");
    setNewDiscPhone("");
    setNewDiscNote("");
  };

  const handleRemoveManualDiscount = (id) => {
    setManualDiscountEntries(prev => prev.filter(e => e.id !== id));
  };

  // Group discount/note bookings by room for WhatsApp note section & print preview
  const groupedRoomNotes = useMemo(() => {
    const discountOrNoteBookings = dayBookings.filter(b => {
      const hasOffer = b.offerId && b.offerId !== 'none';
      const hasDiscount = (Number(b.discountPercent) > 0) || (Number(b.discountAmount) > 0);
      const hasReason = !!(b.customDiscountReason && b.customDiscountReason.trim());
      const hasCustomNote = !!(b.customNote && b.customNote.trim());
      const hasNotes = !!(b.notes && b.notes.trim());
      return hasOffer || hasDiscount || hasReason || hasCustomNote || hasNotes;
    });

    const combinedList = [...discountOrNoteBookings, ...manualDiscountEntries];

    const roomMap = new Map();
    // Pre-populate with standard GAMES from venueData
    GAMES.forEach(g => {
      roomMap.set(g.name, []);
    });

    combinedList.forEach(b => {
      const room = b.gameName || 'Other Rooms';
      if (!roomMap.has(room)) {
        roomMap.set(room, []);
      }
      roomMap.get(room).push(b);
    });

    return roomMap;
  }, [dayBookings, manualDiscountEntries]);

  // Auto-generated print text from grouped room notes
  const autoGeneratedPrintNotes = useMemo(() => {
    const sections = [];
    groupedRoomNotes.forEach((roomBookings, roomName) => {
      if (roomBookings.length === 0) return;
      const lines = [];
      lines.push(`*${roomName.toUpperCase()}*`);
      roomBookings.forEach((b, index) => {
        lines.push(`${index + 1}. ${generateBookingNoteSentence(b)}`);
        const rawNote = (b.customDiscountReason || b.customNote || b.notes || '').trim();
        const formattedGrammarNote = formatCustomNoteGrammar(rawNote);
        if (formattedGrammarNote) {
          lines.push(formattedGrammarNote);
        }
        lines.push(`Customer Name: ${b.customerName || 'N/A'}`);
        lines.push(`Mobile Number: ${b.customerPhone || 'N/A'}`);
        lines.push(``);
      });
      sections.push(lines.join('\n').trim());
    });

    const cleanManual = closingNote.trim();
    if (cleanManual && !/^(?:none|no discount|n\/?a|nil)$/i.test(cleanManual)) {
      sections.push(`*ADDITIONAL NOTES:*\n${cleanManual}`);
    }

    if (sections.length === 0) {
      return "No special discounts, offers, or notes recorded for this date.";
    }

    return sections.join('\n\n');
  }, [groupedRoomNotes, closingNote]);

  // Construct Exact WhatsApp Closing Message Text
  const generatedMessage = useMemo(() => {
    const lines = [];

    lines.push(`*ASSALAMUALAIKUM*`);
    lines.push(``);
    lines.push(`*Escape Time Madhapur*`);
    lines.push(``);
    lines.push(`*${formattedDisplayDate}*`);
    lines.push(``);

    // 1. Bank
    lines.push(`*Bank*`);
    lines.push(``);
    lines.push(`No.of games:*${pad2(gameStats.bank.games)}*`);
    lines.push(`Total players:*${pad2(gameStats.bank.players)}*`);
    if (gameStats.bank.complimentaryGames > 0) {
      lines.push(`Complementary game: *${pad2(gameStats.bank.complimentaryGames)}*`);
    }
    lines.push(`*Sale : ${gameStats.bank.sale > 0 ? gameStats.bank.sale : '00'}*`);
    lines.push(``);

    // 2. Mummy
    lines.push(`*Mummy*`);
    lines.push(``);
    lines.push(`No. of games: *${pad2(gameStats.mummy.games)}*`);
    lines.push(`Total players:*${pad2(gameStats.mummy.players)}*`);
    if (gameStats.mummy.complimentaryGames > 0) {
      lines.push(`Complementary game: *${pad2(gameStats.mummy.complimentaryGames)}*`);
    }
    lines.push(`*Sale :${gameStats.mummy.sale > 0 ? gameStats.mummy.sale : '00'}*`);
    lines.push(`Who went in as Mummy:`);
    if (mummyActors.length > 0) {
      const actorString = mummyActors.map(a => `${a.name}×${a.count}`).join(', ');
      lines.push(actorString);
    } else {
      lines.push(`None`);
    }
    lines.push(``);

    // 3. Prison
    lines.push(`*Prison*`);
    lines.push(``);
    lines.push(`No.of games: *${pad2(gameStats.prison.games)}*`);
    lines.push(`Total players: *${pad2(gameStats.prison.players)}*`);
    if (gameStats.prison.complimentaryGames > 0) {
      lines.push(`Complementary game: *${pad2(gameStats.prison.complimentaryGames)}*`);
    }
    lines.push(`*Sale : ${gameStats.prison.sale > 0 ? gameStats.prison.sale : '00'}*`);
    lines.push(``);

    // 4. Biryani (The Lost Recipe)
    lines.push(`*Biryani*`);
    lines.push(``);
    lines.push(`No.of games :*${pad2(gameStats.biryani.games)}*`);
    lines.push(`Total players :*${pad2(gameStats.biryani.players)}*`);
    if (gameStats.biryani.complimentaryGames > 0) {
      lines.push(`Complementary game: *${pad2(gameStats.biryani.complimentaryGames)}*`);
    }
    lines.push(`*Sale : ${gameStats.biryani.sale > 0 ? gameStats.biryani.sale : '00'}*`);
    lines.push(``);

    // Totals
    const formattedOverall = overallSale > 0 ? `${formatIndianNumber(overallSale)}/-` : `00/-`;
    lines.push(`*Overall sale:${formattedOverall}*`);
    lines.push(``);
    lines.push(`*Excess: ${excessAmount.trim() || '00'}*`);
    lines.push(`*Short:${shortAmount.trim() || '00'}*`);
    lines.push(``);

    // Note
    lines.push(`*NOTE:-*`);

    const roomBlocks = [];
    groupedRoomNotes.forEach((roomBookings, roomName) => {
      if (roomBookings.length === 0) return;
      const sectionLines = [];
      sectionLines.push(`*${roomName.toUpperCase()}*`);
      roomBookings.forEach((b, index) => {
        const itemLines = [];
        const mainSentence = generateBookingNoteSentence(b);
        itemLines.push(`${index + 1}. ${mainSentence}`);

        const rawNote = (b.customDiscountReason || b.customNote || b.notes || '').trim();
        const formattedGrammarNote = formatCustomNoteGrammar(rawNote);
        if (formattedGrammarNote) {
          itemLines.push(formattedGrammarNote);
        }

        itemLines.push(`Customer Name: ${b.customerName || 'N/A'}`);
        itemLines.push(`Mobile Number: ${b.customerPhone || 'N/A'}`);

        sectionLines.push(itemLines.join('\n'));
      });
      roomBlocks.push(sectionLines.join('\n\n'));
    });

    // Manual Staff Closing Notes (if any, never print "None")
    const cleanManualNote = closingNote.trim();
    if (cleanManualNote && !/^(?:none|no discount|n\/?a|nil)$/i.test(cleanManualNote)) {
      roomBlocks.push(cleanManualNote);
    }

    if (roomBlocks.length > 0) {
      lines.push(roomBlocks.join('\n\n'));
    }
    lines.push(``);

    // Closing Staff Name
    lines.push(`*${finalStaffName}*`);

    return lines.join('\n');
  }, [
    formattedDisplayDate,
    gameStats,
    mummyActors,
    overallSale,
    excessAmount,
    shortAmount,
    closingNote,
    finalStaffName,
    groupedRoomNotes
  ]);

  const activeMessage = (isEditMessageMode && customFullMessage) ? customFullMessage : generatedMessage;

  // Copy to Clipboard
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(activeMessage).then(() => {
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2500);
    });
  };

  // WhatsApp Share Link
  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(activeMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Top Banner */}
      <div className="bg-white p-5 rounded-3xl border-2 border-blue-300 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
              <MessageSquare className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-black text-slate-950 tracking-tight">
              Daily WhatsApp Closing Message Generator
            </h2>
          </div>
          <p className="text-xs font-bold text-blue-900 mt-1">
            Escape Time - Madhapur Branch • Auto-populates games, players & sales for selected date
          </p>
        </div>

        {/* Date Selector in Pure White Box */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-white p-1 rounded-xl border-2 border-blue-300 shadow-xs">
            <button
              onClick={() => handleShiftDate(-1)}
              className="p-2 hover:bg-blue-50 rounded-lg text-blue-800 transition active:scale-95"
              title="Previous Day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 px-3 py-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <input
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                className="bg-white font-black text-slate-950 font-mono text-sm outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => handleShiftDate(1)}
              className="p-2 hover:bg-blue-50 rounded-lg text-blue-800 transition active:scale-95"
              title="Next Day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleSetToday}
            className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: Controls & Game Stats (7 cols) */}
        <div className="lg:col-span-7 space-y-5">

          {/* 4 Games Live Overview Cards */}
          <div className="bg-white p-5 rounded-3xl border-2 border-blue-300 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b-2 border-blue-100 pb-2">
              <h3 className="text-xs font-black uppercase text-blue-900 tracking-wider">
                1. Auto-Calculated Game Breakdown ({formattedDisplayDate})
              </h3>
              <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {dayBookings.length} Bookings Detected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bank */}
              <div className="p-3.5 rounded-2xl border-2 border-blue-200 bg-blue-50/30">
                <span className="text-sm font-black text-blue-950 block">Bank (Bank Heist)</span>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">No. of Games</span>
                    <span className="font-mono font-black text-slate-950 text-sm">*{pad2(gameStats.bank.games)}*</span>
                    {gameStats.bank.complimentaryGames > 0 && (
                      <span className="block text-[10px] font-black text-emerald-700">+{pad2(gameStats.bank.complimentaryGames)} Comp</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Total Players</span>
                    <span className="font-mono font-black text-slate-950 text-sm">*{pad2(gameStats.bank.players)}*</span>
                    {gameStats.bank.complimentaryPlayers > 0 && (
                      <span className="block text-[10px] font-bold text-emerald-700">+{pad2(gameStats.bank.complimentaryPlayers)} kid</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Sale (₹)</span>
                    <span className="font-mono font-black text-blue-900 text-sm">*{gameStats.bank.sale > 0 ? gameStats.bank.sale : '00'}*</span>
                  </div>
                </div>
              </div>

              {/* Mummy */}
              <div className="p-3.5 rounded-2xl border-2 border-blue-200 bg-blue-50/30">
                <span className="text-sm font-black text-blue-950 block">Mummy (Curse of Mummy)</span>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">No. of Games</span>
                    <span className="font-mono font-black text-slate-950 text-sm">*{pad2(gameStats.mummy.games)}*</span>
                    {gameStats.mummy.complimentaryGames > 0 && (
                      <span className="block text-[10px] font-black text-emerald-700">+{pad2(gameStats.mummy.complimentaryGames)} Comp</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Total Players</span>
                    <span className="font-mono font-black text-slate-950 text-sm">*{pad2(gameStats.mummy.players)}*</span>
                    {gameStats.mummy.complimentaryPlayers > 0 && (
                      <span className="block text-[10px] font-bold text-emerald-700">+{pad2(gameStats.mummy.complimentaryPlayers)} kid</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Sale (₹)</span>
                    <span className="font-mono font-black text-blue-900 text-sm">*{gameStats.mummy.sale > 0 ? gameStats.mummy.sale : '00'}*</span>
                  </div>
                </div>
              </div>

              {/* Prison */}
              <div className="p-3.5 rounded-2xl border-2 border-blue-200 bg-blue-50/30">
                <span className="text-sm font-black text-blue-950 block">Prison (Prison Break)</span>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">No. of Games</span>
                    <span className="font-mono font-black text-slate-950 text-sm">*{pad2(gameStats.prison.games)}*</span>
                    {gameStats.prison.complimentaryGames > 0 && (
                      <span className="block text-[10px] font-black text-emerald-700">+{pad2(gameStats.prison.complimentaryGames)} Comp</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Total Players</span>
                    <span className="font-mono font-black text-slate-950 text-sm">*{pad2(gameStats.prison.players)}*</span>
                    {gameStats.prison.complimentaryPlayers > 0 && (
                      <span className="block text-[10px] font-bold text-emerald-700">+{pad2(gameStats.prison.complimentaryPlayers)} kid</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Sale (₹)</span>
                    <span className="font-mono font-black text-blue-900 text-sm">*{gameStats.prison.sale > 0 ? gameStats.prison.sale : '00'}*</span>
                  </div>
                </div>
              </div>

              {/* Biryani */}
              <div className="p-3.5 rounded-2xl border-2 border-blue-200 bg-blue-50/30">
                <span className="text-sm font-black text-blue-950 block">Biryani (The Lost Recipe)</span>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">No. of Games</span>
                    <span className="font-mono font-black text-slate-950 text-sm">*{pad2(gameStats.biryani.games)}*</span>
                    {gameStats.biryani.complimentaryGames > 0 && (
                      <span className="block text-[10px] font-black text-emerald-700">+{pad2(gameStats.biryani.complimentaryGames)} Comp</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Total Players</span>
                    <span className="font-mono font-black text-slate-950 text-sm">*{pad2(gameStats.biryani.players)}*</span>
                    {gameStats.biryani.complimentaryPlayers > 0 && (
                      <span className="block text-[10px] font-bold text-emerald-700">+{pad2(gameStats.biryani.complimentaryPlayers)} kid</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Sale (₹)</span>
                    <span className="font-mono font-black text-blue-900 text-sm">*{gameStats.biryani.sale > 0 ? gameStats.biryani.sale : '00'}*</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Day Revenue Highlight */}
            <div className="p-4 rounded-2xl bg-blue-600 text-white flex items-center justify-between shadow-md">
              <div>
                <span className="text-xs font-black uppercase text-blue-200 block">Overall Net Sale</span>
                <span className="text-2xl font-black font-mono">
                  *{overallSale > 0 ? `${formatIndianNumber(overallSale)}/-` : '00/-'}*
                </span>
              </div>
              <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-xl">
                Auto Sum of 4 Games
              </span>
            </div>
          </div>

          {/* Special Mummy Character Staff Assignment */}
          <div className="bg-white p-5 rounded-3xl border-2 border-blue-300 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b-2 border-blue-100 pb-2">
              <h3 className="text-xs font-black uppercase text-blue-900 tracking-wider">
                2. Who Went in as Mummy?
              </h3>
              <span className="text-[11px] font-bold text-slate-500">
                Shows under Mummy game in message
              </span>
            </div>

            {/* Active Mummy Actors List */}
            <div className="space-y-2">
              {mummyActors.length === 0 ? (
                <div className="p-3 bg-blue-50/60 border-2 border-dashed border-blue-200 rounded-xl text-xs font-bold text-slate-500 text-center">
                  No mummy staff added for this date (message will show &quot;None&quot;). Select or type staff below to add.
                </div>
              ) : (
                mummyActors.map((actor, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-blue-50 border-2 border-blue-200 p-2.5 rounded-xl text-xs font-black">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-950 text-sm">{actor.name}</span>
                      <span className="text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-300">
                        ×{actor.count} times
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleActorCountChange(idx, -1)}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-blue-100 border border-blue-300 text-blue-900 flex items-center justify-center font-black active:scale-95"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActorCountChange(idx, 1)}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-blue-100 border border-blue-300 text-blue-900 flex items-center justify-center font-black active:scale-95"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMummyActor(idx)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg ml-1"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add New Mummy Staff */}
            <div className="p-3 bg-white border-2 border-blue-200 rounded-2xl flex flex-wrap items-center gap-2">
              {/* Preset Staff Quick Click */}
              <div className="w-full flex flex-wrap items-center gap-1.5 mb-1">
                <span className="text-[11px] font-bold text-slate-500">Quick Select:</span>
                {STAFF_ROSTER.map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setNewActorName(st)}
                    className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-blue-900"
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-w-[140px]">
                <input
                  type="text"
                  placeholder="Staff Name (e.g. Prudhvi)"
                  value={newActorName}
                  onChange={(e) => setNewActorName(e.target.value)}
                  className="w-full bg-white border-2 border-blue-300 rounded-xl px-3 py-1.5 text-xs font-black text-slate-950 outline-none"
                />
              </div>

              <div className="flex items-center space-x-1">
                <span className="text-xs font-bold text-slate-600">Times:</span>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={newActorCount}
                  onChange={(e) => setNewActorCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-14 bg-white border-2 border-blue-300 rounded-xl px-2 py-1.5 text-center font-mono font-black text-xs text-slate-950 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAddMummyActor}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95"
              >
                + Add Actor
              </button>
            </div>
          </div>

          {/* 3. Add Discount Entry (Live Cloud Sync across devices) */}
          <div className="bg-white p-5 rounded-3xl border-2 border-blue-300 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b-2 border-blue-100 pb-2">
              <div>
                <h3 className="text-xs font-black uppercase text-blue-900 tracking-wider flex items-center space-x-1.5">
                  <Tag className="w-4 h-4 text-blue-600" />
                  <span>3. Add Discount Entry (Auto-Populates in Report)</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-500">
                  Instantly adds to WhatsApp message & persists in cloud database
                </span>
              </div>
              <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                {manualDiscountEntries.length} Added
              </span>
            </div>

            {/* Input Form */}
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Game / Room */}
                <div>
                  <label className="block text-[11px] font-black text-blue-950 mb-1">
                    Select Escape Room:
                  </label>
                  <select
                    value={newDiscRoom}
                    onChange={(e) => setNewDiscRoom(e.target.value)}
                    className="w-full bg-white border-2 border-blue-300 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-950 outline-none cursor-pointer"
                  >
                    {GAMES.map(g => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {/* Offer */}
                <div>
                  <label className="block text-[11px] font-black text-blue-950 mb-1">
                    Discount / Deal Offer:
                  </label>
                  <select
                    value={newDiscOfferId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setNewDiscOfferId(id);
                      const off = OFFERS.find(o => o.id === id);
                      if (off) {
                        setNewDiscPercent(off.discountPercent);
                      }
                    }}
                    className="w-full bg-white border-2 border-blue-300 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-950 outline-none cursor-pointer"
                  >
                    {OFFERS.filter(o => o.id !== 'none').map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Pax */}
                <div>
                  <label className="block text-[10px] font-black text-blue-950 mb-1">Players (Pax):</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={newDiscPax}
                    onChange={(e) => setNewDiscPax(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-white border-2 border-blue-300 rounded-xl px-2.5 py-1.5 text-center font-mono font-black text-xs text-slate-950 outline-none"
                  />
                </div>

                {/* Discount % with Quick Buttons: 10, 15, 20, 30 */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-blue-950 mb-1">Select Discount %:</label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[10, 15, 20, 30].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setNewDiscPercent(pct)}
                        className={`px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer ${
                          Number(newDiscPercent) === pct
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white border-2 border-blue-200 text-blue-900 hover:bg-blue-100'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                    <div className="flex items-center space-x-1 bg-white border-2 border-blue-300 rounded-lg px-2 py-0.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newDiscPercent}
                        onChange={(e) => setNewDiscPercent(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                        className="w-10 text-center font-mono font-black text-xs text-slate-950 outline-none"
                      />
                      <span className="text-[10px] font-bold text-slate-600">%</span>
                    </div>
                  </div>
                </div>

                {/* Reference */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-blue-950 mb-1">Approval Reference:</label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={newDiscRef === 'Khaja Sir' ? 'Khaja Sir' : 'custom'}
                      onChange={(e) => {
                        if (e.target.value === 'Khaja Sir') {
                          setNewDiscRef('Khaja Sir');
                        } else {
                          setNewDiscRef('');
                        }
                      }}
                      className="bg-white border-2 border-blue-300 rounded-xl px-2 py-1 text-xs font-black text-slate-950 outline-none cursor-pointer"
                    >
                      <option value="Khaja Sir">Khaja Sir</option>
                      <option value="custom">+ Specific Name</option>
                    </select>
                    {newDiscRef !== 'Khaja Sir' && (
                      <input
                        type="text"
                        value={newDiscRef}
                        onChange={(e) => setNewDiscRef(e.target.value)}
                        placeholder="Type name..."
                        className="flex-1 bg-white border-2 border-blue-300 rounded-xl px-2 py-1 text-xs font-black text-slate-950 outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Customer Name */}
                <div>
                  <label className="block text-[10px] font-black text-blue-950 mb-1">Customer Name:</label>
                  <input
                    type="text"
                    placeholder="Enter customer name"
                    value={newDiscCustomerName}
                    onChange={(e) => setNewDiscCustomerName(e.target.value)}
                    className="w-full bg-white border-2 border-blue-300 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-950 outline-none"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[10px] font-black text-blue-950 mb-1">Mobile Number:</label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={newDiscPhone}
                    onChange={(e) => setNewDiscPhone(e.target.value)}
                    className="w-full bg-white border-2 border-blue-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-black text-slate-950 outline-none"
                  />
                </div>
              </div>

              {/* Note / Reason */}
              <div>
                <label className="block text-[10px] font-black text-blue-950 mb-1">
                  Custom Reason / Note (Grammatically formatted automatically):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Software crashed 5 mins, Birthday ID verified, Cross promo voucher presented..."
                  value={newDiscNote}
                  onChange={(e) => setNewDiscNote(e.target.value)}
                  className="w-full bg-white border-2 border-blue-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-950 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAddManualDiscount}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Add Discount Entry to Closing Message</span>
              </button>
            </div>

            {/* List of Manual Discount Entries Added */}
            {manualDiscountEntries.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-black text-blue-950 block">Manually Added Discounts for {formattedDisplayDate}:</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {manualDiscountEntries.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-blue-900">{item.gameName}</span>
                          <span className="text-[10px] font-bold bg-white text-blue-800 px-1.5 py-0.2 rounded border border-blue-200">
                            {item.discountPercent}% OFF
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {item.players} Players
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-700 font-semibold">
                          {item.customerName || 'N/A'} ({item.customerPhone || 'N/A'}) • Ref: {item.reference}
                        </div>
                        {item.customNote && (
                          <div className="text-[10px] text-amber-900 italic font-medium">
                            "{item.customNote}"
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveManualDiscount(item.id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg ml-2"
                        title="Remove Discount Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Excess, Short, Notes & Closing Staff Name */}
          <div className="bg-white p-5 rounded-3xl border-2 border-blue-300 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-blue-900 tracking-wider border-b-2 border-blue-100 pb-2">
              4. Closing Details & Staff Sign-off
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Excess */}
              <div>
                <label className="block text-xs font-black text-blue-950 mb-1">
                  Excess Amount (₹)
                </label>
                <div className="bg-white border-2 border-blue-200 focus-within:border-blue-600 rounded-xl px-3 py-2">
                  <input
                    type="text"
                    value={excessAmount}
                    onChange={(e) => setExcessAmount(e.target.value)}
                    placeholder="00"
                    className="w-full bg-white font-mono font-black text-sm text-slate-950 outline-none"
                  />
                </div>
              </div>

              {/* Short */}
              <div>
                <label className="block text-xs font-black text-blue-950 mb-1">
                  Short Amount (₹)
                </label>
                <div className="bg-white border-2 border-blue-200 focus-within:border-blue-600 rounded-xl px-3 py-2">
                  <input
                    type="text"
                    value={shortAmount}
                    onChange={(e) => setShortAmount(e.target.value)}
                    placeholder="00"
                    className="w-full bg-white font-mono font-black text-sm text-slate-950 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Note Column */}
            <div>
              <label className="block text-xs font-black text-blue-950 mb-1">
                NOTE:- (Optional notes / remarks)
              </label>
              <textarea
                rows={2}
                placeholder="Write any closing notes, discount mentions, or bank deposits..."
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                className="w-full bg-white border-2 border-blue-200 focus:border-blue-600 rounded-xl p-3 text-xs sm:text-sm font-bold text-slate-950 outline-none"
              />
            </div>

            {/* Closing Staff Name (at bottom) */}
            <div>
              <label className="block text-xs font-black text-blue-950 mb-1">
                Closing Staff Name (Appears at Bottom):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={closingStaff}
                  onChange={(e) => setClosingStaff(e.target.value)}
                  className="bg-white border-2 border-blue-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-black text-slate-950 outline-none cursor-pointer"
                >
                  {STAFF_ROSTER.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                  <option value="custom">+ Other Custom Staff Name</option>
                </select>

                {closingStaff === 'custom' && (
                  <input
                    type="text"
                    placeholder="Enter Staff Name..."
                    value={customClosingStaff}
                    onChange={(e) => setCustomClosingStaff(e.target.value)}
                    className="bg-white border-2 border-blue-400 rounded-xl px-3 py-2 text-xs sm:text-sm font-black text-slate-950 outline-none"
                  />
                )}
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Live WhatsApp Message Preview & 1-Click Copy (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-3xl border-2 border-blue-400 shadow-xl sticky top-24 space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-blue-100 pb-3">
              <div>
                <span className="text-xs font-black uppercase text-blue-900 tracking-wider block">
                  WhatsApp Closing Message
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {isEditMessageMode ? '✏️ Custom Edit Mode Active' : 'Ready to copy & paste'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Toggle between Direct Message Edit & Preview */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isEditMessageMode) {
                      if (!customFullMessage) setCustomFullMessage(generatedMessage);
                      setIsEditMessageMode(true);
                    } else {
                      setIsEditMessageMode(false);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-xs transition active:scale-95 cursor-pointer ${
                    isEditMessageMode
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                  title={isEditMessageMode ? "Switch to Preview View" : "Edit any sentence or line of closing message"}
                >
                  {isEditMessageMode ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Mode</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>✏️ Edit Message Lines</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!isPrintNotesCustomized || !printNotesText) {
                      setPrintNotesText(autoGeneratedPrintNotes);
                    }
                    setIsPrintModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                  title="Print Escape Notes"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Escape Notes</span>
                </button>
              </div>
            </div>

            {/* Editable Mode vs Live Preview Code Block */}
            {isEditMessageMode ? (
              <div className="space-y-2 animate-fadeIn">
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-300 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-amber-950">
                  <div className="flex items-center space-x-1.5">
                    <Edit3 className="w-4 h-4 text-amber-700 shrink-0" />
                    <span className="text-[11px]">
                      Live Cloud Editing: Edits are synced to Firebase RTDB for all tablets, laptops & phones.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomFullMessage("");
                      setIsEditMessageMode(false);
                    }}
                    className="px-2 py-0.5 bg-white hover:bg-amber-100 rounded border border-amber-300 text-[10px] font-black text-amber-900 transition flex items-center space-x-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Revert to Auto</span>
                  </button>
                </div>

                <textarea
                  rows={20}
                  value={customFullMessage || generatedMessage}
                  onChange={(e) => {
                    setCustomFullMessage(e.target.value);
                    setIsEditMessageMode(true);
                  }}
                  className="w-full bg-[#fcfefe] border-2 border-indigo-400 focus:border-indigo-600 rounded-2xl p-4 font-mono text-xs leading-relaxed text-slate-900 outline-none shadow-inner"
                  placeholder="Type or edit any sentence or line here..."
                />
              </div>
            ) : (
              <div className="bg-[#fcfefe] border-2 border-blue-200 rounded-2xl p-4 font-mono text-xs leading-relaxed text-slate-900 select-all whitespace-pre-wrap max-h-[500px] overflow-y-auto shadow-inner">
                {activeMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleCopyMessage}
                className={`w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center space-x-2 transition active:scale-95 shadow-md ${
                  copiedStatus
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25'
                }`}
              >
                {copiedStatus ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>✓ Copied WhatsApp Closing Message!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Closing Message (WhatsApp Format)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="w-full py-2.5 px-4 rounded-2xl font-black text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center space-x-2 transition active:scale-95 shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Directly to WhatsApp</span>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Escape Room Notes Print Preview Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white w-full max-w-3xl rounded-3xl border-2 border-blue-400 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-white text-blue-900 flex items-center justify-center font-black">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Escape Room Notes Print Preview
                  </h3>
                  <p className="text-xs text-blue-200 font-bold">
                    {formattedDisplayDate} • Grouped by Escape Room
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-blue-950 uppercase tracking-wider">
                  Editable Notes for Printing:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setPrintNotesText(autoGeneratedPrintNotes);
                    setIsPrintNotesCustomized(false);
                  }}
                  className="px-2.5 py-1 text-xs font-black text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition flex items-center space-x-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revert to Auto</span>
                </button>
              </div>

              <textarea
                rows={14}
                value={printNotesText || autoGeneratedPrintNotes}
                onChange={(e) => {
                  setPrintNotesText(e.target.value);
                  setIsPrintNotesCustomized(true);
                }}
                className="w-full bg-[#fcfefe] border-2 border-blue-300 focus:border-blue-600 rounded-2xl p-4 font-mono text-xs sm:text-sm leading-relaxed text-slate-900 outline-none shadow-inner"
              />
              <p className="text-[11px] text-slate-500 font-bold">
                You can edit the text above before printing. Click "Revert to Auto" to restore original generated notes.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t-2 border-blue-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 text-xs sm:text-sm font-black text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const textToPrint = printNotesText || autoGeneratedPrintNotes;
                  executePrintWindow(`Escape Room Notes - ${formattedDisplayDate}`, textToPrint);
                  setIsPrintModalOpen(false);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition flex items-center space-x-2 active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Escape Notes</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
