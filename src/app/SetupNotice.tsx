import { t } from '@/i18n/de-CH'

export const SetupNotice = () => (
  <main className="mx-auto max-w-2xl px-4 py-16">
    <h1 className="text-2xl font-semibold">{t.setup.title}</h1>
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-stone-700">
      {t.setup.steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  </main>
)
