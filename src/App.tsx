/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from './services/api';
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
import { AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<AppData>(initialSeedData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

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

  // Toast notification
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Fetch live central data from server
  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsRefreshing(true);
    setNetworkError(null);
    try {
      const serverData = await api.getData();
      setData(serverData);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setNetworkError(err.message || 'تعذر تحميل البيانات من الخادم المركزي');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Background polling every 20 seconds to keep all devices in sync
    const interval = setInterval(() => {
      loadData(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [loadData]);

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
    // Refresh with latest data object
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
      if (res.success) {
        setData(res.data);
        showToast(res.message);
        return true;
      }
      return false;
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
      if (res.success) {
        setData(res.data);
        showToast(res.message);
        setCurrentTab('home');
        return true;
      }
      return false;
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
      if (res.success) {
        setData(res.data);
        showToast(res.message);
        return true;
      }
      return false;
    } catch (err: any) {
      throw err;
    }
  };

  // Save Tool
  const handleSaveTool = async (tool: Partial<Tool>): Promise<boolean> => {
    try {
      const res = await api.saveTool(tool);
      setData(res.data);
      showToast('تم حفظ بيانات العدة بنجاح');
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
      setData(res.data);
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
      setData(res.data);
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
      setData(res.data);
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
      showToast('تم حفظ إعدادات النظام بنجاح');
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
      setData(res.data);
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
      setData(res.data);
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
        onRefresh={() => loadData(false)}
        isRefreshing={isRefreshing}
        companyName={data.settings.companyName}
      />

      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center gap-2 text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-top-3 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Network Error Banner */}
      {networkError && (
        <div className="max-w-4xl mx-auto px-4 mt-3">
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs sm:text-sm flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{networkError}</span>
            </div>
            <button
              onClick={() => loadData(false)}
              className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة المحاولة</span>
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

      {/* Mobile Fixed Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab as any)}
        isAdminLoggedIn={isAdminLoggedIn}
      />
    </div>
  );
}
