import { zodResolver } from "@hookform/resolvers/zod"
import { useLayoutEffect, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
import type { CustomTool } from "@/data/custom-tools"
import { TOOL_CATEGORY_ORDER, type ToolCategory } from "@/data/tool-catalog"
import i18n from "@/i18n"
import { toolCategoryOptions } from "@/i18n/labels"
import { useRegistry } from "@/lib/registry-store"

function customToolSchema() {
  return z.object({
    name: z.string().trim().min(2, i18n.t("validation.minChars")),
    // kept as a plain string (not z.enum) so this doesn't have to duplicate
    // ToolCategory's literal union — the Select only ever offers valid
    // categories, so casting on submit is safe.
    category: z.string().min(1, i18n.t("validation.selectCategory")),
  })
}

type CustomToolFormValues = z.infer<ReturnType<typeof customToolSchema>>

const emptyCustomToolForm: CustomToolFormValues = {
  name: "",
  category: TOOL_CATEGORY_ORDER[0],
}

export function CreateCustomToolDialog({
  open,
  onOpenChange,
  tool,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** present = editing this tool; absent = creating a new one */
  tool?: CustomTool
}) {
  const { t } = useTranslation()
  const { addCustomTool, updateCustomTool } = useRegistry()
  const categoryOptions = toolCategoryOptions()
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomToolFormValues>({
    resolver: (values, ctx, opts) => zodResolver(customToolSchema())(values, ctx, opts),
    defaultValues: emptyCustomToolForm,
  })

  // Keep title/CTA from the open snapshot — the popup still paints while closing.
  const [activeTool, setActiveTool] = useState<CustomTool | undefined>(tool)
  const wasOpen = useRef(false)
  useLayoutEffect(() => {
    if (open && !wasOpen.current) {
      setActiveTool(tool)
      reset(
        tool
          ? { name: tool.name, category: tool.category }
          : emptyCustomToolForm,
      )
    }
    wasOpen.current = open
  }, [open, tool, reset])

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      category: values.category as ToolCategory,
    }
    try {
      if (activeTool) {
        await updateCustomTool(activeTool.id, payload)
        toast.add({ title: t("settings.toolUpdated"), type: "success" })
      } else {
        await addCustomTool(payload)
        toast.add({ title: t("settings.toolCreated"), type: "success" })
      }
      onOpenChange(false)
    } catch {
      toast.add({
        title: activeTool ? t("settings.toolUpdateError") : t("settings.toolCreateError"),
        type: "error",
      })
    }
  })

  const formFields = (
    <>
      <Field label={t("common.name")} error={errors.name?.message}>
        {(props) => (
          <Input
            {...props}
            {...register("name")}
            placeholder={t("settings.customToolPlaceholder")}
          />
        )}
      </Field>

      <Field label={t("common.category")} error={errors.category?.message}>
        {(props) => (
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select
                {...props}
                value={field.value}
                onValueChange={field.onChange}
                options={categoryOptions}
              />
            )}
          />
        )}
      </Field>
    </>
  )

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <div>
            <ResponsiveDialogTitle>
              {activeTool ? t("settings.editTool") : t("settings.newTool")}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {activeTool
                ? t("settings.editToolDescription")
                : t("settings.newToolDescription")}
            </ResponsiveDialogDescription>
          </div>
          <ResponsiveDialogClose />
        </ResponsiveDialogHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <ResponsiveDialogBody className="flex flex-col gap-4">
            {formFields}
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">
              {activeTool ? t("common.save") : t("settings.createTool")}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
