/**
 * Domain types for Rankify.AI
 * Kept in one place so UI, services, and hooks share the same shape.
 */

export interface Student {
  /** Stable client-side id for React keys & edits */
  id: string;
  /** Student name (editable) */
  name: string;
  /** Score 0–100 (editable). Stored as number; NaN means empty. */
  score: number;
  /** Dense rank, computed (1,1,2,3...) */
  rank: number;
  /** Result of validation pass */
  isValid: boolean;
  /** Human readable error if not valid */
  error?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
