/**
 * ResultPanel — display-only component shown after a successful verification.
 *
 * Receives the locked prediction and the API response as props.
 * Does NOT dispatch any state actions — the parent committed state atomically
 * when calling onVerified (PredictionInput, Task 2.5).
 *
 * Labeling rule (design §5.3):
 *   output_source === "precomputed" → "Expected output"
 *   output_source === "executed"   → "Actual output"
 */

import type { ExerciseOutputResponse } from '../types'

interface ResultPanelProps {
  prediction: string
  correct: boolean
  outputResponse: ExerciseOutputResponse
}

export function ResultPanel({ prediction, correct, outputResponse }: ResultPanelProps) {
  const outputLabel =
    outputResponse.output_source === 'precomputed' ? 'Expected output' : 'Actual output'

  return (
    <div className="result-panel">
      <div className={`result-verdict ${correct ? 'result-correct' : 'result-incorrect'}`} role="status">
        {correct ? '✓ Correct' : '✗ Incorrect'}
      </div>

      <div className="result-columns">
        <div className="result-column">
          <p className="result-column-label">Your prediction</p>
          <pre className="result-output">{prediction}</pre>
        </div>

        <div className="result-column">
          <p className="result-column-label">{outputLabel}</p>
          <pre className="result-output">{outputResponse.expected_output}</pre>
        </div>
      </div>
    </div>
  )
}
