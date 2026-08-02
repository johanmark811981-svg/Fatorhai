import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingView: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[11000] bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
      <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
      <p className="text-gray-400 text-sm animate-pulse">جاري تحميل البيانات...</p>
    </div>
  );
};
