# V20 Modular Architecture

This build keeps the app browser-compatible while preparing a production structure.

- core/version.js
- data/localStore.js
- data/schema.json
- workspace/
- portfolio/
- journal/
- quant/

The active UI still loads `app-v20.js` for Railway simplicity. V21 can progressively import these modules or migrate to a bundled client.
