import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  HandCoins,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Calendar,
  User,
  Trash2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  FileUp,
  FileSpreadsheet,
  FileDown,
  Loader2,
  Edit2,
  Check,
  MinusCircle,
  Users,
  FileText,
  Coins,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowLeft,
  Share2,
  MessageSquare,
  PieChart as PieChartIcon,
  BarChart3,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Mic,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { Debt, DebtType, AppSettings, Account } from '../types';
import { formatCurrency, formatDate, generateId } from '../utils/formatters';
import { exportToExcel } from '../utils/exportToExcel';
import { exportElementToPdf } from '../utils/exportToPdf';
import { VoiceRecorder } from './VoiceRecorder';

const CURRENCY_OPTIONS = ['ر.س', '$', 'AED', 'KWD', 'EUR', 'EGP', 'SAR', 'QAR', 'JOD'];

interface PersonProfile {
  name: string;
  phone?: string;
  debts: Debt[];
  sarOwedToMe: number;
  sarIOwe: number;
  usdOwedToMe: number;
  usdIOwe: number;
  otherOwedToMe: number;
  otherIOwe: number;
}

interface PersonalDebtsModalProps {
  isOpen: boolean;
  debts: Debt[];
  settings: AppSettings;
  accounts: Account[];
  onClose: () => void;
  onAddDebt: (debt: Debt) => void;
  onSettleDebt: (debtId: string, paidAmountAdd: number, accountId?: string) => void;
  onDeleteDebt: (debtId: string) => void;
  onUpdatePersonPhone?: (personName: string, newPhone: string) => void;
  onVoiceData: (type: 'expense' | 'debt', data: any) => void;
}

