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
  { id: "none", name: "No Discount (Standard Rate)", discountPercent: 0 },
  { id: "high_price_retention", name: "High Prices Retention (10% OFF)", discountPercent: 10 },
  { id: "birthday_package", name: "Birthday Package (10% OFF)", discountPercent: 10 },
  { id: "second_game", name: "Second Game Special (20% OFF)", discountPercent: 20 },
  { id: "cross_promotion", name: "Cross Promotion Coupon (30% OFF)", discountPercent: 30 },
  { id: "complimentary", name: "Kids Under 6 Years (100% OFF)", discountPercent: 100 }
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
    endMin: 0
  },
  weekend: {
    startHour: 10, // 10:30 AM
    startMin: 30,
    endHour: 23,   // 11:00 PM (23:00)
    endMin: 0
  }
};

/**
 * Format hours & minutes to 12-hour AM/PM string (e.g. 11:15 AM)
 */
export const formatTime12h = (hour, minute) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMin = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMin} ${period}`;
};

/**
 * Convert 12-hour string (e.g. "11:15 AM", "02:30 PM") into 24-hour format ("11:15", "14:30")
 * Specially needed for Sales & Reports physical ledger logging!
 */
export const formatTime24h = (time12h) => {
  if (!time12h) return '';
  const match = time12h.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time12h;
  let [, h, m, period] = match;
  let hour = parseInt(h, 10);
  if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${m}`;
};

/**
 * Parses "11:15 AM" or "02:30 PM" into minutes from midnight for accurate chronological sorting
 */
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let [, h, m, period] = match;
  let hour = parseInt(h, 10);
  const min = parseInt(m, 10);
  if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
  return hour * 60 + min;
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
 * Generates 15-minute slot array based on whether date is Weekend or Weekday
 */
export const generateTimeSlots = (isWeekendDay) => {
  const config = isWeekendDay ? OPERATING_HOURS.weekend : OPERATING_HOURS.weekday;
  const slots = [];
  
  let currentMinutes = config.startHour * 60 + config.startMin;
  const endMinutes = config.endHour * 60 + config.endMin;

  while (currentMinutes <= endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    slots.push(formatTime12h(h, m));
    currentMinutes += 15;
  }

  return slots;
};
