import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Check, MapPin, Users, Package, AlertCircle, 
  Layers, CheckSquare, Square, ChevronRight, X, ArrowLeft,
  Sparkles, FileText, Send
} from 'lucide-react';
import { Tool, Technician, Site, AppData } from '../types';
import { buildCheckoutWhatsAppMessage } from '../utils/formatters';

interface CheckoutViewProps {
  data: AppData;
  onCheckoutSubmit: (payload: {
    toolCodes: string[];
    technicianNames: string[];
    siteId?: string;
    siteName?: string;
    newSiteAddress?: string;
    notes?: string;
  }) => Promise<boolean>;
  onOpenWhatsApp: (message: string) => void;
  onOpenToolDossier: (tool: Tool) => void;
  onCancel: () => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  data,
  onCheckoutSubmit,
  onOpenWhatsApp,
  onOpenToolDossier,
  onCancel,
}) => {
  // Wizard steps: 'select' -> 'confirm'
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  // Form State
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [isAddingNewSite, setIsAddingNewSite] = useState<boolean>(false);
  const [newSiteName, setNewSiteName] = useState<string>('');
  const [newSiteAddress, setNewSiteAddress] = useState<string>('');
  const [selectedToolCodes, setSelectedToolCodes] = useState<string[]>([]);
  const [checkoutNotes, setCheckoutNotes] = useState<string>('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cabinetFilter, setCabinetFilter] = useState<'all' | '1' | '2' | '3'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Submitting status & error message
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter tools
  const filteredTools = useMemo(() => {
    return data.tools.filter((t) => {
      // Cabinet filter
      if (cabinetFilter !== 'all' && t.cabinet !== cabinetFilter) return false;
      // Category filter
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      // Search query (code or name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = t.code.toLowerCase().includes(q);
        const nameMatch = t.name.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch) return false;
      }
      return true;
    });
  }, [data.tools, cabinetFilter, categoryFilter, searchQuery]);

  // Available vs Unavailable inside filtered
  const availableTools = useMemo(
    () => filteredTools.filter((t) => t.status === 'متاح'),
    [filteredTools]
  );
  const unavailableTools = useMemo(
    () => filteredTools.filter((t) => t.status !== 'متاح'),
    [filteredTools]
  );

  const activeSites = data.sites.filter((s) => s.active);
  const activeTechnicians = data.technicians.filter((t) => t.active);

  // Toggle tool selection
  const handleToggleTool = (code: string) => {
    setSelectedToolCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Toggle technician selection
  const handleToggleTech = (name: string) => {
    setSelectedTechs((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  // Quick Select All Available in current filter
  const handleSelectAllAvailable = () => {
    const codes = availableTools.map((t) => t.code);
    const allSelected = codes.every((c) => selectedToolCodes.includes(c));
    if (allSelected) {
      setSelectedToolCodes((prev) => prev.filter((c) => !codes.includes(c)));
    } else {
      setSelectedToolCodes((prev) => Array.from(new Set([...prev, ...codes])));
    }
  };

  // Validation before going to confirmation
  const handleProceedToConfirm = () => {
    setErrorMessage(null);
    if (selectedTechs.length === 0) {
      setErrorMessage('برجاء اختيار فني مستلم واحد على الأقل (أو فريق العمل)');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!isAddingNewSite && !selectedSiteId) {
      setErrorMessage('برجاء اختيار موقع العمل أو إضافة موقع جديد');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (isAddingNewSite && !newSiteName.trim()) {
      setErrorMessage('برجاء كتابة اسم الموقع الجديد');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (selectedToolCodes.length === 0) {
      setErrorMessage('برجاء اختيار قطعة عدة واحدة على الأقل');
      return;
    }
    setStep('confirm');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final submit handler
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const siteName = isAddingNewSite
      ? newSiteName.trim()
      : data.sites.find((s) => s.id === selectedSiteId)?.name || '';

    try {
      const ok = await onCheckoutSubmit({
        toolCodes: selectedToolCodes,
        technicianNames: selectedTechs,
        siteId: isAddingNewSite ? undefined : selectedSiteId,
        siteName,
        newSiteAddress: isAddingNewSite ? newSiteAddress.trim() : undefined,
        notes: checkoutNotes.trim(),
      });

      if (ok) {
        // Build and trigger WhatsApp modal
        const selectedToolObjects = data.tools.filter((t) =>
          selectedToolCodes.includes(t.code)
        );
        const msg = buildCheckoutWhatsAppMessage({
          companyName: data.settings.companyName,
          siteName,
          technicians: selectedTechs,
          tools: selectedToolObjects,
          notes: checkoutNotes,
        });
        onOpenWhatsApp(msg);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ خروج العدة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedToolObjects = useMemo(
    () => data.tools.filter((t) => selectedToolCodes.includes(t.code)),
    [data.tools, selectedToolCodes]
  );

  const targetSiteName = isAddingNewSite
    ? newSiteName.trim() || 'موقع جديد'
    : data.sites.find((s) => s.id === selectedSiteId)?.name || '';

  return (
    <div className="pb-24 pt-2 max-w-4xl mx-auto px-3 sm:px-4">
      {/* Title & Step Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>تسجيل خروج عدة</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold">
              {step === 'select' ? 'خطوة 1 من 2' : 'تأكيد الخروج'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            تحديد الفنيين، الموقع، والقطع المراد إخراجها مع إمكانية مشاركة إذن الخروج
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

      {/* Error Alert if any */}
      {errorMessage && (
        <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="whitespace-pre-line leading-relaxed font-semibold">
            {errorMessage}
          </div>
        </div>
      )}

      {/* STEP 1: SELECTION */}
      {step === 'select' && (
        <div className="space-y-5">
          {/* Section 1: Technicians Selection */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-600" />
                <span>1. اختيار الفني أو فريق العمل:</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                (يمكن اختيار أكثر من فني)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activeTechnicians.map((tech) => {
                const isSelected = selectedTechs.includes(tech.name);
                return (
                  <button
                    key={tech.id}
                    type="button"
                    onClick={() => handleToggleTech(tech.name)}
                    className={`min-h-[46px] p-2.5 rounded-xl border text-right transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="truncate">
                      <div className="text-xs font-bold truncate">{tech.name}</div>
                      {tech.phone && (
                        <div className={`text-[10px] truncate ${isSelected ? 'text-slate-900/80' : 'text-slate-400'}`}>
                          {tech.phone}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-slate-950 shrink-0" />}
                  </button>
                );
              })}
            </div>
            {selectedTechs.length > 0 && (
              <div className="mt-2 text-xs text-amber-800 font-medium flex items-center gap-1">
                <span>الفريق المختار:</span>
                <span className="font-bold">{selectedTechs.join(' + ')}</span>
              </div>
            )}
          </div>

          {/* Section 2: Site Selection */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>2. موقع العمل:</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNewSite(!isAddingNewSite);
                  setSelectedSiteId('');
                }}
                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                {isAddingNewSite ? 'اختيار من المواقع المسجلة' : '+ إضافة موقع جديد'}
              </button>
            </div>

            {!isAddingNewSite ? (
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="w-full h-12 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- اضغط لاختيار موقع العمل --</option>
                {activeSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} {site.address ? `(${site.address})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2 p-3 bg-amber-50/50 rounded-xl border border-amber-200 animate-in fade-in">
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">
                    اسم الموقع الجديد:
                  </label>
                  <input
                    type="text"
                    value={newSiteName}
                    onChange={(e) => setNewSiteName(e.target.value)}
                    placeholder="مثال: مستشفى السلام - المعادي"
                    className="w-full h-11 px-3 rounded-lg bg-white border border-amber-300 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-amber-800 block mb-1">
                    عنوان أو وصف الموقع (اختياري):
                  </label>
                  <input
                    type="text"
                    value={newSiteAddress}
                    onChange={(e) => setNewSiteAddress(e.target.value)}
                    placeholder="مثال: مبنى العيادات الخارجية - الدور الثاني"
                    className="w-full h-10 px-3 rounded-lg bg-white border border-amber-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Tool Selection & Search */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-600" />
                <span>3. اختيار العدة المراد إخراجها:</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllAvailable}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                  <span>تحديد كل المتاح</span>
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث برقم العدة (DR-01) أو اسم العدة (ماكيتا، هيلتي، ميزان)..."
                className="w-full h-11 pr-10 pl-4 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-3 p-0.5 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Tabs: Cabinets */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-none">
              <span className="text-[11px] text-slate-400 font-semibold shrink-0 ml-1">
                الدولاب:
              </span>
              {[
                { id: 'all', label: 'الكل' },
                { id: '1', label: 'دولاب 1 (كهربائي)' },
                { id: '2', label: 'دولاب 2 (أطقم وقياس)' },
                { id: '3', label: 'دولاب 3 (سلالم وموقع)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCabinetFilter(tab.id as any)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg shrink-0 transition-colors ${
                    cabinetFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Available Tools Grid */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-emerald-700 flex items-center justify-between">
                <span>القطع المتاحة في المخزن ({availableTools.length}):</span>
                {selectedToolCodes.length > 0 && (
                  <span className="text-amber-700 font-extrabold">
                    تم اختيار ({selectedToolCodes.length}) قطعة
                  </span>
                )}
              </div>

              {availableTools.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  لا توجد عدة متاحة مطابقة للبحث في هذا الدولاب
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableTools.map((tool) => {
                    const isChecked = selectedToolCodes.includes(tool.code);
                    return (
                      <div
                        key={tool.code}
                        onClick={() => handleToggleTool(tool.code)}
                        className={`min-h-[58px] p-3 rounded-xl border text-right cursor-pointer select-none transition-all flex items-start justify-between gap-2.5 ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-slate-900 text-white">
                              {tool.code}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                              دولاب {tool.cabinet}
                            </span>
                            {tool.type === 'طقم' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                                طقم
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-slate-800 leading-tight">
                            {tool.name}
                          </div>
                          {tool.type === 'طقم' && tool.kitItems && (
                            <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                              محتويات: {tool.kitItems}
                            </div>
                          )}
                        </div>

                        {/* Checkbox Icon */}
                        <div className="shrink-0 mt-0.5">
                          {isChecked ? (
                            <div className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md border-2 border-slate-300"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Unavailable Tools (Muted Gray with Site Location Badge) */}
              {unavailableTools.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 mb-2">
                    القطع غير المتاحة حالياً ({unavailableTools.length}) - لا يمكن إخراجها:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 opacity-60">
                    {unavailableTools.map((tool) => (
                      <div
                        key={tool.code}
                        onClick={() => onOpenToolDossier(tool)}
                        className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-right cursor-pointer hover:opacity-100 transition-opacity"
                        title="اضغط لمعاينة سجل العدة"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-xs text-slate-700">
                            {tool.code}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                            {tool.status === 'في موقع'
                              ? `في موقع: ${tool.currentSite || 'موقع خارجي'}`
                              : tool.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-700 truncate">{tool.name}</div>
                        {tool.currentTechnicians && tool.currentTechnicians.length > 0 && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            مع: {tool.currentTechnicians.join('، ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="fixed bottom-16 md:bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl z-30">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-slate-500">تم اختيار: </span>
                <span className="font-black text-amber-600 text-sm">
                  {selectedToolCodes.length}
                </span>
                <span className="text-slate-500"> قطعة</span>
              </div>

              <button
                type="button"
                onClick={handleProceedToConfirm}
                disabled={selectedToolCodes.length === 0}
                className="min-h-[46px] px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-black text-sm shadow-md flex items-center gap-2 transition-all"
              >
                <span>متابعة لتأكيد الخروج</span>
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: CONFIRMATION SUMMARY */}
      {step === 'confirm' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-lg space-y-5 animate-in fade-in">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">مراجعة وتأكيد إذن الخروج</h3>
              <p className="text-xs text-slate-500">تأكد من صحة البيانات قبل حفظ الحركة في السجل</p>
            </div>
            <button
              onClick={() => setStep('select')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <span>تعديل الاختيارات</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Site & Tech Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>موقع العمل:</span>
              </div>
              <div className="text-sm font-black text-slate-800">{targetSiteName}</div>
              {isAddingNewSite && newSiteAddress && (
                <div className="text-xs text-slate-500 mt-0.5">{newSiteAddress}</div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                <span>الفريق المستلم:</span>
              </div>
              <div className="text-sm font-black text-slate-800">
                {selectedTechs.join(' + ')}
              </div>
            </div>
          </div>

          {/* Tools List */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>العدة المراد إخراجها ({selectedToolObjects.length} قطعة):</span>
              <span className="text-[11px] text-amber-700 font-medium">سيتم تغيير حالتها إلى "في موقع"</span>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-200">
              {selectedToolObjects.map((t, idx) => (
                <div
                  key={t.code}
                  className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400 text-[11px]">{idx + 1}.</span>
                    <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {t.code}
                    </span>
                    <span className="font-bold text-slate-800">{t.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">دولاب {t.cabinet}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              ملاحظات إضافية على الخروج (اختياري):
            </label>
            <textarea
              rows={2}
              value={checkoutNotes}
              onChange={(e) => setCheckoutNotes(e.target.value)}
              placeholder="مثال: تم تسليم العدة مع كابلات إضافية / مطلوب أعمال ليلية..."
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="flex-1 min-h-[48px] px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>{isSubmitting ? 'جاري الحفظ والتسجيل...' : 'تأكيد وحفظ خروج العدة'}</span>
            </button>

            <button
              type="button"
              onClick={() => setStep('select')}
              disabled={isSubmitting}
              className="min-h-[48px] px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              رجوع للتعديل
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
