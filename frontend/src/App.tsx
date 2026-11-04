/**
 * App — root component.
 *
 * Milestone 2: loads challenges, shows one at a time, basic navigation.
 * Routing (/report) and the session context provider are added in later milestones.
 */

import { useEffect, useState } from 'react'
import { useSession, SessionProvider } from './context/SessionContext'
import { ChallengeView } from './components/ChallengeView'
import { ProgressReport } from './components/ProgressReport'
import { fetchChallenges } from './api/client'
import type { ChallengeSummary } from './types'
import './App.css'

// ---------------------------------------------------------------------------
// Inner app — needs access to SessionContext
// ---------------------------------------------------------------------------

function FamiliarApp() {
  const { state, dispatch } = useSession()

  const [summaries, setSummaries] = useState<ChallengeSummary[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [route, setRoute] = useState(() => window.location.pathname)

  useEffect(() => {
    fetchChallenges()
      .then((data) => {
        setSummaries(data.challenges)
        dispatch({ type: 'LOAD_CHALLENGES', challenges: data.challenges })
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load challenges.')
      })
      .finally(() => setLoading(false))
  }, [dispatch])

  if (loading) {
    return (
      <main className="app-main">
        <p className="app-loading">Loading challenges…</p>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="app-main">
        <p className="app-error" role="alert">
          Could not load challenges: {loadError}
        </p>
        <p>Make sure the backend is running at <code>http://localhost:8000</code>.</p>
      </main>
    )
  }

  if (summaries.length === 0) {
    return (
      <main className="app-main">
        <p className="app-error">No challenges found.</p>
      </main>
    )
  }

  if (route === '/report' && state.sessionComplete) {
    return <ProgressReport state={state} challenges={summaries} />
  }

  const isLast = currentIndex === summaries.length - 1
  const current = summaries[currentIndex]

  function handleChallengeDone() {
    if (isLast) {
      dispatch({ type: 'SESSION_COMPLETE' })
      window.history.pushState({}, '', '/report')
      setRoute('/report')
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  return (
    <main className="app-main">
      <h1 className="app-title">Familiar</h1>
      <ChallengeView
        key={current.id}
        challenge={current}
        challengeIndex={currentIndex}
        challengeNumber={currentIndex + 1}
        totalChallenges={summaries.length}
        onChallengeDone={handleChallengeDone}
      />
    </main>
  )
}

// ---------------------------------------------------------------------------
// Root export — wraps FamiliarApp in the session provider
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <SessionProvider>
      <FamiliarApp />
    </SessionProvider>
  )
}
