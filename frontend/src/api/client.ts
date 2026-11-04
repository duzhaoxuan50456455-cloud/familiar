import type {
  ChallengeListResponse,
  ExerciseOutputResponse,
  ExerciseType,
} from '../types'

/**
 * Base URL for all API calls.
 * Defaults to the local FastAPI dev server; override with VITE_API_BASE_URL
 * at build time for production deployments.
 */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Throw a descriptive Error on any non-2xx response. */
async function checkResponse(res: Response): Promise<void> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json() as { detail?: string }
      if (body.detail) detail += `: ${body.detail}`
    } catch {
      // ignore parse errors — the status code message is enough
    }
    throw new Error(detail)
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the ordered list of predefined challenges.
 * Expected outputs, hints, and walkthroughs are NOT included in this response —
 * they are fetched separately via fetchExerciseOutput to preserve the
 * predict-before-verify flow.
 */
export async function fetchChallenges(): Promise<ChallengeListResponse> {
  const res = await fetch(`${BASE_URL}/challenges`)
  await checkResponse(res)
  return res.json() as Promise<ChallengeListResponse>
}

/**
 * Fetch the expected output, hint, and walkthrough for one exercise.
 *
 * Note: this endpoint is unauthenticated. A learner who calls it directly
 * before predicting will see the expected output. The predict-before-verify
 * flow is enforced by the UI, not by the backend.
 */
export async function fetchExerciseOutput(
  challengeId: string,
  exerciseType: ExerciseType,
): Promise<ExerciseOutputResponse> {
  const res = await fetch(
    `${BASE_URL}/challenges/${encodeURIComponent(challengeId)}/exercises/${exerciseType}/output`,
  )
  await checkResponse(res)
  return res.json() as Promise<ExerciseOutputResponse>
}
