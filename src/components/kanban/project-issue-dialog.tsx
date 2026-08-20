import { Dialog } from "@base-ui/react/dialog"
import { Link } from "@tanstack/react-router"
import { ExternalLink, Pencil, User, X } from "lucide-react"
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"

import { StatusLabel, StatusSelect, WorkflowBadge } from "@/components/projects/status-badges"
import { Button } from "@/components/ui/button"
import { DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Contact } from "@/data/contacts"
import {
  FREE_LABEL,
  isDealFree,
  type Project,
  type ProjectStatus,
} from "@/data/projects"
import { DEFAULT_CURRENCY } from "@/lib/currency"
import { nowDateTimeIso } from "@/lib/dates"
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDealProgress,
  formatToolsProgress,
} from "@/lib/format"
import { generateInvoices } from "@/lib/invoices"
import { formatHistoryEntry } from "@/lib/project-history"
import { withProjectStatus } from "@/lib/project-status"
import { useProjects } from "@/lib/projects-store"
import { useRegistry } from "@/lib/registry-store"

const COMMENT_AUTHOR = "Rodrigo Araujo"

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
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
    .filter((tool) => tool.billing?.cycle === "monthly")
    .reduce<Record<string, number>>((acc, tool) => {
      const { amount, currency = DEFAULT_CURRENCY } = tool.billing!
      acc[currency] = (acc[currency] ?? 0) + amount
      return acc
    }, {})
  const label = Object.entries(totals)
    .map(([currency, total]) => `${formatCurrency(total, currency)}/mês`)
    .join(" + ")
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
  const { updateProject } = useProjects()
  const { findContact } = useRegistry()
  const [draft, setDraft] = useState("")

  if (!project) return null

  const invoices = generateInvoices(project, contact?.name ?? "—")
  const comments = project.comments ?? []
  const history = [...(project.history ?? [])].reverse()
  const costLabel = monthlyCostLabel(project)
  const dealAmount = isDealFree(project.deal)
    ? FREE_LABEL
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
    setDraft("")
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setDraft("")
        onOpenChange(next)
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex h-[90svh] w-[calc(100vw-2rem)] max-w-6xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl transition-all duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div className="min-w-0">
              <StatusLabel status={project.status} className="text-sm" />
              <DialogTitle className="truncate text-2xl">{project.name}</DialogTitle>
              <DialogDescription className="sr-only">Detalhes do projeto</DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link to="/projects/$projectId" params={{ projectId: project.id }} />
                }
              >
                <ExternalLink data-icon="inline-start" />
                Abrir página
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onOpenChange(false)}
                aria-label="Fechar"
              >
                <X />
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-5 py-5">
              <EditableDescription
                key={project.id}
                value={project.description ?? ""}
                onSave={(description) => updateProject({ ...project, description })}
              />

              <section className="flex flex-col gap-4">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Histórico
                </h3>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma alteração ainda.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {history.map((entry) => (
                      <li key={entry.id} className="flex flex-col gap-0.5">
                        <p className="text-sm">
                          {formatHistoryEntry(
                            entry,
                            (id) => findContact(id)?.name ?? id
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(entry.at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="flex flex-col gap-4">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Comentários
                </h3>
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
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
                  <Label htmlFor="kanban-comment">Novo comentário</Label>
                  <Textarea
                    id="kanban-comment"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Escreva um comentário…"
                    rows={3}
                  />
                  <Button type="submit" className="self-end" disabled={!draft.trim()}>
                    Comentar
                  </Button>
                </form>
              </section>
            </div>

            <aside className="flex w-full shrink-0 flex-col gap-5 border-t px-5 py-5 lg:w-80 lg:overflow-y-auto lg:border-t-0 lg:border-l">
              <Meta label="Status">
                <StatusSelect value={project.status} onValueChange={setStatus} />
              </Meta>

              <Meta label="Cliente">
                <div className="flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="size-3.5" />
                    {contact?.name ?? "—"}
                  </span>
                  {contact?.email && (
                    <span className="text-muted-foreground">{contact.email}</span>
                  )}
                  {contact?.phone && (
                    <span className="text-muted-foreground">{contact.phone}</span>
                  )}
                </div>
              </Meta>

              <Meta label="Datas">
                <p>Início {formatDate(project.startedAt)}</p>
                {project.endedAt && <p>Término {formatDate(project.endedAt)}</p>}
              </Meta>

              <Meta label="Repositório">
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
                  <span className="text-muted-foreground">Sem repositório</span>
                )}
              </Meta>

              <Meta label="Financeiro">
                <p className="font-medium">{dealAmount}</p>
                <p className="text-muted-foreground">
                  {formatDealProgress(project.deal, invoices)}
                </p>
              </Meta>

              <Meta label="Ferramentas">
                <p className="font-medium">
                  {costLabel ??
                    (project.tools.some((tool) => tool.billing)
                      ? "Sem cobrança mensal"
                      : "Nenhuma ferramenta paga")}
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
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function EditableDescription({
  value,
  onSave,
}: {
  value: string
  onSave: (next: string | undefined) => void
}) {
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
          Descrição
        </h3>
        {!editing && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            onClick={start}
            aria-label="Editar descrição"
            title="Editar descrição"
          >
            <Pencil />
          </Button>
        )}
      </div>
      <div
        key={editing ? "input" : "text"}
        className="origin-top animate-in fade-in zoom-in-95 duration-200 ease-out motion-reduce:animate-none"
      >
        {editing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              ref={input}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault()
                  cancel()
                }
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  save()
                }
              }}
              rows={4}
              aria-label="Descrição"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={cancel}>
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={save}>
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">
            {value || <span className="text-muted-foreground">Sem descrição.</span>}
          </p>
        )}
      </div>
    </section>
  )
}
