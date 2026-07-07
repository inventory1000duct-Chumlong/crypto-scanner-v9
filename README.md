# Crypto Scanner Pro V28 Enterprise Data Engine

เพิ่มจาก V27:
- Enterprise Data Engine
- Server-side JSON Store: `data/enterprise-store.json`
- Repository-style API
- Data Engine Dashboard
- Migrate localStorage → Server Store
- Sync All → Server
- Pull Server → Local
- Export Server Store
- PostgreSQL-ready adapter design

หมายเหตุ:
- V28 ยังไม่ใช่ PostgreSQL จริง แต่เป็น server-side data engine แบบ JSON file เพื่อทดสอบ cloud data flow บน Railway
- ขั้นต่อไปคือเปลี่ยน adapter เป็น PostgreSQL โดยใช้ endpoint เดิม
