import { Link } from '@tanstack/react-router'
import { ExternalLink, Pencil, User } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { StatusLabel, StatusSelect, WorkflowBadge } from '@/components/projects/status-badges'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import { Textarea } from '@/components/ui/textarea'
import type { Contact } from '@/data/contacts'
import { isDealFree, type Project, type ProjectStatus } from '@/data/projects'
import i18n from '@/i18n'
import { freeLabel } from '@/i18n/labels'
import { DEFAULT_CURRENCY } from '@/lib/currency'
import { nowDateTimeIso } from '@/lib/dates'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDealProgress,
  formatToolsProgress,
} from '@/lib/format'
import { formatAuditAt, formatAuditDetails } from '@/lib/audit-labels'
import { withProjectStatus } from '@/lib/project-status'
import { useProjects } from '@/lib/projects-store'
import { useRegistry } from '@/lib/registry-store'
import { trpc } from '@/lib/trpc'

const COMMENT_AUTHOR = 'Rodrigo Araujo'

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function monthlyCostLabel(project: Project) {
  const totals = project.tools
    .filter((tool) => tool.billing?.cycle === 'monthly')
    .reduce<Record<string, number>>((acc, tool) => {
      const { amount, currency = DEFAULT_CURRENCY } = tool.billing!
      acc[currency] = (acc[currency] ?? 0) + amount
      return acc
    }, {})
  const label = Object.entries(totals)
    .map(([currency, total]) =>
      i18n.t('format.amountPerMonth', { amount: formatCurrency(total, currency) }),
    )
    .join(' + ')
  return label || null
}

