import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
  limit,
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

const STORAGE_KEY = 'al3da_firebase_config';

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

export function getFirestoreDb(): Firestore | null {
  const config = getFirebaseConfig();
  if (!config) return null;

  if (cachedDb && currentProjectId === config.projectId) {
    return cachedDb;
  }

  try {
    const appName = `al3da-${config.projectId}`;
    let app: FirebaseApp;
    const existing = getApps().find((a) => a.name === appName || a.name === '[DEFAULT]');
    if (existing) {
      app = existing;
    } else {
      app = initializeApp(config, appName);
    }

    // Connect to specific database ID if provisioned
    if (config.firestoreDatabaseId) {
      cachedDb = getFirestore(app, config.firestoreDatabaseId);
    } else {
      cachedDb = getFirestore(app);
    }

    currentProjectId = config.projectId;
    return cachedDb;
  } catch (err) {
    console.error('Failed to initialize Firestore:', err);
    return null;
  }
}

// 5. Seed Firestore if it is completely empty
export async function seedFirestoreIfEmpty(firestore: Firestore): Promise<void> {
  try {
    const toolsSnap = await getDocs(collection(firestore, 'tools'));
    if (!toolsSnap.empty) {
      return; // Already populated
    }

    console.log('Seeding initial tools data into Firestore...');
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
    console.log('Firestore successfully seeded!');
  } catch (err) {
    console.error('Error seeding Firestore:', err);
  }
}

// 6. Real-time Subscription to Firestore Data
export function subscribeToFirestore(
  firestore: Firestore,
  onData: (data: AppData) => void,
  onError: (err: any) => void
): () => void {
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
      }
      emit();
    },
    (err) => onError(err)
  );

  const unsubTechs = onSnapshot(
    collection(firestore, 'technicians'),
    (snap) => {
      if (!snap.empty) {
        currentData.technicians = snap.docs.map((d) => d.data() as Technician);
      }
      emit();
    },
    (err) => onError(err)
  );

  const unsubSites = onSnapshot(
    collection(firestore, 'sites'),
    (snap) => {
      if (!snap.empty) {
        currentData.sites = snap.docs.map((d) => d.data() as Site);
      }
      emit();
    },
    (err) => onError(err)
  );

  const txQuery = query(collection(firestore, 'transactions'), orderBy('timestamp', 'desc'), limit(150));
  const unsubTx = onSnapshot(
    txQuery,
    (snap) => {
      if (!snap.empty) {
        currentData.transactions = snap.docs.map((d) => d.data() as Transaction);
      }
      emit();
    },
    (err) => {
      console.warn('Transactions sorted query failed, trying standard collection query:', err);
      onSnapshot(collection(firestore, 'transactions'), (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => d.data() as Transaction);
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          currentData.transactions = list;
          emit();
        }
      });
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
    (err) => onError(err)
  );

  // Trigger initial check and auto-seed if empty
  seedFirestoreIfEmpty(firestore).catch((err) => console.warn('Seed check error:', err));

  return () => {
    unsubTools();
    unsubTechs();
    unsubSites();
    unsubTx();
    unsubSettings();
  };
}

// 7. Operations executed directly on Firestore for instant online sync across all devices
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
    return { message: `تم تسجيل خروج ${params.toolCodes.length} قطعة بنجاح إلى ${params.siteName}` };
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
    return { message: `تم تسجيل رجوع ${params.returns.length} قطعة بنجاح إلى المخزن المركزي` };
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
    return { message: `تم نقل ${params.toolCodes.length} قطعة بنجاح إلى ${params.toSite}` };
  },

  async saveTool(firestore: Firestore, tool: Partial<Tool>): Promise<void> {
    if (!tool.code) throw new Error('كود العدة مطلوب');
    const toolRef = doc(firestore, 'tools', tool.code);
    await setDoc(toolRef, tool, { merge: true });
  },

  async changeToolStatus(
    firestore: Firestore,
    code: string,
    status: Tool['status'],
    notes?: string
  ): Promise<void> {
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
  },

  async saveTechnician(firestore: Firestore, tech: Partial<Technician>): Promise<void> {
    const id = tech.id || `tech-${Date.now()}`;
    const techRef = doc(firestore, 'technicians', id);
    await setDoc(techRef, { ...tech, id }, { merge: true });
  },

  async saveSite(firestore: Firestore, site: Partial<Site>): Promise<void> {
    const id = site.id || `site-${Date.now()}`;
    const siteRef = doc(firestore, 'sites', id);
    await setDoc(siteRef, { ...site, id }, { merge: true });
  },

  async saveSettings(firestore: Firestore, settings: Partial<AppSettings>): Promise<void> {
    const settingsRef = doc(firestore, 'settings', 'global');
    await setDoc(settingsRef, settings, { merge: true });
  },

  async resetSeed(firestore: Firestore): Promise<void> {
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
  },
};
