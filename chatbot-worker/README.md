# KP Assistant: Chat Worker

Cloudflare Worker behind the "KP Assistant" chat widget on the KP Glass &
Aluminum site. Same architecture as the Creek Ocean Construction chatbot
(`../../creek/chatbot-worker/`). It answers questions using Cloudflare Workers
AI (free, no card or separate account needed) and saves each conversation for
review. Lead emails are sent from the browser, not from this Worker (see Setup
step 2).

KP routes every inquiry type (general, quotes, accessibility, careers) to the
same inbox, so the site needs only **one** Web3Forms access key. Creek uses two.

## Setup

### 1. Workers AI: no signup needed
Nothing to configure. The `[ai]` binding in `wrangler.toml` gives the Worker
access to Cloudflare's hosted models on the same account used to deploy it.

### 2. Lead emails (Web3Forms, sent from the browser)
This Worker does not send email. The in-chat contact form and the page contact
form send straight from the visitor's browser to Web3Forms (see `sendLead` in
`../chatbot/chatbot.js`). Sending from the Worker failed because Web3Forms
rate-limits Cloudflare's shared outbound IPs ("Rate limit exceeded. IP
temporarily blocked"). Web3Forms access keys are public by design and live in
`chatbot.js`; restrict them to the site's domains in the Web3Forms dashboard.

### 3. Deploy
```bash
cd chatbot-worker
npx wrangler login
npx wrangler deploy
```

Deployed at `https://kp-chatbot.jordan-574.workers.dev`. That URL is set as
`CHAT_API_BASE` in `../chatbot/chatbot.js`.

## Endpoints
- `POST /chat`: `{ messages: [{ role, content }], sessionId }` returns `{ reply }`

## Conversation logging
Each chat conversation is saved to the `CHAT_LOGS` KV namespace
(`d7984fba4a524f7497f7b1028dd2c472`) under `session:<id>`, where the id is a
random UUID the widget keeps in `sessionStorage`. Entries expire after 90
days. `../privacy-policy.html` describes exactly this, so keep the two in sync.

To read logs, always pass `--remote` (without it, wrangler reads a local
simulated store and shows nothing):
```bash
npx wrangler kv key list --namespace-id d7984fba4a524f7497f7b1028dd2c472 --remote
npx wrangler kv key get --namespace-id d7984fba4a524f7497f7b1028dd2c472 --remote "session:<id>"
```

## System prompt
The prompt in `worker.js` is built from `../KP Chatbot Answer.pdf` (the
client's questionnaire, kept out of the public repo). Business hours are
Mon to Fri, 7:30 AM to 4:00 PM Atlantic; `getAtlanticStatus()` uses the same
hours, so change both together.

## Notes
- `ALLOWED_ORIGINS` in `wrangler.toml` controls CORS. Update it when the live
  domain changes.
- No client-side API keys: everything sensitive stays in Worker secrets.
- Consider a Cloudflare rate-limiting rule on `/chat` if usage
  grows, to cap abuse.
