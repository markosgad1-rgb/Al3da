import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { initialSeedData } from './seedData';
import { AppData, Tool, Technician, Site, Transaction, AppSettings } from './types';

// Detect environment: on Vercel or read-only environments, use /tmp
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('Could not create data directory, using memory fallback:', err);
}

// In-memory data cache
let db: AppData;

function loadDatabase(): AppData {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.tools) && Array.isArray(parsed.transactions)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Notice: Using initial seed database data');
  }
  // Initialize with seed data
  saveDatabase(initialSeedData);
  return JSON.parse(JSON.stringify(initialSeedData));
}

function saveDatabase(data: AppData) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Warning: Could not write db.json to disk (ephemeral memory used):', err);
  }
}

db = loadDatabase();

export const app = express();
app.use(express.json());

// --- API Endpoints ---

// Get all data
app.get('/api/data', (_req: Request, res: Response) => {
  res.json(db);
});

// Reset to initial seed
app.post('/api/reset-seed', (_req: Request, res: Response) => {
  db = JSON.parse(JSON.stringify(initialSeedData));
  saveDatabase(db);
  res.json({ success: true, data: db, message: 'تمت استعادة البيانات الافتراضية بنجاح' });
});

// Update Settings
app.post('/api/settings', (req: Request, res: Response) => {
  const { overdueDaysThreshold, adminPasswordHash, companyName, whatsappGroupPhone } = req.body;
  if (overdueDaysThreshold !== undefined) db.settings.overdueDaysThreshold = Number(overdueDaysThreshold) || 7;
  if (adminPasswordHash !== undefined && adminPasswordHash.trim()) db.settings.adminPasswordHash = adminPasswordHash.trim();
  if (companyName !== undefined) db.settings.companyName = companyName.trim();
  if (whatsappGroupPhone !== undefined) db.settings.whatsappGroupPhone = whatsappGroupPhone.trim();

  saveDatabase(db);
  res.json({ success: true, settings: db.settings, message: 'تم حفظ الإعدادات بنجاح' });
});

// Checkout tools (خروج عدة)
app.post('/api/checkout', (req: Request, res: Response) => {
  const { toolCodes, technicianNames, siteId, siteName, newSiteAddress, notes } = req.body;

  if (!Array.isArray(toolCodes) || toolCodes.length === 0) {
    return res.status(400).json({ error: 'يجب اختيار قطعة عدة واحدة على الأقل' });
  }
  if (!Array.isArray(technicianNames) || technicianNames.length === 0) {
    return res.status(400).json({ error: 'يجب تحديد فني مستلم واحد على الأقل' });
  }
  if (!siteName && !siteId) {
    return res.status(400).json({ error: 'يجب اختيار موقع أو إضافة موقع جديد' });
  }

  // Determine target site name
  let targetSiteName = '';
  if (siteId) {
    const existing = db.sites.find((s) => s.id === siteId);
    if (existing) {
      targetSiteName = existing.name;
    }
  }
  if (!targetSiteName && siteName) {
    targetSiteName = siteName.trim();
    // Add new site to database
    const existingSiteByName = db.sites.find((s) => s.name.toLowerCase() === targetSiteName.toLowerCase());
    if (!existingSiteByName) {
      const newSite: Site = {
        id: `site-${Date.now()}`,
        name: targetSiteName,
        address: newSiteAddress?.trim() || '',
        active: true,
        createdAt: new Date().toISOString(),
      };
      db.sites.push(newSite);
    }
  }

  // Concurrency Check: verify each tool is available
  const unavailableTools: string[] = [];
  for (const code of toolCodes) {
    const tool = db.tools.find((t) => t.code === code);
    if (!tool) {
      unavailableTools.push(`العدة بكود ${code} غير موجودة`);
    } else if (tool.status !== 'متاح') {
      const details = tool.status === 'في موقع' ? `في موقع: ${tool.currentSite || 'موقع آخر'}` : `حالتها: ${tool.status}`;
      unavailableTools.push(`${tool.code} (${tool.name}) - [${details}]`);
    }
  }

  if (unavailableTools.length > 0) {
    return res.status(409).json({
      error: `تعذر إتمام الخروج لأن بعض القطع غير متاحة حالياً:\n` + unavailableTools.join('\n'),
    });
  }

  const timestamp = new Date().toISOString();
  const updatedTools: Tool[] = [];

  // Perform Checkout
  for (const code of toolCodes) {
    const tool = db.tools.find((t) => t.code === code)!;
    tool.status = 'في موقع';
    tool.currentSite = targetSiteName;
    tool.currentTechnicians = technicianNames;
    tool.checkoutDate = timestamp;

    // Log transaction (لا يُحذف أبداً)
    const tx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp,
      type: 'خروج',
      toolCode: tool.code,
      toolName: tool.name,
      technicians: technicianNames,
      site: targetSiteName,
      notes: notes?.trim() || '',
    };
    db.transactions.unshift(tx);
    updatedTools.push(tool);
  }

  saveDatabase(db);
  return res.json({
    success: true,
    message: `تم تسجيل خروج ${updatedTools.length} قطعة بنجاح إلى ${targetSiteName}`,
    updatedTools,
    data: db,
  });
});

