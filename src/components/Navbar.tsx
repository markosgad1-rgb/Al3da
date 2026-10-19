import React from 'react';
import { Wrench, Shield, RefreshCw, Smartphone, HardHat } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isAdminLoggedIn: boolean;
  onAdminClick: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  companyName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  isAdminLoggedIn,
  onAdminClick,
  onRefresh,
  isRefreshing,
  companyName,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand Zone: Clean Title & Icon */}
        <div 
          onClick={() => onTabChange('home')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-105">
            <Wrench className="w-5 h-5 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
              عدة التركيبات
            </h1>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[150px] sm:max-w-xs">
              {companyName}
            </p>
          </div>
        </div>

        {/* Desktop Nav Links (Hidden on small mobile) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => onTabChange('checkout')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              currentTab === 'checkout'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            خروج عدة
          </button>
          <button
            onClick={() => onTabChange('return')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              currentTab === 'return'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            رجوع عدة
          </button>
          <button
            onClick={() => onTabChange('transfer')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              currentTab === 'transfer'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            نقل بين مواقع
          </button>
          <button
            onClick={() => onTabChange('dashboard')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              currentTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            لوحة المتابعة
          </button>
        </nav>

        {/* Action Zone: Refresh & Admin Toggle */}
        <div className="flex items-center gap-2">
          {/* Central Live Sync Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[11px] font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>بيانات مركزية متزامنة</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="تحديث البيانات لحظياً"
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          {/* Admin Mode Button */}
          <button
            onClick={onAdminClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
              isAdminLoggedIn
                ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{isAdminLoggedIn ? 'المسؤول (مفتوح)' : 'لوحة المسؤول'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
