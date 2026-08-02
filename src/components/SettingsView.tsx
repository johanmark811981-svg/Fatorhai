import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useFirebase } from '../context/FirebaseContext';
import { 
  SlidersHorizontal, 
  Smartphone, 
  Globe, 
  Building2, 
  Download, 
  RotateCcw, 
  Check, 
  ShieldCheck, 
  ShieldAlert,
  AlertCircle, 
  Users, 
  UserCog, 
  Coins, 
  Lock, 
  Plus, 
  Trash2, 
  UploadCloud,
  FileText,
  BarChart3,
  Package,
  Landmark,
  ArrowLeftRight,
  FileSignature,
  Key,
  ChevronDown,
  ChevronUp,
  Link,
  Activity,
  Code,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Copy,
  RefreshCw,
  Settings,
  Mic,
  Send,
  Zap,
  Plane
} from 'lucide-react';
import { AppSettings, AppTheme, Currency, User, Invoice, Product, Customer, Transaction, Account, Category } from '../types';
import { GoogleDriveSync } from './GoogleDriveSync';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onExportBackup: () => void;
  onResetData: () => void;
  onResetToZero: () => void;
  exportDataToDrive?: (token: string) => Promise<void>;
  isGoogleDriveEnabled: boolean;
  isAdmin: boolean;
  onLogout: () => void;
  units: string[];
  onAddUnit: (name: string) => void;
  onDeleteUnit: (name: string) => void;
  invoices?: Invoice[];
  products?: Product[];
  customers?: Customer[];
  transactions?: Transaction[];
  accounts?: Account[];
  categories?: Category[];
}

type ActiveTab = 'appearance' | 'company' | 'units' | 'security' | 'backup' | 'integrations' | 'diagnostics' | 'automation';

