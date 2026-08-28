import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useLayoutEffect, useRef, type ReactNode } from "react"
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Select } from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { DEAL_KIND_LABEL, type Project } from "@/data/projects"
import { currencyOptions } from "@/lib/currency"
import { formatCurrency, maskBrPhone } from "@/lib/format"
import {
  GITHUB_PREFIX,
  emptyProjectForm,
  emptyToolForm,
  fromProject,
  hasPositiveAmount,
  parseAmount,
  projectSchema,
  toProject,
  type ProjectFormValues,
} from "@/lib/project-schema"
import { useProjects } from "@/lib/projects-store"
import { useRegistry } from "@/lib/registry-store"
import { cn } from "@/lib/utils"
import { ContactSelect } from "./contact-select"
import { StatusSelect } from "./status-badges"
import { ToolField } from "./tool-field"

const dealKindOptions = Object.entries(DEAL_KIND_LABEL).map(
  ([value, label]) => ({ value, label })
)

export type ProjectDialogSection =
  | "identity"
  | "contact"
  | "billing"
  | "tools"
  | "repository"

const ALL_SECTIONS: ProjectDialogSection[] = [
  "identity",
  "contact",
  "billing",
  "tools",
  "repository",
]

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-t pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  )
}

/** 2x to 24x — the same range as any installment simulator out there. */
const MAX_INSTALLMENTS = 24

