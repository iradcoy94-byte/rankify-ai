/// <reference lib="deno.ns" />
import { createClient } from "npm:@supabase/supabase-js@2";

function cors(origin: string | null) {
  const configured = Deno.env.get("APP_ORIGIN");
  const local = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
  return { "Access-Control-Allow-Origin": configured && configured === origin ? configured : local ? origin! : "null", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
}

Deno.serve(async (request) => {
  const headers = cors(request.headers.get("origin"));
  if (request.method === "OPTIONS") return new Response(null, { headers });
  const authorization = request.headers.get("Authorization");
  if (request.method !== "POST" || !authorization?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Sesi admin diperlukan." }), { status: 401, headers: { ...headers, "Content-Type": "application/json" } });
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY belum diatur." }), { status: 503, headers: { ...headers, "Content-Type": "application/json" } });
  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: auth } = await caller.auth.getUser();
  if (!auth.user) return new Response(JSON.stringify({ error: "Sesi admin tidak valid." }), { status: 401, headers: { ...headers, "Content-Type": "application/json" } });
  const { data: adminProfile } = await caller.from("profiles").select("role,school_id").eq("id", auth.user.id).single();
  if (adminProfile?.role !== "admin") return new Response(JSON.stringify({ error: "Hanya administrator yang dapat mengubah akun." }), { status: 403, headers: { ...headers, "Content-Type": "application/json" } });
  let body: { action?: string; profileId?: string; temporaryPassword?: string };
  try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: "Format permintaan tidak valid." }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } }); }
  if (!body.profileId || !["reset-password", "deactivate", "reactivate"].includes(body.action ?? "")) return new Response(JSON.stringify({ error: "Tindakan akun tidak valid." }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
  if (body.profileId === auth.user.id && body.action === "deactivate") return new Response(JSON.stringify({ error: "Administrator tidak dapat menonaktifkan akun sendiri." }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });

  const service = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: target, error: targetError } = await service.from("profiles").select("id,school_id").eq("id", body.profileId).single();
  if (targetError || !target || target.school_id !== adminProfile.school_id) return new Response(JSON.stringify({ error: "Akun tidak ditemukan di sekolah ini." }), { status: 404, headers: { ...headers, "Content-Type": "application/json" } });

  if (body.action === "reset-password") {
    if (!body.temporaryPassword || body.temporaryPassword.length < 10) return new Response(JSON.stringify({ error: "Kata sandi sementara minimal 10 karakter." }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    const { error } = await service.auth.admin.updateUserById(target.id, { password: body.temporaryPassword, ban_duration: "none" });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    const { error: profileError } = await service.from("profiles").update({ must_change_password: true, is_active: true }).eq("id", target.id);
    if (profileError) return new Response(JSON.stringify({ error: "Kata sandi diatur, tetapi status profil gagal diperbarui." }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
  } else {
    const disabled = body.action === "deactivate";
    const { error: authUpdateError } = await service.auth.admin.updateUserById(target.id, { ban_duration: disabled ? "876000h" : "none" });
    if (authUpdateError) return new Response(JSON.stringify({ error: authUpdateError.message }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    const { error: profileError } = await service.from("profiles").update({ is_active: !disabled }).eq("id", target.id);
    if (profileError) return new Response(JSON.stringify({ error: profileError.message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ ok: true, action: body.action }), { status: 200, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" } });
});
