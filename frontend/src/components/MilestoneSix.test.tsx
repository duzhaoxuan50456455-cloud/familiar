import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GhostCompanion } from './GhostCompanion'
import { ProgressReport } from './ProgressReport'
import type { ChallengeRecord, ChallengeSummary, SessionState } from '../types'

const summary: ChallengeSummary = {
  id: 'loops_01', title: 'Counting', description: 'A loop.', concept: 'loops',
  exercises: {
    original: { code: 'print(1)' },
    mutation: { code: 'print(2)', diff_line: 0, diff_description: 'Changed.' },
    transfer: { code: 'print(3)' },
  },
}

const record: ChallengeRecord = {
  challengeId: 'loops_01', currentExercise: 'transfer', completed: true, lastDownwardTransitionIndexBeforeCompletion: null,
  exercises: {
    original: { exerciseType: 'original', firstPrediction: '1', firstPredictionCorrect: true, assistanceViewedBeforeFirstPrediction: false, firstAttemptTag: 'unaided', attemptCount: 1 },
    mutation: { exerciseType: 'mutation', firstPrediction: 'wrong', firstPredictionCorrect: false, assistanceViewedBeforeFirstPrediction: true, firstAttemptTag: 'after_assistance', attemptCount: 1 },
    transfer: { exerciseType: 'transfer', firstPrediction: null, firstPredictionCorrect: null, assistanceViewedBeforeFirstPrediction: false, firstAttemptTag: null, attemptCount: 0 },
  },
}

describe('Milestone 6 components', () => {
  it('changes ghost visibility classes with the assistance level', () => {
    const { container, rerender } = render(<GhostCompanion assistanceLevel="guided" reactionEvent="idle" message="Hi" />)
    expect(container.querySelector('.ghost-guided')).toBeTruthy()
    rerender(<GhostCompanion assistanceLevel="hint" reactionEvent="thinking" message="Hi" />)
    expect(container.querySelector('.ghost-hint.ghost-expression-thinking')).toBeTruthy()
    rerender(<GhostCompanion assistanceLevel="independent" reactionEvent="happy" message="Hi" />)
    expect(container.querySelector('.ghost-independent.ghost-expression-happy')).toBeTruthy()
  })

  it('maps every learner-facing expression and keeps direct interaction local', () => {
    const { container, rerender } = render(<GhostCompanion assistanceLevel="guided" reactionEvent="idle" message="Stay curious." />)
    for (const expression of ['thinking', 'happy', 'oops', 'encouraging', 'celebrating'] as const) {
      rerender(<GhostCompanion assistanceLevel="guided" reactionEvent={expression} message="Stay curious." />)
      expect(container.querySelector(`.ghost-expression-${expression}`)).toBeTruthy()
    }
    const control = container.querySelector('.ghost-control')
    if (!control) throw new Error('Ghost control is missing')
    fireEvent.pointerEnter(control)
    expect(container.querySelector('.ghost-hovered')).toBeTruthy()
    fireEvent.click(control)
    expect(screen.getByText('Boo! I’m right here with you.')).toBeTruthy()
  })

  it('reports independent and assisted first-attempt evidence separately without inventing partial results', () => {
    const state: SessionState = {
      challenges: [record], currentChallengeIndex: 0, assistanceLevel: 'hint', sessionComplete: true,
      policyHistory: [{ fromLevel: 'guided', toLevel: 'hint', trigger: 'upward_auto', policy_reason: 'Two unaided correct exercises.', afterChallengeId: 'loops_01', eventIndex: 0 }],
    }
    render(<ProgressReport state={state} challenges={[summary]} />)
    expect(screen.getByText((_, element) => element?.textContent === '2 exercises attempted')).toBeTruthy()
    expect(screen.getByText((_, element) => element?.textContent === '1 unaided first-attempt correct')).toBeTruthy()
    expect(screen.getByText((_, element) => element?.textContent === '1 first attempts after assistance')).toBeTruthy()
    expect(screen.getByText('Not attempted')).toBeTruthy()
    expect(screen.getByText(/Two unaided correct exercises/)).toBeTruthy()
  })
})
