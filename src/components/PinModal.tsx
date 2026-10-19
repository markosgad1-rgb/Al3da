import React, { useState } from 'react';
import { Lock, X, Check, Delete } from 'lucide-react';
import { Technician } from '../types';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  technician: Technician;
  onSuccess: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  technician,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);

      if (nextPin.length === 4) {
        if (nextPin === technician.pin) {
          setTimeout(() => {
            onSuccess();
            onClose();
            setPin('');
          }, 150);
        } else {
          setError(true);
          setTimeout(() => setPin(''), 600);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xs bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 flex flex-col items-center"
        dir="rtl"
      >
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-slate-900 text-center">أدخل الرقم السري</h3>
        <p className="text-xs text-slate-500 text-center mb-4">
          الفني: <span className="font-semibold text-slate-800">{technician.name}</span>
        </p>

        {/* PIN Dots */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map((idx) => {
            const filled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  error
                    ? 'bg-rose-500 scale-110'
                    : filled
                    ? 'bg-amber-500 scale-110 shadow-sm'
                    : 'bg-slate-200'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-xs text-rose-600 font-semibold mb-3 animate-shake">
            الرقم السري غير صحيح، حاول مرة أخرى
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => handleDigit(d)}
              className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xl flex items-center justify-center transition-all shadow-xs"
            >
              {d}
            </button>
          ))}
          <button
            onClick={onClose}
            className="h-14 rounded-2xl text-slate-500 hover:bg-slate-100 active:scale-95 text-xs font-semibold flex items-center justify-center transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xl flex items-center justify-center transition-all shadow-xs"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 flex items-center justify-center transition-all"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
