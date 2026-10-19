import { AppData, Tool, Technician, Site, AppSettings } from '../types';
import { initialSeedData } from '../seedData';
import { getFirestoreDb, firestoreOperations } from './firebaseSync';

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// Local cache in case of offline or first load
const CACHE_KEY = 'al3da_local_app_data';

function getLocalCachedData(): AppData {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tools)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading local cache:', err);
  }
  return JSON.parse(JSON.stringify(initialSeedData));
}

export function saveLocalCachedData(data: AppData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Error writing local cache:', err);
  }
}

export const api = {
  async getData(): Promise<{ data: AppData; isCloud: boolean }> {
    const firestore = getFirestoreDb();
    if (firestore) {
      // Handled via real-time subscription in App.tsx or fallback to cache
      return { data: getLocalCachedData(), isCloud: true };
    }

    // Try Express backend
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const serverData = await res.json();
        saveLocalCachedData(serverData);
        return { data: serverData, isCloud: false };
      }
    } catch {
      // Ignored for graceful fallback
    }

    // Fallback to local cache so the app never shows a blocking crash screen
    return { data: getLocalCachedData(), isCloud: false };
  },

  async checkoutTools(params: {
    toolCodes: string[];
    technicianNames: string[];
    siteId?: string;
    siteName?: string;
    newSiteAddress?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; data?: AppData }> {
    const firestore = getFirestoreDb();
    if (firestore) {
      const res = await firestoreOperations.checkoutTools(firestore, params);
      return { success: true, message: res.message };
    }

    // Fallback to Express API
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const data = await res.json();
        saveLocalCachedData(data.data);
        return data;
      }
    } catch {
      // If server is not reachable, update local cache
    }

    // Local mode update
    const cached = getLocalCachedData();
    const timestamp = new Date().toISOString();
    for (const code of params.toolCodes) {
      const tool = cached.tools.find((t) => t.code === code);
      if (tool) {
        tool.status = 'في موقع';
        tool.currentSite = params.siteName;
        tool.currentTechnicians = params.technicianNames;
        tool.checkoutDate = timestamp;
      }
    }
    saveLocalCachedData(cached);
    return { success: true, message: 'تم الحفظ محلياً', data: cached };
  },

  async returnTools(params: {
    siteName: string;
    returns: { toolCode: string; isKit: boolean; kitComplete: boolean; missingItemsNotes?: string }[];
    returnedBy?: string;
    generalNotes?: string;
  }): Promise<{ success: boolean; message: string; data?: AppData }> {
    const firestore = getFirestoreDb();
    if (firestore) {
      const res = await firestoreOperations.returnTools(firestore, params);
      return { success: true, message: res.message };
    }

    try {
      const res = await fetch('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const data = await res.json();
        saveLocalCachedData(data.data);
        return data;
      }
    } catch {
      // Fallback
    }

    const cached = getLocalCachedData();
    for (const item of params.returns) {
      const tool = cached.tools.find((t) => t.code === item.toolCode);
      if (tool) {
        tool.status = 'متاح';
        tool.currentSite = undefined;
        tool.currentTechnicians = undefined;
        tool.checkoutDate = undefined;
      }
    }
    saveLocalCachedData(cached);
    return { success: true, message: 'تم تسجيل الرجوع محلياً', data: cached };
  },

  async transferTools(params: {
    toolCodes: string[];
    fromSite: string;
    toSite: string;
    newToSiteAddress?: string;
    technicianName: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; data?: AppData }> {
    const firestore = getFirestoreDb();
    if (firestore) {
      const res = await firestoreOperations.transferTools(firestore, params);
      return { success: true, message: res.message };
    }

    try {
      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const data = await res.json();
        saveLocalCachedData(data.data);
        return data;
      }
    } catch {
      // Fallback
    }

    const cached = getLocalCachedData();
    const timestamp = new Date().toISOString();
    for (const code of params.toolCodes) {
      const tool = cached.tools.find((t) => t.code === code);
      if (tool) {
        tool.currentSite = params.toSite;
        tool.currentTechnicians = [params.technicianName];
        tool.checkoutDate = timestamp;
      }
    }
    saveLocalCachedData(cached);
    return { success: true, message: 'تم تسجيل النقل محلياً', data: cached };
  },

  async saveTool(tool: Partial<Tool>): Promise<{ success: boolean; data?: AppData }> {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestoreOperations.saveTool(firestore, tool);
      return { success: true };
    }

    try {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tool),
      });
      if (res.ok) {
        const data = await res.json();
        saveLocalCachedData(data.data);
        return data;
      }
    } catch {}

    const cached = getLocalCachedData();
    const idx = cached.tools.findIndex((t) => t.code === tool.code);
    if (idx >= 0) cached.tools[idx] = { ...cached.tools[idx], ...tool } as Tool;
    else if (tool.code && tool.name) cached.tools.push(tool as Tool);
    saveLocalCachedData(cached);
    return { success: true, data: cached };
  },

  async changeToolStatus(
    code: string,
    status: Tool['status'],
    notes?: string
  ): Promise<{ success: boolean; data?: AppData }> {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestoreOperations.changeToolStatus(firestore, code, status, notes);
      return { success: true };
    }

    try {
      const res = await fetch(`/api/tools/${encodeURIComponent(code)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      if (res.ok) {
        const data = await res.json();
        saveLocalCachedData(data.data);
        return data;
      }
    } catch {}

    const cached = getLocalCachedData();
    const tool = cached.tools.find((t) => t.code === code);
    if (tool) {
      tool.status = status;
      if (notes) tool.notes = notes;
    }
    saveLocalCachedData(cached);
    return { success: true, data: cached };
  },

  async saveTechnician(tech: Partial<Technician>): Promise<{ success: boolean; data?: AppData }> {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestoreOperations.saveTechnician(firestore, tech);
      return { success: true };
    }

    try {
      const res = await fetch('/api/technicians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tech),
      });
      if (res.ok) {
        const data = await res.json();
        saveLocalCachedData(data.data);
        return data;
      }
    } catch {}

    const cached = getLocalCachedData();
    const idx = cached.technicians.findIndex((t) => t.id === tech.id);
    if (idx >= 0) cached.technicians[idx] = { ...cached.technicians[idx], ...tech } as Technician;
    else if (tech.name) cached.technicians.push({ id: `tech-${Date.now()}`, name: tech.name, phone: tech.phone || '', active: true });
    saveLocalCachedData(cached);
    return { success: true, data: cached };
  },

  async saveSite(site: Partial<Site>): Promise<{ success: boolean; data?: AppData }> {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestoreOperations.saveSite(firestore, site);
      return { success: true };
    }

    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(site),
      });
      if (res.ok) {
        const data = await res.json();
        saveLocalCachedData(data.data);
        return data;
      }
    } catch {}

    const cached = getLocalCachedData();
    const idx = cached.sites.findIndex((s) => s.id === site.id);
    if (idx >= 0) cached.sites[idx] = { ...cached.sites[idx], ...site } as Site;
    else if (site.name) cached.sites.push({ id: `site-${Date.now()}`, name: site.name, address: site.address || '', active: true, createdAt: new Date().toISOString() });
    saveLocalCachedData(cached);
    return { success: true, data: cached };
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<{ success: boolean; settings: AppSettings }> {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestoreOperations.saveSettings(firestore, settings);
      return { success: true, settings: { ...initialSeedData.settings, ...settings } };
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {}

    return { success: true, settings: { ...initialSeedData.settings, ...settings } };
  },

  async importBatch(type: 'tools' | 'technicians' | 'sites', items: any[]): Promise<{ success: boolean; message: string; data?: AppData }> {
    const firestore = getFirestoreDb();
    if (firestore) {
      // Import directly into Firestore
      for (const item of items) {
        if (type === 'tools') await firestoreOperations.saveTool(firestore, item);
        else if (type === 'technicians') await firestoreOperations.saveTechnician(firestore, item);
        else if (type === 'sites') await firestoreOperations.saveSite(firestore, item);
      }
      return { success: true, message: `تم استيراد ${items.length} سجل بنجاح إلى قاعدة بيانات Firebase` };
    }

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, items }),
    });
    return await res.json();
  },

  async resetSeed(): Promise<{ success: boolean; data?: AppData; message: string }> {
    const firestore = getFirestoreDb();
    if (firestore) {
      await firestoreOperations.resetSeed(firestore);
      return { success: true, message: 'تمت استعادة البيانات الافتراضية في Firebase بنجاح' };
    }

    const res = await fetch('/api/reset-seed', { method: 'POST' });
    return await res.json();
  },
};
