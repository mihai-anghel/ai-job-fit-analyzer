AI Proxy (local development)

Purpose
- Provide a lightweight backend to store API keys and proxy requests to AI providers.

Quick start
1. Copy `.env.example` to `.env` and fill keys.
2. Install and run the proxy:

```bash
cd tools/proxy
yarn install
yarn start
```

Endpoints
- `POST /api/openai` — forwards to OpenAI chat completion endpoint.
- `POST /api/anthropic` — forwards to Anthropic complete endpoint.
- `GET /health` — healthcheck.

Security
- Keep `.env` out of version control. Use a secret manager in production.
- Restrict `ALLOWED_ORIGIN` to your app's origin.
