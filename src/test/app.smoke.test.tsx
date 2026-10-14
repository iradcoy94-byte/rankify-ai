import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import App from "@/App";

describe("application startup", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    vi.resetModules();
  });

  it("renders the login screen and role cards when Supabase is configured", async () => {
    render(<App />);
    expect(await screen.findByText(/Selamat datang di/i)).toBeInTheDocument();
    expect(screen.getByText("Masuk sebagai Guru")).toBeInTheDocument();
    expect(screen.getByText("Masuk sebagai Peserta Didik")).toBeInTheDocument();
    expect(screen.getByText("Masuk sebagai Administrator")).toBeInTheDocument();
  });

  it("renders the alert banner when Supabase is not configured", async () => {
    vi.doMock("@/integrations/supabase/client", async () => {
      const actual = await vi.importActual<typeof import("@/integrations/supabase/client")>(
        "@/integrations/supabase/client"
      );
      return {
        ...actual,
        isSupabaseConfigured: false,
      };
    });

    const { default: DynamicApp } = await import("@/App");
    render(<DynamicApp />);
    expect(await screen.findByText(/Selamat datang di/i)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Supabase belum dikonfigurasi");
  });
});

