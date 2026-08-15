# مرحلة البناء: بناء الواجهة وتجميع الخادم
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# جعل الخادم يقرأ المنفذ من متغير البيئة (مطلوب لـ Cloud Run)
RUN sed -i 's|const PORT = 3000;|const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;|' server.ts
RUN npm run build

# مرحلة التشغيل: خادم الإنتاج فقط
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/server.cjs"]
