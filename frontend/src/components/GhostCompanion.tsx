import type { AssistanceLevel } from '../types'
import '../styles/ghost.css'

export type GhostReaction = 'idle' | 'thinking' | 'correct' | 'incorrect'

interface GhostCompanionProps {
  assistanceLevel: AssistanceLevel
  reactionEvent: GhostReaction
  message?: string
}

export function GhostCompanion({ assistanceLevel, reactionEvent, message }: GhostCompanionProps) {
  return (
    <aside className={`ghost-companion ghost-${assistanceLevel} ghost-reaction-${reactionEvent}`} aria-live="polite">
      <svg className="ghost-sprite" viewBox="0 0 64 64" role="img" aria-label={`${assistanceLevel} companion`}>
        <path d="M14 52V26C14 12 24 6 32 6s18 6 18 20v26l-6-5-6 5-6-5-6 5-6-5z" />
        <rect x="23" y="25" width="6" height="8" className="ghost-eye" />
        <rect x="37" y="25" width="6" height="8" className="ghost-eye" />
        <path d="M27 39h10" className="ghost-mouth" />
      </svg>
      {message && <p className="ghost-message">{message}</p>}
    </aside>
  )
}
