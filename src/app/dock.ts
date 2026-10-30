import { createContext, useContext } from 'react'

export type DockPanel = 'assistant' | 'demo' | null

interface DockState {
  /** DOM-Knoten, in den der Assistent per Portal gerendert wird (über der Demo-Hilfe). */
  slot: HTMLElement | null
  openPanel: DockPanel
  setOpenPanel: (panel: DockPanel) => void
}

export const DockContext = createContext<DockState>({ slot: null, openPanel: null, setOpenPanel: () => {} })

export const useDock = () => useContext(DockContext)
