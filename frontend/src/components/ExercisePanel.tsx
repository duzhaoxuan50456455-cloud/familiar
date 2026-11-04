/**
 * ExercisePanel — orchestrates the predict → verify flow for one exercise.
 *
 * Milestone 3 scope: commits first-attempt evidence after successful output
 * retrieval and progresses through the predefined exercise records.
 */

import { useState } from 'react'
import type { ChallengeSummary, ExerciseOutputResponse, ExerciseType } from '../types'
import { CodeBlock } from './CodeBlock'
import { PredictionInput } from './PredictionInput'
import { ResultPanel } from './ResultPanel'
import { useSession } from '../context/SessionContext'

interface ExercisePanelProps {
  challenge: ChallengeSummary
  challengeIndex: number
  /** Called only after the transfer exercise completes. */
  onExerciseDone: () => void
}

interface VerifiedState {
  prediction: string
  correct: boolean
  response: ExerciseOutputResponse
}

export function ExercisePanel({ challenge, challengeIndex, onExerciseDone }: ExercisePanelProps) {
  const { state, dispatch } = useSession()
  const [verified, setVerified] = useState<VerifiedState | null>(null)
  const [verifiedExercise, setVerifiedExercise] = useState<ExerciseType | null>(null)

  const challengeRecord = state.challenges[challengeIndex]
  const exerciseType = challengeRecord?.currentExercise ?? 'original'
  const exercise = challenge.exercises[exerciseType]
  const firstPrediction = challengeRecord?.exercises[exerciseType].firstPrediction
  const isCurrentResult = (
    firstPrediction !== null
    && firstPrediction !== undefined
    && verified !== null
    && verifiedExercise === exerciseType
  )

  function handleVerified(prediction: string, correct: boolean, response: ExerciseOutputResponse) {
    // PredictionInput has already committed evidence from its successful response.
    setVerified({ prediction, correct, response })
    setVerifiedExercise(exerciseType)
  }

  function handleContinue() {
    setVerified(null)
    setVerifiedExercise(null)
    if (exerciseType === 'transfer') {
      dispatch({ type: 'COMPLETE_CHALLENGE', challengeIndex })
      onExerciseDone()
      return
    }
    dispatch({ type: 'ADVANCE_TO_NEXT_EXERCISE', challengeIndex })
  }

  return (
    <div className="exercise-panel">
      <CodeBlock code={exercise.code} />

      {!isCurrentResult ? (
        <PredictionInput
          challengeId={challenge.id}
          challengeIndex={challengeIndex}
          exerciseType={exerciseType}
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
            onClick={handleContinue}
          >
            Continue →
          </button>
        </>
      )}
    </div>
  )
}
