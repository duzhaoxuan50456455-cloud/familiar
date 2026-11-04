/**
 * SessionContext — global session state for the Familiar learning session.
 *
 * Milestone 3: records the immutable first-attempt evidence for each exercise.
 * Assistance policy events remain a later milestone.
 */

import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react'

import type {
  AssistanceLevel,
  ChallengeRecord,
  ChallengeSummary,
  ExerciseType,
  PolicyEvent,
  SessionState,
} from '../types'

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type SessionAction =
  | { type: 'LOAD_CHALLENGES'; challenges: ChallengeSummary[] }
  | {
      type: 'SUBMIT_PREDICTION'
      challengeIndex: number
      exerciseType: ExerciseType
      prediction: string
      correct: boolean
    }
  | { type: 'VIEW_ASSISTANCE'; challengeIndex: number; exerciseType: ExerciseType }
  | { type: 'COMPLETE_CHALLENGE'; challengeIndex: number }
  | { type: 'ADVANCE_TO_NEXT_EXERCISE'; challengeIndex: number }
  | { type: 'RECORD_POLICY_EVENT'; event: Omit<PolicyEvent, 'eventIndex'> }

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: SessionState = {
  challenges: [],
  currentChallengeIndex: 0,
  assistanceLevel: 'guided' as AssistanceLevel,
  policyHistory: [],
  sessionComplete: false,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExerciseRecord(exerciseType: ExerciseType) {
  return {
    exerciseType,
    firstPrediction: null,
    firstPredictionCorrect: null,
    assistanceViewedBeforeFirstPrediction: false,
    firstAttemptTag: null,
    attemptCount: 0,
  }
}

function challengeSummaryToRecord(summary: ChallengeSummary): ChallengeRecord {
  return {
    challengeId: summary.id,
    currentExercise: 'original' as ExerciseType,
    completed: false,
    lastDownwardTransitionIndexBeforeCompletion: null,
    exercises: {
      original: makeExerciseRecord('original'),
      mutation: makeExerciseRecord('mutation'),
      transfer: makeExerciseRecord('transfer'),
    },
  }
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function updateChallenge(
  state: SessionState,
  challengeIndex: number,
  update: (challenge: ChallengeRecord) => ChallengeRecord,
): SessionState {
  const challenge = state.challenges[challengeIndex]
  if (!challenge) return state

  const challenges = [...state.challenges]
  challenges[challengeIndex] = update(challenge)
  return { ...state, challenges }
}

function latestDownwardEventIndex(state: SessionState): number | null {
  for (let index = state.policyHistory.length - 1; index >= 0; index -= 1) {
    const event = state.policyHistory[index]
    if (event.trigger === 'downward_auto' || event.trigger === 'learner_request') {
      return event.eventIndex
    }
  }
  return null
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'LOAD_CHALLENGES':
      return {
        ...state,
        challenges: action.challenges.map(challengeSummaryToRecord),
      }

    case 'SUBMIT_PREDICTION':
      return updateChallenge(state, action.challengeIndex, (challenge) => {
        const exercise = challenge.exercises[action.exerciseType]
        const updatedExercise = exercise.firstPrediction === null
          ? {
              ...exercise,
              firstPrediction: action.prediction,
              firstPredictionCorrect: action.correct,
              firstAttemptTag: exercise.assistanceViewedBeforeFirstPrediction
                ? 'after_assistance' as const
                : 'unaided' as const,
              attemptCount: 1,
            }
          : { ...exercise, attemptCount: exercise.attemptCount + 1 }

        return {
          ...challenge,
          exercises: { ...challenge.exercises, [action.exerciseType]: updatedExercise },
        }
      })

    case 'VIEW_ASSISTANCE':
      return updateChallenge(state, action.challengeIndex, (challenge) => {
        const exercise = challenge.exercises[action.exerciseType]
        if (exercise.firstPrediction !== null || exercise.assistanceViewedBeforeFirstPrediction) {
          return challenge
        }

        return {
          ...challenge,
          exercises: {
            ...challenge.exercises,
            [action.exerciseType]: { ...exercise, assistanceViewedBeforeFirstPrediction: true },
          },
        }
      })

    case 'ADVANCE_TO_NEXT_EXERCISE':
      return updateChallenge(state, action.challengeIndex, (challenge) => {
        if (challenge.completed) return challenge
        const nextExercise: Record<ExerciseType, ExerciseType> = {
          original: 'mutation',
          mutation: 'transfer',
          transfer: 'transfer',
        }
        if (challenge.currentExercise === 'transfer') return challenge
        return { ...challenge, currentExercise: nextExercise[challenge.currentExercise] }
      })

    case 'COMPLETE_CHALLENGE':
      return updateChallenge(state, action.challengeIndex, (challenge) => {
        // Completion is idempotent: its policy-window snapshot cannot be altered later.
        if (challenge.completed) return challenge
        return {
          ...challenge,
          completed: true,
          lastDownwardTransitionIndexBeforeCompletion: latestDownwardEventIndex(state),
        }
      })

    case 'RECORD_POLICY_EVENT': {
      const event = { ...action.event, eventIndex: state.policyHistory.length }
      return {
        ...state,
        assistanceLevel: event.toLevel,
        policyHistory: [...state.policyHistory, event],
      }
    }

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface SessionContextValue {
  state: SessionState
  dispatch: Dispatch<SessionAction>
  /** The ChallengeSummary list as loaded from the API (parallel to state.challenges). */
  challengeSummaries: ChallengeSummary[]
}

const SessionContext = createContext<SessionContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface SessionProviderProps {
  children: ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [state, dispatch] = useReducer(sessionReducer, initialState)

  // Keep the raw API summaries available to components that need code/description
  // without reaching into the reducer-shaped ChallengeRecord state.
  const [challengeSummaries, setChallengeSummaries] = useState<ChallengeSummary[]>([])

  // wrappedDispatch is memoized with useCallback so its reference is stable
  // between renders. Without this, any component that lists `dispatch` as a
  // useEffect dependency would re-run its effect on every provider render,
  // causing a fetch loop.
  const wrappedDispatch = useCallback<Dispatch<SessionAction>>((action) => {
    if (action.type === 'LOAD_CHALLENGES') {
      setChallengeSummaries(action.challenges)
    }
    dispatch(action)
  }, []) // dispatch from useReducer is already stable; no deps needed

  return (
    <SessionContext.Provider value={{ state, dispatch: wrappedDispatch, challengeSummaries }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>')
  return ctx
}

