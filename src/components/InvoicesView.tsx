import React, { useState, useRef } from 'react';
import { FileText, Plus, CheckCircle2, Clock, AlertCircle, Share2, Printer, Eye, QrCode, Edit2, Trash2, ShieldCheck, X, FileDown, UploadCloud, Loader2, Building2, Users, Banknote } from 'lucide-react';
import { AppSettings, Invoice } from '../types';
import { formatCurrency, formatDate, generateZatcaQrData, numberToArabicWords } from '../utils/formatters';
import { BulkInvoiceUpload } from './BulkInvoiceUpload';
import { exportBatchInvoicesDirectPdf } from '../utils/exportToPdf';
import { QRCodeSVG } from 'qrcode.react';

interface InvoicesViewProps {
  settings: AppSettings;
  hideValues: boolean;
  invoices: Invoice[];
  onOpenCreateInvoiceModal: (phase?: 'phase1' | 'phase2', type?: 'simplified' | 'standard') => void;
  onSelectInvoiceToView: (inv: Invoice) => void;
  onEditInvoice: (inv: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onDeleteAllInvoices: () => void;
  onBulkAddInvoices: (invoices: Invoice[]) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  settings,
  hideValues,
  invoices,
  onOpenCreateInvoiceModal,
  onSelectInvoiceToView,
  onEditInvoice,
  onDeleteInvoice,
  onDeleteAllInvoices,
  onBulkAddInvoices,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string, invoiceNumber: string } | null>(null);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  const batchPrintRef = useRef<HTMLDivElement>(null);

