import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Copy,
  Check,
  Calendar,
  Filter,
  Camera,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Users,
  Gamepad2,
  FileSpreadsheet,
  Eye,
  Edit3,
  Trash2,
  Clock
} from 'lucide-react';
import {
  PAYMENT_MODES,
  MODES_REQUIRING_SCREENSHOT,
  parseTimeToMinutes,
  formatTime24h,
  BRANCH_INFO
} from '../config/venueData';
import { formatCurrency, getPaidTotal } from '../utils/pricingEngine';

export default function SalesDashboard({
  bookings,
  onOpenBookingModal,
  onOpenDetailModal,
  onDeleteBooking
}) {
  const [dateFilter, setDateFilter] = useState('Today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('ALL');
  const [copiedStatus, setCopiedStatus] = useState(false);

  // Helper date getters
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter bookings based on Date Range
  const filteredByDate = useMemo(() => {
    const now = new Date();
    return bookings.filter(b => {
      if (!b.date) return false;

      if (dateFilter === 'Today') {
        return b.date === todayStr;
      }
      if (dateFilter === 'Yesterday') {
        return b.date === yesterdayStr;
      }
      if (dateFilter === 'Pending Only') {
        return b.isPending || b.paymentStatus === 'pending';
      }
      if (dateFilter === 'This Week') {
        const bDate = new Date(b.date + 'T00:00:00');
        const dayOfWeek = now.getDay() || 7; // Monday = 1
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        return bDate >= startOfWeek;
      }
      if (dateFilter === 'This Month') {
        const currentMonth = todayStr.substring(0, 7);
        return b.date.startsWith(currentMonth);
      }
      if (dateFilter === 'Custom Date Range') {
        if (customStartDate && b.date < customStartDate) return false;
        if (customEndDate && b.date > customEndDate) return false;
        return true;
      }
      return true; // 'All Time'
    });
  }, [bookings, dateFilter, todayStr, yesterdayStr, customStartDate, customEndDate]);

  // Search & Payment Mode Filter
  const searchedAndFiltered = useMemo(() => {
    let result = filteredByDate;

    // Search query: Customer Name, Phone, Game Name, Reference Person
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(b =>
        (b.customerName && b.customerName.toLowerCase().includes(q)) ||
        (b.customerPhone && b.customerPhone.includes(q)) ||
        (b.gameName && b.gameName.toLowerCase().includes(q)) ||
        (b.reference && b.reference.toLowerCase().includes(q)) ||
        (b.timeSlot && b.timeSlot.toLowerCase().includes(q)) ||
        (formatTime24h(b.timeSlot).includes(q))
      );
    }

    // Payment Mode Filter
    if (selectedPaymentMode !== 'ALL') {
      result = result.filter(b => {
        const amount = Number(b.payments?.[selectedPaymentMode]) || 0;
        return amount > 0;
      });
    }

    // Exact Chronological Sorting:
    // Date ascending, followed by Time Slot ascending (11:00 AM down to night slots)
    return [...result].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      const timeA = parseTimeToMinutes(a.timeSlot);
      const timeB = parseTimeToMinutes(b.timeSlot);
      return timeA - timeB;
    });
  }, [filteredByDate, searchQuery, selectedPaymentMode]);

  // Aggregate Metrics for current filtered set
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalPlayers = 0;
    let totalGames = 0;
    let pendingCount = 0;
    let pendingAmount = 0;

    const modeTotals = {};
    PAYMENT_MODES.forEach(m => { modeTotals[m] = 0; });

    searchedAndFiltered.forEach(b => {
      const paid = getPaidTotal(b.payments);
      totalRevenue += paid;
      totalPlayers += Number(b.players) || 0;

      if (b.isPending || b.paymentStatus === 'pending') {
        pendingCount += 1;
        pendingAmount += Math.max(0, (Number(b.finalTotal) || 0) - paid);
      } else {
        totalGames += 1;
      }

      if (b.payments) {
        Object.entries(b.payments).forEach(([mode, val]) => {
          if (modeTotals[mode] !== undefined) {
            modeTotals[mode] += Number(val) || 0;
          }
        });
      }
    });

    return {
      totalRevenue,
      totalPlayers,
      totalGames,
      pendingCount,
      pendingAmount,
      modeTotals
    };
  }, [searchedAndFiltered]);

  // Copy Sales Data to Clipboard with 24-HOUR FORMAT
  const handleCopySalesData = () => {
    if (searchedAndFiltered.length === 0) return;

    const lines = [];
    lines.push(`=====================================================`);
    lines.push(`SALES REPORT (24H TIME): ${BRANCH_INFO.name}`);
    lines.push(`Filter: ${dateFilter} | Total Records: ${searchedAndFiltered.length}`);
    lines.push(`Total Net Revenue: ${formatCurrency(metrics.totalRevenue)}`);
    lines.push(`Total Players: ${metrics.totalPlayers} | Confirmed Games: ${metrics.totalGames}`);
    lines.push(`=====================================================`);
    lines.push(``);

    searchedAndFiltered.forEach((b, idx) => {
      const paid = getPaidTotal(b.payments);
      const time24 = formatTime24h(b.timeSlot);
      const breakdown = Object.entries(b.payments || {})
        .filter(([, val]) => Number(val) > 0)
        .map(([mode, val]) => `${mode.toUpperCase()}: ₹${val}`)
        .join(' | ') || 'NO PAYMENT SPLIT';

      lines.push(
        `${idx + 1}. [${b.date} | ${time24} hrs] - ${b.gameName} (${b.players}P)`
      );
      lines.push(`   Customer: ${b.customerName} (${b.customerPhone || 'No Phone'})`);
      lines.push(`   Total Paid: ₹${paid} (${b.isPending ? 'PENDING' : 'CONFIRMED'})`);
      lines.push(`   Breakdown: ${breakdown}`);
      if (b.offerName && b.offerId !== 'none') {
        lines.push(`   Discount: ${b.offerName} (-₹${b.discountAmount || 0})`);
      }
      if (b.reference) {
        lines.push(`   Ref: ${b.reference}`);
      }
      lines.push(`-----------------------------------------------------`);
    });

    lines.push(``);
    lines.push(`PAYMENT MODE BREAKDOWN:`);
    PAYMENT_MODES.forEach(mode => {
      lines.push(`• ${mode}: ${formatCurrency(metrics.modeTotals[mode] || 0)}`);
    });
    lines.push(`=====================================================`);

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2500);
    });
  };

  // Export Clean CSV Report with 24-HOUR FORMAT column
  const handleExportCSV = () => {
    if (searchedAndFiltered.length === 0) return;

    const headers = [
      'Booking ID',
      'Date',
      'Time Slot (24H Format)',
      'Game Name',
      'Players',
      'Customer Name',
      'Customer Phone',
      'Rate Per Player (₹)',
      'Base Total (₹)',
      'Offer Applied',
      'Discount (₹)',
      'Final Total (₹)',
      'Status',
      'Cash (₹)',
      'Card (₹)',
      'UPI-New Pay (₹)',
      'Prepaid by District (₹)',
      'Razorpay (₹)',
      'Activity Kids (₹)',
      'Total Paid (₹)',
      'Approval Reference',
      'Screenshot Required'
    ];

    const rows = searchedAndFiltered.map(b => {
      const p = b.payments || {};
      const paid = getPaidTotal(p);
      const time24 = formatTime24h(b.timeSlot);
      const reqScreenshot = Object.keys(p).some(
        m => MODES_REQUIRING_SCREENSHOT.includes(m) && Number(p[m]) > 0
      ) ? 'YES' : 'NO';

      return [
        `"${b.id || ''}"`,
        `"${b.date || ''}"`,
        `"${time24}"`,
        `"${b.gameName || ''}"`,
        b.players || 0,
        `"${(b.customerName || '').replace(/"/g, '""')}"`,
        `"${b.customerPhone || ''}"`,
        b.ratePerPlayer || 0,
        b.baseTotal || 0,
        `"${b.offerName || 'None'}"`,
        b.discountAmount || 0,
        b.finalTotal || paid,
        `"${b.isPending ? 'Pending' : 'Confirmed'}"`,
        p['Cash'] || 0,
        p['Card'] || 0,
        p['UPI-New Pay'] || 0,
        p['Prepaid by District'] || 0,
        p['Razorpay (Website Bookings)'] || 0,
        p['Activity Kids'] || 0,
        paid,
        `"${b.reference || ''}"`,
        `"${reqScreenshot}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EscapeTime_Madhapur_Sales_24H_${dateFilter.replace(/\s+/g, '_')}_${todayStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Header Controls & Export Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-blue-200 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        
        {/* Date Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {['Today', 'Yesterday', 'This Week', 'This Month', 'All Time', 'Pending Only', 'Custom Date Range'].map(tab => (
            <button
              key={tab}
              onClick={() => setDateFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                dateFilter === tab
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'bg-blue-50/60 hover:bg-blue-100 text-blue-900 border border-blue-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 24-Hour Notice & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 border border-blue-300 text-xs font-black">
            <Clock className="w-3.5 h-3.5 text-blue-700" />
            <span>24H Ledger Format</span>
          </span>

          <button
            onClick={handleCopySalesData}
            disabled={searchedAndFiltered.length === 0}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition active:scale-95 ${
              copiedStatus
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            }`}
          >
            {copiedStatus ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied Sales Data!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-blue-200" />
                <span>Copy Sales Data</span>
              </>
            )}
          </button>

          <button
            onClick={handleExportCSV}
            disabled={searchedAndFiltered.length === 0}
            className="flex items-center space-x-1.5 bg-slate-950 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition active:scale-95 shadow-sm"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export CSV</span>
          </button>
        </div>

      </div>

      {/* Custom Date Range Picker */}
      {dateFilter === 'Custom Date Range' && (
        <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200 flex flex-wrap items-center gap-4 text-xs font-bold">
          <span className="text-blue-950 font-black">Custom Range:</span>
          <div className="flex items-center space-x-2">
            <span className="text-blue-900 font-bold">Start:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-white border-2 border-blue-300 rounded-lg px-2.5 py-1 text-slate-900 font-mono font-bold"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-blue-900 font-bold">End:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-white border-2 border-blue-300 rounded-lg px-2.5 py-1 text-slate-900 font-mono font-bold"
            />
          </div>
        </div>
      )}

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Net Revenue */}
        <div className="bg-gradient-to-br from-blue-600/15 via-indigo-600/15 to-slate-950/20 p-5 rounded-2xl border-2 border-blue-300 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-blue-900 tracking-wider">Net Sales Revenue</span>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-950 font-mono mt-1">
            {formatCurrency(metrics.totalRevenue)}
          </p>
          <p className="text-xs font-bold text-blue-700 mt-1">
            Across {searchedAndFiltered.length} records
          </p>
        </div>

        {/* Total Games */}
        <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-blue-900 tracking-wider">Completed Games</span>
            <Gamepad2 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-950 font-mono mt-1">
            {metrics.totalGames}
          </p>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Confirmed sessions
          </p>
        </div>

        {/* Total Players */}
        <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-blue-900 tracking-wider">Total Players</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-950 font-mono mt-1">
            {metrics.totalPlayers}
          </p>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Participants booked
          </p>
        </div>

        {/* Pending Collections */}
        <div className={`p-5 rounded-2xl border-2 shadow-sm ${
          metrics.pendingCount > 0 ? 'bg-red-50 border-red-300' : 'bg-emerald-50 border-emerald-300'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Pending Amount</span>
            <AlertCircle className={`w-5 h-5 ${metrics.pendingCount > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
          </div>
          <p className={`text-2xl sm:text-3xl font-black font-mono mt-1 ${metrics.pendingCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            {formatCurrency(metrics.pendingAmount)}
          </p>
          <p className="text-xs font-bold text-slate-600 mt-1">
            {metrics.pendingCount} unpaid / advance entries
          </p>
        </div>
      </div>

      {/* Payment Modes Breakdown Bar */}
      <div className="bg-white p-4 rounded-2xl border-2 border-blue-200 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-blue-900 mb-3">
          Payment Modes Breakdown ({dateFilter})
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PAYMENT_MODES.map(mode => (
            <div key={mode} className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-200">
              <span className="text-[11px] font-black text-blue-900 block truncate" title={mode}>
                {mode}
              </span>
              <span className="text-sm font-black font-mono text-slate-950 block mt-0.5">
                {formatCurrency(metrics.modeTotals[mode] || 0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border-2 border-blue-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-blue-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer name, phone, game, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-blue-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-blue-400 outline-none focus:border-blue-600 transition"
          />
        </div>

        {/* Payment Mode Selector */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-blue-600" />
          <select
            value={selectedPaymentMode}
            onChange={(e) => setSelectedPaymentMode(e.target.value)}
            className="bg-white border-2 border-blue-200 text-blue-950 font-bold text-xs sm:text-sm rounded-xl px-3 py-2.5 outline-none w-full md:w-56"
          >
            <option value="ALL">All Payment Modes</option>
            {PAYMENT_MODES.map(mode => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sales Table: High-Contrast Bold Data Display */}
      <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-sm overflow-hidden">
        {searchedAndFiltered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-base font-black text-slate-700">No Sales Records Found</p>
            <p className="text-xs text-slate-400">Try changing date filter or clearing search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-50 border-b-2 border-blue-200 text-[11px] font-black text-blue-950 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Date & Slot (24H)</th>
                  <th className="py-3.5 px-4">Customer Details</th>
                  <th className="py-3.5 px-4">Game & Players</th>
                  <th className="py-3.5 px-4">Payment Breakdown (Direct)</th>
                  <th className="py-3.5 px-4">Total Paid</th>
                  <th className="py-3.5 px-4">Offer / Ref</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {searchedAndFiltered.map((booking) => {
                  const paid = getPaidTotal(booking.payments);
                  const isPending = booking.isPending || booking.paymentStatus === 'pending';
                  const requiresScreenshot = Object.keys(booking.payments || {}).some(
                    mode => MODES_REQUIRING_SCREENSHOT.includes(mode) && Number(booking.payments[mode]) > 0
                  );

                  // Extract active payment modes for direct clean text breakdown
                  const activePayments = Object.entries(booking.payments || {})
                    .filter(([, val]) => Number(val) > 0);

                  // 24-HOUR TIME CONVERSION
                  const time24 = formatTime24h(booking.timeSlot);

                  return (
                    <tr
                      key={booking.id}
                      className="hover:bg-blue-50/40 transition-colors duration-150"
                    >
                      {/* Date & 24-Hour Time Slot Badge */}
                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className="inline-block bg-blue-950 text-blue-100 border border-blue-400 font-black text-xs sm:text-sm font-mono px-3 py-1 rounded-lg shadow-sm w-fit">
                            {time24}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 font-mono">
                            {booking.date}
                          </span>
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-0.5">
                          <p className="text-base sm:text-lg font-black text-slate-950 leading-tight">
                            {booking.customerName}
                          </p>
                          {booking.customerPhone && (
                            <p className="text-xs sm:text-sm font-bold font-mono text-blue-900">
                              {booking.customerPhone}
                            </p>
                          )}
                          {booking.notes && (
                            <p className="text-[11px] text-slate-500 italic">
                              "{booking.notes}"
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Game & Players */}
                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        <div>
                          <p className="text-sm font-black text-slate-900 leading-snug">
                            {booking.gameName}
                          </p>
                          <p className="text-xs font-bold text-slate-600 mt-0.5">
                            <span className="font-mono text-slate-900 font-black">{booking.players}</span> Players
                            <span className="text-blue-700 ml-1 font-mono font-bold">(@ ₹{booking.ratePerPlayer})</span>
                          </p>
                        </div>
                      </td>

                      {/* Payment Breakdown (Direct clean text) */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1">
                          {activePayments.length === 0 ? (
                            <span className="text-xs font-bold text-red-500">No payment collected</span>
                          ) : (
                            <div className="text-sm sm:text-base font-black text-slate-900 font-mono tracking-tight leading-normal">
                              {activePayments.map(([mode, amt], i) => (
                                <span key={mode}>
                                  <span className="text-blue-900">{mode.toUpperCase()}</span>: <span className="text-slate-950">₹{amt}</span>
                                  {i < activePayments.length - 1 && <span className="text-slate-300 mx-2 font-normal">|</span>}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Screenshot Reminder Badge if required */}
                          {requiresScreenshot && (
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-purple-100 text-purple-900 border border-purple-300 text-xs font-black mt-1">
                              <Camera className="w-3.5 h-3.5 text-purple-700" />
                              <span>📷 Attach booking / payment screenshots in closing</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Total Paid Amount & Confirmation Tag */}
                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        <div>
                          <p className="text-base sm:text-lg font-black text-slate-950 font-mono">
                            {formatCurrency(paid)}
                          </p>
                          {isPending ? (
                            <span className="inline-flex items-center space-x-1 text-xs font-black text-red-600 bg-red-100 px-2 py-0.5 rounded mt-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>Advance / Pending</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded mt-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>✓ Paid & Confirmed</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Offer & Reference Badges */}
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col gap-1 items-start">
                          {booking.offerName && booking.offerId !== 'none' ? (
                            <span className="px-2.5 py-1 rounded-md text-xs sm:text-sm font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                              {booking.offerName}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">Standard</span>
                          )}

                          {booking.reference && (
                            <span className="px-2.5 py-1 rounded-md text-xs sm:text-sm font-black bg-blue-100 text-blue-900 border-2 border-blue-300">
                              Ref: {booking.reference}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Row Actions */}
                      <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onOpenDetailModal(booking)}
                            title="Print / View Receipt"
                            className="p-2 text-blue-700 hover:text-blue-950 hover:bg-blue-100 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenBookingModal(booking)}
                            title="Edit Booking"
                            className="p-2 text-amber-700 hover:text-amber-950 hover:bg-amber-100 rounded-lg transition"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteBooking(booking.id)}
                            title="Delete"
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
