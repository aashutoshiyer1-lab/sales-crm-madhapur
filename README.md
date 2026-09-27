# Escape Time (Madhapur Branch) - Sales & Revenue CRM

A production-ready Sales & Revenue CRM web application designed specifically for **Escape Time - Madhapur Branch**, built with **React, Vite, Tailwind CSS, Lucide React, and Firebase Realtime Database**.

---

## 🏢 Venue Configuration & Operating Rules

- **Branch**: Escape Time (Madhapur Branch)
- **Theme Color**: Warm Ivory Background (`#fffff0`), Deep Slate Text (`#0f172a`), Red & Amber Accents
- **Operating Hours**:
  - **Weekdays (Mon-Fri)**: 11:00 AM – 10:00 PM (15-minute slot intervals)
  - **Weekends (Sat-Sun)**: 10:30 AM – 11:00 PM (15-minute slot intervals)
- **Games Included**:
  1. **Bank Heist** (60 Mins)
  2. **The Lost Recipe** (60 Mins)
  3. **Curse of the Mummy** (60 Mins)
  4. **Prison Break** (60 Mins)
- **Pricing Tiers (Auto-Calculated by Engine)**:
  - **Weekdays**:
    - 2–3 Players: ₹999 / player
    - 4–6 Players: ₹899 / player
    - 7+ Players: ₹799 / player
  - **Weekends**:
    - 2–3 Players: ₹1099 / player
    - 4–6 Players: ₹999 / player
    - 7+ Players: ₹899 / player
- **6 Payment Modes**:
  1. Cash
  2. Card
  3. UPI-New Pay
  4. Prepaid by District *(📷 triggers screenshot reminder)*
  5. Razorpay (Website Bookings) *(📷 triggers screenshot reminder)*
  6. Activity Kids *(📷 triggers screenshot reminder)*
- **Offers & Discounts**:
  - No Discount (Standard Rate - 0%)
  - High Prices Retention (10% OFF)
  - Birthday Package (10% OFF)
  - Second Game Special (20% OFF)
  - Cross Promotion Coupon (30% OFF)
  - Kids Under 6 Years (100% OFF Complimentary)
- **Approval References**:
  - Nayeem Sir
  - Khaja Sir
  - Manager Reference

---

## ⚡ Core Features

1. **Calendar Schedule Dashboard (`CalendarDashboard.jsx`)**:
   - 15-Minute interval slots in a multi-column responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4`).
   - Quick date jump controls (`Today`, `Previous Day`, `Next Day`).
   - **Today's Pending Entries Dropdown**: Auto-scrolls and opens payment collection modal.
   - Real-time Day Revenue (₹), Total Players count, and Completed Games count.
2. **Sales & Revenue Dashboard (`SalesDashboard.jsx`)**:
   - Date range filters (`Today`, `Yesterday`, `This Week`, `This Month`, `All Time`, `Custom Date Range`, `Pending Only`).
   - Chronological sorting: Date ascending, then Time Slot ascending (`11:00 AM` to late night).
   - High-contrast bold display with customer details, direct payment breakdown, and purple screenshot reminder badge.
   - **One-Click "Copy Sales Data" Button**: Formatted text summary copied to clipboard.
   - **Export CSV Button**: Comprehensive spreadsheet including all 6 payment mode columns.
3. **Booking Modal (`BookingModal.jsx`)**:
   - Auto-adapting 15-minute slot selector based on weekday vs weekend operating hours.
   - Automatic pricing engine with tier detection, discount calculations, and remaining balance tracking.
   - Split payment support across all 6 payment modes with `100% Fill` and `+Remain` quick buttons.
   - Advance / Pending payment toggle.
4. **Printable Receipt (`BookingDetailModal.jsx`)**:
   - Complete itemized breakdown ready for printing (`window.print()`).
5. **Staff Access PIN (`LoginView.jsx`)**:
   - Default Staff PIN: `1234` (or `0000` / `9999`).
6. **Optimistic UI (0ms Instant Latency)**:
   - Bookings update locally in 0ms, persisted to `localStorage`, and synced asynchronously to Firebase Realtime Database.

---

## ☁️ What is Needed from Firebase?

To enable multi-device cloud synchronization, you will need the following 7 values from your **Firebase Project**:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

### How to get them in 2 minutes:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a project (e.g. `escapetime-madhapur`).
3. Click the **Web (</>)** icon to register a web app.
4. Copy the `firebaseConfig` object values.
5. In Firebase sidebar, click **Build > Realtime Database**, click **Create Database** (choose Singapore/Asia or any region), and start in **test mode** (or set read/write rules to true):
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
6. The `databaseURL` is the URL at the top of your Realtime Database tab (e.g. `https://xxx-default-rtdb.firebaseio.com`).

---

## 🚀 How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Run local dev server
npm run dev

# 3. Build for production
npm run build
```

---

## 🌐 Deploy to Vercel via GitHub

1. Initialize git and push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Escape Time Madhapur CRM"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/sales-crm-madhapur.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Under **Environment Variables**, paste the 7 Firebase keys (from `.env.example`).
5. Click **Deploy**. Vercel will automatically build and publish your CRM on a fast global CDN!
