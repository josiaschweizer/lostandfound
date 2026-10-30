import { PageHeader } from '@/components/ui/Layout'
import { CatalogBrowser } from './CatalogBrowser'

export const SearchPage = () => (
  <>
    <PageHeader title="Gegenstand suchen" description="Über alle Fundstellen – ohne Anmeldung." />
    <CatalogBrowser />
  </>
)
