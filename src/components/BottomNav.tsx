import React from 'react';
import { Home, ArrowUpRight, ArrowDownLeft, Repeat, BarChart3, Settings } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isAdminLoggedIn: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  isAdminLoggedIn,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe shadow-2xl">
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-1">
        {/* الرئيسية */}
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
            currentTab === 'home' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">الرئيسية</span>
        </button>

        {/* خروج */}
        <button
          onClick={() => onTabChange('checkout')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
            currentTab === 'checkout' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentTab === 'checkout' ? 'bg-amber-400/20' : ''}`}>
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <span className="text-[10px] leading-tight">خروج</span>
        </button>

        {/* رجوع */}
        <button
          onClick={() => onTabChange('return')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
            currentTab === 'return' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentTab === 'return' ? 'bg-amber-400/20' : ''}`}>
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <span className="text-[10px] leading-tight">رجوع</span>
        </button>

        {/* نقل */}
        <button
          onClick={() => onTabChange('transfer')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
            currentTab === 'transfer' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Repeat className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">نقل</span>
        </button>

        {/* المتابعة / الإدارة */}
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
            currentTab === 'dashboard' || currentTab === 'admin'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">المتابعة</span>
        </button>
      </div>
    </div>
  );
};
