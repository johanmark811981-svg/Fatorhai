import express from 'express';
import path from 'path';
import fs from 'fs';
import * as archiver from 'archiver';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and URL-encoded parsers with increased size limit for file uploads (PDF / Image base64)
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API endpoint: Download full source code as ZIP file
  app.get('/api/download-source-zip', (req, res) => {
    try {
      res.attachment('qualitylinks-app-source.zip');
      const createArchive = (archiver as any).default || archiver;
      const archive = createArchive('zip', {
        zlib: { level: 9 }
      });

      archive.on('error', (err) => {
        console.error('Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: err.message });
        }
      });

      archive.pipe(res);

      const rootDir = process.cwd();
      const filesToInclude = [
        'android',
        'dist',
        'src',
        'public',
        'index.html',
        'package.json',
        'server.ts',
        'vite.config.ts',
        'tsconfig.json',
        'tsconfig.node.json',
        'capacitor.config.json',
        'metadata.json'
      ];

      filesToInclude.forEach((item) => {
        const fullPath = path.join(rootDir, item);
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          if (stats.isDirectory()) {
            archive.directory(fullPath, item);
          } else if (stats.isFile()) {
            archive.file(fullPath, { name: item });
          }
        }
      });

      archive.finalize();
    } catch (err: any) {
      console.error('Error creating source ZIP:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'فشل إنشاء ملف الـ ZIP للمشروع' });
      }
    }
  });

  // API endpoint: Upload backup to Google Drive
  app.post('/api/backup/upload-to-drive', async (req, res) => {
    try {
      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ error: 'لم يتم تزويد بيانات النسخة الاحتياطية' });
      }

      // Using platform managed OAuth credentials
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });
      
      const client = await auth.getClient();
      const drive = google.drive({ version: 'v3', auth: client as any });

      const fileMetadata = {
        name: `financial-backup-${new Date().toISOString().slice(0, 10)}.json`,
        mimeType: 'application/json',
      };
      
      const media = {
        mimeType: 'application/json',
        body: JSON.stringify(data, null, 2),
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      } as any);

      return res.json({ success: true, fileId: response.data.id });
    } catch (err: any) {
      console.error('Error uploading to Google Drive:', err);
      
      let errorMessage = err.message || 'خطأ غير معروف';
      let isApiDisabled = false;
      
      // Handle the "API not enabled" case specifically
      if (errorMessage.includes('Google Drive API has not been used in project') || errorMessage.includes('disabled')) {
        isApiDisabled = true;
        errorMessage = 'يجب تفعيل Google Drive API لمشروعك. يرجى زيارة الرابط التالي لتفعيله: https://console.developers.google.com/apis/api/drive.googleapis.com/overview';
      }

      const statusCode = err.status || err.code || (err.response && err.response.status) || 500;
      const finalStatus = typeof statusCode === 'number' ? statusCode : 500;

      return res.status(finalStatus).json({ 
        error: isApiDisabled ? 'API_DISABLED' : 'DRIVE_ERROR',
        message: isApiDisabled ? 'يجب تفعيل Google Drive API للمشروع.' : 'فشل الوصول إلى Google Drive. يرجى التأكد من تفعيل الـ API ومنح الصلاحيات.',
        details: errorMessage,
        link: 'https://console.developers.google.com/apis/api/drive.googleapis.com/overview'
      });
    }
  });

  // API endpoint: Analyze debt document (PDF/Image) using Gemini AI
  app.post('/api/analyze-debt-document', async (req, res) => {
    try {
      const { fileBase64, mimeType } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ error: 'لم يتم تزويد الملف للتحليل' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'مفتاح GEMINI_API_KEY غير مهيأ في النظام. يرجى التأكد من إضافة المفتاح في الإعدادات.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const promptText = `أنت خبير محترف في تحليل المستندات المالية، العقود، كشوفات الديون، والسلف.
قمت برفع مستند (صورة أو ملف PDF) يحتوي على قوائم أو سلف أو ديون شخصية/تجارية.
المطلوب استخراج كافة أسطر وبنود الديون والسلف بدقة فائقة.

لكل دين/سلفة استخرج البيانات التالية باللغة العربية بتنسيق مصفوفة JSON فقط:
- personName: اسم الشخص أو الجهة الدائنة/المدينة (String)
- amount: المبلغ الإجمالي بالأرقام فقط بدون رمز عملة (Number)
- currency: نوع العملة المذكورة في المستند أو الملاحظات. ابحث بذكاء عن كلمات مثل ("دولار", "$", "USD") واجعل قيمتها "$"، أو ("ريال", "ر.س", "SAR") واجعل قيمتها "ر.س"، وإن كانت عملة أخرى كتم "AED", "EGP", "KWD" اكتب رمزها، وإن لم تُحدد اعتبرها "ر.س" (String)
- type: اختر بدقة إما "owed_to_me" (إذا كان المبلغ مستحق لي/سلفة أعطيتها لأحد) أو "i_owe" (إذا كان دين علي/التزام واجب علي سداده)
- phone: رقم الهاتف إذا كان موجوداً، أو null
- dueDate: تاريخ الاستحقاق بتنسيق YYYY-MM-DD إذا كان موجوداً، أو null
- notes: تفاصيل أو سبب الدين، أو null

المخرجات يجب أن تكون مصفوفة JSON فقط بالشكل التالي دون أي نصوص إضافية:
[
  {
    "personName": "محمد علي",
    "amount": 1500,
    "currency": "ر.س",
    "type": "owed_to_me",
    "phone": "0501234567",
    "dueDate": "2026-09-01",
    "notes": "سلفة شراء بضاعة"
  },
  {
    "personName": "جون سميث",
    "amount": 250,
    "currency": "$",
    "type": "i_owe",
    "phone": null,
    "dueDate": null,
    "notes": "دين بالدولار"
  }
]`;

      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: cleanBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
      });

      const responseText = response.text || '';
      // Parse JSON from output
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedDebts = JSON.parse(jsonMatch[0]);
        return res.json({ success: true, debts: parsedDebts });
      } else {
        return res.status(422).json({
          error: 'لم يتسنّ قراءة قائمة الديون بشكل مهيكل من هذا الملف.',
          raw: responseText,
        });
      }
    } catch (err: any) {
      console.error('Error analyzing debt document:', err);
      return res.status(500).json({
        error: err?.message || 'حدث خطأ أثناء معالجة وتحليل الملف بوساطة الذكاء الاصطناعي.',
      });
    }
  });

  // API endpoint: Parse voice transcribed text using Gemini AI
  app.post('/api/parse-voice-input', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'لم يتم تزويد النص للتحليل' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'مفتاح GEMINI_API_KEY غير مهيأ في النظام.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const promptText = `أنت مساعد مالي ومحاسبي ذكي جداً. مهمتك هي تحليل وفهم نصوص مسجلة صوتياً باللغة العربية بلهجات مختلفة تصف حركات مالية وتحويلها إلى بيانات هيكلية بتنسيق JSON.
العمليات المدعومة ثلاثة أنواع رئيسية:
1. "expense" (مصروف شخصي أو تجاري عادي)
2. "debt" (دين أو سلفة شخصية، سواء كان مبلغا مستحقا لي "owed_to_me" أو مبلغا مستحقا علي "i_owe")
3. "invoice" (فاتورة ضريبية لعميل، تشتمل على بنود سلع/خدمات مبيعة مع كمياتها وأسعارها والضريبة)

صنف النص المدخل بذكاء دقيق جداً:
- إذا ذكر المستخدم كلمة مثل "فاتورة لـ" أو "فاتورة بيع لـ" أو "عملت فاتورة" أو ذكر بيع منتجات لعميل محدد (مثل "فاتورة لشركة الأمل بيع حبتين شاحن آيفون بـ 50 ريال")، صنفها كـ "invoice".
- إذا ذكر المستخدم ديناً أو سلفة (مثل "أنا متسلف من محمد 100 ريال" أو "سلفة لأحمد 200 ريال")، صنفها كـ "debt".
- إذا كان مجرد دفع مبلغ أو مصروف عادي (مثل "صرفت 50 ريال للغداء" أو "دفعت 150 ريال للكهرباء")، صنفها كـ "expense".

صيغة كائن الـ JSON المتوقعة للمخرجات هي:
{
  "entryType": "expense" | "debt" | "invoice",
  "data": {
    // في حال كان "expense":
    "title": "عنوان ووصف المصروف باللغة العربية",
    "amount": 120.0,
    "categoryId": "حاول تخمين أحد التصنيفات مثل 'cat_hospitality' (مطاعم وضيافة)، 'cat_transport' (مواصلات)، 'cat_bills' (فواتير)، 'cat_personal_other' (أخرى)",
    "date": "YYYY-MM-DD",
    "notes": "أي ملاحظات إضافية"

    // في حال كان "debt":
    "personName": "اسم الشخص المدين أو الدائن بالكامل",
    "amount": 500.0,
    "currency": "ر.س" أو "$"، الافتراضي "ر.س"
    "type": "owed_to_me" أو "i_owe"
    "notes": "تفاصيل إضافية أو سبب الدين"

    // في حال كان "invoice":
    "customerName": "اسم العميل أو اسم شركته",
    "customerPhone": "رقم هاتف العميل إن وجد أو null",
    "customerAddress": "العنوان الوطني للعميل إن ذكر أو null",
    "customerEmail": "البريد الإلكتروني للعميل إن ذكر أو null",
    "items": [
      {
        "description": "اسم المنتج أو الخدمة المبيعة بالكامل",
        "quantity": 2,
        "unitPrice": 50.0,
        "taxRate": 15
      }
    ],
    "notes": "أي تفاصيل أو ملاحظات إضافية"
  }
}

ملاحظات هامة جداً:
- قم باحتساب المبالغ والأعداد والأسماء بدقة متناهية من كلام المستخدم.
- إذا لم يذكر المستخدم أسعاراً محددة للمنتجات ولكنه ذكر مبلغا إجماليا للفاتورة، فقم بإنشاء بند واحد في الفاتورة يمثل الخدمة أو السلعة بقيمتها الإجمالية.
- أرجع فقط وبشكل صارم الكائن بصيغة JSON بدون أي كلام إضافي أو علامات markdown (لا تضع \`\`\`json ولا تضع أي شروحات).

النص المدخل هو: "${text}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: promptText }],
          },
        ],
      });

      const responseText = response.text || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.json({ success: true, result: parsed });
      } else {
        return res.status(422).json({ error: 'تعذر فهم البيانات المالية من النص.' });
      }
    } catch (err: any) {
      console.error('Error parsing voice input:', err);
      return res.status(500).json({ error: 'حدث خطأ أثناء معالجة النص بالذكاء الاصطناعي.' });
    }
  });

  // Global WhatsApp Webhook storage for logs (capped at 100 entries)
  let whatsappLogs: any[] = [];

  // Helper to process WhatsApp messages (text or voice) with Gemini 3.6-flash
  async function processWhatsAppMessage({ text, audioBase64, mimeType, senderName, senderPhone }: {
    text: string;
    audioBase64?: string;
    mimeType?: string;
    senderName: string;
    senderPhone: string;
  }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        reply: '⚠️ عذراً، لم يتم تهيئة مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) في النظام حتى الآن. الرجاء إضافة المفتاح في الإعدادات لتفعيل معالجة رسائل الواتساب.',
        parsed: null
      };
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const promptText = `أنت المساعد المالي والمحاسبي الذكي عبر الواتساب لمنصة "النواة للتقنية والمحاسبة الضريبية".
مهمتك هي قراءة الرسالة النصية أو الاستماع للرسالة الصوتية المرفقة وتحديد نوع الحركة المالية المطلوبة بدقة وتنسيقها في كائن JSON، وصياغة رد مالي ومحاسبي ودود ومنظم جداً باللغة العربية مع إيموجي لطيفة يوضح للمستخدم نجاح المعالجة.

الحركات المدعومة:
1. "expense" (مصروف): عند وصف شراء أو صرف أو دفع مبالغ (مثل: دفعت 45 ريال بنزين، سجل مصروف كهرباء 200 ريال).
2. "debt" (دين أو سلفة): عند وصف دين مستحق لك أو عليك (مثل: تسلفت من أبو محمد 1500 ريال، أعطيت أحمد سلفة 300 ريال).
3. "invoice" (فاتورة بيع): عند وصف بيع سلع أو خدمات لعميل، تشتمل على اسم العميل، والمنتج، الكمية، والسعر، وضريبة القيمة المضافة (مثل: فاتورة لشركة الأمل بيع 2 شاحن آيفون سعر الحبة 50 ريال وضريبة 15%).
4. "query" (استعلام مالي): عند السؤال عن الرصيد، الديون، أو تقرير مالي (مثل: كم إجمالي المصاريف هذا الشهر؟ كم ديوني لأحمد؟).
5. "greeting" (ترحيب): ترحيب عام أو شكر من المستخدم.

تفاصيل الصياغة لكائن JSON المرتجع:
يجب أن ترجع JSON بالشكل التالي بدقة متناهية:
{
  "entryType": "expense" | "debt" | "invoice" | "query" | "greeting" | "unknown",
  "data": {
    // في حال كان expense:
    "title": "عنوان ووصف المصروف (مثال: بنزين سيارة)",
    "amount": 45.0,
    "categoryId": "تخمين التصنيف: 'cat_hospitality' (مطاعم)، 'cat_transport' (مواصلات)، 'cat_bills' (فواتير وحكومي)، 'cat_personal_other' (أخرى)",
    "notes": "ملاحظات إضافية"

    // في حال كان debt:
    "personName": "اسم الشخص",
    "amount": 1500.0,
    "currency": "ر.س",
    "type": "owed_to_me" (سلفة منّي لأحدهم) أو "i_owe" (دين عليّ لأحدهم),
    "notes": "سبب السلفة أو الدين"

    // في حال كان invoice:
    "customerName": "اسم العميل",
    "customerPhone": "رقم هاتف العميل إن وجد أو null",
    "items": [
      {
        "description": "اسم المنتج أو الخدمة",
        "quantity": 2,
        "unitPrice": 50.0,
        "taxRate": 15
      }
    ],
    "notes": "تفاصيل إضافية للفاتورة"
  },
  "reply": "صيغة الرد باللغة العربية المحببة مع إيموجي (مثال: أبشر يا أحمد! 🍽️ لقد قمت بفهم كلامك وتسجيل مصروف جديد: مصروف غداء بقيمة 50 ريال.)"
}

الرد المكتوب في حقل "reply":
- يجب أن يكون موجهاً باسم المرسل إذا عرفته (المرسل اسمه: \${senderName}، ورقمه: \${senderPhone}).
- في حال المصروف: وضح أن الحركة جاهزة للمزامنة بضغطة زر أو تمت تلقائياً.
- في حال الفاتورة: اكتب تفاصيل البنود والضريبة والإجمالي بوضوح في ردك لتأكيد الفهم.
- في حال الدين: حدد ما إذا كان الدين مستحق له أو عليه وبدقة.

ملاحظات هامة:
- أرجع كائن JSON فقط وبشكل صارم. لا تضع علامات markdown \`\`\`json أو أي نصوص قبلها أو بعدها. يجب أن تبدأ الاستجابة بـ { وتنتهي بـ } لتسهيل تحليلها.`;

      const contents: any[] = [];
      if (audioBase64) {
        contents.push({
          inlineData: {
            mimeType: mimeType || 'audio/ogg',
            data: audioBase64.replace(/^data:[^;]+;base64,/, '')
          }
        });
      }

      // Append user instructions
      let userText = `اسم المرسل: ${senderName}\nرقم الهاتف: ${senderPhone}`;
      if (text) {
        userText += `\nنص الرسالة المرسلة: "${text}"`;
      } else {
        userText += `\nالرجاء الاستماع للملف الصوتي المرفق، وتفريغ النص منه كرسالة مستلمة، ثم تحليلها ماليًا ومحاسبيًا طبقًا للتعليمات.`;
      }
      
      contents.push({ text: promptText + `\n\nالمدخلات الحالية:\n${userText}` });

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: contents,
      });

      const responseText = response.text || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          reply: parsed.reply || 'تم استلام الحركة بنجاح وفهمها!',
          parsed: parsed
        };
      } else {
        console.warn('Could not parse JSON from Gemini response:', responseText);
        return {
          success: false,
          reply: `📝 استلمت رسالتك: "${responseText.slice(0, 100)}"، لكن تعذر عليّ استخراج حركة مالية هيكلية منها. هل يمكنك صياغتها بشكل أوضح؟ (مثال: "سجل مصروف بنزين 50 ريال")`,
          parsed: {
            entryType: 'unknown',
            transcribedText: responseText
          }
        };
      }
    } catch (err: any) {
      console.error('Error in processWhatsAppMessage:', err);
      return {
        success: false,
        reply: '❌ عذراً، حدث خطأ أثناء معالجة الرسالة باستخدام الذكاء الاصطناعي. الرجاء المحاولة مرة أخرى.',
        parsed: null
      };
    }
  }

  // 1. WhatsApp Webhook Validation (GET)
  app.get('/api/whatsapp/webhook', (req, res) => {
    const verifyToken = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const mode = req.query['hub.mode'];
    
    if (mode === 'subscribe' && verifyToken) {
      console.log('WhatsApp webhook verified successfully!');
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  });

  // Helper to escape XML characters for Twilio responses
  function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  // 2. WhatsApp Webhook Receiver (POST)
  app.post('/api/whatsapp/webhook', async (req, res) => {
    try {
      const body = req.body;
      console.log('Received WhatsApp Webhook payload:', JSON.stringify(body, null, 2));

      // A. TWILIO WEBHOOK DETECTION & HANDLING
      const isTwilio = body.AccountSid || (body.From && body.From.startsWith('whatsapp:'));
      if (isTwilio) {
        const rawFrom = body.From || '';
        const from = rawFrom.replace('whatsapp:', '').trim(); // extract phone number e.g. +966501234567
        const msgId = body.MessageSid || 'tw_' + Date.now();
        const timestamp = new Date().toISOString();
        let messageText = body.Body || '';
        let type: 'text' | 'audio' = 'text';
        let audioBase64 = '';
        let audioMimeType = '';

        const numMedia = parseInt(body.NumMedia || '0');
        if (numMedia > 0 && body.MediaContentType0?.startsWith('audio/')) {
          type = 'audio';
          audioMimeType = body.MediaContentType0;
          messageText = '🎤 [رسالة صوتية مستلمة عبر Twilio]';
          const mediaUrl = body.MediaUrl0;
          if (mediaUrl) {
            try {
              const downloadRes = await fetch(mediaUrl);
              const audioBuffer = await downloadRes.arrayBuffer();
              audioBase64 = Buffer.from(audioBuffer).toString('base64');
            } catch (mediaErr) {
              console.error('Error downloading Twilio audio:', mediaErr);
            }
          }
        }

        // Process message via Gemini AI
        const aiResult = await processWhatsAppMessage({
          text: type === 'text' ? messageText : '',
          audioBase64,
          mimeType: audioMimeType,
          senderName: from,
          senderPhone: from
        });

        // Insert into global web logs
        const newLog = {
          id: msgId,
          timestamp,
          sender: from,
          senderName: `عميل واتساب (تويليو: ${from})`,
          type,
          content: messageText,
          status: aiResult.success ? 'processed' : 'failed',
          parsedAction: aiResult.parsed,
          reply: aiResult.reply,
          synced: false,
          provider: 'twilio'
        };

        whatsappLogs.unshift(newLog);
        if (whatsappLogs.length > 100) {
          whatsappLogs = whatsappLogs.slice(0, 100);
        }

        // Return synchronous TwiML back to Twilio (which sends it as a WhatsApp response instantly)
        res.header('Content-Type', 'text/xml');
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>
        <Body>${escapeXml(aiResult.reply || 'تم استلام وتوثيق رسالتك بنجاح.')}</Body>
    </Message>
</Response>`;
        return res.status(200).send(twiml);
      }

      // B. META WHATSAPP CLOUD API HANDLING
      if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;
        const message = value?.messages?.[0];

        if (message) {
          const from = message.from;
          const msgId = message.id;
          const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();
          let messageText = '';
          let type: 'text' | 'audio' = 'text';
          let audioBase64 = '';
          let audioMimeType = '';

          if (message.type === 'text') {
            messageText = message.text?.body || '';
            type = 'text';
          } else if (message.type === 'audio') {
            type = 'audio';
            const audioId = message.audio?.id;
            audioMimeType = message.audio?.mime_type || 'audio/ogg';
            messageText = '🎤 [رسالة صوتية مستلمة عبر Meta]';
            
            // Fetch audio file from Meta Media API if WHATSAPP_ACCESS_TOKEN is configured
            const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
            if (accessToken && audioId) {
              try {
                const mediaRes = await fetch(`https://graph.facebook.com/v18.0/${audioId}`, {
                  headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                const mediaData = await mediaRes.json();
                const downloadUrl = mediaData.url;
                if (downloadUrl) {
                  const downloadRes = await fetch(downloadUrl, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                  });
                  const audioBuffer = await downloadRes.arrayBuffer();
                  audioBase64 = Buffer.from(audioBuffer).toString('base64');
                }
              } catch (mediaErr) {
                console.error('Error downloading Meta WhatsApp audio:', mediaErr);
              }
            }
          }

          // Process the received message via Gemini AI
          const aiResult = await processWhatsAppMessage({
            text: type === 'text' ? messageText : '',
            audioBase64,
            mimeType: audioMimeType,
            senderName: value?.contacts?.[0]?.profile?.name || from,
            senderPhone: from
          });

          // Insert into global web logs
          const newLog = {
            id: msgId || 'wa_' + Date.now(),
            timestamp,
            sender: from,
            senderName: value?.contacts?.[0]?.profile?.name || 'مستخدم واتساب',
            type,
            content: messageText,
            status: aiResult.success ? 'processed' : 'failed',
            parsedAction: aiResult.parsed,
            reply: aiResult.reply,
            synced: false,
            provider: 'meta'
          };

          whatsappLogs.unshift(newLog);
          if (whatsappLogs.length > 100) {
            whatsappLogs = whatsappLogs.slice(0, 100);
          }

          // Send WhatsApp response if WHATSAPP_ACCESS_TOKEN and PHONE_NUMBER_ID are configured
          const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
          const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
          if (phoneNumberId && accessToken && aiResult.reply) {
            try {
              await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: from,
                  type: 'text',
                  text: { body: aiResult.reply }
                })
              });
              console.log(`Sent Meta WhatsApp response to ${from}`);
            } catch (replyErr) {
              console.error('Error sending Meta WhatsApp message response:', replyErr);
            }
          }
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    } catch (err: any) {
      console.error('Error in WhatsApp webhook endpoint:', err);
      return res.status(500).send('INTERNAL_ERROR');
    }
  });

  // 3. Simulated Message / Voice Processing Endpoint (For in-app playground)
  app.post('/api/whatsapp/simulate', async (req, res) => {
    try {
      const { text, audioBase64, mimeType, senderName, senderPhone } = req.body;
      
      const phone = senderPhone || '+966501234567';
      const name = senderName || 'أحمد الحربي';
      const type = audioBase64 ? 'audio' : 'text';
      const content = text || '🎤 رسالة صوتية محاكاة';

      // Process with Gemini
      const aiResult = await processWhatsAppMessage({
        text: type === 'text' ? text : '',
        audioBase64,
        mimeType,
        senderName: name,
        senderPhone: phone
      });

      const newLog = {
        id: 'sim_' + Date.now(),
        timestamp: new Date().toISOString(),
        sender: phone,
        senderName: name,
        type,
        content,
        status: aiResult.success ? 'processed' : 'failed',
        parsedAction: aiResult.parsed,
        reply: aiResult.reply,
        synced: false
      };

      whatsappLogs.unshift(newLog);
      if (whatsappLogs.length > 100) {
        whatsappLogs = whatsappLogs.slice(0, 100);
      }

      // If tokens are active, we also send a real WhatsApp text to the simulated phone number!
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      if (phoneNumberId && accessToken && aiResult.reply && phone && !phone.startsWith('+966500000')) {
        try {
          await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone,
              type: 'text',
              text: { body: aiResult.reply }
            })
          });
          console.log(`Sent real WhatsApp reply for simulated event to ${phone}`);
        } catch (replyErr) {
          console.error('Failed to dispatch real WhatsApp reply during simulation:', replyErr);
        }
      }

      return res.json({ success: true, log: newLog });
    } catch (err: any) {
      console.error('Error in simulation endpoint:', err);
      return res.status(500).json({ success: false, error: err.message || 'Error processing simulated message' });
    }
  });

  // API endpoint: Analyze Invoice document (PDF/Image) using Gemini AI
  app.post('/api/analyze-invoice-document', async (req, res) => {
    try {
      const { fileBase64, mimeType } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ error: 'لم يتم تزويد الملف للتحليل' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'مفتاح GEMINI_API_KEY غير مهيأ في النظام. يرجى التأكد من إضافة المفتاح في الإعدادات.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const promptText = `أنت خبير محترف في تحليل الفواتير الضريبية (Tax Invoices) وفواتير المبيعات.
قمت برفع مستند (صورة أو ملف PDF) يمثل فاتورة ضريبية.
المطلوب استخراج كافة بيانات الفاتورة بدقة فائقة لتحويلها إلى تنسيق JSON.

استخرج البيانات التالية باللغة العربية بتنسيق JSON فقط:
- customerName: اسم العميل أو المشتري (String)
- customerTaxNumber: الرقم الضريبي للعميل إن وجد (String | null)
- customerPhone: رقم الهاتف إن وجد (String | null)
- customerAddress: العنوان إن وجد (String | null)
- date: تاريخ الفاتورة بتنسيق YYYY-MM-DD (String)
- items: مصفوفة تحتوي على الأصناف المذكورة في الفاتورة، كل صنف يحتوي على:
    - description: وصف الصنف أو اسم المنتج (String)
    - quantity: الكمية (Number)
    - unitPrice: سعر الوحدة قبل الضريبة (Number)
    - taxRate: نسبة الضريبة (مثلاً 15 لـ 15% أو 0) (Number)
- paymentMethod: طريقة الدفع إن ذكرت (مثلاً 'cash', 'bank_transfer', 'card') (String | null)

المخرجات يجب أن تكون JSON فقط بالشكل التالي دون أي نصوص إضافية:
{
  "customerName": "شركة الأمل",
  "customerTaxNumber": "312345678900003",
  "customerPhone": "0501234567",
  "customerAddress": "الرياض، السعودية",
  "date": "2026-07-29",
  "items": [
    {
      "description": "شاحن آيفون أصلي",
      "quantity": 2,
      "unitPrice": 50.0,
      "taxRate": 15
    }
  ],
  "paymentMethod": "cash"
}`;

      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'application/pdf',
                  data: cleanBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
      });

      const responseText = response.text || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedInvoice = JSON.parse(jsonMatch[0]);
        return res.json({ success: true, invoice: parsedInvoice });
      } else {
        return res.status(422).json({
          error: 'لم يتسنّ قراءة بيانات الفاتورة بشكل مهيكل من هذا الملف.',
          raw: responseText,
        });
      }
    } catch (err: any) {
      console.error('Error analyzing invoice document:', err);
      return res.status(500).json({
        error: err?.message || 'حدث خطأ أثناء معالجة وتحليل الفاتورة بوساطة الذكاء الاصطناعي.',
      });
    }
  });

  // 4. Retrieve recent logs
  app.get('/api/whatsapp/logs', (req, res) => {
    res.json({ success: true, logs: whatsappLogs });
  });

  // 5. Clear logs
  app.post('/api/whatsapp/clear-logs', (req, res) => {
    whatsappLogs = [];
    res.json({ success: true });
  });

  // 6. Mark a log as synced (saved to database by client)
  app.post('/api/whatsapp/mark-synced', (req, res) => {
    const { id } = req.body;
    const log = whatsappLogs.find(l => l.id === id);
    if (log) {
      log.synced = true;
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Log not found' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
