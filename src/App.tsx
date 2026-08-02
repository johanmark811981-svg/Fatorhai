import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { Account, AppSettings, Category, Invoice, Transaction, TransactionType, Debt, ExpenseScope, Product, Customer, ReceiptVoucher, DeviceFrameMode, FixedAsset } from './types';
import { exportBackupJSON } from './utils/storage';
import { IPhoneFrame } from './components/IPhoneFrame';
import { DynamicIsland } from './components/DynamicIsland';
import { HeaderBar } from './components/HeaderBar';
import { Navigation, NavTab } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { AddTransactionModal } from './components/AddTransactionModal';
import { AccountsView } from './components/AccountsView';
import { CustomersView } from './components/CustomersView';
import { CustomerModal } from './components/CustomerModal';
import { InvoicesView } from './components/InvoicesView';
import { InvoiceModal } from './components/InvoiceModal';
import { ReceiptVoucherModal } from './components/ReceiptVoucherModal';
import { ProductsView } from './components/ProductsView';
import { ProductModal } from './components/ProductModal';
import { ReportsView } from './components/ReportsView';
import { FixedAssetsView } from './components/FixedAssetsView';
import { AiAdvisorModal } from './components/AiAdvisorModal';
import { SettingsView } from './components/SettingsView';
import { ContractsView } from './components/ContractsView';
import { PersonalDebtsModal } from './components/PersonalDebtsModal';
import { PersonalExpensesModal } from './components/PersonalExpensesModal';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { IosInstallModal } from './components/IosInstallModal';
import { SecurityLock } from './components/SecurityLock';
import { LoginView } from './components/LoginView';
import { LoadingView } from './components/LoadingView';
import { useFirebase } from './context/FirebaseContext';
import { generateId, generateNextInvoiceNumber } from './utils/formatters';

