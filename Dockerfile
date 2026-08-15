# مرحلة البناء: بناء الواجهة وتجميع الخادم
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# npm install وليس npm ci — ملف القفل غير متزامن مع package.json
RUN npm install --no-audit --no-fund
COPY . .
# جعل الخادم يقرأ المنفذ من متغير البيئة (مطلوب لـ Cloud Run)
RUN sed -i 's|const PORT = 3000;|const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;|' server.ts
# إضافة دعم CORS لقبول طلبات التطبيق
RUN node inject-cors.cjs
RUN npm run build

# مرحلة التشغيل: خادم الإنتاج فقط
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/server.cjs"]
