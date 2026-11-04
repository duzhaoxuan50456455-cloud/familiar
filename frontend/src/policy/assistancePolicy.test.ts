import { describe, expect, it } from 'vitest'
import { evaluatePolicy } from './assistancePolicy'
import type { ChallengeRecord, ExerciseRecord, ExerciseType, PolicyEvent } from '../types'

const exerciseTypes: ExerciseType[] = ['original', 'mutation', 'transfer']

function exercise(correct: boolean, tag: ExerciseRecord['firstAttemptTag'] = 'unaided'): ExerciseRecord {
  return {
    exerciseType: 'original',
    firstPrediction: correct ? 'right' : 'wrong',
    firstPredictionCorrect: correct,
    assistanceViewedBeforeFirstPrediction: tag === 'after_assistance',
    firstAttemptTag: tag,
    attemptCount: 1,
  }
}

function challenge(
  challengeId: string,
  outcomes: [boolean, boolean, boolean],
  tags: [ExerciseRecord['firstAttemptTag'], ExerciseRecord['firstAttemptTag'], ExerciseRecord['firstAttemptTag']] = ['unaided', 'unaided', 'unaided'],
  lastDownwardTransitionIndexBeforeCompletion: number | null = null,
): ChallengeRecord {
  const exercises = Object.fromEntries(exerciseTypes.map((type, index) => [
    type,
    { ...exercise(outcomes[index], tags[index]), exerciseType: type },
  ])) as Record<ExerciseType, ExerciseRecord>
  return {
    challengeId,
    exercises,
    currentExercise: 'transfer',
    completed: true,
    lastDownwardTransitionIndexBeforeCompletion,
  }
}

function event(
  afterChallengeId: string,
  fromLevel: PolicyEvent['fromLevel'],
  toLevel: PolicyEvent['toLevel'],
  trigger: PolicyEvent['trigger'],
  eventIndex: number,
): PolicyEvent {
  return { afterChallengeId, fromLevel, toLevel, trigger, eventIndex, policy_reason: 'A valid reason.' }
}

