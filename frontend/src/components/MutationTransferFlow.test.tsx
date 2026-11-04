import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ChallengeView } from './ChallengeView'
import { CodeBlock } from './CodeBlock'
import { SessionProvider, useSession } from '../context/SessionContext'
import type { ChallengeSummary } from '../types'

const { fetchExerciseOutput } = vi.hoisted(() => ({ fetchExerciseOutput: vi.fn() }))
vi.mock('../api/client', () => ({ fetchExerciseOutput }))

const challenge: ChallengeSummary = {
  id: 'loops_01',
  title: 'Counting with range()',
  description: 'A for loop that prints each value produced by range().',
  concept: 'for-loop with range',
  exercises: {
    original: { code: 'for i in range(2):\n    print(i)' },
    mutation: {
      code: 'for i in range(2):\n    print(i * 2)',
      diff_line: 1,
      diff_description: 'Applies an arithmetic expression before printing.',
    },
    transfer: { code: 'total = 0\nfor i in range(2):\n    total += i\nprint(total)' },
  },
}

function SessionSetup({ children }: { children: ReactNode }) {
  const { dispatch } = useSession()
  useEffect(() => {
    dispatch({ type: 'LOAD_CHALLENGES', challenges: [challenge] })
  }, [dispatch])
  return <>{children}</>
}

function SessionProbe() {
  const { state } = useSession()
  return <output data-testid="session-probe">{JSON.stringify(state)}</output>
}

function verifyCurrentExercise() {
  fireEvent.change(screen.getByLabelText('What will this program print?'), { target: { value: 'guess' } })
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }))
}

describe('mutation and transfer learning flow', () => {
  it('highlights only the authored mutation line', () => {
    const { container } = render(<CodeBlock code={'first\nchanged\nlast'} diffLine={1} />)
    const changed = container.querySelector('[data-changed="true"]')
    expect(changed?.textContent).toBe('changed')
    expect(container.querySelectorAll('[data-changed="true"]')).toHaveLength(1)
  })

  it('preserves Python newlines and indentation in the copyable code text', () => {
    const python = 'for i in range(1, 4):\n    print(i)'
    const { container } = render(<CodeBlock code={python} />)
    const code = container.querySelector('code')
    const lines = container.querySelectorAll('.code-line')

    expect(code?.textContent).toBe(python)
    expect(lines).toHaveLength(2)
    expect(lines[0].textContent).toBe('for i in range(1, 4):')
    expect(lines[1].textContent).toBe('    print(i)')
  })

  it('presents mutation and transfer stages, preserves evidence, and gates navigation until completion', async () => {
    fetchExerciseOutput.mockImplementation(async (challengeId: string, exerciseType: string) => ({
      challenge_id: challengeId,
      exercise_type: exerciseType,
      expected_output: 'expected',
      hint: 'A hint',
      walkthrough: [],
      output_source: 'precomputed' as const,
    }))
    const onChallengeDone = vi.fn()
    const { container } = render(
      <SessionProvider>
        <SessionSetup>
          <ChallengeView
            challenge={challenge}
            challengeIndex={0}
            challengeNumber={1}
            totalChallenges={2}
            onChallengeDone={onChallengeDone}
          />
          <SessionProbe />
        </SessionSetup>
      </SessionProvider>,
    )

    await waitFor(() => expect(screen.getByText('Original Challenge')).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Next Challenge' })).toBeNull()

    verifyCurrentExercise()
    await waitFor(() => expect(screen.getByText('✗ Incorrect')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Mutation →' }))

    await waitFor(() => expect(screen.getByText('Mutation Challenge')).toBeTruthy())
    expect(screen.getByText('Applies an arithmetic expression before printing.')).toBeTruthy()
    expect(container.querySelectorAll('[data-changed="true"]')).toHaveLength(1)

    verifyCurrentExercise()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue to Transfer →' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Transfer →' }))

    await waitFor(() => expect(screen.getByText('Transfer Challenge')).toBeTruthy())
    expect(screen.getByText(/Apply for-loop with range in this new context/)).toBeTruthy()
    expect(container.querySelectorAll('[data-changed="true"]')).toHaveLength(0)

    verifyCurrentExercise()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Finish challenge →' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Finish challenge →' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Next Challenge' })).toBeTruthy())
    expect(screen.queryByLabelText('What will this program print?')).toBeNull()
    const state = JSON.parse(screen.getByTestId('session-probe').textContent ?? '{}')
    expect(state.challenges[0].completed).toBe(true)
    expect(state.challenges[0].exercises.original.firstPrediction).toBe('guess')
    expect(state.challenges[0].exercises.transfer.firstPrediction).toBe('guess')
    expect(state.policyHistory).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Next Challenge' }))
    expect(onChallengeDone).toHaveBeenCalledTimes(1)
    expect(JSON.parse(screen.getByTestId('session-probe').textContent ?? '{}').policyHistory).toHaveLength(0)
  })
})
