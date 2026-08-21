import { Filter, X } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

export function FilterDrawer({
  children,
  hasActive,
  onClear,
}: {
  children: ReactNode
  hasActive: boolean
  onClear: () => void
}) {
  return (
    <div className="md:hidden">
      <Drawer showSwipeHandle>
        <DrawerTrigger render={<Button variant="outline" />}>
          <Filter data-icon="inline-start" />
          Filtro
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filtros</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-3 overflow-y-auto p-4">{children}</div>
          <DrawerFooter>
            <Button variant="ghost" disabled={!hasActive} onClick={onClear}>
              <X data-icon="inline-start" />
              Limpar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
