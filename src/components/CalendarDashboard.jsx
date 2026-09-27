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
  MODES_REQUIRING_SCREENSHOT,
  GAMES
} from '../config/venueData';
import { formatCurrency, getPaidTotal } from '../utils/pricingEngine';

export default function CalendarDashboard({
  bookings,
  selectedDate,
  setSelectedDate,
  onOpenBookingModal,
  onOpenDetailModal,
  onDeleteBooking
}) {
  const [selectedGameFilter, setSelectedGameFilter] = useState('ALL');

  // Check if selected date is weekend
  const weekendStatus = useMemo(() => isWeekend(selectedDate), [selectedDate]);

  // Generate 15-minute time slots for this date based on operating hours
  const allSlots = useMemo(() => generateTimeSlots(weekendStatus), [weekendStatus]);

  // Filter bookings for the selected date
  const dateBookings = useMemo(() => {
    return bookings.filter(b => b.date === selectedDate);
  }, [bookings, selectedDate]);

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

  // Daily Metrics Calculation
  const dailyMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalPlayers = 0;
    let confirmedGames = 0;

    dateBookings.forEach(b => {
      // Exclude complimentary (100% off) & pending from revenue metrics
      const paid = getPaidTotal(b.payments);
      totalRevenue += paid;
      totalPlayers += Number(b.players) || 0;
      if (!b.isPending && b.paymentStatus !== 'pending' && b.offerId !== 'complimentary') {
        confirmedGames += 1;
      }
    });

    return {
      revenue: totalRevenue,
      players: totalPlayers,
      games: confirmedGames,
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
      el.classList.add('ring-4', 'ring-amber-500');
      setTimeout(() => el.classList.remove('ring-4', 'ring-amber-500'), 2000);
    }
    onOpenBookingModal(booking);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Top Bar: Date Selector, Quick Jumps & Today's Pending Entries Dropdown */}
      <div className="bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-amber-900/10 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Date Selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => handleShiftDate(-1)}
              className="p-2 hover:bg-white rounded-lg text-slate-700 transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 px-3 py-1">
              <CalendarIcon className="w-4 h-4 text-amber-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent font-black text-slate-900 font-mono text-sm sm:text-base outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => handleShiftDate(1)}
              className="p-2 hover:bg-white rounded-lg text-slate-700 transition"
              title="Next Day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleJumpToToday}
            className="px-3.5 py-2 bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-slate-800 transition active:scale-95"
          >
            Today
          </button>

          <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border ${
            weekendStatus
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : 'bg-slate-100 text-slate-800 border-slate-200'
          }`}>
            {weekendStatus ? 'Weekend (10:30 AM - 11:00 PM)' : 'Weekday (11:00 AM - 10:00 PM)'}
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

          {/* Filter by Game */}
          <select
            value={selectedGameFilter}
            onChange={(e) => setSelectedGameFilter(e.target.value)}
            className="bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-xl px-3 py-2.5 outline-none"
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
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-600/15 to-red-950/20 p-4 sm:p-5 rounded-2xl border border-amber-600/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase text-amber-900 tracking-wider">Day Revenue</p>
            <DollarSign className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-950 font-mono mt-1">
            {formatCurrency(dailyMetrics.revenue)}
          </p>
          <p className="text-[11px] font-bold text-slate-500 mt-1">
            Excludes complimentary & pending
          </p>
        </div>

        {/* Total Players Count */}
        <div className="bg-white/80 p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase text-slate-600 tracking-wider">Total Players</p>
            <Users className="w-5 h-5 text-slate-700" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-950 font-mono mt-1">
            {dailyMetrics.players}
          </p>
          <p className="text-[11px] font-bold text-slate-500 mt-1">
            Total participants booked
          </p>
        </div>

        {/* Confirmed Games */}
        <div className="bg-white/80 p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase text-slate-600 tracking-wider">Confirmed Games</p>
            <Gamepad2 className="w-5 h-5 text-slate-700" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-950 font-mono mt-1">
            {dailyMetrics.games}
          </p>
          <p className="text-[11px] font-bold text-slate-500 mt-1">
            Completed / Paid sessions
          </p>
        </div>

        {/* Pending Actions */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${
          dailyMetrics.pendingCount > 0
            ? 'bg-red-50 border-red-200 text-red-950'
            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight flex items-center space-x-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span>15-Minute Schedule Intervals</span>
            <span className="text-xs font-bold text-slate-500 font-mono ml-2">
              ({allSlots.length} slots)
            </span>
          </h2>
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
                className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  hasBooking
                    ? 'bg-white border-amber-900/20 shadow-md ring-1 ring-amber-900/5'
                    : 'bg-white/50 border-dashed border-slate-300 hover:border-amber-500 hover:bg-white/80'
                }`}
              >
                {/* Slot Card Header */}
                <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-950 inline-block"></span>
                    <span className="text-slate-950 font-black font-mono text-sm sm:text-base tracking-tight">
                      {slot}
                    </span>
                  </div>

                  {hasBooking ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-950 text-white">
                      {filteredBookings.length} {filteredBookings.length > 1 ? 'Bookings' : 'Booked'}
                    </span>
                  ) : (
                    <button
                      onClick={() => onOpenBookingModal({ date: selectedDate, timeSlot: slot })}
                      className="flex items-center space-x-1 text-xs font-black text-amber-700 hover:text-amber-900 bg-amber-100/70 hover:bg-amber-200/70 px-2.5 py-1 rounded-lg transition active:scale-95"
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
                      onClick={() => onOpenBookingModal({ date: selectedDate, timeSlot: slot })}
                      className="py-6 flex flex-col items-center justify-center cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-amber-100 flex items-center justify-center transition mb-2">
                        <Plus className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition" />
                      </div>
                      <p className="text-xs font-bold text-slate-400 group-hover:text-slate-700 transition">
                        Available Slot
                      </p>
                      <p className="text-[11px] font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition mt-0.5">
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
                          className="p-3.5 rounded-xl bg-[#fffff8] border border-amber-900/10 space-y-2.5 shadow-sm hover:shadow transition"
                        >
                          {/* Game Name & Player Count */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-black text-slate-950 leading-snug">
                                {booking.gameName}
                              </h3>
                              <p className="text-xs font-bold text-slate-500">
                                60 Mins • <span className="font-mono text-slate-800">{booking.players} Players</span>
                              </p>
                            </div>
                            <span className="text-xs font-mono font-black text-slate-950 bg-slate-200 px-2 py-0.5 rounded-md">
                              {formatCurrency(booking.finalTotal || paidTotal)}
                            </span>
                          </div>

                          {/* Customer Details */}
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
                              <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="truncate">{booking.customerName}</span>
                            </div>
                            {booking.customerPhone && (
                              <div className="flex items-center space-x-1.5 text-slate-600 font-mono text-[11px]">
                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{booking.customerPhone}</span>
                              </div>
                            )}
                          </div>

                          {/* Offer & Reference Badges */}
                          <div className="flex flex-wrap gap-1">
                            {booking.offerName && booking.offerId !== 'none' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                {booking.offerName}
                              </span>
                            )}
                            {booking.reference && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300">
                                Ref: {booking.reference}
                              </span>
                            )}
                          </div>

                          {/* Payment Status & Breakdown */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            {isPending ? (
                              <span className="flex items-center space-x-1 font-black text-red-600 bg-red-100/70 px-2 py-0.5 rounded">
                                <AlertCircle className="w-3 h-3" />
                                <span>Pending Payment</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-1 font-black text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
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
                              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onOpenBookingModal(booking)}
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
