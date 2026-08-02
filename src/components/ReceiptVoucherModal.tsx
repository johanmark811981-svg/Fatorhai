import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Share2, FileDown, Mail, Check, Building2, User, Calendar, Hash, Banknote, FileText } from 'lucide-react';
import { AppSettings, Invoice, ReceiptVoucher, PaymentMethod } from '../types';
import { formatCurrency, formatDate, generateId, numberToArabicWords } from '../utils/formatters';
import { exportElementToPdf, printElement, shareViaWhatsApp, shareViaEmail } from '../utils/exportToPdf';

interface ReceiptVoucherModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  settings: AppSettings;
  onClose: () => void;
  onSave: (voucher: ReceiptVoucher) => void;
}

export const ReceiptVoucherModal: React.FC<ReceiptVoucherModalProps> = ({
  isOpen,
  invoice,
  settings,
  onClose,
  onSave,
}) => {
  const [amount, setAmount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [receiptTemplate, setReceiptTemplate] = useState<'daftara' | 'classic' | 'modern'>('daftara');

  useEffect(() => {
    if (invoice) {
      setAmount(invoice.grandTotal);
      setCustomerName(invoice.customerName);
      setPaymentMethod(invoice.paymentMethod || 'cash');
      setVoucherNumber(`RV-${invoice.invoiceNumber.replace('INV-', '')}`);
      setNotes(`سداد للفاتورة رقم: ${invoice.invoiceNumber}`);
    } else {
      setVoucherNumber(`RV-${Date.now().toString().slice(-6)}`);
    }
  }, [invoice, isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    printElement('receipt-printable-container');
  };

  const handleExportPdf = () => {
    exportElementToPdf('receipt-printable-container', `Receipt-${voucherNumber}.pdf`);
  };

  const handleShareWhatsApp = () => {
    const text = `*سند قبض - ${settings.companyName}*\nرقم السند: ${voucherNumber}\nاستلمنا من: ${customerName}\nبمبلغ: ${amount.toFixed(2)} ${settings.currencySymbol}\nوذلك عن: ${notes}\nالتاريخ: ${date}`;
    shareViaWhatsApp(`سند قبض ${voucherNumber}`, text, invoice?.customerPhone || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const voucher: ReceiptVoucher = {
      id: generateId('rv'),
      voucherNumber,
      invoiceId: invoice?.id,
      invoiceNumber: invoice?.invoiceNumber,
      customerName,
      amount,
      date,
      paymentMethod,
      notes,
    };
    onSave(voucher);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md dir-rtl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl text-white max-h-[92vh] overflow-y-auto my-auto"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-extrabold text-white">توليد سند قبض</h2>
            </div>
            <button
              onClick={onClose}
              className="bg-slate-800 text-gray-400 hover:text-white p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {/* Template Selector Bar (No-Print) */}
            <div className="flex gap-2 p-1.5 bg-slate-950/80 border border-white/10 rounded-2xl print:hidden">
              <button
                type="button"
                onClick={() => setReceiptTemplate('daftara')}
                className={`flex-1 py-2 px-3 text-center text-xs font-black rounded-xl transition-all ${
                  receiptTemplate === 'daftara'
                    ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md border border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🏛️ قالب دفترة الضريبي
              </button>
              <button
                type="button"
                onClick={() => setReceiptTemplate('classic')}
                className={`flex-1 py-2 px-3 text-center text-xs font-black rounded-xl transition-all ${
                  receiptTemplate === 'classic'
                    ? 'bg-slate-800 text-white border border-white/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                الرسمي الكلاسيكي
              </button>
              <button
                type="button"
                onClick={() => setReceiptTemplate('modern')}
                className={`flex-1 py-2 px-3 text-center text-xs font-black rounded-xl transition-all ${
                  receiptTemplate === 'modern'
                    ? 'bg-slate-800 text-white border border-white/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                العصري الملون
              </button>
            </div>

            {/* View Mode Component (The actual receipt) */}
            <div id="receipt-printable-container" className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-inner border border-gray-200 min-h-[460px] flex flex-col space-y-6 relative overflow-hidden font-sans">
              
              {/* DAFTARA TEMPLATE */}
              {receiptTemplate === 'daftara' ? (
                <div className="space-y-6 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-4 rounded-xl flex justify-between items-center shadow-sm">
                    <div className="flex gap-3 items-center">
                      {settings.companyLogoUrl ? (
                        <img src={settings.companyLogoUrl} alt="Logo" className="w-14 h-14 object-contain rounded-lg bg-white p-1" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-xl">
                          <Building2 className="w-6 h-6 text-cyan-300" />
                        </div>
                      )}
                      <div>
                        <h1 className="text-base font-black text-white">{settings.companyName || 'شركة كواليتي لينكس'}</h1>
                        <p className="text-[10px] text-blue-200">الرقم الضريبي: <span className="font-mono font-bold">{settings.companyVatNumber || '300000000000003'}</span></p>
                      </div>
                    </div>
                    <div className="text-left dir-ltr">
                      <span className="bg-amber-400 text-slate-950 px-3 py-1 rounded-lg text-xs font-black uppercase inline-block mb-1">
                        RECEIPT VOUCHER
                      </span>
                      <p className="text-[10px] font-mono font-bold text-blue-200">NO: <span className="text-white">{voucherNumber}</span></p>
                      <p className="text-[10px] font-mono text-blue-200">DATE: {date}</p>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 space-y-4 pt-2 text-xs">
                    <div className="flex items-center gap-3 bg-blue-50/70 p-3 rounded-xl border border-blue-100">
                      <span className="font-black text-blue-950 shrink-0">استلمنا من المكرم / السيد:</span>
                      <span className="font-bold text-slate-900 text-sm flex-1">{customerName || 'عميل نقدي'}</span>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="font-black text-slate-900 shrink-0">مبلغ وقدره:</span>
                      <span className="font-mono font-black text-base text-blue-900 bg-white px-3 py-1 rounded-lg border border-blue-200 shadow-sm">
                        {formatCurrency(amount, settings.currency, 'ar')}
                      </span>
                      <span className="text-[11px] font-extrabold text-slate-600">({numberToArabicWords(amount)})</span>
                    </div>

                    <div className="flex items-center gap-3 bg-blue-50/40 p-3 rounded-xl border border-blue-100">
                      <span className="font-black text-blue-950 shrink-0">وذلك عن:</span>
                      <span className="font-bold text-slate-800 flex-1">{notes || 'سداد مستحقات فاتورة'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold block">وسيلة الدفع المستلمة:</span>
                        <span className="font-black text-sm text-slate-900">
                          {paymentMethod === 'cash' ? '💵 نقداً (Cash)' :
                           paymentMethod === 'card' ? '💳 بطاقة مدى / شبكة' :
                           paymentMethod === 'bank_transfer' ? '🏦 تحويل بنكي' : '📲 إلكتروني'}
                        </span>
                      </div>

                      {/* Signature */}
                      <div className="flex justify-end items-center gap-4 text-center">
                        <div>
                          <div className="w-28 border-b-2 border-slate-900 pb-1"></div>
                          <p className="text-[9px] font-black text-slate-600 mt-1">توقيع المستلم / Receiver Signature</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* CLASSIC/MODERN TEMPLATE */
                <div className="space-y-6 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                    <div className="space-y-1">
                      <h1 className="text-xl font-black">{settings.companyName}</h1>
                      <p className="text-[10px] text-slate-500">{settings.companyNationalAddress}</p>
                      <p className="text-[10px] text-slate-500 font-mono">VAT: {settings.companyVatNumber}</p>
                    </div>
                    <div className="text-left">
                      <h2 className="text-2xl font-black text-slate-900">سند قبض</h2>
                      <p className="text-xs font-bold text-slate-500">Receipt Voucher</p>
                      <div className="mt-2 space-y-0.5">
                        <p className="text-[10px] font-bold">No: <span className="font-mono text-xs">{voucherNumber}</span></p>
                        <p className="text-[10px] font-bold">Date: <span className="font-mono text-xs">{date}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Receipt Content */}
                  <div className="flex-1 space-y-6 pt-4">
                    <div className="flex items-center gap-4 border-b border-dashed border-slate-300 pb-2">
                      <span className="text-sm font-bold text-slate-500 shrink-0">استلمنا من السيد/السادة:</span>
                      <span className="text-sm font-black border-b border-slate-900 flex-1 px-2">{customerName}</span>
                    </div>

                    <div className="flex items-center gap-4 border-b border-dashed border-slate-300 pb-2">
                      <span className="text-sm font-bold text-slate-500 shrink-0">مبلغ وقدره:</span>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-sm font-black bg-slate-100 px-4 py-1 rounded-lg border border-slate-200">{formatCurrency(amount, settings.currency, 'ar')}</span>
                        <span className="text-[10px] text-slate-500 font-bold">({numberToArabicWords(amount)})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 border-b border-dashed border-slate-300 pb-2">
                      <span className="text-sm font-bold text-slate-500 shrink-0">وذلك عن:</span>
                      <span className="text-sm font-bold border-b border-slate-900 flex-1 px-2">{notes}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">طريقة الدفع:</span>
                          <span className="text-xs font-black">{
                            paymentMethod === 'cash' ? 'نقداً' :
                            paymentMethod === 'card' ? 'بطاقة' :
                            paymentMethod === 'bank_transfer' ? 'تحويل' :
                            paymentMethod === 'apple_pay' ? 'Apple Pay' : 'أخرى'
                          }</span>
                        </div>
                      </div>
                      <div className="text-center space-y-8">
                        <div className="border-b border-slate-900 pb-1 mx-auto w-32"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">توقيع المستلم / Receiver Signature</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Decoration */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-900"></div>
            </div>

            {/* Editable Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">رقم السند</label>
                  <input
                    type="text"
                    value={voucherNumber}
                    onChange={(e) => setVoucherNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">التاريخ</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400">استلمنا من</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">المبلغ</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">طريقة الدفع</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="cash">نقداً</option>
                    <option value="card">بطاقة</option>
                    <option value="bank_transfer">تحويل بنكي</option>
                    <option value="apple_pay">Apple Pay</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400">البيان / وذلك عن</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <FileDown className="w-4 h-4 text-amber-400" />
                  <span>تصدير PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>طباعة</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>واتساب</span>
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black py-4 rounded-2xl shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>حفظ السند في النظام</span>
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
