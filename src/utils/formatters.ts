/**
 * Utility functions for Arabic formatting, date calculations, and WhatsApp messages
 */

export function formatDateArabic(isoDateStr?: string): string {
  if (!isoDateStr) return '—';
  try {
    const d = new Date(isoDateStr);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoDateStr;
  }
}

export function formatTimeArabic(isoDateStr?: string): string {
  if (!isoDateStr) return '—';
  try {
    const d = new Date(isoDateStr);
    return new Intl.DateTimeFormat('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoDateStr;
  }
}

export function getDaysSince(isoDateStr?: string): number {
  if (!isoDateStr) return 0;
  try {
    const start = new Date(isoDateStr).getTime();
    const now = new Date().getTime();
    const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch {
    return 0;
  }
}

export function formatDurationArabic(isoDateStr?: string): string {
  const days = getDaysSince(isoDateStr);
  if (days === 0) return 'اليوم';
  if (days === 1) return 'منذ يوم';
  if (days === 2) return 'منذ يومين';
  if (days >= 3 && days <= 10) return `منذ ${days} أيام`;
  return `منذ ${days} يوماً`;
}

/**
 * Generate formatted WhatsApp message for checkout
 */
export function buildCheckoutWhatsAppMessage(params: {
  companyName?: string;
  siteName: string;
  technicians: string[];
  tools: { code: string; name: string; cabinet?: string; type?: string }[];
  notes?: string;
}): string {
  const nowStr = new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const lines = [
    `📋 *إذن خروج عدة تركيبات*`,
    `🏢 *الشركة/القسم:* ${params.companyName || 'فريق التركيبات'}`,
    `📍 *الموقع:* ${params.siteName}`,
    `👷‍♂️ *الفريق المستلم:* ${params.technicians.join(' + ')}`,
    `🕒 *الوقت:* ${nowStr}`,
    ``,
    `*العدة المسجلة (${params.tools.length} قطعة/طقم):*`,
  ];

  params.tools.forEach((t, i) => {
    const cabinetStr = t.cabinet ? ` (دولاب ${t.cabinet})` : '';
    const typeStr = t.type === 'طقم' ? ' [طقم]' : '';
    lines.push(`${i + 1}. [${t.code}] ${t.name}${cabinetStr}${typeStr}`);
  });

  if (params.notes && params.notes.trim()) {
    lines.push(``);
    lines.push(`📝 *ملاحظات:* ${params.notes.trim()}`);
  }

  lines.push(``);
  lines.push(`✅ *تم التسجيل عبر نظام متابعة العدة*`);

  return lines.join('\n');
}

/**
 * Generate formatted WhatsApp message for site transfer
 */
export function buildTransferWhatsAppMessage(params: {
  fromSite: string;
  toSite: string;
  technicianName: string;
  tools: { code: string; name: string }[];
  notes?: string;
}): string {
  const nowStr = new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const lines = [
    `🔄 *إذن نقل عدة بين مواقع*`,
    `📤 *من موقع:* ${params.fromSite}`,
    `📥 *إلى موقع:* ${params.toSite}`,
    `👷‍♂️ *الفني القائم بالنقل:* ${params.technicianName}`,
    `🕒 *الوقت:* ${nowStr}`,
    ``,
    `*العدة المنقولة (${params.tools.length} قطعة):*`,
  ];

  params.tools.forEach((t, i) => {
    lines.push(`${i + 1}. [${t.code}] ${t.name}`);
  });

  if (params.notes && params.notes.trim()) {
    lines.push(``);
    lines.push(`📝 *ملاحظات:* ${params.notes.trim()}`);
  }

  return lines.join('\n');
}

/**
 * Generate formatted WhatsApp message for return
 */
export function buildReturnWhatsAppMessage(params: {
  companyName?: string;
  siteName: string;
  returnedBy?: string;
  tools: {
    code: string;
    name: string;
    cabinet?: string;
    type?: string;
    isKit?: boolean;
    kitComplete?: boolean;
    missingItemsNotes?: string;
  }[];
  generalNotes?: string;
}): string {
  const nowStr = new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const lines = [
    `📥 *إذن رجوع عدة إلى المخزن المركزي*`,
    `🏢 *الشركة/القسم:* ${params.companyName || 'فريق التركيبات'}`,
    `📍 *راجع من موقع:* ${params.siteName}`,
  ];

  if (params.returnedBy && params.returnedBy.trim()) {
    lines.push(`👷‍♂️ *الفني المسلِّم:* ${params.returnedBy.trim()}`);
  }

  lines.push(`🕒 *الوقت:* ${nowStr}`);
  lines.push(``);
  lines.push(`*العدة المرتجعة (${params.tools.length} قطعة/طقم):*`);

  const missingItemsAlerts: string[] = [];

  params.tools.forEach((t, i) => {
    const cabinetStr = t.cabinet ? ` (دولاب ${t.cabinet})` : '';
    if (t.isKit || t.type === 'طقم') {
      if (t.kitComplete === false) {
        lines.push(`${i + 1}. [${t.code}] ${t.name}${cabinetStr} ⚠️ [طقم به نواقص]`);
        if (t.missingItemsNotes) {
          lines.push(`    ↳ النواقص: ${t.missingItemsNotes}`);
          missingItemsAlerts.push(`[${t.code}] ${t.name}: ${t.missingItemsNotes}`);
        }
      } else {
        lines.push(`${i + 1}. [${t.code}] ${t.name}${cabinetStr} [طقم كامل ✅]`);
      }
    } else {
      lines.push(`${i + 1}. [${t.code}] ${t.name}${cabinetStr}`);
    }
  });

  if (missingItemsAlerts.length > 0) {
    lines.push(``);
    lines.push(`⚠️ *تنبيه بنواقص تم تسجيلها أثناء الاستلام:*`);
    missingItemsAlerts.forEach((m) => lines.push(`• ${m}`));
  }

  if (params.generalNotes && params.generalNotes.trim()) {
    lines.push(``);
    lines.push(`📝 *ملاحظات الاستلام:* ${params.generalNotes.trim()}`);
  }

  lines.push(``);
  lines.push(`✅ *تم استلام العدة بالمخزن وتحديث حالتها إلى [متاح]*`);

  return lines.join('\n');
}

