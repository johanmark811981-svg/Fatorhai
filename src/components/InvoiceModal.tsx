import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Printer, Share2, QrCode, Check, Building2, UserCheck, Calendar, FileDown, Mail, Search, Package, Hash, Phone, MapPin, Users, Banknote, ShieldCheck, CheckCircle2, Copy, ChevronDown, ChevronUp, Lock, ShieldAlert } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AppSettings, Invoice, InvoiceItem, PaymentMethod, Product, Customer } from '../types';
import { formatCurrency, formatDate, generateId, generateZatcaQrData, generateZatcaPhase2Metadata, decodeZatcaTlvQr, numberToArabicWords, generateNextInvoiceNumber } from '../utils/formatters';
import { exportElementToPdf, printElement, shareViaWhatsApp, shareViaEmail } from '../utils/exportToPdf';

// Helpers for customer initials and avatar styling
const getInitials = (name: string): string => {
  if (!name) return 'ع';
  const clean = name.replace(/[إأآا]لـ/g, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length > 1) {
    return (parts[0][0] || '') + (parts[1] ? parts[1][0] : '');
  }
  return clean.substring(0, 2);
};

const getAvatarColor = (name: string): string => {
  const colors = [
    'from-blue-500 to-indigo-600 shadow-blue-500/20 text-blue-100',
    'from-teal-500 to-emerald-600 shadow-teal-500/20 text-teal-100',
    'from-purple-500 to-pink-600 shadow-purple-500/20 text-purple-100',
    'from-amber-500 to-orange-600 shadow-amber-500/20 text-amber-100',
    'from-rose-500 to-red-600 shadow-rose-500/20 text-rose-100',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

interface InvoiceModalProps {
  isOpen: boolean;
  selectedInvoice?: Invoice | null;
  existingInvoices?: Invoice[];
  isEditing?: boolean;
  initialPhase?: 'phase1' | 'phase2';
  initialType?: 'simplified' | 'standard';
  settings: AppSettings;
  products?: Product[];
  customers?: Customer[];
  units?: string[];
  onClose: () => void;
  onSaveInvoice: (inv: Invoice) => void;
  onGenerateReceipt?: (inv: Invoice) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  selectedInvoice,
  existingInvoices = [],
  isEditing = false,
  initialPhase = 'phase2',
  initialType = 'simplified',
  settings,
  products = [],
  customers = [],
  units = ['حبة', 'كرتون', 'كيلو', 'متر', 'طقم', 'درزن'],
  onClose,
  onSaveInvoice,
  onGenerateReceipt,
}) => {
  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerTaxNum, setCustomerTaxNum] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [invoiceType, setInvoiceType] = useState<'simplified' | 'standard'>(initialType);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'paid' | 'pending'>('pending');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: generateId('item'), description: 'تقديم خدمات واستشارات مالية', quantity: 1, unitPrice: 2000, taxRate: 15, total: 2300, unit: 'حبة' },
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState<'daftara' | 'daftara_blue' | 'daftara_emerald' | 'classic' | 'modern' | 'thermal'>('daftara');
  const [generatedInvoiceNumber, setGeneratedInvoiceNumber] = useState('');

  // ZATCA Phase 2 States
  const [zatcaPhase, setZatcaPhase] = useState<'phase1' | 'phase2'>(initialPhase);
  const [uuid, setUuid] = useState('');
  const [invoiceHash, setInvoiceHash] = useState('');
  const [ecdsaSignature, setEcdsaSignature] = useState('');
  const [ecdsaPublicKey, setEcdsaPublicKey] = useState('');
  const [cryptographicStamp, setCryptographicStamp] = useState('');
  const [icv, setIcv] = useState<number>(101);
  const [pih, setPih] = useState('');
  const [showQrInspector, setShowQrInspector] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load data if viewing or editing
  React.useEffect(() => {
    if (selectedInvoice) {
      setCustomerName(selectedInvoice.customerName);
      setCustomerTaxNum(selectedInvoice.customerTaxNumber || '');
      setCustomerPhone(selectedInvoice.customerPhone || '');
      setCustomerAddress(selectedInvoice.customerAddress || '');
      setCustomerEmail(selectedInvoice.customerEmail || '');
      setInvoiceType(selectedInvoice.invoiceType || 'simplified');
      setPaymentMethod(selectedInvoice.paymentMethod || 'cash');
      setDate(selectedInvoice.date);
      setDueDate(selectedInvoice.dueDate || selectedInvoice.date);
      setStatus(selectedInvoice.status as 'paid' | 'pending');
      setItems(selectedInvoice.items);
      setGeneratedInvoiceNumber(selectedInvoice.invoiceNumber);
      
      // Load ZATCA Phase 2 Metadata
      setZatcaPhase(selectedInvoice.zatcaPhase || 'phase1');
      setUuid(selectedInvoice.uuid || '');
      setInvoiceHash(selectedInvoice.invoiceHash || '');
      setEcdsaSignature(selectedInvoice.ecdsaSignature || '');
      setEcdsaPublicKey(selectedInvoice.ecdsaPublicKey || '');
      setCryptographicStamp(selectedInvoice.cryptographicStamp || '');
      setIcv(selectedInvoice.icv || 101);
      setPih(selectedInvoice.pih || '');
    } else {
      // Reset form for new invoice
      setCustomerName('');
      setCustomerTaxNum('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerEmail('');
      setInvoiceType(initialType);
      setPaymentMethod('cash');
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
      setDueDate(today);
      setStatus('pending');
      setItems([
        { id: generateId('item'), description: 'تقديم خدمات واستشارات مالية', quantity: 1, unitPrice: 2000, taxRate: 15, total: 2300, taxAmount: 300, unit: 'حبة' },
      ]);
      
      // Generate randomized sequential invoice number
      const nextNum = generateNextInvoiceNumber(existingInvoices);
      setGeneratedInvoiceNumber(nextNum);

      // Handle ZATCA Initial Metadata for Phase 2
      if (initialPhase === 'phase2') {
        setZatcaPhase('phase2');
        const meta = generateZatcaPhase2Metadata(nextNum, today, 2300);
        setUuid(meta.uuid);
        setInvoiceHash(meta.invoiceHash);
        setEcdsaSignature(meta.ecdsaSignature);
        setEcdsaPublicKey(meta.ecdsaPublicKey);
        setCryptographicStamp(meta.cryptographicStamp);
        setIcv(meta.icv);
        setPih(meta.pih);
      } else {
        setZatcaPhase('phase1');
        // Clear metadata for Phase 1
        setUuid('');
        setInvoiceHash('');
        setEcdsaSignature('');
        setEcdsaPublicKey('');
        setCryptographicStamp('');
        setIcv(101);
        setPih('');
      }
    }
  }, [selectedInvoice, isEditing, isOpen, initialPhase, existingInvoices.length]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      { 
        id: generateId('item'), 
        description: '', 
        descriptionEn: '',
        quantity: 1, 
        unitPrice: 500, 
        taxRate: 15, 
        total: 575,
        unit: 'حبة',
        discount: 0,
        taxAmount: 75
      },
    ]);
  };

  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate' || field === 'discount') {
          const qty = updated.quantity || 0;
          const price = updated.unitPrice || 0;
          const disc = updated.discount || 0;
          const rate = updated.taxRate || 0;
          
          const subtotalItem = (qty * price) - disc;
          const tax = subtotalItem * (rate / 100);
          updated.taxAmount = tax;
          updated.total = subtotalItem + tax;
        }
        return updated;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const handleSelectCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setCustomerName(customer.name);
      setCustomerTaxNum(customer.taxNumber || '');
      setCustomerAddress(customer.nationalAddress || '');
      setCustomerPhone(customer.phone || '');
      setCustomerEmail(customer.email || '');
    }
  };

  const handleSelectProduct = (itemId: string, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const taxRate = 15;
      const unitPrice = product.isTaxInclusive 
        ? product.price / (1 + (taxRate / 100))
        : product.price;
      
      setItems(prev => prev.map(item => {
        if (item.id === itemId) {
          const updated: InvoiceItem = {
            ...item,
            productId: product.id,
            description: product.name,
            descriptionEn: product.nameEn || '',
            unitPrice: unitPrice,
            taxRate: taxRate,
            unit: product.unit || 'حبة',
            barcode: product.barcode,
          };
          const sub = updated.quantity * updated.unitPrice;
          const tax = sub * (updated.taxRate / 100);
          updated.taxAmount = tax;
          updated.total = sub + tax;
          return updated;
        }
        return item;
      }));
    }
  };

  const subtotal = items.reduce((acc, i) => acc + (i.quantity * i.unitPrice - (i.discount || 0)), 0);
  const taxTotal = items.reduce((acc, i) => acc + (i.taxAmount || 0), 0);
  const grandTotal = subtotal + taxTotal;

  // Derive currentInv from local state to ensure preview is always live
  const currentInv: Invoice = selectedInvoice ? {
    ...selectedInvoice,
    items,
    subtotal,
    taxTotal,
    grandTotal,
    date,
    dueDate,
    customerName,
    customerTaxNumber: customerTaxNum || undefined,
    customerPhone: customerPhone || undefined,
    customerAddress: customerAddress || undefined,
    customerEmail: customerEmail || undefined,
    invoiceType,
    status,
    zatcaPhase,
    uuid: zatcaPhase === 'phase2' ? (uuid || selectedInvoice.uuid) : undefined,
    invoiceHash: zatcaPhase === 'phase2' ? (invoiceHash || selectedInvoice.invoiceHash) : undefined,
    ecdsaSignature: zatcaPhase === 'phase2' ? (ecdsaSignature || selectedInvoice.ecdsaSignature) : undefined,
    cryptographicStamp: zatcaPhase === 'phase2' ? (cryptographicStamp || selectedInvoice.cryptographicStamp) : undefined,
  } as Invoice : {
    id: 'preview',
    invoiceNumber: generatedInvoiceNumber || 'INV-20970',
    customerName: customerName || 'عميل افتراضي',
    date,
    dueDate,
    items,
    subtotal,
    taxTotal,
    grandTotal,
    status,
    paymentMethod,
    invoiceType,
    zatcaPhase,
  } as Invoice;

  // Calculate ZATCA QR Value once for all templates
  const getZatcaQrValue = (inv: Invoice | null) => {
    if (!inv) {
      return generateZatcaQrData(
        settings.companyName || 'شركة كواليتي لينكس',
        settings.companyVatNumber || '300000000000003',
        date,
        grandTotal,
        taxTotal,
        {
          isPhase2: zatcaPhase === 'phase2',
          uuid: uuid,
          invoiceHash: invoiceHash,
          ecdsaSignature: ecdsaSignature,
          cryptographicStamp: cryptographicStamp
        }
      );
    }
    return generateZatcaQrData(
      settings.companyName || 'شركة كواليتي لينكس',
      settings.companyVatNumber || '300000000000003',
      inv.date,
      inv.grandTotal,
      inv.taxTotal,
      {
        isPhase2: inv.zatcaPhase === 'phase2',
        uuid: inv.uuid,
        invoiceHash: inv.invoiceHash,
        ecdsaSignature: inv.ecdsaSignature,
        cryptographicStamp: inv.cryptographicStamp
      }
    );
  };

  const handlePrint = () => {
    printElement('invoice-printable-container');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('يرجى إدخال اسم العميل أولاً.');
      return;
    }
    if (items.length === 0 || items.some(it => !it.description.trim())) {
      alert('يرجى التأكد من إضافة تفاصيل جميع بنود الفاتورة.');
      return;
    }

    const newInvoice: Invoice = {
      id: (selectedInvoice && isEditing) ? selectedInvoice.id : generateId('inv'),
      invoiceNumber: generatedInvoiceNumber,
      customerName: customerName.trim(),
      customerTaxNumber: customerTaxNum.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      date,
      dueDate,
      items,
      subtotal,
      taxTotal,
      grandTotal,
      status,
      paymentMethod,
      invoiceType,
      zatcaPhase,
      uuid: zatcaPhase === 'phase2' ? (uuid || generateZatcaPhase2Metadata().uuid) : undefined,
      invoiceHash: zatcaPhase === 'phase2' ? (invoiceHash || generateZatcaPhase2Metadata().invoiceHash) : undefined,
      ecdsaSignature: zatcaPhase === 'phase2' ? (ecdsaSignature || generateZatcaPhase2Metadata().ecdsaSignature) : undefined,
      ecdsaPublicKey: zatcaPhase === 'phase2' ? (ecdsaPublicKey || generateZatcaPhase2Metadata().ecdsaPublicKey) : undefined,
      cryptographicStamp: zatcaPhase === 'phase2' ? (cryptographicStamp || generateZatcaPhase2Metadata().cryptographicStamp) : undefined,
      icv: zatcaPhase === 'phase2' ? icv : undefined,
      pih: zatcaPhase === 'phase2' ? pih : undefined,
      clearanceStatus: zatcaPhase === 'phase2' ? 'cleared' : undefined,
      notes: zatcaPhase === 'phase2'
        ? 'تم الربط والتكامل مع هيئة الزكاة والضريبة والجمارك (ZATCA Phase 2)'
        : (invoiceType === 'standard' 
          ? 'فاتورة ضريبية معتمدة هيئة الزكاة والضريبة والجمارك (ZATCA)'
          : 'فاتورة ضريبية معتمدة هيئة الزكاة والضريبة والجمارك (ZATCA)'),
    };

    onSaveInvoice(newInvoice);
  };

  const handleShareWhatsApp = (inv: Invoice) => {
    const text = `*فاتورة ضريبية - ${settings.companyName}*\nرقم الفاتورة: ${inv.invoiceNumber}\nالعميل: ${inv.customerName}\nالتاريخ: ${inv.date}\nالإجمالي شامل الضريبة (15%): ${inv.grandTotal.toFixed(2)} ${settings.currencySymbol}\n\nشكراً لتعاملكم معنا.`;
    shareViaWhatsApp(`فاتورة ${inv.invoiceNumber}`, text, inv.customerPhone || '');
  };

  const handleShareEmail = (inv: Invoice) => {
    const subject = `فاتورة ضريبية - ${inv.invoiceNumber}`;
    const body = `مرحباً ${inv.customerName}،\n\nتجدون أدناه تفاصيل الفاتورة الضريبية:\n- رقم الفاتورة: ${inv.invoiceNumber}\n- اسم العميل: ${inv.customerName}\n- تاريخ الإصدار: ${inv.date}\n- الإجمالي شامل الضريبة (15%): ${inv.grandTotal.toFixed(2)} ${settings.currencySymbol}\n\nشاكرين ومقدرين حسن تعاملكم معنا.`;
    shareViaEmail(subject, body);
  };

  const handleExportPdf = (inv: Invoice) => {
    exportElementToPdf('invoice-printable-container', `Invoice-${inv.invoiceNumber}.pdf`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md dir-rtl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl text-white max-h-[92vh] overflow-y-auto my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-400" />
              <h2 className="text-base font-extrabold text-white">
                {currentInv ? `فاتورة ضريبية: ${currentInv.invoiceNumber}` : 'إصدار فاتورة ضريبية جديدة'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="bg-slate-800 text-gray-400 hover:text-white p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {selectedInvoice && !isEditing ? (
            /* VIEW & PRINT INVOICE MODE */
            <div className="space-y-4 pt-4">
              
              {/* ZATCA Phase 2 Compliance Info (View Mode) */}
              {currentInv.zatcaPhase === 'phase2' && (
                <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-2xl p-3 space-y-2 no-print">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span className="text-[11px] font-black text-cyan-100">تفاصيل الربط والمرحلة الثانية (Compliance)</span>
                    </div>
                    <span className="bg-cyan-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full">
                      Cleared & Reported
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[9px]">
                    <div className="bg-slate-950/50 p-2 rounded-lg border border-white/5">
                      <span className="text-gray-500 block mb-0.5">معرف الفاتورة (UUID)</span>
                      <span className="font-mono text-cyan-300 truncate block">{currentInv.uuid}</span>
                    </div>
                    <div className="bg-slate-950/50 p-2 rounded-lg border border-white/5">
                      <span className="text-gray-500 block mb-0.5">الهاش الرقمي (SHA-256)</span>
                      <span className="font-mono text-cyan-300 truncate block">{currentInv.invoiceHash}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowQrInspector(!showQrInspector)}
                    className="w-full flex items-center justify-center gap-2 py-1.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-[10px] font-bold text-gray-400 transition-all border border-white/5"
                  >
                    {showQrInspector ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    <span>{showQrInspector ? 'إخفاء تفاصيل الـ QR' : 'فحص بيانات الـ QR (TLV Decoder)'}</span>
                  </button>

                  {showQrInspector && (
                    <div className="bg-slate-950 rounded-xl p-3 border border-white/10 space-y-2 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-1.5 mb-2">
                        <QrCode className="w-3 h-3 text-teal-400" />
                        <span className="text-[10px] font-black text-white">فك تشفير حقول الـ ZATCA TLV Tags</span>
                      </div>
                      <div className="space-y-1.5 overflow-hidden">
                        {Object.entries(decodeZatcaTlvQr(getZatcaQrValue(currentInv))).map(([tag, val]) => (
                          <div key={tag} className="flex items-start gap-2 text-[9px] border-b border-white/5 pb-1 last:border-0">
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-teal-400 shrink-0">Tag {tag}</span>
                            <span className="text-gray-300 break-all">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Template Picker (No-Print) */}
              <div className="flex gap-1 p-1 bg-slate-950/60 border border-white/5 rounded-2xl shadow-inner print:hidden justify-between overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('daftara')}
                  className={`flex-1 py-2 px-2 text-center text-[10px] font-black rounded-xl transition-all shrink-0 ${
                    selectedTemplate === 'daftara'
                      ? 'bg-gradient-to-r from-blue-700 to-indigo-800 border border-blue-400 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🏛️ دفترة الكلاسيكي
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('daftara_blue')}
                  className={`flex-1 py-2 px-2 text-center text-[10px] font-black rounded-xl transition-all shrink-0 ${
                    selectedTemplate === 'daftara_blue'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-700 border border-cyan-400 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🔷 دفترة الأزرق الملكي
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('daftara_emerald')}
                  className={`flex-1 py-2 px-2 text-center text-[10px] font-black rounded-xl transition-all shrink-0 ${
                    selectedTemplate === 'daftara_emerald'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-800 border border-emerald-400 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  ✨ دفترة الزمردي الراقي
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('classic')}
                  className={`flex-1 py-2 px-1.5 text-center text-[10px] font-black rounded-xl transition-all shrink-0 ${
                    selectedTemplate === 'classic'
                      ? 'bg-slate-900 border border-white/10 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  الشركات الكلاسيكي
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('modern')}
                  className={`flex-1 py-2 px-1.5 text-center text-[10px] font-black rounded-xl transition-all shrink-0 ${
                    selectedTemplate === 'modern'
                      ? 'bg-slate-900 border border-white/10 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  الحديث الملون
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('thermal')}
                  className={`flex-1 py-2 px-1.5 text-center text-[10px] font-black rounded-xl transition-all shrink-0 ${
                    selectedTemplate === 'thermal'
                      ? 'bg-slate-900 border border-white/10 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  كاشير حراري (80mm)
                </button>
              </div>

              <div id="invoice-printable-container" className="text-slate-900 bg-white p-4 sm:p-6 rounded-xl shadow-inner text-[10px] border border-gray-200 space-y-4 min-h-[600px] flex flex-col">
                
                {/* 0. DAFTARA ERP CLASSIC PROFESSIONAL TEMPLATE */}
                {selectedTemplate === 'daftara' && (
                  <div className="space-y-4 flex-1 flex flex-col font-sans">
                    {/* Top Header Bar with Accent Color Line */}
                    <div className="border-b-4 border-amber-500 pb-3 space-y-3">
                      {/* Top Banner Row */}
                      <div className="flex justify-between items-start">
                        {/* Company Info Right */}
                        <div className="flex gap-3.5 items-start">
                          {settings.companyLogoUrl ? (
                            <img 
                              src={settings.companyLogoUrl} 
                              alt="Logo" 
                              className="w-20 h-20 object-contain rounded-xl border border-slate-200 p-1 bg-white shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center font-black p-1 text-center shrink-0">
                              <Building2 className="w-6 h-6 text-amber-400 mb-0.5" />
                              <span className="text-[7.5px] leading-none">Qualitylinks</span>
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <h1 className="text-xl font-black text-slate-950 leading-tight">
                              {settings.companyName || 'شركة كواليتي لينكس (Qualitylinks)'}
                            </h1>
                            {settings.companyNameEn && (
                              <h2 className="text-[11px] font-extrabold text-slate-500 font-mono leading-tight">
                                {settings.companyNameEn}
                              </h2>
                            )}
                            <div className="pt-1 space-y-0.5 text-[9.5px] text-slate-700 font-semibold">
                              <p>الرقم الضريبي / VAT No: <span className="font-mono font-bold text-slate-900">{settings.companyVatNumber || '300000000000003'}</span></p>
                              {settings.companyCommercialRegister && (
                                <p>السجل التجاري / CR No: <span className="font-mono font-bold text-slate-900">{settings.companyCommercialRegister}</span></p>
                              )}
                              <p>الهاتف / Tel: <span className="font-mono">{settings.companyPhone || '+966 50 000 0000'}</span></p>
                              {settings.companyNationalAddress && (
                                <p className="text-[9px] text-slate-500">العنوان الوطني: {settings.companyNationalAddress}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Invoice Title & Metadata Box Left */}
                        <div className="text-left dir-ltr flex flex-col items-end shrink-0 space-y-1">
                          <div className="bg-slate-900 text-white px-4 py-1.5 rounded-lg shadow-sm text-right dir-rtl">
                            <h2 className="text-sm font-black text-amber-400">
                              فاتورة ضريبية
                            </h2>
                            <span className="text-[8.5px] font-mono text-slate-300 block uppercase tracking-wider text-left dir-ltr">
                              TAX INVOICE
                            </span>
                          </div>

                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1 text-[9.5px] w-48 font-bold">
                            <div className="flex justify-between border-b border-slate-200 pb-1">
                              <span className="text-slate-500">رقم الفاتورة / No:</span>
                              <span className="font-mono text-blue-700 font-extrabold">{currentInv.invoiceNumber}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-1">
                              <span className="text-slate-500">تاريخ الإصدار / Date:</span>
                              <span className="font-mono text-slate-800">{currentInv.date}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-1">
                              <span className="text-slate-500">تاريخ الاستحقاق / Due:</span>
                              <span className="font-mono text-slate-800">{currentInv.dueDate || currentInv.date}</span>
                            </div>
                            <div className="flex justify-between items-center pt-0.5">
                              <span className="text-slate-500">الحالة / Status:</span>
                              <span className={`px-2 py-0.5 text-[8.5px] font-black rounded-md ${
                                currentInv.status === 'paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {currentInv.status === 'paid' ? 'مدفوعة / PAID' : 'بانتظار السداد'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Daftara Dual Grid: Seller & Billed To Customer */}
                    <div className="grid grid-cols-2 gap-3 text-[9.5px]">
                      {/* Seller Box */}
                      <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 space-y-1">
                        <div className="border-b border-slate-300 pb-1 mb-1 flex items-center gap-1 text-slate-900 font-black">
                          <Building2 className="w-3.5 h-3.5 text-blue-700" />
                          <span>بيانات المورد / Seller Details</span>
                        </div>
                        <p className="font-black text-slate-900 text-xs">{settings.companyName || 'شركة كواليتي لينكس (Qualitylinks)'}</p>
                        <p className="text-slate-600">الرقم الضريبي: <span className="font-mono font-bold text-slate-800">{settings.companyVatNumber || '300000000000003'}</span></p>
                        <p className="text-slate-600">الهاتف: <span className="font-mono">{settings.companyPhone || '+966 50 000 0000'}</span></p>
                        {settings.companyEmail && <p className="text-slate-600">البريد: <span className="font-mono">{settings.companyEmail}</span></p>}
                      </div>

                      {/* Customer Box */}
                      <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-200/80 space-y-1">
                        <div className="border-b border-blue-200 pb-1 mb-1 flex items-center gap-1 text-blue-900 font-black">
                          <Users className="w-3.5 h-3.5 text-blue-700" />
                          <span>بيانات العميل / Billed To</span>
                        </div>
                        <p className="font-black text-slate-900 text-xs">{currentInv.customerName}</p>
                        {currentInv.customerTaxNumber ? (
                          <p className="text-slate-700 font-bold">الرقم الضريبي للعميل: <span className="font-mono text-blue-800">{currentInv.customerTaxNumber}</span></p>
                        ) : (
                          <p className="text-slate-400 italic">الرقم الضريبي: غير مسجل (عميل أفراد)</p>
                        )}
                        {currentInv.customerPhone && <p className="text-slate-600 font-mono">الهاتف / الجوال: {currentInv.customerPhone}</p>}
                        {currentInv.customerAddress && <p className="text-slate-600">العنوان: {currentInv.customerAddress}</p>}
                      </div>
                    </div>

                    {/* Daftara Items Table */}
                    <div className="flex-1 overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                      <table className="w-full text-right border-collapse text-[9px]">
                        <thead>
                          <tr className="bg-slate-900 text-white font-bold text-[8.5px]">
                            <th className="p-2 border-r border-slate-800 text-center w-8">#</th>
                            <th className="p-2 border-r border-slate-800">تفاصيل البند والخدمة / Item & Description</th>
                            <th className="p-2 border-r border-slate-800 text-center">الوحدة / Unit</th>
                            <th className="p-2 border-r border-slate-800 text-center">الكمية / Qty</th>
                            <th className="p-2 border-r border-slate-800 text-center">السعر / Unit Price</th>
                            <th className="p-2 border-r border-slate-800 text-center">المبلغ الخاضع / Taxable</th>
                            <th className="p-2 border-r border-slate-800 text-center">الخصم / Disc</th>
                            <th className="p-2 border-r border-slate-800 text-center">الضريبة (15%)</th>
                            <th className="p-2 text-left">الإجمالي / Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {currentInv.items.map((it, idx) => {
                            const taxable = it.quantity * it.unitPrice;
                            return (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                <td className="p-2 text-center text-slate-500 font-mono border-r border-slate-200">{idx + 1}</td>
                                <td className="p-2 font-bold text-slate-900 border-r border-slate-200">
                                  <div>{it.description}</div>
                                  {it.descriptionEn && <div className="text-[8px] font-mono text-slate-400">{it.descriptionEn}</div>}
                                </td>
                                <td className="p-2 text-center text-slate-700 border-r border-slate-200">{it.unit || 'حبة'}</td>
                                <td className="p-2 text-center font-mono font-bold text-slate-900 border-r border-slate-200">{it.quantity}</td>
                                <td className="p-2 text-center font-mono text-slate-800 border-r border-slate-200">{it.unitPrice.toFixed(2)}</td>
                                <td className="p-2 text-center font-mono text-slate-800 border-r border-slate-200">{taxable.toFixed(2)}</td>
                                <td className="p-2 text-center font-mono text-rose-600 border-r border-slate-200">{it.discount ? `-${it.discount.toFixed(2)}` : '0.00'}</td>
                                <td className="p-2 text-center font-mono text-slate-800 border-r border-slate-200">
                                  {it.taxAmount?.toFixed(2)}
                                </td>
                                <td className="p-2 text-left font-mono font-black text-blue-900">{it.total.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Arabic Tafqit Banner (المبلغ المكتوب بالتفقيط) */}
                    <div className="bg-amber-50/80 border border-amber-200 p-2 rounded-xl text-[9.5px] font-bold text-amber-900 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-amber-500 text-white px-2 py-0.5 rounded-md text-[8.5px] font-black">المبلغ المكتوب:</span>
                        <span>فقط {numberToArabicWords(currentInv.grandTotal)}</span>
                      </div>
                      <span className="text-[8px] font-mono text-amber-700">Tafqit (Arabic Written Amount)</span>
                    </div>

                    {/* Bottom Section: ZATCA QR + Summary Table + Bank & Signature */}
                    <div className="grid grid-cols-12 gap-3 pt-2 mt-auto border-t border-slate-200 items-start">
                      {/* ZATCA QR Code & Signature */}
                      <div className="col-span-4 space-y-2 flex flex-col items-center">
                        <div className="bg-white p-2 rounded-xl border-2 border-slate-900 shadow-sm flex flex-col items-center">
                          <QRCodeSVG
                            value={getZatcaQrValue(currentInv)}
                            size={95}
                          />
                          <span className="text-[7.5px] font-extrabold text-slate-900 mt-1">رمز هيئة الزكاة والضريبة (ZATCA)</span>
                        </div>

                        {/* Signature Placeholder */}
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-28 border-b-2 border-slate-900 pb-1"></div>
                          <p className="text-[9px] font-black text-slate-600 mt-1">توقيع المعتمد / Authorized Signature</p>
                        </div>
                      </div>

                      {/* Calculations Summary Box */}
                      <div className="col-span-8 space-y-2 text-right dir-rtl">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-[10px] font-bold">
                          <div className="flex justify-between text-slate-600 border-b border-slate-200 pb-1">
                            <span>المجموع الفرعي (غير شامل ضريبة):</span>
                            <span className="font-mono text-slate-900">{currentInv.subtotal.toFixed(2)} {settings.currencySymbol}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 border-b border-slate-200 pb-1">
                            <span>إجمالي ضريبة القيمة المضافة (15%):</span>
                            <span className="font-mono text-slate-900">{currentInv.taxTotal.toFixed(2)} {settings.currencySymbol}</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-900 text-white p-2 rounded-lg font-black text-sm">
                            <span>المبلغ الإجمالي النهائي المستحق:</span>
                            <span className="font-mono text-amber-400 text-base">{currentInv.grandTotal.toFixed(2)} {settings.currencySymbol}</span>
                          </div>
                        </div>

                        {/* Bank Transfer Details Box */}
                        {settings.bankIban && (
                          <div className="bg-blue-50/50 p-2 rounded-xl border border-blue-100 text-[8.5px] space-y-0.5 text-blue-900 font-semibold">
                            <div className="font-bold text-blue-950 flex items-center gap-1">
                              <Banknote className="w-3 h-3 text-blue-700" />
                              <span>تفاصيل الحساب البنكي للتحويل:</span>
                            </div>
                            <p>البنك: <span className="font-bold">{settings.bankName || 'البنك الأهلي / الراجحي'}</span> | الحساب: {settings.bankAccountName || settings.companyName}</p>
                            <p>رقم الآيبان (IBAN): <span className="font-mono font-bold text-blue-800">{settings.bankIban}</span></p>
                          </div>
                        )}

                        {/* Terms & Footer note */}
                        {settings.invoiceFooterNote && (
                          <p className="text-[8px] text-slate-500 leading-relaxed text-center dir-rtl pt-1 border-t border-slate-200">
                            {settings.invoiceFooterNote}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 0B. DAFTARA ERP ROYAL BLUE TEMPLATE */}
                {selectedTemplate === 'daftara_blue' && (
                  <div className="space-y-4 flex-1 flex flex-col font-sans">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 rounded-2xl shadow-md space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3 items-center">
                          {settings.companyLogoUrl ? (
                            <img 
                              src={settings.companyLogoUrl} 
                              alt="Logo" 
                              className="w-16 h-16 object-contain rounded-xl border border-white/20 p-1 bg-white"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-blue-600 text-white flex flex-col items-center justify-center font-black p-1 text-center shrink-0">
                              <Building2 className="w-6 h-6 text-cyan-300" />
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <h1 className="text-lg font-black text-white">{settings.companyName || 'شركة كواليتي لينكس'}</h1>
                            <p className="text-[10px] text-blue-200 font-mono">{settings.companyNameEn || 'Qualitylinks Co.'}</p>
                            <p className="text-[9px] text-cyan-200">الرقم الضريبي: <span className="font-mono font-bold">{settings.companyVatNumber || '300000000000003'}</span></p>
                          </div>
                        </div>

                        <div className="text-left dir-ltr space-y-1">
                          <span className="bg-cyan-400 text-slate-950 font-black px-3 py-1 rounded-lg text-xs uppercase block text-center">
                            TAX INVOICE
                          </span>
                          <p className="text-[10px] text-blue-200 font-mono font-bold">No: <span className="text-white">{currentInv.invoiceNumber}</span></p>
                          <p className="text-[9px] text-blue-200 font-mono">Date: {currentInv.date}</p>
                        </div>
                      </div>
                    </div>

                    {/* Customer & Info Grid */}
                    <div className="grid grid-cols-2 gap-3 text-[9.5px]">
                      <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl space-y-1">
                        <span className="text-blue-900 font-black block border-b border-blue-200 pb-0.5">بيانات العميل / Billed To</span>
                        <p className="font-bold text-slate-900 text-xs">{currentInv.customerName}</p>
                        <p className="text-slate-600">الرقم الضريبي: <span className="font-mono text-blue-800">{currentInv.customerTaxNumber || 'غير مسجل'}</span></p>
                        <p className="text-slate-600">الهاتف: <span className="font-mono">{currentInv.customerPhone || '-'}</span></p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl space-y-1 text-right">
                        <span className="text-slate-900 font-black block border-b border-slate-200 pb-0.5">ملخص الحالة والدفع</span>
                        <p className="text-slate-700">حالة الفاتورة: <span className="font-bold text-emerald-700">{currentInv.status === 'paid' ? 'مدفوعة بالكامل' : 'معلقة'}</span></p>
                        <p className="text-slate-700">طريقة الدفع: <span className="font-bold">{currentInv.paymentMethod || 'نقداً'}</span></p>
                        <p className="text-slate-700">تاريخ الاستحقاق: <span className="font-mono">{currentInv.dueDate || currentInv.date}</span></p>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-x-auto border border-blue-200 rounded-xl">
                      <table className="w-full text-right border-collapse text-[9px]">
                        <thead className="bg-blue-900 text-white font-bold">
                          <tr>
                            <th className="p-2 text-center">#</th>
                            <th className="p-2">الصنف والخدمة</th>
                            <th className="p-2 text-center">الكمية</th>
                            <th className="p-2 text-center">السعر</th>
                            <th className="p-2 text-center">الضريبة (15%)</th>
                            <th className="p-2 text-left">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100 bg-white">
                          {currentInv.items.map((it, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}>
                              <td className="p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                              <td className="p-2 font-bold text-slate-900">{it.description}</td>
                              <td className="p-2 text-center font-mono">{it.quantity}</td>
                              <td className="p-2 text-center font-mono">{it.unitPrice.toFixed(2)}</td>
                              <td className="p-2 text-center font-mono text-slate-700">{it.taxAmount?.toFixed(2)}</td>
                              <td className="p-2 text-left font-mono font-black text-blue-900">{it.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Tafqit */}
                    <div className="bg-blue-900 text-white p-2 rounded-xl text-[9px] font-bold flex justify-between items-center">
                      <span>المبلغ المكتوب: فقط {numberToArabicWords(currentInv.grandTotal)}</span>
                      <span className="text-[8px] opacity-80">Daftara Royal Blue Edition</span>
                    </div>

                    {/* Footer Row */}
                    <div className="grid grid-cols-12 gap-3 pt-1 items-center">
                      <div className="col-span-4 flex flex-col items-center">
                        <QRCodeSVG
                          value={getZatcaQrValue(currentInv)}
                          size={85}
                        />
                      </div>
                      <div className="col-span-8 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-right space-y-1 font-bold">
                        <div className="flex justify-between text-slate-600">
                          <span>المجموع الفرعي:</span>
                          <span className="font-mono">{currentInv.subtotal.toFixed(2)} {settings.currencySymbol}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>الضريبة (15%):</span>
                          <span className="font-mono">{currentInv.taxTotal.toFixed(2)} {settings.currencySymbol}</span>
                        </div>
                        <div className="flex justify-between text-blue-950 font-black text-xs border-t border-slate-300 pt-1">
                          <span>الإجمالي النهائي:</span>
                          <span className="font-mono text-blue-800 text-sm">{currentInv.grandTotal.toFixed(2)} {settings.currencySymbol}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 0C. DAFTARA ERP EMERALD LUXURY TEMPLATE */}
                {selectedTemplate === 'daftara_emerald' && (
                  <div className="space-y-4 flex-1 flex flex-col font-sans border-2 border-emerald-600 p-4 rounded-xl">
                    <div className="border-b-2 border-emerald-600 pb-3 flex justify-between items-start">
                      <div className="space-y-1">
                        <h1 className="text-xl font-black text-emerald-950">{settings.companyName || 'شركة كواليتي لينكس'}</h1>
                        <p className="text-[9.5px] text-emerald-800">الرقم الضريبي: <span className="font-mono font-bold">{settings.companyVatNumber || '300000000000003'}</span></p>
                        <p className="text-[9px] text-slate-600">العنوان: {settings.companyNationalAddress || 'الرياض، المملكة العربية السعودية'}</p>
                      </div>
                      <div className="text-left space-y-1">
                        <span className="bg-emerald-800 text-amber-300 px-3 py-1 rounded-lg text-xs font-black inline-block">
                          فاتورة ضريبية رسمية
                        </span>
                        <p className="text-[10px] font-mono font-bold text-slate-800">NO: {currentInv.invoiceNumber}</p>
                        <p className="text-[9px] font-mono text-slate-600">DATE: {currentInv.date}</p>
                      </div>
                    </div>

                    <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 text-[9.5px] space-y-1">
                      <p className="font-black text-emerald-950 text-xs">المكرم / السيد: {currentInv.customerName}</p>
                      <p className="text-slate-700">الرقم الضريبي للعميل: <span className="font-mono font-bold text-emerald-900">{currentInv.customerTaxNumber || 'غير مسجل'}</span></p>
                    </div>

                    <div className="flex-1 overflow-x-auto border border-emerald-300 rounded-xl">
                      <table className="w-full text-right border-collapse text-[9px]">
                        <thead className="bg-emerald-900 text-white font-bold">
                          <tr>
                            <th className="p-2 border-r border-emerald-800 text-center">#</th>
                            <th className="p-2 border-r border-emerald-800">تفاصيل البند والخدمة</th>
                            <th className="p-2 border-r border-emerald-800 text-center">الكمية</th>
                            <th className="p-2 border-r border-emerald-800 text-center">السعر</th>
                            <th className="p-2 border-r border-emerald-800 text-center">الضريبة</th>
                            <th className="p-2 text-left">المبلغ الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-100 bg-white">
                          {currentInv.items.map((it, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/30'}>
                              <td className="p-2 text-center text-slate-500 font-mono border-r border-emerald-100">{idx + 1}</td>
                              <td className="p-2 font-bold text-slate-900 border-r border-emerald-100">{it.description}</td>
                              <td className="p-2 text-center font-mono border-r border-emerald-100">{it.quantity}</td>
                              <td className="p-2 text-center font-mono border-r border-emerald-100">{it.unitPrice.toFixed(2)}</td>
                              <td className="p-2 text-center font-mono text-slate-700 border-r border-emerald-100">{it.taxAmount?.toFixed(2)}</td>
                              <td className="p-2 text-left font-mono font-black text-emerald-900">{it.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-amber-50 border border-amber-300 p-2 rounded-xl text-[9.5px] font-bold text-amber-950">
                      المبلغ المكتوب: فقط {numberToArabicWords(currentInv.grandTotal)}
                    </div>

                    <div className="grid grid-cols-12 gap-3 pt-1 items-start">
                      <div className="col-span-4 flex flex-col items-center">
                        <QRCodeSVG
                          value={getZatcaQrValue(currentInv)}
                          size={85}
                        />
                      </div>
                      <div className="col-span-8 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 text-right space-y-1 font-bold">
                        <div className="flex justify-between text-slate-700">
                          <span>المجموع غير شامل الضريبة:</span>
                          <span className="font-mono">{currentInv.subtotal.toFixed(2)} {settings.currencySymbol}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>ضريبة القيمة المضافة (15%):</span>
                          <span className="font-mono">{currentInv.taxTotal.toFixed(2)} {settings.currencySymbol}</span>
                        </div>
                        <div className="flex justify-between text-emerald-950 font-black text-xs border-t border-emerald-300 pt-1">
                          <span>المبلغ المعتمد النهائي:</span>
                          <span className="font-mono text-emerald-900 text-sm">{currentInv.grandTotal.toFixed(2)} {settings.currencySymbol}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1. CLASSIC TEMPLATE */}
                {selectedTemplate === 'classic' && (
                  <div className="space-y-4 flex-1 flex flex-col">
                    {/* Header Company Info */}
                    <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
                      <div className="flex gap-4">
                        {settings.companyLogoUrl && (
                          <img 
                            src={settings.companyLogoUrl} 
                            alt="Logo" 
                            className="w-16 h-16 object-contain rounded-lg border border-gray-100 p-1"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="space-y-0.5">
                          <h1 className="text-lg font-black text-slate-900 leading-tight">{settings.companyName}</h1>
                          {settings.companyNameEn && (
                            <h2 className="text-[11px] font-bold text-slate-500 leading-tight font-mono">{settings.companyNameEn}</h2>
                          )}
                          <p className="text-[10px] font-bold text-slate-700">الرقم الضريبي / VAT: <span className="font-mono">{settings.companyVatNumber}</span></p>
                          <p className="text-[9px] text-slate-600">الهاتف / Tel: <span className="font-mono">{settings.companyPhone}</span></p>
                          {settings.companyNationalAddress && (
                            <p className="text-[9px] text-slate-600 leading-tight">العنوان / Address: {settings.companyNationalAddress}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-left dir-ltr flex flex-col items-end shrink-0">
                        <div className={`text-white text-[9px] font-black px-3 py-1 rounded-lg mb-1 ${
                          currentInv.invoiceType === 'standard' ? 'bg-orange-600' : 'bg-slate-900'
                        }`}>
                          Tax Invoice
                        </div>
                        <div className={`text-slate-900 text-[9px] font-black px-3 py-1 rounded-lg mb-2 border ${
                          currentInv.invoiceType === 'standard' ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'
                        }`}>
                          فاتورة ضريبية
                        </div>
                        <p className="font-mono font-black text-xs text-slate-900">{currentInv.invoiceNumber}</p>
                        <p className="text-[9px] font-bold text-slate-500">{formatDate(currentInv.date, 'ar')} | {formatDate(currentInv.date, 'en')}</p>
                      </div>
                    </div>

                    {/* Client & Invoice Details */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1 h-full bg-slate-900/20" />
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[8px] font-black text-slate-500 underline decoration-slate-300">العميل / Client</span>
                        </div>
                        <span className="text-xs font-black text-slate-900 block">{currentInv.customerName}</span>
                        {currentInv.customerTaxNumber && (
                          <p className="text-[9px] text-slate-600">الرقم الضريبي / VAT: <span className="font-mono">{currentInv.customerTaxNumber}</span></p>
                        )}
                        {currentInv.customerPhone && (
                          <p className="text-[9px] text-slate-600 font-mono">جوال / Mob: {currentInv.customerPhone}</p>
                        )}
                        {currentInv.customerAddress && (
                          <p className="text-[9px] text-slate-600 leading-tight">العنوان / Address: {currentInv.customerAddress}</p>
                        )}
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-center items-center text-center">
                        <span className="text-[9px] font-bold text-slate-500 block mb-1">حالة السداد / Payment Status</span>
                        <div className="flex flex-col gap-1 items-center">
                          <span className={`text-[10px] font-black px-3 py-0.5 rounded-full border ${
                            currentInv.status === 'paid' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {currentInv.status === 'paid' ? 'مدفوعة / Paid' : 'بانتظار السداد / Pending'}
                          </span>
                          {currentInv.paymentMethod && (
                            <span className="text-[9px] font-bold text-slate-600 mt-1">
                              طريقة الدفع / Method: {
                                currentInv.paymentMethod === 'cash' ? 'نقداً (Cash)' :
                                currentInv.paymentMethod === 'card' ? 'بطاقة (Card)' :
                                currentInv.paymentMethod === 'apple_pay' ? 'Apple Pay' :
                                currentInv.paymentMethod === 'bank_transfer' ? 'تحويل (Bank)' :
                                currentInv.paymentMethod === 'stc_pay' ? 'STC Pay' : 'أخرى (Other)'
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Table of Items */}
                    <div className="flex-1 overflow-x-auto">
                      <table className="w-full text-right border-collapse text-[9px]">
                        <thead>
                          <tr className="bg-slate-900 text-white font-bold border-b-2 border-slate-700">
                            <th className="p-1.5 rounded-tr-lg">م / No.</th>
                            <th className="p-1.5">باركود / Barcode</th>
                            <th className="p-1.5 text-center">الصنف / Description</th>
                            <th className="p-1.5 text-center">الوحدة / Unit</th>
                            <th className="p-1.5 text-center">الكمية / Qty</th>
                            <th className="p-1.5 text-center">السعر / Price</th>
                            <th className="p-1.5 text-center">الخاضع / Taxable</th>
                            <th className="p-1.5 text-center">الخصم / Disc.</th>
                            <th className="p-1.5 text-center">الضريبة / VAT</th>
                            <th className="p-1.5 text-left rounded-tl-lg">الإجمالي / Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 border-b-2 border-slate-900">
                          {currentInv.items.map((it, idx) => {
                            const taxable = it.quantity * it.unitPrice;
                            return (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-1.5 text-slate-400 font-mono">{idx + 1}</td>
                                <td className="p-1.5 font-mono text-slate-500">{it.barcode || '-'}</td>
                                <td className="p-1.5 font-bold text-slate-800 leading-tight">
                                  <div>{it.description}</div>
                                  {it.descriptionEn && <div className="text-[8px] font-mono text-slate-400">{it.descriptionEn}</div>}
                                </td>
                                <td className="p-1.5 text-center">{it.unit || 'حبة'}</td>
                                <td className="p-1.5 text-center font-mono">{it.quantity}</td>
                                <td className="p-1.5 text-center font-mono">{it.unitPrice.toFixed(2)}</td>
                                <td className="p-1.5 text-center font-mono">{taxable.toFixed(2)}</td>
                                <td className="p-1.5 text-center font-mono text-rose-600">{it.discount ? `-${it.discount.toFixed(2)}` : '0.00'}</td>
                                <td className="p-1.5 text-center font-mono">
                                  <div className="text-slate-900">{it.taxAmount?.toFixed(2)}</div>
                                  <div className="text-[7px] text-slate-400">({it.taxRate}%)</div>
                                </td>
                                <td className="p-1.5 text-left font-mono font-black text-slate-900">{it.total.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals & ZATCA QR Code */}
                    <div className="flex items-end justify-between pt-3 mt-auto border-t border-slate-100">
                      {/* Real ZATCA TLV QR */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="bg-white p-2 rounded-xl border-2 border-slate-900 shadow-sm">
                          <QRCodeSVG
                            value={getZatcaQrValue(currentInv)}
                            size={90}
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                        <div className="text-center">
                          <span className="text-[8px] font-black text-slate-900 block leading-tight">فاتورة ضريبية إلكترونية</span>
                          <span className="text-[7px] text-slate-500 uppercase tracking-tighter">Electronic Tax Invoice</span>
                        </div>
                      </div>

                      {/* Calculation breakdown */}
                      <div className="space-y-1.5 text-left dir-ltr w-64 text-[10px] font-bold">
                        <div className="flex justify-between text-slate-500">
                          <span className="font-normal text-right">المجموع الفرعي / Subtotal (Excl. VAT):</span>
                          <span className="font-mono text-slate-900">{currentInv.subtotal.toFixed(2)} {settings.currencySymbol}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span className="font-normal text-right">إجمالي الضريبة / Total VAT (15%):</span>
                          <span className="font-mono text-slate-900">{currentInv.taxTotal.toFixed(2)} {settings.currencySymbol}</span>
                        </div>
                        <div className="flex justify-between font-black text-slate-950 text-base border-t-2 border-slate-900 pt-2 mt-2">
                          <span className="text-right">الإجمالي شامل الضريبة / Total (Incl. VAT):</span>
                          <span className="font-mono">{currentInv.grandTotal.toFixed(2)} {settings.currencySymbol}</span>
                        </div>
                        <p className="text-[8px] text-slate-400 mt-3 text-center font-normal leading-relaxed text-right dir-rtl">
                          {settings.invoiceFooterNote || (
                            <>
                              شكراً لتعاملكم معنا. تم إصدار هذه الفاتورة طبقاً لمتطلبات هيئة الزكاة والضريبة والجمارك.<br/>
                              Thank you for your business. This invoice was issued according to ZATCA requirements.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MODERN TEAL TEMPLATE */}
                {selectedTemplate === 'modern' && (
                  <div className="space-y-4 flex-1 flex flex-col">
                    {/* Header Company Info with Modern design */}
                    <div className="bg-gradient-to-l from-slate-900 to-slate-800 p-4 rounded-2xl flex items-start justify-between text-white shadow-md">
                      <div className="flex gap-4">
                        {settings.companyLogoUrl && (
                          <img 
                            src={settings.companyLogoUrl} 
                            alt="Logo" 
                            className="w-16 h-16 object-contain rounded-xl bg-white p-1"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="space-y-1">
                          <h1 className="text-lg font-black leading-tight text-white">{settings.companyName}</h1>
                          {settings.companyNameEn && (
                            <h2 className="text-[11px] font-bold text-teal-300 font-mono">{settings.companyNameEn}</h2>
                          )}
                          <p className="text-[9px] text-gray-300">الرقم الضريبي / VAT: <span className="font-mono text-teal-400">{settings.companyVatNumber}</span></p>
                          <p className="text-[9px] text-gray-300">الهاتف / Tel: <span className="font-mono">{settings.companyPhone}</span></p>
                        </div>
                      </div>
                      <div className="text-left dir-ltr flex flex-col items-end shrink-0">
                        <span className="bg-teal-500 text-slate-950 text-[9px] font-extrabold px-3 py-1 rounded-full mb-1">
                          Tax Invoice
                        </span>
                        <span className="text-gray-400 text-[8px] font-bold mb-1">
                          فاتورة ضريبية
                        </span>
                        <p className="font-mono font-black text-sm text-teal-400">{currentInv.invoiceNumber}</p>
                        <p className="text-[8px] text-gray-300">{currentInv.date}</p>
                      </div>
                    </div>

                    {/* Client & Status details with border grids */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-teal-50/50 p-3 rounded-2xl border border-teal-100 space-y-1">
                        <span className="text-[8px] font-extrabold text-teal-800 uppercase tracking-wider block">معلومات العميل / Customer Details</span>
                        <span className="text-xs font-black text-slate-900 block">{currentInv.customerName}</span>
                        {currentInv.customerTaxNumber && (
                          <p className="text-[9px] text-slate-700">الرقم الضريبي: <span className="font-mono font-bold">{currentInv.customerTaxNumber}</span></p>
                        )}
                        {currentInv.customerPhone && (
                          <p className="text-[9px] text-slate-600 font-mono">الجوال: {currentInv.customerPhone}</p>
                        )}
                      </div>

                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex justify-between items-center">
                        <div className="space-y-1">
                          <span className="text-[8px] font-extrabold text-slate-500 block">حالة الفاتورة</span>
                          <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full ${
                            currentInv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {currentInv.status === 'paid' ? 'مدفوعة كاملة' : 'بانتظار السداد'}
                          </span>
                        </div>
                        <div className="space-y-1 text-left">
                          <span className="text-[8px] font-extrabold text-slate-500 block">طريقة السداد</span>
                          <span className="text-[9px] font-black text-slate-800 block">
                            {currentInv.paymentMethod === 'cash' ? 'نقدي' :
                             currentInv.paymentMethod === 'card' ? 'مدى / بطاقة' :
                             currentInv.paymentMethod === 'apple_pay' ? 'Apple Pay' : 'تحويل بنكي'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="flex-1 overflow-x-auto">
                      <table className="w-full text-right text-[9px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                            <th className="p-2">البند</th>
                            <th className="p-2 text-center">الكمية</th>
                            <th className="p-2 text-center">سعر الوحدة</th>
                            <th className="p-2 text-center">الخصم</th>
                            <th className="p-2 text-center">الضريبة</th>
                            <th className="p-2 text-left">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentInv.items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2 font-bold text-slate-800">
                                <div>{it.description}</div>
                                {it.descriptionEn && <span className="text-[7.5px] text-gray-400 font-mono block">{it.descriptionEn}</span>}
                              </td>
                              <td className="p-2 text-center font-mono">{it.quantity}</td>
                              <td className="p-2 text-center font-mono">{it.unitPrice.toFixed(2)}</td>
                              <td className="p-2 text-center font-mono text-rose-500">-{it.discount || 0}</td>
                              <td className="p-2 text-center font-mono">{it.taxAmount?.toFixed(2)}</td>
                              <td className="p-2 text-left font-mono font-bold text-teal-700">{it.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Modern Footer with layout block */}
                    <div className="grid grid-cols-12 gap-3 pt-3 border-t border-slate-200 mt-auto items-center">
                      <div className="col-span-4 flex flex-col items-center">
                        <div className="bg-white p-1 rounded-xl border border-slate-300 shadow-sm">
                          <QRCodeSVG
                            value={getZatcaQrValue(currentInv)}
                            size={75}
                          />
                        </div>
                        <span className="text-[7px] text-slate-500 mt-1 font-bold">موافق هيئة الزكاة (ZATCA)</span>
                      </div>

                      <div className="col-span-8 space-y-1 text-left dir-ltr text-[9px] font-bold">
                        <div className="flex justify-between text-slate-500">
                          <span>Subtotal (Excl. VAT):</span>
                          <span>{currentInv.subtotal.toFixed(2)} {settings.currencySymbol}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Total VAT (15%):</span>
                          <span>{currentInv.taxTotal.toFixed(2)} {settings.currencySymbol}</span>
                        </div>
                        <div className="flex justify-between font-black text-teal-600 text-sm border-t border-teal-500/30 pt-1 mt-1">
                          <span>Grand Total (Incl. VAT):</span>
                          <span>{currentInv.grandTotal.toFixed(2)} {settings.currencySymbol}</span>
                        </div>
                        <p className="text-[8px] text-slate-400 mt-2 text-center font-normal leading-relaxed text-right dir-rtl">
                          {settings.invoiceFooterNote || 'شكراً لتعاملكم معنا. البضاعة المباعة تخضع لشروط الضمان والامتثال الضريبي.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. THERMAL RECEIPT 80MM TEMPLATE */}
                {selectedTemplate === 'thermal' && (
                  <div className="w-full max-w-[280px] mx-auto p-1 text-[8px] bg-white text-slate-900 space-y-2.5 font-mono flex flex-col items-center flex-1">
                    <div className="text-center space-y-0.5">
                      {settings.companyLogoUrl && (
                        <img 
                          src={settings.companyLogoUrl} 
                          alt="Logo" 
                          className="w-10 h-10 object-contain mx-auto rounded-lg mb-1"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <h2 className="text-[11px] font-black">{settings.companyName}</h2>
                      {settings.companyNameEn && <p className="text-[8px] text-slate-500 font-bold">{settings.companyNameEn}</p>}
                      <p>الرقم الضريبي: {settings.companyVatNumber}</p>
                      <p>الهاتف: {settings.companyPhone}</p>
                      {settings.companyNationalAddress && <p className="text-[7.5px] leading-none text-slate-500">{settings.companyNationalAddress}</p>}
                    </div>

                    <div className="border-t border-dashed border-slate-400 w-full" />

                    <div className="w-full space-y-0.5 text-right">
                      <p className="font-bold text-[9px] text-center bg-slate-100 py-0.5">
                        فاتورة ضريبية
                      </p>
                      <p className="font-bold">رقم الفاتورة: {currentInv.invoiceNumber}</p>
                      <p>تاريخ الفاتورة: {currentInv.date}</p>
                      <p>العميل: {currentInv.customerName}</p>
                      {currentInv.customerTaxNumber && <p>الرقم الضريبي للعميل: {currentInv.customerTaxNumber}</p>}
                    </div>

                    <div className="border-t border-dashed border-slate-400 w-full" />

                    {/* Items compactly stacked */}
                    <div className="w-full space-y-1.5 text-[7.5px]">
                      <div className="flex justify-between font-bold border-b border-dashed border-slate-300 pb-1 mb-1">
                        <span className="w-1/2">الصنف</span>
                        <span className="w-1/6 text-center">الكمية</span>
                        <span className="w-1/3 text-left">الإجمالي</span>
                      </div>
                      {currentInv.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                          <div className="w-1/2 leading-tight">
                            <span className="font-bold text-slate-900">{it.description}</span>
                            {it.descriptionEn && <span className="block text-[6.5px] text-gray-500 font-sans">{it.descriptionEn}</span>}
                          </div>
                          <span className="w-1/6 text-center font-mono">{it.quantity} {it.unit || 'حبة'}</span>
                          <span className="w-1/3 text-left font-mono font-bold">{(it.total).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-dashed border-slate-400 w-full" />

                    {/* Totals stack */}
                    <div className="w-full space-y-1 font-bold text-[8px]">
                      <div className="flex justify-between">
                        <span>المجموع الفرعي (غير شامل ضريبة):</span>
                        <span>{currentInv.subtotal.toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ضريبة القيمة المضافة (15%):</span>
                        <span>{currentInv.taxTotal.toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black border-t border-slate-900 pt-1">
                        <span>المجموع الكلي النهائي:</span>
                        <span>{currentInv.grandTotal.toFixed(2)} ر.س</span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-slate-400 w-full" />

                    <div className="flex flex-col items-center gap-1">
                      <QRCodeSVG
                        value={getZatcaQrValue(currentInv)}
                        size={80}
                      />
                      <span className="text-[7px] text-slate-500 font-bold mt-1">رمز التحقق الإلكتروني لهيئة الزكاة</span>
                    </div>

                    <div className="text-[7px] text-slate-400 text-center leading-normal max-w-[200px] mt-2">
                      {settings.invoiceFooterNote || (
                        <>
                          شكراً لزيارتكم وثقتكم بنا.<br />
                          تخضع السلع لسياسة الاستبدال الضريبي والبلدي.
                        </>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Action Buttons: Download PDF, Share WhatsApp, Email, Print */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-white no-print">
                <button
                  onClick={() => handleExportPdf(currentInv)}
                  className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-2 px-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <FileDown className="w-4 h-4" />
                  <span>تصدير PDF</span>
                </button>

                <button
                  onClick={() => handleShareWhatsApp(currentInv)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>واتساب</span>
                </button>

                <button
                  onClick={() => handleShareEmail(currentInv)}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <Mail className="w-4 h-4" />
                  <span>البريد الإلكتروني</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة</span>
                </button>

                {onGenerateReceipt && (
                  <button
                    onClick={() => onGenerateReceipt(currentInv)}
                    className="col-span-2 sm:col-span-4 mt-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black py-3 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                  >
                    <Banknote className="w-5 h-5" />
                    <span>توليد سند قبض لهذا الرقم</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* CREATE INVOICE FORM */
            <form onSubmit={handleSave} className="space-y-4 pt-3">
              {/* Invoice Type Toggle */}
              <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 space-y-2 mb-4 shadow-lg shadow-teal-500/5">
                <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                  <FileDown className="w-3.5 h-3.5 text-teal-400" />
                  نوع الفاتورة الضريبية
                </label>
                <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setInvoiceType('simplified')}
                    className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all ${
                      invoiceType === 'simplified' ? 'bg-teal-500 text-white shadow-lg' : 'text-gray-500'
                    }`}
                  >
                    فاتورة ضريبية (B2C)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceType('standard')}
                    className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all ${
                      invoiceType === 'standard' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-500'
                    }`}
                  >
                    فاتورة ضريبية (B2B)
                  </button>
                </div>
                <p className="text-[9px] text-gray-500 text-center">
                  {invoiceType === 'simplified' 
                    ? 'تستخدم للمبيعات النقدية للأفراد والعملاء العاديين.' 
                    : 'تستخدم للشركات والمؤسسات التي تتطلب خصم ضريبي.'}
                </p>
              </div>

              {/* ZATCA Phase Toggle (Specialized Requirement) */}
              <div className="bg-slate-950 border border-cyan-500/20 rounded-2xl p-4 space-y-3 shadow-lg shadow-cyan-500/5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    متطلبات هيئة الزكاة (ZATCA)
                  </label>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${zatcaPhase === 'phase2' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-gray-500'}`}>
                    {zatcaPhase === 'phase2' ? 'المرحلة 2 مفعّلة' : 'المرحلة 1'}
                  </span>
                </div>

                <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setZatcaPhase('phase1');
                      // Clear Phase 2 specific data
                      setUuid('');
                      setInvoiceHash('');
                    }}
                    className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      zatcaPhase === 'phase1' ? 'bg-slate-800 text-white border border-white/10' : 'text-gray-500'
                    }`}
                  >
                    <QrCode className="w-3 h-3" />
                    المرحلة الأولى (QR كلاسيك)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZatcaPhase('phase2');
                      // Generate metadata if empty
                      if (!uuid) {
                        const meta = generateZatcaPhase2Metadata(
                          generatedInvoiceNumber || 'INV-20970',
                          date,
                          grandTotal
                        );
                        setUuid(meta.uuid);
                        setInvoiceHash(meta.invoiceHash);
                        setEcdsaSignature(meta.ecdsaSignature);
                        setCryptographicStamp(meta.cryptographicStamp);
                      }
                    }}
                    className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      zatcaPhase === 'phase2' ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-500'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    المرحلة الثانية (ربط وتكامل)
                  </button>
                </div>
                
                {zatcaPhase === 'phase2' && (
                  <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-cyan-400" />
                      <p className="text-[9px] text-cyan-100 font-bold">تم توليد المعرف الفريد والهاش الرقمي وتوقيع الفاتورة تلقائياً</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[8px] font-mono opacity-60">
                      <div className="truncate">UUID: {uuid || 'Pending...'}</div>
                      <div className="truncate">HASH: {invoiceHash || 'Pending...'}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                    بيانات العميل
                  </label>
                  
                  {customers.length > 0 && (
                    <div className="space-y-2 mb-2">
                      <div className="flex items-center justify-between text-[9px] font-bold text-blue-400">
                        <span>الاختيار السريع للعملاء المحفوظين</span>
                        <span className="text-gray-500">انقر للتعبئة التلقائية السريعة</span>
                      </div>
                      
                      {/* Horizontal swipe avatar carousel */}
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x dir-rtl">
                        {customers.slice(0, 8).map((c) => {
                          const isSelected = customerName.trim() === c.name.trim();
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectCustomer(c.id)}
                              className={`flex flex-col items-center gap-1.5 shrink-0 p-2 rounded-2xl border transition-all snap-start w-16 active:scale-95 ${
                                isSelected 
                                  ? 'bg-blue-500/20 border-blue-500/60 shadow-lg shadow-blue-500/10 scale-105' 
                                  : 'bg-slate-900/60 border-white/5 hover:border-white/10'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(c.name)} flex items-center justify-center text-[10px] font-black tracking-wider uppercase shrink-0 shadow-md`}>
                                {getInitials(c.name)}
                              </div>
                              <span className="text-[8px] font-extrabold text-gray-300 truncate w-12 text-center block">
                                {c.name.split(' ')[0]}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Search Select */}
                      <div className="relative">
                        <select
                          onChange={(e) => {
                            if (e.target.value) handleSelectCustomer(e.target.value);
                          }}
                          className="w-full bg-slate-900 border border-blue-500/20 rounded-2xl p-2.5 pl-10 text-xs text-blue-400 focus:outline-none focus:border-blue-500 appearance-none font-bold shadow-sm"
                        >
                          <option value="">-- أو اختر من قائمة البحث الكاملة --</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name} {c.taxNumber ? `| ${c.taxNumber}` : ''}</option>
                          ))}
                        </select>
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50 pointer-events-none" />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                          <span className="text-[10px] text-blue-500/50 font-bold">كل العملاء</span>
                          <Search className="w-3 h-3 text-blue-500/50" />
                        </div>
                      </div>
                    </div>
                  )}

                  <input
                    required
                    type="text"
                    placeholder="اسم العميل أو المؤسسة..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-teal-400" />
                    الرقم الضريبي للعميل (إن وجد)
                  </label>
                  <input
                    type="text"
                    placeholder="300XXXXXXXXXXXX"
                    value={customerTaxNum}
                    onChange={(e) => setCustomerTaxNum(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-teal-500 font-mono shadow-inner"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-teal-400" />
                    رقم الجوال للواتساب
                  </label>
                  <input
                    type="tel"
                    placeholder="050XXXXXXXX"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-teal-500 font-mono shadow-inner text-left"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-teal-400" />
                    البريد الإلكتروني للعميل
                  </label>
                  <input
                    type="email"
                    placeholder="info@customer.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all shadow-inner text-left"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    العنوان الوطني للعميل
                  </label>
                  <textarea
                    rows={2}
                    placeholder="المدينة، الحي، رقم المبنى..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all shadow-inner resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-bold block mb-1">طريقة الدفع</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="cash">نقداً (Cash)</option>
                    <option value="card">بطاقة صراف (Card)</option>
                    <option value="apple_pay">Apple Pay</option>
                    <option value="bank_transfer">تحويل بنكي (Bank Transfer)</option>
                    <option value="stc_pay">STC Pay</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-300 font-bold block mb-1">حالة الفاتورة</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'paid' | 'pending')}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="pending">بانتظار السداد (Pending)</option>
                    <option value="paid">مدفوعة (Paid)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1">
                  <label className="text-xs text-gray-300 font-bold block mb-1">تاريخ الإصدار</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-gray-300 font-bold block mb-1">تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300">بنود الفاتورة والخدمات</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-teal-400 hover:underline text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة بند جديد
                  </button>
                </div>

                {items.map((it, idx) => (
                  <div key={it.id} className="bg-slate-950 border border-white/10 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-teal-400">بند #{idx + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.id)}
                          className="text-rose-400 p-1 hover:bg-rose-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {products.length > 0 && (
                      <div className="relative">
                        <select
                          value={it.productId || ''}
                          onChange={(e) => handleSelectProduct(it.id, e.target.value)}
                          className="w-full bg-slate-900 border border-teal-500/30 rounded-xl p-2.5 pl-10 text-xs text-teal-400 focus:outline-none focus:border-teal-500 mb-1 appearance-none shadow-lg shadow-teal-500/5 font-bold"
                        >
                          <option value="">-- اختر صنفاً مخزناً (Inventory) --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} | {p.barcode} | {formatCurrency(p.price, settings.currency, settings.language)}
                            </option>
                          ))}
                        </select>
                        <Package className="absolute left-3 top-[11px] w-4 h-4 text-teal-500/50 pointer-events-none" />
                        <div className="absolute right-3 top-[11px] flex items-center gap-1 pointer-events-none">
                          <span className="text-[10px] text-teal-500/50 font-bold">اختر صنف</span>
                          <Search className="w-3 h-3 text-teal-500/50" />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="وصف السلعة (بالعربي)..."
                        value={it.description}
                        onChange={(e) => handleUpdateItem(it.id, 'description', e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-teal-500"
                      />
                      <input
                        type="text"
                        placeholder="Item Description (English)..."
                        value={it.descriptionEn || ''}
                        onChange={(e) => handleUpdateItem(it.id, 'descriptionEn', e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono text-left"
                        dir="ltr"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="sm:col-span-1">
                        <span className="text-[10px] text-gray-400 block mb-0.5">الكمية</span>
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => handleUpdateItem(it.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl p-1.5 text-center font-mono text-white"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <span className="text-[10px] text-gray-400 block mb-0.5">الوحدة</span>
                        <select
                          value={it.unit || 'حبة'}
                          onChange={(e) => handleUpdateItem(it.id, 'unit', e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl p-1.5 text-center text-white text-[10px]"
                        >
                          {/* Ensure the item's unit is always in the list if it's custom */}
                          {Array.from(new Set([...units, it.unit || 'حبة'])).map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-1">
                        <span className="text-[10px] text-gray-400 block mb-0.5">سعر الوحدة</span>
                        <input
                          type="number"
                          min="0"
                          value={it.unitPrice}
                          onChange={(e) => handleUpdateItem(it.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl p-1.5 text-center font-mono text-white"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <span className="text-[10px] text-gray-400 block mb-0.5">الخصم</span>
                        <input
                          type="number"
                          min="0"
                          value={it.discount || 0}
                          onChange={(e) => handleUpdateItem(it.id, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl p-1.5 text-center font-mono text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900/40 p-2 rounded-xl">
                      <span className="text-[10px] text-gray-500 font-bold">الضريبة (15%): <span className="text-teal-500 font-mono">{(it.taxAmount || 0).toFixed(2)}</span></span>
                      <span className="text-[10px] text-gray-500 font-bold">الإجمالي: <span className="text-emerald-400 font-mono">{it.total.toFixed(2)}</span></span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Card */}
              <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3 space-y-1 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono text-white">{subtotal.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>ضريبة القيمة المضافة (15%):</span>
                  <span className="font-mono text-white">{taxTotal.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between font-extrabold text-emerald-400 text-sm border-t border-white/10 pt-1">
                  <span>الإجمالي النهائي (ZATCA):</span>
                  <span className="font-mono">{grandTotal.toFixed(2)} ر.س</span>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-extrabold py-3 rounded-2xl shadow-lg shadow-teal-500/20 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>إصدار الفاتورة وتوليد QR</span>
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
