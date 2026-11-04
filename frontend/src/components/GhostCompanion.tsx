import { useState } from 'react'
import type { AssistanceLevel } from '../types'
import '../styles/ghost.css'

export type GhostReaction = 'idle' | 'thinking' | 'happy' | 'oops' | 'encouraging' | 'celebrating'

interface GhostCompanionProps {
  assistanceLevel: AssistanceLevel
  reactionEvent: GhostReaction
  message?: string
}

export function GhostCompanion({ assistanceLevel, reactionEvent, message }: GhostCompanionProps) {
  const [hovered, setHovered] = useState(false)
  const [greeting, setGreeting] = useState(false)
  const expression = greeting ? 'encouraging' : reactionEvent

  return (
    <aside className={`ghost-companion ghost-${assistanceLevel} ghost-expression-${expression} ${hovered ? 'ghost-hovered' : ''}`} aria-live="polite">
      <button type="button" className="ghost-control" aria-label="Friendly companion. Press for a small hello." onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)} onFocus={() => setHovered(true)} onBlur={() => setHovered(false)} onClick={() => { setGreeting(true); window.setTimeout(() => setGreeting(false), 1200) }}>
        <svg className="ghost-sprite" viewBox="0 0 64 64" role="img" aria-label={`${assistanceLevel} companion, ${expression}`}>
          <path className="ghost-body" d="M14 52V26C14 12 24 6 32 6s18 6 18 20v26l-6-5-6 5-6-5-6 5-6-5z" />
          {expression === 'thinking' ? <><path className="ghost-eye" d="M22 28h8M36 25h7" /><path className="ghost-mouth" d="M29 41h7" /></> : expression === 'happy' || expression === 'celebrating' ? <><path className="ghost-eye" d="M22 28l4 3 4-3M36 28l4 3 4-3" /><path className="ghost-mouth" d="M26 39q6 6 12 0" /></> : expression === 'oops' ? <><rect x="23" y="23" width="6" height="9" className="ghost-eye" /><rect x="37" y="23" width="6" height="9" className="ghost-eye" /><rect x="29" y="38" width="6" height="6" className="ghost-mouth ghost-mouth-oops" /></> : <><rect x="23" y="25" width="6" height="8" className="ghost-eye" /><rect x="37" y="25" width="6" height="8" className="ghost-eye" /><path className="ghost-mouth" d="M27 39h10" /></>}
          {(expression === 'encouraging' || expression === 'celebrating') && <><rect x="17" y="37" width="5" height="3" className="ghost-blush" /><rect x="42" y="37" width="5" height="3" className="ghost-blush" /></>}
          {expression === 'celebrating' && <path className="ghost-sparkles" d="M10 16v-5M7.5 13.5h5M54 16v-5M51.5 13.5h5" />}
        </svg>
      </button>
      <p className="ghost-message">{greeting ? 'Boo! I’m right here with you.' : message}</p>
    </aside>
  )
}
