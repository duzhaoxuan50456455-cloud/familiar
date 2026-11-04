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
import { fetchExerciseOutput } from '../api/client'
import { HintButton } from './HintButton'
import { AssistancePanel } from './AssistancePanel'
import type { GhostReaction } from './GhostCompanion'

interface ExercisePanelProps {
  challenge: ChallengeSummary
  challengeIndex: number
  /** Called only after the transfer exercise completes. */
  onExerciseDone: () => void
  onReaction: (reaction: GhostReaction, message: string) => void
}

interface VerifiedState {
  prediction: string
  correct: boolean
  response: ExerciseOutputResponse
}

export function ExercisePanel({ challenge, challengeIndex, onExerciseDone, onReaction }: ExercisePanelProps) {
  const { state, dispatch } = useSession()
  const [verified, setVerified] = useState<VerifiedState | null>(null)
  const [verifiedExercise, setVerifiedExercise] = useState<ExerciseType | null>(null)
  const [assistanceResponse, setAssistanceResponse] = useState<ExerciseOutputResponse | null>(null)
  const [hintShown, setHintShown] = useState(false)
  const [hintLoading, setHintLoading] = useState(false)

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
    setAssistanceResponse(response)
    const unaided = !challengeRecord?.exercises[exerciseType].assistanceViewedBeforeFirstPrediction
    onReaction(
      correct ? 'happy' : 'oops',
      correct
        ? unaided ? 'You reasoned that through without a hint.' : 'Nice reasoning. You checked your prediction.'
        : 'That was a useful check. I can help you trace it.',
    )
  }

  async function handleShowHint() {
    if (hintShown || hintLoading) return
    setHintLoading(true)
    try {
      const response = assistanceResponse ?? await fetchExerciseOutput(challenge.id, exerciseType)
      setAssistanceResponse(response)
      dispatch({ type: 'VIEW_ASSISTANCE', challengeIndex, exerciseType })
      setHintShown(true)
    } finally {
      setHintLoading(false)
    }
  }

  function handleContinue() {
    setVerified(null)
    setVerifiedExercise(null)
    setAssistanceResponse(null)
    setHintShown(false)
    if (exerciseType === 'transfer') {
      onReaction('celebrating', 'You completed this challenge. Nice persistence.')
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
  const automaticPanel = isCurrentResult && !verified.correct
    ? state.assistanceLevel === 'guided' ? 'walkthrough' : state.assistanceLevel === 'hint' ? 'hint' : 'encouragement'
    : isCurrentResult ? 'encouragement' : null
  const walkthroughShown = automaticPanel === 'walkthrough'

  return (
    <div className="exercise-panel">
      <section className="exercise-introduction" aria-labelledby="exercise-stage-title">
        <p className="exercise-stage" aria-hidden="true">{exerciseType}</p>
        <h3 id="exercise-stage-title"><span>{stageCopy[exerciseType].title}</span><em>{exerciseType === 'original' ? 'Discover the Spell' : exerciseType === 'mutation' ? 'Transform the Spell' : 'Cast It Yourself'}</em></h3>
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
          onTyping={() => onReaction('thinking', 'Take a moment to predict before you check.')}
          onVerified={handleVerified}
        />
      ) : (
        <>
          <ResultPanel
            prediction={verified.prediction}
            correct={verified.correct}
            outputResponse={verified.response}
          />
          {automaticPanel && <AssistancePanel kind={automaticPanel} hint={assistanceResponse?.hint} walkthrough={assistanceResponse?.walkthrough} correct={verified.correct} />}
          {hintShown && !walkthroughShown && <AssistancePanel kind="hint" hint={assistanceResponse?.hint} />}
          {!walkthroughShown && <HintButton shown={hintShown} loading={hintLoading} onShow={() => { void handleShowHint() }} />}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleContinue}
          >
            {continueLabel[exerciseType]}
          </button>
        </>
      )}
      {!isCurrentResult && <>
        {hintShown && <AssistancePanel kind="hint" hint={assistanceResponse?.hint} />}
        <HintButton shown={hintShown} loading={hintLoading} onShow={() => { void handleShowHint() }} />
      </>}
    </div>
  )
}
