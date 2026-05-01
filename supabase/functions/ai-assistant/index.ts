// Edge function: AI Assistant via Lovable AI Gateway
// Receives student data context + chat messages, returns streaming response

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, students } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY missing in edge function env");
      return new Response(
        JSON.stringify({
          error:
            "AI belum dikonfigurasi. Aktifkan Lovable AI di Cloud settings.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build context summary of student data so AI can analyze it
    const context =
      Array.isArray(students) && students.length > 0
        ? `Data siswa saat ini (sudah diranking, dense ranking):\n` +
          students
            .map(
              (s: any) =>
                `[${s.className || "Tanpa Kelas"}] Rank ${s.rank}. ${s.name} - ${s.score}${
                  s.isValid ? "" : " (INVALID)"
                }`,
            )
            .join("\n")
        : "Belum ada data siswa.";

    const systemPrompt = `Kamu adalah AI Assistant pendidikan untuk aplikasi Rankify.AI.
Tugasmu HANYA membantu guru/siswa terkait:
1. Analisis peringkat & nilai siswa (data di KONTEKS DATA di bawah).
2. Pelajaran Matematika (konsep, soal, langkah penyelesaian, pembahasan).
3. Strategi belajar, evaluasi, bimbingan, atau saran pembelajaran berdasarkan data nilai.

ATURAN KETAT (WAJIB DIPATUHI):
- TOLAK semua pertanyaan di luar 3 topik di atas. Contoh yang HARUS ditolak:
  pertanyaan pribadi ("apakah saya ganteng?", "saya suka warna kuning", "saya sayang kamu",
  "saya anak tentara"), curhat, gosip, politik, agama, hiburan, coding di luar matematika,
  resep masakan, percintaan, opini personal tentang user, dll.
- Untuk pertanyaan di luar lingkup, jawab SINGKAT dan SOPAN dengan format persis seperti ini:
  "Maaf, saya hanya bisa membantu seputar **Analisis Peringkat Siswa** dan **Pelajaran Matematika**. Silakan ajukan pertanyaan terkait topik tersebut. 🙏"
  Jangan menjawab pertanyaan terlarang sama sekali, jangan basa-basi panjang.
- Jangan pernah memberi opini personal tentang penampilan, perasaan, atau kehidupan pribadi user.
- Selalu jawab dalam Bahasa Indonesia, ringkas, gunakan markdown bila perlu.

KONTEKS DATA:
${context}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit tercapai, coba lagi nanti." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Kredit AI habis. Tambahkan kredit di Settings > Workspace.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
