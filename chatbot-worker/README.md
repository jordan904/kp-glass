# KP Assistant — Chat Worker

Cloudflare Worker that powers the "KP Assistant" chat widget on the KP Glass
& Aluminum site — same architecture as the Creek Ocean Construction chatbot
(`../../creek/chatbot-worker/`): answers questions using Cloudflare Workers AI
(free — no card, no separate account), and emails lead details (via
Web3Forms — also free) when a visitor fills out the in-chat contact form.

Unlike Creek, KP routes every inquiry type (general, quotes, accessibility,
careers) to the same inbox (`info@kp-glass.ca`), matching the existing
"Send Your Resume" mailto link already on the site — so this only needs
**one** Web3Forms access key, not two.

## Setup

### 1. Workers AI — no signup needed
Nothing to configure. The `[ai]` binding in `wrangler.toml` gives the Worker
access to Cloudflare's free hosted models automatically, on the same
Cloudflare account already used to deploy the Worker.

### 2. Web3Forms (free email delivery)
- Go to **web3forms.com** and create an access key using `info@kp-glass.ca`.
- No domain verification, no cost, no card required.

### 3. Deploy to Cloudflare Workers
```bash
cd chatbot-worker
npx wrangler login
npx wrangler secret put WEB3FORMS_ACCESS_KEY
npx wrangler deploy
```

This gives you a URL like: `https://kp-chatbot.YOUR_ACCOUNT.workers.dev`

### 4. Point the widget at it
In `../chatbot/chatbot.js`, set `CHAT_API_BASE` to that Worker URL.

## Endpoints
- `POST /chat` — `{ messages: [{ role, content }] }` → `{ reply }`
- `POST /lead` — `{ name, email, phone?, type, description, transcript? }` → `{ ok: true }`

## Assumptions made when writing the system prompt (confirm/correct these)
- **Business hours**: assumed Mon–Fri, 8:00 AM–5:00 PM Atlantic Time, same as
  Creek — not stated anywhere on the KP site. Update `getAtlanticStatus()` in
  `worker.js` if different.
- **Bot name**: "KP Assistant", for naming parity with Creek's "Creek
  Assistant". Easy to rename back to "Clara" in `chatbot.js` if you'd rather
  keep that branding from the old voice assistant.
- No KP-specific chatbot questionnaire exists yet (unlike Creek's), so the
  FAQ hand-off list mirrors Creek's conservative defaults (no price quotes,
  no warranty specifics, no grant amounts, etc.) rather than KP-confirmed
  answers. Worth a quick review pass once live.

## Notes
- `ALLOWED_ORIGINS` in `wrangler.toml` controls CORS — update it if the live
  domain changes.
- No client-side API keys: everything sensitive stays in Worker secrets.
- Consider adding a Cloudflare rate-limiting rule on `/chat` and `/lead` in
  the dashboard if usage grows, to cap cost from abuse.