describe('evaluatePolicy', () => {
  it('starts a session at Guided through the session-state default', () => {
    expect(evaluatePolicy('guided', [], [], 'challenge_completed').newLevel).toBe('guided')
  })

  it('promotes Guided to Hint for two unaided first-attempt correct exercises', () => {
    const decision = evaluatePolicy('guided', [challenge('loops_01', [true, true, false])], [], 'challenge_completed')
    expect(decision).toMatchObject({ newLevel: 'hint', changed: true })
    expect(decision.policy_reason).not.toBe('')
  })

  it('does not promote Guided with only one unaided correct exercise', () => {
    expect(evaluatePolicy('guided', [challenge('loops_01', [true, false, false])], [], 'challenge_completed'))
      .toMatchObject({ newLevel: 'guided', changed: false })
  })

  it('promotes Hint to Independent after two consecutive qualifying Hint-mode challenges', () => {
    const challenges = [
      challenge('loops_01', [true, false, false]),
      challenge('loops_02', [true, true, true]),
      challenge('loops_03', [true, true, true]),
    ]
    const history = [event('loops_01', 'guided', 'hint', 'upward_auto', 0)]
    expect(evaluatePolicy('hint', challenges, history, 'challenge_completed'))
      .toMatchObject({ newLevel: 'independent', changed: true })
  })

  it('does not promote Hint after only one qualifying Hint-mode challenge', () => {
    const challenges = [
      challenge('loops_01', [true, false, false]),
      challenge('loops_02', [true, true, true]),
    ]
    const history = [event('loops_01', 'guided', 'hint', 'upward_auto', 0)]
    expect(evaluatePolicy('hint', challenges, history, 'challenge_completed'))
      .toMatchObject({ newLevel: 'hint', changed: false })
  })

  it('does not count a Hint challenge whose level changed manually during it', () => {
    const challenges = [
      challenge('loops_01', [true, false, false]),
      challenge('loops_02', [true, true, true]),
      challenge('loops_03', [true, true, true]),
    ]
    const history = [
      event('loops_01', 'guided', 'hint', 'upward_auto', 0),
      event('loops_02', 'hint', 'guided', 'learner_request', 1),
      event('loops_02', 'guided', 'hint', 'learner_request', 2),
    ]
    expect(evaluatePolicy('hint', challenges, history, 'challenge_completed'))
      .toMatchObject({ newLevel: 'hint', changed: false })
  })

  it('automatically steps down exactly one level after three unaided incorrect attempts', () => {
    const decision = evaluatePolicy('independent', [challenge('loops_03', [false, false, false])], [], 'challenge_completed')
    expect(decision).toMatchObject({ newLevel: 'hint', changed: true })
    expect(decision.policy_reason).not.toBe('')
  })

  it('does not auto-downgrade when any first attempt was after assistance', () => {
    const decision = evaluatePolicy(
      'hint',
      [challenge('loops_03', [false, false, false], ['unaided', 'after_assistance', 'unaided'])],
      [],
      'challenge_completed',
    )
    expect(decision).toMatchObject({ newLevel: 'hint', changed: false })
  })

  it('steps down manually without re-evaluating historical evidence', () => {
    const decision = evaluatePolicy('hint', [challenge('loops_01', [true, true, true])], [], 'learner_request_more_help')
    expect(decision).toEqual({
      newLevel: 'guided', changed: true, policy_reason: 'Learner requested more support.',
    })
  })

  it('does not change the persistent level for a temporary exercise hint', () => {
    const decision = evaluatePolicy('hint', [], [], 'challenge_completed')
    expect(decision).toMatchObject({ newLevel: 'hint', changed: false })
  })

  it('does not inflate evidence from repeated predictions', () => {
    const repeated = challenge('loops_01', [true, false, false])
    repeated.exercises.mutation.attemptCount = 2
    expect(evaluatePolicy('guided', [repeated], [], 'challenge_completed'))
      .toMatchObject({ newLevel: 'guided', changed: false })
  })

  it('cannot transition without a completed challenge, as after a network failure', () => {
    const incomplete = challenge('loops_01', [true, true, true])
    incomplete.completed = false
    incomplete.exercises.transfer.firstPrediction = null
    incomplete.exercises.transfer.firstPredictionCorrect = null
    incomplete.exercises.transfer.firstAttemptTag = null
    expect(evaluatePolicy('guided', [incomplete], [], 'challenge_completed'))
      .toMatchObject({ newLevel: 'guided', changed: false })
  })

  it('resets the Independent evidence window after a downward transition', () => {
    const challenges = [
      challenge('loops_01', [true, true, true], ['unaided', 'unaided', 'unaided'], null),
      challenge('loops_02', [true, true, true], ['unaided', 'unaided', 'unaided'], 1),
      challenge('loops_03', [true, true, true], ['unaided', 'unaided', 'unaided'], 1),
    ]
    const history = [
      event('before', 'guided', 'hint', 'upward_auto', 0),
      event('loops_01', 'hint', 'guided', 'downward_auto', 1),
      event('loops_01', 'guided', 'hint', 'upward_auto', 2),
    ]
    expect(evaluatePolicy('hint', challenges, history, 'challenge_completed'))
      .toMatchObject({ newLevel: 'independent', changed: true })
  })

  it('does not carry a Hint success across a manual downgrade boundary', () => {
    const challenges = [
      // Guided → Hint
      challenge('loops_01', [true, true, false]),
      // First qualifying Hint-mode success before the manual downgrade.
      challenge('loops_02', [true, true, true]),
      // Guided → Hint again after requesting more help.
      challenge('loops_03', [true, true, false], ['unaided', 'unaided', 'unaided'], 1),
      // First qualifying Hint-mode success in the new window.
      challenge('loops_04', [true, true, true], ['unaided', 'unaided', 'unaided'], 1),
    ]
    const history = [
      event('loops_01', 'guided', 'hint', 'upward_auto', 0),
      event('loops_02', 'hint', 'guided', 'learner_request', 1),
      event('loops_03', 'guided', 'hint', 'upward_auto', 2),
    ]

    expect(evaluatePolicy('hint', challenges, history, 'challenge_completed'))
      .toMatchObject({ newLevel: 'hint', changed: false })
  })

  it('does not carry a Hint success across an automatic downgrade boundary', () => {
    const challenges = [
      // Guided → Hint, followed by a qualifying Hint-mode success.
      challenge('loops_01', [true, true, false]),
      challenge('loops_02', [true, true, true]),
      // Hint → Guided automatic downgrade.
      challenge('loops_03', [false, false, false]),
      // Guided → Hint again, then one new Hint-mode success.
      challenge('loops_04', [true, true, false], ['unaided', 'unaided', 'unaided'], 1),
      challenge('loops_05', [true, true, true], ['unaided', 'unaided', 'unaided'], 1),
    ]
    const history = [
      event('loops_01', 'guided', 'hint', 'upward_auto', 0),
      event('loops_03', 'hint', 'guided', 'downward_auto', 1),
      event('loops_04', 'guided', 'hint', 'upward_auto', 2),
    ]

    expect(evaluatePolicy('hint', challenges, history, 'challenge_completed'))
      .toMatchObject({ newLevel: 'hint', changed: false })
  })
})
