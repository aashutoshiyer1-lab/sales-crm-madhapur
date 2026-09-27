import React from 'react';
import { Calendar, BarChart3, PlusCircle, ShieldCheck, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { BRANCH_INFO } from '../config/venueData';

export default function Navbar({
  currentView,
  setCurrentView,
  onOpenNewBooking,
  isFirebaseActive,
  isSyncing,
  onLogout
}) {
  return (
    <header className="sticky top-0 z-30 bg-[#fffff0] border-b border-amber-900/10 shadow-sm backdrop-blur-md bg-opacity-95">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand & Branch Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-600 via-red-900 to-slate-950 flex items-center justify-center shadow-md shadow-red-950/20 text-white font-black text-xl sm:text-2xl tracking-tighter">
              ET
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight leading-tight">
                  Escape Time
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-amber-500/15 text-amber-900 border border-amber-500/30 uppercase tracking-wide">
                  Madhapur
                </span>
              </div>
              <p className="text-xs font-bold text-slate-500 hidden sm:block">
                Sales & Revenue CRM • Operating Hours (15m Slots)
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-900/5 p-1 rounded-xl border border-slate-900/10">
            <button
              onClick={() => setCurrentView('calendar')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all ${
                currentView === 'calendar'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Schedule Grid</span>
            </button>

            <button
              onClick={() => setCurrentView('sales')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all ${
                currentView === 'sales'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-red-400" />
              <span>Sales & Reports</span>
            </button>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Realtime Sync Indicator */}
            <div
              title={
                isFirebaseActive
                  ? "Connected to Firebase Realtime Database (Auto-Syncing)"
                  : "Running in Instant Local Mode (Firebase Config Placeholder Ready)"
              }
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold ${
                isFirebaseActive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-700" />
              ) : isFirebaseActive ? (
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span className="hidden md:inline">
                {isSyncing ? 'Syncing...' : isFirebaseActive ? 'Cloud Live' : 'Local Storage'}
              </span>
            </div>

            {/* Quick 1-Click New Booking Button */}
            <button
              onClick={() => onOpenNewBooking()}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-md shadow-red-600/25 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ New Booking</span>
            </button>

            {/* Lock / Exit */}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Lock CRM / Logout"
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition"
              >
                <ShieldCheck className="w-5 h-5" />
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
