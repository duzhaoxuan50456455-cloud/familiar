/**
 * ExercisePanel — orchestrates the predict → verify flow for one exercise.
 *
 * Milestone 2 scope: original exercise only (no mutation/transfer sequencing yet).
 * State is local: the parent (ChallengeView) only needs to know when an
 * exercise is done so it can show "Next Challenge". Evidence tracking and
 * full exercise sequencing come in Milestones 3–5.
 */

import { useState } from 'react'
import type { ChallengeSummary, ExerciseOutputResponse } from '../types'
import { CodeBlock } from './CodeBlock'
import { PredictionInput } from './PredictionInput'
import { ResultPanel } from './ResultPanel'

interface ExercisePanelProps {
  challenge: ChallengeSummary
  /** Called after the original exercise is verified, signaling this challenge round is done. */
  onExerciseDone: () => void
}

interface VerifiedState {
  prediction: string
  correct: boolean
  response: ExerciseOutputResponse
}

export function ExercisePanel({ challenge, onExerciseDone }: ExercisePanelProps) {
  const [verified, setVerified] = useState<VerifiedState | null>(null)

  function handleVerified(prediction: string, correct: boolean, response: ExerciseOutputResponse) {
    setVerified({ prediction, correct, response })
  }

  const exercise = challenge.exercises.original

  return (
    <div className="exercise-panel">
      <CodeBlock code={exercise.code} />

      {verified === null ? (
        <PredictionInput
          challengeId={challenge.id}
          exerciseType="original"
          onVerified={handleVerified}
        />
      ) : (
        <>
          <ResultPanel
            prediction={verified.prediction}
            correct={verified.correct}
            outputResponse={verified.response}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onExerciseDone}
          >
            Continue →
          </button>
        </>
      )}
    </div>
  )
}
