import React, { useState } from 'react';
import { Contract, ContractType, ContractStatus, AppSettings } from '../types';
import { FileText, Plus, BellRing, Calendar, Trash2, Edit3, X, CheckCircle, AlertTriangle } from 'lucide-react';

interface ContractsViewProps {
  settings: AppSettings;
  contracts: Contract[];
  onAddContract: (contract: Contract) => void;
  onUpdateContract: (id: string, contract: Partial<Contract>) => void;
  onDeleteContract: (id: string) => void;
}

export const ContractsView: React.FC<ContractsViewProps> = ({
  settings,
  contracts,
  onAddContract,
  onUpdateContract,
  onDeleteContract,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [type, setType] = useState<ContractType>('service');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState('');
  const [renewalNoticeDays, setRenewalNoticeDays] = useState('30');
  const [status, setStatus] = useState<ContractStatus>('active');
  const [autoRenew, setAutoRenew] = useState(false);
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingContract(null);
    setTitle('');
    setVendorName('');
    setType('service');
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
    setAmount('');
    setRenewalNoticeDays('30');
    setStatus('active');
    setAutoRenew(false);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Contract) => {
    setEditingContract(c);
    setTitle(c.title);
    setVendorName(c.vendorName);
    setType(c.type);
    setStartDate(c.startDate);
    setEndDate(c.endDate);
    setAmount(c.amount ? c.amount.toString() : '');
    setRenewalNoticeDays(c.renewalNoticeDays.toString());
    setStatus(c.status);
    setAutoRenew(c.autoRenew || false);
    setNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContract) {
      onUpdateContract(editingContract.id, {
        title, vendorName, type, startDate, endDate,
        amount: amount ? parseFloat(amount) : undefined,
        renewalNoticeDays: parseInt(renewalNoticeDays, 10),
        status, autoRenew, notes
      });
    } else {
      onAddContract({
        id: 'cnt_' + Date.now().toString(),
        title, vendorName, type, startDate, endDate,
        amount: amount ? parseFloat(amount) : undefined,
        renewalNoticeDays: parseInt(renewalNoticeDays, 10),
        status, autoRenew, notes
      });
    }
    setIsModalOpen(false);
  };

  const getStatusBadge = (contract: Contract) => {
    // Determine dynamic status based on dates
    const today = new Date();
    const end = new Date(contract.endDate);
    const timeDiff = end.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    let currentStatus = contract.status;
    let badgeClass = 'bg-gray-500/20 text-gray-400';
    let label = 'مسجل';

    if (currentStatus === 'cancelled') {
      badgeClass = 'bg-rose-500/20 text-rose-400';
      label = 'ملغى';
    } else if (currentStatus === 'renewed') {
      badgeClass = 'bg-sky-500/20 text-sky-400';
      label = 'مجدد';
    } else if (daysDiff < 0) {
      badgeClass = 'bg-rose-500/20 text-rose-500 font-bold';
      label = 'منتهي';
    } else if (daysDiff <= contract.renewalNoticeDays) {
      badgeClass = 'bg-amber-500/20 text-amber-400 font-bold animate-pulse';
      label = `تجديد خلال ${daysDiff} يوم`;
    } else {
      badgeClass = 'bg-emerald-500/20 text-emerald-400';
      label = 'نشط';
    }

    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full ${badgeClass}`}>
        {label}
      </span>
    );
  };

  const getDaysDiff = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const timeDiff = end.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  return (
    <div className="flex-1 p-3 space-y-4 pb-20 dir-rtl text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-white">إدارة العقود</h2>
          <p className="text-[11px] text-gray-400">تتبع تواريخ انتهاء العقود والاشتراكات</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl flex items-center justify-center shadow-lg transition-transform active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Contracts List */}
      <div className="space-y-3">
        {contracts.length === 0 ? (
          <div className="text-center py-10 text-gray-500 space-y-2">
            <FileText className="w-10 h-10 mx-auto opacity-50" />
            <p className="text-sm">لا توجد عقود مسجلة</p>
          </div>
        ) : (
          contracts.map(contract => {
            const daysDiff = getDaysDiff(contract.endDate);
            const isAlert = contract.status !== 'cancelled' && contract.status !== 'renewed' && daysDiff <= contract.renewalNoticeDays;

            return (
              <div key={contract.id} className={`bg-slate-900/90 border ${isAlert ? 'border-amber-500/50' : 'border-white/10'} rounded-3xl p-4 space-y-3 shadow-lg relative overflow-hidden`}>
                {isAlert && <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500" />}
                
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {contract.title}
                      {isAlert && <BellRing className="w-3.5 h-3.5 text-amber-400" />}
                    </h3>
                    <p className="text-xs text-gray-400">{contract.vendorName}</p>
                  </div>
                  {getStatusBadge(contract)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>البداية: {contract.startDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Calendar className="w-3.5 h-3.5 text-rose-400" />
                    <span>النهاية: {contract.endDate}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="text-xs text-emerald-400 font-mono font-bold">
                    {contract.amount ? `${contract.amount} ${settings.currency}` : 'غير محدد'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditModal(contract)} className="text-sky-400 p-1.5 bg-sky-500/10 rounded-lg hover:bg-sky-500/20">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDeleteContract(contract.id)} className="text-rose-400 p-1.5 bg-rose-500/10 rounded-lg hover:bg-rose-500/20">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm dir-rtl">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                {editingContract ? 'تعديل بيانات العقد' : 'إضافة عقد جديد'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white p-1 bg-slate-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 font-bold block mb-1">اسم العقد / الوصف</label>
                <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="مثال: إيجار المكتب السنوي" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-bold block mb-1">الجهة / المورد</label>
                  <input required type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-bold block mb-1">نوع العقد</label>
                  <select value={type} onChange={(e) => setType(e.target.value as ContractType)} className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                    <option value="rent">إيجار</option>
                    <option value="service">خدمات</option>
                    <option value="subscription">اشتراك</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-bold block mb-1">تاريخ البداية</label>
                  <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-bold block mb-1">تاريخ النهاية</label>
                  <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-bold block mb-1">قيمة العقد (اختياري)</label>
                  <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white font-mono dir-ltr focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-bold block mb-1">التنبيه قبل التجديد بـ (يوم)</label>
                  <input required type="number" min="1" value={renewalNoticeDays} onChange={(e) => setRenewalNoticeDays(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white font-mono dir-ltr focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              {editingContract && (
                <div>
                  <label className="text-xs text-gray-300 font-bold block mb-1">حالة العقد</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as ContractStatus)} className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                    <option value="active">نشط</option>
                    <option value="renewed">تم التجديد</option>
                    <option value="cancelled">ملغى</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="autoRenew" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} className="w-4 h-4 rounded bg-slate-950 border-white/10 text-emerald-500 focus:ring-emerald-500" />
                <label htmlFor="autoRenew" className="text-xs text-gray-300">يجدد تلقائياً</label>
              </div>

              <div>
                <label className="text-xs text-gray-300 font-bold block mb-1">ملاحظات</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl text-sm transition-all shadow-lg active:scale-95">
                {editingContract ? 'تحديث العقد' : 'حفظ العقد'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