  const filteredInvoices = invoices.filter(
    (inv) => filterStatus === 'all' || inv.status === filterStatus
  );

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.grandTotal, 0);

  const mask = (val: string) => (hideValues ? '••••••' : val);

  const getZatcaQrValue = (inv: Invoice) => {
    return generateZatcaQrData(
      settings.companyName,
      settings.companyVatNumber,
      inv.date,
      inv.grandTotal,
      inv.taxTotal,
      {
        isPhase2: true,
        invoiceHash: inv.invoiceHash,
        ecdsaSignature: inv.ecdsaSignature,
        ecdsaPublicKey: inv.ecdsaPublicKey,
        cryptographicStamp: inv.cryptographicStamp
      }
    );
  };

  const handleDeleteConfirm = () => {
    if (adminPinInput === settings.adminPin) {
      if (isDeleteAllConfirmOpen) {
        onDeleteAllInvoices();
        setIsDeleteAllConfirmOpen(false);
        setAdminPinInput('');
        setPinError(false);
        return;
      }
      if (deleteConfirmation) {
        onDeleteInvoice(deleteConfirmation.id);
        setDeleteConfirmation(null);
        setAdminPinInput('');
        setPinError(false);
      }
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 2000);
    }
  };

  const handleExportAllPdf = async () => {
    if (invoices.length === 0) return;
    setIsExportingPdf(true);
    setExportProgress(0);

    try {
      await exportBatchInvoicesDirectPdf(
        'batch-invoices-printable-container',
        `الفواتير_دفعة_واحدة_${new Date().toISOString().slice(0, 10)}.pdf`,
        (progress) => setExportProgress(progress)
      );
    } catch (err) {
      console.error('Batch PDF Export Error:', err);
    } finally {
      setIsExportingPdf(false);
      setExportProgress(0);
    }
  };

  return (
    <div className="flex-1 p-3 space-y-3.5 pb-20 dir-rtl text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-white">الفواتير الضريبية (ZATCA)</h2>
            <span className="bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-sm">
              المرحلة الثانية مفعّلة
            </span>
          </div>
          <p className="text-[11px] text-gray-400">إصدار الفواتير المعتمدة لربط منصة فاتورة وهيئة الزكاة</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Main ZATCA Simplified Invoice Button */}
          <button
            onClick={() => onOpenCreateInvoiceModal('phase2', 'simplified')}
            className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 border border-emerald-300/40"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <QrCode className="w-4 h-4 text-slate-950" />
            <span>انشاء فاتورة مبسطة (B2C)</span>
          </button>

          {/* Standard Tax Invoice Button */}
          <button
            onClick={() => onOpenCreateInvoiceModal('phase2', 'standard')}
            className="bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-cyan-500/30 transition-all active:scale-95 shadow-lg shadow-cyan-500/10"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>انشاء فاتورة ضريبية (B2B)</span>
          </button>

          <button
            onClick={() => onOpenCreateInvoiceModal('phase1', 'simplified')}
            className="bg-slate-900/80 hover:bg-slate-800 text-gray-400 font-bold px-2.5 py-2 rounded-xl text-[10px] flex items-center gap-1 border border-white/5 transition-all"
            title="فاتورة كلاسيكية مرحلة 1"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>فاتورة مرحلة 1</span>
          </button>

          <button
            onClick={() => setShowBulkUpload(!showBulkUpload)}
            className={`font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 border ${
              showBulkUpload 
                ? 'bg-amber-500 text-slate-950 border-amber-300/40 shadow-lg shadow-amber-500/20' 
                : 'bg-slate-800 text-amber-400 border-amber-500/30'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>النظام الآلي (Bulk)</span>
          </button>

          <button
            onClick={handleExportAllPdf}
            disabled={isExportingPdf || invoices.length === 0}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 transition-all active:scale-95 border border-indigo-400/30"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري التصدير ({exportProgress}%)</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>تصدير الكل PDF</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsDeleteAllConfirmOpen(true)}
            disabled={invoices.length === 0}
            className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-rose-500/30 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span>حذف الكل</span>
          </button>
        </div>
      </div>

      {showBulkUpload && (
        <div className="animate-in fade-in zoom-in-95 duration-200">
          <BulkInvoiceUpload 
            settings={settings} 
            lastInvoiceNumber={invoices.length > 0 ? invoices[0].invoiceNumber : undefined}
            onInvoicesGenerated={async (newInvoices) => {
              await onBulkAddInvoices(newInvoices);
              // Wait a moment so user can see success message if component didn't unmount yet
              // but since we call setShowBulkUpload(false) below, it will unmount.
              // Actually, handleBulkAddInvoices in App.tsx shows a notification, 
              // so closing here is fine as long as we wait for the upload.
              setShowBulkUpload(false);
            }}
          />
        </div>
      )}

      {/* ZATCA Phase 2 Compliance Notice Box */}
      <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900 to-teal-950/80 border border-cyan-500/30 rounded-3xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-xs font-black text-cyan-300">متوافق مع متطلبات مرحلة الربط والتكامل (ZATCA Phase 2)</span>
          </div>
          <p className="text-[10px] text-gray-300">
            توليد التوقيع الرقمي (ECDSA secp256k1) وهاش الفاتورة (SHA-256) والمعرف الفريد (UUID v4) والـ 9 TLV Tags المعيارية تلقائياً.
          </p>
        </div>
        <div className="text-left text-xs shrink-0 flex items-center gap-2">
          <div className="text-right">
            <span className="text-[9px] text-gray-400 block">إجمالي الفواتير</span>
            <span className="text-base font-black text-emerald-400 font-mono dir-ltr">
              {mask(formatCurrency(totalInvoiced, settings.currency, settings.language))}
            </span>
          </div>
        </div>
      </div>

      {/* Filter status pills */}
      <div className="flex items-center gap-1.5 text-xs">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1 rounded-xl font-bold transition-all ${
            filterStatus === 'all' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-gray-400'
          }`}
        >
          الكل ({invoices.length})
        </button>
        <button
          onClick={() => setFilterStatus('paid')}
          className={`px-3 py-1 rounded-xl font-bold transition-all ${
            filterStatus === 'paid' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-emerald-400'
          }`}
        >
          مدفوعة
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-3 py-1 rounded-xl font-bold transition-all ${
            filterStatus === 'pending' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-amber-400'
          }`}
        >
          معلقة (بانتظار التحصيل)
        </button>
      </div>

      {/* Invoices List */}
      <div className="space-y-2">
        {filteredInvoices.map((inv) => (
          <div
            key={inv.id}
            className="bg-slate-900/80 border border-white/10 rounded-2xl p-3 flex flex-col gap-2 transition-all shadow-md group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div 
                className="flex items-center gap-2 cursor-pointer flex-1"
                onClick={() => onSelectInvoiceToView(inv)}
              >
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-extrabold text-white">{inv.invoiceNumber}</h3>
                    <span className="bg-cyan-500/20 text-cyan-300 text-[8.5px] font-black px-1.5 py-0.5 rounded-full border border-cyan-500/30 flex items-center gap-0.5 shrink-0">
                      <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" />
                      Phase 2 QR
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{inv.customerName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-left dir-ltr">
                  <span className="text-sm font-extrabold text-emerald-400 font-mono">
                    {mask(formatCurrency(inv.grandTotal, settings.currency, settings.language))}
                  </span>
                  <span
                    className={`block text-[9px] font-bold mt-0.5 rounded-full px-2 py-0.2 text-center ${
                      inv.status === 'paid'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {inv.status === 'paid' ? 'مدفوعة' : 'معلقة'}
                  </span>
                </div>
                
                {/* Actions */}
                <div className="flex flex-col gap-1.5 no-print">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditInvoice(inv); }}
                    className="p-1.5 bg-slate-800 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                    title="تعديل"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({ id: inv.id, invoiceNumber: inv.invoiceNumber }); }}
                    className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div 
              className="flex items-center justify-between border-t border-white/5 pt-1.5 text-[10px] text-gray-400 cursor-pointer"
              onClick={() => onSelectInvoiceToView(inv)}
            >
              <div className="flex gap-2">
                <span>تاريخ: {formatDate(inv.date, settings.language)}</span>
                {inv.paymentMethod && (
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[8px] font-bold text-teal-400 border border-teal-500/20">
                    {
                      inv.paymentMethod === 'cash' ? 'نقداً' :
                      inv.paymentMethod === 'card' ? 'بطاقة' :
                      inv.paymentMethod === 'apple_pay' ? 'Apple Pay' :
                      inv.paymentMethod === 'bank_transfer' ? 'تحويل' :
                      inv.paymentMethod === 'stc_pay' ? 'STC Pay' : 'أخرى'
                    }
                  </span>
                )}
              </div>
              <span className="text-teal-400 font-semibold group-hover:underline flex items-center gap-1">
                <Eye className="w-3 h-3" />
                معاينة
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">تأكيد حذف الفاتورة</h3>
              <p className="text-xs text-gray-400 mt-1">رقم الفاتورة: {deleteConfirmation.invoiceNumber}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 block">أدخل رمز حساب الأدمن للمتابعة</label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={6}
                  placeholder="رمز PIN"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  className={`w-full bg-slate-950 border ${pinError ? 'border-rose-500' : 'border-white/10'} rounded-2xl p-2.5 text-center text-sm font-mono tracking-widest text-white focus:outline-none`}
                />
                <ShieldCheck className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${pinError ? 'text-rose-500' : 'text-teal-500'}`} />
              </div>
              {pinError && <p className="text-[10px] text-rose-500">رمز PIN غير صحيح</p>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteConfirmation(null); setAdminPinInput(''); }}
                className="flex-1 bg-slate-800 text-gray-300 py-2.5 rounded-2xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 bg-rose-500 text-white py-2.5 rounded-2xl text-xs font-bold"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {isDeleteAllConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">حذف جميع الفواتير</h3>
              <p className="text-xs text-rose-400 mt-2 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف <strong>جميع</strong> الفواتير المحفوظة ({invoices.length} فاتورة)؟
                <br />
                <span className="text-[10px] opacity-70">هذا الإجراء نهائي ولا يمكن التراجع عنه.</span>
              </p>
            </div>
            
            <div className="space-y-2 pt-2">
              <label className="text-[10px] text-gray-500 block">أدخل رمز حساب الأدمن للمتابعة</label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={6}
                  placeholder="رمز PIN"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  className={`w-full bg-slate-950 border ${pinError ? 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 'border-white/10'} rounded-2xl p-2.5 text-center text-sm font-mono tracking-widest text-white focus:outline-none`}
                  autoFocus
                />
                <ShieldCheck className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${pinError ? 'text-rose-500' : 'text-teal-500'}`} />
              </div>
              {pinError && <p className="text-[10px] text-rose-500 animate-bounce">رمز PIN غير صحيح</p>}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setIsDeleteAllConfirmOpen(false); setAdminPinInput(''); setPinError(false); }}
                className="flex-1 bg-slate-800 text-gray-300 py-3 rounded-2xl text-xs font-bold transition-colors hover:bg-slate-700"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 bg-rose-600 text-white py-3 rounded-2xl text-xs font-bold transition-all hover:bg-rose-500 active:scale-95 shadow-lg shadow-rose-600/20"
              >
                تأكيد الحذف النهائي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Export Hidden Renderer */}
      <div 
        ref={batchPrintRef}
        id="batch-invoices-printable-container"
        style={{ position: 'fixed', left: '-9999px', top: 0, width: '210mm', display: 'none', backgroundColor: '#ffffff', color: '#000000' }}
        className="dir-rtl"
      >
        {invoices.map((inv) => (
          <div 
            key={inv.id} 
            data-invoice-id={inv.id}
            className="w-full max-w-[210mm] mx-auto p-6 bg-white box-border flex flex-col justify-between"
            style={{ backgroundColor: '#ffffff', minHeight: '260mm' }}
          >
            {/* DAFTARA ERP CLASSIC PROFESSIONAL TEMPLATE FOR EXPORT */}
            <div className="space-y-4 flex-1 flex flex-col font-sans bg-white" style={{ direction: 'rtl', color: '#0f172a', backgroundColor: '#ffffff' }}>
              {/* Top Header Bar with Accent Color Line */}
              <div className="pb-3 space-y-3" style={{ borderBottom: '4px solid #f59e0b' }}>
                {/* Top Banner Row */}
                <div className="flex justify-between items-start">
                  {/* Company Info Right */}
                  <div className="flex gap-3.5 items-start">
                    {settings.companyLogoUrl ? (
                      <img 
                        src={settings.companyLogoUrl} 
                        alt="Logo" 
                        className="w-20 h-20 object-contain rounded-xl p-1"
                        style={{ border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center font-black p-1 text-center shrink-0" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                        <Building2 className="w-6 h-6 mb-0.5" style={{ color: '#f59e0b' }} />
                        <span className="text-[7.5px] leading-none">Qualitylinks</span>
                      </div>
                    )}
                    <div className="space-y-0.5 text-right">
                      <h1 className="text-xl font-black leading-tight" style={{ color: '#020617' }}>
                        {settings.companyName || 'شركة كواليتي لينكس'}
                      </h1>
                      {settings.companyNameEn && (
                        <h2 className="text-[11px] font-extrabold font-mono leading-tight text-right" style={{ color: '#64748b' }}>
                          {settings.companyNameEn}
                        </h2>
                      )}
                      <div className="pt-1 space-y-0.5 text-[9.5px] font-semibold text-right" style={{ color: '#334155' }}>
                        <p>الرقم الضريبي / VAT No: <span className="font-mono font-bold" style={{ color: '#0f172a' }}>{settings.companyVatNumber || '300000000000003'}</span></p>
                        {settings.companyCommercialRegister && (
                          <p>السجل التجاري / CR No: <span className="font-mono font-bold" style={{ color: '#0f172a' }}>{settings.companyCommercialRegister}</span></p>
                        )}
                        <p>الهاتف / Tel: <span className="font-mono">{settings.companyPhone || '+966 50 000 0000'}</span></p>
                        {settings.companyNationalAddress && (
                          <p className="text-[9px]" style={{ color: '#64748b' }}>العنوان الوطني: {settings.companyNationalAddress}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Invoice Title & Metadata Box Left */}
                  <div className="text-left flex flex-col items-end shrink-0 space-y-1" style={{ direction: 'ltr' }}>
                    <div className="px-4 py-1.5 rounded-lg shadow-sm text-right" style={{ direction: 'rtl', backgroundColor: '#0f172a', color: '#ffffff' }}>
                      <h2 className="text-sm font-black" style={{ color: '#fbbf24' }}>
                        فاتورة ضريبية
                      </h2>
                      <span className="text-[8.5px] font-mono block uppercase tracking-wider text-left" style={{ direction: 'ltr', color: '#cbd5e1' }}>
                        TAX INVOICE
                      </span>
                    </div>

                    <div className="rounded-xl p-2.5 space-y-1 text-[9.5px] w-48 font-bold" style={{ direction: 'rtl', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="flex justify-between pb-1" style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#64748b' }}>رقم الفاتورة / No:</span>
                        <span className="font-mono font-extrabold" style={{ color: '#1d4ed8' }}>{inv.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between pb-1" style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#64748b' }}>تاريخ الإصدار / Date:</span>
                        <span className="font-mono" style={{ color: '#1e293b' }}>{inv.date}</span>
                      </div>
                      <div className="flex justify-between pb-1" style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#64748b' }}>تاريخ الاستحقاق / Due:</span>
                        <span className="font-mono" style={{ color: '#1e293b' }}>{inv.dueDate || inv.date}</span>
                      </div>
                      <div className="flex justify-between items-center pt-0.5">
                        <span style={{ color: '#64748b' }}>الحالة / Status:</span>
                        <span className="px-2 py-0.5 text-[8.5px] font-black rounded-md" style={{ 
                          backgroundColor: inv.status === 'paid' ? '#ecfdf5' : '#fffbeb',
                          color: inv.status === 'paid' ? '#065f46' : '#92400e',
                          border: `1px solid ${inv.status === 'paid' ? '#6ee7b7' : '#fcd34d'}`
                        }}>
                          {inv.status === 'paid' ? 'مدفوعة / PAID' : 'بانتظار السداد'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daftara Dual Grid: Seller & Billed To Customer */}
              <div className="grid grid-cols-2 gap-3 text-[9.5px] text-right">
                {/* Seller Box */}
                <div className="p-3 rounded-xl space-y-1" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div className="pb-1 mb-1 flex items-center gap-1 font-black" style={{ borderBottom: '1px solid #cbd5e1', color: '#0f172a' }}>
                    <Building2 className="w-3.5 h-3.5" style={{ color: '#1d4ed8' }} />
                    <span>بيانات المورد / Seller Details</span>
                  </div>
                  <p className="font-black text-xs" style={{ color: '#0f172a' }}>{settings.companyName || 'شركة كواليتي لينكس'}</p>
                  <p style={{ color: '#475569' }}>الرقم الضريبي: <span className="font-mono font-bold" style={{ color: '#1e293b' }}>{settings.companyVatNumber || '300000000000003'}</span></p>
                  <p style={{ color: '#475569' }}>الهاتف: <span className="font-mono">{settings.companyPhone || '+966 50 000 0000'}</span></p>
                  {settings.companyEmail && <p style={{ color: '#475569' }}>البريد: <span className="font-mono">{settings.companyEmail}</span></p>}
                </div>

                {/* Customer Box */}
                <div className="p-3 rounded-xl space-y-1" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <div className="pb-1 mb-1 flex items-center gap-1 font-black" style={{ borderBottom: '1px solid #bfdbfe', color: '#1e3a8a' }}>
                    <Users className="w-3.5 h-3.5" style={{ color: '#1d4ed8' }} />
                    <span>بيانات العميل / Billed To</span>
                  </div>
                  <p className="font-black text-xs" style={{ color: '#0f172a' }}>{inv.customerName}</p>
                  {inv.customerTaxNumber ? (
                    <p className="font-bold" style={{ color: '#334155' }}>الرقم الضريبي للعميل: <span className="font-mono" style={{ color: '#1e3a8a' }}>{inv.customerTaxNumber}</span></p>
                  ) : (
                    <p className="italic" style={{ color: '#94a3b8' }}>الرقم الضريبي: غير مسجل (عميل أفراد)</p>
                  )}
                  {inv.customerPhone && <p className="font-mono" style={{ color: '#475569' }}>الهاتف / الجوال: {inv.customerPhone}</p>}
                  {inv.customerAddress && <p style={{ color: '#475569' }}>العنوان: {inv.customerAddress}</p>}
                </div>
              </div>

              {/* Daftara Items Table */}
              <div className="flex-1 overflow-x-auto rounded-xl" style={{ border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                <table className="w-full text-right border-collapse text-[9px]">
                  <thead>
                    <tr className="font-bold text-[8.5px]" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                      <th className="p-2 text-center w-8" style={{ borderRight: '1px solid #1e293b' }}>#</th>
                      <th className="p-2" style={{ borderRight: '1px solid #1e293b' }}>تفاصيل البند والخدمة / Item & Description</th>
                      <th className="p-2 text-center" style={{ borderRight: '1px solid #1e293b' }}>الوحدة / Unit</th>
                      <th className="p-2 text-center" style={{ borderRight: '1px solid #1e293b' }}>الكمية / Qty</th>
                      <th className="p-2 text-center" style={{ borderRight: '1px solid #1e293b' }}>السعر / Unit Price</th>
                      <th className="p-2 text-center" style={{ borderRight: '1px solid #1e293b' }}>المبلغ الخاضع / Taxable</th>
                      <th className="p-2 text-center" style={{ borderRight: '1px solid #1e293b' }}>الخصم / Disc</th>
                      <th className="p-2 text-center" style={{ borderRight: '1px solid #1e293b' }}>الضريبة (15%)</th>
                      <th className="p-2 text-left">الإجمالي / Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: '#e2e8f0', backgroundColor: '#ffffff' }}>
                    {inv.items.map((it, idx) => {
                      const taxable = it.quantity * it.unitPrice;
                      return (
                        <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                          <td className="p-2 text-center font-mono" style={{ borderRight: '1px solid #e2e8f0', color: '#64748b' }}>{idx + 1}</td>
                          <td className="p-2 font-bold" style={{ borderRight: '1px solid #e2e8f0', color: '#0f172a' }}>
                            <div>{it.description}</div>
                            {it.descriptionEn && <div className="text-[8px] font-mono" style={{ color: '#94a3b8' }}>{it.descriptionEn}</div>}
                          </td>
                          <td className="p-2 text-center" style={{ borderRight: '1px solid #e2e8f0', color: '#334155' }}>{it.unit || 'حبة'}</td>
                          <td className="p-2 text-center font-mono font-bold" style={{ borderRight: '1px solid #e2e8f0', color: '#0f172a' }}>{it.quantity}</td>
                          <td className="p-2 text-center font-mono" style={{ borderRight: '1px solid #e2e8f0', color: '#1e293b' }}>{it.unitPrice.toFixed(2)}</td>
                          <td className="p-2 text-center font-mono" style={{ borderRight: '1px solid #e2e8f0', color: '#1e293b' }}>{taxable.toFixed(2)}</td>
                          <td className="p-2 text-center font-mono" style={{ borderRight: '1px solid #e2e8f0', color: '#e11d48' }}>{it.discount ? `-${it.discount.toFixed(2)}` : '0.00'}</td>
                          <td className="p-2 text-center font-mono" style={{ borderRight: '1px solid #e2e8f0', color: '#1e293b' }}>
                            {it.taxAmount?.toFixed(2)}
                          </td>
                          <td className="p-2 text-left font-mono font-black" style={{ color: '#1e3a8a' }}>{it.total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Arabic Tafqit Banner */}
              <div className="p-2 rounded-xl text-[9.5px] font-bold flex items-center justify-between text-right" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#78350f' }}>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[8.5px] font-black" style={{ backgroundColor: '#f59e0b', color: '#ffffff' }}>المبلغ المكتوب:</span>
                  <span>فقط {numberToArabicWords(inv.grandTotal)}</span>
                </div>
                <span className="text-[8px] font-mono" style={{ color: '#b45309' }}>Tafqit (Arabic Written Amount)</span>
              </div>

              {/* Bottom Section: ZATCA QR + Summary Table + Bank & Signature */}
              <div className="grid grid-cols-12 gap-3 pt-2 mt-auto items-start" style={{ borderTop: '1px solid #e2e8f0' }}>
                {/* ZATCA QR Code & Signature */}
                <div className="col-span-4 space-y-2 flex flex-col items-center">
                  <div className="p-2 rounded-xl flex flex-col items-center" style={{ backgroundColor: '#ffffff', border: '2px solid #0f172a' }}>
                    <QRCodeSVG
                      value={getZatcaQrValue(inv)}
                      size={95}
                    />
                    <span className="text-[7.5px] font-extrabold mt-1" style={{ color: '#0f172a' }}>رمز هيئة الزكاة والضريبة (ZATCA)</span>
                  </div>

                  {/* Signature Placeholder */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-28 pb-1" style={{ borderBottom: '2px solid #0f172a' }}></div>
                    <p className="text-[9px] font-black mt-1" style={{ color: '#475569' }}>توقيع المعتمد / Authorized Signature</p>
                  </div>
                </div>

                {/* Calculations Summary Box */}
                <div className="col-span-8 space-y-2 text-right">
                  <div className="p-3 rounded-xl space-y-1.5 text-[10px] font-bold" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div className="flex justify-between pb-1" style={{ color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                      <span>المجموع الفرعي (غير شامل ضريبة):</span>
                      <span className="font-mono" style={{ color: '#0f172a' }}>{inv.subtotal.toFixed(2)} {settings.currencySymbol}</span>
                    </div>
                    <div className="flex justify-between pb-1" style={{ color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                      <span>إجمالي ضريبة القيمة المضافة (15%):</span>
                      <span className="font-mono" style={{ color: '#0f172a' }}>{inv.taxTotal.toFixed(2)} {settings.currencySymbol}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg font-black text-sm" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                      <span>المبلغ الإجمالي النهائي المستحق:</span>
                      <span className="font-mono text-base" style={{ color: '#fbbf24' }}>{inv.grandTotal.toFixed(2)} {settings.currencySymbol}</span>
                    </div>
                  </div>

                  {/* Bank Transfer Details Box */}
                  {settings.bankIban && (
                    <div className="p-2 rounded-xl text-[8.5px] space-y-0.5 font-semibold" style={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe', color: '#1e3a8a' }}>
                      <div className="font-bold flex items-center gap-1 justify-end" style={{ color: '#172554' }}>
                        <Banknote className="w-3 h-3" style={{ color: '#1d4ed8' }} />
                        <span>تفاصيل الحساب البنكي للتحويل:</span>
                      </div>
                      <p>البنك: <span className="font-bold">{settings.bankName || 'البنك الأهلي / الراجحي'}</span> | الحساب: {settings.bankAccountName || settings.companyName}</p>
                      <p>رقم الآيبان (IBAN): <span className="font-mono font-bold" style={{ color: '#1e40af' }}>{settings.bankIban}</span></p>
                    </div>
                  )}

                  {/* Terms & Footer note */}
                  {settings.invoiceFooterNote && (
                    <p className="text-[8px] leading-relaxed text-center pt-1" style={{ color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
                      {settings.invoiceFooterNote}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
