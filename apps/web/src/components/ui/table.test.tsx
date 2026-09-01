import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataTable, type Column } from './table'
import { renderWithProviders } from '@/test/render'

afterEach(() => {
  cleanup()
})

type Row = { id: string; name: string; amount: number }

const rows: Row[] = Array.from({ length: 12 }, (_, index) => ({
  id: `r${index + 1}`,
  name: `Item ${String(index + 1).padStart(2, '0')}`,
  amount: 12 - index,
}))

const columns: Column<Row>[] = [
  {
    key: 'name',
    header: 'Name',
    sortValue: (row) => row.name,
    cell: (row) => row.name,
  },
  {
    key: 'amount',
    header: 'Amount',
    sortValue: (row) => row.amount,
    cell: (row) => row.amount,
    className: 'hidden sm:table-cell',
  },
  {
    key: 'static',
    header: 'Notes',
    cell: () => '—',
  },
]

describe('DataTable', () => {
  it('shows the default empty message', () => {
    renderWithProviders(<DataTable data={[]} columns={columns} rowKey={(row) => row.id} />)
    expect(screen.getByText('No results found.')).toBeInTheDocument()
  })

  it('shows a custom empty message', () => {
    renderWithProviders(
      <DataTable
        data={[]}
        columns={columns}
        rowKey={(row) => row.id}
        emptyMessage="Nothing here"
      />,
    )
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('sorts, paginates, changes page size and handles row clicks', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    renderWithProviders(
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        onRowClick={onRowClick}
        className="table-wrap"
      />,
    )

    expect(screen.getByText('Item 01')).toBeInTheDocument()
    expect(screen.queryByText('Item 11')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('Item 11')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(screen.getByText('Item 01')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()

    await user.click(screen.getByRole('columnheader', { name: /Name/ }).querySelector('button')!)
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    await user.click(screen.getByRole('columnheader', { name: /Name/ }).querySelector('button')!)
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    await user.click(screen.getByRole('columnheader', { name: /Name/ }).querySelector('button')!)
    expect(screen.getByRole('columnheader', { name: /Name/ })).not.toHaveAttribute('aria-sort')

    await user.click(screen.getByText('Item 01'))
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }))

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: '25 per page' }))
    expect(screen.getByText('Item 11')).toBeInTheDocument()
  })

  it('skips in-memory pagination when pagination is off', () => {
    renderWithProviders(
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        pagination={false}
        initialSort={{ key: 'amount', direction: 'asc' }}
      />,
    )
    expect(screen.getByText('Item 12')).toBeInTheDocument()
    expect(screen.queryByLabelText('Next page')).not.toBeInTheDocument()
  })

  it('defers sort and paging to the server', async () => {
    const user = userEvent.setup()
    const onSortChange = vi.fn()
    const onPrev = vi.fn()
    const onNext = vi.fn()
    const onPageSizeChange = vi.fn()
    renderWithProviders(
      <DataTable
        data={rows.slice(0, 2)}
        columns={columns}
        rowKey={(row) => row.id}
        serverSort={{ sort: { key: 'name', direction: 'desc' }, onSortChange }}
        serverPagination={{
          hasPrev: true,
          hasNext: true,
          pageSize: '10',
          onPrev,
          onNext,
          onPageSizeChange,
        }}
      />,
    )

    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    await user.click(screen.getByRole('columnheader', { name: /Name/ }).querySelector('button')!)
    expect(onSortChange).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Previous page' }))
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPrev).toHaveBeenCalled()
    expect(onNext).toHaveBeenCalled()

    expect(screen.getByText('Pagination')).toBeInTheDocument()
    const pager = screen.getByText('Pagination').closest('div')!.parentElement!
    await user.click(within(pager).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: '50 per page' }))
    expect(onPageSizeChange).toHaveBeenCalledWith('50')
  })
})
