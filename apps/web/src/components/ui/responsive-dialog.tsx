import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

type ResponsiveDialogContextValue = {
  isMobile: boolean
}

const ResponsiveDialogContext =
  createContext<ResponsiveDialogContextValue | null>(null)

function useResponsiveDialog() {
  const context = useContext(ResponsiveDialogContext)

  if (!context) {
    throw new Error("useResponsiveDialog must be used within a ResponsiveDialog.")
  }

  return context
}

function ResponsiveDialog({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}) {
  const isMobileNow = useIsMobile()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isOpen = open ?? uncontrolledOpen

  // Freeze the shell while open so a mid-edit resize does not remount the
  // tree (Dialog ↔ Drawer) and wipe form state.
  const isMobileRef = useRef(isMobileNow)
  if (!isOpen) {
    isMobileRef.current = isMobileNow
  }
  const isMobile = isMobileRef.current

  const contextValue = useMemo(() => ({ isMobile }), [isMobile])

  function handleOpenChange(next: boolean) {
    if (open === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  return (
    <ResponsiveDialogContext.Provider value={contextValue}>
      {isMobile ? (
        <Drawer
          open={isOpen}
          onOpenChange={handleOpenChange}
          showSwipeHandle
          swipeDirection="down"
        >
          {children}
        </Drawer>
      ) : (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          {children}
        </Dialog>
      )}
    </ResponsiveDialogContext.Provider>
  )
}

function ResponsiveDialogTrigger({
  ...props
}: Omit<ComponentProps<typeof DialogTrigger>, "handle">) {
  const { isMobile } = useResponsiveDialog()

  if (isMobile) {
    return <DrawerTrigger data-slot="responsive-dialog-trigger" {...props} />
  }

  return <DialogTrigger data-slot="responsive-dialog-trigger" {...props} />
}

function ResponsiveDialogContent({
  className,
  dialogClassName,
  drawerClassName,
  children,
}: {
  className?: string
  dialogClassName?: string
  drawerClassName?: string
  children?: ReactNode
}) {
  const { isMobile } = useResponsiveDialog()

  if (isMobile) {
    return (
      <DrawerContent
        data-slot="responsive-dialog-content"
        className={cn(
          "data-[swipe-axis=y]:max-h-[90dvh]",
          className,
          drawerClassName
        )}
      >
        {children}
      </DrawerContent>
    )
  }

  return (
    <DialogContent
      data-slot="responsive-dialog-content"
      className={cn(
        "flex max-h-[90svh] flex-col overflow-hidden",
        className,
        dialogClassName
      )}
    >
      {children}
    </DialogContent>
  )
}

function ResponsiveDialogHeader({
  className,
  ...props
}: ComponentProps<"div">) {
  const { isMobile } = useResponsiveDialog()
  const Header = isMobile ? DrawerHeader : DialogHeader
  return <Header data-slot="responsive-dialog-header" className={className} {...props} />
}

function ResponsiveDialogFooter({
  className,
  ...props
}: ComponentProps<"div">) {
  const { isMobile } = useResponsiveDialog()

  if (isMobile) {
    return (
      <DrawerFooter
        data-slot="responsive-dialog-footer"
        className={cn("flex-row [&>*]:flex-1", className)}
        {...props}
      />
    )
  }

  return (
    <DialogFooter
      data-slot="responsive-dialog-footer"
      className={cn("shrink-0 border-t px-5 py-4", className)}
      {...props}
    />
  )
}

function ResponsiveDialogTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props) {
  const { isMobile } = useResponsiveDialog()
  const Title = isMobile ? DrawerTitle : DialogTitle
  return <Title data-slot="responsive-dialog-title" className={className} {...props} />
}

function ResponsiveDialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  const { isMobile } = useResponsiveDialog()
  const Description = isMobile ? DrawerDescription : DialogDescription
  return (
    <Description
      data-slot="responsive-dialog-description"
      className={className}
      {...props}
    />
  )
}

function ResponsiveDialogBody({
  className,
  ...props
}: ComponentProps<"div">) {
  const { isMobile } = useResponsiveDialog()

  return (
    <div
      data-slot="responsive-dialog-body"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto",
        isMobile ? "p-4" : "px-5 py-4",
        className
      )}
      {...props}
    />
  )
}

function ResponsiveDialogClose({
  className,
  children,
  ...props
}: ComponentProps<typeof Button>) {
  const { isMobile } = useResponsiveDialog()
  if (isMobile) return null

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Fechar"
      className={className}
      render={<DialogClose />}
      {...props}
    >
      {children ?? <X />}
    </Button>
  )
}

export {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
}
