import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PredictionInput } from './PredictionInput'
import { SessionProvider } from '../context/SessionContext'

const { fetchExerciseOutput } = vi.hoisted(() => ({ fetchExerciseOutput: vi.fn() }))

vi.mock('../api/client', () => ({ fetchExerciseOutput }))

describe('PredictionInput', () => {
  it('does not commit an attempt when verification fails', async () => {
    fetchExerciseOutput.mockRejectedValueOnce(new Error('HTTP 500'))
    const onVerified = vi.fn()
    render(
      <SessionProvider>
        <PredictionInput
          challengeId="loops_01"
          challengeIndex={0}
          exerciseType="original"
          onVerified={onVerified}
        />
      </SessionProvider>,
    )

    fireEvent.change(screen.getByLabelText('What will this program print?'), { target: { value: 'guess' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('HTTP 500'))
    expect(onVerified).not.toHaveBeenCalled()
    expect(screen.getByLabelText('What will this program print?').getAttribute('readonly')).toBeNull()
  })
})
