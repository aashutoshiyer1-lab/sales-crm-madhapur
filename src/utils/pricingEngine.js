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
export const getTierRatePerPlayer = (dateStr, playerCount) => {
  const weekend = isWeekend(dateStr);
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
  customDiscount = null
}) => {
  const count = Math.max(1, parseInt(players, 10) || 1);
  const standardRate = getTierRatePerPlayer(date, count);
  const ratePerPlayer = customRate !== null && customRate !== undefined && !isNaN(customRate)
    ? Number(customRate)
    : standardRate;

  const baseTotal = count * ratePerPlayer;

  const offer = OFFERS.find(o => o.id === offerId) || OFFERS[0];
  const offerPercent = offer ? offer.discountPercent : 0;

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
    isComplimentary: offerId === 'complimentary' || finalTotal === 0
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
