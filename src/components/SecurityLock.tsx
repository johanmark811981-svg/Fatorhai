import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, Fingerprint, ShieldAlert, Delete, Check, ScanFace, Loader2 } from 'lucide-react';

interface SecurityLockProps {
  isEnabled: boolean;
  savedPin?: string;
  onUnlock: () => void;
  onSetPin: (pin: string) => void;
}

export const SecurityLock: React.FC<SecurityLockProps> = ({ isEnabled, savedPin, onUnlock, onSetPin }) => {
  const [pin, setPin] = useState('');
  const [isLocked, setIsLocked] = useState(isEnabled);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<'unlock' | 'setup'>(savedPin ? 'unlock' : 'setup');
  
  useEffect(() => {
    if (isEnabled) {
      setIsLocked(true);
      setMode(savedPin ? 'unlock' : 'setup');
      setPin('');
    } else {
      setIsLocked(false);
    }
  }, [isEnabled, savedPin]);
  
  // Biometric states
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const biometricTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (pin.length === 4) {
      if (mode === 'unlock') {
        if (pin === savedPin) {
          handleUnlockSuccess();
        } else {
          setError(true);
          setTimeout(() => {
            setError(false);
            setPin('');
          }, 600);
        }
      } else {
        // Setup mode
        onSetPin(pin);
        setMode('unlock');
        setPin('');
      }
    }
  }, [pin, mode, savedPin]);

  useEffect(() => {
    // Auto-start FaceID if in unlock mode
    if (isEnabled && mode === 'unlock' && isLocked && biometricStatus === 'idle') {
      startBiometricScan();
    }
  }, [isEnabled, mode, isLocked]);

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

  const startBiometricScan = async () => {
    if (biometricStatus === 'scanning' || biometricStatus === 'success') return;
    
    setBiometricStatus('scanning');
    
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 480 },
          height: { ideal: 480 }
        } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
    }
    
    // Simulate FaceID processing
    biometricTimeoutRef.current = setTimeout(() => {
      // 95% success rate for simulation
      const isSuccess = Math.random() > 0.05;
      
      stopCamera();

      if (isSuccess) {
        setBiometricStatus('success');
        setTimeout(() => {
          handleUnlockSuccess();
        }, 800);
      } else {
        setBiometricStatus('failed');
        setTimeout(() => {
          setBiometricStatus('idle');
        }, 2000);
      }
    }, 3500);
  };

  const handleUnlockSuccess = () => {
    setIsLocked(false);
    onUnlock();
  };

  if (!isEnabled && !isLocked) return null;
  if (!isLocked && mode === 'unlock') return null;

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
        <AnimatePresence mode="wait">
          {biometricStatus === 'scanning' || biometricStatus === 'success' ? (
            <motion.div
              key="biometric-visual"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center mb-8"
            >
              <div className="relative w-40 h-40 flex items-center justify-center">
                {/* iPhone-style Scanning Rings */}
                {biometricStatus === 'scanning' && (
                  <>
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ 
                          scale: [1, 1.8], 
                          opacity: [0.5, 0] 
                        }}
                        transition={{ 
                          duration: 2.5, 
                          repeat: Infinity, 
                          delay: i * 0.8,
                          ease: "easeOut"
                        }}
                        className="absolute inset-0 border border-emerald-500/40 rounded-full"
                      />
                    ))}
                    
                    {/* Rotating outer ring */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-t-2 border-r-2 border-emerald-500/20 rounded-full"
                    />

                    {/* Scanning Beam Effect */}
                    <motion.div
                      animate={{ 
                        top: ['10%', '90%', '10%'],
                        opacity: [0, 1, 0]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                      className="absolute left-1/2 -translate-x-1/2 w-24 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent blur-[1px] z-20"
                    />
                  </>
                )}
                
                <motion.div 
                  animate={
                    biometricStatus === 'scanning' ? { 
                      scale: [1, 1.05, 1],
                      boxShadow: [
                        "0 0 20px rgba(16,185,129,0.2)",
                        "0 0 40px rgba(16,185,129,0.4)",
                        "0 0 20px rgba(16,185,129,0.2)"
                      ]
                    } : biometricStatus === 'failed' ? {
                      x: [-5, 5, -5, 5, 0],
                      transition: { duration: 0.4 }
                    } : {}
                  }
                  transition={biometricStatus === 'scanning' ? { duration: 2, repeat: Infinity } : {}}
                  className={`w-32 h-32 rounded-full overflow-hidden flex items-center justify-center shadow-2xl transition-colors duration-500 relative z-10 ${
                    biometricStatus === 'success' ? 'bg-emerald-500 text-white' : 
                    biometricStatus === 'failed' ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50' :
                    'bg-black/40 backdrop-blur-md text-emerald-500 border border-white/20'
                  }`}
                >
                  {biometricStatus === 'scanning' && (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale scale-x-[-1]"
                    />
                  )}
                  
                  {biometricStatus === 'success' ? (
                    <Check className="w-16 h-16 relative z-10" />
                  ) : (
                    <ScanFace className={`w-16 h-16 relative z-10 ${biometricStatus === 'scanning' ? 'opacity-40' : 'opacity-100'}`} />
                  )}
                </motion.div>
              </div>
              <motion.p 
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-emerald-500 font-bold mt-4 text-lg"
              >
                {biometricStatus === 'success' ? 'تم التعرف بنجاح' : 'جاري التعرف على الوجه...'}
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="pin-visual"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center w-full"
            >
              <motion.div
                animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
                className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 shadow-2xl ${
                  error ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'
                }`}
              >
                {mode === 'setup' ? <ShieldAlert className="w-10 h-10" /> : <Lock className="w-10 h-10" />}
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-2 text-center">
                {mode === 'setup' ? 'إعداد رمز القفل' : 'تطبيق الحسابات مقفل'}
              </h2>
              <p className="text-gray-400 text-sm mb-10 text-center">
                {mode === 'setup' 
                  ? 'يرجى إدخال 4 أرقام ليكون رمز القفل الخاص بك' 
                  : 'أدخل رمز PIN للمتابعة أو استخدم ميزة التعرف على الوجه'}
              </p>

              {/* PIN Indicators */}
              <div className="flex gap-4 mb-12">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                      pin.length > i
                        ? 'bg-emerald-500 border-emerald-500 scale-110 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                        : 'border-white/20'
                    }`}
                  />
                ))}
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumberClick(num)}
                    className="w-full aspect-square rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-2xl font-medium text-white transition-all flex items-center justify-center border border-white/5"
                  >
                    {num}
                  </button>
                ))}
                <div className="flex items-center justify-center">
                  <button 
                    onClick={startBiometricScan}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                      biometricStatus === 'failed' ? 'text-rose-500 bg-rose-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'
                    }`}
                    title="FaceID / بصمة الإصبع"
                  >
                    <ScanFace className="w-8 h-8" />
                  </button>
                </div>
                <button
                  onClick={() => handleNumberClick('0')}
                  className="w-full aspect-square rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-2xl font-medium text-white transition-all flex items-center justify-center border border-white/5"
                >
                  0
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full aspect-square rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-white transition-all flex items-center justify-center border border-white/5"
                >
                  <Delete className="w-6 h-6" />
                </button>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-rose-500 text-sm font-bold mt-8"
                >
                  الرمز غير صحيح، حاول مرة أخرى
                </motion.p>
              )}

              {biometricStatus === 'failed' && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-amber-500 text-xs font-bold mt-4"
                >
                  فشل التعرف على الوجه، يرجى استخدام الرمز
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
