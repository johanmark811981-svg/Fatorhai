import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  Hash,
  UserCheck,
  Building2,
  PhoneCall
} from 'lucide-react';
import { Customer } from '../types';

interface CustomersViewProps {
  customers: Customer[];
  onOpenCreateCustomerModal: () => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

// Function to extract initials from Arabic/English names
const getInitials = (name: string): string => {
  if (!name) return 'ع';
  const clean = name.replace(/[إأآا]لـ/g, '').trim(); // Remove "Al-" or similar prefix if present
  const parts = clean.split(/\s+/);
  if (parts.length > 1) {
    return (parts[0][0] || '') + (parts[1] ? parts[1][0] : '');
  }
  return clean.substring(0, 2);
};

// Elegant background gradient selection based on string hash
const getAvatarColor = (name: string): string => {
  const colors = [
    'from-blue-500 to-indigo-600 shadow-blue-500/20 text-blue-100',
    'from-teal-500 to-emerald-600 shadow-teal-500/20 text-teal-100',
    'from-purple-500 to-pink-600 shadow-purple-500/20 text-purple-100',
    'from-amber-500 to-orange-600 shadow-amber-500/20 text-amber-100',
    'from-rose-500 to-red-600 shadow-rose-500/20 text-rose-100',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onOpenCreateCustomerModal,
  onEditCustomer,
  onDeleteCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(c => {
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || 
           (c.phone && c.phone.includes(term)) ||
           (c.taxNumber && c.taxNumber.includes(term));
  });

  // Calculate high-fidelity stats
  const totalCount = customers.length;
  const vatCount = customers.filter(c => c.taxNumber && c.taxNumber.trim().length > 0).length;
  const whatsappCount = customers.filter(c => c.phone && c.phone.trim().length > 0).length;

  return (
    <div className="flex-1 p-3 space-y-4 pb-20 dir-rtl text-white">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-500/5">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">إدارة العملاء</h1>
              <p className="text-[11px] text-gray-400">تنظيم قاعدة البيانات والعناوين الوطنية والأرقام الضريبية</p>
            </div>
          </div>
          <button
            onClick={onOpenCreateCustomerModal}
            className="bg-blue-500 hover:bg-blue-400 text-white p-3.5 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* CRM Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold">
              <Users className="w-3 h-3 text-blue-400" />
              <span>العملاء</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-black text-white font-mono">{totalCount}</span>
              <span className="text-[9px] text-gray-500 font-bold">مسجل</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold">
              <Building2 className="w-3 h-3 text-teal-400" />
              <span>الرقم الضريبي</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-black text-teal-400 font-mono">{vatCount}</span>
              <span className="text-[9px] text-gray-500 font-bold">مؤسسة</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold">
              <PhoneCall className="w-3 h-3 text-amber-400" />
              <span>التواصل</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-black text-amber-400 font-mono">{whatsappCount}</span>
              <span className="text-[9px] text-gray-500 font-bold">نشط</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="البحث باسم العميل، جوال، أو رقم ضريبي..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 pr-11 text-xs text-white focus:outline-none focus:border-blue-500 transition-all shadow-inner placeholder-gray-500"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 hover:text-white"
            >
              مسح
            </button>
          )}
        </div>
      </div>

      {/* Customers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900/90 border border-white/5 rounded-3xl p-3.5 flex flex-col gap-3 relative overflow-hidden group hover:border-blue-500/30 transition-all shadow-md hover:shadow-lg hover:shadow-blue-500/5"
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3 overflow-hidden">
                  {/* Stylish initials avatar with gradients */}
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(c.name)} flex items-center justify-center text-xs font-black tracking-wider uppercase shrink-0 shadow-md`}>
                    {getInitials(c.name)}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="text-xs font-black text-white group-hover:text-blue-300 transition-colors truncate">{c.name}</h3>
                    {c.taxNumber ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Hash className="w-3 h-3 text-teal-400/70" />
                        <span className="text-[9px] text-teal-300 font-mono">الرقم الضريبي: {c.taxNumber}</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-gray-500 block">لا يوجد رقم ضريبي</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button 
                    onClick={() => onEditCustomer(c)}
                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => onDeleteCustomer(c.id)}
                    className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-2 gap-1.5 text-[9px] text-gray-400 relative z-10">
                {c.phone ? (
                  <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-xl border border-white/5">
                    <Phone className="w-3 h-3 text-blue-400/70 shrink-0" />
                    <span className="font-mono truncate">{c.phone}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-slate-950/20 p-1.5 rounded-xl border border-white/5 opacity-40">
                    <Phone className="w-3 h-3 text-gray-600 shrink-0" />
                    <span className="truncate">بدون جوال</span>
                  </div>
                )}
                
                {c.email ? (
                  <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-xl border border-white/5 overflow-hidden">
                    <Mail className="w-3 h-3 text-purple-400/70 shrink-0" />
                    <span className="truncate font-mono">{c.email}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-slate-950/20 p-1.5 rounded-xl border border-white/5 opacity-40">
                    <Mail className="w-3 h-3 text-gray-600 shrink-0" />
                    <span className="truncate">بدون إيميل</span>
                  </div>
                )}

                {c.nationalAddress ? (
                  <div className="col-span-2 flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-xl border border-white/5">
                    <MapPin className="w-3 h-3 text-amber-400/70 shrink-0" />
                    <span className="truncate">{c.nationalAddress}</span>
                  </div>
                ) : (
                  <div className="col-span-2 flex items-center gap-1.5 bg-slate-950/20 p-1.5 rounded-xl border border-white/5 opacity-40">
                    <MapPin className="w-3 h-3 text-gray-600 shrink-0" />
                    <span className="truncate">العنوان الوطني غير محدد</span>
                  </div>
                )}
              </div>

              {/* Background Glow */}
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full pointer-events-none group-hover:bg-blue-500/10 transition-all"></div>
            </div>
          ))
        ) : (
          <div className="md:col-span-2 py-12 flex flex-col items-center justify-center text-gray-500 space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-white/5">
              <Users className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-xs">لا يوجد عملاء يطابقون بحثك</p>
            <button
              onClick={onOpenCreateCustomerModal}
              className="text-xs text-blue-400 font-bold hover:underline"
            >
              إضافة عميلك الأول الآن
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
