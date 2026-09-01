import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from './responsive-dialog'
import { renderWithProviders } from '@/test/render'

const mobile = vi.hoisted(() => ({ value: false }))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mobile.value,
}))

afterEach(() => {
  cleanup()
  mobile.value = false
})

function DialogTree({
  open,
  onOpenChange,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent dialogClassName="dlg" drawerClassName="drw">
        <ResponsiveDialogHeader>
          <div>
            <ResponsiveDialogTitle>Title</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Details</ResponsiveDialogDescription>
          </div>
          <ResponsiveDialogClose />
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>Body copy</ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <button type="button">Done</button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

describe('ResponsiveDialog', () => {
  it('renders as a dialog on desktop and can close', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderWithProviders(<DialogTree open onOpenChange={onOpenChange} />)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Body copy')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders as a drawer on mobile and hides the close button', async () => {
    mobile.value = true
    renderWithProviders(<DialogTree open onOpenChange={() => undefined} />)
    expect(await screen.findByText('Title')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    expect(screen.getByText('Body copy')).toBeInTheDocument()
  })

  it('supports an uncontrolled trigger', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ResponsiveDialog defaultOpen={false}>
        <ResponsiveDialogTrigger render={<button type="button">Open</button>} />
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Opened</ResponsiveDialogTitle>
            <ResponsiveDialogClose>X</ResponsiveDialogClose>
          </ResponsiveDialogHeader>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    )
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(await screen.findByText('Opened')).toBeInTheDocument()
  })

  it('uses a drawer trigger on mobile', async () => {
    const user = userEvent.setup()
    mobile.value = true
    renderWithProviders(
      <ResponsiveDialog>
        <ResponsiveDialogTrigger render={<button type="button">Open</button>} />
        <ResponsiveDialogContent>
          <ResponsiveDialogTitle>Mobile opened</ResponsiveDialogTitle>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    )
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(await screen.findByText('Mobile opened')).toBeInTheDocument()
  })

  it('throws when pieces are used outside the root', () => {
    expect(() =>
      renderWithProviders(<ResponsiveDialogTitle>Orphan</ResponsiveDialogTitle>),
    ).toThrow(/useResponsiveDialog/)
  })

  it('freezes the shell while open across viewport changes', async () => {
    const { rerender } = renderWithProviders(<DialogTree open onOpenChange={() => undefined} />)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    mobile.value = true
    rerender(<DialogTree open onOpenChange={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    rerender(<DialogTree open={false} onOpenChange={() => undefined} />)
    mobile.value = true
    rerender(<DialogTree open={false} onOpenChange={() => undefined} />)
    rerender(<DialogTree open onOpenChange={() => undefined} />)
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })
})
