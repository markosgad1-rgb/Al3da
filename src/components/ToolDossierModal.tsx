import React from 'react';
import { X, Wrench, MapPin, User, Calendar, History, Box, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Tool, Transaction } from '../types';
import { formatDateArabic, formatDurationArabic } from '../utils/formatters';

interface ToolDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  tool: Tool | null;
  transactions: Transaction[];
  onStatusChange?: (status: Tool['status'], notes?: string) => void;
  isAdmin?: boolean;
}

export const ToolDossierModal: React.FC<ToolDossierModalProps> = ({
  isOpen,
  onClose,
  tool,
  transactions,
  onStatusChange,
  isAdmin = false,
}) => {
  if (!isOpen || !tool) return null;

  // Filter transactions for this tool, sorted latest first
  const toolHistory = transactions
    .filter((tx) => tx.toolCode.toLowerCase() === tool.code.toLowerCase())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getStatusBadge = (status: Tool['status']) => {
    switch (status) {
      case 'متاح':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            متاح بالمخزن
          </span>
        );
      case 'في موقع':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            في موقع خارجي
          </span>
        );
      case 'صيانة':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            تحت الصيانة
          </span>
        );
      case 'مفقود':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            مفقود
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-mono font-black text-sm tracking-wider shadow-sm">
              {tool.code}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight text-white">{tool.name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>دولاب {tool.cabinet}</span>
                <span>·</span>
                <span>{tool.category}</span>
                <span>·</span>
                <span>{tool.type}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Current Status Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500 font-medium mb-1">الحالة الراهنة</div>
              <div>{getStatusBadge(tool.status)}</div>
            </div>

            {tool.status === 'في موقع' && (
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium">الموقع والفني:</div>
                <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>{tool.currentSite}</span>
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{(tool.currentTechnicians || []).join('، ')}</span>
                  <span>·</span>
                  <span className="font-semibold text-amber-700">{formatDurationArabic(tool.checkoutDate)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Kit Contents if Kit */}
          {tool.type === 'طقم' && (
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-2">
                <Box className="w-4 h-4 text-amber-700" />
                <span>محتويات الطقم والأعداد:</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                {tool.kitItems || 'لم يتم تسجيل قائمة محتويات مفصلة'}
              </p>
            </div>
          )}

          {/* Notes if any */}
          {tool.notes && (
            <div className="text-xs text-slate-600 bg-slate-100 p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800">ملاحظات العدة: </span>
              {tool.notes}
            </div>
          )}

          {/* Admin Status Switcher */}
          {isAdmin && onStatusChange && (
            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200">
              <div className="text-xs font-bold text-slate-700 mb-2">تعديل الحالة السريع (المسؤول):</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onStatusChange('متاح')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    tool.status === 'متاح'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-emerald-50 border border-slate-200'
                  }`}
                >
                  متاح بالمخزن
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('سبب إرسال العدة للصيانة:');
                    if (reason !== null) onStatusChange('صيانة', reason);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    tool.status === 'صيانة'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-200'
                  }`}
                >
                  إرسال للصيانة
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('ملاحظات فقدان العدة:');
                    if (reason !== null) onStatusChange('مفقود', reason);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    tool.status === 'مفقود'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-rose-50 border border-slate-200'
                  }`}
                >
                  تسجيل كمفقود
                </button>
              </div>
            </div>
          )}

          {/* Lifetime Transaction History */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-900">سجل حركات العدة عبر التاريخ ({toolHistory.length})</h3>
            </div>

            {toolHistory.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                لا توجد حركات مسجلة لهذه العدة بعد
              </div>
            ) : (
              <div className="space-y-2.5">
                {toolHistory.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            tx.type === 'خروج'
                              ? 'bg-amber-100 text-amber-800'
                              : tx.type === 'رجوع'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.type === 'نقل'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {tx.type}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {tx.type === 'نقل'
                            ? `نقل من [${tx.fromSite}] إلى [${tx.toSite}]`
                            : tx.site
                            ? `الموقع: ${tx.site}`
                            : ''}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">{formatDateArabic(tx.timestamp)}</span>
                    </div>

                    {tx.technicians && tx.technicians.length > 0 && (
                      <div className="text-slate-500">
                        الفني: <span className="font-medium text-slate-700">{tx.technicians.join('، ')}</span>
                      </div>
                    )}

                    {tx.kitComplete === false && (
                      <div className="text-rose-600 font-semibold">
                        نواقص الطقم المسجلة: {tx.missingItemsNotes || 'غير محددة'}
                      </div>
                    )}

                    {tx.notes && (
                      <div className="text-slate-500 italic">
                        {tx.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
