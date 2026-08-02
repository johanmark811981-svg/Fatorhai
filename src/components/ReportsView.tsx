import React, { useState } from 'react';
import { Pencil, Check, X, BarChart3, TrendingUp, TrendingDown, PieChart as PieIcon, AlertTriangle, Printer, Download, FileDown, Share2, Mail, Building, Landmark, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Account, AppSettings, Category, Transaction, FixedAsset } from '../types';
import { formatCurrency } from '../utils/formatters';
import { exportElementToPdf, shareViaWhatsApp, shareViaEmail } from '../utils/exportToPdf';
import { calculateAssetsSummary, ASSET_CATEGORY_INFO } from '../utils/assetCalculations';

const CHART_COLORS = ['#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16', '#a855f7'];

interface ReportsViewProps {
  settings: AppSettings;
  hideValues: boolean;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  assets?: FixedAsset[];
  onExportBackup: () => void;
  onUpdateCategory?: (categoryId: string, updates: Partial<Category>) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  settings,
  hideValues,
  transactions,
  categories,
  accounts,
  assets = [],
  onExportBackup,
  onUpdateCategory,
}) => {
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editBudgetLimit, setEditBudgetLimit] = useState<string>('');

  const handleSaveBudget = () => {
    if (editingCategoryId && onUpdateCategory) {
      const val = parseFloat(editBudgetLimit);
      onUpdateCategory(editingCategoryId, { budgetLimit: isNaN(val) ? undefined : val });
      setEditingCategoryId(null);
    }
  };

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Fixed Assets Calculations
  const assetsSummary = calculateAssetsSummary(assets);
  const totalDepreciationExpense = assetsSummary.totalAnnualDepreciation;

  // Operating Net Profit (before and after depreciation)
  const netProfitOperating = totalIncome - totalExpense;
  const netProfitAfterDepreciation = netProfitOperating - totalDepreciationExpense;
  const profitMargin = totalIncome > 0 ? ((netProfitAfterDepreciation / totalIncome) * 100).toFixed(1) : '0';

  // Bank & Cash Total
  const totalCashAndBank = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Total Enterprise Assets (Cash + Net Book Value of Fixed Assets)
  const totalEnterpriseAssets = totalCashAndBank + assetsSummary.totalNetBookValue;

  const mask = (val: string) => (hideValues ? '••••••' : val);

  // Group expenses by category for Pie Chart
  const expenseByCategory = categories
    .map((cat) => {
      const amount = transactions
        .filter((t) => t.type === 'expense' && t.categoryId === cat.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        id: cat.id,
        name: cat.nameAr,
        value: amount,
      };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const handleExportPdf = () => {
    exportElementToPdf('financial-report-container', `Financial-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleShareWhatsApp = () => {
    const text = `*ملخص القوائم والمقارنات المالية - ${settings.companyName}*\n\n- إجمالي الإيرادات: ${formatCurrency(totalIncome, settings.currency, settings.language)}\n- إجمالي المصروفات: ${formatCurrency(totalExpense, settings.currency, settings.language)}\n- مصروف الإهلاك: ${formatCurrency(totalDepreciationExpense, settings.currency, settings.language)}\n- صافي الأرباح النهائبة: ${formatCurrency(netProfitAfterDepreciation, settings.currency, settings.language)}\n- صافي قيمة الأصول الثابتة: ${formatCurrency(assetsSummary.totalNetBookValue, settings.currency, settings.language)}\n\nـ صادر من تطبيق النواة المالي الشامل.`;
    shareViaWhatsApp(`تقرير مالية ${settings.companyName}`, text);
  };

  const handleShareEmail = () => {
    const subject = `التقرير والملخص المالي - ${settings.companyName}`;
    const body = `مرحباً،\n\nإليكم الملخص المالي بالفترة الحالية:\n- إجمالي الإيرادات: ${formatCurrency(totalIncome, settings.currency, settings.language)}\n- إجمالي المصروفات: ${formatCurrency(totalExpense, settings.currency, settings.language)}\n- مصروف إهلاك الأصول: ${formatCurrency(totalDepreciationExpense, settings.currency, settings.language)}\n- صافي الربح/الخسارة: ${formatCurrency(netProfitAfterDepreciation, settings.currency, settings.language)}\n- صافي القيمة الدفترية للأصول: ${formatCurrency(assetsSummary.totalNetBookValue, settings.currency, settings.language)}\n\nشاكرين ومقدرين.`;
    shareViaEmail(subject, body);
  };

  return (
    <div className="flex-1 p-3 space-y-3.5 pb-20 dir-rtl text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-white">الميزانية والتقارير المالية</h2>
          <p className="text-[11px] text-gray-400">قائمة الأرباح والخسائر ومراقبة الحدود الائتمانية</p>
        </div>
        <button
          onClick={onExportBackup}
          className="bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 border border-white/10 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          نسخة احتياطية
        </button>
      </div>

      {/* Sharing & Export Toolbar */}
      <div className="grid grid-cols-3 gap-2 bg-slate-900/90 border border-white/10 p-2 rounded-2xl">
        <button
          onClick={handleExportPdf}
          className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-2 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>تصدير PDF</span>
        </button>
        <button
          onClick={handleShareWhatsApp}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>مشاركة واتساب</span>
        </button>
        <button
          onClick={handleShareEmail}
          className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>إرسال إيميل</span>
        </button>
      </div>

      <div id="financial-report-container" className="space-y-3.5">

      {/* Profit & Loss Card (قائمة الأرباح والخسائر) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/40 border border-emerald-500/30 rounded-3xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" />
            قائمة الأرباح والخسائر (P&L)
          </span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
            هامش الربح: {profitMargin}%
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center text-gray-300">
            <span>إجمالي الإيرادات المباشرة:</span>
            <span className="font-mono font-bold text-emerald-400">
              +{mask(formatCurrency(totalIncome, settings.currency, settings.language))}
            </span>
          </div>

          <div className="flex justify-between items-center text-gray-300">
            <span>إجمالي المصروفات والتشغيل:</span>
            <span className="font-mono font-bold text-rose-400">
              -{mask(formatCurrency(totalExpense, settings.currency, settings.language))}
            </span>
          </div>

          <div className="flex justify-between items-center text-gray-400 pt-1">
            <span className="flex items-center gap-1">
              <span>مصروف إهلاك الأصول الثابتة (السنوي):</span>
            </span>
            <span className="font-mono font-bold text-purple-300">
              -{mask(formatCurrency(totalDepreciationExpense, settings.currency, settings.language))}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-white/10 text-sm font-extrabold">
            <span>صافي الربح النهائي (بعد الإهلاك):</span>
            <span className={`font-mono ${netProfitAfterDepreciation >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {mask(formatCurrency(netProfitAfterDepreciation, settings.currency, settings.language))}
            </span>
          </div>
        </div>
      </div>

      {/* Balance Sheet Card (قائمة المركز المالي والميزانية العمومية) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/30 border border-amber-500/30 rounded-3xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-amber-400" />
            قائمة المركز المالي والميزانية العمومية (Balance Sheet)
          </span>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
            مستويات الأصول
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          {/* Current Assets */}
          <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center font-bold text-gray-200">
              <span className="flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                الأصول المتداولة (النقدية والبنوك):
              </span>
              <span className="font-mono text-emerald-400">
                {mask(formatCurrency(totalCashAndBank, settings.currency, settings.language))}
              </span>
            </div>
          </div>

          {/* Fixed Assets Breakdown */}
          <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center font-bold text-gray-200">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-amber-400" />
                الأصول الثابتة غير المتداولة (Fixed Assets):
              </span>
              <span className="font-mono text-amber-300">
                {mask(formatCurrency(assetsSummary.totalPurchaseCost, settings.currency, settings.language))}
              </span>
            </div>

            <div className="pr-4 space-y-1 text-[11px] text-gray-400">
              <div className="flex justify-between items-center">
                <span>• إجمالي تكلفة الشراء التاريخية:</span>
                <span className="font-mono">{mask(formatCurrency(assetsSummary.totalPurchaseCost, settings.currency, settings.language, true))}</span>
              </div>
              <div className="flex justify-between items-center text-rose-400">
                <span>• يخصم: مجمع الإهلاك التراكمي:</span>
                <span className="font-mono">-{mask(formatCurrency(assetsSummary.totalAccumulatedDepreciation, settings.currency, settings.language, true))}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-emerald-300 pt-1 border-t border-white/5">
                <span>= صافي القيمة الدفترية للأصول الثابتة:</span>
                <span className="font-mono">{mask(formatCurrency(assetsSummary.totalNetBookValue, settings.currency, settings.language, true))}</span>
              </div>
            </div>
          </div>

          {/* Total Enterprise Assets */}
          <div className="flex justify-between items-center p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-extrabold text-amber-300">
            <span>إجمالي أصول المنشأة (Assets Total):</span>
            <span className="font-mono text-sm">
              {mask(formatCurrency(totalEnterpriseAssets, settings.currency, settings.language))}
            </span>
          </div>
        </div>
      </div>

      {/* Expense Pie Chart Card */}
      <div className="bg-slate-900/90 border border-purple-500/30 rounded-3xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-xs font-extrabold text-purple-300 flex items-center gap-1.5">
            <PieIcon className="w-4 h-4" />
            توزيع المصروفات حسب الفئة (Pie Chart)
          </span>
          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">
            {expenseByCategory.length} فئات
          </span>
        </div>

        {expenseByCategory.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">لا توجد مصروفات مسجلة لعرض التوزيع البياني.</p>
        ) : (
          <div className="space-y-3">
            <div className="h-48 w-full dir-ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [
                      mask(formatCurrency(Number(value) || 0, settings.currency, settings.language)),
                      'المبلغ',
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend Grid */}
            <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/10">
              {expenseByCategory.map((item, index) => {
                const percentage = totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0;
                return (
                  <div key={item.id} className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded-xl text-[10px] border border-white/5">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-gray-200 font-bold truncate">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-purple-300 shrink-0">
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Budget Monitoring per Category */}
      <div className="space-y-2">
        <h3 className="text-xs font-extrabold text-gray-200">مراقبة حدود الميزانيات الشهرية للأقسام</h3>

        <div className="space-y-2">
          {categories
            .filter((c) => c.type === 'expense' && c.budgetLimit)
            .map((cat) => {
              const spent = transactions
                .filter((t) => t.type === 'expense' && t.categoryId === cat.id)
                .reduce((sum, t) => sum + t.amount, 0);

              const limit = cat.budgetLimit || 1;
              const percent = Math.min(Math.round((spent / limit) * 100), 100);
              const isWarning = percent >= 80;
              const isExceeded = percent >= 100;

              return (
                <div key={cat.id} className="bg-slate-900/80 border border-white/10 rounded-2xl p-3 space-y-1.5 shadow-md">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-white flex items-center gap-1.5">
                      {cat.nameAr}
                      {isWarning && (
                        <AlertTriangle className={`w-3.5 h-3.5 ${isExceeded ? 'text-rose-400 animate-bounce' : 'text-amber-400'}`} />
                      )}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {mask(formatCurrency(spent, settings.currency, settings.language, true))} / {mask(formatCurrency(limit, settings.currency, settings.language, true))}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
                    <span>نسبة الاستهلاك: {percent}%</span>
                    <span>المتبقي: {mask(formatCurrency(Math.max(0, limit - spent), settings.currency, settings.language))}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      </div>
    </div>
  );
};

