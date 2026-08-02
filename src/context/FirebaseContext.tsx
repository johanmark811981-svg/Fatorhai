import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signInAnonymously, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  orderBy, 
  deleteDoc, 
  updateDoc, 
  addDoc,
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { AppData, User, Transaction, Account, Invoice, Debt, Contract, AppSettings, Product, Customer, Unit, FixedAsset } from '../types';
import { INITIAL_CATEGORIES, INITIAL_INVOICES, INITIAL_ASSETS } from '../data/initialData';
import { normalizeInvoiceList } from '../utils/formatters';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  data: AppData;
  login: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  loginWithPin: (pin: string) => Promise<boolean>;
  loginWithBiometrics: () => Promise<boolean>;
  setAdminPin: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  updateData: (collectionName: keyof AppData, id: string, updates: any) => Promise<void>;
  addData: (collectionName: keyof AppData, data: any) => Promise<void>;
  addBulkData: (collectionName: keyof AppData, items: any[]) => Promise<void>;
  deleteData: (collectionName: keyof AppData, id: string) => Promise<void>;
  deleteBulkData: (collectionName: keyof AppData, ids: string[]) => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

// Helper to sync to localStorage
const syncToLocal = (key: string, data: any) => {
  try {
    localStorage.setItem(`fallback_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to sync to local storage:', e);
  }
};

// Helper to load from localStorage
const loadFromLocal = (key: string, defaultValue: any = []) => {
  try {
    const saved = localStorage.getItem(`fallback_${key}`);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    console.warn('Failed to load from local storage:', e);
    return defaultValue;
  }
};

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AppData>(() => {
    const savedSettings = localStorage.getItem('fallback_settings');
    const defaultSettings: AppSettings = {
      theme: 'dark',
      currency: 'SAR',
      currencySymbol: 'ر.س',
      language: 'ar',
      showiPhoneFrame: true,
      enableSoundEffects: true,
      companyName: 'مؤسسة النواة للتقنية',
      companyVatNumber: '',
      companyPhone: '',
      enableSecurityLock: false,
      adminPin: localStorage.getItem('temp_admin_pin') || '',
    };

    let settings = defaultSettings;
    try {
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        settings = { ...defaultSettings, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to parse saved settings:', e);
    }
    
    // Ensure adminPin is always recovered if possible
    if (!settings.adminPin) {
      settings.adminPin = localStorage.getItem('temp_admin_pin') || '';
    }

    return {
      accounts: loadFromLocal('accounts'),
      transactions: loadFromLocal('transactions'),
      categories: loadFromLocal('categories', INITIAL_CATEGORIES),
      invoices: normalizeInvoiceList(loadFromLocal('invoices', INITIAL_INVOICES)),
      debts: loadFromLocal('debts'),
      contracts: loadFromLocal('contracts'),
      products: loadFromLocal('products'),
      customers: loadFromLocal('customers'),
      assets: loadFromLocal('assets', INITIAL_ASSETS),
      units: loadFromLocal('units', [
        { id: 'حبة', name: 'حبة' },
        { id: 'كرتون', name: 'كرتون' },
        { id: 'كيلو', name: 'كيلو' },
        { id: 'متر', name: 'متر' },
        { id: 'طقم', name: 'طقم' },
        { id: 'درزن', name: 'درزن' }
      ]),
      settings
    };
  });

  useEffect(() => {
    // 1. Initial boot: Check for virtual session immediately
    const isVirtualAdmin = localStorage.getItem('admin_session') === 'true';
    if (isVirtualAdmin) {
      const recoveredUser: User = {
        uid: localStorage.getItem('virtual_uid') || 'recovered_admin_' + Date.now(),
        name: 'المدير العام',
        email: 'admin@system',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      setUser(recoveredUser);
      // Load local data for the virtual session
      setData(prev => ({
        ...prev,
        transactions: loadFromLocal('transactions'),
        accounts: loadFromLocal('accounts'),
        invoices: normalizeInvoiceList(loadFromLocal('invoices', INITIAL_INVOICES)),
        debts: loadFromLocal('debts'),
        contracts: loadFromLocal('contracts'),
        products: loadFromLocal('products'),
        customers: loadFromLocal('customers'),
        assets: loadFromLocal('assets', INITIAL_ASSETS),
        units: loadFromLocal('units', [
          { id: 'حبة', name: 'حبة' },
          { id: 'كرتون', name: 'كرتون' },
          { id: 'كيلو', name: 'كيلو' },
          { id: 'متر', name: 'متر' },
          { id: 'طقم', name: 'طقم' },
          { id: 'درزن', name: 'درزن' }
        ]),
      }));
    }

    // 2. Setup Firebase Auth listener
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      
      if (fUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            if (fUser.email === 'johanmark811981@gmail.com' && userData.role !== 'admin') {
              userData.role = 'admin';
              await updateDoc(doc(db, 'users', fUser.uid), { role: 'admin' }).catch(() => {});
            }
            setUser(userData);
            // Clear virtual session if we have a real one
            localStorage.removeItem('admin_session');
          } else if (fUser.isAnonymous && isVirtualAdmin) {
            // Maintain virtual admin profile even if anonymous auth triggers
            const adminUser: User = {
              uid: fUser.uid,
              name: 'المدير العام',
              email: 'admin@system',
              role: 'admin',
              createdAt: new Date().toISOString(),
            };
            setUser(adminUser);
          } else if (!fUser.isAnonymous) {
            // Auto-profile for Google users
            const newUser: User = {
              uid: fUser.uid,
              name: fUser.displayName || 'مستخدم جديد',
              email: fUser.email || '',
              role: fUser.email === 'johanmark811981@gmail.com' ? 'admin' : 'employee',
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', fUser.uid), newUser).catch(() => {});
            setUser(newUser);
          }
        } catch (e) {
          console.warn('Profile fetch failed, keeping current user state:', e);
        }
      } else if (!isVirtualAdmin) {
        setUser(null);
      }
      
      setLoading(false);
    });

    // Handle any redirect results (e.g. from mobile Google login)
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        console.log('Successfully returned from redirect login');
      }
    }).catch((error) => {
      console.error('Redirect auth error:', error);
    });

    const safetyTimeout = setTimeout(() => setLoading(false), 6000);
    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Real-time listener for current logged-in user profile to catch permission or role changes instantly
  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.data() as User;
        setUser(userData);
      }
    }, (error) => {
      console.warn("User profile listener error:", error);
    });
    return () => unsub();
  }, [firebaseUser]);

  // Settings listener - should run even if not authenticated
  useEffect(() => {
    if (!firebaseUser) {
      // If no real Firebase user, try to load from local storage immediately
      const localSettings = loadFromLocal('settings', null);
      if (localSettings) {
        setData(prev => ({ ...prev, settings: { ...prev.settings, ...localSettings } }));
      }
      return;
    }

    const unsub = onSnapshot(doc(db, 'settings', 'global'), async (snapshot) => {
      try {
        if (snapshot.exists()) {
          const cloudSettings = snapshot.data() as AppSettings;
          setData(prev => {
            const tempPin = localStorage.getItem('temp_admin_pin');
            const mergedSettings = { ...prev.settings, ...cloudSettings };
            
            // Don't let empty cloud PIN overwrite our local temp PIN
            if (tempPin && !mergedSettings.adminPin) {
              mergedSettings.adminPin = tempPin;
            }
            
            syncToLocal('settings', mergedSettings);
            return { ...prev, settings: mergedSettings };
          });
        } else if (user?.role === 'admin') {
          // Initialize cloud settings if they don't exist
          await setDoc(doc(db, 'settings', 'global'), data.settings).catch(e => console.warn('Init settings failed:', e));
        }
      } catch (err) {
        console.error('Settings processing error:', err);
      }
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Settings snapshot permission denied. Using local state.");
        const localSettings = loadFromLocal('settings', null);
        if (localSettings) {
          setData(prev => ({ ...prev, settings: { ...prev.settings, ...localSettings } }));
        }
      } else {
        console.error("Settings snapshot error:", error);
      }
    });

    return () => unsub();
  }, [user?.role, firebaseUser]);

  // Real-time listeners for data - only for logged in users with roles
  useEffect(() => {
    if (!user || !firebaseUser) {
      return;
    }

    const handleSnapshotError = (err: any, collectionName: string) => {
      console.warn(`Firestore listener error for ${collectionName}:`, err.code);
      if (err.code === 'permission-denied') {
        const localData = loadFromLocal(collectionName);
        if (localData.length > 0) {
          setData(prev => ({ ...prev, [collectionName]: localData }));
        }
      }
    };

    const unsubscribers = [
      onSnapshot(query(collection(db, 'transactions'), orderBy('date', 'desc')), (snapshot) => {
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Transaction[];
        setData(prev => ({ ...prev, transactions: docs }));
        syncToLocal('transactions', docs);
      }, (err) => handleSnapshotError(err, 'transactions')),
      onSnapshot(collection(db, 'accounts'), (snapshot) => {
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Account[];
        setData(prev => ({ ...prev, accounts: docs }));
        syncToLocal('accounts', docs);
      }, (err) => handleSnapshotError(err, 'accounts')),
      onSnapshot(query(collection(db, 'invoices'), orderBy('date', 'desc')), (snapshot) => {
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Invoice[];
        const normalized = normalizeInvoiceList(docs);
        setData(prev => ({ ...prev, invoices: normalized }));
        syncToLocal('invoices', normalized);
      }, (err) => handleSnapshotError(err, 'invoices')),
      onSnapshot(collection(db, 'debts'), (snapshot) => {
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Debt[];
        setData(prev => ({ ...prev, debts: docs }));
        syncToLocal('debts', docs);
      }, (err) => handleSnapshotError(err, 'debts')),
      onSnapshot(collection(db, 'contracts'), (snapshot) => {
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Contract[];
        setData(prev => ({ ...prev, contracts: docs }));
        syncToLocal('contracts', docs);
      }, (err) => handleSnapshotError(err, 'contracts')),
      onSnapshot(collection(db, 'products'), (snapshot) => {
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Product[];
        setData(prev => ({ ...prev, products: docs }));
        syncToLocal('products', docs);
      }, (err) => handleSnapshotError(err, 'products')),
      onSnapshot(collection(db, 'customers'), (snapshot) => {
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Customer[];
        setData(prev => ({ ...prev, customers: docs }));
        syncToLocal('customers', docs);
      }, (err) => handleSnapshotError(err, 'customers')),
      onSnapshot(collection(db, 'units'), (snapshot) => {
        const units = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Unit[];
        setData(prev => ({ ...prev, units }));
        syncToLocal('units', units);
      }, (err) => handleSnapshotError(err, 'units')),
      onSnapshot(collection(db, 'assets'), (snapshot) => {
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as FixedAsset[];
        setData(prev => ({ ...prev, assets: docs }));
        syncToLocal('assets', docs);
      }, (err) => handleSnapshotError(err, 'assets'))
    ];

    return () => unsubscribers.forEach(unsub => unsub());
  }, [user]);

  const login = async () => {
    try {
      // On mobile or inside an iframe, popup is often blocked or storage is restricted.
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Detailed login error:', error);
      
      let friendlyMessage = '';
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError: any) {
          console.error('Redirect error:', redirectError);
          friendlyMessage = 'تم حظر نافذة تسجيل الدخول. يرجى السماح بالنوافذ المنبثقة في المتصفح، أو فتح التطبيق في علامة تبويب جديدة لتسجيل الدخول عبر Google.';
        }
      } else if (error.code === 'auth/unauthorized-domain') {
        friendlyMessage = 'هذا النطاق (' + window.location.hostname + ') غير مصرح به في إعدادات Firebase. يرجى إضافته إلى قائمة النطاقات المصرح بها في وحدة تحكم Firebase (Authentication > Settings > Authorized domains).';
      } else if (error.code === 'auth/operation-not-allowed') {
        friendlyMessage = 'تسجيل الدخول عبر Google غير مفعل في مشروع Firebase الخاص بك. يرجى تفعيله من وحدة تحكم Firebase.';
      } else if (error.code === 'auth/web-storage-unsupported' || error.message?.includes('storage')) {
        friendlyMessage = 'ملفات تعريف الارتباط أو التخزين غير مدعومة في إطار المعاينة (Iframe). يرجى فتح التطبيق في علامة تبويب جديدة لتسجيل الدخول عبر Google، أو استخدام "دخول المدير" بالرمز السري.';
      } else {
        friendlyMessage = 'حدث خطأ أثناء تسجيل الدخول: ' + (error.message || 'خطأ غير معروف') + ' (تلميح: إذا كنت تستخدم المعاينة، جرب فتح التطبيق في علامة تبويب جديدة أو تسجيل الدخول بالرمز PIN كمدير).';
      }
      
      throw new Error(friendlyMessage);
    }
  };

  const loginAsGuest = async () => {
    setLoading(true);
    try {
      try {
        await signInAnonymously(auth);
      } catch (authError) {
        console.warn('Firebase Anonymous Auth failed, using virtual guest session:', authError);
      }
      
      const guestUser: User = {
        uid: auth.currentUser?.uid || 'guest_' + Date.now(),
        name: 'مستخدم مشترك',
        email: 'shared@system',
        role: 'employee',
        createdAt: new Date().toISOString(),
      };
      
      setUser(guestUser);
      if (!auth.currentUser) {
        localStorage.setItem('admin_session', 'true'); // Flag as virtual session to persist state
        localStorage.setItem('virtual_uid', guestUser.uid);
      }
    } catch (error: any) {
      console.error('Guest login error:', error);
      throw new Error('حدث خطأ أثناء الدخول كحساب مشترك: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await auth.signOut();
    setUser(null);
    localStorage.removeItem('admin_session');
    localStorage.removeItem('temp_admin_pin');
  };

  const loginWithBiometrics = async (): Promise<boolean> => {
    setLoading(true);
    try {
      // Simulate biometric processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Log in as admin for the simulation
      return await loginWithPin(data.settings.adminPin || '0000');
    } catch (error) {
      console.error('Biometric login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loginWithPin = async (pin: string): Promise<boolean> => {
    // Check against current state OR the pin provided if we just set it
    if (data.settings.adminPin === pin || (localStorage.getItem('temp_admin_pin') === pin)) {
      try {
        let uid = auth.currentUser?.uid;
        let isVirtual = false;
        
        if (!auth.currentUser) {
          try {
            const cred = await signInAnonymously(auth);
            uid = cred.user.uid;
          } catch (authError: any) {
            console.warn('Anonymous auth failed, using virtual session:', authError);
            isVirtual = true;
            uid = 'virtual_admin_' + Date.now();
          }
        }
        
        const adminUser: User = {
          uid: uid || 'virtual_admin',
          name: 'المدير العام',
          email: 'admin@system',
          role: 'admin',
          createdAt: new Date().toISOString(),
        };

        // Try to save profile if not virtual and we have a UID
        if (uid && !isVirtual && !uid.startsWith('virtual_admin')) {
          try {
            await setDoc(doc(db, 'users', uid), adminUser);
          } catch (dbError) {
            console.warn('Could not save admin profile, proceeding with session:', dbError);
          }
        }
        
        setUser(adminUser);
        localStorage.setItem('admin_session', 'true');
        localStorage.removeItem('temp_admin_pin');
        return true;
      } catch (error) {
        console.error('PIN authentication error:', error);
        // Even if Firebase completely fails, if the PIN matches, we let them in locally
        const fallbackUid = localStorage.getItem('virtual_uid') || 'local_admin_' + Date.now();
        localStorage.setItem('virtual_uid', fallbackUid);
        
        const fallbackAdmin: User = {
          uid: fallbackUid,
          name: 'المدير العام',
          email: 'admin@system',
          role: 'admin',
          createdAt: new Date().toISOString(),
        };
        setUser(fallbackAdmin);
        localStorage.setItem('admin_session', 'true');
        localStorage.removeItem('temp_admin_pin');
        return true;
      }
    }
    return false;
  };

  const setAdminPin = async (pin: string) => {
    try {
      // 1. Store locally and update state immediately so UI can progress
      localStorage.setItem('temp_admin_pin', pin);
      setData(prev => ({ ...prev, settings: { ...prev.settings, adminPin: pin } }));

      // 2. Perform local login immediately
      const loggedIn = await loginWithPin(pin);
      
      if (loggedIn) {
        // 3. Attempt to sync with Firebase in the background
        // We don't await this to prevent UI hangs if auth/network is slow
        (async () => {
          try {
            if (!auth.currentUser) {
              await signInAnonymously(auth).catch(() => {});
            }
            await updateSettings({ adminPin: pin });
          } catch (e) {
            console.warn('Background PIN sync failed:', e);
          }
        })();
      }
    } catch (error: any) {
      console.error('Error setting admin PIN:', error);
      // Fallback
      if (pin) await loginWithPin(pin);
    }
  };

  const addData = async (collectionName: string, itemData: any) => {
    // Optimistic UI update and local fallback
    const newItem = { 
      ...itemData, 
      id: itemData.id || `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdBy: user?.uid,
      createdAt: new Date().toISOString()
    };
    
    const collectionKey = collectionName as keyof AppData;
    const currentData = [...(data[collectionKey] as any[]), newItem];
    setData(prev => ({ ...prev, [collectionName]: currentData }));
    syncToLocal(collectionName, currentData);

    try {
      if (firebaseUser) {
        await setDoc(doc(db, collectionName, newItem.id), {
          ...newItem,
          serverCreatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.warn(`Could not sync added item to cloud (${collectionName}), stored locally:`, error);
    }
  };

  const addBulkData = async (collectionName: string, items: any[]) => {
    // Optimistic UI update and local fallback
    const newItems = items.map(item => ({
      ...item,
      id: item.id || `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdBy: user?.uid,
      createdAt: new Date().toISOString()
    }));

    const collectionKey = collectionName as keyof AppData;
    const currentData = [...(data[collectionKey] as any[]), ...newItems];
    setData(prev => ({ ...prev, [collectionName]: currentData }));
    syncToLocal(collectionName, currentData);

    try {
      if (firebaseUser) {
        const batch = writeBatch(db);
        newItems.forEach(item => {
          const docRef = doc(db, collectionName, item.id);
          batch.set(docRef, {
            ...item,
            serverCreatedAt: serverTimestamp()
          });
        });
        await batch.commit();
      }
    } catch (error) {
      console.warn(`Could not sync bulk items to cloud (${collectionName}), stored locally:`, error);
    }
  };

  const updateData = async (collectionName: string, id: string, updates: any) => {
    // Optimistic UI update and local fallback
    const collectionKey = collectionName as keyof AppData;
    const currentData = (data[collectionKey] as any[]).map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    setData(prev => ({ ...prev, [collectionName]: currentData }));
    syncToLocal(collectionName, currentData);

    try {
      if (firebaseUser) {
        await updateDoc(doc(db, collectionName, id), updates);
      }
    } catch (error) {
      console.warn(`Could not sync updated item to cloud (${collectionName}), stored locally:`, error);
    }
  };

  const deleteData = async (collectionName: string, id: string) => {
    // Optimistic UI update and local fallback
    setData(prev => {
      const collectionKey = collectionName as keyof AppData;
      const currentData = (prev[collectionKey] as any[]).filter(item => item.id !== id);
      syncToLocal(collectionName, currentData);
      return { ...prev, [collectionName]: currentData };
    });

    try {
      if (firebaseUser) {
        await deleteDoc(doc(db, collectionName, id));
      }
    } catch (error) {
      console.warn(`Could not sync deleted item from cloud (${collectionName}), stored locally:`, error);
    }
  };

  const deleteBulkData = async (collectionName: string, ids: string[]) => {
    // Optimistic UI update and local fallback
    setData(prev => {
      const collectionKey = collectionName as keyof AppData;
      const currentData = (prev[collectionKey] as any[]).filter(item => !ids.includes(item.id));
      syncToLocal(collectionName, currentData);
      return { ...prev, [collectionName]: currentData };
    });

    try {
      if (firebaseUser) {
        const batch = writeBatch(db);
        ids.forEach(id => {
          batch.delete(doc(db, collectionName, id));
        });
        await batch.commit();
      }
    } catch (error) {
      console.warn(`Could not sync bulk deletion to cloud (${collectionName}), stored locally:`, error);
    }
  };

  const updateSettings = async (updates: Partial<AppSettings>) => {
    setData(prev => {
      const newSettings = { ...prev.settings, ...updates };
      syncToLocal('settings', newSettings);

      if (updates.adminPin) {
        localStorage.setItem('temp_admin_pin', updates.adminPin);
      }
      
      // Attempt background sync to cloud
      if (firebaseUser) {
        setDoc(doc(db, 'settings', 'global'), newSettings, { merge: true }).catch(err => {
          console.warn('Could not sync settings to cloud, stored locally:', err);
        });
      }
      
      return { ...prev, settings: newSettings };
    });
  };

  return (
    <FirebaseContext.Provider value={{ 
      user, 
      loading, 
      data, 
      login, 
      loginAsGuest,
      loginWithPin,
      loginWithBiometrics,
      setAdminPin,
      logout, 
      addData, 
      addBulkData,
      updateData, 
      deleteData,
      deleteBulkData,
      updateSettings
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
