import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'

export const NotFoundPage = () => (
  <EmptyState title="Seite nicht gefunden" action={<ButtonLink to="/">Zur Startseite</ButtonLink>}>
    Die Adresse ist falsch oder veraltet.
  </EmptyState>
)
