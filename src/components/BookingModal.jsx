import React, { useState, useEffect, useMemo } from 'react';
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
  UserCheck
} from 'lucide-react';
import {
  GAMES,
  OFFERS,
  PAYMENT_MODES,
  MODES_REQUIRING_SCREENSHOT,
  generateTimeSlots,
  isWeekend
} from '../config/venueData';
import { calculatePricing, formatCurrency, getPaidTotal } from '../utils/pricingEngine';

export default function BookingModal({
  isOpen,
  onClose,
  onSave,
  bookingToEdit,
  defaultDate,
  defaultSlot
}) {
  if (!isOpen) return null;

  // 1. Customer Details (comes first)
  const [customerName, setCustomerName] = useState(bookingToEdit?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(bookingToEdit?.customerPhone || '');
  const [notes, setNotes] = useState(bookingToEdit?.notes || '');

  // 2. Schedule Timing (Date & 12-Hour 15-Min Slot)
  const [date, setDate] = useState(
    bookingToEdit?.date || defaultDate || new Date().toISOString().split('T')[0]
  );

  const weekendStatus = useMemo(() => isWeekend(date), [date]);
  const availableSlots = useMemo(() => generateTimeSlots(weekendStatus), [weekendStatus]);

  const [timeSlot, setTimeSlot] = useState(
    bookingToEdit?.timeSlot || defaultSlot || availableSlots[0] || '11:00 AM'
  );

  // 3. Game & Pricing Selection
  const [gameName, setGameName] = useState(
    bookingToEdit?.gameName || GAMES[0].name
  );
  const [players, setPlayers] = useState(bookingToEdit?.players || 4);
  const [offerId, setOfferId] = useState(bookingToEdit?.offerId || 'none');

  // Approval Reference (Only Khaja Sir or Custom Name)
  const initialRef = bookingToEdit?.reference || '';
  const isInitialKhaja = initialRef === 'Khaja Sir';
  const [refType, setRefType] = useState(() => {
    if (!initialRef) return 'none';
    if (isInitialKhaja) return 'Khaja Sir';
    return 'custom';
  });
  const [customRefName, setCustomRefName] = useState(() => {
    return isInitialKhaja ? '' : initialRef;
  });

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

  // Sync timeSlot if available slots change
  useEffect(() => {
    if (availableSlots.length > 0 && !availableSlots.includes(timeSlot)) {
      setTimeSlot(availableSlots[0]);
    }
  }, [date, availableSlots]);

  // Pricing calculation
  const pricing = useMemo(() => {
    return calculatePricing({
      date,
      players,
      offerId
    });
  }, [date, players, offerId]);

  const paidTotal = useMemo(() => getPaidTotal(payments), [payments]);
  const remainingBalance = Math.max(0, pricing.finalTotal - paidTotal);

  // Check screenshot requirement
  const requiresScreenshot = useMemo(() => {
    return Object.keys(payments).some(
      mode => MODES_REQUIRING_SCREENSHOT.includes(mode) && Number(payments[mode]) > 0
    );
  }, [payments]);

  // Handle Split Payment input
  const handlePaymentChange = (mode, val) => {
    const numVal = val === '' ? '' : Math.max(0, Number(val));
    setPayments(prev => ({
      ...prev,
      [mode]: numVal
    }));
  };

  // Quick 100% Auto Fill
  const handleAutoFillMode = (mode) => {
    const newPayments = {};
    PAYMENT_MODES.forEach(m => {
      newPayments[m] = m === mode ? pricing.finalTotal : '';
    });
    setPayments(newPayments);
    setIsPending(false);
  };

  // Quick Fill Remainder
  const handleFillRemainder = (mode) => {
    if (remainingBalance <= 0) return;
    const current = Number(payments[mode]) || 0;
    setPayments(prev => ({
      ...prev,
      [mode]: current + remainingBalance
    }));
  };

  // Clear payments
  const handleClearPayments = () => {
    const empty = {};
    PAYMENT_MODES.forEach(m => { empty[m] = ''; });
    setPayments(empty);
  };

  // Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert("Please enter customer name.");
      return;
    }

    const selectedOfferObj = OFFERS.find(o => o.id === offerId);

    // Compute final reference value
    let finalReference = '';
    if (refType === 'Khaja Sir') {
      finalReference = 'Khaja Sir';
    } else if (refType === 'custom') {
      finalReference = customRefName.trim();
    }

    const cleanPayments = {};
    PAYMENT_MODES.forEach(m => {
      const val = Number(payments[m]) || 0;
      if (val > 0) cleanPayments[m] = val;
    });

    const isFullyPaid = paidTotal >= pricing.finalTotal;

    const bookingData = {
      id: bookingToEdit?.id || `ETM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: bookingToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date,
      timeSlot,
      gameName,
      players: Number(players),
      ratePerPlayer: pricing.ratePerPlayer,
      baseTotal: pricing.baseTotal,
      offerId,
      offerName: selectedOfferObj ? selectedOfferObj.name : 'None',
      discountPercent: pricing.discountPercent,
      discountAmount: pricing.discountAmount,
      finalTotal: pricing.finalTotal,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      notes: notes.trim(),
      reference: finalReference,
      payments: cleanPayments,
      isPending: isPending || (!isFullyPaid && pricing.finalTotal > 0),
      paymentStatus: (isPending || (!isFullyPaid && pricing.finalTotal > 0)) ? 'pending' : 'paid'
    };

    onSave(bookingData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-[#fffff0] w-full max-w-4xl rounded-3xl border border-blue-900/20 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Modal Header with vibrant Blue / Amber gradient */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-blue-900 to-slate-950 text-white border-b border-blue-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white text-blue-950 flex items-center justify-center font-black text-lg shadow-md">
              ET
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {bookingToEdit ? 'Edit Slot Booking & Payment' : 'New 15-Minute Slot Booking'}
              </h2>
              <p className="text-xs font-bold text-blue-200">
                Escape Time - Madhapur Branch • Auto-Pricing Engine
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

        {/* Modal Body - Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900">

          {/* STEP 1: CUSTOMER CONTACT INFORMATION (FIRST) - Vivid Blue Theme */}
          <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
              <h3 className="text-xs font-black uppercase text-blue-800 tracking-wider flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">1</span>
                <span>Customer Contact Information</span>
              </h3>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Primary Details
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Customer Name */}
              <div>
                <label className="block text-xs font-black text-blue-950 mb-1">
                  Customer Name *
                </label>
                <div className="flex items-center space-x-2 bg-blue-50/50 border-2 border-blue-200 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 rounded-xl px-3 py-2.5 transition">
                  <User className="w-4 h-4 text-blue-600" />
                  <input
                    type="text"
                    required
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="bg-transparent font-black text-slate-900 outline-none w-full text-sm placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Customer Phone */}
              <div>
                <label className="block text-xs font-black text-blue-950 mb-1">
                  Phone Number *
                </label>
                <div className="flex items-center space-x-2 bg-blue-50/50 border-2 border-blue-200 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 rounded-xl px-3 py-2.5 transition">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="bg-transparent font-black font-mono text-slate-900 outline-none w-full text-sm placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-black text-blue-950 mb-1">
                  Booking Notes / Tags
                </label>
                <div className="flex items-center space-x-2 bg-blue-50/50 border-2 border-blue-200 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 rounded-xl px-3 py-2.5 transition">
                  <input
                    type="text"
                    placeholder="e.g. Birthday, corporate group"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-transparent font-bold text-slate-900 outline-none w-full text-sm placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: BOOKING DATE & 15-MINUTE TIME SLOT - Vivid Blue Theme */}
          <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
              <h3 className="text-xs font-black uppercase text-blue-800 tracking-wider flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">2</span>
                <span>Date & 15-Minute Slot Time</span>
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                weekendStatus
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-blue-100 text-blue-900 border-blue-300'
              }`}>
                {weekendStatus ? 'Weekend Hours (10:30 AM – 11:00 PM)' : 'Weekday Hours (11:00 AM – 10:00 PM)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date Input */}
              <div>
                <label className="block text-xs font-black text-blue-950 mb-1">
                  Which Date is Customer Booking?
                </label>
                <div className="flex items-center space-x-2 bg-blue-50/50 border-2 border-blue-200 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 rounded-xl px-3 py-2.5 transition">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-transparent font-black font-mono text-slate-900 outline-none w-full text-sm cursor-pointer"
                  />
                </div>
              </div>

              {/* Time Slot (12-Hour AM/PM) */}
              <div>
                <label className="block text-xs font-black text-blue-950 mb-1">
                  15-Minute Time Slot (12-Hour Format)
                </label>
                <div className="flex items-center space-x-2 bg-blue-50/50 border-2 border-blue-200 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 rounded-xl px-3 py-2.5 transition">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="bg-transparent font-black font-mono text-slate-950 outline-none w-full text-sm cursor-pointer"
                  >
                    {availableSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
                <span className="text-[11px] font-bold text-blue-600 mt-1 block">
                  12-hour AM/PM format matching schedule calendar
                </span>
              </div>
            </div>
          </div>

          {/* STEP 3: GAME, PLAYERS, OFFERS & REFERENCES - Vivid Blue Theme */}
          <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
              <h3 className="text-xs font-black uppercase text-blue-800 tracking-wider flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">3</span>
                <span>Game, Players, Offers & References</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Game Selection */}
              <div>
                <label className="block text-xs font-black text-blue-950 mb-1">
                  Escape Room Game
                </label>
                <select
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className="w-full bg-blue-50/50 border-2 border-blue-200 focus:border-blue-600 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-black text-slate-900 outline-none cursor-pointer"
                >
                  {GAMES.map(g => (
                    <option key={g.id} value={g.name}>
                      {g.name} (60m)
                    </option>
                  ))}
                </select>
              </div>

              {/* Number of Players */}
              <div>
                <label className="block text-xs font-black text-blue-950 mb-1">
                  Number of Players
                </label>
                <select
                  value={players}
                  onChange={(e) => setPlayers(Number(e.target.value))}
                  className="w-full bg-blue-50/50 border-2 border-blue-200 focus:border-blue-600 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-black text-slate-900 outline-none cursor-pointer font-mono"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                    <option key={n} value={n}>{n} Players</option>
                  ))}
                </select>
                <span className="text-[11px] font-black text-blue-700 mt-1 block">
                  Tier: {weekendStatus ? (players <= 3 ? '₹1099/p' : players <= 6 ? '₹999/p' : '₹899/p') : (players <= 3 ? '₹999/p' : players <= 6 ? '₹899/p' : '₹799/p')}
                </span>
              </div>

              {/* Offers & Discounts */}
              <div>
                <label className="block text-xs font-black text-blue-950 mb-1">
                  Offer / Discount
                </label>
                <select
                  value={offerId}
                  onChange={(e) => setOfferId(e.target.value)}
                  className="w-full bg-blue-50/50 border-2 border-blue-200 focus:border-blue-600 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-black text-slate-900 outline-none cursor-pointer"
                >
                  {OFFERS.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Approval Reference (Only Khaja Sir or Custom) */}
              <div>
                <label className="block text-xs font-black text-blue-950 mb-1">
                  Approval Reference
                </label>
                <select
                  value={refType}
                  onChange={(e) => {
                    setRefType(e.target.value);
                    if (e.target.value !== 'custom') {
                      setCustomRefName('');
                    }
                  }}
                  className="w-full bg-blue-50/50 border-2 border-blue-200 focus:border-blue-600 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-black text-slate-900 outline-none cursor-pointer"
                >
                  <option value="none">None (Standard Rate)</option>
                  <option value="Khaja Sir">Khaja Sir</option>
                  <option value="custom">+ Specific / Other Custom Name</option>
                </select>
              </div>
            </div>

            {/* Custom Reference Name Input if selected */}
            {refType === 'custom' && (
              <div className="p-3 bg-blue-100/60 rounded-xl border border-blue-300 animate-fadeIn">
                <label className="block text-xs font-black text-blue-950 mb-1">
                  Enter Specific Reference Name:
                </label>
                <div className="flex items-center space-x-2 bg-white border-2 border-blue-400 rounded-lg px-3 py-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <input
                    type="text"
                    required
                    placeholder="Type person's name or reference..."
                    value={customRefName}
                    onChange={(e) => setCustomRefName(e.target.value)}
                    className="bg-transparent font-black text-slate-900 text-xs sm:text-sm outline-none w-full"
                  />
                </div>
              </div>
            )}

            {/* Live Pricing Breakdown Card - Blue Theme */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/80 p-4 rounded-xl border-2 border-blue-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[11px] font-bold text-blue-800 block">Rate / Player</span>
                <span className="text-base font-black font-mono text-blue-950">
                  {formatCurrency(pricing.ratePerPlayer)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-blue-800 block">Base Amount</span>
                <span className="text-base font-black font-mono text-blue-950">
                  {formatCurrency(pricing.baseTotal)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-blue-800 block">
                  Discount ({pricing.discountPercent}%)
                </span>
                <span className="text-base font-black font-mono text-emerald-700">
                  - {formatCurrency(pricing.discountAmount)}
                </span>
              </div>
              <div className="border-l border-blue-200 pl-3">
                <span className="text-[11px] font-black text-blue-900 uppercase block">Final Total Due</span>
                <span className="text-xl font-black font-mono text-slate-950">
                  {formatCurrency(pricing.finalTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* STEP 4: PAYMENT MODES & SPLIT COLLECTION - Vivid Blue Theme */}
          <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-blue-100 pb-2.5">
              <h3 className="text-xs font-black uppercase text-blue-800 tracking-wider flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">4</span>
                <span>Payment Modes (Cash, Card, UPI, District, Razorpay, Kids)</span>
              </h3>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleClearPayments}
                  className="text-xs font-bold text-blue-700 hover:text-blue-950 flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>

                <label className="flex items-center space-x-2 bg-amber-50 px-3 py-1 rounded-lg border border-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPending}
                    onChange={(e) => setIsPending(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  <span className="text-xs font-black text-amber-900">
                    Mark as Advance / Pending Payment
                  </span>
                </label>
              </div>
            </div>

            {/* Split Payment Rows for 6 Modes - Clean Blue Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PAYMENT_MODES.map((mode) => {
                const isScreenshotReq = MODES_REQUIRING_SCREENSHOT.includes(mode);
                const currentVal = payments[mode] ?? '';

                return (
                  <div
                    key={mode}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      Number(currentVal) > 0
                        ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-blue-50/20 border-blue-100 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-black text-slate-900 truncate" title={mode}>
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

                    <div className="flex items-center space-x-2 bg-white border-2 border-blue-200 focus-within:border-blue-600 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs font-bold text-blue-600 font-mono">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={currentVal}
                        onChange={(e) => handlePaymentChange(mode, e.target.value)}
                        className="w-full bg-transparent font-black font-mono text-sm text-slate-950 outline-none"
                      />
                      {remainingBalance > 0 && Number(currentVal) === 0 && (
                        <button
                          type="button"
                          onClick={() => handleFillRemainder(mode)}
                          className="text-[10px] font-black text-blue-700 bg-blue-100 hover:bg-blue-200 px-1.5 py-0.5 rounded"
                          title="Fill remaining balance into this mode"
                        >
                          +Remain
                        </button>
                      )}
                    </div>

                    {isScreenshotReq && (
                      <span className="text-[10px] font-bold text-purple-700 mt-1 flex items-center space-x-1">
                        <Camera className="w-3 h-3" />
                        <span>Requires screenshot in closing</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Split Summary Bar - Crisp Blue */}
            <div className="p-3.5 rounded-xl bg-blue-50 border-2 border-blue-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-blue-900 font-bold">Total Paid: </span>
                  <span className="font-black font-mono text-slate-950 text-sm">
                    {formatCurrency(paidTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-900 font-bold">Remaining Due: </span>
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
              <div className="p-3 bg-purple-50 border border-purple-300 rounded-xl flex items-center space-x-2 text-xs font-bold text-purple-900">
                <Camera className="w-4 h-4 text-purple-700 shrink-0" />
                <span>
                  <strong>Reminder:</strong> This transaction includes Prepaid by District, Razorpay, or Activity Kids. Remember to attach screenshot confirmation in the daily closing report.
                </span>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 hover:bg-slate-200/60 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 active:scale-95 transition"
            >
              {bookingToEdit ? 'Save Changes' : 'Confirm & Save Booking'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
