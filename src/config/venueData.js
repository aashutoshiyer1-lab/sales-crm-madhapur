// Escape Time - Madhapur Branch Venue Configuration

export const BRANCH_INFO = {
  name: "Escape Time (Madhapur Branch)",
  shortName: "Escape Time Madhapur",
  address: "Madhapur, Hyderabad, Telangana",
  phone: "+91 91000 00000",
  email: "madhapur@escapetime.in",
  website: "https://escapetime.in"
};

export const PAYMENT_MODES = [
  "Cash",
  "Card",
  "UPI-New Pay",
  "Prepaid by District",
  "Razorpay (Website Bookings)",
  "Activity Kids"
];

// Modes that require proof / screenshot in closing report
export const MODES_REQUIRING_SCREENSHOT = [
  "Prepaid by District",
  "Razorpay (Website Bookings)",
  "Activity Kids"
];

export const OFFERS = [
  {
    id: "none",
    name: "No Discount (Standard Rate)",
    discountPercent: 0,
    defaultReference: null,
    requiresReference: false,
    reasonText: ""
  },
  {
    id: "website_booking",
    name: "Website Booking (Razorpay)",
    discountPercent: 0,
    defaultReference: null,
    requiresReference: false,
    isPrepaid: true,
    channel: "Website",
    reasonText: "Website"
  },
  {
    id: "district_app",
    name: "District App",
    discountPercent: 0,
    defaultReference: null,
    requiresReference: false,
    isPrepaid: true,
    channel: "District",
    reasonText: "District"
  },
  {
    id: "activity_kids",
    name: "Activity Kids",
    discountPercent: 0,
    defaultReference: null,
    requiresReference: false,
    isPrepaid: true,
    channel: "Activity Kids",
    reasonText: "Activity Kids"
  },
  {
    id: "cross_promotion",
    name: "Cross Promotion Coupon",
    discountPercent: 30,
    allowedPercents: [10, 15, 20, 25, 30],
    defaultReference: "Khaja Sir",
    requiresReference: true,
    reasonText: "they had cross promotion coupon"
  },
  {
    id: "cross_promotion_brochure",
    name: "Cross Promotion Brochure",
    discountPercent: 30,
    defaultReference: "Khaja Sir",
    requiresReference: true,
    reasonText: "they had cross promotion brochure"
  },
  {
    id: "second_game",
    name: "Second Game Special",
    discountPercent: 20,
    allowedPercents: [10, 20],
    defaultReference: "Khaja Sir",
    requiresReference: true,
    reasonText: "it was their second game on the same day"
  },
  {
    id: "birthday_package",
    name: "Birthday Package",
    discountPercent: 15,
    allowedPercents: [10, 15],
    defaultReference: "Khaja Sir",
    requiresReference: true,
    reasonText: "they had birthday package"
  },
  {
    id: "corporate_package",
    name: "Corporate Package",
    discountPercent: 15,
    defaultReference: "Khaja Sir",
    requiresReference: true,
    reasonText: "it was corporate package"
  },
  {
    id: "high_price_retention",
    name: "Going Back Due to High Prices",
    discountPercent: 10,
    defaultReference: "Khaja Sir",
    requiresReference: true,
    reasonText: "they were going back due to high prices"
  },
  {
    id: "complimentary",
    name: "Complimentary Game (Kids Under 5 Years)",
    discountPercent: 100,
    defaultReference: "Khaja Sir",
    requiresReference: true,
    isComplimentary: true,
    reasonText: "they were under 5 years"
  },
  {
    id: "custom_discount",
    name: "Custom Reason Discount",
    discountPercent: 0,
    defaultReference: null,
    requiresReference: false,
    isCustomPercent: true,
    reasonText: "custom"
  }
];

export const APPROVAL_REFERENCES = [
  "Khaja Sir"
];

// Active staff members for Madhapur branch (closing & mummy actor tracking)
export const STAFF_ROSTER = [
  "Moin",
  "Hamza",
  "Prudhvi",
  "Bhavani",
  "Harshini"
];

/**
 * Returns exact pricing category for closing reference:
 * '2–3 Players', '4–6 Players', or '7+ Players'
 */
export const getPlayerCategory = (playerCount) => {
  const count = Number(playerCount) || 0;
  if (count <= 0) return 'Not Set';
  if (count <= 3) return '2–3 Players';
  if (count <= 6) return '4–6 Players';
  return '7+ Players';
};

export const GAMES = [
  {
    id: "bank-heist",
    name: "Bank Heist",
    duration: 60,
    minPlayers: 2,
    maxPlayers: 10,
    tagline: "Enter a high-security bank on a bank holiday and break into the vault!",
    color: "from-amber-600 to-amber-800"
  },
  {
    id: "the-lost-recipe",
    name: "The Lost Recipe",
    duration: 60,
    minPlayers: 2,
    maxPlayers: 10,
    tagline: "Uncover the legendary Nizam Biryani recipe hidden in ancient royal quarters.",
    color: "from-orange-600 to-red-800"
  },
  {
    id: "curse-of-the-mummy",
    name: "Curse of the Mummy",
    duration: 60,
    minPlayers: 2,
    maxPlayers: 10,
    tagline: "Explore Professor Carter's ancient Egyptian tomb discovery before the curse triggers.",
    color: "from-yellow-700 to-amber-950"
  },
  {
    id: "prison-break",
    name: "Prison Break",
    duration: 60,
    minPlayers: 2,
    maxPlayers: 10,
    tagline: "Wrongly accused and locked forever. Execute your mastermind escape plan!",
    color: "from-slate-700 to-slate-900"
  }
];

