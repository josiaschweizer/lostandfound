import { t } from '@/i18n/de-CH'
import { PageHeader } from '@/components/ui/Layout'
import { CatalogSearch } from './CatalogSearch'

export const SearchPage = () => (
  <>
    <PageHeader title={t.search.title} lead={t.search.lead} />
    <CatalogSearch />
  </>
)
