// يضيف دعم CORS إلى server.ts تلقائياً أثناء بناء Docker
// (ضروري لقبول طلبات تطبيق أندرويد Capacitor القادمة من مصدر https://localhost)
const fs = require('fs');

let s = fs.readFileSync('server.ts', 'utf8');
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
  fs.writeFileSync('server.ts', s);
  console.log('CORS middleware injected into server.ts');
} else {
  console.log('CORS already present, skipping');
}
