import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { DemoPanel } from '@/features/demo/DemoPanel'

/** Gemeinsame Hülle aller Seiten: Scroll-Reset und Demo-Hilfe (bleibt beim Rollenwechsel bestehen). */
export const RootLayout = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <>
      <Outlet />
      <DemoPanel />
    </>
  )
}
