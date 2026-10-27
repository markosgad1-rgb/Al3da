import React, { useState, useMemo } from 'react';
import { 
  ArrowDownLeft, MapPin, CheckSquare, Square, Check, AlertTriangle, 
  X, Box, AlertCircle, Sparkles, User, FileText 
} from 'lucide-react';
import { Tool, Technician, Site, AppData } from '../types';
import { buildReturnWhatsAppMessage } from '../utils/formatters';

interface ReturnViewProps {
  data: AppData;
  onReturnSubmit: (payload: {
    siteName: string;
    returns: {
      toolCode: string;
      isKit: boolean;
      kitComplete: boolean;
      missingItemsNotes?: string;
    }[];
    returnedBy?: string;
    generalNotes?: string;
  }) => Promise<boolean>;
  onOpenWhatsApp: (message: string) => void;
  onCancel: () => void;
  onOpenToolDossier: (tool: Tool) => void;
}

export const ReturnView: React.FC<ReturnViewProps> = ({
  data,
  onReturnSubmit,
  onOpenWhatsApp,
  onCancel,
  onOpenToolDossier,
}) => {
  // Find all sites that currently have tools
  const sitesWithTools = useMemo(() => {
    const siteCounts: Record<string, number> = {};
    data.tools.forEach((t) => {
      if (t.status === 'في موقع' && t.currentSite) {
        siteCounts[t.currentSite] = (siteCounts[t.currentSite] || 0) + 1;
      }
    });
    return siteCounts;
  }, [data.tools]);

  const siteList = Object.keys(sitesWithTools);

  // Selected site
  const [selectedSiteName, setSelectedSiteName] = useState<string>(
    siteList.length > 0 ? siteList[0] : ''
  );

  // Tools present at selected site
  const toolsAtSite = useMemo(() => {
    if (!selectedSiteName) return [];
    return data.tools.filter(
      (t) => t.status === 'في موقع' && t.currentSite === selectedSiteName
    );
  }, [data.tools, selectedSiteName]);

  // Return item states: { [code]: { checked: boolean, kitComplete: boolean, missingNotes: string } }
  const [returnState, setReturnState] = useState<
    Record<string, { checked: boolean; kitComplete: boolean; missingNotes: string }>
  >({});

  const [returnedByTech, setReturnedByTech] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ensure state matches current tools
  const currentCheckedCodes = Object.keys(returnState).filter((c) => returnState[c]?.checked);

  const handleToggleCheck = (code: string) => {
    setReturnState((prev) => {
      const current = prev[code] || { checked: false, kitComplete: true, missingNotes: '' };
      return {
        ...prev,
        [code]: { ...current, checked: !current.checked },
      };
    });
  };

  const handleToggleKitComplete = (code: string, isComplete: boolean) => {
    setReturnState((prev) => {
      const current = prev[code] || { checked: true, kitComplete: true, missingNotes: '' };
      return {
        ...prev,
        [code]: { ...current, kitComplete: isComplete },
      };
    });
  };

  const handleMissingNotesChange = (code: string, notes: string) => {
    setReturnState((prev) => {
      const current = prev[code] || { checked: true, kitComplete: false, missingNotes: '' };
      return {
        ...prev,
        [code]: { ...current, missingNotes: notes },
      };
    });
  };

  // Select all tools at this site
  const handleSelectAll = () => {
    const allChecked = toolsAtSite.every((t) => returnState[t.code]?.checked);
    const newState: Record<string, { checked: boolean; kitComplete: boolean; missingNotes: string }> = { ...returnState };
    toolsAtSite.forEach((t) => {
      const current = newState[t.code] || { checked: false, kitComplete: true, missingNotes: '' };
      newState[t.code] = {
        ...current,
        checked: !allChecked,
      };
    });
    setReturnState(newState);
  };

  // Submit return
  const handleSubmitReturn = async () => {
    setErrorMessage(null);
    if (!selectedSiteName) {
      setErrorMessage('برجاء اختيار الموقع المراد تسجيل رجوع العدة منه');
      return;
    }

    const itemsToReturn = toolsAtSite.filter((t) => returnState[t.code]?.checked);
    if (itemsToReturn.length === 0) {
      setErrorMessage('برجاء تحديد قطعة عدة واحدة على الأقل لتسجيل رجوعها');
      return;
    }

    // Build payload
    const returnsPayload = itemsToReturn.map((t) => {
      const st = returnState[t.code];
      const isKit = t.type === 'طقم';
      return {
        toolCode: t.code,
        isKit,
        kitComplete: isKit ? st?.kitComplete ?? true : true,
        missingItemsNotes: isKit && !st?.kitComplete ? st?.missingNotes : undefined,
      };
    });

    setIsSubmitting(true);
    try {
      const ok = await onReturnSubmit({
        siteName: selectedSiteName,
        returns: returnsPayload,
        returnedBy: returnedByTech || undefined,
        generalNotes: generalNotes.trim() || undefined,
      });

      if (ok) {
        // Build return tools info for WhatsApp message
        const returnedToolsInfo = itemsToReturn.map((t) => {
          const st = returnState[t.code];
          const isKit = t.type === 'طقم';
          return {
            code: t.code,
            name: t.name,
            cabinet: t.cabinet,
            type: t.type,
            isKit,
            kitComplete: isKit ? (st?.kitComplete ?? true) : true,
            missingItemsNotes: isKit && !st?.kitComplete ? st?.missingNotes : undefined,
          };
        });

        const msg = buildReturnWhatsAppMessage({
          companyName: data.settings.companyName,
          siteName: selectedSiteName,
          returnedBy: returnedByTech,
          tools: returnedToolsInfo,
          generalNotes: generalNotes.trim(),
        });

        // Trigger WhatsApp Share Modal
        onOpenWhatsApp(msg);

        // Clear checked state
        setReturnState({});
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء تسجيل رجوع العدة');
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
            <span>تسجيل رجوع عدة</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              استلام المخزن
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            استلام العدة من الموقع وفحص اكتمال الأطقم وإعادتها لحالة "متاح"
          </p>
        </div>

        <button
          onClick={onCancel}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors"
          title="إلغاء والعودة"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="whitespace-pre-line leading-relaxed font-semibold">
            {errorMessage}
          </div>
        </div>
      )}

      {/* Site Selector Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs mb-4">
        <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-2.5">
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span>اختر الموقع الذي تريد إرجاع العدة منه:</span>
        </label>

        {siteList.length === 0 ? (
          <div className="p-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-300 text-xs text-slate-500">
            لا توجد حالياً أي عدة في المواقع الخارجية! جميع العدة متاحة في المخزن.
          </div>
        ) : (
          <div className="space-y-2">
            <select
              value={selectedSiteName}
              onChange={(e) => {
                setSelectedSiteName(e.target.value);
                setReturnState({});
              }}
              className="w-full h-12 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              {siteList.map((site) => (
                <option key={site} value={site}>
                  {site} (به {sitesWithTools[site]} قطعة/طقم)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tools At Site Checklist */}
      {selectedSiteName && toolsAtSite.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <div className="text-xs sm:text-sm font-bold text-slate-900">
                العدة الموجودة حالياً بموقع: <span className="text-emerald-700">{selectedSiteName}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                علم على القطع التي وصلت المخزن بالفعل
              </div>
            </div>

            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {toolsAtSite.every((t) => returnState[t.code]?.checked)
                  ? 'إلغاء تحديد الكل'
                  : 'تحديد الكل'}
              </span>
            </button>
          </div>

          {/* List of tools */}
          <div className="space-y-3">
            {toolsAtSite.map((tool) => {
              const state = returnState[tool.code] || { checked: false, kitComplete: true, missingNotes: '' };
              const isChecked = state.checked;

              return (
                <div
                  key={tool.code}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isChecked
                      ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex-1 cursor-pointer select-none"
                      onClick={() => handleToggleCheck(tool.code)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-slate-900 text-white">
                          {tool.code}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {tool.category}
                        </span>
                        {tool.type === 'طقم' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold flex items-center gap-1">
                            <Box className="w-3 h-3" />
                            <span>طقم</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-slate-800">
                        {tool.name}
                      </div>

                      {tool.currentTechnicians && tool.currentTechnicians.length > 0 && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          خرجت مع: <span className="font-medium text-slate-700">{tool.currentTechnicians.join('، ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleCheck(tool.code)}
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-all ${
                        isChecked
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                      }`}
                    >
                      <Check className={`w-5 h-5 ${isChecked ? 'stroke-[3]' : 'opacity-30'}`} />
                    </button>
                  </div>

                  {/* For Kits: Complete or Missing Items checklist */}
                  {tool.type === 'طقم' && isChecked && (
                    <div className="mt-3 pt-3 border-t border-emerald-200/80 bg-white/80 p-3 rounded-xl">
                      <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                        <Box className="w-3.5 h-3.5 text-amber-600" />
                        <span>محتويات الطقم المفترضة:</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mb-2.5">
                        {tool.kitItems || 'طقم كامل'}
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                          <input
                            type="radio"
                            name={`kit-status-${tool.code}`}
                            checked={state.kitComplete}
                            onChange={() => handleToggleKitComplete(tool.code, true)}
                            className="w-4 h-4 text-emerald-600"
                          />
                          <span className="text-emerald-700">الطقم كامل بدون نواقص ✅</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                          <input
                            type="radio"
                            name={`kit-status-${tool.code}`}
                            checked={!state.kitComplete}
                            onChange={() => handleToggleKitComplete(tool.code, false)}
                            className="w-4 h-4 text-rose-600"
                          />
                          <span className="text-rose-700">يوجد نواقص في الطقم ⚠️</span>
                        </label>
                      </div>

                      {!state.kitComplete && (
                        <div className="mt-2.5">
                          <label className="text-[11px] font-bold text-rose-800 block mb-1">
                            سجل القطع الناقصة في الطقم:
                          </label>
                          <input
                            type="text"
                            value={state.missingNotes}
                            onChange={(e) => handleMissingNotesChange(tool.code, e.target.value)}
                            placeholder="مثال: مفقود بنطة 8 مم، إزميل عريض غير موجود"
                            className="w-full h-9 px-3 rounded-lg bg-rose-50/50 border border-rose-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Returning Technician & Notes */}
          <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                الفني الذي قام بتسليم العدة (اختياري):
              </label>
              <select
                value={returnedByTech}
                onChange={(e) => setReturnedByTech(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium"
              >
                <option value="">-- اختياري --</option>
                {data.technicians.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                ملاحظات عامة على الاستلام:
              </label>
              <input
                type="text"
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="مثال: تم التأكد من نظافة العدة وشحن البطاريات"
                className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium"
              />
            </div>
          </div>

          {/* Sticky Return Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSubmitReturn}
              disabled={isSubmitting || currentCheckedCodes.length === 0}
              className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>
                {isSubmitting
                  ? 'جاري الحفظ...'
                  : `تأكيد رجوع (${currentCheckedCodes.length}) قطعة للمخزن المركزي`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
