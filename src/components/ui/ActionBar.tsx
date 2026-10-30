import type { ReactNode } from 'react'
import { cn } from './cn'

/** Ans Ende der Seite bzw. des Formulars setzen – der Platzhalter verhindert, dass die fixe Leiste Inhalt verdeckt. */
export const ActionBar = ({ children, className }: { children: ReactNode; className?: string }) => (
  <>
    <div className="h-(--action-bar)" aria-hidden />
    <div
      data-action-bar
      className={cn(
        'fixed inset-x-0 bottom-(--bottom-nav) z-30 flex items-center gap-2 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))] [&>*]:flex-1',
        'lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none lg:[&>*]:flex-none',
        className,
      )}
    >
      {children}
    </div>
  </>
)
