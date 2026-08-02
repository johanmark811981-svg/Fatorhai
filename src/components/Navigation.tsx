import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, ArrowLeftRight, Landmark, FileText, BarChart3, Plus, FileSignature, Package, Users, Receipt, Sparkles, X, Building2 } from 'lucide-react';

export type NavTab = 'dashboard' | 'transactions' | 'accounts' | 'invoices' | 'reports' | 'contracts' | 'products' | 'customers' | 'assets';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onQuickAdd: (type?: string) => void;
  isAdmin: boolean;
  invoicesCount?: number;
  customersCount?: number;
  productsCount?: number;
  contractsCount?: number;
  assetsCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  onQuickAdd,
  isAdmin,
  invoicesCount = 0,
  customersCount = 0,
  productsCount = 0,
  contractsCount = 0,
  assetsCount = 0,
}) => {
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  const tabs = [
    { id: 'dashboard' as NavTab, label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'transactions' as NavTab, label: 'المعاملات', icon: ArrowLeftRight },
    { id: 'accounts' as NavTab, label: 'الحسابات', icon: Landmark },
    { id: 'customers' as NavTab, label: 'العملاء', icon: Users, badge: customersCount > 0 ? customersCount : undefined },
    { id: 'assets' as NavTab, label: 'الأصول الثابتة', icon: Building2, badge: assetsCount > 0 ? assetsCount : undefined },
    { id: 'add_button' as const, label: '', icon: Plus },
    { id: 'invoices' as NavTab, label: 'الفواتير', icon: FileText, badge: invoicesCount > 0 ? invoicesCount : undefined },
    { id: 'products' as NavTab, label: 'الأصناف', icon: Package, badge: productsCount > 0 ? productsCount : undefined },
    { id: 'contracts' as NavTab, label: 'العقود', icon: FileSignature, badge: contractsCount > 0 ? contractsCount : undefined },
    ...(isAdmin ? [{ id: 'reports' as NavTab, label: 'التقارير', icon: BarChart3 }] : []),
  ];

  const quickActions = [
    { id: 'expense', label: 'تسجيل مصروف / إيراد', icon: ArrowLeftRight, color: 'from-emerald-500 to-teal-600', desc: 'إضافة معاملة مالية جديدة لخزينة المنشأة' },
    { id: 'asset', label: 'تسجيل أصل ثابت جديد', icon: Building2, color: 'from-amber-500 to-yellow-600', desc: 'إضافة أصل ثابت جديد (سيارات، عقارات، معدات) مع حساب الإهلاك' },
    { id: 'invoice', label: 'إصدار فاتورة مبيعات', icon: FileText, color: 'from-blue-500 to-indigo-600', desc: 'إنشاء فاتورة ضريبية أو مبسطة جديدة للعميل' },
    { id: 'customer', label: 'إضافة عميل جديد', icon: Users, color: 'from-purple-500 to-pink-600', desc: 'تسجيل عميل جديد مع بيانات التواصل والضرائب' },
    { id: 'product', label: 'إضافة صنف / منتج', icon: Package, color: 'from-amber-500 to-orange-600', desc: 'إضافة منتج أو خدمة لقائمة أصناف المخزون' },
    { id: 'contract', label: 'تسجيل عقد جديد', icon: FileSignature, color: 'from-cyan-500 to-blue-600', desc: 'إضافة عقد توثيق جديد مع الشروط والتواريخ' },
  ];

  return (
    <>
      {/* Intelligent Quick Action Menu Modal / Bottom Sheet */}
      <AnimatePresence>
        {isQuickMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md p-4 dir-rtl">
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-5 shadow-2xl shadow-emerald-500/10 text-white relative overflow-hidden mb-2"
            >
              {/* Background Glow */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">الإجراءات السريعة الذكية</h3>
                    <p className="text-xs text-gray-400">اختر العملية المطلوبة للتنفيذ الفوري</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsQuickMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <motion.button
                      key={action.id}
                      whileHover={{ scale: 1.02, x: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setIsQuickMenuOpen(false);
                        onQuickAdd(action.id);
                      }}
                      className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-white/5 hover:border-emerald-500/40 text-right transition-all group"
                    >
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                          {action.label}
                        </h4>
                        <p className="text-xs text-gray-400 truncate">{action.desc}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Dock */}
      <div className="sticky bottom-0 left-0 right-0 z-40 px-3 pb-2 pt-1 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
        <nav className="relative bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-1.5 flex items-center justify-around shadow-2xl shadow-black/80 dir-rtl">
          {tabs.map((tab) => {
            if (tab.id === 'add_button') {
              return (
                <div key="center_plus" className="relative -top-5 shrink-0 px-1">
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsQuickMenuOpen(true)}
                    className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-300 text-slate-950 font-bold shadow-xl shadow-emerald-500/40 flex items-center justify-center border-2 border-slate-950 hover:brightness-110 transition-all cursor-pointer"
                    title="فتح قائمة الإجراءات السريعة"
                  >
                    <Plus className="w-7 h-7 stroke-[2.5]" />
                  </motion.button>
                </div>
              );
            }

            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.82, y: 2 }}
                whileHover={{ scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                onClick={() => onTabChange(tab.id as NavTab)}
                className={`relative flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors duration-200 group cursor-pointer ${
                  isActive ? 'text-emerald-400 font-bold' : 'text-gray-400 hover:text-gray-200 font-medium'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 rounded-2xl shadow-sm shadow-emerald-500/20"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <motion.div
                  animate={isActive ? { scale: [1, 1.25, 1.1], rotate: [0, -5, 5, 0] } : { scale: 1, rotate: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative z-10"
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'group-hover:text-emerald-300'}`} />
                  {'badge' in tab && tab.badge && tab.badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 bg-emerald-500 text-slate-950 font-black text-[9px] rounded-full shadow-lg"
                    >
                      {tab.badge}
                    </motion.span>
                  )}
                </motion.div>
                <span className={`text-[10px] z-10 truncate tracking-tight transition-all ${isActive ? 'font-bold text-emerald-300 scale-105' : 'text-gray-400'}`}>{tab.label}</span>
              </motion.button>
            );
          })}
        </nav>
      </div>
    </>
  );
};

