import React from 'react';
import { Eye, EyeOff, Sparkles, Building2, SlidersHorizontal, Mic, Smartphone, ExternalLink, Download, Monitor } from 'lucide-react';
import { AppSettings, DeviceFrameMode } from '../types';

interface HeaderBarProps {
  settings: AppSettings;
  hideValues: boolean;
  onToggleHideValues: () => void;
  onOpenAiAdvisor: () => void;
  onOpenSettings: () => void;
  onOpenVoiceAssistant: () => void;
  onOpenIosInstall?: (initialTab?: 'apk' | 'external' | 'pwa' | 'ipa') => void;
  deviceFrameMode: DeviceFrameMode;
  onSetDeviceFrameMode: (mode: DeviceFrameMode) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  settings,
  hideValues,
  onToggleHideValues,
  onOpenAiAdvisor,
  onOpenSettings,
  onOpenVoiceAssistant,
  onOpenIosInstall,
  deviceFrameMode,
  onSetDeviceFrameMode,
}) => {
  const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="w-full px-4 pt-1 pb-3 flex items-center justify-between text-white dir-rtl border-b border-white/5 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
      {/* Title & Company Name */}
      <div className="flex items-center gap-2.5">
        <div>
          <h1 className="text-sm font-black tracking-tight flex items-center gap-1.5 text-white">
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
              {settings.customAppName || 'Qualitylinks'}
            </span>
            {!isOnline && (
              <span className="text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded-full animate-pulse">
                أوفلاين 🟠
              </span>
            )}
          </h1>
          <p className="text-[10px] text-emerald-400/90 font-extrabold truncate max-w-[130px] sm:max-w-[180px]">
            {settings.companyName || 'كواليتي لينكس (Qualitylinks)'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5">
        {/* Direct ZIP Download Button */}
        <a
          href="/api/download-source-zip"
          download={`${(settings.customAppName || 'qualitylinks').toLowerCase()}-source.zip`}
          className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 p-2 rounded-xl border border-emerald-500/40 transition-all active:scale-95 flex items-center gap-1"
          title="تحميل كود المشروع الكامل ZIP"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-bold hidden lg:inline">تنزيل المشروع ZIP</span>
        </a>

        {/* Device Frame Toggles */}
        <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shadow-inner">
          <button
            onClick={() => onSetDeviceFrameMode('iphone')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-[10px] font-black ${
              deviceFrameMode === 'iphone' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg border border-blue-400/30' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="وضع عرض iPhone"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iPhone</span>
          </button>
          <button
            onClick={() => onSetDeviceFrameMode('s24_ultra')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-[10px] font-black ${
              deviceFrameMode === 's24_ultra' 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg border border-emerald-400/30' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="وضع عرض S24 Ultra"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>S24 Ultra</span>
          </button>
          <button
            onClick={() => onSetDeviceFrameMode('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-[10px] font-black ${
              deviceFrameMode === 'desktop' 
                ? 'bg-gradient-to-r from-slate-600 to-slate-800 text-white shadow-lg border border-slate-400/30' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="وضع عرض الكمبيوتر"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
        </div>

        {/* Unified Application Installation & Deployment Button */}
        {onOpenIosInstall && (
          <button
            onClick={() => onOpenIosInstall('external')}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 p-2 rounded-xl border border-emerald-500/40 transition-all active:scale-95 flex items-center gap-1 shadow-md shadow-emerald-500/10"
            title="تثبيت التطبيق وفتحه برابط خارجي أو تنزيل APK"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black hidden sm:inline">تثبيت 📲</span>
          </button>
        )}

        {/* Voice Assistant Trigger */}
        <button
          onClick={onOpenVoiceAssistant}
          className="relative bg-gradient-to-r from-teal-600/20 to-emerald-500/20 border border-teal-500/40 hover:border-teal-400 text-teal-300 p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center"
          title="المساعد الصوتي المحاسبي"
        >
          <Mic className="w-4 h-4 text-teal-400 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-teal-400 animate-ping" />
        </button>

        {/* AI Advisor Trigger */}
        <button
          onClick={onOpenAiAdvisor}
          className="relative bg-gradient-to-r from-emerald-600/30 to-amber-500/30 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center"
          title="المستشار المالي بالذكاء الاصطناعي"
        >
          <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
        </button>

        {/* Privacy Toggle (Hide Amounts) */}
        <button
          onClick={onToggleHideValues}
          className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 p-2 rounded-xl border border-white/10 transition-all active:scale-95"
          title={hideValues ? 'إظهار المبالغ والتقارير' : 'إخفاء المبالغ والتقارير للحماية'}
        >
          {hideValues ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-slate-300" />}
        </button>

        {/* Settings Launcher */}
        <button
          onClick={onOpenSettings}
          className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 p-2 rounded-xl border border-white/10 transition-all active:scale-95"
          title="الإعدادات والتخصيص"
        >
          <SlidersHorizontal className="w-4 h-4 text-slate-300" />
        </button>
      </div>
    </header>
  );
};
