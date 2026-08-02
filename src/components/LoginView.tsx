import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, ShieldCheck, Users, Lock, UserCog, ArrowRight, Check, ScanFace, Fingerprint, Loader2, ExternalLink } from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';

export const LoginView: React.FC = () => {
  const { login, loginAsGuest, loginWithPin, loginWithBiometrics, setAdminPin, data } = useFirebase();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSettingPin, setIsSettingPin] = useState(!data.settings.adminPin);
  
  // Biometric states for login screen
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const biometricTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsSettingPin(!data.settings.adminPin);
  }, [data.settings.adminPin]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (biometricTimeoutRef.current) clearTimeout(biometricTimeoutRef.current);
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startBiometricLogin = async () => {
    if (biometricStatus === 'scanning' || biometricStatus === 'success') return;
    
    setBiometricStatus('scanning');
    setError('');
    
    try {
      // Request camera access for realism
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      }).catch(() => null);
      
      if (stream) {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch (err) {
      console.warn('Camera access denied for biometric login, using simulation only');
    }
    
    // Simulate FaceID processing
    biometricTimeoutRef.current = setTimeout(async () => {
      stopCamera();
      
      try {
        const success = await loginWithBiometrics();
        if (success) {
          setBiometricStatus('success');
        } else {
          setBiometricStatus('failed');
          setError('فشل التعرف على البصمة/الوجه. يرجى المحاولة مرة أخرى أو استخدام الرمز.');
          setTimeout(() => setBiometricStatus('idle'), 2000);
        }
      } catch (e) {
        console.error('Biometric login error:', e);
        setBiometricStatus('failed');
        setError('فشل الدخول التلقائي. يرجى استخدام طريقة أخرى.');
        setTimeout(() => setBiometricStatus('idle'), 2000);
      }
    }, 3000);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setError('');
    setLoading(true);

    try {
      if (isSettingPin) {
        if (pin.length < 4) {
          setError('يجب أن يكون الرمز 4 أرقام على الأقل');
          setLoading(false);
          return;
        }
        await setAdminPin(pin);
      } else {
        const success = await loginWithPin(pin);
        if (!success) {
          setError('الرمز السري غير صحيح');
          setPin('');
        }
      }
    } catch (err: any) {
      console.error('Admin submit error:', err);
      setError('حدث خطأ أثناء محاولة الدخول. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login();
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول عبر Google');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginAsGuest();
    } catch (err: any) {
      setError(err.message || 'فشل الدخول بالحساب المشترك');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950 flex flex-col items-center justify-center p-6 text-white dir-rtl overflow-y-auto">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full -ml-64 -mb-64" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-sm w-full bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[45px] shadow-2xl text-center"
      >
        <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/10 border border-emerald-500/20">
          <ShieldCheck className="w-10 h-10 text-emerald-400" />
        </div>

        <h1 className="text-2xl font-black mb-2 tracking-tight text-white">نظام الإدارة المالية</h1>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed px-4">
          نظام ايفون 17 برو ماكس لإدارة الحسابات والتقارير المالية بدقة وأمان.
        </p>

        <div className="space-y-3 mb-8">
          <button
            onClick={handleGoogleLogin}
            disabled={loading || biometricStatus === 'scanning'}
            className="w-full bg-white text-slate-950 font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-white/5 disabled:opacity-50 hover:bg-slate-100"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <span>جاري الاتصال بـ Google...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 text-blue-600" />
                <span>تسجيل الدخول عبر Google</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              setShowAdminLogin(true);
              setIsSettingPin(false);
              setPin('');
              setError('');
            }}
            disabled={loading || biometricStatus === 'scanning'}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all border border-white/5 disabled:opacity-50"
          >
            <UserCog className="w-4 h-4 text-emerald-400" />
            دخول المدير (رمز PIN)
          </button>

          {/* Quick Demo Button */}
          <button
            type="button"
            onClick={() => {
              setShowAdminLogin(true);
              setIsSettingPin(false);
              setPin('');
              setError('');
            }}
            disabled={loading || biometricStatus === 'scanning'}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all border border-emerald-500/20 shadow-lg"
          >
            <ShieldCheck className="w-5 h-5 text-amber-300" />
            الدخول التجريبي الفوري (مدير عام)
          </button>
        </div>

        {/* Informational tip for preview iframes */}
        <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/10 text-right space-y-2 text-gray-300 text-[10px] leading-relaxed mb-6">
          <div className="flex items-center justify-between">
            <span className="text-amber-400 font-black flex items-center gap-1">
              💡 تنبيه تسجيل الدخول عبر Google:
            </span>
            <a 
              href={window.location.href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 font-extrabold flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20"
            >
              <ExternalLink className="w-3 h-3" />
              فتح في تبويب مستقل
            </a>
          </div>
          <p>
            تمنع قيود الأمان في بعض المتصفحات فتح نافذة Google داخل إطار المعاينة الجانبي.
          </p>
          <p className="text-gray-300">
            إذا لم تفُتح نافذة Google، انقر على <strong className="text-white">"فتح في تبويب مستقل"</strong> أعلاه، أو استخدم <strong className="text-white">"الدخول التجريبي الفوري"</strong> للدخول المباشر.
          </p>
        </div>

        {error && (
          <motion.p 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 text-rose-500 text-xs font-bold bg-rose-500/10 py-2.5 rounded-xl border border-rose-500/20"
          >
            {error}
          </motion.p>
        )}

        <div className="flex items-center justify-center gap-4 text-gray-500">
          <button
            onClick={handleGuestLogin}
            disabled={loading}
            className="flex flex-col items-center gap-1 hover:text-white transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold">حساب مشترك</span>
          </button>
          <div className="w-px h-6 bg-white/5" />
          <button
            onClick={startBiometricLogin}
            className="flex flex-col items-center gap-1 hover:text-emerald-400 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/10 transition-all">
              <Fingerprint className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold">حماية بيومترية</span>
          </button>
          <div className="w-px h-6 bg-white/5" />
          <button
            onClick={() => setShowAdminLogin(true)}
            className="flex flex-col items-center gap-1 hover:text-amber-400 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-amber-500/10 transition-all">
              <Lock className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold">تشفير كامل</span>
          </button>
        </div>

        <p className="mt-8 text-[10px] text-gray-500">
          بالدخول إلى النظام، أنت توافق على شروط الاستخدام.
        </p>
      </motion.div>

      {/* Admin PIN Overlay */}
      <AnimatePresence>
        {showAdminLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="max-w-sm w-full bg-slate-900 border border-white/10 p-8 rounded-[40px] shadow-2xl relative"
            >
              <button
                onClick={() => setShowAdminLogin(false)}
                className="absolute top-6 left-6 p-2 bg-slate-800 rounded-full text-gray-400 hover:text-white"
              >
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-emerald-400" />
              </div>

              <h2 className="text-xl font-black mb-2 text-center">
                {isSettingPin ? 'إعداد رمز دخول المدير' : 'دخول المدير'}
              </h2>
              <p className="text-gray-400 text-xs mb-6 text-center leading-relaxed">
                {isSettingPin 
                  ? 'هذه أول مرة يتم فيها الدخول كمدير، يرجى تعيين رمز سري خاص بك.' 
                  : 'يرجى إدخال الرمز السري للمدير للمتابعة.'}
              </p>

              <form onSubmit={handleAdminSubmit} className="space-y-6">
                <div>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 text-center text-xl font-black tracking-[0.3em] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                    autoFocus
                  />
                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-rose-500 text-[10px] font-bold mt-2 text-center"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/20 active:scale-95 transition-all ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {isSettingPin ? <Check className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                      {isSettingPin ? 'تعيين وحفظ الرمز' : 'دخول'}
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
