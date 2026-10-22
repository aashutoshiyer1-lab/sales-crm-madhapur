import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Tag,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Camera,
  RotateCcw,
  UserCheck,
  Users,
  Plus,
  Minus,
  ChevronDown,
  Check,
  ShieldAlert
} from 'lucide-react';
import {
  GAMES,
  OFFERS,
  APPROVAL_REFERENCES,
  PAYMENT_MODES,
  MODES_REQUIRING_SCREENSHOT,
  generateTimeSlots,
  getTimeSlotGroups,
  isWeekend,
  getPlayerCategory,
  getBookingCategory,
  shiftDateString,
  getTodayDateString
} from '../config/venueData';
import { calculatePricing, formatCurrency, getPaidTotal } from '../utils/pricingEngine';

/**
 * Custom Dropdown Component to completely avoid Windows / browser native gray highlight
 */
function CustomDropdown({ label, value, options, onChange, icon: Icon, placeholder = "Select option" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-black text-blue-950 mb-1">
          {label}
        </label>
      )}

      {/* Dropdown Trigger Bar - Pure White with Blue Border */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between bg-white border-2 border-blue-300 hover:border-blue-600 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl px-3 py-2.5 transition text-left cursor-pointer shadow-xs"
      >
        <div className="flex items-center space-x-2 truncate pr-2">
          {Icon && <Icon className="w-4 h-4 text-blue-600 shrink-0" />}
          <span className={`font-black font-mono text-sm truncate ${selectedOption && selectedOption.value !== '' ? 'text-slate-950' : 'text-slate-400'}`}>
            {selectedOption && selectedOption.value !== '' ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-blue-600 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-700' : ''}`} />
      </button>

      {/* Dropdown Options Popup - Pure White with Vivid Blue Hover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border-2 border-blue-500 rounded-2xl shadow-2xl max-h-64 overflow-y-auto p-1.5 space-y-1 animate-fadeIn">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-black cursor-pointer transition-colors duration-150 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-900 hover:bg-blue-600 hover:text-white'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-4 h-4 text-white shrink-0 ml-2" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BookingModal({
  isOpen,
  onClose,
  onSave,
  bookingToEdit,
  defaultDate,
  defaultSlot,
  bookings = []
}) {
  if (!isOpen) return null;

  // 1. Customer Details (Comes First)
  const [customerName, setCustomerName] = useState(bookingToEdit?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(bookingToEdit?.customerPhone || '');
  const [notes, setNotes] = useState(bookingToEdit?.notes || '');

  // 2. Schedule Timing (Date & 12-Hour 15-Min Slot with Extended Slots up to 1 AM)
  const [date, setDate] = useState(
    bookingToEdit?.date || defaultDate || new Date().toISOString().split('T')[0]
  );

  const weekendStatus = useMemo(() => isWeekend(date), [date]);
  const slotGroups = useMemo(() => getTimeSlotGroups(weekendStatus), [weekendStatus]);

  // Support typing a custom walk-in time (e.g., 10:40 PM or 12:35 AM)
  const [isCustomTime, setIsCustomTime] = useState(() => {
    if (bookingToEdit?.timeSlot) {
      const initialGroups = getTimeSlotGroups(isWeekend(bookingToEdit.date || defaultDate));
      return !initialGroups.all.includes(bookingToEdit.timeSlot);
    }
    return false;
  });

  const [timeSlot, setTimeSlot] = useState(
    bookingToEdit?.timeSlot || defaultSlot || slotGroups.standard[0] || '11:00 AM'
  );

  // 3. Game & Pricing Selection (Starts as empty string "" - NO auto-selected game!)
  const [gameName, setGameName] = useState(
    bookingToEdit?.gameName || ''
  );

  // Manual player count entry: Starts as empty string "" for new entries so staff enters group size explicitly!
  const [players, setPlayers] = useState(
    bookingToEdit?.players ? bookingToEdit.players : ''
  );
  const [offerId, setOfferId] = useState(bookingToEdit?.offerId || 'none');

  // Selectable Discount Percent (supports offers with allowedPercents or isCustomPercent)
  const [discountPercent, setDiscountPercent] = useState(() => {
    if (bookingToEdit?.discountPercent !== undefined && bookingToEdit?.discountPercent !== null) {
      return Number(bookingToEdit.discountPercent);
    }
    const off = OFFERS.find(o => o.id === (bookingToEdit?.offerId || 'none'));
    return off ? off.discountPercent : 0;
  });

  // Custom Reason / Note for Any Offer or Discount
  const [customDiscountReason, setCustomDiscountReason] = useState(
    bookingToEdit?.customDiscountReason || bookingToEdit?.customNote || ''
  );

  // Approval Reference (Only Khaja Sir or Custom Name - Nayeem / 900 reference completely removed)
  const initialRef = (bookingToEdit?.reference || '').replace(/nayeem\s*sir|900/gi, '').trim();
  const isInitialKhaja = initialRef === 'Khaja Sir';
  const [refType, setRefType] = useState(() => {
    if (!initialRef) return 'none';
    if (isInitialKhaja) return 'Khaja Sir';
    return 'custom';
  });
  const [customRefName, setCustomRefName] = useState(() => {
    return isInitialKhaja ? '' : initialRef;
  });

  // Weekday vs Weekend Rate Toggle (allows staff to give weekday price on weekend or vice versa)
  const [rateType, setRateType] = useState(() => {
    if (bookingToEdit?.rateType) return bookingToEdit.rateType;
    return isWeekend(bookingToEdit?.date || defaultDate) ? 'weekend' : 'weekday';
  });
  const [isRateManuallyToggled, setIsRateManuallyToggled] = useState(Boolean(bookingToEdit?.rateType));

  // 4. Split Payments State
  const [isPending, setIsPending] = useState(
    bookingToEdit?.isPending ?? (bookingToEdit?.paymentStatus === 'pending')
  );

  const [payments, setPayments] = useState(() => {
    if (bookingToEdit?.payments) {
      return { ...bookingToEdit.payments };
    }
    const initial = {};
    PAYMENT_MODES.forEach(m => { initial[m] = ''; });
    return initial;
  });

  // Complimentary Game Category Cross-Verification Modal State
  const [showComplimentaryCategoryConfirm, setShowComplimentaryCategoryConfirm] = useState(false);
  const [categoryOverride, setCategoryOverride] = useState(() => {
    return bookingToEdit?.categoryOverride || bookingToEdit?.customCategory || '4–6 Players';
  });

  // Real-time synchronization when bookingToEdit prop changes
  useEffect(() => {
    if (bookingToEdit) {
      setCustomerName(bookingToEdit.customerName || '');
      setCustomerPhone(bookingToEdit.customerPhone || '');
      setNotes(bookingToEdit.notes || '');
      setDate(bookingToEdit.date || defaultDate || new Date().toISOString().split('T')[0]);
      setTimeSlot(bookingToEdit.timeSlot || defaultSlot || '11:00 AM');
      setGameName(bookingToEdit.gameName || '');
      setPlayers(bookingToEdit.players || '');
      setOfferId(bookingToEdit.offerId || 'none');
      setCategoryOverride(bookingToEdit.categoryOverride || bookingToEdit.customCategory || '4–6 Players');
      
      const off = OFFERS.find(o => o.id === (bookingToEdit.offerId || 'none'));
      setDiscountPercent(
        bookingToEdit.discountPercent !== undefined && bookingToEdit.discountPercent !== null
          ? Number(bookingToEdit.discountPercent)
          : (off ? off.discountPercent : 0)
      );

      setCustomDiscountReason(bookingToEdit.customDiscountReason || bookingToEdit.customNote || '');
      const cleanRef = (bookingToEdit.reference || '').replace(/nayeem\s*sir|900/gi, '').trim();
      const isStd = cleanRef === 'Khaja Sir';
      setRefType(cleanRef ? (isStd ? 'Khaja Sir' : 'custom') : 'none');
      setCustomRefName(isStd ? '' : cleanRef);
      setIsPending(bookingToEdit.isPending ?? (bookingToEdit.paymentStatus === 'pending'));
      setPayments(bookingToEdit.payments ? { ...bookingToEdit.payments } : {});

      if (bookingToEdit.rateType) {
        setRateType(bookingToEdit.rateType);
        setIsRateManuallyToggled(true);
      } else {
        setRateType(isWeekend(bookingToEdit.date || defaultDate) ? 'weekend' : 'weekday');
        setIsRateManuallyToggled(false);
      }
    }
  }, [bookingToEdit]);

  // Keep rateType in sync with date changes if staff has not manually overridden
  useEffect(() => {
    if (!isRateManuallyToggled) {
      setRateType(isWeekend(date) ? 'weekend' : 'weekday');
    }
  }, [date, isRateManuallyToggled]);

  // Handle Offer Selection and auto-populate default reference, discount percent & payment modes
  const handleOfferChange = (newOfferId) => {
    setOfferId(newOfferId);
    const selected = OFFERS.find(o => o.id === newOfferId);
    if (selected) {
      setDiscountPercent(selected.discountPercent);
      if (selected.defaultReference) {
        setRefType(selected.defaultReference);
        setCustomRefName('');
      } else if (selected.requiresReference && refType === 'none') {
        setRefType('Khaja Sir');
        setCustomRefName('');
      } else if (!selected.requiresReference && !selected.defaultReference) {
        setRefType('none');
        setCustomRefName('');
      }

      // Auto-set payment mode and note when prepaid online channels are selected
      if (newOfferId === 'website_booking') {
        const newPayments = {};
        PAYMENT_MODES.forEach(m => {
          newPayments[m] = m === 'Razorpay (Website Bookings)' ? pricing.finalTotal : '';
        });
        setPayments(newPayments);
        setIsPending(false);
        setCustomDiscountReason(prev => prev && prev !== 'District App' && prev !== 'Activity Kids' ? prev : 'Website Booking');
      } else if (newOfferId === 'district_app') {
        const newPayments = {};
        PAYMENT_MODES.forEach(m => {
          newPayments[m] = m === 'Prepaid by District' ? pricing.finalTotal : '';
        });
        setPayments(newPayments);
        setIsPending(false);
        setCustomDiscountReason(prev => prev && prev !== 'Website Booking' && prev !== 'Activity Kids' ? prev : 'District App');
      } else if (newOfferId === 'activity_kids') {
        const newPayments = {};
        PAYMENT_MODES.forEach(m => {
          newPayments[m] = m === 'Activity Kids' ? pricing.finalTotal : '';
        });
        setPayments(newPayments);
        setIsPending(false);
        setCustomDiscountReason(prev => prev && prev !== 'Website Booking' && prev !== 'District App' ? prev : 'Activity Kids');
      }
    }
  };

  const selectedOfferObj = useMemo(() => OFFERS.find(o => o.id === offerId), [offerId]);

  // Determine active tier automatically based on entered players
  const activeTier = useMemo(() => {
    const count = Number(players);
    if (!count || count <= 0) return null;
    if (count <= 3) return '2-3';
    if (count <= 6) return '4-6';
    return '7+';
  }, [players]);

  // Detect companion booking of the same customer on this date to auto-determine complimentary player category
  const companionBooking = useMemo(() => {
    if (!Array.isArray(bookings) || bookings.length === 0) return null;
    const cleanPhone = (customerPhone || '').replace(/\D/g, '');
    const cleanName = (customerName || '').trim().toLowerCase();

    return bookings.find(b => {
      if (!b || (bookingToEdit && b.id === bookingToEdit.id)) return false;
      if (b.date !== date) return false;
      const isPaid = (Number(b.finalTotal) > 0) || (b.offerId !== 'complimentary' && Number(b.discountPercent) !== 100);
      if (!isPaid) return false;

      const bPhone = (b.customerPhone || '').replace(/\D/g, '');
      const bName = (b.customerName || '').trim().toLowerCase();

      // 1. Same phone number (at least 6 digits match)
      if (cleanPhone.length >= 6 && bPhone.length >= 6 && (bPhone.includes(cleanPhone) || cleanPhone.includes(bPhone))) {
        return true;
      }
      // 2. Same customer name (at least 3 characters)
      if (cleanName.length >= 3 && bName.length >= 3 && (bName.includes(cleanName) || cleanName.includes(bName))) {
        return true;
      }
      // 3. Same game and same time slot
      if (timeSlot && b.timeSlot === timeSlot && gameName && (b.gameName || '').toLowerCase() === gameName.toLowerCase()) {
        return true;
      }
      return false;
    });
  }, [bookings, customerPhone, customerName, date, timeSlot, gameName, bookingToEdit]);

  const companionCategory = useMemo(() => {
    if (!companionBooking) return null;
    return (
      companionBooking.categoryOverride ||
      companionBooking.customCategory ||
      companionBooking.playerCategory ||
      getPlayerCategory(companionBooking.players)
    );
  }, [companionBooking]);

  // Auto-select category for complimentary bookings based on companion booking ONLY for NEW bookings
  useEffect(() => {
    if (!bookingToEdit) {
      const isComp = offerId === 'complimentary' || selectedOfferObj?.isComplimentary;
      if (isComp && companionCategory) {
        setCategoryOverride(companionCategory);
      }
    }
  }, [bookingToEdit, offerId, selectedOfferObj, companionCategory]);

  // Sync timeSlot if available slots change, BUT NEVER overwrite custom walk-in time when changing dates!
  useEffect(() => {
    if (!isCustomTime) {
      if (slotGroups.all.length > 0 && !slotGroups.all.includes(timeSlot)) {
        setTimeSlot(slotGroups.standard[0] || '11:00 AM');
      }
    }
  }, [date, isCustomTime, slotGroups]);

  const isWeekendRate = rateType === 'weekend';
  const isComplimentary = Boolean(offerId === 'complimentary' || selectedOfferObj?.isComplimentary);

  const isTier1Active = isComplimentary
    ? (categoryOverride.includes('2') || categoryOverride.includes('3'))
    : (activeTier === '2-3');

  const isTier2Active = isComplimentary
    ? (categoryOverride.includes('4') || categoryOverride.includes('5') || categoryOverride.includes('6'))
    : (activeTier === '4-6');

  const isTier3Active = isComplimentary
    ? categoryOverride.includes('7')
    : (activeTier === '7+');

  // Pricing calculation
  const pricing = useMemo(() => {
    return calculatePricing({
      date,
      players,
      offerId,
      customDiscountPercent: discountPercent,
      isWeekendOverride: isWeekendRate
    });
  }, [date, players, offerId, discountPercent, isWeekendRate]);

  const paidTotal = useMemo(() => getPaidTotal(payments), [payments]);
  const remainingBalance = Math.max(0, pricing.finalTotal - paidTotal);

  // Check screenshot requirement
  const requiresScreenshot = useMemo(() => {
    return Object.keys(payments).some(
      mode => MODES_REQUIRING_SCREENSHOT.includes(mode) && Number(payments[mode]) > 0
    );
  }, [payments]);

  // Handle Split Payment input (automatically sets matching offer if Prepaid by District, Razorpay, or Activity Kids)
  const handlePaymentChange = (mode, val) => {
    const numVal = val === '' ? '' : Math.max(0, Number(val));
    setPayments(prev => ({
      ...prev,
      [mode]: numVal
    }));

    if (numVal > 0 || val !== '') {
      if (mode === 'Razorpay (Website Bookings)') {
        setOfferId('website_booking');
        setDiscountPercent(0);
        setRefType('none');
        setCustomRefName('');
        setCustomDiscountReason(prev => (prev && prev !== 'District App' && prev !== 'Activity Kids') ? prev : 'Website Booking');
      } else if (mode === 'Prepaid by District') {
        setOfferId('district_app');
        setDiscountPercent(0);
        setRefType('none');
        setCustomRefName('');
        setCustomDiscountReason(prev => (prev && prev !== 'Website Booking' && prev !== 'Activity Kids') ? prev : 'District App');
      } else if (mode === 'Activity Kids') {
        setOfferId('activity_kids');
        setDiscountPercent(0);
        setRefType('none');
        setCustomRefName('');
        setCustomDiscountReason(prev => (prev && prev !== 'Website Booking' && prev !== 'District App') ? prev : 'Activity Kids');
      }
    }
  };

  // Quick 100% Auto Fill (automatically selects offer and populates discount note for Razorpay, District, or Activity Kids)
  const handleAutoFillMode = (mode) => {
    const newPayments = {};
    PAYMENT_MODES.forEach(m => {
      newPayments[m] = m === mode ? pricing.finalTotal : '';
    });
    setPayments(newPayments);
    setIsPending(false);

    if (mode === 'Razorpay (Website Bookings)') {
      setOfferId('website_booking');
      setDiscountPercent(0);
      setRefType('none');
      setCustomRefName('');
      setCustomDiscountReason(prev => (prev && prev !== 'District App' && prev !== 'Activity Kids') ? prev : 'Website Booking');
    } else if (mode === 'Prepaid by District') {
      setOfferId('district_app');
      setDiscountPercent(0);
      setRefType('none');
      setCustomRefName('');
      setCustomDiscountReason(prev => (prev && prev !== 'Website Booking' && prev !== 'Activity Kids') ? prev : 'District App');
    } else if (mode === 'Activity Kids') {
      setOfferId('activity_kids');
      setDiscountPercent(0);
      setRefType('none');
      setCustomRefName('');
      setCustomDiscountReason(prev => (prev && prev !== 'Website Booking' && prev !== 'District App') ? prev : 'Activity Kids');
    }
  };

  // Quick Fill Remainder
  const handleFillRemainder = (mode) => {
    if (remainingBalance <= 0) return;
    const current = Number(payments[mode]) || 0;
    setPayments(prev => ({
      ...prev,
      [mode]: current + remainingBalance
    }));

    if (mode === 'Razorpay (Website Bookings)') {
      setOfferId('website_booking');
      setDiscountPercent(0);
      setRefType('none');
      setCustomRefName('');
      setCustomDiscountReason(prev => (prev && prev !== 'District App' && prev !== 'Activity Kids') ? prev : 'Website Booking');
    } else if (mode === 'Prepaid by District') {
      setOfferId('district_app');
      setDiscountPercent(0);
      setRefType('none');
      setCustomRefName('');
      setCustomDiscountReason(prev => (prev && prev !== 'Website Booking' && prev !== 'Activity Kids') ? prev : 'District App');
    } else if (mode === 'Activity Kids') {
      setOfferId('activity_kids');
      setDiscountPercent(0);
      setRefType('none');
      setCustomRefName('');
      setCustomDiscountReason(prev => (prev && prev !== 'Website Booking' && prev !== 'District App') ? prev : 'Activity Kids');
    }
  };

  // Clear payments
  const handleClearPayments = () => {
    const empty = {};
    PAYMENT_MODES.forEach(m => { empty[m] = ''; });
    setPayments(empty);
  };

  // Plus / Minus adjustments (starts from 0 if empty, so clicking + adds 1 player instead of jumping to 3)
  const handlePlayerAdjust = (delta) => {
    const current = (players === '' || !players) ? 0 : Number(players);
    const next = Math.max(1, current + delta);
    setPlayers(next);
  };

  // Quick Date Jump (Strictly shifts 1 day with no timezone offset jumping)
  const handleShiftDate = (days) => {
    setDate(shiftDateString(date, days));
  };

  const handleSetToday = () => {
    setDate(getTodayDateString());
  };

  // Form Validation: Customer details, Game selection, Group size, and Advance/Payment required before confirming
  const cleanPhone = customerPhone.replace(/\D/g, '').trim();
  const hasValidName = Boolean(customerName && customerName.trim().length > 0);
  const hasValidPhone = cleanPhone.length === 10;
  const hasValidGame = Boolean(gameName && gameName.trim().length > 0);
  const hasValidPlayers = Boolean(players !== '' && Number(players) > 0);
  const hasValidPayment = Boolean(isComplimentary || paidTotal > 0 || isPending);

  const isFormValid = hasValidName && hasValidPhone && hasValidGame && hasValidPlayers && hasValidPayment;

  // Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isFormValid) {
      if (!hasValidName) {
        alert("Please enter customer name before confirming.");
        return;
      }
      if (!hasValidPhone) {
        alert("Please enter a valid 10-digit mobile number before confirming.");
        return;
      }
      if (!hasValidGame) {
        alert("Please select an escape room game before confirming.");
        return;
      }
      if (!hasValidPlayers) {
        alert("Please enter group size / player count before confirming.");
        return;
      }
      if (!hasValidPayment) {
        alert("No payment was recorded. Please enter payment amounts or check 'Mark as Advance / Pending Payment' before confirming.");
        return;
      }
      return;
    }

    const selectedOfferObj = OFFERS.find(o => o.id === offerId);
    const isComp = Boolean(selectedOfferObj?.isComplimentary || offerId === 'complimentary');

    // Prompt/confirm pax bracket category for complimentary game (Kids Under 5 Years) via interactive Modal
    if (isComp) {
      setShowComplimentaryCategoryConfirm(true);
      return;
    }

    executeSaveBooking(null);
  };

  const executeSaveBooking = (confirmedCategory = null) => {
    const selectedOfferObj = OFFERS.find(o => o.id === offerId);
    const isComplimentary = Boolean(selectedOfferObj?.isComplimentary || offerId === 'complimentary');
    const numPlayers = Number(players) || 1;

    let finalReference = '';
    if ((APPROVAL_REFERENCES || []).includes(refType)) {
      finalReference = refType;
    } else if (refType === 'custom') {
      finalReference = customRefName.trim();
    }
    // Safety check: ensure 900 / Nayeem reference is completely stripped
    finalReference = finalReference.replace(/nayeem\s*sir|900/gi, '').trim();

    if (isComplimentary && !finalReference) {
      finalReference = 'Khaja Sir';
    }

    const cleanPayments = {};
    PAYMENT_MODES.forEach(m => {
      const val = Number(payments[m]) || 0;
      if (val > 0) cleanPayments[m] = val;
    });

    const isFullyPaid = paidTotal >= pricing.finalTotal && pricing.finalTotal > 0;

    // Check if entry has 0 payment and is not marked as advance/pending (skip check for 100% complimentary!)
    if (!isComplimentary && paidTotal === 0 && !isPending && pricing.finalTotal > 0) {
      alert("No payment was recorded. Please check 'Mark as Advance / Pending Payment' on the left or enter payment amounts before confirming.");
      return;
    }

    const shouldMarkPending = !isComplimentary && (isPending || (!isFullyPaid && pricing.finalTotal > 0));
    const trimmedCustomReason = customDiscountReason.trim();

    const chosenCategory = confirmedCategory || categoryOverride || bookingToEdit?.playerCategory || getPlayerCategory(numPlayers);

    const bookingData = {
      id: bookingToEdit?.id || `ETM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: bookingToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date,
      timeSlot,
      rateType: isWeekendRate ? 'weekend' : 'weekday',
      isWeekendRate: isWeekendRate,
      gameName,
      players: numPlayers,
      categoryOverride: chosenCategory,
      customCategory: chosenCategory,
      playerCategory: chosenCategory,
      ratePerPlayer: isComplimentary ? 0 : pricing.ratePerPlayer,
      baseTotal: pricing.baseTotal,
      offerId,
      offerName: selectedOfferObj ? selectedOfferObj.name : 'None',
      customDiscountReason: trimmedCustomReason,
      customNote: trimmedCustomReason || notes.trim(),
      discountPercent: isComplimentary ? 100 : pricing.discountPercent,
      discountAmount: isComplimentary ? pricing.baseTotal : pricing.discountAmount,
      finalTotal: isComplimentary ? 0 : pricing.finalTotal,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      notes: notes.trim(),
      reference: finalReference || (isComplimentary ? 'Khaja Sir' : ''),
      payments: isComplimentary ? {} : cleanPayments,
      isPending: shouldMarkPending,
      paymentStatus: shouldMarkPending ? 'pending' : 'paid'
    };

    onSave(bookingData);
    setShowComplimentaryCategoryConfirm(false);
    onClose();
  };

  // Options for custom dropdowns
  const slotOptions = useMemo(() => {
    return slotGroups.all.map(s => ({ value: s, label: s }));
  }, [slotGroups]);

  const gameOptions = useMemo(() => {
    return [
      { value: '', label: '-- Select Escape Room Game --' },
      ...GAMES.map(g => ({ value: g.name, label: `${g.name} (60m)` }))
    ];
  }, []);

  const offerOptions = useMemo(() => {
    return OFFERS.map(o => ({ value: o.id, label: o.name }));
  }, []);

  const refOptions = useMemo(() => [
    { value: 'none', label: 'None (Standard Rate)' },
    ...(APPROVAL_REFERENCES || ['Khaja Sir']).map(ref => ({ value: ref, label: ref })),
    { value: 'custom', label: '+ Specific / Other Custom Name' }
  ], []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      {/* Pure White Dialog Box with Crisp Blue Accents */}
      <div className="bg-white w-full max-w-4xl rounded-3xl border-2 border-blue-400 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">

        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-950 text-white border-b border-blue-600 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white text-blue-900 flex items-center justify-center font-black text-lg shadow-md">
              ET
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {bookingToEdit ? 'Edit Booking Entry & Payment' : 'New Booking Entry'}
              </h2>
              <p className="text-xs font-bold text-blue-200">
                Escape Time - Madhapur Branch • Auto Group Pricing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Pure White Dialog Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900 bg-white">

          {/* STEP 1: CUSTOMER CONTACT INFORMATION (FIRST) */}
          <div className="bg-white p-5 rounded-2xl border-2 border-blue-300 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b-2 border-blue-100 pb-2.5">
              <h3 className="text-xs font-black uppercase text-blue-900 tracking-wider flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">1</span>
                <span>Customer Contact Information</span>
              </h3>
              <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                Primary Contact
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Customer Name */}
              <div>
                <label className="block text-xs font-black text-blue-950 mb-1">
                  Customer Name *
                </label>
                <div className="flex items-center space-x-2 bg-white border-2 border-blue-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 rounded-xl px-3 py-2.5 transition">
                  <User className="w-4 h-4 text-blue-600 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="bg-white font-black text-slate-950 outline-none w-full text-sm placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Customer Phone (Strictly 10 Digits Max) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black text-blue-950">
                    Phone Number (10 Digits) *
                  </label>
                  {customerPhone && (
                    <span className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded ${
                      customerPhone.length === 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {customerPhone.length}/10
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 bg-white border-2 border-blue-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 rounded-xl px-3 py-2.5 transition">
                  <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={customerPhone}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setCustomerPhone(digitsOnly);
                    }}
                    className="bg-white font-black font-mono text-slate-950 outline-none w-full text-sm placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-black text-blue-950 mb-1">
                  Booking Notes / Tags
                </label>
                <div className="flex items-center space-x-2 bg-white border-2 border-blue-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 rounded-xl px-3 py-2.5 transition">
                  <input
                    type="text"
                    placeholder="e.g. Birthday, corporate group"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-white font-bold text-slate-950 outline-none w-full text-sm placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: BOOKING DATE & TIME (CUSTOM BLUE DROPDOWN - NO GRAY SELECTION) */}
          <div className="bg-white p-5 rounded-2xl border-2 border-blue-300 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b-2 border-blue-100 pb-2.5">
              <h3 className="text-xs font-black uppercase text-blue-900 tracking-wider flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">2</span>
                <span>Booking Date & 15-Minute Slot Time</span>
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                weekendStatus
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-blue-100 text-blue-900 border-blue-300'
              }`}>
                Operating Hours: {weekendStatus ? 'Weekend (10:30 AM – 11:00 PM)' : 'Weekday (11:00 AM – 10:00 PM)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date Input with Quick Navigation Controls */}
              <div>
                <label className="block text-xs font-black text-blue-950 mb-1">
                  Which Date is Customer Booking?
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 flex items-center space-x-2 bg-white border-2 border-blue-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 rounded-xl px-3 py-2 transition">
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-white font-black font-mono text-slate-950 outline-none w-full text-sm cursor-pointer accent-blue-600"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSetToday}
                    className="px-2.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition shadow-xs"
                    title="Set to Today"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShiftDate(1)}
                    className="px-2.5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-900 text-xs font-black rounded-xl transition"
                    title="Next Day"
                  >
                    +1D
                  </button>
                </div>
              </div>

              {/* 15-Minute Time Slot with Extended Slots up to 1 AM & Custom Time Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black text-blue-950 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Time Slot (12-Hour Format)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomTime(prev => !prev)}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-black border transition ${
                      isCustomTime
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100'
                    }`}
                  >
                    {isCustomTime ? '✓ Custom Time Active' : '✎ Custom Time'}
                  </button>
                </div>

                {isCustomTime ? (
                  <div className="flex items-center space-x-2 bg-white border-2 border-blue-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 rounded-xl px-3 py-2.5 transition">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 10:40 PM or 12:35 AM"
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="bg-white font-black font-mono text-slate-950 outline-none w-full text-sm placeholder:text-slate-400"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full bg-white border-2 border-blue-300 hover:border-blue-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl px-3 py-2.5 font-black font-mono text-slate-950 text-sm outline-none cursor-pointer shadow-xs transition"
                    >
                      <optgroup label="Standard Operating Hours">
                        {slotGroups.standard.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </optgroup>
                      <optgroup label="🌙 Extended / Late Night Slots (Till 1 AM)">
                        {slotGroups.extended.map(s => (
                          <option key={s} value={s}>{s} (Late Night)</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STEP 3: PLAYERS (MANUAL ENTRY ONLY + AUTO TIER SELECTION), GAME & OFFERS */}
          <div className="bg-white p-5 rounded-2xl border-2 border-blue-300 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b-2 border-blue-100 pb-2.5">
              <h3 className="text-xs font-black uppercase text-blue-900 tracking-wider flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">3</span>
                <span>Group Size & Auto-Tier Pricing</span>
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-black text-blue-900 bg-blue-100 px-3 py-1 rounded-full border border-blue-300">
                  Category: <strong>{isComplimentary ? (categoryOverride || '4–6 Players') : getPlayerCategory(players)}</strong>
                </span>
                {isComplimentary ? (
                  <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                    Complimentary (100% Free)
                  </span>
                ) : activeTier && (
                  <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                    Tier: {activeTier}
                  </span>
                )}
              </div>
            </div>

            {/* Interactive Weekday / Weekend Rate Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 bg-blue-50/90 rounded-2xl border-2 border-blue-200">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black text-blue-950">Applied Pricing Tier:</span>
                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border transition-all ${
                  isWeekendRate
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-blue-100 text-blue-900 border-blue-300'
                }`}>
                  {isWeekendRate ? '🌴 Weekend Price Tier' : '🏢 Weekday Price Tier'}
                </span>
              </div>

              <div className="inline-flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-blue-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    setRateType('weekday');
                    setIsRateManuallyToggled(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center space-x-1 cursor-pointer ${
                    rateType === 'weekday'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-blue-900 hover:bg-blue-50'
                  }`}
                >
                  <span>🏢 Weekday Rate</span>
                  <span className="text-[10px] font-mono opacity-80">(₹999/899/799)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRateType('weekend');
                    setIsRateManuallyToggled(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center space-x-1 cursor-pointer ${
                    rateType === 'weekend'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-amber-950 hover:bg-amber-50'
                  }`}
                >
                  <span>🌴 Weekend Rate</span>
                  <span className="text-[10px] font-mono opacity-80">(₹1099/999/899)</span>
                </button>
              </div>
            </div>

            {/* Manual Player Entry Bar + 3 Auto-Selected Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              
              {/* Manual Player Input (No up/down arrows, no accidental scroll jump, staff types directly or uses +/-) */}
              <div className="md:col-span-5 bg-white p-4 rounded-2xl border-2 border-blue-300">
                <label className="block text-xs font-black text-blue-950 mb-2">
                  Enter Number of Players Manually:
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handlePlayerAdjust(-1)}
                    className="w-12 h-12 rounded-xl bg-blue-100 hover:bg-blue-600 hover:text-white border-2 border-blue-300 text-blue-900 flex items-center justify-center font-black active:scale-95 transition shadow-xs"
                    title="Minus 1 Player"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="flex-1 flex items-center justify-center bg-white border-2 border-blue-400 focus-within:border-blue-600 rounded-xl h-12 px-3">
                    <Users className="w-5 h-5 text-blue-600 mr-2 shrink-0" />
                    <input
                      type="number"
                      min="1"
                      max="40"
                      required
                      value={players}
                      onWheel={(e) => e.target.blur()} // Prevents accidental mouse scroll jump!
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setPlayers(isNaN(val) ? '' : Math.max(1, val));
                      }}
                      className="w-full text-center font-black font-mono text-xl text-slate-950 outline-none bg-white"
                      placeholder="e.g. 4"
                    />
                    <span className="text-xs font-black text-blue-950 ml-1">Players</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePlayerAdjust(1)}
                    className="w-12 h-12 rounded-xl bg-blue-100 hover:bg-blue-600 hover:text-white border-2 border-blue-300 text-blue-900 flex items-center justify-center font-black active:scale-95 transition shadow-xs"
                    title="Plus 1 Player"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 3 Auto-Detected Pricing Tiers - Automatically Lights Up in Bright Blue */}
              <div className="md:col-span-7 grid grid-cols-3 gap-2">
                {/* Tier 1: 2-3 Players */}
                <div
                  onClick={() => {
                    if (isComplimentary) {
                      setCategoryOverride('2–3 Players');
                    } else {
                      setPlayers(2);
                    }
                  }}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                    isTier1Active
                      ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400/50'
                      : 'bg-white text-slate-900 border-blue-200 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${isTier1Active ? 'text-white' : 'text-slate-950'}`}>2–3 Players</span>
                    {isTier1Active && (
                      <span className="text-[9px] font-black bg-white text-blue-900 px-1.5 py-0.2 rounded shadow-xs">
                        ✓ ACTIVE
                      </span>
                    )}
                  </div>
                  <p className={`text-base font-black font-mono mt-1 ${isTier1Active ? 'text-white' : 'text-blue-950'}`}>
                    {isComplimentary ? '₹0' : (isWeekendRate ? '₹1,099' : '₹999')}
                  </p>
                  <span className={`text-[10px] font-bold ${isTier1Active ? 'text-blue-100' : 'text-blue-700'}`}>
                    {isComplimentary ? 'Complimentary' : 'per player'}
                  </span>
                </div>

                {/* Tier 2: 4-6 Players */}
                <div
                  onClick={() => {
                    if (isComplimentary) {
                      setCategoryOverride('4–6 Players');
                    } else {
                      setPlayers(4);
                    }
                  }}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                    isTier2Active
                      ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400/50'
                      : 'bg-white text-slate-900 border-blue-200 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${isTier2Active ? 'text-white' : 'text-slate-950'}`}>4–6 Players</span>
                    {isTier2Active && (
                      <span className="text-[9px] font-black bg-white text-blue-900 px-1.5 py-0.2 rounded shadow-xs">
                        ✓ ACTIVE
                      </span>
                    )}
                  </div>
                  <p className={`text-base font-black font-mono mt-1 ${isTier2Active ? 'text-white' : 'text-blue-950'}`}>
                    {isComplimentary ? '₹0' : (isWeekendRate ? '₹999' : '₹899')}
                  </p>
                  <span className={`text-[10px] font-bold ${isTier2Active ? 'text-blue-100' : 'text-blue-700'}`}>
                    {isComplimentary ? 'Complimentary' : 'per player'}
                  </span>
                </div>

                {/* Tier 3: 7+ Players */}
                <div
                  onClick={() => {
                    if (isComplimentary) {
                      setCategoryOverride('7+ Players');
                    } else {
                      setPlayers(7);
                    }
                  }}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                    isTier3Active
                      ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400/50'
                      : 'bg-white text-slate-900 border-blue-200 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${isTier3Active ? 'text-white' : 'text-slate-950'}`}>7+ Players</span>
                    {isTier3Active && (
                      <span className="text-[9px] font-black bg-white text-blue-900 px-1.5 py-0.2 rounded shadow-xs">
                        ✓ ACTIVE
                      </span>
                    )}
                  </div>
                  <p className={`text-base font-black font-mono mt-1 ${isTier3Active ? 'text-white' : 'text-blue-950'}`}>
                    {isComplimentary ? '₹0' : (isWeekendRate ? '₹899' : '₹799')}
                  </p>
                  <span className={`text-[10px] font-bold ${isTier3Active ? 'text-blue-100' : 'text-blue-700'}`}>
                    {isComplimentary ? 'Complimentary' : 'per player'}
                  </span>
                </div>
              </div>

            </div>

            {/* Custom Blue Dropdowns for Game, Deal / Discount & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t-2 border-blue-100">
              {/* Game Custom Dropdown */}
              <div>
                <CustomDropdown
                  label="Escape Room Game (Required)"
                  value={gameName}
                  options={gameOptions}
                  onChange={(val) => setGameName(val)}
                  icon={Tag}
                  placeholder="-- Select Escape Room Game --"
                />
              </div>

              {/* Deal / Offer Custom Dropdown */}
              <div>
                <CustomDropdown
                  label="Deal / Discount Offer"
                  value={offerId}
                  options={offerOptions}
                  onChange={(val) => handleOfferChange(val)}
                  icon={Tag}
                />

                {/* Selectable % OFF if offer has allowedPercents */}
                {selectedOfferObj?.allowedPercents && (
                  <div className="mt-2 p-2 bg-blue-50/80 rounded-xl border border-blue-200 animate-fadeIn">
                    <span className="text-[11px] font-black text-blue-900 block mb-1">Select Discount %:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedOfferObj.allowedPercents.map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDiscountPercent(pct)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-black transition ${
                            discountPercent === pct
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white border border-blue-300 text-blue-900 hover:bg-blue-100'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom % Input if isCustomPercent */}
                {selectedOfferObj?.isCustomPercent && (
                  <div className="mt-2 p-2 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center space-x-2 animate-fadeIn">
                    <span className="text-xs font-black text-blue-900">Custom %:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                      className="w-16 bg-white border-2 border-blue-400 focus:border-blue-600 rounded-lg px-2 py-1 text-center font-mono font-black text-xs text-slate-950 outline-none"
                    />
                    <span className="text-xs font-bold text-slate-700">% OFF</span>
                  </div>
                )}
              </div>

              {/* Approval Reference Custom Dropdown */}
              <div>
                <CustomDropdown
                  label="Approval Reference"
                  value={refType}
                  options={refOptions}
                  onChange={(val) => {
                    setRefType(val);
                    if (val !== 'custom') setCustomRefName('');
                  }}
                  icon={UserCheck}
                />
              </div>
            </div>

            {/* Custom Reason Field (Default for all offers including 'No Discount') */}
            <div className="p-3.5 bg-amber-50 rounded-2xl border-2 border-amber-300 space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-amber-950 flex items-center space-x-1.5">
                  <Tag className="w-4 h-4 text-amber-700" />
                  <span>Custom Reason:</span>
                </label>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  Optional • Directly populates to Sales Report & Closing Message
                </span>
              </div>
              <div className="flex items-center space-x-2 bg-white border-2 border-amber-300 focus-within:border-amber-600 rounded-xl px-3 py-2 transition shadow-xs">
                <input
                  type="text"
                  placeholder="Type custom reason or note here (e.g. Website Booking ID, Birthday ID, Corporate, Cross-promo...)"
                  value={customDiscountReason}
                  onChange={(e) => setCustomDiscountReason(e.target.value)}
                  className="bg-white font-bold text-slate-950 text-xs sm:text-sm outline-none w-full placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Complimentary Game Category Bracket Selection (Supports any category even for 2 or 3 kids) */}
            {(offerId === 'complimentary' || selectedOfferObj?.isComplimentary) && (
              <div className="p-4 bg-amber-50/90 rounded-2xl border-2 border-amber-300 space-y-2.5 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div>
                    <span className="text-xs font-black text-amber-950 flex items-center space-x-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-700" />
                      <span>Complimentary Player Category Bracket (100% OFF)</span>
                    </span>
                    <p className="text-[11px] font-bold text-amber-800">
                      Kids under 5 play complimentary (₹0) with their accompanying group. Select group category:
                    </p>
                  </div>
                  {companionBooking && (
                    <span className="text-[10px] font-black bg-blue-600 text-white px-2.5 py-1 rounded-full shadow-2xs flex items-center space-x-1">
                      <span>✨ Auto-Selected: {companionBooking.customerName || 'Companion'}</span>
                      <span className="bg-white/25 px-1.5 py-0.2 rounded font-mono">{companionCategory}</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '2–3 Players', label: '2–3 Players', desc: 'Small Group' },
                    { id: '4–6 Players', label: '4–6 Players', desc: 'Family / Standard', badge: 'Recommended' },
                    { id: '7+ Players', label: '7+ Players', desc: 'Large Group' }
                  ].map(cat => {
                    const isSelected = categoryOverride === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryOverride(cat.id)}
                        className={`p-3 rounded-xl border-2 text-center transition flex flex-col items-center justify-center relative cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40'
                            : 'border-amber-200 bg-white hover:bg-amber-100/60 text-slate-900'
                        }`}
                      >
                        {cat.badge && !isSelected && (
                          <span className="absolute -top-2 px-1.5 py-0.2 bg-amber-600 text-[8px] font-black text-white rounded-full">
                            {cat.badge}
                          </span>
                        )}
                        <span className="text-xs font-black block">{cat.label}</span>
                        <span className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                          {cat.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Reference Name Input if selected */}
            {refType === 'custom' && (
              <div className="p-3 bg-white rounded-xl border-2 border-blue-500 animate-fadeIn">
                <label className="block text-xs font-black text-blue-950 mb-1">
                  Enter Specific Reference Name:
                </label>
                <div className="flex items-center space-x-2 bg-white border-2 border-blue-300 focus-within:border-blue-600 rounded-lg px-3 py-2">
                  <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="Type person's name or reference..."
                    value={customRefName}
                    onChange={(e) => setCustomRefName(e.target.value)}
                    className="bg-white font-black text-slate-950 text-xs sm:text-sm outline-none w-full"
                  />
                </div>
              </div>
            )}

            {/* Live Pricing Breakdown Card */}
            <div className="bg-blue-50/70 p-4 rounded-2xl border-2 border-blue-300 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[11px] font-black text-blue-900 block">Rate / Player</span>
                <span className="text-base font-black font-mono text-slate-950">
                  {formatCurrency(pricing.ratePerPlayer)}
                </span>
                <span className="text-[10px] text-blue-700 block mt-0.5">Tier: {activeTier} Players</span>
              </div>
              <div>
                <span className="text-[11px] font-black text-blue-900 block">Base Amount</span>
                <span className="text-base font-black font-mono text-slate-950">
                  {formatCurrency(pricing.baseTotal)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{players || 0} × ₹{pricing.ratePerPlayer}</span>
              </div>
              <div>
                <span className="text-[11px] font-black text-blue-900 block">
                  Discount ({pricing.discountPercent}%)
                </span>
                <span className="text-base font-black font-mono text-emerald-700">
                  - {formatCurrency(pricing.discountAmount)}
                </span>
                <span className="text-[10px] text-emerald-800 block mt-0.5">{pricing.discountPercent > 0 ? 'Deal Applied' : 'No Discount'}</span>
              </div>
              <div className="border-l-2 border-blue-300 pl-3">
                <span className="text-[11px] font-black text-blue-950 uppercase block">Final Total Due</span>
                <span className="text-xl font-black font-mono text-slate-950">
                  {formatCurrency(pricing.finalTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* STEP 4: PAYMENT MODES & SPLIT COLLECTION */}
          <div className="bg-white p-5 rounded-2xl border-2 border-blue-300 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-blue-100 pb-3">
              {/* LEFT: Prominent Advance / Pending Checkbox */}
              <label className="flex items-center space-x-2.5 bg-amber-50 hover:bg-amber-100/80 border-2 border-amber-400 p-2 sm:p-2.5 rounded-xl cursor-pointer transition shadow-xs">
                <input
                  type="checkbox"
                  checked={isPending}
                  onChange={(e) => setIsPending(e.target.checked)}
                  className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                />
                <span className="text-xs font-black text-amber-950 flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Mark as Advance / Pending Payment (Tick if unpaid)</span>
                </span>
              </label>

              {/* RIGHT: Section Title and Clear */}
              <div className="flex items-center space-x-3">
                <h3 className="text-xs font-black uppercase text-blue-900 tracking-wider flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">4</span>
                  <span>Payment Modes (Cash, Card, UPI, etc.)</span>
                </h3>

                <button
                  type="button"
                  onClick={handleClearPayments}
                  className="text-xs font-black text-blue-700 hover:text-blue-950 flex items-center space-x-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Split Payment Rows for 6 Modes - Pure White Boxes with Solid Blue Fill Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PAYMENT_MODES.map((mode) => {
                const isScreenshotReq = MODES_REQUIRING_SCREENSHOT.includes(mode);
                const currentVal = payments[mode] ?? '';

                return (
                  <div
                    key={mode}
                    onClick={(e) => {
                      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
                        handleAutoFillMode(mode);
                      }
                    }}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                      Number(currentVal) > 0
                        ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-blue-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-black text-slate-950 truncate" title={mode}>
                        {mode}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleAutoFillMode(mode)}
                        className="text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded-md transition active:scale-95 shadow-xs"
                        title="Fill 100% of final total into this mode"
                      >
                        100% Fill
                      </button>
                    </div>

                    <div className="flex items-center space-x-2 bg-white border-2 border-blue-200 focus-within:border-blue-600 rounded-xl px-2.5 py-1.5">
                      <span className="text-xs font-black text-blue-600 font-mono">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={currentVal}
                        onWheel={(e) => e.target.blur()}
                        onChange={(e) => handlePaymentChange(mode, e.target.value)}
                        className="w-full bg-white font-black font-mono text-sm text-slate-950 outline-none"
                      />
                      {remainingBalance > 0 && Number(currentVal) === 0 && (
                        <button
                          type="button"
                          onClick={() => handleFillRemainder(mode)}
                          className="text-[10px] font-black text-blue-800 bg-blue-100 hover:bg-blue-200 px-1.5 py-0.5 rounded"
                          title="Fill remaining balance into this mode"
                        >
                          +Remain
                        </button>
                      )}
                    </div>

                    {isScreenshotReq && (
                      <span className="text-[10px] font-bold text-purple-700 mt-1 flex items-center space-x-1">
                        <Camera className="w-3 h-3 shrink-0" />
                        <span>Requires screenshot in closing</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Split Summary Bar */}
            <div className="p-3.5 rounded-xl bg-blue-50/80 border-2 border-blue-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-blue-950 font-bold">Total Paid: </span>
                  <span className="font-black font-mono text-slate-950 text-sm">
                    {formatCurrency(paidTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-950 font-bold">Remaining Due: </span>
                  <span className={`font-black font-mono text-sm ${remainingBalance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>
              </div>

              {/* Status Pill */}
              <div>
                {paidTotal >= pricing.finalTotal && pricing.finalTotal > 0 ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-black">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>✓ Fully Paid</span>
                  </span>
                ) : isPending ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 font-black">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Marked Advance / Pending</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-red-100 text-red-800 font-black">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Balance Unpaid ({formatCurrency(remainingBalance)})</span>
                  </span>
                )}
              </div>
            </div>

            {/* Screenshot Reminder Alert */}
            {requiresScreenshot && (
              <div className="p-3 bg-purple-50 border-2 border-purple-300 rounded-xl flex items-center space-x-2 text-xs font-bold text-purple-900">
                <Camera className="w-4 h-4 text-purple-700 shrink-0" />
                <span>
                  <strong>Reminder:</strong> This transaction includes Prepaid by District, Razorpay, or Activity Kids. Remember to attach screenshot confirmation in the daily closing report.
                </span>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t-2 border-slate-100">
            <div className="flex items-center space-x-2 text-xs">
              {!isFormValid && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <span className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 font-black">
                    Required to confirm:
                  </span>
                  {!hasValidName && <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300">Name</span>}
                  {!hasValidPhone && <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300">10-Digit Mobile</span>}
                  {!hasValidGame && <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300">Select Game</span>}
                  {!hasValidPlayers && <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300">Group Size</span>}
                  {!hasValidPayment && <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300">Payment / Mark Advance</span>}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid}
                className={`px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition flex items-center space-x-2 ${
                  isFormValid
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 active:scale-95 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
                }`}
                title={!isFormValid ? "Please fill customer name, 10-digit phone, select game, enter group size, and record payment or mark advance." : "Confirm and Save Booking"}
              >
                <span>{bookingToEdit ? 'Save Changes' : 'Confirm & Save Booking'}</span>
              </button>
            </div>
          </div>

        </form>

        {/* Complimentary Game Category Cross-Verification Modal */}
        {showComplimentaryCategoryConfirm && (
          <div className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-4 border-amber-400 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950">
                    Cross-Verify Category Bracket
                  </h3>
                  <p className="text-xs font-bold text-amber-800">
                    Complimentary Game • Kids Under 5 Years (100% OFF)
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border-2 border-amber-200 text-xs font-medium text-amber-950 space-y-1">
                <p>
                  Kids under 5 play complimentary (100% OFF) with their family or group.
                </p>
                <p className="font-bold text-slate-900">
                  Please confirm which player bracket category this group belongs to:
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                  Select Category Bracket:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '2–3 Players', label: '2–3 Players', desc: 'Small Group' },
                    { id: '4–6 Players', label: '4–6 Players', desc: 'Smart Default', badge: 'Recommended' },
                    { id: '7+ Players', label: '7+ Players', desc: 'Large Group' }
                  ].map(cat => {
                    const isSelected = categoryOverride === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryOverride(cat.id)}
                        className={`p-2.5 rounded-2xl border-2 text-center transition flex flex-col items-center justify-center relative ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-md ring-2 ring-blue-500/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {cat.badge && (
                          <span className="absolute -top-2 px-1.5 py-0.2 bg-blue-600 text-[9px] font-black text-white rounded-full">
                            {cat.badge}
                          </span>
                        )}
                        <span className="text-xs font-black block mt-0.5">{cat.label}</span>
                        <span className="text-[10px] font-bold text-slate-500">{cat.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span className="font-bold">Customer:</span>
                  <span className="font-black text-slate-950">{customerName || 'N/A'}</span>
                </div>
                {companionBooking && (
                  <div className="flex justify-between">
                    <span className="font-bold">Companion Group:</span>
                    <span className="font-black text-blue-700">{companionBooking.customerName} ({companionCategory})</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-bold">Selected Category:</span>
                  <span className="font-black text-blue-900 bg-blue-100 px-2 py-0.2 rounded font-mono">{categoryOverride || '4–6 Players'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Room:</span>
                  <span className="font-black text-slate-950">{gameName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Reference:</span>
                  <span className="font-black text-blue-800">Khaja Sir (Auto)</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Total Amount:</span>
                  <span className="font-black text-emerald-700">₹0 (100% OFF)</span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComplimentaryCategoryConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Back / Change
                </button>
                <button
                  type="button"
                  onClick={() => executeSaveBooking(categoryOverride)}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md transition active:scale-95 flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Save Game</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
