
const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const ALLOWED_ORIGIN = "https://erfan-vision.netlify.app";
const MARKET_URL = "https://xaus.com/api/v1/chart";

const SYSTEM_PROMPT = `You are ERFAN AI, the helpful assistant for ERFAN VISION.
Reply in the same language as the user: Dari Persian, Persian, or English.
For Dari, use clear and natural Afghan Dari.
Be honest about uncertainty. Do not claim live market prices or guaranteed trading profits.
For financial topics, provide educational information, not personalized financial advice.
Keep answers clear, friendly, and reasonably concise.`;

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method === "GET" && url.pathname === "/") {
      return json({ status: "ok", assistant: "ERFAN AI", market_endpoint: "/market/xau" }, 200, origin);
    }

    if (origin !== ALLOWED_ORIGIN) {
      return json({ error: "Origin not allowed" }, 403, origin);
    }

    if (request.method === "GET" && url.pathname === "/market/xau") {
      const range = url.searchParams.get("range") || "5d";
      const interval = url.searchParams.get("interval") || "15m";
      const allowedRanges = new Set(["1d", "5d", "1mo", "3mo"]);
      const allowedIntervals = new Set(["5m", "15m", "1h", "4h", "1d"]);

      if (!allowedRanges.has(range) || !allowedIntervals.has(interval)) {
        return json({ error: "Unsupported range or interval" }, 400, origin);
      }

      try {
        const upstream = new URL(MARKET_URL);
        upstream.searchParams.set("symbol", "xau");
        upstream.searchParams.set("range", range);
        upstream.searchParams.set("interval", interval);

        const response = await fetch(upstream.toString(), {
          headers: { "Accept": "application/json" }
        });
        const body = await response.text();

        if (!response.ok) {
          return json({ error: "Market data provider returned an error", provider_status: response.status }, 502, origin);
        }

        try {
          const data = JSON.parse(body);
          return json({ symbol: "XAUUSD", range, interval, source: "XAUS", data }, 200, origin);
        } catch {
          return json({ error: "Market data provider did not return valid JSON" }, 502, origin);
        }
      } catch {
        return json({ error: "Could not reach the market data provider" }, 502, origin);
      }
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, origin);
    }

    try {
      const rawBody = await request.text();
      if (rawBody.length > 12000) return json({ error: "Message is too long." }, 413, origin);
      const body = JSON.parse(rawBody);
      let messages = Array.isArray(body.messages) ? body.messages : [];

      if (messages.length === 0 && typeof body.message === "string") {
        messages = [{ role: "user", content: body.message }];
      }

      messages = messages
        .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-8)
        .map(m => ({ role: m.role, content: m.content.slice(0, 3000) }));

      if (messages.length === 0 || !messages.some(m => m.role === "user")) {
        return json({ error: "Please send a message." }, 400, origin);
      }

      const result = await env.AI.run(MODEL, {
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 700,
        temperature: 0.6
      });

      const answer = result && (result.response || result.result);
      if (!answer) return json({ error: "The AI did not return a response. Please try again." }, 502, origin);

      return json({ reply: answer }, 200, origin);
    } catch {
      return json({ error: "ERFAN AI is temporarily unavailable. Please try again." }, 500, origin);
    }
  }
};    
