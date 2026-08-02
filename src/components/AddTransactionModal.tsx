import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Check, Plus, Calendar, Tag, CreditCard, Building, UserCheck, Briefcase } from 'lucide-react';
import { Account, Category, PaymentMethod, Transaction, TransactionType, ExpenseScope, AppSettings } from '../types';
import { generateId } from '../utils/formatters';

interface AddTransactionModalProps {
  isOpen: boolean;
  initialType?: TransactionType;
  initialScope?: ExpenseScope;
  categories: Category[];
  accounts: Account[];
  settings?: AppSettings;
  onClose: () => void;
  onSave: (tx: Transaction) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  initialType = 'expense',
  initialScope = 'business',
  categories,
  accounts,
  settings,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [scope, setScope] = useState<ExpenseScope>(initialScope);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('');
  
  const baseCurr = settings?.currency || 'SAR';
  const defaultCurr = settings?.travelMode ? (settings?.travelCurrency || 'USD') : baseCurr;
  const [currency, setCurrency] = useState<string>(defaultCurr);
  const [foreignAmount, setForeignAmount] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number>(settings?.exchangeRates?.[defaultCurr] || 3.75);

  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState<string>(accounts[1]?.id || accounts[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [vendorOrClient, setVendorOrClient] = useState('');
  const [notes, setNotes] = useState('');

  // Update initial values when modal opens or initialScope changes
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setScope(initialScope);
      const cur = settings?.travelMode ? (settings?.travelCurrency || 'USD') : (settings?.currency || 'SAR');
      setCurrency(cur);
      setExchangeRate(settings?.exchangeRates?.[cur] || (cur === 'SAR' ? 1 : 3.75));
      setForeignAmount('');
      setAmount('');
      setTitle('');
    }
  }, [isOpen, initialType, initialScope, settings]);

  const handleCurrencyChange = (newCurr: string) => {
    setCurrency(newCurr);
    const rate = settings?.exchangeRates?.[newCurr] || (newCurr === 'SAR' ? 1 : 3.75);
    setExchangeRate(rate);
    if (foreignAmount && !isNaN(parseFloat(foreignAmount))) {
      setAmount((parseFloat(foreignAmount) * rate).toFixed(2));
    }
  };

  const handleForeignAmountChange = (val: string) => {
    setForeignAmount(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      setAmount((parsed * exchangeRate).toFixed(2));
    } else {
      setAmount('');
    }
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => {
    if (type === 'transfer') return true;
    if (type === 'income') return c.type === 'income';
    // For expense: filter by scope or show matching
    if (scope === 'personal') {
      return c.isPersonal || c.id.startsWith('cat_personal');
    }
    return c.type === 'expense' && !c.isPersonal;
  });

  const selectedCategory = categoryId || filteredCategories[0]?.id || 'cat_rent';

  const handleAmountPreset = (addVal: number) => {
    if (currency !== baseCurr) {
      const current = parseFloat(foreignAmount) || 0;
      const nextVal = (current + addVal).toString();
      handleForeignAmountChange(nextVal);
    } else {
      const current = parseFloat(amount) || 0;
      setAmount((current + addVal).toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('يرجى إدخال عنوان ومبلغ صحيح أكبر من صفر.');
      return;
    }

    const newTx: Transaction = {
      id: generateId('tx'),
      title: title.trim(),
      amount: parsedAmount,
      type,
      categoryId: selectedCategory,
      accountId: accountId || accounts[0]?.id || 'acc_rajhi',
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      date,
      paymentMethod,
      vendorOrClient: vendorOrClient.trim() || undefined,
      notes: notes.trim() || undefined,
      scope: type === 'expense' ? scope : undefined,
      currency: currency !== baseCurr ? currency : undefined,
      exchangeRate: currency !== baseCurr ? exchangeRate : undefined,
      foreignAmount: currency !== baseCurr ? parseFloat(foreignAmount) || parsedAmount : undefined,
    };

    onSave(newTx);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md dir-rtl">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="w-full max-w-md bg-slate-900 border border-white/10 rounded-t-[36px] sm:rounded-[32px] p-5 shadow-2xl text-white max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              <span>تسجيل قيد / معاملة جديدة</span>
            </h2>
            <button
              onClick={onClose}
              className="bg-slate-800 text-gray-400 hover:text-white p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-3">
            {/* Transaction Type Segmented Toggle */}
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-2xl border border-white/5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2 rounded-xl flex items-center justify-center gap-1 transition-all ${
                  type === 'expense'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                مصروف
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2 rounded-xl flex items-center justify-center gap-1 transition-all ${
                  type === 'income'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                إيراد
              </button>
              <button
                type="button"
                onClick={() => setType('transfer')}
                className={`py-2 rounded-xl flex items-center justify-center gap-1 transition-all ${
                  type === 'transfer'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
                تحويل
              </button>
            </div>

            {/* Expense Scope Switcher (Business vs Personal) */}
            {type === 'expense' && (
              <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-white/5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setScope('business')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    scope === 'business'
                      ? 'bg-slate-800 text-teal-300 border border-teal-500/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>مصروف أعمال / تجاري</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScope('personal')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    scope === 'personal'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>مصروف شخصي 🛍️</span>
                </button>
              </div>
            )}

            {/* Amount & Quick Numpad Presets */}
            <div className="space-y-3">
              {/* Currency Selector & Travel Mode Multi-Currency */}
              <div className="bg-slate-950 p-2.5 rounded-2xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-300">عملة المعاملة:</span>
                  {settings?.travelMode && (
                    <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold">
                      ✈️ وضع السفر نشط
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-xs">
                  {['SAR', 'USD', 'EUR', 'GBP', 'AED'].map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => handleCurrencyChange(cur)}
                      className={`py-1.5 rounded-xl border text-[10px] font-bold font-mono transition-all ${
                        currency === cur
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                          : 'bg-slate-900 text-gray-300 border-white/5 hover:bg-slate-800'
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>

                {currency !== baseCurr && (
                  <div className="bg-slate-900 p-2 rounded-xl border border-cyan-500/30 space-y-1.5 mt-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-cyan-300 font-bold">المبلغ بـ ({currency}):</span>
                      <span className="text-gray-400">1 {currency} = {exchangeRate} {baseCurr}</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder={`أدخل المبلغ بـ ${currency}`}
                      value={foreignAmount}
                      onChange={(e) => handleForeignAmountChange(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-sm font-bold text-white font-mono text-left dir-ltr"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-300 font-bold block flex items-center justify-between">
                  <span>المبلغ الأساسي ({baseCurr})</span>
                  {currency !== baseCurr && (
                    <span className="text-[10px] text-cyan-400 font-mono">محول تلقائياً من {currency}</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-3 px-4 text-xl font-extrabold text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 font-mono text-left dir-ltr"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-emerald-400 dir-rtl">
                    {baseCurr}
                  </span>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1.5 pt-1 text-xs">
                  <span className="text-[10px] text-gray-400">إضافة سريعة:</span>
                  {[50, 100, 500, 1000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleAmountPreset(val)}
                      className="bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold px-2 py-0.5 rounded-lg border border-white/5 transition-all text-[11px]"
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Title / Description */}
            <div className="space-y-1">
              <label className="text-xs text-gray-300 font-bold block">وصف القيد / البيان</label>
              <input
                type="text"
                placeholder="مثال: فاتورة صيانة، تحصيل مبيعات، رواتب..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category Selector (If not transfer) */}
            {type !== 'transfer' && (
              <div className="space-y-1">
                <label className="text-xs text-gray-300 font-bold block">التبويب / التصنيف</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Account Selector */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-300 font-bold block mb-1">
                  {type === 'transfer' ? 'من حساب' : 'الحساب المالي'}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nameAr} ({acc.balance} ر.س)
                    </option>
                  ))}
                </select>
              </div>

              {type === 'transfer' ? (
                <div>
                  <label className="text-xs text-gray-300 font-bold block mb-1">إلى حساب</label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.nameAr} ({acc.balance} ر.س)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-gray-300 font-bold block mb-1">طريقة الدفع</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="bank_transfer">تحويل بنكي</option>
                    <option value="card">بطاقة / مدى</option>
                    <option value="apple_pay">أبل باي (Apple Pay)</option>
                    <option value="cash">نقداً</option>
                    <option value="stc_pay">STC Pay</option>
                  </select>
                </div>
              )}
            </div>

            {/* Date & Vendor */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-300 font-bold block mb-1">التاريخ</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-bold block mb-1">الجهة / المورد / العميل</label>
                <input
                  type="text"
                  placeholder="اختياري..."
                  value={vendorOrClient}
                  onChange={(e) => setVendorOrClient(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold py-3.5 rounded-2xl shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 text-sm mt-2"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>حفظ القيد المالي</span>
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
