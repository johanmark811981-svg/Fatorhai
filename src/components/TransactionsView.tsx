import React, { useState } from 'react';
import { Search, Filter, Trash2, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Plus, Calendar } from 'lucide-react';
import { Account, AppSettings, Category, Transaction, TransactionType } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface TransactionsViewProps {
  settings: AppSettings;
  hideValues: boolean;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onDeleteTransaction: (id: string) => void;
  onOpenAddModal: (type?: TransactionType) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  settings,
  hideValues,
  transactions,
  categories,
  accounts,
  onDeleteTransaction,
  onOpenAddModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | TransactionType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter logic
  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.vendorOrClient && tx.vendorOrClient.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.notes && tx.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || tx.type === selectedType;
    const matchesCategory = selectedCategory === 'all' || tx.categoryId === selectedCategory;

    return matchesSearch && matchesType && matchesCategory;
  });

  const totalFilteredIncome = filtered
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFilteredExpense = filtered
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const mask = (val: string) => (hideValues ? '••••••' : val);

  return (
    <div className="flex-1 p-3 space-y-3 pb-20 dir-rtl text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-white">سجل المعاملات المالية</h2>
          <p className="text-[11px] text-gray-400">إدارة الإيرادات والمصروفات والتحويلات اليومية</p>
        </div>
        <button
          onClick={() => onOpenAddModal()}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          معاملة جديدة
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-2">
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="بحث حسب الوصف أو العميل أو الملاحظات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-2xl py-2 pr-9 pl-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
        </div>

        {/* Type pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              selectedType === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 text-gray-400 hover:text-white border border-white/5'
            }`}
          >
            الكل ({transactions.length})
          </button>
          <button
            onClick={() => setSelectedType('income')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              selectedType === 'income'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-emerald-400 hover:bg-slate-800 border border-emerald-500/20'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            واردات (إيراد)
          </button>
          <button
            onClick={() => setSelectedType('expense')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              selectedType === 'expense'
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-slate-900 text-rose-400 hover:bg-slate-800 border border-rose-500/20'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            صادرات (مصروف)
          </button>
          <button
            onClick={() => setSelectedType('transfer')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              selectedType === 'transfer'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-amber-400 hover:bg-slate-800 border border-amber-500/20'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            تحويلات
          </button>
        </div>
      </div>

      {/* Filter Stats bar */}
      <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-2.5 flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] text-gray-400 block">إجمالي الواردات بالفلتر</span>
          <span className="font-extrabold text-emerald-400 font-mono">
            {mask(formatCurrency(totalFilteredIncome, settings.currency, settings.language))}
          </span>
        </div>
        <div className="h-6 w-px bg-white/10" />
        <div>
          <span className="text-[10px] text-gray-400 block">إجمالي المصروفات بالفلتر</span>
          <span className="font-extrabold text-rose-400 font-mono">
            {mask(formatCurrency(totalFilteredExpense, settings.currency, settings.language))}
          </span>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2 pt-1">
        {filtered.length === 0 ? (
          <div className="text-center py-10 bg-slate-900/40 border border-dashed border-white/10 rounded-3xl p-6">
            <p className="text-sm font-bold text-gray-300">لا توجد معاملات مطابقة للفلتر</p>
            <p className="text-xs text-gray-500 mt-1">جرب تغيير شروط البحث أو اضغط على إضافة معاملة جديدة</p>
          </div>
        ) : (
          filtered.map((tx) => {
            const cat = categories.find((c) => c.id === tx.categoryId);
            const acc = accounts.find((a) => a.id === tx.accountId);
            const toAcc = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : null;
            const isIncome = tx.type === 'income';
            const isTransfer = tx.type === 'transfer';

            return (
              <div
                key={tx.id}
                className="bg-slate-900/90 border border-white/10 hover:border-emerald-500/30 rounded-2xl p-3 flex flex-col gap-2 transition-all shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isIncome
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isTransfer
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      <CategoryIcon name={cat?.icon || 'CircleDollarSign'} className="w-5 h-5" />
                    </div>

                    <div className="overflow-hidden">
                      <h3 className="text-xs font-extrabold text-white truncate">{tx.title}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                        <span className="text-emerald-400 font-semibold">{cat?.nameAr}</span>
                        <span>•</span>
                        <span>
                          {acc?.nameAr} {toAcc ? `➔ ${toAcc.nameAr}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left dir-ltr shrink-0">
                    <span
                      className={`text-sm font-extrabold font-mono ${
                        isIncome ? 'text-emerald-400' : isTransfer ? 'text-amber-400' : 'text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}
                      {mask(formatCurrency(tx.amount, settings.currency, settings.language))}
                    </span>
                    {tx.currency && tx.foreignAmount && (
                      <span className="block text-[9px] text-cyan-400 font-mono">
                        ({tx.foreignAmount} {tx.currency})
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer notes & Delete */}
                <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[10px] text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-500" />
                      {formatDate(tx.date, settings.language)}
                    </span>
                    {tx.vendorOrClient && <span className="bg-slate-800 px-2 py-0.5 rounded-md text-gray-300">{tx.vendorOrClient}</span>}
                  </div>

                  <button
                    onClick={() => onDeleteTransaction(tx.id)}
                    className="text-gray-500 hover:text-rose-400 p-1 rounded-lg transition-colors"
                    title="حذف هذه المعاملة"
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
  );
};