// Return tools (رجوع عدة)
app.post('/api/return', (req: Request, res: Response) => {
  const { siteName, returns, returnedBy, generalNotes } = req.body;

  if (!Array.isArray(returns) || returns.length === 0) {
    return res.status(400).json({ error: 'يجب اختيار قطعة عدة واحدة على الأقل لتسجيل رجوعها' });
  }

  const timestamp = new Date().toISOString();
  const returnedTools: Tool[] = [];

  for (const item of returns) {
    const tool = db.tools.find((t) => t.code === item.toolCode);
    if (tool) {
      const prevSite = tool.currentSite || siteName || '';
      tool.status = 'متاح';
      tool.currentSite = undefined;
      tool.currentTechnicians = undefined;
      tool.checkoutDate = undefined;

      // If missing items reported in a kit, keep note on tool if needed
      if (tool.type === 'طقم' && item.kitComplete === false && item.missingItemsNotes) {
        tool.notes = `(تنبيه نواقص: ${item.missingItemsNotes}) ` + (tool.notes || '');
      }

      const tx: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp,
        type: 'رجوع',
        toolCode: tool.code,
        toolName: tool.name,
        site: prevSite,
        technicians: returnedBy ? [returnedBy] : undefined,
        kitComplete: item.kitComplete !== undefined ? item.kitComplete : true,
        missingItemsNotes: item.missingItemsNotes || '',
        notes: generalNotes?.trim() || '',
      };
      db.transactions.unshift(tx);
      returnedTools.push(tool);
    }
  }

  saveDatabase(db);
  return res.json({
    success: true,
    message: `تم تسجيل رجوع ${returnedTools.length} قطعة بنجاح إلى المخزن`,
    returnedTools,
    data: db,
  });
});

// Transfer tools between sites (نقل بين مواقع)
app.post('/api/transfer', (req: Request, res: Response) => {
  const { toolCodes, fromSite, toSite, newToSiteAddress, technicianName, notes } = req.body;

  if (!Array.isArray(toolCodes) || toolCodes.length === 0) {
    return res.status(400).json({ error: 'يجب اختيار قطعة واحدة على الأقل للنقل' });
  }
  if (!toSite || !toSite.trim()) {
    return res.status(400).json({ error: 'يجب تحديد الموقع المنقول إليه' });
  }
  if (!technicianName || !technicianName.trim()) {
    return res.status(400).json({ error: 'يجب تسجيل اسم الفني القائم بعملية النقل' });
  }

  const targetSiteName = toSite.trim();

  // Ensure site exists
  const existingSite = db.sites.find((s) => s.name.toLowerCase() === targetSiteName.toLowerCase());
  if (!existingSite) {
    db.sites.push({
      id: `site-${Date.now()}`,
      name: targetSiteName,
      address: newToSiteAddress?.trim() || '',
      active: true,
      createdAt: new Date().toISOString(),
    });
  }

  const timestamp = new Date().toISOString();
  const transferredTools: Tool[] = [];

  for (const code of toolCodes) {
    const tool = db.tools.find((t) => t.code === code);
    if (tool) {
      const sourceSite = tool.currentSite || fromSite || 'الموقع السابق';
      tool.status = 'في موقع';
      tool.currentSite = targetSiteName;
      tool.currentTechnicians = [technicianName.trim()];
      tool.checkoutDate = timestamp;

      const tx: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp,
        type: 'نقل',
        toolCode: tool.code,
        toolName: tool.name,
        fromSite: sourceSite,
        toSite: targetSiteName,
        technicians: [technicianName.trim()],
        notes: notes?.trim() || '',
      };
      db.transactions.unshift(tx);
      transferredTools.push(tool);
    }
  }

  saveDatabase(db);
  return res.json({
    success: true,
    message: `تم نقل ${transferredTools.length} قطعة بنجاح إلى ${targetSiteName}`,
    transferredTools,
    data: db,
  });
});

