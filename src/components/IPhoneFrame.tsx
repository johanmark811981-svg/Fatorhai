import React, { useState, useEffect } from 'react';
import { AppTheme, DeviceFrameMode } from '../types';
import { Wifi, Signal, Battery, Smartphone, Monitor, Edit3, Sparkles } from 'lucide-react';

interface IPhoneFrameProps {
  children: React.ReactNode;
  enabled: boolean;
  theme: AppTheme;
  deviceFrameMode?: DeviceFrameMode;
  onChangeDeviceMode?: (mode: DeviceFrameMode) => void;
  onToggleFrame: () => void;
  actionButtonToast?: (msg: string) => void;
}

export const IPhoneFrame: React.FC<IPhoneFrameProps> = ({
  children,
  enabled,
  theme,
  deviceFrameMode = 's24_ultra',
  onChangeDeviceMode,
  onToggleFrame,
  actionButtonToast,
}) => {
  const [currentTime, setCurrentTime] = useState('09:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Finish styling based on theme
  const getThemeFinish = () => {
    switch (theme) {
      case 'dynamic_smart':
        return {
          bgClass: 'from-slate-950 via-emerald-950/40 to-cyan-950/60',
          borderClass: 'border-emerald-400/90 shadow-emerald-500/30 shadow-2xl ring-2 ring-emerald-400/40',
          accent: '#10b981',
          nameAr: 'ثيم Qualitylinks الديناميكي الذكي (Dynamic Smart Glass ⚡)',
        };
      case 's24_titanium':
        return {
          bgClass: 'from-stone-800 via-zinc-900 to-slate-900',
          borderClass: 'border-stone-400 shadow-stone-800/40',
          accent: '#a8a29e',
          nameAr: 'سامسونج S24 ألترا - تيتانيوم رمادي (Titanium Gray)',
        };
      case 's24_black':
        return {
          bgClass: 'from-zinc-900 via-black to-slate-950',
          borderClass: 'border-zinc-600 shadow-black/80',
          accent: '#52525b',
          nameAr: 'سامسونج S24 ألترا - تيتانيوم أسود (Titanium Black)',
        };
      case 's24_violet':
        return {
          bgClass: 'from-indigo-950 via-purple-950 to-slate-900',
          borderClass: 'border-indigo-500/80 shadow-indigo-950/60',
          accent: '#818cf8',
          nameAr: 'سامسونج S24 ألترا - تيتانيوم بنفسجي (Titanium Violet)',
        };
      case 's24_yellow':
        return {
          bgClass: 'from-amber-950/80 via-slate-900 to-stone-900',
          borderClass: 'border-amber-500/80 shadow-amber-950/50',
          accent: '#f59e0b',
          nameAr: 'سامسونج S24 ألترا - تيتانيوم أصفر (Titanium Yellow)',
        };
      case 'desert':
        return {
          bgClass: 'from-amber-900/20 via-orange-950/10 to-amber-950/30',
          borderClass: 'border-[#c8b093] shadow-[#c8b093]/20',
          accent: '#c8b093',
          nameAr: 'تيتانيوم صحراوي (Desert Titanium)',
        };
      case 'dark':
        return {
          bgClass: 'from-zinc-900/30 via-black to-zinc-950/40',
          borderClass: 'border-zinc-700 shadow-zinc-900/50',
          accent: '#3f3f46',
          nameAr: 'تيتانيوم أسود فاخر (Space Black)',
        };
      case 'silver':
        return {
          bgClass: 'from-slate-200/20 via-slate-100/10 to-slate-300/20',
          borderClass: 'border-slate-300 shadow-slate-400/20',
          accent: '#cbd5e1',
          nameAr: 'تيتانيوم فضي (Natural Silver)',
        };
      case 'titanium':
      default:
        return {
          bgClass: 'from-stone-800/20 via-stone-900/20 to-stone-950/30',
          borderClass: 'border-stone-500 shadow-stone-700/30',
          accent: '#78716c',
          nameAr: 'تيتانيوم طبيعي (Natural Titanium)',
        };
    }
  };

  const currentFinish = getThemeFinish();

  if (!enabled || deviceFrameMode === 'fullscreen') {
    return (
      <div className="w-full min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased">
        {/* Floating view mode toggle */}
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
          <button
            onClick={() => {
              if (!enabled) onToggleFrame();
              if (onChangeDeviceMode) onChangeDeviceMode('s24_ultra');
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl px-3.5 py-2 rounded-full font-bold text-xs flex items-center gap-2 border border-emerald-400/30 transition-transform active:scale-95"
            title="عرض محاكي سامسونج جالكسي S24 ألترا"
          >
            <Smartphone className="w-4 h-4 text-amber-300" />
            <span>محاكي Samsung Galaxy S24 Ultra 🤖</span>
          </button>
        </div>
        {children}
      </div>
    );
  }

  // Render Samsung Galaxy S24 Ultra Frame
  if (deviceFrameMode === 's24_ultra') {
    return (
      <div className="min-h-screen bg-slate-950 py-4 px-2 flex flex-col items-center justify-center font-sans antialiased selection:bg-emerald-500 selection:text-white dir-rtl">
        {/* Top Floating Control Bar outside device */}
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-800 text-xs text-slate-300 shadow-lg">
          <span className="flex items-center gap-1.5 font-extrabold text-amber-400">
            <Smartphone className="w-4 h-4" />
            <span>معاينة Samsung Galaxy S24 Ultra 📱</span>
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          
          {/* Mode switchers */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-full border border-slate-800 text-[11px]">
            <button
              onClick={() => onChangeDeviceMode?.('desktop')}
              className="px-2.5 py-1 rounded-full text-slate-400 hover:text-white font-bold flex items-center gap-1 transition-all"
            >
              <span>Desktop 💻</span>
            </button>
            <button
              onClick={() => onChangeDeviceMode?.('s24_ultra')}
              className="px-2.5 py-1 rounded-full text-slate-400 hover:text-white font-bold flex items-center gap-1 transition-all"
            >
              <span>S24 Ultra 🤖</span>
            </button>
            <button
              onClick={() => onChangeDeviceMode?.('iphone')}
              className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-black shadow-sm flex items-center gap-1"
            >
              <span>iPhone 17 Pro 🍎</span>
            </button>
            <button
              onClick={onToggleFrame}
              className="px-2.5 py-1 rounded-full text-slate-400 hover:text-white font-bold flex items-center gap-1 transition-all"
            >
              <Monitor className="w-3 h-3 text-sky-400" />
              <span>شاشة كاملة</span>
            </button>
          </div>
        </div>

        {/* Samsung S24 Ultra Chassis Container with Sharp Signature Corners */}
        <div className="relative mx-auto my-auto transition-all duration-300">
          {/* Outer Titanium Metallic Edge Frame */}
          <div
            className={`relative w-[385px] sm:w-[420px] h-[820px] sm:h-[860px] rounded-[24px] p-[8px] bg-gradient-to-b ${currentFinish.bgClass} border-[6px] ${currentFinish.borderClass} shadow-2xl transition-all duration-300 ring-1 ring-white/10`}
          >
            {/* Volume Up / Down (Left side on Samsung) */}
            <div className="absolute -left-[10px] top-[140px] w-[5px] h-[50px] bg-slate-700 rounded-l-sm shadow-md" />
            <div className="absolute -left-[10px] top-[200px] w-[5px] h-[50px] bg-slate-700 rounded-l-sm shadow-md" />

            {/* Power Button (Right side) */}
            <div className="absolute -right-[10px] top-[160px] w-[5px] h-[65px] bg-slate-700 rounded-r-sm shadow-md" />

            {/* Floating S-Pen Shortcut Badge */}
            <button
              onClick={() => actionButtonToast?.('قلم S-Pen S24 Ultra: تم تفعيل كتابة ملاحظة وفاتورة سريعة بالقلم!')}
              className="absolute -right-3 bottom-20 z-50 bg-gradient-to-tr from-amber-500 to-emerald-500 text-slate-950 p-2 rounded-full shadow-2xl border border-amber-300 hover:scale-110 active:scale-95 transition-all"
              title="قلم S-Pen الإفتراضي S24 Ultra"
            >
              <Edit3 className="w-4 h-4 font-black" />
            </button>

            {/* Inner Display Glass Frame with Narrow Bezel */}
            <div className="relative w-full h-full bg-slate-950 rounded-[18px] overflow-hidden flex flex-col border border-black shadow-inner">
              {/* Samsung S24 Ultra Infinity-O Centered Punch Hole Camera */}
              <div className="w-3.5 h-3.5 bg-black rounded-full border border-zinc-800 shadow-inner z-50 absolute top-1.5 left-1/2 -translate-x-1/2 pointer-events-none" />

              {/* One UI Status Bar */}
              <div className="w-full h-8 px-5 pt-1.5 flex items-center justify-between text-white text-[11px] font-semibold z-40 select-none pointer-events-none">
                {/* Clock */}
                <span className="font-sans font-bold tracking-tight text-slate-200">{currentTime}</span>

                {/* One UI Status Icons */}
                <div className="flex items-center gap-1.5 text-slate-200">
                  <span className="text-[9px] font-extrabold bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/30">
                    S-Pen
                  </span>
                  <Signal className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-extrabold text-slate-100">5G+</span>
                  <Wifi className="w-3.5 h-3.5 text-sky-400" />
                  <div className="flex items-center gap-1 bg-slate-900/80 px-1.5 py-0.5 rounded-md border border-slate-700">
                    <span className="text-[9px] font-extrabold text-white">100%</span>
                    <Battery className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Inner App Content View */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col scrollbar-thin scrollbar-thumb-slate-700">
                {children}
              </div>

              {/* One UI Gesture Bar */}
              <div className="w-full h-4 bg-slate-950 flex items-center justify-center shrink-0 z-40">
                <div className="w-28 h-1 bg-white/30 rounded-full hover:bg-white/60 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render iPhone 17 Pro Max Frame
  return (
    <div className="min-h-screen bg-slate-950 py-4 px-2 flex flex-col items-center justify-center font-sans antialiased selection:bg-emerald-500 selection:text-white dir-rtl">
      {/* Top Floating Control Bar outside device */}
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-800 text-xs text-slate-300 shadow-lg">
        <span className="flex items-center gap-1.5 font-bold text-emerald-400">
          <Smartphone className="w-4 h-4" />
          <span>معاينة iPhone 17 Pro Max 🍎</span>
        </span>
        <span className="text-slate-600 hidden sm:inline">•</span>

        {/* Mode switchers */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-full border border-slate-800 text-[11px]">
          <button
            onClick={() => onChangeDeviceMode?.('desktop')}
            className="px-2.5 py-1 rounded-full text-slate-400 hover:text-white font-bold flex items-center gap-1 transition-all"
          >
            <span>Desktop 💻</span>
          </button>
          <button
            onClick={() => onChangeDeviceMode?.('s24_ultra')}
            className="px-2.5 py-1 rounded-full text-slate-400 hover:text-white font-bold flex items-center gap-1 transition-all"
          >
            <span>S24 Ultra 🤖</span>
          </button>
          <button
            onClick={() => onChangeDeviceMode?.('iphone')}
            className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-black shadow-sm flex items-center gap-1"
          >
            <span>iPhone 17 Pro 🍎</span>
          </button>
          <button
            onClick={onToggleFrame}
            className="px-2.5 py-1 rounded-full text-slate-400 hover:text-white font-bold flex items-center gap-1 transition-all"
          >
            <Monitor className="w-3 h-3 text-sky-400" />
            <span>شاشة كاملة</span>
          </button>
        </div>
      </div>

      {/* iPhone 17 Pro Max Chassis Container */}
      <div className="relative mx-auto my-auto transition-all duration-300">
        {/* Outer Titanium Metallic Edge Frame */}
        <div
          className={`relative w-[380px] sm:w-[410px] h-[815px] sm:h-[850px] rounded-[52px] p-[10px] bg-gradient-to-b ${currentFinish.bgClass} border-[8px] ${currentFinish.borderClass} shadow-2xl transition-all duration-300 ring-1 ring-white/10`}
        >
          {/* Action Button */}
          <button
            onClick={() => actionButtonToast?.('زر الأكشن (Action Button): تم تشغيل تسجيل قيد سريع!')}
            className="absolute -left-[12px] top-[105px] w-[5px] h-[32px] bg-gradient-to-r from-amber-600 to-amber-800 rounded-l-sm hover:brightness-125 transition-all shadow-md active:translate-x-0.5"
            title="Action Button - زر الإجراء السريع"
          />

          <div className="absolute -left-[12px] top-[155px] w-[5px] h-[52px] bg-slate-700 rounded-l-sm shadow-md" />
          <div className="absolute -left-[12px] top-[215px] w-[5px] h-[52px] bg-slate-700 rounded-l-sm shadow-md" />
          <div className="absolute -right-[12px] top-[170px] w-[5px] h-[72px] bg-slate-700 rounded-r-sm shadow-md" />

          {/* Inner Display Glass Frame */}
          <div className="relative w-full h-full bg-slate-950 rounded-[44px] overflow-hidden flex flex-col border border-black shadow-inner">
            {/* iOS Status Bar */}
            <div className="w-full h-8 px-6 pt-1 flex items-center justify-between text-white text-[11px] font-semibold z-40 select-none pointer-events-none">
              <span className="font-mono tracking-tight">{currentTime}</span>

              <div className="flex items-center gap-1.5 text-gray-200">
                <Signal className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold">5G</span>
                <Wifi className="w-3.5 h-3.5" />
                <div className="flex items-center gap-0.5 border border-white/40 rounded-[3px] px-1 py-0.2">
                  <span className="text-[9px] font-bold">98%</span>
                  <Battery className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                </div>
              </div>
            </div>

            {/* Inner App Content View */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col scrollbar-thin scrollbar-thumb-slate-700">
              {children}
            </div>

            {/* iOS Home Indicator Bar */}
            <div className="w-full h-5 bg-slate-950 flex items-center justify-center shrink-0 z-40">
              <div className="w-32 h-1 bg-white/40 rounded-full hover:bg-white/70 transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

