/**
 * ChallengeView — displays one challenge with its number, title, description,
 * and the active exercise panel.
 *
 * Milestone 2 scope: renders the original exercise only. Mutation and transfer
 * sequencing, evidence tracking, and policy evaluation are added in Milestones
 * 3–5.
 */

import type { ChallengeSummary } from '../types'
import { ExercisePanel } from './ExercisePanel'

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
  return (
    <div className="challenge-view">
      <header className="challenge-header">
        <p className="challenge-counter">
          Challenge {challengeNumber} of {totalChallenges}
        </p>
        <h2 className="challenge-title">{challenge.title}</h2>
        <p className="challenge-description">{challenge.description}</p>
      </header>

      <ExercisePanel
        challenge={challenge}
        challengeIndex={challengeIndex}
        onExerciseDone={onChallengeDone}
      />
    </div>
  )
}