export const PersonalDebtsModal: React.FC<PersonalDebtsModalProps> = ({
  isOpen,
  debts,
  settings,
  accounts,
  onClose,
  onAddDebt,
  onSettleDebt,
  onDeleteDebt,
  onUpdatePersonPhone,
  onVoiceData,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'i_owe' | 'owed_to_me' | 'settled'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Currency & Person View Mode States
  const [viewMode, setViewMode] = useState<'items' | 'persons'>('items');
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid'>('grid');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'SAR' | 'USD' | 'OTHER'>('all');
  const [debtStatusFilter, setDebtStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [selectedPersonProfile, setSelectedPersonProfile] = useState<string | null>(null);
  const [personSearch, setPersonSearch] = useState('');
  const [showCharts, setShowCharts] = useState(true);
  const [showVoiceInput, setShowVoiceInput] = useState(false);

  // Phone linking state
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhoneInput, setNewPhoneInput] = useState('');

  // Recharts Analytics
  const chartAnalytics = useMemo(() => {
    let owedToMeRemaining = 0;
    let iOweRemaining = 0;
    let totalPaidAmount = 0;
    let totalPendingRemaining = 0;

    let owedToMeCount = 0;
    let iOweCount = 0;
    let paidCount = 0;
    let pendingCount = 0;

    const currencyMap: Record<string, { currency: string; owedToMe: number; iOwe: number }> = {};

    debts.forEach((d) => {
      const remaining = Math.max(0, d.amount - (d.paidAmount || 0));
      const paid = Math.min(d.amount, d.paidAmount || 0);
      totalPaidAmount += paid;

      const curr = d.currency || 'ر.س';
      if (!currencyMap[curr]) {
        currencyMap[curr] = { currency: curr, owedToMe: 0, iOwe: 0 };
      }

      if (d.type === 'owed_to_me') {
        owedToMeRemaining += remaining;
        owedToMeCount++;
        currencyMap[curr].owedToMe += remaining;
      } else {
        iOweRemaining += remaining;
        iOweCount++;
        currencyMap[curr].iOwe += remaining;
      }

      if (d.status === 'paid' || remaining === 0) {
        paidCount++;
      } else {
        pendingCount++;
        totalPendingRemaining += remaining;
      }
    });

    const typeData = [
      { name: 'مستحقات لي (سلف)', value: owedToMeRemaining, count: owedToMeCount, color: '#10b981' },
      { name: 'ديون علي (التزامات)', value: iOweRemaining, count: iOweCount, color: '#f43f5e' },
    ];

    const statusData = [
      { name: 'قيد السداد (متبقي)', value: totalPendingRemaining, count: pendingCount, color: '#f59e0b' },
      { name: 'مسدد بالكامل', value: totalPaidAmount, count: paidCount, color: '#3b82f6' },
    ];

    const currencyData = Object.values(currencyMap);

    return {
      typeData,
      statusData,
      currencyData,
      totalPaidAmount,
      totalPendingRemaining,
      owedToMeRemaining,
      iOweRemaining,
    };
  }, [debts]);

  // Settlement / Deduction State
  const [settlingDebtId, setSettlingDebtId] = useState<string | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');

  // Delete Confirmation Modal State
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);

  // Form State
  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [debtCurrency, setDebtCurrency] = useState<string>(settings.currencySymbol || 'ر.س');
  const [debtType, setDebtType] = useState<DebtType>('owed_to_me'); // default: مستحق لي (سلفة)
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // AI Document Analysis & Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [analyzedDebtsPreview, setAnalyzedDebtsPreview] = useState<Debt[] | null>(null);
  const [editingPreviewIndex, setEditingPreviewIndex] = useState<number | null>(null);

  // Helper Currency Matchers
  const isUSD = (curr?: string) => curr === '$' || curr === 'USD' || curr?.toLowerCase().includes('دولار');
  const isSAR = (curr?: string) => !curr || curr === 'ر.س' || curr === 'SAR' || curr?.includes('ريال');

  // Auto detect currency from typed notes or comments
  const handleNotesChange = (val: string) => {
    setNotes(val);
    const lower = val.toLowerCase();
    if (lower.includes('دولار') || lower.includes('$') || lower.includes('usd')) {
      setDebtCurrency('$');
    } else if (lower.includes('ريال') || lower.includes('ر.س') || lower.includes('sar')) {
      setDebtCurrency('ر.س');
    }
  };

  // Handle PDF/Image File Upload and AI Analysis
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingDoc(true);
    setDocUploadError(null);
    setAnalyzedDebtsPreview(null);
    setEditingPreviewIndex(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;

        const response = await fetch('/api/analyze-debt-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64Data,
            mimeType: file.type || 'image/png',
          }),
        });

        const data = await response.json();
        if (data.success && Array.isArray(data.debts) && data.debts.length > 0) {
          const parsedList: Debt[] = data.debts.map((item: any) => ({
            id: generateId('debt'),
            personName: item.personName || 'اسم غير معروف',
            amount: typeof item.amount === 'number' ? item.amount : parseFloat(item.amount) || 0,
            paidAmount: 0,
            currency: item.currency || settings.currencySymbol || 'ر.س',
            type: item.type === 'i_owe' ? 'i_owe' : 'owed_to_me',
            startDate: new Date().toISOString().slice(0, 10),
            dueDate: item.dueDate || undefined,
            phone: item.phone || undefined,
            notes: item.notes || `مستخرج من ملف (${file.name})`,
            status: 'pending',
          }));
          setAnalyzedDebtsPreview(parsedList);
        } else {
          setDocUploadError(data.error || 'لم يتعرف الذكاء الاصطناعي على قائمة ديون في هذا الملف.');
        }
        setIsAnalyzingDoc(false);
      };

      reader.onerror = () => {
        setDocUploadError('فشلت قراءة الملف من الجهاز.');
        setIsAnalyzingDoc(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('File upload analysis error:', err);
      setDocUploadError('حدث خطأ أثناء الاتصال بالخادم لتحليل ملف الديون.');
      setIsAnalyzingDoc(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdatePreviewItem = (index: number, updatedFields: Partial<Debt>) => {
    if (!analyzedDebtsPreview) return;
    const updated = [...analyzedDebtsPreview];
    updated[index] = { ...updated[index], ...updatedFields };
    setAnalyzedDebtsPreview(updated);
  };

  const handleDeletePreviewItem = (index: number) => {
    if (!analyzedDebtsPreview) return;
    const updated = analyzedDebtsPreview.filter((_, i) => i !== index);
    setAnalyzedDebtsPreview(updated.length > 0 ? updated : null);
    if (editingPreviewIndex === index) setEditingPreviewIndex(null);
  };

  const handleAddPreviewItem = () => {
    const newItem: Debt = {
      id: generateId('debt'),
      personName: 'شخص جديد',
      amount: 100,
      paidAmount: 0,
      currency: settings.currencySymbol || 'ر.س',
      type: 'owed_to_me',
      startDate: new Date().toISOString().slice(0, 10),
      status: 'pending',
      notes: 'إضافة يدوية في المعاينة',
    };
    const updated = analyzedDebtsPreview ? [...analyzedDebtsPreview, newItem] : [newItem];
    setAnalyzedDebtsPreview(updated);
    setEditingPreviewIndex(updated.length - 1);
  };

  const handleConfirmImportAnalyzedDebts = () => {
    if (!analyzedDebtsPreview || analyzedDebtsPreview.length === 0) return;
    analyzedDebtsPreview.forEach((debt) => {
      onAddDebt(debt);
    });
    const count = analyzedDebtsPreview.length;
    setAnalyzedDebtsPreview(null);
    setEditingPreviewIndex(null);
    alert(`تمت إضافة ${count} بنود ديون بنجاح إلى القائمة الشخصية.`);
  };

  // Export & Print Handlers
  const handleExportExcel = () => {
    const headers = [
      'اسم الشخص / الجهة',
      'نوع الدين',
      'المبلغ الإجمالي',
      'العملة',
      'المبلغ المسدد',
      'المبلغ المتبقي',
      'رقم الهاتف',
      'تاريخ الاستحقاق',
      'حالة الدين',
      'ملاحظات',
    ];

    const rows = debts.map((d) => [
      d.personName,
      d.type === 'owed_to_me' ? 'مستحق لي (سلفة)' : 'دين علي (التزام)',
      d.amount,
      d.currency || settings.currencySymbol || 'ر.س',
      d.paidAmount,
      d.amount - d.paidAmount,
      d.phone || '-',
      d.dueDate ? formatDate(d.dueDate, settings.language) : '-',
      d.status === 'paid' ? 'تم السداد بالكامل' : d.paidAmount > 0 ? 'مسدد جزئياً' : 'معلق',
      d.notes || '-',
    ]);

    exportToExcel(`سجل_الديون_الشخصية_${new Date().toISOString().slice(0, 10)}.xlsx`, headers, rows);
  };

  const handleExportPdf = () => {
    exportElementToPdf('personal-debts-printable-container', `الديون_والسلف_الشخصية_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Multi-Currency Overall Totals
  const sarOwedToMe = debts
    .filter((d) => d.type === 'owed_to_me' && d.status !== 'paid' && isSAR(d.currency))
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

  const sarIOwe = debts
    .filter((d) => d.type === 'i_owe' && d.status !== 'paid' && isSAR(d.currency))
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

  const usdOwedToMe = debts
    .filter((d) => d.type === 'owed_to_me' && d.status !== 'paid' && isUSD(d.currency))
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

  const usdIOwe = debts
    .filter((d) => d.type === 'i_owe' && d.status !== 'paid' && isUSD(d.currency))
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

  const otherOwedToMe = debts
    .filter((d) => d.type === 'owed_to_me' && d.status !== 'paid' && !isSAR(d.currency) && !isUSD(d.currency))
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

  const otherIOwe = debts
    .filter((d) => d.type === 'i_owe' && d.status !== 'paid' && !isSAR(d.currency) && !isUSD(d.currency))
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

  // Group debts by person name (Person Profile Analysis)
  const personsMap = useMemo(() => {
    const map: Record<string, PersonProfile> = {};

    debts.forEach((d) => {
      const key = d.personName.trim().toLowerCase();
      if (!map[key]) {
        map[key] = {
          name: d.personName.trim(),
          phone: d.phone,
          debts: [],
          sarOwedToMe: 0,
          sarIOwe: 0,
          usdOwedToMe: 0,
          usdIOwe: 0,
          otherOwedToMe: 0,
          otherIOwe: 0,
        };
      }
      if (d.phone && !map[key].phone) {
        map[key].phone = d.phone;
      }
      map[key].debts.push(d);

      if (d.status !== 'paid') {
        const remaining = d.amount - d.paidAmount;
        if (isUSD(d.currency)) {
          if (d.type === 'owed_to_me') map[key].usdOwedToMe += remaining;
          else map[key].usdIOwe += remaining;
        } else if (isSAR(d.currency)) {
          if (d.type === 'owed_to_me') map[key].sarOwedToMe += remaining;
          else map[key].sarIOwe += remaining;
        } else {
          if (d.type === 'owed_to_me') map[key].otherOwedToMe += remaining;
          else map[key].otherIOwe += remaining;
        }
      }
    });

    return map;
  }, [debts]);

  const personProfilesList = useMemo(() => {
    return Object.values(personsMap).filter((p: PersonProfile) => {
      // Name & Phone Search Filter
      if (personSearch.trim()) {
        const q = personSearch.trim().toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchPhone = p.phone?.includes(q);
        if (!matchName && !matchPhone) return false;
      }

      // Debt Status Filter
      if (debtStatusFilter === 'pending') {
        const hasPending = p.debts.some((d) => d.status !== 'paid' && d.amount - d.paidAmount > 0);
        if (!hasPending) return false;
      } else if (debtStatusFilter === 'paid') {
        const hasPaid = p.debts.some((d) => d.status === 'paid' || d.amount - d.paidAmount <= 0);
        if (!hasPaid) return false;
      }

      return true;
    });
  }, [personsMap, personSearch, debtStatusFilter]);

  const selectedPersonData = selectedPersonProfile
    ? personsMap[selectedPersonProfile.trim().toLowerCase()] || null
    : null;

  // Filtered Debts List
  const filteredDebts = debts.filter((d) => {
    // Person Name, Phone, and Notes Search
    if (personSearch.trim()) {
      const q = personSearch.trim().toLowerCase();
      const matchName = d.personName.toLowerCase().includes(q);
      const matchPhone = d.phone?.includes(q);
      const matchNotes = d.notes?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchNotes) return false;
    }

    // Debt Status Filter (مسدد / قيد السداد)
    const isSettled = d.status === 'paid' || d.amount - d.paidAmount <= 0;
    if (debtStatusFilter === 'pending' && isSettled) return false;
    if (debtStatusFilter === 'paid' && !isSettled) return false;

    // Tab Filter
    if (activeTab === 'i_owe' && d.type !== 'i_owe') return false;
    if (activeTab === 'owed_to_me' && d.type !== 'owed_to_me') return false;
    if (activeTab === 'settled' && !isSettled) return false;

    // Currency Filter
    if (currencyFilter === 'SAR' && !isSAR(d.currency)) return false;
    if (currencyFilter === 'USD' && !isUSD(d.currency)) return false;
    if (currencyFilter === 'OTHER' && (isSAR(d.currency) || isUSD(d.currency))) return false;

    return true;
  });

  // WhatsApp Sharing Handlers
  const handleDirectWhatsAppChat = (phone?: string, name?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`مرحباً ${name || ''}، أتواصل معك بخصوص السلف والديون المسجلة لدينا...`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleShareWhatsApp = (person: PersonProfile) => {
    const activeDebtsList = person.debts.filter((d) => d.status !== 'paid' && d.amount - d.paidAmount > 0);

    let message = `*كشف حساب الديون والسلف - ${person.name}*\n\n`;

    if (person.sarOwedToMe > 0 || person.sarIOwe > 0) {
      message += `*الريال السعودي (ر.س):*\n`;
      if (person.sarOwedToMe > 0) message += `• مستحقات لك (سلفة): ${person.sarOwedToMe.toLocaleString()} ر.س\n`;
      if (person.sarIOwe > 0) message += `• ديون عليك: ${person.sarIOwe.toLocaleString()} ر.س\n`;
      message += `\n`;
    }

    if (person.usdOwedToMe > 0 || person.usdIOwe > 0) {
      message += `*الدولار الأمريكي ($):*\n`;
      if (person.usdOwedToMe > 0) message += `• مستحقات لك (سلفة): $${person.usdOwedToMe.toLocaleString()}\n`;
      if (person.usdIOwe > 0) message += `• ديون عليك: $${person.usdIOwe.toLocaleString()}\n`;
      message += `\n`;
    }

    if (person.otherOwedToMe > 0 || person.otherIOwe > 0) {
      message += `*عملات أخرى:*\n`;
      if (person.otherOwedToMe > 0) message += `• مستحقات لك: ${person.otherOwedToMe.toLocaleString()}\n`;
      if (person.otherIOwe > 0) message += `• ديون عليك: ${person.otherIOwe.toLocaleString()}\n`;
      message += `\n`;
    }

    if (activeDebtsList.length > 0) {
      message += `*تفاصيل البنود القائمة:*\n`;
      activeDebtsList.forEach((d, idx) => {
        const remaining = d.amount - d.paidAmount;
        const cur = d.currency || 'ر.س';
        const typeLabel = d.type === 'owed_to_me' ? 'مستحق لك (سلفة)' : 'دين عليك';
        message += `${idx + 1}. ${typeLabel}: المتبقي *${remaining.toLocaleString()} ${cur}*${
          d.notes ? ` (${d.notes})` : ''
        }\n`;
      });
    } else {
      message += `جميع الحسابات والبنود مسددة بالكامل ✔️\n`;
    }

    message += `\nتم إرسال الكشف المالي تلقائياً.`;

    const cleanPhone = person.phone ? person.phone.replace(/[^0-9]/g, '') : '';
    const encodedMsg = encodeURIComponent(message);

    const whatsappUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
      : `https://api.whatsapp.com/send?text=${encodedMsg}`;

    window.open(whatsappUrl, '_blank');
  };

  const handleShareSingleDebtWhatsApp = (personName: string, phone: string | undefined, debt: Debt) => {
    const remaining = debt.amount - debt.paidAmount;
    const cur = debt.currency || 'ر.س';
    const typeText = debt.type === 'owed_to_me' ? 'مستحق لك (سلفة)' : 'دين عليك';

    const msg = `مرحباً ${personName}،\nتذكير بشأن ${typeText}:\nالمبلغ المتبقي: *${remaining.toLocaleString()} ${cur}* (من أصل ${debt.amount.toLocaleString()} ${cur})${
      debt.notes ? `\nالملاحظة: ${debt.notes}` : ''
    }\nتاريخ الدين: ${debt.startDate}`;

    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    const encodedMsg = encodeURIComponent(msg);
    const whatsappUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
      : `https://api.whatsapp.com/send?text=${encodedMsg}`;

    window.open(whatsappUrl, '_blank');
  };

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!personName.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('يرجى إدخال اسم الشخص ومبلغ صحيح.');
      return;
    }

    const newDebt: Debt = {
      id: generateId('debt'),
      personName: personName.trim(),
      phone: phone.trim() || undefined,
      amount: parsedAmount,
      paidAmount: 0,
      currency: debtCurrency || settings.currencySymbol || 'ر.س',
      type: debtType,
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: dueDate || undefined,
      status: 'pending',
      notes: notes.trim() || undefined,
    };

    onAddDebt(newDebt);
    setPersonName('');
    setPhone('');
    setAmount('');
    setNotes('');
    setDueDate('');
    setShowAddForm(false);
  };

  const handleSettleSubmit = (d: Debt) => {
    const payVal = parseFloat(paymentAmountInput);
    if (isNaN(payVal) || payVal <= 0) {
      alert('يرجى إدخال مبلغ خصم/سداد صحيح.');
      return;
    }
    const remaining = d.amount - d.paidAmount;
    if (payVal > remaining) {
      alert(`المبلغ المدخل أعلى من المتبقي وهو (${remaining} ${d.currency || settings.currencySymbol}).`);
      return;
    }

    onSettleDebt(d.id, payVal, selectedAccountId);
    setSettlingDebtId(null);
    setPaymentAmountInput('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md dir-rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-[32px] p-4 sm:p-5 shadow-2xl text-white max-h-[92vh] flex flex-col relative overflow-hidden"
        >
          {/* Delete Confirmation Modal Overlay */}
          {debtToDelete && (
            <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center animate-bounce">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-white">تأكيد حذف الدين النهائي</h3>
                <p className="text-xs text-gray-300 leading-relaxed max-w-xs mx-auto">
                  هل أنت متأكد من حذف قيد الدين الخاص بـ{' '}
                  <span className="font-extrabold text-amber-300">{debtToDelete.personName}</span> بمبلغ{' '}
                  <span className="font-extrabold font-mono text-emerald-400">
                    {debtToDelete.amount} {debtToDelete.currency || settings.currencySymbol}
                  </span>
                  ؟ لن يمكنك استرجاعه بعد الحذف.
                </p>
              </div>
              <div className="flex gap-2 w-full max-w-xs pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteDebt(debtToDelete.id);
                    setDebtToDelete(null);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 rounded-xl text-xs transition-all shadow-lg active:scale-95"
                >
                  تأكيد الحذف النهائي
                </button>
                <button
                  type="button"
                  onClick={() => setDebtToDelete(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-gray-300 font-bold px-4 py-3 rounded-xl text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <HandCoins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">إدارة الديون والشخصيات</h2>
                <p className="text-[10px] text-gray-400">متابعة السلف والديون والخصوم والعملات</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-slate-800 text-gray-400 hover:text-white p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content - Scrollable */}
          <div id="personal-debts-printable-container" className="flex-1 overflow-y-auto space-y-4 py-3 pr-0.5 scrollbar-thin">
            {/* Multi-Currency Summary Cards (Riyal vs Dollar vs Others) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-black text-amber-300 px-1">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-400" />
                  ملخص الديون والالتزامات حسب العملة
                </span>
                <span className="text-[10px] text-gray-400 font-normal">فرز الريال عن الدولار</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* SAR Summary Card */}
                <div className="bg-gradient-to-br from-emerald-950/70 via-slate-900 to-emerald-950/40 border border-emerald-500/40 rounded-2xl p-2.5 space-y-1.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-emerald-300 flex items-center gap-1">
                      🇸🇦 بالريال السعودي
                    </span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">
                      ر.س
                    </span>
                  </div>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-300 font-sans">مستحقات لي:</span>
                      <span className="font-extrabold text-emerald-400">{sarOwedToMe.toLocaleString()} ر.س</span>
                    </div>
                    <div className="flex items-center justify-between pt-0.5 border-t border-white/10">
                      <span className="text-[10px] text-gray-300 font-sans">ديون علي:</span>
                      <span className="font-extrabold text-rose-400">{sarIOwe.toLocaleString()} ر.س</span>
                    </div>
                  </div>
                </div>

                {/* USD Summary Card */}
                <div className="bg-gradient-to-br from-sky-950/70 via-slate-900 to-indigo-950/40 border border-sky-500/40 rounded-2xl p-2.5 space-y-1.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-sky-300 flex items-center gap-1">
                      🇺🇸 بالدولار الأمريكي
                    </span>
                    <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded font-mono font-bold">
                      USD / $
                    </span>
                  </div>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-300 font-sans">مستحقات لي:</span>
                      <span className="font-extrabold text-emerald-400">${usdOwedToMe.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between pt-0.5 border-t border-white/10">
                      <span className="text-[10px] text-gray-300 font-sans">ديون علي:</span>
                      <span className="font-extrabold text-rose-400">${usdIOwe.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Currencies Banner if any */}
              {(otherOwedToMe > 0 || otherIOwe > 0) && (
                <div className="bg-slate-950/80 border border-purple-500/30 rounded-xl p-2 flex items-center justify-between text-xs text-purple-200">
                  <span className="text-[10px] font-bold">🌐 عملات أخرى:</span>
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="text-emerald-400">لي: {otherOwedToMe.toLocaleString()}</span>
                    <span className="text-rose-400">علي: {otherIOwe.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Voice Input Callout */}
            <div className="bg-slate-950/60 border border-amber-500/30 rounded-2xl p-3 flex flex-col items-center gap-2.5">
              <div className="flex items-center gap-2 w-full">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[11px] font-bold text-amber-300">تسجيل دين/سلفة بالصوت</h3>
                  <p className="text-[9px] text-gray-400">تحدث: "سلفت محمد 1000 ريال للشغل"</p>
                </div>
                <button 
                  onClick={() => setShowVoiceInput(!showVoiceInput)}
                  className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20"
                >
                  {showVoiceInput ? 'إخفاء' : 'بدء التسجيل'}
                </button>
              </div>
              
              <AnimatePresence>
                {showVoiceInput && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden w-full"
                  >
                    <div className="pt-2 pb-1">
                      <VoiceRecorder onDataParsed={onVoiceData} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Toolbar: Document Upload & Excel/PDF Exports */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-2 rounded-2xl border border-white/10">
              {/* Upload Document Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzingDoc}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold py-2 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                {isAnalyzingDoc ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileUp className="w-3.5 h-3.5 text-purple-200" />
                )}
                <span>تحليل ملف ديون</span>
              </button>

              {/* Export to Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-extrabold py-2 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-950" />
                <span>تصدير Excel</span>
              </button>

              {/* Export to PDF */}
              <button
                type="button"
                onClick={handleExportPdf}
                className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold py-2 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>طباعة / PDF</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,application/pdf"
                className="hidden"
              />
            </div>

            {/* AI Document Analyzing Status / Error */}
            {isAnalyzingDoc && (
              <div className="bg-purple-950/60 border border-purple-500/40 rounded-2xl p-3 flex items-center gap-3 text-purple-200 text-xs animate-pulse">
                <Sparkles className="w-5 h-5 text-purple-400 shrink-0 animate-spin" />
                <div>
                  <p className="font-extrabold">جاري قراءة وتحليل المستند بالذكاء الاصطناعي...</p>
                  <p className="text-[10px] text-purple-300">يتم التعرف على الأسماء والمبالغ والعملات وتجهيزها للتعديل</p>
                </div>
              </div>
            )}

            {docUploadError && (
              <div className="bg-rose-950/60 border border-rose-500/40 rounded-2xl p-3 flex items-center justify-between text-rose-200 text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{docUploadError}</span>
                </div>
                <button onClick={() => setDocUploadError(null)} className="text-gray-400 hover:text-white text-[10px]">
                  إغلاق
                </button>
              </div>
            )}

            {/* Analyzed Debts Preview & Editable Box */}
            {analyzedDebtsPreview && (
              <div className="bg-gradient-to-br from-purple-950/90 via-slate-900 to-indigo-950/90 border border-purple-500/50 rounded-2xl p-3.5 space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-purple-500/30 pb-2">
                  <div className="flex items-center gap-2 text-xs font-black text-purple-300">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>نتيجة التحليل الذكي ({analyzedDebtsPreview.length} سجلات) - يمكنك التعديل والضبط</span>
                  </div>
                  <button
                    onClick={() => {
                      setAnalyzedDebtsPreview(null);
                      setEditingPreviewIndex(null);
                    }}
                    className="text-gray-400 hover:text-white text-[10px]"
                  >
                    إلغاء
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 text-xs scrollbar-thin pr-1">
                  {analyzedDebtsPreview.map((item, idx) => {
                    const isEditingThis = editingPreviewIndex === idx;

                    return (
                      <div
                        key={idx}
                        className="bg-slate-900/90 p-2.5 rounded-xl border border-white/10 space-y-2 shadow-sm"
                      >
                        {isEditingThis ? (
                          /* Editable Form Box */
                          <div className="space-y-2 bg-slate-950 p-2 rounded-xl border border-purple-500/40 text-xs">
                            <div className="flex items-center justify-between text-[11px] font-bold text-purple-300 border-b border-white/10 pb-1">
                              <span>تعديل سجل الدين #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => setEditingPreviewIndex(null)}
                                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>تم الضبط</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-gray-400 block mb-0.5">اسم الشخص/الجهة</label>
                                <input
                                  type="text"
                                  value={item.personName}
                                  onChange={(e) => handleUpdatePreviewItem(idx, { personName: e.target.value })}
                                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-gray-400 block mb-0.5">المبلغ</label>
                                <input
                                  type="number"
                                  value={item.amount}
                                  onChange={(e) =>
                                    handleUpdatePreviewItem(idx, {
                                      amount: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white font-mono"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-gray-400 block mb-0.5">نوع العملة</label>
                                <select
                                  value={item.currency || 'ر.س'}
                                  onChange={(e) => handleUpdatePreviewItem(idx, { currency: e.target.value })}
                                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-amber-300 font-bold"
                                >
                                  {CURRENCY_OPTIONS.map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] text-gray-400 block mb-0.5">نوع الدين</label>
                                <select
                                  value={item.type}
                                  onChange={(e) =>
                                    handleUpdatePreviewItem(idx, {
                                      type: e.target.value as DebtType,
                                    })
                                  }
                                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                                >
                                  <option value="owed_to_me">🟢 مستحق لي (سلفة)</option>
                                  <option value="i_owe">🔴 دين علي (التزام)</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-gray-400 block mb-0.5">رقم الهاتف</label>
                                <input
                                  type="text"
                                  value={item.phone || ''}
                                  onChange={(e) => handleUpdatePreviewItem(idx, { phone: e.target.value })}
                                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white font-mono"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-gray-400 block mb-0.5">ملاحظات</label>
                                <input
                                  type="text"
                                  value={item.notes || ''}
                                  onChange={(e) => handleUpdatePreviewItem(idx, { notes: e.target.value })}
                                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* View Item Box */
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-white">{item.personName}</span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded ${
                                    item.type === 'owed_to_me'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-rose-500/20 text-rose-400'
                                  }`}
                                >
                                  {item.type === 'owed_to_me' ? '🟢 مستحق لي' : '🔴 دين علي'}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400">
                                {item.notes} {item.phone ? `• ${item.phone}` : ''}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-black font-mono text-emerald-400 text-xs">
                                {item.amount} <span className="text-amber-300 font-bold">{item.currency || 'ر.س'}</span>
                              </span>

                              <button
                                type="button"
                                onClick={() => setEditingPreviewIndex(idx)}
                                className="text-gray-400 hover:text-purple-300 p-1 bg-slate-800 rounded-lg transition-colors"
                                title="تعديل البند"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeletePreviewItem(idx)}
                                className="text-gray-400 hover:text-rose-400 p-1 bg-slate-800 rounded-lg transition-colors"
                                title="حذف من المستند"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAddPreviewItem}
                    className="bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold py-1.5 px-3 rounded-xl text-[11px] flex items-center gap-1 border border-purple-500/30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة بند يدوياً</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmImportAnalyzedDebts}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-extrabold py-2 rounded-xl text-xs shadow-lg transition-all"
                  >
                    تأكيد واستيراد كافة الديون المحددة
                  </button>
                </div>
              </div>
            )}

            {/* Form Toggle Button */}
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-extrabold py-3 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-lg shadow-emerald-600/20 active:scale-98 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>تسجيل دين أو مستحق جديد</span>
              </button>
            )}

            {/* Add New Debt Form */}
            {showAddForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                onSubmit={handleCreateSubmit}
                className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-3.5 space-y-3 shadow-inner"
              >
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400 border-b border-white/10 pb-2">
                  <span>تسجيل قيد دين جديد</span>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-gray-400 hover:text-white text-[11px]"
                  >
                    إلغاء
                  </button>
                </div>

                {/* Debt Type Segmented Toggle */}
                <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl text-xs font-bold border border-white/5">
                  <button
                    type="button"
                    onClick={() => setDebtType('owed_to_me')}
                    className={`py-2 rounded-lg transition-all ${
                      debtType === 'owed_to_me'
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    🟢 مستحق لي (سلفة شخص)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebtType('i_owe')}
                    className={`py-2 rounded-lg transition-all ${
                      debtType === 'i_owe'
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    🔴 دين علي (التزام لشخص)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-300 font-bold block mb-1">اسم الشخص / الجهة *</label>
                    <input
                      type="text"
                      placeholder="مثال: أحمد السالم..."
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-300 font-bold block mb-1">المبلغ الإجمالي *</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono text-left dir-ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-300 font-bold block mb-1">نوع العملة</label>
                    <select
                      value={debtCurrency}
                      onChange={(e) => setDebtCurrency(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-emerald-500"
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-300 font-bold block mb-1">رقم الجوال (اختياري)</label>
                    <input
                      type="tel"
                      placeholder="05xxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono text-left dir-ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-300 font-bold block mb-1">تاريخ الاستحقاق</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-300 font-bold block mb-1">
                      ملاحظات أو سبب الدين (💡 يُكتشف العملة تلقائياً)
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: دين بالدولار لشراء بضاعة..."
                      value={notes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-xs transition-all shadow-md"
                >
                  حفظ الدين في السجل
                </button>
              </motion.form>
            )}

            {/* Interactive Charts Section (Recharts) */}
            <div className="bg-slate-950/90 border border-white/10 rounded-2xl p-3 space-y-3 shadow-lg no-print">
              <button
                type="button"
                onClick={() => setShowCharts(!showCharts)}
                className="w-full flex items-center justify-between text-xs font-black text-amber-300 hover:text-amber-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-amber-400" />
                  <span>الرسم البياني لتوزيع وحالة الديون</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-normal">
                    Recharts
                  </span>
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-400 font-normal">
                  {showCharts ? 'إخفاء الرسم البياني' : 'عرض الرسم البياني'}
                  {showCharts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>

              {showCharts && (
                <div className="space-y-4 pt-2 border-t border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Chart 1: Distribution by Debt Type */}
                    <div className="bg-slate-900/80 border border-white/5 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-200">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <BarChart3 className="w-3.5 h-3.5" />
                          توزيع نوع الدين (مستحقة لي / ديون علي)
                        </span>
                      </div>

                      {chartAnalytics.typeData.every((d) => d.value === 0) ? (
                        <div className="text-center py-6 text-gray-500 text-xs">لا توجد بيانات ديون مسجلة للعرض</div>
                      ) : (
                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                              <Pie
                                data={chartAnalytics.typeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {chartAnalytics.typeData.map((entry, index) => (
                                  <Cell key={`type-cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-slate-900 border border-white/20 p-2.5 rounded-xl shadow-xl text-xs text-white text-right font-sans">
                                        <p className="font-bold text-amber-300">{data.name}</p>
                                        <p className="text-emerald-400 font-mono font-bold mt-1">
                                          {Number(data.value).toLocaleString()}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">العدد: {data.count} قيد</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value) => (
                                  <span className="text-[10px] font-extrabold text-gray-300 px-1">{value}</span>
                                )}
                              />
                            </RePieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Chart 2: Distribution by Status */}
                    <div className="bg-slate-900/80 border border-white/5 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-200">
                        <span className="flex items-center gap-1.5 text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          حالة السداد (قيد السداد / مسدد بالكامل)
                        </span>
                      </div>

                      {chartAnalytics.statusData.every((d) => d.value === 0) ? (
                        <div className="text-center py-6 text-gray-500 text-xs">لا توجد بيانات ديون مسجلة للعرض</div>
                      ) : (
                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                              <Pie
                                data={chartAnalytics.statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {chartAnalytics.statusData.map((entry, index) => (
                                  <Cell key={`status-cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-slate-900 border border-white/20 p-2.5 rounded-xl shadow-xl text-xs text-white text-right font-sans">
                                        <p className="font-bold text-amber-300">{data.name}</p>
                                        <p className="text-emerald-400 font-mono font-bold mt-1">
                                          {Number(data.value).toLocaleString()}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">العدد: {data.count} قيد</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value) => (
                                  <span className="text-[10px] font-extrabold text-gray-300 px-1">{value}</span>
                                )}
                              />
                            </RePieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chart 3: Currency BarChart if multiple currencies exist */}
                  {chartAnalytics.currencyData.length > 0 && (
                    <div className="bg-slate-900/80 border border-white/5 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-200">
                        <span className="flex items-center gap-1.5 text-sky-400">
                          <Coins className="w-3.5 h-3.5" />
                          مقارنة الديون حسب العملة
                        </span>
                      </div>

                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartAnalytics.currencyData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                            <XAxis dataKey="currency" stroke="#94a3b8" fontSize={10} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-slate-900 border border-white/20 p-2.5 rounded-xl shadow-xl text-xs text-white text-right space-y-1 font-sans">
                                      <p className="font-bold text-sky-300 font-sans">العملة: {label}</p>
                                      {payload.map((entry: any, i: number) => (
                                        <p key={i} className="font-mono text-[11px]" style={{ color: entry.color }}>
                                          {entry.name}: {Number(entry.value).toLocaleString()}
                                        </p>
                                      ))}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="owedToMe" name="مستحقات لي" fill="#10b981" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="iOwe" name="ديون علي" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                            <Legend
                              verticalAlign="bottom"
                              height={30}
                              formatter={(value) => (
                                <span className="text-[10px] font-extrabold text-gray-300 px-1">{value}</span>
                              )}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Search and Filter Toolbar */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-white/10 space-y-2.5 shadow-md">
              {/* Search Bar (Name, Phone, Notes) */}
              <div className="relative">
                <Search className="w-4 h-4 text-amber-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث باسم الشخص، رقم الجوال، أو الملاحظات..."
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pr-9 pl-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                {personSearch && (
                  <button
                    type="button"
                    onClick={() => setPersonSearch('')}
                    className="absolute left-2.5 top-2.5 text-gray-400 hover:text-white transition-colors"
                    title="مسح البحث"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status & Currency Filter Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-bold">
                {/* Debt Status Filter */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/5">
                  <span className="text-gray-400 px-1 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    حالة الدين:
                  </span>
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'pending', label: '⏳ قيد السداد' },
                    { id: 'paid', label: '✅ مسدد بالكامل' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setDebtStatusFilter(st.id as any)}
                      className={`flex-1 py-1 rounded-lg transition-all text-center truncate ${
                        debtStatusFilter === st.id
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* Currency Filter Switcher */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/5">
                  <span className="text-gray-400 px-1 shrink-0 flex items-center gap-1">
                    <Filter className="w-3 h-3 text-amber-400" />
                    العملة:
                  </span>
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'SAR', label: '🇸🇦 ريال' },
                    { id: 'USD', label: '🇺🇸 دولار' },
                    { id: 'OTHER', label: '🌐 أخرى' },
                  ].map((cur) => (
                    <button
                      key={cur.id}
                      type="button"
                      onClick={() => setCurrencyFilter(cur.id as any)}
                      className={`flex-1 py-1 rounded-lg transition-all text-center truncate ${
                        currencyFilter === cur.id
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {cur.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* View Mode Segmented Controls */}
            <div className="space-y-2 pt-1 border-t border-white/10">
              {/* Primary View Selector: Items vs Person Profiles */}
              <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-2xl border border-white/10 text-xs font-black">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('items');
                    setSelectedPersonProfile(null);
                  }}
                  className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    viewMode === 'items'
                      ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-md font-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>سجل كافة البنود ({filteredDebts.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('persons')}
                  className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    viewMode === 'persons'
                      ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-md font-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>جهات الاتصال المالية ({personProfilesList.length})</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs & Layout Mode Switcher for Items View */}
            {viewMode === 'items' && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                {/* Filter Tabs */}
                <div className="flex-1 flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-white/5 text-[11px] font-bold overflow-x-auto">
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'owed_to_me', label: 'مستحقات لي 🟢' },
                    { id: 'i_owe', label: 'ديون علي 🔴' },
                    { id: 'settled', label: 'المسددة ✔️' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 min-w-[65px] py-1.5 rounded-xl transition-all text-center truncate ${
                        activeTab === tab.id
                          ? 'bg-slate-800 text-emerald-300 border border-white/10 shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Grid vs List View Mode Toggle */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-white/10 shrink-0 text-xs font-black self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setLayoutMode('grid')}
                    title="عرض البطاقات (Grid View)"
                    className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                      layoutMode === 'grid'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-bold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px]">بطاقات</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLayoutMode('list')}
                    title="عرض القائمة (List View)"
                    className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                      layoutMode === 'list'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-bold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <List className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px]">قائمة</span>
                  </button>
                </div>
              </div>
            )}

            {/* Person Profiles View Mode */}
            {viewMode === 'persons' && (
              <div className="space-y-3">
                {personProfilesList.length === 0 ? (
                  <div className="text-center py-8 bg-slate-950/40 rounded-2xl border border-white/5 p-4 space-y-2">
                    <Users className="w-8 h-8 text-gray-600 mx-auto" />
                    <p className="text-xs text-gray-400">لا توجد جهات اتصال مالية مطابقة حالياً.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {personProfilesList.map((p) => {
                      return (
                        <div
                          key={p.name}
                          className="bg-slate-950/90 border border-white/10 rounded-2xl p-3 space-y-2.5 hover:border-amber-500/40 transition-all shadow-md"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-extrabold text-sm shrink-0">
                                {p.name.charAt(0)}
                              </div>
                              <div>
                                <h3 className="text-xs font-black text-white">{p.name}</h3>
                                {p.phone ? (
                                  <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3 text-gray-500" />
                                    {p.phone}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-500">{p.debts.length} بنود ديون مسجلة</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {p.phone && (
                                <button
                                  type="button"
                                  onClick={() => handleDirectWhatsAppChat(p.phone, p.name)}
                                  title="فتح محادثة واتساب مباشرة"
                                  className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-extrabold p-2 rounded-xl text-xs flex items-center justify-center shadow-md active:scale-95 transition-all"
                                >
                                  <Phone className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleShareWhatsApp(p)}
                                title="مشاركة كشف الحساب عبر واتساب"
                                className="bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-extrabold p-2 rounded-xl text-xs flex items-center justify-center shadow-md active:scale-95 transition-all"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedPersonProfile(p.name)}
                                className="bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all"
                              >
                                <span>فتح ملف الشخص</span>
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Currency Breakdown for this person */}
                          <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2 rounded-xl text-[11px] font-mono border border-white/5">
                            {/* SAR */}
                            <div className="space-y-0.5">
                              <span className="text-[9px] text-emerald-400 font-sans block font-bold">🇸🇦 بالريال السعودي:</span>
                              {p.sarOwedToMe > 0 && (
                                <p className="text-emerald-300 text-[10px]">له سلفة: +{p.sarOwedToMe.toLocaleString()} ر.س</p>
                              )}
                              {p.sarIOwe > 0 && (
                                <p className="text-rose-400 text-[10px]">عليه دين: -{p.sarIOwe.toLocaleString()} ر.س</p>
                              )}
                              {p.sarOwedToMe === 0 && p.sarIOwe === 0 && (
                                <p className="text-gray-500 text-[9px]">لا توجد مبالغ بالريال</p>
                              )}
                            </div>

                            {/* USD */}
                            <div className="space-y-0.5 border-r border-white/10 pr-2">
                              <span className="text-[9px] text-sky-400 font-sans block font-bold">🇺🇸 بالدولار الأمريكي:</span>
                              {p.usdOwedToMe > 0 && (
                                <p className="text-emerald-300 text-[10px]">له سلفة: +${p.usdOwedToMe.toLocaleString()}</p>
                              )}
                              {p.usdIOwe > 0 && (
                                <p className="text-rose-400 text-[10px]">عليه دين: -${p.usdIOwe.toLocaleString()}</p>
                              )}
                              {p.usdOwedToMe === 0 && p.usdIOwe === 0 && (
                                <p className="text-gray-500 text-[9px]">لا توجد مبالغ بالدولار</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Debts List */}
            <div
              id="personal-debts-printable-list"
              className={layoutMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-1' : 'space-y-2 p-1'}
            >
              {filteredDebts.length === 0 ? (
                <div className="text-center py-8 bg-slate-950/40 rounded-2xl border border-white/5 p-4 space-y-2">
                  <HandCoins className="w-8 h-8 text-gray-600 mx-auto" />
                  <p className="text-xs text-gray-400">لا توجد سجلات ديون في هذه القائمة حالياً.</p>
                </div>
              ) : (
                filteredDebts.map((d) => {
                  const remaining = d.amount - d.paidAmount;
                  const isSettled = d.status === 'paid' || remaining <= 0;
                  const isOwedToMe = d.type === 'owed_to_me';
                  const currencySymbol = d.currency || settings.currencySymbol || 'ر.س';

                  return (
                    <div
                      key={d.id}
                      className="bg-slate-950/80 border border-white/10 rounded-2xl p-3 space-y-2.5 hover:border-emerald-500/40 transition-all shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                              isOwedToMe
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-extrabold text-white">{d.personName}</h3>
                              <span
                                className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                  isOwedToMe ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                }`}
                              >
                                {isOwedToMe ? 'مستحق لي (سلفة)' : 'دين علي (التزام)'}
                              </span>
                            </div>
                            {d.phone && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5 dir-ltr justify-end">
                                <Phone className="w-3 h-3 text-gray-500" />
                                {d.phone}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Badge & Delete Confirmation Trigger */}
                        <div className="flex items-center gap-1.5">
                          {isSettled ? (
                            <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              تم السداد بالكامل
                            </span>
                          ) : d.paidAmount > 0 ? (
                            <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              مسدد جزئياً
                            </span>
                          ) : (
                            <span className="bg-slate-800 text-gray-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              معلق
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setDebtToDelete(d)}
                            className="text-gray-500 hover:text-rose-400 p-1 transition-colors"
                            title="تأكيد حذف الدين"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Financial Breakdown */}
                      <div className="bg-slate-900/60 rounded-xl p-2 flex items-center justify-between text-xs border border-white/5">
                        <div>
                          <span className="text-[10px] text-gray-400 block">إجمالي الدين</span>
                          <span className="font-extrabold font-mono text-white">
                            {d.amount} <span className="text-amber-300 font-bold">{currencySymbol}</span>
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 block">المسدد</span>
                          <span className="font-bold font-mono text-emerald-400">
                            {d.paidAmount} <span className="text-amber-300 font-bold">{currencySymbol}</span>
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 block">المتبقي</span>
                          <span className={`font-extrabold font-mono ${remaining > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {remaining} <span className="text-amber-300 font-bold">{currencySymbol}</span>
                          </span>
                        </div>
                      </div>

                      {/* Details & Dates */}
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        {d.notes ? <span>ملاحظة: {d.notes}</span> : <span />}
                        {d.dueDate && (
                          <span className="flex items-center gap-1 text-amber-300/80">
                            <Calendar className="w-3 h-3" />
                            استحقاق: {formatDate(d.dueDate, settings.language)}
                          </span>
                        )}
                      </div>

                      {/* Pay / Deduct Received Amount Accordion */}
                      {!isSettled && (
                        <div className="pt-1">
                          {settlingDebtId === d.id ? (
                            <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-2.5 space-y-2.5">
                              <div className="flex items-center justify-between text-[10px] text-emerald-300 font-bold border-b border-white/10 pb-1.5">
                                <span>{isOwedToMe ? 'خصم مبلغ مستلم (تحصيل سلفة)' : 'خصم مبلغ مسدد (سداد دين)'}</span>
                                <button onClick={() => setSettlingDebtId(null)} className="text-gray-400 hover:text-white">
                                  إلغاء
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] text-gray-400 block mb-0.5">
                                    المبلغ المستلم/الخصم ({currencySymbol})
                                  </label>
                                  <input
                                    type="number"
                                    placeholder={remaining.toString()}
                                    value={paymentAmountInput}
                                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-1.5 text-xs text-white font-mono text-left dir-ltr"
                                  />
                                </div>

                                <div>
                                  <label className="text-[9px] text-gray-400 block mb-0.5">الحساب المالي للتحصيل</label>
                                  <select
                                    value={selectedAccountId}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                                  >
                                    {accounts.map((acc) => (
                                      <option key={acc.id} value={acc.id}>
                                        {acc.nameAr}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Quick deduction presets */}
                              <div className="flex gap-1.5 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => setPaymentAmountInput((remaining * 0.25).toFixed(2))}
                                  className="bg-slate-800 hover:bg-slate-700 text-gray-300 px-2 py-1 rounded-lg"
                                >
                                  خصم 25%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPaymentAmountInput((remaining * 0.5).toFixed(2))}
                                  className="bg-slate-800 hover:bg-slate-700 text-gray-300 px-2 py-1 rounded-lg"
                                >
                                  خصم 50%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPaymentAmountInput(remaining.toString())}
                                  className="bg-slate-800 hover:bg-slate-700 text-amber-300 px-2 py-1 rounded-lg font-bold"
                                >
                                  خصم المتبقي كاملاً ({remaining} {currencySymbol})
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSettleSubmit(d)}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-2 rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-1"
                              >
                                <MinusCircle className="w-3.5 h-3.5 text-slate-950" />
                                <span>تأكيد خصم المبلغ المستلم</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              {/* Quick Mark Fully Settled Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  onSettleDebt(d.id, remaining, selectedAccountId || accounts[0]?.id);
                                }}
                                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black rounded-xl py-2 px-3 text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                              >
                                <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                                <span>تم السداد بالكامل</span>
                              </button>

                              {/* Partial Deduction Toggle */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSettlingDebtId(d.id);
                                  setPaymentAmountInput(remaining.toString());
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm shrink-0"
                              >
                                <MinusCircle className="w-3.5 h-3.5 text-amber-400" />
                                <span>خصم جزئي</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Person Profile Overlay Modal */}
          {selectedPersonData && (
            <div className="absolute inset-0 z-50 bg-slate-950 p-4 flex flex-col space-y-3 overflow-y-auto dir-rtl">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPersonProfile(null)}
                    className="p-1.5 rounded-xl bg-slate-800 text-gray-300 hover:text-white"
                  >
                    <ArrowLeft className="w-5 h-5 rotate-180" />
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      <User className="w-4 h-4 text-amber-400" />
                      جهة اتصال مالية: <span className="text-amber-300">{selectedPersonData.name}</span>
                    </h3>
                    {isEditingPhone ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={newPhoneInput}
                          onChange={(e) => setNewPhoneInput(e.target.value)}
                          placeholder="أدخل رقم الواتساب..."
                          className="bg-slate-900 border border-amber-500/50 rounded-lg px-2 py-1 text-[10px] text-white w-32 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdatePersonPhone) {
                              onUpdatePersonPhone(selectedPersonData.name, newPhoneInput);
                            }
                            setIsEditingPhone(false);
                          }}
                          className="bg-emerald-600 text-white p-1 rounded-lg"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingPhone(false)}
                          className="bg-slate-800 text-gray-400 p-1 rounded-lg"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {selectedPersonData.phone ? (
                          <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1 dir-ltr justify-end">
                            <Phone className="w-3 h-3 text-gray-500" />
                            {selectedPersonData.phone}
                          </p>
                        ) : (
                          <p className="text-[10px] text-gray-500 italic">لا يوجد رقم واتساب مرتبط</p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setNewPhoneInput(selectedPersonData.phone || '');
                            setIsEditingPhone(true);
                          }}
                          className="text-[9px] text-amber-400 hover:text-amber-300 underline font-bold"
                        >
                          {selectedPersonData.phone ? 'تعديل الرقم' : 'ربط رقم واتساب'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPersonProfile(null)}
                  className="bg-slate-800 text-gray-400 hover:text-white px-3 py-1 rounded-xl text-xs font-bold"
                >
                  إغلاق الملف
                </button>
              </div>

              {/* Individual Person Financial Overview Cards */}
              <div className="grid grid-cols-2 gap-2 shrink-0">
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-2.5 space-y-1">
                  <span className="text-[10px] text-emerald-300 font-bold block">مستحقات لي (سلف هذا الشخص)</span>
                  <div className="space-y-0.5 font-mono">
                    <p className="text-xs font-bold text-emerald-400">{selectedPersonData.sarOwedToMe.toLocaleString()} ر.س</p>
                    <p className="text-xs font-bold text-sky-300">${selectedPersonData.usdOwedToMe.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-2.5 space-y-1">
                  <span className="text-[10px] text-rose-300 font-bold block">ديون علي (لهذا الشخص)</span>
                  <div className="space-y-0.5 font-mono">
                    <p className="text-xs font-bold text-rose-400">{selectedPersonData.sarIOwe.toLocaleString()} ر.س</p>
                    <p className="text-xs font-bold text-sky-300">${selectedPersonData.usdIOwe.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons: WhatsApp Share & Add Debt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp(selectedPersonData)}
                    className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>مشاركة الكشف</span>
                  </button>

                  {selectedPersonData.phone && (
                    <button
                      type="button"
                      onClick={() => handleDirectWhatsAppChat(selectedPersonData.phone, selectedPersonData.name)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                    >
                      <Phone className="w-4 h-4" />
                      <span>دردشة واتساب</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPersonName(selectedPersonData.name);
                    if (selectedPersonData.phone) setPhone(selectedPersonData.phone);
                    setShowAddForm(true);
                    setSelectedPersonProfile(null);
                    setViewMode('items');
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>إضافة قيد/دين جديد</span>
                </button>
              </div>

              {/* Debt List for this Person */}
              <div className="space-y-2 flex-1">
                <h4 className="text-xs font-extrabold text-amber-200 border-b border-white/5 pb-1">
                  قائمة البنود المسجلة باسم ({selectedPersonData.name}):
                </h4>
                {selectedPersonData.debts.map((d) => {
                  const remaining = d.amount - d.paidAmount;
                  const isSettled = d.status === 'paid' || remaining <= 0;
                  const isOwedToMe = d.type === 'owed_to_me';
                  const currencySymbol = d.currency || settings.currencySymbol || 'ر.س';

                  return (
                    <div
                      key={d.id}
                      className="bg-slate-900 border border-white/10 rounded-2xl p-3 space-y-2 text-xs shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            isOwedToMe ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {isOwedToMe ? '🟢 مستحق لي' : '🔴 دين علي'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold font-mono text-amber-300">
                            {d.amount} {currencySymbol}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleShareSingleDebtWhatsApp(selectedPersonData.name, selectedPersonData.phone, d)}
                            title="مشاركة هذا البند عبر واتساب"
                            className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 font-bold transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>واتساب</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteDebt(d.id);
                            }}
                            className="text-gray-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-400 bg-slate-950 p-2 rounded-xl">
                        <span>مسدد: {d.paidAmount} {currencySymbol}</span>
                        <span className="font-bold text-amber-300">متبقي: {remaining} {currencySymbol}</span>
                      </div>

                      {d.notes && <p className="text-[10px] text-gray-300">ملاحظة: {d.notes}</p>}

                      {!isSettled && (
                        <button
                          type="button"
                          onClick={() => {
                            onSettleDebt(d.id, remaining, selectedAccountId || accounts[0]?.id);
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black py-1.5 rounded-xl text-xs active:scale-95 transition-all mt-1"
                        >
                          خصم/سداد المتبقي ({remaining} {currencySymbol}) بالكامل
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
