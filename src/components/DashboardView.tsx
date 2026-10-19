import React, { useState, useMemo } from 'react';
import { 
  BarChart3, AlertTriangle, Layers, MapPin, Users, History, 
  Search, Download, ArrowUpRight, ArrowDownLeft, Repeat, Wrench, 
  Clock, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { Tool, Technician, Site, Transaction, AppData } from '../types';
import { formatDateArabic, formatDurationArabic, getDaysSince } from '../utils/formatters';
import { exportToolsToCsv, exportTransactionsToCsv } from '../utils/csv';

interface DashboardViewProps {
  data: AppData;
  onOpenToolDossier: (tool: Tool) => void;
  onNavigateToAdmin: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onOpenToolDossier,
  onNavigateToAdmin,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'overdue' | 'cabinets' | 'sites' | 'technicians' | 'transactions' | 'allTools'
  >('overdue');

  const [toolSearch, setToolSearch] = useState('');
  const [selectedCabinet, setSelectedCabinet] = useState<'1' | '2' | '3'>('1');
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [expandedTech, setExpandedTech] = useState<string | null>(null);

  const thresholdDays = data.settings.overdueDaysThreshold || 7;

  // Calculate Quick Metric Stats
  const totalCount = data.tools.length;
  const availableCount = data.tools.filter((t) => t.status === 'متاح').length;
  const inSiteCount = data.tools.filter((t) => t.status === 'في موقع').length;
  const maintenanceCount = data.tools.filter((t) => t.status === 'صيانة').length;
  const lostCount = data.tools.filter((t) => t.status === 'مفقود').length;

  // Overdue tools: status === 'في موقع' and days > thresholdDays, sorted oldest first
  const overdueTools = useMemo(() => {
    return data.tools
      .filter((t) => t.status === 'في موقع' && t.checkoutDate && getDaysSince(t.checkoutDate) >= thresholdDays)
      .sort((a, b) => {
        const da = getDaysSince(a.checkoutDate);
        const db = getDaysSince(b.checkoutDate);
        return db - da; // longest out first
      });
  }, [data.tools, thresholdDays]);

  // Group tools by Cabinet
  const toolsByCabinet = useMemo(() => {
    return {
      '1': data.tools.filter((t) => t.cabinet === '1'),
      '2': data.tools.filter((t) => t.cabinet === '2'),
      '3': data.tools.filter((t) => t.cabinet === '3'),
    };
  }, [data.tools]);

  // Group tools by Site
  const toolsBySite = useMemo(() => {
    const map: Record<string, Tool[]> = {};
    data.tools.forEach((t) => {
      if (t.status === 'في موقع' && t.currentSite) {
        if (!map[t.currentSite]) map[t.currentSite] = [];
        map[t.currentSite].push(t);
      }
    });
    return map;
  }, [data.tools]);

  // Group tools by Technician
  const toolsByTechnician = useMemo(() => {
    const map: Record<string, Tool[]> = {};
    data.tools.forEach((t) => {
      if (t.status === 'في موقع' && t.currentTechnicians) {
        t.currentTechnicians.forEach((techName) => {
          if (!map[techName]) map[techName] = [];
          map[techName].push(t);
        });
      }
    });
    return map;
  }, [data.tools]);

  // Filtered All Tools
  const filteredAllTools = useMemo(() => {
    if (!toolSearch.trim()) return data.tools;
    const q = toolSearch.toLowerCase().trim();
    return data.tools.filter(
      (t) =>
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        (t.currentSite && t.currentSite.toLowerCase().includes(q))
    );
  }, [data.tools, toolSearch]);

  return (
    <div className="pb-24 pt-2 max-w-6xl mx-auto px-3 sm:px-4 space-y-5">
      {/* Top Banner & Quick Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>لوحة المتابعة الميدانية</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 text-amber-400 font-mono font-bold">
              LIVE
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            رصد فوري لجميع العدة، مواقعها الحالية، والتنبيهات المباشرة للتأخير
          </p>
        </div>

        {/* Quick Tool Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={toolSearch}
            onChange={(e) => {
              setToolSearch(e.target.value);
              if (activeSubTab !== 'allTools') setActiveSubTab('allTools');
            }}
            placeholder="بحث فوري بكود العدة (DR-01)..."
            className="w-full h-10 pr-9 pl-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-right shadow-xs">
          <div className="text-[11px] text-slate-500 font-semibold mb-1">إجمالي العدة</div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">{totalCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">3 دواليب مركزية</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 text-right shadow-xs">
          <div className="text-[11px] text-emerald-700 font-semibold mb-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>المتاح بالمخزن</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 tabular-nums">{availableCount}</div>
          <div className="text-[10px] text-emerald-600/70 mt-1">جاهز للخروج فوراً</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 text-right shadow-xs">
          <div className="text-[11px] text-amber-700 font-semibold mb-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>في المواقع</span>
          </div>
          <div className="text-2xl font-black text-amber-600 tabular-nums">{inSiteCount}</div>
          <div className="text-[10px] text-amber-600/70 mt-1">موزعة بالمواقع</div>
        </div>

        {/* OVERDUE CARD - BOLD RED ALERT */}
        <div
          onClick={() => setActiveSubTab('overdue')}
          className={`p-3.5 rounded-2xl border text-right cursor-pointer transition-all shadow-xs ${
            overdueTools.length > 0
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/40 animate-pulse'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[11px] text-rose-700 font-bold mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>متأخرة ({thresholdDays}+ يوم)</span>
          </div>
          <div className="text-2xl font-black text-rose-600 tabular-nums">
            {overdueTools.length}
          </div>
          <div className="text-[10px] text-rose-700 font-semibold mt-1">
            {overdueTools.length > 0 ? 'تتطلب متابعة عاجلة!' : 'لا توجد تأخيرات'}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-blue-200 text-right shadow-xs">
          <div className="text-[11px] text-blue-700 font-semibold mb-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>تحت الصيانة</span>
          </div>
          <div className="text-2xl font-black text-blue-600 tabular-nums">{maintenanceCount}</div>
          <div className="text-[10px] text-blue-600/70 mt-1">إصلاح وتجديد</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-right shadow-xs">
          <div className="text-[11px] text-rose-800 font-semibold mb-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>مفقود</span>
          </div>
          <div className="text-2xl font-black text-rose-700 tabular-nums">{lostCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">مسجل كفقدان</div>
        </div>
      </div>

      {/* OVERDUE TOOLS SECTION - HIGHLIGHTED AT TOP AS REQUESTED */}
      {overdueTools.length > 0 && (
        <div className="bg-rose-500/10 border-2 border-rose-400 rounded-3xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-900 leading-tight">
                  تنبيه: عدة متأخرة في المواقع أكثر من {thresholdDays} أيام ({overdueTools.length} قطعة)
                </h3>
                <p className="text-xs text-rose-700 font-medium">
                  مرتبة من الأقدم خروجاً لتسريع المتابعة واستعادتها
                </p>
              </div>
            </div>

            <button
              onClick={() => exportToolsToCsv(overdueTools)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير كشف المتأخرات</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {overdueTools.map((tool) => {
              const days = getDaysSince(tool.checkoutDate);
              return (
                <div
                  key={tool.code}
                  onClick={() => onOpenToolDossier(tool)}
                  className="p-3.5 rounded-2xl bg-white border border-rose-200 shadow-2xs hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-lg bg-rose-600 text-white">
                        {tool.code}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[11px] tabular-nums">
                        متأخرة منذ {days} يوم
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {tool.name}
                    </div>

                    <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1 font-semibold text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-rose-600" />
                        <span className="truncate">{tool.currentSite}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{(tool.currentTechnicians || []).join('، ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>تاريخ الخروج: {formatDateArabic(tool.checkoutDate)}</span>
                    <span className="text-rose-600 font-bold hover:underline">عرض السجل ←</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'cabinets', label: 'حسب الدواليب (1، 2، 3)', icon: Layers },
            { id: 'sites', label: `حسب المواقع (${Object.keys(toolsBySite).length})`, icon: MapPin },
            { id: 'technicians', label: `حسب الفنيين (${Object.keys(toolsByTechnician).length})`, icon: Users },
            { id: 'allTools', label: `كل العدة (${data.tools.length})`, icon: Wrench },
            { id: 'transactions', label: `سجل الحركات (${data.transactions.length})`, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* CSV Export Button */}
        <button
          onClick={() => {
            if (activeSubTab === 'transactions') {
              exportTransactionsToCsv(data.transactions);
            } else {
              exportToolsToCsv(data.tools);
            }
          }}
          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>تصدير Excel/CSV</span>
        </button>
      </div>

      {/* TAB 1: BY CABINETS (الدواليب) */}
      {activeSubTab === 'cabinets' && (
        <div className="space-y-4">
          {/* Cabinet Switcher */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: '1', title: 'دولاب 1', desc: 'معدات ثقيلة كهربائية' },
              { id: '2', title: 'دولاب 2', desc: 'أطقم ومفكات وقياس' },
              { id: '3', title: 'دولاب 3', desc: 'سلالم وتمديدات موقع' },
            ].map((cab) => (
              <button
                key={cab.id}
                onClick={() => setSelectedCabinet(cab.id as any)}
                className={`p-3 rounded-2xl border text-right transition-all ${
                  selectedCabinet === cab.id
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <div className="text-xs sm:text-sm font-black">{cab.title}</div>
                <div className={`text-[10px] mt-0.5 truncate ${selectedCabinet === cab.id ? 'text-slate-900/80' : 'text-slate-400'}`}>
                  {cab.desc}
                </div>
                <div className="text-xs mt-1.5 font-bold tabular-nums">
                  {toolsByCabinet[cab.id as '1' | '2' | '3'].length} قطعة
                </div>
              </button>
            ))}
          </div>

          {/* Tools Grid inside selected cabinet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {toolsByCabinet[selectedCabinet].map((tool) => (
              <div
                key={tool.code}
                onClick={() => onOpenToolDossier(tool)}
                className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-md bg-slate-900 text-white">
                      {tool.code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        tool.status === 'متاح'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tool.status === 'في موقع'
                          ? 'bg-amber-100 text-amber-800'
                          : tool.status === 'صيانة'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {tool.status}
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm font-bold text-slate-800">{tool.name}</div>
                  {tool.type === 'طقم' && tool.kitItems && (
                    <div className="text-[10px] text-amber-700 mt-1 line-clamp-1">
                      طقم: {tool.kitItems}
                    </div>
                  )}

                  {tool.status === 'في موقع' && (
                    <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg">
                      <div className="font-semibold text-slate-800 truncate">
                        📍 {tool.currentSite}
                      </div>
                      <div className="text-slate-500 mt-0.5 truncate">
                        👷‍♂️ {(tool.currentTechnicians || []).join('، ')} ·{' '}
                        {formatDurationArabic(tool.checkoutDate)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>التصنيف: {tool.category}</span>
                  <span className="text-amber-600 font-bold">معاينة السجل ←</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BY SITES (المواقع) */}
      {activeSubTab === 'sites' && (
        <div className="space-y-3">
          {Object.keys(toolsBySite).length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              لا توجد أي عدة في المواقع حالياً.
            </div>
          ) : (
            Object.entries(toolsBySite).map(([siteName, tools]) => {
              const isExpanded = expandedSite === siteName || expandedSite === null;
              return (
                <div
                  key={siteName}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs"
                >
                  <div
                    onClick={() => setExpandedSite(expandedSite === siteName ? '' : siteName)}
                    className="p-4 bg-slate-50/80 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-800">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{siteName}</h4>
                        <p className="text-xs text-slate-500">
                          به {tools.length} قطعة عدة مسجلة
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg">
                        {tools.length} قطعة
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {tools.map((t) => (
                        <div
                          key={t.code}
                          onClick={() => onOpenToolDossier(t)}
                          className="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50/50 border border-slate-200 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                              {t.code}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              {formatDurationArabic(t.checkoutDate)}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 truncate">{t.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            مع: {(t.currentTechnicians || []).join('، ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: BY TECHNICIANS (الفنيين) */}
      {activeSubTab === 'technicians' && (
        <div className="space-y-3">
          {Object.keys(toolsByTechnician).length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              لا توجد عهدة عدة مع أي فني حالياً.
            </div>
          ) : (
            Object.entries(toolsByTechnician).map(([techName, tools]) => {
              const isExpanded = expandedTech === techName || expandedTech === null;
              return (
                <div
                  key={techName}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs"
                >
                  <div
                    onClick={() => setExpandedTech(expandedTech === techName ? '' : techName)}
                    className="p-4 bg-slate-50/80 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-800">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{techName}</h4>
                        <p className="text-xs text-slate-500">
                          في عهدته {tools.length} قطعة عدة
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-lg">
                        {tools.length} قطعة
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {tools.map((t) => (
                        <div
                          key={t.code}
                          onClick={() => onOpenToolDossier(t)}
                          className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                              {t.code}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              {formatDurationArabic(t.checkoutDate)}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 truncate">{t.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                            📍 {t.currentSite}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 4: ALL TOOLS TABLE / GRID */}
      {activeSubTab === 'allTools' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs sm:text-sm font-bold text-slate-900">
              قائمة جميع العدة والأجهزة المسجلة ({filteredAllTools.length})
            </div>
            <div className="text-xs text-slate-500">
              اضغط على أي قطعة لعرض تفاصيلها وسجل حركاتها بالكامل
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">كود العدة</th>
                  <th className="p-3">اسم العدة</th>
                  <th className="p-3">الدولاب</th>
                  <th className="p-3">التصنيف</th>
                  <th className="p-3">النوع</th>
                  <th className="p-3">الحالة الراهنة</th>
                  <th className="p-3">الموقع / الفني</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAllTools.map((t) => (
                  <tr
                    key={t.code}
                    onClick={() => onOpenToolDossier(t)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-mono font-black text-slate-900">
                      <span className="bg-slate-100 px-2 py-1 rounded-md">{t.code}</span>
                    </td>
                    <td className="p-3 font-bold text-slate-800">{t.name}</td>
                    <td className="p-3 text-slate-600">دولاب {t.cabinet}</td>
                    <td className="p-3 text-slate-600">{t.category}</td>
                    <td className="p-3">
                      {t.type === 'طقم' ? (
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px]">
                          طقم
                        </span>
                      ) : (
                        <span className="text-slate-500">قطعة واحدة</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          t.status === 'متاح'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'في موقع'
                            ? 'bg-amber-100 text-amber-800'
                            : t.status === 'صيانة'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {t.status === 'في موقع' ? (
                        <div>
                          <div className="font-semibold text-slate-800">{t.currentSite}</div>
                          <div className="text-[10px] text-slate-400">
                            {(t.currentTechnicians || []).join('، ')}
                          </div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: TRANSACTION AUDIT LOG */}
      {activeSubTab === 'transactions' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">سجل حركات العدة المركزي</h3>
              <p className="text-xs text-slate-500">
                سجل موثق بالوقت والتاريخ لجميع عمليات الخروج والرجوع والنقل (غير قابل للحذف)
              </p>
            </div>
            <button
              onClick={() => exportTransactionsToCsv(data.transactions)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير السجل CSV</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {data.transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">لا توجد حركات مسجلة بعد.</div>
            ) : (
              data.transactions.map((tx) => (
                <div key={tx.id} className="p-3.5 hover:bg-slate-50 transition-colors text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
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
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        {tx.toolCode}
                      </span>
                      <span className="font-bold text-slate-800">{tx.toolName}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {formatDateArabic(tx.timestamp)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 mt-1">
                    {tx.site && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>الموقع: {tx.site}</span>
                      </span>
                    )}

                    {tx.fromSite && tx.toSite && (
                      <span className="flex items-center gap-1">
                        <Repeat className="w-3.5 h-3.5 text-indigo-500" />
                        <span>من [{tx.fromSite}] إلى [{tx.toSite}]</span>
                      </span>
                    )}

                    {tx.technicians && tx.technicians.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>الفني: {tx.technicians.join('، ')}</span>
                      </span>
                    )}

                    {tx.kitComplete === false && (
                      <span className="text-rose-600 font-bold">
                        ⚠️ نواقص الطقم: {tx.missingItemsNotes || 'غير محددة'}
                      </span>
                    )}
                  </div>

                  {tx.notes && (
                    <div className="text-slate-500 italic mt-1.5 bg-slate-50 p-1.5 rounded">
                      {tx.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
