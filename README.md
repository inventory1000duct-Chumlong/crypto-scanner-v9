# Crypto Scanner Pro V30 Professional Quant Engine

เพิ่มจาก V29:
- `/api/quant/v30`
- Quant Score 2.0
- Multi-Timeframe Consensus: 1m / 5m / 15m / 1h / 4h / 1D
- Market Regime V30
- Event Scanner
- Professional Signal Dashboard
- MTF Table
- OHLC Adapter Framework ภายใน

หมายเหตุ:
- V30 ยังใช้ Synthetic OHLC จาก market snapshot
- ขั้นต่อไปควรเปลี่ยน `syntheticKlinesFromRow` เป็น real exchange klines เช่น Binance/Bybit/OKX