export const OPERATING_HOURS = {
  weekday: {
    startHour: 11, // 11:00 AM
    startMin: 0,
    endHour: 22,   // 10:00 PM (22:00)
    endMin: 0,
    extendedEndHour: 25, // 1:00 AM (25:00 next day)
    extendedEndMin: 0
  },
  weekend: {
    startHour: 10, // 10:30 AM
    startMin: 30,
    endHour: 23,   // 11:00 PM (23:00)
    endMin: 0,
    extendedEndHour: 25, // 1:00 AM (25:00 next day)
    extendedEndMin: 0
  }
};

/**
 * Format hours & minutes to 12-hour AM/PM string (e.g. 11:15 AM, 12:00 AM, 1:00 AM)
 * Properly normalizes late-night hours >= 24 (24:00 -> 12:00 AM, 25:00 -> 1:00 AM)
 */
export const formatTime12h = (hour, minute) => {
  const normalizedHour = hour % 24;
  const period = (normalizedHour >= 12 && normalizedHour < 24) ? 'PM' : 'AM';
  const displayHour = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;
  const displayMin = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMin} ${period}`;
};

/**
 * Convert 12-hour string (e.g. "11:15 AM", "12:00 AM", "01:00 AM") into 24-hour format ("11:15", "00:00", "01:00")
 * Specially needed for Sales & Reports physical ledger logging!
 */
export const formatTime24h = (timeStr) => {
  if (!timeStr) return '';
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return timeStr;
  let [, h, m, period] = match;
  let hour = parseInt(h, 10);
  if (period) {
    if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
    if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
  }
  return `${hour.toString().padStart(2, '0')}:${m}`;
};

/**
 * Parses "11:15 AM", "12:00 AM", "01:00 AM", or "00:30" into shift-adjusted minutes.
 * Post-midnight slots (00:xx to 05:xx / 12:xx AM to 05:xx AM) are treated as the end
 * of that day's shift ((hour < 6 ? hour + 24 : hour) * 60 + minute) so they sort
 * at the bottom of the day's schedule!
 */
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return 0;
  let [, h, m, period] = match;
  let hour = parseInt(h, 10);
  const min = parseInt(m, 10);
  if (period) {
    if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
    if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
  }
  // Shift adjustment: post-midnight hours (0 to 5) belong to the late-night shift of that business day!
  const shiftHour = hour < 6 ? hour + 24 : hour;
  return shiftHour * 60 + min;
};

/**
 * Returns whether given date string (YYYY-MM-DD) or Date object is Weekend (Sat or Sun)
 */
export const isWeekend = (dateInput) => {
  if (!dateInput) return false;
  const date = typeof dateInput === 'string' ? new Date(dateInput + 'T00:00:00') : dateInput;
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
};

/**
 * Generates structured time slot groups:
 * - standard: Normal operating hours (e.g. 11 AM - 10 PM on Weekdays, 10:30 AM - 11 PM on Weekends)
 * - extended: Late night slots past closing hours all the way to 1:00 AM
 * - all: Combined list
 */
export const getTimeSlotGroups = (isWeekendDay) => {
  const config = isWeekendDay ? OPERATING_HOURS.weekend : OPERATING_HOURS.weekday;
  const standard = [];
  const extended = [];

  let currentMin = config.startHour * 60 + config.startMin;
  const standardEndMin = config.endHour * 60 + config.endMin;
  const extendedEndMin = (config.extendedEndHour || 25) * 60 + (config.extendedEndMin || 0);

  while (currentMin <= standardEndMin) {
    const h = Math.floor(currentMin / 60);
    const m = currentMin % 60;
    standard.push(formatTime12h(h, m));
    currentMin += 15;
  }

  // Next slot starts 15 mins after standard close
  while (currentMin <= extendedEndMin) {
    const h = Math.floor(currentMin / 60);
    const m = currentMin % 60;
    extended.push(formatTime12h(h, m));
    currentMin += 15;
  }

  return {
    standard,
    extended,
    all: [...standard, ...extended]
  };
};

/**
 * Generates 15-minute slot array based on whether date is Weekend or Weekday.
 * Supports includeExtended=true to include late night slots till 1:00 AM.
 */
export const generateTimeSlots = (isWeekendDay, includeExtended = false) => {
  const groups = getTimeSlotGroups(isWeekendDay);
  return includeExtended ? groups.all : groups.standard;
};

/**
 * Helper to identify complimentary bookings (100% off / kids under 6 / complimentary)
 */
export const isComplimentaryBooking = (booking) => {
  if (!booking) return false;
  return (
    booking.offerId === 'complimentary' ||
    Number(booking.discountPercent) === 100 ||
    (booking.offerName && booking.offerName.toLowerCase().includes('complimentary')) ||
    (booking.notes && booking.notes.toLowerCase().includes('complimentary'))
  );
};
