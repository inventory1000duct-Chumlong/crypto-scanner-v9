# Crypto Scanner Pro V9 Hedge Fund Edition

V9 เปลี่ยนเป็น Frontend + Node.js Backend เพื่อเลี่ยงข้อจำกัด Cloudflare Worker-only ที่เจอ 403/530 จาก API ภายนอก

## Run local
```bash
npm install
npm start
```
เปิด http://localhost:3000

## Deploy Railway
1. แตก ZIP
2. อัปโหลดเข้า GitHub
3. Railway > New Project > Deploy from GitHub
4. Railway จะใช้ `npm install` และ `npm start`
5. เปิด URL แล้วทดสอบ `/api/health`

## Deploy Render
Build Command: `npm install`
Start Command: `npm start`

## API
- `/api/health`
- `/api/scan?limit=50`
- `/api/debug`

หมายเหตุ: ใช้เพื่อคัดกรองโอกาส ไม่ใช่คำแนะนำการลงทุน