function installmentOptions(amount: number, currency: string) {
  return Array.from({ length: MAX_INSTALLMENTS - 1 }, (_, i) => i + 2).map((n) => ({
    value: String(n),
    label: `${n}x de ${formatCurrency(amount / n, currency)} sem juros`,
  }))
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  project,
  sections = ALL_SECTIONS,
  title,
  description,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** present = editing this project; absent = creating a new one */
  project?: Project
  /** sections visible in the form — defaults to all of them (create and full edit) */
  sections?: ProjectDialogSection[]
  title?: string
  description?: string
}) {
  const { addProject, updateProject } = useProjects()
  const { addContact, contacts, isContactsPending } = useRegistry()

  // the whole form goes into FormProvider: ToolField/SecretRow are nested and
  // consume it via useFormContext instead of taking control/register as props
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: emptyProjectForm,
  })
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = form

  // fills in the project data (editing) or clears it (creating) every time the
  // dialog opens — the form stays mounted all the time, so this is what makes
  // switching projects between edits work. Layout (not effect) so the empty-
  // contacts force below can run in the same turn, after this reset.
  useLayoutEffect(() => {
    if (open) reset(project ? fromProject(project) : emptyProjectForm)
  }, [open, project, reset])

  const { fields, append, remove } = useFieldArray({ control, name: "tools" })
  // useWatch instead of watch(): it is memoizable, watch() makes the React
  // Compiler give up on optimizing the whole component.
  const dealKind = useWatch({ control, name: "dealKind" })
  const amount = useWatch({ control, name: "amount" })
  const currency = useWatch({ control, name: "currency" })
  const isNewContact = useWatch({ control, name: "isNewContact" })
  // zeroed amount = free project, same rule as the tools
  const isFree = !hasPositiveAmount(amount ?? "")

  // Creating a project with no contacts yet: skip the picker and go straight
  // to the inline form. Wait until the contacts query has settled so an empty
  // cache during load does not flash this path and then snap back to the select.
  const forceNewContact =
    !project && !isContactsPending && contacts.length === 0
  const showNewContactFields = forceNewContact || isNewContact

  const wasForceNewContact = useRef(false)
  useLayoutEffect(() => {
    if (!open) {
      wasForceNewContact.current = false
      return
    }
    if (forceNewContact) {
      setValue("isNewContact", true)
      setValue("clientId", "")
      wasForceNewContact.current = true
      return
    }
    if (wasForceNewContact.current) {
      wasForceNewContact.current = false
      setValue("isNewContact", false)
      setValue("newContactName", "")
      setValue("newContactEmail", "")
      setValue("newContactPhone", "")
      setValue("newContactCompany", "")
    }
  }, [open, forceNewContact, setValue])

  const onSubmit = handleSubmit(async (values) => {
    try {
      let clientId = values.clientId
      if (values.isNewContact || forceNewContact) {
        const created = await addContact({
          name: values.newContactName,
          email: values.newContactEmail || undefined,
          phone: values.newContactPhone,
          company: values.newContactCompany,
        })
        clientId = created.id
      }
      const projectValues = { ...values, clientId }

      if (project) {
        await updateProject(toProject(projectValues, project))
        toast.add({ title: "Projeto atualizado", type: "success" })
      } else {
        await addProject(toProject(projectValues))
        toast.add({ title: "Projeto criado", type: "success" })
      }
      onOpenChange(false)
    } catch {
      toast.add({
        title: project ? "Erro ao atualizar projeto" : "Erro ao criar projeto",
        type: "error",
      })
    }
  })

  const heading = title ?? (project ? "Editar projeto" : "Novo projeto")
  const subheading =
    description ?? "Cadastre o projeto, o valor fechado e as ferramentas usadas."

  const formFields = (
    <div className="flex flex-col gap-6">
      {sections.includes("identity") && (
        <Section title="Identificação">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do projeto" error={errors.name?.message}>
              {(props) => (
                <Input
                  {...props}
                  {...register("name")}
                  placeholder="Portal do Corretor"
                />
              )}
            </Field>

            <Field label="Status" error={errors.status?.message}>
              {(props) => (
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <StatusSelect
                      {...props}
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              )}
            </Field>
          </div>
        </Section>
      )}

      {sections.includes("contact") && (
        <Section title="Contato">
          {!forceNewContact && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                {...register("isNewContact", {
                  onChange: (e) => {
                    // switching sides leaves the other one's state behind
                    // otherwise — a stale clientId or half-filled contact
                    // fields the user can no longer see.
                    if (e.target.checked) {
                      setValue("clientId", "")
                    } else {
                      setValue("newContactName", "")
                      setValue("newContactEmail", "")
                      setValue("newContactPhone", "")
                      setValue("newContactCompany", "")
                    }
                  },
                })}
              />
              Criar um novo contato
            </label>
          )}

          {showNewContactFields ? (
            <div
              key="new-contact-fields"
              className="grid animate-in fade-in slide-in-from-top-1 gap-4 duration-200 sm:grid-cols-2"
            >
              <Field label="Nome" error={errors.newContactName?.message}>
                {(props) => (
                  <Input
                    {...props}
                    {...register("newContactName")}
                    placeholder="Marcelo Tavares"
                  />
                )}
              </Field>

              <Field
                label="E-mail"
                error={errors.newContactEmail?.message}
                hint="Opcional"
              >
                {(props) => (
                  <Input
                    {...props}
                    {...register("newContactEmail")}
                    type="email"
                    placeholder="marcelo@empresa.com.br"
                  />
                )}
              </Field>

              <Field label="Telefone" error={errors.newContactPhone?.message}>
                {(props) => (
                  <Input
                    {...props}
                    {...register("newContactPhone", {
                      onChange: (event) => {
                        event.target.value = maskBrPhone(event.target.value)
                      },
                    })}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 98765-4321"
                  />
                )}
              </Field>

              <Field label="Empresa" error={errors.newContactCompany?.message}>
                {(props) => (
                  <Input
                    {...props}
                    {...register("newContactCompany")}
                    placeholder="Empresa Ltda"
                  />
                )}
              </Field>
            </div>
          ) : (
            <Field
              key="contact-select"
              label="Contato principal"
              error={errors.clientId?.message}
              className="animate-in fade-in slide-in-from-top-1 duration-200"
            >
              {(props) => (
                <Controller
                  control={control}
                  name="clientId"
                  render={({ field }) => (
                    <ContactSelect
                      {...props}
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              )}
            </Field>
          )}
        </Section>
      )}

      {sections.includes("billing") && (
        <Section
          title="Cobrança"
          action={isFree && <Badge variant="outline">Grátis</Badge>}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Moeda" error={errors.currency?.message}>
              {(props) => (
                <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => (
                    <Select
                      {...props}
                      value={field.value}
                      onValueChange={field.onChange}
                      options={currencyOptions}
                    />
                  )}
                />
              )}
            </Field>

            <Field label="Valor fechado" error={errors.amount?.message}>
              {(props) => (
                <Input
                  {...props}
                  {...register("amount")}
                  inputMode="decimal"
                  placeholder="0"
                  onFocus={(event) => {
                    // lets typing overwrite the leading zero instead of becoming "018000"
                    if (!hasPositiveAmount(event.target.value)) {
                      event.target.select()
                    }
                  }}
                />
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Cobrança"
              error={errors.dealKind?.message}
              className={
                dealKind === "installment" && !isFree ? undefined : "sm:col-span-2"
              }
            >
              {(props) => (
                <Controller
                  control={control}
                  name="dealKind"
                  render={({ field }) => (
                    <Select
                      {...props}
                      value={field.value}
                      onValueChange={field.onChange}
                      options={dealKindOptions}
                      disabled={isFree}
                    />
                  )}
                />
              )}
            </Field>

            {dealKind === "installment" && !isFree && (
              <Field
                label="Parcelas"
                error={errors.installments?.message}
                className="animate-in fade-in slide-in-from-top-1 duration-200"
              >
                {(props) => (
                  <Controller
                    control={control}
                    name="installments"
                    render={({ field }) => (
                      <Select
                        {...props}
                        value={field.value}
                        onValueChange={field.onChange}
                        options={installmentOptions(
                          parseAmount(amount ?? "") ?? 0,
                          currency
                        )}
                      />
                    )}
                  />
                )}
              </Field>
            )}
          </div>
        </Section>
      )}

      {sections.includes("tools") && (
        <Section title="Ferramentas">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Ferramentas usadas</Label>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => append(emptyToolForm)}
              >
                <Plus />
                Adicionar
              </Button>
            </div>

            {fields.length === 0 ? (
              <p className="rounded-xl border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                Nenhuma ferramenta registrada.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {fields.map((field, index) => (
                  <ToolField
                    key={field.id}
                    index={index}
                    onRemove={() => remove(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {sections.includes("repository") && (
        <Section title="Repositório">
          <Field
            label="Repositório GitHub"
            error={errors.repoPath?.message}
            hint="Opcional"
          >
            {(props) => (
              <div
                className={cn(
                  "flex h-10 items-stretch overflow-hidden rounded-xl border border-border bg-background transition-[color,border-color,box-shadow]",
                  "has-[input:focus]:border-ring has-[input:focus]:ring-3 has-[input:focus]:ring-ring/30",
                  "has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:ring-3 has-[input[aria-invalid=true]]:ring-destructive/20"
                )}
              >
                <span className="flex items-center border-r bg-muted/40 px-3.5 text-[15px] text-muted-foreground select-none">
                  {GITHUB_PREFIX}
                </span>
                <input
                  {...props}
                  {...register("repoPath")}
                  placeholder="usuario/repo"
                  className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none placeholder:text-muted-foreground"
                />
              </div>
            )}
          </Field>
        </Section>
      )}
    </div>
  )

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent dialogClassName="max-w-2xl">
        <ResponsiveDialogHeader>
          <div>
            <ResponsiveDialogTitle>{heading}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{subheading}</ResponsiveDialogDescription>
          </div>
          <ResponsiveDialogClose />
        </ResponsiveDialogHeader>
        <FormProvider {...form}>
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <ResponsiveDialogBody>{formFields}</ResponsiveDialogBody>
            <ResponsiveDialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {project ? "Salvar alterações" : "Criar projeto"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </FormProvider>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
