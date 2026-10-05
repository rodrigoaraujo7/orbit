import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

const inputClassName =
  "flex h-9 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-sm transition-[color,border-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/40"

function Input({
  className,
  type,
  reveal = true,
  disabled,
  ...props
}: React.ComponentProps<"input"> & { reveal?: boolean }) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const showReveal = type === "password" && reveal

  if (!showReveal) {
    return (
      <input
        type={type}
        disabled={disabled}
        data-slot="input"
        className={cn(inputClassName, className)}
        {...props}
      />
    )
  }

  const label = visible ? t("common.hidePassword") : t("common.showPassword")

  return (
    <div className="relative w-full">
      <input
        type={visible ? "text" : "password"}
        disabled={disabled}
        data-slot="input"
        className={cn(inputClassName, "pr-9", className)}
        {...props}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-pressed={visible}
        onClick={(event) => {
          setVisible((current) => !current)
          // A pointer click should drop the field's focus ring. Keyboard use keeps it.
          if (event.detail === 0) return
          ;(event.currentTarget.previousElementSibling as HTMLInputElement).blur()
          event.currentTarget.blur()
        }}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        {visible ? (
          <EyeOff className="size-3.5" aria-hidden />
        ) : (
          <Eye className="size-3.5" aria-hidden />
        )}
      </button>
    </div>
  )
}

export { Input }
