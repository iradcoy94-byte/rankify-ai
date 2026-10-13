/// <reference lib="deno.ns" />
import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function corsHeaders(origin: string | null) {
  const allowed = Deno.env.get("APP_ORIGIN");
  const local = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
  return {
    "Access-Control-Allow-Origin": allowed && origin === allowed ? allowed : local ? origin! : "null",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function textContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter((part) => part && typeof part === "object" && (part as { type?: string }).type === "text")
    .map((part) => (part as { text?: string }).text ?? "").join(" ").trim();
}

function streamText(text: string, headers: HeadersInit) {
  const body = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;
  return new Response(body, { status: 200, headers: { ...Object.fromEntries(new Headers(headers)), "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}

Deno.serve(async (request) => {
  const headers = corsHeaders(request.headers.get("origin"));
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Metode tidak didukung." }), { status: 405, headers: { ...headers, ...jsonHeaders } });

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Sesi login diperlukan." }), { status: 401, headers: { ...headers, ...jsonHeaders } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!supabaseUrl || !anonKey) return new Response(JSON.stringify({ error: "Fungsi Supabase belum dikonfigurasi." }), { status: 500, headers: { ...headers, ...jsonHeaders } });

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return new Response(JSON.stringify({ error: "Sesi login tidak valid." }), { status: 401, headers: { ...headers, ...jsonHeaders } });

  const { data: profile, error: profileError } = await userClient.from("profiles")
    .select("id, school_id, role, must_change_password").eq("id", authData.user.id).single();
  if (profileError || !profile) return new Response(JSON.stringify({ error: "Profil siswa tidak ditemukan." }), { status: 403, headers: { ...headers, ...jsonHeaders } });
  if (profile.role !== "siswa") return new Response(JSON.stringify({ error: "Tutor siswa hanya tersedia untuk akun peserta didik." }), { status: 403, headers: { ...headers, ...jsonHeaders } });
  if (profile.must_change_password) return new Response(JSON.stringify({ error: "Ganti kata sandi sementara sebelum memakai tutor." }), { status: 403, headers: { ...headers, ...jsonHeaders } });

  let payload: { messages?: unknown };
  try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: "Format permintaan tidak valid." }), { status: 400, headers: { ...headers, ...jsonHeaders } }); }
  const messages = Array.isArray(payload.messages) ? payload.messages.slice(-12) : [];
  if (messages.length === 0) return new Response(JSON.stringify({ error: "Tuliskan pertanyaan atau lampirkan foto soal." }), { status: 400, headers: { ...headers, ...jsonHeaders } });

  const oversizedImage = messages.some((message) => {
    const content = (message as { content?: unknown })?.content;
    if (!Array.isArray(content)) return false;
    return content.some((part) => typeof (part as { image_url?: { url?: string } })?.image_url?.url === "string" && ((part as { image_url: { url: string } }).image_url.url.length > 7_000_000));
  });
  if (oversizedImage) return new Response(JSON.stringify({ error: "Ukuran foto terlalu besar. Pilih gambar yang lebih kecil." }), { status: 413, headers: { ...headers, ...jsonHeaders } });

  const latestMessage = messages.filter((message) => (message as { role?: string }).role === "user").at(-1) as { content?: unknown } | undefined;
  const query = textContent(latestMessage?.content);
  let materialRows: { title: string; page_number: number | null; content: string }[] = [];
  if (query.length >= 2) {
    const { data } = await userClient.rpc("search_learning_materials", { search_text: query, max_rows: 6 });
    materialRows = (data ?? []) as typeof materialRows;
  }
  if (materialRows.length === 0 && query.length < 2) {
    const { data } = await userClient.from("learning_material_chunks")
      .select("content,page_number,material:learning_materials!inner(title,review_status)")
      .eq("school_id", profile.school_id).limit(6);
    materialRows = (data ?? []).filter((row: { material?: { review_status?: string } | { review_status?: string }[] }) => {
      const material = Array.isArray(row.material) ? row.material[0] : row.material;
      return material?.review_status === "approved";
    }).map((row: { content: string; page_number: number | null; material?: { title: string } | { title: string }[] }) => {
      const material = Array.isArray(row.material) ? row.material[0] : row.material;
      return { content: row.content, page_number: row.page_number, title: material?.title ?? "Materi" };
    });
  }

  if (materialRows.length === 0) {
    return streamText("Materi yang disetujui belum tersedia atau belum mencakup soal ini. Saya belum bisa menjawab berdasarkan sumber belajar. Silakan hubungi guru atau minta guru menambahkan materi yang sesuai.", headers);
  }

  const { data: scores } = await userClient.from("student_scores")
    .select("kind,meeting,score").eq("student_id", authData.user.id).order("created_at", { ascending: true }).limit(100);
  const ownScores = (scores ?? []) as { kind: string; meeting: number | null; score: number }[];
  const progress = ownScores.length
    ? `Ringkasan progres pribadi anonim: ${ownScores.length} nilai tersimpan; rata-rata ${Math.round(ownScores.reduce((sum, row) => sum + Number(row.score), 0) / ownScores.length * 10) / 10}; ${ownScores.filter((row) => row.kind === "pretest").length} pre-test dan ${ownScores.filter((row) => row.kind === "posttest").length} post-test.`
    : "Belum ada ringkasan progres nilai pribadi.";
  const sources = materialRows.map((row) => `[Sumber: ${row.title}${row.page_number ? `, halaman ${row.page_number}` : ""}]\n${row.content}`).join("\n\n").slice(0, 18_000);
  const systemPrompt = `Kamu tutor matematika Rankify.AI. Bantu siswa belajar dengan penjelasan bertahap: pahami soal, jelaskan konsep, berikan petunjuk/perhitungan, lalu cek pemahaman. Gunakan hanya materi sumber di bawah ini. Jangan mengarang rumus atau mengklaim ada di materi bila tidak didukung sumber. Jika sumber tidak cukup untuk menyelesaikan soal, katakan dengan jujur dan arahkan siswa bertanya pada guru. Sertakan rujukan nama materi dan halaman bila tersedia. Jangan minta atau menampilkan NISN, email, atau identitas akun. Jangan mengungkap data siswa lain.\n\n${progress}\n\nMATERI YANG DISETUJUI:\n${sources}`;

  if (!openRouterKey) return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY belum diatur sebagai Supabase secret." }), { status: 503, headers: { ...headers, ...jsonHeaders } });
  try {
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": Deno.env.get("APP_ORIGIN") ?? "https://rankify.app",
        "X-Title": "Rankify.AI Tutor",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENROUTER_MODEL") ?? "openai/gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });
    if (!upstream.ok || !upstream.body) {
      const status = upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502;
      return new Response(JSON.stringify({ error: status === 429 ? "Batas penggunaan tutor tercapai. Coba lagi nanti." : "Penyedia AI belum dapat memproses pertanyaan." }), { status, headers: { ...headers, ...jsonHeaders } });
    }
    return new Response(upstream.body, { status: 200, headers: { ...headers, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
  } catch {
    return new Response(JSON.stringify({ error: "Koneksi ke penyedia AI gagal. Periksa jaringan dan coba lagi." }), { status: 502, headers: { ...headers, ...jsonHeaders } });
  }
});
