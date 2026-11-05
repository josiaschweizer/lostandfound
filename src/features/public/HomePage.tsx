import { PlaceholderPage } from '@/components/ui/PlaceholderPage'
import { t } from '@/i18n/de-CH'
import { DbStatus } from './DbStatus'

/** Startseite – Inhalt (Suchfeld, drei Einstiege, «Zuletzt gefunden») folgt in Etappe 4. */
export const HomePage = () => (
  <PlaceholderPage title={t.pages.home.title}>{import.meta.env.DEV && <DbStatus />}</PlaceholderPage>
)
