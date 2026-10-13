import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/App";

describe("application startup", () => {
  it("renders the public login screen without a configured Supabase project", async () => {
    window.history.replaceState({}, "", "/");
    render(<App />);
    expect(await screen.findByText(/Selamat datang di/i)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Supabase belum dikonfigurasi");
  });
});
