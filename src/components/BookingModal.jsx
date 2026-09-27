import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Tag,
  CreditCard,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Camera,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import {
  GAMES,
  OFFERS,
  APPROVAL_REFERENCES,
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

  // Form States
  const [date, setDate] = useState(
    bookingToEdit?.date || defaultDate || new Date().toISOString().split('T')[0]
  );

  const weekendStatus = useMemo(() => isWeekend(date), [date]);
  const availableSlots = useMemo(() => generateTimeSlots(weekendStatus), [weekendStatus]);

  const [timeSlot, setTimeSlot] = useState(
    bookingToEdit?.timeSlot || defaultSlot || availableSlots[0] || '11:00 AM'
  );

  const [gameName, setGameName] = useState(
    bookingToEdit?.gameName || GAMES[0].name
  );

  const [players, setPlayers] = useState(bookingToEdit?.players || 4);
  const [offerId, setOfferId] = useState(bookingToEdit?.offerId || 'none');
  const [reference, setReference] = useState(bookingToEdit?.reference || '');

  const [customerName, setCustomerName] = useState(bookingToEdit?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(bookingToEdit?.customerPhone || '');
  const [notes, setNotes] = useState(bookingToEdit?.notes || '');

  const [isPending, setIsPending] = useState(
    bookingToEdit?.isPending ?? (bookingToEdit?.paymentStatus === 'pending')
  );

  // Split payments state (all 6 payment modes)
  const [payments, setPayments] = useState(() => {
    if (bookingToEdit?.payments) {
      return { ...bookingToEdit.payments };
    }
    const initial = {};
    PAYMENT_MODES.forEach(m => { initial[m] = ''; });
    return initial;
  });

  // Keep timeSlot valid when date changes (e.g. from Weekday to Weekend operating hours)
  useEffect(() => {
    if (availableSlots.length > 0 && !availableSlots.includes(timeSlot)) {
      setTimeSlot(availableSlots[0]);
    }
  }, [date, availableSlots]);

  // Pricing calculations
  const pricing = useMemo(() => {
    return calculatePricing({
      date,
      players,
      offerId
    });
  }, [date, players, offerId]);

  const paidTotal = useMemo(() => getPaidTotal(payments), [payments]);
  const remainingBalance = Math.max(0, pricing.finalTotal - paidTotal);

  // Check if any payment mode requires screenshot
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

  // Quick 100% Auto Fill for a specific payment mode
  const handleAutoFillMode = (mode) => {
    const newPayments = {};
    PAYMENT_MODES.forEach(m => {
      newPayments[m] = m === mode ? pricing.finalTotal : '';
    });
    setPayments(newPayments);
    setIsPending(false);
  };

  // Quick Auto Fill Remainder for a specific payment mode
  const handleFillRemainder = (mode) => {
    if (remainingBalance <= 0) return;
    const current = Number(payments[mode]) || 0;
    setPayments(prev => ({
      ...prev,
      [mode]: current + remainingBalance
    }));
  };

  // Clear all payments
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

    // Clean up payments object to only include modes with numbers > 0
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
      reference: reference.trim(),
      payments: cleanPayments,
      isPending: isPending || (!isFullyPaid && pricing.finalTotal > 0),
      paymentStatus: (isPending || (!isFullyPaid && pricing.finalTotal > 0)) ? 'pending' : 'paid'
    };

    onSave(bookingData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-[#fffff0] w-full max-w-4xl rounded-3xl border border-amber-900/20 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-600/20 via-red-950/30 to-slate-950/40 border-b border-amber-900/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white font-black text-lg">
              ET
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                {bookingToEdit ? 'Edit Slot Booking & Payment' : 'New 15-Minute Slot Booking'}
              </h2>
              <p className="text-xs font-bold text-slate-600">
                Escape Time - Madhapur Branch • Auto-Pricing Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-950 hover:bg-slate-200/60 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900">

          {/* Section 1: Date & 12-Hour AM/PM 15-Min Slot Selector */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>1. Schedule Timing (15-Minute Slots)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date Input */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Booking Date
                </label>
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-transparent font-bold font-mono text-slate-900 outline-none w-full text-sm"
                  />
                </div>
                <span className="text-[11px] font-bold text-amber-700 mt-1 block">
                  {weekendStatus ? '⭐ Weekend Pricing & Hours (10:30 AM - 11:00 PM)' : 'Weekday Pricing & Hours (11:00 AM - 10:00 PM)'}
                </span>
              </div>

              {/* 15-Min Slot Selector */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  15-Minute Time Slot
                </label>
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5">
                  <Clock className="w-4 h-4 text-slate-500" />
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
                <span className="text-[11px] font-bold text-slate-500 mt-1 block">
                  Auto-adapts slots when date switches weekday / weekend
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Game, Players, Offer & Reference */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center space-x-1.5">
              <Tag className="w-4 h-4 text-amber-600" />
              <span>2. Game & Auto-Pricing Selection</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Game Selection */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Escape Room Game
                </label>
                <select
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-black text-slate-900 outline-none cursor-pointer"
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
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Players Count
                </label>
                <select
                  value={players}
                  onChange={(e) => setPlayers(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-black text-slate-900 outline-none cursor-pointer font-mono"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                    <option key={n} value={n}>{n} Players</option>
                  ))}
                </select>
                <span className="text-[10px] font-bold text-slate-500 mt-1 block">
                  Tier: {weekendStatus ? (players <= 3 ? '₹1099/p' : players <= 6 ? '₹999/p' : '₹899/p') : (players <= 3 ? '₹999/p' : players <= 6 ? '₹899/p' : '₹799/p')}
                </span>
              </div>

              {/* Offers & Discounts */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Offer / Discount
                </label>
                <select
                  value={offerId}
                  onChange={(e) => setOfferId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-black text-slate-900 outline-none cursor-pointer"
                >
                  {OFFERS.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Approval Reference */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Approval Reference
                </label>
                <select
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-black text-slate-900 outline-none cursor-pointer"
                >
                  <option value="">None (Standard Rate)</option>
                  {APPROVAL_REFERENCES.map(refPerson => (
                    <option key={refPerson} value={refPerson}>{refPerson}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Pricing Breakdown Card */}
            <div className="bg-[#fffff8] p-4 rounded-xl border border-amber-900/20 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">Rate / Player</span>
                <span className="text-base font-black font-mono text-slate-950">
                  {formatCurrency(pricing.ratePerPlayer)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">Base Amount</span>
                <span className="text-base font-black font-mono text-slate-950">
                  {formatCurrency(pricing.baseTotal)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">
                  Discount ({pricing.discountPercent}%)
                </span>
                <span className="text-base font-black font-mono text-emerald-700">
                  - {formatCurrency(pricing.discountAmount)}
                </span>
              </div>
              <div className="border-l border-amber-900/10 pl-3">
                <span className="text-[11px] font-black text-amber-900 uppercase block">Final Total Due</span>
                <span className="text-xl font-black font-mono text-slate-950">
                  {formatCurrency(pricing.finalTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Customer Details */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center space-x-1.5">
              <User className="w-4 h-4 text-amber-600" />
              <span>3. Customer Contact Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Customer Name *
                </label>
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5">
                  <User className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="bg-transparent font-bold text-slate-900 outline-none w-full text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Customer Phone *
                </label>
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="bg-transparent font-bold font-mono text-slate-900 outline-none w-full text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Special Notes / Tags
                </label>
                <input
                  type="text"
                  placeholder="e.g. Birthday celebration, corporate group"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Split Payments (All 6 Modes) & Screenshot Alert */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center space-x-1.5">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span>4. Payment Modes & Split Collection</span>
              </h3>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleClearPayments}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>

                <label className="flex items-center space-x-2 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200 cursor-pointer">
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

            {/* Split Payment Rows for 6 Modes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PAYMENT_MODES.map((mode) => {
                const isScreenshotReq = MODES_REQUIRING_SCREENSHOT.includes(mode);
                const currentVal = payments[mode] ?? '';

                return (
                  <div
                    key={mode}
                    className={`p-3 rounded-xl border transition-all ${
                      Number(currentVal) > 0
                        ? 'bg-amber-50/50 border-amber-400 ring-1 ring-amber-400/30'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-black text-slate-900 truncate" title={mode}>
                        {mode}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleAutoFillMode(mode)}
                        className="text-[10px] font-black text-amber-700 hover:text-amber-900 bg-amber-200/60 hover:bg-amber-300/80 px-2 py-0.5 rounded-md transition"
                        title="Fill 100% of final total into this mode"
                      >
                        100% Fill
                      </button>
                    </div>

                    <div className="flex items-center space-x-2 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs font-bold text-slate-400 font-mono">₹</span>
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
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded"
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

            {/* Split Summary Bar */}
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-slate-500 font-bold">Total Paid: </span>
                  <span className="font-black font-mono text-slate-950 text-sm">
                    {formatCurrency(paidTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Remaining Due: </span>
                  <span className={`font-black font-mono text-sm ${remainingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
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
                  <strong>Reminder:</strong> This booking includes Prepaid by District, Razorpay, or Activity Kids. Remember to attach screenshot confirmation in the daily closing report.
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
              className="px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-red-600 via-amber-600 to-amber-700 hover:from-red-700 hover:to-amber-800 text-white shadow-md shadow-red-600/25 active:scale-95 transition"
            >
              {bookingToEdit ? 'Save Changes' : 'Confirm & Save Booking'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
