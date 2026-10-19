/**
 * CSV Utilities with UTF-8 BOM for flawless Excel Arabic support
 */

import { Tool, Technician, Site, Transaction } from '../types';

export function downloadCsv(filename: string, csvContent: string) {
  // \uFEFF ensures Microsoft Excel detects UTF-8 Arabic correctly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportToolsToCsv(tools: Tool[]): void {
  const headers = ['رقم العدة', 'اسم العدة', 'التصنيف', 'الدولاب', 'النوع', 'محتويات الطقم', 'الحالة', 'الموقع الحالي', 'الفني المستلم', 'تاريخ الخروج', 'ملاحظات'];
  const rows = tools.map((t) => [
    escapeCsvCell(t.code),
    escapeCsvCell(t.name),
    escapeCsvCell(t.category),
    escapeCsvCell(t.cabinet),
    escapeCsvCell(t.type),
    escapeCsvCell(t.kitItems || ''),
    escapeCsvCell(t.status),
    escapeCsvCell(t.currentSite || ''),
    escapeCsvCell((t.currentTechnicians || []).join('، ')),
    escapeCsvCell(t.checkoutDate ? new Date(t.checkoutDate).toLocaleString('ar-EG') : ''),
    escapeCsvCell(t.notes || ''),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadCsv(`عدة_التركيبات_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

export function exportTransactionsToCsv(transactions: Transaction[]): void {
  const headers = ['رقم الحركة', 'التاريخ والوقت', 'نوع الحركة', 'رقم العدة', 'اسم العدة', 'الفني', 'الموقع', 'من موقع', 'إلى موقع', 'حالة الطقم', 'نواقص الطقم', 'ملاحظات'];
  const rows = transactions.map((tx) => [
    escapeCsvCell(tx.id),
    escapeCsvCell(new Date(tx.timestamp).toLocaleString('ar-EG')),
    escapeCsvCell(tx.type),
    escapeCsvCell(tx.toolCode),
    escapeCsvCell(tx.toolName),
    escapeCsvCell((tx.technicians || []).join('، ')),
    escapeCsvCell(tx.site || ''),
    escapeCsvCell(tx.fromSite || ''),
    escapeCsvCell(tx.toSite || ''),
    escapeCsvCell(tx.kitComplete === false ? 'ناقص' : tx.kitComplete === true ? 'كامل' : ''),
    escapeCsvCell(tx.missingItemsNotes || ''),
    escapeCsvCell(tx.notes || ''),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadCsv(`سجل_حركات_العدة_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

export function exportSitesToCsv(sites: Site[]): void {
  const headers = ['اسم الموقع', 'العنوان', 'الحالة'];
  const rows = sites.map((s) => [
    escapeCsvCell(s.name),
    escapeCsvCell(s.address || ''),
    escapeCsvCell(s.active ? 'نشط' : 'منتهي'),
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadCsv(`المواقع_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

export function exportTechniciansToCsv(techs: Technician[]): void {
  const headers = ['اسم الفني', 'رقم الموبايل', 'الرقم السري', 'الحالة'];
  const rows = techs.map((t) => [
    escapeCsvCell(t.name),
    escapeCsvCell(t.phone),
    escapeCsvCell(t.pin || ''),
    escapeCsvCell(t.active ? 'نشط' : 'غير نشط'),
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadCsv(`الفنيين_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

/**
 * Basic CSV Parser supporting quoted cells
 */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '').trim();
  const lines = clean.split(/\r\n|\n|\r/);
  const result: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let insideQuotes = false;
    let currentCell = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' && insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip next quote
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    result.push(row);
  }

  return result;
}

/**
 * Generate starter CSV template for tools
 */
export function downloadToolTemplateCsv(): void {
  const template =
    'رقم العدة,اسم العدة,التصنيف,الدولاب,النوع,محتويات الطقم,ملاحظات\r\n' +
    '"DR-10","شنيور ماكيتا 18V","كهربائي","1","قطعة واحدة","","في شنطة بلاستيك"\r\n' +
    '"KT-05","طقم بنط هيلتي وفيدياه","كهربائي","2","طقم","بنط 6 مم × 2، بنط 8 مم × 2","أصلي بوش"\r\n' +
    '"LD-05","سلم تلسكوبي 4 متر","سلالم","3","قطعة واحدة","","ألومنيوم مقوى"';

  downloadCsv('نموذج_استيراد_العدة.csv', template);
}
