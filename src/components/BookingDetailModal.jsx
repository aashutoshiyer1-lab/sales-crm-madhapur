import React from 'react';
import {
  X,
  Printer,
  Calendar,
  Clock,
  User,
  Phone,
  Tag,
  CreditCard,
  Camera,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { BRANCH_INFO, MODES_REQUIRING_SCREENSHOT } from '../config/venueData';
import { formatCurrency, getPaidTotal } from '../utils/pricingEngine';

export default function BookingDetailModal({
  isOpen,
  onClose,
  booking,
  onEdit
}) {
  if (!isOpen || !booking) return null;

  const paidTotal = getPaidTotal(booking.payments);
  const isPending = booking.isPending || booking.paymentStatus === 'pending';
  const remainingDue = Math.max(0, (Number(booking.finalTotal) || 0) - paidTotal);

  const requiresScreenshot = Object.keys(booking.payments || {}).some(
    mode => MODES_REQUIRING_SCREENSHOT.includes(mode) && Number(booking.payments[mode]) > 0
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-[#fffff0] w-full max-w-2xl rounded-3xl border border-amber-900/20 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Modal Top Bar (Hidden in Print) */}
        <div className="no-print px-6 py-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
            Booking Receipt Preview
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-slate-950 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl font-black text-xs transition active:scale-95 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div id="printable-receipt" className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-900 bg-white">

          {/* Receipt Header */}
          <div className="text-center pb-6 border-b-2 border-dashed border-slate-200 space-y-1">
            <div className="inline-block px-3 py-1 bg-slate-950 text-white font-black text-lg rounded-xl mb-2">
              ESCAPE TIME
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
              {BRANCH_INFO.name}
            </h2>
            <p className="text-xs font-bold text-slate-600">
              {BRANCH_INFO.address}
            </p>
            <p className="text-xs font-mono text-slate-500">
              Web: {BRANCH_INFO.website} • Ref #{booking.id}
            </p>
          </div>

          {/* Session Timing & Status Banner */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Game Slot</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-base font-black font-mono text-slate-950">{booking.timeSlot}</span>
              </div>
              <span className="text-xs font-bold text-slate-600">{booking.date}</span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Payment Status</span>
              <div className="mt-1">
                {isPending ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-red-100 text-red-800 text-xs font-black">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Advance / Pending Due</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-black">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>✓ Confirmed & Fully Paid</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Customer Details</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-500 text-xs block">Customer Name</span>
                <span className="font-black text-slate-950 text-base">{booking.customerName}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">Phone Number</span>
                <span className="font-black font-mono text-slate-950">{booking.customerPhone || 'N/A'}</span>
              </div>
              {booking.reference && (
                <div>
                  <span className="text-slate-500 text-xs block">Approval Reference</span>
                  <span className="font-bold text-blue-700">{booking.reference}</span>
                </div>
              )}
              {booking.notes && (
                <div>
                  <span className="text-slate-500 text-xs block">Notes</span>
                  <span className="font-medium text-slate-700 italic">"{booking.notes}"</span>
                </div>
              )}
            </div>
          </div>

          {/* Game & Pricing Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-[11px] font-black text-slate-600 uppercase">
                <tr>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-center">Players</th>
                  <th className="py-2.5 px-4 text-right">Rate</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4">
                    <p className="font-black text-slate-950">{booking.gameName}</p>
                    <p className="text-xs text-slate-500">
                      Duration: 60 Mins • <span className="font-bold text-blue-900">{booking.playerCategory || booking.categoryOverride || `${booking.players} Players Category`}</span>
                    </p>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold">
                    {booking.players}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    {formatCurrency(booking.ratePerPlayer)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-slate-950">
                    {formatCurrency(booking.baseTotal)}
                  </td>
                </tr>

                {/* Discount Row */}
                {booking.discountAmount > 0 && (
                  <tr className="bg-emerald-50/50">
                    <td colSpan={3} className="py-2.5 px-4 text-xs font-bold text-emerald-800">
                      <div>Discount Applied: {booking.offerName} ({booking.discountPercent}%)</div>
                      {(booking.customDiscountReason || booking.customNote) && (
                        <div className="text-[11px] text-amber-900 font-semibold italic mt-0.5">
                          Custom Reason: {booking.customDiscountReason || booking.customNote}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-700">
                      - {formatCurrency(booking.discountAmount)}
                    </td>
                  </tr>
                )}

                {(!booking.discountAmount || booking.discountAmount <= 0) && (booking.customDiscountReason || booking.customNote) && (
                  <tr className="bg-amber-50/50">
                    <td colSpan={4} className="py-2.5 px-4 text-xs font-bold text-amber-900">
                      <div>Custom Reason: {booking.customDiscountReason || booking.customNote}</div>
                    </td>
                  </tr>
                )}

                {/* Final Total Row */}
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={3} className="py-3 px-4 text-sm font-black text-slate-950 uppercase">
                    Final Total Due
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-base text-slate-950">
                    {formatCurrency(booking.finalTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Breakdown Details */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              Payment Breakdown
            </span>

            <div className="space-y-1.5">
              {Object.entries(booking.payments || {})
                .filter(([, val]) => Number(val) > 0)
                .map(([mode, amt]) => (
                  <div key={mode} className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-bold text-slate-700">{mode}</span>
                    <span className="font-black font-mono text-slate-950">
                      {formatCurrency(amt)}
                    </span>
                  </div>
                ))}
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-black">
              <span>Total Paid</span>
              <span className="font-mono text-slate-950">{formatCurrency(paidTotal)}</span>
            </div>

            {remainingDue > 0 && (
              <div className="flex items-center justify-between text-sm font-black text-red-600">
                <span>Remaining Balance Due</span>
                <span className="font-mono">{formatCurrency(remainingDue)}</span>
              </div>
            )}
          </div>

          {/* Screenshot Reminder Alert on Receipt */}
          {requiresScreenshot && (
            <div className="p-3 bg-purple-50 border border-purple-300 rounded-xl text-xs font-bold text-purple-900 flex items-center space-x-2">
              <Camera className="w-4 h-4 text-purple-700 shrink-0" />
              <span>
                📷 <strong>Closing Checklist:</strong> Screenshot attachment required for District / Razorpay / Activity Kids transaction.
              </span>
            </div>
          )}

          {/* Receipt Footer */}
          <div className="text-center pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
            <p className="font-bold text-slate-700">Thank you for visiting Escape Time!</p>
            <p>Please arrive 15 minutes prior to your scheduled time slot.</p>
          </div>

        </div>

        {/* Modal Action Controls (Hidden in Print) */}
        <div className="no-print px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              if (onEdit) onEdit(booking);
            }}
            className="text-xs font-black text-amber-700 hover:text-amber-900"
          >
            Edit This Booking
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
