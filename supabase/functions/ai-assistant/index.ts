/// <reference lib="deno.ns" />

// Edge function: AI Assistant via Lovable AI Gateway
// Receives student data context + chat messages, returns streaming response

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Student = {
  className?: string;
  rank: number;
  name: string;
  score: number;
  isValid?: boolean;
};

Deno.serve(async (req: Request) => {
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
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Build context summary of student data so AI can analyze it
    const context =
      Array.isArray(students) && students.length > 0
        ? `Data siswa saat ini (sudah diranking, dense ranking):\n` +
          students
            .map(
              (s: Student) =>
                `[${s.className || "Tanpa Kelas"}] Rank ${s.rank}. ${s.name} - ${s.score}${
                  s.isValid ? "" : " (INVALID)"
                }`
            )
            .join("\n")
        : "Belum ada data siswa.";

    const systemPrompt = `Kamu adalah AI Assistant pendidikan untuk aplikasi Rankify.AI.
Tugasmu HANYA membantu guru/siswa terkait:
1. Analisis peringkat & nilai siswa.
2. Pelajaran Matematika.
3. Strategi belajar berdasarkan data nilai.

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
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();

      console.error("AI gateway error:", response.status, errText);

      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
      },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);

    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});