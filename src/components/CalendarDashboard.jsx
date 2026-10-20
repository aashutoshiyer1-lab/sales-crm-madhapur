import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  Camera,
  Eye,
  Edit3,
  Trash2,
  Users,
  Gamepad2,
  DollarSign,
  Plus
} from 'lucide-react';
import {
  generateTimeSlots,
  isWeekend,
  parseTimeToMinutes,
  isComplimentaryBooking,
  MODES_REQUIRING_SCREENSHOT,
  GAMES
} from '../config/venueData';
import { formatCurrency, getPaidTotal } from '../utils/pricingEngine';

export default function CalendarDashboard({
  bookings,
  selectedDate,
  setSelectedDate,
  onOpenBookingModal,
  onOpenNewBooking,
  onOpenEditBooking,
  onOpenDetailModal,
  onDeleteBooking
}) {
  const [selectedGameFilter, setSelectedGameFilter] = useState('ALL');
  const [showExtendedSlots, setShowExtendedSlots] = useState(false);

  // Check if selected date is weekend
  const weekendStatus = useMemo(() => isWeekend(selectedDate), [selectedDate]);

  // Filter bookings for the selected date
  const dateBookings = useMemo(() => {
    return bookings.filter(b => b.date === selectedDate);
  }, [bookings, selectedDate]);

  // Check if any late-night booking exists on this day (past standard closing: 10 PM weekdays, 11 PM weekends)
  const hasLateNightBooking = useMemo(() => {
    const closingMinutes = weekendStatus ? (23 * 60) : (22 * 60);
    return dateBookings.some(b => {
      if (!b.timeSlot) return false;
      const mins = parseTimeToMinutes(b.timeSlot);
      return mins > closingMinutes;
    });
  }, [dateBookings, weekendStatus]);

  const shouldExpandGrid = hasLateNightBooking || showExtendedSlots;

  // Generate 15-minute time slots for this date (auto-expands to 1:00 AM if late booking exists)
  const allSlots = useMemo(() => {
    const baseSlots = generateTimeSlots(weekendStatus, shouldExpandGrid);
    // Include any custom walk-in slots that exist in dateBookings so all bookings remain clearly visible!
    const customSlots = dateBookings
      .map(b => b.timeSlot)
      .filter(s => s && !baseSlots.includes(s));
    
    const combined = Array.from(new Set([...baseSlots, ...customSlots]));
    return combined.sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
  }, [weekendStatus, shouldExpandGrid, dateBookings]);

  // Map bookings by time slot for quick lookup
  const bookingsBySlot = useMemo(() => {
    const map = {};
    dateBookings.forEach(b => {
      if (!map[b.timeSlot]) map[b.timeSlot] = [];
      map[b.timeSlot].push(b);
    });
    return map;
  }, [dateBookings]);

  // Pending entries for the dropdown jump
  const pendingEntries = useMemo(() => {
    return dateBookings.filter(b => b.isPending || b.paymentStatus === 'pending');
  }, [dateBookings]);

  // Daily Metrics Calculation with Paid vs. Complimentary Games Split
  const dailyMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalPlayers = 0;
    let paidGames = 0;
    let complimentaryGames = 0;

    dateBookings.forEach(b => {
      const paid = getPaidTotal(b.payments);
      const isComplimentary = isComplimentaryBooking(b);
      const isPending = b.isPending || b.paymentStatus === 'pending';

      // Keep complimentary games strictly excluded from revenue calculations
      if (!isComplimentary) {
        totalRevenue += paid;
      }
      totalPlayers += Number(b.players) || 0;

      if (!isPending) {
        if (isComplimentary) {
          complimentaryGames += 1;
        } else {
          paidGames += 1;
        }
      }
    });

    return {
      revenue: totalRevenue,
      players: totalPlayers,
      paidGames,
      complimentaryGames,
      totalGames: paidGames + complimentaryGames,
      totalSlotsBooked: dateBookings.length,
      pendingCount: pendingEntries.length
    };
  }, [dateBookings, pendingEntries]);

  // Date Navigation Helpers
  const handleShiftDate = (days) => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + days);
    const newDateStr = current.toISOString().split('T')[0];
    setSelectedDate(newDateStr);
  };

  const handleJumpToToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  };

  // Jump to slot card and open edit modal
  const handleJumpToPending = (booking) => {
    const el = document.getElementById(`slot-card-${booking.timeSlot.replace(/[\s:]/g, '-')}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-blue-500');
      setTimeout(() => el.classList.remove('ring-4', 'ring-blue-500'), 2000);
    }
    if (onOpenEditBooking) {
      onOpenEditBooking(booking);
    } else {
      onOpenBookingModal(booking);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Top Bar: Date Selector, Quick Jumps & Today's Pending Entries Dropdown - Crisp Blue Border */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-blue-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Date Selector in Blue Box */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-white p-1 rounded-xl border-2 border-blue-300 shadow-xs">
            <button
              onClick={() => handleShiftDate(-1)}
              className="p-2 hover:bg-blue-50 rounded-lg text-blue-800 transition active:scale-95"
              title="Previous Day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 px-3 py-1">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent font-black text-slate-900 font-mono text-sm sm:text-base outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => handleShiftDate(1)}
              className="p-2 hover:bg-white rounded-lg text-blue-800 transition active:scale-95"
              title="Next Day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleJumpToToday}
            className="px-4 py-2.5 bg-blue-600 text-white font-black text-xs sm:text-sm rounded-xl hover:bg-blue-700 transition active:scale-95 shadow-sm shadow-blue-600/20"
          >
            Today
          </button>

          <span className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border-2 ${
            weekendStatus
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : 'bg-blue-100 text-blue-900 border-blue-300'
          }`}>
            {weekendStatus ? 'Weekend (10:30 AM – 11:00 PM)' : 'Weekday (11:00 AM – 10:00 PM)'}
          </span>
        </div>

        {/* Quick Pending Jumper Dropdown & Game Filter */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Jump Pending Entries */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                const found = pendingEntries.find(p => p.id === e.target.value);
                if (found) handleJumpToPending(found);
              }}
              className="w-full sm:w-64 bg-amber-50 border-2 border-amber-400 text-amber-950 font-black text-xs sm:text-sm rounded-xl px-3 py-2.5 outline-none cursor-pointer hover:bg-amber-100/70 transition shadow-sm"
            >
              <option value="" disabled>
                ⚠️ Pending Entries ({pendingEntries.length}) - Jump & Pay
              </option>
              {pendingEntries.length === 0 ? (
                <option value="" disabled>✓ No pending entries for today</option>
              ) : (
                pendingEntries.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.timeSlot} • {p.customerName} ({p.gameName})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Filter by Game in Pure White Box */}
          <select
            value={selectedGameFilter}
            onChange={(e) => setSelectedGameFilter(e.target.value)}
            className="bg-white border-2 border-blue-300 text-blue-950 font-black text-xs sm:text-sm rounded-xl px-3 py-2.5 outline-none cursor-pointer"
          >
            <option value="ALL">All Games ({GAMES.length})</option>
            {GAMES.map(g => (
              <option key={g.id} value={g.name}>{g.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Daily Metrics Header Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Real-time Day Revenue */}
        <div className="bg-gradient-to-br from-blue-600/15 via-indigo-600/15 to-slate-950/20 p-4 sm:p-5 rounded-2xl border-2 border-blue-300 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase text-blue-900 tracking-wider">Day Revenue</p>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-950 font-mono mt-1">
            {formatCurrency(dailyMetrics.revenue)}
          </p>
          <p className="text-[11px] font-bold text-blue-700 mt-1">
            Excludes complimentary & pending
          </p>
        </div>

        {/* Total Players Count */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-blue-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase text-blue-900 tracking-wider">Total Players</p>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-950 font-mono mt-1">
            {dailyMetrics.players}
          </p>
          <p className="text-[11px] font-bold text-slate-500 mt-1">
            Total participants booked
          </p>
        </div>

        {/* Confirmed Games */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-blue-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase text-blue-900 tracking-wider">Confirmed Games</p>
            <Gamepad2 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-950 font-mono mt-1">
            {dailyMetrics.paidGames} <span className="text-base sm:text-lg text-blue-700 font-bold">(+{dailyMetrics.complimentaryGames} Compl.)</span>
          </p>
          <p className="text-[11px] font-bold text-slate-500 mt-1">
            Total: {dailyMetrics.paidGames + dailyMetrics.complimentaryGames} games ({dailyMetrics.paidGames} paid + {dailyMetrics.complimentaryGames} complimentary)
          </p>
        </div>

        {/* Pending Actions */}
        <div className={`p-4 sm:p-5 rounded-2xl border-2 shadow-sm ${
          dailyMetrics.pendingCount > 0
            ? 'bg-red-50 border-red-300 text-red-950'
            : 'bg-emerald-50 border-emerald-300 text-emerald-950'
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider">Pending Entries</p>
            <AlertCircle className={`w-5 h-5 ${dailyMetrics.pendingCount > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono mt-1">
            {dailyMetrics.pendingCount}
          </p>
          <p className="text-[11px] font-bold mt-1 opacity-80">
            {dailyMetrics.pendingCount > 0 ? 'Payment collection required' : 'All transactions cleared'}
          </p>
        </div>
      </div>

      {/* Responsive 15-Minute Slot Grid */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>15-Minute Schedule Intervals (12-Hour Format)</span>
            <span className="text-xs font-black text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full font-mono ml-2">
              {allSlots.length} slots
            </span>
          </h2>
          <button
            type="button"
            onClick={() => setShowExtendedSlots(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition flex items-center space-x-1.5 ${
              shouldExpandGrid
                ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                : 'bg-white text-blue-900 border-blue-300 hover:bg-blue-50'
            }`}
          >
            <span>🌙 {shouldExpandGrid ? 'Late Night Grid (Till 1 AM Active)' : 'Show Late Night Slots (Till 1 AM)'}</span>
            {hasLateNightBooking && (
              <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 text-[10px] rounded-full font-black">
                Late Booking Active
              </span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {allSlots.map((slot) => {
            const slotBookings = bookingsBySlot[slot] || [];
            const filteredBookings = selectedGameFilter === 'ALL'
              ? slotBookings
              : slotBookings.filter(b => b.gameName === selectedGameFilter);

            const hasBooking = filteredBookings.length > 0;
            const slotDomId = `slot-card-${slot.replace(/[\s:]/g, '-')}`;

            return (
              <div
                key={slot}
                id={slotDomId}
                className={`rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between ${
                  hasBooking
                    ? 'bg-white border-blue-400 shadow-md ring-1 ring-blue-400/20'
                    : 'bg-blue-50/20 border-dashed border-blue-200 hover:border-blue-500 hover:bg-blue-50/50'
                }`}
              >
                {/* Slot Card Header */}
                <div className={`p-3.5 sm:p-4 border-b-2 flex items-center justify-between rounded-t-2xl ${
                  hasBooking ? 'bg-blue-50 border-blue-200' : 'bg-blue-50/40 border-blue-100'
                }`}>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                    <span className="text-slate-950 font-black font-mono text-sm sm:text-base tracking-tight">
                      {slot}
                    </span>
                  </div>

                  {hasBooking ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-950 text-white">
                      {filteredBookings.length} {filteredBookings.length > 1 ? 'Bookings' : 'Booked'}
                    </span>
                  ) : (
                    <button
                      onClick={() => (onOpenNewBooking ? onOpenNewBooking({ date: selectedDate, timeSlot: slot }) : onOpenBookingModal({ date: selectedDate, timeSlot: slot }))}
                      className="flex items-center space-x-1 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg transition active:scale-95 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Book</span>
                    </button>
                  )}
                </div>

                {/* Slot Card Body */}
                <div className="p-4 flex-1 space-y-3">
                  {!hasBooking ? (
                    <div
                      onClick={() => (onOpenNewBooking ? onOpenNewBooking({ date: selectedDate, timeSlot: slot }) : onOpenBookingModal({ date: selectedDate, timeSlot: slot }))}
                      className="py-6 flex flex-col items-center justify-center cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition mb-2">
                        <Plus className="w-5 h-5 text-blue-600 transition" />
                      </div>
                      <p className="text-xs font-bold text-blue-900 group-hover:text-blue-950 transition">
                        Available Slot
                      </p>
                      <p className="text-[11px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition mt-0.5">
                        Click to book 15m slot
                      </p>
                    </div>
                  ) : (
                    filteredBookings.map((booking) => {
                      const requiresScreenshot = Object.keys(booking.payments || {}).some(
                        mode => MODES_REQUIRING_SCREENSHOT.includes(mode) && Number(booking.payments[mode]) > 0
                      );
                      const paidTotal = getPaidTotal(booking.payments);
                      const isPending = booking.isPending || booking.paymentStatus === 'pending';

                      return (
                        <div
                          key={booking.id}
                          className="p-3.5 rounded-xl bg-white border-2 border-blue-100 space-y-2.5 shadow-xs hover:border-blue-300 transition"
                        >
                          {/* Game Name & Player Count */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-black text-slate-950 leading-snug">
                                {booking.gameName}
                              </h3>
                              <p className="text-xs font-bold text-slate-500">
                                60 Mins • <span className="font-mono text-blue-900 font-black">{booking.players} Players</span>
                              </p>
                            </div>
                            <span className="text-xs font-mono font-black text-blue-950 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                              {formatCurrency(booking.finalTotal || paidTotal)}
                            </span>
                          </div>

                          {/* Customer Details */}
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center space-x-1.5 text-slate-900 font-black">
                              <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate">{booking.customerName}</span>
                            </div>
                            {booking.customerPhone && (
                              <div className="flex items-center space-x-1.5 text-slate-600 font-mono text-[11px] font-bold">
                                <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span>{booking.customerPhone}</span>
                              </div>
                            )}
                          </div>

                          {/* Offer, Custom Reason & Reference Badges */}
                          <div className="flex flex-wrap gap-1">
                            {booking.offerName && booking.offerId !== 'none' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                {booking.offerName}
                              </span>
                            )}
                            {(booking.customDiscountReason || booking.customNote) && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 italic">
                                📝 Note: {booking.customDiscountReason || booking.customNote}
                              </span>
                            )}
                            {booking.reference && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300">
                                Ref: {booking.reference}
                              </span>
                            )}
                          </div>

                          {booking.notes && (
                            <p className="text-[10px] text-slate-500 italic">
                              "{booking.notes}"
                            </p>
                          )}

                          {/* Payment Status & Breakdown */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            {isPending ? (
                              <span className="flex items-center space-x-1 font-black text-red-600 bg-red-100 px-2 py-0.5 rounded">
                                <AlertCircle className="w-3 h-3" />
                                <span>Pending Payment</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-1 font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Paid: {formatCurrency(paidTotal)}</span>
                              </span>
                            )}
                          </div>

                          {/* Screenshot Reminder Badge */}
                          {requiresScreenshot && (
                            <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-black">
                              <Camera className="w-3 h-3 text-purple-700 shrink-0" />
                              <span className="leading-tight">
                                📷 Attach screenshot in closing
                              </span>
                            </div>
                          )}

                          {/* Slot Card Action Buttons */}
                          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => onOpenDetailModal(booking)}
                              title="View Printable Receipt"
                              className="p-1.5 rounded-lg text-blue-700 hover:text-blue-950 hover:bg-blue-50 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => (onOpenEditBooking ? onOpenEditBooking(booking) : onOpenBookingModal(booking))}
                              title="Edit / Update Payment"
                              className="p-1.5 rounded-lg text-amber-700 hover:text-amber-950 hover:bg-amber-100 transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteBooking(booking.id)}
                              title="Delete Booking"
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
