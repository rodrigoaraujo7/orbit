import { Dialog } from "@base-ui/react/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, X } from "lucide-react"
import { useEffect } from "react"
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { DEAL_KIND_LABEL, type Project } from "@/data/projects"
import {
  GITHUB_PREFIX,
  emptyProjectForm,
  emptyToolForm,
  fromProject,
  projectSchema,
  toProject,
  type ProjectFormValues,
} from "@/lib/project-schema"
import { useProjects } from "@/lib/projects-store"
import { cn } from "@/lib/utils"
import { StatusSelect } from "./status-badges"
import { ToolField } from "./tool-field"

const dealKindOptions = Object.entries(DEAL_KIND_LABEL).map(
  ([value, label]) => ({ value, label })
)

export function CreateProjectDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** presente = editando esse projeto; ausente = criando um novo */
  project?: Project
}) {
  const { addProject, updateProject } = useProjects()

  // o form inteiro vai pro FormProvider: ToolField/SecretRow são aninhados e
  // consomem via useFormContext em vez de receber control/register por prop
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: emptyProjectForm,
  })
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = form

  // popula com os dados do projeto (edição) ou limpa (criação) toda vez que
  // o dialog abre — o form fica montado o tempo todo, então precisa disso
  // pra trocar de projeto entre uma edição e outra.
  useEffect(() => {
    if (open) reset(project ? fromProject(project) : emptyProjectForm)
  }, [open, project, reset])

  const { fields, append, remove } = useFieldArray({ control, name: "tools" })
  // useWatch em vez de watch(): é memoizável, o watch() faz o React Compiler
  // desistir de otimizar o componente inteiro.
  const dealKind = useWatch({ control, name: "dealKind" })

  const onSubmit = handleSubmit((values) => {
    try {
      if (project) {
        updateProject(toProject(values, project))
        toast.add({ title: "Projeto atualizado", type: "success" })
      } else {
        addProject(toProject(values))
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

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[90svh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl transition-all duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold tracking-tight">
                {project ? "Editar projeto" : "Novo projeto"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted-foreground">
                Cadastre o projeto, o valor fechado e as ferramentas usadas.
              </Dialog.Description>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
            >
              <X />
            </Button>
          </div>

          <FormProvider {...form}>
            <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
              <Field label="Nome do projeto" error={errors.name?.message}>
                {(props) => (
                  <Input
                    {...props}
                    {...register("name")}
                    placeholder="Portal do Corretor"
                  />
                )}
              </Field>

              <Field label="Contato principal" error={errors.client?.message}>
                {(props) => (
                  <Input
                    {...props}
                    {...register("client")}
                    placeholder="Marcelo Tavares"
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

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Cobrança" error={errors.dealKind?.message}>
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
                        />
                      )}
                    />
                  )}
                </Field>

                {dealKind !== "gratis" && (
                  <Field
                    label="Valor fechado (R$)"
                    error={errors.amount?.message}
                    className="animate-in fade-in slide-in-from-top-1 duration-200"
                  >
                    {(props) => (
                      <Input
                        {...props}
                        {...register("amount")}
                        inputMode="decimal"
                        placeholder="18.000,00"
                      />
                    )}
                  </Field>
                )}
              </div>

              {dealKind === "parcelado" && (
                <Field
                  label="Número de parcelas"
                  error={errors.installments?.message}
                  className="animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  {(props) => (
                    <Input
                      {...props}
                      {...register("installments")}
                      inputMode="numeric"
                      placeholder="3"
                    />
                  )}
                </Field>
              )}

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
            </div>

            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {project ? "Salvar alterações" : "Criar projeto"}
              </Button>
            </div>
            </form>
          </FormProvider>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
