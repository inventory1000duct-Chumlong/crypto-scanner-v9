# V31 Live Market Engine

Endpoints:
- GET /api/live/status
- GET /api/live/ticker/:symbol
- GET /api/live/orderbook/:symbol

Features:
- Provider fallback layer
- 429 protection concept
- Live ticker polling
- Order book prototype
- Time & sales tape prototype
- WebSocket adapter-ready

Note:
V31 uses REST polling and synthetic orderbook/tape based on market snapshot. Production step: replace with real exchange WebSocket streams.
