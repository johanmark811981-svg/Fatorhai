import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Share, PlusSquare, Smartphone, Wifi, WifiOff, CheckCircle2, ShieldCheck, Download, FileCode2, ExternalLink, Copy, Check, Globe, Link2, Sparkles } from 'lucide-react';

interface IosInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'external' | 'apk' | 'pwa' | 'ipa';
}

export const IosInstallModal: React.FC<IosInstallModalProps> = ({ isOpen, onClose, initialTab = 'apk' }) => {
  const [activeTab, setActiveTab] = useState<'external' | 'apk' | 'pwa' | 'ipa'>(initialTab);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Dynamic current window origin URL as primary external link fallback
  const liveAppUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  // Custom external URL saved in localStorage if user defines one (e.g. Diawi link or custom domain)
  const [customExternalUrl, setCustomExternalUrl] = useState(() => {
    return localStorage.getItem('custom_external_install_url') || '';
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        onClose();
      }
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(label);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleSaveCustomUrl = (url: string) => {
    setCustomExternalUrl(url);
    localStorage.setItem('custom_external_install_url', url);
  };

  const openInExternalBrowser = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  const currentDisplayUrl = customExternalUrl.trim() || liveAppUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in dir-rtl">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 p-0.5 shadow-md shadow-emerald-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">تثبيت وتكتيب التطبيق برابط خارجي</h3>
              <p className="text-xs text-emerald-400 font-medium">رابط مباشر للآيفون، الأندرويد، وتثبيت الأوفلاين</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="p-2 bg-slate-950/60 border-b border-slate-800 flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('external')}
            className={`flex-1 py-2 px-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
              activeTab === 'external'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>رابط خارجي</span>
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2 px-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
              activeTab === 'apk'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>تثبيت أندرويد APK 🤖</span>
          </button>
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-2 px-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
              activeTab === 'pwa'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>آيفون (iOS PWA)</span>
          </button>
          <button
            onClick={() => setActiveTab('ipa')}
            className={`flex-1 py-2 px-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
              activeTab === 'ipa'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>ملف IPA</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {activeTab === 'external' && (
            <div className="space-y-4">
              {/* External Open Hero Button */}
              <div className="p-4 bg-gradient-to-br from-teal-950/60 via-slate-900 to-slate-950 rounded-2xl border border-teal-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-extrabold text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>الرابط الخارجي المباشر للتطبيق</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    جاهز للتثبيت 🟢
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  لأن التثبيت يعمل بشكل صحيح على الآيفون خارج الإطار (iframe)، استخدم الزر التالي لفتح التطبيق برابطه المباشر في متصفح <strong className="text-white">Safari</strong> أو <strong className="text-white">Chrome</strong>:
                </p>

                {/* Primary Launch Action as direct HTML <a> tag to bypass iframe popup blocking */}
                <a
                  href={currentDisplayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black rounded-2xl shadow-xl shadow-teal-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs sm:text-sm text-center"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span>فتح التطبيق في نافذة/متصفح خارجي جديد الآن ↗️</span>
                </a>

                {/* Direct Source ZIP Download Button */}
                <a
                  href="/api/download-source-zip"
                  download="fawateery-app-source.zip"
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <Download className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>تحميل كود المشروع كاملاً (ملف مضغوط ZIP) 📦</span>
                </a>

                {/* Direct Link Input Box & Copy */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-slate-400">
                    رابط المشاركة المباشر (انسخه وأرسله لجوالك أو للعملاء):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={currentDisplayUrl}
                      className="w-full bg-slate-950 text-emerald-400 text-xs px-3 py-2 rounded-xl border border-slate-700 dir-ltr font-mono truncate"
                    />
                    <button
                      onClick={() => copyToClipboard(currentDisplayUrl, 'external_link')}
                      className="shrink-0 bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
                    >
                      {copiedCmd === 'external_link' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedCmd === 'external_link' ? 'تم النسخ' : 'نسخ الرابط'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* QR Code Card */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center gap-4">
                <div className="bg-white p-2.5 rounded-xl shrink-0 shadow-lg border border-slate-200 flex items-center justify-center">
                  <QRCodeSVG
                    value={currentDisplayUrl || 'https://fawateery.app'}
                    size={96}
                    bgColor="#ffffff"
                    fgColor="#020617"
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="space-y-2 text-xs">
                  <h4 className="font-extrabold text-white flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    <span>مسح الكود بكاميرا الآيفون / الأندرويد</span>
                  </h4>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    افتح كاميرا جوالك ووجّهها نحو مربع QR هذا. سيظهر لك رابط خارجي مباشر يفتح تطبيق <strong className="text-white">فواتيري</strong> مباشرة في Safari للبدء بالتثبيت.
                  </p>
                </div>
              </div>

              {/* Custom External Domain Input (For Custom Deployments) */}
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-teal-400" />
                    <span>تخصيص رابط خارجي آخر (اختياري)</span>
                  </span>
                  <span className="text-[10px] text-gray-400">مثال: Diawi / D domain</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  إذا قمت برفع ملف IPA أو APK على رابط خاص بك (مثل Diawi أو موقعك الخاص)، يمكنك كتابته هنا لتحديث زر الفتح ورمز الـ QR:
                </p>
                <input
                  type="url"
                  placeholder="https://diawi.com/... أو https://my-custom-app.com"
                  value={customExternalUrl}
                  onChange={(e) => handleSaveCustomUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl dir-ltr placeholder:text-gray-600 focus:border-teal-500 focus:outline-none"
                />
                {customExternalUrl !== liveAppUrl && (
                  <button
                    onClick={() => handleSaveCustomUrl(liveAppUrl)}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    إعادة ضبط للرابط الافتراضي الرئيسي
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'apk' && (
            <div className="space-y-4">
              {/* Android APK Hero Banner */}
              <div className="p-4 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-teal-950/70 rounded-2xl border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-extrabold text-xs">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>تطبيق أندرويد (APK) يعمل بدون إنترنت + مزامنة سحابية</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    أوفلاين 100% ⚡
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  تطبيق <strong className="text-white">Qualitylinks (كواليتي لينكس) للأندرويد</strong> مصمم ليعمل <strong className="text-emerald-300">أوفلاين بالكامل دون الحاجة لاتصال بالإنترنت</strong> لإنشاء الفواتير وطباعتها، وعند توفر الشبكة يقوم بالتزامن التلقائي مع السيرفر الرئيسي!
                </p>

                {/* Instant PWA Install Button if on Android Chrome */}
                {deferredPrompt ? (
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs sm:text-sm"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>تثبيت التطبيق فوراً على أندرويد بنقرة واحدة (PWA App)</span>
                  </button>
                ) : (
                  <a
                    href={currentDisplayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs sm:text-sm text-center"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0" />
                    <span>فتح التطبيق المباشر في متصفح الجوال للتثبيت ↗️</span>
                  </a>
                )}

                {/* Download Source Code with pre-built Android Project */}
                <a
                  href="/api/download-source-zip"
                  download="qualitylinks-app-source.zip"
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-md"
                >
                  <Download className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>تحميل مشروع الأندرويد الكامل المدمج (ZIP يحتوي على مجلد android جاهز) 📦</span>
                </a>
              </div>

              {/* Online Direct APK Generator Option (PWABuilder) */}
              <div className="p-4 bg-slate-950/90 rounded-2xl border border-teal-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span>الخيار 1: تحويل الرابط لملف APK جاهز فوراً أونلاين (بدون برامج):</span>
                  </h4>
                  <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-bold">بلمسة واحدة ⚡</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  يمكنك استخدام أداة <strong className="text-white">PWABuilder (المعتمدة من Microsoft & Google)</strong> لتحويل رابط التطبيق لملف APK أندرويد جاهز للتحميل والتثبيت خلال 30 ثانية:
                </p>
                <a
                  href={`https://www.pwabuilder.com/build?url=${encodeURIComponent(currentDisplayUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/50 font-black rounded-xl transition-all flex items-center justify-center gap-2 text-xs text-center"
                >
                  <ExternalLink className="w-4 h-4 text-teal-400" />
                  <span>إنشاء وتحميل ملف APK أونلاين عبر PWABuilder ↗️</span>
                </a>
              </div>

              {/* Steps for Android APK Build via Pre-packaged Capacitor Android Project */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-emerald-400" />
                  <span>الخيار 2: استخراج APK من مشروع الأندرويد المدمج (Android Studio):</span>
                </h4>

                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <p className="font-bold text-slate-200">1️⃣ تنزيل ملف ZIP المشروع المدمج:</p>
                    <p className="text-slate-400">حمل ملف الـ ZIP بالزر أعلاه وقم بفك الضغط، ستجد مجلد <strong className="text-emerald-300 font-mono">android/</strong> جاهزاً تماماً ومدمجاً بكافة ملفات الأوفلاين والكود.</p>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <p className="font-bold text-slate-200">2️⃣ فتح مجلد android مباشرة في Android Studio:</p>
                    <p className="text-slate-400">افتح برنامج Android Studio ثم اختر <strong className="text-white">Open</strong> وحدد مجلد <strong className="text-emerald-300 font-mono">android</strong> داخل المشروع.</p>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <p className="font-bold text-slate-200">3️⃣ استخراج ملف الـ APK جاهزاً:</p>
                    <p className="text-slate-400 leading-relaxed">
                      من القائمة العليا اختر: <br/>
                      <strong className="text-white">Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong><br/>
                      سيظهر لك ملف <strong className="text-emerald-300 font-mono">app-debug.apk</strong> جاهز للتثبيت المباشر على جميع أجهزة الأندرويد!
                    </p>
                  </div>
                </div>
              </div>

              {/* Offline & Sync Features Card */}
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-extrabold text-emerald-400">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>مميزات الأوفلاين والتزامن في تطبيق الأندرويد:</span>
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside leading-relaxed">
                  <li>عمل كامل 100% بدون نت (إصدار الفواتير، الطباعة الحرارية، وإدارة العملاء).</li>
                  <li>حفظ تلقائي لكافة البيانات محلياً في ذاكرة الجهاز.</li>
                  <li>مزامنة فورية وتلقائية مع السيرفر الرئيسي والتسجيل السحابي بمجرد عودة الاتصال.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'pwa' && (
            <>
              {/* Network Connection Status Card */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                isOnline 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' 
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
              }`}>
                <div className="flex items-center gap-3">
                  {isOnline ? (
                    <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                      <Wifi className="w-5 h-5 animate-pulse" />
                    </div>
                  ) : (
                    <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
                      <WifiOff className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-extrabold">
                      {isOnline ? 'حالة الاتصال: متصل بالأونلاين 🟢' : 'حالة الاتصال: تعمل في وضع الأوفلاين 🟠'}
                    </p>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {isOnline ? 'يتم حفظ البيانات تلقائياً وتحديث الصفحة' : 'تستطيع إضافة الفواتير والحسابات بدون إنترنت وتُحفظ محلياً'}
                    </p>
                  </div>
                </div>
              </div>

              {/* iOS Specific Notice Card */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1.5 text-xs text-amber-200">
                <div className="flex items-center gap-2 font-extrabold text-amber-400">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>لماذا يقتضي التثبيت فتح الرابط الخارجي في Safari؟</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  نظام شركة <strong className="text-white">Apple iOS</strong> يتطلب فتح أي موقع في متصفح <strong className="text-amber-300">Safari الأصلي برابط خارجي</strong> لتفعيل خيار "الإضافة إلى الشاشة الرئيسية" وحفظ ملفات الأوفلاين.
                </p>
              </div>

              {/* iOS Safari Installation Steps */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>خطوات التثبيت السريعة على الآيفون (خلال 5 ثوانٍ):</span>
                </h4>

                <div className="space-y-2.5">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 shadow-sm">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 font-extrabold text-sm flex items-center justify-center shrink-0 mt-0.5 border border-teal-500/30">
                      1
                    </div>
                    <div className="text-xs leading-relaxed text-slate-200 space-y-1">
                      <div>
                        افتح الرابط المباشر في متصفح <strong className="text-white bg-slate-700 px-1.5 py-0.5 rounded">Safari (سفاري)</strong> ثم اضغط على زر <strong className="text-teal-300 inline-flex items-center gap-1 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-500/30">المشاركة (Share) <Share className="w-3.5 h-3.5 text-teal-400 inline" /></strong> أسفل شاشة الآيفون.
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 shadow-sm">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 font-extrabold text-sm flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
                      2
                    </div>
                    <div className="text-xs leading-relaxed text-slate-200">
                      اسحب القائمة لأسفل ثم اضغط على <strong className="text-amber-300 inline-flex items-center gap-1 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">"إضافة إلى الشاشة الرئيسية" <PlusSquare className="w-3.5 h-3.5 text-amber-400 inline" /></strong> (Add to Home Screen).
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 shadow-sm">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 font-extrabold text-sm flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                      3
                    </div>
                    <div className="text-xs leading-relaxed text-slate-200">
                      اضغط على <strong className="text-emerald-300 font-bold">"إضافة" (Add)</strong> بالأعلى. ستظهر أيقونة تطبيق <strong className="text-white font-bold">"فواتيري"</strong> على شاشة آيفونك فوراً، وسيعمل معك بشاشة كاملة <strong className="text-emerald-300">وبدون إنترنت (أوفلاين)</strong>!
                    </div>
                  </div>
                </div>
              </div>

              {/* Automatic Prompt button if Chrome / Android */}
              {deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>تثبيت بنقرة واحدة الآن</span>
                </button>
              )}
            </>
          )}

          {activeTab === 'ipa' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-xs text-amber-200 leading-relaxed">
                💡 <strong className="text-amber-300">طريقة استخراج ملف IPA لأجهزة الآيفون والرفع على رابط خارجي:</strong>
                <p className="mt-1">
                  تم تضمين إعدادات <strong>Capacitor iOS</strong> بالكامل داخل كود البرنامج. لبناء ملف <strong>.ipa</strong> ورفعه على رابط خارجي مباشر (مثل Diawi أو InstallOnAir):
                </p>
              </div>

              {/* Step A: Download Source Code */}
              <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>1️⃣ تنزيل كود المشروع الكامل (ZIP):</span>
                  <a
                    href="/api/download-source-zip"
                    download="fawateery-app-source.zip"
                    className="text-[10px] text-emerald-300 font-extrabold bg-emerald-950/80 hover:bg-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-500/40 transition-all flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>تحميل ZIP المباشر</span>
                  </a>
                </div>
                <p className="text-[11px] text-slate-300">
                  اضغط على زر <strong className="text-emerald-400">تحميل ZIP المباشر</strong> أعلاه للحصول على ملف مضغوط يحتوي على كافة ملفات الكود وإعدادات Capacitor.
                </p>
              </div>

              {/* Step B: Commands to add Capacitor iOS */}
              <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>2️⃣ أوامر بناء مشروع iOS (في Terminal):</span>
                  <button
                    onClick={() => copyToClipboard('npm install @capacitor/core @capacitor/cli @capacitor/ios\nnpx cap add ios\nnpx cap copy ios\nnpx cap open ios', 'cmds')}
                    className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-950/60 px-2 py-1 rounded-md border border-amber-500/30 transition-all"
                  >
                    {copiedCmd === 'cmds' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCmd === 'cmds' ? 'تم النسخ' : 'نسخ الأوامر'}</span>
                  </button>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl font-mono text-[10px] text-emerald-400 dir-ltr overflow-x-auto">
                  npm install @capacitor/core @capacitor/cli @capacitor/ios<br/>
                  npx cap add ios<br/>
                  npx cap copy ios<br/>
                  npx cap open ios
                </div>
              </div>

              {/* Step C: Export IPA & Upload to External Link */}
              <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>3️⃣ التصدير لـ IPA والرفع على رابط خارجي:</span>
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>في برنامج <strong>Xcode</strong> على أجهزة Mac: اختر <strong className="text-white">Product &gt; Archive</strong>.</li>
                  <li>اضغط على <strong className="text-white">Distribute App &gt; Ad-Hoc / Development</strong> واستخرج ملف <strong>.ipa</strong>.</li>
                  <li>ارفع ملف الـ IPA على موقع <strong className="text-teal-300">Diawi.com</strong> أو <strong className="text-teal-300">InstallOnAir.com</strong> للحصول على رابط تثبيت مباشر وشفرة QR!</li>
                </ul>
              </div>
            </div>
          )}

          {/* Features highlight */}
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-[11px] text-gray-400 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>متوافق مع كافة أنظمة وتحديثات iOS و Android الحديثة</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>تخزين أوفلاين مع خدمة التزامن السحابي التلقائي</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
          <a
            href={currentDisplayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/20 text-center"
          >
            <ExternalLink className="w-4 h-4" />
            <span>فتح الرابط الخارجي ↗️</span>
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-all text-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};


