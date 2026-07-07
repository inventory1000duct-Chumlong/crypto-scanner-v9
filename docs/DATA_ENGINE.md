# V28 Enterprise Data Engine

Server-side JSON store prototype.

Endpoints:
- GET /api/data/status
- GET /api/data/export
- POST /api/data/import
- GET /api/data/:collection
- POST /api/data/:collection
- POST /api/data/migrate-local

Collections:
- settings
- trades
- portfolio
- watchlist
- alerts
- savedPlans
- audit

Next step:
Replace JSON file adapter with PostgreSQL repository.
