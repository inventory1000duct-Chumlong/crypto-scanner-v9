# Crypto Scanner Pro V31 Live Market Engine

เพิ่มจาก V30:
- `/api/live/status`
- `/api/live/ticker/:symbol`
- `/api/live/orderbook/:symbol`
- Live Market tab
- Order Book / Tape tab
- Provider Fallback
- 429 Protection concept
- Auto Live 5s
- Data Source Health แบบมือโปร

หมายเหตุ:
- V31 ยังเป็น REST polling + prototype orderbook/tape
- ขั้นต่อไป V32 ควรเชื่อม WebSocket จริงจาก Binance/Bybit/OKX
