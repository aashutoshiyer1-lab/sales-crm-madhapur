import { isWeekend, OFFERS } from '../config/venueData';

/**
 * Get standard tier rate per player based on weekend status and player count
 * Weekdays:
 *   2-3: ₹999
 *   4-6: ₹899
 *   7+:  ₹799
 * Weekends:
 *   2-3: ₹1099
 *   4-6: ₹999
 *   7+:  ₹899
 */
export const getTierRatePerPlayer = (dateStr, playerCount, isWeekendOverride = null) => {
  const weekend = isWeekendOverride !== null && isWeekendOverride !== undefined
    ? Boolean(isWeekendOverride)
    : isWeekend(dateStr);
  const count = Math.max(1, parseInt(playerCount, 10) || 1);

  if (weekend) {
    if (count <= 3) return 1099;
    if (count <= 6) return 999;
    return 899; // 7+
  } else {
    if (count <= 3) return 999;
    if (count <= 6) return 899;
    return 799; // 7+
  }
};

/**
 * Calculates complete pricing breakdown
 */
export const calculatePricing = ({
  date,
  players,
  offerId = 'none',
  customRate = null,
  customDiscount = null,
  customDiscountPercent = null,
  isWeekendOverride = null
}) => {
  const count = Math.max(1, parseInt(players, 10) || 1);
  const standardRate = getTierRatePerPlayer(date, count, isWeekendOverride);
  const ratePerPlayer = customRate !== null && customRate !== undefined && !isNaN(customRate)
    ? Number(customRate)
    : standardRate;

  const baseTotal = count * ratePerPlayer;

  const offer = OFFERS.find(o => o.id === offerId) || OFFERS[0];
  const offerPercent = customDiscountPercent !== null && customDiscountPercent !== undefined && !isNaN(customDiscountPercent)
    ? Math.min(100, Math.max(0, Number(customDiscountPercent)))
    : (offer ? offer.discountPercent : 0);

  let discountAmount = 0;
  if (customDiscount !== null && customDiscount !== undefined && !isNaN(customDiscount)) {
    discountAmount = Math.min(baseTotal, Math.max(0, Number(customDiscount)));
  } else {
    discountAmount = Math.round(baseTotal * (offerPercent / 100));
  }

  const finalTotal = Math.max(0, baseTotal - discountAmount);

  return {
    ratePerPlayer,
    standardRate,
    baseTotal,
    discountPercent: offerPercent,
    discountAmount,
    finalTotal,
    isComplimentary: offerId === 'complimentary' || offerPercent === 100 || finalTotal === 0
  };
};

/**
 * Format Indian Rupee currency: ₹1,500
 */
export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

/**
 * Calculates sum of paid split amounts
 */
export const getPaidTotal = (payments = {}) => {
  if (!payments || typeof payments !== 'object') return 0;
  return Object.values(payments).reduce((sum, val) => sum + (Number(val) || 0), 0);
};

/**
 * Resolves player bracket category for any booking:
 * 1. Checks explicit categoryOverride or customCategory
 * 2. Sibling paid booking inheritance (same date, room & slot or matching customer phone)
 * 3. Fallback: >= 7 -> '7+ Players', >= 4 -> '4–6 Players', complimentary -> '4–6 Players' (smart default), else '2–3 Players'
 */
export const getBookingCategory = (booking, allBookings = []) => {
  if (!booking) return 'Not Set';

  // 1. Direct explicit category override
  const override = booking.categoryOverride || booking.customCategory;
  if (override) {
    const raw = String(override).trim();
    if (raw.includes('2') || raw.includes('3')) return '2–3 Players';
    if (raw.includes('4') || raw.includes('5') || raw.includes('6')) return '4–6 Players';
    if (raw.includes('7')) return '7+ Players';
    return raw;
  }

  const isComp = (
    booking.offerId === 'complimentary' ||
    Number(booking.discountPercent) === 100 ||
    booking.finalTotal === 0 ||
    (booking.offerName && booking.offerName.toLowerCase().includes('complimentary')) ||
    (booking.notes && booking.notes.toLowerCase().includes('complimentary'))
  );

  // 2. Sibling paid booking inheritance
  if (isComp && Array.isArray(allBookings) && allBookings.length > 0) {
    const sibling = allBookings.find(b => {
      if (!b || b.id === booking.id) return false;
      const sameDate = b.date === booking.date;
      const sameRoom = (b.gameName || '').toLowerCase() === (booking.gameName || '').toLowerCase();
      const sameSlot = b.timeSlot === booking.timeSlot;
      const samePhone = booking.customerPhone && b.customerPhone && b.customerPhone.trim() === booking.customerPhone.trim();
      const isPaid = (Number(b.finalTotal) > 0) || (b.offerId !== 'complimentary' && Number(b.discountPercent) !== 100);
      return sameDate && isPaid && ((sameRoom && sameSlot) || (samePhone && sameRoom));
    });

    if (sibling) {
      if (sibling.categoryOverride || sibling.customCategory) {
        return getBookingCategory(sibling, []);
      }
      const sibPax = Number(sibling.players) || 0;
      if (sibPax >= 7) return '7+ Players';
      if (sibPax >= 4) return '4–6 Players';
      if (sibPax > 0) return '2–3 Players';
    }
  }

  // 3. Fallback
  const pax = Number(booking.players) || 0;
  if (pax >= 7) return '7+ Players';
  if (pax >= 4) return '4–6 Players';
  if (isComp) return '4–6 Players'; // Default complimentary family bracket
  if (pax > 0) return '2–3 Players';
  return 'Not Set';
};
