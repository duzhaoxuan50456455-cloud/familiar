// ---------------------------------------------------------------------------
// Domain types — shared across the whole application
// ---------------------------------------------------------------------------

export type ExerciseType = 'original' | 'mutation' | 'transfer'

export type AssistanceLevel = 'guided' | 'hint' | 'independent'

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

export interface ExerciseRecord {
  exerciseType: ExerciseType
  firstPrediction: string | null
  firstPredictionCorrect: boolean | null
  /** True if a hint or walkthrough was viewed before the first prediction was submitted. */
  assistanceViewedBeforeFirstPrediction: boolean
  /** Derived and frozen at first-submission time. */
  firstAttemptTag: 'unaided' | 'after_assistance' | null
  /** Total submissions on this exercise; only the first counts as evidence. */
  attemptCount: number
}

export interface ChallengeRecord {
  challengeId: string
  exercises: Record<ExerciseType, ExerciseRecord>
  currentExercise: ExerciseType
  completed: boolean
  /**
   * The eventIndex of the most recent downward PolicyEvent that existed at
   * the moment this challenge was marked complete, or null if none had occurred.
   * Used to determine whether this challenge falls within the current
   * consecutive evidence window for Hint → Independent transitions.
   */
  lastDownwardTransitionIndexBeforeCompletion: number | null
}

export interface PolicyEvent {
  fromLevel: AssistanceLevel
  toLevel: AssistanceLevel
  trigger: 'upward_auto' | 'downward_auto' | 'learner_request'
  policy_reason: string
  afterChallengeId: string
  eventIndex: number
}

export interface SessionState {
  challenges: ChallengeRecord[]
  currentChallengeIndex: number
  assistanceLevel: AssistanceLevel
  policyHistory: PolicyEvent[]
  sessionComplete: boolean
}

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

export interface ChallengeExerciseSummary {
  code: string
}

export interface MutationExerciseSummary extends ChallengeExerciseSummary {
  diff_line: number
  diff_description: string
}

export interface ChallengeExercises {
  original: ChallengeExerciseSummary
  mutation: MutationExerciseSummary
  transfer: ChallengeExerciseSummary
}

export interface ChallengeSummary {
  id: string
  title: string
  description: string
  concept: string
  exercises: ChallengeExercises
}

export interface ChallengeListResponse {
  challenges: ChallengeSummary[]
}

export interface ExerciseOutputResponse {
  challenge_id: string
  exercise_type: ExerciseType
  expected_output: string
  hint: string
  walkthrough: string[]
  output_source: 'precomputed' | 'executed'
}
