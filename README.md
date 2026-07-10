# Crypto Scanner Pro V33.4 — Portfolio Chart Logic Fix

แก้ไข:
- TP1 / TP2 / TP3 คำนวณจากทุนเฉลี่ยของพอร์ต
- เพิ่ม Break-even
- SL คำนวณจากทุนเฉลี่ยและส่วนต่างราคา
- ป้ายระดับราคาจัดเรียงด้านขวา ไม่ซ้อนกัน
- Candlestick เปลี่ยนจากคลื่นซ้ำแบบเดิมเป็น OHLC ที่ดูสมจริงขึ้น
- แสดงกำไร/ขาดทุนที่ TP, NOW และ SL
- ระบุชัดเจนว่ายังเป็น snapshot-derived OHLC ไม่ใช่ WebSocket จริง
