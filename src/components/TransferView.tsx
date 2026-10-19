import React, { useState, useMemo } from 'react';
import { 
  Repeat, MapPin, User, Check, X, ArrowLeft, AlertCircle, Package, Plus 
} from 'lucide-react';
import { Tool, Technician, Site, AppData } from '../types';
import { buildTransferWhatsAppMessage } from '../utils/formatters';

interface TransferViewProps {
  data: AppData;
  onTransferSubmit: (payload: {
    toolCodes: string[];
    fromSite: string;
    toSite: string;
    newToSiteAddress?: string;
    technicianName: string;
    notes?: string;
  }) => Promise<boolean>;
  onOpenWhatsApp: (message: string) => void;
  onCancel: () => void;
}

export const TransferView: React.FC<TransferViewProps> = ({
  data,
  onTransferSubmit,
  onOpenWhatsApp,
  onCancel,
}) => {
  // Sites that currently have tools
  const sitesWithTools = useMemo(() => {
    const list = Array.from(
      new Set(
        data.tools
          .filter((t) => t.status === 'في موقع' && t.currentSite)
          .map((t) => t.currentSite!)
      )
    );
    return list;
  }, [data.tools]);

  const [fromSite, setFromSite] = useState<string>(
    sitesWithTools.length > 0 ? sitesWithTools[0] : ''
  );
  const [selectedToolCodes, setSelectedToolCodes] = useState<string[]>([]);
  const [toSite, setToSite] = useState<string>('');
  const [isAddingNewToSite, setIsAddingNewToSite] = useState(false);
  const [newToSiteName, setNewToSiteName] = useState('');
  const [newToSiteAddress, setNewToSiteAddress] = useState('');
  const [transferTech, setTransferTech] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tools present at fromSite
  const toolsAtFromSite = useMemo(() => {
    if (!fromSite) return [];
    return data.tools.filter((t) => t.status === 'في موقع' && t.currentSite === fromSite);
  }, [data.tools, fromSite]);

  const handleToggleTool = (code: string) => {
    setSelectedToolCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSelectAllAtSite = () => {
    const codes = toolsAtFromSite.map((t) => t.code);
    const allSelected = codes.every((c) => selectedToolCodes.includes(c));
    if (allSelected) {
      setSelectedToolCodes([]);
    } else {
      setSelectedToolCodes(codes);
    }
  };

  const handleTransferSubmit = async () => {
    setErrorMessage(null);
    if (!fromSite) {
      setErrorMessage('يرجى تحديد الموقع المنقول منه');
      return;
    }
    if (selectedToolCodes.length === 0) {
      setErrorMessage('يرجى اختيار قطعة واحدة على الأقل للنقل');
      return;
    }
    const finalToSite = isAddingNewToSite ? newToSiteName.trim() : toSite.trim();
    if (!finalToSite) {
      setErrorMessage('يرجى تحديد الموقع الجديد المنقول إليه');
      return;
    }
    if (finalToSite === fromSite) {
      setErrorMessage('لا يمكن النقل إلى نفس الموقع الحالي!');
      return;
    }
    if (!transferTech) {
      setErrorMessage('يرجى اختيار الفني المسؤول عن عملية النقل');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await onTransferSubmit({
        toolCodes: selectedToolCodes,
        fromSite,
        toSite: finalToSite,
        newToSiteAddress: isAddingNewToSite ? newToSiteAddress.trim() : undefined,
        technicianName: transferTech,
        notes: notes.trim(),
      });

      if (ok) {
        const transferredTools = data.tools.filter((t) => selectedToolCodes.includes(t.code));
        const msg = buildTransferWhatsAppMessage({
          fromSite,
          toSite: finalToSite,
          technicianName: transferTech,
          tools: transferredTools,
          notes,
        });
        onOpenWhatsApp(msg);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء نقل العدة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-24 pt-2 max-w-4xl mx-auto px-3 sm:px-4">
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>نقل عدة بين مواقع</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 font-bold">
              نقل مباشر بدون رجوع المخزن
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            تحويل العدة من موقع لموقع آخر مع الحفاظ على سجل الحركة ومسؤولية الفني
          </p>
        </div>

        <button
          onClick={onCancel}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="whitespace-pre-line leading-relaxed font-semibold">{errorMessage}</div>
        </div>
      )}

      {sitesWithTools.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Repeat className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">لا توجد عدة في المواقع لنقلها</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            جميع قطع العدة متواجدة حالياً بالمخزن الرئيسي. يمكنك تسجيل خروج جديد بدلاً من النقل.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Step 1: From Site */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-2">
              <MapPin className="w-4 h-4 text-rose-600" />
              <span>1. الموقع الحالي (المنقول منه):</span>
            </label>
            <select
              value={fromSite}
              onChange={(e) => {
                setFromSite(e.target.value);
                setSelectedToolCodes([]);
              }}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-bold"
            >
              {sitesWithTools.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Choose tools to transfer */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>2. اختر القطع المراد نقلها:</span>
              </label>

              <button
                type="button"
                onClick={handleSelectAllAtSite}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                تحديد الكل
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
              {toolsAtFromSite.map((t) => {
                const isSelected = selectedToolCodes.includes(t.code);
                return (
                  <div
                    key={t.code}
                    onClick={() => handleToggleTool(t.code)}
                    className={`min-h-[50px] p-3 rounded-xl border text-right cursor-pointer select-none transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400 font-bold'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-900 text-white">
                          {t.code}
                        </span>
                        <span className="text-xs text-slate-800">{t.name}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Destination Site */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>3. الموقع الجديد (المنقول إليه):</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingNewToSite(!isAddingNewToSite)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                {isAddingNewToSite ? 'اختيار موقع مسجل' : '+ موقع جديد'}
              </button>
            </div>

            {!isAddingNewToSite ? (
              <select
                value={toSite}
                onChange={(e) => setToSite(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-medium"
              >
                <option value="">-- اضغط لاختيار الموقع الجديد --</option>
                {data.sites
                  .filter((s) => s.active && s.name !== fromSite)
                  .map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
              </select>
            ) : (
              <div className="space-y-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-200">
                <input
                  type="text"
                  value={newToSiteName}
                  onChange={(e) => setNewToSiteName(e.target.value)}
                  placeholder="اسم الموقع الجديد"
                  className="w-full h-10 px-3 rounded-lg bg-white border border-indigo-300 text-xs font-medium"
                />
                <input
                  type="text"
                  value={newToSiteAddress}
                  onChange={(e) => setNewToSiteAddress(e.target.value)}
                  placeholder="عنوان الموقع (اختياري)"
                  className="w-full h-9 px-3 rounded-lg bg-white border border-indigo-300 text-xs font-medium"
                />
              </div>
            )}
          </div>

          {/* Step 4: Tech & Notes */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>الفني القائم بالنقل:</span>
              </label>
              <select
                value={transferTech}
                onChange={(e) => setTransferTech(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
              >
                <option value="">-- اختر الفني --</option>
                {data.technicians
                  .filter((t) => t.active)
                  .map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                ملاحظات النقل:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: تم النقل بعربية الشركة..."
                className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium"
              />
            </div>
          </div>

          {/* Submit Transfer Button */}
          <button
            type="button"
            onClick={handleTransferSubmit}
            disabled={isSubmitting || selectedToolCodes.length === 0}
            className="w-full min-h-[50px] rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <Repeat className="w-5 h-5" />
            <span>
              {isSubmitting
                ? 'جاري حفظ النقل...'
                : `تأكيد نقل (${selectedToolCodes.length}) قطعة للموقع الجديد`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
