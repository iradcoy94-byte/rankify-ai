import { createContext, useContext, ReactNode } from "react";
import { useStudents } from "@/hooks/useStudents";

/**
 * StudentsContext — share the single useStudents instance across all routes
 * so navigating between pages preserves data and ranking.
 */
type StudentsCtx = ReturnType<typeof useStudents>;

const Ctx = createContext<StudentsCtx | null>(null);

export function StudentsProvider({ children }: { children: ReactNode }) {
  const value = useStudents();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudentsCtx() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStudentsCtx must be used within StudentsProvider");
  return v;
}
