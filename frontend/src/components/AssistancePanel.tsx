interface AssistancePanelProps {
  kind: 'hint' | 'walkthrough' | 'encouragement'
  hint?: string
  walkthrough?: string[]
  correct?: boolean
}

export function AssistancePanel({ kind, hint, walkthrough, correct }: AssistancePanelProps) {
  if (kind === 'hint') {
    return <aside className="assistance-panel" aria-live="polite"><strong>Hint</strong><p>{hint}</p></aside>
  }
  if (kind === 'walkthrough') {
    return (
      <aside className="assistance-panel" aria-live="polite">
        <strong>Walkthrough</strong>
        <ol>{walkthrough?.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol>
      </aside>
    )
  }
  return (
    <aside className="assistance-panel assistance-encouragement" aria-live="polite">
      {correct ? 'Nice reasoning. Keep tracing one step at a time.' : 'That was a useful check. Re-read the flow, or ask for a hint when you want one.'}
    </aside>
  )
}
