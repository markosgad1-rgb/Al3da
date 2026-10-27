import React from 'react';
import { 
  ArrowUpRight, ArrowDownLeft, Repeat, BarChart3, Wrench, 
  MapPin, AlertTriangle, ShieldCheck, Clock, CheckCircle2, ChevronLeft, Search
} from 'lucide-react';
import { AppData, Tool } from '../types';
import { formatDateArabic, getDaysSince } from '../utils/formatters';

interface HomeHubViewProps {
  data: AppData;
  onNavigate: (tab: 'checkout' | 'return' | 'transfer' | 'dashboard' | 'admin') => void;
  onOpenToolDossier: (tool: Tool) => void;
}

export const HomeHubView: React.FC<HomeHubViewProps> = ({
  data,
  onNavigate,
  onOpenToolDossier,
}) => {
  const thresholdDays = data.settings.overdueDaysThreshold || 7;
  const inSiteCount = data.tools.filter((t) => t.status === 'في موقع').length;
  const availableCount = data.tools.filter((t) => t.status === 'متاح').length;
  const overdueCount = data.tools.filter(
    (t) => t.status === 'في موقع' && t.checkoutDate && getDaysSince(t.checkoutDate) >= thresholdDays
  ).length;

  const recentTransactions = data.transactions.slice(0, 4);

  return (
    <div className="pb-24 pt-3 max-w-4xl mx-auto px-3 sm:px-4 space-y-5">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-5 sm:p-6 border border-slate-700 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>نظام دواليب العدة الميداني</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
            مرحباً بك في نظام عدة التركيبات
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            سجّل خروج ورجوع المعدات والأطقم بنقرة واحدة، وتعرف فوراً على مكان كل قطعة مع أي فني وفي أي موقع.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-700/60">
            <div>
              <div className="text-[11px] text-slate-400">متاح بالمخزن</div>
              <div className="text-lg sm:text-xl font-black text-emerald-400 tabular-nums">
                {availableCount} <span className="text-xs font-normal">قطعة</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">في المواقع</div>
              <div className="text-lg sm:text-xl font-black text-amber-400 tabular-nums">
                {inSiteCount} <span className="text-xs font-normal">قطعة</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">متأخرة ({thresholdDays}+ يوم)</div>
              <div className={`text-lg sm:text-xl font-black tabular-nums ${overdueCount > 0 ? 'text-rose-400 font-extrabold' : 'text-slate-400'}`}>
                {overdueCount} <span className="text-xs font-normal">قطعة</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Warning Strip if any */}
      {overdueCount > 0 && (
        <div
          onClick={() => onNavigate('dashboard')}
          className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-center justify-between cursor-pointer hover:bg-rose-100/70 transition-all shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black">
                تنبيه: يوجد {overdueCount} قطع عدة متأخرة في المواقع أكثر من {thresholdDays} أيام!
              </div>
              <div className="text-[11px] text-rose-700">اضغط لعرض تفاصيل المتأخرات ومتابعتها فوراً</div>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-rose-600 shrink-0" />
        </div>
      )}

      {/* PRIMARY ACTION BUTTONS - LARGE TACTILE 48px+ TOUCH TARGETS */}
      <div>
        <div className="text-xs font-bold text-slate-500 mb-2 px-1">العمليات السريعة:</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Button 1: خروج عدة */}
          <button
            onClick={() => onNavigate('checkout')}
            className="group min-h-[90px] p-4 rounded-3xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-black shadow-lg shadow-amber-500/20 text-right transition-all flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight">خروج عدة تركيبات</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-950 text-white font-bold">
                  صباحاً
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-900/80 mt-1">
                تسليم فني أو فريق وخروج لموقع مع مشاركة واتساب
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
            </div>
          </button>

          {/* Button 2: رجوع عدة */}
          <button
            onClick={() => onNavigate('return')}
            className="group min-h-[90px] p-4 rounded-3xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black shadow-lg shadow-emerald-700/20 text-right transition-all flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight">رجوع عدة للمخزن</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white text-emerald-900 font-bold">
                  استلام
                </span>
              </div>
              <p className="text-xs font-medium text-emerald-100 mt-1">
                استلام بالموقع وفحص اكتمال الأطقم وتأكيد السلامة
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white text-emerald-700 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <ArrowDownLeft className="w-6 h-6 stroke-[2.5]" />
            </div>
          </button>

          {/* Button 3: نقل بين مواقع */}
          <button
            onClick={() => onNavigate('transfer')}
            className="group min-h-[80px] p-4 rounded-3xl bg-white hover:bg-slate-50 border border-slate-200 active:scale-[0.98] text-slate-900 font-black shadow-xs text-right transition-all flex items-center justify-between"
          >
            <div>
              <div className="text-base font-black tracking-tight text-slate-900">
                نقل مباشر بين موقعين
              </div>
              <p className="text-xs font-normal text-slate-500 mt-0.5">
                تحويل العدة من موقع لآخر دون العودة للمخزن
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Repeat className="w-5 h-5" />
            </div>
          </button>

          {/* Button 4: لوحة المتابعة */}
          <button
            onClick={() => onNavigate('dashboard')}
            className="group min-h-[80px] p-4 rounded-3xl bg-white hover:bg-slate-50 border border-slate-200 active:scale-[0.98] text-slate-900 font-black shadow-xs text-right transition-all flex items-center justify-between"
          >
            <div>
              <div className="text-base font-black tracking-tight text-slate-900">
                لوحة المتابعة والإحصائيات
              </div>
              <p className="text-xs font-normal text-slate-500 mt-0.5">
                عرض الدواليب، المواقع، الفنيين، والسجل الكامل
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
          </button>
        </div>
      </div>

      {/* Single Cabinet Overview Card (دولاب العدة الموحد) */}
      <div 
        onClick={() => onNavigate('dashboard')}
        className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-amber-400 cursor-pointer transition-all group"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              🗄️
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 group-hover:text-amber-700 transition-colors">
                دولاب العدة (المخزن الرئيسي)
              </div>
              <div className="text-[11px] text-slate-400 font-medium">مستودع العُدة الموحد للورشة والمشاريع</div>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/60">
            {data.tools.length} قطعة مسجلة
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-right">
            <div className="text-[11px] font-bold text-emerald-800">متاح بالدولاب الآن</div>
            <div className="text-base font-black text-emerald-700 mt-1 tabular-nums">
              {data.tools.filter((t) => t.status === 'متاح').length} <span className="text-xs font-normal">قطعة</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100 text-right">
            <div className="text-[11px] font-bold text-amber-800">خارج في مواقع</div>
            <div className="text-base font-black text-amber-700 mt-1 tabular-nums">
              {data.tools.filter((t) => t.status === 'في موقع').length} <span className="text-xs font-normal">قطعة</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-right">
            <div className="text-[11px] font-bold text-slate-700">صيانة / أخرى</div>
            <div className="text-base font-black text-slate-800 mt-1 tabular-nums">
              {data.tools.filter((t) => t.status === 'صيانة' || t.status === 'مفقود').length} <span className="text-xs font-normal">قطعة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Movements Ticker */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-slate-700">آخر حركات مسجلة بالنظام:</div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <span>عرض كل السجل</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {recentTransactions.map((tx) => (
            <div
              key={tx.id}
              className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                    tx.type === 'خروج'
                      ? 'bg-amber-100 text-amber-800'
                      : tx.type === 'رجوع'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {tx.type}
                </span>
                <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {tx.toolCode}
                </span>
                <span className="font-bold text-slate-800 truncate max-w-[150px] sm:max-w-xs">
                  {tx.toolName}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 shrink-0">
                {formatDateArabic(tx.timestamp)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
