import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Barcode as BarcodeIcon, Tag, Package, Hash, Layers, AlertCircle } from 'lucide-react';
import Barcode from 'react-barcode';
import { Product } from '../types';
import { generateId } from '../utils/formatters';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  product?: Product | null;
  units?: string[];
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
  units = ['حبة', 'كرتون', 'كيلو', 'متر', 'طقم', 'درزن'],
}) => {
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState('حبة');
  const [price, setPrice] = useState<number>(0);
  const [isTaxInclusive, setIsTaxInclusive] = useState(true);
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState<number>(0);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setNameEn(product.nameEn || '');
      setBarcode(product.barcode);
      setUnit(product.unit);
      setPrice(product.price);
      setIsTaxInclusive(product.isTaxInclusive !== undefined ? product.isTaxInclusive : true);
      setCategory(product.category || '');
      setStock(product.stock || 0);
    } else {
      setName('');
      setNameEn('');
      setBarcode(Math.floor(Math.random() * 9000000000000 + 1000000000000).toString());
      setUnit(units[0] || 'حبة');
      setPrice(0);
      setIsTaxInclusive(true);
      setCategory('');
      setStock(0);
    }
  }, [product, isOpen, units]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !barcode || price < 0) return;

    onSave({
      id: product?.id || generateId('prod'),
      name,
      nameEn,
      barcode,
      unit,
      price,
      isTaxInclusive,
      category,
      stock,
      createdAt: product?.createdAt || new Date().toISOString(),
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm dir-rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-5 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black">{product ? 'تعديل صنف' : 'إضافة صنف جديد'}</h2>
                <p className="text-[10px] text-white/70">أدخل تفاصيل المنتج ونظام الباركود</p>
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
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-teal-400" />
                    اسم الصنف (AR)
                  </label>
                  <input
                    autoFocus
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: آيفون 15 برو ماكس"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all shadow-inner"
                  />
                </div>

                {/* Name EN */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-teal-400" />
                    Item Name (EN)
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Example: iPhone 15 Pro Max"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all shadow-inner text-left font-mono"
                    dir="ltr"
                  />
                </div>

                {/* Barcode */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <BarcodeIcon className="w-3.5 h-3.5 text-teal-400" />
                    الباركود (رقم متسلسل)
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 pl-10 text-xs text-white font-mono focus:outline-none focus:border-teal-500 transition-all shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setBarcode(Math.floor(Math.random() * 9000000000000 + 1000000000000).toString())}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500 hover:text-teal-400 p-1"
                      title="توليد باركود عشوائي"
                    >
                      <Hash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-teal-400" />
                    السعر الأساسي
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={price || ''}
                    onChange={(e) => setPrice(parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-sm text-white font-mono focus:outline-none focus:border-teal-500 transition-all shadow-inner text-left"
                  />
                </div>

                {/* Tax Toggle */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-teal-400" />
                    نوع السعر (الضريبة)
                  </label>
                  <div className="flex bg-slate-950 border border-white/10 rounded-2xl p-1">
                    <button
                      type="button"
                      onClick={() => setIsTaxInclusive(true)}
                      className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all ${
                        isTaxInclusive ? 'bg-teal-500 text-white shadow-lg' : 'text-gray-500'
                      }`}
                    >
                      شامل
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsTaxInclusive(false)}
                      className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all ${
                        !isTaxInclusive ? 'bg-teal-500 text-white shadow-lg' : 'text-gray-500'
                      }`}
                    >
                      غير شامل
                    </button>
                  </div>
                </div>

                {/* Unit */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-teal-400" />
                    نوع الوحدة
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all shadow-inner"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                {/* Stock */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-teal-400" />
                    كمية المخزون
                  </label>
                  <input
                    required
                    type="number"
                    value={stock || ''}
                    onChange={(e) => setStock(parseInt(e.target.value))}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-sm text-white font-mono focus:outline-none focus:border-teal-500 transition-all shadow-inner text-left"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-teal-400" />
                    التصنيف (اختياري)
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="مثال: إلكترونيات"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Barcode Preview */}
              <div className="mt-2 p-4 bg-white rounded-2xl flex flex-col items-center justify-center border-4 border-slate-950/50 shrink-0">
                <span className="text-[10px] text-gray-400 font-bold mb-2 uppercase tracking-widest">Barcode Preview</span>
                {barcode && (
                  <Barcode 
                    value={barcode} 
                    width={1.2} 
                    height={40} 
                    fontSize={10}
                    background="transparent"
                  />
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 bg-slate-950/50 border-t border-white/5 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-slate-800 text-gray-300 py-3.5 rounded-2xl text-sm font-bold hover:bg-slate-700 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-[2] bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/20"
              >
                <Save className="w-4 h-4" />
                {product ? 'حفظ التعديلات' : 'إضافة الصنف'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
