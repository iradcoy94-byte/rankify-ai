import type { ChatMessage, Student } from "@/lib/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost/rankify-ai/backend";

const TOKEN_KEY = "rankify_token";

export type UserRole = "guru" | "peserta_didik";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = "Request gagal";
    try {
      const data = await response.json();
      message = data.error ?? message;
    } catch {
      // ignore non-JSON errors
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function fromApiStudent(row: Student): Student {
  return {
    ...row,
    score:
      row.score === null || row.score === undefined ? NaN : Number(row.score),
    meeting:
      row.meeting === null || row.meeting === undefined
        ? undefined
        : Number(row.meeting),
    pretest:
      row.pretest === null || row.pretest === undefined
        ? undefined
        : Number(row.pretest),
    posttest:
      row.posttest === null || row.posttest === undefined
        ? undefined
        : Number(row.posttest),
  };
}

export const api = {
  baseUrl: API_BASE_URL,

  async login(email: string, password: string) {
    return request<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async me() {
    return request<{ user: AuthUser }>("/auth/me");
  },

  async logout() {
    return request<{ ok: true }>("/auth/logout", { method: "POST" });
  },

  async listStudents() {
    const data = await request<{ students: Student[] }>("/students");
    return data.students.map(fromApiStudent);
  },

  async saveStudents(students: Student[]) {
    return request<{ ok: true }>("/students", {
      method: "POST",
      body: JSON.stringify({ students }),
    });
  },

  async updateStudent(id: string, student: Student) {
    return request<{ ok: true }>(`/students/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(student),
    });
  },

  async deleteStudent(id: string) {
    return request<{ ok: true }>(`/students/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async clearStudents() {
    return request<{ ok: true }>("/students", { method: "DELETE" });
  },

  chatUrl() {
    return `${API_BASE_URL}/chat`;
  },
};

export type StreamPayload = {
  messages: ChatMessage[];
  students: Student[];
};
