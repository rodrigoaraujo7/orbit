import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { KeyRound, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { SECRET_VALUE_MASK } from "@/data/projects"
import { OTHER_TOOL_ID } from "@/data/tool-catalog"
import { billingCycleOptions, freeLabel, payerOptions } from "@/i18n/labels"
import { getCurrencyOptions } from "@/lib/currency"
import { emptySecretForm, hasPositiveAmount, type ProjectFormValues } from "@/lib/project-schema"
import { ToolSelect } from "../tool-select"

function SecretRow({
  toolIndex,
  index,
  stored,
  onRemove,
}: {
  toolIndex: number
  index: number
  stored: boolean
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const {
    register,
    formState: { errors },
  } = useFormContext<ProjectFormValues>()

  const secretErrors = errors.tools?.[toolIndex]?.secrets?.[index]
  const valuePath = `tools.${toolIndex}.secrets.${index}.value` as const

  return (
    <div className="flex flex-col gap-1">
      <input
        type="checkbox"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        {...register(`tools.${toolIndex}.secrets.${index}.stored`)}
      />
      <div className="flex items-start gap-2">
        <Input
          {...register(`tools.${toolIndex}.secrets.${index}.key`)}
          aria-invalid={Boolean(secretErrors?.key)}
          aria-label={t("common.secretKey")}
          placeholder="API_KEY"
          className="flex-1 font-mono text-xs"
          autoComplete="off"
          spellCheck={false}
          disabled={stored}
        />
        <div className="min-w-0 flex-1">
          {stored ? (
            <>
              <input type="hidden" {...register(valuePath)} />
              <Input
                type="password"
                disabled
                readOnly
                value={SECRET_VALUE_MASK}
                aria-label={t("common.secretValue")}
                className="font-mono text-xs"
              />
            </>
          ) : (
            <Input
              {...register(valuePath)}
              type="password"
              aria-invalid={Boolean(secretErrors?.value)}
              aria-label={t("common.secretValue")}
              placeholder={t("common.valuePlaceholder")}
              className="font-mono text-xs"
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={t("common.removeSecret")}
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

export function ToolField({ index, onRemove }: { index: number; onRemove: () => void }) {
  const { t } = useTranslation()
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
            <p className="mt-1 text-xs text-destructive">{toolErrors.toolId.message}</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={t("common.removeTool")}
        >
          <Trash2 />
        </Button>
      </div>

      {toolId === OTHER_TOOL_ID && (
        <Field
          label={t("projects.toolName")}
          error={toolErrors?.customName?.message}
          className="animate-in fade-in slide-in-from-top-1 duration-200"
        >
          {(props) => (
            <Input
              {...props}
              {...register(`tools.${index}.customName`)}
              placeholder={t("projects.toolNamePlaceholder")}
            />
          )}
        </Field>
      )}

      <Field label={t("projects.accountUsed")} error={toolErrors?.account?.message}>
        {(props) => (
          <Input
            {...props}
            {...register(`tools.${index}.account`)}
            placeholder={t("projects.accountPlaceholder")}
          />
        )}
      </Field>

      <div className="rounded-lg bg-muted/40 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">{t("projects.billing")}</Label>
          {!paid && <Badge variant="outline">{freeLabel()}</Badge>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("common.currency")} error={toolErrors?.currency?.message}>
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

          <Field label={t("common.value")} error={toolErrors?.amount?.message}>
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

          <Field label={t("projects.cycle")} error={toolErrors?.cycle?.message}>
            {(props) => (
              <Controller
                control={control}
                name={`tools.${index}.cycle`}
                render={({ field }) => (
                  <Select
                    {...props}
                    value={field.value}
                    onValueChange={field.onChange}
                    options={billingCycleOptions()}
                    disabled={!paid}
                  />
                )}
              />
            )}
          </Field>

          <Field label={t("projects.invoiceDate")} error={toolErrors?.nextInvoice?.message}>
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
            label={t("common.whoPays")}
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
                    options={payerOptions()}
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
            {t("projects.secretsEnv")}
          </Label>
          <Button type="button" variant="ghost" size="xs" onClick={() => append(emptySecretForm)}>
            <Plus />
            {t("common.add")}
          </Button>
        </div>

        {fields.length > 0 && (
          <div className="flex flex-col gap-2">
            {fields.map((field, secretIndex) => (
              <SecretRow
                key={field.id}
                toolIndex={index}
                index={secretIndex}
                stored={Boolean(field.stored)}
                onRemove={() => remove(secretIndex)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
