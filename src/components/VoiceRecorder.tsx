import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, Sparkles, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceRecorderProps {
  onDataParsed: (type: 'expense' | 'debt' | 'invoice', data: any) => void;
  className?: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onDataParsed, className }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'success' | 'error'>('idle');

  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const transcriptRef = useRef('');

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'ar-SA';

      rec.onresult = (event: any) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const text = result[0].transcript;
        setTranscript(text);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          setError('تم رفض الوصول للميكروفون. يرجى تفعيله في المتصفح.');
        } else {
          setError('حدث خطأ في التعرف على الصوت. يرجى المحاولة مرة أخرى.');
        }
        setStatus('error');
        setIsRecording(false);
      };

      rec.onend = () => {
        if (isRecordingRef.current) {
          setIsRecording(false);
          const finalVal = transcriptRef.current;
          if (finalVal.trim()) {
            processTranscript(finalVal);
          } else {
            setStatus('idle');
          }
        }
      };

      recognitionRef.current = rec;
    } else {
      setError('متصفحك لا يدعم خاصية التعرف على الصوت مباشرة.');
      setStatus('error');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const startRecording = () => {
    setError(null);
    setTranscript('');
    
    if (!recognitionRef.current) {
      setError('التعرف على الصوت غير مدعوم في هذا المتصفح.');
      setStatus('error');
      return;
    }

    setStatus('recording');
    setIsRecording(true);
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error(err);
      setError('تعذر بدء التسجيل الصوتي.');
      setStatus('error');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error(err);
      }
    }
    
    const finalVal = transcriptRef.current || transcript;
    if (finalVal.trim()) {
      processTranscript(finalVal);
    } else {
      setStatus('idle');
    }
  };

  const processTranscript = async (text: string) => {
    setIsProcessing(true);
    setStatus('processing');
    
    try {
      const response = await fetch('/api/parse-voice-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const result = await response.json();

      if (result.success) {
        onDataParsed(result.result.entryType, result.result.data);
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setError(result.error || 'تعذر فهم البيانات المالية.');
        setStatus('error');
      }
    } catch (err) {
      console.error('Error processing transcript:', err);
      setError('حدث خطأ أثناء معالجة البيانات.');
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="relative">
        <AnimatePresence mode="wait">
          {status === 'recording' && (
            <motion.div
              key="recording-pulse"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.2, 1], opacity: 0.3 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 bg-rose-500 rounded-full blur-xl"
            />
          )}
        </AnimatePresence>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg ${
            isRecording 
              ? 'bg-rose-500 text-white animate-pulse' 
              : isProcessing
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white hover:from-emerald-500 hover:to-teal-400'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isRecording ? (
            <Square className="w-6 h-6 fill-current" />
          ) : status === 'success' ? (
            <Check className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>
      </div>

      <div className="text-center px-4">
        {status === 'idle' && (
          <p className="text-xs text-gray-400">اضغط للتسجيل (مثال: "صرفت 50 ريال على الغداء")</p>
        )}
        {status === 'recording' && (
          <div className="space-y-1">
            <p className="text-xs font-bold text-rose-400 animate-pulse">جاري الاستماع...</p>
            <p className="text-[10px] text-gray-300 italic truncate max-w-[200px]">
              {transcript || 'تحدث الآن...'}
            </p>
          </div>
        )}
        {status === 'processing' && (
          <p className="text-xs text-emerald-400 flex items-center gap-1.5 justify-center">
            <Sparkles className="w-3.5 h-3.5 animate-bounce" />
            جاري التحليل بالذكاء الاصطناعي...
          </p>
        )}
        {status === 'success' && (
          <p className="text-xs text-emerald-400 font-bold">تم إدخال البيانات بنجاح!</p>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-1.5 text-rose-400 justify-center">
            <AlertCircle className="w-3.5 h-3.5" />
            <p className="text-[10px] font-bold">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
