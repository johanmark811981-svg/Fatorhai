import React, { useState } from 'react';
import { Cloud } from 'lucide-react';

interface GoogleDriveSyncProps {
  onExport: () => Promise<void>;
}

export const GoogleDriveSync: React.FC<GoogleDriveSyncProps> = ({ onExport }) => {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const [errorMsg, setErrorMsg] = useState('');
  
  const handleSync = async () => {
    setStatus('uploading');
    setErrorMsg('');
    try {
      await onExport();
      setStatus('success');
    } catch (e: any) {
      console.error('Drive error:', e);
      setStatus('error');
      setErrorMsg(e.message || 'فشل الرفع');
    }
    setTimeout(() => {
      setStatus('idle');
      setErrorMsg('');
    }, 5000);
  };

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={status === 'uploading'}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-2xl text-xs flex items-center justify-center gap-1.5 border border-white/10"
      >
        <Cloud className="w-4 h-4" />
        {status === 'idle' && 'حفظ النسخة في جوجل درايف (Google Drive)'}
        {status === 'uploading' && 'جاري الرفع...'}
        {status === 'success' && 'تم الرفع بنجاح!'}
        {status === 'error' && 'فشل الرفع، حاول مرة أخرى'}
      </button>
      {errorMsg && (
        <p className="text-[9px] text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 text-center">
          {errorMsg}
        </p>
      )}
    </div>
  );
};
