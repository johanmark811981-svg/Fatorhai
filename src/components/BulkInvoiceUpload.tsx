import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, Download, Loader2, CheckCircle2, AlertCircle, FileText, Files } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Invoice, InvoiceItem, AppSettings, PaymentMethod } from '../types';
import { generateId } from '../utils/formatters';

interface BulkInvoiceUploadProps {
  settings: AppSettings;
  lastInvoiceNumber?: string;
  onInvoicesGenerated: (invoices: Invoice[]) => void;
}

export const BulkInvoiceUpload: React.FC<BulkInvoiceUploadProps> = ({
  settings,
  lastInvoiceNumber,
  onInvoicesGenerated,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatus(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        console.log('File loaded into reader');
        const data = e.target?.result;
        if (!data) throw new Error('تعذر قراءة محتوى الملف');
        
        const workbook = XLSX.read(new Uint8Array(data as ArrayBuffer), { type: 'array', cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        console.log(`JSON Data parsed: ${jsonData?.length} rows`);

        if (!jsonData || jsonData.length === 0) {
          throw new Error('الملف فارغ أو بتنسيق غير صحيح (تأكد من وجود بيانات تحت العناوين)');
        }

        // Logic for randomized invoice numbering
        let currentNum = 20970;
        if (lastInvoiceNumber) {
          const match = lastInvoiceNumber.match(/^INV-(\d+)$/i);
          if (match) {
            const parsed = parseInt(match[1], 10);
            if (parsed >= 20970 && parsed < 100000) {
              currentNum = parsed;
            }
          }
        }

        // Helper to get date as YYYY-MM-DD from ANY source safely
        const safeExtractDate = (val: any): string => {
          if (!val) return new Date().toISOString().slice(0, 10);
          
          try {
            // 1. Handle Date Objects (from XLSX with cellDates: true)
            if (val instanceof Date && !isNaN(val.getTime())) {
              // Add 12 hours to move to mid-day, ensuring timezone shifts don't cross midnight
              const adjusted = new Date(val.getTime() + 12 * 60 * 60 * 1000);
              return adjusted.toISOString().slice(0, 10);
            }

            // 2. Handle Excel Serial Numbers (e.g. 45137)
            const num = Number(val);
            if (!isNaN(num) && num > 30000 && num < 60000) {
              // Using Dec 31, 1899 as epoch to fix the 1-day lag
              const date = new Date(Date.UTC(1899, 11, 31 + Math.floor(num)));
              // Also add 12 hours to be absolutely safe
              const midDay = new Date(date.getTime() + 12 * 60 * 60 * 1000);
              return midDay.toISOString().slice(0, 10);
            }

            // 3. Handle Strings
            if (typeof val === 'string' && val.trim() !== '') {
              const dateStr = val.trim();
              
              // Direct regex for YYYY-MM-DD
              const isoMatch = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
              if (isoMatch) {
                return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
              }

              // Direct regex for DD-MM-YYYY
              const dmyMatch = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
              if (dmyMatch) {
                return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
              }

              // Fallback string parsing
              const fallbackParsed = new Date(dateStr);
              if (!isNaN(fallbackParsed.getTime())) {
                const adjusted = new Date(fallbackParsed.getTime() + 12 * 60 * 60 * 1000);
                return adjusted.toISOString().slice(0, 10);
              }
            }
          } catch (e) {
            console.error('Date parsing error:', e);
          }
          
          return new Date().toISOString().slice(0, 10);
        };

        // Group rows by date
        const groupedRows: Record<string, any[]> = {};
        
        // Aliases for header matching
        const headerAliases = {
          date: ['date', 'التاريخ', 'تاريخ الفاتورة', 'تاريخ', 'تاريخ الاصدار', 'تاريخ الإصدار', 'تاريخ اليوم', 'issue date', 'invoice date', 'تاريخ المستند', 'تاريخ العملية', 'تاريخ الفاتوره'],
          customerName: ['customer name', 'اسم العميل', 'العميل', 'customer', 'name', 'الاسم', 'اسم المشتري', 'المشتري', 'جهة الاتصال', 'الشركة', 'العميل / الشركة', 'اسم الزبون', 'الزبون', 'اسم المستفيد', 'المستفيد', 'الجهة'],
          customerTax: ['tax number', 'الرقم الضريبي', 'رقم ضريبي', 'vat number', 'vat id', 'الرقم الموحد', 'tax id', 'رقم التسجيل الضريبي', 'رقم التسجيل'],
          customerAddress: ['address', 'العنوان', 'عنوان العميل', 'عنوان', 'موقع العميل', 'الموقع', 'عنوان المشتري', 'المدينة', 'العنوان الوطني', 'مكان التوريد'],
          customerPhone: ['phone', 'mobile', 'رقم الهاتف', 'الهاتف', 'رقم الجوال', 'الجوال', 'تواصل'],
          total: ['total', 'الإجمالي', 'الاجمالي', 'المجموع', 'total price', 'المبلغ المستحق', 'قيمة الفاتورة', 'اجمالي الفاتورة', 'المبلغ الإجمالي', 'المبلغ المطلوب', 'الصافي', 'المبلغ الكلي', 'صافي الفاتورة', 'المبلغ'],
          tax: ['tax', 'vat', 'الضريبة', 'ضريبة', 'قيمة الضريبة', 'الضريبة المضافة', 'ضريبة القيمة المضافة', 'مبلغ الضريبة'],
          subtotal: ['subtotal', 'المبلغ قبل الضريبة', 'صافي القيمة', 'القيمة قبل الضريبة', 'صافي', 'net', 'المبلغ الخاضع للضريبة', 'الاجمالي قبل الضريبة'],
          qty: ['quantity', 'الكمية', 'كمية', 'qty', 'العدد', 'count'],
          price: ['unit price', 'سعر الوحدة', 'سعر', 'price', 'unit_price', 'السعر الفردي'],
          description: ['description', 'البيان', 'الوصف', 'تفاصيل', 'الخدمة', 'المنتج', 'بيان', 'اسم الصنف', 'الصنف', 'اسم المنتج', 'اسم الخدمة'],
          unit: ['unit', 'الوحدة', 'وحدة', 'unit of measure']
        };

        const getValFromRow = (row: any, possibleKeys: string[]) => {
          const cleanStr = (s: string) => s.toString().trim()
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '')
            .toLowerCase();
          const rowKeys = Object.keys(row).map(k => ({ original: k, clean: cleanStr(k) }));
          
          // 1. Exact cleaned match
          for (const pk of possibleKeys) {
            const pkClean = cleanStr(pk);
            const match = rowKeys.find(rk => rk.clean === pkClean);
            if (match) return row[match.original];
          }
          // 2. Contains match
          for (const pk of possibleKeys) {
            const pkClean = cleanStr(pk);
            if (pkClean.length > 3) {
              const match = rowKeys.find(rk => rk.clean.includes(pkClean) || pkClean.includes(rk.clean));
              if (match) return row[match.original];
            }
          }
          return undefined;
        };

        jsonData.forEach(row => {
          const rawDate = getValFromRow(row, headerAliases.date);
          const d = safeExtractDate(rawDate);
          if (!groupedRows[d]) groupedRows[d] = [];
          groupedRows[d].push(row);
        });

        const newInvoices: Invoice[] = Object.entries(groupedRows).map(([dateKey, rows]) => {
          const items: InvoiceItem[] = [];
          let totalSubtotal = 0;
          let totalTax = 0;
          let totalGrand = 0;

          // Determine customer info from the first row that has a name
          let invoiceCustomerName = 'عميل افتراضي';
          let invoiceCustomerTax = undefined;
          let invoiceCustomerAddress = undefined;
          let invoiceCustomerPhone = undefined;

          rows.forEach((row, idx) => {
            const rowCustomer = getValFromRow(row, headerAliases.customerName);
            if (rowCustomer && invoiceCustomerName === 'عميل افتراضي') {
              invoiceCustomerName = rowCustomer.toString();
              invoiceCustomerTax = getValFromRow(row, headerAliases.customerTax)?.toString();
              invoiceCustomerAddress = getValFromRow(row, headerAliases.customerAddress)?.toString();
              invoiceCustomerPhone = getValFromRow(row, headerAliases.customerPhone)?.toString();
            }

            const parseNum = (val: any) => {
              if (typeof val === 'number') return val;
              if (!val) return 0;
              const clean = val.toString().replace(/[^0-9.]/g, '');
              const num = parseFloat(clean);
              return isNaN(num) ? 0 : num;
            };

            const vTotal = parseNum(getValFromRow(row, headerAliases.total));
            const vTax = parseNum(getValFromRow(row, headerAliases.tax));
            const vSub = parseNum(getValFromRow(row, headerAliases.subtotal));
            const vQty = parseNum(getValFromRow(row, headerAliases.qty)) || 1;
            const vPrice = parseNum(getValFromRow(row, headerAliases.price));
            const desc = (getValFromRow(row, headerAliases.description) || `صنف رقم ${idx + 1}`).toString();
            const unit = (getValFromRow(row, headerAliases.unit) || 'حبة').toString();
            
            const taxRate = settings.companyVatNumber ? 15 : 0;

            let rowGrand = 0;
            let rowTax = 0;
            let rowSub = 0;

            if (vTotal > 0) {
              rowGrand = vTotal;
              if (vTax > 0) {
                rowTax = vTax;
                rowSub = vTotal - vTax;
              } else {
                rowSub = vTotal / (1 + taxRate / 100);
                rowTax = vTotal - rowSub;
              }
            } else if (vSub > 0) {
              rowSub = vSub;
              rowTax = vSub * (taxRate / 100);
              rowGrand = vSub + rowTax;
            } else if (vQty > 0 && vPrice > 0) {
              rowSub = vQty * vPrice;
              rowTax = rowSub * (taxRate / 100);
              rowGrand = rowSub + rowTax;
            }

            if (rowGrand > 0) {
              items.push({
                id: generateId('item'),
                description: desc,
                quantity: vQty,
                unit: unit,
                unitPrice: vPrice > 0 ? vPrice : (rowSub / vQty),
                taxRate,
                taxAmount: rowTax,
                total: rowGrand,
              });
              totalSubtotal += rowSub;
              totalTax += rowTax;
              totalGrand += rowGrand;
            }
          });

          if (items.length === 0) return null;

          currentNum += Math.floor(Math.random() * 6) + 4;
          const invoiceNumber = `INV-${currentNum}`;

          return {
            id: generateId('inv'),
            invoiceNumber,
            invoiceType: 'simplified',
            zatcaPhase: 'phase2',
            customerName: invoiceCustomerName,
            customerTaxNumber: invoiceCustomerTax,
            customerAddress: invoiceCustomerAddress,
            customerPhone: invoiceCustomerPhone,
            date: dateKey,
            dueDate: dateKey,
            items,
            subtotal: totalSubtotal,
            taxTotal: totalTax,
            grandTotal: totalGrand,
            status: 'paid',
            paymentMethod: 'cash',
          } as Invoice;
        }).filter((inv): inv is Invoice => inv !== null);

        onInvoicesGenerated(newInvoices);
        setStatus({ type: 'success', message: `تم إنشاء ${newInvoices.length} فاتورة بنجاح` });
      } catch (error: any) {
        console.error('Bulk upload error:', error);
        setStatus({ type: 'error', message: error.message || 'حدث خطأ أثناء معالجة الملف' });
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setStatus({ type: 'error', message: 'خطأ في قراءة الملف' });
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setStatus(null);

    const newGeneratedInvoices: Invoice[] = [];
    let errorCount = 0;

    // Logic for randomized invoice numbering
    let currentNum = 20970;
    if (lastInvoiceNumber) {
      const match = lastInvoiceNumber.match(/^INV-(\d+)$/i);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (parsed >= 20970 && parsed < 100000) {
          currentNum = parsed;
        }
      }
    }

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
          });
          reader.readAsDataURL(file);
          const base64 = await base64Promise;

          const response = await fetch('/api/analyze-invoice-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64: base64,
              mimeType: file.type
            })
          });

          const result = await response.json();
          if (result.success && result.invoice) {
            const aiInv = result.invoice;
            
            currentNum += Math.floor(Math.random() * 6) + 4;
            const invoiceNumber = `INV-${currentNum}`;

            let grandTotal = 0;
            let taxTotal = 0;
            let subtotal = 0;

            const items: InvoiceItem[] = (aiInv.items || []).map((item: any) => {
              const qty = Number(item.quantity) || 1;
              const price = Number(item.unitPrice) || 0;
              const rate = Number(item.taxRate) || 0;
              const lineSubtotal = qty * price;
              const lineTax = lineSubtotal * (rate / 100);
              const lineTotal = lineSubtotal + lineTax;

              grandTotal += lineTotal;
              taxTotal += lineTax;
              subtotal += lineSubtotal;

              return {
                id: generateId('item'),
                description: item.description || 'صنف غير معروف',
                quantity: qty,
                unit: 'حبة',
                unitPrice: price,
                taxRate: rate,
                taxAmount: lineTax,
                total: lineTotal,
              };
            });

            // If no items extracted, try to use summary fields if they exist (though prompt asks for items)
            if (items.length === 0) {
              errorCount++;
              continue;
            }

            const paymentMethod: PaymentMethod = (aiInv.paymentMethod || 'cash').toString().toLowerCase().includes('bank') 
              ? 'bank_transfer' 
              : 'cash';

            newGeneratedInvoices.push({
              id: generateId('inv'),
              invoiceNumber,
              invoiceType: 'simplified',
              zatcaPhase: 'phase2',
              customerName: aiInv.customerName || 'عميل غير معروف',
              customerTaxNumber: aiInv.customerTaxNumber,
              customerAddress: aiInv.customerAddress,
              customerPhone: aiInv.customerPhone,
              date: aiInv.date || new Date().toISOString().slice(0, 10),
              dueDate: aiInv.date || new Date().toISOString().slice(0, 10),
              items,
              subtotal,
              taxTotal,
              grandTotal,
              status: 'paid',
              paymentMethod,
            });
          } else {
            errorCount++;
          }
        } catch (e) {
          console.error(`Error processing file ${file.name}:`, e);
          errorCount++;
        }
      }

      if (newGeneratedInvoices.length > 0) {
        onInvoicesGenerated(newGeneratedInvoices);
        setStatus({ 
          type: 'success', 
          message: `تمت معالجة ${newGeneratedInvoices.length} ملف بنجاح${errorCount > 0 ? ` (فشل ${errorCount})` : ''}` 
        });
      } else {
        throw new Error('فشل استخراج أي بيانات فواتير من الملفات المرفوعة');
      }

    } catch (error: any) {
      console.error('PDF Bulk upload error:', error);
      setStatus({ type: 'error', message: error.message || 'حدث خطأ أثناء معالجة الملفات' });
    } finally {
      setIsProcessing(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = [
      { 'العميل': 'شركة المثال', 'التاريخ': '2026-07-29', 'المبلغ': 1150, 'البيان': 'توريد أجهزة', 'طريقة الدفع': 'cash' },
      { 'العميل': 'مؤسسة الأمل', 'التاريخ': '2026-07-30', 'المبلغ': 2300, 'البيان': 'خدمات استشارية', 'طريقة الدفع': 'bank_transfer' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'invoice_template.xlsx');
  };

  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Files className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white">النظام الآلي للفواتير (Bulk)</h3>
            <p className="text-[10px] text-gray-400">ارفع ملفات اكسل أو بي دي اف لإنشاء فواتير متعددة</p>
          </div>
        </div>
        
        <button
          onClick={downloadTemplate}
          className="text-[10px] font-bold text-teal-400 hover:underline flex items-center gap-1"
        >
          <Download className="w-3 h-3" />
          نموذج الإكسل
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          disabled={isProcessing}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed rounded-3xl transition-all ${
            isProcessing 
              ? 'border-emerald-500/20 bg-emerald-500/5 cursor-not-allowed' 
              : 'border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 bg-slate-950/50'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
          )}
          <div className="text-center">
            <span className="text-[10px] font-black text-white block">رفع ملف إكسل</span>
            <span className="text-[8px] text-gray-500">Excel Bulk</span>
          </div>
        </button>

        <button
          disabled={isProcessing}
          onClick={() => pdfInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed rounded-3xl transition-all ${
            isProcessing 
              ? 'border-rose-500/20 bg-rose-500/5 cursor-not-allowed' 
              : 'border-white/10 hover:border-rose-500/50 hover:bg-rose-500/5 bg-slate-950/50'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-6 h-6 text-rose-400 animate-spin" />
          ) : (
            <FileText className="w-6 h-6 text-rose-500" />
          )}
          <div className="text-center">
            <span className="text-[10px] font-black text-white block">رفع فواتير PDF</span>
            <span className="text-[8px] text-gray-500">PDF AI Scanner</span>
          </div>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".xlsx, .xls"
          className="hidden"
        />
        <input
          type="file"
          ref={pdfInputRef}
          onChange={handlePdfUpload}
          accept=".pdf, image/*"
          multiple
          className="hidden"
        />
      </div>

      {isProcessing && (
         <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
            <span className="text-[10px] text-gray-300 font-bold">جاري تحليل ومعالجة الملفات... قد يستغرق ذلك لحظات</span>
         </div>
      )}

      {status && (
        <div className={`p-3 rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
          status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}>
          {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-[11px] font-bold">{status.message}</span>
        </div>
      )}
    </div>
  );
};

