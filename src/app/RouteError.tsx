import { isRouteErrorResponse, useRouteError } from 'react-router'
import { t } from '@/i18n/de-CH'
import { Button, ButtonLink } from '@/components/ui/Button'

export const RouteError = () => {
  const error = useRouteError()
  const detail = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : String(error)
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t.errors.route.title}</h1>
      <p className="mt-2 text-stone-600">{t.errors.route.text}</p>
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={() => window.location.reload()}>{t.errors.route.reload}</Button>
        <ButtonLink to="/" variant="secondary">
          {t.nav.home}
        </ButtonLink>
      </div>
      <p className="mt-8 font-mono text-xs break-all text-stone-500">{detail}</p>
    </main>
  )
}
