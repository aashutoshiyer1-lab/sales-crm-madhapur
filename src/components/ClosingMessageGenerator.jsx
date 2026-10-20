import React, { useState, useMemo, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { getPaidTotal } from '../utils/pricingEngine';
import { STAFF_ROSTER, GAMES, OFFERS } from '../config/venueData';
import {
  rtdb,
  ref,
  onValue,
  isFirebaseConfigured,
  CLOSING_REPORTS_PATH,
  saveClosingReportToFirebase
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
 */
export const generateBookingNoteSentence = (booking) => {
  const pax = booking.players || 1;
  const room = booking.gameName || 'Escape Room';
  const offerId = booking.offerId || 'none';
  const offer = OFFERS.find(o => o.id === offerId);
  const ref = booking.reference ? booking.reference : (offer?.defaultReference || 'Nayeem Sir');
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

  const initialSaved = useMemo(() => getInitialClosingData(closingDate), [closingDate]);

  // Closing Staff Name (at bottom of message)
  const [closingStaff, setClosingStaff] = useState(initialSaved?.closingStaff || "Bhavani");
  const [customClosingStaff, setCustomClosingStaff] = useState(initialSaved?.customClosingStaff || "");

  // Mummy staff tracker: Array of { name: string, count: number }
  const [mummyActors, setMummyActors] = useState(
    initialSaved?.mummyActors || [{ name: "Prudhvi", count: 2 }]
  );
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

  const [copiedStatus, setCopiedStatus] = useState(false);

  // Sync state when closing date changes (load from LocalStorage)
  useEffect(() => {
    const saved = getInitialClosingData(closingDate);
    if (saved) {
      setClosingStaff(saved.closingStaff || "Bhavani");
      setCustomClosingStaff(saved.customClosingStaff || "");
      setMummyActors(saved.mummyActors || [{ name: "Prudhvi", count: 2 }]);
      setExcessAmount(saved.excessAmount || "00");
      setShortAmount(saved.shortAmount || "00");
      setClosingNote(saved.closingNote || "");
      setPrintNotesText(saved.printNotesText || "");
      setIsPrintNotesCustomized(saved.isPrintNotesCustomized || false);
    } else {
      setPrintNotesText("");
      setIsPrintNotesCustomized(false);
    }
  }, [closingDate]);

  // Real-time synchronization & persistence (LocalStorage + Firebase RTDB)
  useEffect(() => {
    const payload = {
      closingStaff,
      customClosingStaff,
      mummyActors,
      excessAmount,
      shortAmount,
      closingNote,
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
  }, [closingDate, closingStaff, customClosingStaff, mummyActors, excessAmount, shortAmount, closingNote, printNotesText, isPrintNotesCustomized]);

  // Real-time remote listener from Firebase RTDB (cross-tab / multi-device sync)
  useEffect(() => {
    if (!rtdb || !isFirebaseConfigured() || !closingDate) return;
    try {
      const reportRef = ref(rtdb, `${CLOSING_REPORTS_PATH}/${closingDate}`);
      const unsubscribe = onValue(reportRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          if (data.closingStaff !== undefined) setClosingStaff(data.closingStaff);
          if (data.customClosingStaff !== undefined) setCustomClosingStaff(data.customClosingStaff);
          if (data.mummyActors !== undefined) setMummyActors(data.mummyActors);
          if (data.excessAmount !== undefined) setExcessAmount(data.excessAmount);
          if (data.shortAmount !== undefined) setShortAmount(data.shortAmount);
          if (data.closingNote !== undefined) setClosingNote(data.closingNote);
          if (data.printNotesText !== undefined) setPrintNotesText(data.printNotesText);
          if (data.isPrintNotesCustomized !== undefined) setIsPrintNotesCustomized(data.isPrintNotesCustomized);
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
  const gameStats = useMemo(() => {
    const stats = {
      bank: { name: "Bank", games: 0, players: 0, sale: 0 },
      mummy: { name: "Mummy", games: 0, players: 0, sale: 0 },
      prison: { name: "Prison", games: 0, players: 0, sale: 0 },
      biryani: { name: "Biryani", games: 0, players: 0, sale: 0 }
    };

    dayBookings.forEach(b => {
      const gName = (b.gameName || '').toLowerCase();
      let key = null;

      if (gName.includes('bank')) key = 'bank';
      else if (gName.includes('mummy')) key = 'mummy';
      else if (gName.includes('prison')) key = 'prison';
      else if (gName.includes('recipe') || gName.includes('biryani')) key = 'biryani';

      if (key && stats[key]) {
        stats[key].games += 1;
        stats[key].players += Number(b.players) || 0;
        stats[key].sale += getPaidTotal(b.payments);
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

  // Date Shift Helpers
  const handleShiftDate = (days) => {
    const d = new Date(closingDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const newDateStr = d.toISOString().split('T')[0];
    setClosingDate(newDateStr);
    if (setSelectedDate) setSelectedDate(newDateStr);
  };

  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setClosingDate(today);
    if (setSelectedDate) setSelectedDate(today);
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

    const roomMap = new Map();
    // Pre-populate with standard GAMES from venueData
    GAMES.forEach(g => {
      roomMap.set(g.name, []);
    });

    discountOrNoteBookings.forEach(b => {
      const room = b.gameName || 'Other Rooms';
      if (!roomMap.has(room)) {
        roomMap.set(room, []);
      }
      roomMap.get(room).push(b);
    });

    return roomMap;
  }, [dayBookings]);

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
    lines.push(`*Sale : ${gameStats.bank.sale > 0 ? gameStats.bank.sale : '00'}*`);
    lines.push(``);

    // 2. Mummy
    lines.push(`*Mummy*`);
    lines.push(``);
    lines.push(`No. of games: *${pad2(gameStats.mummy.games)}*`);
    lines.push(`Total players:*${pad2(gameStats.mummy.players)}*`);
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
    lines.push(`*Sale : ${gameStats.prison.sale > 0 ? gameStats.prison.sale : '00'}*`);
    lines.push(``);

    // 4. Biryani (The Lost Recipe)
    lines.push(`*Biryani*`);
    lines.push(``);
    lines.push(`No.of games :*${pad2(gameStats.biryani.games)}*`);
    lines.push(`Total players :*${pad2(gameStats.biryani.players)}*`);
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

  // Copy to Clipboard
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generatedMessage).then(() => {
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2500);
    });
  };

  // WhatsApp Share Link
  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(generatedMessage);
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
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Total Players</span>
                    <span className="font-mono font-black text-slate-950 text-sm">*{pad2(gameStats.bank.players)}*</span>
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
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Total Players</span>
                    <span className="font-mono font-black text-slate-950 text-sm">*{pad2(gameStats.mummy.players)}*</span>
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
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Total Players</span>
                    <span className="font-mono font-black text-slate-950 text-sm">*{pad2(gameStats.prison.players)}*</span>
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
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Total Players</span>
                    <span className="font-mono font-black text-slate-950 text-sm">*{pad2(gameStats.biryani.players)}*</span>
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
              {mummyActors.map((actor, idx) => (
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
              ))}
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

          {/* Excess, Short, Notes & Closing Staff Name */}
          <div className="bg-white p-5 rounded-3xl border-2 border-blue-300 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-blue-900 tracking-wider border-b-2 border-blue-100 pb-2">
              3. Closing Details & Staff Sign-off
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
                  WhatsApp Preview
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  Ready to copy & paste
                </span>
              </div>

              <div className="flex items-center space-x-2">
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

                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  WhatsApp
                </span>
              </div>
            </div>

            {/* Formatted Code Block */}
            <div className="bg-[#fcfefe] border-2 border-blue-200 rounded-2xl p-4 font-mono text-xs leading-relaxed text-slate-900 select-all whitespace-pre-wrap max-h-[500px] overflow-y-auto shadow-inner">
              {generatedMessage}
            </div>

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
