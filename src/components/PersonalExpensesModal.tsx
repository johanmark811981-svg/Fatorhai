import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Plus, Calendar, Filter, Trash2, ArrowDownRight, Tag, Utensils, Home, Heart, CreditCard, Sparkles, FileSpreadsheet, FileDown, AlertCircle, Mic } from 'lucide-react';
import { Category, AppSettings, Transaction, Account } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { exportToExcel } from '../utils/exportToExcel';
import { exportElementToPdf } from '../utils/exportToPdf';
import { VoiceRecorder } from './VoiceRecorder';

interface PersonalExpensesModalProps {
  isOpen: boolean;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  settings: AppSettings;
  onClose: () => void;
  onOpenAddPersonalExpense: () => void;
  onDeleteTransaction: (id: string) => void;
  onVoiceData: (type: 'expense' | 'debt', data: any) => void;
}

export const PersonalExpensesModal: React.FC<PersonalExpensesModalProps> = ({
  isOpen,
  transactions,
  categories,
  accounts,
  settings,
  onClose,
  onOpenAddPersonalExpense,
  onDeleteTransaction,
  onVoiceData,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [showVoiceInput, setShowVoiceInput] = useState(false);

  if (!isOpen) return null;

  // Personal categories
  const personalCategories = categories.filter((c) => c.isPersonal || c.id.startsWith('cat_personal'));

  // Personal transactions
  const personalTransactions = transactions.filter((t) => {
    const isPersonalScope = t.scope === 'personal';
    const isPersonalCat = personalCategories.some((c) => c.id === t.categoryId);
    return t.type === 'expense' && (isPersonalScope || isPersonalCat);
  });

  const filteredTransactions = personalTransactions.filter((t) => {
    if (selectedCategory !== 'all') {
      return t.categoryId === selectedCategory;
    }
    return true;
  });

  // Financial Stats
  const totalPersonalExpense = personalTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Budget calculation
  const totalPersonalBudget = personalCategories.reduce((sum, c) => sum + (c.budgetLimit || 0), 0);
  const budgetPercentage = totalPersonalBudget > 0 ? Math.min(100, Math.round((totalPersonalExpense / totalPersonalBudget) * 100)) : 0;

  // Export Handlers
  const handleExportExcel = () => {
    const headers = ['بيان المصروف', 'الفئة الشخصية', 'المبلغ (ر.س)', 'الحساب المالي', 'التاريخ', 'ملاحظات'];
    const rows = personalTransactions.map((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId);
      const acc = accounts.find((a) => a.id === tx.accountId);
      return [
        tx.title,
        cat?.nameAr || 'مصروف شخصي',
        tx.amount,
        acc?.nameAr || '-',
        formatDate(tx.date, settings.language),
        tx.notes || tx.description || '-',
      ];
    });

    exportToExcel(`المصاريف_الشخصية_${new Date().toISOString().slice(0, 10)}.xlsx`, headers, rows);
  };

  const handleExportPdf = () => {
    exportElementToPdf('personal-expenses-printable-list', `المصاريف_الشخصية_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md dir-rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-slate-900 border border-purple-500/30 rounded-[32px] p-4 sm:p-5 shadow-2xl text-white max-h-[92vh] flex flex-col relative overflow-hidden"
        >
          {/* Delete Confirmation Overlay */}
          {txToDelete && (
            <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center animate-bounce">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-white">تأكيد حذف المصروف</h3>
                <p className="text-xs text-gray-300 leading-relaxed max-w-xs mx-auto">
                  هل أنت متأكد من حذف مصروف <span className="font-bold text-purple-300">{txToDelete.title}</span> بقيمة{' '}
                  <span className="font-extrabold font-mono text-rose-400">
                    {formatCurrency(txToDelete.amount, settings.currency, settings.language)}
                  </span>
                  ؟ لن يمكنك استرجاعه بعد الحذف.
                </p>
              </div>
              <div className="flex gap-2 w-full max-w-xs pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteTransaction(txToDelete.id);
                    setTxToDelete(null);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 rounded-xl text-xs transition-all shadow-lg active:scale-95"
                >
                  تأكيد الحذف النهائي
                </button>
                <button
                  type="button"
                  onClick={() => setTxToDelete(null)}
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
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">إدارة المصاريف الشخصية</h2>
                <p className="text-[10px] text-gray-400">تتبع مصاريف العائلة، التسوق، والأنشطة الشخصية</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-slate-800 text-gray-400 hover:text-white p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-0.5">
            {/* Top Overview Card */}
            <div className="bg-gradient-to-br from-purple-950/60 via-slate-900 to-indigo-950/50 border border-purple-500/30 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  إجمالي المصاريف الشخصية هذا الشهر
                </span>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  نطاق شخصي
                </span>
              </div>

              <div>
                <p className="text-2xl font-black text-white font-mono dir-ltr text-right">
                  {formatCurrency(totalPersonalExpense, settings.currency, settings.language)}
                </p>
              </div>

              {/* Personal Budget Progress Bar */}
              {totalPersonalBudget > 0 && (
                <div className="space-y-1 pt-1 border-t border-white/10">
                  <div className="flex justify-between text-[10px] text-gray-300">
                    <span>مستوى استهلاك الميزانية الشخصية</span>
                    <span className="font-mono font-bold text-purple-300">
                      {budgetPercentage}% من {formatCurrency(totalPersonalBudget, settings.currency, settings.language)}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        budgetPercentage >= 90
                          ? 'bg-rose-500'
                          : budgetPercentage >= 70
                          ? 'bg-amber-500'
                          : 'bg-purple-500'
                      }`}
                      style={{ width: `${budgetPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Voice Input Callout */}
            <div className="bg-slate-950/60 border border-emerald-500/30 rounded-2xl p-3 flex flex-col items-center gap-2.5">
              <div className="flex items-center gap-2 w-full">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[11px] font-bold text-emerald-300">تسجيل مصروف بالصوت</h3>
                  <p className="text-[9px] text-gray-400">تحدث بالعامية: "اشتريت أغراض بـ 120 ريال"</p>
                </div>
                <button 
                  onClick={() => setShowVoiceInput(!showVoiceInput)}
                  className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
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

            {/* Export Toolbar: Excel & PDF */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={handleExportExcel}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-950" />
                <span>تصدير مصاريف (Excel)</span>
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <FileDown className="w-4 h-4" />
                <span>طباعة / PDF</span>
              </button>
            </div>

            {/* Quick Add Button */}
            <button
              onClick={() => {
                onClose();
                onOpenAddPersonalExpense();
              }}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold py-3 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-lg shadow-purple-600/20 active:scale-98 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>تسجيل مصروف شخصي جديد</span>
            </button>

            {/* Category Filter Pills */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-gray-300 block">التصفية حسب الفئة الشخصية:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold no-scrollbar">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl shrink-0 transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'bg-slate-950 text-gray-400 hover:text-white border border-white/5'
                  }`}
                >
                  جميع المصاريف الشخصية ({personalTransactions.length})
                </button>
                {personalCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl shrink-0 transition-all flex items-center gap-1.5 ${
                      selectedCategory === cat.id
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'bg-slate-950 text-gray-400 hover:text-white border border-white/5'
                    }`}
                  >
                    <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                    <span>{cat.nameAr}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Personal Expense Transactions List */}
            <div id="personal-expenses-printable-list" className="space-y-2 p-1">
              <span className="text-xs font-bold text-gray-200 block">سجل المصاريف الشخصية</span>

              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8 bg-slate-950/40 rounded-2xl border border-white/5 p-4 space-y-2">
                  <ShoppingBag className="w-8 h-8 text-gray-600 mx-auto" />
                  <p className="text-xs text-gray-400">لا توجد مصاريف شخصية مسجلة بهذه الفئة.</p>
                </div>
              ) : (
                filteredTransactions.map((tx) => {
                  const cat = categories.find((c) => c.id === tx.categoryId);
                  const acc = accounts.find((a) => a.id === tx.accountId);

                  return (
                    <div
                      key={tx.id}
                      className="bg-slate-950/80 hover:bg-slate-900 border border-white/10 rounded-2xl p-3 flex items-center justify-between transition-colors shadow-md"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                          <CategoryIcon name={cat?.icon || 'ShoppingBag'} className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-white truncate">{tx.title}</p>
                          <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <span>{cat?.nameAr || 'مصروف شخصي'}</span>
                            <span>•</span>
                            <span>{acc?.nameAr}</span>
                            <span>•</span>
                            <span>{formatDate(tx.date, settings.language)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-extrabold text-rose-400 font-mono dir-ltr">
                          -{formatCurrency(tx.amount, settings.currency, settings.language)}
                        </span>
                        <button
                          onClick={() => setTxToDelete(tx)}
                          className="text-gray-500 hover:text-rose-400 p-1 transition-colors"
                          title="حذف المصروف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
