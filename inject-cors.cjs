// يضيف دعم CORS إلى server.ts ويحدّث نموذج Gemini تلقائياً أثناء بناء Docker
const fs = require('fs');

let s = fs.readFileSync('server.ts', 'utf8');

// 1) إضافة CORS (ضروري لقبول طلبات تطبيق أندرويد Capacitor من https://localhost)
const anchor = "app.use(express.urlencoded({ extended: true, limit: '25mb' }));";
if (!s.includes('Access-Control-Allow-Origin')) {
  const cors = `

  // CORS: السماح لتطبيق أندرويد (Capacitor) بالاتصال بالخادم
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });`;
  if (!s.includes(anchor)) {
    throw new Error('anchor not found in server.ts');
  }
  s = s.replace(anchor, anchor + cors);
  console.log('CORS middleware injected into server.ts');
} else {
  console.log('CORS already present, skipping');
}

// 2) تحديث نموذج Gemini — gemini-1.5-flash أُوقف نهائياً (سبتمبر 2025)
// النموذج أصبح قابلاً للتغيير من متغير البيئة GEMINI_MODEL دون تعديل الكود
const oldModel = "model: 'gemini-1.5-flash'";
if (s.includes(oldModel)) {
  s = s.split(oldModel).join("model: process.env.GEMINI_MODEL || 'gemini-3.5-flash'");
  console.log('Gemini model updated -> GEMINI_MODEL env (default: gemini-3.5-flash)');
} else {
  console.log('Gemini model already updated, skipping');
}

fs.writeFileSync('server.ts', s);
