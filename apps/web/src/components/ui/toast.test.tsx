import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { toast, Toaster } from './toast'
import { renderWithProviders } from '@/test/render'

afterEach(() => {
  cleanup()
})

describe('Toaster', () => {
  it('renders each toast type and closes one', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Toaster>
        <button
          type="button"
          onClick={() => {
            toast.add({ title: 'Saved', description: 'All good', type: 'success' })
            toast.add({ title: 'FYI', type: 'info' })
            toast.add({ title: 'Careful', type: 'warning' })
            toast.add({ title: 'Failed', type: 'error' })
            toast.add({ title: 'Working', type: 'loading' })
            toast.add({ title: 'Plain' })
          }}
        >
          Notify
        </button>
      </Toaster>,
    )

    await user.click(screen.getByRole('button', { name: 'Notify' }))
    expect(await screen.findByText('Saved')).toBeInTheDocument()
    expect(screen.getByText('FYI')).toBeInTheDocument()
    expect(screen.getByText('Careful')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('Working')).toBeInTheDocument()
    expect(screen.getByText('Plain')).toBeInTheDocument()

    await user.click(screen.getAllByLabelText('Close toast', { hidden: true })[0]!)
  })
})
