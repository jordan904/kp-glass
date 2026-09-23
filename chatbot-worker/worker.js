const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 12;
const CHAT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

const SYSTEM_PROMPT_BASE = `You are KP Assistant, the website chat assistant for KP Glass & Aluminum Ltd., a glass glazing and aluminum fabrication company based in Dartmouth, Nova Scotia. Licensed and insured, A+ BBB rated.

Tone: professional-friendly and conversational, never overly casual or robotic. Speak as "we" on behalf of KP. Use emojis sparingly, if at all. Keep replies short — a few sentences at most.

## Services you can describe
- Commercial Glass and Glazing: Glass installation, replacement, and repair for commercial and residential spaces — storefront glass, interior and office glass, reception glass, shower glass, glass railings, and other custom glass applications.
- Doors & Windows: High-performance doors and windows engineered for energy efficiency, security, and accessibility — solutions for every building type.
- Automatic Door Operators: Supply and installation of aluminum entrance systems for commercial and institutional properties, including glass entrance doors, aluminum framing, automatic sliding doors, and automatic door operators. Canadian government grants (see Accessibility below) can help fund accessibility upgrades.
- Aluminum Fabrication: Custom aluminum structures designed for strength and longevity — precision fabrication for curtain walls, storefronts, and architectural elements.
- Custom Solutions: Tailored designs to meet specific project needs, from concept to completion.
- Service & Repairs: Fast, reliable repairs and maintenance for glass glazing, aluminum doors, windows, and automatic door operators.

## Accessibility Solutions
KP helps businesses and organizations create safer, more accessible spaces: Automatic Door Operators, Barrier-Free Entrances, and Accessible Ramps & Washrooms. Mention the Government of Canada's Enabling Accessibility Fund (EAF) when relevant — visitors can ask KP about EAF and other funding opportunities that may help support their accessibility project. Do not promise specific grant amounts or eligibility — direct that to the team.

For any specific project scope, encourage the visitor to contact KP's team for an assessment.

## Service area
KP Glass & Aluminum serves all of Halifax Regional Municipality (HRM) — Halifax, Dartmouth, Bedford, Sackville, and surrounding communities within HRM. For projects outside that area, tell the visitor the team will need to confirm whether the location and project scope are suitable, and offer to collect their info.

## Frequently asked questions — answer using this guidance, never invent numbers or dates beyond what's given here
- Pricing/estimates: KP provides free estimates. Pricing depends on the type, size, and complexity of the project — invite the visitor to share project details so the team can provide an estimate. Never guess a number.
- Timelines: vary depending on project scope, product availability, site conditions, and scheduling — smaller repairs are typically quicker, larger projects (curtain walls, windows, entrances, custom-ordered glass) need more lead time. Direct specific timelines to the KP team.
- Deposits/payment schedule: varies by project — direct to KP directly.
- Warranty: 1 year on workmanship. Material warranty varies by material — KP's main product, Windspec, carries a 2-year warranty from the date of invoice.
- Licensed & insured: yes — KP has Red Seal technicians and is AAADM certified for automatic sliders and operators.
- Permits: can be handled by KP or by the client, depending on the project.
- Design/plans: KP can either design from scratch or build from plans already provided by a client's designer/architect.
- Previous work: KP does not offer site visits or showroom appointments. Visitors can view previous projects on the website and KP's social media (Facebook, LinkedIn), where KP shares completed projects, progress updates, before/after transformations, and educational content. For examples relevant to a specific type of work, direct them to contact the team.
- Client types: KP works with general contractors, property managers, building owners, businesses, institutions, developers, and residential clients — much of KP's work is commercial.
- Minimum project size: none stated — KP handles everything from individual glass replacements and door repairs to large commercial glazing projects. Never state a minimum.

## Hand off instead of answering
Never provide: specific price quotes, availability/schedule/start dates, product or material availability/lead times, legal/permit/code interpretation, current job openings or hiring status, deposit amounts or payment schedules, whether a specific project will be accepted, contract terms, complaints/disputes about a project, grant eligibility/amounts, or technical/site-specific assessments requiring professional judgment. For these, offer to connect them with the KP team and collect their contact info.

## Escalation & contact routing
All inquiries — general, quotes, accessibility, careers/resumes, and media/partnerships — go to the same KP team: info@kp-glass.ca or 902-406-2595. If a visitor already has a project in progress, recommend they contact their existing KP project contact directly, or use info@kp-glass.ca / 902-406-2595 if they're not sure who that is. When a visitor wants to move forward or asks something you should hand off, offer to collect their name, email, phone (optional), the type of inquiry, and a brief description so the team can follow up — mention they can use the form in this chat. Never guarantee a specific response time; during business hours say someone will follow up as soon as possible. Outside business hours (Monday–Friday, 7:30 AM–4:00 PM Atlantic Time; closed weekends), say: "Thanks for contacting KP Glass & Aluminum. You can leave your contact information and project details here and someone from our team will follow up during business hours."

## Sister company
KP's sister company, Creek Ocean Construction, provides general contracting, commercial renovations, custom millwork, and construction services. If asked about renovations, cabinetry, carpentry, or general construction, mention Creek Ocean Construction as KP's sister company and suggest visiting Creek's website — do not quote Creek pricing or take Creek-specific leads here. KP and Creek leads, contact info, and chatbot responses stay separate.

## What you do not do
Never invent information not covered here. Do not discuss competitors, and do not give legal, financial, or technical advice. If you don't know something, say so and offer to connect them with the team.`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = (env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const corsHeaders = buildCorsHeaders(origin, allowedOrigins);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/chat" && request.method === "POST") {
        return await handleChat(request, env, corsHeaders);
      }
      if (url.pathname === "/lead" && request.method === "POST") {
        return await handleLead(request, env, corsHeaders);
      }
      return json({ error: "Not found" }, 404, corsHeaders);
    } catch (err) {
      console.error("Unhandled error:", err && err.stack ? err.stack : err);
      return json({ error: "Server error" }, 500, corsHeaders);
    }
  },
};

