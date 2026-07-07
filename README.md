# Crypto Scanner Pro V20 Institutional Architecture

V20 เปลี่ยนจาก Prototype ไปสู่ Production-ready Architecture

เพิ่มจาก V19:
- Institutional Architecture Dashboard
- Modular frontend structure: public/modules/
- Data Layer schema เตรียมย้ายจาก localStorage ไป PostgreSQL
- Settings: default currency, capital, risk %
- Institutional Backup / Restore JSON
- /api/institutional/status
- Production Readiness status
- โครงสร้างพร้อมต่อ V21: Login, PostgreSQL, Cloud Sync, Audit Log, Reports

หมายเหตุ:
- V20 ยังใช้ localStorage เพื่อให้ deploy ง่ายบน Railway และใช้งานต่อเนื่องจากข้อมูลเดิม
- โครงสร้างถูกเตรียมให้ย้ายไปฐานข้อมูลจริงใน V21 โดยไม่ต้องรื้อ UI ทั้งหมด
