import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp, ShieldCheck, ArrowDownRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { AppSettings } from '../types';

interface DynamicIslandProps {
  settings: AppSettings;
  netBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  recentNotification?: string | null;
  onOpenAiAdvisor: () => void;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  settings,
  netBalance,
  monthlyIncome,
  monthlyExpense,
  recentNotification,
  onOpenAiAdvisor,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'balance' | 'flow'>('balance');

  useEffect(() => {
    if (recentNotification) {
      setIsExpanded(true);
      const timer = setTimeout(() => setIsExpanded(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [recentNotification]);

  return (
    <div className="relative z-50 flex justify-center pt-2 pb-1 px-4">
      <motion.div
        layout
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer bg-black text-white rounded-full px-3 py-1.5 flex items-center gap-2 shadow-2xl border border-white/10 hover:border-white/30 transition-all select-none"
        animate={{
          width: isExpanded ? '92%' : '210px',
          height: isExpanded ? '84px' : '36px',
          borderRadius: isExpanded ? '28px' : '20px',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <motion.div
              key="compact"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full flex items-center justify-between px-1 text-xs font-medium"
            >
              {/* Left Side: Dynamic Island Camera Hole & Indicator */}
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                <span className="text-[10px] text-gray-300 font-mono tracking-tight dir-ltr">
                  17 Pro Max
                </span>
              </div>

              {/* Right Side: Quick Net Profit or Alert */}
              <div className="flex items-center gap-1 text-emerald-400 font-bold dir-rtl">
                <span>{formatCurrency(netBalance, settings.currency, settings.language, true)}</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="w-full h-full flex flex-col justify-between p-1.5 text-xs text-right dir-rtl"
            >
              {recentNotification ? (
                <div className="flex items-center gap-2.5 h-full px-2 text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-bold text-white text-xs truncate">تم تحديث الحسابات</p>
                    <p className="text-[11px] text-gray-300 truncate">{recentNotification}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-[11px] text-gray-300 border-b border-white/10 pb-1">
                    <span className="flex items-center gap-1 text-amber-300 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      المساعد المالي الذكي (iOS 17 Pro)
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAiAdvisor();
                      }}
                      className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition-colors text-[10px]"
                    >
                      <Sparkles className="w-3 h-3" />
                      استشارة AI
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-1.5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 block">إجمالي الواردات</span>
                        <span className="text-emerald-400 font-extrabold text-xs">
                          {formatCurrency(monthlyIncome, settings.currency, settings.language, true)}
                        </span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    </div>

                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-1.5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 block">إجمالي المصروفات</span>
                        <span className="text-rose-400 font-extrabold text-xs">
                          {formatCurrency(monthlyExpense, settings.currency, settings.language, true)}
                        </span>
                      </div>
                      <ArrowDownRight className="w-4 h-4 text-rose-400" />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
