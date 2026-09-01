import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ComingSoon, PageHeader } from './page'
import { renderWithProviders } from '@/test/render'

afterEach(() => {
  cleanup()
})

describe('page layout', () => {
  it('renders a header with actions', () => {
    renderWithProviders(
      <PageHeader
        title="Dashboard"
        description="Overview"
        actions={<button type="button">Go</button>}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument()
  })

  it('renders a header without a description', () => {
    renderWithProviders(<PageHeader title="Bare" />)
    expect(screen.getByRole('heading', { name: 'Bare' })).toBeInTheDocument()
  })

  it('renders the coming soon placeholder', () => {
    renderWithProviders(<ComingSoon section="Invoices" />)
    expect(screen.getByText(/Invoices section is still under construction/)).toBeInTheDocument()
  })
})
