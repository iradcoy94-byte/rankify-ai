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
  const { data: profile } = await caller.from("profiles").select("role,school_id").eq("id", auth.user.id).single();
  if (profile?.role !== "admin") return new Response(JSON.stringify({ error: "Hanya administrator yang dapat membuat akun." }), { status: 403, headers: { ...headers, "Content-Type": "application/json" } });
  let input: { email?: string; fullName?: string; role?: string; nisn?: string; classId?: string; temporaryPassword?: string };
  try { input = await request.json(); } catch { return new Response(JSON.stringify({ error: "Format data tidak valid." }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } }); }
  const email = input.email?.trim().toLowerCase();
  const fullName = input.fullName?.trim();
  const role = input.role;
  const temporaryPassword = input.temporaryPassword;
  if (!email || !fullName || !["guru", "siswa", "admin"].includes(role ?? "") || !temporaryPassword || temporaryPassword.length < 10) return new Response(JSON.stringify({ error: "Lengkapi email, nama, peran, dan kata sandi sementara minimal 10 karakter." }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
  if (role === "siswa" && !input.nisn?.trim()) return new Response(JSON.stringify({ error: "NISN wajib untuk akun siswa." }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
  if (role !== "admin" && !input.classId) return new Response(JSON.stringify({ error: "Pilih kelas untuk akun guru/siswa." }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  if (role !== "admin") {
    const { data: targetClass, error: classError } = await admin.from("classes")
      .select("id").eq("id", input.classId!).eq("school_id", profile.school_id).maybeSingle();
    if (classError || !targetClass) return new Response(JSON.stringify({ error: "Kelas tidak ditemukan di sekolah administrator." }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
  }
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    app_metadata: { rankify_role: role, school_id: profile.school_id, must_change_password: true },
    user_metadata: { full_name: fullName, nisn: input.nisn?.trim() || null },
  });
  if (createError || !created.user) return new Response(JSON.stringify({ error: createError?.message ?? "Akun tidak dapat dibuat." }), { status: 409, headers: { ...headers, "Content-Type": "application/json" } });
  if (input.classId && role !== "admin") {
    const { error: membershipError } = await admin.from("class_memberships").insert({ class_id: input.classId, profile_id: created.user.id, member_role: role });
    if (membershipError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: `Akun dibatalkan karena gagal ditautkan ke kelas: ${membershipError.message}` }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    }
  }
  return new Response(JSON.stringify({ id: created.user.id, email, role }), { status: 201, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" } });
});
