# V32 Real Exchange Stream Engine

Endpoints:
- GET /api/stream/status
- GET /api/stream/ticks/:symbol
- GET /api/stream/candles/:symbol

Features:
- WebSocket-ready architecture
- Tick buffer
- Candle builder from ticks
- Stream provider status
- Stream dashboard
- Auto Stream 3s

Note:
V32 uses stream simulator. Production adapter should connect real Binance/Bybit/OKX WebSocket streams.
