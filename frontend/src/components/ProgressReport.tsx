import type { ChallengeSummary, ExerciseRecord, ExerciseType, SessionState } from '../types'

interface ProgressReportProps {
  state: SessionState
  challenges: ChallengeSummary[]
}

const exerciseTypes: ExerciseType[] = ['original', 'mutation', 'transfer']

function resultLabel(record: ExerciseRecord): string {
  if (record.firstPrediction === null) return 'Not attempted'
  return `${record.firstPredictionCorrect ? 'Correct' : 'Incorrect'} — ${record.firstAttemptTag === 'unaided' ? 'unaided' : 'after assistance'}`
}

export function ProgressReport({ state, challenges }: ProgressReportProps) {
  const attempted = state.challenges.flatMap((challenge) => exerciseTypes.map((type) => challenge.exercises[type]))
    .filter((exercise) => exercise.firstPrediction !== null)
  const unaidedCorrect = attempted.filter((exercise) => exercise.firstAttemptTag === 'unaided' && exercise.firstPredictionCorrect).length
  const assisted = attempted.filter((exercise) => exercise.firstAttemptTag === 'after_assistance').length
  const byType = exerciseTypes.map((type) => ({
    type,
    attempted: state.challenges.filter((challenge) => challenge.exercises[type].firstPrediction !== null).length,
    unaidedCorrect: state.challenges.filter((challenge) => {
      const exercise = challenge.exercises[type]
      return exercise.firstAttemptTag === 'unaided' && exercise.firstPredictionCorrect
    }).length,
  }))

  return (
    <main className="app-main progress-report">
      <h1 className="app-title">Session report</h1>
      <p className="report-intro">This reflects what you demonstrated during this session. It is not a claim about long-term mastery.</p>
      <section className="report-metrics" aria-label="Session summary">
        <p><strong>{state.challenges.filter((challenge) => challenge.completed).length}</strong> completed challenges</p>
        <p><strong>{attempted.length}</strong> exercises attempted</p>
        <p><strong>{unaidedCorrect}</strong> unaided first-attempt correct</p>
        <p><strong>{assisted}</strong> first attempts after assistance</p>
        <p>Final assistance level: <strong>{state.assistanceLevel}</strong></p>
      </section>
      <section>
        <h2>First-attempt evidence</h2>
        <table>
          <thead><tr><th>Challenge</th>{exerciseTypes.map((type) => <th key={type}>{type}</th>)}</tr></thead>
          <tbody>{state.challenges.map((record) => {
            const summary = challenges.find((challenge) => challenge.id === record.challengeId)
            return <tr key={record.challengeId}><th scope="row">{summary?.title ?? record.challengeId}</th>{exerciseTypes.map((type) => <td key={type}>{resultLabel(record.exercises[type])}</td>)}</tr>
          })}</tbody>
        </table>
      </section>
      <section>
        <h2>By exercise type</h2>
        <ul>{byType.map((item) => <li key={item.type}>{item.type}: {item.unaidedCorrect} unaided correct out of {item.attempted} attempted</li>)}</ul>
      </section>
      <section>
        <h2>Assistance-level changes</h2>
        {state.policyHistory.length === 0 ? <p>No assistance-level changes occurred this session.</p> : <ul>{state.policyHistory.map((event) => <li key={event.eventIndex}>{event.fromLevel} → {event.toLevel}: {event.policy_reason}</li>)}</ul>}
      </section>
      {state.assistanceLevel !== 'independent' && <p className="report-note">Reaching Independent requires completing two consecutive challenges at full first-attempt accuracy. More challenges are needed to reach this level.</p>}
    </main>
  )
}
