import React, { useState, useEffect } from 'react';
import { 
  Cloud, Flame, Check, AlertCircle, Copy, ExternalLink, 
  X, RefreshCw, Key, ShieldCheck, Database, Trash2
} from 'lucide-react';
import { 
  getFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig, 
  FirebaseWebConfig, getFirestoreDb, seedFirestoreIfEmpty 
} from '../services/firebaseSync';

interface FirebaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const FirebaseSetupModal: React.FC<FirebaseSetupModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const currentConfig = getFirebaseConfig();
  const [rawSnippet, setRawSnippet] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>(currentConfig?.apiKey || '');
  const [projectId, setProjectId] = useState<string>(currentConfig?.projectId || '');
  const [authDomain, setAuthDomain] = useState<string>(currentConfig?.authDomain || '');
  const [appId, setAppId] = useState<string>(currentConfig?.appId || '');

  const [activeTab, setActiveTab] = useState<'pasteSnippet' | 'fields' | 'guide'>('pasteSnippet');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getFirebaseConfig();
      if (cfg) {
        setApiKey(cfg.apiKey);
        setProjectId(cfg.projectId);
        setAuthDomain(cfg.authDomain || '');
        setAppId(cfg.appId || '');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Auto-parse full snippet pasted by user
  const handleParseSnippet = () => {
    if (!rawSnippet.trim()) {
      setStatusMessage({ type: 'error', text: 'يرجى لصق كود أو إعدادات Firebase أولاً' });
      return;
    }

    try {
      let extractedApiKey = '';
      let extractedProjectId = '';
      let extractedAuthDomain = '';
      let extractedAppId = '';

      // Try regex matching on standard firebase config snippet
      const apiKeyMatch = rawSnippet.match(/apiKey\s*:\s*["']([^"']+)["']/);
      const projectIdMatch = rawSnippet.match(/projectId\s*:\s*["']([^"']+)["']/);
      const authDomainMatch = rawSnippet.match(/authDomain\s*:\s*["']([^"']+)["']/);
      const appIdMatch = rawSnippet.match(/appId\s*:\s*["']([^"']+)["']/);

      if (apiKeyMatch) extractedApiKey = apiKeyMatch[1];
      if (projectIdMatch) extractedProjectId = projectIdMatch[1];
      if (authDomainMatch) extractedAuthDomain = authDomainMatch[1];
      if (appIdMatch) extractedAppId = appIdMatch[1];

      // If regex failed, try JSON parsing
      if (!extractedApiKey && !extractedProjectId) {
        try {
          const parsed = JSON.parse(rawSnippet);
          extractedApiKey = parsed.apiKey || '';
          extractedProjectId = parsed.projectId || '';
          extractedAuthDomain = parsed.authDomain || '';
          extractedAppId = parsed.appId || '';
        } catch {}
      }

      if (!extractedApiKey || !extractedProjectId) {
        setStatusMessage({
          type: 'error',
          text: 'لم يتم العثور على apiKey أو projectId في النص الملصوق. تأكد من نسخ كود firebaseConfig كاملاً.',
        });
        return;
      }

      setApiKey(extractedApiKey);
      setProjectId(extractedProjectId);
      setAuthDomain(extractedAuthDomain || `${extractedProjectId}.firebaseapp.com`);
      setAppId(extractedAppId);

      // Save directly
      handleSave({
        apiKey: extractedApiKey,
        projectId: extractedProjectId,
        authDomain: extractedAuthDomain || `${extractedProjectId}.firebaseapp.com`,
        appId: extractedAppId,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `خطأ أثناء استخراج البيانات: ${err.message}` });
    }
  };

  const handleSave = async (configToSave?: FirebaseWebConfig) => {
    const finalConfig = configToSave || {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      appId: appId.trim(),
      firestoreDatabaseId: currentConfig?.firestoreDatabaseId,
    };

    if (!finalConfig.apiKey || !finalConfig.projectId) {
      setStatusMessage({ type: 'error', text: 'حقل API Key ومعرف المشروع Project ID مطلوبان' });
      return;
    }

    setIsSaving(true);
    setStatusMessage({ type: 'info', text: 'جاري اختبار الاتصال بقاعدة بيانات Firebase...' });

    try {
      saveFirebaseConfig(finalConfig);
      const db = getFirestoreDb();
      if (!db) {
        throw new Error('فشل تهيئة Firebase');
      }

      // Test seed and connectivity
      await seedFirestoreIfEmpty(db);

      setStatusMessage({
        type: 'success',
        text: '✅ تم الربط بنجاح! قاعدة بيانات Firebase السحابية متصلة الآن وستتم المزامنة لحظياً بين جميع الأجهزة.',
      });

      setTimeout(() => {
        setIsSaving(false);
        onConfigSaved();
        onClose();
      }, 1500);
    } catch (err: any) {
      setIsSaving(false);
      setStatusMessage({
        type: 'error',
        text: `تعذر الاتصال بـ Firebase: ${err.message || 'تأكد من تفعيل Cloud Firestore في وضع Test Mode داخل مشروع Firebase'}.`,
      });
    }
  };

  const handleDisconnect = () => {
    if (confirm('هل أنت متأكد من رغبتك في فصل الاتصال بقاعدة بيانات Firebase؟')) {
      clearFirebaseConfig();
      setApiKey('');
      setProjectId('');
      setAuthDomain('');
      setAppId('');
      setStatusMessage({ type: 'info', text: 'تم فصل الاتصال. التطبيق يعمل الآن في الوضع المحلي' });
      onConfigSaved();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-l from-amber-600 via-amber-700 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-white/20 text-white shadow-xs">
              <Flame className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black leading-tight">
                ربط قاعدة بيانات Firebase السحابية
              </h3>
              <p className="text-xs text-amber-200">
                للمزامنة اللحظية بين جميع هواتف الفنيين وأجهزة الكمبيوتر أونلاين
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Connection Status Banner */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                currentConfig ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-xs font-bold text-slate-800">
              {currentConfig
                ? `متصل بمشروع Firebase: (${currentConfig.projectId})`
                : 'غير متصل بقاعدة بيانات سحابية (التعديلات لا تسمع بين الأجهزة)'}
            </span>
          </div>

          {currentConfig && (
            <button
              onClick={handleDisconnect}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>فصل</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('pasteSnippet')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'pasteSnippet'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            لصق كود Firebase مباشرة (الأسرع)
          </button>
          <button
            onClick={() => setActiveTab('fields')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'fields'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            إدخال يدوي
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'guide'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            شرح الخطوات (دقيقة واحدة)
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{statusMessage.text}</div>
            </div>
          )}

          {activeTab === 'pasteSnippet' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  انسخ كود `firebaseConfig` من مشروعك في Firebase والصقه هنا:
                </label>
                <textarea
                  rows={6}
                  value={rawSnippet}
                  onChange={(e) => setRawSnippet(e.target.value)}
                  placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  projectId: "al3da",\n  authDomain: "al3da.firebaseapp.com",\n  ...\n};`}
                  className="w-full p-3 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 leading-relaxed"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={handleParseSnippet}
                  disabled={isSaving || !rawSnippet.trim()}
                  className="w-full min-h-[46px] rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                  <span>{isSaving ? 'جاري الاتصال والتحقق...' : 'استخراج وحفظ والاتصال بقاعدة البيانات'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 leading-normal">
                💡 سيقوم التطبيق تلقائياً بقراءة `apiKey` و `projectId` وإنشاء اتصال مباشر بـ Cloud Firestore، وحفظ البيانات في جهازك حتى لا تضطر لإعادة الإدخال.
              </p>
            </div>
          )}

          {activeTab === 'fields' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  API Key:
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-amber-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  معرف المشروع (Project ID):
                </label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="al3da أو al3da-12345"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-amber-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  App ID (اختياري):
                </label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="1:123456789:web:abcdef..."
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-amber-500"
                  dir="ltr"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleSave()}
                  disabled={isSaving || !apiKey.trim() || !projectId.trim()}
                  className="w-full min-h-[46px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{isSaving ? 'جاري التحقق...' : 'حفظ والاتصال بـ Firebase'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="font-bold text-slate-900 mb-1">
                كيف تحصل على كود Firebase من مشروعك (Al3da):
              </div>
              <ol className="list-decimal list-inside space-y-2 pr-1">
                <li>
                  افتح تبويب <span className="font-bold text-amber-700">Al3da – Firebase</span> المفتوح في متصفحك.
                </li>
                <li>
                  من القائمة الجانبية اليسرى، اضغط على علامة الترس ⚙️ <span className="font-bold text-slate-900">Project settings (إعدادات المشروع)</span>.
                </li>
                <li>
                  انزل لأسفل الصفحة حتى تصل إلى قسم <span className="font-bold text-slate-900">Your apps (تطبيقاتك)</span>.
                </li>
                <li>
                  إذا لم تكن قد أنشأت تطبيق ويب بعد، اضغط على أيقونة الويب <span className="font-mono bg-slate-200 px-1 rounded">&lt;/&gt;</span> وسَمّه <span className="font-bold">Al3da Web</span> ثم اضغط Register.
                </li>
                <li>
                  ستجد كوداً يحتوي على <span className="font-mono font-bold text-slate-900">const firebaseConfig = &#123; ... &#125;;</span>.
                </li>
                <li>
                  انسخه كاملاً، وافتح هذا التبويب هنا، والصقه في تبويب <span className="font-bold text-amber-700">«لصق كود Firebase»</span> واضغط حفظ.
                </li>
                <li className="text-rose-700 font-bold">
                  تأكد أيضاً من فتح قائمة <span className="underline">Build &gt; Firestore Database</span> والضغط على Create Database واختيار <span className="underline">Start in test mode</span> لكي يسمح بقراءة وكتابة البيانات للجميع.
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
