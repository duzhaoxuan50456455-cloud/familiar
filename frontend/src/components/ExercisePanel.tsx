/**
 * ExercisePanel — orchestrates the predict → verify flow for one exercise.
 *
 * Milestone 3 scope: commits first-attempt evidence after successful output
 * retrieval and progresses through the predefined exercise records.
 */

import { useState } from 'react'
import type { ChallengeSummary, ExerciseOutputResponse, ExerciseType, MutationExerciseSummary } from '../types'
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
  const mutationExercise = exerciseType === 'mutation'
    ? exercise as MutationExerciseSummary
    : null
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

  const stageCopy: Record<ExerciseType, { title: string; instruction: string }> = {
    original: {
      title: 'Original Challenge',
      instruction: 'Trace the code before predicting what it prints.',
    },
    mutation: {
      title: 'Mutation Challenge',
      instruction: 'One focused change was made. Trace how it affects the output.',
    },
    transfer: {
      title: 'Transfer Challenge',
      instruction: `Apply ${challenge.concept} in this new context. Trace the code before predicting the output.`,
    },
  }
  const continueLabel: Record<ExerciseType, string> = {
    original: 'Continue to Mutation →',
    mutation: 'Continue to Transfer →',
    transfer: 'Finish challenge →',
  }

  return (
    <div className="exercise-panel">
      <section className="exercise-introduction" aria-labelledby="exercise-stage-title">
        <p className="exercise-stage" aria-hidden="true">{exerciseType}</p>
        <h3 id="exercise-stage-title">{stageCopy[exerciseType].title}</h3>
        <p>{stageCopy[exerciseType].instruction}</p>
      </section>

      {mutationExercise && (
        <p className="mutation-description">
          <strong>What changed:</strong> {mutationExercise.diff_description}
        </p>
      )}

      <CodeBlock code={exercise.code} diffLine={mutationExercise?.diff_line} />

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
            {continueLabel[exerciseType]}
          </button>
        </>
      )}
    </div>
  )
}
