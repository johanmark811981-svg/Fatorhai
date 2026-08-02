import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Car, 
  Wrench, 
  Laptop, 
  Armchair, 
  Box, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Calculator, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  FileDown, 
  Layers, 
  Info,
  X,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Building
} from 'lucide-react';
import { FixedAsset, AssetCategory, DepreciationMethod, AppSettings } from '../types';
import { calculateAssetMetrics, calculateAssetsSummary, ASSET_CATEGORY_INFO, DepreciationScheduleRow } from '../utils/assetCalculations';
import { formatCurrency, generateId } from '../utils/formatters';
import { exportElementToPdf } from '../utils/exportToPdf';

interface FixedAssetsViewProps {
  assets: FixedAsset[];
  settings: AppSettings;
  hideValues: boolean;
  onAddAsset: (asset: FixedAsset) => void;
  onUpdateAsset: (id: string, updates: Partial<FixedAsset>) => void;
  onDeleteAsset: (id: string) => void;
}

export const FixedAssetsView: React.FC<FixedAssetsViewProps> = ({
  assets = [],
  settings,
  hideValues,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'sold' | 'disposed'>('active');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);

  // Depreciation Schedule Modal State
  const [scheduleModalAsset, setScheduleModalAsset] = useState<FixedAsset | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    assetCode: string;
    category: AssetCategory;
    purchaseDate: string;
    purchaseCost: string;
    salvageValue: string;
    usefulLifeYears: string;
    depreciationMethod: DepreciationMethod;
    location: string;
    notes: string;
    status: 'active' | 'sold' | 'disposed';
  }>({
    name: '',
    assetCode: '',
    category: 'vehicles',
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchaseCost: '',
    salvageValue: '0',
    usefulLifeYears: '5',
    depreciationMethod: 'straight_line',
    location: '',
    notes: '',
    status: 'active',
  });

  const mask = (val: string) => (hideValues ? '••••••' : val);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;
      const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        asset.name.toLowerCase().includes(query) ||
        (asset.assetCode && asset.assetCode.toLowerCase().includes(query)) ||
        (asset.location && asset.location.toLowerCase().includes(query)) ||
        (asset.notes && asset.notes.toLowerCase().includes(query));

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [assets, selectedCategory, statusFilter, searchQuery]);

  // Overall Calculated Summary
  const summary = useMemo(() => {
    return calculateAssetsSummary(assets);
  }, [assets]);

  // Handle Form Open for Add
  const handleOpenAddModal = () => {
    setEditingAsset(null);
    setFormData({
      name: '',
      assetCode: `AST-${Math.floor(100 + Math.random() * 900)}`,
      category: 'vehicles',
      purchaseDate: new Date().toISOString().slice(0, 10),
      purchaseCost: '',
      salvageValue: '0',
      usefulLifeYears: '5',
      depreciationMethod: 'straight_line',
      location: '',
      notes: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  // Handle Form Open for Edit
  const handleOpenEditModal = (asset: FixedAsset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      assetCode: asset.assetCode || '',
      category: asset.category,
      purchaseDate: asset.purchaseDate,
      purchaseCost: asset.purchaseCost.toString(),
      salvageValue: (asset.salvageValue || 0).toString(),
      usefulLifeYears: asset.usefulLifeYears.toString(),
      depreciationMethod: asset.depreciationMethod || 'straight_line',
      location: asset.location || '',
      notes: asset.notes || '',
      status: asset.status,
    });
    setIsModalOpen(true);
  };

  // Handle Category Change inside Form (auto set default useful life)
  const handleCategoryChangeInForm = (cat: AssetCategory) => {
    const defaultLife = ASSET_CATEGORY_INFO[cat]?.defaultUsefulLife || 5;
    setFormData((prev) => ({
      ...prev,
      category: cat,
      usefulLifeYears: defaultLife.toString(),
    }));
  };

  // Live Modal Preview Metrics
  const modalLiveMetrics = useMemo(() => {
    const cost = parseFloat(formData.purchaseCost) || 0;
    const salvage = parseFloat(formData.salvageValue) || 0;
    const years = parseFloat(formData.usefulLifeYears) || 1;

    const tempAsset: FixedAsset = {
      id: 'temp',
      name: formData.name || 'أصل مؤقت',
      category: formData.category,
      purchaseDate: formData.purchaseDate || new Date().toISOString().slice(0, 10),
      purchaseCost: cost,
      salvageValue: salvage,
      usefulLifeYears: years,
      depreciationMethod: formData.depreciationMethod,
      status: formData.status,
      createdAt: new Date().toISOString(),
    };

    return calculateAssetMetrics(tempAsset);
  }, [formData]);

  // Submit Add / Edit
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const cost = parseFloat(formData.purchaseCost);
    if (isNaN(cost) || cost <= 0) {
      alert('يرجى إدخال قيمة شراء صحيحة وموجبة للأصل');
      return;
    }

    const salvage = parseFloat(formData.salvageValue) || 0;
    const years = parseFloat(formData.usefulLifeYears) || 1;

    if (editingAsset) {
      onUpdateAsset(editingAsset.id, {
        name: formData.name.trim(),
        assetCode: formData.assetCode.trim() || undefined,
        category: formData.category,
        purchaseDate: formData.purchaseDate,
        purchaseCost: cost,
        salvageValue: salvage,
        usefulLifeYears: years,
        depreciationMethod: formData.depreciationMethod,
        location: formData.location.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        status: formData.status,
      });
    } else {
      const newAsset: FixedAsset = {
        id: generateId('asset_'),
        name: formData.name.trim(),
        assetCode: formData.assetCode.trim() || `AST-${Date.now().toString().slice(-4)}`,
        category: formData.category,
        purchaseDate: formData.purchaseDate,
        purchaseCost: cost,
        salvageValue: salvage,
        usefulLifeYears: years,
        depreciationMethod: formData.depreciationMethod,
        location: formData.location.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        status: formData.status,
        createdAt: new Date().toISOString(),
      };
      onAddAsset(newAsset);
    }

    setIsModalOpen(false);
  };

  // Render Category Icon
  const renderCategoryIcon = (category: AssetCategory, className = 'w-5 h-5') => {
    switch (category) {
      case 'vehicles':
        return <Car className={className} />;
      case 'real_estate':
        return <Building2 className={className} />;
      case 'equipment':
        return <Wrench className={className} />;
      case 'computers':
        return <Laptop className={className} />;
      case 'furniture':
        return <Armchair className={className} />;
      default:
        return <Box className={className} />;
    }
  };

  const handleExportPdf = () => {
    exportElementToPdf('fixed-assets-report-container', `Fixed-Assets-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="flex-1 p-3 space-y-3.5 pb-24 dir-rtl text-white">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-amber-400" />
            إدارة الأصول الثابتة وحساب الإهلاك
          </h2>
          <p className="text-[11px] text-gray-400">
            متابعة القيمة الدفترية، مجمع الإهلاك التراكمي، والعمر الإنتاجي للأصول
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            className="bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-white/10 shadow-sm transition-all"
          >
            <FileDown className="w-4 h-4" />
            تصدير تقرير PDF
          </button>
          <button
            onClick={handleOpenAddModal}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            إضافة أصل جديد
          </button>
        </div>
      </div>

      {/* Financial Executive Summary Cards (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: Total Cost */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-amber-500/20 rounded-2xl p-3 space-y-1 shadow-md">
          <div className="flex items-center justify-between text-gray-400 text-[11px]">
            <span>إجمالي تكلفة الأصول</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base font-extrabold text-amber-300 font-mono">
            {mask(formatCurrency(summary.totalPurchaseCost, settings.currency, settings.language))}
          </div>
          <div className="text-[10px] text-gray-400 flex items-center justify-between pt-1 border-t border-white/5">
            <span>عدد الأصول النشطة:</span>
            <span className="font-bold text-white">{summary.totalAssetsCount} أصول</span>
          </div>
        </div>

        {/* Card 2: Accumulated Depreciation */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-rose-500/20 rounded-2xl p-3 space-y-1 shadow-md">
          <div className="flex items-center justify-between text-gray-400 text-[11px]">
            <span>مجمع الإهلاك التراكمي</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-base font-extrabold text-rose-400 font-mono">
            -{mask(formatCurrency(summary.totalAccumulatedDepreciation, settings.currency, settings.language))}
          </div>
          <div className="text-[10px] text-gray-400 flex items-center justify-between pt-1 border-t border-white/5">
            <span>نسبة الإهلاك المجمع:</span>
            <span className="font-bold text-rose-300 font-mono">{summary.overallDepreciationPercent.toFixed(1)}%</span>
          </div>
        </div>

        {/* Card 3: Net Book Value */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3 space-y-1 shadow-md">
          <div className="flex items-center justify-between text-gray-400 text-[11px]">
            <span>صافي القيمة الدفترية</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base font-extrabold text-emerald-400 font-mono">
            {mask(formatCurrency(summary.totalNetBookValue, settings.currency, settings.language))}
          </div>
          <div className="text-[10px] text-gray-400 flex items-center justify-between pt-1 border-t border-white/5">
            <span>القيمة المتبقية من التكلفة:</span>
            <span className="font-bold text-emerald-300 font-mono">
              {(100 - summary.overallDepreciationPercent).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 4: Annual & Monthly Expense */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-purple-500/20 rounded-2xl p-3 space-y-1 shadow-md">
          <div className="flex items-center justify-between text-gray-400 text-[11px]">
            <span>الإهلاك السنوي والشهري</span>
            <Calculator className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-base font-extrabold text-purple-300 font-mono">
            {mask(formatCurrency(summary.totalAnnualDepreciation, settings.currency, settings.language))}
          </div>
          <div className="text-[10px] text-gray-400 flex items-center justify-between pt-1 border-t border-white/5">
            <span>مصروف الإهلاك الشهري:</span>
            <span className="font-bold text-purple-200 font-mono">
              {mask(formatCurrency(summary.totalMonthlyDepreciation, settings.currency, settings.language))}
            </span>
          </div>
        </div>
      </div>

      <div id="fixed-assets-report-container" className="space-y-3.5">
        {/* Category Breakdown Progress Bar */}
        <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-3 space-y-2.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-sky-400" />
              توزيع صافي القيمة الدفترية للأصول حسب الفئة
            </span>
            <span className="text-[10px] text-gray-400">إجمالي {assets.length} أصل مسجل</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {summary.categoryTotals.map((cat) => {
              const info = cat.info;
              const percentOfTotal = summary.totalNetBookValue > 0 ? Math.round((cat.netBookValue / summary.totalNetBookValue) * 100) : 0;
              const isSelected = selectedCategory === cat.category;

              return (
                <button
                  key={cat.category}
                  onClick={() => setSelectedCategory(isSelected ? 'all' : cat.category)}
                  className={`p-2 rounded-xl text-right border transition-all text-xs space-y-1 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm'
                      : 'bg-slate-950/60 border-white/5 hover:border-white/20 text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold flex items-center gap-1">
                      {renderCategoryIcon(cat.category, 'w-3.5 h-3.5 text-amber-400')}
                      {info.labelAr.split(' ')[0]}
                    </span>
                    <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.2 rounded-full font-bold">
                      {cat.count}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono font-bold">
                    {mask(formatCurrency(cat.netBookValue, settings.currency, settings.language, true))}
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all"
                      style={{ width: `${percentOfTotal}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-slate-900/90 border border-white/10 p-2.5 rounded-2xl space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="ابحث باسم الأصل، الرمز AST-001، أو الموقع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 text-white pr-9 pl-3 py-1.5 rounded-xl text-xs border border-white/10 focus:outline-none focus:border-amber-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2 text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-gray-400'
                }`}
              >
                الأصول النشطة
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === 'all' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-gray-400'
                }`}
              >
                الكل ({assets.length})
              </button>
              <button
                onClick={() => setStatusFilter('sold')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === 'sold' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-gray-400'
                }`}
              >
                المبيعة
              </button>
              <button
                onClick={() => setStatusFilter('disposed')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === 'disposed' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-gray-400'
                }`}
              >
                المستبعدة
              </button>
            </div>
          </div>
        </div>

        {/* Asset Cards List */}
        {filteredAssets.length === 0 ? (
          <div className="bg-slate-900/60 border border-dashed border-white/10 rounded-2xl p-8 text-center space-y-3">
            <Building className="w-10 h-10 text-gray-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-white">لا توجد أصول ثابتة مطابقة</h3>
              <p className="text-xs text-gray-400">
                لم يتم العثور على أصول ثابتة مطابقة لمعايير البحث المسجلة.
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              إضافة أصل جديد الآن
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredAssets.map((asset) => {
              const metrics = calculateAssetMetrics(asset);
              const catInfo = ASSET_CATEGORY_INFO[asset.category] || ASSET_CATEGORY_INFO['other'];

              return (
                <div
                  key={asset.id}
                  className="bg-slate-900/90 border border-white/10 rounded-2xl p-3.5 space-y-3 shadow-md hover:border-amber-500/30 transition-all flex flex-col justify-between"
                >
                  {/* Card Header */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
                          {renderCategoryIcon(asset.category, 'w-5 h-5')}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-extrabold text-white leading-tight">
                              {asset.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 pt-0.5">
                            <span className="bg-slate-950 px-2 py-0.5 rounded-md font-mono border border-white/5 text-amber-300">
                              {asset.assetCode || 'AST----'}
                            </span>
                            <span>•</span>
                            <span>{catInfo.labelAr}</span>
                            {asset.location && (
                              <>
                                <span>•</span>
                                <span className="text-gray-300">{asset.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold shrink-0 border ${
                          asset.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : asset.status === 'sold'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {asset.status === 'active' ? 'نشط' : asset.status === 'sold' ? 'تم البيع' : 'مستبعد'}
                      </span>
                    </div>

                    {/* Financial Metrics Grid */}
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-950/70 p-2 rounded-xl border border-white/5 text-[10px]">
                      <div>
                        <span className="text-gray-400 block">تكلفة الشراء:</span>
                        <span className="font-mono font-bold text-white">
                          {mask(formatCurrency(asset.purchaseCost, settings.currency, settings.language, true))}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">مجمع الإهلاك:</span>
                        <span className="font-mono font-bold text-rose-400">
                          -{mask(formatCurrency(metrics.accumulatedDepreciation, settings.currency, settings.language, true))}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">صافي القيمة الدفترية:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {mask(formatCurrency(metrics.currentBookValue, settings.currency, settings.language, true))}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar for Depreciation */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                        <span>نسبة الإهلاك المجمع: {metrics.depreciationPercentage.toFixed(1)}%</span>
                        <span>
                          العمر المنقضي: {metrics.elapsedYears.toFixed(1)} من {asset.usefulLifeYears} سنوات
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            metrics.isFullyDepreciated
                              ? 'bg-rose-500'
                              : metrics.depreciationPercentage > 75
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(100, metrics.depreciationPercentage)}%` }}
                        />
                      </div>
                    </div>

                    {/* Depreciation Details line */}
                    <div className="flex items-center justify-between text-[10px] text-gray-400 bg-slate-950/40 px-2 py-1 rounded-lg border border-white/5">
                      <span>تاريخ الشراء: <strong className="text-gray-200 font-mono">{asset.purchaseDate}</strong></span>
                      <span>الإهلاك السنوي: <strong className="text-purple-300 font-mono">{mask(formatCurrency(metrics.annualDepreciation, settings.currency, settings.language, true))}</strong></span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 text-xs">
                    <button
                      onClick={() => setScheduleModalAsset(asset)}
                      className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold px-2.5 py-1 rounded-xl text-[11px] flex items-center gap-1 border border-amber-500/20 transition-all"
                    >
                      <Calculator className="w-3.5 h-3.5 text-amber-400" />
                      جدول الإهلاك
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(asset)}
                        className="bg-slate-800 hover:bg-slate-700 text-gray-200 px-2.5 py-1 rounded-xl text-[11px] flex items-center gap-1 border border-white/10"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        تعديل
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`هل أنت تأكد من حذف الأصل الثابت (${asset.name})؟`)) {
                            onDeleteAsset(asset.id);
                          }
                        }}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2 py-1 rounded-xl text-[11px] flex items-center gap-1 border border-rose-500/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto dir-rtl">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto text-white">
            {/* Modal Header */}
            <div className="bg-slate-950 p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-400" />
                {editingAsset ? 'تعديل بيانات الأصل الثابت' : 'تسجيل أصل ثابت جديد'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-4 space-y-3 max-h-[80vh] overflow-y-auto text-xs">
              {/* Asset Name */}
              <div className="space-y-1">
                <label className="text-gray-300 font-bold block">
                  اسم الأصل الثابت <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: سيارات شحن تويوتا كامري 2024، مبنى المقر الرئيسي..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-amber-400 text-xs"
                />
              </div>

              {/* Code & Category Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-gray-300 font-bold block">رمز/رقم الأصل</label>
                  <input
                    type="text"
                    placeholder="AST-001"
                    value={formData.assetCode}
                    onChange={(e) => setFormData({ ...formData, assetCode: e.target.value })}
                    className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-amber-400 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-bold block">فئة الأصل الثابت</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleCategoryChangeInForm(e.target.value as AssetCategory)}
                    className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-amber-400 text-xs"
                  >
                    <option value="vehicles">سيارات ووسائل نقل</option>
                    <option value="real_estate">عقارات ومباني</option>
                    <option value="equipment">معدات وآلات</option>
                    <option value="computers">أجهزة وأجهزة كمبيوتر</option>
                    <option value="furniture">أثاث وتجهيزات مكتبية</option>
                    <option value="other">أصول ثابتة أخرى</option>
                  </select>
                </div>
              </div>

              {/* Purchase Date & Purchase Cost */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-gray-300 font-bold block">تاريخ الشراء / الاستحواذ</label>
                  <input
                    type="date"
                    required
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-bold block">
                    تكلفة الشراء (سعر الأصل) ({settings.currencySymbol}) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="مثال: 95000"
                    value={formData.purchaseCost}
                    onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                    className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-amber-400 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Salvage Value & Useful Life */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-gray-300 font-bold block">
                    القيمة التخريدية (الخردة المتوقعة)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={formData.salvageValue}
                    onChange={(e) => setFormData({ ...formData, salvageValue: e.target.value })}
                    className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-amber-400 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-bold block">العمر الإنتاجي (بالسنوات)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={formData.usefulLifeYears}
                    onChange={(e) => setFormData({ ...formData, usefulLifeYears: e.target.value })}
                    className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-amber-400 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Depreciation Method & Status */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-gray-300 font-bold block">طريقة حساب الإهلاك</label>
                  <select
                    value={formData.depreciationMethod}
                    onChange={(e) => setFormData({ ...formData, depreciationMethod: e.target.value as DepreciationMethod })}
                    className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-amber-400 text-xs"
                  >
                    <option value="straight_line">طريقة القسط الثابت (الافتراضي المحاسبي)</option>
                    <option value="declining_balance">طريقة القسط المتناقص المضاعف</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-bold block">حالة الأصل</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-amber-400 text-xs"
                  >
                    <option value="active">نشط ومستعمل</option>
                    <option value="sold">تم بيعه</option>
                    <option value="disposed">مستبعد / مخرّد</option>
                  </select>
                </div>
              </div>

              {/* Location & Notes */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-gray-300 font-bold block">الفرع / الموقع</label>
                  <input
                    type="text"
                    placeholder="الفرع الرئيسي، الرياض..."
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-bold block">ملاحظات إضافية</label>
                  <input
                    type="text"
                    placeholder="رقم الفاتورة، الضمان، التفاصيل..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              {parseFloat(formData.purchaseCost) > 0 && (
                <div className="bg-gradient-to-br from-amber-950/30 to-slate-950 border border-amber-500/30 p-3 rounded-2xl space-y-2 text-[11px]">
                  <div className="flex items-center justify-between text-amber-300 font-extrabold border-b border-amber-500/20 pb-1">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      المعاينة الفورية لنتائج الحساب المحاسبي:
                    </span>
                    <span>القسط الثابت</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-slate-900/80 p-1.5 rounded-xl border border-white/5">
                      <span className="text-gray-400 block text-[10px]">الإهلاك السنوي:</span>
                      <strong className="text-purple-300 font-mono">
                        {formatCurrency(modalLiveMetrics.annualDepreciation, settings.currency, settings.language, true)}
                      </strong>
                    </div>
                    <div className="bg-slate-900/80 p-1.5 rounded-xl border border-white/5">
                      <span className="text-gray-400 block text-[10px]">الإهلاك الشهري:</span>
                      <strong className="text-purple-200 font-mono">
                        {formatCurrency(modalLiveMetrics.monthlyDepreciation, settings.currency, settings.language, true)}
                      </strong>
                    </div>
                    <div className="bg-slate-900/80 p-1.5 rounded-xl border border-white/5">
                      <span className="text-gray-400 block text-[10px]">مجمع الإهلاك الحالي:</span>
                      <strong className="text-rose-400 font-mono">
                        {formatCurrency(modalLiveMetrics.accumulatedDepreciation, settings.currency, settings.language, true)}
                      </strong>
                    </div>
                    <div className="bg-slate-900/80 p-1.5 rounded-xl border border-white/5">
                      <span className="text-gray-400 block text-[10px]">صافي القيمة الدفترية:</span>
                      <strong className="text-emerald-400 font-mono">
                        {formatCurrency(modalLiveMetrics.currentBookValue, settings.currency, settings.language, true)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-gray-300 font-bold px-4 py-2 rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-5 py-2 rounded-xl text-xs shadow-md"
                >
                  {editingAsset ? 'حفظ التعديلات' : 'إضافة الأصل الثابت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Depreciation Schedule Modal */}
      {scheduleModalAsset && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto dir-rtl">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto text-white space-y-3">
            {/* Modal Header */}
            <div className="bg-slate-950 p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  جدول الإهلاك السنوي والقيمة الدفترية للأصل
                </h3>
                <p className="text-[11px] text-gray-400">
                  {scheduleModalAsset.name} ({scheduleModalAsset.assetCode || 'AST----'})
                </p>
              </div>
              <button
                onClick={() => setScheduleModalAsset(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Schedule Table */}
            <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto text-xs">
              {(() => {
                const metrics = calculateAssetMetrics(scheduleModalAsset);
                return (
                  <div className="space-y-3">
                    {/* Summary Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 p-2.5 rounded-2xl border border-white/5 text-[11px]">
                      <div>
                        <span className="text-gray-400 block">التكلفة الأصلية:</span>
                        <strong className="text-white font-mono">
                          {formatCurrency(scheduleModalAsset.purchaseCost, settings.currency, settings.language)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">القيمة التخريدية:</span>
                        <strong className="text-amber-300 font-mono">
                          {formatCurrency(scheduleModalAsset.salvageValue, settings.currency, settings.language)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">العمر الإنتاجي:</span>
                        <strong className="text-sky-300 font-mono">{scheduleModalAsset.usefulLifeYears} سنوات</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">طريقة الإهلاك:</span>
                        <strong className="text-emerald-300">
                          {scheduleModalAsset.depreciationMethod === 'declining_balance' ? 'القسط المتناقص' : 'القسط الثابت'}
                        </strong>
                      </div>
                    </div>

                    {/* Breakdown Table */}
                    <div className="overflow-x-auto border border-white/10 rounded-2xl bg-slate-950/60">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-950 text-gray-300 text-[10px] font-extrabold border-b border-white/10">
                          <tr>
                            <th className="p-2.5">السنة</th>
                            <th className="p-2.5">القيمة بداية السنة</th>
                            <th className="p-2.5">مصروف الإهلاك</th>
                            <th className="p-2.5">مجمع الإهلاك</th>
                            <th className="p-2.5">القيمة نهاية السنة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[11px]">
                          {metrics.schedule.map((row) => (
                            <tr
                              key={row.yearNumber}
                              className={`hover:bg-white/5 transition-all ${
                                row.isCurrentYear ? 'bg-amber-500/10 font-bold border-r-4 border-r-amber-400' : ''
                              }`}
                            >
                              <td className="p-2.5 font-bold flex items-center gap-1.5">
                                {row.yearLabel}
                                {row.isCurrentYear && (
                                  <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full font-bold">
                                    السنة الحالية
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 font-mono text-gray-300">
                                {formatCurrency(row.startingBookValue, settings.currency, settings.language, true)}
                              </td>
                              <td className="p-2.5 font-mono text-purple-300 font-bold">
                                {formatCurrency(row.depreciationExpense, settings.currency, settings.language, true)}
                              </td>
                              <td className="p-2.5 font-mono text-rose-400 font-bold">
                                {formatCurrency(row.accumulatedDepreciation, settings.currency, settings.language, true)}
                              </td>
                              <td className="p-2.5 font-mono text-emerald-400 font-extrabold">
                                {formatCurrency(row.endingBookValue, settings.currency, settings.language, true)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-950 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setScheduleModalAsset(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-1.5 rounded-xl text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
