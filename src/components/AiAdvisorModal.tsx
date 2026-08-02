import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Bot, TrendingUp, AlertCircle, Lightbulb, CheckCircle2 } from 'lucide-react';
import { Account, AppSettings, Category, Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';

interface AiAdvisorModalProps {
  isOpen: boolean;
  settings: AppSettings;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onClose: () => void;
}

export const AiAdvisorModal: React.FC<AiAdvisorModalProps> = ({
  isOpen,
  settings,
  transactions,
  categories,
  accounts,
  onClose,
}) => {
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'أهلاً بك! أنا مستشارك المالي الذكي المخصص لهاتف iPhone 17 Pro Max. لقد قمت بتحليل جميع حركاتك المالية الأخيرة، وأنا جاهز لتقديم تقييم مالي وتوصيات مخصصة لزيادة أرباحك.',
      time: 'الآن',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!isOpen) return null;

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  // Generate automated financial diagnosis
  const generateFinancialDiagnosis = () => {
    let insights: string[] = [];
    if (netProfit > 0) {
      insights.push(`• لديك فائض مالي إيجابي قدره ${formatCurrency(netProfit, settings.currency, settings.language)}.`);
    } else {
      insights.push(`• تنبيه: المصروفات تتجاوز الإيرادات بمقدار ${formatCurrency(Math.abs(netProfit), settings.currency, settings.language)}.`);
    }

    // Top expense category
    const expCats = categories.filter((c) => c.type === 'expense');
    let highestCat = { name: '', amount: 0 };
    expCats.forEach((cat) => {
      const sum = transactions.filter((t) => t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0);
      if (sum > highestCat.amount) highestCat = { name: cat.nameAr, amount: sum };
    });

    if (highestCat.amount > 0) {
      insights.push(`• أعلى تصنيف مصروفات هذا الشهر هو (${highestCat.name}) بقيمة ${formatCurrency(highestCat.amount, settings.currency, settings.language)}.`);
    }

    insights.push('• نصيحة: ينصح بتخصيص 20% من الإيرادات كاحتياطي طوارئ في صندوق خاص.');

    return insights.join('\n');
  };

  const handleSend = (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim()) return;

    const userMsg = { sender: 'user' as const, text: textToSend, time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsAnalyzing(true);

    setTimeout(() => {
      let aiReply = '';
      if (textToSend.includes('تقليل') || textToSend.includes('مصروفات') || textToSend.includes('توفير')) {
        aiReply = `بناءً على سجل حركاتك، أقترح الخطوات التالية لتوفير المصروفات:\n1. مراجعة اشتراكات البرامج والخدمات السحابية وإلغاء الخدمات غير المستخدمة.\n2. وضع حد أقصى للضيافة والنثريات لا يتجاوز 1,000 ريال شهرياً.\n3. تفاوض مع الموردين للحصول على خصومات دفع نقدي مبكر.`;
      } else if (textToSend.includes('أداء') || textToSend.includes('تحليل') || textToSend.includes('وضع')) {
        aiReply = generateFinancialDiagnosis();
      } else {
        aiReply = `بناءً على بياناتك الحالية (إجمالي سيولة ${formatCurrency(
          accounts.reduce((a, b) => a + b.balance, 0),
          settings.currency
        )}):\nوضعك المالي مستقر. يوصى بمتابعة تحصيل الفواتير المعلقة في أقرب وقت لتعزيز التدفق النقدي.`;
      }

      setMessages((prev) => [...prev, { sender: 'ai', text: aiReply, time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) }]);
      setIsAnalyzing(false);
    }, 1000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md dir-rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="w-full max-w-lg bg-slate-900 border border-purple-500/30 rounded-3xl p-4 shadow-2xl text-white flex flex-col h-[80vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white">المستشار المالي بالذكاء الاصطناعي</h2>
                <p className="text-[10px] text-purple-300">مساعد تحليلي لميزانيتك وأرباحك (Pro 17 AI)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-slate-800 text-gray-400 hover:text-white p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages body */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3 my-2 scrollbar-thin">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${m.sender === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/30">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] p-3 rounded-2xl text-xs whitespace-pre-line leading-relaxed shadow-md ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-slate-800 border border-white/10 text-gray-100 rounded-tl-none'
                  }`}
                >
                  {m.text}
                  <span className="block text-[9px] text-gray-400 mt-1 text-left font-mono">{m.time}</span>
                </div>
              </div>
            ))}

            {isAnalyzing && (
              <div className="flex items-center gap-2 text-purple-300 text-xs p-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>جاري تحليل البيانات المالية والأرقام...</span>
              </div>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-[10px]">
            <button
              onClick={() => handleSend('ما هو أداء شركتي المالي حالياً؟')}
              className="bg-purple-950/60 hover:bg-purple-900 border border-purple-500/30 text-purple-200 px-2.5 py-1 rounded-xl whitespace-nowrap"
            >
              📊 تقييم الأداء المالي
            </button>
            <button
              onClick={() => handleSend('كيف يمكنني تقليل المصروفات هذا الشهر؟')}
              className="bg-purple-950/60 hover:bg-purple-900 border border-purple-500/30 text-purple-200 px-2.5 py-1 rounded-xl whitespace-nowrap"
            >
              💡 نصائح لتخفيض النفقات
            </button>
          </div>

          {/* Input field */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <input
              type="text"
              placeholder="اطرح سؤالاً مالياً حول حساباتك..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-slate-950 border border-white/10 rounded-2xl py-2.5 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={() => handleSend()}
              className="bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-2xl transition-all active:scale-95 shadow-md shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