// Change tool status (صيانة / مفقود / متاح)
app.post('/api/tools/:code/status', (req: Request, res: Response) => {
  const { code } = req.params;
  const { status, notes } = req.body;

  const tool = db.tools.find((t) => t.code === code);
  if (!tool) {
    return res.status(404).json({ error: 'العدة غير موجودة' });
  }

  const prevStatus = tool.status;
  tool.status = status;
  if (status === 'متاح' || status === 'صيانة' || status === 'مفقود') {
    tool.currentSite = undefined;
    tool.currentTechnicians = undefined;
    tool.checkoutDate = undefined;
  }
  if (notes) {
    tool.notes = notes.trim();
  }

  const timestamp = new Date().toISOString();
  const tx: Transaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp,
    type: status === 'صيانة' ? 'صيانة' : status === 'مفقود' ? 'مفقود' : 'تعديل',
    toolCode: tool.code,
    toolName: tool.name,
    notes: `تغيير الحالة من [${prevStatus}] إلى [${status}] بواسطة المسؤول: ${notes || ''}`,
  };
  db.transactions.unshift(tx);

  saveDatabase(db);
  return res.json({ success: true, tool, data: db });
});

// Create or update a tool
app.post('/api/tools', (req: Request, res: Response) => {
  const toolData: Tool = req.body;
  if (!toolData.code || !toolData.name) {
    return res.status(400).json({ error: 'رقم العدة والاسم مطلوبان' });
  }

  const existingIndex = db.tools.findIndex((t) => t.code.toLowerCase() === toolData.code.trim().toLowerCase());
  const timestamp = new Date().toISOString();

  if (existingIndex >= 0) {
    db.tools[existingIndex] = {
      ...db.tools[existingIndex],
      name: toolData.name.trim(),
      category: toolData.category || 'أخرى',
      cabinet: toolData.cabinet || '1',
      type: toolData.type || 'قطعة واحدة',
      kitItems: toolData.kitItems?.trim() || '',
      notes: toolData.notes?.trim() || '',
    };
    db.transactions.unshift({
      id: `tx-${Date.now()}`,
      timestamp,
      type: 'تعديل',
      toolCode: toolData.code,
      toolName: toolData.name,
      notes: 'تعديل بيانات العدة من لوحة الإدارة',
    });
  } else {
    const newTool: Tool = {
      code: toolData.code.trim().toUpperCase(),
      name: toolData.name.trim(),
      category: toolData.category || 'كهربائي',
      cabinet: toolData.cabinet || '1',
      type: toolData.type || 'قطعة واحدة',
      kitItems: toolData.kitItems?.trim() || '',
      status: 'متاح',
      notes: toolData.notes?.trim() || '',
    };
    db.tools.push(newTool);
    db.transactions.unshift({
      id: `tx-${Date.now()}`,
      timestamp,
      type: 'تعديل',
      toolCode: newTool.code,
      toolName: newTool.name,
      notes: 'إضافة قطعة عدة جديدة للمخزن',
    });
  }

  saveDatabase(db);
  return res.json({ success: true, data: db });
});

