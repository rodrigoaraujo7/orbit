import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sampleProject } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

const sortable = vi.hoisted(() => ({ isDragging: false }))

vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: () => ({ ref: () => undefined, isDragging: sortable.isDragging }),
}))

import { KanbanCard } from './kanban-card'

afterEach(() => {
  cleanup()
  sortable.isDragging = false
})

describe('KanbanCard', () => {
  it('opens on click and enter', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    renderWithProviders(
      <KanbanCard project={sampleProject} clientName="Ada" status="queued" onOpen={onOpen} />,
    )
    await user.click(screen.getByRole('button', { name: /Portal/ }))
    expect(onOpen).toHaveBeenCalledWith('p1')
    await user.keyboard('{Enter}')
    expect(onOpen).toHaveBeenCalledTimes(2)
    await user.keyboard('a')
    expect(onOpen).toHaveBeenCalledTimes(2)
  })

  it('skips the click that ends a drag', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    sortable.isDragging = true
    const { rerender } = renderWithProviders(
      <KanbanCard project={sampleProject} clientName="Ada" onOpen={onOpen} />,
    )
    sortable.isDragging = false
    rerender(<KanbanCard project={sampleProject} clientName="Ada" onOpen={onOpen} />)
    await user.click(screen.getByRole('button', { name: /Portal/ }))
    expect(onOpen).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /Portal/ }))
    expect(onOpen).toHaveBeenCalledWith('p1')
  })

  it('renders an overlay face without being sortable', () => {
    renderWithProviders(<KanbanCard project={sampleProject} clientName="Ada" overlay />)
    expect(screen.getByText('Portal')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
