import { useState } from "react"
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { Eye, EyeOff, KeyRound, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { BILLING_CYCLE_LABEL, PAYER_LABEL } from "@/data/projects"
import { OTHER_TOOL_ID } from "@/data/tool-catalog"
import { getCurrencyOptions } from "@/lib/currency"
import { hasPositiveAmount, type ProjectFormValues } from "@/lib/project-schema"
import { ToolSelect } from "./tool-select"

const cycleOptions = Object.entries(BILLING_CYCLE_LABEL).map(
  ([value, label]) => ({ value, label })
)
const payerOptions = Object.entries(PAYER_LABEL).map(([value, label]) => ({
  value,
  label,
}))

function SecretRow({
  toolIndex,
  index,
  onRemove,
}: {
  toolIndex: number
  index: number
  onRemove: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  const {
    register,
    formState: { errors },
  } = useFormContext<ProjectFormValues>()

  const secretErrors = errors.tools?.[toolIndex]?.secrets?.[index]

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-2">
        <Input
          {...register(`tools.${toolIndex}.secrets.${index}.key`)}
          aria-invalid={Boolean(secretErrors?.key)}
          aria-label="Chave do secret"
          placeholder="API_KEY"
          className="flex-1 font-mono text-xs"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="relative flex-1">
          <Input
            {...register(`tools.${toolIndex}.secrets.${index}.value`)}
            type={revealed ? "text" : "password"}
            aria-invalid={Boolean(secretErrors?.value)}
            aria-label="Valor do secret"
            placeholder="valor"
            className="pr-9 font-mono text-xs"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Ocultar valor" : "Revelar valor"}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {revealed ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label="Remover secret"
        >
          <Trash2 />
        </Button>
      </div>
      {(secretErrors?.key || secretErrors?.value) && (
        <p className="text-xs text-destructive">
          {secretErrors?.key?.message ?? secretErrors?.value?.message}
        </p>
      )}
    </div>
  )
}

export function ToolField({
  index,
  onRemove,
}: {
  index: number
  onRemove: () => void
}) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ProjectFormValues>()

  const { fields, append, remove } = useFieldArray({
    control,
    name: `tools.${index}.secrets`,
  })

  const toolId = useWatch({ control, name: `tools.${index}.toolId` })
  const amount = useWatch({ control, name: `tools.${index}.amount` })
  const toolErrors = errors.tools?.[index]

  // "is paid" comes from the amount, not a checkbox: zeroed = free and the rest
  // of the billing stays locked. Same function the schema uses, so they agree.
  const paid = hasPositiveAmount(amount ?? "")

  return (
    <div className="animate-in fade-in slide-in-from-top-1 flex flex-col gap-3 rounded-xl border p-3 duration-200">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Controller
            control={control}
            name={`tools.${index}.toolId`}
            render={({ field }) => (
              <ToolSelect
                value={field.value}
                onValueChange={field.onChange}
                invalid={Boolean(toolErrors?.toolId)}
              />
            )}
          />
          {toolErrors?.toolId && (
            <p className="mt-1 text-xs text-destructive">
              {toolErrors.toolId.message}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label="Remover ferramenta"
        >
          <Trash2 />
        </Button>
      </div>

      {toolId === OTHER_TOOL_ID && (
        <Field
          label="Nome da ferramenta"
          error={toolErrors?.customName?.message}
          className="animate-in fade-in slide-in-from-top-1 duration-200"
        >
          {(props) => (
            <Input
              {...props}
              {...register(`tools.${index}.customName`)}
              placeholder="TOTVS Protheus API"
            />
          )}
        </Field>
      )}

      <Field label="Conta/login usado" error={toolErrors?.account?.message}>
        {(props) => (
          <Input
            {...props}
            {...register(`tools.${index}.account`)}
            placeholder="rodrigo@fastbuilt.com.br (opcional)"
          />
        )}
      </Field>

      <div className="rounded-lg bg-muted/40 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">Cobrança</Label>
          {!paid && <Badge variant="outline">Grátis</Badge>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Moeda" error={toolErrors?.currency?.message}>
            {(props) => (
              <Controller
                control={control}
                name={`tools.${index}.currency`}
                render={({ field }) => (
                  <Select
                    {...props}
                    value={field.value}
                    onValueChange={field.onChange}
                    options={getCurrencyOptions()}
                  />
                )}
              />
            )}
          </Field>

          <Field label="Valor" error={toolErrors?.amount?.message}>
            {(props) => (
              <Input
                {...props}
                {...register(`tools.${index}.amount`)}
                inputMode="decimal"
                placeholder="0"
                onFocus={(event) => {
                  // lets typing overwrite the leading zero instead of becoming "0340"
                  if (!hasPositiveAmount(event.target.value)) event.target.select()
                }}
              />
            )}
          </Field>

          <Field label="Ciclo" error={toolErrors?.cycle?.message}>
            {(props) => (
              <Controller
                control={control}
                name={`tools.${index}.cycle`}
                render={({ field }) => (
                  <Select
                    {...props}
                    value={field.value}
                    onValueChange={field.onChange}
                    options={cycleOptions}
                    disabled={!paid}
                  />
                )}
              />
            )}
          </Field>

          <Field label="Data da fatura" error={toolErrors?.nextInvoice?.message}>
            {(props) => (
              <Input
                {...props}
                {...register(`tools.${index}.nextInvoice`)}
                type="date"
                disabled={!paid}
              />
            )}
          </Field>

          <Field
            label="Quem paga"
            error={toolErrors?.payer?.message}
            className="sm:col-span-2"
          >
            {(props) => (
              <Controller
                control={control}
                name={`tools.${index}.payer`}
                render={({ field }) => (
                  <Select
                    {...props}
                    value={field.value}
                    onValueChange={field.onChange}
                    options={payerOptions}
                    disabled={!paid}
                  />
                )}
              />
            )}
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <KeyRound className="size-3.5" />
            Secrets (env)
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => append({ key: "", value: "" })}
          >
            <Plus />
            Adicionar
          </Button>
        </div>

        {fields.length > 0 && (
          <div className="flex flex-col gap-2">
            {fields.map((field, secretIndex) => (
              <SecretRow
                key={field.id}
                toolIndex={index}
                index={secretIndex}
                onRemove={() => remove(secretIndex)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
