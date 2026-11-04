import type { AssistanceLevel, ChallengeRecord, PolicyEvent } from '../types'

export type PolicyTrigger = 'challenge_completed' | 'learner_request_more_help'

export interface PolicyDecision {
  newLevel: AssistanceLevel
  policy_reason: string
  changed: boolean
}

const exerciseTypes = ['original', 'mutation', 'transfer'] as const

const unchanged = (level: AssistanceLevel): PolicyDecision => ({
  newLevel: level,
  policy_reason: '',
  changed: false,
})

function allExercisesAttempted(challenge: ChallengeRecord): boolean {
  return exerciseTypes.every((type) => challenge.exercises[type].firstPrediction !== null)
}

function unaidedCorrectCount(challenge: ChallengeRecord): number {
  return exerciseTypes.filter((type) => {
    const exercise = challenge.exercises[type]
    return exercise.firstAttemptTag === 'unaided' && exercise.firstPredictionCorrect === true
  }).length
}

function isAllUnaidedCorrect(challenge: ChallengeRecord): boolean {
  return allExercisesAttempted(challenge) && unaidedCorrectCount(challenge) === exerciseTypes.length
}

function isAllUnaidedIncorrect(challenge: ChallengeRecord): boolean {
  return allExercisesAttempted(challenge) && exerciseTypes.every((type) => {
    const exercise = challenge.exercises[type]
    return exercise.firstAttemptTag === 'unaided' && exercise.firstPredictionCorrect === false
  })
}

function latestDownwardEventIndex(policyHistory: PolicyEvent[]): number | null {
  for (let index = policyHistory.length - 1; index >= 0; index -= 1) {
    const event = policyHistory[index]
    if (event.trigger === 'downward_auto' || event.trigger === 'learner_request') {
      return event.eventIndex
    }
  }
  return null
}

function levelAtChallengeStart(
  challenge: ChallengeRecord,
  completedChallenges: ChallengeRecord[],
  policyHistory: PolicyEvent[],
): AssistanceLevel {
  const challengeIndex = completedChallenges.findIndex((item) => item.challengeId === challenge.challengeId)
  let level: AssistanceLevel = 'guided'

  for (const event of policyHistory) {
    const eventChallengeIndex = completedChallenges.findIndex(
      (item) => item.challengeId === event.afterChallengeId,
    )
    if (eventChallengeIndex >= 0 && eventChallengeIndex < challengeIndex) {
      level = event.toLevel
    }
  }
  return level
}

function changedManuallyDuringChallenge(challenge: ChallengeRecord, policyHistory: PolicyEvent[]): boolean {
  return policyHistory.some(
    (event) => event.afterChallengeId === challenge.challengeId && event.trigger === 'learner_request',
  )
}

function qualifiesAsHintModeSuccess(
  challenge: ChallengeRecord,
  completedChallenges: ChallengeRecord[],
  policyHistory: PolicyEvent[],
): boolean {
  return (
    levelAtChallengeStart(challenge, completedChallenges, policyHistory) === 'hint'
    && !changedManuallyDuringChallenge(challenge, policyHistory)
    && isAllUnaidedCorrect(challenge)
  )
}

/**
 * Deterministically evaluates only the evidence available at a policy boundary.
 * It never mutates state or records events.
 */
export function evaluatePolicy(
  currentLevel: AssistanceLevel,
  completedChallenges: ChallengeRecord[],
  policyHistory: PolicyEvent[],
  trigger: PolicyTrigger,
): PolicyDecision {
  if (trigger === 'learner_request_more_help') {
    if (currentLevel === 'independent') {
      return {
        newLevel: 'hint',
        policy_reason: 'Learner requested more support.',
        changed: true,
      }
    }
    if (currentLevel === 'hint') {
      return {
        newLevel: 'guided',
        policy_reason: 'Learner requested more support.',
        changed: true,
      }
    }
    return unchanged(currentLevel)
  }

  const mostRecent = completedChallenges.at(-1)
  if (!mostRecent || !mostRecent.completed || !allExercisesAttempted(mostRecent)) {
    return unchanged(currentLevel)
  }

  if ((currentLevel === 'hint' || currentLevel === 'independent') && isAllUnaidedIncorrect(mostRecent)) {
    const newLevel = currentLevel === 'independent' ? 'hint' : 'guided'
    return {
      newLevel,
      policy_reason: `You missed all three unaided first attempts in ${mostRecent.challengeId}. A bit more guidance is back.`,
      changed: true,
    }
  }

  if (currentLevel === 'guided' && unaidedCorrectCount(mostRecent) >= 2) {
    return {
      newLevel: 'hint',
      policy_reason: `You predicted correctly without hints on at least two exercises in ${mostRecent.challengeId}.`,
      changed: true,
    }
  }

  if (currentLevel === 'hint') {
    const latestDownward = latestDownwardEventIndex(policyHistory)
    const inWindow = completedChallenges.filter(
      (challenge) => latestDownward === null
        || challenge.lastDownwardTransitionIndexBeforeCompletion === latestDownward,
    )
    const twoMostRecent = inWindow.slice(-2)

    if (
      twoMostRecent.length === 2
      && twoMostRecent.every((challenge) => (
        qualifiesAsHintModeSuccess(challenge, completedChallenges, policyHistory)
      ))
    ) {
      return {
        newLevel: 'independent',
        policy_reason: `You predicted correctly without hints on all three exercises in ${twoMostRecent[0].challengeId} and ${twoMostRecent[1].challengeId}, including the transfer exercises.`,
        changed: true,
      }
    }
  }

  return unchanged(currentLevel)
}
