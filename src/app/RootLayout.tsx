import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { DemoPanel } from '@/features/demo/DemoPanel'
import { DockContext, type DockPanel } from './dock'

export const RootLayout = () => {
  const { pathname } = useLocation()
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const [openPanel, setOpenPanel] = useState<DockPanel>(null)
  const dock = useMemo(() => ({ slot, openPanel, setOpenPanel }), [slot, openPanel])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <DockContext.Provider value={dock}>
      <Outlet />
      <div className="pointer-events-none fixed right-4 bottom-[calc(var(--bottom-nav)+var(--action-bar)+1rem)] z-40 flex flex-col items-end gap-3 print:hidden">
        <div ref={setSlot} className="pointer-events-auto flex flex-col items-end gap-3 empty:hidden" />
        <div className="pointer-events-auto">
          <DemoPanel />
        </div>
      </div>
    </DockContext.Provider>
  )
}
