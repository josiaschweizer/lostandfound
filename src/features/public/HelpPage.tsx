import { t } from '@/i18n/de-CH'
import { Card, PageHeader } from '@/components/ui/Layout'

/** Hilfe: Ablauf, häufige Fragen, Datenschutz inkl. KI (KONZEPT 7.6). */
export const HelpPage = () => (
  <div className="mx-auto max-w-3xl space-y-6">
    <PageHeader title={t.help.title} />
    <section aria-labelledby="process" className="space-y-3">
      <h2 id="process" className="text-xl font-semibold">
        {t.help.processTitle}
      </h2>
      <ol className="grid gap-3 sm:grid-cols-3">
        {t.help.process.map((step, index) => (
          <li key={step.title} className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
            <span className="mb-2 flex size-8 items-center justify-center rounded-full bg-brand-600 font-semibold text-white">{index + 1}</span>
            <span className="block font-semibold">{step.title}</span>
            <span className="block text-stone-700">{step.text}</span>
          </li>
        ))}
      </ol>
    </section>

    <section aria-labelledby="faq" className="space-y-3">
      <h2 id="faq" className="text-xl font-semibold">
        {t.help.faqTitle}
      </h2>
      <div className="space-y-2">
        {t.help.faq.map((entry) => (
          <details key={entry.q} className="group rounded-2xl bg-white ring-1 ring-stone-200">
            <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 font-medium [&::-webkit-details-marker]:hidden">{entry.q}</summary>
            <p className="px-4 pb-4 text-stone-700">{entry.a}</p>
          </details>
        ))}
      </div>
    </section>

    <Card className="space-y-3 p-4 sm:p-6">
      <h2 id="datenschutz" className="text-xl font-semibold">
        {t.help.privacyTitle}
      </h2>
      {t.help.privacy.map((text) => (
        <p key={text}>{text}</p>
      ))}
      <h3 id="ki" className="pt-2 text-lg font-semibold">
        {t.help.aiTitle}
      </h3>
      {t.help.ai.map((text) => (
        <p key={text}>{text}</p>
      ))}
    </Card>

    <Card className="space-y-2 p-4 sm:p-6">
      <h2 className="text-xl font-semibold">{t.help.contactTitle}</h2>
      <p>{t.help.contact}</p>
    </Card>
  </div>
)
