import { Filter, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'

export function FilterDrawer({
  children,
  hasActive,
  onClear,
}: {
  children: ReactNode
  hasActive: boolean
  onClear: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="md:hidden">
      <Drawer showSwipeHandle>
        <DrawerTrigger render={<Button variant="outline" />}>
          <Filter data-icon="inline-start" />
          {t('common.filter')}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('common.filters')}</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-3 overflow-y-auto p-4">{children}</div>
          <DrawerFooter>
            <Button variant="ghost" disabled={!hasActive} onClick={onClear}>
              <X data-icon="inline-start" />
              {t('common.clear')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
