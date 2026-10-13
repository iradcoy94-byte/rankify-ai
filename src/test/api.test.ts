
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("api — Supabase Edge Function URL", () => {
  it("builds the default tutor-chat URL", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://rankify-test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");

    vi.resetModules();

    const { api } = await import("@/services/api");

    expect(api.chatUrl()).toBe(
      "https://rankify-test.supabase.co/functions/v1/tutor-chat",
    );
  });

  it("builds the URL for a custom Edge Function", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://rankify-test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");

    vi.resetModules();

    const { api } = await import("@/services/api");

    expect(api.chatUrl("teacher-insights")).toBe(
      "https://rankify-test.supabase.co/functions/v1/teacher-insights",
    );
  });

  it("throws an error when Supabase is not configured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");

    vi.resetModules();

    const { api } = await import("@/services/api");

    expect(() => api.chatUrl()).toThrow(
      "Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  });
});