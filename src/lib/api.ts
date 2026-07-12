import type { Save } from "./sim/types";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `API error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type SessionResponse = { sessionId: string; activeSaveId: string | null };

export const api = {
  health: () => request<{ ok: boolean; db: string }>("/health"),

  createSession: () => request<SessionResponse>("/session", { method: "POST" }),

  getSession: (sessionId: string) => request<SessionResponse>(`/session/${sessionId}`),

  setActiveSave: (sessionId: string, activeSaveId: string | null) =>
    request<SessionResponse>(`/session/${sessionId}/active-save`, {
      method: "PATCH",
      body: JSON.stringify({ activeSaveId }),
    }),

  listSaves: (sessionId: string) => request<Save[]>(`/saves/session/${sessionId}`),

  createSave: (sessionId: string, save: Save) =>
    request<Save>(`/saves/session/${sessionId}`, {
      method: "POST",
      body: JSON.stringify(save),
    }),

  updateSave: (save: Save) =>
    request<Save>(`/saves/${save.id}`, {
      method: "PUT",
      body: JSON.stringify(save),
    }),

  deleteSave: (id: string) =>
    request<void>(`/saves/${id}`, { method: "DELETE" }),

  getClubs: (league?: string, tier?: number) =>
    request<any[]>("/clubs" + (league ? `?league=${league}` : "") + (tier ? `&tier=${tier}` : "")),

  getClub: (id: string) => request<any>(`/clubs/${id}`),
};

const SESSION_KEY = "fcs-session-id";
const USER_KEY = "fcs-user-id";
const USERNAME_KEY = "fcs-username";

export function getStoredSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setStoredSessionId(id: string) {
  localStorage.setItem(SESSION_KEY, id);
}

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_KEY);
}

export function setStoredUserId(id: string) {
  localStorage.setItem(USER_KEY, id);
}

export function getStoredUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USERNAME_KEY);
}

export function setStoredUsername(username: string) {
  localStorage.setItem(USERNAME_KEY, username);
}

export function clearAuth() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

export async function ensureSession(): Promise<SessionResponse> {
  const existing = getStoredSessionId();
  if (existing) {
    try {
      return await api.getSession(existing);
    } catch {
      clearAuth();
    }
  }
  const session = await api.createSession();
  setStoredSessionId(session.sessionId);
  return session;
}