export function ProjectIssueDialog({
  project,
  contact,
  open,
  onOpenChange,
}: {
  project: Project | undefined
  contact: Contact | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const { updateProject } = useProjects()
  const { findContact } = useRegistry()
  const [draft, setDraft] = useState('')
  const { data: audit, isPending: auditPending } = useQuery({
    queryKey: ['audit', 'project', project?.id],
    queryFn: () => trpc.audit.list.query({ projectId: project!.id, limit: 50 }),
    enabled: open && Boolean(project),
  })
  const invoicesQuery = useQuery({
    queryKey: ['invoices', project?.id],
    queryFn: () => trpc.invoices.list.query({ projectId: project!.id }),
    enabled: open && Boolean(project),
  })

  if (!project) return null

  const invoices = invoicesQuery.data?.items ?? []
  const comments = project.comments ?? []
  const history = audit?.items ?? []
  const costLabel = monthlyCostLabel(project)
  const dealAmount = isDealFree(project.deal)
    ? freeLabel()
    : formatCurrency(project.deal.amount, project.deal.currency)

  function setStatus(status: ProjectStatus) {
    updateProject(withProjectStatus(project!, status))
  }

  function addComment(event: FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    updateProject({
      ...project!,
      comments: [
        ...comments,
        {
          id: crypto.randomUUID(),
          author: COMMENT_AUTHOR,
          createdAt: nowDateTimeIso(),
          body,
        },
      ],
    })
    setDraft('')
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        setDraft('')
        onOpenChange(next)
      }}
    >
      <ResponsiveDialogContent dialogClassName="h-[90svh] max-w-6xl">
        <ResponsiveDialogHeader>
          <div className="min-w-0">
            <StatusLabel status={project.status} className="text-sm" />
            <ResponsiveDialogTitle className="truncate text-2xl">
              {project.name}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="sr-only">
              {t('kanban.issueDetails')}
            </ResponsiveDialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              render={<Link to="/projects/$projectId" params={{ projectId: project.id }} />}
            >
              <ExternalLink data-icon="inline-start" />
              {t('kanban.openProject')}
            </Button>
            <ResponsiveDialogClose />
          </div>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="flex flex-col p-0 lg:flex-row lg:overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-5 py-5">
            <EditableDescription
              key={project.id}
              value={project.description ?? ''}
              onSave={(description) => updateProject({ ...project, description })}
            />

            <section className="flex flex-col gap-4">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t('kanban.history')}
              </h3>
              {auditPending ? (
                <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('kanban.noChanges')}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {history.map((entry) => (
                    <li key={entry.id} className="flex flex-col gap-0.5">
                      <p className="text-sm">
                        {formatAuditDetails(
                          entry.changes,
                          entry.action,
                          (id) => findContact(id)?.name ?? id,
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatAuditAt(entry.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-4">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t('kanban.comments')}
              </h3>
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('kanban.noComments')}</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {comments.map((comment) => (
                    <li key={comment.id} className="flex gap-3">
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {initials(comment.author)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-medium">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(comment.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm whitespace-pre-wrap">{comment.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={addComment} className="flex flex-col gap-2">
                <Label htmlFor="kanban-comment">{t('kanban.newComment')}</Label>
                <Textarea
                  id="kanban-comment"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={t('kanban.commentPlaceholder')}
                  rows={3}
                />
                <Button type="submit" className="self-end" disabled={!draft.trim()}>
                  {t('kanban.comment')}
                </Button>
              </form>
            </section>
          </div>

          <aside className="flex w-full shrink-0 flex-col gap-5 border-t px-5 py-5 lg:w-80 lg:overflow-y-auto lg:border-t-0 lg:border-l">
            <Meta label={t('common.status')}>
              <StatusSelect value={project.status} onValueChange={setStatus} />
            </Meta>

            <Meta label={t('kanban.client')}>
              <div className="flex flex-col gap-1">
                <span className="inline-flex items-center gap-1.5">
                  <User className="size-3.5" />
                  {contact?.name ?? t('common.emDash')}
                </span>
                {contact?.email && <span className="text-muted-foreground">{contact.email}</span>}
                {contact?.phone && <span className="text-muted-foreground">{contact.phone}</span>}
              </div>
            </Meta>

            <Meta label={t('kanban.dates')}>
              <p>{t('kanban.started', { date: formatDate(project.startedAt) })}</p>
              {project.endedAt && <p>{t('kanban.ended', { date: formatDate(project.endedAt) })}</p>}
            </Meta>

            <Meta label={t('kanban.repository')}>
              {project.repo ? (
                <div className="flex flex-col gap-2">
                  <a
                    href={project.repo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-sm font-medium outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {project.repo.fullName}
                  </a>
                  <WorkflowBadge status={project.repo.workflow} />
                </div>
              ) : (
                <span className="text-muted-foreground">{t('kanban.noRepository')}</span>
              )}
            </Meta>

            <Meta label={t('common.finance')}>
              <p className="font-medium">{dealAmount}</p>
              <p className="text-muted-foreground">{formatDealProgress(project.deal, invoices)}</p>
            </Meta>

            <Meta label={t('common.tools')}>
              <p className="font-medium">
                {costLabel ??
                  (project.tools.some((tool) => tool.billing)
                    ? t('kanban.noMonthlyBilling')
                    : t('kanban.noPaidTools'))}
              </p>
              <p className="text-muted-foreground">{formatToolsProgress(project.tools)}</p>
              {project.tools.length > 0 && (
                <ul className="mt-1 flex flex-col gap-1 text-muted-foreground">
                  {project.tools.map((tool) => (
                    <li key={`${tool.id}-${tool.name}`}>{tool.name}</li>
                  ))}
                </ul>
              )}
            </Meta>
          </aside>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

function EditableDescription({
  value,
  onSave,
}: {
  value: string
  onSave: (next: string | undefined) => void
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) input.current?.focus()
  }, [editing])

  function start() {
    setDraft(value)
    setEditing(true)
  }

  function save() {
    setEditing(false)
    const next = draft.trim()
    if (next === value.trim()) return
    onSave(next || undefined)
  }

  function cancel() {
    setEditing(false)
    setDraft(value)
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-0.5">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t('kanban.description')}
        </h3>
        {!editing && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            onClick={start}
            aria-label={t('kanban.editDescription')}
            title={t('kanban.editDescription')}
          >
            <Pencil />
          </Button>
        )}
      </div>
      {editing ? (
        <div className="flex origin-top flex-col gap-2 animate-in fade-in zoom-in-95 duration-200 ease-out motion-reduce:animate-none">
          <Textarea
            ref={input}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                cancel()
              }
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                save()
              }
            }}
            rows={4}
            aria-label={t('kanban.description')}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={cancel}>
              {t('common.cancel')}
            </Button>
            <Button type="button" size="sm" onClick={save}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap">
          {value || <span className="text-muted-foreground">{t('kanban.noDescription')}</span>}
        </p>
      )}
    </section>
  )
}
