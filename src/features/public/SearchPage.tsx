import { PageHeader } from '@/components/ui/Layout'
import { CatalogBrowser } from './CatalogBrowser'

export const SearchPage = () => (
  <>
    <PageHeader title="Gegenstand suchen" description="Suche über alle Fundstellen. Mit dem Filter «Organisation» schränken Sie die Suche auf einen Ort ein." />
    <CatalogBrowser />
  </>
)
