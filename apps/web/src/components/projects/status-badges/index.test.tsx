import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PROJECT_STATUS_ORDER } from '@/data/projects'
import {
  StatusBadge,
  StatusDot,
  StatusFilterSelect,
  StatusLabel,
  StatusSelect,
  WorkflowBadge,
  WorkflowFilterSelect,
} from './index'
import { renderWithProviders } from '@/test/render'

afterEach(() => {
  cleanup()
})

describe('status badges', () => {
  it('renders every project status', () => {
    renderWithProviders(
      <>
        {PROJECT_STATUS_ORDER.map((status) => (
          <div key={status}>
            <StatusDot status={status} />
            <StatusLabel status={status} />
            <StatusBadge status={status} />
          </div>
        ))}
      </>,
    )
    expect(screen.getAllByText('Queued').length).toBeGreaterThan(0)
    expect(screen.getAllByText('In development').length).toBeGreaterThan(0)
  })

  it('renders workflow badges with and without tooltips', () => {
    renderWithProviders(
      <>
        <WorkflowBadge status="success" />
        <WorkflowBadge status="failure" />
        <WorkflowBadge status="running" />
        <WorkflowBadge status="none" />
        <WorkflowBadge status="success" iconOnly />
        <WorkflowBadge status="failure" iconOnly tooltip />
      </>,
    )
    expect(screen.getByText('Passed')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByText('No runs')).toBeInTheDocument()
  })

  it('changes status through the select', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    renderWithProviders(<StatusSelect value="queued" onValueChange={onValueChange} />)
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Completed' }))
    expect(onValueChange).toHaveBeenCalledWith('completed')
  })

  it('filters by status including all', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const { rerender } = renderWithProviders(
      <StatusFilterSelect value="" onValueChange={onValueChange} />,
    )
    expect(screen.getByText('Status')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Paused' }))
    expect(onValueChange).toHaveBeenCalledWith('paused')
    rerender(<StatusFilterSelect value="paused" onValueChange={onValueChange} />)
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'All' }))
    expect(onValueChange).toHaveBeenCalledWith('')
  })

  it('filters by workflow', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const { rerender } = renderWithProviders(
      <WorkflowFilterSelect value="" onValueChange={onValueChange} />,
    )
    expect(screen.getByText('GitHub Actions')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Running' }))
    expect(onValueChange).toHaveBeenCalledWith('running')
    rerender(<WorkflowFilterSelect value="running" onValueChange={onValueChange} />)
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'All' }))
    expect(onValueChange).toHaveBeenCalledWith('')
    rerender(<WorkflowFilterSelect value="success" onValueChange={onValueChange} />)
    expect(screen.getAllByText('Passed').length).toBeGreaterThan(0)
  })
})
