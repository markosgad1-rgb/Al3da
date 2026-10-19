/**
 * Application Data Types for Tool Management
 */

export type ToolStatus = 'متاح' | 'في موقع' | 'صيانة' | 'مفقود';
export type ToolCabinet = '1' | '2' | '3';
export type ToolType = 'قطعة واحدة' | 'طقم';
export type ToolCategory = 'كهربائي' | 'يدوي' | 'قياس' | 'سلالم' | 'أخرى';

export interface Tool {
  code: string; // كود فريد موجود على القطعة، مثلاً DR-01
  name: string; // اسم العدة، مثلاً شنيور ماكيتا 18V
  category: ToolCategory; // التصنيف
  cabinet: ToolCabinet; // الدولاب (1 أو 2 أو 3)
  type: ToolType; // قطعة واحدة أو طقم
  kitItems?: string; // محتويات الطقم للأطقم، مثلاً «بنط 6 مم × 2، بنط 8 مم × 2»
  status: ToolStatus; // الحالة
  currentSite?: string; // الموقع الحالي
  currentTechnicians?: string[]; // الفني المستلم (أو فريق العمل)
  checkoutDate?: string; // تاريخ ووقت الخروج بتوقيت ISO
  notes?: string; // ملاحظات عامة
}

export interface Technician {
  id: string;
  name: string;
  phone: string;
  pin?: string; // رقم سري اختياري مكون من 4 أرقام
  active: boolean;
}

export interface Site {
  id: string;
  name: string;
  address?: string;
  active: boolean;
  createdAt: string;
}

export type TransactionType = 'خروج' | 'رجوع' | 'نقل' | 'صيانة' | 'مفقود' | 'تعديل';

export interface Transaction {
  id: string;
  timestamp: string; // ISO date-time
  type: TransactionType;
  toolCode: string;
  toolName: string;
  technicians?: string[];
  site?: string;
  fromSite?: string;
  toSite?: string;
  kitComplete?: boolean;
  missingItemsNotes?: string;
  notes?: string;
}

export interface AppSettings {
  adminPasswordHash: string; // simple password check
  overdueDaysThreshold: number; // default 7
  companyName: string;
  whatsappGroupPhone?: string; // optional group or supervisor phone
}

export interface AppData {
  tools: Tool[];
  technicians: Technician[];
  sites: Site[];
  transactions: Transaction[];
  settings: AppSettings;
}
