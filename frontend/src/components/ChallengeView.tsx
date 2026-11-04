/**
 * ChallengeView — displays one challenge with its number, title, description,
 * and the active exercise panel.
 *
 * Milestone 2 scope: renders the original exercise only. Mutation and transfer
 * sequencing, evidence tracking, and policy evaluation are added in Milestones
 * 3–5.
 */

import { useEffect, useState } from 'react'
import type { ChallengeSummary, PolicyEvent } from '../types'
import { ExercisePanel } from './ExercisePanel'
import { GetMoreHelpButton } from './GetMoreHelpButton'
import { useSession } from '../context/SessionContext'
import { evaluatePolicy, type PolicyDecision, type PolicyTrigger } from '../policy/assistancePolicy'

interface ChallengeViewProps {
  challenge: ChallengeSummary
  challengeIndex: number
  challengeNumber: number
  totalChallenges: number
  onChallengeDone: () => void
}

export function ChallengeView({
  challenge,
  challengeIndex,
  challengeNumber,
  totalChallenges,
  onChallengeDone,
}: ChallengeViewProps) {
  const { state, dispatch } = useSession()
  const [completionPending, setCompletionPending] = useState(false)
  const [announcement, setAnnouncement] = useState<string | null>(null)
  const [readyToAdvance, setReadyToAdvance] = useState(false)
  const challengeRecord = state.challenges[challengeIndex]
  const levelLabel = {
    guided: 'Guided',
    hint: 'Getting Hints',
    independent: 'Independent',
  }[state.assistanceLevel]

  function recordDecision(decision: PolicyDecision, trigger: PolicyTrigger) {
    if (!decision.changed || !challengeRecord) return false

    const eventTrigger: PolicyEvent['trigger'] = trigger === 'learner_request_more_help'
      ? 'learner_request'
      : decision.newLevel === 'guided' || decision.newLevel === 'hint' && state.assistanceLevel === 'independent'
        ? 'downward_auto'
        : 'upward_auto'
    dispatch({
      type: 'RECORD_POLICY_EVENT',
      event: {
        fromLevel: state.assistanceLevel,
        toLevel: decision.newLevel,
        trigger: eventTrigger,
        policy_reason: decision.policy_reason,
        afterChallengeId: challengeRecord.challengeId,
      },
    })
    setAnnouncement(decision.policy_reason)
    return true
  }

  useEffect(() => {
    if (!completionPending || !challengeRecord?.completed) return

    setCompletionPending(false)
    const decision = evaluatePolicy(
      state.assistanceLevel,
      state.challenges,
      state.policyHistory,
      'challenge_completed',
    )
    if (!recordDecision(decision, 'challenge_completed')) setReadyToAdvance(true)
  }, [completionPending, challengeRecord?.completed, state, onChallengeDone])

  function handleMoreHelp() {
    const decision = evaluatePolicy(
      state.assistanceLevel,
      state.challenges,
      state.policyHistory,
      'learner_request_more_help',
    )
    recordDecision(decision, 'learner_request_more_help')
  }

  const exerciseTypes = ['original', 'mutation', 'transfer'] as const
  const currentExercise = challengeRecord?.currentExercise ?? 'original'

  function stageStatus(exerciseType: typeof exerciseTypes[number]): 'completed' | 'current' | 'upcoming' {
    if (exerciseType === currentExercise && !challengeRecord?.completed) return 'current'
    if (challengeRecord?.exercises[exerciseType].firstPrediction !== null) return 'completed'
    return 'upcoming'
  }

  function stageLabel(exerciseType: typeof exerciseTypes[number]): string {
    return exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1)
  }

  return (
    <div className="challenge-view">
      <header className="challenge-header">
        <p className="challenge-counter">
          Challenge {challengeNumber} of {totalChallenges}
        </p>
        <h2 className="challenge-title">{challenge.title}</h2>
        <p className="challenge-description">{challenge.description}</p>
        <p aria-label="Current assistance level">Assistance level: {levelLabel}</p>
        <GetMoreHelpButton
          disabled={state.assistanceLevel === 'guided'}
          onRequest={handleMoreHelp}
        />
      </header>

      <nav className="exercise-progress" aria-label="Exercise progress">
        <ol>
          {exerciseTypes.map((exerciseType) => {
            const status = stageStatus(exerciseType)
            return (
              <li key={exerciseType} className={`exercise-progress-${status}`} aria-current={status === 'current' ? 'step' : undefined}>
                <span aria-hidden="true">{status === 'completed' ? '✓' : status === 'current' ? '●' : '○'}</span>
                {stageLabel(exerciseType)}
              </li>
            )
          })}
        </ol>
      </nav>

      {announcement && (
        <div role="status" className="policy-announcement">
          <p>{announcement}</p>
          <button type="button" className="btn btn-secondary" onClick={() => {
            setAnnouncement(null)
            if (challengeRecord?.completed) setReadyToAdvance(true)
          }}>
            Got it
          </button>
        </div>
      )}

      {!challengeRecord?.completed && (
        <ExercisePanel
          challenge={challenge}
          challengeIndex={challengeIndex}
          onExerciseDone={() => setCompletionPending(true)}
        />
      )}

      {readyToAdvance && challengeRecord?.completed && (
        <button type="button" className="btn btn-primary" onClick={onChallengeDone}>
          {challengeNumber === totalChallenges ? 'See Report' : 'Next Challenge'}
        </button>
      )}
    </div>
  )
}
