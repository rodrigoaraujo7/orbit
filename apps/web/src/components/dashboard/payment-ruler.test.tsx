import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { monthOf, todayIso } from 'shared'
import { PaymentRuler } from './payment-ruler'
import { renderWithProviders } from '@/test/render'

const reduced = vi.hoisted(() => ({ value: false }))

vi.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => reduced.value,
}))

afterEach(() => {
  cleanup()
  reduced.value = false
})

describe('PaymentRuler', () => {
  it('shows an empty message', () => {
    renderWithProviders(<PaymentRuler lanes={[]} months={['2026-01']} currency="BRL" />)
    expect(screen.getByText('No installments fall in this period.')).toBeInTheDocument()
  })

  it('renders paid, pending and overdue ticks', () => {
    const current = monthOf(todayIso())
    const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', current]
    renderWithProviders(
      <PaymentRuler
        months={months}
        currency="BRL"
        lanes={[
          {
            projectId: 'p1',
            projectName: 'Portal',
            currency: 'BRL',
            byMonth: {
              '2025-01': [{ amount: 10, status: 'paid' }],
              '2025-02': [
                { amount: 10, status: 'paid' },
                { amount: 5, status: 'pending' },
              ],
              '2025-03': [{ amount: 10, status: 'overdue' }],
            },
          },
        ]}
      />,
    )
    expect(screen.getByText('Portal')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Portal/).length).toBeGreaterThan(0)
  })

  it('skips tick animation when motion is reduced', () => {
    reduced.value = true
    renderWithProviders(
      <PaymentRuler
        months={['2026-01']}
        currency="BRL"
        lanes={[
          {
            projectId: 'p1',
            projectName: 'Portal',
            currency: 'BRL',
            byMonth: { '2026-01': [{ amount: 10, status: 'paid' }] },
          },
        ]}
      />,
    )
    expect(screen.getByText('Portal')).toBeInTheDocument()
  })
})
