import { AppData, Tool, Technician, Site, AppSettings } from '../types';

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export const api = {
  async getData(): Promise<AppData> {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) {
        throw new ApiError(`خطأ في جلب البيانات: ${res.statusText}`, res.status);
      }
      return await res.json();
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('تعذر الاتصال بالخادم، يرجى التأكد من تشغيل السيرفر أو الاتصال بالإنترنت.');
    }
  },

  async checkoutTools(params: {
    toolCodes: string[];
    technicianNames: string[];
    siteId?: string;
    siteName?: string;
    newSiteAddress?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; data: AppData }> {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new ApiError(data.error || 'تعذر إتمام عملية خروج العدة', res.status);
      }
      return data;
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('فشل الاتصال بالخادم أثناء تسجيل الخروج.');
    }
  },

  async returnTools(params: {
    siteName: string;
    returns: { toolCode: string; isKit: boolean; kitComplete: boolean; missingItemsNotes?: string }[];
    returnedBy?: string;
    generalNotes?: string;
  }): Promise<{ success: boolean; message: string; data: AppData }> {
    try {
      const res = await fetch('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new ApiError(data.error || 'تعذر إتمام عملية رجوع العدة', res.status);
      }
      return data;
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('فشل الاتصال بالخادم أثناء تسجيل الرجوع.');
    }
  },

  async transferTools(params: {
    toolCodes: string[];
    fromSite: string;
    toSite: string;
    newToSiteAddress?: string;
    technicianName: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; data: AppData }> {
    try {
      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new ApiError(data.error || 'تعذر إتمام نقل العدة بين المواقع', res.status);
      }
      return data;
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('فشل الاتصال بالخادم أثناء نقل العدة.');
    }
  },

  async saveTool(tool: Partial<Tool>): Promise<{ success: boolean; data: AppData }> {
    const res = await fetch('/api/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tool),
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data.error || 'تعذر حفظ بيانات العدة', res.status);
    return data;
  },

  async changeToolStatus(
    code: string,
    status: Tool['status'],
    notes?: string
  ): Promise<{ success: boolean; data: AppData }> {
    const res = await fetch(`/api/tools/${encodeURIComponent(code)}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data.error || 'تعذر تغيير حالة العدة', res.status);
    return data;
  },

  async saveTechnician(tech: Partial<Technician>): Promise<{ success: boolean; data: AppData }> {
    const res = await fetch('/api/technicians', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tech),
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data.error || 'تعذر حفظ بيانات الفني', res.status);
    return data;
  },

  async saveSite(site: Partial<Site>): Promise<{ success: boolean; data: AppData }> {
    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(site),
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data.error || 'تعذر حفظ بيانات الموقع', res.status);
    return data;
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<{ success: boolean; settings: AppSettings }> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data.error || 'تعذر حفظ الإعدادات', res.status);
    return data;
  },

  async importBatch(type: 'tools' | 'technicians' | 'sites', items: any[]): Promise<{ success: boolean; message: string; data: AppData }> {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, items }),
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data.error || 'فشل استيراد الملف', res.status);
    return data;
  },

  async resetSeed(): Promise<{ success: boolean; data: AppData; message: string }> {
    const res = await fetch('/api/reset-seed', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data.error || 'تعذر استعادة البيانات الافتراضية', res.status);
    return data;
  },
};
