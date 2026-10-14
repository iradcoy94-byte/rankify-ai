import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Administration from "@/pages/Administration";

const { toastSuccess, toastError, mockUpdate, mockFrom } = vi.hoisted(() => {
  const updateFn = vi.fn();
  return {
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    mockUpdate: updateFn,
    mockFrom: vi.fn(),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      schoolId: "school-123",
      role: "admin",
      name: "Admin Sekolah",
      email: "admin@sekolah.id",
    },
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      mockFrom(table);
      if (table === "classes") {
        return {
          select: () => ({
            order: vi.fn().mockResolvedValue({ data: [{ id: "c1", name: "Kelas X-A" }], error: null }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      if (table === "schools") {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({
                data: { default_kkm: 70, ai_tutor_style: "socratic" },
                error: null,
              }),
            }),
          }),
          update: mockUpdate.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ single: vi.fn() }) }) };
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

describe("Administration — AI Pedagogical Policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it("merender kartu Pedagogi Tutor AI dengan opsi bawaan", async () => {
    render(<Administration />);

    await waitFor(() => {
      expect(screen.getByText("Pedagogi Tutor AI")).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Pilih gaya pedagogi AI") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("socratic");
  });

  it("memungkinkan pengubahan dan penyimpanan kebijakan pedagogi ke Supabase", async () => {
    render(<Administration />);

    await waitFor(() => {
      expect(screen.getByLabelText("Pilih gaya pedagogi AI")).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Pilih gaya pedagogi AI") as HTMLSelectElement;

    // Ganti ke direct_steps
    fireEvent.change(select, { target: { value: "direct_steps" } });
    expect(select.value).toBe("direct_steps");

    // Simpan kebijakan
    const saveButton = screen.getByRole("button", { name: "Simpan Pedagogi" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ ai_tutor_style: "direct_steps" });
      expect(toastSuccess).toHaveBeenCalledWith("Kebijakan pedagogi AI sekolah diperbarui.");
    });
  });
});
