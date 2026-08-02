import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  FileSpreadsheet,
  PlusCircle,
  MinusCircle,
  Wallet,
  Calendar,
  Sparkles,
  ChevronLeft,
  Search,
  HandCoins,
  ShoppingBag,
  AlertTriangle,
  X,
  Percent,
  ShieldAlert,
  Mic,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { Account, AppSettings, Category, Transaction, Debt, Contract } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { BellRing } from 'lucide-react';

interface DashboardViewProps {
  settings: AppSettings;
  hideValues: boolean;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  contracts?: Contract[];
  debts?: Debt[];
  onOpenAddModal: (type?: 'income' | 'expense' | 'transfer') => void;
  onOpenInvoiceModal: () => void;
  onOpenPersonalDebts: () => void;
  onOpenPersonalExpenses: () => void;
  onNavigateTab: (tab: any) => void;
  onOpenAiAdvisor: () => void;
  onOpenVoiceAssistant?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  settings,
  hideValues,
  transactions,
  accounts,
  categories,
  debts = [],
  contracts = [],
  onOpenAddModal,
  onOpenInvoiceModal,
  onOpenPersonalDebts,
  onOpenPersonalExpenses,
  onNavigateTab,
  onOpenAiAdvisor,
  onOpenVoiceAssistant,
}) => {
  const [chartType, setChartType] = useState<'flow' | 'categories'>('flow');
  const [closedToastIds, setClosedToastIds] = useState<string[]>([]);
  const [currentAlertIndex, setCurrentAlertIndex] = useState<number>(0);

  // Smart Budget Watcher - Calculate consumption for all expense categories with budget limits
  const budgetAlerts = categories
    .filter((c) => c.type === 'expense' && c.budgetLimit)
    .map((c) => {
      const totalSpent = transactions
        .filter((t) => t.type === 'expense' && t.categoryId === c.id)
        .reduce((sum, t) => sum + t.amount, 0);
      const limit = c.budgetLimit || 0;
      const ratio = totalSpent / limit;
      const percent = Math.round(ratio * 100);
      const remaining = limit - totalSpent;
      return {
        category: c,
        spent: totalSpent,
        limit,
        percent,
        ratio,
        remaining,
      };
    })
    .sort((a, b) => b.ratio - a.ratio); // Order by highest consumption first

  // Filter alerts specifically for those exceeding 80% that have not been dismissed
  const visibleAlerts = budgetAlerts
    .filter((item) => item.ratio >= 0.8)
    .filter((item) => !closedToastIds.includes(item.category.id));

  // Reset alert index if it goes out of bounds when list changes
  useEffect(() => {
    if (currentAlertIndex >= visibleAlerts.length && visibleAlerts.length > 0) {
      setCurrentAlertIndex(0);
    }
  }, [visibleAlerts.length, currentAlertIndex]);

  const today = new Date();
  const expiringContracts = contracts.filter(c => {
    if (c.status === 'cancelled' || c.status === 'renewed') return false;
    const end = new Date(c.endDate);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diff >= 0 && diff <= c.renewalNoticeDays;
  });

  // Calculations
  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const netProfit = totalIncome - totalExpense;

  // Active Debts Count & Multi-Currency Breakdown (Riyal vs Dollar)
  const activeDebts = debts.filter((d) => d.status !== 'paid');
  const isUSD = (curr?: string) => curr === '$' || curr === 'USD' || curr?.includes('دولار');
  const isSAR = (curr?: string) => !curr || curr === 'ر.س' || curr === 'SAR' || curr?.includes('ريال');

  const totalPendingSAR = activeDebts
    .filter((d) => isSAR(d.currency))
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

  const totalPendingUSD = activeDebts
    .filter((d) => isUSD(d.currency))
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

  const totalPendingOther = activeDebts
    .filter((d) => !isSAR(d.currency) && !isUSD(d.currency))
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

  // Personal Expenses Total
  const personalCategories = categories.filter((c) => c.isPersonal || c.id.startsWith('cat_personal'));
  const totalPersonalExpense = transactions
    .filter((t) => t.type === 'expense' && (t.scope === 'personal' || personalCategories.some((c) => c.id === t.categoryId)))
    .reduce((sum, t) => sum + t.amount, 0);

  // Chart Data: Group expenses by category
  const expenseByCategory = categories
    .filter((c) => c.type === 'expense')
    .map((cat) => {
      const sum = transactions
        .filter((t) => t.type === 'expense' && t.categoryId === cat.id)
        .reduce((acc, t) => acc + t.amount, 0);
      return { name: cat.nameAr, value: sum, color: cat.color };
    })
    .filter((item) => item.value > 0);

  // Cashflow timeline mock/real chart data
  const monthlyFlowData = [
    { month: 'يناير', income: 12000, expense: 9500 },
    { month: 'فبراير', income: 18500, expense: 11000 },
    { month: 'مارس', income: 15000, expense: 8400 },
    { month: 'أبريل', income: 21000, expense: 14200 },
    { month: 'مايو', income: 19500, expense: 10500 },
    { month: 'يونيو', income: 24000, expense: 13000 },
    { month: 'يوليو', income: totalIncome, expense: totalExpense },
  ];

  const PIE_COLORS = ['#f43f5e', '#f97316', '#eab308', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6'];

  const mask = (val: string) => (hideValues ? '••••••' : val);

  return (
    <div className="flex-1 p-3 space-y-3.5 pb-20 dir-rtl text-white">
      {/* 🚨 Smart Budget Alert Toast Banner */}
      <AnimatePresence>
        {visibleAlerts.length > 0 && (
          <motion.div
            key="budget-alert-toast"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="bg-slate-950/95 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-3.5 shadow-2xl flex flex-col gap-2.5 relative overflow-hidden ring-1 ring-amber-500/10"
          >
            {/* Top glowing dual-gradient indicator bar */}
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />
            
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2.5 items-start">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-400">تنبيه ذكي: تجاوز الميزانية ⚠️</span>
                    {visibleAlerts.length > 1 && (
                      <span className="text-[9px] bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-full font-bold font-mono text-amber-300">
                        {currentAlertIndex + 1} من {visibleAlerts.length}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">
                    لقد تجاوزت مصروفات فئة <span className="font-extrabold text-amber-300">({visibleAlerts[currentAlertIndex].category.nameAr})</span> نسبة <span className="font-black text-rose-400 font-mono text-xs">{visibleAlerts[currentAlertIndex].percent}%</span> من الميزانية المحددة لها.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const dismissedId = visibleAlerts[currentAlertIndex].category.id;
                  setClosedToastIds(prev => [...prev, dismissedId]);
                  if (currentAlertIndex >= visibleAlerts.length - 1) {
                    setCurrentAlertIndex(0);
                  }
                }}
                className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0 active:scale-90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Micro progress bar and metrics */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] text-gray-400 font-extrabold">
                <span>المصروف: {mask(formatCurrency(visibleAlerts[currentAlertIndex].spent, settings.currency, settings.language))}</span>
                <span>الميزانية: {mask(formatCurrency(visibleAlerts[currentAlertIndex].limit, settings.currency, settings.language))}</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(visibleAlerts[currentAlertIndex].percent, 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full bg-gradient-to-r ${
                    visibleAlerts[currentAlertIndex].percent >= 100 
                      ? 'from-rose-500 to-red-600' 
                      : 'from-amber-500 to-rose-500'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between">
                {visibleAlerts[currentAlertIndex].remaining < 0 ? (
                  <p className="text-[9px] text-rose-400 font-bold">
                    تجاوز الحد بـ {mask(formatCurrency(Math.abs(visibleAlerts[currentAlertIndex].remaining), settings.currency, settings.language))}
                  </p>
                ) : (
                  <p className="text-[9px] text-amber-400 font-bold">
                    المتبقي: {mask(formatCurrency(visibleAlerts[currentAlertIndex].remaining, settings.currency, settings.language))}
                  </p>
                )}
                
                {visibleAlerts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentAlertIndex(prev => (prev + 1) % visibleAlerts.length);
                    }}
                    className="text-[9px] text-amber-400 font-extrabold hover:underline flex items-center gap-0.5"
                  >
                    عرض التالي ❯
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Primary Net Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br from-emerald-900/60 via-slate-900 to-teal-950 border border-emerald-500/30 shadow-xl"
      >
        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between text-xs text-emerald-300 mb-1">
          <span className="flex items-center gap-1.5 font-semibold">
            <Wallet className="w-4 h-4 text-emerald-400" />
            إجمالي صافي النقدية والمحافظ
          </span>
          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/30">
            {settings.currencySymbol} • ريال سعودي
          </span>
        </div>

        {/* Big Balance Amount */}
        <div className="mt-1 mb-3">
          <p className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono dir-ltr text-right">
            {mask(formatCurrency(totalBalance, settings.currency, settings.language))}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-gray-300">صافي الأرباح التشغيلية:</span>
            <span className={`text-xs font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {mask(formatCurrency(netProfit, settings.currency, settings.language))}
            </span>
          </div>
        </div>

        {/* Income & Expense Quick Indicators */}
        <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-white/10">
          <div className="bg-slate-950/40 rounded-2xl p-2 flex items-center gap-2.5 border border-emerald-500/20">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] text-gray-400 block truncate">إجمالي الإيرادات</span>
              <span className="text-xs font-bold text-emerald-400 truncate block">
                {mask(formatCurrency(totalIncome, settings.currency, settings.language))}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/40 rounded-2xl p-2 flex items-center gap-2.5 border border-rose-500/20">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] text-gray-400 block truncate">إجمالي المصروفات</span>
              <span className="text-xs font-bold text-rose-400 truncate block">
                {mask(formatCurrency(totalExpense, settings.currency, settings.language))}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Special Requested Features: Personal Debts & Personal Expenses Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Personal Debts Button */}
        <button
          onClick={onOpenPersonalDebts}
          className="relative overflow-hidden bg-gradient-to-br from-amber-950/70 via-slate-900 to-amber-900/40 border border-amber-500/40 hover:border-amber-400 text-right p-3 rounded-2xl flex items-center justify-between transition-all active:scale-98 shadow-lg group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black text-amber-200 block">الديون والشخصيات</span>
              <div className="text-[10px] text-amber-300/90 mt-0.5 space-y-0.5">
                <div className="flex items-center gap-1.5 font-mono text-[10px] flex-wrap">
                  <span className="text-emerald-400 font-extrabold">{totalPendingSAR.toLocaleString()} ر.س</span>
                  <span className="text-amber-400/50">|</span>
                  <span className="text-sky-300 font-extrabold">${totalPendingUSD.toLocaleString()}</span>
                </div>
                <span className="text-[9px] text-amber-200/60 block">
                  {activeDebts.length > 0 ? `${activeDebts.length} سلف وقيد قائم` : 'سجل الديون والعملات'}
                </span>
              </div>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-amber-400 group-hover:-translate-x-1 transition-transform" />
        </button>

        {/* Personal Expenses Button */}
        <button
          onClick={onOpenPersonalExpenses}
          className="relative overflow-hidden bg-gradient-to-br from-purple-950/70 via-slate-900 to-pink-900/40 border border-purple-500/40 hover:border-purple-400 text-right p-3 rounded-2xl flex items-center justify-between transition-all active:scale-98 shadow-lg group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black text-purple-200 block">المصاريف الشخصية</span>
              <span className="text-[10px] text-purple-300/80 block mt-0.5">
                {formatCurrency(totalPersonalExpense, settings.currency, settings.language, true)}
              </span>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-purple-400 group-hover:-translate-x-1 transition-transform" />
        </button>
      </div>

      {/* 3. Quick Action Buttons Bar */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => onOpenAddModal('income')}
          className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-transform active:scale-95 shadow-md"
        >
          <PlusCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-[11px] font-bold">إضافة إيراد</span>
        </button>

        <button
          onClick={() => onOpenAddModal('expense')}
          className="bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-transform active:scale-95 shadow-md"
        >
          <MinusCircle className="w-5 h-5 text-rose-400" />
          <span className="text-[11px] font-bold">إضافة مصروف</span>
        </button>

        <button
          onClick={() => onOpenAddModal('transfer')}
          className="bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-transform active:scale-95 shadow-md"
        >
          <ArrowLeftRight className="w-5 h-5 text-amber-400" />
          <span className="text-[11px] font-bold">تحويل بنكي</span>
        </button>

        <button
          onClick={onOpenInvoiceModal}
          className="bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/40 text-teal-300 p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-transform active:scale-95 shadow-md"
        >
          <FileSpreadsheet className="w-5 h-5 text-teal-400" />
          <span className="text-[11px] font-bold">فاتورة جديدة</span>
        </button>
      </div>

      {/* Voice Assistant Widget Callout */}
      {onOpenVoiceAssistant && (
        <div
          onClick={onOpenVoiceAssistant}
          className="cursor-pointer bg-gradient-to-r from-teal-950/70 via-slate-900 to-emerald-950/40 border border-teal-500/30 rounded-2xl p-3.5 flex items-center justify-between hover:border-teal-400/60 transition-all shadow-md group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform relative">
              <Mic className="w-5 h-5 text-teal-400 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
            </div>
            <div className="text-right">
              <h3 className="text-xs font-bold text-teal-300">الإدخال الصوتي والذكي السريع</h3>
              <p className="text-[10px] text-gray-300">
                سجّل فواتير العملاء، المصاريف، أو الديون والتسهيلات الشخصية بالتحدث المباشر
              </p>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-teal-400 group-hover:-translate-x-1 transition-transform" />
        </div>
      )}

      {/* 3. AI Smart Advisor Callout */}
      <div
        onClick={onOpenAiAdvisor}
        className="cursor-pointer bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900 border border-purple-500/30 rounded-2xl p-3 flex items-center justify-between hover:border-purple-400/60 transition-all shadow-md group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-purple-200">تحليل الذكاء الاصطناعي اليومي</h3>
            <p className="text-[10px] text-gray-300">
              صحة التدفق النقدي ممتازة. اضغط لمراجعة توصيات التوفير.
            </p>
          </div>
        </div>
        <ChevronLeft className="w-4 h-4 text-purple-400 group-hover:-translate-x-1 transition-transform" />
      </div>

      {/* 📊 Active Budgets Watcher Widget */}
      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-3.5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-gray-200">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>مراقب الموازنات والأقسام الذكي</span>
          </div>
          <span className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-bold text-gray-400">
            تحديث مباشر
          </span>
        </div>

        <div className="space-y-2">
          {budgetAlerts.map((b) => {
            const isExceeded = b.ratio >= 1.0;
            const isWarning = b.ratio >= 0.8 && b.ratio < 1.0;
            
            return (
              <div key={b.category.id} className="space-y-1.5 bg-slate-950/30 p-2.5 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className={`w-2 h-2 rounded-full ${
                      isExceeded ? 'bg-rose-500 animate-pulse' : isWarning ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                    }`} />
                    <span className="text-xs font-bold text-white truncate">{b.category.nameAr}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isExceeded ? (
                      <span className="text-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-md font-extrabold">
                        ⚠️ متجاوز
                      </span>
                    ) : isWarning ? (
                      <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-extrabold">
                        ⚠️ تجاوز 80%
                      </span>
                    ) : (
                      <span className="text-[8px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-extrabold">
                        ✓ آمن
                      </span>
                    )}
                    <span className="text-[10px] font-black font-mono text-gray-200">
                      {b.percent}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isExceeded 
                        ? 'bg-gradient-to-r from-rose-500 to-red-600' 
                        : isWarning 
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500' 
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(b.percent, 100)}%` }}
                  />
                </div>

                {/* Spent details */}
                <div className="flex items-center justify-between text-[9px] text-gray-400">
                  <span>منصرف: {mask(formatCurrency(b.spent, settings.currency, settings.language))}</span>
                  <span>الميزانية: {mask(formatCurrency(b.limit, settings.currency, settings.language))}</span>
                </div>
              </div>
            );
          })}

          {budgetAlerts.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-xs">
              لا توجد ميزانيات محددة للأقسام حالياً.
            </div>
          )}
        </div>
      </div>

      {/* 4. Financial Charts Section */}
      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-3.5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold text-gray-200 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>الرسوم البيانية والتحليل</span>
          </h2>
          <div className="bg-slate-950 p-1 rounded-xl flex items-center gap-1 border border-white/5 text-[10px]">
            <button
              onClick={() => setChartType('flow')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                chartType === 'flow' ? 'bg-emerald-500 text-slate-950' : 'text-gray-400 hover:text-white'
              }`}
            >
              التدفق النقدي
            </button>
            <button
              onClick={() => setChartType('categories')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                chartType === 'categories' ? 'bg-emerald-500 text-slate-950' : 'text-gray-400 hover:text-white'
              }`}
            >
              توزيع المصاريف
            </button>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="h-44 w-full pt-1">
          {chartType === 'flow' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyFlowData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="income" name="إيرادات" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#incomeGrad)" />
                <Area type="monotone" dataKey="expense" name="مصروفات" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#expenseGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-between h-full">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {expenseByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="w-1/2 space-y-1 overflow-y-auto max-h-36 pr-2 text-[10px]">
                {expenseByCategory.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-gray-300 border-b border-white/5 pb-1">
                    <span className="flex items-center gap-1 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      {cat.name}
                    </span>
                    <span className="font-bold text-white font-mono">
                      {mask(formatCurrency(cat.value, settings.currency, settings.language, true))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Accounts Quick Balances Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-300 px-1">
          <span className="font-bold text-white">الحسابات البنكية والمحافظ</span>
          <button
            onClick={() => onNavigateTab('accounts')}
            className="text-emerald-400 hover:underline text-[11px] font-medium flex items-center gap-0.5"
          >
            عرض الكل
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-slate-900/90 border border-white/10 rounded-2xl p-2.5 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-200 truncate">{account.nameAr}</span>
                <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                  {account.type === 'bank' ? 'بنك' : account.type === 'cash' ? 'نقدي' : 'محفظة'}
                </span>
              </div>
              <div className="mt-2 text-left dir-ltr">
                <span className="text-sm font-extrabold text-white font-mono block">
                  {mask(formatCurrency(account.balance, settings.currency, settings.language))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Recent Transactions List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-300 px-1">
          <span className="font-bold text-white">آخر المعاملات والقيود</span>
          <button
            onClick={() => onNavigateTab('transactions')}
            className="text-emerald-400 hover:underline text-[11px] font-medium flex items-center gap-0.5"
          >
            السجل الكامل
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1.5">
          {transactions.slice(0, 5).map((tx) => {
            const cat = categories.find((c) => c.id === tx.categoryId);
            const acc = accounts.find((a) => a.id === tx.accountId);
            const isIncome = tx.type === 'income';
            const isTransfer = tx.type === 'transfer';

            return (
              <div
                key={tx.id}
                className="bg-slate-900/80 hover:bg-slate-800/80 border border-white/5 rounded-2xl p-2.5 flex items-center justify-between transition-colors shadow-sm"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isIncome
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isTransfer
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    <CategoryIcon name={cat?.icon || 'CircleDollarSign'} className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{tx.title}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                      <span>{cat?.nameAr || 'عام'}</span>
                      <span>•</span>
                      <span>{acc?.nameAr}</span>
                      <span>•</span>
                      <span>{formatDate(tx.date, settings.language)}</span>
                    </p>
                  </div>
                </div>

                <div className="text-left dir-ltr shrink-0 font-mono">
                  <span
                    className={`text-xs font-extrabold ${
                      isIncome ? 'text-emerald-400' : isTransfer ? 'text-amber-400' : 'text-rose-400'
                    }`}
                  >
                    {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}
                    {mask(formatCurrency(tx.amount, settings.currency, settings.language))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
