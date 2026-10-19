import React, { useState } from 'react';
import { 
  Shield, Key, Plus, Edit2, Trash2, Upload, Download, Save, 
  Settings, Users, MapPin, Wrench, FileSpreadsheet, Check, 
  AlertCircle, RefreshCw, Copy, CheckCheck, Box, Lock
} from 'lucide-react';
import { Tool, Technician, Site, AppData, AppSettings } from '../types';
import { 
  downloadToolTemplateCsv, parseCsv, exportToolsToCsv, 
  exportTechniciansToCsv, exportSitesToCsv, exportTransactionsToCsv 
} from '../utils/csv';

interface AdminManagementViewProps {
  data: AppData;
  isAdminLoggedIn: boolean;
  onLogin: (password: string) => boolean;
  onLogout: () => void;
  onSaveTool: (tool: Partial<Tool>) => Promise<boolean>;
  onChangeToolStatus: (code: string, status: Tool['status'], notes?: string) => Promise<boolean>;
  onSaveTechnician: (tech: Partial<Technician>) => Promise<boolean>;
  onSaveSite: (site: Partial<Site>) => Promise<boolean>;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<boolean>;
  onImportBatch: (type: 'tools' | 'technicians' | 'sites', items: any[]) => Promise<boolean>;
  onResetSeed: () => Promise<boolean>;
  onOpenFirebaseModal?: () => void;
}