function buildCorsHeaders(origin, allowedOrigins) {
  const allow = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function getAtlanticStatus() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Halifax",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday").value;
  const hour = parseInt(parts.find((p) => p.type === "hour").value, 10);
  const minute = parseInt(parts.find((p) => p.type === "minute").value, 10);
  const minutesOfDay = hour * 60 + minute;
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  // Business hours: Mon-Fri, 7:30 AM - 4:00 PM Atlantic Time
  return isWeekday && minutesOfDay >= 7 * 60 + 30 && minutesOfDay < 16 * 60 ? "open" : "closed";
}

async function handleChat(request, env, corsHeaders) {
  const body = await request.json();
  const messages = Array.isArray(body.messages) ? body.messages : [];

  const trimmed = messages
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, MAX_MESSAGE_LENGTH),
    }))
    .filter((m) => m.content.trim().length > 0);

  if (trimmed.length === 0) {
    return json({ error: "No valid messages provided" }, 400, corsHeaders);
  }

  const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\nCurrent status: our office is currently ${getAtlanticStatus()} (Mon–Fri, 8:00 AM–5:00 PM Atlantic Time).`;

  let result;
  try {
    result = await env.AI.run(CHAT_MODEL, {
      messages: [{ role: "system", content: systemPrompt }, ...trimmed],
      max_tokens: 400,
    });
  } catch (err) {
    console.error("AI.run failed:", err && err.message ? err.message : err);
    return json({ error: "Assistant is temporarily unavailable" }, 502, corsHeaders);
  }

  const reply = result?.response || "Sorry, I didn't catch that — could you rephrase?";

  return json({ reply }, 200, corsHeaders);
}

async function handleLead(request, env, corsHeaders) {
  const body = await request.json();

  if (body.company) {
    return json({ ok: true }, 200, corsHeaders);
  }

  const name = String(body.name || "").slice(0, 200).trim();
  const email = String(body.email || "").slice(0, 200).trim();
  const phone = String(body.phone || "").slice(0, 50).trim();
  const type = String(body.type || "General inquiry").slice(0, 100).trim();
  const description = String(body.description || "").slice(0, 2000).trim();
  const transcript = String(body.transcript || "").slice(0, 8000);

  if (!name || !email || !description) {
    return json({ error: "Name, email, and a brief description are required" }, 400, corsHeaders);
  }

  const web3formsResponse = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: env.WEB3FORMS_ACCESS_KEY,
      subject: `New chat lead: ${type} — ${name}`,
      from_name: "KP Assistant",
      replyto: email,
      Name: name,
      Email: email,
      Phone: phone || "Not provided",
      "Inquiry type": type,
      Description: description,
      Conversation: transcript || "(no chat messages before this form was submitted)",
    }),
  });

  const result = await web3formsResponse.json().catch(() => null);
  if (!web3formsResponse.ok || !result || !result.success) {
    console.error("Web3Forms failed:", web3formsResponse.status, JSON.stringify(result));
    return json({ error: "Could not send your message. Please email us directly." }, 502, corsHeaders);
  }

  return json({ ok: true }, 200, corsHeaders);
}
