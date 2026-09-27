import React, { useState } from 'react';
import { Lock, KeyRound, ArrowRight } from 'lucide-react';
import { BRANCH_INFO } from '../config/venueData';

const DEFAULT_PIN = "1234";

export default function LoginView({ onLoginSuccess }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(false);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const verifyPin = (enteredPin) => {
    // Check against standard staff PIN (1234) or manager override
    if (enteredPin === DEFAULT_PIN || enteredPin === "0000" || enteredPin === "9999") {
      onLoginSuccess();
    } else {
      setError(true);
      setTimeout(() => {
        setPin("");
        setError(false);
      }, 700);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffff0] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-amber-900/15 shadow-xl p-8 space-y-6 text-center">

        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600 via-red-900 to-slate-950 flex items-center justify-center shadow-lg shadow-red-950/20 text-white font-black text-2xl">
            ET
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-950 tracking-tight">
              {BRANCH_INFO.name}
            </h1>
            <p className="text-xs font-bold text-slate-500">
              Staff & Sales CRM Portal
            </p>
          </div>
        </div>

        {/* PIN Dots Indicator */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Enter 4-Digit Staff Access PIN
          </p>

          <div className={`flex justify-center space-x-3 transition-transform ${error ? 'animate-bounce' : ''}`}>
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  pin.length > idx
                    ? 'bg-slate-950 border-slate-950 scale-110'
                    : 'border-slate-300 bg-slate-100'
                } ${error ? 'border-red-600 bg-red-500' : ''}`}
              />
            ))}
          </div>

          {error && (
            <p className="text-xs font-black text-red-600">
              Incorrect PIN. Try again.
            </p>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num.toString())}
              className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 font-mono text-xl font-black text-slate-950 shadow-sm transition active:scale-95"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 text-xs font-black text-slate-700 transition active:scale-95"
          >
            DEL
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress("0")}
            className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 font-mono text-xl font-black text-slate-950 shadow-sm transition active:scale-95"
          >
            0
          </button>

          <button
            type="button"
            onClick={() => verifyPin(pin)}
            disabled={pin.length !== 4}
            className={`h-14 rounded-2xl flex items-center justify-center transition active:scale-95 ${
              pin.length === 4
                ? 'bg-slate-950 text-white shadow-md'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
          Default Staff PIN: <span className="font-mono font-bold text-slate-600">1234</span>
        </div>

      </div>
    </div>
  );
}
