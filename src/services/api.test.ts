
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("api — Supabase Edge Function URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns the default tutor-chat URL", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://rankify-test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");

    vi.resetModules();

    const { api } = await import("@/services/api");

    expect(api.chatUrl()).toBe(
      "https://rankify-test.supabase.co/functions/v1/tutor-chat",
    );
  });

  it("returns the teacher-insights URL when requested", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://rankify-test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");

    vi.resetModules();

    const { api } = await import("@/services/api");

    expect(api.chatUrl("teacher-insights")).toBe(
      "https://rankify-test.supabase.co/functions/v1/teacher-insights",
    );
  });

  it("throws when Supabase configuration is missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");

    vi.resetModules();

    const { api } = await import("@/services/api");

    expect(() => api.chatUrl()).toThrow(
      "Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  });
});