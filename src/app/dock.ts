import { createContext, useContext } from 'react'

export type DockPanel = 'assistant' | 'demo' | null

/**
 * Gemeinsame Ecke unten rechts für schwebende Knöpfe (Assistent, Demo-Hilfe).
 * Die Knöpfe stapeln sich sauber, und es ist immer höchstens ein Fenster offen.
 */
export interface DockState {
  /** DOM-Knoten, in den der Assistent per Portal gerendert wird (über der Demo-Hilfe). */
  slot: HTMLElement | null
  openPanel: DockPanel
  setOpenPanel: (panel: DockPanel) => void
}

export const DockContext = createContext<DockState>({ slot: null, openPanel: null, setOpenPanel: () => {} })

export const useDock = () => useContext(DockContext)
