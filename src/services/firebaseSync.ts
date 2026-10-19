import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDocFromServer,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { AppData, Tool, Technician, Site, Transaction, AppSettings } from '../types';
import { initialSeedData } from '../seedData';
import appletConfig from '../../firebase-applet-config.json';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  errorCode?: string;
  operationType: OperationType;
  path: string | null;
  timestamp: string;
  projectId?: string;
  databaseId?: string;
}

const STORAGE_KEY = 'al3da_firebase_config';

/**
 * Detailed error handler to print diagnostic information in console.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  databaseId?: string
) {
  const err = error as any;
  const errorCode = err?.code || 'unknown';
  const errorMessage = err instanceof Error ? err.message : String(error);

  const errorInfo: FirestoreErrorInfo = {
    error: errorMessage,
    errorCode,
    operationType,
    path,
    timestamp: new Date().toISOString(),
    projectId: appletConfig.projectId,
    databaseId: databaseId || (appletConfig as any).firestoreDatabaseId || '(default)',
  };

  console.group('🔥 [Firestore Error / خطأ في فايربيز]');
  console.error('تفاصيل الخطأ التشخيصية (Diagnostic Details):', errorInfo);
  
  if (errorCode === 'permission-denied') {
    console.warn(
      '⚠️ سبب محتمل (Permission Denied): قواعد أمان Firestore (firestore.rules) تمنع العملية. تأكد من نشر قواعد تسمح بالقراءة والكتابة.'
    );
  } else if (errorCode === 'not-found') {
    console.warn(
      `⚠️ سبب محتمل (Database Not Found): قاعدة البيانات ذات المعرف [${errorInfo.databaseId}] غير موجودة أو لم تكتمل تهيئتها في مشروع [${errorInfo.projectId}].`
    );
  } else if (errorCode === 'unavailable') {
    console.warn(
      '⚠️ سبب محتمل (Service Unavailable): تعذر الوصول لخدمة Firestore. تحقق من اتصال الإنترنت أو إعدادات الجدار الناري.'
    );
  } else if (errorMessage.includes('client is offline')) {
    console.warn(
      '⚠️ سبب محتمل (Client Offline): المتصفح أو التطبيق غير متصل بالإنترنت حالياً.'
    );
  }
  console.groupEnd();

  return errorInfo;
}

// 1. Get configuration prioritizing firebase-applet-config.json, then localStorage, then Vite env
export function getFirebaseConfig(): FirebaseWebConfig | null {
  // If provisioned config exists and is valid
  if (appletConfig && appletConfig.apiKey && appletConfig.projectId) {
    return {
      apiKey: appletConfig.apiKey,
      projectId: appletConfig.projectId,
      authDomain: appletConfig.authDomain || `${appletConfig.projectId}.firebaseapp.com`,
      storageBucket: appletConfig.storageBucket || `${appletConfig.projectId}.firebasestorage.app`,
      messagingSenderId: appletConfig.messagingSenderId || '',
      appId: appletConfig.appId || '',
      firestoreDatabaseId: (appletConfig as any).firestoreDatabaseId || undefined,
    };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading stored Firebase config:', err);
  }

  // Fallback to import.meta.env
  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (envApiKey && envProjectId) {
    return {
      apiKey: envApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
      firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || undefined,
    };
  }

  return null;
}

// 2. Save Firebase configuration
export function saveFirebaseConfig(config: FirebaseWebConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// 3. Clear Firebase configuration
export function clearFirebaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// 4. Initialize Firebase App & Firestore
let cachedDb: Firestore | null = null;
let currentProjectId: string | null = null;
let currentDbId: string | null = null;

export function getFirestoreDb(): Firestore | null {
  const config = getFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    console.warn('⚠️ [Firebase] لم يتم العثور على إعدادات صالحة لـ Firebase.');
    return null;
  }

  const targetDbId = config.firestoreDatabaseId || '(default)';
  if (cachedDb && currentProjectId === config.projectId && currentDbId === targetDbId) {
    return cachedDb;
  }

  try {
    const appName = config.firestoreDatabaseId
      ? `al3da-${config.projectId}-${config.firestoreDatabaseId}`
      : `al3da-${config.projectId}`;

    let app = getApps().find((a) => a.name === appName);
    if (!app) {
      const defaultApp = getApps().find((a) => a.name === '[DEFAULT]');
      if (!defaultApp) {
        app = initializeApp(config);
      } else {
        app = initializeApp(config, appName);
      }
    }

    if (config.firestoreDatabaseId) {
      cachedDb = getFirestore(app, config.firestoreDatabaseId);
    } else {
      cachedDb = getFirestore(app);
    }

    currentProjectId = config.projectId;
    currentDbId = targetDbId;

    console.log(
      `✅ [Firebase Initialized] Project: ${config.projectId} | Database: ${targetDbId}`
    );

    return cachedDb;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'initialization', targetDbId);
    return null;
  }
}

// 5. Test Live Connection to Firestore (Per Firebase Integration guidelines)
export async function testConnection(firestore: Firestore): Promise<boolean> {
  const config = getFirebaseConfig();
  const dbId = config?.firestoreDatabaseId || '(default)';
  try {
    console.log(`🔍 [Firebase Test] جاري اختبار الاتصال المباشر بالسحابة (DB: ${dbId})...`);
    // Attempt to read from tools or test doc
    const testDoc = await getDocFromServer(doc(firestore, 'tools', 'HL-01'));
    if (testDoc.exists()) {
      console.log('✅ [Firebase Test Succeeded] الاتصال بالسحابة يعمل بنجاح والبيانات متوفرة.');
    } else {
      console.log('ℹ️ [Firebase Test] تم الاتصال بالسحابة ولكن لم يُعثر على المستند HL-01.');
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'tools/HL-01', dbId);
    return false;
  }
}

// 6. Seed Firestore if it is completely empty
export async function seedFirestoreIfEmpty(firestore: Firestore): Promise<void> {
  try {
    const toolsSnap = await getDocs(collection(firestore, 'tools'));
    if (!toolsSnap.empty) {
      return; // Already populated
    }

    console.log('🚀 [Firestore Seeding] قاعدة البيانات فارغة، جاري رفع البيانات الأولية...');
    const batch = writeBatch(firestore);

    // Seed tools
    for (const tool of initialSeedData.tools) {
      const toolRef = doc(firestore, 'tools', tool.code);
      batch.set(toolRef, tool);
    }

    // Seed technicians
    for (const tech of initialSeedData.technicians) {
      const techRef = doc(firestore, 'technicians', tech.id);
      batch.set(techRef, tech);
    }

    // Seed sites
    for (const site of initialSeedData.sites) {
      const siteRef = doc(firestore, 'sites', site.id);
      batch.set(siteRef, site);
    }

    // Seed transactions
    for (const tx of initialSeedData.transactions) {
      const txRef = doc(firestore, 'transactions', tx.id);
      batch.set(txRef, tx);
    }

    // Seed settings
    const settingsRef = doc(firestore, 'settings', 'global');
    batch.set(settingsRef, initialSeedData.settings);

    await batch.commit();
    console.log('🎉 [Firestore Seeding Complete] تم رفع كامل البيانات الأولية للسحابة بنجاح!');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'seedFirestoreIfEmpty');
  }
}

// 7. Real-time Subscription to Firestore Data
export function subscribeToFirestore(
  firestore: Firestore,
  onData: (data: AppData) => void,
  onError: (err: any) => void
): () => void {
  const config = getFirebaseConfig();
  const dbId = config?.firestoreDatabaseId || '(default)';

  console.log(`📡 [Firestore Listener] بدء الاستماع اللحظي للتعديلات (Database: ${dbId})...`);

  // Execute connectivity test in background
  testConnection(firestore).catch(() => {});

  const currentData: AppData = {
    tools: [...initialSeedData.tools],
    technicians: [...initialSeedData.technicians],
    sites: [...initialSeedData.sites],
    transactions: [...initialSeedData.transactions],
    settings: { ...initialSeedData.settings },
  };

  const emit = () => {
    onData({
      tools: [...currentData.tools],
      technicians: [...currentData.technicians],
      sites: [...currentData.sites],
      transactions: [...currentData.transactions],
      settings: { ...currentData.settings },
    });
  };

  const unsubTools = onSnapshot(
    collection(firestore, 'tools'),
    (snap) => {
      if (!snap.empty) {
        currentData.tools = snap.docs.map((d) => d.data() as Tool);
        console.log(`📦 [Firestore tools] تم استلام ${snap.docs.length} قطعة عدة`);
      }
      emit();
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'tools', dbId);
      onError(err);
    }
  );

  const unsubTechs = onSnapshot(
    collection(firestore, 'technicians'),
    (snap) => {
      if (!snap.empty) {
        currentData.technicians = snap.docs.map((d) => d.data() as Technician);
      }
      emit();
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'technicians', dbId);
      onError(err);
    }
  );

  const unsubSites = onSnapshot(
    collection(firestore, 'sites'),
    (snap) => {
      if (!snap.empty) {
        currentData.sites = snap.docs.map((d) => d.data() as Site);
      }
      emit();
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'sites', dbId);
      onError(err);
    }
  );

  const unsubTx = onSnapshot(
    collection(firestore, 'transactions'),
    (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map((d) => d.data() as Transaction);
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        currentData.transactions = list;
      }
      emit();
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'transactions', dbId);
      emit();
    }
  );

  const unsubSettings = onSnapshot(
    doc(firestore, 'settings', 'global'),
    (snap) => {
      if (snap.exists()) {
        currentData.settings = snap.data() as AppSettings;
      }
      emit();
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/global', dbId);
      onError(err);
    }
  );

  // Trigger initial check and auto-seed if empty
  seedFirestoreIfEmpty(firestore).catch((err) => {
    handleFirestoreError(err, OperationType.WRITE, 'seedFirestoreIfEmpty', dbId);
  });

  return () => {
    console.log('🔌 [Firestore Listener] إيقاف الاستماع للمجموعات');
    unsubTools();
    unsubTechs();
    unsubSites();
    unsubTx();
    unsubSettings();
  };
}

// 8. Operations executed directly on Firestore for instant online sync across all devices
export const firestoreOperations = {
  async checkoutTools(
    firestore: Firestore,
    params: {
      toolCodes: string[];
      technicianNames: string[];
      siteId?: string;
      siteName?: string;
      newSiteAddress?: string;
      notes?: string;
    }
  ): Promise<{ message: string }> {
    try {
      const timestamp = new Date().toISOString();
      const batch = writeBatch(firestore);

      if (params.siteName) {
        const siteId = params.siteId || `site-${Date.now()}`;
        const siteRef = doc(firestore, 'sites', siteId);
        batch.set(
          siteRef,
          {
            id: siteId,
            name: params.siteName.trim(),
            address: params.newSiteAddress?.trim() || '',
            active: true,
            createdAt: timestamp,
          },
          { merge: true }
        );
      }

      for (const code of params.toolCodes) {
        const toolRef = doc(firestore, 'tools', code);
        batch.set(
          toolRef,
          {
            status: 'في موقع',
            currentSite: params.siteName || '',
            currentTechnicians: params.technicianNames,
            checkoutDate: timestamp,
          },
          { merge: true }
        );

        const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const txRef = doc(firestore, 'transactions', txId);
        const tx: Transaction = {
          id: txId,
          timestamp,
          type: 'خروج',
          toolCode: code,
          toolName: code,
          technicians: params.technicianNames,
          site: params.siteName || '',
          notes: params.notes || '',
        };
        batch.set(txRef, tx);
      }

      await batch.commit();
      console.log(`✅ [Firestore checkout] تم حفظ خروج ${params.toolCodes.length} قطعة بنجاح.`);
      return { message: `تم تسجيل خروج ${params.toolCodes.length} قطعة بنجاح إلى ${params.siteName}` };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'checkoutTools');
      throw err;
    }
  },

  async returnTools(
    firestore: Firestore,
    params: {
      siteName: string;
      returns: { toolCode: string; isKit: boolean; kitComplete: boolean; missingItemsNotes?: string }[];
      returnedBy?: string;
      generalNotes?: string;
    }
  ): Promise<{ message: string }> {
    try {
      const timestamp = new Date().toISOString();
      const batch = writeBatch(firestore);

      for (const item of params.returns) {
        const toolRef = doc(firestore, 'tools', item.toolCode);
        const updateData: any = {
          status: 'متاح',
          currentSite: null,
          currentTechnicians: null,
          checkoutDate: null,
        };
        if (item.missingItemsNotes) {
          updateData.notes = `(تنبيه نواقص: ${item.missingItemsNotes})`;
        }
        batch.set(toolRef, updateData, { merge: true });

        const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const txRef = doc(firestore, 'transactions', txId);
        const tx: Transaction = {
          id: txId,
          timestamp,
          type: 'رجوع',
          toolCode: item.toolCode,
          toolName: item.toolCode,
          site: params.siteName,
          technicians: params.returnedBy ? [params.returnedBy] : [],
          kitComplete: item.kitComplete,
          missingItemsNotes: item.missingItemsNotes || '',
          notes: params.generalNotes || '',
        };
        batch.set(txRef, tx);
      }

      await batch.commit();
      console.log(`✅ [Firestore return] تم حفظ رجوع ${params.returns.length} قطعة بنجاح.`);
      return { message: `تم تسجيل رجوع ${params.returns.length} قطعة بنجاح إلى المخزن المركزي` };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'returnTools');
      throw err;
    }
  },

  async transferTools(
    firestore: Firestore,
    params: {
      toolCodes: string[];
      fromSite: string;
      toSite: string;
      newToSiteAddress?: string;
      technicianName: string;
      notes?: string;
    }
  ): Promise<{ message: string }> {
    try {
      const timestamp = new Date().toISOString();
      const batch = writeBatch(firestore);

      const toSiteId = `site-${Date.now()}`;
      const siteRef = doc(firestore, 'sites', toSiteId);
      batch.set(
        siteRef,
        {
          id: toSiteId,
          name: params.toSite.trim(),
          address: params.newToSiteAddress || '',
          active: true,
          createdAt: timestamp,
        },
        { merge: true }
      );

      for (const code of params.toolCodes) {
        const toolRef = doc(firestore, 'tools', code);
        batch.set(
          toolRef,
          {
            status: 'في موقع',
            currentSite: params.toSite.trim(),
            currentTechnicians: [params.technicianName],
            checkoutDate: timestamp,
          },
          { merge: true }
        );

        const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const txRef = doc(firestore, 'transactions', txId);
        const tx: Transaction = {
          id: txId,
          timestamp,
          type: 'نقل',
          toolCode: code,
          toolName: code,
          fromSite: params.fromSite,
          toSite: params.toSite,
          technicians: [params.technicianName],
          notes: params.notes || '',
        };
        batch.set(txRef, tx);
      }

      await batch.commit();
      console.log(`✅ [Firestore transfer] تم حفظ نقل ${params.toolCodes.length} قطعة بنجاح.`);
      return { message: `تم نقل ${params.toolCodes.length} قطعة بنجاح إلى ${params.toSite}` };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transferTools');
      throw err;
    }
  },

  async saveTool(firestore: Firestore, tool: Partial<Tool>): Promise<void> {
    try {
      if (!tool.code) throw new Error('كود العدة مطلوب');
      const toolRef = doc(firestore, 'tools', tool.code);
      await setDoc(toolRef, tool, { merge: true });
      console.log(`✅ [Firestore saveTool] تم حفظ العدة ${tool.code}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tools/${tool.code}`);
      throw err;
    }
  },

  async changeToolStatus(
    firestore: Firestore,
    code: string,
    status: Tool['status'],
    notes?: string
  ): Promise<void> {
    try {
      const toolRef = doc(firestore, 'tools', code);
      const updateData: any = { status };
      if (notes) updateData.notes = notes;
      if (status === 'متاح' || status === 'صيانة' || status === 'مفقود') {
        updateData.currentSite = null;
        updateData.currentTechnicians = null;
        updateData.checkoutDate = null;
      }
      await setDoc(toolRef, updateData, { merge: true });

      const txId = `tx-${Date.now()}`;
      const txRef = doc(firestore, 'transactions', txId);
      await setDoc(txRef, {
        id: txId,
        timestamp: new Date().toISOString(),
        type: status === 'صيانة' ? 'صيانة' : status === 'مفقود' ? 'مفقود' : 'تعديل',
        toolCode: code,
        toolName: code,
        notes: notes || `تغيير الحالة إلى ${status}`,
      });
      console.log(`✅ [Firestore changeToolStatus] تم تغيير حالة ${code} إلى ${status}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tools/${code}/status`);
      throw err;
    }
  },

  async saveTechnician(firestore: Firestore, tech: Partial<Technician>): Promise<void> {
    try {
      const id = tech.id || `tech-${Date.now()}`;
      const techRef = doc(firestore, 'technicians', id);
      await setDoc(techRef, { ...tech, id }, { merge: true });
      console.log(`✅ [Firestore saveTechnician] تم حفظ الفني ${id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `technicians/${tech.id}`);
      throw err;
    }
  },

  async saveSite(firestore: Firestore, site: Partial<Site>): Promise<void> {
    try {
      const id = site.id || `site-${Date.now()}`;
      const siteRef = doc(firestore, 'sites', id);
      await setDoc(siteRef, { ...site, id }, { merge: true });
      console.log(`✅ [Firestore saveSite] تم حفظ الموقع ${id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `sites/${site.id}`);
      throw err;
    }
  },

  async saveSettings(firestore: Firestore, settings: Partial<AppSettings>): Promise<void> {
    try {
      const settingsRef = doc(firestore, 'settings', 'global');
      await setDoc(settingsRef, settings, { merge: true });
      console.log('✅ [Firestore saveSettings] تم حفظ الإعدادات');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/global');
      throw err;
    }
  },

  async resetSeed(firestore: Firestore): Promise<void> {
    try {
      const batch = writeBatch(firestore);
      for (const tool of initialSeedData.tools) {
        batch.set(doc(firestore, 'tools', tool.code), tool);
      }
      for (const tech of initialSeedData.technicians) {
        batch.set(doc(firestore, 'technicians', tech.id), tech);
      }
      for (const site of initialSeedData.sites) {
        batch.set(doc(firestore, 'sites', site.id), site);
      }
      for (const tx of initialSeedData.transactions) {
        batch.set(doc(firestore, 'transactions', tx.id), tx);
      }
      batch.set(doc(firestore, 'settings', 'global'), initialSeedData.settings);
      await batch.commit();
      console.log('✅ [Firestore resetSeed] تمت استعادة البيانات الافتراضية');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'resetSeed');
      throw err;
    }
  },
};
