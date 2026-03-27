# Clara Vapi Webhook — Email Transcripts

Cloudflare Worker that receives Vapi end-of-call reports and emails the transcript.

## Setup

### 1. Resend (email service)
- Sign up at **resend.com** (free tier: 3,000 emails/month)
- Add and verify your domain (novaworksdigital.ca)
- Create an API key

### 2. Deploy to Cloudflare Workers
```bash
cd vapi-webhook
npx wrangler login
npx wrangler secret put RESEND_API_KEY
# paste your Resend API key when prompted
npx wrangler deploy
```

This gives you a URL like: `https://clara-vapi-webhook.YOUR_ACCOUNT.workers.dev`

### 3. Connect to Vapi
- Go to **vapi.ai** → Clara assistant
- Paste the Worker URL into **Server URL**
- Save

Every call will now email the transcript to jordan@novaworksdigital.ca.
