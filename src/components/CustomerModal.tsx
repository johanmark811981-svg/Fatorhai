import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, User, Hash, MapPin, Phone, Mail, UserPlus } from 'lucide-react';
import { Customer } from '../types';
import { generateId } from '../utils/formatters';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Customer) => void;
  customer?: Customer | null;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customer,
}) => {
  const [name, setName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [nationalAddress, setNationalAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setTaxNumber(customer.taxNumber || '');
      setNationalAddress(customer.nationalAddress || '');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
    } else {
      setName('');
      setTaxNumber('');
      setNationalAddress('');
      setPhone('');
      setEmail('');
    }
  }, [customer, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    onSave({
      id: customer?.id || generateId('cust'),
      name,
      taxNumber,
      nationalAddress,
      phone,
      email,
      createdAt: customer?.createdAt || new Date().toISOString(),
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm dir-rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black">{customer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</h2>
                <p className="text-[10px] text-white/70">أدخل معلومات التواصل والبيانات الضريبية</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    اسم العميل / المؤسسة
                  </label>
                  <input
                    autoFocus
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: شركة الحلول المتقدمة"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                  />
                </div>

                {/* Tax Number */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-blue-400" />
                    الرقم الضريبي
                  </label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="300000000000003"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    رقم التواصل
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0500000000"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-all shadow-inner text-left"
                  />
                </div>

                {/* Email */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@example.com"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all shadow-inner text-left"
                  />
                </div>

                {/* National Address */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    العنوان الوطني / الموقع
                  </label>
                  <textarea
                    rows={2}
                    value={nationalAddress}
                    onChange={(e) => setNationalAddress(e.target.value)}
                    placeholder="مثال: الرياض، حي الملقا، طريق أنس بن مالك"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all shadow-inner resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 bg-slate-950/50 border-t border-white/5 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-slate-800 text-gray-300 py-3 rounded-2xl text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-[2] bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 hover:from-blue-400 hover:to-indigo-400 transition-all shadow-lg shadow-blue-500/20"
              >
                <Save className="w-4 h-4" />
                {customer ? 'حفظ التعديلات' : 'إضافة العميل'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
