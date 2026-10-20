/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiError, saveLocalCachedData } from './services/api';
import { 
  getFirestoreDb, subscribeToFirestore, getFirebaseConfig 
} from './services/firebaseSync';
import { AppData, Tool, AppSettings } from './types';
import { initialSeedData } from './seedData';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { HomeHubView } from './components/HomeHubView';
import { CheckoutView } from './components/CheckoutView';
import { ReturnView } from './components/ReturnView';
import { TransferView } from './components/TransferView';
import { DashboardView } from './components/DashboardView';
import { AdminManagementView } from './components/AdminManagementView';
import { ToolDossierModal } from './components/ToolDossierModal';
import { WhatsAppShareModal } from './components/WhatsAppShareModal';
import { FirebaseSetupModal } from './components/FirebaseSetupModal';
import { AlertCircle, RefreshCw, CheckCircle2, Flame, Cloud } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<AppData>(initialSeedData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Cloud status
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(Boolean(getFirebaseConfig()));
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState<boolean>(false);

  // Current active screen
  const [currentTab, setCurrentTab] = useState<
    'home' | 'checkout' | 'return' | 'transfer' | 'dashboard' | 'admin'
  >('home');

  // Admin login status
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_logged_in') === 'true';
  });

  // Modals state
  const [inspectedTool, setInspectedTool] = useState<Tool | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState<boolean>(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState<string>('');

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Toast notification
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Setup Firestore Subscription or fallback to API / local cache
  const initSync = useCallback(() => {
    const firestore = getFirestoreDb();

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (firestore) {
      setIsCloudConnected(true);
      setIsLoading(true);

      const unsub = subscribeToFirestore(
        firestore,
        (cloudData) => {
          setData(cloudData);
          saveLocalCachedData(cloudData);
          setIsLoading(false);
          setIsRefreshing(false);
        },
        (err) => {
          console.error('🚨 [App Sync Error] تعذر استلام تحديثات سحابية لحظية من Firestore:', err);
          setIsLoading(false);
          setIsRefreshing(false);
        }
      );
      unsubscribeRef.current = unsub;
    } else {
      setIsCloudConnected(false);
      // Fallback: try Express API or local cache
      api.getData().then(({ data: fetchedData }) => {
        setData(fetchedData);
        setIsLoading(false);
      });
    }
  }, []);

  useEffect(() => {
    initSync();
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [initSync]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    initSync();
    setTimeout(() => setIsRefreshing(false), 800);
    showToast('تم تحديث البيانات');
  };

  // Admin Login
  const handleAdminLogin = (password: string): boolean => {
    const validPass = data.settings.adminPasswordHash || 'admin123';
    if (password === validPass) {
      setIsAdminLoggedIn(true);
      sessionStorage.setItem('admin_logged_in', 'true');
      showToast('تم تسجيل الدخول كمسؤول بنجاح');
      return true;
    }
    return false;
  };

  // Admin Logout
  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('admin_logged_in');
    showToast('تم تسجيل الخروج من وضع المسؤول');
  };

  // Open Tool Dossier
  const handleOpenToolDossier = (tool: Tool) => {
    const freshTool = data.tools.find((t) => t.code === tool.code) || tool;
    setInspectedTool(freshTool);
    setIsDossierOpen(true);
  };

  // Open WhatsApp Share
  const handleOpenWhatsApp = (message: string) => {
    setWhatsAppMessage(message);
    setWhatsAppModalOpen(true);
  };

  // Checkout submission
  const handleCheckoutSubmit = async (payload: {
    toolCodes: string[];
    technicianNames: string[];
    siteId?: string;
    siteName?: string;
    newSiteAddress?: string;
    notes?: string;
  }): Promise<boolean> => {
    try {
      const res = await api.checkoutTools(payload);
      if (res.data) setData(res.data);
      showToast(res.message);
      return true;
    } catch (err: any) {
      throw err;
    }
  };

  // Return submission
  const handleReturnSubmit = async (payload: {
    siteName: string;
    returns: { toolCode: string; isKit: boolean; kitComplete: boolean; missingItemsNotes?: string }[];
    returnedBy?: string;
    generalNotes?: string;
  }): Promise<boolean> => {
    try {
      const res = await api.returnTools(payload);
      if (res.data) setData(res.data);
      showToast(res.message);
      return true;
    } catch (err: any) {
      throw err;
    }
  };

  // Transfer submission
  const handleTransferSubmit = async (payload: {
    toolCodes: string[];
    fromSite: string;
    toSite: string;
    newToSiteAddress?: string;
    technicianName: string;
    notes?: string;
  }): Promise<boolean> => {
    try {
      const res = await api.transferTools(payload);
      if (res.data) setData(res.data);
      showToast(res.message);
      return true;
    } catch (err: any) {
      throw err;
    }
  };

  // Save Tool
  const handleSaveTool = async (tool: Partial<Tool>): Promise<boolean> => {
    try {
      const res = await api.saveTool(tool);
      if (res.data) setData(res.data);
      showToast('تم حفظ بيانات العدة');
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  // Change Tool Status
  const handleChangeToolStatus = async (
    code: string,
    status: Tool['status'],
    notes?: string
  ): Promise<boolean> => {
    try {
      const res = await api.changeToolStatus(code, status, notes);
      if (res.data) setData(res.data);
      if (inspectedTool && inspectedTool.code === code) {
        setInspectedTool({ ...inspectedTool, status, notes });
      }
      showToast(`تم تغيير حالة العدة إلى [${status}]`);
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  // Save Technician
  const handleSaveTechnician = async (tech: Partial<any>): Promise<boolean> => {
    try {
      const res = await api.saveTechnician(tech);
      if (res.data) setData(res.data);
      showToast('تم حفظ بيانات الفني');
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  // Save Site
  const handleSaveSite = async (site: Partial<any>): Promise<boolean> => {
    try {
      const res = await api.saveSite(site);
      if (res.data) setData(res.data);
      showToast('تم حفظ بيانات الموقع');
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  // Save Settings
  const handleSaveSettings = async (settings: Partial<AppSettings>): Promise<boolean> => {
    try {
      const res = await api.saveSettings(settings);
      setData((prev) => ({ ...prev, settings: res.settings }));
      showToast('تم حفظ إعدادات النظام');
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  // Batch Import
  const handleImportBatch = async (
    type: 'tools' | 'technicians' | 'sites',
    items: any[]
  ): Promise<boolean> => {
    try {
      const res = await api.importBatch(type, items);
      if (res.data) setData(res.data);
      showToast(res.message);
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  // Reset Seed
  const handleResetSeed = async (): Promise<boolean> => {
    try {
      const res = await api.resetSeed();
      if (res.data) setData(res.data);
      showToast(res.message);
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans select-none antialiased">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab as any)}
        isAdminLoggedIn={isAdminLoggedIn}
        onAdminClick={() => setCurrentTab('admin')}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        companyName={data.settings.companyName}
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        isCloudConnected={isCloudConnected}
      />

      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center gap-2 text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-top-3 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Helpful Cloud Sync Banner (shown when Firebase is not connected yet) */}
      {!isCloudConnected && (
        <div className="max-w-4xl mx-auto px-3 sm:px-4 mt-3">
          <div 
            onClick={() => setIsFirebaseModalOpen(true)}
            className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-l from-amber-500/15 via-amber-50 to-amber-100/60 border border-amber-300 text-amber-950 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-2xs cursor-pointer hover:bg-amber-100/90 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-amber-500 text-slate-950 shrink-0 shadow-2xs">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <span className="font-black text-slate-900">
                  لتفعيل المزامنة اللحظية بين هواتف الفنيين أونلاين:
                </span>{' '}
                <span className="font-semibold text-amber-900">
                  يرجى ربط مشروع Firebase (Al3da) لتسمع التعديلات مباشرة على كل الأجهزة.
                </span>
              </div>
            </div>

            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs shrink-0 shadow-xs flex items-center gap-1.5"
            >
              <span>اضغط للربط (دقيقة واحدة)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Viewport Content */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <HomeHubView
            data={data}
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenToolDossier={handleOpenToolDossier}
          />
        )}

        {currentTab === 'checkout' && (
          <CheckoutView
            data={data}
            onCheckoutSubmit={handleCheckoutSubmit}
            onOpenWhatsApp={handleOpenWhatsApp}
            onOpenToolDossier={handleOpenToolDossier}
            onCancel={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'return' && (
          <ReturnView
            data={data}
            onReturnSubmit={handleReturnSubmit}
            onOpenWhatsApp={handleOpenWhatsApp}
            onCancel={() => setCurrentTab('home')}
            onOpenToolDossier={handleOpenToolDossier}
          />
        )}

        {currentTab === 'transfer' && (
          <TransferView
            data={data}
            onTransferSubmit={handleTransferSubmit}
            onOpenWhatsApp={handleOpenWhatsApp}
            onCancel={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardView
            data={data}
            onOpenToolDossier={handleOpenToolDossier}
            onNavigateToAdmin={() => setCurrentTab('admin')}
          />
        )}

        {currentTab === 'admin' && (
          <AdminManagementView
            data={data}
            isAdminLoggedIn={isAdminLoggedIn}
            onLogin={handleAdminLogin}
            onLogout={handleAdminLogout}
            onSaveTool={handleSaveTool}
            onChangeToolStatus={handleChangeToolStatus}
            onSaveTechnician={handleSaveTechnician}
            onSaveSite={handleSaveSite}
            onSaveSettings={handleSaveSettings}
            onImportBatch={handleImportBatch}
            onResetSeed={handleResetSeed}
            onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
          />
        )}
      </main>

      {/* Tool Inspection & History Modal */}
      <ToolDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        tool={inspectedTool}
        transactions={data.transactions}
        isAdmin={isAdminLoggedIn}
        onStatusChange={(status, notes) => {
          if (inspectedTool) handleChangeToolStatus(inspectedTool.code, status, notes);
        }}
      />

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={whatsAppModalOpen}
        onClose={() => setWhatsAppModalOpen(false)}
        messageText={whatsAppMessage}
        targetPhone={data.settings.whatsappGroupPhone}
      />

      {/* Firebase Cloud Connection Modal */}
      <FirebaseSetupModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        onConfigSaved={() => initSync()}
      />

      {/* Mobile Fixed Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab as any)}
        isAdminLoggedIn={isAdminLoggedIn}
      />
    </div>
  );
}
