/// <reference lib="deno.ns" />
import { createClient } from "npm:@supabase/supabase-js@2";

function cors(origin: string | null) {
  const configured = Deno.env.get("APP_ORIGIN");
  const local = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
  return {
    "Access-Control-Allow-Origin": configured && configured === origin ? configured : local ? origin! : "null",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function resolveCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

Deno.serve(async (request) => {
  const headers = cors(request.headers.get("origin"));
  if (request.method === "OPTIONS") return new Response(null, { headers });
  const authorization = request.headers.get("Authorization");
  if (request.method !== "POST" || !authorization?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Permintaan tidak valid atau sesi login diperlukan." }), { status: 401, headers: { ...headers, "Content-Type": "application/json" } });

  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return new Response(JSON.stringify({ error: "Sesi login tidak valid." }), { status: 401, headers: { ...headers, "Content-Type": "application/json" } });
  const { data: profile } = await client.from("profiles").select("role,must_change_password").eq("id", auth.user.id).single();
  if (!profile || !["guru", "admin"].includes(profile.role)) return new Response(JSON.stringify({ error: "Insight tersedia untuk guru dan administrator." }), { status: 403, headers: { ...headers, "Content-Type": "application/json" } });
  if (profile.must_change_password) return new Response(JSON.stringify({ error: "Ganti kata sandi sementara terlebih dahulu." }), { status: 403, headers: { ...headers, "Content-Type": "application/json" } });

  let payload: { messages?: unknown };
  try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: "Format permintaan tidak valid." }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } }); }
  const messages = Array.isArray(payload.messages) ? payload.messages.slice(-12) : [];
  if (!messages.length) return new Response(JSON.stringify({ error: "Tuliskan pertanyaan tentang data kelas." }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });

  // RLS restricts teachers to assigned classes. Only aggregate score data, without names/NISN, leaves Supabase.
  const { data: scores, error: scoresError } = await client.from("student_scores").select("class_id,kind,meeting,score").order("created_at", { ascending: false }).limit(1000);
  if (scoresError) return new Response(JSON.stringify({ error: "Tidak dapat memuat ringkasan nilai yang diizinkan." }), { status: 403, headers: { ...headers, "Content-Type": "application/json" } });
  const { data: classes } = await client.from("classes").select("id,name");
  const classNames = new Map((classes ?? []).map((row) => [row.id, row.name]));
  const groups = new Map<string, number[]>();
  for (const row of scores ?? []) {
    const group = `${classNames.get(row.class_id) ?? "Kelas"} · ${row.kind === "meeting" ? `pertemuan ${row.meeting}` : row.kind}`;
    groups.set(group, [...(groups.get(group) ?? []), Number(row.score)]);
  }
  const summary = [...groups.entries()].map(([assessment, values]) => ({ assessment, count: values.length, average: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10, min: Math.min(...values), max: Math.max(...values) }));

  const homelabBaseUrl = Deno.env.get("HOMELAB_AI_BASE_URL") || Deno.env.get("AI_GATEWAY_URL");
  const homelabApiKey = Deno.env.get("HOMELAB_AI_API_KEY") || Deno.env.get("AI_GATEWAY_KEY");
  const homelabModel = Deno.env.get("HOMELAB_AI_MODEL") || Deno.env.get("AI_GATEWAY_MODEL") || "auto";

  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  const openRouterModel = Deno.env.get("OPENROUTER_MODEL") ?? "openai/gpt-4o";

  if (!homelabApiKey && !openRouterKey) {
    return new Response(JSON.stringify({ error: "Layanan AI belum dikonfigurasi (HOMELAB_AI_API_KEY atau OPENROUTER_API_KEY belum diatur)." }), { status: 503, headers: { ...headers, "Content-Type": "application/json" } });
  }

  const systemMessage = {
    role: "system",
    content: `Kamu membantu guru memahami capaian belajar siswa pada platform Rankify.AI. Jawab dalam Bahasa Indonesia dengan rekomendasi pedagogis yang terukur dan berbasis bukti. Gunakan hanya ringkasan nilai anonim berikut, jangan menebak identitas siswa atau membuat klaim tanpa data. Format rumus/analisis dengan rapi.\n\nData Ringkasan Kelas:\n${JSON.stringify(summary)}`,
  };
  const promptMessages = [systemMessage, ...messages];

  // Coba AI Gateway VPS Homelab terlebih dahulu bila dikonfigurasi
  if (homelabApiKey) {
    try {
      const baseUrl = (homelabBaseUrl || "https://ssh-cafe.tail660de5.ts.net/v1").replace(/\/+$/, "");
      const completionsUrl = resolveCompletionsUrl(baseUrl);
      const upstream = await fetch(completionsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${homelabApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": Deno.env.get("APP_ORIGIN") ?? "https://rankify.app",
          "X-Title": "Rankify.AI Teacher Insights",
        },
        body: JSON.stringify({
          model: homelabModel,
          stream: true,
          messages: promptMessages,
        }),
      });

      if (upstream.ok && upstream.body) {
        return new Response(upstream.body, { headers: { ...headers, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
      }
      console.warn("Homelab AI Gateway teacher-insights error status:", upstream.status);
    } catch (err) {
      console.warn("Homelab AI Gateway teacher-insights gagal, mencoba OpenRouter:", err);
    }
  }

  // Fallback ke OpenRouter
  if (openRouterKey) {
    try {
      const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": Deno.env.get("APP_ORIGIN") ?? "https://rankify.app",
          "X-Title": "Rankify.AI Teacher Insights",
        },
        body: JSON.stringify({
          model: openRouterModel,
          stream: true,
          messages: promptMessages,
        }),
      });

      if (!upstream.ok || !upstream.body) {
        return new Response(JSON.stringify({ error: upstream.status === 429 ? "Batas penggunaan AI tercapai." : "Penyedia AI gagal memproses insight." }), { status: upstream.status === 429 ? 429 : 502, headers: { ...headers, "Content-Type": "application/json" } });
      }
      return new Response(upstream.body, { headers: { ...headers, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
    } catch {
      return new Response(JSON.stringify({ error: "Koneksi ke penyedia AI gagal." }), { status: 502, headers: { ...headers, "Content-Type": "application/json" } });
    }
  }

  return new Response(JSON.stringify({ error: "Penyedia AI gagal memproses insight." }), { status: 502, headers: { ...headers, "Content-Type": "application/json" } });
});
