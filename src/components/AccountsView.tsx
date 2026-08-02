import React, { useState } from 'react';
import { Landmark, Wallet, CreditCard, Plus, ArrowLeftRight, Check, Building2, Smartphone, Pencil, FileText, Download, X } from 'lucide-react';
import { Account, AppSettings } from '../types';
import { formatCurrency, generateId } from '../utils/formatters';
import { exportElementToPdf } from '../utils/exportToPdf';

interface AccountsViewProps {
  settings: AppSettings;
  hideValues: boolean;
  accounts: Account[];
  onAddAccount: (acc: Account) => void;
  onUpdateAccountBalance: (accountId: string, newBalance: number) => void;
  onOpenTransferModal: () => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  settings,
  hideValues,
  accounts,
  onAddAccount,
  onUpdateAccountBalance,
  onOpenTransferModal,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [nameAr, setNameAr] = useState('');
  const [accType, setAccType] = useState<'bank' | 'cash' | 'card' | 'wallet'>('bank');
  const [initialBalance, setInitialBalance] = useState('');
  const [accountNum, setAccountNum] = useState('');

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editBalanceValue, setEditBalanceValue] = useState<string>('');

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const mask = (val: string) => (hideValues ? '••••••' : val);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) return;

    const newAcc: Account = {
      id: generateId('acc'),
      nameAr: nameAr.trim(),
      nameEn: nameAr.trim(),
      accountNumber: accountNum.trim() || undefined,
      type: accType,
      balance: parseFloat(initialBalance) || 0,
      icon: accType === 'bank' ? 'Landmark' : accType === 'cash' ? 'Wallet' : 'Smartphone',
      color: accType === 'bank' ? 'blue' : accType === 'cash' ? 'amber' : 'purple',
    };

    onAddAccount(newAcc);
    setShowAddModal(false);
    setNameAr('');
    setInitialBalance('');
    setAccountNum('');
  };

  const saveEditedBalance = () => {
    if (editingAccountId) {
      const val = parseFloat(editBalanceValue);
      if (!isNaN(val)) {
        onUpdateAccountBalance(editingAccountId, val);
      }
      setEditingAccountId(null);
    }
  };

  const exportToExcel = () => {
    const headers = ['اسم الحساب', 'نوع الحساب', 'رقم الحساب', 'الرصيد'];
    const rows = accounts.map(acc => [
      acc.nameAr,
      acc.type === 'bank' ? 'بنكي' : acc.type === 'cash' ? 'خزينة' : 'محفظة رقمية',
      acc.accountNumber || '-',
      acc.balance
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_الحسابات_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAccountGradient = (type: string) => {
    switch (type) {
      case 'bank':
        return 'from-blue-900/80 via-slate-900 to-indigo-950 border-blue-500/30';
      case 'cash':
        return 'from-amber-900/80 via-slate-900 to-orange-950 border-amber-500/30';
      case 'wallet':
        return 'from-purple-900/80 via-slate-900 to-fuchsia-950 border-purple-500/30';
      default:
        return 'from-emerald-900/80 via-slate-900 to-teal-950 border-emerald-500/30';
    }
  };

  return (
    <div className="flex-1 p-3 space-y-3.5 pb-20 dir-rtl text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-white">إدارة الحسابات والمحافظ</h2>
          <p className="text-[11px] text-gray-400">تابع أرصدة البنوك، الخزينة، والمحافظ الإلكترونية</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenTransferModal}
            className="bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-bold px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            تحويل
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            إضافة حساب
          </button>
        </div>
      </div>

      {/* Total Liquidity summary */}
      <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[11px] text-gray-400 block">إجمالي السيولة النقدية المتاحة</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => exportElementToPdf('accounts-list-container', `تقرير_الحسابات_${new Date().toISOString().split('T')[0]}.pdf`)}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 p-1.5 rounded-lg transition-colors"
              title="تصدير PDF"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={exportToExcel}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 p-1.5 rounded-lg transition-colors"
              title="تصدير Excel (CSV)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <span className="text-2xl font-black text-emerald-400 font-mono dir-ltr text-right block">
          {mask(formatCurrency(totalBalance, settings.currency, settings.language))}
        </span>
      </div>

      {/* Accounts Cards List */}
      <div id="accounts-list-container" className="space-y-2.5">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className={`relative overflow-hidden bg-gradient-to-br ${getAccountGradient(
              acc.type
            )} border rounded-3xl p-4 shadow-lg space-y-3`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                  {acc.type === 'bank' ? (
                    <Landmark className="w-5 h-5 text-sky-300" />
                  ) : acc.type === 'cash' ? (
                    <Wallet className="w-5 h-5 text-amber-300" />
                  ) : (
                    <Smartphone className="w-5 h-5 text-purple-300" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">{acc.nameAr}</h3>
                  {acc.accountNumber && (
                    <p className="text-[10px] text-gray-300 font-mono tracking-wider dir-ltr text-right">
                      {acc.accountNumber}
                    </p>
                  )}
                </div>
              </div>

              <span className="bg-black/40 text-gray-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-white/10">
                {acc.type === 'bank' ? 'بنكي' : acc.type === 'cash' ? 'خزينة' : 'محفظة رقمية'}
              </span>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-gray-300">الرصيد الحالي:</span>
              
              {editingAccountId === acc.id ? (
                <div className="flex items-center gap-1.5 no-print">
                  <input
                    type="number"
                    value={editBalanceValue}
                    onChange={(e) => setEditBalanceValue(e.target.value)}
                    className="w-24 bg-black/40 border border-white/20 rounded text-sm text-white px-1 py-0.5 text-center dir-ltr focus:outline-none"
                    autoFocus
                  />
                  <button onClick={saveEditedBalance} className="text-emerald-400 hover:text-emerald-300 bg-black/20 p-1 rounded-md">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingAccountId(null)} className="text-red-400 hover:text-red-300 bg-black/20 p-1 rounded-md">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-white font-mono dir-ltr">
                    {mask(formatCurrency(acc.balance, settings.currency, settings.language))}
                  </span>
                  {!hideValues && (
                    <button 
                      onClick={() => {
                        setEditingAccountId(acc.id);
                        setEditBalanceValue(acc.balance.toString());
                      }}
                      className="text-white/40 hover:text-white p-1 rounded-md transition-colors no-print"
                      title="تعديل الرصيد"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal to add account */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl text-white space-y-4">
            <h3 className="text-sm font-extrabold text-white">إضافة حساب مالي أو محفظة جديدة</h3>

            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="text-xs text-gray-300 font-bold block mb-1">اسم الحساب / البنك</label>
                <input
                  type="text"
                  placeholder="مثال: بنك الرياض، محفظة urpay..."
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-bold block mb-1">نوع الحساب</label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="bank">حساب بنكي</option>
                  <option value="cash">صندوق نقدي (خزينة)</option>
                  <option value="wallet">محفظة إلكترونية</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-300 font-bold block mb-1">الرصيد الافتتاحي (ر.س)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono text-left dir-ltr"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-bold block mb-1">رقم الحساب / الايبان IBAN</label>
                <input
                  type="text"
                  placeholder="اختياري..."
                  value={accountNum}
                  onChange={(e) => setAccountNum(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-2xl text-xs hover:bg-emerald-400"
                >
                  إضافة الحساب
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-800 text-gray-300 font-bold px-4 py-2.5 rounded-2xl text-xs hover:bg-slate-700"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