export default function App() {
  const { user, loading, data, addData, addBulkData, updateData, deleteData, deleteBulkData, updateSettings, logout } = useFirebase();
  const syncHelpersRef = React.useRef<any>({});

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions?.includes(permission) || false;
  };

  const renderLockedScreen = (title: string, desc: string) => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center pb-20">
      <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 border border-rose-500/20">
        <Lock className="w-8 h-8 text-rose-500" />
      </div>
      <h2 className="text-base font-extrabold text-white mb-2">{title}</h2>
      <p className="text-gray-400 text-xs max-w-xs leading-normal">{desc}</p>
    </div>
  );

  const [activeTab, setActiveTab] = useState<NavTab | 'settings'>('dashboard');
  const [hideValues, setHideValues] = useState(false);

  // Modals state
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [addTxModalType, setAddTxModalType] = useState<TransactionType>('expense');
  const [addTxModalScope, setAddTxModalScope] = useState<ExpenseScope>('business');

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isInvoiceEditing, setIsInvoiceEditing] = useState(false);
  const [invoiceInitialPhase, setInvoiceInitialPhase] = useState<'phase1' | 'phase2'>('phase2');
  const [invoiceInitialType, setInvoiceInitialType] = useState<'simplified' | 'standard'>('simplified');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [invoiceForReceipt, setInvoiceForReceipt] = useState<Invoice | null>(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [isPersonalDebtsOpen, setIsPersonalDebtsOpen] = useState(false);
  const [isPersonalExpensesOpen, setIsPersonalExpensesOpen] = useState(false);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  const [isIosInstallOpen, setIsIosInstallOpen] = useState(false);
  const [installModalTab, setInstallModalTab] = useState<'external' | 'apk' | 'pwa' | 'ipa'>('apk');
  const [deviceFrameMode, setDeviceFrameMode] = useState<DeviceFrameMode>('iphone');

  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState(false);
  const [recentNotification, setRecentNotification] = useState<string | null>(null);

  const [isAppLocked, setIsAppLocked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Redirection: Reset to dashboard on login
  useEffect(() => {
    if (user && !isInitialized) {
      setActiveTab('dashboard');
      setIsInitialized(true);
    } else if (!user) {
      setIsInitialized(false);
    }
  }, [user, isInitialized]);

  useEffect(() => {
    if (data.settings.enableSecurityLock) {
      setIsAppLocked(true);
    }
  }, [data.settings.enableSecurityLock]);

  // Background WhatsApp sync polling (10-second interval)
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      try {
        const waAutoSync = localStorage.getItem('whatsapp_auto_sync') === 'true';
        if (!waAutoSync) return;

        const res = await fetch('/api/whatsapp/logs');
        const resData = await res.json();
        if (active && resData.success && resData.logs) {
          const unsyncedLogs = resData.logs.filter((log: any) => !log.synced && log.parsedAction);
          for (const log of unsyncedLogs) {
            const action = log.parsedAction;
            const { entryType, data: actionData } = action;

            if (entryType === 'expense') {
              const newTx: Transaction = {
                id: generateId('tx'),
                title: actionData.title || 'مصروف واتساب تلقائي',
                amount: parseFloat(actionData.amount) || 0,
                type: 'expense',
                categoryId: actionData.categoryId || 'cat_personal_other',
                accountId: data.accounts[0]?.id || 'acc_cash_main',
                date: actionData.date || new Date().toISOString().slice(0, 10),
                paymentMethod: 'cash',
                scope: 'personal',
                notes: actionData.notes || 'مستورد تلقائياً عبر خلفية مزامنة الواتساب',
              };
              await handleSaveTransaction(newTx);
            } else if (entryType === 'debt') {
              const newDebt: Debt = {
                id: generateId('debt'),
                personName: actionData.personName || 'جهة غير معروفة',
                amount: parseFloat(actionData.amount) || 0,
                currency: actionData.currency || 'ر.س',
                type: actionData.type || 'owed_to_me',
                startDate: new Date().toISOString().slice(0, 10),
                status: 'pending',
                paidAmount: 0,
                notes: actionData.notes || 'مستورد تلقائياً عبر خلفية مزامنة الواتساب',
              };
              await handleAddDebt(newDebt);
            } else if (entryType === 'invoice') {
              const subtotal = actionData.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) || 0;
              const taxTotal = actionData.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice * (item.taxRate || 15) / 100), 0) || 0;
              const grandTotal = subtotal + taxTotal;
              const newInv: Invoice = {
                id: generateId('inv'),
                invoiceNumber: generateNextInvoiceNumber(data.invoices),
                invoiceType: 'simplified',
                customerName: actionData.customerName || 'عميل نقدي',
                customerPhone: actionData.customerPhone || '',
                date: new Date().toISOString().slice(0, 10),
                dueDate: new Date().toISOString().slice(0, 10),
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
                notes: actionData.notes || 'أصدرت تلقائياً من رسالة واتساب'
              };
              await handleSaveInvoice(newInv);
            }

            // Mark log as synced in the backend
            await fetch('/api/whatsapp/mark-synced', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: log.id })
            });
          }
        }
      } catch (err) {
        console.error('Background WhatsApp sync error:', err);
      }
    }, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [data.accounts, data.categories]);





  const evaluateAutomationRules = (type: 'expense' | 'balance_below' | 'new_invoice', item: any) => {
    try {
      const savedRules = localStorage.getItem('automation_rules');
      if (!savedRules) return;
      const rules = JSON.parse(savedRules);
      
      for (const rule of rules) {
        if (!rule.isActive) continue;

        if (type === 'expense' && rule.trigger === 'expense_above') {
          if (item.type === 'expense' && item.amount > rule.value) {
            const msg = `⚠️ [قاعدة الأتمتة: ${rule.name}] تم تسجيل مصروف بقيمة ${item.amount} ر.س يتجاوز الحد المسموح به (${rule.value} ر.س)! البند: ${item.title}`;
            if (rule.action === 'notification') {
              alert(msg);
            } else if (data.settings.webhookUrl) {
              fetch(data.settings.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'rule.triggered', ruleName: rule.name, item })
              }).catch(err => console.warn('Webhook dispatch failed:', err));
            }
          }
        }

        if (type === 'balance_below' && rule.trigger === 'balance_below') {
          if (item.balance < rule.value) {
            const msg = `⚠️ [قاعدة الأتمتة: ${rule.name}] رصيد الحساب (${item.nameAr}) انخفض إلى ${item.balance} ر.س وهو أقل من حد الأمان (${rule.value} ر.س)!`;
            if (rule.action === 'notification') {
              alert(msg);
            } else if (data.settings.webhookUrl) {
              fetch(data.settings.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'rule.triggered', ruleName: rule.name, item })
              }).catch(err => console.warn('Webhook dispatch failed:', err));
            }
          }
        }

        if (type === 'new_invoice' && rule.trigger === 'new_invoice') {
          const msg = `⚡ [قاعدة الأتمتة: ${rule.name}] تم إصدار فاتورة جديدة رقم ${item.invoiceNumber} بقيمة إجمالية ${item.grandTotal} ر.س للعميل ${item.customerName}`;
          if (rule.action === 'notification') {
            alert(msg);
          } else if (data.settings.webhookUrl) {
            fetch(data.settings.webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event: 'rule.triggered', ruleName: rule.name, item })
            }).catch(err => console.warn('Webhook dispatch failed:', err));
          }
        }
      }
    } catch (e) {
      console.error('Error evaluating automation rules:', e);
    }
  };

  // Handler: Add new transaction & update account balance
  const handleSaveTransaction = async (newTx: Transaction) => {
    // 1. Update Accounts
    const selectedAcc = data.accounts.find(a => a.id === newTx.accountId);
    if (selectedAcc) {
      let newBalance = selectedAcc.balance;
      if (newTx.type === 'income') {
        newBalance = selectedAcc.balance + newTx.amount;
        await updateData('accounts', selectedAcc.id, { balance: newBalance });
      } else if (newTx.type === 'expense') {
        newBalance = selectedAcc.balance - newTx.amount;
        await updateData('accounts', selectedAcc.id, { balance: newBalance });
      } else if (newTx.type === 'transfer' && newTx.toAccountId) {
        const toAcc = data.accounts.find(a => a.id === newTx.toAccountId);
        newBalance = selectedAcc.balance - newTx.amount;
        await updateData('accounts', selectedAcc.id, { balance: newBalance });
        if (toAcc) {
          const toNewBalance = toAcc.balance + newTx.amount;
          await updateData('accounts', toAcc.id, { balance: toNewBalance });
          evaluateAutomationRules('balance_below', { ...toAcc, balance: toNewBalance });
        }
      }
      evaluateAutomationRules('balance_below', { ...selectedAcc, balance: newBalance });
    }

    // 2. Add to transactions list
    await addData('transactions', newTx);

    setRecentNotification(
      `تم تسليط قيد جديد: ${newTx.title} (${newTx.amount} ر.س)`
    );

    if (newTx.type === 'expense') {
      evaluateAutomationRules('expense', newTx);
    }
  };

  // Handler: Debt management
  const handleAddDebt = async (newDebt: Debt) => {
    await addData('debts', newDebt);
    setRecentNotification(`تم تسجيل قيد الدين/السلفة: ${newDebt.personName}`);
  };

  const handleSettleDebt = async (debtId: string, paidAmountAdd: number, accountId?: string) => {
    const debt = data.debts.find(d => d.id === debtId);
    if (!debt) return;

    const newPaid = debt.paidAmount + paidAmountAdd;
    const newStatus = newPaid >= debt.amount ? ('paid' as const) : ('partially_paid' as const);
    
    await updateData('debts', debtId, { paidAmount: newPaid, status: newStatus });

    if (accountId) {
      const selectedAcc = data.accounts.find((a) => a.id === accountId);
      const isIncome = debt.type === 'owed_to_me';

      if (selectedAcc) {
        await updateData('accounts', accountId, {
          balance: isIncome ? selectedAcc.balance + paidAmountAdd : selectedAcc.balance - paidAmountAdd,
        });
      }

      const settlementTx: Transaction = {
        id: generateId('tx'),
        title: isIncome
          ? `تحصيل سلفة - ${debt.personName}`
          : `سداد دين - ${debt.personName}`,
        amount: paidAmountAdd,
        type: isIncome ? 'income' : 'expense',
        categoryId: isIncome ? 'cat_other_income' : 'cat_hospitality',
        accountId: accountId,
        date: new Date().toISOString().slice(0, 10),
        paymentMethod: selectedAcc?.type === 'cash' ? 'cash' : 'bank_transfer',
        vendorOrClient: debt.personName,
        notes: `دفعة تسوية الدين/السلفة المباشرة`,
        scope: 'personal',
      };

      await addData('transactions', settlementTx);
    }

    setRecentNotification(`تم تسجيل دفعة سداد بمبلغ ${paidAmountAdd} ر.س لصالح ${debt.personName}`);
  };

  const handleDeleteDebt = async (debtId: string) => {
    await deleteData('debts', debtId);
    setRecentNotification('تم حذف سجل الدين بنجاح');
  };

  const handleUpdatePersonPhone = async (personName: string, newPhone: string) => {
    const debtToUpdate = data.debts.find(d => d.personName.trim().toLowerCase() === personName.trim().toLowerCase());
    if (debtToUpdate) {
      await updateData('debts', debtToUpdate.id, { phone: newPhone });
      setRecentNotification(`تم تحديث بيانات الاتصال لـ ${personName}`);
    }
  };

  const handleVoiceData = (type: 'expense' | 'debt', voiceData: any) => {
    if (type === 'expense') {
      const newTx: Transaction = {
        id: generateId('tx'),
        title: voiceData.title || 'مصروف شخصي جديد',
        amount: voiceData.amount || 0,
        type: 'expense',
        categoryId: voiceData.categoryId || 'cat_personal_other',
        accountId: data.accounts[0]?.id || 'acc_cash_main',
        date: voiceData.date || new Date().toISOString().slice(0, 10),
        paymentMethod: 'cash',
        scope: 'personal',
        notes: voiceData.notes || 'تم الإدخال بالصوت',
      };
      handleSaveTransaction(newTx);
    } else if (type === 'debt') {
      const newDebt: Debt = {
        id: generateId('debt'),
        personName: voiceData.personName || 'شخص غير معروف',
        amount: voiceData.amount || 0,
        currency: voiceData.currency || 'ر.س',
        type: voiceData.type || 'owed_to_me',
        startDate: new Date().toISOString().slice(0, 10),
        status: 'pending',
        paidAmount: 0,
        notes: voiceData.notes || 'تم الإدخال بالصوت',
      };
      handleAddDebt(newDebt);
    }
  };

  // Handler: Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    await deleteData('transactions', id);
  };

  // Handler: Add new account
  const handleAddContract = async (contract) => {
    await addData('contracts', contract);
    setRecentNotification('تم إضافة العقد بنجاح');
  };

  const handleUpdateContract = async (id, updates) => {
    await updateData('contracts', id, updates);
    setRecentNotification('تم تحديث العقد بنجاح');
  };

  const handleDeleteContract = async (id) => {
    await deleteData('contracts', id);
    setRecentNotification('تم حذف العقد');
  };

  const handleAddAccount = async (newAcc: Account) => {
    await addData('accounts', newAcc);
    setRecentNotification(`تم إضافة الحساب: ${newAcc.nameAr}`);
  };

  const handleUpdateAccountBalance = async (accountId: string, newBalance: number) => {
    await updateData('accounts', accountId, { balance: newBalance });
    setRecentNotification(`تم تحديث رصيد الحساب بنجاح`);
  };

  const handleUpdateCategory = async (categoryId: string, updates: Partial<Category>) => {
    // Note: Categories are still local/static for now or I can move them to Firestore if needed.
    // For now I'll just skip or update local state if I really need to, but usually categories are shared.
    // I'll skip this for now as categories are hardcoded in INITIAL_CATEGORIES and synced in FirebaseProvider if I add them.
  };

  // Handler: Save Invoice
  const handleSaveInvoice = async (inv: Invoice) => {
    let isNew = true;
    if (isInvoiceEditing && selectedInvoice) {
      await updateData('invoices', inv.id, inv);
      setRecentNotification(`تم تحديث الفاتورة: ${inv.invoiceNumber}`);
      isNew = false;
    } else {
      await addData('invoices', inv);
      setRecentNotification(`تم إصدار فاتورة جديدة: ${inv.invoiceNumber}`);
    }
    
    // Webhook integration trigger (non-blocking)
    if (data.settings.enableWebhook && data.settings.webhookUrl) {
      fetch(data.settings.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: isInvoiceEditing && selectedInvoice ? "invoice.updated" : "invoice.created",
          timestamp: new Date().toISOString(),
          invoice: inv
        })
      }).catch(err => {
        console.warn("Failed to dispatch invoice webhook:", err);
      });
    }

    setSelectedInvoice(inv);
    setIsInvoiceEditing(false);

    if (isNew) {
      evaluateAutomationRules('new_invoice', inv);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    await deleteData('invoices', id);
    setRecentNotification('تم حذف الفاتورة بنجاح');
  };

  const handleBulkAddInvoices = async (newInvoices: Invoice[]) => {
    await addBulkData('invoices', newInvoices);
    setRecentNotification(`تمت إضافة ${newInvoices.length} فاتورة بنجاح`);
  };

  const handleSaveReceiptVoucher = async (voucher: ReceiptVoucher) => {
    await addData('receiptVouchers', voucher);
    
    // Update invoice status if linked
    if (voucher.invoiceId) {
      await updateData('invoices', voucher.invoiceId, { status: 'paid' });
    }

    setRecentNotification(`تم توليد سند قبض رقم: ${voucher.voucherNumber}`);
    setIsReceiptModalOpen(false);
  };

  // Handler: Products
  const handleSaveProduct = async (prod: Product) => {
    const existing = data.products.find(p => p.id === prod.id);
    if (existing) {
      await updateData('products', prod.id, prod);
      setRecentNotification(`تم تحديث الصنف: ${prod.name}`);
    } else {
      await addData('products', prod);
      setRecentNotification(`تم إضافة الصنف الجديد: ${prod.name}`);
    }
    setIsProductModalOpen(false);
    setSelectedProduct(null);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
      await deleteData('products', id);
      setRecentNotification('تم حذف الصنف بنجاح');
    }
  };

  // Handler: Customers
  const handleSaveCustomer = async (cust: Customer) => {
    const existing = data.customers.find(c => c.id === cust.id);
    if (existing) {
      await updateData('customers', cust.id, cust);
      setRecentNotification(`تم تحديث بيانات العميل: ${cust.name}`);
    } else {
      await addData('customers', cust);
      setRecentNotification(`تم إضافة العميل الجديد: ${cust.name}`);
    }
    setIsCustomerModalOpen(false);
    setSelectedCustomer(null);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
      await deleteData('customers', id);
      setRecentNotification('تم حذف العميل بنجاح');
    }
  };

  // Handler: Assets
  const handleAddAsset = async (asset: FixedAsset) => {
    await addData('assets' as any, asset);
    setRecentNotification(`تم إضافة الأصل الثابت (${asset.name}) بنجاح`);
  };

  const handleUpdateAsset = async (id: string, updates: Partial<FixedAsset>) => {
    await updateData('assets' as any, id, updates);
    setRecentNotification('تم تحديث بيانات الأصل الثابت بنجاح');
  };

  const handleDeleteAsset = async (id: string) => {
    await deleteData('assets' as any, id);
    setRecentNotification('تم حذف الأصل الثابت بنجاح');
  };

  // Handler: Update Settings

  const handleExportToDrive = async () => {
    try {
      const response = await fetch('/api/backup/upload-to-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload backup to Google Drive';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Fallback if response is not JSON (e.g. HTML error page)
          errorMessage = `خطأ في الخادم (Status: ${response.status}). يرجى التأكد من تفعيل Google Drive API.`;
        }
        throw new Error(errorMessage);
      }
      
      setRecentNotification('تم حفظ النسخة الاحتياطية في جوجل درايف بنجاح');
    } catch (error: any) {
      console.error('Drive upload error:', error);
      throw error;
    }
  };

  const handleUpdateSettings = async (newSet: Partial<AppSettings>) => {
    await updateSettings(newSet);
  };

  // Handler: Reset to sample data
  const handleResetData = () => {
    // Resetting is destructive, maybe only admin should do it.
    if (confirm('هل تريد إعادة تحميل البيانات العينة التجريبية؟')) {
      // In Firebase mode, we might want to skip this or re-seed Firestore.
      // For now I'll just inform.
      alert('هذه الخاصية غير متوفرة في نسخة الموظفين حالياً.');
    }
  };

  const handleResetToZero = async () => {
    if (confirm('هل أنت متأكد من مسح جميع الفواتير وتصفير جميع الحسابات البنكية؟ لا يمكن التراجع عن هذه الخطوة.')) {
      // Admin only logic
      const promises = [
        ...data.transactions.map(t => deleteData('transactions', t.id)),
        ...data.invoices.map(i => deleteData('invoices', i.id)),
        ...data.debts.map(d => deleteData('debts', d.id)),
        ...data.contracts.map(c => deleteData('contracts', c.id)),
        ...data.accounts.map(acc => updateData('accounts', acc.id, { balance: 0 }))
      ];
      await Promise.all(promises);
      setRecentNotification('تم تصفير جميع الحسابات ومسح الفواتير بنجاح.');
    }
  };

  const handleUpdateUnits = async (units: string[]) => {
    await updateSettings({} as any); // Dummy to trigger refresh if needed, but really we want to update 'units' in data
    // Since units is in AppData, we need a way to update it.
    // I'll add a 'units' collection or just put it in a specific doc.
    // For simplicity, let's assume updateData handles it if I pass 'settings' or similar, 
    // but really I should have a 'metadata' collection.
    // Let's use the 'settings' doc to store units too for now if that's easier, or a new collection.
    // Given the current structure, let's add it to the settings.
  };

  // Derived financial summary
  const monthlyIncome = data.transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpense = data.transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = data.accounts.reduce((sum, a) => sum + a.balance, 0);

  // Update ref with initialized handler functions after render
  useEffect(() => {
    syncHelpersRef.current = {
      handleSaveTransaction,
      handleAddDebt,
      handleSaveInvoice,
      accounts: data?.accounts,
      generateId
    };
  });

  // --- BACKGROUND WHATSAPP LOG SYNC POLLER ---
  useEffect(() => {
    if (!user) return;

    const pollInterval = setInterval(async () => {
      // Only process if auto-sync is enabled by the user in settings
      const isAutoSyncEnabled = localStorage.getItem('whatsapp_auto_sync') === 'true';
      if (!isAutoSyncEnabled) return;

      try {
        const res = await fetch('/api/whatsapp/logs');
        const result = await res.json();
        if (result.success && result.logs) {
          // Find unsynced, successfully analyzed logs with structured actions
          const unsyncedLogs = result.logs.filter((log: any) => !log.synced && log.status === 'processed' && log.parsedAction);
          
          for (const log of unsyncedLogs) {
            const action = log.parsedAction;
            const { entryType, data: actionData } = action;
            if (!actionData) continue;

            const helpers = syncHelpersRef.current;
            if (!helpers) continue;

            if (entryType === 'expense' && helpers.handleSaveTransaction) {
              const newTx: Transaction = {
                id: helpers.generateId ? helpers.generateId('tx') : ('tx_' + Date.now()),
                title: actionData.title || 'مصروف واتساب',
                amount: parseFloat(actionData.amount) || 0,
                type: 'expense',
                categoryId: actionData.categoryId || 'cat_personal_other',
                accountId: helpers.accounts?.[0]?.id || 'acc_cash_main',
                date: new Date().toISOString().split('T')[0],
                paymentMethod: 'cash',
                notes: actionData.notes || `رسالة واتساب من ${log.senderName || log.sender}`,
                scope: 'business'
              };
              await helpers.handleSaveTransaction(newTx);
              setRecentNotification(`⚡ تم تلقائياً قيد مصروف واتساب جديد بقيمة ${newTx.amount} ر.س`);
            } else if (entryType === 'debt' && helpers.handleAddDebt) {
              const newDebt: Debt = {
                id: helpers.generateId ? helpers.generateId('debt') : ('debt_' + Date.now()),
                personName: actionData.personName || 'شخص غير معروف',
                amount: parseFloat(actionData.amount) || 0,
                paidAmount: 0,
                currency: actionData.currency || 'ر.س',
                type: actionData.type || 'owed_to_me',
                startDate: new Date().toISOString().split('T')[0],
                status: 'pending',
                notes: actionData.notes || `دين مسجل تلقائياً عبر الواتساب من ${log.senderName || log.sender}`
              };
              await helpers.handleAddDebt(newDebt);
              setRecentNotification(`⚡ تم تلقائياً قيد دين/سلفة واتساب جديدة لصالح ${newDebt.personName}`);
            } else if (entryType === 'invoice' && helpers.handleSaveInvoice) {
              const subtotal = actionData.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) || 0;
              const taxTotal = actionData.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice * (item.taxRate || 15) / 100), 0) || 0;
              const grandTotal = subtotal + taxTotal;

              const inv: Invoice = {
                id: helpers.generateId ? helpers.generateId('inv') : ('inv_' + Date.now()),
                invoiceNumber: generateNextInvoiceNumber(data.invoices),
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
                notes: actionData.notes || `فاتورة واتساب من ${log.senderName || log.sender}`
              };
              await helpers.handleSaveInvoice(inv);
              setRecentNotification(`⚡ تم تلقائياً إصدار فاتورة مبيعات واتساب بقيمة ${grandTotal.toFixed(2)} ر.س`);
            }

            // Mark this message as successfully synchronized on the server
            await fetch('/api/whatsapp/mark-synced', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: log.id })
            });
          }
        }
      } catch (err) {
        console.error('Error background-syncing WhatsApp log:', err);
      }
    }, 4500);

    return () => clearInterval(pollInterval);
  }, [user]);

  if (loading) return <LoadingView />;
  if (!user) return <LoginView />;

  return (
    <IPhoneFrame
      enabled={deviceFrameMode !== 'desktop'}
      theme={data.settings.theme}
      deviceFrameMode={deviceFrameMode === 'desktop' ? 'iphone' : deviceFrameMode}
      onChangeDeviceMode={(mode) => setDeviceFrameMode(mode)}
      onToggleFrame={() => setDeviceFrameMode(prev => prev === 'desktop' ? 'iphone' : 'desktop')}
      actionButtonToast={(msg) => {
        setRecentNotification(msg);
        setAddTxModalType('expense');
        setAddTxModalScope('business');
        setIsAddTxModalOpen(true);
      }}
    >
      {/* Content wrapper with blur effect when locked */}
      <div className={`flex-1 flex flex-col transition-all duration-700 ${
        isAppLocked && data.settings.enableSecurityLock ? 'blur-xl grayscale-[0.5] scale-[0.98]' : ''
      }`}>
        {/* Dynamic Island Top Shell Bar */}
        <DynamicIsland
        settings={data.settings}
        netBalance={netBalance}
        monthlyIncome={monthlyIncome}
        monthlyExpense={monthlyExpense}
        recentNotification={recentNotification}
        onOpenAiAdvisor={() => setIsAiAdvisorOpen(true)}
      />

      {/* Header Bar */}
      <HeaderBar
        settings={data.settings}
        hideValues={hideValues}
        onToggleHideValues={() => setHideValues(!hideValues)}
        onOpenAiAdvisor={() => setIsAiAdvisorOpen(true)}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
        onOpenIosInstall={(tab) => {
          setInstallModalTab(tab || 'apk');
          setIsIosInstallOpen(true);
        }}
        deviceFrameMode={deviceFrameMode}
        onSetDeviceFrameMode={setDeviceFrameMode}
      />

      {/* Main View router */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {activeTab === 'dashboard' && (
          <DashboardView
            settings={data.settings}
            hideValues={hideValues}
            transactions={data.transactions}
            accounts={data.accounts}
            contracts={data.contracts || []}
            categories={data.categories}
            debts={data.debts || []}
            onOpenAddModal={(type) => {
              if (!hasPermission('manage_transactions')) {
                setRecentNotification('عذراً، لا تمتلك صلاحية لتسجيل السندات والمصاريف');
                return;
              }
              setAddTxModalType(type || 'expense');
              setAddTxModalScope('business');
              setIsAddTxModalOpen(true);
            }}
            onOpenInvoiceModal={() => {
              if (!hasPermission('add_invoice')) {
                setRecentNotification('عذراً، لا تمتلك صلاحية لإصدار فواتير مبيعات جديدة');
                return;
              }
              setInvoiceInitialType('simplified');
              setInvoiceInitialPhase('phase2');
              setSelectedInvoice(null);
              setIsInvoiceEditing(false);
              setIsInvoiceModalOpen(true);
            }}
            onOpenPersonalDebts={() => setIsPersonalDebtsOpen(true)}
            onOpenPersonalExpenses={() => setIsPersonalExpensesOpen(true)}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenAiAdvisor={() => setIsAiAdvisorOpen(true)}
            onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
          />
        )}

        {activeTab === 'transactions' && (
          hasPermission('manage_transactions') ? (
            <TransactionsView
              settings={data.settings}
              hideValues={hideValues}
              transactions={data.transactions}
              categories={data.categories}
              accounts={data.accounts}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenAddModal={(type) => {
                setAddTxModalType(type || 'expense');
                setAddTxModalScope('business');
                setIsAddTxModalOpen(true);
              }}
            />
          ) : renderLockedScreen('قسم المعاملات والسندات', 'يرجى مراجعة إدارة المنشأة للحصول على صلاحية تسجيل السندات والمصاريف.')
        )}

        {activeTab === 'accounts' && (
          hasPermission('manage_accounts') ? (
            <AccountsView
              settings={data.settings}
              hideValues={hideValues}
              accounts={data.accounts}
              onAddAccount={handleAddAccount}
              onUpdateAccountBalance={handleUpdateAccountBalance}
              onOpenTransferModal={() => {
                setAddTxModalType('transfer');
                setAddTxModalScope('business');
                setIsAddTxModalOpen(true);
              }}
            />
          ) : renderLockedScreen('قسم الحسابات والخزائن المالية', 'يرجى مراجعة إدارة المنشأة للحصول على صلاحية إدارة الحسابات وتحديث الأرصدة.')
        )}

        {activeTab === 'customers' && (
          hasPermission('manage_customers') ? (
            <CustomersView
              customers={data.customers || []}
              onOpenCreateCustomerModal={() => {
                setSelectedCustomer(null);
                setIsCustomerModalOpen(true);
              }}
              onEditCustomer={(c) => {
                setSelectedCustomer(c);
                setIsCustomerModalOpen(true);
              }}
              onDeleteCustomer={handleDeleteCustomer}
            />
          ) : renderLockedScreen('إدارة العملاء والشركات', 'يرجى مراجعة إدارة المنشأة للحصول على صلاحية إضافة وتعديل بيانات العملاء والأرقام الضريبية.')
        )}

        {activeTab === 'invoices' && (
          (hasPermission('add_invoice') || hasPermission('edit_delete_invoice')) ? (
            <InvoicesView
              settings={data.settings}
              hideValues={hideValues}
              invoices={data.invoices}
              onOpenCreateInvoiceModal={(phase = 'phase2', type = 'simplified') => {
                if (!hasPermission('add_invoice')) {
                  setRecentNotification('عذراً، لا تمتلك صلاحية لإصدار فواتير جديدة');
                  return;
                }
                setInvoiceInitialPhase(phase);
                setInvoiceInitialType(type);
                setSelectedInvoice(null);
                setIsInvoiceEditing(false);
                setIsInvoiceModalOpen(true);
              }}
              onSelectInvoiceToView={(inv) => {
                setSelectedInvoice(inv);
                setIsInvoiceEditing(false);
                setIsInvoiceModalOpen(true);
              }}
              onEditInvoice={(inv) => {
                if (!hasPermission('edit_delete_invoice')) {
                  setRecentNotification('عذراً، لا تمتلك صلاحية لتعديل الفواتير');
                  return;
                }
                setSelectedInvoice(inv);
                setIsInvoiceEditing(true);
                setIsInvoiceModalOpen(true);
              }}
              onDeleteInvoice={(invId) => {
                if (!hasPermission('edit_delete_invoice')) {
                  setRecentNotification('عذراً، لا تمتلك صلاحية لحذف الفواتير');
                  return;
                }
                handleDeleteInvoice(invId);
              }}
              onDeleteAllInvoices={async () => {
                if (!hasPermission('edit_delete_invoice')) {
                  setRecentNotification('عذراً، لا تمتلك صلاحية لحذف الفواتير');
                  return;
                }
                const ids = data.invoices.map(i => i.id);
                await deleteBulkData('invoices', ids);
                setRecentNotification('تم حذف جميع الفواتير بنجاح');
              }}
              onBulkAddInvoices={handleBulkAddInvoices}
            />
          ) : renderLockedScreen('قسم الفواتير والمبيعات', 'يرجى مراجعة إدارة المنشأة للحصول على صلاحية إصدار أو تعديل الفواتير الضريبية.')
        )}

        {activeTab === 'reports' && (
          hasPermission('view_reports') ? (
            <ReportsView
              settings={data.settings}
              hideValues={hideValues}
              transactions={data.transactions}
              categories={data.categories}
              accounts={data.accounts}
              assets={data.assets || []}
              onExportBackup={() => exportBackupJSON(data)}
              onUpdateCategory={handleUpdateCategory}
            />
          ) : renderLockedScreen('التقارير والتحليلات المالية', 'التقارير والرسوم البيانية للمبيعات والأرباح متاحة للمدراء والموظفين المصرح لهم فقط.')
        )}

        {activeTab === 'assets' && (
          <FixedAssetsView
            assets={data.assets || []}
            settings={data.settings}
            hideValues={hideValues}
            onAddAsset={handleAddAsset}
            onUpdateAsset={handleUpdateAsset}
            onDeleteAsset={handleDeleteAsset}
          />
        )}

        {activeTab === 'contracts' && (
          hasPermission('manage_contracts') ? (
            <ContractsView
              settings={data.settings}
              contracts={data.contracts || []}
              onAddContract={handleAddContract}
              onUpdateContract={handleUpdateContract}
              onDeleteContract={handleDeleteContract}
            />
          ) : renderLockedScreen('عقود الإيجار والخدمات والاشتراكات', 'يرجى مراجعة إدارة المنشأة للحصول على صلاحية إدارة ومتابعة العقود والاشتراكات.')
        )}

        {activeTab === 'products' && (
          hasPermission('manage_products') ? (
            <ProductsView
              settings={data.settings}
              products={data.products || []}
              onOpenCreateProductModal={() => {
                setSelectedProduct(null);
                setIsProductModalOpen(true);
              }}
              onEditProduct={(p) => {
                setSelectedProduct(p);
                setIsProductModalOpen(true);
              }}
              onDeleteProduct={handleDeleteProduct}
            />
          ) : renderLockedScreen('قسم الأصناف والمنتجات والأسعار', 'يرجى مراجعة إدارة المنشأة للحصول على صلاحية تعديل وإضافة المنتجات وإدارتها.')
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={data.settings}
            onUpdateSettings={handleUpdateSettings}
            onExportBackup={() => exportBackupJSON(data)}
            onUpdateCategory={handleUpdateCategory}
            onResetData={handleResetData}
            onResetToZero={handleResetToZero}
            exportDataToDrive={handleExportToDrive}
            isGoogleDriveEnabled={true}
            isAdmin={user.role === 'admin'}
            onLogout={logout}
            units={(data.units || []).map(u => u.name)}
            onAddUnit={async (name) => {
              const current = data.units || [];
              if (!current.find(u => u.name === name)) {
                await addData('units' as any, { id: name, name });
              }
            }}
            onDeleteUnit={async (name) => {
              const unit = (data.units || []).find(u => u.name === name);
              if (unit) {
                await deleteData('units' as any, unit.id);
              }
            }}
            invoices={data.invoices || []}
            products={data.products || []}
            customers={data.customers || []}
            transactions={data.transactions || []}
            accounts={data.accounts || []}
            categories={data.categories || []}
          />
        )}
      </main>

        {/* iOS Floating Bottom Navigation */}
        <Navigation
          activeTab={activeTab === 'settings' ? 'dashboard' : activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          invoicesCount={(data.invoices || []).length}
          customersCount={(data.customers || []).length}
          productsCount={(data.products || []).length}
          contractsCount={(data.contracts || []).length}
          assetsCount={(data.assets || []).length}
          onQuickAdd={(type) => {
            if (type === 'invoice') {
              if (!hasPermission('add_invoice')) {
                setRecentNotification('عذراً، لا تمتلك صلاحية لإصدار فواتير جديدة');
                return;
              }
              setInvoiceInitialType('simplified');
              setInvoiceInitialPhase('phase2');
              setSelectedInvoice(null);
              setIsInvoiceEditing(false);
              setIsInvoiceModalOpen(true);
            } else if (type === 'customer') {
              if (!hasPermission('manage_customers')) {
                setRecentNotification('عذراً، لا تمتلك صلاحية لإدارة العملاء');
                return;
              }
              setSelectedCustomer(null);
              setIsCustomerModalOpen(true);
            } else if (type === 'product') {
              setSelectedProduct(null);
              setIsProductModalOpen(true);
            } else if (type === 'contract') {
              setActiveTab('contracts');
            } else if (type === 'asset') {
              setActiveTab('assets');
            } else {
              if (!hasPermission('manage_transactions')) {
                setRecentNotification('عذراً، لا تمتلك صلاحية لتسجيل السندات والمصاريف');
                return;
              }
              setAddTxModalType(type === 'expense' ? 'expense' : 'expense');
              setAddTxModalScope('business');
              setIsAddTxModalOpen(true);
            }
          }}
          isAdmin={hasPermission('view_reports')}
        />
      </div>

      <SecurityLock
        isEnabled={data.settings.enableSecurityLock && isAppLocked}
        savedPin={data.settings.securityPin}
        onUnlock={() => setIsAppLocked(false)}
        onSetPin={(pin) => handleUpdateSettings({ securityPin: pin, enableSecurityLock: true })}
      />

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddTxModalOpen}
        initialType={addTxModalType}
        initialScope={addTxModalScope}
        categories={data.categories}
        accounts={data.accounts}
        settings={data.settings}
        onClose={() => setIsAddTxModalOpen(false)}
        onSave={handleSaveTransaction}
      />

      <PersonalDebtsModal
        isOpen={isPersonalDebtsOpen}
        debts={data.debts || []}
        settings={data.settings}
        accounts={data.accounts}
        onClose={() => setIsPersonalDebtsOpen(false)}
        onAddDebt={handleAddDebt}
        onSettleDebt={handleSettleDebt}
        onDeleteDebt={handleDeleteDebt}
        onUpdatePersonPhone={handleUpdatePersonPhone}
        onVoiceData={handleVoiceData}
      />

      <PersonalExpensesModal
        isOpen={isPersonalExpensesOpen}
        transactions={data.transactions}
        categories={data.categories}
        accounts={data.accounts}
        settings={data.settings}
        onClose={() => setIsPersonalExpensesOpen(false)}
        onOpenAddPersonalExpense={() => {
          setAddTxModalType('expense');
          setAddTxModalScope('personal');
          setIsAddTxModalOpen(true);
        }}
        onDeleteTransaction={handleDeleteTransaction}
        onVoiceData={handleVoiceData}
      />

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        selectedInvoice={selectedInvoice}
        existingInvoices={data.invoices}
        isEditing={isInvoiceEditing}
        initialPhase={invoiceInitialPhase}
        initialType={invoiceInitialType}
        settings={data.settings}
        products={data.products || []}
        customers={data.customers || []}
        units={(data.units || []).map(u => u.name)}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedInvoice(null);
          setIsInvoiceEditing(false);
        }}
        onSaveInvoice={handleSaveInvoice}
        onGenerateReceipt={(inv) => {
          setInvoiceForReceipt(inv);
          setIsReceiptModalOpen(true);
        }}
      />

      <ReceiptVoucherModal
        isOpen={isReceiptModalOpen}
        invoice={invoiceForReceipt}
        settings={data.settings}
        onClose={() => setIsReceiptModalOpen(false)}
        onSave={handleSaveReceiptVoucher}
      />

      <CustomerModal
        isOpen={isCustomerModalOpen}
        customer={selectedCustomer}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setSelectedCustomer(null);
        }}
        onSave={handleSaveCustomer}
      />

      <AiAdvisorModal
        isOpen={isAiAdvisorOpen}
        settings={data.settings}
        transactions={data.transactions}
        categories={data.categories}
        accounts={data.accounts}
        onClose={() => setIsAiAdvisorOpen(false)}
      />

      <ProductModal
        isOpen={isProductModalOpen}
        product={selectedProduct}
        units={(data.units || []).map(u => u.name)}
        onClose={() => {
          setIsProductModalOpen(false);
          setSelectedProduct(null);
        }}
        onSave={handleSaveProduct}
      />

      <VoiceAssistantModal
        isOpen={isVoiceAssistantOpen}
        onClose={() => setIsVoiceAssistantOpen(false)}
        categories={data.categories}
        accounts={data.accounts}
        products={data.products || []}
        customers={data.customers || []}
        settings={data.settings}
        onSaveTransaction={handleSaveTransaction}
        onSaveDebt={handleAddDebt}
        onSaveInvoice={handleSaveInvoice}
      />

      <IosInstallModal
        isOpen={isIosInstallOpen}
        initialTab={installModalTab}
        onClose={() => setIsIosInstallOpen(false)}
      />
    </IPhoneFrame>
  );
}