export const AdminManagementView: React.FC<AdminManagementViewProps> = ({
  data,
  isAdminLoggedIn,
  onLogin,
  onLogout,
  onSaveTool,
  onChangeToolStatus,
  onSaveTechnician,
  onSaveSite,
  onSaveSettings,
  onImportBatch,
  onResetSeed,
  onOpenFirebaseModal,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Admin sub-sections: 'tools' | 'technicians' | 'sites' | 'import' | 'settings' | 'googleSheets'
  const [adminTab, setAdminTab] = useState<
    'tools' | 'technicians' | 'sites' | 'import' | 'settings' | 'googleSheets'
  >('tools');

  // Tool Form Modal state
  const [editingTool, setEditingTool] = useState<Partial<Tool> | null>(null);
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);

  // Technician Form Modal state
  const [editingTech, setEditingTech] = useState<Partial<Technician> | null>(null);
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);

  // Site Form Modal state
  const [editingSite, setEditingSite] = useState<Partial<Site> | null>(null);
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);

  // Settings State
  const [overdueDays, setOverdueDays] = useState<number>(data.settings.overdueDaysThreshold);
  const [newPassword, setNewPassword] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>(data.settings.companyName);
  const [whatsappPhone, setWhatsappPhone] = useState<string>(data.settings.whatsappGroupPhone || '');
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // CSV Import State
  const [importType, setImportType] = useState<'tools' | 'technicians' | 'sites'>('tools');
  const [csvPreview, setCsvPreview] = useState<any[] | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Copy GAS Code
  const [copiedGas, setCopiedGas] = useState(false);

  // Login handler
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onLogin(passwordInput);
    if (!ok) {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 2000);
    } else {
      setPasswordInput('');
    }
  };

  // Google Apps Script template code
  const googleAppsScriptCode = `/**
 * Google Apps Script Web App للربط مع جداول Google Sheets
 * يقوم بإنشاء أو قراءة الجداول الأربعة: العدة، الفنيين، المواقع، الحركات
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {
    tools: getSheetData(ss, "العدة"),
    technicians: getSheetData(ss, "الفنيين"),
    sites: getSheetData(ss, "المواقع"),
    transactions: getSheetData(ss, "الحركات")
  };
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var payload = JSON.parse(e.postData.contents);
  var action = payload.action;

  if (action === "checkout" || action === "return" || action === "transfer") {
    // تسجيل حركة في شيت الحركات وتحديث شيت العدة
    var txSheet = getOrCreateSheet(ss, "الحركات", ["رقم الحركة", "التاريخ", "النوع", "رقم العدة", "الاسم", "الفني", "الموقع", "ملاحظات"]);
    txSheet.appendRow([
      payload.id || Utilities.getUuid(),
      new Date(),
      payload.type,
      payload.toolCode,
      payload.toolName,
      payload.technicians,
      payload.site,
      payload.notes
    ]);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    rows.push(obj);
  }
  return rows;
}

function getOrCreateSheet(ss, name, defaultHeaders) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (defaultHeaders) sheet.appendRow(defaultHeaders);
  }
  return sheet;
}`;

  const handleCopyGas = async () => {
    try {
      await navigator.clipboard.writeText(googleAppsScriptCode);
      setCopiedGas(true);
      setTimeout(() => setCopiedGas(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  // CSV File reading
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      try {
        const rows = parseCsv(text);
        if (rows.length < 2) {
          setImportStatus('الملف فارغ أو لا يحتوي على بيانات صحيحة');
          return;
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);

        if (importType === 'tools') {
          const parsed = dataRows.map((r) => ({
            code: r[0] || '',
            name: r[1] || '',
            category: r[2] || 'كهربائي',
            cabinet: r[3] || '1',
            type: r[4] === 'طقم' ? 'طقم' : 'قطعة واحدة',
            kitItems: r[5] || '',
            notes: r[6] || '',
          }));
          setCsvPreview(parsed);
        } else if (importType === 'technicians') {
          const parsed = dataRows.map((r) => ({
            name: r[0] || '',
            phone: r[1] || '',
            pin: r[2] || '',
          }));
          setCsvPreview(parsed);
        } else if (importType === 'sites') {
          const parsed = dataRows.map((r) => ({
            name: r[0] || '',
            address: r[1] || '',
          }));
          setCsvPreview(parsed);
        }
      } catch (err: any) {
        setImportStatus(`خطأ في قراءة الملف: ${err.message}`);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleConfirmImport = async () => {
    if (!csvPreview || csvPreview.length === 0) return;
    setImportStatus('جاري استيراد البيانات...');
    try {
      const ok = await onImportBatch(importType, csvPreview);
      if (ok) {
        setImportStatus(`✅ تم استيراد (${csvPreview.length}) سجل بنجاح!`);
        setCsvPreview(null);
      }
    } catch (err: any) {
      setImportStatus(`خطأ: ${err.message}`);
    }
  };

  // If Admin is NOT logged in, show Password Login Screen
  if (!isAdminLoggedIn) {
    return (
      <div className="pb-24 pt-8 max-w-sm mx-auto px-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 mx-auto flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900">دخول لوحة المسؤول</h2>
            <p className="text-xs text-slate-500 mt-1">
              مخصصة لمسؤول المخزن لإضافة وتعديل العدة والفنيين وضبط الإعدادات
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-3 pt-2">
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="أدخل كلمة مرور المسؤول..."
                className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-300 text-center font-bold text-sm tracking-wider focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
            </div>

            {loginError && (
              <div className="text-xs font-bold text-rose-600 animate-shake">
                كلمة المرور غير صحيحة!
              </div>
            )}

            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
            >
              تسجيل الدخول
            </button>
          </form>

          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3">
            كلمة المرور الافتراضية للتجربة: <span className="font-mono font-bold text-slate-600">admin123</span>
          </div>
        </div>
      </div>
    );
  }

  // Admin is Logged In: show Full Management Console
  return (
    <div className="pb-28 pt-2 max-w-5xl mx-auto px-3 sm:px-4 space-y-5">
      {/* Admin Header with Logout */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold">لوحة إدارة النظام والمخزن</h2>
            <p className="text-xs text-slate-400">إضافة وتعديل العدة، الفنيين، المواقع، واستيراد البيانات</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onLogout}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 text-xs font-bold transition-colors"
          >
            خروج من وضع المسؤول
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: 'tools', label: 'إدارة العدة', icon: Wrench },
          { id: 'technicians', label: 'إدارة الفنيين', icon: Users },
          { id: 'sites', label: 'إدارة المواقع', icon: MapPin },
          { id: 'import', label: 'استيراد CSV / Excel', icon: FileSpreadsheet },
          { id: 'settings', label: 'إعدادات النظام', icon: Settings },
          { id: 'googleSheets', label: 'ربط Google Sheets', icon: FileSpreadsheet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = adminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id as any)}
              className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: MANAGE TOOLS */}
      {adminTab === 'tools' && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">سجل العدة والمعدات</h3>
              <p className="text-xs text-slate-500">إضافة قطعة جديدة أو تعديل البيانات ومحتويات الأطقم</p>
            </div>
            <button
              onClick={() => {
                setEditingTool({
                  code: '',
                  name: '',
                  category: 'كهربائي',
                  cabinet: '1',
                  type: 'قطعة واحدة',
                  kitItems: '',
                  notes: '',
                });
                setIsToolModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ إضافة عدة جديدة</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {data.tools.map((tool) => (
              <div
                key={tool.code}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {tool.code}
                    </span>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">{tool.name}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      دولاب {tool.cabinet}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
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

                  {tool.type === 'طقم' && tool.kitItems && (
                    <div className="text-[11px] text-amber-800">
                      محتويات: {tool.kitItems}
                    </div>
                  )}

                  {tool.notes && (
                    <div className="text-[11px] text-slate-500 italic mt-0.5">{tool.notes}</div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setEditingTool(tool);
                      setIsToolModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>

                  <select
                    value={tool.status}
                    onChange={(e) => {
                      const newSt = e.target.value as Tool['status'];
                      const notes = prompt(`ملاحظات تغيير حالة [${tool.code}] إلى [${newSt}]:`);
                      if (notes !== null) onChangeToolStatus(tool.code, newSt, notes);
                    }}
                    className="h-8 px-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold"
                  >
                    <option value="متاح">متاح</option>
                    <option value="في موقع" disabled>في موقع (تلقائي)</option>
                    <option value="صيانة">صيانة</option>
                    <option value="مفقود">مفقود</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: MANAGE TECHNICIANS */}
      {adminTab === 'technicians' && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">سجل الفنيين</h3>
              <p className="text-xs text-slate-500">إضافة الفنيين، أرقام الموبايل، والرقم السري الاختياري</p>
            </div>
            <button
              onClick={() => {
                setEditingTech({ name: '', phone: '', pin: '', active: true });
                setIsTechModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ إضافة فني جديد</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {data.technicians.map((tech) => (
              <div
                key={tech.id}
                className="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{tech.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        tech.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tech.active ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                  <div className="text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>موبايل: {tech.phone || '—'}</span>
                    <span>·</span>
                    <span>الرقم السري: {tech.pin ? `**** (${tech.pin})` : 'بدون رقم سري'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingTech(tech);
                      setIsTechModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>

                  <button
                    onClick={() => onSaveTechnician({ id: tech.id, active: !tech.active })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                      tech.active
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {tech.active ? 'تعطيل' : 'تفعيل'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: MANAGE SITES */}
      {adminTab === 'sites' && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">سجل مواقع العمل</h3>
              <p className="text-xs text-slate-500">إدارة المواقع والكمبوندات والمشاريع الجارية</p>
            </div>
            <button
              onClick={() => {
                setEditingSite({ name: '', address: '', active: true });
                setIsSiteModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ إضافة موقع جديد</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {data.sites.map((site) => (
              <div
                key={site.id}
                className="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{site.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        site.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {site.active ? 'نشط' : 'منتهي'}
                    </span>
                  </div>
                  {site.address && (
                    <div className="text-slate-500 mt-0.5">{site.address}</div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingSite(site);
                      setIsSiteModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>

                  <button
                    onClick={() => onSaveSite({ id: site.id, active: !site.active })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                      site.active
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {site.active ? 'إنهاء الموقع' : 'إعادة تنشيط'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: BATCH IMPORT CSV */}
      {adminTab === 'import' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">استيراد البيانات من Excel أو CSV</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              يمكنك استيراد قائمة العدة أو الفنيين أو المواقع مرة واحدة لتسريع الإعداد الأولي
            </p>
          </div>

          {/* Download Sample Template */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-amber-950">قوالب الاستيراد الجاهزة:</div>
              <div className="text-[11px] text-amber-800">
                حمل النموذج التجريبي، املأ البيانات بنفس الأعمدة، ثم ارفعه هنا
              </div>
            </div>
            <button
              onClick={downloadToolTemplateCsv}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>تحميل نموذج استيراد العدة (CSV)</span>
            </button>
          </div>

          {/* Import Selector & File Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                نوع البيانات المراد استيرادها:
              </label>
              <select
                value={importType}
                onChange={(e) => {
                  setImportType(e.target.value as any);
                  setCsvPreview(null);
                  setImportStatus(null);
                }}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
              >
                <option value="tools">العدة والمعدات (Tools)</option>
                <option value="technicians">الفنيين (Technicians)</option>
                <option value="sites">مواقع العمل (Sites)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                اختر ملف CSV:
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-500 file:mr-0 file:ml-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
              />
            </div>
          </div>

          {importStatus && (
            <div className="p-3 rounded-xl bg-slate-100 text-xs font-bold text-slate-800">
              {importStatus}
            </div>
          )}

          {/* Preview Table */}
          {csvPreview && csvPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  معاينة البيانات قبل الحفظ ({csvPreview.length} سجل):
                </span>
                <button
                  onClick={handleConfirmImport}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>تأكيد استيراد البيانات وحفظها</span>
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                    <tr>
                      {Object.keys(csvPreview[0]).map((k) => (
                        <th key={k} className="p-2 border-b border-slate-200">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {csvPreview.slice(0, 20).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="p-2 truncate max-w-xs">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: APP SETTINGS */}
      {adminTab === 'settings' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">إعدادات النظام العامة</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تحديد مهلة التأخير، اسم الشركة، وتغيير كلمة سر الدخول للمسؤول
            </p>
          </div>

          {settingsSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>تم حفظ الإعدادات بنجاح!</span>
            </div>
          )}

          {/* Firebase Cloud Sync Button in Admin Settings */}
          {onOpenFirebaseModal && (
            <div className="p-4 rounded-2xl bg-gradient-to-l from-amber-500/10 via-amber-50 to-slate-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>المزامنة السحابية اللحظية (Firebase Cloud Sync):</span>
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  تسمح بربط الهواتف والأجهزة المختلفة أونلاين لحظياً، بحيث تنعكس أي حركة خروج أو رجوع في ثوانٍ معدودة.
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenFirebaseModal}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 shadow-xs flex items-center gap-1.5"
              >
                <span>إعداد ربط Firebase</span>
              </button>
            </div>
          )}

          <div className="space-y-4 max-w-lg">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                اسم المؤسسة / القسم:
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                عدد أيام اعتبار العدة متأخرة في المواقع (افتراضي 7 أيام):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={overdueDays}
                  onChange={(e) => setOverdueDays(Number(e.target.value) || 7)}
                  className="w-24 h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-center font-bold text-sm"
                />
                <span className="text-xs text-slate-500">أيام</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                أي عدة تتجاوز هذه المدة في موقع ستظهر بالأحمر في أعلى لوحة المتابعة
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                تغيير كلمة مرور المسؤول (اتركها فارغة إذا لم ترغب بالتغيير):
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="كلمة مرور جديدة..."
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={async () => {
                  const payload: Partial<AppSettings> = {
                    companyName,
                    overdueDaysThreshold: overdueDays,
                  };
                  if (newPassword.trim()) {
                    payload.adminPasswordHash = newPassword.trim();
                  }
                  const ok = await onSaveSettings(payload);
                  if (ok) {
                    setSettingsSuccess(true);
                    setNewPassword('');
                    setTimeout(() => setSettingsSuccess(false), 3000);
                  }
                }}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>

            {/* Reset Seed Demo Data */}
            <div className="pt-6 border-t border-slate-200">
              <div className="text-xs font-bold text-rose-800 mb-1">منطقة الخطر:</div>
              <div className="text-[11px] text-slate-500 mb-2">
                إعادة ضبط قاعدة البيانات للبيانات التجريبية الأولية
              </div>
              <button
                onClick={async () => {
                  if (confirm('هل أنت متأكد من رغبتك في استعادة البيانات التجريبية الافتراضية؟')) {
                    await onResetSeed();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>استعادة البيانات الافتراضية للمخزن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: GOOGLE APPS SCRIPT / GOOGLE SHEETS SETUP GUIDE */}
      {adminTab === 'googleSheets' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">ربط وحفظ البيانات في Google Sheets</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                كود Google Apps Script كامل وخطوات النشر بالتفصيل كما هو مطلوب في المواصفات
              </p>
            </div>
            <button
              onClick={handleCopyGas}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              {copiedGas ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedGas ? 'تم نسخ الكود!' : 'نسخ كود Apps Script'}</span>
            </button>
          </div>

          {/* Steps Guide */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <div className="font-bold text-slate-900 mb-1">خطوات الإعداد والنشر (دقيقة واحدة):</div>
            <ol className="list-decimal list-inside space-y-2 pr-2">
              <li>افتح حسابك في <span className="font-bold text-slate-900">Google Drive</span> وأنشئ جدول بيانات جديد <span className="font-bold text-slate-900">(Google Sheet)</span> وسمّه <span className="font-bold text-amber-700">"عدة التركيبات"</span>.</li>
              <li>من القائمة العلوية للشيت، اضغط على <span className="font-bold text-slate-900">التوسعات (Extensions)</span> ثم اختر <span className="font-bold text-slate-900">Apps Script</span>.</li>
              <li>امسح أي كود موجود في المحرر، واضغط زر <span className="font-bold text-emerald-700">"نسخ كود Apps Script"</span> بالأعلى ثم الصقه في المحرر.</li>
              <li>اضغط زر الحفظ <span className="font-bold">Ctrl + S</span>.</li>
              <li>اضغط على زر <span className="font-bold text-indigo-700">نشر (Deploy) ← نشر جديد (New deployment)</span>.</li>
              <li>اختر نوع النشر: <span className="font-bold">تطبيق ويب (Web app)</span>.</li>
              <li>في خانة <span className="font-bold">Who has access (من يمكنه الوصول)</span>، اختر: <span className="font-bold text-rose-700">Anyone (الجميع)</span> لكي يستطيع تطبيق الموبايل الاتصال به.</li>
              <li>اضغط <span className="font-bold text-slate-900">نشر (Deploy)</span>، وانسخ رابط تطبيق الويب الممنوح.</li>
            </ol>
          </div>

          {/* Code Viewer Box */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-1">كود Apps Script الجاهز:</div>
            <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto max-h-80 select-all leading-normal" dir="ltr">
              {googleAppsScriptCode}
            </pre>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT TOOL */}
      {isToolModalOpen && editingTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
              {editingTool.code ? `تعديل العدة [${editingTool.code}]` : 'إضافة عدة جديدة'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  رقم العدة / الكود الثابت (مثلاً DR-01):
                </label>
                <input
                  type="text"
                  value={editingTool.code || ''}
                  onChange={(e) => setEditingTool({ ...editingTool, code: e.target.value.toUpperCase() })}
                  disabled={Boolean(data.tools.find((t) => t.code === editingTool.code && editingTool.name))}
                  placeholder="DR-05"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-xs uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  اسم العدة:
                </label>
                <input
                  type="text"
                  value={editingTool.name || ''}
                  onChange={(e) => setEditingTool({ ...editingTool, name: e.target.value })}
                  placeholder="مثال: شنيور ماكيتا 18V"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    الدولاب:
                  </label>
                  <select
                    value={editingTool.cabinet || '1'}
                    onChange={(e) => setEditingTool({ ...editingTool, cabinet: e.target.value as any })}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                  >
                    <option value="1">دولاب 1</option>
                    <option value="2">دولاب 2</option>
                    <option value="3">دولاب 3</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    التصنيف:
                  </label>
                  <select
                    value={editingTool.category || 'كهربائي'}
                    onChange={(e) => setEditingTool({ ...editingTool, category: e.target.value as any })}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                  >
                    <option value="كهربائي">كهربائي</option>
                    <option value="يدوي">يدوي</option>
                    <option value="قياس">قياس</option>
                    <option value="سلالم">سلالم</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  النوع:
                </label>
                <select
                  value={editingTool.type || 'قطعة واحدة'}
                  onChange={(e) => setEditingTool({ ...editingTool, type: e.target.value as any })}
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                >
                  <option value="قطعة واحدة">قطعة واحدة</option>
                  <option value="طقم">طقم (مجموعة بنط أو مفكات أو لقم)</option>
                </select>
              </div>

              {editingTool.type === 'طقم' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    محتويات الطقم والأعداد:
                  </label>
                  <textarea
                    rows={2}
                    value={editingTool.kitItems || ''}
                    onChange={(e) => setEditingTool({ ...editingTool, kitItems: e.target.value })}
                    placeholder="مثال: بنط 6 مم × 2، بنط 8 مم × 2، إزميل × 1"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  ملاحظات عامة:
                </label>
                <input
                  type="text"
                  value={editingTool.notes || ''}
                  onChange={(e) => setEditingTool({ ...editingTool, notes: e.target.value })}
                  placeholder="مثال: في شنطة بلاستيك رمادية"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsToolModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  if (!editingTool.code || !editingTool.name) {
                    alert('رقم العدة والاسم مطلوبان');
                    return;
                  }
                  await onSaveTool(editingTool);
                  setIsToolModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-sm"
              >
                حفظ العدة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT TECHNICIAN */}
      {isTechModalOpen && editingTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
              {editingTech.id ? 'تعديل بيانات الفني' : 'إضافة فني جديد'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">اسم الفني:</label>
                <input
                  type="text"
                  value={editingTech.name || ''}
                  onChange={(e) => setEditingTech({ ...editingTech, name: e.target.value })}
                  placeholder="مثال: أحمد محمود"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">رقم الموبايل:</label>
                <input
                  type="tel"
                  value={editingTech.phone || ''}
                  onChange={(e) => setEditingTech({ ...editingTech, phone: e.target.value })}
                  placeholder="01012345678"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  الرقم السري (4 أرقام - اختياري):
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={editingTech.pin || ''}
                  onChange={(e) => setEditingTech({ ...editingTech, pin: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="1234"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-center font-mono font-bold tracking-widest text-sm"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsTechModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  if (!editingTech.name) return;
                  await onSaveTechnician(editingTech);
                  setIsTechModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-sm"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SITE */}
      {isSiteModalOpen && editingSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
              {editingSite.id ? 'تعديل بيانات الموقع' : 'إضافة موقع جديد'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">اسم الموقع:</label>
                <input
                  type="text"
                  value={editingSite.name || ''}
                  onChange={(e) => setEditingSite({ ...editingSite, name: e.target.value })}
                  placeholder="مثال: كمبوند بالم هيلز"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">العنوان أو الوصف:</label>
                <input
                  type="text"
                  value={editingSite.address || ''}
                  onChange={(e) => setEditingSite({ ...editingSite, address: e.target.value })}
                  placeholder="مثال: فيلا 14 - التجمع الخامس"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsSiteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  if (!editingSite.name) return;
                  await onSaveSite(editingSite);
                  setIsSiteModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-sm"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
