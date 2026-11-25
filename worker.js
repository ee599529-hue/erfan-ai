const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const ALLOWED_ORIGINS = new Set([
  "https://erfan-vision.netlify.app",
  "https://rainbow-bavarois-8e2a81.netlify.app"
]);
const MARKET_URL = "https://xaus.com/api/v1/chart";


function calculateEMA(values, period) {
  if (!Array.isArray(values) || values.length < period) {
    return null;
  }

function calculateRSI(values, period = 14) {
  if (!Array.isArray(values) || values.length <= period) {
    return null;
  }

function calculateMACD(values) {
  if (!Array.isArray(values) || values.length < 35) {
    return null;
  }

  const ema12 = calculateEMA(values, 12);
  const ema26 = calculateEMA(values, 26);

  if (ema12 === null || ema26 === null) {
    return null;
  }

  const macdLine = ema12 - ema26;

  const macdHistory = [];

  for (let i = 26; i < values.length; i++) {
    const shortEMA = calculateEMA(values.slice(0, i + 1), 12);
    const longEMA = calculateEMA(values.slice(0, i + 1), 26);
    macdHistory.push(shortEMA - longEMA);
  }

  const signal = calculateEMA(macdHistory, 9);
  if (signal === null) return null;

  return {
    macd: Number(macdLine.toFixed(2)),
    signal: Number(signal.toFixed(2)),
    histogram: Number((macdLine - signal).toFixed(2))
  };
}

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

  const multiplier = 2 / (period + 1);
  let ema = values
    .slice(0, period)
    .reduce((sum, value) => sum + value, 0) / period;

  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }

  return Number(ema.toFixed(2));
}
const SYSTEM_PROMPT = `You are ERFAN AI, the helpful assistant for ERFAN VISION.
Reply in the same language as the user: Dari Persian, Persian, or English.
For Dari, use clear and natural Afghan Dari.
Be honest about uncertainty. Do not claim live market prices or guaranteed trading profits.
For financial topics, provide educational information, not personalized financial advice.
Keep answers clear, friendly, and reasonably concise.`;

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "null",
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

    if (!ALLOWED_ORIGINS.has(origin)) {
      return json({ error: "Origin not allowed" }, 403, origin);
    }

function analyzeGold(data) {
  if (!data || !Array.isArray(data.points)) {
    return { error: "Invalid gold market data" };
  }

  const candles = data.points.filter(
    p => Number.isFinite(Number(p.c)) && Number(p.c) > 0
  );

  const closes = candles.map(p => Number(p.c));

  if (closes.length < 200) {
    return {
      error: "Not enough candles for reliable analysis",
      candles: closes.length
    };
  }

  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);

  if (rsi === null || !macd) {
    return { error: "Indicator calculation failed" };
  }

  const price = closes[closes.length - 1];

  let bias = "NEUTRAL";

  if (price > ema20 && ema20 > ema50 && ema50 > ema200) {
    bias = "BULLISH";
  } else if (price < ema20 && ema20 < ema50 && ema50 < ema200) {
    bias = "BEARISH";
  }

  let signal = "WAIT";

  if (bias === "BULLISH" && rsi > 50 && macd.histogram > 0) {
    signal = "BUY";
  } else if (bias === "BEARISH" && rsi < 50 && macd.histogram < 0) {
    signal = "SELL";
  }

  return {
    symbol: "XAUUSD",
    price,
    timeframe: data.interval,
    indicators: { ema20, ema50, ema200, rsi, macd },
    bias,
    signal,
    candles: closes.length,
    note: "Technical analysis only. Not a guaranteed prediction."
  };
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
const analysis = analyzeGold(data);

return json({
  symbol: "XAUUSD",
  range,
  interval,
  source: "XAUS",
  data,
  analysis
}, 200, origin);

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
