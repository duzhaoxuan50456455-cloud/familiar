/**
 * PredictionInput — prediction textarea and Verify button.
 *
 * Design rules (Tasks 2.5 / 3.2):
 * - "Verify" is disabled while the textarea is empty or a request is in-flight.
 * - On "Verify": fetches expected output, computes correctness, then calls
 *   onVerified() with both the prediction and the full output response — all
 *   in one go. Nothing is committed until the fetch succeeds.
 * - On network/backend error: textarea stays editable, error shown, no attempt
 *   recorded.
 * - After a successful verification the textarea is locked and the button
 *   is hidden (the caller renders ResultPanel instead).
 */

import { useState, useRef } from 'react'
import type { ExerciseOutputResponse, ExerciseType } from '../types'
import { fetchExerciseOutput } from '../api/client'
import { normalize } from '../utils/normalize'

interface PredictionInputProps {
  challengeId: string
  exerciseType: ExerciseType
  /** Called once, after a successful fetch, with the locked prediction and API response. */
  onVerified: (prediction: string, correct: boolean, response: ExerciseOutputResponse) => void
}

export function PredictionInput({ challengeId, exerciseType, onVerified }: PredictionInputProps) {
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Prevent duplicate in-flight requests at the ref level (belt-and-suspenders
  // in addition to the disabled button state).
  const inFlight = useRef(false)

  async function handleVerify() {
    if (!draft.trim() && draft === '') return
    if (inFlight.current) return

    inFlight.current = true
    setStatus('loading')
    setErrorMessage(null)

    try {
      const response = await fetchExerciseOutput(challengeId, exerciseType)
      const correct = normalize(draft) === normalize(response.expected_output)

      // Successful: commit atomically via the callback. The parent will
      // replace this component with ResultPanel.
      onVerified(draft, correct, response)
    } catch (err) {
      // Network or backend error: preserve draft, allow retry, no attempt recorded.
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      inFlight.current = false
    }
    // On success, this component is unmounted by the parent; no need to reset.
  }

  const isEmpty = draft === ''
  const isDisabled = isEmpty || status === 'loading'

  return (
    <div className="prediction-input">
      <label htmlFor="prediction-textarea" className="prediction-label">
        What will this program print?
      </label>
      <textarea
        id="prediction-textarea"
        className="prediction-textarea"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Type the exact output here, one line per line…"
        rows={4}
        spellCheck={false}
        autoComplete="off"
        aria-describedby={errorMessage ? 'prediction-error' : undefined}
      />

      {errorMessage && (
        <p id="prediction-error" className="prediction-error" role="alert">
          {errorMessage}{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => { setStatus('idle'); setErrorMessage(null); inFlight.current = false }}
          >
            Try again
          </button>
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary"
        onClick={() => { void handleVerify() }}
        disabled={isDisabled}
        aria-busy={status === 'loading'}
      >
        {status === 'loading' ? 'Checking…' : 'Verify'}
      </button>
    </div>
  )
}
