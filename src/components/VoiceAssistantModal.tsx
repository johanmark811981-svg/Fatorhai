import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Square, Loader2, Sparkles, Check, AlertCircle, 
  X, Receipt, Landmark, ArrowUpDown, ShoppingBag, User, Plus, Trash2, Save 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSettings, Category, Account, Transaction, Debt, Invoice, InvoiceItem, Product, Customer } from '../types';
import { generateId, formatCurrency } from '../utils/formatters';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  accounts: Account[];
  products: Product[];
  customers: Customer[];
  settings: AppSettings;
  onSaveTransaction: (tx: Transaction) => void;
  onSaveDebt: (debt: Debt) => void;
  onSaveInvoice: (inv: Invoice) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  products,
  customers,
  settings,
  onSaveTransaction,
  onSaveDebt,
  onSaveInvoice
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualText, setManualText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'parsed' | 'success' | 'error'>('idle');

  // Parsed State Confirmation
  const [parsedType, setParsedType] = useState<'expense' | 'debt' | 'invoice' | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);

  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const transcriptRef = useRef('');

  // Keep refs in sync with states to prevent stale closure bugs in browser events
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (!isOpen) return;

    // Check if browser supports Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'ar-SA';

      rec.onresult = (event: any) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const text = result[0].transcript;
        setTranscript(text);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          setError('تم رفض إذن الوصول للميكروفون. يرجى السماح للميكروفون في إعدادات المتصفح أو استخدام خيار الكتابة اليدوية أدناه.');
        } else {
          setError('حدث خطأ في التعرف على الصوت. يرجى المحاولة مجدداً أو مراجعة سماح الميكروفون.');
        }
        setStatus('error');
        setIsRecording(false);
      };

      rec.onend = () => {
        // If the user was actively recording and it ended naturally, process it
        if (isRecordingRef.current) {
          setIsRecording(false);
          const textToProcess = transcriptRef.current;
          if (textToProcess.trim()) {
            processTranscript(textToProcess);
          } else {
            setStatus('idle');
          }
        }
      };

      recognitionRef.current = rec;
    } else {
      // Don't set error on mount, just allow manual input fallback gracefully
      console.log('SpeechRecognition is not supported on this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const startRecording = () => {
    setError(null);
    setTranscript('');
    setParsedType(null);
    setParsedData(null);
    
    if (!recognitionRef.current) {
      setError('متصفحك الحالي لا يدعم خاصية التعرف على الصوت مباشرة. يرجى استخدام حقل الكتابة اليدوية أدناه لإدخال العمليات بالذكاء الاصطناعي.');
      setStatus('error');
      return;
    }

    setStatus('recording');
    setIsRecording(true);
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error(err);
      setError('تعذر تشغيل الميكروفون. يرجى التأكد من منحه الصلاحية.');
      setStatus('error');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error(err);
      }
    }
    
    // We process immediately if we have captured transcript
    const textToProcess = transcriptRef.current || transcript;
    if (textToProcess.trim()) {
      processTranscript(textToProcess);
    } else {
      setStatus('idle');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    processTranscript(manualText);
  };

  const processTranscript = async (text: string) => {
    setIsProcessing(true);
    setStatus('processing');
    setError(null);
    
    try {
      const response = await fetch('/api/parse-voice-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const result = await response.json();

      if (result.success && result.result) {
        const { entryType, data: extractedData } = result.result;
        setParsedType(entryType);
        setParsedData(extractedData);
        setStatus('parsed');
      } else {
        setError(result.error || 'تعذر على الذكاء الاصطناعي فهم البيانات وتصنيفها بدقة. حاول التحدث بوضوح أكثر.');
        setStatus('error');
      }
    } catch (err) {
      console.error('Error processing voice input:', err);
      setError('حدث خطأ فني أثناء تحليل الصوت بالذكاء الاصطناعي.');
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Modification handlers for live confirmation
  const handleUpdateField = (field: string, value: any) => {
    setParsedData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    if (!parsedData || !parsedData.items) return;
    const updatedItems = [...parsedData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setParsedData((prev: any) => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleAddItem = () => {
    if (!parsedData) return;
    const newItem = {
      description: 'بند جديد',
      quantity: 1,
      unitPrice: 0,
      taxRate: 15
    };
    setParsedData((prev: any) => ({
      ...prev,
      items: prev.items ? [...prev.items, newItem] : [newItem]
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (!parsedData || !parsedData.items) return;
    const updatedItems = parsedData.items.filter((_: any, i: number) => i !== index);
    setParsedData((prev: any) => ({
      ...prev,
      items: updatedItems
    }));
  };

  // Calculations for invoice preview
  const getInvoiceSubtotal = () => {
    if (!parsedData || !parsedData.items) return 0;
    return parsedData.items.reduce((sum: number, item: any) => sum + (Number(item.unitPrice || 0) * Number(item.quantity || 1)), 0);
  };

  const getInvoiceTaxTotal = () => {
    if (!parsedData || !parsedData.items) return 0;
    return parsedData.items.reduce((sum: number, item: any) => {
      const lineSub = Number(item.unitPrice || 0) * Number(item.quantity || 1);
      const rate = Number(item.taxRate || 15) / 100;
      return sum + (lineSub * rate);
    }, 0);
  };

  const getInvoiceGrandTotal = () => {
    return getInvoiceSubtotal() + getInvoiceTaxTotal();
  };

  // Confirm and save to global state / Firestore
  const handleConfirmSave = () => {
    if (!parsedType || !parsedData) return;

    try {
      if (parsedType === 'expense') {
        const expenseTx: Transaction = {
          id: generateId('tx'),
          title: parsedData.title || 'مصروف صوتي مجهول',
          amount: Number(parsedData.amount || 0),
          type: 'expense',
          categoryId: parsedData.categoryId || 'cat_personal_other',
          accountId: parsedData.accountId || accounts[0]?.id || 'acc_cash_main',
          date: parsedData.date || new Date().toISOString().slice(0, 10),
          paymentMethod: 'cash',
          scope: 'personal',
          notes: parsedData.notes ? `${parsedData.notes} (مدخل بالصوت)` : 'مدخل بالصوت الذكي',
        };
        onSaveTransaction(expenseTx);

      } else if (parsedType === 'debt') {
        const debtData: Debt = {
          id: generateId('debt'),
          personName: parsedData.personName || 'شخص مجهول',
          amount: Number(parsedData.amount || 0),
          currency: parsedData.currency || 'ر.س',
          type: parsedData.type || 'owed_to_me',
          startDate: new Date().toISOString().slice(0, 10),
          status: 'pending',
          paidAmount: 0,
          notes: parsedData.notes ? `${parsedData.notes} (مدخل بالصوت)` : 'مدخل بالصوت الذكي',
        };
        onSaveDebt(debtData);

      } else if (parsedType === 'invoice') {
        const sub = getInvoiceSubtotal();
        const tax = getInvoiceTaxTotal();
        const grand = getInvoiceGrandTotal();

        // Map items to formal InvoiceItem
        const formalItems: InvoiceItem[] = (parsedData.items || []).map((item: any) => {
          const lineSub = Number(item.unitPrice || 0) * Number(item.quantity || 1);
          const rate = Number(item.taxRate || 15);
          const lineTax = lineSub * (rate / 100);
          return {
            id: generateId('item'),
            description: item.description || 'صنف مبيعات',
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            taxRate: rate,
            taxAmount: lineTax,
            unit: 'حبة',
            total: lineSub + lineTax
          };
        });

        // Determine Customer Link or Create Customer
        const customerPhone = parsedData.customerPhone || '';
        const customerName = parsedData.customerName || 'عميل نقدي مجهول';

        const customInv: Invoice = {
          id: generateId('inv'),
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
          customerName,
          customerPhone,
          customerAddress: parsedData.customerAddress || '',
          customerEmail: parsedData.customerEmail || '',
          date: new Date().toISOString().slice(0, 10),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Default 7 days
          items: formalItems,
          subtotal: sub,
          taxTotal: tax,
          grandTotal: grand,
          status: 'pending',
          paymentMethod: 'cash',
          invoiceType: 'simplified',
          notes: parsedData.notes ? `${parsedData.notes} (أُنشئت بالذكاء الاصطناعي الصوتي)` : 'صُنعت بالصوت الذكي'
        };

        onSaveInvoice(customInv);
      }

      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setParsedType(null);
        setParsedData(null);
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Error saving confirmed voice data:', err);
      setError('حدث خطأ أثناء حفظ المستند المالي المحدد.');
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md dir-rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-right text-white"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">المساعد الصوتي المحاسبي الذكي</h2>
              <p className="text-[10px] text-gray-400">سجل مصروفاً، ديناً، أو فاتورة لعملائك بصوتك</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/15 rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Workspace */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          
          {/* Recorder Panel */}
          {status !== 'parsed' && status !== 'success' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 p-6 rounded-2xl border border-white/5 flex flex-col items-center gap-4 text-center">
                
                {/* Mic Icon & Pulse Waves */}
                <div className="relative">
                  {isRecording && (
                    <motion.div
                      key="recording-pulse-outer"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.8 }}
                      className="absolute inset-0 bg-rose-500 rounded-full blur-xl"
                    />
                  )}

                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl ${
                      isRecording 
                        ? 'bg-rose-500 text-white shadow-rose-500/20' 
                        : isProcessing
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-tr from-teal-600 to-emerald-500 text-white hover:opacity-90 shadow-teal-500/10'
                    }`}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-7 h-7 animate-spin" />
                    ) : isRecording ? (
                      <Square className="w-6 h-6 fill-current" />
                    ) : (
                      <Mic className="w-7 h-7" />
                    )}
                  </button>
                </div>

                {/* Instructive Prompt Guide */}
                <div className="space-y-1 max-w-sm w-full">
                  <h3 className="text-xs font-bold text-gray-300">
                    {isRecording ? 'جاري الاستماع إليك...' : isProcessing ? 'جاري التحليل بالذكاء الاصطناعي...' : 'اضغط وتحدّث بالعامية'}
                  </h3>
                  
                  {status === 'idle' && (
                    <div className="text-[10px] text-gray-400 space-y-1.5 pt-1">
                      <p className="font-bold text-teal-400">أمثلة يمكنك قولها أو كتابتها:</p>
                      <p className="italic">"صرفت 45 ريال على مواصلات العمل اليوم"</p>
                      <p className="italic">"سجل سلفة لأحمد سالم بقيمة 300 ريال"</p>
                      <p className="italic">"فاتورة لشركة الأمل بيع حبتين شاحن بـ 60 ريال وحبة كابل بـ 15 ريال"</p>
                    </div>
                  )}

                  {isRecording && (
                    <p className="text-[11px] text-rose-400 font-medium bg-rose-500/5 border border-rose-500/10 px-3 py-1.5 rounded-xl max-w-xs mx-auto truncate italic">
                      {transcript || 'تكلم الآن، جاري الكتابة...'}
                    </p>
                  )}

                  {isProcessing && (
                    <div className="flex items-center gap-1.5 justify-center py-2">
                      <Sparkles className="w-4 h-4 text-teal-400 animate-bounce" />
                      <p className="text-xs text-teal-400 font-bold">يقوم نموذج Gemini بتصنيف العمليات وتفكيك الفاتورة...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Text Input Fallback */}
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 space-y-2">
                <span className="text-[10px] text-gray-400 font-bold block">أو اكتب العمليات يدوياً للتحليل بالذكاء الاصطناعي:</span>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    disabled={isProcessing}
                    placeholder="مثال: اشتريت وجبة غداء بـ 45 ريال..."
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !manualText.trim()}
                    className="bg-gradient-to-r from-teal-600 to-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shrink-0 disabled:opacity-40 transition-all hover:opacity-90 active:scale-95"
                  >
                    تحليل النص
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Success screen */}
          {status === 'success' && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl flex flex-col items-center gap-3 text-center py-10"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/35">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-sm font-black text-emerald-400">تم حفظ القيود بنجاح!</h3>
              <p className="text-xs text-gray-300">تمت العملية وجرى إدراج البيانات في السجلات المالية المناسبة.</p>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <p className="text-[10px] leading-relaxed">{error}</p>
            </div>
          )}

          {/* Confirmation panel for parsed voice data */}
          {status === 'parsed' && parsedType && parsedData && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400">مراجعة البيانات المستخرجة بالذكاء الاصطناعي:</span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                  parsedType === 'expense' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                  parsedType === 'debt' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' :
                  'bg-teal-500/15 text-teal-400 border border-teal-500/20'
                }`}>
                  {parsedType === 'expense' ? 'مصروف شخصي' :
                   parsedType === 'debt' ? 'دين / سلفة شخصية' :
                   'فاتورة مبيعات جديدة'}
                </span>
              </div>

              {/* 1. EXPENSE INTERFACE */}
              {parsedType === 'expense' && (
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/5 space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">وصف المصروف</label>
                    <input
                      type="text"
                      value={parsedData.title || ''}
                      onChange={(e) => handleUpdateField('title', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1">المبلغ (ر.س)</label>
                      <input
                        type="number"
                        value={parsedData.amount || 0}
                        onChange={(e) => handleUpdateField('amount', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1">التاريخ</label>
                      <input
                        type="date"
                        value={parsedData.date || new Date().toISOString().slice(0, 10)}
                        onChange={(e) => handleUpdateField('date', e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500 text-left font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1">فئة المصروف</label>
                      <select
                        value={parsedData.categoryId || 'cat_personal_other'}
                        onChange={(e) => handleUpdateField('categoryId', e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.nameAr}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1">الحساب المالي</label>
                      <select
                        value={parsedData.accountId || accounts[0]?.id || ''}
                        onChange={(e) => handleUpdateField('accountId', e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>{acc.nameAr}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">ملاحظات</label>
                    <textarea
                      rows={2}
                      value={parsedData.notes || ''}
                      onChange={(e) => handleUpdateField('notes', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-teal-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* 2. DEBT INTERFACE */}
              {parsedType === 'debt' && (
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/5 space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">اسم الشخص المدين / الدائن</label>
                    <input
                      type="text"
                      value={parsedData.personName || ''}
                      onChange={(e) => handleUpdateField('personName', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1">المبلغ</label>
                      <input
                        type="number"
                        value={parsedData.amount || 0}
                        onChange={(e) => handleUpdateField('amount', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1">العملة</label>
                      <select
                        value={parsedData.currency || 'ر.س'}
                        onChange={(e) => handleUpdateField('currency', e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                      >
                        <option value="ر.س">ريال سعودي (ر.س)</option>
                        <option value="$">دولار أمريكي ($)</option>
                        <option value="AED">درهم إماراتي</option>
                        <option value="EGP">جنيه مصري</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">طبيعة العملية</label>
                    <select
                      value={parsedData.type || 'owed_to_me'}
                      onChange={(e) => handleUpdateField('type', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="owed_to_me">سلفة أعطيتها له (أطالبه بالمبلغ / مستحق لي) 🟢</option>
                      <option value="i_owe">دين علي له (يطالبني بالمبلغ / التزام علي) 🔴</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">تفاصيل أو ملاحظات</label>
                    <textarea
                      rows={2}
                      value={parsedData.notes || ''}
                      onChange={(e) => handleUpdateField('notes', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-teal-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* 3. INVOICE INTERFACE */}
              {parsedType === 'invoice' && (
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1">اسم العميل / الشركة</label>
                      <input
                        type="text"
                        value={parsedData.customerName || ''}
                        onChange={(e) => handleUpdateField('customerName', e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                        placeholder="عميل نقدي"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1">رقم الجوال</label>
                      <input
                        type="text"
                        value={parsedData.customerPhone || ''}
                        onChange={(e) => handleUpdateField('customerPhone', e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono text-left"
                        dir="ltr"
                        placeholder="05xxxxxx"
                      />
                    </div>
                  </div>

                  {/* Items Table */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] text-gray-400 font-bold">بنود الفاتورة</label>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="text-[9px] font-black text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-lg hover:bg-teal-500/15"
                      >
                        + إضافة صنف
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {(parsedData.items || []).map((item: any, idx: number) => (
                        <div key={idx} className="bg-slate-900 p-2.5 rounded-xl border border-white/5 flex flex-col gap-2 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-gray-400">الصنف #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-400 hover:text-rose-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                            className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-teal-500"
                            placeholder="وصف السلعة المبيعة"
                          />

                          <div className="grid grid-cols-3 gap-1.5">
                            <div>
                              <span className="text-[8px] text-gray-400 block">الكمية</span>
                              <input
                                type="number"
                                value={item.quantity || 1}
                                onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-white text-center font-mono"
                              />
                            </div>
                            <div>
                              <span className="text-[8px] text-gray-400 block">السعر (ر.س)</span>
                              <input
                                type="number"
                                value={item.unitPrice || 0}
                                onChange={(e) => handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-white text-center font-mono"
                              />
                            </div>
                            <div>
                              <span className="text-[8px] text-gray-400 block">الضريبة %</span>
                              <input
                                type="number"
                                value={item.taxRate || 15}
                                onChange={(e) => handleUpdateItem(idx, 'taxRate', parseInt(e.target.value) || 15)}
                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-white text-center font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {(parsedData.items || []).length === 0 && (
                        <p className="text-[10px] text-gray-400 italic text-center py-4">لا توجد بنود بالفاتورة. يرجى إضافتها.</p>
                      )}
                    </div>
                  </div>

                  {/* Grand Totals */}
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 flex flex-col gap-1.5 text-xs font-mono">
                    <div className="flex justify-between text-gray-400 text-[10px]">
                      <span>المجموع الخاضع للضريبة (Subtotal):</span>
                      <span>{getInvoiceSubtotal().toFixed(2)} ر.س</span>
                    </div>
                    <div className="flex justify-between text-gray-400 text-[10px]">
                      <span>ضريبة القيمة المضافة (VAT 15%):</span>
                      <span>{getInvoiceTaxTotal().toFixed(2)} ر.س</span>
                    </div>
                    <div className="flex justify-between text-white font-extrabold text-[11px] border-t border-white/10 pt-1.5">
                      <span className="font-sans font-bold">المجموع الكلي (Grand Total):</span>
                      <span className="text-emerald-400">{getInvoiceGrandTotal().toFixed(2)} ر.س</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions panel */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:opacity-90 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4 text-slate-950" />
                  <span>تأكيد وحفظ البيانات</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus('idle');
                    setParsedType(null);
                    setParsedData(null);
                    setTranscript('');
                  }}
                  className="bg-slate-800 text-gray-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-white/10 transition-colors"
                >
                  إعادة المحاولة
                </button>
              </div>
            </motion.div>
          )}

        </div>
      </motion.div>
    </div>
  );
};
