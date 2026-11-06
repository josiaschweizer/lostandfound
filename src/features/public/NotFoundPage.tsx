import { t } from '@/i18n/de-CH'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'

export const NotFoundPage = () => (
  <EmptyState as="h1" title={t.pages.notFound.title} action={<ButtonLink to="/">{t.nav.home}</ButtonLink>}>
    {t.pages.notFound.text}
  </EmptyState>
)
