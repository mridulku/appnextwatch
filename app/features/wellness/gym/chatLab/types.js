/**
 * Chat Lab type-shape docs (JSDoc only, no runtime logic).
 *
 * ChatLabIssue:
 * - type: string
 * - message: string
 * - raw_name?: string
 * - candidate_names?: string[]
 *
 * ChatLabParsedExercise:
 * - raw_name: string
 * - resolved_exercise_id: string | null
 * - resolved_name: string | null
 * - sets: Array<{ reps: number | null, weight_kg: number | null }>
 *
 * ChatLabParsedAction:
 * - intent: 'create_session'
 * - confidence: number
 * - session: {
 *   title: string
 *   why_note: string | null
 *   exercise_requests: ChatLabParsedExercise[]
 * }
 * - issues: ChatLabIssue[]
 */

export const CHAT_LAB_INTENT = 'create_session';
export const CHAT_LAB_STATES = {
  NEEDS_CLARIFICATION: 'needs_clarification',
  READY_TO_EXECUTE: 'ready_to_execute',
  EXECUTED: 'executed',
  FAILED: 'failed',
};

export const DEFAULT_SET_TEMPLATE = [
  { reps: 10, weight_kg: null },
  { reps: 10, weight_kg: null },
  { reps: 10, weight_kg: null },
];
