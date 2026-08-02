import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Barcode as BarcodeIcon, 
  Layers, 
  Tag,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Product, AppSettings } from '../types';
import { formatCurrency } from '../utils/formatters';
import Barcode from 'react-barcode';

interface ProductsViewProps {
  settings: AppSettings;
  products: Product[];
  onOpenCreateProductModal: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  settings,
  products,
  onOpenCreateProductModal,
  onEditProduct,
  onDeleteProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 p-3 space-y-4 pb-20 dir-rtl text-white">
      {/* Header & Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/20">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black">إدارة الأصناف</h1>
              <p className="text-xs text-gray-400">إدارة المخزون والباركود والأسعار</p>
            </div>
          </div>
          <button
            onClick={onOpenCreateProductModal}
            className="bg-teal-500 hover:bg-teal-400 text-white p-3 rounded-2xl transition-all shadow-lg shadow-teal-500/20 active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="بحث عن صنف أو باركود..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 pr-12 text-sm text-white focus:outline-none focus:border-teal-500 transition-all shadow-inner"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900/80 border border-white/10 rounded-2xl px-4 text-xs text-teal-400 font-bold focus:outline-none"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'جميع الفئات' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid/List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900/80 border border-white/10 rounded-3xl p-4 flex flex-col gap-4 relative overflow-hidden group hover:border-teal-500/30 transition-all shadow-md"
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 flex flex-col items-center justify-center border border-white/5">
                    <span className="text-[10px] text-gray-500 font-bold leading-none">{p.unit}</span>
                    <Package className="w-4 h-4 text-teal-400 mt-1" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">{p.name}</h3>
                    <div className="flex flex-col gap-1 mt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-950 text-gray-400 px-2 py-0.5 rounded-full border border-white/5">
                          {p.category || 'عام'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          p.isTaxInclusive 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {p.isTaxInclusive ? 'شامل الضريبة' : 'غير شامل'}
                        </span>
                      </div>
                      <span className="text-[10px] text-teal-400 font-mono font-bold">
                        {formatCurrency(p.price, settings.currency, settings.language)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => onEditProduct(p)}
                    className="p-2 text-gray-400 hover:text-teal-400 hover:bg-teal-500/10 rounded-xl transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDeleteProduct(p.id)}
                    className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Barcode Section */}
              <div className="bg-white rounded-2xl p-2 flex flex-col items-center justify-center h-20 border border-slate-950/20 shadow-inner group-hover:scale-[1.02] transition-transform">
                <Barcode 
                  value={p.barcode} 
                  width={1.2} 
                  height={30} 
                  fontSize={10}
                  background="transparent"
                />
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <BarcodeIcon className="w-3 h-3" />
                  <span className="font-mono">{p.barcode}</span>
                </div>
                {p.stock !== undefined && (
                  <div className={`flex items-center gap-3 font-bold ${p.stock < 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    <div className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      <span>المخزون: {p.stock}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-white/5">
                      <button 
                        onClick={() => onEditProduct({ ...p, stock: Math.max(0, (p.stock || 0) - 1) })}
                        className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded"
                      >
                        -
                      </button>
                      <button 
                        onClick={() => onEditProduct({ ...p, stock: (p.stock || 0) + 1 })}
                        className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Background Glow */}
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-teal-500/5 blur-3xl rounded-full pointer-events-none group-hover:bg-teal-500/10 transition-all"></div>
            </div>
          ))
        ) : (
          <div className="md:col-span-2 py-12 flex flex-col items-center justify-center text-gray-500 space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-white/5">
              <Package className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-sm">لا يوجد أصناف مطابقة للبحث</p>
            <button
              onClick={onOpenCreateProductModal}
              className="text-xs text-teal-400 font-bold hover:underline"
            >
              إضافة صنف جديد الآن
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
