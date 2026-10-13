/**
 * Domain types for Rankify.AI
 * Kept in one place so UI, services, and hooks share the same shape.
 */

/** Three learning models compared in the research/study. */
export type LearningModel =
  | "Co-op Co-op + AI"
  | "Co-op Co-op"
  | "Konvensional";

export const LEARNING_MODELS: LearningModel[] = [
  "Co-op Co-op + AI",
  "Co-op Co-op",
  "Konvensional",
];

/** Preset experiment classes used in the research. */
export const EXPERIMENT_CLASSES: { label: string; model: LearningModel }[] = [
  { label: "Kelas Eksperimen 1", model: "Co-op Co-op + AI" },
  { label: "Kelas Eksperimen 2", model: "Co-op Co-op" },
  { label: "Kelas Konvensional", model: "Konvensional" },
];

/** Discriminates the kind of score row. */
export type ScoreKind = "pretest" | "posttest" | "meeting";

export interface Student {
  /** Stable client-side id for React keys & edits */
  id: string;
  /** Auth-backed student profile id (not present on unreviewed OCR rows). */
  studentId?: string;
  /** National student identifier used for import matching. */
  nisn?: string;
  /** Supabase class and research period ids when persisted. */
  classId?: string;
  periodId?: string;
  /** Student name (editable) */
  name: string;
  /** Score 0–100 (editable). Stored as number; NaN means empty. */
  score: number;
  /** Class label like "XII IPA 1" — optional, editable, used for filtering */
  className?: string;
  /** Meeting / pertemuan number (1..N). Defaults to 1 when not specified. */
  meeting?: number;
  /** Learning model used for this score row. */
  model?: LearningModel;
  /** Optional pretest score (0..100) — analysed in pretest vs posttest charts */
  pretest?: number;
  /** Optional posttest score (0..100) */
  posttest?: number;
  /** What kind of score this row represents. Default: "meeting". */
  kind?: ScoreKind;
  /** Dense rank, computed per class (1,1,2,3...) */
  rank: number;
  /** Result of validation pass */
  isValid: boolean;
  /** Human readable error if not valid */
  error?: string;
}

export type ChatMessageContent =
  | string
  | (
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    )[];

export interface ChatMessage {
  role: "user" | "assistant";
  content: ChatMessageContent;
}
