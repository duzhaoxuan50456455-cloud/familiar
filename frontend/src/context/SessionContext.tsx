/**
 * SessionContext — global session state for the Familiar learning session.
 *
 * Milestone 2 stub: only LOAD_CHALLENGES is implemented.
 * Evidence tracking actions (SUBMIT_PREDICTION, VIEW_ASSISTANCE, etc.) are
 * added in Milestone 3. Policy events are added in Milestone 4.
 */

import React, {
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
  SessionState,
} from '../types'

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type SessionAction =
  | { type: 'LOAD_CHALLENGES'; challenges: ChallengeSummary[] }

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

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'LOAD_CHALLENGES':
      return {
        ...state,
        challenges: action.challenges.map(challengeSummaryToRecord),
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

// Suppress the unused-import warning: React is used implicitly via JSX transform
// and explicitly for the React.* namespace if needed in future.
void React
