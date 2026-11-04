import { describe, expect, it } from 'vitest'
import { sessionReducer } from './SessionContext'
import type { ChallengeSummary, SessionState } from '../types'

const summaries: ChallengeSummary[] = [{
  id: 'loops_01',
  title: 'Loops',
  description: 'A loop.',
  concept: 'loops',
  exercises: {
    original: { code: 'print(1)' },
    mutation: { code: 'print(2)', diff_line: 0, diff_description: 'Changed value.' },
    transfer: { code: 'print(3)' },
  },
}, {
  id: 'loops_02',
  title: 'More loops',
  description: 'Another loop.',
  concept: 'loops',
  exercises: {
    original: { code: 'print(4)' },
    mutation: { code: 'print(5)', diff_line: 0, diff_description: 'Changed value.' },
    transfer: { code: 'print(6)' },
  },
}]

function initialState(): SessionState {
  return sessionReducer(
    { challenges: [], currentChallengeIndex: 0, assistanceLevel: 'guided', policyHistory: [], sessionComplete: false },
    { type: 'LOAD_CHALLENGES', challenges: summaries },
  )
}

describe('sessionReducer evidence tracking', () => {
  it('initializes a session at Guided', () => {
    expect(initialState().assistanceLevel).toBe('guided')
  })
  it('records a first-attempt correct prediction as unaided evidence', () => {
    const state = sessionReducer(initialState(), {
      type: 'SUBMIT_PREDICTION', challengeIndex: 0, exerciseType: 'original', prediction: '1', correct: true,
    })
    expect(state.challenges[0].exercises.original).toMatchObject({
      firstPrediction: '1', firstPredictionCorrect: true, firstAttemptTag: 'unaided', attemptCount: 1,
    })
  })

  it('records an incorrect first attempt without treating it as later correctness', () => {
    const state = sessionReducer(initialState(), {
      type: 'SUBMIT_PREDICTION', challengeIndex: 0, exerciseType: 'original', prediction: 'wrong', correct: false,
    })
    expect(state.challenges[0].exercises.original.firstPredictionCorrect).toBe(false)
  })

  it('keeps the incorrect first attempt when a retry is correct', () => {
    let state = sessionReducer(initialState(), {
      type: 'SUBMIT_PREDICTION', challengeIndex: 0, exerciseType: 'original', prediction: 'wrong', correct: false,
    })
    state = sessionReducer(state, {
      type: 'SUBMIT_PREDICTION', challengeIndex: 0, exerciseType: 'original', prediction: 'right', correct: true,
    })
    expect(state.challenges[0].exercises.original).toMatchObject({
      firstPrediction: 'wrong', firstPredictionCorrect: false, firstAttemptTag: 'unaided', attemptCount: 2,
    })
  })

  it('tags a first submission after assistance as after_assistance', () => {
    let state = sessionReducer(initialState(), {
      type: 'VIEW_ASSISTANCE', challengeIndex: 0, exerciseType: 'original',
    })
    state = sessionReducer(state, {
      type: 'SUBMIT_PREDICTION', challengeIndex: 0, exerciseType: 'original', prediction: '1', correct: true,
    })
    expect(state.challenges[0].exercises.original).toMatchObject({
      assistanceViewedBeforeFirstPrediction: true, firstAttemptTag: 'after_assistance',
    })
    expect(state.assistanceLevel).toBe('guided')
  })

  it('does not let repeat submissions overwrite frozen first-attempt evidence', () => {
    let state = sessionReducer(initialState(), {
      type: 'SUBMIT_PREDICTION', challengeIndex: 0, exerciseType: 'original', prediction: 'first', correct: true,
    })
    state = sessionReducer(state, {
      type: 'VIEW_ASSISTANCE', challengeIndex: 0, exerciseType: 'original',
    })
    state = sessionReducer(state, {
      type: 'SUBMIT_PREDICTION', challengeIndex: 0, exerciseType: 'original', prediction: 'second', correct: false,
    })
    expect(state.challenges[0].exercises.original).toMatchObject({
      firstPrediction: 'first', firstPredictionCorrect: true,
      assistanceViewedBeforeFirstPrediction: false, firstAttemptTag: 'unaided', attemptCount: 2,
    })
  })

  it('preserves evidence for one challenge while another challenge is active', () => {
    let state = sessionReducer(initialState(), {
      type: 'SUBMIT_PREDICTION', challengeIndex: 0, exerciseType: 'original', prediction: '1', correct: true,
    })
    state = sessionReducer(state, {
      type: 'SUBMIT_PREDICTION', challengeIndex: 1, exerciseType: 'original', prediction: 'wrong', correct: false,
    })
    expect(state.challenges[0].exercises.original.firstPrediction).toBe('1')
    expect(state.challenges[1].exercises.original.firstPrediction).toBe('wrong')
  })

  it('records indexed policy events without changing historical evidence', () => {
    const state = sessionReducer(initialState(), {
      type: 'RECORD_POLICY_EVENT',
      event: {
        fromLevel: 'guided',
        toLevel: 'hint',
        trigger: 'upward_auto',
        policy_reason: 'Two correct unaided predictions.',
        afterChallengeId: 'loops_01',
      },
    })
    expect(state.assistanceLevel).toBe('hint')
    expect(state.policyHistory[0]).toMatchObject({ eventIndex: 0, policy_reason: 'Two correct unaided predictions.' })
    expect(state.challenges[0].exercises.original.firstPrediction).toBeNull()
  })
})
