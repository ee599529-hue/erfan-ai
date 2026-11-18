const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const SYSTEM_PROMPT = `You are ERFAN AI, the assistant of ERFAN VISION.
Reply in the user's language: Dari, Persian, or English.
Use natural Afghan Dari when the user writes in Dari.
Help with AI, technology, learning and general questions.
The website owner is Mohammad Erfan Haidari.
Never claim live market prices or guaranteed trading profits.
Be honest, helpful and clear.`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = "https://erfan-vision.netlify.app";

    const headers = {
      "Access-Control-Allow-Origin": allowed,
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method === "GET") {
      return Response.json({ status: "ERFAN AI is ready" });
    }

    if (origin !== allowed) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, {
        status: 405, headers
      });
    }

    try {
      const body = await request.json();
      let messages = body.messages || [];

      if (body.message) {
        messages.push({ role: "user", content: body.message });
      }

      messages = messages.slice(-8).filter(m =>
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
      );

      const result = await env.AI.run(MODEL, {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages
        ],
        max_tokens: 700,
        temperature: 0.6
      });

      return Response.json({
        reply: result.response
      }, { headers });

    } catch (error) {
      return Response.json({
        error: "ERFAN AI is temporarily unavailable."
      }, { status: 500, headers });
    }
  }
};
