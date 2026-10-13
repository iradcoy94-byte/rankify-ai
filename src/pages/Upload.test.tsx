import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Upload from "./Upload";
const { append, success, auth } = vi.hoisted(() => ({ append: vi.fn(), success: vi.fn(), auth: { isReadOnly: false } }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/context/StudentsContext", () => ({ useStudentsCtx: () => ({ appendStudents: append, stats: { total: 0 } }) }));
vi.mock("sonner", () => ({ toast: { success, warning: vi.fn() } }));
vi.mock("@/components/ExcelUploader", () => ({ ExcelUploader: ({ onStudentsParsed }: { onStudentsParsed: (rows: unknown[]) => Promise<void> }) =>
  <button onClick={() => void onStudentsParsed([{ id: "mock", name: "Andi", score: 90, rank: 1, isValid: true }])}>Mock import</button> }));
beforeEach(() => { auth.isReadOnly = false; append.mockReset(); success.mockReset(); });
afterEach(cleanup);
function mount() { render(<MemoryRouter initialEntries={["/upload"]}><Routes><Route path="/upload" element={<Upload />} /><Route path="/peringkat-keseluruhan" element={<p>Ranking destination</p>} /></Routes></MemoryRouter>); }
describe("upload confirmation", () => {
  it("keeps the form and does not announce success after failed persistence", async () => {
    append.mockResolvedValue(false); mount(); fireEvent.click(screen.getByText("Mock import"));
    await act(async () => {});
    expect(append).toHaveBeenCalledTimes(1); expect(success).not.toHaveBeenCalled();
    expect(screen.getByText("Mock import")).toBeInTheDocument(); expect(screen.queryByText("Ranking destination")).toBeNull();
  });
  it("waits for confirmation before navigating or announcing success", async () => {
    let resolve!: (value: boolean) => void;
    append.mockReturnValue(new Promise<boolean>(done => { resolve = done; })); mount();
    fireEvent.click(screen.getByText("Mock import")); expect(success).not.toHaveBeenCalled();
    expect(screen.queryByText("Ranking destination")).toBeNull();
    await act(async () => { resolve(true); });
    await waitFor(() => expect(screen.getByText("Ranking destination")).toBeInTheDocument()); expect(success).toHaveBeenCalledTimes(1);
  });
  it("redirects read-only students without offering import", async () => {
    auth.isReadOnly = true; mount();
    await waitFor(() => expect(screen.getByText("Ranking destination")).toBeInTheDocument());
    expect(screen.queryByText("Mock import")).toBeNull(); expect(append).not.toHaveBeenCalled();
  });
});