// Add / Edit Technician
app.post('/api/technicians', (req: Request, res: Response) => {
  const { id, name, phone, pin, active } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'اسم الفني مطلوب' });
  }

  if (id) {
    const idx = db.technicians.findIndex((t) => t.id === id);
    if (idx >= 0) {
      db.technicians[idx] = {
        ...db.technicians[idx],
        name: name.trim(),
        phone: phone?.trim() || '',
        pin: pin?.trim() || '',
        active: active !== undefined ? active : true,
      };
    }
  } else {
    const newTech: Technician = {
      id: `tech-${Date.now()}`,
      name: name.trim(),
      phone: phone?.trim() || '',
      pin: pin?.trim() || '',
      active: true,
    };
    db.technicians.push(newTech);
  }

  saveDatabase(db);
  return res.json({ success: true, data: db });
});

// Add / Edit Site
app.post('/api/sites', (req: Request, res: Response) => {
  const { id, name, address, active } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'اسم الموقع مطلوب' });
  }

  if (id) {
    const idx = db.sites.findIndex((s) => s.id === id);
    if (idx >= 0) {
      db.sites[idx] = {
        ...db.sites[idx],
        name: name.trim(),
        address: address?.trim() || '',
        active: active !== undefined ? active : true,
      };
    }
  } else {
    const newSite: Site = {
      id: `site-${Date.now()}`,
      name: name.trim(),
      address: address?.trim() || '',
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.sites.push(newSite);
  }

  saveDatabase(db);
  return res.json({ success: true, data: db });
});

// Batch Import (Tools, Techs, Sites)
app.post('/api/import', (req: Request, res: Response) => {
  const { type, items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'لا توجد بيانات للاستيراد' });
  }

  let importedCount = 0;

  if (type === 'tools') {
    for (const item of items) {
      if (!item.code || !item.name) continue;
      const code = String(item.code).trim().toUpperCase();
      const existingIdx = db.tools.findIndex((t) => t.code === code);
      const toolObj: Tool = {
        code,
        name: String(item.name).trim(),
        category: item.category || 'أخرى',
        cabinet: '1',
        type: item.type === 'طقم' ? 'طقم' : 'قطعة واحدة',
        kitItems: item.kitItems ? String(item.kitItems).trim() : '',
        status: (['متاح', 'في موقع', 'صيانة', 'مفقود'].includes(item.status) ? item.status : 'متاح') as any,
        notes: item.notes ? String(item.notes).trim() : '',
      };

      if (existingIdx >= 0) {
        db.tools[existingIdx] = { ...db.tools[existingIdx], ...toolObj };
      } else {
        db.tools.push(toolObj);
      }
      importedCount++;
    }
  } else if (type === 'technicians') {
    for (const item of items) {
      if (!item.name) continue;
      const name = String(item.name).trim();
      const existing = db.technicians.find((t) => t.name === name);
      if (existing) {
        existing.phone = item.phone ? String(item.phone).trim() : existing.phone;
        existing.pin = item.pin ? String(item.pin).trim() : existing.pin;
      } else {
        db.technicians.push({
          id: `tech-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          phone: item.phone ? String(item.phone).trim() : '',
          pin: item.pin ? String(item.pin).trim() : '',
          active: true,
        });
      }
      importedCount++;
    }
  } else if (type === 'sites') {
    for (const item of items) {
      if (!item.name) continue;
      const name = String(item.name).trim();
      const existing = db.sites.find((s) => s.name === name);
      if (existing) {
        existing.address = item.address ? String(item.address).trim() : existing.address;
      } else {
        db.sites.push({
          id: `site-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          address: item.address ? String(item.address).trim() : '',
          active: true,
          createdAt: new Date().toISOString(),
        });
      }
      importedCount++;
    }
  }

  saveDatabase(db);
  return res.json({
    success: true,
    message: `تم استيراد ${importedCount} سجل بنجاح`,
    data: db,
  });
});