const syncToLocal = (key: string, data: any) => {
  try {
    localStorage.setItem(`fallback_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to sync to local storage:', e);
  }
};

const loadFromLocal = (key: string, defaultValue: any = []) => {
  try {
    const saved = localStorage.getItem(`fallback_${key}`);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onExportBackup,
  onResetData,
  onResetToZero,
  exportDataToDrive,
  isGoogleDriveEnabled,
  isAdmin,
  onLogout,
  units,
  onAddUnit,
  onDeleteUnit,
  invoices = [],
  products = [],
  customers = [],
  transactions = [],
  accounts = [],
  categories = [],
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('appearance');
  const [companyName, setCompanyName] = useState(settings.companyName || '');
  const [companyNameEn, setCompanyNameEn] = useState(settings.companyNameEn || '');
  const [customAppName, setCustomAppName] = useState(settings.customAppName || '');
  const [customAppIconUrl, setCustomAppIconUrl] = useState(settings.customAppIconUrl || '');
  const [companyVat, setCompanyVat] = useState(settings.companyVatNumber || '');
  const [companyPhone, setCompanyPhone] = useState(settings.companyPhone || '');
  const [companyNationalAddress, setCompanyNationalAddress] = useState(settings.companyNationalAddress || '');
  const [companyEmail, setCompanyEmail] = useState(settings.companyEmail || '');
  const [companyLogoUrl, setCompanyLogoUrl] = useState(settings.companyLogoUrl || '');
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl || '');
  const [enableWebhook, setEnableWebhook] = useState(settings.enableWebhook || false);
  const [invoiceFooterNote, setInvoiceFooterNote] = useState(settings.invoiceFooterNote || '');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResponse, setTestResponse] = useState('');
  const [apiCodeTab, setApiCodeTab] = useState<'curl' | 'node'>('curl');
  const [newUnit, setNewUnit] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  
  // New state for adding employees & security bypass
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [confirmDeleteUserUid, setConfirmDeleteUserUid] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'employee'>('employee');
  const [newUserPermissions, setNewUserPermissions] = useState<string[]>(['add_invoice', 'manage_products', 'manage_customers']);
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // Automation Rules state
  const [automationRules, setAutomationRules] = useState<any[]>([]);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleTrigger, setNewRuleTrigger] = useState<'expense_above' | 'balance_below' | 'new_invoice'>('expense_above');
  const [newRuleValue, setNewRuleValue] = useState('1000');
  const [newRuleAction, setNewRuleAction] = useState<'notification' | 'webhook'>('notification');

  // Automatic Data Repair & Diagnostics state
  const [repairStatus, setRepairStatus] = useState<'idle' | 'repairing' | 'success' | 'error'>('idle');
  const [repairReport, setRepairReport] = useState<string>('');

  useEffect(() => {
    const savedRules = localStorage.getItem('automation_rules');
    if (savedRules) {
      setAutomationRules(JSON.parse(savedRules));
    } else {
      const defaultRules = [
        { id: 'rule_1', name: 'تنبيه المصاريف العالية', trigger: 'expense_above', value: 1000, action: 'notification', isActive: true },
        { id: 'rule_2', name: 'حد الأمان لحساب الكاش', trigger: 'balance_below', value: 500, action: 'notification', isActive: true },
        { id: 'rule_3', name: 'إرسال الفواتير للويب هوك', trigger: 'new_invoice', value: 0, action: 'webhook', isActive: false },
      ];
      localStorage.setItem('automation_rules', JSON.stringify(defaultRules));
      setAutomationRules(defaultRules);
    }
  }, []);

  const saveRulesToStore = (rules: any[]) => {
    localStorage.setItem('automation_rules', JSON.stringify(rules));
    setAutomationRules(rules);
  };

  const handleToggleRule = (id: string) => {
    const updated = automationRules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r);
    saveRulesToStore(updated);
  };

  const handleDeleteRule = (id: string) => {
    const updated = automationRules.filter(r => r.id !== id);
    saveRulesToStore(updated);
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) {
      alert('يرجى كتابة اسم القاعدة');
      return;
    }

    const newRule = {
      id: 'rule_' + Date.now(),
      name: newRuleName.trim(),
      trigger: newRuleTrigger,
      value: newRuleTrigger === 'new_invoice' ? 0 : parseFloat(newRuleValue) || 0,
      action: newRuleAction,
      isActive: true,
    };

    const updated = [...automationRules, newRule];
    saveRulesToStore(updated);

    // Reset Form
    setNewRuleName('');
    setNewRuleTrigger('expense_above');
    setNewRuleValue('1000');
    setNewRuleAction('notification');
  };

  const handleSimulateRule = (rule: any) => {
    let simulatedMessage = '';
    if (rule.trigger === 'expense_above') {
      simulatedMessage = `[محاكاة] ⚡ تم تسجيل مصروف بقيمة ${parseFloat(rule.value) + 150} ر.س يتجاوز الحد المسموح به (${rule.value} ر.س).`;
    } else if (rule.trigger === 'balance_below') {
      simulatedMessage = `[محاكاة] ⚡ رصيد حساب الكاش الرئيسي انخفض إلى ${parseFloat(rule.value) - 100} ر.س وهو أقل من حد الأمان (${rule.value} ر.س).`;
    } else if (rule.trigger === 'new_invoice') {
      simulatedMessage = `[محاكاة] ⚡ تم قيد فاتورة مبيعات جديدة رقم INV-2026-0042 بمبلغ 2,300 ر.س.`;
    }

    if (rule.action === 'notification') {
      alert(`🔔 تنبيه فوري: ${simulatedMessage}`);
    } else {
      alert(`🌐 مزامنة ويب هوك: تم إرسال الحدث إلى ${webhookUrl || 'الويب هوك المبرمج'} بنجاح!\nالبيانات: ${simulatedMessage}`);
    }
  };

  const handleAutoRepairDatabase = async () => {
    setRepairStatus('repairing');
    try {
      let deletedDuplicates = 0;
      let fixedCategoryLinks = 0;
      let fixedAccountLinks = 0;
      let fixedMathInvoices = 0;
      let fixedInvalidAmounts = 0;

      const defaultAccountId = accounts[0]?.id || 'acc_cash_main';
      const defaultCategoryId = categories[0]?.id || 'cat_personal_other';

      // 1. Delete duplicates
      const seen = new Set<string>();
      for (const tx of transactions) {
        const key = `${tx.date}_${tx.title}_${tx.amount}_${tx.accountId}_${tx.categoryId}`;
        if (seen.has(key)) {
          try {
            await deleteDoc(doc(db, 'transactions', tx.id));
            deletedDuplicates++;
          } catch (e) {
            console.error('Failed to delete duplicate:', e);
          }
        } else {
          seen.add(key);
        }
      }

      // 2. Fix broken category & account links & invalid amounts
      for (const tx of transactions) {
        let needsUpdate = false;
        const updates: any = {};

        if (!categories.find(c => c.id === tx.categoryId)) {
          updates.categoryId = defaultCategoryId;
          needsUpdate = true;
          fixedCategoryLinks++;
        }

        if (!accounts.find(a => a.id === tx.accountId)) {
          updates.accountId = defaultAccountId;
          needsUpdate = true;
          fixedAccountLinks++;
        }

        if (isNaN(tx.amount) || tx.amount <= 0) {
          updates.amount = 0.01;
          needsUpdate = true;
          fixedInvalidAmounts++;
        }

        if (needsUpdate) {
          try {
            await updateDoc(doc(db, 'transactions', tx.id), updates);
          } catch (e) {
            console.error('Failed to repair transaction:', e);
          }
        }
      }

      // 3. Fix math mismatch invoices
      for (const inv of invoices) {
        const expectedTotal = inv.subtotal + inv.taxTotal;
        if (Math.abs(expectedTotal - inv.grandTotal) > 0.05) {
          const subtotal = inv.items.reduce((sum, item) => sum + (item.total - (item.taxAmount || 0)), 0);
          const taxTotal = inv.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
          const grandTotal = subtotal + taxTotal;
          try {
            await updateDoc(doc(db, 'invoices', inv.id), {
              subtotal: parseFloat(subtotal.toFixed(2)),
              taxTotal: parseFloat(taxTotal.toFixed(2)),
              grandTotal: parseFloat(grandTotal.toFixed(2)),
            });
            fixedMathInvoices++;
          } catch (e) {
            console.error('Failed to repair invoice math:', e);
          }
        }
      }

      const report = `تم الانتهاء من الفحص التلقائي بنجاح!
      🔧 النتائج والإصلاحات البرمجية المنفذة:
      - تم حذف ${deletedDuplicates} قيود مكررة بالخطأ.
      - تم تصحيح ${fixedCategoryLinks} روابط تصنيفات مكسورة.
      - تم تصحيح ${fixedAccountLinks} روابط حسابات مالية مكسورة.
      - تم إعادة حساب وتصحيح ${fixedMathInvoices} فواتير ضريبية بها أخطاء حسابية.
      - تم تصحيح ${fixedInvalidAmounts} معاملات مالية ذات قيم غير صالحة.`;
      
      setRepairReport(report);
      setRepairStatus('success');
      alert(report);
    } catch (err) {
      console.error(err);
      setRepairStatus('error');
    }
  };

  const { loginWithPin, addData } = useFirebase();

  // --- START SMART WHATSAPP AI INTEGRATION ---
  const [waProvider, setWaProvider] = useState(() => localStorage.getItem('whatsapp_provider') || 'meta');
  const [waFacilityPhone, setWaFacilityPhone] = useState(() => localStorage.getItem('whatsapp_facility_phone') || '');
  const [waTwilioSid, setWaTwilioSid] = useState(() => localStorage.getItem('whatsapp_twilio_sid') || '');
  const [waTwilioAuthToken, setWaTwilioAuthToken] = useState(() => localStorage.getItem('whatsapp_twilio_auth_token') || '');
  const [waTwilioPhone, setWaTwilioPhone] = useState(() => localStorage.getItem('whatsapp_twilio_phone') || '');
  const [waAccessToken, setWaAccessToken] = useState(() => localStorage.getItem('whatsapp_access_token') || '');
  const [waPhoneNumberId, setWaPhoneNumberId] = useState(() => localStorage.getItem('whatsapp_phone_number_id') || '');
  const [waVerifyToken, setWaVerifyToken] = useState(() => localStorage.getItem('whatsapp_verify_token') || 'nawah_tax_verify_token_2026');
  const [waAutoSync, setWaAutoSync] = useState(() => localStorage.getItem('whatsapp_auto_sync') === 'true');
  const [waLogs, setWaLogs] = useState<any[]>([]);
  const [waLogsLoading, setWaLogsLoading] = useState(false);
  const [simMessage, setSimMessage] = useState('');
  const [simSending, setSimSending] = useState(false);
  const [simSenderPhone, setSimSenderPhone] = useState('+966501234567');
  const [simSenderName, setSimSenderName] = useState('أحمد الحربي');
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // Load WhatsApp Logs
  const loadWaLogs = async () => {
    setWaLogsLoading(true);
    try {
      const res = await fetch('/api/whatsapp/logs');
      const data = await res.json();
      if (data.success) {
        setWaLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to load WhatsApp logs:', err);
    } finally {
      setWaLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'integrations') {
      loadWaLogs();
    }
  }, [activeTab]);

  // Handle Recording timer
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          await handleSendSimMessage('', base64Data, 'audio/webm');
        };
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('تعذر الوصول إلى الميكروفون. يرجى التحقق من الأذونات في المتصفح.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Simulate Message
  const handleSendSimMessage = async (textToSend?: string, audioBase64?: string, audioMime?: string) => {
    const textMsg = textToSend !== undefined ? textToSend : simMessage;
    if (!textMsg && !audioBase64) return;

    setSimSending(true);
    if (textToSend === undefined) {
      setSimMessage('');
    }

    try {
      const payload: any = {
        senderName: simSenderName,
        senderPhone: simSenderPhone,
      };

      if (audioBase64) {
        payload.audioBase64 = audioBase64;
        payload.mimeType = audioMime || 'audio/webm';
      } else {
        payload.text = textMsg;
      }

      const res = await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        await loadWaLogs();
        
        // Auto Sync
        if (waAutoSync && data.log?.parsedAction) {
          const action = data.log.parsedAction;
          if (['expense', 'debt', 'invoice'].includes(action.entryType)) {
            await handleSyncLogToDb(data.log);
          }
        }
      }
    } catch (err) {
      console.error('Failed to simulate WhatsApp message:', err);
    } finally {
      setSimSending(false);
    }
  };

  // Sync log to client database
  const [syncLoadingId, setSyncLoadingId] = useState<string | null>(null);

  const handleSyncLogToDb = async (log: any) => {
    if (!log.parsedAction || log.synced) return;
    setSyncLoadingId(log.id);
    try {
      const action = log.parsedAction;
      const { entryType, data: actionData } = action;

      if (entryType === 'expense') {
        await addData('transactions', {
          title: actionData.title || 'مصروف واتساب',
          amount: parseFloat(actionData.amount) || 0,
          type: 'expense',
          categoryId: actionData.categoryId || 'cat_personal_other',
          accountId: 'cash_box',
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'cash',
          notes: actionData.notes || 'سجل مالي مستخرج تلقائياً عبر مساعد الواتساب بالذكاء الاصطناعي'
        });
      } else if (entryType === 'debt') {
        await addData('debts', {
          personName: actionData.personName || 'شخص غير معروف',
          amount: parseFloat(actionData.amount) || 0,
          paidAmount: 0,
          currency: actionData.currency || 'ر.س',
          type: actionData.type || 'owed_to_me',
          startDate: new Date().toISOString().split('T')[0],
          status: 'pending',
          notes: actionData.notes || 'مسجل عبر مساعد الواتساب'
        });
      } else if (entryType === 'invoice') {
        const subtotal = actionData.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) || 0;
        const taxTotal = actionData.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice * (item.taxRate || 15) / 100), 0) || 0;
        const grandTotal = subtotal + taxTotal;

        await addData('invoices', {
          invoiceNumber: 'INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
          invoiceType: 'simplified',
          customerName: actionData.customerName || 'عميل نقدي',
          customerPhone: actionData.customerPhone || '',
          date: new Date().toISOString().split('T')[0],
          dueDate: new Date().toISOString().split('T')[0],
          items: actionData.items?.map((item: any, idx: number) => ({
            id: 'item_' + idx,
            description: item.description,
            quantity: item.quantity,
            unit: 'حبة',
            unitPrice: item.unitPrice,
            taxRate: item.taxRate || 15,
            total: item.quantity * item.unitPrice * (1 + (item.taxRate || 15) / 100)
          })) || [],
          subtotal,
          taxTotal,
          grandTotal,
          status: 'paid',
          paymentMethod: 'cash',
          notes: actionData.notes || 'أصدرت بالذكاء الاصطناعي من رسالة واتساب'
        });
      }

      await fetch('/api/whatsapp/mark-synced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: log.id })
      });

      await loadWaLogs();
    } catch (err) {
      console.error('Failed to sync transaction to Firestore:', err);
    } finally {
      setSyncLoadingId(null);
    }
  };

  const handleClearWaLogs = async () => {
    if (confirm('هل أنت متأكد من مسح سجل العمليات المستلمة بالكامل؟')) {
      try {
        await fetch('/api/whatsapp/clear-logs', { method: 'POST' });
        setWaLogs([]);
      } catch (err) {
        console.error('Failed to clear logs:', err);
      }
    }
  };

  const handleSaveWaCredentials = () => {
    localStorage.setItem('whatsapp_access_token', waAccessToken);
    localStorage.setItem('whatsapp_phone_number_id', waPhoneNumberId);
    localStorage.setItem('whatsapp_verify_token', waVerifyToken);
    localStorage.setItem('whatsapp_auto_sync', waAutoSync ? 'true' : 'false');
    localStorage.setItem('whatsapp_provider', waProvider);
    localStorage.setItem('whatsapp_facility_phone', waFacilityPhone);
    localStorage.setItem('whatsapp_twilio_sid', waTwilioSid);
    localStorage.setItem('whatsapp_twilio_auth_token', waTwilioAuthToken);
    localStorage.setItem('whatsapp_twilio_phone', waTwilioPhone);
    
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };
  // --- END SMART WHATSAPP AI INTEGRATION ---

  const AVAILABLE_PERMISSIONS = [
    { key: 'add_invoice', name: 'إصدار وفواتير المبيعات', desc: 'السماح للموظف بإنشاء فواتير وسندات قبض جديدة', icon: FileText, color: 'text-emerald-400' },
    { key: 'edit_delete_invoice', name: 'تعديل وحذف الفواتير', desc: 'السماح بتغيير بيانات الفواتير المصدرة أو حذفها بالكامل', icon: Trash2, color: 'text-rose-400' },
    { key: 'view_reports', name: 'عرض التقارير والتحليلات', desc: 'الاطلاع على التقارير المالية والأرباح والخسائر والرسوم البيانية', icon: BarChart3, color: 'text-teal-400' },
    { key: 'manage_products', name: 'إدارة الأصناف والمنتجات', desc: 'إضافة منتجات جديدة، تعديل الأسعار، وإدارة المخزون', icon: Package, color: 'text-amber-400' },
    { key: 'manage_customers', name: 'إدارة العملاء والشركات', desc: 'إضافة وتعديل بيانات العملاء والأرقام الضريبية', icon: Users, color: 'text-blue-400' },
    { key: 'manage_accounts', name: 'إدارة الحسابات والخزائن', desc: 'إنشاء حسابات بنكية وخزائن كاش وتعديل أرصدتها', icon: Landmark, color: 'text-cyan-400' },
    { key: 'manage_transactions', name: 'إدارة السندات والمصاريف', desc: 'تسجيل العمليات والتحويلات والمصاريف اليومية', icon: ArrowLeftRight, color: 'text-indigo-400' },
    { key: 'manage_contracts', name: 'إدارة العقود والاشتراكات', desc: 'تسجيل ومتابعة عقود الإيجار والخدمات والاشتراكات', icon: FileSignature, color: 'text-purple-400' },
  ];

  const handleTogglePermission = async (user: User, permissionKey: string) => {
    const currentPermissions = user.permissions || [];
    let newPermissions: string[];
    if (currentPermissions.includes(permissionKey)) {
      newPermissions = currentPermissions.filter(p => p !== permissionKey);
    } else {
      newPermissions = [...currentPermissions, permissionKey];
    }
    
    // Optimistic UI update
    const updatedUsers = allUsers.map(u => u.uid === user.uid ? { ...u, permissions: newPermissions } : u);
    setAllUsers(updatedUsers);
    syncToLocal('employees_list', updatedUsers);

    try {
      await updateDoc(doc(db, 'users', user.uid), { permissions: newPermissions });
    } catch (err) {
      console.warn("Failed to update user permissions in cloud, stored locally:", err);
    }
  };

  useEffect(() => {
    setCompanyName(settings.companyName || '');
    setCompanyNameEn(settings.companyNameEn || '');
    setCustomAppName(settings.customAppName || '');
    setCustomAppIconUrl(settings.customAppIconUrl || '');
    setCompanyVat(settings.companyVatNumber || '');
    setCompanyPhone(settings.companyPhone || '');
    setCompanyNationalAddress(settings.companyNationalAddress || '');
    setCompanyEmail(settings.companyEmail || '');
    setCompanyLogoUrl(settings.companyLogoUrl || '');
    setWebhookUrl(settings.webhookUrl || '');
    setEnableWebhook(settings.enableWebhook || false);
    setInvoiceFooterNote(settings.invoiceFooterNote || '');
  }, [
    settings.companyName,
    settings.companyNameEn,
    settings.customAppName,
    settings.customAppIconUrl,
    settings.companyVatNumber,
    settings.companyPhone,
    settings.companyNationalAddress,
    settings.companyEmail,
    settings.companyLogoUrl,
    settings.webhookUrl,
    settings.enableWebhook,
    settings.invoiceFooterNote
  ]);

  useEffect(() => {
    if (isAdmin) {
      const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        const usersList = snapshot.docs.map(d => d.data() as User);
        if (usersList.length === 0) {
          const defaultList = loadFromLocal('employees_list', [
            { uid: 'emp_1', name: 'أحمد القحطاني', email: 'ahmed@system.com', role: 'employee', permissions: ['add_invoice', 'manage_products', 'manage_customers'], createdAt: new Date().toISOString() },
            { uid: 'emp_2', name: 'سارة الشمري', email: 'sara@system.com', role: 'employee', permissions: ['view_reports', 'manage_customers'], createdAt: new Date().toISOString() }
          ]);
          setAllUsers(defaultList);
        } else {
          setAllUsers(usersList);
          syncToLocal('employees_list', usersList);
        }
      }, (err) => {
        console.warn('Could not load users list (permission denied):', err.code);
        const defaultList = loadFromLocal('employees_list', [
          { uid: 'emp_1', name: 'أحمد القحطاني', email: 'ahmed@system.com', role: 'employee', permissions: ['add_invoice', 'manage_products', 'manage_customers'], createdAt: new Date().toISOString() },
          { uid: 'emp_2', name: 'سارة الشمري', email: 'sara@system.com', role: 'employee', permissions: ['view_reports', 'manage_customers'], createdAt: new Date().toISOString() }
        ]);
        setAllUsers(defaultList);
      });
      return () => unsub();
    } else {
      const defaultList = loadFromLocal('employees_list', [
        { uid: 'emp_1', name: 'أحمد القحطاني', email: 'ahmed@system.com', role: 'employee', permissions: ['add_invoice', 'manage_products', 'manage_customers'], createdAt: new Date().toISOString() },
        { uid: 'emp_2', name: 'سارة الشمري', email: 'sara@system.com', role: 'employee', permissions: ['view_reports', 'manage_customers'], createdAt: new Date().toISOString() }
      ]);
      setAllUsers(defaultList);
    }
  }, [isAdmin]);

  const handleUpdateUserRole = async (uid: string, newRole: 'admin' | 'employee') => {
    const updatedUsers = allUsers.map(u => u.uid === uid ? { ...u, role: newRole } : u);
    setAllUsers(updatedUsers);
    syncToLocal('employees_list', updatedUsers);
    
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (err) {
      console.warn("Failed to update user role in cloud, stored locally:", err);
    }
  };

  const handleDeleteEmployee = async (uid: string) => {
    const updatedUsers = allUsers.filter(u => u.uid !== uid);
    setAllUsers(updatedUsers);
    syncToLocal('employees_list', updatedUsers);
    setConfirmDeleteUserUid(null);
    
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (err) {
      console.warn("Failed to delete user in cloud, stored locally:", err);
    }
  };

  const handleSendVerificationCode = (u: User) => {
    const code = u.verificationCode || Math.floor(100000 + Math.random() * 900000).toString();
    alert(`✉️ تم إرسال رمز التحقق الأمني (${code}) إلى البريد الإلكتروني للموظف: ${u.email}\n(يمكن للموظف إدخال هذا الرمز أو قيام المدير بالتفعيل المباشر).`);
  };

  const handleVerifyEmail = async (u: User) => {
    const enteredCode = prompt(`أدخل رمز التحقق المكون من 6 أرقام المرسل إلى ${u.email}:`, u.verificationCode || '123456');
    if (enteredCode !== null) {
      const updatedUsers = allUsers.map(item => item.uid === u.uid ? { ...item, verified: true } : item);
      setAllUsers(updatedUsers);
      syncToLocal('employees_list', updatedUsers);
      try {
        await updateDoc(doc(db, 'users', u.uid), { verified: true });
        alert('✅ تم التحقق من البريد الإلكتروني وتفعيل صلاحيات الموظف بنجاح!');
      } catch (err) {
        console.warn('Failed to update verification in cloud:', err);
        alert('✅ تم التفعيل محلياً بنجاح!');
      }
    }
  };

  const handleToggleVerification = async (u: User) => {
    const newStatus = !u.verified;
    const updatedUsers = allUsers.map(item => item.uid === u.uid ? { ...item, verified: newStatus } : item);
    setAllUsers(updatedUsers);
    syncToLocal('employees_list', updatedUsers);
    try {
      await updateDoc(doc(db, 'users', u.uid), { verified: newStatus });
    } catch (err) {
      console.warn('Failed to update verification status in cloud:', err);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newEmp: User = {
      uid: 'emp_' + Date.now(),
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      permissions: newUserPermissions,
      createdAt: new Date().toISOString(),
      verified: false,
      verificationCode: verificationCode
    };

    const updatedUsers = [...allUsers, newEmp];
    setAllUsers(updatedUsers);
    syncToLocal('employees_list', updatedUsers);

    try {
      await setDoc(doc(db, 'users', newEmp.uid), newEmp);
    } catch (err) {
      console.warn("Failed to create user in cloud, stored locally:", err);
    }

    // Reset Form
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('employee');
    setNewUserPermissions(['add_invoice', 'manage_products', 'manage_customers']);
    setShowAddUserForm(false);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({ 
      companyName, 
      companyNameEn,
      customAppName,
      customAppIconUrl,
      companyVatNumber: companyVat, 
      companyPhone,
      companyNationalAddress,
      companyEmail,
      companyLogoUrl
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const [isEditingPin, setIsEditingPin] = useState(false);
  const [newAdminPin, setNewAdminPin] = useState(settings.adminPin || '');

  const [isEditingSharedPin, setIsEditingSharedPin] = useState(false);
  const [newSharedPin, setNewSharedPin] = useState(settings.sharedPin || '');

  const handleUpdatePin = () => {
    if (newAdminPin.length >= 4) {
      onUpdateSettings({ adminPin: newAdminPin });
      setIsEditingPin(false);
    } else {
      alert('يجب أن يكون الرمز 4 أرقام على الأقل');
    }
  };

  const handleUpdateSharedPin = () => {
    if (newSharedPin.length >= 4) {
      onUpdateSettings({ sharedPin: newSharedPin, enableSharedPin: true });
      setIsEditingSharedPin(false);
    } else {
      alert('يجب أن يكون رمز الحساب المشترك 4 أرقام على الأقل');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 2 ميجابايت.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const tabsConfig = [
    { id: 'appearance' as ActiveTab, name: 'مظهر الهاتف', icon: Smartphone, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
    { id: 'company' as ActiveTab, name: 'المنشأة والضريبة', icon: Building2, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    { id: 'units' as ActiveTab, name: 'الوحدات', icon: Globe, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { id: 'security' as ActiveTab, name: 'الموظفين والصلاحيات', icon: ShieldCheck, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { id: 'backup' as ActiveTab, name: 'الصيانة والنسخ', icon: RotateCcw, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { id: 'integrations' as ActiveTab, name: 'الربط البرمجي (API)', icon: Link, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
    { id: 'diagnostics' as ActiveTab, name: 'فحص الأخطاء والامتثال', icon: Activity, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { id: 'automation' as ActiveTab, name: 'التشغيل التلقائي', icon: Zap, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  ];

  return (
    <div className="flex-1 p-3 space-y-4 pb-20 dir-rtl text-white">
      {/* Hidden File Input for Logo */}
      <input
        type="file"
        id="logo-upload"
        className="hidden"
        accept="image/*"
        onChange={handleLogoUpload}
      />
      
      {/* Premium Header */}
      <div className="bg-slate-900/40 p-4 rounded-3xl border border-white/5 shadow-inner backdrop-blur-md">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-teal-400" />
          إعدادات التطبيق وتخصيص آيفون 17
        </h2>
        <p className="text-[10px] text-gray-400 mt-1 leading-normal">
          نظام ذكي وشامل للتحكم بمظهر الهاتف، المبيعات الضريبية، الصلاحيات والمزامنة السحابية الاحترافية.
        </p>
      </div>

      {/* iOS Smart Settings Segment Panel */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-1 p-1 bg-slate-950/80 border border-white/5 rounded-2xl shadow-lg">
        {tabsConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsEditingPin(false);
              }}
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all relative ${
                isActive 
                  ? 'bg-slate-900 border border-white/10 text-white font-black shadow-inner shadow-black/40 scale-[1.03]' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <div className={`p-1.5 rounded-lg border mb-1 transition-colors ${
                isActive ? tab.color : 'bg-slate-950/40 border-white/5 text-gray-500'
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[8px] text-center font-bold truncate w-full max-w-[64px]">{tab.name}</span>
              {isActive && (
                <div className="absolute -bottom-1.5 w-1 h-1 bg-teal-500 rounded-full shadow-lg shadow-teal-500/50" />
              )}
            </button>
          );
        })}
      </div>

      {/* ACTIVE SECTION CONTENT */}
      <div className="space-y-4">
        
        {/* TAB 1: APPEARANCE & CURRENCY */}
        {activeTab === 'appearance' && (
          <div className="space-y-4">
            {/* 1. iPhone 17 Pro Max Chassis Settings */}
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 space-y-4 shadow-lg">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <div className="bg-teal-500/10 p-2 rounded-xl border border-teal-500/20">
                  <Smartphone className="w-4 h-4 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white">إطار وهيكل iPhone 17 Pro Max</h3>
                  <p className="text-[9px] text-gray-400">محاكاة الهيكل الطبيعي فائق النحافة من أبل</p>
                </div>
              </div>

              {/* Toggle iPhone Chassis */}
              <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-2xl border border-white/5">
                <div>
                  <span className="text-xs font-bold text-white block">تفعيل محاكاة الهيكل (Frame)</span>
                  <span className="text-[9px] text-gray-400">إظهار أزرار التحكم وجزيرة التنبيهات المدمجة</span>
                </div>

                <button
                  onClick={() => onUpdateSettings({ showiPhoneFrame: !settings.showiPhoneFrame })}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                    settings.showiPhoneFrame ? 'bg-teal-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.showiPhoneFrame ? 'translate-x-0' : '-translate-x-6'
                    }`}
                  />
                </button>
              </div>

              {/* Finish Colors */}
              <div className="space-y-2">
                <span className="text-[10px] text-gray-300 font-extrabold block">تشطيبات تيتانيوم سامسونج S24 ألترا وآيفون (Titanium Finishes)</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'dynamic_smart' as AppTheme, name: '✨ ثيم Qualitylinks الديناميكي الذكي (Dynamic Smart)', bg: 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500' },
                    { id: 's24_titanium' as AppTheme, name: 'S24 Ultra تيتانيوم رمادي 🤖', bg: 'bg-stone-400' },
                    { id: 's24_black' as AppTheme, name: 'S24 Ultra تيتانيوم أسود 🤖', bg: 'bg-zinc-900' },
                    { id: 's24_violet' as AppTheme, name: 'S24 Ultra تيتانيوم بنفسجي 🤖', bg: 'bg-indigo-600' },
                    { id: 's24_yellow' as AppTheme, name: 'S24 Ultra تيتانيوم أصفر 🤖', bg: 'bg-amber-500' },
                    { id: 'desert' as AppTheme, name: 'تيتانيوم صحراوي Desert 🍎', bg: 'bg-[#c8b093]' },
                    { id: 'titanium' as AppTheme, name: 'تيتانيوم طبيعي Raw 🍎', bg: 'bg-stone-500' },
                    { id: 'dark' as AppTheme, name: 'أسود الفضاء Space Dark 🍎', bg: 'bg-zinc-800' },
                    { id: 'silver' as AppTheme, name: 'فضة بلاتين Silver 🍎', bg: 'bg-slate-300' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onUpdateSettings({ theme: t.id })}
                      className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all relative overflow-hidden ${
                        settings.theme === t.id
                          ? 'border-teal-400 bg-slate-800/80 font-black text-white shadow-md'
                          : 'border-white/5 bg-slate-950/60 text-gray-400 hover:text-white hover:bg-slate-950'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${t.bg} shrink-0 border border-white/20 shadow-sm`} />
                      <span className="text-[10px] truncate">{t.name}</span>
                      {settings.theme === t.id && (
                        <div className="absolute top-1 left-1 bg-teal-400 text-slate-950 rounded-full p-0.5">
                          <Check className="w-2.5 h-2.5 font-bold" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Currency Selector */}
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                  <Coins className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white">العملة والرمز المالي</h3>
                  <p className="text-[9px] text-gray-400">عملة الحسابات الرئيسية في الفواتير والتقارير</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                {[
                  { code: 'SAR' as Currency, name: 'ريال سعودي (ر.س)' },
                  { code: 'AED' as Currency, name: 'درهم إماراتي (د.إ)' },
                  { code: 'KWD' as Currency, name: 'دينار كويتي (د.ك)' },
                  { code: 'QAR' as Currency, name: 'ريال قطري (ر.ق)' },
                  { code: 'USD' as Currency, name: 'دولار أمريكي ($)' },
                  { code: 'EUR' as Currency, name: 'يورو أوروبي (€)' },
                ].map((c) => (
                  <button
                    key={c.code}
                    onClick={() => onUpdateSettings({ currency: c.code })}
                    className={`p-2.5 rounded-xl border text-[10px] transition-all flex flex-col items-center justify-center gap-1 ${
                      settings.currency === c.code
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg'
                        : 'bg-slate-950 text-gray-300 border-white/5 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-mono text-xs">{c.code}</span>
                    <span className="text-[8px] opacity-90">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Travel Mode & Multi-Currency Converter */}
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 space-y-4 shadow-lg mt-4">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <div className="bg-cyan-500/10 p-2 rounded-xl border border-cyan-500/20">
                  <Plane className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white">وضع السفر والعملات المتعددة (Travel Mode)</h3>
                  <p className="text-[9px] text-gray-400">حساب وتحويل أسعار الصرف فورياً عند السفر وإنجاز المعاملات بالعملات الأجنبية</p>
                </div>
              </div>

              {/* Toggle Travel Mode */}
              <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-2xl border border-white/5">
                <div>
                  <span className="text-xs font-bold text-white block">تفعيل وضع السفر (Travel Mode)</span>
                  <span className="text-[9px] text-gray-400">ضبط افتراضي سريع للمعاملات بالعملة الأجنبية المعمول بها</span>
                </div>
                <button
                  onClick={() => onUpdateSettings({ travelMode: !settings.travelMode })}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                    settings.travelMode ? 'bg-cyan-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.travelMode ? 'translate-x-0' : '-translate-x-6'
                    }`}
                  />
                </button>
              </div>

              {settings.travelMode && (
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] text-gray-300 font-extrabold block">اختر عملة وجهة السفر الحالية:</span>
                  <div className="grid grid-cols-4 gap-2 text-xs font-bold">
                    {['USD', 'EUR', 'GBP', 'AED', 'KWD', 'EGP', 'QAR'].map((cur) => (
                      <button
                        key={cur}
                        onClick={() => onUpdateSettings({ travelCurrency: cur })}
                        className={`p-2 rounded-xl border text-[10px] transition-all flex flex-col items-center justify-center gap-0.5 ${
                          (settings.travelCurrency || 'USD') === cur
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-md'
                            : 'bg-slate-950 text-gray-300 border-white/5 hover:bg-slate-800'
                        }`}
                      >
                        <span className="font-mono">{cur}</span>
                      </button>
                    ))}
                  </div>

                  {/* Exchange Rates Editor */}
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-cyan-300">أسعار الصرف الفورية مقابل {settings.currency || 'SAR'}</span>
                      <span className="text-[9px] text-gray-400">تحديث تلقائي</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(settings.exchangeRates || { USD: 3.75, EUR: 4.10, GBP: 4.85, AED: 1.02, KWD: 12.20, EGP: 0.08, QAR: 1.03 }).map(([currCode, rate]) => (
                        <div key={currCode} className="bg-slate-900 p-2 rounded-xl border border-white/5 flex items-center justify-between">
                          <span className="text-[10px] font-bold font-mono text-white">1 {currCode} =</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.01"
                              value={rate}
                              onChange={(e) => {
                                const newRates = { ...(settings.exchangeRates || {}), [currCode]: parseFloat(e.target.value) || 1 };
                                onUpdateSettings({ exchangeRates: newRates });
                              }}
                              className="w-16 bg-slate-950 border border-white/10 rounded-lg px-1.5 py-0.5 text-center text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
                            />
                            <span className="text-[9px] text-gray-400">{settings.currency || 'SAR'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: COMPANY PROFILE & VAT */}
        {activeTab === 'company' && (
          <form onSubmit={handleSaveCompany} className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <div className="bg-orange-500/10 p-2 rounded-xl border border-orange-500/20">
                <Building2 className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white">معلومات المنشأة والفوترة والضريبة</h3>
                <p className="text-[9px] text-gray-400">البيانات الرسمية المعتمدة لطباعة الفواتير ورموز الاستجابة</p>
              </div>
            </div>

            {/* Logo Upload Box (Premium Widget) */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-3">
              <span className="text-[10px] text-gray-300 font-extrabold block">شعار المؤسسة الرسمي (Company Logo)</span>
              
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  className="flex-1 border-2 border-dashed border-white/10 hover:border-teal-500/50 bg-slate-900/50 hover:bg-slate-900 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all group"
                >
                  <UploadCloud className="w-6 h-6 text-gray-500 group-hover:text-teal-400 transition-colors" />
                  <span className="text-[10px] font-black text-gray-400 group-hover:text-white transition-colors">اضغط لاختيار صورة</span>
                  <span className="text-[8px] text-gray-500">صيغة PNG/JPG - كحد أقصى 2 ميجابايت</span>
                </div>

                {companyLogoUrl ? (
                  <div className="relative shrink-0 w-24 h-24 bg-white rounded-2xl border border-white/10 p-2 flex items-center justify-center overflow-hidden shadow-inner group">
                    <img src={companyLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setCompanyLogoUrl('')}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-2xl text-rose-400 font-bold text-[9px] transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 mb-0.5" />
                      إزالة
                    </button>
                  </div>
                ) : (
                  <div className="shrink-0 w-24 h-24 bg-slate-900/50 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-gray-600">
                    <Building2 className="w-8 h-8 opacity-40" />
                    <span className="text-[8px] mt-1">بلا شعار</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3.5">
              {/* Custom App Name & App Icon Box */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-950 rounded-2xl border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black text-emerald-300">تخصيص اسم وأيقونة التطبيق (App Identity)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold block mb-1">اسم التطبيق الظاهر في الشريط والشاشة</label>
                    <input
                      type="text"
                      value={customAppName}
                      onChange={(e) => setCustomAppName(e.target.value)}
                      className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl p-2.5 text-xs text-emerald-300 focus:outline-none focus:border-emerald-400 font-bold"
                      placeholder="افتراضي: Qualitylinks (أو اكتب اسم تطبيقك)"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-300 font-bold block mb-1">رابط أيقونة التطبيق (App Icon URL)</label>
                    <input
                      type="text"
                      value={customAppIconUrl}
                      onChange={(e) => setCustomAppIconUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl p-2.5 text-xs text-emerald-300 focus:outline-none focus:border-emerald-400 font-mono text-left"
                      placeholder="https://.../icon.png أو اتركه فارغاً للافتراضي"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-black block mb-1">اسم المؤسسة أو الشركة (بالعربية)</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-orange-500 transition-all font-bold"
                  placeholder="مثال: مؤسسة التقنية الذكية للمقاولات"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-black block mb-1">Company Name (English)</label>
                <input
                  type="text"
                  value={companyNameEn}
                  onChange={(e) => setCompanyNameEn(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-orange-500 transition-all font-mono text-left"
                  placeholder="Example: Smart Tech Contracting"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 font-black block mb-1">الرقم الضريبي للمنشأة (15 خانة)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={companyVat}
                    onChange={(e) => setCompanyVat(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-orange-500 transition-all font-mono tracking-wider"
                    placeholder="300000000000003"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 font-black block mb-1">رقم الجوال الخاص بالمنشأة</label>
                  <input
                    type="text"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-orange-500 transition-all font-mono text-left"
                    placeholder="+966 50 000 0000"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-black block mb-1">البريد الإلكتروني الرسمي</label>
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-orange-500 transition-all font-mono text-left"
                  placeholder="finance@yourcompany.com"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-black block mb-1">العنوان الوطني للمنشأة</label>
                <textarea
                  rows={2}
                  value={companyNationalAddress}
                  onChange={(e) => setCompanyNationalAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-orange-500 transition-all resize-none leading-relaxed"
                  placeholder="المملكة العربية السعودية، الرياض، حي الياسمين، المبنى الإضافي 4531"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
            >
              {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : null}
              <span>{savedSuccess ? 'تم حفظ التعديلات الضريبية بنجاح!' : 'حفظ وتحديث معلومات المنشأة'}</span>
            </button>
          </form>
        )}

        {/* TAB 3: UNITS MANAGEMENT */}
        {activeTab === 'units' && (
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                <Globe className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white">إدارة وحدات القياس (Units of Measure)</h3>
                <p className="text-[9px] text-gray-400">إضافة أو تعديل أو حذف الوحدات المستخدمة لتوصيف الأصناف</p>
              </div>
            </div>

            {/* Add Unit form widget */}
            <div className="bg-slate-950/60 p-3 border border-white/5 rounded-2xl space-y-2">
              <span className="text-[10px] text-gray-400 font-black block">إضافة وحدة جديدة للبرنامج</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="مثال: طقم، كرتون، لتر، متر، ساعة..."
                  className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 text-white font-bold"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newUnit.trim()) {
                      onAddUnit(newUnit.trim());
                      setNewUnit('');
                    }
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </div>
            </div>

            {/* List of units */}
            <div className="space-y-2">
              <span className="text-[10px] text-gray-400 font-black block">وحدات القياس المسجلة حالياً:</span>
              
              <div className="flex flex-wrap gap-2 p-3 bg-slate-950/40 rounded-2xl border border-white/5 max-h-[220px] overflow-y-auto custom-scrollbar">
                {units.length === 0 ? (
                  <div className="w-full text-center py-4 text-gray-500 text-[10px]">
                    لا توجد وحدات قياس مسجلة. يرجى إضافة وحدتك الأولى!
                  </div>
                ) : (
                  units.map((u) => (
                    <div 
                      key={u} 
                      className="flex items-center gap-2 bg-slate-900/80 border border-white/5 px-3 py-1.5 rounded-xl shadow-sm hover:border-amber-500/30 transition-all group"
                    >
                      <span className="text-[11px] font-black text-white">{u}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteUnit(u)}
                        className="text-gray-500 hover:text-rose-400 transition-colors"
                        title="حذف الوحدة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <p className="text-[9px] text-gray-500 text-center leading-normal">
              هذه الوحدات تظهر تلقائياً كخيارات منسدلة عند إنشاء أصناف جديدة أو تحرير الفواتير لتسهيل العمل.
            </p>
          </div>
        )}

        {/* TAB 4: EMPLOYEES & SECURITY */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            {/* Security Lock Toggle */}
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 space-y-4 shadow-lg">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
                  <Lock className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white">أمان وقفل التطبيق (PIN)</h3>
                  <p className="text-[9px] text-gray-400">حماية بيانات المبيعات لمنع تطفل المتسللين</p>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-2xl border border-white/5">
                <div>
                  <span className="text-xs font-bold text-white block">حماية برمز PIN / بصمة</span>
                  <span className="text-[9px] text-gray-400">قفل البرنامج عند الخمول أو الخروج المؤقت</span>
                </div>

                <button
                  onClick={() => {
                    if (!settings.securityPin && !settings.enableSecurityLock) {
                      onUpdateSettings({ enableSecurityLock: true });
                    } else {
                      onUpdateSettings({ enableSecurityLock: !settings.enableSecurityLock });
                    }
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                    settings.enableSecurityLock ? 'bg-blue-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.enableSecurityLock ? 'translate-x-0' : '-translate-x-6'
                    }`}
                  />
                </button>
              </div>

              {settings.securityPin && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[9px] text-emerald-400 font-extrabold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    تم تفعيل الرمز السري وقفل الحماية بنجاح
                  </span>
                  <button 
                    onClick={() => onUpdateSettings({ securityPin: undefined, enableSecurityLock: false })}
                    className="text-[9px] text-rose-400 font-black hover:underline"
                  >
                    إلغاء الحماية بالكامل
                  </button>
                </div>
              )}

              {/* Master Admin PIN Management */}
              {isAdmin && (
                <div className="pt-3 border-t border-white/5 space-y-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-white block">رمز دخول المدير الرئيسي (Master Pin)</span>
                        <span className="text-[9px] text-gray-500 leading-tight block">الرمز السري لتجاوز القيود أو الدخول بدون حساب Google</span>
                      </div>
                      {!isEditingPin && (
                        <button
                          onClick={() => {
                            setNewAdminPin(settings.adminPin || '');
                            setIsEditingPin(true);
                          }}
                          className="text-[10px] bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-xl border border-blue-500/20 font-black shadow-sm"
                        >
                          {settings.adminPin ? 'تغيير الرمز السري' : 'إنشاء رمز سري'}
                        </button>
                      )}
                    </div>

                    {isEditingPin && (
                      <div className="flex items-center gap-2 mt-1 bg-slate-950/60 p-2.5 rounded-2xl border border-white/5">
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={6}
                          value={newAdminPin}
                          onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="الرمز السري الجديد"
                          className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono tracking-[0.5em] text-center text-white font-bold"
                          autoFocus
                        />
                        <button
                          onClick={handleUpdatePin}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black transition-all"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={() => setIsEditingPin(false)}
                          className="bg-slate-800 hover:bg-slate-700 text-gray-400 px-3 py-2 rounded-xl text-xs"
                        >
                          إلغاء
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Shared Account Access PIN */}
                  <div className="pt-3 border-t border-white/5 space-y-3">
                    <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-2xl border border-white/5">
                      <div>
                        <span className="text-xs font-bold text-white block">تفعيل رمز دخول للحساب المشترك (Shared Account PIN)</span>
                        <span className="text-[9px] text-gray-400">طلب رمز سري عند النقر على "حساب مشترك" في صفحة الدخول</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!settings.sharedPin) {
                            setNewSharedPin('1234');
                            setIsEditingSharedPin(true);
                          } else {
                            onUpdateSettings({ enableSharedPin: !(settings.enableSharedPin !== false) });
                          }
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                          (settings.enableSharedPin !== false) && settings.sharedPin ? 'bg-teal-500' : 'bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full transition-transform ${
                            (settings.enableSharedPin !== false) && settings.sharedPin ? 'translate-x-0' : '-translate-x-6'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between px-1">
                        <div>
                          <span className="text-xs font-black text-white block">رمز دخول الحساب المشترك</span>
                          <span className="text-[9px] text-gray-500 leading-tight block">
                            {settings.sharedPin && (settings.enableSharedPin !== false)
                              ? `الرمز الحالي: (${settings.sharedPin}) - مطلوب عند تسجيل الدخول بالحساب المشترك`
                              : 'لم يتم تعيين رمز للحساب المشترك أو أن الخيار معطل للدخول المباشر'}
                          </span>
                        </div>
                        {!isEditingSharedPin && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewSharedPin(settings.sharedPin || '1234');
                              setIsEditingSharedPin(true);
                            }}
                            className="text-[10px] bg-teal-500/10 text-teal-400 px-3 py-1.5 rounded-xl border border-teal-500/20 font-black shadow-sm"
                          >
                            {settings.sharedPin ? 'تغيير رمز المشترك' : 'تعيين رمز سري'}
                          </button>
                        )}
                      </div>

                      {isEditingSharedPin && (
                        <div className="flex items-center gap-2 mt-1 bg-slate-950/60 p-2.5 rounded-2xl border border-white/5">
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={newSharedPin}
                            onChange={(e) => setNewSharedPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="مثال: 1234"
                            className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono tracking-[0.5em] text-center text-white font-bold"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleUpdateSharedPin}
                            className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl text-xs font-black transition-all"
                          >
                            حفظ الرمز
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingSharedPin(false)}
                            className="bg-slate-800 hover:bg-slate-700 text-gray-400 px-3 py-2 rounded-xl text-xs"
                          >
                            إلغاء
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Management (Admin Only, with beautiful unlock fallback) */}
            {!isAdmin ? (
              <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 space-y-4 shadow-lg text-center">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                  <ShieldAlert className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xs font-black text-white">إدارة الموظفين والصلاحيات (مغلق)</h3>
                <p className="text-[11px] text-gray-400 leading-normal max-w-xs mx-auto">
                  أنت تتصفح حالياً بحساب موظف أو حساب مشترك. لتتمكن من إضافة الموظفين وتعديل أدوارهم وصلاحياتهم الضريبية والمالية، يرجى إدخال الرمز السري للمدير (Master PIN).
                </p>
                <div className="max-w-xs mx-auto space-y-2.5">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={unlockPin}
                    onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-3 text-center text-xl font-black tracking-[0.5em] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-white"
                  />
                  {unlockError && (
                    <p className="text-rose-500 text-[10px] font-bold">{unlockError}</p>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      setUnlockError('');
                      if (unlockPin.length < 4) {
                        setUnlockError('الرمز السري غير مكتمل');
                        return;
                      }
                      const success = await loginWithPin(unlockPin);
                      if (success) {
                        setUnlockPin('');
                      } else {
                        setUnlockError('رمز PIN المدير غير صحيح');
                        setUnlockPin('');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-black py-3 rounded-2xl transition-all active:scale-95 shadow-lg"
                  >
                    تفعيل صلاحيات المدير 🔑
                  </button>
                </div>
                <p className="text-[9px] text-gray-500">
                  (تلميح تجريبي: الرمز الافتراضي للمدير هو 0000)
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 space-y-4 shadow-lg">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
                      <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white">إدارة الموظفين والصلاحيات</h3>
                      <p className="text-[9px] text-gray-400">التحكم في وصول ومسؤوليات أعضاء فريق العمل</p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setShowAddUserForm(!showAddUserForm)}
                    className="flex items-center gap-1 text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded-xl font-bold transition-all shadow-sm active:scale-95"
                  >
                    <Plus className="w-3 h-3" />
                    إضافة موظف
                  </button>
                </div>

                {/* Add Employee Form */}
                {showAddUserForm && (
                  <form onSubmit={handleCreateEmployee} className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 space-y-3">
                    <h4 className="text-[10px] font-black text-blue-400">بيانات الموظف الجديد:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 block font-bold">اسم الموظف *</label>
                        <input
                          type="text"
                          required
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="مثال: أحمد الحربي"
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-[10px] text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 block font-bold">البريد الإلكتروني *</label>
                        <input
                          type="email"
                          required
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="ahmed@company.com"
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-[10px] text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 block font-bold">دور العمل والصلاحيات</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'employee')}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-2 py-1.5 text-[10px] text-white focus:border-blue-500 outline-none"
                      >
                        <option value="employee">موظف (صلاحيات مخصصة)</option>
                        <option value="admin">مدير (صلاحيات كاملة تلقائياً)</option>
                      </select>
                    </div>

                    {newUserRole === 'employee' && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-gray-400 block font-bold">الصلاحيات الأساسية للموظف:</label>
                        <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto custom-scrollbar p-1.5 bg-slate-900/40 rounded-xl border border-white/5">
                          {AVAILABLE_PERMISSIONS.map((perm) => {
                            const isSelected = newUserPermissions.includes(perm.key);
                            return (
                              <div
                                key={perm.key}
                                onClick={() => {
                                  if (isSelected) {
                                    setNewUserPermissions(newUserPermissions.filter(p => p !== perm.key));
                                  } else {
                                    setNewUserPermissions([...newUserPermissions, perm.key]);
                                  }
                                }}
                                className={`flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer transition-colors ${
                                  isSelected ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-slate-900/50 border-white/5 text-gray-400 hover:bg-slate-900'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  readOnly
                                  className="accent-blue-500 w-3 h-3 cursor-pointer"
                                />
                                <span className="text-[8px] font-bold truncate">{perm.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-xl text-[10px] font-black transition-all active:scale-95 shadow-md"
                      >
                        حفظ الموظف
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddUserForm(false)}
                        className="bg-slate-800 hover:bg-slate-700 text-gray-400 px-3 py-1.5 rounded-xl text-[10px]"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                )}
                
                <div className="space-y-3 max-h-[360px] overflow-y-auto custom-scrollbar">
                  {allUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-[10px] space-y-1">
                      <Users className="w-8 h-8 mx-auto text-gray-600 opacity-50" />
                      <p>لا يوجد موظفون مضافون حالياً.</p>
                      <p>انقر على "إضافة موظف" لبدء تنظيم صلاحيات فريقك.</p>
                    </div>
                  ) : (
                    allUsers.map((u) => {
                      const isExpanded = expandedUserId === u.uid;
                      return (
                        <div key={u.uid} className="bg-slate-950/60 rounded-2xl border border-white/5 overflow-hidden transition-all duration-200">
                          {/* Header info */}
                          <div className="flex items-center justify-between p-3">
                            <div 
                              className="flex items-center gap-2.5 cursor-pointer flex-1"
                              onClick={() => {
                                setExpandedUserId(isExpanded ? null : u.uid);
                              }}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                                u.role === 'admin' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                              }`}>
                                {(u.name || 'م').charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-black text-white">{u.name || 'مستخدم بدون اسم'}</span>
                                <span className="text-[9px] text-gray-500 font-mono">{u.email || 'بدون بريد'}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className={`text-[8px] px-2 py-0.5 rounded-full font-black ${
                                u.role === 'admin' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {u.role === 'admin' ? 'مدير' : 'موظف'}
                              </span>
                              
                              {u.email !== 'johanmark811981@gmail.com' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateUserRole(u.uid, u.role === 'admin' ? 'employee' : 'admin');
                                    }}
                                    className="p-1.5 bg-slate-900 border border-white/10 hover:border-white/20 rounded-xl text-gray-400 hover:text-white transition-colors"
                                    title="تغيير الدور"
                                  >
                                    <UserCog className="w-3.5 h-3.5" />
                                  </button>

                                  {confirmDeleteUserUid === u.uid ? (
                                    <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-2 py-1 rounded-xl text-rose-300">
                                      <span className="text-[9px] font-bold">حذف؟</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteEmployee(u.uid);
                                        }}
                                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[9px] font-black transition-all shadow-sm"
                                      >
                                        تأكيد 🗑️
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDeleteUserUid(null);
                                        }}
                                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg text-[9px]"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteUserUid(u.uid);
                                      }}
                                      className="p-1.5 bg-slate-900 border border-red-500/10 hover:border-red-500/30 rounded-xl text-red-400 hover:text-red-300 transition-colors"
                                      title="حذف الموظف"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}

                              <button
                                type="button"
                                onClick={() => setExpandedUserId(isExpanded ? null : u.uid)}
                                className="p-1.5 bg-slate-900 border border-white/10 hover:border-white/20 rounded-xl text-gray-400 hover:text-white transition-colors"
                                title="عرض التفاصيل والصلاحيات"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-teal-400" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Expandable permissions */}
                          {isExpanded && (
                            <div className="bg-slate-900/40 border-t border-white/5 p-3 space-y-3">
                              {/* Email Verification Box */}
                              <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                u.verified !== false ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'
                              }`}>
                                <div className="flex items-center gap-2.5">
                                  <div className={`p-2 rounded-xl shrink-0 ${u.verified !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                    {u.verified !== false ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black text-white">التحقق من البريد الإلكتروني الأمني</span>
                                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${u.verified !== false ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                        {u.verified !== false ? 'مُوَثَّق وآمن 🛡️' : 'بانتظار التحقق ⏳'}
                                      </span>
                                    </div>
                                    <p className="text-[9px] text-gray-400 mt-0.5">
                                      {u.verified !== false ? 'تم تأكيد هوية البريد وتفعيل صلاحيات الدخول ومنع الحسابات الوهمية.' : `البريد غير متحقق منه. رمز التحقق: ${u.verificationCode || '123456'}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {u.verified === false && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleSendVerificationCode(u)}
                                        className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-xl text-[9px] font-bold transition-all"
                                      >
                                        إرسال الرمز
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleVerifyEmail(u)}
                                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] font-bold transition-all shadow-sm"
                                      >
                                        تفعيل بالرمز
                                      </button>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleVerification(u)}
                                    className={`px-2.5 py-1.5 rounded-xl text-[9px] font-bold border transition-all ${
                                      u.verified !== false ? 'bg-slate-900 border-white/10 text-gray-400 hover:text-white' : 'bg-emerald-600/20 border-emerald-500/30 text-emerald-300'
                                    }`}
                                  >
                                    {u.verified !== false ? 'إلغاء التوثيق' : 'تفعيل فوري للمدير'}
                                  </button>
                                </div>
                              </div>

                              {u.role === 'admin' ? (
                                <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 text-center space-y-1.5">
                                  <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto" />
                                  <h4 className="text-[11px] font-black text-emerald-300">حساب مدير كامل الصلاحيات</h4>
                                  <p className="text-[9px] text-gray-400 leading-normal max-w-xs mx-auto">
                                    يمتلك هذا الحساب كامل صلاحيات المدير العام للمنشأة تلقائياً (بما في ذلك حذف القيود، تعديل الفواتير، الاطلاع على التقارير المالية، وتحديث الإعدادات).
                                  </p>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1.5 pb-1 border-b border-white/5">
                                    <Key className="w-3.5 h-3.5 text-teal-400" />
                                    <span className="text-[10px] font-black text-gray-300">الصلاحيات الممنوحة للموظف:</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 gap-2">
                                    {AVAILABLE_PERMISSIONS.map((perm) => {
                                      const IconComp = perm.icon;
                                      const isGranted = u.permissions?.includes(perm.key) || false;
                                      return (
                                        <div 
                                          key={perm.key} 
                                          onClick={() => handleTogglePermission(u, perm.key)}
                                          className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all ${
                                            isGranted 
                                              ? 'bg-slate-950/80 border-teal-500/30' 
                                              : 'bg-slate-950/20 border-white/5 hover:bg-slate-950/40'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg bg-slate-900 border border-white/5 ${perm.color}`}>
                                              <IconComp className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="text-right">
                                              <span className="text-[10px] font-bold text-white block">{perm.name}</span>
                                              <span className="text-[8px] text-gray-400 block mt-0.5 leading-tight">{perm.desc}</span>
                                            </div>
                                          </div>

                                          {/* Toggle Check Switch (Styled Div, Avoid Interactive HTML nesting) */}
                                          <div
                                            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                                              isGranted ? 'bg-teal-500' : 'bg-slate-800'
                                            }`}
                                          >
                                            <div
                                              className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${
                                                isGranted ? 'translate-x-0' : '-translate-x-4'
                                              }`}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                
                <p className="text-[9px] text-gray-500 text-center px-4 leading-normal">
                  يمكن للموظفين إضافة المعاملات والفواتير، بينما يمتلك المدير صلاحية حذف البيانات والاطلاع على التقارير المالية والنسخ الاحتياطي.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: BACKUP & DATABASE RESET */}
        {activeTab === 'backup' && isAdmin && (
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                <RotateCcw className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white">صيانة النظام واستعادة البيانات</h3>
                <p className="text-[9px] text-gray-400">حفظ النسخ الاحتياطية وإعادة ضبط قاعدة البيانات</p>
              </div>
            </div>

            {/* Google Drive engine */}
            <div className="flex flex-col gap-2">
              {isGoogleDriveEnabled && exportDataToDrive ? (
                <GoogleDriveSync onExport={exportDataToDrive} />
              ) : (
                <div className="bg-slate-950/60 border border-amber-500/20 p-4 rounded-2xl flex flex-col items-center gap-2 text-center">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-[10px] text-amber-200 leading-normal font-bold">
                    ميزة المزامنة مع Google Drive غير مفعلة. تتطلب معرّف العميل VITE_GOOGLE_CLIENT_ID في إعدادات البيئة.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExportBackup}
                className="flex-1 bg-slate-950 hover:bg-slate-900 text-emerald-400 font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-2 border border-emerald-500/20 shadow-md shadow-emerald-500/5 hover:border-emerald-500/40 active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" />
                تصدير نسخة احتياطية (JSON)
              </button>

              <button
                type="button"
                onClick={onResetData}
                className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-black px-3.5 py-3 rounded-2xl text-xs flex items-center gap-1 border border-rose-500/30 active:scale-95 transition-all"
                title="إعادة تعيين البيانات العينة"
              >
                <RotateCcw className="w-4 h-4" />
                بيانات تجريبية
              </button>
            </div>

            {/* Wipe / Danger Area */}
            <div className="pt-3 border-t border-white/5 space-y-2">
              <span className="text-[10px] text-rose-400 font-extrabold block">منطقة العمليات الخطيرة (منطقة الخطر)</span>
              
              <button
                type="button"
                onClick={onResetToZero}
                className="w-full bg-rose-950/20 hover:bg-rose-950/40 text-rose-500 font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-2 border border-rose-500/30 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                تصفير الحسابات ومسح جميع الفواتير
              </button>
            </div>
          </div>
        )}

        {/* TAB 6: INTEGRATIONS & API (WEBHOOKS) */}
        {activeTab === 'integrations' && (
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <div className="bg-sky-500/10 p-2 rounded-xl border border-sky-500/20">
                <Link className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white">الربط والبرمجيات الخارجية (API & Webhooks)</h3>
                <p className="text-[9px] text-gray-400">مزامنة فواتيرك تلقائياً مع خوادم ثانية وأنظمة ERP والتشغيل الآلي</p>
              </div>
            </div>

            {/* Inputs configuration */}
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-2xl border border-white/5">
                <div>
                  <span className="text-xs font-bold text-white block">تفعيل إرسال الويب هوك التلقائي</span>
                  <span className="text-[9px] text-gray-400">إرسال الفاتورة كـ JSON فور حفظها إلى نظامك الخاص</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableWebhook(!enableWebhook)}
                  className={`w-11 h-5.5 rounded-full transition-colors relative p-0.5 ${
                    enableWebhook ? 'bg-sky-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 bg-white rounded-full transition-transform ${
                      enableWebhook ? 'translate-x-0' : '-translate-x-5'
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                  <Link className="w-3.5 h-3.5 text-sky-400" />
                  رابط استقبال الويب هوك (Webhook POST URL)
                </label>
                <input
                  type="url"
                  placeholder="https://your-api.com/webhooks/invoices"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-sky-500 font-mono text-left"
                  dir="ltr"
                />
                <p className="text-[8px] text-gray-500">
                  سيقوم النظام بإرسال طلب من نوع POST يحتوي على بيانات الفاتورة كاملة بتنسيق JSON إلى هذا الرابط فور الإصدار.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  ملاحظات وشروط الفاتورة الافتراضية
                </label>
                <textarea
                  placeholder="مثال: البضاعة المباعة لا ترد ولا تستبدل إلا خلال 3 أيام مع إحضار الفاتورة..."
                  value={invoiceFooterNote}
                  onChange={(e) => setInvoiceFooterNote(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-sky-500 leading-normal"
                  rows={2}
                />
                <p className="text-[8px] text-gray-500">
                  تظهر هذه العبارة تلقائياً في أسفل الفاتورة الضريبية وقالب الكاشير الحراري.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onUpdateSettings({ webhookUrl, enableWebhook, invoiceFooterNote });
                  setSavedSuccess(true);
                  setTimeout(() => setSavedSuccess(false), 2000);
                }}
                className="w-full bg-gradient-to-r from-sky-500 to-blue-500 text-slate-950 font-black py-2.5 rounded-2xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>تم حفظ إعدادات الربط والبنود بنجاح</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>حفظ وتثبيت خيارات الربط</span>
                  </>
                )}
              </button>
            </div>

            {/* Webhook Tester Component */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-3">
              <span className="text-[10px] text-sky-300 font-extrabold block">مختبر الربط البرمجي السريع (API Tester)</span>
              <p className="text-[9px] text-gray-400 leading-normal">
                اضغط لاختبار إرسال حزمة بيانات تجريبية (JSON) للفاتورة إلى الرابط الخاص بك مباشرة وفحص كود الاستجابة.
              </p>
              
              <button
                type="button"
                disabled={testStatus === 'testing'}
                onClick={async () => {
                  if (!webhookUrl) {
                    alert("يرجى إدخال عنوان الويب هوك (URL) أولاً.");
                    return;
                  }
                  setTestStatus('testing');
                  setTestResponse('');
                  const startTime = Date.now();
                  try {
                    const response = await fetch(webhookUrl, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        event: "invoice.test",
                        timestamp: new Date().toISOString(),
                        app: "AlNawah Tax Billing Engine",
                        invoice: {
                          id: "inv_test_999",
                          invoiceNumber: "INV-2026-TEST",
                          customerName: "شركة العميل التجريبي المحدودة",
                          customerTaxNumber: "300123456789013",
                          grandTotal: 1150.00,
                          taxTotal: 150.00,
                          subtotal: 1000.00,
                          status: "paid",
                          paymentMethod: "card"
                        }
                      })
                    });
                    const duration = Date.now() - startTime;
                    const text = await response.text();
                    setTestStatus('success');
                    setTestResponse(`حالة الاستجابة: ${response.status} (${response.statusText})\nزمن الاستجابة: ${duration}ms\nالرد المستلم: ${text.slice(0, 150)}`);
                  } catch (err: any) {
                    const duration = Date.now() - startTime;
                    setTestStatus('error');
                    setTestResponse(`فشل الاتصال: ${err.message || 'خطأ غير معروف'}\nزمن المحاولة: ${duration}ms\nتلميح: قد يكون بسبب قيود CORS في المتصفح، أو تعذر الوصول للرابط.`);
                  }
                }}
                className="w-full bg-slate-900 border border-white/10 hover:border-sky-500 text-sky-400 font-extrabold py-2.5 rounded-xl text-[10px] transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {testStatus === 'testing' ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                    جاري فحص الاتصال وإرسال البيانات...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                    إرسال حزمة ويب هوك تجريبية (POST Test)
                  </>
                )}
              </button>

              {testStatus !== 'idle' && (
                <div className={`p-2.5 rounded-xl text-[10px] font-mono leading-relaxed break-all ${
                  testStatus === 'success' 
                    ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-300' 
                    : testStatus === 'error'
                      ? 'bg-rose-950/40 border border-rose-500/20 text-rose-300'
                      : 'bg-slate-900/60 text-gray-400'
                }`}>
                  <pre className="whitespace-pre-wrap">{testResponse}</pre>
                </div>
              )}
            </div>

            {/* API Docs and snippets */}
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] text-gray-300 font-black flex items-center gap-1">
                  <Code className="w-3.5 h-3.5 text-sky-400" />
                  أكواد الربط للمطورين والمصادر الخارجية
                </span>
                
                <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg border border-white/5 text-[9px] font-bold">
                  <button
                    onClick={() => setApiCodeTab('curl')}
                    className={`px-2 py-1 rounded-md transition-colors ${apiCodeTab === 'curl' ? 'bg-sky-500 text-slate-950 font-black' : 'text-gray-400'}`}
                  >
                    cURL
                  </button>
                  <button
                    onClick={() => setApiCodeTab('node')}
                    className={`px-2 py-1 rounded-md transition-colors ${apiCodeTab === 'node' ? 'bg-sky-500 text-slate-950 font-black' : 'text-gray-400'}`}
                  >
                    Node.js
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-white/5 font-mono text-[9px] leading-normal overflow-x-auto text-left relative text-sky-300 select-all" dir="ltr">
                {apiCodeTab === 'curl' ? (
                  <pre>{`curl -X POST "${webhookUrl || 'https://api.yourdomain.com/webhooks'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "invoice.created",
    "timestamp": "${new Date().toISOString()}",
    "invoice": {
      "id": "inv_12345",
      "invoiceNumber": "INV-2026-452",
      "customerName": "عبدالله الراجحي",
      "customerTaxNumber": "300456789123453",
      "grandTotal": 2300.00,
      "taxTotal": 300.00
    }
  }'`}</pre>
                ) : (
                  <pre>{`const payload = {
  event: 'invoice.created',
  timestamp: '${new Date().toISOString()}',
  invoice: { id: 'inv_12345', invoiceNumber: 'INV-2026-452', grandTotal: 2300 }
};

fetch('${webhookUrl || 'https://api.yourdomain.com/webhooks'}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => console.log('Successfully pushed:', data))
.catch(err => console.error('Push error:', err));`}</pre>
                )}
              </div>
              <p className="text-[8px] text-gray-500 leading-normal text-right">
                انقر نقراً مزدوجاً داخل الصندوق لتحديد الكود البرمجي بالكامل ونسخه لربطه بأي خادم أو برنامج خدمي خارجي.
              </p>
            </div>

            {/* --- START WHATSAPP AI BOT --- */}
            <div className="border-t border-white/10 my-6 pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white">ربط تطبيق الواتساب بالذكاء الاصطناعي (WhatsApp AI Bot)</h3>
                  <p className="text-[9px] text-gray-400">إرسال الفواتير والمصاريف وتسجيل القيود والديون عبر الرسائل النصية والصوتية للواتساب مباشرة</p>
                </div>
              </div>

              {/* Grid layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Meta & Twilio Config Column */}
                <div className="lg:col-span-5 space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-white/5 h-fit text-xs">
                  <span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1.5 mb-2">
                    <Settings className="w-3.5 h-3.5" />
                    إعدادات وتفعيل خدمة WhatsApp API
                  </span>

                  {/* Provider Selector Tabs */}
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-xl border border-white/5 mb-3">
                    <button
                      type="button"
                      onClick={() => setWaProvider('meta')}
                      className={`py-1.5 rounded-lg text-[10px] font-black transition-all ${
                        waProvider === 'meta'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Meta Cloud API
                    </button>
                    <button
                      type="button"
                      onClick={() => setWaProvider('twilio')}
                      className={`py-1.5 rounded-lg text-[10px] font-black transition-all ${
                        waProvider === 'twilio'
                          ? 'bg-sky-500 text-slate-950 shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Twilio WhatsApp
                    </button>
                  </div>

                  {/* Webhook Endpoint (Universal) */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-400">رابط استقبال الويب هوك (Webhook URL) الموحد</label>
                    <div className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-mono text-emerald-400 break-all select-all">
                      <span className="flex-1 truncate">{window.location.origin}/api/whatsapp/webhook</span>
                      <button 
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/api/whatsapp/webhook`);
                          alert('تم نسخ رابط الويب هوك بنجاح!');
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[8px] text-gray-500 leading-normal">
                      {waProvider === 'meta' 
                        ? 'انسخ هذا الرابط وضعه في إعدادات Webhooks في Meta App Dashboard لتلقي رسائل عملاء الواتساب مباشرة.'
                        : 'انسخ هذا الرابط وضعه في إعدادات صندوق الرمل (Sandbox) أو الرقم المخصص في Twilio Console تحت حقل WHEN A MESSAGE COMES IN.'}
                    </p>
                  </div>

                  {/* Facility Mobile Number (Required for both) */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-400">رقم جوال المنشأة المربوط بالخدمة</label>
                    <input
                      type="text"
                      placeholder="مثال: +966500000000"
                      value={waFacilityPhone}
                      onChange={(e) => setWaFacilityPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-[10px] text-white focus:outline-none focus:border-emerald-500 font-mono text-left"
                      dir="ltr"
                    />
                    <p className="text-[8px] text-gray-500">رقم الجوال الخاص بالمنشأة الذي يتراسل العملاء معه لبدء المحادثة الضريبية.</p>
                  </div>

                  {/* Dynamic inputs based on provider */}
                  {waProvider === 'meta' ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400">رمز التحقق لـ Webhook (Verify Token)</label>
                        <input
                          type="text"
                          value={waVerifyToken}
                          onChange={(e) => setWaVerifyToken(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-[10px] text-white focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400">معرّف رقم هاتف الإرسال (Phone Number ID)</label>
                        <input
                          type="text"
                          placeholder="مثال: 101124402636253"
                          value={waPhoneNumberId}
                          onChange={(e) => setWaPhoneNumberId(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-[10px] text-white focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400">رمز الوصول الدائم لـ Meta (Permanent Access Token)</label>
                        <input
                          type="password"
                          placeholder="EAAGb3qYhKZC8BA..."
                          value={waAccessToken}
                          onChange={(e) => setWaAccessToken(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-[10px] text-white focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400">معرّف حساب تويليو (Twilio Account SID)</label>
                        <input
                          type="text"
                          placeholder="مثال: ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                          value={waTwilioSid}
                          onChange={(e) => setWaTwilioSid(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-[10px] text-white focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400">رمز مصادقة تويليو (Twilio Auth Token)</label>
                        <input
                          type="password"
                          placeholder="رمز المصادقة السري لـ Twilio"
                          value={waTwilioAuthToken}
                          onChange={(e) => setWaTwilioAuthToken(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-[10px] text-white focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400">رقم الإرسال في تويليو (Twilio WhatsApp Sender Phone)</label>
                        <input
                          type="text"
                          placeholder="مثال: whatsapp:+14155238886"
                          value={waTwilioPhone}
                          onChange={(e) => setWaTwilioPhone(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-[10px] text-white focus:outline-none focus:border-sky-500 font-mono text-left"
                          dir="ltr"
                        />
                        <p className="text-[8px] text-gray-500">رقم صندوق الرمل أو الرقم المعتمد (مسبوقاً بـ whatsapp:).</p>
                      </div>
                    </>
                  )}

                  {/* Auto-sync switch */}
                  <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-white/5 mt-2">
                    <div>
                      <span className="text-[9px] font-bold text-white block">مزامنة الحركات تلقائياً لـ Firestore</span>
                      <span className="text-[8px] text-gray-400">إدخال البيانات المالية فوراً دون مراجعة يدوية</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWaAutoSync(!waAutoSync)}
                      className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                        waAutoSync ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${
                          waAutoSync ? 'translate-x-0' : '-translate-x-4'
                        }`}
                      />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveWaCredentials}
                    className={`w-full font-black py-2.5 rounded-xl text-[10px] mt-2 transition-all active:scale-95 shadow-md flex items-center justify-center gap-1 ${
                      waProvider === 'meta'
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    حفظ وتثبيت إعدادات الواتساب
                  </button>
                </div>

                {/* Chat Simulator Column */}
                <div className="lg:col-span-7 flex flex-col bg-slate-950 border border-white/10 rounded-2xl overflow-hidden h-[540px] shadow-2xl relative">
                  {/* Whatsapp Header */}
                  <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 font-black border border-emerald-500/30 text-xs">
                          WA
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-white block">مساعد المحاسبة الضريبية (AI Bot)</span>
                        <span className="text-[8px] text-emerald-400 block font-bold">نشط الآن • متصل بالبرنامج</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={loadWaLogs}
                        disabled={waLogsLoading}
                        className="p-1.5 bg-slate-900 border border-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                        title="تحديث المحادثة"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${waLogsLoading ? 'animate-spin' : ''}`} />
                      </button>
                      <button 
                        type="button"
                        onClick={handleClearWaLogs}
                        className="p-1.5 bg-slate-900 border border-white/5 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                        title="تفريغ المحادثة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Chat Area Body with beautiful scrolling */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#0b141a] custom-scrollbar flex flex-col-reverse">
                    {waLogs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 text-[10px] space-y-2 p-6 my-auto">
                        <MessageSquare className="w-12 h-12 text-gray-600 opacity-40 animate-bounce" />
                        <h4 className="font-extrabold text-gray-400 text-xs">ابدأ إرسال الأوامر المالية الصوتية والكتّابية</h4>
                        <p className="max-w-xs leading-normal">
                          يمكنك تجربة التحدث أو الكتابة لمساعدك المالي في الأسفل لمحاكاة الرسائل المستلمة حقيقياً عبر الواتساب!
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 pt-3 max-w-sm">
                          <button 
                            type="button"
                            onClick={() => { setSimMessage('دفعت مصروف بنزين بقيمة 50 ريال وسجلته فواتير'); }}
                            className="bg-slate-900 border border-white/5 hover:border-emerald-500/40 p-2 rounded-xl text-gray-400 hover:text-white transition-all text-right block"
                          >
                            💡 "دفعت 50 ريال بنزين"
                          </button>
                          <button 
                            type="button"
                            onClick={() => { setSimMessage('أصدر فاتورة بيع لشركة النواة شاحن ذكي بـ 150 ريال وضريبة 15%'); }}
                            className="bg-slate-900 border border-white/5 hover:border-emerald-500/40 p-2 rounded-xl text-gray-400 hover:text-white transition-all text-right block"
                          >
                            💡 "فاتورة لشركة النواة شاحن"
                          </button>
                          <button 
                            type="button"
                            onClick={() => { setSimMessage('أعطيت سلفة لمحمد قدرها 400 ريال'); }}
                            className="bg-slate-900 border border-white/5 hover:border-emerald-500/40 p-2 rounded-xl text-gray-400 hover:text-white transition-all text-right block"
                          >
                            💡 "سلفة لمحمد 400 ريال"
                          </button>
                          <button 
                            type="button"
                            onClick={() => { setSimMessage('كم مجموع المصاريف التي قمت بتسجيلها؟'); }}
                            className="bg-slate-900 border border-white/5 hover:border-emerald-500/40 p-2 rounded-xl text-gray-400 hover:text-white transition-all text-right block"
                          >
                            💡 "كم مجموع المصاريف؟"
                          </button>
                        </div>
                      </div>
                    ) : (
                      waLogs.map((log) => (
                        <div key={log.id} className="space-y-3">
                          
                          {/* User Message (Right Side) */}
                          <div className="flex justify-end">
                            <div className="bg-[#005c4b] text-white rounded-2xl rounded-tr-none max-w-[85%] p-3 shadow-md relative">
                              <span className="text-[8px] text-emerald-300 font-bold block mb-1 text-right">
                                {log.senderName || 'أنت'} ({log.sender})
                              </span>
                              
                              <p className="text-[11px] leading-relaxed whitespace-pre-wrap text-right">{log.content}</p>
                              
                              <div className="flex items-center justify-end gap-1 mt-1 text-[8px] text-emerald-300 font-mono">
                                <span>{new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-sky-400 font-black">✓✓</span>
                              </div>
                            </div>
                          </div>

                          {/* AI Assistant Reply (Left Side) */}
                          <div className="flex justify-start">
                            <div className="bg-[#202c33] text-white rounded-2xl rounded-tl-none max-w-[85%] p-3 shadow-md border border-white/5">
                              <span className="text-[8px] text-emerald-400 font-bold block mb-1 text-right">🤖 مساعد المحاسبة الذكي</span>
                              
                              <p className="text-[11px] leading-relaxed whitespace-pre-wrap text-right text-gray-100">{log.reply}</p>
                              
                              {/* Parsed Struct & Actions Card */}
                              {log.parsedAction && log.parsedAction.entryType && !['unknown', 'greeting', 'query'].includes(log.parsedAction.entryType) && (
                                <div className="mt-3 bg-[#111b21] p-3 rounded-xl border border-white/5 space-y-2">
                                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                                    <span className="text-[9px] text-emerald-400 font-black flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      عملية مستخرجة بالذكاء الاصطناعي ({
                                        log.parsedAction.entryType === 'expense' ? 'مصروف' :
                                        log.parsedAction.entryType === 'debt' ? 'دين وسلفة' : 'فاتورة بيع'
                                      })
                                    </span>
                                  </div>

                                  {log.parsedAction.entryType === 'expense' && (
                                    <div className="text-[10px] space-y-1 text-gray-300 text-right">
                                      <p>📌 <strong className="text-white">البند:</strong> {log.parsedAction.data?.title}</p>
                                      <p>💰 <strong className="text-white">المبلغ:</strong> {log.parsedAction.data?.amount} ر.س</p>
                                    </div>
                                  )}

                                  {log.parsedAction.entryType === 'debt' && (
                                    <div className="text-[10px] space-y-1 text-gray-300 text-right">
                                      <p>👤 <strong className="text-white">الشخص:</strong> {log.parsedAction.data?.personName}</p>
                                      <p>💰 <strong className="text-white">المبلغ:</strong> {log.parsedAction.data?.amount} ر.س</p>
                                      <p>⚠️ <strong className="text-white">النوع:</strong> {log.parsedAction.data?.type === 'owed_to_me' ? 'مستحق لي (سلفة مني)' : 'دين علي (مستحق له)'}</p>
                                    </div>
                                  )}

                                  {log.parsedAction.entryType === 'invoice' && (
                                    <div className="text-[10px] space-y-1 text-gray-300 text-right">
                                      <p>🏢 <strong className="text-white">العميل:</strong> {log.parsedAction.data?.customerName}</p>
                                      {log.parsedAction.data?.items?.map((item: any, i: number) => (
                                        <p key={i} className="text-[9px] text-gray-400">
                                          📦 {item.description} (الكمية: {item.quantity} × {item.unitPrice} ر.س - ضريبة: {item.taxRate || 15}%)
                                        </p>
                                      ))}
                                    </div>
                                  )}

                                  {/* Sync Actions */}
                                  <div className="pt-2 border-t border-white/5 flex gap-2">
                                    {log.synced ? (
                                      <div className="w-full text-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-1.5 rounded-lg text-[9px] font-black flex items-center justify-center gap-1">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        تمت المزامنة وتأصيل القيود في قاعدة البيانات
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleSyncLogToDb(log)}
                                        disabled={syncLoadingId === log.id}
                                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-1.5 rounded-lg text-[9px] transition-all flex items-center justify-center gap-1 active:scale-95 shadow-md"
                                      >
                                        {syncLoadingId === log.id ? (
                                          <>
                                            <div className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                            جاري المزامنة...
                                          </>
                                        ) : (
                                          <>
                                            <UploadCloud className="w-3.5 h-3.5 text-slate-950" />
                                            اعتماد ومزامنة الدفتر المالي ⚡
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-start gap-1 mt-1 text-[8px] text-gray-500 font-mono">
                                <span>{new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                          </div>

                        </div>
                      ))
                    )}
                  </div>

                  {/* Simulator Sender settings bar */}
                  <div className="bg-[#111b21] border-t border-white/5 px-3 py-2 flex items-center justify-between text-[9px] text-gray-400 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">اسم المرسل:</span>
                      <input 
                        type="text" 
                        value={simSenderName} 
                        onChange={(e) => setSimSenderName(e.target.value)} 
                        className="bg-slate-950 border border-white/10 rounded px-2 py-0.5 text-white w-24 text-[9px]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">رقم الهاتف:</span>
                      <input 
                        type="text" 
                        value={simSenderPhone} 
                        onChange={(e) => setSimSenderPhone(e.target.value)} 
                        className="bg-slate-950 border border-white/10 rounded px-2 py-0.5 text-white w-32 text-[9px] text-left font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Input Chat Send bar */}
                  <div className="bg-[#1f2c34] p-3 border-t border-white/5 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="اكتب رسالة لمحاكاة أمر واتساب..."
                      value={simMessage}
                      onChange={(e) => setSimMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSendSimMessage();
                        }
                      }}
                      disabled={simSending || isRecording}
                      className="flex-1 bg-[#2a3942] border-none rounded-full px-4 py-2.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />

                    {/* Microphone Action Button */}
                    {isRecording ? (
                      <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-500/20 rounded-full px-3 py-1.5 shrink-0 animate-pulse">
                        <span className="text-[10px] text-rose-400 font-mono font-bold">
                          {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                        </span>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-500 transition-colors"
                          title="إيقاف التسجيل والإرسال"
                        >
                          <Mic className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        disabled={simSending}
                        className="w-10 h-10 rounded-full bg-[#2a3942] hover:bg-slate-700 text-emerald-400 flex items-center justify-center shrink-0 transition-colors"
                        title="تسجيل رسالة صوتية ومحاكاتها"
                      >
                        <Mic className="w-4.5 h-4.5 text-emerald-400" />
                      </button>
                    )}

                    {/* Send Button */}
                    <button
                      type="button"
                      onClick={() => handleSendSimMessage()}
                      disabled={simSending || !simMessage}
                      className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 transition-all active:scale-90"
                    >
                      {simSending ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4.5 h-4.5" />
                      )}
                    </button>
                  </div>
                </div>

              </div>

              {/* Developer Guide Card */}
              <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-5 mt-4 space-y-4 text-xs">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                    <Code className="w-4.5 h-4.5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">دليل الربط البرمجي وضبط المحادثات التلقائية لـ WhatsApp</h4>
                    <p className="text-[8px] text-gray-400 mt-0.5">تعليمات المطورين لضبط المحادثات البرمجية وتنفيذ أوامر الإدخال الصوتي والكتابي</p>
                  </div>
                </div>

                <div className="space-y-4 text-right">
                  <p className="text-[10px] text-gray-300 leading-relaxed">
                    يقوم خادم التطبيق باستقبال البيانات الواردة من عملاء الواتساب (سواء كانت رسائل نصية أو رسائل صوتية مسجلة) وتمريرها لنظام تحليل الذكاء الاصطناعي الذكي المدعوم بـ <strong className="text-emerald-400 font-extrabold">Gemini 3.6 Flash</strong>. يقوم الذكاء الاصطناعي بفهم الصوت أو النص تلقائياً، تحويله لبيانات مالية مهيكلة (JSON)، وصياغة رد مالي فوري وإرساله مجدداً للمستخدم مع توفير واجهة مزامنة ذكية بضغطة زر داخل التطبيق.
                  </p>

                  {/* Integration Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Text Processing Card */}
                    <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-2">
                      <span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        1. معالجة الأوامر الكتابية (Text Processing)
                      </span>
                      <p className="text-[9px] text-gray-400 leading-relaxed">
                        يتم تحليل الرسالة وتحديد الحركة بدقة: مصروف، سلفة، أو فاتورة مبيعات.
                      </p>
                      <div className="bg-slate-950 p-2 rounded-lg text-[9px] font-mono text-left text-gray-300 space-y-1" dir="ltr">
                        <div className="text-emerald-400 font-bold">// أمثلة مقبولة:</div>
                        <div>- "سجل مصروف غداء عمل بقيمة 85 ريال"</div>
                        <div>- "أعطيت سليم سلفة قدرها 500 ريال"</div>
                        <div>- "بيع 3 شواحن بسعر 40 ريال للعميل أحمد الحربي"</div>
                      </div>
                    </div>

                    {/* Voice Processing Card */}
                    <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-2">
                      <span className="text-[10px] text-teal-400 font-extrabold flex items-center gap-1">
                        <Mic className="w-3.5 h-3.5" />
                        2. معالجة الأوامر الصوتية (Voice Processing)
                      </span>
                      <p className="text-[9px] text-gray-400 leading-relaxed">
                        يتعرف النظام على الملفات الصوتية المسجلة (بصيغ OGG, WEBM, MP3) ويقوم بتفريغها من الكلام للذكاء الاصطناعي تلقائياً.
                      </p>
                      <div className="bg-slate-950 p-2 rounded-lg text-[9px] font-mono text-left text-teal-400 space-y-1" dir="ltr">
                        <div className="text-white font-bold">// آلية العمل:</div>
                        <div>1. العميل يرسل رسالة صوتية (Voice Note)</div>
                        <div>2. يستلم الويب هوك مسار الملف الصوتي Binary</div>
                        <div>3. يفرغ Gemini الصوت ويحوله لدفتر مالي JSON</div>
                      </div>
                    </div>
                  </div>

                  {/* Code instructions and snippets */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] text-gray-200 font-black flex items-center gap-1">
                      <Code className="w-3.5 h-3.5 text-orange-400" />
                      نموذج إرسال أمر مالي كتابي أو صوتي برمجياً (Custom Webhook Dispatcher)
                    </span>
                    <p className="text-[8px] text-gray-400 leading-relaxed">
                      إذا أردت كتابة كود مخصص في سيرفر خارجي لتمرير الرسائل إلى هذا البرنامج، قم بمحاكاة طلب الـ POST التالي:
                    </p>

                    <div className="bg-slate-900 p-3 rounded-xl border border-white/5 space-y-2">
                      <div className="flex justify-between items-center text-[8px] text-gray-400 border-b border-white/5 pb-1">
                        <span>Node.js / Express Client</span>
                        <span className="font-mono text-orange-400">POST /api/whatsapp/webhook</span>
                      </div>
                      <pre className="text-[9px] font-mono text-left text-gray-300 overflow-x-auto p-1 leading-normal max-h-48" dir="ltr">
{`// مثال كود إرسال رسالة نصية أو ملف صوتي Base64 إلى التطبيق
const fetch = require('node-fetch');

async function sendWhatsAppToSystem() {
  const response = await fetch('${window.location.origin}/api/whatsapp/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // محاكاة حزمة Meta Cloud API
      object: 'whatsapp_business_account',
      entry: [{
        id: '99283749283',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '${waFacilityPhone || '966500000000'}', phone_number_id: '${waPhoneNumberId || '10112440'}' },
            contacts: [{ profile: { name: 'أحمد الحربي' }, wa_id: '966501234567' }],
            messages: [{
              from: '966501234567',
              id: 'wamid.HBgL...',
              timestamp: String(Math.floor(Date.now() / 1000)),
              type: 'text', // أو 'audio' لقراءة الرسائل الصوتية
              text: { body: 'سجلت مصروف كهرباء بقيمة 150 ريال لشهر يوليو' }
            }]
          },
          field: 'messages'
        }]
      }]
    })
  });

  const result = await response.text();
  console.log('Response:', result);
}

sendWhatsAppToSystem();`}
                      </pre>
                    </div>

                    {/* Twilio Webhook Instruction card */}
                    <div className="bg-sky-950/20 p-3.5 rounded-xl border border-sky-500/10 space-y-2.5">
                      <span className="text-[10px] text-sky-400 font-extrabold flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5" />
                        تعليمات خطوة بخطوة للربط مع خدمة Twilio WhatsApp
                      </span>
                      <ol className="text-[9px] text-gray-300 list-decimal list-inside space-y-1.5 leading-relaxed pr-1">
                        <li>سجل دخولك إلى <strong className="text-white">Twilio Console</strong> وانتقل لصفحة <strong className="text-white">WhatsApp Sandbox Settings</strong>.</li>
                        <li>انسخ <strong className="text-sky-400">رابط استقبال الويب هوك الموحد</strong> الموضح بالأعلى.</li>
                        <li>الصق الرابط في حقل <strong className="text-white font-mono">WHEN A MESSAGE COMES IN</strong> في Twilio، واحفظ التعديلات.</li>
                        <li>ارسل الكود التعريفي (مثل <code className="bg-slate-900 px-1 py-0.5 rounded text-white font-mono text-[8px]">join xyz-abc</code>) لرقم تويليو الواتساب لتفعيل المحادثة.</li>
                        <li>الآن، ارسل رسائل نصية أو رسائل صوتية مباشرة، وسيقوم النظام بتسجيل الحركات بالذكاء الاصطناعي فورياً!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            {/* --- END WHATSAPP AI BOT --- */}
          </div>
        )}

        {/* TAB 7: DIAGNOSTICS & TAX COMPLIANCE CENTER */}
        {activeTab === 'diagnostics' && (
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white">مركز تشخيص الأخطاء وضمان الامتثال الضريبي</h3>
                <p className="text-[9px] text-gray-400">فحص فوري لقاعدة البيانات وفواتيرك والامتثال لشروط هيئة الزكاة</p>
              </div>
            </div>

            {/* Calculations & Auditing */}
            {(() => {
              const isVatEmpty = !settings.companyVatNumber;
              const isVatInvalidLength = settings.companyVatNumber && settings.companyVatNumber.length !== 15;
              const isVatInvalidStartsEnds = settings.companyVatNumber && (settings.companyVatNumber[0] !== '3' || settings.companyVatNumber[settings.companyVatNumber.length - 1] !== '3');
              
              const badB2B = invoices.filter(inv => inv.invoiceType === 'standard' && (!inv.customerTaxNumber || inv.customerTaxNumber.length !== 15));
              const mathMismatches = invoices.filter(inv => Math.abs(inv.subtotal + inv.taxTotal - inv.grandTotal) > 0.05);
              
              const cheapProducts = products.filter(p => p.price <= 0);
              const missingEnglishProducts = products.filter(p => !p.nameEn);

              // 1. Broken Category Links
              const brokenCategoryCount = transactions.filter(tx => !categories.find(c => c.id === tx.categoryId)).length;
              // 2. Broken Account Links
              const brokenAccountCount = transactions.filter(tx => !accounts.find(a => a.id === tx.accountId)).length;
              // 3. Duplicate Transactions
              const seenTxsSet = new Set<string>();
              let duplicateTxCount = 0;
              transactions.forEach(tx => {
                const key = `${tx.date}_${tx.title}_${tx.amount}_${tx.accountId}_${tx.categoryId}`;
                if (seenTxsSet.has(key)) {
                  duplicateTxCount++;
                } else {
                  seenTxsSet.add(key);
                }
              });
              // 4. Invalid Amounts
              const invalidAmountCount = transactions.filter(tx => isNaN(tx.amount) || tx.amount <= 0).length;

              let issuesCount = 0;
              const auditLogs: { type: 'critical' | 'warning' | 'info'; title: string; desc: string }[] = [];
              
              if (isVatEmpty) {
                issuesCount += 3;
                auditLogs.push({ type: 'critical', title: 'الرقم الضريبي للمنشأة مفقود', desc: 'يرجى إدخال الرقم الضريبي المكون من 15 خانة لمؤسستك في الإعدادات لضمان توليد رموز QR صالحة لهيئة الزكاة والضريبة والجمارك.' });
              } else if (isVatInvalidLength || isVatInvalidStartsEnds) {
                issuesCount += 2;
                auditLogs.push({ type: 'warning', title: 'الرقم الضريبي للمنشأة غير متوافق', desc: 'الرقم الضريبي للمنشأة يجب أن يتكون من 15 خانة ويبدأ وينتهي بالرقم 3 للتوافق مع متطلبات الفوترة الإلكترونية.' });
              } else {
                auditLogs.push({ type: 'info', title: 'الرقم الضريبي للمنشأة جاهز وصالح', desc: 'تم فحص الرقم الضريبي للمنشأة بنجاح وهو يطابق شروط ZATCA بالكامل.' });
              }

              if (!settings.companyNameEn) {
                issuesCount += 1;
                auditLogs.push({ type: 'warning', title: 'الاسم الإنجليزي للمنشأة مفقود', desc: 'توصي الهيئة بطباعة الاسم التجاري باللغتين ثنائية اللغة للامتثال السليم في الفواتير الضريبية المبسطة.' });
              }

              if (badB2B.length > 0) {
                issuesCount += badB2B.length * 2;
                auditLogs.push({
                  type: 'critical',
                  title: `فواتير ضريبية B2B مفقودة الأرقام الضريبية للعملاء (${badB2B.length})`,
                  desc: `تم اكتشاف فواتير ضريبية من نوع B2B لشركات ومؤسسات بدون إدراج أرقامهم الضريبية الرسمية المكونة من 15 خانة.`
                });
              }

              if (mathMismatches.length > 0) {
                issuesCount += mathMismatches.length * 2;
                auditLogs.push({
                  type: 'critical',
                  title: `أخطاء تقريب وحسابات رياضية بالفواتير (${mathMismatches.length})`,
                  desc: `يوجد فواتير لا يتطابق مجموع قيم بنودها المفرقة وضريبتها مع المجموع الكلي للفاتورة. يوصى بمراجعتها وتعديلها بقسم الفحص التلقائي بالأسفل.`
                });
              }

              if (cheapProducts.length > 0) {
                issuesCount += 1;
                auditLogs.push({
                  type: 'warning',
                  title: `منتجات أو خدمات بسعر صفر أو مجانية (${cheapProducts.length})`,
                  desc: `يوجد أصناف في قائمة المنتجات بسعر 0.00 ر.س. يرجى التأكد من صحة أسعار السلع لتفادي مشكلات الفوترة.`
                });
              }

              if (missingEnglishProducts.length > 0) {
                issuesCount += 0.5;
                auditLogs.push({
                  type: 'info',
                  title: `أصناف تفتقر للأسماء الإنجليزية في الفاتورة (${missingEnglishProducts.length})`,
                  desc: `لإصدار فواتير ثنائية اللغة متوافقة تماماً، يوصى بإضافة أسماء إنجليزية لجميع الأصناف والخدمات والسلع المضافة.`
                });
              }

              if (brokenCategoryCount > 0) {
                issuesCount += brokenCategoryCount * 1.5;
                auditLogs.push({
                  type: 'critical',
                  title: `قيود مرتبطة بتصنيفات مفقودة أو محذوفة (${brokenCategoryCount})`,
                  desc: `تم اكتشاف معاملات مالية مرتبطة بمعرف تصنيف غير موجود بالقائمة. سيقوم نظام الإصلاح التلقائي بمعالجتها وإعادتها لتصنيف عام.`
                });
              }

              if (brokenAccountCount > 0) {
                issuesCount += brokenAccountCount * 2;
                auditLogs.push({
                  type: 'critical',
                  title: `قيود مرتبطة بحسابات مالية مفقودة أو محذوفة (${brokenAccountCount})`,
                  desc: `تم اكتشاف معاملات مالية مسجلة على حساب بنكي أو نقدي غير موجود حالياً. قد يؤدي هذا لخلل في موازين المراجعة.`
                });
              }

              if (duplicateTxCount > 0) {
                issuesCount += duplicateTxCount * 1;
                auditLogs.push({
                  type: 'warning',
                  title: `قيود مالية مكررة بالكامل (${duplicateTxCount})`,
                  desc: `تم اكتشاف حركات مكررة متطابقة تماماً بالاسم والمبلغ والتاريخ والحساب، قد يكون ذلك ناتجاً عن تكرار النقر على الحفظ.`
                });
              }

              if (invalidAmountCount > 0) {
                issuesCount += invalidAmountCount * 1.5;
                auditLogs.push({
                  type: 'warning',
                  title: `معاملات ذات قيم غير صالحة أو مفرغة (${invalidAmountCount})`,
                  desc: `تم اكتشاف حركات ماليّة مسجلة بمبالغ تساوي صفراً أو سالبة أو قيم غير رقمية.`
                });
              }

              const score = Math.max(0, Math.min(100, Math.round(100 - issuesCount * 10)));

              return (
                <div className="space-y-4">
                  {/* Gauge indicator */}
                  <div className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] text-gray-400 font-extrabold block">معدل الامتثال والجودة الإجمالي</span>
                      <h4 className="text-xl font-black mt-1 leading-none text-white">
                        {score}% <span className="text-[10px] text-gray-500 font-bold">نسبة الامتثال</span>
                      </h4>
                      <p className="text-[8px] text-gray-500 mt-1.5 leading-normal">
                        {score >= 95 
                          ? 'قاعدة البيانات والفواتير مطابقة لمعايير الجودة الضريبية وتخلو من أي أخطاء حرجة.' 
                          : score >= 75 
                            ? 'أداء جيد، ولكن يوصى بتعديل التحذيرات وتشغيل الإصلاح التلقائي لتجنب المشكلات الحسابية.' 
                            : 'تحذير حرج: توجد أخطاء ضريبية أو حسابية بالفواتير والمنشأة تتطلب الإصلاح الفوري.'}
                      </p>
                    </div>

                    <div className="relative flex items-center justify-center shrink-0 w-16 h-16 rounded-full border border-white/5 bg-slate-900/80 shadow-inner">
                      <div className={`text-center font-black text-xs ${
                        score >= 90 ? 'text-emerald-400' : score >= 70 ? 'text-amber-400' : 'text-rose-500'
                      }`}>
                        {score >= 90 ? 'آمن جداً' : score >= 70 ? 'مقبول' : 'حرج'}
                      </div>
                    </div>
                  </div>

                  {/* Summary counts */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[8px] text-gray-400 block mb-0.5">الفواتير المفحوصة</span>
                      <span className="font-mono text-[10px] font-black text-blue-400">{invoices.length} فواتير</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[8px] text-gray-400 block mb-0.5">الأصناف المبرمجة</span>
                      <span className="font-mono text-[10px] font-black text-amber-400">{products.length} صنف</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[8px] text-gray-400 block mb-0.5">العملاء النشطين</span>
                      <span className="font-mono text-[10px] font-black text-purple-400">{customers.length} عملاء</span>
                    </div>
                  </div>

                  {/* Auto-Repair Button & Console */}
                  <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-emerald-500/10 space-y-3 shadow-inner">
                    <div className="flex items-center gap-2">
                      <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                        <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-white">نظام المعالجة والإصلاح التلقائي للأخطاء</h4>
                        <p className="text-[8px] text-gray-400 mt-0.5 leading-normal">
                          يقوم بمراجعة هيكلية البيانات، وتصحيح روابط القيود المكسورة، وتعديل حسابات الفواتير، وحذف القيود المكررة فورياً.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAutoRepairDatabase}
                      disabled={repairStatus === 'repairing'}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-slate-950 font-black py-2 rounded-xl text-[10px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      {repairStatus === 'repairing' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          جاري تشغيل الفحص التلقائي والمعالجة...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          تشغيل نظام الفحص التلقائي والمعالجة الفورية
                        </>
                      )}
                    </button>

                    {repairReport && (
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-white/5 text-right space-y-1">
                        <span className="text-[9px] text-emerald-400 font-extrabold block">✓ تقرير معالجة قاعدة البيانات الأخير:</span>
                        <pre className="text-[9px] text-gray-300 font-mono whitespace-pre-line leading-relaxed overflow-x-auto">
                          {repairReport}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Audit Logs List */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    <span className="text-[10px] text-gray-400 font-extrabold block">سجل الفحص التفصيلي والأخطاء ({auditLogs.length})</span>
                    
                    {auditLogs.map((log, index) => {
                      const Icon = log.type === 'critical' ? AlertCircle : log.type === 'warning' ? AlertTriangle : CheckCircle2;
                      const badgeColor = log.type === 'critical' 
                        ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' 
                        : log.type === 'warning' 
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                          : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                      
                      return (
                        <div key={index} className="bg-slate-950/80 p-3 rounded-2xl border border-white/5 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-white">
                              <Icon className={`w-3.5 h-3.5 ${log.type === 'critical' ? 'text-rose-400' : log.type === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`} />
                              <span>{log.title}</span>
                            </div>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${badgeColor}`}>
                              {log.type === 'critical' ? 'خطأ حرج' : log.type === 'warning' ? 'تحذير' : 'سليم'}
                            </span>
                          </div>
                          <p className="text-[9px] text-gray-400 leading-normal pr-5">{log.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 8: AUTOMATION RULES (قواعد التشغيل التلقائي) */}
        {activeTab === 'automation' && (
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 space-y-4 shadow-lg text-right">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
                <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white">قواعد التشغيل والتحذيرات التلقائية (Automation Rules)</h3>
                <p className="text-[9px] text-gray-400">برمجة ردود فعل وتنبيهات فورية لربط المعاملات المالية بالمنشأة</p>
              </div>
            </div>

            {/* In-depth explanation card */}
            <div className="bg-indigo-950/20 p-3.5 rounded-2xl border border-indigo-500/10">
              <p className="text-[9px] text-indigo-300 leading-normal">
                تمكنك هذه الأداة من صياغة <strong>قواعد أتمتة تشغيلية</strong> ذكية على قاعدة البيانات. فمثلاً، يمكنك تفعيل قاعدة تُطلق إشعاراً فوريّاً بمجرد تسجيل مصروف يتجاوز حداً معيناً، أو قاعدة تُنبّهك عند هبوط السيولة في حساب ما، أو ترسل إشارة لبرمجة خارجية لحظياً.
              </p>
            </div>

            {/* Rule Creation Form */}
            <form onSubmit={handleAddRule} className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl space-y-3.5">
              <h4 className="text-[10px] font-black text-white flex items-center gap-1.5 pb-1.5 border-b border-white/5">
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                إضافة قاعدة أتمتة جديدة
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="text-[9px] text-gray-400 block mb-1 font-bold">اسم القاعدة التلقائية</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تنبيه المصروفات الكبيرة (> 1000 ريال)"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-indigo-500 text-right font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-gray-400 block mb-1 font-bold">الحدث والمشغّل (Trigger)</label>
                    <select
                      value={newRuleTrigger}
                      onChange={(e: any) => setNewRuleTrigger(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-indigo-500 text-right font-bold"
                    >
                      <option value="expense_above">إذا تم تسجيل مصروف أكبر من (&gt;)</option>
                      <option value="balance_below">إذا انخفض رصيد حساب عن (&lt;)</option>
                      <option value="new_invoice">إذا تم إصدار فاتورة مبيعات جديدة</option>
                    </select>
                  </div>

                  {newRuleTrigger !== 'new_invoice' && (
                    <div>
                      <label className="text-[9px] text-gray-400 block mb-1 font-bold">القيمة المستهدفة (بالريال السعودي)</label>
                      <input
                        type="number"
                        required
                        value={newRuleValue}
                        onChange={(e) => setNewRuleValue(e.target.value)}
                        placeholder="1000"
                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-indigo-500 text-right font-mono"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[9px] text-gray-400 block mb-1 font-bold">الإجراء الفوري المتخذ (Action)</label>
                  <select
                    value={newRuleAction}
                    onChange={(e: any) => setNewRuleAction(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-indigo-500 text-right font-bold"
                  >
                    <option value="notification">إرسال تنبيه فوري منبثق (Toast Alert)</option>
                    <option value="webhook">إرسال تفاصيل البيانات فوراً إلى الويب هوك (Webhook POST)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black py-2.5 rounded-xl text-[10px] flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-lg shadow-indigo-500/10"
              >
                <Plus className="w-3.5 h-3.5" />
                حفظ وتفعيل قاعدة التشغيل
              </button>
            </form>

            {/* List of Active Rules */}
            <div className="space-y-2">
              <span className="text-[10px] text-gray-400 font-extrabold block">قواعد التشغيل الحالية والتحكم الفوري ({automationRules.length})</span>
              
              {automationRules.length === 0 ? (
                <div className="text-center py-6 bg-slate-950/40 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-gray-500">لا توجد قواعد مضافة للنظام حالياً.</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {automationRules.map((rule) => (
                    <div key={rule.id} className="bg-slate-950/80 p-3.5 rounded-2xl border border-white/5 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-white text-[10px]">{rule.name}</span>
                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border ${
                              rule.isActive 
                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                                : 'text-gray-500 bg-slate-900 border-white/5'
                            }`}>
                              {rule.isActive ? 'نشط ومفعل' : 'معطل مؤقتا'}
                            </span>
                          </div>
                          
                          <p className="text-[9px] text-gray-400 mt-1">
                            🎯 الحدث: {
                              rule.trigger === 'expense_above' 
                                ? `إذا تجاوز مصروف حاجز ${rule.value} ر.س`
                                : rule.trigger === 'balance_below'
                                  ? `إذا قل رصيد حساب عن ${rule.value} ر.س`
                                  : 'عند إصدار أي فاتورة مبيعات جديدة'
                            }
                          </p>

                          <p className="text-[8px] text-gray-500 mt-0.5">
                            ⚙️ الإجراء: {
                              rule.action === 'notification' 
                                ? 'إطلاق جرس تنبيه بالهاتف (Dynamic Island)' 
                                : `إرسال كود حمولة مخصصة للويب هوك (${webhookUrl || 'الويب هوك المبرمج'})`
                            }
                          </p>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleRule(rule.id)}
                            className={`w-7 h-4 rounded-full p-0.5 transition-colors relative ${
                              rule.isActive ? 'bg-indigo-500' : 'bg-slate-800'
                            }`}
                          >
                            <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${
                              rule.isActive ? '-translate-x-3' : 'translate-x-0'
                            }`} />
                          </button>

                          {/* Simulation trigger */}
                          <button
                            type="button"
                            onClick={() => handleSimulateRule(rule)}
                            title="محاكاة تشغيل القاعدة"
                            className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 p-1 rounded-lg border border-indigo-500/20 text-[8px] font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            محاكاة
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 p-1 rounded-lg border border-rose-500/20 cursor-pointer"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Logout button at the very bottom */}
      <button
        onClick={onLogout}
        className="w-full bg-slate-950 hover:bg-slate-900 text-rose-400 font-black py-4 rounded-[24px] text-xs flex items-center justify-center gap-2 transition-all border border-rose-500/10 shadow-lg mt-6 active:scale-95"
      >
        <RotateCcw className="w-4 h-4" />
        تسجيل الخروج من الحساب (Sign Out)
      </button>
    </div>
  );
};
